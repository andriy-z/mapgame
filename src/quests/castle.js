// Квест «Замок» — як Паланок у Мукачеві: світлі стіни, вежі з червоними
// дахами, прапори, факели, глибока криниця. Вхід на карті — брама.
//
// Замок завжди однаковий: посередині — коридор, з нього двері в кімнати:
// угорі три (ліва, стайня з конем, права), унизу дві й зала посередині —
// туди герой заходить через браму. Двері всі однакові, дерев'яні, і всі
// зачинені. Постукав — над дверима бульбашка з ключем потрібного кольору,
// а на дверях лишається наліпка-ключик, щоб не забути.
//
// Зворотний лабіринт: стайню відчиняє ключ, що лежить у якійсь кімнаті;
// ту кімнату — ключ з іншої кімнати, і так ланцюжком, аж до ключа, що
// лежить просто в коридорі чи в залі. Тож спершу йдеш від коня до
// першого ключа, а тоді — з ключами назад. Ще є зайві кімнати: їхні ключі
// теж лежать на видноті чи серед потрібних, а всередині — сюрприз
// (гармата «Бабах!» чи скриня зі скарбом), не приз. Кожен ключ відчиняє
// одні двері, тож застрягти не можна — лише походити зайве.
//   1-й раз — троє дверей у ланцюжку (стайня і дві кімнати), дві зайві;
//   далі    — четверо, одна зайва.
// Щоразу інакше: які кімнати в ланцюжку, які кольори, де лежать ключі.
// Скільки разів пройдено — у localStorage браузера (STORE).
//
// Ще в замку: лицар («Дзень!») і кіт («Мяу!») у залі, криниця в кінці
// коридору — уперся, «Ехо-о-о!».
//
// Мета — знайти коня: справжній кінь у стайні світиться, щоб одразу було
// видно, куди йти. Дійшов до нього — він дарує приз, коня-палку.
// Як працює рівень — src/core/quest.js.

