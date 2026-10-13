// Рушій: стан гри і черга ходів. Правила — docs/04-dynamika.md.
//
// Хід: гравець вказує клітинку (мишкою або стрілками) → бачить шлях →
// Enter або клік → герой іде, скільки вистачає кроків. Кроки скінчились
// або натиснуто «Кінець ходу» — черга переходить до іншого героя.

(function () {
  'use strict';

  var STEP_MS = 180;   // скільки триває один крок фішки
  var view = Game.view, rules = Game.rules;
  var state = null;
  var setup = null;

  // Нова карта: шлях від старту до фінішу не довший за стільки клітинок —
  // інакше дитині задовго йти. Генератор сам не вміє «не довше», тому
  // перебираємо випадкові seed, поки не випаде відповідна.
  var NEW_MAP = { minPathLength: 25, maxPathLength: 45, tries: 40 };

  Game.engine = {
    // map — id готової карти (src/maps) або сам об'єкт карти.
    start: function (map, characterIds) {
      if (typeof map === 'string') map = Game.maps[map];
      setup = { map: map, characterIds: characterIds };
      state = {
        map: map,
        heroes: characterIds.map(function (id, i) {
          return { character: Game.characters[id], x: map.start[i].x, y: map.start[i].y };
        }),
        active: 0,          // 0 — дитина (герой 1), 1 — дорослий (герой 2)
        stepsLeft: 0,
        day: 1,
        cursor: null,       // клітинка, яку вказує гравець
        busy: false,        // фішка йде — ввід не приймаємо
        won: false,
      };
      state.stepsLeft = state.heroes[0].character.move;

      view.hideWin();
      Game.sound.music(true);
      view.build(state);
      view.setActive(0);
      view.toast('Ходить: ' + state.heroes[0].character.name);
    },

    // Та сама карта ще раз.
    restart: function () {
      this.start(setup.map, setup.characterIds);
    },

    // Свіжа карта з генератора.
    newGame: function () {
      if (state && state.busy) return;
      var map = generateMap();
      if (!map) { view.toast('Не вийшло зробити карту — спробуй ще'); return; }
      this.start(map, setup.characterIds);
    },

    state: function () { return state; },

    // Гравець вказав клітинку. Тільки показуємо план, нікуди не йдемо.
    point: function (cell) {
      if (state.busy || state.won) return;
      var vis = view.visible();
      state.cursor = {
        x: clamp(cell.x, vis.x0, vis.x1),
        y: clamp(cell.y, vis.y0, vis.y1),
      };
      view.showPlan(plan());
    },

    // Стрілки: зсуваємо вказану клітинку. Перше натискання — від героя.
    nudge: function (dx, dy) {
      var from = state.cursor || hero();
      this.point({ x: from.x + dx, y: from.y + dy });
    },

    // Enter або клік: іти до вказаної клітинки.
    go: function () {
      if (state.busy || state.won || !state.cursor) return;
      var p = plan();
      if (!p) return;

      if (!p.path) {
        var partner = state.heroes[1 - state.active];
        var withoutLeash = rules.findPath(state.map, hero(), state.cursor, partner, true);
        view.toast(withoutLeash ? 'Зачекай на друга — він далеко' : 'Сюди не дійти');
        return;
      }
      if (state.stepsLeft === 0) return;

      // Кроки скінчились на клітинці напарника — зупиняємось на крок раніше.
      var partnerAt = state.heroes[1 - state.active];
      var count = Math.min(state.stepsLeft, p.path.length - 1);
      while (count > 0 && p.path[count].x === partnerAt.x && p.path[count].y === partnerAt.y) count--;
      if (count === 0) { view.toast('Друг на дорозі — сходи іншим разом'); return; }
      view.showPlan(null);
      walk(p.path, 1, count);
    },

    endTurn: function () {
      if (state.busy || state.won) return;
      state.active = 1 - state.active;
      if (state.active === 0) state.day++;   // обидва сходили — новий день
      state.stepsLeft = hero().character.move;
      state.cursor = null;

      view.showPlan(null);
      view.setActive(state.active);
      view.hud(state);
      view.toast('Ходить: ' + hero().character.name);
    },
  };

  function hero() { return state.heroes[state.active]; }

  // План до вказаної клітинки: шлях (або null — не можна) і скільки кроків є.
  function plan() {
    var h = hero();
    var c = state.cursor;
    if (!c || (c.x === h.x && c.y === h.y)) return null;
    var partner = state.heroes[1 - state.active];
    return {
      target: c,
      path: rules.findPath(state.map, h, c, partner),
      steps: state.stepsLeft,
    };
  }

  // Іде по шляху крок за кроком: фішка ковзає, камера їде слідом.
  function walk(path, i, last) {
    state.busy = true;
    var h = hero();
    h.x = path[i].x;
    h.y = path[i].y;
    state.stepsLeft--;

    view.moveHero(state.active, h);
    view.camera(state);
    view.hud(state);

    setTimeout(function () {
      if (rules.isWon(state.map, state.heroes)) {
        state.busy = false;
        state.won = true;
        Game.sound.music(false);
        Game.sound.play('win');
        view.showWin(state);
        return;
      }
      if (i < last) { walk(path, i + 1, last); return; }

      state.busy = false;
      if (state.stepsLeft === 0) {
        var game = state;   // за 300 мс могли почати нову гру — тоді не чіпаємо
        setTimeout(function () { if (game === state) Game.engine.endTurn(); }, 300);
      } else {
        view.showPlan(plan());
      }
    }, STEP_MS);
  }

  function generateMap() {
    for (var i = 0; i < NEW_MAP.tries; i++) {
      var built = MapGen.buildWorld({
        seed: Math.floor(Math.random() * 1000000),
        minPathLength: NEW_MAP.minPathLength,
      });
      if (built.error || built.meta.pathLength > NEW_MAP.maxPathLength) continue;
      var world = MapGen.scatterTerrain(built);
      var map = MapGen.toMapData(world, MapGen.resolveTiles(world, 'autotile'), { id: 'random', resolver: 'autotile' });
      if (MapGen.validateMap(map, Game.images, Game.props).length) continue;
      return map;
    }
    return null;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
})();
