import { clamp, smoothstep, easeInOut } from '../three/util.js';

/**
 * Relie les sections HTML (.stop) à la timeline de la caméra.
 * Chaque section : la carte reste épinglée pendant `hold`, puis la caméra
 * voyage vers l'arrêt suivant pendant que la carte s'en va.
 */
export function createScrollTimeline(sections) {
  let vh = window.innerHeight;
  let metrics = [];

  function measure() {
    vh = window.innerHeight;
    metrics = sections.map((el, i) => {
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      const h = el.offsetHeight;
      // le hero part tout de suite ; les autres attendent que la carte se libère
      const hold = i === 0 ? 0 : clamp(1 - vh / h, 0, 0.8);
      return { el, top, h, hold };
    });
  }

  /** Renvoie la section courante et l'avancement du trajet vers la suivante. */
  function sample(y, { snap = false } = {}) {
    let i = metrics.length - 1;
    for (let k = 0; k < metrics.length; k++) {
      if (y < metrics[k].top + metrics[k].h) {
        i = k;
        break;
      }
    }
    const m = metrics[i];
    const u = clamp((y - m.top) / m.h);
    let k = i === metrics.length - 1 ? 0 : clamp((u - m.hold) / (1 - m.hold));
    if (snap) k = k < 0.5 ? 0 : 1;
    else k = easeInOut(k);
    return { index: i, u, k };
  }

  /** Opacité / entrée des cartes, façon sticker qu'on colle. */
  function cardStates(y) {
    return metrics.map((m, i) => {
      const inP = i === 0 ? 1 : smoothstep(m.top - vh * 0.6, m.top - vh * 0.05, y);
      const leave = m.top + m.hold * m.h;
      const outP =
        i === 0
          ? smoothstep(m.top + vh * 0.04, m.top + vh * 0.45, y)
          : i === metrics.length - 1
            ? 0
            : smoothstep(leave + vh * 0.05, leave + vh * 0.5, y);
      return { inP, outP };
    });
  }

  measure();
  return {
    measure,
    sample,
    cardStates,
    get metrics() {
      return metrics;
    },
  };
}
