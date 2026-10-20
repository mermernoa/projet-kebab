/* ============================================================
   KEBAB STUDIO — couche site (séparée du moteur scroll-scrub de script.js)
   1. Mots « Crée. Choisis. Dévore. » synchronisés au scroll du hero
   2. Zoom lent (Ken Burns) des photos de station
   3. Indicateur de visite (broche qui se remplit)
   4. Points cliquables de la station 1
   5. Configurateur « Crée ton kebab » + carte de recette
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var small = window.matchMedia("(max-width: 820px)").matches;

  /* ---------- 1 + 2. Scroll : mots du hero + Ken Burns ---------- */
  var hero = document.querySelector(".scrub");
  var words = [].slice.call(document.querySelectorAll(".scrub__words .word"));
  var kbs = [].slice.call(document.querySelectorAll(".station .kb"));

  function heroProgress() {
    if (!hero) return 0;
    var rect = hero.getBoundingClientRect();
    var travel = hero.offsetHeight - window.innerHeight;
    if (travel <= 0) return 0;
    return Math.min(1, Math.max(0, -rect.top / travel));
  }

  function onScroll() {
    if (words.length) {
      var p = heroProgress();
      words.forEach(function (w) {
        var on = small || reduced || p >= parseFloat(w.dataset.wIn);
        w.classList.toggle("is-on", on);
      });
    }
    if (!reduced) {
      var vh = window.innerHeight;
      kbs.forEach(function (kb) {
        var rect = kb.parentElement.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > vh) return;
        var t = (vh - rect.top) / (vh + rect.height);
        t = Math.min(1, Math.max(0, t));
        kb.style.setProperty("--kb", (1.02 + 0.1 * t).toFixed(4));
      });
    }
    ticking = false;
  }
  var ticking = false;
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------- 3. Indicateur de visite ---------- */
  var tour = document.getElementById("tour");
  var tourNum = document.getElementById("tourNum");
  var slices = tour ? [].slice.call(tour.querySelectorAll(".tour__slices li")) : [];
  var stations = [].slice.call(document.querySelectorAll(".station[data-station]"));
  var visible = {};
  if (tour && stations.length) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.dataset.station] = e.isIntersecting; });
      var current = 0;
      stations.forEach(function (s) { if (visible[s.dataset.station]) current = parseInt(s.dataset.station, 10); });
      tour.classList.toggle("is-on", current > 0);
      if (current > 0) {
        tourNum.textContent = current;
        slices.forEach(function (li, i) {
          li.classList.toggle("is-filled", i < current);
          li.classList.toggle("is-current", i === current - 1);
        });
      }
    }, { threshold: 0.55 });
    stations.forEach(function (s) { sio.observe(s); });
  }

  /* ---------- 4. Points cliquables ---------- */
  var spots = [].slice.call(document.querySelectorAll(".hotspot"));
  function closeSpots(except) {
    spots.forEach(function (h) {
      if (h === except) return;
      h.classList.remove("is-open");
      h.querySelector(".hotspot__dot").setAttribute("aria-expanded", "false");
    });
  }
  spots.forEach(function (h) {
    var dot = h.querySelector(".hotspot__dot");
    dot.addEventListener("click", function (ev) {
      ev.stopPropagation();
      var open = !h.classList.contains("is-open");
      closeSpots(h);
      h.classList.toggle("is-open", open);
      dot.setAttribute("aria-expanded", String(open));
    });
  });
  document.addEventListener("click", function () { closeSpots(null); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSpots(null); });

  /* ---------- 5. Configurateur ---------- */
  var BASE = 9.5, FORMULE = 4, ETUDIANT = 2, EXTRA = 0.5;
  var STEPS = [
    { key: "pain", label: "Ton pain", color: "var(--pink)", help: "Choisis ta base. Tous nos pains sont artisanaux.",
      single: true, required: "Choisis un pain pour continuer.",
      groups: [{ items: ["Pain turc", "Galette roulée", "Pita", "Naan au fromage", "Pain au sésame", "Bowl (sans pain)"] }] },
    { key: "viande", label: "Ta viande", color: "var(--orange)", help: "Française, 100 % halal. Ou falafels maison.",
      single: true, required: "Choisis une viande pour continuer.",
      groups: [{ items: ["Veau-dinde à la broche", "Poulet à la broche", { n: "Bavette grillée", p: 1.5 }, "Poulet pané", "Poulet crousty", "Merguez", { n: "Falafels maison", tag: "vegan" }] }] },
    { key: "garniture", label: "Ta garniture", color: "var(--green)", help: "Salade, tomate, oignon offerts. Choisis-en 4, les suivantes sont à 0,50 €.",
      included: 4, locked: ["Salade", "Tomate", "Oignon"],
      groups: [
        { label: "Légumes", items: ["Oignon rouge mariné", "Chou rouge", "Concombre", "Carottes râpées", "Maïs", "Poivrons grillés", "Aubergines grillées", "Champignons sautés", "Betterave"] },
        { label: "Pickles et piquant", items: ["Jalapeños", "Cornichons", "Olives", "Piments doux"] },
        { label: "Fromages", items: ["Feta", "Cheddar fondu", "Mozzarella", "Chèvre"] },
        { label: "Fun", items: ["Frites dedans", "Ananas grillé", "Guacamole"] }
      ] },
    { key: "sauce", label: "Ta sauce", color: "var(--violet)", help: "Deux sauces incluses. Les sauces maison sont marquées ⭐.",
      included: 2, max: 4, required: "Choisis une sauce pour continuer.",
      groups: [
        { label: "Maison", items: [{ n: "Sauce Studio", star: true, d: "Blanche citronnée aux herbes fraîches" }, { n: "Miel-piment", star: true, d: "Douce, puis ça pique" }] },
        { label: "Les classiques", items: ["Blanche", "Algérienne", "Samouraï", "Harissa", "Andalouse", "Biggy", "Barbecue", "Ketchup", "Mayo", "Curry"] }
      ] },
    { key: "topping", label: "Ton topping", color: "multi", help: "La touche finale. Un inclus.",
      included: 1, max: 3,
      groups: [
        { label: "Croustillant", items: ["Oignons frits", "Chips écrasées", "Graines de sésame", "Cacahuètes concassées"] },
        { label: "Fondant", items: ["Cheddar gratiné", "Raclette fondue", "Œuf au plat"] },
        { label: "Frais", items: ["Herbes fraîches", "Grenade", "Citron vert"] },
        { label: "Piquant", items: ["Flocons de piment", "Filet de sauce piquante"] }
      ] }
  ];
  var STUDIO = {
    pain: ["Pain au sésame"], viande: ["Poulet crousty"],
    garniture: ["Oignon rouge mariné", "Cheddar fondu", "Jalapeños", "Frites dedans"],
    sauce: ["Sauce Studio", "Miel-piment"], topping: ["Oignons frits"]
  };

  var stepsEl = document.getElementById("steps");
  var panel = document.getElementById("panel");
  if (!stepsEl || !panel) return;
  var msg = document.getElementById("builderMsg");
  var btnPrev = document.getElementById("btnPrev");
  var btnNext = document.getElementById("btnNext");
  var btnStudio = document.getElementById("btnStudio");
  var navEl = document.getElementById("builderNav");
  var gridEl = document.getElementById("builder");
  var result = document.getElementById("result");
  var recapList = document.getElementById("recapList");

  var state, current, recipeName = "", recipeNum = 0;
  function reset() {
    state = { pain: [], viande: [], garniture: [], sauce: [], topping: [] };
    current = 0; recipeName = ""; recipeNum = 0;
  }
  reset();

  function itemName(it) { return typeof it === "string" ? it : it.n; }
  function findItem(step, name) {
    for (var g = 0; g < step.groups.length; g++)
      for (var i = 0; i < step.groups[g].items.length; i++)
        if (itemName(step.groups[g].items[i]) === name) return step.groups[g].items[i];
    return null;
  }
  function euro(v) { return v.toFixed(2).replace(".", ",") + " €"; }
  function price() {
    var p = BASE;
    if (state.viande[0] === "Bavette grillée") p += 1.5;
    p += Math.max(0, state.garniture.length - 4) * EXTRA;
    p += Math.max(0, state.sauce.length - 2) * EXTRA;
    p += Math.max(0, state.topping.length - 1) * EXTRA;
    return p;
  }
  function colorOf(step) { return step.color === "multi" ? "var(--yellow)" : step.color; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function renderSteps() {
    stepsEl.innerHTML = "";
    STEPS.forEach(function (s, i) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "step-btn" + (i === current ? " is-current" : "") + (state[s.key].length ? " is-done" : "");
      if (s.color === "multi") b.setAttribute("data-multi", "");
      else b.style.setProperty("--c", s.color);
      b.innerHTML = '<span class="n">' + (i + 1) + "</span>" + s.label;
      if (i === current) b.setAttribute("aria-current", "step");
      b.addEventListener("click", function () { go(i); });
      li.appendChild(b); stepsEl.appendChild(li);
    });
  }

  function renderPanel() {
    msg.textContent = "";
    if (current >= STEPS.length) return renderSign();
    var s = STEPS[current];
    panel.style.setProperty("--c", colorOf(s));
    var html = '<h3 class="panel__title"><span class="num"' + (s.color === "multi" ? ' style="background: var(--multi)"' : "") + ">" + (current + 1) + "</span>" + s.label + "</h3>";
    html += '<p class="panel__help">' + s.help + "</p>";
    if (s.locked) {
      html += '<div class="group"><p class="group__label">Toujours inclus</p><div class="chips">';
      s.locked.forEach(function (n) { html += '<span class="chip chip--locked">✓ ' + n + " <small>offert</small></span>"; });
      html += "</div></div>";
    }
    s.groups.forEach(function (g) {
      html += '<div class="group">' + (g.label ? '<p class="group__label">' + g.label + "</p>" : "") + '<div class="chips">';
      g.items.forEach(function (it) {
        var n = itemName(it), on = state[s.key].indexOf(n) > -1;
        html += '<button type="button" class="chip' + (s.color === "multi" ? " chip--multi" : "") + '" aria-pressed="' + on + '" data-name="' + esc(n) + '">';
        if (it.star) html += '<span class="star">⭐</span>';
        html += "<span>" + n + (it.d ? '<span class="chip__desc">' + it.d + "</span>" : "") + "</span>";
        if (it.p) html += "<small>+" + euro(it.p) + "</small>";
        if (it.tag) html += "<small>" + it.tag + "</small>";
        html += "</button>";
      });
      html += "</div></div>";
    });
    panel.innerHTML = html;
    [].forEach.call(panel.querySelectorAll(".chip[data-name]"), function (c) {
      c.addEventListener("click", function () { toggle(s, c.dataset.name); });
    });
    btnPrev.disabled = current === 0;
    btnNext.textContent = current === STEPS.length - 1 ? "Signer ma création" : "Étape suivante";
  }

  function toggle(s, name) {
    var list = state[s.key], idx = list.indexOf(name), note = "";
    if (s.single) { state[s.key] = idx > -1 ? [] : [name]; }
    else if (idx > -1) { list.splice(idx, 1); }
    else {
      if (s.max && list.length >= s.max) { msg.textContent = s.max + " " + (s.key === "sauce" ? "sauces" : "toppings") + " maximum."; return; }
      list.push(name);
    }
    if (s.key === "garniture" && state.garniture.length === 4 && idx === -1) note = "Tes 4 garnitures incluses sont prises : la suivante est à +0,50 €.";
    if (s.key === "garniture" && state.garniture.length > 4) note = "Garnitures en plus : +" + euro((state.garniture.length - 4) * EXTRA) + ".";
    renderPanel(); renderSteps(); renderRecap();
    msg.textContent = note;
  }

  function renderRecap() {
    recapList.innerHTML = "";
    STEPS.forEach(function (s) {
      var li = document.createElement("li");
      var dot = s.color === "multi" ? '<span class="dot dot--multi"></span>' : '<span class="dot" style="--c:' + s.color + '"></span>';
      var items = state[s.key].slice();
      if (s.key === "garniture") items = ["Salade, tomate, oignon"].concat(items);
      li.innerHTML = dot + "<span><b>" + s.label + "</b><br>" + (items.length ? esc(items.join(" · ")) : '<span class="empty">à choisir</span>') + "</span>";
      recapList.appendChild(li);
    });
    var p = price();
    document.getElementById("pKebab").textContent = euro(p);
    document.getElementById("pFormule").textContent = euro(p + FORMULE);
    document.getElementById("pEtudiant").textContent = euro(p + ETUDIANT);
  }

  function missing() {
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i].required && !state[STEPS[i].key].length) return i;
    return -1;
  }

  function go(i) {
    current = Math.max(0, Math.min(STEPS.length, i));
    renderSteps(); renderPanel();
  }

  function renderSign() {
    panel.style.setProperty("--c", "var(--yellow)");
    panel.innerHTML =
      '<h3 class="panel__title">Signe ta création.</h3>' +
      '<p class="panel__help">Ta recette va recevoir son nom et son numéro.</p>' +
      '<form class="sign" id="signForm"><label for="signName">Ton prénom</label>' +
      '<input id="signName" name="name" type="text" maxlength="18" autocomplete="given-name" placeholder="Ton prénom" value="' + esc(recipeName) + '" required />' +
      '<button type="submit" class="btn btn--cta">Créer ma recette</button></form>';
    btnPrev.disabled = false;
    btnNext.style.display = "none";
    var f = document.getElementById("signForm");
    var input = document.getElementById("signName");
    setTimeout(function () { input.focus({ preventScroll: true }); }, 50);
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = input.value.trim().replace(/\s+/g, " ");
      if (!name) { msg.textContent = "Écris ton prénom pour signer ta création."; input.focus(); return; }
      recipeName = name;
      createCard();
    });
  }

  btnPrev.addEventListener("click", function () { btnNext.style.display = ""; go(current - 1); });
  btnNext.addEventListener("click", function () {
    var s = STEPS[current];
    if (s && s.required && !state[s.key].length) { msg.textContent = s.required; return; }
    if (current === STEPS.length - 1) {
      var m = missing();
      if (m > -1) { go(m); msg.textContent = STEPS[m].required; return; }
    }
    go(current + 1);
  });
  btnStudio.addEventListener("click", function () {
    Object.keys(STUDIO).forEach(function (k) { state[k] = STUDIO[k].slice(); });
    renderRecap(); go(STEPS.length - 1);
    msg.textContent = "Le Studio est prêt. Change ce que tu veux, puis signe ta création.";
  });

  function ingredientsList() {
    var out = [];
    STEPS.forEach(function (s) { out = out.concat(state[s.key]); });
    return out;
  }

  function createCard() {
    recipeNum = 100 + Math.floor(Math.random() * 900);
    var label = recipeName.toUpperCase();
    document.getElementById("cardNumTop").textContent = "#" + recipeNum;
    document.getElementById("cardName").innerHTML = esc(label) + ' <span class="hash">#' + recipeNum + "</span>";
    document.getElementById("cardIngredients").textContent = ingredientsList().join(" • ");
    var p = price();
    document.getElementById("cardPrice").textContent = "Ton kebab : " + euro(p) + " · En formule : " + euro(p + FORMULE);
    gridEl.hidden = true;
    btnStudio.hidden = true;
    result.hidden = false;
    // rejoue l'animation d'entrée
    var card = document.getElementById("card");
    card.style.animation = "none"; void card.offsetWidth; card.style.animation = "";
    result.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  }

  document.getElementById("btnRestart").addEventListener("click", function () {
    reset();
    result.hidden = true; gridEl.hidden = false; btnStudio.hidden = false; btnNext.style.display = "";
    renderSteps(); renderPanel(); renderRecap();
    document.getElementById("cree-ton-kebab").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  });

  document.getElementById("btnShare").addEventListener("click", function () {
    var text = "J'ai créé " + recipeName.toUpperCase() + " #" + recipeNum + " chez Kebab Studio : " + ingredientsList().join(", ") + ". Et toi, tu mets quoi ? #MonKebabStudio";
    if (navigator.share) {
      navigator.share({ title: "Ma recette Kebab Studio", text: text, url: location.href.split("#")[0] }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function () { flash("Texte copié ! Colle-le où tu veux."); }, function () { flash(text); });
    } else { flash(text); }
  });
  function flash(t) {
    var el = document.querySelector(".result__follow");
    var old = el.innerHTML; el.textContent = t;
    setTimeout(function () { el.innerHTML = old; }, 3500);
  }

  /* Carte téléchargeable : dessinée sur un canvas 1080×1350 (format Insta) */
  document.getElementById("btnDownload").addEventListener("click", function () {
    var fontsReady = document.fonts && document.fonts.load
      ? Promise.all([document.fonts.load('900 120px "Fraunces"'), document.fonts.load('italic 700 40px "Fraunces"'), document.fonts.load('700 30px "DM Sans"'), document.fonts.load('400 30px "DM Sans"')])
      : Promise.resolve();
    var logo = new Image();
    logo.src = "assets/img/logo.png";
    Promise.all([fontsReady, new Promise(function (r) { logo.onload = r; logo.onerror = r; })]).then(function () { drawCard(logo); });
  });

  function wrap(ctx, text, x, y, maxW, lh) {
    var words = text.split(" "), line = "", lines = [];
    words.forEach(function (w) {
      var test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    });
    if (line) lines.push(line);
    lines.forEach(function (l, i) { ctx.fillText(l, x, y + i * lh); });
    return y + lines.length * lh;
  }

  function drawCard(logo) {
    var W = 1080, H = 1350, c = document.createElement("canvas");
    c.width = W; c.height = H;
    var x = c.getContext("2d");
    x.fillStyle = "#F6F2E8"; x.fillRect(0, 0, W, H);
    // blobs
    x.fillStyle = "#F88DBF"; x.beginPath(); x.ellipse(W - 90, 110, 230, 170, 0.3, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#59A272"; x.beginPath(); x.ellipse(70, H - 90, 200, 150, -0.2, 0, Math.PI * 2); x.fill();
    // carte
    x.save(); x.translate(W / 2, H / 2); x.rotate(-0.03);
    var cw = 880, ch = 1100, cx = -cw / 2, cy = -ch / 2;
    x.fillStyle = "#000"; roundRect(x, cx + 16, cy + 16, cw, ch, 40); x.fill();
    x.fillStyle = "#fff"; roundRect(x, cx, cy, cw, ch, 40); x.fill();
    x.lineWidth = 6; x.strokeStyle = "#000"; roundRect(x, cx, cy, cw, ch, 40); x.stroke();
    var px = cx + 60, y = cy + 70;
    if (logo.naturalWidth) { var lh = 120, lw = lh * logo.naturalWidth / logo.naturalHeight; x.drawImage(logo, px - 10, y - 20, lw, lh); }
    x.fillStyle = "#000"; x.font = '700 26px "DM Sans", sans-serif'; x.textAlign = "right";
    x.fillText("RECETTE #" + recipeNum, cx + cw - 60, y + 50);
    x.textAlign = "left";
    y += 130;
    x.setLineDash([12, 10]); x.lineWidth = 3; x.strokeStyle = "#bbb"; x.beginPath(); x.moveTo(px, y); x.lineTo(cx + cw - 60, y); x.stroke(); x.setLineDash([]);
    y += 120;
    var name = recipeName.toUpperCase(), size = 120;
    x.font = '900 ' + size + 'px "Fraunces", serif';
    while (x.measureText(name).width > cw - 120 && size > 56) { size -= 6; x.font = '900 ' + size + 'px "Fraunces", serif'; }
    x.fillText(name, px, y);
    y += 40;
    // pastille #NNN
    x.font = '900 80px "Fraunces", serif';
    var tag = "#" + recipeNum, tw = x.measureText(tag).width + 40;
    x.save(); x.translate(px, y); x.rotate(-0.05);
    x.fillStyle = "#000"; x.fillRect(6, 6, tw, 100); x.fillStyle = "#FACA2C"; x.fillRect(0, 0, tw, 100);
    x.lineWidth = 5; x.strokeStyle = "#000"; x.strokeRect(0, 0, tw, 100);
    x.fillStyle = "#000"; x.fillText(tag, 20, 80); x.restore();
    y += 180;
    x.font = '400 34px "DM Sans", sans-serif'; x.fillStyle = "#111";
    y = wrap(x, ingredientsList().join(" • "), px, y, cw - 120, 50);
    y += 50;
    x.font = 'italic 700 40px "Fraunces", serif'; x.fillStyle = "#000";
    x.fillText("Une création unique. Comme toi. 👑", px, Math.min(y, cy + ch - 200));
    var pr = price();
    x.font = '700 30px "DM Sans", sans-serif';
    x.fillText("Ton kebab : " + euro(pr) + " · En formule : " + euro(pr + FORMULE), px, cy + ch - 120);
    x.font = '700 24px "DM Sans", sans-serif';
    x.fillText("KEBAB STUDIO · AMIENS · #MONKEBABSTUDIO", px, cy + ch - 70);
    x.restore();
    c.toBlob(function (blob) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "kebab-studio-" + recipeName.toLowerCase().replace(/[^a-z0-9]+/gi, "-") + "-" + recipeNum + ".png";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }, "image/png");
  }
  function roundRect(x, l, t, w, h, r) {
    x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r);
    x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath();
  }

  renderSteps(); renderPanel(); renderRecap();
})();
