/**
 * torus-knot.js — Trefoil knot ASCII art on canvas.
 * Performance-tuned: low-geometry on mobile, capped FPS, no flood-fill on mobile.
 */
(() => {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const TAU = Math.PI * 2;
  const RAMP = '.:-=+*#%@';
  const NR = RAMP.length - 1;
  const TUBE = 0.28;
  const D_EYE = 11;
  const ASPECT = 0.52;
  const GAP = TUBE * 0.9;

  const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768;

  // Key perf knob: much fewer geometry points on mobile
  const NU = isMobileDevice ? 240 : 480;
  const NV = isMobileDevice ? 18 : 24;
  const FPS = isMobileDevice ? 18 : 28;
  const TOTAL = NU * NV;

  /* ── lighting ──────────────────────────────────────────── */
  const lm = Math.hypot(-0.35, 0.45, 1);
  const lx = -0.35 / lm, ly = 0.45 / lm, lz = 1 / lm;
  const hm = Math.hypot(lx, ly, lz + 1);
  const hx = lx / hm, hy = ly / hm, hz = (lz + 1) / hm;

  /* ── precompute knot geometry ─────────────────────────── */
  const spx = new Float32Array(TOTAL), spy = new Float32Array(TOTAL), spz = new Float32Array(TOTAL);
  const snx = new Float32Array(TOTAL), sny = new Float32Array(TOTAL), snz = new Float32Array(TOTAL);

  function curve(u, o) {
    const r = 2 + Math.cos(3 * u);
    o[0] = r * Math.cos(2 * u);
    o[1] = r * Math.sin(2 * u);
    o[2] = -Math.sin(3 * u);
  }

  const cc = [0, 0, 0], dd = [0, 0, 0];
  for (let i = 0; i < NU; i++) {
    const u = (i / NU) * TAU;
    curve(u, cc);
    curve(u + 1e-3, dd);
    let tx = dd[0] - cc[0], ty = dd[1] - cc[1], tz = dd[2] - cc[2];
    const tl = Math.hypot(tx, ty, tz);
    tx /= tl; ty /= tl; tz /= tl;
    let ax = ty, ay = -tx;
    const al = Math.hypot(ax, ay);
    ax /= al; ay /= al;
    const bx = -tz * ay, by = tz * ax, bz = tx * ay - ty * ax;
    for (let j = 0; j < NV; j++) {
      const v = (j / NV) * TAU;
      const cv = Math.cos(v), sv = Math.sin(v);
      const k = i * NV + j;
      snx[k] = ax * cv + bx * sv;
      sny[k] = ay * cv + by * sv;
      snz[k] = bz * sv;
      spx[k] = cc[0] + TUBE * snx[k];
      spy[k] = cc[1] + TUBE * sny[k];
      spz[k] = cc[2] + TUBE * snz[k];
    }
  }

  /* ── max projected extents ─────────────────────────────── */
  let mxE = 0, myE = 0;
  for (let a = 0; a < TAU; a += 0.15) {
    for (let T = 0.2; T <= 0.77; T += 0.08) {
      const cS = Math.cos(a), sS = Math.sin(a), cT = Math.cos(T), sT = Math.sin(T);
      for (let k = 0; k < TOTAL; k += 8) {
        const x = cS * spx[k] - sS * spy[k];
        const yt = sS * spx[k] + cS * spy[k];
        const y = cT * yt - sT * spz[k];
        const z = sT * yt + cT * spz[k];
        const ooz = 1 / (D_EYE - z);
        mxE = Math.max(mxE, Math.abs(x) * ooz);
        myE = Math.max(myE, Math.abs(y) * ooz);
      }
    }
  }

  /* ── layout state ──────────────────────────────────────── */
  let cols = 64, rows = 30;
  let cellW = 10, cellH = 19;
  let offsetX = 0, offsetY = 0;
  let K = 1, n = cols * rows;
  let outC, depthB, alongB, cutB, stackB, partB;

  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let running = false, visible = true, raf = 0, prevFrame = 0;
  const t0 = performance.now();
  const FRAME_MS = 1000 / FPS;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;

    // Cap DPR at 1.5 on mobile to cut fill rate
    const dpr = Math.min(window.devicePixelRatio || 1, isMobileDevice ? 1.5 : 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const mobile = rect.width < 680;
    cols = mobile
      ? Math.min(44, Math.max(32, Math.floor(rect.width / 10)))
      : Math.min(72, Math.max(50, Math.floor(rect.width / 16)));
    rows = Math.round(cols * (rect.height / rect.width) * ASPECT);
    rows = Math.max(18, Math.min(mobile ? 32 : 42, rows));

    cellW = canvas.width / cols;
    cellH = cellW / ASPECT;
    if (rows * cellH > canvas.height) {
      cellH = canvas.height / rows;
      cellW = cellH * ASPECT;
    }

    offsetX = (canvas.width - cols * cellW) / 2;
    offsetY = (canvas.height - rows * cellH) / 2;

    n = cols * rows;
    K = Math.min((cols - 2) / 2 / mxE, (rows - 2) / 2 / ASPECT / myE) * 0.95;

    outC = new Array(n);
    depthB = new Float32Array(n);
    alongB = new Int16Array(n);
    cutB = new Uint8Array(n);
    stackB = new Int32Array(n);
    partB = new Uint8Array(n);
    return true;
  }

  function viewAngle(t) {
    return [t * 0.35, 0.48 - 0.28 * Math.cos(t * 0.38)];
  }

  /* ── render one frame ──────────────────────────────────── */
  function draw(t) {
    const [S, T] = viewAngle(t);
    const cS = Math.cos(S), sS = Math.sin(S), cT = Math.cos(T), sT = Math.sin(T);
    const r00 = cS, r01 = -sS;
    const r10 = cT * sS, r11 = cT * cS, r12 = -sT;
    const r20 = sT * sS, r21 = sT * cS, r22 = cT;

    outC.fill(' ');
    depthB.fill(0);

    const halfCols = cols / 2;
    const halfRows = rows / 2;
    const rowAspectScale = K * ASPECT;

    for (let k = 0; k < TOTAL; k++) {
      const wnz = r20 * snx[k] + r21 * sny[k] + r22 * snz[k];
      if (wnz < -0.15) continue;
      const x = r00 * spx[k] + r01 * spy[k];
      const y = r10 * spx[k] + r11 * spy[k] + r12 * spz[k];
      const z = r20 * spx[k] + r21 * spy[k] + r22 * spz[k];
      const ooz = 1 / (D_EYE - z);
      const col = (halfCols + K * ooz * x) | 0;
      const row = (halfRows - rowAspectScale * ooz * y) | 0;
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
      const q = col + row * cols;
      const zDepth = z + 20;
      if (zDepth <= depthB[q]) continue;
      depthB[q] = zDepth;
      alongB[q] = (k / NV) | 0;
      const wnx = r00 * snx[k] + r01 * sny[k];
      const wny = r10 * snx[k] + r11 * sny[k] + r12 * snz[k];
      const diff = Math.max(0, wnx * lx + wny * ly + wnz * lz);
      const spec = Math.pow(Math.max(0, wnx * hx + wny * hy + wnz * hz), 24);
      const idx = Math.min(NR, (Math.min(1, 0.08 + diff * 0.82 + spec * 0.52) * NR + 0.5) | 0);
      outC[q] = RAMP[idx];
    }

    // Skip expensive flood-fill on mobile — just do gap detection
    if (!isMobileDevice) {
      const halfNU = NU / 2;
      const overThreshold = NU / 16;
      for (let q = 0; q < n; q++) {
        if (depthB[q] <= 0) { cutB[q] = 0; continue; }
        const c = q % cols;
        let isCut = false;
        const checkNeighbor = (p) => {
          if (depthB[p] > depthB[q] + GAP) {
            let s = Math.abs(alongB[p] - alongB[q]);
            if (s > halfNU) s = NU - s;
            return s > overThreshold;
          }
          return false;
        };
        if ((c > 0 && checkNeighbor(q - 1)) ||
            (c < cols - 1 && checkNeighbor(q + 1)) ||
            (q >= cols && checkNeighbor(q - cols)) ||
            (q < n - cols && checkNeighbor(q + cols))) {
          isCut = true;
        }
        cutB[q] = isCut ? 1 : 0;
      }
      for (let q = 0; q < n; q++) {
        if (cutB[q]) { outC[q] = ' '; depthB[q] = 0; }
      }

      // Flood-fill cleanup (desktop only)
      partB.fill(0);
      for (let q = 0; q < n; q++) {
        if (outC[q] === ' ' || partB[q]) continue;
        let top = 0, size = 0;
        stackB[top++] = q;
        partB[q] = 1;
        const seen = [];
        while (top > 0) {
          const p = stackB[--top];
          const pc = p % cols;
          seen.push(p);
          size++;
          if (pc > 0 && !partB[p - 1] && outC[p - 1] !== ' ') { partB[p - 1] = 1; stackB[top++] = p - 1; }
          if (pc < cols - 1 && !partB[p + 1] && outC[p + 1] !== ' ') { partB[p + 1] = 1; stackB[top++] = p + 1; }
          if (p >= cols && !partB[p - cols] && outC[p - cols] !== ' ') { partB[p - cols] = 1; stackB[top++] = p - cols; }
          if (p < n - cols && !partB[p + cols] && outC[p + cols] !== ' ') { partB[p + cols] = 1; stackB[top++] = p + cols; }
        }
        if (size < 6) {
          for (let s = 0; s < seen.length; s++) outC[seen[s]] = ' ';
        }
      }
    }

    // ── paint directly to canvas ──────────────────────────
    ctx.fillStyle = '#090a0b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const fontSize = Math.round(cellH * 0.85);
    ctx.font = `${fontSize}px "JetBrains Mono", Consolas, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < rows; r++) {
      const cy = offsetY + (r + 0.5) * cellH;
      const rOffset = r * cols;
      for (let c = 0; c < cols; c++) {
        const ch = outC[rOffset + c];
        if (ch === ' ') continue;
        const b = RAMP.indexOf(ch) / NR;
        const red   = Math.min(255, (45 + b * 200) | 0);
        const green = Math.min(255, (40 + b * 190) | 0);
        const blue  = Math.min(255, (52 + b * 203) | 0);
        ctx.fillStyle = `rgb(${red},${green},${blue})`;
        ctx.fillText(ch, offsetX + (c + 0.5) * cellW, cy);
      }
    }
  }

  /* ── animation loop ────────────────────────────────────── */
  function frame(now) {
    if (!running) return;
    if (!prevFrame || now - prevFrame >= FRAME_MS) {
      draw((now - t0) / 1000);
      prevFrame = now;
    }
    raf = requestAnimationFrame(frame);
  }
  function start() { if (noMotion || running || !visible) return; running = true; raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  /* ── boot ──────────────────────────────────────────────── */
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
