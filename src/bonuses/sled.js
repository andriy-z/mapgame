// Бонус «санчата»: перебиратись через гори до кінця гри.

Game.registerBonus({
  id: 'sled',

  // Як позначка виглядає на карті: річ усередині золотого кола.
  marker: function () {
    return { image: 'sled', item: true };
  },

  give: function (hero) {
    var lost = Game.rules.equip(hero, 'sled');
    return (lost ? 'Санчата замість ' + Game.artifacts[lost].nameOf : 'Санчата') + '! Тепер можна через гори';
  },
});
