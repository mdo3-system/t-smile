import json

with open('public/data/wagama_testimonials.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

targets = ['cs045', 'interior_l', 'promo122', '陶美亭', 'promo100', 'DSC_0436', 'promo103', 'koagari', 'j_room', 'ホームシアター', '吹き抜け', 'エコカラット', 'リビング', 'キュービック', '屋上', '書斎', '小上り', '畳', '和室']

for item in d:
    title = item.get('title', '')
    img = item.get('image', '')
    story = item.get('story', '')
    for t in targets:
        if t in title or t in img or t in story:
            print(f"Match for '{t}': id={item.get('id')} | title={title} | img={img}")
            break
