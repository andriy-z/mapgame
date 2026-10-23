// Космос: маленький окремий рівень поверх карти, куди герой потрапляє
// через телепорт (docs/04-dynamika.md, «Телепорт і космос»). Що саме там
// треба зробити — у src/quests/.
//
// open(typeId, hero, index, prize, onClose): показує рівень; prize — що
// герой отримає ({ bonus }), щоб квест міг його показати; onClose(true) —
// пройдено, onClose(false) — герой повернувся сам (кнопка ✕).
//
// Рівень — VIEW.w × VIEW.h клітинок, як екран карти, тільки без камери.
// Кроки тут не рахуються і перешкод нема — герой іде, куди вкаже гравець,
// мишкою чи стрілками, так само як на карті. Тому застрягнути неможливо.
//
// Тип квесту (Game.registerQuestType) — це:
//   title                  — підказка вгорі: що треба зробити;
//   start(level)           — розставити своє на рівні, повернути { x, y },
//                            де з'явиться герой;
//   step(cell, level, last) — герой ступив на клітинку (last — це кінець
//                            шляху). true — зупинитись тут.
// level.prize — id картинки призу (показати, як герой його знаходить),
// level.closed() — true, коли рівень уже закрили (для своїх таймерів),
// level.move(x, y) — переставити героя.
// Виконав мету — тип кличе level.finish(ms): трохи милуємось (ms — скільки,
// якщо треба довше, ніж звичайно) і назад на карту.

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var VIEW = Game.rules.VIEW;

  var STEP_MS = 170;    // крок фішки (як .hero у index.html)
  var DONE_MS = 2800;   // скільки милуватись результатом перед поверненням
  var FADE_MS = 500;    // космос з'являється і зникає (як #space у index.html)
  var SKY_STARS = 70;   // дрібні зірочки на тлі

  var type = null;
  var onClose = null;
  var level = null;
  var me = null;        // герой у космосі: { x, y, el }
  var cursor = null;    // клітинка, яку вказує гравець
  var planEls = [];
  var busy = false;     // герой іде або квест уже пройдено

  function place(el, x, y) {
    el.style.left = 'calc(var(--t) * ' + x + ')';
    el.style.top = 'calc(var(--t) * ' + y + ')';
  }

  function image(id, cls) {
    var el = document.createElement('img');
    el.src = Game.images[id];
    el.className = cls || '';
    el.alt = '';
    el.draggable = false;
    return el;
  }

  // Тло: дрібні зірочки, що мерехтять кожна у своєму ритмі.
  function sky() {
    var box = $('spaceSky');
    box.innerHTML = '';
    for (var i = 0; i < SKY_STARS; i++) {
      var s = document.createElement('div');
      var size = (1 + Math.random() * 2.5).toFixed(1) + 'px';
      s.className = 'twinkle';
      s.style.left = (Math.random() * 100).toFixed(1) + '%';
      s.style.top = (Math.random() * 100).toFixed(1) + '%';
      s.style.width = s.style.height = size;
      s.style.animationDelay = (-Math.random() * 3).toFixed(2) + 's';
      box.appendChild(s);
    }
  }

  function close(solved) {
    if (!onClose) return;
    var cb = onClose;
    onClose = null;
    type = level = me = cursor = null;
    planEls = [];
    var space = $('space');
    space.classList.remove('open');
    setTimeout(function () {
      if (onClose) return;   // встигли відкрити новий — не чіпаємо
      space.hidden = true;
      $('spaceStage').innerHTML = '';
    }, FADE_MS);
    cb(solved);
  }

  // Шлях до клітинки: спершу вбік, потім вгору-вниз. Перешкод нема.
  function path(to) {
    var cells = [{ x: me.x, y: me.y }];
    var x = me.x, y = me.y;
    while (x !== to.x) { x += to.x > x ? 1 : -1; cells.push({ x: x, y: y }); }
    while (y !== to.y) { y += to.y > y ? 1 : -1; cells.push({ x: x, y: y }); }
    return cells;
  }

  // Точки шляху до вказаної клітинки — лише поки герой стоїть.
  function showPlan() {
    var stage = $('spaceStage');
    planEls.forEach(function (el) { stage.removeChild(el); });
    planEls = [];
    if (busy || !cursor || (cursor.x === me.x && cursor.y === me.y)) return;
    var p = path(cursor);
    p.slice(1).forEach(function (c, i) {
      var el = image(i === p.length - 2 ? 'target' : 'step', 'cell mark');
      place(el, c.x, c.y);
      stage.insertBefore(el, me.el);
      planEls.push(el);
    });
  }

  function walk(p, i) {
    busy = true;
    var dx = p[i].x - me.x;
    if (dx) me.el.classList.toggle('left', dx < 0);
    me.x = p[i].x;
    me.y = p[i].y;
    place(me.el, me.x, me.y);
    setTimeout(function () {
      if (!level) return;   // квест закрили, поки йшли
      var last = i === p.length - 1;
      var halt = type.step({ x: me.x, y: me.y }, level, last);
      if (level.done) return;
      if (halt || last) { busy = false; showPlan(); return; }
      walk(p, i + 1);
    }, STEP_MS);
  }

  function point(cell) {
    if (!level || busy) return;
    cursor = {
      x: Math.max(0, Math.min(VIEW.w - 1, cell.x)),
      y: Math.max(0, Math.min(VIEW.h - 1, cell.y)),
    };
    showPlan();
  }

  function go() {
    if (!level || busy || !cursor || (cursor.x === me.x && cursor.y === me.y)) return;
    var p = path(cursor);
    busy = true;
    showPlan();   // поки йде — точок шляху не видно
    walk(p, 1);
  }

  function cellAt(e) {
    var rect = $('space').getBoundingClientRect();
    var t = rect.width / VIEW.w;
    return { x: Math.floor((e.clientX - rect.left) / t), y: Math.floor((e.clientY - rect.top) / t) };
  }

  Game.quest = {
    open: function (typeId, hero, index, prize, done) {
      type = Game.questTypes[typeId];
      onClose = done;
      busy = false;
      cursor = null;
      planEls = [];

      var stage = $('spaceStage');
      stage.innerHTML = '';
      sky();
      $('spaceTitle').textContent = type.title;

      me = { x: 0, y: 0 };
      me.el = Game.token.create(Game.token.ofHero(hero), 'cell hero active hero-' + (index + 1));
      stage.appendChild(me.el);

      // що рівень дає типу квесту
      var mine = level = {
        w: VIEW.w,
        h: VIEW.h,
        done: false,
        prize: Game.bonuses[prize.bonus].marker(prize).image,   // id картинки призу
        image: image,
        place: place,
        // додати своє на рівень — під героя
        add: function (el) { stage.insertBefore(el, me.el); return el; },
        title: function (text) { $('spaceTitle').textContent = text; },
        toast: function (text, ms) { Game.view.toast(text, ms); },
        closed: function () { return level !== mine; },
        // переставити героя (відскочив від сейфа — src/quests/dark-room.js)
        move: function (x, y) { me.x = x; me.y = y; place(me.el, x, y); },
        // мету виконано: трохи милуємось — і назад на карту
        finish: function (ms) {
          level.done = true;
          busy = true;
          me.el.classList.remove('active');
          setTimeout(function () { close(true); }, ms || DONE_MS);
        },
      };

      var start = type.start(level);
      me.x = start.x;
      me.y = start.y;
      place(me.el, me.x, me.y);

      var space = $('space');
      space.hidden = false;
      void space.offsetWidth;   // щоб спрацював перехід прозорості
      space.classList.add('open');
    },

    isOpen: function () { return !!onClose; },

    // Клавіші з input.js, поки відкритий космос: стрілки, Enter.
    key: function (e) {
      var arrows = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      if (arrows[e.key]) {
        e.preventDefault();
        var from = cursor || me;
        if (from) point({ x: from.x + arrows[e.key][0], y: from.y + arrows[e.key][1] });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        go();
      }
    },

    attach: function () {
      var space = $('space');
      // події не йдуть далі до карти під космосом
      space.addEventListener('mousemove', function (e) {
        e.stopPropagation();
        point(cellAt(e));
      });
      space.addEventListener('click', function (e) {
        e.stopPropagation();
        point(cellAt(e));
        go();
      });
      $('spaceBack').addEventListener('click', function (e) {
        e.stopPropagation();
        this.blur();
        if (level && !level.done) close(false);
      });
    },
  };
})();
