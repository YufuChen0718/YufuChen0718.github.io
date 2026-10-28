/* ============================================================
   gallery.js — horizontal frame strips + one viewer
   drag or arrow through a strip · click a frame to open it
   ============================================================ */
(function () {
  "use strict";

  var lastDrag = 0;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- strips ---------- */
  document.querySelectorAll("[data-strip]").forEach(function (strip) {
    var track = strip.querySelector("[data-strip-track]");
    if (!track) return;
    var prev = strip.querySelector("[data-strip-prev]");
    var next = strip.querySelector("[data-strip-next]");
    var thumb = strip.querySelector("[data-strip-thumb]");
    var idx = strip.querySelector("[data-strip-index]");
    var frames = Array.prototype.slice.call(track.querySelectorAll(".frame"));

    function maxScroll() { return track.scrollWidth - track.clientWidth; }

    function visibleRange() {
      var box = track.getBoundingClientRect();
      var first = -1, last = -1;
      frames.forEach(function (f, i) {
        var r = f.getBoundingClientRect();
        if (r.right > box.left + 6 && r.left < box.right - 6) {
          if (first < 0) first = i;
          last = i;
        }
      });
      if (first < 0) first = 0;
      if (last < 0) last = 0;
      return [first, last];
    }

    function update() {
      var m = maxScroll();
      var p = m > 0 ? track.scrollLeft / m : 0;
      if (thumb) {
        var w = Math.max(8, Math.min(100, (track.clientWidth / track.scrollWidth) * 100));
        thumb.style.width = w + "%";
        thumb.style.left = (p * (100 - w)) + "%";
      }
      if (prev) prev.disabled = track.scrollLeft < 4;
      if (next) next.disabled = track.scrollLeft > m - 4;
      if (idx) {
        var r = visibleRange();
        var a = String(r[0] + 1).padStart(2, "0");
        var b = String(r[1] + 1).padStart(2, "0");
        idx.textContent = (r[0] === r[1] ? a : a + "–" + b) + " / " + String(frames.length).padStart(2, "0");
      }
    }

    function step(dir) {
      var amount = dir * Math.round(track.clientWidth * 0.82);
      if (reduced) {
        var b = track.style.scrollBehavior;
        track.style.scrollBehavior = "auto";
        track.scrollLeft += amount;
        track.style.scrollBehavior = b;
      } else {
        track.scrollTo({ left: track.scrollLeft + amount, behavior: "smooth" });
      }
      setTimeout(update, reduced ? 0 : 420);
    }

    if (prev) prev.addEventListener("click", function () { step(-1); });
    if (next) next.addEventListener("click", function () { step(1); });
    track.addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);

    /* pointer drag (mouse / pen only; touch scrolls natively) */
    var active = false, startX = 0, startL = 0, moved = 0, pid = null;

    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch") return;
      active = true; moved = 0; startX = e.clientX; startL = track.scrollLeft; pid = e.pointerId;
      track.classList.add("is-dragging");
    });
    addEventListener("pointermove", function (e) {
      if (!active) return;
      var dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      if (moved > 3) track.scrollLeft = startL - dx;
    });
    function endDrag() {
      if (!active) return;
      active = false;
      track.classList.remove("is-dragging");
      if (moved > 6) lastDrag = Date.now();
    }
    addEventListener("pointerup", endDrag);
    addEventListener("pointercancel", endDrag);
    document.addEventListener("pointerup", endDrag);

    /* wheel: shift vertical wheel into horizontal travel when hovering a strip */
    track.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      if (track.scrollWidth <= track.clientWidth) return;
      var atStart = track.scrollLeft <= 0 && e.deltaY < 0;
      var atEnd = track.scrollLeft >= maxScroll() - 1 && e.deltaY > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      track.scrollLeft += e.deltaY;
    }, { passive: false });

    update();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
  });

  /* ---------- viewer ---------- */
  var lb = document.querySelector("[data-lb]");
  if (!lb) return;

  var img = lb.querySelector("[data-lb-img]");
  var capEl = lb.querySelector("[data-lb-cap]");
  var countEl = lb.querySelector("[data-lb-count]");
  var titleEl = lb.querySelector("[data-lb-title]");
  var closeBtn = lb.querySelector("[data-lb-close]");
  var prevBtn = lb.querySelector("[data-lb-prev]");
  var nextBtn = lb.querySelector("[data-lb-next]");

  var items = [], idx = 0, lastFocus = null, prefetch = {};

  function preload(i) {
    var it = items[(i + items.length) % items.length];
    if (!it || prefetch[it.full]) return;
    prefetch[it.full] = true;
    var im = new Image();
    im.src = it.full;
  }

  function show(i) {
    idx = (i + items.length) % items.length;
    var it = items[idx];
    img.style.opacity = "0";
    img.src = it.full;
    img.alt = it.alt;
    if (capEl) capEl.textContent = it.cap || "";
    if (countEl) countEl.textContent = String(idx + 1).padStart(2, "0") + " / " + String(items.length).padStart(2, "0");
    preload(idx + 1);
    preload(idx - 1);
  }

  img.addEventListener("load", function () { img.style.opacity = "1"; });

  function open(group, list, startIndex) {
    items = list;
    lastFocus = document.activeElement;
    if (titleEl) titleEl.textContent = group;
    lb.dataset.open = "true";
    document.body.style.overflow = "hidden";
    show(startIndex);
    closeBtn.focus();
  }

  function close() {
    lb.dataset.open = "false";
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.querySelectorAll("[data-strip]").forEach(function (strip) {
    var group = strip.dataset.group || "Photography";
    var btns = Array.prototype.slice.call(strip.querySelectorAll("[data-full]"));
    var list = btns.map(function (b) {
      var im = b.querySelector("img");
      return { full: b.dataset.full, cap: b.dataset.cap, alt: im ? im.alt : "" };
    });
    btns.forEach(function (b, i) {
      b.addEventListener("click", function () {
        if (Date.now() - lastDrag < 220) return;
        open(group, list, i);
      });
    });
  });

  closeBtn.addEventListener("click", close);
  prevBtn.addEventListener("click", function () { show(idx - 1); });
  nextBtn.addEventListener("click", function () { show(idx + 1); });

  lb.addEventListener("click", function (e) {
    if (e.target === lb || e.target.classList.contains("lb__stage")) close();
  });

  document.addEventListener("keydown", function (e) {
    if (lb.dataset.open !== "true") return;
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); show(idx + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); show(idx - 1); }
    else if (e.key === "Tab") {
      var f = Array.prototype.slice.call(lb.querySelectorAll("button"));
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  var x0 = null;
  lb.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 48) show(idx + (dx < 0 ? 1 : -1));
    x0 = null;
  }, { passive: true });
})();
