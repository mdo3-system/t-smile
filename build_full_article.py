import re
import os

# Read all chapters
chapters = {}
for ch in range(1, 11):
    with open(f"ch_{ch}_final.html", "r", encoding="utf-8") as f:
        chapters[ch] = f.read().strip()

# Build the complete <section id="article-feature" class="page-section">
article_section = '''
    <!-- PAGE: HANDCRAFTED HOUSING FEATURE ARTICLE (手づくり住宅解体新書 全10章) -->
    <section id="article-feature" class="page-section">
      <div class="hero">
        <span class="hero-tag">参考資料: t-smile.co.jp/modelhouse 完全解体新書</span>
        <h1 class="hero-title">完全手づくり住宅・リアル展示場解体新書<br><span style="font-size: 1.5rem; color: #f59e0b;">言葉を超えた心地よさ、自然素材と職人技術の神髄を明かす</span></h1>
        <p class="hero-subtitle">
          高級路線・富裕層アピールへのアンチテーゼ。化学的な心地よさは最新のラグジュアリーホテルで楽しめばいい。毎日の日常は、心が静まる心地よさを最優先に。t-smile.co.jp/modelhouse の全要素を極限まで深掘りした特大特集。（全10章）
        </p>
      </div>

      <!-- Chapter Tabs Header -->
      <div class="article-nav-tabs">
        <button class="art-tab-btn active" data-tab="ch1">第1章: 思想宣言</button>
        <button class="art-tab-btn" data-tab="ch2">第2章: アプローチと引戸</button>
        <button class="art-tab-btn" data-tab="ch3">第3章: 22帖LDK・ウッドデッキ</button>
        <button class="art-tab-btn" data-tab="ch4">第4章: 呼吸する珪藻土</button>
        <button class="art-tab-btn" data-tab="ch5">第5章: 和モダン・エコカラットタイル</button>
        <button class="art-tab-btn" data-tab="ch6">第6章: 造作バス・サウナ</button>
        <button class="art-tab-btn" data-tab="ch7">第7章: 2階ホール・吉野杉</button>
        <button class="art-tab-btn" data-tab="ch8">第8章: 主寝室・ウォークイン</button>
        <button class="art-tab-btn" data-tab="ch9">第9章: 書斎・隠れ家ロフト</button>
        <button class="art-tab-btn" data-tab="ch10">第10章: 職人技と総括</button>
      </div>

      <!-- Chapter Contents Box -->
      <div class="article-body-box">
'''

for ch in range(1, 11):
    c_html = chapters[ch]
    # Ensure active class is only on ch1
    if ch == 1:
        if 'class="art-tab-content active"' not in c_html:
            c_html = c_html.replace('class="art-tab-content"', 'class="art-tab-content active"')
    else:
        c_html = c_html.replace('class="art-tab-content active"', 'class="art-tab-content"')
    
    article_section += f"        {c_html}\n\n"

article_section += '''      </div>
    </section>
'''

with open("full_restored_article_feature.html", "w", encoding="utf-8") as out:
    out.write(article_section)

print(f"Generated full_restored_article_feature.html (length {len(article_section)} chars)")
