import * as THREE from 'three';
import { P } from './palette.js';
import { rng } from './util.js';

let maxAniso = 4;
export const setMaxAnisotropy = (v) => {
  maxAniso = v;
};

export function canvasTex(w, h, draw, { repeat, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

/* ------------------------------------------------------------------
   Primitives de dessin
   ------------------------------------------------------------------ */

/** Tache organique fermée (les « blobs » de la façade et des murs). */
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
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % points]);
    ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function noiseFill(ctx, w, h, rand, base, spread, alphaSpecks = 0) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < w * h; i++) {
    const n = (rand() - 0.5) * spread;
    d[i * 4] = Math.max(0, Math.min(255, d[i * 4] + n));
    d[i * 4 + 1] = Math.max(0, Math.min(255, d[i * 4 + 1] + n));
    d[i * 4 + 2] = Math.max(0, Math.min(255, d[i * 4 + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
  if (alphaSpecks) {
    for (let i = 0; i < alphaSpecks; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.05 + rand() * 0.12})`;
      ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
    }
  }
}

function chalkDust(ctx, w, h, rand, n = 2600) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.02 + rand() * 0.07})`;
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2.5, 1 + rand() * 2.5);
  }
  for (let i = 0; i < 14; i++) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, 'rgba(255,255,255,0.05)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.translate(rand() * w, rand() * h);
    ctx.scale(60 + rand() * 120, 20 + rand() * 40);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function crown(ctx, x, y, s, color, lw = 4) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw / s;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-30, 14);
  ctx.lineTo(-34, -14);
  ctx.lineTo(-16, 0);
  ctx.lineTo(0, -22);
  ctx.lineTo(16, 0);
  ctx.lineTo(34, -14);
  ctx.lineTo(30, 14);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function swoosh(ctx, x0, y, x1, color, lw = 5) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y + 6);
  ctx.quadraticCurveTo((x0 + x1) / 2, y - 8, x1, y + 2);
  ctx.stroke();
  ctx.restore();
}

function sparks(ctx, x, y, r, color, lw = 5) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  for (const a of [-1.9, -1.35, -0.8]) {
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(a) * r * 1.9, y + Math.sin(a) * r * 1.9);
    ctx.stroke();
  }
  ctx.restore();
}

function centerText(ctx, text, x, y, font, color, maxW) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y, maxW);
}

/* ------------------------------------------------------------------
   Matières
   ------------------------------------------------------------------ */

/** Grain « papier découpé » multiplié à la couleur des objets du logo. */
export function speckleTex(seed = 3, repeat = [2, 2]) {
  return canvasTex(
    256,
    256,
    (ctx, w, h) => {
      const r = rng(seed);
      const img = ctx.createImageData(w, h);
      for (let i = 0; i < w * h; i++) {
        let v = 232 + r() * 23;
        if (r() < 0.03) v -= 35 + r() * 35;
        img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
        img.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    },
    { repeat },
  );
}

export function meatTex(base = '#8a4a26', light = 'rgba(214,140,74,0.32)', seed = 5) {
  return canvasTex(
    512,
    512,
    (ctx, w, h) => {
      const r = rng(seed);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 3 + r() * 6) {
        const l = r();
        ctx.fillStyle = l < 0.35 ? 'rgba(55,22,8,0.34)' : l < 0.7 ? light : 'rgba(120,58,24,0.3)';
        const hh = 2 + r() * 5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= w; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.03 + y) * 2);
        ctx.lineTo(w, y + hh);
        ctx.lineTo(0, y + hh);
        ctx.closePath();
        ctx.fill();
      }
      for (let i = 0; i < 1100; i++) {
        ctx.fillStyle = `rgba(35,12,4,${0.2 + r() * 0.5})`;
        ctx.beginPath();
        ctx.ellipse(r() * w, r() * h, 1 + r() * 6, 1 + r() * 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 600; i++) {
        ctx.fillStyle = `rgba(240,175,100,${0.12 + r() * 0.3})`;
        ctx.fillRect(r() * w, r() * h, 2 + r() * 7, 1 + r() * 1.6);
      }
    },
    { repeat: [2, 1] },
  );
}

