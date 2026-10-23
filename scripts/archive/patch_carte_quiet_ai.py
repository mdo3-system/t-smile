# -*- coding: utf-8 -*-
"""
Patch House Carte and Lifestyle Bot:
AI must NOT give answers until requested. It must focus on stocking user requests.
"""

# 1. Update src/partials/section-madori-bot.html
with open('src/partials/section-madori-bot.html', 'r', encoding='utf-8') as f:
    bot_html = f.read()

old_bot_text = """          <p style="color: #475569; font-size: 1rem; line-height: 1.8; max-width: 860px; margin: 0 auto;">
            「駐車は何台？」「朝7時の洗面渋滞は？」「乾太くんからファミクロへの直結動線は？」<br>
            夫婦で画面を見ながら、あーでもないこーでもないと本音を答えていくだけで、<strong>AIが2人のすれ違いを解消する「融合案・妥協案」を導き出し、あなたのご家族専用の「家づくりカルテ」</strong>を無料で自動作成します。
          </p>"""

new_bot_text = """          <p style="color: #475569; font-size: 1rem; line-height: 1.8; max-width: 860px; margin: 0 auto;">
            「駐車は何台？」「朝7時の洗面渋滞は？」「乾太くんからファミクロへの直結動線は？」<br>
            夫婦で画面を見ながら本音を答えていくだけで、<strong>AIは余計な口出しをせずご要望のストック・整理に徹します</strong>。<br>
            「どう両立させたらいい？」と回答を求めた時にだけ、<strong>AIが2人のすれ違いを解消する「折衷案・融合案」</strong>をご提案します。
          </p>"""

if old_bot_text in bot_html:
    bot_html = bot_html.replace(old_bot_text, new_bot_text, 1)
    with open('src/partials/section-madori-bot.html', 'w', encoding='utf-8') as f:
        f.write(bot_html)
    print("1. Updated section-madori-bot.html successfully.")
else:
    # Try with normal line endings
    norm_bot = bot_html.replace('\r\n', '\n')
    norm_old = old_bot_text.replace('\r\n', '\n')
    norm_new = new_bot_text.replace('\r\n', '\n')
    if norm_old in norm_bot:
        norm_bot = norm_bot.replace(norm_old, norm_new, 1)
        with open('src/partials/section-madori-bot.html', 'w', encoding='utf-8') as f:
            f.write(norm_bot)
        print("1. Updated section-madori-bot.html (normalized) successfully.")
    else:
        print("WARNING: Could not match old_bot_text in section-madori-bot.html.")

# 2. Update public/js/lifestyle-bot.js
with open('public/js/lifestyle-bot.js', 'r', encoding='utf-8') as f:
    js_code = f.read()

# Add quiet AI banner in renderCurrentPhase
old_phase_header = """          <div class="lifestyle-header-badge">🌿 夫婦の会話が弾む・AI設計ヒアリング</div>
          <h2 class="lifestyle-header-title">${currentPhase.title}</h2>
          <p class="lifestyle-header-desc">
            夫婦で画面を見ながら選ぶか、LINEでパートナーのスマホに送って別々に答えて合体することも可能です。<br>
            ※途中で閉じても、前回の続きからいつでも再開できます。
          </p>"""

new_phase_header = """          <div class="lifestyle-header-badge">🌿 夫婦の会話が弾む・要望ストック型AIヒアリング</div>
          <h2 class="lifestyle-header-title">${currentPhase.title}</h2>
          <p class="lifestyle-header-desc">
            夫婦で画面を見ながら選ぶか、LINEでパートナーのスマホに送って別々に答えて合体することも可能です。<br>
            <span style="display:inline-block;margin-top:4px;color:#047857;font-weight:700;">※AIは回答を求められるまで勝手に口出しをせず、ご夫婦のご要望・本音のストックに務めます。</span>
          </p>"""

