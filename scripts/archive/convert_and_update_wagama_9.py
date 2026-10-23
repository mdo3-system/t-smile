import os
import json
from PIL import Image

mapping = [
    {
        "id": 3,
        "src": "sample_data/others/cs045.jpg",
        "dest": "public/images/wagama/cs045_theater.webp",
        "web_path": "/images/wagama/cs045_theater.webp",
        "story": "「リビングで大画面映画を楽しみたい！」というご要望に、熟練大工が手作りで専用のホームシアターボードをミリ単位で造作。上部天井には電動スクリーンが美しくビルトイン格納されており、配線も壁内完全隠蔽。普段は美しい無垢家具、夜は迫力のシアター空間に一変します。"
    },
    {
        "id": 7,
        "src": "sample_data/others/promo122.jpg",
        "dest": "public/images/wagama/promo122_ecocarat.webp",
        "web_path": "/images/wagama/promo122_ecocarat.webp",
        "story": "「湿気や生活臭が気になるけれど、見た目もお洒落にこだわりたい」という奥様のご希望で、調湿・脱臭機能に優れたエコカラットをアクセントウォールに採用。熟練タイル職人の精密な施工と間接照明の陰影により、ホテルのような上質な質感を演出しています。"
    },
    {
        "id": 9,
        "src": "sample_data/others/interior_l (9).jpg",
        "dest": "public/images/wagama/interior_l_9.webp",
        "web_path": "/images/wagama/interior_l_9.webp",
        "story": "「どこにいても家族の気配を感じられる、明るく開放的な大きな吹き抜けが欲しい」。高気密高断熱（実測C値0.3台）だからこそ、冬でも足元が冷えず家中が均一な温度に保たれる快適な大吹き抜け空間を実現しました。"
    },
    {
        "id": 10,
        "src": "sample_data/others/陶美亭057.jpg",
        "dest": "public/images/wagama/tobitei_057.webp",
        "web_path": "/images/wagama/tobitei_057.webp",
        "story": "「友人を招いて大人数でくつろげる、とにかく広ーいリビングにしたい」。許容応力度計算による構造設計で耐震等級3を維持しながら、柱のない大空間LDKを創出。無垢床と珪藻土の心地よい空気感に包まれます。"
    },
    {
        "id": 13,
        "src": "sample_data/others/promo100.jpg",
        "dest": "public/images/wagama/promo100_cubic.webp",
        "web_path": "/images/wagama/promo100_cubic.webp",
        "story": "「無駄な凹凸のない、洗練されたキュービックデザインの外観がいい」。箱型のシンプルモダンな外観シルエットに、自然素材の質感をプラス。メンテナンス性と耐久性にも配慮した美しい佇まいです。"
    },
    {
        "id": 15,
        "src": "sample_data/others/DSC_0436.jpg",
        "dest": "public/images/wagama/dsc_0436.webp",
        "web_path": "/images/wagama/dsc_0436.webp",
        "story": "「夜空の星を眺めたり、バーベキューができる屋上が欲しい」。防水職人との綿密な施工と強固な構造設計により、プライベートな青空リビングとしての屋上空間を安全に実現しました。"
    },
    {
        "id": 16,
        "src": "sample_data/others/promo103.jpg",
        "dest": "public/images/wagama/promo103_shosai.webp",
        "web_path": "/images/wagama/promo103_shosai.webp",
        "story": "「テレワークや趣味に没頭できる、落ち着いた書斎コーナーが欲しい」。熟練大工が造り付けた無垢カウンターデスクと本棚で、コンパクトながら機能美あふれる男の隠れ家空間を仕立てました。"
    },
    {
        "id": 17,
        "src": "sample_data/others/koagari.jpg",
        "dest": "public/images/wagama/koagari.webp",
        "web_path": "/images/wagama/koagari.webp",
        "story": "「LDKの一角に、腰掛けてくつろげる畳コーナー・小上りが欲しい」。下部に大容量の引き出し収納を大工が手作りで組み込み、ちょっと横になったり子どもと遊べる憩いのスペースに。"
    },
    {
        "id": 18,
        "src": "sample_data/others/j_room.jpg",
        "dest": "public/images/wagama/j_room.webp",
        "web_path": "/images/wagama/j_room.webp",
        "story": "「い草の香りに包まれる、床の間や雪見障子のある本格和室が欲しい」。手刻みのできる熟練大工が真壁や長押、障子の建付けまで精魂込めて仕上げた、凛とした静謐が漂う本格数寄屋和室です。"
    }
]

# 1. Convert all 9 images to WebP
for m in mapping:
    src = m["src"]
    dest = m["dest"]
    if os.path.exists(src):
        img = Image.open(src).convert("RGB")
        # Resize to max 1200px width/height while maintaining aspect ratio
        img.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        img.save(dest, "WEBP", quality=88)
        print(f"Saved: {dest} (from {src})")
    else:
        print(f"Warning: source not found: {src}")

# 2. Update wagama_testimonials.json
json_path = "public/data/wagama_testimonials.json"
with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

for m in mapping:
    for item in data:
        if item.get("id") == m["id"]:
            item["image"] = m["web_path"]
            item["story"] = m["story"]
            print(f"Updated JSON item id={m['id']}: image={m['web_path']}")
            break

with open(json_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Done updating wagama testimonials!")
