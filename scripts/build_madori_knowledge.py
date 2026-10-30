# -*- coding: utf-8 -*-
"""
scripts/build_madori_knowledge.py
設計プロの知見200選（間取り・寸法・動線実務）SSGジェネレーター
- 総合ピラーページ: /knowledge/madori/index.html
- 8大カテゴリ別ページ: /knowledge/madori/{category}.html
- 全200問個別詳細ページ: /knowledge/madori/{id}.html
- 共通ヘッダー・フッター完全統合 & FAQPage構造化データ (SEO/AIO最適化)
"""
import os
import re
import json
import sys

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
SRC_DIR = os.path.join(BASE_DIR, 'src')
MADORI_DIR = os.path.join(PUBLIC_DIR, 'knowledge', 'madori')
os.makedirs(MADORI_DIR, exist_ok=True)

# 8大カテゴリ定義
CATEGORY_MAP = {
    'kitchen': {
        'slug': 'kitchen',
        'title': 'キッチン・パントリー（通路幅・回遊動線）',
        'icon': '🍳',
        'tagline': '対面キッチン通路幅・冷蔵庫手前配置・パントリー回遊・海外食洗機の黄金寸法',
        'description': '埼玉で失敗しないキッチンの黄金寸法知見25選。通路幅950〜1,050mm、冷蔵庫手前配置、ウォークスルーパントリー、ミーレ・ボッシュ食洗機導入の注意点まで実務プロが完全公開。'
    },
    'ldk': {
        'slug': 'ldk',
        'title': 'LDK・小上がり・スタディ（畳数・吹抜設計）',
        'icon': '🛋️',
        'tagline': '小上がり畳25〜30cm・ピットリビング・吹抜け冷暖房・スタディカウンター寸法',
        'description': '家族が自然と集まりくつろげるLDK・小上がり・吹抜けの実務知見25選。畳数バランス、段差有効活用、吹抜けシーリングファン気流設計、スタディコーナーの照明計画を解説。'
    },
    'water': {
        'slug': 'water',
        'title': '水回り・ランドリー（室内干し・洗面分離）',
        'icon': '🧺',
        'tagline': '脱衣室・洗面室セパレート・乾太くん直結・室内干し2〜3帖・朝の身支度渋滞ゼロ動線',
        'description': '毎日の家事時間を劇的に短縮する水回り・ランドリー知見25選。乾太くんとファミリークローゼット直結動線、洗面・脱衣分離のメリット、カビ知らずの室内干し換気設計。'
    },
    'entrance': {
        'slug': 'entrance',
        'title': '玄関・土間SIC（カバードポーチ・引戸動線）',
        'icon': '👞',
        'tagline': '2way家族玄関・シューズインクローク幅・カバードポーチ・引戸有効開口とベビーカー動線',
        'description': '急な来客でも玄関が散らからない土間SIC・2way動線知見25選。ベビーカー・アウトドア用品収納、カバードポーチ雨よけ設計、引き戸の有効寸法を詳しく解説。'
    },
    'storage': {
        'slug': 'storage',
        'title': '収納・WIC（ファミクロ・分散収納計画）',
        'icon': '📦',
        'tagline': '適正収納率12〜15%・ファミクロ1階配置・浅型可動棚・適材適所の分散収納ルール',
        'description': '物が散らからない美しい暮らしを保つ収納・WIC実務知見25選。適正収納率、奥行き浅型可動棚の重要性、1階ファミリークローゼットと玄関・ランドリー連動動線。'
    },
    'equipment': {
        'slug': 'equipment',
        'title': '暖炉・設備・照明（薪ストーブ・間接照明）',
        'icon': '🔥',
        'tagline': '煙突不要バイオエタノール暖炉・薪ストーブ炉台設計・間接照明色温度・スイッチ配線計画',
        'description': '住まいの心地よさと意匠性を格上げする暖炉・設備・照明知見25選。マンション・都市部対応のバイオエタノール暖炉、薪ストーブの床補強、建築化間接照明のプロ手法。'
    },
    'garden': {
        'slug': 'garden',
        'title': '尺庭・デッキ（中庭テラス・日射採光外構）',
        'icon': '🌿',
        'tagline': '90cm隙間で成立する「尺庭」・アウターリビングデッキ・西日遮蔽植栽・プライベート中庭',
        'description': 'わずか幅90cmの隙間を癒やしの借景に変える「尺庭」とアウトドアリビング知見25選。視線を遮るフェンス計画、ウッドデッキの耐久性、夏涼しく冬あたたかいパッシブ外構。'
    },
    'kaso': {
        'slug': 'kaso',
        'title': '家相・風水（鬼門対策・現代科学の間取り）',
        'icon': '⛩️',
        'tagline': '鬼門・裏鬼門の現代科学的解釈・正中線四隅線対策・家族が納得する吉相間取り設計',
        'description': '家相・風水と現代建築学を無理なく融合する知見25選。鬼門（北東）・裏鬼門（南西）の換気・採光リスク対策、現代の快適住宅性能と吉相配置を両立させるプロの解決策。'
    }
}

def load_common_components():
    """共通ヘッダーとフッターを読み込む"""
    header_path = os.path.join(SRC_DIR, 'partials', 'header-nav.html')
    footer_path = os.path.join(SRC_DIR, 'partials', 'footer.html')
    
    header_html = ""
    footer_html = ""
    
    if os.path.exists(header_path):
        with open(header_path, 'r', encoding='utf-8') as f:
            header_html = f.read()
    if os.path.exists(footer_path):
        with open(footer_path, 'r', encoding='utf-8') as f:
            footer_html = f.read()
            
    return header_html, footer_html

