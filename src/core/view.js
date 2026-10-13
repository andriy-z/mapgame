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
  var planEls = [];
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

      heroEls = state.heroes.map(function (hero) {
        var el = img(hero.character.image, hero.x, hero.y, 'hero');
        el.title = hero.character.name;
        el.dataset.x = hero.x;
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
      world.style.transform = 'translate(calc(var(--t) * ' + (-cam.x) + '), calc(var(--t) * ' + (-cam.y) + '))';
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

    // Картинки героїв дивляться праворуч; крок ліворуч — дзеркалимо, щоб
    // герой ішов обличчям уперед. Крок вгору-вниз розвороту не міняє.
    moveHero: function (index, hero) {
      var el = heroEls[index];
      var dx = hero.x - Number(el.dataset.x);
      if (dx) el.classList.toggle('left', dx < 0);
      el.dataset.x = hero.x;
      place(el, hero.x, hero.y);
    },

    // Активний герой злегка погойдується — видно, чия черга.
    setActive: function (index) {
      heroEls.forEach(function (el, i) { el.classList.toggle('active', i === index); });
    },

    // План ходу: точки шляху + мітка цілі. plan = null — прибрати все.
    // plan.path — шлях від героя до цілі включно, або null, якщо не можна.
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
      planEls.forEach(function (el) { world.insertBefore(el, heroEls[0]); });
    },

    hud: function (state) {
      var hero = state.heroes[state.active];
      $('day').textContent = 'День ' + state.day;
      $('turnHero').src = Game.images[hero.character.image];
      $('turnName').textContent = hero.character.name;

      var steps = $('steps');
      steps.innerHTML = '';
      for (var i = 0; i < hero.character.move; i++) {
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
