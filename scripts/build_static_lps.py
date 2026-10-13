# -*- coding: utf-8 -*-
"""
scripts/build_static_lps.py
Markdown資産に基づく高品質・SEO最適化 静的ランディングページ（LP）生成
＆ 温熱知見200選 総合ピラーページ生成
"""
import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')

def get_common_layout(title, description, canonical_url, og_image, breadcrumbs, content_html, active_nav='', extra_head='', extra_scripts=''):
    """共通の洗練されたレスポンシブHTMLレイアウト"""
    crumb_items = []
    crumb_ld_items = []
    for idx, (c_name, c_url) in enumerate(breadcrumbs):
        if c_url:
            crumb_items.append(f'<a href="{c_url}">{c_name}</a>')
        else:
            crumb_items.append(f'<span>{c_name}</span>')
        crumb_ld_items.append({
            "@type": "ListItem",
            "position": idx + 1,
            "name": c_name,
            "item": f"https://t-smile.co.jp{c_url}" if c_url else canonical_url
        })

    crumb_html = ' &gt; '.join(crumb_items)
    crumb_ld_json = json.dumps({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": crumb_ld_items
    }, ensure_ascii=False)

    return f"""<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content="{description}" />
  <link rel="canonical" href="{canonical_url}" />

  <!-- Open Graph Protocol (OGP) -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{description}" />
  <meta property="og:image" content="{og_image}" />
  <meta property="og:url" content="{canonical_url}" />
  <meta property="og:site_name" content="株式会社住ま居る 家づくりAIラボ" />
  <meta property="og:locale" content="ja_JP" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{title}" />
  <meta name="twitter:description" content="{description}" />
  <meta name="twitter:image" content="{og_image}" />

  <!-- JSON-LD Breadcrumbs -->
  <script type="application/ld+json">
  {crumb_ld_json}
  </script>

  <!-- Google Fonts & Stylesheets -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;700;800&family=Noto+Sans+JP:wght@400;500;700;800&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css" />
  {extra_head}

  <style>
    :root {{
      --lp-bg: #f8fafc;
      --lp-card-bg: #ffffff;
      --lp-text: #1e293b;
      --lp-heading: #0f172a;
      --lp-accent: #0284c7;
      --lp-green: #059669;
      --lp-gold: #d97706;
      --lp-border: #e2e8f0;
    }}
    body {{
      background: var(--lp-bg);
      color: var(--lp-text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans JP", sans-serif;
      line-height: 1.85;
      margin: 0;
      padding: 0;
    }}
    .lp-header-wrap {{
      background: rgba(27, 67, 50, 0.98);
      backdrop-filter: blur(12px);
      border-bottom: 2px solid #d4af37;
      padding: 0.75rem 1.5rem;
      position: sticky;
      top: 0;
      z-index: 100;
    }}
    .lp-header-inner {{
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }}
    .lp-logo {{
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      color: #fff;
      font-weight: 800;
      font-size: 1.25rem;
    }}
    .lp-nav-links {{
      display: flex;
      gap: 0.6rem;
      list-style: none;
      margin: 0;
      padding: 0;
      flex-wrap: wrap;
      align-items: center;
    }}
    .lp-nav-links a {{
      color: #e2e8f0;
      text-decoration: none;
      font-size: 0.88rem;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 6px;
      transition: all 0.2s;
    }}
    .lp-nav-links a:hover, .lp-nav-links a.active {{
      background: rgba(255, 255, 255, 0.15);
      color: #38bdf8;
    }}
    .lp-main-container {{
      max-width: 1040px;
      margin: 2.5rem auto;
      padding: 0 1.5rem;
    }}
    .lp-crumb {{
      font-size: 0.88rem;
      color: #64748b;
      margin-bottom: 1.8rem;
    }}
    .lp-crumb a {{
      color: #0284c7;
      text-decoration: none;
      font-weight: 600;
    }}
    .lp-card {{
      background: var(--lp-card-bg);
      border: 1px solid var(--lp-border);
      border-radius: 16px;
      box-shadow: 0 10px 35px rgba(0,0,0,0.05);
      padding: 3rem;
      margin-bottom: 2.5rem;
    }}
    .lp-hero-tag {{
      display: inline-block;
      background: #ecfdf5;
      color: #059669;
      font-size: 0.85rem;
      font-weight: 800;
      padding: 4px 14px;
      border-radius: 20px;
      margin-bottom: 1rem;
      border: 1px solid #a7f3d0;
    }}
    .lp-h1 {{
      font-size: 2.2rem;
      font-weight: 900;
      color: var(--lp-heading);
      line-height: 1.35;
      margin-bottom: 1rem;
      letter-spacing: -0.02em;
    }}
    .lp-lead {{
      font-size: 1.12rem;
      color: #475569;
      line-height: 1.9;
      margin-bottom: 2.5rem;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 1.8rem;
    }}
    .lp-h2 {{
      font-size: 1.55rem;
      font-weight: 800;
      color: #0f172a;
      margin-top: 2.8rem;
      margin-bottom: 1.2rem;
      border-left: 5px solid #059669;
      padding-left: 1rem;
    }}
    .lp-h3 {{
      font-size: 1.25rem;
      font-weight: 700;
      color: #1e293b;
      margin-top: 2rem;
      margin-bottom: 0.8rem;
    }}
    .lp-table {{
      width: 100%;
      border-collapse: collapse;
      margin: 1.8rem 0;
      font-size: 0.95rem;
    }}
    .lp-table th, .lp-table td {{
      border: 1px solid #e2e8f0;
      padding: 12px 16px;
      text-align: left;
    }}
    .lp-table th {{
      background: #f1f5f9;
      font-weight: 800;
      color: #1e293b;
      width: 25%;
    }}
    .lp-highlight-box {{
      background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%);
      border: 1px solid #bae6fd;
      border-radius: 12px;
      padding: 1.8rem;
      margin: 2rem 0;
    }}
    .lp-badge-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.2rem;
      margin: 2rem 0;
    }}
    .lp-badge-card {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1.2rem;
      text-align: center;
    }}
    .lp-badge-val {{
      font-size: 1.5rem;
      font-weight: 900;
      color: #0284c7;
      margin: 0.4rem 0;
    }}
    .lp-cta-box {{
      background: linear-gradient(135deg, #091e2f 0%, #0f172a 60%, #172554 100%);
      border-radius: 16px;
      padding: 3rem 2rem;
      text-align: center;
      color: #ffffff;
      margin-top: 3.5rem;
    }}
    .lp-cta-btn {{
      display: inline-block;
      background: linear-gradient(135deg, #0284c7, #38bdf8);
      color: #ffffff;
      font-weight: 800;
      font-size: 1.1rem;
      padding: 1rem 2.2rem;
      border-radius: 12px;
      text-decoration: none;
      box-shadow: 0 4px 15px rgba(2, 132, 199, 0.4);
      margin-top: 1.5rem;
      transition: all 0.2s ease;
    }}
    .lp-cta-btn:hover {{
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(2, 132, 199, 0.6);
    }}
    .lp-footer {{
      background: #0f172a;
      color: #94a3b8;
      padding: 3rem 1.5rem;
      font-size: 0.88rem;
      text-align: center;
      border-top: 1px solid #1e293b;
    }}
    .lp-footer a {{
      color: #38bdf8;
      text-decoration: none;
    }}
    @media (max-width: 768px) {{
      .lp-card {{ padding: 1.8rem 1.2rem; }}
      .lp-h1 {{ font-size: 1.65rem; }}
      .lp-table th, .lp-table td {{ display: block; width: 100%; }}
      .lp-table th {{ background: #e2e8f0; }}
    }}
  </style>
</head>
<body>

  <!-- Header -->
  <header class="lp-header-wrap">
    <div class="lp-header-inner">
      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <a href="/" class="lp-logo">
          <span>家づくりAIラボ</span>
          <span style="background: #f59e0b; color: #0f172a; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;">by 住ま居る</span>
        </a>
        <span style="font-size: 0.72rem; color: #94a3b8; background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">
          埼玉・鶴ヶ島IC 1h圏内｜創業30年・累計800棟
        </span>
      </div>
      <nav>
        <ul class="lp-nav-links">
          <li><a href="/">🏠 ホーム</a></li>
          <li><a href="/madori-consultation/" class="{ 'active' if active_nav == 'madori' else '' }" style="background: rgba(124, 58, 237, 0.25); color: #c4b5fd; border: 1px solid rgba(167, 139, 250, 0.3);">🤖 間取り相談＆カルテ</a></li>
          <li><a href="/flow/" class="{ 'active' if active_nav == 'flow' else '' }" style="background: rgba(2, 132, 199, 0.2); color: #7dd3fc; border: 1px solid rgba(56, 189, 248, 0.3);">📐 家づくりの流れ・15万特典</a></li>
          <li><a href="/about/" class="{ 'active' if active_nav == 'about' else '' }">🛡️ 会社・信用 (CredLayer)</a></li>
          <li><a href="/performance/" class="{ 'active' if active_nav == 'performance' else '' }">📐 温熱・構造性能</a></li>
          <li><a href="/evidence/" class="{ 'active' if active_nav == 'evidence' else '' }">📊 実測データ実証録</a></li>
          <li><a href="/ai-studio/" class="{ 'active' if active_nav == 'ai-studio' else '' }">🎨 AIパース工房</a></li>
          <li><a href="/knowledge/thermal/" class="{ 'active' if active_nav == 'thermal' else '' }">💬 温熱知見200選</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <!-- Main Content -->
  <main class="lp-main-container">
    <nav class="lp-crumb" aria-label="パンくずリスト">
      {crumb_html}
    </nav>

    <article class="lp-card">
      {content_html}
    </article>

    <!-- Global CTA -->
    <div class="lp-cta-box">
      <span style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; font-weight: 800; padding: 4px 14px; border-radius: 20px; font-size: 0.85rem; border: 1px solid rgba(56, 189, 248, 0.4);">
        ✨ 完全無料・会員登録不要で即時利用可能
      </span>
      <h2 style="font-size: 1.8rem; margin: 1rem 0 0.5rem; color: #fff;">理想の住まいを、最新AIと工学データで描きませんか？</h2>
      <p style="color: #cbd5e1; font-size: 1rem; max-width: 680px; margin: 0 auto;">
        登録不要のAI間取りシミュレーター、フォトリアルパース生成、埼玉の気候を知り尽くした24h温熱換気AI相談室を完全無料開放しています。
      </p>
      <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-top: 1.5rem;">
        <a href="/#floorplan-studio" class="lp-cta-btn" style="background: linear-gradient(135deg, #0284c7, #38bdf8); font-weight: 800;">📐 間取りプラン選別・実例検索 ➜</a>
        <a href="/madori-consultation/" class="lp-cta-btn" style="background: linear-gradient(135deg, #7c3aed, #8b5cf6); color: #fff; font-weight: 800;">💬 夫婦の家づくりカルテ ➜</a>
        <a href="/#thermal-consultation" class="lp-cta-btn" style="background: linear-gradient(135deg, #059669, #10b981); font-weight: 800;">🌡️ 24h温熱換気AI相談 ➜</a>
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="lp-footer">
    <p style="margin: 0 0 0.5rem 0; font-weight: 700; color: #e2e8f0;">
      株式会社住ま居る（埼玉県鶴ヶ島市）
    </p>
    <p style="margin: 0 0 1rem 0; font-size: 0.82rem; color: #64748b;">
      埼玉県知事許可（般－8）第60650号 ｜ 二級建築設計事務所 埼玉県知事（5）第10268号 ｜ 創業1994年・施工実績800棟以上
    </p>
    <p style="margin: 0; font-size: 0.78rem;">
      <a href="/">トップページ</a> ｜ <a href="/madori-consultation/">間取り相談＆カルテ</a> ｜ <a href="/flow/">家づくりの流れ・15万円設計申込特典</a> ｜ <a href="/about/">会社概要・信用の証明</a> ｜ <a href="/performance/">温熱・構造性能</a> ｜ <a href="/evidence/">光熱費実証録</a> ｜ <a href="/knowledge/thermal/">温熱知見200選</a>
    </p>
    <p style="margin-top: 1.5rem; font-size: 0.75rem; color: #475569;">
      &copy; 株式会社住ま居る (Sumaile Co., Ltd.) All Rights Reserved.
    </p>
  </footer>

  <script src="/js/app.js" defer></script>
  <script src="/js/manga-viewer.js" defer></script>
  {extra_scripts}
</body>
</html>"""


def generate_about_page():
    out_dir = os.path.join(PUBLIC_DIR, 'about')
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, 'index.html')

    content = """
      <span class="lp-hero-tag">🛡️ 信用を、目に見える資産へ（CredLayer）</span>
      <h1 class="lp-h1">会社概要・信用の証明｜株式会社住ま居る</h1>
      <p class="lp-lead">
        埼玉県鶴ヶ島ICから車で片道1時間圏内限定。創業30年・累計800棟の実績。<br>
        「安く建てます」の価格競争を超えて、設計・施工・不動産・相続・開発手続きまで一貫対応する地域工務店の責任と信用証明。
      </p>

      <h2 class="lp-h2">1. 会社概要と公的資格・許認可</h2>
      <p>AI検索ツールやGoogle検索、そしてこれから家を建てるお施主様へ、私たちの責任ある体制を公的データとして明記いたします。</p>
      
      <table class="lp-table">
        <tr><th>会社名</th><td>株式会社住ま居る（Sumaile Co., Ltd.）</td></tr>
        <tr><th>所在地</th><td>埼玉県鶴ヶ島市（圏央道 鶴ヶ島ICから車で片道1時間圏内を施工対応エリアと定義）</td></tr>
        <tr><th>設立 / 実績</th><td>創業30年（1994年設立） ｜ <strong>累計 800 棟以上</strong></td></tr>
        <tr><th>事業内容</th><td>注文住宅の設計・施工・監理、リフォーム・断熱改修、不動産・相続相談、農地法・都市計画法等の開発手続き</td></tr>
        <tr><th>建設業許可</th><td><strong>埼玉県知事許可（般－8）第60650号</strong></td></tr>
        <tr><th>設計事務所登録</th><td><strong>二級建築設計事務所 埼玉県知事（5）第10268号</strong></td></tr>
        <tr><th>代表取締役・設計統括</th><td><strong>菅原 功樹</strong>（二級建築士・既存住宅状況調査技術者 ｜ 全国から年間150件の許容応力度構造計算審査を受託する工学設計責任者）</td></tr>
        <tr><th>現場監理統括</th><td><strong>菅原 （弟）</strong>（2級建築施工管理技士・第二種電気工事士 ｜ 現場施工管理・電気設備まで自社監理）</td></tr>
        <tr><th>経理・法務・重要事項説明</th><td><strong>菅原 （妻）</strong>（宅地建物取引士 ｜ 資金計画・不動産法務・登記税制サポート）</td></tr>
        <tr><th>モデルハウスご案内・受付</th><td><strong>ベテラン女性スタッフ2名</strong>（地元を知る温かなつなぎ役。強引な営業は一切行わず、モデルハウスご案内やAIパース指示を担当）</td></tr>
        <tr><th>提携・連携体制</th><td>埼玉西部の熟練職人ネットワーク、外部構造設計事務所、地盤保証機関、瑕疵担保責任保険（JIO等）</td></tr>
      </table>

      <div class="lp-highlight-box">
        <h3 style="margin-top: 0; color: #047857; font-size: 1.15rem;">少人数精鋭の「技術者直営工務店」としての姿勢</h3>
        <p style="margin-bottom: 0; font-size: 0.95rem; line-height: 1.85;">
          私たちは、莫大な展示場出店料や営業マンの歩合給を建築費に上乗せする営業会社ではありません。<br>
          また、「家族経営」という情緒やアットホーム感だけを過剰に売りにするつもりもありません。<br>
          年間150件の構造計算審査を手掛ける二級建築士の設計、施工管理技士・電気工事士の現場監理、宅地建物取引士の法務という、<strong>客観的な国家資格と工学的根拠に裏打ちされた技術者集団</strong>として、一棟一棟責任を持って向き合っています。
        </p>
      </div>

      <h2 class="lp-h2">2. 代表メッセージ：「価格競争から信用競争への転換」</h2>
      <div class="lp-highlight-box">
        <h3 style="margin-top: 0; color: #047857; font-size: 1.2rem;">安売りではなく、「根拠ある誠実さ」を貫く</h3>
        <p style="margin-bottom: 0;">
          資材高騰や大手ハウスメーカーの坪単価100万円超化が進む中、地域工務店が歩むべき道は明確です。<br>
          「なぜこの設計なのか（埼玉のからっ風と日照）」「なぜこの材料なのか（結露を防ぐ付加断熱と無垢材）」「なぜこの金額なのか（営業マン人件費を削り躯体に還元）」。すべてを透明化し、建ててから30年・50年後もお施主様の命と体温を守り続けることこそが、住ま居るの最大の信用資産です。
        </p>
      </div>

      <h2 class="lp-h2">3. 客観的数値で示す「結露しない家」の5大性能指標</h2>
      <div class="lp-badge-grid">
        <div class="lp-badge-card">
          <div style="font-size: 0.82rem; font-weight: 700; color: #64748b;">断熱性能 (外皮平均熱貫流率)</div>
          <div class="lp-badge-val">UA 0.30〜0.45</div>
          <div style="font-size: 0.8rem; color: #059669; font-weight: 700;">HEAT20 G2/G3 (等級6〜7)</div>
        </div>
        <div class="lp-badge-card">
          <div style="font-size: 0.82rem; font-weight: 700; color: #64748b;">気密性能 (全棟現場実測)</div>
          <div class="lp-badge-val">C値 1.0 以下</div>
          <div style="font-size: 0.78rem; color: #059669; font-weight: 700; line-height: 1.3;">（あまり凸凹したプラン以外なら0.5以下になります）</div>
        </div>
        <div class="lp-badge-card">
          <div style="font-size: 0.82rem; font-weight: 700; color: #64748b;">構造耐震 (全棟計算書交付)</div>
          <div class="lp-badge-val">耐震等級3</div>
          <div style="font-size: 0.8rem; color: #059669; font-weight: 700;">全棟 許容応力度計算</div>
        </div>
        <div class="lp-badge-card">
          <div style="font-size: 0.82rem; font-weight: 700; color: #64748b;">火災安全・資産価値</div>
          <div class="lp-badge-val">省令準耐火</div>
          <div style="font-size: 0.8rem; color: #059669; font-weight: 700;">火災保険料約半額・長期優良</div>
        </div>
      </div>

      <h2 class="lp-h2">4. 住宅にとどまらない「ワンストップ専門性」</h2>
      <ul style="padding-left: 1.5rem; line-height: 2;">
        <li><strong>不動産・土地探し・土地活用:</strong> 地元の地盤特性と気候風土を知り尽くした視点での敷地提案。</li>
        <li><strong>農地法・都市計画法等の開発手続き:</strong> 市街化調整区域や農地転用など、他社が敬遠する複雑な行政手続きを一貫サポート。</li>
        <li><strong>相続・空き家相談:</strong> 次世代への資産継承、リノベーション、耐震改修・断熱改修まで柔軟対応。</li>
      </ul>

      <h2 class="lp-h2">5. 「AIの時代だからこそ、最後は人間の温もりで建てる」</h2>
      <div style="background: #ffffff; border: 2px solid #059669; border-radius: 12px; padding: 2rem; margin: 2rem 0; box-shadow: 0 4px 20px rgba(5,150,105,0.08);">
        <h3 style="color: #065f46; margin-top: 0; font-size: 1.3rem;">30年現場を率いてきた代表・職人より、ご家族の皆様へ</h3>
        <p style="font-size: 1.02rem; line-height: 1.9; color: #1e293b;">
          私たちが最新のAIを開発し、Webで無料公開したのは、ITを誇示したいからではありません。<br>
          無駄な展示場費や営業マンの歩合給を徹底的に削り落とし、<strong>お施主様の大切な資金を一円残らず「本物の無垢の木」「何十年も家族の体温を守る超高断熱」「大地震でもビクともしない構造躯体」、そして「丹精込めてカンナをかける熟練大工さんの手仕事」にすべて注ぎ込むため</strong>です。
        </p>
        <p style="font-size: 1.02rem; line-height: 1.9; color: #1e293b; margin-bottom: 0;">
          図面を描くのはAIかもしれません。しかし、木目の癖を読み、1ミリの隙間も見逃さず気密を詰め、お引き渡しの日にご家族と涙ぐみながら鍵をお渡しするのは、血の通った生身の人間です。<br>
          数字の厳密さと、人間の温もり。この2つが揃って初めて、一生愛せる住まいが完成します。
        </p>
      </div>
    """

    html = get_common_layout(
        title="会社概要・信用の証明（CredLayer）| 株式会社住ま居る【鶴ヶ島・川越】創業30年800棟",
        description="埼玉県鶴ヶ島ICから車で1時間圏内限定。創業30年・累計800棟の実績。公的許認可番号、HEAT20 G2/G3・C値0.3・全棟許容応力度計算耐震等級3の信用証明データ一覧。",
        canonical_url="https://t-smile.co.jp/about/",
        og_image="https://t-smile.co.jp/images/hero_kaguya_house.jpg",
        breadcrumbs=[("🏠 ホーム", "/"), ("🛡️ 会社概要・信用の証明", "")],
        content_html=content,
        active_nav='about'
    )
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(html)
    return "https://t-smile.co.jp/about/"


