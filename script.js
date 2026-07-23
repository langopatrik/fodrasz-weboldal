document.getElementById('year').textContent = new Date().getFullYear();

/* ============================================================
   GOOGLE-VÉLEMÉNYEK BEÁLLÍTÁSA
   Írd be ide a saját Place ID-dat (az API-kulcsot az index.html
   tetején lévő <script> tagben add meg, YOUR_GOOGLE_MAPS_API_KEY helyén).
   Place ID kereső: https://developers.google.com/maps/documentation/places/web-service/place-id
============================================================ */
const GOOGLE_REVIEWS_CONFIG = {
  placeId: 'ChIJDd7VmdOJREcRBwebzdlcvNo',
};

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

/* ============================================================
   ÉLŐ GOOGLE-VÉLEMÉNYEK
   A Google Maps JavaScript API a Place Details lekérésnél
   legfeljebb 5, "legrelevánsabbnak" ítélt véleményt ad vissza —
   ez a Google oldali korlátozás, hivatalos API-val nem bővíthető.
============================================================ */
function starString(rating) {
  const full = Math.round(rating);
  return '★★★★★☆☆☆☆☆'.slice(5 - full, 10 - full);
}

function renderReviews(place) {
  const grid = document.getElementById('reviewsGrid');
  const summary = document.getElementById('reviewsSummary');
  const allLink = document.getElementById('reviewsAllLink');

  if (!place.reviews || place.reviews.length === 0) {
    grid.innerHTML = '<p class="reviews__status">Egyelőre nincs megjeleníthető Google-vélemény.</p>';
    return;
  }

  if (place.rating && place.userRatingCount) {
    summary.innerHTML =
      `<span class="stars" aria-hidden="true">${starString(place.rating)}</span>` +
      `${place.rating.toFixed(1)} / 5 — ${place.userRatingCount} Google-vélemény alapján`;
  }

  grid.innerHTML = '';
  place.reviews.slice(0, 5).forEach(review => {
    const card = document.createElement('blockquote');
    card.className = 'review reveal is-visible';

    const stars = document.createElement('div');
    stars.className = 'stars';
    stars.setAttribute('aria-hidden', 'true');
    stars.textContent = starString(review.rating || 5);

    const text = document.createElement('p');
    text.textContent = `„${review.text ?? ''}”`;

    const cite = document.createElement('cite');
    if (review.authorAttribution?.photoURI) {
      const avatar = document.createElement('img');
      avatar.className = 'review__avatar';
      avatar.src = review.authorAttribution.photoURI;
      avatar.alt = '';
      avatar.loading = 'lazy';
      cite.appendChild(avatar);
    }
    const authorLink = document.createElement('a');
    authorLink.href = review.authorAttribution?.uri || '#';
    authorLink.target = '_blank';
    authorLink.rel = 'noopener';
    authorLink.textContent = review.authorAttribution?.displayName || 'Google-felhasználó';
    cite.appendChild(authorLink);

    card.append(stars, text, cite);
    grid.appendChild(card);
  });

  if (place.googleMapsURI) {
    allLink.href = place.googleMapsURI;
  }
  allLink.hidden = false;
}

async function initGoogleReviews() {
  const grid = document.getElementById('reviewsGrid');
  const allLink = document.getElementById('reviewsAllLink');

  if (!GOOGLE_REVIEWS_CONFIG.placeId || GOOGLE_REVIEWS_CONFIG.placeId === 'YOUR_GOOGLE_PLACE_ID') {
    grid.innerHTML = '<p class="reviews__status">A Google-vélemények még nincsenek beállítva ezen az oldalon.</p>';
    allLink.hidden = false;
    return;
  }

  try {
    const { Place } = await google.maps.importLibrary('places');
    const place = new Place({ id: GOOGLE_REVIEWS_CONFIG.placeId });
    await place.fetchFields({ fields: ['rating', 'userRatingCount', 'reviews', 'googleMapsURI'] });
    renderReviews(place);
  } catch (err) {
    console.error('Google-vélemények betöltése sikertelen:', err);
    grid.innerHTML = '<p class="reviews__status">A vélemények most nem tölthetők be — nézd meg őket közvetlenül a Google-on.</p>';
    allLink.hidden = false;
  }
}

if (window.google?.maps) {
  initGoogleReviews();
} else {
  window.addEventListener('load', () => {
    // A Maps script aszinkron töltődik be; kis türelmi idő, majd próbálkozás.
    setTimeout(initGoogleReviews, 300);
  });
}
