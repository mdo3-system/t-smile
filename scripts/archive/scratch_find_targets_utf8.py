import json
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

with open('public/data/wagama_testimonials.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

for item in d:
    title = item.get('title', '')
    img = item.get('image', '')
    # Check if any user keyword matches
    keywords = ['ホームシアター', '吹き抜け', 'エコカラット', 'リビング', 'キュービック', '屋上', '書斎', '畳', '小上り', '和室']
    if any(k in title for k in keywords):
        print(f"id={item.get('id'):2d} | title={title} | image={img}")
