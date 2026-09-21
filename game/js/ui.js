/* 포코펫 — 화면 그리기와 모든 팝업 */
window.UI = (function () {
  'use strict';
  var D = window.DATA, G = window.Game;
  var $ = function (sel) { return document.querySelector(sel); };
  var intro, game, modalRoot, toastEl, toastTimer, speechTimer, destroyGame = null;
  var pick = { species: 'mungi', mode: 'easy' };

  function josa(word, pair) { return D.josa(word, pair); }

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  /* ================= 시작 화면 ================= */
  function buildIntro() {
    var wrap = $('#species-picker');
    wrap.innerHTML = '';
    D.SPECIES.forEach(function (sp, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'species' + (i === 0 ? ' is-on' : '');
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
      b.dataset.id = sp.id;
      b.innerHTML = '<div class="species-art">' + Pet.thumb(sp.id, 'kid', 'joy') + '</div>' +
        '<strong>' + esc(sp.name) + '</strong><span>' + esc(sp.kind) + '</span>';
      b.addEventListener('click', function () {
        pick.species = sp.id;
        wrap.querySelectorAll('.species').forEach(function (n) {
          n.classList.toggle('is-on', n === b);
          n.setAttribute('aria-checked', n === b ? 'true' : 'false');
        });
        $('#pet-name').placeholder = '예: ' + sp.name;
        if (window.SFX) SFX.tap();
      });
      wrap.appendChild(b);
    });

    document.querySelectorAll('.mode-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        pick.mode = b.dataset.mode;
        document.querySelectorAll('.mode-btn').forEach(function (n) {
          n.classList.toggle('is-on', n === b);
          n.setAttribute('aria-checked', n === b ? 'true' : 'false');
        });
        if (window.SFX) SFX.tap();
      });
    });

    $('#btn-start').addEventListener('click', function () {
      var name = ($('#pet-name').value || '').trim().slice(0, 8) || D.species(pick.species).name;
      G.create(pick.species, name, pick.mode);
      if (window.SFX) SFX.hatch();
      showGame();
      renderAll();
      speech('알을 톡톡 두드려 깨워 주세요!', 6000);
    });
  }

  function showIntro() { intro.hidden = false; game.hidden = true; }
  function showGame() { intro.hidden = true; game.hidden = false; }

  /* ================= 본 화면 ================= */
  function gaugeClass(v) { return v > 60 ? 'ok' : (v > 28 ? 'warn' : 'bad'); }

  function renderAll() {
    var s = G.state, p = s.pet;
    if (!p) { showIntro(); return; }

    /* HUD */
    $('#hud-name').textContent = p.name;
    var st = G.stage();
    var formTxt = (st.id === 'adult' || st.id === 'legend') && p.form ? D.form(p.form).label + ' ' : '';
    var days = G.ageDays();
    var hrs = G.ageHours();
    var ageTxt = days > 0 ? days + '일째' : (hrs >= 1 ? Math.floor(hrs) + '시간째' : Math.max(1, Math.round(hrs * 60)) + '분째');
    $('#hud-meta').textContent = formTxt + st.label + ' · ' + ageTxt + (s.mode === 'hard' ? ' · 매운맛' : '');
    $('#hud-coins').querySelector('b').textContent = s.coins;

    /* 배경 */
    var bgId = s.equipped.bg || 'bg_room';
    var bg = D.BG_STYLE[bgId] || D.BG_STYLE.bg_room;
    $('#stage-sky').style.background = bg.sky;
    $('#stage').classList.toggle('is-dark', !!bg.dark);
    $('#stage').classList.toggle('is-night', !!p.sleeping);
    $('#stage').style.setProperty('--floor', bg.floor);

    /* 펫 */
    var mood = G.mood();
    Pet.render($('#pet-holder'), {
      species: p.species,
      stageId: st.id,
      mood: mood,
      hat: s.equipped.hat,
      cracks: p.hatchTaps
    });

    /* 똥 */
    var poops = $('#poops');
    poops.innerHTML = '';
    p.poops.forEach(function (ts, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'poop'; b.textContent = '💩';
      b.setAttribute('aria-label', '똥 치우기');
      /* 시간값으로 자리를 정해 다시 그려도 같은 곳에 있게 한다 (음수가 되지 않도록 나눗셈 사용) */
      var seed = Math.floor(ts / 997) + i * 37;
      b.style.left = (10 + (seed % 72)) + '%';
      b.style.bottom = (4 + (Math.floor(seed / 72) % 12)) + '%';
      b.addEventListener('click', function () {
        G.cleanPoop(i);
        if (window.SFX) SFX.wash();
        fx('✨'); toast('깨끗해졌어요!'); G.save(); renderAll();
      });
      poops.appendChild(b);
    });

    /* 게이지 */
    [['hunger', p.hunger], ['happy', p.happy], ['clean', p.clean], ['energy', p.energy]].forEach(function (pair) {
      var g = document.querySelector('.gauge[data-key="' + pair[0] + '"]');
      if (!g) return;
      var bar = g.querySelector('.g-bar i');
      bar.style.width = Math.round(pair[1]) + '%';
      g.className = 'gauge ' + gaugeClass(pair[1]);
      g.dataset.key = pair[0];
    });
    var nx = G.nextStage();
    var expBar = document.querySelector('.gauge[data-key="exp"]');
    expBar.querySelector('.g-bar i').style.width = Math.round(G.expProgress() * 100) + '%';
    $('#exp-label').textContent = nx ? (st.id === 'egg' ? '부화까지' : nx.label + '까지') : '최고 단계';

    /* 아플 때 표시 */
    $('#game').classList.toggle('is-sick', !!p.sick);
    $('#game').classList.toggle('is-dead', !!p.dead);

    /* 버튼 상태 */
    var sleepBtn = document.querySelector('[data-act="sleep"]');
    if (sleepBtn) sleepBtn.innerHTML = p.sleeping ? '<span aria-hidden="true">☀️</span>깨우기' : '<span aria-hidden="true">🌙</span>재우기';
    var healBtn = document.querySelector('[data-act="heal"]');
    if (healBtn) healBtn.classList.toggle('is-alert', !!p.sick);

    var line = G.statusLine();
    if (line && !speechTimer) speech(line, 4000);
  }

  /* ================= 말풍선 / 토스트 / 이펙트 ================= */
  function speech(msg, ms) {
    var el = $('#speech');
    if (!msg) { el.hidden = true; return; }
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(speechTimer);
    speechTimer = setTimeout(function () { el.hidden = true; speechTimer = null; }, ms || 3000);
  }

  function toast(msg) {
    if (!msg) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('is-on');
      setTimeout(function () { toastEl.hidden = true; }, 250);
    }, 1800);
  }

  var FX_CHAR = { eat: '🍚', play: '🎵', wash: '🫧', heart: '💗', sleep: '💤', wake: '☀️', heal: '💊', coin: '🪙', star: '⭐' };
  function fx(kind, count) {
    var box = $('#fx');
    var ch = FX_CHAR[kind] || kind || '✨';
    var n = count || 5;
    for (var i = 0; i < n; i++) {
      (function (i) {
        var s = document.createElement('span');
        s.className = 'fx-item';
        s.textContent = ch;
        s.style.left = (30 + Math.random() * 40) + '%';
        s.style.animationDelay = (i * 90) + 'ms';
        box.appendChild(s);
        setTimeout(function () { s.remove(); }, 1500 + i * 90);
      })(i);
    }
  }

  /* ================= 모달 ================= */
  function closeModal() {
    if (destroyGame) { destroyGame(); destroyGame = null; }
    modalRoot.hidden = true;
    modalRoot.innerHTML = '';
    document.body.classList.remove('modal-open');
  }

  function modal(opts) {
    closeModal();
    modalRoot.hidden = false;
    document.body.classList.add('modal-open');
    var sheet = document.createElement('div');
    sheet.className = 'sheet' + (opts.wide ? ' sheet-wide' : '');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', opts.title || '창');
    sheet.innerHTML =
      '<div class="sheet-head"><h2>' + esc(opts.title || '') + '</h2>' +
      '<button class="icon-btn" type="button" data-close aria-label="닫기">✕</button></div>' +
      '<div class="sheet-body"></div>';
    var body = sheet.querySelector('.sheet-body');
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);

    var back = document.createElement('div');
    back.className = 'backdrop';
    back.addEventListener('click', closeModal);
    modalRoot.appendChild(back);
    modalRoot.appendChild(sheet);
    sheet.querySelector('[data-close]').addEventListener('click', closeModal);
    if (opts.onMount) opts.onMount(body, sheet);
    return body;
  }

  /* ================= 상점 ================= */
  function itemCard(it, mode) {
    var s = G.state;
    var ownedWear = it.slot && (s.owned[it.id] || it.price === 0);
    var count = s.inventory[it.id] || 0;
    var equipped = it.slot && s.equipped[it.slot] === it.id;
    var right;
    if (mode === 'shop') {
      right = ownedWear
        ? '<button class="btn btn-ghost" type="button" data-equip="' + it.id + '">' + (equipped ? '착용 중' : '착용') + '</button>'
        : '<button class="btn btn-mini" type="button" data-buy="' + it.id + '"><i class="coin-dot"></i>' + it.price + '</button>';
    } else {
      right = '<button class="btn btn-mini" type="button" data-use="' + it.id + '">사용</button>';
    }
    var sub = it.desc + (mode === 'bag' ? ' · ' + count + '개' : '');
    return '<li class="item' + (equipped ? ' is-equipped' : '') + '">' +
      '<span class="item-emoji" aria-hidden="true">' + it.emoji + '</span>' +
      '<span class="item-txt"><strong>' + esc(it.name) + '</strong><span>' + esc(sub) + '</span></span>' +
      right + '</li>';
  }

  function openShop() {
    var cats = [
      { id: 'food', label: '먹이' },
      { id: 'care', label: '돌봄' },
      { id: 'toy', label: '장난감' },
      { id: 'wear', label: '꾸미기' },
      { id: 'bg', label: '배경' }
    ];
    var html = '<p class="sheet-lead">코인은 미니게임과 매일 접속으로 모을 수 있어요.</p>';
    cats.forEach(function (c) {
      var list = D.ITEMS.filter(function (i) { return i.cat === c.id; });
      if (!list.length) return;
      html += '<h3 class="sheet-h">' + c.label + '</h3><ul class="item-list">' +
        list.map(function (i) { return itemCard(i, 'shop'); }).join('') + '</ul>';
    });
    modal({
      title: '상점 · 코인 ' + G.state.coins, body: html, wide: true,
      onMount: function (body) {
        body.addEventListener('click', function (e) {
          var buy = e.target.closest('[data-buy]'), eq = e.target.closest('[data-equip]');
          if (buy) {
            var r = G.buy(buy.dataset.buy);
            toast(r.msg);
            if (r.ok) { if (window.SFX) SFX.coin(); G.save(); renderAll(); openShop(); }
            else if (window.SFX) SFX.bad();
          } else if (eq) {
            G.equip(eq.dataset.equip);
            if (window.SFX) SFX.tap();
            G.save(); renderAll(); openShop();
          }
        });
      }
    });
  }

  function openBag() {
    var s = G.state;
    var ids = Object.keys(s.inventory).filter(function (k) { return s.inventory[k] > 0; });
    var html = ids.length
      ? '<ul class="item-list">' + ids.map(function (id) { return itemCard(D.ITEM_MAP[id], 'bag'); }).join('') + '</ul>'
      : '<p class="empty">가방이 비었어요. 상점에서 먹이나 약을 사보세요.</p>';
    modal({
      title: '가방', body: html,
      onMount: function (body) {
        body.addEventListener('click', function (e) {
          var u = e.target.closest('[data-use]');
          if (!u) return;
          var r = G.useItem(u.dataset.use);
          toast(r.msg);
          if (r.ok) {
            if (r.fx) fx(r.fx);
            if (window.SFX) SFX[r.fx === 'eat' ? 'eat' : 'happy']();
            if (r.grew) celebrate(r.grew);
            G.save(); renderAll(); closeModal();
          } else if (window.SFX) SFX.bad();
        });
      }
    });
  }

  /* ================= 놀아주기 / 미니게임 ================= */
  function openPlay() {
    var html = '<button class="big-choice" type="button" data-quick><span aria-hidden="true">🤗</span><strong>같이 놀기</strong><span class="sub">바로 기분이 좋아져요 (무료)</span></button>' +
      '<h3 class="sheet-h">미니게임 — 코인 벌기</h3>' +
      D.GAMES.map(function (g) {
        var best = G.state.records.best[g.id];
        return '<button class="big-choice" type="button" data-game="' + g.id + '">' +
          '<span aria-hidden="true">' + g.emoji + '</span><strong>' + esc(g.name) + '</strong>' +
          '<span class="sub">' + esc(g.desc) + (best != null ? ' · 최고 ' + best : '') + '</span></button>';
      }).join('');
    modal({
      title: '놀아주기', body: html,
      onMount: function (body) {
        body.addEventListener('click', function (e) {
          var q = e.target.closest('[data-quick]'), g = e.target.closest('[data-game]');
          if (q) {
            var r = G.act('quickplay');
            toast(r.msg);
            if (r.ok) { fx('play'); if (window.SFX) SFX.happy(); if (r.grew) celebrate(r.grew); G.save(); renderAll(); closeModal(); }
            else if (window.SFX) SFX.bad();
          } else if (g) {
            startGame(g.dataset.game);
          }
        });
      }
    });
  }

  function startGame(id) {
    var meta = D.GAMES.filter(function (x) { return x.id === id; })[0];
    var body = modal({ title: meta.name, body: '<div id="mg-root" class="mg-root"></div>', wide: true });
    var root = body.querySelector('#mg-root');
    destroyGame = Minigames.open(id, root, function (res) {
      destroyGame = null;
      var s = G.state;
      s.records.games += 1;
      if (s.records.best[id] == null || res.score > s.records.best[id]) s.records.best[id] = res.score;
      var got = G.addCoins(res.coins);
      var grew = G.addExp(res.exp);
      if (G.pet && !G.pet.sleeping) {
        G.pet.happy = Math.min(100, G.pet.happy + 10);
        G.pet.energy = Math.max(0, G.pet.energy - 6);
        G.pet.care.played += 1;
      }
      G.save();
      if (window.SFX) SFX.coin();
      modal({
        title: '결과', body:
          '<div class="result"><p class="result-big">' + esc(res.label) + '</p>' +
          '<p class="result-coin"><i class="coin-dot"></i> +' + got + ' 코인 · 🌱 +' + res.exp + ' 성장</p>' +
          '<div class="result-btns"><button class="btn btn-primary" type="button" data-again="' + id + '">한 번 더</button>' +
          '<button class="btn btn-ghost" type="button" data-close2>돌아가기</button></div></div>',
        onMount: function (b2) {
          b2.querySelector('[data-again]').addEventListener('click', function () { startGame(id); });
          b2.querySelector('[data-close2]').addEventListener('click', function () { closeModal(); renderAll(); });
        }
      });
      renderAll();
    }, G.pet ? G.pet.name : '펫');
  }

  /* ================= 도감 / 메뉴 / 도움말 ================= */
  function openDex() {
    var s = G.state;
    var html = '<div class="dex-stats">' +
      '<div><b>' + s.records.feeds + '</b><span>밥</span></div>' +
      '<div><b>' + s.records.plays + '</b><span>놀이</span></div>' +
      '<div><b>' + s.records.washes + '</b><span>목욕</span></div>' +
      '<div><b>' + s.records.games + '</b><span>게임</span></div>' +
      '<div><b>' + s.records.coinsEarned + '</b><span>모은 코인</span></div></div>';
    html += '<h3 class="sheet-h">만난 친구들</h3>';
    if (!s.dex.length) {
      html += '<p class="empty">아직 기록이 없어요. 어른이 되면 도감에 남아요.</p>';
    } else {
      html += '<ul class="dex-list">' + s.dex.slice().reverse().map(function (d) {
        var sp = D.species(d.species);
        var label = d.stage === 'gone' ? '이별' : (d.stage === 'legend' ? '전설' : '어른');
        return '<li class="dex-item"><div class="dex-art">' + Pet.thumb(d.species, d.stage === 'gone' ? 'teen' : (d.stage === 'legend' ? 'legend' : 'adult'), d.stage === 'gone' ? 'sad' : 'joy') + '</div>' +
          '<div><strong>' + esc(d.name) + '</strong><span>' + esc(sp.name) + ' · ' + label + ' · ' + d.days + '일</span></div></li>';
      }).join('') + '</ul>';
    }
    html += '<h3 class="sheet-h">알 도감</h3><ul class="dex-list">' + D.SPECIES.map(function (sp) {
      return '<li class="dex-item"><div class="dex-art">' + Pet.thumb(sp.id, 'kid', 'joy') + '</div>' +
        '<div><strong>' + esc(sp.name) + '</strong><span>' + esc(sp.kind) + ' — ' + esc(sp.desc) + '</span></div></li>';
    }).join('') + '</ul>';
    modal({ title: '도감', body: html, wide: true });
  }

  function openHelp() {
    var html =
      '<h3 class="sheet-h">이렇게 키워요</h3>' +
      '<ol class="help-list">' +
      '<li><b>알을 톡톡</b> 두드리면 펫이 깨어나요.</li>' +
      '<li>게이지 4개(배부름·기분·청결·체력)를 채워주세요. 빨간색이 되면 병에 걸려요.</li>' +
      '<li>똥 💩 은 눌러서 바로 치울 수 있어요.</li>' +
      '<li>밤에는 🌙 재워주세요. 자는 동안 체력이 회복돼요.</li>' +
      '<li>아프면 💊 알약을 먹이세요.</li>' +
      '<li>돌볼수록 🌱 성장치가 올라 <b>알 → 아기 → 어린이 → 청소년 → 어른 → 전설</b> 순으로 자라요.</li>' +
      '</ol>' +
      '<h3 class="sheet-h">어른 모습이 갈려요</h3>' +
      '<ul class="help-list">' + D.FORMS.map(function (f) {
        return '<li><b>' + f.label + '형</b> — ' + f.desc + ' (' + f.bonus + ')</li>';
      }).join('') + '</ul>' +
      '<h3 class="sheet-h">알아두면 좋아요</h3>' +
      '<ul class="help-list">' + D.TIPS.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
    modal({ title: '도움말', body: html, wide: true });
  }

  function openMenu() {
    var s = G.state;
    var html =
      '<div class="menu-grid">' +
      '<button class="menu-btn" type="button" data-m="bag"><span>🎒</span>가방</button>' +
      '<button class="menu-btn" type="button" data-m="dex"><span>📖</span>도감</button>' +
      '<button class="menu-btn" type="button" data-m="help"><span>❓</span>도움말</button>' +
      '<button class="menu-btn" type="button" data-m="sound"><span>' + (s.sound ? '🔊' : '🔈') + '</span>소리 ' + (s.sound ? '켬' : '끔') + '</button>' +
      '<button class="menu-btn" type="button" data-m="rename"><span>✏️</span>이름 바꾸기</button>' +
      '<button class="menu-btn" type="button" data-m="install"><span>📲</span>홈 화면 추가</button>' +
      '</div>' +
      '<h3 class="sheet-h">난이도</h3>' +
      '<p class="sheet-lead">현재 <b>' + (s.mode === 'easy' ? '순한맛' : '매운맛') + '</b>. ' +
      (s.mode === 'easy' ? '펫은 절대 떠나지 않아요.' : '오래 방치하면 이별할 수 있어요.') + '</p>' +
      '<button class="btn btn-ghost btn-wide" type="button" data-m="mode">' +
      (s.mode === 'easy' ? '매운맛으로 바꾸기' : '순한맛으로 바꾸기') + '</button>' +
      '<h3 class="sheet-h">새로 시작</h3>' +
      '<p class="sheet-lead">지금 펫과 헤어지고 새 알을 받아요. 코인과 도감은 남습니다.</p>' +
      '<button class="btn btn-danger btn-wide" type="button" data-m="restart">새 알 받기</button>';

    modal({
      title: '메뉴', body: html,
      onMount: function (body) {
        body.addEventListener('click', function (e) {
          var b = e.target.closest('[data-m]');
          if (!b) return;
          var m = b.dataset.m;
          if (m === 'bag') return openBag();
          if (m === 'dex') return openDex();
          if (m === 'help') return openHelp();
          if (m === 'sound') { s.sound = !s.sound; if (window.SFX) SFX.setEnabled(s.sound); G.save(); return openMenu(); }
          if (m === 'mode') { s.mode = s.mode === 'easy' ? 'hard' : 'easy'; G.save(); renderAll(); return openMenu(); }
          if (m === 'install') return showInstallHelp();
          if (m === 'rename') return openRename();
          if (m === 'restart') return confirmRestart();
        });
      }
    });
  }

  function openRename() {
    modal({
      title: '이름 바꾸기',
      body: '<input id="rn" class="text-input" type="text" maxlength="8" value="' + esc(G.pet.name) + '" aria-label="새 이름">' +
            '<button class="btn btn-primary btn-wide" type="button" data-ok>바꾸기</button>',
      onMount: function (body) {
        body.querySelector('[data-ok]').addEventListener('click', function () {
          var v = (body.querySelector('#rn').value || '').trim().slice(0, 8);
          if (v) { G.pet.name = v; G.save(); renderAll(); toast('이름을 바꿨어요!'); }
          closeModal();
        });
      }
    });
  }

  function confirmRestart() {
    modal({
      title: '정말 새로 시작할까요?',
      body: '<p class="sheet-lead">지금 키우던 <b>' + esc(G.pet.name) + '</b>' + D.particle(G.pet.name, '과/와') + ' 헤어집니다. 되돌릴 수 없어요.</p>' +
            '<button class="btn btn-danger btn-wide" type="button" data-yes>네, 새 알을 받을게요</button>' +
            '<button class="btn btn-ghost btn-wide" type="button" data-no>아니요</button>',
      onMount: function (body) {
        body.querySelector('[data-yes]').addEventListener('click', function () {
          G.state.pet = null; G.save(); closeModal(); showIntro();
        });
        body.querySelector('[data-no]').addEventListener('click', closeModal);
      }
    });
  }

  function showInstallHelp() {
    var deferred = window.__pocoInstall;
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function () { window.__pocoInstall = null; });
      closeModal();
      return;
    }
    modal({
      title: '홈 화면에 추가하기',
      body: '<ul class="help-list">' +
        '<li><b>안드로이드(크롬)</b> — 주소창 오른쪽 ⋮ → <b>앱 설치</b> 또는 <b>홈 화면에 추가</b></li>' +
        '<li><b>아이폰(사파리)</b> — 아래 공유 버튼 <b>⬆︎</b> → <b>홈 화면에 추가</b></li>' +
        '<li><b>PC</b> — 주소창 오른쪽 설치 아이콘 클릭</li>' +
        '</ul><p class="sheet-lead">추가하면 앱처럼 전체 화면으로 열리고, 인터넷이 없어도 펫을 돌볼 수 있어요.</p>'
    });
  }

  /* ================= 성장 축하 / 복귀 리포트 / 이별 ================= */
  function celebrate(stageDef) {
    if (!stageDef) return;
    if (window.SFX) SFX.levelup();
    fx('⭐', 8);
    var p = G.pet;
    var form = (stageDef.id === 'adult' || stageDef.id === 'legend') && p.form ? D.form(p.form) : null;
    var title = stageDef.id === 'legend' ? '전설이 되었어요!' : stageDef.label + '(으)로 자랐어요!';
    modal({
      title: title,
      body: '<div class="grow"><div class="grow-art">' + Pet.thumb(p.species, stageDef.id, 'joy') + '</div>' +
        '<p class="grow-name">' + esc(p.name) + '</p>' +
        (form ? '<p class="grow-form"><b>' + form.label + '형</b> — ' + form.desc + '<br><span class="grow-bonus">특기: ' + form.bonus + '</span></p>' : '') +
        '<button class="btn btn-primary btn-wide" type="button" data-close3>좋아!</button></div>',
      onMount: function (b) { b.querySelector('[data-close3]').addEventListener('click', closeModal); }
    });
  }

  function awayReport(res) {
    var mins = Math.round(res.elapsed / 60000);
    if (mins < 25) return false;
    var b = res.before, a = res.after;
    var lines = [];
    function diff(label, from, to, unit) {
      var d = Math.round(to - from);
      if (Math.abs(d) < 2) return;
      lines.push('<li>' + label + ' <b class="' + (d < 0 ? 'down' : 'up') + '">' + (d > 0 ? '+' : '') + d + (unit || '') + '</b></li>');
    }
    diff('배부름', b.hunger, a.hunger);
    diff('기분', b.happy, a.happy);
    diff('청결', b.clean, a.clean);
    diff('체력', b.energy, a.energy);
    if (a.poops > b.poops) lines.push('<li>똥 <b class="down">' + (a.poops - b.poops) + '개</b> 나왔어요</li>');
    if (G.pet.sick) lines.push('<li><b class="down">감기에 걸렸어요</b> 💊 알약이 필요해요</li>');
    if (!lines.length) return false;

    var away = mins >= 60 ? Math.round(mins / 60) + '시간' : mins + '분';
    modal({
      title: '다녀오셨어요?',
      body: '<p class="sheet-lead"><b>' + away + '</b> 자리를 비운 사이 ' + esc(josa(G.pet.name, '은/는')) + '…</p>' +
            '<ul class="report">' + lines.join('') + '</ul>' +
            '<button class="btn btn-primary btn-wide" type="button" data-close4>돌봐주기</button>',
      onMount: function (bd) { bd.querySelector('[data-close4]').addEventListener('click', closeModal); }
    });
    return true;
  }

  function farewell() {
    var p = G.pet;
    modal({
      title: '이별',
      body: '<div class="grow"><div class="grow-art is-gone">' + Pet.thumb(p.species, 'teen', 'sad') + '</div>' +
        '<p class="sheet-lead">' + esc(josa(p.name, '은/는')) + ' ' + G.ageDays() + '일을 함께하고 별나라로 떠났어요.<br>도감에 기록이 남았습니다.</p>' +
        '<button class="btn btn-primary btn-wide" type="button" data-new>새 알 받기</button></div>',
      onMount: function (b) {
        b.querySelector('[data-new]').addEventListener('click', function () {
          G.state.pet = null; G.save(); closeModal(); showIntro();
        });
      }
    });
  }

  /* ================= 이벤트 연결 ================= */
  function bind() {
    document.querySelectorAll('.act').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var kind = btn.dataset.act;
        if (kind === 'shop') return openShop();
        if (kind === 'play') return openPlay();
        if (kind === 'heal') {
          if (!G.pet || !G.pet.sick) { toast('지금은 아프지 않아요.'); return; }
          if (G.has('pill')) {
            var r = G.useItem('pill');
            toast(r.msg); fx('heal'); if (window.SFX) SFX.happy();
            G.save(); renderAll();
          } else {
            toast('알약이 없어요. 상점에서 살 수 있어요.');
            openShop();
          }
          return;
        }
        var res = G.act(kind);
        if (!res.ok) { toast(res.msg); if (window.SFX) SFX.bad(); return; }
        if (res.fx) fx(res.fx);
        if (window.SFX) {
          if (res.fx === 'eat') SFX.eat();
          else if (res.fx === 'wash') SFX.wash();
          else if (res.fx === 'sleep') SFX.sleep();
          else if (res.fx === 'wake') SFX.wake();
          else SFX.happy();
        }
        if (!res.quiet) speech(res.msg, 2500);
        if (res.grew) celebrate(res.grew);
        G.save();
        renderAll();
      });
    });

    $('#pet-btn').addEventListener('click', function () {
      if (!G.pet) return;
      if (G.pet.stageIdx === 0) {
        var r = G.hatchTap();
        if (r === 'hatched') {
          if (window.SFX) SFX.hatch();
          fx('⭐', 8);
          G.save(); renderAll();
          modal({
            title: '태어났어요!',
            body: '<div class="grow"><div class="grow-art">' + Pet.thumb(G.pet.species, 'baby', 'joy') + '</div>' +
              '<p class="grow-name">' + esc(G.pet.name) + '</p>' +
              '<p class="sheet-lead">오늘부터 ' + esc(josa(G.pet.name, '을/를')) + ' 돌봐주세요. 밥과 놀이와 잠이 필요해요!</p>' +
              '<button class="btn btn-primary btn-wide" type="button" data-close5>반가워!</button></div>',
            onMount: function (b) { b.querySelector('[data-close5]').addEventListener('click', closeModal); }
          });
        } else {
          if (window.SFX) SFX.tap();
          fx('✨', 2);
          G.save(); renderAll();
          speech('톡… 톡… 금이 가고 있어요!', 1500);
        }
        return;
      }
      var res = G.act('pet');
      if (res.ok) { fx('heart', 2); if (window.SFX) SFX.tap(); }
      else toast(res.msg);
      G.save(); renderAll();
    });

    document.querySelector('[data-open="menu"]').addEventListener('click', openMenu);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modalRoot.hidden) closeModal();
    });
  }

  function init() {
    intro = $('#intro'); game = $('#game');
    modalRoot = $('#modal-root'); toastEl = $('#toast');
    buildIntro();
    bind();
  }

  return {
    init: init, renderAll: renderAll, toast: toast, speech: speech, fx: fx,
    celebrate: celebrate, awayReport: awayReport, farewell: farewell,
    showIntro: showIntro, showGame: showGame, modal: modal, closeModal: closeModal
  };
})();
