// Бонус «качечка»: ходити по воді до кінця гри.

Game.registerBonus({
  id: 'duck',

  // Як позначка виглядає на карті: качечка всередині золотого кола.
  marker: function () {
    return { image: 'duck', item: true };
  },

  give: function (hero) {
    var lost = Game.rules.equip(hero, 'duck');
    return (lost ? 'Качечка замість ' + Game.artifacts[lost].nameOf : 'Качечка') + '! Тепер можна ходити по воді';
  },
});
