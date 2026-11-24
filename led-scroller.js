/**
 * led-scroller.js — Amber & Red-Amber LED Matrix Scroller
 * Powers:
 * 1. #nav-led-canvas (Navbar brand sign)
 * 2. #box-led-canvas (Hero telemetry box with interactive roasting challenge text)
 */
(() => {
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768;
  const FPS = isMobile ? 22 : 30;
  const FRAME_MS = 1000 / FPS;

  const FONT7 = {
    A: ".###.|#...#|#...#|#####|#...#|#...#|#...#",
    B: "####.|#...#|#...#|####.|#...#|#...#|####.",
    C: ".###.|#...#|#....|#....|#....|#...#|.###.",
    D: "####.|#...#|#...#|#...#|#...#|#...#|####.",
    E: "#####|#....|#....|####.|#....|#....|#####",
    F: "#####|#....|#....|####.|#....|#....|#....",
    G: ".###.|#...#|#....|#.###|#...#|#...#|.####",
    H: "#...#|#...#|#...#|#####|#...#|#...#|#...#",
    I: "#####|..#..|..#..|..#..|..#..|..#..|#####",
    J: "..###|...#.|...#.|...#.|#..#.|#..#.|.##..",
    K: "#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#",
    L: "#....|#....|#....|#....|#....|#....|#####",
    M: "#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#",
    N: "#...#|##..#|#.#.#|#.#.#|#..##|#...#|#...#",
    O: ".###.|#...#|#...#|#...#|#...#|#...#|.###.",
    P: "####.|#...#|#...#|####.|#....|#....|#....",
    Q: ".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#",
    R: "####.|#...#|#...#|####.|#.#..|#..#.|#...#",
    S: ".###.|#...#|#....|.###.|....#|#...#|.###.",
    T: "#####|..#..|..#..|..#..|..#..|..#..|..#..",
    U: "#...#|#...#|#...#|#...#|#...#|#...#|.###.",
    V: "#...#|#...#|#...#|#...#|#...#|.#.#.|..#..",
    W: "#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#",
    X: "#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
    Y: "#...#|#...#|.#.#.|..#..|..#..|..#..|..#..",
    Z: "#####|....#|...#.|..#..|.#...|#....|#####",
    0: ".###.|#...#|#..##|#.#.#|##..#|#...#|.###.",
    1: "..#..|.##..|..#..|..#..|..#..|..#..|.###.",
    2: ".###.|#...#|....#|...#.|..#..|.#...|#####",
    3: "####.|....#|....#|.###.|....#|....#|####.",
    4: "...#.|..##.|.#.#.|#..#.|#####|...#.|...#.",
    5: "#####|#....|####.|....#|....#|#...#|.###.",
    6: ".###.|#....|#....|####.|#...#|#...#|.###.",
    7: "#####|....#|...#.|..#..|.#...|.#...|.#...",
    8: ".###.|#...#|#...#|.###.|#...#|#...#|.###.",
    9: ".###.|#...#|#...#|.####|....#|....#|.###.",
    ":": ".....|..#..|..#..|.....|..#..|..#..|.....",
    "!": "..#..|..#..|..#..|..#..|..#..|.....|..#..",
    ".": ".....|.....|.....|.....|.....|.....|..#..",
    "-": ".....|.....|.....|.###.|.....|.....|.....",
    "%": "#...#|...#.|..#..|.#...|#...#|.....|.....",
    "/": "....#|...#.|..#..|.#...|#....|.....|.....",
    "?": ".###.|#...#|....#|...#.|..#..|.....|..#..",
    "'": "..#..|..#..|.....|.....|.....|.....|.....",
    " ": ".....|.....|.....|.....|.....|.....|.....",
  };

  const GL7 = {};
  for (const k in FONT7) GL7[k] = FONT7[k].split('|');
  const glyph = (c) => GL7[c] || GL7[' '];
  const LH = 14;

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
            if (gl[j] && gl[j][i] === '#') {
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
    let LW = 40, ledSize = 2, gapX = 3.6, gapY = 2.4, padX = 6, padY = 4;
    let visible = true;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
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
      if (!visible) return;
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
            if (!isMobile) {
              ctx.fillStyle = 'rgba(255, 140, 50, 0.28)';
              ctx.beginPath();
              ctx.arc(cx, cy, ledSize * 1.8, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = led.main;
            ctx.beginPath();
            ctx.arc(cx, cy, ledSize, 0, Math.PI * 2);
            ctx.fill();
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

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
      }, { threshold: 0 }).observe(canvas);
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

  // 2. Hero Challenge Radar scroller
  const boxInstance = createMatrixInstance('box-led-canvas', [
    ['YOU ARE NOT READY FOR THIS', '#ff4d4d', '#ffa6a6'],
    ['   ·   ', '#3a2818', '#3a2818'],
    ['MOST TEAMS CHOKE UNDER PRESSURE', '#ff4d4d', '#ffa6a6'],
    ['   ·   ', '#ff4d4d', '#ffa6a6'],
    ['YOUR CONFIDENCE WILL BETRAY YOU', '#ffb347', '#ffd9a0'],
    ['   ·   ', '#3a2818', '#3a2818'],
    ['WE DARE YOU TO LAST 10 MINUTES', '#ff4d4d', '#ffa6a6'],
    ['   ·   ', '#ff4d4d', '#ffa6a6'],
    ['YOUR WHOLE SQUAD WILL CRUMBLE', '#f9cb28', '#fce59a'],
    ['   ·   ', '#3a2818', '#3a2818'],
    ['NOBODY HAS BEATEN LEVEL 60 YET', '#ff4d4d', '#ffa6a6'],
    ['   ·   ', '#ff4d4d', '#ffa6a6'],
    ['SCARED? GOOD. YOU SHOULD BE', '#ffb347', '#ffd9a0'],
    ['   ·   ', '#3a2818', '#3a2818'],
    ['PROVE US WRONG IF YOU CAN', '#50e3c2', '#b0f2e3'],
    ['   ·   ', '#3a2818', '#3a2818'],
  ], 10);

  const instances = [navInstance, boxInstance].filter(Boolean);
  if (!instances.length) return;

  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0, prevTime = 0, running = false;
  const t0 = performance.now();

  function resizeAll() {
    instances.forEach(inst => inst.resize());
  }

  function frame(now) {
    if (!running) return;
    if (!prevTime || now - prevTime >= FRAME_MS) {
      const t = (now - t0) / 1000;
      instances.forEach(inst => inst.render(t));
      prevTime = now;
    }
    raf = requestAnimationFrame(frame);
  }

  function start() { if (running) return; running = true; raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

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
    if (document.visibilityState === 'hidden') stop(); else start();
  });
})();
