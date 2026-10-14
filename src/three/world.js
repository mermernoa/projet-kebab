import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { P } from './palette.js';
import { clamp, lerp, smoothstep } from './util.js';
import { setMaxAnisotropy } from './textures.js';
import { createRainbowSkewer } from './kebab.js';
import { buildStorefront, SIGN_SKEWER_POSE } from './storefront.js';
import { buildInterior, STATION_Z, COUNTER_X, COUNTER_TOP } from './interior.js';
import { mergeStatic } from './merge.js';

// Pose de la broche dans le hero, face caméra
const HERO_SKEWER = { position: new THREE.Vector3(0, 2.3, 6.55), scale: 1 };

/**
 * Construit toute la scène et renvoie une fonction update() pilotée par la visite.
 */
export function createWorld(renderer, { logoImg, quality }) {
  setMaxAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

  const scene = new THREE.Scene();
  const cream = new THREE.Color(P.cream);
  scene.background = cream;
  scene.fog = new THREE.Fog(cream, 4.2, 8.4);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  pmrem.dispose();

  /* --- lumières --- */
  const hemi = new THREE.HemisphereLight('#fff7ea', '#6b6056', 1.25);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight('#fff0d8', 2.6);
  sun.position.set(8, 16, 14);
  sun.target.position.set(-1, 0, -4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 2, far: 50 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);

  const warm = [-3.4, -8, -12.4].map((z) => {
    const l = new THREE.PointLight('#ffd9ac', 0, 0, 2);
    l.position.set(0.4, 3.7, z);
    scene.add(l);
    return l;
  });
  const neonLight = new THREE.PointLight('#ffae55', 0, 8, 2);
  neonLight.position.set(2.4, 2.5, -13.2);
  const grillLight = new THREE.PointLight('#ff6a1a', 0, 3.2, 2);
  grillLight.position.set(COUNTER_X - 0.1, COUNTER_TOP + 0.5, STATION_Z[1]);
  scene.add(neonLight, grillLight);

  const spot = new THREE.SpotLight('#fff1d6', 0, 9, 0.5, 0.75, 1.6);
  spot.position.set(-2.4, 4.0, STATION_Z[0]);
  spot.target.position.set(COUNTER_X, COUNTER_TOP, STATION_Z[0]);
  scene.add(spot, spot.target);

  /* --- décor --- */
  const store = buildStorefront(logoImg);
  const inside = buildInterior(logoImg);
  store.anim.doors.forEach((d) => (d.userData.dynamic = true));
  scene.add(store.group, inside.group);
  const stats = [mergeStatic(store.group), mergeStatic(inside.group)];

  const skewer = createRainbowSkewer();
  scene.add(skewer);
  skewer.traverse((o) => {
    if (o.isMesh && o.material.type !== 'MeshBasicMaterial') o.castShadow = true;
  });

  /* --- animation --- */
  const tmpPos = new THREE.Vector3();
  const signQuat = new THREE.Quaternion().setFromEuler(SIGN_SKEWER_POSE.rotation);
  const spinQuat = new THREE.Quaternion();
  const yAxis = new THREE.Vector3(0, 1, 0);
  let spin = 0;
  let spotZ = STATION_Z[0];
  let spotPower = 0;

  /**
   * @param {object} s  état de la visite
   *   s.time, s.dt          horloge
   *   s.heroT               0 → broche dans le hero, 1 → broche sur l'enseigne
   *   s.camera              caméra courante
   *   s.station             index flottant de la station regardée (ou −1)
   *   s.reduced             mouvement réduit
   */
  function update(s) {
    const camZ = s.camera.position.z;
    const insideK = smoothstep(1.2, -2.2, camZ);

    // brouillard crème : cache la rue dans le hero, disparaît ensuite
    const heroFog = 1 - smoothstep(0.0, 0.8, s.heroT);
    scene.fog.near = lerp(60, 4.2, heroFog);
    scene.fog.far = lerp(140, 8.4, heroFog);

    // ambiance : jour dehors, lumière chaude dedans
    sun.intensity = lerp(2.6, 1.15, insideK);
    hemi.intensity = lerp(1.25, 0.55, insideK);
    warm.forEach((l) => (l.intensity = lerp(4, 26, insideK)));
    neonLight.intensity = lerp(0, 9, insideK);
    grillLight.intensity = lerp(0, 2.2, insideK);

    // portes automatiques
    const open = smoothstep(7.5, 2.6, camZ);
    store.anim.doors.forEach((d) => (d.position.x = d.userData.side * (0.62 + open * 1.12)));

    // broches de viande
    if (!s.reduced) inside.anim.spinners.forEach((m) => (m.rotation.y += s.dt * 0.55));

    // broche arc-en-ciel : du hero jusqu'à l'enseigne
    const t = clamp(s.heroT);
    const e = t * t * (3 - 2 * t);
    if (!s.reduced) spin += s.dt * lerp(0.5, 0.0, e);
    tmpPos.lerpVectors(HERO_SKEWER.position, SIGN_SKEWER_POSE.position, e);
    tmpPos.y += Math.sin(Math.PI * e) * 0.9;
    skewer.position.copy(tmpPos);
    if (!s.reduced) skewer.position.y += Math.sin(s.time * 1.3) * 0.03 * (1 - e);
    skewer.scale.setScalar(lerp(HERO_SKEWER.scale, SIGN_SKEWER_POSE.scale, e));
    spinQuat.setFromAxisAngle(yAxis, spin);
    skewer.quaternion.copy(spinQuat).slerp(signQuat, e);

    // projecteur qui suit la station regardée + écrans plus lumineux
    const active = s.station;
    const target = active >= 0 ? STATION_Z[Math.round(active)] : spotZ;
    spotZ = lerp(spotZ, target, 1 - Math.exp(-s.dt * 6));
    spotPower = lerp(spotPower, active >= 0 ? 1 : 0, 1 - Math.exp(-s.dt * 4));
    spot.position.z = spotZ;
    spot.target.position.z = spotZ;
    spot.intensity = spotPower * 38 * insideK;
    inside.anim.screens.forEach((m, i) => {
      const near = active >= 0 ? 1 - clamp(Math.abs(active - i)) : 0;
      m.emissiveIntensity = 0.7 + near * 0.4;
    });
  }

  return { scene, update, stats };
}
