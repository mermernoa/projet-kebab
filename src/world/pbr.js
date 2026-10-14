import * as THREE from 'three';
import { rng } from './util.js';

/*
 * Matières PBR générées en code : couleur + relief (normal map) + brillance (roughness).
 * Chaque générateur dessine une carte de hauteur ; le relief en est dérivé.
 */

let maxAniso = 8;
export const setAnisotropy = (v) => (maxAniso = v);

function tex(canvas, { srgb = false, repeat = [1, 1] } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = maxAniso;
  return t;
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Bruit de valeur lissé, tuilable (pour taches, usure, grain). */
export function valueNoise(w, h, cell, seed) {
  const r = rng(seed);
  const gw = Math.ceil(w / cell);
  const gh = Math.ceil(h / cell);
  const grid = new Float32Array(gw * gh).map(() => r());
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const gy = y / cell;
    const y0 = Math.floor(gy) % gh;
    const y1 = (y0 + 1) % gh;
    let ty = gy - Math.floor(gy);
    ty = ty * ty * (3 - 2 * ty);
    for (let x = 0; x < w; x++) {
      const gx = x / cell;
      const x0 = Math.floor(gx) % gw;
      const x1 = (x0 + 1) % gw;
      let tx = gx - Math.floor(gx);
      tx = tx * tx * (3 - 2 * tx);
      const a = grid[y0 * gw + x0] + (grid[y0 * gw + x1] - grid[y0 * gw + x0]) * tx;
      const b = grid[y1 * gw + x0] + (grid[y1 * gw + x1] - grid[y1 * gw + x0]) * tx;
      out[y * w + x] = a + (b - a) * ty;
    }
  }
  return out;
}

export function fbm(
  w,
  h,
  seed,
  octaves = [
    [64, 0.5],
    [24, 0.3],
    [8, 0.2],
  ],
) {
  const out = new Float32Array(w * h);
  octaves.forEach(([cell, amp], i) => {
    const n = valueNoise(w, h, cell, seed + i * 17);
    for (let k = 0; k < out.length; k++) out[k] += n[k] * amp;
  });
  return out;
}

