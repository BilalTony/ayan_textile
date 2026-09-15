/**
 * POST /api/enquiry — Vercel serverless function.
 *
 * Emails the enquiry to ENQUIRY_TO via Resend. Deliberately dependency-free
 * (plain fetch), so the project needs no npm install and no build step.
 *
 * Required environment variables (Vercel → Settings → Environment Variables):
 *   RESEND_API_KEY   re_xxx from https://resend.com/api-keys
 *   ENQUIRY_TO       where enquiries land, e.g. info@ayantextile.com
 *   ENQUIRY_FROM     a verified sender, e.g. "Ayan Textile <site@ayantextile.com>"
 *                    (falls back to Resend's shared onboarding@resend.dev sender)
 */

const MAX_LEN = 4000;
const MIN_FILL_MS = 3000; // a human takes longer than this to fill the form

// Best-effort throttle. Serverless instances are short-lived, so this trims
// bursts from a single warm instance rather than acting as a real rate limiter.
const recent = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function tooMany(ip) {
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 500) recent.clear(); // bound memory
  return hits.length > MAX_PER_WINDOW;
}

const clean = (v) => String(v ?? '').trim().slice(0, MAX_LEN);

const escapeHtml = (s) =>
  clean(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  let data = req.body;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { data = null; }
  }
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid request.' });
  }

  // --- spam gates -----------------------------------------------------------
  // Honeypot and speed traps answer 200 so bots get no signal to adapt.
  if (clean(data.website)) return res.status(200).json({ ok: true });

  const startedAt = Number(data.startedAt);
  if (Number.isFinite(startedAt) && Date.now() - startedAt < MIN_FILL_MS) {
    return res.status(200).json({ ok: true });
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (tooMany(ip)) {
    return res.status(429).json({ error: 'Too many enquiries. Please try again shortly.' });
  }

  // --- validation -----------------------------------------------------------
  const name = clean(data.name);
  const email = clean(data.email);
  const message = clean(data.message);
  const company = clean(data.company);
  const phone = clean(data.phone);
  const interest = clean(data.interest);

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(400).json({ error: 'That email address does not look right.' });
  }

  // --- send -----------------------------------------------------------------
  const key = process.env.RESEND_API_KEY;
  const to = process.env.ENQUIRY_TO;
  const from = process.env.ENQUIRY_FROM || 'Ayan Textile <onboarding@resend.dev>';

  if (!key || !to) {
    console.error('Enquiry received but email is not configured:', { name, email, interest });
    return res.status(500).json({ error: 'The contact form is not configured yet.' });
  }

  const rows = [
    ['Name', name],
    ['Company', company || '—'],
    ['Email', email],
    ['Phone', phone || '—'],
    ['Interested in', interest || '—']
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#7f8c8d;font:600 11px/1.4 system-ui;letter-spacing:.12em;text-transform:uppercase;vertical-align:top">${escapeHtml(
          k
        )}</td><td style="padding:6px 0;color:#0f1110;font:400 15px/1.5 system-ui">${escapeHtml(
          v
        )}</td></tr>`
    )
    .join('');

  const html = `<div style="max-width:620px;margin:0 auto;padding:28px;font-family:system-ui,sans-serif">
      <p style="margin:0 0 4px;color:#c9a227;font:600 11px/1 system-ui;letter-spacing:.2em;text-transform:uppercase">Ayan Textile</p>
      <h2 style="margin:0 0 20px;font:400 26px/1.2 Georgia,serif;color:#0f1110">New website enquiry</h2>
      <table style="border-collapse:collapse;width:100%">${rows}</table>
      <hr style="border:0;border-top:1px solid #e2e2de;margin:22px 0">
      <p style="margin:0 0 6px;color:#7f8c8d;font:600 11px/1.4 system-ui;letter-spacing:.12em;text-transform:uppercase">Message</p>
      <p style="margin:0;white-space:pre-wrap;color:#0f1110;font:400 15px/1.6 system-ui">${escapeHtml(message)}</p>
    </div>`;

  const text = [
    `New website enquiry`,
    ``,
    `Name:     ${name}`,
    `Company:  ${company || '-'}`,
    `Email:    ${email}`,
    `Phone:    ${phone || '-'}`,
    `Interest: ${interest || '-'}`,
    ``,
    message
  ].join('\n');

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: to.split(',').map((s) => s.trim()).filter(Boolean),
        reply_to: email,
        subject: `Enquiry — ${name}${company ? ` (${company})` : ''}`,
        html,
        text
      })
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error('Resend rejected the enquiry:', r.status, detail);
      return res.status(502).json({ error: 'Could not send your enquiry right now.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Enquiry send failed:', err);
    return res.status(502).json({ error: 'Could not send your enquiry right now.' });
  }
};
