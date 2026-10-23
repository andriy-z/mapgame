// Рушій: стан гри і черга ходів. Правила — docs/04-dynamika.md.
//
// Хід: гравець вказує клітинку (мишкою або стрілками) → бачить шлях →
// Enter або клік → герой іде, скільки вистачає кроків. Кроки скінчились
// або натиснуто «Кінець ходу» — черга переходить до іншого героя.

(function () {
  'use strict';

  var STEP_MS = 180;   // скільки триває один крок фішки
  var FLY_MS = 1200;   // політ на кульці чи на музику (разові бонуси)
  var SNEEZE_MS = 500; // підскок від чиху (перчинка)

  // Туман: карту видно лише навколо героїв, решта — під хмаринками і
  // відкривається, коли підходиш (docs/04-dynamika.md, «Туман»).
  // radius — скільки клітинок видно навколо героя; finish — скільки
  // навколо фінішу видно з самого початку (щоб знати, куди йти);
  // balloon — з висоти кульки видно далі. on: false — без туману.
  var FOG = { on: true, radius: 3, finish: 1, balloon: 5 };
  var view = Game.view, rules = Game.rules;
  var state = null;
  var setup = null;

  // Нова карта: шлях від старту до фінішу не довший за стільки клітинок —
  // інакше дитині задовго йти. Генератор сам не вміє «не довше», тому
  // перебираємо випадкові seed, поки не випаде відповідна.
  var NEW_MAP = { minPathLength: 25, maxPathLength: 45, tries: 40 };

  // Скільки точок-завдань на карті і які завдання вони дають — по черзі,
  // з якого почати, вирішує випадок.
  var TASKS = { count: 3, types: ['read-word', 'build-word', 'find-picture', 'spot-word', 'count'] };

  // Бонусні завдання — збоку від дороги, за кожне — приз. Артефакти
  // (крильця, чоботи, качечка, ходулі, санчата, перчинка) і разові
  // (кулька, гармошка) — по одному на карту (з двома крильцями обоє героїв
  // просто перелетіли б лабіринт), аватарки — різні, і не ті, з якими
  // герої почали. Місць збоку зазвичай менше, ніж призів, — тоді на карту
  // потрапляють випадкові, щоразу інші.
  var BONUSES = ['wings', 'boots', 'duck', 'stilts', 'sled', 'pepper', 'balloon', 'harmonica', 'look', 'look'];

  // Телепорт у космос: стаєш — і герой сам-один летить на маленький рівень
  // з квестом (src/quests/), друг чекає. Пройшов — приз, назад на те саме
  // місце, і хід переходить до друга. Телепорт разовий. Скільки їх на карті,
  // які квести і призи — випадково з цих списків.
  var TELEPORT = { count: 1, quests: ['dark-room'], prizes: ['telescope', 'hoverboard', 'antennae'] };

  // Завдання на дорозі й бонусні: [{x, y, type, done, prize}], prize —
  // null (книжка) або { bonus, avatar? }. Телепорт — те саме, але з quest
  // (id квесту) замість type.
  function placeTasks(map, heroes) {
    var onRoad = rules.placeTasks(map, TASKS.count);
    var aside = rules.placeBonuses(map, BONUSES.length, onRoad);

    var worn = heroes.map(function (h) { return h.look; });
    var looks = Game.task.shuffle(Object.keys(Game.avatars).filter(function (id) {
      return Game.avatars[id].bonus && worn.indexOf(id) < 0;
    }));
    var prizes = [];
    BONUSES.forEach(function (bonus) {
      if (bonus === 'look') {
        if (looks.length) prizes.push({ bonus: 'look', avatar: looks.pop() });
      } else {
        prizes.push({ bonus: bonus });
      }
    });
    Game.task.shuffle(aside);
    Game.task.shuffle(prizes);   // місць збоку може знайтись менше — тоді випадає випадковий приз

    var first = Math.floor(Math.random() * TASKS.types.length);
    var tasks = onRoad.concat(aside.slice(0, prizes.length)).map(function (t, i) {
      t.type = TASKS.types[(first + i) % TASKS.types.length];
      t.prize = i < onRoad.length ? null : prizes[i - onRoad.length];
      return t;
    });

    // телепорти — теж збоку, подалі від книжок і призів
    var portals = rules.placeBonuses(map, TELEPORT.count, tasks).map(function (t) {
      t.quest = pick(TELEPORT.quests);
      t.prize = { bonus: pick(TELEPORT.prizes) };
      return t;
    });
    return tasks.concat(portals);
  }

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  Game.engine = {
    // map — id готової карти (src/maps) або сам об'єкт карти.
    start: function (map, characterIds) {
      if (typeof map === 'string') map = Game.maps[map];
      setup = { map: map, characterIds: characterIds };
      state = {
        map: map,
        heroes: characterIds.map(function (id, i) {
          var c = Game.characters[id];
          return {
            character: c,
            look: c.avatar,     // аватарка зараз (бонус «зміна лука» міняє)
            artifacts: [],      // id артефакту на фішці (крильця або чоботи)
            stars: 0,           // скільки завдань розв'язав — зірки над фішкою
            x: map.start[i].x, y: map.start[i].y,
          };
        }),
        tasks: null,
        active: 0,          // 0 — дитина (герой 1), 1 — дорослий (герой 2)
        stepsLeft: 0,
        day: 1,
        cursor: null,       // клітинка, яку вказує гравець
        busy: false,        // фішка йде — ввід не приймаємо
        sneezed: false,     // перчинка вже чхнула цього ходу
        seen: null,         // туман: [y][x] true — клітинку вже відкрили
        won: false,
      };
      state.tasks = placeTasks(map, state.heroes);
      state.seen = map.passable.map(function (row) {
        return row.map(function () { return !FOG.on; });
      });
      reveal(map.finish[0], FOG.finish, true);
      state.heroes.forEach(function (h) { reveal(h, sight(h), true); });
      state.stepsLeft = rules.moves(state.heroes[0]);

      view.hideWin();
      Game.sound.music(true);
      view.build(state);
      view.setActive(0);
      view.toast('Ходить: ' + name(state.heroes[0]));
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
        if (p.fog) { view.toast('Там хмаринки — підійди ближче'); return; }
        var withoutLeash = rules.findPath(state.map, hero(), state.cursor, partner, true, rules.over(hero()), state.seen);
        view.toast(withoutLeash ? 'Зачекай на друга — він далеко' : 'Сюди не дійти');
        return;
      }
      if (state.stepsLeft === 0) return;

      // Кроки скінчились на клітинці напарника чи в повітрі (над водою, горою) —
      // зупиняємось раніше, там, де можна стати.
      var partnerAt = state.heroes[1 - state.active];
      var count = Math.min(state.stepsLeft, p.path.length - 1);
      while (count > 0 && !rules.canStand(state.map, partnerAt, p.path[count].x, p.path[count].y, true)) count--;
      if (count === 0) {
        var c = p.path[Math.min(state.stepsLeft, p.path.length - 1)];
        view.toast(Game.isPassable(state.map, c.x, c.y)
          ? 'Друг на дорозі — сходи іншим разом'
          : (rules.overArtifact(hero()) || {}).noSteps || 'Сюди не дійти');
        return;
      }
      view.showPlan(null);
      walk(p.path, 1, count);
    },

    endTurn: function () {
      if (state.busy || state.won) return;
      state.active = 1 - state.active;
      if (state.active === 0) state.day++;   // обидва сходили — новий день
      state.stepsLeft = rules.moves(hero());
      state.sneezed = false;   // перчинка чхає не частіше разу за хід
      state.cursor = null;
      var beep = rules.beep(hero());   // антенки іноді дарують кроки
      state.stepsLeft += beep;

      view.showPlan(null);
      view.setActive(state.active);
      view.hud(state);
      if (!beep) { view.toast('Ходить: ' + name(hero())); return; }
      Game.sound.play('beep');
      view.say(state.active, 'біп-біп!', 1400);
      view.toast('Ходить: ' + name(hero()) + '. Біп-біп! Ще ' + beep + ' кроки', 2400);
    },
  };

  function hero() { return state.heroes[state.active]; }

  // Скільки клітинок навколо героя видно крізь туман (з підзорною трубою — далі).
  function sight(h) { return FOG.radius + rules.sight(h); }

  function name(h) { return Game.avatars[h.look].name; }

  // План до вказаної клітинки: шлях (або null — не можна) і скільки кроків є.
  function plan() {
    var h = hero();
    var c = state.cursor;
    if (!c || (c.x === h.x && c.y === h.y)) return null;
    var partner = state.heroes[1 - state.active];
    return {
      target: c,
      path: rules.findPath(state.map, h, c, partner, false, rules.over(h), state.seen),
      steps: state.stepsLeft,
      fog: !state.seen[c.y][c.x],   // вказав у хмаринки
    };
  }

  // Туман: відкрити клітинки в колі радіуса r навколо cell. silent —
  // на старті, ще до побудови карти (view.build сам не намалює відкрите).
  function reveal(cell, r, silent) {
    var opened = rules.around(state.map, cell.x, cell.y, r).filter(function (c) {
      if (state.seen[c.y][c.x]) return false;
      state.seen[c.y][c.x] = true;
      return true;
    });
    if (!silent && opened.length) view.reveal(opened);
  }

  // Іде по шляху крок за кроком: фішка ковзає, камера їде слідом.
  function walk(path, i, last) {
    state.busy = true;
    var h = hero();
    h.x = path[i].x;
    h.y = path[i].y;
    state.stepsLeft--;

    view.moveHero(state.active, h);
    reveal(h, sight(h));
    view.camera(state);
    view.hud(state);

    setTimeout(function () {
      arrive(function () {
        if (sneeze(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y)) return;
        if (i < last) { walk(path, i + 1, last); return; }
        stop();
      });
    }, STEP_MS);
  }

  // Герой став на клітинку: фініш? завдання? Якщо ні — next().
  function arrive(next) {
    if (checkWin()) return;
    var task = taskAt(hero());
    if (task) { openTask(task); return; }
    next();
  }

  function checkWin() {
    if (!rules.isWon(state.map, state.heroes)) return false;
    state.busy = false;
    state.won = true;
    Game.sound.music(false);
    Game.sound.play('win');
    view.showWin(state);
    return true;
  }

  // Наступив на точку-завдання — хода зупиняється, кроки, що лишились,
  // не згорають. Розв'язав — точка зникає; закрив — лишається.
  function openTask(task) {
    if (task.quest) { openQuest(task); return; }
    var h = hero();
    Game.task.open(task.type, function (solved) {
      if (!solved) { stop(); return; }
      task.done = true;
      h.stars++;          // за кожне розв'язане завдання — зірка над фішкою
      view.removeTask(task);
      Game.sound.play('bonus');
      if (!task.prize) {
        view.toast('Молодець! Ось тобі зірка');
        view.updateHero(state.active, h);
        view.hud(state);
        stop();
        return;
      }
      // чоботи діють одразу: кроки цього ходу теж +3 (і навпаки —
      // проміняв чоботи на крильця, то й кроків менше)
      var bonus = Game.bonuses[task.prize.bonus];
      var before = rules.moves(h);
      view.toast(bonus.give(h, task.prize), 2200);
      state.stepsLeft = Math.max(0, state.stepsLeft + rules.moves(h) - before);
      view.updateHero(state.active, h);
      view.hud(state);
      if (!bonus.act) { stop(); return; }
      // разовий бонус (кулька, гармошка): спершу дати прочитати, що це, тоді діяти
      setTimeout(function () {
        bonus.act(actions(), function () { if (!checkWin()) stop(); });
      }, 900);
    });
  }

  // Телепорт: герой летить у космос на квест (src/core/quest.js), друг
  // чекає. Пройшов — зірка, приз, і хід переходить до друга (космос забирає
  // весь хід). Повернувся сам (✕) — телепорт лишається, кроки теж.
  function openQuest(task) {
    var h = hero(), index = state.active, game = state;
    view.showPlan(null);
    view.setAway(index, true);
    Game.quest.open(task.quest, h, index, task.prize, function (solved) {
      view.setAway(index, false);
      if (!solved) { stop(); return; }
      task.done = true;
      h.stars++;
      view.removeTask(task);
      Game.sound.play('bonus');
      var bonus = Game.bonuses[task.prize.bonus];
      view.toast(bonus.give(h, task.prize), 2600);
      reveal(h, sight(h));   // з підзорною трубою — одразу видно далі
      state.stepsLeft = 0;
      view.updateHero(index, h);
      view.hud(state);
      var next = function () {
        setTimeout(function () {
          if (game !== state || checkWin()) return;
          state.busy = false;
          Game.engine.endTurn();
        }, 2600);   // дати прочитати, що за приз
      };
      if (!bonus.act) { next(); return; }
      setTimeout(function () { bonus.act(actions(), next); }, 900);
    });
  }

  // Що разовий бонус може робити з грою (bonus.act). Див. src/bonuses/balloon.js.
  function actions() {
    return {
      map: state.map,
      index: state.active,               // хто отримав приз
      hero: hero(),
      partner: state.heroes[1 - state.active],
      taskAt: function (x, y) { return taskAt({ x: x, y: y }); },
      toast: function (text) { view.toast(text, 2200); },
      // перенести героя index на клітинку to по повітрю; carrier — що
      // летить разом з ним: { image } (кулька) або { text } (ноти).
      // far: true — з висоти видно далі (кулька розганяє більше туману).
      fly: function (index, to, carrier, done, far) {
        var h = state.heroes[index];
        h.x = to.x;
        h.y = to.y;
        reveal(h, (far ? FOG.balloon : FOG.radius) + rules.sight(h));
        view.fly(index, h, carrier, FLY_MS);
        view.camera(state);
        setTimeout(done, FLY_MS);
      },
    };
  }

  // Перчинка: може чхнути після кроку (dx, dy — куди йшов). Чхнув і
  // підлетів — хода зупиняється (true); кроки чих не забирає.
  function sneeze(dx, dy) {
    if (state.sneezed) return false;
    var h = hero();
    var hop = rules.sneeze(h);
    if (!hop) return false;
    state.sneezed = true;
    Game.sound.play('sneeze');
    var to = rules.sneezeTo(state.map, h, state.heroes[1 - state.active], dx, dy, hop);
    if (!to) { view.toast('Апчхи! Будь здоровий!'); return false; }
    view.toast('А-а-апчхи!');
    h.x = to.x;
    h.y = to.y;
    reveal(h, sight(h));
    view.fly(state.active, h, { text: 'апчхи!' }, SNEEZE_MS);
    view.camera(state);
    setTimeout(function () { arrive(stop); }, SNEEZE_MS);
    return true;
  }

  // Хода скінчилась: далі той самий герой, або — якщо кроків нема — інший.
  function stop() {
    state.busy = false;
    if (state.stepsLeft === 0) {
      var game = state;   // за 300 мс могли почати нову гру — тоді не чіпаємо
      setTimeout(function () { if (game === state) Game.engine.endTurn(); }, 300);
    } else {
      view.showPlan(plan());
    }
  }

  function taskAt(cell) {
    for (var i = 0; i < state.tasks.length; i++) {
      var t = state.tasks[i];
      if (!t.done && t.x === cell.x && t.y === cell.y) return t;
    }
    return null;
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
