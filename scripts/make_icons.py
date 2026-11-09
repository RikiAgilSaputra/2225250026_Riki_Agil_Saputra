"""Generates the PWA PNG icons with only the standard library (no Pillow needed).

The logo is three rising steps ("langkah") on a navy rounded square.
Run: python scripts/make_icons.py
"""

import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "apps" / "web" / "public" / "icons"
NAVY = (31, 78, 137)
SKY = (238, 244, 251)
ORANGE = (240, 138, 36)
WHITE = (255, 255, 255)


def inside_round_rect(x, y, size, radius):
    r = radius
    cx = min(max(x, r), size - r)
    cy = min(max(y, r), size - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def color_at(u, v, maskable):
    """u, v in [0, 1). Returns RGBA."""
    pad = 0.0 if maskable else 0.04
    if maskable:
        bg = NAVY
    else:
        size = 1 - 2 * pad
        if not (pad <= u < 1 - pad and pad <= v < 1 - pad) or not inside_round_rect(u - pad, v - pad, size, 0.22 * size):
            return (0, 0, 0, 0)
        bg = NAVY
    # Logo safe zone: inner 60% for maskable, 72% otherwise
    s = 0.56 if maskable else 0.66
    o = (1 - s) / 2
    lx, ly = (u - o) / s, (v - o) / s
    if 0 <= lx < 1 and 0 <= ly < 1:
        # three steps, each 1/3 wide, heights 1/3, 2/3, 1 (from bottom)
        step = int(lx * 3)
        height = (step + 1) / 3
        if ly >= 1 - height and (lx * 3 - step) < 0.86:
            return (*(ORANGE if step == 2 else WHITE), 255)
        # small dot above the top step (the learner)
        if step == 2 and ((lx - 0.83) ** 2 + (ly + 0.02 - 0.0) ** 2) < 0.0:
            return (*SKY, 255)
    return (*bg, 255)


def render(size, maskable=False, ss=3):
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            acc = [0, 0, 0, 0]
            for sy in range(ss):
                for sx in range(ss):
                    c = color_at((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size, maskable)
                    for i in range(4):
                        acc[i] += c[i]
            row += bytes(int(a / (ss * ss)) for a in acc)
        rows.append(bytes(row))
    raw = b"".join(rows)

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect x="2" y="2" width="60" height="60" rx="14" fill="#1F4E89"/>
<rect x="11" y="37" width="12" height="16" rx="2" fill="#fff"/>
<rect x="26" y="25" width="12" height="28" rx="2" fill="#fff"/>
<rect x="41" y="11" width="12" height="42" rx="2" fill="#F08A24"/>
</svg>
"""

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "icon-192.png").write_bytes(render(192))
    (OUT / "icon-512.png").write_bytes(render(512, ss=2))
    (OUT / "icon-maskable-512.png").write_bytes(render(512, maskable=True, ss=2))
    (OUT / "apple-touch-icon.png").write_bytes(render(180, maskable=True))
    (OUT / "favicon.svg").write_text(SVG, encoding="utf-8")
    print("icons written to", OUT)
