// Бонус «губна гармошка» (Нюхмумрикова) — разовий: щойно герой її
// отримав, він грає, і друг іде на музику — переноситься на клітинку
// поруч. Яку саме — ту, що ближче до фінішу. Артефактом не стає.

Game.registerBonus({
  id: 'harmonica',

  marker: function () {
    return { image: 'harmonica', item: true };
  },

  give: function () {
    return 'Губна гармошка! Друг іде на музику';
  },

  // Разова дія після призу: game і done — як у balloon.js.
  act: function (game, done) {
    var me = game.hero, friend = game.partner, map = game.map;
    var toFinish = Game.rules.distances(map, map.finish);
    Game.sound.play('harmonica');
    if (Math.max(Math.abs(friend.x - me.x), Math.abs(friend.y - me.y)) <= 1) {
      game.toast('Друг і так поруч — гарна музика!');
      done();
      return;
    }
    var best = null, bestLeft = Infinity;
    // спершу сусідні клітинки, тоді через одну — поки не знайдемо, де стати
    for (var r = 1; r <= 2 && !best; r++) {
      for (var y = me.y - r; y <= me.y + r; y++) {
        for (var x = me.x - r; x <= me.x + r; x++) {
          if (Math.max(Math.abs(x - me.x), Math.abs(y - me.y)) !== r) continue;
          if (x === friend.x && y === friend.y) continue;
          if (!Game.rules.canStand(map, me, x, y, true) || game.taskAt(x, y)) continue;
          var left = (toFinish[y] || [])[x];
          if (left === undefined) left = 999;
          if (left < bestLeft) { best = { x: x, y: y }; bestLeft = left; }
        }
      }
    }
    if (!best) { game.toast('Друг почув, але не може підійти'); done(); return; }
    game.fly(1 - game.index, best, { text: '♪ ♫' }, done);
  },
});
