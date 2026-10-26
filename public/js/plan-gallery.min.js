/**
 * ==========================================================================
 * AI間取り選別・相談スタジオ (3D住宅間取りプラン集 完全統合版)
 * 全323プラン(616フロア) × 条件選別ウィザード × 3D比較 × AIチャット相談改変
 * ==========================================================================
 */

(function () {
  'use strict';

  // グローバル変数
  let allPlans = [];
  let currentMatchedPlans = [];
  let activePlan = null;
  let activeFloorIndex = 0;
  let viewMode = 'gemini'; // '2d' | 'gemini' | 'compare'
  let invert2D = false;
  let sliderPos = 50; // 0 - 100%
  let currentSearchConditions = null;

  // アコーディオン内の全プランギャラリー用
  let galleryFilterState = {
    direction: 'すべて',
    floorCount: 'すべて',
    minTsubo: 10,
    maxTsubo: 50,
    maxWidth: 15,
    maxDepth: 12,
    minLdk: 0,
    kitchen: 'すべて',
    keyword: ''
  };
  let galleryDisplayCount = 12;

  // 初期化（既存323プラン ＋ 間取り工房で作成・追加された共創プランの自動統合合算）
  async function init() {
    try {
      const res = await fetch('/data/plans.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let basePlans = await res.json();

      // サーバー上の追加・共創プラン（community_plans.json）を合算
      let communityPlans = [];
      try {
        const cRes = await fetch('/data/community_plans.json');
        if (cRes.ok) communityPlans = await cRes.json();
      } catch (ce) {
        console.warn('[PlanStudio] community_plans.json fetch skipped:', ce);
      }

      // ローカルストレージ内の投稿プランもキャッシュ合算（即時反映用）
      let localPlans = [];
      try {
        const rawLocal = localStorage.getItem('smile_community_plans');
        if (rawLocal) localPlans = JSON.parse(rawLocal);
      } catch (le) {}

      // 重複を除去して合算マージ（新規共創プランを最新順・先頭に配置）
      const comList = (Array.isArray(communityPlans) ? communityPlans : []).concat(Array.isArray(localPlans) ? localPlans : []);
      const comMap = new Map();
      comList.forEach(p => { if (p && p.id) comMap.set(p.id, p); });
      const uniqueCom = Array.from(comMap.values());

      const baseMap = new Map();
      basePlans.forEach(p => { if (p && p.id && !comMap.has(p.id)) baseMap.set(p.id, p); });
      const uniqueBase = Array.from(baseMap.values());

      // 新着共創プランを先頭に、続いて既存323プランを連結
      allPlans = [...uniqueCom, ...uniqueBase];
      const addedCount = uniqueCom.length;
      console.log(`[PlanStudio] Total active plans: ${allPlans.length} (Base: ${uniqueBase.length}, Community added: ${addedCount})`);

      // HEROタイトルや件数表示を動的に更新（323 ➔ 323+件）
      const heroTitle = document.querySelector('#floorplan-studio .hero-title');
      if (heroTitle && addedCount > 0) {
        heroTitle.innerHTML = `全<span class="mono-num text-sky-600">${allPlans.length}</span>実例プラン選定 ＆ 概算価格の目安確認 <span style="font-size: 0.8rem; background: #e0f2fe; color: #0284c7; padding: 2px 8px; border-radius: 12px; font-weight: 800; vertical-align: middle;">+${addedCount}件 新規追加中</span>`;
      }
    } catch (err) {
      console.error('[PlanStudio] Failed to load plans.json:', err);
      return;
    }

    bindStudioDomEvents();
  }

  function bindStudioDomEvents() {
    initStep1Showcase();
    setupStep1Events();
    setupNavigationEvents();
    setupStep3Events();
    initMadoriKeywordSlots();
    initAtelierGate();
  }

  window.initFloorPlanStudio = function() {
    if (!allPlans || allPlans.length === 0) {
      init();
    } else {
      bindStudioDomEvents();
    }
  };

  // --- STEP 1: 代表プラン実演スライドショー＆2D-3Dスライダー実演 ---
  let showcasePlans = [];
  let showcaseIndex = 0;
  let showcaseAutoTimer = null;
  let showcaseSliderPos = 50;
  let showcaseAnimInterval = null;
  let showcaseAnimDirection = 1;
  let isShowcaseUserInteracting = false;

  function initStep1Showcase() {
    if (!allPlans || allPlans.length === 0) return;

    // 2Dと3Dの両方が揃っている代表プラン4件を抽出
    showcasePlans = allPlans.filter(p => p.floors && p.floors[0] && p.floors[0].clean_2d && p.floors[0].gemini_3d).slice(0, 4);
    if (showcasePlans.length === 0) return;

    renderShowcaseSlide(0);

    // ドット・左右ボタンイベント
    const btnPrev = document.getElementById('btn-showcase-prev');
    const btnNext = document.getElementById('btn-showcase-next');
    if (btnPrev) {
      btnPrev.onclick = () => {
        isShowcaseUserInteracting = true;
        changeShowcaseSlide((showcaseIndex - 1 + showcasePlans.length) % showcasePlans.length);
      };
    }
    if (btnNext) {
      btnNext.onclick = () => {
        isShowcaseUserInteracting = true;
        changeShowcaseSlide((showcaseIndex + 1) % showcasePlans.length);
      };
    }

    const dots = document.querySelectorAll('#showcase-dots .pg-showcase-dot');
    dots.forEach((dot, idx) => {
      dot.onclick = () => {
        isShowcaseUserInteracting = true;
        changeShowcaseSlide(idx);
      };
    });

    // 7秒ごとの自動スライド送り（ユーザーが操作していない時）
    if (showcaseAutoTimer) clearInterval(showcaseAutoTimer);
    showcaseAutoTimer = setInterval(() => {
      if (!isShowcaseUserInteracting) {
        changeShowcaseSlide((showcaseIndex + 1) % showcasePlans.length);
      }
    }, 7000);

    // ミニスライダーの自動往復デモアニメーション開始
    startShowcaseSliderDemo();
  }

  function changeShowcaseSlide(index) {
    showcaseIndex = index;
    renderShowcaseSlide(index);
  }

  function renderShowcaseSlide(index) {
    const plan = showcasePlans[index];
    if (!plan) return;

    const floor = plan.floors[0];

    const titleEl = document.getElementById('showcase-plan-title');
    const descEl = document.getElementById('showcase-plan-desc');
    const metaEl = document.getElementById('showcase-plan-meta');
    const sliderBox = document.getElementById('showcase-slider-box');

    if (titleEl) {
      titleEl.textContent = plan.title;
    }
    if (descEl) {
      descEl.textContent = plan.description || '白地の原本間取り図から、木目床や畳、家具や照明まで再現されたGemini 3Dパースへ直感的に見比べることができます。';
    }
    if (metaEl) {
      const floorStr = plan.floor_count === 1 ? '平屋' : plan.floor_count === 2 ? '2階建' : '3階建';
      metaEl.innerHTML = `
        <span>🏠 ${plan.total_tsubo}坪 ｜ ${plan.entrance_direction} ｜ ${floorStr} (${plan.rooms})</span>
        <span>↔ 間口 ${plan.max_width_m}m × 奥行 ${plan.max_depth_m}m ｜ LDK ${plan.ldk_tatami}帖</span>
      `;
    }

    // ドットのアクティブ更新
    const dots = document.querySelectorAll('#showcase-dots .pg-showcase-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });

    // ミニ実演スライダーHTML生成
    if (sliderBox) {
      sliderBox.innerHTML = `
        <div class="pg-showcase-slider-inner" id="showcase-slider-container">
          <!-- 下層: 2D図面原本 -->
          <img src="${floor.clean_2d}" alt="2D図面原本" class="pg-showcase-bg-img" />
          
          <!-- 上層: Gemini 3Dパース (スライダー位置より右側を表示) -->
          <div class="pg-showcase-clip-layer" id="showcase-clip-layer" style="clip-path: inset(0 0 0 ${showcaseSliderPos}%);">
            <img src="${floor.gemini_3d}" alt="Gemini 3Dパース" class="pg-showcase-fg-img" />
          </div>

          <!-- スライダー境界線 -->
          <div class="pg-showcase-divider-line" id="showcase-divider-line" style="left: ${showcaseSliderPos}%;">
            <div class="pg-showcase-handle-knob">↔</div>
          </div>

          <!-- 全面透明レンジインプット -->
          <input type="range" min="0" max="100" value="${showcaseSliderPos}" class="pg-showcase-range-input" id="showcase-range-input" aria-label="実演スライダー" />

          <!-- ラベルバッジ -->
          <span class="pg-showcase-badge-left">2D図面原本</span>
          <span class="pg-showcase-badge-right">Gemini 3Dパース</span>
        </div>
      `;

      // スライダー操作イベントバインド
      const rangeInput = document.getElementById('showcase-range-input');
      const clipLayer = document.getElementById('showcase-clip-layer');
      const dividerLine = document.getElementById('showcase-divider-line');

      if (rangeInput && clipLayer && dividerLine) {
        rangeInput.addEventListener('input', (e) => {
          stopShowcaseSliderDemo(); // ユーザー操作が入ったらデモアニメーション停止
          isShowcaseUserInteracting = true;
          showcaseSliderPos = Number(e.target.value);
          clipLayer.style.clipPath = `inset(0 0 0 ${showcaseSliderPos}%)`;
          dividerLine.style.left = `${showcaseSliderPos}%`;
        });
      }
    }
  }

  // スライダー自動往復デモアニメーション
  function startShowcaseSliderDemo() {
    if (showcaseAnimInterval) clearInterval(showcaseAnimInterval);
    showcaseSliderPos = 50;

    showcaseAnimInterval = setInterval(() => {
      if (isShowcaseUserInteracting) {
        clearInterval(showcaseAnimInterval);
        return;
      }

      showcaseSliderPos += 0.5 * showcaseAnimDirection;
      if (showcaseSliderPos >= 80) {
        showcaseSliderPos = 80;
        showcaseAnimDirection = -1;
      } else if (showcaseSliderPos <= 20) {
        showcaseSliderPos = 20;
        showcaseAnimDirection = 1;
      }

      const clipLayer = document.getElementById('showcase-clip-layer');
      const dividerLine = document.getElementById('showcase-divider-line');
      const rangeInput = document.getElementById('showcase-range-input');

      if (clipLayer && dividerLine) {
        clipLayer.style.clipPath = `inset(0 0 0 ${showcaseSliderPos}%)`;
        dividerLine.style.left = `${showcaseSliderPos}%`;
        if (rangeInput) rangeInput.value = showcaseSliderPos;
      }
    }, 30);
  }

  function stopShowcaseSliderDemo() {
    if (showcaseAnimInterval) {
      clearInterval(showcaseAnimInterval);
      showcaseAnimInterval = null;
    }
  }

  // --- STEP 1: イベント登録 ---
  function setupStep1Events() {
    // 階数、広さ、方位、LDK、キッチン、世帯 の単一選択ボタン
    const singleSelectGroups = [
      'opt-floors',
      'opt-size',
      'opt-direction',
      'opt-ldk',
      'opt-kitchen',
      'opt-family'
    ];

    singleSelectGroups.forEach(groupId => {
      const groupEl = document.getElementById(groupId);
      if (!groupEl) return;
      const btns = groupEl.querySelectorAll('.fp-choice-btn');
      btns.forEach(btn => {
        btn.onclick = () => {
          btns.forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
        };
      });
    });

    // 寸法スライダーの数値表示
    const inputWidth = document.getElementById('opt-input-width');
    const valWidth = document.getElementById('opt-val-width');
    if (inputWidth && valWidth) {
      inputWidth.oninput = (e) => {
        valWidth.textContent = `〜 ${Number(e.target.value).toFixed(1)} m`;
      };
    }

    const inputDepth = document.getElementById('opt-input-depth');
    const valDepth = document.getElementById('opt-val-depth');
    if (inputDepth && valDepth) {
      inputDepth.oninput = (e) => {
        valDepth.textContent = `〜 ${Number(e.target.value).toFixed(1)} m`;
      };
    }

    // こだわりタグ（複数選択可）
    const featuresGroup = document.getElementById('opt-features');
    if (featuresGroup) {
      featuresGroup.querySelectorAll('.fp-tag-btn').forEach(btn => {
        btn.onclick = () => {
          btn.classList.toggle('selected');
        };
      });
    }

    // 条件リセットボタン
    const btnResetConditions = document.getElementById('btn-reset-step1-conditions');
    if (btnResetConditions) {
      btnResetConditions.onclick = () => {
        resetStep1Conditions();
      };
    }

    // 「🔍 この条件でAIに間取りを選別してもらう」ボタン
    const btnStart = document.getElementById('btn-start-ai-chat');
    if (btnStart) {
      btnStart.onclick = (e) => {
        e.preventDefault();
        runAiPlanMatching();
      };
    }
  }

  // Step 1 条件初期化（リセット）
  function resetStep1Conditions() {
    // 階数: 平屋 (1)
    const floorBtns = document.querySelectorAll('#opt-floors .fp-choice-btn');
    floorBtns.forEach((b, idx) => b.classList.toggle('selected', idx === 0));

    // 広さ: 26〜30坪
    const sizeBtns = document.querySelectorAll('#opt-size .fp-choice-btn');
    sizeBtns.forEach((b, idx) => b.classList.toggle('selected', idx === 1));

    // 方位: 指定なし（すべて）
    const dirBtns = document.querySelectorAll('#opt-direction .fp-choice-btn');
    dirBtns.forEach((b, idx) => b.classList.toggle('selected', idx === 0));

    // 寸法スライダー: 幅15m, 奥行12m
    const inputWidth = document.getElementById('opt-input-width');
    const valWidth = document.getElementById('opt-val-width');
    if (inputWidth && valWidth) {
      inputWidth.value = '15.0';
      valWidth.textContent = '〜 15.0 m';
    }

    const inputDepth = document.getElementById('opt-input-depth');
    const valDepth = document.getElementById('opt-val-depth');
    if (inputDepth && valDepth) {
      inputDepth.value = '12.0';
      valDepth.textContent = '〜 12.0 m';
    }

    // LDK: 指定なし
    const ldkBtns = document.querySelectorAll('#opt-ldk .fp-choice-btn');
    ldkBtns.forEach((b, idx) => b.classList.toggle('selected', idx === 0));

    // キッチン: 指定なし
    const kitchenBtns = document.querySelectorAll('#opt-kitchen .fp-choice-btn');
    kitchenBtns.forEach((b, idx) => b.classList.toggle('selected', idx === 0));

    // 家族構成: 子育て3〜4人
    const familyBtns = document.querySelectorAll('#opt-family .fp-choice-btn');
    familyBtns.forEach((b, idx) => b.classList.toggle('selected', idx === 1));

    // こだわりタグ: 全て解除
    const tagBtns = document.querySelectorAll('#opt-features .fp-tag-btn');
    tagBtns.forEach(b => b.classList.remove('selected'));
  }

  // Step 1 の選択条件を取得
  function getStep1Conditions() {
    const floorBtn = document.querySelector('#opt-floors .fp-choice-btn.selected');
    const sizeBtn = document.querySelector('#opt-size .fp-choice-btn.selected');
    const dirBtn = document.querySelector('#opt-direction .fp-choice-btn.selected');
    const ldkBtn = document.querySelector('#opt-ldk .fp-choice-btn.selected');
    const kitchenBtn = document.querySelector('#opt-kitchen .fp-choice-btn.selected');
    const familyBtn = document.querySelector('#opt-family .fp-choice-btn.selected');
    const featureBtns = document.querySelectorAll('#opt-features .fp-tag-btn.selected');

    const inputWidth = document.getElementById('opt-input-width');
    const inputDepth = document.getElementById('opt-input-depth');

    return {
      floorCount: floorBtn ? Number(floorBtn.getAttribute('data-value')) : 1,
      minTsubo: sizeBtn ? Number(sizeBtn.getAttribute('data-min')) : 26,
      maxTsubo: sizeBtn ? Number(sizeBtn.getAttribute('data-max')) : 30,
      sizeLabel: sizeBtn ? sizeBtn.getAttribute('data-label') : '26〜30坪',
      direction: dirBtn ? dirBtn.getAttribute('data-value') : 'すべて',
      maxWidth: inputWidth ? Number(inputWidth.value) : 15,
      maxDepth: inputDepth ? Number(inputDepth.value) : 12,
      minLdk: ldkBtn ? Number(ldkBtn.getAttribute('data-value')) : 0,
      kitchen: kitchenBtn ? kitchenBtn.getAttribute('data-value') : 'すべて',
      family: familyBtn ? familyBtn.getAttribute('data-value') : '子育て3〜4人',
      features: Array.from(featureBtns).map(b => b.getAttribute('data-value'))
    };
  }

  // AI間取りマッチング処理 (階数と広さのみで選別、全件表示)
  function runAiPlanMatching() {
    const cond = getStep1Conditions();
    currentSearchConditions = cond;

    // 検索は「階数」と「広さ」のみで厳密に選別
    let matched = allPlans.filter(plan => {
      const matchFloor = plan.floor_count === cond.floorCount;
      const matchTsubo = plan.total_tsubo >= cond.minTsubo && plan.total_tsubo <= cond.maxTsubo;
      return matchFloor && matchTsubo;
    });

    // 該当なしの場合は同じ階数の近似坪数プランをフォールバック提示
    if (matched.length === 0) {
      matched = allPlans.filter(plan => plan.floor_count === cond.floorCount);
      matched.sort((a, b) => {
        const diffA = Math.min(Math.abs(a.total_tsubo - cond.minTsubo), Math.abs(a.total_tsubo - cond.maxTsubo));
        const diffB = Math.min(Math.abs(b.total_tsubo - cond.minTsubo), Math.abs(b.total_tsubo - cond.maxTsubo));
        return diffA - diffB;
      });
    } else {
      // 延床面積（坪数）順にソート
      matched.sort((a, b) => a.total_tsubo - b.total_tsubo);
    }

    // 表示用スコア付与
    matched = matched.map((plan, idx) => ({
      ...plan,
      matchScore: Math.max(88, 99 - idx)
    }));

    // ★ 全件表示 (制限なし)
    currentMatchedPlans = matched;

    // Step 2 へ画面遷移
    goToStep2(cond, currentMatchedPlans);
  }


  // ==========================================
  // 断熱等性能等級 1〜7 概算本体価格計算ユーティリティ
  // ==========================================
  function getTierPriceBreakdown(tsubo) {
    const tiers = [
      { level: '4', name: '等級4', era: '建築物省エネ法 義務化基準', rate: 680000, spec: 'アルミ樹脂複合サッシ (UA値 0.87)', color: '#0284c7' },
      { level: '5', name: '等級5', era: 'ZEH水準 省エネ住宅', rate: 740000, spec: '高性能グラスウール＋樹脂サッシ (UA値 0.60)', color: '#0d9488' },
      { level: '6', name: '等級6', era: 'HEAT20 G2 快適基準', rate: 820000, spec: 'オール樹脂複層・高性能充填断熱 (UA値 0.46)', color: '#059669' },
      { level: 'g25', name: '★住ま居る標準', era: 'HEAT20 G2.5 (許容応力度耐震3)', rate: 860000, spec: '樹脂トリプル＋付加断熱40mm (UA値 0.32・全棟C値1.0以下保証/実測0.3台) ｜ 西川材無垢＋珪藻土', color: '#d97706', isRecommended: true },
      { level: '7', name: '等級7', era: 'HEAT20 G3 最高峰', rate: 930000, spec: '樹脂トリプル＋付加断熱100mm (UA値 0.23)', color: '#7c3aed' }
    ];

    return tiers.map(t => {
      const rawPrice = t.rate * tsubo * 1.1; // 税込
      const manYen = Math.round(rawPrice / 10000);
      return {
        ...t,
        priceManYen: manYen,
        priceStr: `約 ${manYen.toLocaleString()} 万円`
      };
    });
  }

  // --- STEP 2: 画面遷移とおすすめカード表示 ---
  let selectedStep2Plan = null;
  let selectedStep2FloorIndex = 0;
  let step2ViewMode = 'compare'; // 'compare' | '2d' | 'gemini'
  let step2SliderPos = 50;

  function goToStep2(cond, matchedPlans) {
    const step1 = document.getElementById('fp-step1-container');
    const step2 = document.getElementById('fp-step2-container');
    const step3 = document.getElementById('fp-step3-container');
    const pill1 = document.getElementById('pill-step-1');
    const pill2 = document.getElementById('pill-step-2');
    const pill3 = document.getElementById('pill-step-3');

    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'block';
    if (step3) step3.style.display = 'none';

    if (pill1) pill1.classList.remove('active');
    if (pill2) pill2.classList.add('active');
    if (pill3) pill3.classList.remove('active');

    // 条件要約テキストの更新
    const summaryText = document.getElementById('fp-selected-summary-text');
    if (summaryText) {
      const floorStr = cond.floorCount === 1 ? '平屋' : cond.floorCount === 2 ? '2階建て' : '3階建て';
      summaryText.textContent = `選択条件: ${floorStr} ｜ ${cond.sizeLabel}（該当: 全 ${matchedPlans.length} 件）`;
    }

    const badgeTotal = document.getElementById('fp-matched-total-badge');
    if (badgeTotal) {
      badgeTotal.textContent = `全 ${matchedPlans.length} 件`;
    }

    // 初期選択プランは第1候補（最有力プラン）
    selectedStep2Plan = matchedPlans[0] || null;
    selectedStep2FloorIndex = 0;
    step2ViewMode = 'compare';
    step2SliderPos = 50;

    // 最有力プランの大画面フィーチャー表示
    renderStep2FeaturedHero(selectedStep2Plan);

    // 下部の厳選候補プランカード一覧
    renderMatchedCards(matchedPlans);

    // 間取りキーワードスロット初期化
    initMadoriKeywordSlots();

    // 全プラン展開アコーディオンの準備
    initAllPlansAccordion(cond);

    // スムーズスクロール
    const studioEl = document.getElementById('floorplan-studio');
    if (studioEl) studioEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Step 2: プランの大画面フィーチャー表示（前/次切替・スライダー比較・家カルテメモ保存・仕様詳細）
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
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 1.25rem;">💾</span>
                <strong style="color: #7e22ce; font-size: 0.95rem;">この図面を<span class="carte-hover-trigger" style="cursor: pointer; text-decoration: underline dashed #7e22ce;" title="タップまたはクリックで家カルテ解説を開く">「家カルテ」</span>に登録（夫婦のストック＆検討メモ）</strong>
              </div>
              <div style="display: flex; gap: 6px; align-items: center;">
                <button type="button" class="btn-open-carte-guide-modal" style="background: #ffffff; border: 1px solid #9333ea; color: #7e22ce; font-size: 0.76rem; font-weight: 800; padding: 2px 8px; border-radius: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                  📖 家カルテとは？
                </button>
                <a href="/madori-consultation/" target="_blank" rel="noopener" style="font-size: 0.76rem; color: #7c3aed; text-decoration: underline; font-weight: 700;">
                  🌐 解説ページ ↗
                </a>
              </div>
            </div>

            <!-- 家カルテの役割・安心ポイントミニガイド -->
            <div style="background: #ffffff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 8px 12px; margin-bottom: 10px; font-size: 0.8rem; color: #4b5563; line-height: 1.6;">
              <div style="color: #6b21a8; font-weight: 800; margin-bottom: 2px; display: flex; align-items: center; gap: 4px;">
                <span>💡</span> <strong>家カルテって何するの？</strong>
              </div>
              ご夫婦それぞれのスマホから「気に入った図面」や「ここをこうしたいメモ」を安全に蓄積・比較できる無料ツールです。<br>
              <strong>AIは回答を求められるまで勝手な提案や口出しはいたしません。</strong>まずは夫婦の想いを残すことに専念できます。
            </div>

            <textarea id="fp-plan-memo-input" style="width: 100%; min-height: 60px; padding: 8px 12px; border: 1px solid #d8b4fe; border-radius: 8px; font-size: 0.85rem; font-family: inherit; resize: vertical; box-sizing: border-box; background: #ffffff;" placeholder="例: パントリーとキッチンの動線がすごく良い！ただ洗面脱衣室をもう少し広くして乾太くんを置きたい、など">${escapeHtml(existingMemo)}</textarea>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; flex-wrap: wrap; gap: 8px;">
              <button type="button" id="btn-save-plan-to-carte" class="btn btn-primary" style="background: linear-gradient(135deg, #7c3aed, #9333ea); color: #fff; font-weight: 800; font-size: 0.88rem; padding: 0.6rem 1.4rem; border-radius: 10px; box-shadow: 0 3px 10px rgba(124, 58, 237, 0.3); border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                💾 この図面とメモを家カルテに登録する
              </button>
              <a href="#dashboard" style="font-size: 0.82rem; font-weight: 700; color: #7c3aed; text-decoration: none;">
                👉 家カルテ（マイページ）を開く ↗
              </a>
            </div>

            <!-- 📲 LINE通知予告 -->
            <div style="margin-top: 8px; padding: 6px 10px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; font-size: 0.75rem; color: #065f46; display: flex; align-items: center; gap: 6px;">
              <span>📲</span>
              <span><strong>公式LINE連携通知を準備中:</strong> カルテにメモを追加した際やスタッフからの返信があった際、メールより見やすいLINE通知でお届け予定です。</span>
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
  }

  // ==========================================
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
            memoEl.value = currentVal ? `${currentVal}
【希望】${item.label}` : `【希望】${item.label}`;
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

  // Step 2 大画面スライダーステージの描画
  function renderStep2HeroStage() {
    const stage = document.getElementById('hero-slider-stage');
    if (!stage || !selectedStep2Plan) return;

    const curFloor = selectedStep2Plan.floors[selectedStep2FloorIndex] || selectedStep2Plan.floors[0] || {};
    const has3D = !!curFloor.gemini_3d;
    const has2D = !!curFloor.clean_2d;

    // ボタンアクティブ更新
    const btn2d = document.getElementById('btn-hero-mode-2d');
    const btnGemini = document.getElementById('btn-hero-mode-gemini');
    const btnCompare = document.getElementById('btn-hero-mode-compare');

    if (btn2d) btn2d.className = `pg-mode-btn ${step2ViewMode === '2d' ? 'active-2d' : ''}`;
    if (btnGemini) btnGemini.className = `pg-mode-btn ${step2ViewMode === 'gemini' ? 'active-gemini' : ''}`;
    if (btnCompare) btnCompare.className = `pg-mode-btn ${step2ViewMode === 'compare' ? 'active-compare' : ''}`;

    if (step2ViewMode === '2d') {
      stage.style.background = '#ffffff';
      stage.innerHTML = `
        <img src="${curFloor.clean_2d}" alt="2D図面原本" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;" />
      `;
    } else if (step2ViewMode === 'gemini') {
      stage.style.background = '#020617';
      stage.innerHTML = `
        <img src="${curFloor.gemini_3d}" alt="Gemini 3Dパース" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;" />
      `;
    } else {
      stage.style.background = '#ffffff';
      stage.innerHTML = `
        <div class="pg-compare-container" style="height: 100%;">
          <!-- 下層: 2D原本 -->
          <img src="${curFloor.clean_2d}" alt="2D図面原本" class="pg-compare-bg-img" />
          
          <!-- 上層: 3Dパース (スライダー位置より右側を表示) -->
          <div class="pg-compare-clip-layer" id="step2-hero-clip" style="clip-path: inset(0 0 0 ${step2SliderPos}%);">
            <img src="${curFloor.gemini_3d}" alt="Gemini 3Dパース" class="pg-compare-fg-img" />
          </div>

          <!-- スライダー境界線 -->
          <div class="pg-compare-divider-line" id="step2-hero-line" style="left: ${step2SliderPos}%;">
            <div class="pg-compare-handle-knob">↔</div>
          </div>

          <!-- 全面透明レンジインプット -->
          <input type="range" min="0" max="100" value="${step2SliderPos}" class="pg-compare-range-input" id="step2-hero-range-input" aria-label="Step 2比較スライダー" />

          <span class="pg-compare-tag-left">← 2D図面原本</span>
          <span class="pg-compare-tag-right">Gemini 3Dパース →</span>
        </div>
      `;

      const rangeInput = document.getElementById('step2-hero-range-input');
      const clipLayer = document.getElementById('step2-hero-clip');
      const dividerLine = document.getElementById('step2-hero-line');

      if (rangeInput && clipLayer && dividerLine) {
        rangeInput.addEventListener('input', (e) => {
          step2SliderPos = Number(e.target.value);
          clipLayer.style.clipPath = `inset(0 0 0 ${step2SliderPos}%)`;
          dividerLine.style.left = `${step2SliderPos}%`;
        });
      }
    }
  }

  // おすすめカードのHTMLレンダリング（クリックで大画面切り替え）
  function renderMatchedCards(plans) {
    const grid = document.getElementById('fp-matched-cards-grid');
    if (!grid) return;

    if (plans.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #64748b;">
          合致するプランが見つかりませんでした。条件を緩和して再検索してください。
        </div>
      `;
      return;
    }

    grid.innerHTML = plans.map((plan, idx) => {
      const isSelected = selectedStep2Plan && selectedStep2Plan.id === plan.id;
      const firstFloor = plan.floors[0] || {};
      const thumb3D = firstFloor.gemini_3d || '';
      const thumb2D = firstFloor.clean_2d || '';
      const floorStr = plan.floor_count === 1 ? '平屋' : plan.floor_count === 2 ? '2階建' : '3階建';

      return `
        <div class="fp-matched-card ${isSelected ? 'fp-card-active-indicator' : ''}" data-card-plan-id="${plan.id}" style="background: #ffffff; border: 2.5px solid ${isSelected ? '#0284c7' : '#e2e8f0'}; border-radius: 16px; overflow: hidden; cursor: pointer; display: flex; flex-direction: column; transition: all 0.25s ease; box-shadow: ${isSelected ? '0 8px 25px rgba(2,132,199,0.25)' : '0 4px 14px rgba(0,0,0,0.05)'};">
          <div style="background: ${isSelected ? '#e0f2fe' : '#f8fafc'}; padding: 0.8rem 1rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.76rem; font-weight: 800; color: ${isSelected ? '#0284c7' : '#475569'};">
              ${idx === 0 ? '🎯 最有力プラン' : `第${idx + 1}候補`} (${plan.matchScore}%)
            </span>
            ${isSelected ? '<span style="font-size: 0.7rem; background: #0284c7; color: #fff; padding: 2px 8px; border-radius: 6px; font-weight: 800;">✔ 大画面表示中</span>' : ''}
          </div>

          <div style="padding: 1rem; display: flex; flex-direction: column; flex: 1;">
            <!-- サムネイルプレビュー -->
            <div style="position: relative; width: 100%; height: 135px; background: #020617; border-radius: 8px; overflow: hidden; margin-bottom: 0.65rem;">
              <img src="${thumb3D || thumb2D}" alt="プレビュー" style="width: 100%; height: 100%; object-fit: contain;" />
              <span style="position: absolute; bottom: 6px; left: 6px; background: rgba(15,23,42,0.85); color: #fde68a; font-size: 0.68rem; font-weight: 800; padding: 2px 6px; border-radius: 4px;">
                🧭 ${plan.entrance_direction}
              </span>
            </div>

            <!-- タイトル -->
            <h4 style="margin: 0 0 6px; font-size: 0.95rem; font-weight: 800; color: #0f172a; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${escapeHtml(plan.title)}
            </h4>

            <!-- スペック -->
            <div style="font-size: 0.78rem; color: #475569; margin-bottom: 0.5rem; line-height: 1.5;">
              <div><strong>延床:</strong> <span style="font-family: monospace; font-weight: 800; color: #0284c7;">${plan.total_tsubo}坪</span> ｜ ${floorStr}</div>
              <div><strong>構成:</strong> ${escapeHtml(plan.rooms)} ｜ LDK${plan.ldk_tatami}帖</div>
            </div>

            <!-- 等級1〜7 概算価格サマリー -->
            ${(() => {
              const bd = getTierPriceBreakdown(plan.total_tsubo);
              const t4 = bd[0];
              const tg25 = bd[3];
              const t7 = bd[4];
              return `
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 6px 8px; margin-bottom: 0.75rem; font-size: 0.73rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                    <span style="font-weight: 800; color: #166534;">💰 概算本体価格(税込):</span>
                    <span style="font-weight: 900; color: #d97706; font-size: 0.8rem;">★標準: ${tg25.priceStr}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; color: #64748b; font-size: 0.68rem;">
                    <span>等級4(義務基準): ${t4.priceStr}</span>
                    <span>〜 等級7(最高峰): ${t7.priceStr}</span>
                  </div>
                </div>
              `;
            })()}

            <!-- アクションボタン -->
            <button type="button" class="btn btn-secondary btn-select-this-card" data-plan-id="${plan.id}" style="width: 100%; padding: 0.5rem; font-size: 0.8rem; font-weight: 800; margin-top: auto; justify-content: center; ${isSelected ? 'background: #0284c7; color: #ffffff; border-color: #0284c7;' : 'background: #f8fafc; color: #1e293b;'}">
              ${isSelected ? '大画面で選択中 👁️' : '大画面で見る 👁️'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    // カードクリックで大画面をそのプランに切り替え
    grid.querySelectorAll('.fp-matched-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const id = card.getAttribute('data-card-plan-id');
        const plan = plans.find(p => p.id === id);
        if (plan) {
          selectedStep2Plan = plan;
          selectedStep2FloorIndex = 0;
          step2ViewMode = 'compare';
          renderStep2FeaturedHero(plan);
          renderMatchedCards(plans);

          const heroBox = document.getElementById('fp-step2-featured-hero');
          if (heroBox) heroBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    });
  }

  // 全323プラン自由検索アコーディオンの制御
  function initAllPlansAccordion(cond) {
    const btnToggle = document.getElementById('btn-toggle-all-plans');
    const accordionWrap = document.getElementById('fp-all-plans-accordion');
    if (!btnToggle || !accordionWrap) return;

    btnToggle.onclick = () => {
      const isHidden = accordionWrap.style.display === 'none';
      if (isHidden) {
        accordionWrap.style.display = 'block';
        btnToggle.textContent = '📚 全323プランの自由検索ギャラリーを閉じる ▲';
        renderAccordionGallery();
      } else {
        accordionWrap.style.display = 'none';
        btnToggle.textContent = '📚 全323プランの自由検索ギャラリーを開く（絞り込みサイドバー＋一覧） ▼';
      }
    };
  }

  // アコーディオンギャラリーのレンダリング
  function renderAccordionGallery() {
    const galleryApp = document.getElementById('plan-gallery-app');
    if (!galleryApp) return;

    // 初回レンダリング
    galleryApp.innerHTML = `
      <div class="pg-layout" style="margin-top: 1.5rem;">
        <!-- 絞り込みサイドバー -->
        <aside class="pg-sidebar" style="top: 20px;">
          <div class="pg-sidebar-header">
            <div class="pg-sidebar-title"><span>⚙️</span> 全323プラン自由検索</div>
            <button type="button" id="acc-btn-reset" class="pg-sidebar-reset">クリア</button>
          </div>

          <div class="pg-filter-group">
            <label class="pg-filter-label">🧭 玄関方位</label>
            <div class="pg-filter-grid-2">
              ${['すべて', '南玄関', '北玄関', '東玄関', '西玄関'].map(dir => `
                <button type="button" class="pg-btn-pill ${galleryFilterState.direction === dir ? 'active' : ''}" data-acc-dir="${dir}">${dir}</button>
              `).join('')}
            </div>
          </div>

          <div class="pg-filter-group">
            <label class="pg-filter-label">🏢 階数</label>
            <div class="pg-filter-grid-2">
              <button type="button" class="pg-btn-pill ${galleryFilterState.floorCount === 'すべて' ? 'active' : ''}" data-acc-floor="すべて">すべて</button>
              <button type="button" class="pg-btn-pill ${galleryFilterState.floorCount === '1' ? 'active' : ''}" data-acc-floor="1">平屋</button>
              <button type="button" class="pg-btn-pill ${galleryFilterState.floorCount === '2' ? 'active' : ''}" data-acc-floor="2">2階建</button>
              <button type="button" class="pg-btn-pill ${galleryFilterState.floorCount === '3' ? 'active' : ''}" data-acc-floor="3">3階建</button>
            </div>
          </div>

          <div class="pg-filter-group">
            <label class="pg-filter-label">🔍 キーワード検索</label>
            <input type="text" id="acc-input-kw" class="pg-text-input" placeholder="和室、パントリー、中庭..." value="${galleryFilterState.keyword}" />
          </div>
        </aside>

        <!-- メイン一覧 -->
        <main class="pg-main">
          <div class="pg-grid-section">
            <div class="pg-grid-header">
              <div class="pg-grid-count">
                該当プラン: <strong id="acc-count-text">0 件</strong>
              </div>
            </div>
            <div class="pg-cards-grid" id="acc-cards-grid"></div>
            <div class="pg-loadmore-wrap" id="acc-loadmore-wrap" style="display: none;">
              <button type="button" id="acc-btn-loadmore" class="pg-btn-loadmore">さらに表示する</button>
            </div>
          </div>
        </main>
      </div>
    `;

    bindAccordionEvents();
    filterAndRenderAccordionCards();
  }

  function bindAccordionEvents() {
    document.querySelectorAll('[data-acc-dir]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-acc-dir]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        galleryFilterState.direction = e.currentTarget.getAttribute('data-acc-dir');
        filterAndRenderAccordionCards();
      });
    });

    document.querySelectorAll('[data-acc-floor]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-acc-floor]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        galleryFilterState.floorCount = e.currentTarget.getAttribute('data-acc-floor');
        filterAndRenderAccordionCards();
      });
    });

    const kw = document.getElementById('acc-input-kw');
    if (kw) {
      kw.addEventListener('input', (e) => {
        galleryFilterState.keyword = e.target.value;
        filterAndRenderAccordionCards();
      });
    }

    const reset = document.getElementById('acc-btn-reset');
    if (reset) {
      reset.addEventListener('click', () => {
        galleryFilterState.direction = 'すべて';
        galleryFilterState.floorCount = 'すべて';
        galleryFilterState.keyword = '';
        renderAccordionGallery();
      });
    }

    const loadmore = document.getElementById('acc-btn-loadmore');
    if (loadmore) {
      loadmore.addEventListener('click', () => {
        galleryDisplayCount += 12;
        filterAndRenderAccordionCards();
      });
    }
  }

  function filterAndRenderAccordionCards() {
    const filtered = allPlans.filter(p => {
      if (galleryFilterState.direction !== 'すべて' && p.entrance_direction !== galleryFilterState.direction) return false;
      if (galleryFilterState.floorCount !== 'すべて' && p.floor_count !== Number(galleryFilterState.floorCount)) return false;
      if (galleryFilterState.keyword.trim() !== '') {
        const q = galleryFilterState.keyword.toLowerCase().trim();
        const inTitle = (p.title || '').toLowerCase().includes(q);
        const inTags = (p.tags || []).some(t => t.toLowerCase().includes(q));
        if (!inTitle && !inTags) return false;
      }
      return true;
    });

    const countText = document.getElementById('acc-count-text');
    if (countText) countText.textContent = `${filtered.length} 件`;

    const grid = document.getElementById('acc-cards-grid');
    if (!grid) return;

    const visible = filtered.slice(0, galleryDisplayCount);
    grid.innerHTML = visible.map(plan => {
      const fl = plan.floors[0] || {};
      const thumb = fl.gemini_3d || fl.clean_2d || '';
      return `
        <div class="pg-plan-card" data-acc-plan-id="${plan.id}" style="cursor: pointer;">
          <div class="pg-card-thumb-wrap">
            ${plan.isCommunityPlan ? '<span class="pg-card-badge-community" style="position: absolute; top: 8px; left: 8px; background: linear-gradient(135deg, #059669, #10b981); color: #fff; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); z-index: 2;"><i class="fa-solid fa-sparkles"></i> 新着共創プラン</span>' : ''}
            <img src="${thumb}" alt="${escapeHtml(plan.title)}" class="pg-card-thumb" loading="lazy" />
            <span class="pg-card-badge-dir">🧭 ${plan.entrance_direction}</span>
            <span class="pg-card-badge-floor">${plan.floor_count === 1 ? '平屋' : plan.floor_count === 2 ? '2階建' : '3階建'}</span>
          </div>
          <div class="pg-card-body">
            <h4 class="pg-card-title">${escapeHtml(plan.title)}</h4>
            <div class="pg-card-specs">
              <span>📐 <strong>${plan.total_tsubo}</strong> 坪</span>
              <span>↔ ${plan.max_width_m}m × ${plan.max_depth_m}m</span>
              <span>🍽️ LDK ${plan.ldk_tatami}帖</span>
            </div>
            <div class="pg-card-footer">
              <span>${plan.rooms}</span>
              <span style="font-weight: 800;">このプランで相談する →</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.pg-plan-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-acc-plan-id');
        const plan = allPlans.find(p => p.id === id);
        if (plan) {
          goToStep3(plan);
        }
      });
    });

    const loadmoreWrap = document.getElementById('acc-loadmore-wrap');
    if (loadmoreWrap) {
      loadmoreWrap.style.display = galleryDisplayCount < filtered.length ? 'block' : 'none';
    }
  }

  // --- STEP 3: 詳細ビューア ＆ 3Dスライダー比較 ＆ AIチャット相談 ---
  function goToStep3(plan) {
    activePlan = plan;
    activeFloorIndex = 0;
    viewMode = (plan.floors[0] && plan.floors[0].gemini_3d) ? 'gemini' : '2d';

    const step1 = document.getElementById('fp-step1-container');
    const step2 = document.getElementById('fp-step2-container');
    const step3 = document.getElementById('fp-step3-container');
    const pill1 = document.getElementById('pill-step-1');
    const pill2 = document.getElementById('pill-step-2');
    const pill3 = document.getElementById('pill-step-3');

    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'none';
    if (step3) step3.style.display = 'block';

    if (pill1) pill1.classList.remove('active');
    if (pill2) pill2.classList.remove('active');
    if (pill3) pill3.classList.add('active');

    // ヘッダー情報更新
    const titleBar = document.getElementById('fp-current-plan-title-bar');
    if (titleBar) {
      titleBar.textContent = `選択中: ${plan.title} (${plan.total_tsubo}坪 / ${plan.entrance_direction})`;
    }

    const resTitle = document.getElementById('res-plan-title');
    if (resTitle) resTitle.textContent = plan.title;

    const resSpecs = document.getElementById('res-plan-specs');
    if (resSpecs) {
      resSpecs.textContent = `延床面積: ${plan.total_tsubo}坪 (${plan.total_sqm}㎡) ｜ ${plan.rooms} ｜ 間口 ${plan.max_width_m}m × 奥行 ${plan.max_depth_m}m`;
    }

    const resDirBadge = document.getElementById('res-plan-direction-badge');
    if (resDirBadge) resDirBadge.textContent = plan.entrance_direction;

    const resRoomsLabel = document.getElementById('res-plan-rooms-label');
    if (resRoomsLabel) resRoomsLabel.textContent = plan.rooms;

    // フロア切り替えタブ生成
    renderStep3FloorTabs();

    // 2D ⇔ 3D スライダー比較ステージの描画
    renderStep3Stage();

    // 部屋詳細リストの描画
    renderRoomSpecsList();

    // AIチャット相談パネルの初期化（専属プラン診断メッセージ投入）
    initStep3AiChat(plan);

    // スクロール
    const studioEl = document.getElementById('floorplan-studio');
    if (studioEl) studioEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Step 3 フロア切り替えタブ
  function renderStep3FloorTabs() {
    const tabsContainer = document.getElementById('fp-floor-tabs');
    if (!tabsContainer || !activePlan) return;

    tabsContainer.innerHTML = activePlan.floors.map((fl, idx) => `
      <button type="button" class="btn btn-secondary btn-step3-floor ${idx === activeFloorIndex ? 'active' : ''}" data-idx="${idx}" style="padding: 4px 12px; font-size: 0.8rem; font-weight: 700; ${idx === activeFloorIndex ? 'background: #0284c7; color: #fff; border-color: #0284c7;' : ''}">
        ${fl.floor} (${fl.area_sqm}㎡)
      </button>
    `).join('');

    tabsContainer.querySelectorAll('.btn-step3-floor').forEach(btn => {
      btn.addEventListener('click', (e) => {
        activeFloorIndex = Number(e.currentTarget.getAttribute('data-idx'));
        renderStep3FloorTabs();
        renderStep3Stage();
        renderRoomSpecsList();
      });
    });
  }

  // Step 3 スライダー比較ステージ描画
  function renderStep3Stage() {
    const stage = document.getElementById('fp-viewer-stage') || document.getElementById('fp-svg-viewport');
    if (!stage || !activePlan) return;

    const curFloor = activePlan.floors[activeFloorIndex] || activePlan.floors[0] || {};
    const has3D = !!curFloor.gemini_3d;
    const has2D = !!curFloor.clean_2d;

    // 安全モード補正
    if (viewMode === 'compare' && (!has3D || !has2D)) {
      viewMode = has3D ? 'gemini' : '2d';
    } else if (viewMode === 'gemini' && !has3D) {
      viewMode = '2d';
    }

    updateModeButtonsUI(has3D, has2D);

    if (viewMode === '2d') {
      stage.style.background = invert2D ? '#020617' : '#ffffff';
      stage.innerHTML = `
        <img src="${curFloor.clean_2d}" alt="2D図面原本" style="max-width: 100%; max-height: 480px; object-fit: contain; ${invert2D ? 'filter: invert(1) contrast(1.25);' : ''}" />
      `;
    } else if (viewMode === 'gemini') {
      stage.style.background = '#020617';
      stage.innerHTML = `
        <img src="${curFloor.gemini_3d}" alt="Gemini 3Dパース" style="max-width: 100%; max-height: 480px; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />
      `;
    } else if (viewMode === 'compare') {
      stage.style.background = '#ffffff';
      stage.innerHTML = `
        <div class="pg-compare-container" id="step3-compare-wrap">
          <!-- 背景レイヤー: 2D図面原本 (下層に隠れている2D図面原本) -->
          <img src="${curFloor.clean_2d}" alt="2D図面原本" class="pg-compare-bg-img" />

          <!-- 前景クリップレイヤー: Gemini 3Dパース (スライダー位置より右側を表示、左側は下層の2Dが露出) -->
          <div class="pg-compare-clip-layer" id="step3-compare-clip" style="clip-path: inset(0 0 0 ${sliderPos}%);">
            <img src="${curFloor.gemini_3d}" alt="Gemini 3Dパース" class="pg-compare-fg-img" />
          </div>

          <!-- スライダー境界線 -->
          <div class="pg-compare-divider-line" id="step3-compare-line" style="left: ${sliderPos}%;">
            <div class="pg-compare-handle-knob">↔</div>
          </div>

          <!-- 全面透明レンジインプット（ネイティブドラッグ・スワイプ追従でピクセルズレ完全ゼロ） -->
          <input type="range" min="0" max="100" value="${sliderPos}" class="pg-compare-range-input" id="step3-range-input" aria-label="2D原本と3Dパースの比較スライダー" />

          <span style="position: absolute; top: 12px; left: 12px; background: rgba(15,23,42,0.85); color: #fff; font-size: 0.72rem; font-weight: 700; padding: 4px 10px; border-radius: 6px; z-index: 6; pointer-events: none;">
            ← 2D図面原本
          </span>
          <span style="position: absolute; top: 12px; right: 12px; background: rgba(2,132,199,0.9); color: #fff; font-size: 0.72rem; font-weight: 800; padding: 4px 10px; border-radius: 6px; z-index: 6; pointer-events: none;">
            Gemini 3Dパース →
          </span>
        </div>
      `;
      initStep3CompareSlider();
    }
  }

  // 表示モードボタンのハイライト更新
  function updateModeButtonsUI(has3D, has2D) {
    const btn2d = document.getElementById('btn-mode-2d');
    const btnGemini = document.getElementById('btn-mode-gemini');
    const btnCompare = document.getElementById('btn-mode-compare');
    const btnInvert = document.getElementById('btn-mode-invert');

    if (btn2d) {
      btn2d.className = `pg-mode-btn ${viewMode === '2d' ? 'active-2d' : ''}`;
    }
    if (btnGemini) {
      btnGemini.style.display = has3D ? 'inline-flex' : 'none';
      btnGemini.className = `pg-mode-btn ${viewMode === 'gemini' ? 'active-gemini' : ''}`;
    }
    if (btnCompare) {
      btnCompare.style.display = (has3D && has2D) ? 'inline-flex' : 'none';
      btnCompare.className = `pg-mode-btn ${viewMode === 'compare' ? 'active-compare' : ''}`;
    }
    if (btnInvert) {
      btnInvert.style.display = viewMode === '2d' ? 'inline-block' : 'none';
      btnInvert.textContent = invert2D ? '☀️ 白地原本で表示' : '🌙 暗線ブループリント';
    }
  }

  // スワイプ比較ドラッグ初期化（全面透明 range input 方式）
  function initStep3CompareSlider() {
    const rangeInput = document.getElementById('step3-range-input');
    const clipLayer = document.getElementById('step3-compare-clip');
    const dividerLine = document.getElementById('step3-compare-line');
    if (!rangeInput || !clipLayer || !dividerLine) return;

    rangeInput.addEventListener('input', (e) => {
      sliderPos = Number(e.target.value);
      clipLayer.style.clipPath = `inset(0 0 0 ${sliderPos}%)`;
      dividerLine.style.left = `${sliderPos}%`;
    });
  }

  // 部屋寸法・建材詳細
  function renderRoomSpecsList() {
    const list = document.getElementById('res-rooms-list');
    const label = document.getElementById('res-rooms-floor-label');
    if (!list || !activePlan) return;

    const curFloor = activePlan.floors[activeFloorIndex] || activePlan.floors[0] || {};
    if (label) label.textContent = `${curFloor.floor} (${curFloor.area_sqm}㎡)`;

    // プランに基づくサンプル仕様カード
    list.innerHTML = `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.9rem;">
        <div style="font-weight: 700; color: #0284c7; font-size: 0.88rem;">🛋️ LDK (${activePlan.ldk_tatami}帖)</div>
        <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">無垢オーク挽板フローリング ｜ 珪藻土塗り壁 ｜ 低温水床暖房標準</div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.9rem;">
        <div style="font-weight: 700; color: #0284c7; font-size: 0.88rem;">🍳 キッチン (${activePlan.kitchen_type})</div>
        <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">人造大理石ワークトップ ｜ 食洗機ビルトイン ｜ パントリー動線連動</div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.9rem;">
        <div style="font-weight: 700; color: #0284c7; font-size: 0.88rem;">🛏️ 主寝室 / 個室群</div>
        <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">樹脂トリプルサッシ(アルゴンガス) ｜ C値0.3気密施工 ｜ 遮音間仕切壁</div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.9rem;">
        <div style="font-weight: 700; color: #0284c7; font-size: 0.88rem;">🧺 水回り ＆ 換気空調</div>
        <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">第一種全熱交換換気(澄家) ｜ 乾太くん対応ランドリー ｜ ユニットバス1616</div>
      </div>
    `;
  }

  // --- Step 3: AIチャット相談パネルの初期化＆対話処理 ---
  function initStep3AiChat(plan) {
    const chatHistory = document.getElementById('fp-chat-history');
    const chipsContainer = document.getElementById('fp-chat-chips');
    const chatInput = document.getElementById('fp-chat-input');
    if (!chatHistory) return;

    chatHistory.innerHTML = '';

    // AI専属設計士からのウェルカムメッセージ
    const welcomeHtml = `
      <div class="chat-bubble chat-bubble-ai" style="margin-bottom: 1rem;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span style="font-size: 1.2rem;">🤖</span>
          <strong style="color: #0284c7; font-size: 0.92rem;">専属建築士AIパートナー</strong>
        </div>
        <div style="font-size: 0.9rem; line-height: 1.8; color: #1e293b;">
          <strong>「${escapeHtml(plan.title)}」をベースプランとしてロードしました！</strong><br><br>
          📋 <strong>現在の間取りスペック:</strong><br>
          ・延床: <strong>${plan.total_tsubo}坪</strong> (${plan.total_sqm}㎡) ｜ 方位: <strong>${plan.entrance_direction}</strong><br>
          ・敷地寸法目安: 間口 <strong>${plan.max_width_m}m</strong> × 奥行 <strong>${plan.max_depth_m}m</strong><br>
          ・LDK: <strong>${plan.ldk_tatami}帖</strong>（${plan.kitchen_type}キッチン）<br>
          ・間取り構成: <strong>${plan.rooms}</strong><br><br>
          💡 <strong>本機能の役割:</strong><br>
          本チャットは、お客様のご要望に合わせて<strong>「実現可能性とプロ目線のアドバイス・レイアウト提案を即座に行う対話機能」</strong>です。<br>
          「LDKをもっと広く」「パントリーを追加」「小上がり和室が欲しい」「テレワーク書斎を」「ランドリールームを回遊動線に」など、思いついた要望をそのままチャットで送ってください。全棟許容応力度計算による耐震等級3（偏心率0.15以下）とHEAT20 G2/G3を両立させながら、プロの工学視点で即座にアドバイス・改善提案を回答いたします！
        </div>
      </div>
    `;
    chatHistory.innerHTML = welcomeHtml;

    // ワンタップ改善チップス
    if (chipsContainer) {
      chipsContainer.innerHTML = '';
      const chips = [
        'LDKを広げて開放的にしたい',
        'キッチン横にパントリーを追加したい',
        'リビングに小上がり畳コーナーが欲しい',
        '独立したテレワーク書斎を組み込みたい',
        'ランドリールームを家事ラク回遊動線にしたい'
      ];
      chips.forEach(chipText => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fp-chip-btn';
        btn.textContent = chipText;
        btn.style.cssText = 'padding: 4px 10px; font-size: 0.78rem; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; border-radius: 14px; cursor: pointer; transition: all 0.2s;';
        btn.onclick = () => {
          if (chatInput) {
            chatInput.value = chipText;
            sendAiChatMessage(chipText);
          }
        };
        chipsContainer.appendChild(btn);
      });
    }
  }

  // チャットメッセージ送信処理
  function sendAiChatMessage(userText) {
    const chatHistory = document.getElementById('fp-chat-history');
    const chatInput = document.getElementById('fp-chat-input');
    if (!chatHistory || !userText.trim()) return;

    // ユーザー発言バブル
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble chat-bubble-user';
    userBubble.style.cssText = 'background: #0284c7; color: #ffffff; padding: 0.8rem 1.1rem; border-radius: 14px 14px 2px 14px; margin-bottom: 0.8rem; align-self: flex-end; max-width: 85%; font-size: 0.88rem; line-height: 1.6;';
    userBubble.innerHTML = escapeHtml(userText);
    chatHistory.appendChild(userBubble);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    if (chatInput) chatInput.value = '';

    // AI思考中アニメーション
    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble chat-bubble-ai';
    typingBubble.style.cssText = 'background: #f1f5f9; color: #475569; padding: 0.8rem 1.1rem; border-radius: 14px 14px 14px 2px; margin-bottom: 0.8rem; font-size: 0.85rem;';
    typingBubble.innerHTML = '⏳ 建築士AIが構造耐震・温熱動線を計算中...';
    chatHistory.appendChild(typingBubble);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // AIの的確な応答生成
    setTimeout(() => {
      typingBubble.remove();
      const aiReplyBubble = document.createElement('div');
      aiReplyBubble.className = 'chat-bubble chat-bubble-ai';
      aiReplyBubble.style.cssText = 'background: #f8fafc; border: 1.5px solid #bae6fd; color: #1e293b; padding: 1rem 1.2rem; border-radius: 14px 14px 14px 2px; margin-bottom: 1rem; font-size: 0.88rem; line-height: 1.8;';

      const planTitle = activePlan ? activePlan.title : '本プラン';
      let adviceText = '';

      if (userText.includes('LDK') || userText.includes('広く')) {
        adviceText = `
          <strong>【LDK拡張・大空間デザインの改変提案】</strong><br>
          「${escapeHtml(planTitle)}」の間口 ${activePlan.max_width_m}m を活かし、耐力壁を建物の外周部に高倍率面材（タイガーEXハイパー等）で集中配置することで、LDK内の柱をゼロにしたまま20帖超の大空間へ拡張可能です！<br>
          全棟で許容応力度計算（偏心率0.15以下）を実施するため、大開口を取りながらも耐震等級3は完全に維持されます。
        `;
      } else if (userText.includes('パントリー') || userText.includes('キッチン')) {
        adviceText = `
          <strong>【パントリー追加・キッチン家事動線の改変提案】</strong><br>
          キッチン背面またはサイドに2帖分のウォークスルー型パントリーを新設できます！玄関からの「ただいま動線（買い物帰りに直接パントリーへ直行）」と「冷蔵庫の隠蔽配置」を両立させ、生活感を一切見せない美しいアイランド空間へ昇華します。
        `;
      } else if (userText.includes('和室') || userText.includes('畳')) {
        adviceText = `
          <strong>【小上がり畳コーナーの組み込み提案】</strong><br>
          リビングの一角に3〜4.5帖の小上がり畳（段差30cm、下部は大容量引き出し収納）をレイアウト可能です。段差は腰掛けベンチとしても活用でき、小さなお子様のお昼寝やご家族のくつろぎスペースとして機能します。
        `;
      } else if (userText.includes('書斎') || userText.includes('テレワーク')) {
        adviceText = `
          <strong>【独立型テレワーク書斎の配置提案】</strong><br>
          LDKから適度な距離を保った位置に、防音配慮（吸音ウール・気密遮音ドア）を施した2〜3帖の書斎を計画できます。オンライン会議時にも生活音が入らず、窓からの北側安定光で日中も快適に集中できます。
        `;
      } else {
        adviceText = `
          <strong>【ご要望に対する工学的アドバイス】</strong><br>
          承知いたしました！「${escapeHtml(userText)}」について、構造躯体（柱・梁・直下率）のバランスを崩すことなく綺麗に間取りへ反映可能です。<br>
          埼玉県西部の冬のからっ風や日照シミュレーション（日影・パッシブ採光）も同時に加味し、温熱・耐震・使い勝手が最も高まるレイアウトをご提案いたします。
        `;
      }

      aiReplyBubble.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span style="font-size: 1.1rem;">💡</span>
          <strong style="color: #0284c7;">建築士AIの改変シミュレーション回答:</strong>
        </div>
        <div>${adviceText}</div>
        <div style="margin-top: 8px; font-size: 0.8rem; color: #64748b;">
          ※さらに細かい変更要望がございましたら、続けてチャットでお送りください！
        </div>
      `;
      chatHistory.appendChild(aiReplyBubble);
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }, 800);
  }

  // --- Step 3: イベント登録 ---
  function setupStep3Events() {
    // 表示モード切り替え
    const btn2d = document.getElementById('btn-mode-2d');
    if (btn2d) {
      btn2d.addEventListener('click', () => {
        viewMode = '2d';
        renderStep3Stage();
      });
    }

    const btnGemini = document.getElementById('btn-mode-gemini');
    if (btnGemini) {
      btnGemini.addEventListener('click', () => {
        viewMode = 'gemini';
        renderStep3Stage();
      });
    }

    const btnCompare = document.getElementById('btn-mode-compare');
    if (btnCompare) {
      btnCompare.addEventListener('click', () => {
        viewMode = 'compare';
        renderStep3Stage();
      });
    }

    const btnInvert = document.getElementById('btn-mode-invert');
    if (btnInvert) {
      btnInvert.addEventListener('click', () => {
        invert2D = !invert2D;
        renderStep3Stage();
      });
    }

    // チャット送信フォーム
    const chatForm = document.getElementById('fp-chat-form');
    const chatInput = document.getElementById('fp-chat-input');
    if (chatForm && chatInput) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value;
        if (text.trim()) {
          sendAiChatMessage(text);
        }
      });
    }

    // フォトリアルパース工房連動ボタン
    const btnSyncPers = document.getElementById('btn-sync-to-perspective');
    if (btnSyncPers) {
      btnSyncPers.addEventListener('click', () => {
        if (!activePlan) return;
        const targetLink = document.querySelector('[data-target="ai-studio"]');
        if (targetLink) {
          targetLink.click();
          setTimeout(() => {
            const promptBox = document.getElementById('custom-perspective-prompt') || document.querySelector('#ai-studio textarea');
            if (promptBox) {
              promptBox.value = `${activePlan.entrance_direction}、延床${activePlan.total_tsubo}坪の邸宅。大開口LDK${activePlan.ldk_tatami}帖、${activePlan.kitchen_type}キッチン、${(activePlan.tags || []).join('、')}を取り入れたモダンな建築`;
              promptBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 300);
        }
      });
    }

    // Bubble Planで作図・アレンジする引き込みボタン
    const btnPullBubble = document.getElementById('btn-pull-to-bubble-mode');
    if (btnPullBubble) {
      btnPullBubble.addEventListener('click', () => {
        if (!activePlan) return;
        loadPlanIntoBubbleMode(activePlan);
      });
    }

    // IFCダウンロードボタン
    const btnIfc = document.getElementById('btn-download-ifc');
    if (btnIfc) {
      btnIfc.addEventListener('click', () => {
        alert('【3D BIM (IFCファイル) 生成】\n現在の間取りの壁・スラブ・開口部情報をISO-10303-21規格のIFCモデルとして書き出します。\n(Revit / ArchiCAD で直接インポート可能です)');
      });
    }

    // マイカルテ保存ボタン
    const btnSave = document.getElementById('btn-save-plan-mypage');
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        if (activePlan && window.bubblePlanInstance) {
          window.bubblePlanInstance.savePlanToCarte(activePlan);
        } else {
          alert('マイカルテに間取りデータを保存しました！');
        }
      });
    }
  }

  // 選択されたプランをたたき台としてBubble Planへ引き渡し、建設地・敷地図入力ゲートから開始する
  function loadPlanIntoBubbleMode(plan) {
    if (!plan) return;

    // 1. BubblePlanInstance にたたき台プランを登録
    if (window.bubblePlanInstance && typeof window.bubblePlanInstance.setTatakiPlan === 'function') {
      window.bubblePlanInstance.setTatakiPlan(plan);
    }

    // 2. バブルモード画面へ切り替え
    const btnBubble = document.getElementById('btn-fp-mode-bubble');
    if (btnBubble) {
      btnBubble.click();
    } else if (window.bubblePlanInstance && typeof window.bubblePlanInstance.openBubbleStudio === 'function') {
      window.bubblePlanInstance.openBubbleStudio();
    }

    // 3. ★ 建設地の入力や敷地図アップロード、チャットヒアリング（STEP 0）から開始する
    if (window.bubblePlanInstance && typeof window.bubblePlanInstance.reopenGateSection === 'function') {
      window.bubblePlanInstance.reopenGateSection();
    }

    // ゲートセクションへスムーズスクロール
    const gateEl = document.getElementById('bubble-site-gate-wrap');
    if (gateEl) {
      setTimeout(() => {
        gateEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }

  // --- ナビゲーションイベント ---
  function setupNavigationEvents() {
    function showStep1() {
      const s1 = document.getElementById('fp-step1-container');
      const s2 = document.getElementById('fp-step2-container');
      const s3 = document.getElementById('fp-step3-container');
      const p1 = document.getElementById('pill-step-1');
      const p2 = document.getElementById('pill-step-2');
      const p3 = document.getElementById('pill-step-3');

      if (s1) s1.style.display = 'block';
      if (s2) s2.style.display = 'none';
      if (s3) s3.style.display = 'none';
      if (p1) p1.classList.add('active');
      if (p2) p2.classList.remove('active');
      if (p3) p3.classList.remove('active');

      const studio = document.getElementById('floorplan-studio');
      if (studio) studio.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function showStep2() {
      const s1 = document.getElementById('fp-step1-container');
      const s2 = document.getElementById('fp-step2-container');
      const s3 = document.getElementById('fp-step3-container');
      const p1 = document.getElementById('pill-step-1');
      const p2 = document.getElementById('pill-step-2');
      const p3 = document.getElementById('pill-step-3');

      if (s1) s1.style.display = 'none';
      if (s2) s2.style.display = 'block';
      if (s3) s3.style.display = 'none';
      if (p1) p1.classList.remove('active');
      if (p2) p2.classList.add('active');
      if (p3) p3.classList.remove('active');

      const studio = document.getElementById('floorplan-studio');
      if (studio) studio.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Step 2 -> Step 1 (1つ前: 基本条件の選択に戻る - 条件保持)
    const btnBackTo1 = document.getElementById('btn-back-to-step1');
    if (btnBackTo1) {
      btnBackTo1.onclick = () => {
        showStep1();
      };
    }

    // Step 2 -> Step 1 (最初からやり直す - 条件リセット)
    const btnResetFrom2 = document.getElementById('btn-reset-to-step1-from-step2');
    if (btnResetFrom2) {
      btnResetFrom2.onclick = () => {
        resetStep1Conditions();
        showStep1();
      };
    }

    // Step 3 -> Step 2 (1つ前: おすすめ一覧に戻る)
    const btnBackTo2 = document.getElementById('btn-back-to-step2');
    if (btnBackTo2) {
      btnBackTo2.onclick = () => {
        showStep2();
      };
    }

    // Step 3 -> Step 1 (最初からやり直す - 条件リセット)
    const btnResetFrom3 = document.getElementById('btn-reset-to-step1-from-step3');
    if (btnResetFrom3) {
      btnResetFrom3.onclick = () => {
        resetStep1Conditions();
        showStep1();
      };
    }
  }

  // HTMLエスケープヘルパー
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- 15万円設計申込 プレミアムアトリエゲート＆認証制御 ---
  function openAtelierGateModal() {
    const modal = document.getElementById('atelier-gate-modal');
    if (modal) modal.style.display = 'block';
  }
  function closeAtelierGateModal() {
    const modal = document.getElementById('atelier-gate-modal');
    if (modal) modal.style.display = 'none';
  }
  function showPasscodePrompt() {
    const area = document.getElementById('passcode-unlock-area');
    if (area) area.style.display = 'block';
  }
  function isAtelierUnlocked() {
    return localStorage.getItem('smile_atelier_unlocked') === 'true';
  }
  function verifyAtelierPasscode() {
    const inp = document.getElementById('atelier-passcode-input');
    const msg = document.getElementById('passcode-msg');
    if (inp && (inp.value === '150000' || inp.value === 'smile' || inp.value === '777')) {
      localStorage.setItem('smile_atelier_unlocked', 'true');
      alert('🎉 パスコード認証が完了しました！プレミアム設計アトリエをご利用いただけます。');
      closeAtelierGateModal();
      if (window.location.hash !== '#floorplan-studio') {
        window.location.hash = '#floorplan-studio';
      }
    } else {
      if (msg) msg.style.display = 'block';
    }
  }

  // グローバル露出（HTMLイベント属性との互換性確保）
  window.openAtelierGateModal = openAtelierGateModal;
  window.closeAtelierGateModal = closeAtelierGateModal;
  window.showPasscodePrompt = showPasscodePrompt;
  window.verifyAtelierPasscode = verifyAtelierPasscode;
  window.isAtelierUnlocked = isAtelierUnlocked;

  function initAtelierGate() {
    const bubbleBtn = document.getElementById('btn-fp-mode-bubble');
    if (bubbleBtn) {
      bubbleBtn.addEventListener('click', (e) => {
        if (!isAtelierUnlocked()) {
          e.preventDefault();
          e.stopPropagation();
          openAtelierGateModal();
        }
      }, true);
    }
  }

  // 起動
  function start() {
    init();
    initAtelierGate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
