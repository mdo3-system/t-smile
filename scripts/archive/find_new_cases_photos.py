# -*- coding: utf-8 -*-
import os
import sys
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

BASE = "raw_source_case"

cases_to_explore = [
    ("東松山市 K様邸", "higashimatsuyama_k"),
    ("鶴ヶ島市 KB様邸", "tsurugashima_kb"),
    ("川越市 Y様邸", "kawagoe_y")
]

for folder_name, out_prefix in cases_to_explore:
    dir_path = os.path.join(BASE, folder_name)
    if not os.path.exists(dir_path):
        dir_path = os.path.join("raw_source_cases", folder_name)
    
    print(f"\n=== {folder_name} ({dir_path}) ===")
    all_imgs = []
    for root, dirs, files in os.walk(dir_path):
        for f in sorted(files):
            if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                all_imgs.append(os.path.join(root, f))
    
    print(f"Total images found: {len(all_imgs)}")
    # 代表的な12枚を抽出してサムネイルグリッド作成
    step = max(1, len(all_imgs) // 12)
    selected = all_imgs[::step][:12]
    
    thumbs = []
    for img_p in selected:
        try:
            im = Image.open(img_p).convert('RGB')
            im.thumbnail((320, 213))
            thumbs.append((os.path.basename(img_p), img_p, im))
        except Exception as e:
            print(f"Error loading {img_p}: {e}")
            
    cols = 4
    rows = (len(thumbs) + cols - 1) // cols
    grid = Image.new('RGB', (cols * 330, rows * 230), (30, 30, 30))
    for idx, (fname, fullp, th) in enumerate(thumbs):
        r = idx // cols
        c = idx % cols
        grid.paste(th, (c * 330 + 5, r * 230 + 5))
        print(f"  [{idx+1}] {fname} -> {fullp}")
        
    out_file = f"scratch_{out_prefix}_grid.jpg"
    grid.save(out_file, quality=85)
    print(f"Saved {out_file}")
