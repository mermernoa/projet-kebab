import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { mesh, boxBetween, rbox, rng } from './util.js';
import { SHOP, COUNTER, BACKBAR, TABLES_Z, MEAL_POS, SPOTS } from './layout.js';
import { checkerTiles, subwayTiles, woodGrain, leather, plaster } from './pbr.js';
import { muralTex, menuBoardTex, neonTex, paint, BRAND } from './paint.js';
import { rotisserie, breadStation, vegetablePans, sauceRack, toppingStation, servedMeal, steelMat, gastroPan } from './food.js';
import { fit } from './models.js';

const _up = new THREE.Vector3(0, 1, 0);
function bar(parent, a, b, size, material) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const m = mesh(new THREE.BoxGeometry(size, dir.length(), size), material, { parent });
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(_up, dir.normalize());
  return m;
}

/** Tabouret métal type bistrot, peinture époxy satinée. */
function stool(parent, [x, z], color, rotY) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  parent.add(g);
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.45, metalness: 0.2, clearcoat: 0.5, clearcoatRoughness: 0.4 });
  const h = 0.66;
  rbox(0.35, 0.025, 0.35, 0.03, m, { parent: g, p: [0, h, 0] });
  rbox(0.33, 0.06, 0.33, 0.012, m, { parent: g, p: [0, h - 0.04, 0] });
  const corners = [
    [1, 1],
    [1, -1],
    [-1, -1],
    [-1, 1],
  ];
  for (const [sx, sz] of corners) bar(g, [sx * 0.14, h - 0.05, sz * 0.14], [sx * 0.2, 0, sz * 0.2], 0.022, m);
  for (let k = 0; k < 4; k++) {
    const [ax, az] = corners[k];
    const [bx, bz] = corners[(k + 1) % 4];
    bar(g, [ax * 0.185, 0.24, az * 0.185], [bx * 0.185, 0.24, bz * 0.185], 0.014, m);
  }
}

