/**
 * salt-flat.js — GPU-friendly rewrite
 *
 * Instead of drawing ~20 000 individual arc() calls per frame,
 * this writes directly into an ImageData pixel buffer and
 * blits once with putImageData(). That is 50-100× faster.
 *
 * The canvas is now a fixed-position full-page background.
 */
(() => {
  const canvas = document.querySelector('#salt-flat-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  /* ── constants ───────────────────────────────────────────── */
  const TAU  = Math.PI * 2;
  const R3   = Math.sqrt(3);
  const S3   = R3 / 2;
  const COLS = 200;                       // logical grid width
  const FPS  = 15;
  const LOOP = 24;                        // seconds per full ray rotation

  const BAYER = [
    -0.47,  0.03, -0.345,  0.155,
     0.28, -0.22,  0.405, -0.095,
    -0.282, 0.218,-0.407,  0.093,
     0.468,-0.032, 0.343, -0.157,
  ];

  const NEUTRALS = [
    [8,8,10],[16,16,19],[28,28,31],[44,44,48],
    [64,64,68],[88,88,93],[116,116,121],[148,148,153],
    [184,184,189],[216,216,220],[240,240,244],[255,255,255],
  ];

  const SPECTRUM = [
    [80,227,194],[0,112,243],[121,41,202],
    [255,0,128],[255,77,77],[249,203,40],
  ];

  /* ── mutable layout ──────────────────────────────────────── */
  let W = COLS, H = 100;
  let cx, hz, hw, th, baseY, apexY, sunY, sc;
  let running = false, visible = true, raf = 0, prevT = 0;
  const t0 = performance.now();
  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── pixel buffer ────────────────────────────────────────── */
  let imgData, pix;

  /* ── helpers ─────────────────────────────────────────────── */
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const smoothstep = (a, b, v) => {
    const t = clamp01((v - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  function hash(x, y) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  /* ── spectrum interpolation ──────────────────────────────── */
  function specRGB(hue) {
    const p = ((hue % 1) + 1) % 1 * 6;
    const i = p | 0, f = p - i;
    const a = SPECTRUM[i], b = SPECTRUM[(i + 1) % 6];
    return [
      a[0] + (b[0] - a[0]) * f,
      a[1] + (b[1] - a[1]) * f,
      a[2] + (b[2] - a[2]) * f,
    ];
  }

  /* ── layout ──────────────────────────────────────────────── */
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;

    // Keep the logical grid small — the CSS scales the canvas up with
    // image-rendering: pixelated, which is effectively free.
    H  = Math.max(80, Math.round(COLS * rect.height / rect.width));
    W  = COLS;
    canvas.width  = W;
    canvas.height = H;
    imgData = ctx.createImageData(W, H);
    pix     = imgData.data;         // Uint8ClampedArray, 4 bytes/pixel

    sc   = Math.min(1.7, Math.min(W, H) / 100);
    cx   = W / 2;
    hz   = H * 0.57;
    hw   = 22 * sc;
    th   = hw * R3;
    baseY  = hz - 1.7 * sc;
    apexY  = baseY - th;
    sunY   = apexY + 3.2 * sc;
    return true;
  }

  /* ── triangle SDF + rim + fringe ─────────────────────────── */
  function triInfo(x, y, time, hOff) {
    const lS = -(x - (cx - hw)) * S3 - (y - baseY) * 0.5;
    const rS =  (x - (cx + hw)) * S3 - (y - baseY) * 0.5;
    const bS = y - baseY;
    const inside = Math.max(lS, rS, bS) <= 0;
    const eDist  = Math.min(Math.abs(lS), Math.abs(rS), Math.abs(bS));
    const hRatio = clamp01((baseY - y) / th);
    const eLight = Math.exp(-(eDist / (0.4 * sc)) ** 2) * (0.78 + hRatio * 0.22);

    const pulse  = ((time % 6) + 6) % 6 / 1.4;
    const climb  = clamp01(pulse);
    const gFade  = pulse < 1 ? 0.5 + pulse * 0.5 : pulse < 1.5 ? 1 - (pulse - 1) * 2 : 0;
    const gY     = baseY - th * climb * climb;
    const eX     = hw * (1 - (baseY - gY) / th);
    const gDist  = Math.min(
      (x - (cx - eX)) ** 2 + (y - gY) ** 2,
      (x - (cx + eX)) ** 2 + (y - gY) ** 2,
    );
    const glint  = Math.exp(-gDist / (0.58 * sc * sc)) * gFade;
    const flare  = pulse > 0.8 && pulse < 1.5
      ? Math.sin(((pulse - 0.8) / 0.7) * Math.PI)
      : 0;
    const tipF = flare * (
      Math.exp(-((y - apexY) ** 2) / (0.4 * sc * sc)) * Math.exp(-Math.abs(x - cx) / (16 * sc)) +
      Math.exp(-((x - cx) ** 2) / (0.4 * sc * sc)) * Math.exp(-Math.abs(y - apexY) / (12 * sc))
    );
    const fringe = Math.exp(-((eDist - 0.7 * sc) / (0.68 * sc)) ** 2) * (inside ? 0.38 : 0.58);
    const hue    = eDist * 0.18 + hRatio * 0.9 - time / 6 + (lS > rS ? 0 : 0.5) + hOff;
    return { inside, rim: eLight + glint * 1.25 + tipF, fringe, hue };
  }

  /* ── sky sample ──────────────────────────────────────────── */
  function skyAt(x, y, time, hOff) {
    const dx = x - cx, ds = y - sunY;
    const dist = Math.hypot(dx, ds);
    const up = hz - y;
    let lum = 0.012 + 0.024 * Math.exp(-Math.max(0, up) / (10 * sc));
    lum += 0.55 * Math.exp(-(up * up) / (0.62 * sc * sc));
    lum += 0.58 * Math.exp(-dist / (2.8 * sc)) + 0.16 * Math.exp(-dist / (8 * sc));

    const spin  = time * TAU / LOOP;
    const angle = Math.atan2(dx, -ds);
    let rA = 0.5 + 0.5 * Math.cos(14 * angle + spin + 1.4 * Math.sin(5 * angle - spin * 2));
    let rB = 0.5 + 0.5 * Math.cos(23 * angle - spin * 3 + 0.9 * Math.sin(3 * angle + spin));
    rA = rA ** 8;
    rB = rB ** 16;
    const rayFall = Math.exp(-dist / (50 * sc)) * smoothstep(2.35, 1.75, Math.abs(angle));
    lum += (rA * 0.48 + rB * 0.2) * rayFall * (0.92 + 0.08 * Math.sin(time * TAU / 12));

    if (up > 14 * sc && hash(x | 0, (y | 0) * 5 + 3) > 0.992) {
      lum = Math.max(lum, 0.25 + 0.2 * Math.sin(time * 2 + x * 0.7));
    }

    const tri = triInfo(x, y, time, hOff || 0);
    if (tri.inside) lum = 0.006;
    lum += tri.rim * (tri.inside ? 0.92 : 0.58);
    return { lum, fringe: tri.fringe, hue: tri.hue };
  }

  /* ── salt-crust cracks ───────────────────────────────────── */
  function cracks(x, depth) {
    if (depth <= 0) return 0;
    const dr   = clamp01(depth / (H - hz));
    const size = (2 + 7 * dr ** 1.22) * sc;
    const px   = x - cx, py = depth * 1.12;
    const q = (R3 / 3 * px - py / 3) / size;
    const r = (2 / 3 * py) / size;
    let qC = Math.round(q), rC = Math.round(r);
    const sC = Math.round(-q - r);
    const qE = Math.abs(qC - q), rE = Math.abs(rC - r), sE = Math.abs(sC + q + r);
    if (qE > rE && qE > sE) qC = -rC - sC;
    else if (rE > sE) rC = -qC - sC;
    const hx = size * R3 * (qC + rC / 2);
    const hy = size * 1.5 * rC;
    const lx = px - hx, ly = py - hy;
    const edge = Math.max(Math.abs(ly), S3 * Math.abs(lx) + 0.5 * Math.abs(ly));
    return Math.exp(-((size - edge) / (0.34 * sc)) ** 2);
  }

  /* ── render one frame into ImageData ─────────────────────── */
  function draw(time) {
    const wm    = time * TAU / LOOP;
    const breath = 0.92 + 0.08 * Math.sin(wm * 2);
    const data   = pix;

    for (let row = 0; row < H; row++) {
      const y     = row + 0.5;
      const ground = y >= hz;
      const depth  = ground ? y - hz : 0;
      const dr     = ground ? clamp01(depth / (H - hz)) : 0;
      const ripple = ground ? (0.055 + depth * 0.006) : 0;

      for (let col = 0; col < W; col++) {
        const x  = col + 0.5;
        let lum, fri, hue;

        if (ground) {
          const sx = x + ripple * (
            Math.sin(y * 0.8 - wm * 6 + Math.sin(x * 0.05) * 2) * 0.7 +
            Math.sin(x * 0.11 + y * 1.3 - wm * 4) * 0.35
          );
          const sy = 2 * hz - y + ripple * 0.4 * Math.sin(x * 0.07 - wm * 3 + y * 0.6);
          const ref = skyAt(sx, sy, time, 0.5);
          const rFall = 0.8 - 0.5 * smoothstep(0, 1, dr);
          const ck  = cracks(x, depth);
          const sL  = 0.018 + dr * 0.068 + ck * 0.16;
          lum  = ref.lum * rFall * (1 - 0.72 * ck) + sL;
          fri  = ref.fringe * rFall * 0.62;
          hue  = ref.hue;
        } else {
          const s = skyAt(x, y, time);
          lum = s.lum; fri = s.fringe; hue = s.hue;
        }

        // horizon glint
        lum = clamp01((lum + Math.exp(-((y - hz) / (0.52 * sc)) ** 2) * 0.92) * breath);

        // ordered dither
        const cov = clamp01(lum + BAYER[(row & 3) * 4 + (col & 3)] * 0.2);

        const idx = (row * W + col) * 4;
        if (cov < 0.035) {
          data[idx] = 5; data[idx + 1] = 5; data[idx + 2] = 6; data[idx + 3] = 255;
          continue;
        }

        // neutral shade
        const ni = Math.min(NEUTRALS.length - 1, (cov * NEUTRALS.length) | 0);
        const ng = NEUTRALS[ni];

        // fringe tint
        const amt = clamp01(fri * 0.72);
        if (amt > 0.01) {
          const sp = specRGB(hue);
          data[idx]     = ng[0] + (sp[0] - ng[0]) * amt + 0.5 | 0;
          data[idx + 1] = ng[1] + (sp[1] - ng[1]) * amt + 0.5 | 0;
          data[idx + 2] = ng[2] + (sp[2] - ng[2]) * amt + 0.5 | 0;
        } else {
          data[idx]     = ng[0];
          data[idx + 1] = ng[1];
          data[idx + 2] = ng[2];
        }
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  /* ── animation loop ──────────────────────────────────────── */
  function frame(now) {
    if (!running) return;
    if (!prevT || now - prevT >= 1000 / FPS) {
      draw((now - t0) / 1000);
      prevT = now;
    }
    raf = requestAnimationFrame(frame);
  }

  function start() { if (noMotion || running || !visible) return; running = true; raf = requestAnimationFrame(frame); }
  function stop()  { running = false; cancelAnimationFrame(raf); }

  /* ── boot ────────────────────────────────────────────────── */
  if (!resize()) return;
  if (noMotion) { draw(0); return; }

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => { if (resize() && !running) draw((performance.now() - t0) / 1000); }).observe(canvas);
  } else {
    window.addEventListener('resize', () => { if (resize() && !running) draw((performance.now() - t0) / 1000); }, { passive: true });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible && document.visibilityState !== 'hidden') start(); else stop();
    }).observe(canvas);
  } else {
    start();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stop(); else start();
  });
})();
