/* ============================================================
   sky.js — the external view
   One renderer, three surfaces: hero cockpit window,
   photography viewfinder, and the reference plate.
   ============================================================ */
(function (global) {
  "use strict";

  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function hash(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  var STARS = [];
  for (var i = 0; i < 190; i++) {
    STARS.push({
      x: hash(i * 3.13 + 0.5),
      y: hash(i * 7.71 + 1.3),
      r: 0.35 + hash(i * 1.77 + 2.1) * 1.25,
      p: hash(i * 5.31 + 3.7) * Math.PI * 2,
      b: 0.3 + hash(i * 2.93 + 4.4) * 0.7
    });
  }

  function draw(ctx, w, h, o) {
    o = o || {};
    var t = o.t || 0;
    var horizon = (o.horizon == null ? 0.7 : o.horizon) * h;
    var parallax = o.parallax || { x: 0, y: 0 };
    var trail = o.trail || 0;

    ctx.clearRect(0, 0, w, h);

    /* --- sky field ------------------------------------------- */
    var sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#060813");
    sky.addColorStop(0.24, "#0C1229");
    sky.addColorStop(0.46, "#241B4C");
    sky.addColorStop(0.64, "#58245F");
    sky.addColorStop(0.78, "#9A3A57");
    sky.addColorStop(0.89, "#D2645A");
    sky.addColorStop(0.96, "#F09757");
    sky.addColorStop(1, "#FFC178");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon);

    /* --- stars ----------------------------------------------- */
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < STARS.length; i++) {
      var s = STARS[i];
      var sy = s.y * horizon * 0.82;
      if (s.y > 0.82) continue;
      var sx = s.x * w + parallax.x * 18 * (1 - s.y);
      var tw = 0.55 + 0.45 * Math.sin(t * 0.0011 + s.p);
      var alpha = s.b * tw * (1 - s.y * 0.55);
      ctx.fillStyle = "rgba(233,238,255," + alpha.toFixed(3) + ")";
      if (trail > 0.02) {
        var len = trail * 34 * (1 - s.y * 0.4) + s.r;
        ctx.strokeStyle = "rgba(214,224,255," + (alpha * 0.55).toFixed(3) + ")";
        ctx.lineWidth = s.r * 0.85;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + len * 0.45, sy - len * 0.1, sx + len, sy - len * 0.28);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, 6.2832);
        ctx.fill();
      }
    }
    ctx.restore();

    /* --- cloud banks ----------------------------------------- */
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (var c = 0; c < 3; c++) {
      var cy2 = horizon * (0.62 + c * 0.1);
      var cw = w * (0.6 + c * 0.16);
      var cg = ctx.createRadialGradient(w * (0.3 + c * 0.2), cy2, 0, w * (0.3 + c * 0.2), cy2, cw * 0.5);
      cg.addColorStop(0, "rgba(" + (c === 1 ? "255,150,170" : "255,178,150") + "," + (0.1 - c * 0.02) + ")");
      cg.addColorStop(1, "rgba(255,150,150,0)");
      ctx.save();
      ctx.translate(w * (0.3 + c * 0.2), cy2);
      ctx.scale(1, 0.075);
      ctx.translate(-w * (0.3 + c * 0.2), -cy2);
      ctx.fillStyle = cg;
      ctx.fillRect(0, cy2 - cw * 0.5, w, cw);
      ctx.restore();
    }
    ctx.restore();

    /* --- comet ----------------------------------------------- */
    var cx = w * (0.62 + 0.03 * Math.sin(t * 0.00013)) + parallax.x * 26;
    var cy = horizon * (0.2 + 0.02 * Math.cos(t * 0.00017)) + parallax.y * 14;
    var ang = -0.46;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    // ribbon tails
    for (var k = 0; k < 2; k++) {
      var spread = k === 0 ? -0.1 : 0.12;
      var len = w * (0.34 + k * 0.06);
      var grad = ctx.createLinearGradient(cx, cy, cx - len * 0.92, cy - len * Math.sin(ang) * -1);
      grad.addColorStop(0, "rgba(255,235,214,0.55)");
      grad.addColorStop(0.25, "rgba(255,170,160,0.22)");
      grad.addColorStop(1, "rgba(160,120,255,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = (k === 0 ? 3.2 : 1.4) * (w > 700 ? 1.5 : 1);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(
        cx - len * 0.45,
        cy - len * 0.34 + spread * 40,
        cx - len * 0.92,
        cy - len * 0.52 + spread * 90
      );
      ctx.stroke();
    }
    // head
    var head = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16);
    head.addColorStop(0, "rgba(255,255,250,1)");
    head.addColorStop(0.3, "rgba(255,229,203,0.85)");
    head.addColorStop(1, "rgba(255,180,140,0)");
    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, 6.2832);
    ctx.fill();
    ctx.restore();

    /* --- horizon glow + ground -------------------------------- */
    var glow = ctx.createRadialGradient(w * 0.5, horizon, 0, w * 0.5, horizon, w * 0.75);
    glow.addColorStop(0, "rgba(255,196,140," + (o.glow == null ? 0.4 : o.glow) + ")");
    glow.addColorStop(0.5, "rgba(255,140,110,0.1)");
    glow.addColorStop(1, "rgba(255,120,90,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, horizon - h * 0.32, w, h * 0.32);

    var ground = ctx.createLinearGradient(0, horizon, 0, h);
    ground.addColorStop(0, "#1A0F1C");
    ground.addColorStop(0.35, "#0A0A16");
    ground.addColorStop(1, "#04060C");
    ctx.fillStyle = ground;
    ctx.fillRect(0, horizon, w, h - horizon);

    // water / reflection: a soft band, no hard geometry
    var reflGrad = ctx.createLinearGradient(0, horizon, 0, h);
    reflGrad.addColorStop(0, "rgba(255,166,124,0.16)");
    reflGrad.addColorStop(0.35, "rgba(214,120,150,0.05)");
    reflGrad.addColorStop(1, "rgba(120,90,180,0)");
    ctx.fillStyle = reflGrad;
    ctx.fillRect(0, horizon, w, h - horizon);

    // three still lines on the water
    for (var wl = 1; wl <= 3; wl++) {
      var wy = horizon + (h - horizon) * (0.18 + wl * 0.22);
      ctx.strokeStyle = "rgba(255,186,148," + (0.16 / wl) + ")";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w * 0.18, wy);
      ctx.lineTo(w * 0.82, wy);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255,206,160,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, horizon + 0.5);
    ctx.lineTo(w, horizon + 0.5);
    ctx.stroke();

    /* --- exposure -------------------------------------------- */
    var exp = o.exposure == null ? 1 : o.exposure;
    if (exp > 1.01) {
      ctx.fillStyle = "rgba(255,236,210," + Math.min(0.55, (exp - 1) * 0.4) + ")";
      ctx.fillRect(0, 0, w, h);
    } else if (exp < 0.99) {
      ctx.fillStyle = "rgba(3,4,10," + Math.min(0.72, (1 - exp) * 0.62) + ")";
      ctx.fillRect(0, 0, w, h);
    }
  }

  function mount(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext("2d", { alpha: false });
    var dpr = Math.min(2, global.devicePixelRatio || 1);
    var w = 0, h = 0, raf = 0, last = 0;
    var state = { exposure: 1, trail: 0, horizon: opts.horizon, glow: opts.glow };
    var pointer = { x: 0, y: 0 };

    function size() {
      var r = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function frame(t) {
      draw(ctx, w, h, {
        t: t,
        exposure: state.exposure,
        trail: state.trail,
        horizon: state.horizon,
        glow: state.glow,
        parallax: pointer
      });
    }

    function loop(t) {
      raf = requestAnimationFrame(loop);
      if (opts.still) return;
      if (t - last < 32) return;
      last = t;
      frame(t);
    }

    function start() {
      if (reduced || opts.still) { frame(1400); return; }
      size();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    }

    size();
    if (opts.parallax) {
      canvas.closest("[data-parallax]")?.addEventListener("pointermove", function (e) {
        var r = canvas.getBoundingClientRect();
        pointer.x = (e.clientX - r.left) / r.width - 0.5;
        pointer.y = (e.clientY - r.top) / r.height - 0.5;
      });
      canvas.closest("[data-parallax]")?.addEventListener("pointerleave", function () {
        pointer.x = 0; pointer.y = 0;
      });
    }
    new ResizeObserver(function () { size(); if (reduced || opts.still) frame(1400); }).observe(canvas);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (!reduced && !opts.still) { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
    });
    start();

    return {
      canvas: canvas,
      set: function (s) { Object.assign(state, s); if (reduced || opts.still) frame(1400); },
      snapshot: function (target, scale) {
        var s = scale || 1;
        target.width = Math.round(w * s);
        target.height = Math.round(h * s);
        var c = target.getContext("2d");
        c.setTransform(s, 0, 0, s, 0, 0);
        draw(c, w, h, { t: 2600, exposure: state.exposure, trail: state.trail, horizon: state.horizon, glow: state.glow, parallax: { x: 0, y: 0 } });
      }
    };
  }

  global.SKY = { draw: draw, mount: mount, reduced: reduced };
})(window);