/** Terrazzo poli : éclats aux couleurs de la marque (façade du comptoir). */
function terrazzo(repeat) {
  const t = paint(1024, 1024, (ctx, w, h) => {
    const r = rng(77);
    ctx.fillStyle = '#efe9de';
    ctx.fillRect(0, 0, w, h);
    const cols = [BRAND.yellow, BRAND.pink, BRAND.red, BRAND.purple, BRAND.green, '#1a1a1a', '#bdb6aa'];
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = cols[Math.floor(r() * cols.length)];
      const s = 3 + r() * (r() < 0.1 ? 26 : 10);
      ctx.beginPath();
      const x = r() * w;
      const y = r() * h;
      ctx.moveTo(x, y);
      for (let k = 0; k < 5; k++) ctx.lineTo(x + (r() - 0.5) * s * 2, y + (r() - 0.5) * s * 2);
      ctx.closePath();
      ctx.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  return t;
}

export function buildInterior({ glass, models, mobile }) {
  RectAreaLightUniformsLib.init();
  const g = new THREE.Group();
  g.name = 'interior';
  const anim = { meats: [], lights: [] };
  const { x0, x1, zBack, h } = SHOP;
  const L = zBack - SHOP.zFront;
  const noShadow = { cast: false };

  /* --- sol, murs, plafond --- */
  const floor = new THREE.MeshStandardMaterial({ ...checkerTiles([(x1 - x0) / 1.2, L / 1.2]), envMapIntensity: 1.1 });
  mesh(new THREE.PlaneGeometry(x1 - x0, L), floor, {
    parent: g,
    p: [(x0 + x1) / 2, 0.001, (SHOP.zFront + zBack) / 2],
    r: [-Math.PI / 2, 0, 0],
    ...noShadow,
  });

  const tiles = (w, hh) => new THREE.MeshStandardMaterial({ ...subwayTiles([w / 0.6, hh / 0.6]), envMapIntensity: 1 });
  const darkPaint = new THREE.MeshStandardMaterial({ color: '#1d1c1e', ...plaster([4, 2]) });
  // mur du comptoir : carrelage métro jusqu'à 2,4 m
  mesh(new THREE.PlaneGeometry(L, 2.4), tiles(L, 2.4), {
    parent: g,
    p: [x1, 1.2, (SHOP.zFront + zBack) / 2],
    r: [0, -Math.PI / 2, 0],
    ...noShadow,
  });
  mesh(new THREE.PlaneGeometry(L, h - 2.4), darkPaint, {
    parent: g,
    p: [x1, (h + 2.4) / 2, (SHOP.zFront + zBack) / 2],
    r: [0, -Math.PI / 2, 0],
    ...noShadow,
  });
  // mur de la salle : soubassement carrelé + fresque peinte
  mesh(new THREE.PlaneGeometry(L, 1.1), tiles(L, 1.1), {
    parent: g,
    p: [x0, 0.55, (SHOP.zFront + zBack) / 2],
    r: [0, Math.PI / 2, 0],
    ...noShadow,
  });
  const mural = new THREE.MeshStandardMaterial({ map: muralTex(), ...plaster([6, 2]) });
  mesh(new THREE.PlaneGeometry(L, h - 1.1), mural, {
    parent: g,
    p: [x0, (h + 1.1) / 2, (SHOP.zFront + zBack) / 2],
    r: [0, Math.PI / 2, 0],
    ...noShadow,
  });
  boxBetween(x0, x0 + 0.03, 1.08, 1.12, SHOP.zFront, zBack, steelMat(), { parent: g, ...noShadow });
  // fond
  mesh(new THREE.PlaneGeometry(x1 - x0, h), darkPaint, { parent: g, p: [(x0 + x1) / 2, h / 2, zBack], r: [0, Math.PI, 0], ...noShadow });
  // plafond noir
  mesh(new THREE.PlaneGeometry(x1 - x0, L), new THREE.MeshStandardMaterial({ color: '#121213', roughness: 0.9 }), {
    parent: g,
    p: [(x0 + x1) / 2, h, (SHOP.zFront + zBack) / 2],
    r: [Math.PI / 2, 0, 0],
    ...noShadow,
  });
  // gaine de ventilation apparente
  const galva = new THREE.MeshStandardMaterial({ color: '#b9bcbf', metalness: 1, roughness: 0.45 });
  mesh(new THREE.CylinderGeometry(0.17, 0.17, L - 0.6, 32), galva, {
    parent: g,
    p: [1.9, h - 0.3, (SHOP.zFront + zBack) / 2 + 0.2],
    r: [Math.PI / 2, 0, 0],
  });
  for (let z = SHOP.zIn + 0.8; z < zBack - 0.4; z += 1.6) {
    mesh(new THREE.TorusGeometry(0.175, 0.012, 8, 32), galva, { parent: g, p: [1.9, h - 0.3, z] });
    boxBetween(1.89, 1.91, h - 0.12, h, z - 0.01, z + 0.01, galva, { parent: g });
  }

  /* --- comptoir --- */
  const { xFront, xBack, z0, z1, top } = COUNTER;
  const front = new THREE.MeshPhysicalMaterial({ map: terrazzo([3, 0.4]), roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  boxBetween(xFront, xBack, 0.08, top - 0.04, z0, z1, front, { parent: g });
  boxBetween(xFront + 0.05, xBack, 0, 0.08, z0, z1, new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.5 }), { parent: g });
  boxBetween(xFront - 0.04, xBack + 0.02, top - 0.04, top, z0 - 0.03, z1 + 0.03, steelMat(), { parent: g });

  // vitre de protection au-dessus des crudités
  const guardZ0 = SPOTS.pain - 0.55;
  const guardZ1 = SPOTS.sauces + 0.45;
  const guard = mesh(new THREE.PlaneGeometry(guardZ1 - guardZ0, 0.42), glass, {
    parent: g,
    p: [xFront + 0.06, top + 0.32, (guardZ0 + guardZ1) / 2],
    r: [0, -Math.PI / 2, 0.22],
    cast: false,
    receive: false,
  });
  guard.renderOrder = 2;
  for (const z of [guardZ0, (guardZ0 + guardZ1) / 2, guardZ1]) {
    mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 12), steelMat(), { parent: g, p: [xFront + 0.1, top + 0.25, z] });
  }

  // arrière-comptoir inox contre le mur
  boxBetween(BACKBAR.x0, BACKBAR.x1, 0, BACKBAR.top - 0.03, z0 - 0.4, z1, steelMat(), { parent: g });
  boxBetween(BACKBAR.x0 - 0.02, BACKBAR.x1, BACKBAR.top - 0.03, BACKBAR.top, z0 - 0.4, z1, steelMat(), { parent: g });

  // les broches, face aux clients
  for (const [dz, opts] of [
    [-0.42, { base: '#4f2611', light: '#9a5627', seed: 4 }],
    [0.42, { base: '#7c4519', light: '#c98a45', seed: 6 }],
  ]) {
    const r = rotisserie(opts);
    r.position.set(6.06, BACKBAR.top, SPOTS.broche + dz);
    g.add(r);
    anim.meats.push(r.userData.meat);
  }
  // hotte
  boxBetween(5.55, x1, 2.3, 2.75, SPOTS.broche - 1.05, SPOTS.broche + 1.05, steelMat(), { parent: g });

  // plancha + pains
  boxBetween(
    5.8,
    6.35,
    BACKBAR.top,
    BACKBAR.top + 0.05,
    SPOTS.pain - 0.35,
    SPOTS.pain + 0.35,
    new THREE.MeshStandardMaterial({ color: '#1b1b1b', metalness: 0.6, roughness: 0.35 }),
    { parent: g },
  );
  const bread = breadStation();
  bread.position.set(4.55, top, SPOTS.pain);
  g.add(bread);

  // crudités dans un bac réfrigéré surélevé
  const well = new THREE.Group();
  well.position.set(4.53, top, SPOTS.crudites);
  g.add(well);
  boxBetween(-0.33, 0.33, 0, 0.11, -0.6, 0.6, steelMat(), { parent: well });
  const veg = vegetablePans();
  veg.position.y = 0.11;
  well.add(veg);

  const sauces = sauceRack();
  sauces.position.set(4.5, top, SPOTS.sauces);
  g.add(sauces);

  const tops = toppingStation();
  tops.position.set(4.53, top + 0.12, SPOTS.toppings);
  g.add(tops);
  boxBetween(4.36, 4.7, top, top + 0.12, SPOTS.toppings - 0.45, SPOTS.toppings + 0.6, steelMat(), { parent: g });

  // viande tranchée, prête à servir
  const sliced = gastroPan(0.3, 0.3, 0.06);
  sliced.position.set(4.55, top + 0.06, SPOTS.broche);
  g.add(sliced);
  const rand = rng(12);
  sliced.add(
    ...[0].map(() => {
      const im = new THREE.InstancedMesh(
        new THREE.BoxGeometry(0.06, 0.008, 0.025),
        new THREE.MeshPhysicalMaterial({ color: '#5c2c12', roughness: 0.5, clearcoat: 0.35 }),
        90,
      );
      const d = new THREE.Object3D();
      for (let i = 0; i < 90; i++) {
        d.position.set((rand() - 0.5) * 0.25, -0.03 + rand() * 0.05, (rand() - 0.5) * 0.25);
        d.rotation.set((rand() - 0.5) * 1.2, rand() * 6, (rand() - 0.5) * 1.2);
        d.updateMatrix();
        im.setMatrixAt(i, d.matrix);
      }
      im.castShadow = im.receiveShadow = true;
      return im;
    }),
  );

  // écrans de menu
  const screens = [SPOTS.pain, SPOTS.crudites, SPOTS.sauces];
  screens.forEach((z, i) => {
    boxBetween(x1 - 0.06, x1, 1.6, 2.32, z - 0.66, z + 0.66, new THREE.MeshStandardMaterial({ color: '#050505', roughness: 0.3 }), {
      parent: g,
    });
    const sm = new THREE.MeshStandardMaterial({
      color: '#000',
      emissive: '#fff',
      emissiveMap: menuBoardTex(i),
      emissiveIntensity: 0.9,
      roughness: 0.15,
    });
    mesh(new THREE.PlaneGeometry(1.26, 0.7), sm, { parent: g, p: [x1 - 0.062, 1.96, z], r: [0, -Math.PI / 2, 0], ...noShadow });
  });

  /* --- salle --- */
  const leatherMat = new THREE.MeshPhysicalMaterial({ ...leather([6, 2], '#c48a24'), sheen: 0.3, sheenColor: '#ffe2a8' });
  const bz0 = SHOP.zIn + 0.9;
  const bz1 = zBack - 0.6;
  boxBetween(x0, x0 + 0.55, 0, 0.36, bz0, bz1, new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.6 }), { parent: g });
  rbox(0.58, 0.1, bz1 - bz0, 0.04, leatherMat, { parent: g, p: [x0 + 0.29, 0.41, (bz0 + bz1) / 2] });
  const nb = Math.round((bz1 - bz0) / 0.42);
  for (let k = 0; k < nb; k++) {
    const z = bz0 + (k + 0.5) * ((bz1 - bz0) / nb);
    rbox(0.14, 0.56, (bz1 - bz0) / nb - 0.015, 0.06, leatherMat, { parent: g, p: [x0 + 0.08, 0.78, z] });
  }
  const tableTop = new THREE.MeshStandardMaterial({ ...woodGrain([1, 1], '#7a4f2e') });
  const black = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4, metalness: 0.4 });
  const stoolColors = [BRAND.yellow, BRAND.pink, BRAND.green, BRAND.purple, BRAND.red];
  TABLES_Z.forEach((z, k) => {
    rbox(0.62, 0.035, 0.62, 0.01, tableTop, { parent: g, p: [1.65, 0.745, z] });
    mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.72, 16), black, { parent: g, p: [1.65, 0.37, z] });
    mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.02, 32), black, { parent: g, p: [1.65, 0.01, z] });
    if (z !== MEAL_POS.z) stool(g, [2.25, z + (k % 2 ? 0.04 : -0.04)], stoolColors[k], k * 0.5);
    else stool(g, [2.45, z + 0.45], stoolColors[k], 0.6);
  });

  // direction de la caméra du dernier plan, dans le repère du plateau
  const mealRot = -0.5;
  const toCam = new THREE.Vector3(0.75, 0.52, -0.82).applyAxisAngle(new THREE.Vector3(0, 1, 0), -mealRot);
  const meal = servedMeal(toCam);
  meal.position.copy(MEAL_POS);
  meal.rotation.y = mealRot;
  g.add(meal);

  // néon du fond
  const neon = new THREE.MeshStandardMaterial({
    color: '#000',
    emissive: '#ffd9a8',
    emissiveMap: neonTex(),
    emissiveIntensity: 4.5,
    transparent: true,
    alphaMap: neonTex(),
    depthWrite: false,
  });
  mesh(new THREE.PlaneGeometry(2.2, 1.12), neon, {
    parent: g,
    p: [1.95, 2.25, zBack - 0.02],
    r: [0, Math.PI, 0],
    ...noShadow,
    receive: false,
  });

  /* --- modèles réalistes --- */
  if (models) {
    models.CommercialRefrigerator.traverse((o) => {
      if (o.isMesh && o.material.transmission > 0) o.material.roughness = Math.min(o.material.roughness, 0.04);
    });
    const fridge = fit(models.CommercialRefrigerator.clone(), 2.05);
    fridge.position.set(3.75, 0, zBack - 0.45);
    fridge.rotation.y = Math.PI;
    g.add(fridge);

    // appliques murales au-dessus de la banquette
    TABLES_Z.forEach((z) => {
      const lamp = fit(models.AnisotropyBarnLamp.clone(), 0.38);
      lamp.rotation.y = -Math.PI / 2;
      lamp.position.set(0, 1.62, z);
      lamp.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(lamp);
      lamp.position.x += x0 - bb.min.x;
      g.add(lamp);
    });

    for (const [x, z, s] of [
      [1.05, SHOP.zIn + 0.45, 1.25],
      [1.05, zBack - 0.4, 1.5],
      [5.0, SHOP.zIn + 0.4, 1.1],
    ]) {
      const p = fit(models.DiffuseTransmissionPlant.clone(), s);
      p.position.set(x, 0, z);
      p.rotation.y = x * 3;
      g.add(p);
    }
  }

  /* --- éclairage intérieur (3000 K) --- */
  const warm = '#ffd2a1';
  const rects = mobile ? [] : [7.0, 11.0];
  rects.forEach((z) => {
    const rl = new THREE.RectAreaLight(warm, 9, 0.22, 3.2);
    rl.position.set(3.2, h - 0.02, z);
    rl.rotation.x = -Math.PI / 2;
    g.add(rl);
    // la réglette elle-même
    mesh(
      new THREE.BoxGeometry(0.24, 0.03, 3.22),
      new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ffe7c4', emissiveIntensity: 2.2 }),
      {
        parent: g,
        p: [3.2, h - 0.016, z],
        ...noShadow,
      },
    );
  });
  if (mobile) {
    for (const z of [6.5, 10]) {
      const p = new THREE.PointLight(warm, 9, 0, 2);
      p.position.set(3.2, h - 0.3, z);
      g.add(p);
    }
  }
  [SPOTS.broche, SPOTS.crudites, SPOTS.toppings].forEach((z, i) => {
    const s = new THREE.SpotLight(warm, 22, 6, 0.55, 0.7, 2);
    s.position.set(4.7, h - 0.1, z);
    s.target.position.set(4.6, top, z);
    s.castShadow = !mobile && i === 1;
    s.shadow.mapSize.set(1024, 1024);
    s.shadow.bias = -0.0005;
    s.shadow.radius = 4;
    g.add(s, s.target);
    mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.14, 20), black, { parent: g, p: [4.7, h - 0.07, z], ...noShadow });
  });
  const grill = new THREE.PointLight('#ff6a1a', 2.5, 2.4, 2);
  grill.position.set(5.75, 1.45, SPOTS.broche);
  g.add(grill);
  anim.lights.push(grill);
  const neonLight = new THREE.PointLight('#ffb36b', 4, 4, 2);
  neonLight.position.set(1.95, 2.2, zBack - 0.4);
  g.add(neonLight);
  const tableLight = new THREE.PointLight('#ffc98f', 3, 3.5, 2);
  tableLight.position.set(1.65, 1.7, MEAL_POS.z);
  g.add(tableLight);

  return { group: g, anim };
}
