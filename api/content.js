/**
 * /api/content — everything the site shows, and the admin's CRUD for it.
 *
 *   GET                       → the whole public payload (one round trip)
 *   GET ?type=product         → raw documents, admin only (includes hidden ones)
 *   POST   { type, ...fields }        → create      (admin)
 *   PUT    { _id, ...fields }         → update      (admin)
 *   DELETE ?id=<id>[&type=enquiry]    → remove      (admin)
 *
 * One "content" collection holds every kind of document, told apart by `type`.
 * A site this size does not need a collection per section.
 */
import { col, oid, requireAdmin, methodNotAllowed } from './_lib.js';

// Singletons are edited in place — there is only ever one of each.
export const TYPES = ['settings', 'about', 'hero', 'category', 'product', 'mill'];
export const SINGLETONS = ['settings', 'about'];
const READABLE = [...TYPES, 'enquiry'];

const MAX_DOC_BYTES = 32_000;

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return await get(req, res);
    if (!requireAdmin(req, res)) return;
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'POST') return await create(req, res);
    if (req.method === 'PUT') return await update(req, res);
    if (req.method === 'DELETE') return await remove(req, res);
    return methodNotAllowed(res, 'GET, POST, PUT, DELETE');
  } catch (err) {
    console.error('content:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

/* ───────────────────────────────────────────────────────────── read ─── */

async function get(req, res) {
  const type = String(req.query.type || '');

  if (type) {
    if (!requireAdmin(req, res)) return;
    if (!READABLE.includes(type)) return res.status(400).json({ error: 'Unknown type.' });
    res.setHeader('Cache-Control', 'no-store');
    const enquiries = type === 'enquiry';
    const docs = await (await col(enquiries ? 'enquiries' : 'content'))
      .find(enquiries ? {} : { type })
      .sort(enquiries ? { createdAt: -1 } : { order: 1, _id: 1 })
      .limit(500)
      .toArray();
    return res.status(200).json({ items: docs.map(stringifyId) });
  }

  // Public payload. Cached at the edge, so a busy page is one Mongo read a minute.
  const docs = await (await col('content'))
    .find({ hidden: { $ne: true } })
    .sort({ order: 1, _id: 1 })
    .limit(500)
    .toArray();

  const out = { settings: {}, about: {}, hero: [], categories: [], products: [], mill: [] };
  const bucket = { hero: 'hero', category: 'categories', product: 'products', mill: 'mill' };

  for (const doc of docs.map(stringifyId)) {
    if (SINGLETONS.includes(doc.type)) out[doc.type] = doc;
    else if (bucket[doc.type]) out[bucket[doc.type]].push(doc);
  }

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
  return res.status(200).json(out);
}

/* ──────────────────────────────────────────────────────────── write ─── */

async function create(req, res) {
  const body = parse(req.body);
  const type = String(body?.type || '');
  if (!TYPES.includes(type)) return res.status(400).json({ error: 'Unknown type.' });

  const doc = sanitize(body);
  if (!doc) return res.status(400).json({ error: 'That is too much data for one item.' });
  doc.type = type;
  doc.createdAt = new Date();
  doc.updatedAt = new Date();
  if (typeof doc.order !== 'number') doc.order = Date.now();

  const content = await col('content');
  if (SINGLETONS.includes(type)) {
    // Never end up with two "about" documents.
    await content.updateOne({ type }, { $set: doc }, { upsert: true });
    const saved = await content.findOne({ type });
    return res.status(200).json({ item: stringifyId(saved) });
  }

  const { insertedId } = await content.insertOne(doc);
  return res.status(200).json({ item: stringifyId({ ...doc, _id: insertedId }) });
}

async function update(req, res) {
  const body = parse(req.body);
  const id = oid(body?._id);
  if (!id) return res.status(400).json({ error: 'Which item?' });

  const doc = sanitize(body);
  if (!doc) return res.status(400).json({ error: 'That is too much data for one item.' });
  delete doc.type;                       // a document never changes kind
  doc.updatedAt = new Date();

  const content = await col('content');
  const saved = await content.findOneAndUpdate(
    { _id: id }, { $set: doc }, { returnDocument: 'after' }
  );
  if (!saved) return res.status(404).json({ error: 'That item is gone.' });
  return res.status(200).json({ item: stringifyId(saved) });
}

async function remove(req, res) {
  const id = oid(req.query.id);
  if (!id) return res.status(400).json({ error: 'Which item?' });
  // ponytail: images the item used are left in place — delete them from the
  // Images tab if you want the space back.
  const where = req.query.type === 'enquiry' ? 'enquiries' : 'content';
  const r = await (await col(where)).deleteOne({ _id: id });
  return res.status(200).json({ ok: r.deletedCount === 1 });
}

/* ───────────────────────────────────────────────────────────── utils ─── */

const parse = (b) => {
  if (typeof b !== 'string') return b;
  try { return JSON.parse(b); } catch { return null; }
};

const stringifyId = (doc) => (doc ? { ...doc, _id: String(doc._id) } : doc);

/**
 * Fields are free-form (each section wants different ones), so the guard is on
 * shape and size rather than on names: scalars, and arrays of scalars or flat
 * objects. Anything deeper, and any Mongo operator key, is dropped.
 */
export function sanitize(body) {
  const out = {};
  for (const [k, v] of Object.entries(body || {})) {
    if (k === '_id' || k === 'type' || k === 'createdAt' || k === 'updatedAt') continue;
    if (k.startsWith('$') || k.includes('.')) continue;
    const value = scalarOrList(v);
    if (value !== undefined) out[k] = value;
  }
  return JSON.stringify(out).length > MAX_DOC_BYTES ? null : out;
}

function scalarOrList(v, depth = 0) {
  if (v === null) return null;
  const t = typeof v;
  if (t === 'string') return v.slice(0, 8000);
  if (t === 'number' || t === 'boolean') return v;
  if (depth > 1) return undefined;
  if (Array.isArray(v)) return v.slice(0, 100).map((x) => scalarOrList(x, depth + 1)).filter((x) => x !== undefined);
  if (t === 'object') {
    const o = {};
    for (const [k, val] of Object.entries(v).slice(0, 40)) {
      if (k.startsWith('$') || k.includes('.')) continue;
      const clean = scalarOrList(val, depth + 1);
      if (clean !== undefined) o[k] = clean;
    }
    return o;
  }
  return undefined;
}
