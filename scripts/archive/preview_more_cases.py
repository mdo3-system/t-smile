# -*- coding: utf-8 -*-
import os
import sys
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

cases = [
    ("吉見町 O様邸", "yoshimi_o"),
    ("鳩山町 T様邸", "hatoyama_t"),
    ("鶴ヶ島市 A様邸", "tsurugashima_a"),
    ("鶴ヶ島市 T様邸", "tsurugashima_t")
]

for name, prefix in cases:
    p = os.path.join("raw_source_case", name)
    if not os.path.exists(p):
        continue
    imgs = []
    for root, dirs, files in os.walk(p):
        for f in sorted(files):
            if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                imgs.append(os.path.join(root, f))
    print(f"{name}: {len(imgs)} photos")
    step = max(1, len(imgs) // 12)
    selected = imgs[::step][:12]
    thumbs = []
    for ip in selected:
        try:
            im = Image.open(ip).convert('RGB')
            im.thumbnail((320, 213))
            thumbs.append((os.path.basename(ip), ip, im))
        except Exception:
            pass
    cols = 4
    rows = (len(thumbs) + cols - 1) // cols
    grid = Image.new('RGB', (cols * 330, rows * 230), (30, 30, 30))
    for idx, (fn, fullp, th) in enumerate(thumbs):
        r = idx // cols
        c = idx % cols
        grid.paste(th, (c * 330 + 5, r * 230 + 5))
    grid.save(f"scratch_{prefix}_grid.jpg", quality=85)
    print(f"Saved scratch_{prefix}_grid.jpg")
