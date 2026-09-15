const handler = require('../api/enquiry.js');

function mockRes() {
  const r = { code: null, body: null, headers: {} };
  r.status = c => { r.code = c; return r; };
  r.json = b => { r.body = b; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  return r;
}
let ipN = 0;
// Give every call its own IP so the rate limiter does not skew unrelated tests.
const req = (body, method = 'POST') =>
  ({ method, body, headers: { 'x-forwarded-for': `203.0.113.${++ipN}` } });

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

const OLD = { ...process.env };
const valid = { name: 'Sara', email: 'sara@mill.com', message: 'Need 5000m twill', startedAt: Date.now() - 20000 };

(async () => {
  console.log('\napi/enquiry.js');

  delete process.env.RESEND_API_KEY; delete process.env.ENQUIRY_TO;

  let r = mockRes(); await handler(req(valid, 'GET'), r);
  check('GET is rejected 405', r.code === 405, `got ${r.code}`);
  check('GET sets Allow header', r.headers.Allow === 'POST');

  r = mockRes(); await handler(req(null), r);
  check('missing body 400', r.code === 400, `got ${r.code}`);

  r = mockRes(); await handler(req({ ...valid, website: 'spam.ru' }), r);
  check('honeypot answers 200 silently', r.code === 200 && r.body.ok === true, `got ${r.code}`);

  r = mockRes(); await handler(req({ ...valid, startedAt: Date.now() }), r);
  check('too-fast submit answers 200 silently', r.code === 200, `got ${r.code}`);

  r = mockRes(); await handler(req({ email: 'a@b.co', message: 'hi', startedAt: 1 }), r);
  check('missing name 400', r.code === 400, `got ${r.code}`);

  r = mockRes(); await handler(req({ ...valid, email: 'not-an-email' }), r);
  check('bad email 400', r.code === 400, `got ${r.code}`);

  r = mockRes(); await handler(req(valid), r);
  check('unconfigured env 500', r.code === 500, `got ${r.code}`);

  // JSON string body (some runtimes do not pre-parse)
  r = mockRes(); await handler(req(JSON.stringify(valid)), r);
  check('string body is parsed', r.code === 500, `got ${r.code} (500 = got past validation)`);

  // --- configured: mock the network -----------------------------------------
  process.env.RESEND_API_KEY = 're_test';
  process.env.ENQUIRY_TO = 'info@ayantextile.com, sales@ayantextile.com';
  let sent = null;
  global.fetch = async (url, opts) => { sent = { url, opts }; return { ok: true, text: async () => '' }; };

  r = mockRes();
  await handler(req({ ...valid, company: 'Nord & Co', message: '<script>alert(1)</script> 5000m' }), r);
  check('configured send returns 200', r.code === 200 && r.body.ok === true, `got ${r.code}`);
  check('posts to Resend', sent && sent.url === 'https://api.resend.com/emails');
  const payload = JSON.parse(sent.opts.body);
  check('recipients split on comma', Array.isArray(payload.to) && payload.to.length === 2, JSON.stringify(payload.to));
  check('reply_to is the enquirer', payload.reply_to === 'sara@mill.com');
  check('subject carries name + company', payload.subject === 'Enquiry — Sara (Nord & Co)', payload.subject);
  check('html escapes script tags', !payload.html.includes('<script>') && payload.html.includes('&lt;script&gt;'));
  check('ampersand escaped in company', payload.html.includes('Nord &amp; Co'));
  check('plain-text alternative present', typeof payload.text === 'string' && payload.text.includes('5000m'));

  global.fetch = async () => ({ ok: false, status: 422, text: async () => 'domain not verified' });
  r = mockRes(); await handler(req(valid), r);
  check('upstream failure 502', r.code === 502, `got ${r.code}`);

  global.fetch = async () => { throw new Error('network down'); };
  r = mockRes(); await handler(req(valid), r);
  check('network throw 502', r.code === 502, `got ${r.code}`);

  // rate limit: same IP burst
  global.fetch = async () => ({ ok: true, text: async () => '' });
  let limited = false;
  for (let i = 0; i < 8; i++) {
    const rr = mockRes();
    await handler({ method: 'POST', body: valid, headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' } }, rr);
    if (rr.code === 429) limited = true;
  }
  check('burst from one IP is throttled', limited);

  Object.assign(process.env, OLD);
  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
