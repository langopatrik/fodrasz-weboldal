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

/* Public Calendar availability */
const publicCalendarDataUrl = 'calendar-data.json';
const availabilityList = document.getElementById('availabilityList');

function parseIcsDate(value) {
  if (!value) return null;
  const cleaned = value.trim();

  if (/^\d{8}$/.test(cleaned)) {
    const year = Number(cleaned.slice(0, 4));
    const month = Number(cleaned.slice(4, 6)) - 1;
    const day = Number(cleaned.slice(6, 8));
    return new Date(year, month, day);
  }

  const match = cleaned.match(/^([0-9]{4})([0-9]{2})([0-9]{2})T([0-9]{2})([0-9]{2})([0-9]{2})(Z)?$/);
  if (!match) return null;

  const [, year, month, day, hours, minutes, seconds, isUtc] = match;

  if (isUtc === 'Z') {
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds)));
  }

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds)
  );
}

function parseIcsEvents(icsText) {
  const blocks = icsText.split('BEGIN:VEVENT');
  return blocks.slice(1).map((block) => {
    const startLine = block.match(/DTSTART[^:]*:(.+)/);
    const endLine = block.match(/DTEND[^:]*:(.+)/);
    const summaryLine = block.match(/SUMMARY:(.+)/);

    const start = startLine ? parseIcsDate(startLine[1].trim()) : null;
    const end = endLine ? parseIcsDate(endLine[1].trim()) : null;

    if (!start || !end) return null;

    return {
      title: summaryLine ? summaryLine[1].trim() : 'Foglalt időpont',
      start,
      end
    };
  }).filter(Boolean);
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatSlotDate(date) {
  return new Intl.DateTimeFormat('hu-HU', {
    month: 'short',
    day: 'numeric',
    weekday: 'short'
  }).format(date);
}

function formatSlotTime(date) {
  return new Intl.DateTimeFormat('hu-HU', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function buildAvailableSlots(events) {
  const availableByDay = new Map();
  const now = new Date();
  now.setMinutes(0, 0, 0);

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const dayStart = new Date(now);
    dayStart.setDate(now.getDate() + dayOffset);
    dayStart.setHours(6, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(20, 0, 0, 0);

    const blockedRanges = [];

    events.forEach((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      const overlapStart = new Date(Math.max(dayStart.getTime(), eventStart.getTime()));
      const overlapEnd = new Date(Math.min(dayEnd.getTime(), eventEnd.getTime()));

      if (overlapEnd > overlapStart) {
        blockedRanges.push({
          start: overlapStart,
          end: overlapEnd
        });
      }
    });

    const ranges = [];
    let cursor = new Date(dayStart);

    blockedRanges.sort((a, b) => a.start - b.start);

    blockedRanges.forEach((range) => {
      if (cursor < range.start) {
        ranges.push({
          start: new Date(cursor),
          end: new Date(range.start)
        });
      }
      if (range.end > cursor) {
        cursor = new Date(range.end);
      }
    });

    if (cursor < dayEnd) {
      ranges.push({
        start: new Date(cursor),
        end: new Date(dayEnd)
      });
    }

    const cleaned = ranges
      .filter((range) => range.end > range.start)
      .map((range) => {
        const start = new Date(range.start);
        const end = new Date(range.end);
        const startText = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
        const endText = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;

        return {
          date: formatDateInput(start),
          start: startText,
          end: endText,
          label: `${startText}–${endText}`,
          durationHours: Math.round((end - start) / 3600000)
        };
      });

    availableByDay.set(formatDateInput(dayStart), cleaned);
  }

  return availableByDay;
}

function renderAvailabilityCalendar(slotsByDay) {
  if (!availabilityList) return;

  const dayNames = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];
  const nextDays = Array.from(slotsByDay.keys()).slice(0, 7);

  if (!nextDays.length) {
    availabilityList.innerHTML = '<p class="availability__empty">Jelenleg nincs szabad időpont a közeljövőben.</p>';
    return;
  }

  availabilityList.innerHTML = nextDays.map((dateKey) => {
    const dayDate = new Date(`${dateKey}T12:00:00`);
    const dayName = dayNames[dayDate.getDay()];
    const daySlots = slotsByDay.get(dateKey) || [];

    return `
      <div class="availability__day">
        <p class="availability__day-label">${dayName}<br>${formatSlotDate(dayDate)}</p>
        <div class="availability__day-slots">
          ${daySlots.map((slot) => `
            <button type="button" class="availability__slot" data-date="${slot.date}" data-start="${slot.start}" data-end="${slot.end}" data-duration="${slot.durationHours}">${slot.label}</button>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  availabilityList.querySelectorAll('.availability__slot').forEach((button) => {
    button.addEventListener('click', () => {
      const dateInput = document.getElementById('date');
      const timeInput = document.getElementById('time');

      if (dateInput && timeInput) {
        dateInput.value = button.dataset.date;
        timeInput.value = button.dataset.start;
      }

      openContactModal();
    });
  });
}

function normalizeCalendarEvents(payload) {
  const items = Array.isArray(payload) ? payload : Array.isArray(payload?.events) ? payload.events : [];

  return items
    .map((event) => {
      const start = event?.start ? new Date(event.start) : null;
      const end = event?.end ? new Date(event.end) : null;

      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return null;
      }

      return {
        title: event?.title || 'Foglalt időpont',
        start,
        end
      };
    })
    .filter(Boolean);
}

async function loadCalendarAvailability() {
  if (!availabilityList) return;

  availabilityList.innerHTML = '<p class="availability__empty">Szabad időpontok betöltése…</p>';

  try {
    const response = await fetch(publicCalendarDataUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Hiba a naptár betöltésénél: ${response.status}`);
    }

    const payload = await response.json();
    const events = normalizeCalendarEvents(payload);
    const slotsByDay = buildAvailableSlots(events);

    if (!slotsByDay.size) {
      availabilityList.innerHTML = '<p class="availability__empty">Jelenleg nincs szabad időpont a közeljövőben.</p>';
      return;
    }

    renderAvailabilityCalendar(slotsByDay);
  } catch (error) {
    console.error(error);
    availabilityList.innerHTML = '<p class="availability__empty">A szabad időpontok betöltése jelenleg nem érhető el.</p>';
  }
}

setInterval(loadCalendarAvailability, 120000);

/* Contact form */
const form = document.getElementById('contactForm');
const status = document.getElementById('formStatus');

function getEndTime(startTime, durationHours) {
  if (!startTime || !durationHours) return '';

  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const totalMinutes = startMinutes + Number(durationHours) * 60;

  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

if (form && status) {
  const timeInput = document.getElementById('time');

  const messageInput = document.getElementById('message');

  if (messageInput) {
    messageInput.setAttribute('placeholder', 'Van valami konkrét elképzelésed?');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      status.textContent = 'Kérjük, tölts ki minden mezőt.';
      return;
    }

    status.textContent = 'Az űrlap elküldése folyamatban...';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('A Formspree elküldése sikertelen volt.');
      }

      form.reset();
      status.textContent = 'Köszönjük! Az üzenetedet elküldtük. Hamarosan válaszolunk.';
      setTimeout(() => {
        closeContactModal();
      }, 1600);
    } catch (error) {
      console.error(error);
      status.textContent = 'Sajnos az üzenet küldése közben hiba történt. Kérjük, próbáld meg újra vagy írj közvetlenül e-mailben.';
    }
  });
}

loadCalendarAvailability();

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

if (openContactBtn) {
  openContactBtn.addEventListener('click', openContactModal);
}

if (closeContactBtn) {
  closeContactBtn.addEventListener('click', closeContactModal);
}

if (contactOverlay) {
  contactOverlay.addEventListener('click', (e) => {
    if (e.target === contactOverlay) closeContactModal();
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && contactOverlay && !contactOverlay.hidden) closeContactModal();
});

if (form) {
  form.addEventListener('submit', () => {
    if (form.checkValidity()) {
      setTimeout(closeContactModal, 1200);
    }
  });
}

/* Contact form — no backend wired up yet, so just confirm receipt locally */
