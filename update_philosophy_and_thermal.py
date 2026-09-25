# -*- coding: utf-8 -*-
"""
Update public/index.html with:
1. Updated 24h Thermal AI Consultation text:
   「30年以上住宅の温熱環境について調査・研究してきた知識を全て解放。疑問点をどしどし聞いてください。24時間365日、弊社の建築指導等の回答をお返しいたします。」
2. Deep, unlimited-length exposition of "Always looking 30 years ahead in home building" and
   why freeing AI tools proves our undeniable foresight and 10+ year old model house supremacy.
"""

with open("public/index.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1. Update Hero section subtitle
old_hero_p = """            敷地や予算の制限で悩む前に、まずは「どんな暮らしがしたいか」を自由に描いてみませんか？<br>
            登録された優良間取りからAIが最適案を選別し、チャットで<strong>「あーでもないこーでもない」と自由改変</strong>。<br>
            間取りなしでも<strong>「いきなりフォトリアルパース」</strong>で理想を可視化。気になる温熱や気密の疑問も、<strong>24時間365日AIボット</strong>が忖度なしで即時回答します。<br>
            <span style="display: inline-block; margin-top: 0.6rem; color: #fde68a; font-size: 0.95rem; font-weight: 600;">
              ※ 住ま居るは、表面的な満足（間取りやデザイン）だけでなく、災害時に命を守り抜く「見えなくなる骨組み・筋肉」と「向こう30年最先端の快適性」を最重視しています。
            </span>"""

new_hero_p = """            敷地や予算の制限で悩む前に、まずは「どんな暮らしがしたいか」を自由に描いてみませんか？<br>
            登録された優良間取りからAIが最適案を選別し、チャットで<strong>「あーでもないこーでもない」と自由改変</strong>。<br>
            間取りなしでも<strong>「いきなりフォトリアルパース」</strong>で理想を瞬時に可視化。<br>
            そして<strong>30年以上住宅の温熱環境について調査・研究してきた知識を全て解放した「24時間温熱換気AI相談室」</strong>が、疑問点をどしどし受け止め、弊社の建築指導等の回答を忖度なしで24時間365日お返しいたします。<br>
            <span style="display: inline-block; margin-top: 0.75rem; color: #fde68a; font-size: 0.98rem; font-weight: 700; line-height: 1.6;">
              ※ 最先端AIの無料開放は、私たちの揺るぎない先見性の証明です。10年以上前のモデルハウスがすでに30年以上先を見据えていたように、住ま居るは常に「向こう30年最先端の住まい」をご提案いたします。
            </span>"""

if old_hero_p in html:
    html = html.replace(old_hero_p, new_hero_p)
    print("Updated Hero paragraph!")
else:
    print("Warning: old_hero_p not found verbatim, trying flexible replace...")

# 2. Update 3-Card AI section on Top Page
old_thermal_card = """              <h3 style="color: #047857; font-size: 1.3rem; margin-bottom: 0.6rem;">
                24h AI気密・断熱・換気相談室
              </h3>
              <p style="color: #475569; font-size: 0.92rem; line-height: 1.75; margin-bottom: 1rem;">
                ハウスメーカーごとに言うことが違う「結露対策」「C値・UA値」「換気方式」「床暖房の要否」を、中立な建築物理・熱工学データに基づきAIが即時回答。
              </p>"""

new_thermal_card = """              <h3 style="color: #047857; font-size: 1.3rem; margin-bottom: 0.6rem;">
                24h 温熱換気AI相談室
              </h3>
              <p style="color: #475569; font-size: 0.92rem; line-height: 1.75; margin-bottom: 1rem;">
                <strong>30年以上住宅の温熱環境について調査・研究してきた知識を全て解放。</strong>疑問点をどしどし聞いてください。24時間365日、弊社の建築指導等の回答をお返しいたします。
              </p>"""

if old_thermal_card in html:
    html = html.replace(old_thermal_card, new_thermal_card)
    print("Updated Top Page Thermal Card!")
else:
    print("Warning: old_thermal_card not found verbatim")

# 3. Update #our-philosophy section with deep, unrestricted-length philosophical exposition
# Let's locate the entire <div id="our-philosophy" ... </div> before the end of top section
start_phil = html.find('<div id="our-philosophy"')
end_phil = html.find('<!-- PAGE: ARCHIX & FLUX PHOTO-REAL PERSPECTIVE STUDIO -->', start_phil)
if start_phil != -1 and end_phil != -1:
    old_phil_block = html[start_phil:end_phil]
    
    new_phil_block = """<div id="our-philosophy" class="card" style="margin-top: 3.5rem; background: #ffffff; border: 2px solid rgba(217, 119, 6, 0.45); border-radius: var(--radius-lg); padding: 3.2rem 2.4rem; box-shadow: 0 12px 35px rgba(0,0,0,0.07);">
        <div style="text-align: center; max-width: 960px; margin: 0 auto 2.8rem;">
          <span style="background: #fef3c7; color: #92400e; font-weight: 800; padding: 7px 24px; border-radius: 20px; font-size: 0.95rem; display: inline-block; margin-bottom: 1rem; border: 1px solid #fde68a;">
            🤝 最先端AI無料開放の真意 ＆ 常に30年先を見据える住ま居るの真髄
          </span>
          <h2 style="color: var(--primary-green-dark); font-family: var(--font-heading); font-size: 2.25rem; margin-bottom: 1.3rem; line-height: 1.4;">
            なぜ私たちは最先端AIを完全無料開放するのか？<br>
            <span style="font-size: 1.6rem; color: #d97706;">10年以上前のモデルハウスが30年先を見据えていた実証、そして未来への責任</span>
          </h2>
          <p style="color: #334155; font-size: 1.08rem; line-height: 2.0; text-align: left; background: #fafaf9; padding: 1.8rem 2rem; border-radius: 12px; border-left: 5px solid #d97706; margin-bottom: 2rem;">
            「AI自動間取り選別・生成」「AIフォトリアルパース工房」「24時間温熱換気AI相談室」。これら最先端のシステムを一般ユーザーの皆様へ完全無料で開放すること自体が、株式会社住ま居るの圧倒的な<strong>「先進性」</strong>と<strong>「揺るぎない技術的自信」</strong>を何よりも雄弁に物語っています。<br><br>
            今から10年以上前、世の中がまだ「断熱等級4」や表面的なデザイン住宅に終始していた時代に、私たちが建てたリアルモデルハウス（芳彩）は、すでに<strong>「30年以上先の日本の住まい」</strong>を見据えて完成していました。実測C値0.3以下の超高気密、HEAT20 G2/G3水準の超高断熱、許容応力度計算による耐震等級3と直下率60%超の強靭な骨組み、大容量10.33kW屋根一体型太陽光発電、そして電気自動車連携（V2H）。10年以上が経過した現在でも、国がようやく法制化を進める省エネ基準をはるかに凌駕し、<strong>「向こう30年最先端の住宅」</strong>として圧倒的な存在感を放ち続けています。<br><br>
            間取りを考えたり、理想のCGパースを生成して胸を躍らせる表面的なワクワク感は、AIテクノロジーを活用してユーザー様ご自身が思う存分楽しんでいただきたい。そして、私たち建築のプロフェッショナルである住ま居るは、完成したら二度と見えなくなる<strong>「骨組み・筋肉」</strong>――ご家族の命を未来永劫守り抜く構造強度と、絶対に結露させない建築物理の真髄――を愚直に突き詰める。この信念と実績があるからこそ、私たちはすべてのノウハウとAIを惜しみなく無料開放できるのです。
          </p>
        </div>

        <!-- 4大真実カード -->
        <div class="grid-2" style="gap: 1.8rem; margin-bottom: 2.8rem;">
          
          <!-- 柱1: 時代を超える本物の性能 -->
          <div style="background: #f8fafc; border-top: 5px solid #d97706; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 0.9rem;">
              <span style="font-size: 1.8rem;">⏳</span>
              <span style="font-weight: 800; color: #b45309; font-size: 0.9rem; background: #fef3c7; padding: 4px 12px; border-radius: 12px;">時代を超える本物の性能</span>
            </div>
            <h3 style="color: #0f172a; font-size: 1.3rem; line-height: 1.5; margin-bottom: 0.9rem;">
              築10年超でもいまだ最先端。<br>性能という視線で見れば向こう30年最先端。
            </h3>
            <p style="color: #475569; font-size: 0.96rem; line-height: 1.9; margin: 0;">
              住ま居るのモデルハウスは、10年以上前に建築された建物です。しかし、今日建てられている大手ハウスメーカーの最新フラッグシップモデルと比較しても、基本性能・住み心地において遥かに先を行っています。<br>
              30年以上前から住宅の温熱環境と建築物理を徹底研究してきたからこそ、流行に流されず「本質」だけを追求できた。向こう30年先でも色褪せず、子や孫の世代まで最先端の省エネ・快適性を誇り続ける住まいをご提供します。
            </p>
          </div>

          <!-- 柱2: 骨組み・筋肉の最重視 -->
          <div style="background: #f8fafc; border-top: 5px solid #2563eb; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 0.9rem;">
              <span style="font-size: 1.8rem;">💪</span>
              <span style="font-weight: 800; color: #1d4ed8; font-size: 0.9rem; background: #dbeafe; padding: 4px 12px; border-radius: 12px;">命を守る構造の真実</span>
            </div>
            <h3 style="color: #0f172a; font-size: 1.3rem; line-height: 1.5; margin-bottom: 0.9rem;">
              表面的な満足（間取り・パース）より、<br>見えなくなる「骨組み・筋肉」を最重視。
            </h3>
            <p style="color: #475569; font-size: 0.96rem; line-height: 1.9; margin: 0;">
              間取りの工夫やフォトリアルパースの美しさは、家づくりの大きな喜びです。しかし、巨大地震や気候危機に見舞われた際、ご家族の命と財産を守り抜くのは壁紙やデザインではありません。<br>
              住ま居るは、完成後に壁の奥に隠れて二度と見えなくなる「構造（全棟許容応力度計算による耐震等級3・直下率60%超）」と「精密気密・断熱施工」に最大の情熱を注ぎます。見えない骨組みと筋肉が完璧だからこそ、真の安心が手に入ります。
            </p>
          </div>

          <!-- 柱3: 大手プレハブの寒冷地撤退と、鉄骨の物理的短所 -->
          <div style="background: #f8fafc; border-top: 5px solid #ef4444; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 0.9rem;">
              <span style="font-size: 1.8rem;">❄️</span>
              <span style="font-weight: 800; color: #b91c1c; font-size: 0.9rem; background: #fee2e2; padding: 4px 12px; border-radius: 12px;">建築物理と科学の事実</span>
            </div>
            <h3 style="color: #0f172a; font-size: 1.3rem; line-height: 1.5; margin-bottom: 0.9rem;">
              大手鉄骨プレハブの寒冷地撤退は必然。<br>四季のある日本で「鉄の骨組み」はあり得ない。
            </h3>
            <p style="color: #475569; font-size: 0.96rem; line-height: 1.9; margin: 0;">
              大手鉄骨ハウスメーカーが東北・北海道などの寒冷地から相次いで撤退を表明しました。建築物理学の観点から見れば、これは極めて当然の結末です。<br>
              熱伝導率が木材の数百倍におよぶ「鉄」を住宅の構造躯体に使うことは、強大な「熱橋（ヒートブリッジ）」を室内に張り巡らせることに他なりません。夏は灼熱、冬は底冷えし、壁内結露のリスクを常に抱える鉄骨プレハブに対し、<strong>木造×超高断熱・超高気密こそが四季ある日本における唯一無二の正解</strong>です。
            </p>
          </div>

          <!-- 柱4: 売買前提の家づくり vs 長く住み続けるための家づくり -->
          <div style="background: #f8fafc; border-top: 5px solid #059669; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 0.9rem;">
              <span style="font-size: 1.8rem;">🏡</span>
              <span style="font-weight: 800; color: #047857; font-size: 0.9rem; background: #d1fae5; padding: 4px 12px; border-radius: 12px;">家づくりの根本的な目線</span>
            </div>
            <h3 style="color: #0f172a; font-size: 1.3rem; line-height: 1.5; margin-bottom: 0.9rem;">
              売買を前提とした短期サイクルの家ではなく、<br>「長く住み続ける快適性と健康」を最重視。
            </h3>
            <p style="color: #475569; font-size: 0.96rem; line-height: 1.9; margin: 0;">
              資産転売や30年での建て替えを前提とする住宅と、ご家族が半世紀以上にわたって深い愛着を持ち住み継ぐ住宅とでは、求められる思想が根本から異なります。<br>
              売買前提の家は新築時の見栄えとコスト削減が優先されますが、住み続ける家は「50年経っても壁内結露を起こさず構造が腐らないこと」「無垢材が艶を増し熟成すること」「冷暖房費を最小限に抑える超省エネ性」が不可欠です。私たちは何世代も快適に住み継げる真の価値だけを造り続けます。
            </p>
          </div>

        </div>

        <!-- 芳彩（かぐや）への自然な誘い -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #fff; border-radius: var(--radius-md); padding: 2.4rem; border-left: 6px solid var(--accent-gold); margin-bottom: 2rem;">
          <div style="font-size: 0.95rem; color: #fbbf24; font-weight: 800; margin-bottom: 0.6rem;">
            🏆 私たちがたどり着いた究極の答え
          </div>
          <h3 style="color: #ffffff; font-size: 1.55rem; margin-bottom: 1.1rem; line-height: 1.45;">
            見えなくなる骨組みを極め、自然の恩恵に包まれる家。<br>
            それが旗艦邸宅「芳彩（かぐや）— 結露しない家」です。
          </h3>
          <p style="color: #cbd5e1; font-size: 1.05rem; line-height: 1.95; margin-bottom: 1.6rem;">
            外皮は超高断熱・高気密（HEAT20 G2/G3 × 実測C値0.3以下）で外気を完全にシャットアウト。全棟許容応力度計算による耐震等級3の強靭な骨組みでご家族を守り抜き、室内は呼吸する珪藻土と吉野杉・ヒノキ無垢材の清らかな芳香に満たされる。<br>
            専属の大工職人さんと構造建築士がミリ単位の手仕事で紡ぎ出す、向こう30年最先端の手づくり邸宅です。
          </p>
          <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            <button class="btn btn-secondary" data-target="article-feature" style="font-size: 1rem; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.3); padding: 0.8rem 1.6rem;">
              📖 手づくり住宅解体新書（全10章）を読む →
            </button>
            <button class="btn btn-secondary" data-target="metaverse" style="font-size: 1rem; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.3); padding: 0.8rem 1.6rem;">
              🌐 バーチャル展示場を見てみる →
            </button>
            <button class="btn btn-primary open-auth-modal" style="font-size: 1rem; padding: 0.8rem 1.6rem;">
              🌿 「芳彩」リアル体感予約・マイカルテ作成 →
            </button>
          </div>
        </div>
      </div>\n\n      """
    
    html = html[:start_phil] + new_phil_block + html[end_phil:]
    print("Successfully replaced #our-philosophy block with deep exposition!")

# 4. Update #thermal-consultation section hero and preamble
old_thermal_hero = """    <!-- PAGE: 24/365 AI BUILDING PHYSICS & THERMAL ENVIRONMENT CONSULTATION (新設) -->
    <section id="thermal-consultation" class="page-section">
      <div class="hero" style="background: linear-gradient(135deg, #064e3b 0%, #0f172a 100%);">
        <span class="hero-tag" style="background: rgba(16, 185, 129, 0.15); border-color: #10b981; color: #6ee7b7;">
          💬 24時間365日 AI中立相談 ｜ 登録不要・完全無料
        </span>
        <h1 class="hero-title">
          24h AI気密・断熱・換気計画相談室<br>
          <span style="color: #34d399; font-size: 1.65rem;">営業トークなし。熱工学・換気工学の客観データで疑問を完全解消</span>
        </h1>
        <p class="hero-subtitle">
          「ハウスメーカーごとに言うことが違って何を信じればいいかわからない」「本当に結露しない家にするには何が必要？」<br>
          忖度なしの中立AIが、C値・UA値・換気方式・窓選び・床暖房の仕組みまで、最新の学術基準に基づき24時間いつでも分かりやすくお答えします。
        </p>
      </div>"""

new_thermal_hero = """    <!-- PAGE: 24/365 AI BUILDING PHYSICS & THERMAL ENVIRONMENT CONSULTATION -->
    <section id="thermal-consultation" class="page-section">
      <div class="hero" style="background: linear-gradient(135deg, #064e3b 0%, #0f172a 100%);">
        <span class="hero-tag" style="background: rgba(16, 185, 129, 0.15); border-color: #10b981; color: #6ee7b7;">
          💬 24時間365日・建築指導等の回答をお返し ｜ 登録不要・完全無料
        </span>
        <h1 class="hero-title">
          24h 温熱換気AI相談室<br>
          <span style="color: #34d399; font-size: 1.65rem;">30年以上住宅の温熱環境について調査・研究してきた知識を全て解放</span>
        </h1>
        <p class="hero-subtitle">
          30年以上住宅の温熱環境について調査・研究してきた知識を全て解放。疑問点をどしどし聞いてください。24時間365日、弊社の建築指導等の回答をお返しいたします。<br>
          「ハウスメーカーごとに言うことが違って何を信じればいいかわからない」「本当に壁内結露しない家にするには？」「鉄骨と木造の熱物理の差は？」など、忖度なしの中立AIが客観データと学術根拠に基づいて即時回答します。
        </p>
      </div>"""

if old_thermal_hero in html:
    html = html.replace(old_thermal_hero, new_thermal_hero)
    print("Updated #thermal-consultation Hero!")
else:
    print("Warning: old_thermal_hero not found verbatim")

with open("public/index.html", "w", encoding="utf-8") as out:
    out.write(html)

print("Saved updated public/index.html successfully!")
