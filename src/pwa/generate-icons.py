"""Generate the PNG icons from the same geometry as public/favicon.svg.

Run locally (needs Pillow): python3 src/pwa/generate-icons.py
The PNGs are committed; the build never runs this.
"""
from pathlib import Path
from PIL import Image, ImageDraw

BG = (11, 13, 18)
ACCENT = (212, 255, 92)
SS = 4  # supersampling factor for smooth edges
OUT = Path(__file__).resolve().parents[2] / "public" / "icons"


def render(size: int) -> Image.Image:
    s = size * SS
    k = s / 512
    img = Image.new("RGB", (s, s), BG)  # opaque, no transparency
    d = ImageDraw.Draw(img)
    w = round(36 * k)
    c, r = 256 * k, 150 * k
    d.ellipse([c - r - w / 2, c - r - w / 2, c + r + w / 2, c + r + w / 2], fill=ACCENT)
    d.ellipse([c - r + w / 2, c - r + w / 2, c + r - w / 2, c + r - w / 2], fill=BG)
    pts = [(186 * k, 262 * k), (238 * k, 312 * k), (332 * k, 204 * k)]
    d.line(pts, fill=ACCENT, width=w, joint="curve")
    for x, y in (pts[0], pts[-1]):
        d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=ACCENT)
    return img.resize((size, size), Image.LANCZOS)


OUT.mkdir(parents=True, exist_ok=True)
for name, size in (
    ("icon-192.png", 192),
    ("icon-512.png", 512),
    ("icon-maskable-512.png", 512),
    ("apple-touch-icon.png", 180),
):
    render(size).save(OUT / name, optimize=True)
    print("wrote", name)
