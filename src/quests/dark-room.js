// Космічний квест «Темна кімната»: на космічній станції вимкнулось світло.
// Герой ходить з ліхтариком — навколо нього світло, решта в темряві, а де
// вже світив, лишається напівтемно. У темряві сховані цифри: посвітив на
// цифру — вона спалахує і стрибає в рядок угорі. Ще там живуть звірята:
// посвітиш — кіт «Мяу!», сова «Угу!». Часом десь у темряві щось блисне —
// там цифра, ще не знайдена.
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
// Скільки разів пройдено — у localStorage браузера (STORE).
// Код правильний — сейф відчиняється, з нього вилітає приз, вмикається
// світло. Як працює рівень — src/core/quest.js.

(function () {
  'use strict';

  var STORE = 'maxmap.darkRoom';   // скільки разів кімнату пройдено
  var LIGHT = 2;     // освітлено: квадрат відстані до героя ≤ 2 (3 × 3 клітинки)
  var GLOW = 5;      // напівтемрява довкола — видно обриси
  var GLINT_MS = 3500;   // як часто щось блискає там, де ще не знайдена цифра

  // Хто живе в темряві: картинка й що каже, коли посвітиш.
  var FRIENDS = [
    { image: 'pic-cat', says: 'Мяу!' },
    { image: 'pic-owl', says: 'Угу!' },
    { image: 'pic-frog', says: 'Ква-ква!' },
    { image: 'pic-beetle', says: 'Дзззз!' },
  ];
  var FRIENDS_COUNT = 3;

  // Яким буває код і як про нього питає замок.
  var KINDS = {
    digits: { count: 3, title: 'Набери цей код!' },
    max: { count: 3, title: 'Код — найбільша цифра!' },
    sum: { count: 2, title: 'Код — скільки разом?' },
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

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // Клітинки для цифр і звірят: випадкові, не біля героя, не біля сейфа
  // і не впритул одна до одної.
  function spots(n, level, start, safe) {
    var cells = [];
    for (var y = 1; y < level.h; y++) {
      for (var x = 0; x < level.w; x++) {
        var c = { x: x, y: y };
        var far = function (p, r) { return Math.abs(p.x - c.x) > r || Math.abs(p.y - c.y) > r; };
        if (far(start, 2) && far(safe, 1)) cells.push(c);
      }
    }
    var picked = [];
    Game.task.shuffle(cells).forEach(function (c) {
      if (picked.length >= n) return;
      var near = picked.some(function (p) { return Math.abs(p.x - c.x) < 2 && Math.abs(p.y - c.y) < 2; });
      if (!near) picked.push(c);
    });
    return picked;
  }

  // Ліхтарик: світло навколо героя, напівтемрява довкола, де вже світив —
  // темнувато. Те, що освітлено вперше, — знайдено.
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

  function found(dg, level) {
    dg.found = true;
    dg.el.style.opacity = '';
    level.add(dg.el);   // наверх, над темрявою — знайдена цифра світиться
    dg.el.classList.add('found');
    var n = room.order.push(dg);
    var slot = room.slots[n - 1];
    slot.textContent = dg.value;
    slot.classList.add('filled');
    Game.sound.play('letter', 1 + (n - 1) * 0.12);
    level.toast('Цифра ' + dg.value + '!');
    if (n < room.digits.length) return;

    setTimeout(function () {
      if (level.closed()) return;
      Game.sound.play('right');
      level.title('Усі цифри є! Біжи до сейфа');
      room.lamp.classList.add('ok');
      room.safe.classList.add('ready');
    }, 700);
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
        glint(level);
      }
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
      render: function (box, finish) {
        // підказка: що знайшов у кімнаті
        var clue = el('div', 'lock-clue');
        var cards = shown.map(function (v, i) {
          if (kind === 'sum' && i > 0) clue.appendChild(el('span', '', '+'));
          return clue.appendChild(el('div', 'lock-card', v));
        });
        if (kind === 'sum') clue.appendChild(el('span', '', '= ?'));
        box.appendChild(clue);

        // екранчик замка
        var screen = el('div', 'lock-screen');
        var cells = code.map(function () { return screen.appendChild(el('div', 'lock-cell')); });
        box.appendChild(screen);

        var pos = 0, solved = false;
        function mark() {
          cells.forEach(function (c, i) { c.classList.toggle('current', i === pos); });
          if (kind === 'digits') cards.forEach(function (c, i) {
            c.classList.toggle('next', i === pos);
            c.classList.toggle('used', i < pos);
          });
        }
        mark();

        var keys = el('div', 'lock-keys');
        var buttons = {};
        function press(n) {
          if (solved) return;
          Game.sound.play('click');
          if (n !== code[pos]) {
            Game.sound.play('wrong');
            var b = buttons[n];
            b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong');
            screen.classList.remove('bad'); void screen.offsetWidth; screen.classList.add('bad');
            return;
          }
          cells[pos].textContent = n;
          pos++;
          mark();
          if (pos < code.length) return;
          solved = true;
          screen.classList.add('ok');
          Game.sound.play('right');
          setTimeout(finish, 1000);
        }
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].forEach(function (n) {
          var b = keys.appendChild(el('button', 'lock-key', n));
          b.addEventListener('click', function () { this.blur(); press(n); });
          buttons[n] = b;
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
      room.friends.forEach(function (f) { greet(f, level); });
    }, 900);
    level.finish(4200);
  }

  Game.registerQuestType({
    id: 'dark-room',
    title: 'Темно! Шукай з ліхтариком цифри',

    start: function (level) {
      var kind = kindNow();
      var start = { x: 0, y: level.h - 1 };
      var safeAt = { x: level.w - 1, y: 2 };   // не в рядку 0 — там напис і ✕
      var values = digits(kind);
      var where = spots(values.length + FRIENDS_COUNT, level, start, safeAt);

      room = { kind: kind, safeAt: safeAt, prev: start, digits: [], friends: [], order: [], slots: [], dark: [], seen: [] };

      level.add(el('div', 'dr-room'));

      Game.task.shuffle(FRIENDS.slice()).slice(0, FRIENDS_COUNT).forEach(function (f, i) {
        var at = where[values.length + i];
        var friend = { x: at.x, y: at.y, says: f.says, met: false };
        friend.el = level.add(level.image(f.image, 'dr-friend'));
        level.place(friend.el, at.x, at.y);
        room.friends.push(friend);
      });

      values.forEach(function (v, i) {
        var dg = { x: where[i].x, y: where[i].y, value: v, found: false };
        dg.el = level.add(el('div', 'dr-digit', v));
        level.place(dg.el, dg.x, dg.y);
        room.digits.push(dg);
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

      // сейф видно й у темряві — до нього треба дійти
      room.safe = level.add(level.image('safe', 'dr-safe'));
      level.place(room.safe, safeAt.x, safeAt.y);
      room.lamp = level.add(el('div', 'dr-lamp'));
      level.place(room.lamp, safeAt.x, safeAt.y);

      var tray = level.add(el('div', 'dr-tray'));
      values.forEach(function () { room.slots.push(tray.appendChild(el('div', 'dr-slot'))); });

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
      level.move(room.prev.x, room.prev.y);
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
          else level.toast('Сейф чекає на код — підійди ще раз');   // ✕ у замку
        });
      }, 300);
      return true;
    },
  });
})();
