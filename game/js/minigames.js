/* 우리집 강아지 — 미니게임 3종. 코인과 성장치를 벌 수 있다. */
window.Minigames = (function () {
  'use strict';

  /* ============ 1. 공 물어오기 ============ */
  function fetchGame(root, done) {
    root.innerHTML =
      '<p class="mg-help">바구니를 좌우로 움직여 공과 간식을 받으세요. 돌멩이는 피하고요!</p>' +
      '<div class="mg-stat"><span>점수 <b id="mg-score">0</b></span><span>시간 <b id="mg-time">40</b></span><span>목숨 <b id="mg-life">❤️❤️❤️</b></span></div>' +
      '<canvas id="mg-canvas" class="mg-canvas" width="320" height="400" aria-label="공 물어오기"></canvas>' +
      '<p class="mg-help mg-sub">← → 키 또는 화면을 손가락으로 끌어 움직여요.</p>';

    var cv = root.querySelector('#mg-canvas'), ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    var basket = { x: W / 2, w: 58 };
    var drops = [], score = 0, life = 3, over = false;
    var lastSpawn = 0, raf = 0, startedAt = performance.now(), keys = {};
    var GOOD = ['🎾', '🦴', '🥩', '🧸', '🍖'];

    function spawn() {
      var bad = Math.random() < 0.2;
      drops.push({
        x: 24 + Math.random() * (W - 48), y: -20,
        v: 1.5 + Math.random() * 1.6 + score * 0.012,
        bad: bad, ch: bad ? '🪨' : GOOD[(Math.random() * GOOD.length) | 0]
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
      done({ score: score, coins: Math.max(2, score), exp: Math.round(score * 1.6) + 4, label: score + '개 물어왔어요' });
    }

    function loop(t) {
      if (over) return;
      var left = Math.max(0, 40 - (t - startedAt) / 1000);
      root.querySelector('#mg-time').textContent = Math.ceil(left);
      if (keys.ArrowLeft) basket.x -= 6;
      if (keys.ArrowRight) basket.x += 6;
      basket.x = Math.max(basket.w / 2, Math.min(W - basket.w / 2, basket.x));
      if (t - lastSpawn > Math.max(360, 820 - score * 12)) { spawn(); lastSpawn = t; }

      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#dcefff'); g.addColorStop(1, '#eef7e4');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#8fbf6a'; ctx.fillRect(0, H - 26, W, 26);

      ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (var i = drops.length - 1; i >= 0; i--) {
        var d = drops[i];
        d.y += d.v;
        ctx.fillText(d.ch, d.x, d.y);
        if (d.y > H - 58 && d.y < H - 18 && Math.abs(d.x - basket.x) < basket.w / 2 + 8) {
          drops.splice(i, 1);
          if (d.bad) { life -= 1; if (window.SFX) SFX.bad(); }
          else { score += 1; if (window.SFX) SFX.coin(); }
          root.querySelector('#mg-score').textContent = score;
          root.querySelector('#mg-life').textContent = '❤️'.repeat(Math.max(0, life)) || '—';
          if (life <= 0) { finish(); return; }
        } else if (d.y > H + 24) drops.splice(i, 1);
      }
      ctx.font = '42px serif';
      ctx.fillText('🧺', basket.x, H - 34);
      if (left <= 0) { finish(); return; }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return function () {
      over = true; cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }

  /* ============ 2. 노즈워크 ============ */
  function noseGame(root, done, dogName) {
    var ROUNDS = 5;
    var round = 0, correct = 0, busy = true, timers = [];
    root.innerHTML =
      '<p class="mg-help">' + dogName + '의 코를 믿어보세요. 간식이 든 컵을 기억했다가 맞히면 돼요.</p>' +
      '<p class="mg-stat"><span>판 <b id="ns-round">1</b>/' + ROUNDS + '</span><span>맞힘 <b id="ns-ok">0</b></span></p>' +
      '<div class="cups" id="cups">' +
      '<button class="cup" type="button" data-i="0"><span class="cup-ico">🥤</span></button>' +
      '<button class="cup" type="button" data-i="1"><span class="cup-ico">🥤</span></button>' +
      '<button class="cup" type="button" data-i="2"><span class="cup-ico">🥤</span></button>' +
      '</div><p class="ns-msg" id="ns-msg">간식을 숨기는 중…</p>';

    var cups = [].slice.call(root.querySelectorAll('.cup'));
    var pos = [0, 1, 2], treat = 0, gap = 0;

    function layout(animate) {
      var box = root.querySelector('#cups').getBoundingClientRect();
      gap = box.width / 3;
      cups.forEach(function (c, i) {
        c.style.transition = animate ? 'transform .34s cubic-bezier(.4,.1,.3,1)' : 'none';
        c.style.transform = 'translateX(' + ((pos[i] - i) * gap) + 'px)';
      });
    }
    function msg(t) { root.querySelector('#ns-msg').textContent = t; }

    function startRound() {
      if (round >= ROUNDS) return finish();
      round += 1;
      root.querySelector('#ns-round').textContent = round;
      busy = true;
      pos = [0, 1, 2];
      layout(false);
      treat = (Math.random() * 3) | 0;
      cups[treat].querySelector('.cup-ico').textContent = '🍖';
      cups.forEach(function (c) { c.classList.remove('is-open', 'is-right', 'is-wrong'); });
      cups[treat].classList.add('is-open');
      msg('여기에 간식이 있어요. 잘 보세요!');
      timers.push(setTimeout(function () {
        cups[treat].classList.remove('is-open');
        cups[treat].querySelector('.cup-ico').textContent = '🥤';
        shuffle(0, 3 + round);
      }, 1100));
    }

    function shuffle(n, total) {
      if (n >= total) {
        busy = false;
        msg('어느 컵일까요? 하나 고르세요.');
        return;
      }
      var a = (Math.random() * 3) | 0, b = (a + 1 + ((Math.random() * 2) | 0)) % 3;
      var t = pos[a]; pos[a] = pos[b]; pos[b] = t;
      layout(true);
      if (window.SFX) SFX.tap();
      timers.push(setTimeout(function () { shuffle(n + 1, total); }, Math.max(190, 360 - round * 25)));
    }

    cups.forEach(function (c, i) {
      c.addEventListener('click', function () {
        if (busy) return;
        busy = true;
        var picked = pos.indexOf(pos[i]) === i ? i : i;
        /* 화면에서 고른 자리에 실제로 있는 컵을 찾는다 */
        var slot = pos[i];
        var treatSlot = pos[treat];
        var hit = slot === treatSlot;
        cups[i].querySelector('.cup-ico').textContent = hit ? '🍖' : '💨';
        cups[i].classList.add(hit ? 'is-right' : 'is-wrong', 'is-open');
        if (!hit) {
          cups[treat].querySelector('.cup-ico').textContent = '🍖';
          cups[treat].classList.add('is-open', 'is-right');
        }
        if (hit) { correct += 1; if (window.SFX) SFX.happy(); msg('찾았다! 👏'); }
        else { if (window.SFX) SFX.bad(); msg('아쉬워요… 여기였어요.'); }
        root.querySelector('#ns-ok').textContent = correct;
        timers.push(setTimeout(function () {
          cups.forEach(function (c2) { c2.querySelector('.cup-ico').textContent = '🥤'; });
          startRound();
        }, 1200));
      });
    });

    function finish() {
      done({
        score: correct, coins: Math.max(2, correct * 9), exp: 5 + correct * 6,
        label: ROUNDS + '판 중 ' + correct + '번 찾았어요'
      });
    }

    timers.push(setTimeout(function () { layout(false); startRound(); }, 250));
    return function () { timers.forEach(clearTimeout); };
  }

  /* ============ 3. 훈련 순서 ============ */
  function memoryGame(root, done) {
    var CMDS = [
      { id: 0, name: '앉아', c: '#f0a93b' },
      { id: 1, name: '기다려', c: '#6fae6f' },
      { id: 2, name: '손', c: '#6aa9d8' },
      { id: 3, name: '이리와', c: '#d98a9a' }
    ];
    var seq = [], input = [], round = 0, showing = false, ended = false, timers = [];
    root.innerHTML =
      '<p class="mg-help">보여주는 순서대로 명령을 눌러 훈련시켜요. 갈수록 길어집니다.</p>' +
      '<p class="mg-stat"><span>단계 <b id="mem-round">0</b></span><span id="mem-msg">준비…</span></p>' +
      '<div class="mem-grid" id="mem-grid"></div>';
    var grid = root.querySelector('#mem-grid');
    CMDS.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'mem-pad'; b.dataset.id = c.id;
      b.style.background = c.c; b.textContent = c.name;
      b.addEventListener('click', function () { press(c.id); });
      grid.appendChild(b);
    });
    function flash(id, ms) {
      var pad = grid.querySelector('[data-id="' + id + '"]');
      if (!pad) return;
      pad.classList.add('is-lit');
      if (window.SFX) SFX.tap();
      timers.push(setTimeout(function () { pad.classList.remove('is-lit'); }, ms || 320));
    }
    function nextRound() {
      if (ended) return;
      round += 1;
      root.querySelector('#mem-round').textContent = round;
      seq.push((Math.random() * 4) | 0);
      input = []; showing = true;
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
      if (input[i] !== seq[i]) return finish();
      if (input.length === seq.length) {
        root.querySelector('#mem-msg').textContent = '잘했어! 👏';
        if (window.SFX) SFX.happy();
        timers.push(setTimeout(nextRound, 800));
      }
    }
    function finish() {
      if (ended) return;
      ended = true;
      timers.forEach(clearTimeout);
      var cleared = Math.max(0, round - 1);
      if (window.SFX) SFX.bad();
      root.querySelector('#mem-msg').textContent = '끝! ' + cleared + '단계까지';
      setTimeout(function () {
        done({ score: cleared, coins: Math.max(2, cleared * 7), exp: 4 + cleared * 5, label: cleared + '단계 성공' });
      }, 700);
    }
    timers.push(setTimeout(nextRound, 600));
    return function () { ended = true; timers.forEach(clearTimeout); };
  }

  function open(id, root, done, dogName) {
    if (id === 'fetch') return fetchGame(root, done);
    if (id === 'nose') return noseGame(root, done, dogName || '강아지');
    if (id === 'memory') return memoryGame(root, done);
    return function () {};
  }
  return { open: open };
})();