(function () {
  'use strict';

  var STORE = 'maxmap.castle';   // скільки разів замок пройдено

  // План замку (рівень — 11 × 9). Рядок 0 — зубці (там напис і ✕),
  // рядок 4 — коридор, рядки 3 і 5 — стіни з дверима, рядок 8 — брама.
  // Тло з тим самим планом — maxmap-tilegen/castle-bg.html: поміняв тут,
  // поміняй і там.
  var HALL_Y = 4;
  var ROOMS = {
    stable: { x0: 4, x1: 6, y0: 1, y1: 2, door: { x: 5, y: 3 } },
    tl:     { x0: 1, x1: 2, y0: 1, y1: 2, door: { x: 2, y: 3 } },
    tr:     { x0: 8, x1: 9, y0: 1, y1: 2, door: { x: 8, y: 3 } },
    bl:     { x0: 1, x1: 2, y0: 6, y1: 7, door: { x: 2, y: 5 } },
    br:     { x0: 8, x1: 9, y0: 6, y1: 7, door: { x: 8, y: 5 } },
    hall:   { x0: 4, x1: 6, y0: 6, y1: 7, door: { x: 5, y: 5 } },   // зала біля брами, арка без дверей
  };
  var SIDES = ['tl', 'tr', 'bl', 'br'];
  var START = { x: 5, y: 7 };    // у залі, одразу за брамою
  var GATE = { x: 5, y: 8 };
  var HORSE = { x: 5, y: 1 };    // справжній кінь посеред стайні, між копицями сіна
  var HAY = [{ x: 4, y: 1 }, { x: 6, y: 1 }];
  var ENDS = [{ x: 0, y: HALL_Y }, { x: 10, y: HALL_Y }];   // кінці коридору: криниця й бочка
  var TOWERS = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 8 }, { x: 10, y: 8 }];
  var BANNERS = [{ x: 3, y: 1 }, { x: 7, y: 1 }, { x: 3, y: 6 }, { x: 7, y: 6 }];
  var TORCHES = [{ x: 4, y: 3 }, { x: 6, y: 3 }, { x: 4, y: 5 }, { x: 6, y: 5 }, { x: 4, y: 8 }, { x: 6, y: 8 }];

  var COLORS = {
    red: { key: 'червоний' },
    blue: { key: 'синій' },
    yellow: { key: 'жовтий' },
    green: { key: 'зелений' },
    purple: { key: 'фіолетовий' },
  };

  var castle = null;   // усе про цей прохід замку

  function random(n) { return Math.floor(Math.random() * n); }
  function pick(list) { return list[random(list.length)]; }
  function shuffle(list) { return Game.task.shuffle(list.slice()); }

  function solvedTimes() {
    try { return parseInt(localStorage.getItem(STORE), 10) || 0; } catch (e) { return 0; }
  }

  function remember() {
    try { localStorage.setItem(STORE, solvedTimes() + 1); } catch (e) { /* без пам'яті — то й без неї */ }
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function same(a, b) { return a.x === b.x && a.y === b.y; }
  function near(a, b) { return Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1; }
  function key(c) { return c.x + ',' + c.y; }

  function inRoom(x, y) {
    return Object.keys(ROOMS).some(function (id) {
      var r = ROOMS[id];
      return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
    });
  }

  function isDoor(x, y) {
    return Object.keys(ROOMS).some(function (id) { return same(ROOMS[id].door, { x: x, y: y }); });
  }

  // Клітинка кімнати одразу за дверима — її не займаємо, щоб можна було зайти.
  function entry(room) {
    return { x: room.door.x, y: room.door.y < HALL_Y ? room.y1 : room.y0 };
  }

  // ─── будова ─────────────────────────────────────────────────────────

  function picture(level, id, cls, at) {
    var node = level.add(level.image(id, cls));
    level.place(node, at.x, at.y);
    return node;
  }

  // Стіни й підлоги — одна картинка на весь рівень (castle-bg, малює
  // maxmap-tilegen/castle-bg.html за цим самим планом); тут — лише де стіни.
  function build(level) {
    var bg = level.add(level.image('castle-bg', 'cs-bg'));
    bg.style.width = 'calc(var(--t) * ' + level.w + ')';
    bg.style.height = 'calc(var(--t) * ' + level.h + ')';
    for (var y = 0; y < level.h; y++) {
      for (var x = 0; x < level.w; x++) {
        if (y !== HALL_Y && !inRoom(x, y) && !isDoor(x, y)) level.wall(x, y);
      }
    }

    TOWERS.forEach(function (at) { picture(level, 'tower', 'cs-tower', at); });
    BANNERS.forEach(function (at) { picture(level, 'banner', 'cs-banner', at); });
    TORCHES.forEach(function (at) { picture(level, 'torch', 'cs-torch', at); });
    picture(level, 'gate', 'cs-gate', GATE);
    picture(level, 'door-open', 'cs-door', ROOMS.hall.door);   // арка до зали
  }

  // Щось тверде: уперся — fn(), герой відскакує назад.
  function solid(level, at, fn) {
    level.solid(at.x, at.y);
    castle.solids[key(at)] = fn;
  }

  function wallItem(level, id, at) {
    picture(level, id, 'cs-thing', at);
    level.wall(at.x, at.y);
  }

  function makeDoor(level, roomId, color) {
    var at = ROOMS[roomId].door;
    var door = { x: at.x, y: at.y, color: color, open: false };
    door.el = picture(level, 'door', 'cs-door', at);
    solid(level, at, function () { knock(door, level); });
  }

  function makeKey(level, color, at) {
    var k = { x: at.x, y: at.y, color: color, taken: false };
    k.el = picture(level, 'key-' + color, 'cs-key', at);
    castle.keys.push(k);
  }

  function makeFriend(level, image, says, at) {
    var f = { x: at.x, y: at.y, says: says, near: false };
    f.el = picture(level, image, 'cs-friend', at);
    castle.friends.push(f);
    solid(level, at, function () { hop(f.el); say(says, f, level); });
  }

  var SURPRISES = {
    cannon: function (level, at) {
      var node = picture(level, 'cannon', 'cs-thing', at);
      solid(level, at, function () {
        Game.sound.play('boom');
        kick(node, 'boom');
        say('Бабах!', at, level);
        var puff = level.add(el('div', 'cs-puff'));
        level.place(puff, at.x, at.y);
        setTimeout(function () { if (puff.parentNode) puff.parentNode.removeChild(puff); }, 900);
      });
    },
    chest: function (level, at) {
      var node = picture(level, 'chest', 'cs-thing', at);
      solid(level, at, function () {
        Game.sound.play('bonus');
        node.src = Game.images['chest-open'];
        kick(node, 'hop');
        say('Скарб!', at, level);
        var glint = level.add(el('div', 'dr-glint'));
        level.place(glint, at.x, at.y);
        setTimeout(function () { if (glint.parentNode) glint.parentNode.removeChild(glint); }, 1000);
      });
    },
  };

  // Що в кожній кімнаті: ключі (кольори) і, може, сюрприз. Ключі кладемо
  // поруч із входом — до них завжди дійдеш; сюрприз — далі, а в
  // найдальшому вільному куті — бочка.
  function fill(level, roomId, keys, surprise) {
    var r = ROOMS[roomId], e = entry(r);
    var cells = [];
    for (var y = r.y0; y <= r.y1; y++) {
      for (var x = r.x0; x <= r.x1; x++) {
        if (!(x === e.x && y === e.y)) cells.push({ x: x, y: y });
      }
    }
    var dist = function (c) { return Math.abs(c.x - e.x) + Math.abs(c.y - e.y); };
    cells = shuffle(cells).sort(function (a, b) { return dist(a) - dist(b); });
    keys.forEach(function (color) { makeKey(level, color, cells.shift()); });
    if (surprise) SURPRISES[surprise](level, cells.shift());
    if (cells.length) wallItem(level, 'barrel', cells.pop());
  }

  // ─── що відбувається ────────────────────────────────────────────────

  function say(text, at, level) {
    var b = level.add(el('div', 'dr-say', text));
    level.place(b, at.x, at.y);
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 1400);
  }

  function kick(node, cls) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  }

  function hop(node) { kick(node, 'hop'); }

  // Мешканці вітаються, щойно герой підійде (і знову, коли відійде й
  // повернеться).
  function greet(cell, level) {
    castle.friends.forEach(function (f) {
      var now = near(cell, f);
      if (now && !f.near) { hop(f.el); say(f.says, f, level); }
      f.near = now;
    });
  }

  function takeKey(k, level) {
    k.taken = true;
    k.el.classList.add('taken');
    setTimeout(function () { if (k.el.parentNode) k.el.parentNode.removeChild(k.el); }, 600);
    k.slot = castle.tray.appendChild(level.image('key-' + k.color, 'cs-pocket'));
    castle.pocket.push(k);
    Game.sound.play('letter');
    level.toast(cap(COLORS[k.color].key) + ' ключ!');
  }

  // Над дверима — бульбашка з ключем, який до них потрібен.
  function ask(door, level) {
    var b = level.add(el('div', 'cs-ask'));
    b.appendChild(level.image('key-' + door.color, ''));
    level.place(b, door.x, door.y);
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 2600);
  }

  // Герой уперся в зачинені двері: є ключ — відчиняються, нема — двері
  // показують, який потрібен, і лишають наліпку.
  function knock(door, level) {
    if (door.open) return;
    var k = castle.pocket.filter(function (p) { return p.color === door.color; })[0];
    if (!k) {
      Game.sound.play('knock');
      kick(door.el, 'shake');
      ask(door, level);
      if (!door.tag) door.tag = picture(level, 'key-' + door.color, 'cs-tag', door);
      level.toast('Тук-тук! Потрібен ' + COLORS[door.color].key + ' ключ');
      return;
    }
    castle.pocket.splice(castle.pocket.indexOf(k), 1);
    castle.tray.removeChild(k.slot);
    door.open = true;
    door.el.src = Game.images['door-open'];
    if (door.tag) door.tag.parentNode.removeChild(door.tag);
    level.clear(door.x, door.y);
    delete castle.solids[key(door)];
    Game.sound.play('unlock');
    level.toast('Відчинено!');
  }

  // Знайшов коня: він радіє й дарує приз — коня-палку.
  function win(level) {
    if (level.done) return;
    remember();
    Game.sound.play('right');
    hop(castle.steed);
    say('Іго-го!', HORSE, level);
    picture(level, level.prize, 'cs-prize won', HORSE);
    level.title('Ура! Ти знайшов коня! Тепер ти скачеш верхи!');
    castle.friends.forEach(function (f) { hop(f.el); });
    level.finish(3600);
  }

  Game.registerQuestType({
    id: 'castle',
    mark: 'gate',   // вхід на карті — брама
    title: 'Знайди коня!',

    start: function (level) {
      var locks = solvedTimes() ? 4 : 3;
      var sides = shuffle(SIDES);
      // ланцюжок: стайню відчиняє ключ з chain[1], ту — з chain[2]…
      var chain = ['stable'].concat(sides.slice(0, locks - 1));
      var decoys = sides.slice(locks - 1);   // зайві кімнати
      var colors = shuffle(Object.keys(COLORS));
      var inside = { tl: [], tr: [], bl: [], br: [], stable: [] };   // кольори ключів у кімнатах
      var loose = [];                                                // ключі на видноті

      castle = { prev: START, keys: [], friends: [], pocket: [], solids: {} };
      build(level);

      chain.forEach(function (roomId, i) {
        makeDoor(level, roomId, colors[i]);
        if (chain[i + 1]) inside[chain[i + 1]].push(colors[i]);
        else loose.push(colors[i]);   // кінець ланцюжка
      });
      decoys.forEach(function (roomId, j) {
        var color = colors[chain.length + j];
        makeDoor(level, roomId, color);
        // перша зайва — ключ на видноті; друга — ключ у першій зайвій чи
        // серед потрібних кімнат, щоб не було видно, котрий куди
        if (j === 0) loose.push(color);
        else inside[pick([decoys[0]].concat(chain.slice(1)))].push(color);
      });

      var surprises = shuffle(Object.keys(SURPRISES));
      SIDES.forEach(function (roomId) {
        fill(level, roomId, inside[roomId], decoys.indexOf(roomId) >= 0 ? surprises[decoys.indexOf(roomId)] : null);
      });

      // стайня: кінь між копицями сіна, світиться — його видно здалеку
      level.place(level.add(el('div', 'cs-glow')), HORSE.x, HORSE.y);
      picture(level, 'steed', 'cs-sign', ROOMS.stable.door);   // табличка: тут кінь
      castle.steed = picture(level, 'steed', 'cs-steed', HORSE);
      [[-.45, -.35, 0], [.55, -.2, .55], [.35, .5, 1.05], [-.5, .4, .8]].forEach(function (p) {
        var spark = level.add(el('div', 'cs-spark'));
        level.place(spark, HORSE.x + p[0], HORSE.y + p[1]);
        spark.style.animationDelay = p[2] + 's';
      });
      solid(level, HORSE, function () { win(level); });
      HAY.forEach(function (at) { wallItem(level, 'hay', at); });

      // зала: лицар і кіт по боках від входу
      var friends = shuffle([['knight', 'Дзень!'], ['pic-cat', 'Мяу!']]);
      makeFriend(level, friends[0][0], friends[0][1], { x: 4, y: 6 });
      makeFriend(level, friends[1][0], friends[1][1], { x: 6, y: 6 });

      // кінці коридору: криниця й бочка
      var ends = shuffle(ENDS);
      var well = ends[0];
      picture(level, 'well', 'cs-thing', well);
      solid(level, well, function () { say('Ехо-о-о!', well, level); });
      wallItem(level, 'barrel', ends[1]);

      // ключі на видноті: у коридорі (не під дверима) чи в залі
      var open = [];
      for (var x = 1; x < level.w - 1; x++) {
        if (!isDoor(x, HALL_Y - 1) && !isDoor(x, HALL_Y + 1)) open.push({ x: x, y: HALL_Y });
      }
      open.push({ x: 4, y: 7 }, { x: 6, y: 7 });
      open = shuffle(open);
      loose.forEach(function (color) { makeKey(level, color, open.shift()); });

      // угорі ліворуч — ключі, що в кишені
      castle.tray = level.add(el('div', 'dr-tray cs-tray'));
      return START;
    },

    step: function (cell, level) {
      var bump = castle.solids[key(cell)];
      if (bump) {
        bump();
        if (castle.solids[key(cell)]) {   // не відчинилось — відскочив назад
          level.move(castle.prev.x, castle.prev.y);
          greet(castle.prev, level);
        } else {
          castle.prev = cell;
        }
        return true;   // щойно відчинив — постояти, подивитись
      }

      castle.prev = cell;
      greet(cell, level);
      var k = castle.keys.filter(function (p) { return same(p, cell) && !p.taken; })[0];
      if (k) { takeKey(k, level); return true; }
      return false;
    },
  });
})();
