// Прохід 1, кроки 1-2: топологія і терен.
// На виході — об'єкт `world` (внутрішній контракт, docs/05-generator-karty.md).

(function () {
  'use strict';
  window.MapGen = window.MapGen || {};

  MapGen.DEFAULT_PARAMS = {
    width: 24,
    height: 18,
    minPathLength: 25,
    braiding: 0.4,
    alcoves: 0.35,
    clearings: 3,
    maxAttempts: 200,
  };

  function grid(w, h, value) {
    var g = [];
    for (var y = 0; y < h; y++) {
      var row = [];
      for (var x = 0; x < w; x++) row.push(value);
      g.push(row);
    }
    return g;
  }

  var DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

  // ── Крок 1: прокопати лабіринт ─────────────────────────────────────
  //
  // Клітинки лабіринту стоять на непарних координатах, стіни між ними —
  // на парних. Якщо запитаний розмір парний, зайві ряди йдуть у рамку,
  // а сам лабіринт центрується.
  function carveOnce(params, seed) {
    var w = params.width, h = params.height;
    var rng = MapGen.makeRng(seed);

    var cols = Math.floor((w - 1) / 2);
    var rows = Math.floor((h - 1) / 2);
    if (cols < 2 || rows < 2) return null;

    var offX = Math.floor((w - (2 * cols + 1)) / 2);
    var offY = Math.floor((h - (2 * rows + 1)) / 2);
    var gx = function (cx) { return offX + 1 + 2 * cx; };
    var gy = function (cy) { return offY + 1 + 2 * cy; };

    var passable = grid(w, h, false);
    var visited = grid(cols, rows, false);

    var startCx = Math.floor(rng() * cols);
    var startCy = Math.floor(rng() * rows);
    visited[startCy][startCx] = true;
    passable[gy(startCy)][gx(startCx)] = true;

    var stack = [[startCx, startCy]];
    while (stack.length) {
      var top = stack[stack.length - 1];
      var cx = top[0], cy = top[1];

      var options = [];
      for (var d = 0; d < 4; d++) {
        var nx = cx + DIRS[d][0], ny = cy + DIRS[d][1];
        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !visited[ny][nx]) {
          options.push([nx, ny]);
        }
      }

      if (!options.length) { stack.pop(); continue; }

      var pick = options[Math.floor(rng() * options.length)];
      // прибрати стіну між поточною клітинкою і обраною
      passable[(gy(cy) + gy(pick[1])) / 2][(gx(cx) + gx(pick[0])) / 2] = true;
      passable[gy(pick[1])][gx(pick[0])] = true;
      visited[pick[1]][pick[0]] = true;
      stack.push(pick);
    }

    // ── Braiding: розшити частину тупиків у петлі ────────────────────
    for (var cy2 = 0; cy2 < rows; cy2++) {
      for (var cx2 = 0; cx2 < cols; cx2++) {
        var open = [], closed = [];
        for (var k = 0; k < 4; k++) {
          var tx = cx2 + DIRS[k][0], ty = cy2 + DIRS[k][1];
          if (tx < 0 || tx >= cols || ty < 0 || ty >= rows) continue;
          var wallX = (gx(cx2) + gx(tx)) / 2, wallY = (gy(cy2) + gy(ty)) / 2;
          (passable[wallY][wallX] ? open : closed).push([wallX, wallY]);
        }
        if (open.length === 1 && closed.length && rng() < params.braiding) {
          var c = closed[Math.floor(rng() * closed.length)];
          passable[c[1]][c[0]] = true;
        }
      }
    }

    carveAlcoves(passable, w, h, params.alcoves, rng);
    carveClearings(passable, w, h, params.clearings, rng);

    return { passable: passable, size: { w: w, h: h } };
  }

  function passableNeighbours(passable, w, h, x, y) {
    var n = 0;
    for (var d = 0; d < 4; d++) {
      var nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      if (passable[ny][nx]) n++;
    }
    return n;
  }

  // ── Ніші: одноклітинкові кишені збоку від коридору ──────────────────
  //
  // Клітинка-стіна, у якої рівно один прохідний сусід, стає прохідною.
  // Рівно один сусід — гарантія, що ніша лишається тупиком: вона не
  // з'єднує два коридори, не робить петлю і ніколи не лежить на шляху.
  // Саме тому в неї можна покласти скриню — її завжди можна обійти,
  // ціна заходу рівно 2 кроки (туди й назад).
  function carveAlcoves(passable, w, h, rate, rng) {
    if (!rate) return;
    var candidates = [];
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        if (!passable[y][x] && passableNeighbours(passable, w, h, x, y) === 1) {
          candidates.push([x, y]);
        }
      }
    }
    MapGen.shuffle(candidates, rng);
    var take = Math.round(candidates.length * rate);
    for (var i = 0; i < take; i++) {
      var c = candidates[i];
      // перевіряємо ще раз: сусідня ніша могла змінити картину
      if (passableNeighbours(passable, w, h, c[0], c[1]) === 1) {
        passable[c[1]][c[0]] = true;
      }
    }
  }

  // ── Галявини: відкриті майданчики 2×2 ───────────────────────────────
  //
  // Блок робиться прохідним цілком. Умова — щонайменше одна клітинка
  // блоку вже прохідна, тобто галявина гарантовано приєднана до карти.
  // Дає простір, де предмет стоїть збоку, а не поперек дороги, і трохи
  // розбиває монотонність коридорів.
  function carveClearings(passable, w, h, count, rng) {
    var placed = 0, attempts = 0;
    while (placed < count && attempts < count * 60) {
      attempts++;
      var x = 1 + Math.floor(rng() * (w - 3));
      var y = 1 + Math.floor(rng() * (h - 3));
      var touches = 0;
      for (var dy = 0; dy < 2; dy++) {
        for (var dx = 0; dx < 2; dx++) if (passable[y + dy][x + dx]) touches++;
      }
      if (touches === 0 || touches === 4) continue;
      for (var by = 0; by < 2; by++) {
        for (var bx = 0; bx < 2; bx++) passable[y + by][x + bx] = true;
      }
      placed++;
    }
  }

  // ── Старт і фініш ───────────────────────────────────────────────────
  //
  // Пара сусідніх прохідних клітинок: старт — найближче до лівого
  // верхнього кута, фініш — до правого нижнього.
  function findPair(passable, w, h, corner) {
    var best = null, bestScore = null;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        if (!passable[y][x]) continue;
        for (var d = 0; d < 4; d++) {
          var nx = x + DIRS[d][0], ny = y + DIRS[d][1];
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          if (!passable[ny][nx]) continue;
          var score = corner === 'tl' ? (x + y + nx + ny) : -(x + y + nx + ny);
          if (bestScore === null || score < bestScore) {
            bestScore = score;
            best = [{ x: x, y: y }, { x: nx, y: ny }];
          }
        }
      }
    }
    return best;
  }

  // ── BFS: зв'язність, довжина шляху, сам шлях ────────────────────────
  function bfs(passable, w, h, from) {
    var dist = grid(w, h, -1);
    var prev = grid(w, h, null);
    dist[from.y][from.x] = 0;
    var queue = [from], head = 0, reached = 1;
    while (head < queue.length) {
      var cur = queue[head++];
      for (var d = 0; d < 4; d++) {
        var nx = cur.x + DIRS[d][0], ny = cur.y + DIRS[d][1];
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        if (!passable[ny][nx] || dist[ny][nx] !== -1) continue;
        dist[ny][nx] = dist[cur.y][cur.x] + 1;
        prev[ny][nx] = cur;
        queue.push({ x: nx, y: ny });
        reached++;
      }
    }
    return { dist: dist, prev: prev, reached: reached };
  }

  function countPassable(passable, w, h) {
    var n = 0;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (passable[y][x]) n++;
    return n;
  }

  function tracePath(prev, from, to) {
    var path = [], cur = to;
    while (cur) {
      path.push({ x: cur.x, y: cur.y });
      if (cur.x === from.x && cur.y === from.y) break;
      cur = prev[cur.y][cur.x];
    }
    return path.reverse();
  }

  // ── Публічне: зібрати світ, ретраячи seed поки гарантії не виконані ──
  MapGen.buildWorld = function (userParams) {
    var params = {};
    for (var key in MapGen.DEFAULT_PARAMS) params[key] = MapGen.DEFAULT_PARAMS[key];
    for (var k2 in userParams) if (userParams[k2] !== undefined) params[k2] = userParams[k2];

    var seed = params.seed >>> 0;
    var rejected = [];

    for (var attempt = 0; attempt < params.maxAttempts; attempt++) {
      var usedSeed = (seed + attempt) >>> 0;
      var carved = carveOnce(params, usedSeed);
      if (!carved) return { error: 'Замала карта: потрібно щонайменше 5 × 5.' };

      var w = params.width, h = params.height, passable = carved.passable;
      var start = findPair(passable, w, h, 'tl');
      var finish = findPair(passable, w, h, 'br');
      if (!start || !finish) { rejected.push('немає місця під старт/фініш'); continue; }

      var search = bfs(passable, w, h, start[0]);

      if (search.reached !== countPassable(passable, w, h)) {
        rejected.push('ізольовані зони'); continue;
      }
      var pathLength = search.dist[finish[0].y][finish[0].x];
      if (pathLength < params.minPathLength) {
        rejected.push('шлях ' + pathLength); continue;
      }

      return MapGen.makeWorld({
        size: { w: w, h: h },
        passable: passable,
        start: start,
        finish: finish,
        path: tracePath(search.prev, start[0], finish[0]),
        meta: {
          seed: seed,
          usedSeed: usedSeed,
          params: {
            width: params.width, height: params.height,
            minPathLength: params.minPathLength, braiding: params.braiding,
            alcoves: params.alcoves, clearings: params.clearings,
          },
          pathLength: pathLength,
          attempts: attempt + 1,
          generator: 'world-v1',
        },
      });
    }

    return {
      error: 'Не вдалось за ' + params.maxAttempts + ' спроб. Останні відмови: ' +
             rejected.slice(-5).join(', ') + '. Спробуй меншу minPathLength або більшу карту.',
    };
  };

  // ── Обгортка world з помічниками (вони не серіалізуються) ───────────
  MapGen.makeWorld = function (base) {
    var world = base;
    var hash = MapGen.makeHash(base.meta.usedSeed);

    world.outsideTerrain = 'rock';
    world.terrain = null;
    world.props = [];

    world.isPassable = function (x, y) {
      var row = world.passable[y];
      return !!(row && row[x]);
    };

    // За межами карти не падає: зовнішній світ — «ще гори».
    world.at = function (x, y) {
      var inside = x >= 0 && x < world.size.w && y >= 0 && y < world.size.h;
      if (!inside) return { inside: false, passable: false, terrain: world.outsideTerrain };
      return {
        inside: true,
        passable: world.passable[y][x],
        terrain: world.terrain ? world.terrain[y][x] : null,
      };
    };

    world.hash = hash;
    world.rng = MapGen.makeRng(base.meta.usedSeed ^ 0x9e3779b9);

    return world;
  };

  // ── Крок 2: терен ───────────────────────────────────────────────────
  //
  // Поки заглушка: терен повторює прохідність. Тут потім з'являться
  // гори/ліс/вода/містки — назовні це не видно, контракт не змінюється.
  MapGen.scatterTerrain = function (world) {
    var t = [];
    for (var y = 0; y < world.size.h; y++) {
      var row = [];
      for (var x = 0; x < world.size.w; x++) {
        row.push(world.passable[y][x] ? 'grass' : 'rock');
      }
      t.push(row);
    }
    world.terrain = t;
    return world;
  };
})();
