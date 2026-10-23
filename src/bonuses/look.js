// Бонус «зміна лука»: герой стає іншим персонажем (інша аватарка).
// Яким саме — видно на позначці, prize.avatar. Кроки й артефакти лишаються.

Game.registerBonus({
  id: 'look',

  marker: function (prize) {
    return { image: Game.avatars[prize.avatar].image, artifacts: [] };
  },

  give: function (hero, prize) {
    hero.look = prize.avatar;
    return 'Тепер ти — ' + Game.avatars[prize.avatar].name + '!';
  },
});
