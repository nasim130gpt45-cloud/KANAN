(function () {
  const header = document.querySelector('.site-header');
  const nav = document.getElementById('primary-nav');
  const toggle = document.querySelector('.menu-toggle');

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mqMobile = window.matchMedia('(max-width: 900px)');

  const setHeaderShadow = () => {
    header?.classList.toggle('scrolled', window.scrollY > 8);
  };

  // ===== Mobile Nav: open/close + focus trap + a11y =====
  let lastFocusedEl = null;

  const isMobile = () => mqMobile.matches;

  const setNavA11y = (open) => {
    if (!nav) return;

    const supportsInert = 'inert' in HTMLElement.prototype;

    if (isMobile()) {
      if (!open) {
        // Prevent screen readers focus when closed
        nav.setAttribute('aria-hidden', 'true');

        // Use inert only if supported (Safari safe)
        if (supportsInert) nav.setAttribute('inert', '');

        // Fallback: remove tab focus from focusable elements
        nav.querySelectorAll('a[href], button:not([disabled]), [tabindex]').forEach((el) => {
          el.dataset.prevTab = el.getAttribute('tabindex') ?? '';
          el.setAttribute('tabindex', '-1');
        });

      } else {
        nav.setAttribute('aria-hidden', 'false');
        if (supportsInert) nav.removeAttribute('inert');

        // Restore previous tabindex values
        nav.querySelectorAll('a[href], button:not([disabled]), [tabindex]').forEach((el) => {
          if ('prevTab' in el.dataset) {
            const prev = el.dataset.prevTab;
            if (prev === '') el.removeAttribute('tabindex');
            else el.setAttribute('tabindex', prev);
            delete el.dataset.prevTab;
          } else {
            el.removeAttribute('tabindex');
          }
        });
      }
    } else {
      nav.removeAttribute('aria-hidden');
      if (supportsInert) nav.removeAttribute('inert');

      // Ensure everything is focusable on desktop
      nav.querySelectorAll('a[href], button:not([disabled]), [tabindex]').forEach((el) => {
        if ('prevTab' in el.dataset) delete el.dataset.prevTab;
        el.removeAttribute('tabindex');
      });
    }
  };

  const setNavOpen = (open) => {
    if (!nav || !toggle) return;

    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');

    setNavA11y(open);

    if (isMobile()) {
      document.documentElement.style.overflow = open ? 'hidden' : '';
      document.body.style.overflow = open ? 'hidden' : '';

      if (open) {
        lastFocusedEl = document.activeElement;
        const first = nav.querySelector('a[href]');
        first?.focus({ preventScroll: true });
      } else {
        (lastFocusedEl && lastFocusedEl.focus)
          ? lastFocusedEl.focus({ preventScroll: true })
          : toggle.focus({ preventScroll: true });
      }
    }
  };

  const isNavOpen = () => toggle?.getAttribute('aria-expanded') === 'true';

  toggle?.addEventListener('click', () => {
    setNavOpen(!isNavOpen());
  });

  // Close nav when clicking outside (mobile)
  document.addEventListener('click', (e) => {
    if (!isMobile()) return;
    if (!isNavOpen()) return;

    const t = e.target;
    const inside = header?.contains(t) || nav?.contains(t);
    if (!inside) setNavOpen(false);
  });

  // Escape closes nav
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (isMobile() && isNavOpen()) setNavOpen(false);
  });

  // Focus trap when nav is open on mobile
  document.addEventListener('keydown', (e) => {
    if (!isMobile() || !isNavOpen()) return;
    if (e.key !== 'Tab') return;

    const focusables = nav.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // Reset nav states on breakpoint change
  const onBreakpoint = () => {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    setNavOpen(false);
    setNavA11y(false);
  };
  mqMobile.addEventListener?.('change', onBreakpoint);

  // ===== Smooth scroll with header offset + close nav on link click =====
  document.addEventListener('click', (e) => {
    const a = e.target?.closest?.('a[href^="#"]');
    if (!a) return;

    const href = a.getAttribute('href');
    if (!href || href === '#') return;

    const targetEl = document.querySelector(href);
    if (!targetEl) return;

    e.preventDefault();

    const headerH = header?.offsetHeight || 0;
    const y = targetEl.getBoundingClientRect().top + window.scrollY - headerH - 12;

    window.scrollTo({ top: y, behavior: prefersReduced ? 'auto' : 'smooth' });

    if (isMobile() && isNavOpen()) setNavOpen(false);

    history.pushState(null, '', href);
  });

  // ===== Reveal on scroll =====
  const revealEls = Array.from(document.querySelectorAll('.reveal'));
  revealEls.forEach((el) => {
    const d = el.getAttribute('data-delay');
    if (d) el.style.setProperty('--delay', `${Number(d)}ms`);
  });

  if (!prefersReduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  // ===== Active nav link (sections) =====
  const navLinks = Array.from(document.querySelectorAll('#primary-nav a[href^="#"]'))
    .filter(a => a.getAttribute('href') && a.getAttribute('href').length > 1);

  const sections = Array.from(document.querySelectorAll('main section[id]'));

  const setActiveLink = (id) => {
    navLinks.forEach(a => a.removeAttribute('aria-current'));
    const active = navLinks.find(a => a.getAttribute('href') === `#${id}`);
    active?.setAttribute('aria-current', 'page');
  };

  if ('IntersectionObserver' in window && sections.length) {
    const headerH = header?.offsetHeight || 0;
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveLink(entry.target.id);
      });
    }, { rootMargin: `-${headerH + 40}px 0px -60% 0px`, threshold: 0.12 });

    sections.forEach(sec => spy.observe(sec));
  }

  // ===== Header shadow =====
  setHeaderShadow();
  window.addEventListener('scroll', setHeaderShadow, { passive: true });

  // ===== Footer year =====
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ===== Initial a11y state =====
  setNavA11y(false);
})();