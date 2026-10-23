// Бонус «перчинка»: іноді герой чхає і підлітає на дві клітинки вперед.

Game.registerBonus({
  id: 'pepper',

  // Як позначка виглядає на карті: річ усередині золотого кола.
  marker: function () {
    return { image: 'pepper', item: true };
  },

  give: function (hero) {
    var lost = Game.rules.equip(hero, 'pepper');
    return (lost ? 'Перчинка замість ' + Game.artifacts[lost].nameOf : 'Перчинка') + '! Будь здоров наперед';
  },
});
