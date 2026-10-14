import * as THREE from 'three';
import { P, STATION_COLORS } from './palette.js';
import { mat, mesh, boxBetween, rng } from './util.js';
import { concreteTex, muralTex, menuScreenTex, neonTex, posterTex, stepDecalTex } from './textures.js';
import { STATION_BUILDERS } from './stations.js';
import { stool, smallTable, plant, pendant, banquette, bar } from './props.js';
import { createMeal } from './kebab.js';

/*
 * Intérieur : x ∈ [−6, 6], z ∈ [−14, 0], plafond à 4,2 m.
 * Comptoir à gauche (5 stations), salle à droite, néon au fond.
 */
export const COUNTER_TOP = 1.0;
export const COUNTER_X = -4.4;
export const STATION_Z = [0, 1, 2, 3, 4].map((i) => -3.4 - i * 2.3);
export const TABLES_Z = [-4.3, -6.8, -9.3, -11.8];
export const MEAL_POS = new THREE.Vector3(4.75, 0.758, -9.3);

export function buildInterior(logoImg) {
  const g = new THREE.Group();
  g.name = 'interior';
  const anim = { spinners: [], screens: [] };
  const black = mat('#0f0f10', { roughness: 0.5 });
  const noShadow = { cast: false };

  /* --- coque --- */
  mesh(new THREE.PlaneGeometry(12, 14), mat('#ffffff', { map: concreteTex('#c4beb2', 23, [3, 3.5]), roughness: 0.38, metalness: 0.05 }), {
    parent: g,
    p: [0, 0.002, -7],
    r: [-Math.PI / 2, 0, 0],
    ...noShadow,
  });
  const wallH = 4.2;
  const leftWall = muralTex(201, 2048, 614, [
    [0.12, 0.02, 0.09, 0.16, P.yellow],
    [0.42, 0.0, 0.1, 0.12, P.pink],
    [0.7, 0.05, 0.08, 0.15, P.green],
    [0.95, 0.03, 0.08, 0.16, P.purple],
  ]);
  mesh(new THREE.PlaneGeometry(14, wallH), mat('#ffffff', { map: leftWall, roughness: 0.9 }), {
    parent: g,
    p: [-6, wallH / 2, -7],
    r: [0, Math.PI / 2, 0],
    ...noShadow,
  });
  const rightWall = muralTex(202, 2048, 614, [
    [0.06, 0.1, 0.09, 0.22, P.green],
    [0.33, 0.0, 0.11, 0.14, P.yellow],
    [0.62, 0.96, 0.12, 0.2, P.purple],
    [0.9, 0.12, 0.13, 0.3, P.pink],
    [0.99, 0.9, 0.06, 0.25, P.yellow],
  ]);
  mesh(new THREE.PlaneGeometry(14, wallH), mat('#ffffff', { map: rightWall, roughness: 0.9 }), {
    parent: g,
    p: [6, wallH / 2, -7],
    r: [0, -Math.PI / 2, 0],
    ...noShadow,
  });
  const backWall = muralTex(203, 1792, 627, [
    [0.02, 0.18, 0.12, 0.3, P.green],
    [0.2, 1.0, 0.16, 0.22, P.yellow],
    [0.96, 0.95, 0.14, 0.3, P.pink],
    [0.82, 0.0, 0.1, 0.12, P.blue],
  ]);
  mesh(new THREE.PlaneGeometry(12, wallH), mat('#ffffff', { map: backWall, roughness: 0.9 }), {
    parent: g,
    p: [0, wallH / 2, -14],
    ...noShadow,
  });
  const ceiling = muralTex(
    204,
    1024,
    1194,
    [
      [0.25, 0.2, 0.2, 0.1, P.pink],
      [0.7, 0.35, 0.18, 0.09, P.green],
      [0.35, 0.62, 0.2, 0.08, P.yellow],
      [0.75, 0.85, 0.16, 0.08, P.purple],
    ],
    '#161417',
  );
  mesh(new THREE.PlaneGeometry(12, 14), mat('#ffffff', { map: ceiling, roughness: 0.95 }), {
    parent: g,
    p: [0, wallH, -7],
    r: [Math.PI / 2, 0, 0],
    ...noShadow,
  });
  // retour de façade au-dessus des vitrines
  boxBetween(-6.25, 6.25, 3.85, 5.5, -0.2, 0.12, black, { parent: g, cast: false });

  /* --- comptoir --- */
  const z0 = STATION_Z[0] + 1.18;
  const z1 = STATION_Z[4] - 1.18;
  boxBetween(-5.1, -3.72, 0, 0.94, z1, z0, black, { parent: g });
  boxBetween(-3.8, -3.62, 0, 0.08, z1, z0, mat('#050505'), { parent: g });
  boxBetween(-5.16, -3.6, 0.94, COUNTER_TOP, z1 - 0.06, z0 + 0.06, mat('#efe9df', { roughness: 0.32 }), { parent: g });
  // arrière-comptoir + crédence
  boxBetween(-6, -5.42, 0, 0.94, z1, z0, black, { parent: g });
  boxBetween(-6, -5.42, 0.94, 0.98, z1, z0, mat('#c9cdd2', { metalness: 0.75, roughness: 0.3 }), { parent: g });
  boxBetween(-6, -5.96, 0.98, 1.7, z1, z0, mat('#1b1a1c', { roughness: 0.4 }), { parent: g, cast: false });
  // rail de spots
  boxBetween(-4.5, -4.44, 4.12, 4.2, z1 + 0.3, z0 - 0.3, black, { parent: g, cast: false });

  STATION_Z.forEach((zc, i) => {
    const color = STATION_COLORS[i];
    // façade colorée de la station + pastille numérotée
    boxBetween(-3.72, -3.66, 0.1, 0.9, zc - 1.12, zc + 1.12, mat(color, { roughness: 0.55 }), { parent: g });
    mesh(new THREE.PlaneGeometry(0.44, 0.44), mat('#ffffff', { map: stepDecalTex(i), transparent: true, roughness: 0.6 }), {
      parent: g,
      p: [-3.655, 0.5, zc + 0.55],
      r: [0, Math.PI / 2, 0],
      ...noShadow,
    });
    // écran de menu
    boxBetween(-5.98, -5.88, 1.74, 2.72, zc - 0.88, zc + 0.88, black, { parent: g });
    const screenMat = new THREE.MeshStandardMaterial({
      color: '#000000',
      emissive: '#ffffff',
      emissiveMap: menuScreenTex(i, color),
      emissiveIntensity: 0.8,
      roughness: 0.25,
    });
    const screen = mesh(new THREE.PlaneGeometry(1.68, 0.945), screenMat, {
      parent: g,
      p: [-5.875, 2.23, zc],
      r: [0, Math.PI / 2, 0],
      ...noShadow,
    });
    screen.userData.dynamic = true;
    anim.screens.push(screenMat);
    // spots du rail
    for (const dz of [-0.6, 0.6]) {
      mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.2, 14), black, { parent: g, p: [-4.47, 4.0, zc + dz], r: [0, 0, 0.45], cast: false });
    }
    // la station elle-même
    const st = STATION_BUILDERS[i]();
    st.position.set(COUNTER_X, COUNTER_TOP, zc);
    st.scale.setScalar(1.22);
    g.add(st);
    if (st.userData.spinners) {
      st.userData.spinners.forEach((s) => (s.userData.dynamic = true));
      anim.spinners.push(...st.userData.spinners);
    }
  });

  /* --- salle --- */
  banquette(g, 5.62, -3.2, -13.2, '#f6c33a');
  const stoolColors = [P.pink, P.green, P.yellow, P.blue];
  TABLES_Z.forEach((z, k) => {
    smallTable(g, [4.75, 0, z]);
    if (z === MEAL_POS.z) stool(g, [3.7, 0, z + 0.75], stoolColors[k % 4], 0.5);
    else stool(g, [3.98, 0, z + (k % 2 ? 0.05 : -0.05)], stoolColors[k % 4], k * 0.4);
  });
  const bulb = new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#ffd59a', emissiveIntensity: 3 });
  TABLES_Z.forEach((z) => pendant(g, [4.75, z], 2.7, bulb));

  // grille métallique murale + plantes suspendues
  const gridMat = mat('#111111', { roughness: 0.5, metalness: 0.3 });
  for (let z = -3.2; z >= -13.21; z -= 0.4) bar(g, [5.95, 1.3, z], [5.95, 3.8, z], 0.02, gridMat);
  for (let y = 1.3; y <= 3.81; y += 0.5) bar(g, [5.95, y, -3.2], [5.95, y, -13.2], 0.02, gridMat);
  const rand = rng(404);
  [-4.0, -6.8, -9.6, -12.4].forEach((z) => plant(g, [5.75, 3.25, z], rand, { pot: '#f2efe6', h: 0.5, leaves: 9, scale: 0.55 }));
  [-5.4, -8.2, -11.0].forEach((z, k) => {
    mesh(new THREE.PlaneGeometry(0.82, 1.15), mat('#ffffff', { map: posterTex(k, logoImg), roughness: 0.85 }), {
      parent: g,
      p: [5.9, 2.3, z],
      r: [0, -Math.PI / 2, 0],
      ...noShadow,
    });
  });

  // néon du fond
  const neon = new THREE.MeshBasicMaterial({ map: neonTex(), transparent: true, toneMapped: false, depthWrite: false });
  mesh(new THREE.PlaneGeometry(2.8, 1.42), neon, { parent: g, p: [2.4, 2.7, -13.93], ...noShadow, receive: false });
  plant(g, [5.15, 0, -13.25], rng(7), { pot: P.pink, h: 1.4, leaves: 14, scale: 1.25 });
  plant(g, [-0.6, 0, -13.35], rng(8), { pot: P.yellow, h: 1.2, leaves: 12, scale: 1.1 });

  /* --- le menu final, servi sur la table --- */
  const meal = createMeal(logoImg);
  meal.position.copy(MEAL_POS);
  meal.rotation.y = 0.75;
  meal.scale.setScalar(1.25);
  g.add(meal);

  return { group: g, anim };
}
