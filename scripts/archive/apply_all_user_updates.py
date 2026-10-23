# -*- coding: utf-8 -*-
"""
scripts/apply_all_user_updates.py
ユーザー様の全指示を一括で高精度に適用するマスター更新スクリプト
1. 鶴ヶ島市T様邸 IMG_9318.jpg による三位一体HERO画像(craftsman_architect_tag)の置換
2. わがまま9枚の実邸写真WebP変換とwagama_testimonials.json更新
3. caseStudiesDataの各ケース写真最大20枚厳選 & CASE 13除外
4. section-craftsmanship.html のCASE 13除外 & HEROキャプション更新
5. section-top.html のFVスライダーを新6枚に完全同期
"""
import os
import json
import re
from PIL import Image, ImageEnhance

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
IMAGES_DIR = os.path.join(PUBLIC_DIR, 'images')
WAGAMA_DIR = os.path.join(IMAGES_DIR, 'wagama')
DATA_DIR = os.path.join(PUBLIC_DIR, 'data')
SRC_DIR = os.path.join(BASE_DIR, 'src', 'partials')

os.makedirs(WAGAMA_DIR, exist_ok=True)

# ---------------------------------------------------------
# 1. 三位一体HERO画像 (craftsman_architect_tag) を T様邸造作風呂で置換
# ---------------------------------------------------------
def update_craftsman_hero():
    src_bath = os.path.join(BASE_DIR, 'raw_source_cases', '鶴ヶ島市 T様邸', 'バス・トイレ', 'IMG_9318.jpg')
    if os.path.exists(src_bath):
        with Image.open(src_bath) as img:
            img = img.convert('RGB')
            # 1920x1280
            w, h = img.size
            if max(w, h) > 1920:
                img = img.resize((1920, int(h * (1920 / w))), Image.Resampling.LANCZOS)
            
            # ユーザー様指摘「暗い」を解消：明るさ・コントラスト・彩度補正
            img = ImageEnhance.Brightness(img).enhance(1.12)
            img = ImageEnhance.Contrast(img).enhance(1.06)
            img = ImageEnhance.Color(img).enhance(1.08)
            img = ImageEnhance.Sharpness(img).enhance(1.15)

            webp_p = os.path.join(IMAGES_DIR, 'craftsman_architect_tag.webp')
            jpg_p = os.path.join(IMAGES_DIR, 'craftsman_architect_tag.jpg')
            img.save(webp_p, 'WEBP', quality=88, method=6)
            img.save(jpg_p, 'JPEG', quality=90, optimize=True)
            print(f"[HERO] Updated craftsman_architect_tag with T様邸造作風呂 IMG_9318.jpg ({os.path.getsize(webp_p)//1024} KB)")

# ---------------------------------------------------------
# 2. わがまま9枚の画像変換 & wagama_testimonials.json 更新
# ---------------------------------------------------------
WAGAMA_REPLACEMENTS = [
    {
        'target_kw': 'ホームシアター',
        'src_file': 'cs045.jpg',
        'dst_webp': 'cs045.webp',
        'new_story': '「大工さん手作りの専用ホームシアターボード！上部には電動スクリーンが美しくビルトインされ、配線も一切見えません。夜は間接照明を落として、家族だけのプライベート映画館になります。」',
        'resol_text': '大工造作の特注AVボードと天井ビルトイン電動スクリーン。スピーカー配線をミリ単位で隠蔽設計'
    },
    {
        'target_kw': 'エコカラット',
        'src_file': 'promo122.jpg',
        'dst_webp': 'promo122.webp',
        'new_story': None, 'resol_text': None
    },
    {
        'target_kw': '吹き抜け',
        'src_file': 'interior_l (9).jpg',
        'dst_webp': 'interior_l_9.webp',
        'new_story': None, 'resol_text': None
    },
    {
        'target_kw': 'ひろ～い',
        'src_file': '陶美亭057.jpg',
        'dst_webp': 'tobitei_057.webp',
        'new_story': None, 'resol_text': None
    },
    {
        'target_kw': 'キュービック',
        'src_file': 'promo100.jpg',
        'dst_webp': 'promo100_cubic.webp',
        'new_story': None, 'resol_text': None
    },
    {
        'target_kw': '屋上',
        'src_file': 'DSC_0436.jpg',
        'dst_webp': 'dsc_0436.webp',
        'new_story': None, 'resol_text': None
    },
    {
        'target_kw': '書斎',
        'src_file': 'promo103.jpg',
        'dst_webp': 'promo103_shosai.webp',
        'new_story': None, 'resol_text': None
    },
    {
        'target_kw': '小上り',
        'src_file': 'koagari.jpg',
        'dst_webp': 'koagari.webp',
        'new_story': None, 'resol_text': None
    },
    {
        'target_kw': '和室',
        'src_file': 'j_room.jpg',
        'dst_webp': 'j_room.webp',
        'new_story': None, 'resol_text': None
    }
]

