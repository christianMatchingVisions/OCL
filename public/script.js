document.addEventListener('DOMContentLoaded', function () {
  // ── Hamburger menu ──
  var btn = document.querySelector('.hamburger');
  var nav = document.querySelector('nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.classList.toggle('open');
      nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(!expanded));
    });
  }

  // ── FAQ accordion ──
  document.querySelectorAll('.faq-q').forEach(function (q) {
    q.addEventListener('click', function () {
      q.parentElement.classList.toggle('open');
    });
  });

  // ── Casino filter ──
  var activeFilters = {};

  document.querySelectorAll('.filter-btn[data-filter]').forEach(function (filterBtn) {
    filterBtn.addEventListener('click', function () {
      var group = filterBtn.dataset.group;
      var filter = filterBtn.dataset.filter;

      document.querySelectorAll('.filter-btn[data-group="' + group + '"]').forEach(function (b) {
        b.classList.remove('active');
      });
      filterBtn.classList.add('active');

      if (filter === 'all') {
        delete activeFilters[group];
      } else {
        activeFilters[group] = filter;
      }

      applyFilters();
    });
  });

  function applyFilters() {
    var cards = document.querySelectorAll('.casino-card[data-tags]');
    var visible = 0;

    cards.forEach(function (card) {
      var tags = card.dataset.tags ? card.dataset.tags.split(',') : [];
      var show = true;

      Object.keys(activeFilters).forEach(function (group) {
        if (tags.indexOf(activeFilters[group]) === -1) show = false;
      });

      card.classList.toggle('hidden', !show);
      if (show) visible++;
    });

    var results = document.querySelector('.filter-results');
    if (results) {
      results.textContent = visible + (visible === 1 ? ' casino encontrado' : ' casinos encontrados');
    }
  }

  // ── Email form ──
  var emailForm = document.querySelector('.email-form');
  if (emailForm) {
    emailForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = emailForm.querySelector('.email-input');
      var submitBtn = emailForm.querySelector('.email-submit');
      if (input && input.value) {
        submitBtn.textContent = '¡Suscrito! ✓';
        submitBtn.style.background = 'var(--green)';
        input.value = '';
        input.disabled = true;
        submitBtn.disabled = true;
      }
    });
  }
});

/* ── Motion & polish enhancements (2026 refresh) ── */
document.addEventListener('DOMContentLoaded', function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Back-to-top button
  var toTop = document.createElement('button');
  toTop.className = 'back-to-top';
  toTop.setAttribute('aria-label', 'Volver arriba');
  toTop.textContent = '↑';
  toTop.addEventListener('click', function () {
    if (window.__lenis) window.__lenis.scrollTo(0, { duration: 1.1 });
    else window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  });
  document.body.appendChild(toTop);

  // Scroll progress bar + sticky header state
  var bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);
  var header = document.querySelector('header');
  var ticking = false;
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    if (header) header.classList.toggle('scrolled', h.scrollTop > 10);
    toTop.classList.toggle('show', h.scrollTop > 600);
  }
  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(function () { onScroll(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });
  onScroll();

  // Open the first FAQ item so the accordion is discoverable
  var firstFaq = document.querySelector('.faq-item');
  if (firstFaq) firstFaq.classList.add('open');

  if (reduced || !('IntersectionObserver' in window)) return;

  // Reveal-on-scroll, staggered per container
  var revealSel = '.casino-card,.top3-item,.section-header,.payment-item,.news-card,.rating-item,.faq-item,.country-intro,.game-card,.info-row,.review-verdict';
  var revealEls = document.querySelectorAll(revealSel);
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('reveal-in');
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  var perParent = new Map();
  revealEls.forEach(function (el) {
    var n = perParent.get(el.parentElement) || 0;
    perParent.set(el.parentElement, n + 1);
    el.classList.add('will-reveal');
    el.style.setProperty('--reveal-delay', Math.min(n, 5) * 75 + 'ms');
    io.observe(el);
  });

  // Animated stat counters (handles "50+", "50,000+", "100%", "7")
  var statIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      statIO.unobserve(e.target);
      var el = e.target;
      var m = el.textContent.trim().match(/^([^0-9]*)([\d.,]+)(.*)$/);
      if (!m) return;
      var target = parseFloat(m[2].replace(/,/g, ''));
      if (!isFinite(target)) return;
      var grouped = m[2].indexOf(',') > -1;
      var start = null, dur = 1300;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var val = Math.round(target * eased);
        el.textContent = m[1] + (grouped ? val.toLocaleString('en-US') : String(val)) + m[3];
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stat-num').forEach(function (el) { statIO.observe(el); });
});

/* ── Lenis smooth scrolling + hero parallax ── */
document.addEventListener('DOMContentLoaded', function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Buttery momentum scrolling (skip if the vendor bundle failed to load)
  if (typeof window.Lenis === 'function') {
    var lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    window.__lenis = lenis;
    (function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    })();
    // Same-page anchors glide instead of jumping
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        var target = id.length > 1 && document.querySelector(id);
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target, { offset: -90, duration: 1.1 });
        }
      });
    });
  }

  // Parallax: only on the tall homepage-style hero, not the compact page heroes
  var hero = document.querySelector('.hero:not(.page-hero)');
  if (!hero) return;
  var content = hero.querySelector('.hero-content');

  // Floating casino symbols at different depths
  var deco = document.createElement('div');
  deco.className = 'hero-deco';
  deco.setAttribute('aria-hidden', 'true');
  var symbols = ['♠', '♥', '♦', '♣', '7', '★', '♠', '♦'];
  var layers = [];
  symbols.forEach(function (s, i) {
    var el = document.createElement('span');
    el.textContent = s;
    el.style.left = (4 + (i * 12.3) % 90) + '%';
    el.style.top = (8 + (i * 23.7) % 76) + '%';
    el.style.setProperty('--deco-size', (1.4 + (i % 3) * 1.2) + 'rem');
    el.style.setProperty('--float-dur', (6 + (i % 5)) + 's');
    el.style.setProperty('--float-delay', (-i * 1.3) + 's');
    if (s === '♥' || s === '♦') el.style.color = '#c4596b';
    deco.appendChild(el);
    layers.push({ el: el, depth: 0.22 + (i % 4) * 0.16 });
  });
  hero.insertBefore(deco, hero.firstChild);

  var ticking = false;
  function parallax() {
    var y = window.scrollY;
    var limit = hero.offsetHeight + 100;
    if (y <= limit) {
      if (content) {
        content.style.transform = 'translateY(' + y * 0.16 + 'px)';
        content.style.opacity = String(Math.max(1 - y / (limit * 1.15), 0));
      }
      layers.forEach(function (l) {
        l.el.style.transform = 'translateY(' + y * l.depth + 'px)';
      });
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { requestAnimationFrame(parallax); ticking = true; }
  }, { passive: true });
  parallax();
});
