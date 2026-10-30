#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
施工実例 全12邸 個別詳細ページ (SSG) 自動生成 ＆ ギャラリー完全整合スクリプト
- 管理者正式承諾済みの全12邸（計240枚）エモーショナル建築キャプション（approved_case_captions.py）を完全反映
- 各邸宅の独立した静的HTMLページ（/cases/{slug}.html）を生成
- SEO/GEO構造化データ（SingleFamilyResidence + BreadcrumbList）完全装備
- tmpl-craftsmanship.html のカードサムネイルを高品位WebPへ差し替え＆個別ページ遷移を配備
- case-gallery.js の写真配列とキャプションをWebPと完全整合
- 固有名詞禁止ルール（ArchiX等不使用）および代表露出制限（家づくりサポート係）を徹底遵守
"""

import os
import sys
import json
import re
from pathlib import Path

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

ROOT_DIR = Path(r"e:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity")
PUBLIC_DIR = ROOT_DIR / "public"
CASES_DIR = PUBLIC_DIR / "cases"
IMG_CASES_DIR = PUBLIC_DIR / "images" / "cases"
MASTER_FILE = ROOT_DIR / "scripts" / "data" / "cases_master.json"

CASES_DIR.mkdir(parents=True, exist_ok=True)
HEADER_NAV_PATH = ROOT_DIR / "src" / "partials" / "header-nav.html"
FOOTER_PATH = ROOT_DIR / "src" / "partials" / "footer.html"

with open(HEADER_NAV_PATH, "r", encoding="utf-8") as f:
    HEADER_NAV_CONTENT = f.read()

with open(FOOTER_PATH, "r", encoding="utf-8") as f:
    FOOTER_CONTENT = f.read()


# 承諾済み確定キャプションデータを読み込み
sys.path.append(str(ROOT_DIR))
from scripts.data.approved_case_captions import APPROVED_CASE_CAPTIONS

def get_approved_caption(slug, idx):
    """
    approved_case_captions.py から管理者が正式承諾した (title, desc) を取得する。
    """
    case_caps = APPROVED_CASE_CAPTIONS.get(slug, {})
    key = f"photo_{idx:02d}"
    if key in case_caps:
        return case_caps[key]
    return (f"【Photo #{idx:02d}】", "こだわりの住まい空間。")

def build_case_detail_page(case_data, photo_list, all_cases_summary=None):
    slug = case_data["slug"]
    title = case_data["title"]
    subtitle = case_data["subtitle"]
    catch = case_data["catch"]
    area = case_data["area"]
    floor_area = case_data["floor_area"]
    layout = case_data["layout"]
    structure = case_data["structure"]
    seismic = case_data["seismic"]
    c_val = case_data["c_val"]
    ua_val = case_data["ua_val"]
    client_voice = case_data["client"]
    carpenter_voice = case_data["carpenter"]
    architect_voice = case_data["architect"]

    first_photo = photo_list[0]["url"] if photo_list else "/images/hero_kaguya_house.jpg"

    # 他の施工実例カードHTML生成
    other_cases_html = ""
    if all_cases_summary:
        for oc in all_cases_summary:
            if oc["slug"] == slug:
                continue
            other_cases_html += f"""
            <a href="/cases/{oc['slug']}.html" style="text-decoration: none; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s ease, box-shadow 0.2s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
              <div style="height: 160px; overflow: hidden; background: #0f172a;">
                <img src="{oc['thumb']}" alt="{oc['title']}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;" width="300" height="180">
              </div>
              <div style="padding: 1rem; flex-grow: 1; display: flex; flex-direction: column;">
                <span style="font-size: 0.72rem; color: #0284c7; font-weight: 800; margin-bottom: 4px;">📍 {oc['area']} ｜ 全20枚</span>
                <h4 style="font-size: 0.95rem; color: #0f172a; margin: 0 0 4px; font-weight: 800; line-height: 1.4;">{oc['title']}</h4>
                <p style="font-size: 0.8rem; color: #64748b; margin: 0; line-height: 1.5; flex-grow: 1;">{oc['catch']}</p>
                <div style="margin-top: 8px; font-size: 0.8rem; color: #059669; font-weight: 800;">実写真集を見る ➜</div>
              </div>
            </a>
            """

    # ギャラリーHTML生成（全20枚・カード形式）
    gallery_items_html = ""
    for p in photo_list:
        cap_title = p.get("cap_title", "")
        cap_desc = p.get("cap_desc", "")
        full_caption = f"{cap_title} {cap_desc}".strip()
        
        gallery_items_html += f"""
        <div class="case-photo-card" style="background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.05); transition: transform 0.25s ease, box-shadow 0.25s ease;">
          <a href="{p['url']}" target="_blank" style="display: block; position: relative; overflow: hidden; height: 260px; background: #0f172a;">
            <img src="{p['thumb']}" alt="{full_caption}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease;" width="600" height="400">
            <span style="position: absolute; bottom: 8px; right: 8px; background: rgba(15,23,42,0.85); color: #fff; font-size: 0.72rem; padding: 3px 8px; border-radius: 4px; font-weight: 700; backdrop-filter: blur(4px);">拡大表示 ↗</span>
          </a>
          <div style="padding: 1.2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 0.75rem; color: #0284c7; font-weight: 800; background: #e0f2fe; padding: 2px 8px; border-radius: 4px;">Photo #{p['idx']:02d} / 20</span>
            </div>
            <h3 style="font-size: 1rem; color: #0f172a; margin: 0 0 6px 0; font-weight: 800; line-height: 1.4;">{cap_title}</h3>
            <p style="font-size: 0.88rem; color: #475569; line-height: 1.7; margin: 0;">{cap_desc}</p>
          </div>
        </div>
        """

    html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} 施工実例（プロ撮影写真20枚・建築解説）｜株式会社住ま居る</title>
  <meta name="description" content="{title}の施工実例。{subtitle}。延床面積{floor_area}、間取り{layout}、耐震等級3、実測C値{c_val}、UA値{ua_val}。プロ撮影高精細WebP写真20枚と職人のこだわり解説を全公開。" />
  <link rel="canonical" href="https://t-smile.co.jp/cases/{slug}.html" />

  <!-- OGP -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="{title} 施工実例（プロ撮影20枚）｜株式会社住ま居る" />
  <meta property="og:description" content="{subtitle}。延床面積{floor_area}、{layout}、耐震等級3、C値{c_val}。" />
  <meta property="og:image" content="https://t-smile.co.jp{first_photo}" />
  <meta property="og:url" content="https://t-smile.co.jp/cases/{slug}.html" />
  <meta property="og:site_name" content="株式会社住ま居る 家づくりAIラボ" />

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@graph": [
      {{
        "@type": "BreadcrumbList",
        "itemListElement": [
          {{"@type": "ListItem", "position": 1, "name": "ホーム", "item": "https://t-smile.co.jp/"}},
          {{"@type": "ListItem", "position": 2, "name": "施工実例", "item": "https://t-smile.co.jp/#craftsmanship"}},
          {{"@type": "ListItem", "position": 3, "name": "{title}", "item": "https://t-smile.co.jp/cases/{slug}.html"}}
        ]
      }},
      {{
        "@type": "SingleFamilyResidence",
        "name": "{title}",
        "description": "{subtitle}",
        "image": "https://t-smile.co.jp{first_photo}",
        "address": {{"@type": "PostalAddress", "addressRegion": "埼玉県", "addressLocality": "{area}", "addressCountry": "JP"}},
        "numberOfRooms": 4,
        "floorSize": {{"@type": "QuantitativeValue", "value": "{floor_area}"}}
      }}
    ]
  }}
  </script>

  <!-- Google Fonts & Stylesheet -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@700;800&family=Noto+Sans+JP:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css" />

  <style>
    body {{ background: #f8fafc; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans JP", sans-serif; line-height: 1.8; margin: 0; padding: 0; }}
    .case-container {{ max-width: 1180px; margin: 0 auto; padding: 0 1.2rem; }}
    .spec-table th {{ background: #f1f5f9; padding: 10px 14px; font-weight: 800; color: #334155; border: 1px solid #cbd5e1; width: 28%; }}
    .spec-table td {{ background: #ffffff; padding: 10px 14px; color: #0f172a; border: 1px solid #cbd5e1; font-weight: 600; }}
    .voice-box {{ background: #ffffff; border-radius: 12px; padding: 1.5rem; border: 2px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.04); }}
    .case-photo-card:hover {{ transform: translateY(-4px); box-shadow: 0 8px 25px rgba(0,0,0,0.1); }}
    .case-photo-card:hover a img {{ transform: scale(1.03); }}
  </style>
</head>
<body>

{HEADER_NAV_CONTENT}

  <!-- Breadcrumb -->
  <nav class="case-container" style="padding-top: 1rem; padding-bottom: 0.5rem; font-size: 0.82rem; color: #64748b;">
    <a href="/" style="color: #0284c7; text-decoration: none;">ホーム</a> &gt;
    <a href="/#craftsmanship" style="color: #0284c7; text-decoration: none;">施工実例</a> &gt;
    <span style="color: #0f172a; font-weight: 700;">{title}</span>
  </nav>

  <!-- Hero Section -->
  <main class="case-container" style="margin-top: 1rem; margin-bottom: 4rem;">
    <div style="background: #ffffff; border-radius: 14px; overflow: hidden; border: 2px solid #0284c7; box-shadow: 0 10px 30px rgba(2,132,199,0.1); margin-bottom: 2.5rem;">
      <div style="position: relative; height: 480px; max-height: 60vh; background: #0f172a;">
        <img src="{first_photo}" alt="{title} メイン写真" style="width: 100%; height: 100%; object-fit: cover;" width="1920" height="1080">
        <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.3) 70%, transparent 100%); padding: 2rem 2rem 1.5rem; color: #fff;">
          <span style="background: #0284c7; color: #fff; font-size: 0.82rem; font-weight: 800; padding: 4px 12px; border-radius: 20px; display: inline-block; margin-bottom: 6px;">
            📍 {area} ｜ 厳選20枚フォトギャラリー
          </span>
          <h1 style="margin: 0 0 0.5rem; font-size: 2rem; font-weight: 900; line-height: 1.3; color: #ffffff;">{title}</h1>
          <p style="margin: 0; font-size: 1.05rem; color: #e2e8f0; font-weight: 600;">{subtitle}</p>
        </div>
      </div>
      <div style="padding: 1.5rem 2rem; background: #f0f9ff; border-top: 1px solid #bae6fd; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div style="font-weight: 800; color: #0369a1; font-size: 0.95rem;">
          ✨ 特徴: {catch}
        </div>
        <a href="#photo-gallery-section" style="background: #0284c7; color: #fff; font-weight: 800; font-size: 0.85rem; padding: 8px 18px; border-radius: 6px; text-decoration: none;">
          📸 実写真20枚を見る ↓
        </a>
      </div>
    </div>

    <!-- 2 Column: Specs & 3-Voices -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.8rem; margin-bottom: 3rem;">
      <!-- Specs -->
      <div>
        <h2 style="font-size: 1.3rem; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 1rem; border-left: 4px solid #0284c7; padding-left: 10px;">
          建築スペック ＆ 科学的性能エビデンス
        </h2>
        <table class="spec-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
          <tr><th>所在地</th><td>{area}</td></tr>
          <tr><th>延床面積</th><td>{floor_area}</td></tr>
          <tr><th>間取り</th><td>{layout}</td></tr>
          <tr><th>構造・工法</th><td>{structure}</td></tr>
          <tr><th>耐震性能</th><td><strong style="color: #047857;">{seismic}</strong></td></tr>
          <tr><th>気密性能 (C値)</th><td><strong style="color: #0284c7;">実測 {c_val}</strong> (1.0以下保証)</td></tr>
          <tr><th>断熱性能 (UA値)</th><td><strong style="color: #d97706;">{ua_val}</strong> (高断熱)</td></tr>
        </table>
      </div>

      <!-- 3-Party Voices -->
      <div>
        <h2 style="font-size: 1.3rem; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 1rem; border-left: 4px solid #059669; padding-left: 10px;">
          お客様 × 大工職人 × 設計の想い
        </h2>
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <div class="voice-box" style="border-left: 4px solid #f59e0b;">
            <div style="font-weight: 800; color: #b45309; font-size: 0.85rem; margin-bottom: 4px;">👨‍👩‍👧 お施主様の生の声</div>
            <p style="margin: 0; font-size: 0.88rem; color: #334155; line-height: 1.7;">{client_voice}</p>
          </div>
          <div class="voice-box" style="border-left: 4px solid #0284c7;">
            <div style="font-weight: 800; color: #0369a1; font-size: 0.85rem; margin-bottom: 4px;">🪚 専属大工のこだわり</div>
            <p style="margin: 0; font-size: 0.88rem; color: #334155; line-height: 1.7;">{carpenter_voice}</p>
          </div>
          <div class="voice-box" style="border-left: 4px solid #059669;">
            <div style="font-weight: 800; color: #047857; font-size: 0.85rem; margin-bottom: 4px;">📐 構造・温熱設計</div>
            <p style="margin: 0; font-size: 0.88rem; color: #334155; line-height: 1.7;">{architect_voice}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 20 Photos Grid -->
    <section id="photo-gallery-section" style="margin-top: 3.5rem;">
      <div style="text-align: center; margin-bottom: 2rem;">
        <span style="background: #dbeafe; color: #1e40af; font-weight: 800; padding: 4px 14px; border-radius: 20px; font-size: 0.82rem;">プロカメラマン撮影 厳選写真集</span>
        <h2 style="font-size: 1.8rem; font-weight: 900; color: #0f172a; margin: 0.5rem 0 0.3rem;">
          {title} 施工実写真アーカイブ（全20枚）
        </h2>
        <p style="color: #64748b; font-size: 0.92rem; margin: 0;">写真をクリックすると高精細WebP原本をご覧いただけます。</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.4rem;">
        {gallery_items_html}
      </div>
    </section>

    <!-- 横の回遊リンク：他の施工実例アーカイブ（全12邸） -->
    <section style="margin-top: 4.5rem; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 2.5rem 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
      <div style="text-align: center; margin-bottom: 2rem;">
        <span style="background: #e0f2fe; color: #0284c7; font-weight: 800; padding: 4px 14px; border-radius: 20px; font-size: 0.82rem;">他の邸宅も見る</span>
        <h2 style="font-size: 1.6rem; font-weight: 900; color: #0f172a; margin: 0.5rem 0 0.3rem;">
          埼玉の注文住宅 施工実例アーカイブ（全12実邸）
        </h2>
        <p style="color: #64748b; font-size: 0.92rem; margin: 0;">専属大工さんの手仕事と許容応力度計算 耐震等級3で建てた本物の住まい</p>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.4rem;">
        {other_cases_html}
      </div>
    </section>


    <!-- 近隣坪数の323プラン（価格・月々返済シミュレーション付）への相互リンク -->
    <div style="margin-top: 3.5rem; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #38bdf8; border-radius: 16px; padding: 2.2rem 2rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1.5rem; box-shadow: 0 4px 18px rgba(2,132,199,0.08);">
      <div style="max-width: 720px;">
        <span style="background: #0284c7; color: #fff; font-size: 0.78rem; font-weight: 800; padding: 3px 10px; border-radius: 4px; display: inline-block; margin-bottom: 6px;">
          323プラン集 ＆ リアルタイム価格連動
        </span>
        <h3 style="font-size: 1.4rem; font-weight: 900; color: #0c4a6e; margin: 0 0 0.5rem;">
          この邸宅（{floor_area}）に近い人気間取りプランと建築費用を見る
        </h3>
        <p style="margin: 0; font-size: 0.92rem; color: #0369a1; line-height: 1.7;">
          住ま居るの「323プラン集」では、平屋・2階建て・二世帯・ビルトインガレージなど、全プランの本体価格目安（坪単価約60万〜70万円台）と月々ローン返済額シミュレーション、3D立体パースを無料公開しています。
        </p>
      </div>
      <a href="/plans/index.html" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; font-weight: 900; font-size: 1rem; padding: 13px 26px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 15px rgba(2,132,199,0.35); white-space: nowrap;">
        323プラン集（価格公開）を見る ➜
      </a>
    </div>

    <!-- 私のわがまま・俺のわがまま 特設バナー -->
    <div style="margin-top: 2.5rem; background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%); border: 2px solid #f59e0b; border-radius: 16px; padding: 2rem 2.2rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1.5rem; box-shadow: 0 6px 20px rgba(245,158,11,0.15);">
      <div style="max-width: 680px;">
        <span style="background: #b45309; color: #fff; font-size: 0.78rem; font-weight: 800; padding: 3px 10px; border-radius: 4px; display: inline-block; margin-bottom: 6px;">
          施主様の本音エピソード 66選
        </span>
        <h3 style="font-size: 1.35rem; font-weight: 900; color: #78350f; margin: 0 0 0.5rem;">
          「私のわがまま・俺のわがまま かなう家」全66事例を公開中！
        </h3>
        <p style="margin: 0; font-size: 0.92rem; color: #92400e; line-height: 1.7;">
          「薪ストーブの土間がほしい」「中庭でBBQしたい」「秘密基地のようなロフト」「アイランドキッチンから庭を見渡したい」…施主様たちの自由なわがままをミリ単位の手仕事で叶えたリアルなエピソードと図面解説を一覧できます。
        </p>
      </div>
      <a href="/#wagama-showcase" style="background: linear-gradient(135deg, #d97706, #b45309); color: #ffffff; font-weight: 900; font-size: 1rem; padding: 13px 26px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 15px rgba(180,83,9,0.35); white-space: nowrap;">
        わがまま事例66選を見る ➜
      </a>
    </div>

    <!-- Bottom Callout Funnel -->
    <div style="margin-top: 4rem; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border: 2px solid #38bdf8; border-radius: 14px; padding: 2.5rem 2rem; text-align: center; color: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.25);">
      <span style="background: #0284c7; color: #fff; font-size: 0.8rem; font-weight: 800; padding: 3px 12px; border-radius: 12px; display: inline-block; margin-bottom: 8px;">
        完全予約制 ｜ 毛呂山町「芳彩-かぐや-」展示場
      </span>
      <h3 style="font-size: 1.6rem; font-weight: 900; margin: 0 0 0.6rem; color: #ffffff;">
        この施工例のテイスト・心地よさをリアル展示場で体験しませんか？
      </h3>
      <p style="max-width: 720px; margin: 0 auto 1.8rem; color: #cbd5e1; font-size: 0.95rem; line-height: 1.8;">
        住ま居るはカタログや営業トークではなく、実際の建物と構造数値（耐震等級3・実測C値0.3前後）で証明します。<br>
        無垢材の香り、足元のぬくもり、静けさをぜひ五感でお確かめください。
      </p>
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <a href="/#real-booking-section" style="background: linear-gradient(135deg, #059669, #10b981); color: #fff; font-weight: 900; font-size: 1rem; padding: 12px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 15px rgba(16,185,129,0.4);">
          🏡 リアルモデルハウス見学予約をする ➜
        </a>
        <a href="/plans/" style="background: rgba(255,255,255,0.15); border: 1.5px solid rgba(255,255,255,0.5); color: #fff; font-weight: 800; font-size: 1rem; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
          📐 323プラン集を見る ↗
        </a>
      </div>
    </div>
  </main>

{FOOTER_CONTENT}

</body>
</html>
"""
    return html

