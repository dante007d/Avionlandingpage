/* ══════════════════════════════════════════════════════════════
   AVION Tech Events — Immersive Scroll & Interaction Engine
   Parallax · Magnetic · Stagger · Tilt · Particle Trails
   ══════════════════════════════════════════════════════════════ */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Smooth lerp utility ─────────────────────────────────────── */
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/* ══════════════════════════════════════════════════════════════
   1. HEADER — scroll state, direction & progress
   ══════════════════════════════════════════════════════════════ */
const header = document.querySelector('.site-header');
const progressBar = document.getElementById('scroll-progress');
const stackCards = document.querySelectorAll('.event-card[data-stack-card]');

let lastScrollY = window.scrollY;
let isScrollTicking = false;
let scrollVelocity = 0;

function updateCardStacking() {
  if (!stackCards || stackCards.length < 2) return;
  const card1 = stackCards[0];
  const card2 = stackCards[1];
  const card3 = stackCards[2];

  const rect1 = card1.getBoundingClientRect();
  const rect2 = card2.getBoundingClientRect();
  const rect3 = card3 ? card3.getBoundingClientRect() : null;

  const card2Overlap = rect2.top <= rect1.top + 72;
  const card3Overlap = rect3 ? rect3.top <= rect2.top + 72 : false;

  if (card3Overlap) {
    card1.classList.add('is-stacked-deep', 'is-stacked');
    card2.classList.add('is-stacked');
    card2.classList.remove('is-stacked-deep');
    if (card3) card3.classList.remove('is-stacked', 'is-stacked-deep');
  } else if (card2Overlap) {
    card1.classList.add('is-stacked');
    card1.classList.remove('is-stacked-deep');
    card2.classList.remove('is-stacked', 'is-stacked-deep');
    if (card3) card3.classList.remove('is-stacked', 'is-stacked-deep');
  } else {
    card1.classList.remove('is-stacked', 'is-stacked-deep');
    card2.classList.remove('is-stacked', 'is-stacked-deep');
    if (card3) card3.classList.remove('is-stacked', 'is-stacked-deep');
  }
}

const updateScrollState = () => {
  const scrollY = window.scrollY;
  scrollVelocity = Math.abs(scrollY - lastScrollY);
  const scrollDir = scrollY >= lastScrollY ? 'down' : 'up';
  document.documentElement.setAttribute('data-scroll-dir', scrollDir);

  if (header) {
    header.classList.toggle('is-scrolled', scrollY > 16);
  }
  if (progressBar) {
    const scrollTotal = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollTotal > 0 ? (scrollY / scrollTotal) * 100 : 0;
    progressBar.style.width = `${progress}%`;
  }

  updateCardStacking();
  updateParallax(scrollY);

  lastScrollY = scrollY;
  isScrollTicking = false;
};

window.addEventListener('scroll', () => {
  if (!isScrollTicking) {
    requestAnimationFrame(updateScrollState);
    isScrollTicking = true;
  }
}, { passive: true });
updateScrollState();

/* ══════════════════════════════════════════════════════════════
   2. SCROLL-DRIVEN PARALLAX SYSTEM
   ══════════════════════════════════════════════════════════════ */
