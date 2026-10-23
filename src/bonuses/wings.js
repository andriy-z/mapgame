// Бонус «крильця»: герой, що розв'язав завдання, отримує крильця до кінця гри.

Game.registerBonus({
  id: 'wings',

  // Як позначка виглядає на карті: золота кулька з крильцями.
  marker: function () {
    return { image: 'bonus-orb', artifacts: ['wings'] };
  },

  give: function (hero) {
    var lost = Game.rules.equip(hero, 'wings');
    return (lost ? 'Крильця замість ' + Game.artifacts[lost].nameOf : 'Крильця') + '! Тепер можна літати';
  },
});