def load_madori_knowledge():
    """knowledge_corpus.json から間取り知見200問を取得"""
    corpus_path = os.path.join(BASE_DIR, 'server', 'knowledge_corpus.json')
    if not os.path.exists(corpus_path):
        print(f"[ERR] {corpus_path} not found!")
        return []

    with open(corpus_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 動画ポータルデータの読み込み
    video_map = {}
    video_path = os.path.join(PUBLIC_DIR, 'data', 'knowledge_video_portal_data.json')
    if os.path.exists(video_path):
        try:
            with open(video_path, 'r', encoding='utf-8') as vf:
                vdata = json.load(vf)
                for item in vdata.get('items', []):
                    video_map[item['id']] = item
        except Exception as e:
            print(f"[WARN] Failed to load video portal data: {e}")

    # QA知見データ（画像パス保有）の読み込み
    qa_image_map = {}
    qa_path = os.path.join(PUBLIC_DIR, 'data', 'qa_knowledge_100.json')
    if os.path.exists(qa_path):
        try:
            with open(qa_path, 'r', encoding='utf-8') as qf:
                qdata = json.load(qf)
                for q in qdata.get('questions', []):
                    if q.get('image'):
                        qa_image_map[q['id']] = q['image']
        except Exception as e:
            print(f"[WARN] Failed to load qa_knowledge_100.json: {e}")

    madori_items = []
    for item in data:
        cat = item.get('category')
        if cat in CATEGORY_MAP:
            # 画像データ紐付け
            if item['id'] in qa_image_map:
                item['image'] = qa_image_map[item['id']]
            elif not item.get('image'):
                item['image'] = '/images/knowledge/kitchen_strat_p2.jpg'

            # 動画データ紐付け
            if item['id'] in video_map:
                v_item = video_map[item['id']]
                item['youtubeUrl'] = v_item.get('youtubeUrl', '')
                item['youtubeVideoId'] = v_item.get('youtubeVideoId', '')
                item['veoPromptJa'] = v_item.get('veoPromptJa', '')
            madori_items.append(item)

    return madori_items

def build_all_madori_knowledge():
    """総合ピラー、8大カテゴリ、200問個別ページを一括生成"""
    items = load_madori_knowledge()
    if not items:
        print("[WARN] No madori knowledge items found.")
        return []

    header_html, footer_html = load_common_components()
    generated_urls = []

    # カテゴリごとにグループ化
    items_by_cat = {c: [] for c in CATEGORY_MAP}
    for item in items:
        c = item['category']
        if c in items_by_cat:
            items_by_cat[c].append(item)

    # 1. 個別200問静的ページの生成
    print(f"🏗️ [Madori SSG] 200問個別知見ページの生成を開始します...")
    for item in items:
        url = generate_single_qa_page(item, header_html, footer_html)
        generated_urls.append(url)
    print(f"  ✅ 200問の個別静的SEO/AIOページを生成完了 (/knowledge/madori/*.html)")

    # 2. 8大カテゴリ別ページの生成
    print(f"🏗️ [Madori SSG] 8大カテゴリ別ページの生成を開始します...")
    for cat_slug, cat_info in CATEGORY_MAP.items():
        cat_items = items_by_cat.get(cat_slug, [])
        url = generate_category_page(cat_slug, cat_info, cat_items, header_html, footer_html)
        generated_urls.append(url)
    print(f"  ✅ 8大カテゴリ別ページを生成完了 (/knowledge/madori/{cat_slug}.html)")

    # 3. 総合ピラーハブページの生成
    print(f"🏗️ [Madori SSG] 総合ピラーハブページを生成します...")
    hub_url = generate_hub_page(items_by_cat, header_html, footer_html)
    generated_urls.append(hub_url)
    print(f"  ✅ 総合ピラーハブページを生成完了 (/knowledge/madori/index.html)")

    return generated_urls

def generate_single_qa_page(item, header_html, footer_html):
    """単一Q&Aページの生成"""
    q_id = item['id']
    cat_slug = item['category']
    cat_info = CATEGORY_MAP.get(cat_slug, {})
    cat_name = cat_info.get('title', item.get('categoryName', ''))
    cat_icon = cat_info.get('icon', '📐')
    
    page_url = f"https://t-smile.co.jp/knowledge/madori/{q_id}.html"
    title = f"{item['question']} | 株式会社住ま居る 設計知見200選"
    desc = (item.get('shortAnswer', '') + ' ' + item.get('details', ''))[:130] + '...'
    
    # 構造化データ
    json_ld = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "FAQPage",
                "mainEntity": [{
                    "@type": "Question",
                    "name": item['question'],
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": item.get('shortAnswer', '') + "\n\n" + item.get('details', '')
                    }
                }]
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "ホーム",
                        "item": "https://t-smile.co.jp/"
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "設計プロの知見200選",
                        "item": "https://t-smile.co.jp/knowledge/madori/"
                    },
                    {
                        "@type": "ListItem",
                        "position": 3,
                        "name": cat_name,
                        "item": f"https://t-smile.co.jp/knowledge/madori/{cat_slug}.html"
                    },
                    {
                        "@type": "ListItem",
                        "position": 4,
                        "name": f"Q: {item['question'][:25]}...",
                        "item": page_url
                    }
                ]
            },
            {
                "@type": "HomeAndConstructionBusiness",
                "@id": "https://t-smile.co.jp/#organization",
                "name": "株式会社住ま居る",
                "url": "https://t-smile.co.jp/",
                "logo": "https://t-smile.co.jp/images/hero_kaguya_house.jpg"
            }
        ]
    }

    # YouTube動画がある場合の埋め込み
    video_embed_html = ""
    if item.get('youtubeVideoId'):
        yt_id = item['youtubeVideoId']
        video_embed_html = f"""
        <div style="margin: 2rem 0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
          <div style="position: relative; padding-bottom: 56.25%; height: 0;">
            <iframe src="https://www.youtube.com/embed/{yt_id}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen title="{item['question']}"></iframe>
          </div>
        </div>
        """

    html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content="{desc}" />
  <link rel="canonical" href="{page_url}" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{desc}" />
  <meta property="og:image" content="https://t-smile.co.jp/images/hero_kaguya_house.jpg" />
  <meta property="og:url" content="{page_url}" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  
  <script type="application/ld+json">
  {json.dumps(json_ld, ensure_ascii=False, indent=2)}
  </script>
  
  <link rel="stylesheet" href="/css/style.css" />
  <style>
    body {{ background: #f8fafc; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans JP", sans-serif; line-height: 1.8; margin: 0; padding: 0; }}
    .qa-container {{ max-width: 1360px; margin: 2rem auto; padding: 0 1.5rem; }}
    .qa-card {{ background: #ffffff; border-radius: 16px; padding: 2.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }}
    .qa-crumb {{ font-size: 0.85rem; color: #64748b; margin-bottom: 1.5rem; }}
    .qa-crumb a {{ color: #7c3aed; text-decoration: none; font-weight: 700; }}
    .qa-cat-badge {{ display: inline-flex; align-items: center; gap: 6px; background: rgba(124, 58, 237, 0.1); color: #7c3aed; font-weight: 800; font-size: 0.85rem; padding: 5px 14px; border-radius: 20px; margin-bottom: 1rem; text-decoration: none; border: 1px solid rgba(124, 58, 237, 0.2); }}
    .qa-cat-badge:hover {{ background: #7c3aed; color: #fff; }}
    .qa-h1 {{ font-size: 1.65rem; font-weight: 900; line-height: 1.45; color: #0f172a; margin-bottom: 1.5rem; border-bottom: 2px solid #7c3aed; padding-bottom: 0.8rem; }}
    .qa-box-answer {{ background: #f5f3ff; border-left: 4px solid #7c3aed; padding: 1.2rem 1.5rem; border-radius: 8px; margin-bottom: 1.8rem; }}
    .qa-box-title {{ font-weight: 800; color: #6d28d9; margin-bottom: 0.5rem; font-size: 1.05rem; display: flex; align-items: center; gap: 6px; }}
    .qa-image-hero {{ margin: 1.5rem 0 2rem; border-radius: 12px; overflow: hidden; background: #f8fafc; border: 1px solid #e2e8f0; text-align: center; max-height: 480px; }}
    .qa-image-hero img {{ max-width: 100%; max-height: 480px; object-fit: contain; }}
    .qa-section-h2 {{ font-size: 1.22rem; font-weight: 800; color: #0f172a; margin-top: 2rem; margin-bottom: 0.8rem; display: flex; align-items: center; gap: 6px; }}
    .qa-dimension-box {{ background: #f1f5f9; padding: 1rem 1.4rem; border-radius: 8px; font-weight: 800; color: #1e293b; font-size: 1.02rem; margin-bottom: 1.8rem; border: 1px solid #cbd5e1; }}
    .qa-principle-box {{ background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 12px; padding: 1.2rem 1.5rem; margin-top: 1.8rem; }}
    .qa-actions {{ display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px dashed #cbd5e1; }}
    .qa-btn-back {{ display: inline-flex; align-items: center; gap: 6px; background: #f8fafc; color: #334155; font-weight: 800; font-size: 0.9rem; padding: 10px 18px; border-radius: 10px; border: 1.5px solid #cbd5e1; text-decoration: none; transition: all 0.2s; }}
    .qa-btn-back:hover {{ background: #7c3aed; color: #fff; border-color: #7c3aed; transform: translateX(-3px); }}
    .qa-cta-box {{ margin-top: 3rem; text-align: center; padding: 2.2rem; background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); border-radius: 16px; border: 2px solid #ddd6fe; }}
    .qa-cta-btn {{ display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff; font-weight: 800; padding: 0.9rem 2.2rem; border-radius: 12px; text-decoration: none; font-size: 1.02rem; margin-top: 1.2rem; box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3); }}
    .qa-cta-btn:hover {{ transform: translateY(-2px); box-shadow: 0 6px 20px rgba(124, 58, 237, 0.45); }}
  </style>
</head>
<body>
  {header_html}

  <main class="qa-container">
    <div class="qa-card">
      <nav class="qa-crumb" aria-label="パンくずリスト">
        <a href="/">🏠 ホーム</a> &gt; <a href="/knowledge/madori/">設計プロの知見200選</a> &gt; <a href="/knowledge/madori/{cat_slug}.html">{cat_icon} {cat_name}</a> &gt; <span>Q{item.get('questionNumber', '')}</span>
      </nav>

      <a href="/knowledge/madori/{cat_slug}.html" class="qa-cat-badge">
        <span>{cat_icon}</span> {cat_name}（Q{item.get('questionNumber', '')}）
      </a>
      
      <h1 class="qa-h1">{item['question']}</h1>

      <div class="qa-box-answer">
        <div class="qa-box-title">💡 結論・黄金比ポイント</div>
        <p style="margin: 0; font-size: 1.08rem; font-weight: 700; color: #1e293b;">{item.get('shortAnswer', '')}</p>
      </div>

      <div class="qa-image-hero">
        <img src="{item.get('image', '/images/knowledge/kitchen_strat_p2.jpg')}" alt="{item['question']}" onerror="this.src='/images/knowledge/kitchen_strat_p2.jpg'" />
      </div>

      {video_embed_html}

      <h2 class="qa-section-h2">📐 標準基準・黄金寸法指標</h2>
      <div class="qa-dimension-box">
        {item.get('dimension', '標準寸法: 各間取り・生活スタイルに応じた最適解')}
      </div>

      <h2 class="qa-section-h2">🔍 現場実務の技術根拠（プロの判断基準・動線検証）</h2>
      <p style="font-size: 1rem; line-height: 1.95; color: #334155; margin-bottom: 1.5rem; white-space: pre-line;">
        {item.get('details', '')}
      </p>

      {f'''
      <div class="qa-principle-box">
        <div style="font-weight: 800; color: #92400e; font-size: 0.95rem; margin-bottom: 0.4rem;">★ 住ま居るの設計原則</div>
        <p style="margin: 0; font-weight: 700; color: #78350f;">{item.get('principle', '')}</p>
      </div>
      ''' if item.get('principle') else ''}

      <div style="margin-top: 2rem; font-size: 0.82rem; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 1rem;">
        ※本知見は、株式会社住ま居るが創業30年・累計800棟の現場実務の中で、お施主様の実際の暮らしぶりや試行錯誤（成功と反省の実体験）を通して現在たどり着いた設計手法です。画一的な正解を押し付けるのではなく、ご家族ごとの暮らしやすさを最優先に検証いたします。
      </div>

      <div class="qa-actions">
        <a href="/knowledge/madori/{cat_slug}.html" class="qa-btn-back">
          <span>←</span> {cat_name}（25選）一覧へ戻る
        </a>
        <a href="/knowledge/madori/" class="qa-btn-back" style="background: #0f172a; color: #fff; border-color: #0f172a;">
          <span>📖</span> 設計知見200選 総合トップへ
        </a>
      </div>

      <div class="qa-cta-box">
        <h3 style="margin: 0 0 0.5rem 0; font-size: 1.3rem; font-weight: 900; color: #0f172a;">この知見を元に、理想の間取り相談をしてみませんか？</h3>
        <p style="margin: 0; font-size: 0.92rem; color: #475569;">夫婦のスマホで意見をまとめられる無料AI家づくりカルテや、323プランの自由設計シミュレーションを公開中。</p>
        <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin-top: 1.2rem;">
          <a href="/madori-consultation/" class="qa-cta-btn" style="margin-top: 0;">💬 夫婦のAI間取り相談カルテを開く ➜</a>
          <a href="/plans/index.html" class="qa-cta-btn" style="background: linear-gradient(135deg, #0284c7, #38bdf8); margin-top: 0;">📐 323プラン集から選ぶ ➜</a>
        </div>
      </div>
    </div>
  </main>

  {footer_html}
  <script src="/js/app.js"></script>
</body>
</html>"""

    file_path = os.path.join(MADORI_DIR, f"{q_id}.html")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(html)
        
    return page_url

def generate_category_page(cat_slug, cat_info, cat_items, header_html, footer_html):
    """8大カテゴリ別ページの生成"""
    title = f"{cat_info['title']}知見25選｜株式会社住ま居る 設計知見200選"
    desc = cat_info['description']
    page_url = f"https://t-smile.co.jp/knowledge/madori/{cat_slug}.html"
    cat_icon = cat_info['icon']

    # 25問すべてのFAQPage構造化データ
    faq_entities = []
    for it in cat_items:
        faq_entities.append({
            "@type": "Question",
            "name": it['question'],
            "acceptedAnswer": {
                "@type": "Answer",
                "text": it.get('shortAnswer', '') + "\n\n" + it.get('details', '')
            }
        })

    json_ld = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "FAQPage",
                "mainEntity": faq_entities
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "ホーム",
                        "item": "https://t-smile.co.jp/"
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "設計プロの知見200選",
                        "item": "https://t-smile.co.jp/knowledge/madori/"
                    },
                    {
                        "@type": "ListItem",
                        "position": 3,
                        "name": cat_info['title'],
                        "item": page_url
                    }
                ]
            },
            {
                "@type": "HomeAndConstructionBusiness",
                "@id": "https://t-smile.co.jp/#organization",
                "name": "株式会社住ま居る",
                "url": "https://t-smile.co.jp/",
                "logo": "https://t-smile.co.jp/images/hero_kaguya_house.jpg"
            }
        ]
    }

    # 25問カード一覧HTML
    cards_html = ""
    for idx, it in enumerate(cat_items, 1):
        q_id = it['id']
        short_ans = it.get('shortAnswer', '')
        dim = it.get('dimension', '')
        img_src = it.get('image') or '/images/knowledge/kitchen_strat_p2.jpg'
        cards_html += f"""
        <article class="cat-qa-card" id="{q_id}">
          <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: flex-start;">
            <div style="width: 220px; min-width: 180px; height: 150px; border-radius: 10px; overflow: hidden; flex-shrink: 0; background: #f8fafc; border: 1.5px solid #e2e8f0;">
              <img src="{img_src}" alt="{it['question']}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/images/knowledge/kitchen_strat_p2.jpg'" loading="lazy" />
            </div>
            <div style="flex: 1; min-width: 280px;">
              <div class="cat-qa-header">
                <span class="cat-qa-num">Q{it.get('questionNumber', idx)}</span>
                <h3 class="cat-qa-title">
                  <a href="/knowledge/madori/{q_id}.html" style="color: inherit; text-decoration: none;">{it['question']}</a>
                </h3>
              </div>
              <div class="cat-qa-conclusion">
                <strong>💡 結論:</strong> {short_ans}
              </div>
              {f'<div class="cat-qa-dim"><strong>📐 黄金寸法:</strong> {dim}</div>' if dim else ''}
              <p class="cat-qa-desc">{it.get('details', '')[:160]}...</p>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                <span style="font-size: 0.8rem; color: #64748b; font-weight: 700;">★ 埼玉実務800棟の現場知見</span>
                <a href="/knowledge/madori/{q_id}.html" class="cat-qa-detail-link">詳細解説・図解を読む ➜</a>
              </div>
            </div>
          </div>
        </article>
        """

    html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content="{desc}" />
  <link rel="canonical" href="{page_url}" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{desc}" />
  <meta property="og:image" content="https://t-smile.co.jp/images/hero_kaguya_house.jpg" />
  <meta property="og:url" content="{page_url}" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  
  <script type="application/ld+json">
  {json.dumps(json_ld, ensure_ascii=False, indent=2)}
  </script>
  
  <link rel="stylesheet" href="/css/style.css" />
  <style>
    body {{ background: #f8fafc; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans JP", sans-serif; line-height: 1.8; margin: 0; padding: 0; }}
    .cat-container {{ max-width: 1360px; margin: 2rem auto; padding: 0 1.5rem; }}
    .cat-crumb {{ font-size: 0.85rem; color: #64748b; margin-bottom: 1.5rem; }}
    .cat-crumb a {{ color: #7c3aed; text-decoration: none; font-weight: 700; }}
    .cat-hero {{ background: linear-gradient(135deg, #2e1065 0%, #4c1d95 100%); color: #ffffff; border-radius: 20px; padding: 2.5rem 2rem; margin-bottom: 2.5rem; box-shadow: 0 10px 30px rgba(76, 29, 149, 0.25); }}
    .cat-hero-badge {{ display: inline-flex; align-items: center; gap: 6px; background: rgba(255, 255, 255, 0.15); color: #e9d5ff; font-weight: 800; font-size: 0.85rem; padding: 4px 12px; border-radius: 20px; margin-bottom: 1rem; }}
    .cat-hero-h1 {{ font-size: 1.85rem; font-weight: 900; margin: 0 0 0.8rem 0; line-height: 1.35; }}
    .cat-hero-p {{ color: #ddd6fe; font-size: 1rem; margin: 0; line-height: 1.7; }}
    .cat-qa-card {{ background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 1.8rem; margin-bottom: 1.5rem; box-shadow: 0 4px 12px rgba(0,0,0,0.03); transition: transform 0.2s, box-shadow 0.2s; }}
    .cat-qa-card:hover {{ transform: translateY(-3px); box-shadow: 0 8px 24px rgba(124, 58, 237, 0.1); border-color: #c4b5fd; }}
    .cat-qa-header {{ display: flex; align-items: flex-start; gap: 12px; margin-bottom: 1rem; }}
    .cat-qa-num {{ background: #7c3aed; color: #fff; font-weight: 900; font-size: 0.85rem; padding: 4px 10px; border-radius: 8px; shrink: 0; }}
    .cat-qa-title {{ margin: 0; font-size: 1.2rem; font-weight: 800; color: #0f172a; line-height: 1.5; }}
    .cat-qa-title a:hover {{ color: #7c3aed; text-decoration: underline; }}
    .cat-qa-conclusion {{ background: #f5f3ff; border-left: 3.5px solid #7c3aed; padding: 0.8rem 1.2rem; border-radius: 6px; font-weight: 700; color: #1e293b; margin-bottom: 0.8rem; font-size: 0.98rem; }}
    .cat-qa-dim {{ background: #f1f5f9; padding: 0.6rem 1rem; border-radius: 6px; font-weight: 800; color: #334155; font-size: 0.92rem; margin-bottom: 0.8rem; }}
    .cat-qa-desc {{ color: #475569; font-size: 0.95rem; margin: 0; line-height: 1.8; }}
    .cat-qa-detail-link {{ display: inline-flex; align-items: center; gap: 4px; color: #7c3aed; font-weight: 800; font-size: 0.92rem; text-decoration: none; }}
    .cat-qa-detail-link:hover {{ text-decoration: underline; }}
    .cat-nav-pills {{ display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 2rem; }}
    .cat-nav-pill {{ background: #ffffff; border: 1.5px solid #cbd5e1; color: #475569; font-weight: 700; font-size: 0.85rem; padding: 6px 14px; border-radius: 20px; text-decoration: none; transition: all 0.2s; }}
    .cat-nav-pill:hover {{ background: #7c3aed; color: #fff; border-color: #7c3aed; }}
    .cat-nav-pill.active {{ background: #7c3aed; color: #fff; border-color: #7c3aed; font-weight: 800; }}
  </style>
</head>
<body>
  {header_html}

  <main class="cat-container">
    <nav class="cat-crumb" aria-label="パンくずリスト">
      <a href="/">🏠 ホーム</a> &gt; <a href="/knowledge/madori/">設計プロの知見200選</a> &gt; <span>{cat_icon} {cat_info['title']}</span>
    </nav>

    <div class="cat-hero">
      <div class="cat-hero-badge">{cat_icon} 住ま居る 実務知見データベース（全25問）</div>
      <h1 class="cat-hero-h1">{cat_info['title']}</h1>
      <p class="cat-hero-p">{cat_info['description']}</p>
    </div>

    <!-- 他カテゴリへのクイックナビ -->
    <div class="cat-nav-pills">
      <span style="font-weight: 800; font-size: 0.85rem; color: #64748b; display: flex; align-items: center; margin-right: 4px;">ジャンル切替:</span>
      {' '.join([f'<a href="/knowledge/madori/{s}.html" class="cat-nav-pill {"active" if s == cat_slug else ""}">{c["icon"]} {c["title"].split("（")[0]}</a>' for s, c in CATEGORY_MAP.items()])}
    </div>

    <!-- 25問カードリスト -->
    <section>
      {cards_html}
    </section>

    <!-- 下部総合ピラーへ戻る -->
    <div style="text-align: center; margin: 3rem 0;">
      <a href="/knowledge/madori/" style="display: inline-flex; align-items: center; gap: 8px; background: #0f172a; color: #fff; font-weight: 800; font-size: 1rem; padding: 12px 28px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 14px rgba(15,23,42,0.25);">
        <span>←</span> 設計プロの知見200選（全8ジャンル一覧）へ戻る
      </a>
    </div>
  </main>

  {footer_html}
  <script src="/js/app.js"></script>
</body>
</html>"""

    file_path = os.path.join(MADORI_DIR, f"{cat_slug}.html")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(html)
        
    return page_url

def generate_hub_page(items_by_cat, header_html, footer_html):
    """総合ピラーハブページ（/knowledge/madori/index.html）の生成"""
    title = "設計プロの知見200選（間取り・寸法・動線実務Q&A）｜株式会社住ま居る【埼玉】"
    desc = "埼玉で創業30年・累計800棟。失敗しない間取り、通路幅、家事動線、尺庭、家相・風水まで、住ま居るAI建築士が現場実務の黄金寸法・知見200選を完全公開。"
    page_url = "https://t-smile.co.jp/knowledge/madori/"

    # 代表的な質問でFAQPage構造化データを作成
    hub_faqs = []
    for cat_slug, cat_info in CATEGORY_MAP.items():
        items = items_by_cat.get(cat_slug, [])
        if items:
            it = items[0]
            hub_faqs.append({
                "@type": "Question",
                "name": it['question'],
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": it.get('shortAnswer', '') + "\n\n" + it.get('details', '')
                }
            })

    json_ld = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "FAQPage",
                "mainEntity": hub_faqs
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "ホーム",
                        "item": "https://t-smile.co.jp/"
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "設計プロの知見200選",
                        "item": page_url
                    }
                ]
            },
            {
                "@type": "HomeAndConstructionBusiness",
                "@id": "https://t-smile.co.jp/#organization",
                "name": "株式会社住ま居る",
                "url": "https://t-smile.co.jp/",
                "logo": "https://t-smile.co.jp/images/hero_kaguya_house.jpg"
            }
        ]
    }

    # 全200問の画像付きカード一覧HTMLを生成
    all_cards_html = ""
    for cat_slug, cat_info in CATEGORY_MAP.items():
        cat_items = items_by_cat.get(cat_slug, [])
        for idx, it in enumerate(cat_items, 1):
            q_id = it['id']
            short_ans = it.get('shortAnswer', '')
            dim = it.get('dimension', '')
            img_src = it.get('image') or '/images/knowledge/kitchen_strat_p2.jpg'
            cat_name = cat_info['title'].split('（')[0]
            
            all_cards_html += f"""
      <article class="madori-qa-card" data-cat="{cat_slug}" data-id="{q_id}" data-keywords="{it.get('question', '')} {short_ans} {dim} {it.get('details', '')[:100]}">
        <a href="/knowledge/madori/{q_id}.html" class="madori-card-thumb-wrap" style="text-decoration: none; display: block;">
          <img src="{img_src}" alt="{it['question']}" class="madori-card-thumb" onerror="this.src='/images/knowledge/kitchen_strat_p2.jpg'" loading="lazy" />
          <span class="madori-category-badge">{cat_info['icon']} {cat_name}</span>
          {f'<span class="madori-dim-badge">📐 {dim}</span>' if dim else ''}
        </a>
        <div class="madori-card-body">
          <h3 class="madori-card-q">
            <a href="/knowledge/madori/{q_id}.html" style="color: inherit; text-decoration: none;">{it['question']}</a>
          </h3>
          <p class="madori-card-a">💡 <strong>設計プロAIの即答:</strong> {short_ans}</p>
          <div class="madori-card-actions">
            <a href="/knowledge/madori/{q_id}.html" class="btn-ask-ai" style="text-decoration: none;">
              <span>📖</span> 詳細解説・図解を読む
            </a>
            <a href="/knowledge/madori/{cat_slug}.html" class="btn-view-detail" style="text-decoration: none; text-align: center;">
              同ジャンル25選
            </a>
          </div>
        </div>
      </article>
      """

    html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content="{desc}" />
  <link rel="canonical" href="{page_url}" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{desc}" />
  <meta property="og:image" content="https://t-smile.co.jp/images/hero_kaguya_house.jpg" />
  <meta property="og:url" content="{page_url}" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  
  <script type="application/ld+json">
  {json.dumps(json_ld, ensure_ascii=False, indent=2)}
  </script>
  
  <link rel="stylesheet" href="/css/style.css" />
  <link rel="stylesheet" href="/css/madori-bot.css" />
  <style>
    body {{ background: #f8fafc; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans JP", sans-serif; line-height: 1.8; margin: 0; padding: 0; }}
    .hub-container {{ max-width: 1360px; margin: 2rem auto; padding: 0 1.5rem; }}
    .hub-crumb {{ font-size: 0.85rem; color: #64748b; margin-bottom: 1.5rem; }}
    .hub-crumb a {{ color: #7c3aed; text-decoration: none; font-weight: 700; }}
    .hub-hero {{ background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%); color: #ffffff; border-radius: 24px; padding: 3rem 2.5rem; margin-bottom: 2rem; box-shadow: 0 15px 35px rgba(49, 46, 129, 0.3); text-align: center; }}
    .hub-hero-badge {{ display: inline-flex; align-items: center; gap: 6px; background: rgba(255, 255, 255, 0.15); color: #e9d5ff; font-weight: 800; font-size: 0.9rem; padding: 5px 16px; border-radius: 20px; margin-bottom: 1.2rem; border: 1px solid rgba(255, 255, 255, 0.25); }}
    .hub-hero-h1 {{ font-size: 2.2rem; font-weight: 900; margin: 0 0 1rem 0; line-height: 1.35; }}
    .hub-hero-p {{ color: #e0e7ff; font-size: 1.05rem; max-width: 860px; margin: 0 auto; line-height: 1.8; }}
    .hub-thermal-link-banner {{ background: linear-gradient(135deg, #064e3b 0%, #065f46 100%); color: #ffffff; border-radius: 16px; padding: 1.8rem 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 2.5rem; box-shadow: 0 8px 24px rgba(6, 78, 59, 0.18); }}
    
    /* カードの微調整 */
    .madori-qa-card {{
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
      box-shadow: 0 4px 14px rgba(0,0,0,0.03);
    }}
    .madori-qa-card:hover {{
      transform: translateY(-5px);
      box-shadow: 0 12px 28px rgba(124, 58, 237, 0.12);
      border-color: #a78bfa;
    }}
    .madori-card-thumb-wrap {{
      width: 100%;
      height: 180px;
      background: #0f172a;
      position: relative;
      overflow: hidden;
      cursor: pointer;
    }}
    .madori-card-thumb {{
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }}
    .madori-qa-card:hover .madori-card-thumb {{
      transform: scale(1.05);
    }}
    .madori-card-q {{
      font-size: 1.05rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.5;
      margin: 0 0 0.6rem 0;
    }}
    .madori-card-q a:hover {{
      color: #7c3aed;
      text-decoration: underline;
    }}
    .madori-card-a {{
      font-size: 0.88rem;
      color: #475569;
      line-height: 1.6;
      margin: 0 0 1rem 0;
      flex: 1;
    }}
    .madori-card-actions {{
      display: flex;
      gap: 8px;
      border-top: 1px dashed #e2e8f0;
      padding-top: 10px;
    }}
    .btn-ask-ai {{
      flex: 2;
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 0.85rem;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: opacity 0.2s;
    }}
    .btn-ask-ai:hover {{ opacity: 0.92; }}
    .btn-view-detail {{
      flex: 1;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #334155;
      border-radius: 8px;
      padding: 9px 8px;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }}
    .btn-view-detail:hover {{
      background: #e2e8f0;
      color: #0f172a;
    }}
  </style>
</head>
<body>
  {header_html}

  <main class="hub-container">
    <nav class="hub-crumb" aria-label="パンくずリスト">
      <a href="/">🏠 ホーム</a> &gt; <span>設計プロの知見200選</span>
    </nav>

    <div class="hub-hero">
      <div class="hub-hero-badge">🏛️ 埼玉創業30年・累計800棟｜住ま居る 建築実務知見</div>
      <h1 class="hub-hero-h1">設計プロの知見200選</h1>
      <p class="hub-hero-p">
        「キッチンの通路幅は何ミリ？」「冷蔵庫は手前か奥か？」「乾太くんからファミクロ直結の最適寸法は？」<br>
        埼玉の地域工務店として800棟の現場でお施主様と向き合ってきた専任設計チームが、失敗しない間取り・動線・黄金寸法を完全公開しています。
      </p>
    </div>

    <!-- 温熱200選との相互バナー -->
    <div class="hub-thermal-link-banner">
      <div>
        <div style="font-size: 0.85rem; font-weight: 800; color: #6ee7b7; margin-bottom: 4px;">🌡️ 姉妹ピラーページ</div>
        <div style="font-size: 1.25rem; font-weight: 900; color: #ffffff;">温熱設計・気密・換気 実務知見200選（UA値・C値・エアコン設計）</div>
        <div style="font-size: 0.9rem; color: #d1fae5; margin-top: 4px;">断熱等級6〜7、HEAT20 G2/G3、第1種換気と基礎断熱の技術根拠はこちら</div>
      </div>
      <a href="/knowledge/thermal/" style="display: inline-flex; align-items: center; gap: 6px; background: #10b981; color: #ffffff; font-weight: 800; padding: 10px 22px; border-radius: 10px; text-decoration: none; white-space: nowrap; box-shadow: 0 4px 12px rgba(16,185,129,0.3);">
        温熱知見200選を見る ➜
      </a>
    </div>

    <!-- カテゴリフィルター ＆ 検索バー -->
    <div class="madori-filter-bar" style="margin-bottom: 2.5rem;">
      <div class="madori-tabs-scroll" id="hub-category-tabs">
        <button type="button" class="madori-tab-pill active" data-cat="all">🌟 すべて (200問)</button>
        <button type="button" class="madori-tab-pill" data-cat="kitchen">🍳 キッチン・パントリー (25)</button>
        <button type="button" class="madori-tab-pill" data-cat="ldk">🛋️ LDK・小上がり・スタディ (25)</button>
        <button type="button" class="madori-tab-pill" data-cat="water">🧺 水回り・ランドリー・脱衣 (25)</button>
        <button type="button" class="madori-tab-pill" data-cat="entrance">👞 玄関・土間SIC・動線 (25)</button>
        <button type="button" class="madori-tab-pill" data-cat="storage">📦 収納・WIC・分散配置 (25)</button>
        <button type="button" class="madori-tab-pill" data-cat="equipment">🔥 暖炉・設備・照明・色彩 (25)</button>
        <button type="button" class="madori-tab-pill" data-cat="garden">🌿 尺庭・デッキ・外構・敷地 (25)</button>
        <button type="button" class="madori-tab-pill" data-cat="kaso">⛩️ 家相・風水・現代間取り (25)</button>
      </div>

      <div class="madori-search-box">
        <input type="text" id="hub-search-input" class="madori-search-input" placeholder="🔍 気になるキーワードで知見を検索 (例: 乾太くん, 通路幅, 冷蔵庫, 小上がり, 尺庭, バイオ暖炉, 吹き抜け, ミーレ, 鬼門, 家相...)" />
        <span id="hub-results-count" style="display: flex; align-items: center; white-space: nowrap; font-size: 0.85rem; font-weight: 800; color: #7c3aed; padding: 0 10px;">
          200問の設計知見を表示中
        </span>
      </div>
    </div>

    <!-- 全200問 画像付きカードグリッド -->
    <section class="madori-qa-grid" id="hub-qa-grid">
      {all_cards_html}
    </section>

    <!-- 該当なし案内 -->
    <div id="hub-qa-empty" style="display: none; text-align: center; padding: 4rem 1rem; background: #ffffff; border-radius: 16px; border: 1.5px dashed #cbd5e1; margin-bottom: 3rem;">
      <div style="font-size: 2.5rem; margin-bottom: 8px;">🔍</div>
      <h3 style="color: #475569; font-size: 1.15rem; font-weight: 800; margin-bottom: 6px;">該当する知見が見つかりませんでした</h3>
      <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 1.2rem;">別のキーワードで検索するか、すべてのカテゴリを表示してください。</p>
      <button type="button" class="btn btn-primary" style="background: #7c3aed; color: #fff; border-radius: 8px; padding: 8px 20px; font-weight: 800; border: none; cursor: pointer;" onclick="window.hubFilterCategory('all')">
        🌟 すべての知見（200問）を表示する
      </button>
    </div>

    <!-- 相談CTA -->
    <div style="background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); border: 2px solid #ddd6fe; border-radius: 20px; padding: 2.5rem; text-align: center; margin-bottom: 3rem;">
      <h3 style="margin: 0 0 0.6rem 0; font-size: 1.5rem; font-weight: 900; color: #0f172a;">ご夫婦で本音を整理できる「AI間取り相談カルテ」も無料公開中</h3>
      <p style="color: #475569; font-size: 0.98rem; max-width: 720px; margin: 0 auto 1.5rem;">夫と妻それぞれのスマホで回答し、LINEで合体。意見のすれ違いをプロ視点で融合したカルテを即時出力します。</p>
      <a href="/madori-consultation/" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff; font-weight: 800; padding: 1rem 2.4rem; border-radius: 12px; text-decoration: none; font-size: 1.05rem; box-shadow: 0 4px 15px rgba(124,58,237,0.35);">
        🌿 夫婦のAI間取り相談カルテを開く ➜
      </a>
    </div>
  </main>

  {footer_html}
  <script src="/js/app.js"></script>
  <script>
    // ハブページ専用の軽量インタラクティブ・フィルタリングスクリプト
    (function() {{
      const pills = document.querySelectorAll('#hub-category-tabs .madori-tab-pill');
      const searchInput = document.getElementById('hub-search-input');
      const countEl = document.getElementById('hub-results-count');
      const emptyEl = document.getElementById('hub-qa-empty');
      const cards = document.querySelectorAll('#hub-qa-grid .madori-qa-card');

      let currentCat = 'all';
      let currentQuery = '';

      function filterCards() {{
        let visibleCount = 0;
        const q = currentQuery.toLowerCase().trim();

        cards.forEach(card => {{
          const cat = card.getAttribute('data-cat');
          const keywords = (card.getAttribute('data-keywords') || '').toLowerCase();

          const catMatch = (currentCat === 'all' || cat === currentCat);
          const queryMatch = (!q || keywords.includes(q));

          if (catMatch && queryMatch) {{
            card.style.display = 'flex';
            visibleCount++;
          }} else {{
            card.style.display = 'none';
          }}
        }});

        if (countEl) {{
          countEl.textContent = `${{visibleCount}}問の設計知見を表示中`;
        }}
        if (emptyEl) {{
          emptyEl.style.display = visibleCount === 0 ? 'block' : 'none';
        }}
      }}

      window.hubFilterCategory = function(cat) {{
        currentCat = cat || 'all';
        pills.forEach(p => {{
          if (p.getAttribute('data-cat') === currentCat) p.classList.add('active');
          else p.classList.remove('active');
        }});
        filterCards();
      }};

      pills.forEach(pill => {{
        pill.addEventListener('click', () => {{
          const cat = pill.getAttribute('data-cat');
          window.hubFilterCategory(cat);
          // URLのクエリパラメータを更新（履歴 pushState）
          const url = new URL(window.location.href);
          if (cat === 'all') url.searchParams.delete('cat');
          else url.searchParams.set('cat', cat);
          window.history.replaceState({{}}, '', url);
        }});
      }});

      if (searchInput) {{
        searchInput.addEventListener('input', (e) => {{
          currentQuery = e.target.value;
          if (currentQuery.trim() && currentCat !== 'all') {{
            // 検索文字があるときは「すべて」で横断検索
            window.hubFilterCategory('all');
          }} else {{
            filterCards();
          }}
        }});
      }}

      // 初期ロード時のURLクエリパラメータ判定（?cat=kitchen 等）
      const urlParams = new URLSearchParams(window.location.search);
      const initialCat = urlParams.get('cat');
      if (initialCat) {{
        window.hubFilterCategory(initialCat);
      }}
    }})();
  </script>
</body>
</html>"""

    file_path = os.path.join(MADORI_DIR, "index.html")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(html)
        
    return page_url

if __name__ == '__main__':
    urls = build_all_madori_knowledge()
    print(f"🎉 [Madori SSG] Successfully generated {len(urls)} total URLs for Madori Knowledge 200!")