def update_wagama():
    others_dir = os.path.join(BASE_DIR, 'sample_data', 'others')
    json_path = os.path.join(DATA_DIR, 'wagama_testimonials.json')
    with open(json_path, 'r', encoding='utf-8') as f:
        items = json.load(f)

    for r in WAGAMA_REPLACEMENTS:
        src_p = os.path.join(others_dir, r['src_file'])
        if os.path.exists(src_p):
            with Image.open(src_p) as img:
                img = img.convert('RGB')
                w, h = img.size
                if max(w, h) > 1200:
                    img = img.resize((1200, int(h * (1200 / w))), Image.Resampling.LANCZOS)
                img = ImageEnhance.Brightness(img).enhance(1.05)
                img = ImageEnhance.Contrast(img).enhance(1.04)
                img = ImageEnhance.Color(img).enhance(1.05)
                dst_p = os.path.join(WAGAMA_DIR, r['dst_webp'])
                img.save(dst_p, 'WEBP', quality=88, method=6)
                print(f"[WAGAMA IMG] Converted {r['src_file']} -> {r['dst_webp']} ({os.path.getsize(dst_p)//1024} KB)")

        # Update json entry
        for item in items:
            if r['target_kw'] in item.get('title', ''):
                item['image'] = f"/images/wagama/{r['dst_webp']}"
                if r['new_story']:
                    item['oral_story'] = r['new_story']
                if r['resol_text']:
                    item['craft_resolution'] = r['resol_text']
                print(f"[WAGAMA JSON] Updated '{item.get('title')}' with /images/wagama/{r['dst_webp']}")
                break

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    print("[WAGAMA] Updated wagama_testimonials.json successfully!")

# ---------------------------------------------------------
# 3. caseStudiesDataの各ケース写真最大20枚選別 & CASE 13除外
# ---------------------------------------------------------
def filter_case_photos(photos, max_count=20):
    if len(photos) <= max_count:
        return photos

    # 均等サンプリング（最初と最後を保持しつつ代表カットを選定）
    # ステップ計算
    total = len(photos)
    step = total / float(max_count)
    selected_indices = set()
    for i in range(max_count):
        idx = min(int(round(i * step)), total - 1)
        selected_indices.add(idx)
    
    # 常に最後のインデックスも含める
    selected_indices.add(total - 1)
    sorted_indices = sorted(list(selected_indices))[:max_count]
    return [photos[i] for i in sorted_indices]

