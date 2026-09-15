/* =============================================================================
   Ayan Textile — admin dashboard.

   Every section of the public site is a document in one "content" collection,
   so one generic list + form drives all of them. What each kind of document
   holds is the TYPES table below — add a field there and it appears in the UI.
   ========================================================================== */
(() => {
  'use strict';

  /* ───────────────────────────────────────────────────────────── types ─── */

  const IMAGE = { k: 'image', l: 'Picture', t: 'image' };
  const ALT = { k: 'alt', l: 'Picture description', hint: 'Read aloud by screen readers.' };
  const ORDER = { k: 'order', l: 'Position', t: 'number', hint: 'Lower numbers come first.' };
  const HIDDEN = { k: 'hidden', l: 'Hide from the site', t: 'bool' };

  const TYPES = {
    settings: {
      label: 'Site & contact',
      singleton: true,
      fields: [
        { k: 'heroEyebrow', l: 'Hero eyebrow' },
        { k: 'heroTitle', l: 'Hero headline', hint: 'Wrap a word in <em>…</em> to italicise it.' },
        { k: 'heroLede', l: 'Hero paragraph', t: 'textarea', wide: true },
        { k: 'quote', l: 'Pull quote', hint: 'Wrap words in <span>…</span> to highlight them.', wide: true },
        { k: 'stats', l: 'Stats', t: 'stats', wide: true, hint: 'One per line — 25+ : Years weaving' },
        { k: 'email', l: 'Email' },
        { k: 'phone', l: 'Phone' },
        { k: 'address', l: 'Mill address', wide: true },
        { k: 'footerBlurb', l: 'Footer blurb', t: 'textarea', wide: true },
        { k: 'tagline', l: 'Footer tagline' }
      ]
    },
    about: {
      label: 'About',
      singleton: true,
      fields: [
        { k: 'eyebrow', l: 'Eyebrow' },
        { k: 'heading', l: 'Heading' },
        { k: 'body', l: 'Text', t: 'textarea', wide: true },
        IMAGE, ALT
      ]
    },
    hero: {
      label: 'Hero slides',
      title: (d) => d.alt || 'Slide',
      fields: [IMAGE, ALT, ORDER, HIDDEN]
    },
    category: {
      label: 'Ranges',
      title: (d) => d.title,
      sub: (d) => d.key,
      fields: [
        { k: 'title', l: 'Name', required: true },
        { k: 'key', l: 'URL key', required: true, hint: 'Lower case, no spaces — e.g. home-decor' },
        { k: 'blurb', l: 'One-line description', wide: true },
        IMAGE, ORDER, HIDDEN
      ]
    },
    product: {
      label: 'Products',
      title: (d) => d.name,
      sub: (d) => [d.variant, d.line].filter(Boolean).join(' · '),
      fields: [
        { k: 'category', l: 'Range', t: 'category', required: true },
        { k: 'name', l: 'Name', required: true },
        { k: 'variant', l: 'Variant', hint: 'Plain, Dobby, Jacquard…' },
        { k: 'line', l: 'Sub-line', hint: 'Shown under the name — e.g. Code 21 · 56 inch' },
        IMAGE, ALT,
        { k: 'description', l: 'Description', t: 'textarea', wide: true,
          hint: 'Shown on the product\u2019s own page, under the name.' },
        { k: 'specs', l: 'Specification', t: 'pairs', wide: true, hint: 'One per line — Width: 56"' },
        ORDER, HIDDEN
      ]
    },
    mill: {
      label: 'Mill steps',
      title: (d) => d.title,
      sub: (d) => d.step,
      fields: [
        { k: 'step', l: 'Step label', hint: 'e.g. Step 01' },
        { k: 'title', l: 'Title', required: true },
        IMAGE, ALT, ORDER, HIDDEN
      ]
    },
    enquiry: { label: 'Enquiries', readonly: true }
  };

  const ORDERED = ['settings', 'hero', 'category', 'product', 'mill', 'about', 'enquiry'];

  /* ──────────────────────────────────────────────────────────── plumbing ─ */

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const say = (text, state = '') => {
    $('msg').textContent = text;
    $('msg').setAttribute('data-state', state);
  };

  async function api(path, options = {}) {
    const res = await fetch(path, {
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      ...options
    });
    if (res.status === 401) { location.replace('/login'); throw new Error('Signed out.'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }

  let categories = [];   // cached for the product form's Range dropdown

  /* ────────────────────────────────────────────────────────────── views ── */

  const current = () => (location.hash.replace('#', '') || 'settings');

  function nav() {
    const side = $('side');
    const spacer = side.querySelector('.spacer');
    ORDERED.forEach((type) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = TYPES[type].label;
      b.dataset.type = type;
      b.addEventListener('click', () => { location.hash = type; });
      side.insertBefore(b, spacer);
    });
  }

  async function route() {
    const type = TYPES[current()] ? current() : 'settings';
    const def = TYPES[type];

    document.querySelectorAll('.side button[data-type]').forEach((b) => {
      b.setAttribute('aria-current', String(b.dataset.type === type));
    });

    $('heading').textContent = def.label;
    $('crumb').textContent = def.singleton ? 'Edit' : 'Manage';
    $('add').hidden = !!def.singleton || !!def.readonly;
    $('add').onclick = () => editor(type, {});
    say('Loading…', 'busy');

    try {
      if (type === 'product' && !categories.length) {
        categories = (await api('/api/content?type=category')).items;
      }
      const { items } = await api(`/api/content?type=${type}`);
      say('');
      if (def.singleton) editor(type, items[0] || {});
      else if (def.readonly) enquiries(items);
      else list(type, items);
    } catch (err) {
      say(err.message, 'error');
    }
  }

  function list(type, items) {
    const def = TYPES[type];
    if (!items.length) {
      $('view').innerHTML = `<div class="card"><p class="muted" style="margin:0">Nothing here yet — use <strong>Add new</strong>.</p></div>`;
      return;
    }
    $('view').innerHTML = `<div class="rows">${items.map((d) => `
      <div class="row">
        <img class="row__thumb" src="${esc(d.image || '/images/brand/ayan-mark.png')}" alt="">
        <div>
          <div class="row__title">${esc(def.title ? def.title(d) : d.name || 'Item')}${d.hidden ? ' <span class="muted">(hidden)</span>' : ''}</div>
          <div class="row__sub">${esc(def.sub ? def.sub(d) || '' : '')}</div>
        </div>
        <div class="row__actions">
          <button class="btn btn--ghost btn--sm" data-edit="${esc(d._id)}">Edit</button>
          <button class="btn btn--danger btn--sm" data-del="${esc(d._id)}">Delete</button>
        </div>
      </div>`).join('')}</div>`;

    $('view').querySelectorAll('[data-edit]').forEach((b) => {
      b.onclick = () => editor(type, items.find((i) => i._id === b.dataset.edit));
    });
    $('view').querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = () => destroy(type, b.dataset.del);
    });
  }

  function enquiries(items) {
    if (!items.length) {
      $('view').innerHTML = `<div class="card"><p class="muted" style="margin:0">No enquiries yet.</p></div>`;
      return;
    }
    $('view').innerHTML = `<div class="rows">${items.map((e) => `
      <div class="row" style="grid-template-columns:1fr auto;align-items:start">
        <div>
          <div class="row__title">${esc(e.name)}${e.company ? ` — ${esc(e.company)}` : ''}</div>
          <div class="row__sub">
            <a href="mailto:${esc(e.email)}">${esc(e.email)}</a>
            ${e.phone ? ` · ${esc(e.phone)}` : ''}
            ${e.interest ? ` · ${esc(e.interest)}` : ''}
            ${e.product ? ` · ${esc(e.product)}` : ''}
            · ${new Date(e.createdAt).toLocaleString()}
          </div>
          <p style="margin:10px 0 0;white-space:pre-wrap">${esc(e.message)}</p>
        </div>
        <button class="btn btn--danger btn--sm" data-del="${esc(e._id)}">Delete</button>
      </div>`).join('')}</div>`;

    $('view').querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = () => destroy('enquiry', b.dataset.del);
    });
  }

  /* ───────────────────────────────────────────────────────────── editor ── */

  function editor(type, doc) {
    const def = TYPES[type];
    $('view').innerHTML = `
      <form class="card" id="form">
        <div class="grid2">${def.fields.map((f) => field(f, doc)).join('')}</div>
        <div class="bar" style="margin:22px 0 0">
          <button class="btn" type="submit">Save</button>
          ${def.singleton ? '' : '<button class="btn btn--ghost" type="button" id="cancel">Back to the list</button>'}
        </div>
      </form>`;

    $('view').querySelectorAll('[data-pick]').forEach((b) => {
      b.onclick = () => openPicker(b.dataset.pick);
    });
    $('view').querySelectorAll('[data-clear]').forEach((b) => {
      b.onclick = () => setImage(b.dataset.clear, '');
    });
    if ($('cancel')) $('cancel').onclick = route;

    $('form').onsubmit = async (e) => {
      e.preventDefault();
      const body = { type, ...(doc._id ? { _id: doc._id } : {}) };
      for (const f of def.fields) body[f.k] = readField(f);

      const missing = def.fields.find((f) => f.required && !body[f.k]);
      if (missing) return say(`${missing.l} is required.`, 'error');

      say('Saving…', 'busy');
      try {
        const saved = await api('/api/content', {
          method: doc._id ? 'PUT' : 'POST',
          body: JSON.stringify(body)
        });
        if (saved.item) doc._id = saved.item._id;   // first save of a singleton
        categories = [];                            // a range may have been renamed
        say('Saved.', 'ok');
        if (!def.singleton) route();
      } catch (err) {
        say(err.message, 'error');
      }
    };
  }

  function field(f, doc) {
    const id = `f-${f.k}`;
    const v = doc[f.k];
    const hint = f.hint ? `<p class="muted" style="margin:6px 0 0">${esc(f.hint)}</p>` : '';
    let control;

    if (f.t === 'image') {
      control = `<div class="pick">
          <img id="${id}-thumb" src="${esc(v || '/images/brand/ayan-mark.png')}" alt="">
          <input id="${id}" type="hidden" value="${esc(v || '')}">
          <div class="pick__side">
            <button class="btn btn--ghost btn--sm" type="button" data-pick="${f.k}">Choose or upload</button>
            <button class="btn btn--ghost btn--sm" type="button" data-clear="${f.k}">Remove</button>
          </div>
        </div>`;
    } else if (f.t === 'textarea') {
      control = `<textarea id="${id}">${esc(v || '')}</textarea>`;
    } else if (f.t === 'pairs') {
      control = `<textarea id="${id}" rows="7">${esc(pairsToText(v))}</textarea>`;
    } else if (f.t === 'stats') {
      control = `<textarea id="${id}" rows="5">${esc(statsToText(v))}</textarea>`;
    } else if (f.t === 'number') {
      control = `<input id="${id}" type="number" value="${esc(v ?? '')}">`;
    } else if (f.t === 'bool') {
      control = `<label style="display:flex;gap:8px;align-items:center;font-size:14px;color:var(--ink)">
          <input id="${id}" type="checkbox" ${v ? 'checked' : ''} style="width:auto"> ${esc(f.l)}</label>`;
    } else if (f.t === 'category') {
      control = `<select id="${id}">${categories.map((c) =>
        `<option value="${esc(c.key)}" ${c.key === v ? 'selected' : ''}>${esc(c.title)}</option>`).join('')}</select>`;
    } else {
      control = `<input id="${id}" type="text" value="${esc(v || '')}">`;
    }

    return `<div class="${f.wide || f.t === 'pairs' || f.t === 'stats' ? 'field--wide' : ''}">
        ${f.t === 'bool' ? '' : `<label for="${id}">${esc(f.l)}</label>`}
        ${control}${hint}
      </div>`;
  }

  function readField(f) {
    const el = $(`f-${f.k}`);
    if (!el) return undefined;
    if (f.t === 'bool') return el.checked;
    if (f.t === 'number') return el.value === '' ? undefined : Number(el.value);
    if (f.t === 'pairs') return textToPairs(el.value);
    if (f.t === 'stats') return textToStats(el.value);
    return el.value.trim();
  }

  /* Lists are edited as plain text — one item per line — rather than with a
     repeating-row widget. Far less code, and quicker to type. */
  const pairsToText = (arr) =>
    (arr || []).map((s) => `${s.label}: ${s.value}`).join('\n');

  const textToPairs = (text) => splitLines(text).map((line) => {
    const [label, ...rest] = line.split(':');
    return { label: label.trim(), value: rest.join(':').trim() };
  }).filter((s) => s.label && s.value);

  const statsToText = (arr) =>
    (arr || []).map((s) => `${s.n}${s.suffix || ''}: ${s.label}`).join('\n');

  const textToStats = (text) => splitLines(text).map((line) => {
    const [head, ...rest] = line.split(':');
    const m = /^\s*([\d.,]*)(.*)$/.exec(head);
    return { n: m[1].trim(), suffix: m[2].trim(), label: rest.join(':').trim() };
  }).filter((s) => s.n && s.label);

  const splitLines = (text) =>
    String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);

  async function destroy(type, id) {
    if (!confirm('Delete this for good?')) return;
    say('Deleting…', 'busy');
    try {
      await api(`/api/content?id=${encodeURIComponent(id)}&type=${type}`, { method: 'DELETE' });
      route();
    } catch (err) {
      say(err.message, 'error');
    }
  }

  /* ───────────────────────────────────────────────────────────── images ── */

  let pickingFor = null;

  function setImage(key, url) {
    $(`f-${key}`).value = url;
    $(`f-${key}-thumb`).src = url || '/images/brand/ayan-mark.png';
  }

  async function openPicker(key) {
    pickingFor = key;
    $('picker').showModal();
    $('gallery').innerHTML = '<p class="muted">Loading…</p>';
    try {
      const { items } = await api('/api/images?list=1');
      $('gallery').innerHTML = items.length
        ? items.map((i) => `<button type="button" data-url="${esc(i.url)}" title="${esc(i.name)}">
             <img src="${esc(i.url)}" alt="${esc(i.name)}" loading="lazy"></button>`).join('')
        : '<p class="muted">No pictures yet — upload one.</p>';
      $('gallery').querySelectorAll('[data-url]').forEach((b) => {
        b.onclick = () => { setImage(pickingFor, b.dataset.url); $('picker').close(); };
      });
    } catch (err) {
      $('gallery').innerHTML = `<p class="msg" data-state="error">${esc(err.message)}</p>`;
    }
  }

  /**
   * Shrinks a picture in the browser before it is stored. Phone photos are
   * 4–8 MB; this puts them around 200 KB, which keeps the database small and
   * the site fast. 1600px is plenty for a full-width hero.
   * ponytail: raise MAX_EDGE if you ever need print-quality downloads.
   */
  const MAX_EDGE = 1600;

  async function shrink(file) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    return { dataUrl: canvas.toDataURL(type, 0.82), width, height };
  }

  async function upload(file) {
    const note = $('picker-msg');
    note.textContent = 'Shrinking and uploading…';
    try {
      const { dataUrl, width, height } = await shrink(file);
      const { url } = await api('/api/images', {
        method: 'POST',
        body: JSON.stringify({ name: file.name, dataUrl, width, height })
      });
      setImage(pickingFor, url);
      $('picker').close();
      note.textContent = 'Uploaded.';
      say('Picture uploaded — remember to save the item.', 'ok');
    } catch (err) {
      note.textContent = err.message;
    }
  }

  /* ───────────────────────────────────────────────────────────── start ─── */

  $('upload').addEventListener('change', (e) => {
    if (e.target.files[0]) upload(e.target.files[0]);
    e.target.value = '';
  });
  $('picker-close').addEventListener('click', () => $('picker').close());
  $('view-site').addEventListener('click', () => window.open('/', '_blank', 'noopener'));
  $('signout').addEventListener('click', async () => {
    await api('/api/auth', { method: 'DELETE' }).catch(() => {});
    location.replace('/login');
  });

  window.addEventListener('hashchange', route);

  api('/api/auth')
    .then((d) => {
      if (!d.authed) return location.replace('/login');
      nav();
      route();
    })
    .catch(() => location.replace('/login'));
})();
