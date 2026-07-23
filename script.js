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
