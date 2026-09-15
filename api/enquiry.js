/**
 * POST /api/enquiry — the contact form.
 *
 * Stores the enquiry in Mongo (so it shows up in the admin) and emails it
 * over plain SMTP. If the email fails but the database write succeeded the
 * visitor still gets a "thank you" — the enquiry is not lost.
 *
 * Environment variables:
 *   SMTP_HOST, SMTP_PORT (587), SMTP_USER, SMTP_PASS, SMTP_SECURE ("true" for 465)
 *   ENQUIRY_TO    where enquiries land, comma-separated for several
 *   ENQUIRY_FROM  the sender, defaults to SMTP_USER
 */
import nodemailer from 'nodemailer';
import { col, clean, clientIp, burst, methodNotAllowed } from './_lib.js';

const MIN_FILL_MS = 3000; // a human takes longer than this to fill the form

const escapeHtml = (s) =>
  clean(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

function transport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return (globalThis.__ayanSmtp ||= nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
    pool: true
  }));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');

  let data = req.body;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { data = null; }
  }
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid request.' });
  }

  /* --- spam gates ---------------------------------------------------------
     The honeypot and speed traps answer 200 so bots get no signal to adapt. */
  if (clean(data.website)) return res.status(200).json({ ok: true });

  const startedAt = Number(data.startedAt);
  if (Number.isFinite(startedAt) && Date.now() - startedAt < MIN_FILL_MS) {
    return res.status(200).json({ ok: true });
  }

  const ip = clientIp(req);
  if (burst('enquiry', ip, 5, 60_000)) {
    return res.status(429).json({ error: 'Too many enquiries. Please try again shortly.' });
  }

  /* --- validation --------------------------------------------------------- */
  const name = clean(data.name, 200);
  const email = clean(data.email, 200);
  const message = clean(data.message);
  const company = clean(data.company, 200);
  const phone = clean(data.phone, 60);
  const interest = clean(data.interest, 120);
  const product = clean(data.product, 200);

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(400).json({ error: 'That email address does not look right.' });
  }

  /* --- keep it ------------------------------------------------------------ */
  let stored = false;
  try {
    await (await col('enquiries')).insertOne({
      name, email, message, company, phone, interest, product,
      ip, createdAt: new Date()
    });
    stored = true;
  } catch (err) {
    console.error('enquiry: could not store:', err);
  }

  /* --- send it ------------------------------------------------------------ */
  const mailer = transport();
  const to = process.env.ENQUIRY_TO;

  if (!mailer || !to) {
    console.error('Enquiry received but SMTP is not configured:', { name, email });
    return stored
      ? res.status(200).json({ ok: true })
      : res.status(500).json({ error: 'The contact form is not configured yet.' });
  }

  const rows = [
    ['Name', name],
    ['Company', company || '—'],
    ['Email', email],
    ['Phone', phone || '—'],
    ['Interested in', interest || '—'],
    ['Product', product || '—']
  ]
    .map(([k, v]) =>
      `<tr><td style="padding:6px 16px 6px 0;color:#7f8c8d;font:600 11px/1.4 system-ui;letter-spacing:.12em;text-transform:uppercase;vertical-align:top">${escapeHtml(k)}</td><td style="padding:6px 0;color:#0f1110;font:400 15px/1.5 system-ui">${escapeHtml(v)}</td></tr>`)
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
    'New website enquiry', '',
    `Name:     ${name}`,
    `Company:  ${company || '-'}`,
    `Email:    ${email}`,
    `Phone:    ${phone || '-'}`,
    `Interest: ${interest || '-'}`,
    `Product:  ${product || '-'}`,
    '', message
  ].join('\n');

  try {
    await mailer.sendMail({
      from: process.env.ENQUIRY_FROM || process.env.SMTP_USER,
      to: to.split(',').map((s) => s.trim()).filter(Boolean),
      replyTo: `${name} <${email}>`,
      subject: `Enquiry — ${name}${company ? ` (${company})` : ''}`,
      html,
      text
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Enquiry send failed:', err);
    // Already in the database — the admin will see it, so do not alarm the visitor.
    return stored
      ? res.status(200).json({ ok: true })
      : res.status(502).json({ error: 'Could not send your enquiry right now.' });
  }
}
