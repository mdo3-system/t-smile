# -*- coding: utf-8 -*-
"""
Update public/index.html:
1. Replace single-row header with two-tier header (AI Tier + Main Tier)
2. Replace #craftsmanship section with 6 interactive case studies featuring 20+ photos each
"""

with open("public/index.html", "r", encoding="utf-8") as f:
    html = f.read()

# --- 1. Replace Header ---
old_header_start = '  <!-- Header & Navigation -->'
old_header_end = '  </header>'

new_header = """  <!-- Header & Navigation (Two-Tier Compact Layout) -->
  <header style="padding: 0.6rem 1.2rem;">
    <div class="nav-container-twotier">
      <!-- Tier 1: Brand & AI Services / Bots -->
      <div class="nav-tier-top">
        <a href="#" class="logo" data-target="top">
          <span>家づくりAIラボ</span>
          <span class="logo-badge">by 住ま居る</span>
        </a>

        <!-- AI Tools & Interactive Bots (Top Row) -->
        <div class="nav-ai-suite">
          <span class="nav-group-label">🤖 AI自動設計＆相談ボット群:</span>
          <ul class="nav-links-tier">
            <li><a class="nav-link-btn highlight-sky" data-target="floorplan-studio">📐 AI間取り選別・作図</a></li>
            <li><a class="nav-link-btn highlight-amber" data-target="ai-studio">🎨 AIパース工房</a></li>
            <li><a class="nav-link-btn highlight-emerald" data-target="thermal-consultation">💬 24h温熱換気AI相談</a></li>
            <li><a class="nav-link-btn highlight-purple" data-target="floorplan-studio" title="AIと対話して間取りプランを自由改変">🤖 間取り相談専用ボット</a></li>
          </ul>
        </div>

        <!-- Mobile Hamburger Button -->
        <button class="nav-toggle" id="nav-toggle" aria-label="メニュー切り替え">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <!-- Tier 2: Main Navigation & Showroom (Bottom Row) -->
      <div class="nav-tier-bottom">
        <ul class="nav-links-tier nav-main-links">
          <li><a class="nav-link active" data-target="top">🏠 ホーム</a></li>
          <li><a class="nav-link" data-target="article-feature" style="color: #f59e0b; font-weight: 800;">📖 手づくり住宅解体新書（全10章）</a></li>
          <li><a class="nav-link" data-target="our-philosophy">🏛️ 私たちの家づくり（芳彩）</a></li>
          <li><a class="nav-link" data-target="craftsmanship">🔨 お客様×大工さん×建築士（施工実例）</a></li>
          <li><a class="nav-link" data-target="metaverse">🌐 バーチャル展示場</a></li>
          <li><a class="nav-link" data-target="scent-experience">🌿 リアル展示場体感</a></li>
          <li><a class="nav-link carte-btn" id="nav-auth-btn" data-target="dashboard">👤 マイカルテ</a></li>
        </ul>
      </div>
    </div>
  </header>"""

# Find header range
h_start = html.find(old_header_start)
h_end = html.find(old_header_end) + len(old_header_end)

if h_start != -1 and h_end != -1:
    html = html[:h_start] + new_header + html[h_end:]
    print("Replaced Header with Two-Tier layout!")
else:
    print("Warning: Could not find Header in index.html!")

# Update mobile drawer links to include "お客様×大工さん×建築士"
old_drawer = """      <li><a class="mobile-nav-link" data-target="our-philosophy">🏛️ 私たちの家づくり（芳彩）</a></li>"""
new_drawer = """      <li><a class="mobile-nav-link" data-target="our-philosophy">🏛️ 私たちの家づくり（芳彩）</a></li>
      <li><a class="mobile-nav-link" data-target="craftsmanship">🔨 お客様×大工さん×建築士（施工実例）</a></li>"""
if old_drawer in html and 'data-target="craftsmanship"' not in html[:html.find('</aside>')]:
    html = html.replace(old_drawer, new_drawer)
    print("Added craftsmanship to mobile drawer!")

# --- 2. Replace #craftsmanship with 6 Interactive Case Studies ---
old_craft_start = '<!-- PAGE 3: CRAFTSMANSHIP (大工さん×建築士のタッグ) -->'
old_craft_end = '<!-- PAGE 4: METAVERSE EXHIBITION LINK & SPATIAL EXPERIENCE -->'

c_start = html.find(old_craft_start)
c_end = html.find(old_craft_end)