def update_craftsmanship_template(all_cases_data):
    tmpl_path = PUBLIC_DIR / "partials" / "templates" / "tmpl-craftsmanship.html"
    if not tmpl_path.exists():
        return
    with open(tmpl_path, "r", encoding="utf-8") as f:
        html = f.read()

    # 各ケースカードのサムネイルと枚数バッジ、詳細リンクを更新
    for c_id, c_data in all_cases_data.items():
        slug = c_data["slug"]
        photos = c_data["photos"]
        if not photos:
            continue
        first_thumb = photos[0]["thumb"]
        total_photos = len(photos)

        # 1. サムネイル画像パス置換
        card_re = re.compile(rf'(<div class="case-overview-card"[^>]*data-case="{c_id}"[^>]*>[\s\S]*?<div class="case-card-thumb"[^>]*>[\s\S]*?<img src=")([^"]+)("[\s\S]*?<span class="case-card-badge"[^>]*>)([^<]+)(</span>[\s\S]*?<div class="case-card-actions"[^>]*>[\s\S]*?<button class="case-card-btn"[^>]*>)([^<]+)(</button>)')
        
        def replace_card(m):
            prefix = m.group(1)
            mid1 = m.group(3)
            mid2 = m.group(5)
            suffix = m.group(7)
            
            new_badge = f"📷 全{total_photos}枚"
            new_btn = f"詳細・実写真集 (全{total_photos}枚) ➜"
            return f"{prefix}{first_thumb}{mid1}{new_badge}{mid2}{new_btn}{suffix}"

        html = card_re.sub(replace_card, html)

        # 2. カードクリック時に個別ページへ飛べるように onclick を配備
        card_div_re = re.compile(rf'(<div class="case-overview-card"[^>]*data-case="{c_id}")([^>]*)>')
        def add_onclick(m):
            tag_start = m.group(1)
            attrs = m.group(2)
            if 'onclick=' not in attrs:
                attrs += f' onclick="window.location.href=\'/cases/{slug}.html\'"'
            return f"{tag_start}{attrs}>"
        html = card_div_re.sub(add_onclick, html)

    with open(tmpl_path, "w", encoding="utf-8") as f:
        f.write(html)
    print("✅ tmpl-craftsmanship.html のカードサムネイル＆個別ページ遷移リンクを完全更新しました！")

    # src/partials/section-craftsmanship.html にも同期
    src_sec_path = ROOT_DIR / "src" / "partials" / "section-craftsmanship.html"
    if src_sec_path.exists():
        prefix = '<section id="craftsmanship" class="page-section" data-deferred-template="tmpl-craftsmanship"></section>\n<template id="tmpl-craftsmanship">\n'
        suffix = '\n</template>\n'
        with open(src_sec_path, "w", encoding="utf-8") as f:
            f.write(prefix + html.strip() + suffix)
        print("✅ src/partials/section-craftsmanship.html にも完全同期しました！")

