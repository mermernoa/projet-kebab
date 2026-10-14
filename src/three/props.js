import * as THREE from 'three';
import { mat, mesh, rbox } from './util.js';

const _up = new THREE.Vector3(0, 1, 0);

/** Barre entre deux points (pieds de tabouret, structures métalliques). */
export function bar(parent, a, b, size, material) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const len = dir.length();
  const m = mesh(new THREE.BoxGeometry(size, len, size), material, { parent });
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(_up, dir.normalize());
  return m;
}

/** Tabouret métal façon bistrot, comme ceux de la façade. */
export function stool(parent, [x, y, z], color, rotY = 0, h = 0.66) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  parent.add(g);
  const m = mat(color, { roughness: 0.42, metalness: 0.25 });
  rbox(0.36, 0.05, 0.36, 0.035, m, { parent: g, p: [0, h, 0] });
  rbox(0.33, 0.07, 0.33, 0.02, m, { parent: g, p: [0, h - 0.05, 0] });
  const t = 0.14;
  const b = 0.21;
  const corners = [
    [1, 1],
    [1, -1],
    [-1, -1],
    [-1, 1],
  ];
  for (const [sx, sz] of corners) bar(g, [sx * t, h - 0.06, sz * t], [sx * b, 0, sz * b], 0.028, m);
  const ry = 0.24;
  const rr = t + (b - t) * (1 - ry / (h - 0.06));
  for (let k = 0; k < 4; k++) {
    const [ax, az] = corners[k];
    const [bx, bz] = corners[(k + 1) % 4];
    bar(g, [ax * rr, ry, az * rr], [bx * rr, ry, bz * rr], 0.018, m);
  }
  return g;
}

export function smallTable(parent, [x, y, z], h = 0.74, top = 0.62) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  const black = mat('#141414', { roughness: 0.45, metalness: 0.2 });
  rbox(top, 0.035, top, 0.012, black, { parent: g, p: [0, h, 0] });
  mesh(new THREE.CylinderGeometry(0.03, 0.03, h, 12), black, { parent: g, p: [0, h / 2, 0] });
  mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.025, 28), black, { parent: g, p: [0, 0.0125, 0] });
  return g;
}

/** Olivier en jardinière, de chaque côté de la vitrine. */
export function oliveTree(parent, [x, y, z], rand) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  rbox(0.8, 0.78, 0.8, 0.03, mat('#151515', { roughness: 0.6 }), { parent: g, p: [0, 0.39, 0] });
  mesh(new THREE.BoxGeometry(0.7, 0.02, 0.7), mat('#3b2c20', { roughness: 1 }), { parent: g, p: [0, 0.77, 0], cast: false });
  const bark = mat('#6b5a45', { roughness: 0.95 });
  mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.3, 8), bark, { parent: g, p: [0.03, 1.4, 0], r: [0, 0, -0.08] });
  const leaves = [mat('#7f9a5a', { roughness: 0.9, flatShading: true }), mat('#6b8a4c', { roughness: 0.9, flatShading: true })];
  for (let k = 0; k < 8; k++) {
    const r = 0.32 + rand() * 0.22;
    mesh(new THREE.IcosahedronGeometry(r, 1), leaves[k % 2], {
      parent: g,
      p: [(rand() - 0.5) * 0.8, 2.15 + rand() * 0.6, (rand() - 0.5) * 0.7],
      s: [1, 0.8, 1],
    });
  }
  return g;
}

/** Plante d'intérieur : pot coloré et feuilles en amande. */
export function plant(parent, [x, y, z], rand, { pot = '#111111', h = 1.0, leaves = 12, scale = 1 } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  parent.add(g);
  mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.42, 24), mat(pot, { roughness: 0.5 }), { parent: g, p: [0, 0.21, 0] });
  const leaf = new THREE.SphereGeometry(1, 12, 8);
  const greens = [mat('#3f8a4f', { roughness: 0.65 }), mat('#5aa35c', { roughness: 0.65 }), mat('#2f6e40', { roughness: 0.65 })];
  for (let k = 0; k < leaves; k++) {
    const a = (k / leaves) * Math.PI * 2 + rand() * 0.4;
    const tilt = 0.35 + rand() * 0.7;
    const len = h * (0.35 + rand() * 0.3);
    const holder = new THREE.Group();
    holder.position.set(0, 0.4, 0);
    holder.rotation.set(0, a, 0);
    g.add(holder);
    const arm = new THREE.Group();
    arm.rotation.z = -tilt;
    holder.add(arm);
    mesh(leaf, greens[k % 3], { parent: arm, p: [0, len, 0], s: [len * 0.22, len, 0.025] });
  }
  return g;
}

/** Suspension noire au-dessus des tables. */
export function pendant(parent, [x, z], y, bulbMat) {
  const black = mat('#111111', { roughness: 0.4, metalness: 0.2, side: THREE.DoubleSide });
  mesh(new THREE.CylinderGeometry(0.006, 0.006, 4.2 - y, 6), black, { parent, p: [x, (4.2 + y) / 2, z], cast: false });
  mesh(new THREE.CylinderGeometry(0.05, 0.24, 0.26, 28, 1, true), black, { parent, p: [x, y - 0.13, z] });
  mesh(new THREE.SphereGeometry(0.065, 16, 10), bulbMat, { parent, p: [x, y - 0.22, z], cast: false });
}

/** Banquette jaune capitonnée le long du mur. */
export function banquette(parent, x, z0, z1, color) {
  const seat = mat(color, { roughness: 0.7 });
  const base = mat('#c99a1c', { roughness: 0.6 });
  const len = Math.abs(z1 - z0);
  const zc = (z0 + z1) / 2;
  mesh(new THREE.BoxGeometry(0.62, 0.32, len), base, { parent, p: [x, 0.16, zc] });
  rbox(0.66, 0.14, len, 0.05, seat, { parent, p: [x - 0.02, 0.38, zc] });
  const n = Math.round(len / 0.5);
  for (let k = 0; k < n; k++) {
    const z = Math.min(z0, z1) + (k + 0.5) * (len / n);
    rbox(0.16, 0.62, len / n - 0.03, 0.06, seat, { parent, p: [x + 0.26, 0.76, z] });
  }
}