def update_app_js_cases():
    app_js_path = os.path.join(PUBLIC_DIR, 'js', 'app.js')
    with open(app_js_path, 'r', encoding='utf-8') as f:
        code = f.read()

    # match const caseStudiesData = { ... };
    m = re.search(r'const caseStudiesData = (\{.*?\n\};)', code, re.DOTALL)
    if not m:
        print("[ERROR] caseStudiesData not found in app.js")
        return

    # Parse and rewrite caseStudiesData safely
    data_block = m.group(1)
    
    # We will parse case by case using regex
    case_regex = re.compile(r'\"(\d+)\":\s*\{\s*\"title\":\s*\"(.*?)\",\s*\"sub\":\s*\"(.*?)\",\s*\"client\":\s*\"(.*?)\",\s*\"carpenter\":\s*\"(.*?)\",\s*\"architect\":\s*\"(.*?)\",\s*\"photographer\":\s*\"(.*?)\",\s*\"photos\":\s*\[(.*?)\]\s*\}', re.DOTALL)
    
    new_cases = []
    for match in case_regex.finditer(data_block):
        cid = match.group(1)
        if cid == '13':
            print("[CASE] Excluding CASE 13 (特別実邸・戸田市萩原様邸) from case studies archive")
            continue
        
        title = match.group(2)
        sub = match.group(3)
        client = match.group(4)
        carpenter = match.group(5)
        architect = match.group(6)
        photographer = match.group(7)
        raw_photos_str = match.group(8)

        # parse photo objects
        photo_regex = re.compile(r'\{\s*\"url\":\s*\"(.*?)\",\s*\"caption\":\s*\"(.*?)\"\s*\}')
        photos = []
        for pm in photo_regex.finditer(raw_photos_str):
            photos.append({'url': pm.group(1), 'caption': pm.group(2)})
        
        orig_count = len(photos)
        selected_photos = filter_case_photos(photos, max_count=20)
        
        # update sub with new photo count
        new_sub = re.sub(r'プロ撮影 全\d+枚', f'プロ撮影 全{len(selected_photos)}枚', sub)
        if 'プロ撮影' not in new_sub:
            new_sub += f' ｜ プロ撮影 全{len(selected_photos)}枚'

        print(f"[CASE {cid}] Filtered photos: {orig_count} -> {len(selected_photos)}枚 ({title[:25]})")

        photos_json = json.dumps(selected_photos, ensure_ascii=False, indent=6)
        # Indent nicely
        case_code = f"""  "{cid}": {{
    "title": "{title}",
    "sub": "{new_sub}",
    "client": "{client}",
    "carpenter": "{carpenter}",
    "architect": "{architect}",
    "photographer": "{photographer}",
    "photos": {photos_json}
  }}"""
        new_cases.append(case_code)

    new_data_block = "const caseStudiesData = {\n" + ",\n".join(new_cases) + "\n};"
    updated_code = code[:m.start()] + new_data_block + code[m.end():]

    with open(app_js_path, 'w', encoding='utf-8') as f:
        f.write(updated_code)
    print("[APP.JS] Successfully updated caseStudiesData (all <= 20 photos, CASE 13 excluded)!")

