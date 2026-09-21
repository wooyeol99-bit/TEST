/* 포코펫 — 펫 그림(SVG)을 코드로 그린다. 이미지 파일이 없어 오프라인에서도 가볍다. */
window.Pet = (function () {
  'use strict';
  var D = window.DATA;

  var GEO = {
    egg:    { headR: 24, headY: 52, bodyRx: 0,  bodyRy: 0,  bodyY: 0,  limb: 0 },
    baby:   { headR: 21, headY: 45, bodyRx: 16, bodyRy: 13, bodyY: 75, limb: 0.70 },
    kid:    { headR: 20, headY: 42, bodyRx: 19, bodyRy: 16, bodyY: 73, limb: 0.85 },
    teen:   { headR: 19, headY: 38, bodyRx: 21, bodyRy: 18, bodyY: 71, limb: 1.00 },
    adult:  { headR: 19, headY: 35, bodyRx: 24, bodyRy: 21, bodyY: 69, limb: 1.10 },
    legend: { headR: 19, headY: 33, bodyRx: 25, bodyRy: 22, bodyY: 68, limb: 1.15 }
  };

  function el(tag, attrs, inner) {
    var a = '';
    for (var k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) a += ' ' + k + '="' + attrs[k] + '"';
    return '<' + tag + a + (inner != null ? '>' + inner + '</' + tag + '>' : '/>');
  }

  /* ---------- 눈 ---------- */
  function eyesOpen(cx, cy, r, c) {
    var dx = r * 0.38, w = r * 0.145, h = r * 0.2;
    function one(x) {
      return el('ellipse', { cx: x, cy: cy, rx: w, ry: h, fill: c.eye }) +
             el('circle', { cx: x - w * 0.35, cy: cy - h * 0.4, r: w * 0.42, fill: '#fff', opacity: '0.95' });
    }
    return one(cx - dx) + one(cx + dx);
  }
  function eyesClosed(cx, cy, r, c, flip) {
    var dx = r * 0.38, w = r * 0.2;
    var d = flip
      ? 'M' + (-w) + ',' + (w * 0.5) + ' q' + w + ',' + (-w * 0.9) + ' ' + (w * 2) + ',0'
      : 'M' + (-w) + ',0 q' + w + ',' + (w * 0.9) + ' ' + (w * 2) + ',0';
    var st = { d: d, stroke: c.eye, 'stroke-width': Math.max(1.4, r * 0.085), fill: 'none', 'stroke-linecap': 'round' };
    return el('path', Object.assign({ transform: 'translate(' + (cx - dx) + ',' + cy + ')' }, st)) +
           el('path', Object.assign({ transform: 'translate(' + (cx + dx) + ',' + cy + ')' }, st));
  }
  function eyesX(cx, cy, r, c) {
    var dx = r * 0.38, w = r * 0.16, sw = Math.max(1.3, r * 0.08);
    function one(x) {
      return el('path', { d: 'M' + (x - w) + ',' + (cy - w) + ' L' + (x + w) + ',' + (cy + w), stroke: c.eye, 'stroke-width': sw, 'stroke-linecap': 'round' }) +
             el('path', { d: 'M' + (x + w) + ',' + (cy - w) + ' L' + (x - w) + ',' + (cy + w), stroke: c.eye, 'stroke-width': sw, 'stroke-linecap': 'round' });
    }
    return one(cx - dx) + one(cx + dx);
  }

  /* ---------- 입 ---------- */
  function mouth(cx, cy, r, c, mood) {
    var w = r * 0.3, sw = Math.max(1.3, r * 0.08);
    var stroke = { stroke: c.eye, 'stroke-width': sw, fill: 'none', 'stroke-linecap': 'round' };
    switch (mood) {
      case 'joy':
        return el('path', { d: 'M' + (cx - w) + ',' + cy + ' q' + w + ',' + (w * 1.3) + ' ' + (w * 2) + ',0 z', fill: c.eye }) +
               el('path', { d: 'M' + (cx - w * 0.5) + ',' + (cy + w * 0.55) + ' q' + (w * 0.5) + ',' + (w * 0.45) + ' ' + w + ',0', fill: '#ff8fa3' });
      case 'sad':
      case 'sick':
        return el('path', Object.assign({ d: 'M' + (cx - w) + ',' + (cy + w * 0.6) + ' q' + w + ',' + (-w) + ' ' + (w * 2) + ',0' }, stroke));
      case 'hungry':
        return el('ellipse', { cx: cx, cy: cy + w * 0.3, rx: w * 0.55, ry: w * 0.7, fill: c.eye });
      case 'sleep':
        return el('ellipse', { cx: cx, cy: cy + w * 0.2, rx: w * 0.35, ry: w * 0.3, fill: c.eye, opacity: '0.75' });
      default:
        return el('path', Object.assign({ d: 'M' + (cx - w * 0.7) + ',' + cy + ' q' + (w * 0.7) + ',' + (w * 0.75) + ' ' + (w * 1.4) + ',0' }, stroke));
    }
  }

  /* ---------- 종족별 부속 ---------- */
  function ears(sp, cx, hy, r, c) {
    var col = c.accent;
    if (sp.ear === 'floppy') {
      return el('ellipse', { cx: cx - r * 0.92, cy: hy + r * 0.12, rx: r * 0.26, ry: r * 0.5, fill: col, transform: 'rotate(-12 ' + (cx - r * 0.9) + ' ' + hy + ')' }) +
             el('ellipse', { cx: cx + r * 0.92, cy: hy + r * 0.12, rx: r * 0.26, ry: r * 0.5, fill: col, transform: 'rotate(12 ' + (cx + r * 0.9) + ' ' + hy + ')' });
    }
    if (sp.ear === 'cat') {
      function tri(x, dir) {
        var bx = x, by = hy - r * 0.72;
        return el('path', { d: 'M' + bx + ',' + by + ' l' + (dir * r * 0.34) + ',' + (-r * 0.52) + ' l' + (dir * r * 0.2) + ',' + (r * 0.55) + ' z', fill: col }) +
               el('path', { d: 'M' + (bx + dir * r * 0.08) + ',' + (by - r * 0.04) + ' l' + (dir * r * 0.22) + ',' + (-r * 0.33) + ' l' + (dir * r * 0.12) + ',' + (r * 0.34) + ' z', fill: c.cheek, opacity: '0.85' });
      }
      return tri(cx - r * 0.5, -1) + tri(cx + r * 0.5, 1);
    }
    if (sp.ear === 'bunny') {
      return el('ellipse', { cx: cx - r * 0.42, cy: hy - r * 1.12, rx: r * 0.19, ry: r * 0.58, fill: col, transform: 'rotate(-9 ' + cx + ' ' + hy + ')' }) +
             el('ellipse', { cx: cx + r * 0.42, cy: hy - r * 1.12, rx: r * 0.19, ry: r * 0.58, fill: col, transform: 'rotate(9 ' + cx + ' ' + hy + ')' }) +
             el('ellipse', { cx: cx - r * 0.42, cy: hy - r * 1.12, rx: r * 0.09, ry: r * 0.4, fill: c.cheek, opacity: '0.6', transform: 'rotate(-9 ' + cx + ' ' + hy + ')' }) +
             el('ellipse', { cx: cx + r * 0.42, cy: hy - r * 1.12, rx: r * 0.09, ry: r * 0.4, fill: c.cheek, opacity: '0.6', transform: 'rotate(9 ' + cx + ' ' + hy + ')' });
    }
    return '';
  }

  function tail(sp, cx, by, bx, c) {
    if (sp.tail === 'wag') {
      return el('g', { class: 'p-tail' }, el('ellipse', { cx: cx + bx * 0.95, cy: by - 2, rx: 6, ry: 4, fill: c.accent }));
    }
    if (sp.tail === 'dino') {
      return el('g', { class: 'p-tail' }, el('path', { d: 'M' + (cx + bx * 0.7) + ',' + by + ' q14,-2 18,-10 q-2,12 -12,14 z', fill: c.accent }));
    }
    if (sp.tail === 'cat') {
      return el('g', { class: 'p-tail' }, el('path', { d: 'M' + (cx + bx * 0.8) + ',' + (by + 2) + ' q14,2 12,-12 q-1,-7 -6,-7', stroke: c.accent, 'stroke-width': 4.5, fill: 'none', 'stroke-linecap': 'round' }));
    }
    if (sp.tail === 'puff') {
      return el('g', { class: 'p-tail' }, el('circle', { cx: cx + bx * 0.95, cy: by, r: 5.5, fill: '#fff', opacity: '0.9' }));
    }
    return '';
  }

  function extras(sp, cx, hy, hr, by, bx, c, stageId) {
    var out = '';
    if (sp.extra === 'spike') {
      var top = hy - hr;
      out += el('path', { d: 'M' + (cx - 5) + ',' + (top + 1) + ' l3,-7 l3,7 z', fill: c.accent }) +
             el('path', { d: 'M' + (cx + 1) + ',' + (top - 1) + ' l3,-8 l3,8 z', fill: c.accent });
    }
    if (sp.extra === 'beak') {
      out += el('path', { d: 'M' + (cx - 4) + ',' + (hy + hr * 0.3) + ' l4,5 l4,-5 z', fill: '#f0a93b' });
    }
    if (sp.extra === 'whisker') {
      var wy = hy + hr * 0.28, st = { stroke: c.accent, 'stroke-width': 1.1, 'stroke-linecap': 'round', opacity: '0.8' };
      out += el('path', Object.assign({ d: 'M' + (cx - hr * 0.55) + ',' + wy + ' l-9,-2' }, st)) +
             el('path', Object.assign({ d: 'M' + (cx - hr * 0.55) + ',' + (wy + 3) + ' l-9,2' }, st)) +
             el('path', Object.assign({ d: 'M' + (cx + hr * 0.55) + ',' + wy + ' l9,-2' }, st)) +
             el('path', Object.assign({ d: 'M' + (cx + hr * 0.55) + ',' + (wy + 3) + ' l9,2' }, st));
    }
    if (sp.extra === 'star' && stageId !== 'baby') {
      out += el('path', { class: 'p-star', d: 'M' + (cx + bx + 6) + ',' + (by - 22) + ' l1.6,3.6 l3.9,.5 l-2.9,2.7 l.8,3.9 l-3.4,-1.9 l-3.4,1.9 l.8,-3.9 l-2.9,-2.7 l3.9,-.5 z', fill: '#ffe08a' });
    }
    return out;
  }

  function hatSVG(hatId, cx, hy, hr) {
    if (!hatId) return '';
    var top = hy - hr;
    if (hatId === 'hat_crown') {
      return el('path', { d: 'M' + (cx - 11) + ',' + (top + 2) + ' l0,-9 l5,5 l6,-9 l6,9 l5,-5 l0,9 z', fill: '#ffcf4d', stroke: '#e0a520', 'stroke-width': '1' }) +
             el('circle', { cx: cx, cy: top - 7, r: 1.8, fill: '#ff7a7a' });
    }
    if (hatId === 'hat_cap') {
      return el('path', { d: 'M' + (cx - 12) + ',' + (top + 2) + ' a12,10 0 0 1 24,0 z', fill: '#4c9f70' }) +
             el('path', { d: 'M' + (cx + 1) + ',' + (top + 2) + ' q13,0 14,4 l-14,0 z', fill: '#3b7d59' });
    }
    if (hatId === 'hat_ribbon') {
      return el('g', { transform: 'translate(' + (cx + hr * 0.6) + ',' + (top + 3) + ')' },
        el('path', { d: 'M0,0 l-8,-5 l0,9 z', fill: '#ef6f8e' }) +
        el('path', { d: 'M0,0 l8,-5 l0,9 z', fill: '#ef6f8e' }) +
        el('circle', { cx: 0, cy: 2, r: 2.4, fill: '#ffd0dc' }));
    }
    if (hatId === 'hat_party') {
      return el('path', { d: 'M' + cx + ',' + (top - 13) + ' l8,14 l-16,0 z', fill: '#7cc4f0' }) +
             el('circle', { cx: cx, cy: top - 14, r: 2.2, fill: '#ffd166' });
    }
    return '';
  }

  /* ---------- 알 ---------- */
  function eggSVG(sp, cracks) {
    var c = sp.colors;
    var body = el('path', {
      d: 'M50,16 C66,16 78,38 78,58 C78,76 66,88 50,88 C34,88 22,76 22,58 C22,38 34,16 50,16 z',
      fill: '#fff8ee', stroke: c.accent, 'stroke-width': '2'
    });
    var dots = '';
    var pts = [[38, 42], [60, 36], [66, 58], [34, 64], [50, 74], [52, 52]];
    pts.forEach(function (p, i) { dots += el('ellipse', { cx: p[0], cy: p[1], rx: 5 - (i % 2), ry: 4, fill: c.body, opacity: '0.85' }); });
    var crack = '';
    if (cracks >= 2) crack += el('path', { d: 'M36,44 l6,6 l-5,5 l7,6', stroke: '#9a8a76', 'stroke-width': '1.8', fill: 'none' });
    if (cracks >= 4) crack += el('path', { d: 'M62,34 l-5,7 l6,4 l-4,7', stroke: '#9a8a76', 'stroke-width': '1.8', fill: 'none' });
    return body + dots + crack;
  }

  /* ---------- 본체 ---------- */
  function build(opts) {
    var sp = D.species(opts.species);
    var c = sp.colors;
    var stageId = opts.stageId || 'baby';
    var g = GEO[stageId] || GEO.baby;
    var mood = opts.mood || 'idle';
    var cx = 50;

    if (stageId === 'egg') {
      return '<svg viewBox="0 0 100 100" class="pet-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        el('g', { class: 'p-all' }, eggSVG(sp, opts.cracks || 0)) + '</svg>';
    }

    var hy = g.headY, hr = g.headR, by = g.bodyY, bx = g.bodyRx, bry = g.bodyRy;
    var parts = '';

    /* 전설 단계 오라 */
    if (stageId === 'legend') {
      parts += el('circle', { class: 'p-aura', cx: cx, cy: 55, r: 40, fill: 'url(#auraGrad)' });
    }

    parts += tail(sp, cx, by, bx, c);
    parts += extras(sp, cx, hy, hr, by, bx, c, stageId);

    /* 다리 */
    var footY = by + bry * 0.82, fw = 6 * g.limb;
    parts += el('ellipse', { class: 'p-foot p-foot-l', cx: cx - bx * 0.45, cy: footY, rx: fw, ry: fw * 0.62, fill: c.accent });
    parts += el('ellipse', { class: 'p-foot p-foot-r', cx: cx + bx * 0.45, cy: footY, rx: fw, ry: fw * 0.62, fill: c.accent });

    /* 몸통 */
    parts += el('ellipse', { cx: cx, cy: by, rx: bx, ry: bry, fill: c.body });
    parts += el('ellipse', { cx: cx, cy: by + bry * 0.18, rx: bx * 0.62, ry: bry * 0.62, fill: c.belly });

    /* 팔 */
    var armY = by - bry * 0.1, ar = 5 * g.limb;
    parts += el('ellipse', { class: 'p-arm p-arm-l', cx: cx - bx - ar * 0.3, cy: armY, rx: ar * 0.7, ry: ar, fill: c.body });
    parts += el('ellipse', { class: 'p-arm p-arm-r', cx: cx + bx + ar * 0.3, cy: armY, rx: ar * 0.7, ry: ar, fill: c.body });

    /* 귀(머리 뒤) */
    parts += ears(sp, cx, hy, hr, c);

    /* 머리 */
    parts += el('circle', { cx: cx, cy: hy, r: hr, fill: c.body });
    parts += el('ellipse', { cx: cx, cy: hy + hr * 0.25, rx: hr * 0.62, ry: hr * 0.5, fill: c.belly, opacity: '0.55' });

    /* 볼터치 */
    if (mood !== 'sick') {
      parts += el('ellipse', { cx: cx - hr * 0.62, cy: hy + hr * 0.24, rx: hr * 0.19, ry: hr * 0.13, fill: c.cheek, opacity: '0.7' });
      parts += el('ellipse', { cx: cx + hr * 0.62, cy: hy + hr * 0.24, rx: hr * 0.19, ry: hr * 0.13, fill: c.cheek, opacity: '0.7' });
    }

    /* 눈 */
    var ey = hy - hr * 0.1;
    if (mood === 'sleep') {
      parts += eyesClosed(cx, ey, hr, c, false);
    } else if (mood === 'joy') {
      parts += eyesClosed(cx, ey, hr, c, true);
    } else if (mood === 'sick') {
      parts += eyesX(cx, ey, hr, c);
    } else {
      parts += el('g', { class: 'p-eyes-open' }, eyesOpen(cx, ey, hr, c));
      parts += el('g', { class: 'p-eyes-shut' }, eyesClosed(cx, ey, hr, c, false));
    }

    /* 눈썹 — 슬픔/배고픔 */
    if (mood === 'sad' || mood === 'hungry' || mood === 'tired') {
      var bw = hr * 0.22, byy = ey - hr * 0.38;
      parts += el('path', { d: 'M' + (cx - hr * 0.55) + ',' + (byy - 1) + ' l' + bw + ',' + (bw * 0.5), stroke: c.eye, 'stroke-width': 1.3, 'stroke-linecap': 'round' });
      parts += el('path', { d: 'M' + (cx + hr * 0.55) + ',' + (byy - 1) + ' l' + (-bw) + ',' + (bw * 0.5), stroke: c.eye, 'stroke-width': 1.3, 'stroke-linecap': 'round' });
    }

    /* 입 */
    parts += mouth(cx, hy + hr * 0.42, hr, c, mood);

    /* 아플 때 땀방울, 배고플 때 꼬르륵 */
    if (mood === 'sick') parts += el('path', { class: 'p-sweat', d: 'M' + (cx + hr * 0.95) + ',' + (hy - hr * 0.3) + ' q4,6 0,8 q-4,-2 0,-8 z', fill: '#7cc4f0' });

    /* 모자 */
    parts += hatSVG(opts.hat, cx, hy, hr);

    var defs = '<defs><radialGradient id="auraGrad"><stop offset="0%" stop-color="#fff3b0" stop-opacity="0.85"/><stop offset="100%" stop-color="#fff3b0" stop-opacity="0"/></radialGradient></defs>';

    return '<svg viewBox="0 0 100 100" class="pet-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      defs + el('g', { class: 'p-all' }, parts) + '</svg>';
  }

  /* 화면에 붙이기 */
  function render(node, opts) {
    node.innerHTML = build(opts);
    var scale = (GEO[opts.stageId] || GEO.baby).scale || 1;
    var st = D.STAGES.filter(function (x) { return x.id === opts.stageId; })[0];
    node.style.setProperty('--pet-scale', st ? st.scale : 1);
    node.className = 'pet-holder mood-' + (opts.mood || 'idle');
    return scale;
  }

  /* 썸네일 (알 고르기, 도감) */
  function thumb(speciesId, stageId, mood) {
    return build({ species: speciesId, stageId: stageId || 'kid', mood: mood || 'joy' });
  }

  return { build: build, render: render, thumb: thumb, GEO: GEO };
})();
