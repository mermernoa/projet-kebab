import * as THREE from 'three';
import { P } from './palette.js';
import { mat, mesh, boxBetween, rbox, rng } from './util.js';
import { signTex, chalkboardTex, aframeTex, windowDecalTex, paversTex, concreteTex, bladeSignTex } from './textures.js';
import { stool, smallTable, oliveTree } from './props.js';

/*
 * Façade côté rue. Repère : la vitrine est dans le plan z = 0, la rue vers +z,
 * l'intérieur vers −z. Ouverture de la boutique : x ∈ [−6, 6], y ∈ [0, 5.6].
 */
export const SIGN_SKEWER_POSE = {
  position: new THREE.Vector3(-1.3, 4.68, 0.42),
  rotation: new THREE.Euler(0, 0.35, 0.2),
  scale: 0.62,
};

export function buildStorefront(logoImg) {
  const g = new THREE.Group();
  g.name = 'storefront';
  const black = mat('#0d0d0d', { roughness: 0.55 });
  const stone = mat(P.stone, { map: concreteTex('#e6dfcf', 17, [3, 3], false), roughness: 0.9 });
  const anim = {};

  /* --- immeuble --- */
  const wallOpts = { cast: false };
  boxBetween(-11, -6.25, 0, 14, -0.45, 0, stone, { ...wallOpts, parent: g });
  boxBetween(6.25, 11, 0, 14, -0.45, 0, stone, { ...wallOpts, parent: g });
  boxBetween(-6.25, 6.25, 5.75, 14, -0.45, 0, stone, { ...wallOpts, parent: g });
  // corniche noire au-dessus de l'enseigne
  boxBetween(-6.6, 6.6, 5.62, 5.82, -0.1, 0.38, black, { parent: g });
  // fenêtres des étages
  const glassDark = mat('#2b3540', { roughness: 0.15, metalness: 0.3 });
  const frame = mat('#f4efe4', { roughness: 0.6 });
  for (const y of [6.7, 9.9]) {
    for (const x of [-8.6, -5.2, -1.7, 1.7, 5.2, 8.6]) {
      boxBetween(x - 0.72, x + 0.72, y, y + 2.3, -0.32, -0.05, glassDark, { parent: g, cast: false });
      boxBetween(x - 0.82, x + 0.82, y - 0.12, y, -0.05, 0.12, frame, { parent: g });
      boxBetween(x - 0.03, x + 0.03, y, y + 2.3, -0.2, -0.12, frame, { parent: g, cast: false });
      // garde-corps
      boxBetween(x - 0.78, x + 0.78, y + 0.85, y + 0.9, 0.08, 0.12, black, { parent: g });
      for (let k = 0; k <= 8; k++) {
        const bx = x - 0.75 + k * 0.1875;
        boxBetween(bx - 0.012, bx + 0.012, y, y + 0.88, 0.09, 0.11, black, { parent: g });
      }
    }
  }

  /* --- devanture noire --- */
  boxBetween(-6.25, -6.0, 0, 5.62, -0.2, 0.2, black, { parent: g });
  boxBetween(6.0, 6.25, 0, 5.62, -0.2, 0.2, black, { parent: g });
  // bandeau d'enseigne
  boxBetween(-6.0, 6.0, 3.72, 3.85, -0.2, 0.2, black, { parent: g });
  boxBetween(-6.0, 6.0, 5.5, 5.62, -0.2, 0.2, black, { parent: g });
  mesh(new THREE.PlaneGeometry(12, 1.65), mat('#ffffff', { map: signTex(logoImg), roughness: 0.75 }), {
    parent: g,
    p: [0, 4.675, 0.16],
    cast: false,
  });
  // spots au-dessus de l'enseigne
  for (let k = 0; k < 6; k++) {
    const x = -5 + k * 2;
    mesh(new THREE.BoxGeometry(0.06, 0.06, 0.5), black, { parent: g, p: [x, 5.7, 0.55] });
    mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.2, 14), black, { parent: g, p: [x, 5.62, 0.8], r: [0.5, 0, 0] });
  }

  // panneau-ardoise à gauche (les 5 étapes)
  boxBetween(-6.0, -4.42, 0, 3.72, -0.15, 0.1, black, { parent: g });
  mesh(new THREE.PlaneGeometry(1.42, 3.3), mat('#ffffff', { map: chalkboardTex(), roughness: 0.95 }), {
    parent: g,
    p: [-5.21, 1.92, 0.105],
    cast: false,
  });

  // soubassements + montants de vitrine
  boxBetween(-4.42, -1.25, 0, 0.42, -0.15, 0.08, black, { parent: g });
  boxBetween(1.25, 6.0, 0, 0.42, -0.15, 0.08, black, { parent: g });
  for (const x of [-4.42, -1.25, 1.25, 3.62]) boxBetween(x - 0.06, x + 0.06, 0, 3.72, -0.15, 0.08, black, { parent: g });
  boxBetween(-1.25, 1.25, 3.28, 3.38, -0.12, 0.06, black, { parent: g });

  // vitres + stickers de taches
  const glass = new THREE.MeshStandardMaterial({
    color: '#cfe3ea',
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  const panes = [
    [-4.36, -1.31, 0.42, 3.72, 31, false],
    [1.31, 3.56, 0.42, 3.72, 32, true],
    [3.68, 5.94, 0.42, 3.72, 33, true],
  ];
  for (const [x0, x1, y0, y1, seed, flip] of panes) {
    const w = x1 - x0;
    const h = y1 - y0;
    mesh(new THREE.PlaneGeometry(w, h), glass, { parent: g, p: [(x0 + x1) / 2, (y0 + y1) / 2, -0.04], cast: false, receive: false });
    const decal = new THREE.MeshStandardMaterial({ map: windowDecalTex(seed, flip), transparent: true, roughness: 0.7, depthWrite: false });
    mesh(new THREE.PlaneGeometry(w, w * 0.5), decal, { parent: g, p: [(x0 + x1) / 2, y0 + w * 0.25, -0.03], cast: false });
  }
  mesh(new THREE.PlaneGeometry(2.5, 0.34), glass, { parent: g, p: [0, 3.55, -0.04], cast: false, receive: false });

  // portes vitrées coulissantes
  const doors = [];
  for (const side of [-1, 1]) {
    const door = new THREE.Group();
    door.position.set(side * 0.62, 0, -0.08);
    g.add(door);
    const glassDoor = mesh(new THREE.PlaneGeometry(1.1, 3.16), glass, { parent: door, p: [0, 1.64, 0], cast: false, receive: false });
    glassDoor.renderOrder = 2;
    boxBetween(-0.58, 0.58, 0.02, 0.1, -0.03, 0.03, black, { parent: door });
    boxBetween(-0.58, 0.58, 3.18, 3.26, -0.03, 0.03, black, { parent: door });
    boxBetween(-0.58, -0.52, 0.02, 3.26, -0.03, 0.03, black, { parent: door });
    boxBetween(0.52, 0.58, 0.02, 3.26, -0.03, 0.03, black, { parent: door });
    // poignée
    boxBetween(-side * 0.42 - 0.015, -side * 0.42 + 0.015, 1.0, 1.9, 0.03, 0.08, mat('#d9dce0', { metalness: 0.8, roughness: 0.3 }), {
      parent: door,
    });
    door.userData.side = side;
    doors.push(door);
  }
  anim.doors = doors;

  // enseigne drapeau ronde
  const blade = new THREE.Group();
  blade.position.set(-6.45, 4.5, 0.75);
  g.add(blade);
  mesh(new THREE.BoxGeometry(0.06, 0.06, 0.9), black, { parent: blade, p: [0, 0.62, -0.45] });
  mesh(new THREE.TorusGeometry(0.56, 0.05, 12, 48), black, { parent: blade, r: [0, Math.PI / 2, 0] });
  const disc = new THREE.CircleGeometry(0.54, 48);
  const bladeMat = mat('#ffffff', { map: bladeSignTex(logoImg), roughness: 0.7 });
  mesh(disc, bladeMat, { parent: blade, p: [0.005, 0, 0], r: [0, Math.PI / 2, 0] });
  mesh(disc, bladeMat, { parent: blade, p: [-0.005, 0, 0], r: [0, -Math.PI / 2, 0] });

  /* --- trottoir et rue --- */
  const pavers = mat('#ffffff', { map: paversTex(), roughness: 0.9 });
  mesh(new THREE.PlaneGeometry(26, 7.2), pavers, { parent: g, p: [0, 0, 3.6], r: [-Math.PI / 2, 0, 0], cast: false });
  boxBetween(-13, 13, -0.15, 0.06, 7.2, 7.5, mat('#9b968e', { roughness: 0.9 }), { parent: g });
  mesh(new THREE.PlaneGeometry(26, 14), mat('#55524e', { map: concreteTex('#5a5753', 19, [6, 3], false), roughness: 0.95 }), {
    parent: g,
    p: [0, -0.14, 14.5],
    r: [-Math.PI / 2, 0, 0],
    cast: false,
  });

  /* --- mobilier extérieur --- */
  oliveTree(g, [-7.2, 0, 0.9], rng(5));
  oliveTree(g, [7.2, 0, 0.9], rng(6));
  smallTable(g, [-2.85, 0, 1.15]);
  stool(g, [-3.55, 0, 1.25], P.yellow, 0.2);
  stool(g, [-2.15, 0, 1.25], P.pink, -0.3);
  stool(g, [4.6, 0, 1.4], P.pink, 0.4);
  stool(g, [5.35, 0, 1.0], P.green, -0.2);

  // chevalet « Ici, c'est toi le chef ! »
  const aframe = new THREE.Group();
  aframe.position.set(3.1, 0, 1.75);
  aframe.rotation.y = -0.35;
  g.add(aframe);
  const wood = mat('#b98a55', { roughness: 0.8 });
  const board = mat('#ffffff', { map: aframeTex(), roughness: 0.95 });
  for (const s of [-1, 1]) {
    // les deux panneaux pivotent autour de la charnière du haut
    const leaf = new THREE.Group();
    leaf.position.y = 1.16;
    leaf.rotation.x = -s * 0.2;
    aframe.add(leaf);
    rbox(0.82, 1.18, 0.04, 0.015, wood, { parent: leaf, p: [0, -0.59, s * 0.025] });
    mesh(new THREE.PlaneGeometry(0.7, 1.02), board, {
      parent: leaf,
      p: [0, -0.57, s * 0.047],
      r: [0, s > 0 ? 0 : Math.PI, 0],
      cast: false,
    });
  }

  return { group: g, anim };
}
