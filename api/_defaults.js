/**
 * What the site starts with. On its very first request the app copies this
 * into Mongo along with the photos in /images, and never looks at it again —
 * from then on the admin is the only thing that changes the content.
 */
export default {
  "settings": {
    "heroEyebrow": "Mill direct · Woven in house · Worldwide export",
    "heroTitle": "Cloth made to be <em>felt</em>.",
    "heroLede": "Woven fabrics, home textiles and apparel cloth — manufactured end to end and shipped to buyers in over 20 countries.",
    "quote": "Thread first. <span>Everything else</span> follows.",
    "stats": [
      {
        "n": "25",
        "suffix": "+",
        "label": "Years weaving"
      },
      {
        "n": "20",
        "suffix": "+",
        "label": "Export markets"
      },
      {
        "n": "180",
        "suffix": "k",
        "label": "Metres monthly"
      },
      {
        "n": "5",
        "suffix": "+",
        "label": "Product lines"
      }
    ],
    "email": "info@ayantextile.com",
    "phone": "+92 000 0000000",
    "address": "Add your address here",
    "footerBlurb": "Woven fabrics, home textiles and apparel cloth — mill direct, worldwide.",
    "tagline": "Mill direct · Worldwide export"
  },
  "about": {
    "eyebrow": "About",
    "heading": "Ayan Textile",
    "body": "We are a textile mill and export house. Yarn comes in one door and finished, inspected cloth leaves the other — so buyers deal with one partner instead of five.",
    "image": "/images/about/about-01.jpg",
    "alt": "Inside the Ayan Textile mill"
  },
  "hero": [
    {
      "image": "/images/hero/hero-01.jpg",
      "alt": "Woven fabric rolls on the Ayan Textile mill floor"
    },
    {
      "image": "/images/hero/hero-02.jpg",
      "alt": "Close detail of a loom weaving natural fibre cloth"
    },
    {
      "image": "/images/hero/hero-03.jpg",
      "alt": "Finished textile lengths draped in the finishing hall"
    }
  ],
  "categories": [
    {
      "key": "fabric",
      "image": "/images/categories/category-fabric.jpg",
      "title": "Fabric",
      "blurb": "Woven cloth by the metre"
    },
    {
      "key": "home-decor",
      "image": "/images/categories/category-home-decor.jpg",
      "title": "Home Décor",
      "blurb": "Finished textiles for interiors"
    },
    {
      "key": "accessories",
      "image": "/images/categories/category-accessories.jpg",
      "title": "Accessories",
      "blurb": "Sewn and woven goods"
    }
  ],
  "products": [
    {
      "category": "fabric",
      "image": "/images/products/fabric-01.jpg",
      "alt": "Plain fabric — Pintak Single Line",
      "variant": "Plain",
      "name": "Pintak Single Line",
      "line": "Code 21 · 56 inch",
      "specs": [
        {
          "label": "Code",
          "value": "21"
        },
        {
          "label": "Width",
          "value": "56\""
        },
        {
          "label": "Reed",
          "value": "52"
        },
        {
          "label": "Pick",
          "value": "120"
        },
        {
          "label": "Warp",
          "value": "2/10"
        },
        {
          "label": "Weft",
          "value": "30s"
        }
      ]
    },
    {
      "category": "fabric",
      "image": "/images/products/fabric-02.jpg",
      "alt": "Plain fabric — Canvas Stripe",
      "variant": "Plain",
      "name": "Canvas Stripe",
      "line": "Code 41 · 60 inch",
      "specs": [
        {
          "label": "Code",
          "value": "41"
        },
        {
          "label": "Width",
          "value": "60\""
        },
        {
          "label": "Reed",
          "value": "40"
        },
        {
          "label": "Pick",
          "value": "22"
        },
        {
          "label": "Warp",
          "value": "2/10"
        },
        {
          "label": "Weft",
          "value": "6s"
        }
      ]
    },
    {
      "category": "fabric",
      "image": "/images/products/fabric-03.jpg",
      "alt": "Plain fabric — Soft Towel",
      "variant": "Plain",
      "name": "Soft Towel",
      "line": "Code 39 · 58 inch",
      "specs": [
        {
          "label": "Code",
          "value": "39"
        },
        {
          "label": "Width",
          "value": "58\""
        },
        {
          "label": "Reed",
          "value": "26"
        },
        {
          "label": "Pick",
          "value": "22"
        },
        {
          "label": "Warp",
          "value": "10s"
        },
        {
          "label": "Weft",
          "value": "6s"
        }
      ]
    },
    {
      "category": "fabric",
      "image": "/images/products/fabric-04.jpg",
      "alt": "Dobby fabric — Jute Dobby",
      "variant": "Dobby",
      "name": "Jute Dobby",
      "line": "Code 42 · 52 inch",
      "specs": [
        {
          "label": "Code",
          "value": "42"
        },
        {
          "label": "Width",
          "value": "52\""
        },
        {
          "label": "Reed",
          "value": "48"
        },
        {
          "label": "Pick",
          "value": "20"
        },
        {
          "label": "Warp",
          "value": "2/10"
        },
        {
          "label": "Weft",
          "value": "Jute"
        }
      ]
    },
    {
      "category": "fabric",
      "image": "/images/products/fabric-05.jpg",
      "alt": "Jacquard fabric — Monochrome Diamond",
      "variant": "Jacquard",
      "name": "Monochrome Diamond",
      "line": "Woven jacquard",
      "specs": [
        {
          "label": "Weave",
          "value": "Jacquard"
        },
        {
          "label": "Width",
          "value": "Please enquire"
        },
        {
          "label": "Composition",
          "value": "Please enquire"
        },
        {
          "label": "Min. order",
          "value": "Please enquire"
        }
      ]
    },
    {
      "category": "fabric",
      "image": "/images/products/fabric-06.jpg",
      "alt": "Jacquard fabric — Multicolour Stripe",
      "variant": "Jacquard",
      "name": "Multicolour Stripe",
      "line": "Woven jacquard",
      "specs": [
        {
          "label": "Weave",
          "value": "Jacquard"
        },
        {
          "label": "Width",
          "value": "Please enquire"
        },
        {
          "label": "Composition",
          "value": "Please enquire"
        },
        {
          "label": "Min. order",
          "value": "Please enquire"
        }
      ]
    },
    {
      "category": "fabric",
      "image": "/images/products/fabric-07.jpg",
      "alt": "Jacquard fabric — Panel Collection",
      "variant": "Jacquard",
      "name": "Panel Collection",
      "line": "Woven jacquard",
      "specs": [
        {
          "label": "Weave",
          "value": "Jacquard"
        },
        {
          "label": "Width",
          "value": "Please enquire"
        },
        {
          "label": "Composition",
          "value": "Please enquire"
        },
        {
          "label": "Min. order",
          "value": "Please enquire"
        }
      ]
    },
    {
      "category": "fabric",
      "image": "/images/products/fabric-08.jpg",
      "alt": "Jacquard fabric — Cream Ground Geometric",
      "variant": "Jacquard",
      "name": "Cream Ground Geometric",
      "line": "Woven jacquard",
      "specs": [
        {
          "label": "Weave",
          "value": "Jacquard"
        },
        {
          "label": "Width",
          "value": "Please enquire"
        },
        {
          "label": "Composition",
          "value": "Please enquire"
        },
        {
          "label": "Min. order",
          "value": "Please enquire"
        }
      ]
    },
    {
      "category": "home-decor",
      "image": "/images/products/home-decor-01.jpg",
      "alt": "Curtain Fabric — Ivory",
      "variant": "Ivory",
      "name": "Curtain Fabric",
      "line": "240 gsm · 280 cm",
      "specs": [
        {
          "label": "Composition",
          "value": "70% Cotton / 30% Linen"
        },
        {
          "label": "Weight",
          "value": "240 gsm"
        },
        {
          "label": "Width",
          "value": "280 cm"
        },
        {
          "label": "Finish",
          "value": "Dim-out option"
        },
        {
          "label": "Min. order",
          "value": "200 m"
        }
      ]
    },
    {
      "category": "home-decor",
      "image": "/images/products/home-decor-02.jpg",
      "alt": "Curtain Fabric — Slate",
      "variant": "Slate",
      "name": "Curtain Fabric",
      "line": "240 gsm · 280 cm",
      "specs": [
        {
          "label": "Composition",
          "value": "70% Cotton / 30% Linen"
        },
        {
          "label": "Weight",
          "value": "240 gsm"
        },
        {
          "label": "Width",
          "value": "280 cm"
        },
        {
          "label": "Finish",
          "value": "Dim-out option"
        },
        {
          "label": "Min. order",
          "value": "200 m"
        }
      ]
    },
    {
      "category": "home-decor",
      "image": "/images/products/home-decor-03.jpg",
      "alt": "Cushion Covers — Natural",
      "variant": "Natural",
      "name": "Cushion Covers",
      "line": "320 gsm · 45 × 45 cm",
      "specs": [
        {
          "label": "Composition",
          "value": "100% Cotton canvas"
        },
        {
          "label": "Weight",
          "value": "320 gsm"
        },
        {
          "label": "Size",
          "value": "45 × 45 cm"
        },
        {
          "label": "Finish",
          "value": "Hidden zip"
        },
        {
          "label": "Min. order",
          "value": "200 pcs"
        }
      ]
    },
    {
      "category": "home-decor",
      "image": "/images/products/home-decor-04.jpg",
      "alt": "Cushion Covers — Striped",
      "variant": "Striped",
      "name": "Cushion Covers",
      "line": "320 gsm · 45 × 45 cm",
      "specs": [
        {
          "label": "Composition",
          "value": "100% Cotton canvas"
        },
        {
          "label": "Weight",
          "value": "320 gsm"
        },
        {
          "label": "Size",
          "value": "45 × 45 cm"
        },
        {
          "label": "Finish",
          "value": "Hidden zip"
        },
        {
          "label": "Min. order",
          "value": "200 pcs"
        }
      ]
    },
    {
      "category": "home-decor",
      "image": "/images/products/home-decor-05.jpg",
      "alt": "Table Linen — White",
      "variant": "White",
      "name": "Table Linen",
      "line": "200 gsm · 180 cm",
      "specs": [
        {
          "label": "Composition",
          "value": "100% Linen"
        },
        {
          "label": "Weight",
          "value": "200 gsm"
        },
        {
          "label": "Width",
          "value": "180 cm"
        },
        {
          "label": "Finish",
          "value": "Stain resistant"
        },
        {
          "label": "Min. order",
          "value": "150 m"
        }
      ]
    },
    {
      "category": "home-decor",
      "image": "/images/products/home-decor-06.jpg",
      "alt": "Bed Linen — Ivory",
      "variant": "Ivory",
      "name": "Bed Linen",
      "line": "140 gsm · 250 cm",
      "specs": [
        {
          "label": "Composition",
          "value": "100% Cotton sateen"
        },
        {
          "label": "Weight",
          "value": "140 gsm"
        },
        {
          "label": "Width",
          "value": "250 cm"
        },
        {
          "label": "Finish",
          "value": "300 thread count"
        },
        {
          "label": "Min. order",
          "value": "200 sets"
        }
      ]
    },
    {
      "category": "home-decor",
      "image": "/images/products/home-decor-07.jpg",
      "alt": "Bed Linen — Sage",
      "variant": "Sage",
      "name": "Bed Linen",
      "line": "140 gsm · 250 cm",
      "specs": [
        {
          "label": "Composition",
          "value": "100% Cotton sateen"
        },
        {
          "label": "Weight",
          "value": "140 gsm"
        },
        {
          "label": "Width",
          "value": "250 cm"
        },
        {
          "label": "Finish",
          "value": "300 thread count"
        },
        {
          "label": "Min. order",
          "value": "200 sets"
        }
      ]
    },
    {
      "category": "home-decor",
      "image": "/images/products/home-decor-08.jpg",
      "alt": "Upholstery Fabric — Stone",
      "variant": "Stone",
      "name": "Upholstery Fabric",
      "line": "340 gsm · 140 cm",
      "specs": [
        {
          "label": "Composition",
          "value": "60% Cotton / 40% Polyester"
        },
        {
          "label": "Weight",
          "value": "340 gsm"
        },
        {
          "label": "Width",
          "value": "140 cm"
        },
        {
          "label": "Finish",
          "value": "50 000 Martindale"
        },
        {
          "label": "Min. order",
          "value": "100 m"
        }
      ]
    },
    {
      "category": "home-decor",
      "image": "/images/products/home-decor-09.jpg",
      "alt": "Throws & Blankets — Oatmeal",
      "variant": "Oatmeal",
      "name": "Throws & Blankets",
      "line": "380 gsm · 130 × 170 cm",
      "specs": [
        {
          "label": "Composition",
          "value": "100% Cotton"
        },
        {
          "label": "Weight",
          "value": "380 gsm"
        },
        {
          "label": "Size",
          "value": "130 × 170 cm"
        },
        {
          "label": "Finish",
          "value": "Hand-knotted fringe"
        },
        {
          "label": "Min. order",
          "value": "100 pcs"
        }
      ]
    },
    {
      "category": "home-decor",
      "image": "/images/products/home-decor-10.jpg",
      "alt": "Kitchen Textiles — Waffle",
      "variant": "Waffle",
      "name": "Kitchen Textiles",
      "line": "220 gsm · 50 × 70 cm",
      "specs": [
        {
          "label": "Composition",
          "value": "100% Cotton waffle"
        },
        {
          "label": "Weight",
          "value": "220 gsm"
        },
        {
          "label": "Size",
          "value": "50 × 70 cm"
        },
        {
          "label": "Finish",
          "value": "High absorbency"
        },
        {
          "label": "Min. order",
          "value": "300 pcs"
        }
      ]
    },
    {
      "category": "accessories",
      "image": "/images/products/accessories-01.jpg",
      "alt": "Tote Bags — Natural",
      "variant": "Natural",
      "name": "Tote Bags",
      "line": "320 gsm · 38 × 42 cm",
      "specs": [
        {
          "label": "Composition",
          "value": "100% Cotton canvas"
        },
        {
          "label": "Weight",
          "value": "320 gsm"
        },
        {
          "label": "Size",
          "value": "38 × 42 cm"
        },
        {
          "label": "Finish",
          "value": "Reinforced handles"
        },
        {
          "label": "Min. order",
          "value": "300 pcs"
        }
      ]
    },
    {
      "category": "accessories",
      "image": "/images/products/accessories-02.jpg",
      "alt": "Tote Bags — Printed",
      "variant": "Printed",
      "name": "Tote Bags",
      "line": "320 gsm · 38 × 42 cm",
      "specs": [
        {
          "label": "Composition",
          "value": "100% Cotton canvas"
        },
        {
          "label": "Weight",
          "value": "320 gsm"
        },
        {
          "label": "Size",
          "value": "38 × 42 cm"
        },
        {
          "label": "Finish",
          "value": "Reinforced handles"
        },
        {
          "label": "Min. order",
          "value": "300 pcs"
        }
      ]
    },
    {
      "category": "accessories",
      "image": "/images/products/accessories-03.jpg",
      "alt": "Tote Bags — Webbing detail",
      "variant": "Webbing detail",
      "name": "Tote Bags",
      "line": "320 gsm · 38 × 42 cm",
      "specs": [
        {
          "label": "Composition",
          "value": "100% Cotton canvas"
        },
        {
          "label": "Weight",
          "value": "320 gsm"
        },
        {
          "label": "Size",
          "value": "38 × 42 cm"
        },
        {
          "label": "Finish",
          "value": "Reinforced handles"
        },
        {
          "label": "Min. order",
          "value": "300 pcs"
        }
      ]
    },
    {
      "category": "accessories",
      "image": "/images/products/accessories-04.jpg",
      "alt": "Tote Bags — Lined interior",
      "variant": "Lined interior",
      "name": "Tote Bags",
      "line": "320 gsm · 38 × 42 cm",
      "specs": [
        {
          "label": "Composition",
          "value": "100% Cotton canvas"
        },
        {
          "label": "Weight",
          "value": "320 gsm"
        },
        {
          "label": "Size",
          "value": "38 × 42 cm"
        },
        {
          "label": "Finish",
          "value": "Reinforced handles"
        },
        {
          "label": "Min. order",
          "value": "300 pcs"
        }
      ]
    },
    {
      "category": "accessories",
      "image": "/images/products/accessories-05.jpg",
      "alt": "Woven Trims — Jacquard",
      "variant": "Jacquard",
      "name": "Woven Trims",
      "line": "— · 15 – 60 mm",
      "specs": [
        {
          "label": "Composition",
          "value": "Cotton / Viscose"
        },
        {
          "label": "Weight",
          "value": "—"
        },
        {
          "label": "Width",
          "value": "15 – 60 mm"
        },
        {
          "label": "Finish",
          "value": "Custom jacquard repeat"
        },
        {
          "label": "Min. order",
          "value": "1 000 m"
        }
      ]
    },
    {
      "category": "accessories",
      "image": "/images/products/accessories-06.jpg",
      "alt": "Woven Trims — Herringbone",
      "variant": "Herringbone",
      "name": "Woven Trims",
      "line": "— · 15 – 60 mm",
      "specs": [
        {
          "label": "Composition",
          "value": "Cotton / Viscose"
        },
        {
          "label": "Weight",
          "value": "—"
        },
        {
          "label": "Width",
          "value": "15 – 60 mm"
        },
        {
          "label": "Finish",
          "value": "Custom jacquard repeat"
        },
        {
          "label": "Min. order",
          "value": "1 000 m"
        }
      ]
    },
    {
      "category": "accessories",
      "image": "/images/products/accessories-07.jpg",
      "alt": "Woven Trims — Close-up",
      "variant": "Close-up",
      "name": "Woven Trims",
      "line": "— · 15 – 60 mm",
      "specs": [
        {
          "label": "Composition",
          "value": "Cotton / Viscose"
        },
        {
          "label": "Weight",
          "value": "—"
        },
        {
          "label": "Width",
          "value": "15 – 60 mm"
        },
        {
          "label": "Finish",
          "value": "Custom jacquard repeat"
        },
        {
          "label": "Min. order",
          "value": "1 000 m"
        }
      ]
    },
    {
      "category": "accessories",
      "image": "/images/products/accessories-08.jpg",
      "alt": "Pouches & Cases — Natural",
      "variant": "Natural",
      "name": "Pouches & Cases",
      "line": "280 gsm · Made to spec",
      "specs": [
        {
          "label": "Composition",
          "value": "100% Cotton drill"
        },
        {
          "label": "Weight",
          "value": "280 gsm"
        },
        {
          "label": "Size",
          "value": "Made to spec"
        },
        {
          "label": "Finish",
          "value": "Cotton lined, metal zip"
        },
        {
          "label": "Min. order",
          "value": "300 pcs"
        }
      ]
    },
    {
      "category": "accessories",
      "image": "/images/products/accessories-09.jpg",
      "alt": "Pouches & Cases — Zip detail",
      "variant": "Zip detail",
      "name": "Pouches & Cases",
      "line": "280 gsm · Made to spec",
      "specs": [
        {
          "label": "Composition",
          "value": "100% Cotton drill"
        },
        {
          "label": "Weight",
          "value": "280 gsm"
        },
        {
          "label": "Size",
          "value": "Made to spec"
        },
        {
          "label": "Finish",
          "value": "Cotton lined, metal zip"
        },
        {
          "label": "Min. order",
          "value": "300 pcs"
        }
      ]
    },
    {
      "category": "accessories",
      "image": "/images/products/accessories-10.jpg",
      "alt": "Pouches & Cases — Full set",
      "variant": "Full set",
      "name": "Pouches & Cases",
      "line": "280 gsm · Made to spec",
      "specs": [
        {
          "label": "Composition",
          "value": "100% Cotton drill"
        },
        {
          "label": "Weight",
          "value": "280 gsm"
        },
        {
          "label": "Size",
          "value": "Made to spec"
        },
        {
          "label": "Finish",
          "value": "Cotton lined, metal zip"
        },
        {
          "label": "Min. order",
          "value": "300 pcs"
        }
      ]
    }
  ],
  "mill": [
    {
      "image": "/images/mill/mill-01.jpg",
      "alt": "Yarn preparation and winding",
      "step": "Step 01",
      "title": "Yarn & Warping"
    },
    {
      "image": "/images/mill/mill-02.jpg",
      "alt": "Looms weaving fabric",
      "step": "Step 02",
      "title": "Weaving"
    },
    {
      "image": "/images/mill/mill-03.jpg",
      "alt": "Dyeing and finishing",
      "step": "Step 03",
      "title": "Dyeing & Finishing"
    },
    {
      "image": "/images/mill/mill-04.jpg",
      "alt": "Quality inspection table",
      "step": "Step 04",
      "title": "Inspection"
    },
    {
      "image": "/images/mill/mill-05.jpg",
      "alt": "Rolls packed for export",
      "step": "Step 05",
      "title": "Packing & Export"
    }
  ]
};
