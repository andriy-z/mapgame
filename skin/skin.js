// Скін: усі картинки й звуки гри. Ім'я файлу = id + '.png' (картинки) або
// id + '.wav' (звуки), усі лежать у цій теці.
//
// Інший стиль = інша тека з тими самими іменами файлів. Код гри не
// змінюється. Вимоги до плиток — docs/06-specyfikaciya-tayliv.md.

(function () {
  'use strict';

  var DIR = 'skin/';

  function add(id) {
    Game.registerImage(id, DIR + id + '.png');
  }

  // ─── Плитки карти ───────────────────────────────────────────────────
  // Трава — три однакові за змістом варіанти, лише щоб поле не рябіло сіткою.
  add('grass-0');
  add('grass-1');
  add('grass-2');

  // Ліс, гори, вода: id = терен + маска сусідів (`forest-21`). Маска з 8 біт,
  // за годинниковою стрілкою від півночі: 1 = Пн, 2 = ПнСх, 4 = Сх, 8 = ПдСх,
  // 16 = Пд, 32 = ПдЗх, 64 = Зх, 128 = ПнЗх; діагональ рахується, тільки якщо
  // стоять обидві сусідні сторони — тому різних масок 47, а не 256.
  var MASKS = [
    0, 1, 4, 5, 7, 16, 17, 20, 21, 23, 28, 29, 31, 64, 65, 68, 69, 71, 80, 81,
    84, 85, 87, 92, 93, 95, 112, 113, 116, 117, 119, 124, 125, 127, 193, 197,
    199, 209, 213, 215, 221, 223, 241, 245, 247, 253, 255,
  ];
  ['forest', 'mountain', 'water'].forEach(function (terrain) {
    MASKS.forEach(function (mask) { add(terrain + '-' + mask); });
  });

  // ─── Аватарки фішок (src/content/avatars.js), стандарт — docs/07-fishka.md
  add('moomintroll');
  add('snufkin');
  add('snorkmaiden');   // Хропся
  add('moominmamma');
  add('moominpappa');
  add('fredrikson');

  // ─── Артефакти й бонуси ─────────────────────────────────────────────
  add('wing');          // крильце (праве; ліве — дзеркально)
  add('boots');         // чоботи-скороходи (пара на одній картинці)
  add('duck');          // качечка — ходити по воді
  add('stilts');        // ходулі — переступати через ліс
  add('sled');          // санчата — через гори
  add('pepper');        // перчинка — чхати й підлітати
  add('balloon');       // повітряна кулька — разовий політ
  add('harmonica');     // губна гармошка — разово покликати друга
  add('badge-star');    // зірка над фішкою за розв'язане завдання
  add('bonus-orb');     // середина позначки бонусу «крильця»
  add('telescope');     // підзорна труба — бачити далі крізь туман (приз з космосу)
  add('hoverboard');    // літаюча дошка — над водою (приз з космосу)
  add('antennae');      // антенки прибульця — іноді +2 кроки (приз з космосу)

  // ─── Позначки на карті ──────────────────────────────────────────────
  add('step');       // точка шляху, куди герой дійде цього ходу
  add('step-far');   // точка шляху, на яку цього ходу кроків не вистачить
  add('target');     // мітка «іти сюди»
  add('target-no');  // мітка «сюди не можна»
  add('finish');     // клітинка фінішу
  add('task');       // точка-завдання: чарівна книжка
  add('portal');     // телепорт у космос (src/quests/)

  // ─── Космос: сейф у темній кімнаті (src/quests/dark-room.js) ────────
  add('safe');          // зачинений, з кодовим замком
  add('safe-open');     // навстіж, а в ньому — приз

  // ─── Картинки до слів (src/content/words.js) ────────────────────────
  ['sun', 'fish', 'house', 'beetle', 'mushroom', 'star', 'cloud', 'heart', 'ball', 'boat',
   'cat', 'owl', 'frog', 'pear', 'cherry', 'lemon', 'watermelon', 'cheese', 'egg', 'cake', 'key', 'cup']
    .forEach(function (name) { add('pic-' + name); });

  // ─── Звуки ──────────────────────────────────────────────────────────
  // Інший формат (mp3, ogg) — поміняти розширення тут.
  Game.registerSound('music', DIR + 'music.wav');   // фонова музика, по колу
  Game.registerSound('win', DIR + 'win.wav');       // фанфара на фініші
  Game.registerSound('right', DIR + 'right.wav');   // правильна відповідь
  Game.registerSound('wrong', DIR + 'wrong.wav');   // неправильна
  Game.registerSound('letter', DIR + 'letter.wav'); // літера стала на місце
  Game.registerSound('bonus', DIR + 'bonus.wav');   // отримав приз
  Game.registerSound('sneeze', DIR + 'sneeze.wav'); // апчхи! (перчинка)
  Game.registerSound('balloon', DIR + 'balloon.wav');     // кулька злітає
  Game.registerSound('harmonica', DIR + 'harmonica.wav'); // гармошка грає
  Game.registerSound('click', DIR + 'click.wav');         // кнопка кодового замка
  Game.registerSound('unlock', DIR + 'unlock.wav');       // сейф відчинився (космос)
  Game.registerSound('beep', DIR + 'beep.wav');           // біп-біп антенок
})();
