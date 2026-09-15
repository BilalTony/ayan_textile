# Image slots

Every file here is a **placeholder**. To use your own photo, save it over the
file with **the same name and extension** — the site picks it up with no code
change. Match the listed size (or the same shape) so nothing gets cropped oddly.

| File | Size | Shape | Where it appears |
|---|---|---|---|
| `hero/hero-01.jpg` | 1920 × 1080 | 16:9 | Hero carousel, slide 1 (loads first — make it your best shot) |
| `hero/hero-02.jpg` | 1920 × 1080 | 16:9 | Hero carousel, slide 2 |
| `hero/hero-03.jpg` | 1920 × 1080 | 16:9 | Hero carousel, slide 3 |
| `categories/category-fabric.jpg` | 1200 × 1500 | 4:5 | Range tile — Fabric |
| `categories/category-home-decor.jpg` | 1200 × 1500 | 4:5 | Range tile — Home Décor |
| `categories/category-accessories.jpg` | 1200 × 1500 | 4:5 | Range tile — Accessories |
| `products/fabric-01.jpg` | 1000 × 1250 | 4:5 | Cotton Twill — Natural |
| `products/fabric-02.jpg` | 1000 × 1250 | 4:5 | Cotton Twill — Indigo |
| `products/fabric-03.jpg` | 1000 × 1250 | 4:5 | Cotton Twill — Olive |
| `products/fabric-04.jpg` | 1000 × 1250 | 4:5 | Cotton Twill — Weave detail |
| `products/fabric-05.jpg` | 1000 × 1250 | 4:5 | Pure Linen — Ivory |
| `products/fabric-06.jpg` | 1000 × 1250 | 4:5 | Pure Linen — Stone |
| `products/fabric-07.jpg` | 1000 × 1250 | 4:5 | Pure Linen — Weave detail |
| `products/fabric-08.jpg` | 1000 × 1250 | 4:5 | Cotton-Linen Blend — Sand |
| `products/fabric-09.jpg` | 1000 × 1250 | 4:5 | Cotton-Linen Blend — Charcoal |
| `products/fabric-10.jpg` | 1000 × 1250 | 4:5 | Cotton-Linen Blend — Drape |
| `products/home-decor-01.jpg` | 1000 × 1250 | 4:5 | Curtain Fabric — Ivory |
| `products/home-decor-02.jpg` | 1000 × 1250 | 4:5 | Curtain Fabric — Slate |
| `products/home-decor-03.jpg` | 1000 × 1250 | 4:5 | Cushion Covers — Natural |
| `products/home-decor-04.jpg` | 1000 × 1250 | 4:5 | Cushion Covers — Striped |
| `products/home-decor-05.jpg` | 1000 × 1250 | 4:5 | Table Linen — White |
| `products/home-decor-06.jpg` | 1000 × 1250 | 4:5 | Bed Linen — Ivory |
| `products/home-decor-07.jpg` | 1000 × 1250 | 4:5 | Bed Linen — Sage |
| `products/home-decor-08.jpg` | 1000 × 1250 | 4:5 | Upholstery Fabric — Stone |
| `products/home-decor-09.jpg` | 1000 × 1250 | 4:5 | Throws & Blankets — Oatmeal |
| `products/home-decor-10.jpg` | 1000 × 1250 | 4:5 | Kitchen Textiles — Waffle |
| `products/accessories-01.jpg` | 1000 × 1250 | 4:5 | Tote Bags — Natural |
| `products/accessories-02.jpg` | 1000 × 1250 | 4:5 | Tote Bags — Printed |
| `products/accessories-03.jpg` | 1000 × 1250 | 4:5 | Tote Bags — Webbing detail |
| `products/accessories-04.jpg` | 1000 × 1250 | 4:5 | Tote Bags — Lined interior |
| `products/accessories-05.jpg` | 1000 × 1250 | 4:5 | Woven Trims — Jacquard |
| `products/accessories-06.jpg` | 1000 × 1250 | 4:5 | Woven Trims — Herringbone |
| `products/accessories-07.jpg` | 1000 × 1250 | 4:5 | Woven Trims — Close-up |
| `products/accessories-08.jpg` | 1000 × 1250 | 4:5 | Pouches & Cases — Natural |
| `products/accessories-09.jpg` | 1000 × 1250 | 4:5 | Pouches & Cases — Zip detail |
| `products/accessories-10.jpg` | 1000 × 1250 | 4:5 | Pouches & Cases — Full set |
| `mill/mill-01.jpg` … `mill-05.jpg` | 1400 × 900 | 3:2 | "Fibre to finished cloth" process carousel |
| `about/about-01.jpg` | 1200 × 1500 | 4:5 | About section |
| `og-cover.jpg` | 1200 × 630 | 1.91:1 | Preview card on WhatsApp, Facebook, LinkedIn |
| `brand/ayan-logo-light.png` | — | — | Logo used on the site — dark wordmark for the ivory theme |
| `brand/ayan-logo.png` | — | — | Light-wordmark version, kept for dark backgrounds |
| `brand/favicon-*.png` | — | — | Browser tab icon |

## Important: shrink photos before uploading

A photo straight from a phone or DSLR can be 5–10 MB. Twenty of those is the
difference between a site that loads instantly and one that hangs.

After you drop your photos in, run this once from the project folder:

```bash
python3 tools/optimize.py
```

It resizes every image to the size in the table above, strips camera metadata,
and re-saves at high quality. Typical result: 6 MB → about 250 KB, with no
visible difference on screen.

## Renaming a product

Product names, the one-line summary and the spec rows all live in `index.html`,
inside `<section id="products">`. Search for the current name (e.g. `Cotton
Twill`) — you will find it in three nearby places: the image `alt`, the
`product__name`, and the `data-enquire` attribute on the "Enquire about this"
link. Change all three to keep them in step.

## How the ranges work now

Each range is a carousel of **10 pictures** that slides left to right on its
own, one picture every 4 seconds. It pauses while someone hovers, touches or
uses the arrows, and it does not run while off screen.

Several pictures can share one product. Fabric, for example, is 3 products
across 10 pictures — the gold label above each name is the variation:

```
Cotton Twill        -> fabric-01..04   Natural, Indigo, Olive, Weave detail
Pure Linen          -> fabric-05..07   Ivory, Stone, Weave detail
Cotton-Linen Blend  -> fabric-08..10   Sand, Charcoal, Drape
```

So you do not need 10 different fabrics — you need 10 good photographs.

## Adding or removing a picture

Copy a whole `<div class="carousel__slide">…</div>` block inside that range's
carousel, change the image name, the variation label and the product name.
Then update two counts:

- the `<p class="panel__count">` above the carousel (e.g. `<span>10</span>`)
- the `cat__count` on that range's tile (e.g. `10 pictures`)

The dots, arrows, autoplay and lazy-loading all adjust themselves.

## Changing the slide speed

In `index.html`, each carousel has `data-autoplay="4000"` — the pause between
slides in milliseconds. Use `6000` for slower, `2500` for faster. Remove the
attribute entirely to stop it sliding on its own.
