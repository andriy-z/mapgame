// Бонус «кінь-палка»: +3 кроки щоходу до кінця гри. Дається за квест
// у замку за брамою (engine.js, QUESTS).

Game.registerBonus({
  id: 'horse',

  marker: function () {
    return { image: 'horse', item: true };
  },

  give: function (hero) {
    var lost = Game.rules.equip(hero, 'horse');
    return (lost ? 'Кінь-палка замість ' + Game.artifacts[lost].nameOf : 'Кінь-палка') + ': +3 кроки!';
  },
});
