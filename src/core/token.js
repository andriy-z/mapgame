// Фішка: коло з аватаркою всередині і артефакти, що чіпляються до кола
// ззовні (крильця з боків, чоботи знизу, перчинка в руці), а над колом — зірки за завдання. Стандарт —
// docs/07-fishka.md.
//
//   <div class="token">
//     <div class="slot slot-sides left"><img></div>   — артефакти, по слотах
//     <div class="slot slot-sides right"><img></div>
//     <div class="disc"><img class="avatar"></div>   — коло з аватаркою
//     <div class="stars">…</div>                       — зірки за завдання, над колом
//   </div>
//
// Розмір фішки — CSS-змінна --s (на карті = клітинка), усе всередині
// рахується від неї, тож та сама фішка годиться і для карти, і для панелі.

(function () {
  'use strict';

  // Слоти: де на фішці висить артефакт. pair — дві копії, ліва дзеркальна.
  // Положення й розмір кожного слота — CSS (.slot-<назва>) у index.html.
  var SLOTS = {
    sides: { pair: true },   // крильця
    feet: {},                // чоботи-скороходи, качечка
    top: {},                 // капелюх, корона (згодом)
    hand: {},                // перчинка — у руці, збоку внизу
  };

  // Зірки над колом: до BIG_FROM — стільки ж маленьких зірок, з BIG_FROM —
  // одна велика з цифрою посередині (щоб не розповзались на пів карти).
  var BIG_FROM = 4;

  function el(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  function image(id) {
    var i = el('img');
    i.src = Game.images[id];
    i.alt = '';
    i.draggable = false;
    return i;
  }

  function key(look) {
    return look.image + '|' + (look.artifacts || []).join(',') + '|' + (look.stars || 0);
  }

  function stars(n) {
    var box = el('div', 'stars' + (n >= BIG_FROM ? ' big' : ''));
    for (var i = 0; i < (n >= BIG_FROM ? 1 : n); i++) {
      var s = el('div', 'star');
      s.appendChild(image('badge-star'));
      if (n >= BIG_FROM) s.appendChild(el('span', 'count')).textContent = n;
      box.appendChild(s);
    }
    return box;
  }

  // look = { image, artifacts, stars, item }: id картинки аватарки, масив id
  // артефактів і скільки зірок (у позначок призів зірок нема). item: true —
  // у колі не аватарка, а річ (чоботи, качечка на позначці призу): трохи менша.
  function fill(token, look) {
    token.innerHTML = '';
    var top = false;   // щось у слоті top (антенки) — зірки тоді вище
    (look.artifacts || []).forEach(function (id) {
      var a = Game.artifacts[id];
      if (a.slot === 'top') top = true;
      var slot = SLOTS[a.slot] || {};
      (slot.pair ? ['left', 'right'] : ['one']).forEach(function (side) {
        var box = el('div', 'slot slot-' + a.slot + ' ' + side + ' art-' + a.id);
        box.appendChild(image(a.image));
        token.appendChild(box);
      });
    });
    var disc = el('div', 'disc');
    var av = image(look.image);
    av.className = 'avatar' + (look.item ? ' item' : '');
    disc.appendChild(av);
    token.appendChild(disc);
    if (look.stars) token.appendChild(stars(look.stars));
    token.classList.toggle('with-top', top);
    token.dataset.look = key(look);
  }

  Game.token = {
    create: function (look, cls) {
      var token = el('div', 'token' + (cls ? ' ' + cls : ''));
      fill(token, look);
      return token;
    },

    // Перемалювати вміст, якщо щось змінилось. true — змінилось.
    update: function (token, look) {
      if (token.dataset.look === key(look)) return false;
      fill(token, look);
      return true;
    },

    // Що показати на фішці героя: його поточна аватарка, артефакти й зірки.
    ofHero: function (hero) {
      return { image: Game.avatars[hero.look].image, artifacts: hero.artifacts, stars: hero.stars };
    },
  };
})();