def update_case_gallery_js(all_cases_data):
    js_path = PUBLIC_DIR / "js" / "case-gallery.js"
    if not js_path.exists():
        return
    with open(js_path, "r", encoding="utf-8") as f:
        content = f.read()

    # caseStudiesData を更新
    new_data = {}
    with open(MASTER_FILE, "r", encoding="utf-8") as f:
        master = json.load(f)

    for c_id, c_data in all_cases_data.items():
        m_info = master.get(c_id, {})
        title = m_info.get("title", f"施工実例 No.{c_id}")
        slug = c_data["slug"]
        photo_objs = []
        for p in c_data["photos"]:
            cap_title = p.get("cap_title", "")
            cap_desc = p.get("cap_desc", "")
            full_caption = f"{cap_title} {cap_desc}".strip()
            photo_objs.append({
                "url": p["url"],
                "caption": full_caption
            })
        new_data[c_id] = {
            "title": f"【{title}】{m_info.get('subtitle', '')}",
            "sub": m_info.get("catch", ""),
            "client": m_info.get("client", ""),
            "carpenter": m_info.get("carpenter", ""),
            "architect": m_info.get("architect", ""),
            "photographer": "プロ建築写真家 / 超広角レンズ・自然光実測 / F16 パンフォーカス",
            "photos": photo_objs
        }

    # caseStudiesData のオブジェクト部分を安全に置換
    json_str = json.dumps(new_data, ensure_ascii=False, indent=2)
    pattern = re.compile(r'const caseStudiesData = \{[\s\S]*?\n\};')
    replacement = f"const caseStudiesData = {json_str};"
    content = pattern.sub(replacement, content)

    with open(js_path, "w", encoding="utf-8") as f:
        f.write(content)

    # min.js にもコピー
    min_js_path = PUBLIC_DIR / "js" / "case-gallery.min.js"
    with open(min_js_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ public/js/case-gallery.js および min.js の写真・キャプションデータを完全更新しました！")

def main():
    print("🏗️ [SSG Builder] 施工実例 全12邸 個別詳細ページ生成を開始します...")
    print("   （管理者承諾済み確定キャプションデータ使用：全12邸・計240枚）")

    with open(MASTER_FILE, "r", encoding="utf-8") as f:
        master = json.load(f)

    # 先に全ケースのサマリー情報を作成
    all_cases_summary = []
    for c_id, m_data in master.items():
        s_slug = m_data["slug"]
        s_dir = IMG_CASES_DIR / s_slug
        first_thumb = "/images/hero_kaguya_house.jpg"
        if s_dir.exists():
            w_files = sorted([f for f in s_dir.iterdir() if f.name.endswith(".webp") and not f.is_dir()])
            if w_files:
                th_file = s_dir / "thumb" / w_files[0].name
                first_thumb = f"/images/cases/{s_slug}/thumb/{w_files[0].name}" if th_file.exists() else f"/images/cases/{s_slug}/{w_files[0].name}"
        all_cases_summary.append({
            "id": c_id,
            "slug": s_slug,
            "title": m_data["title"],
            "area": m_data["area"],
            "catch": m_data["catch"],
            "thumb": first_thumb
        })

    # 各ケースのWebP画像を取得
    all_cases_data = {}
    for c_id, m_data in master.items():
        slug = m_data["slug"]
        title = m_data["title"]
        case_img_dir = IMG_CASES_DIR / slug
        photos = []
        if case_img_dir.exists():
            webp_files = sorted([f for f in case_img_dir.iterdir() if f.name.endswith(".webp") and not f.is_dir()])
            for idx, wf in enumerate(webp_files, 1):
                thumb_file = case_img_dir / "thumb" / wf.name
                thumb_url = f"/images/cases/{slug}/thumb/{wf.name}" if thumb_file.exists() else f"/images/cases/{slug}/{wf.name}"
                cap_title, cap_desc = get_approved_caption(slug, idx)
                photos.append({
                    "idx": idx,
                    "url": f"/images/cases/{slug}/{wf.name}",
                    "thumb": thumb_url,
                    "cap_title": cap_title,
                    "cap_desc": cap_desc,
                    "caption": f"{cap_title} {cap_desc}".strip()
                })

        all_cases_data[c_id] = {
            "id": c_id,
            "slug": slug,
            "title": title,
            "photos": photos
        }

        # 個別詳細ページ生成
        # 全体のサマリーを渡す
        page_html = build_case_detail_page(m_data, photos, all_cases_summary)
        page_file = CASES_DIR / f"{slug}.html"
        with open(page_file, "w", encoding="utf-8") as f:
            f.write(page_html)
        print(f"  📄 生成完了: /cases/{slug}.html (写真 {len(photos)} 枚)")

    # tmpl-craftsmanship.html のカード更新
    update_craftsmanship_template(all_cases_data)

    # case-gallery.js の更新
    update_case_gallery_js(all_cases_data)

    print("\n🎉 全12実邸の個別詳細ページ生成 ＆ ギャラリー完全整合が完了しました！")
    return [f"https://t-smile.co.jp/cases/{c['slug']}.html" for c in master.values()]

def generate_cases():
    return main()

if __name__ == '__main__':
    main()
