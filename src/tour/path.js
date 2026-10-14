import * as THREE from 'three';
import { SPOTS, MEAL_POS } from '../world/layout.js';

const v = (x, y, z) => new THREE.Vector3(x, y, z);

/*
 * Plans de la visite, dans l'ordre. La caméra suit une seule courbe continue
 * qui passe par chacun d'eux ; elle ralentit à chaque plan sans s'arrêter net.
 *   fov       focale verticale (desktop)
 *   portrait  ajustements pour écran vertical
 */
export const SHOTS = [
  // 0 · dans la ruelle, l'enseigne apparaît à droite
  { pos: v(-0.4, 1.62, -0.7), target: v(8, 1.85, 1.2), fov: 58, portrait: { target: v(6, 1.9, 2.6), fov: 72 } },
  // 1 · face à la devanture
  { pos: v(0.85, 1.58, 0.15), target: v(3.2, 1.95, 4.2), fov: 54, portrait: { pos: v(1.6, 1.55, -0.2), fov: 76 } },
  // 2 · devant la porte
  { pos: v(3.1, 1.6, 2.55), target: v(3.15, 1.5, 7), fov: 56, portrait: { fov: 74 } },
  // 3 · on entre : le comptoir à gauche, la salle à droite
  { pos: v(3.15, 1.64, 4.95), target: v(3.7, 1.25, 10), fov: 60, portrait: { fov: 78 } },
  // 4 · la broche
  { pos: v(3.25, 1.58, 5.35), target: v(5.7, 1.4, SPOTS.broche + 0.15), fov: 46, portrait: { fov: 66 } },
  // 5 · pain et crudités
  { pos: v(3.3, 1.7, SPOTS.pain + 0.2), target: v(4.62, 1.02, SPOTS.crudites - 0.1), fov: 48, portrait: { fov: 68 } },
  // 6 · sauces et toppings
  { pos: v(3.35, 1.66, SPOTS.crudites + 0.75), target: v(4.6, 1.02, SPOTS.toppings - 0.15), fov: 48, portrait: { fov: 68 } },
  // 7 · la salle et le néon
  { pos: v(3.7, 1.66, 9.8), target: v(1.6, 1.45, 13.7), fov: 56, portrait: { fov: 74 } },
  // 8 · le menu servi
  {
    pos: v(MEAL_POS.x + 0.75, 1.32, MEAL_POS.z - 0.82),
    target: v(MEAL_POS.x - 0.02, 0.8, MEAL_POS.z + 0.02),
    fov: 40,
    portrait: { fov: 58 },
  },
];

export function buildRig(portrait) {
  const shots = SHOTS.map((s) => (portrait && s.portrait ? { ...s, ...s.portrait } : s));
  const pos = new THREE.CatmullRomCurve3(
    shots.map((s) => s.pos),
    false,
    'centripetal',
  );
  const target = new THREE.CatmullRomCurve3(
    shots.map((s) => s.target),
    false,
    'centripetal',
  );
  const fovs = shots.map((s) => s.fov);
  const n = shots.length - 1;
  // smootherstep : la caméra ralentit en douceur à chaque plan
  const ease = (u) => u * u * u * (u * (u * 6 - 15) + 10);

  /** p ∈ [0, n] : index flottant du plan */
  function sample(p, out) {
    const i = Math.min(n - 1, Math.floor(p));
    const u = ease(Math.min(1, Math.max(0, p - i)));
    const t = (i + u) / n;
    pos.getPoint(t, out.pos);
    target.getPoint(t, out.target);
    out.fov = fovs[i] + (fovs[i + 1] - fovs[i]) * u;
    return out;
  }
  return { sample, count: shots.length };
}
