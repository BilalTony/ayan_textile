/**
 * Shared bits for every serverless function: Mongo handle, admin session,
 * and a couple of tiny helpers. Files under /api starting with "_" are not
 * routes, so this never gets exposed.
 */
import { MongoClient, ObjectId } from 'mongodb';
import crypto from 'node:crypto';

export { ObjectId };

/* ───────────────────────────────────────────────────────────── mongo ─── */

// One client per warm container — reconnecting on every invocation is what
// exhausts an Atlas free tier.
export async function db() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  if (!globalThis.__ayanMongo) {
    globalThis.__ayanMongo = new MongoClient(uri, { maxPoolSize: 5 }).connect();
  }
  const client = await globalThis.__ayanMongo;
  const database = client.db(process.env.MONGODB_DB || fromUri(uri) || 'ayan_textile');

  // First boot fills an empty database; afterwards this is a no-op. Imported
  // lazily so the two modules do not have to import each other.
  if (!globalThis.__ayanReady) {
    const { ensure } = await import('./_bootstrap.js');
    globalThis.__ayanReady = ensure(database)
      .catch((err) => console.error('bootstrap failed:', err));
  }
  await globalThis.__ayanReady;

  return database;
}

/** The database named at the end of the connection string, if there is one. */
function fromUri(uri) {
  try { return decodeURIComponent(new URL(uri).pathname.slice(1)); } catch { return ''; }
}

export const col = async (name) => (await db()).collection(name);

export const oid = (v) => {
  try { return new ObjectId(String(v)); } catch { return null; }
};

/* ──────────────────────────────────────────────────────────── session ─── */

const COOKIE = 'ayan_admin';
const MAX_AGE = 60 * 60 * 12; // 12 hours

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('SESSION_SECRET is missing or too short');
  return s;
};

const sign = (payload) =>
  crypto.createHmac('sha256', secret()).update(payload).digest('base64url');

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export function makeToken(email) {
  const payload = Buffer.from(
    JSON.stringify({ e: email, x: Math.floor(Date.now() / 1000) + MAX_AGE })
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function readToken(token) {
  const [payload, sig] = String(token || '').split('.');
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.x > Math.floor(Date.now() / 1000) ? data : null;
  } catch { return null; }
}

const cookies = (req) =>
  Object.fromEntries(
    String(req.headers.cookie || '')
      .split(';')
      .map((c) => c.trim().split('='))
      .filter((p) => p.length === 2)
      .map(([k, v]) => [k, decodeURIComponent(v)])
  );

export const sessionCookie = (token) =>
  `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE}`;

export const killCookie = () =>
  `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;

export function isAdmin(req) {
  try { return !!readToken(cookies(req)[COOKIE]); } catch { return false; }
}

/** Answers 401 and returns false when the caller is not signed in. */
export function requireAdmin(req, res) {
  if (isAdmin(req)) return true;
  res.status(401).json({ error: 'Sign in first.' });
  return false;
}

/** Passwords are stored as "scrypt:salt:key" — never in the clear. */
export function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `scrypt:${salt}:${crypto.scryptSync(String(plain), salt, 32).toString('hex')}`;
}

export function verifyPassword(stored, plain) {
  const [scheme, salt, key] = String(stored || '').split(':');
  if (scheme !== 'scrypt' || !salt || !key) return false;
  return safeEqual(crypto.scryptSync(String(plain), salt, 32).toString('hex'), key);
}

/* ────────────────────────────────────────────────────────────── misc ─── */

export const clean = (v, max = 4000) => String(v ?? '').trim().slice(0, max);

export const clientIp = (req) =>
  String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';

/**
 * Per-instance burst limiter. Serverless containers are short-lived and there
 * are several of them, so this trims bursts rather than enforcing a true quota.
 * ponytail: swap for Mongo-backed counters if abuse ever gets past it.
 */
export function burst(bucket, ip, max, windowMs) {
  const store = (globalThis.__ayanHits ||= new Map());
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const hits = (store.get(key) || []).filter((t) => now - t < windowMs);
  hits.push(now);
  store.set(key, hits);
  if (store.size > 500) store.clear();
  return hits.length > max;
}

export function methodNotAllowed(res, allow) {
  res.setHeader('Allow', allow);
  return res.status(405).json({ error: 'Method not allowed.' });
}
