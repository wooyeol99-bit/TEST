/* 포코펫 — 아주 작은 효과음 엔진 (오디오 파일 없이 WebAudio로 삑삑) */
window.SFX = (function () {
  'use strict';
  var ctx = null, on = true;

  function ac() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* notes: [[주파수, 길이(초)], ...] */
  function play(notes, type, vol) {
    if (!on) return;
    var a = ac();
    if (!a) return;
    var t = a.currentTime, gainAll = a.createGain();
    gainAll.gain.value = vol == null ? 0.08 : vol;
    gainAll.connect(a.destination);
    notes.forEach(function (n) {
      var o = a.createOscillator(), g = a.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(n[0], t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(1, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + n[1]);
      o.connect(g); g.connect(gainAll);
      o.start(t); o.stop(t + n[1] + 0.02);
      t += n[1];
    });
  }

  return {
    setEnabled: function (v) { on = !!v; },
    enabled: function () { return on; },
    tap:   function () { play([[660, 0.06]], 'square', 0.05); },
    eat:   function () { play([[520, 0.07], [700, 0.07], [880, 0.09]], 'triangle'); },
    happy: function () { play([[660, 0.08], [880, 0.08], [1046, 0.14]], 'square'); },
    wash:  function () { play([[880, 0.05], [1180, 0.05], [980, 0.05], [1320, 0.08]], 'sine', 0.06); },
    sleep: function () { play([[440, 0.12], [330, 0.16]], 'sine', 0.06); },
    wake:  function () { play([[520, 0.08], [780, 0.1]], 'sine', 0.06); },
    coin:  function () { play([[988, 0.06], [1318, 0.12]], 'square', 0.06); },
    levelup: function () { play([[523, 0.09], [659, 0.09], [784, 0.09], [1046, 0.22]], 'square', 0.08); },
    bad:   function () { play([[300, 0.12], [220, 0.18]], 'sawtooth', 0.05); },
    hatch: function () { play([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.26]], 'square', 0.08); }
  };
})();
