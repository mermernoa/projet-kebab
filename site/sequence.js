/* ============================================================
   LA VISITE — plan-séquence au scroll
   Une caméra virtuelle se déplace dans chaque photo (x, y = point visé en %
   de l'image, s = zoom), puis « plonge » dans un point de l'image pour
   ressortir dans la suivante.
   ============================================================ */
(function () {
  "use strict";

  var seq = document.querySelector(".seq");
  if (!seq) return;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Fenêtres dans la progression [0..1] de la section, et chemin de caméra
     de chaque plan. keys : u = position dans le plan [0..1], x / y = point visé
     (en % de l'image), s = zoom. Même transition partout : à la fin d'un plan,
     la caméra plonge droit devant (zoom + flou) et ressort dans le plan suivant.
     Plan 0 = la devanture : le dernier point visé est la porte ouverte. */
  var OVERLAP = 0.025;
  var SHOTS = [
    { win: [0.000, 0.255], keys: [{ u: 0, x: 0.50, y: 0.50, s: 1.00 }, { u: 0.55, x: 0.55, y: 0.56, s: 1.22 }, { u: 1, x: 0.584, y: 0.62, s: 1.70 }] },
    { win: [0.230, 0.405], keys: [{ u: 0, x: 0.50, y: 0.50, s: 1.28 }, { u: 0.45, x: 0.34, y: 0.44, s: 1.30 }, { u: 1, x: 0.30, y: 0.45, s: 1.40 }] },
    { win: [0.380, 0.555], keys: [{ u: 0, x: 0.30, y: 0.42, s: 1.30 }, { u: 0.5, x: 0.45, y: 0.50, s: 1.22 }, { u: 1, x: 0.66, y: 0.52, s: 1.30 }] },
    { win: [0.530, 0.705], keys: [{ u: 0, x: 0.55, y: 0.48, s: 1.22 }, { u: 0.5, x: 0.45, y: 0.52, s: 1.12 }, { u: 1, x: 0.30, y: 0.55, s: 1.28 }] },
    { win: [0.680, 0.855], keys: [{ u: 0, x: 0.42, y: 0.46, s: 1.18 }, { u: 0.55, x: 0.38, y: 0.43, s: 1.26 }, { u: 1, x: 0.34, y: 0.42, s: 1.38 }] },
    { win: [0.830, 1.000], keys: [{ u: 0, x: 0.50, y: 0.62, s: 1.20 }, { u: 0.5, x: 0.50, y: 0.56, s: 1.08 }, { u: 1, x: 0.46, y: 0.60, s: 1.16 }] }
  ];

  var stage = seq.querySelector(".seq__stage");
  var shots = [].slice.call(seq.querySelectorAll(".shot"));
  var cams = shots.map(function (s) { return s.querySelector(".shot__cam"); });
  var frames = shots.map(function (s) { return s.querySelector(".shot__frame"); });
  var caps = [].slice.call(seq.querySelectorAll(".seq__cap"));
  var words = [].slice.call(seq.querySelectorAll(".seq__words .word"));
  var cue = document.getElementById("seqCue");
  var tour = document.getElementById("tour");
  var tourNum = document.getElementById("tourNum");
  var slices = tour ? [].slice.call(tour.querySelectorAll(".tour__slices li")) : [];

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp01(t); return t * t * (3 - 2 * t); }
  function smoothstep(a, b, x) { return smooth((x - a) / (b - a)); }

  function camAt(keys, u) {
    for (var i = 0; i < keys.length - 1; i++) {
      var a = keys[i], b = keys[i + 1];
      if (u <= b.u) {
        var t = smooth((u - a.u) / (b.u - a.u));
        return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), s: lerp(a.s, b.s, t) };
      }
    }
    var l = keys[keys.length - 1];
    return { x: l.x, y: l.y, s: l.s };
  }

  function progress() {
    var rect = seq.getBoundingClientRect();
    var travel = seq.offsetHeight - window.innerHeight;
    if (travel <= 0) return 0;
    return clamp01(-rect.top / travel);
  }

  function render() {
    var P = progress();
    var vw = window.innerWidth, vh = window.innerHeight;
    var speed = 0, best = -1, bestOp = 0;

    SHOTS.forEach(function (cfg, i) {
      var start = cfg.win[0], end = cfg.win[1], len = end - start;
      var el = shots[i];
      var live = P >= start - 0.001 && P <= end + 0.001;
      // le premier plan reste visible avant la section (arrivée depuis le hero)
      if (i === 0 && P <= start) live = true;
      if (i === SHOTS.length - 1 && P >= end) live = true;
      el.classList.toggle("is-live", live);
      if (!live) { el.style.opacity = "0"; return; }

      var u = clamp01((P - start) / len);
      var T = OVERLAP / len;
      var c = camAt(cfg.keys, u);
      var op = 1, blur = 0;

      if (!reduced) {
        if (i < SHOTS.length - 1 && u > 1 - T) {    // sortie : plongée droit devant
          var k = (u - (1 - T)) / T, kk = k * k;
          c.s *= 1 + 1.4 * kk;
          op = 1 - smoothstep(0.45, 1, k);
          blur = 9 * kk;
          speed = Math.max(speed, Math.sin(Math.PI * k));
        }
        if (i > 0 && u < T) {                        // entrée : on arrive « de loin dedans »
          var e = 1 - u / T;
          c.s *= 1 + 0.9 * e * e;
          op = Math.min(op, 1 - smooth(e * 1.15));
          blur = Math.max(blur, 8 * e * e);
          speed = Math.max(speed, Math.sin(Math.PI * (1 - e)) * 0.9);
        }
      } else {
        c.s = 1.04;
        if (i < SHOTS.length - 1 && u > 1 - T) op = 1 - smooth((u - (1 - T)) / T);
        if (i > 0 && u < T) op = smooth(u / T);
      }

      // empêche de voir le bord de l'image
      var fw = frames[i].offsetWidth || vw, fh = frames[i].offsetHeight || vh;
      var hx = vw / (2 * fw * c.s), hy = vh / (2 * fh * c.s);
      c.x = Math.min(1 - hx, Math.max(hx, c.x));
      c.y = Math.min(1 - hy, Math.max(hy, c.y));

      cams[i].style.transform = "scale(" + c.s.toFixed(4) + ") translate(" + ((0.5 - c.x) * 100).toFixed(3) + "%, " + ((0.5 - c.y) * 100).toFixed(3) + "%)";
      el.style.opacity = op.toFixed(3);
      el.style.filter = blur > 0.2 ? "blur(" + blur.toFixed(1) + "px)" : "none";
      el.classList.toggle("is-interactive", op > 0.97 && blur < 0.3);
      if (op >= bestOp) { bestOp = op; best = i; }
    });

    stage.style.setProperty("--speed", (speed * 0.9).toFixed(3));

    caps.forEach(function (cap) {
      var a = parseFloat(cap.dataset.in), b = parseFloat(cap.dataset.out);
      var o = smoothstep(a, a + 0.02, P) * (1 - smoothstep(b - 0.02, b, P));
      cap.style.opacity = o.toFixed(3);
      cap.style.transform = "translateY(" + ((1 - o) * 22).toFixed(1) + "px)";
      cap.style.pointerEvents = o > 0.5 ? "auto" : "none";
    });

    // « Crée. Choisis. Dévore. » : les mots se posent un par un
    words.forEach(function (w) { w.classList.toggle("is-on", reduced || P >= parseFloat(w.dataset.wIn)); });
    if (cue) cue.style.opacity = String(1 - smoothstep(0.005, 0.03, P));

    // indicateur de visite : stations 1 à 5 (le plan 0 est la devanture)
    var rect = seq.getBoundingClientRect();
    var inSeq = rect.top <= 1 && rect.bottom >= vh - 1 && best > 0;
    if (tour) {
      tour.classList.toggle("is-on", inSeq);
      if (inSeq) {
        tourNum.textContent = best;
        slices.forEach(function (li, i) {
          li.classList.toggle("is-filled", i < best);
          li.classList.toggle("is-current", i === best - 1);
        });
      }
    }
    ticking = false;
  }

  var ticking = false;
  function onScroll() { if (!ticking) { ticking = true; window.requestAnimationFrame(render); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  render();

})();
