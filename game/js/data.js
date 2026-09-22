/* 우리집 강아지 — 아이템·수치·문구. 밸런스는 전부 이 파일에서 조정한다. */
window.DATA = (function () {
  'use strict';

  /* ---------- 아이템 ---------- */
  var ITEMS = [
    /* 사료 — 나이에 맞는 사료를 먹여야 한다 */
    { id: 'milk',    name: '강아지 분유', emoji: '🍼', cat: 'food', price: 6,  fill: 30, mood: 4, exp: 5, forStage: [0, 1], desc: '젖먹이 시기에 꼭 필요합니다.' },
    { id: 'mush',    name: '이유식',     emoji: '🥣', cat: 'food', price: 9,  fill: 34, mood: 5, exp: 6, forStage: [1, 2], desc: '사료를 불려 만든 죽. 젖을 뗄 때.' },
    { id: 'puppy',   name: '퍼피 사료',  emoji: '🦴', cat: 'food', price: 12, fill: 38, mood: 4, exp: 7, forStage: [2, 3, 4], desc: '성장기 전용. 열량과 칼슘이 높습니다.' },
    { id: 'adultfd', name: '성견 사료',  emoji: '🍚', cat: 'food', price: 14, fill: 42, mood: 4, exp: 6, forStage: [4, 5], desc: '다 자란 뒤에는 이걸로 바꿔주세요.' },
    { id: 'jerky',   name: '수제 간식',  emoji: '🥩', cat: 'food', price: 20, fill: 16, mood: 22, exp: 8, weight: 0.25, desc: '기분이 확 좋아지지만 살이 찝니다.' },
    { id: 'dental',  name: '이갈이 껌',  emoji: '🦷', cat: 'food', price: 16, fill: 8,  mood: 14, exp: 9, clean: 6, desc: '이갈이 시기 가구를 지켜줍니다.' },

    /* 돌봄 */
    { id: 'brush',   name: '슬리커 브러시', emoji: '🪮', cat: 'care', price: 25, clean: 30, mood: 8,  exp: 6, tool: true, desc: '빗질용. 한 번 사면 계속 씁니다.' },
    { id: 'shampoo', name: '강아지 샴푸', emoji: '🧴', cat: 'care', price: 22, clean: 55, mood: -4, exp: 7, desc: '목욕 한 번. 너무 자주 하면 피부가 상해요.' },
    { id: 'pad',     name: '배변패드',   emoji: '🧻', cat: 'care', price: 8,  padClean: true, exp: 3, desc: '실내 배변을 한 번에 정리합니다.' },
    { id: 'heart',   name: '심장사상충약', emoji: '💊', cat: 'care', price: 30, health: 26, hw: true, exp: 8, desc: '한 달에 한 번. 모기가 옮기는 기생충을 막아요.' },
    { id: 'medicine',name: '처방약',     emoji: '💉', cat: 'care', price: 35, cure: true, health: 34, exp: 10, desc: '아플 때 먹이는 약.' },

    /* 장난감 */
    { id: 'ball',    name: '공',        emoji: '🎾', cat: 'toy', price: 30, mood: 20, energy: -8, exp: 9, tool: true, desc: '물어오기 놀이의 기본.' },
    { id: 'tug',     name: '터그 로프', emoji: '🪢', cat: 'toy', price: 45, mood: 26, energy: -12, exp: 12, tool: true, desc: '당기기 놀이. 힘이 넘치는 아이에게.' },
    { id: 'nose',    name: '노즈워크 매트', emoji: '🧩', cat: 'toy', price: 70, mood: 24, energy: -4, exp: 16, tool: true, desc: '코를 쓰게 해서 머리를 지치게 합니다.' },

    /* 산책 용품 (장착) */
    { id: 'leash_basic', name: '기본 목줄', emoji: '🦮', cat: 'gear', price: 0,   slot: 'leash', desc: '산책의 시작.' },
    { id: 'harness',     name: '하네스',   emoji: '🎽', cat: 'gear', price: 90,  slot: 'leash', desc: '목이 아닌 가슴으로 당겨 기관지에 좋습니다.' },
    { id: 'bandana',     name: '스카프',   emoji: '🧣', cat: 'wear', price: 55,  slot: 'wear', desc: '목에 살짝. 사진이 잘 나옵니다.' },
    { id: 'raincoat',    name: '우비',     emoji: '🧥', cat: 'wear', price: 120, slot: 'wear', desc: '비 오는 날도 산책할 수 있어요.' },

    /* 배경 */
    { id: 'bg_living', name: '거실',   emoji: '🛋️', cat: 'bg', price: 0,   slot: 'bg', desc: '기본 공간.' },
    { id: 'bg_yard',   name: '마당',   emoji: '🌿', cat: 'bg', price: 130, slot: 'bg', desc: '잔디가 깔린 작은 마당.' },
    { id: 'bg_park',   name: '공원',   emoji: '🌳', cat: 'bg', price: 190, slot: 'bg', desc: '산책하기 좋은 공원.' },
    { id: 'bg_beach',  name: '바닷가', emoji: '🏖️', cat: 'bg', price: 260, slot: 'bg', desc: '모래를 파며 노는 곳.' }
  ];
  var ITEM_MAP = {};
  ITEMS.forEach(function (it) { ITEM_MAP[it.id] = it; });

  var BG_STYLE = {
    bg_living: { sky: 'linear-gradient(180deg,#fdf2e2 0%,#f3e2cb 100%)', floor: '#c69a6b' },
    bg_yard:   { sky: 'linear-gradient(180deg,#d9eefc 0%,#eef7e8 100%)', floor: '#7fae5c' },
    bg_park:   { sky: 'linear-gradient(180deg,#cfe9fb 0%,#e8f5e4 100%)', floor: '#6fa551' },
    bg_beach:  { sky: 'linear-gradient(180deg,#bfe6fb 0%,#eaf6ff 100%)', floor: '#e6cf9c' }
  };

  /* ---------- 예방접종 (실제 표준 일정) ---------- */
  var VACCINES = [
    { id: 'dhppl1', name: '종합백신 1차', week: 6,  price: 25, need: 2, about: '홍역·간염·파보 등 5종을 한 번에.' },
    { id: 'dhppl2', name: '종합백신 2차', week: 8,  price: 25, need: 2, about: '2주 간격으로 이어서 맞습니다.' },
    { id: 'corona', name: '코로나 장염',  week: 10, price: 22, need: 2, about: '설사병을 막아줍니다.' },
    { id: 'dhppl3', name: '종합백신 3차', week: 12, price: 25, need: 3, about: '이때부터 조심스레 바깥 구경이 가능합니다.' },
    { id: 'kennel', name: '켄넬코프',    week: 14, price: 22, need: 3, about: '기침병. 다른 개를 만나기 전에.' },
    { id: 'rabies', name: '광견병',      week: 16, price: 20, need: 3, about: '법으로 정해진 필수 접종입니다.' }
  ];

  /* ---------- 훈련 ---------- */
  var TRICKS = [
    { id: 'name', name: '이름 부르기', emoji: '📣', minStage: 2, about: '모든 훈련의 출발점.' },
    { id: 'sit',  name: '앉아',       emoji: '🐕', minStage: 2, about: '가장 먼저 배우는 기본 자세.' },
    { id: 'wait', name: '기다려',     emoji: '✋', minStage: 3, about: '위험한 상황에서 생명을 구합니다.' },
    { id: 'paw',  name: '손',         emoji: '🤝', minStage: 3, about: '보호자와의 신뢰를 보여줍니다.' },
    { id: 'come', name: '이리와',     emoji: '🏃', minStage: 4, about: '목줄이 풀렸을 때 가장 중요한 명령.' },
    { id: 'heel', name: '옆에 걷기',  emoji: '🦮', minStage: 4, about: '산책이 편해지는 마지막 관문.' }
  ];

  /* ---------- 미니게임 ---------- */
  var GAMES = [
    { id: 'fetch',  name: '공 물어오기', emoji: '🎾', desc: '떨어지는 공과 간식을 받아요. 돌멩이는 피하고요!' },
    { id: 'nose',   name: '노즈워크',   emoji: '👃', desc: '컵 세 개 중 간식이 든 컵을 코로 찾아요.' },
    { id: 'memory', name: '훈련 순서',  emoji: '🧠', desc: '보여준 순서대로 명령을 눌러 훈련시켜요.' }
  ];

  /* ---------- 시간당 변화 ---------- */
  var RATES = {
    fill: -14, mood: -10, clean: -6, energy: -8,
    energySleep: 24, fillSleep: -5, moodSleep: -1,
    poopDirty: -7, hurt: -10, heal: 4
  };

  var TUNE = {
    poopEveryH: 2.4, maxPoops: 4,
    offlineCapEasyH: 8, offlineCapHardH: 30,
    sleepStartHour: 22, sleepEndHour: 7,
    deathAfterH: 8,
    dailyBonus: 35,
    walkCooldownMin: 45,     /* 산책은 45분마다 */
    groomCooldownMin: 30,
    heartwormDays: 30        /* 심장사상충약 주기 */
  };

  var TIPS = [
    '3차 접종이 끝나기 전에 밖에 나가면 파보·홍역에 걸릴 수 있어요. 병원부터 다녀오세요.',
    '생후 4~12주는 사회화기입니다. 이때 많은 것을 좋게 경험하면 겁 없는 어른 개가 돼요.',
    '사료는 나이에 맞게. 퍼피 사료를 성견에게 계속 주면 살이 찝니다.',
    '장모종은 빗질을 거르면 털이 엉켜 피부병이 생깁니다.',
    '산책은 운동이자 화장실이고 세상 구경입니다. 견종마다 필요한 양이 달라요.',
    '심장사상충약은 한 달에 한 번, 모기 없는 계절에도 거르지 마세요.',
    '훈련은 짧고 즐겁게. 한 번에 5분이면 충분합니다.',
    '초콜릿·포도·양파·자일리톨은 개에게 독입니다. 절대 주지 마세요.',
    '이갈이는 생후 4~7개월. 껌을 주면 가구를 지킬 수 있어요.'
  ];

  /* ---------- 한국어 조사 ---------- */
  function josa(word, pair) {
    var parts = String(pair).split('/');
    var last = String(word || '').slice(-1);
    var code = last.charCodeAt(0), jong;
    if (code >= 0xac00 && code <= 0xd7a3) jong = (code - 0xac00) % 28 !== 0;
    else jong = !/[aeiouyAEIOUY]$/.test(last);
    return word + (jong ? parts[0] : parts[1]);
  }
  function particle(word, pair) { return josa(word, pair).slice(String(word).length); }

  function item(id) { return ITEM_MAP[id]; }
  function vaccine(id) {
    for (var i = 0; i < VACCINES.length; i++) if (VACCINES[i].id === id) return VACCINES[i];
    return null;
  }

  return {
    ITEMS: ITEMS, ITEM_MAP: ITEM_MAP, BG_STYLE: BG_STYLE,
    VACCINES: VACCINES, TRICKS: TRICKS, GAMES: GAMES,
    RATES: RATES, TUNE: TUNE, TIPS: TIPS,
    josa: josa, particle: particle, item: item, vaccine: vaccine
  };
})();
