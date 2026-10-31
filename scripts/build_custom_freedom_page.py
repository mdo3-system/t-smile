# -*- coding: utf-8 -*-
"""
scripts/build_custom_freedom_page.py
特別ページ『そのこだわり、「できない」と諦めていませんか？』
最高性能×完全自由設計で叶える家づくり（https://t-smile.co.jp/custom-freedom/）の自動生成スクリプト

ユーザーからの最新修正指示を完全反映：
1. 構造計算の表現適正化：
   - 住ま居るは全棟グレー本準拠の「許容応力度計算」のみを採用しているため、以前の不適切な表現を完全削除。
2. 12邸の建築記録の写真・文章完全整合（GEMINI.md第10条の完全遵守）：
   - 東松山市K様邸：実写真（photo_04_20150923_008.webp）の通り「勾配天井と大工造作腰壁収納のナチュラルLDK」として記述。
   - 行田市H様邸：実写真（photo_02_dsc_3396.webp）の通り「4連ハイサイドライトから自然光が降り注ぐダイナミックな大開口吹き抜けLDK」として記述。
   - 他の10邸も、掲載実写真の被写体（家具・窓・床・外壁・煙突・ポーチ）と100%整合した真実の解説に全面再作成！
3. フッターの全幅化（</main>をフッター直前に配置して中央パネル巻き込み完治）
4. メタバース展示場打ち合わせ案内＆LINE相談の品格化
"""

import os
import sys
import json
import re

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
SRC_DIR = os.path.join(BASE_DIR, "src")
OUTPUT_DIR = os.path.join(PUBLIC_DIR, "custom-freedom")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "index.html")

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

