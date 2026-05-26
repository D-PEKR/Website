/**
 * main.js — Persönliche Motorrad-Website
 *
 * Module (IIFE-Struktur, kein globales Namespace-Chaos):
 *   1.  Cursor        – custom animated cursor
 *   2.  Navigation    – page switching, scroll styling, mobile drawer
 *   3.  Hero          – entrance animations, scroll-based morph effect
 *   4.  ScrollReveal  – IntersectionObserver für fade-in Elemente
 *   5.  Gallery       – filter + lightbox
 *   6.  GSAP          – erweiterte Entrance-Animationen (wenn verfügbar)
 */

'use strict';

/* ═══════════════════════════════════════════════════════
   1. CURSOR
   Zweiteiliger Custom-Cursor: Punkt folgt direkt,
   Ring folgt mit weichem Lag (Lerp).
═══════════════════════════════════════════════════════ */
const Cursor = (() => {

  const dot  = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');

  // Current mouse position
  let mx = 0, my = 0;
  // Interpolated ring position
  let rx = 0, ry = 0;

  // Lerp factor — höher = schneller
  const LERP = 0.14;

  function onMouseMove(e) {
    mx = e.clientX;
    my = e.clientY;
  }

  function animate() {
    // Dot folgt sofort
    dot.style.left = `${mx}px`;
    dot.style.top  = `${my}px`;

    // Ring interpoliert weich nach
    rx += (mx - rx) * LERP;
    ry += (my - ry) * LERP;
    ring.style.left = `${rx}px`;
    ring.style.top  = `${ry}px`;

    requestAnimationFrame(animate);
  }

  function init() {
    if (!dot || !ring) return;
    document.addEventListener('mousemove', onMouseMove);
    animate();
  }

  return { init };

})();


/* ═══════════════════════════════════════════════════════
   2. NAVIGATION
   - SPA-artiges Page-Switching (Sichtbarkeit via CSS-Klasse)
   - Nav-Bar wird bei Scroll dunkel
   - Mobile Hamburger / Drawer
═══════════════════════════════════════════════════════ */
const Navigation = (() => {

  const mainNav   = document.getElementById('mainNav');
  const navDrawer = document.getElementById('navDrawer');

  /**
   * Zeigt eine Seite an, versteckt alle anderen.
   * Wird global benötigt (onclick-Attribute im HTML).
   *
   * @param {string} id  — Page-ID ohne "page-" Präfix
   */
  function showPage(id) {
    // Alle Pages ausblenden
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Ziel einblenden
    const target = document.getElementById(`page-${id}`);
    if (target) {
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'instant' });

      // Reveal-Observer für neue Seite neu initialisieren
      setTimeout(() => ScrollReveal.init(), 80);

      // GSAP ScrollTrigger-Kontext zurücksetzen (falls aktiv)
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
      }
    }

    // Aktiven Nav-Link markieren
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.classList.toggle('active', a.dataset.page === id);
    });
  }

  /** Mobile Drawer ein- / ausklappen */
  function toggleDrawer() {
    navDrawer?.classList.toggle('open');
  }

  /** Nav-Bar auf dunklen Hintergrund schalten sobald gescrollt */
  function handleScroll() {
    mainNav?.classList.toggle('scrolled', window.scrollY > 40);
  }

  function init() {
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Drawer: Klick außerhalb schließt
    navDrawer?.addEventListener('click', e => {
      if (e.target === navDrawer) toggleDrawer();
    });
  }

  // Öffentlich — wird von onclick-Attributen im HTML benötigt
  return { init, showPage, toggleDrawer };

})();

// Auf window exponieren (für HTML-onclick-Attribute)
window.showPage    = Navigation.showPage;
window.toggleDrawer = Navigation.toggleDrawer;


/* ═══════════════════════════════════════════════════════
   3. HERO
   3a. Entrance-Animationen (Texte rechts/links einblenden)
   3b. Morph-Effekt (Scroll-basiertes Überblenden zweier Bilder)
═══════════════════════════════════════════════════════ */
const Hero = (() => {

  /* ── 3a. Entrance ── */
  function initEntrance() {
    const left  = document.getElementById('heroLeft');
    const right = document.getElementById('heroRight');

    setTimeout(() => left?.classList.add('visible'),  600);
    setTimeout(() => right?.classList.add('visible'), 900);
  }

  /* ── 3b. Scroll Morph ── */
  function initMorph() {
    const morphSection = document.getElementById('morphSection');
    const morphB       = document.getElementById('morphB');

    if (!morphSection || !morphB) return;

    function updateMorph() {
      const rect = morphSection.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;

      if (scrollable <= 0) return;

      // pct: 0 = oben sichtbar, 1 = unten sichtbar
      const pct = Math.max(0, Math.min(1, -rect.top / scrollable));
      morphB.style.opacity = pct;
    }

    window.addEventListener('scroll', updateMorph, { passive: true });
    updateMorph(); // Initial einmal auswerten
  }

  function init() {
    initEntrance();
    initMorph();
  }

  return { init };

})();