function updateParallax(scrollY) {
  if (reduceMotion) return;

  // Hero title parallax — drifts upward smoothly
  const heroTitle = document.querySelector('.avion-glitch-text');
  if (heroTitle) {
    const heroSection = document.querySelector('.hero');
    const heroRect = heroSection.getBoundingClientRect();
    if (heroRect.bottom > 0) {
      const ratio = clamp(-heroRect.top / (heroRect.height || 1), 0, 1);
      heroTitle.style.transform = `translate3d(0, ${ratio * 70}px, 0) scale(${1 - ratio * 0.08})`;
      heroTitle.style.opacity = `${1 - ratio * 0.75}`;
    }
  }

  // Telemetry radar HUD box parallax
  const telemetryPanel = document.querySelector('.hero-telemetry-panel');
  if (telemetryPanel) {
    const heroSection = document.querySelector('.hero');
    const heroRect = heroSection.getBoundingClientRect();
    if (heroRect.bottom > 0) {
      const ratio = clamp(-heroRect.top / (heroRect.height || 1), 0, 1);
      telemetryPanel.style.transform = `translate3d(0, ${ratio * 45}px, 0)`;
      telemetryPanel.style.opacity = `${1 - ratio * 0.55}`;
    }
  }

  // Signal wave parallax
  const signalWave = document.querySelector('.signal-wave');
  if (signalWave) {
    const signalSection = document.querySelector('.signal-section');
    const rect = signalSection.getBoundingClientRect();
    const viewH = window.innerHeight;
    if (rect.top < viewH && rect.bottom > 0) {
      const ratio = (viewH - rect.top) / (viewH + rect.height);
      signalWave.style.transform = `translate3d(${ratio * 4}%, ${ratio * -25}px, 0) scale(${1 + ratio * 0.05})`;
    }
  }

  // HUD wings parallax on hero
  const wingL = document.querySelector('.avion-wing--l');
  const wingR = document.querySelector('.avion-wing--r');
  if (wingL && wingR) {
    const heroSection = document.querySelector('.hero');
    const heroRect = heroSection.getBoundingClientRect();
    if (heroRect.bottom > 0) {
      const ratio = clamp(-heroRect.top / (heroRect.height || 1), 0, 1);
      wingL.style.transform = `scaleX(${1 + ratio * 0.6})`;
      wingR.style.transform = `scaleX(${1 + ratio * 0.6})`;
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   3. ADVANCED SCROLL-REVEAL — staggered, directional, with scale
   ══════════════════════════════════════════════════════════════ */
const revealItems = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window && !reduceMotion) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      } else if (entry.boundingClientRect.top > window.innerHeight) {
        entry.target.classList.remove('is-visible');
      }
    });
  }, { threshold: 0.06, rootMargin: '0px 0px -50px 0px' });
  revealItems.forEach(item => revealObserver.observe(item));
} else {
  revealItems.forEach(item => item.classList.add('is-visible'));
}

/* ── Acronym word-by-word staggered reveal ─────────────────── */
const acronymWords = document.querySelectorAll('.reveal-word');
if ('IntersectionObserver' in window && !reduceMotion) {
  const wordObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      } else if (entry.boundingClientRect.top > window.innerHeight) {
        entry.target.classList.remove('is-visible');
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -30px 0px' });
  acronymWords.forEach(word => wordObserver.observe(word));
} else {
  acronymWords.forEach(word => word.classList.add('is-visible'));
}

/* ══════════════════════════════════════════════════════════════
   4. CARD 3D TILT ON HOVER (Desktop only)
   ══════════════════════════════════════════════════════════════ */
