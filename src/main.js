// polices auto-hébergées (sous-ensemble latin : couvre le français)
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/anton/latin-400.css';
import '@fontsource/permanent-marker/latin-400.css';
import '@fontsource/sacramento/latin-400.css';
import 'lenis/dist/lenis.css';
import './styles.css';

import * as THREE from 'three';
import Lenis from 'lenis';
import logoUrl from './assets/logo.webp';
import { loadEnvironments } from './world/env.js';
import { loadModels } from './world/models.js';
import { buildStorefront } from './world/street.js';
import { buildInterior } from './world/interior.js';
import { createPost } from './world/post.js';
import { setAnisotropy, plaster } from './world/pbr.js';
import { setPaintAnisotropy } from './world/paint.js';
import { clamp, lerp, smoothstep } from './world/util.js';
import { buildRig } from './tour/path.js';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const mobile = coarse || Math.min(screen.width, screen.height) < 700;
const noDamp = new URLSearchParams(location.search).has('nodamp'); // captures de test

document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

/* ------------------------------------------------------------------
   Chargement (compteur en pourcentage)
   ------------------------------------------------------------------ */
const pctEl = document.querySelector('.loader__pct');
let shown = 0;
let target = 0;
const progress = (p) => (target = Math.max(target, p));
(function countUp() {
  shown += (target - shown) * 0.12;
  if (pctEl) pctEl.textContent = String(Math.round(shown)).padStart(2, '0');
  if (!root.classList.contains('is-ready')) requestAnimationFrame(countUp);
})();
const ready = () => {
  target = 100;
  setTimeout(() => root.classList.add('is-ready'), reduced ? 0 : 450);
};

/* ------------------------------------------------------------------
   Scroll
   ------------------------------------------------------------------ */
const lenis = reduced ? null : new Lenis({ lerp: 0.09, wheelMultiplier: 0.85, anchors: true });
const tour = document.getElementById('tour');
const infos = document.getElementById('infos');
const caps = [...document.querySelectorAll('.cap')];
const scrollY = () => (lenis ? lenis.scroll : window.scrollY);

