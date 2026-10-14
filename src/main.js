// polices auto-hébergées (sous-ensemble latin : couvre le français)
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import '@fontsource/lilita-one/latin-400.css';
import '@fontsource/anton/latin-400.css';
import '@fontsource/permanent-marker/latin-400.css';
import '@fontsource/sacramento/latin-400.css';
import 'lenis/dist/lenis.css';
import './styles.css';

import * as THREE from 'three';
import Lenis from 'lenis';
import logoUrl from './assets/logo.webp';
import { createWorld } from './three/world.js';
import { STOPS, STOPS_PORTRAIT, poseBetween } from './tour/path.js';
import { createScrollTimeline } from './tour/scroll.js';
import { clamp, lerp } from './three/util.js';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const narrowMQ = matchMedia('(max-width: 760px)');

document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

/* ------------------------------------------------------------------
   Loader
   ------------------------------------------------------------------ */
const bars = [...document.querySelectorAll('.loader__bar i')];
let step = 0;
const tick = () => bars[step++]?.classList.add('on');
const ready = () => {
  bars.forEach((b) => b.classList.add('on'));
  setTimeout(() => root.classList.add('is-ready'), reduced ? 0 : 250);
};

/* ------------------------------------------------------------------
   Sections & timeline
   ------------------------------------------------------------------ */
const sections = [...document.querySelectorAll('.stop')];
sections.forEach((s) => s.style.setProperty('--len', s.dataset.len || 200));
const stopIndexById = Object.fromEntries(STOPS.map((s, i) => [s.id, i]));
const stopsFor = (list) => sections.map((s) => list[stopIndexById[s.dataset.stop]]);
let sectionStops = stopsFor(STOPS);
const timeline = createScrollTimeline(sections);
const cards = sections.map((s) => s.querySelector('.stop__pin > *'));
const infos = document.getElementById('infos');
const navLinks = [...document.querySelectorAll('.skewer a')];
const skewerNav = document.querySelector('.skewer');
const navOrder = navLinks.map((a) => sections.findIndex((s) => s.id === a.dataset.target));

let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, anchors: true });
}
const scrollY = () => (lenis ? lenis.scroll : window.scrollY);

/* ------------------------------------------------------------------
   Rendu 3D
   ------------------------------------------------------------------ */