if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
  const cards = document.querySelectorAll('.event-card');
  cards.forEach(card => {
    let tiltRAF;
    card.addEventListener('mousemove', (e) => {
      if (card.classList.contains('is-stacked') || card.classList.contains('is-stacked-deep')) return;

      cancelAnimationFrame(tiltRAF);
      tiltRAF = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        const tiltX = y * -8;
        const tiltY = x * 8;
        card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.02)`;

        card.style.setProperty('--spot-x', `${(x + 0.5) * 100}%`);
        card.style.setProperty('--spot-y', `${(y + 0.5) * 100}%`);
      });
    });

    card.addEventListener('mouseleave', () => {
      cancelAnimationFrame(tiltRAF);
      card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
      card.style.transform = '';
      card.style.removeProperty('--spot-x');
      card.style.removeProperty('--spot-y');
      setTimeout(() => { card.style.transition = ''; }, 500);
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   5. MAGNETIC BUTTON EFFECT (Register CTA)
   ══════════════════════════════════════════════════════════════ */
if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
  const magneticBtns = document.querySelectorAll('.register-button');
  magneticBtns.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.28}px, ${y * 0.35}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
      btn.style.transform = '';
      setTimeout(() => { btn.style.transition = ''; }, 450);
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   6. CUSTOM CURSOR GLOW TRAIL (Desktop only)
   ══════════════════════════════════════════════════════════════ */
if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
  const cursorGlow = document.createElement('div');
  cursorGlow.className = 'cursor-glow';
  document.body.appendChild(cursorGlow);

  let cursorX = window.innerWidth / 2, cursorY = window.innerHeight / 2;
  let glowX = cursorX, glowY = cursorY;

  document.addEventListener('mousemove', (e) => {
    cursorX = e.clientX;
    cursorY = e.clientY;
  }, { passive: true });

  function animateCursorGlow() {
    glowX = lerp(glowX, cursorX, 0.12);
    glowY = lerp(glowY, cursorY, 0.12);
    cursorGlow.style.transform = `translate(${glowX - 180}px, ${glowY - 180}px)`;
    requestAnimationFrame(animateCursorGlow);
  }
  animateCursorGlow();

  // Highlight cursor on interactive hover targets
  const interactiveTargets = document.querySelectorAll('a, button, .event-card, .carousel-item');
  interactiveTargets.forEach(target => {
    target.addEventListener('mouseenter', () => document.body.classList.add('cursor-active'));
    target.addEventListener('mouseleave', () => document.body.classList.remove('cursor-active'));
  });
}

/* ══════════════════════════════════════════════════════════════
   7. SMOOTH SCAN-LINE SWEEPS (Eyebrows, Badges, Labels)
   ══════════════════════════════════════════════════════════════ */
if (!reduceMotion) {
  const scanTargets = document.querySelectorAll('.eyebrow, .case-index, .case-badge');
  if ('IntersectionObserver' in window) {
    const scanObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('eyebrow-animate');
          scanObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    scanTargets.forEach(e => scanObserver.observe(e));
  }
}

/* ══════════════════════════════════════════════════════════════
   8. SECTION BORDER GLOW ON SCROLL INTO VIEW
   ══════════════════════════════════════════════════════════════ */
if (!reduceMotion) {
  const glowSections = document.querySelectorAll('.events-section, .signal-section, .cta-section, .acronym-section');
  if ('IntersectionObserver' in window) {
    const glowObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        entry.target.classList.toggle('section-in-view', entry.isIntersecting);
      });
    }, { threshold: 0.12 });
    glowSections.forEach(s => glowObserver.observe(s));
  }
}

/* ══════════════════════════════════════════════════════════════
   9. VIDEO VIEWPORT OPTIMIZER
   ══════════════════════════════════════════════════════════════ */
const cardVideos = document.querySelectorAll('.card-video');
if ('IntersectionObserver' in window && !reduceMotion) {
  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const vid = entry.target;
      if (entry.isIntersecting && document.visibilityState !== 'hidden') {
        const playPromise = vid.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            const unlockTouch = () => {
              vid.play().catch(() => {});
              document.removeEventListener('touchstart', unlockTouch);
            };
            document.addEventListener('touchstart', unlockTouch, { once: true, passive: true });
          });
        }
      } else {
        vid.pause();
      }
    });
  }, { threshold: 0.15 });

  cardVideos.forEach(vid => videoObserver.observe(vid));

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      cardVideos.forEach(v => v.pause());
    }
  });
} else {
  cardVideos.forEach(vid => vid.play().catch(() => {}));
}

/* ══════════════════════════════════════════════════════════════
   10. CASE DATA & MODAL
   ══════════════════════════════════════════════════════════════ */
const CASES = {
  eclipse: {
    tag: 'CASE // 01 · CLASSIFIED INCIDENT',
    title: 'Project Eclipse',
    genre: 'Cybersecurity | AI Threat | Digital Investigation',
    desc: 'A classified AI project has been compromised. Research files have disappeared, security systems are disabled, and the lead scientist is missing. Investigate suspects, decode encrypted messages, analyse server logs, and reconstruct the events to expose the real culprit.',
    mission: 'Uncover the insider. Expose PHANTOM. Recover the truth.'
  },
  mystery: {
    tag: 'CASE // 02 · DIGITAL FORENSICS',
    title: 'Cyber Mystery Arena',
    genre: 'Cybersecurity | Mystery | Digital Investigation',
    desc: 'Investigate mysterious digital incidents by analysing login records, decoding secret messages, and identifying suspicious activities. Work individually or in teams to uncover the truth using the evidence provided.',
    mission: 'Find the clues. Connect the evidence. Solve the mystery.'
  },
  auction: {
    tag: 'CASE // 03 · COMPETITIVE ARENA',
    title: 'Topic Auction Challenge',
    genre: 'Strategy | Knowledge | Competitive Auction',
    desc: 'Forget traditional auctions. Here, teams compete using virtual coins to purchase knowledge topics instead of physical items. Every bid matters. Choose your topics wisely across Easy, Medium, and Hard rounds, then solve the question papers to maximise your score.',
    mission: 'Bid strategically. Choose wisely. Prove your knowledge.'
  }
};

const modal = document.getElementById('case-modal');
const modalCaseTag = document.getElementById('modal-case-tag');
const modalTitle = document.getElementById('modal-title');
const modalGenre = document.getElementById('modal-genre');
const modalDesc = document.getElementById('modal-desc');
const modalMission = document.getElementById('modal-mission');
const modalClose = document.querySelector('.modal-close');
const modalDismiss = document.querySelector('.modal-dismiss-btn');
let activeCardElement = null;

function openCaseModal(caseKey, triggeringElement) {
  const data = CASES[caseKey];
  if (!data || !modal) return;

  activeCardElement = triggeringElement;
  modalCaseTag.textContent = data.tag;
  modalTitle.textContent = data.title;
  modalGenre.textContent = data.genre;
  modalDesc.textContent = data.desc;
  modalMission.textContent = data.mission;

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  modalClose.focus();
}

function closeCaseModal() {
  if (!modal || !modal.classList.contains('is-open')) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  if (activeCardElement) {
    activeCardElement.focus();
    activeCardElement = null;
  }
}

const interactiveCaseTriggers = document.querySelectorAll('.event-card, .carousel-item[data-case]');
interactiveCaseTriggers.forEach(el => {
  const caseKey = el.dataset.case;
  if (!caseKey) return;
  el.addEventListener('click', () => openCaseModal(caseKey, el));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openCaseModal(caseKey, el);
    }
  });
});

if (modalClose) modalClose.addEventListener('click', closeCaseModal);
if (modalDismiss) modalDismiss.addEventListener('click', closeCaseModal);

if (modal) {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeCaseModal();
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) {
    closeCaseModal();
  }
});

// Mobile swipe-down to dismiss
let touchStartY = 0;
const modalCard = document.querySelector('.modal-card');
if (modalCard) {
  modalCard.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  modalCard.addEventListener('touchmove', (e) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY;
    const modalContent = document.querySelector('.modal-content');
    if (diff > 80 && modalContent && modalContent.scrollTop <= 0) {
      closeCaseModal();
    }
  }, { passive: true });
}

/* ══════════════════════════════════════════════════════════════
   11. SMOOTH SCROLL ANCHOR LINKS
   ══════════════════════════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

/* ══════════════════════════════════════════════════════════════
   12. TEXT SCRAMBLE CYBER DECODER (Carousel, Titles, Badges)
   ══════════════════════════════════════════════════════════════ */
if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
  const scrambleChars = '01#%&*<>/[]{}~+-=';

  function scrambleText(el) {
    if (el.dataset.scrambling === 'true') return;
    el.dataset.scrambling = 'true';
    const original = el.dataset.originalText || el.textContent;
    el.dataset.originalText = original;

    let iteration = 0;
    const totalIterations = original.length;
    const interval = setInterval(() => {
      el.textContent = original
        .split('')
        .map((char, i) => {
          if (char === ' ' || char === '\n') return char;
          if (i < iteration) return original[i];
          return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
        })
        .join('');

      iteration += 1 / 2;
      if (iteration >= totalIterations) {
        clearInterval(interval);
        el.textContent = original;
        el.dataset.scrambling = 'false';
      }
    }, 28);
  }

  document.querySelectorAll('.carousel-name, .event-info h3 em, .case-badge, .main-nav a').forEach(el => {
    el.addEventListener('mouseenter', () => scrambleText(el));
  });
}

/* ══════════════════════════════════════════════════════════════
   13. FOOTER STAGGER REVEAL
   ══════════════════════════════════════════════════════════════ */
if (!reduceMotion) {
  const footer = document.querySelector('.site-footer');
  if (footer && 'IntersectionObserver' in window) {
    const footerObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        footer.classList.toggle('footer-visible', entry.isIntersecting);
      });
    }, { threshold: 0.2 });
    footerObserver.observe(footer);
  }
}
