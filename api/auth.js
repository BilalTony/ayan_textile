/**
 * /api/auth — the admin session.
 *   POST   { email, password }  → sets the signed session cookie
 *   GET                         → { authed: true|false }
 *   DELETE                      → signs out
 *
 * The account itself is created on first boot from ADMIN_EMAIL and
 * ADMIN_PASSWORD (see api/_bootstrap.js) and lives in the "admins"
 * collection, holding a scrypt hash rather than the password.
 */
import {
  col, isAdmin, makeToken, sessionCookie, killCookie, verifyPassword,
  clean, clientIp, burst, methodNotAllowed
} from './_lib.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') return res.status(200).json({ authed: isAdmin(req) });

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', killCookie());
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') return methodNotAllowed(res, 'GET, POST, DELETE');

  if (burst('login', clientIp(req), 8, 10 * 60_000)) {
    return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const email = clean(body?.email, 200).toLowerCase();
  const password = clean(body?.password, 200);

  let admin;
  try {
    const admins = await col('admins');
    if (!(await admins.estimatedDocumentCount())) {
      return res.status(500).json({ error: 'Admin login is not configured yet.' });
    }
    admin = await admins.findOne({ email });
  } catch (err) {
    console.error('auth:', err);
    return res.status(500).json({ error: 'Could not reach the database.' });
  }

  // One message for both failures — no hint about which half was wrong.
  if (!admin || !verifyPassword(admin.password, password)) {
    return res.status(401).json({ error: 'Wrong email or password.' });
  }

  res.setHeader('Set-Cookie', sessionCookie(makeToken(email)));
  return res.status(200).json({ ok: true });
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}
