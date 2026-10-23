import json

with open('public/data/wagama_testimonials.json', 'r', encoding='utf-8') as f:
    items = json.load(f)

targets = [
    'ホームシアター', 'ﾎｰﾑｼｱﾀｰ',
    '吹き抜け',
    'エコカラット', 'ｴｺｶﾗｯﾄ',
    'ひろ～い', '広ーい',
    'キュービック', 'ｷｭｰﾋﾞｯｸ',
    '屋上',
    '書斎',
    '小上り', '畳ｺｰﾅｰ',
    '和室'
]

for idx, it in enumerate(items):
    t = it.get('title', '')
    for tg in targets:
        if tg in t:
            print(f"Index {idx:2d} | title: {t:25s} | img: {it.get('image')}")
            break
