// Завдання «Склади слово»: картинка, порожні клітинки під літери, а нижче —
// ті самі літери вперемішку. Дитина тисне літери по порядку: правильна
// перелітає у свою клітинку, неправильна трусонеться (і звук помилки).
//
// Зайвих літер немає — лише ті, що в слові. Апостроф (М'ЯЧ) стоїть одразу,
// його складати не треба. Двічі поспіль помилилась — потрібна літера
// м'яко підсвічується, щоб не застрягти.

(function () {
  'use strict';

  var FLY_MS = 320;
  var HINT_AFTER = 2;   // стільки помилок поспіль — і підказка

  function isLetter(ch) { return ch !== '\''; }

  // Перемішати так, щоб не вийшло саме слово (інакше нема чого складати).
  function scramble(letters) {
    var out = letters.slice();
    for (var n = 0; n < 20; n++) {
      Game.task.shuffle(out);
      if (out.join('') !== letters.join('')) break;
    }
    return out;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  Game.registerTaskType({
    id: 'build-word',
    title: 'Склади слово',

    render: function (box, finish) {
      var answer = Game.task.nextWord();
      var chars = Array.from(answer.word);

      var pic = el('img', 'task-pic');
      pic.src = Game.images[answer.image];
      pic.alt = '';
      pic.draggable = false;
      box.appendChild(pic);

      // клітинки слова; апостроф — одразу на місці
      var slotRow = el('div', 'task-slots');
      var slots = [];   // лише клітинки під літери, по порядку
      chars.forEach(function (ch) {
        if (isLetter(ch)) {
          var s = el('div', 'task-slot');
          slots.push({ el: s, letter: ch });
          slotRow.appendChild(s);
        } else {
          slotRow.appendChild(el('div', 'task-slot-mark', ch));
        }
      });
      box.appendChild(slotRow);

      // літери вперемішку, кожна трохи нахилена і зсунута — «розсипані»
      var tray = el('div', 'task-tray');
      var tiles = scramble(chars.filter(isLetter)).map(function (ch) {
        var t = el('button', 'task-tile', ch);
        t.style.setProperty('--rot', (Math.random() * 24 - 12).toFixed(1) + 'deg');
        t.style.setProperty('--dy', (Math.random() * 24 - 12).toFixed(0) + 'px');
        t.addEventListener('click', function () { pick(t, ch); });
        tray.appendChild(t);
        return t;
      });
      box.appendChild(tray);

      var next = 0;       // яку клітинку заповнюємо
      var misses = 0;     // помилок поспіль
      var flying = false;
      slots[0].el.classList.add('current');

      function pick(tile, ch) {
        if (flying || next >= slots.length) return;
        var slot = slots[next];
        if (ch !== slot.letter) {
          tile.classList.remove('wrong');
          void tile.offsetWidth;            // щоб трусилось і вдруге поспіль
          tile.classList.add('wrong');
          Game.sound.play('wrong');
          if (++misses >= HINT_AFTER) hint(slot.letter);
          return;
        }

        misses = 0;
        flying = true;
        clearHint();
        Game.sound.play('letter', 1 + next * 0.12);

        // перелетіти центром у центр клітинки
        var a = tile.getBoundingClientRect(), b = slot.el.getBoundingClientRect();
        var dx = (b.left + b.width / 2) - (a.left + a.width / 2);
        var dy = (b.top + b.height / 2) - (a.top + a.height / 2);
        tile.disabled = true;
        tile.classList.add('flying');
        tile.style.transform = 'translate(' + dx + 'px, calc(var(--dy) + ' + dy + 'px))';

        setTimeout(function () {
          tile.classList.add('used');
          slot.el.textContent = ch;
          slot.el.classList.remove('current');
          slot.el.classList.add('filled');
          flying = false;
          next++;
          if (next < slots.length) {
            slots[next].el.classList.add('current');
            return;
          }
          slotRow.classList.add('done');
          Game.sound.play('right');
          setTimeout(finish, 1300);
        }, FLY_MS);
      }

      function hint(letter) {
        clearHint();
        var t = tiles.filter(function (t) { return !t.disabled && t.textContent === letter; })[0];
        if (t) t.classList.add('hint');
      }

      function clearHint() {
        tiles.forEach(function (t) { t.classList.remove('hint'); });
      }
    },
  });
})();
