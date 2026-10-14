/* =========================================================================
   Issiaka SIDIBE · Portfolio · interactions
   Le moteur scrollcraft n'est pas modifié. Pour rester fluide, ce script mesure
   la page une fois (au chargement et au redimensionnement), puis n'écrit que
   des transformations et des opacités pendant le défilement : aucune lecture de
   mise en page par image, rien n'est repeint.
   ========================================================================= */
(function () {
  "use strict";

  var WHATSAPP_NUMBER = "2250585024748";
  var POINTER_LERP = 0.1;
  var CONV_FROM = 0.06;   // progression de l'acte où la conversion commence
  var CONV_TO = 0.86;     // progression où elle est terminée
  var MAX_AMOUNT = 999999999999;
  var PHONE_MAX_WIDTH = 860;

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  /* ---------- Année du pied de page ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Éléments ---------- */
  var heroAct = document.getElementById("top");
  var nameEl = document.querySelector(".hero__name");
  var portraitEl = document.querySelector(".hero__portrait");
  var veilEl = document.querySelector(".hero__veil");
  var floorEl = document.querySelector(".hero__floor");
  var xpLines = document.querySelectorAll("[data-xp]");
  var focusItems = document.querySelectorAll("[data-focus-list] > li");
  var conv = document.getElementById("norme");

  /* ---------- Mesures, prises une fois ---------- */
  var vw = 0, vh = 0;
  var hero = { top: 0, travel: 1, end: 0 };
  var convBox = { top: 0, travel: 1 };
  var xp = [], focus = [];

  function measure() {
    vw = window.innerWidth; vh = window.innerHeight;
    var y = window.scrollY;
    var docTop = function (el) { return el.getBoundingClientRect().top + y; };
    if (heroAct) { hero.top = docTop(heroAct); hero.travel = Math.max(heroAct.offsetHeight - vh, 1); hero.end = hero.top + heroAct.offsetHeight; }
    if (conv) { convBox.top = docTop(conv); convBox.travel = Math.max(conv.offsetHeight - vh, 1); }
    xp = [];
    each(xpLines, function (line) {
      var row = line.parentNode;
      xp.push({ el: line, top: docTop(row), over: Math.max(0, line.scrollWidth - vw), rev: row.classList.contains("xp__row--rev") });
    });
    focus = [];
    each(focusItems, function (li) {
      var r = li.getBoundingClientRect();
      focus.push({ el: li, center: r.top + y + r.height / 2 });
    });
  }

  /* ---------- Héros : défilement et pointeur, en transformations seules ---------- */
  var lean = { x: 0, y: 0, tx: 0, ty: 0, running: false };
  var heroP = -1;

  function paintHero(p) {
    heroP = p;
    var fade = Math.max(0.07, 1 - p * 2.3);
    nameEl.style.opacity = fade.toFixed(3);
    veilEl.style.opacity = (p * 0.9).toFixed(3);
    floorEl.style.opacity = p.toFixed(3);
    if (reduced) return;
    var phone = vw <= PHONE_MAX_WIDTH;
    nameEl.style.transform = "translate3d(" + (lean.x * -10).toFixed(1) + "px," + (p * -0.05 * vh).toFixed(1) + "px,0) scale(" + (1 + p * 0.12).toFixed(4) + ")";
    portraitEl.style.transform = phone
      ? "scale(" + (1 + p * 0.05).toFixed(4) + ")"
      : "translate3d(" + (p * 0.05 * vw + lean.x * 14).toFixed(1) + "px," + (lean.y * 6).toFixed(1) + "px,0) scale(" + (1 + p * 0.07).toFixed(4) + ")";
  }

  function leanStep() {
    lean.x += (lean.tx - lean.x) * POINTER_LERP;
    lean.y += (lean.ty - lean.y) * POINTER_LERP;
    paintHero(heroP < 0 ? 0 : heroP);
    lean.running = Math.abs(lean.tx - lean.x) + Math.abs(lean.ty - lean.y) > 0.002;
    if (lean.running) window.requestAnimationFrame(leanStep);
  }
  if (heroAct && fine && !reduced) {
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse" || window.scrollY > hero.end) return;
      lean.tx = (e.clientX / vw) * 2 - 1;
      lean.ty = (e.clientY / vh) * 2 - 1;
      if (!lean.running) { lean.running = true; window.requestAnimationFrame(leanStep); }
    }, { passive: true });
  }

  /* ---------- Le convertisseur MT103 → pacs.008 ---------- */
  // Exemple fictif et simplifié. La conversion ci-dessous est réelle : le texte
  // MT est analysé, puis le message ISO 20022 est construit à partir des champs.
  var convStage = conv && conv.querySelector("[data-sc-stage]");
  var mtEl = conv && conv.querySelector("[data-mt]");
  var mxEl = conv && conv.querySelector("[data-mx]");
  var statusEl = conv && conv.querySelector("[data-conv-status]");
  var amountEl = conv && conv.querySelector("[data-conv-amount]");
  var lastConv = "";
  var convP = 0;

  function buildMT(amount) {
    return [
      ":20:REF20261013001",
      ":23B:CRED",
      ":32A:261013XOF" + amount + ",",
      ":50K:/CI000EXEMPLE0001",
      "SOCIETE EXEMPLE A",
      ":59:/CI000EXEMPLE0002",
      "FOURNISSEUR EXEMPLE B",
      ":70:FACTURE 2026-104",
      ":71A:SHA"
    ].join("\n");
  }

  // Analyse un MT103 : { "20": ["REF…"], "50K": ["/compte", "nom"], … }
  function parseMT(text) {
    var fields = {}, order = [], tag = null;
    text.split("\n").forEach(function (line, index) {
      var m = /^:(\d{2}[A-Z]?):(.*)$/.exec(line);
      if (m) { tag = m[1]; fields[tag] = [m[2]]; }
      else if (tag) { fields[tag].push(line); }
      order.push({ tag: tag, line: index });
    });
    return { fields: fields, order: order };
  }

  var CHARGE_BEARER = { SHA: "SHAR", OUR: "DEBT", BEN: "CRED" };

  // Construit les lignes pacs.008. Chaque ligne porte l'étape qui la produit.
  function buildMX(fields) {
    var f32 = /^(\d{2})(\d{2})(\d{2})([A-Z]{3})([\d,]+)$/.exec((fields["32A"] || [""])[0]) || [];
    var date = f32.length ? "20" + f32[1] + "-" + f32[2] + "-" + f32[3] : "";
    var amount = (f32[5] || "").replace(/,$/, "").replace(",", ".");
    var debtor = fields["50K"] || ["", ""], creditor = fields["59"] || ["", ""];
    return [
      { step: -1, text: "<CdtTrfTxInf>" },
      { step: 0, text: "  <PmtId><InstrId>" + (fields["20"] || [""])[0] + "</InstrId></PmtId>" },
      { step: 1, text: "  <IntrBkSttlmAmt Ccy=\"" + (f32[4] || "") + "\">" + amount + "</IntrBkSttlmAmt>" },
      { step: 2, text: "  <IntrBkSttlmDt>" + date + "</IntrBkSttlmDt>" },
      { step: 3, text: "  <Dbtr><Nm>" + debtor[1] + "</Nm></Dbtr>" },
      { step: 3, text: "  <DbtrAcct><Id><Othr><Id>" + debtor[0].replace(/^\//, "") + "</Id></Othr></Id></DbtrAcct>" },
      { step: 4, text: "  <Cdtr><Nm>" + creditor[1] + "</Nm></Cdtr>" },
      { step: 4, text: "  <CdtrAcct><Id><Othr><Id>" + creditor[0].replace(/^\//, "") + "</Id></Othr></Id></CdtrAcct>" },
      { step: 5, text: "  <RmtInf><Ustrd>" + (fields["70"] || [""])[0] + "</Ustrd></RmtInf>" },
      { step: 6, text: "  <ChrgBr>" + (CHARGE_BEARER[(fields["71A"] || [""])[0]] || "SHAR") + "</ChrgBr>" },
      { step: -1, text: "</CdtTrfTxInf>" }
    ];
  }

  // Ordre de lecture : champ MT, élément ISO 20022, libellé.
  var STEPS = [
    { tag: "20",  to: "InstrId",        label: "référence de l'opération" },
    { tag: "32A", to: "IntrBkSttlmAmt", label: "devise et montant" },
    { tag: "32A", to: "IntrBkSttlmDt",  label: "date de valeur" },
    { tag: "50K", to: "Dbtr",           label: "donneur d'ordre" },
    { tag: "59",  to: "Cdtr",           label: "bénéficiaire" },
    { tag: "70",  to: "RmtInf",         label: "motif du paiement" },
    { tag: "71A", to: "ChrgBr",         label: "répartition des frais" }
  ];

  function codeLine(text, name, value) {
    var el = document.createElement("span");
    el.className = "ln";
    el.textContent = text;
    el.setAttribute(name, value);
    return el;
  }

  function buildConverter() {
    if (!conv) return;
    var raw = parseInt(amountEl.value, 10);
    var amount = isNaN(raw) || raw < 1 ? 1 : Math.min(raw, MAX_AMOUNT);
    var mt = buildMT(amount);
    var parsed = parseMT(mt);

    mtEl.textContent = ""; mxEl.textContent = "";
    mt.split("\n").forEach(function (text, index) {
      mtEl.appendChild(codeLine(text, "data-tag", parsed.order[index].tag || ""));
    });
    buildMX(parsed.fields).forEach(function (l) {
      var el = codeLine(l.text, "data-step", String(l.step));
      if (l.step < 0) el.classList.add("is-frame");
      mxEl.appendChild(el);
    });
    lastConv = "";
    renderConverter(convP);
  }

  function renderConverter(p) {
    if (!conv) return;
    convP = p;
    var t = clamp01((p - CONV_FROM) / (CONV_TO - CONV_FROM));
    // Sous animations réduites, le message est montré converti en entier.
    var done = reduced ? STEPS.length : Math.floor(t * (STEPS.length + 1));
    var now = done < STEPS.length && t > 0 ? done : -1;
    var painted = done + "|" + now + "|" + amountEl.value;
    if (painted === lastConv) return;
    lastConv = painted;

    var nowTag = now >= 0 ? STEPS[now].tag : null, doneTags = {};
    STEPS.forEach(function (s, i) { if (i < done) doneTags[s.tag] = true; });
    each(mtEl.children, function (el) {
      var tag = el.getAttribute("data-tag");
      el.classList.toggle("is-now", tag === nowTag);
      el.classList.toggle("is-done", !!doneTags[tag] && tag !== nowTag);
    });
    each(mxEl.children, function (el) {
      var step = parseInt(el.getAttribute("data-step"), 10);
      if (step < 0) return;
      el.classList.toggle("is-now", step === now);
      el.classList.toggle("is-done", step < done && step !== now);
    });
    statusEl.textContent = now >= 0
      ? ":" + STEPS[now].tag + ": → " + STEPS[now].to + " · " + STEPS[now].label
      : (done >= STEPS.length ? "Message converti : " + STEPS.length + " correspondances." : "MT103 reçu. En attente de conversion.");
    // Le harnais de vérification ne voit pas cet état : on publie ce qui est peint.
    convStage.setAttribute("data-sc-verify-state", painted);
    convStage.setAttribute("data-sc-verify-hold", String(now < 0));
  }

  if (amountEl) amountEl.addEventListener("input", buildConverter);

  /* ---------- Travaux & Labo : la ligne proche du centre prend l'encre ---------- */
  var nearEl = null;
  if (focusItems.length && !reduced) document.documentElement.classList.add("has-focus");

  function setNear(el) {
    if (el === nearEl) return;
    if (nearEl) nearEl.classList.remove("is-near");
    if (el) el.classList.add("is-near");
    nearEl = el;
  }
  // Au clavier, la ligne qui contient le focus reste lisible.
  each(focusItems, function (li) { li.addEventListener("focusin", function () { setNear(li); }); });

  /* ---------- Une seule passe par image, sans lecture de mise en page ---------- */
  function paint() {
    var y = window.scrollY;

    if (heroAct && y <= hero.end) paintHero(clamp01((y - hero.top) / hero.travel));

    if (!reduced) {
      for (var i = 0; i < xp.length; i++) {
        var row = xp[i];
        if (row.top > y + vh * 1.5 || row.top < y - vh) continue;
        // 0 quand la ligne entre par le bas, 1 quand elle sort par le haut.
        var t = clamp01((y + vh * 0.92 - row.top) / (vh * 0.84));
        row.el.style.transform = "translate3d(" + (-row.over * (row.rev ? 1 - t : t)).toFixed(1) + "px,0,0)";
      }

      var mid = y + vh * 0.5, best = null, bestDist = vh * 0.5;
      for (var j = 0; j < focus.length; j++) {
        var d = Math.abs(focus[j].center - mid);
        if (d < bestDist) { bestDist = d; best = focus[j].el; }
      }
      setNear(best);
    }

    if (conv) renderConverter(clamp01((y - convBox.top) / convBox.travel));
  }

  var queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(function () { queued = false; paint(); });
  }
  function remeasure() {
    // Une image d'attente : le moteur redimensionne ses actes en premier.
    window.requestAnimationFrame(function () { measure(); paint(); });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", remeasure);
  window.addEventListener("load", remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  buildConverter();
  measure();
  paint();

  /* ---------- Formulaire → WhatsApp ---------- */
  var form = document.getElementById("waForm");
  if (form) {
    var nameField = document.getElementById("waName");
    var subjectField = document.getElementById("waSubject");
    var messageField = document.getElementById("waMessage");
    var errorEl = document.getElementById("waError");

    var markField = function (el, bad) {
      var field = el.closest(".field");
      if (field) field.classList.toggle("is-bad", bad);
    };
    var showError = function (text) {
      if (!errorEl) return;
      errorEl.textContent = text;
      errorEl.hidden = !text;
    };

    [nameField, messageField].forEach(function (el) {
      if (!el) return;
      el.addEventListener("input", function () {
        if (el.value.trim()) { markField(el, false); showError(""); }
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (nameField && nameField.value.trim()) || "";
      var subject = (subjectField && subjectField.value.trim()) || "";
      var message = (messageField && messageField.value.trim()) || "";

      markField(nameField, !name);
      markField(messageField, !message);
      if (!name || !message) {
        showError("Merci d'indiquer au moins votre nom et votre message.");
        (!name ? nameField : messageField).focus();
        return;
      }
      showError("");

      var lines = ["Bonjour Issiaka,", "", "Je suis " + name + "."];
      if (subject) lines.push("Sujet : " + subject);
      lines.push("", message);
      window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(lines.join("\n")), "_blank", "noopener");
    });
  }
})();
