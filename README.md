# Ayan Textile — portfolio site

Image-first portfolio on a warm ivory theme. Plain HTML, CSS and JavaScript — **no build
step, no npm install, no framework**. Deploys to Vercel as static files plus one
serverless function for the enquiry form.

```
index.html            the whole page
css/styles.css        design tokens + all styling
js/main.js            carousels, menu, scroll reveal, form
api/enquiry.js        serverless function — emails enquiries to you
images/               all photos (see images/README.md)
tools/optimize.py     shrinks your photos so the site stays fast
tools/test-enquiry.cjs tests for the enquiry function
vercel.json           caching + security headers
```

## Run it locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Everything works except the enquiry form,
which needs the serverless function — for that use `npx vercel dev` instead.

## Deploy to Vercel

1. Push this folder to GitHub.
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. Framework preset: **Other**. Leave build command and output directory empty.
4. Deploy.

There is no build step, so deploys take seconds and the whole site is served
from Vercel's CDN.

### Make the enquiry form work

The form posts to `/api/enquiry`, which sends you an email through
[Resend](https://resend.com) (free tier: 3000 emails/month).

1. Create a Resend account and an API key.
2. In Vercel → your project → **Settings → Environment Variables**, add:

   | Name | Value |
   |---|---|
   | `RESEND_API_KEY` | `re_...` from Resend |
   | `ENQUIRY_TO` | where enquiries go, e.g. `info@ayantextile.com` (comma-separate for several) |
   | `ENQUIRY_FROM` | *(optional)* a verified sender, e.g. `Ayan Textile <site@ayantextile.com>` |

3. Redeploy.

Until those are set the form shows "The contact form is not configured yet."
The email address and phone number on the page are still live links, so people
can always reach you.

Spam is handled with a hidden honeypot field, a minimum fill time, and a
per-IP burst limit — no CAPTCHA, so nothing slows the page down.

## Add your own photos

See **[images/README.md](images/README.md)** for the full list of slots and
sizes. Short version:

1. Save your photo over the placeholder file, keeping the same filename.
2. Run `python3 tools/optimize.py` to resize and compress everything.
3. Redeploy.

## The three product ranges

The Products section is a set of tabs: Fabric, Home Décor and Accessories, each
with **10 pictures**. Clicking a range tile swaps the gallery below it instantly
— no page load — and the pictures then slide left to right on their own, one
every 4 seconds, pausing on hover or touch. Each range has its own address you
can send to a customer:

- `yoursite.com/#fabric`
- `yoursite.com/#home-decor`
- `yoursite.com/#accessories`

Each picture opens to show that product's specs, and "Enquire about this" jumps
to the contact form with the product and variation already filled in. Several
pictures can share one product — the gold label above the name is the variation
(colour, pattern or close-up), so 3 fabrics can fill 10 slides.

## Change the text

All copy lives in `index.html`. The things you will most likely want to edit:

- Phone, email and address — in the `#enquiry` section and the footer
- Stats (`25+`, `20+`, `180k`, `5+`) — the `.stats` block
- Product names and specs — the `#products` section (see
  [images/README.md](images/README.md) for exactly which lines to edit)
- Range names and their counts — the three `.cat` tiles in `#products`

## Change the colours

Every colour is a variable at the top of `css/styles.css`. Change one value and
it updates everywhere:

```css
--page:      #f7f4ee;   /* page background — warm ivory */
--page-deep: #efeae1;   /* sunk bands: footer, enquiry, quote */
--card:      #ffffff;   /* cards and raised panels */
--ink:       #23282a;   /* headings and body text */
--slate:     #616c6d;   /* secondary text, labels */
--gold:      #806713;   /* accent, buttons (white text sits on it) */
--gold-deep: #6b5510;   /* button hover — darker, not lighter */
--hairline:  #7f8c8d;   /* the brand slate, used for rules only */
```

Two rules worth keeping if you change these:

1. **`--gold` carries white text**, so it must stay dark enough. At `#806713`
   white-on-gold measures 5.4:1. Going lighter breaks the buttons.
2. **`#7f8c8d` is not a text colour on this theme.** On ivory it only reaches
   3.2:1, below the 4.5:1 needed to be readable, so it is used for hairlines
   and the `--slate` variable is the darkened version used for text.

Text that sits *on a photograph* — the hero, the range tiles, the mill captions
— uses `--on-photo` and a dark scrim instead, because a photo can be any
brightness. Those stay light whatever you do to the page colours.

## Tests

```bash
node tools/test-enquiry.cjs
```

## Performance notes

The site is built to stay fast with a lot of photos:

- Images below the fold use native `loading="lazy"`
- A product range's photos are not downloaded until someone opens that range
- Every image sits in a fixed aspect-ratio box, so nothing jumps while loading
- Carousels use native CSS scroll-snap — no carousel library, ~4 KB of JS total
- Fonts load with `display: swap` and never block rendering
- Scroll handlers are throttled with `requestAnimationFrame` and marked passive
- Reveal animations disconnect themselves once an element has appeared
- `prefers-reduced-motion` disables autoplay and all animation