async function boot() {
  const canvas = document.getElementById('scene');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false, depth: true });
  } catch (err) {
    console.warn('WebGL indisponible, affichage statique.', err);
    root.classList.add('no-webgl');
    ready();
    return;
  }
  let dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.4 : 1.6);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.NoToneMapping; // fait par le post-traitement (AgX)
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  setAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));
  setPaintAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));
  progress(5);

  // polices des textures peintes + logo
  const logo = new Image();
  logo.src = logoUrl;
  await Promise.all([
    logo.decode(),
    ...['40px "Permanent Marker"', '40px "Anton"', '500 20px "Poppins"', '600 20px "Poppins"', '40px "Sacramento"'].map((f) =>
      document.fonts.load(f),
    ),
  ]).catch((e) => console.warn(e));
  progress(12);

  const loaded = { env: 0, models: 0 };
  const onEnv = (e) => e.total && ((loaded.env = e.loaded / e.total), progress(12 + loaded.env * 45 + loaded.models * 25));
  const onModels = (e) =>
    e.total && ((loaded.models = Math.max(loaded.models, e.loaded / e.total)), progress(12 + loaded.env * 45 + loaded.models * 25));
  const [envs, models] = await Promise.all([
    loadEnvironments(renderer, { mobile, onProgress: onEnv }),
    loadModels(onModels).catch((e) => (console.warn(e), null)),
  ]);
  progress(85);

  /* --- scène --- */
  const scene = new THREE.Scene();
  scene.add(envs.sky);
  scene.environment = envs.streetEnv;

  const glass = mobile
    ? new THREE.MeshStandardMaterial({
        color: '#d8e4e8',
        roughness: 0.03,
        metalness: 0,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    : new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        roughness: 0.02,
        metalness: 0,
        transmission: 1,
        thickness: 0.01,
        ior: 1.5,
        side: THREE.DoubleSide,
      });

  // enduit beige, comme les façades de la ruelle
  const stone = new THREE.MeshStandardMaterial({ color: '#cbbb9e', ...plaster([1, 1]), roughness: 0.92 });

  const store = buildStorefront({ logo, glass, stone });
  const inside = buildInterior({ glass, models, mobile });
  scene.add(store.group, inside.group);
  // à l'intérieur, les reflets viennent du café ; dehors, de la rue
  inside.group.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m || !('envMap' in m) || m.envMap || m === glass) continue;
      m.envMap = envs.cafeEnv;
      m.envMapIntensity = (m.metalness ?? 0) > 0.5 ? 1.1 : Math.min(m.envMapIntensity ?? 1, 0.55);
    }
  });

  const camera = new THREE.PerspectiveCamera(55, 1, 0.03, 120);
  const post = createPost(renderer, scene, camera, { mobile });
  progress(92);

  /* --- cadrage --- */
  let W = 0;
  let H = 0;
  let rig = buildRig(false);
  let tourTop = 0;
  let tourLen = 1;
  let infosTop = Infinity;
  function measure() {
    tourTop = tour.getBoundingClientRect().top + window.scrollY;
    tourLen = Math.max(1, tour.offsetHeight - window.innerHeight);
    infosTop = infos.getBoundingClientRect().top + window.scrollY;
  }
  function resize(force) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // sur mobile, la barre d'adresse fait varier la hauteur : on ignore les petits écarts
    if (!force && coarse && w === W && Math.abs(h - H) < 160) return measure();
    W = w;
    H = h;
    renderer.setSize(W, H, false);
    post.setSize(W, H);
    camera.aspect = W / H;
    rig = buildRig(W / H < 0.8);
    measure();
  }
  resize(true);
  window.addEventListener('resize', () => resize(false));
  document.fonts.ready.then(() => resize(true));

  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  if (!coarse && !reduced)
    window.addEventListener('pointermove', (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    });

  /* --- légendes --- */
  const capKeys = caps.map((c) => +c.dataset.key);
  const last = caps.map(() => -1);
  function updateCaptions(p) {
    caps.forEach((el, i) => {
      const d = p - capKeys[i];
      let o;
      if (capKeys[i] === 0) o = 1 - smoothstep(0.08, 0.4, p);
      else if (capKeys[i] === rig.count - 1) o = smoothstep(-0.45, -0.1, d);
      else o = smoothstep(-0.42, -0.12, d) * (1 - smoothstep(0.18, 0.42, d));
      const r = Math.round(o * 100) / 100;
      if (r === last[i]) return;
      last[i] = r;
      el.style.opacity = r;
      el.style.transform = reduced ? '' : `translate3d(0, ${((1 - r) * 18).toFixed(1)}px, 0)`;
      el.style.pointerEvents = r > 0.5 ? 'auto' : 'none';
    });
  }

  /* --- boucle --- */
  const pose = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 55 };
  const look = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const clock = new THREE.Timer();
  let p = 0;
  let first = true;
  // qualité adaptative : si les images ralentissent, on baisse la résolution pour rester fluide
  let frames = 0;
  let avg = 16;
  function adapt(dt) {
    if (noDamp || ++frames < 45) return;
    avg += (dt * 1000 - avg) * 0.05;
    if (frames % 60 === 0 && avg > 26 && dpr > 0.8) {
      dpr = Math.max(0.8, dpr - 0.2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(W, H, false);
      post.setSize(W, H);
      avg = 16;
    }
  }

  function loop(now) {
    requestAnimationFrame(loop);
    lenis?.raf(now);
    clock.update(now);
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.getElapsed();

    const y = scrollY();
    const raw = clamp((y - tourTop) / tourLen) * (rig.count - 1);
    // amortissement : mouvement continu même avec un scroll saccadé (tactile)
    p = reduced ? Math.round(raw) : first || noDamp ? raw : p + (raw - p) * (1 - Math.exp(-dt * 7));
    updateCaptions(p);
    root.classList.toggle('is-scrolled', y > 40);

    if (y > infosTop + 10 && !first) return; // la section infos recouvre tout
    rig.sample(p, pose);

    // léger flottement de caméra à l'épaule
    const sway = reduced ? 0 : 1;
    camera.position.copy(pose.pos);
    camera.position.y += Math.sin(time * 0.9) * 0.008 * sway;
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    mouse.sx = lerp(mouse.sx, mouse.x, 0.04);
    mouse.sy = lerp(mouse.sy, mouse.y, 0.04);
    look.copy(pose.target);
    camera.lookAt(look);
    right.setFromMatrixColumn(camera.matrix, 0);
    up.setFromMatrixColumn(camera.matrix, 1);
    look
      .addScaledVector(right, mouse.sx * 0.18 + Math.sin(time * 0.37) * 0.01 * sway)
      .addScaledVector(up, -mouse.sy * 0.1 + Math.sin(time * 0.53) * 0.008 * sway);
    camera.lookAt(look);

    // la porte est grande ouverte avant que la caméra n'atteigne le seuil
    store.anim.door.rotation.y = -smoothstep(0.9, 2.0, p) * 1.45;

    if (!reduced) inside.anim.meats.forEach((m) => (m.rotation.y += dt * 0.35));
    inside.anim.lights.forEach((l, i) => (l.intensity = 4 + Math.sin(time * 7 + i) * 0.25 + Math.sin(time * 13.1) * 0.15));

    post.focus(camera.position.distanceTo(pose.target), p < 2.5 ? 14 : 4.5);
    post.render(dt);
    adapt(dt);

    if (first) {
      first = false;
      ready();
    }
  }

  renderer.compile(scene, camera);
  progress(97);
  requestAnimationFrame(loop);

  // accès de débogage (utilisé par les captures de test)
  window.__kebab = {
    renderer,
    scene,
    camera,
    lenis,
    measure,
    get p() {
      return p;
    },
  };
}

boot().catch((err) => {
  console.error(err);
  root.classList.add('no-webgl');
  ready();
});
