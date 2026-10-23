# -*- coding: utf-8 -*-
"""
Patch plan-gallery.js part 2:
- renderStep2FeaturedHero: Prev / Next buttons in header, Memo + save to carte under slider
- savePlanToHouseCarte
- initMadoriKeywordSlots + modal handling
- Wire initMadoriKeywordSlots in init()
"""

with open('public/js/plan-gallery.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace renderStep2FeaturedHero function
old_hero_start = "  // Step 2: 最有力プランの大画面フィーチャー表示（スライダー比較＋仕様詳細）\n  function renderStep2FeaturedHero(plan) {"
old_hero_end = "    if (btnCompare) {\n      btnCompare.onclick = () => {\n        step2ViewMode = 'compare';\n        renderStep2HeroStage();\n      };\n    }\n  }"

# Find boundaries
idx_start = content.find(old_hero_start)
idx_end = content.find(old_hero_end, idx_start)

if idx_start == -1 or idx_end == -1:
    print("ERROR: Could not find renderStep2FeaturedHero boundaries.")
    sys.exit(1)

idx_end += len(old_hero_end)
old_hero_block = content[idx_start:idx_end]

new_hero_block = """  // Step 2: プランの大画面フィーチャー表示（前/次切替・スライダー比較・家カルテメモ保存・仕様詳細）
  function renderStep2FeaturedHero(plan) {
    const heroBox = document.getElementById('fp-step2-featured-hero');
    if (!heroBox || !plan) return;

    const curFloor = plan.floors[selectedStep2FloorIndex] || plan.floors[0] || {};
    const has3D = !!curFloor.gemini_3d;
    const has2D = !!curFloor.clean_2d;
    const floorStr = plan.floor_count === 1 ? '平屋 (1F)' : plan.floor_count === 2 ? '2階建て' : '3階建て';

    const currentIndex = Math.max(0, currentMatchedPlans.findIndex(p => p.id === plan.id));
    const totalCount = currentMatchedPlans.length;

    // 既に家カルテに保存されているか確認してメモを取り出す
    let existingMemo = '';
    try {
      const raw = localStorage.getItem('smile_house_carte_data');
      if (raw) {
        const carte = JSON.parse(raw);
        if (carte && carte.savedPlans) {
          const found = carte.savedPlans.find(p => p.id === plan.id);
          if (found && found.memo) existingMemo = found.memo;
        }
      }
    } catch(e) {}

    heroBox.innerHTML = `
      <!-- ヘッダー (表題部 ＆ 前・次のプランナビゲーション) -->
      <div class="fp-hero-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.2rem; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 1rem;">
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <!-- 前のプラン・次のプラン 切り替えボタンバー -->
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <button type="button" id="btn-hero-prev-plan" class="btn btn-secondary" style="padding: 5px 14px; font-size: 0.82rem; font-weight: 800; border-radius: 20px; background: #ffffff; color: #0284c7; border: 1.5px solid #0284c7; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s;" title="前のプランへ">
              ◀ 前のプラン
            </button>
            <span id="hero-plan-counter" style="font-size: 0.82rem; font-weight: 800; color: #1e293b; background: #f1f5f9; padding: 5px 12px; border-radius: 12px; border: 1px solid #cbd5e1; white-space: nowrap;">
              プラン ${currentIndex + 1} / 全 ${totalCount} 件
            </span>
            <button type="button" id="btn-hero-next-plan" class="btn btn-secondary" style="padding: 5px 14px; font-size: 0.82rem; font-weight: 800; border-radius: 20px; background: #0284c7; color: #ffffff; border: 1.5px solid #0284c7; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s;" title="次のプランへ">
              次のプラン ▶
            </button>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 2px;">
            <span style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; font-size: 0.8rem; font-weight: 800; padding: 4px 12px; border-radius: 12px;">
              ${floorStr}
            </span>
            <span style="color: #475569; font-size: 0.88rem; font-weight: 700;">
              🧭 ${plan.entrance_direction} ｜ 間口 ${plan.max_width_m}m × 奥行 ${plan.max_depth_m}m
            </span>
          </div>
          <h2 style="margin: 2px 0 0; font-size: 1.45rem; color: #0f172a; font-family: var(--font-heading); line-height: 1.4;">
            ${escapeHtml(plan.title)}
          </h2>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button type="button" id="btn-hero-goto-chat" class="btn btn-primary" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; font-weight: 800; font-size: 0.95rem; padding: 0.8rem 1.8rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(2,132,199,0.35); cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
            💬 このプランについて間取りチャット相談する（無料） →
          </button>
        </div>
      </div>

      <!-- メイン2カラムレイアウト (左: 図面スライダー / 右: 特徴・仕様) -->
      <div class="fp-hero-main-layout">
        <!-- 左: 大画面スライダーステージ ＆ スライダー下 家カルテ登録・メモ入力 -->
        <div>
          <!-- フロアタブ ＆ モード切替 -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; gap: 6px;" id="hero-floor-tabs">
              ${plan.floors.map((fl, idx) => `
                <button type="button" class="btn btn-secondary ${idx === selectedStep2FloorIndex ? 'active' : ''}" data-hero-floor="${idx}" style="padding: 5px 14px; font-size: 0.82rem; font-weight: 700; ${idx === selectedStep2FloorIndex ? 'background: #0284c7; color: #ffffff; border-color: #0284c7;' : ''}">
                  ${fl.floor} (${fl.area_sqm}㎡)
                </button>
              `).join('')}
            </div>

            <div style="display: flex; gap: 6px;">
              <button type="button" class="pg-mode-btn ${step2ViewMode === '2d' ? 'active-2d' : ''}" id="btn-hero-mode-2d" style="padding: 4px 12px; font-size: 0.78rem;">2D原本</button>
              <button type="button" class="pg-mode-btn ${step2ViewMode === 'gemini' ? 'active-gemini' : ''}" id="btn-hero-mode-gemini" style="padding: 4px 12px; font-size: 0.78rem; ${has3D ? '' : 'display:none;'}">3Dパース</button>
              <button type="button" class="pg-mode-btn ${step2ViewMode === 'compare' ? 'active-compare' : ''}" id="btn-hero-mode-compare" style="padding: 4px 12px; font-size: 0.78rem; ${(has3D && has2D) ? '' : 'display:none;'}">⚡ 2D⇔3Dスライダー</button>
            </div>
          </div>

          <!-- スライダービューア枠 -->
          <div class="fp-hero-slider-stage" id="hero-slider-stage">
            <!-- renderStep2HeroStage で描画 -->
          </div>

          <!-- ★ スライダー下: この図面を家カルテに登録＆メモ入力ボックス -->
          <div class="fp-hero-carte-box" style="margin-top: 1rem; background: #faf5ff; border: 1.5px solid #c084fc; border-radius: 12px; padding: 1.1rem; box-shadow: 0 4px 12px rgba(147, 51, 234, 0.08);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; flex-wrap: wrap; gap: 6px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 1.25rem;">💾</span>
                <strong style="color: #7e22ce; font-size: 0.95rem;">この図面を家カルテに登録（夫婦のストック＆検討メモ）</strong>
              </div>
              <span style="font-size: 0.76rem; color: #6b21a8; background: #f3e8ff; padding: 2px 8px; border-radius: 10px; font-weight: 700;">
                スマホでいつでも共有
              </span>
            </div>
            <p style="font-size: 0.8rem; color: #4b5563; margin: 0 0 8px; line-height: 1.4;">
              何がよかったか、変更したい点や気になる部分をメモして家カルテに保存できます。夫婦それぞれが本音をストックし、AIが折衷案を提案する基データとなります。
            </p>
            <textarea id="fp-plan-memo-input" style="width: 100%; min-height: 60px; padding: 8px 12px; border: 1px solid #d8b4fe; border-radius: 8px; font-size: 0.85rem; font-family: inherit; resize: vertical; box-sizing: border-box; background: #ffffff;" placeholder="例: パントリーとキッチンの動線がすごく良い！ただ洗面脱衣室をもう少し広くして乾太くんを置きたい、など">${escapeHtml(existingMemo)}</textarea>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; flex-wrap: wrap; gap: 8px;">
              <button type="button" id="btn-save-plan-to-carte" class="btn btn-primary" style="background: linear-gradient(135deg, #7c3aed, #9333ea); color: #fff; font-weight: 800; font-size: 0.88rem; padding: 0.6rem 1.4rem; border-radius: 10px; box-shadow: 0 3px 10px rgba(124, 58, 237, 0.3); border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                💾 この図面とメモを家カルテに登録する
              </button>
              <a href="#dashboard" style="font-size: 0.82rem; font-weight: 700; color: #7c3aed; text-decoration: none;">
                👉 家カルテ（マイページ）を開く ↗
              </a>
            </div>
            <div id="fp-carte-save-toast" style="display: none; margin-top: 8px; padding: 8px 12px; background: #ecfdf5; border: 1px solid #6ee7b7; color: #065f46; border-radius: 6px; font-size: 0.82rem; font-weight: 700;">
              ✅ この図面とメモを「家カルテ」に登録しました！夫婦のスマホでいつでも見返せます。
            </div>
          </div>
        </div>

        <!-- 右: 特徴・部屋仕様・建築士解説パネル -->
        <div class="fp-hero-details">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.1rem;">
            <div style="font-size: 0.82rem; font-weight: 800; color: #0284c7; letter-spacing: 0.05em; margin-bottom: 8px;">
              📐 基本構成 ＆ 面積スペック
            </div>
            <div style="font-size: 0.92rem; color: #1e293b; line-height: 1.8;">
              <div>・延床面積: <strong style="font-size: 1.05rem; color: #0284c7;">${plan.total_tsubo}坪</strong> (${plan.total_sqm}㎡)</div>
              <div>・部屋構成: <strong>${escapeHtml(plan.rooms)}</strong></div>
              <div>・LDK: <strong>${plan.ldk_tatami}帖</strong>（${plan.kitchen_type}キッチン）</div>
              <div>・建物寸法: 間口 <strong>${plan.max_width_m}m</strong> × 奥行 <strong>${plan.max_depth_m}m</strong></div>
            </div>
          </div>

          <!-- 💰 断熱等性能等級1〜7の概算本体価格比較パネル (延床面積連動) -->
          <div style="background: #ffffff; border: 1.5px solid #0284c7; border-radius: 12px; padding: 1.1rem; box-shadow: 0 4px 15px rgba(2, 132, 199, 0.08);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="font-size: 0.88rem; font-weight: 800; color: #0284c7; display: flex; align-items: center; gap: 6px;">
                <span>💰</span> 断熱等級4〜7 概算本体価格比較（延床 ${plan.total_tsubo}坪・法適合基準）
              </div>
              <span style="font-size: 0.72rem; color: #64748b; font-weight: 600;">※税込・本体工事概算</span>
            </div>

            <!-- 等級1〜7 テーブル -->
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.76rem; text-align: left;">
                <thead>
                  <tr style="background: #f1f5f9; color: #475569; border-bottom: 1.5px solid #cbd5e1;">
                    <th style="padding: 5px 6px;">性能グレード</th>
                    <th style="padding: 5px 6px;">断熱仕様・基準</th>
                    <th style="padding: 5px 6px; text-align: right;">概算本体価格(税込)</th>
                  </tr>
                </thead>
                <tbody>
                  ${(() => {
                    const breakdown = getTierPriceBreakdown(plan.total_tsubo);
                    return breakdown.map(item => `
                      <tr style="border-bottom: 1px solid #e2e8f0; ${item.isRecommended ? 'background: #fefce8; font-weight: 800;' : ''}">
                        <td style="padding: 6px; white-space: nowrap;">
                          <span style="color: ${item.color}; font-weight: 800;">${item.name}</span>
                          <span style="font-size: 0.68rem; color: #64748b; display: block;">${item.era}</span>
                        </td>
                        <td style="padding: 6px; color: #334155; font-size: 0.72rem;">${item.spec}</td>
                        <td style="padding: 6px; text-align: right; white-space: nowrap;">
                          <strong style="font-size: 0.88rem; color: ${item.isRecommended ? '#b45309' : '#0f172a'};">${item.priceStr}</strong>
                          <span style="font-size: 0.66rem; color: #64748b; display: block;">@${Math.round(item.rate/10000)}万円/坪</span>
                        </td>
                      </tr>
                    `).join('');
                  })()}
                </tbody>
              </table>
            </div>
            <div style="font-size: 0.7rem; color: #64748b; margin-top: 6px; line-height: 1.4;">
              ⚖️ <strong>【建築基準法・省エネ適合義務化】</strong> 2025年法改正により新築住宅は断熱等級4以上への適合が義務化されています（等級1〜3は新築不可のため対象外）。<br>💡 <strong>住ま居る標準（HEAT20 G2.5）</strong>は、全棟許容応力度計算による耐震等級3と全棟実測C値1.0以下保証（実績0.3台）を包括した究極の住み心地仕様です。
            </div>
          </div>

          <!-- 特徴タグ -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.1rem;">
            <div style="font-size: 0.82rem; font-weight: 800; color: #0284c7; letter-spacing: 0.05em; margin-bottom: 8px;">
              🏷️ 設計のこだわり・特徴
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${(plan.tags || []).map(t => `
                <span style="font-size: 0.78rem; font-weight: 700; background: #ffffff; color: #334155; padding: 4px 10px; border-radius: 6px; border: 1px solid #cbd5e1;">
                  #${escapeHtml(t)}
                </span>
              `).join('')}
            </div>
          </div>

          <!-- 建築士AIの工学解説 -->
          <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1px solid #bbf7d0; border-radius: 12px; padding: 1.1rem;">
            <div style="font-size: 0.82rem; font-weight: 800; color: #15803d; letter-spacing: 0.05em; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
              <span>🛡️</span> 構造・温熱安心仕様 (完全自由設計 芳彩)
            </div>
            <div style="font-size: 0.82rem; color: #166534; line-height: 1.7;">
              本プランは全棟<strong>許容応力度計算による耐震等級3（偏心率0.15以下）</strong>を標準クリア。<br>
              <strong>HEAT20 G2/G3 (断熱等性能等級6・7)</strong>・澄家第一種熱交換換気対応。Bubble Planで作図アレンジを行っても耐震性能が崩れません。
            </div>
          </div>
        </div>
      </div>
    `;

    // ステージ描画
    renderStep2HeroStage();

    // イベントバインド
    const btnGotoBubble = document.getElementById('btn-hero-goto-bubble');
    if (btnGotoBubble) {
      btnGotoBubble.onclick = () => loadPlanIntoBubbleMode(plan);
    }

    const btnGotoChat = document.getElementById('btn-hero-goto-chat');
    if (btnGotoChat) {
      btnGotoChat.onclick = () => goToStep3(plan);
    }

    // 前のプラン・次のプランボタン
    const btnPrev = document.getElementById('btn-hero-prev-plan');
    if (btnPrev) {
      btnPrev.onclick = () => {
        if (!currentMatchedPlans || currentMatchedPlans.length === 0) return;
        const curIdx = currentMatchedPlans.findIndex(p => p.id === selectedStep2Plan.id);
        const nextIdx = (curIdx - 1 + currentMatchedPlans.length) % currentMatchedPlans.length;
        selectedStep2Plan = currentMatchedPlans[nextIdx];
        selectedStep2FloorIndex = 0;
        renderStep2FeaturedHero(selectedStep2Plan);
        renderMatchedCards(currentMatchedPlans);
      };
    }

    const btnNext = document.getElementById('btn-hero-next-plan');
    if (btnNext) {
      btnNext.onclick = () => {
        if (!currentMatchedPlans || currentMatchedPlans.length === 0) return;
        const curIdx = currentMatchedPlans.findIndex(p => p.id === selectedStep2Plan.id);
        const nextIdx = (curIdx + 1) % currentMatchedPlans.length;
        selectedStep2Plan = currentMatchedPlans[nextIdx];
        selectedStep2FloorIndex = 0;
        renderStep2FeaturedHero(selectedStep2Plan);
        renderMatchedCards(currentMatchedPlans);
      };
    }

    // 家カルテ登録ボタン
    const btnSaveCarte = document.getElementById('btn-save-plan-to-carte');
    if (btnSaveCarte) {
      btnSaveCarte.onclick = () => {
        const memoEl = document.getElementById('fp-plan-memo-input');
        const memoText = memoEl ? memoEl.value.trim() : '';
        savePlanToHouseCarte(plan, memoText);
      };
    }

    // フロアタブイベント
    heroBox.querySelectorAll('[data-hero-floor]').forEach(btn => {
      btn.onclick = (e) => {
        selectedStep2FloorIndex = Number(e.currentTarget.getAttribute('data-hero-floor'));
        renderStep2FeaturedHero(plan);
      };
    });

    // モード切替
    const btn2d = document.getElementById('btn-hero-mode-2d');
    const btnGemini = document.getElementById('btn-hero-mode-gemini');
    const btnCompare = document.getElementById('btn-hero-mode-compare');

    if (btn2d) {
      btn2d.onclick = () => {
        step2ViewMode = '2d';
        renderStep2HeroStage();
      };
    }
    if (btnGemini) {
      btnGemini.onclick = () => {
        step2ViewMode = 'gemini';
        renderStep2HeroStage();
      };
    }
    if (btnCompare) {
      btnCompare.onclick = () => {
        step2ViewMode = 'compare';
        renderStep2HeroStage();
      };
    }
  }"""

content = content[:idx_start] + new_hero_block + content[idx_end:]
print("1. Replaced renderStep2FeaturedHero successfully.")

# 2. Add savePlanToHouseCarte and initMadoriKeywordSlots helper functions right before renderStep2HeroStage
target_stage = "  // Step 2 大画面スライダーステージの描画\n  function renderStep2HeroStage() {"

helpers_code = '''  // ==========================================
  // 家カルテ (House Carte) への図面・メモ登録処理
  // ==========================================
  function savePlanToHouseCarte(plan, memoText) {
    try {
      let carteData = {};
      const raw = localStorage.getItem('smile_house_carte_data');
      if (raw) {
        try { carteData = JSON.parse(raw); } catch(e) { carteData = {}; }
      }
      if (!carteData.savedPlans) carteData.savedPlans = [];

      const existingIdx = carteData.savedPlans.findIndex(p => p.id === plan.id);
      const entry = {
        id: plan.id,
        title: plan.title,
        tsubo: plan.total_tsubo,
        floorCount: plan.floor_count,
        rooms: plan.rooms,
        entrance: plan.entrance_direction,
        memo: memoText,
        savedAt: new Date().toLocaleString('ja-JP'),
        thumb: (plan.floors && plan.floors[0]) ? (plan.floors[0].gemini_3d || plan.floors[0].clean_2d) : '',
        family: currentSearchConditions ? currentSearchConditions.family : '',
        features: currentSearchConditions ? currentSearchConditions.features : []
      };

      if (existingIdx >= 0) {
        carteData.savedPlans[existingIdx] = entry;
      } else {
        carteData.savedPlans.unshift(entry);
      }

      localStorage.setItem('smile_house_carte_data', JSON.stringify(carteData));

      const toast = document.getElementById('fp-carte-save-toast');
      if (toast) {
        toast.style.display = 'block';
        setTimeout(() => {
          toast.style.display = 'none';
        }, 5000);
      }
    } catch (err) {
      console.error('[PlanStudio] Failed to save plan to house carte:', err);
      alert('家カルテへの保存に失敗しました。');
    }
  }

  // ==========================================
  // 間取りキーワードスロット ＆ 解説モーダル
  // ==========================================
  const MADORI_KEYWORDS = [
    {
      id: 'circ',
      icon: '🔄',
      label: '家事ラク回遊動線',
      desc: 'キッチン・パントリー・洗面脱衣室・玄関を行き止まりなく回れる動線設計',
      dimension: '通路幅は最小800mm、2人すれ違いには1,000〜1,100mmを推奨。全建具を上吊り引き戸（敷居・段差ゼロ）にすると移動ストレスが激減します。',
      pitfall: '回遊口を増やしすぎると壁量が減り、耐震性（耐力壁の直下率）が不足しやすくなります。住ま居るでは全棟許容応力度計算により、偏心率0.15以下を維持しながら安全な大開口回遊を実現します。',
      advice: '「ただいま手洗い」や「買い物直行動線」と組み合わせることで、家事時間を1日30分以上短縮できます。'
    },
    {
      id: 'pantry',
      icon: '🥫',
      label: 'ウォークスルーパントリー',
      desc: '玄関とキッチンを直結し、食品や調理家電を一括収納できる食品庫',
      dimension: '棚の奥行きは300〜450mmが黄金寸法。500mm以上にすると奥の物が死蔵します。通路幅は800〜900mmを確保。',
      pitfall: '可動棚のピッチを固定にすると高さの違う調味料やボックスが入りません。住ま居るでは50mmピッチのフル稼働ステンレスレールを採用します。',
      advice: '冷蔵庫をパントリー内に隠蔽配置すると、リビングから生活感が完全に消え、ホテルライクなLDKに仕上がります。'
    },
    {
      id: 'laundry',
      icon: '🧺',
      label: '室内干しランドリールーム',
      desc: '洗う・干す・畳む・しまうを1室で完結させる専用ランドリー空間',
      dimension: '標準サイズは2〜3帖。天井物干しバーは床から1,800mm高。スロップシンク（幅500mm）と乾太くん専用ガス台を配置。',
      pitfall: '気密換気が不十分だとカビや生乾き臭の原因に。住ま居るでは第一種全熱交換換気（澄家）の排気口を床面に設置し、ホコリと湿気を下から排出し2〜3時間でスピード乾燥させます。',
      advice: 'ファミクロを隣接させることで、乾いた衣類を1歩で収納できる「ゼロ歩動線」が完成します。'
    },
    {
      id: 'sic',
      icon: '👞',
      label: '土間SIC (シューズインクローク)',
      desc: '靴だけでなくベビーカー・キャンプ用品・ゴルフバッグも直置きできる大容量土間',
      dimension: '家族用玄関と来客用玄関を分ける2way動線。有効間口900mm以上、棚奥行き300mm。コート掛けパイプ幅600〜900mm。',
      pitfall: '家族用動線が狭すぎると結局メイン玄関で靴を脱ぐ習慣に戻ってしまいます。靴の脱ぎ履きスペースに余裕を持たせることが肝心です。',
      advice: '濡れた雨具をそのまま掛けられる水切り床仕上げと、換気ファン連動により泥臭・湿気を屋外へ排出します。'
    },
    {
      id: 'void',
      icon: '🌿',
      label: '吹き抜け ＆ パッシブ採光',
      desc: '1階と2階を縦に繋ぎ、高い位置の高窓（ハイサイドライト）から自然光を奥深くまで導く設計',
      dimension: '吹抜面積は6〜8帖が最適バランス。天井高5.2m前後に調光間接照明とシーリングファンを設置。',
      pitfall: '一般的な断熱性の住宅では「冬寒く、夏2階がサウナ」になります。住ま居るはUA値0.32・全棟実測C値0.3台の超高気密高断熱のため、上下温度差1℃以内で年中快適です。',
      advice: '冬の暖かい日射熱（パッシブ熱）を床や珪藻土壁に蓄熱させ、無暖房でも室温20℃をキープできます。'
    },
    {
      id: 'tatami',
      icon: '🍵',
      label: '小上がり畳コーナー',
      desc: 'リビングの床から一段上げて設けるモダンな和空間',
      dimension: '段差は300〜350mm（大人が腰掛けやすく、膝への負担が少ないベンチ高）。広さは3〜4.5帖。段差下部に深型引き出し収納を配置。',
      pitfall: '段差高さを200mm未満にすると「つまずきやすく、腰掛けにくい」中途半端な段差になります。300mm以上をしっかり確保するのが鉄則です。',
      advice: '小さなお子様の遊び場やお昼寝スペースとして、また洗濯物を畳む家事スペースとしても大活躍します。'
    },
    {
      id: 'famicro',
      icon: '👔',
      label: '1階ファミリークローゼット',
      desc: '家族全員の普段着やアウターを1箇所に集約する集中収納',
      dimension: '広さは3〜4帖。ハンガーパイプ奥行き600mm、通路幅800mm。枕棚高さ1,900mm。',
      pitfall: '家族個別の引き出しケースが入る寸法を事前に測っておかないと、通路に物が溢れてしまいます。',
      advice: '帰宅後に「玄関→洗面→ファミクロで着替え→LDKへ」と流れるただいま動線を作ると、リビングに脱いだ服が散らかりません。'
    },
    {
      id: 'study',
      icon: '💻',
      label: 'テレワーク・独立書斎',
      desc: 'WEB会議や集中作業、読書に特化した防音配慮の個室ワークスペース',
      dimension: '広さは1.5〜2.5帖で十分に機能します。デスク天板は奥行き600mm×幅1,200〜1,800mm。',
      pitfall: 'WEB会議中にリビングのテレビ音や子どもの声が入る失敗。住ま居るでは壁内に吸音断熱材を充填し、気密遮音パッキン付きドアを採用します。',
      advice: '北側に小窓を設けると、日中を通じて直射日光の眩しさがなく、画面が見やすい均一な光環境が得られます。'
    },
    {
      id: 'island',
      icon: '🍳',
      label: 'アイランドキッチン ＆ 横並びダイニング',
      desc: '壁から独立したオープンキッチンと、横並びに繋げたダイニング配膳動線',
      dimension: 'キッチン周囲の通路幅は1,000〜1,100mm（すれ違い快適幅）。ダイニング横並び動線により配膳・下膳歩数をゼロに短縮。',
      pitfall: '手元を隠す立ち上がりがないため、洗い物や調味料が常に見えます。パントリーに家電を逃がし、手元ニッチを設けるのがポイントです。',
      advice: '調理しながら家族と目が合い、会話が自然に弾む住ま居る人気No.1のLDKレイアウトです。'
    },
    {
      id: 'garage',
      icon: '🚗',
      label: 'ビルトイン・インナーガレージ',
      desc: '雨風に濡れずに乗降でき、愛車をホビースペースとしても楽しむ屋内車庫',
      dimension: '1台用で間口3.5m×奥行き6m（約6.5坪）。2台用で間口6m以上。車庫からパントリーへの勝手口動線を確保。',
      pitfall: '1階開口部が大きくなるため木造住宅では耐震性が落ちやすい弱点があります。住ま居るでは門型フレームと許容応力度計算により耐震等級3を確実に達成します。',
      advice: '排気ガスが居住空間に入らないよう、給排気ダクトと気密防音引き戸で完全遮断します。'
    },
    {
      id: 'kaso',
      icon: '⛩️',
      label: '家相・風水 (鬼門・裏鬼門の現代解釈)',
      desc: '北東（表鬼門）と南西（裏鬼門）に水回り・火気・玄関を避ける伝統的吉相配置',
      dimension: '建物重心（太極）から45度の扇状範囲に表鬼門・裏鬼門を割り出し。',
      pitfall: '家相にこだわりすぎて採光や家事動線が極端に悪くなる本末転倒が起きがちです。',
      advice: '住ま居るの澄家全熱換気と基礎断熱により、湿気や臭気の滞留が原理的に起きないため、現代の快適動線と家相の安心感を高次元で両立させます。'
    },
    {
      id: 'passive',
      icon: '☀️',
      label: '南面大開口 ＆ パッシブ遮蔽',
      desc: '冬は太陽の自然熱をたっぷり取り込み、夏は軒・庇で直射日光を遮る科学的パッシブ設計',
      dimension: '軒（のき）・庇（ひさし）の出幅は窓の高さの約1/3（900〜1,000mm）。南面窓は日射取得型トリプルガラス。',
      pitfall: '夏の強い西日を軒だけで防ぐことはできません。西側は窓を極小化するか、外付けアウターシェードを設けるのが定石です。',
      advice: '年間冷暖房費を約40%削減しながら、自然の恩恵を五感で感じる心地よい暮らしを実現します。'
    }
  ];

  function initMadoriKeywordSlots() {
    const container = document.getElementById('fp-keyword-slots-container');
    if (!container) return;

    container.innerHTML = MADORI_KEYWORDS.map(kw => `
      <button type="button" class="fp-kw-slot-btn" data-kw-id="${kw.id}" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 25px; font-size: 0.88rem; font-weight: 800; color: #1e293b; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
        <span style="font-size: 1.1rem;">${kw.icon}</span>
        <span>${escapeHtml(kw.label)}</span>
      </button>
    `).join('');

    container.querySelectorAll('.fp-kw-slot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-kw-id');
        const item = MADORI_KEYWORDS.find(k => k.id === id);
        if (item) openMadoriAdviceModal(item);
      });
      btn.addEventListener('mouseenter', () => {
        btn.style.borderColor = '#0284c7';
        btn.style.background = '#e0f2fe';
        btn.style.color = '#0284c7';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.borderColor = '#cbd5e1';
        btn.style.background = '#f8fafc';
        btn.style.color = '#1e293b';
      });
    });

    // モーダル閉じるイベント
    const modal = document.getElementById('modal-madori-advice');
    const btnClose = document.getElementById('btn-close-kw-modal');
    if (modal && btnClose) {
      btnClose.onclick = () => { modal.style.display = 'none'; };
      modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
      };
    }
  }

  function openMadoriAdviceModal(item) {
    const modal = document.getElementById('modal-madori-advice');
    const titleEl = document.getElementById('modal-kw-title');
    const iconEl = document.getElementById('modal-kw-icon');
    const bodyEl = document.getElementById('modal-kw-body');

    if (!modal || !titleEl || !bodyEl) return;

    if (iconEl) iconEl.textContent = item.icon;
    titleEl.textContent = item.label;

    bodyEl.innerHTML = `
      <div style="font-size: 0.95rem; color: #334155; line-height: 1.8; margin-bottom: 1.2rem; background: #f8fafc; padding: 1rem; border-radius: 10px; border-left: 4px solid #0284c7;">
        <strong>【用語の概要】</strong><br>
        ${escapeHtml(item.desc)}
      </div>

      <div style="margin-bottom: 1rem; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 1rem;">
        <div style="font-weight: 800; color: #166534; font-size: 0.92rem; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
          <span>📐</span> プロが教える黄金寸法 ＆ 推奨配置
        </div>
        <div style="font-size: 0.86rem; color: #1e293b; line-height: 1.7;">
          ${escapeHtml(item.dimension)}
        </div>
      </div>

      <div style="margin-bottom: 1rem; background: #fffbeb; border: 1.5px solid #fde047; border-radius: 12px; padding: 1rem;">
        <div style="font-weight: 800; color: #92400e; font-size: 0.92rem; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
          <span>⚠️</span> よくある失敗例 ＆ 住ま居るの工学的解決策
        </div>
        <div style="font-size: 0.86rem; color: #1e293b; line-height: 1.7;">
          ${escapeHtml(item.pitfall)}
        </div>
      </div>

      <div style="margin-bottom: 1.2rem; background: #f5f3ff; border: 1.5px solid #c4b5fd; border-radius: 12px; padding: 1rem;">
        <div style="font-weight: 800; color: #6d28d9; font-size: 0.92rem; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
          <span>💡</span> 設計プロのアドバイス
        </div>
        <div style="font-size: 0.86rem; color: #1e293b; line-height: 1.7;">
          ${escapeHtml(item.advice)}
        </div>
      </div>

      <!-- アクションボタンエリア -->
      <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 1.5rem; border-top: 1.5px solid #e2e8f0; padding-top: 1.2rem;">
        <button type="button" id="btn-add-kw-to-carte" class="btn btn-primary" style="background: linear-gradient(135deg, #7c3aed, #9333ea); color: #fff; font-weight: 800; font-size: 0.92rem; padding: 0.75rem 1.4rem; border-radius: 10px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);">
          📝 このキーワード（${escapeHtml(item.label)}）を家カルテの要望メモに追加
        </button>

        <div id="kw-added-toast" style="display: none; padding: 8px 12px; background: #ecfdf5; border: 1px solid #6ee7b7; color: #065f46; border-radius: 6px; font-size: 0.84rem; font-weight: 700; text-align: center;">
          ✅ 家カルテの検討メモに「${escapeHtml(item.label)}」を追加保存しました！
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 0.82rem; margin-top: 4px;">
          <a href="#madori-consultation-bot" onclick="document.getElementById('modal-madori-advice').style.display='none';" style="font-weight: 700; color: #059669; text-decoration: none;">
            🌿 夫婦の暮らしヒアリング＆家カルテへ進む ↗
          </a>
          <a href="#madori-consultation-bot" onclick="document.getElementById('modal-madori-advice').style.display='none'; setTimeout(() => { document.getElementById('tab-btn-knowledge') && document.getElementById('tab-btn-knowledge').click(); }, 300);" style="font-weight: 700; color: #7c3aed; text-decoration: none;">
            📖 設計プロの知見200選で詳しく見る ↗
          </a>
        </div>
      </div>
    `;

    // キーワードを家カルテのメモに追記するボタンイベント
    const btnAdd = document.getElementById('btn-add-kw-to-carte');
    if (btnAdd) {
      btnAdd.onclick = () => {
        try {
          let carteData = {};
          const raw = localStorage.getItem('smile_house_carte_data');
          if (raw) {
            try { carteData = JSON.parse(raw); } catch(e) { carteData = {}; }
          }
          if (!carteData.desiredKeywords) carteData.desiredKeywords = [];
          if (!carteData.desiredKeywords.includes(item.label)) {
            carteData.desiredKeywords.push(item.label);
          }
          // また現在選択中のプランのメモ欄にも追記
          const memoEl = document.getElementById('fp-plan-memo-input');
          if (memoEl) {
            const currentVal = memoEl.value.trim();
            memoEl.value = currentVal ? `${currentVal}\n【希望】${item.label}` : `【希望】${item.label}`;
          }
          localStorage.setItem('smile_house_carte_data', JSON.stringify(carteData));

          const toast = document.getElementById('kw-added-toast');
          if (toast) {
            toast.style.display = 'block';
            setTimeout(() => { toast.style.display = 'none'; }, 4000);
          }
        } catch (err) {
          console.error('[PlanStudio] Failed to append keyword to carte:', err);
        }
      };
    }

    modal.style.display = 'flex';
  }

'''

content = content.replace(target_stage, helpers_code + target_stage, 1)
print("2. Added savePlanToHouseCarte and initMadoriKeywordSlots.")

# 3. Wire initMadoriKeywordSlots into init()
target_init = "    initStep1Showcase();\n    setupStep1Events();\n    setupNavigationEvents();\n    setupStep3Events();"
replacement_init = "    initStep1Showcase();\n    setupStep1Events();\n    setupNavigationEvents();\n    setupStep3Events();\n    initMadoriKeywordSlots();"

if target_init in content:
    content = content.replace(target_init, replacement_init, 1)
    print("3. Wired initMadoriKeywordSlots into init().")

with open('public/js/plan-gallery.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Pass 2 complete.")
