// Бонус «ходулі»: переступати через ліс до кінця гри.

Game.registerBonus({
  id: 'stilts',

  // Як позначка виглядає на карті: річ усередині золотого кола.
  marker: function () {
    return { image: 'stilts', item: true };
  },

  give: function (hero) {
    var lost = Game.rules.equip(hero, 'stilts');
    return (lost ? 'Ходулі замість ' + Game.artifacts[lost].nameOf : 'Ходулі') + '! Тепер можна переступати через ліс';
  },
});
