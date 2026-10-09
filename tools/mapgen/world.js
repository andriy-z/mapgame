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
    terrainScale: 40,
    forest: 0.45,
    mountain: 0.35,
    water: 0.20,
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
  // Кути сітки для цього не годяться: старт завжди в лівому верхньому,
  // фініш у правому нижньому — і напрямок руху відомий ще до першого
  // ходу, іди по діагоналі вниз-праворуч. Тому обидві точки шукаємо по
  // відстанях у самому лабіринті, а не по кутах сітки.
  //
  // 1. З випадкової клітинки BFS → найдальша від неї. Це кінець
  //    «діаметра» лабіринту: закуток на околиці, але з якого боку карти —
  //    вирішує seed. Це старт.
  // 2. BFS зі старту → фініш беремо ВИПАДКОВО серед клітинок, не ближчих
  //    за поріг. Саме випадково, а не найдальшу: найдальша від старту так
  //    само однозначна, як і кут, тільки складніше порахувати.
  //
  // Поріг — не менший за minPathLength (це гарантія 2) і не менший за
  // 80 % діаметра (щоб фініш не опинявся десь посередині дороги).
  function pickEndpoints(passable, w, h, rng, minPathLength) {
    var cells = [];
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        if (passable[y][x] && passableNeighbours(passable, w, h, x, y) > 0) {
          cells.push({ x: x, y: y });
        }
      }
    }
    if (cells.length < 2) return null;

    var probe = cells[Math.floor(rng() * cells.length)];
    var startCell = farthest(bfs(passable, w, h, probe).dist, cells, rng);
    if (!startCell) return null;

    var search = bfs(passable, w, h, startCell);
    var maxDist = 0;
    cells.forEach(function (c) {
      if (search.dist[c.y][c.x] > maxDist) maxDist = search.dist[c.y][c.x];
    });

    // Нижня межа 4 — щоб пари старту й фінішу не злиплись, якщо
    // minPathLength поставили зовсім малий.
    var threshold = Math.max(minPathLength, 4, Math.floor(maxDist * 0.8));
    var far = cells.filter(function (c) { return search.dist[c.y][c.x] >= threshold; });
    if (!far.length) return null;

    var finishCell = far[Math.floor(rng() * far.length)];

    return {
      start: withNeighbour(passable, w, h, startCell, rng, null),
      finish: withNeighbour(passable, w, h, finishCell, rng, search.dist),
      search: search,
      pathLength: search.dist[finishCell.y][finishCell.x],
    };
  }

  // Найдальші клітинки від точки BFS; якщо їх кілька — випадкова з них.
  function farthest(dist, cells, rng) {
    var best = [], bestD = -1;
    for (var i = 0; i < cells.length; i++) {
      var d = dist[cells[i].y][cells[i].x];
      if (d < 0) continue;
      if (d > bestD) { bestD = d; best = [cells[i]]; }
      else if (d === bestD) best.push(cells[i]);
    }
    if (!best.length) return null;
    return best[Math.floor(rng() * best.length)];
  }

  // Друга клітинка пари — сусідня прохідна. Для фінішу беремо ту, що
  // далі від старту: обидві клітинки фінішу мають бути «у фініші»,
  // а не одна з них за крок назад по дорозі.
  function withNeighbour(passable, w, h, cell, rng, dist) {
    var options = [];
    for (var d = 0; d < 4; d++) {
      var nx = cell.x + DIRS[d][0], ny = cell.y + DIRS[d][1];
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      if (passable[ny][nx]) options.push({ x: nx, y: ny });
    }
    if (!options.length) return null;
    var mate;
    if (dist) {
      mate = options[0];
      options.forEach(function (o) { if (dist[o.y][o.x] > dist[mate.y][mate.x]) mate = o; });
    } else {
      mate = options[Math.floor(rng() * options.length)];
    }
    return [{ x: cell.x, y: cell.y }, mate];
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

      // Окремий потік випадковості: копання лабіринту й вибір точок не
      // мають зсувати одне одному послідовність.
      var pickRng = MapGen.makeRng((usedSeed ^ 0x2545f491) >>> 0);
      var picked = pickEndpoints(passable, w, h, pickRng, params.minPathLength);
      if (!picked || !picked.start || !picked.finish) {
        rejected.push('немає місця під старт/фініш'); continue;
      }

      var start = picked.start, finish = picked.finish, search = picked.search;

      if (search.reached !== countPassable(passable, w, h)) {
        rejected.push('ізольовані зони'); continue;
      }
      var pathLength = picked.pathLength;
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
            terrainScale: params.terrainScale, forest: params.forest,
            mountain: params.mountain, water: params.water,
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

    world.outsideTerrain = 'mountain';
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
  // Прохідні клітинки — трава. Непрохідні треба чимось заповнити: ліс, гори,
  // вода. Кидаємо по карті кілька центрів зон, кожному даємо терен за вагами,
  // і клітинка бере терен найближчого центру. Так виходять суцільні масиви,
  // а не сіль-перець.
  //
  // Дві дрібниці роблять межі живими: відстань трохи зашумлена (щоб зони не
  // різались по лінійці) і потім один прохід згладжування (щоб від того шуму
  // не лишилось поодиноких крапок чужого терену).
  //
  // На прохідність це не впливає ніяк. Терен — внутрішня річ генератора,
  // у контракт шару 1 він не потрапляє: назовні йдуть тільки id картинок.
  MapGen.scatterTerrain = function (world) {
    var w = world.size.w, h = world.size.h;
    var p = world.meta.params;
    var rng = MapGen.makeRng((world.meta.usedSeed ^ 0x5bf03635) >>> 0);

    var weights = [];
    ['forest', 'mountain', 'water'].forEach(function (name) {
      if (p[name] > 0) weights.push([name, p[name]]);
    });
    if (!weights.length) weights.push(['mountain', 1]);

    var total = 0;
    weights.forEach(function (pair) { total += pair[1]; });

    function pickTerrain() {
      var r = rng() * total;
      for (var i = 0; i < weights.length; i++) {
        r -= weights[i][1];
        if (r <= 0) return weights[i][0];
      }
      return weights[weights.length - 1][0];
    }

    var count = Math.max(3, Math.round((w * h) / Math.max(4, p.terrainScale)));

    // Терени роздаємо зонам за вагами, а не кидаємо кубик кожній окремо:
    // на десятку зон незалежний розіграш легко дає карту зовсім без води.
    var quota = [];
    weights.forEach(function (pair) {
      var n = Math.floor(count * pair[1] / total);
      for (var i = 0; i < n; i++) quota.push(pair[0]);
    });
    while (quota.length < count) quota.push(pickTerrain());
    MapGen.shuffle(quota, rng);

    var seeds = [];
    for (var i = 0; i < count; i++) {
      seeds.push({ x: rng() * w, y: rng() * h, terrain: quota[i] });
    }

    function nearest(x, y) {
      var best = seeds[0].terrain, bestD = Infinity;
      for (var i = 0; i < seeds.length; i++) {
        var dx = x + 0.5 - seeds[i].x, dy = y + 0.5 - seeds[i].y;
        // Шум залежить від позиції, а не від порядку обходу: та сама карта
        // з тим самим seed дає ті самі межі.
        var noise = ((world.hash(x, y) ^ (i * 2654435761)) >>> 0) / 4294967296;
        var d = (dx * dx + dy * dy) * (0.88 + 0.24 * noise);
        if (d < bestD) { bestD = d; best = seeds[i].terrain; }
      }
      return best;
    }

    var terrain = [];
    for (var y = 0; y < h; y++) {
      var row = [];
      for (var x = 0; x < w; x++) {
        row.push(world.passable[y][x] ? 'grass' : nearest(x, y));
      }
      terrain.push(row);
    }

    world.terrain = smoothTerrain(world, terrain);
    return world;
  };

  // Клітинка, у якої три чи чотири непрохідні сусіди одного чужого терену,
  // переходить до них. Один прохід — рівно щоб зняти крапки на межах.
  function smoothTerrain(world, terrain) {
    var w = world.size.w, h = world.size.h;
    var next = [];
    for (var y = 0; y < h; y++) next.push(terrain[y].slice());

    for (y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        if (world.passable[y][x]) continue;
        var tally = {};
        for (var d = 0; d < 4; d++) {
          var nx = x + DIRS[d][0], ny = y + DIRS[d][1];
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          if (world.passable[ny][nx]) continue;
          var t = terrain[ny][nx];
          tally[t] = (tally[t] || 0) + 1;
        }
        for (var key in tally) {
          if (tally[key] >= 3 && key !== terrain[y][x]) next[y][x] = key;
        }
      }
    }
    return next;
  }

})();
