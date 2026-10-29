// Бонус «літаюча дошка»: пролітати над водою до кінця гри. Дається за
// космічний квест за телепортом (engine.js, QUESTS).

Game.registerBonus({
  id: 'hoverboard',

  marker: function () {
    return { image: 'hoverboard', item: true };
  },

  give: function (hero) {
    var lost = Game.rules.equip(hero, 'hoverboard');
    return (lost ? 'Літаюча дошка замість ' + Game.artifacts[lost].nameOf : 'Літаюча дошка') + ': літай над водою!';
  },
});
