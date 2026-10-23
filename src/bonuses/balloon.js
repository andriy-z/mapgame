// Бонус «повітряна кулька» — разовий: щойно герой її отримав, кулька
// підхоплює його і несе на кілька клітинок. Куди саме — вирішує вітер
// (випадок), але завжди ближче до фінішу. Артефактом не стає, на фішці
// не лишається, кроків не забирає.

Game.registerBonus({
  id: 'balloon',
  near: 3, far: 6,    // на скільки клітинок може віднести (по прямій, у будь-який бік)

  marker: function () {
    return { image: 'balloon', item: true };
  },

  give: function () {
    return 'Повітряна кулька! Тримайся — летимо!';
  },

  // Разова дія після призу. game — що бонусу можна робити з грою
  // (engine.js, actions); done — покликати, коли все скінчилось.
  act: function (game, done) {
    var me = game.hero, friend = game.partner, map = game.map;
    var toFinish = Game.rules.distances(map, map.finish);
    var here = toFinish[me.y][me.x];
    var spots = [];
    for (var y = me.y - this.far; y <= me.y + this.far; y++) {
      for (var x = me.x - this.far; x <= me.x + this.far; x++) {
        var d = Math.max(Math.abs(x - me.x), Math.abs(y - me.y));
        if (d < this.near) continue;
        if (!Game.rules.canStand(map, friend, x, y, false) || game.taskAt(x, y)) continue;
        var left = (toFinish[y] || [])[x];
        if (left !== undefined && left < here) spots.push({ x: x, y: y });
      }
    }
    if (!spots.length) { game.toast('Вітру нема — кулька полетіла сама'); done(); return; }
    var to = spots[Math.floor(Math.random() * spots.length)];
    Game.sound.play('balloon');
    game.fly(game.index, to, { image: 'balloon' }, done, true);   // з висоти видно далеко
  },
});
