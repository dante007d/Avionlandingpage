/**
 * led-scroller.js — Amber & Red-Amber LED Matrix Scroller
 * Powers:
 * 1. #nav-led-canvas (Navbar brand sign)
 * 2. #box-led-canvas (Hero telemetry box with interactive roasting challenge text)
 */
(() => {
  const FONT7 = {
    A: ".###.|#...#|#...#|#####|#...#|#...#|#...#", B: "####.|#...#|#...#|####.|#...#|#...#|####.",
    C: ".###.|#...#|#....|#....|#....|#...#|.###.", D: "####.|#...#|#...#|#...#|#...#|#...#|####.",
    E: "#####|#....|#....|####.|#....|#....|#####", F: "#####|#....|#....|####.|#....|#....|#....",
    G: ".###.|#...#|#....|#.###|#...#|#...#|.####", H: "#...#|#...#|#...#|#####|#...#|#...#|#...#",
    I: "#####|..#..|..#..|..#..|..#..|..#..|#####", J: "..###|...#.|...#.|...#.|#..#.|#..#.|.##..",
    K: "#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#", L: "#....|#....|#....|#....|#....|#....|#####",
    M: "#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#", N: "#...#|##..#|#.#.#|#.#.#|#..##|#...#|#...#",
    O: ".###.|#...#|#...#|#...#|#...#|#...#|.###.", P: "####.|#...#|#...#|####.|#....|#....|#....",
    Q: ".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#", R: "####.|#...#|#...#|####.|#.#..|#..#.|#...#",
    S: ".###.|#...#|#....|.###.|....#|#...#|.###.", T: "#####|..#..|..#..|..#..|..#..|..#..|..#..",
    U: "#...#|#...#|#...#|#...#|#...#|#...#|.###.", V: "#...#|#...#|#...#|#...#|#...#|.#.#.|..#..",
    W: "#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#", X: "#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
    Y: "#...#|#...#|.#.#.|..#..|..#..|..#..|..#..", Z: "#####|....#|...#.|..#..|.#...|#....|#####",
    0: ".###.|#...#|#..##|#.#.#|##..#|#...#|.###.", 1: "..#..|.##..|..#..|..#..|..#..|..#..|.###.",
    2: ".###.|#...#|....#|...#.|..#..|.#...|#####", 3: "####.|....#|....#|.###.|....#|....#|####.",
    4: "...#.|..##.|.#.#.|#..#.|#####|...#.|...#.", 5: "#####|#....|####.|....#|....#|#...#|.###.",
    6: ".###.|#....|#....|####.|#...#|#...#|.###.", 7: "#####|....#|...#.|..#..|.#...|.#...|.#...",
    8: ".###.|#...#|#...#|.###.|#...#|#...#|.###.", 9: ".###.|#...#|#...#|.####|....#|....#|.###.",
    ":": ".....|..#..|..#..|.....|..#..|..#..|.....", "!": "..#..|..#..|..#..|..#..|..#..|.....|..#..",
    ".": ".....|.....|.....|.....|.....|.....|..#..", "-": ".....|.....|.....|.###.|.....|.....|.....",
    "%": "#...#|...#.|..#..|.#...|#...#|.....|.....", "/": "....#|...#.|..#..|.#...|#....|.....|.....",
    "?": ".###.|#...#|....#|...#.|..#..|.....|..#..", "'": "..#..|..#..|.....|.....|.....|.....|.....",
    " ": ".....|.....|.....|.....|.....|.....|.....",
  };

  const GL7 = {};
  for (const k in FONT7) GL7[k] = FONT7[k].split('|');
  const glyph = (c) => GL7[c] || GL7[' '];

  const LH = 14; // 7 rows * 2 vertical dots

  function buildStrip(messages) {
    const strip = [];
    for (const [text, colorMain, colorCore] of messages) {
      for (const ch of text) {
        const gl = ch === '·'
          ? '.....|.....|.....|..#..|.....|.....|.....'.split('|')
          : glyph(ch);

        for (let i = 0; i < 5; i++) {
          const colm = new Array(LH).fill(null);
          for (let j = 0; j < 7; j++) {
            if (gl[j][i] === '#') {
              colm[j * 2] = { main: colorMain, core: colorCore };
              colm[j * 2 + 1] = { main: colorMain, core: colorCore };
            }
          }
          strip.push(colm);
        }
        strip.push(new Array(LH).fill(null));
      }
    }
    return strip;
  }

  function createMatrixInstance(canvasId, messages, speed = 20) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return null;

    const strip = buildStrip(messages);

    let LW = 40;
    let ledSize = 2;
    let gapX = 3.6;
    let gapY = 2.4;
    let padX = 6;
    let padY = 4;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);

      padX = Math.round(6 * dpr);
      padY = Math.round(4 * dpr);
      const usableW = canvas.width - padX * 2;
      const usableH = canvas.height - padY * 2;

      gapY = usableH / LH;
      gapX = gapY * 1.12;
      LW = Math.max(24, Math.floor(usableW / gapX));
      ledSize = Math.max(1, gapY * 0.38);
      return true;
    }

    function render(t) {
      ctx.fillStyle = '#0a0b0e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#24201c';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);

      ctx.fillStyle = '#060709';
      ctx.fillRect(padX - 2, padY - 2, LW * gapX + 4, LH * gapY + 4);

      const off = Math.floor(t * speed);
      const stripLen = strip.length;

      for (let c = 0; c < LW; c++) {
        const idx = (((c + off) % stripLen) + stripLen) % stripLen;
        const colm = strip[idx];
        const cx = padX + (c + 0.5) * gapX;

        for (let r = 0; r < LH; r++) {
          const cy = padY + (r + 0.5) * gapY;
          const led = colm[r];

          if (!led) {
            ctx.fillStyle = '#181410';
            ctx.beginPath();
            ctx.arc(cx, cy, ledSize, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Glow
            ctx.fillStyle = 'rgba(255, 140, 50, 0.28)';
            ctx.beginPath();
            ctx.arc(cx, cy, ledSize * 1.8, 0, Math.PI * 2);
            ctx.fill();

            // Main LED
            ctx.fillStyle = led.main;
            ctx.beginPath();
            ctx.arc(cx, cy, ledSize, 0, Math.PI * 2);
            ctx.fill();

            // Specular core
            ctx.fillStyle = led.core;
            ctx.beginPath();
            ctx.arc(cx, cy, ledSize * 0.45, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Corner rivets
      ctx.fillStyle = '#d9bfc8';
      const rw = 2.5;
      ctx.fillRect(2, 2, rw, rw);
      ctx.fillRect(canvas.width - 2 - rw, 2, rw, rw);
      ctx.fillRect(2, canvas.height - 2 - rw, rw, rw);
      ctx.fillRect(canvas.width - 2 - rw, canvas.height - 2 - rw, rw, rw);
    }

    return { resize, render };
  }

  // 1. Navbar scroller
  const navInstance = createMatrixInstance('nav-led-canvas', [
    ['AVION', '#ffb347', '#ffd9a0'],
    ['   ·   ', '#3a2818', '#3a2818'],
    ['TECH EVENTS', '#ff8447', '#ffcaa0'],
    ['   ·   ', '#3a2818', '#3a2818'],
    ['AVION 03', '#ffb347', '#ffd9a0'],
    ['   ·   ', '#3a2818', '#3a2818'],
  ], 18);

  // 2. Hero Box Roast scroller
  // Catchy roast sequence conveying: you think you can win? 99% fail here. Test your skills if you dare!
  const boxInstance = createMatrixInstance('box-led-canvas', [
    ['THINK YOU CAN WIN? CUTE', '#ffb347', '#ffd9a0'],
    ['   ·   ', '#ff4d4d', '#ffa6a6'],
    ['99% FAIL HERE', '#ff4d4d', '#ffa6a6'],
    ['   ·   ', '#3a2818', '#3a2818'],
    ['TEST YOUR SKILLS IF YOU DARE', '#ffb347', '#ffd9a0'],
    ['   ·   ', '#ff4d4d', '#ffa6a6'],
    ['YOU WILL NOT SURVIVE ROUND 1', '#ff4d4d', '#ffa6a6'],
    ['   ·   ', '#3a2818', '#3a2818'],
    ['BRING YOUR BRAIN NOT EXCUSES', '#f9cb28', '#fce59a'],
    ['   ·   ', '#ff4d4d', '#ffa6a6'],
    ['PROVE US WRONG', '#50e3c2', '#b0f2e3'],
    ['   ·   ', '#3a2818', '#3a2818'],
  ], 22);

  const instances = [navInstance, boxInstance].filter(Boolean);
  if (!instances.length) return;

  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let running = false;
  let raf = 0;
  let prevTime = 0;
  const t0 = performance.now();

  function resizeAll() {
    instances.forEach(inst => inst.resize());
  }

  function frame(now) {
    if (!running) return;
    if (!prevTime || now - prevTime >= 1000 / 30) {
      const t = (now - t0) / 1000;
      instances.forEach(inst => inst.render(t));
      prevTime = now;
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (noMotion || running) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  resizeAll();
  if (noMotion) {
    instances.forEach(inst => inst.render(0));
    return;
  }

  start();

  window.addEventListener('resize', () => {
    resizeAll();
    const t = (performance.now() - t0) / 1000;
    instances.forEach(inst => inst.render(t));
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stop();
    else start();
  });
})();
