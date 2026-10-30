import os
from PIL import Image

conversions = [
    (r"raw_source_cases\鶴ヶ島市 A様邸\レタッチ無カット\リビング\_DSC8501.jpg", "public/images/cases/tsurugashima-a/photo_06__dsc8501.webp"),
    (r"raw_source_cases\鶴ヶ島市 A様邸\レタッチ無カット\リビング\_DSC8509.jpg", "public/images/cases/tsurugashima-a/photo_08__dsc8509.webp"),
    (r"raw_source_cases\鶴ヶ島市 A様邸\レタッチ無カット\和室\_DSC8485.jpg", "public/images/cases/tsurugashima-a/photo_12__dsc8485.webp"),
]

for src, dst in conversions:
    im = Image.open(src)
    # Convert RGB if needed
    if im.mode in ("RGBA", "P"):
        im = im.convert("RGB")
    im.save(dst, "WEBP", quality=88)
    print(f"Converted {src} -> {dst} (size: {os.path.getsize(dst)} bytes)")

