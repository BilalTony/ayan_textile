/* =============================================================================
   Ayan Textile — site behaviour
   Vanilla, no dependencies. Everything degrades: with JS off the carousels
   are still swipeable (CSS scroll-snap) and every image still loads.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --------------------------------------------------------- carousels -- */

  var carousels = {};          // root id -> control API

  function Carousel(root) {
    var track = root.querySelector('[data-track]');
    if (!track) return;

    var slides = Array.prototype.slice.call(track.children);
    if (slides.length < 2) return;

    var dotsBox = root.querySelector('[data-dots]');
    var controls = root.id
      ? document.querySelector('[data-controls-for="' + root.id + '"]')
      : null;
    var scope = controls || root;
    var prevBtn = scope.querySelector('[data-prev]');
    var nextBtn = scope.querySelector('[data-next]');

    var loop = root.hasAttribute('data-autoplay');
    var delay = parseInt(root.getAttribute('data-autoplay'), 10) || 0;
    var index = 0;
    var timer = null;
    var ticking = false;
    var dots = [];

    function step() {
      // Real distance between slide starts — survives any gap/width change.
      return slides.length > 1
        ? slides[1].offsetLeft - slides[0].offsetLeft
        : slides[0].offsetWidth;
    }

    function maxScroll() {
      return track.scrollWidth - track.clientWidth;
    }

    /* Which slide is showing, derived from scroll position */
    function currentIndex() {
      var s = step();
      if (!s) return 0;
      if (track.scrollLeft >= maxScroll() - 2) return slides.length - 1;
      return Math.round(track.scrollLeft / s);
    }

    function goTo(i, smooth) {
      var s = step();
      var target = Math.max(0, Math.min(i, slides.length - 1));
      track.scrollTo({
        left: Math.min(target * s, maxScroll()),
        behavior: smooth === false || reduceMotion ? 'auto' : 'smooth'
      });
    }

    function sync() {
      index = currentIndex();

      dots.forEach(function (d, i) {
        d.setAttribute('aria-current', i === index ? 'true' : 'false');
        d.setAttribute('tabindex', i === index ? '0' : '-1');
      });

      if (!loop) {
        if (prevBtn) prevBtn.disabled = track.scrollLeft <= 2;
        if (nextBtn) nextBtn.disabled = track.scrollLeft >= maxScroll() - 2;
      }
    }

    /* Build the dots */
    if (dotsBox) {
      slides.forEach(function (_, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'carousel__dot';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-label', 'Slide ' + (i + 1));
        b.addEventListener('click', function () {
          stop();
          goTo(i);
        });
        dotsBox.appendChild(b);
        dots.push(b);
      });
    }

    function next() {
      if (loop && track.scrollLeft >= maxScroll() - 2) return goTo(0);
      goTo(currentIndex() + 1);
    }
    function prev() {
      if (loop && track.scrollLeft <= 2) return goTo(slides.length - 1);
      goTo(currentIndex() - 1);
    }

    if (nextBtn) nextBtn.addEventListener('click', function () { stop(); next(); });
    if (prevBtn) prevBtn.addEventListener('click', function () { stop(); prev(); });

    /* Keyboard, when the track itself has focus */
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); stop(); next(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); stop(); prev(); }
    });

    /* rAF-throttled so fast scrolling never floods the main thread */
    track.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { sync(); ticking = false; });
    }, { passive: true });

    /* ------------------------------------------------------- autoplay -- */

    function start() {
      if (!delay || reduceMotion || timer) return;
      timer = setInterval(next, delay);
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    if (delay && !reduceMotion) {
      root.addEventListener('pointerenter', stop);
      root.addEventListener('pointerleave', start);
      root.addEventListener('focusin', stop);
      track.addEventListener('touchstart', stop, { passive: true });
      document.addEventListener('visibilitychange', function () {
        document.hidden ? stop() : start();
      });

      // Only run while the carousel is actually on screen.
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries[0].isIntersecting ? start() : stop();
        }, { threshold: 0.25 }).observe(root);
      } else {
        start();
      }
    }

    window.addEventListener('resize', debounce(function () { goTo(index, false); }, 150));
    sync();

    /* A carousel inside a hidden tab panel measures zero, so every position is
       wrong until its range is opened. The tab code calls refresh() then. */
    if (root.id) {
      carousels[root.id] = {
        refresh: function () { goTo(0, false); sync(); start(); },
        stop: stop
      };
    }
  }

  /* ------------------------------------------------------------ utils -- */

  function debounce(fn, wait) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, wait);
    };
  }

  /* ------------------------------------------------------------ init --- */

  document.querySelectorAll('[data-carousel]').forEach(Carousel);


  /* -------------------------------------------------- product ranges --- */
  /* Category tiles are an ARIA tablist. Switching is instant: the panels are
     already in the DOM, and each hidden panel's images have loading="lazy",
     so a range's photos are not fetched until someone opens that range.      */

  var tabs = Array.prototype.slice.call(document.querySelectorAll('.cat[role="tab"]'));

  if (tabs.length) {
    var panelFor = function (tab) {
      return document.getElementById(tab.getAttribute('aria-controls'));
    };

    var select = function (tab, opts) {
      opts = opts || {};
      if (!tab) return;

      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.setAttribute('tabindex', on ? '0' : '-1');
        var p = panelFor(t);
        if (p) p.hidden = !on;

        var car = carousels['carousel-' + t.dataset.cat];
        if (!car) return;
        if (on) requestAnimationFrame(car.refresh);   // now measurable
        else car.stop();                              // do not autoplay unseen
      });

      if (opts.focus) tab.focus();

      if (opts.push) {
        var hash = '#' + tab.dataset.cat;
        if (location.hash !== hash) history.pushState({ cat: tab.dataset.cat }, '', hash);

        /* On a narrow screen the three tiles fill the view, so the grid this
           click just changed is off-screen. Bring it up only when it is not
           already visible — on desktop this does nothing. */
        var panel = panelFor(tab);
        if (panel) {
          var top = panel.getBoundingClientRect().top;
          if (top > window.innerHeight * 0.7) {
            panel.scrollIntoView({
              behavior: reduceMotion ? 'auto' : 'smooth', block: 'start'
            });
          }
        }
      }
    };

    var tabFor = function (cat) {
      return tabs.filter(function (t) { return t.dataset.cat === cat; })[0];
    };

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab, { push: true }); });

      // Left/right/home/end move between ranges, per the ARIA tabs pattern.
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (!next) return;
        e.preventDefault();
        select(next, { focus: true, push: true });
      });
    });

    /* Open the range named in the URL (#fabric, #home-decor, #accessories),
       and keep the browser Back button working. */
    var fromHash = function (push) {
      var cat = location.hash.replace('#', '');
      var tab = tabFor(cat);
      if (tab) { select(tab, { push: false }); return tab; }
      return null;
    };

    if (fromHash()) {
      // Deep link: bring the section into view once layout has settled.
      requestAnimationFrame(function () {
        document.getElementById('products').scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth', block: 'start'
        });
      });
    }
    window.addEventListener('popstate', function () { fromHash(); });

    // Footer links point at ranges; let them switch the tab instead of jumping.
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      var cat = a.getAttribute('href').slice(1);
      if (!tabFor(cat)) return;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        select(tabFor(cat), { push: true });
        document.getElementById('products').scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth', block: 'start'
        });
      });
    });
  }

  /* --------------------------------------------- expanding spec panels -- */

  document.querySelectorAll('.product__head').forEach(function (head) {
    var spec = document.getElementById(head.getAttribute('aria-controls'));
    var inner = spec && spec.querySelector('.product__spec-inner');
    if (!inner) return;

    // Closed content must not be reachable by keyboard or screen readers.
    inner.inert = true;

    head.addEventListener('click', function () {
      var open = head.getAttribute('aria-expanded') === 'true';
      head.setAttribute('aria-expanded', String(!open));
      inner.inert = open;
    });
  });

  /* -------------------------------- "Enquire about this" pre-fills form -- */

  document.querySelectorAll('[data-enquire]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var product = link.dataset.enquire;
      var range = link.dataset.range;
      var interest = document.getElementById('f-interest');
      var message = document.getElementById('f-message');

      if (interest) {
        Array.prototype.forEach.call(interest.options, function (o) {
          if (o.text === range) interest.value = o.value || o.text;
        });
      }
      if (message && !message.value.trim()) {
        message.value = 'I would like more information about ' + product + '.\n\n';
      }

      e.preventDefault();
      document.getElementById('enquiry').scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth', block: 'start'
      });
      // Focus the first empty field once the scroll has finished.
      setTimeout(function () {
        var name = document.getElementById('f-name');
        if (name && !name.value) name.focus({ preventScroll: true });
      }, reduceMotion ? 0 : 600);
    });
  });

  /* ----------------------------------------------------------- header -- */

  var header = document.getElementById('header');
  if (header) {
    var stuck = false;
    var onScroll = function () {
      var should = window.scrollY > 12;
      if (should !== stuck) {
        stuck = should;
        header.classList.toggle('is-stuck', stuck);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ----------------------------------------------------------- drawer -- */

  var burger = document.getElementById('burger');
  var drawer = document.getElementById('drawer');
  if (burger && drawer) {
    var setOpen = function (open) {
      drawer.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.style.overflow = open ? 'hidden' : '';
    };

    burger.addEventListener('click', function () {
      setOpen(burger.getAttribute('aria-expanded') !== 'true');
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) setOpen(false);
    });
  }

  /* ----------------------------------------------------------- reveal -- */

  var revealables = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window) || reduceMotion) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);          // one-shot; keeps the observer cheap
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------- year -- */

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------- form -- */

  var form = document.getElementById('enquiry-form');
  if (form) {
    var status = document.getElementById('form-status');
    var submit = document.getElementById('form-submit');
    var started = document.getElementById('f-started');
    if (started) started.value = String(Date.now());

    var say = function (msg, state) {
      status.textContent = msg;
      status.setAttribute('data-state', state || '');
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var data = Object.fromEntries(new FormData(form).entries());

      if (!data.name || !data.email || !data.message) {
        return say('Please fill in your name, email and message.', 'error');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) {
        return say('That email address does not look right.', 'error');
      }

      submit.disabled = true;
      say('Sending…', 'busy');

      fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            return { ok: res.ok, body: body };
          });
        })
        .then(function (r) {
          if (!r.ok) throw new Error(r.body.error || 'Could not send right now.');
          form.reset();
          if (started) started.value = String(Date.now());
          say('Thank you — we will reply shortly.', 'ok');
        })
        .catch(function (err) {
          say(err.message + ' You can also email info@ayantextile.com.', 'error');
        })
        .finally(function () {
          submit.disabled = false;
        });
    });
  }
})();
