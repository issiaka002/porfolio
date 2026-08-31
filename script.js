/* =========================================================================
   Issiaka SIDIBE — Portfolio · interactions
   ========================================================================= */
(function () {
  "use strict";

  var WHATSAPP_NUMBER = "2250585024748";
  var REVEAL_FALLBACK_MS = 1500;

  var reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Année du footer ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Menu mobile ---------- */
  var burger = document.getElementById("burger");
  var menu = document.getElementById("menu");

  function setMenu(open) {
    if (!menu || !burger) return;
    menu.classList.toggle("is-open", open);
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
  }

  if (burger && menu) {
    burger.addEventListener("click", function () {
      setMenu(!menu.classList.contains("is-open"));
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
  }

  /* ---------- Hauteur réelle de la barre de navigation ---------- */
  var nav = document.getElementById("nav");

  function syncNavHeight() {
    if (!nav) return;
    var h = Math.round(nav.getBoundingClientRect().height);
    if (h > 0) document.documentElement.style.setProperty("--nav-h", h + "px");
  }

  syncNavHeight();
  window.addEventListener("resize", syncNavHeight);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncNavHeight);

  /* ---------- Nav collée + barre de progression ---------- */
  var progressBar = document.querySelector("#progress i");
  var ticking = false;

  function onScroll() {
    if (nav) nav.classList.toggle("is-stuck", window.scrollY > 16);

    if (progressBar) {
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - window.innerHeight;
      var ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
      progressBar.style.transform = "scaleX(" + Math.min(1, Math.max(0, ratio)) + ")";
    }
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(onScroll);
    },
    { passive: true }
  );
  onScroll();

  /* ---------- Lien de nav actif ---------- */
  var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));
  var linkById = {};

  Array.prototype.forEach.call(document.querySelectorAll(".menu-link"), function (link) {
    var id = (link.getAttribute("href") || "").slice(1);
    if (id) linkById[id] = link;
  });

  if ("IntersectionObserver" in window && sections.length) {
    var navObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var current = entry.target.id;
          Object.keys(linkById).forEach(function (id) {
            linkById[id].classList.toggle("is-active", id === current);
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach(function (section) {
      navObserver.observe(section);
    });
  }

  /* ---------- Révélation au scroll ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  // Index local par groupe, pour un décalage en cascade
  [".works", ".bento", ".labs"].forEach(function (selector) {
    var group = document.querySelector(selector);
    if (!group) return;
    Array.prototype.forEach.call(group.querySelectorAll(".reveal"), function (el, i) {
      el.style.setProperty("--i", String(i));
    });
  });

  function revealAll() {
    revealEls.forEach(function (el) {
      el.classList.add("is-in");
    });
  }

  if (reduced || !("IntersectionObserver" in window)) {
    revealAll();
  } else {
    var revObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach(function (el) {
      revObserver.observe(el);
    });
    // Filet de sécurité : rien ne doit rester invisible
    window.setTimeout(revealAll, REVEAL_FALLBACK_MS);
  }

  /* ---------- Bandeau technos : duplication pour une boucle continue ---------- */
  var track = document.getElementById("tickerTrack");
  if (track && !reduced) {
    var original = Array.prototype.slice.call(track.children);
    original.forEach(function (node) {
      track.appendChild(node.cloneNode(true));
    });
  }

  /* ---------- Formulaire → WhatsApp ---------- */
  var form = document.getElementById("waForm");

  if (form) {
    var nameEl = document.getElementById("waName");
    var subjectEl = document.getElementById("waSubject");
    var messageEl = document.getElementById("waMessage");
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

    [nameEl, messageEl].forEach(function (el) {
      if (!el) return;
      el.addEventListener("input", function () {
        if (el.value.trim()) {
          markField(el, false);
          showError("");
        }
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = (nameEl && nameEl.value.trim()) || "";
      var subject = (subjectEl && subjectEl.value.trim()) || "";
      var message = (messageEl && messageEl.value.trim()) || "";

      markField(nameEl, !name);
      markField(messageEl, !message);

      if (!name || !message) {
        showError("Merci d'indiquer au moins votre nom et votre message.");
        (!name ? nameEl : messageEl).focus();
        return;
      }

      showError("");

      var lines = ["Bonjour Issiaka,", "", "Je suis " + name + "."];
      if (subject) lines.push("Sujet : " + subject);
      lines.push("", message);

      var url =
        "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));

      window.open(url, "_blank", "noopener");
    });
  }
})();
