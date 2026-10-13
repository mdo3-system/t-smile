# -*- coding: utf-8 -*-
"""
scripts/build_site.py
単一責任の原則に基づくHTML統合ビルド ＆ 即効性SEO施策（個別静的ページ・Sitemap生成）
"""
import os
import re
import json

import sys
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
        if os.path.exists(full_path):
            with open(full_path, 'r', encoding='utf-8') as pf:
                return pf.read()
        else:
            print(f"[WARN] Partial not found: {full_path}")
            return f"<!-- Missing partial: {rel_path} -->"

    built_html = re.sub(r'<!--\s*@include\s+([^\s]+)\s*-->', replace_include, template)
    
    out_path = os.path.join(PUBLIC_DIR, 'index.html')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(built_html)
    
    print(f"[BUILD] Successfully assembled {out_path} from partials!")
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
  <meta property="og:title" content="{title} | 株式会社住ま居る" />
  <meta property="og:description" content="{description}" />
  <meta property="og:image" content="https://t-smile.co.jp/images/hero_kaguya_house.jpg" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{{
      "@type": "Question",
      "name": {json_question},
      "acceptedAnswer": {{
        "@type": "Answer",
        "text": {json_answer}
      }}
    }}]
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
            json_question=json.dumps(q.get('question', ''), ensure_ascii=False),
            json_answer=json.dumps(q.get('shortAnswer', '') + '\n' + q.get('details', ''), ensure_ascii=False),
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

    # sitemap.xml の生成
    sitemap_path = os.path.join(PUBLIC_DIR, 'sitemap.xml')
    sitemap_lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls_for_sitemap:
        if u == 'https://t-smile.co.jp/':
            priority = "1.0"
        elif '/about/' in u or '/performance/' in u or '/evidence/' in u or '/ai-studio/' in u or '/awards/' in u or '/madori-consultation/' in u or u.endswith('/knowledge/thermal/'):
            priority = "0.95"
        elif '/cases/' in u:
            priority = "0.9"
        else:
            priority = "0.8"
        sitemap_lines.append(f"  <url><loc>{u}</loc><priority>{priority}</priority><changefreq>weekly</changefreq></url>")
    sitemap_lines.append('</urlset>')

    with open(sitemap_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sitemap_lines))
    print(f"[SEO] Generated sitemap.xml with {len(urls_for_sitemap)} URLs!")

    # robots.txt の生成
    robots_path = os.path.join(PUBLIC_DIR, 'robots.txt')
    with open(robots_path, 'w', encoding='utf-8') as f:
        f.write("User-agent: *\nAllow: /\n\nSitemap: https://t-smile.co.jp/sitemap.xml\n")
    print(f"[SEO] Generated robots.txt!")

if __name__ == '__main__':
    build_index_html()
    build_knowledge_pages_and_sitemap()

