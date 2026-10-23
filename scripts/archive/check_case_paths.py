# -*- coding: utf-8 -*-
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
with open('public/data/cases_gallery_archive.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for idx in [1, 2, 4, 6, 7, 8, 9, 11]: # 0-indexed: 1=吉見町O様, 2=川越市Y様, 4=東松山市K様, 6=鳩山町T様, 7=鶴ヶ島A様, 8=鶴ヶ島KB様, 9=鶴ヶ島K様, 11=鶴ヶ島T様
    c = data['cases'][idx]
    title = c['title']
    photos = c.get('photos', [])
    print(f"\n=== [{idx+1}] {title} (写真{len(photos)}枚) ===")
    for p in photos[:5]:
        p_path = p.get('path', '') if isinstance(p, dict) else str(p)
        exists = os.path.exists(p_path) or os.path.exists(os.path.join('public', p_path.lstrip('/\\')))
        print(f"  {p_path} (exists={exists})")
