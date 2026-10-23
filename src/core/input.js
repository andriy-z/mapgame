// Ввід: миша, клавіатура, кнопки. Лише перекладає події в команди рушія.
//
//   миша над картою  → вказати клітинку      стрілки → зсунути вказану клітинку
//   клік             → вказати й іти          Enter   → іти

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var engine = Game.engine;

  Game.input = {
    attach: function () {
      var viewport = $('viewport');

      viewport.addEventListener('mousemove', function (e) {
        engine.point(Game.view.cellAt(e.clientX, e.clientY));
      });

      viewport.addEventListener('click', function (e) {
        engine.point(Game.view.cellAt(e.clientX, e.clientY));
        engine.go();
      });

      var arrows = {
        ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      };
      document.addEventListener('keydown', function (e) {
        if (Game.task.isOpen()) return;   // клавіші — вікну завдання
        if (Game.quest.isOpen()) { Game.quest.key(e); return; }   // і космосу
        if (arrows[e.key]) {
          e.preventDefault();
          engine.nudge(arrows[e.key][0], arrows[e.key][1]);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (!$('win').hidden) engine.newGame();
          else engine.go();
        }
      });

      // Браузер не дає грати звук, поки людина нічого не натиснула.
      // Тому музика вмикається з першим кліком чи клавішею.
      document.addEventListener('pointerdown', Game.sound.unlock);
      document.addEventListener('keydown', Game.sound.unlock);
      Game.task.attach();
      Game.quest.attach();
      $('mute').addEventListener('click', function () { this.blur(); Game.sound.toggleMute(); });

      // blur — щоб наступний Enter не натиснув кнопку вдруге.
      $('endTurn').addEventListener('click', function () { this.blur(); engine.endTurn(); });
      $('newGame').addEventListener('click', function () { this.blur(); engine.newGame(); });
      $('again').addEventListener('click', function () { engine.restart(); });
      $('winNew').addEventListener('click', function () { engine.newGame(); });

      window.addEventListener('resize', function () {
        Game.view.layout();
        Game.view.camera(engine.state(), true);
      });
    },
  };
})();
