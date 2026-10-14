import * as THREE from 'three';
import { P } from './palette.js';
import { mat, mesh, rng, organicLathe, puffyProfile, stickerOutline, scatter } from './util.js';
import { speckleTex, meatTex, breadTex, wrapPaperTex, trayLinerTex, crossSectionTex } from './textures.js';

const steel = () => mat('#d5d8dc', { metalness: 0.85, roughness: 0.28 });

/**
 * La broche arc-en-ciel du logo, en volume : couches de « papier » colorées,
 * tranches de légumes qui dépassent et contour blanc de sticker.
 */
export function createRainbowSkewer() {
  const g = new THREE.Group();
  g.name = 'rainbowSkewer';
  const rand = rng(42);
  const speckle = speckleTex(8, [3, 1]);
  const layers = [
    { c: P.yellow, R: 0.4, T: 0.22, dome: 0.07 },
    { c: '#7b3fb0', R: 0.3, T: 0.035, off: [-0.11, 0.02] },
    { c: '#e5402a', R: 0.34, T: 0.045, off: [0.06, -0.02] },
    { c: P.red, R: 0.39, T: 0.19 },
    { c: '#a7d65e', R: 0.33, T: 0.035, off: [0.1, 0.03] },
    { c: P.green, R: 0.41, T: 0.19 },
    { c: '#c2387a', R: 0.31, T: 0.03, off: [-0.09, -0.02] },
    { c: P.pink, R: 0.44, T: 0.24 },
    { c: '#6fbf5a', R: 0.3, T: 0.03, off: [-0.11, 0.03] },
    { c: P.blue, R: 0.4, T: 0.19 },
    { c: '#e5402a', R: 0.31, T: 0.04, off: [-0.07, 0] },
    { c: '#8e4fd0', R: 0.29, T: 0.035, off: [0.1, 0.02] },
    { c: P.purple, R: 0.35, T: 0.18 },
  ];
  let y = 0;
  const outlineMat = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.BackSide });
  for (const L of layers) {
    const geo = organicLathe(puffyProfile(L.R, L.T, 8, L.dome || 0), 44, rand, { amp: L.off ? 0.05 : 0.075, yAmp: 0.04 });
    const m = mesh(geo, mat(L.c, { map: speckle, roughness: 0.85 }), { parent: g });
    const off = L.off || [(rand() - 0.5) * 0.05, (rand() - 0.5) * 0.05];
    y -= L.T / 2;
    m.position.set(off[0], y, off[1]);
    m.rotation.set((rand() - 0.5) * 0.16, rand() * Math.PI, (rand() - 0.5) * 0.16);
    y -= L.T / 2 - 0.012;
    const o = stickerOutline(geo, 0.022);
    o.material = outlineMat;
    m.add(o);
  }
  const height = -y;
  // tige métallique + pointe
  mesh(new THREE.CylinderGeometry(0.02, 0.02, height + 0.62, 12), steel(), { parent: g, p: [0, -height / 2 + 0.14, 0] });
  mesh(new THREE.ConeGeometry(0.02, 0.12, 12), steel(), { parent: g, p: [0, -height - 0.23, 0], r: [Math.PI, 0, 0] });
  // recentrer
  g.children.forEach((c) => (c.position.y += height / 2));
  g.userData.height = height + 0.6;
  return g;
}

/** Cône de viande de la broche verticale. */
export function createDoner({ color = '#8a4a26', light = 'rgba(214,140,74,0.32)', seed = 3 } = {}) {
  const g = new THREE.Group();
  const rand = rng(seed);
  const pts = [
    [0.0001, 0],
    [0.1, 0],
    [0.12, 0.03],
    [0.14, 0.16],
    [0.165, 0.32],
    [0.19, 0.48],
    [0.2, 0.58],
    [0.195, 0.64],
    [0.16, 0.675],
    [0.0001, 0.68],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = organicLathe(pts, 48, rand, { amp: 0.06, ridge: 0.012 });
  const meat = mesh(geo, mat(color, { map: meatTex(color, light, seed), roughness: 0.62 }), { parent: g, p: [0, 0.06, 0] });
  meat.name = 'meat';
  mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 10), steel(), { parent: g, p: [0, 0.5, 0] });
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 32), steel(), { parent: g, p: [0, 0.045, 0] });
  mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 20), steel(), { parent: g, p: [0, 0.76, 0] });
  g.userData.spin = meat;
  return g;
}

