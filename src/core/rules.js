// Правила руху — чиста логіка, без DOM. Правила описані в docs/04-dynamika.md.
//
// Тут вирішується, куди герой може дійти і якою дорогою. Що з цим робити
// (малювати точки, рухати фішку) — справа engine.js і view.js.

(function () {
  'use strict';

  // Скільки клітинок видно на екрані. Розмір клітинки в пікселях
  // підлаштовується під екран, а кількість — ні (docs/03-karta.md).
  var VIEW = { w: 11, h: 9 };

  // Наскільки далеко герої можуть розійтись, щоб обидва поміщались на
  // екрані з запасом в одну клітинку.
  var LEASH = { x: VIEW.w - 2, y: VIEW.h - 2 };

  var DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

  Game.rules = {
    VIEW: VIEW,

    // Чи може активний герой пройти через клітинку (x, y): прохідна і
    // напарник при цьому лишається на екрані. Крізь напарника пройти можна.
    canPass: function (map, partner, x, y, ignoreLeash) {
      if (!Game.isPassable(map, x, y)) return false;
      if (ignoreLeash) return true;
      return Math.abs(partner.x - x) <= LEASH.x && Math.abs(partner.y - y) <= LEASH.y;
    },

    // Чи може стояти: як пройти, але не на клітинці напарника.
    canStand: function (map, partner, x, y, ignoreLeash) {
      if (partner.x === x && partner.y === y) return false;
      return this.canPass(map, partner, x, y, ignoreLeash);
    },

    // Найкоротший шлях від героя до цілі (пошук у ширину). Ціль — клітинка,
    // де можна стояти; дорога — клітинки, через які можна пройти. Повертає
    // масив клітинок від старту до цілі включно або null, якщо дійти не можна.
    findPath: function (map, from, to, partner, ignoreLeash) {
      var rules = this;
      if (!rules.canStand(map, partner, to.x, to.y, ignoreLeash)) return null;

      var w = map.size.w;
      var cameFrom = {};
      var startKey = from.y * w + from.x;
      cameFrom[startKey] = -1;
      var queue = [from];

      while (queue.length) {
        var cell = queue.shift();
        if (cell.x === to.x && cell.y === to.y) return unwind(cameFrom, cell, w);

        for (var d = 0; d < 4; d++) {
          var nx = cell.x + DIRS[d][0], ny = cell.y + DIRS[d][1];
          var key = ny * w + nx;
          if (key in cameFrom) continue;
          if (!rules.canPass(map, partner, nx, ny, ignoreLeash)) continue;
          cameFrom[key] = cell.y * w + cell.x;
          queue.push({ x: nx, y: ny });
        }
      }
      return null;
    },

    // Обидва герої на фініші?
    isWon: function (map, heroes) {
      return heroes.every(function (hero) {
        return map.finish.some(function (f) { return f.x === hero.x && f.y === hero.y; });
      });
    },
  };

  function unwind(cameFrom, cell, w) {
    var path = [];
    var key = cell.y * w + cell.x;
    while (key !== -1) {
      path.unshift({ x: key % w, y: Math.floor(key / w) });
      key = cameFrom[key];
    }
    return path;
  }
})();
