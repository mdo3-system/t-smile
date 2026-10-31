# -*- coding: utf-8 -*-
"""
scripts/build_wagama_page.py
「私のわがまま・俺のわがまま かなう家」全66事例の完全独立静的ページ（https://t-smile.co.jp/wagama/）を自動生成するスクリプト
"""

import os
import sys
import json
import html

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
SRC_DIR = os.path.join(BASE_DIR, "src")
OUTPUT_DIR = os.path.join(PUBLIC_DIR, "wagama")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "index.html")
DATA_FILE = os.path.join(PUBLIC_DIR, "data", "wagama_testimonials.json")

def load_partials():
    header_path = os.path.join(SRC_DIR, "partials", "header-nav.html")
    footer_path = os.path.join(SRC_DIR, "partials", "footer.html")
    header_html = ""
    footer_html = ""
    if os.path.exists(header_path):
        with open(header_path, "r", encoding="utf-8") as f:
            header_html = f.read()
    if os.path.exists(footer_path):
        with open(footer_path, "r", encoding="utf-8") as f:
            footer_html = f.read()
    return header_html, footer_html

def generate_wagama_page():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    header_html, footer_html = load_partials()

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        wagama_data = json.load(f)

    # カードHTMLの生成
    cards_html = []
    item_list_elements = []

    for idx, item in enumerate(wagama_data):
        item_id = item.get("id", idx + 1)
        badge = item.get("badge", "わがまま")
        title = item.get("title", "")
        category = item.get("category", "all")
        image = item.get("image", "")
        story = item.get("oral_story", "")
        orig_text = item.get("original_text", "")

        # バッジ色分け
        if category == "ore_wagama":
            badge_bg = "#0284c7"
            badge_border = "#38bdf8"
            cat_name = "俺のわがまま"
        elif category == "watashi_wagama":
            badge_bg = "#d97706"
            badge_border = "#f59e0b"
            cat_name = "私のわがまま"
        else:
            badge_bg = "#059669"
            badge_border = "#10b981"
            cat_name = "施主様の生の声"

        card = f'''
        <div class="wg-card" data-category="{category}">
          <div class="wg-img-wrap">
            <span class="wg-badge" style="background: {badge_bg}; border: 1px solid {badge_border};">
              {html.escape(badge)}
            </span>
            <img src="{image}" alt="{html.escape(title)}" loading="lazy" width="400" height="300" />
          </div>
          <div class="wg-body">
            <h3 class="wg-title">{html.escape(title)}</h3>
            <p class="wg-story">{html.escape(story)}</p>
            {f'<div class="wg-tags"><span class="wg-tag">🏷️ {html.escape(orig_text)}</span></div>' if orig_text else ''}
          </div>
        </div>
        '''
        cards_html.append(card)

        # 構造化データ
        item_list_elements.append({
            "@type": "ListItem",
            "position": idx + 1,
            "name": f"{badge}: {title}",
            "description": story[:150]
        })

    cards_joined = "\n".join(cards_html)

    # カウント集計
    count_all = len(wagama_data)
    count_ore = sum(1 for d in wagama_data if d.get("category") == "ore_wagama")
    count_watashi = sum(1 for d in wagama_data if d.get("category") == "watashi_wagama")
    count_voice = sum(1 for d in wagama_data if d.get("category") == "client_voice")

    page_html = f'''<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>「私のわがまま・俺のわがまま かなう家」全66事例｜完全自由設計と手仕事の証｜株式会社住ま居る</title>
  <meta name="description" content="「他社で無理と断られた」「カタログにはない自分たちの夢」。施主様一人ひとりの自由なわがままを、耐震最高等級3・HEAT20 G2/G3超高断熱と熟練大工の手仕事でミリ単位で形にした全66事例を完全公開。薪ストーブ、ガレージ、ロフト、大空間LDK等。" />
  <link rel="canonical" href="https://t-smile.co.jp/wagama/" />

  <!-- OGP -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="「私のわがまま・俺のわがまま かなう家」全66事例｜株式会社住ま居る" />
  <meta property="og:description" content="他社で断られた要望や施主様の自由なわがままを、耐震最高等級3と熟練大工の手仕事で叶えた全66の実邸エピソードと写真解説を完全公開。" />
  <meta property="og:image" content="https://t-smile.co.jp/images/wagama/interior_l_5.webp" />
  <meta property="og:url" content="https://t-smile.co.jp/wagama/" />
  <meta property="og:site_name" content="株式会社住ま居る 家づくりAIラボ" />
  <meta property="og:locale" content="ja_JP" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="「私のわがまま・俺のわがまま かなう家」全66事例｜株式会社住ま居る" />
  <meta name="twitter:description" content="他社で断られた要望や施主様の自由なわがままを、耐震最高等級3と熟練大工の手仕事で叶えた全66の実邸エピソードと写真解説を完全公開。" />
  <meta name="twitter:image" content="https://t-smile.co.jp/images/wagama/interior_l_5.webp" />

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@graph": [
      {{
        "@type": "BreadcrumbList",
        "itemListElement": [
          {{
            "@type": "ListItem",
            "position": 1,
            "name": "ホーム",
            "item": "https://t-smile.co.jp/"
          }},
          {{
            "@type": "ListItem",
            "position": 2,
            "name": "施工実例",
            "item": "https://t-smile.co.jp/#craftsmanship"
          }},
          {{
            "@type": "ListItem",
            "position": 3,
            "name": "私のわがまま・俺のわがまま（全66事例）",
            "item": "https://t-smile.co.jp/wagama/"
          }}
        ]
      }},
      {{
        "@type": "CollectionPage",
        "name": "「私のわがまま・俺のわがまま かなう家」全66事例",
        "description": "施主様の自由なわがままを、耐震最高等級3と熟練大工の手仕事でミリ単位で形にした全66事例集。",
        "url": "https://t-smile.co.jp/wagama/",
        "mainEntity": {{
          "@type": "ItemList",
          "numberOfItems": {count_all},
          "itemListElement": {json.dumps(item_list_elements, ensure_ascii=False)}
        }}
      }},
      {{
        "@type": "HomeAndConstructionBusiness",
        "@id": "https://t-smile.co.jp/#organization",
        "name": "株式会社住ま居る",
        "url": "https://t-smile.co.jp/",
        "logo": "https://t-smile.co.jp/images/hero_kaguya_house.jpg",
        "telephone": "049-271-2350",
        "address": {{
          "@type": "PostalAddress",
          "postalCode": "350-2224",
          "addressRegion": "埼玉県",
          "addressLocality": "鶴ヶ島市",
          "streetAddress": "町屋176番地5",
          "addressCountry": "JP"
        }}
      }}
    ]
  }}
  </script>

  <!-- Google Fonts & Stylesheet -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@700;800&family=Noto+Sans+JP:wght@400;500;700;800&family=Inter:wght@600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css" />

  <style>
    :root {{
      --wg-primary: #0f172a;
      --wg-accent-ore: #0284c7;
      --wg-accent-watashi: #d97706;
      --wg-accent-voice: #059669;
      --wg-bg: #f8fafc;
      --wg-card: #ffffff;
      --wg-border: #e2e8f0;
      --wg-text: #334155;
      --wg-heading: #0f172a;
    }}

    body {{
      background: var(--wg-bg);
      color: var(--wg-text);
      font-family: -apple-system, BlinkMacSystemFont, "Noto Sans JP", "Segoe UI", Roboto, sans-serif;
      line-height: 1.85;
      margin: 0;
      padding: 0;
    }}

    .wg-container {{
      max-width: 1360px;
      margin: 0 auto;
      padding: 0 1.5rem;
    }}

    /* Breadcrumbs */
    .wg-breadcrumbs {{
      padding: 1.2rem 0;
      font-size: 0.85rem;
      color: #64748b;
    }}
    .wg-breadcrumbs a {{
      color: #0284c7;
      text-decoration: none;
    }}
    .wg-breadcrumbs a:hover {{
      text-decoration: underline;
    }}

    /* Hero */
    .wg-hero {{
      background: linear-gradient(135deg, #1b4332 0%, #0f172a 60%, #1e293b 100%);
      color: #ffffff;
      padding: 4rem 1.5rem 4.5rem;
      border-radius: 0 0 2rem 2rem;
      text-align: center;
      position: relative;
      overflow: hidden;
      box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.35);
    }}
    .wg-hero::before {{
      content: "";
      position: absolute;
      top: -50%; right: -20%;
      width: 500px; height: 500px;
      background: radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%);
      pointer-events: none;
    }}
    .wg-hero-inner {{
      max-width: 900px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
    }}
    .wg-hero-badge {{
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(245, 158, 11, 0.2);
      border: 1px solid rgba(245, 158, 11, 0.5);
      color: #fde68a;
      font-size: 0.85rem;
      font-weight: 800;
      padding: 0.35rem 1.2rem;
      border-radius: 9999px;
      margin-bottom: 1.2rem;
      letter-spacing: 0.05em;
    }}
    .wg-hero h1 {{
      font-size: clamp(1.8rem, 4vw, 2.8rem);
      font-weight: 800;
      line-height: 1.35;
      margin: 0 0 1.2rem;
      letter-spacing: -0.02em;
    }}
    .wg-hero h1 span.highlight {{
      color: #fbbf24;
      background: linear-gradient(transparent 70%, rgba(217, 119, 6, 0.3) 70%);
    }}
    .wg-hero-lead {{
      font-size: clamp(1.0rem, 2vw, 1.15rem);
      color: #cbd5e1;
      line-height: 1.8;
      margin: 0 auto 2rem;
      max-width: 780px;
    }}

    /* Filter Tabs */
    .wg-tabs-wrap {{
      display: flex;
      justify-content: center;
      gap: 0.8rem;
      flex-wrap: wrap;
      margin: 2.5rem 0 3rem;
    }}
    .wg-tab-btn {{
      background: #ffffff;
      border: 1.5px solid var(--wg-border);
      color: #475569;
      font-size: 0.95rem;
      font-weight: 700;
      padding: 0.75rem 1.6rem;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
      min-height: 46px;
    }}
    .wg-tab-btn:hover {{
      border-color: #0284c7;
      color: #0284c7;
      transform: translateY(-2px);
    }}
    .wg-tab-btn.active {{
      background: #0f172a;
      border-color: #0f172a;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.25);
    }}
    .wg-tab-count {{
      font-size: 0.78rem;
      background: rgba(0, 0, 0, 0.08);
      padding: 2px 8px;
      border-radius: 12px;
    }}
    .wg-tab-btn.active .wg-tab-count {{
      background: rgba(255, 255, 255, 0.25);
      color: #ffffff;
    }}

    /* Grid */
    .wg-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 2rem;
      margin-bottom: 4rem;
    }}
    .wg-card {{
      background: var(--wg-card);
      border: 1px solid var(--wg-border);
      border-radius: 1.25rem;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
    }}
    .wg-card:hover {{
      transform: translateY(-4px);
      box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.1);
    }}
    .wg-img-wrap {{
      position: relative;
      width: 100%;
      height: 240px;
      background: #e2e8f0;
      overflow: hidden;
    }}
    .wg-img-wrap img {{
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }}
    .wg-card:hover .wg-img-wrap img {{
      transform: scale(1.05);
    }}
    .wg-badge {{
      position: absolute;
      top: 1rem;
      left: 1rem;
      color: #ffffff;
      font-size: 0.8rem;
      font-weight: 800;
      padding: 0.35rem 0.9rem;
      border-radius: 9999px;
      backdrop-filter: blur(4px);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
      letter-spacing: 0.03em;
    }}
    .wg-body {{
      padding: 1.8rem;
      display: flex;
      flex-direction: column;
      flex: 1;
    }}
    .wg-title {{
      font-size: 1.22rem;
      font-weight: 800;
      color: var(--wg-heading);
      margin: 0 0 1rem;
      line-height: 1.45;
    }}
    .wg-story {{
      font-size: 0.95rem;
      color: #475569;
      line-height: 1.8;
      margin: 0 0 1.2rem;
      flex: 1;
    }}
    .wg-tags {{
      margin-top: auto;
      padding-top: 1rem;
      border-top: 1px dashed var(--wg-border);
    }}
    .wg-tag {{
      display: inline-block;
      font-size: 0.8rem;
      color: #0284c7;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      padding: 0.2rem 0.7rem;
      border-radius: 6px;
      font-weight: 600;
    }}

    /* Bottom CTA Box */
    .wg-cta-box {{
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      border-radius: 2rem;
      padding: 3.5rem 2rem;
      text-align: center;
      margin: 4rem 0 3rem;
      box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.3);
      position: relative;
      overflow: hidden;
    }}
    .wg-cta-inner {{
      max-width: 800px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
    }}
    .wg-cta-box h2 {{
      font-size: clamp(1.6rem, 3.2vw, 2.3rem);
      font-weight: 800;
      margin: 0 0 1rem;
    }}
    .wg-cta-box p {{
      font-size: 1.05rem;
      color: #cbd5e1;
      line-height: 1.8;
      margin: 0 0 2rem;
    }}
    .wg-cta-btns {{
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }}
    .wg-btn-main {{
      background: linear-gradient(135deg, #d97706, #b45309);
      color: #ffffff;
      font-size: 1.05rem;
      font-weight: 800;
      padding: 1rem 2.2rem;
      border-radius: 9999px;
      text-decoration: none;
      box-shadow: 0 8px 20px -3px rgba(217, 119, 6, 0.5);
      min-height: 48px;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }}
    .wg-btn-sub {{
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: #ffffff;
      font-size: 1.05rem;
      font-weight: 800;
      padding: 1rem 2rem;
      border-radius: 9999px;
      text-decoration: none;
      min-height: 48px;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }}

    /* Footer Fix */
    footer {{
      width: 100%;
      box-sizing: border-box;
      background: #0f172a !important;
      color: #cbd5e1 !important;
      padding: 3.5rem 1.5rem 2.5rem !important;
      margin-top: 5rem;
      text-align: center;
    }}
    .footer-grid-unified {{
      max-width: 1540px !important;
      width: 100% !important;
      margin: 0 auto 2.5rem !important;
      text-align: left;
    }}

    @media (max-width: 768px) {{
      .wg-hero {{
        padding: 3rem 1rem 3.5rem;
        border-radius: 0 0 1.5rem 1.5rem;
      }}
      .wg-grid {{
        grid-template-columns: 1fr;
      }}
      .wg-cta-box {{
        padding: 2.5rem 1.2rem;
        border-radius: 1.5rem;
      }}
      .wg-cta-btns {{
        flex-direction: column;
      }}
      .wg-btn-main, .wg-btn-sub {{
        width: 100%;
        box-sizing: border-box;
        justify-content: center;
      }}
    }}
  </style>
</head>
<body>

  <!-- 共通ヘッダー -->
  {header_html}

  <!-- パンくずリスト -->
  <div class="wg-container">
    <div class="wg-breadcrumbs">
      <a href="/">ホーム</a> &gt; <a href="/#craftsmanship">施工実例</a> &gt; <span>私のわがまま・俺のわがまま かなう家（全66事例）</span>
    </div>
  </div>

  <!-- HERO -->
  <section class="wg-hero">
    <div class="wg-hero-inner">
      <div class="wg-hero-badge">
        <span>✨ 創業30年・800棟の絆から生まれた本物の施主ストーリー</span>
      </div>
      <h1>
        「私のわがまま・俺のわがまま かなう家」<br>
        <span class="highlight">全66事例アーカイブ</span>
      </h1>
      <p class="wg-hero-lead">
        「ハウスメーカーで断られた」「規格カタログにはない自分たちだけの夢」。<br>
        施主様の自由なわがままを、耐震最高等級3（許容応力度計算）・HEAT20 G2/G3超高断熱と、熟練大工の手仕事でミリ単位で形にした66の実例写真とリアルなエピソードを完全公開しています。
      </p>
    </div>
  </section>

  <!-- 絞り込みタブ ＆ カードグリッド -->
  <div class="wg-container">

    <!-- 絞り込みタブ -->
    <div class="wg-tabs-wrap">
      <button type="button" class="wg-tab-btn active" data-filter="all">
        <span>🌟 すべての事例</span>
        <span class="wg-tab-count">{count_all}件</span>
      </button>
      <button type="button" class="wg-tab-btn" data-filter="ore_wagama">
        <span>🏡 俺のわがまま</span>
        <span class="wg-tab-count">{count_ore}件</span>
      </button>
      <button type="button" class="wg-tab-btn" data-filter="watashi_wagama">
        <span>🌸 私のわがまま</span>
        <span class="wg-tab-count">{count_watashi}件</span>
      </button>
      <button type="button" class="wg-tab-btn" data-filter="client_voice">
        <span>💬 施主様の生の声</span>
        <span class="wg-tab-count">{count_voice}件</span>
      </button>
    </div>

    <!-- カード一覧 -->
    <div class="wg-grid" id="wagama-grid-container">
      {cards_joined}
    </div>

    <!-- CTA ボックス -->
    <div class="wg-cta-box">
      <div class="wg-cta-inner">
        <h2>あなたの「わがまま」も、ぜひお聞かせください。</h2>
        <p>
          「他社で耐震上無理と言われた」「規格外オプションで諦めさせられた」…<br>
          どんなに尖ったこだわりでも構いません。全棟許容応力度計算とパッシブ温熱設計で、安全に快適に形にする方法を一緒に探します。
        </p>
        <div class="wg-cta-btns">
          <a href="/custom-freedom/" class="wg-btn-main">
            <span>📐 最高性能×完全自由設計の真実を見る ➜</span>
          </a>
          <a href="/#craftsmanship" class="wg-btn-sub">
            <span>🏠 施工実例 全12邸の写真アーカイブ ➜</span>
          </a>
        </div>
      </div>
    </div>

  </div>

  </main>

  <!-- 共通フッター -->
  {footer_html}

  <!-- タブ絞り込み用スクリプト -->
  <script>
    document.addEventListener('DOMContentLoaded', function() {{
      var buttons = document.querySelectorAll('.wg-tab-btn');
      var cards = document.querySelectorAll('.wg-card');

      buttons.forEach(function(btn) {{
        btn.addEventListener('click', function() {{
          buttons.forEach(function(b) {{ b.classList.remove('active'); }});
          this.classList.add('active');

          var filter = this.getAttribute('data-filter');
          cards.forEach(function(card) {{
            if (filter === 'all' || card.getAttribute('data-category') === filter) {{
              card.style.display = 'flex';
            }} else {{
              card.style.display = 'none';
            }}
          }});
        }});
      }});
    }});
  </script>
</body>
</html>
'''

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(page_html)

    print(f"✔ Successfully generated Wagama Page: {OUTPUT_FILE} ({count_all} items)")

if __name__ == "__main__":
    generate_wagama_page()

