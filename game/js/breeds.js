/* 포코펫 — 견종 데이터. 실제 견종의 체형·모색·기질 수치를 그대로 옮겼다.
   렌더러(dog.js)와 게임 로직(state.js)이 이 숫자만 보고 움직인다. */
window.BREEDS = (function () {
  'use strict';

  /* 모색 팔레트 헬퍼 */
  function coat(base, under, tip, skin) {
    return { base: base, under: under || base, tip: tip || base, skin: skin || '#4a3b34' };
  }

  /* markings — 렌더러가 실루엣 안쪽에만 얹는 무늬
     kind: blaze(주둥이~이마 흰줄) chest(가슴) socks(발) belly(배) saddle(등안장)
           mask(얼굴 어두운 부분) brows(눈썹 탄포인트) tailtip(꼬리끝) urajiro(시바 크림) */
  var B = [
    {
      id: 'jindo', name: '진돗개', en: 'Korean Jindo',
      origin: '대한민국 진도', size: 'medium',
      desc: '주인을 한 번 정하면 평생 따르는 한국 토종견. 자립심이 강하고 영리해서 훈련이 빠르지만 낯선 사람에게는 경계가 심합니다.',
      note: '천연기념물 제53호. 귀소본능으로 유명합니다.',
      adult: { kg: [15, 23], cm: [48, 55], life: [12, 15] },
      traits: { energy: 4, groom: 3, train: 4, friendly: 3, bark: 3 },
      coat: coat('#e8dcc8', '#fffaf0', '#cbb894'),
      coatLen: 'medium',
      marks: [{ kind: 'urajiro', color: '#fffdf6' }, { kind: 'chest', color: '#fffdf6' }],
      head: { skull: 1.0, muzzleLen: 1.05, muzzleW: 0.92, cheek: 0.35, stop: 0.5 },
      ear: { type: 'prick', size: 1.0, tint: -0.12, erectWeek: 10 },
      body: { chest: 1.0, leg: 1.05, tail: 'curl', feather: 0.25 },
      puppy: { coat: '#f0e6d4', fluff: 0.55 }
    },
    {
      id: 'shiba', name: '시바견', en: 'Shiba Inu',
      origin: '일본', size: 'small',
      desc: '여우를 닮은 작은 일본견. 깔끔한 성격이라 배변을 빨리 가리지만 고집이 세서 산책 훈련에 인내가 필요합니다.',
      note: '배에서 턱까지 크림색으로 빠지는 무늬를 우라지로라고 부릅니다.',
      adult: { kg: [8, 11], cm: [35, 41], life: [13, 16] },
      traits: { energy: 4, groom: 3, train: 3, friendly: 3, bark: 2 },
      coat: coat('#c9793b', '#e8a463', '#a75c26'),
      coatLen: 'medium',
      marks: [{ kind: 'urajiro', color: '#fdf3e2' }, { kind: 'brows', color: '#f0dcc0' }],
      head: { skull: 1.02, muzzleLen: 0.95, muzzleW: 0.9, cheek: 0.55, stop: 0.55 },
      ear: { type: 'prick', size: 0.92, tint: -0.18, erectWeek: 9 },
      body: { chest: 0.98, leg: 0.95, tail: 'curl', feather: 0.35 },
      puppy: { coat: '#d99a5e', fluff: 0.7 }
    },
    {
      id: 'golden', name: '골든 리트리버', en: 'Golden Retriever',
      origin: '스코틀랜드', size: 'large',
      desc: '아이들에게 가장 무난한 대형견. 사람을 좋아하고 물어오기 놀이를 끝없이 합니다. 대신 운동량이 많고 털이 아주 많이 빠집니다.',
      note: '원래 물새 사냥감을 물어오도록 만들어진 견종이라 입이 부드럽습니다.',
      adult: { kg: [25, 34], cm: [51, 61], life: [10, 12] },
      traits: { energy: 5, groom: 4, train: 5, friendly: 5, bark: 2 },
      coat: coat('#d7a45e', '#ecc88c', '#b7833f'),
      coatLen: 'long',
      marks: [],
      head: { skull: 1.12, muzzleLen: 1.15, muzzleW: 1.05, cheek: 0.2, stop: 0.6 },
      ear: { type: 'drop', size: 1.0, tint: -0.16, erectWeek: 0 },
      body: { chest: 1.15, leg: 1.12, tail: 'saber', feather: 1.0 },
      puppy: { coat: '#e7c housing', fluff: 0.8 }
    },
    {
      id: 'pom', name: '포메라니안', en: 'Pomeranian',
      origin: '독일 포메른', size: 'small',
      desc: '솜뭉치 같은 소형견. 작아도 겁이 없고 잘 짖습니다. 속털이 빽빽해서 빗질을 게을리하면 금방 엉킵니다.',
      note: '털을 밀면 다시 제대로 자라지 않을 수 있어 미용에 주의가 필요합니다.',
      adult: { kg: [1.9, 3.5], cm: [18, 22], life: [12, 16] },
      traits: { energy: 3, groom: 5, train: 3, friendly: 4, bark: 5 },
      coat: coat('#e59a45', '#f7c987', '#c1752c'),
      coatLen: 'fluffy',
      marks: [],
      head: { skull: 1.0, muzzleLen: 0.62, muzzleW: 0.8, cheek: 0.9, stop: 0.75 },
      ear: { type: 'prick', size: 0.62, tint: -0.12, erectWeek: 8 },
      body: { chest: 0.82, leg: 0.72, tail: 'plume', feather: 1.0 },
      puppy: { coat: '#eeae64', fluff: 1.0 }
    },
    {
      id: 'beagle', name: '비글', en: 'Beagle',
      origin: '영국', size: 'small',
      desc: '코로 세상을 읽는 사냥견. 냄새를 따라가면 이름을 불러도 안 옵니다. 식탐이 강해 비만 관리가 중요합니다.',
      note: '삼색(블랙·탄·화이트)이 가장 흔하고, 꼬리 끝이 흰 것은 풀숲에서 위치를 알리기 위함입니다.',
      adult: { kg: [9, 11], cm: [33, 41], life: [12, 15] },
      traits: { energy: 4, groom: 2, train: 2, friendly: 5, bark: 4 },
      coat: coat('#c08a4e', '#dcae74', '#9c6a33'),
      coatLen: 'short',
      marks: [
        { kind: 'saddle', color: '#2b2622' },
        { kind: 'blaze', color: '#fdfaf4' },
        { kind: 'chest', color: '#fdfaf4' },
        { kind: 'socks', color: '#fdfaf4' },
        { kind: 'tailtip', color: '#fdfaf4' }
      ],
      head: { skull: 1.0, muzzleLen: 1.0, muzzleW: 0.95, cheek: 0.2, stop: 0.5 },
      ear: { type: 'drop', size: 1.25, tint: -0.55, erectWeek: 0 },
      body: { chest: 1.0, leg: 0.82, tail: 'saber', feather: 0.2 },
      puppy: { coat: '#cf9a5e', fluff: 0.5 }
    },
    {
      id: 'dachs', name: '닥스훈트', en: 'Dachshund',
      origin: '독일', size: 'small',
      desc: '오소리 굴에 들어가려고 다리를 짧게 만든 사냥견. 용감하고 고집이 셉니다. 허리가 길어 소파 점프를 막아줘야 합니다.',
      note: '계단과 점프는 디스크의 가장 큰 원인입니다.',
      adult: { kg: [7, 14], cm: [20, 27], life: [12, 16] },
      traits: { energy: 3, groom: 2, train: 3, friendly: 4, bark: 4 },
      coat: coat('#241f1c', '#3a322c', '#141110'),
      coatLen: 'short',
      marks: [
        { kind: 'brows', color: '#a9682f' },
        { kind: 'muzzletan', color: '#a9682f' },
        { kind: 'socks', color: '#a9682f' },
        { kind: 'chest', color: '#a9682f' }
      ],
      head: { skull: 0.92, muzzleLen: 1.35, muzzleW: 0.78, cheek: 0.1, stop: 0.25 },
      ear: { type: 'drop', size: 1.15, tint: -0.1, erectWeek: 0 },
      body: { chest: 1.05, leg: 0.5, tail: 'low', feather: 0.2 },
      puppy: { coat: '#2e2724', fluff: 0.4 }
    },
    {
      id: 'corgi', name: '웰시코기', en: 'Pembroke Welsh Corgi',
      origin: '웨일스', size: 'small',
      desc: '소를 몰던 목축견. 다리가 짧은데도 체력이 엄청나고 머리가 좋습니다. 잘 먹어서 금방 살이 찝니다.',
      note: '발뒤꿈치를 물어 소를 몰던 습성이 남아 발목을 툭툭 건드리기도 합니다.',
      adult: { kg: [10, 14], cm: [25, 30], life: [12, 15] },
      traits: { energy: 4, groom: 4, train: 4, friendly: 5, bark: 4 },
      coat: coat('#c8823c', '#e3a763', '#a4652a'),
      coatLen: 'medium',
      marks: [
        { kind: 'blaze', color: '#fdfaf4' },
        { kind: 'chest', color: '#fdfaf4' },
        { kind: 'socks', color: '#fdfaf4' },
        { kind: 'belly', color: '#fdfaf4' }
      ],
      head: { skull: 1.05, muzzleLen: 0.95, muzzleW: 0.9, cheek: 0.35, stop: 0.5 },
      ear: { type: 'prick', size: 1.35, tint: -0.12, erectWeek: 11 },
      body: { chest: 1.08, leg: 0.48, tail: 'stub', feather: 0.4 },
      puppy: { coat: '#d4956a', fluff: 0.7 }
    },
    {
      id: 'border', name: '보더콜리', en: 'Border Collie',
      origin: '영국·스코틀랜드 국경', size: 'medium',
      desc: '세상에서 가장 영리한 견종으로 꼽힙니다. 머리를 쓰게 해주지 않으면 스스로 사고를 칩니다. 초보자에게는 어려운 견종입니다.',
      note: '양을 노려보는 \'아이(eye)\' 자세로 무리를 움직입니다.',
      adult: { kg: [14, 20], cm: [46, 56], life: [12, 15] },
      traits: { energy: 5, groom: 3, train: 5, friendly: 4, bark: 3 },
      coat: coat('#22201f', '#3b3735', '#111010'),
      coatLen: 'long',
      marks: [
        { kind: 'blaze', color: '#fbf8f2' },
        { kind: 'chest', color: '#fbf8f2' },
        { kind: 'socks', color: '#fbf8f2' },
        { kind: 'collar', color: '#fbf8f2' },
        { kind: 'tailtip', color: '#fbf8f2' }
      ],
      head: { skull: 0.98, muzzleLen: 1.1, muzzleW: 0.85, cheek: 0.25, stop: 0.45 },
      ear: { type: 'semi', size: 1.0, tint: -0.05, erectWeek: 12 },
      body: { chest: 1.0, leg: 1.08, tail: 'low', feather: 0.8 },
      puppy: { coat: '#2b2827', fluff: 0.7 }
    },
    {
      id: 'maltese', name: '말티즈', en: 'Maltese',
      origin: '지중해 몰타', size: 'small',
      desc: '국내에서 가장 많이 키우는 소형견. 사람 곁을 떠나지 않아 혼자 두면 분리불안이 오기 쉽습니다.',
      note: '털이 빠지지 않는 대신 계속 자라서 정기 미용이 꼭 필요합니다.',
      adult: { kg: [2, 4], cm: [20, 25], life: [12, 15] },
      traits: { energy: 2, groom: 5, train: 3, friendly: 5, bark: 4 },
      coat: coat('#fbf7ef', '#ffffff', '#e8e0d2', '#3a2f2a'),
      coatLen: 'long',
      marks: [],
      head: { skull: 0.96, muzzleLen: 0.75, muzzleW: 0.78, cheek: 0.6, stop: 0.7 },
      ear: { type: 'drop', size: 0.95, tint: -0.08, erectWeek: 0 },
      body: { chest: 0.85, leg: 0.78, tail: 'plume', feather: 1.0 },
      puppy: { coat: '#fdfaf4', fluff: 0.9 }
    }
  ];

  /* 골든 퍼피 모색 오타 방지 */
  B.forEach(function (b) { if (!/^#[0-9a-f]{6}$/i.test(b.puppy.coat)) b.puppy.coat = b.coat.under; });

  /* ---------- 성장 단계: 실제 강아지 발달 과정 ---------- */
  var STAGES = [
    {
      id: 'newborn', label: '신생아', weeks: 0, ageText: '0~2주',
      exp: 0, minAgeH: 0,
      pose: 'lie', eyes: 'closed', earErect: 0,
      grow: 0.46, headRatio: 1.34, legRatio: 0.35, bodyRatio: 0.86, fluff: 1.0, noseDark: 0.12,
      about: '눈도 귀도 닫혀 있고 체온 조절을 못 합니다. 따뜻하게만 해주면 됩니다.',
      care: ['2시간마다 분유', '배를 살살 문질러 배변 유도', '담요로 보온']
    },
    {
      id: 'open', label: '눈뜬 아기', weeks: 2, ageText: '2~4주',
      exp: 40, minAgeH: 0.4,
      pose: 'sit', eyes: 'half', earErect: 0,
      grow: 0.55, headRatio: 1.26, legRatio: 0.52, bodyRatio: 0.88, fluff: 0.95, noseDark: 0.4,
      about: '눈을 뜨고 소리를 듣기 시작합니다. 비틀비틀 걸음마를 배웁니다.',
      care: ['분유에서 이유식으로', '첫 배변 패드 교육', '조심스러운 첫 사회화']
    },
    {
      id: 'pup', label: '젖뗀 강아지', weeks: 4, ageText: '1~3개월',
      exp: 150, minAgeH: 3,
      pose: 'sit', eyes: 'open', earErect: 0.35,
      grow: 0.68, headRatio: 1.18, legRatio: 0.7, bodyRatio: 0.92, fluff: 0.8, noseDark: 0.8,
      about: '사회화기입니다. 이때 만난 것들이 평생 성격을 만듭니다. 1·2차 예방접종 시기.',
      care: ['퍼피 사료 하루 3~4번', '종합백신 접종', '이름·배변 교육 시작']
    },
    {
      id: 'young', label: '유년기', weeks: 12, ageText: '3~6개월',
      exp: 380, minAgeH: 14,
      pose: 'sit', eyes: 'open', earErect: 0.8,
      grow: 0.83, headRatio: 1.07, legRatio: 0.88, bodyRatio: 0.96, fluff: 0.55, noseDark: 1,
      about: '이갈이를 하고 접종이 끝나 드디어 밖에 나갈 수 있습니다. 귀가 서는 견종은 이때 섭니다.',
      care: ['접종 완료 후 첫 산책', '이갈이용 껌', '앉아·기다려 훈련']
    },
    {
      id: 'teen', label: '청소년견', weeks: 26, ageText: '6~12개월',
      exp: 900, minAgeH: 40,
      pose: 'sit', eyes: 'open', earErect: 1,
      grow: 0.94, headRatio: 0.99, legRatio: 1.0, bodyRatio: 0.98, fluff: 0.4, noseDark: 1,
      about: '몸은 거의 다 컸지만 머리는 아직 어립니다. 말을 안 듣는 반항기가 옵니다.',
      care: ['성견 사료로 서서히 전환', '중성화 상담', '산책 시간 늘리기']
    },
    {
      id: 'adult', label: '성견', weeks: 52, ageText: '1년~',
      exp: 2000, minAgeH: 96,
      pose: 'sit', eyes: 'open', earErect: 1,
      grow: 1.0, headRatio: 0.92, legRatio: 1.0, bodyRatio: 1.0, fluff: 0.3, noseDark: 1,
      about: '몸도 마음도 완성된 어른 개. 이제부터는 함께 나이 들어갑니다.',
      care: ['하루 2번 규칙적인 산책', '연 1회 종합검진과 추가접종', '체중 관리']
    }
  ];

  function breed(id) {
    for (var i = 0; i < B.length; i++) if (B[i].id === id) return B[i];
    return B[0];
  }
  function stage(idx) { return STAGES[Math.max(0, Math.min(STAGES.length - 1, idx))]; }

  return { LIST: B, STAGES: STAGES, breed: breed, stage: stage };
})();
