/**
 * First-boot setup. Runs once per cold start, does nothing at all once the
 * database is in order: it only ever adds what is missing.
 *
 *   • the collections, their validation rules and their indexes
 *   • the admin account, from ADMIN_EMAIL + ADMIN_PASSWORD (or ..._HASH)
 *   • the starting content and the photos in /images
 *
 * There is no seed script to remember to run — deploy, set the environment
 * variables, open the site, and it is ready.
 */
import fs from 'node:fs';
import { Binary } from 'mongodb';
import defaults from './_defaults.js';
import { hashPassword } from './_lib.js';

const MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', gif: 'image/gif'
};

export async function ensure(db) {
  await schema(db);
  await admin(db);
  await content(db);
}

/* ───────────────────────────────────────────────────────────── schema ─── */

/** Bump this after changing SCHEMA and the next cold start re-applies it. */
const SCHEMA_VERSION = 1;

const SCHEMA = {
  content: {
    // Deliberately loose: each section carries different fields, so this
    // pins down the ones the site actually reads and lets the rest be.
    required: ['type'],
    properties: {
      type: { enum: ['settings', 'about', 'hero', 'category', 'product', 'mill'] },
      order: { bsonType: ['int', 'long', 'double'] },
      hidden: { bsonType: 'bool' },
      image: { bsonType: 'string' },
      specs: {
        bsonType: 'array',
        items: { bsonType: 'object', required: ['label', 'value'] }
      }
    },
    indexes: [[{ type: 1, order: 1 }, {}]]
  },
  images: {
    required: ['contentType', 'data'],
    properties: {
      name: { bsonType: 'string' },
      contentType: { bsonType: 'string' },
      size: { bsonType: ['int', 'long'] },
      data: { bsonType: 'binData' }
    },
    indexes: [[{ createdAt: -1 }, {}]]
  },
  enquiries: {
    required: ['name', 'email', 'message'],
    properties: {
      name: { bsonType: 'string' },
      email: { bsonType: 'string' },
      message: { bsonType: 'string' }
    },
    indexes: [[{ createdAt: -1 }, {}]]
  },
  admins: {
    required: ['email', 'password'],
    properties: {
      email: { bsonType: 'string' },
      password: { bsonType: 'string', pattern: '^scrypt:' }
    },
    indexes: [[{ email: 1 }, { unique: true }]]
  }
};

async function schema(db) {
  const meta = db.collection('meta');
  const at = await meta.findOne({ _id: 'schema' });
  if (at?.version === SCHEMA_VERSION) return;

  const existing = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name)
  );

  for (const [name, def] of Object.entries(SCHEMA)) {
    const validator = {
      $jsonSchema: {
        bsonType: 'object',
        required: def.required,
        properties: def.properties
      }
    };

    // "moderate" checks new and edited documents but leaves anything already
    // stored alone, so tightening the rules can never lock you out of old rows.
    try {
      if (existing.has(name)) {
        await db.command({ collMod: name, validator, validationLevel: 'moderate' });
      } else {
        await db.createCollection(name, { validator, validationLevel: 'moderate' });
      }
    } catch (err) {
      if (err.code === 48) {
        // Another cold start created it a moment ago; its rules are the same.
      } else {
        // A database user with only readWrite cannot set validation rules.
        // The indexes below still matter, so carry on with a note.
        console.warn(`bootstrap: could not set the rules for ${name} —`, err.message);
      }
    }

    for (const [keys, options] of def.indexes) {
      await db.collection(name).createIndex(keys, options);
    }
  }

  await meta.updateOne(
    { _id: 'schema' },
    { $set: { version: SCHEMA_VERSION, at: new Date() } },
    { upsert: true }
  );
  console.log(`bootstrap: schema v${SCHEMA_VERSION} is in place`);
}

/* ────────────────────────────────────────────────────────────── admin ─── */

async function admin(db) {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const hash = process.env.ADMIN_PASSWORD_HASH
    || (process.env.ADMIN_PASSWORD && hashPassword(process.env.ADMIN_PASSWORD));

  if (!email || !hash) return;            // nothing configured yet, nothing to do

  const admins = db.collection('admins');
  if (await admins.findOne({ email })) return;

  try {
    await admins.insertOne({ email, password: hash, createdAt: new Date() });
    console.log('bootstrap: created the admin account for', email);
  } catch (err) {
    if (err.code !== 11000) throw err;    // another cold start won the race
  }
}

/* ──────────────────────────────────────────────────────────── content ─── */

async function content(db) {
  const content = db.collection('content');
  if (await content.estimatedDocumentCount()) return;

  // Claim the job, so two cold starts at once cannot both fill the database.
  try {
    await db.collection('meta').insertOne({ _id: 'seeded', at: new Date() });
  } catch {
    return;
  }

  try {
    const images = db.collection('images');
    const stored = new Map();

    const put = async (path) => {
      if (!path) return '';
      if (stored.has(path)) return stored.get(path);

      const file = new URL('..' + path, import.meta.url);
      if (!fs.existsSync(file)) {
        console.warn('bootstrap: no such picture,', path);
        return '';
      }

      const buf = fs.readFileSync(file);
      const { insertedId } = await images.insertOne({
        name: path.split('/').pop(),
        contentType: MIME[path.split('.').pop().toLowerCase()] || 'image/jpeg',
        size: buf.length,
        data: new Binary(buf),
        createdAt: new Date()
      });

      const url = `/img/${insertedId}`;
      stored.set(path, url);
      return url;
    };

    const now = new Date();
    const docs = [];
    const add = (type, doc, order) =>
      docs.push({ ...doc, type, order, createdAt: now, updatedAt: now });

    add('settings', defaults.settings, 0);
    add('about', { ...defaults.about, image: await put(defaults.about.image) }, 0);

    for (const [type, list] of [
      ['hero', defaults.hero],
      ['category', defaults.categories],
      ['product', defaults.products],
      ['mill', defaults.mill]
    ]) {
      let order = 0;
      for (const item of list) add(type, { ...item, image: await put(item.image) }, order++);
    }

    await content.insertMany(docs);

    console.log(`bootstrap: added ${docs.length} items and ${stored.size} pictures`);
  } catch (err) {
    // Leave the door open for the next request to try again.
    await db.collection('meta').deleteOne({ _id: 'seeded' }).catch(() => {});
    throw err;
  }
}
