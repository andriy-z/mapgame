// Бонус «підзорна труба»: бачити крізь туман на 2 клітинки далі до кінця
// гри. Дається за космічний квест за телепортом (engine.js, TELEPORT).

Game.registerBonus({
  id: 'telescope',

  marker: function () {
    return { image: 'telescope', item: true };
  },

  give: function (hero) {
    var lost = Game.rules.equip(hero, 'telescope');
    return (lost ? 'Підзорна труба замість ' + Game.artifacts[lost].nameOf : 'Підзорна труба') + ': бачиш далеко!';
  },
});
