// Реєстр гри. Кожен файл-сутність реєструє себе тут.
// Підключається першим, до всіх інших скриптів.

var Game = (function () {
  'use strict';

  var images = {};
  var sounds = {};
  var characters = {};
  var props = {};
  var maps = {};

  return {
    images: images,
    sounds: sounds,
    characters: characters,
    props: props,
    maps: maps,

    // Картинка скіна: id → шлях до файлу. Плитки, фішки, точки шляху —
    // усе тут. Уся решта гри знає картинки лише за id.
    registerImage: function (id, file) {
      images[id] = file;
    },

    // Звук скіна: id → шлях до файлу (музика, фанфара фінішу).
    registerSound: function (id, file) {
      sounds[id] = file;
    },

    // Персонаж: ім'я, скільки кроків за хід, id картинки фішки.
    registerCharacter: function (character) {
      characters[character.id] = character;
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