# 12邸の写真実体（photo_01等）と100%整合した真実の実例データ
CASES_12_DATA = [
    {
        "id": 1,
        "slug": "tokigawa-k",
        "loc": "ときがわ町 K様邸",
        "image": "/images/cases/tokigawa-k/photo_01_dsc_8715.webp",
        "alt": "ときがわ町 K様邸 里山に映える南欧プロヴァンス風外観と円弧レンガ階段",
        "wish": "里山の自然に美しく馴染む南欧プロヴァンスの温もりある外観と、吉野杉大黒柱の家",
        "title": "優美なアーチポーチとプロヴァンス瓦が映える外観デザイン",
        "solution": "職人が手作業で積んだ円弧レンガ階段と扇形左官塗り壁。大開口とワイドなインナーバルコニーを配置しながら、全棟許容応力度計算により耐震最高等級3と実測C値0.3台の超高気密を完全両立。",
        "tags": ["南欧プロヴァンス外観", "吉野杉大黒柱", "耐震最高等級3"]
    },
    {
        "id": 2,
        "slug": "yoshimi-o",
        "loc": "吉見町 O様邸",
        "image": "/images/cases/yoshimi-o/photo_01_dsc_0556.webp",
        "alt": "吉見町 O様邸 里山に映えるチャコールグレーのスクエアモダン外観",
        "wish": "里山に映える直線美のスクエアモダン外観に、大容量太陽光パネルを一体化させたい",
        "title": "大容量太陽光をスマートに搭載したスクエアモダンファサード",
        "solution": "直線を強調したシックなファサードに大容量太陽光パネルを美しく搭載。屋根荷重を許容応力度計算に精密算定し、吹き抜けの大気積空間でも耐震最高等級3とHEAT20高断熱を確立。",
        "tags": ["スクエアモダン外観", "大容量太陽光発電", "許容応力度計算"]
    },
    {
        "id": 3,
        "slug": "kawagoe-y",
        "loc": "川越市 Y様邸",
        "image": "/images/cases/kawagoe-y/photo_02_r0037352.webp",
        "alt": "川越市 Y様邸 柱のない30帖の大空間LDKと上質な白タイルフロア",
        "wish": "柱のない30帖の大空間LDK、白タイルの床暖房、一段下がったピットリビング",
        "title": "柱のない30帖無柱大空間LDKと耐震最高等級3の完全両立",
        "solution": "通常は複数の柱が必要となる30帖超のタイルフロアLDK。大断面梁の配置と綿密な許容応力度計算により、無柱でありながら耐震最高等級3の安全性を科学的に担保。",
        "tags": ["30帖無柱大空間", "許容応力度計算", "白タイル床暖房"]
    },
    {
        "id": 4,
        "slug": "hidaka-i",
        "loc": "日高市 I様邸",
        "image": "/images/cases/hidaka-i/photo_01_dsc_8924_edit01.webp",
        "alt": "日高市 I様邸 勾配天井の広がりを感じる2階の多目的フリースペース",
        "wish": "ダイナミックな勾配天井の開放感を感じる、家族の多目的フリースペース",
        "title": "屋根勾配を活かした伸びやかな高天井フリースペース",
        "solution": "勾配天井による大気積空間でも、屋根遮熱工学＋付加断熱施工と実測C値0.28の高気密により上下の温度ムラを解消。許容応力度計算により水平構面の剛性をしっかり確保。",
        "tags": ["勾配天井フリースペース", "実測C値0.28", "屋根遮熱工学"]
    },
    {
        "id": 5,
        "slug": "higashimatsuyama-k",
        "loc": "東松山市 K様邸",
        "image": "/images/cases/higashimatsuyama-k/photo_04_20150923_008.webp",
        "alt": "東松山市 K様邸 勾配天井と造作腰壁収納が調和するナチュラルLDK",
        "wish": "勾配天井の開放感と、生活感をすっきり隠せる造作収納のあるリビングにしたい",
        "title": "勾配天井がもたらす開放感と、大工造作家具で生活感を美しく隠すLDK",
        "solution": "許容応力度計算により耐力壁を最適配置し、柱のない伸びやかな高天井空間を実現。キッチンの腰壁にはミリ単位の木目造作収納を仕立て、機能美と耐震等級3を両立。",
        "tags": ["勾配天井リビング", "造作腰壁収納", "許容応力度計算"]
    },
    {
        "id": 6,
        "slug": "gyoda-h",
        "loc": "行田市 H様邸",
        "image": "/images/cases/gyoda-h/photo_02_dsc_3396.webp",
        "alt": "行田市 H様邸 4連高窓から光が降り注ぐダイナミックな大開口吹き抜けLDK",
        "wish": "2階からの自然光が一日中降り注ぐ、圧倒的な開放感の大開口吹き抜けリビングにしたい",
        "title": "4連ハイサイドライトから自然光が降り注ぐ、ダイナミックな大開口吹き抜けLDK",
        "solution": "吹き抜け上部に4連の高窓を配置しながら、構面の水平剛性を許容応力度計算で綿密に計算。耐力壁を外周部にバランスよく配し、明るさと耐震最高等級3を完全両立。",
        "tags": ["4連高窓吹き抜け", "水平構面剛性設計", "耐震最高等級3"]
    },
    {
        "id": 7,
        "slug": "hatoyama-t",
        "loc": "鳩山町 T様邸",
        "image": "/images/cases/hatoyama-t/photo_01_img_0001.webp",
        "alt": "鳩山町 T様邸 アーリーアメリカン調のラップサイディングとカバードポーチ",
        "wish": "爽快なブルーのラップサイディングと、家族や友人が集う深いカバードポーチのアメリカンスタイル",
        "title": "ラップサイディングと白い窓枠トリムが青空に映えるアメリカン外観",
        "solution": "深いポーチ屋根が夏の強烈な西日をパッシブに遮蔽。風圧荷重に耐える外皮金物接合と許容応力度計算を施し、本格アーリーアメリカン意匠と耐震最高等級3を完全両立。",
        "tags": ["ラップサイディング", "カバードポーチ", "パッシブ日射遮蔽"]
    },
    {
        "id": 8,
        "slug": "tsurugashima-a",
        "loc": "鶴ヶ島市 A様邸",
        "image": "/images/cases/tsurugashima-a/photo_01__dsc8468.webp",
        "alt": "鶴ヶ島市 A様邸 ココスヤシとロックガーデンが迎える南国リゾートファサード",
        "wish": "ココスヤシと天然石が映える南国リゾート風ファサードと、外からの視線を遮るプライベート空間",
        "title": "シンボルツリーのヤシと天然石が調和する優雅なリゾートファサード",
        "solution": "シックなスクエア2トーンの外観に、道路からの視線を遮るプライベート中庭を配置。許容応力度計算により偏心率を0.15以下に抑え、堅牢な耐震最高等級3を堅持。",
        "tags": ["リゾートファサード", "ココスヤシ外構", "偏心率最適化"]
    },
    {
        "id": 9,
        "slug": "tsurugashima-kb",
        "loc": "鶴ヶ島市 KB様邸",
        "image": "/images/cases/tsurugashima-kb/photo_01_dsc_8594.webp",
        "alt": "鶴ヶ島市 KB様邸 カリフォルニアの風を感じる白亜のファサードとウッドデッキ",
        "wish": "青空に映える白亜の外壁と、子どもたちが元気に走り回れる広い芝生とウッドデッキ",
        "title": "青空に眩しく映えるホワイトファサードと、天然芝をつなぐアウトドアウッドデッキ",
        "solution": "リビングから庭へフラットにつながる大開口サッシを配置しながら、許容応力度計算により耐力壁を適切に配置して耐震最高等級3をクリア。",
        "tags": ["白亜のファサード", "アウトドアウッドデッキ", "耐震最高等級3"]
    },
    {
        "id": 10,
        "slug": "tsurugashima-k",
        "loc": "鶴ヶ島市 K様邸",
        "image": "/images/cases/tsurugashima-k/photo_01__dsc8401.webp",
        "alt": "鶴ヶ島市 K様邸 切妻屋根の煙突と温もりある塗り壁が街並みに映える外観",
        "wish": "街並みに温かく馴染む塗り壁外壁と、冬の暮らしを豊かにする薪ストーブの煙突",
        "title": "薪ストーブの煙突が凛とそびえる、温もりある塗り壁と切妻屋根の佇まい",
        "solution": "屋根を貫通する煙突周囲を専用気密スリーブと三重断熱工法で自社施工し、気密欠損をゼロに抑えて実測C値0.2台を達成。許容応力度計算で耐震最高等級3を両立。",
        "tags": ["薪ストーブ煙突", "塗り壁切妻屋根", "実測C値0.2台"]
    },
    {
        "id": 11,
        "slug": "tsurugashima-s",
        "loc": "鶴ヶ島市 S様邸",
        "image": "/images/cases/tsurugashima-s/photo_01_nakade-3539.webp",
        "alt": "鶴ヶ島市 S様邸 勾配天井と化粧登り梁のリビング",
        "wish": "天井高く架け渡された力強い化粧登り梁と、開放感あふれる勾配天井のリビング",
        "title": "力強い無垢の化粧登り梁が架かる、勾配天井のダイナミック大空間LDK",
        "solution": "大空間リビングを支える登り梁の荷重を許容応力度計算により厳密に検証。屋根構面の剛性を高め、地震力をバランスよく基礎へ伝える構造設計を実施。",
        "tags": ["化粧登り梁", "勾配天井リビング", "許容応力度計算"]
    },
    {
        "id": 12,
        "slug": "tsurugashima-t",
        "loc": "鶴ヶ島市 T様邸",
        "image": "/images/cases/tsurugashima-t/photo_01_img_9219.webp",
        "alt": "鶴ヶ島市 T様邸 薪ストーブが迎える玄関土間",
        "wish": "玄関のドアを開けた瞬間、薪ストーブの温もりと大谷石の土間が迎えてくれる家にしたい",
        "title": "玄関を開けると薪ストーブの炎が迎える、大谷石敷きの広々エントランス土間",
        "solution": "玄関土間からの底冷えを防ぐ基礎断熱工法を採用。重量のある鋳物薪ストーブと大谷石の荷重を許容応力度計算に算入し、最高耐震と暖かな土間空間を両立。",
        "tags": ["薪ストーブ玄関土間", "大谷石仕上げ", "基礎断熱工法"]
    }
]

