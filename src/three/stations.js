import * as THREE from 'three';
import { P } from './palette.js';
import { mat, mesh, rbox, rng, scatter } from './util.js';
import { breadTex, labelTex } from './textures.js';
import { createDoner, flatbread } from './kebab.js';

/*
 * Chaque station est construite dans un repère local posé sur le plan de travail :
 *   x local  → vers les clients (allée centrale)
 *   z local  → le long du comptoir
 *   y = 0    → dessus du comptoir
 */

const steel = () => mat('#cfd3d8', { metalness: 0.8, roughness: 0.3 });

function bowlGeo(R, H) {
  const t = 0.01;
  const pts = [
    [0.0001, 0],
    [R * 0.55, 0],
    [R * 0.86, H * 0.42],
    [R, H],
    [R - t, H + 0.002],
    [R * 0.84 - t, H * 0.46],
    [R * 0.52, t],
    [0.0001, t],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 36);
}

function mound(parent, geo, material, n, { x = 0, z = 0, rx = 0.12, rz = 0.12, y0 = 0.03, h = 0.04, rand, tilt = Math.PI }) {
  parent.add(
    scatter(geo, material, n, (i, d) => {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand());
      d.position.set(x + Math.cos(a) * rr * rx, y0 + (1 - rr * rr) * h + rand() * 0.012, z + Math.sin(a) * rr * rz);
      d.rotation.set((rand() - 0.5) * tilt, rand() * Math.PI * 2, (rand() - 0.5) * tilt);
    }),
  );
}

/* 1 · Ton pain ----------------------------------------------------- */
export function stationPain() {
  const g = new THREE.Group();
  const rand = rng(101);
  const bread = mat('#e9b871', { map: breadTex(11), roughness: 0.82 });
  const pale = mat('#f3dcae', { map: breadTex(12), roughness: 0.85 });

  // planche à pain
  rbox(0.62, 0.035, 0.7, 0.012, mat('#b9824c', { roughness: 0.75 }), { parent: g, p: [-0.12, 0.0175, -0.42] });
  // pile de galettes
  for (let k = 0; k < 8; k++) {
    const f = flatbread(0.17, 0.014, rand, pale);
    f.position.set(-0.26 + (rand() - 0.5) * 0.02, 0.043 + k * 0.016, -0.6 + (rand() - 0.5) * 0.02);
    f.rotation.y = rand() * 6;
    g.add(f);
  }
  // pains turcs dorés + sésame
  const seeds = new THREE.SphereGeometry(0.006, 6, 4);
  const seedMat = mat('#fff3d6', { roughness: 0.6 });
  [
    [0.05, -0.3, 0.3],
    [0.12, 0.2, -0.5],
  ].forEach(([x, z, ry], k) => {
    const loaf = flatbread(0.2, 0.06, rand, bread);
    loaf.scale.set(1.35, 1, 0.85);
    loaf.position.set(x, k === 0 ? 0.075 : 0.04, z);
    loaf.rotation.y = ry;
    g.add(loaf);
    const s = scatter(seeds, seedMat, 40, (i, d) => {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * 0.85;
      d.position.set(Math.cos(a) * rr * 0.2, 0.038 + (1 - rr * rr) * 0.02, Math.sin(a) * rr * 0.2);
      d.scale.set(1, 0.5, 1.8);
      d.rotation.y = rand() * 3;
    });
    s.position.copy(loaf.position);
    s.rotation.y = ry;
    s.scale.set(1.35, 1, 0.85);
    g.add(s);
  });
  // corbeille jaune de galettes roulées
  rbox(0.42, 0.12, 0.34, 0.03, mat(P.yellow, { roughness: 0.6 }), { parent: g, p: [0.05, 0.06, 0.6] });
  for (let k = 0; k < 4; k++) {
    mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 18), pale, {
      parent: g,
      p: [-0.08 + k * 0.085, 0.15 + (k % 2) * 0.01, 0.6],
      r: [Math.PI / 2, 0, 0],
    });
  }
  // plancha
  mesh(new THREE.BoxGeometry(0.5, 0.05, 0.42), mat('#1b1b1b', { metalness: 0.5, roughness: 0.4 }), { parent: g, p: [-0.42, 0.025, 0.15] });
  const pita = flatbread(0.12, 0.02, rand, bread);
  pita.position.set(-0.42, 0.06, 0.15);
  pita.scale.set(1.2, 1, 0.8);
  g.add(pita);
  return g;
}

