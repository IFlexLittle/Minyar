#!/usr/bin/env python3
"""Generate the PWA icons for Minyar's Garden Quest.

Pure-python PNG writer (no dependencies): paints a soft pastel
gradient with a pink heart-blossom, supersampled 2x for smooth edges.

Usage:  python3 tools/make_icons.py
Writes: icons/icon-192.png, icons/icon-512.png, icons/apple-touch-icon.png
"""
import math
import os
import struct
import zlib


def lerp(a, b, t):
    return a + (b - a) * t


def in_heart(nx, ny, scale):
    """Classic implicit heart curve. nx, ny in [-1, 1], y up."""
    x = nx / scale
    y = ny / scale
    v = (x * x + y * y - 1.0)
    return v * v * v - x * x * y * y * y <= 0.0


def render(size):
    ss = 2  # supersample factor
    big = size * ss
    px = [[(0, 0, 0, 255)] * big for _ in range(big)]

    top = (255, 236, 214)      # warm cream
    bottom = (247, 190, 214)   # pastel pink
    sparkles = [(0.28, 0.2, 0.035), (0.76, 0.3, 0.025), (0.7, 0.74, 0.03),
                (0.24, 0.72, 0.022), (0.5, 0.12, 0.02)]

    for j in range(big):
        for i in range(big):
            u = i / (big - 1)
            v = j / (big - 1)

            # vertical gradient + soft radial glow behind the heart
            t = v
            r = lerp(top[0], bottom[0], t)
            g = lerp(top[1], bottom[1], t)
            b = lerp(top[2], bottom[2], t)
            d = math.hypot(u - 0.5, v - 0.47)
            glow = max(0.0, 1.0 - d / 0.55) ** 2 * 0.35
            r = lerp(r, 255, glow)
            g = lerp(g, 250, glow)
            b = lerp(b, 240, glow)

            # heart (y up, centered slightly above middle)
            nx = (u - 0.5) * 2.0
            ny = (0.44 - v) * 2.0
            if in_heart(nx, ny * 1.06 + 0.02, 0.60):
                # inner highlight heart
                if in_heart(nx * 1.55, (ny + 0.05) * 1.7, 0.60):
                    r, g, b = 248, 168, 201
                else:
                    r, g, b = 226, 109, 158
                # top-left sheen
                if math.hypot(nx + 0.28, ny - 0.28) < 0.16:
                    r, g, b = 250, 200, 222

            # tiny sparkles
            for sx, sy, sr in sparkles:
                dd = math.hypot(u - sx, v - sy)
                if dd < sr:
                    k = 1.0 - dd / sr
                    r = lerp(r, 255, k * 0.9)
                    g = lerp(g, 252, k * 0.9)
                    b = lerp(b, 235, k * 0.9)

            px[j][i] = (int(r), int(g), int(b), 255)

    # box-downsample
    out = bytearray()
    for j in range(size):
        out.append(0)  # filter: none
        for i in range(size):
            rs = gs = bs = 0
            for dj in range(ss):
                for di in range(ss):
                    c = px[j * ss + dj][i * ss + di]
                    rs += c[0]; gs += c[1]; bs += c[2]
            n = ss * ss
            out += bytes((rs // n, gs // n, bs // n, 255))
    return bytes(out)


def write_png(path, size, raw):
    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', ihdr)
           + chunk(b'IDAT', zlib.compress(raw, 9))
           + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)
    print('wrote %s (%d bytes)' % (path, len(png)))


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    outdir = os.path.join(root, 'icons')
    os.makedirs(outdir, exist_ok=True)
    for name, size in (('icon-192.png', 192), ('apple-touch-icon.png', 180), ('icon-512.png', 512)):
        write_png(os.path.join(outdir, name), size, render(size))


if __name__ == '__main__':
    main()
