// Реєстр гри. Кожен файл-сутність реєструє себе тут.
// Підключається першим, до всіх інших скриптів.

var Game = (function () {
  'use strict';

  var images = {};
  var sounds = {};
  var characters = {};
  var avatars = {};
  var artifacts = {};
  var bonuses = {};
  var props = {};
  var maps = {};
  var taskTypes = {};
  var questTypes = {};
  var words = [];

  return {
    images: images,
    sounds: sounds,
    characters: characters,
    avatars: avatars,
    artifacts: artifacts,
    bonuses: bonuses,
    props: props,
    maps: maps,
    taskTypes: taskTypes,
    questTypes: questTypes,
    words: words,

    // Картинка скіна: id → шлях до файлу. Плитки, фішки, точки шляху —
    // усе тут. Уся решта гри знає картинки лише за id.
    registerImage: function (id, file) {
      images[id] = file;
    },

    // Звук скіна: id → шлях до файлу (музика, фанфара фінішу).
    registerSound: function (id, file) {
      sounds[id] = file;
    },

    // Персонаж (гравець): скільки кроків за хід і з якою аватаркою починає.
    registerCharacter: function (character) {
      characters[character.id] = character;
    },

    // Аватарка — «лук» фішки: { id, name, image }. bonus: true — її можна
    // отримати як приз. Стандарт фішки — docs/07-fishka.md.
    registerAvatar: function (avatar) {
      avatars[avatar.id] = avatar;
    },

    // Артефакт, що чіпляється до фішки ззовні: { id, name, slot, image, ... }.
    registerArtifact: function (artifact) {
      artifacts[artifact.id] = artifact;
    },

    // Бонус — приз за завдання збоку від дороги (src/bonuses/).
    registerBonus: function (bonus) {
      bonuses[bonus.id] = bonus;
    },

    // Великий об'єкт поверх плиток (Еверест і т.д.). Розмір у клітинках.
    registerProp: function (prop) {
      props[prop.id] = prop;
    },

    // Тип завдання (src/tasks/): як воно виглядає й перевіряється.
    registerTaskType: function (type) {
      taskTypes[type.id] = type;
    },

    // Космічний квест (src/quests/): маленький рівень за телепортом.
    registerQuestType: function (type) {
      questTypes[type.id] = type;
    },

    // Слово для завдань на читання: { word, image } — image = id картинки зі скіна.
    registerWord: function (word) {
      words.push(word);
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

    // Що за терен у клітинці: 'grass', 'forest', 'mountain', 'water' або
    // null (поза картою чи карта без terrain). Читають правила артефактів
    // (качечка ходить по воді).
    terrainAt: function (map, x, y) {
      var row = map.terrain && map.terrain[y];
      return (row && row[x]) || null;
    },
  };
})();
