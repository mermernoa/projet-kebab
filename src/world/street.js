import * as THREE from 'three';
import { mesh, boxBetween, rbox } from './util.js';
import { SHOP, DOOR } from './layout.js';
import { lightboxTex, bladeTex, chalkboardTex, vinylTex } from './paint.js';
import { woodGrain, plaster } from './pbr.js';

/*
 * Devanture : piliers en pierre, menuiseries alu noir, vitrines, porte vitrée,
 * caisson lumineux avec le logo, enseigne drapeau, chevalet sur le trottoir.
 */
export function buildStorefront({ logo, glass, stone }) {
  const g = new THREE.Group();
  g.name = 'storefront';
  const zf = SHOP.zFront;
  const alu = new THREE.MeshStandardMaterial({ color: '#111213', roughness: 0.38, metalness: 0.65 });
  const paintBlack = new THREE.MeshStandardMaterial({ color: '#0b0b0b', roughness: 0.55, ...plaster([2, 2]) });
  const steel = new THREE.MeshStandardMaterial({ color: '#d6d9dc', roughness: 0.22, metalness: 1 });
  const anim = {};

  /* --- maçonnerie --- */
  boxBetween(0.25, 0.75, 0, 4.7, zf - 0.16, zf + 0.25, stone, { parent: g, uvUnit: 1.2 });
  boxBetween(5.65, 6.2, 0, 4.7, zf - 0.16, zf + 0.25, stone, { parent: g, uvUnit: 1.2 });
  boxBetween(0.25, 6.2, 4.28, 4.7, zf - 0.12, zf + 0.25, stone, { parent: g, uvUnit: 1.2 });
  // seuil en pierre
  boxBetween(DOOR.x0 - 0.08, DOOR.x1 + 0.08, 0, 0.035, zf - 0.22, zf + 0.2, stone, { parent: g, uvUnit: 1.2 });

  /* --- bandeau et caisson lumineux --- */
  boxBetween(0.75, 5.65, 3.34, 4.28, zf - 0.04, zf + 0.2, paintBlack, { parent: g });
  const box = new THREE.Group();
  box.position.set(3.2, 3.81, zf - 0.13);
  g.add(box);
  rbox(3.7, 0.66, 0.16, 0.02, alu, { parent: box });
  const lightMat = new THREE.MeshStandardMaterial({
    color: '#000000',
    emissive: '#ffffff',
    emissiveMap: lightboxTex(logo),
    emissiveIntensity: 0.85,
    roughness: 0.3,
  });
  mesh(new THREE.PlaneGeometry(3.6, 0.6), lightMat, { parent: box, p: [0, 0, -0.081], r: [0, Math.PI, 0], cast: false });

  // petits spots sous le bandeau
  for (const x of [1.3, 2.4, 4.0, 5.1]) {
    mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 16), alu, { parent: g, p: [x, 3.32, zf - 0.02] });
  }

  /* --- menuiseries --- */
  const rail = (x0, x1, y0, y1) => boxBetween(x0, x1, y0, y1, zf - 0.03, zf + 0.06, alu, { parent: g });
  // soubassements
  boxBetween(0.75, DOOR.x0 - 0.1, 0, 0.5, zf - 0.02, zf + 0.12, paintBlack, { parent: g });
  boxBetween(DOOR.x1 + 0.1, 5.65, 0, 0.5, zf - 0.02, zf + 0.12, paintBlack, { parent: g });
  rail(0.75, DOOR.x0 - 0.1, 0.5, 0.56);
  rail(DOOR.x1 + 0.1, 5.65, 0.5, 0.56);
  rail(0.75, 5.65, 3.0, 3.07);
  rail(0.75, 5.65, 3.29, 3.35);
  for (const [x0, x1] of [
    [0.75, 0.82],
    [DOOR.x0 - 0.1, DOOR.x0],
    [DOOR.x1, DOOR.x1 + 0.1],
    [5.58, 5.65],
  ])
    rail(x0, x1, 0, 3.3);

  // vitrages
  const pane = (x0, x1, y0, y1) => {
    const m = mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), glass, {
      parent: g,
      p: [(x0 + x1) / 2, (y0 + y1) / 2, zf + 0.015],
      cast: false,
      receive: false,
    });
    m.renderOrder = 2;
    return m;
  };
  pane(0.82, DOOR.x0 - 0.1, 0.56, 3.0);
  pane(DOOR.x1 + 0.1, 5.58, 0.56, 3.0);
  pane(0.82, 5.58, 3.07, 3.29);

  // vitrophanie
  const vinyl = (texture, w, h, x, y) =>
    mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: 0.6, depthWrite: false }),
      { parent: g, p: [x, y, zf + 0.005], r: [0, Math.PI, 0], cast: false },
    );
  vinyl(vinylTex([['Sur place  ·  À emporter  ·  Livraison']], { size: 54 }), 1.5, 0.38, 1.63, 0.78);
  vinyl(vinylTex([['Kebab · Bowls · Wraps', '600 70px "Poppins"']], { size: 70 }), 1.7, 0.42, 4.65, 0.8);

  /* --- porte --- */
  const door = new THREE.Group();
  door.position.set(DOOR.x0, 0, zf + 0.02);
  g.add(door);
  const leaf = new THREE.Group();
  door.add(leaf);
  const W = DOOR.x1 - DOOR.x0 - 0.02;
  boxBetween(0.01, W, 0.02, 0.14, -0.025, 0.025, alu, { parent: leaf });
  boxBetween(0.01, W, 2.86, 2.98, -0.025, 0.025, alu, { parent: leaf });
  boxBetween(0.01, 0.08, 0.02, 2.98, -0.025, 0.025, alu, { parent: leaf });
  boxBetween(W - 0.07, W, 0.02, 2.98, -0.025, 0.025, alu, { parent: leaf });
  const dg = mesh(new THREE.PlaneGeometry(W - 0.15, 2.72), glass, { parent: leaf, p: [W / 2, 1.5, 0], cast: false, receive: false });
  dg.renderOrder = 2;
  // barre de tirage inox
  mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.2, 16), steel, { parent: leaf, p: [W - 0.17, 1.2, -0.08] });
  for (const y of [0.7, 1.7])
    mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.07, 10), steel, { parent: leaf, p: [W - 0.17, y, -0.045], r: [Math.PI / 2, 0, 0] });
  door.userData.dynamic = true;
  anim.door = door;

  /* --- enseigne drapeau --- */
  const blade = new THREE.Group();
  blade.position.set(5.95, 3.55, zf - 0.75);
  g.add(blade);
  boxBetween(-0.025, 0.025, 0.47, 0.51, -0.05, 0.74, alu, { parent: blade });
  const disc = new THREE.CylinderGeometry(0.42, 0.42, 0.11, 48);
  const bladeMat = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#fff', emissiveMap: bladeTex(logo), emissiveIntensity: 0.8 });
  mesh(disc, [alu, bladeMat, bladeMat], { parent: blade, r: [0, 0, Math.PI / 2] });

  /* --- chevalet --- */
  const aframe = new THREE.Group();
  aframe.position.set(4.6, 0, zf - 1.15);
  aframe.rotation.y = 0.45;
  g.add(aframe);
  const wood = new THREE.MeshStandardMaterial({ ...woodGrain([1, 1], '#6e4a2c') });
  const board = new THREE.MeshStandardMaterial({ map: chalkboardTex(), roughness: 0.92 });
  for (const s of [-1, 1]) {
    const leafA = new THREE.Group();
    leafA.position.y = 1.08;
    leafA.rotation.x = -s * 0.19;
    aframe.add(leafA);
    rbox(0.66, 1.1, 0.035, 0.01, wood, { parent: leafA, p: [0, -0.55, s * 0.02] });
    mesh(new THREE.PlaneGeometry(0.56, 0.82), board, {
      parent: leafA,
      p: [0, -0.5, s * 0.039],
      r: [0, s > 0 ? 0 : Math.PI, 0],
      cast: false,
    });
  }

  return { group: g, anim };
}