/** Galette / pain plat. */
export function flatbread(R, T, rand, material) {
  const geo = organicLathe(puffyProfile(R, T, 6, T * 0.4), 36, rand, { amp: 0.05, yAmp: 0.05 });
  return mesh(geo, material);
}

/** Le menu final posé sur un plateau : durum, frites, boisson. */
export function createMeal(logoImg) {
  const g = new THREE.Group();
  const rand = rng(77);
  const bread = mat('#efc98f', { map: breadTex(9), roughness: 0.8 });

  // plateau + set de table
  mesh(new THREE.BoxGeometry(0.56, 0.02, 0.4), mat(P.purple, { roughness: 0.5 }), { parent: g, p: [0, 0.01, 0] });
  mesh(new THREE.PlaneGeometry(0.5, 0.35), mat('#ffffff', { map: trayLinerTex(logoImg), roughness: 0.9 }), {
    parent: g,
    p: [0, 0.0215, 0],
    r: [-Math.PI / 2, 0, 0],
    cast: false,
  });

  // durum coupé en deux : la tranche montre la garniture
  const paperMat = mat('#ffffff', { map: wrapPaperTex(), side: THREE.DoubleSide, roughness: 0.9 });
  const cutMat = mat('#ffffff', { map: crossSectionTex(), roughness: 0.55 });
  const half = (len) => {
    const h = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.068, 0.068, len, 32), bread, { parent: h });
    mesh(new THREE.SphereGeometry(0.068, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), bread, {
      parent: h,
      p: [0, -len / 2, 0],
      r: [Math.PI, 0, 0],
      s: [1, 0.45, 1],
    });
    mesh(new THREE.CircleGeometry(0.066, 40), cutMat, { parent: h, p: [0, len / 2 + 0.001, 0], r: [-Math.PI / 2, 0, 0] });
    mesh(new THREE.CylinderGeometry(0.0715, 0.0715, len * 0.62, 32, 1, true), paperMat, { parent: h, p: [0, -len * 0.19, 0] });
    return h;
  };
  const a = half(0.21);
  a.position.set(-0.05, 0.092, 0.06);
  a.rotation.set(0, 0.25, Math.PI / 2);
  g.add(a);
  const b = half(0.19);
  b.position.set(-0.07, 0.13, -0.08);
  b.rotation.set(0.25, -0.35, 1.05);
  g.add(b);

  // frites dans un cornet
  const box = new THREE.Group();
  box.position.set(0.16, 0.022, -0.06);
  g.add(box);
  const cone = new THREE.CylinderGeometry(0.075, 0.055, 0.13, 4, 1, true);
  mesh(cone, mat(P.red, { side: THREE.DoubleSide, roughness: 0.6 }), { parent: box, p: [0, 0.065, 0], r: [0, Math.PI / 4, 0] });
  box.add(
    scatter(new THREE.BoxGeometry(0.013, 0.13, 0.013), mat('#f6c94e', { roughness: 0.65 }), 34, (i, d) => {
      d.position.set((rand() - 0.5) * 0.08, 0.1 + rand() * 0.04, (rand() - 0.5) * 0.08);
      d.rotation.set((rand() - 0.5) * 0.5, rand() * 3, (rand() - 0.5) * 0.5);
    }),
  );

  // boisson
  const cup = new THREE.Group();
  cup.position.set(0.17, 0.022, 0.1);
  g.add(cup);
  mesh(new THREE.CylinderGeometry(0.048, 0.036, 0.17, 28), mat(P.pink, { roughness: 0.45 }), { parent: cup, p: [0, 0.085, 0] });
  mesh(new THREE.CylinderGeometry(0.051, 0.051, 0.014, 28), mat('#ffffff', { roughness: 0.4 }), { parent: cup, p: [0, 0.176, 0] });
  mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 8), mat('#111111'), { parent: cup, p: [0.012, 0.24, 0], r: [0, 0, 0.18] });

  return g;
}
