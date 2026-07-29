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

/* Gallery slider */
const galleryTrack = document.getElementById('galleryTrack');
const galleryPrev = document.getElementById('galleryPrev');
const galleryNext = document.getElementById('galleryNext');

if (galleryTrack && galleryPrev && galleryNext) {
  let galleryIndex = 0;
  let isAnimating = false;

  const getSlideStep = () => {
    const firstItem = galleryTrack.children[0];
    if (!firstItem) return 0;
    const trackStyles = getComputedStyle(galleryTrack);
    const gap = parseFloat(trackStyles.columnGap || trackStyles.gap) || 0;
    return firstItem.getBoundingClientRect().width + gap;
  };

  /* Compute the last valid index from the track's actual scrollable
     distance rather than "how many items fit" — counting items is
     inherently rounding-prone (fractional item widths at odd viewport
     sizes), which either disables "next" a click early or lets it go
     one click too far and shove a fully-visible item out of frame.
     Measuring scrollWidth - clientWidth directly is exact. */
  const getMaxIndex = () => {
    const viewport = galleryTrack.parentElement;
    const step = getSlideStep();
    if (!step) return 0;
    const maxScroll = galleryTrack.scrollWidth - viewport.clientWidth;
    if (maxScroll <= 0) return 0;
    // small epsilon so subpixel layout rounding doesn't add a phantom step
    return Math.max(0, Math.ceil((maxScroll - 1) / step));
  };

  /* animate: true when triggered by a nav click (should transition),
     false when just re-syncing position after resize/load. */
  /* Instagram's embed.js sets a fixed pixel width/height on each iframe
     the moment it processes a blockquote. Our CSS then stretches
     .instagram-media to fill the flex item (width:100%), but the iframe's
     *height* doesn't follow along on its own — so whenever the flex-item
     width changes (a breakpoint switch, resize, orientation change), the
     embed can end up mismatched and look cropped. Asking Instagram to
     reprocess fixes the height to match the new width. Throttled since
     resize can fire rapidly. */
  let reprocessTimer = null;
  const reprocessInstagramEmbeds = () => {
    clearTimeout(reprocessTimer);
    reprocessTimer = setTimeout(() => {
      if (window.instgrm && window.instgrm.Embeds) {
        window.instgrm.Embeds.process();
      }
    }, 150);
  };

  const updateGallery = (animate = false) => {
    const maxIndex = getMaxIndex();
    if (galleryIndex > maxIndex) galleryIndex = maxIndex;
    if (galleryIndex < 0) galleryIndex = 0;

    const step = getSlideStep();

    if (!animate) {
      /* jump instantly (no visible slide) when just resyncing layout */
      galleryTrack.style.transition = 'none';
      galleryTrack.style.transform = `translateX(-${galleryIndex * step}px)`;
      // force reflow so the transition:none actually applies before we restore it
      void galleryTrack.offsetHeight;
      galleryTrack.style.transition = '';
      reprocessInstagramEmbeds();
    } else {
      galleryTrack.style.transform = `translateX(-${galleryIndex * step}px)`;
    }

    galleryPrev.disabled = galleryIndex <= 0;
    galleryNext.disabled = galleryIndex >= maxIndex;
  };

  const goTo = (direction) => {
    if (isAnimating) return;
    const maxIndex = getMaxIndex();
    const nextIndex = galleryIndex + direction;
    if (nextIndex < 0 || nextIndex > maxIndex) return;

    isAnimating = true;
    galleryPrev.disabled = true;
    galleryNext.disabled = true;

    galleryIndex = nextIndex;
    updateGallery(true);

    let settled = false;
    let safetyTimer = null;

    const finishAnimation = () => {
      if (settled) return;
      settled = true;
      galleryTrack.removeEventListener('transitionend', onDone);
      clearTimeout(safetyTimer);
      isAnimating = false;
      galleryPrev.disabled = galleryIndex <= 0;
      galleryNext.disabled = galleryIndex >= getMaxIndex();
    };

    const onDone = (e) => {
      if (e.target !== galleryTrack || e.propertyName !== 'transform') return;
      finishAnimation();
    };

    /* Note: the gallery slide is intentionally exempt from
       prefers-reduced-motion (see style.css), so it always transitions. */
    galleryTrack.addEventListener('transitionend', onDone);

    /* Safety net: transitionend won't fire if the computed transform
       happens to match the previous value (e.g. two slide widths land on
       the same pixel translateX, which got more likely once Instagram
       embeds started resizing asynchronously). Without this, the arrows
       could stay disabled forever. 700ms = .6s transition + buffer. */
    safetyTimer = setTimeout(finishAnimation, 700);
  };

  galleryPrev.addEventListener('click', () => goTo(-1));
  galleryNext.addEventListener('click', () => goTo(1));

  /* Debounce resize, and never snap the track while a slide transition
     is running — that cancels the animation with a visible "jump".
     Instead, wait until the animation finishes (isAnimating flips back
     to false in finishAnimation) and re-check on a short interval. */
  let resizeTimer = null;
  const handleResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (isAnimating) {
        const waitForAnimation = setInterval(() => {
          if (!isAnimating) {
            clearInterval(waitForAnimation);
            updateGallery(false);
          }
        }, 50);
        return;
      }
      updateGallery(false);
    }, 150);
  };
  window.addEventListener('resize', handleResize);

  /* Instagram embeds load asynchronously and can change the slide widths
     once they render, so re-measure a few times after load. */
  updateGallery(false);
  window.addEventListener('load', () => {
    updateGallery(false);
    setTimeout(() => updateGallery(false), 800);
    setTimeout(() => updateGallery(false), 2000);
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
  setTimeout(closeContactModal, 1200);
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
