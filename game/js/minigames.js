/* 포코펫 — 미니게임 3종. 코인과 성장치를 벌 수 있다. */
window.Minigames = (function () {
  'use strict';

  /* ============ 1. 먹이 받기 ============ */
  function catchGame(root, done) {
    root.innerHTML =
      '<p class="mg-help">바구니를 좌우로 움직여 먹이를 받으세요. 💣 폭탄은 피하고요!</p>' +
      '<div class="mg-stat"><span>점수 <b id="mg-score">0</b></span><span>시간 <b id="mg-time">40</b></span><span>목숨 <b id="mg-life">❤️❤️❤️</b></span></div>' +
      '<canvas id="mg-canvas" class="mg-canvas" width="320" height="400" aria-label="먹이 받기 게임"></canvas>' +
      '<p class="mg-help mg-sub">← → 키 또는 화면을 손가락으로 끌어 움직여요.</p>';

    var cv = root.querySelector('#mg-canvas'), ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    var basket = { x: W / 2, w: 58 };
    var drops = [], score = 0, life = 3, over = false;
    var timeLeft = 40, lastSpawn = 0, raf = 0, startedAt = performance.now();
    var keys = {};
    var GOOD = ['🍎', '🍰', '🥕', '🍚', '🍓'];

    function spawn() {
      var bomb = Math.random() < 0.22;
      drops.push({
        x: 24 + Math.random() * (W - 48), y: -20,
        v: 1.5 + Math.random() * 1.6 + score * 0.012,
        bomb: bomb, ch: bomb ? '💣' : GOOD[(Math.random() * GOOD.length) | 0]
      });
    }

    function onKey(e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { keys[e.key] = e.type === 'keydown'; e.preventDefault(); }
    }
    function pointer(e) {
      var r = cv.getBoundingClientRect();
      var px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      basket.x = px * (W / r.width);
      if (e.cancelable) e.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    cv.addEventListener('pointerdown', pointer);
    cv.addEventListener('pointermove', function (e) { if (e.buttons || e.pointerType === 'touch') pointer(e); });
    cv.addEventListener('touchmove', pointer, { passive: false });

    function finish() {
      if (over) return;
      over = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      done({ score: score, coins: Math.max(2, score), exp: Math.round(score * 1.6) + 4, label: score + '개 받았어요' });
    }

    function loop(t) {
      if (over) return;
      var elapsed = (t - startedAt) / 1000;
      timeLeft = Math.max(0, 40 - elapsed);
      root.querySelector('#mg-time').textContent = Math.ceil(timeLeft);

      if (keys.ArrowLeft) basket.x -= 6;
      if (keys.ArrowRight) basket.x += 6;
      basket.x = Math.max(basket.w / 2, Math.min(W - basket.w / 2, basket.x));

      if (t - lastSpawn > Math.max(360, 820 - score * 12)) { spawn(); lastSpawn = t; }

      ctx.clearRect(0, 0, W, H);
      /* 배경 */
      var grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, '#eaf6ff'); grd.addColorStop(1, '#fdf6e8');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

      ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (var i = drops.length - 1; i >= 0; i--) {
        var d = drops[i];
        d.y += d.v;
        ctx.fillText(d.ch, d.x, d.y);
        var hitY = d.y > H - 58 && d.y < H - 18;
        if (hitY && Math.abs(d.x - basket.x) < basket.w / 2 + 8) {
          drops.splice(i, 1);
          if (d.bomb) { life -= 1; if (window.SFX) SFX.bad(); }
          else { score += 1; if (window.SFX) SFX.coin(); }
          root.querySelector('#mg-score').textContent = score;
          root.querySelector('#mg-life').textContent = '❤️'.repeat(Math.max(0, life)) || '—';
          if (life <= 0) { finish(); return; }
        } else if (d.y > H + 24) { drops.splice(i, 1); }
      }

      /* 바구니 */
      ctx.font = '42px serif';
      ctx.fillText('🧺', basket.x, H - 34);

      if (timeLeft <= 0) { finish(); return; }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return function destroy() {
      over = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }

  /* ============ 2. 가위바위보 ============ */
  function rpsGame(root, done, petName) {
    var HANDS = [{ id: 'r', e: '✊', n: '바위' }, { id: 's', e: '✌️', n: '가위' }, { id: 'p', e: '🖐️', n: '보' }];
    var round = 0, win = 0, draw = 0, lose = 0, busy = false;

    root.innerHTML =
      '<p class="mg-help">' + (window.DATA ? DATA.josa(petName, '과/와') : petName + '와') + ' 5판 승부! 이기면 8코인, 비기면 2코인.</p>' +
      '<div class="rps-board"><div class="rps-side"><span class="rps-label">나</span><span class="rps-hand" id="rps-me">❔</span></div>' +
      '<span class="rps-vs">VS</span>' +
      '<div class="rps-side"><span class="rps-label">' + petName + '</span><span class="rps-hand" id="rps-pet">❔</span></div></div>' +
      '<p class="rps-result" id="rps-result">무엇을 낼까요?</p>' +
      '<div class="rps-pick" id="rps-pick"></div>' +
      '<p class="mg-stat"><span>판 <b id="rps-round">0</b>/5</span><span>승 <b id="rps-win">0</b></span></p>';

    var pick = root.querySelector('#rps-pick');
    HANDS.forEach(function (h) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'rps-btn'; b.innerHTML = '<span>' + h.e + '</span>' + h.n;
      b.addEventListener('click', function () { go(h); });
      pick.appendChild(b);
    });

    function go(mine) {
      if (busy || round >= 5) return;
      busy = true;
      var theirs = HANDS[(Math.random() * 3) | 0];
      root.querySelector('#rps-me').textContent = mine.e;
      root.querySelector('#rps-pet').textContent = theirs.e;
      round += 1;
      var res;
      if (mine.id === theirs.id) { draw += 1; res = '비겼어요!'; }
      else if ((mine.id === 'r' && theirs.id === 's') || (mine.id === 's' && theirs.id === 'p') || (mine.id === 'p' && theirs.id === 'r')) { win += 1; res = '이겼다! 🎉'; if (window.SFX) SFX.happy(); }
      else { lose += 1; res = '졌어요… 😢'; if (window.SFX) SFX.bad(); }
      root.querySelector('#rps-result').textContent = res;
      root.querySelector('#rps-round').textContent = round;
      root.querySelector('#rps-win').textContent = win;
      setTimeout(function () {
        busy = false;
        if (round >= 5) {
          var coins = win * 8 + draw * 2;
          done({ score: win, coins: Math.max(2, coins), exp: 6 + win * 4, label: win + '승 ' + draw + '무 ' + lose + '패' });
        }
      }, 650);
    }
    return function () {};
  }

  /* ============ 3. 순서 기억 ============ */
  function memoryGame(root, done) {
    var COLORS = [
      { id: 0, name: '빨강', c: '#ff8b8b', tone: 392 },
      { id: 1, name: '노랑', c: '#ffd166', tone: 494 },
      { id: 2, name: '초록', c: '#8fd9a8', tone: 587 },
      { id: 3, name: '파랑', c: '#89c7f2', tone: 698 }
    ];
    var seq = [], input = [], round = 0, showing = false, ended = false, timers = [];

    root.innerHTML =
      '<p class="mg-help">반짝이는 순서를 잘 보고, 같은 순서로 눌러요.</p>' +
      '<p class="mg-stat"><span>단계 <b id="mem-round">0</b></span><span id="mem-msg">준비…</span></p>' +
      '<div class="mem-grid" id="mem-grid"></div>';

    var grid = root.querySelector('#mem-grid');
    COLORS.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'mem-pad'; b.dataset.id = c.id;
      b.style.background = c.c; b.setAttribute('aria-label', c.name);
      b.addEventListener('click', function () { press(c.id); });
      grid.appendChild(b);
    });

    function flash(id, ms) {
      var pad = grid.querySelector('[data-id="' + id + '"]');
      if (!pad) return;
      pad.classList.add('is-lit');
      if (window.SFX) SFX.tap();
      var t = setTimeout(function () { pad.classList.remove('is-lit'); }, ms || 320);
      timers.push(t);
    }

    function nextRound() {
      if (ended) return;
      round += 1;
      root.querySelector('#mem-round').textContent = round;
      seq.push((Math.random() * 4) | 0);
      input = [];
      showing = true;
      root.querySelector('#mem-msg').textContent = '잘 보세요';
      var gap = Math.max(380, 620 - round * 22);
      seq.forEach(function (id, i) {
        timers.push(setTimeout(function () { flash(id, gap * 0.55); }, 500 + i * gap));
      });
      timers.push(setTimeout(function () {
        showing = false;
        root.querySelector('#mem-msg').textContent = '이제 눌러보세요!';
      }, 500 + seq.length * gap));
    }

    function press(id) {
      if (showing || ended) return;
      flash(id, 180);
      input.push(id);
      var i = input.length - 1;
      if (input[i] !== seq[i]) return finish(false);
      if (input.length === seq.length) {
        root.querySelector('#mem-msg').textContent = '정답! 👏';
        if (window.SFX) SFX.happy();
        timers.push(setTimeout(nextRound, 800));
      }
    }

    function finish(cleared) {
      if (ended) return;
      ended = true;
      timers.forEach(clearTimeout);
      var cleared_rounds = Math.max(0, round - 1);
      if (window.SFX) SFX.bad();
      root.querySelector('#mem-msg').textContent = '끝! ' + cleared_rounds + '단계까지 성공';
      setTimeout(function () {
        done({ score: cleared_rounds, coins: Math.max(2, cleared_rounds * 7), exp: 4 + cleared_rounds * 5, label: cleared_rounds + '단계 성공' });
      }, 700);
    }

    timers.push(setTimeout(nextRound, 600));
    return function () { ended = true; timers.forEach(clearTimeout); };
  }

  function open(id, root, done, petName) {
    if (id === 'catch') return catchGame(root, done);
    if (id === 'rps') return rpsGame(root, done, petName || '펫');
    if (id === 'memory') return memoryGame(root, done);
    return function () {};
  }

  return { open: open };
})();
