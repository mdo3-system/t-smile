/**
 * lifestyle-bot.js - 夫婦の本音＆暮らしAIヒアリング・家づくりカルテ生成エンジン
 */
(function() {
  'use strict';

  let interviewData = null;
  let currentPhaseIndex = 0;
  let answers = {
    car_parking: null,
    car_details: '',
    pain_points: [],
    laundry_cycle: null,
    morning_rush: null,
    kitchen_style: null,
    husband_retreat: null,
    husband_bath: null,
    wife_clutter: [],
    wife_me_time: null,
    husband_secret: null,
    husband_secret_text: '',
    wife_secret: null,
    wife_secret_text: ''
  };

  // 空間パーツ別イメージ集（独立した生活シーンパーツ）
  const spaceParts = [
    {
      id: "part_wash_sep",
      title: "🚿 洗面室・脱衣室の完全分離＋ワイドカウンター",
      desc: "誰かが入浴中でも気兼ねなく歯磨き・ドライヤー・メイクができる2室分離。朝7時の洗面渋滞を完全に解消します。",
      img: "/images/cases/case4_washitsu_living.jpg"
    },
    {
      id: "part_laundry_famcl",
      title: "👕 乾太くん×ファミクロ直結「たたむ手間ゼロ動線」",
      desc: "脱衣室で洗濯乾燥した服を、隣のファミリークローゼットへハンガーのまま収納。リビングの洗濯物の山を根絶。",
      img: "/images/natural_interior_aroma.jpg"
    },
    {
      id: "part_nook_study",
      title: "🛋️ 階段下・LDK一角のおこもりヌック書斎（1.5帖）",
      desc: "完全個室にせずとも、家族の気配を感じながら自分の世界に浸れる秘密基地。面積を増やさずご主人の居場所を創出。",
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
      console.warn("Failed to load interview JSON, fallback ready", e);
    }

    renderCurrentPhase();
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

    let html = `
      <div class="lifestyle-interview-container">
        <!-- ヘッダー -->
        <div class="lifestyle-header">
          <div class="lifestyle-header-badge">🌿 夫婦の会話が弾む・AI設計ヒアリング</div>
          <h2 class="lifestyle-header-title">${currentPhase.title}</h2>
          <p class="lifestyle-header-desc">
            夫婦で画面を見ながら、あーでもないこーでもないと自由に選んでみてください。<br>
            ※途中で閉じた場合も、前回の続きからいつでも再開できます。
          </p>
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
      btn.addEventListener('click', (e) => {
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
          // 同一qidの他ボタンの選択解除
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

  // AI処方箋・家づくりカルテの出力
  function renderCarteOutput(container) {
    // 融合案・妥協案のロジック導出
    const fusions = generateAIFusionRecommendations(answers);

    let html = `
      <div class="lifestyle-interview-container">
        <div class="lifestyle-header" style="background: linear-gradient(135deg, #064e3b 0%, #022c22 60%, #0f172a 100%);">
          <div class="lifestyle-header-badge" style="background:#10b981;color:#fff;">🎉 ヒアリング完了・診断結果</div>
          <h2 class="lifestyle-header-title">【住ま居る AI家づくりカルテ】<br>ご夫婦の理想と暮らしの処方箋</h2>
          <p class="lifestyle-header-desc">
            お疲れ様でした！ご夫婦それぞれの回答と本音をAIが整理し、<strong>「お互いが我慢しない融合案・妥協案」</strong>を導き出しました。<br>
            この処方箋をもとにご家族でさらに話し合ったり、設計相談のベースとしてご活用いただけます。
          </p>
        </div>

        <div class="lifestyle-body" style="background:#ffffff;">
          
          <!-- 融合案ハイライト -->
          <div class="lifestyle-fusion-card">
            <span class="lifestyle-fusion-badge">💡 AIが導いた「夫婦の融合案・妥協案」</span>
            <h3 style="font-size:1.35rem;color:#78350f;margin:0.4rem 0 1rem;line-height:1.4;">
              どちらかが妥協するのではなく、設計の工夫で「両方の願いを叶える」解決策
            </h3>
    `;

    fusions.forEach(f => {
      html += `
        <div class="lifestyle-fusion-item">
          <div style="font-weight:800;color:#92400e;font-size:1.02rem;margin-bottom:0.3rem;">
            【${f.title}】
          </div>
          <div style="color:#475569;font-size:0.92rem;line-height:1.75;">
            ${f.solution}
          </div>
        </div>
      `;
    });

    html += `
          </div>

          <!-- 整理された暮らしの基本要件 -->
          <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:1.6rem;margin-bottom:2rem;">
            <h3 style="font-size:1.2rem;color:#0f172a;margin:0 0 1rem;display:flex;align-items:center;gap:8px;">
              <span>📋</span> ご家族の暮らしの基本骨格
            </h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1rem;">
              <div style="background:#fff;padding:1rem;border-radius:8px;border:1px solid #cbd5e1;">
                <div style="font-weight:800;color:#0369a1;font-size:0.88rem;">🚗 駐車計画</div>
                <div style="font-size:0.92rem;color:#334155;margin-top:4px;">
                  ${formatCarAnswer(answers.car_parking, answers.car_parking_details)}
                </div>
              </div>
              <div style="background:#fff;padding:1rem;border-radius:8px;border:1px solid #cbd5e1;">
                <div style="font-weight:800;color:#047857;font-size:0.88rem;">👕 ランドリー＆家事</div>
                <div style="font-size:0.92rem;color:#334155;margin-top:4px;">
                  ${formatLaundryAnswer(answers.laundry_cycle)}
                </div>
              </div>
              <div style="background:#fff;padding:1rem;border-radius:8px;border:1px solid #cbd5e1;">
                <div style="font-weight:800;color:#b45309;font-size:0.88rem;">⏰ 朝の身支度・洗面</div>
                <div style="font-size:0.92rem;color:#334155;margin-top:4px;">
                  ${formatMorningAnswer(answers.morning_rush)}
                </div>
              </div>
              <div style="background:#fff;padding:1rem;border-radius:8px;border:1px solid #cbd5e1;">
                <div style="font-weight:800;color:#6d28d9;font-size:0.88rem;">🍳 キッチン＆配膳</div>
                <div style="font-size:0.92rem;color:#334155;margin-top:4px;">
                  ${formatKitchenAnswer(answers.kitchen_style)}
                </div>
              </div>
            </div>
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
    `;

    spaceParts.forEach(p => {
      html += `
        <div class="lifestyle-part-card">
          <img src="${p.img}" alt="${p.title}" class="lifestyle-part-img" onerror="this.src='/images/hero_kaguya_house.jpg'" />
          <div class="lifestyle-part-content">
            <div class="lifestyle-part-title">${p.title}</div>
            <div class="lifestyle-part-desc">${p.desc}</div>
          </div>
        </div>
      `;
    });

    html += `
            </div>
          </div>

          <!-- アクション導線 -->
          <div style="margin-top:2.5rem;text-align:center;background:linear-gradient(135deg, #f8fafc, #f1f5f9);padding:2rem;border-radius:12px;border:1.5px solid #cbd5e1;">
            <h4 style="font-size:1.2rem;color:#0f172a;margin:0 0 0.8rem;">
              このカルテをもとに、さらにご夫婦で煮詰めてみませんか？
            </h4>
            <p style="color:#64748b;font-size:0.92rem;margin:0 0 1.5rem;line-height:1.8;">
              一度で決める必要はありません。何度でも回答を修正してご家族の想いを整理してください。<br>
              「これだ！」と煮詰まった段階で、住ま居るの展示場体感・設計相談へお持ちいただければ、社長自らがこのカルテを忠実に反映した1次プランをご提案いたします。
            </p>
            <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
              <button type="button" class="btn btn-secondary" id="btn-interview-restart" style="font-size:0.95rem;">
                🔄 もう一度やり直す・修正する
              </button>
              <button type="button" class="btn btn-secondary" id="btn-interview-print" style="font-size:0.95rem;background:#fff;border:1px solid #0284c7;color:#0284c7;">
                🖨️ このカルテを印刷・PDF保存
              </button>
              <button type="button" class="btn btn-primary open-auth-modal" style="background:linear-gradient(135deg, #059669, #10b981);color:#fff;font-weight:800;font-size:1rem;padding:0.8rem 1.8rem;">
                🌿 このカルテでリアル展示場を見学・相談する →
              </button>
            </div>
          </div>

        </div>
      </div>
    `;

    container.innerHTML = html;

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
      title: "妻の「生活感を見せたくない」 × 共働きの「洗濯時短」融合案",
      solution: "乾太くんまたは部屋干しスペースを脱衣室に設け、そのまま隣のウォークスルー・ファミリークローゼットへ直結。来客が通るLDKや玄関からは引き戸1枚で完全に視界を遮断できるため、急な来客があっても洗濯物の散らかりが1秒で隠せます。"
    });

    // 4. 洗面渋滞の解消
    list.push({
      title: "朝の身支度渋滞 × 家族のプライバシー配慮",
      solution: "【洗面室と脱衣室の完全分離】を採用。誰かが朝シャワーを浴びたり入浴していても、気兼ねなく洗面台で歯磨きやメイクが可能。幅1200mmのカウンターなら大人2人が並んでストレスフリーに朝の支度を完了できます。"
    });

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

})();
