# Ayan Textile

A public portfolio site, an admin area behind a login, and MongoDB holding
both the content and the pictures. No build step, no image bucket, no
framework — it deploys to Vercel as static files plus four small functions.

```
index.html          the home page — a shell that fills itself from /api/content
products.html       /products — every product as a grid, by range
product.html        /product?id=… — one product, with its full specification
login.html          /login  — admin sign in
admin.html          /admin  — the dashboard
css/styles.css      the public design
css/admin.css       the admin design
js/main.js          renders all three public pages, then runs the carousels and form
js/admin.js         the dashboard: list, edit, upload, delete
api/_lib.js         shared: Mongo handle, session cookie, small helpers
api/content.js      the public payload + admin CRUD
api/images.js       pictures in and out of Mongo
api/auth.js         sign in / out
api/enquiry.js      the contact form → Mongo + SMTP
api/_bootstrap.js   first boot: schema, admin account, starting content
api/_defaults.js    the content the site starts with
tools/              password hash, dev server, tests
images/             brand assets, plus the launch photos the seed imports
```

## How the data is laid out

| Collection  | What is in it |
|---|---|
| `content`   | every editable thing, told apart by `type`: `settings`, `about`, `hero`, `category`, `product`, `mill` |
| `images`    | the picture bytes themselves, one document each |
| `enquiries` | what people send through the contact form |
| `admins`    | the login: an email and a scrypt hash, never a password |
| `meta`      | two bookkeeping rows so first-boot work happens exactly once |

Each one is created with a `$jsonSchema` validator and its indexes on first
boot — see `SCHEMA` in `api/_bootstrap.js`. The rules are loose on purpose:
they pin down the fields the site reads and let each section carry whatever
else it needs. They run at `moderate` level, so tightening them later can
never lock you out of rows that are already stored. Change the rules, bump
`SCHEMA_VERSION`, and the next request applies them.

A product looks like this:

```json
{ "_id": "…", "type": "product", "category": "fabric",
  "name": "Pintak Single Line", "variant": "Plain", "line": "Code 21 · 56 inch",
  "image": "/img/6613…",  "alt": "Plain fabric — Pintak Single Line",
  "specs": [ { "label": "Width", "value": "56\"" }, { "label": "Reed", "value": "52" } ],
  "order": 0, "hidden": false }
```

One collection rather than one per section keeps the whole site to a single
database read: `GET /api/content` returns everything, and Vercel's CDN holds
that answer for a minute, so a busy day is still about one query per minute.

### Pictures without a bucket

`/img/<id>` is rewritten to `/api/images?id=<id>`, which streams the bytes
straight out of Mongo. Ids never change, so the answer is cached for a year
and the CDN serves it after the first hit.

Before uploading, your browser shrinks the picture to 1600px on its longest
edge — a 6 MB phone photo becomes about 200 KB. The server refuses anything
over 3 MB or anything that is not a JPEG, PNG, WebP, AVIF or GIF.

## Setting it up

### 1. A database

Make a free cluster at [MongoDB Atlas](https://cloud.mongodb.com), add a
database user, and allow access from anywhere (Vercel's IPs are not fixed).
Copy the connection string.

### 2. Environment variables

Copy `.env.example` to `.env.local` for local work, and paste the same names
into Vercel → Settings → Environment Variables for the live site.

| Name | What it is |
|---|---|
| `MONGODB_URI` | the Atlas connection string |
| `MONGODB_DB` | database name, defaults to `ayan_textile` |
| `ADMIN_EMAIL` | the email you sign in with |
| `ADMIN_PASSWORD` | the password it is created with, or `ADMIN_PASSWORD_HASH` instead |
| `SESSION_SECRET` | a long random string — `npm run hash` prints one |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `SMTP_SECURE` | your mail server |
| `ENQUIRY_TO` | where enquiries are emailed, comma-separated for several |
| `ENQUIRY_FROM` | the sender, defaults to `SMTP_USER` |

`ADMIN_PASSWORD` is only read once, when the account is created, and is
stored as a scrypt hash. If you would rather it never appeared in your Vercel
settings at all:

```bash
npm run hash -- "a long admin password"
```

prints an `ADMIN_PASSWORD_HASH` line and a `SESSION_SECRET` line, ready to
paste. Set either one — the hash wins if both are there.

### 3. Deploy

Push to GitHub, import the repo at [vercel.com](https://vercel.com), framework
preset **Other**, leave the build command and output directory empty. Vercel
installs the two dependencies and deploys in seconds.

There is nothing to run afterwards. The first request to hit the new
deployment creates the collections, their rules and indexes, the admin
account from your environment variables, and the starting content with every
photo from `images/`. Each of those only happens if it is not already there,
so restarts, redeploys and extra instances all cost nothing.

## The three public pages

**The home page** is the banner, the ranges, the pull quote, the mill, about
and the enquiry form. The ranges work as they always did: three tiles switch
between Fabric, Home Décor and Accessories, each an auto-playing carousel.

**Every card is a link.** Clicking one opens **/product?id=…**: the photo
large, the name, the description, the full specification, and two buttons —
*Enquire about this* and *More <range>*.

**/products** is the same products as a plain grid, range by range, for
anyone who would rather see everything at once than page through a carousel.
The footer range links and the detail-page breadcrumb both point at it.

*Enquire about this* carries the product back to the form —
`/?enquire=Canvas+Stripe+(Plain)&range=Fabric#enquiry` — which fills in the
range and the opening line of the message, then tidies the address bar.
Nothing is stored between pages.

Product URLs use the database id. If you would rather they read
`/product/canvas-stripe`, that needs a slug field in the admin — say so and
it is a small change.

## Day to day

* **The site** — <https://your-domain>
* **The admin** — <https://your-domain/login>

Sign in and you get Site & contact, Hero slides, Ranges, Products, Mill steps,
About and Enquiries. Every list has Add new, Edit and Delete; every item has a
**Position** (lower comes first) and a **Hide from the site** switch for
something you are not ready to show.

Edits appear on the site within a minute — that is the CDN cache on
`/api/content`, and it is what keeps the database quiet.

## Running it locally

```bash
npm install
cp .env.example .env.local
npm run dev           # http://localhost:3000 — fills the database on the first hit
```

`tools/dev-server.js` serves the pages and runs the `/api` functions the same
way Vercel does, including the `/img/<id>` rewrite. It reads `.env.local`, so
point `MONGODB_URI` at Atlas or at a local `mongod`.

```bash
npm test              # session, password, spam gates, sanitiser — no database needed
```

## Notes worth knowing

* **The pages are rendered in the browser**, so search engines see the shell
  rather than the product names. For a mill that trades on enquiries this is
  a fair trade for having no build step; if it ever matters, render
  `index.html` in a function instead.
* **The admin account is created once**, from `ADMIN_EMAIL` and
  `ADMIN_PASSWORD`, and after that the `admins` document is what login
  checks. To change the password: change the environment variable, delete
  that one document, and the next request recreates it. The session is a
  signed, http-only cookie that expires after 12 hours.
* **Enquiries are stored before they are emailed.** If SMTP is down or not
  configured yet, the enquiry is still in the admin — the visitor is never
  told to try again.
* **The photos in `images/`** are only used for the first boot and for the
  logo and favicons; `vercel.json` ships them with the functions so the
  bootstrap can read them. After that the site reads every photo from Mongo.
