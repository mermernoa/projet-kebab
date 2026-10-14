import * as THREE from 'three';
import { rng } from './util.js';

/*
 * Textures « imprimées » : caisson lumineux de l'enseigne, ardoise, néon,
 * écrans de menu, vitrophanie. Dessinées en canvas aux couleurs de la charte.
 */

export const BRAND = {
  black: '#000000',
  yellow: '#FACA2C',
  pink: '#F88DBF',
  red: '#F74A28',
  purple: '#9251E5',
  green: '#4FA36B',
  blue: '#3A71B0',
  cream: '#F5F0E6',
};

let maxAniso = 8;
export const setPaintAnisotropy = (v) => (maxAniso = v);

export function paint(w, h, draw, { srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}

export function blob(ctx, cx, cy, rx, ry, rand, color, points = 8, jitter = 0.26) {
  const pts = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2 + (rand() - 0.5) * 0.35;
    const k = 1 - jitter + rand() * jitter * 2;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  ctx.beginPath();
  const m0 = mid(pts[points - 1], pts[0]);
  ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < points; i++) {
    const m = mid(pts[i], pts[(i + 1) % points]);
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function centerText(ctx, text, x, y, font, color, maxW) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y, maxW);
}

/** Face avant du caisson lumineux : logo complet sur fond crème. */
export function lightboxTex(logo) {
  return paint(2048, 384, (ctx, w, h) => {
    ctx.fillStyle = '#f7f2e8';
    ctx.fillRect(0, 0, w, h);
    const dh = 330;
    const dw = (logo.width / logo.height) * dh;
    ctx.drawImage(logo, (w - dw) / 2, (h - dh) / 2, dw, dh);
  });
}

/** Enseigne drapeau ronde : la broche du logo. */
export function bladeTex(logo) {
  return paint(512, 512, (ctx) => {
    ctx.fillStyle = '#f7f2e8';
    ctx.beginPath();
    ctx.arc(256, 256, 256, 0, Math.PI * 2);
    ctx.fill();
    const sw = logo.width * 0.285;
    const dh = 420;
    const dw = (sw / logo.height) * dh;
    ctx.drawImage(logo, 0, 0, sw, logo.height, 256 - dw / 2, 256 - dh / 2, dw, dh);
  });
}

/** Vitrophanie blanche sur la vitre. */
export function vinylTex(lines, { size = 64, w = 1024, h = 256, align = 'center' } = {}) {
  const t = paint(w, h, (ctx) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    lines.forEach(([text, font], i) => {
      ctx.font = font || `600 ${size}px "Poppins"`;
      ctx.fillText(text, align === 'center' ? w / 2 : 20, (h / (lines.length + 1)) * (i + 1));
    });
  });
  return t;
}

/** Ardoise du chevalet. */
export function chalkboardTex() {
  return paint(512, 740, (ctx, w, h) => {
    const r = rng(45);
    ctx.fillStyle = '#1b1d1c';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.015 + r() * 0.05})`;
      ctx.fillRect(r() * w, r() * h, 1 + r() * 2.5, 1 + r() * 2.5);
    }
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      ctx.beginPath();
      ctx.ellipse(r() * w, r() * h, 60 + r() * 120, 18 + r() * 30, r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    const chalk = 'rgba(250,248,240,0.9)';
    centerText(ctx, 'ICI,', w / 2, 170, '70px "Permanent Marker"', chalk);
    centerText(ctx, "C'EST TOI", w / 2, 265, '70px "Permanent Marker"', chalk, 440);
    centerText(ctx, 'LE CHEF !', w / 2, 360, '70px "Permanent Marker"', chalk, 440);
    ctx.strokeStyle = BRAND.yellow;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(110, 420);
    ctx.quadraticCurveTo(256, 400, 400, 425);
    ctx.stroke();
    centerText(ctx, 'Pain · Viande · Crudités', w / 2, 520, '34px "Permanent Marker"', chalk, 460);
    centerText(ctx, 'Sauce · Topping', w / 2, 575, '34px "Permanent Marker"', chalk, 460);
    centerText(ctx, '→ entre !', w / 2, 660, '40px "Permanent Marker"', BRAND.pink, 460);
  });
}

/** Néon « Good Food Good Vibes » : la lueur est ajoutée par le bloom. */
export function neonTex() {
  return paint(1024, 520, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '170px "Sacramento"';
    ctx.shadowColor = 'rgba(255,190,110,0.9)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#fff1d8';
    ctx.fillText('Good Food', w / 2, 180);
    ctx.fillText('Good Vibes', w / 2, 380);
  });
}

const MENU = [
  ['LE PAIN', ['Pain turc maison', 'Galette roulée', 'Pain pita', 'Bowl sans pain']],
  ['LA VIANDE', ['Veau-dinde mariné', 'Poulet au paprika', 'Kefta épicée', 'Falafels']],
  ['LES SAUCES', ['Blanche à l’ail', 'Samouraï, algérienne', 'Harissa, andalouse', 'Sauce Studio']],
];

/** Écrans de menu : fond noir, typographie, liseré couleur (comme un vrai menu board). */
export function menuBoardTex(i) {
  const colors = [BRAND.yellow, BRAND.red, BRAND.pink];
  return paint(960, 540, (ctx, w, h) => {
    ctx.fillStyle = '#0c0c0c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = colors[i];
    ctx.fillRect(0, 0, 18, h);
    const [title, items] = MENU[i];
    ctx.fillStyle = colors[i];
    ctx.font = '96px "Anton"';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, 70, 140);
    ctx.font = '500 40px "Poppins"';
    items.forEach((t, k) => {
      ctx.fillStyle = '#f2efe8';
      ctx.fillText(t, 74, 230 + k * 72);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(74, 250 + k * 72, w - 150, 2);
    });
  });
}

/** Grande fresque peinte (côté salle) : formes du logo, peinture mate. */
export function muralTex() {
  return paint(2048, 768, (ctx, w, h) => {
    const r = rng(203);
    ctx.fillStyle = '#1e1c1f';
    ctx.fillRect(0, 0, w, h);
    const shapes = [
      [0.06, 0.95, 0.12, 0.42, BRAND.green],
      [0.22, 0.05, 0.14, 0.3, BRAND.yellow],
      [0.4, 1.0, 0.13, 0.36, BRAND.pink],
      [0.58, 0.02, 0.1, 0.26, BRAND.purple],
      [0.78, 0.98, 0.16, 0.4, BRAND.yellow],
      [0.95, 0.1, 0.1, 0.34, BRAND.red],
    ];
    for (const [x, y, rx, ry, c] of shapes) blob(ctx, x * w, y * h, rx * w, ry * h, r, c);
  });
}

/** Tranche d'un kebab roulé. */
export function crossSectionTex() {
  return paint(512, 512, (ctx) => {
    const r = rng(95);
    ctx.fillStyle = '#e9c48c';
    ctx.beginPath();
    ctx.arc(256, 256, 256, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(256, 256, 228, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#7a3d1e';
    ctx.fillRect(0, 0, 512, 512);
    const bits = [
      ['#5e2c12', 160, 22],
      ['#9c5a2a', 120, 18],
      ['#86c457', 70, 20],
      ['#d93a24', 34, 22],
      ['#a35bc2', 26, 15],
      ['#f6f1e4', 40, 16],
    ];
    for (const [c, n, s] of bits)
      for (let i = 0; i < n; i++) blob(ctx, 40 + r() * 432, 40 + r() * 432, s * (0.6 + r() * 0.7), s * (0.4 + r() * 0.5), r, c, 6, 0.3);
    ctx.restore();
  });
}
