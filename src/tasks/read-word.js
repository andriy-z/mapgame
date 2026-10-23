// Завдання «Яке це слово?»: картинка і три слова, обрати те, що на картинці.
//
// Неправильне слово трусонеться і бліде — натиснути його вдруге не можна,
// тож рано чи пізно дитина знайде правильне. Правильне — зелене, дзвіночок.

(function () {
  'use strict';

  var CHOICES = 3;
  var shuffle = Game.task.shuffle;

  Game.registerTaskType({
    id: 'read-word',
    title: 'Яке це слово?',

    // box — порожній контейнер у вікні завдання; finish() — коли розв'язано.
    render: function (box, finish) {
      var answer = Game.task.nextWord();
      var others = shuffle(Game.words.filter(function (w) { return w !== answer; }));
      var options = shuffle([answer].concat(others.slice(0, CHOICES - 1)));

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
      options.forEach(function (option) {
        var btn = document.createElement('button');
        btn.className = 'task-word';
        btn.textContent = option.word;
        btn.addEventListener('click', function () {
          if (solved) return;
          if (option === answer) {
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
