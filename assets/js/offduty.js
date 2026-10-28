/* ============================================================
   offduty.js — the string rig
   six strings, standard tuning, real frequencies
   ============================================================ */
(function () {
  "use strict";

  var rig = document.querySelector("[data-rig]");
  if (!rig) return;

  var strings = Array.prototype.slice.call(rig.querySelectorAll(".rig__string"));
  var readNote = document.querySelector("[data-note]");
  var readFreq = document.querySelector("[data-freq]");
  var actx = null, master = null;

  function audio() {
    if (actx) { if (actx.state === "suspended") actx.resume(); return actx; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    actx = new AC();
    master = actx.createGain();
    master.gain.value = 0.24;
    var comp = actx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    master.connect(comp).connect(actx.destination);
    return actx;
  }

  function pluck(freq, idx, vel) {
    var ac = audio();
    if (!ac) return;
    var t = ac.currentTime;
    var g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.9 * (vel || 1), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 1.5);

    var lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(2200 + idx * 180, t);
    lp.frequency.exponentialRampToValueAtTime(700, t + 0.9);
    lp.Q.value = 0.9;

    var o1 = ac.createOscillator();
    o1.type = "sawtooth";
    o1.frequency.value = freq;
    var o2 = ac.createOscillator();
    o2.type = "triangle";
    o2.frequency.value = freq * 2.01;
    var g2 = ac.createGain();
    g2.gain.value = 0.16;

    o1.connect(lp);
    o2.connect(g2).connect(lp);
    lp.connect(g).connect(master);
    o1.start(t); o2.start(t);
    o1.stop(t + 1.6); o2.stop(t + 1.6);
  }

  var meter = document.querySelector("[data-meter]");
  var bars = meter ? Array.prototype.slice.call(meter.querySelectorAll("i")) : [];
  var level = 0, mraf = 0;
  var idle = [8, 16, 11, 22, 14, 19, 9, 26, 12, 17, 10, 21, 13, 24, 9, 15];
  bars.forEach(function (b, i) { b.style.height = (idle[i % idle.length] || 12) + "%"; });

  function meterLoop() {
    mraf = 0;
    level *= 0.86;
    bars.forEach(function (b, i) {
      var v = 3 + Math.random() * level * 96 + (i > 11 ? 4 : 0);
      b.style.height = Math.min(100, v) + "%";
      b.style.opacity = String(0.35 + level * 0.65);
    });
    if (level > 0.03) mraf = requestAnimationFrame(meterLoop);
    else bars.forEach(function (b) { b.style.height = "4%"; b.style.opacity = ".4"; });
  }

  function pump() {
    level = Math.min(1, level + 0.9);
    if (!mraf) mraf = requestAnimationFrame(meterLoop);
  }

  function hit(el) {
    var freq = parseFloat(el.dataset.freq);
    var note = el.dataset.note;
    var idx = Number(el.dataset.i || 0);
    el.classList.remove("is-hit");
    void el.offsetWidth;
    el.classList.add("is-hit");
    setTimeout(function () { el.classList.remove("is-hit"); }, 520);
    pluck(freq, idx, 1);
    pump();
    if (readNote) readNote.textContent = note;
    if (readFreq) readFreq.textContent = freq.toFixed(2) + " Hz";
  }

  strings.forEach(function (el, i) {
    el.dataset.i = i;
    el.addEventListener("pointerdown", function (e) { e.preventDefault(); hit(el); });
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); hit(el); }
    });
  });

  var strum = document.querySelector("[data-strum]");
  if (strum) {
    strum.addEventListener("click", function () {
      audio();
      strings.forEach(function (el, i) { setTimeout(function () { hit(el); }, i * 52); });
    });
  }

  var hovering = false;
  rig.addEventListener("pointerenter", function () { hovering = true; });
  rig.addEventListener("pointerleave", function () { hovering = false; });
  document.addEventListener("keydown", function (e) {
    if (!hovering) return;
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= 6 && strings[n - 1]) { e.preventDefault(); hit(strings[n - 1]); }
  });
})();
