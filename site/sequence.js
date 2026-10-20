/* ============================================================
   LA VISITE — plan-séquence au scroll + visite automatique
   Une caméra virtuelle se déplace dans chaque photo (x, y = point visé en %
   de l'image, s = zoom), puis « plonge » dans un point de l'image pour
   ressortir dans la suivante. Aucun effet sur le moteur du hero (script.js).
   ============================================================ */
(function () {
  "use strict";

  var seq = document.querySelector(".seq");
  if (!seq) return;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Fenêtres dans la progression [0..1] de la section, et chemin de caméra
     de chaque plan. keys : u = position dans le plan [0..1].
     dive : point où la caméra plonge pour passer au plan suivant. */
  var OVERLAP = 0.03;
  var SHOTS = [
    { win: [0.00, 0.22], keys: [{ u: 0, x: 0.50, y: 0.50, s: 1.28 }, { u: 0.45, x: 0.34, y: 0.44, s: 1.30 }, { u: 1, x: 0.30, y: 0.45, s: 1.40 }], dive: { x: 0.14, y: 0.50 } },
    { win: [0.20, 0.42], keys: [{ u: 0, x: 0.30, y: 0.42, s: 1.30 }, { u: 0.5, x: 0.45, y: 0.50, s: 1.22 }, { u: 1, x: 0.66, y: 0.52, s: 1.30 }], dive: { x: 0.86, y: 0.46 } },
    { win: [0.40, 0.62], keys: [{ u: 0, x: 0.55, y: 0.48, s: 1.22 }, { u: 0.5, x: 0.45, y: 0.52, s: 1.12 }, { u: 1, x: 0.30, y: 0.55, s: 1.28 }], dive: { x: 0.12, y: 0.45 } },
    { win: [0.60, 0.82], keys: [{ u: 0, x: 0.42, y: 0.46, s: 1.18 }, { u: 0.55, x: 0.38, y: 0.43, s: 1.26 }, { u: 1, x: 0.34, y: 0.42, s: 1.38 }], dive: { x: 0.50, y: 0.85 } },
    { win: [0.80, 1.00], keys: [{ u: 0, x: 0.50, y: 0.62, s: 1.20 }, { u: 0.5, x: 0.50, y: 0.56, s: 1.08 }, { u: 1, x: 0.46, y: 0.60, s: 1.16 }], dive: null }
  ];

  var stage = seq.querySelector(".seq__stage");
  var shots = [].slice.call(seq.querySelectorAll(".shot"));
  var cams = shots.map(function (s) { return s.querySelector(".shot__cam"); });
  var frames = shots.map(function (s) { return s.querySelector(".shot__frame"); });
  var caps = [].slice.call(seq.querySelectorAll(".seq__cap"));
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
        if (cfg.dive && u > 1 - T) {                 // sortie : plongée vers le point « dive »
          var k = (u - (1 - T)) / T, kk = k * k;
          c.s *= 1 + 1.4 * kk;
          c.x = lerp(c.x, cfg.dive.x, smooth(k));
          c.y = lerp(c.y, cfg.dive.y, smooth(k));
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
        if (cfg.dive && u > 1 - T) op = 1 - smooth((u - (1 - T)) / T);
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

    // indicateur de visite : visible tant que l'écran de la visite est collé
    var rect = seq.getBoundingClientRect();
    var inSeq = rect.top <= 1 && rect.bottom >= vh - 1;
    if (tour) {
      tour.classList.toggle("is-on", inSeq);
      if (inSeq && best > -1) {
        tourNum.textContent = best + 1;
        slices.forEach(function (li, i) {
          li.classList.toggle("is-filled", i <= best);
          li.classList.toggle("is-current", i === best);
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

  /* ---------- Visite automatique ---------- */
  var btn = document.getElementById("autoplay");
  if (!btn) return;
  var label = btn.querySelector(".autoplay__label");
  var icon = btn.querySelector(".autoplay__icon");
  var playing = false, last = 0, pos = 0, raf = 0;
  var DURATION = 58; // secondes pour aller du haut de la page à la fin de la visite

  function endY() { return seq.offsetTop + seq.offsetHeight - window.innerHeight; }
  function setUI() {
    btn.setAttribute("aria-pressed", String(playing));
    label.textContent = playing ? "Pause" : (window.scrollY >= endY() - 4 ? "Revoir la visite" : "Lancer la visite");
    icon.textContent = playing ? "❚❚" : "▶";
  }
  function step(ts) {
    if (!playing) return;
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    var target = endY();
    pos += (target / DURATION) * dt;
    if (pos >= target) { pos = target; window.scrollTo(0, pos); stop(); return; }
    window.scrollTo(0, pos);
    raf = window.requestAnimationFrame(step);
  }
  function start() {
    document.documentElement.style.scrollBehavior = "auto";
    if (window.scrollY >= endY() - 4) window.scrollTo(0, 0);
    pos = window.scrollY; last = 0; playing = true; setUI();
    raf = window.requestAnimationFrame(step);
  }
  function stop() {
    playing = false; window.cancelAnimationFrame(raf);
    document.documentElement.style.scrollBehavior = "";
    setUI();
  }
  btn.addEventListener("click", function () { playing ? stop() : start(); });
  ["wheel", "touchstart", "keydown", "mousedown"].forEach(function (ev) {
    window.addEventListener(ev, function (e) {
      if (!playing) return;
      if (e.type === "mousedown" && btn.contains(e.target)) return;
      if (e.type === "keydown" && (e.target === btn)) return;
      stop();
    }, { passive: true });
  });

  // le bouton n'apparaît que pendant le hero et la visite
  function toggleBtn() {
    var visible = window.scrollY < endY() + window.innerHeight * 0.3;
    btn.classList.toggle("is-hidden", !visible && !playing);
    if (!playing) setUI();
  }
  window.addEventListener("scroll", toggleBtn, { passive: true });
  toggleBtn();
})();
