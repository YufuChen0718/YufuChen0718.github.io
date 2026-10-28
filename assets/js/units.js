/* ============================================================
   units.js — project accordions, filters, deep links
   ============================================================ */
(function () {
  "use strict";

  var units = Array.prototype.slice.call(document.querySelectorAll(".unit"));
  var heads = Array.prototype.slice.call(document.querySelectorAll(".unit__head"));
  var countEls = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));
  var countTotals = Array.prototype.slice.call(document.querySelectorAll("[data-count-total]"));

  function setOpen(head, open) {
    var body = document.getElementById(head.getAttribute("aria-controls"));
    head.setAttribute("aria-expanded", open ? "true" : "false");
    if (body) body.dataset.open = open ? "true" : "false";
  }

  heads.forEach(function (head) {
    head.addEventListener("click", function () {
      setOpen(head, head.getAttribute("aria-expanded") !== "true");
    });
    head.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        var i = heads.indexOf(head);
        var next = heads[(i + (e.key === "ArrowDown" ? 1 : -1) + heads.length) % heads.length];
        next.focus();
      }
    });
  });

  /* filters */
  var chips = Array.prototype.slice.call(document.querySelectorAll("[data-filter]"));
  function applyFilter(f) {
    var shown = 0;
    units.forEach(function (u) {
      var tags = (u.dataset.tags || "").split(" ");
      var hit = f === "all" || tags.indexOf(f) > -1;
      u.hidden = !hit;
      if (hit) shown++;
      if (!hit) {
        var h = u.querySelector(".unit__head");
        if (h && h.getAttribute("aria-expanded") === "true") setOpen(h, false);
      }
    });
    countEls.forEach(function (el) { el.textContent = String(shown).padStart(2, "0"); });
    chips.forEach(function (c) { c.setAttribute("aria-pressed", c.dataset.filter === f ? "true" : "false"); });
  }
  chips.forEach(function (c) {
    c.addEventListener("click", function () { applyFilter(c.dataset.filter); });
  });
  countEls.forEach(function (el) { el.textContent = String(units.length).padStart(2, "0"); });
  countTotals.forEach(function (el) { el.textContent = String(units.length).padStart(2, "0"); });

  /* deep link: projects.html#aura */
  function openFromHash() {
    var id = location.hash.replace("#", "");
    if (!id) return;
    var u = document.getElementById(id);
    if (!u || !u.classList.contains("unit")) return;
    var head = u.querySelector(".unit__head");
    if (head) setOpen(head, true);
    setTimeout(function () {
      u.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      head.focus({ preventScroll: true });
    }, 60);
  }
  openFromHash();
  addEventListener("hashchange", openFromHash);
})();
