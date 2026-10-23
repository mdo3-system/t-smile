# -*- coding: utf-8 -*-
"""
scripts/process_top_slider_photos.py
トップ画像用6枚の写真を色合い調整・解像度最適化・WebP変換
"""
import os
from PIL import Image, ImageEnhance, ImageOps

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOP_SRC_DIR = os.path.join(BASE_DIR, 'raw_source_cases', 'トップ画像用')
DEST_DIR = os.path.join(BASE_DIR, 'public', 'images', 'hero_slider')
os.makedirs(DEST_DIR, exist_ok=True)

# 6枚の写真定義と補正パラメータ
# target_order, filename, base_id, brightness, contrast, color, sharpness
SLIDES_CONFIG = [
    {
        'file': 'DSC_3459.jpg',
        'id': 'slide_01_facade_garage',
        'title': '【外観・ガレージ】青空に映える洗練のモダンファサード',
        'sub': '埼玉の街並みに美しく調和するビルトインガレージ×無垢アクセント玄関',
        'tag': '🏡 完全自由設計 ｜ 外観・インナーガレージ',
        'bright': 1.05, 'contrast': 1.06, 'color': 1.08, 'sharp': 1.15
    },
    {
        'file': '_DSC8427.jpg',
        'id': 'slide_02_woodstove_living',
        'title': '【木組みと薪ストーブ】大谷石カウンター×一枚板座卓の極上LDK',
        'sub': 'ときがわ町K様邸。勾配天井の太い梁と薪ストーブの柔らかな輻射熱',
        'tag': '🔥 自然素材の温もり ｜ 薪ストーブ×大谷石LDK',
        'bright': 1.04, 'contrast': 1.05, 'color': 1.05, 'sharp': 1.15
    },
    {
        'file': 'IMG_9281.jpg',
        'id': 'slide_03_artisan_kitchen',
        'title': '【大工造作キッチン】手刻み技術が息づくオーダーメイド対面カウンター',
        'sub': '鶴ヶ島市T様邸。現場に合わせて大工が造るオリジナル収納家具と小上がり畳',
        'tag': '🍽️ 熟練大工の内部造作 ｜ フルオーダー対面キッチン',
        'bright': 1.08, 'contrast': 1.05, 'color': 1.06, 'sharp': 1.2
    },
    {
        'file': 'DSC_3580.jpg',
        'id': 'slide_04_open_living_void',
        'title': '【大空間吹き抜け】真冬も素足で駆け回れる超高気密高断熱LDK',
        'sub': '全棟許容応力度計算耐震3だから叶う、柱のない大開口リビングと自然光',
        'tag': '🌲 柱のない大空間 ｜ 開放的な吹き抜けLDK',
        'bright': 1.03, 'contrast': 1.04, 'color': 1.04, 'sharp': 1.15
    },
    {
        'file': 'bath.jpg',
        'id': 'slide_05_hinoki_custom_bath',
        'title': '【職人造作ヒノキ風呂】庭を望む十和田石と天然ヒノキの在来浴室',
        'sub': '大工・タイル職人・防水職人が一丸となって創り上げた、温泉宿のような癒やしの空間',
        'tag': '♨️ 職人造作の美 ｜ ヒノキ風呂×在来浴室',
        'bright': 1.08, 'contrast': 1.06, 'color': 1.08, 'sharp': 1.2
    },
    {
        'file': 'IMG_0136.jpg',
        'id': 'slide_06_loft_bedroom',
        'title': '【ロフト付き主寝室】大人の遊び心とリゾート感を満たす勾配天井',
        'sub': '木製手すりロフトとアクセントウォール。家族それぞれのこだわりを形に',
        'tag': '✨ 多彩な空間設計 ｜ ロフト付きプライベートルーム',
        'bright': 1.02, 'contrast': 1.04, 'color': 1.05, 'sharp': 1.15
    }
]

def enhance_and_export():
    print(f"=== PROCESSING {len(SLIDES_CONFIG)} TOP SLIDER PHOTOS ===")
    results = []

    for item in SLIDES_CONFIG:
        src_path = os.path.join(TOP_SRC_DIR, item['file'])
        if not os.path.exists(src_path):
            print(f"[ERROR] Source not found: {src_path}")
            continue

        with Image.open(src_path) as img:
            img = img.convert('RGB')
            w, h = img.size

            # Resize to max 1920 width / height with high quality
            max_dim = 1920
            if max(w, h) > max_dim:
                if w >= h:
                    nw = max_dim
                    nh = int(h * (max_dim / w))
                else:
                    nh = max_dim
                    nw = int(w * (max_dim / h))
                img = img.resize((nw, nh), Image.Resampling.LANCZOS)
                print(f"  {item['file']} resized from {w}x{h} to {nw}x{nh}")
            else:
                print(f"  {item['file']} preserved size {w}x{h}")

            # Color balancing & tone adjustments
            enh_bright = ImageEnhance.Brightness(img)
            img = enh_bright.enhance(item['bright'])

            enh_cont = ImageEnhance.Contrast(img)
            img = enh_cont.enhance(item['contrast'])

            enh_col = ImageEnhance.Color(img)
            img = enh_col.enhance(item['color'])

            enh_sharp = ImageEnhance.Sharpness(img)
            img = enh_sharp.enhance(item['sharp'])

            # Export WebP & JPG
            webp_name = f"{item['id']}.webp"
            jpg_name = f"{item['id']}.jpg"
            webp_out = os.path.join(DEST_DIR, webp_name)
            jpg_out = os.path.join(DEST_DIR, jpg_name)

            img.save(webp_out, 'WEBP', quality=88, method=6)
            img.save(jpg_out, 'JPEG', quality=90, optimize=True)

            sz_kb = os.path.getsize(webp_out) // 1024
            print(f"  Saved -> {webp_name} ({sz_kb} KB)")

            results.append({
                'id': item['id'],
                'webp': f"/images/hero_slider/{webp_name}",
                'jpg': f"/images/hero_slider/{jpg_name}",
                'title': item['title'],
                'sub': item['sub'],
                'tag': item['tag']
            })

    print(f"[COMPLETE] Successfully generated {len(results)} slider assets in {DEST_DIR}!")
    return results

if __name__ == '__main__':
    enhance_and_export()