def generate_performance_page():
    out_dir = os.path.join(PUBLIC_DIR, 'performance')
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, 'index.html')

    content = """
      <span class="lp-hero-tag">📐 家族の命と体温を守るエンジニアリング</span>
      <h1 class="lp-h1">性能の真実：真冬の朝も、素足で笑える住まいへ</h1>
      <p class="lp-lead">
        エアコンだけで家中暖かい。それでも私たちが「省エネ低温水床暖房」を強く推奨するのは、風と音のない「本物のやすらぎ」をお届けしたいからです。<br>
        埼玉特有の過乾燥から喉を守る調湿設計、大地震でも家族が手をつないで眠れる許容応力度計算耐震等級3を、物理と愛の両面から解説します。
      </p>

      <h2 class="lp-h2">1. エアコンだけで十分に暖かい。それでも「床暖房」を推奨する理由</h2>
      <p>
        高気密高断熱住宅をアピールする会社の多くが、「エアコン1台で家中暖かいから床暖房は無駄なコストだ」と主張します。<br>
        工学的な事実としてお答えします。当社の住宅性能（HEAT20 G2/G3レベル・実測C値0.3以下）であれば、真冬であってもエアコン1〜2台で家中くまなく20℃〜22℃を維持できます。これは揺るぎない事実です。
      </p>
      
      <div class="lp-highlight-box">
        <h3 style="margin-top: 0; color: #0369a1; font-size: 1.15rem;">なぜ超高断熱住宅で床暖房なのか？</h3>
        <ul style="margin: 0; padding-left: 1.2rem; line-height: 1.9;">
          <li><strong>エアコンの限界（気流と対流ドラフト）:</strong> 空気を強制循環させるエアコンでは、肌に触れる微小な気流感や上下のわずかな温度ムラを物理的にゼロにできません。</li>
          <li><strong>ぬるい温水（30℃前後）による超省エネ運転:</strong> 魔法瓶のように熱が逃げない躯体だからこそ、わずか30℃の温水循環で床全体が暖まります。ヒートポンプが最高効率（高COP）で動作するため、エアコン運転時と変わらない驚きの低電気代を実現します。</li>
          <li><strong>圧倒的な静謐（プライスレスの無風快適空間）:</strong> 風が吹かない、ファンの音がしない。遠赤外線の輻射熱が体を足元から包み込みます。</li>
        </ul>
      </div>

      <h2 class="lp-h2">2. 埼玉の冬最大の敵「過乾燥」に打ち勝つ調湿設計</h2>
      <p>
        冬の埼玉（鶴ヶ島・川越周辺）は、氷点下の冷え込みとともに「からっ風」が吹き荒れます。室温が20℃を超えると相対湿度は20%台へと急降下し、喉の痛みや肌荒れを引き起こします。
      </p>
      <div class="lp-badge-grid">
        <div class="lp-badge-card" style="text-align: left;">
          <h4 style="margin: 0 0 0.5rem; color: #0f172a;">① 第1種全熱交換型換気</h4>
          <p style="font-size: 0.88rem; color: #475569; margin: 0;">排気の熱だけでなく「水蒸気（湿気）」も回収して給気へと戻し、過度な乾燥を抑制。</p>
        </div>
        <div class="lp-badge-card" style="text-align: left;">
          <h4 style="margin: 0 0 0.5rem; color: #0f172a;">② 漆喰・調湿バッファー</h4>
          <p style="font-size: 0.88rem; color: #475569; margin: 0;">吸放湿に優れた自然素材を室内に配置。加湿器の水分を蓄え、乾燥時に緩やかに放出。</p>
        </div>
        <div class="lp-badge-card" style="text-align: left;">
          <h4 style="margin: 0 0 0.5rem; color: #0f172a;">③ C値0.3以下の密閉度</h4>
          <p style="font-size: 0.88rem; color: #475569; margin: 0;">隙間からの湿気漏洩をシャットアウトし、加湿器1台の最小運転で湿度45〜50%をキープ。</p>
        </div>
      </div>

      <h2 class="lp-h2">3. 全棟許容応力度計算による本物の耐震等級3</h2>
      <p>
        住宅会社が言う「耐震等級3相当」は、簡易な壁量計算にすぎないことが大半です。住ま居るでは、全棟で<strong>立体フレーム解析による許容応力度計算（ルート3レベル）</strong>を実施しています。
      </p>
      <table class="lp-table">
        <tr><th>梁のたわみ計算</th><td>30年後も床鳴りや下がりが起きない剛性をミリ単位で検証</td></tr>
        <tr><th>柱の引き抜き力 (N値)</th><td>大地震時に柱が土台から抜けない専用金物を1本1本構造計算</td></tr>
        <tr><th>偏心率 0.15 以下</th><td>建物の重心と剛心のズレを極小化し、ねじれ倒壊を根本防止</td></tr>
        <tr><th>直下率 60% 以上</th><td>2階の柱や壁が1階の柱の上に無理なく乗る骨格のみを設計</td></tr>
      </table>
    """

    html = get_common_layout(
        title="温熱・調湿・構造性能の真実｜株式会社住ま居る【埼玉・鶴ヶ島】",
        description="埼玉の冬を制する温熱エンジニアリング。エアコンだけで暖かい家にあえて省エネ低温水床暖房を推奨する理由、からっ風の過乾燥対策、全棟許容応力度計算耐震等級3を解説。",
        canonical_url="https://t-smile.co.jp/performance/",
        og_image="https://t-smile.co.jp/images/hero_kaguya_house.jpg",
        breadcrumbs=[("🏠 ホーム", "/"), ("📐 温熱・構造性能の真実", "")],
        content_html=content,
        active_nav='performance'
    )
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(html)
    return "https://t-smile.co.jp/performance/"


def generate_evidence_page():
    out_dir = os.path.join(PUBLIC_DIR, 'evidence')
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, 'index.html')

    content = """
      <span class="lp-hero-tag">📊 光熱費・実測データ実証録</span>
      <h1 class="lp-h1">営業トークではなく、数字と物理データで語る</h1>
      <p class="lp-lead">
        延床35坪・真冬の電気代明細から温湿度ロガーグラフ、サーモグラフィ検証まで。<br>
        埼玉県西部の過酷な冬・夏を乗り越える実証データをすべて包み隠さず公開します。
      </p>

      <h2 class="lp-h2">厳選実証アーカイブ</h2>
      
      <div style="display: grid; gap: 1.5rem; margin: 2rem 0;">
        <div class="lp-badge-card" style="text-align: left; padding: 1.6rem;">
          <span style="background: #e0f2fe; color: #0284c7; font-size: 0.78rem; font-weight: 800; padding: 2px 8px; border-radius: 4px;">記事01 ｜ 光熱費実証</span>
          <h3 style="margin: 0.6rem 0; color: #0f172a;">真冬の電気代明細公開（延床35坪・全館22℃キープ）</h3>
          <p style="font-size: 0.92rem; color: #475569; margin-bottom: 0.8rem;">
            1月〜2月の厳冬期、低温水床暖房を24時間連続運転した際の買電量と電気代の実測推移。大手鉄骨住宅の同規模世帯と比較して暖房負荷はおよそ半分以下。太陽光発電の自家消費と組み合わせ、年間の実質光熱費収支はほぼプラスマイナスゼロを達成。
          </p>
        </div>

        <div class="lp-badge-card" style="text-align: left; padding: 1.6rem;">
          <span style="background: #ecfdf5; color: #059669; font-size: 0.78rem; font-weight: 800; padding: 2px 8px; border-radius: 4px;">記事02 ｜ 湿度実証</span>
          <h3 style="margin: 0.6rem 0; color: #0f172a;">埼玉のからっ風に負けない「相対湿度45%」の維持ログ</h3>
          <p style="font-size: 0.92rem; color: #475569; margin-bottom: 0.8rem;">
            外気湿度が20%を下回る1月の晴天日における、室内各室（LDK、寝室、洗面脱衣室）の温湿度ロガーデータ。全熱交換換気と漆喰壁の調湿バッファーにより、加湿器1台の最小運転で室内相対湿度45〜50%を24時間安定キープ。
          </p>
        </div>

        <div class="lp-badge-card" style="text-align: left; padding: 1.6rem;">
          <span style="background: #fef3c7; color: #d97706; font-size: 0.78rem; font-weight: 800; padding: 2px 8px; border-radius: 4px;">記事03 ｜ 赤外線サーモグラフィ</span>
          <h3 style="margin: 0.6rem 0; color: #0f172a;">サーモグラフィが暴く「熱橋（ヒートブリッジ）」の正体</h3>
          <p style="font-size: 0.92rem; color: #475569; margin-bottom: 0.8rem;">
            外気温2℃の早朝、当社施工住宅と一般的な鉄骨系住宅の外皮・室内壁面温度を赤外線サーモグラフィカメラで比較。鉄骨造の柱・梁周囲に見られる顕著な冷え込み（熱橋）に対し、木造付加断熱を施した当社の壁面は床から天井まで均一な21℃を表示。
          </p>
        </div>

        <div class="lp-badge-card" style="text-align: left; padding: 1.6rem;">
          <span style="background: #e0e7ff; color: #4338ca; font-size: 0.78rem; font-weight: 800; padding: 2px 8px; border-radius: 4px;">記事04 ｜ 夏期除湿実証</span>
          <h3 style="margin: 0.6rem 0; color: #0f172a;">夏期・小屋裏エアコン1台による全館除湿メカニズム</h3>
          <p style="font-size: 0.92rem; color: #475569; margin-bottom: 0.8rem;">
            8月の猛暑日（外気温38℃）、小屋裏エアコン1台のみを冷房・再熱除湿運転させた全室温度分布。顕熱（温度）だけでなく潜熱（湿度）をコントロールし、室温26℃・湿度48%の高原ホテルのような快適性を実証。
          </p>
        </div>
      </div>

      <div class="lp-highlight-box">
        <h3 style="margin-top: 0; color: #065f46; font-size: 1.15rem;">🏢 実証モデルハウスは鶴ヶ島市に実在します</h3>
        <p style="margin: 0;">
          これらのデータは机上の空論ではなく、すべて埼玉県鶴ヶ島市に実在する当社のモデルハウスで実測されたものです。<br>
          トップページの「バーチャル展示場」や、実際の「リアル展示場体感」にて、その空気感をご自身でお確かめいただけます。
        </p>
      </div>
    """

    html = get_common_layout(
        title="光熱費・実測データ実証録｜株式会社住ま居る【埼玉・鶴ヶ島】",
        description="営業トークではなく数字と物理データで語る。延床35坪・真冬の電気代明細、24時間温湿度ロガーグラフ、サーモグラフィ比較、小屋裏エアコン実証録を公開中。",
        canonical_url="https://t-smile.co.jp/evidence/",
        og_image="https://t-smile.co.jp/images/hero_kaguya_house.jpg",
        breadcrumbs=[("🏠 ホーム", "/"), ("📊 光熱費実測データ実証録", "")],
        content_html=content,
        active_nav='evidence'
    )
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(html)
    return "https://t-smile.co.jp/evidence/"