/* 2 · Ta viande ---------------------------------------------------- */
export function stationViande() {
  const g = new THREE.Group();
  const rand = rng(202);
  const spinners = [];
  const glowMat = new THREE.MeshStandardMaterial({ color: '#2a0d04', emissive: '#ff6a1a', emissiveIntensity: 2.2 });
  [
    { z: -0.38, color: '#7e4220', light: 'rgba(214,140,74,0.32)', seed: 4 },
    { z: 0.36, color: '#c48a3f', light: 'rgba(245,200,120,0.35)', seed: 6 },
  ].forEach((d) => {
    const doner = createDoner(d);
    doner.position.set(-0.32, 0, d.z);
    g.add(doner);
    spinners.push(doner.userData.spin);
    // grill vertical derrière la broche
    mesh(new THREE.BoxGeometry(0.06, 0.86, 0.46), mat('#141414', { metalness: 0.4, roughness: 0.45 }), {
      parent: g,
      p: [-0.62, 0.47, d.z],
    });
    for (let k = 0; k < 3; k++) {
      mesh(new THREE.BoxGeometry(0.012, 0.74, 0.05), glowMat, { parent: g, p: [-0.585, 0.47, d.z - 0.13 + k * 0.13], cast: false });
    }
  });
  // bac de falafels
  mesh(new THREE.BoxGeometry(0.34, 0.035, 0.28), steel(), { parent: g, p: [0.28, 0.0175, -0.05] });
  mound(g, new THREE.IcosahedronGeometry(0.024, 1), mat('#6e5527', { roughness: 0.9 }), 26, {
    x: 0.28,
    z: -0.05,
    rx: 0.13,
    rz: 0.1,
    y0: 0.055,
    h: 0.025,
    rand,
  });
  // viande tranchée
  mesh(new THREE.BoxGeometry(0.34, 0.035, 0.28), steel(), { parent: g, p: [0.28, 0.0175, 0.42] });
  mound(g, new THREE.BoxGeometry(0.06, 0.012, 0.022), mat('#7a3e1c', { roughness: 0.6 }), 60, {
    x: 0.28,
    z: 0.42,
    rx: 0.13,
    rz: 0.1,
    y0: 0.045,
    h: 0.04,
    rand,
  });
  g.userData.spinners = spinners;
  return g;
}

/* 3 · Ta garniture ------------------------------------------------- */
export function stationGarniture() {
  const g = new THREE.Group();
  const rand = rng(303);
  // bac réfrigéré inox
  mesh(new THREE.BoxGeometry(0.78, 0.05, 1.18), steel(), { parent: g, p: [0.0, 0.025, 0] });
  const items = [
    [new THREE.BoxGeometry(0.05, 0.004, 0.036), mat('#7cc24e', { roughness: 0.7 }), 70], // salade
    [new THREE.CylinderGeometry(0.024, 0.024, 0.009, 12), mat('#e5402a', { roughness: 0.45 }), 46], // tomates
    [new THREE.TorusGeometry(0.02, 0.0042, 6, 16), mat('#8e4fd0', { roughness: 0.5 }), 50], // oignons rouges
    [new THREE.CylinderGeometry(0.021, 0.021, 0.008, 12), mat('#a6d86a', { roughness: 0.5 }), 46], // concombre
    [new THREE.BoxGeometry(0.045, 0.004, 0.008), mat('#7a2d7f', { roughness: 0.6 }), 90], // chou rouge
    [new THREE.BoxGeometry(0.045, 0.006, 0.006), mat('#f28c28', { roughness: 0.6 }), 90], // carottes
  ];
  items.forEach(([geo, m, n], k) => {
    const x = k % 2 === 0 ? -0.18 : 0.18;
    const z = -0.38 + Math.floor(k / 2) * 0.38;
    mesh(new THREE.BoxGeometry(0.34, 0.012, 0.34), mat('#a9aeb4', { metalness: 0.7, roughness: 0.35 }), { parent: g, p: [x, 0.056, z] });
    mound(g, geo, m, n, { x, z, rx: 0.14, rz: 0.14, y0: 0.07, h: 0.035, rand });
  });
  return g;
}

