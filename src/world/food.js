import * as THREE from 'three';
import { mesh, rng, organicLathe, puffyProfile, scatter, boxBetween } from './util.js';
import { donerMeat, breadCrust, brushedSteel } from './pbr.js';
import { paint, crossSectionTex } from './paint.js';

/*
 * Nourriture et matériel de cuisine. Les objets sont construits face aux clients :
 * la façade avant de chaque élément regarde vers −x (l'allée).
 */

let _steel;
export const steelMat = () =>
  (_steel ||= new THREE.MeshStandardMaterial({ color: '#e6e9ec', metalness: 1, roughness: 0.3, ...brushedSteel([2, 2]) }));

/** Relief de viande empilée : bosses irrégulières le long des normales (couture recollée). */
function bumpy(geo, np, segments, seed) {
  const pos = geo.attributes.position;
  const r = rng(seed + 99);
  const ph = Array.from({ length: 8 }, () => r() * 6.28);
  const n = (x, y, z) =>
    Math.sin(x * 23 + ph[0]) * Math.sin(y * 31 + ph[1]) * Math.sin(z * 27 + ph[2]) * 0.5 +
    Math.sin(x * 61 + y * 13 + ph[3]) * Math.sin(z * 57 + ph[4]) * 0.3 +
    Math.sin(y * 140 + ph[5] + Math.sin(x * 40 + z * 40) * 2) * 0.2;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const rr = Math.hypot(v.x, v.z);
    if (rr < 0.02) continue;
    const k = 1 + n(v.x, v.y, v.z) * 0.045;
    pos.setXYZ(i, v.x * k, v.y, v.z * k);
  }
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal;
  for (let j = 0; j < np; j++) {
    const a = j;
    const b = segments * np + j;
    const s = new THREE.Vector3(nrm.getX(a) + nrm.getX(b), nrm.getY(a) + nrm.getY(b), nrm.getZ(a) + nrm.getZ(b)).normalize();
    nrm.setXYZ(a, s.x, s.y, s.z);
    nrm.setXYZ(b, s.x, s.y, s.z);
  }
  return geo;
}

/* ------------------------------------------------------------------
   Broche verticale : machine inox, panneaux infrarouges, cône de viande
   ------------------------------------------------------------------ */
export function rotisserie({ base = '#8a4a26', light = '#c98a4c', seed = 3 } = {}) {
  const g = new THREE.Group();
  const steel = steelMat();
  const rand = rng(seed);
  // socle et bac de récupération
  boxBetween(-0.28, 0.3, 0, 0.07, -0.26, 0.26, steel, { parent: g });
  boxBetween(-0.3, 0.05, 0.07, 0.1, -0.22, 0.22, steel, { parent: g });
  // colonne chauffante (derrière la viande, côté mur)
  boxBetween(0.18, 0.32, 0.07, 1.08, -0.26, 0.26, steel, { parent: g });
  const burner = new THREE.MeshStandardMaterial({
    color: '#3a1205',
    emissive: '#ff5a14',
    emissiveIntensity: 4,
    roughness: 0.9,
    emissiveMap: paint(64, 256, (ctx, w, h) => {
      for (let y = 0; y < h; y += 4) {
        const v = 160 + Math.random() * 95;
        ctx.fillStyle = `rgb(${v},${v * 0.75},${v * 0.6})`;
        ctx.fillRect(0, y, w, 3);
      }
    }),
  });
  for (let k = 0; k < 3; k++) {
    mesh(new THREE.PlaneGeometry(0.13, 0.22), burner, { parent: g, p: [0.178, 0.3 + k * 0.25, 0], r: [0, -Math.PI / 2, 0], cast: false });
  }
  // broche et cône
  mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.05, 10), steel, { parent: g, p: [0, 0.6, 0] });
  const pts = [
    [0.0001, 0],
    [0.1, 0],
    [0.115, 0.03],
    [0.13, 0.16],
    [0.155, 0.32],
    [0.18, 0.48],
    [0.19, 0.58],
    [0.185, 0.64],
    [0.15, 0.675],
    [0.0001, 0.68],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const meatGeo = bumpy(organicLathe(pts, 72, rand, { amp: 0.05, ridge: 0.012 }), pts.length, 72, seed);
  const meat = mesh(meatGeo, new THREE.MeshStandardMaterial({ ...donerMeat({ base, light, seed }), roughness: 1 }), {
    parent: g,
    p: [0, 0.11, 0],
  });
  meat.userData.dynamic = true;
  mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 32), steel, { parent: g, p: [0, 0.1, 0] });
  mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.06, 20), steel, { parent: g, p: [0, 0.82, 0] });
  // capot moteur en haut
  boxBetween(-0.08, 0.32, 1.08, 1.2, -0.12, 0.12, steel, { parent: g });
  g.userData.meat = meat;
  return g;
}

