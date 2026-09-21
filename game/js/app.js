/* 포코펫 — 시작과 시간 흐름 루프 */
(function () {
  'use strict';
  var G = window.Game, U = window.UI;
  var TICK_MS = 20000;
  var timer = null;

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
    if (!G.pet) return;
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
    var hasPet = G.load();
    if (window.SFX) SFX.setEnabled(G.state.sound !== false);
    U.init();

    if (hasPet && G.state.pet && !G.state.pet.dead) {
      U.showGame();
      pulse(true);
      var bonus = G.claimDailyBonus();
      if (bonus) {
        G.save();
        U.renderAll();
        setTimeout(function () { U.toast('오늘의 출석 보너스 +' + bonus + ' 코인!'); if (window.SFX) SFX.coin(); }, 900);
      }
    } else if (hasPet && G.state.pet && G.state.pet.dead) {
      U.showGame();
      U.renderAll();
      U.farewell();
    } else {
      U.showIntro();
    }
    startLoop();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { pulse(true); startLoop(); }
    else { G.save(); }
  });
  window.addEventListener('pagehide', function () { G.save(); });
  window.addEventListener('beforeunload', function () { G.save(); });

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.__pocoInstall = e;
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* 오프라인 캐시는 없어도 게임은 돌아간다 */ });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