# ---------------------------------------------------------
# 4. section-craftsmanship.html の更新
# ---------------------------------------------------------
def update_craftsmanship_html():
    craft_path = os.path.join(SRC_DIR, 'section-craftsmanship.html')
    with open(craft_path, 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Update Hero Image & Caption
    html = re.sub(
        r'<div class="image-caption-badge">専属大工職人 × 構造建築士 × お施主様の三位一体家づくり</div>',
        '<div class="image-caption-badge">大工職人 × タイル職人 × 防水職人 × 建築士の連携による本格在来（造作）浴室</div>',
        html
    )

    # 2. Exclude Case 13 card block
    # <!-- Case 13: 特別実邸・戸田市萩原様邸 --> ... </div>
    case13_pattern = re.compile(r'\s*<!-- Case 13: 特別実邸・戸田市萩原様邸 -->.*?<!-- End Case 13 -->', re.DOTALL)
    if not case13_pattern.search(html):
        # alternative pattern matching
        case13_pattern2 = re.compile(r'\s*<!-- Case 13: 特別実邸・戸田市萩原様邸 -->.*?data-case-id="13".*?</div>\s*</div>', re.DOTALL)
        html = case13_pattern2.sub('', html)
    else:
        html = case13_pattern.sub('', html)

    # 3. Update total cases text from "全12実邸＋特別実邸" -> "全12実邸"
    html = html.replace('全12実邸＋特別実邸', '全12実邸')
    html = html.replace('全12邸＋特別実邸', '全12邸')

    # 4. Update Carpenter description to reflect metal-joint pre-cut structure + master carpenter interior custom craftsmanship
    html = re.sub(
        r'手刻みができる大工が木癖を見極めて内部造作を手がける現場施工',
        '強靭な金物工法プレカット構造と、手刻みの技量を持つ熟練大工が木癖を見極めて造り付ける内部造作・オリジナル家具',
        html
    )

    with open(craft_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("[HTML] Updated section-craftsmanship.html!")

# ---------------------------------------------------------
# 5. section-top.html の FV スライダーを新6枚に完全同期
# ---------------------------------------------------------
def update_top_slider_html():
    top_path = os.path.join(SRC_DIR, 'section-top.html')
    with open(top_path, 'r', encoding='utf-8') as f:
        html = f.read()

    new_slides_html = """        <div class="hero-slider-stage" id="top-hero-slider-stage">
          <!-- Slide 1: 外観・ガレージ・青空 (DSC_3459) -->
          <div class="hero-slide-item active">
            <img src="/images/hero_slider/slide_01_facade_garage.webp" alt="【外観実邸実例】青空に映える洗練のモダンファサードとビルトインガレージ" fetchpriority="high" width="1920" height="1278" />
            <div class="hero-slide-caption">
              <span class="hero-slide-tag" style="background: rgba(2, 132, 199, 0.9);">🏡 完全自由設計 ｜ 外観・インナーガレージ</span>
              <p class="hero-slide-heading">埼玉の青空に映える、ビルトインガレージ×無垢アクセント玄関の洗練美</p>
            </div>
          </div>

          <!-- Slide 2: 薪ストーブ×大谷石×一枚板座卓 (_DSC8427) -->
          <div class="hero-slide-item">
            <img src="/images/hero_slider/slide_02_woodstove_living.webp" alt="【木組みと薪ストーブ】大谷石カウンター×一枚板座卓の極上LDK" loading="lazy" width="1920" height="1277" />
            <div class="hero-slide-caption">
              <span class="hero-slide-tag" style="background: rgba(217, 119, 6, 0.9);">🔥 自然素材の温もり ｜ ときがわ町 K様邸</span>
              <p class="hero-slide-heading">勾配天井の太い梁と大谷石薪ストーブ。冬でも家中が柔らかな輻射熱に包まれる暮らし</p>
            </div>
          </div>

          <!-- Slide 3: 大工造作キッチン×対面カウンター (IMG_9281) -->
          <div class="hero-slide-item">
            <img src="/images/hero_slider/slide_03_artisan_kitchen.webp" alt="【熟練大工の内部造作】フルオーダー対面キッチン×小上がり畳" loading="lazy" width="1920" height="1280" />
            <div class="hero-slide-caption">
              <span class="hero-slide-tag" style="background: rgba(13, 148, 136, 0.9);">🍽️ 熟練大工の内部造作 ｜ 鶴ヶ島市 T様邸</span>
              <p class="hero-slide-heading">手刻みの技量を持つ大工が現場でミリ単位で仕立てる、フルオーダー対面キッチン</p>
            </div>
          </div>

          <!-- Slide 4: 大空間吹き抜けLDK (DSC_3580) -->
          <div class="hero-slide-item">
            <img src="/images/hero_slider/slide_04_open_living_void.webp" alt="【大空間吹き抜け】真冬も素足で駆け回れる超高気密高断熱LDK" loading="lazy" width="1920" height="1278" />
            <div class="hero-slide-caption">
              <span class="hero-slide-tag" style="background: rgba(16, 185, 129, 0.9);">🌲 柱のない大空間 ｜ 開放的な吹き抜けLDK</span>
              <p class="hero-slide-heading">全棟許容応力度計算耐震等級3だから叶う、柱のない大開口リビングと自然光</p>
            </div>
          </div>

          <!-- Slide 5: 職人造作ヒノキ風呂 (bath.jpg) -->
          <div class="hero-slide-item">
            <img src="/images/hero_slider/slide_05_hinoki_custom_bath.webp" alt="【職人造作ヒノキ風呂】庭を望む十和田石と天然ヒノキの在来浴室" loading="lazy" width="800" height="600" />
            <div class="hero-slide-caption">
              <span class="hero-slide-tag" style="background: rgba(180, 83, 9, 0.9);">♨️ 職人造作の美 ｜ ヒノキ風呂×在来浴室</span>
              <p class="hero-slide-heading">庭の緑を望む十和田石と大工手作りのヒノキ浴槽。自宅で味わう温泉宿の寛ぎ</p>
            </div>
          </div>

          <!-- Slide 6: ロフト付き主寝室 (IMG_0136) -->
          <div class="hero-slide-item">
            <img src="/images/hero_slider/slide_06_loft_bedroom.webp" alt="【ロフト付き主寝室】大人の遊び心とリゾート感を満たす勾配天井" loading="lazy" width="1920" height="1279" />
            <div class="hero-slide-caption">
              <span class="hero-slide-tag" style="background: rgba(124, 58, 237, 0.9);">✨ 多彩な空間設計 ｜ ロフト付きプライベートルーム</span>
              <p class="hero-slide-heading">木製手すりロフトとアクセントウォール。家族それぞれのこだわりを形にする自由設計</p>
            </div>
          </div>

          <!-- Controls -->
          <button type="button" class="hero-slider-nav-btn prev" id="hero-slider-btn-prev" aria-label="前の写真">‹</button>
          <button type="button" class="hero-slider-nav-btn next" id="hero-slider-btn-next" aria-label="次の写真">›</button>

          <div class="hero-slider-pagination" id="hero-slider-dots-container">
            <button type="button" class="hero-dot-indicator active" data-slide="0" aria-label="写真1"></button>
            <button type="button" class="hero-dot-indicator" data-slide="1" aria-label="写真2"></button>
            <button type="button" class="hero-dot-indicator" data-slide="2" aria-label="写真3"></button>
            <button type="button" class="hero-dot-indicator" data-slide="3" aria-label="写真4"></button>
            <button type="button" class="hero-dot-indicator" data-slide="4" aria-label="写真5"></button>
            <button type="button" class="hero-dot-indicator" data-slide="5" aria-label="写真6"></button>
          </div>
        </div>"""

    # Replace stage block
    stage_regex = re.compile(r'<div class="hero-slider-stage" id="top-hero-slider-stage">.*?</div>\s*</div>', re.DOTALL)
    # Be careful to match properly
    m = re.search(r'<div class="hero-slider-stage" id="top-hero-slider-stage">.*?</div>\s*</div>', html, re.DOTALL)
    if m:
        html = html[:m.start()] + new_slides_html + "\n      </div>" + html[m.end():]
        print("[TOP HTML] Replaced hero slider stage with 6 new photos!")
    else:
        print("[WARN] Slider stage not matched cleanly in section-top.html")

    # Update statement about carpenters
    html = re.sub(
        r'熟練の手刻み大工',
        '手刻みの技量を持つ熟練大工（強靭な金物工法プレカット×ミリ単位の内部造作）',
        html
    )

    with open(top_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("[TOP HTML] Updated section-top.html successfully!")

if __name__ == '__main__':
    update_craftsman_hero()
    update_wagama()
    update_app_js_cases()
    update_craftsmanship_html()
    update_top_slider_html()
    print("[ALL DONE] Master updates applied successfully!")
