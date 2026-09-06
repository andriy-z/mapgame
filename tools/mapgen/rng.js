// Детермінований випадок для генератора.

(function () {
  'use strict';
  window.MapGen = window.MapGen || {};

  // Послідовний генератор: mulberry32. Порядок викликів має значення.
  // Для рішень кроку 2 («скільки озер, де саме»).
  MapGen.makeRng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // Позиційний шум: залежить від координат, НЕ від порядку викликів.
  // Для вибору варіанту плитки в резолвері.
  MapGen.makeHash = function (seed) {
    return function (x, y) {
      var h = (seed >>> 0) ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1);
      h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
      h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
      return (h ^ (h >>> 15)) >>> 0;
    };
  };

  // Перемішування на місці, керується переданим rng.
  MapGen.shuffle = function (arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };
})();
