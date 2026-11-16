"""Generate public/favicon.svg and the PNG icons from one geometry.

The mark: a lime check inside a ring split into the eight routine colours,
on #0B0D12. Run locally (needs Pillow): python3 src/pwa/generate-icons.py
The outputs are committed; the build never runs this.
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw

BG = "#0B0D12"
ACCENT = "#D4FF5C"
# Same order as ROUTINE_COLOR_KEYS in src/design/palette.ts, clockwise from the top.
RING = ["#FFB84D", "#4CC9F0", "#A78BFA", "#FF7A66", "#5B9BFF", "#5BE38A", "#F27DB5", "#3DD6C3"]
GAP = 6  # degrees between segments
C, R, W = 256, 168, 34  # centre, ring radius, stroke width (512 grid)
# Ring outer edge is 185 of 256: inside the 80% maskable safe zone (205).
CHECK = [(190, 264), (238, 310), (326, 206)]
SS = 4  # supersampling factor for smooth PNG edges
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "icons"


def hex_rgb(h: str):
    return tuple(int(h[i : i + 2], 16) for i in (1, 3, 5))


def segments():
    """(start, end) in degrees, clockwise from 12 o'clock, one per colour."""
    step = 360 / len(RING)
    for i in range(len(RING)):
        yield i * step + GAP / 2, (i + 1) * step - GAP / 2


def svg() -> str:
    def pt(deg):
        a = math.radians(deg - 90)
        return C + R * math.cos(a), C + R * math.sin(a)

    arcs = []
    for color, (a0, a1) in zip(RING, segments()):
        (x0, y0), (x1, y1) = pt(a0), pt(a1)
        arcs.append(
            f'  <path d="M{x0:.2f} {y0:.2f} A{R} {R} 0 0 1 {x1:.2f} {y1:.2f}" fill="none" stroke="{color}" stroke-width="{W}"/>'
        )
    pts = " L".join(f"{x} {y}" for x, y in CHECK)
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">\n'
        f'  <rect width="512" height="512" fill="{BG}"/>\n' + "\n".join(arcs) + "\n"
        f'  <path d="M{pts}" fill="none" stroke="{ACCENT}" stroke-width="{W + 4}" stroke-linecap="round" stroke-linejoin="round"/>\n'
        "</svg>\n"
    )


def render(size: int) -> Image.Image:
    s = size * SS
    k = s / 512
    img = Image.new("RGB", (s, s), hex_rgb(BG))  # opaque, no transparency
    d = ImageDraw.Draw(img)
    box = [(C - R) * k, (C - R) * k, (C + R) * k, (C + R) * k]
    for color, (a0, a1) in zip(RING, segments()):
        # PIL angles run clockwise from 3 o'clock.
        d.arc(box, a0 - 90, a1 - 90, fill=hex_rgb(color), width=round(W * k))
    w = round((W + 4) * k)
    pts = [(x * k, y * k) for x, y in CHECK]
    d.line(pts, fill=hex_rgb(ACCENT), width=w, joint="curve")
    for x, y in (pts[0], pts[-1]):
        d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=hex_rgb(ACCENT))
    return img.resize((size, size), Image.LANCZOS)


(ROOT / "public" / "favicon.svg").write_text(svg())
print("wrote favicon.svg")
OUT.mkdir(parents=True, exist_ok=True)
for name, size in (
    ("icon-192.png", 192),
    ("icon-512.png", 512),
    ("icon-maskable-512.png", 512),
    ("apple-touch-icon.png", 180),
):
    render(size).save(OUT / name, optimize=True)
    print("wrote", name)
