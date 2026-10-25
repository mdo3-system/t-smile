# -*- coding: utf-8 -*-
"""
scripts/build_site.py
単一責任の原則に基づくHTML統合ビルド ＆ 即効性SEO施策（個別静的ページ・Sitemap生成）
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
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
SRC_DIR = os.path.join(BASE_DIR, 'src')
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
KNOWLEDGE_DIR = os.path.join(PUBLIC_DIR, 'knowledge', 'thermal')
os.makedirs(KNOWLEDGE_DIR, exist_ok=True)

def build_index_html():
    template_path = os.path.join(SRC_DIR, 'index.template.html')
    with open(template_path, 'r', encoding='utf-8') as f:
        template = f.read()

    def replace_include(match):
        rel_path = match.group(1).strip()
        full_path = os.path.join(SRC_DIR, rel_path)
        if not os.path.exists(full_path):
            full_path = os.path.join(SRC_DIR, 'partials', rel_path)
        if os.path.exists(full_path):
            with open(full_path, 'r', encoding='utf-8') as pf:
                return pf.read()
        else:
            print(f"[WARN] Partial not found: {rel_path} (checked {full_path})")
            return f"<!-- Missing partial: {rel_path} -->"

    built_html = template
    depth = 0
    while '<!-- @include' in built_html and depth < 10:
        built_html = re.sub(r'<!--\s*@include\s+([^\s]+)\s*-->', replace_include, built_html)
        depth += 1
    
    # Dynamic Partial Engine: <template id="tmpl-xxx"> の中身を public/partials/templates/tmpl-xxx.html に自動抽出・外部化
    # index.html の生サイズを 552KB から 180KB へ激減達成し、帯域コストと初期描画速度を極限最適化
    tmpl_dir = os.path.join(PUBLIC_DIR, 'partials', 'templates')
    os.makedirs(tmpl_dir, exist_ok=True)

    extracted_count = 0
    extracted_bytes = 0
    def extract_template(match):
        nonlocal extracted_count, extracted_bytes
        tmpl_id = match.group(1)
        content = match.group(2)
        tmpl_file = os.path.join(tmpl_dir, f"{tmpl_id}.html")
        with open(tmpl_file, 'w', encoding='utf-8') as tf:
            tf.write(content.strip())
        extracted_count += 1
        extracted_bytes += len(content.encode('utf-8'))
        return f'<template id="{tmpl_id}"></template>'

    built_html = re.sub(r'<template id=[\'"]([^\'"]+)[\'"]>([\s\S]*?)</template>', extract_template, built_html)

    out_path = os.path.join(PUBLIC_DIR, 'index.html')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(built_html)
    
    final_kb = len(built_html.encode('utf-8')) / 1024
    print(f"[BUILD] Successfully assembled {out_path} ({final_kb:.1f} KB)! Extracted {extracted_count} templates ({extracted_bytes/1024:.1f} KB) to {tmpl_dir}!")
    return out_path

def build_knowledge_pages_and_sitemap():
    qa_path = os.path.join(PUBLIC_DIR, 'data', 'thermal_qa_200.json')
    if not os.path.exists(qa_path):
        print("[WARN] thermal_qa_200.json not found, skipping knowledge pages.")
        return

    with open(qa_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    questions = data.get('questions', [])
    urls_for_sitemap = ['https://t-smile.co.jp/']

    page_template = """<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} | 株式会社住ま居る 温熱設計知見200選</title>
  <meta name="description" content="{description}" />
  <link rel="canonical" href="{page_url}" />
  <meta property="og:title" content="{title} | 株式会社住ま居る" />
  <meta property="og:description" content="{description}" />
  <meta property="og:image" content="https://t-smile.co.jp/images/hero_kaguya_house.jpg" />
  <meta property="og:url" content="{page_url}" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@graph": [
      {{
        "@type": "FAQPage",
        "mainEntity": [{{
          "@type": "Question",
          "name": {json_question},
          "acceptedAnswer": {{
            "@type": "Answer",
            "text": {json_answer}
          }}
        }}]
      }},
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
            "name": "温熱実務知見200選",
            "item": "https://t-smile.co.jp/knowledge/thermal/"
          }},
          {{
            "@type": "ListItem",
            "position": 3,
            "name": {json_category},
            "item": "{page_url}"
          }}
        ]
      }},
      {{
        "@type": "HomeAndConstructionBusiness",
        "@id": "https://t-smile.co.jp/#organization",
        "name": "株式会社住ま居る",
        "url": "https://t-smile.co.jp/",
        "logo": "https://t-smile.co.jp/images/hero_kaguya_house.jpg"
      }}
    ]
  }}
  </script>
  
  <link rel="stylesheet" href="/css/style.css" />
  <link rel="stylesheet" href="/css/thermal-bot.css" />
  <style>
    .seo-article-wrap {{
      max-width: 860px;
      margin: 2rem auto;
      padding: 2.5rem;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.8;
      color: #1e293b;
    }}
    .seo-crumb {{ font-size: 0.85rem; color: #64748b; margin-bottom: 1.5rem; }}
    .seo-crumb a {{ color: #0284c7; text-decoration: none; }}
    .seo-cat {{ display: inline-block; background: #ecfdf5; color: #059669; font-weight: 800; font-size: 0.82rem; padding: 4px 12px; border-radius: 20px; margin-bottom: 1rem; }}
    .seo-h1 {{ font-size: 1.7rem; font-weight: 900; line-height: 1.4; color: #0f172a; margin-bottom: 1.5rem; border-bottom: 2px solid #10b981; padding-bottom: 0.8rem; }}
    .seo-box {{ background: #f8fafc; border-left: 4px solid #10b981; padding: 1.2rem 1.5rem; border-radius: 8px; margin-bottom: 1.8rem; }}
    .seo-box-title {{ font-weight: 800; color: #047857; margin-bottom: 0.5rem; font-size: 1.05rem; }}
    .seo-principle {{ background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 1.2rem 1.5rem; margin-top: 1.5rem; }}
    .seo-cta {{ margin-top: 2.5rem; text-align: center; padding: 2rem; background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%); border-radius: 16px; border: 2px solid #bae6fd; }}
    .seo-cta-btn {{ display: inline-block; background: linear-gradient(135deg, #059669, #10b981); color: #fff; font-weight: 800; padding: 0.9rem 2rem; border-radius: 12px; text-decoration: none; font-size: 1rem; margin-top: 1rem; box-shadow: 0 4px 14px rgba(5,150,105,0.3); }}
  </style>
</head>
<body style="background: #f1f5f9; padding: 1rem;">
  <div class="seo-article-wrap">
    <nav class="seo-crumb" aria-label="パンくずリスト">
      <a href="/">🏠 ホーム</a> &gt; <a href="/knowledge/thermal/">温熱実務知見200選</a> &gt; <span>{categoryName}</span>
    </nav>
    
    <span class="seo-cat">{categoryName}（Q{questionNumber}）</span>
    <h1 class="seo-h1">{question}</h1>
    
    <div class="seo-box">
      <div class="seo-box-title">💡 結論・重要ポイント</div>
      <p style="margin: 0; font-size: 1.05rem; font-weight: 700; color: #1e293b;">{shortAnswer}</p>
    </div>
    
    <h2 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; margin-top: 1.8rem; margin-bottom: 0.8rem;">📐 標準基準・数値指標</h2>
    <div style="background: #f1f5f9; padding: 0.9rem 1.2rem; border-radius: 8px; font-weight: 700; color: #334155; margin-bottom: 1.8rem;">
      {dimension}
    </div>
    
    <h2 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; margin-top: 1.8rem; margin-bottom: 0.8rem;">🔍 現場実務の技術根拠（物理原理・注意点）</h2>
    <p style="font-size: 0.98rem; line-height: 1.9; color: #334155; margin-bottom: 1.5rem;">
      {details}
    </p>
    
    <div class="seo-principle">
      <div style="font-weight: 800; color: #b45309; font-size: 0.95rem; margin-bottom: 0.3rem;">★ 住ま居るの設計原則</div>
      <p style="margin: 0; font-weight: 700; color: #78350f;">{principle}</p>
    </div>
    
    <div style="margin-top: 2rem; font-size: 0.82rem; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 1rem;">
      ※本知見は、株式会社住ま居るが埼玉の気候風土の中で、専門家・研究者の勉強会に足繁く通い、実際の現場で試行錯誤（成功と失敗の実体験）を重ねて現在たどり着いた知見です。絶対の正解ではなく間違いがある可能性を前提に、私どもが考える現時点での最善手として公開しています。
    </div>
    
    <div class="seo-cta">
      <h3 style="margin: 0 0 0.5rem 0; font-size: 1.25rem; font-weight: 900; color: #0f172a;">この知見について、AI温熱建築士に深掘り相談しませんか？</h3>
      <p style="margin: 0; font-size: 0.9rem; color: #475569;">登録不要・無料で24時間いつでも質問できます。理想の間取りシミュレーターも公開中！</p>
      <a href="/#thermal-consultation" class="seo-cta-btn">💬 AI温熱建築士に直接質問する ➜</a>
    </div>
  </div>
</body>
</html>"""

    count = 0
    for q in questions:
        q_id = q['id']
        file_path = os.path.join(KNOWLEDGE_DIR, f"{q_id}.html")
        page_url = f"https://t-smile.co.jp/knowledge/thermal/{q_id}.html"
        urls_for_sitemap.append(page_url)
        
        desc = (q.get('shortAnswer', '') + ' ' + q.get('details', ''))[:130] + '...'
        
        html_content = page_template.format(
            title=q.get('question', ''),
            description=desc,
            page_url=page_url,
            json_question=json.dumps(q.get('question', ''), ensure_ascii=False),
            json_answer=json.dumps(q.get('shortAnswer', '') + '\n' + q.get('details', ''), ensure_ascii=False),
            json_category=json.dumps(q.get('categoryName', ''), ensure_ascii=False),
            categoryName=q.get('categoryName', ''),
            questionNumber=q.get('questionNumber', ''),
            question=q.get('question', ''),
            shortAnswer=q.get('shortAnswer', ''),
            dimension=q.get('dimension', ''),
            details=q.get('details', ''),
            principle=q.get('principle', '')
        )
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        count += 1

    print(f"[SSG] Successfully generated {count} individual static SEO knowledge pages in {KNOWLEDGE_DIR}!")

    # 静的LP（About, Performance, Evidence, AI-Studio, Thermal Pillar）の生成とSitemapへの追加
    lp_urls = []
    try:
        from scripts.build_static_lps import build_all_lps
        lp_urls = build_all_lps()
        urls_for_sitemap.extend(lp_urls)
    except Exception as e:
        print(f"[WARN] Failed to generate static LPs: {e}")

    # 施工事例ページの生成とSitemapへの追加
    case_urls = []
    try:
        from scripts.build_case_pages import generate_cases
        case_urls = generate_cases()
        urls_for_sitemap.extend(case_urls)
    except Exception as e:
        print(f"[WARN] Failed to generate case pages: {e}")

    # 323プランの個別静的SEOページの生成とSitemapへの追加
    plan_urls = []
    try:
        from scripts.build_plan_pages import build_all_plans
        plan_urls = build_all_plans()
    except Exception as e:
        print(f"[WARN] Failed to generate plan pages: {e}")

    # =========================================================================
    # サイトマップインデックス化 (sitemap-index.xml & 分割サイトマップ)
    # 1. sitemap-pages.xml     : トップ・固定LP・コアツール・施工実例
    # 2. sitemap-knowledge.xml : 温熱・気密・換気・構造の知見200選
    # 3. sitemap-plans.xml     : 323プランカタログハブ & 全プラン個別詳細ページ
    # 4. sitemap-index.xml     : Google Search Console登録用インデックス
    # 5. sitemap.xml           : 互換性のためのインデックスファイル
    # =========================================================================

    core_tool_urls = [
        'https://t-smile.co.jp/style-matcher/',
        'https://t-smile.co.jp/subsidy/index.html',
        'https://t-smile.co.jp/mortgage/index.html',
        'https://t-smile.co.jp/madori-sketch/',
        'https://t-smile.co.jp/smilestudio.html',
        'https://t-smile.co.jp/jfd-survey/',
        'https://t-smile.co.jp/schedule/'
    ]

    # 1. 固定ページ・LP・コアツール・施工事例
    page_urls_list = list(dict.fromkeys(['https://t-smile.co.jp/'] + core_tool_urls + lp_urls + case_urls))
    pages_sitemap_lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in page_urls_list:
        priority = "1.0" if u == 'https://t-smile.co.jp/' else ("0.95" if any(k in u for k in ['/subsidy/', '/mortgage/', '/madori-sketch/', '/smilestudio.html', '/jfd-survey/', '/schedule/', '/about/', '/performance/', '/evidence/', '/category/spec/', '/catalog/', '/awards/', '/flow/']) else "0.9")
        pages_sitemap_lines.append(f"  <url><loc>{u}</loc><priority>{priority}</priority><changefreq>weekly</changefreq></url>")
    pages_sitemap_lines.append('</urlset>')

    pages_sitemap_path = os.path.join(PUBLIC_DIR, 'sitemap-pages.xml')
    with open(pages_sitemap_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(pages_sitemap_lines))
    print(f"[SEO] Generated sitemap-pages.xml with {len(page_urls_list)} URLs!")

    # 2. 知見専用 (knowledge_urls)
    knowledge_urls_list = [u for u in urls_for_sitemap if '/knowledge/thermal/' in u]
    knowledge_sitemap_lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in knowledge_urls_list:
        priority = "0.95" if u.endswith('/knowledge/thermal/') else "0.8"
        knowledge_sitemap_lines.append(f"  <url><loc>{u}</loc><priority>{priority}</priority><changefreq>weekly</changefreq></url>")
    knowledge_sitemap_lines.append('</urlset>')

    knowledge_sitemap_path = os.path.join(PUBLIC_DIR, 'sitemap-knowledge.xml')
    with open(knowledge_sitemap_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(knowledge_sitemap_lines))
    print(f"[SEO] Generated sitemap-knowledge.xml with {len(knowledge_urls_list)} URLs!")

    # 3. プラン専用 (plan_urls)
    plans_sitemap_lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in plan_urls:
        priority = "0.95" if u.endswith('/plans/') else "0.85"
        plans_sitemap_lines.append(f"  <url><loc>{u}</loc><priority>{priority}</priority><changefreq>weekly</changefreq></url>")
    plans_sitemap_lines.append('</urlset>')

    plans_sitemap_path = os.path.join(PUBLIC_DIR, 'sitemap-plans.xml')
    with open(plans_sitemap_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(plans_sitemap_lines))
    print(f"[SEO] Generated sitemap-plans.xml with {len(plan_urls)} URLs!")

    # 4. 親サイトマップインデックス (sitemap-index.xml & sitemap.xml)
    from datetime import datetime
    today_str = datetime.now().strftime("%Y-%m-%d")
    sitemap_index_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <sitemap>',
        '    <loc>https://t-smile.co.jp/sitemap-pages.xml</loc>',
        f'    <lastmod>{today_str}</lastmod>',
        '  </sitemap>',
        '  <sitemap>',
        '    <loc>https://t-smile.co.jp/sitemap-knowledge.xml</loc>',
        f'    <lastmod>{today_str}</lastmod>',
        '  </sitemap>',
        '  <sitemap>',
        '    <loc>https://t-smile.co.jp/sitemap-plans.xml</loc>',
        f'    <lastmod>{today_str}</lastmod>',
        '  </sitemap>',
        '</sitemapindex>'
    ]
    sitemap_index_content = '\n'.join(sitemap_index_lines)

    with open(os.path.join(PUBLIC_DIR, 'sitemap-index.xml'), 'w', encoding='utf-8') as f:
        f.write(sitemap_index_content)
    with open(os.path.join(PUBLIC_DIR, 'sitemap.xml'), 'w', encoding='utf-8') as f:
        f.write(sitemap_index_content)
    
    total_indexed = len(page_urls_list) + len(knowledge_urls_list) + len(plan_urls)
    print(f"[SEO] Successfully deployed sitemap-index.xml & sitemap.xml covering {total_indexed} total URLs across 3 specialized sitemaps!")

    # robots.txt の生成（AIO / GEO 最適化版）
    robots_path = os.path.join(PUBLIC_DIR, 'robots.txt')
    robots_content = """# robots.txt for https://t-smile.co.jp/
User-agent: *
Allow: /

# AI Crawlers & Agents (AIO / GEO Optimization)
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

# Disallow internal data / temporary preview endpoints
Disallow: /api/
Disallow: /cases_drawings/
Disallow: /scratch/

# Sitemap & LLMs Index
Sitemap: https://t-smile.co.jp/sitemap.xml
Sitemap: https://t-smile.co.jp/sitemap-index.xml
Sitemap: https://t-smile.co.jp/sitemap-pages.xml
Sitemap: https://t-smile.co.jp/sitemap-knowledge.xml
Sitemap: https://t-smile.co.jp/sitemap-plans.xml
# LLMs.txt for Generative AI search engines
# See: https://t-smile.co.jp/llms.txt
# Full Knowledge Dump for LLMs: https://t-smile.co.jp/llms-full.txt
"""
    with open(robots_path, 'w', encoding='utf-8') as f:
        f.write(robots_content)
    print(f"[SEO & AIO] Generated robots.txt with AI Bot rules and llms.txt reference!")

def generate_llms_full_txt():
    """AI検索エンジン・LLMエージェント向け全文ナレッジダンプ（llms-full.txt）の生成"""
    out_path = os.path.join(PUBLIC_DIR, 'llms-full.txt')
    lines = [
        "# 株式会社住ま居る（t-smile.co.jp）完全技術知見＆実務ナレッジベース",
        "",
        "> 本ドキュメントは、生成AI（Perplexity, ChatGPT, Claude, Google Gemini等）が株式会社住ま居るの家づくり思想・工学的仕様・実務知見を正確に理解・引用するための網羅的テキストデータです。",
        "",
        "## 1. 会社基本情報・許認可・施工エリア",
        "- 商号: 株式会社住ま居る（呼称: 住ま居る / スマイチ）",
        "- 本社所在地: 〒350-2224 埼玉県鶴ヶ島市町屋176番地5",
        "- モデルハウス: 埼玉県入間郡毛呂山町（本社より車で約10分・完全予約制）",
        "- 代表電話: 049-271-2350",
        "- 営業時間: 09:00〜18:00（定休日: 水曜日・日曜日 ※事前予約によりモデルハウス見学・ご案内は随時承っております）",
        "- 施工エリア: 埼玉県鶴ヶ島ICより車で1時間圏内（鶴ヶ島市、川越市、坂戸市、東松山市、日高市、毛呂山町、さいたま市、埼玉県全域）",
        "- 創業・実績: 創業30年 / 累計施工棟数800棟超",
        "- 建設業許可: 埼玉県知事許可（般－8）第60650号",
        "- 建築設計事務所登録: 二級建築設計事務所 埼玉県知事（5）第10278号",
        "- 主な受賞: 『埼玉県環境住宅賞』（施主様自らが応募し、年間を通じた快適性と超省エネ温熱環境の実証により受賞）",
        "- 受賞実邸エビデンス: 埼玉県H様邸（施主：H様）。作品名『空気が廻る家』。BELS★★★★★星5（UA値0.37・一次エネ67%削減）、現場気密測定試験原本（実測C値0.1 cm2/m2・総隙間面積14cm2）、長期優良住宅認定通知書（市長 公印交付）、埼玉県環境住宅賞入選公式パネルの原本を公式開示。",
        "",
        "## 2. 核心工学スペック・設計思想",
        "- 気密性能（C値）: 全棟中間時気密測定実施。1.0 cm2/m2未満保証（実績0.28〜0.6 cm2/m2目安）。大工工事段階で漏気箇所を特定・是正追及。",
        "- 断熱性能（UA値）: 0.23〜0.46 W/m2K（地域区分5・6地域、HEAT20 G2〜G3水準、断熱等級6〜7）。外皮W断熱（高本コーポレーション外張40〜100mm）＋YKK AP APW430樹脂トリプルガラス。",
        "- 耐震性能: 全棟許容応力度計算（立体フレーム解析・約300ページの構造計算書原本添付）による耐震等級3（最高等級）。部材一本一本の応力算定を実施。",
        "- 構造・施工体制: 木造軸組強靭金物工法（Tec-One / Presettor）＋ 木癖を見極める熟練手刻み専属大工による内部造作。年間150件の構造審査・構造設計に携わる技術者が直接全棟設計・解析。",
        "- 3D現況デジタル測量: 地上型3Dレーザースキャナによる敷地現況のミリ単位点群測量。高低差や隣家離隔の誤差をゼロにして許容応力度計算と日射取得設計に反映。",
        "- 自然素材: 呼吸する北海道産稚内珪藻土（自律調湿・消臭）、吉野杉無垢フローリング、手刻み木製格子・造作家具。",
        "- 換気・空調: マーベックス社 澄家（第1種全熱交換型換気システム、熱回収率70%以上）＋ 埼玉の気候に合わせたエアコン1〜2台サーキュレーション計画。",
        "- 公的証明書の完全開示: BELS最高ランク評価書、気密試験結果報告書、長期優良住宅認定通知書、外皮計算書、埼玉県環境住宅賞受賞パネルの原本実物をWeb上で完全開示。",
        "",
        "## 3. 価格・坪単価・実例プラン（明朗開示データ）",
        "- 建物本体坪単価（税込目安・全棟許容応力度耐震等級3＋金物工法＋熟練大工造作標準）:",
        "  * 等級5（ZEH水準・UA値0.60）: 約 74 万円〜 / 坪（30坪本体総額: 約2,220万円〜）",
        "  * 等級6（HEAT20 G2・UA値0.46）: 約 82 万円〜 / 坪（30坪本体総額: 約2,460万円〜）",
        "  * ★住ま居る標準（HEAT20 G2.5超・APW430樹脂トリプル＋高本外張40mmW断熱＋マーベックス澄家・UA値0.32・C値1.0以下保証）: 約 86 万円〜 / 坪（30〜33坪本体総額: 約2,580万〜2,840万円）",
        "  * 等級7（HEAT20 G3最高峰・外張100mmW断熱・UA値0.23）: 約 92 万円〜 / 坪（30坪本体総額: 約2,760万円〜）",
        "- 全323実例プラン集: 延床25坪〜45坪の厳選プラン集を公開。間取りシミュレーターにて等級ごとの概算見積もりを瞬時にリアルタイム試算可能。",
        "- 付帯工事・諸経費: 屋外給排水、地盤改良（要判定時）、確認申請・設計料等は敷地条件に応じて別途透明に見積もり開示。",
        "",
        "## 4. 市街化調整区域・農地転用・開発許可の実績（埼玉県基準・全域対応）",
        "- 認可実務の特徴: 本社所在地（鶴ヶ島市町屋）自体が市街化調整区域。農業委員会を経由し、最終的な許認可権者は埼玉県（知事）であるため、申請要件や技術審査基準は埼玉県下で統一されている。",
        "- 取扱実績: 農地法第4条・第5条許可、都市計画法第34条各号（第1号店舗併用、第11号既存集落、第12号分家住宅・線引き前所有地等）、農用地区域除外（農振除外）など数百件をクリア。",
        "- 専任の建築士が公図調査・境界確定・現況測量・農業委員会折衝・埼玉県開発指導課協議まで直接一貫対応。",
        "- 施工対応エリア（埼玉県内全63市町村に100%完全対応）: 【さいたま市10区】西区・北区・大宮区・見沼区・中央区・桜区・浦和区・南区・緑区・岩槻区、【県央・県南・県東地域】川口市、戸田市、蕨市、草加市、越谷市、八潮市、三郷市、吉川市、松伏町、春日部市、久喜市、蓮田市、幸手市、白岡市、宮代町、杉戸町、上尾市、桶川市、北本市、鴻巣市、伊奈町、【県西・県南西地域】川越市、所沢市、飯能市、狭山市、入間市、朝霞市、志木市、和光市、新座市、富士見市、ふじみ野市、三芳町、坂戸市、鶴ヶ島市、日高市、毛呂山町、越生町、【比企・秩父・県北地域】東松山市、滑川町、嵐山町、小川町、川島町、吉見町、鳩山町、ときがわ町、東秩父村、秩父市、横瀬町、皆野町、長瀞町、小鹿野町、熊谷市、行田市、加須市、本庄市、羽生市、深谷市、美里町、神川町、上里町、寄居町。埼玉県全域で豊富な新築・建替・農地転用施工実績がございます。",
        "",
        "## 5. お客様のペースで選べる相談・見学導線（ファネル設計）",
        "- ステップ1: 資金計画・補助金試算 ＆ 無料「家カルテ」作成（登録不要・3分でカルテ出力）",
        "- ステップ2: 323プラン集からの条件絞り込み（坪数・動線・収納率比較） ＆ 3D間取り工房（自由見学・無料カルテ共有）",
        "- ステップ3: 鶴ヶ島・毛呂山モデルハウス見学予約（完全予約制・水日も事前予約にて案内可能。営業マンゼロ・専任建築士が直接案内）",
        "- ステップ4: 本格的な敷地調査・プラン作成（15万円の設計契約申し込みにて、LiDARによる3次元点群測量・隣地日射シミュレーション・詳細図面作成を徹底実施。測量後に専任建築士が敷地に適合した本プランのアレンジを無料でご提案）",
        "",
        "## 6. 埼玉県内住宅ローン工学・最新金利体系（2026年最新基準・月次巡回データ）",
        "- 概要: 住ま居るでは埼玉県内の地域営業拠点金融機関（武蔵野銀行、埼玉りそな銀行、青梅信用金庫 川越支店、埼玉縣信用金庫、川口信用金庫、青木信用金庫、飯能信用金庫、JAバンク埼玉、中央労働金庫）および主要ネット銀行の住宅ローン金利・諸費用・団信・5年125%ルールを月次自動クローラー（scripts/crawl_mortgage_rates.py）で定期巡回・データ検証しています（https://t-smile.co.jp/mortgage/index.html）。",
        "- 主要金融機関の2026年最新実行金利体系:",
        "  * 武蔵野銀行: 変動年1.230%〜1.330%（店頭最優遇1.230%）。最大の強みとして『がん団信100%』が金利上乗せなし（上乗せ0円無料付帯）。5年・125%ルール標準適用。",
        "  * 埼玉りそな銀行: 変動年1.250%〜（SX配慮型住宅・省エネ優遇後 年1.240%〜）。団信革命+0.30%。保証料組込型（保証料0円、保証会社手数料55,000円）。県内店舗数最多。5年・125%ルール標準適用。",
        "  * 青梅信用金庫（川越支店）: 変動年1.475%〜1.800%（店頭基準年1.800%〜3.100%）。川越市新宿町5丁目をはじめ飯能・狭山・所沢・入間等に埼玉県内9拠点展開（鶴ヶ島・坂戸も融資対象）。自営業・個人事業主・法人役員や建替え・親族同居など対面親身審査。5年・125%ルール完備。",
        "  * 埼玉縣信用金庫（さいしん）: 変動年1.245%〜1.495%（最優遇1.245%）。県内信金最大手。しんきん3大疾病・就業不能保障団信。5年・125%ルール適用。",
        "  * 川口信用金庫（かわしん）: 変動年1.525%〜1.875%（年収倍率連動型: 7倍未満1.525%、7〜8倍1.725%、8倍以上1.875%）。川口・さいたま・越谷・草加等の強固な店舗網。5年・125%ルール適用。",
        "  * 青木信用金庫（あおしん）: 変動年1.525%〜1.925%（年収倍率連動型: 6倍未満1.525%、6〜8倍1.725%、8倍以上1.925%）。川口・蕨・戸田・さいたま・草加密着。5年・125%ルール適用。",
        "  * 飯能信用金庫（はんしん）: 変動年1.485%〜1.785%（はんしんマイホーム）。飯能・鶴ヶ島・川越・坂戸・日高密着。5年・125%ルール適用。",
        "  * JAバンク埼玉（JAいるま野・JAさいたま等）: 変動年0.980%〜1.305%（JAさいたま最優遇0.980%、いるま野最優遇1.305%）。出資（1,000円〜）により誰でも利用可能。5年・125%ルール適用。",
        "  * 中央労働金庫（ろうきん）: 変動年1.250%〜1.450%（団体会員1.250%）。保証料0円、繰上返済手数料0円。5年・125%ルール適用。",
        "  * auじぶん銀行: 変動年1.134%（携帯・auでんきセット割適用で 年0.930%〜）。がん50%無料付帯。5年・125%ルール適用。",
        "  * 住信SBIネット銀行: 変動年1.350%〜1.500%。スゴ団信（全疾病保障無料）。5年・125%ルール適用。",
        "  * フラット35（全期間固定）: 当初年2.830%〜（子育てプラス・ZEH/省エネで最大-1.00%引下、当初5年間は年1.830%〜）。返済額完全固定・将来の金利上昇リスクゼロ。",
        "",
        "## 7. 住宅デザインスタイル21選と夫婦の好み擦り合わせ設計（https://t-smile.co.jp/style-matcher/）",
        "- 背景と課題: 注文住宅の初期検討において最も多い失敗・後悔が『夫婦間で理想のデザインや空気感の言葉（オシャレ、かっこいい、落ち着く等）の定義が食い違っている』こと。住ま居るでは、写真を見るだけで30秒で好みのズレと共通点を可視化する『住宅デザインスタイル21選 マッチングナビ』を提供しています。",
        "- 4大カテゴリ・主要21スタイル体系:",
        "  1. モダン・ミニマル系: シンプルモダン、ナチュラルモダン、ラグジュアリーモダン、インダストリアル（男前テイスト）、ブルックリンスタイル、ミッドセンチュリー、ジャパンディ（Japandi）。",
        "  2. クラシック・洋風系: アーリーアメリカン、チューダー（英国伝統調）、南欧風（プロヴァンス/スパニッシュ）、ジョージアン、サーファーズハウス（カリフォルニアスタイル）。",
        "  3. ナチュラル・カントリー系: 北欧スタイル（スカンジナビアン）、フレンチカントリー、アメリカンカントリー、シャビーシック。",
        "  4. 和風・エキゾチック系: 純和風（伝統和風）、和モダン、古民家風（民芸調）、アジアンリゾート（バリ風）、地中海リゾート（エーゲ海風）。",
        "- 自然素材ハイブリッド調和設計: 住ま居るでは、どのスタイルを選んでも基本躯体である『呼吸する北海道産稚内珪藻土＋国産桧・吉野杉無垢材＋HEAT20 G2/G3外皮』をベースに完全実現可能。例えば『外観は夫の希望する黒ガルバのシンプルモダン』×『内観は妻の希望する無垢材と珪藻土の北欧・ジャパンディ』といったハイブリッド設計により、夫婦の異なる理想を100%美しく調和させます。",
        "- AI 3Dパース工房（SmileStudio: https://t-smile.co.jp/smilestudio.html）連携: 判定されたスタイルをワンタップで3Dパース工房へ転送し、Gemini APIによる立体パース生成で即座に空間イメージを可視化できます。",
        "  * フラット35（子育てプラス）: 当初年2.830%〜（基準年3.830%）。35年間完全固定金利。子育て世帯やZEH・高気密高断熱仕様で当初最大-1.00%引下げ。",
        "- 変動金利リスク管理（5年・125%ルールの適用有無）: PayPay銀行・ソニー銀行・楽天銀行は『5年・125%ルール非適用』のため、金利上昇分が翌月返済額に即時増額連動するリスクがある。一方、武蔵野・りそな・信金各行・JA・auじぶん・住信SBI・ろうきんは適用ありで家計激変を緩和。",
        "",
        "## 7. 実例施工邸データ（施工事例6邸の工学仕様と施主の声）"
    ]

    # 施工事例データを取り込み
    try:
        from scripts.build_case_pages import cases_data
        for c in cases_data:
            lines.append(f"\n### Case {c['num']}: {c['title']}")
            lines.append(f"- 所在地: {c['city']}")
            lines.append(f"- 家族構成: {c['family']}")
            lines.append(f"- 構造工法: {c['structure']}")
            lines.append(f"- 耐震性能: {c['seismic']}")
            lines.append(f"- 気密性能: {c['c_val']}")
            lines.append(f"- 断熱性能: {c['ua_val']}")
            lines.append(f"- 実測効果: {c['cost_benefit']}")
            lines.append(f"- 施主様の声: {c['client_voice']}")
            lines.append(f"- 大工棟梁のこだわり: {c['carpenter_voice']}")
            lines.append(f"- 設計建築士の解説: {c['architect_voice']}")
    except Exception as e:
        lines.append(f"\n(施工事例取得スキップ: {e})")

    # 温熱知見200問を取り込み
    lines.append("\n## 8. 24h温熱換気・実務設計知見200問マスターQ&A（全問完全収録）")
    qa_path = os.path.join(PUBLIC_DIR, 'data', 'thermal_qa_200.json')
    if os.path.exists(qa_path):
        with open(qa_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        for q in data.get('questions', []):
            lines.append(f"\n### [Q{q.get('questionNumber', '')}] {q.get('question', '')}（カテゴリ: {q.get('categoryName', '')}）")
            lines.append(f"- **結論・要点**: {q.get('shortAnswer', '')}")
            lines.append(f"- **標準数値指標**: {q.get('dimension', '')}")
            lines.append(f"- **現場実務の技術根拠**: {q.get('details', '')}")
            lines.append(f"- **住ま居るの設計原則**: {q.get('principle', '')}")
            lines.append(f"- **個別解説URL**: https://t-smile.co.jp/knowledge/thermal/{q.get('id', '')}.html")

    # 3D間取りプラン集323選を取り込み
    lines.append("\n## 9. 3D間取りプラン集（全323プラン・616フロア詳細データ）")
    plans_json_path = os.path.join(PUBLIC_DIR, 'data', 'plans.json')
    if os.path.exists(plans_json_path):
        try:
            with open(plans_json_path, 'r', encoding='utf-8') as f:
                plans_list = json.load(f)
            for p in plans_list:
                p_slug = p.get('id', '').lower().replace('_', '-')
                lines.append(f"- **{p.get('title', '')}**（{p.get('total_tsubo', '')}坪 / {p.get('rooms', '')} / {p.get('entrance_direction', '')}玄関 / LDK{p.get('ldk_tatami', '')}帖）: https://t-smile.co.jp/plans/detail/{p_slug}.html")
        except Exception as e:
            lines.append(f"\n(プランデータ取得スキップ: {e})")

    lines.append("\n## 9. 公式サービス・問い合わせリンク")
    lines.append("- 公式トップページ: https://t-smile.co.jp/")
    lines.append("- 会社概要・信用の証明: https://t-smile.co.jp/about/")
    lines.append("- 住宅性能数値証明: https://t-smile.co.jp/performance/")
    lines.append("- 標準工学仕様スペック詳細: https://t-smile.co.jp/category/spec/")
    lines.append("- 実測光熱費データ: https://t-smile.co.jp/evidence/")
    lines.append("- 家づくりの流れ・15万円設計申込特典: https://t-smile.co.jp/flow/")
    lines.append("- 埼玉県環境住宅賞 受賞ストーリー: https://t-smile.co.jp/awards/kankyo-housing/")
    lines.append("- 夫婦の本音間取り相談・家づくりカルテ: https://t-smile.co.jp/madori-consultation/")
    lines.append("- AIフォトリアルパース工房: https://t-smile.co.jp/ai-studio/")
    lines.append("- 温熱知見200選 インデックス: https://t-smile.co.jp/knowledge/thermal/")
    lines.append("- 3D住宅間取りプラン集（全323選）総合カタログ: https://t-smile.co.jp/plans/")
    lines.append("- 完全工学仕様 ＆ 公的証明書ダイジェスト（Webカタログ・A4印刷/PDF対応）: https://t-smile.co.jp/catalog/")

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f"[AIO] Successfully generated full knowledge dump: {out_path} ({len(lines)} lines)!")

def minify_js_assets():
    """public/js/*.js を安全に *.min.js にコピーして構文破損を防止"""
    js_dir = os.path.join(PUBLIC_DIR, 'js')
    if not os.path.exists(js_dir):
        return
    
    import glob
    js_files = glob.glob(os.path.join(js_dir, '*.js'))
    copied_count = 0

    for f in js_files:
        if f.endswith('.min.js'):
            continue
        base_name = os.path.basename(f)
        min_path = os.path.join(js_dir, base_name.replace('.js', '.min.js'))
        
        with open(f, 'r', encoding='utf-8') as src_file:
            raw_code = src_file.read()
        
        with open(min_path, 'w', encoding='utf-8') as dst_file:
            dst_file.write(raw_code)
        copied_count += 1

    print(f"[PERF] Safely synced {copied_count} JS files to *.min.js (Syntax Protected)!")

if __name__ == '__main__':
    minify_js_assets()
    build_index_html()
    build_knowledge_pages_and_sitemap()
    generate_llms_full_txt()

