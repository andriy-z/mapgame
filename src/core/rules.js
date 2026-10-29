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
    // over — через що ще можна пройти (rules.over): 'any' — крильця, над
    // будь-чим у межах карти; 'water' — качечка, лише по воді.
    canPass: function (map, partner, x, y, ignoreLeash, over) {
      if (!Game.isPassable(map, x, y)) {
        if (!inside(map, x, y) || !over) return false;
        if (over !== 'any' && Game.terrainAt(map, x, y) !== over) return false;
      }
      if (ignoreLeash) return true;
      return Math.abs(partner.x - x) <= LEASH.x && Math.abs(partner.y - y) <= LEASH.y;
    },

    // Чи може стояти: як пройти, але не на клітинці напарника і тільки на
    // прохідній — над водою чи горою не зупинишся, ні з крильцями, ні з качечкою.
    canStand: function (map, partner, x, y, ignoreLeash) {
      if (partner.x === x && partner.y === y) return false;
      return this.canPass(map, partner, x, y, ignoreLeash, null);
    },

    // Через що непрохідне герой може пройти завдяки артефакту: 'any'
    // (крильця), назва терену — 'water' (качечка), або null.
    over: function (hero) {
      var art = this.overArtifact(hero);
      return art ? art.over : null;
    },

    // Сам артефакт, з яким можна пройти через непрохідне (у нього й
    // підказка noSteps: «Не вистачить кроків, щоб перелетіти»), або null.
    overArtifact: function (hero) {
      var id = hero.artifacts.filter(function (a) { return Game.artifacts[a].over; })[0];
      return id ? Game.artifacts[id] : null;
    },

    // Чи чхне герой на цьому кроці (перчинка). Повертає, на скільки
    // клітинок підкине чих, або 0 — не чхнув.
    sneeze: function (hero) {
      var id = hero.artifacts.filter(function (a) { return Game.artifacts[a].sneeze; })[0];
      var art = id && Game.artifacts[id];
      return art && Math.random() < art.sneeze ? art.hop : 0;
    },

    // Куди підкине чих: на hop клітинок уперед (dx, dy) — у повітрі над
    // будь-чим, — а якщо там не стати, то ближче. null — нікуди.
    sneezeTo: function (map, hero, partner, dx, dy, hop) {
      for (var n = hop; n > 0; n--) {
        var x = hero.x + dx * n, y = hero.y + dy * n;
        if (this.canStand(map, partner, x, y, false)) return { x: x, y: y };
      }
      return null;
    },

    // Чи біпнуть антенки на початку ходу. Повертає, скільки кроків
    // додали, або 0 — не біпнули.
    beep: function (hero) {
      var id = hero.artifacts.filter(function (a) { return Game.artifacts[a].beep; })[0];
      var art = id && Game.artifacts[id];
      return art && Math.random() < art.beep ? art.bonusSteps : 0;
    },

    // Скільки кроків у героя за хід: свої плюс від артефактів (чоботи +2, кінь-палка +3).
    moves: function (hero) {
      return hero.artifacts.reduce(function (n, id) {
        return n + (Game.artifacts[id].steps || 0);
      }, hero.character.move);
    },

    // На скільки клітинок далі герой бачить крізь туман завдяки
    // артефактам (підзорна труба +2).
    sight: function (hero) {
      return hero.artifacts.reduce(function (n, id) {
        return n + (Game.artifacts[id].sight || 0);
      }, 0);
    },

    // Дати героєві артефакт. На фішці — лише один артефакт: новий замінює
    // старий (взяв чоботи — крильця зникли). Повертає id старого або null.
    equip: function (hero, id) {
      var old = hero.artifacts[0] || null;
      hero.artifacts = [id];
      return old === id ? null : old;
    },

    // Найкоротший шлях від героя до цілі (пошук у ширину). Ціль — клітинка,
    // де можна стояти; дорога — клітинки, через які можна пройти. Повертає
    // масив клітинок від старту до цілі включно або null, якщо дійти не можна.
    // seen — таблиця [y][x] відкритих клітинок (туман): тоді шлях іде лише
    // ними. Без seen — по всій карті.
    findPath: function (map, from, to, partner, ignoreLeash, over, seen) {
      var rules = this;
      if (!rules.canStand(map, partner, to.x, to.y, ignoreLeash)) return null;
      if (seen && !seen[to.y][to.x]) return null;

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
          if (!rules.canPass(map, partner, nx, ny, ignoreLeash, over)) continue;
          if (seen && !seen[ny][nx]) continue;
          cameFrom[key] = cell.y * w + cell.x;
          queue.push({ x: nx, y: ny });
        }
      }
      return null;
    },

    // Де стоять точки-завдання: рівномірно вздовж найкоротшого шляху від
    // старту до фінішу — так дитина точно їх зустріне. Не біля самого
    // старту й не на фініші.
    placeTasks: function (map, count) {
      var nobody = { x: -99, y: -99 };
      var path = this.findPath(map, map.start[0], map.finish[0], nobody, true) || [];
      var from = 4, to = path.length - 3;
      var tasks = [];
      for (var i = 1; i <= count && to > from; i++) {
        var cell = path[Math.round(from + (to - from) * i / (count + 1))];
        var taken = map.start.concat(map.finish).some(function (c) { return c.x === cell.x && c.y === cell.y; });
        if (!taken) tasks.push({ x: cell.x, y: cell.y, done: false });
      }
      return tasks;
    },

    // Де стоять бонусні завдання: не на дорозі, а збоку — у глухих кутах і
    // відгалуженнях, куди цікаво зазирнути. Що далі від основного шляху і
    // що глухіший кут, то краще; між собою — не ближче за SPREAD клітинок.
    // avoid — клітинки, які вже зайняті (старт, фініш, завдання на дорозі).
    placeBonuses: function (map, count, avoid) {
      var SPREAD = 6;
      var nobody = { x: -99, y: -99 };
      var main = this.findPath(map, map.start[0], map.finish[0], nobody, true) || [];
      var w = map.size.w;

      // відстань кожної клітинки від основного шляху (пошук у ширину від нього)
      var aside = {};
      var queue = main.slice();
      main.forEach(function (c) { aside[c.y * w + c.x] = 0; });
      while (queue.length) {
        var c = queue.shift();
        for (var d = 0; d < 4; d++) {
          var nx = c.x + DIRS[d][0], ny = c.y + DIRS[d][1], key = ny * w + nx;
          if (key in aside || !Game.isPassable(map, nx, ny)) continue;
          aside[key] = aside[c.y * w + c.x] + 1;
          queue.push({ x: nx, y: ny });
        }
      }

      var taken = map.start.concat(map.finish, avoid || []);
      var spots = [];
      Object.keys(aside).forEach(function (k) {
        var x = k % w, y = Math.floor(k / w), dist = aside[k];
        if (!dist) return;
        if (taken.some(function (t) { return Math.abs(t.x - x) + Math.abs(t.y - y) < 2; })) return;
        var exits = DIRS.filter(function (dd) { return Game.isPassable(map, x + dd[0], y + dd[1]); }).length;
        spots.push({ x: x, y: y, score: Math.min(dist, 5) + (exits === 1 ? 3 : 0) + Math.random() });
      });
      spots.sort(function (a, b) { return b.score - a.score; });

      var chosen = [];
      for (var i = 0; i < spots.length && chosen.length < count; i++) {
        var s = spots[i];
        var near = chosen.some(function (p) { return Math.abs(p.x - s.x) + Math.abs(p.y - s.y) < SPREAD; });
        if (!near) chosen.push({ x: s.x, y: s.y, done: false });
      }
      return chosen;
    },

    // Клітинки карти в колі радіуса r навколо (x, y) — що видно героєві
    // крізь туман. Коло, а не квадрат: так межа туману кругленька.
    around: function (map, x, y, r) {
      var cells = [];
      for (var yy = y - r; yy <= y + r; yy++) {
        for (var xx = x - r; xx <= x + r; xx++) {
          var dx = xx - x, dy = yy - y;
          if (inside(map, xx, yy) && dx * dx + dy * dy <= r * r + 1) cells.push({ x: xx, y: yy });
        }
      }
      return cells;
    },

    // Скільки кроків від кожної клітинки до найближчої з цілей (from —
    // масив клітинок), прохідними клітинками, без правила «друг на екрані».
    // Таблиця [y][x]; undefined — звідти не дійти.
    distances: function (map, from) {
      var dist = map.passable.map(function () { return []; });
      var queue = from.slice();
      from.forEach(function (c) { dist[c.y][c.x] = 0; });
      while (queue.length) {
        var c = queue.shift();
        for (var d = 0; d < 4; d++) {
          var nx = c.x + DIRS[d][0], ny = c.y + DIRS[d][1];
          if (!Game.isPassable(map, nx, ny) || dist[ny][nx] !== undefined) continue;
          dist[ny][nx] = dist[c.y][c.x] + 1;
          queue.push({ x: nx, y: ny });
        }
      }
      return dist;
    },

    // Обидва герої на фініші?
    isWon: function (map, heroes) {
      return heroes.every(function (hero) {
        return map.finish.some(function (f) { return f.x === hero.x && f.y === hero.y; });
      });
    },
  };

  function inside(map, x, y) {
    return x >= 0 && y >= 0 && x < map.size.w && y < map.size.h;
  }

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