/** Carte de hauteur → normal map (convention OpenGL, tuilable). */
function normalMap(height, w, h, strength) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const ym = ((y - 1 + h) % h) * w;
    const yp = ((y + 1) % h) * w;
    for (let x = 0; x < w; x++) {
      const xm = (x - 1 + w) % w;
      const xp = (x + 1) % w;
      let nx = (height[y * w + xm] - height[y * w + xp]) * strength;
      let ny = (height[yp + x] - height[ym + x]) * strength;
      const l = Math.hypot(nx, ny, 1);
      const i = (y * w + x) * 4;
      d[i] = ((nx / l) * 0.5 + 0.5) * 255;
      d[i + 1] = ((ny / l) * 0.5 + 0.5) * 255;
      d[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function grayMap(values, w, h, map = (v) => v) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const v = Math.max(0, Math.min(255, map(values[i], i) * 255));
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function colorMap(w, h, fn) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const col = [0, 0, 0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      fn(x, y, col);
      const i = (y * w + x) * 4;
      img.data[i] = col[0];
      img.data[i + 1] = col[1];
      img.data[i + 2] = col[2];
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

const hex = (s) => {
  const n = parseInt(s.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Assemble les trois cartes en jeu de textures prêt pour un matériau. */
function set(color, normal, rough, repeat, extra = {}) {
  return {
    map: tex(color, { srgb: true, repeat }),
    normalMap: tex(normal, { repeat }),
    roughnessMap: tex(rough, { repeat }),
    ...extra,
  };
}

/* ------------------------------------------------------------------
   Carrelage damier noir et blanc (sol)
   ------------------------------------------------------------------ */
export function checkerTiles(repeat) {
  const S = 1024;
  const T = 256;
  const g = 4;
  const wear = fbm(S, S, 5);
  const r = rng(9);
  const tileShade = Array.from({ length: 16 }, () => r() * 0.08 - 0.04);
  const height = new Float32Array(S * S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const lx = x % T;
      const ly = y % T;
      const edge = Math.min(lx, ly, T - 1 - lx, T - 1 - ly);
      height[y * S + x] = edge < g ? 0 : Math.min(1, 0.6 + (edge - g) * 0.12) - wear[y * S + x] * 0.04;
    }
  const color = colorMap(S, S, (x, y, c) => {
    const lx = x % T;
    const ly = y % T;
    const edge = Math.min(lx, ly, T - 1 - lx, T - 1 - ly);
    const tx = Math.floor(x / T);
    const ty = Math.floor(y / T);
    const dark = (tx + ty) % 2 === 0;
    const w = wear[y * S + x];
    if (edge < g) {
      c[0] = c[1] = c[2] = 120;
      return;
    }
    const base = dark ? 22 : 226;
    const v = base * (1 + tileShade[ty * 4 + tx]) + (dark ? w * 18 : -w * 20);
    c[0] = v;
    c[1] = v * (dark ? 1 : 0.985);
    c[2] = v * (dark ? 1.02 : 0.95);
  });
  const rough = grayMap(height, S, S, (h, i) => (h === 0 ? 0.85 : 0.12 + wear[i] * 0.22));
  return set(color, normalMap(height, S, S, 2.2), rough, repeat);
}

/* ------------------------------------------------------------------
   Carreaux métro blancs biseautés (murs)
   ------------------------------------------------------------------ */
export function subwayTiles(repeat, tint = '#f4f1ea') {
  const W = 1024;
  const H = 1024;
  const tw = 256;
  const th = 128;
  const g = 5;
  const bevel = 14;
  const [tr, tg, tb] = hex(tint);
  const n = fbm(W, H, 13, [
    [128, 0.6],
    [32, 0.4],
  ]);
  const height = new Float32Array(W * H);
  const isGrout = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const row = Math.floor(y / th);
    const off = row % 2 ? tw / 2 : 0;
    for (let x = 0; x < W; x++) {
      const lx = (x + off) % tw;
      const ly = y % th;
      const edge = Math.min(lx, ly, tw - 1 - lx, th - 1 - ly);
      if (edge < g) {
        isGrout[y * W + x] = 1;
        height[y * W + x] = 0;
      } else {
        const b = Math.min(1, (edge - g) / bevel);
        height[y * W + x] = 0.35 + 0.65 * Math.sin((b * Math.PI) / 2) + n[y * W + x] * 0.03;
      }
    }
  }
  const color = colorMap(W, H, (x, y, c) => {
    const i = y * W + x;
    if (isGrout[i]) {
      c[0] = 170;
      c[1] = 166;
      c[2] = 158;
      return;
    }
    const v = 0.96 + n[i] * 0.06;
    c[0] = tr * v;
    c[1] = tg * v;
    c[2] = tb * v;
  });
  const rough = grayMap(height, W, H, (h, i) => (isGrout[i] ? 0.9 : 0.06 + n[i] * 0.08));
  return set(color, normalMap(height, W, H, 3.5), rough, repeat);
}

/* ------------------------------------------------------------------
   Inox brossé (comptoir, broches, bacs)
   ------------------------------------------------------------------ */
export function brushedSteel(repeat) {
  const S = 512;
  const r = rng(21);
  const height = new Float32Array(S * S);
  // stries horizontales : bruit étiré
  const line = new Float32Array(S).map(() => r());
  for (let y = 0; y < S; y++) {
    let acc = 0;
    for (let x = 0; x < S; x++) {
      acc = acc * 0.92 + (r() - 0.5) * 0.08;
      height[y * S + x] = line[y] * 0.6 + acc * 2;
    }
  }
  const smudge = fbm(S, S, 31, [
    [96, 0.7],
    [24, 0.3],
  ]);
  const color = colorMap(S, S, (x, y, c) => {
    const v = 200 + height[y * S + x] * 20 + smudge[y * S + x] * 14;
    c[0] = v;
    c[1] = v + 2;
    c[2] = v + 5;
  });
  const rough = grayMap(smudge, S, S, (v) => 0.22 + v * 0.18);
  return set(color, normalMap(height, S, S, 0.6), rough, repeat);
}

/* ------------------------------------------------------------------
   Bois (plateaux de table, planche à pain)
   ------------------------------------------------------------------ */
export function woodGrain(repeat, base = '#8a5a35') {
  const S = 1024;
  const [br, bg, bb] = hex(base);
  const n = fbm(S, S, 41, [
    [256, 0.6],
    [64, 0.25],
    [16, 0.15],
  ]);
  const height = new Float32Array(S * S);
  const color = colorMap(S, S, (x, y, c) => {
    const i = y * S + x;
    const ring = Math.sin((y / S) * Math.PI * 2 * 18 + n[i] * 9 + Math.sin(x * 0.004) * 2);
    const fine = Math.sin((y / S) * Math.PI * 2 * 140 + n[i] * 20) * 0.3;
    const g = ring * 0.5 + 0.5;
    height[i] = g * 0.7 + fine * 0.3;
    const k = 0.78 + g * 0.3 + fine * 0.06;
    c[0] = br * k;
    c[1] = bg * k;
    c[2] = bb * k;
  });
  const rough = grayMap(height, S, S, (h) => 0.42 + h * 0.18);
  return set(color, normalMap(height, S, S, 1.2), rough, repeat);
}

/* ------------------------------------------------------------------
   Cuir (banquette)
   ------------------------------------------------------------------ */
export function leather(repeat, base = '#c99a2e') {
  const S = 512;
  const [br, bg, bb] = hex(base);
  const cells = fbm(S, S, 51, [
    [6, 0.6],
    [3, 0.4],
  ]);
  const broad = fbm(S, S, 52, [[128, 1]]);
  const height = cells.map((v) => Math.pow(v, 1.6));
  const color = colorMap(S, S, (x, y, c) => {
    const i = y * S + x;
    const k = 0.86 + broad[i] * 0.2 - height[i] * 0.08;
    c[0] = br * k;
    c[1] = bg * k;
    c[2] = bb * k;
  });
  const rough = grayMap(height, S, S, (h, i) => 0.38 + h * 0.2 + broad[i] * 0.1);
  return set(color, normalMap(height, S, S, 1.6), rough, repeat);
}

/* ------------------------------------------------------------------
   Peinture murale mate / plâtre
   ------------------------------------------------------------------ */
export function plaster(repeat) {
  const S = 512;
  const n = fbm(S, S, 61, [
    [96, 0.5],
    [24, 0.3],
    [6, 0.2],
  ]);
  const rough = grayMap(n, S, S, (v) => 0.78 + v * 0.18);
  return { normalMap: tex(normalMap(n, S, S, 1.4), { repeat }), roughnessMap: tex(rough, { repeat }) };
}

/* ------------------------------------------------------------------
   Viande de broche : strates, croûte grillée, gras brillant
   ------------------------------------------------------------------ */
export function donerMeat({ base = '#8a4a26', light = '#c98a4c', seed = 3 } = {}) {
  const W = 1024;
  const H = 1024;
  const r = rng(seed);
  const [br, bg, bb] = hex(base);
  const [lr, lg, lb] = hex(light);
  const broad = fbm(W, H, seed + 70, [
    [160, 0.5],
    [48, 0.3],
    [12, 0.2],
  ]);
  // strates horizontales irrégulières
  const strata = new Float32Array(H);
  let acc = 0;
  for (let y = 0; y < H; y++) {
    if (r() < 0.06) acc = r();
    strata[y] = acc;
  }
  const height = new Float32Array(W * H);
  const color = colorMap(W, H, (x, y, c) => {
    const i = y * W + x;
    const s = strata[(y + Math.floor(broad[i] * 40)) % H];
    const char = Math.max(0, broad[i] - 0.55) * 2.6;
    const t = Math.min(1, s * 0.8 + broad[i] * 0.3);
    height[i] = s * 0.5 + broad[i] * 0.5 + Math.sin(y * 0.9 + broad[i] * 6) * 0.08;
    const dark = 1 - char * 0.75;
    c[0] = (br + (lr - br) * t) * dark;
    c[1] = (bg + (lg - bg) * t) * dark;
    c[2] = (bb + (lb - bb) * t) * dark;
  });
  const rough = grayMap(broad, W, H, (v) => 0.32 + Math.max(0, v - 0.5) * 0.9);
  return set(color, normalMap(height, W, H, 4), rough, [1, 1]);
}

/* ------------------------------------------------------------------
   Pain : croûte dorée, alvéoles, farine
   ------------------------------------------------------------------ */
export function breadCrust(seed = 7, base = '#d9a35a') {
  const S = 512;
  const [br, bg, bb] = hex(base);
  const broad = fbm(S, S, seed, [
    [96, 0.6],
    [24, 0.4],
  ]);
  const pores = fbm(S, S, seed + 5, [
    [4, 0.6],
    [2, 0.4],
  ]);
  const height = new Float32Array(S * S);
  const color = colorMap(S, S, (x, y, c) => {
    const i = y * S + x;
    height[i] = broad[i] * 0.6 - Math.max(0, pores[i] - 0.62) * 2;
    const toast = 0.72 + broad[i] * 0.45;
    const flour = pores[i] > 0.7 ? 40 : 0;
    c[0] = Math.min(255, br * toast + flour);
    c[1] = Math.min(255, bg * toast + flour);
    c[2] = Math.min(255, bb * toast * 0.95 + flour);
  });
  const rough = grayMap(height, S, S, () => 0.82);
  return set(color, normalMap(height, S, S, 2.4), rough, [1, 1]);
}

/* Utilitaire : matériau standard ou physique à partir d'un jeu de textures */
export function pbr(textures, params = {}, physical = false) {
  const M = physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  return new M({ ...textures, ...params });
}
