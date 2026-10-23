// Завдання «Як правильно?»: картинка і три слова — одне правильне, у двох
// помилка. Слова короткі (не довше 4 літер), щоб помилку можна було
// помітити.
//
// Помилка — одна на слово: або літеру замінено на схожу (Б↔П, И↔І, Ж↔Ш…),
// або дві сусідні літери помінялись місцями (ЖУК → ЖКУ). Неправильне слово
// трусонеться і бліде, правильне — зелене, дзвіночок (як у «Яке це слово?»).

(function () {
  'use strict';

  var MAX_LETTERS = 4;
  var shuffle = Game.task.shuffle;

  // Схожі на слух чи на вигляд літери — так помиляються ті, хто вчиться читати.
  var LIKE = {
    'А': 'ОЯ', 'Б': 'ПВ', 'В': 'ФБ', 'Г': 'ХК', 'Д': 'Т', 'Е': 'ИЄ', 'Є': 'Е',
    'Ж': 'ШЗ', 'З': 'СЖ', 'И': 'ІЕ', 'І': 'ИЇ', 'Ї': 'І', 'Й': 'И', 'К': 'ГХ',
    'Л': 'Р', 'М': 'Н', 'Н': 'М', 'О': 'АУ', 'П': 'Б', 'Р': 'Л', 'С': 'ЗЦ',
    'Т': 'Д', 'У': 'ЮО', 'Ф': 'В', 'Х': 'ГК', 'Ц': 'С', 'Ч': 'ШЦ', 'Ш': 'ЖЧ',
    'Щ': 'Ш', 'Ю': 'У', 'Я': 'А',
  };

  // Помилки, що випадково стають справжніми словами: КІТ → КИТ, ДІМ → ДИМ.
  // Таке не годиться — це вже не помилка, а інше слово.
  var REAL = ['КИТ', 'ХІТ', 'ДИМ', 'ДІН', 'ТІМ', 'ГРИП', 'ГРЕБ', 'СОФА', 'СЕР', 'СИЛ', 'ЖАБО', 'ТАРТ'];

  function isLetter(ch) { return ch !== '\''; }

  // Усі слова з однією помилкою: { text, at } — at, де помилка.
  function mistakes(word) {
    var chars = Array.from(word);
    var out = [];
    chars.forEach(function (ch, i) {
      Array.from(LIKE[ch] || '').forEach(function (other) {
        var c = chars.slice();
        c[i] = other;
        out.push({ text: c.join(''), at: i });
      });
      var j = i + 1;
      if (j < chars.length && isLetter(ch) && isLetter(chars[j]) && ch !== chars[j]) {
        var s = chars.slice();
        s[i] = chars[j];
        s[j] = ch;
        out.push({ text: s.join(''), at: i });
      }
    });
    return out;
  }

  // Дві різні помилки, бажано в різних місцях слова. І щоб жодна не
  // виявилась справжнім словом — ні з гри, ні зі списку REAL.
  function twoWrong(word) {
    var real = REAL.concat(Game.words.map(function (w) { return w.word; }));
    var all = shuffle(mistakes(word)).filter(function (m) { return real.indexOf(m.text) < 0; });
    var first = all[0];
    var second = all.filter(function (m) { return m.text !== first.text && m.at !== first.at; })[0] ||
                 all.filter(function (m) { return m.text !== first.text; })[0];
    return [first.text, second.text];
  }

  Game.registerTaskType({
    id: 'spot-word',
    title: 'Як правильно?',

    render: function (box, finish) {
      var answer = Game.task.nextWord(function (w) {
        return Game.task.letters(w.word) <= MAX_LETTERS;
      });
      var options = shuffle([answer.word].concat(twoWrong(answer.word)));

      var pic = document.createElement('img');
      pic.className = 'task-pic';
      pic.src = Game.images[answer.image];
      pic.alt = '';
      pic.draggable = false;
      box.appendChild(pic);

      var row = document.createElement('div');
      row.className = 'task-choices';
      box.appendChild(row);

      var solved = false;
      options.forEach(function (text) {
        var btn = document.createElement('button');
        btn.className = 'task-word';
        btn.textContent = text;
        btn.addEventListener('click', function () {
          if (solved) return;
          if (text === answer.word) {
            solved = true;
            btn.classList.add('right');
            Game.sound.play('right');
            setTimeout(finish, 1100);
          } else {
            btn.classList.add('wrong');
            btn.disabled = true;
            Game.sound.play('wrong');
          }
        });
        row.appendChild(btn);
      });
    },
  });
})();