def generate_ai_studio_page():
    out_dir = os.path.join(PUBLIC_DIR, 'ai-studio')
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, 'index.html')

    content = """
      <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.98)), url('/images/cases_real/case1/photo_01.jpg') center/cover; padding: 3rem 2rem; border-radius: 20px; color: #fff; margin-bottom: 2.5rem; border: 1px solid rgba(217, 119, 6, 0.3); box-shadow: 0 20px 40px rgba(0,0,0,0.25);">
        <span class="lp-hero-tag" style="background: rgba(217, 119, 6, 0.25); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.5); font-size: 0.82rem; font-weight: 800; padding: 4px 14px; border-radius: 20px;">
          ✨ 設計お申し込み者様限定・特別連携アトリエ
        </span>
        <h1 class="lp-h1" style="color: #ffffff; margin-top: 1rem; font-size: 2.3rem; line-height: 1.35;">
          打ち合わせは2時間。<br>
          <span style="color: #fbbf24; font-size: 1.9rem;">夢を描く時間は、家族で一生分。</span>
        </h1>
        <p style="font-size: 1.05rem; color: #e2e8f0; line-height: 1.9; max-width: 820px; margin-top: 1rem;">
          一生に一度の家づくり。限られた対面打ち合わせの時間だけでは、ご夫婦それぞれの想いやこだわりを尽くすことはできません。<br>
          住ま居るでは、代表（設計）の専用ハイエンドワークステーション<strong>「Dell Precision 3680」</strong>と、建築特化型画像生成AI<strong>「Stable Diffusion」</strong>を直結。<br>
          対面打ち合わせが終わった後も、ご自宅のスマホから<strong>何時間でも、納得いくまで何枚でも</strong>理想のパースをご家族であーでもないこーでもないと生成していただけます。
        </p>

        <!-- 認証・ログインボックス -->
        <div style="background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 14px; padding: 1.5rem 1.8rem; margin-top: 2rem; max-width: 720px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="font-size: 0.95rem; font-weight: 800; color: #fbbf24;">🔐 設計お申し込み済みのお施主様はこちら</div>
              <div style="font-size: 0.85rem; color: #cbd5e1; margin-top: 2px;">パスワード不要。ご登録のメールアドレスへ届くワンタイムリンクで即時ログインできます。</div>
            </div>
            <button type="button" onclick="openCarteLoginModal()" style="background: linear-gradient(135deg, #d97706, #f59e0b); color: #fff; font-weight: 800; font-size: 0.95rem; padding: 0.75rem 1.6rem; border: none; border-radius: 10px; cursor: pointer; box-shadow: 0 4px 15px rgba(217, 119, 6, 0.4); transition: all 0.2s;">
              👤 マイカルテでパース工房を開く ➜
            </button>
          </div>
        </div>
      </div>

      <!-- 2段階の生成プロセス（図解） -->
      <h2 class="lp-h2" style="border-left: 5px solid #d97706;">1. 家族の想いが図面へ、そして一生の住まいへ結実する「2段階プロセス」</h2>
      <p style="font-size: 1rem; color: #334155; line-height: 1.85;">
        大手ハウスメーカーのように「営業マンが選んだ無難なカタログ」から選ばされる時代は終わりました。<br>
        住ま居るのAIパース工房は、初期の自由な空想から、図面確定後のミリ単位の立体検証まで、2つのフェーズでお施主様をサポートします。
      </p>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin: 2rem 0;">
        <!-- フェーズ1カード -->
        <div style="background: #ffffff; border: 2px solid #bae6fd; border-radius: 16px; padding: 2rem; box-shadow: 0 4px 20px rgba(2, 132, 199, 0.08); position: relative;">
          <div style="position: absolute; top: -14px; left: 24px; background: #0284c7; color: #fff; font-size: 0.8rem; font-weight: 900; padding: 4px 14px; border-radius: 20px;">
            PHASE 01 ｜ バブルプラン・初期検討
          </div>
          <h3 style="font-size: 1.25rem; font-weight: 800; color: #0369a1; margin-top: 0.5rem; margin-bottom: 0.8rem;">
            平面図にとらわれない「部位別パーツイメージ」
          </h3>
          <p style="font-size: 0.92rem; color: #475569; line-height: 1.75; margin-bottom: 1rem;">
            最初は間取り図のルールを一切気にする必要はありません。<br>
            「リビングは吹き抜けでこんな光が入る感じ」「寝室はホテルライクで落ち着いたグレージュ」「玄関には無垢杉のベンチと坪庭」など、<strong>パーツごとの理想だけを何枚でも生成</strong>。<br>
            ご夫婦それぞれがスマホで生成したお気に入りパースを「家カルテ」に登録していただくことで、代表建築士がそれを読み解き、最初のプランニングに反映します。
          </p>
          <div style="background: #f0f9ff; border-radius: 8px; padding: 0.8rem 1rem; font-size: 0.82rem; color: #0369a1; font-weight: 700;">
            💡 夫は夫のスマホで、妻は妻のスマホで。お互いの好みをカルテで持ち寄り、家族の対話が何倍も深まります。
          </div>
        </div>

        <!-- フェーズ2カード -->
        <div style="background: #ffffff; border: 2px solid #fde68a; border-radius: 16px; padding: 2rem; box-shadow: 0 4px 20px rgba(217, 119, 6, 0.08); position: relative;">
          <div style="position: absolute; top: -14px; left: 24px; background: #d97706; color: #fff; font-size: 0.8rem; font-weight: 900; padding: 4px 14px; border-radius: 20px;">
            PHASE 02 ｜ 確定平面図作図後（設計申込特典）
          </div>
          <h3 style="font-size: 1.25rem; font-weight: 800; color: #92400e; margin-top: 0.5rem; margin-bottom: 0.8rem;">
            確定図面から描く「3D鳥観図＆リアル内観パース」
          </h3>
          <p style="font-size: 0.92rem; color: #475569; line-height: 1.75; margin-bottom: 1rem;">
            代表が引いた確定平面図をもとに、<strong>真上からの3D間取り図・斜めからの立体鳥観図・望むアングルからの内観パース・断面図</strong>を精密に生成。<br>
            ControlNet（深度・輪郭固定技術）により、壁の位置や窓の寸法を崩さずに、プロ向けパース制作サービス（ArchiXやRendry等）と同等以上のリアルさで描き出します。<br>
            対面での打ち合わせは2時間で集中して行い、あとはご自宅で何時間でも心ゆくまでパースを生成して仕上がりを検証できます。
          </p>
          <div style="background: #fefce8; border-radius: 8px; padding: 0.8rem 1rem; font-size: 0.82rem; color: #854d0e; font-weight: 700;">
            🚀 施主からのリクエストを受け、代表のDell Precision 3680（ローカルGPU）が自動レンダリングしてカルテへ返却します。
          </div>
        </div>
      </div>

      <!-- 部位別パーツ作例ギャラリー -->
      <h2 class="lp-h2" style="border-left: 5px solid #059669; margin-top: 3.5rem;">2. 部位パーツ生成ギャラリー（初期バブルプラン段階）</h2>
      <p style="font-size: 1rem; color: #334155;">
        無垢杉の床材、珪藻土の塗り壁、吉野杉の大黒柱、大きな吹き抜け。住ま居るならではの質感を忠実に学習した高精度作例です。
      </p>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin: 2rem 0;">
        <div class="lp-badge-card" style="text-align: left; padding: 0; overflow: hidden; border: 1px solid #e2e8f0;">
          <img src="/renders/render_living_%E5%90%B9%E3%81%8D%E6%8A%9C%E3%81%91.jpg" alt="LDK吹き抜けパース" style="width: 100%; height: 200px; object-fit: cover;" onerror="this.src='/images/cases_real/case1/photo_01.jpg'" />
          <div style="padding: 1.2rem;">
            <span style="background: #ecfdf5; color: #059669; font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 4px;">部位: LDKリビング</span>
            <h4 style="margin: 0.4rem 0 0.5rem; color: #0f172a; font-size: 1.05rem;">吹き抜け大開口 × 陽だまりLDK</h4>
            <p style="font-size: 0.84rem; color: #64748b; margin: 0;">天井高2.8mの大空間。南面大開口から差し込む自然光と、吉野杉の無垢梁が描く静謐な陰影。</p>
          </div>
        </div>

        <div class="lp-badge-card" style="text-align: left; padding: 0; overflow: hidden; border: 1px solid #e2e8f0;">
          <img src="/renders/real_interior_scent.jpg" alt="主寝室パース" style="width: 100%; height: 200px; object-fit: cover;" onerror="this.src='/images/cases_real/case1/photo_06.jpg'" />
          <div style="padding: 1.2rem;">
            <span style="background: #fdf4ff; color: #c026d3; font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 4px;">部位: 主寝室</span>
            <h4 style="margin: 0.4rem 0 0.5rem; color: #0f172a; font-size: 1.05rem;">ホテルライク × 間接照明サンクチュアリ</h4>
            <p style="font-size: 0.84rem; color: #64748b; margin: 0;">調光式コーブ照明とグレージュの珪藻土壁。眠りの質を極限まで高める落ち着いた空間設計。</p>
          </div>
        </div>

        <div class="lp-badge-card" style="text-align: left; padding: 0; overflow: hidden; border: 1px solid #e2e8f0;">
          <img src="/renders/render_japan_modern.jpg" alt="和室・書斎パース" style="width: 100%; height: 200px; object-fit: cover;" onerror="this.src='/images/cases_real/case1/photo_05.jpg'" />
          <div style="padding: 1.2rem;">
            <span style="background: #fef3c7; color: #d97706; font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 4px;">部位: 和室・離れ・書斎</span>
            <h4 style="margin: 0.4rem 0 0.5rem; color: #0f172a; font-size: 1.05rem;">現代数寄屋 × 杉格子ルーバー</h4>
            <p style="font-size: 0.84rem; color: #64748b; margin: 0;">坪庭を望む地窓と縁なし半畳畳。手刻み大工の精緻な木工技術が活きる、現代のわびさび空間。</p>
          </div>
        </div>

        <div class="lp-badge-card" style="text-align: left; padding: 0; overflow: hidden; border: 1px solid #e2e8f0;">
          <img src="/images/cases_real/case5/photo_07.jpg" alt="造作洗面パース" style="width: 100%; height: 200px; object-fit: cover;" />
          <div style="padding: 1.2rem;">
            <span style="background: #e0f2fe; color: #0284c7; font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 4px;">部位: 造作洗面・手洗い</span>
            <h4 style="margin: 0.4rem 0 0.5rem; color: #0f172a; font-size: 1.05rem;">無垢カウンター × タイル造作洗面</h4>
            <p style="font-size: 0.84rem; color: #64748b; margin: 0;">ホテルライクなワイドミラーとタイル貼り。既製品にはない、毎日の身支度が楽しくなるアトリエデザイン。</p>
          </div>
        </div>
      </div>

      <!-- 確定平面図からの立体化ギャラリー -->
      <h2 class="lp-h2" style="border-left: 5px solid #0284c7; margin-top: 3.5rem;">3. 確定図面をもとにした多角的な立体化（平面図確定後）</h2>
      <p style="font-size: 1rem; color: #334155;">
        平面図の寸法と開口位置を100%固定したまま、施主が望むあらゆるアングルから立体化を行います。
      </p>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.2rem; margin: 2rem 0;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem;">
          <div style="font-size: 1.8rem; margin-bottom: 0.4rem;">📐</div>
          <h4 style="color: #0f172a; margin: 0 0 0.5rem; font-size: 1.05rem;">真上からの3Dフロアプラン</h4>
          <p style="font-size: 0.85rem; color: #64748b; margin: 0;">間取り図の壁が立体的に立ち上がり、無垢床の木目の向きや造作家具のサイズ感が一目で把握できます。</p>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem;">
          <div style="font-size: 1.8rem; margin-bottom: 0.4rem;">🦅</div>
          <h4 style="color: #0f172a; margin: 0 0 0.5rem; font-size: 1.05rem;">屋根を外した立体鳥観図</h4>
          <p style="font-size: 0.85rem; color: #64748b; margin: 0;">斜め上空からのアイソメトリック視点。家族の生活動線や各部屋のつながりを俯瞰で確認できます。</p>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem;">
          <div style="font-size: 1.8rem; margin-bottom: 0.4rem;">👀</div>
          <h4 style="color: #0f172a; margin: 0 0 0.5rem; font-size: 1.05rem;">生活視点の内観パース</h4>
          <p style="font-size: 0.85rem; color: #64748b; margin: 0;">「対面キッチンに立った時の視界」「ソファに座った時の吹き抜けの広がり」など、自由なアングルを指定可能。</p>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem;">
          <div style="font-size: 1.8rem; margin-bottom: 0.4rem;">🏛️</div>
          <h4 style="color: #0f172a; margin: 0 0 0.5rem; font-size: 1.05rem;">空間断面・温熱空気の流れ</h4>
          <p style="font-size: 0.85rem; color: #64748b; margin: 0;">1階から2階、小屋裏エアコンまでの空気の循環ルートや、冬の日射取得・夏の日射遮蔽を立体視。</p>
        </div>
      </div>

      <!-- 実際の施工例とAIパースの対比実証（100%具現化の証明） -->
      <h2 class="lp-h2" style="border-left: 5px solid #d97706; margin-top: 3.5rem;">4. 「AIが描いた夢」を「大工の手」で100%現実化する技術力</h2>
      <p style="font-size: 1rem; color: #334155;">
        CGパースは綺麗でも、実際の家が安っぽいプレハブ造りでは意味がありません。<br>
        住ま居るは、手刻み大工と構造計算の自社タッグにより、<strong>AIパースで描いた意匠を寸分の狂いもなく現実に具現化</strong>します。
      </p>

      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.8rem; margin: 2rem 0; box-shadow: 0 6px 25px rgba(0,0,0,0.04);">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; align-items: center;">
          <div>
            <div style="font-size: 0.82rem; font-weight: 800; color: #0284c7; margin-bottom: 0.4rem;">AIパース工房で施主と描いたビジョン</div>
            <img src="/renders/render_living_%E5%90%B9%E3%81%8D%E6%8A%9C%E3%81%91.jpg" alt="AIパース構想" style="width: 100%; height: 240px; object-fit: cover; border-radius: 10px;" onerror="this.src='/images/cases_real/case1/photo_02.jpg'" />
            <p style="font-size: 0.82rem; color: #64748b; margin-top: 0.5rem;">高天井・無垢梁・珪藻土塗り壁の温もり構想</p>
          </div>
          <div style="text-align: center; font-size: 1.8rem; color: #d97706; font-weight: 900;">
            VS<br><span style="font-size: 0.85rem; color: #059669; font-weight: 800;">100%具現化</span>
          </div>
          <div>
            <div style="font-size: 0.82rem; font-weight: 800; color: #059669; margin-bottom: 0.4rem;">実際の完成邸宅（鶴ヶ島市・S様邸実物写真）</div>
            <img src="/images/cases_real/case1/photo_01.jpg" alt="S様邸完成写真" style="width: 100%; height: 240px; object-fit: cover; border-radius: 10px;" />
            <p style="font-size: 0.82rem; color: #64748b; margin-top: 0.5rem;">手刻み大工と許容応力度計算により完全再現された天井高2.8mの大空間</p>
          </div>
        </div>
      </div>

      <!-- ハードウェア＆セキュリティ解説 -->
      <div class="lp-highlight-box" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-left: 6px solid #0f172a; margin: 3rem 0; padding: 2rem;">
        <h3 style="margin-top: 0; color: #0f172a; font-size: 1.18rem; display: flex; align-items: center; gap: 8px;">
          <span>🖥️</span> 代表専用 Dell Precision 3680（GPU生成基盤）と順番待ち制御
        </h3>
        <p style="font-size: 0.92rem; color: #475569; line-height: 1.8; margin-bottom: 0.8rem;">
          パースの画像生成は、外部のクラウド企業や不特定多数の共用サーバーへ図面を流出させることなく、<strong>代表設計室の専用ハイエンドワークステーション「Dell Precision 3680（NVIDIA GPU）」</strong>上にて完全クローズドで安全に実行されます。<br>
          サーバー過負荷やPCフリーズを防止するため、1家族様あたりの同時生成リクエストは<strong>最大3枚までの順番待ち制御</strong>を行っております。生成ボタンを押してから約1〜2分で高精細パースがカルテに自動反映されます。
        </p>
      </div>

      <!-- 設計申込案内（CTA） -->
      <div class="lp-cta-box" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #312e81 100%); border: 1px solid rgba(251, 191, 36, 0.3);">
        <span style="background: rgba(251, 191, 36, 0.2); color: #fbbf24; font-weight: 800; padding: 4px 14px; border-radius: 20px; font-size: 0.85rem; border: 1px solid rgba(251, 191, 36, 0.4);">
          📐 15万円の設計お申し込みで、本機能をフル開放
        </span>
        <h2 style="font-size: 1.9rem; margin: 1.2rem 0 0.6rem; color: #fff;">
          まずは「家づくりの流れ」をご確認ください
        </h2>
        <p style="color: #cbd5e1; font-size: 1rem; max-width: 720px; margin: 0 auto; line-height: 1.8;">
          15万円の設計お申し込みをいただきますと、JFD社による3次元点群測量、役所調査、代表による確定平面図作図に加え、この「AIパース工房」が無制限でご利用可能になります。<br>
          申込金の返金規定や詳細なスケジュールは、以下の専用ページにて包み隠さず公開しております。
        </p>
        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-top: 2rem;">
          <a href="/flow/" class="lp-cta-btn" style="background: linear-gradient(135deg, #d97706, #f59e0b); font-weight: 800; font-size: 1.05rem;">
            📐 家づくりの流れ・15万設計申込特典を見る ➜
          </a>
          <button type="button" onclick="openCarteLoginModal()" class="lp-cta-btn" style="background: rgba(255, 255, 255, 0.15); border: 1.5px solid rgba(255, 255, 255, 0.3); font-weight: 800; font-size: 1.05rem; cursor: pointer;">
            👤 お施主様マイカルテ ログイン ➜
          </button>
        </div>
      </div>

      <!-- マジックリンク ログインモーダル -->
      <div id="carte-login-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); z-index: 9999; align-items: center; justify-content: center; padding: 1.5rem;">
        <div style="background: #ffffff; border-radius: 20px; max-width: 480px; width: 100%; padding: 2.5rem; box-shadow: 0 25px 60px rgba(0,0,0,0.4); position: relative;">
          <button type="button" onclick="closeCarteLoginModal()" style="position: absolute; top: 18px; right: 20px; background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer;">&times;</button>
          
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🏠</div>
            <h3 style="font-size: 1.4rem; font-weight: 800; color: #0f172a; margin: 0;">家カルテ・マジックリンクログイン</h3>
            <p style="font-size: 0.86rem; color: #64748b; margin-top: 0.4rem;">設計お申し込み時にお伺いしたメールアドレスでログインできます。<br>パスワード不要のワンタイムURLをお届けします。</p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 0.6rem 0.8rem; margin-top: 0.8rem; font-size: 0.8rem; color: #166534; text-align: left; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.2rem;">💬</span>
              <span><strong>公式LINE友だち登録（新規開設予定）：</strong>公式LINEへご登録いただくと、Dell Precision 3680で生成されたパースの完成通知や確定図面がスマホLINEへ直接届くようになります。</span>
            </div>
          </div>

          <form id="magic-login-form" onsubmit="handleMagicLoginSubmit(event)">
            <div style="margin-bottom: 1.2rem;">
              <label style="display: block; font-size: 0.88rem; font-weight: 700; color: #334155; margin-bottom: 0.4rem;">お名前</label>
              <input type="text" id="login-user-name" placeholder="例: 鶴ヶ島 太郎" required style="width: 100%; padding: 0.75rem 1rem; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;" />
            </div>
            <div style="margin-bottom: 1.2rem;">
              <label style="display: block; font-size: 0.88rem; font-weight: 700; color: #334155; margin-bottom: 0.4rem;">メールアドレス（夫または妻）</label>
              <input type="email" id="login-user-email" placeholder="example@gmail.com" required style="width: 100%; padding: 0.75rem 1rem; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;" />
            </div>
            <div style="margin-bottom: 1.8rem;">
              <label style="display: block; font-size: 0.88rem; font-weight: 700; color: #334155; margin-bottom: 0.4rem;">お電話番号</label>
              <input type="tel" id="login-user-phone" placeholder="090-1234-5678" required style="width: 100%; padding: 0.75rem 1rem; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;" />
            </div>
            <button type="submit" id="btn-submit-magic-login" style="width: 100%; background: linear-gradient(135deg, #d97706, #f59e0b); color: #ffffff; font-weight: 800; font-size: 1.05rem; padding: 0.85rem; border: none; border-radius: 10px; cursor: pointer; box-shadow: 0 4px 15px rgba(217, 119, 6, 0.4);">
              マジックリンクを送信して入室 ➜
            </button>
            <div id="login-result-msg" style="margin-top: 1rem; font-size: 0.85rem; text-align: center; display: none;"></div>
          </form>
        </div>
      </div>

      <script>
        function openCarteLoginModal() {
          const m = document.getElementById('carte-login-modal');
          if (m) m.style.display = 'flex';
        }
        function closeCarteLoginModal() {
          const m = document.getElementById('carte-login-modal');
          if (m) m.style.display = 'none';
        }
        async function handleMagicLoginSubmit(e) {
          e.preventDefault();
          const btn = document.getElementById('btn-submit-magic-login');
          const msg = document.getElementById('login-result-msg');
          const name = document.getElementById('login-user-name').value;
          const email = document.getElementById('login-user-email').value;
          const phone = document.getElementById('login-user-phone').value;

          btn.disabled = true;
          btn.innerText = 'ログインリンク発行中...';
          msg.style.display = 'none';

          try {
            const res = await fetch('/api/auth/magic-link', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, email, phone })
            });
            const data = await res.json();
            if (data.success) {
              msg.style.color = '#059669';
              msg.style.display = 'block';
              msg.innerHTML = '<strong>ログイン用リンクを発行しました！</strong><br>マイカルテを開きます...';
              localStorage.setItem('sumaile_user_token', data.token);
              localStorage.setItem('sumaile_user_id', data.user.id);
              setTimeout(() => {
                window.location.href = '/madori-consultation/?token=' + data.token;
              }, 1200);
            } else {
              throw new Error(data.error || 'ログインに失敗しました');
            }
          } catch (err) {
            msg.style.color = '#dc2626';
            msg.style.display = 'block';
            msg.innerText = err.message;
            btn.disabled = false;
            btn.innerText = 'マジックリンクを送信して入室 ➜';
          }
        }
      </script>
    """

    html = get_common_layout(
        title="AIパース工房＆建築特化型AIサービス｜株式会社住ま居る【埼玉】",
        description="埼玉限定・完全無料。対話型AIとStable Diffusionが理想の外観・内観パースを即時生成。マジックリンク専用チャットでプラン相談から見積まで営業マンなしで完結。",
        canonical_url="https://t-smile.co.jp/ai-studio/",
        og_image="https://t-smile.co.jp/images/hero_kaguya_house.jpg",
        breadcrumbs=[("🏠 ホーム", "/"), ("🎨 AIパース工房", "")],
        content_html=content,
        active_nav='ai-studio'
    )
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(html)
    return "https://t-smile.co.jp/ai-studio/"


