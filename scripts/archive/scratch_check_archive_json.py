import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('public/data/cases_gallery_archive.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

cases = d.get('cases', [])
print('Cases count in cases_gallery_archive.json:', len(cases))
for c in cases:
    print(f"Case {c.get('id')}: {c.get('title')[:20]}... photos: {len(c.get('photos', []))}")
