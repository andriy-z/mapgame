// Перевірка інваріантів контракту шару 1.
// Повертає масив рядків-помилок; порожній масив = карта валідна.

(function () {
  'use strict';
  window.MapGen = window.MapGen || {};

  MapGen.validateMap = function (data, tileRegistry, propRegistry) {
    var errors = [];
    var w = data.size.w, h = data.size.h;

    // 1. форма passable
    if (data.passable.length !== h) {
      errors.push('passable: ' + data.passable.length + ' рядків замість ' + h);
    }
    data.passable.forEach(function (row, y) {
      if (row.length !== w) errors.push('passable[' + y + ']: ' + row.length + ' значень замість ' + w);
      row.forEach(function (v, x) {
        if (v !== true && v !== false) errors.push('passable[' + y + '][' + x + ']: не true/false');
      });
    });

    // 2. форма tiles
    if (data.tiles.length !== h) {
      errors.push('tiles: ' + data.tiles.length + ' рядків замість ' + h);
    }
    data.tiles.forEach(function (row, y) {
      if (row.length !== w) errors.push('tiles[' + y + ']: ' + row.length + ' id замість ' + w);
    });

    // 2a. форма terrain (якщо є — за ним правила знають, де вода)
    if (data.terrain) {
      if (data.terrain.length !== h) errors.push('terrain: ' + data.terrain.length + ' рядків замість ' + h);
      data.terrain.forEach(function (row, y) {
        if (row.length !== w) errors.push('terrain[' + y + ']: ' + row.length + ' значень замість ' + w);
      });
    }

    // 3. периметр
    for (var x = 0; x < w; x++) {
      if (data.passable[0][x] || data.passable[h - 1][x]) { errors.push('периметр не суцільний (колонка ' + x + ')'); break; }
    }
    for (var y = 0; y < h; y++) {
      if (data.passable[y][0] || data.passable[y][w - 1]) { errors.push('периметр не суцільний (рядок ' + y + ')'); break; }
    }

    // 4. усі id відомі
    var unknown = {};
    data.tiles.forEach(function (row) {
      row.forEach(function (id) { if (!tileRegistry[id]) unknown[id] = true; });
    });
    Object.keys(unknown).forEach(function (id) { errors.push('невідома плитка: ' + id); });
    (data.props || []).forEach(function (p) {
      if (!propRegistry || !propRegistry[p.id]) errors.push('невідомий об\'єкт: ' + p.id);
    });

    // 5. старт і фініш
    ['start', 'finish'].forEach(function (key) {
      var pair = data[key];
      if (!pair || pair.length !== 2) { errors.push(key + ': має бути рівно 2 клітинки'); return; }
      pair.forEach(function (p) {
        if (!data.passable[p.y] || !data.passable[p.y][p.x]) {
          errors.push(key + ': клітинка (' + p.x + ',' + p.y + ') непрохідна');
        }
      });
      var dx = Math.abs(pair[0].x - pair[1].x), dy = Math.abs(pair[0].y - pair[1].y);
      if (dx + dy !== 1) errors.push(key + ': клітинки не сусідні');
    });

    // 6-7. зв'язність і довжина шляху
    var search = flood(data.passable, w, h, data.start[0]);
    var total = 0;
    for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) if (data.passable[yy][xx]) total++;
    if (search.reached !== total) {
      errors.push('ізольовані зони: досяжно ' + search.reached + ' з ' + total + ' прохідних клітинок');
    }
    var pathLength = search.dist[data.finish[0].y][data.finish[0].x];
    var required = data.meta && data.meta.params ? data.meta.params.minPathLength : 0;
    if (pathLength < 0) errors.push('фініш недосяжний зі старту');
    else if (pathLength < required) errors.push('шлях ' + pathLength + ' < minPathLength ' + required);

    // 8. meta для відтворення
    ['usedSeed', 'params', 'generator', 'resolver'].forEach(function (key) {
      if (data.meta[key] === undefined) errors.push('meta.' + key + ' відсутнє — карту не відтворити');
    });

    return errors;
  };

  function flood(passable, w, h, from) {
    var dist = [];
    for (var y = 0; y < h; y++) { dist.push([]); for (var x = 0; x < w; x++) dist[y].push(-1); }
    dist[from.y][from.x] = 0;
    var queue = [from], head = 0, reached = 1;
    var dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    while (head < queue.length) {
      var cur = queue[head++];
      for (var d = 0; d < 4; d++) {
        var nx = cur.x + dirs[d][0], ny = cur.y + dirs[d][1];
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        if (!passable[ny][nx] || dist[ny][nx] !== -1) continue;
        dist[ny][nx] = dist[cur.y][cur.x] + 1;
        queue.push({ x: nx, y: ny });
        reached++;
      }
    }
    return { dist: dist, reached: reached };
  }
})();
