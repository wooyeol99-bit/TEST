/* 포코펫 — 세이브 데이터와 시간 시뮬레이션 */
window.Game = (function () {
  'use strict';
  var D = window.DATA;
  var KEY = 'pocopet.save.v1';
  var HOUR = 3600000;
  var s = null;              /* 현재 세이브 */
  var listeners = [];

  /* ---------- 유틸 ---------- */
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function now() { return Date.now(); }
  function dayKey(ts) { var d = new Date(ts); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function emit() { listeners.forEach(function (fn) { fn(s); }); }

  function defaults() {
    return {
      v: 1,
      created: now(),
      lastTick: now(),
      lastBonusDay: '',
      coins: 60,
      mode: 'easy',
      sound: true,
      inventory: { apple: 3, pill: 1 },
      equipped: { hat: null, bg: 'bg_room' },
      owned: { bg_room: true },
      records: { games: 0, best: {}, feeds: 0, washes: 0, plays: 0, coinsEarned: 0 },
      dex: [],
      pet: null
    };
  }

  function newPet(speciesId, name) {
    var t = now();
    return {
      species: speciesId,
      name: name || D.species(speciesId).name,
      born: t,
      stageIdx: 0,
      hatchTaps: 0,
      exp: 0,
      form: null,
      hunger: 70, happy: 70, clean: 90, energy: 80, health: 100,
      sick: false,
      sleeping: false,
      poops: [],
      nextPoopAt: t + D.TUNE.poopEveryH * HOUR,
      zeroSince: 0,
      care: { fed: 0, played: 0, cleaned: 0 },
      dead: false, deadAt: 0, cause: ''
    };
  }

  /* ---------- 저장 / 불러오기 ---------- */
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 용량 초과 등은 무시 */ }
  }
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (!raw) { s = defaults(); return false; }
    try {
      var parsed = JSON.parse(raw);
      s = Object.assign(defaults(), parsed);
      s.inventory = parsed.inventory || {};
      s.equipped = Object.assign({ hat: null, bg: 'bg_room' }, parsed.equipped || {});
      s.owned = Object.assign({ bg_room: true }, parsed.owned || {});
      s.records = Object.assign(defaults().records, parsed.records || {});
      return !!s.pet;
    } catch (e) { s = defaults(); return false; }
  }

  /* ---------- 조회 ---------- */
  function stageIdx() { return s.pet ? s.pet.stageIdx : 0; }
  function stage() { return D.STAGES[stageIdx()]; }
  function ageMs() { return s.pet ? now() - s.pet.born : 0; }
  function ageDays() { return Math.floor(ageMs() / 86400000); }
  function ageHours() { return ageMs() / HOUR; }

  function nextStage() { return D.STAGES[stageIdx() + 1] || null; }
  function expProgress() {
    var nx = nextStage();
    if (!nx) return 1;
    var cur = D.STAGES[stageIdx()].exp;
    return clamp((s.pet.exp - cur) / Math.max(1, nx.exp - cur), 0, 1);
  }

  /* 기분 판정 — 펫 그림과 말풍선이 여기에 따라 바뀐다 */
  function mood() {
    var p = s.pet;
    if (!p) return 'idle';
    if (p.dead) return 'gone';
    if (p.stageIdx === 0) return 'egg';
    if (p.sleeping) return 'sleep';
    if (p.sick) return 'sick';
    if (p.hunger < 20) return 'hungry';
    if (p.clean < 20 || p.poops.length >= 3) return 'dirty';
    if (p.energy < 18) return 'tired';
    if (p.happy < 25) return 'sad';
    if (p.happy > 78 && p.hunger > 55) return 'joy';
    return 'idle';
  }

  function statusLine() {
    var m = mood(), p = s.pet;
    var msg = {
      egg: '알이 움직여요! 톡톡 두드려 주세요.',
      gone: p && p.cause === 'left' ? '펫이 별나라로 떠났어요…' : '',
      sleep: 'Zzz… 쉬는 중이에요.',
      sick: '으으… 아파요. 약이 필요해요.',
      hungry: '배가 고파요! 밥 주세요.',
      dirty: '지저분해요. 씻고 싶어요.',
      tired: '너무 졸려요… 재워주세요.',
      sad: '심심해요. 같이 놀아요!',
      joy: '기분 최고! 오늘 참 좋아요.',
      idle: ''
    }[m];
    return msg || '';
  }

  /* ---------- 성장 ---------- */
  function addExp(n) {
    if (!s.pet || s.pet.dead || s.pet.stageIdx === 0) return null;
    s.pet.exp += n;
    return checkStage();
  }

  function decideForm() {
    var c = s.pet.care;
    var best = 'strong', bestV = c.fed;
    if (c.played > bestV) { best = 'playful'; bestV = c.played; }
    if (c.cleaned > bestV) { best = 'tidy'; bestV = c.cleaned; }
    return best;
  }

  function checkStage() {
    var grew = null;
    while (true) {
      var nx = D.STAGES[s.pet.stageIdx + 1];
      if (!nx) break;
      if (s.pet.exp < nx.exp) break;
      if (ageHours() < nx.minAgeH) break;
      s.pet.stageIdx += 1;
      if (nx.id === 'adult' && !s.pet.form) s.pet.form = decideForm();
      grew = nx;
      if (nx.id === 'adult' || nx.id === 'legend') recordDex(nx.id);
    }
    return grew;
  }

  function recordDex(reason) {
    s.dex.push({
      species: s.pet.species, name: s.pet.name, form: s.pet.form,
      stage: reason, days: ageDays(), at: now()
    });
    if (s.dex.length > 60) s.dex = s.dex.slice(-60);
  }

  /* 어른 특성 보정 */
  function formMul(kind) {
    var f = s.pet && s.pet.form;
    if (kind === 'hunger' && f === 'strong') return 0.75;
    if (kind === 'clean' && f === 'tidy') return 0.7;
    if (kind === 'coin' && f === 'playful') return 1.4;
    return 1;
  }

  /* ---------- 시간 흐름 ---------- */
  /* 마지막 접속 이후 흐른 시간을 조각내어 되돌린다. 오프라인도 같은 함수로 처리. */
  function tick(t) {
    t = t || now();
    if (!s.pet) { s.lastTick = t; return { events: [], elapsed: 0 }; }
    var elapsed = t - s.lastTick;
    if (elapsed < 0) { s.lastTick = t; return { events: [], elapsed: 0 }; }

    var capH = s.mode === 'easy' ? D.TUNE.offlineCapEasyH : D.TUNE.offlineCapHardH;
    var capped = Math.min(elapsed, capH * HOUR);
    var events = [];
    var before = snapshot();

    var STEP = 5 * 60 * 1000;
    var remain = capped;
    var cursor = t - capped;
    while (remain > 0) {
      var step = Math.min(STEP, remain);
      stepSim(step / HOUR, cursor + step, events);
      remain -= step;
      cursor += step;
    }
    s.lastTick = t;

    var grew = s.pet.dead ? null : checkStage();
    if (grew) events.push({ type: 'stage', stage: grew });

    return { events: events, elapsed: elapsed, before: before, after: snapshot() };
  }

  function snapshot() {
    var p = s.pet;
    return { hunger: p.hunger, happy: p.happy, clean: p.clean, energy: p.energy, health: p.health, exp: p.exp, poops: p.poops.length };
  }

  function stepSim(h, atTs, events) {
    var p = s.pet, R = D.RATES;
    if (p.dead || p.stageIdx === 0) return;

    /* 밤/체력에 따른 자동 수면 */
    var hour = new Date(atTs).getHours();
    var night = hour >= D.TUNE.sleepStartHour || hour < D.TUNE.sleepEndHour;
    if (!p.sleeping && (p.energy <= 6 || (night && p.energy < 45))) { p.sleeping = true; events.push({ type: 'sleep' }); }
    if (p.sleeping && (p.energy >= 99 || (!night && p.energy > 70))) { p.sleeping = false; events.push({ type: 'wake' }); }

    if (p.sleeping) {
      p.hunger += R.hungerSleep * h;
      p.happy += R.happySleep * h;
      p.energy += R.energySleep * h;
      p.clean += R.clean * 0.4 * h * formMul('clean');
    } else {
      p.hunger += R.hunger * h * formMul('hunger');
      p.happy += R.happy * h;
      p.energy += R.energy * h;
      p.clean += (R.clean + R.poopDirty * p.poops.length) * h * formMul('clean');
    }

    /* 배변 */
    if (!p.sleeping && atTs >= p.nextPoopAt) {
      if (p.poops.length < D.TUNE.maxPoops) { p.poops.push(atTs); events.push({ type: 'poop' }); }
      p.nextPoopAt = atTs + D.TUNE.poopEveryH * HOUR * (0.7 + Math.random() * 0.7);
    }

    p.hunger = clamp(p.hunger, 0, 100);
    p.happy = clamp(p.happy, 0, 100);
    p.clean = clamp(p.clean, 0, 100);
    p.energy = clamp(p.energy, 0, 100);

    /* 건강 */
    var bad = (p.hunger <= 5 ? 1 : 0) + (p.clean <= 5 ? 1 : 0) + (p.sick ? 1 : 0);
    if (bad > 0) {
      p.health += R.hurt * h * bad;
    } else if (p.hunger > 55 && p.clean > 45 && p.happy > 35) {
      p.health += R.heal * h;
      /* 잘 지내면 가만히 있어도 조금씩 자란다 */
      if (!p.sleeping) p.exp += 6 * h;
    }

    /* 발병 */
    if (!p.sick) {
      var risk = 0;
      if (p.clean < 25) risk += 0.35;
      if (p.hunger < 15) risk += 0.35;
      if (p.health < 50) risk += 0.25;
      if (p.poops.length >= 3) risk += 0.25;
      if (risk > 0 && Math.random() < risk * h) { p.sick = true; events.push({ type: 'sick' }); }
    }

    var floor = s.mode === 'easy' ? 8 : 0;
    p.health = clamp(p.health, floor, 100);

    /* 매운맛에서만 이별이 있다 */
    if (s.mode === 'hard') {
      if (p.health <= 0) {
        if (!p.zeroSince) p.zeroSince = atTs;
        if (atTs - p.zeroSince >= D.TUNE.deathAfterH * HOUR) {
          p.dead = true; p.deadAt = atTs; p.cause = 'left';
          recordDex('gone');
          events.push({ type: 'dead' });
        }
      } else { p.zeroSince = 0; }
    }
  }

  /* ---------- 행동 ---------- */
  function guard() {
    if (!s.pet) return '아직 펫이 없어요.';
    if (s.pet.dead) return '펫이 곁에 없어요. 새 알을 받아보세요.';
    if (s.pet.stageIdx === 0) return '아직 알이에요. 톡톡 두드려 깨워 주세요.';
    return null;
  }

  function act(kind) {
    var block = guard();
    if (block) return { ok: false, msg: block };
    var p = s.pet;

    if (kind === 'feed') {
      if (p.sleeping) return { ok: false, msg: D.josa(p.name, '은/는') + ' 자고 있어요.' };
      if (p.hunger > 92) return { ok: false, msg: '배가 불러요. 더는 못 먹겠대요.' };
      p.hunger = clamp(p.hunger + 16, 0, 100);
      p.happy = clamp(p.happy + 2, 0, 100);
      p.care.fed += 1; s.records.feeds += 1;
      var g1 = addExp(4);
      return { ok: true, msg: '냠냠! 맛있게 먹었어요.', fx: 'eat', grew: g1 };
    }

    if (kind === 'quickplay') {
      if (p.sleeping) return { ok: false, msg: '자는 중엔 놀 수 없어요.' };
      if (p.energy < 12) return { ok: false, msg: '너무 지쳤어요. 먼저 재워주세요.' };
      p.happy = clamp(p.happy + 13, 0, 100);
      p.energy = clamp(p.energy - 7, 0, 100);
      p.hunger = clamp(p.hunger - 3, 0, 100);
      p.care.played += 1; s.records.plays += 1;
      var g2 = addExp(7);
      return { ok: true, msg: '신난다! 더 놀고 싶어해요.', fx: 'play', grew: g2 };
    }

    if (kind === 'wash') {
      if (p.clean > 95 && p.poops.length === 0) return { ok: false, msg: '이미 반짝반짝해요.' };
      p.clean = clamp(p.clean + 48, 0, 100);
      p.poops = [];
      p.care.cleaned += 1; s.records.washes += 1;
      var g3 = addExp(5);
      return { ok: true, msg: '뽀득뽀득! 깨끗해졌어요.', fx: 'wash', grew: g3 };
    }

    if (kind === 'sleep') {
      p.sleeping = !p.sleeping;
      return { ok: true, msg: p.sleeping ? '불을 끄고 재웠어요. Zzz…' : '일어났어요!', fx: p.sleeping ? 'sleep' : 'wake' };
    }

    if (kind === 'pet') {
      if (p.sleeping) return { ok: false, msg: '쉿— 자는 중이에요.' };
      p.happy = clamp(p.happy + 2, 0, 100);
      addExp(0.6);
      return { ok: true, msg: '', fx: 'heart', quiet: true };
    }

    return { ok: false, msg: '?' };
  }

  function cleanPoop(i) {
    if (!s.pet || !s.pet.poops.length) return false;
    s.pet.poops.splice(i, 1);
    s.pet.clean = clamp(s.pet.clean + 6, 0, 100);
    s.pet.care.cleaned += 1;
    addExp(2);
    return true;
  }

  function hatchTap() {
    if (!s.pet || s.pet.stageIdx !== 0) return null;
    s.pet.hatchTaps += 1;
    if (s.pet.hatchTaps >= 6) {
      s.pet.stageIdx = 1;
      s.pet.born = now();
      s.pet.nextPoopAt = now() + D.TUNE.poopEveryH * HOUR;
      return 'hatched';
    }
    return 'crack';
  }

  /* ---------- 아이템 ---------- */
  function has(id) { return (s.inventory[id] || 0) > 0; }

  function buy(id) {
    var it = D.ITEM_MAP[id];
    if (!it) return { ok: false, msg: '없는 물건이에요.' };
    if (it.slot && s.owned[id]) return { ok: false, msg: '이미 가지고 있어요.' };
    if (s.coins < it.price) return { ok: false, msg: '코인이 부족해요. 미니게임으로 모아보세요!' };
    s.coins -= it.price;
    if (it.slot) { s.owned[id] = true; equip(id); }
    else s.inventory[id] = (s.inventory[id] || 0) + 1;
    return { ok: true, msg: D.josa(it.name, '을/를') + ' 샀어요!' };
  }

  function equip(id) {
    var it = D.ITEM_MAP[id];
    if (!it || !it.slot) return false;
    if (!s.owned[id] && it.price > 0) return false;
    s.equipped[it.slot] = (s.equipped[it.slot] === id && it.slot === 'hat') ? null : id;
    return true;
  }

  function useItem(id) {
    var block = guard();
    if (block) return { ok: false, msg: block };
    var it = D.ITEM_MAP[id], p = s.pet;
    if (!it || !has(id)) return { ok: false, msg: '가방에 없어요.' };
    if (p.sleeping && it.cat !== 'care') return { ok: false, msg: '자는 중이에요.' };

    s.inventory[id] -= 1;
    if (s.inventory[id] <= 0) delete s.inventory[id];

    if (it.hunger) { p.hunger = clamp(p.hunger + it.hunger, 0, 100); p.care.fed += 1; }
    if (it.happy) { p.happy = clamp(p.happy + it.happy, 0, 100); if (it.cat === 'toy') p.care.played += 1; }
    if (it.clean) { p.clean = clamp(p.clean + it.clean, 0, 100); p.care.cleaned += 1; }
    if (it.energy) p.energy = clamp(p.energy + it.energy, 0, 100);
    if (it.health) p.health = clamp(p.health + it.health, 0, 100);
    if (it.cure) p.sick = false;
    var grew = addExp(it.exp || 3);

    var fx = it.cat === 'food' ? 'eat' : (it.cat === 'toy' ? 'play' : (it.id === 'soap' ? 'wash' : 'heal'));
    return { ok: true, msg: it.name + ' 사용! ' + (it.cure ? '몸이 개운해졌어요.' : '좋아하네요.'), fx: fx, grew: grew };
  }

  /* ---------- 코인 ---------- */
  function addCoins(n) {
    n = Math.round(n * (n > 0 ? formMul('coin') : 1));
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

  /* ---------- 생성 / 초기화 ---------- */
  function create(speciesId, name, mode) {
    var keepDex = s ? s.dex : [];
    var keepCoins = s ? s.coins : 60;
    var keepOwned = s ? s.owned : { bg_room: true };
    var keepInv = s ? s.inventory : { apple: 3, pill: 1 };
    var fresh = defaults();
    fresh.dex = keepDex || [];
    fresh.coins = Math.max(40, keepCoins || 0);
    fresh.owned = keepOwned || { bg_room: true };
    fresh.inventory = keepInv || {};
    fresh.mode = mode === 'hard' ? 'hard' : 'easy';
    fresh.sound = s ? s.sound : true;
    fresh.pet = newPet(speciesId, name);
    s = fresh;
    save();
    return s;
  }

  function wipe() {
    try { localStorage.removeItem(KEY); } catch (e) { /* noop */ }
    s = defaults();
    save();
  }

  return {
    load: load, save: save, create: create, wipe: wipe,
    get state() { return s; },
    get pet() { return s && s.pet; },
    tick: tick, act: act, useItem: useItem, buy: buy, equip: equip, has: has,
    cleanPoop: cleanPoop, hatchTap: hatchTap, addExp: addExp, addCoins: addCoins,
    claimDailyBonus: claimDailyBonus,
    stage: stage, stageIdx: stageIdx, nextStage: nextStage, expProgress: expProgress,
    ageDays: ageDays, ageHours: ageHours, mood: mood, statusLine: statusLine,
    onChange: function (fn) { listeners.push(fn); },
    emit: emit
  };
})();
