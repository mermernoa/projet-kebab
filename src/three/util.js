import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Générateur pseudo-aléatoire déterministe : la scène est identique à chaque visite
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const matCache = new Map();
/** Matériau standard mis en cache (les objets identiques partagent leur matériau, donc se fusionnent). */
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts, (k, v) => (v && v.isTexture ? v.uuid : v && v.isColor ? v.getHexString() : v));
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0, ...opts });
    matCache.set(key, m);
  }
  return m;
}

export function place(obj, { p, r, s } = {}) {
  if (p) obj.position.set(p[0], p[1], p[2]);
  if (r) obj.rotation.set(r[0], r[1], r[2]);
  if (s != null) typeof s === 'number' ? obj.scale.setScalar(s) : obj.scale.set(s[0], s[1], s[2]);
  return obj;
}

export function mesh(geo, material, opts = {}) {
  const m = new THREE.Mesh(geo, material);
  place(m, opts);
  m.castShadow = opts.cast ?? true;
  m.receiveShadow = opts.receive ?? true;
  if (opts.parent) opts.parent.add(m);
  return m;
}

/** Boîte définie par ses bornes (plus lisible pour l'architecture). */
export function boxBetween(x0, x1, y0, y1, z0, z1, material, opts = {}) {
  const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
  return mesh(g, material, { ...opts, p: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] });
}

export function rbox(w, h, d, r, material, opts = {}) {
  return mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), material, opts);
}

/** Bruit périodique sur un cercle (pour des contours organiques sans couture). */
export function ringNoise(
  rand,
  octaves = [
    [2, 1],
    [3, 0.6],
    [5, 0.35],
    [7, 0.18],
  ],
) {
  const terms = octaves.map(([k, a]) => [k, a * (0.6 + rand() * 0.8), rand() * Math.PI * 2]);
  const norm = terms.reduce((s, t) => s + t[1], 0);
  return (theta) => terms.reduce((s, [k, a, ph]) => s + a * Math.sin(k * theta + ph), 0) / norm;
}

/**
 * LatheGeometry déformée par un bruit angulaire : donne aux galettes, broches et
 * tranches un contour « papier découpé » comme sur le logo.
 */
export function organicLathe(points, segments, rand, { amp = 0.06, yAmp = 0, ridge = 0 } = {}) {
  const g = new THREE.LatheGeometry(points, segments);
  const n = ringNoise(rand);
  const n2 = ringNoise(rand);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-4) continue;
    const th = Math.atan2(z, x);
    let k = 1 + amp * n(th);
    if (ridge) k += ridge * Math.sin(y * 70 + th * 2) * 0.5;
    pos.setXYZ(i, x * k, y + yAmp * n2(th) * r, z * k);
  }
  g.computeVertexNormals();
  // recoller les normales de la couture du tour
  const nrm = g.attributes.normal;
  const np = points.length;
  for (let j = 0; j < np; j++) {
    const a = j;
    const b = segments * np + j;
    const v = new THREE.Vector3(nrm.getX(a) + nrm.getX(b), nrm.getY(a) + nrm.getY(b), nrm.getZ(a) + nrm.getZ(b)).normalize();
    nrm.setXYZ(a, v.x, v.y, v.z);
    nrm.setXYZ(b, v.x, v.y, v.z);
  }
  return g;
}

/** Profil de galette bombée (bords arrondis) pour LatheGeometry. */
export function puffyProfile(R, T, steps = 9, dome = 0) {
  const e = Math.min(T / 2, R * 0.8);
  const pts = [new THREE.Vector2(0.0001, -T / 2)];
  pts.push(new THREE.Vector2(R - e, -T / 2));
  for (let i = 1; i < steps; i++) {
    const a = -Math.PI / 2 + (i / steps) * Math.PI;
    pts.push(new THREE.Vector2(R - e + Math.cos(a) * e, Math.sin(a) * e));
  }
  pts.push(new THREE.Vector2(R - e, T / 2));
  if (dome > 0) {
    for (let i = 1; i <= 4; i++) {
      const t = i / 5;
      const r = (R - e) * (1 - t);
      pts.push(new THREE.Vector2(r, T / 2 + dome * Math.sin((t * Math.PI) / 2)));
    }
  }
  pts.push(new THREE.Vector2(0.0001, T / 2 + dome));
  return pts;
}

/** Copie gonflée le long des normales, en face arrière : contour blanc façon sticker. */
export function stickerOutline(geo, width = 0.02, color = '#ffffff') {
  const g = geo.clone();
  const pos = g.attributes.position;
  const nrm = g.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, pos.getX(i) + nrm.getX(i) * width, pos.getY(i) + nrm.getY(i) * width, pos.getZ(i) + nrm.getZ(i) * width);
  }
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }));
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}

/** InstancedMesh rempli par un callback (position/rotation/échelle par instance). */
export function scatter(geo, material, count, fn, { cast = true, receive = true } = {}) {
  const im = new THREE.InstancedMesh(geo, material, count);
  const d = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    d.position.set(0, 0, 0);
    d.rotation.set(0, 0, 0);
    d.scale.set(1, 1, 1);
    fn(i, d);
    d.updateMatrix();
    im.setMatrixAt(i, d.matrix);
  }
  im.instanceMatrix.needsUpdate = true;
  im.castShadow = cast;
  im.receiveShadow = receive;
  return im;
}
