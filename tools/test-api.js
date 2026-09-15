/**
 * One runnable check for the parts that would quietly break something:
 * the session cookie, the password check, the enquiry gates, and the
 * sanitiser that stands between the admin form and Mongo.
 *
 *   node tools/test-api.js
 *
 * Nothing here touches the database — every case returns before that point.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.SESSION_SECRET = 'test-secret-that-is-long-enough';
process.env.ADMIN_EMAIL = 'admin@ayantextile.com';

const { makeToken, readToken, hashPassword, verifyPassword, isAdmin } = await import('../api/_lib.js');
const { sanitize } = await import('../api/content.js');
const enquiry = (await import('../api/enquiry.js')).default;
const content = (await import('../api/content.js')).default;

let n = 0;
const check = (name, fn) => {
  try { fn(); n++; console.log('  ok   ' + name); }
  catch (err) { console.log('  FAIL ' + name + ' — ' + err.message); process.exitCode = 1; }
};
const checkAsync = async (name, fn) => {
  try { await fn(); n++; console.log('  ok   ' + name); }
  catch (err) { console.log('  FAIL ' + name + ' — ' + err.message); process.exitCode = 1; }
};

const res = () => {
  const r = { code: 0, body: null, headers: {} };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.end = (b) => { r.body = b; return r; };
  return r;
};
let ip = 0;
const req = (body, method = 'POST', extra = {}) => ({
  method, body, query: {}, headers: { 'x-forwarded-for': `203.0.113.${++ip}` }, ...extra
});

console.log('\nsession');

check('a fresh token reads back', () => {
  assert.equal(readToken(makeToken('a@b.com')).e, 'a@b.com');
});
check('a tampered signature is rejected', () => {
  const [payload] = makeToken('a@b.com').split('.');
  assert.equal(readToken(payload + '.deadbeef'), null);
});
check('a re-signed but expired token is rejected', () => {
  const payload = Buffer.from(JSON.stringify({ e: 'a@b.com', x: 1 })).toString('base64url');
  const sig = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('base64url');
  assert.equal(readToken(`${payload}.${sig}`), null);
});
check('no cookie is not an admin', () => {
  assert.equal(isAdmin({ headers: {} }), false);
});
check('a valid cookie is an admin', () => {
  assert.equal(isAdmin({ headers: { cookie: 'ayan_admin=' + makeToken('a@b.com') } }), true);
});

console.log('\npassword');

check('a hash never contains the password', () => {
  const hash = hashPassword('hunter2hunter2');
  assert.match(hash, /^scrypt:[0-9a-f]{32}:[0-9a-f]{64}$/);
  assert.equal(hash.includes('hunter2'), false);
});
check('the right password verifies and a wrong one does not', () => {
  const hash = hashPassword('hunter2hunter2');
  assert.equal(verifyPassword(hash, 'hunter2hunter2'), true);
  assert.equal(verifyPassword(hash, 'hunter2hunter3'), false);
});
check('the same password hashes differently every time', () => {
  assert.notEqual(hashPassword('same one'), hashPassword('same one'));
});
check('a damaged hash verifies nothing', () => {
  for (const bad of ['', 'plaintext', 'scrypt::', 'md5:a:b']) {
    assert.equal(verifyPassword(bad, 'anything'), false);
  }
});

console.log('\nsanitise');

check('Mongo operators are dropped', () => {
  assert.deepEqual(sanitize({ $set: { a: 1 }, 'a.b': 2, name: 'ok' }), { name: 'ok' });
});
check('type and _id cannot be overwritten', () => {
  assert.deepEqual(sanitize({ _id: 'x', type: 'product', name: 'ok' }), { name: 'ok' });
});
check('one level of nesting survives', () => {
  assert.deepEqual(
    sanitize({ specs: [{ label: 'Width', value: '56"' }] }),
    { specs: [{ label: 'Width', value: '56"' }] }
  );
});
check('a long string is clipped rather than stored whole', () => {
  assert.equal(sanitize({ body: 'x'.repeat(40_000) }).body.length, 8000);
});
check('an oversized document is refused', () => {
  const huge = Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [`f${i}`, 'x'.repeat(8000)])
  );
  assert.equal(sanitize(huge), null);
});

console.log('\nenquiry');

const valid = { name: 'Sara', email: 'sara@mill.com', message: 'Need 5000m twill', startedAt: Date.now() - 20_000 };

await checkAsync('GET is refused', async () => {
  const r = res(); await enquiry(req(valid, 'GET'), r);
  assert.equal(r.code, 405);
  assert.equal(r.headers.Allow, 'POST');
});
await checkAsync('the honeypot answers 200 in silence', async () => {
  const r = res(); await enquiry(req({ ...valid, website: 'spam.ru' }), r);
  assert.equal(r.code, 200);
});
await checkAsync('a submit that was too fast answers 200 in silence', async () => {
  const r = res(); await enquiry(req({ ...valid, startedAt: Date.now() }), r);
  assert.equal(r.code, 200);
});
await checkAsync('missing fields are refused', async () => {
  const r = res(); await enquiry(req({ ...valid, message: '' }), r);
  assert.equal(r.code, 400);
});
await checkAsync('a malformed email is refused', async () => {
  const r = res(); await enquiry(req({ ...valid, email: 'sara@mill' }), r);
  assert.equal(r.code, 400);
});
await checkAsync('a burst from one address is throttled', async () => {
  const noise = console.error;            // the handler logs each miss; not news here
  console.error = () => {};
  const from = { headers: { 'x-forwarded-for': '198.51.100.7' }, query: {} };
  let last;
  for (let i = 0; i < 7; i++) {
    last = res();
    await enquiry({ method: 'POST', body: { ...valid, message: 'hi' }, ...from }, last);
  }
  console.error = noise;
  assert.equal(last.code, 429);
});

console.log('\nadmin routes');

await checkAsync('content writes need a session', async () => {
  const r = res(); await content(req({ type: 'product', name: 'x' }), r);
  assert.equal(r.code, 401);
});
await checkAsync('listing raw documents needs a session', async () => {
  const r = res(); await content(req(null, 'GET', { query: { type: 'product' } }), r);
  assert.equal(r.code, 401);
});

console.log(`\n${n} checks passed\n`);