js_code_norm = js_code.replace('\r\n', '\n')
norm_p_old = old_phase_header.replace('\r\n', '\n')
norm_p_new = new_phase_header.replace('\r\n', '\n')

if norm_p_old in js_code_norm:
    js_code_norm = js_code_norm.replace(norm_p_old, norm_p_new, 1)
    print("2. Added quiet AI notice in questionnaire header.")

# Update renderCarteOutput in lifestyle-bot.js:
# Put stocked requests first, and AI fusion recommendations under a "Ask AI for proposals" request button
old_carte_start = "  // AI処方箋・家づくりカルテの出力\n  function renderCarteOutput(container) {"
old_carte_end = "    // 再スタート\n    const restartBtn = container.querySelector('#btn-interview-restart');"

idx_c_start = js_code_norm.find(old_carte_start)
idx_c_end = js_code_norm.find(old_carte_end, idx_c_start)

if idx_c_start != -1 and idx_c_end != -1:
    new_carte_func = """  // AI処方箋・家づくりカルテの出力（要望ストック第一・AI回答は求められた時のみ）
  function renderCarteOutput(container) {
    const fusions = generateAIFusionRecommendations(answers);
    const completeShareUrl = generateShareUrl('both_done');

    // 保存済みの間取り図面ストックを取得
    let savedPlans = [];
    try {
      const raw = localStorage.getItem('smile_house_carte_data');
      if (raw) {
        const carte = JSON.parse(raw);
        if (carte && carte.savedPlans) savedPlans = carte.savedPlans;
      }
    } catch(e) {}

    let html = `
      <div class="lifestyle-interview-container">
        <div class="lifestyle-header" style="background: linear-gradient(135deg, #064e3b 0%, #022c22 60%, #0f172a 100%);">
          <div class="lifestyle-header-badge" style="background:#10b981;color:#fff;">📋 ご夫婦の要望ストック完了</div>
          <h2 class="lifestyle-header-title">【住ま居る 家カルテ】<br>ご夫婦の理想・本音ストック一覧</h2>
          <p class="lifestyle-header-desc">
            お疲れ様でした！ご夫婦それぞれの回答や本音、お気に入りの図面メモをカルテにストック・整理しました。<br>
            <strong>AIは回答を求められるまで勝手な提案や口出しをいたしません。</strong>まずはストックされたご要望をご確認ください。
          </p>
        </div>

        <!-- 完成カルテのLINE共有バナー -->
        <div style="padding: 1rem 1.5rem 0.5rem; background: #fafaf9;">
          <div class="lifestyle-line-invite-bar">
            <div>
              <div style="font-weight: 800; font-size: 0.95rem; display: flex; align-items: center; gap: 6px;">
                <span>📲</span> この家カルテをLINEでパートナーや家族に送る
              </div>
              <div style="font-size: 0.78rem; opacity: 0.9; margin-top: 2px;">
                相手のスマホでもこのストックカルテをそのまま閲覧・再編集・間取り保存できます。
              </div>
            </div>
            <a href="https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(completeShareUrl)}" target="_blank" rel="noopener" class="lifestyle-line-btn">
              💬 LINEでカルテを共有
            </a>
          </div>
        </div>

        <div class="lifestyle-body" style="background:#ffffff;">

          <!-- ① 最優先表示: ストックされたご家族の暮らしの基本骨格 -->
          <div style="background:#f8fafc;border:2px solid #cbd5e1;border-radius:14px;padding:1.6rem;margin-bottom:2rem;box-shadow:0 4px 15px rgba(0,0,0,0.03);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:8px;border-bottom:1.5px solid #e2e8f0;padding-bottom:0.6rem;">
              <h3 style="font-size:1.25rem;color:#0f172a;margin:0;display:flex;align-items:center;gap:8px;">
                <span>📋</span> ストックされた暮らしのご要望（基本骨格）
              </h3>
              <span style="font-size:0.78rem;color:#059669;background:#ecfdf5;border:1px solid #6ee7b7;padding:3px 10px;border-radius:12px;font-weight:800;">
                ✔ 要望ストック中
              </span>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1rem;">
              <div style="background:#fff;padding:1rem;border-radius:10px;border:1.5px solid #bae6fd;">
                <div style="font-weight:800;color:#0369a1;font-size:0.88rem;">🚗 駐車計画</div>
                <div style="font-size:0.92rem;color:#334155;margin-top:4px;">
                  ${formatCarAnswer(answers.car_parking, answers.car_parking_details)}
                </div>
              </div>
              <div style="background:#fff;padding:1rem;border-radius:10px;border:1.5px solid #a7f3d0;">
                <div style="font-weight:800;color:#047857;font-size:0.88rem;">👕 ランドリー＆家事</div>
                <div style="font-size:0.92rem;color:#334155;margin-top:4px;">
                  ${formatLaundryAnswer(answers.laundry_cycle)}
                </div>
              </div>
              <div style="background:#fff;padding:1rem;border-radius:10px;border:1.5px solid #fde68a;">
                <div style="font-weight:800;color:#b45309;font-size:0.88rem;">⏰ 朝の身支度・洗面</div>
                <div style="font-size:0.92rem;color:#334155;margin-top:4px;">
                  ${formatMorningAnswer(answers.morning_rush)}
                </div>
              </div>
              <div style="background:#fff;padding:1rem;border-radius:10px;border:1.5px solid #ddd6fe;">
                <div style="font-weight:800;color:#6d28d9;font-size:0.88rem;">🍳 キッチン＆配膳</div>
                <div style="font-size:0.92rem;color:#334155;margin-top:4px;">
                  ${formatKitchenAnswer(answers.kitchen_style)}
                </div>
              </div>
            </div>

            <!-- 夫婦それぞれの本音ストック -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1rem;margin-top:1rem;">
              <div style="background:#eff6ff;padding:1.1rem;border-radius:10px;border:1.5px solid #93c5fd;">
                <div style="font-weight:800;color:#1e40af;font-size:0.9rem;display:flex;align-items:center;gap:6px;">
                  <span>👨</span> 夫のこだわり・本音ストック
                </div>
                <div style="font-size:0.88rem;color:#1e293b;margin-top:6px;line-height:1.6;">
                  ${answers.husband_secret_wish_text ? escapeHtml(answers.husband_secret_wish_text) : '「自分の居場所・書斎や趣味、お風呂でのんびりしたい」'}
                </div>
              </div>
              <div style="background:#fdf2f8;padding:1.1rem;border-radius:10px;border:1.5px solid #fbcfe8;">
                <div style="font-weight:800;color:#9d174d;font-size:0.9rem;display:flex;align-items:center;gap:6px;">
                  <span>👩</span> 妻のこだわり・本音ストック
                </div>
                <div style="font-size:0.88rem;color:#1e293b;margin-top:6px;line-height:1.6;">
                  ${answers.wife_secret_wish_text ? escapeHtml(answers.wife_secret_wish_text) : '「散らからない収納、家事動線の短縮、自分時間」'}
                </div>
              </div>
            </div>
          </div>

          <!-- ② ストックされた間取り図面 ＆ メモ -->
          ${savedPlans.length > 0 ? `
            <div style="background:#faf5ff;border:2px solid #c084fc;border-radius:14px;padding:1.6rem;margin-bottom:2rem;">
              <h3 style="font-size:1.25rem;color:#581c87;margin:0 0 1rem;display:flex;align-items:center;gap:8px;">
                <span>💾</span> ストックされたお気に入り間取り図面（${savedPlans.length}件）
              </h3>
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:1rem;">
                ${savedPlans.map(p => `
                  <div style="background:#fff;border-radius:10px;border:1px solid #e9d5ff;padding:0.9rem;box-shadow:0 2px 8px rgba(147,51,234,0.06);">
                    <div style="font-weight:800;color:#6b21a8;font-size:0.92rem;margin-bottom:4px;">${escapeHtml(p.title)}</div>
                    <div style="font-size:0.78rem;color:#64748b;margin-bottom:6px;">延床 ${p.tsubo}坪 ｜ ${p.rooms || ''}</div>
                    ${p.thumb ? `<img src="${p.thumb}" alt="" style="width:100%;height:120px;object-fit:contain;background:#020617;border-radius:6px;margin-bottom:6px;" />` : ''}
                    <div style="font-size:0.82rem;color:#334155;background:#f5f3ff;padding:6px 8px;border-radius:6px;line-height:1.5;">
                      <strong>📝 メモ:</strong> ${escapeHtml(p.memo || 'メモなし')}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- ③ ★ AI折衷案リクエストボックス（AIは回答を求められるまで勝手に回答しない） -->
          <div class="lifestyle-ai-request-box" style="background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); border: 2px solid #8b5cf6; border-radius: 14px; padding: 1.8rem; text-align: center; margin-bottom: 2rem; box-shadow: 0 4px 20px rgba(124, 58, 237, 0.1);">
            <span style="background: #7c3aed; color: #fff; font-size: 0.78rem; font-weight: 800; padding: 4px 14px; border-radius: 20px; display: inline-block; margin-bottom: 6px;">
              AIの基本姿勢: 要望のストック専任
            </span>
            <h3 style="color: #4c1d95; font-size: 1.35rem; margin: 0.4rem 0 0.6rem; font-family: var(--font-heading);">
              🤖 AIに夫婦の「折衷案・融合提案」を求めますか？
            </h3>
            <p style="color: #5b21b6; font-size: 0.92rem; margin: 0 auto 1.3rem; max-width: 680px; line-height: 1.7;">
              家カルテのAIは、<strong>回答を求められるまで勝手な提案や口出しをいたしません</strong>。<br>
              ご夫婦それぞれのストックされた要望をもとに、「どちらも我慢しない折衷案・融合アイデアが欲しい」となった時に下のボタンを押してください。
            </p>
            <button type="button" id="btn-request-ai-fusion" class="btn btn-primary" style="background: linear-gradient(135deg, #7c3aed, #9333ea); color: #fff; font-weight: 800; font-size: 1.05rem; padding: 0.85rem 2.2rem; border-radius: 30px; box-shadow: 0 4px 15px rgba(124, 58, 237, 0.35); cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 8px; transition: transform 0.2s;">
              ✨ ストックした要望をもとに、AIに折衷案・解決策を提案してもらう
            </button>
          </div>

          <!-- ④ AIが導いた融合案（初期非表示: ボタン押下で展開） -->
          <div id="lifestyle-fusion-container" class="lifestyle-fusion-card" style="display: none; border: 2.5px solid #f59e0b; background: #fffbeb; animation: fadeIn 0.3s ease;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 0.8rem; border-bottom: 1.5px dashed #fde68a; padding-bottom: 0.6rem;">
              <span class="lifestyle-fusion-badge" style="background: #d97706; color: #fff;">
                💡 【AI回答】ご要望ストックから導き出した「夫婦の融合案・折衷案」
              </span>
              <span style="font-size: 0.76rem; color: #92400e; font-weight: 700;">※回答要求に基づき生成</span>
            </div>
            <h3 style="font-size:1.35rem;color:#78350f;margin:0.2rem 0 1rem;line-height:1.4;">
              どちらかが妥協するのではなく、設計の工夫で「両方の願いを叶える」解決策
            </h3>
    """

    new_carte_func += """
            ${fusions.map(f => `
              <div class="lifestyle-fusion-item" style="background: #ffffff; border: 1px solid #fde68a; border-radius: 10px; padding: 1rem; margin-bottom: 0.8rem;">
                <div style="font-weight:800;color:#92400e;font-size:1.02rem;margin-bottom:0.3rem;">
                  【${f.title}】
                </div>
                <div style="color:#475569;font-size:0.92rem;line-height:1.75;">
                  ${f.solution}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- 空間パーツ別おすすめイメージ -->
          <div style="margin-top:2rem;">
            <div style="text-align:center;margin-bottom:1.2rem;">
              <span style="background:#e0f2fe;color:#0369a1;padding:3px 14px;border-radius:12px;font-size:0.82rem;font-weight:800;">
                🖼️ パーツ別・生活イメージ図
              </span>
              <h3 style="font-size:1.3rem;color:#0f172a;margin:0.5rem 0 0;">
                全体の図面でなくとも、この「パーツ」が揃えば暮らしは劇的に快適になります
              </h3>
            </div>

            <div class="lifestyle-parts-grid">
              ${spaceParts.map(p => `
                <div class="lifestyle-part-card">
                  <img src="${p.img}" alt="${p.title}" class="lifestyle-part-img" onerror="this.src='/images/hero_kaguya_house.jpg'" />
                  <div class="lifestyle-part-content">
                    <div class="lifestyle-part-title">${p.title}</div>
                    <div class="lifestyle-part-desc">${p.desc}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- アクション導線 -->
          <div style="margin-top:2.5rem;text-align:center;background:linear-gradient(135deg, #f8fafc, #f1f5f9);padding:2rem;border-radius:12px;border:1.5px solid #cbd5e1;">
            <h4 style="font-size:1.2rem;color:#0f172a;margin:0 0 0.8rem;">
              このカルテをもとに、さらにご夫婦で煮詰めてみませんか？
            </h4>
            <p style="color:#64748b;font-size:0.92rem;margin:0 0 1.5rem;line-height:1.8;">
              一度で決める必要はありません。何度でも回答を修正してご家族の想いをストックしてください。<br>
              「これだ！」と煮詰まった段階で、住ま居るの専任スタッフにご提示いただければ、このカルテを忠実に反映した1次プランをご提案いたします。
            </p>
            <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
              <button type="button" class="btn btn-secondary" id="btn-interview-restart" style="font-size:0.95rem;">
                🔄 もう一度やり直す・修正する
              </button>
              <button type="button" class="btn btn-secondary" id="btn-interview-print" style="font-size:0.95rem;background:#fff;border:1px solid #0284c7;color:#0284c7;">
                🖨️ このカルテを印刷・PDF保存
              </button>
              <a href="#floorplan-studio" class="btn btn-primary" style="background:linear-gradient(135deg, #0284c7, #0369a1);color:#fff;font-weight:800;font-size:1rem;padding:0.8rem 1.8rem;text-decoration:none;border-radius:30px;">
                📐 このカルテで3D間取りプランを検索する →
              </a>
            </div>
          </div>

        </div>
      </div>
    `;

    container.innerHTML = html;

    // AI折衷案リクエストボタンのイベント
    const btnRequestFusion = container.querySelector('#btn-request-ai-fusion');
    const fusionBox = container.querySelector('#lifestyle-fusion-container');
    if (btnRequestFusion && fusionBox) {
      btnRequestFusion.addEventListener('click', () => {
        fusionBox.style.display = 'block';
        btnRequestFusion.style.display = 'none';
        fusionBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  """

    js_code_norm = js_code_norm[:idx_c_start] + new_carte_func + "\n\n" + js_code_norm[idx_c_end:]
    print("3. Replaced renderCarteOutput with Stock-First and On-Demand AI Fusion.")

# Add escapeHtml helper if not present in lifestyle-bot.js
if 'function escapeHtml(' not in js_code_norm:
    escape_helper = """
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
"""
    js_code_norm = js_code_norm.replace("})();", escape_helper + "\n})();")
    print("4. Added escapeHtml helper.")

with open('public/js/lifestyle-bot.js', 'w', encoding='utf-8') as f:
    f.write(js_code_norm)

print("lifestyle-bot.js updated successfully.")
