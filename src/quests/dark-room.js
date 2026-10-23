// Космічний квест «Темна кімната»: на космічній станції вимкнулось світло,
// а кімната — маленький хелловінський лабіринт. Герой ходить з ліхтариком —
// навколо нього світло, решта в темряві, а де вже світив, лишається
// напівтемно. Стіни видно й у темряві, гарбузи-ліхтарики світяться самі.
//
// У темряві сховані цифри. Посвітив на цифру — вона спалахує і зникає, а
// вгорі загоряється зірочка. Цифри треба ЗАПАМ'ЯТАТИ: більше їх ніде не
// видно — ні вгорі, ні на замку. Ще там живуть мешканці: посвітиш —
// привид «Бу!», кажан «Пі-пі!». Часом десь у темряві щось блисне — там
// цифра, ще не знайдена.
//
// У кутку стоїть сейф з кодовим замком, на ньому лампочка: червона, поки
// знайдено не все, зелена — коли все. Сейф важкий: герой у нього
// впирається і відскакує. Уперся, коли все знайдено, — відкривається замок
// (вікно завдання, як на карті), і код залежить від того, котрий раз
// кімнату проходять:
//   1-й раз — набрати знайдені цифри по порядку;
//   2-й     — набрати найбільшу з них;
//   3-й     — скільки разом дві цифри;
//   далі    — найбільша чи сума, навмання.
// Код перевіряється, коли набрано весь; спроб три. Не вгадав тричі або
// закрив замок — цифри розбігаються: нові, в інших місцях, шукай знову.
// Скільки разів пройдено — у localStorage браузера (STORE).
// Код правильний — сейф відчиняється, з нього вилітає приз, вмикається
// світло. Як працює рівень — src/core/quest.js.

