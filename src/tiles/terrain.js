// Ландшафт: трава + три терени з автотайлінгом.
//
// id = терен + маска сусідів (`forest-21`). Маска з 8 біт, за годинниковою
// стрілкою від півночі: 1 = Пн, 2 = ПнСх, 4 = Сх, 8 = ПдСх, 16 = Пд,
// 32 = ПдЗх, 64 = Зх, 128 = ПнЗх; діагональ рахується, тільки якщо стоять
// обидві сусідні сторони — тому різних масок 47, а не 256.
//
// Біт стоїть — з того боку масив продовжується, край не малюємо. Хто саме
// обирає варіант, рендер не знає: id приходить готовим з генератора.
// Вимоги до самих картинок — docs/06-specyfikaciya-tayliv.md.

(function () {
  'use strict';

  ['forest', 'mountain', 'water'].forEach(function (terrain) {
    blobMasks().forEach(function (mask) {
      Game.registerTile({
        id: terrain + '-' + mask,
        image: 'assets/tiles/' + terrain + '-' + mask + '.png',
      });
    });
  });

  // 47 канонічних масок: із 256 лишаємо ті, де кожна виставлена діагональ
  // підперта обома своїми сторонами.
  function blobMasks() {
    var out = [], seen = {};
    for (var m = 0; m < 256; m++) {
      var n = m & 1, e = m & 4, s = m & 16, w = m & 64;
      var c = m;
      if (!(n && e)) c &= ~2;
      if (!(e && s)) c &= ~8;
      if (!(s && w)) c &= ~32;
      if (!(w && n)) c &= ~128;
      c &= 0xFF;
      if (!seen[c]) { seen[c] = true; out.push(c); }
    }
    return out;
  }

  // Трава — три однакові за змістом варіанти, лише щоб поле не рябіло сіткою.
  for (var v = 0; v < 3; v++) {
    Game.registerTile({ id: 'grass-' + v, image: 'assets/tiles/grass-' + v + '.png' });
  }

})();