/* ═══════════════════════════════════════════════════════
   4. SCROLL REVEAL
   IntersectionObserver beobachtet alle .reveal,
   .reveal-left und .reveal-right Elemente innerhalb
   der aktuell aktiven Page.
═══════════════════════════════════════════════════════ */
const ScrollReveal = (() => {

  let observer = null;

  const SELECTOR = [
    '.page.active .reveal',
    '.page.active .reveal-left',
    '.page.active .reveal-right',
  ].join(', ');

  const OPTIONS = {
    threshold:  0.12,
    rootMargin: '0px 0px -40px 0px',
  };

  function onIntersect(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Nach dem Einblenden nicht mehr beobachten (Performance)
        observer.unobserve(entry.target);
      }
    });
  }

  /** Neu-Initialisierung bei jedem Page-Wechsel */
  function init() {
    // Alten Observer sauber trennen
    if (observer) observer.disconnect();

    observer = new IntersectionObserver(onIntersect, OPTIONS);

    document.querySelectorAll(SELECTOR).forEach(el => {
      // Bereits sichtbare Elemente überspringen
      if (!el.classList.contains('visible')) {
        observer.observe(el);
      }
    });
  }

  return { init };

})();


/* ═══════════════════════════════════════════════════════
   5. GALLERY
   5a. Filter — blendet Items nach data-cat ein/aus
   5b. Lightbox — Vollbild-Ansicht mit Navigation
═══════════════════════════════════════════════════════ */
const Gallery = (() => {

  /* ── 5a. Filter ── */
  function initFilter() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        // Aktiven Button wechseln
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        const filter = this.dataset.filter;

        document.querySelectorAll('.gallery-item').forEach(item => {
          const matches = filter === 'all' || item.dataset.cat === filter;

          if (matches) {
            item.style.display  = '';
            item.style.opacity  = '0';
            // Micro-Verzögerung damit der Browser das display:'' verarbeitet
            requestAnimationFrame(() => {
              item.style.transition = 'opacity .4s ease';
              item.style.opacity    = '1';
            });
          } else {
            item.style.display = 'none';
          }
        });
      });
    });
  }

  /* ── 5b. Lightbox ── */
  let items   = [];  // aktuelle (sichtbare) Gallery-Items
  let current = 0;   // Index des angezeigten Bildes

  const lb      = document.getElementById('lightbox');
  const lbImg   = document.getElementById('lightboxImg');
  const lbCount = document.getElementById('lightboxCounter');

  /** Gibt alle aktuell sichtbaren Gallery-Items zurück */
  function getVisibleItems() {
    return Array.from(
      document.querySelectorAll('.gallery-item')
    ).filter(el => el.style.display !== 'none');
  }

  function open() {
    items = getVisibleItems();
    updateImage();
    lb?.classList.add('open');
  }

  function close() {
    lb?.classList.remove('open');
  }

  function navigate(dir) {
    if (!items.length) return;
    current = (current + dir + items.length) % items.length;

    if (!lbImg) return;
    lbImg.style.opacity = '0';
    setTimeout(() => {
      updateImage();
      lbImg.style.transition = 'opacity .3s ease';
      lbImg.style.opacity    = '1';
    }, 150);
  }

  function updateImage() {
    if (lbImg)   lbImg.src = items[current]?.dataset.src || '';
    if (lbCount) lbCount.textContent = `${current + 1} / ${items.length}`;
  }

  function initLightbox() {
    if (!lb) return;

    // Klick auf Item öffnet Lightbox
    document.querySelectorAll('.gallery-item').forEach((item, i) => {
      item.addEventListener('click', () => {
        items   = getVisibleItems();
        current = items.indexOf(item);
        if (current < 0) current = i % items.length;
        open();
      });
    });

    // Klick auf Hintergrund schließt
    lb.addEventListener('click', e => {
      if (e.target === lb) close();
    });

    // Tastatursteuerung
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape')     close();
      if (e.key === 'ArrowRight') navigate(+1);
      if (e.key === 'ArrowLeft')  navigate(-1);
    });
  }

  // Öffentlich (für onclick im HTML)
  function init() {
    initFilter();
    initLightbox();
  }

  return { init, close, navigate };

})();

// Auf window exponieren (für onclick im Lightbox-HTML)
window.closeLightbox = Gallery.close;
window.lightboxNav   = Gallery.navigate;


/* ═══════════════════════════════════════════════════════
   6. GSAP ANIMATIONS
   Nur wenn GSAP + ScrollTrigger geladen sind.
   Entrance-Sequenz für den Hero beim Seitenaufruf.
═══════════════════════════════════════════════════════ */
const GSAPAnimations = (() => {

  function init() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    // Hero: Name fährt von oben ein
    gsap.from('.hero-name', {
      duration: 1.4,
      opacity:  0,
      y:        -20,
      ease:     'power3.out',
      delay:    0.3,
    });

    // Hero: Trennlinien wachsen vom Mittelpunkt
    gsap.from('.hero-divider', {
      duration:        1.2,
      scaleY:          0,
      ease:            'power3.out',
      delay:           0.5,
      transformOrigin: 'top',
    });

    // Scroll-Indikator erscheint zuletzt
    gsap.from('.hero-scroll', {
      duration: 1.0,
      opacity:  0,
      y:        10,
      ease:     'power2.out',
      delay:    1.2,
    });
  }

  return { init };

})();


/* ═══════════════════════════════════════════════════════
   INIT — Startet alle Module sobald DOM bereit
═══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  Cursor.init();
  Navigation.init();
  Hero.init();
  ScrollReveal.init();
  Gallery.init();
  GSAPAnimations.init();
});
