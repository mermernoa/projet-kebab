import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Fusionne les meshes statiques qui partagent le même matériau : la boutique compte
 * des centaines de petites pièces, on les ramène à quelques dizaines d'appels de rendu.
 * Les objets animés (userData.dynamic) et transparents sont laissés intacts.
 */
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();

  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.children.length) return;
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.dynamic) return;
    const m = o.material;
    if (Array.isArray(m) || m.transparent) return;
    const geo = o.geometry;
    if (Object.keys(geo.morphAttributes).length) return;
    const attrs = Object.keys(geo.attributes).sort().join(',');
    const key = [m.uuid, o.castShadow, o.receiveShadow, !!geo.index, attrs].join('|');
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(o);
  });

  let before = 0;
  let after = 0;
  for (const list of buckets.values()) {
    before += list.length;
    if (list.length < 2) {
      after += 1;
      continue;
    }
    const geos = list.map((o) => {
      const g = o.geometry.clone();
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      return g;
    });
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) {
      after += list.length;
      continue;
    }
    const first = list[0];
    const mm = new THREE.Mesh(merged, first.material);
    mm.castShadow = first.castShadow;
    mm.receiveShadow = first.receiveShadow;
    root.add(mm);
    list.forEach((o) => o.parent.remove(o));
    after += 1;
  }
  return { before, after };
}
