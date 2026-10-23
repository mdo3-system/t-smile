/**
 * lifestyle-bot.js - 夫婦の本音＆暮らしAIヒアリング・家づくりカルテ生成エンジン
 * Version 1.2.0: LINE招待・夫スマホ/妻スマホ同期・建築士プロ知恵袋対応
 */
(function() {
  'use strict';

  let interviewData = null;
  let currentPhaseIndex = 0;
  let currentRole = 'all'; // 'all', 'husband', 'wife'

  let answers = {
    car_parking: null,
    car_parking_details: '',
    current_home_frustration: [],
    laundry_cycle: null,
    morning_rush: null,
    stair_and_ph: null,
    kitchen_style: null,
    h_retreat: null,
    h_bath_time: null,
    w_storage_peace: [],
    w_me_time: null,
    husband_secret_wish: null,
    husband_secret_wish_text: '',
    wife_secret_wish: null,
    wife_secret_wish_text: ''
  };

  // 空間パーツ別イメージ集
  const spaceParts = [
    {
      id: "part_wash_sep",
      title: "🚿 洗面室・脱衣室（着替え室）の完全分離＋ワイドカウンター",
      desc: "誰かが入浴中でも気兼ねなく歯磨き・ドライヤー・メイクができる2室分離。朝7時の洗面渋滞を完全に解消します。",
      img: "/images/cases/case4_washitsu_living.jpg"
    },
    {
      id: "part_laundry_famcl",
      title: "👕 乾太くん×ファミクロ直結「たたむ手間ゼロ動線」",
      desc: "脱衣室でガス高速乾燥した服を、隣のファミリークローゼットへハンガーのまま収納。リビングの洗濯物の山を根絶。",
      img: "/images/natural_interior_aroma.jpg"
    },
    {
      id: "part_nook_study",
      title: "🛋️ 階段下・LDK一角のおこもりヌック書斎（1.5帖）",
      desc: "完全個室にせずとも、家族の気配を感じながら自分の世界に浸れる秘密基地。面積・コストを増やさずご主人の居場所を創出。",
      img: "/images/cases/case6_library_stair.jpg"
    },
    {
      id: "part_hidden_pantry",
      title: "🚪 玄関から直行できる裏パントリー＆家電隠し",
      desc: "重い買い出し袋を玄関から直接パントリーへ。炊飯器やレンジなどの生活感家電をリビングの視界からサッと隠せます。",
      img: "/images/cases/custom_tv_board_zataku.jpg"
    },
    {
      id: "part_parking_guest",
      title: "🚗 並列2台＋来客用1台のゆったり駐車計画",
      desc: "埼玉の暮らしに必須の2台駐車に加え、両親や友人が気兼ねなく停められるアプローチ兼用駐車スペース。",
      img: "/images/hero_kaguya_house.jpg"
    }
  ];

  // 初期化
  async function init() {
    const container = document.getElementById('lifestyle-interview-root');
    if (!container) return;

    // URLパラメータからの共有復帰（LINE等からの招待）
    parseUrlParams();

    // ローカルストレージ復帰
    try {
      const saved = localStorage.getItem('sumairu_lifestyle_answers');
      if (saved) {
        answers = Object.assign(answers, JSON.parse(saved));
      }
    } catch(e) {}

    // JSONロード
    try {
      const res = await fetch('/data/lifestyle_interview.json');
      if (res.ok) {
        interviewData = await res.json();
      }
    } catch(e) {
      console.warn("Failed to load interview JSON", e);
    }

    renderCurrentPhase();
  }

  function parseUrlParams() {
    try {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const params = new URLSearchParams(search || hash.split('?')[1] || '');
      
      const roleParam = params.get('role');
      if (roleParam) currentRole = roleParam;

      const dataParam = params.get('d');
      if (dataParam) {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(dataParam))));
        
        // 共有図面データがあればローカルの家カルテにマージ
        if (decoded._shared_plans && Array.isArray(decoded._shared_plans)) {
          try {
            let carte = { savedPlans: [], savedKeywords: [], savedKnowledge: [] };
            const raw = localStorage.getItem('smile_house_carte_data');
            if (raw) carte = Object.assign(carte, JSON.parse(raw));
            if (!carte.savedPlans) carte.savedPlans = [];
            decoded._shared_plans.forEach(sp => {
              if (!carte.savedPlans.some(p => p.id === sp.id)) {
                carte.savedPlans.push(sp);
              }
            });
            localStorage.setItem('smile_house_carte_data', JSON.stringify(carte));
          } catch(planSyncErr) {}
        }
        delete decoded._shared_plans;

        // 共有住宅ローン診断データがあればローカルの家カルテにマージ
        if (decoded._shared_mortgage) {
          try {
            let carte = { savedPlans: [], savedKeywords: [], savedKnowledge: [], savedMortgage: null };
            const raw = localStorage.getItem('smile_house_carte_data');
            if (raw) carte = Object.assign(carte, JSON.parse(raw));
            carte.savedMortgage = decoded._shared_mortgage;
            localStorage.setItem('smile_house_carte_data', JSON.stringify(carte));
          } catch(mortgageSyncErr) {}
        }
        delete decoded._shared_mortgage;

        answers = Object.assign(answers, decoded);
        saveProgress();
      }
    } catch(e) {
      console.warn("Failed to parse URL sync data", e);
    }
  }

  // 共有URL生成: 夫・妻の本音ストックはプライバシー保護のため絶対に共有URLに含めない。お気に入り図面ストック・ローン診断は共有する。
  function generateShareUrl(targetRole) {
    try {
      const sanitized = Object.assign({}, answers);
      
      // ★ 夫の本音・妻の本音は画面共有・転送不可のためURLパラメータから完全除外
      delete sanitized.husband_secret_wish;
      delete sanitized.husband_secret_wish_text;
      delete sanitized.wife_secret_wish;
      delete sanitized.wife_secret_wish_text;

      // ★ お気に入り間取り図面（メモ付き）＆ 住宅ローン診断はご夫婦・ご家族で共有できるようURLデータに含める
      try {
        const raw = localStorage.getItem('smile_house_carte_data');
        if (raw) {
          const carte = JSON.parse(raw);
          if (carte && carte.savedPlans && carte.savedPlans.length > 0) {
            sanitized._shared_plans = carte.savedPlans;
          }
          if (carte && carte.savedMortgage) {
            sanitized._shared_mortgage = carte.savedMortgage;
          }
        }
      } catch(e) {}

      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(sanitized))));
      const origin = window.location.origin;
      return `${origin}/madori-consultation/?role=${targetRole}&d=${encoded}#lifestyle-interview-root`;
    } catch(e) {
      return window.location.href;
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem('sumairu_lifestyle_answers', JSON.stringify(answers));
    } catch(e) {}
  }

  function renderCurrentPhase() {
    const container = document.getElementById('lifestyle-interview-root');
    if (!container) return;

    if (!interviewData || !interviewData.phases) {
      container.innerHTML = '<div style="padding:2rem;text-align:center;">データを読み込み中...</div>';
      return;
    }

    const phases = interviewData.phases;
    const totalPhases = phases.length;

    // 最終フェーズ（カルテ生成）
    if (currentPhaseIndex >= totalPhases) {
      renderCarteOutput(container);
      return;
    }

    const currentPhase = phases[currentPhaseIndex];
    const progressPercent = Math.round(((currentPhaseIndex) / totalPhases) * 100);

    // LINE招待URLの作成
    const inviteWifeUrl = generateShareUrl('wife');
    const inviteHusbandUrl = generateShareUrl('husband');

    let html = `
      <div class="lifestyle-interview-container">
        <!-- ヘッダー -->
        <div class="lifestyle-header">
          <div class="lifestyle-header-badge">🌿 夫婦の会話が弾む・要望ストック型AIヒアリング</div>
          <h2 class="lifestyle-header-title">${currentPhase.title}</h2>
          <p class="lifestyle-header-desc">
            夫婦で画面を見ながら選ぶか、LINEでパートナーのスマホに送って別々に答えて合体することも可能です。<br>
            <span style="display:inline-block;margin-top:4px;color:#047857;font-weight:700;">※AIは回答を求められるまで勝手に口出しをせず、ご夫婦のご要望・本音のストックに務めます。</span>
          </p>
        </div>

        <!-- LINE共有・スマホ招待バナー -->
        <div style="padding: 1rem 1.5rem 0.5rem; background: #fafaf9;">
          <div class="lifestyle-line-invite-bar">
            <div>
              <div style="font-weight: 800; font-size: 0.95rem; display: flex; align-items: center; gap: 6px;">
                <span>📲</span> 夫と妻、別々のスマホで回答して合体する
              </div>
              <div style="font-size: 0.78rem; opacity: 0.9; margin-top: 2px;">
                片方が答えたらLINEでパートナーに送るだけで、お互いの本音を自動で合体・融合します。
              </div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <a href="https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(inviteWifeUrl)}" target="_blank" rel="noopener" class="lifestyle-line-btn">
                💬 妻にLINEで送る
              </a>
              <a href="https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(inviteHusbandUrl)}" target="_blank" rel="noopener" class="lifestyle-line-btn">
                💬 夫にLINEで送る
              </a>
            </div>
          </div>
        </div>

        <!-- プログレスバー -->
        <div class="lifestyle-progress-bar-wrap">
          <div class="lifestyle-progress-track">
            <div class="lifestyle-progress-fill" style="width: ${progressPercent}%;"></div>
          </div>
          <div class="lifestyle-progress-text">Step ${currentPhaseIndex + 1} / ${totalPhases}</div>
        </div>

        <!-- 本文（質問群） -->
        <div class="lifestyle-body">
    `;

    if (currentPhase.notice) {
      html += `
        <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:0.9rem 1.2rem;border-radius:0 8px 8px 0;margin-bottom:1.5rem;color:#92400e;font-size:0.92rem;line-height:1.7;">
          ${currentPhase.notice}
        </div>
      `;
    }

    html += `<div class="lifestyle-card-group">`;

    currentPhase.questions.forEach((q) => {
      html += `
        <div class="lifestyle-question-box" data-qid="${q.id}">
          <div class="lifestyle-question-title">${q.title}</div>
          ${q.description ? `<div class="lifestyle-question-hint">${q.description}</div>` : ''}

          <!-- 建築士の知恵袋・目からウロコTip -->
          ${q.pro_tip ? `
            <div class="lifestyle-protip-box">
              <div class="lifestyle-protip-title">${q.pro_tip.title}</div>
              <p class="lifestyle-protip-text">${q.pro_tip.text}</p>
            </div>
          ` : ''}

          <div class="lifestyle-options-grid">
      `;

      if (q.options) {
        q.options.forEach((opt) => {
          let isSelected = false;
          if (q.type === 'multi_choice') {
            const arr = answers[q.id] || [];
            isSelected = arr.includes(opt.id);
          } else {
            isSelected = (answers[q.id] === opt.id);
          }

          html += `
            <button type="button" class="lifestyle-option-btn ${isSelected ? 'selected' : ''}" data-qid="${q.id}" data-optid="${opt.id}" data-type="${q.type}">
              <div class="lifestyle-option-label">${opt.icon ? opt.icon + ' ' : ''}${opt.label}</div>
              ${opt.description ? `<div class="lifestyle-option-desc">${opt.description}</div>` : ''}
              ${opt.point ? `<div class="lifestyle-option-desc" style="color:#0284c7;">💡 ${opt.point}</div>` : ''}
              ${opt.suggest ? `<div class="lifestyle-option-desc" style="color:#059669;">✨ 解決策: ${opt.suggest}</div>` : ''}
            </button>
          `;
        });
      }

      html += `</div>`;

      // サブ自由記入
      if (q.sub_question) {
        html += `
          <div style="margin-top:1rem;">
            <div style="font-size:0.88rem;color:#475569;font-weight:700;">${q.sub_question.title}</div>
            <input type="text" class="lifestyle-input-text sub-input" data-qid="${q.id}_sub" placeholder="${q.sub_question.placeholder || ''}" value="${answers[q.id + '_details'] || ''}" />
          </div>
        `;
      }
      if (q.custom_text_prompt) {
        html += `
          <div style="margin-top:1rem;">
            <div style="font-size:0.88rem;color:#475569;font-weight:700;">${q.custom_text_prompt}</div>
            <input type="text" class="lifestyle-input-text secret-input" data-qid="${q.id}_custom" placeholder="パートナーに直接言いにくいご本音があればご自由に..." value="${answers[q.id + '_text'] || ''}" />
          </div>
        `;
      }

      html += `</div>`;
    });

    html += `
          </div>
        </div>

        <!-- フッター操作バー -->
        <div class="lifestyle-footer">
          <button type="button" class="lifestyle-btn-back" id="btn-interview-back" ${currentPhaseIndex === 0 ? 'style="visibility:hidden;"' : ''}>
            ← 前のステップへ
          </button>
          <button type="button" class="lifestyle-btn-next" id="btn-interview-next">
            ${currentPhaseIndex === totalPhases - 1 ? '✨ AI融合カルテを作成する →' : '次のステップへ →'}
          </button>
        </div>
      </div>
    `;

    container.innerHTML = html;
    bindEvents(container);
  }

  function bindEvents(container) {
    // 選択肢クリック
    const optionBtns = container.querySelectorAll('.lifestyle-option-btn');
    optionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const qid = btn.getAttribute('data-qid');
        const optid = btn.getAttribute('data-optid');
        const type = btn.getAttribute('data-type');

        if (type === 'multi_choice') {
          if (!Array.isArray(answers[qid])) answers[qid] = [];
          const idx = answers[qid].indexOf(optid);
          if (idx >= 0) {
            answers[qid].splice(idx, 1);
            btn.classList.remove('selected');
          } else {
            answers[qid].push(optid);
            btn.classList.add('selected');
          }
        } else {
          answers[qid] = optid;
          const siblingBtns = container.querySelectorAll(`.lifestyle-option-btn[data-qid="${qid}"]`);
          siblingBtns.forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
        }
        saveProgress();
      });
    });

    // 自由入力
    const subInputs = container.querySelectorAll('.sub-input');
    subInputs.forEach(input => {
      input.addEventListener('input', () => {
        const qid = input.getAttribute('data-qid');
        const baseKey = qid.replace('_sub', '');
        answers[baseKey + '_details'] = input.value;
        saveProgress();
      });
    });

    const secretInputs = container.querySelectorAll('.secret-input');
    secretInputs.forEach(input => {
      input.addEventListener('input', () => {
        const qid = input.getAttribute('data-qid');
        const baseKey = qid.replace('_custom', '');
        answers[baseKey + '_text'] = input.value;
        saveProgress();
      });
    });

    // 前へ
    const backBtn = container.querySelector('#btn-interview-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (currentPhaseIndex > 0) {
          currentPhaseIndex--;
          renderCurrentPhase();
        }
      });
    }

    // 次へ
    const nextBtn = container.querySelector('#btn-interview-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentPhaseIndex++;
        renderCurrentPhase();
      });
    }
  }

  // AI処方箋・家づくりカルテの出力（要望ストック第一・AI回答は求められた時のみ）
  function renderCarteOutput(container) {
    const fusions = generateAIFusionRecommendations(answers);
    const completeShareUrl = generateShareUrl('both_done');

    // 保存済みの間取り図面ストック ＆ 設計知見ストック ＆ 住宅ローン診断結果を取得
    let savedPlans = [];
    let savedKnowledge = [];
    let savedMortgage = null;
    try {
      const raw = localStorage.getItem('smile_house_carte_data');
      if (raw) {
        const carte = JSON.parse(raw);
        if (carte && carte.savedPlans) savedPlans = carte.savedPlans;
        if (carte && carte.savedKnowledge) savedKnowledge = carte.savedKnowledge;
        if (carte && carte.savedMortgage) savedMortgage = carte.savedMortgage;
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
                相手のスマホでもこのストックカルテ・保存図面メモをそのまま閲覧できます。<br>
                <strong style="color: #047857;">※ご夫婦それぞれの「本音・秘密のこだわり」は画面共有・転送不可のため送信されません（プライバシー完全保護）。</strong>
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

            <!-- 夫婦それぞれの本音ストック（本人しか見えない・画面共有不可） -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1rem;margin-top:1.2rem;">
              <!-- 夫の本音 -->
              <div style="background:#eff6ff;padding:1.1rem;border-radius:10px;border:1.5px solid #93c5fd;position:relative;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:4px;">
                  <div style="font-weight:800;color:#1e40af;font-size:0.9rem;display:flex;align-items:center;gap:6px;">
                    <span>👨</span> 夫のこだわり・本音ストック
                  </div>
                  <span style="font-size:0.72rem;background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:10px;font-weight:800;">
                    🔒 本人のみ閲覧（画面共有不可）
                  </span>
                </div>
                
                <div id="husband-secret-preview" style="background:#ffffff;border:1px dashed #93c5fd;border-radius:8px;padding:14px;text-align:center;">
                  <div style="font-size:0.8rem;color:#64748b;margin-bottom:8px;line-height:1.5;">
                    プライバシー保護のため非表示になっています。<br>パートナー共有URLや画面共有には一切送信されません。
                  </div>
                  <button type="button" id="btn-toggle-husband-secret" class="btn btn-sm" style="background:#2563eb;color:#fff;font-size:0.82rem;font-weight:800;padding:6px 16px;border-radius:20px;border:none;cursor:pointer;box-shadow:0 2px 8px rgba(37,99,235,0.25);">
                    👁️ 夫本人のみロック解除して表示
                  </button>
                </div>

                <div id="husband-secret-content" style="display:none;font-size:0.88rem;color:#1e293b;line-height:1.6;background:#fff;padding:12px;border-radius:8px;border:1px solid #bfdbfe;animation:fadeIn 0.25s ease;">
                  <div style="font-weight:700;color:#1e40af;font-size:0.82rem;margin-bottom:4px;">【夫の本音メモ】</div>
                  <div>${answers.husband_secret_wish_text ? escapeHtml(answers.husband_secret_wish_text) : '「自分の居場所・書斎や趣味、お風呂でのんびりしたい」'}</div>
                  <div style="text-align:right;margin-top:8px;">
                    <button type="button" id="btn-hide-husband-secret" style="background:none;border:none;color:#64748b;font-size:0.75rem;cursor:pointer;text-decoration:underline;">
                      🙈 プライバシー保護のため再び隠す
                    </button>
                  </div>
                </div>
              </div>

              <!-- 妻の本音 -->
              <div style="background:#fdf2f8;padding:1.1rem;border-radius:10px;border:1.5px solid #fbcfe8;position:relative;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:4px;">
                  <div style="font-weight:800;color:#9d174d;font-size:0.9rem;display:flex;align-items:center;gap:6px;">
                    <span>👩</span> 妻のこだわり・本音ストック
                  </div>
                  <span style="font-size:0.72rem;background:#fce7f3;color:#9d174d;padding:2px 8px;border-radius:10px;font-weight:800;">
                    🔒 本人のみ閲覧（画面共有不可）
                  </span>
                </div>

                <div id="wife-secret-preview" style="background:#ffffff;border:1px dashed #fbcfe8;border-radius:8px;padding:14px;text-align:center;">
                  <div style="font-size:0.8rem;color:#64748b;margin-bottom:8px;line-height:1.5;">
                    プライバシー保護のため非表示になっています。<br>パートナー共有URLや画面共有には一切送信されません。
                  </div>
                  <button type="button" id="btn-toggle-wife-secret" class="btn btn-sm" style="background:#db2777;color:#fff;font-size:0.82rem;font-weight:800;padding:6px 16px;border-radius:20px;border:none;cursor:pointer;box-shadow:0 2px 8px rgba(219,39,119,0.25);">
                    👁️ 妻本人のみロック解除して表示
                  </button>
                </div>

                <div id="wife-secret-content" style="display:none;font-size:0.88rem;color:#1e293b;line-height:1.6;background:#fff;padding:12px;border-radius:8px;border:1px solid #fbcfe8;animation:fadeIn 0.25s ease;">
                  <div style="font-weight:700;color:#9d174d;font-size:0.82rem;margin-bottom:4px;">【妻の本音メモ】</div>
                  <div>${answers.wife_secret_wish_text ? escapeHtml(answers.wife_secret_wish_text) : '「散らからない収納、家事動線の短縮、自分時間」'}</div>
                  <div style="text-align:right;margin-top:8px;">
                    <button type="button" id="btn-hide-wife-secret" style="background:none;border:none;color:#64748b;font-size:0.75rem;cursor:pointer;text-decoration:underline;">
                      🙈 プライバシー保護のため再び隠す
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ② ストックされた間取り図面 ＆ メモ（ご夫婦で共有） -->
          ${savedPlans.length > 0 ? `
            <div style="background:#faf5ff;border:2px solid #c084fc;border-radius:14px;padding:1.6rem;margin-bottom:2rem;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:8px;">
                <h3 style="font-size:1.25rem;color:#581c87;margin:0;display:flex;align-items:center;gap:8px;">
                  <span>💾</span> ストックされたお気に入り間取り図面（${savedPlans.length}件）
                </h3>
                <span style="font-size:0.78rem;color:#7c3aed;background:#f5f3ff;border:1px solid #d8b4fe;padding:3px 10px;border-radius:12px;font-weight:800;">
                  ✔ ご夫婦・ご家族で共有中
                </span>
              </div>
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

          <!-- ②-2 ストックされた設計プロの知見・図解（ご夫婦で共有） -->
          ${savedKnowledge.length > 0 ? `
            <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:14px;padding:1.6rem;margin-bottom:2rem;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:8px;">
                <h3 style="font-size:1.25rem;color:#166534;margin:0;display:flex;align-items:center;gap:8px;">
                  <span>📐</span> ストックされた設計プロの知見・図解（${savedKnowledge.length}件）
                </h3>
                <span style="font-size:0.78rem;color:#047857;background:#ecfdf5;border:1px solid #6ee7b7;padding:3px 10px;border-radius:12px;font-weight:800;">
                  ✔ ご夫婦・ご家族で共有中
                </span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:1rem;">
                ${savedKnowledge.map(k => `
                  <div style="background:#fff;border-radius:10px;border:1px solid #bbf7d0;padding:0.9rem;box-shadow:0 2px 8px rgba(22,101,52,0.06);">
                    <span style="font-size:0.75rem;color:#059669;background:#f0fdf4;padding:2px 8px;border-radius:10px;font-weight:800;">${escapeHtml(k.categoryName || '設計知見')}</span>
                    <div style="font-weight:800;color:#14532d;font-size:0.92rem;margin:6px 0 4px;">${escapeHtml(k.question)}</div>
                    ${k.dimension ? `<div style="font-size:0.8rem;color:#0284c7;font-weight:800;margin-bottom:4px;">📐 黄金寸法: ${escapeHtml(k.dimension)}</div>` : ''}
                    ${k.image ? `<img src="${k.image}" alt="" style="width:100%;height:110px;object-fit:cover;border-radius:6px;margin-bottom:6px;" onerror="this.style.display='none'" />` : ''}
                    <div style="font-size:0.82rem;color:#334155;background:#f8fafc;padding:6px 8px;border-radius:6px;line-height:1.5;">
                      💡 ${escapeHtml(k.shortAnswer || '')}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- ②-3 ストックされた住宅ローンAI診断結果（ご夫婦で共有） -->
          ${savedMortgage && savedMortgage.bestBank ? `
            <div style="background:#eff6ff;border:2px solid #60a5fa;border-radius:14px;padding:1.6rem;margin-bottom:2rem;box-shadow:0 4px 15px rgba(2,132,199,0.06);">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:8px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:1.4rem;">🏦</span>
                  <h3 style="font-size:1.25rem;color:#1e40af;margin:0;font-weight:900;">
                    ストックされた住宅ローンAI診断結果（最適金融機関TOP5）
                  </h3>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:0.78rem;color:#0284c7;background:#dbeafe;border:1px solid #93c5fd;padding:3px 10px;border-radius:12px;font-weight:800;">
                    ✔ 家カルテ登録済み
                  </span>
                  <a href="/mortgage/index.html" target="_blank" style="font-size:0.8rem;color:#0284c7;font-weight:800;text-decoration:none;display:inline-flex;align-items:center;gap:3px;">
                    再診断・詳細 ↗
                  </a>
                </div>
              </div>

              <!-- 第1位推奨バンク -->
              <div style="background:#ffffff;border:2px solid #3b82f6;border-radius:12px;padding:1.2rem;margin-bottom:1rem;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span style="background:#2563eb;color:#fff;font-size:0.75rem;font-weight:900;padding:2px 10px;border-radius:12px;">第1位推奨（適合度98%）</span>
                    <strong style="font-size:1.15rem;color:#0f172a;">${escapeHtml(savedMortgage.bestBank.name)}</strong>
                  </div>
                  <span style="font-size:0.82rem;color:#64748b;font-weight:700;">${escapeHtml(savedMortgage.bestBank.badge || '')}</span>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;background:#f8fafc;padding:10px;border-radius:8px;">
                  <div>
                    <div style="font-size:0.72rem;color:#64748b;font-weight:700;">金利目安（${escapeHtml(savedMortgage.bestBank.rateType || '金利')}）</div>
                    <div style="font-size:1.1rem;font-weight:900;color:#0284c7;">${escapeHtml(savedMortgage.bestBank.rate)}</div>
                  </div>
                  <div>
                    <div style="font-size:0.72rem;color:#64748b;font-weight:700;">付帯団信特約</div>
                    <div style="font-size:0.88rem;font-weight:800;color:#0f172a;">${escapeHtml(savedMortgage.bestBank.danshin || '')}</div>
                  </div>
                  <div>
                    <div style="font-size:0.72rem;color:#64748b;font-weight:700;">手数料・諸費用</div>
                    <div style="font-size:0.88rem;font-weight:800;color:#059669;">${escapeHtml(savedMortgage.bestBank.fees || '')}</div>
                  </div>
                </div>
              </div>

              <!-- TOP5簡易リスト -->
              ${savedMortgage.top5 && savedMortgage.top5.length > 1 ? `
                <div style="font-size:0.82rem;color:#475569;margin-bottom:6px;font-weight:700;">📋 候補金融機関TOP5一覧:</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:8px;">
                  ${savedMortgage.top5.map((b, i) => `
                    <div style="background:#ffffff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 10px;font-size:0.8rem;">
                      <div style="font-weight:800;color:#1e3a8a;">第${i+1}位: ${escapeHtml(b.name)}</div>
                      <div style="color:#0284c7;font-weight:700;font-size:0.85rem;">${escapeHtml(b.rate)}</div>
                      <div style="color:#64748b;font-size:0.72rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(b.danshin)}</div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
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

    // 夫の本音ロック解除・非表示トグル
    const btnToggleHusband = container.querySelector('#btn-toggle-husband-secret');
    const btnHideHusband = container.querySelector('#btn-hide-husband-secret');
    const husbandPrev = container.querySelector('#husband-secret-preview');
    const husbandContent = container.querySelector('#husband-secret-content');
    if (btnToggleHusband && husbandPrev && husbandContent) {
      btnToggleHusband.addEventListener('click', () => {
        husbandPrev.style.display = 'none';
        husbandContent.style.display = 'block';
      });
    }
    if (btnHideHusband && husbandPrev && husbandContent) {
      btnHideHusband.addEventListener('click', () => {
        husbandPrev.style.display = 'block';
        husbandContent.style.display = 'none';
      });
    }

    // 妻の本音ロック解除・非表示トグル
    const btnToggleWife = container.querySelector('#btn-toggle-wife-secret');
    const btnHideWife = container.querySelector('#btn-hide-wife-secret');
    const wifePrev = container.querySelector('#wife-secret-preview');
    const wifeContent = container.querySelector('#wife-secret-content');
    if (btnToggleWife && wifePrev && wifeContent) {
      btnToggleWife.addEventListener('click', () => {
        wifePrev.style.display = 'none';
        wifeContent.style.display = 'block';
      });
    }
    if (btnHideWife && wifePrev && wifeContent) {
      btnHideWife.addEventListener('click', () => {
        wifePrev.style.display = 'block';
        wifeContent.style.display = 'none';
      });
    }
  

    // 再スタート
    const restartBtn = container.querySelector('#btn-interview-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        currentPhaseIndex = 0;
        renderCurrentPhase();
      });
    }

    // 印刷
    const printBtn = container.querySelector('#btn-interview-print');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }
  }

  // 融合案の自動導出ロジック
  function generateAIFusionRecommendations(ans) {
    const list = [];

    // 1. 車と敷地・アプローチの融合
    if (ans.car_parking === 'car_2' || ans.car_parking === 'car_2_plus_guest') {
      list.push({
        title: "車2〜3台駐車 ＆ 雨に濡れない玄関ポーチ動線",
        solution: "埼玉の土地形状に合わせ、並列2台＋来客1台をゆったり確保。道路からの切り返しをスムーズにしつつ、玄関ポーチの軒を深めに出すことで、大雨の日でも買い物袋や子どもを抱えて濡れずに家に出入りできる設計とします。"
      });
    }

    // 2. 夫のこもりたい vs 妻の面積を削りたくない・リビングを広くしたい
    list.push({
      title: "夫の「おこもり書斎願望」 × 妻の「LDKを広く・孤立させない」融合案",
      solution: "独立した2〜3帖の個室を増やすと建築費が上がり、リビングが狭くなります。そこで【階段下デッドスペースや吹き抜け下を活用した1.5帖のおこもりヌック（室内窓付き）】をご提案。家族の気配を感じながら自分の世界に没頭でき、面積・コストを増やさずにご主人の居場所を創出します。"
    });

    // 3. ランドリー＆生活感隠し
    list.push({
      title: "妻の「生活感を見せたくない」 × 共働きの「洗濯時短（乾太くん）」融合案",
      solution: "乾太くん（ガス衣類乾燥機）または部屋干しスペースを脱衣室に設け、そのまま隣のウォークスルー・ファミリークローゼットへ直結。来客が通るLDKや玄関からは引き戸1枚で完全に視界を遮断できるため、急な来客があっても洗濯物の散らかりが1秒で隠せます。"
    });

    // 4. 洗面渋滞の解消
    list.push({
      title: "朝の身支度渋滞 × 家族のプライバシー配慮（着替え室の分離）",
      solution: "【洗面室と脱衣室の完全分離】を採用。誰かが朝シャワーを浴びたり入浴していても、気兼ねなく洗面台で歯磨きやメイクが可能。幅1200mmのカウンターなら大人2人が並んでストレスフリーに朝の支度を完了できます。"
    });

    // 5. 階段・PH・屋上の立体活用
    if (ans.stair_and_ph === 'stair_nook' || ans.stair_and_ph === 'stair_rooftop_ph') {
      list.push({
        title: "階段室の立体活用（ルンバ基地・ヌック ＆ PH光の井戸）",
        solution: "階段下にお掃除ロボット専用基地やコンセントを内蔵し、段差下を無駄なく活用。さらに上部ペントハウス（PH）から階下へ自然光を落とし込むことで、北側でも明るく風通しの良いパッシブ換気経路を確立します。"
      });
    }

    return list;
  }

  // 整形ヘルパー
  function formatCarAnswer(opt, text) {
    const map = {
      car_1: "日常用 1台",
      car_2: "日常用 2台（夫婦一人1台必須）",
      car_2_plus_guest: "日常用 2台 ＋ 来客用1台（計3台）",
      car_1_plus_guest: "日常用 1台 ＋ 来客用1台（計2台）",
      car_garage: "ビルトインガレージ",
      car_none: "車なし（自転車・バイク中心）"
    };
    let res = map[opt] || "未選択";
    if (text) res += `（詳細: ${text}）`;
    return res;
  }

  function formatLaundryAnswer(opt) {
    const map = {
      l_kanta_famcl: "乾太くん完結 ➔ ファミクロ直結（たたむ手間ゼロ）",
      l_indoor_hang: "年中部屋干し派（ランドリー除湿乾燥）",
      l_outdoor_sun: "外干し派（バルコニー・庭）",
      l_night_wash: "夜洗濯派（静音遮音配慮）"
    };
    return map[opt] || "未選択";
  }

  function formatMorningAnswer(opt) {
    const map = {
      m_congestion_high: "毎朝大渋滞（ワイドボウル・2人並び必須）",
      m_bath_separate: "入浴と洗面の完全2室分離",
      m_normal: "標準1人利用でOK"
    };
    return map[opt] || "未選択";
  }

  function formatKitchenAnswer(opt) {
    const map = {
      k_open_island: "開放的フルフラット対面",
      k_hidden_hands: "手元隠し立ち上がりカウンター",
      k_side_dining: "キッチン×ダイニング横並び一直線"
    };
    return map[opt] || "未選択";
  }

  // DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }


  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

})();
