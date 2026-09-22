/* 포코펫 — 강아지 렌더러
   사진을 쓰지 않고 캔버스에 해부학적 형태를 쌓은 뒤 털을 한 올씩 그려 사실적인 그림을 만든다.
   좌표계는 가로세로 100 단위의 정사각형, 바닥은 y=96. */
window.Dog = (function () {
  'use strict';

  var GROUND = 96;
  var TAU = Math.PI * 2;

  /* ---------- 색 도구 ---------- */
  function hex2rgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgb2css(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a == null ? 1 : a) + ')'; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function shade(c, amt) {
    return amt >= 0 ? mix(c, [255, 255, 255], amt) : mix(c, [0, 0, 0], -amt);
  }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* 씨앗 고정 난수 — 같은 강아지는 항상 같은 털 결을 갖는다 */
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  /* ---------- 도형 ---------- */
  function ellipse(x, y, rx, ry, rot) { return { t: 'e', x: x, y: y, rx: rx, ry: ry, rot: rot || 0 }; }
  function capsule(x1, y1, x2, y2, r) { return { t: 'c', x1: x1, y1: y1, x2: x2, y2: y2, r: r }; }
  function strand(pts, r) { return { t: 's', pts: pts, r: r }; }

  function pathOf(ctx, s) {
    ctx.beginPath();
    if (s.t === 'e') {
      ctx.ellipse(s.x, s.y, Math.max(0.1, s.rx), Math.max(0.1, s.ry), s.rot, 0, TAU);
    } else if (s.t === 'c') {
      var dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.hypot(dx, dy) || 0.001;
      var nx = -dy / len * s.r, ny = dx / len * s.r;
      var a = Math.atan2(dy, dx);
      ctx.moveTo(s.x1 + nx, s.y1 + ny);
      ctx.lineTo(s.x2 + nx, s.y2 + ny);
      ctx.arc(s.x2, s.y2, s.r, a + Math.PI / 2, a - Math.PI / 2, true);
      ctx.lineTo(s.x1 - nx, s.y1 - ny);
      ctx.arc(s.x1, s.y1, s.r, a - Math.PI / 2, a + Math.PI / 2, true);
      ctx.closePath();
    } else if (s.t === 's') {
      /* 굵기가 변하는 꼬리 — 라운드 조인 선으로 대신 그린다 */
      ctx.moveTo(s.pts[0][0], s.pts[0][1]);
      for (var i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i][0], s.pts[i][1]);
    }
  }
  function fillShape(ctx, s, color) {
    if (s.t === 's') {
      ctx.strokeStyle = color; ctx.lineWidth = s.r * 2;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      pathOf(ctx, s); ctx.stroke();
      return;
    }
    ctx.fillStyle = color; pathOf(ctx, s); ctx.fill();
  }
  function clipShape(ctx, s) {
    if (s.t === 's') {
      /* 선 도형은 클립이 안 되므로 굵은 사각 영역으로 근사 */
      var xs = s.pts.map(function (p) { return p[0]; }), ys = s.pts.map(function (p) { return p[1]; });
      ctx.beginPath();
      ctx.rect(Math.min.apply(null, xs) - s.r, Math.min.apply(null, ys) - s.r,
        Math.max.apply(null, xs) - Math.min.apply(null, xs) + s.r * 2,
        Math.max.apply(null, ys) - Math.min.apply(null, ys) + s.r * 2);
      ctx.clip();
      return;
    }
    pathOf(ctx, s); ctx.clip();
  }
  function centerOf(s) {
    if (s.t === 'e') return [s.x, s.y];
    if (s.t === 'tri') return [(s.x1 + s.x2 + s.x3) / 3, (s.y1 + s.y2 + s.y3) / 3];
    if (s.t === 'c') return [(s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2];
    var m = s.pts[(s.pts.length / 2) | 0];
    return [m[0], m[1]];
  }
  function areaOf(s) {
    if (s.t === 'e') return Math.PI * s.rx * s.ry;
    if (s.t === 'tri') return Math.abs((s.x2 - s.x1) * (s.y3 - s.y1) - (s.x3 - s.x1) * (s.y2 - s.y1)) / 2;
    if (s.t === 'c') return Math.hypot(s.x2 - s.x1, s.y2 - s.y1) * s.r * 2 + Math.PI * s.r * s.r;
    var L = 0;
    for (var i = 1; i < s.pts.length; i++) L += Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1]);
    return L * s.r * 2;
  }
  /* 도형 안의 임의의 점과 그 지점의 털 방향 */
  function samplePoint(s, rnd) {
    if (s.t === 'tri') {
      var a = rnd(), b = rnd();
      if (a + b > 1) { a = 1 - a; b = 1 - b; }
      var x = s.x1 + a * (s.x2 - s.x1) + b * (s.x3 - s.x1);
      var y = s.y1 + a * (s.y2 - s.y1) + b * (s.y3 - s.y1);
      var gx = (s.x1 + s.x2 + s.x3) / 3, gy = (s.y1 + s.y2 + s.y3) / 3;
      var dd = Math.hypot(x - gx, y - gy) || 1;
      return [x, y, (x - gx) / dd, (y - gy) / dd];
    }
    if (s.t === 'e') {
      var a = rnd() * TAU, rr = Math.sqrt(rnd());
      var px = Math.cos(a) * s.rx * rr, py = Math.sin(a) * s.ry * rr;
      var cs = Math.cos(s.rot), sn = Math.sin(s.rot);
      var x = s.x + px * cs - py * sn, y = s.y + px * sn + py * cs;
      var d = Math.hypot(x - s.x, y - s.y) || 1;
      return [x, y, (x - s.x) / d, (y - s.y) / d];
    }
    if (s.t === 'c') {
      var t = rnd(), dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.hypot(dx, dy) || 1;
      var off = (rnd() * 2 - 1) * s.r * 0.92;
      var nx = -dy / len, ny = dx / len;
      return [s.x1 + dx * t + nx * off, s.y1 + dy * t + ny * off, dx / len, dy / len];
    }
    var i = Math.min(s.pts.length - 2, (rnd() * (s.pts.length - 1)) | 0);
    var p0 = s.pts[i], p1 = s.pts[i + 1], tt = rnd();
    var ex = p1[0] - p0[0], ey = p1[1] - p0[1], el = Math.hypot(ex, ey) || 1;
    var o = (rnd() * 2 - 1) * s.r * 0.9;
    return [p0[0] + ex * tt - ey / el * o, p0[1] + ey * tt + ex / el * o, ex / el, ey / el];
  }
  /* 실루엣 가장자리 점 (바깥으로 뻗는 털용) */
  function edgePoint(s, rnd) {
    if (s.t === 'tri') {
      /* 삼각형(선 귀) 둘레 위의 한 점과 바깥 방향 */
      var vs = [[s.x1, s.y1], [s.x2, s.y2], [s.x3, s.y3]];
      var i = (rnd() * 3) | 0, p0 = vs[i], p1 = vs[(i + 1) % 3], t = rnd();
      var ex = p1[0] - p0[0], ey = p1[1] - p0[1], el = Math.hypot(ex, ey) || 1;
      var gx = (s.x1 + s.x2 + s.x3) / 3, gy = (s.y1 + s.y2 + s.y3) / 3;
      var x = p0[0] + ex * t, y = p0[1] + ey * t;
      var nx = -ey / el, ny = ex / el;
      if ((x - gx) * nx + (y - gy) * ny < 0) { nx = -nx; ny = -ny; }
      return [x, y, nx, ny];
    }
    if (s.t === 'e') {
      var a = rnd() * TAU;
      var px = Math.cos(a) * s.rx, py = Math.sin(a) * s.ry;
      var cs = Math.cos(s.rot), sn = Math.sin(s.rot);
      var x = s.x + px * cs - py * sn, y = s.y + px * sn + py * cs;
      var nx = Math.cos(a) / Math.max(0.2, s.rx), ny = Math.sin(a) / Math.max(0.2, s.ry);
      var d = Math.hypot(nx, ny) || 1;
      var rx2 = (nx / d) * cs - (ny / d) * sn, ry2 = (nx / d) * sn + (ny / d) * cs;
      return [x, y, rx2, ry2];
    }
    if (s.t === 'c') {
      var t = rnd(), dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.hypot(dx, dy) || 1;
      var side = rnd() < 0.5 ? 1 : -1;
      var nx = -dy / len * side, ny = dx / len * side;
      return [s.x1 + dx * t + nx * s.r, s.y1 + dy * t + ny * s.r, nx, ny];
    }
    var p = samplePoint(s, rnd);
    return [p[0], p[1], p[2], p[3]];
  }

  /* ---------- 해부 구조 만들기 ---------- */
  function anatomy(breed, st) {
    var S = st.grow;
    var cx = 50;
    var legLen = 27 * st.legRatio * breed.body.leg * S;
    var bodyRy = 18.6 * st.bodyRatio * breed.body.chest * S;
    var bodyRx = 15.8 * st.bodyRatio * breed.body.chest * S * (breed.id === 'dachs' ? 1.1 : 1);
    var bodyCy = GROUND - legLen - bodyRy * 0.35;
    var headR = 13.5 * st.headRatio * breed.head.skull * S;
    var neckTop, headCy;

    if (st.pose === 'lie') {
      /* 갓 태어난 강아지는 몸을 말고 엎드려 있다 */
      bodyRx = 20 * S; bodyRy = 12.5 * S;
      bodyCy = GROUND - bodyRy * 0.95;
      headR = 12.6 * st.headRatio * breed.head.skull * S;
      headCy = bodyCy - bodyRy * 0.15;
    } else {
      headCy = bodyCy - bodyRy * 0.92 - headR * 0.74;
    }
    neckTop = headCy + headR * 0.55;

    var puppyMz = 0.62 + 0.38 * (1 - (st.headRatio - 0.92) / 0.42);
    var mzLen = headR * 0.78 * breed.head.muzzleLen * puppyMz;
    var mzRx = headR * 0.5 * breed.head.muzzleW * (0.85 + 0.15 * puppyMz);
    var mzCy = headCy + headR * 0.46 + mzLen * 0.34;

    var A = {
      S: S, cx: cx, headR: headR, headCy: headCy,
      bodyRx: bodyRx, bodyRy: bodyRy, bodyCy: bodyCy,
      mzRx: mzRx, mzRy: mzLen * 0.72, mzCy: mzCy,
      eyeY: headCy - headR * 0.08, eyeX: headR * 0.44,
      pose: st.pose,
      back: [], body: [], head: [], ears: []
    };

    /* --- 꼬리 --- */
    var tailType = breed.body.tail;
    var tw = 3.2 * S * (breed.body.feather > 0.6 ? 1.5 : 1);
    var tx = cx + bodyRx * 0.92, ty = GROUND - bodyRy * 0.42;
    if (st.pose === 'lie') {
      A.back.push(strand([[cx - bodyRx * 0.75, GROUND - 3 * S], [cx - bodyRx * 1.15, GROUND - 5 * S], [cx - bodyRx * 1.3, GROUND - 2 * S]], tw * 0.7));
    } else if (tailType === 'curl') {
      /* 등 위로 동그랗게 말린 꼬리 (진돗개·시바) */
      A.back.push(strand([
        [tx - 4 * S, ty + 2 * S], [tx + 6 * S, ty - 4 * S], [tx + 10 * S, ty - 14 * S],
        [tx + 4 * S, ty - 22 * S], [tx - 6 * S, ty - 20 * S]
      ], tw * 1.15));
    } else if (tailType === 'plume') {
      /* 등 위로 부채처럼 펼친 꼬리 (포메·말티즈) */
      A.back.push(strand([[tx - 4 * S, ty], [tx + 4 * S, ty - 6 * S], [tx + 3 * S, ty - 14 * S], [tx - 4 * S, ty - 17 * S]], tw * 1.6));
    } else if (tailType === 'saber') {
      /* 바닥을 따라 뻗었다가 끝이 살짝 올라가는 꼬리 (골든·비글) */
      A.back.push(strand([[tx - 3 * S, ty + 2 * S], [tx + 7 * S, ty + 5 * S], [tx + 15 * S, ty + 3 * S], [tx + 20 * S, ty - 4 * S]], tw));
    } else if (tailType === 'stub') {
      A.back.push(ellipse(tx, ty + 2 * S, 4.4 * S, 3.6 * S, 0));
    } else { /* low — 옆으로 늘어뜨린 꼬리 */
      A.back.push(strand([[tx - 3 * S, ty + 2 * S], [tx + 6 * S, ty + 6 * S], [tx + 13 * S, ty + 7 * S]], tw));
    }

    if (st.pose === 'lie') {
      /* 엎드린 자세: 몸통 + 앞발만 살짝 */
      A.body.push(ellipse(cx + bodyRx * 0.12, bodyCy, bodyRx, bodyRy, -0.06));
      A.body.push(ellipse(cx - bodyRx * 0.55, GROUND - 3.4 * S, 6.5 * S, 3.4 * S, -0.1));
      A.body.push(ellipse(cx - bodyRx * 0.18, GROUND - 3.2 * S, 6 * S, 3.2 * S, -0.05));
      A.body.push(capsule(cx - bodyRx * 0.3, bodyCy - bodyRy * 0.3, cx - bodyRx * 0.62, headCy + headR * 0.5, 6.4 * S));
      A.head.push(ellipse(cx - bodyRx * 0.72, headCy + headR * 0.1, headR, headR * 0.94, -0.12));
      A.headCx = cx - bodyRx * 0.72;
    } else {
      /* 앉은 자세 */
      A.back.push(ellipse(cx - bodyRx * 0.95, GROUND - bodyRy * 0.42, bodyRx * 0.66, bodyRy * 0.48, 0.14));
      A.back.push(ellipse(cx + bodyRx * 0.95, GROUND - bodyRy * 0.42, bodyRx * 0.66, bodyRy * 0.48, -0.14));
      A.back.push(ellipse(cx - bodyRx * 1.15, GROUND - 2.6 * S, 6.2 * S, 3.4 * S, 0));
      A.back.push(ellipse(cx + bodyRx * 1.15, GROUND - 2.6 * S, 6.2 * S, 3.4 * S, 0));

      A.body.push(ellipse(cx, bodyCy, bodyRx, bodyRy, 0));
      var legR = 4.4 * S * (0.8 + 0.2 * breed.body.chest);
      var legX = bodyRx * 0.5;
      A.body.push(capsule(cx - legX, bodyCy + bodyRy * 0.15, cx - legX * 0.98, GROUND - 3 * S, legR));
      A.body.push(capsule(cx + legX, bodyCy + bodyRy * 0.15, cx + legX * 0.98, GROUND - 3 * S, legR));
      A.body.push(ellipse(cx - legX * 0.98, GROUND - 2.4 * S, legR * 1.2, legR * 0.66, 0));
      A.body.push(ellipse(cx + legX * 0.98, GROUND - 2.4 * S, legR * 1.2, legR * 0.66, 0));
      A.body.push(capsule(cx, neckTop + headR * 0.1, cx, bodyCy - bodyRy * 0.45, headR * 0.47 * (0.85 + 0.15 * breed.body.chest)));

      A.head.push(ellipse(cx, headCy, headR, headR * 0.95, 0));
      A.headCx = cx;
    }

    /* 볼살 (시바·포메·말티즈처럼 볼이 풍성한 견종) */
    var hcx = A.headCx;
    if (breed.head.cheek > 0.25) {
      var ck = headR * (0.3 + 0.28 * breed.head.cheek);
      A.head.push(ellipse(hcx - headR * 0.78, headCy + headR * 0.3, ck, ck * 1.05, 0));
      A.head.push(ellipse(hcx + headR * 0.78, headCy + headR * 0.3, ck, ck * 1.05, 0));
    }
    /* 주둥이 */
    A.mzCx = hcx;
    A.head.push(ellipse(hcx, mzCy, mzRx, A.mzRy, 0));
    A.head.push(ellipse(hcx, mzCy + A.mzRy * 0.25, mzRx * 0.82, A.mzRy * 0.62, 0));

    /* 귀 */
    var e = st.earErect, es = breed.ear.size, et = breed.ear.type;
    var bx = headR * 0.66, by = headCy - headR * 0.5;
    function earShape(side) {
      var sx = hcx + side * bx;
      if (et === 'drop' || (et !== 'drop' && e < 0.35)) {
        /* 늘어진 귀 (혹은 아직 서지 않은 새끼 귀) */
        var len = headR * (et === 'drop' ? 1.5 * es : 0.85);
        var w = headR * (et === 'drop' ? 0.3 * es : 0.3);
        var el = ellipse(sx + side * headR * 0.13, by + len * 0.52, w, len * 0.62, side * 0.16);
        el.tint = breed.ear.tint == null ? -0.14 : breed.ear.tint;
        el.drop = true;
        return el;
      }
      var tipY = by - headR * (0.62 + 0.28 * es) * (0.35 + 0.65 * e);
      var tipX = sx + side * headR * (0.16 + 0.3 * (1 - e));
      var baseW = headR * (0.24 + 0.16 * es);
      return {
        t: 'tri',
        x1: sx - baseW, y1: by + headR * 0.3,
        x2: sx + baseW, y2: by + headR * 0.16,
        x3: tipX, y3: tipY,
        tint: breed.ear.tint == null ? -0.1 : breed.ear.tint,
        fold: et === 'semi' ? 0.36 : 0
      };
    }
    A.ears = [earShape(-1), earShape(1)];
    A.earBase = by;
    return A;
  }

  /* 삼각 귀를 부드러운 곡선으로 */
  function triPath(ctx, t) {
    var mx = (t.x1 + t.x2) / 2, my = (t.y1 + t.y2) / 2;
    ctx.beginPath();
    ctx.moveTo(t.x1, t.y1);
    ctx.quadraticCurveTo(lerp(t.x1, t.x3, 0.55) - (t.x3 - mx) * 0.18, lerp(t.y1, t.y3, 0.5), t.x3, t.y3);
    ctx.quadraticCurveTo(lerp(t.x3, t.x2, 0.5) + (t.x3 - mx) * 0.18, lerp(t.y3, t.y2, 0.5), t.x2, t.y2);
    ctx.quadraticCurveTo(mx, my + 2, t.x1, t.y1);
    ctx.closePath();
  }

  /* ---------- 무늬 ---------- */
  function paintMarks(ctx, A, breed, st) {
    var hcx = A.headCx, hr = A.headR, hy = A.headCy, S = A.S;
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    breed.marks.forEach(function (m) {
      var c = m.color;
      ctx.fillStyle = c;
      if (m.kind === 'blaze') {
        ctx.beginPath();
        ctx.moveTo(hcx - hr * 0.05, hy - hr * 0.5);
        ctx.quadraticCurveTo(hcx - hr * 0.3, hy - hr * 0.1, hcx - A.mzRx * 0.95, A.mzCy + A.mzRy * 0.5);
        ctx.quadraticCurveTo(hcx, A.mzCy + A.mzRy * 1.15, hcx + A.mzRx * 0.95, A.mzCy + A.mzRy * 0.5);
        ctx.quadraticCurveTo(hcx + hr * 0.3, hy - hr * 0.1, hcx + hr * 0.05, hy - hr * 0.5);
        ctx.closePath(); ctx.fill();
      } else if (m.kind === 'urajiro') {
        ctx.beginPath();
        ctx.ellipse(hcx, A.mzCy + A.mzRy * 0.25, A.mzRx * 1.05, A.mzRy * 0.95, 0, 0, TAU); ctx.fill();
        ctx.beginPath();
        ctx.ellipse(hcx - hr * 0.72, hy + hr * 0.45, hr * 0.32, hr * 0.26, 0, 0, TAU); ctx.fill();
        ctx.beginPath();
        ctx.ellipse(hcx + hr * 0.72, hy + hr * 0.45, hr * 0.32, hr * 0.26, 0, 0, TAU); ctx.fill();
        ctx.beginPath();
        ctx.ellipse(A.cx, A.bodyCy + A.bodyRy * 0.42, A.bodyRx * 0.52, A.bodyRy * 0.55, 0, 0, TAU); ctx.fill();
      } else if (m.kind === 'chest') {
        ctx.beginPath();
        ctx.ellipse(A.cx, A.bodyCy + A.bodyRy * 0.06, A.bodyRx * 0.3, A.bodyRy * 0.44, 0, 0, TAU); ctx.fill();
      } else if (m.kind === 'belly') {
        ctx.beginPath();
        ctx.ellipse(A.cx, A.bodyCy + A.bodyRy * 0.62, A.bodyRx * 0.6, A.bodyRy * 0.45, 0, 0, TAU); ctx.fill();
      } else if (m.kind === 'socks') {
        [-1, 1].forEach(function (s) {
          ctx.beginPath();
          ctx.ellipse(A.cx + s * A.bodyRx * 0.46, GROUND - 4.5 * S, 5.6 * S, 5.5 * S, 0, 0, TAU); ctx.fill();
          ctx.beginPath();
          ctx.ellipse(A.cx + s * A.bodyRx * 1.02, GROUND - 3 * S, 6.6 * S, 3.6 * S, 0, 0, TAU); ctx.fill();
        });
      } else if (m.kind === 'saddle') {
        ctx.beginPath();
        ctx.ellipse(A.cx, A.bodyCy - A.bodyRy * 0.42, A.bodyRx * 0.92, A.bodyRy * 0.68, 0, 0, TAU); ctx.fill();
      } else if (m.kind === 'collar') {
        ctx.beginPath();
        ctx.ellipse(A.cx, A.bodyCy - A.bodyRy * 0.72, A.bodyRx * 0.72, A.bodyRy * 0.3, 0, 0, TAU); ctx.fill();
      } else if (m.kind === 'brows') {
        [-1, 1].forEach(function (s) {
          ctx.beginPath();
          ctx.ellipse(hcx + s * A.eyeX, A.eyeY - hr * 0.3, hr * 0.17, hr * 0.11, 0, 0, TAU); ctx.fill();
        });
      } else if (m.kind === 'muzzletan') {
        ctx.beginPath();
        ctx.ellipse(hcx, A.mzCy + A.mzRy * 0.35, A.mzRx * 0.95, A.mzRy * 0.7, 0, 0, TAU); ctx.fill();
      } else if (m.kind === 'tailtip') {
        var tail = A.back[0];
        if (tail && tail.t === 's') {
          var p = tail.pts[tail.pts.length - 1];
          ctx.beginPath(); ctx.ellipse(p[0], p[1], tail.r * 1.5, tail.r * 1.7, 0, 0, TAU); ctx.fill();
        }
      }
    });
    ctx.restore();
  }

  /* ---------- 한 겹(레이어) 그리기 ---------- */
  var COAT_LEN = { short: 2.0, medium: 3.0, long: 4.2, fluffy: 6.6 };
  var COAT_DENSITY = { short: 0.9, medium: 1.0, long: 1.05, fluffy: 1.1 };

  function drawLayer(shapes, breed, st, A, size, seed, opts) {
    opts = opts || {};
    var cv = document.createElement('canvas');
    cv.width = cv.height = size;
    var ctx = cv.getContext('2d');
    var k = size / 100;
    ctx.scale(k, k);
    var rnd = rng(seed);

    var puppyT = Math.max(0, Math.min(1, (1.34 - st.headRatio) / 0.42));
    var baseCol = mix(hex2rgb(breed.puppy.coat), hex2rgb(breed.coat.base), puppyT);
    var underCol = hex2rgb(breed.coat.under);
    var tipCol = hex2rgb(breed.coat.tip);
    var baseCss = rgb2css(baseCol);

    /* 1) 실루엣 */
    shapes.forEach(function (s) {
      var col = s.tint ? rgb2css(shade(baseCol, s.tint)) : baseCss;
      if (s.t === 'tri') { ctx.fillStyle = col; triPath(ctx, s); ctx.fill(); }
      else fillShape(ctx, s, col);
    });

    /* 2) 무늬 */
    if (opts.marks) paintMarks(ctx, A, breed, st);

    /* 3) 입체감 — 도형마다 왼쪽 위에서 빛이 온다 */
    shapes.forEach(function (s) {
      if (s.t === 's') return;
      ctx.save();
      if (s.t === 'tri') { triPath(ctx, s); ctx.clip(); }
      else clipShape(ctx, s);
      var c = centerOf(s);
      var r = s.t === 'e' ? Math.max(s.rx, s.ry) : (s.t === 'c' ? s.r * 2.2 : 10);
      if (s.t === 'tri') { c = [(s.x1 + s.x2 + s.x3) / 3, (s.y1 + s.y2 + s.y3) / 3]; r = Math.hypot(s.x3 - s.x1, s.y3 - s.y1) * 0.8; }
      var g = ctx.createRadialGradient(c[0] - r * 0.38, c[1] - r * 0.42, r * 0.1, c[0], c[1], r * 1.15);
      g.addColorStop(0, 'rgba(255,255,255,0.34)');
      g.addColorStop(0.42, 'rgba(255,255,255,0.03)');
      g.addColorStop(0.75, 'rgba(0,0,0,0.20)');
      g.addColorStop(1, 'rgba(0,0,0,0.46)');
      ctx.fillStyle = g;
      ctx.fillRect(c[0] - r * 2, c[1] - r * 2, r * 4, r * 4);
      ctx.restore();
    });

    /* 4) 접히는 곳 그늘 */
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    (opts.ao || []).forEach(function (a) {
      var g = ctx.createRadialGradient(a[0], a[1], 0, a[0], a[1], a[2]);
      g.addColorStop(0, 'rgba(0,0,0,' + (a[3] || 0.3) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(a[0] - a[2], a[1] - a[2], a[2] * 2, a[2] * 2);
    });
    ctx.restore();

    /* 5) 털 — 밑색을 읽어서 한 올씩 */
    var img = ctx.getImageData(0, 0, size, size).data;
    function sampleAt(x, y) {
      var px = Math.max(0, Math.min(size - 1, (x * k) | 0));
      var py = Math.max(0, Math.min(size - 1, (y * k) | 0));
      var i = (py * size + px) * 4;
      return img[i + 3] > 20 ? [img[i], img[i + 1], img[i + 2]] : null;
    }

    var coatLen = COAT_LEN[breed.coatLen] * (0.6 + 0.5 * st.fluff) * A.S;
    var density = COAT_DENSITY[breed.coatLen] * (opts.densityMul || 1);
    var lw = Math.max(0.28, 0.42 * A.S);

    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.lineCap = 'round';
    ctx.lineWidth = lw;
    shapes.forEach(function (s) {
      var n = Math.min(2600, Math.round(areaOf(s) * density));
      for (var i = 0; i < n; i++) {
        var p = s.t === 'tri'
          ? (function () {
            var a = rnd(), b = rnd();
            if (a + b > 1) { a = 1 - a; b = 1 - b; }
            var x = s.x1 + a * (s.x2 - s.x1) + b * (s.x3 - s.x1);
            var y = s.y1 + a * (s.y2 - s.y1) + b * (s.y3 - s.y1);
            var cxx = (s.x1 + s.x2 + s.x3) / 3, cyy = (s.y1 + s.y2 + s.y3) / 3;
            var d = Math.hypot(x - cxx, y - cyy) || 1;
            return [x, y, (x - cxx) / d, (y - cyy) / d];
          })()
          : samplePoint(s, rnd);
        var col = sampleAt(p[0], p[1]);
        if (!col) continue;
        /* 털끝으로 갈수록 색이 살짝 변한다 */
        var t = rnd();
        var c2 = t < 0.28 ? mix(col, tipCol, 0.3 + rnd() * 0.25)
          : (t > 0.78 ? mix(col, underCol, 0.22 + rnd() * 0.3) : shade(col, (rnd() - 0.45) * 0.26));
        var len = coatLen * (0.55 + rnd() * 0.9);
        /* 방향: 도형 바깥쪽 + 중력 */
        var dx = p[2] * 0.55, dy = p[3] * 0.55 + 0.75;
        var dl = Math.hypot(dx, dy) || 1;
        dx = dx / dl; dy = dy / dl;
        var bend = (rnd() - 0.5) * 0.7;
        ctx.strokeStyle = rgb2css(c2, 0.75 + rnd() * 0.25);
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.quadraticCurveTo(p[0] + dx * len * 0.5 - dy * bend, p[1] + dy * len * 0.5 + dx * bend,
          p[0] + dx * len, p[1] + dy * len);
        ctx.stroke();
      }
    });
    ctx.restore();

    /* 5.5) 역광 — 어두운 모색일수록 위쪽 가장자리에 빛을 준다 */
    var lum = (baseCol[0] * 0.3 + baseCol[1] * 0.59 + baseCol[2] * 0.11) / 255;
    var rimA = 0.06 + 0.24 * (1 - lum);
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.lineCap = 'round';
    ctx.lineWidth = lw * 1.1;
    shapes.forEach(function (s) {
      if (s.t === 's') return;
      var n = Math.round(Math.sqrt(areaOf(s)) * 9);
      for (var i = 0; i < n; i++) {
        var p = edgePoint(s, rnd);
        /* 왼쪽 위를 향한 가장자리에만 */
        var facing = -p[2] * 0.7 - p[3] * 0.72;
        if (facing < 0.25) continue;
        var col = sampleAt(p[0] - p[2] * 1.5, p[1] - p[3] * 1.5);
        if (!col) continue;
        var len = coatLen * (0.18 + rnd() * 0.3);
        ctx.strokeStyle = rgb2css(shade(col, 0.34 + rnd() * 0.22), rimA * facing * (0.4 + rnd() * 0.6));
        ctx.beginPath();
        ctx.moveTo(p[0] - p[2] * 1.2, p[1] - p[3] * 1.2);
        ctx.lineTo(p[0] + p[2] * len * 0.3, p[1] + p[3] * len * 0.3);
        ctx.stroke();
      }
    });
    ctx.restore();

    /* 6) 바깥으로 삐져나온 털 — 뒤쪽에 깔아 부드러운 윤곽을 만든다 */
    if (coatLen > 2.6) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.lineCap = 'round';
      ctx.lineWidth = lw * 1.05;
      shapes.forEach(function (s) {
        if (s.t === 'tri') return;
        var per = s.t === 'e' ? Math.PI * (s.rx + s.ry) : areaOf(s) / Math.max(1, s.r);
        var n = Math.min(1600, Math.round(per * 4.2 * (breed.coatLen === 'fluffy' ? 1.6 : 1)));
        for (var i = 0; i < n; i++) {
          var p = edgePoint(s, rnd);
          var col = sampleAt(p[0] - p[2] * 1.2, p[1] - p[3] * 1.2);
          if (!col) continue;
          var len = coatLen * (0.28 + rnd() * 0.5);
          var dx = p[2] * 0.85 + (rnd() - 0.5) * 0.35, dy = p[3] * 0.7 + 0.5;
          var dl = Math.hypot(dx, dy) || 1;
          ctx.strokeStyle = rgb2css(mix(col, underCol, 0.25), 0.5 + rnd() * 0.4);
          ctx.beginPath();
          ctx.moveTo(p[0] - p[2] * 0.5, p[1] - p[3] * 0.5);
          ctx.lineTo(p[0] + dx / dl * len, p[1] + dy / dl * len);
          ctx.stroke();
        }
      });
      ctx.restore();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return cv;
  }

  /* ---------- 얼굴 ---------- */
  function drawFace(ctx, A, breed, st, mood) {
    var hcx = A.headCx, hr = A.headR, S = A.S;
    var eyeState = st.eyes;
    if (mood === 'sleep') eyeState = 'closed';
    if (mood === 'joy' && eyeState === 'open') eyeState = 'happy';
    var skin = hex2rgb(breed.coat.skin || '#4a3b34');
    var noseCol = mix([226, 160, 160], skin, st.noseDark);

    /* 눈 */
    var ey = A.eyeY, ex = A.eyeX;
    var eyeR = hr * (0.145 + 0.035 * (st.headRatio - 0.92));
    [-1, 1].forEach(function (s) {
      var x = hcx + s * ex;
      ctx.save();
      if (eyeState === 'closed' || eyeState === 'happy') {
        ctx.strokeStyle = rgb2css(shade(skin, -0.35), 0.92);
        ctx.lineWidth = Math.max(0.5, hr * 0.075);
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (eyeState === 'happy') {
          ctx.moveTo(x - eyeR * 1.25, ey + eyeR * 0.45);
          ctx.quadraticCurveTo(x, ey - eyeR * 1.1, x + eyeR * 1.25, ey + eyeR * 0.45);
        } else {
          ctx.moveTo(x - eyeR * 1.25, ey - eyeR * 0.15);
          ctx.quadraticCurveTo(x, ey + eyeR * 0.95, x + eyeR * 1.25, ey - eyeR * 0.15);
        }
        ctx.stroke();
        ctx.restore();
        return;
      }
      var open = eyeState === 'half' ? 0.55 : 1;
      /* 눈 주변 그늘 */
      var g0 = ctx.createRadialGradient(x, ey, eyeR * 0.5, x, ey, eyeR * 2.2);
      g0.addColorStop(0, 'rgba(0,0,0,0.30)');
      g0.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g0;
      ctx.fillRect(x - eyeR * 2.4, ey - eyeR * 2.4, eyeR * 4.8, eyeR * 4.8);

      /* 아몬드형 눈 */
      ctx.beginPath();
      ctx.moveTo(x - eyeR * 1.32, ey);
      ctx.quadraticCurveTo(x - eyeR * 0.5, ey - eyeR * 1.15 * open, x + eyeR * 0.95, ey - eyeR * 0.55 * open);
      ctx.quadraticCurveTo(x + eyeR * 1.35, ey - eyeR * 0.1, x + eyeR * 1.1, ey + eyeR * 0.35);
      ctx.quadraticCurveTo(x + eyeR * 0.1, ey + eyeR * 1.15, x - eyeR * 1.32, ey);
      ctx.closePath();
      if (s < 0) { /* 반대쪽은 좌우 대칭 */ }
      ctx.save(); ctx.clip();
      /* 홍채 */
      var iris = mix(hex2rgb('#8a5a2b'), hex2rgb('#4a2d14'), 0.2);
      var gi = ctx.createRadialGradient(x - eyeR * 0.2, ey - eyeR * 0.25, eyeR * 0.1, x, ey, eyeR * 1.25);
      gi.addColorStop(0, rgb2css(shade(iris, 0.35)));
      gi.addColorStop(0.6, rgb2css(iris));
      gi.addColorStop(1, rgb2css(shade(iris, -0.6)));
      ctx.fillStyle = gi;
      ctx.fillRect(x - eyeR * 2, ey - eyeR * 2, eyeR * 4, eyeR * 4);
      /* 동공 */
      ctx.fillStyle = 'rgba(12,8,6,0.95)';
      ctx.beginPath(); ctx.ellipse(x, ey + eyeR * 0.05, eyeR * 0.52, eyeR * 0.58, 0, 0, TAU); ctx.fill();
      /* 반사광 */
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath(); ctx.ellipse(x - eyeR * 0.38, ey - eyeR * 0.42, eyeR * 0.26, eyeR * 0.22, -0.4, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.ellipse(x + eyeR * 0.35, ey + eyeR * 0.4, eyeR * 0.16, eyeR * 0.12, 0, 0, TAU); ctx.fill();
      ctx.restore();
      /* 눈꺼풀 라인 */
      ctx.strokeStyle = rgb2css(shade(skin, -0.5), 0.85);
      ctx.lineWidth = Math.max(0.4, eyeR * 0.22);
      ctx.beginPath();
      ctx.moveTo(x - eyeR * 1.32, ey);
      ctx.quadraticCurveTo(x - eyeR * 0.5, ey - eyeR * 1.15 * open, x + eyeR * 0.95, ey - eyeR * 0.55 * open);
      ctx.stroke();
      ctx.restore();
    });

    /* 코 */
    var nx = A.mzCx, ny = A.mzCy - A.mzRy * 0.28;
    var nw = Math.max(1.4, hr * 0.235 * (0.8 + 0.2 * breed.head.muzzleW));
    var nh = nw * 0.78;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(nx - nw, ny - nh * 0.25);
    ctx.quadraticCurveTo(nx - nw * 0.95, ny - nh * 1.05, nx, ny - nh * 0.95);
    ctx.quadraticCurveTo(nx + nw * 0.95, ny - nh * 1.05, nx + nw, ny - nh * 0.25);
    ctx.quadraticCurveTo(nx + nw * 0.8, ny + nh * 1.0, nx, ny + nh * 1.05);
    ctx.quadraticCurveTo(nx - nw * 0.8, ny + nh * 1.0, nx - nw, ny - nh * 0.25);
    ctx.closePath();
    var gn = ctx.createRadialGradient(nx - nw * 0.4, ny - nh * 0.6, nw * 0.1, nx, ny, nw * 1.5);
    gn.addColorStop(0, rgb2css(shade(noseCol, 0.42)));
    gn.addColorStop(0.5, rgb2css(noseCol));
    gn.addColorStop(1, rgb2css(shade(noseCol, -0.45)));
    ctx.fillStyle = gn; ctx.fill();
    ctx.clip();
    /* 콧구멍 */
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      ctx.ellipse(nx + s * nw * 0.46, ny - nh * 0.1, nw * 0.2, nh * 0.34, s * 0.5, 0, TAU);
      ctx.fill();
    });
    /* 젖은 코 반사 */
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(nx - nw * 0.35, ny - nh * 0.62, nw * 0.3, nh * 0.2, -0.3, 0, TAU); ctx.fill();
    ctx.restore();

    /* 인중과 입 */
    ctx.strokeStyle = rgb2css(shade(skin, -0.5), 0.75);
    ctx.lineWidth = Math.max(0.35, hr * 0.045);
    ctx.lineCap = 'round';
    var my = ny + nh * 1.05;
    ctx.beginPath(); ctx.moveTo(nx, my); ctx.lineTo(nx, my + hr * 0.16); ctx.stroke();
    var panting = (mood === 'joy' || mood === 'walk');
    if (panting && st.eyes === 'open') {
      /* 헥헥 — 혀를 내민 입 */
      var moy = my + hr * 0.16;
      ctx.fillStyle = 'rgba(52,26,22,0.92)';
      ctx.beginPath();
      ctx.moveTo(nx - hr * 0.3, moy - hr * 0.02);
      ctx.quadraticCurveTo(nx, moy + hr * 0.3, nx + hr * 0.3, moy - hr * 0.02);
      ctx.quadraticCurveTo(nx, moy + hr * 0.06, nx - hr * 0.3, moy - hr * 0.02);
      ctx.fill();
      var tg = ctx.createLinearGradient(nx, moy, nx, moy + hr * 0.4);
      tg.addColorStop(0, '#e2778c'); tg.addColorStop(1, '#c2536c');
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.moveTo(nx - hr * 0.16, moy + hr * 0.04);
      ctx.quadraticCurveTo(nx - hr * 0.2, moy + hr * 0.36, nx, moy + hr * 0.38);
      ctx.quadraticCurveTo(nx + hr * 0.2, moy + hr * 0.36, nx + hr * 0.16, moy + hr * 0.04);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(150,60,80,0.5)';
      ctx.lineWidth = hr * 0.03;
      ctx.beginPath(); ctx.moveTo(nx, moy + hr * 0.1); ctx.lineTo(nx, moy + hr * 0.32); ctx.stroke();
    } else {
      var droop = (mood === 'sad' || mood === 'sick') ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(nx - hr * 0.3, my + hr * 0.12 - droop * hr * 0.03);
      ctx.quadraticCurveTo(nx - hr * 0.12, my + hr * 0.16 + droop * hr * 0.05, nx, my + hr * 0.16);
      ctx.quadraticCurveTo(nx + hr * 0.12, my + hr * 0.16 + droop * hr * 0.05, nx + hr * 0.3, my + hr * 0.12 - droop * hr * 0.03);
      ctx.stroke();
    }

    /* 수염 */
    ctx.strokeStyle = 'rgba(255,255,255,0.32)';
    ctx.lineWidth = Math.max(0.18, hr * 0.022);
    [-1, 1].forEach(function (s) {
      for (var i = 0; i < 3; i++) {
        var sy = A.mzCy - A.mzRy * 0.1 + i * hr * 0.09;
        ctx.beginPath();
        ctx.moveTo(nx + s * A.mzRx * 0.7, sy);
        ctx.quadraticCurveTo(nx + s * A.mzRx * 1.9, sy - hr * 0.05, nx + s * A.mzRx * 2.6, sy - hr * (0.02 + i * 0.05));
        ctx.stroke();
      }
    });
  }

  /* ---------- 스프라이트 만들기 ---------- */
  function build(opts) {
    var breed = opts.breed, st = opts.stage, size = opts.size || 512;
    var mood = opts.mood || 'idle';
    var A = anatomy(breed, st);
    var seed = 0;
    for (var i = 0; i < breed.id.length; i++) seed = seed * 31 + breed.id.charCodeAt(i);
    seed = (seed + st.weeks * 101) | 0;

    var aoBody = [
      [A.cx, A.bodyCy - A.bodyRy * 0.95, A.bodyRx * 0.62, 0.42],
      [A.cx, A.bodyCy - A.bodyRy * 0.85, A.bodyRx * 0.5, 0.22],
      [A.cx - A.bodyRx * 0.5, A.bodyCy + A.bodyRy * 0.5, A.bodyRx * 0.4, 0.2],
      [A.cx + A.bodyRx * 0.5, A.bodyCy + A.bodyRy * 0.5, A.bodyRx * 0.4, 0.2],
      [A.cx, A.bodyCy + A.bodyRy * 0.72, A.bodyRx * 0.34, 0.3],
      [A.cx - A.bodyRx * 0.82, A.bodyCy + A.bodyRy * 0.3, A.bodyRx * 0.3, 0.26],
      [A.cx + A.bodyRx * 0.82, A.bodyCy + A.bodyRy * 0.3, A.bodyRx * 0.3, 0.26]
    ];
    var aoHead = [
      [A.headCx, A.mzCy - A.mzRy * 1.15, A.mzRx * 1.5, 0.3],
      [A.headCx, A.headCy + A.headR * 0.98, A.headR * 0.62, 0.26],
      [A.headCx - A.headR * 0.95, A.headCy + A.headR * 0.2, A.headR * 0.5, 0.2],
      [A.headCx + A.headR * 0.95, A.headCy + A.headR * 0.2, A.headR * 0.5, 0.2]
    ];

    var tail = drawLayer(A.back, breed, st, A, size, seed + 7, { densityMul: 0.8 });
    var body = drawLayer(A.body, breed, st, A, size, seed + 13, { marks: true, ao: aoBody });
    var headBase = drawLayer(A.ears.concat(A.head), breed, st, A, size, seed + 29, { marks: true, ao: aoHead, densityMul: 1.1 });

    /* 얼굴은 털 위에 또렷하게. 눈 감은 판을 하나 더 만들어 두면 깜빡일 수 있다. */
    function withFace(faceMood) {
      var cv = document.createElement('canvas');
      cv.width = cv.height = size;
      var c = cv.getContext('2d');
      c.drawImage(headBase, 0, 0);
      c.save();
      c.scale(size / 100, size / 100);
      drawFace(c, A, breed, st, faceMood);
      c.restore();
      return cv;
    }
    var head = withFace(mood);
    var eyesOpenNow = st.eyes === 'open' && mood !== 'sleep' && mood !== 'joy';
    var headBlink = eyesOpenNow ? withFace('sleep') : null;

    return { tail: tail, body: body, head: head, headBlink: headBlink, A: A, size: size, breed: breed, stage: st, mood: mood };
  }

  /* 한 장짜리 그림 (썸네일·도감용) */
  function portrait(breed, st, size, mood) {
    var sp = build({ breed: breed, stage: st, size: size || 220, mood: mood || 'idle' });
    var cv = document.createElement('canvas');
    cv.width = cv.height = sp.size;
    var c = cv.getContext('2d');
    c.drawImage(sp.tail, 0, 0); c.drawImage(sp.body, 0, 0); c.drawImage(sp.head, 0, 0);
    return cv;
  }

  /* 매 프레임 합성 — 숨쉬기·꼬리 흔들기·고개 갸웃 */
  function paint(ctx, sp, t, opts) {
    opts = opts || {};
    var S = sp.size, A = sp.A;
    var mood = opts.mood || sp.mood;
    var breathe = Math.sin(t * 0.0016) * (mood === 'sleep' ? 0.016 : 0.009);
    var wagSpeed = mood === 'joy' ? 0.02 : (mood === 'sleep' ? 0 : 0.0055);
    var wagAmt = mood === 'joy' ? 0.5 : (mood === 'sad' || mood === 'sick' ? 0.05 : 0.2);
    var wag = Math.sin(t * wagSpeed) * wagAmt;
    var tilt = mood === 'curious' ? Math.sin(t * 0.0012) * 0.12 : Math.sin(t * 0.0009) * 0.022;

    ctx.clearRect(0, 0, S, S);
    var k = S / 100;

    /* 꼬리 */
    ctx.save();
    var tpx = (A.cx + A.bodyRx * 0.9) * k, tpy = (GROUND - A.bodyRy * 0.42) * k;
    ctx.translate(tpx, tpy);
    ctx.rotate(wag);
    ctx.translate(-tpx, -tpy);
    ctx.drawImage(sp.tail, 0, 0);
    ctx.restore();

    /* 몸 — 숨쉬기 */
    ctx.save();
    ctx.translate(A.cx * k, GROUND * k);
    ctx.scale(1 + breathe * 0.6, 1 + breathe);
    ctx.translate(-A.cx * k, -GROUND * k);
    ctx.drawImage(sp.body, 0, 0);
    ctx.restore();

    /* 머리 — 갸웃 + 숨쉬기 따라 오르내림 */
    ctx.save();
    var px = A.headCx * k, py = (A.headCy + A.headR * 0.9) * k;
    ctx.translate(px, py);
    ctx.rotate(tilt);
    ctx.translate(0, -breathe * A.headR * k * 1.6);
    ctx.translate(-px, -py);
    /* 4초마다 한 번 눈을 깜빡인다 */
    var blinking = sp.headBlink && (t % 4200) < 130;
    ctx.drawImage(blinking ? sp.headBlink : sp.head, 0, 0);
    ctx.restore();
  }

  return { build: build, portrait: portrait, paint: paint, anatomy: anatomy, GROUND: GROUND };
})();
