// Звук: фонова музика і короткі звуки. Файли — зі скіна (Game.sounds).
//
// Браузер дозволяє грати звук лише після першого кліку чи клавіші, тому
// music(true) до того лише запам'ятовує, що музика має грати, а вмикає
// її unlock(). Кнопка 🔊/🔇 вимикає все; вибір пам'ятається між запусками.

(function () {
  'use strict';

  var MUSIC_VOLUME = 0.35;
  var SFX_VOLUME = 0.8;
  var KEY = 'maxmap.muted';

  var unlocked = false;
  var wantMusic = false;
  var muted = load();
  var bgm = null;

  function load() {
    try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }

  function save() {
    try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) { /* не страшно */ }
  }

  function track() {
    if (!bgm && Game.sounds.music) {
      bgm = new Audio(Game.sounds.music);
      bgm.loop = true;
      bgm.volume = MUSIC_VOLUME;
    }
    return bgm;
  }

  // Привести музику у відповідність до стану: грати чи мовчати.
  function sync() {
    var a = track();
    if (!a) return;
    if (wantMusic && unlocked && !muted) {
      var p = a.play();
      if (p && p.catch) p.catch(function () { /* браузер не пустив — спробуємо з наступним кліком */ unlocked = false; });
    } else {
      a.pause();
    }
  }

  function button() {
    var el = document.getElementById('mute');
    if (el) el.textContent = muted ? '🔇' : '🔊';
  }

  Game.sound = {
    // Чи має грати фонова музика. false — пауза (наприклад, на фініші).
    music: function (on) {
      wantMusic = on;
      if (on && bgm) bgm.currentTime = 0;
      sync();
    },

    // rate — висота: 1 як записано, 1.12 — трохи вище (так дзвіночок
    // «йде вгору» з кожною складеною літерою).
    play: function (id, rate) {
      if (muted || !unlocked || !Game.sounds[id]) return;
      var a = new Audio(Game.sounds[id]);
      a.volume = SFX_VOLUME;
      if (rate) { a.preservesPitch = false; a.playbackRate = rate; }
      a.play().catch(function () {});
    },

    unlock: function () {
      if (unlocked) return;
      unlocked = true;
      sync();
    },

    toggleMute: function () {
      muted = !muted;
      save();
      button();
      sync();
    },
  };

  button();
})();