export function breadTex(seed = 7) {
  return canvasTex(
    256,
    256,
    (ctx, w, h) => {
      const r = rng(seed);
      ctx.fillStyle = '#e8b56c';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        const x = r() * w;
        const y = r() * h;
        const s = 6 + r() * 26;
        const g = ctx.createRadialGradient(x, y, 0, x, y, s);
        g.addColorStop(0, `rgba(160,92,34,${0.25 + r() * 0.35})`);
        g.addColorStop(1, 'rgba(160,92,34,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - s, y - s, s * 2, s * 2);
      }
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = `rgba(255,248,230,${0.2 + r() * 0.4})`;
        ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
      }
    },
    { repeat: [1, 1] },
  );
}

export function concreteTex(base = '#bdb7ab', seed = 11, repeat = [4, 4], joints = true) {
  return canvasTex(
    1024,
    1024,
    (ctx, w, h) => {
      const r = rng(seed);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) {
        const x = r() * w;
        const y = r() * h;
        const s = 40 + r() * 180;
        const g = ctx.createRadialGradient(x, y, 0, x, y, s);
        const dark = r() < 0.5;
        g.addColorStop(0, dark ? 'rgba(80,72,60,0.07)' : 'rgba(255,255,250,0.08)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - s, y - s, s * 2, s * 2);
      }
      noiseFill(ctx, w, h, r, base, 14, 1400);
      if (joints) {
        ctx.strokeStyle = 'rgba(60,55,48,0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, w - 2, h - 2);
      }
    },
    { repeat },
  );
}

export function paversTex(seed = 13) {
  return canvasTex(
    512,
    512,
    (ctx, w, h) => {
      const r = rng(seed);
      ctx.fillStyle = '#8f8a83';
      ctx.fillRect(0, 0, w, h);
      const rows = 8;
      const rh = h / rows;
      for (let j = 0; j < rows; j++) {
        let x = j % 2 ? -64 : 0;
        while (x < w) {
          const pw = 96 + Math.floor(r() * 3) * 32;
          const t = 200 + r() * 26;
          ctx.fillStyle = `rgb(${t},${t - 4},${t - 10})`;
          ctx.fillRect(x + 3, j * rh + 3, pw - 6, rh - 6);
          x += pw;
        }
      }
      noiseFill(ctx, w, h, r, '', 12, 900);
    },
    { repeat: [6, 3] },
  );
}

/* ------------------------------------------------------------------
   Façade
   ------------------------------------------------------------------ */

/** Bandeau d'enseigne : taches de couleur, lettrage du logo, slogan à la main. */
export function signTex(logoImg) {
  return canvasTex(2560, 363, (ctx, w, h) => {
    const r = rng(21);
    ctx.fillStyle = '#f7f3ea';
    ctx.fillRect(0, 0, w, h);
    blob(ctx, 40, 20, 260, 170, r, P.pink);
    blob(ctx, 330, -10, 170, 95, r, P.yellow);
    blob(ctx, 70, 360, 230, 140, r, P.green);
    blob(ctx, 2560, 20, 250, 150, r, P.pink);
    blob(ctx, 2500, 370, 260, 150, r, P.green);
    blob(ctx, 2250, -20, 120, 60, r, P.yellow);
    // lettrage du logo (la broche est en 3D, posée à gauche)
    const sx = logoImg.width * 0.285;
    const sw = logoImg.width - sx;
    const dh = 300;
    const dw = (sw / logoImg.height) * dh;
    ctx.drawImage(logoImg, sx, 0, sw, logoImg.height, 1259 - dw / 2, (h - dh) / 2 + 6, dw, dh);
    // slogan
    ctx.fillStyle = '#111';
    ctx.font = '74px "Permanent Marker"';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const lines = ['CRÉE.', 'CHOISIS.', 'DÉVORE.'];
    lines.forEach((t, i) => ctx.fillText(t, 1880 + i * 26, 110 + i * 92));
    swoosh(ctx, 1930, 312, 2240, '#111', 5);
    sparks(ctx, 2250, 92, 30, '#111', 5);
  });
}

