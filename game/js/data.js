/* 포코펫 — 게임 데이터 정의 (종족, 성장 단계, 아이템, 배경) */
window.DATA = (function () {
  'use strict';

  /* ---------- 성장 단계 ----------
     exp: 이 단계에 들어가는 데 필요한 성장치
     minAgeH: 최소 나이(시간). 성장치를 다 채워도 시간이 지나야 다음 단계로 간다. */
  var STAGES = [
    { id: 'egg',    label: '알',     exp: 0,    minAgeH: 0,  scale: 1.00 },
    { id: 'baby',   label: '아기',   exp: 0,    minAgeH: 0,  scale: 0.82 },
    { id: 'kid',    label: '어린이', exp: 60,   minAgeH: 0.5, scale: 0.90 },
    { id: 'teen',   label: '청소년', exp: 220,  minAgeH: 8,   scale: 1.00 },
    { id: 'adult',  label: '어른',   exp: 520,  minAgeH: 30,  scale: 1.06 },
    { id: 'legend', label: '전설',   exp: 1200, minAgeH: 96, scale: 1.12 }
  ];

  /* 어른이 될 때 그동안의 돌봄 성향으로 모습이 갈린다 */
  var FORMS = [
    { id: 'strong', label: '든든', desc: '잘 먹고 튼튼하게 자랐어요', bonus: '배고픔이 천천히 줄어요' },
    { id: 'playful', label: '재주', desc: '놀이와 게임을 좋아해요',   bonus: '미니게임 코인을 더 받아요' },
    { id: 'tidy',   label: '멋쟁이', desc: '늘 깨끗하고 단정해요',    bonus: '더러움이 천천히 쌓여요' }
  ];

  /* ---------- 종족 ---------- */
  var SPECIES = [
    {
      id: 'mungi', name: '뭉이', kind: '구름강아지',
      desc: '순하고 잘 따라요. 부르면 꼬리를 흔들어요.',
      ear: 'floppy', tail: 'wag', extra: 'none',
      colors: { body: '#f7e3c6', belly: '#fff6e8', accent: '#d9a96a', cheek: '#f7a8a0', eye: '#3c2f26' }
    },
    {
      id: 'bugi', name: '부기', kind: '물방울공룡',
      desc: '호기심이 많아요. 물놀이를 제일 좋아해요.',
      ear: 'none', tail: 'dino', extra: 'spike',
      colors: { body: '#a9e4c4', belly: '#e8fbf1', accent: '#4fa87c', cheek: '#f39ba8', eye: '#22463a' }
    },
    {
      id: 'nabi', name: '나비', kind: '분홍고양이',
      desc: '도도하지만 쓰다듬으면 좋아해요.',
      ear: 'cat', tail: 'cat', extra: 'whisker',
      colors: { body: '#f9cdd8', belly: '#fff0f4', accent: '#e28aa3', cheek: '#ef8fa4', eye: '#4a2b36' }
    },
    {
      id: 'piyak', name: '삐약', kind: '노랑병아리',
      desc: '겁이 많고 시끄러워요. 잘 먹으면 조용해져요.',
      ear: 'none', tail: 'none', extra: 'beak',
      colors: { body: '#ffe08a', belly: '#fff6d6', accent: '#f0a93b', cheek: '#f79f86', eye: '#4a3a16' }
    },
    {
      id: 'dalbi', name: '달비', kind: '밤하늘토끼',
      desc: '밤에 기운이 나요. 조용한 걸 좋아해요.',
      ear: 'bunny', tail: 'puff', extra: 'star',
      colors: { body: '#c9c6f2', belly: '#f1f0ff', accent: '#8a83d6', cheek: '#e6a1c8', eye: '#2f2a4d' }
    }
  ];

  /* ---------- 아이템 ---------- */
  var ITEMS = [
    /* 먹이 */
    { id: 'apple',   name: '사과',     emoji: '🍎', cat: 'food',  price: 5,   hunger: 18, happy: 2,  exp: 3,  desc: '기본 먹이. 싸고 든든해요.' },
    { id: 'rice',    name: '고슬밥',   emoji: '🍚', cat: 'food',  price: 12,  hunger: 34, happy: 3,  exp: 5,  desc: '배가 확 불러요.' },
    { id: 'cake',    name: '딸기케이크', emoji: '🍰', cat: 'food', price: 24, hunger: 22, happy: 16, exp: 7,  desc: '기분까지 좋아지는 간식.' },
    { id: 'carrot',  name: '당근',     emoji: '🥕', cat: 'food',  price: 9,   hunger: 20, happy: 1,  health: 6, exp: 4, desc: '건강에 좋아요.' },
    /* 약 */
    { id: 'pill',    name: '알약',     emoji: '💊', cat: 'care',  price: 20,  cure: true, health: 24, exp: 6, desc: '아플 때 한 알이면 나아요.' },
    { id: 'vita',    name: '비타민',   emoji: '🧃', cat: 'care',  price: 45,  health: 46, energy: 14, exp: 8, desc: '체력과 건강을 크게 올려요.' },
    { id: 'soap',    name: '거품비누', emoji: '🧼', cat: 'care',  price: 15,  clean: 40, happy: 4, exp: 4, desc: '한 번에 뽀득뽀득.' },
    /* 장난감 */
    { id: 'ball',    name: '공',       emoji: '⚽', cat: 'toy',   price: 35,  happy: 20, energy: -6, exp: 8, desc: '같이 공놀이를 해요.' },
    { id: 'robot',   name: '태엽로봇', emoji: '🤖', cat: 'toy',   price: 90,  happy: 34, energy: -8, exp: 14, desc: '오래 가지고 놀 수 있어요.' },
    /* 꾸미기 (장착형) */
    { id: 'hat_cap',   name: '야구모자', emoji: '🧢', cat: 'wear', price: 70,  slot: 'hat', desc: '활발해 보여요.' },
    { id: 'hat_ribbon',name: '리본',    emoji: '🎀', cat: 'wear', price: 60,  slot: 'hat', desc: '머리에 콕.' },
    { id: 'hat_crown', name: '왕관',    emoji: '👑', cat: 'wear', price: 180, slot: 'hat', desc: '오늘부터 우리 집 왕.' },
    { id: 'hat_party', name: '고깔모자', emoji: '🥳', cat: 'wear', price: 40,  slot: 'hat', desc: '매일이 생일 같아요.' },
    /* 배경 */
    { id: 'bg_room',   name: '아늑한 방', emoji: '🛋️', cat: 'bg', price: 0,   slot: 'bg', desc: '기본 배경.' },
    { id: 'bg_beach',  name: '바닷가',   emoji: '🏖️', cat: 'bg', price: 120, slot: 'bg', desc: '파도 소리가 들려요.' },
    { id: 'bg_forest', name: '초록숲',   emoji: '🌳', cat: 'bg', price: 150, slot: 'bg', desc: '공기가 맑아요.' },
    { id: 'bg_space',  name: '우주정거장', emoji: '🚀', cat: 'bg', price: 260, slot: 'bg', desc: '별이 쏟아져요.' }
  ];

  var ITEM_MAP = {};
  ITEMS.forEach(function (it) { ITEM_MAP[it.id] = it; });

  /* 배경 그라데이션 */
  var BG_STYLE = {
    bg_room:   { sky: 'linear-gradient(180deg,#fef3e2 0%,#fbe3d0 100%)', floor: '#e2c49f' },
    bg_beach:  { sky: 'linear-gradient(180deg,#bfe9ff 0%,#eaf7ff 100%)', floor: '#f3dfae' },
    bg_forest: { sky: 'linear-gradient(180deg,#d6f2d0 0%,#eefaea 100%)', floor: '#9ecb84' },
    bg_space:  { sky: 'linear-gradient(180deg,#1b1a3a 0%,#3d356b 100%)', floor: '#5a4f92', dark: true }
  };

  /* ---------- 미니게임 ---------- */
  var GAMES = [
    { id: 'catch',  name: '먹이 받기', emoji: '🧺', desc: '떨어지는 먹이를 바구니로 받아요. 폭탄은 피하세요!' },
    { id: 'rps',    name: '가위바위보', emoji: '✌️', desc: '펫과 5판 승부. 이기면 코인을 받아요.' },
    { id: 'memory', name: '순서 기억', emoji: '🧠', desc: '반짝인 순서를 그대로 눌러요. 갈수록 길어져요.' }
  ];

  /* ---------- 변화 속도 (시간당) ---------- */
  var RATES = {
    hunger: -16,      /* 깨어 있을 때 */
    happy: -12,
    clean: -7,
    energy: -9,
    energySleep: 26,  /* 잘 때 회복 */
    hungerSleep: -6,
    happySleep: -2,
    poopDirty: -6,    /* 똥 1개당 추가 오염 */
    hurt: -11,        /* 굶거나 더러울 때 건강 감소 */
    heal: 4           /* 상태가 좋을 때 건강 회복 */
  };

  var TUNE = {
    poopEveryH: 2.6,        /* 평균 배변 주기 */
    maxPoops: 4,
    offlineCapEasyH: 8,     /* 순한맛: 자리를 비워도 이만큼만 흐른다 */
    offlineCapHardH: 30,
    sleepStartHour: 22,     /* 밤 */
    sleepEndHour: 7,
    deathAfterH: 6,         /* 매운맛: 건강 0이 이만큼 이어지면 이별 */
    dailyBonus: 30          /* 하루 첫 접속 코인 */
  };

  var TIPS = [
    '게이지가 노란색이 되기 전에 챙겨주면 성장치가 더 잘 올라요.',
    '똥을 오래 두면 청결이 빨리 떨어지고 병에 걸려요.',
    '밤에는 재워주세요. 잘 자야 체력이 회복돼요.',
    '미니게임으로 코인을 모아 상점에서 간식과 모자를 살 수 있어요.',
    '어른이 될 때 모습은 그동안 무엇을 많이 해줬는지로 정해져요.',
    '아프면 💊 알약을 먹이세요. 그냥 두면 건강이 계속 떨어져요.',
    '펫을 손으로 톡톡 쓰다듬으면 기분이 조금 올라가요.'
  ];

  /* 한국어 조사 — 이름 끝 글자에 받침이 있는지 보고 고른다. pair 는 '받침있음/받침없음' 순서 */
  function josa(word, pair) {
    var parts = String(pair).split('/');
    var last = String(word || '').slice(-1);
    var code = last.charCodeAt(0);
    var jong;
    if (code >= 0xac00 && code <= 0xd7a3) jong = (code - 0xac00) % 28 !== 0;
    else jong = !/[aeiouyAEIOUY]$/.test(last);
    return word + (jong ? parts[0] : parts[1]);
  }
  /* 조사만 돌려준다 (이름을 굵게 표시할 때처럼 단어와 떼어 써야 할 경우) */
  function particle(word, pair) { return josa(word, pair).slice(String(word).length); }

  return {
    josa: josa, particle: particle,
    STAGES: STAGES, FORMS: FORMS, SPECIES: SPECIES, ITEMS: ITEMS, ITEM_MAP: ITEM_MAP,
    BG_STYLE: BG_STYLE, GAMES: GAMES, RATES: RATES, TUNE: TUNE, TIPS: TIPS,
    species: function (id) {
      for (var i = 0; i < SPECIES.length; i++) if (SPECIES[i].id === id) return SPECIES[i];
      return SPECIES[0];
    },
    form: function (id) {
      for (var i = 0; i < FORMS.length; i++) if (FORMS[i].id === id) return FORMS[i];
      return FORMS[0];
    }
  };
})();
