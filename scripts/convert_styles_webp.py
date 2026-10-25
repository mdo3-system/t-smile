import os
import sys
import json
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

styles_dir = r"sample_data\styles"
out_dir = r"public\images\styles"
os.makedirs(out_dir, exist_ok=True)

with open(r"public\data\housing_styles_db.json", "r", encoding="utf-8") as f:
    db = json.load(f)

for item in db:
    file_name = item["file"]
    style_id = item["id"]
    in_path = os.path.join(styles_dir, file_name)
    
    if not os.path.exists(in_path):
        print(f"Error: {in_path} not found!")
        continue
        
    with Image.open(in_path) as img:
        w, h = img.size
        # 1. Full collage WebP (1600px wide, crisp for modals)
        full_w = 1600
        full_h = int(h * (full_w / w))
        img_full = img.resize((full_w, full_h), Image.Resampling.LANCZOS)
        out_full_path = os.path.join(out_dir, f"{style_id}_full.webp")
        img_full.save(out_full_path, "WEBP", quality=85)
        
        # 2. Card thumbnail (800px wide, fast loading)
        thumb_w = 800
        thumb_h = int(h * (thumb_w / w))
        img_thumb = img.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        out_thumb_path = os.path.join(out_dir, f"{style_id}_thumb.webp")
        img_thumb.save(out_thumb_path, "WEBP", quality=82)

        # 3. Crop Exterior (Top-Left: ~ 0 to 35% width, 0 to 50% height)
        # 4. Crop LDK (Top-Center: ~ 35% to 70% width, 0 to 50% height)
        ext_crop = img.crop((0, 0, int(w * 0.35), int(h * 0.5)))
        ext_crop = ext_crop.resize((600, int(600 * (ext_crop.height / ext_crop.width))), Image.Resampling.LANCZOS)
        ext_crop.save(os.path.join(out_dir, f"{style_id}_exterior.webp"), "WEBP", quality=82)

        ldk_crop = img.crop((int(w * 0.35), 0, int(w * 0.70), int(h * 0.5)))
        ldk_crop = ldk_crop.resize((600, int(600 * (ldk_crop.height / ldk_crop.width))), Image.Resampling.LANCZOS)
        ldk_crop.save(os.path.join(out_dir, f"{style_id}_ldk.webp"), "WEBP", quality=82)

    full_kb = os.path.getsize(out_full_path) / 1024
    thumb_kb = os.path.getsize(out_thumb_path) / 1024
    print(f"[{style_id}] converted: full={full_kb:.1f}KB, thumb={thumb_kb:.1f}KB")

print("All 21 style images successfully converted to WebP!")