export function windowDecalTex(seed = 31, flip = false) {
  return canvasTex(1024, 512, (ctx, w, h) => {
    const r = rng(seed);
    ctx.clearRect(0, 0, w, h);
    if (flip) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    blob(ctx, 40, 520, 230, 170, r, P.pink);
    blob(ctx, 250, 540, 200, 110, r, P.yellow);
    blob(ctx, 1000, 530, 210, 150, r, P.green);
    blob(ctx, 860, 560, 170, 90, r, P.yellow);
  });
}

const STEP_NAMES = ['TON PAIN', 'TA VIANDE', 'TA GARNITURE', 'TA SAUCE', 'TON TOPPING'];

function stepIcon(ctx, i, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (i === 0) {
    ctx.ellipse(0, 0, 62, 28, 0, 0, Math.PI * 2);
    ctx.moveTo(-30, -12);
    ctx.lineTo(-18, 10);
    ctx.moveTo(-6, -14);
    ctx.lineTo(6, 10);
    ctx.moveTo(18, -12);
    ctx.lineTo(30, 10);
  } else if (i === 1) {
    ctx.moveTo(-38, -34);
    ctx.lineTo(38, -34);
    ctx.lineTo(22, 34);
    ctx.lineTo(-22, 34);
    ctx.closePath();
    ctx.moveTo(0, -50);
    ctx.lineTo(0, 50);
    ctx.moveTo(-34, -14);
    ctx.lineTo(34, -14);
    ctx.moveTo(-29, 8);
    ctx.lineTo(29, 8);
  } else if (i === 2) {
    ctx.moveTo(-50, 26);
    ctx.quadraticCurveTo(-48, -36, 0, -30);
    ctx.quadraticCurveTo(-6, 22, -50, 26);
    ctx.moveTo(-48, 24);
    ctx.lineTo(-14, -16);
    ctx.moveTo(52, 0);
    ctx.arc(26, 0, 26, 0, Math.PI * 2);
    ctx.moveTo(26, -26);
    ctx.lineTo(26, 26);
    ctx.moveTo(0, 0);
    ctx.lineTo(52, 0);
  } else if (i === 3) {
    ctx.moveTo(-46, -4);
    ctx.quadraticCurveTo(-44, 36, 0, 36);
    ctx.quadraticCurveTo(44, 36, 46, -4);
    ctx.closePath();
    ctx.moveTo(-26, -14);
    ctx.quadraticCurveTo(-30, -36, -14, -40);
    ctx.moveTo(4, -16);
    ctx.quadraticCurveTo(6, -34, 18, -44);
  } else {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const r0 = k % 2 ? 12 : 16;
      const r1 = k % 2 ? 30 : 46;
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
    }
  }
  ctx.stroke();
  ctx.restore();
}

/** Panneau noir à la craie, à gauche de la vitrine : les 5 étapes. */
export function chalkboardTex() {
  return canvasTex(512, 1184, (ctx, w, h) => {
    const r = rng(41);
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, w, h);
    chalkDust(ctx, w, h, r);
    const chalk = 'rgba(255,255,255,0.9)';
    STEP_NAMES.forEach((name, i) => {
      const y0 = 70 + i * 172;
      ctx.strokeStyle = chalk;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(80, y0 + 44, 28, 0, Math.PI * 2);
      ctx.stroke();
      centerText(ctx, String(i + 1), 80, y0 + 47, '34px "Permanent Marker"', chalk);
      stepIcon(ctx, i, 300, y0 + 38, chalk);
      centerText(ctx, name, 300, y0 + 118, '34px "Permanent Marker"', chalk, 340);
    });
    crown(ctx, 400, 960, 0.9, chalk, 3.5);
    ctx.textAlign = 'left';
    ctx.font = '50px "Permanent Marker"';
    ctx.fillStyle = chalk;
    ctx.fillText('TON KEBAB.', 50, 1020);
    ctx.fillText('TA CRÉATION !', 50, 1086);
    swoosh(ctx, 60, 1118, 420, chalk, 4);
  });
}

