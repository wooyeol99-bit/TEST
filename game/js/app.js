/* 우리집 강아지 — 시작과 시간 흐름 루프 */
(function () {
  'use strict';
  var G = window.Game, U = window.UI;
  var TICK_MS = 20000, timer = null;

  function handleEvents(res) {
    var died = false, grew = null;
    (res.events || []).forEach(function (ev) {
      if (ev.type === 'dead') died = true;
      if (ev.type === 'stage') grew = ev.stage;
    });
    if (died) { U.renderAll(); U.farewell(); return true; }
    if (grew) U.celebrate(grew);
    return false;
  }

  function pulse(showReport) {
    if (!G.dog) return;
    var res = G.tick();
    G.save();
    var ended = handleEvents(res);
    U.renderAll();
    if (!ended && showReport) U.awayReport(res);
  }

  function startLoop() {
    if (timer) clearInterval(timer);
    timer = setInterval(function () { pulse(false); }, TICK_MS);
  }

  function boot() {
    var has = G.load();
    if (window.SFX) SFX.setEnabled(G.state.sound !== false);
    U.init();

    if (has && G.dog && !G.dog.dead) {
      U.showGame();
      pulse(true);
      var bonus = G.claimDailyBonus();
      if (bonus) {
        G.save(); U.renderAll();
        setTimeout(function () {
          U.toast('오늘의 출석 보너스 +' + bonus + ' 코인!');
          if (window.SFX) SFX.coin();
        }, 900);
      }
    } else if (has && G.dog && G.dog.dead) {
      U.showGame(); U.renderAll(); U.farewell();
    } else {
      U.showIntro();
    }
    startLoop();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { pulse(true); startLoop(); U.startLoop(); }
    else { G.save(); U.stopLoop(); }
  });
  window.addEventListener('pagehide', function () { G.save(); });
  window.addEventListener('beforeunload', function () { G.save(); });
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); window.__dogInstall = e; });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
