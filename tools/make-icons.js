/* 포코펫 아이콘 생성기 — 의존성 없이 PNG를 직접 써서 game/icons/*.png 를 만든다.
   사용법: node tools/make-icons.js */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ---------- 아주 작은 PNG 인코더 ---------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; /* filter: none */
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ---------- 캔버스 ---------- */
function hex(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
class Canvas {
  constructor(size) { this.s = size; this.px = new Float32Array(size * size * 4); }
  blend(x, y, rgb, a) {
    if (a <= 0 || x < 0 || y < 0 || x >= this.s || y >= this.s) return;
    const i = (y * this.s + x) * 4, p = this.px;
    const na = a + p[i + 3] * (1 - a);
    if (na <= 0) return;
    p[i] = (rgb[0] * a + p[i] * p[i + 3] * (1 - a)) / na;
    p[i + 1] = (rgb[1] * a + p[i + 1] * p[i + 3] * (1 - a)) / na;
    p[i + 2] = (rgb[2] * a + p[i + 2] * p[i + 3] * (1 - a)) / na;
    p[i + 3] = na;
  }
  /* sdf < 0 이면 내부 */
  shape(sdf, color, alpha = 1, aa = 1.2) {
    const rgb = typeof color === 'string' ? hex(color) : color;
    for (let y = 0; y < this.s; y++) {
      for (let x = 0; x < this.s; x++) {
        const d = sdf(x + 0.5, y + 0.5);
        if (d > aa) continue;
        const cov = Math.min(1, Math.max(0, 0.5 - d / aa));
        if (cov > 0) this.blend(x, y, rgb, cov * alpha);
      }
    }
  }
  gradientRoundRect(r, c1, c2) {
    const s = this.s, a = hex(c1), b = hex(c2);
    for (let y = 0; y < s; y++) {
      const t = y / (s - 1);
      const col = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      for (let x = 0; x < s; x++) {
        const dx = Math.max(Math.abs(x + 0.5 - s / 2) - (s / 2 - r), 0);
        const dy = Math.max(Math.abs(y + 0.5 - s / 2) - (s / 2 - r), 0);
        const d = Math.hypot(dx, dy) - r;
        const cov = Math.min(1, Math.max(0, 0.5 - d / 1.2));
        if (cov > 0) this.blend(x, y, col, cov);
      }
    }
  }
  toPNG() {
    const s = this.s, out = Buffer.alloc(s * s * 4);
    for (let i = 0; i < s * s; i++) {
      out[i * 4] = Math.round(Math.min(255, Math.max(0, this.px[i * 4])));
      out[i * 4 + 1] = Math.round(Math.min(255, Math.max(0, this.px[i * 4 + 1])));
      out[i * 4 + 2] = Math.round(Math.min(255, Math.max(0, this.px[i * 4 + 2])));
      out[i * 4 + 3] = Math.round(Math.min(255, Math.max(0, this.px[i * 4 + 3] * 255)));
    }
    return encodePNG(s, s, out);
  }
  downsample(factor) {
    const s2 = this.s / factor, c = new Canvas(s2);
    for (let y = 0; y < s2; y++) {
      for (let x = 0; x < s2; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let j = 0; j < factor; j++) {
          for (let i = 0; i < factor; i++) {
            const k = ((y * factor + j) * this.s + (x * factor + i)) * 4;
            const pa = this.px[k + 3];
            r += this.px[k] * pa; g += this.px[k + 1] * pa; b += this.px[k + 2] * pa; a += pa;
          }
        }
        const n = factor * factor, k2 = (y * s2 + x) * 4;
        c.px[k2] = a > 0 ? r / a : 0;
        c.px[k2 + 1] = a > 0 ? g / a : 0;
        c.px[k2 + 2] = a > 0 ? b / a : 0;
        c.px[k2 + 3] = a / n;
      }
    }
    return c;
  }
}

/* sdf 헬퍼 */
const circle = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) - r;
const ellipse = (cx, cy, rx, ry) => (x, y) => {
  const k = Math.hypot((x - cx) / rx, (y - cy) / ry);
  return (k - 1) * Math.min(rx, ry);
};
const ring = (cx, cy, r, t, yMin) => (x, y) => {
  if (y < yMin) return 999;
  return Math.abs(Math.hypot(x - cx, y - cy) - r) - t;
};

/* ---------- 아이콘 그리기 ---------- */
function drawIcon(size, opts) {
  const SS = 3;
  const c = new Canvas(size * SS);
  const S = size * SS;
  const pad = opts.maskable ? S * 0.14 : 0; /* 마스크형은 안쪽에 여백 */

  c.gradientRoundRect(opts.maskable ? 0 : S * 0.22, '#8fd9b0', '#4c9f70');

  /* 바닥 */
  c.shape(ellipse(S * 0.5, S * 0.86, S * 0.34, S * 0.06), '#3b7d59', 0.45);

  const cx = S * 0.5, hy = S * 0.47, hr = S * 0.26 - pad * 0.3;

  /* 귀 */
  c.shape(ellipse(cx - hr * 0.95, hy + hr * 0.1, hr * 0.28, hr * 0.5), '#d9a96a');
  c.shape(ellipse(cx + hr * 0.95, hy + hr * 0.1, hr * 0.28, hr * 0.5), '#d9a96a');

  /* 몸 */
  c.shape(ellipse(cx, hy + hr * 1.15, hr * 0.78, hr * 0.62), '#f7e3c6');
  c.shape(ellipse(cx, hy + hr * 1.25, hr * 0.5, hr * 0.4), '#fff6e8');

  /* 머리 */
  c.shape(circle(cx, hy, hr), '#f7e3c6');
  c.shape(ellipse(cx, hy + hr * 0.26, hr * 0.6, hr * 0.46), '#fff6e8', 0.65);

  /* 볼 */
  c.shape(ellipse(cx - hr * 0.62, hy + hr * 0.26, hr * 0.2, hr * 0.13), '#f7a8a0', 0.8);
  c.shape(ellipse(cx + hr * 0.62, hy + hr * 0.26, hr * 0.2, hr * 0.13), '#f7a8a0', 0.8);

  /* 눈 */
  const ey = hy - hr * 0.08, edx = hr * 0.38;
  [-1, 1].forEach(d => {
    c.shape(ellipse(cx + d * edx, ey, hr * 0.15, hr * 0.21), '#3c2f26');
    c.shape(circle(cx + d * edx - hr * 0.055, ey - hr * 0.08, hr * 0.06), '#ffffff', 0.95);
  });

  /* 입 */
  c.shape(ring(cx, hy + hr * 0.24, hr * 0.22, hr * 0.045, hy + hr * 0.36), '#3c2f26');

  /* 반짝임 */
  c.shape(circle(S * 0.79, S * 0.22, S * 0.028), '#fff3b0', 0.95);
  c.shape(circle(S * 0.86, S * 0.31, S * 0.018), '#fff3b0', 0.8);

  return c.downsample(SS).toPNG();
}

const outDir = path.join(__dirname, '..', 'game', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const jobs = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['icon-maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, {}]
];
jobs.forEach(([name, size, opts]) => {
  const png = drawIcon(size, opts);
  fs.writeFileSync(path.join(outDir, name), png);
  console.log('wrote', name, size + 'px', png.length + 'B');
});
