"""Generate the Kiss 字幕 app icon set.

The mark is a speech bubble with a play triangle and two subtitle bars:
"watch YouTube + read the bilingual subtitle" in one simple silhouette.
Run from mobile/:  python scripts/generate-icons.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "assets" / "images"
S = 4  # supersampling
SIZE = 1024
CANVAS = SIZE * S
PURPLE = (124, 92, 255)
PURPLE_DEEP = (92, 62, 214)
BG_TOP = (39, 29, 63)
BG_BOTTOM = (9, 6, 15)


def background(size: int) -> Image.Image:
    y = np.linspace(0, 1, size)[:, None]
    x = np.linspace(0, 1, size)[None, :]
    t = np.clip(y * 0.82 + x * 0.18, 0, 1)
    top = np.array(BG_TOP, dtype=np.float32)
    bottom = np.array(BG_BOTTOM, dtype=np.float32)
    rgb = top[None, None, :] * (1 - t[:, :, None]) + bottom[None, None, :] * t[:, :, None]

    # Soft violet glow behind the mark.
    cx, cy, radius = size * 0.5, size * 0.42, size * 0.56
    yy, xx = np.mgrid[0:size, 0:size]
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / radius
    glow = np.clip(1 - dist, 0, 1) ** 2.2
    glow_color = np.array([108, 77, 246], dtype=np.float32)
    rgb = rgb * (1 - 0.34 * glow[:, :, None]) + glow_color[None, None, :] * (0.34 * glow[:, :, None])

    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")


def logo_layer(monochrome: bool = False) -> Image.Image:
    """Transparent 4096px logo layer. Coordinates are in 1024-space."""
    img = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    def box(values):
        return tuple(int(v * S) for v in values)

    # Speech bubble body and a short, centered tail.
    d.rounded_rectangle(box((286, 254, 738, 654)), radius=124 * S, fill=(255, 255, 255, 255))
    d.polygon(
        [
            (390 * S, 622 * S),
            (378 * S, 742 * S),
            (498 * S, 640 * S),
        ],
        fill=(255, 255, 255, 255),
    )

    if monochrome:
        mask = Image.new("L", img.size, 255)
        md = ImageDraw.Draw(mask)
        md.polygon(
            [(468 * S, 398 * S), (468 * S, 532 * S), (602 * S, 465 * S)],
            fill=0,
        )
        md.rounded_rectangle(box((382, 566, 562, 590)), radius=12 * S, fill=0)
        md.rounded_rectangle(box((404, 608, 540, 632)), radius=12 * S, fill=0)
        alpha = img.getchannel("A")
        alpha = Image.composite(alpha, Image.new("L", img.size, 0), mask)
        img.putalpha(alpha)
    else:
        glyph = Image.new("RGBA", img.size, (0, 0, 0, 0))
        gd = ImageDraw.Draw(glyph)
        gd.polygon(
            [(468 * S, 398 * S), (468 * S, 532 * S), (602 * S, 465 * S)],
            fill=(*PURPLE_DEEP, 255),
        )
        gd.rounded_rectangle(box((382, 566, 562, 590)), radius=12 * S, fill=(*PURPLE_DEEP, 255))
        gd.rounded_rectangle(box((404, 608, 540, 632)), radius=12 * S, fill=(*PURPLE_DEEP, 255))
        img = Image.alpha_composite(img, glyph)

    return img


def rounded_icon(size: int) -> Image.Image:
    bg = background(size * S)
    logo = logo_layer().resize((size * S, size * S), Image.LANCZOS)
    out = Image.alpha_composite(bg.convert("RGBA"), logo)
    mask = Image.new("L", out.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, out.size[0], out.size[1]), radius=int(224 * S * size / SIZE), fill=255
    )
    out.putalpha(mask)
    return out.resize((size, size), Image.LANCZOS)


def padded_logo(size: int, scale: float = 0.66, monochrome: bool = False) -> Image.Image:
    drawn = int(size * S * scale)
    layer = logo_layer(monochrome=monochrome).resize((drawn, drawn), Image.LANCZOS)
    canvas = Image.new("RGBA", (size * S, size * S), (0, 0, 0, 0))
    offset = ((size * S - drawn) // 2, (size * S - drawn) // 2)
    canvas.alpha_composite(layer, offset)
    return canvas.resize((size, size), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    icon = rounded_icon(1024)
    icon.convert("RGB").save(OUT / "icon.png", optimize=True)

    bg = background(SIZE * S).resize((512, 512), Image.LANCZOS).convert("RGB")
    bg.save(OUT / "android-icon-background.png", optimize=True)

    fg = padded_logo(512, scale=0.62)
    fg.save(OUT / "android-icon-foreground.png", optimize=True)

    mono = padded_logo(432, scale=0.62, monochrome=True)
    mono.save(OUT / "android-icon-monochrome.png", optimize=True)

    splash = padded_logo(512, scale=0.74)
    splash.save(OUT / "splash-icon.png", optimize=True)

    favicon = rounded_icon(96).resize((48, 48), Image.LANCZOS)
    favicon.save(OUT / "favicon.png", optimize=True)

    print("icons written", sorted(p.name for p in OUT.glob("*.png")))


if __name__ == "__main__":
    main()
