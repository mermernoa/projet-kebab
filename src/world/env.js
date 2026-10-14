import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { GroundedSkybox } from 'three/addons/objects/GroundedSkybox.js';

/*
 * Décor urbain : photo HDR 360° d'une vraie ruelle (Poly Haven « Urban Alley 01 », CC0),
 * projetée au sol pour que la caméra puisse s'y déplacer.
 * À l'intérieur, les reflets viennent d'une photo HDR de café (« Comfy Cafe », CC0).
 */
export async function loadEnvironments(renderer, { mobile, onProgress }) {
  const loader = new HDRLoader();
  const base = import.meta.env.BASE_URL;
  const [street, cafe] = await Promise.all([
    loader.loadAsync(`${base}env/${mobile ? 'street_1k' : 'street_2k'}.hdr`, onProgress),
    loader.loadAsync(`${base}env/cafe_1k.hdr`),
  ]);
  street.mapping = cafe.mapping = THREE.EquirectangularReflectionMapping;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const streetEnv = pmrem.fromEquirectangular(street).texture;
  const cafeEnv = pmrem.fromEquirectangular(cafe).texture;
  pmrem.dispose();
  cafe.dispose();

  // hauteur de prise de vue de la photo ≈ 1,7 m ; rayon ≈ distance des façades
  const sky = new GroundedSkybox(street, 1.7, 9, 96);
  sky.position.y = 1.7 - 0.01;
  sky.material.depthWrite = false;
  sky.renderOrder = -1;

  return { sky, streetEnv, cafeEnv };
}
