// Бонус «чоботи-скороходи»: +3 кроки щоходу до кінця гри.

Game.registerBonus({
  id: 'boots',

  // Як позначка виглядає на карті: чоботи всередині золотого кола.
  marker: function () {
    return { image: 'boots', item: true };
  },

  give: function (hero) {
    var lost = Game.rules.equip(hero, 'boots');
    return (lost ? 'Чоботи-скороходи замість ' + Game.artifacts[lost].nameOf : 'Чоботи-скороходи') + ': +3 кроки!';
  },
});
