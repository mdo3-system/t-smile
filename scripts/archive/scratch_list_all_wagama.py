import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('public/data/wagama_testimonials.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

for item in d:
    print(f"id={item.get('id'):2d} | title={item.get('title')} | image={item.get('image')}")
