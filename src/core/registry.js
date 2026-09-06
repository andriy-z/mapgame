// Реєстр гри. Кожен файл-сутність реєструє себе тут.
// Підключається першим, до всіх інших скриптів.

var Game = (function () {
  'use strict';

  var tiles = {};
  var props = {};
  var maps = {};

  return {
    tiles: tiles,
    props: props,
    maps: maps,

    // Плитка: id → картинка. Це все, що знає рендер.
    registerTile: function (tile) {
      tiles[tile.id] = tile;
    },

    // Великий об'єкт поверх плиток (Еверест і т.д.). Розмір у клітинках.
    registerProp: function (prop) {
      props[prop.id] = prop;
    },

    // Карта — самі дані, за контрактом шару 1 (docs/05-generator-karty.md).
    registerMap: function (map) {
      maps[map.id] = map;
    },

    // Єдине, що ядру треба знати про карту.
    isPassable: function (map, x, y) {
      var row = map.passable[y];
      return !!(row && row[x]);
    },
  };
})();
