// Бонус «антенки прибульця»: іноді на початку ходу «Біп-біп!» — і ще 2
// кроки. Дається за космічний квест за телепортом (engine.js, QUESTS).

Game.registerBonus({
  id: 'antennae',

  marker: function () {
    return { image: 'antennae', item: true };
  },

  give: function (hero) {
    var lost = Game.rules.equip(hero, 'antennae');
    return (lost ? 'Антенки замість ' + Game.artifacts[lost].nameOf : 'Антенки прибульця') + '! Біп-біп!';
  },
});
