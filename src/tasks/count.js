// Завдання «Порахуй»: приклад на додавання чи віднімання в межах 10 і три
// відповіді на вибір. Замість відповіді в прикладі — порожня клітинка;
// правильно — у ній з'являється число.
//
// Неправильні відповіді — сусідні числа (на 1–2 більше чи менше), щоб
// треба було справді порахувати, а не вгадати. Неправильна трусонеться
// і бліде, правильна — зелена, дзвіночок (як у «Яке це слово?»).

(function () {
  'use strict';

  var MAX = 10;
  var shuffle = Game.task.shuffle;

  function rand(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

  // { a, op, b, answer }: a + b ≤ 10 або a − b ≥ 0, числа від 1.
  function example() {
    if (Math.random() < 0.5) {
      var sum = rand(2, MAX), a = rand(1, sum - 1);
      return { a: a, op: '+', b: sum - a, answer: sum };
    }
    var top = rand(2, MAX), b = rand(1, top - 1);
    return { a: top, op: '−', b: b, answer: top - b };
  }

  // Правильна відповідь і дві сусідні, усі різні й у межах 0…10.
  function options(answer) {
    var near = shuffle([-2, -1, 1, 2].map(function (d) { return answer + d; })
      .filter(function (n) { return n >= 0 && n <= MAX; }));
    return shuffle([answer, near[0], near[1]]);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  Game.registerTaskType({
    id: 'count',
    title: 'Порахуй',

    render: function (box, finish) {
      var ex = example();

      var line = el('div', 'task-sum');
      line.appendChild(el('span', '', ex.a + ' ' + ex.op + ' ' + ex.b + ' ='));
      var gap = el('span', 'task-sum-gap', '?');
      line.appendChild(gap);
      box.appendChild(line);

      var row = el('div', 'task-choices');
      box.appendChild(row);

      var solved = false;
      options(ex.answer).forEach(function (n) {
        var btn = el('button', 'task-word task-number', n);
        btn.addEventListener('click', function () {
          if (solved) return;
          if (n === ex.answer) {
            solved = true;
            btn.classList.add('right');
            gap.textContent = n;
            gap.classList.add('filled');
            Game.sound.play('right');
            setTimeout(finish, 1300);
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
