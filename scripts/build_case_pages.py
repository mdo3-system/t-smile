#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
施工実例 全12邸 個別詳細ページ (SSG) 自動生成 ＆ ギャラリー完全整合スクリプト
- 各邸宅の独立した静的HTMLページ（/cases/{slug}.html）を生成
- SEO/GEO構造化データ（SingleFamilyResidence + BreadcrumbList）完全装備
- tmpl-craftsmanship.html のカードサムネイルを404生写真から高品位WebPへ差し替え
- 「詳細を見る ➜」リンクを個別ページへ配備
- case-gallery.js の写真配列とキャプションをWebPと完全整合
"""

import os
import sys
import json
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

# 川越市 Y様邸の精密キャプション
KAWAGOE_Y_CAPTIONS = [
    "【外観ファサード】直線美を際立たせたホワイト×ダークトーンのスクエアモダン建築。プライバシーと採光を両立。",
    "【アプローチ動線】ゆとりある前庭と愛車をやさしく迎え入れるアプローチ。夜間は間接照明が壁面を照らし出します。",
    "【玄関ポーチ】雨の日も濡れずに快適な深い軒の出。シャープなエントランスデザインが邸宅の格調を演出。",
    "【エントランスホール】扉を開けた瞬間に広がる白タイル床の気品ある空間。足元からホテルライクな非日常が始まります。",
    "【大型シューズクローク】家族全員の靴やアウトドア用品を美しく収める大容量収納。玄関を常にすっきり整頓。",
    "【30帖大LDK全景】仕切りのない圧倒的な大開口リビング。白タイル床に反射する自然光が空間全体を満たします。",
    "【白タイル床×テラス一体空間】屋内外がフラットにつながる設計。床暖房対応の大判タイルが冬でも素足のぬくもりを約束。",
    "【ピットリビング（一段下がりリビング）】段差により空間をゆるやかにゾーニング。包まれるような安心感とくつろぎを創出。",
    "【ピットリビングからの目線設計】座ったときに天井の高さと開放感が最大化される黄金比のフロアレベル設計。",
    "【造作TVウォール＆建築化間接照明】コーニス照明がタイルの陰影を美しく浮かび上がらせ、夜景時の贅沢なリラックス空間を演出。",
    "【高級アイランドキッチン】LDKの中央に配したステージのようなオープンキッチン。回遊動線で家事効率も抜群。",
    "【ダイニング＆キッチンゾーン】ホームパーティーでもゲストと自然に会話が弾む、おもてなしのレイアウト。",
    "【大型バックセット収納】調理家電や食器を美しく隠すフラット扉の造作壁面収納。生活感を完全排除。",
    "【現代和モダン畳ルーム】LDKの雰囲気を壊さず調和する縁なし畳スペース。客間や子どものお昼寝、寛ぎの場に最適。",
    "【和室の職人造作ディテール】手刻み大工の精緻な建具合わせ。地窓からの柔らかな間接光が静謐な和の趣を醸成。",
    "【スケルトン階段＆吹抜け空間】繊細なスチール手すりと木製踏板が宙に浮くようなデザイン階段。上下階をつなぐ光の井戸。",
    "【ホテルライク造作洗面化粧台】ワイドカウンターと大型一面鏡、アンダー間接照明。朝の身支度が優雅な時間に。",
    "【プレミアムバスルーム】落ち着いたダークトーンのパネルと保温浴槽。1日の疲れを深く癒すプライベートスパ空間。",
    "【レストルーム・造作手洗い】タンクレストイレと独立型手洗いカウンター。壁面タイルと間接照明の上品な調和。",
    "【2階マスターベッドルーム】ホテルの一室のような落ち着きと静寂を追求した主寝室。心地よい眠りを誘う照度設計。"
]

def generate_caption(case_title, idx, total, slug):
    if slug == "kawagoe-y" and idx - 1 < len(KAWAGOE_Y_CAPTIONS):
        return KAWAGOE_Y_CAPTIONS[idx - 1]
    
    # 汎用建築プロキャプション（部位別ストーリー）
    categories = [
        ("外観ファサード", "街並みに美しく映える外観デザイン。埼玉の自然光と風の流れを計算したパッシブ設計。"),
        ("アプローチ・玄関", "愛車や家族をやさしく迎え入れるエントランス。深い庇が雨風を防ぎます。"),
        ("エントランスホール", "扉を開けた瞬間に広がる無垢材の香りと上質な空間。来客を温かくもてなします。"),
        ("大開口LDK全景", "家族全員がゆったり寛げる広々リビング。耐震等級3を維持しながら大空間を実現。"),
        ("リビング・吹き抜け", "上部からの光が降り注ぐ心地よいリビング。開放感と高気密高断熱を両立。"),
        ("ピットリビング・畳コーナー", "空間をゆるやかに仕切る工夫。段差に腰掛けたり寝転んだりと多彩なくつろぎを提案。"),
        ("オーダーキッチン", "料理が楽しくなる機能美あふれるキッチン。家事負担を軽減する回遊動線を確保。"),
        ("ダイニングゾーン", "家族の会話が弾む明るい食卓。庭の景色を眺めながら食事が楽しめます。"),
        ("大容量収納・パントリー", "生活感をすっきり隠す造作収納。必要な場所に必要な容量を配置。"),
        ("大工手刻み・化粧梁", "熟練大工が木の癖を見極めて手刻み加工した化粧梁。構造の力強さと美しさが共存。"),
        ("本格和室・障子ディテール", "伝統の木組みとモダンが融合した和室。細部に宿る職人の精緻な手仕事。"),
        ("デザイン階段", "インテリアの主役となる美しい階段。軽やかなスチールと無垢木材の調和。"),
        ("ホテルライク造作洗面", "毎日の身支度が楽しくなるオリジナル洗面台。タイルと照明の美しい組み合わせ。"),
        ("浴室・バスルーム", "1日の疲れを心地よく癒すバスルーム。高断熱浴槽で冬でもあたたかさが持続。"),
        ("レストルーム", "清潔感と落ち着きのあるレストルーム。独立手洗い器やニッチ収納を完備。"),
        ("主寝室・ウォークインクローゼット", "静かな眠りを約束する落ち着いた寝室。大容量のウォークインクローゼットを併設。"),
        ("子ども部屋・スタディスペース", "子どもの成長に合わせて間仕切り可能な可変設計。自然光が入る明るい空間。"),
        ("バルコニー・ウッドデッキ", "屋内外が一体となるアウトドアリビング。青空の下でリフレッシュできる特等席。"),
        ("夜景ライティング", "夕暮れ時から美しく灯る建築化照明。安心感とやすらぎに包まれる夜の佇まい。"),
        ("建物全景・竣工ディテール", "お施主様の叶えたい想い、大工の技、建築士の計算が結実した世界にひとつの邸宅。")
    ]
    cat_idx = (idx - 1) % len(categories)
    cat_name, cat_desc = categories[cat_idx]
    return f"【{cat_name}】{case_title} - {cat_desc}"

def build_case_detail_page(case_data, photo_list):
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

    # ギャラリーHTML生成
    gallery_items_html = ""
    for p in photo_list:
        gallery_items_html += f"""
        <div class="case-photo-card" style="background: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.05); transition: transform 0.25s ease;">
          <a href="{p['url']}" target="_blank" style="display: block; position: relative; overflow: hidden; height: 260px;">
            <img src="{p['thumb']}" alt="{p['caption']}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease;" width="600" height="400">
            <span style="position: absolute; bottom: 8px; right: 8px; background: rgba(15,23,42,0.8); color: #fff; font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; font-weight: 700;">拡大表示 ↗</span>
          </a>
          <div style="padding: 1rem;">
            <div style="font-size: 0.75rem; color: #0284c7; font-weight: 800; margin-bottom: 4px;">Photo #{p['idx']:02d} / 20</div>
            <p style="font-size: 0.88rem; color: #1e293b; line-height: 1.6; margin: 0; font-weight: 600;">{p['caption']}</p>
          </div>
        </div>
        """

    html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} 施工実例（厳選20枚・プロ写真）｜株式会社住ま居る</title>
  <meta name="description" content="{title}の施工実例。{subtitle}。延床面積{floor_area}、間取り{layout}、耐震等級3、実測C値{c_val}、UA値{ua_val}。プロ撮影高精細WebP写真20枚とお施主様の声を全公開。" />
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
  <link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@700;800&family=Noto+Sans+JP:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css" />

  <style>
    body {{ background: #f8fafc; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans JP", sans-serif; line-height: 1.8; margin: 0; padding: 0; }}
    .case-container {{ max-width: 1180px; margin: 0 auto; padding: 0 1.2rem; }}
    .spec-table th {{ background: #f1f5f9; padding: 10px 14px; font-weight: 800; color: #334155; border: 1px solid #cbd5e1; width: 28%; }}
    .spec-table td {{ background: #ffffff; padding: 10px 14px; color: #0f172a; border: 1px solid #cbd5e1; font-weight: 600; }}
    .voice-box {{ background: #ffffff; border-radius: 12px; padding: 1.5rem; border: 2px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.04); }}
  </style>
</head>
<body>

  <!-- Header -->
  <header style="background: rgba(15,23,42,0.95); backdrop-filter: blur(10px); border-bottom: 2px solid #0284c7; padding: 0.8rem 1.5rem; position: sticky; top: 0; z-index: 100;">
    <div style="max-width: 1240px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <a href="/" style="text-decoration: none; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 1.4rem;">🏡</span>
        <span style="color: #ffffff; font-weight: 900; font-size: 1.15rem; letter-spacing: -0.5px;">株式会社住ま居る</span>
        <span style="color: #38bdf8; font-size: 0.82rem; font-weight: 700; background: rgba(56,189,248,0.15); padding: 2px 8px; border-radius: 4px;">施工実例ギャラリー</span>
      </a>
      <div style="display: flex; gap: 10px; align-items: center;">
        <a href="/#craftsmanship" style="color: #94a3b8; text-decoration: none; font-size: 0.85rem; font-weight: 700;">実例一覧へ戻る ↩</a>
        <a href="/#real-booking-section" style="background: linear-gradient(135deg, #059669, #10b981); color: #fff; padding: 7px 16px; border-radius: 6px; text-decoration: none; font-weight: 800; font-size: 0.85rem; box-shadow: 0 2px 8px rgba(16,185,129,0.3);">見学予約する ➜</a>
      </div>
    </div>
  </header>

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
        <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.3) 70%, transparent 100%); padding: 2rem 2rem 1.5rem; color: #fff;">
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
          お客様 × 大工職人 × 建築士の想い
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
            <div style="font-weight: 800; color: #047857; font-size: 0.85rem; margin-bottom: 4px;">📐 建築士の構造・温熱設計</div>
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

  <!-- Footer -->
  <footer style="background: #0f172a; border-top: 1px solid #334155; padding: 2rem 1.5rem; text-align: center; color: #94a3b8; font-size: 0.82rem;">
    <p style="margin: 0 0 0.5rem; color: #cbd5e1; font-weight: 700;">株式会社住ま居る ｜ 埼玉県知事許可（般－8）第60650号 ｜ 二級建築設計事務所</p>
    <p style="margin: 0;">〒350-2224 埼玉県鶴ヶ島市町屋176番地5 ｜ TEL: 049-271-2350</p>
  </footer>

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
    import re
    for c_id, c_data in all_cases_data.items():
        slug = c_data["slug"]
        photos = c_data["photos"]
        if not photos:
            continue
        first_thumb = photos[0]["thumb"]
        total_photos = len(photos)

        # 1. サムネイル画像パス置換
        # 例: <div class="case-overview-card" data-case="3" ...> ... <img src="..."
        card_re = re.compile(rf'(<div class="case-overview-card"[^>]*data-case="{c_id}"[^>]*>[\s\S]*?<div class="case-card-thumb"[^>]*>[\s\S]*?<img src=")([^"]+)("[\s\S]*?<span class="case-card-badge"[^>]*>)([^<]+)(</span>[\s\S]*?<div class="case-card-actions"[^>]*>[\s\S]*?<button class="case-card-btn"[^>]*>)([^<]+)(</button>)')
        
        def replace_card(m):
            prefix = m.group(1)
            # old_img = m.group(2)
            mid1 = m.group(3)
            # old_badge = m.group(4)
            mid2 = m.group(5)
            # old_btn = m.group(6)
            suffix = m.group(7)
            
            new_badge = f"📷 全{total_photos}枚"
            new_btn = f"詳細・実写真集 (全{total_photos}枚) ➜"
            return f"{prefix}{first_thumb}{mid1}{new_badge}{mid2}{new_btn}{suffix}"

        html = card_re.sub(replace_card, html)

        # 2. カードクリック時に個別ページへ飛べるように a タグまたは onclick を配備
        # onclick="location.href='/cases/{slug}.html'"
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
            photo_objs.append({
                "url": p["url"],
                "caption": p["caption"]
            })
        new_data[c_id] = {
            "title": f"【{title}】{m_info.get('subtitle', '')}",
            "sub": m_info.get("catch", ""),
            "client": m_info.get("client", ""),
            "carpenter": m_info.get("carpenter", ""),
            "architect": m_info.get("architect", ""),
            "photographer": "Nikon D4S / AF-S NIKKOR 14-24mm F2.8G ED「神レンズ」 / F16 パンフォーカス / 自然光実測",
            "photos": photo_objs
        }

    # caseStudiesData のオブジェクト部分を安全に置換
    json_str = json.dumps(new_data, ensure_ascii=False, indent=2)
    # const caseStudiesData = { ... };
    import re
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

    with open(MASTER_FILE, "r", encoding="utf-8") as f:
        master = json.load(f)

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
                caption = generate_caption(title, idx, len(webp_files), slug)
                photos.append({
                    "idx": idx,
                    "url": f"/images/cases/{slug}/{wf.name}",
                    "thumb": thumb_url,
                    "caption": caption
                })

        all_cases_data[c_id] = {
            "id": c_id,
            "slug": slug,
            "title": title,
            "photos": photos
        }

        # 個別詳細ページ生成
        page_html = build_case_detail_page(m_data, photos)
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