def generate_award_story_page():
    """埼玉県環境住宅賞 受賞実話ストーリー 静的SEOページ生成"""
    out_dir = os.path.join(PUBLIC_DIR, 'awards', 'kankyo-housing')
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, 'index.html')

    content = """
      <span class="lp-hero-tag" style="background: #fef3c7; color: #92400e; border: 1px solid #fde68a;">
        🏆 埼玉県環境住宅賞 受賞・奇跡の実話ストーリー
      </span>
      <h1 class="lp-h1">「賞を頂いてしまいました」<br><span style="color: #d97706; font-size: 1.55rem; display: inline-block; margin-top: 0.4rem;">お引渡しから4年後、お施主様から届いた一通のメール。</span></h1>
      <p class="lp-lead">
        住宅業界のアワードの多くは、工務店が宣伝のために自ら応募するものです。<br>
        しかしこの物語は違います。2019年に戸田市で新築されたお施主様が、4年間暮らして「この家の快適さと省エネ性は本物だ」と実感し、工務店に知らせることなく自ら県へ応募して受賞された——私たちの誇りと絆の記録です。
      </p>

      <div class="lp-highlight-box" style="background: #f8fafc; border-left: 6px solid #d97706; margin-bottom: 2.5rem; padding: 1.8rem;">
        <h3 style="margin-top: 0; color: #92400e; font-size: 1.15rem; display: flex; align-items: center; gap: 8px;">
          <span>📩</span> 2023年11月、社長のパソコンに届いた一通のメール
        </h3>
        <p style="font-size: 0.95rem; color: #334155; line-height: 1.8; margin-bottom: 1rem;">
          出張と現場で慌ただしく駆け回っていた代表・菅原のメールボックスに、懐かしいお名前からのメールが届きました。<br>
          差出人は、4年前に埼玉県戸田市でご自宅を新築されたH様。件名には『【要返信】埼玉県環境住宅賞に関して』とありました。
        </p>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.2rem 1.4rem; font-family: monospace; font-size: 0.88rem; color: #1e293b; line-height: 1.7; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
          <strong>差出人:</strong> 戸田市・H様<br>
          <strong>件名:</strong> 【要返信】埼玉県環境住宅賞に関して<br>
          --------------------------------------------------<br>
          菅原社長<br>
          ご無沙汰しております。2019年に戸田市で建築させて頂いたHです。<br>
          突然の連絡で申し訳ございません。<br><br>
          埼玉県環境住宅賞というものがあり、特に賞を取らなければ建築先も公開されないので応募したのですが、<strong>賞を頂いてしまいました。</strong><br><br>
          そこで<br>
          ① 建築先として公開しても良いでしょうか。<br>
          （もしご迷惑であれば賞の取消をお願いしてみます）<br>
          ② 公開可の場合、<br>
          設計者: すまいる設計<br>
          施工者: ㈱住ま居る で間違いないでしょうか。<br>
          ③ 授賞式が12/22の午後、浦和駅付近で予定されており、参加される場合にはご連絡ください。
        </div>
      </div>

      <h2 class="lp-h2">1. 「恥ずかしい限りです」——技術バカな工務店社長の飾らない本音</h2>
      <p>
        思わず、画面の前で息を呑みました。<br>
        「賞を頂いてしまいました」という、どこまでも控えめで謙虚なご報告。そして「もしご迷惑であれば賞の取消をお願いしてみます」という、私たち工務店への温かなお気遣い。<br>
        私たち住ま居るは、賞を獲るための見栄えだけのデザイン住宅を造る会社ではありません。派手な広告宣伝やコンテストには無頓着で、ただひたすら埼玉の過酷な気候の中で、真冬も素足で笑って過ごせる温かい家を手づくりすることだけに没頭してきた職人集団です。
      </p>
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 1.2rem 1.4rem; font-family: monospace; font-size: 0.88rem; color: #065f46; line-height: 1.7; margin: 1.5rem 0;">
        <strong>返信:</strong> 株式会社住ま居る 代表・菅原より<br>
        --------------------------------------------------<br>
        H様がお申し込みされたという「埼玉県環境住宅賞」について、当方は全くの無知で恥ずかしい限りです。<br>
        しかしながら、H様が4年経った今もご自宅をお気に召していただき、大切に暮らしてくださっていることが伝わり胸が熱くなるほど嬉しく存じます。<br><br>
        世間では住宅価格や電気代のとんでもない高騰に見舞われておりますが、それでも「光熱費をなるべく抑え、冬暖かく暮らしたい」というご要望にはマッチする工務店であると自負致しており、なんとかやっております。<br>
        そんな埼玉県環境住宅賞であれば、喜んで弊社の情報を掲載してください！
      </div>

      <h2 class="lp-h2">2. なぜH様は、住んで4年目に県へ応募してくださったのか？</h2>
      <p>
        戸田市に建てられたH様邸には、住ま居るが創業以来貫いてきた「見えない工学と職人技術」が息づいていました。
      </p>
      <div class="lp-badge-grid">
        <div class="lp-badge-card" style="text-align: left;">
          <h4 style="margin: 0 0 0.5rem; color: #0284c7;">❄️ 冬の底冷えを寄せ付けない外皮</h4>
          <p style="font-size: 0.85rem; color: #475569; margin: 0;">
            埼玉特有の刺すようなからっ風をシャットアウトする付加断熱と樹脂サッシ。エアコン1台で家中が均一に暖まります。
          </p>
        </div>
        <div class="lp-badge-card" style="text-align: left;">
          <h4 style="margin: 0 0 0.5rem; color: #059669;">☀️ 太陽熱と風を計算したパッシブ設計</h4>
          <p style="font-size: 0.85rem; color: #475569; margin: 0;">
            冬の陽だまりを室内の奥深くまで取り込み、夏は深い軒で直射を遮る。自然エネルギーを味方にする建築知見。
          </p>
        </div>
        <div class="lp-badge-card" style="text-align: left;">
          <h4 style="margin: 0 0 0.5rem; color: #d97706;">💡 光熱費高騰の時代に際立つ超省エネ性</h4>
          <p style="font-size: 0.85rem; color: #475569; margin: 0;">
            真冬の電気代明細に驚き、4年間暮らす中で「この家の温熱性能は本物だ」と確信を深めていただきました。
          </p>
        </div>
      </div>
      <p style="margin-top: 1.2rem;">
        「自分たちが選んだ工務店の手仕事は、本当に間違いなかった」「この住み心地の素晴らしさを、もっと多くの人に知ってほしい」。そんなお施主様の誇りと愛情があったからこそ、ご自身の手で応募用紙をまとめ、県の環境住宅賞へと届けてくださったのです。
      </p>

      <h2 class="lp-h2">3. 12月の浦和。4年目の授賞式に、弊社の営業担当が駆けつけた日</h2>
      <p>
        2023年12月22日、冬晴れの浦和駅前。<br>
        埼玉県環境住宅賞の表彰式会場には、晴れやかな笑顔のH様とともに、<strong>株式会社住ま居るの営業担当者</strong>の姿がありました。<br>
        多くの大手ハウスメーカーでは、契約が終われば営業担当と顔を合わせる機会は減り、4年も経てば異動や退職で連絡がつかなくなることも珍しくありません。
      </p>
      <p>
        しかし、地域密着で一棟一棟を手づくりする私たちにとって、<strong>お引渡しは「一生のお付き合いの始まり」</strong>です。<br>
        「H様、本当におめでとうございます！」「住ま居るさんのおかげですよ」——公の場で晴れやかに表彰されるお施主様のお姿を、心からの誇りと感謝を持って見守りました。4年という歳月を経て、お施主様と私たちが同じ誇りを分かち合えたこの日は、会社にとっても生涯忘れられない宝物となりました。
      </p>

      <div class="lp-highlight-box" style="margin-top: 2.5rem; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #fff; border: 2px solid #d4af37;">
        <h3 style="margin-top: 0; color: #fbbf24; font-size: 1.25rem;">私たちが造っているのは「賞を獲るための家」ではない</h3>
        <p style="color: #e2e8f0; line-height: 1.9; margin-bottom: 1.2rem;">
          私たちは、建築業界の賞を獲るために家を建てているわけではありません。奇抜で見栄えだけのデザインを競うつもりもありません。<br>
          私たちが造りたいのは、<strong>お引渡しから4年経っても、10年経っても、30年経っても、お施主様が「この家で暮らせて本当に幸せだ」と胸を張り、誰かに伝えたくなる本物の住まい</strong>です。
        </p>
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <a href="/#scent-experience" class="lp-cta-btn" style="background: linear-gradient(135deg, #d97706, #f59e0b); color: #0f172a; font-weight: 800;">
            🌿 芳彩（かぐや）実物モデルハウスを見学する →
          </a>
          <a href="/#credlayer" class="lp-cta-btn" style="background: rgba(255,255,255,0.15); color: #fff; border: 1px solid rgba(255,255,255,0.3);">
            🛡️ 家族を守る5つの安心証明を見る →
          </a>
        </div>
      </div>
    """

    html = get_common_layout(
        title="【実話】「賞を頂いてしまいました」お引渡し4年後に届いたメールと埼玉県環境住宅賞｜株式会社住ま居る",
        description="2019年に戸田市で新築されたH様から4年後に届いた一通のメール。工務店が知らなかった埼玉県環境住宅賞をお施主様が自ら応募・受賞された奇跡の実話と、浦和での授賞式レポート。",
        canonical_url="https://t-smile.co.jp/awards/kankyo-housing/",
        og_image="https://t-smile.co.jp/images/hero_kaguya_house.jpg",
        breadcrumbs=[("🏠 ホーム", "/"), ("🛡️ 信頼実証", "/#credlayer"), ("🏆 埼玉県環境住宅賞 受賞ストーリー", "")],
        content_html=content,
        active_nav='credlayer'
    )
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(html)
    return "https://t-smile.co.jp/awards/kankyo-housing/"


def generate_thermal_pillar_page():
    """温熱知見200選の総合ピラー親ページを生成"""
    qa_path = os.path.join(PUBLIC_DIR, 'data', 'thermal_qa_200.json')
    if not os.path.exists(qa_path):
        return None

    with open(qa_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    questions = data.get('questions', [])
    grouped = {}
    for q in questions:
        cname = q.get('categoryName', 'その他')
        if cname not in grouped:
            grouped[cname] = []
        grouped[cname].append(q)

    out_dir = os.path.join(PUBLIC_DIR, 'knowledge', 'thermal')
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, 'index.html')

    cat_sections = []
    for cname, q_list in grouped.items():
        q_links = []
        for q in q_list:
            q_id = q.get('id')
            q_title = q.get('question')
            q_ans = q.get('shortAnswer', '')
            q_links.append(f"""
              <li style="margin-bottom: 0.9rem; padding-bottom: 0.8rem; border-bottom: 1px dashed #e2e8f0;">
                <a href="/knowledge/thermal/{q_id}.html" style="color: #0369a1; font-weight: 700; text-decoration: none; font-size: 0.98rem; display: block; margin-bottom: 0.2rem;">
                  Q{q.get('questionNumber', '')}. {q_title}
                </a>
                <span style="font-size: 0.85rem; color: #64748b; line-height: 1.5; display: block;">
                  💡 {q_ans}
                </span>
              </li>
            """)
        
        q_list_html = ''.join(q_links)
        cat_sections.append(f"""
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.8rem; margin-bottom: 2rem; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-bottom: 1rem; border-bottom: 2px solid #10b981; padding-bottom: 0.6rem;">
              <h2 style="font-size: 1.35rem; font-weight: 800; color: #0f172a; margin: 0;">
                📂 {cname}
              </h2>
              <span style="background: #ecfdf5; color: #059669; font-weight: 800; font-size: 0.8rem; padding: 2px 10px; border-radius: 20px;">
                全{len(q_list)}問
              </span>
            </div>
            <ul style="list-style: none; padding: 0; margin: 0;">
              {q_list_html}
            </ul>
          </div>
        """)

    cat_html = ''.join(cat_sections)

    content = f"""
      <span class="lp-hero-tag">💬 埼玉の現場知見データベース</span>
      <h1 class="lp-h1">温熱設計・気密・換気 実務知見200選</h1>
      <p class="lp-lead">
        ネット上に溢れる誤った解釈や偏ったポジショントークに惑わされないために。<br>
        埼玉県西部の過酷な気候風土の中で、30年にわたり数々の失敗と試行錯誤を重ねて辿り着いた現場実務の知見（全200項目）を余すことなく完全公開しています。
      </p>

      <div class="lp-highlight-box" style="margin-bottom: 2.5rem;">
        <h3 style="margin-top: 0; color: #065f46; font-size: 1.15rem;">🤖 24時間365日、AI温熱建築士に深掘り相談できます</h3>
        <p style="margin-bottom: 0.8rem; font-size: 0.95rem; color: #334155;">
          この200項目の知見をベースに学習した「24h温熱換気AI相談室」が、あなたの疑問にいつでも客観的・忖度なしでお答えします。登録不要・無料で今すぐチャット可能です。
        </p>
        <a href="/#thermal-consultation" class="lp-cta-btn" style="padding: 0.7rem 1.6rem; font-size: 0.95rem; display: inline-block;">
          💬 AI温熱相談室で直接質問する ➜
        </a>
      </div>

      <div style="margin-top: 2rem;">
        {cat_html}
      </div>
    """

    html = get_common_layout(
        title="温熱設計・気密・換気 実務知見200選｜株式会社住ま居る【埼玉】",
        description="埼玉の気候風土を制する高気密高断熱の実務知見200選。UA値、C値、基礎断熱、第1種換気、サッシ結露、過乾燥対策まで実務者の本音と数値を完全公開。",
        canonical_url="https://t-smile.co.jp/knowledge/thermal/",
        og_image="https://t-smile.co.jp/images/hero_kaguya_house.jpg",
        breadcrumbs=[("🏠 ホーム", "/"), ("💬 温熱実務知見200選", "")],
        content_html=content,
        active_nav='thermal'
    )
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(html)
    return "https://t-smile.co.jp/knowledge/thermal/"


