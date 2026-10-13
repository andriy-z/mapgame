// Крок 3: терен + прохідність → id картинок.
// Стратегія замінна: автотайлінг колись стане просто іншим резолвером,
// і рендер про це не дізнається.

(function () {
  'use strict';
  window.MapGen = window.MapGen || {};
  MapGen.resolvers = {};

  MapGen.registerResolver = function (resolver) {
    MapGen.resolvers[resolver.id] = resolver;
  };

  MapGen.resolveTiles = function (world, resolverId) {
    var resolver = MapGen.resolvers[resolverId];
    if (!resolver) throw new Error('Невідомий резолвер: ' + resolverId);

    var tiles = [];
    for (var y = 0; y < world.size.h; y++) {
      var row = [];
      for (var x = 0; x < world.size.w; x++) {
        row.push(resolver.resolve(world, x, y));
      }
      tiles.push(row);
    }
    return tiles;
  };
})();
