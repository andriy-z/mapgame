// Завдання «Знайди картинку»: написане слово і три картинки, обрати ту,
// що до слова. Навпаки до «Яке це слово?»: тут дитина читає, а не впізнає.
//
// Неправильна картинка трусонеться і бліде — натиснути її вдруге не можна.
// Правильна — у зеленій рамці, дзвіночок.

(function () {
  'use strict';

  var CHOICES = 3;
  var shuffle = Game.task.shuffle;

  Game.registerTaskType({
    id: 'find-picture',
    title: 'Знайди картинку',

    render: function (box, finish) {
      var answer = Game.task.nextWord();
      var others = shuffle(Game.words.filter(function (w) { return w !== answer; }));
      var options = shuffle([answer].concat(others.slice(0, CHOICES - 1)));

      var word = document.createElement('div');
      word.className = 'task-big-word';
      word.textContent = answer.word;
      box.appendChild(word);

      var row = document.createElement('div');
      row.className = 'task-choices';
      box.appendChild(row);

      var solved = false;
      options.forEach(function (option) {
        var btn = document.createElement('button');
        btn.className = 'task-pic-choice';
        var img = document.createElement('img');
        img.src = Game.images[option.image];
        img.alt = '';
        img.draggable = false;
        btn.appendChild(img);
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
