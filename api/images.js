/**
 * /api/images — pictures live in Mongo, so the site needs no bucket.
 *
 *   GET /img/<id>        → the picture itself (rewritten to ?id=<id>)
 *   GET ?list=1          → metadata for the picker, admin only
 *   POST { name, dataUrl } → store a picture, admin only, returns { id, url }
 *   DELETE ?id=<id>      → remove one, admin only
 *
 * The browser shrinks pictures before upload (see js/admin.js), which keeps
 * documents small and well under Mongo's 16 MB limit.
 */
import { Binary } from 'mongodb';
import { col, oid, isAdmin, requireAdmin, clean, methodNotAllowed } from './_lib.js';

const MAX_BYTES = 3_000_000;
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

export default async function handler(req, res) {
  try {
    // HEAD is handled like GET; Node drops the body on its own.
    if (req.method === 'GET' || req.method === 'HEAD') {
      return req.query.list ? await list(req, res) : await serve(req, res);
    }
    if (!requireAdmin(req, res)) return;
    if (req.method === 'POST') return await upload(req, res);
    if (req.method === 'DELETE') return await remove(req, res);
    return methodNotAllowed(res, 'GET, POST, DELETE');
  } catch (err) {
    console.error('images:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

async function serve(req, res) {
  const id = oid(req.query.id);
  if (!id) return res.status(400).json({ error: 'Which picture?' });

  const doc = await (await col('images')).findOne({ _id: id });
  if (!doc) return res.status(404).json({ error: 'No such picture.' });

  const buf = doc.data.buffer ? Buffer.from(doc.data.buffer) : Buffer.from(doc.data);

  // The id never points at different bytes, so this can be cached forever.
  res.setHeader('Content-Type', doc.contentType || 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('Content-Length', String(buf.length));
  res.statusCode = 200;
  return res.end(buf);
}

async function list(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Sign in first.' });
  res.setHeader('Cache-Control', 'no-store');
  const items = await (await col('images'))
    .find({}, { projection: { data: 0 } })
    .sort({ createdAt: -1 })
    .limit(300)
    .toArray();
  return res.status(200).json({
    items: items.map((i) => ({ ...i, _id: String(i._id), url: `/img/${i._id}` }))
  });
}

async function upload(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  const m = /^data:([\w/+.-]+);base64,(.+)$/s.exec(String(body?.dataUrl || ''));
  if (!m) return res.status(400).json({ error: 'Send the picture as a data URL.' });

  const [, contentType, b64] = m;
  if (!OK_TYPES.includes(contentType)) {
    return res.status(415).json({ error: 'JPEG, PNG, WebP, AVIF or GIF only.' });
  }

  const buf = Buffer.from(b64, 'base64');
  if (!buf.length) return res.status(400).json({ error: 'That picture is empty.' });
  if (buf.length > MAX_BYTES) {
    return res.status(413).json({ error: 'That picture is too large — keep it under 3 MB.' });
  }

  const doc = {
    name: clean(body.name, 200) || 'picture',
    alt: clean(body.alt, 300),
    contentType,
    size: buf.length,
    width: Number(body.width) || null,
    height: Number(body.height) || null,
    data: new Binary(buf),
    createdAt: new Date()
  };

  const { insertedId } = await (await col('images')).insertOne(doc);
  return res.status(200).json({ id: String(insertedId), url: `/img/${insertedId}` });
}

async function remove(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const id = oid(req.query.id);
  if (!id) return res.status(400).json({ error: 'Which picture?' });
  const r = await (await col('images')).deleteOne({ _id: id });
  return res.status(200).json({ ok: r.deletedCount === 1 });
}