def generate_madori_consultation_page():
    """夫婦・家族の間取りなんでも相談 ＆ 家づくりカルテ無料診断専用LPを生成"""
    out_dir = os.path.join(PUBLIC_DIR, 'madori-consultation')
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, 'index.html')

    web_app_ld = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "夫婦のAI間取りなんでも相談＆家づくりカルテ無料診断",
        "url": "https://t-smile.co.jp/madori-consultation/",
        "applicationCategory": "LifestyleApplication",
        "operatingSystem": "All",
        "browserRequirements": "Requires JavaScript. Requires HTML5.",
        "description": "夫と妻それぞれのスマホで直感タップ回答しLINEで共有・合体。意見のズレをAIがプロ視点で融合し、家づくりカルテを即時無料作成するWeb診断システム。",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "JPY"
        },
        "provider": {
            "@type": "Organization",
            "name": "株式会社住ま居る",
            "url": "https://t-smile.co.jp/"
        }
    }

    faq_ld = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": "夫婦で希望の間取りや生活スタイルが合わない時はどう解決しますか？",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "どちらかが我慢する妥協案ではなく、動線と視線のゾーニングによって両立を図ります。例えば、夫の趣味やガレージ動線と、妻の家事時短・パントリー動線を分離することで、お互いのプライバシーと利便性を100%確保できます。"
                }
            },
            {
                "@type": "Question",
                "name": "埼玉での家づくり、車の台数や来客用駐車場・EVはどう計画すべきですか？",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "埼玉西部（鶴ヶ島・川越等）では夫婦1人1台（計2台）が基本です。さらに両親や友人が気兼ねなく停められる来客用1台（計3台）や、アプローチ兼用スペースを確保すると路上駐車トラブルを防げます。将来のEV用200V先行配管も必須です。"
                }
            },
            {
                "@type": "Question",
                "name": "乾太くん（ガス衣類乾燥機）と部屋干し、ランドリー動線の最適解は？",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "共働き世帯には乾太くんまたは除湿乾燥付きランドリールームが圧倒的人気です。ポイントは、乾太くんのすぐ下にスライド収納を設け、隣接するファミリークローゼットへ直結させること。洗濯物をたたむ・運ぶ手間をゼロに短縮できます。"
                }
            },
            {
                "@type": "Question",
                "name": "洗面所と脱衣室・着替え室を分けるメリットは何ですか？",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "朝の身支度渋滞を完全解消できる点です。入浴中や着替え中でも、気兼ねなく洗面台で歯磨きやメイクができます。来客時にも生活感のある洗濯カゴを見せずに手を洗ってもらえる清潔な間取りが完成します。"
                }
            },
            {
                "@type": "Question",
                "name": "電気代が高騰する中、給湯器（お日さまエコキュート）と光熱費はどう選ぶべきですか？",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "深夜電力の値上げにより、従来の夜間沸き上げエコキュートはメリットが減少しました。太陽光発電を載せる場合、昼間の余剰電力でお湯を沸かす『お日さまエコキュート』が最も経済的です。"
                }
            },
            {
                "@type": "Question",
                "name": "階段下の空間活用やペントハウス（PH）、ロフトはどう生かせますか？",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "階段下はお掃除ロボット専用基地や書斎ヌックとして有効活用できます。上部のペントハウス（PH）は、北側でも家全体に自然光を落とし込み、夏場の熱気を抜くパッシブ換気塔（光の井戸）として威力を発揮します。"
                }
            },
            {
                "@type": "Question",
                "name": "家づくりカルテを作成すると、しつこい営業電話や訪問はありますか？",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "一切ありません。住ま居るには営業専属マンがおらず、創業30年間一度も訪問販売や売り込み電話を行っておりません。カルテはお客様ご家族の話し合いツールとして自由にご活用いただけます。"
                }
            }
        ]
    }

    howto_ld = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "夫婦でスマホを使って家づくりカルテを無料作成する手順",
        "description": "夫と妻それぞれのスマホで回答し、LINEで合体してAI融合プランを作成する4ステップ。",
        "step": [
            {
                "@type": "HowToStep",
                "position": 1,
                "name": "スマホで自分モードを選んで直感回答",
                "text": "「夫モード」または「妻モード」を選択し、車や生活動線など7問に直感でタップ回答（所要時間約3分）。"
            },
            {
                "@type": "HowToStep",
                "position": 2,
                "name": "LINEでパートナーに招待リンクを送信",
                "text": "「LINEで招待」ボタンをタップしてパートナーに送信。回答データが暗号化URLで共有されます。"
            },
            {
                "@type": "HowToStep",
                "position": 3,
                "name": "パートナーのスマホで回答合体＆AI融合案提示",
                "text": "パートナーがリンクを開くと回答が自動合体。AIが2人の希望を融合した解決策を即時出力します。"
            },
            {
                "@type": "HowToStep",
                "position": 4,
                "name": "家づくりカルテを出力・モデルハウス見学へ",
                "text": "完成したカルテを画面保存・印刷。モデルハウス見学や設計相談の共通言語としてそのまま持参できます。"
            }
        ]
    }

    extra_head = f"""
  <link rel="stylesheet" href="/css/madori-bot.css" />
  <link rel="stylesheet" href="/css/lifestyle-bot.css" />
  <script type="application/ld+json">
  {json.dumps(web_app_ld, ensure_ascii=False)}
  </script>
  <script type="application/ld+json">
  {json.dumps(faq_ld, ensure_ascii=False)}
  </script>
  <script type="application/ld+json">
  {json.dumps(howto_ld, ensure_ascii=False)}
  </script>
"""

    extra_scripts = """
  <script src="/js/lifestyle-bot.js" defer></script>
"""

    content = """
      <span class="lp-hero-tag" style="background: #f5f3ff; color: #7c3aed; border-color: #ddd6fe;">
        🤖 夫婦・家族で本音整理 ｜ AI間取りなんでも相談 ＆ 家づくりカルテ無料診断
      </span>
      <h1 class="lp-h1">
        「夫のこだわり」と「妻の本音」をプロ視点で融合。<br>
        <span style="color: #7c3aed;">夫婦それぞれのスマホで答える、家づくりカルテ診断</span>
      </h1>
      <p class="lp-lead">
        家づくりを始めた多くのご夫婦が直面する、「意見の食い違い」や「遠慮」。<br>
        「車は何台停める？」「洗濯は部屋干し派？乾太くん派？」「朝の洗面渋滞をどう防ぐ？」「お日さまエコキュートと光熱費の関係は？」<br>
        夫は夫のスマホで、妻は妻のスマホで直感タップ。LINEで送って合体するだけで、<strong>妥協ではなく「両者のいいとこ取り」をするAI融合プラン＆家づくりカルテ</strong>を即時無料で自動生成します。
      </p>

      <!-- 誰でも使える無料3大ツール vs 申込後プレミアム使い分けマップ -->
      <div style="background: #ffffff; border: 2px solid #0284c7; border-radius: 16px; padding: 1.8rem; margin: 2rem 0; box-shadow: 0 4px 20px rgba(2, 132, 199, 0.08);">
        <div style="text-align: center; margin-bottom: 1.2rem;">
          <span style="background: #e0f2fe; color: #0284c7; font-weight: 800; font-size: 0.85rem; padding: 4px 16px; border-radius: 20px; border: 1px solid #bae6fd;">
            🧭 住ま居る AIツールの全体マップ ＆ 正しい使い分け
          </span>
          <h2 style="font-size: 1.45rem; color: #0f172a; margin: 0.6rem 0 0.2rem; font-weight: 900;">
            「どれが無料で、どれが申し込み後？」使い分けが一目でわかるガイド
          </h2>
          <p style="color: #64748b; font-size: 0.9rem; margin: 0;">
            まずは登録不要の【完全無料3大ツール】でご家族の想いを整理。次のステップで【限定プレミアムアトリエ】をご活用いただけます。
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.2rem;">
          <!-- 無料3大ツール -->
          <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 1.4rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.8rem;">
              <span style="background: #16a34a; color: #fff; font-size: 0.78rem; font-weight: 800; padding: 3px 10px; border-radius: 12px;">誰でも今すぐ無料</span>
              <span style="font-size: 1.2rem;">🟢</span>
            </div>
            <h3 style="color: #14532d; font-size: 1.1rem; margin: 0 0 0.6rem; font-weight: 800;">【完全無料】3大AIシミュレーター</h3>
            <ul style="padding-left: 1.2rem; margin: 0; line-height: 1.8; font-size: 0.88rem; color: #166534;">
              <li><strong>🔍 間取りプラン検索（約100選）:</strong> 坪数・予算・平屋等の実例を瞬時絞り込み・比較</li>
              <li><strong>💬 家づくりカルテ（本ページ）:</strong> 夫婦それぞれのスマホで本音を回答、AIが中立カルテ作成</li>
              <li><strong>🌡️ 温熱環境・断熱シミュレーション:</strong> 埼玉エリア特化、HEAT20 G2/G3・光熱費試算</li>
            </ul>
            <div style="margin-top: 0.9rem; font-size: 0.8rem; color: #15803d; font-weight: 700;">
              ※会員登録・名前・電話番号の入力不要。何度でも試せます。
            </div>
          </div>

          <!-- 申込後限定プレミアム -->
          <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 1.4rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.8rem;">
              <span style="background: #0f172a; color: #f59e0b; font-size: 0.78rem; font-weight: 800; padding: 3px 10px; border-radius: 12px;">15万円設計申込後</span>
              <span style="font-size: 1.2rem;">⭐</span>
            </div>
            <h3 style="color: #0f172a; font-size: 1.1rem; margin: 0 0 0.6rem; font-weight: 800;">【限定】プレミアム設計アトリエ</h3>
            <ul style="padding-left: 1.2rem; margin: 0; line-height: 1.8; font-size: 0.88rem; color: #334155;">
              <li><strong>🎨 プロ級AI 3Dパースアトリエ:</strong> 雑誌クオリティの3Dパースが指先ひとつで無制限生成</li>
              <li><strong>🧩 直感バブルプランスタジオ:</strong> パズル感覚で家族の生活動線を画面上でレイアウト</li>
              <li><strong>🛰️ JFD 3次元LiDAR点群測量:</strong> ミリ単位の等高線・現況図（万一不成立でも図面引渡保証）</li>
              <li><strong>🏛️ 菅原代表の構造・設計相談（3回）:</strong> 150棟構造計算のノウハウで安全図面を直接作成</li>
            </ul>
            <div style="margin-top: 0.9rem;">
              <a href="/flow/" style="color: #0284c7; font-weight: 800; font-size: 0.82rem; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                📐 家づくりの流れ・15万円申込特典を詳しく見る →
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- 4コマ漫画イラストで見る体験ストーリー（世代別タブ切り替え） -->
      <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 2px solid #f59e0b; border-radius: 16px; padding: 2.2rem 1.6rem; margin: 2rem 0; box-shadow: 0 10px 30px rgba(245, 158, 11, 0.1);">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <span style="background: #b45309; color: #fff; font-weight: 800; font-size: 0.85rem; padding: 4px 16px; border-radius: 20px;">
            📖 漫画でわかる！夫婦の家づくりカルテ体験記
          </span>
          <h2 style="font-size: 1.65rem; color: #78350f; margin: 0.8rem 0 0.4rem; font-weight: 900;">
            「あ、これ面白い！」から始まる、夫婦の理想の住まいづくり
          </h2>
          <p style="color: #92400e; font-size: 0.95rem; margin: 0 0 1.2rem;">
            なぜ、スマホで答えるだけで「夫婦の意見のズレ」が魔法のように解けるのか？ ご年代に合わせてご覧ください。
          </p>

          <!-- 世代別切り替えスイッチ -->
          <div style="display: inline-flex; background: #fde68a; padding: 4px; border-radius: 30px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
            <button type="button" id="tab-btn-50s" class="carte-persona-btn active" onclick="switchCartePersona('50s')" style="background: #b45309; color: #fff; border: none; padding: 8px 24px; border-radius: 24px; font-weight: 800; font-size: 0.95rem; cursor: pointer; transition: all 0.2s;">
              🍵 50代〜 セカンドライフ・大人の平屋編
            </button>
            <button type="button" id="tab-btn-young" class="carte-persona-btn" onclick="switchCartePersona('young')" style="background: transparent; color: #78350f; border: none; padding: 8px 24px; border-radius: 24px; font-weight: 800; font-size: 0.95rem; cursor: pointer; transition: all 0.2s;">
              🧒 30〜40代 子育て・共働き世帯編
            </button>
          </div>
        </div>

        <!-- パネル1: 50代〜 セカンドライフ・大人の平屋編（初期表示） -->
        <div id="carte-panel-50s" class="carte-persona-panel" style="display: block;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem;">
            
            <!-- コマ1: 50代妻がお茶を飲みながら提案 -->
            <div style="background: #ffffff; border-radius: 12px; border: 1.5px solid #fde68a; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
              <div style="background: #b45309; color: #fff; font-weight: 800; font-size: 0.88rem; padding: 6px 14px; display: flex; justify-content: space-between;">
                <span>第1話：落ち着いたリビングで</span>
                <span>STEP 1</span>
              </div>
              <img src="/images/carte_story_50s/comic_50s_step1.jpg" alt="50代の妻がお茶を飲みながら夫にタブレットを見せて提案する様子" style="width: 100%; height: auto; display: block;" loading="lazy">
              <div style="padding: 1.2rem; flex-grow: 1;">
                <h3 style="font-size: 1.05rem; margin: 0 0 0.5rem; color: #92400e; font-weight: 800;">
                  妻「ほらお父さん、これからの二人の暮らし、ちょっとやってみない？」
                </h3>
                <p style="font-size: 0.85rem; color: #475569; line-height: 1.7; margin: 0;">
                  緑茶を飲みながらタブレットを操作。「子どもたちも独立したし、そろそろ私たちの家を考えない？」。難しい建築用語はなく、直感タップで選ぶだけだからカンタン！
                </p>
              </div>
            </div>

            <!-- コマ2: 50代夫が平屋・断熱を入力 -->
            <div style="background: #ffffff; border-radius: 12px; border: 1.5px solid #fde68a; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
              <div style="background: #16a34a; color: #fff; font-weight: 800; font-size: 0.88rem; padding: 6px 14px; display: flex; justify-content: space-between;">
                <span>第2話：夫がスマホでサクサク回答</span>
                <span>STEP 2</span>
              </div>
              <img src="/images/carte_story_50s/comic_50s_step2.jpg" alt="50代の夫が書斎でスマホを持って平屋や断熱の希望を真剣に入力する様子" style="width: 100%; height: auto; display: block;" loading="lazy">
              <div style="padding: 1.2rem; flex-grow: 1;">
                <h3 style="font-size: 1.05rem; margin: 0 0 0.5rem; color: #166534; font-weight: 800;">
                  夫「老後は階段のない平屋がいいな…ヒートショックのない暖かい家」
                </h3>
                <p style="font-size: 0.85rem; color: #475569; line-height: 1.7; margin: 0;">
                  妻から届いたLINEリンクをタップ。「バリアフリー」「冬も暖かい高断熱」「庭いじり動線」…自分のスマホで落ち着いて回答。アプリの登録も面倒な入力も一切なし！
                </p>
              </div>
            </div>

            <!-- コマ3: 相手に言えなかった本音 -->
            <div style="background: #ffffff; border-radius: 12px; border: 1.5px solid #fde68a; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
              <div style="background: #7c3aed; color: #fff; font-weight: 800; font-size: 0.88rem; padding: 6px 14px; display: flex; justify-content: space-between;">
                <span>第3話：相手に言えない本音もこっそり</span>
                <span>STEP 3</span>
              </div>
              <img src="/images/carte_story_50s/comic_50s_step3.jpg" alt="夫婦それぞれが相手に遠慮していた本音（妻の手芸部屋、夫の庭の見える書斎）を入力する様子" style="width: 100%; height: auto; display: block;" loading="lazy">
              <div style="padding: 1.2rem; flex-grow: 1;">
                <h3 style="font-size: 1.05rem; margin: 0 0 0.5rem; color: #5b21b6; font-weight: 800;">
                  「相手に遠慮して言えなかった本音」も、AIになら書ける！🔓
                </h3>
                <p style="font-size: 0.85rem; color: #475569; line-height: 1.7; margin: 0;">
                  妻「子どもが巣立ったから、実は私の手芸や絵の趣味の小部屋がほしい…」。夫「実は定年後は、庭を眺められる小さな書斎がほしいな…」。長年連れ添ったからこそ言えない希望も、AIがやさしく受け止めます。
                </p>
              </div>
            </div>

            <!-- コマ4: 2人の上質平屋カルテ完成 -->
            <div style="background: #ffffff; border-radius: 12px; border: 1.5px solid #fde68a; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.03); display: flex; flex-direction: column;">
              <div style="background: #0284c7; color: #fff; font-weight: 800; font-size: 0.88rem; padding: 6px 14px; display: flex; justify-content: space-between;">
                <span>第4話：理想の上質カルテ完成！</span>
                <span>STEP 4</span>
              </div>
              <img src="/images/carte_story_50s/comic_50s_step4.jpg" alt="完成した家づくりカルテを見て夫婦で笑顔で喜ぶ様子" style="width: 100%; height: auto; display: block;" loading="lazy">
              <div style="padding: 1.2rem; flex-grow: 1;">
                <h3 style="font-size: 1.05rem; margin: 0 0 0.5rem; color: #0369a1; font-weight: 800;">
                  夫婦「お互いの希望が両方叶ってる！これなら遠慮なく相談できるね！」
                </h3>
                <p style="font-size: 0.85rem; color: #475569; line-height: 1.7; margin: 0;">
                  AIが二人の本音を融合し、趣味部屋と書斎とバリアフリーが両立した平屋カルテを瞬時出力。「どちらかが我慢する妥協」ではない、大人の豊かな暮らしの指針が手に入ります！
                </p>
              </div>
            </div>

          </div>
        </div>

        <!-- パネル2: 30〜40代 子育て・共働き世帯編 -->
        <div id="carte-panel-young" class="carte-persona-panel" style="display: none;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem;">
            
            <!-- コマ1: 妻が夜スタート -->
            <div style="background: #ffffff; border-radius: 12px; border: 1.5px solid #fde68a; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
              <div style="background: #d97706; color: #fff; font-weight: 800; font-size: 0.88rem; padding: 6px 14px; display: flex; justify-content: space-between;">
                <span>第1話：夜のリビングで</span>
                <span>STEP 1</span>
              </div>
              <img src="/images/carte_story/comic_step1_wife.jpg" alt="夜のリビングで妻がスマホで面白がって答える様子" style="width: 100%; height: auto; display: block;" loading="lazy">
              <div style="padding: 1.2rem; flex-grow: 1;">
                <h3 style="font-size: 1.05rem; margin: 0 0 0.5rem; color: #92400e; font-weight: 800;">
                  妻「えっ、何これ？面白い！質問に答えるだけ？」
                </h3>
                <p style="font-size: 0.85rem; color: #475569; line-height: 1.7; margin: 0;">
                  子どもが寝た後の静かな時間、スマホで直感タップ。「日常の車は何台？」「朝7時の洗面台渋滞は？」「乾太くんからファミクロへの直結動線は？」…面倒な文字入力はなく、3分でサクサク回答！
                </p>
              </div>
            </div>

            <!-- コマ2: 夫へLINE共有 -->
            <div style="background: #ffffff; border-radius: 12px; border: 1.5px solid #fde68a; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
              <div style="background: #16a34a; color: #fff; font-weight: 800; font-size: 0.88rem; padding: 6px 14px; display: flex; justify-content: space-between;">
                <span>第2話：夫のスマホにLINE</span>
                <span>STEP 2</span>
              </div>
              <img src="/images/carte_story/comic_step2_husband.jpg" alt="夫のスマホにLINEが届いて回答する様子" style="width: 100%; height: auto; display: block;" loading="lazy">
              <div style="padding: 1.2rem; flex-grow: 1;">
                <h3 style="font-size: 1.05rem; margin: 0 0 0.5rem; color: #166534; font-weight: 800;">
                  夫「お、LINEきた！俺の意見も聞いてくれるの？」
                </h3>
                <p style="font-size: 0.85rem; color: #475569; line-height: 1.7; margin: 0;">
                  妻から送られたLINEリンクをタップ。「駐車場は来客用も欲しい」「将来のEV充電はどうする？」。アプリのインストールも会員登録も不要。夫のスマホでもそのままサクッと回答完了！
                </p>
              </div>
            </div>

            <!-- コマ3: 秘密の本音入力 -->
            <div style="background: #ffffff; border-radius: 12px; border: 1.5px solid #fde68a; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
              <div style="background: #7c3aed; color: #fff; font-weight: 800; font-size: 0.88rem; padding: 6px 14px; display: flex; justify-content: space-between;">
                <span>第3話：秘密の本音（角が立たない）</span>
                <span>STEP 3</span>
              </div>
              <img src="/images/carte_story/comic_step3_secret.jpg" alt="お互いに相手には直接言いにくい本音をこっそり入力" style="width: 100%; height: auto; display: block;" loading="lazy">
              <div style="padding: 1.2rem; flex-grow: 1;">
                <h3 style="font-size: 1.05rem; margin: 0 0 0.5rem; color: #5b21b6; font-weight: 800;">
                  「相手には直接言えない本音」もこっそり…🔓
                </h3>
                <p style="font-size: 0.85rem; color: #475569; line-height: 1.7; margin: 0;">
                  「本当は趣味のスペースが欲しい」「実は水回りの掃除を夫にも分担してほしい」。面と向かって言うと喧嘩になりそうな本音も、AIが設計士にだけ上手な工夫として伝える安心設計！
                </p>
              </div>
            </div>

            <!-- コマ4: AIカルテ出力・夫婦納得 -->
            <div style="background: #ffffff; border-radius: 12px; border: 1.5px solid #fde68a; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.03); display: flex; flex-direction: column;">
              <div style="background: #0284c7; color: #fff; font-weight: 800; font-size: 0.88rem; padding: 6px 14px; display: flex; justify-content: space-between;">
                <span>第4話：AI融合案カルテ提出！</span>
                <span>STEP 4</span>
              </div>
              <img src="/images/carte_story/comic_step4_report.jpg" alt="AIがカルテを出力し夫婦で笑顔で喜ぶ様子" style="width: 100%; height: auto; display: block;" loading="lazy">
              <div style="padding: 1.2rem; flex-grow: 1;">
                <h3 style="font-size: 1.05rem; margin: 0 0 0.5rem; color: #0369a1; font-weight: 800;">
                  夫婦「すごい！これなら二人とも大満足だね！」
                </h3>
                <p style="font-size: 0.85rem; color: #475569; line-height: 1.7; margin: 0;">
                  AIが二人の回答を自動合体！「どちらかが我慢する妥協」ではなく、動線とゾーニングによる「いいとこ取り解決策」を即時出力。このカルテを持ってモデルハウスに行くだけで全て伝わります！
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>

      <script>
      function switchCartePersona(type) {
        var p50s = document.getElementById('carte-panel-50s');
        var pYoung = document.getElementById('carte-panel-young');
        var btn50s = document.getElementById('tab-btn-50s');
        var btnYoung = document.getElementById('tab-btn-young');
        if (type === '50s') {
          if (p50s) p50s.style.display = 'block';
          if (pYoung) pYoung.style.display = 'none';
          if (btn50s) { btn50s.style.background = '#b45309'; btn50s.style.color = '#fff'; }
          if (btnYoung) { btnYoung.style.background = 'transparent'; btnYoung.style.color = '#78350f'; }
        } else {
          if (p50s) p50s.style.display = 'none';
          if (pYoung) pYoung.style.display = 'block';
          if (btnYoung) { btnYoung.style.background = '#d97706'; btnYoung.style.color = '#fff'; }
          if (btn50s) { btn50s.style.background = 'transparent'; btn50s.style.color = '#78350f'; }
        }
      }
      </script>

      <!-- 何ができるのか？何をするのか？の徹底解説 -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 2rem; margin: 2rem 0; box-shadow: 0 6px 25px rgba(0,0,0,0.04);">
        <h2 style="font-size: 1.5rem; color: #0f172a; margin-top: 0; margin-bottom: 1.2rem; border-left: 5px solid #7c3aed; padding-left: 1rem;">
          家づくりカルテで「何ができるのか？」「何をするのか？」
        </h2>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.8rem;">
          <div>
            <h3 style="color: #7c3aed; font-size: 1.2rem; margin-top: 0; display: flex; align-items: center; gap: 8px;">
              <span>🎁</span> このカルテで手に入る「3大メリット」
            </h3>
            <ul style="padding-left: 1.2rem; line-height: 1.9; color: #334155; font-size: 0.95rem;">
              <li><strong>夫婦の意見のズレを完全可視化:</strong> 「車は何台？」「朝の洗面は？」「洗濯は乾太くん派？」など、言葉ではうまく伝えられないこだわりが客観レポートに。</li>
              <li><strong>妥協ではない「プロのAI融合プラン」:</strong> 夫の「趣味・ガレージ」と妻の「家事時短・生活感ゼロ」を、建築のゾーニング手法で両立させる具体策が手に入ります。</li>
              <li><strong>モデルハウス見学の「最強パスポート」:</strong> 何枚もアンケートを書く面倒がゼロに。カルテをスマホで見せるだけで、設計士と阿吽の呼吸で話が進みます。</li>
            </ul>
          </div>

          <div>
            <h3 style="color: #059669; font-size: 1.2rem; margin-top: 0; display: flex; align-items: center; gap: 8px;">
              <span>⚡</span> あなたがすることは「たったこれだけ」
            </h3>
            <ul style="padding-left: 1.2rem; line-height: 1.9; color: #334155; font-size: 0.95rem;">
              <li><strong>所要時間はわずか3分:</strong> 面倒な文字入力はなく、直感タップで選ぶだけ。</li>
              <li><strong>会員登録・個人情報の入力不要:</strong> 電話番号や名前の入力は一切ありません。誰にも邪魔されず、夫婦だけで何度でも試せます。</li>
              <li><strong>LINEでワンタップ共有:</strong> どちらかが回答後、「LINEで招待」を押すだけで、相手のスマホへ安全に引き継がれます。</li>
              <li><strong>しつこい営業電話は完全ゼロ:</strong> 売り込みの電話や訪問は創業30年一度も行っていません。</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- インタラクティブ診断ボット本体マウント部 -->
      <div style="background: #ffffff; border: 2px solid #8b5cf6; border-radius: 16px; padding: 1.8rem 1.2rem; margin: 2rem 0; box-shadow: 0 10px 35px rgba(124, 58, 237, 0.08);">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <span style="background: #7c3aed; color: #fff; font-weight: 800; font-size: 0.82rem; padding: 4px 14px; border-radius: 20px;">
            ✨ 会員登録不要・完全無料 ｜ スマホ・PC両対応
          </span>
          <h2 style="font-size: 1.55rem; color: #4c1d95; margin: 0.7rem 0 0.3rem; font-weight: 800;">
            夫婦の本音＆暮らしAIヒアリング・カルテ作成
          </h2>
          <p style="color: #64748b; font-size: 0.92rem; margin: 0;">
            まずはご自身のモードを選択してスタートしてください。
          </p>
        </div>
        
        <!-- Bot Root Mount Point -->
        <div id="lifestyle-interview-root">
          <div style="padding: 2.5rem; text-align: center; color: #64748b;">
            <p>診断システムを初期化しています...</p>
          </div>
        </div>
      </div>

      <!-- 次のステップへのご案内カード -->
      <div style="background: linear-gradient(135deg, #091e2f 0%, #0f172a 100%); color: #fff; border-radius: 16px; padding: 2.5rem 2rem; margin: 3rem 0 2rem; border: 2px solid #38bdf8; text-align: center;">
        <span style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; font-weight: 800; font-size: 0.85rem; padding: 4px 16px; border-radius: 20px; border: 1px solid rgba(56, 189, 248, 0.4);">
          🗺️ カルテを作成した後のステップ
        </span>
        <h2 style="font-size: 1.65rem; color: #fff; margin: 1rem 0 0.5rem; font-weight: 800;">
          カルテができたらどうする？ 契約までの誠実な進め方
        </h2>
        <p style="color: #cbd5e1; max-width: 780px; margin: 0 auto 1.8rem; font-size: 0.95rem; line-height: 1.8;">
          カルテが完成したら、まずは芳彩モデルハウスで実物体感（無料）。<br>
          その後、契約前に敷地の真実をすべて白日の下に晒す<strong>「15万円の設計お申し込み（JFD 3次元点群測量・現況図・役所調査特典付き）」</strong>へと進みます。万一契約に至らなくても調査図面はお渡しするため、1円も無駄になりません。
        </p>
        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
          <a href="/flow/" class="lp-cta-btn" style="background: linear-gradient(135deg, #0284c7, #38bdf8); color: #fff; font-weight: 800; font-size: 1rem; padding: 0.9rem 2rem;">
            📐 家づくりの流れと15万円設計申込特典を詳しく見る ➜
          </a>
          <a href="/#scent-experience" class="lp-cta-btn" style="background: rgba(255, 255, 255, 0.15); color: #fff; border: 1px solid rgba(255, 255, 255, 0.3); font-size: 1rem; padding: 0.9rem 2rem;">
            🌿 芳彩（かぐや）実物モデルハウス体感予約 ➜
          </a>
        </div>
      </div>

      <h2 class="lp-h2">1. 夫婦の「意見のズレ」をプロはどう解くか？（6大設計知見）</h2>
      <p>間取りで揉めやすい6大テーマについて、株式会社住ま居るが30年・800棟の実務で培った「両立の設計解法」を公開します。</p>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin: 1.8rem 0;">
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
          <h3 style="margin-top: 0; color: #0284c7; font-size: 1.12rem;">🚗 1. 駐車計画：日常2台＋来客用1台</h3>
          <p style="font-size: 0.88rem; color: #475569; line-height: 1.75; margin-bottom: 0;">
            埼玉西部の暮らしでは夫婦1人1台（計2台）が必須。さらに両親や友人が気兼ねなく停められる「来客用1台」をアプローチ兼用で設計。将来のEV用200V先行配管で後悔ゼロに。
          </p>
        </div>

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
          <h3 style="margin-top: 0; color: #059669; font-size: 1.12rem;">🧺 2. 乾太くん × 脱衣室 × ファミクロ直結</h3>
          <p style="font-size: 0.88rem; color: #475569; line-height: 1.75; margin-bottom: 0;">
            「干す・取り込む」作業を完全スキップ。乾太くんの真下にスライド収納を造作し、隣のファミリークローゼットへダイレクト収納。急な来客時も引き戸1枚で生活感を完全隠蔽。
          </p>
        </div>

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
          <h3 style="margin-top: 0; color: #7c3aed; font-size: 1.12rem;">🚿 3. 洗面所と脱衣室・着替え室の分離</h3>
          <p style="font-size: 0.88rem; color: #475569; line-height: 1.75; margin-bottom: 0;">
            朝7時の身支度渋滞を完全解決。家族が入浴中でも気兼ねなくメイクや歯磨きが可能。幅1200mmカウンターなら大人2人がストレスなく並んで身支度できます。
          </p>
        </div>

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
          <h3 style="margin-top: 0; color: #d97706; font-size: 1.12rem;">⚡ 4. 太陽光 × お日さまエコキュート</h3>
          <p style="font-size: 0.88rem; color: #475569; line-height: 1.75; margin-bottom: 0;">
            電気代高騰の時代、深夜電力でお湯を沸かす従来方式は損。昼間の太陽光発電の余剰電力を自家消費してお湯を沸かす「お日さまエコキュート」で光熱費を極小化。
          </p>
        </div>

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
          <h3 style="margin-top: 0; color: #0891b2; font-size: 1.12rem;">🪜 5. 階段下ヌック・ルンバ基地 ＆ 屋上PH</h3>
          <p style="font-size: 0.88rem; color: #475569; line-height: 1.75; margin-bottom: 0;">
            階段下にお掃除ロボット専用コンセント基地や読書ヌックを配置。上部ペントハウス（PH）は北側でも家全体に柔らかな自然光を落とし込むパッシブ換気塔に。
          </p>
        </div>

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
          <h3 style="margin-top: 0; color: #db2777; font-size: 1.12rem;">🤫 6. 秘密の本音：設計士にだけ伝える大人の工夫</h3>
          <p style="font-size: 0.88rem; color: #475569; line-height: 1.75; margin-bottom: 0;">
            「パートナーには直接言いにくい…」という要望も、AIが間取りの工夫として設計士にだけ伝える安全設計。角を立てずに理想の住空間を実現します。
          </p>
        </div>
      </div>

      <h2 class="lp-h2">2. よくあるご質問（FAQ）</h2>
      <div style="margin: 1.8rem 0;">
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.4rem; margin-bottom: 1rem;">
          <h3 style="margin-top: 0; font-size: 1.05rem; color: #0f172a;">Q. 夫婦で希望の間取りや好みが正反対なのですが、どうすれば良いですか？</h3>
          <p style="font-size: 0.92rem; color: #475569; margin-bottom: 0; line-height: 1.75;">
            A. どちらかが我慢する「妥協」をする必要はありません。動線（誰がどこを通るか）と視線（どこから何が見えるか）を正しくゾーニングすれば、夫の趣味空間と妻の生活感ゼロ空間は100%両立できます。本ツールのAI融合案をぜひご活用ください。
          </p>
        </div>

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.4rem; margin-bottom: 1rem;">
          <h3 style="margin-top: 0; font-size: 1.05rem; color: #0f172a;">Q. 家づくりカルテを作ったら、しつこい営業電話や訪問はありますか？</h3>
          <p style="font-size: 0.92rem; color: #475569; margin-bottom: 0; line-height: 1.75;">
            A. 一切ありません。株式会社住ま居るには営業専属マンがおらず、創業30年間、訪問販売や押し売り営業は一度も行っておりません。カルテはお客様ご家族の話し合いツールとして、いつでも何度でも自由にお使いいただけます。
          </p>
        </div>

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.4rem; margin-bottom: 1rem;">
          <h3 style="margin-top: 0; font-size: 1.05rem; color: #0f172a;">Q. 夫のスマホと妻のスマホで別々に回答して合体できますか？</h3>
          <p style="font-size: 0.92rem; color: #475569; margin-bottom: 0; line-height: 1.75;">
            A. はい、可能です。どちらかが回答した後、「LINEで招待」ボタンを押してURLを送信してください。パートナーがそのURLを開くだけで、会員登録なしで2人のデータが安全に合体されます。
          </p>
        </div>
      </div>

      <h2 class="lp-h2">3. 株式会社住ま居るの技術者直営体制</h2>
      <div style="background: #ffffff; border: 2px solid #059669; border-radius: 12px; padding: 2rem; margin: 2rem 0; box-shadow: 0 4px 20px rgba(5,150,105,0.06);">
        <h3 style="color: #065f46; margin-top: 0; font-size: 1.25rem;">営業マンゼロ。国家資格と工学データで建てる地域工務店</h3>
        <p style="color: #334155; line-height: 1.85; font-size: 0.95rem;">
          私たちは、派手な営業マンやアットホームな家族経営の情緒だけを売りにする工務店ではありません。<br>
          設計は、<strong>全国から年間150件の許容応力度構造計算審査を受託する二級建築士・菅原代表</strong>が責任を持って直接担当。<br>
          施工は、<strong>2級建築施工管理技士および第二種電気工事士の資格を持つ現場監督（弟）</strong>が徹底監理。<br>
          法務・資金計画は、<strong>宅地建物取引士（妻）</strong>が確かな専門知識でサポートいたします。<br>
          モデルハウスには営業経験の長いベテラン女性スタッフ2名が温かくお迎えし、押し売りや無理な営業は一切ありませんので、どうぞ安心してお立ち寄りください。
        </p>

        <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 1.5rem;">
          <a href="/#scent-experience" class="lp-cta-btn" style="background: linear-gradient(135deg, #059669, #10b981); color: #fff; font-size: 0.95rem; padding: 0.8rem 1.6rem;">
            🌿 芳彩（かぐや）実物モデルハウス体感予約 ➜
          </a>
          <a href="/about/" class="lp-cta-btn" style="background: #f1f5f9; color: #1e293b; border: 1px solid #cbd5e1; font-size: 0.95rem; padding: 0.8rem 1.6rem; box-shadow: none;">
            🛡️ 会社概要・信用の証明（CredLayer）を見る ➜
          </a>
        </div>
      </div>
    """

    html = get_common_layout(
        title="【夫婦・家族で本音整理】AI間取りなんでも相談＆家づくりカルテ無料診断｜株式会社住ま居る【埼玉】",
        description="夫と妻それぞれのスマホで回答し、LINEで共有・合体！車・駐車場、朝の洗面動線、乾太くん・洗濯、着替え室、給湯器と光熱費、階段室・PHまで、夫婦の意見のズレをAIがプロ視点で融合し「家づくりカルテ」を即時無料作成。埼玉県鶴ヶ島・川越の技術工務店・住ま居る。",
        canonical_url="https://t-smile.co.jp/madori-consultation/",
        og_image="https://t-smile.co.jp/images/hero_kaguya_house.jpg",
        breadcrumbs=[("🏠 ホーム", "/"), ("🤖 間取りなんでも相談＆家づくりカルテ", "")],
        content_html=content,
        active_nav='madori',
        extra_head=extra_head,
        extra_scripts=extra_scripts
    )
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(html)
    return "https://t-smile.co.jp/madori-consultation/"


