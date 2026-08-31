"""Generate the PWA PNG icons with no third-party dependencies.

Draws a white speech bubble on a teal rounded square, supersampled for clean
edges, and writes real PNGs via zlib + a hand-rolled chunk writer. Run with:

    python tools/gen_icons.py
"""

import struct
import zlib
from pathlib import Path

TEAL = (14, 124, 111)
WHITE = (255, 255, 255)
OUT = Path(__file__).resolve().parent.parent / "icons"


def rounded_rect(x, y, x0, y0, x1, y1, r):
    """True if (x, y) is inside the rounded rectangle."""
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    dx, dy = x - cx, y - cy
    return dx * dx + dy * dy <= r * r


def in_triangle(x, y, a, b, c):
    def side(p, q, r):
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])

    d1, d2, d3 = side(a, b, (x, y)), side(b, c, (x, y)), side(c, a, (x, y))
    neg = d1 < 0 or d2 < 0 or d3 < 0
    pos = d1 > 0 or d2 > 0 or d3 > 0
    return not (neg and pos)


def bubble(x, y, scale, cx=0.5, cy=0.5):
    """Speech-bubble coverage test in 0..1 space, scaled about the centre."""

    def s(v, c):
        return c + (v - c) / scale

    bx0, by0, bx1, by1 = s(0.15, cx), s(0.19, cy), s(0.85, cx), s(0.65, cy)
    if rounded_rect(x, y, bx0, by0, bx1, by1, 0.15 / scale):
        return True
    tail = (
        (s(0.33, cx), s(0.60, cy)),
        (s(0.33, cx), s(0.84, cy)),
        (s(0.55, cx), s(0.62, cy)),
    )
    return in_triangle(x, y, *tail)


def render(size, supersample, corner_radius, bubble_scale):
    """Return RGB rows for one icon."""
    n = size * supersample
    rows = []
    inv = 1.0 / n
    for py in range(size):
        row = bytearray()
        for px in range(size):
            r_acc = g_acc = b_acc = 0
            for sy in range(supersample):
                y = (py * supersample + sy + 0.5) * inv
                for sx in range(supersample):
                    x = (px * supersample + sx + 0.5) * inv
                    if corner_radius > 0 and not rounded_rect(
                        x, y, 0.0, 0.0, 1.0, 1.0, corner_radius
                    ):
                        # Outside the rounded square: transparent-looking cream
                        # so the icon still reads on light and dark shelves.
                        col = (251, 246, 236)
                    elif bubble(x, y, bubble_scale):
                        col = WHITE
                    else:
                        col = TEAL
                    r_acc += col[0]
                    g_acc += col[1]
                    b_acc += col[2]
            k = supersample * supersample
            row += bytes((r_acc // k, g_acc // k, b_acc // k))
        rows.append(bytes(row))
    return rows


def write_png(path, rows, size):
    raw = b"".join(b"\x00" + r for r in rows)

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)
    print(f"wrote {path.name} ({len(png):,} bytes)")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    # Standard icons: rounded square, bubble at full size.
    write_png(OUT / "icon-192.png", render(192, 3, 0.22, 1.0), 192)
    write_png(OUT / "icon-512.png", render(512, 2, 0.22, 1.0), 512)
    # Maskable: full bleed, artwork pulled inside the 80% safe zone.
    write_png(OUT / "icon-maskable-512.png", render(512, 2, 0.0, 1.45), 512)


if __name__ == "__main__":
    main()