/** Chevalet sur le trottoir. */
export function aframeTex() {
  return canvasTex(512, 740, (ctx, w, h) => {
    const r = rng(45);
    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, w, h);
    blob(ctx, 500, 30, 150, 110, r, P.yellow);
    blob(ctx, 10, 330, 90, 120, r, P.pink);
    blob(ctx, 470, 720, 170, 110, r, P.green);
    chalkDust(ctx, w, h, r, 1500);
    const chalk = 'rgba(255,255,255,0.93)';
    centerText(ctx, 'ICI,', w / 2, 230, '76px "Permanent Marker"', chalk);
    centerText(ctx, "C'EST TOI", w / 2, 330, '76px "Permanent Marker"', chalk, 440);
    centerText(ctx, 'LE CHEF !', w / 2, 430, '76px "Permanent Marker"', chalk, 440);
    crown(ctx, w / 2, 560, 1.3, chalk, 5);
  });
}

/* ------------------------------------------------------------------
   Intérieur
   ------------------------------------------------------------------ */

function illustration(ctx, i, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  const ink = '#111';
  ctx.lineWidth = 5;
  ctx.strokeStyle = ink;
  if (i === 0) {
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = ['#e7b267', '#f1c27d', '#dca35a'][k];
      blob(ctx, (k - 1) * 40, 60 - k * 52, 120, 42, r, ctx.fillStyle, 10, 0.08);
      ctx.stroke();
      ctx.fillStyle = '#fff6df';
      for (let s = 0; s < 14; s++) ctx.fillRect((k - 1) * 40 - 80 + r() * 160, 40 - k * 52 + r() * 20, 6, 3);
    }
  } else if (i === 1) {
    ctx.fillStyle = '#9b5428';
    ctx.beginPath();
    ctx.moveTo(-100, -120);
    ctx.quadraticCurveTo(0, -150, 100, -120);
    ctx.lineTo(60, 120);
    ctx.quadraticCurveTo(0, 135, -60, 120);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(60,20,5,0.6)';
    for (let k = -90; k < 110; k += 26) {
      ctx.beginPath();
      ctx.moveTo(-100 + (k + 120) * 0.17, k);
      ctx.lineTo(100 - (k + 120) * 0.17, k + 6);
      ctx.stroke();
    }
    ctx.strokeStyle = ink;
    ctx.beginPath();
    ctx.moveTo(0, -175);
    ctx.lineTo(0, 165);
    ctx.stroke();
  } else if (i === 2) {
    const items = [
      [-70, -70, P.red, '#ffd0c4'],
      [70, -60, P.green, '#cfeec0'],
      [-60, 70, P.purple, '#eadcff'],
      [70, 75, '#7fbf4f', '#7fbf4f'],
    ];
    items.forEach(([cx, cy, c, inner], k) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(cx, cy, 62, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (k < 3) {
        ctx.fillStyle = inner;
        ctx.beginPath();
        ctx.arc(cx, cy, 40, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  } else if (i === 3) {
    const cols = ['#fffaf0', '#f39a2e', P.red];
    cols.forEach((c, k) => {
      const bx = (k - 1) * 82;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.roundRect(bx - 32, -60, 64, 170, 18);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx - 12, -60);
      ctx.lineTo(bx, -110);
      ctx.lineTo(bx + 12, -60);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  } else {
    ctx.fillStyle = '#f7d14a';
    for (let k = 0; k < 9; k++) {
      ctx.save();
      ctx.translate(-50 + k * 13, -40);
      ctx.rotate((k - 4) * 0.07);
      ctx.fillRect(-9, -100, 18, 130);
      ctx.strokeRect(-9, -100, 18, 130);
      ctx.restore();
    }
    ctx.fillStyle = P.red;
    ctx.beginPath();
    ctx.moveTo(-90, -20);
    ctx.lineTo(90, -20);
    ctx.lineTo(70, 130);
    ctx.lineTo(-70, 130);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

const SCREEN_ITEMS = [
  ['Pain turc maison', 'Galette roulée', 'Pain pita', 'Bowl sans pain'],
  ['Veau-dinde mariné', 'Poulet au paprika', 'Kefta épicée', 'Falafels'],
  ['Salade, tomates', 'Oignons rouges', 'Concombre', 'Chou, carottes'],
  ['Blanche, samouraï', 'Algérienne, harissa', 'Andalouse', 'Sauce Studio'],
  ['Cheddar fondu', 'Feta', 'Frites maison', 'Jalapeños'],
];

/** Écrans de menu au-dessus du comptoir. */
export function menuScreenTex(i, color) {
  return canvasTex(768, 432, (ctx, w, h) => {
    const r = rng(60 + i);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    blob(ctx, 690, 70, 150, 120, r, 'rgba(255,255,255,0.22)');
    blob(ctx, 600, 420, 190, 90, r, 'rgba(0,0,0,0.08)');
    const light = i === 4;
    const ink = light ? '#fff' : '#111';
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(70, 72, 36, 0, Math.PI * 2);
    ctx.fill();
    centerText(ctx, String(i + 1), 70, 76, '44px "Anton"', '#fff');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = ink;
    ctx.font = '84px "Anton"';
    ctx.fillText(STEP_NAMES[i], 40, 200, 420);
    ctx.font = '600 27px "Poppins"';
    SCREEN_ITEMS[i].forEach((t, k) => ctx.fillText(t, 44, 260 + k * 40, 380));
    illustration(ctx, i, 600, 230, r);
  });
}

/** Néon « Good Food Good Vibes ». */
export function neonTex() {
  return canvasTex(1024, 520, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '168px "Sacramento"';
    const lines = [
      ['Good Food', 180],
      ['Good Vibes', 380],
    ];
    for (const [blur, alpha] of [
      [46, 0.9],
      [22, 1],
      [8, 1],
    ]) {
      ctx.shadowColor = `rgba(255,170,60,${alpha})`;
      ctx.shadowBlur = blur;
      ctx.fillStyle = '#ffd38a';
      lines.forEach(([t, y]) => ctx.fillText(t, w / 2, y));
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff6e0';
    lines.forEach(([t, y]) => ctx.fillText(t, w / 2, y));
  });
}

export function posterTex(kind, logoImg) {
  return canvasTex(400, 560, (ctx, w, h) => {
    const r = rng(70 + kind);
    if (kind === 0) {
      ctx.fillStyle = P.pink;
      ctx.fillRect(0, 0, w, h);
      blob(ctx, 340, 90, 120, 90, r, P.green);
      blob(ctx, 40, 520, 140, 90, r, P.yellow);
      ctx.fillStyle = '#111';
      ctx.font = '104px "Lilita One"';
      ctx.textAlign = 'left';
      ctx.fillText('MIX', 40, 200);
      ctx.fillText('MATCH', 40, 300, 330);
      ctx.font = '80px "Lilita One"';
      ctx.fillText('DÉGUSTE', 40, 390, 330);
      crown(ctx, 300, 465, 1, '#111', 5);
    } else if (kind === 1) {
      ctx.fillStyle = P.yellow;
      ctx.fillRect(0, 0, w, h);
      blob(ctx, 20, 30, 140, 100, r, P.purple);
      blob(ctx, 390, 540, 160, 110, r, P.red);
      const dw = 340;
      const dh = (logoImg.height / logoImg.width) * dw;
      ctx.drawImage(logoImg, (w - dw) / 2, (h - dh) / 2, dw, dh);
    } else {
      ctx.fillStyle = P.green;
      ctx.fillRect(0, 0, w, h);
      blob(ctx, 380, 40, 140, 110, r, P.pink);
      blob(ctx, 20, 540, 150, 100, r, P.purple);
      ctx.fillStyle = '#fff';
      ctx.font = '96px "Anton"';
      ctx.textAlign = 'left';
      ctx.fillText('TON', 40, 210);
      ctx.fillText('KEBAB.', 40, 310);
      ctx.fillStyle = '#111';
      ctx.font = '56px "Permanent Marker"';
      ctx.fillText('ta création !', 40, 400, 330);
    }
  });
}

/** Murs sombres avec de grandes taches de couleur. */
export function muralTex(seed, w, h, blobs, base = P.charcoal) {
  return canvasTex(w, h, (ctx) => {
    const r = rng(seed);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    noiseFill(ctx, w, h, r, base, 8);
    for (const [x, y, rx, ry, c] of blobs) blob(ctx, x * w, y * h, rx * w, ry * h, r, c);
  });
}

export function stepDecalTex(i) {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(128, 128, 118, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(128, 128, 104, 0, Math.PI * 2);
    ctx.fill();
    centerText(ctx, String(i + 1), 128, 136, '150px "Anton"', '#fff');
  });
}

export function labelTex(name, color) {
  return canvasTex(256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, 14);
    ctx.fillRect(0, h - 14, w, 14);
    centerText(ctx, name, w / 4, h / 2 + 2, '700 26px "Poppins"', '#111', 120);
    centerText(ctx, name, (w * 3) / 4, h / 2 + 2, '700 26px "Poppins"', '#111', 120);
  });
}

export function wrapPaperTex() {
  return canvasTex(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(0, 0, w, h);
    const cols = [P.yellow, P.pink, P.green, P.red, P.purple];
    cols.forEach((c, k) => {
      ctx.fillStyle = c;
      ctx.fillRect(k * (w / 5), 150, w / 5, 46);
    });
    ctx.fillStyle = '#111';
    ctx.font = '40px "Anton"';
    ctx.textAlign = 'center';
    ctx.fillText('KEBAB STUDIO', w / 4, 110);
    ctx.fillText('KEBAB STUDIO', (w * 3) / 4, 110);
  });
}

export function trayLinerTex(logoImg) {
  return canvasTex(512, 368, (ctx, w, h) => {
    const r = rng(90);
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(0, 0, w, h);
    blob(ctx, 20, 20, 120, 80, r, P.pink);
    blob(ctx, 500, 350, 140, 90, r, P.green);
    blob(ctx, 490, 30, 70, 50, r, P.yellow);
    const dw = 230;
    const dh = (logoImg.height / logoImg.width) * dw;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(logoImg, 30, h - dh - 20, dw, dh);
    ctx.globalAlpha = 1;
  });
}

/** Petit rond « broche » pour l'enseigne drapeau. */
export function bladeSignTex(logoImg) {
  return canvasTex(512, 512, (ctx) => {
    ctx.fillStyle = '#f7f3ea';
    ctx.beginPath();
    ctx.arc(256, 256, 256, 0, Math.PI * 2);
    ctx.fill();
    const sw = logoImg.width * 0.285;
    const dh = 430;
    const dw = (sw / logoImg.height) * dh;
    ctx.drawImage(logoImg, 0, 0, sw, logoImg.height, 256 - dw / 2, 256 - dh / 2, dw, dh);
  });
}

/** Tranche d'un kebab roulé : galette, viande, crudités, sauce. */
export function crossSectionTex() {
  return canvasTex(256, 256, (ctx, w, h) => {
    const r = rng(95);
    ctx.fillStyle = '#efc98f';
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(128, 128, 112, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#8a4a26';
    ctx.fillRect(0, 0, w, h);
    const bits = [
      ['#6e3517', 70, 14],
      ['#a8642f', 50, 12],
      ['#7cc24e', 34, 13],
      ['#e5402a', 18, 14],
      ['#8e4fd0', 16, 10],
      ['#f28c28', 14, 8],
      ['#fffaf0', 22, 11],
    ];
    for (const [c, n, s] of bits) {
      for (let i = 0; i < n; i++) blob(ctx, 20 + r() * 216, 20 + r() * 216, s * (0.6 + r() * 0.7), s * (0.4 + r() * 0.5), r, c, 6, 0.3);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(150,95,40,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(128, 128, 112, 0, Math.PI * 2);
    ctx.stroke();
  });
}