(function () {
  'use strict';

  var STORE = 'maxmap.darkRoom';   // скільки разів кімнату пройдено
  var LIGHT = 2;     // освітлено: квадрат відстані до героя ≤ 2 (3 × 3 клітинки)
  var GLOW = 5;      // напівтемрява довкола — видно обриси
  var GLINT_MS = 3500;   // як часто щось блискає там, де ще не знайдена цифра
  var SHOW_MS = 1600;    // скільки знайдена цифра світиться, перш ніж зникнути
  var TRIES = 3;         // спроб набрати код

  // Лабіринт: стільки коротких стінок (2–4 клітинки, деякі з загином).
  // Стінки не торкаються одна одної — тож закутків, куди не дійти, нема.
  var WALLS = 9;

  // Хто живе в темряві: картинка й що каже, коли посвітиш.
  var FRIENDS = [
    { image: 'hw-ghost', says: 'Бу!' },
    { image: 'hw-bat', says: 'Пі-пі!' },
    { image: 'pic-cat', says: 'Мяу!' },
    { image: 'pic-owl', says: 'Угу!' },
  ];
  var FRIENDS_COUNT = 3;
  var PUMPKINS = 2;   // світяться в темряві
  var CANDLES = 2;    // видно, коли посвітиш
  var WEBS = 3;       // у кутках біля стін

  // Яким буває код і як про нього питає замок.
  var KINDS = {
    digits: { count: 3, title: 'Набери цифри, які знайшов, по порядку!' },
    max: { count: 3, title: 'Яка цифра була найбільша?' },
    sum: { count: 2, title: 'Скільки разом дві цифри?' },
  };

  var room = null;   // усе про цей прохід кімнати

  function random(n) { return Math.floor(Math.random() * n); }

  function solvedTimes() {
    try { return parseInt(localStorage.getItem(STORE), 10) || 0; } catch (e) { return 0; }
  }

  function remember() {
    try { localStorage.setItem(STORE, solvedTimes() + 1); } catch (e) { /* без пам'яті — то й без неї */ }
  }

  function kindNow() {
    var n = solvedTimes();
    if (n < 3) return ['digits', 'max', 'sum'][n];
    return Math.random() < 0.5 ? 'max' : 'sum';
  }

  // Цифри, що сховані в кімнаті.
  function digits(kind) {
    if (kind === 'sum') {
      var a = 1 + random(8);
      return [a, 1 + random(9 - a)];   // разом не більше 9 — код з однієї цифри
    }
    return Game.task.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, KINDS[kind].count);
  }

  // «1 цифру», «2 цифри», «5 цифр».
  function digitsWord(n) {
    if (n === 1) return n + ' цифру';
    return n + (n < 5 ? ' цифри' : ' цифр');
  }

  function d2(a, b) { return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y); }
  function near(a, b, r) { return Math.abs(a.x - b.x) <= r && Math.abs(a.y - b.y) <= r; }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // ─── лабіринт ───────────────────────────────────────────────────────

  // Чи можна з from дійти до кожної вільної клітинки.
  function reachable(level, wall, from) {
    var seen = {}, queue = [from], count = 1, total = level.w * level.h - Object.keys(wall).length;
    seen[from.x + ',' + from.y] = true;
    while (queue.length) {
      var c = queue.shift();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var x = c.x + d[0], y = c.y + d[1], key = x + ',' + y;
        if (x < 0 || y < 0 || x >= level.w || y >= level.h || seen[key] || wall[key]) return;
        seen[key] = true;
        count++;
        queue.push({ x: x, y: y });
      });
    }
    return count === total;
  }

  // Стінки: у рядку 0 (там напис) — ні; біля старту й сейфа — ні;
  // стінка не торкається іншої навіть кутом, і жодного закутка, куди не
  // дійти (стінка з загином біля краю могла б відгородити клітинку).
  // Повертає { 'x,y': true }.
  function maze(level, keep) {
    var wall = {};
    function inside(c) { return c.x >= 0 && c.y >= 1 && c.x < level.w && c.y < level.h; }
    function free(c) {
      if (!inside(c)) return false;
      if (keep.some(function (k) { return Math.abs(k.x - c.x) + Math.abs(k.y - c.y) <= 1; })) return false;
      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) if (wall[(c.x + dx) + ',' + (c.y + dy)]) return false;
      }
      return true;
    }
    var made = 0;
    for (var tries = 0; made < WALLS && tries < 500; tries++) {
      var dir = Math.random() < 0.5 ? [1, 0] : [0, 1];
      var c = { x: random(level.w), y: 1 + random(level.h - 1) };
      var cells = [];
      for (var i = 0, len = 2 + random(3); i < len; i++) cells.push({ x: c.x + dir[0] * i, y: c.y + dir[1] * i });
      if (Math.random() < 0.4) {   // загин наприкінці
        var end = cells[cells.length - 1], turn = Math.random() < 0.5 ? 1 : -1;
        for (var j = 1, bend = 1 + random(2); j <= bend; j++) {
          cells.push({ x: end.x + dir[1] * turn * j, y: end.y + dir[0] * turn * j });
        }
      }
      if (!cells.every(free)) continue;
      cells.forEach(function (w) { wall[w.x + ',' + w.y] = true; });
      if (reachable(level, wall, keep[0])) { made++; continue; }
      cells.forEach(function (w) { delete wall[w.x + ',' + w.y]; });
    }
    return wall;
  }

  // Вільні клітинки, далеко від героя і не біля сейфа.
  function floor(level, start, safe, wall) {
    var cells = [];
    for (var y = 1; y < level.h; y++) {
      for (var x = 0; x < level.w; x++) {
        var c = { x: x, y: y };
        if (!wall[x + ',' + y] && !near(c, start, 2) && !near(c, safe, 1)) cells.push(c);
      }
    }
    return cells;
  }

  // n клітинок з вільних — не впритул одна до одної й до taken.
  function spots(n, cells, taken) {
    var picked = [];
    Game.task.shuffle(cells.slice()).forEach(function (c) {
      if (picked.length >= n) return;
      var busy = picked.concat(taken).some(function (p) { return near(p, c, 1); });
      if (!busy) picked.push(c);
    });
    return picked;
  }

  // Павутина — у кутку клітинки, де з двох боків стіна чи край кімнати.
  function webs(level, wall) {
    function blocked(x, y) { return x < 0 || y < 1 || x >= level.w || y >= level.h || wall[x + ',' + y]; }
    var corners = [];
    for (var y = 1; y < level.h; y++) {
      for (var x = 0; x < level.w; x++) {
        if (wall[x + ',' + y]) continue;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) {
          if (blocked(x + s[0], y) && blocked(x, y + s[1])) corners.push({ x: x, y: y, sx: s[0], sy: s[1] });
        });
      }
    }
    return spots(WEBS, corners, []);
  }

  // ─── ліхтарик ───────────────────────────────────────────────────────

  // Світло навколо героя, напівтемрява довкола, де вже світив — темнувато.
  // Те, що освітлено вперше, — знайдено.
  function light(at, level) {
    room.torch.style.left = 'calc(var(--t) * ' + (at.x - 2) + ')';
    room.torch.style.top = 'calc(var(--t) * ' + (at.y - 2) + ')';
    room.dark.forEach(function (row, y) {
      row.forEach(function (cell, x) {
        var d = d2(at, { x: x, y: y });
        if (d <= LIGHT) room.seen[y][x] = true;
        cell.className = d <= LIGHT ? 'lit' : d <= GLOW ? 'dim' : room.seen[y][x] ? 'seen' : '';
      });
    });
    room.walls.forEach(function (w) { w.el.classList.toggle('near', d2(at, w) <= GLOW); });
    room.digits.forEach(function (dg) {
      if (dg.found) return;
      var d = d2(at, dg);
      if (d <= LIGHT) found(dg, level);
      // ненайдену видно лише в напівтемряві поруч — крізь розмиту темряву
      // здалеку вона не просвічує
      else dg.el.style.opacity = d <= GLOW ? '' : 0;
    });
    room.friends.forEach(function (f) {
      if (!f.met && d2(at, f) <= LIGHT) { f.met = true; greet(f, level); }
    });
  }

  // Знайшов: цифра спалахує, трохи світиться — і зникає. Вгорі — зірочка.
  function found(dg, level) {
    dg.found = true;
    dg.el.style.opacity = '';
    level.add(dg.el);   // наверх, над темрявою — знайдена цифра світиться
    dg.el.classList.add('found');
    setTimeout(function () {
      dg.el.classList.add('gone');
      setTimeout(function () { if (dg.el.parentNode) dg.el.parentNode.removeChild(dg.el); }, 600);
    }, SHOW_MS);

    var n = room.order.push(dg);
    room.slots[n - 1].classList.add('filled');
    Game.sound.play('letter', 1 + (n - 1) * 0.12);
    level.toast('Цифра ' + dg.value + '! Запам\'ятай!');
    if (n < room.digits.length) return;

    var batch = room.batch;
    setTimeout(function () {
      if (level.closed() || batch !== room.batch) return;
      Game.sound.play('right');
      level.title('Запам\'ятав цифри? Біжи до сейфа!');
      room.lamp.classList.add('ok');
      room.safe.classList.add('ready');
    }, 700);
  }

  // Сховати цифри в кімнаті (на початку і коли розбіглися) — не там,
  // де зараз світить ліхтарик героя.
  function hide(level, hero) {
    room.batch++;
    room.digits.forEach(function (dg) { if (dg.el.parentNode) dg.el.parentNode.removeChild(dg.el); });
    room.digits = [];
    room.order = [];
    room.slots.forEach(function (s) { s.classList.remove('filled'); });

    var taken = room.friends.concat(room.decor);
    var dark = room.floor.filter(function (c) { return !near(c, hero, 2); });
    var where = spots(room.values.length, dark, taken);
    room.values.forEach(function (v, i) {
      var dg = { x: where[i].x, y: where[i].y, value: v, found: false };
      dg.el = el('div', 'dr-digit', v);
      room.darkEl.parentNode.insertBefore(dg.el, room.darkEl);   // під темряву
      level.place(dg.el, dg.x, dg.y);
      room.digits.push(dg);
    });
  }

  // Замок не відчинили — цифри розбіглися: нові, в інших місцях.
  function scatter(level, at) {
    room.values = digits(room.kind);
    hide(level, at);
    room.lamp.classList.remove('ok');
    room.safe.classList.remove('ready');
    level.title('Цифри розбіглися! Шукай знову');
    level.toast('Цифри розбіглися! Шукай знову', 2400);
    light(at, level);
  }

  function say(text, at, level) {
    var b = level.add(el('div', 'dr-say', text));
    level.place(b, at.x, at.y);
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 1400);
  }

  function greet(f, level) {
    f.el.classList.remove('hop');
    void f.el.offsetWidth;
    f.el.classList.add('hop');
    say(f.says, f, level);
  }

  // Десь у темряві блиснуло — там ще не знайдена цифра.
  function glint(level) {
    setTimeout(function () {
      if (level.closed() || level.done) return;
      var hidden = room.digits.filter(function (dg) { return !dg.found; });
      if (hidden.length) {
        var dg = hidden[random(hidden.length)];
        var s = level.add(el('div', 'dr-glint'));
        level.place(s, dg.x, dg.y);
        setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 1000);
      }
      glint(level);
    }, GLINT_MS);
  }

  // ─── кодовий замок: вікно завдання ──────────────────────────────────

  function lock() {
    var kind = room.kind;
    var shown = room.order.map(function (dg) { return dg.value; });
    var code = kind === 'digits' ? shown
      : kind === 'max' ? [Math.max.apply(null, shown)]
      : [shown[0] + shown[1]];

    return {
      title: KINDS[kind].title,
      render: function (box, finish, fail) {
        // скільки ще спроб — сердечка
        var hearts = el('div', 'lock-hearts');
        var heartEls = [];
        for (var h = 0; h < TRIES; h++) heartEls.push(hearts.appendChild(el('span', '', '❤')));
        box.appendChild(hearts);

        // екранчик замка
        var screen = el('div', 'lock-screen');
        var cells = code.map(function () { return screen.appendChild(el('div', 'lock-cell')); });
        box.appendChild(screen);

        var typed = [], tries = TRIES, wait = false, solved = false;
        function mark() {
          cells.forEach(function (c, i) {
            c.textContent = i < typed.length ? typed[i] : '';
            c.classList.toggle('current', i === typed.length);
          });
        }
        mark();

        function check() {
          var right = typed.every(function (n, i) { return n === code[i]; });
          if (right) {
            solved = true;
            screen.classList.add('ok');
            Game.sound.play('right');
            setTimeout(finish, 1000);
            return;
          }
          Game.sound.play('wrong');
          tries--;
          heartEls[tries].classList.add('lost');
          screen.classList.remove('bad'); void screen.offsetWidth; screen.classList.add('bad');
          wait = true;
          setTimeout(function () {
            if (!tries) { fail(); return; }
            wait = false;
            typed = [];
            mark();
          }, 900);
        }

        var keys = el('div', 'lock-keys');
        function press(n) {
          if (solved || wait) return;
          Game.sound.play('click');
          typed.push(n);
          mark();
          if (typed.length === code.length) check();
        }
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].forEach(function (n) {
          var b = keys.appendChild(el('button', 'lock-key', n));
          b.addEventListener('click', function () { this.blur(); press(n); });
        });
        box.appendChild(keys);

        // цифри з клавіатури теж (для дорослого)
        function onKey(e) {
          if (!keys.isConnected) { document.removeEventListener('keydown', onKey); return; }
          if (/^[0-9]$/.test(e.key)) press(+e.key);
        }
        document.addEventListener('keydown', onKey);
      },
    };
  }

  // Код правильний: клац — сейф навстіж, приз вилітає, світло вмикається.
  function open(level) {
    remember();
    Game.sound.play('unlock');
    room.safe.classList.remove('ready');
    room.safe.src = Game.images['safe-open'];
    room.lamp.hidden = true;
    var prize = level.add(level.image(level.prize, 'dr-prize'));
    level.place(prize, room.safeAt.x, room.safeAt.y);
    level.title('Ура! Сейф відчинено!');
    setTimeout(function () {
      if (level.closed()) return;
      room.darkEl.classList.add('off');
      room.torch.hidden = true;
      room.walls.forEach(function (w) { w.el.classList.add('near'); });
      room.friends.forEach(function (f) { greet(f, level); });
    }, 900);
    level.finish(4200);
  }

  Game.registerQuestType({
    id: 'dark-room',
    title: 'Темно! Знайди цифри й запам\'ятай',

    start: function (level) {
      var kind = kindNow();
      var start = { x: 0, y: level.h - 1 };
      var safeAt = { x: level.w - 1, y: 2 };   // не в рядку 0 — там напис і ✕
      var wall = maze(level, [start, safeAt]);
      var cells = floor(level, start, safeAt, wall);

      room = {
        kind: kind, safeAt: safeAt, prev: start, floor: cells, batch: 0, values: digits(kind),
        digits: [], friends: [], decor: [], walls: [], order: [], slots: [], dark: [], seen: [],
      };

      level.add(el('div', 'dr-room'));

      // під темрявою: свічки й павутина — їх видно, коли посвітиш
      webs(level, wall).forEach(function (w) {
        var web = level.add(level.image('hw-web', 'dr-web'));
        web.style.scale = (-w.sx) + ' ' + (-w.sy);   // картинка — для лівого верхнього кута
        level.place(web, w.x, w.y);
      });
      var where = spots(FRIENDS_COUNT + CANDLES + PUMPKINS, cells, []);
      room.decor = where.slice(FRIENDS_COUNT);
      where.slice(FRIENDS_COUNT, FRIENDS_COUNT + CANDLES).forEach(function (at) {
        level.place(level.add(level.image('hw-candle', 'dr-decor')), at.x, at.y);
      });

      Game.task.shuffle(FRIENDS.slice()).slice(0, FRIENDS_COUNT).forEach(function (f, i) {
        var at = where[i];
        var friend = { x: at.x, y: at.y, says: f.says, met: false };
        friend.el = level.add(level.image(f.image, 'dr-friend'));
        level.place(friend.el, at.x, at.y);
        room.friends.push(friend);
      });

      // темрява — клітинками, розмита, щоб світло було кругле й м'яке
      room.darkEl = level.add(el('div', 'dr-dark'));
      for (var y = 0; y < level.h; y++) {
        room.dark.push([]);
        room.seen.push([]);
        for (var x = 0; x < level.w; x++) {
          var cell = room.darkEl.appendChild(el('div', ''));
          level.place(cell, x, y);
          room.dark[y].push(cell);
          room.seen[y].push(false);
        }
      }
      room.torch = level.add(el('div', 'dr-torch'));

      // над темрявою: стіни лабіринту й гарбузи-ліхтарики
      Object.keys(wall).forEach(function (key) {
        var xy = key.split(',');
        var w = { x: +xy[0], y: +xy[1], el: level.add(el('div', 'dr-wall')) };
        level.place(w.el, w.x, w.y);
        level.wall(w.x, w.y);
        room.walls.push(w);
      });
      where.slice(FRIENDS_COUNT + CANDLES).forEach(function (at) {
        level.place(level.add(level.image('hw-pumpkin', 'dr-pumpkin')), at.x, at.y);
      });

      // сейф видно й у темряві — до нього треба дійти
      room.safe = level.add(level.image('safe', 'dr-safe'));
      level.place(room.safe, safeAt.x, safeAt.y);
      level.solid(safeAt.x, safeAt.y);   // шлях до сейфа — так, крізь сейф — ні
      room.lamp = level.add(el('div', 'dr-lamp'));
      level.place(room.lamp, safeAt.x, safeAt.y);

      // угорі — скільки цифр знайдено: зірочки, а не самі цифри
      var tray = level.add(el('div', 'dr-tray'));
      room.values.forEach(function () { room.slots.push(tray.appendChild(el('div', 'dr-slot', '★'))); });

      hide(level, start);
      light(start, level);
      glint(level);
      return start;
    },

    step: function (cell, level) {
      if (cell.x !== room.safeAt.x || cell.y !== room.safeAt.y) {
        room.prev = cell;
        light(cell, level);
        return false;
      }

      // сейф важкий — герой у нього впирається і відскакує на крок назад
      var back = room.prev;
      level.move(back.x, back.y);
      var left = room.digits.length - room.order.length;
      if (left) {
        Game.sound.play('wrong');
        room.lamp.classList.remove('blink'); void room.lamp.offsetWidth; room.lamp.classList.add('blink');
        level.toast('Сейф зачинений. Знайди ще ' + digitsWord(left) + '!');
        return true;
      }

      setTimeout(function () {
        if (level.closed()) return;
        Game.task.open(lock(), function (solved) {
          if (level.closed()) return;
          if (solved) open(level);
          else scatter(level, back);   // ✕ у замку або три помилки
        });
      }, 300);
      return true;
    },
  });
})();