/* ------------------------------------------------------------------
   Pain
   ------------------------------------------------------------------ */
let _bread, _pale;
const breadMat = () => (_bread ||= new THREE.MeshStandardMaterial({ ...breadCrust(7, '#d39a52') }));
const paleMat = () => (_pale ||= new THREE.MeshStandardMaterial({ ...breadCrust(8, '#ecd3a2'), roughness: 0.9 }));

export function flatbread(R, T, rand, material) {
  const geo = organicLathe(puffyProfile(R, T, 8, T * 0.45), 48, rand, { amp: 0.04, yAmp: 0.04 });
  return mesh(geo, material);
}

export function breadStation() {
  const g = new THREE.Group();
  const rand = rng(101);
  const seeds = new THREE.SphereGeometry(0.004, 6, 4);
  const seedMat = new THREE.MeshStandardMaterial({ color: '#f6ecd2', roughness: 0.6 });
  // pains turcs empilés en quinconce
  for (let k = 0; k < 5; k++) {
    const loaf = flatbread(0.17, 0.05, rand, breadMat());
    loaf.scale.set(1.25, 1, 1);
    loaf.position.set(-0.08 + (rand() - 0.5) * 0.03, 0.03 + k * 0.045, -0.18 + (rand() - 0.5) * 0.03);
    loaf.rotation.y = rand() * 0.4;
    g.add(loaf);
  }
  const top = flatbread(0.17, 0.05, rand, breadMat());
  top.scale.set(1.25, 1, 1);
  top.position.set(-0.1, 0.26, -0.2);
  g.add(top);
  g.add(
    scatter(seeds, seedMat, 60, (i, d) => {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * 0.16;
      d.position.set(-0.1 + Math.cos(a) * rr * 1.25, 0.29 - (rr / 0.17) ** 2 * 0.02, -0.2 + Math.sin(a) * rr);
      d.scale.set(1, 0.5, 1.8);
      d.rotation.y = rand() * 3;
    }),
  );
  // pile de galettes fines
  for (let k = 0; k < 9; k++) {
    const f = flatbread(0.15, 0.01, rand, paleMat());
    f.position.set(-0.08 + (rand() - 0.5) * 0.015, 0.012 + k * 0.011, 0.24 + (rand() - 0.5) * 0.015);
    f.rotation.y = rand() * 6;
    g.add(f);
  }
  return g;
}

/* ------------------------------------------------------------------
   Bacs gastronormes et crudités
   ------------------------------------------------------------------ */
export function gastroPan(w, d, depth = 0.1) {
  const g = new THREE.Group();
  const s = steelMat();
  const t = 0.006;
  boxBetween(-w / 2, w / 2, -depth, -depth + t, -d / 2, d / 2, s, { parent: g });
  boxBetween(-w / 2, -w / 2 + t, -depth, 0, -d / 2, d / 2, s, { parent: g });
  boxBetween(w / 2 - t, w / 2, -depth, 0, -d / 2, d / 2, s, { parent: g });
  boxBetween(-w / 2, w / 2, -depth, 0, -d / 2, -d / 2 + t, s, { parent: g });
  boxBetween(-w / 2, w / 2, -depth, 0, d / 2 - t, d / 2, s, { parent: g });
  // rebord
  boxBetween(-w / 2 - 0.008, w / 2 + 0.008, -0.004, 0.004, -d / 2 - 0.008, d / 2 + 0.008, s, { parent: g, cast: false });
  return g;
}

const sliceTex = (draw) => paint(256, 256, draw);

