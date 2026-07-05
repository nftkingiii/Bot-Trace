from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "apps" / "web" / "public" / "assets"


def key_cream_background(image):
    image = image.convert("RGBA")
    pixels = image.load()
    width, height = image.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            is_cream = r > 210 and g > 190 and b > 135 and (r - b) > 18 and abs(r - g) < 70
            is_pale_shadow = r > 185 and g > 175 and b > 145 and abs(r - g) < 35 and abs(g - b) < 55
            if is_cream or is_pale_shadow:
                pixels[x, y] = (r, g, b, 0)

    alpha = image.getchannel("A").filter(ImageFilter.GaussianBlur(0.7))
    image.putalpha(alpha)
    bbox = alpha.getbbox()
    return image.crop(bbox) if bbox else image


def make_mini_bots():
    sheet = Image.open(ASSETS / "mini-bots.webp")
    crops = [
        (54, 58, 322, 305),
        (356, 56, 625, 306),
        (658, 54, 930, 310),
        (54, 370, 330, 620),
        (356, 362, 642, 624),
        (650, 356, 930, 628),
    ]

    for index, crop in enumerate(crops, start=1):
        bot = key_cream_background(sheet.crop(crop))
        bot.save(ASSETS / f"mini-bot-{index}.png")


def feathered_main_bot():
    source = Image.open(ASSETS / "main-bot-reference.png").convert("RGBA")
    crop = source.crop((492, 110, 1165, 860))
    crop = crop.convert("RGBA")

    # Desaturate slightly and tint toward the page palette while preserving highlights.
    pixels = crop.load()
    width, height = crop.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            gray = int((r * 0.3) + (g * 0.56) + (b * 0.14))
            r = int(gray * 0.78 + 255 * 0.08)
            g = int(gray * 0.78 + 47 * 0.06)
            b = int(gray * 0.82 + 154 * 0.14)
            pixels[x, y] = (min(r, 255), min(g, 255), min(b, 255), a)

    mask = Image.new("L", crop.size, 0)
    mask_pixels = mask.load()
    for y in range(height):
        for x in range(width):
            left = min(1, x / 95)
            right = min(1, (width - 1 - x) / 80)
            top = min(1, y / 95)
            bottom = min(1, (height - 1 - y) / 120)
            radial_x = (x - width * 0.54) / (width * 0.58)
            radial_y = (y - height * 0.54) / (height * 0.62)
            radial = max(0, 1 - (radial_x * radial_x + radial_y * radial_y))
            text_fade = 1
            if y > height * 0.74 and x > width * 0.44:
                text_fade = max(0, 1 - ((y - height * 0.74) / (height * 0.16)))
            if y > height * 0.84:
                text_fade = min(text_fade, max(0, 1 - ((y - height * 0.84) / (height * 0.12))))
            alpha = int(255 * min(left, right, top, bottom) * min(1, radial * 1.45) * text_fade)
            mask_pixels[x, y] = alpha

    mask = mask.filter(ImageFilter.GaussianBlur(8))
    crop.putalpha(mask)
    crop.save(ASSETS / "main-bot-blended.png")


if __name__ == "__main__":
    make_mini_bots()
    feathered_main_bot()
