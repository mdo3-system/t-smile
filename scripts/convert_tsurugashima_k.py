import os
from PIL import Image

conversions = [
    (r"raw_source_cases\鶴ヶ島市 K様邸\レタッチ無カット\全て\_DSC8433.jpg", "public/images/cases/tsurugashima-k/photo_07__dsc8433.webp"),
    (r"raw_source_cases\鶴ヶ島市 K様邸\レタッチ無カット\全て\_DSC8457.jpg", "public/images/cases/tsurugashima-k/photo_08__dsc8457.webp"),
    (r"raw_source_cases\鶴ヶ島市 K様邸\レタッチ無カット\全て\_DSC8461.jpg", "public/images/cases/tsurugashima-k/photo_09__dsc8461.webp"),
]

for src, dst in conversions:
    im = Image.open(src)
    if im.mode in ("RGBA", "P"):
        im = im.convert("RGB")
    im.save(dst, "WEBP", quality=88)
    print(f"Converted {src} -> {dst} ({os.path.getsize(dst)} bytes)")

# Remove old files
old_files = [
    "public/images/cases/tsurugashima-k/photo_07__dsc8421.webp",
    "public/images/cases/tsurugashima-k/photo_08__dsc8424.webp",
    "public/images/cases/tsurugashima-k/photo_09__dsc8428.webp"
]
for f in old_files:
    if os.path.exists(f):
        os.remove(f)
        print(f"Removed old file {f}")

