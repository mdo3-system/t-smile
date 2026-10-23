# -*- coding: utf-8 -*-
import os
from PIL import Image

def make_preview(case_id):
    p = os.path.join('public', 'images', 'cases_real', case_id)
    files = [f for f in sorted(os.listdir(p)) if f.endswith('.jpg')]
    thumbs = []
    for f in files:
        im = Image.open(os.path.join(p, f)).convert('RGB')
        im.thumbnail((300, 200))
        thumbs.append((f, im))
    
    # 4列で並べる
    cols = 4
    rows = (len(thumbs) + cols - 1) // cols
    canvas = Image.new('RGB', (cols * 310, rows * 210), (30, 30, 30))
    for idx, (f, thumb) in enumerate(thumbs):
        r = idx // cols
        c = idx % cols
        canvas.paste(thumb, (c * 310 + 5, r * 210 + 5))
    canvas.save(f'scratch_{case_id}_preview.jpg', quality=85)
    print(f'Saved scratch_{case_id}_preview.jpg with {len(thumbs)} photos')

make_preview('case1')
make_preview('case4')
make_preview('case6')
