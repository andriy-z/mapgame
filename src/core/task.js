// Вікно завдання. Яке саме завдання і як воно виглядає — у src/tasks/.
//
// open(typeId, onClose): показує вікно; onClose(true) — розв'язано,
// onClose(false) — закрили хрестиком чи Escape (можна повернутись пізніше).
// Замість id можна дати сам тип { title, render } — так кодовий замок
// темної кімнати (src/quests/dark-room.js) відкривається в тому ж вікні.

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var onClose = null;
  var bag = [];   // слова, які ще не загадували — спільні для всіх завдань, щоб не повторювались

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function close(solved) {
    if (!onClose) return;
    var cb = onClose;
    onClose = null;
    $('task').hidden = true;
    $('taskBody').innerHTML = '';
    cb(solved);
  }

  Game.task = {
    open: function (typeId, done) {
      var type = typeof typeId === 'string' ? Game.taskTypes[typeId] : typeId;
      onClose = done;
      $('taskTitle').textContent = type.title;
      $('taskBody').innerHTML = '';
      type.render($('taskBody'), function () { close(true); });
      $('task').hidden = false;
    },

    isOpen: function () { return !!onClose; },

    shuffle: shuffle,

    // Наступне слово для завдання: усі по разу, потім по новому колу.
    // fits(word) — яке слово годиться (наприклад, не довше 4 літер).
    nextWord: function (fits) {
      fits = fits || function () { return true; };
      for (var round = 0; round < 2; round++) {
        for (var i = bag.length - 1; i >= 0; i--) {
          if (fits(bag[i])) return bag.splice(i, 1)[0];
        }
        bag = shuffle(Game.words.slice());   // у торбі нема потрібного — нове коло
      }
      return null;
    },

    // Скільки літер у слові (апостроф не рахується).
    letters: function (word) {
      return Array.from(word).filter(function (ch) { return ch !== '\''; }).length;
    },

    attach: function () {
      $('taskClose').addEventListener('click', function () { close(false); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') close(false);
      });
    },
  };
})();
