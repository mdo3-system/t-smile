import json

with open('public/data/wagama_testimonials.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

print("First item keys:", list(d[0].keys()))

for item in d:
    for k, v in item.items():
        if any(w in k.lower() for w in ['image', 'photo', 'img', 'thumb', 'pic']):
            print(f"id={item.get('id')} {k}={v} title={item.get('title')}")
