// Крок 3, найпростіша стратегія: дві картинки.
// Терен ігнорує — дивиться тільки на прохідність.

MapGen.registerResolver({
  id: 'flat-2',
  name: 'Дві плитки (прохідна / ні)',
  resolve: function (world, x, y) {
    return world.passable[y][x] ? 'green' : 'red';
  },
});
