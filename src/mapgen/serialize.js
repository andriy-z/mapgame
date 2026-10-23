// world (внутрішній) + tiles → дані карти за контрактом шару 1.
// Усе, чого немає в контракті, тут відрізається.

(function () {
  'use strict';
  window.MapGen = window.MapGen || {};

  MapGen.toMapData = function (world, tiles, options) {
    var opts = options || {};
    return {
      id: opts.id || 'poc-01',
      version: 1,
      size: { w: world.size.w, h: world.size.h },

      passable: world.passable,
      terrain: world.terrain,
      start: world.start,
      finish: world.finish,

      tiles: tiles,
      props: world.props || [],

      meta: {
        seed: world.meta.seed,
        usedSeed: world.meta.usedSeed,
        params: world.meta.params,
        pathLength: world.meta.pathLength,
        generator: world.meta.generator,
        resolver: opts.resolver,
      },
    };
  };

  // Текст файлу src/maps/<id>.js
  MapGen.toFileText = function (data) {
    var lines = [];
    lines.push('// Згенеровано tools/map-generator.html — не правити руками.');
    lines.push('// Контракт: docs/05-generator-karty.md, шар 1.');
    lines.push('');
    lines.push('Game.registerMap({');
    lines.push("  id: '" + data.id + "',");
    lines.push('  version: ' + data.version + ',');
    lines.push('  size: { w: ' + data.size.w + ', h: ' + data.size.h + ' },');
    lines.push('');
    lines.push('  passable: [');
    data.passable.forEach(function (row) {
      lines.push('    [' + row.join(',') + '],');
    });
    lines.push('  ],');
    lines.push('  terrain: [');
    data.terrain.forEach(function (row) {
      lines.push("    ['" + row.join("','") + "'],");
    });
    lines.push('  ],');
    lines.push('  start: ' + pointPair(data.start) + ',');
    lines.push('  finish: ' + pointPair(data.finish) + ',');
    lines.push('');
    lines.push('  tiles: [');
    data.tiles.forEach(function (row) {
      lines.push("    ['" + row.join("','") + "'],");
    });
    lines.push('  ],');
    lines.push('  props: [],');
    lines.push('');
    lines.push('  meta: ' + JSON.stringify(data.meta) + ',');
    lines.push('});');
    lines.push('');
    return lines.join('\n');
  };

  function pointPair(pair) {
    return '[ ' + pair.map(function (p) {
      return '{ x: ' + p.x + ', y: ' + p.y + ' }';
    }).join(', ') + ' ]';
  }
})();
