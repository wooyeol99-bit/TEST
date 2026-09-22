/* 우리집 강아지 — 화면 그리기와 모든 팝업 */
window.UI = (function () {
  'use strict';
  var D = window.DATA, G = window.Game, BR = window.BREEDS;
  var $ = function (q) { return document.querySelector(q); };
  var intro, game, modalRoot, toastEl, toastTimer, speechTimer, destroyGame = null;
  var pick = { breed: 'jindo', sex: 'f', mode: 'easy' };
  var sprite = null, spriteKey = '', rafId = 0, canvas, ctx;

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  function josa(w, p) { return D.josa(w, p); }
  function bar(v, cls) {
    return '<div class="minibar' + (cls ? ' ' + cls : '') + '"><i style="width:' + Math.round(v) + '%"></i></div>';
  }

  /* ================= 시작 화면 ================= */
  function buildIntro() {
    var wrap = $('#breed-picker');
    wrap.innerHTML = '';
    BR.LIST.forEach(function (b, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'breed' + (i === 0 ? ' is-on' : '');
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
      btn.dataset.id = b.id;
      var art = document.createElement('div');
      art.className = 'breed-art';
      art.appendChild(Dog.portrait(b, BR.stage(2), 120, 'idle'));
      btn.appendChild(art);
      var cap = document.createElement('span');
      cap.className = 'breed-cap';
      cap.innerHTML = '<strong>' + esc(b.name) + '</strong><span>' + esc(b.size === 'large' ? '대형견' : (b.size === 'medium' ? '중형견' : '소형견')) + '</span>';
      btn.appendChild(cap);
      btn.addEventListener('click', function () {
        pick.breed = b.id;
        wrap.querySelectorAll('.breed').forEach(function (n) {
          n.classList.toggle('is-on', n === btn);
          n.setAttribute('aria-checked', n === btn ? 'true' : 'false');
        });
        showBreedInfo(b);
        if (window.SFX) SFX.tap();
      });
      wrap.appendChild(btn);
    });
    showBreedInfo(BR.LIST[0]);

    document.querySelectorAll('.sex-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        pick.sex = b.dataset.sex;
        document.querySelectorAll('.sex-btn').forEach(function (n) {
          n.classList.toggle('is-on', n === b);
          n.setAttribute('aria-checked', n === b ? 'true' : 'false');
        });
      });
    });
    document.querySelectorAll('.mode-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        pick.mode = b.dataset.mode;
        document.querySelectorAll('.mode-btn').forEach(function (n) {
          n.classList.toggle('is-on', n === b);
          n.setAttribute('aria-checked', n === b ? 'true' : 'false');
        });
      });
    });

    $('#btn-start').addEventListener('click', function () {
      var name = ($('#dog-name').value || '').trim().slice(0, 8) || '강아지';
      G.create(pick.breed, name, pick.sex, pick.mode);
      if (window.SFX) SFX.hatch();
      showGame();
      spriteKey = '';
      renderAll();
      welcome();
    });
  }

  function trait(label, v) {
    var dots = '';
    for (var i = 1; i <= 5; i++) dots += '<i class="' + (i <= v ? 'on' : '') + '"></i>';
    return '<div class="trait"><span>' + label + '</span><div class="dots">' + dots + '</div></div>';
  }

  function showBreedInfo(b) {
    $('#breed-info').innerHTML =
      '<p class="bi-desc">' + esc(b.desc) + '</p>' +
      '<div class="bi-facts">' +
      '<span>원산지 <b>' + esc(b.origin) + '</b></span>' +
      '<span>성견 <b>' + b.adult.kg[0] + '~' + b.adult.kg[1] + 'kg</b></span>' +
      '<span>수명 <b>' + b.adult.life[0] + '~' + b.adult.life[1] + '년</b></span>' +
      '</div>' +
      '<div class="traits">' +
      trait('활동량', b.traits.energy) + trait('미용', b.traits.groom) +
      trait('훈련성', b.traits.train) + trait('친화력', b.traits.friendly) + trait('짖음', b.traits.bark) +
      '</div>';
  }

  function showIntro() { intro.hidden = false; game.hidden = true; stopLoop(); }
  function showGame() { intro.hidden = true; game.hidden = false; startLoop(); }

  /* ================= 강아지 그리기 ================= */
  function faceMood(m) {
    if (m === 'sleep' || m === 'sick' || m === 'joy' || m === 'sad') return m;
    if (m === 'hungry' || m === 'tired' || m === 'dirty') return 'sad';
    return 'idle';
  }

  function ensureSprite() {
    if (!G.dog) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var cssW = canvas.getBoundingClientRect().width || 280;
    var px = Math.max(160, Math.round(cssW * dpr));
    var m = faceMood(G.mood());
    var key = G.dog.breed + '|' + G.stageIdx() + '|' + m + '|' + px;
    if (key === spriteKey && sprite) return;
    if (canvas.width !== px) { canvas.width = canvas.height = px; }
    sprite = Dog.build({ breed: G.breed(), stage: G.stage(), size: px, mood: m });
    spriteKey = key;
  }

  function frame(t) {
    rafId = requestAnimationFrame(frame);
    if (!G.dog || game.hidden) return;
    ensureSprite();
    if (!sprite) return;
    Dog.paint(ctx, sprite, t, { mood: faceMood(G.mood()) });
  }
  function startLoop() { if (!rafId) rafId = requestAnimationFrame(frame); }
  function stopLoop() { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } }

  /* ================= 본 화면 ================= */
  function gaugeClass(v) { return v > 60 ? 'ok' : (v > 28 ? 'warn' : 'bad'); }

  function renderAll() {
    var s = G.state, d = s && s.dog;
    if (!d) { showIntro(); return; }
    var b = G.breed(), st = G.stage();

    $('#hud-name').textContent = d.name + (d.sex === 'm' ? ' ♂' : ' ♀');
    var weeks = G.ageWeeks();
    var ageTxt = weeks < 8 ? weeks + '주' : (weeks < 52 ? Math.max(1, Math.round(weeks / 4.345)) + '개월' : (weeks / 52).toFixed(1) + '살');
    $('#hud-meta').textContent = b.name + ' · ' + st.label + ' ' + ageTxt + (s.mode === 'hard' ? ' · 매운맛' : '');
    $('#hud-coins').querySelector('b').textContent = s.coins;

    var bg = D.BG_STYLE[s.equipped.bg] || D.BG_STYLE.bg_living;
    $('#stage-sky').style.background = bg.sky;
    $('#stage').style.setProperty('--floor', bg.floor);
    var hr = new Date().getHours();
    var nightNow = hr >= D.TUNE.sleepStartHour || hr < D.TUNE.sleepEndHour;
    $('#stage').classList.toggle('is-night', !!d.sleeping && nightNow);

    /* 어린 단계일수록 화면을 당겨서 보여준다 — 실제 크기 차이는 유지하되 너무 작게 보이지 않도록 */
    var zoom = (1 + (1 - st.grow) * 1.25).toFixed(3);
    $('#dog-btn').style.transform = 'translateX(-50%) scale(' + zoom + ')';
    $('#dog-shadow').style.transform = 'translateX(-50%) scale(' + zoom + ')';

    ensureSprite();

    /* 배변 */
    var poops = $('#poops');
    poops.innerHTML = '';
    d.poops.forEach(function (ts, i) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'poop'; btn.textContent = '💩';
      btn.setAttribute('aria-label', '치우기');
      var seed = Math.floor(ts / 997) + i * 37;
      btn.style.left = (10 + (seed % 72)) + '%';
      btn.style.bottom = (3 + (Math.floor(seed / 72) % 11)) + '%';
      btn.addEventListener('click', function () {
        G.cleanPoop(i);
        if (window.SFX) SFX.wash();
        fx('✨', 3); toast('치웠어요!'); G.save(); renderAll();
      });
      poops.appendChild(btn);
    });

    /* 상태 배지 */
    var badges = [];
    if (d.sick) badges.push(['🤒', '아파요']);
    if (G.vaccDue().length) badges.push(['💉', '접종 ' + G.vaccDue().length + '건']);
    if (G.heartwormDue()) badges.push(['🦟', '심장사상충약']);
    var ws = G.weightState();
    if (ws.id !== 'ok') badges.push([ws.id === 'fat' ? '⚖️' : '🥄', ws.label]);
    $('#badges').innerHTML = badges.map(function (x) {
      return '<span class="badge"><i aria-hidden="true">' + x[0] + '</i>' + esc(x[1]) + '</span>';
    }).join('');

    [['fill', d.fill], ['mood', d.mood], ['clean', d.clean], ['energy', d.energy]].forEach(function (p) {
      var g = document.querySelector('.gauge[data-key="' + p[0] + '"]');
      if (!g) return;
      g.querySelector('.g-bar i').style.width = Math.round(p[1]) + '%';
      g.className = 'gauge ' + gaugeClass(p[1]);
      g.dataset.key = p[0];
    });
    var nx = G.nextStage();
    document.querySelector('.gauge[data-key="exp"] .g-bar i').style.width = Math.round(G.expProgress() * 100) + '%';
    $('#exp-label').textContent = nx ? nx.label + '까지' : '다 자랐어요';

    var walkBtn = document.querySelector('[data-act="walk"]');
    if (walkBtn) walkBtn.classList.toggle('is-off', !G.canWalk().ok);
    var clinicBtn = document.querySelector('[data-act="clinic"]');
    if (clinicBtn) clinicBtn.classList.toggle('is-alert', d.sick || G.vaccDue().length > 0);

    var line = G.statusLine();
    if (line && !speechTimer) speech(line, 4200);
  }

  /* ================= 말풍선 / 토스트 / 효과 ================= */
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
    }, 2000);
  }
  var FX_CHAR = {
    eat: '🍚', play: '🎾', walk: '🐾', brush: '✨', bath: '🫧', clean: '✨',
    heart: '💗', sleep: '💤', wake: '☀️', train: '🎓', clinic: '💉', coin: '🪙'
  };
  function fx(kind, count) {
    var box = $('#fx'), ch = FX_CHAR[kind] || kind || '✨';
    for (var i = 0; i < (count || 5); i++) {
      (function (i) {
        var sp = document.createElement('span');
        sp.className = 'fx-item';
        sp.textContent = ch;
        sp.style.left = (28 + Math.random() * 44) + '%';
        sp.style.animationDelay = (i * 90) + 'ms';
        box.appendChild(sp);
        setTimeout(function () { sp.remove(); }, 1600 + i * 90);
      })(i);
    }
  }
  function sfxFor(kind) {
    if (!window.SFX) return;
    if (kind === 'eat') SFX.eat();
    else if (kind === 'bath' || kind === 'brush' || kind === 'clean') SFX.wash();
    else if (kind === 'sleep') SFX.sleep();
    else if (kind === 'wake') SFX.wake();
    else if (kind === 'clinic') SFX.bad();
    else SFX.happy();
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
    sheet.innerHTML = '<div class="sheet-head"><h2>' + esc(opts.title || '') + '</h2>' +
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

  /* 행동 결과 공통 처리 */
  function applyResult(r, opts) {
    opts = opts || {};
    if (!r.ok) {
      toast(r.msg);
      if (window.SFX) SFX.bad();
      if (r.fix === 'clinic') setTimeout(openClinic, 400);
      else if (r.fix === 'shop') setTimeout(openShop, 400);
      return false;
    }
    if (r.fx) { fx(r.fx); sfxFor(r.fx); }
    if (!r.quiet) (opts.toast ? toast : speech)(r.msg, 3000);
    G.save();
    renderAll();
    if (r.grew) celebrate(r.grew);
    if (opts.close) closeModal();
    return true;
  }

  /* ================= 밥주기 ================= */
  function openFeed() {
    var s = G.state, def = D.item(G.defaultFood());
    var inv = Object.keys(s.inventory).filter(function (k) {
      return s.inventory[k] > 0 && D.item(k) && D.item(k).cat === 'food';
    });
    var html = '<button class="big-choice" type="button" data-def><span aria-hidden="true">' + def.emoji + '</span>' +
      '<strong>' + esc(def.name) + ' 주기 (무료)</strong>' +
      '<span class="sub">지금 나이에 맞는 사료예요. ' + esc(def.desc) + '</span></button>';
    html += '<h3 class="sheet-h">가방 속 먹을 것</h3>';
    html += inv.length ? '<ul class="item-list">' + inv.map(function (id) {
      var it = D.item(id);
      var fit = !it.forStage || it.forStage.indexOf(G.stageIdx()) >= 0;
      return '<li class="item"><span class="item-emoji">' + it.emoji + '</span>' +
        '<span class="item-txt"><strong>' + esc(it.name) + '</strong><span>' +
        (fit ? '지금 나이에 딱 맞아요' : '<b class="warn-t">나이에 안 맞아요</b>') + ' · ' + s.inventory[id] + '개</span></span>' +
        '<button class="btn btn-mini" type="button" data-feed="' + id + '">주기</button></li>';
    }).join('') + '</ul>' : '<p class="empty">가방에 먹을 것이 없어요.</p>';
    html += '<p class="sheet-note">💡 강아지는 나이에 맞는 사료를 먹어야 해요. 간식을 많이 주면 살이 찝니다.</p>';

    modal({
      title: '밥주기', body: html, onMount: function (bd) {
        bd.addEventListener('click', function (e) {
          var def = e.target.closest('[data-def]'), f = e.target.closest('[data-feed]');
          if (def) applyResult(G.feed(), { close: true });
          else if (f) applyResult(G.feed(f.dataset.feed), { close: true });
        });
      }
    });
  }

  /* ================= 산책 ================= */
  function openWalk() {
    var chk = G.canWalk();
    if (!chk.ok) {
      modal({
        title: '아직 산책은…', body:
          '<p class="sheet-lead">' + esc(chk.why) + '</p>' +
          '<p class="sheet-note">💡 접종이 끝나기 전 강아지는 파보·홍역 같은 병에 취약합니다. ' +
          '3차 접종 뒤부터 바깥 산책을 시작하세요.</p>' +
          (chk.fix === 'clinic' ? '<button class="btn btn-primary btn-wide" type="button" data-go>병원 가기</button>' : ''),
        onMount: function (bd) {
          var g = bd.querySelector('[data-go]');
          if (g) g.addEventListener('click', openClinic);
        }
      });
      return;
    }
    var r = G.walk();
    if (!applyResult(r, { toast: false })) return;
    var d = G.dog;
    modal({
      title: '산책 다녀왔어요', body:
        '<div class="result"><p class="result-big">🐾 ' + esc(r.msg) + '</p>' +
        '<ul class="report">' +
        '<li>기분 <b class="up">+' + (16 + G.breed().traits.energy * 3) + '</b></li>' +
        '<li>체력 <b class="down">-' + (8 + G.breed().traits.energy * 2) + '</b></li>' +
        '<li>배변 <b class="up">밖에서 해결</b></li>' +
        '</ul>' +
        '<p class="sheet-note">💡 ' + esc(G.breed().name) + '은(는) 활동량이 ' + G.breed().traits.energy + '/5예요. ' +
        (G.breed().traits.energy >= 4 ? '하루 두 번은 나가야 해요.' : '짧은 산책으로도 충분해요.') + '</p>' +
        '<button class="btn btn-primary btn-wide" type="button" data-ok>좋아!</button></div>',
      onMount: function (bd) { bd.querySelector('[data-ok]').addEventListener('click', closeModal); }
    });
  }

  /* ================= 놀아주기 ================= */
  function openPlay() {
    var s = G.state;
    var toys = ['ball', 'tug', 'nose'].filter(function (id) { return s.tools[id]; });
    var html = '<button class="big-choice" type="button" data-hand><span aria-hidden="true">🤗</span>' +
      '<strong>손으로 놀아주기</strong><span class="sub">언제나 무료. 기분이 조금 좋아져요</span></button>';
    if (toys.length) {
      html += '<h3 class="sheet-h">장난감</h3>' + toys.map(function (id) {
        var it = D.item(id);
        return '<button class="big-choice" type="button" data-toy="' + id + '"><span aria-hidden="true">' + it.emoji + '</span>' +
          '<strong>' + esc(it.name) + '</strong><span class="sub">' + esc(it.desc) + '</span></button>';
      }).join('');
    }
    html += '<h3 class="sheet-h">미니게임 — 코인 벌기</h3>' + D.GAMES.map(function (g) {
      var best = s.records.best[g.id];
      return '<button class="big-choice" type="button" data-game="' + g.id + '"><span aria-hidden="true">' + g.emoji + '</span>' +
        '<strong>' + esc(g.name) + '</strong><span class="sub">' + esc(g.desc) + (best != null ? ' · 최고 ' + best : '') + '</span></button>';
    }).join('');

    modal({
      title: '놀아주기', body: html, onMount: function (bd) {
        bd.addEventListener('click', function (e) {
          var h = e.target.closest('[data-hand]'), t = e.target.closest('[data-toy]'), g = e.target.closest('[data-game]');
          if (h) applyResult(G.play(), { close: true });
          else if (t) applyResult(G.play(t.dataset.toy), { close: true });
          else if (g) startGame(g.dataset.game);
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
      var d = G.dog;
      if (d && !d.sleeping) {
        d.mood = Math.min(100, d.mood + 10);
        d.energy = Math.max(0, d.energy - 6);
        d.care.played += 1;
      }
      /* 훈련 게임은 실제 훈련도도 올려준다 */
      if (id === 'memory' && res.score > 0) {
        var target = D.TRICKS.filter(function (t) { return G.stageIdx() >= t.minStage && (d.tricks[t.id] || 0) < 100; })[0];
        if (target) G.train(target.id, res.score * 3);
      }
      G.save();
      if (window.SFX) SFX.coin();
      modal({
        title: '결과', body:
          '<div class="result"><p class="result-big">' + esc(res.label) + '</p>' +
          '<p class="result-coin"><i class="coin-dot"></i> +' + got + ' 코인 · 🌱 +' + res.exp + ' 성장</p>' +
          '<div class="result-btns"><button class="btn btn-primary" type="button" data-again>한 번 더</button>' +
          '<button class="btn btn-ghost" type="button" data-back>돌아가기</button></div></div>',
        onMount: function (b2) {
          b2.querySelector('[data-again]').addEventListener('click', function () { startGame(id); });
          b2.querySelector('[data-back]').addEventListener('click', function () { closeModal(); renderAll(); });
        }
      });
      renderAll();
    }, G.dog ? G.dog.name : '강아지');
  }

  /* ================= 미용 ================= */
  function openGroom() {
    var s = G.state, b = G.breed();
    var html = '<p class="sheet-lead">' + esc(b.name) + '의 미용 난이도는 <b>' + b.traits.groom + '/5</b>예요. ' +
      (b.traits.groom >= 4 ? '털이 잘 엉켜서 자주 빗어줘야 합니다.' : '가끔 빗어주면 충분합니다.') + '</p>' +
      '<button class="big-choice" type="button" data-brush><span aria-hidden="true">🪮</span><strong>빗질하기</strong>' +
      '<span class="sub">' + (s.tools.brush ? '청결 +30, 기분도 좋아져요' : '브러시가 필요해요 (상점 25코인)') + '</span></button>' +
      '<button class="big-choice" type="button" data-bath><span aria-hidden="true">🛁</span><strong>목욕시키기</strong>' +
      '<span class="sub">' + ((s.inventory.shampoo || 0) > 0 ? '샴푸 ' + s.inventory.shampoo + '개 보유 · 청결 100' : '샴푸가 필요해요 (상점 22코인)') + '</span></button>' +
      '<p class="sheet-note">💡 목욕은 2~3주에 한 번이면 충분해요. 너무 자주 씻기면 피부가 건조해집니다.</p>';
    modal({
      title: '빗질과 목욕', body: html, onMount: function (bd) {
        bd.querySelector('[data-brush]').addEventListener('click', function () { applyResult(G.groom('brush'), { close: true }); });
        bd.querySelector('[data-bath]').addEventListener('click', function () { applyResult(G.groom('bath'), { close: true }); });
      }
    });
  }

  /* ================= 훈련 ================= */
  function openTrain() {
    var d = G.dog, idx = G.stageIdx();
    var html = '<p class="sheet-lead">훈련은 짧고 즐겁게. 한 번에 5분이면 충분해요.</p><ul class="trick-list">';
    D.TRICKS.forEach(function (tr) {
      var val = d.tricks[tr.id] || 0;
      var locked = idx < tr.minStage;
      html += '<li class="trick' + (locked ? ' is-locked' : '') + (val >= 100 ? ' is-done' : '') + '">' +
        '<span class="trick-ico">' + tr.emoji + '</span>' +
        '<div class="trick-body"><strong>' + esc(tr.name) + (val >= 100 ? ' ✅' : '') + '</strong>' +
        '<span>' + esc(locked ? BR.stage(tr.minStage).label + '부터 배울 수 있어요' : tr.about) + '</span>' +
        bar(val) + '</div>' +
        (locked ? '<span class="lock">🔒</span>' : '<button class="btn btn-mini" type="button" data-train="' + tr.id + '">연습</button>') +
        '</li>';
    });
    html += '</ul><button class="big-choice" type="button" data-game><span aria-hidden="true">🧠</span>' +
      '<strong>훈련 순서 게임</strong><span class="sub">집중해서 하면 훈련도가 크게 올라요</span></button>' +
      '<p class="sheet-note">💡 ' + esc(G.breed().name) + '의 훈련성은 <b>' + G.breed().traits.train + '/5</b>. 숫자가 높을수록 빨리 배웁니다.</p>';

    modal({
      title: '훈련 · 평균 ' + G.trickAvg() + '%', body: html, wide: true, onMount: function (bd) {
        bd.addEventListener('click', function (e) {
          var t = e.target.closest('[data-train]'), g = e.target.closest('[data-game]');
          if (t) {
            var r = G.train(t.dataset.train);
            if (applyResult(r, { toast: true })) { if (r.mastered) fx('🎓', 8); openTrain(); }
          } else if (g) startGame('memory');
        });
      }
    });
  }

  /* ================= 병원 ================= */
  function openClinic() {
    var d = G.dog, s = G.state;
    var html = '';
    if (d.sick) {
      html += '<div class="alert-box"><strong>🤒 지금 아파요</strong>' +
        '<p>' + esc(josa(d.name, '은/는')) + ' 기운이 없어요. 바로 진료를 받으세요.</p>' +
        '<button class="btn btn-primary btn-wide" type="button" data-treat>진료받기 (약 or 40코인)</button></div>';
    }
    html += '<h3 class="sheet-h">예방접종 수첩</h3><ul class="vacc-list">';
    D.VACCINES.forEach(function (v) {
      var done = G.vaccDone(v.id);
      var ready = !done && G.stageIdx() >= v.need;
      var late = !done && G.stageIdx() > v.need;
      html += '<li class="vacc' + (done ? ' is-done' : (late ? ' is-late' : '')) + '">' +
        '<div><strong>' + esc(v.name) + (done ? ' ✅' : (late ? ' ⚠️' : '')) + '</strong>' +
        '<span>생후 ' + v.week + '주 · ' + esc(v.about) + '</span></div>' +
        (done ? '<span class="vacc-ok">완료</span>'
          : (ready ? '<button class="btn btn-mini" type="button" data-vacc="' + v.id + '"><i class="coin-dot"></i>' + v.price + '</button>'
            : '<span class="vacc-wait">아직</span>')) + '</li>';
    });
    html += '</ul>';
    html += '<h3 class="sheet-h">기생충 예방</h3>' +
      '<div class="item"><span class="item-emoji">🦟</span><span class="item-txt"><strong>심장사상충약</strong>' +
      '<span>' + (G.heartwormDue() ? '<b class="warn-t">복용할 때가 지났어요</b>' : '아직 여유 있어요') +
      ' · 보유 ' + (s.inventory.heart || 0) + '개</span></span>' +
      '<button class="btn btn-mini" type="button" data-hw>먹이기</button></div>' +
      '<p class="sheet-note">💡 접종은 2주 간격으로 3~5회. 3차가 끝나야 바깥 산책을 시작할 수 있어요. 광견병은 법으로 정해진 필수 접종입니다.</p>';

    modal({
      title: '병원', body: html, wide: true, onMount: function (bd) {
        bd.addEventListener('click', function (e) {
          var v = e.target.closest('[data-vacc]');
          if (v) { if (applyResult(G.vaccinate(v.dataset.vacc), { toast: true })) openClinic(); return; }
          if (e.target.closest('[data-treat]')) { applyResult(G.treat(), { toast: true, close: true }); return; }
          if (e.target.closest('[data-hw]')) { applyResult(G.heartworm(), { toast: true }); openClinic(); }
        });
      }
    });
  }

  /* ================= 상점 / 가방 ================= */
  function itemRow(it) {
    var s = G.state;
    var owned = (it.slot && s.owned[it.id]) || (it.tool && s.tools[it.id]);
    var equipped = it.slot && s.equipped[it.slot] === it.id;
    var right = owned
      ? (it.slot ? '<button class="btn btn-ghost" type="button" data-equip="' + it.id + '">' + (equipped ? '사용 중' : '사용') + '</button>'
        : '<span class="vacc-ok">보유</span>')
      : '<button class="btn btn-mini" type="button" data-buy="' + it.id + '"><i class="coin-dot"></i>' + it.price + '</button>';
    return '<li class="item' + (equipped ? ' is-equipped' : '') + '">' +
      '<span class="item-emoji" aria-hidden="true">' + it.emoji + '</span>' +
      '<span class="item-txt"><strong>' + esc(it.name) + '</strong><span>' + esc(it.desc) + '</span></span>' + right + '</li>';
  }

  function openShop() {
    var cats = [['food', '사료와 간식'], ['care', '돌봄 용품'], ['toy', '장난감'], ['gear', '산책 용품'], ['wear', '꾸미기'], ['bg', '공간']];
    var html = '<p class="sheet-lead">코인은 미니게임과 매일 접속으로 모을 수 있어요.</p>';
    cats.forEach(function (c) {
      var list = D.ITEMS.filter(function (i) { return i.cat === c[0]; });
      if (!list.length) return;
      html += '<h3 class="sheet-h">' + c[1] + '</h3><ul class="item-list">' + list.map(itemRow).join('') + '</ul>';
    });
    modal({
      title: '상점 · 코인 ' + G.state.coins, body: html, wide: true, onMount: function (bd) {
        bd.addEventListener('click', function (e) {
          var b = e.target.closest('[data-buy]'), q = e.target.closest('[data-equip]');
          if (b) {
            var r = G.buy(b.dataset.buy);
            toast(r.msg);
            if (window.SFX) r.ok ? SFX.coin() : SFX.bad();
            if (r.ok) { G.save(); renderAll(); openShop(); }
          } else if (q) { G.equip(q.dataset.equip); if (window.SFX) SFX.tap(); G.save(); renderAll(); openShop(); }
        });
      }
    });
  }

  function openBag() {
    var s = G.state;
    var ids = Object.keys(s.inventory).filter(function (k) { return s.inventory[k] > 0 && D.item(k); });
    var tools = Object.keys(s.tools).filter(function (k) { return s.tools[k]; });
    var html = ids.length ? '<h3 class="sheet-h">소모품</h3><ul class="item-list">' + ids.map(function (id) {
      var it = D.item(id);
      return '<li class="item"><span class="item-emoji">' + it.emoji + '</span>' +
        '<span class="item-txt"><strong>' + esc(it.name) + '</strong><span>' + esc(it.desc) + ' · ' + s.inventory[id] + '개</span></span>' +
        '<button class="btn btn-mini" type="button" data-use="' + id + '">사용</button></li>';
    }).join('') + '</ul>' : '<p class="empty">소모품이 없어요.</p>';
    if (tools.length) {
      html += '<h3 class="sheet-h">가지고 있는 도구</h3><ul class="item-list">' + tools.map(function (id) {
        var it = D.item(id);
        return '<li class="item"><span class="item-emoji">' + it.emoji + '</span>' +
          '<span class="item-txt"><strong>' + esc(it.name) + '</strong><span>' + esc(it.desc) + '</span></span>' +
          '<span class="vacc-ok">보유</span></li>';
      }).join('') + '</ul>';
    }
    modal({
      title: '가방', body: html, onMount: function (bd) {
        bd.addEventListener('click', function (e) {
          var u = e.target.closest('[data-use]');
          if (u) applyResult(G.useItem(u.dataset.use), { toast: true, close: true });
        });
      }
    });
  }

  /* ================= 수첩 ================= */
  function openBook() {
    var d = G.dog, b = G.breed(), s = G.state, st = G.stage(), ws = G.weightState();
    var html = '<div class="book-top"><div class="book-art" id="book-art"></div>' +
      '<div><strong class="book-name">' + esc(d.name) + '</strong>' +
      '<span class="book-sub">' + esc(b.name) + ' · ' + (d.sex === 'm' ? '남아' : '여아') + ' · ' + G.ageWeeks() + '주</span>' +
      '<span class="book-sub">함께한 지 ' + G.ageDays() + '일</span></div></div>';

    html += '<h3 class="sheet-h">지금 시기 — ' + esc(st.label) + ' (' + esc(st.ageText) + ')</h3>' +
      '<p class="sheet-lead">' + esc(st.about) + '</p>' +
      '<ul class="help-list">' + st.care.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>';

    html += '<h3 class="sheet-h">몸무게</h3>' +
      '<div class="weight-row"><b>' + d.weight.toFixed(2) + 'kg</b>' +
      '<span>적정 ' + ws.target.toFixed(2) + 'kg · <b class="' + (ws.id === 'ok' ? 'up' : 'down') + '">' + ws.label + '</b></span></div>' +
      '<p class="sheet-note">성견 기준 ' + b.adult.kg[0] + '~' + b.adult.kg[1] + 'kg / 키 ' + b.adult.cm[0] + '~' + b.adult.cm[1] + 'cm</p>';

    var doneV = D.VACCINES.filter(function (v) { return G.vaccDone(v.id); }).length;
    html += '<h3 class="sheet-h">접종 ' + doneV + '/' + D.VACCINES.length + '</h3>' + bar(doneV / D.VACCINES.length * 100);
    html += '<h3 class="sheet-h">훈련 평균 ' + G.trickAvg() + '%</h3>' + bar(G.trickAvg());

    html += '<h3 class="sheet-h">돌본 기록</h3><div class="dex-stats">' +
      '<div><b>' + s.records.feeds + '</b><span>밥</span></div>' +
      '<div><b>' + s.records.walks + '</b><span>산책</span></div>' +
      '<div><b>' + s.records.grooms + '</b><span>미용</span></div>' +
      '<div><b>' + s.records.trains + '</b><span>훈련</span></div>' +
      '<div><b>' + s.records.vaccines + '</b><span>접종</span></div></div>';

    html += '<h3 class="sheet-h">' + esc(b.name) + ' 알아두기</h3>' +
      '<p class="sheet-lead">' + esc(b.desc) + '</p><p class="sheet-note">💡 ' + esc(b.note) + '</p>';

    if (s.dex.length) {
      html += '<h3 class="sheet-h">지난 아이들</h3><ul class="dex-list">' + s.dex.slice().reverse().map(function (x) {
        var bb = BR.breed(x.breed);
        return '<li class="dex-item"><div class="dex-art" data-dex="' + x.breed + '"></div>' +
          '<div><strong>' + esc(x.name) + '</strong><span>' + esc(bb.name) + ' · ' +
          (x.stage === 'gone' ? '이별' : '성견 달성') + ' · ' + x.days + '일 · 훈련 ' + x.tricks + '%</span></div></li>';
      }).join('') + '</ul>';
    }

    modal({
      title: '강아지 수첩', body: html, wide: true, onMount: function (bd) {
        var art = bd.querySelector('#book-art');
        if (art) art.appendChild(Dog.portrait(b, st, 140, 'idle'));
        bd.querySelectorAll('[data-dex]').forEach(function (n) {
          n.appendChild(Dog.portrait(BR.breed(n.dataset.dex), BR.stage(5), 60, 'idle'));
        });
      }
    });
  }

  /* ================= 메뉴 ================= */
  function openMenu() {
    var s = G.state;
    var html = '<div class="menu-grid">' +
      '<button class="menu-btn" type="button" data-m="bag"><span>🎒</span>가방</button>' +
      '<button class="menu-btn" type="button" data-m="sleep"><span>' + (G.dog.sleeping ? '☀️' : '🌙') + '</span>' + (G.dog.sleeping ? '깨우기' : '재우기') + '</button>' +
      '<button class="menu-btn" type="button" data-m="help"><span>❓</span>도움말</button>' +
      '<button class="menu-btn" type="button" data-m="sound"><span>' + (s.sound ? '🔊' : '🔈') + '</span>소리 ' + (s.sound ? '켬' : '끔') + '</button>' +
      '<button class="menu-btn" type="button" data-m="rename"><span>✏️</span>이름 바꾸기</button>' +
      '<button class="menu-btn" type="button" data-m="install"><span>📲</span>홈 화면 추가</button>' +
      '</div>' +
      '<h3 class="sheet-h">난이도</h3><p class="sheet-lead">현재 <b>' + (s.mode === 'easy' ? '순한맛' : '매운맛') + '</b>. ' +
      (s.mode === 'easy' ? '무슨 일이 있어도 이별하지 않아요.' : '오래 방치하면 이별할 수 있어요.') + '</p>' +
      '<button class="btn btn-ghost btn-wide" type="button" data-m="mode">' + (s.mode === 'easy' ? '매운맛으로 바꾸기' : '순한맛으로 바꾸기') + '</button>' +
      '<h3 class="sheet-h">새로 시작</h3><p class="sheet-lead">지금 아이와 헤어지고 새 강아지를 데려옵니다. 코인과 기록은 남아요.</p>' +
      '<button class="btn btn-danger btn-wide" type="button" data-m="restart">새 강아지 데려오기</button>';

    modal({
      title: '메뉴', body: html, onMount: function (bd) {
        bd.addEventListener('click', function (e) {
          var b = e.target.closest('[data-m]');
          if (!b) return;
          var m = b.dataset.m;
          if (m === 'bag') return openBag();
          if (m === 'help') return openHelp();
          if (m === 'sleep') { applyResult(G.sleepToggle(), { toast: true, close: true }); return; }
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
      body: '<input id="rn" class="text-input" type="text" maxlength="8" value="' + esc(G.dog.name) + '" aria-label="새 이름">' +
        '<button class="btn btn-primary btn-wide" type="button" data-ok>바꾸기</button>',
      onMount: function (bd) {
        bd.querySelector('[data-ok]').addEventListener('click', function () {
          var v = (bd.querySelector('#rn').value || '').trim().slice(0, 8);
          if (v) { G.dog.name = v; G.save(); renderAll(); toast('이름을 바꿨어요!'); }
          closeModal();
        });
      }
    });
  }

  function confirmRestart() {
    modal({
      title: '정말 새로 시작할까요?',
      body: '<p class="sheet-lead">지금 키우던 <b>' + esc(G.dog.name) + '</b>' + D.particle(G.dog.name, '과/와') + ' 헤어집니다. 되돌릴 수 없어요.</p>' +
        '<button class="btn btn-danger btn-wide" type="button" data-yes>네, 새 강아지를 데려올게요</button>' +
        '<button class="btn btn-ghost btn-wide" type="button" data-no>아니요</button>',
      onMount: function (bd) {
        bd.querySelector('[data-yes]').addEventListener('click', function () {
          G.state.dog = null; G.save(); closeModal(); showIntro();
        });
        bd.querySelector('[data-no]').addEventListener('click', closeModal);
      }
    });
  }

  function openHelp() {
    var html = '<h3 class="sheet-h">이렇게 키워요</h3><ol class="help-list">' +
      '<li>갓 태어난 아이는 <b>거의 잠만 자고 분유</b>를 먹어요. 따뜻하게만 해주세요.</li>' +
      '<li>게이지 4개(포만감·기분·청결·체력)를 채워주세요. 빨간색이 되면 병에 걸려요.</li>' +
      '<li><b>나이에 맞는 사료</b>를 주세요. 분유 → 이유식 → 퍼피 사료 → 성견 사료.</li>' +
      '<li>병원에서 <b>예방접종</b>을 받으세요. 3차가 끝나야 산책을 나갈 수 있어요.</li>' +
      '<li>산책은 운동이자 화장실이자 사회화예요. 견종마다 필요한 양이 다릅니다.</li>' +
      '<li>훈련은 앉아 → 기다려 → 손 → 이리와 순서로. 훈련성이 높은 견종은 빨리 배워요.</li>' +
      '<li>💩는 눌러서 치우고, 장모종은 자주 빗어주세요.</li></ol>' +
      '<h3 class="sheet-h">성장 6단계</h3><ul class="help-list">' +
      BR.STAGES.map(function (st) {
        return '<li><b>' + esc(st.label) + '</b> (' + esc(st.ageText) + ') — ' + esc(st.about) + '</li>';
      }).join('') + '</ul>' +
      '<h3 class="sheet-h">진짜 강아지 상식</h3><ul class="help-list">' +
      D.TIPS.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
    modal({ title: '도움말', body: html, wide: true });
  }

  function showInstallHelp() {
    var deferred = window.__dogInstall;
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function () { window.__dogInstall = null; });
      closeModal();
      return;
    }
    modal({
      title: '홈 화면에 추가하기',
      body: '<ul class="help-list">' +
        '<li><b>안드로이드(크롬)</b> — 주소창 오른쪽 ⋮ → <b>앱 설치</b></li>' +
        '<li><b>아이폰(사파리)</b> — 공유 버튼 ⬆︎ → <b>홈 화면에 추가</b></li>' +
        '<li><b>PC</b> — 주소창 오른쪽 설치 아이콘</li></ul>' +
        '<p class="sheet-lead">추가하면 앱처럼 전체 화면으로 열리고, 인터넷이 없어도 강아지를 돌볼 수 있어요.</p>'
    });
  }

  /* ================= 이벤트 팝업 ================= */
  function welcome() {
    var d = G.dog, b = G.breed();
    modal({
      title: '새 식구가 왔어요', body:
        '<div class="grow"><div class="grow-art" id="wart"></div>' +
        '<p class="grow-name">' + esc(d.name) + '</p>' +
        '<p class="sheet-lead">' + esc(b.name) + ' ' + (d.sex === 'm' ? '남아' : '여아') + '. 태어난 지 며칠 안 됐어요.<br>' +
        '눈도 못 뜨고 하루 종일 잠만 잡니다. 분유부터 먹여주세요.</p>' +
        '<button class="btn btn-primary btn-wide" type="button" data-ok>잘 키워볼게!</button></div>',
      onMount: function (bd) {
        bd.querySelector('#wart').appendChild(Dog.portrait(b, BR.stage(0), 150, 'sleep'));
        bd.querySelector('[data-ok]').addEventListener('click', closeModal);
      }
    });
  }

  function celebrate(stageDef) {
    if (!stageDef) return;
    if (window.SFX) SFX.levelup();
    fx('⭐', 8);
    var d = G.dog, b = G.breed();
    modal({
      title: esc(stageDef.label) + '이(가) 되었어요!',
      body: '<div class="grow"><div class="grow-art" id="gart"></div>' +
        '<p class="grow-name">' + esc(d.name) + ' · ' + esc(stageDef.ageText) + '</p>' +
        '<p class="sheet-lead">' + esc(stageDef.about) + '</p>' +
        '<ul class="help-list">' + stageDef.care.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' +
        '<button class="btn btn-primary btn-wide" type="button" data-ok>좋아!</button></div>',
      onMount: function (bd) {
        bd.querySelector('#gart').appendChild(Dog.portrait(b, stageDef, 160, 'joy'));
        bd.querySelector('[data-ok]').addEventListener('click', closeModal);
      }
    });
  }

  function awayReport(res) {
    var mins = Math.round(res.elapsed / 60000);
    if (mins < 25) return false;
    var a = res.after, bfr = res.before, lines = [];
    function diff(label, from, to) {
      var dd = Math.round(to - from);
      if (Math.abs(dd) < 2) return;
      lines.push('<li>' + label + ' <b class="' + (dd < 0 ? 'down' : 'up') + '">' + (dd > 0 ? '+' : '') + dd + '</b></li>');
    }
    diff('포만감', bfr.fill, a.fill);
    diff('기분', bfr.mood, a.mood);
    diff('청결', bfr.clean, a.clean);
    diff('체력', bfr.energy, a.energy);
    if (a.poops > bfr.poops) lines.push('<li>배변 <b class="down">' + (a.poops - bfr.poops) + '번</b></li>');
    if (G.dog.sick) lines.push('<li><b class="down">아파요</b> 병원에 가야 해요</li>');
    if (!lines.length) return false;
    var away = mins >= 60 ? Math.round(mins / 60) + '시간' : mins + '분';
    modal({
      title: '다녀오셨어요?',
      body: '<p class="sheet-lead"><b>' + away + '</b> 자리를 비운 사이 ' + esc(josa(G.dog.name, '은/는')) + '…</p>' +
        '<ul class="report">' + lines.join('') + '</ul>' +
        '<button class="btn btn-primary btn-wide" type="button" data-ok>돌봐주기</button>',
      onMount: function (bd) { bd.querySelector('[data-ok]').addEventListener('click', closeModal); }
    });
    return true;
  }

  function farewell() {
    var d = G.dog, b = G.breed();
    modal({
      title: '무지개다리',
      body: '<div class="grow"><div class="grow-art is-gone" id="fart"></div>' +
        '<p class="sheet-lead">' + esc(josa(d.name, '은/는')) + ' ' + G.ageDays() + '일을 함께하고 무지개다리를 건넜어요.<br>수첩에 기록이 남았습니다.</p>' +
        '<button class="btn btn-primary btn-wide" type="button" data-new>새 강아지 데려오기</button></div>',
      onMount: function (bd) {
        bd.querySelector('#fart').appendChild(Dog.portrait(b, G.stage(), 150, 'sad'));
        bd.querySelector('[data-new]').addEventListener('click', function () {
          G.state.dog = null; G.save(); closeModal(); showIntro();
        });
      }
    });
  }

  /* ================= 연결 ================= */
  function bind() {
    document.querySelectorAll('.act').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var k = btn.dataset.act;
        if (k === 'feed') return openFeed();
        if (k === 'walk') return openWalk();
        if (k === 'play') return openPlay();
        if (k === 'groom') return openGroom();
        if (k === 'train') return openTrain();
        if (k === 'clinic') return openClinic();
        if (k === 'shop') return openShop();
        if (k === 'book') return openBook();
      });
    });
    $('#dog-btn').addEventListener('click', function () {
      if (!G.dog) return;
      var r = G.pat();
      if (r.ok) { fx('heart', 2); if (window.SFX) SFX.tap(); G.save(); }
      else if (G.dog.sleeping) speech('쉿— 자는 중이에요.', 1600);
      renderAll();
    });
    document.querySelector('[data-open="menu"]').addEventListener('click', openMenu);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modalRoot.hidden) closeModal();
    });
    window.addEventListener('resize', function () { spriteKey = ''; });
  }

  function init() {
    intro = $('#intro'); game = $('#game');
    modalRoot = $('#modal-root'); toastEl = $('#toast');
    canvas = $('#dog-canvas'); ctx = canvas.getContext('2d');
    buildIntro();
    bind();
  }

  return {
    init: init, renderAll: renderAll, toast: toast, speech: speech, fx: fx,
    celebrate: celebrate, awayReport: awayReport, farewell: farewell,
    showIntro: showIntro, showGame: showGame, modal: modal, closeModal: closeModal,
    startLoop: startLoop, stopLoop: stopLoop
  };
})();
