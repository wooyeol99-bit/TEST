/* 우리집 강아지 — 세이브 데이터와 시간 시뮬레이션 */
window.Game = (function () {
  'use strict';
  var D = window.DATA, BR = window.BREEDS;
  var KEY = 'dogpet.save.v2';
  var HOUR = 3600000, MIN = 60000;
  var s = null;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function now() { return Date.now(); }
  function dayKey(ts) { var d = new Date(ts); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

  /* 단계별 목표 체중 비율 */
  var WFRAC = [0.03, 0.08, 0.25, 0.55, 0.85, 1.0];
  function adultKg(b) { return (b.adult.kg[0] + b.adult.kg[1]) / 2; }
  function targetWeight(b, idx) { return +(adultKg(b) * WFRAC[idx]).toFixed(2); }

  function defaults() {
    return {
      v: 2, created: now(), lastTick: now(), lastBonusDay: '',
      coins: 80, mode: 'easy', sound: true,
      inventory: { milk: 4, mush: 2, pad: 2 },
      tools: { brush: false, ball: false, tug: false, nose: false },
      owned: { bg_living: true, leash_basic: true },
      equipped: { bg: 'bg_living', leash: 'leash_basic', wear: null },
      records: { feeds: 0, walks: 0, grooms: 0, plays: 0, trains: 0, games: 0, best: {}, coinsEarned: 0, vaccines: 0 },
      dex: [],
      dog: null
    };
  }

  function newDog(breedId, name, sex) {
    var b = BR.breed(breedId), t = now();
    var tricks = {};
    D.TRICKS.forEach(function (tr) { tricks[tr.id] = 0; });
    return {
      breed: breedId, name: name || '강아지', sex: sex || 'f',
      born: t, stageIdx: 0, exp: 0,
      fill: 70, mood: 70, clean: 92, energy: 75, health: 100,
      weight: targetWeight(b, 0),
      sick: false, sleeping: true, poops: [], nextPoopAt: t + D.TUNE.poopEveryH * HOUR,
      vacc: {}, lastHeartworm: 0,
      tricks: tricks,
      lastWalk: 0, lastGroom: 0, lastBath: 0, lastPlay: 0,
      care: { fed: 0, walked: 0, played: 0, groomed: 0, trained: 0 },
      zeroSince: 0, dead: false, deadAt: 0, cause: ''
    };
  }

  /* ---------- 저장 ---------- */
  function save() { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) {}
    if (!raw) { s = defaults(); return false; }
    try {
      var p = JSON.parse(raw);
      s = Object.assign(defaults(), p);
      s.inventory = p.inventory || {};
      s.tools = Object.assign({}, defaults().tools, p.tools || {});
      s.owned = Object.assign({ bg_living: true, leash_basic: true }, p.owned || {});
      s.equipped = Object.assign(defaults().equipped, p.equipped || {});
      s.records = Object.assign(defaults().records, p.records || {});
      return !!s.dog;
    } catch (e) { s = defaults(); return false; }
  }

  /* ---------- 조회 ---------- */
  function dog() { return s && s.dog; }
  function breed() { return BR.breed(s.dog.breed); }
  function stageIdx() { return s.dog ? s.dog.stageIdx : 0; }
  function stage() { return BR.stage(stageIdx()); }
  function nextStage() { return BR.STAGES[stageIdx() + 1] || null; }
  function ageMs() { return s.dog ? now() - s.dog.born : 0; }
  function ageDays() { return Math.floor(ageMs() / 86400000); }
  function ageHours() { return ageMs() / HOUR; }
  /* 게임 속 개의 나이(주) — 단계와 진행도로 환산해 보여준다 */
  function ageWeeks() {
    var st = stage(), nx = nextStage();
    if (!nx) return st.weeks + Math.floor(ageHours() / 24) * 2;
    return Math.round(st.weeks + (nx.weeks - st.weeks) * expProgress());
  }
  function expProgress() {
    var nx = nextStage();
    if (!nx) return 1;
    var cur = stage().exp;
    return clamp((s.dog.exp - cur) / Math.max(1, nx.exp - cur), 0, 1);
  }

  function vaccDone(id) { return !!(s.dog && s.dog.vacc[id]); }
  function vaccDue() {
    if (!s.dog) return [];
    return D.VACCINES.filter(function (v) { return !vaccDone(v.id) && stageIdx() >= v.need; });
  }
  function vaccOverdue() {
    return D.VACCINES.filter(function (v) { return !vaccDone(v.id) && stageIdx() > v.need; }).length;
  }
  function canWalk() {
    if (!s.dog) return { ok: false, why: '' };
    if (stageIdx() < 3) return { ok: false, why: '아직 너무 어려요. 유년기부터 산책할 수 있어요.' };
    if (!vaccDone('dhppl3')) return { ok: false, why: '종합백신 3차 전에는 밖이 위험해요. 병원부터 다녀오세요.', fix: 'clinic' };
    var left = D.TUNE.walkCooldownMin * MIN - (now() - s.dog.lastWalk);
    if (left > 0) return { ok: false, why: '방금 다녀왔어요. ' + Math.ceil(left / MIN) + '분 뒤에 또 나가요.' };
    return { ok: true };
  }
  function heartwormDue() {
    if (!s.dog || stageIdx() < 2) return false;
    return now() - (s.dog.lastHeartworm || s.dog.born) > D.TUNE.heartwormDays * 86400000 / 24;
    /* 게임 시간 가속: 실제 30일 → 체감 30시간 */
  }
  function weightState() {
    var t = targetWeight(breed(), stageIdx());
    var r = s.dog.weight / Math.max(0.05, t);
    if (r > 1.22) return { id: 'fat', label: '과체중', target: t };
    if (r < 0.8) return { id: 'thin', label: '저체중', target: t };
    return { id: 'ok', label: '적정', target: t };
  }
  function trickAvg() {
    var ks = Object.keys(s.dog.tricks), sum = 0, n = 0;
    D.TRICKS.forEach(function (tr) {
      if (stageIdx() >= tr.minStage) { sum += s.dog.tricks[tr.id] || 0; n++; }
    });
    return n ? Math.round(sum / n) : 0;
  }

  /* 화면에 보여줄 기분 */
  function mood() {
    var d = s.dog;
    if (!d) return 'idle';
    if (d.dead) return 'gone';
    if (d.sleeping) return 'sleep';
    if (d.sick) return 'sick';
    if (d.fill < 20) return 'hungry';
    if (d.clean < 20 || d.poops.length >= 3) return 'dirty';
    if (d.energy < 18) return 'tired';
    if (d.mood < 25) return 'sad';
    if (d.mood > 78 && d.fill > 55) return 'joy';
    return 'idle';
  }

  function statusLine() {
    var d = s.dog, m = mood();
    if (!d) return '';
    if (m === 'sleep') return stageIdx() === 0 ? '갓 태어나 하루 종일 잠만 자요.' : '쌔근쌔근… 자는 중이에요.';
    var msg = {
      sick: '기운이 없어요. 병원에 가야 할 것 같아요.',
      hungry: '밥그릇을 쳐다봐요. 배가 고픈가 봐요.',
      dirty: '몸이 지저분해요. 빗질이나 목욕을 해주세요.',
      tired: '눈이 스르르 감겨요. 재워주세요.',
      sad: '심심해요. 같이 놀거나 산책 나가요!',
      joy: '꼬리가 멈추질 않아요!',
      idle: ''
    }[m] || '';
    if (!msg && vaccDue().length) msg = '예방접종할 때가 됐어요.';
    if (!msg && canWalk().ok && now() - d.lastWalk > 6 * HOUR) msg = '현관 앞에서 기다려요. 산책 갈까요?';
    return msg;
  }

  /* ---------- 성장 ---------- */
  function addExp(n) {
    if (!s.dog || s.dog.dead) return null;
    s.dog.exp += n;
    return checkStage();
  }
  function checkStage() {
    var grew = null;
    while (true) {
      var nx = BR.STAGES[s.dog.stageIdx + 1];
      if (!nx || s.dog.exp < nx.exp || ageHours() < nx.minAgeH) break;
      s.dog.stageIdx += 1;
      /* 단계가 오르면 체중도 그 나이에 맞게 따라온다 */
      var t = targetWeight(breed(), s.dog.stageIdx);
      s.dog.weight = +(t * (0.9 + Math.random() * 0.15)).toFixed(2);
      grew = nx;
      if (nx.id === 'adult') recordDex('adult');
    }
    return grew;
  }
  function recordDex(reason) {
    s.dex.push({
      breed: s.dog.breed, name: s.dog.name, sex: s.dog.sex,
      stage: reason, days: ageDays(), weeks: ageWeeks(),
      tricks: trickAvg(), walks: s.records.walks, at: now()
    });
    if (s.dex.length > 60) s.dex = s.dex.slice(-60);
  }

  /* ---------- 시간 흐름 ---------- */
  function snapshot() {
    var d = s.dog;
    return { fill: d.fill, mood: d.mood, clean: d.clean, energy: d.energy, health: d.health, poops: d.poops.length, weight: d.weight };
  }

  function tick(t) {
    t = t || now();
    if (!s.dog) { s.lastTick = t; return { events: [], elapsed: 0 }; }
    var elapsed = t - s.lastTick;
    if (elapsed < 0) { s.lastTick = t; return { events: [], elapsed: 0 }; }
    var capH = s.mode === 'easy' ? D.TUNE.offlineCapEasyH : D.TUNE.offlineCapHardH;
    var capped = Math.min(elapsed, capH * HOUR);
    var events = [], before = snapshot();
    var STEP = 5 * MIN, remain = capped, cursor = t - capped;
    while (remain > 0) {
      var step = Math.min(STEP, remain);
      stepSim(step / HOUR, cursor + step, events);
      remain -= step; cursor += step;
    }
    s.lastTick = t;
    var grew = s.dog.dead ? null : checkStage();
    if (grew) events.push({ type: 'stage', stage: grew });
    return { events: events, elapsed: elapsed, before: before, after: snapshot() };
  }

  function stepSim(h, atTs, events) {
    var d = s.dog, R = D.RATES, b = breed();
    if (d.dead) return;

    var hour = new Date(atTs).getHours();
    var night = hour >= D.TUNE.sleepStartHour || hour < D.TUNE.sleepEndHour;
    /* 신생아는 거의 온종일 잔다 */
    var babySleep = d.stageIdx === 0;
    if (!d.sleeping && (babySleep ? Math.random() < 0.3 * h : (d.energy <= 6 || (night && d.energy < 45)))) {
      d.sleeping = true; events.push({ type: 'sleep' });
    }
    if (d.sleeping && !babySleep && (d.energy >= 99 || (!night && d.energy > 70))) {
      d.sleeping = false; events.push({ type: 'wake' });
    }
    if (d.sleeping && babySleep && d.energy >= 99 && Math.random() < 0.4 * h) d.sleeping = false;

    /* 미용 손이 많이 가는 견종일수록 빨리 지저분해진다 */
    var groomMul = 0.7 + 0.16 * b.traits.groom;
    /* 오래 못 나가면 기분이 더 빨리 떨어진다 */
    var boredom = (d.stageIdx >= 3 && atTs - d.lastWalk > 8 * HOUR) ? 1 + 0.12 * b.traits.energy : 1;

    if (d.sleeping) {
      d.fill += R.fillSleep * h;
      d.mood += R.moodSleep * h;
      d.energy += R.energySleep * h;
      d.clean += R.clean * 0.35 * h * groomMul;
    } else {
      d.fill += R.fill * h * (d.stageIdx < 2 ? 1.25 : 1);
      d.mood += R.mood * h * boredom;
      d.energy += R.energy * h;
      d.clean += (R.clean * groomMul + R.poopDirty * d.poops.length) * h;
      /* 잘 지내면 가만히 있어도 조금씩 자란다 */
      if (d.fill > 50 && d.mood > 40) d.exp += 7 * h;
    }

    /* 배변 */
    if (!d.sleeping && atTs >= d.nextPoopAt) {
      if (d.poops.length < D.TUNE.maxPoops) { d.poops.push(atTs); events.push({ type: 'poop' }); }
      d.nextPoopAt = atTs + D.TUNE.poopEveryH * HOUR * (0.7 + Math.random() * 0.7);
    }

    d.fill = clamp(d.fill, 0, 100);
    d.mood = clamp(d.mood, 0, 100);
    d.clean = clamp(d.clean, 0, 100);
    d.energy = clamp(d.energy, 0, 100);

    /* 체중은 목표치로 서서히 수렴한다 */
    var tw = targetWeight(b, d.stageIdx);
    d.weight = +(d.weight + (tw - d.weight) * 0.04 * h).toFixed(3);

    /* 건강 */
    var ws = weightState();
    var bad = (d.fill <= 5 ? 1 : 0) + (d.clean <= 5 ? 1 : 0) + (d.sick ? 1 : 0) + (ws.id === 'fat' ? 0.5 : 0);
    if (bad > 0) d.health += R.hurt * h * bad;
    else if (d.fill > 55 && d.clean > 45 && d.mood > 35) d.health += R.heal * h;

    /* 발병 — 미접종·불결·비만이 겹칠수록 위험 */
    if (!d.sick) {
      var risk = 0;
      if (d.clean < 25) risk += 0.3;
      if (d.fill < 15) risk += 0.3;
      if (d.health < 55) risk += 0.2;
      if (d.poops.length >= 3) risk += 0.2;
      risk += vaccOverdue() * 0.12;
      if (heartwormDue()) risk += 0.15;
      if (ws.id === 'fat') risk += 0.1;
      if (risk > 0 && Math.random() < risk * h) { d.sick = true; events.push({ type: 'sick' }); }
    }

    var floor = s.mode === 'easy' ? 8 : 0;
    d.health = clamp(d.health, floor, 100);

    if (s.mode === 'hard') {
      if (d.health <= 0) {
        if (!d.zeroSince) d.zeroSince = atTs;
        if (atTs - d.zeroSince >= D.TUNE.deathAfterH * HOUR) {
          d.dead = true; d.deadAt = atTs; d.cause = 'left';
          recordDex('gone');
          events.push({ type: 'dead' });
        }
      } else d.zeroSince = 0;
    }
  }

  /* ---------- 행동 ---------- */
  function guard() {
    if (!s.dog) return '아직 강아지가 없어요.';
    if (s.dog.dead) return '강아지가 곁에 없어요.';
    return null;
  }

  /* 나이에 맞는 기본 사료 */
  function defaultFood() {
    var i = stageIdx();
    if (i <= 0) return 'milk';
    if (i === 1) return 'mush';
    if (i <= 3) return 'puppy';
    return 'adultfd';
  }

  function feed(itemId) {
    var block = guard();
    if (block) return { ok: false, msg: block };
    var d = s.dog;
    /* 젖먹이는 자다가도 일어나 먹는다 */
    if (d.sleeping && stageIdx() <= 1) d.sleeping = false;
    else if (d.sleeping) return { ok: false, msg: D.josa(d.name, '은/는') + ' 자고 있어요. 깨워서 주시겠어요?' };
    if (d.fill > 92) return { ok: false, msg: '배가 불러요. 더 주면 살이 쪄요.' };
    var it = D.item(itemId || defaultFood());
    if (!it) return { ok: false, msg: '?' };
    var free = !itemId;                       /* 기본 사료는 무료 */
    if (!free && (s.inventory[it.id] || 0) <= 0) return { ok: false, msg: '가방에 없어요.' };
    if (!free) { s.inventory[it.id] -= 1; if (s.inventory[it.id] <= 0) delete s.inventory[it.id]; }

    /* 나이에 맞지 않는 사료는 효과가 반으로 */
    var fit = !it.forStage || it.forStage.indexOf(stageIdx()) >= 0;
    var mul = fit ? 1 : 0.5;
    d.fill = clamp(d.fill + (it.fill || 0) * mul, 0, 100);
    d.mood = clamp(d.mood + (it.mood || 0), 0, 100);
    if (it.clean) d.clean = clamp(d.clean + it.clean, 0, 100);
    if (it.weight) d.weight = +(d.weight + it.weight).toFixed(3);
    if (!fit) d.health = clamp(d.health - 2, 0, 100);
    d.care.fed += 1; s.records.feeds += 1;
    var grew = addExp((it.exp || 4) * mul);
    return {
      ok: true, fx: 'eat', grew: grew,
      msg: fit ? '맛있게 먹었어요!' : '나이에 안 맞는 사료라 잘 못 먹어요…'
    };
  }

  function walk() {
    var block = guard();
    if (block) return { ok: false, msg: block };
    var chk = canWalk();
    if (!chk.ok) return { ok: false, msg: chk.why, fix: chk.fix };
    var d = s.dog, b = breed();
    if (d.sleeping) d.sleeping = false;
    if (d.energy < 15) return { ok: false, msg: '너무 지쳤어요. 조금 쉬게 해주세요.' };

    var gain = 16 + b.traits.energy * 3;
    d.mood = clamp(d.mood + gain, 0, 100);
    d.energy = clamp(d.energy - (8 + b.traits.energy * 2), 0, 100);
    d.fill = clamp(d.fill - 6, 0, 100);
    d.clean = clamp(d.clean - 9, 0, 100);
    d.poops = [];                        /* 밖에서 볼일을 봤다 */
    d.weight = +(d.weight - 0.02 * adultKg(b) * 0.1).toFixed(3);
    d.lastWalk = now();
    d.care.walked += 1; s.records.walks += 1;
    var grew = addExp(18 + b.traits.energy * 2);
    var lines = [
      '동네를 한 바퀴 돌고 왔어요. 냄새를 한참 맡았어요.',
      '다른 강아지를 만나 인사했어요!',
      '공원에서 신나게 뛰었어요. 화장실도 해결!',
      '전봇대마다 멈춰 서느라 오래 걸렸어요.'
    ];
    return { ok: true, fx: 'walk', grew: grew, msg: lines[(Math.random() * lines.length) | 0] };
  }

  function play(toolId) {
    var block = guard();
    if (block) return { ok: false, msg: block };
    var d = s.dog;
    if (d.sleeping) return { ok: false, msg: '자는 중이에요.' };
    if (d.energy < 12) return { ok: false, msg: '기운이 없어요. 재워주세요.' };
    var it = toolId ? D.item(toolId) : null;
    if (it && !s.tools[it.id]) return { ok: false, msg: '아직 그 장난감이 없어요.' };
    var mood = it ? it.mood : 12, en = it ? it.energy : -6, ex = it ? it.exp : 6;
    d.mood = clamp(d.mood + mood, 0, 100);
    d.energy = clamp(d.energy + en, 0, 100);
    d.fill = clamp(d.fill - 3, 0, 100);
    d.lastPlay = now();
    d.care.played += 1; s.records.plays += 1;
    var grew = addExp(ex);
    return { ok: true, fx: 'play', grew: grew, msg: it ? (it.name + '(으)로 신나게 놀았어요!') : '같이 뒹굴며 놀았어요!' };
  }

  function groom(kind) {
    var block = guard();
    if (block) return { ok: false, msg: block };
    var d = s.dog;
    if (kind === 'bath') {
      if ((s.inventory.shampoo || 0) <= 0) return { ok: false, msg: '샴푸가 없어요. 상점에서 살 수 있어요.' };
      if (stageIdx() < 2) return { ok: false, msg: '너무 어려서 목욕은 위험해요. 물티슈로 닦아주세요.' };
      s.inventory.shampoo -= 1; if (s.inventory.shampoo <= 0) delete s.inventory.shampoo;
      d.clean = 100; d.mood = clamp(d.mood - 4, 0, 100); d.lastBath = now();
      d.care.groomed += 1; s.records.grooms += 1;
      return { ok: true, fx: 'bath', grew: addExp(9), msg: '뽀득뽀득! 드라이까지 끝났어요.' };
    }
    if (!s.tools.brush) return { ok: false, msg: '브러시가 없어요. 상점에서 살 수 있어요.', fix: 'shop' };
    var left = D.TUNE.groomCooldownMin * MIN - (now() - d.lastGroom);
    if (left > 0 && d.clean > 80) return { ok: false, msg: '방금 빗어줘서 반질반질해요.' };
    d.clean = clamp(d.clean + 30, 0, 100);
    d.mood = clamp(d.mood + 8, 0, 100);
    d.lastGroom = now();
    d.care.groomed += 1; s.records.grooms += 1;
    return { ok: true, fx: 'brush', grew: addExp(6), msg: '빗질을 하니 눈을 지그시 감아요.' };
  }

  function train(trickId, amount) {
    var block = guard();
    if (block) return { ok: false, msg: block };
    var d = s.dog, b = breed();
    var tr = null;
    D.TRICKS.forEach(function (x) { if (x.id === trickId) tr = x; });
    if (!tr) return { ok: false, msg: '?' };
    if (stageIdx() < tr.minStage) return { ok: false, msg: '아직 배우기 이른 훈련이에요.' };
    if (d.sleeping) return { ok: false, msg: '자는 중이에요.' };
    if (d.energy < 10) return { ok: false, msg: '집중할 기운이 없어요.' };
    var gain = (amount || 10) * (0.7 + 0.12 * b.traits.train);
    var before = d.tricks[trickId] || 0;
    d.tricks[trickId] = clamp(Math.round(before + gain), 0, 100);
    d.energy = clamp(d.energy - 6, 0, 100);
    d.mood = clamp(d.mood + 5, 0, 100);
    d.care.trained += 1; s.records.trains += 1;
    var grew = addExp(12);
    var done = before < 100 && d.tricks[trickId] >= 100;
    return {
      ok: true, fx: 'train', grew: grew, mastered: done,
      msg: done ? (tr.name + ' 완벽하게 배웠어요! 👏') : (tr.name + ' 연습 중… ' + d.tricks[trickId] + '%')
    };
  }

  function vaccinate(id) {
    var block = guard();
    if (block) return { ok: false, msg: block };
    var v = D.vaccine(id);
    if (!v) return { ok: false, msg: '?' };
    if (vaccDone(id)) return { ok: false, msg: '이미 맞았어요.' };
    if (stageIdx() < v.need) return { ok: false, msg: '아직 접종할 나이가 아니에요.' };
    if (s.coins < v.price) return { ok: false, msg: '코인이 부족해요.' };
    s.coins -= v.price;
    s.dog.vacc[id] = now();
    s.dog.mood = clamp(s.dog.mood - 6, 0, 100);
    s.dog.health = clamp(s.dog.health + 8, 0, 100);
    s.records.vaccines += 1;
    return { ok: true, fx: 'clinic', grew: addExp(14), msg: v.name + ' 접종 완료! 조금 시무룩해요.' };
  }

  function treat() {
    var block = guard();
    if (block) return { ok: false, msg: block };
    var d = s.dog;
    if (!d.sick) return { ok: false, msg: '지금은 아프지 않아요.' };
    if ((s.inventory.medicine || 0) > 0) {
      s.inventory.medicine -= 1; if (s.inventory.medicine <= 0) delete s.inventory.medicine;
    } else {
      if (s.coins < 40) return { ok: false, msg: '진료비 40코인이 부족해요.' };
      s.coins -= 40;
    }
    d.sick = false;
    d.health = clamp(d.health + 34, 0, 100);
    return { ok: true, fx: 'clinic', grew: addExp(10), msg: '진료를 받고 나니 한결 나아졌어요.' };
  }

  function heartworm() {
    var block = guard();
    if (block) return { ok: false, msg: block };
    if ((s.inventory.heart || 0) <= 0) return { ok: false, msg: '심장사상충약이 없어요.', fix: 'shop' };
    s.inventory.heart -= 1; if (s.inventory.heart <= 0) delete s.inventory.heart;
    s.dog.lastHeartworm = now();
    s.dog.health = clamp(s.dog.health + 12, 0, 100);
    return { ok: true, fx: 'clinic', grew: addExp(8), msg: '이번 달 심장사상충약 완료!' };
  }

  function sleepToggle() {
    var block = guard();
    if (block) return { ok: false, msg: block };
    s.dog.sleeping = !s.dog.sleeping;
    return { ok: true, fx: s.dog.sleeping ? 'sleep' : 'wake', msg: s.dog.sleeping ? '불을 끄고 재웠어요.' : '일어났어요!' };
  }

  function pat() {
    if (guard() || s.dog.sleeping) return { ok: false, msg: '' };
    s.dog.mood = clamp(s.dog.mood + 2, 0, 100);
    addExp(0.8);
    return { ok: true, fx: 'heart', quiet: true, msg: '' };
  }

  function cleanPoop(i) {
    if (!s.dog || !s.dog.poops.length) return false;
    s.dog.poops.splice(i, 1);
    s.dog.clean = clamp(s.dog.clean + 7, 0, 100);
    s.dog.care.groomed += 0.5;
    addExp(2);
    return true;
  }

  /* ---------- 상점 ---------- */
  function buy(id) {
    var it = D.item(id);
    if (!it) return { ok: false, msg: '없는 물건이에요.' };
    if (it.slot && s.owned[id]) return { ok: false, msg: '이미 가지고 있어요.' };
    if (it.tool && s.tools[id]) return { ok: false, msg: '이미 가지고 있어요.' };
    if (s.coins < it.price) return { ok: false, msg: '코인이 부족해요. 미니게임으로 모아보세요!' };
    s.coins -= it.price;
    if (it.slot) { s.owned[id] = true; equip(id); }
    else if (it.tool) s.tools[id] = true;
    else s.inventory[id] = (s.inventory[id] || 0) + 1;
    return { ok: true, msg: D.josa(it.name, '을/를') + ' 샀어요!' };
  }
  function equip(id) {
    var it = D.item(id);
    if (!it || !it.slot) return false;
    if (!s.owned[id] && it.price > 0) return false;
    s.equipped[it.slot] = (s.equipped[it.slot] === id && it.slot === 'wear') ? null : id;
    return true;
  }
  function useItem(id) {
    var block = guard();
    if (block) return { ok: false, msg: block };
    var it = D.item(id), d = s.dog;
    if (!it || (s.inventory[id] || 0) <= 0) return { ok: false, msg: '가방에 없어요.' };
    if (it.cat === 'food') return feed(id);
    if (it.id === 'shampoo') return groom('bath');
    if (it.id === 'heart') return heartworm();
    if (it.id === 'medicine') return treat();
    if (it.id === 'pad') {
      if (!d.poops.length) return { ok: false, msg: '치울 게 없어요.' };
      s.inventory[id] -= 1; if (s.inventory[id] <= 0) delete s.inventory[id];
      d.poops = [];
      d.clean = clamp(d.clean + 18, 0, 100);
      return { ok: true, fx: 'clean', grew: addExp(4), msg: '배변패드를 갈았어요. 깨끗!' };
    }
    return { ok: false, msg: '지금은 쓸 수 없어요.' };
  }

  function addCoins(n) {
    s.coins = Math.max(0, s.coins + n);
    if (n > 0) s.records.coinsEarned += n;
    return n;
  }
  function claimDailyBonus() {
    var k = dayKey(now());
    if (s.lastBonusDay === k) return 0;
    s.lastBonusDay = k;
    s.coins += D.TUNE.dailyBonus;
    return D.TUNE.dailyBonus;
  }

  /* ---------- 생성 ---------- */
  function create(breedId, name, sex, mode) {
    var keep = s || defaults();
    var fresh = defaults();
    fresh.dex = keep.dex || [];
    fresh.coins = Math.max(60, keep.coins || 0);
    fresh.owned = keep.owned || fresh.owned;
    fresh.tools = keep.tools || fresh.tools;
    fresh.sound = keep.sound !== false;
    fresh.mode = mode === 'hard' ? 'hard' : 'easy';
    fresh.dog = newDog(breedId, name, sex);
    s = fresh;
    save();
    return s;
  }
  function wipe() { try { localStorage.removeItem(KEY); } catch (e) {} s = defaults(); save(); }

  return {
    load: load, save: save, create: create, wipe: wipe,
    get state() { return s; },
    get dog() { return s && s.dog; },
    breed: breed, stage: stage, stageIdx: stageIdx, nextStage: nextStage,
    expProgress: expProgress, ageDays: ageDays, ageHours: ageHours, ageWeeks: ageWeeks,
    mood: mood, statusLine: statusLine, tick: tick,
    feed: feed, walk: walk, play: play, groom: groom, train: train,
    vaccinate: vaccinate, treat: treat, heartworm: heartworm,
    sleepToggle: sleepToggle, pat: pat, cleanPoop: cleanPoop,
    buy: buy, equip: equip, useItem: useItem, addExp: addExp, addCoins: addCoins,
    claimDailyBonus: claimDailyBonus, defaultFood: defaultFood,
    vaccDone: vaccDone, vaccDue: vaccDue, vaccOverdue: vaccOverdue,
    canWalk: canWalk, heartwormDue: heartwormDue, weightState: weightState,
    trickAvg: trickAvg, targetWeight: targetWeight, adultKg: adultKg
  };
})();
