import * as THREE from 'three';
import { STATION_Z, MEAL_POS } from '../three/interior.js';

const v = (x, y, z) => new THREE.Vector3(x, y, z);

/*
 * Arrêts de la caméra, dans l'ordre des sections HTML (data-stop).
 *   side : côté de l'écran occupé par la carte de texte (le sujet 3D se décale de l'autre côté)
 *   fit  : à quel point l'arrêt doit rester cadré en largeur sur un écran vertical (0 → 1)
 *   via  : points de passage pour ARRIVER à cet arrêt (passer par la porte, etc.)
 *   portrait : pose spécifique aux écrans verticaux (téléphones)
 */
const station = (id, i) => ({
  id,
  pos: v(-2.05, 2.22, STATION_Z[i] + 1.05),
  target: v(-4.5, 1.18, STATION_Z[i] - 0.1),
  fov: 50,
  side: 'right',
  fit: 0.85,
  station: i,
});

export const STOPS = [
  { id: 'hero', pos: v(0, 2.35, 10.2), target: v(0, 2.3, 0), fov: 42, side: 'left', fit: 0.35 },
  { id: 'facade', pos: v(0.7, 2.25, 14.6), target: v(0, 2.85, 0), fov: 46, side: 'left', fit: 0.85 },
  {
    id: 'concept',
    pos: v(2.9, 2.55, -1.3),
    target: v(-2.4, 1.05, -8.8),
    fov: 56,
    side: 'right',
    fit: 0.7,
    portrait: { pos: v(1.4, 2.35, -1.7), target: v(-2.9, 1.0, -7.6), fov: 52, fit: 0 },
    via: [
      { pos: v(0.15, 1.85, 4.2), target: v(0, 1.75, -4) },
      { pos: v(0.2, 1.9, -0.3), target: v(-0.6, 1.6, -6) },
    ],
  },
  station('pain', 0),
  station('viande', 1),
  station('garniture', 2),
  station('sauce', 3),
  station('topping', 4),
  {
    id: 'salle',
    pos: v(-1.0, 2.05, -4.4),
    target: v(5.0, 1.25, -10.8),
    fov: 54,
    side: 'left',
    fit: 0.8,
    via: [{ pos: v(-0.6, 2.1, -8.6), target: v(2.0, 1.4, -13) }],
  },
  {
    id: 'final',
    pos: v(MEAL_POS.x - 0.95, 1.62, MEAL_POS.z + 1.1),
    target: v(MEAL_POS.x + 0.05, 0.84, MEAL_POS.z - 0.05),
    fov: 40,
    side: 'left',
    fit: 0.5,
  },
];

/** Variante des arrêts pour écran vertical (les poses `portrait` remplacent celles du desktop). */
export const STOPS_PORTRAIT = STOPS.map((s) => (s.portrait ? { ...s, ...s.portrait, id: s.id + '~p' } : s));

const curveCache = new Map();
function curvesFor(a, b) {
  const key = a.id + '>' + b.id;
  if (!curveCache.has(key)) {
    const via = b.via || [];
    curveCache.set(key, {
      pos: new THREE.CatmullRomCurve3([a.pos, ...via.map((p) => p.pos), b.pos], false, 'centripetal'),
      target: new THREE.CatmullRomCurve3([a.target, ...via.map((p) => p.target), b.target], false, 'centripetal'),
    });
  }
  return curveCache.get(key);
}

/** Pose interpolée entre deux arrêts (k ∈ [0, 1]). */
export function poseBetween(a, b, k, out) {
  if (k <= 0 || !b) {
    out.pos.copy(a.pos);
    out.target.copy(a.target);
    out.fov = a.fov;
  } else if (k >= 1) {
    out.pos.copy(b.pos);
    out.target.copy(b.target);
    out.fov = b.fov;
  } else if (b.via) {
    const c = curvesFor(a, b);
    c.pos.getPoint(k, out.pos);
    c.target.getPoint(k, out.target);
    out.fov = a.fov + (b.fov - a.fov) * k;
  } else {
    out.pos.lerpVectors(a.pos, b.pos, k);
    out.target.lerpVectors(a.target, b.target, k);
    out.fov = a.fov + (b.fov - a.fov) * k;
  }
  const side = (s) => (s === 'left' ? -1 : s === 'right' ? 1 : 0);
  const sa = side(a.side);
  const sb = b ? side(b.side) : sa;
  out.side = sa + (sb - sa) * Math.min(1, Math.max(0, k));
  out.fit = a.fit + ((b ? b.fit : a.fit) - a.fit) * Math.min(1, Math.max(0, k));
  return out;
}