async function boot() {
  const canvas = document.getElementById('scene');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (err) {
    console.warn('WebGL indisponible, affichage statique.', err);
    root.classList.add('no-webgl');
    ready();
    return;
  }
  tick();

  const quality = {
    dpr: Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.75),
    shadowSize: coarse ? 1024 : 2048,
  };
  renderer.setPixelRatio(quality.dpr);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  // polices des textures peintes + logo
  const logoImg = new Image();
  logoImg.src = logoUrl;
  await Promise.all([
    logoImg.decode(),
    ...[
      '40px "Permanent Marker"',
      '40px "Lilita One"',
      '40px "Anton"',
      '600 20px "Poppins"',
      '700 20px "Poppins"',
      '40px "Sacramento"',
    ].map((f) => document.fonts.load(f)),
  ]).catch((e) => console.warn(e));
  tick();

  const world = createWorld(renderer, { logoImg, quality });
  tick();

  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 220);
  const pose = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 45, side: 0, fit: 1 };
  const look = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  let W = 0;
  let H = 0;
  let infosTop = Infinity;

  function resize(force = false) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // sur mobile, la barre d'adresse fait varier la hauteur : on ignore les petits écarts
    if (!force && coarse && w === W && Math.abs(h - H) < 160) {
      timeline.measure();
      infosTop = infos.getBoundingClientRect().top + window.scrollY;
      return;
    }
    W = w;
    H = h;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    sectionStops = stopsFor(W / H < 0.8 ? STOPS_PORTRAIT : STOPS);
    timeline.measure();
    infosTop = infos.getBoundingClientRect().top + window.scrollY;
  }
  resize(true);
  window.addEventListener('resize', () => resize());
  document.fonts.ready.then(() => resize(true));

  if (!coarse && !reduced) {
    window.addEventListener('pointermove', (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    });
  }

  /** Cadre la caméra : recul et focale sur écran vertical, décalage du sujet à côté de la carte. */
  function frame() {
    const aspect = W / H;
    const narrow = narrowMQ.matches;
    const aspectFix = clamp(1.3 / aspect, 1, 2.2);
    const wide = clamp((aspectFix - 1) / 1.0);
    camera.fov = Math.min(72, pose.fov * lerp(1, 1.32, wide));
    const pull = 1 + (aspectFix - 1) * 0.5 * pose.fit;
    offset.subVectors(pose.pos, pose.target).multiplyScalar(pull);
    camera.position.copy(pose.target).add(offset);

    // parallaxe souris
    mouse.sx = lerp(mouse.sx, mouse.x, 0.05);
    mouse.sy = lerp(mouse.sy, mouse.y, 0.05);
    look.copy(pose.target);
    camera.lookAt(look);
    if (mouse.sx || mouse.sy) {
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
      look.addScaledVector(right, mouse.sx * 0.22).addScaledVector(up, -mouse.sy * 0.12);
      camera.lookAt(look);
    }

    if (narrow) camera.setViewOffset(W, H, 0, H * 0.17, W, H);
    else camera.setViewOffset(W, H, pose.side * W * 0.15, 0, W, H);
  }

  /* --- cartes --- */
  const last = cards.map(() => ({ o: -1, t: '' }));
  function updateCards(y) {
    const states = timeline.cardStates(y);
    states.forEach(({ inP, outP }, i) => {
      const el = cards[i];
      if (!el) return;
      const o = Math.round(inP * (1 - outP) * 1000) / 1000;
      const isHero = i === 0;
      const tilt = el.style.getPropertyValue('--tilt') || getComputedStyle(el).getPropertyValue('--tilt') || '0deg';
      const t = isHero
        ? `translateY(${(-outP * 40).toFixed(1)}px)`
        : `rotate(calc(${tilt} + ${((1 - inP) * -6).toFixed(2)}deg)) scale(${(0.94 + 0.06 * inP).toFixed(3)})`;
      if (last[i].o !== o) {
        el.style.opacity = o;
        el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
        last[i].o = o;
      }
      if (!reduced && last[i].t !== t) {
        el.style.transform = t;
        last[i].t = t;
      }
    });
  }

  /* --- brochette de progression --- */
  let lastActive = -2;
  function updateNav(activeSection, y) {
    skewerNav.classList.toggle('is-hidden', activeSection === 0 || y > infosTop - H * 0.6);
    if (activeSection === lastActive) return;
    lastActive = activeSection;
    navLinks.forEach((a, k) => {
      const idx = navOrder[k];
      a.classList.toggle('is-active', idx === activeSection || (k === navLinks.length - 1 && activeSection > idx));
      a.classList.toggle('is-done', idx < activeSection);
      if (idx === activeSection) a.setAttribute('aria-current', 'step');
      else a.removeAttribute('aria-current');
    });
  }

  /* --- boucle --- */
  const state = { time: 0, dt: 0, heroT: 0, camera, station: -1, reduced };
  const clock = new THREE.Timer();
  let first = true;

  function loop(now) {
    requestAnimationFrame(loop);
    if (lenis) lenis.raf(now);
    clock.update(now);
    state.dt = Math.min(clock.getDelta(), 0.05);
    state.time = clock.getElapsed();

    const y = scrollY();
    const { index, k } = timeline.sample(y, { snap: reduced });
    const a = sectionStops[index];
    const b = sectionStops[index + 1];
    poseBetween(a, b, k, pose);

    // broche du hero : elle file vers l'enseigne pendant le trajet hero → façade
    state.heroT = index === 0 ? k : 1;
    // station regardée (pour le projecteur et les écrans)
    const atStation = (s) => (s && s.station != null ? s.station : null);
    const sa = atStation(a);
    const sb = atStation(b);
    if (sa != null && sb != null) state.station = lerp(sa, sb, k);
    else if (sa != null) state.station = k < 0.5 ? sa : -1;
    else if (sb != null) state.station = k > 0.5 ? sb : -1;
    else state.station = -1;

    updateCards(y);
    updateNav(k < 0.5 ? index : index + 1, y);

    // la section infos recouvre l'écran : inutile de rendre la 3D
    if (y >= infosTop && !first) return;
    frame();
    world.update(state);
    renderer.render(world.scene, camera);
    if (first) {
      first = false;
      tick();
      ready();
    }
  }

  renderer.compile(world.scene, camera);
  tick();
  requestAnimationFrame(loop);

  // accès de débogage (utilisé par les tests de capture)
  window.__kebab = { renderer, world, camera, timeline, lenis, stats: world.stats };
}

boot().catch((err) => {
  console.error(err);
  root.classList.add('no-webgl');
  ready();
});
