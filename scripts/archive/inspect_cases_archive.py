# -*- coding: utf-8 -*-
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
with open('public/data/cases_gallery_archive.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total cases: {len(data.get('cases', []))}")
for idx, c in enumerate(data.get('cases', [])):
    title = c.get('title', '')
    city = c.get('city', '')
    photos = len(c.get('photos', []))
    dir_name = c.get('dir', '')
    tags = ", ".join(c.get('tags', []))
    print(f"[{idx+1}] {title} ({city}) | 写真{photos}枚 | tags: {tags} | dir: {dir_name}")
