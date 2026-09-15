#!/usr/bin/env python3
"""
Shrink the site's photos so the page never hangs.

Run from the project root, after dropping your own photos into images/:

    python3 tools/optimize.py            # resize + compress everything
    python3 tools/optimize.py --dry-run  # just show what would change

Each image is resized to the target size for its slot (see images/README.md),
stripped of camera metadata, and re-saved as a progressive JPEG. Images that
are already small enough are left alone.

Requires Pillow:  pip install --user Pillow
"""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow is not installed. Run:  pip install --user Pillow")

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "images"

# folder -> (target width, target height). Images are cropped to fill this box,
# centred, so the shape always matches what the layout expects.
TARGETS = {
    "hero": (1920, 1080),
    "categories": (1200, 1500),
    "products": (1000, 1250),
    "mill": (1400, 900),
    "about": (1200, 1500),
}
ROOT_TARGETS = {"og-cover.jpg": (1200, 630)}

QUALITY = 82
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def human(n: int) -> str:
    return f"{n / 1024:.0f} KB" if n < 1024 * 1024 else f"{n / 1024 / 1024:.2f} MB"


def target_for(path: Path):
    if path.parent == IMAGES:
        return ROOT_TARGETS.get(path.name)
    return TARGETS.get(path.parent.name)


def process(path: Path, dry_run: bool) -> tuple[int, int]:
    size = target_for(path)
    if size is None:
        return 0, 0

    before = path.stat().st_size
    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im)          # honour phone rotation
        sw, sh = im.size
        tw, th = size

        # Shrink to fit inside the slot, never enlarge. The layout uses
        # object-fit: cover, so it crops at display time — pre-cropping here
        # would throw away parts of the photo for no benefit.
        scale = min(tw / sw, th / sh, 1.0)
        new_size = (max(1, round(sw * scale)), max(1, round(sh * scale)))

        # Warn when the photo is a very different shape from its slot, because
        # the browser will crop the difference away.
        src_ratio, slot_ratio = sw / sh, tw / th
        off = abs(src_ratio - slot_ratio) / slot_ratio
        shape_note = ""
        if off > 0.15:
            shape_note = f"  ⚠ shape {sw}×{sh} vs slot {tw}×{th} — will be cropped"

        if dry_run:
            print(f"  would write {path.relative_to(ROOT)}  {im.size} -> {new_size}{shape_note}")
            return before, before

        out = path.with_suffix(".jpg")
        flat = im.convert("RGB")                  # drops alpha; JPEG has none
        if new_size != (sw, sh):
            flat = flat.resize(new_size, Image.LANCZOS)
        flat.save(out, "JPEG", quality=QUALITY, optimize=True, progressive=True)

    # A .png/.jpeg/.webp original becomes .jpg — drop the old file so the page,
    # which asks for .jpg, does not end up with two copies.
    if out != path:
        path.unlink()

    after = out.stat().st_size
    print(f"  {str(out.relative_to(ROOT)):40} {human(before):>9} -> {human(after):>9}{shape_note}")
    return before, after


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="show changes without writing")
    args = ap.parse_args()

    if not IMAGES.is_dir():
        sys.exit(f"No images folder at {IMAGES}")

    files = sorted(
        p for p in IMAGES.rglob("*")
        if p.is_file() and p.suffix.lower() in EXTENSIONS and p.parent.name != "brand"
    )
    if not files:
        sys.exit("No images found.")

    print(f"Optimising {len(files)} image(s) in {IMAGES}\n")
    total_before = total_after = 0
    skipped = []

    for path in files:
        if target_for(path) is None:
            skipped.append(path)
            continue
        b, a = process(path, args.dry_run)
        total_before += b
        total_after += a

    print(f"\nTotal: {human(total_before)} -> {human(total_after)}", end="")
    if total_before:
        print(f"  ({100 - total_after * 100 // total_before}% smaller)")
    else:
        print()

    if skipped:
        print("\nSkipped (no known size for this location):")
        for p in skipped:
            print(f"  {p.relative_to(ROOT)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