new_craftsmanship = """<!-- PAGE 3: CRAFTSMANSHIP (お客様×大工さん×建築士の施工実例写真集) -->
    <section id="craftsmanship" class="page-section">
      <div class="hero">
        <span class="hero-tag">お客様の叶えたい想い　×　大工さんの熟練技量 × 建築士の構造計算</span>
        <h1 class="hero-title">お客様×大工さん×建築士で紡ぐ、<br>世界に一つだけの完全手づくり邸宅。</h1>
        <p class="hero-subtitle">
          規格住宅のカタログからは決して生まれない、住まい手だけの物語。<br>
          お施主様の叶えたい暮らしの想いを、全棟許容応力度計算（耐震等級3・直下率60%超・超高断熱）で数値証明する構造建築士と、木を見極めてミリ単位で手刻みする専属大工職人さんが一体となりカタチにしました。
        </p>
      </div>

      <!-- Statement Split Card -->
      <div class="statement-split-card" style="margin-bottom: 2.5rem;">
        <div class="split-image-column">
          <img src="/images/craftsman_architect_tag.jpg" alt="お客様・大工さん・建築士のタッグ施工現場" class="split-card-img" />
          <div class="image-caption-badge">専属大工職人 × 構造建築士 × お施主様の三位一体家づくり</div>
        </div>
        <div class="split-text-column">
          <span class="badge-number" style="background: #0284c7;">唯一無二のチーム</span>
          <h3 class="card-title" style="font-size: 1.55rem; color: #0f172a; margin: 0.5rem 0 1rem;">
            なぜ「お客様×大工さん×建築士」でなければならないのか？
          </h3>
          <p class="card-text" style="margin-bottom: 1rem; line-height: 1.85;">
            ハウスメーカーの家づくりでは、営業担当が契約を取り、設計は下請け、大工も現場ごとに変わるのが通常です。これではお施主様の「本当に叶えたい想い」が現場に届くはずがありません。
          </p>
          <ul style="margin-left: 1.2rem; color: var(--text-muted); line-height: 2;">
            <li><strong>お客様の想いを直接具現化</strong>: 規格モジュール（尺・メーター）に囚われないミリ単位の自由設計。</li>
            <li><strong>大工さんの熟練技量</strong>: 木の癖を読み、見えない仕口を手刻みで組み上げる本物の大工魂。</li>
            <li><strong>建築士の構造・温熱計算</strong>: 吹き抜けや大開口でも耐震等級3・C値0.3以下を科学的に保証。</li>
          </ul>
        </div>
      </div>

      <!-- 6 CASE STUDIES INTERACTIVE PHOTO ALBUM (20+ Photos each) -->
      <div style="margin-top: 3.5rem;">
        <div style="text-align: center; max-width: 900px; margin: 0 auto 1.5rem;">
          <span class="badge-number" style="background: var(--accent-gold); font-size: 0.95rem; padding: 6px 18px;">施工実例写真集</span>
          <h2 style="color: var(--primary-green-dark); font-family: var(--font-heading); font-size: 2.1rem; margin: 0.8rem 0 0.5rem;">
            お客様邸 施工実例写真集（全6邸・各20枚以上の写真ギャラリー）
          </h2>
          <p style="color: var(--text-muted); font-size: 1.02rem;">
            気になるお住まいをタップして切り替えてご覧ください。各邸20枚以上の高精細写真とともに、お施主様の想い・大工職人の技・建築士の計算ポイントを詳細に掲載しています。
          </p>
        </div>

        <!-- Case Tabs Selector -->
        <div class="case-selector-bar" id="case-selector-bar">
          <button class="case-tab-btn active" data-case="1">
            <span>①【川越市・T様邸】吹抜け大空間と愛猫と暮らす吉野杉の家</span>
            <span class="case-tab-sub">延床34坪 / 許容応力度計算耐震等級3 / C値0.22 / 全24枚</span>
          </button>
          <button class="case-tab-btn" data-case="2">
            <span>②【鶴ヶ島市・M様邸】十和田石在来風呂と平屋風二世帯住宅</span>
            <span class="case-tab-sub">延床42坪 / HEAT20 G3 / 薪ストーブ / 全22枚</span>
          </button>
          <button class="case-tab-btn" data-case="3">
            <span>③【坂戸市・K様邸】インナーガレージと中庭を囲むリゾート邸宅</span>
            <span class="case-tab-sub">延床38坪 / 超高気密C値0.18 / 吹抜け中庭 / 全20枚</span>
          </button>
          <button class="case-tab-btn" data-case="4">
            <span>④【日高市・S様邸】杉と土壁の茶室・隠れ家ロフトのある和モダン</span>
            <span class="case-tab-sub">延床31坪 / 伝統木組み / 珪藻土手塗り / 全21枚</span>
          </button>
          <button class="case-tab-btn" data-case="5">
            <span>⑤【東松山市・H様邸】太陽光10kW＋V2Hオフグリッド自然素材住宅</span>
            <span class="case-tab-sub">延床36坪 / フリーエネルギー / 吉野杉30mm / 全23枚</span>
          </button>
          <button class="case-tab-btn" data-case="6">
            <span>⑥【所沢市・Y様邸】造作ライブラリーと回遊動線の子育て住宅</span>
            <span class="case-tab-sub">延床33坪 / 家事ラク回遊 / 大工造作本棚 / 全20枚</span>
          </button>
        </div>

        <!-- Interactive Gallery Viewer Container -->
        <div class="case-gallery-container" id="case-gallery-container">
          
          <!-- Main Photo Viewer -->
          <div class="case-main-viewer" id="case-main-viewer" title="クリックして全画面拡大表示">
            <span class="case-expand-hint">🔍 クリックで全画面拡大</span>
            <span class="case-badge-count" id="case-photo-counter">📸 写真 1 / 24枚</span>
            <img src="/images/cases/case1_living.jpg" alt="施工例メイン写真" class="case-main-img" id="case-main-img" />
            
            <!-- Navigation Arrows -->
            <button class="case-nav-arrow prev" id="case-prev-btn" aria-label="前の写真">◀</button>
            <button class="case-nav-arrow next" id="case-next-btn" aria-label="次の写真">▶</button>
            
            <!-- Caption Overlay -->
            <div class="case-caption-overlay" id="case-caption-text">
              【LDK全景】吉野杉30mm赤身材と職人手塗り珪藻土が包み込む、柱のない大空間リビング
            </div>
          </div>

          <!-- Thumbnails Strip (20+ Photos scrollable) -->
          <div class="case-thumbnails-strip" id="case-thumbnails-strip">
            <!-- Dynamically populated by JavaScript for 20+ photos -->
          </div>

          <!-- The Triad Story: Client / Carpenter / Architect -->
          <div class="case-story-triad" id="case-story-triad">
            <div class="case-story-col" style="border-top-color: #f59e0b;">
              <h4>💡 お客様の叶えたい想い</h4>
              <p id="case-story-client">
                「愛猫と一緒にストレスなく暮らしながら、冬でも素足で暖かく過ごせるリビングが一番の夢でした。既成のキャットウォークではなく、吉野杉の柱梁と一体になった職人手づくりの木製ステップを作っていただきました。」
              </p>
            </div>
            <div class="case-story-col" style="border-top-color: #0284c7;">
              <h4>🔨 大工さんの熟練手刻み</h4>
              <p id="case-story-carpenter">
                「22帖の柱なし大空間を強靭に支えるため、大黒柱と差し鴨居の仕口を現場で手刻み調整。猫ちゃんの手足に優しいよう、杉の角を一本一本手カンナで丸く面取りして仕上げました。」
              </p>
            </div>
            <div class="case-story-col" style="border-top-color: #10b981;">
              <h4>📐 建築士の構造・温熱計算</h4>
              <p id="case-story-architect">
                「吹抜けによる吹き下ろし冷気を防ぐため、全館気密実測C値0.22を達成。大開口サッシと吹抜けを両立させつつ、全棟許容応力度計算により耐震等級3・直下率68%を完璧に裏付けました。」
              </p>
            </div>
          </div>

          <!-- Real Model Booking Callout inside Cases -->
          <div style="text-align: center; margin-top: 2.2rem; background: #fafaf9; padding: 1.8rem; border-radius: 8px; border: 1px dashed #d97706;">
            <h4 style="color: #0f172a; font-size: 1.25rem; margin-bottom: 0.6rem;">
              実際のお住まいで使用している吉野杉・十和田石・珪藻土の香りと空気を体感しませんか？
            </h4>
            <p style="color: #64748b; font-size: 0.95rem; margin-bottom: 1.2rem;">
              リアル展示場「芳彩（かぐや）」では、すべての施工実例のベースとなった本物の素材と職人技術をじっくりご体感いただけます。
            </p>
            <button class="btn btn-primary open-auth-modal" style="font-size: 1.05rem; padding: 0.85rem 2.2rem; background: linear-gradient(135deg, #1b4332, #2d6a4f);">
              🌿 「芳彩」リアル展示場の見学予約（無料）はこちら →
            </button>
          </div>

        </div>
      </div>

    </section>

    """

if c_start != -1 and c_end != -1:
    html = html[:c_start] + new_craftsmanship + html[c_end:]
    print("Replaced #craftsmanship section with 6 Interactive Case Studies!")
else:
    print("Warning: Could not find craftsmanship section bounds in index.html!")

# Add Lightbox modal markup before </body>
lightbox_html = """  <!-- Lightbox Modal for Case Studies -->
  <div class="case-lightbox-modal" id="case-lightbox-modal">
    <button class="case-lightbox-close" id="case-lightbox-close" aria-label="閉じる">&times;</button>
    <img src="" alt="全画面拡大写真" class="case-lightbox-content" id="case-lightbox-content" />
  </div>
"""

if '<div class="case-lightbox-modal"' not in html:
    b_idx = html.find('</body>')
    if b_idx != -1:
        html = html[:b_idx] + lightbox_html + "\n" + html[b_idx:]
        print("Added Lightbox modal to body!")

with open("public/index.html", "w", encoding="utf-8") as out:
    out.write(html)

print("Saved updated public/index.html successfully!")