def generate_flow_page():
    """家づくりの流れ ＆ 15万円設計申込特典（JFD 3次元点群測量・現況図）解説LPを生成"""
    out_dir = os.path.join(PUBLIC_DIR, 'flow')
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, 'index.html')

    howto_ld = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "住ま居るの家づくりの進め方と15万円設計申込フロー",
        "description": "無料の家づくりカルテ・モデルハウス見学から、15万円の設計お申し込み（JFD 3D点群測量・行政調査・地盤確認）、バブルプラン＆3Dパース活用、3回の設計打合せ、ご契約までの全フロー。",
        "step": [
            {
                "@type": "HowToStep",
                "position": 1,
                "name": "家づくりカルテで夫婦の本音整理（無料）",
                "text": "夫婦それぞれのスマホで直感タップ回答しLINEで合体。意見のズレと融合案を客観カルテ化。"
            },
            {
                "@type": "HowToStep",
                "position": 2,
                "name": "芳彩（かぐや）モデルハウス体感見学（無料）",
                "text": "無垢のヒノキや超高断熱を五感で体感。ベテラン女性スタッフが温かく案内し、売り込み営業はゼロ。カルテを見せるだけで要望が100%伝わります。"
            },
            {
                "@type": "HowToStep",
                "position": 3,
                "name": "設計お申し込み（15万円・JFD 3D点群測量特典）",
                "text": "敷地の真実を明らかにする実地調査。7GBの3次元点群データ、役所行政調査、地盤確認。万一契約に至らなくても調査図面はお渡しします。"
            },
            {
                "@type": "HowToStep",
                "position": 4,
                "name": "申込者限定アトリエ解放（バブルプラン＆Gemini 3Dパース）",
                "text": "間取りゾーニングツールや、Gemini APIを活用した住ま居る特化3Dパース生成を使い放題で理想の空間をシミュレーション。"
            },
            {
                "@type": "HowToStep",
                "position": 5,
                "name": "3回の設計打ち合わせ＆住設ショールーム見学",
                "text": "二級建築士・菅原代表と濃密な打ち合わせ。タカラ・クリナップ・TOTO等のショールーム見学と連動し、プランを完全昇華。"
            },
            {
                "@type": "HowToStep",
                "position": 6,
                "name": "安心の納得ご契約",
                "text": "耐震等級3計算書・気密測定C値保証・詳細見積もりが全て出揃ってからの安心契約。"
            }
        ]
    }

    faq_ld = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": "3次元点群データはWEB上でずっと見ることができますか？",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "WEBブラウザ上での3D点群クラウド閲覧は設計期間となる約半年間（約6ヶ月）ご利用いただけます。永続的にWEB上で閲覧できるものではございませんが、点群から作成したCAD現況図や断面図面はずっとお手元に残ります（生データは専用ソフトが必要なため基本はお渡ししませんが実費約8,000円で受領可能）。"
                }
            },
            {
                "@type": "Question",
                "name": "なぜ契約前に「15万円の設計お申し込み」が必要なのですか？",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "契約後の「地盤改良や擁壁で数百万円追加になった」という予算オーバー事故を完全にゼロにするためです。JFD社の高精度3次元点群測量や行政法規の現地調査を契約前に徹底的に行い、敷地の真実を明らかにするための実費調査費用です。"
                }
            },
            {
                "@type": "Question",
                "name": "もし設計申し込み後に本契約をしなかった場合、15万円はどうなりますか？",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "JFD社の3次元点群測量データ、敷地調査報告書、現況図、地盤調査報告書（実施済みの場合）の全てをお客様にそのままお渡しします。他社で建てる場合でも数十万円相当の測量図面としてそのまま使えるため、お客様の費用は一切無駄になりません。"
                }
            },
            {
                "@type": "Question",
                "name": "バブルプランや3Dパース生成は誰でも使えますか？",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "バブルプランおよび住ま居る特化のGemini 3Dパース生成は、15万円の設計お申し込みをいただいたお客様限定の特別アトリエ機能です。専用ログインを発行し、何度でも納得いくまで理想の間取りとパースを生成していただけます。"
                }
            },
            {
                "@type": "Question",
                "name": "設計の打ち合わせは何回くらい行いますか？",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "通常3回程度の濃密な打ち合わせを行います。1回目で調査報告と一次プラン提示、2回目でバブルプランやパース、ショールーム要望の反映、3回目で構造計算・温熱計算・詳細見積もりを確定させます。"
                }
            },
            {
                "@type": "Question",
                "name": "キッチンや風呂などの住宅設備は自由に選べますか？",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "はい、完全に自由です。タカラスタンダードのホーロー、クリナップのステンレス、TOTO、パナソニックなど、建て主様のお好みに合わせて各社ショールームで実物をご確認いただきながら自由に選定いただけます。"
                }
            }
        ]
    }

    extra_head = f"""
  <script type="application/ld+json">
  {json.dumps(howto_ld, ensure_ascii=False)}
  </script>
  <script type="application/ld+json">
  {json.dumps(faq_ld, ensure_ascii=False)}
  </script>
"""

    content = """
      <span class="lp-hero-tag" style="background: #e0f2fe; color: #0284c7; border-color: #bae6fd;">
        📐 全行程・完全透明化 ｜ 家づくりの進め方ロードマップ
      </span>
      <h1 class="lp-h1">
        「こんなはずじゃなかった」を契約前にゼロにする。<br>
        <span style="color: #0284c7;">15万円設計お申し込み特典と、ご契約までの誠実フロー</span>
      </h1>
      <p class="lp-lead">
        大手ハウスメーカーや多くの住宅会社では、「無料相談・無料プラン」で契約を急かされ、契約後に地盤改良費用や擁壁造成、行政法規の追加で数百万円の予算オーバーが発生することが後を絶ちません。<br>
        株式会社住ま居るでは、契約前に敷地の真実（3次元点群測量・行政法規・地盤）をすべて明らかにし、納得のプランを練り上げる<strong>「15万円の設計お申し込み」制度</strong>を設けています。万一本契約に至らなかった場合でも、調査成果物はお客様にお渡しするため、1円も無駄になりません。
      </p>

      <!-- 5ステージ・ロードマップ俯瞰 -->
      <h2 class="lp-h2">1. 家づくり全体の5ステップ（全体俯瞰）</h2>
      <p>初回来場からお引き渡しまで、後悔や不安のない透明な進め方を定めています。</p>

      <div style="display: flex; flex-direction: column; gap: 1.5rem; margin: 2rem 0 2.5rem;">
        
        <!-- Stage 1 -->
        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.03); display: flex; gap: 1.2rem; align-items: flex-start;">
          <div style="background: #7c3aed; color: #fff; font-weight: 900; font-size: 1rem; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">1</div>
          <div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 0.4rem;">
              <span style="background: #f5f3ff; color: #7c3aed; font-weight: 800; font-size: 0.8rem; padding: 2px 10px; border-radius: 12px;">完全無料・登録不要</span>
              <h3 style="margin: 0; font-size: 1.2rem; color: #0f172a;">【本音整理】夫婦それぞれのスマホで「家づくりカルテ」作成</h3>
            </div>
            <p style="margin: 0; font-size: 0.92rem; color: #475569; line-height: 1.7;">
              まずは夫婦で画面を見ながら「車の台数」「朝の洗面渋滞」「乾太くん・洗濯動線」「秘密の希望」に回答。AIが妥協ではない融合案を導き出します。
              <a href="/madori-consultation/" style="color: #7c3aed; font-weight: 700; text-decoration: underline; margin-left: 6px;">今すぐカルテを作る ➜</a>
            </p>
          </div>
        </div>

        <!-- Stage 2 -->
        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.03); display: flex; gap: 1.2rem; align-items: flex-start;">
          <div style="background: #059669; color: #fff; font-weight: 900; font-size: 1rem; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">2</div>
          <div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 0.4rem;">
              <span style="background: #ecfdf5; color: #059669; font-weight: 800; font-size: 0.8rem; padding: 2px 10px; border-radius: 12px;">完全無料・営業電話ゼロ</span>
              <h3 style="margin: 0; font-size: 1.2rem; color: #0f172a;">【実物体感】芳彩（かぐや）実物モデルハウス見学（鶴ヶ島）</h3>
            </div>
            <p style="margin: 0; font-size: 0.92rem; color: #475569; line-height: 1.7;">
              無垢の木の香り、足ざわり、真冬・真夏の温熱性能を五感で体感。ベテラン女性スタッフが温かくお迎えし、売り込み営業は一切ありません。作成したカルテを見せるだけで、長時間のアンケート記入なしに理想が伝わります。
            </p>
          </div>
        </div>

        <!-- Stage 3 (Highlighted) -->
        <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #0284c7; border-radius: 12px; padding: 1.8rem; box-shadow: 0 6px 20px rgba(2,132,199,0.1); display: flex; gap: 1.2rem; align-items: flex-start;">
          <div style="background: #0284c7; color: #fff; font-weight: 900; font-size: 1rem; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">3</div>
          <div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 0.4rem;">
              <span style="background: #0284c7; color: #fff; font-weight: 800; font-size: 0.8rem; padding: 2px 10px; border-radius: 12px;">安心の図面引渡保証付き</span>
              <h3 style="margin: 0; font-size: 1.25rem; color: #0369a1;">【最重要ステップ】設計お申し込み（15万円）＆ 3D点群調査・専用アトリエ解放</h3>
            </div>
            <p style="margin: 0; font-size: 0.94rem; color: #334155; line-height: 1.75;">
              契約後の予算オーバーをゼロにするための本格調査。JFD社による<strong>3次元点群測量（7GB）</strong>、行政法令調査、地盤・現況調査を実施。さらに申込者専用の<strong>「バブルプラン」＆「Gemini 3Dパース工房」</strong>が使い放題に！
            </p>
          </div>
        </div>

        <!-- Stage 4 -->
        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.03); display: flex; gap: 1.2rem; align-items: flex-start;">
          <div style="background: #d97706; color: #fff; font-weight: 900; font-size: 1rem; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">4</div>
          <div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 0.4rem;">
              <span style="background: #fef3c7; color: #b45309; font-weight: 800; font-size: 0.8rem; padding: 2px 10px; border-radius: 12px;">二級建築士 菅原代表直接担当</span>
              <h3 style="margin: 0; font-size: 1.2rem; color: #0f172a;">【理想の具体化】3回の設計打ち合わせ ＆ 住設ショールーム見学</h3>
            </div>
            <p style="margin: 0; font-size: 0.92rem; color: #475569; line-height: 1.7;">
              1回目（調査報告と一次プラン提示）➜ 2回目（バブルプラン・パース反映とショールーム見学）➜ 3回目（許容応力度計算 耐震等級3・温熱計算・詳細見積確定）。建て主様が自由に選んだ住宅設備（タカラ、クリナップ、TOTO等）を組み込みます。
            </p>
          </div>
        </div>

        <!-- Stage 5 -->
        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.03); display: flex; gap: 1.2rem; align-items: flex-start;">
          <div style="background: #0f172a; color: #fff; font-weight: 900; font-size: 1rem; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">5</div>
          <div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 0.4rem;">
              <span style="background: #f1f5f9; color: #475569; font-weight: 800; font-size: 0.8rem; padding: 2px 10px; border-radius: 12px;">完全納得・着工へ</span>
              <h3 style="margin: 0; font-size: 1.2rem; color: #0f172a;">【心からの安心】ご契約 ＆ 着工</h3>
            </div>
            <p style="margin: 0; font-size: 0.92rem; color: #475569; line-height: 1.7;">
              すべての図面、構造計算書、気密測定保証、確定見積もりが揃ってからの安心ご契約。契約後の不透明な追加費用は一切発生しません。
            </p>
          </div>
        </div>

      </div>

      <!-- 15万円設計申込特典の徹底深掘り -->
      <h2 class="lp-h2">2. なぜ「15万円の設計お申し込み」なのか？（超豪華特典と保証）</h2>
      <div class="lp-highlight-box" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1.5px solid #cbd5e1;">
        <h3 style="margin-top: 0; color: #0f172a; font-size: 1.2rem;">無料相談の甘い言葉に潜む「契約後トラブル」を防ぐために</h3>
        <p style="font-size: 0.94rem; color: #475569; line-height: 1.8; margin-bottom: 0;">
          「間取りの提案も地盤調査も無料です」と謳う会社の多くは、大雑把な図面で早期契約を迫り、契約後に地盤改良費200万円や擁壁工事、水道引き込み費用の追加を請求します。<br>
          私たちはそうした不誠実を許しません。契約前に測量会社（JFD社）へ外注費を払い、敷地と法規の全データを解明する実費として15万円をいただいております。
        </p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin: 2rem 0;">
        
        <!-- 特典1: JFD 3次元点群測量 -->
        <div style="background: #ffffff; border: 2px solid #0284c7; border-radius: 12px; padding: 1.6rem; box-shadow: 0 4px 15px rgba(2,132,199,0.06);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
            <span style="background: #e0f2fe; color: #0284c7; font-weight: 800; font-size: 0.8rem; padding: 3px 10px; border-radius: 12px;">特典 1</span>
            <span style="font-size: 0.82rem; color: #64748b; font-weight: 700;">外注測量（梅レベル）</span>
          </div>
          <h3 style="margin: 0 0 0.6rem; color: #0369a1; font-size: 1.15rem;">JFD 3次元点群測量 ＆ 敷地現況図</h3>
          <p style="font-size: 0.88rem; color: #475569; line-height: 1.7; margin: 0;">
            敷地をレーザースキャンした7GB超の3D点群データ。敷地のミリ単位の高低差、隣家窓の位置、電柱、越境物、擁壁の勾配を画面上で360度いつでも把握できます。
          </p>
          <div style="margin-top: 0.8rem; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 0.6rem 0.8rem; font-size: 0.8rem; color: #0369a1; line-height: 1.6;">
            <strong>※3次元閲覧期間について：</strong>WEBブラウザ上での3D点群クラウド閲覧は設計・検討期間となる<strong>約半年間（約6ヶ月）</strong>有効です。ずっとWEB上で閲覧できるものではありませんが、設計に必要な図面一式はずっとお手元に残ります。
          </div>
        </div>

        <!-- 特典2: 行政調査 -->
        <div style="background: #ffffff; border: 2px solid #059669; border-radius: 12px; padding: 1.6rem; box-shadow: 0 4px 15px rgba(5,150,105,0.06);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
            <span style="background: #ecfdf5; color: #059669; font-weight: 800; font-size: 0.8rem; padding: 3px 10px; border-radius: 12px;">特典 2</span>
            <span style="font-size: 0.82rem; color: #64748b; font-weight: 700;">二級建築士直接調査</span>
          </div>
          <h3 style="margin: 0 0 0.6rem; color: #065f46; font-size: 1.15rem;">役所・行政調査（法令リスクの徹底排除）</h3>
          <p style="font-size: 0.88rem; color: #475569; line-height: 1.7; margin: 0;">
            用途地域、建ぺい率・容積率、斜線制限、農地転用、市街化調整区域、上下水道配管の状況など、後からプラン変更が生じないよう役所実地調査を完遂します。
          </p>
        </div>

        <!-- 特典3: 地盤・解体調査 -->
        <div style="background: #ffffff; border: 2px solid #d97706; border-radius: 12px; padding: 1.6rem; box-shadow: 0 4px 15px rgba(217,119,6,0.06);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
            <span style="background: #fef3c7; color: #d97706; font-weight: 800; font-size: 0.8rem; padding: 3px 10px; border-radius: 12px;">特典 3</span>
            <span style="font-size: 0.82rem; color: #64748b; font-weight: 700;">建て替え・地盤事前確認</span>
          </div>
          <h3 style="margin: 0 0 0.6rem; color: #92400e; font-size: 1.15rem;">既存建物現況調査 ＆ 地盤事前調査</h3>
          <p style="font-size: 0.88rem; color: #475569; line-height: 1.7; margin: 0;">
            既存建物がある場合の解体範囲や状況確認、周辺地盤データに基づく地盤補強の要否を事前判定。予算の狂いを未然に防ぎます。
          </p>
        </div>

        <!-- 特典4: 安心の引渡保証 -->
        <div style="background: #ffffff; border: 2px solid #7c3aed; border-radius: 12px; padding: 1.6rem; box-shadow: 0 4px 15px rgba(124,58,237,0.06);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
            <span style="background: #f5f3ff; color: #7c3aed; font-weight: 800; font-size: 0.8rem; padding: 3px 10px; border-radius: 12px;">安心保証</span>
            <span style="font-size: 0.82rem; color: #64748b; font-weight: 700;">お金が無駄にならない</span>
          </div>
          <h3 style="margin: 0 0 0.6rem; color: #5b21b6; font-size: 1.15rem;">万一不成立でも「調査図面・報告書」をお渡し</h3>
          <p style="font-size: 0.88rem; color: #475569; line-height: 1.7; margin: 0;">
            万一本契約に至らなかった場合でも、敷地調査報告書・現況図・地盤調査書はすべてお客様にお渡しします。他社で建てる際にも数十万円相当の図面としてそのまま使えます！
          </p>
        </div>

      </div>

      <!-- 3次元点群測量データのビジュアルプレビュー ＆ 操作動画枠 -->
      <div style="background: #0f172a; border-radius: 16px; padding: 2rem; color: #fff; margin: 2.5rem 0; border: 2px solid #38bdf8;">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <span style="background: #d97706; color: #fff; font-size: 0.82rem; font-weight: 800; padding: 4px 16px; border-radius: 20px;">
            📹 3D点群データ操作デモ動画（※準備中・近日公開）
          </span>
          <h3 style="font-size: 1.4rem; color: #38bdf8; margin: 0.6rem 0 0.3rem;">
            画面上で敷地の高低差・隣家窓・日照を360度把握
          </h3>
          <p style="color: #cbd5e1; font-size: 0.9rem; margin: 0;">
            JFD社による3次元スキャンデータ解析画面。お施主様の敷地をミリ単位でデジタル化します。
          </p>
        </div>

        <div style="position: relative; border-radius: 10px; overflow: hidden; border: 2px solid #334155; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <img src="/images/survey/pointcloud_survey_preview.jpg" alt="JFD社 3次元点群測量データ解析画面プレビュー" style="width: 100%; height: auto; display: block;" loading="lazy">
          <div style="position: absolute; inset: 0; background: rgba(15, 23, 42, 0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem;">
            <div style="width: 68px; height: 68px; border-radius: 50%; background: rgba(255, 255, 255, 0.95); display: flex; align-items: center; justify-content: center; font-size: 2.2rem; box-shadow: 0 8px 30px rgba(0,0,0,0.6); color: #0f172a;">
              ▶
            </div>
            <p style="color: #ffffff; font-weight: 800; font-size: 1.1rem; margin-top: 1rem; text-shadow: 0 2px 6px rgba(0,0,0,0.9);">
              敷地状況を画面上でいつでもミリ単位リアルタイム把握
            </p>
            <span style="background: rgba(15, 23, 42, 0.85); color: #e2e8f0; font-size: 0.82rem; padding: 4px 14px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.25);">
              ※現在、実際の画面操作デモ動画を準備中ですが、すでにSSD等への大容量データ連携・準備が進んでおります
            </span>
          </div>
        </div>
        <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid #334155; border-radius: 8px; padding: 1rem 1.2rem; margin-top: 1.2rem; font-size: 0.84rem; color: #cbd5e1; line-height: 1.75; text-align: left;">
          <strong style="color: #38bdf8;">📌 3次元点群データの閲覧期間とデータのお渡しについて（重要）：</strong><br>
          ・<strong>3次元WEB閲覧期間：</strong>JFD社のクラウドシステム上での3次元立体閲覧は、設計・プラン検討期間である<strong>約半年間（約6ヶ月）</strong>ご利用いただけます。ずっとWEB上で見続けられるものではありませんが、設計打ち合わせや配置確認には十分な期間を確保しております。<br>
          ・<strong>お手元に残る図面（一生の資産）：</strong>この点群データから作成された<strong>【CAD敷地現況図】【等高線断面図】【役所行政調査報告書】</strong>は、紙およびPDFデータとしてすべてお客様へお渡しします。万一ご契約に至らなかった場合でもお手元に残るため、他社建築時も含め実務上はこれで完全に十分です。<br>
          ・<strong>点群生データについて：</strong>7GB超の点群生データ自体は専用の点群解析CADソフトがないと扱えないため通常はお渡ししておりません（※ご希望の場合は実費オプション＋約8,000円程度で生データ受領も可能ですが、基本的には図面一式で十分です）。
        </div>
        <p style="color: #94a3b8; font-size: 0.82rem; text-align: center; margin-top: 0.6rem; margin-bottom: 0;">
          ※敷地の場所や個人情報が特定されないよう配慮したサンプルデータ画面です。
        </p>
      </div>

      <!-- 申込者限定特典：プロ級AIパースアトリエ ＆ バブルプランスタジオ -->
      <h2 class="lp-h2">3. 申込者限定特典：プロ仕様「AIパースアトリエ ＆ バブルプラン」解放</h2>
      <p style="font-size: 1.05rem; line-height: 1.85; color: #334155;">
        15万円の設計お申し込みをいただいたお客様には、専用ログインアカウントを発行。<br>
        <strong>建築士やCGクリエイターに何十万円も払って依頼していたような、雑誌の表紙クオリティの3Dパース</strong>が、ご自宅のスマホやタブレットから指先ひとつで何度でも自由に作り放題になります。
      </p>

      <!-- 4コマ漫画で見るAIパースアトリエ体験 -->
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #16a34a; border-radius: 16px; padding: 2.2rem 1.6rem; margin: 2.5rem 0; box-shadow: 0 10px 30px rgba(22, 163, 74, 0.1);">
        <div style="text-align: center; margin-bottom: 1.8rem;">
          <span style="background: #15803d; color: #fff; font-weight: 800; font-size: 0.85rem; padding: 4px 16px; border-radius: 20px;">
            🎨 漫画でわかる！プロ級AIパースアトリエ体験記
          </span>
          <h3 style="font-size: 1.65rem; color: #14532d; margin: 0.8rem 0 0.4rem; font-weight: 900;">
            「これ、私たちの家！？」夜のリビングで夢が広がる魔法の時間
          </h3>
          <p style="color: #166534; font-size: 0.95rem; margin: 0;">
            設計打ち合わせが待ち遠しくなる、エモーショナルな家づくり体験を4コマ漫画でお届けします。
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem;">
          
          <!-- コマ1: 限定アトリエ解放 -->
          <div style="background: #ffffff; border-radius: 12px; border: 1.5px solid #86efac; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
            <div style="background: #0f172a; color: #f59e0b; font-weight: 800; font-size: 0.88rem; padding: 6px 14px; display: flex; justify-content: space-between;">
              <span>第1話：申込者限定解放</span>
              <span>STEP 1</span>
            </div>
            <img src="/images/perse_studio/comic_perse_step1.jpg" alt="設計申込者限定でプロ級AIパースアトリエが解放されて喜ぶ夫婦" style="width: 100%; height: auto; display: block;" loading="lazy">
            <div style="padding: 1.2rem; flex-grow: 1;">
              <h4 style="font-size: 1.05rem; margin: 0 0 0.5rem; color: #14532d; font-weight: 800;">
                「えっ！？プロのCGクリエイターが作るような高品位パースが、自分たちで作り放題！？」
              </h4>
              <p style="font-size: 0.85rem; color: #475569; line-height: 1.7; margin: 0;">
                15万円の設計申込後、専用アトリエにログイン！建築士やCG会社に外注すれば1枚数十万円かかるような超高精度パースが、スマホからいつでも自由に使えるように！
              </p>
            </div>
          </div>

          <!-- コマ2: 直感レイアウト＆素材選択 -->
          <div style="background: #ffffff; border-radius: 12px; border: 1.5px solid #86efac; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
            <div style="background: #16a34a; color: #fff; font-weight: 800; font-size: 0.88rem; padding: 6px 14px; display: flex; justify-content: space-between;">
              <span>第2話：直感レイアウト＆素材選択</span>
              <span>STEP 2</span>
            </div>
            <img src="/images/perse_studio/comic_perse_step2.jpg" alt="タブレットでバブルプランや無垢材の素材を指先で楽しく選択する様子" style="width: 100%; height: auto; display: block;" loading="lazy">
            <div style="padding: 1.2rem; flex-grow: 1;">
              <h4 style="font-size: 1.05rem; margin: 0 0 0.5rem; color: #15803d; font-weight: 800;">
                「キッチンと洗面をつなげて、床は温もりある無垢材にして…！」
              </h4>
              <p style="font-size: 0.85rem; color: #475569; line-height: 1.7; margin: 0;">
                バブルプランでパズルのように部屋パーツを動かし、家事ラク動線を検討。「夕暮れの間接照明」「吹き抜け」「ジャパンディ」など、好みのスタイルを指先タップで選ぶだけ！
              </p>
            </div>
          </div>

          <!-- コマ3: AI 3Dパース生成・感動 -->
          <div style="background: #ffffff; border-radius: 12px; border: 1.5px solid #86efac; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
            <div style="background: #7c3aed; color: #fff; font-weight: 800; font-size: 0.88rem; padding: 6px 14px; display: flex; justify-content: space-between;">
              <span>第3話：息をのむ瞬間</span>
              <span>STEP 3</span>
            </div>
            <img src="/images/perse_studio/comic_perse_step3.jpg" alt="AIパース生成ボタンを押して雑誌表紙クオリティのパースが立ち現れ感動する様子" style="width: 100%; height: auto; display: block;" loading="lazy">
            <div style="padding: 1.2rem; flex-grow: 1;">
              <h4 style="font-size: 1.05rem; margin: 0 0 0.5rem; color: #5b21b6; font-weight: 800;">
                「うわぁっ！雑誌の表紙みたいな3Dパースができた！光の当たり方も本物そっくり！」
              </h4>
              <p style="font-size: 0.85rem; color: #475569; line-height: 1.7; margin: 0;">
                ボタンを押してわずか数秒！埼玉の柔らかな自然光、吉野杉の木目、天井の化粧梁までリアルに描写。分厚いカタログでは想像できなかった「暮らす空間」が一瞬で目の前に！
              </p>
            </div>
          </div>

          <!-- コマ4: 後悔ゼロの家族会議 -->
          <div style="background: #ffffff; border-radius: 12px; border: 1.5px solid #86efac; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.03); display: flex; flex-direction: column;">
            <div style="background: #0284c7; color: #fff; font-weight: 800; font-size: 0.88rem; padding: 6px 14px; display: flex; justify-content: space-between;">
              <span>第4話：打ち合わせが待ち遠しい</span>
              <span>STEP 4</span>
            </div>
            <img src="/images/perse_studio/comic_perse_step4.jpg" alt="夜のリビングで何十枚ものパースを比較しながら笑顔で語り合う夫婦" style="width: 100%; height: auto; display: block;" loading="lazy">
            <div style="padding: 1.2rem; flex-grow: 1;">
              <h4 style="font-size: 1.05rem; margin: 0 0 0.5rem; color: #0369a1; font-weight: 800;">
                「何十通りも試せるから後悔ゼロ！設計士さん（菅原代表）に見せるのが待ち遠しい！」
              </h4>
              <p style="font-size: 0.85rem; color: #475569; line-height: 1.7; margin: 0;">
                夜、お酒やコーヒーを片手に「こっちの木目の色もいいね」「夜の照明も素敵」と何パターンも保存。漠然とした不安が消え、設計士との打ち合わせが最高に楽しい時間へ昇華します！
              </p>
            </div>
          </div>

        </div>
      </div>

      <!-- インタラクティブ・3Dパース生成アニメーションデモ（エモーショナルUI） -->
      <div style="background: #0f172a; border: 2px solid #38bdf8; border-radius: 16px; padding: 2.2rem 1.6rem; margin: 2.5rem 0; box-shadow: 0 15px 40px rgba(0,0,0,0.3); color: #fff;">
        <div style="text-align: center; margin-bottom: 1.8rem;">
          <span style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; font-weight: 800; font-size: 0.85rem; padding: 4px 16px; border-radius: 20px; border: 1px solid rgba(56, 189, 248, 0.4);">
            🎬 体感アニメーションシミュレーター
          </span>
          <h3 style="font-size: 1.65rem; color: #fff; margin: 0.8rem 0 0.4rem; font-weight: 900;">
            ボタンを押すだけ。プロの3Dパースが瞬時に描かれる様子を体感
          </h3>
          <p style="color: #94a3b8; font-size: 0.95rem; margin: 0;">
            スタイルや光の表情を切り替えてみてください。プロ仕様のAI空間演算エンジンが瞬時にパースを描き分けます。
          </p>
        </div>

        <!-- コントロールバー -->
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 1.5rem;">
          <button type="button" class="demo-anim-btn active" onclick="runPerseDemo('daylight')" style="background: #38bdf8; color: #0f172a; border: none; padding: 8px 18px; border-radius: 20px; font-weight: 800; font-size: 0.9rem; cursor: pointer;">
            ☀️ 澄み渡る朝の自然光 × 吹き抜けLDK
          </button>
          <button type="button" class="demo-anim-btn" onclick="runPerseDemo('sunset')" style="background: rgba(255,255,255,0.1); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.2); padding: 8px 18px; border-radius: 20px; font-weight: 800; font-size: 0.9rem; cursor: pointer;">
            🌇 黄昏のトワイライト × ジャパンディ
          </button>
          <button type="button" class="demo-anim-btn" onclick="runPerseDemo('night')" style="background: rgba(255,255,255,0.1); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.2); padding: 8px 18px; border-radius: 20px; font-weight: 800; font-size: 0.9rem; cursor: pointer;">
            🌙 温もりの間接照明 × 無垢杉の平屋
          </button>
        </div>

        <!-- パース描画スクリーンフレーム -->
        <div style="position: relative; max-width: 900px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 2px solid #334155; background: #000; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <!-- 生成ステータスオーバーレイ（アニメーション用） -->
          <div id="demo-perse-loading" style="display: none; position: absolute; inset: 0; background: rgba(15, 23, 42, 0.85); z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
            <div style="width: 48px; height: 48px; border: 4px solid #38bdf8; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <p id="demo-perse-status" style="margin-top: 1rem; font-weight: 800; color: #38bdf8; font-size: 1.05rem;">
              埼玉の自然光と木目を計算中...
            </p>
          </div>

          <!-- パース画像表示部 -->
          <img id="demo-perse-img" src="/images/hero_architecture.jpg" alt="プロ仕様3D建築パースの生成プレビュー" style="width: 100%; height: auto; display: block; transition: opacity 0.4s ease;" loading="lazy">

          <!-- キャプションバー -->
          <div style="background: rgba(15, 23, 42, 0.9); padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <span id="demo-perse-title" style="color: #38bdf8; font-weight: 800; font-size: 1rem;">
                【朝の自然光 × 吹き抜け大開口LDK】吉野杉フローリングと化粧梁の陰影
              </span>
              <p style="margin: 2px 0 0; color: #94a3b8; font-size: 0.8rem;">
                Google Gemini API × 住ま居る独自・住宅特化プロンプトエンジン高速描画
              </p>
            </div>
            <span style="background: linear-gradient(135deg, #0284c7, #38bdf8); color: #fff; font-size: 0.78rem; font-weight: 800; padding: 4px 12px; border-radius: 8px;">
              申込者限定・無制限
            </span>
          </div>

        </div>

        <p style="text-align: center; color: #94a3b8; font-size: 0.85rem; margin-top: 1.2rem; margin-bottom: 0;">
          ※実際の機能では、お客様自身が自由な部屋・素材・光・こだわり文言を入力して、何十枚でも高解像度パースを生成いただけます。
        </p>
      </div>

      <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      </style>

      <script>
      var perseData = {
        'daylight': {
          'src': '/images/hero_architecture.jpg',
          'title': '【朝の自然光 × 吹き抜け大開口LDK】吉野杉フローリングと化粧梁の陰影',
          'status': '朝の澄んだ太陽光と外皮断熱サッシを空間演算中...'
        },
        'sunset': {
          'src': '/images/natural_interior_aroma.jpg',
          'title': '【黄昏のトワイライト × ジャパンディ】漆喰の陰影と北欧グレージュの調和',
          'status': '夕暮れ時の黄金の光と間接照明をレンダリング中...'
        },
        'night': {
          'src': '/images/hero_kaguya_house.jpg',
          'title': '【温もりの間接照明 × 芳彩の平屋】ヒノキの香りが漂う大人のセカンドリビング',
          'status': '暖色系LED間接照明と無垢ヒノキの質感をトレース中...'
        }
      };

      function runPerseDemo(mode) {
        var loader = document.getElementById('demo-perse-loading');
        var img = document.getElementById('demo-perse-img');
        var title = document.getElementById('demo-perse-title');
        var status = document.getElementById('demo-perse-status');
        var btns = document.querySelectorAll('.demo-anim-btn');
        
        btns.forEach(function(b) {
          b.style.background = 'rgba(255,255,255,0.1)';
          b.style.color = '#e2e8f0';
          b.style.border = '1px solid rgba(255,255,255,0.2)';
        });

        if (event && event.target) {
          event.target.style.background = '#38bdf8';
          event.target.style.color = '#0f172a';
          event.target.style.border = 'none';
        }

        if (loader && status && perseData[mode]) {
          status.innerText = perseData[mode].status;
          loader.style.display = 'flex';
          setTimeout(function() {
            if (img) img.src = perseData[mode].src;
            if (title) title.innerText = perseData[mode].title;
            loader.style.display = 'none';
          }, 450);
        }
      }
      </script>

      <!-- 2大限定アトリエ詳細カード -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin: 2rem 0;">
        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 1.6rem; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
          <div style="font-size: 2rem; margin-bottom: 0.4rem;">🧩</div>
          <h3 style="color: #0f172a; font-size: 1.2rem; margin-top: 0; font-weight: 800;">① 直感バブルプラン（生活動線スタジオ）</h3>
          <p style="font-size: 0.88rem; color: #475569; line-height: 1.75; margin: 0;">
            「LDKを南側に」「キッチンと洗面所を横並びの回遊動線に」「玄関横に土間収納とガレージ」。パズルのように部屋パーツを画面上で指先で動かしながら、ご夫婦で直感的に間取りのゾーニングを楽しく煮詰められます。
          </p>
        </div>

        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 1.6rem; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
          <div style="font-size: 2rem; margin-bottom: 0.4rem;">🎨</div>
          <h3 style="color: #0f172a; font-size: 1.2rem; margin-top: 0; font-weight: 800;">② 住ま居る特化・プロ級AI 3Dパース生成</h3>
          <p style="font-size: 0.88rem; color: #475569; line-height: 1.75; margin: 0;">
            難しい設定や英語プロンプトは一切不要。Googleの最新Gemini APIを活用し、住ま居る独自の「埼玉の柔らかな自然光と無垢材の質感」に特化したプロンプトエンジンが、プロ仕様のフォトリアル外観・内観パースを数秒で瞬時生成。夜の夫婦会議が最高に盛り上がります。
          </p>
        </div>
      </div>


      <!-- FAQ Section -->
      <h2 class="lp-h2">4. 家づくりの進め方 よくあるご質問（FAQ）</h2>
      <div style="margin: 1.8rem 0;">
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.4rem; margin-bottom: 1rem;">
          <h3 style="margin-top: 0; font-size: 1.05rem; color: #0f172a;">Q. 3次元点群データは、WEB上でずっと見ることができますか？</h3>
          <p style="font-size: 0.92rem; color: #475569; margin-bottom: 0; line-height: 1.75;">
            A. WEBブラウザ上での3D点群クラウド閲覧は、設計・プラン検討期間となる<strong>約半年間（約6ヶ月）</strong>ご利用いただけます。永続的にWEB上で閲覧できるものではございませんが、設計に必要な期間はしっかりとご確認いただけます。なお、この点群データから作成した「敷地現況図（CAD/PDF）」「高低差・等高線断面図」は紙やPDFとしてずっとお手元に残りますのでご安心ください（※点群の生データ自体は専用ソフトが必要なため基本はお渡ししませんが、ご希望時は実費＋約8,000円程度でデータ受領も可能です）。
          </p>
        </div>

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.4rem; margin-bottom: 1rem;">
          <h3 style="margin-top: 0; font-size: 1.05rem; color: #0f172a;">Q. なぜ契約前に「15万円の設計お申し込み」が必要なのですか？</h3>
          <p style="font-size: 0.92rem; color: #475569; margin-bottom: 0; line-height: 1.75;">
            A. 契約後の「地盤改良や擁壁造成で数百万円追加になった」という予算オーバー事故を完全にゼロにするためです。JFD社の高精度3次元点群測量や行政法規の現地調査を契約前に徹底的に行い、敷地の真実を明らかにするための実費調査費用です。
          </p>
        </div>

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.4rem; margin-bottom: 1rem;">
          <h3 style="margin-top: 0; font-size: 1.05rem; color: #0f172a;">Q. もし設計申し込み後に本契約をしなかった場合、15万円はどうなりますか？</h3>
          <p style="font-size: 0.92rem; color: #475569; margin-bottom: 0; line-height: 1.75;">
            A. JFD社の3次元点群測量データ、敷地調査報告書、現況図、地盤調査報告書（実施済みの場合）の全てをお客様にそのままお渡しします。他社で建てる場合でも数十万円相当の測量図面としてそのまま使えるため、お客様の費用は一切無駄になりません。
          </p>
        </div>

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.4rem; margin-bottom: 1rem;">
          <h3 style="margin-top: 0; font-size: 1.05rem; color: #0f172a;">Q. キッチンや風呂などの住宅設備は自由に選べますか？</h3>
          <p style="font-size: 0.92rem; color: #475569; margin-bottom: 0; line-height: 1.75;">
            A. はい、完全に自由です。タカラスタンダードのホーロー、クリナップのステンレス、TOTO、パナソニックなど、建て主様のお好みに合わせて各社ショールームで実物をご確認いただきながら自由に選定いただけます。
          </p>
        </div>
      </div>

      <!-- Action Box -->
      <div class="lp-highlight-box" style="margin-top: 2.5rem; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #fff; border: 2px solid #38bdf8; text-align: center;">
        <h3 style="color: #38bdf8; font-size: 1.35rem; margin-top: 0;">まずは夫婦の「家づくりカルテ」からスタートしませんか？</h3>
        <p style="color: #cbd5e1; max-width: 760px; margin: 0 auto 1.5rem; font-size: 0.96rem; line-height: 1.8;">
          登録不要・完全無料。スマホで直感タップするだけで、夫婦の意見のズレを解消したカルテが即時手に入ります。<br>
          そのカルテを持って、芳彩モデルハウスへお気軽にお越しください。
        </p>
        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
          <a href="/madori-consultation/" class="lp-cta-btn" style="background: linear-gradient(135deg, #7c3aed, #8b5cf6); color: #fff; font-weight: 800; font-size: 1.05rem; padding: 0.9rem 2.2rem;">
            🤖 夫婦の家づくりカルテを無料作成する ➜
          </a>
          <a href="/#scent-experience" class="lp-cta-btn" style="background: linear-gradient(135deg, #059669, #10b981); color: #fff; font-weight: 800; font-size: 1.05rem; padding: 0.9rem 2.2rem;">
            🌿 芳彩モデルハウス体感見学を予約する ➜
          </a>
        </div>
      </div>
    """

    html = get_common_layout(
        title="家づくりの流れと15万円設計申込特典（JFD 3次元点群測量・現況図）｜株式会社住ま居る【埼玉】",
        description="無料の家づくりカルテ・モデルハウス見学から、15万円の設計お申し込み（JFD 3D点群測量・行政調査・地盤確認・安心の図面引渡保証）、バブルプラン＆3Dパース活用、3回の設計打合せ、ご契約までの全フローを完全公開。",
        canonical_url="https://t-smile.co.jp/flow/",
        og_image="https://t-smile.co.jp/images/survey/pointcloud_survey_preview.jpg",
        breadcrumbs=[("🏠 ホーム", "/"), ("📐 家づくりの流れ・15万円設計申込特典", "")],
        content_html=content,
        active_nav='flow',
        extra_head=extra_head
    )
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(html)
    return "https://t-smile.co.jp/flow/"


def build_all_lps():
    """すべての静的LPおよびピラーページを生成し、URLリストを返す"""
    urls = []
    urls.append(generate_about_page())
    urls.append(generate_performance_page())
    urls.append(generate_evidence_page())
    urls.append(generate_ai_studio_page())
    urls.append(generate_award_story_page())
    urls.append(generate_madori_consultation_page())
    urls.append(generate_flow_page())
    thermal_url = generate_thermal_pillar_page()
    if thermal_url:
        urls.append(thermal_url)
    print(f"[LP] Successfully generated {len(urls)} dedicated static landing pages and pillar directory!")
    return urls


if __name__ == '__main__':
    res = build_all_lps()
    for u in res:
        print(f" - {u}")

