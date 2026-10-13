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
        <a href="/#floorplan-studio" class="lp-cta-btn" style="background: linear-gradient(135deg, #0284c7, #38bdf8);">📐 AI間取り作図を試す ➜</a>
        <a href="/#ai-studio" class="lp-cta-btn" style="background: linear-gradient(135deg, #d97706, #f59e0b); color: #0f172a;">🎨 AIパース工房で描く ➜</a>
        <a href="/#thermal-consultation" class="lp-cta-btn" style="background: linear-gradient(135deg, #059669, #10b981);">💬 温熱AI建築士に相談 ➜</a>
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
      <a href="/">トップページ</a> ｜ <a href="/madori-consultation/">間取り相談＆カルテ</a> ｜ <a href="/about/">会社概要・信用の証明</a> ｜ <a href="/performance/">温熱・構造性能</a> ｜ <a href="/evidence/">光熱費実証録</a> ｜ <a href="/knowledge/thermal/">温熱知見200選</a>
    </p>
    <p style="margin-top: 1.5rem; font-size: 0.75rem; color: #475569;">
      &copy; 株式会社住ま居る (Sumaile Co., Ltd.) All Rights Reserved.
    </p>
  </footer>

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
          <div class="lp-badge-val">UA 0.30〜0.40</div>
          <div style="font-size: 0.8rem; color: #059669; font-weight: 700;">HEAT20 G2/G3 (等級6〜7)</div>
        </div>
        <div class="lp-badge-card">
          <div style="font-size: 0.82rem; font-weight: 700; color: #64748b;">気密性能 (全棟現場実測)</div>
          <div class="lp-badge-val">C値 0.3 以下</div>
          <div style="font-size: 0.8rem; color: #059669; font-weight: 700;">実測保証 漏気ゼロ施工</div>
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
      <span class="lp-hero-tag">🎨 建築特化型AIパース生成スタジオ</span>
      <h1 class="lp-h1">「家族の理想を描く」AIパース工房</h1>
      <p class="lp-lead">
        一生に一度の家づくりだからこそ、納得いくまで迷い、心ゆくまで夢を膨らませてほしい。<br>
        言葉にするのが難しいご家族の想いや光の表情を、最新AIが指先ひとつで鮮やかにビジュアル化。<br>
        施主が自由に想いを描き、職人・建築士が全棟許容応力度計算と付加断熱で形にする、新しい家づくりのアトリエです。
      </p>

      <h2 class="lp-h2">1. 営業マンを介さず、頭の中の理想をダイレクトに可視化</h2>
      <p>
        従来の家づくりでは、お施主様の想いは営業マンというフィルターを通してしか設計士や現場に伝わりませんでした。「思っていた質感と違う」「もっと自然光が差し込むリビングにしたかったのに、無難な間取りになってしまった」という妥協が生まれる最大の原因はここにあります。<br>
        当スタジオでは、住宅建築特化の画像生成AIが専属アシスタントとして対話。言葉にするだけでフォトリアルな外観・内観パースをご家族で納得いくまで何度でも生成できます。
      </p>

      <div class="lp-badge-grid">
        <div class="lp-badge-card" style="text-align: left;">
          <h4 style="margin: 0 0 0.5rem; color: #0284c7;">30代 DINKS：ミニマリズムとプライベート</h4>
          <p style="font-size: 0.85rem; color: #475569; margin: 0;">
            ジャパンディ、ホテルライク、無機質×自然素材、大判タイル、間接照明、インナーガレージ。生活感を隠蔽するバックヤード動線。
          </p>
        </div>
        <div class="lp-badge-card" style="text-align: left;">
          <h4 style="margin: 0 0 0.5rem; color: #d97706;">50代 ゆとり世帯：庭屋一如の上質な平屋</h4>
          <p style="font-size: 0.85rem; color: #475569; margin: 0;">
            深い軒の佇まい、無垢名木、障子の再解釈、プライベートライブラリー、バリアフリー温熱。庭の四季を取り込むピクチャーサッシ。
          </p>
        </div>
      </div>

      <h2 class="lp-h2">2. パスワード不要「マジックリンク」による個別プロジェクトルーム</h2>
      <p>
        生成したパースの保存や、現実の概算見積・法規チェックを希望される場合は、お名前とメール・電話番号を入力するだけで完了します。
      </p>
      <ul style="padding-left: 1.5rem; line-height: 2;">
        <li><strong>パスワード不要のマジックリンク認証:</strong> メールまたはSMSに届くワンタイムリンクでセキュアに個別ルームへログイン。</li>
        <li><strong>専用チャットで建築士と直結:</strong> 営業マンの同席なし。生成パースを元に担当建築士とチャット上で直接ディスカッション。</li>
        <li><strong>図面・構造・温熱計算書の共有:</strong> パースの意匠を崩さずに耐震等級3・HEAT20 G2/G3を両立させる実施図面をPDFでお届け。</li>
        <li><strong>クラウド電子契約:</strong> 設計監理契約や請負契約もご自宅からペーパーレスで安全に完結。</li>
      </ul>

      <div class="lp-highlight-box">
        <h3 style="margin-top: 0; color: #047857; font-size: 1.15rem;">【利用条件・対象エリア】</h3>
        <p style="margin: 0;">
          <strong>対象エリア:</strong> 埼玉県内にて新築・建て替えをご検討中の方（鶴ヶ島ICから車で片道1時間圏内での施工を前提といたします）。<br>
          <strong>利用料金:</strong> 完全無料（AIパース生成・チャット相談・初期プランカルテ作成まで費用は一切かかりません）。
        </p>
      </div>
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

      <!-- 4ステップ利用ガイド -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin: 2rem 0 2.5rem;">
        <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 1.2rem; text-align: center;">
          <div style="font-size: 1.8rem; margin-bottom: 0.3rem;">📱</div>
          <div style="font-weight: 800; color: #6b21a8; font-size: 0.95rem; margin-bottom: 0.2rem;">STEP 1: スマホで回答</div>
          <p style="font-size: 0.82rem; color: #64748b; margin: 0; line-height: 1.6;">「夫モード」「妻モード」を選び、7問に直感タップ（約3分）。</p>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 1.2rem; text-align: center;">
          <div style="font-size: 1.8rem; margin-bottom: 0.3rem;">💬</div>
          <div style="font-weight: 800; color: #15803d; font-size: 0.95rem; margin-bottom: 0.2rem;">STEP 2: LINEで招待</div>
          <p style="font-size: 0.82rem; color: #64748b; margin: 0; line-height: 1.6;">招待ボタンからパートナーのLINEへ送信。回答が暗号化URLで共有。</p>
        </div>
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 1.2rem; text-align: center;">
          <div style="font-size: 1.8rem; margin-bottom: 0.3rem;">🧩</div>
          <div style="font-weight: 800; color: #1d4ed8; font-size: 0.95rem; margin-bottom: 0.2rem;">STEP 3: 2人の回答合体</div>
          <p style="font-size: 0.82rem; color: #64748b; margin: 0; line-height: 1.6;">パートナーが開くと自動合体！意見のズレをAIがプロ視点で融合。</p>
        </div>
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 1.2rem; text-align: center;">
          <div style="font-size: 1.8rem; margin-bottom: 0.3rem;">📋</div>
          <div style="font-weight: 800; color: #b45309; font-size: 0.95rem; margin-bottom: 0.2rem;">STEP 4: カルテ無料出力</div>
          <p style="font-size: 0.82rem; color: #64748b; margin: 0; line-height: 1.6;">完成したカルテを画面保存・印刷。モデルハウス見学へそのまま持参。</p>
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


def build_all_lps():
    """すべての静的LPおよびピラーページを生成し、URLリストを返す"""
    urls = []
    urls.append(generate_about_page())
    urls.append(generate_performance_page())
    urls.append(generate_evidence_page())
    urls.append(generate_ai_studio_page())
    urls.append(generate_award_story_page())
    urls.append(generate_madori_consultation_page())
    thermal_url = generate_thermal_pillar_page()
    if thermal_url:
        urls.append(thermal_url)
    print(f"[LP] Successfully generated {len(urls)} dedicated static landing pages and pillar directory!")
    return urls


if __name__ == '__main__':
    res = build_all_lps()
    for u in res:
        print(f" - {u}")