function slicedVeg(capTexture, sideColor, r, h) {
  const geo = new THREE.CylinderGeometry(r, r, h, 20);
  const side = new THREE.MeshPhysicalMaterial({ color: sideColor, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const cap = new THREE.MeshPhysicalMaterial({ map: capTexture, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.25 });
  return { geo, mats: [side, cap, cap] };
}

const tomatoTex = () =>
  sliceTex((ctx) => {
    ctx.fillStyle = '#c72a1a';
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8503a';
    ctx.beginPath();
    ctx.arc(128, 128, 112, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      ctx.fillStyle = '#f4a07a';
      ctx.beginPath();
      ctx.ellipse(128 + Math.cos(a) * 55, 128 + Math.sin(a) * 55, 34, 22, a, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f7e2a0';
      for (let s = 0; s < 6; s++) {
        ctx.beginPath();
        ctx.ellipse(128 + Math.cos(a) * (40 + s * 5), 128 + Math.sin(a) * (40 + s * 5) + (s % 2 ? 8 : -8), 4, 6, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#d63a26';
    ctx.beginPath();
    ctx.arc(128, 128, 22, 0, Math.PI * 2);
    ctx.fill();
  });

const cucumberTex = () =>
  sliceTex((ctx) => {
    ctx.fillStyle = '#2f5f22';
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cfe7a6';
    ctx.beginPath();
    ctx.arc(128, 128, 116, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8f3c8';
    ctx.beginPath();
    ctx.arc(128, 128, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7f9e6';
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(128 + Math.cos(a) * 40, 128 + Math.sin(a) * 40, 6, 10, a, 0, Math.PI * 2);
      ctx.fill();
    }
  });

/** Lanières de salade : plans ondulés double face. */
function lettuceGeo() {
  const geo = new THREE.PlaneGeometry(0.06, 0.016, 6, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 90) * 0.004 + Math.sin(p.getY(i) * 200) * 0.002);
  geo.computeVertexNormals();
  return geo;
}

function fill(parent, geo, material, n, { w, d, y0 = -0.03, h = 0.04, rand, tilt = Math.PI, flat = false }) {
  parent.add(
    scatter(geo, material, n, (i, o) => {
      const x = (rand() - 0.5) * w * 0.86;
      const z = (rand() - 0.5) * d * 0.86;
      const bulge = 1 - (x / (w / 2)) ** 2 * 0.5 - (z / (d / 2)) ** 2 * 0.5;
      o.position.set(x, y0 + bulge * h + rand() * 0.01, z);
      if (flat) o.rotation.set((rand() - 0.5) * 0.8, rand() * 6, (rand() - 0.5) * 0.8);
      else o.rotation.set((rand() - 0.5) * tilt, rand() * 6, (rand() - 0.5) * tilt);
    }),
  );
}

export function vegetablePans() {
  const g = new THREE.Group();
  const rand = rng(303);
  const W = 0.3;
  const D = 0.26;
  const pans = [];
  for (let k = 0; k < 6; k++) {
    const pan = gastroPan(W, D);
    pan.position.set(k % 2 === 0 ? -0.16 : 0.16, 0, -0.42 + Math.floor(k / 2) * 0.29);
    g.add(pan);
    pans.push(pan);
  }
  const tomato = slicedVeg(tomatoTex(), '#b8261a', 0.03, 0.009);
  const cucumber = slicedVeg(cucumberTex(), '#2f5f22', 0.022, 0.008);
  const lettuce = new THREE.MeshPhysicalMaterial({
    color: '#8cc860',
    roughness: 0.45,
    side: THREE.DoubleSide,
    sheen: 0.4,
    sheenColor: '#d9f2b4',
  });
  const lettuce2 = new THREE.MeshPhysicalMaterial({ color: '#5f9e3e', roughness: 0.45, side: THREE.DoubleSide });
  const onion = new THREE.MeshPhysicalMaterial({ color: '#b56ab8', roughness: 0.3, clearcoat: 0.6 });
  const cabbage = new THREE.MeshPhysicalMaterial({ color: '#6b2a72', roughness: 0.4, clearcoat: 0.3, side: THREE.DoubleSide });
  const carrot = new THREE.MeshPhysicalMaterial({ color: '#ef7d22', roughness: 0.4, clearcoat: 0.4 });
  const o = { w: W, d: D, rand };
  fill(pans[0], lettuceGeo(), lettuce, 120, { ...o, h: 0.05 });
  fill(pans[0], lettuceGeo(), lettuce2, 60, { ...o, h: 0.05 });
  fill(pans[1], tomato.geo, tomato.mats, 46, { ...o, flat: true, h: 0.035 });
  fill(pans[2], new THREE.TorusGeometry(0.022, 0.0035, 6, 20), onion, 70, { ...o, flat: true, h: 0.035 });
  fill(pans[3], cucumber.geo, cucumber.mats, 50, { ...o, flat: true, h: 0.035 });
  fill(pans[4], new THREE.BoxGeometry(0.05, 0.003, 0.008), cabbage, 220, { ...o, h: 0.04 });
  fill(pans[5], new THREE.BoxGeometry(0.045, 0.005, 0.005), carrot, 240, { ...o, h: 0.04 });
  return g;
}

/* ------------------------------------------------------------------
   Sauces : flacons souples translucides
   ------------------------------------------------------------------ */
export const SAUCES = [
  ['Blanche', '#f3eee0'],
  ['Samouraï', '#e8762c'],
  ['Algérienne', '#e3a63a'],
  ['Harissa', '#b62514'],
  ['Andalouse', '#e5592a'],
  ['Studio', '#f07fb4'],
];

export function sauceRack() {
  const g = new THREE.Group();
  const body = new THREE.CylinderGeometry(0.042, 0.04, 0.17, 32);
  const shoulder = new THREE.SphereGeometry(0.042, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const nozzle = new THREE.CylinderGeometry(0.005, 0.016, 0.07, 16);
  const capMat = new THREE.MeshStandardMaterial({ color: '#f4f2ee', roughness: 0.35 });
  const rackMat = steelMat();
  boxBetween(-0.08, 0.08, 0, 0.015, -0.66, 0.66, rackMat, { parent: g });
  SAUCES.forEach(([, color], k) => {
    const b = new THREE.Group();
    b.position.set(0, 0.015, -0.55 + k * 0.22);
    b.rotation.y = 0.5 + k;
    g.add(b);
    const m = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.28,
      clearcoat: 1,
      clearcoatRoughness: 0.15,
      sheen: 0.2,
    });
    mesh(body, m, { parent: b, p: [0, 0.085, 0] });
    mesh(shoulder, m, { parent: b, p: [0, 0.17, 0] });
    mesh(nozzle, capMat, { parent: b, p: [0, 0.245, 0] });
  });
  return g;
}

/* ------------------------------------------------------------------
   Frites sous lampe chauffante, fromages, jalapeños
   ------------------------------------------------------------------ */
export function toppingStation() {
  const g = new THREE.Group();
  const rand = rng(505);
  const friesMat = new THREE.MeshStandardMaterial({ ...breadCrust(31, '#f0c45a'), roughness: 0.6 });
  const fries = gastroPan(0.3, 0.5, 0.12);
  fries.position.set(0, 0, -0.18);
  g.add(fries);
  fill(fries, new THREE.BoxGeometry(0.011, 0.011, 0.085), friesMat, 220, { w: 0.3, d: 0.5, rand, h: 0.06, y0: -0.05 });
  const cheddar = gastroPan(0.3, 0.2, 0.08);
  cheddar.position.set(0, 0, 0.22);
  g.add(cheddar);
  fill(
    cheddar,
    new THREE.BoxGeometry(0.03, 0.004, 0.006),
    new THREE.MeshPhysicalMaterial({ color: '#f2a428', roughness: 0.4, clearcoat: 0.3 }),
    160,
    {
      w: 0.3,
      d: 0.2,
      rand,
      h: 0.03,
    },
  );
  const feta = gastroPan(0.3, 0.2, 0.08);
  feta.position.set(0, 0, 0.44);
  g.add(feta);
  fill(feta, new THREE.BoxGeometry(0.016, 0.014, 0.016), new THREE.MeshStandardMaterial({ color: '#f5f1e6', roughness: 0.75 }), 90, {
    w: 0.3,
    d: 0.2,
    rand,
    h: 0.025,
  });
  return g;
}

/* ------------------------------------------------------------------
   Le menu servi : kebab roulé coupé, frites, boisson, sur plateau
   ------------------------------------------------------------------ */
export function servedMeal(toCamera = new THREE.Vector3(1, 0.6, -1)) {
  const g = new THREE.Group();
  const rand = rng(77);
  const kraft = new THREE.MeshStandardMaterial({ color: '#b98e5c', roughness: 0.92 });
  mesh(new THREE.BoxGeometry(0.46, 0.012, 0.34), new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.4 }), {
    parent: g,
    p: [0, 0.006, 0],
  });
  mesh(new THREE.PlaneGeometry(0.42, 0.3), kraft, { parent: g, p: [0, 0.0125, 0], r: [-Math.PI / 2, 0, 0], cast: false });

  const wrap = new THREE.MeshStandardMaterial({ ...breadCrust(41, '#e7c088'), roughness: 0.85 });
  const cut = new THREE.MeshStandardMaterial({ map: crossSectionTex(), roughness: 0.55 });
  const sleeve = new THREE.MeshStandardMaterial({ color: '#efe6d4', roughness: 0.88, side: THREE.DoubleSide });
  const half = (len) => {
    const h = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.052, 0.052, len, 40), wrap, { parent: h });
    mesh(new THREE.SphereGeometry(0.052, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), wrap, {
      parent: h,
      p: [0, -len / 2, 0],
      r: [Math.PI, 0, 0],
      s: [1, 0.5, 1],
    });
    mesh(new THREE.CircleGeometry(0.05, 40), cut, { parent: h, p: [0, len / 2 + 0.001, 0], r: [-Math.PI / 2, 0, 0] });
    // papier froissé autour de la moitié basse
    const fg = new THREE.CylinderGeometry(0.055, 0.055, len * 0.42, 40, 6, true);
    const p = fg.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 1 + (rand() - 0.5) * 0.05;
      p.setXYZ(i, p.getX(i) * k, p.getY(i), p.getZ(i) * k);
    }
    fg.computeVertexNormals();
    mesh(fg, sleeve, { parent: h, p: [0, -len * 0.29, 0] });
    return h;
  };
  // les tranches regardent la caméra : une moitié couchée, l'autre posée dessus
  const up = new THREE.Vector3(0, 1, 0);
  const flat = toCamera.clone().setY(0.18).normalize();
  const tilted = toCamera
    .clone()
    .setY(0)
    .normalize()
    .add(new THREE.Vector3(0, 1.1, 0))
    .normalize();
  const side = new THREE.Vector3().crossVectors(up, flat).normalize();
  const a = half(0.17);
  a.quaternion.setFromUnitVectors(up, flat);
  a.position.copy(flat).multiplyScalar(-0.03).add(side.clone().multiplyScalar(0.045)).setY(0.066);
  g.add(a);
  const b = half(0.16);
  b.quaternion.setFromUnitVectors(up, tilted);
  b.position.copy(side).multiplyScalar(-0.06).setY(0.1);
  g.add(b);

  // frites en cornet
  const cone = new THREE.Group();
  cone.position.set(0.12, 0.013, -0.07);
  g.add(cone);
  mesh(
    new THREE.CylinderGeometry(0.06, 0.045, 0.11, 4, 1, true),
    new THREE.MeshStandardMaterial({ color: '#f74a28', roughness: 0.55, side: THREE.DoubleSide }),
    {
      parent: cone,
      p: [0, 0.055, 0],
      r: [0, Math.PI / 4, 0],
    },
  );
  const friesMat = new THREE.MeshStandardMaterial({ ...breadCrust(32, '#f0c45a'), roughness: 0.6 });
  cone.add(
    scatter(new THREE.BoxGeometry(0.011, 0.11, 0.011), friesMat, 30, (i, d) => {
      d.position.set((rand() - 0.5) * 0.06, 0.09 + rand() * 0.03, (rand() - 0.5) * 0.06);
      d.rotation.set((rand() - 0.5) * 0.45, rand() * 3, (rand() - 0.5) * 0.45);
    }),
  );
  // canette
  const can = new THREE.Group();
  can.position.set(0.14, 0.013, 0.09);
  g.add(can);
  const canMat = new THREE.MeshStandardMaterial({ color: '#f88dbf', metalness: 0.7, roughness: 0.25 });
  mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.115, 40), canMat, { parent: can, p: [0, 0.0575, 0] });
  mesh(
    new THREE.CylinderGeometry(0.028, 0.033, 0.01, 40),
    new THREE.MeshStandardMaterial({ color: '#d0d3d6', metalness: 1, roughness: 0.25 }),
    {
      parent: can,
      p: [0, 0.12, 0],
    },
  );
  return g;
}
