from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "apps" / "web" / "public"
ASSETS = PUBLIC / "assets"
SOURCE = Path(r"C:\Users\HP\Downloads\Phone Link\1783228889835.png")


def crop_mark(source):
    image = Image.open(source).convert("RGBA")
    width, height = image.size
    # Gemini's clean dark preview has the mark centered; crop with enough
    # breathing room for the glow but without the large empty background.
    box = (
        round(width * 0.26),
        round(height * 0.28),
        round(width * 0.74),
        round(height * 0.72),
    )
    mark = image.crop(box)

    # Softly remove near-uniform dark outer corners for the transparent preview.
    bg = Image.new("RGBA", mark.size, mark.getpixel((0, 0)))
    diff = ImageChops.difference(mark, bg).convert("L")
    alpha = diff.point(lambda value: 0 if value < 10 else min(255, value * 4))
    preview = mark.copy()
    preview.putalpha(alpha)
    return mark, preview


def save_square_icon(mark, size, path):
    canvas = Image.new("RGBA", (size, size), (7, 8, 13, 255))
    resized = mark.resize((size, size), Image.Resampling.LANCZOS)
    canvas.alpha_composite(resized)
    canvas.save(path)


if __name__ == "__main__":
    ASSETS.mkdir(parents=True, exist_ok=True)
    mark, transparent_preview = crop_mark(SOURCE)
    mark.save(ASSETS / "bottrace-gemini-mark-source.png")
    transparent_preview.save(ASSETS / "bottrace-gemini-mark-transparent.png")
    save_square_icon(mark, 32, PUBLIC / "favicon-32.png")
    save_square_icon(mark, 192, PUBLIC / "icon-192.png")
    save_square_icon(mark, 512, PUBLIC / "logo-mark-512.png")
    save_square_icon(mark, 512, ASSETS / "brand-mark-preview.png")
