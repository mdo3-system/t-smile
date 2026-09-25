# -*- coding: utf-8 -*-
"""
Apply textual updates to public/index.html and server/app.js:
1. Remove '相次いで'
2. Change '住ま居るの鶴ヶ島モデルハウスは' -> '住ま居るの　芳彩（かぐや）-結露しない家　モデルハウスは'
3. Change 'by 株式会社住ま居る' -> 'by 住ま居る'
4. Replace t-smile.co.jp address in article-feature hero
5. Remove stained glass image from Chapter 2
6. Add real model house booking button under Web広告やテキスト callout
7. Change '大工さん×建築士の手づくり設計詳細' -> 'お客様×大工さん×建築士'
8. Change '大工さんの熟練技量 × 建築士の構造計算' -> 'お客様の叶えたい想い　×　大工さんの熟練技量 × 建築士の構造計算'
9. Expand 'AIテクノロジー革新' section
"""

# --- 1. Update public/index.html ---
with open("public/index.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1.1 Remove '相次いで'
html = html.replace("大手鉄骨プレハブメーカーが東北・北海道などの寒冷地から相次いで撤退を表明しました。",
                    "大手鉄骨プレハブメーカーが東北・北海道などの寒冷地から撤退を表明しました。")
html = html.replace("大手鉄骨ハウスメーカーが東北・北海道などの寒冷地から相次いで撤退を表明しました。",
                    "大手鉄骨ハウスメーカーが東北・北海道などの寒冷地から撤退を表明しました。")

# 1.2 Replace '住ま居るの鶴ヶ島モデルハウスは'
html = html.replace("住ま居るの鶴ヶ島モデルハウスは", "住ま居るの　芳彩（かぐや）-結露しない家　モデルハウスは")

# 1.3 Replace 'by 株式会社住ま居る'
html = html.replace('<span class="logo-badge">by 株式会社住ま居る</span>',
                    '<span class="logo-badge">by 住ま居る</span>')

# 1.4 Replace t-smile.co.jp in article-feature
html = html.replace('<span class="hero-tag">参考資料: t-smile.co.jp/modelhouse 完全解体新書</span>',
                    '<span class="hero-tag">「芳彩（かぐや）-結露しない家」モデルハウス 完全解体新書</span>')
html = html.replace('t-smile.co.jp/modelhouse の全要素を極限まで深掘りした特大特集。（全10章）',
                    '「芳彩（かぐや）-結露しない家」モデルハウスの全要素を極限まで深掘りした特大特集。（全10章）')

# 1.5 Remove stained glass image from Chapter 2
old_ch2_grid = """          <div class="grid-2" style="align-items: start; margin: 1.2rem 0;">
            <div class="kaitai-sketch-frame" style="margin: 0;">
              <img src="/images/kaitai/ch2_blue_entrance_screen.jpg" alt="爽やかな風を通す網戸付き玄関引戸の手描きスケッチ" class="kaitai-sketch-img" style="max-height: 460px; object-fit: contain; background: #faf9f6;" />
              <div class="kaitai-sketch-caption">📐 【意匠スケッチ】埼玉の涼風を室内に招く網戸付き玄関引戸</div>
            </div>
            <div class="kaitai-sketch-frame" style="margin: 0;">
              <img src="/images/kaitai/ch2_stained_glass.jpg" alt="玄関ホールを彩るアンティークステンドグラスの手描きスケッチ" class="kaitai-sketch-img" style="max-height: 460px; object-fit: contain; background: #faf9f6;" />
              <div class="kaitai-sketch-caption">📐 【意匠スケッチ】玄関ホールに柔らかな光を落とすステンドグラスと縦格子</div>
            </div>
          </div>"""

new_ch2_grid = """          <div class="kaitai-sketch-frame" style="margin: 1.5rem 0;">
            <img src="/images/kaitai/ch2_blue_entrance_screen.jpg" alt="爽やかな風を通す網戸付き玄関引戸の手描きスケッチ" class="kaitai-sketch-img" style="max-height: 460px; object-fit: contain; background: #faf9f6;" />
            <div class="kaitai-sketch-caption">📐 【意匠スケッチ】埼玉の涼風を室内に招く網戸付き玄関引戸</div>
          </div>"""

if old_ch2_grid in html:
    html = html.replace(old_ch2_grid, new_ch2_grid)
    print("Removed stained glass image from Chapter 2!")
else:
    print("Warning: old_ch2_grid not matched verbatim, checking alternatives...")

# 1.6 Add real model house booking button under Web広告やテキスト callout
old_callout = """          <div class="highlight-callout-box">
            <strong>⚠️ Web広告やテキスト、写真では絶対に伝わらない本物の体験</strong><br>
            この「心地よい香りと24時間フラットな空気感」だけは、言葉ではなく現地で体感していただく他ありません。だからこそ、本物のリアル展示場へ足をお運びください。
          </div>"""

new_callout = """          <div class="highlight-callout-box">
            <strong>⚠️ Web広告やテキスト、写真では絶対に伝わらない本物の体験</strong><br>
            この「心地よい香りと24時間フラットな空気感」だけは、言葉ではなく現地で体感していただく他ありません。だからこそ、本物のリアル展示場へ足をお運びください。
          </div>
          <div style="margin-top: 1.2rem; text-align: left;">
            <button class="btn btn-primary open-auth-modal" style="background: linear-gradient(135deg, #d97706, #f59e0b); color: #0f172a; font-weight: 800; font-size: 1.05rem; padding: 0.95rem 2rem; box-shadow: 0 4px 15px rgba(217, 119, 6, 0.35);">
              🌿 「芳彩」実物モデルハウスへの見学申し込み（無料）はこちら →
            </button>
          </div>"""

if old_callout in html:
    html = html.replace(old_callout, new_callout)
    print("Added booking button under highlight callout box!")
else:
    print("Warning: old_callout not found verbatim!")

# 1.7 Replace button and hero titles for craftsmanship
html = html.replace("🔨 大工さん×建築士の手づくり設計詳細を見る →", "🔨 お客様×大工さん×建築士の手づくり設計詳細を見る →")
html = html.replace("大工さんの熟練技量 × 建築士の構造計算", "お客様の叶えたい想い　×　大工さんの熟練技量 × 建築士の構造計算")

# 1.8 Expand AIテクノロジー革新 section
old_ai_innov = """      <!-- CORE STATEMENT 3: UNLIMITED FREE PERSPECTIVE CREATION (VISUAL CAROUSEL/GRID) -->
      <div class="wizard-box" style="margin-top: 3rem;">
        <div style="text-align: center; max-width: 850px; margin: 0 auto 2rem;">
          <span class="badge-number" style="background: var(--accent-gold); font-size: 0.95rem; padding: 6px 16px;">AIテクノロジー革新</span>
          <h2 style="color: var(--primary-green-dark); font-family: var(--font-heading); font-size: 2rem; margin: 0.8rem 0 0.5rem;">
            「デザイナーはあなた」パース無料無制限作図の魅力
          </h2>
          <p style="color: var(--text-muted); font-size: 1.05rem;">
            営業マンの拙い手描きスケッチを何日も待つ必要はありません。AIパース工房なら、対話形式で理想の外観・スタイル・ライティングを選び、自社GPUマシンが何度でも無料で高精細な3Dパースを描き出します。
          </p>
        </div>

        <div class="grid-3">
          <div class="card" style="padding: 1.2rem;">
            <img src="/images/hero_kaguya_house.jpg" alt="和モダン外観パース" class="card-img" />
            <h3 class="card-title" style="font-size: 1.15rem;">【和モダン・ジャパンディ】</h3>
            <p class="card-text">黒ガルバリウム × 無垢木製ルーバー × 深い軒の出。陰影の美しさを際立たせる作図例。</p>
          </div>
          <div class="card" style="padding: 1.2rem;">
            <img src="/images/artisan_custom_bath.jpg" alt="職人造作風呂パース" class="card-img" />
            <h3 class="card-title" style="font-size: 1.15rem;">【職人造作風呂】</h3>
            <p class="card-text">十和田石 × ヒノキ張り × 庭を臨む大開口。ユニットバス（UB）に縛られない極上お風呂。</p>
          </div>
          <div class="card" style="padding: 1.2rem;">
            <img src="/images/natural_interior_aroma.jpg" alt="内観リビングパース" class="card-img" />
            <h3 class="card-title" style="font-size: 1.15rem;">【自然素材LDK】</h3>
            <p class="card-text">吉野杉無垢床 × 白漆喰壁。暖かな光と木の香りが満ちるリビング設計。</p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 2rem;">
          <button class="btn btn-primary" data-target="ai-studio" style="padding: 1rem 2.5rem; font-size: 1.1rem;">
            🎨 パース無料無制限作図（AIパース工房）を試す →
          </button>
        </div>
      </div>"""

new_ai_innov = """      <!-- CORE STATEMENT 3: AI TECHNOLOGY INNOVATION (4 MAJOR SERVICES INTEGRATED) -->
      <div class="wizard-box" style="margin-top: 3rem;">
        <div style="text-align: center; max-width: 900px; margin: 0 auto 2.2rem;">
          <span class="badge-number" style="background: var(--accent-gold); font-size: 0.95rem; padding: 6px 18px;">AIテクノロジー革新</span>
          <h2 style="color: var(--primary-green-dark); font-family: var(--font-heading); font-size: 2.1rem; margin: 0.8rem 0 0.6rem; line-height: 1.4;">
            「デザイナーはあなた」<br>
            パース無料無制限作図・自動間取り作図・間取り相談・高気密高断熱住宅相談
          </h2>
          <p style="color: var(--text-muted); font-size: 1.05rem; line-height: 1.8;">
            営業マンの拙い手描きスケッチを何日も待つ時代は終わりました。住ま居るが開発した4つの最先端AIサービスが、あなたの自由な家づくりを24時間体制でフルサポート。すべてのツールを完全無料で心ゆくまでお使いいただけます。
          </p>
        </div>

        <div class="grid-4" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem;">
          <!-- 1. パース無料無制限作図 -->
          <div class="card" style="padding: 1.5rem; border-top: 4px solid #f59e0b; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎨</div>
              <h3 class="card-title" style="font-size: 1.18rem; color: #b45309; margin-bottom: 0.6rem;">パース無料無制限作図</h3>
              <p class="card-text" style="font-size: 0.92rem; line-height: 1.7; color: #475569;">
                和モダン、ジャパンディ、十和田石風呂など、好みのスタイルと光環境を選ぶだけで、プロ仕様のフォトリアル3D空間を自社GPUで何度でも瞬時に生成します。
              </p>
            </div>
            <button class="btn btn-secondary" data-target="ai-studio" style="margin-top: 1rem; width: 100%; justify-content: center; font-size: 0.9rem;">
              パース作成を試す →
            </button>
          </div>

          <!-- 2. 自動間取り作図 -->
          <div class="card" style="padding: 1.5rem; border-top: 4px solid #0284c7; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">📐</div>
              <h3 class="card-title" style="font-size: 1.18rem; color: #0369a1; margin-bottom: 0.6rem;">自動間取り作図</h3>
              <p class="card-text" style="font-size: 0.92rem; line-height: 1.7; color: #475569;">
                150㎡未満の実在優良プラン（平屋・2階建て）データベースから、家族構成・延床坪数・ライフスタイルに完全合致する理想の間取りプランをAIが瞬時に自動選別・作図します。
              </p>
            </div>
            <button class="btn btn-secondary" data-target="floorplan-studio" style="margin-top: 1rem; width: 100%; justify-content: center; font-size: 0.9rem;">
              間取りを選別する →
            </button>
          </div>

          <!-- 3. 間取り相談 -->
          <div class="card" style="padding: 1.5rem; border-top: 4px solid #8b5cf6; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">💡</div>
              <h3 class="card-title" style="font-size: 1.18rem; color: #6d28d9; margin-bottom: 0.6rem;">AI間取り相談</h3>
              <p class="card-text" style="font-size: 0.92rem; line-height: 1.7; color: #475569;">
                「パントリーを広げたい」「洗面所から直接ファミクロに行きたい」など、選んだ間取りに対してチャットで「あーでもないこーでもない」と自由改変・相談が可能です。
              </p>
            </div>
            <button class="btn btn-secondary" data-target="floorplan-studio" style="margin-top: 1rem; width: 100%; justify-content: center; font-size: 0.9rem;">
              間取りを相談・改変 →
            </button>
          </div>

          <!-- 4. 高気密高断熱住宅相談 -->
          <div class="card" style="padding: 1.5rem; border-top: 4px solid #10b981; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">💬</div>
              <h3 class="card-title" style="font-size: 1.18rem; color: #047857; margin-bottom: 0.6rem;">高気密高断熱住宅相談</h3>
              <p class="card-text" style="font-size: 0.92rem; line-height: 1.7; color: #475569;">
                30年以上研究してきた温熱環境知識を全解放。C値0.3、HEAT20 G2/G3、第1種換気、壁内結露対策など、弊社の建築指導等の回答を忖度なしで24時間365日お答えします。
              </p>
            </div>
            <button class="btn btn-secondary" data-target="thermal-consultation" style="margin-top: 1rem; width: 100%; justify-content: center; font-size: 0.9rem;">
              温熱・気密を相談する →
            </button>
          </div>
        </div>

        <div style="text-align: center; margin-top: 2.2rem; display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap;">
          <button class="btn btn-primary" data-target="floorplan-studio" style="padding: 0.9rem 2rem; font-size: 1.05rem; background: linear-gradient(135deg, #0284c7, #38bdf8);">
            📐 間取り自動作図・相談スタジオ →
          </button>
          <button class="btn btn-primary" data-target="ai-studio" style="padding: 0.9rem 2rem; font-size: 1.05rem; background: linear-gradient(135deg, #d97706, #f59e0b); color: #0f172a;">
            🎨 パース無料無制限作図工房 →
          </button>
          <button class="btn btn-primary" data-target="thermal-consultation" style="padding: 0.9rem 2rem; font-size: 1.05rem; background: linear-gradient(135deg, #059669, #10b981);">
            💬 24h温熱換気AI相談室 →
          </button>
        </div>
      </div>"""

if old_ai_innov in html:
    html = html.replace(old_ai_innov, new_ai_innov)
    print("Expanded AIテクノロジー革新 section successfully!")
else:
    print("Warning: old_ai_innov not found verbatim!")

with open("public/index.html", "w", encoding="utf-8") as out:
    out.write(html)

print("Updated public/index.html successfully!")


# --- 2. Update server/app.js ---
with open("server/app.js", "r", encoding="utf-8") as f:
    server_code = f.read()

server_code = server_code.replace("住ま居るの鶴ヶ島モデルハウスは", "住ま居るの　芳彩（かぐや）-結露しない家　モデルハウスは")
server_code = server_code.replace("大手鉄骨プレハブメーカーが東北・北海道などの寒冷地から相次いで撤退を表明しました。",
                                  "大手鉄骨プレハブメーカーが東北・北海道などの寒冷地から撤退を表明しました。")
server_code = server_code.replace("大手プレハブメーカーが東北や北海道などの寒冷地から撤退を表明したのは",
                                  "大手プレハブメーカーが東北や北海道などの寒冷地から撤退を表明したのは")

with open("server/app.js", "w", encoding="utf-8") as out:
    out.write(server_code)

print("Updated server/app.js successfully!")
