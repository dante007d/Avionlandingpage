/* ── header scroll state, scroll direction & progress indicator ── */
const header = document.querySelector('.site-header');
const progressBar = document.getElementById('scroll-progress');
const stackCards = document.querySelectorAll('.event-card[data-stack-card]');

let lastScrollY = window.scrollY;
let isScrollTicking = false;

function updateCardStacking() {
  if (!stackCards || stackCards.length < 2) return;
  const card1 = stackCards[0];
  const card2 = stackCards[1];
  const card3 = stackCards[2];

  const rect1 = card1.getBoundingClientRect();
  const rect2 = card2.getBoundingClientRect();
  const rect3 = card3 ? card3.getBoundingClientRect() : null;

  // Thresholds based on header offset
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

  // Reactive Card Stacking
  updateCardStacking();

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

/* ── bidirectional reveal on scroll (reacts to both down and up scroll) ─ */
const revealItems = document.querySelectorAll('.reveal');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if ('IntersectionObserver' in window && !reduceMotion) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      } else if (entry.boundingClientRect.top > window.innerHeight) {
        // Scrolled back up above this item
        entry.target.classList.remove('is-visible');
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
  revealItems.forEach(item => revealObserver.observe(item));
} else {
  revealItems.forEach(item => item.classList.add('is-visible'));
}

/* ── acronym word-by-word scroll reveal (bidirectional) ───── */
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

/* ── Android/Mobile Video Viewport Optimizer ──────────────── */
// Automatically pauses off-screen videos to eliminate lag and conserve battery
const ambientVideos = document.querySelectorAll('.card-video, .signal-video');
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

  ambientVideos.forEach(vid => videoObserver.observe(vid));

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      ambientVideos.forEach(v => v.pause());
    }
  });
} else {
  ambientVideos.forEach(vid => vid.play().catch(() => {}));
}

/* ── CASE INFORMATION DATA (Focused text briefing) ───────── */
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

/* ── MODAL INTERACTION LOGIC (Information Sheet) ──────────── */
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

// Attach event card and carousel item click and keyboard handlers
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

// Close on clicking backdrop
if (modal) {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeCaseModal();
  });
}

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) {
    closeCaseModal();
  }
});

// Mobile swipe-down to dismiss bottom sheet
let touchStartY = 0;
const modalCard = document.querySelector('.modal-card');
if (modalCard) {
  modalCard.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  modalCard.addEventListener('touchmove', (e) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY;
    // Only dismiss if dragged downwards from the top of the card
    const modalContent = document.querySelector('.modal-content');
    if (diff > 80 && modalContent && modalContent.scrollTop <= 0) {
      closeCaseModal();
    }
  }, { passive: true });
}

/* ── register button handler ─────────────────────────────── */
/* Register buttons are now direct <a> links to the Google Form.
   No JS handler needed — the browser follows the href natively. */

/* ── AVION Hologram 3D Perspective Hover Tracker ──────────── */
const brandLogo = document.getElementById('hero-brand-logo');
if (brandLogo && !reduceMotion && window.matchMedia('(hover: hover)').matches) {
  const heroSection = document.querySelector('.hero');
  if (heroSection) {
    let brandRAF;
    heroSection.addEventListener('mousemove', (e) => {
      cancelAnimationFrame(brandRAF);
      brandRAF = requestAnimationFrame(() => {
        const rect = heroSection.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        brandLogo.style.transform = `perspective(900px) rotateX(${y * -8}deg) rotateY(${x * 10}deg) scale(1.02)`;
      });
    });

    heroSection.addEventListener('mouseleave', () => {
      cancelAnimationFrame(brandRAF);
      brandLogo.style.transform = '';
    });
  }
}
