/* =============================================================================
   Ayan Textile — public site.

   Drives both pages — the home page and /products. Two halves:
     render()  paints whatever slots this page has, from GET /api/content
     init()    the behaviour — carousels, drawer, form. Runs after render.

   No dependencies, no build step. If the API is unreachable the page still
   shows its header, hero copy and contact form; the data-driven sections
   simply stay hidden.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var slot = function (name) { return document.querySelector('[data-slot="' + name + '"]'); };

  var esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  var fill = function (name, value, html) {
    var node = slot(name);
    if (!node || value == null || value === '') return;
    // ponytail: heroTitle and quote are allowed inline <em>/<span>; only the
    // signed-in admin can write them, so they are trusted markup.
    if (html) node.innerHTML = value; else node.textContent = value;
  };

  var show = function (section) {
    var node = document.querySelector('[data-section="' + section + '"]');
    if (node) node.hidden = false;
  };

  /* =======================================================================
     render — every piece is a no-op when its slot is not on this page, so
     the home page, /products and /product all share one script.
     ==================================================================== */

  function render(data) {
    var settings = data.settings || {};
    var products = data.products || [];
    var categories = data.categories || [];

    fill('heroEyebrow', settings.heroEyebrow);
    fill('heroTitle', settings.heroTitle, true);
    fill('heroLede', settings.heroLede);
    fill('footerBlurb', settings.footerBlurb);
    fill('tagline', settings.tagline);

    heroSlides(data.hero || []);
    quote(settings.quote);
    mill(data.mill || []);
    about(data.about || {});
    contact(settings);
    footerLinks(categories);
    interests(categories);

    rangeTiles(categories, products);          // home: tabs · /products: jump links
    panels(categories, products);              // home only — the carousels
    catalogue(categories, products);           // /products only — the full grid
    closer(data.about || {});
    detail(data);                              // /product only
  }

  function img(src, alt, w, h, eager) {
    if (!src) return '';
    return '<img src="' + esc(src) + '" alt="' + esc(alt) + '" width="' + w + '" height="' + h + '" ' +
      (eager ? 'fetchpriority="high"' : 'loading="lazy"') + ' decoding="async">';
  }

  function heroSlides(items) {
    var track = slot('hero');
    if (!track || !items.length) return;
    track.innerHTML = items.map(function (s, i) {
      return '<div class="carousel__slide" role="group" aria-roledescription="slide" aria-label="' +
        (i + 1) + ' of ' + items.length + '">' +
        img(s.image, s.alt, 1920, 1080, i === 0) + '</div>';
    }).join('');
  }

  function quote(text) {
    if (!text) return;
    fill('quote', text, true);
    show('quote');
  }

  /* ------------------------------------------------------- products ---- */

  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  var nameOf = function (p) { return p.name + (p.variant ? ' (' + p.variant + ')' : ''); };
  var pageOf = function (p) { return '/product?id=' + encodeURIComponent(p._id); };
  var inRange = function (products, key) {
    return products.filter(function (p) { return p.category === key; });
  };

  /** One card. The whole thing is a link to that product's own page. */
  function card(p) {
    return '<a class="product product--link" href="' + pageOf(p) + '">' +
      '<span class="frame ratio-4-5">' + img(p.image, p.alt || nameOf(p), 800, 1000) + '</span>' +
      '<span class="product__head">' +
      '<span class="product__text">' +
      (p.variant ? '<span class="product__variant">' + esc(p.variant) + '</span>' : '') +
      '<span class="product__name">' + esc(p.name) + '</span>' +
      (p.line ? '<span class="product__line">' + esc(p.line) + '</span>' : '') +
      '</span>' +
      '<svg class="product__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
      '</span></a>';
  }

  /* The range tiles are a tablist on the home page, where they switch the
     carousels, and plain jump links on /products, which has no panels. */
  function rangeTiles(categories, products) {
    var box = slot('cats');
    if (!box || !categories.length) return;
    var asTabs = !!slot('panels');

    box.innerHTML = categories.map(function (c, i) {
      var n = inRange(products, c.key).length;
      var open = asTabs
        ? '<button class="cat" type="button" role="tab" id="tab-' + esc(c.key) + '" data-cat="' + esc(c.key) + '"' +
          ' aria-controls="panel-' + esc(c.key) + '" aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '">'
        : '<a class="cat cat--link" href="#range-' + esc(c.key) + '">';

      return open +
        '<span class="frame cat__frame">' + img(c.image, c.title, 1200, 1500) + '</span>' +
        '<span class="card__veil"></span>' +
        '<span class="cat__body">' +
        '<span class="cat__count">' + n + ' product' + (n === 1 ? '' : 's') + '</span>' +
        '<span class="cat__title">' + esc(c.title) + '</span>' +
        '<span class="cat__blurb">' + esc(c.blurb) + '</span>' +
        '</span>' + (asTabs ? '</button>' : '</a>');
    }).join('');
  }

  /** Home page: one carousel per range, behind the tiles. */
  function panels(categories, products) {
    var box = slot('panels');
    if (!box || !categories.length) return;

    box.innerHTML = categories.map(function (c, i) {
      var items = inRange(products, c.key);
      return '<div class="panel" id="panel-' + esc(c.key) + '" role="tabpanel" aria-labelledby="tab-' + esc(c.key) + '"' +
        ' tabindex="0"' + (i === 0 ? '' : ' hidden') + '>' +
        '<div class="panel__bar">' +
        '<p class="panel__count"><span>' + items.length + '</span> product' + (items.length === 1 ? '' : 's') + ' in ' + esc(c.title) + '</p>' +
        '<div class="carousel__controls" data-controls-for="carousel-' + esc(c.key) + '">' + arrows('product') + '</div>' +
        '</div>' +
        '<div class="carousel carousel--products" id="carousel-' + esc(c.key) + '" data-carousel data-autoplay="4000"' +
        ' aria-roledescription="carousel" aria-label="' + esc(c.title) + ' products">' +
        '<div class="carousel__track" data-track tabindex="0">' +
        items.map(function (p) {
          return '<div class="carousel__slide" role="group" aria-roledescription="slide">' + card(p) + '</div>';
        }).join('') +
        '</div><div class="carousel__dots" data-dots role="tablist" aria-label="Choose product"></div>' +
        '</div></div>';
    }).join('');

    show('products');
  }

  function arrows(what) {
    return '<button class="carousel__btn" data-prev type="button" aria-label="Previous ' + what + '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
      '<button class="carousel__btn" data-next type="button" aria-label="Next ' + what + '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>';
  }

  /** /products: every range as a plain grid, nothing hidden behind a tab. */
  function catalogue(categories, products) {
    var box = slot('catalogue');
    if (!box || !categories.length) return;

    box.innerHTML = categories.map(function (c) {
      var items = inRange(products, c.key);
      if (!items.length) return '';
      return '<section class="section section--tight range" id="range-' + esc(c.key) + '">' +
        '<div class="wrap">' +
        '<div class="section-head" data-reveal>' +
        '<div><p class="eyebrow">' + items.length + ' product' + (items.length === 1 ? '' : 's') + '</p>' +
        '<h2>' + esc(c.title) + '</h2></div>' +
        (c.blurb ? '<p class="lede">' + esc(c.blurb) + '</p>' : '') +
        '</div>' +
        '<div class="catalogue">' + items.map(card).join('') + '</div>' +
        '</div></section>';
    }).join('');
  }

  /* --------------------------------------------------- a single product -- */

  function detail(data) {
    var box = slot('product');
    if (!box) return;

    var id = new URLSearchParams(location.search).get('id');
    var p = (data.products || []).filter(function (x) { return x._id === id; })[0];
    var crumb = slot('crumb');

    if (!p) {
      box.innerHTML = '<p class="lede">That product is not listed any more. ' +
        '<a href="/products">See everything we make</a>.</p>';
      return;
    }

    var cat = (data.categories || []).filter(function (c) { return c.key === p.category; })[0] || {};
    var specs = (p.specs || []).filter(function (s) { return s && s.label && s.value; });

    document.title = p.name + ' — Ayan Textile';
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = [p.variant, p.name, p.line].filter(Boolean).join(' · ');

    if (crumb && cat.title) {
      crumb.innerHTML = '<a href="/products">Products</a><span aria-hidden="true">·</span>' +
        '<a href="/products#range-' + esc(cat.key) + '">' + esc(cat.title) + '</a>';
    }

    box.innerHTML =
      '<div class="frame ratio-4-5">' + img(p.image, p.alt || nameOf(p), 1200, 1500, true) + '</div>' +
      '<div>' +
      (p.variant ? '<p class="eyebrow">' + esc(p.variant) + '</p>' : '') +
      '<h1 style="margin:var(--sp-sm) 0 var(--sp-sm)">' + esc(p.name) + '</h1>' +
      (p.line ? '<p class="lede">' + esc(p.line) + '</p>' : '') +
      (p.description ? '<p style="margin:var(--sp-md) 0 0;white-space:pre-line">' + esc(p.description) + '</p>' : '') +
      (specs.length
        ? '<div class="detail__spec"><dl class="spec">' + specs.map(function (s) {
          return '<div><dt>' + esc(s.label) + '</dt><dd>' + esc(s.value) + '</dd></div>';
        }).join('') + '</dl></div>'
        : '') +
      '<div class="hero__actions" style="margin-top:var(--sp-lg)">' +
      '<a class="btn btn--gold" href="/?enquire=' + encodeURIComponent(nameOf(p)) +
      '&amp;range=' + encodeURIComponent(cat.title || '') + '#enquiry">Enquire about this</a>' +
      '<a class="btn btn--ghost" href="/products#range-' + esc(p.category) + '">More ' + esc(cat.title || 'products') + '</a>' +
      '</div></div>';
  }

  /* --------------------------------------------------- mill / about ----- */

  function mill(items) {
    var track = slot('mill');
    if (!track || !items.length) return;
    track.innerHTML = items.map(function (m) {
      return '<div class="carousel__slide" role="group" aria-roledescription="slide">' +
        '<div class="card"><div class="frame ratio-3-2">' + img(m.image, m.alt || m.title, 1400, 900) + '</div>' +
        '<div class="card__veil"></div><div class="card__body">' +
        (m.step ? '<span class="card__index">' + esc(m.step) + '</span>' : '') +
        '<span class="card__title">' + esc(m.title) + '</span>' +
        '</div></div></div>';
    }).join('');
    show('mill');
  }

  function about(a) {
    var box = slot('about');
    if (!box || (!a.body && !a.image)) return;
    box.innerHTML =
      '<div class="frame ratio-4-5">' + img(a.image, a.alt || a.heading, 1200, 1500) + '</div>' +
      '<div>' +
      '<p class="eyebrow">' + esc(a.eyebrow || 'About') + '</p>' +
      '<h2 style="margin:var(--sp-sm) 0 var(--sp-md)">' + esc(a.heading || '') + '</h2>' +
      '<p class="lede">' + esc(a.body || '') + '</p>' +
      '<div class="hero__actions"><a class="btn btn--ghost" href="#enquiry">Work with us</a></div>' +
      '</div>';
    show('about');
  }

  /** The picture beside "We weave to order" at the foot of the products page. */
  function closer(a) {
    var box = slot('catalogueImage');
    if (box) box.innerHTML = img(a.image, a.alt || 'Inside the mill', 1400, 900);
  }

  /* ------------------------------------------------------- contact ---- */

  function contact(s) {
    var list = slot('contact');
    var rows = [
      ['Email', s.email ? '<a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a>' : ''],
      ['Phone', s.phone ? '<a href="tel:' + esc(String(s.phone).replace(/[^\d+]/g, '')) + '">' + esc(s.phone) + '</a>' : ''],
      ['Mill', esc(s.address || '')]
    ].filter(function (r) { return r[1]; });

    if (list && rows.length) {
      list.innerHTML = rows.map(function (r) {
        return '<div class="contact-item"><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>';
      }).join('');
    }

    var foot = slot('footerContact');
    if (foot) {
      foot.innerHTML =
        (s.email ? '<li><a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a></li>' : '') +
        (s.phone ? '<li><a href="tel:' + esc(String(s.phone).replace(/[^\d+]/g, '')) + '">' + esc(s.phone) + '</a></li>' : '') +
        '<li><a href="/#enquiry">Send an enquiry</a></li>';
    }
  }

  function footerLinks(categories) {
    var ul = slot('footerLinks');
    if (!ul || !categories.length) return;
    ul.innerHTML = categories.map(function (c) {
      return '<li><a href="/products#range-' + esc(c.key) + '">' + esc(c.title) + '</a></li>';
    }).join('') + '<li><a href="/#mill">The Mill</a></li><li><a href="/#about">About</a></li>';
  }

  function interests(categories) {
    var select = document.getElementById('f-interest');
    if (!select || !categories.length) return;
    select.innerHTML = categories.map(function (c) {
      return '<option>' + esc(c.title) + '</option>';
    }).join('') + '<option>Something else</option>';
  }

  /* =======================================================================
     behaviour
     ==================================================================== */

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

  function debounce(fn, wait) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, wait);
    };
  }

  function init() {
    document.querySelectorAll('[data-carousel]').forEach(Carousel);

    /* ------------------------------------------------ product ranges --- */
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

    }


    /* --------------------------------------------------------- header -- */

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

    /* --------------------------------------------------------- drawer -- */

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

    /* --------------------------------------------------------- reveal -- */

    var revealables = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      revealables.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);        // one-shot; keeps the observer cheap
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      revealables.forEach(function (el) { io.observe(el); });
    }

    /* ----------------------------------------------------------- year -- */

    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    /* ----------------------------------------------------------- hash -- */
    /* Sections are built after load, by which time the browser has given up
       on the #anchor in the address bar — so make that jump ourselves, then
       correct it once late pictures have finished settling the layout. */

    if (location.hash.length > 1) {
      var anchor = document.getElementById(location.hash.slice(1));
      if (anchor) {
        // Otherwise the browser restores its own idea of the scroll position
        // a moment after we have jumped, and wins.
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

        var moved = false;
        var noteMove = function () { moved = true; };
        ['wheel', 'touchstart'].forEach(function (e) {
          window.addEventListener(e, noteMove, { passive: true, once: true });
        });

        var jump = function () { anchor.scrollIntoView({ block: 'start' }); };
        var settle = function () {
          if (!moved && Math.abs(anchor.getBoundingClientRect().top) > 4) jump();
        };

        requestAnimationFrame(jump);
        window.addEventListener('load', settle);
        setTimeout(settle, 700);
      }
    }

    /* ----------------------------------------------------------- form -- */

    var form = document.getElementById('enquiry-form');
    if (!form) return;

    var status = document.getElementById('form-status');
    var submit = document.getElementById('form-submit');
    var started = document.getElementById('f-started');
    if (started) started.value = String(Date.now());

    /* Arrived from a product: /?enquire=Canvas+Stripe&range=Fabric#enquiry */
    var params = new URLSearchParams(location.search);
    var enquire = params.get('enquire');
    if (enquire) {
      var hidden = document.getElementById('f-product');
      var interest = document.getElementById('f-interest');
      var message = document.getElementById('f-message');
      var range = params.get('range');

      if (hidden) hidden.value = enquire;
      if (interest && range) {
        Array.prototype.forEach.call(interest.options, function (o) {
          if (o.text === range) interest.value = o.value || o.text;
        });
      }
      if (message && !message.value.trim()) {
        message.value = 'I would like more information about ' + enquire + '.\n\n';
      }
      history.replaceState(null, '', location.pathname + location.hash);
      setTimeout(function () {
        var name = document.getElementById('f-name');
        if (name && !name.value) name.focus({ preventScroll: true });
      }, reduceMotion ? 0 : 400);
    }

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
          say(err.message + ' You can also email us directly.', 'error');
        })
        .finally(function () {
          submit.disabled = false;
        });
    });
  }

  /* ------------------------------------------------------------ go ---- */

  fetch('/api/content', { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error(r.status)); })
    .then(render)
    .catch(function (err) {
      console.error('Could not load site content:', err);
    })
    .then(init);
})();