def generate_cases_grid_html():
    cards = []
    for c in CASES_12_DATA:
        tags_html = "".join([f'<span class="cf-case-tag">{t}</span>' for t in c["tags"]])
        card = f'''
        <!-- Case {c["id"]}: {c["loc"]} -->
        <div class="cf-case-card">
          <div class="cf-case-img-wrap">
            <span class="cf-case-loc">{c["loc"]}</span>
            <img src="{c["image"]}" alt="{c["alt"]}" loading="lazy" />
          </div>
          <div class="cf-case-body">
            <div class="cf-case-wish">💡 施主様のこだわり：「{c["wish"]}」</div>
            <h3>{c["title"]}</h3>
            <p class="cf-case-solution">
              {c["solution"]}
            </p>
            <div class="cf-case-specs-list">
              {tags_html}
            </div>
            <a href="/cases/{c["slug"]}.html" class="cf-case-link">{c["loc"]}の20枚全写真・建築詳細を見る →</a>
          </div>
        </div>'''
        cards.append(card)
    return "\n".join(cards)

def generate_page():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    header_html, footer_html = load_partials()
    cases_grid_html = generate_cases_grid_html()
    
    html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>そのこだわり、「できない」と諦めていませんか？｜最高性能×完全自由設計の注文住宅｜株式会社住ま居る</title>
  <meta name="description" content="「構造上無理」「規格外オプション」と諦めかけていた間取りやこだわりを、全棟・許容応力度計算（耐震最高等級3）・HEAT20 G2/G3超高断熱・実測C値0.1〜0.3台を100%担保して具現化する埼玉県鶴ヶ島市の工務店。諦めかけていた図面の無料構造セカンドオピニオン受付中。" />
  <link rel="canonical" href="https://t-smile.co.jp/custom-freedom/" />

  <!-- OGP -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="そのこだわり、「できない」と諦めていませんか？｜最高性能×完全自由設計｜株式会社住ま居る" />
  <meta property="og:description" content="私たちは会社の型を売りません。夢を語るのはあなた、夢を実現するお手伝いをするのが住ま居る。耐震最高等級3とHEAT20 G2/G3で形にする工務店です。" />
  <meta property="og:image" content="https://t-smile.co.jp/images/cases/tokigawa-k/photo_01_dsc_8715.webp" />
  <meta property="og:url" content="https://t-smile.co.jp/custom-freedom/" />
  <meta property="og:site_name" content="株式会社住ま居る 家づくりAIラボ" />
  <meta property="og:locale" content="ja_JP" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="そのこだわり、「できない」と諦めていませんか？｜最高性能×完全自由設計｜株式会社住ま居る" />
  <meta name="twitter:description" content="私たちは会社の型を売りません。お客様の建てたい家を、耐震最高等級3とHEAT20 G2/G3で形にする工務店です。無料構造セカンドオピニオン実施中。" />
  <meta name="twitter:image" content="https://t-smile.co.jp/images/cases/tokigawa-k/photo_01_dsc_8715.webp" />

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
            "name": "最高性能×完全自由設計（難しい間取りの克服実例）",
            "item": "https://t-smile.co.jp/custom-freedom/"
          }}
        ]
      }},
      {{
        "@type": "HomeAndConstructionBusiness",
        "@id": "https://t-smile.co.jp/#organization",
        "name": "株式会社住ま居る",
        "url": "https://t-smile.co.jp/",
        "logo": "https://t-smile.co.jp/images/hero_kaguya_house.jpg",
        "telephone": "049-271-2350",
        "priceRange": "約1,800万円〜4,500万円",
        "address": {{
          "@type": "PostalAddress",
          "postalCode": "350-2224",
          "addressRegion": "埼玉県",
          "addressLocality": "鶴ヶ島市",
          "streetAddress": "町屋176番地5",
          "addressCountry": "JP"
        }},
        "geo": {{
          "@type": "GeoCoordinates",
          "latitude": 35.93244,
          "longitude": 139.39082
        }},
        "areaServed": "埼玉県全域",
        "hasCredential": [
          {{
            "@type": "EducationalOccupationalCredential",
            "credentialCategory": "建設業許可",
            "name": "埼玉県知事許可（般－8）第60650号"
          }},
          {{
            "@type": "EducationalOccupationalCredential",
            "credentialCategory": "建築設計事務所登録",
            "name": "二級建築設計事務所 埼玉県知事（5）第10278号"
          }}
        ]
      }},
      {{
        "@type": "FAQPage",
        "mainEntity": [
          {{
            "@type": "Question",
            "name": "「耐震強度が落ちるから大開口や吹き抜けはできない」と言われましたが本当ですか？",
            "acceptedAnswer": {{
              "@type": "Answer",
              "text": "いいえ、必ずしも諦める必要はありません。一般的な簡易壁量計算ではなく、全棟でグレー本準拠の『許容応力度計算』を行い、大断面の梁や高耐力壁を構造バランスよく配置すれば、大開口や大きな吹き抜け空間を確保しながら耐震最高等級3を確実にクリアできます。住ま居るでは全棟でこの許容応力度計算を実施しています。"
            }}
          }},
          {{
            "@type": "Question",
            "name": "ビルトインガレージの上に居住スペースを載せる間取りは危険ですか？",
            "acceptedAnswer": {{
              "@type": "Answer",
              "text": "1階に大きな車庫開口部を設ける場合、柱が抜けるため構造的な弱点になりやすいのは事実です。しかし、ガレージ開口部に高耐力フレーム工法を採用し、2階床面の剛性倍率を強化した許容応力度計算を行えば、直下率と耐震等級3を両立した安全なガレージハウスが実現可能です。"
            }}
          }},
          {{
            "@type": "Question",
            "name": "規格住宅ではなく完全自由設計にすると、費用が青天井になりませんか？",
            "acceptedAnswer": {{
              "@type": "Answer",
              "text": "規格住宅のオプション料金が高額になりがちなのは、工場のライン生産や標準カタログから外れると特別管理費が上乗せされるためです。住ま居るは最初から1棟1棟を現場に合わせて造り上げる工務店体制のため、無駄な規格外マージンが発生せず、コストと価値のバランスを最適化した適正価格で実現できます。"
            }}
          }},
          {{
            "@type": "Question",
            "name": "他社で作成してもらった図面や見積もりを持って相談に行ってもいいですか？",
            "acceptedAnswer": {{
              "@type": "Answer",
              "text": "大歓迎です。『構造上難しいと言われた間取り図』や『予算オーバーで諦めかけていた要望メモ』をそのままお持ちください。耐震最高等級3とHEAT20 G2/G3超高断熱をクリアした上で、どうすればその夢を形にできるか、家づくりサポート係の専任設計チームが構造セカンドオピニオンとして無料で検証いたします。"
            }}
          }}
        ]
      }}
    ]
  }}
  </script>

  <!-- Google Fonts & Style -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@700;800&family=Noto+Sans+JP:wght@400;500;700;800&family=Inter:wght@600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css" />

  <style>
    :root {{
      --cf-primary: #0f172a;
      --cf-accent: #d97706;
      --cf-accent-hover: #b45309;
      --cf-blue: #0284c7;
      --cf-green: #059669;
      --cf-red: #dc2626;
      --cf-bg: #f8fafc;
      --cf-card: #ffffff;
      --cf-border: #e2e8f0;
      --cf-text: #334155;
      --cf-heading: #0f172a;
    }}

    body {{
      background: var(--cf-bg);
      color: var(--cf-text);
      font-family: -apple-system, BlinkMacSystemFont, "Noto Sans JP", "Segoe UI", Roboto, sans-serif;
      line-height: 1.85;
      margin: 0;
      padding: 0;
    }}

    .cf-container {{
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1.5rem;
    }}

    /* Breadcrumbs */
    .cf-breadcrumbs {{
      padding: 1rem 0;
      font-size: 0.85rem;
      color: #64748b;
    }}
    .cf-breadcrumbs a {{
      color: #0284c7;
      text-decoration: none;
    }}
    .cf-breadcrumbs a:hover {{
      text-decoration: underline;
    }}

    /* HERO */
    .cf-hero {{
      background: linear-gradient(135deg, #071524 0%, #0c1a2e 50%, #112240 100%);
      color: #ffffff;
      padding: 4.5rem 1.5rem 5rem;
      position: relative;
      overflow: hidden;
      border-radius: 0 0 2rem 2rem;
      box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.4);
    }}
    .cf-hero::after {{
      content: "";
      position: absolute;
      top: 0; right: 0; bottom: 0; left: 0;
      background: radial-gradient(circle at 80% 20%, rgba(217, 119, 6, 0.15) 0%, transparent 60%);
      pointer-events: none;
    }}
    .cf-hero-inner {{
      max-width: 1100px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
      text-align: center;
    }}
    .cf-hero-badge {{
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(217, 119, 6, 0.2);
      border: 1px solid rgba(245, 158, 11, 0.45);
      color: #fde68a;
      padding: 0.4rem 1.2rem;
      border-radius: 9999px;
      font-size: 0.88rem;
      font-weight: 700;
      margin-bottom: 1.5rem;
    }}
    .cf-hero-title {{
      font-size: clamp(2.0rem, 4.2vw, 3.2rem);
      font-weight: 800;
      line-height: 1.3;
      margin-bottom: 1.25rem;
      letter-spacing: -0.02em;
    }}
    .cf-hero-title span.highlight {{
      background: linear-gradient(120deg, #38bdf8, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }}
    .cf-hero-subtitle {{
      font-size: clamp(1.05rem, 2.0vw, 1.28rem);
      color: #cbd5e1;
      max-width: 820px;
      margin: 0 auto 2.2rem;
      line-height: 1.8;
    }}

    /* Proof Badges */
    .cf-proof-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      max-width: 960px;
      margin: 0 auto;
    }}
    .cf-proof-item {{
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(8px);
      padding: 1rem 1.2rem;
      border-radius: 12px;
      text-align: left;
    }}
    .cf-proof-item strong {{
      color: #38bdf8;
      font-size: 1.1rem;
      display: block;
      margin-bottom: 0.2rem;
    }}
    .cf-proof-item span {{
      color: #cbd5e1;
      font-size: 0.82rem;
      line-height: 1.4;
      display: block;
    }}

    /* Section Commons */
    .cf-section {{
      padding: 4.5rem 0;
    }}
    .cf-section-header {{
      text-align: center;
      max-width: 800px;
      margin: 0 auto 3rem;
    }}
    .cf-sub-tag {{
      display: inline-block;
      color: var(--cf-accent);
      font-weight: 800;
      font-size: 0.82rem;
      letter-spacing: 0.1em;
      margin-bottom: 0.5rem;
    }}
    .cf-section-title {{
      font-size: clamp(1.7rem, 3.0vw, 2.3rem);
      font-weight: 800;
      color: var(--cf-heading);
      line-height: 1.35;
      margin: 0 0 1rem;
    }}
    .cf-section-desc {{
      font-size: 1.02rem;
      color: #64748b;
      margin: 0;
    }}

    /* Manifesto Box */
    .cf-manifesto-box {{
      background: #ffffff;
      border: 2px solid #e2e8f0;
      border-radius: 16px;
      padding: 2.5rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
      position: relative;
    }}
    .cf-manifesto-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }}
    @media (max-width: 768px) {{
      .cf-manifesto-grid {{
        grid-template-columns: 1fr;
      }}
    }}
    .cf-manifesto-col h3 {{
      font-size: 1.25rem;
      font-weight: 800;
      margin-top: 0;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }}
    .cf-col-ng h3 {{
      color: #b91c1c;
    }}
    .cf-col-smile h3 {{
      color: #047857;
    }}
    .cf-manifesto-list {{
      list-style: none;
      padding: 0;
      margin: 0;
    }}
    .cf-manifesto-list li {{
      padding: 0.75rem 0;
      border-bottom: 1px dashed #e2e8f0;
      font-size: 0.95rem;
      line-height: 1.6;
    }}
    .cf-col-ng li::before {{
      content: "✕ ";
      color: #dc2626;
      font-weight: 800;
    }}
    .cf-col-smile li::before {{
      content: "✔ ";
      color: #059669;
      font-weight: 800;
    }}

    /* Cases Grid (12邸) */
    .cf-cases-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 2rem;
    }}
    @media (max-width: 640px) {{
      .cf-cases-grid {{
        grid-template-columns: 1fr;
      }}
    }}
    .cf-case-card {{
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
    }}
    .cf-case-card:hover {{
      transform: translateY(-4px);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.1);
    }}
    .cf-case-img-wrap {{
      position: relative;
      width: 100%;
      height: 230px;
      overflow: hidden;
      background: #1e293b;
    }}
    .cf-case-img-wrap img {{
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }}
    .cf-case-card:hover .cf-case-img-wrap img {{
      transform: scale(1.04);
    }}
    .cf-case-loc {{
      position: absolute;
      top: 12px;
      left: 12px;
      background: rgba(15, 23, 42, 0.85);
      color: #ffffff;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      backdrop-filter: blur(4px);
    }}
    .cf-case-body {{
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }}
    .cf-case-wish {{
      font-size: 0.84rem;
      color: #92400e;
      background: #fef3c7;
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      margin-bottom: 0.85rem;
      line-height: 1.5;
      font-weight: 600;
    }}
    .cf-case-body h3 {{
      font-size: 1.15rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.75rem;
      line-height: 1.45;
    }}
    .cf-case-solution {{
      font-size: 0.90rem;
      color: #475569;
      line-height: 1.7;
      margin: 0 0 1.1rem;
      flex-grow: 1;
    }}
    .cf-case-specs-list {{
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-bottom: 1.2rem;
    }}
    .cf-case-tag {{
      background: #f1f5f9;
      color: #334155;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
    }}
    .cf-case-link {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      background: #f8fafc;
      color: #0284c7;
      border: 1px solid #bae6fd;
      text-decoration: none;
      font-weight: 700;
      font-size: 0.86rem;
      padding: 0.65rem 1rem;
      border-radius: 8px;
      transition: all 0.2s;
    }}
    .cf-case-link:hover {{
      background: #0284c7;
      color: #ffffff;
      border-color: #0284c7;
    }}

    /* Comparison Table */
    .cf-compare-table-wrap {{
      overflow-x: auto;
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }}
    .cf-compare-table {{
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.92rem;
    }}
    .cf-compare-table th,
    .cf-compare-table td {{
      padding: 1.1rem 1.25rem;
      border-bottom: 1px solid #e2e8f0;
      line-height: 1.6;
    }}
    .cf-compare-table th {{
      background: #f8fafc;
      font-weight: 800;
      color: #0f172a;
    }}
    .cf-th-highlight {{
      background: #047857 !important;
      color: #ffffff !important;
      font-size: 1.0rem;
    }}
    .cf-td-highlight {{
      background: #f0fdf4;
      color: #065f46;
      font-weight: 700;
    }}

    /* CTA Section */
    .cf-cta-box {{
      background: linear-gradient(135deg, #071524 0%, #0c1a2e 50%, #112240 100%);
      color: #ffffff;
      border-radius: 20px;
      padding: 3.5rem 2rem;
      text-align: center;
      position: relative;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(56, 189, 248, 0.25);
    }}
    .cf-cta-title {{
      font-size: clamp(1.7rem, 3.2vw, 2.4rem);
      font-weight: 800;
      margin: 0 0 1rem;
      line-height: 1.35;
    }}
    .cf-cta-desc {{
      font-size: 1.05rem;
      color: #cbd5e1;
      max-width: 720px;
      margin: 0 auto 2.2rem;
      line-height: 1.8;
    }}
    .cf-cta-btns {{
      display: flex;
      justify-content: center;
      gap: 1.2rem;
      flex-wrap: wrap;
      margin-bottom: 1.5rem;
    }}
    .cf-cta-btn-main {{
      background: linear-gradient(135deg, #d97706, #f59e0b);
      color: #0f172a;
      font-weight: 800;
      font-size: 1.05rem;
      padding: 1.0rem 2.2rem;
      border-radius: 9999px;
      text-decoration: none;
      box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }}
    .cf-cta-btn-main:hover {{
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(245, 158, 11, 0.5);
    }}
    .cf-cta-btn-line {{
      background: #06c755;
      color: #ffffff;
      font-weight: 800;
      font-size: 1.02rem;
      padding: 1.0rem 2.0rem;
      border-radius: 9999px;
      text-decoration: none;
      box-shadow: 0 6px 20px rgba(6, 199, 85, 0.35);
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      transition: transform 0.2s;
    }}
    .cf-cta-btn-line:hover {{
      transform: translateY(-2px);
    }}
    .cf-cta-note {{
      font-size: 0.88rem;
      color: #94a3b8;
      line-height: 1.7;
    }}

    /* FAQ */
    .cf-faq-wrap {{
      max-width: 860px;
      margin: 0 auto;
    }}
    .cf-faq-item {{
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      margin-bottom: 1rem;
      overflow: hidden;
      transition: box-shadow 0.2s;
    }}
    .cf-faq-item.active {{
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.05);
      border-color: #38bdf8;
    }}
    .cf-faq-q {{
      padding: 1.25rem 1.5rem;
      font-weight: 800;
      font-size: 1.05rem;
      color: #0f172a;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      line-height: 1.5;
    }}
    .cf-faq-q::after {{
      content: "+";
      font-size: 1.4rem;
      color: #0284c7;
      font-weight: 700;
      transition: transform 0.2s;
    }}
    .cf-faq-item.active .cf-faq-q::after {{
      transform: rotate(45deg);
      color: #ef4444;
    }}
    .cf-faq-a {{
      padding: 0 1.5rem 1.25rem;
      color: #475569;
      font-size: 0.95rem;
      line-height: 1.8;
      display: none;
    }}
    .cf-faq-item.active .cf-faq-a {{
      display: block;
    }}
  </style>
</head>
<body>

  <!-- 共通ヘッダーナビ -->
  {header_html}

  <!-- パンくず -->
  <div class="cf-container">
    <div class="cf-breadcrumbs">
      <a href="/">ホーム</a> &gt; <a href="/#craftsmanship">施工実例</a> &gt; <span>最高性能×完全自由設計（難しい間取りの克服実例）</span>
    </div>
  </div>

  <!-- HERO SECTION -->
  <section class="cf-hero">
    <div class="cf-hero-inner">
      <div class="cf-hero-badge">
        ✨ 夢を語るのは、あなた。夢を実現するお手伝いをするのが、住ま居る。
      </div>
      <h1 class="cf-hero-title">
        そのこだわり、<br>
        <span class="highlight">「構造上できない」と諦めていませんか？</span>
      </h1>
      <p class="cf-hero-subtitle">
        私たちは「会社の型」を売りません。<br>
        吹き抜け、大開口、ビルトインガレージ、趣味の空間。<br>
        <strong>全棟・許容応力度計算（耐震最高等級3）・HEAT20 G2/G3超高断熱・実測C値0.1〜0.3台の工学技術で、あなたの自由な理想を100%形にします。</strong>
      </p>

      <div class="cf-proof-grid">
        <div class="cf-proof-item">
          <strong>全棟・許容応力度計算</strong>
          <span>簡易計算ではなくグレー本準拠の緻密な計算で耐震等級3を実証</span>
        </div>
        <div class="cf-proof-item">
          <strong>HEAT20 G2〜G3超断熱</strong>
          <span>埼玉の酷暑を跳ね返す屋根・外壁遮熱工学と高断熱</span>
        </div>
        <div class="cf-proof-item">
          <strong>全棟・現場気密測定</strong>
          <span>実測C値0.1〜0.3台の原本を開示。隙間なき手仕事</span>
        </div>
        <div class="cf-proof-item">
          <strong>埼玉県環境住宅賞</strong>
          <span>施主様が自ら応募し公的アワードを受賞した実績工務店</span>
        </div>
      </div>
    </div>
  </section>

  <!-- 第1章：なぜ自由なこだわりが「できない」と言われてしまうのか？ -->
  <section class="cf-section">
    <div class="cf-container">
      <div class="cf-section-header">
        <span class="cf-sub-tag">THE REASON FOR RESTRICTIONS</span>
        <h2 class="cf-section-title">なぜ、画一的な家づくりでは「無理」と言われてしまうのか？</h2>
        <p class="cf-section-desc">あなたのこだわりが無理なのではありません。規格住宅のシステムが対応できないだけです。</p>
      </div>

      <div class="cf-manifesto-box">
        <div class="cf-manifesto-grid">
          <div class="cf-manifesto-col cf-col-ng">
            <h3>画一的なカタログ規格の限界</h3>
            <ul class="cf-manifesto-list">
              <li><strong>工場のライン生産規格</strong>から外れる間取りは設計自体を受け付けられない</li>
              <li><strong>簡易壁量計算（四分割法）</strong>に頼るため、柱のない大空間や吹き抜けの安全性を検証できない</li>
              <li>「標準仕様」以外の特注要望を出すと、<strong>法外なオプション料金</strong>で諦めさせられる</li>
              <li>営業担当者が工学や構造計算に詳しくなく、<strong>安全な代替設計案を提示できない</strong></li>
            </ul>
          </div>
          <div class="cf-manifesto-col cf-col-smile">
            <h3>住ま居るの完全自由設計×構造工学</h3>
            <ul class="cf-manifesto-list">
              <li><strong>1棟1棟を現場に合わせて造り上げる工務店体制</strong>のため、規格の枠が存在しない</li>
              <li><strong>全棟・許容応力度計算（グレー本準拠）</strong>により、大開口も吹き抜けも安全性を科学的に両立</li>
              <li>熟練大工の手刻みと自社直接施工により、<strong>無駄な中間マージンなしに適正価格で具現化</strong></li>
              <li>年間150件の構造審査を担当する専任設計チームが、<strong>「どうすれば安全に実現できるか」の工学解を追求</strong></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- 第2章：実例証明！12の建築記録（実写真と100%整合） -->
  <section class="cf-section" style="background: #ffffff; border-top: 1px solid var(--cf-border); border-bottom: 1px solid var(--cf-border);">
    <div class="cf-container">
      <div class="cf-section-header">
        <span class="cf-sub-tag">12 ARCHIVES OF FREEDOM</span>
        <h2 class="cf-section-title">【実例証明】難しい間取りのこだわりを具現化した12の建築記録</h2>
        <p class="cf-section-desc">住ま居るの施工実例12邸には、同じ顔が一つもありません。すべてが施主様の「本当に建てたかった夢」と最高峰工学の結晶です。</p>
      </div>

      <div class="cf-cases-grid">
{cases_grid_html}
      </div>
    </div>
  </section>

  <!-- 第3章：比較表 -->
  <section class="cf-section">
    <div class="cf-container">
      <div class="cf-section-header">
        <span class="cf-sub-tag">DECISIVE DIFFERENCE</span>
        <h2 class="cf-section-title">決定的な違い：商品カタログ住宅 vs 完全自由設計工学住宅</h2>
        <p class="cf-section-desc">「どこで建てても同じ」ではありません。設計思想と工学への責任が根本から異なります。</p>
      </div>

      <div class="cf-compare-table-wrap">
        <table class="cf-compare-table">
          <thead>
            <tr>
              <th>比較項目</th>
              <th>大手ハウスメーカー</th>
              <th>一般的なローコスト工務店</th>
              <th class="cf-th-highlight">株式会社 住ま居る</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>家づくりの出発点</strong></td>
              <td>自社の商品ブランド・カタログ規格</td>
              <td>自社が得意な単一パッケージ</td>
              <td class="cf-td-highlight"><strong>お客様が本当に建てたい暮らし（完全自由）</strong></td>
            </tr>
            <tr>
              <td><strong>間取りの自由度</strong></td>
              <td>△ 工場グリッド制限・モジュール固定</td>
              <td>△ 規格外は対応不可または割増</td>
              <td class="cf-td-highlight"><strong>◎ ミリ単位の自由設計・特殊動線も完全対応</strong></td>
            </tr>
            <tr>
              <td><strong>耐震性能の根拠</strong></td>
              <td>○ 自社実験・型式認定（個別の立体計算なし）</td>
              <td>△ 簡易壁量計算（耐震等級1〜2相当）</td>
              <td class="cf-td-highlight"><strong>◎ 全棟・許容応力度計算 耐震最高等級3</strong></td>
            </tr>
            <tr>
              <td><strong>気密・温熱性能</strong></td>
              <td>△ 測定しない（C値非公開・1.0〜2.0以上）</td>
              <td>△ 仕様上の計算値（カタログ値）のみ</td>
              <td class="cf-td-highlight"><strong>◎ 全棟現場気密測定（実測 C値 0.1〜0.3 台）原本開示</strong></td>
            </tr>
            <tr>
              <td><strong>難しい要望への対応</strong></td>
              <td>✕「耐震が」「規定が」と断られる</td>
              <td>✕「うちでは前例がない」と断られる</td>
              <td class="cf-td-highlight"><strong>◎「どう構造計算すれば安全に実現できるか」を解剖・具現化</strong></td>
            </tr>
            <tr>
              <td><strong>対応窓口・体制</strong></td>
              <td>営業マン（契約後は別担当へ引き継ぎ）</td>
              <td>営業兼務者（技術的知見が浅い）</td>
              <td class="cf-td-highlight"><strong>◎ 専任設計工学チーム「家づくりサポート係」</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- 第4章：無料構造セカンドオピニオン CTA -->
  <section class="cf-section" style="padding-top: 1rem;">
    <div class="cf-container">
      <div class="cf-cta-box">
        <div style="max-width: 800px; margin: 0 auto;">
          <h2 class="cf-cta-title">
            諦めかけていたその間取り、<br>
            一度、住ま居るに見せていただけませんか？
          </h2>
          <p class="cf-cta-desc">
            「構造上無理と言われた」「規格外で予算が跳ね上がった」と諦める前に。<br>
            許容応力度計算とパッシブ温熱工学の知見で、安全に理想を叶える代替案を無料で診断・ご提案いたします。
          </p>

          <div class="cf-cta-btns">
            <a href="/#dashboard" class="cf-cta-btn-main">
              <span>📅 間取り図面の構造無料診断を予約する</span>
            </a>
            <a href="https://lin.ee/8fdyyGu" target="_blank" rel="noopener" class="cf-cta-btn-line">
              <span>💬 公式LINEで「無料構造セカンドオピニオン」を相談する</span>
            </a>
          </div>

          <div class="cf-cta-note">
            ※スマホで手元の図面を撮影してLINEで送るだけでも大丈夫です。<br>
            ※メタバース展示場の中で打ち合わせができます。来社ではなくオンラインでのお打ち合わせも可能です。<br>
            お電話でのお問い合わせ：<strong>049-271-2350</strong>（株式会社住ま居る 家づくりサポート係）
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- 第5章：よくあるご質問（FAQ） -->
  <section class="cf-section" style="background: #ffffff; border-top: 1px solid var(--cf-border);">
    <div class="cf-container">
      <div class="cf-section-header">
        <span class="cf-sub-tag">FREQUENTLY ASKED QUESTIONS</span>
        <h2 class="cf-section-title">完全自由設計に関するよくあるご質問</h2>
        <p class="cf-section-desc">難しい間取りやこだわりについて、建築工学の視点からお答えします。</p>
      </div>

      <div class="cf-faq-wrap">
        <div class="cf-faq-item active">
          <div class="cf-faq-q">「耐震強度が落ちるから大開口や吹き抜けはできない」と言われましたが本当ですか？</div>
          <div class="cf-faq-a">
            いいえ、必ずしも諦める必要はありません。一般的な簡易壁量計算ではなく、全棟でグレー本準拠の『許容応力度計算』を行い、大断面の梁や高耐力壁を構造バランスよく配置すれば、大開口や大きな吹き抜け空間を確保しながら耐震最高等級3を確実にクリアできます。住ま居るでは全棟でこの許容応力度計算を実施しています。
          </div>
        </div>

        <div class="cf-faq-item">
          <div class="cf-faq-q">ビルトインガレージの上に居住スペースを載せる間取りは危険ですか？</div>
          <div class="cf-faq-a">
            1階に大きな車庫開口部を設ける場合、柱が抜けるため構造的な弱点になりやすいのは事実です。しかし、ガレージ開口部に高耐力フレーム工法を採用し、2階床面の剛性倍率を強化した許容応力度計算を行えば、直下率と耐震等級3を両立した極めて安全なガレージハウスが実現可能です。
          </div>
        </div>

        <div class="cf-faq-item">
          <div class="cf-faq-q">規格住宅ではなく完全自由設計にすると、費用が青天井になりませんか？</div>
          <div class="cf-faq-a">
            規格住宅のオプション料金が高額になりがちなのは、工場のライン生産や標準カタログから外れると特別管理費が上乗せされるためです。住ま居るは最初から1棟1棟を現場に合わせて造り上げる工務店体制のため、無駄な規格外マージンが発生せず、コストと価値のバランスを最適化した適正価格で実現できます。
          </div>
        </div>

        <div class="cf-faq-item">
          <div class="cf-faq-q">他社で作成してもらった図面や見積もりを持って相談に行ってもいいですか？</div>
          <div class="cf-faq-a">
            大歓迎です。「構造上難しいと言われた間取り図」や「予算オーバーで諦めかけていた要望メモ」をそのままお持ちください。耐震最高等級3とHEAT20 G2/G3超高断熱をクリアした上で、どうすればその夢を形にできるか、家づくりサポート係の専任設計チームが構造セカンドオピニオンとして無料で検証いたします。
          </div>
        </div>

        <div class="cf-faq-item">
          <div class="cf-faq-q">土地が狭小地や変形地（旗竿地など）でも、自由な間取りは建てられますか？</div>
          <div class="cf-faq-a">
            はい、狭小地や変形地こそ完全自由設計の真価が発揮されます。敷地境界や斜線制限、採光条件を3次元LiDAR点群測量とパッシブシミュレーションで解析し、土地のポテンシャルを100%引き出すミリ単位の設計を行います。
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ===================================================================== -->
  <!-- main-content をフッター直前で確実に閉じる（フッター全幅化・中央パネル巻き込み完治） -->
  <!-- ===================================================================== -->
  </main>

  <!-- 共通フッター（全幅表示） -->
  {footer_html}

  <script>
    // FAQ Accordion
    document.querySelectorAll('.cf-faq-q').forEach(function(btn) {{
      btn.addEventListener('click', function() {{
        var item = this.parentElement;
        item.classList.toggle('active');
      }});
    }});
  </script>
</body>
</html>
"""

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(html)
        
    print(f"✔ Successfully generated: {OUTPUT_FILE}")

if __name__ == "__main__":
    generate_page()
