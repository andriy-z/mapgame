// Відображення: карта, фішки, шлях, камера, верхня панель.
//
// Усе в DOM. Позиції задані в клітинках через CSS-змінну --t (розмір
// клітинки в пікселях): `left: calc(var(--t) * 5)`. Тому при зміні розміру
// вікна досить поміняти одне --t — і все стає на місце.
//
// Картинки беремо лише за id зі скіна (Game.images). Про терен, прохідність
// і правила рендер нічого не знає.

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var VIEW = Game.rules.VIEW;

  var map = null;
  var heroEls = [];
  var taskEls = [];
  var tasks = [];
  var planEls = [];
  var fogLayer = null;
  var fogEls = [];
  var cam = { x: 0, y: 0 };
  var toastTimer = null;

  function img(id, x, y, cls) {
    var el = document.createElement('img');
    el.src = Game.images[id];
    el.className = 'cell' + (cls ? ' ' + cls : '');
    el.draggable = false;
    place(el, x, y);
    return el;
  }

  function place(el, x, y) {
    el.style.left = 'calc(var(--t) * ' + x + ')';
    el.style.top = 'calc(var(--t) * ' + y + ')';
  }

  Game.view = {
    // Будує карту з нуля. Викликається на старті й при «Ще раз».
    build: function (state) {
      map = state.map;
      var world = $('world');
      world.innerHTML = '';
      world.style.width = 'calc(var(--t) * ' + map.size.w + ')';
      world.style.height = 'calc(var(--t) * ' + map.size.h + ')';

      var tiles = document.createDocumentFragment();
      for (var y = 0; y < map.size.h; y++) {
        for (var x = 0; x < map.size.w; x++) {
          tiles.appendChild(img(map.tiles[y][x], x, y, 'tile'));
        }
      }
      world.appendChild(tiles);

      map.finish.forEach(function (f) { world.appendChild(img('finish', f.x, f.y, 'mark')); });

      // Книжка — завдання на дорозі; позначка-приз (крильця, аватарка
      // в золотому колі) — бонусне завдання збоку; вир чи брама — вхід у
      // квест (картинка — mark у типі квесту).
      taskEls = state.tasks.map(function (t) {
        if (t.done) return null;
        var el;
        if (t.quest) {
          var mark = Game.questTypes[t.quest].mark;
          el = img(mark, t.x, t.y, 'task-mark ' + mark);
        } else if (t.prize) {
          el = Game.token.create(Game.bonuses[t.prize.bonus].marker(t.prize), 'cell task-mark prize');
          place(el, t.x, t.y);
        } else {
          el = img('task', t.x, t.y, 'task-mark');
        }
        el.style.animationDelay = (-Math.random() * 2).toFixed(2) + 's';  // щоб не гойдались в унісон
        world.appendChild(el);
        return el;
      });
      tasks = state.tasks;

      // Туман: хмаринка на кожній ще не відкритій клітинці. Шар — над
      // книжками, призами й точками шляху, але під фішками.
      fogLayer = document.createElement('div');
      fogLayer.className = 'fog-layer';
      fogEls = state.seen.map(function (row, y) {
        return row.map(function (seen, x) {
          if (seen) return null;
          var el = document.createElement('div');
          el.className = 'cell fog fog-' + ((x * 7 + y * 13) % 3);   // три відтінки, щоб не рябіло сіткою
          place(el, x, y);
          fogLayer.appendChild(el);
          return el;
        });
      });
      world.appendChild(fogLayer);

      heroEls = state.heroes.map(function (hero, i) {
        var el = Game.token.create(Game.token.ofHero(hero), 'cell hero hero-' + (i + 1));
        el.title = Game.avatars[hero.look].name;
        el.dataset.x = hero.x;
        place(el, hero.x, hero.y);
        world.appendChild(el);
        return el;
      });

      planEls = [];
      this.layout();
      this.hud(state);
      this.camera(state, true);
    },

    // Розмір клітинки під вікно: на екран завжди лягає VIEW.w × VIEW.h клітинок.
    layout: function () {
      var hudH = $('hud').offsetHeight;
      var t = Math.floor(Math.min(window.innerWidth / VIEW.w,
                                  (window.innerHeight - hudH) / VIEW.h));
      document.documentElement.style.setProperty('--t', Math.max(16, t) + 'px');
    },

    // Камера дивиться на середину між героями, але не виїжджає за край карти.
    camera: function (state, instant) {
      var a = state.heroes[0], b = state.heroes[1];
      var midX = (a.x + b.x + 1) / 2, midY = (a.y + b.y + 1) / 2;
      cam.x = clamp(midX - VIEW.w / 2, 0, map.size.w - VIEW.w);
      cam.y = clamp(midY - VIEW.h / 2, 0, map.size.h - VIEW.h);

      var world = $('world');
      if (instant) world.classList.add('no-anim');
      // до цілого пікселя — інакше між плитками просвічують тонкі шви
      world.style.transform = 'translate(round(calc(var(--t) * ' + (-cam.x) + '), 1px), round(calc(var(--t) * ' + (-cam.y) + '), 1px))';
      if (instant) {
        world.offsetHeight;  // застосувати без анімації, потім повернути її
        world.classList.remove('no-anim');
      }
    },

    // Які клітинки зараз видно повністю.
    visible: function () {
      return {
        x0: Math.ceil(cam.x), y0: Math.ceil(cam.y),
        x1: Math.floor(cam.x + VIEW.w) - 1, y1: Math.floor(cam.y + VIEW.h) - 1,
      };
    },

    // Клітинка під курсором миші.
    cellAt: function (clientX, clientY) {
      var rect = $('viewport').getBoundingClientRect();
      var t = rect.width / VIEW.w;
      return {
        x: Math.floor((clientX - rect.left) / t + cam.x),
        y: Math.floor((clientY - rect.top) / t + cam.y),
      };
    },

    // Аватарки дивляться праворуч; крок ліворуч — дзеркалимо всю фішку
    // (разом з артефактами), щоб герой ішов обличчям уперед. Крок
    // вгору-вниз розвороту не міняє.
    moveHero: function (index, hero) {
      var el = heroEls[index];
      var dx = hero.x - Number(el.dataset.x);
      if (dx) el.classList.toggle('left', dx < 0);
      el.dataset.x = hero.x;
      place(el, hero.x, hero.y);
    },

    // Переліт по повітрю (кулька, гармошка, чих): фішка злітає, пливе до
    // клітинки hero.x, hero.y за ms мілісекунд і сідає. carrier — що
    // летить разом з нею: { image } — картинка над фішкою (кулька) або
    // { text } — напис-хмаринка (ноти, «апчхи!»).
    fly: function (index, hero, carrier, ms) {
      var el = heroEls[index];
      var extra = document.createElement(carrier.image ? 'img' : 'div');
      if (carrier.image) {
        extra.src = Game.images[carrier.image];
        extra.draggable = false;
      } else {
        extra.textContent = carrier.text;
      }
      extra.className = 'carrier' + (carrier.image ? '' : ' words');
      el.appendChild(extra);
      el.style.setProperty('--fly', ms + 'ms');
      el.classList.add('flying');
      this.moveHero(index, hero);
      setTimeout(function () {
        el.classList.remove('flying');
        if (extra.parentNode) extra.parentNode.removeChild(extra);
      }, ms);
    },

    // Хмаринка з написом над фішкою на ms мілісекунд (антенки: «біп-біп!»).
    say: function (index, text, ms) {
      var el = heroEls[index];
      var bubble = document.createElement('div');
      bubble.className = 'carrier words';
      bubble.textContent = text;
      el.appendChild(bubble);
      setTimeout(function () {
        if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
      }, ms);
    },

    // Герой отримав приз: нова аватарка чи артефакт — перемалювати фішку
    // і коротко «блимнути» нею.
    updateHero: function (index, hero) {
      var el = heroEls[index];
      if (!Game.token.update(el, Game.token.ofHero(hero))) return;
      el.title = Game.avatars[hero.look].name;
      el.classList.remove('got');
      void el.offsetWidth;
      el.classList.add('got');
    },

    // Туман розходиться: хмаринки на клітинках cells тануть і зникають.
    reveal: function (cells) {
      cells.forEach(function (c) {
        var el = fogEls[c.y] && fogEls[c.y][c.x];
        if (!el) return;
        fogEls[c.y][c.x] = null;
        el.classList.add('gone');
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 700);
      });
    },

    // Точку-завдання розв'язано — прибрати з карти.
    removeTask: function (task) {
      var el = taskEls[tasks.indexOf(task)];
      if (el && el.parentNode) {
        el.classList.add('gone');
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
      }
    },

    // Герой у космосі (телепорт): на карті від нього лишається тінь.
    setAway: function (index, away) {
      heroEls[index].classList.toggle('away', away);
    },

    // Активний герой злегка погойдується — видно, чия черга.
    setActive: function (index) {
      heroEls.forEach(function (el, i) { el.classList.toggle('active', i === index); });
    },

    // План ходу: точки шляху + мітка цілі. plan = null — прибрати все.
    // plan.path — шлях від героя до цілі включно, або null, якщо не можна;
    // plan.fog — ціль під хмаринками.
    showPlan: function (plan) {
      var world = $('world');
      planEls.forEach(function (el) { world.removeChild(el); });
      planEls = [];
      if (!plan) return;

      if (plan.path) {
        for (var i = 1; i < plan.path.length - 1; i++) {
          var p = plan.path[i];
          planEls.push(img(i <= plan.steps ? 'step' : 'step-far', p.x, p.y, 'mark'));
        }
      }
      var target = img(plan.path ? 'target' : 'target-no', plan.target.x, plan.target.y, 'mark');
      if (plan.path && plan.path.length - 1 > plan.steps) target.classList.add('far');
      planEls.push(target);
      // під туманом; лише мітку в хмаринках — над ними, щоб було видно «сюди не можна»
      planEls.forEach(function (el) { world.insertBefore(el, fogLayer); });
      if (plan.fog) world.insertBefore(target, heroEls[0]);
    },

    hud: function (state) {
      var hero = state.heroes[state.active];
      $('day').textContent = 'День ' + state.day;
      var box = $('turnHero'), look = Game.token.ofHero(hero);
      if (!box.firstChild) box.appendChild(Game.token.create(look, 'hero-' + (state.active + 1)));
      else {
        Game.token.update(box.firstChild, look);
        box.firstChild.className = 'token hero-' + (state.active + 1);
      }
      $('turnName').textContent = Game.avatars[hero.look].name;

      var steps = $('steps');
      steps.innerHTML = '';
      var total = Math.max(Game.rules.moves(hero), state.stepsLeft);
      for (var i = 0; i < total; i++) {
        var dot = document.createElement('img');
        dot.src = Game.images[i < state.stepsLeft ? 'step' : 'step-far'];
        steps.appendChild(dot);
      }
    },

    toast: function (text, ms) {
      var el = $('toast');
      el.textContent = text;
      el.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { el.classList.remove('show'); }, ms || 1400);
    },

    showWin: function (state) {
      $('winImg').src = Game.images.finish;
      $('winDays').textContent = 'Днів у дорозі: ' + state.day;
      $('win').hidden = false;
    },

    hideWin: function () {
      $('win').hidden = true;
    },
  };

  function clamp(v, lo, hi) {
    if (hi < lo) return (lo + hi) / 2;  // карта менша за екран — по центру
    return Math.max(lo, Math.min(hi, v));
  }
})();
