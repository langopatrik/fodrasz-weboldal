document.getElementById('year').textContent = new Date().getFullYear();

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Mobile nav toggle */
const burger = document.getElementById('navBurger');
const navLinks = document.getElementById('navLinks');
burger.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', String(isOpen));
});
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  });
});

/* Scroll reveal */
const revealTargets = document.querySelectorAll('.reveal');
if (prefersReducedMotion) {
  revealTargets.forEach(el => el.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealTargets.forEach(el => revealObserver.observe(el));
}

/* Service tabs: Férfi / Női / Gyerek / Extrém */
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
    panels.forEach(p => p.classList.remove('is-active'));

    tab.classList.add('is-active');
    tab.setAttribute('aria-selected', 'true');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('is-active');
  });
});

/* Gallery: fall back to a placeholder card if an Instagram embed doesn't render
   (e.g. the embed script is blocked, offline preview, slow network). */
const galleryFigures = document.querySelectorAll('.gallery__item--instagram');

function markBrokenEmbeds() {
  galleryFigures.forEach(figure => {
    const rendered = figure.querySelector('.instagram-media iframe');
    if (!rendered) figure.classList.add('gallery__item--broken');
  });
  window.dispatchEvent(new Event('resize'));
}

function clearBrokenIfRendered() {
  let allRendered = true;
  galleryFigures.forEach(figure => {
    const rendered = figure.querySelector('.instagram-media iframe');
    if (rendered) {
      figure.classList.remove('gallery__item--broken');
    } else {
      allRendered = false;
    }
  });
  window.dispatchEvent(new Event('resize'));
  return allRendered;
}

if (galleryFigures.length) {
  const igScript = document.querySelector('script[src*="instagram.com/embed.js"]');

  /* Script blocked entirely (e.g. no network access) → fall back right away */
  if (igScript) {
    igScript.addEventListener('error', markBrokenEmbeds);
  } else {
    markBrokenEmbeds();
  }

  /* Otherwise give the embed script a little time to render, checking a
     few times since Instagram processes embeds asynchronously */
  [1500, 3000, 5000].forEach(delay => {
    setTimeout(() => {
      if (!clearBrokenIfRendered()) markBrokenEmbeds();
    }, delay);
  });
}

/* Gallery slider */
const galleryTrack = document.getElementById('galleryTrack');
const galleryPrev = document.getElementById('galleryPrev');
const galleryNext = document.getElementById('galleryNext');

if (galleryTrack && galleryPrev && galleryNext) {
  let galleryIndex = 0;

  const getSlideStep = () => {
    const firstItem = galleryTrack.children[0];
    if (!firstItem) return 0;
    const trackStyles = getComputedStyle(galleryTrack);
    const gap = parseFloat(trackStyles.columnGap || trackStyles.gap) || 0;
    return firstItem.getBoundingClientRect().width + gap;
  };

  const getVisibleCount = () => {
    const viewport = galleryTrack.parentElement;
    const step = getSlideStep();
    if (!step) return 1;
    return Math.max(1, Math.round(viewport.clientWidth / step));
  };

  const getMaxIndex = () => {
    const total = galleryTrack.children.length;
    return Math.max(0, total - getVisibleCount());
  };

  const updateGallery = () => {
    const maxIndex = getMaxIndex();
    if (galleryIndex > maxIndex) galleryIndex = maxIndex;
    if (galleryIndex < 0) galleryIndex = 0;

    const step = getSlideStep();
    galleryTrack.style.transform = `translateX(-${galleryIndex * step}px)`;

    galleryPrev.disabled = galleryIndex <= 0;
    galleryNext.disabled = galleryIndex >= maxIndex;
  };

  galleryPrev.addEventListener('click', () => {
    galleryIndex -= 1;
    updateGallery();
  });

  galleryNext.addEventListener('click', () => {
    galleryIndex += 1;
    updateGallery();
  });

  window.addEventListener('resize', updateGallery);

  /* Instagram embeds load asynchronously and can change the slide widths
     once they render, so re-measure a few times after load. */
  updateGallery();
  window.addEventListener('load', () => {
    updateGallery();
    setTimeout(updateGallery, 800);
    setTimeout(updateGallery, 2000);
  });
}

/* Contact form — no backend wired up yet, so just confirm receipt locally */
const form = document.getElementById('contactForm');
const status = document.getElementById('formStatus');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!form.checkValidity()) {
    status.textContent = 'Kérjük, tölts ki minden mezőt.';
    return;
  }
  status.textContent = 'Köszönjük! Hamarosan felvesszük veled a kapcsolatot.';
  form.reset();
});

/* Contact modal */
const openContactBtn = document.getElementById('openContactForm');
const closeContactBtn = document.getElementById('closeContactForm');
const contactOverlay = document.getElementById('contactModalOverlay');
let lastFocusedEl = null;

function openContactModal() {
  lastFocusedEl = document.activeElement;
  contactOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
  const firstField = form.querySelector('#name');
  if (firstField) firstField.focus();
}

function closeContactModal() {
  contactOverlay.hidden = true;
  document.body.style.overflow = '';
  status.textContent = '';
  if (lastFocusedEl) lastFocusedEl.focus();
}

openContactBtn.addEventListener('click', openContactModal);
closeContactBtn.addEventListener('click', closeContactModal);
contactOverlay.addEventListener('click', (e) => {
  if (e.target === contactOverlay) closeContactModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !contactOverlay.hidden) closeContactModal();
});
form.addEventListener('submit', () => {
  if (form.checkValidity()) {
    setTimeout(closeContactModal, 1200);
  }
});

/* Contact form — no backend wired up yet, so just confirm receipt locally */
