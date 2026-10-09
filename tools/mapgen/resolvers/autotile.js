// Крок 3, автотайлінг: терен + сусіди (з діагоналями) → id картинки.
//
// Маска має 8 біт — 4 сторони і 4 діагоналі. Діагоналі потрібні, щоб
// внутрішні (увігнуті) кути масиву були заокруглені, а не гострі.
//
// Ключове правило blob-набору: діагональ рахується, ТІЛЬКИ якщо стоять
// обидві сусідні сторони. Інакше форма кута однаково визначається сторонами,
// а діагональ нічого не додала б. Саме тому з 256 комбінацій лишається 47
// різних, а не 256 картинок.
//
// За межами карти вважаємо, що терен той самий: масив іде за кадр.

(function () {
  'use strict';

  // Сторони: [dx, dy, біт]. За годинниковою стрілкою від півночі.
  var SIDES = [[0, -1, 1], [1, 0, 4], [0, 1, 16], [-1, 0, 64]];
  // Діагоналі: [dx, dy, біт, біт сусідньої сторони, біт другої сторони].
  var DIAGS = [
    [1, -1, 2, 1, 4],     // ПнСх — між північчю і сходом
    [1, 1, 8, 4, 16],     // ПдСх — між сходом і півднем
    [-1, 1, 32, 16, 64],  // ПдЗх — між півднем і заходом
    [-1, -1, 128, 64, 1], // ПнЗх — між заходом і північчю
  ];

  function sameTerrain(world, x, y, terrain) {
    var cell = world.at(x, y);
    if (!cell.inside) return true;
    return cell.terrain === terrain;
  }

  MapGen.registerResolver({
    id: 'autotile',
    name: 'Автотайлінг',
    resolve: function (world, x, y) {
      var terrain = world.terrain[y][x];
      if (terrain === 'grass') return 'grass-' + (world.hash(x, y) % 3);

      var mask = 0;
      for (var s = 0; s < 4; s++) {
        if (sameTerrain(world, x + SIDES[s][0], y + SIDES[s][1], terrain)) {
          mask |= SIDES[s][2];
        }
      }
      for (var d = 0; d < 4; d++) {
        var diag = DIAGS[d];
        if ((mask & diag[3]) && (mask & diag[4]) &&
            sameTerrain(world, x + diag[0], y + diag[1], terrain)) {
          mask |= diag[2];
        }
      }
      return terrain + '-' + mask;
    },
  });
})();
