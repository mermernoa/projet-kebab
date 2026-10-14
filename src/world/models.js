import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/*
 * Modèles 3D réalistes (Khronos glTF Sample Assets, CC BY 4.0) :
 * frigo à boissons, suspension en métal, plante en pot.
 */
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

export async function loadModels(onProgress) {
  const base = import.meta.env.BASE_URL;
  const names = ['CommercialRefrigerator', 'AnisotropyBarnLamp', 'DiffuseTransmissionPlant'];
  const out = {};
  await Promise.all(
    names.map(async (n) => {
      const gltf = await loader.loadAsync(`${base}models/${n}.glb`, onProgress);
      const root = gltf.scene;
      // les lumières embarquées ne servent pas ici
      const lights = [];
      root.traverse((o) => {
        if (o.isLight) lights.push(o);
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      lights.forEach((l) => l.parent.remove(l));
      out[n] = root;
    }),
  );
  return out;
}

/** Met un modèle à la taille voulue (hauteur en mètres) et le pose au sol. */
export function fit(object, height) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const s = height / size.y;
  object.scale.multiplyScalar(s);
  const box2 = new THREE.Box3().setFromObject(object);
  object.position.y -= box2.min.y;
  const c = box2.getCenter(new THREE.Vector3());
  object.position.x -= c.x;
  object.position.z -= c.z;
  const wrap = new THREE.Group();
  wrap.add(object);
  return wrap;
}