/* 4 · Ta sauce ----------------------------------------------------- */
export const SAUCES = [
  ['Blanche', '#fbf6ea'],
  ['Samouraï', '#f08a2c'],
  ['Algérienne', '#e9b544'],
  ['Harissa', '#c8321e'],
  ['Andalouse', '#f2683a'],
  ['Studio', P.pink],
];

export function stationSauce() {
  const g = new THREE.Group();
  rbox(0.4, 0.03, 1.36, 0.012, mat(P.pink, { roughness: 0.55 }), { parent: g, p: [-0.22, 0.015, -0.05] });
  const body = new THREE.CylinderGeometry(0.047, 0.047, 0.19, 28);
  const shoulder = new THREE.SphereGeometry(0.047, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const nozzle = new THREE.CylinderGeometry(0.006, 0.02, 0.08, 16);
  const band = new THREE.CylinderGeometry(0.0478, 0.0478, 0.08, 28, 1, true);
  const bowl = bowlGeo(0.075, 0.045);
  const bowlMat = mat('#ffffff', { roughness: 0.35 });
  SAUCES.forEach(([name, color], k) => {
    const z = -0.58 + k * 0.21;
    const b = new THREE.Group();
    b.position.set(-0.22, 0.03, z);
    b.rotation.y = -0.6;
    g.add(b);
    const m = mat(color, { roughness: 0.35 });
    mesh(body, m, { parent: b, p: [0, 0.095, 0] });
    mesh(shoulder, m, { parent: b, p: [0, 0.19, 0] });
    mesh(nozzle, mat(k === 0 ? '#e33b2a' : '#fffaf0', { roughness: 0.4 }), { parent: b, p: [0, 0.27, 0] });
    mesh(band, mat('#ffffff', { map: labelTex(name.toUpperCase(), color), roughness: 0.6 }), { parent: b, p: [0, 0.1, 0] });
    // ramequin devant
    const r = new THREE.Group();
    r.position.set(0.17, 0, z + (k % 2 ? 0.03 : -0.03));
    g.add(r);
    mesh(bowl, bowlMat, { parent: r });
    mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.004, 24), mat(color, { roughness: 0.25 }), { parent: r, p: [0, 0.036, 0] });
  });
  return g;
}

/* 5 · Ton topping -------------------------------------------------- */
export function stationTopping() {
  const g = new THREE.Group();
  const rand = rng(505);
  rbox(0.9, 0.03, 1.5, 0.012, mat('#1a1a1a', { roughness: 0.6 }), { parent: g, p: [-0.05, 0.015, 0] });
  const bowl = bowlGeo(0.15, 0.085);
  const bowls = [
    { x: -0.25, z: -0.5, c: P.purple, geo: new THREE.BoxGeometry(0.012, 0.012, 0.09), m: mat('#f6c94e', { roughness: 0.6 }), n: 70 }, // frites
    { x: 0.16, z: -0.38, c: P.yellow, geo: new THREE.BoxGeometry(0.018, 0.018, 0.018), m: mat('#f5a524', { roughness: 0.45 }), n: 70 }, // cheddar
    { x: -0.22, z: 0.02, c: P.pink, geo: new THREE.BoxGeometry(0.022, 0.018, 0.022), m: mat('#fbf8ef', { roughness: 0.8 }), n: 56 }, // feta
    { x: 0.18, z: 0.14, c: P.green, geo: new THREE.TorusGeometry(0.016, 0.006, 6, 14), m: mat('#4f9a2f', { roughness: 0.4 }), n: 50 }, // jalapeños
    { x: -0.16, z: 0.52, c: P.red, geo: new THREE.IcosahedronGeometry(0.012, 0), m: mat('#b4732e', { roughness: 0.85 }), n: 120 }, // oignons crispy
  ];
  for (const b of bowls) {
    mesh(bowl, mat(b.c, { roughness: 0.45 }), { parent: g, p: [b.x, 0.03, b.z] });
    mound(g, b.geo, b.m, b.n, { x: b.x, z: b.z, rx: 0.11, rz: 0.11, y0: 0.085, h: 0.05, rand });
  }
  return g;
}

export const STATION_BUILDERS = [stationPain, stationViande, stationGarniture, stationSauce, stationTopping];
