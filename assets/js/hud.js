/* ============================================================
   hud.js — the cockpit around the content
   boot · clock · telemetry · reticle · palette · transitions
   ============================================================ */
(function () {
  "use strict";

  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = matchMedia("(pointer: fine)").matches;

  /* ---------- boot ------------------------------------------ */
  var boot = document.querySelector("[data-boot]");
  var seen = false;
  try { seen = sessionStorage.getItem("yc.boot") === "1"; } catch (e) { }
  if (boot && (seen || reduced)) boot.remove();
  if (boot) {
    try { sessionStorage.setItem("yc.boot", "1"); } catch (e) { }
    var kill = function () { boot.remove(); };
    setTimeout(kill, 2100);
    boot.addEventListener("pointerdown", kill);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") kill(); }, { once: true });
  }

  /* ---------- clock ----------------------------------------- */
  var clock = document.querySelector("[data-clock]");
  if (clock) {
    var fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    });
    var tick = function () {
      clock.textContent = fmt.format(new Date()) + " PST";
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- scroll telemetry ------------------------------ */
  var root = document.documentElement;
  var pct = document.querySelector("[data-pct]");
  var ptr = document.querySelector("[data-ptr]");
  var pEls = [document.querySelector("[data-progress]"), document.querySelector("[data-tel]")];
  var raf = 0;
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      var max = root.scrollHeight - innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      pEls.forEach(function (el) { if (el) el.style.setProperty("--p", p.toFixed(4)); });
      if (pct) pct.textContent = String(Math.round(p * 100)).padStart(3, "0") + "%";
    });
  }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();

  if (ptr && fine) {
    addEventListener("pointermove", function (e) {
      ptr.textContent = "X " + String(Math.round(e.clientX)).padStart(4, "0") + " Y " + String(Math.round(e.clientY)).padStart(4, "0");
    }, { passive: true });
  }

  /* ---------- reveal ---------------------------------------- */
  var items = document.querySelectorAll(".reveal");
  if (items.length && !reduced && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("is-in");
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.06 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- lock-on reticle ------------------------------- */
  if (fine && !reduced) {
    var ret = document.createElement("div");
    ret.className = "reticle";
    ret.setAttribute("aria-hidden", "true");
    ret.innerHTML = '<span class="c tl"></span><span class="c tr"></span><span class="c bl"></span><span class="c br"></span><span class="d"></span><span class="ring"></span>';
    document.body.appendChild(ret);
    root.classList.add("has-reticle");

    var tx = innerWidth / 2, ty = innerHeight / 2, x = tx, y = ty, on = false;
    addEventListener("pointermove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!on) { on = true; x = tx; y = ty; ret.dataset.on = "true"; }
      var el = e.target.closest && e.target.closest("a, button, .ref, .rig__string, input[type=range], [data-lock]");
      ret.dataset.locked = el ? "true" : "false";
    }, { passive: true });
    addEventListener("pointerdown", function () {
      ret.style.transition = "width .12s, height .12s";
      ret.style.transform = "scale(.82)";
      setTimeout(function () { ret.style.transform = ""; }, 120);
    }, { passive: true });
    document.addEventListener("pointerleave", function () { ret.dataset.on = "false"; on = false; });
    (function loop() {
      x += (tx - x) * 0.28;
      y += (ty - y) * 0.28;
      ret.style.left = x.toFixed(1) + "px";
      ret.style.top = y.toFixed(1) + "px";
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- copy ------------------------------------------ */
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var done = function () {
        var old = btn.querySelector("[data-copy-label]") || btn;
        var prev = old.textContent;
        old.textContent = "COPIED";
        btn.dataset.copied = "true";
        setTimeout(function () { old.textContent = prev; btn.dataset.copied = "false"; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(fallback);
      } else fallback();
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) { }
        ta.remove();
      }
    });
  });

  /* ---------- page transitions ------------------------------ */
  var veil = document.createElement("div");
  veil.className = "veil";
  veil.setAttribute("aria-hidden", "true");
  document.body.appendChild(veil);
  var leave = function (href) {
    if (reduced) { location.href = href; return; }
    veil.dataset.on = "true";
    setTimeout(function () { location.href = href; }, 190);
  };
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (a.target && a.target !== "_self") return;
    if (a.hasAttribute("download") || a.hasAttribute("data-no-veil")) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.hash && url.pathname === location.pathname) return;
    if (url.href === location.href) return;
    e.preventDefault();
    leave(url.href);
  });
  addEventListener("pageshow", function () { veil.dataset.on = "false"; });

  /* ---------- command palette ------------------------------- */
  var COMMANDS = [
    { label: "Home", k: "page", href: "index.html" },
    { label: "Projects — all six", k: "page", href: "projects.html" },
    { label: "Hobbies — photography, activities, guitar", k: "page", href: "hobbies.html" },
    { label: "Resume — full record", k: "page", href: "resume.html" },
    { label: "Aura — visionOS accessibility", k: "project 01", href: "projects.html#aura" },
    { label: "AI Glasses for Blind People — wearable vision prototype", k: "project 05", href: "projects.html#glasses" },
    { label: "AIGF — customizable AI companion", k: "project 03", href: "projects.html#aigf" },
    { label: "ModCraft — AI Minecraft mod generation", k: "project 04", href: "projects.html#modcraft" },
    { label: "Reliable Memory System — AI glasses memory", k: "project 02", href: "projects.html#memory" },
    { label: "sEMG Gesture Interface — hands-free control", k: "project 06", href: "projects.html#semg" },
    { label: "Copy email address", k: "action", act: "copy" },
    { label: "Download resume (PDF)", k: "action", href: "assets/Yufu%20Chen%20-%20CV.pdf", dl: "Yufu Chen - CV.pdf" }
  ];

  var pal = null, palInput = null, palList = null, palIdx = 0, palShown = [];

  function buildPalette() {
    pal = document.createElement("div");
    pal.className = "palette";
    pal.setAttribute("role", "dialog");
    pal.setAttribute("aria-modal", "true");
    pal.setAttribute("aria-label", "Command palette");
    pal.innerHTML =
      '<div class="palette__box">' +
      '<input class="palette__input" type="text" placeholder="Type a page, a unit, or an action…" aria-label="Search commands" autocomplete="off" spellcheck="false">' +
      '<div class="palette__list" role="listbox" aria-label="Results"></div>' +
      '<div class="palette__foot"><span><kbd>↑↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span><span style="margin-left:auto">⌘K</span></div>' +
      "</div>";
    document.body.appendChild(pal);
    palInput = pal.querySelector(".palette__input");
    palList = pal.querySelector(".palette__list");

    palInput.addEventListener("input", function () { palIdx = 0; renderPalette(); });
    palInput.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || (e.key === "n" && e.ctrlKey)) {
        e.preventDefault(); palIdx = Math.min(palShown.length - 1, palIdx + 1); paintPalette();
      } else if (e.key === "ArrowUp" || (e.key === "p" && e.ctrlKey)) {
        e.preventDefault(); palIdx = Math.max(0, palIdx - 1); paintPalette();
      } else if (e.key === "Enter") {
        e.preventDefault(); runPalette(palShown[palIdx]);
      } else if (e.key === "Escape") {
        e.preventDefault(); closePalette();
      }
    });
    palList.addEventListener("click", function (e) {
      var item = e.target.closest(".palette__item");
      if (!item) return;
      runPalette(palShown[Number(item.dataset.i)]);
    });
    pal.addEventListener("click", function (e) { if (e.target === pal) closePalette(); });
  }

  function renderPalette() {
    var q = (palInput.value || "").trim().toLowerCase();
    palShown = COMMANDS.filter(function (c) {
      return !q || c.label.toLowerCase().indexOf(q) > -1 || c.k.indexOf(q) > -1;
    });
    palList.innerHTML = palShown.map(function (c, i) {
      return '<button class="palette__item" role="option" data-i="' + i + '" aria-selected="' + (i === palIdx) + '">' +
        "<span>" + c.label + "</span><span class=\"k\">" + c.k + "</span></button>";
    }).join("") || '<div style="padding:16px;color:#6B7288;font-family:var(--font-mono);font-size:12px">NO MATCH — try “unit”, “resume”, “email”.</div>';
    paintPalette();
  }

  function paintPalette() {
    Array.prototype.forEach.call(palList.querySelectorAll(".palette__item"), function (el, i) {
      el.setAttribute("aria-selected", i === palIdx ? "true" : "false");
      if (i === palIdx && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
    });
  }

  function runPalette(c) {
    if (!c) return;
    closePalette();
    if (c.act === "copy") {
      var btn = document.querySelector("[data-copy]");
      if (navigator.clipboard) navigator.clipboard.writeText("jerry_yfchen@berkeley.edu");
      if (btn) { btn.dataset.copied = "true"; setTimeout(function () { btn.dataset.copied = "false"; }, 1600); }
      return;
    }
    if (c.dl) { var a = document.createElement("a"); a.href = c.href; a.download = typeof c.dl === "string" ? c.dl : ""; a.click(); return; }
    leave(c.href);
  }

  function openPalette() {
    if (!pal) buildPalette();
    pal.dataset.open = "true";
    palInput.value = "";
    palIdx = 0;
    renderPalette();
    palInput.focus();
    document.body.style.overflow = "hidden";
  }
  function closePalette() {
    if (!pal) return;
    pal.dataset.open = "false";
    document.body.style.overflow = "";
  }

  document.addEventListener("keydown", function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      pal && pal.dataset.open === "true" ? closePalette() : openPalette();
    } else if (e.key === "/" && !typing) {
      e.preventDefault(); openPalette();
    }
  });

  document.querySelectorAll("[data-palette-open]").forEach(function (b) {
    b.addEventListener("click", openPalette);
  });

  /* ---------- print ----------------------------------------- */
  document.querySelectorAll("[data-print]").forEach(function (b) {
    b.addEventListener("click", function () { window.print(); });
  });

  /* ---------- current year ---------------------------------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
