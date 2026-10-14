import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
  NoiseEffect,
  BlendFunction,
  SMAAEffect,
  DepthOfFieldEffect,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';

/*
 * Rendu « caméra » : occlusion ambiante (N8AO), halo des lumières (bloom),
 * profondeur de champ, tonemapping AgX, vignettage et grain léger.
 */
export function createPost(renderer, scene, camera, { mobile }) {
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
  composer.addPass(new RenderPass(scene, camera));

  const ao = new N8AOPostPass(scene, camera, 1, 1);
  Object.assign(ao.configuration, {
    aoRadius: 0.55,
    distanceFalloff: 0.6,
    intensity: 2.6,
    aoSamples: mobile ? 8 : 16,
    denoiseSamples: mobile ? 4 : 8,
    halfRes: mobile,
    gammaCorrection: false,
    screenSpaceRadius: false,
  });
  composer.addPass(ao);

  const bloom = new BloomEffect({ intensity: 0.85, luminanceThreshold: 0.92, luminanceSmoothing: 0.25, mipmapBlur: true, radius: 0.72 });
  const dof = mobile ? null : new DepthOfFieldEffect(camera, { focusDistance: 4, focusRange: 3, bokehScale: 1.15, resolutionScale: 0.5 });
  const tone = new ToneMappingEffect({ mode: ToneMappingMode.AGX });
  const vignette = new VignetteEffect({ offset: 0.32, darkness: 0.55 });
  const noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false });
  noise.blendMode.opacity.value = 0.12;
  const smaa = new SMAAEffect();

  const effects = [bloom, ...(dof ? [dof] : []), tone, vignette, noise];
  composer.addPass(new EffectPass(camera, ...effects));
  composer.addPass(new EffectPass(camera, smaa));

  return {
    composer,
    setSize(w, h) {
      composer.setSize(w, h);
    },
    /** mise au point en mètres */
    focus(distance, range) {
      if (!dof) return;
      dof.cocMaterial.focusDistance = distance;
      dof.cocMaterial.focusRange = range;
    },
    render(dt) {
      composer.render(dt);
    },
  };
}
