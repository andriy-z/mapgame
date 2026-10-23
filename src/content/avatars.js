// Аватарки — «лук» фішки героя. Картинка за стандартом фішки
// (docs/07-fishka.md): 512×512, дивиться праворуч, усе важливе в колі.
// bonus: true — аватарку можна отримати як приз (бонус «зміна лука»).

Game.registerAvatar({ id: 'moomintroll', name: 'Мумі-троль', image: 'moomintroll' });
Game.registerAvatar({ id: 'snufkin',     name: 'Нюхмумрик',  image: 'snufkin' });

Game.registerAvatar({ id: 'snorkmaiden', name: 'Хропся',     image: 'snorkmaiden', bonus: true });
Game.registerAvatar({ id: 'moominmamma', name: 'Мумі-мама',  image: 'moominmamma', bonus: true });
Game.registerAvatar({ id: 'moominpappa', name: 'Мумі-тато',  image: 'moominpappa', bonus: true });
Game.registerAvatar({ id: 'fredrikson',  name: 'Фредріксон', image: 'fredrikson',  bonus: true });
