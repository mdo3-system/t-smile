// ========================================================
// Bubble Plan (バブルプラン) — エンタメ型 家族間取り検討SaaS
// 敷地測量図読込 ＆ 都市計画自動判定 ＆ 車両ブロック自由配置（1台ずつ並べる）
// 車両連動の凸凹建物最大外形図 ＆ 直線矩形物理シミュレーション ＆ HEAT20 G2.5連動
// 株式会社住ま居る / スマイチ
// ========================================================

class BubblePlanStudio {
  constructor() {
    this.currentFloor = 1; // 1: 1階, 2: 2階
    this.canvas = null;
    this.ctx = null;
    this.width = 800;
    this.height = 520;
    this.scale = 1.0;

    // Simulation nodes & links (部屋ブロック)
    this.nodes = [];
    this.links = [];

    // 表示・描画モード ('bubble' : 楕円・円バブル ＆ 重なり・凸凹許容 ｜ 'rect' : 矩形設計ブロック)
    this.renderMode = 'bubble';

    // 車両ブロック（1台ずつ自由に配置・移動可能）
    this.carNodes = [];

    // Interaction state
    this.draggedItem = null; // node or car
    this.selectedItem = null; // node or car
    this.selectedType = 'none'; // 'node' | 'car' | 'none'
    this.mouseX = 0;
    this.mouseY = 0;
    this.isMouseDown = false;

    // 都市計画データベース
    this.urbanDb = null;

    // 断熱等性能等級別の坪単価テーブル (純粋な断熱性能基準＋耐震等級3)
    this.insulationTiers = {
      grade4: { name: '等級4 (省エネ基準)', tsuboRate: 680000, spec: '平成28年基準・アルミ樹脂複合複層 (Ua値0.87)', ua: '0.87' },
      grade5: { name: '等級5 (ZEH基準)', tsuboRate: 740000, spec: 'ZEH水準・高性能グラスウール (Ua値0.60)', ua: '0.60' },
      grade6: { name: '等級6 (HEAT20 G2)', tsuboRate: 820000, spec: '樹脂サッシ＋充填断熱 (Ua値0.46)', ua: '0.46' },
      grade_g25: { name: '★住ま居る標準 (HEAT20 G2.5)', tsuboRate: 860000, spec: '樹脂トリプル＋付加断熱40mm (Ua値0.32・C値0.3) ｜ 許容応力度計算耐震等級3', ua: '0.32' },
      grade7: { name: '等級7 (HEAT20 G3 最高峰)', tsuboRate: 920000, spec: '樹脂トリプル＋付加断熱100mm (Ua値0.23)', ua: '0.23' }
    };
    this.currentTier = 'grade_g25'; // デフォルトは住ま居る標準 (HEAT20 G2.5)
    this.buildingType = 'two_story';

    // 敷地・配置・都市計画パラメータ（ミリ単位実寸 ＆ ピクセル変換）
    this.siteData = {
      surveyLoaded: false,
      surveyImage: null,
      address: '埼玉県鶴ヶ島市町屋',
      siteTsubo: 50.0,
      siteAreaSqm: 165.29,
      siteWidthMm: 11000,   // 敷地間口 11.0m
      siteDepthMm: 15000,   // 敷地奥行 15.0m
      roadDirection: 'south', // south | north | east | west
      roadWidthM: 6.0,
      climateRegion: '6地域',
      zone: '無指定 (市街化調整区域)',
      kenpeiRate: 60,
      yousekiRate: 200,
      fireZone: '法22条区域外 (指定なし)',
      maxBuildingAreaTsubo: 30.0,
      maxFloorAreaTsubo: 100.0,
      roadMarginMm: 200,      // 道路側離隔は標準20cm (200mm)
      boundaryMarginMm: 650,  // 隣地境界離隔 (650mm標準、狭小地は200mmまで許容)
      carMarginMm: 200,       // 車と建物離隔 200mm
      builtinShiftMm: 300     // ビルトイン建物芯から30cmずれた位置
    };

    // 基本建築可能バウンディング（キャンバス座標）
    this.baseBuildingBox = {
      minX: 100, maxX: 700, minY: 80, maxY: 440,
      widthMm: 9700, depthMm: 13000, pxPerMm: 0.03
    };

    // 敷地描画領域（キャンバス座標）
    this.siteBox = {
      minX: 60, maxX: 740, minY: 50, maxY: 470
    };

    // Gemini対話ヒアリング状態
    this.chatStep = 1;

    // 黄金パターン辞書
    this.goldenPatterns = {};

    // アニメーションループID
    this.animationFrameId = null;
  }

  async init() {
    this.canvas = document.getElementById('bubble-plan-canvas');
    this.wrap = document.getElementById('bubble-plan-canvas-wrap');

    // 1. 都市計画DB ＆ 黄金パターンの読み込み
    await Promise.all([
      this.loadUrbanPlanningDb(),
      this.loadGoldenPatterns()
    ]);

    // 2. イベントリスナー登録
    this.bindEvents();

    // 3. STEP 0 ゲート初期設定
    this.initGateSection();

    // 4. マイカルテの件数バッジ更新
    this.updateCarteBadge();

    // 5. 途中保存データの復元検知バナーチェック (翌日以降も再開)
    this.checkSavedProgressOnStartup();
  }

  async loadUrbanPlanningDb() {
    try {
      const res = await fetch('/data/urban_planning_db.json');
      if (res.ok) {
        this.urbanDb = await res.json();
      }
    } catch (e) {
      console.warn('[BubblePlan] 都市計画DBの取得に失敗:', e);
    }
  }

  async loadGoldenPatterns() {
    try {
      const res = await fetch('/data/golden_patterns.json');
      if (res.ok) {
        const data = await res.json();
        this.goldenPatterns = data.patterns || {};
        this.updateGoldenPatternSelectUI();
      }
    } catch (err) {
      this.loadFallbackPatterns();
    }
  }

  loadFallbackPatterns() {
    this.goldenPatterns = {
      kaiyu: {
        id: 'kaiyu',
        name: '🌀 家事ラク回遊コア（玄関→パントリー→K→水回り）',
        desc: '帰宅後すぐにパントリーへ荷物を置き、キッチン・洗面脱衣へ回遊できる究極の時短動線',
        type: 'two_story',
        nodes: [
          { id: 'porch', name: '玄関ポーチ', floor: 1, tatami: 1.5, category: 'entrance', color: '#7dd3fc', wMm: 1365, hMm: 1820 },
          { id: 'genkan', name: '玄関・土間', floor: 1, tatami: 2.5, category: 'entrance', color: '#38bdf8', wMm: 1820, hMm: 1820 },
          { id: 'sic', name: 'SIC', floor: 1, tatami: 1.5, category: 'storage', color: '#94a3b8', wMm: 910, hMm: 1820 },
          { id: 'hall', name: '玄関ホール', floor: 1, tatami: 2.0, category: 'circulation', color: '#cbd5e1', wMm: 1820, hMm: 1820 },
          { id: 'stairs1', name: '1F階段', floor: 1, tatami: 1.7, category: 'circulation', color: '#94a3b8', wMm: 910, hMm: 3125 },
          { id: 'toilet1', name: '1Fトイレ', floor: 1, tatami: 1.0, category: 'sanitary', color: '#a855f7', wMm: 910, hMm: 1820 },
          { id: 'dl', name: 'ダイニング・リビング', floor: 1, tatami: 14.5, category: 'living', color: '#fb923c', wMm: 5460, hMm: 4095 },
          { id: 'kitchen', name: '対面キッチン', floor: 1, tatami: 5.5, category: 'kitchen', color: '#f59e0b', wMm: 2730, hMm: 3185 },
          { id: 'pantry', name: 'パントリー', floor: 1, tatami: 2.0, category: 'storage', color: '#a3e635', wMm: 1820, hMm: 1820 },
          { id: 'wash', name: '洗面脱衣室', floor: 1, tatami: 3.0, category: 'sanitary', color: '#2dd4bf', wMm: 1820, hMm: 2730 },
          { id: 'bath', name: 'システムバス(1616)', floor: 1, tatami: 2.0, category: 'sanitary', color: '#06b6d4', wMm: 1820, hMm: 1820 },
          { id: 'tatami', name: '小上がり和室', floor: 1, tatami: 4.5, category: 'japanese', color: '#4ade80', wMm: 2730, hMm: 2730 },
          { id: 'deck', name: 'ウッドデッキ', floor: 1, tatami: 3.5, category: 'outdoor', color: '#fdba74', wMm: 2730, hMm: 2117 },
          { id: 'master', name: '主寝室', floor: 2, tatami: 7.5, category: 'private', color: '#818cf8', wMm: 3640, hMm: 3410 },
          { id: 'wic', name: 'WIC', floor: 2, tatami: 3.5, category: 'storage', color: '#94a3b8', wMm: 1820, hMm: 3185 },
          { id: 'bed1', name: '子ども部屋A', floor: 2, tatami: 5.0, category: 'private', color: '#facc15', wMm: 2730, hMm: 3030 },
          { id: 'bed2', name: '子ども部屋B', floor: 2, tatami: 5.0, category: 'private', color: '#fde047', wMm: 2730, hMm: 3030 },
          { id: 'hall2', name: '2Fホール', floor: 2, tatami: 3.0, category: 'circulation', color: '#cbd5e1', wMm: 1820, hMm: 2730 },
          { id: 'stairs2', name: '2F階段', floor: 2, tatami: 2.5, category: 'circulation', color: '#94a3b8', wMm: 1820, hMm: 2275 },
          { id: 'balcony', name: '2Fバルコニー', floor: 2, tatami: 2.5, category: 'outdoor', color: '#38bdf8', wMm: 3640, hMm: 1137 }
        ],
        links: [
          { source: 'porch', target: 'genkan' },
          { source: 'genkan', target: 'hall' },
          { source: 'genkan', target: 'sic' },
          { source: 'sic', target: 'pantry' },
          { source: 'pantry', target: 'kitchen' },
          { source: 'kitchen', target: 'wash' },
          { source: 'wash', target: 'bath' },
          { source: 'hall', target: 'dl' },
          { source: 'hall', target: 'toilet1' },
          { source: 'dl', target: 'kitchen' },
          { source: 'dl', target: 'tatami' },
          { source: 'hall2', target: 'master' },
          { source: 'master', target: 'wic' },
          { source: 'hall2', target: 'bed1' },
          { source: 'hall2', target: 'bed2' }
        ]
      }
    };
    this.updateGoldenPatternSelectUI();
  }

  updateGoldenPatternSelectUI() {
    const sel = document.getElementById('bubble-pattern-select');
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = Object.keys(this.goldenPatterns).map(k => {
      const p = this.goldenPatterns[k];
      return `<option value="${k}">${p.name}</option>`;
    }).join('');
    if (this.goldenPatterns[currentVal]) {
      sel.value = currentVal;
    }
  }

  // ==========================================
  // 2. STEP 0: 敷地測量図 ＆ 都市計画自動判定 ＆ Gemini対話ヒアリング
  // ==========================================
  initGateSection() {
    document.querySelectorAll('.btn-sample-survey').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sampleKey = e.currentTarget.getAttribute('data-sample');
        this.applySampleSurvey(sampleKey);
      });
    });

    const dropzone = document.getElementById('bubble-survey-dropzone');
    const fileInput = document.getElementById('bubble-survey-file-input');
    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) this.handleSurveyFile(e.dataTransfer.files[0]);
      });
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) this.handleSurveyFile(e.target.files[0]);
      });
    }

    const btnLookup = document.getElementById('btn-gate-lookup-address');
    const inputAddr = document.getElementById('gate-site-address');
    if (btnLookup && inputAddr) {
      btnLookup.addEventListener('click', () => this.lookupUrbanPlanning(inputAddr.value.trim()));
      inputAddr.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); this.lookupUrbanPlanning(inputAddr.value.trim()); }
      });
    }

    this.renderChatChips();

    const btnConfirm = document.getElementById('btn-gate-confirm-and-start');
    if (btnConfirm) {
      // 初期状態はチャット回答完了まで非活性化・ロック
      btnConfirm.disabled = true;
      btnConfirm.style.background = '#94a3b8';
      btnConfirm.style.cursor = 'not-allowed';
      btnConfirm.style.opacity = '0.6';
      btnConfirm.textContent = '🔒 チャットでヒアリングに回答すると確定ボタンが押せます';
      btnConfirm.addEventListener('click', () => this.proceedToMainWorkspace());
    }

    const btnReopen = document.getElementById('btn-reopen-site-gate');
    if (btnReopen) {
      btnReopen.addEventListener('click', () => this.reopenGateSection());
    }

    const selMargin = document.getElementById('bubble-select-boundary-margin');
    if (selMargin) {
      selMargin.addEventListener('change', (e) => {
        this.siteData.boundaryMarginMm = parseInt(e.target.value) || 650;
        this.calculateBuildingBoundingBoxPrecise();
        this.updateMetrics();
      });
    }

    this.lookupUrbanPlanning(this.siteData.address);
    this.applySampleSurvey('sample_50_south');
  }

  applySampleSurvey(sampleKey) {
    if (sampleKey === 'sample_50_south') {
      this.siteData.siteTsubo = 50.0;
      this.siteData.siteAreaSqm = 165.29;
      this.siteData.siteWidthMm = 11000;
      this.siteData.siteDepthMm = 15000;
      this.siteData.roadDirection = 'south';
      this.siteData.roadWidthM = 6.0;
      this.siteData.address = '埼玉県鶴ヶ島市町屋';
    } else if (sampleKey === 'sample_30_square') {
      this.siteData.siteTsubo = 30.0;
      this.siteData.siteAreaSqm = 99.17;
      this.siteData.siteWidthMm = 10000; // 間口10m
      this.siteData.siteDepthMm = 10000; // 奥行10m
      this.siteData.roadDirection = 'south';
      this.siteData.roadWidthM = 4.0;
      this.siteData.address = '埼玉県鶴ヶ島市町屋';
    } else if (sampleKey === 'sample_40_north') {
      this.siteData.siteTsubo = 40.0;
      this.siteData.siteAreaSqm = 132.23;
      this.siteData.siteWidthMm = 9500;
      this.siteData.siteDepthMm = 13900;
      this.siteData.roadDirection = 'north';
      this.siteData.roadWidthM = 4.0;
      this.siteData.address = '埼玉県坂戸市千代田';
    } else if (sampleKey === 'sample_65_east') {
      this.siteData.siteTsubo = 65.0;
      this.siteData.siteAreaSqm = 214.87;
      this.siteData.siteWidthMm = 13000;
      this.siteData.siteDepthMm = 16500;
      this.siteData.roadDirection = 'east';
      this.siteData.roadWidthM = 5.0;
      this.siteData.address = '埼玉県川越市霞ケ関';
    }

    // サンプルボタンのアクティブ色切替
    document.querySelectorAll('.btn-sample-survey').forEach(b => {
      const isCurrent = (b.getAttribute('data-sample') === sampleKey);
      if (isCurrent) {
        b.classList.add('active');
        b.style.background = '#0284c7';
        b.style.color = '#ffffff';
        b.style.borderColor = '#0284c7';
        b.style.fontWeight = '800';
      } else {
        b.classList.remove('active');
        b.style.background = '#f1f5f9';
        b.style.color = '#334155';
        b.style.borderColor = '#cbd5e1';
        b.style.fontWeight = '700';
      }
    });

    this.siteData.surveyLoaded = true;
    this.siteData.surveyImage = this.generateSampleSurveySvg(this.siteData);

    const prevWrap = document.getElementById('bubble-survey-preview-wrap');
    const prevImg = document.getElementById('bubble-survey-preview-img');
    const prevStatus = document.getElementById('bubble-survey-preview-status');
    const inputAddr = document.getElementById('gate-site-address');

    if (prevWrap && prevImg) {
      prevImg.src = this.siteData.surveyImage;
      prevWrap.style.display = 'block';
      if (prevStatus) {
        prevStatus.textContent = `⚡ Gemini Vision 解析完了: 敷地面積 ${this.siteData.siteAreaSqm}㎡ (${this.siteData.siteTsubo}坪) 検出 (間口${this.siteData.siteWidthMm/1000}m × 奥行${this.siteData.siteDepthMm/1000}m)`;
      }
    }

    if (inputAddr) inputAddr.value = this.siteData.address;
    this.lookupUrbanPlanning(this.siteData.address);
  }

  handleSurveyFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.siteData.surveyLoaded = true;
      this.siteData.surveyImage = e.target.result;

      const prevWrap = document.getElementById('bubble-survey-preview-wrap');
      const prevImg = document.getElementById('bubble-survey-preview-img');
      const prevStatus = document.getElementById('bubble-survey-preview-status');

      if (prevWrap && prevImg) {
        prevImg.src = e.target.result;
        prevWrap.style.display = 'block';
        if (prevStatus) {
          prevStatus.textContent = `⚡ Gemini Vision 解析完了: アップロード測量図から境界線を読取中... (敷地約${this.siteData.siteTsubo}坪)`;
        }
      }
      this.appendAiChatMessage('測量図ファイルを読み込みました！図面の境界寸法と地積（約' + this.siteData.siteTsubo + '坪）を抽出しました。');
    };
    reader.readAsDataURL(file);
  }

  generateSampleSurveySvg(data) {
    const w = 480;
    const h = 240;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <rect width="${w}" height="${h}" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5" />
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" stroke-width="0.8" />
        </pattern>
        <rect width="${w}" height="${h}" fill="url(#grid)" />
        <polygon points="80,40 400,40 400,190 80,190" fill="rgba(224, 242, 254, 0.45)" stroke="#0284c7" stroke-width="3" />
        <circle cx="80" cy="40" r="4" fill="#dc2626" />
        <circle cx="400" cy="40" r="4" fill="#dc2626" />
        <circle cx="400" cy="190" r="4" fill="#dc2626" />
        <circle cx="80" cy="190" r="4" fill="#dc2626" />
        <text x="240" y="32" font-size="11" font-weight="bold" fill="#0369a1" text-anchor="middle">間口: ${(data.siteWidthMm/1000).toFixed(1)}m</text>
        <text x="410" y="115" font-size="11" font-weight="bold" fill="#0369a1" text-anchor="start">奥行: ${(data.siteDepthMm/1000).toFixed(1)}m</text>
        <rect x="0" y="200" width="${w}" height="40" fill="#cbd5e1" opacity="0.6" />
        <text x="240" y="224" font-size="11" font-weight="bold" fill="#334155" text-anchor="middle">🛣️ 公道 (幅員 ${data.roadWidthM}m) ｜ 道路離隔20cm標準</text>
        <text x="240" y="105" font-size="14" font-weight="900" fill="#0f172a" text-anchor="middle">【地積測量図】 地番: 176番</text>
        <text x="240" y="128" font-size="12" font-weight="bold" fill="#059669" text-anchor="middle">地積: ${data.siteAreaSqm}㎡ (${data.siteTsubo}坪)</text>
      </svg>
    `;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  lookupUrbanPlanning(addrStr) {
    if (!addrStr) return;
    this.siteData.address = addrStr;

    let climate = '6地域';
    let zone = '無指定 (市街化調整区域)';
    let kenpei = 60;
    let youseki = 200;
    let fire = '法22条区域外 (指定なし)';

    if (this.urbanDb && this.urbanDb.prefectures && this.urbanDb.prefectures.saitama) {
      const cities = this.urbanDb.prefectures.saitama.cities;
      for (const cKey in cities) {
        const city = cities[cKey];
        if (addrStr.includes(city.name)) {
          climate = city.climateRegion || climate;
          zone = city.defaultZone || zone;
          kenpei = city.kenpei || kenpei;
          youseki = city.youseki || youseki;
          fire = city.fireZone || fire;

          if (city.districts) {
            for (const dKey in city.districts) {
              const dist = city.districts[dKey];
              if (addrStr.includes(dKey) || addrStr.includes(dist.name || '')) {
                zone = dist.zone || zone;
                kenpei = dist.kenpei || kenpei;
                youseki = dist.youseki || youseki;
                fire = dist.fireZone || fire;
                break;
              }
            }
          }
          break;
        }
      }
    }

    this.siteData.climateRegion = climate;
    this.siteData.zone = zone;
    this.siteData.kenpeiRate = kenpei;
    this.siteData.yousekiRate = youseki;
    this.siteData.fireZone = fire;

    this.siteData.maxBuildingAreaTsubo = +(this.siteData.siteTsubo * (kenpei / 100)).toFixed(1);
    this.siteData.maxFloorAreaTsubo = +(this.siteData.siteTsubo * (youseki / 100)).toFixed(1);

    const resAddr = document.getElementById('gate-res-address');
    const resClimate = document.getElementById('gate-res-climate');
    const resZone = document.getElementById('gate-res-zone');
    const resKenpei = document.getElementById('gate-res-kenpei');
    const resYouseki = document.getElementById('gate-res-youseki');
    const resFire = document.getElementById('gate-res-fire');
    const resTsubo = document.getElementById('gate-res-tsubo');
    const resMaxBuild = document.getElementById('gate-res-max-build');

    if (resAddr) resAddr.textContent = addrStr;
    if (resClimate) resClimate.textContent = climate;
    if (resZone) resZone.textContent = zone;
    if (resKenpei) resKenpei.textContent = `${kenpei}%`;
    if (resYouseki) resYouseki.textContent = `${youseki}%`;
    if (resFire) resFire.textContent = fire;
    if (resTsubo) resTsubo.textContent = `${this.siteData.siteTsubo} 坪 (${this.siteData.siteAreaSqm}㎡)`;
    if (resMaxBuild) {
      const maxSqm = +(this.siteData.maxBuildingAreaTsubo * 3.30578).toFixed(1);
      resMaxBuild.textContent = `${this.siteData.maxBuildingAreaTsubo} 坪 (${maxSqm}㎡)`;
    }
  }

  // Geminiヒアリング対話チャット
  renderChatChips() {
    const chipsBox = document.getElementById('gate-chat-chips');
    if (!chipsBox) return;

    if (this.chatStep === 1) {
      chipsBox.innerHTML = `
        <button type="button" class="bubble-chip-btn" data-action="parking_needed">🚗 車庫・駐車場が必要（車を保有 / 来客用）</button>
        <button type="button" class="bubble-chip-btn" data-action="parking_none">🚶 車庫は不要（車なし・建物や南庭を最大化）</button>
      `;
    } else if (this.chatStep === 2) {
      chipsBox.innerHTML = `
        <button type="button" class="bubble-chip-btn" data-usage="daily">🚗 毎日乗る（通勤・送り迎え・買い物 ｜ 並列駐車推奨）</button>
        <button type="button" class="bubble-chip-btn" data-usage="weekend">🚙 休日や買い物時だけ（週末利用 ｜ 縦列や奥配置も可）</button>
      `;
    } else if (this.chatStep === 3) {
      chipsBox.innerHTML = `
        <button type="button" class="bubble-chip-btn" data-road="south">☀️ 南側道路 (日当たり重視・メイン出入り)</button>
        <button type="button" class="bubble-chip-btn" data-road="north">🌲 北側道路 (落ち着いた外観・南庭確保)</button>
        <button type="button" class="bubble-chip-btn" data-road="corner_south_east">🔄 2方向道路・角地 (出入りと日当たりを分ける)</button>
        <button type="button" class="bubble-chip-btn" data-road="east">🌅 東側道路</button>
        <button type="button" class="bubble-chip-btn" data-road="west">🌄 西側道路</button>
      `;
    } else if (this.chatStep === 4) {
      chipsBox.innerHTML = `
        <button type="button" class="bubble-chip-btn" data-margin="650">📐 隣地離隔 65cm (民法50cm+柱壁厚14cm標準・メンテナンス安心)</button>
        <button type="button" class="bubble-chip-btn" data-margin="500">📐 隣地離隔 50cm (民法基準ジャスト)</button>
        <button type="button" class="bubble-chip-btn" data-margin="200">📐 隣地離隔 20cm (狭小地ギリギリ・建物幅を最大化)</button>
      `;
    } else if (this.chatStep === 5) {
      chipsBox.innerHTML = `
        <button type="button" class="bubble-chip-btn" data-ldk-floor="1">🛋️ 1階リビング（庭やテラスとつながる王道・1FにLDK・2Fに寝室）</button>
        <button type="button" class="bubble-chip-btn" data-ldk-floor="2">☀️ 2階大開口リビング（視線カット・抜群の採光と勾配天井・1Fに主寝室や水回り）</button>
      `;
    } else if (this.chatStep === 6) {
      chipsBox.innerHTML = `
        <button type="button" class="bubble-chip-btn" data-stair-style="hall">🚪 玄関ホール階段（来客・帰宅動線と生活動線をすっきり分離）</button>
        <button type="button" class="bubble-chip-btn" data-stair-style="living">🛋️ リビングイン階段（LDK内に配置・家族が自然に顔を合わせる吹き抜け連動）</button>
      `;
    } else {
      chipsBox.innerHTML = `
        <div style="font-size: 0.82rem; color: #166534; font-weight: 800; padding: 6px 0;">
          ✅ すべてのヒアリングが完了しました！ご希望のLDK階層・階段動線・敷地離隔に合わせてBubble Planへ進みます。
        </div>
      `;
    }

    chipsBox.querySelectorAll('.bubble-chip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleChatChipClick(e.currentTarget));
    });
  }

  handleChatChipClick(btn) {
    const chatText = btn.textContent;
    this.appendUserChatMessage(chatText);

    if (this.chatStep === 1) {
      const action = btn.getAttribute('data-action');
      if (action === 'parking_needed') {
        this.chatStep = 2;
        this.appendAiChatMessage('承知しました！お車の利用頻度はどれくらいですか？');
      } else {
        this.carNodes = []; // 車なし
        this.chatStep = 3;
        this.appendAiChatMessage('💡 <strong>車庫不要ですね！</strong> 敷地をフルに建物や南庭に充てられる大きなメリットがあります！続いて、敷地の接道方位を教えてください。');
      }
      this.renderChatChips();
    } else if (this.chatStep === 2) {
      const usage = btn.getAttribute('data-usage') || 'daily';
      if (usage === 'daily') {
        this.appendAiChatMessage('毎日利用されるなら、出し入れしやすい道路側・並列配置が快適です！続いて接道道路を教えてください。');
      } else {
        this.appendAiChatMessage('週末利用なら、縦列駐車や敷地端にして間口を広くLDKに充てる設計も可能です！続いて接道道路を教えてください。');
      }
      this.chatStep = 3;
      this.renderChatChips();
    } else if (this.chatStep === 3) {
      const road = btn.getAttribute('data-road') || 'south';
      this.siteData.roadDirection = road.includes('corner') ? 'south' : road;
      this.appendAiChatMessage('接道状況を確認しました。道路側は標準20cmまで寄せられます。隣地境界の離隔距離（民法50cm・狭小地20cm許容）を選択してください。');
      this.chatStep = 4;
      this.renderChatChips();
    } else if (this.chatStep === 4) {
      const margin = parseInt(btn.getAttribute('data-margin')) || 650;
      this.siteData.boundaryMarginMm = margin;
      this.appendAiChatMessage('離隔距離を設定しました。続いて、<strong>LDKの階層スタイル（1階リビング vs 2階リビング）</strong>のご希望を教えてください。');
      this.chatStep = 5;
      this.renderChatChips();
    } else if (this.chatStep === 5) {
      const ldkFloor = parseInt(btn.getAttribute('data-ldk-floor')) || 1;
      this.siteData.ldkFloor = ldkFloor;
      if (ldkFloor === 2) {
        this.appendAiChatMessage('☀️ <strong>2階リビングプランですね！</strong> 周囲の視線を気にせず、勾配天井や大開口で日当たり抜群の心地よい大空間がつくれます。1階は主寝室や水回り中心の落ち着いた構成になります。<br>最後に、<strong>階段の位置（玄関ホール階段 vs リビングイン階段）</strong>のスタイルを選択してください。');
      } else {
        this.appendAiChatMessage('🛋️ <strong>1階リビングプランですね！</strong> 南庭やウッドデッキとダイレクトにつながる開放的な大空間になります。<br>最後に、<strong>階段の位置（玄関ホール階段 vs リビングイン階段）</strong>のスタイルを選択してください。');
      }
      this.chatStep = 6;
      this.renderChatChips();
    } else if (this.chatStep === 6) {
      const stairStyle = btn.getAttribute('data-stair-style') || 'hall';
      this.siteData.stairStyle = stairStyle;
      if (stairStyle === 'living') {
        this.appendAiChatMessage('🛋️ <strong>リビングイン階段</strong>で承りました！家族が自然と顔を合わせ、吹き抜けとも美しく調和します。<br>条件がすべて揃いました！「✨ 確定してBubble Planへ進む」をクリックしてください！');
      } else {
        this.appendAiChatMessage('🚪 <strong>玄関ホール階段</strong>で承りました！来客動線と家族の動線をすっきりと分けた落ち着いたプランになります。<br>条件がすべて揃いました！「✨ 確定してBubble Planへ進む」をクリックしてください！');
      }
      this.chatStep = 7;
      this.renderChatChips();

      // ヒアリング完了時に確定ボタンを活性化
      const btnConfirm = document.getElementById('btn-gate-confirm-and-start');
      if (btnConfirm) {
        btnConfirm.disabled = false;
        btnConfirm.style.background = 'linear-gradient(135deg, #059669, #10b981)';
        btnConfirm.style.color = '#ffffff';
        btnConfirm.style.cursor = 'pointer';
        btnConfirm.style.opacity = '1';
        btnConfirm.style.boxShadow = '0 4px 15px rgba(5,150,105,0.3)';
        btnConfirm.textContent = '✨ 敷地境界・ヒアリング条件を確定してBubble Planへ進む ➔';
      }
    }
  }

  appendAiChatMessage(text) {
    const history = document.getElementById('gate-chat-history');
    if (!history) return;
    const bubble = document.createElement('div');
    bubble.className = 'bubble-gate-chat-bubble ai';
    bubble.innerHTML = text;
    history.appendChild(bubble);
    history.scrollTop = history.scrollHeight;
  }

  appendUserChatMessage(text) {
    const history = document.getElementById('gate-chat-history');
    if (!history) return;
    const bubble = document.createElement('div');
    bubble.className = 'bubble-gate-chat-bubble user';
    bubble.textContent = text;
    history.appendChild(bubble);
    history.scrollTop = history.scrollHeight;
  }


  // ==========================================
  // たたき台プラン（AI検索323プランから引き継ぎ）の管理
  // ==========================================
  setTatakiPlan(plan) {
    if (!plan) return;
    this.pendingTatakiPlan = plan;

    // ゲート画面にたたき台引き継ぎ案内バナーを表示
    const banner = document.getElementById('bubble-gate-tataki-banner');
    const titleEl = document.getElementById('bubble-gate-tataki-title');
    if (banner && titleEl) {
      titleEl.textContent = `【${plan.title}（延床 ${plan.total_tsubo}坪 / ${plan.floor_count}階建て）】`;
      banner.style.display = 'block';
    }
  }

  applyTatakiPlanToWorkspace(plan) {
    if (!plan) return;
    this.nodes = [];
    this.links = [];

    const floorCount = plan.floor_count || 2;
    const ldkTatami = plan.ldk_tatami || 16.0;
    const box = this.baseBuildingBox;
    const cx = (box.minX + box.maxX) / 2;
    const cy = (box.minY + box.maxY) / 2;

    // --- 1階ノード群 ---
    // 1. 玄関ポーチ & 玄関・土間
    this.nodes.push({
      id: 'entrance_porch',
      name: '玄関ポーチ',
      floor: 1,
      tatami: 1.5,
      category: 'entrance',
      color: '#38bdf8',
      x: cx - 60,
      y: box.maxY - 40,
      vx: 0, vy: 0,
      isFixed: false, isOutdoor: true
    });
    this.nodes.push({
      id: 'entrance',
      name: '玄関・土間SIC',
      floor: 1,
      tatami: 2.5,
      category: 'entrance',
      color: '#0284c7',
      x: cx - 60,
      y: box.maxY - 90,
      vx: 0, vy: 0,
      isFixed: false
    });

    // 2. LDK（プランの帖数を反映）
    this.nodes.push({
      id: 'ldk',
      name: `LDK (${ldkTatami}帖)`,
      floor: 1,
      tatami: ldkTatami,
      category: 'ldk',
      color: '#f59e0b',
      x: cx + 30,
      y: cy + 20,
      vx: 0, vy: 0,
      isFixed: false
    });

    // 3. 階段（2階建て以上の場合）
    if (floorCount >= 2) {
      this.nodes.push({
        id: 'stairs_1f',
        name: '階段室 (1F)',
        floor: 1,
        tatami: 2.0,
        category: 'stairs',
        color: '#8b5cf6',
        x: cx - 60,
        y: cy - 20,
        vx: 0, vy: 0,
        isFixed: false
      });
      // 2F階段 (下階と同座標で初期配置しFIX拘束)
      this.nodes.push({
        id: 'stairs_2f',
        name: '階段室 (2F)',
        floor: 2,
        tatami: 2.0,
        category: 'stairs',
        color: '#8b5cf6',
        x: cx - 60,
        y: cy - 20,
        vx: 0, vy: 0,
        isFixed: true
      });
    }

    // 4. 水回り（洗面・脱衣・浴室・トイレ）
    this.nodes.push({
      id: 'washroom',
      name: '洗面脱衣室',
      floor: 1,
      tatami: 2.0,
      category: 'sanitary',
      color: '#06b6d4',
      x: cx - 30,
      y: box.minY + 60,
      vx: 0, vy: 0,
      isFixed: false
    });
    this.nodes.push({
      id: 'bath',
      name: 'システムバス(1坪)',
      floor: 1,
      tatami: 2.0,
      category: 'sanitary',
      color: '#0284c7',
      x: cx - 90,
      y: box.minY + 60,
      vx: 0, vy: 0,
      isFixed: false
    });
    this.nodes.push({
      id: 'toilet_1f',
      name: '1Fトイレ',
      floor: 1,
      tatami: 1.0,
      category: 'sanitary',
      color: '#a855f7',
      x: cx - 120,
      y: box.minY + 60,
      vx: 0, vy: 0,
      isFixed: false
    });

    // 5. 和室/畳スペース（プランにある場合）
    if ((plan.rooms || '').includes('和') || (plan.tags || []).includes('和室')) {
      this.nodes.push({
        id: 'tatami_room',
        name: '小上がり和室',
        floor: 1,
        tatami: 4.5,
        category: 'japanese',
        color: '#84cc16',
        x: cx + 110,
        y: cy + 20,
        vx: 0, vy: 0,
        isFixed: false
      });
    }

    // --- 2階ノード群（2階建て以上の場合） ---
    if (floorCount >= 2) {
      // 主寝室
      this.nodes.push({
        id: 'main_bedroom',
        name: '主寝室',
        floor: 2,
        tatami: 7.5,
        category: 'private',
        color: '#6366f1',
        x: cx + 40,
        y: box.minY + 60,
        vx: 0, vy: 0,
        isFixed: false
      });
      // WIC (主寝室に内包)
      this.nodes.push({
        id: 'wic_master',
        name: 'WIC',
        floor: 2,
        tatami: 3.0,
        category: 'storage',
        isWic: true,
        color: '#94a3b8',
        x: cx + 40,
        y: box.minY + 60,
        vx: 0, vy: 0,
        isFixed: false
      });
      // 子ども部屋 / 洋室A & B
      this.nodes.push({
        id: 'room_a',
        name: '洋室 A',
        floor: 2,
        tatami: 5.0,
        category: 'private',
        color: '#3b82f6',
        x: cx - 30,
        y: box.maxY - 70,
        vx: 0, vy: 0,
        isFixed: false
      });
      this.nodes.push({
        id: 'room_b',
        name: '洋室 B',
        floor: 2,
        tatami: 5.0,
        category: 'private',
        color: '#3b82f6',
        x: cx + 50,
        y: box.maxY - 70,
        vx: 0, vy: 0,
        isFixed: false
      });
      // 2Fトイレ
      this.nodes.push({
        id: 'toilet_2f',
        name: '2Fトイレ',
        floor: 2,
        tatami: 1.0,
        category: 'sanitary',
        color: '#a855f7',
        x: cx - 110,
        y: cy,
        vx: 0, vy: 0,
        isFixed: false
      });
    }

    // ノード寸法の初期計算
    for (const n of this.nodes) {
      this.calculateRectDimensions(n);
    }
    this.clampNodesToBuildingBox();
    this.detectInnerCornersAndMerged();
    this.currentFloor = 1;

    // ガイドバッジの表示
    const badge = document.querySelector('#bubble-plan-canvas-wrap div');
    if (badge) {
      badge.innerHTML = `🎈 <b>参考プラン「${plan.title}」をたたき台として展開しました！</b> ドラッグして自由自在にアレンジしてください`;
      badge.style.background = 'rgba(217, 119, 6, 0.95)';
      badge.style.color = '#ffffff';
      setTimeout(() => {
        badge.innerHTML = '👆 建物の大枠（青色破線）の中で部屋・設備ブロックをドラッグ！敷地境界離隔65cm・駐車場を遵守';
        badge.style.background = 'rgba(15, 23, 42, 0.88)';
        badge.style.color = '#38bdf8';
      }, 5000);
    }
  }

  proceedToMainWorkspace() {
    const gateWrap = document.getElementById('bubble-site-gate-wrap');
    const mainWrap = document.getElementById('bubble-main-workspace');

    if (gateWrap) gateWrap.style.display = 'none';
    if (mainWrap) mainWrap.style.display = 'block';

    this.calculateBuildingBoundingBoxPrecise();
    this.resizeCanvas();

    // デフォルトで普通車を1台配置（車庫希望だった場合）
    if (this.carNodes.length === 0 && this.chatStep >= 2) {
      this.addCar('standard');
    }

    if (this.pendingTatakiPlan) {
      this.applyTatakiPlanToWorkspace(this.pendingTatakiPlan);
      this.pendingTatakiPlan = null; // 適用後クリア
    } else {
      this.applyGoldenPattern('kaiyu');
    }
    this.saveSiteToCarte();

    if (!this.animationFrameId) {
      this.startSimulationLoop();
    }
    this.updateMetrics();
  }

  reopenGateSection() {
    const gateWrap = document.getElementById('bubble-site-gate-wrap');
    const mainWrap = document.getElementById('bubble-main-workspace');
    if (gateWrap) gateWrap.style.display = 'block';
    if (mainWrap) mainWrap.style.display = 'none';
  }

  // ==========================================
  // 3. 車両ブロック（Car Nodes）の管理 ＆ 自由配置
  // ==========================================
  addCar(type = 'standard') {
    const id = 'car_' + Date.now() + '_' + Math.floor(Math.random() * 100);
    let name = '🚗 普通車';
    let wMm = 2300;
    let hMm = 5000;
    let isBuiltin = false;

    if (type === 'compact') {
      name = '🚙 軽自動車';
      wMm = 2200; hMm = 3600;
    } else if (type === 'large') {
      name = '🚐 大型SUV';
      wMm = 2500; hMm = 5800;
    } else if (type === 'builtin') {
      name = '🏠 ビルトイン車庫';
      wMm = 2600; hMm = 5500;
      isBuiltin = true;
    }

    // 敷地内の道路側手前に初期配置
    const road = this.siteData.roadDirection;
    const { minX, maxX, minY, maxY, pxPerMm } = this.baseBuildingBox;
    const cx = (minX + maxX) / 2 + (this.carNodes.length * 50 - 25);
    let cy = maxY - 60;
    if (road === 'north') cy = minY + 60;
    else if (road === 'east') cy = (minY + maxY) / 2;
    else if (road === 'west') cy = (minY + maxY) / 2;

    const car = {
      id,
      name,
      type,
      wMm,
      hMm,
      isVertical: (road === 'south' || road === 'north'), // 南北道路なら縦置きが標準
      isBuiltin,
      x: cx,
      y: cy,
      marginMm: 200 // 車からも20cmの離隔マージン
    };

    this.calculateCarDimensions(car);
    this.carNodes.push(car);
    this.selectedItem = car;
    this.selectedType = 'car';
    this.updateInspectorForCar(car);
    this.updateCarCountBadge();
    this.calculateBuildingBoundingBoxPrecise();
    this.updateMetrics();
  }

  calculateCarDimensions(car) {
    const pxPerMm = this.baseBuildingBox.pxPerMm || 0.03;
    const effW = car.isVertical ? car.wMm : car.hMm;
    const effH = car.isVertical ? car.hMm : car.wMm;

    car.w = Math.round(effW * pxPerMm);
    car.h = Math.round(effH * pxPerMm);
    car.marginPx = Math.round((car.marginMm || 200) * pxPerMm);
  }

  deleteCar(id) {
    this.carNodes = this.carNodes.filter(c => c.id !== id);
    this.selectedItem = null;
    this.selectedType = 'none';
    this.updateNodeInspectPanel(null);
    this.updateCarCountBadge();
    this.calculateBuildingBoundingBoxPrecise();
    this.updateMetrics();
  }

  rotateCar(id) {
    const car = this.carNodes.find(c => c.id === id);
    if (!car) return;
    car.isVertical = !car.isVertical;
    this.calculateCarDimensions(car);
    this.calculateBuildingBoundingBoxPrecise();
    this.updateInspectorForCar(car);
  }

  toggleBuiltinCar(id) {
    const car = this.carNodes.find(c => c.id === id);
    if (!car) return;
    car.isBuiltin = !car.isBuiltin;
    car.name = car.isBuiltin ? '🏠 ビルトイン車庫' : (car.type === 'compact' ? '🚙 軽自動車' : (car.type === 'large' ? '🚐 大型SUV' : '🚗 普通車'));
    this.calculateBuildingBoundingBoxPrecise();
    this.updateInspectorForCar(car);
  }

  updateCarCountBadge() {
    const badge = document.getElementById('bubble-car-count-badge');
    if (badge) badge.textContent = `${this.carNodes.length}台 配置中`;
  }

  // ==========================================
  // 4. ミリ単位幾何計算 ＆ 凸凹建物外形図（車の位置で切り欠き）
  // ==========================================
  calculateBuildingBoundingBoxPrecise() {
    const cw = this.width || 800;
    const ch = this.height || 520;

    const siteWMm = this.siteData.siteWidthMm;
    const siteDMm = this.siteData.siteDepthMm;
    const boundaryMarginMm = this.siteData.boundaryMarginMm; // 隣地離隔 (650〜200mm)
    const roadMarginMm = this.siteData.roadMarginMm || 200;  // 道路側離隔は標準20cm (200mm)

    const road = this.siteData.roadDirection;

    const canvasPadX = 70;
    const canvasPadY = 50;
    const availW = cw - canvasPadX * 2;
    const availH = ch - canvasPadY * 2;

    const scaleX = availW / siteWMm;
    const scaleY = availH / siteDMm;
    const pxPerMm = Math.min(scaleX, scaleY);

    const siteCanvasW = Math.round(siteWMm * pxPerMm);
    const siteCanvasH = Math.round(siteDMm * pxPerMm);
    const siteLeft = Math.round((cw - siteCanvasW) / 2);
    const siteTop = Math.round((ch - siteCanvasH) / 2);

    this.siteBox = {
      minX: siteLeft,
      maxX: siteLeft + siteCanvasW,
      minY: siteTop,
      maxY: siteTop + siteCanvasH
    };

    // 基本建築可能境界（隣地離隔 ＆ 道路側20cm）
    let buildLeftMm = boundaryMarginMm;
    let buildRightMm = siteWMm - boundaryMarginMm;
    let buildTopMm = boundaryMarginMm;
    let buildBottomMm = siteDMm - boundaryMarginMm;

    if (road === 'south') buildBottomMm = siteDMm - roadMarginMm;
    else if (road === 'north') buildTopMm = roadMarginMm;
    else if (road === 'east') buildRightMm = siteWMm - roadMarginMm;
    else if (road === 'west') buildLeftMm = roadMarginMm;

    const buildWMm = Math.max(3640, buildRightMm - buildLeftMm);
    const buildDMm = Math.max(3640, buildBottomMm - buildTopMm);

    const minX = Math.round(siteLeft + buildLeftMm * pxPerMm);
    const maxX = Math.round(siteLeft + buildRightMm * pxPerMm);
    const minY = Math.round(siteTop + buildTopMm * pxPerMm);
    const maxY = Math.round(siteTop + buildBottomMm * pxPerMm);

    this.baseBuildingBox = {
      minX, maxX, minY, maxY,
      widthMm: buildWMm, depthMm: buildDMm, pxPerMm
    };

    // 各車のピクセル寸法を再計算し、敷地内にクランプ
    for (const car of this.carNodes) {
      this.calculateCarDimensions(car);
      const halfW = car.w / 2;
      const halfH = car.h / 2;
      car.x = Math.max(siteLeft + halfW, Math.min(siteLeft + siteCanvasW - halfW, car.x));
      car.y = Math.max(siteTop + halfH, Math.min(siteTop + siteCanvasH - halfH, car.y));
    }

    // すべての部屋ブロックのピクセル寸法を敷地スケール（pxPerMm）で完全再同期
    for (const node of this.nodes) {
      this.calculateRectDimensions(node);
    }
  }

  openBubbleStudio() {
    const btnSearch = document.getElementById('btn-fp-mode-search');
    const btnBubble = document.getElementById('btn-fp-mode-bubble');
    const secSearch = document.getElementById('floorplan-search-section-wrap');
    const secBubble = document.getElementById('floorplan-bubble-studio-wrap');

    if (btnSearch) {
      btnSearch.classList.remove('btn-primary');
      btnSearch.style.background = '#e0f2fe';
      btnSearch.style.color = '#0284c7';
    }
    if (btnBubble) {
      btnBubble.classList.add('btn-primary');
      btnBubble.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
      btnBubble.style.color = '#0f172a';
    }
    if (secSearch) secSearch.style.display = 'none';
    if (secBubble) secBubble.style.display = 'block';

    this.resizeCanvas();
    this.calculateBuildingBoundingBoxPrecise();
    this.updateMetrics();
  }

  openSearchStudio() {
    const btnSearch = document.getElementById('btn-fp-mode-search');
    const btnBubble = document.getElementById('btn-fp-mode-bubble');
    const secSearch = document.getElementById('floorplan-search-section-wrap');
    const secBubble = document.getElementById('floorplan-bubble-studio-wrap');

    if (btnSearch) {
      btnSearch.classList.add('btn-primary');
      btnSearch.style.background = 'linear-gradient(135deg, #0284c7, #38bdf8)';
      btnSearch.style.color = '#fff';
    }
    if (btnBubble) {
      btnBubble.classList.remove('btn-primary');
      btnBubble.style.background = '#fef3c7';
      btnBubble.style.color = '#b45309';
    }
    if (secSearch) secSearch.style.display = 'block';
    if (secBubble) secBubble.style.display = 'none';
  }

  // ==========================================
  // 5. イベントバインド
  // ==========================================
  bindEvents() {
    // モード切替ボタン (① AI検索 vs ② Bubble Plan)
    const btnSearch = document.getElementById('btn-fp-mode-search');
    const btnBubble = document.getElementById('btn-fp-mode-bubble');
    if (btnSearch) btnSearch.addEventListener('click', () => this.openSearchStudio());
    if (btnBubble) btnBubble.addEventListener('click', () => this.openBubbleStudio());

    document.querySelectorAll('.bubble-insulation-tier').forEach(tierEl => {
      tierEl.addEventListener('click', (e) => this.setInsulationTier(e.currentTarget.getAttribute('data-tier')));
    });

    document.querySelectorAll('.bubble-floor-tab').forEach(btn => {
      btn.addEventListener('click', (e) => this.setFloor(parseInt(e.currentTarget.getAttribute('data-floor'))));
    });

    // 表示モード切替（バブル ⇄ 矩形）
    const btnBubbleView = document.getElementById('btn-mode-bubble-view');
    const btnRectView = document.getElementById('btn-mode-rect-view');
    if (btnBubbleView && btnRectView) {
      btnBubbleView.addEventListener('click', () => this.setRenderMode('bubble'));
      btnRectView.addEventListener('click', () => this.setRenderMode('rect'));
    }

    // 🪄 建築グリッド自動整形ボタン
    const btnAutoGrid = document.getElementById('btn-auto-grid-align');
    if (btnAutoGrid) {
      btnAutoGrid.addEventListener('click', () => this.autoAlignToGrid());
    }

    const patternSelect = document.getElementById('bubble-pattern-select');
    if (patternSelect) {
      patternSelect.addEventListener('change', (e) => this.applyGoldenPattern(e.target.value));
    }

    // 車ブロック追加ボタン (1台ずつ並べる)
    document.querySelectorAll('.btn-add-car').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const carType = e.currentTarget.getAttribute('data-car');
        this.addCar(carType);
      });
    });

    // 車操作インスペクターボタン
    const btnCarRotate = document.getElementById('btn-car-rotate');
    const btnCarBuiltin = document.getElementById('btn-car-builtin-toggle');
    const btnCarDelete = document.getElementById('btn-car-delete');

    if (btnCarRotate) {
      btnCarRotate.addEventListener('click', () => {
        if (this.selectedItem && this.selectedType === 'car') this.rotateCar(this.selectedItem.id);
      });
    }
    if (btnCarBuiltin) {
      btnCarBuiltin.addEventListener('click', () => {
        if (this.selectedItem && this.selectedType === 'car') this.toggleBuiltinCar(this.selectedItem.id);
      });
    }
    if (btnCarDelete) {
      btnCarDelete.addEventListener('click', () => {
        if (this.selectedItem && this.selectedType === 'car') this.deleteCar(this.selectedItem.id);
      });
    }

    // 部屋ブロック追加ボタン
    document.querySelectorAll('.btn-add-bubble').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.currentTarget.getAttribute('data-type');
        const name = e.currentTarget.getAttribute('data-name');
        const tatami = parseFloat(e.currentTarget.getAttribute('data-tatami')) || 4.5;
        const color = e.currentTarget.getAttribute('data-color') || '#38bdf8';
        const floorAttr = e.currentTarget.getAttribute('data-floor');
        const floor = floorAttr ? parseInt(floorAttr) : null;
        const wMm = parseFloat(e.currentTarget.getAttribute('data-wmm')) || null;
        const hMm = parseFloat(e.currentTarget.getAttribute('data-hmm')) || null;
        this.addRectRoom(type, name, tatami, color, floor, wMm, hMm);
      });
    });

    // 自由な部屋名・帖数での追加ボタン
    const btnAddCustom = document.getElementById('btn-add-custom-room');
    if (btnAddCustom) {
      btnAddCustom.addEventListener('click', () => {
        const nameInput = document.getElementById('custom-room-name');
        const tatamiInput = document.getElementById('custom-room-tatami');
        const name = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : 'フリースペース';
        const tatami = parseFloat(tatamiInput ? tatamiInput.value : 3.0) || 3.0;
        this.addRectRoom('custom', name, tatami, '#38bdf8');
        if (nameInput) nameInput.value = '';
      });
    }

    const btnTransfer = document.getElementById('btn-transfer-bubble-to-cad');
    if (btnTransfer) btnTransfer.addEventListener('click', () => this.transferToCadModeller());

    const btnSaveCarte = document.getElementById('btn-save-bubble-to-carte');
    if (btnSaveCarte) btnSaveCarte.addEventListener('click', () => this.saveCurrentPlanToCarte());

    // LDKインナーコーナー追加ボタン (書斎・家事・兼用・スタディ・ヌック)
    document.querySelectorAll('.btn-add-inner-corner').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.currentTarget.getAttribute('data-type');
        const name = e.currentTarget.getAttribute('data-name');
        const tatami = parseFloat(e.currentTarget.getAttribute('data-tatami')) || 1.5;
        const color = e.currentTarget.getAttribute('data-color') || '#f59e0b';
        const wMm = parseFloat(e.currentTarget.getAttribute('data-wmm')) || 1365;
        const hMm = parseFloat(e.currentTarget.getAttribute('data-hmm')) || 1820;
        this.addInnerCorner(type, name, tatami, color, wMm, hMm);
      });
    });

    // 📌 位置FIX（ピン留め・完全固定）トグルボタン
    const btnNodeFix = document.getElementById('btn-node-fix-toggle');
    if (btnNodeFix) {
      btnNodeFix.addEventListener('click', () => {
        if (this.selectedItem && this.selectedType === 'node') {
          this.toggleNodeFixed(this.selectedItem);
        }
      });
    }

    const btnCarFix = document.getElementById('btn-car-fix-toggle');
    if (btnCarFix) {
      btnCarFix.addEventListener('click', () => {
        if (this.selectedItem && this.selectedType === 'car') {
          this.toggleCarFixed(this.selectedItem);
        }
      });
    }

    // 🧭 5大優先決定ステップナビゲーションのクリックイベント
    document.querySelectorAll('.bubble-step-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const step = parseInt(e.currentTarget.getAttribute('data-step')) || 1;
        this.handleStepNavClick(step);
      });
    });

    // 💾 途中保存 ＆ 📂 続きを復元 ボタンの配線
    const btnSaveProgress = document.getElementById('btn-save-plan-progress');
    const btnRestoreProgress = document.getElementById('btn-restore-plan-progress');
    const btnBannerYes = document.getElementById('btn-banner-restore-yes');
    const btnBannerDismiss = document.getElementById('btn-banner-restore-dismiss');

    if (btnSaveProgress) btnSaveProgress.addEventListener('click', () => this.savePlanProgress(false));
    if (btnRestoreProgress) btnRestoreProgress.addEventListener('click', () => this.restorePlanProgress());
    if (btnBannerYes) btnBannerYes.addEventListener('click', () => this.restorePlanProgress());
    if (btnBannerDismiss) {
      btnBannerDismiss.addEventListener('click', () => {
        const b = document.getElementById('bubble-saved-progress-banner');
        if (b) b.style.display = 'none';
      });
    }

    // 🛁 住宅設備機器パレットのワンタップ直接配置ボタン群
    document.querySelectorAll('.btn-place-equipment').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.currentTarget.getAttribute('data-type');
        const preset = e.currentTarget.getAttribute('data-preset');
        this.placeEquipment(type, preset);
      });
    });

    // 🚪 WIC (ウォークインクローゼット) 追加ボタン群 (主寝室・洋室への内包対応)
    document.querySelectorAll('.btn-add-wic-room').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.currentTarget.getAttribute('data-type') || 'wic';
        const name = e.currentTarget.getAttribute('data-name') || 'WIC';
        const tatami = parseFloat(e.currentTarget.getAttribute('data-tatami')) || 3.0;
        const color = e.currentTarget.getAttribute('data-color') || '#94a3b8';
        const wMm = parseFloat(e.currentTarget.getAttribute('data-wmm')) || 1820;
        const hMm = parseFloat(e.currentTarget.getAttribute('data-hmm')) || 2730;
        this.addWicRoom(type, name, tatami, color, wMm, hMm);
      });
    });

    this.setupModals();
    this.setupCanvasInteractions();
    this.setupInspectorControls();

    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.calculateBuildingBoundingBoxPrecise();
    });
  }

  setRenderMode(mode) {
    this.renderMode = mode;
    const btnBubbleView = document.getElementById('btn-mode-bubble-view');
    const btnRectView = document.getElementById('btn-mode-rect-view');
    if (btnBubbleView && btnRectView) {
      if (mode === 'bubble') {
        btnBubbleView.classList.add('active');
        btnBubbleView.style.background = '#0284c7';
        btnBubbleView.style.color = '#fff';
        btnRectView.classList.remove('active');
        btnRectView.style.background = 'transparent';
        btnRectView.style.color = '#475569';
      } else {
        btnRectView.classList.add('active');
        btnRectView.style.background = '#0284c7';
        btnRectView.style.color = '#fff';
        btnBubbleView.classList.remove('active');
        btnBubbleView.style.background = 'transparent';
        btnBubbleView.style.color = '#475569';
      }
    }
  }

  // 🪄 建築グリッド自動整形（重なり合ったバブルの広さと位置を汲み取り、227.5mmモジュールの四角形に整流）
  autoAlignToGrid() {
    const pxPerMm = (this.baseBuildingBox && this.baseBuildingBox.pxPerMm) ? this.baseBuildingBox.pxPerMm : 0.032;
    const gridMm = 227.5;
    const gridPx = gridMm * pxPerMm;

    // 現在のフロアの全ノード
    const currentNodes = this.nodes.filter(n => n.floor === this.currentFloor);
    if (currentNodes.length === 0) return;

    // 1. 各ノードの寸法を227.5mm単位に完全正規化
    currentNodes.forEach(node => {
      node.wMm = Math.max(455, Math.round((node.wMm || 1820) / gridMm) * gridMm);
      node.hMm = Math.max(455, Math.round((node.hMm || 1820) / gridMm) * gridMm);

      // 階段寸法の下限チェック
      const stairsCheck = this.validateStairsMinDimensions(node, node.wMm, node.hMm);
      node.wMm = stairsCheck.wMm;
      node.hMm = stairsCheck.hMm;

      node.w = Math.max(18, Math.round(node.wMm * pxPerMm));
      node.h = Math.max(18, Math.round(node.hMm * pxPerMm));
      node.radius = Math.round(Math.hypot(node.w, node.h) / 2);

      // グリッド座標にスナップ
      const originX = this.baseBuildingBox.minX;
      const originY = this.baseBuildingBox.minY;
      const snappedGridX = Math.round((node.x - originX) / gridPx);
      const snappedGridY = Math.round((node.y - originY) / gridPx);
      node.x = originX + snappedGridX * gridPx;
      node.y = originY + snappedGridY * gridPx;
      node.vx = 0;
      node.vy = 0;
    });

    // 2. 階段の位置・形状同期（系統ごとに下階形状追従）
    const stairs = currentNodes.filter(n => this.isStairs(n));
    for (const st of stairs) {
      this.syncStairsPosition(st);
      this.syncStairsDimensions(st);
    }

    // 3. 建物外郭枠・車庫拘束
    this.clampNodesToBuildingBox();

    // 4. 自動整形完了後、矩形設計ブロック表示に切り替えてユーザーに視認させる
    this.setRenderMode('rect');
    this.updateMetrics();

    // 通知メッセージの表示
    const badge = document.querySelector('#bubble-plan-canvas-wrap div');
    if (badge) {
      const origText = badge.innerHTML;
      badge.innerHTML = `🪄 <b>建築グリッド（227.5mmモジュール）へ自動整形完了！</b> 矩形設計ブロックとして整流されました`;
      badge.style.background = 'rgba(2, 132, 199, 0.95)';
      badge.style.color = '#ffffff';
      setTimeout(() => {
        badge.innerHTML = origText;
        badge.style.background = 'rgba(15, 23, 42, 0.88)';
        badge.style.color = '#38bdf8';
      }, 3000);
    }
  }

  // ==========================================
  // 6. 直線矩形部屋ブロックの生成・計算 (トイレ柔軟伸縮・階段下限厳守)
  // ==========================================
  calculateRectDimensions(node) {
    if (!node.wMm || !node.hMm) {
      if (node.name.includes('階段') || node.id.includes('stair') || node.category === 'stairs') {
        const flightId = this.getStairFlightId(node);
        const lowerPair = this.nodes.find(n => this.isStairs(n) && n.floor < node.floor && this.getStairFlightId(n) === flightId);
        if (lowerPair && lowerPair.wMm && lowerPair.hMm) {
          // ★ 形状は下階に縛られる
          node.wMm = lowerPair.wMm;
          node.hMm = lowerPair.hMm;
          node.tatami = lowerPair.tatami;
        } else {
          // ★ 基本的な3mの高さであれば1.82×1.82m（1820×1820mm = 2.0帖）で十分
          node.wMm = 1820;
          node.hMm = 1820;
          node.tatami = 2.0;
        }
      } else if (node.name.includes('バルコニー') || node.name.includes('テラス') || node.category === 'outdoor') {
        const areaM2 = Math.max(1.0, node.tatami) * 1.65;
        const wMm = Math.max(1820, Math.round((3640) / 227.5) * 227.5);
        const hMm = Math.max(910, Math.round((areaM2 * 1000000 / wMm) / 227.5) * 227.5);
        node.wMm = wMm; node.hMm = hMm;
      } else if (this.isVoid(node)) {
        // ★ 吹き抜け・勾配天井
        const areaM2 = Math.max(1.0, node.tatami) * 1.65;
        const wMm = Math.max(1820, Math.round((2730) / 227.5) * 227.5);
        const hMm = Math.max(1820, Math.round((areaM2 * 1000000 / wMm) / 227.5) * 227.5);
        node.wMm = wMm; node.hMm = hMm;
      } else if (node.name.includes('トイレ')) {
        if (node.tatami <= 0.8) { node.wMm = 850; node.hMm = 1300; }
        else if (node.tatami <= 1.2) { node.wMm = 910; node.hMm = 1820; }
        else { node.wMm = 1365; node.hMm = 1820; }
      } else if (node.name.includes('ポーチ') || (node.category === 'entrance' && node.name.includes('ポーチ'))) {
        node.wMm = 1365; node.hMm = 1820;
      } else if (node.name.includes('システムバス') || node.category === 'bath') {
        if (node.tatami <= 2.0) { node.wMm = 1820; node.hMm = 1820; }
        else { node.wMm = 1820; node.hMm = 2275; }
      } else {
        const areaM2 = Math.max(1.0, node.tatami) * 1.65;
        const aspect = (node.category === 'living') ? 1.6 : 1.25;
        const wM = Math.sqrt(areaM2 * aspect);
        const hM = areaM2 / wM;
        // ★ 部屋幅・奥行は227.5mm単位 (1/8間)
        node.wMm = Math.max(455, Math.round((wM * 1000) / 227.5) * 227.5);
        node.hMm = Math.max(455, Math.round((hM * 1000) / 227.5) * 227.5);
      }
    }

    // ★ 敷地・車と100%同一の実寸ピクセルスケーリング！
    const pxPerMm = (this.baseBuildingBox && this.baseBuildingBox.pxPerMm) ? this.baseBuildingBox.pxPerMm : 0.032;
    node.w = Math.max(18, Math.round(node.wMm * pxPerMm));
    node.h = Math.max(18, Math.round(node.hMm * pxPerMm));
    node.radius = Math.round(Math.hypot(node.w, node.h) / 2);
  }

  applyGoldenPattern(patternKey) {
    const pat = this.goldenPatterns[patternKey] || Object.values(this.goldenPatterns)[0];
    if (!pat) return;

    this.buildingType = pat.type || 'two_story';
    const cx = (this.baseBuildingBox.minX + this.baseBuildingBox.maxX) / 2;
    const cy = (this.baseBuildingBox.minY + this.baseBuildingBox.maxY) / 2;

    this.nodes = pat.nodes.map((n, idx) => {
      const copy = { ...n, vx: 0, vy: 0 };
      this.calculateRectDimensions(copy);
      if (!copy.x || !copy.y) {
        copy.x = cx + ((idx % 4) - 1.5) * 75;
        copy.y = cy + (Math.floor(idx / 4) - 1.0) * 65;
      }
      return copy;
    });

    this.links = (pat.links || []).map(l => ({ ...l }));
    this.clampNodesToBuildingBox();

    this.selectedItem = this.nodes.find(n => n.floor === this.currentFloor) || this.nodes[0];
    this.selectedType = 'node';
    this.updateNodeInspectPanel(this.selectedItem);
    this.updateMetrics();
  }

  // ★ 建物最大外形枠 ＆ 車両ブロック拘束 (PH階は自由描画許可)
  clampNodesToBuildingBox() {
    const { minX, maxX, minY, maxY } = this.baseBuildingBox;
    const pxPerMm = (this.baseBuildingBox && this.baseBuildingBox.pxPerMm) ? this.baseBuildingBox.pxPerMm : 0.032;

    for (const n of this.nodes) {
      // ★ PH(4階)は初期ユーザー生成として自由に描けるよう外郭枠制約を柔軟にする
      if (n.floor === 4) continue;

      const halfW = (n.w || 60) / 2;
      const halfH = (n.h || 50) / 2;

      // 基本外郭枠拘束
      n.x = Math.max(minX + halfW, Math.min(maxX - halfW, n.x));
      n.y = Math.max(minY + halfH, Math.min(maxY - halfH, n.y));

      // 車両からの離隔拘束（2F/3Fは車庫上キャンチ910mm許容）
      for (const car of this.carNodes) {
        let margin = car.isBuiltin ? Math.round(300 * pxPerMm) : (car.marginPx || 8);
        if (n.floor >= 2) {
          const cantPx = Math.round(910 * pxPerMm);
          margin = margin - cantPx;
        }

        const carHalfW = Math.max(0, car.w / 2 + margin);
        const carHalfH = Math.max(0, car.h / 2 + margin);
        if (carHalfW <= 0 || carHalfH <= 0) continue;

        const dx = n.x - car.x;
        const dy = n.y - car.y;
        const overlapX = (halfW + carHalfW) - Math.abs(dx);
        const overlapY = (halfH + carHalfH) - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
          if (overlapX < overlapY) {
            n.x += (dx > 0 ? 1 : -1) * overlapX;
          } else {
            n.y += (dy > 0 ? 1 : -1) * overlapY;
          }
        }
      }
    }
  }

  addRectRoom(type, name, tatami, color, floor = null, wMm = null, hMm = null) {
    const targetFloor = floor || this.currentFloor;
    const isStair = name.includes('階段') || type === 'stairs';
    const id = 'room_' + Date.now() + '_' + Math.floor(Math.random() * 100);

    // 既存の階段があればその位置をFIX同期
    let cx = (this.baseBuildingBox.minX + this.baseBuildingBox.maxX) / 2 + (Math.random() * 50 - 25);
    let cy = (this.baseBuildingBox.minY + this.baseBuildingBox.maxY) / 2 + (Math.random() * 50 - 25);

    let assignedFlightId = null;
    if (isStair) {
      // 現在のフロアに既に階段がある場合、上階へ上る「別の新しい階段室」として系統作成
      const stairsOnCurrentFloor = this.nodes.filter(n => n.floor === targetFloor && this.isStairs(n));
      if (stairsOnCurrentFloor.length > 0) {
        assignedFlightId = `flight_${targetFloor}_${targetFloor + 1}`;
        // 別の位置にオフセット配置
        cx = stairsOnCurrentFloor[0].x + 90;
        cy = stairsOnCurrentFloor[0].y;
      } else {
        assignedFlightId = (targetFloor === 1) ? 'flight_1_2' : (targetFloor === 2 ? 'flight_2_3' : 'flight_3_ph');
      }
    }

    const node = { id, name, flightId: assignedFlightId, floor: targetFloor, tatami, category: type, color, x: cx, y: cy, vx: 0, vy: 0 };
    if (wMm) node.wMm = wMm;
    if (hMm) node.hMm = hMm;

    if (isStair) {
      // 基本的な3m高さであれば 1.82×1.82m (1820×1820mm = 2.0帖) で十分
      node.wMm = Math.max(1820, node.wMm || 1820);
      node.hMm = Math.max(1820, node.hMm || 1820);
      node.tatami = Math.max(2.0, node.tatami || 2.0);
    }

    this.calculateRectDimensions(node);
    this.nodes.push(node);

    // ★ 階段を追加した場合、上階（targetFloor + 1）にも連動ペア階段室を自動配置（PHまで）
    if (isStair && targetFloor < 4) {
      const upperFloor = targetFloor + 1;
      const upperFloorName = (upperFloor === 4) ? 'PH塔屋階段室' : `${upperFloor}F階段室`;
      const upperId = 'room_' + Date.now() + '_upper_' + Math.floor(Math.random() * 100);
      const upperNode = {
        id: upperId,
        name: upperFloorName,
        floor: upperFloor,
        tatami: node.tatami,
        category: 'circulation',
        color: node.color,
        flightId: node.flightId,
        x: node.x,
        y: node.y,
        vx: 0,
        vy: 0,
        wMm: node.wMm,
        hMm: node.hMm
      };
      this.calculateRectDimensions(upperNode);
      this.nodes.push(upperNode);
    }

    this.clampNodesToBuildingBox();
    this.selectedItem = node;
    this.selectedType = 'node';
    this.updateNodeInspectPanel(node);
    this.updateMetrics();
  }

  deleteNode(id) {
    this.nodes = this.nodes.filter(n => n.id !== id);
    this.links = this.links.filter(l => l.source !== id && l.target !== id && l.source.id !== id && l.target.id !== id);
    this.selectedItem = this.nodes.find(n => n.floor === this.currentFloor) || null;
    this.selectedType = this.selectedItem ? 'node' : 'none';
    this.updateNodeInspectPanel(this.selectedItem);
    this.updateMetrics();
  }

  // ==========================================
  // 7. キャンバスマウス・タッチドラッグ処理 (部屋・車両両対応)
  // ==========================================
  setupCanvasInteractions() {
    if (!this.canvas) return;

    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (this.canvas.width / rect.width),
        y: (clientY - rect.top) * (this.canvas.height / rect.height)
      };
    };

    const onStart = (e) => {
      const pos = getPos(e);
      this.mouseX = pos.x;
      this.mouseY = pos.y;
      this.isMouseDown = true;
      this.draggedItem = null;

      // 1. まず車両ブロックのタップ判定
      for (let i = this.carNodes.length - 1; i >= 0; i--) {
        const c = this.carNodes[i];
        const halfW = c.w / 2;
        const halfH = c.h / 2;
        if (pos.x >= c.x - halfW && pos.x <= c.x + halfW && pos.y >= c.y - halfH && pos.y <= c.y + halfH) {
          this.draggedItem = c;
          this.draggedType = 'car';
          this.selectedItem = c;
          this.selectedType = 'car';
          this.updateInspectorForCar(c);
          if (e.touches) e.preventDefault();
          return;
        }
      }

      // 2. 部屋ブロックのタップ判定
      const activeNodes = this.nodes.filter(n => n.floor === this.currentFloor);
      for (let i = activeNodes.length - 1; i >= 0; i--) {
        const n = activeNodes[i];
        const halfW = (n.w || 60) / 2;
        const halfH = (n.h || 50) / 2;
        if (pos.x >= n.x - halfW && pos.x <= n.x + halfW && pos.y >= n.y - halfH && pos.y <= n.y + halfH) {
          // ★ 2F階段（上階の階段）は下階にFIXして動かせない（選択とインスペクター表示のみ許可）
          if (this.isStairs(n) && n.floor > 1) {
            this.draggedItem = null;
            this.selectedItem = n;
            this.selectedType = 'node';
            this.updateNodeInspectPanel(n);
            if (e.touches) e.preventDefault();
            return;
          }

          this.draggedItem = n;
          this.draggedType = 'node';
          this.selectedItem = n;
          this.selectedType = 'node';
          this.updateNodeInspectPanel(n);
          if (e.touches) e.preventDefault();
          return;
        }
      }
    };

    const onMove = (e) => {
      const pos = getPos(e);
      this.mouseX = pos.x;
      this.mouseY = pos.y;

      if (this.draggedItem) {
        if (this.draggedType === 'car') {
          // 車両の移動（敷地内にクランプ）
          const halfW = this.draggedItem.w / 2;
          const halfH = this.draggedItem.h / 2;
          this.draggedItem.x = Math.max(this.siteBox.minX + halfW, Math.min(this.siteBox.maxX - halfW, pos.x));
          this.draggedItem.y = Math.max(this.siteBox.minY + halfH, Math.min(this.siteBox.maxY - halfH, pos.y));
          // 車が動いたら建物の凸凹最大外郭が変わり、部屋を押し出す
          this.clampNodesToBuildingBox();
        } else if (this.draggedType === 'node') {
          // 部屋ブロックの移動 ＆ 境界線マグネットスナップ
          const halfW = (this.draggedItem.w || 60) / 2;
          const halfH = (this.draggedItem.h || 50) / 2;
          const snapThreshold = 18; // 境界線まで18px以内ならピタッと壁寄せスナップ

          let targetX = pos.x;
          let targetY = pos.y;

          if (Math.abs(targetX - halfW - this.baseBuildingBox.minX) < snapThreshold) targetX = this.baseBuildingBox.minX + halfW;
          if (Math.abs(targetX + halfW - this.baseBuildingBox.maxX) < snapThreshold) targetX = this.baseBuildingBox.maxX - halfW;
          if (Math.abs(targetY - halfH - this.baseBuildingBox.minY) < snapThreshold) targetY = this.baseBuildingBox.minY + halfH;
          if (Math.abs(targetY + halfH - this.baseBuildingBox.maxY) < snapThreshold) targetY = this.baseBuildingBox.maxY - halfH;

          this.draggedItem.x = Math.max(this.baseBuildingBox.minX + halfW, Math.min(this.baseBuildingBox.maxX - halfW, targetX));
          this.draggedItem.y = Math.max(this.baseBuildingBox.minY + halfH, Math.min(this.baseBuildingBox.maxY - halfH, targetY));
          this.draggedItem.vx = 0;
          this.draggedItem.vy = 0;
          this.clampNodesToBuildingBox();
          // ★ 階段の位置は1Fと2Fで完全にFIX（連動同期）
          if (this.isStairs(this.draggedItem)) {
            this.syncStairsPosition(this.draggedItem);
          }
        }
        if (e.touches) e.preventDefault();
      }
    };

    const onEnd = () => {
      if (this.draggedItem) {
        this.autoSaveDebounced();
      }
      this.isMouseDown = false;
      this.draggedItem = null;
    };

    this.canvas.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    this.canvas.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }

  // 階段ノード判定ヘルパー
  isStairs(n) {
    if (!n) return false;
    const name = n.name || '';
    const id = n.id || '';
    const cat = n.category || '';
    return name.includes('階段') || id.includes('stair') || cat === 'stairs';
  }

  // 階段の系統ID（Flight ID: どの階とどの階を結ぶ階段室か）を取得
  getStairFlightId(node) {
    if (!node || !this.isStairs(node)) return null;
    if (node.flightId) return node.flightId;

    // IDや名称からの推定
    const id = (node.id || '').toLowerCase();
    const name = (node.name || '').toLowerCase();
    if (id.includes('1_2') || name.includes('1f⇄2f') || (node.floor === 1)) return 'flight_1_2';
    if (id.includes('2_3') || name.includes('2f⇄3f')) return 'flight_2_3';
    if (id.includes('3_ph') || name.includes('3f⇄ph') || (node.floor === 4)) return 'flight_3_ph';

    // フロア番号からの動的フォールバック
    if (node.floor === 2) {
      // 2Fに複数の階段がある場合、1つ目は1Fからの受(flight_1_2)、2つ目は3Fへの登り(flight_2_3)
      const stairsOn2F = this.nodes.filter(n => n.floor === 2 && this.isStairs(n));
      if (stairsOn2F.length > 1 && stairsOn2F[1].id === node.id) return 'flight_2_3';
      return 'flight_1_2';
    }
    if (node.floor === 3) {
      const stairsOn3F = this.nodes.filter(n => n.floor === 3 && this.isStairs(n));
      if (stairsOn3F.length > 1 && stairsOn3F[1].id === node.id) return 'flight_3_ph';
      return 'flight_2_3';
    }
    return 'flight_1_2';
  }

  // ★ 階段位置の同期拘束（下階のものは拘束・別の位置に上階へ上る階段室を設置可能・1つの階に2つの階段室あり）
  syncStairsPosition(sourceNode) {
    if (!this.isStairs(sourceNode)) return;
    const flightId = this.getStairFlightId(sourceNode);
    if (!flightId) return;

    // 同一系統（flightId）のペア階段のみを同期
    const pairedStairs = this.nodes.filter(n => this.isStairs(n) && n.id !== sourceNode.id && this.getStairFlightId(n) === flightId);
    for (const st of pairedStairs) {
      st.x = sourceNode.x;
      st.y = sourceNode.y;
      st.vx = 0;
      st.vy = 0;
    }
  }

  // ★ 階段寸法の連動同期（「形状は下階に縛られるように」）
  syncStairsDimensions(sourceNode) {
    if (!this.isStairs(sourceNode)) return;
    const flightId = this.getStairFlightId(sourceNode);
    if (!flightId) return;

    // 同一系統（flightId）の上階階段は、下階の階段の寸法・形状に縛られる
    const pairedStairs = this.nodes.filter(n => this.isStairs(n) && n.id !== sourceNode.id && this.getStairFlightId(n) === flightId);
    for (const st of pairedStairs) {
      st.wMm = sourceNode.wMm;
      st.hMm = sourceNode.hMm;
      st.tatami = sourceNode.tatami;
      const pxPerMm = (this.baseBuildingBox && this.baseBuildingBox.pxPerMm) ? this.baseBuildingBox.pxPerMm : 0.032;
      st.w = Math.max(18, Math.round(st.wMm * pxPerMm));
      st.h = Math.max(18, Math.round(st.hMm * pxPerMm));
      st.radius = Math.round(Math.hypot(st.w, st.h) / 2);
    }
  }

  // 吹き抜け・勾配天井ノード判定ヘルパー（勾配天井は吹き抜け扱い・延床非算入・坪単価3/4）
  isVoid(n) {
    if (!n) return false;
    const cat = (n.category || '').toLowerCase();
    const name = (n.name || '').toLowerCase();
    return cat === 'void' || name.includes('吹き抜け') || name.includes('吹抜') || name.includes('勾配天井');
  }

  // ★ 階段の最小面積・寸法拘束（階高3mであれば1.82×1.82mで十分・形状は下階に縛られる）
  validateStairsMinDimensions(node, nextWMm, nextHMm) {
    if (!this.isStairs(node)) return { wMm: nextWMm, hMm: nextHMm, valid: true };

    const flightId = this.getStairFlightId(node);
    // もし上階の階段室であれば、下階ペアの寸法に縛られる
    const lowerPair = this.nodes.find(n => this.isStairs(n) && n.floor < node.floor && this.getStairFlightId(n) === flightId);
    if (lowerPair && lowerPair.wMm && lowerPair.hMm) {
      return { wMm: lowerPair.wMm, hMm: lowerPair.hMm, valid: true };
    }

    // 階段の最小幅・最小奥行きは910mm (1Pモジュール)
    // 直階段 (910×2730mm等) や 回り階段 (1820×1820mm等) など、奥行き・幅を910mmまで自由に調整可能
    const minDim = 910;
    let targetW = Math.max(minDim, nextWMm);
    let targetH = Math.max(minDim, nextHMm);

    // 階段としての最低面積 (910×1820 = 1.65㎡以上を担保)
    const minStairArea = 910 * 1820;
    if (targetW * targetH < minStairArea) {
      if (nextWMm < nextHMm) {
        targetH = Math.max(targetH, Math.ceil(minStairArea / targetW / 227.5) * 227.5);
      } else {
        targetW = Math.max(targetW, Math.ceil(minStairArea / targetH / 227.5) * 227.5);
      }
    }

    return { wMm: targetW, hMm: targetH, valid: (targetW === nextWMm && targetH === nextHMm) };
  }

  // ==========================================
  // 8. インスペクター制御 (部屋 ＆ 車両切り替え)
  // ==========================================
  setupInspectorControls() {
    const btnTatamiPlus = document.getElementById('btn-node-tatami-plus');
    const btnTatamiMinus = document.getElementById('btn-node-tatami-minus');
    const btnFloorSwitch = document.getElementById('btn-node-floor-switch');
    const btnNodeDelete = document.getElementById('btn-node-delete');

    // 実寸モジュール寸法（幅・奥行）の微調整コントロール (227.5mm単位)
    const btnWMinus = document.getElementById('btn-node-w-minus');
    const btnWPlus = document.getElementById('btn-node-w-plus');
    const inputW = document.getElementById('input-node-w-mm');
    const btnDMinus = document.getElementById('btn-node-d-minus');
    const btnDPlus = document.getElementById('btn-node-d-plus');
    const inputD = document.getElementById('input-node-d-mm');

    const onDimChange = (node) => {
      const sqm = (node.wMm * node.hMm) / 1000000;
      node.tatami = +(sqm / 1.65).toFixed(1);
      const pxPerMm = (this.baseBuildingBox && this.baseBuildingBox.pxPerMm) ? this.baseBuildingBox.pxPerMm : 0.032;
      node.w = Math.max(18, Math.round(node.wMm * pxPerMm));
      node.h = Math.max(18, Math.round(node.hMm * pxPerMm));
      node.radius = Math.round(Math.hypot(node.w, node.h) / 2);

      // 階段なら他フロアも寸法FIX同期
      if (this.isStairs(node)) {
        this.syncStairsDimensions(node);
      }

      this.updateNodeInspectPanel(node);
      this.updateMetrics();
      this.clampNodesToBuildingBox();
    };

    if (btnWMinus) {
      btnWMinus.addEventListener('click', () => {
        if (!this.selectedItem || this.selectedType !== 'node') return;
        const cur = this.selectedItem.wMm || 1820;
        let next = cur - 227.5;
        const checked = this.validateStairsMinDimensions(this.selectedItem, next, this.selectedItem.hMm || 1820);
        this.selectedItem.wMm = Math.max(455, checked.wMm);
        onDimChange(this.selectedItem);
      });
    }

    if (btnWPlus) {
      btnWPlus.addEventListener('click', () => {
        if (!this.selectedItem || this.selectedType !== 'node') return;
        const cur = this.selectedItem.wMm || 1820;
        this.selectedItem.wMm = Math.min(15000, cur + 227.5);
        onDimChange(this.selectedItem);
      });
    }

    if (btnDMinus) {
      btnDMinus.addEventListener('click', () => {
        if (!this.selectedItem || this.selectedType !== 'node') return;
        const cur = this.selectedItem.hMm || 1820;
        let next = cur - 227.5;
        const checked = this.validateStairsMinDimensions(this.selectedItem, this.selectedItem.wMm || 1820, next);
        this.selectedItem.hMm = Math.max(455, checked.hMm);
        onDimChange(this.selectedItem);
      });
    }

    if (btnDPlus) {
      btnDPlus.addEventListener('click', () => {
        if (!this.selectedItem || this.selectedType !== 'node') return;
        const cur = this.selectedItem.hMm || 1820;
        this.selectedItem.hMm = Math.min(15000, cur + 227.5);
        onDimChange(this.selectedItem);
      });
    }

    if (inputW) {
      inputW.addEventListener('change', () => {
        if (!this.selectedItem || this.selectedType !== 'node') return;
        let val = parseFloat(inputW.value) || this.selectedItem.wMm;
        val = Math.round(val / 227.5) * 227.5;
        const checked = this.validateStairsMinDimensions(this.selectedItem, val, this.selectedItem.hMm || 1820);
        this.selectedItem.wMm = Math.max(455, checked.wMm);
        onDimChange(this.selectedItem);
      });
    }

    if (inputD) {
      inputD.addEventListener('change', () => {
        if (!this.selectedItem || this.selectedType !== 'node') return;
        let val = parseFloat(inputD.value) || this.selectedItem.hMm;
        val = Math.round(val / 227.5) * 227.5;
        const checked = this.validateStairsMinDimensions(this.selectedItem, this.selectedItem.wMm || 1820, val);
        this.selectedItem.hMm = Math.max(455, checked.hMm);
        onDimChange(this.selectedItem);
      });
    }

    if (btnTatamiPlus) {
      btnTatamiPlus.addEventListener('click', () => {
        if (!this.selectedItem || this.selectedType !== 'node') return;
        this.selectedItem.tatami = Math.min(30, +(this.selectedItem.tatami + 0.5).toFixed(1));
        // 帖数増加に合わせて幅または奥行を227.5mm拡張
        if (this.selectedItem.wMm <= this.selectedItem.hMm) this.selectedItem.wMm += 227.5;
        else this.selectedItem.hMm += 227.5;

        onDimChange(this.selectedItem);
      });
    }

    if (btnTatamiMinus) {
      btnTatamiMinus.addEventListener('click', () => {
        if (!this.selectedItem || this.selectedType !== 'node') return;
        // 階段の最小帖数制限を柔軟化 (直階段・回り階段対応)
        const minTatami = this.isStairs(this.selectedItem) ? 1.0 : 0.8;
        this.selectedItem.tatami = Math.max(minTatami, +(this.selectedItem.tatami - 0.5).toFixed(1));

        let nextW = this.selectedItem.wMm;
        let nextH = this.selectedItem.hMm;
        if (nextW >= nextH && nextW > 455) {
          nextW -= 227.5;
        } else if (nextH > 455) {
          nextH -= 227.5;
        }

        const checked = this.validateStairsMinDimensions(this.selectedItem, nextW, nextH);
        this.selectedItem.wMm = checked.wMm;
        this.selectedItem.hMm = checked.hMm;

        onDimChange(this.selectedItem);
      });
    }

    if (btnFloorSwitch) {
      btnFloorSwitch.addEventListener('click', () => {
        if (!this.selectedItem || this.selectedType !== 'node') return;
        this.selectedItem.floor = (this.selectedItem.floor === 1) ? 2 : 1;
        this.updateNodeInspectPanel(this.selectedItem);
        this.updateMetrics();
      });
    }

    if (btnNodeDelete) {
      btnNodeDelete.addEventListener('click', () => {
        if (!this.selectedItem || this.selectedType !== 'node') return;
        this.deleteNode(this.selectedItem.id);
      });
    }

    // 🧲 境界線・壁寄せ指示ボタン
    const btnSnapN = document.getElementById('btn-snap-north');
    const btnSnapS = document.getElementById('btn-snap-south');
    const btnSnapW = document.getElementById('btn-snap-west');
    const btnSnapE = document.getElementById('btn-snap-east');

    if (btnSnapN) btnSnapN.addEventListener('click', () => this.snapNodeToBoundary('north'));
    if (btnSnapS) btnSnapS.addEventListener('click', () => this.snapNodeToBoundary('south'));
    if (btnSnapW) btnSnapW.addEventListener('click', () => this.snapNodeToBoundary('west'));
    if (btnSnapE) btnSnapE.addEventListener('click', () => this.snapNodeToBoundary('east'));

    // 🍳 LDK構成スタイル切り替えボタン
    document.querySelectorAll('.btn-ldk-style').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const style = e.currentTarget.getAttribute('data-style');
        this.switchLdkStyle(style);
      });
    });

    // ↔ 隣り合う隙間に合わせて膨らませる
    const btnAutoExpand = document.getElementById('btn-node-auto-expand');
    if (btnAutoExpand) {
      btnAutoExpand.addEventListener('click', () => {
        if (this.selectedItem && this.selectedType === 'node') this.autoExpandNode(this.selectedItem);
      });
    }

    // 🚪 玄関コア（土間+SIC+ホール+トイレ）の整列結合
    const btnAlignEntrance = document.getElementById('btn-align-entrance-core');
    if (btnAlignEntrance) {
      btnAlignEntrance.addEventListener('click', () => this.alignEntranceCore());
    }

    // 📷 設計参考図・ネタ帳切り抜きオンデマンドボタン
    const btnShowTip = document.getElementById('btn-show-architect-tip');
    if (btnShowTip) {
      btnShowTip.addEventListener('click', () => {
        if (this.selectedItem && this.selectedType === 'node') {
          this.showArchitectTipModal(this.selectedItem);
        } else {
          alert('💡 参考図を見たい部屋ブロック（キッチン、UB、洗面、階段など）を選択してください。');
        }
      });
    }
  }

  // 🧲 境界線・壁際に寄せる指示
  snapNodeToBoundary(dir) {
    if (!this.selectedItem || this.selectedType !== 'node') return;
    const n = this.selectedItem;
    const halfW = (n.w || 60) / 2;
    const halfH = (n.h || 50) / 2;
    const { minX, maxX, minY, maxY } = this.baseBuildingBox;

    if (dir === 'north') { n.y = minY + halfH; n.vy = 0; }
    else if (dir === 'south') { n.y = maxY - halfH; n.vy = 0; }
    else if (dir === 'west') { n.x = minX + halfW; n.vx = 0; }
    else if (dir === 'east') { n.x = maxX - halfW; n.vx = 0; }

    this.clampNodesToBuildingBox();
    if (this.isStairs(n)) {
      this.syncStairsPosition(n);
    }
    this.updateNodeInspectPanel(n);
  }

  // 🍳 LDK構成スタイルの動的変更 (K+DL, KD+L, L+D+K, LDK一体)
  switchLdkStyle(style) {
    const ldkKeywords = ['LDK大空間', 'キッチン', '対面キッチン', 'ダイニング', 'リビング', 'ダイニングキッチン', 'ダイニング・リビング', 'DL', 'KD'];
    this.nodes = this.nodes.filter(n => !(n.floor === 1 && (ldkKeywords.some(k => n.name.includes(k)) || n.id.includes('ldk') || n.id.includes('kitchen') || n.id.includes('dining') || n.id.includes('living'))));
    this.links = this.links.filter(l => {
      const sId = typeof l.source === 'object' ? l.source.id : l.source;
      const tId = typeof l.target === 'object' ? l.target.id : l.target;
      return !sId.includes('ldk') && !tId.includes('ldk') && !sId.includes('kitchen') && !tId.includes('kitchen');
    });

    const cx = (this.baseBuildingBox.minX + this.baseBuildingBox.maxX) / 2 - 20;
    const cy = (this.baseBuildingBox.minY + this.baseBuildingBox.maxY) / 2;

    if (style === 'k_dl') {
      // K + DL (キッチン 5.5帖 + ダイニングリビング広間 14.5帖)
      const k = { id: 'kitchen_' + Date.now(), name: '対面キッチン', floor: 1, tatami: 5.5, category: 'kitchen', color: '#f59e0b', wMm: 2730, hMm: 3185, x: cx + 70, y: cy - 60, vx: 0, vy: 0 };
      const dl = { id: 'dl_' + Date.now(), name: 'ダイニング・リビング', floor: 1, tatami: 14.5, category: 'living', color: '#fb923c', wMm: 5460, hMm: 4095, x: cx - 40, y: cy + 30, vx: 0, vy: 0 };
      this.calculateRectDimensions(k);
      this.calculateRectDimensions(dl);
      this.nodes.push(k, dl);
      this.links.push({ source: k.id, target: dl.id });
      this.selectedItem = dl;
    } else if (style === 'kd_l') {
      // KD + L (ダイニングキッチン 10帖 + くつろぎリビング 10帖)
      const kd = { id: 'kd_' + Date.now(), name: 'ダイニングキッチン', floor: 1, tatami: 10.0, category: 'kitchen', color: '#f59e0b', wMm: 4550, hMm: 3640, x: cx + 60, y: cy - 40, vx: 0, vy: 0 };
      const l = { id: 'living_' + Date.now(), name: 'リビング(居間)', floor: 1, tatami: 10.0, category: 'living', color: '#fb923c', wMm: 4550, hMm: 3640, x: cx - 60, y: cy + 40, vx: 0, vy: 0 };
      this.calculateRectDimensions(kd);
      this.calculateRectDimensions(l);
      this.nodes.push(kd, l);
      this.links.push({ source: kd.id, target: l.id });
      this.selectedItem = l;
    } else if (style === 'l_d_k') {
      // L + D + K (リビング 8.5帖 + 食卓ダイニング 6帖 + キッチン 5.5帖)
      const k = { id: 'kitchen_' + Date.now(), name: 'キッチン', floor: 1, tatami: 5.5, category: 'kitchen', color: '#f59e0b', wMm: 2730, hMm: 3185, x: cx + 80, y: cy - 70, vx: 0, vy: 0 };
      const d = { id: 'dining_' + Date.now(), name: 'ダイニング(食事)', floor: 1, tatami: 6.0, category: 'living', color: '#f97316', wMm: 3640, hMm: 2730, x: cx + 20, y: cy, vx: 0, vy: 0 };
      const l = { id: 'living_' + Date.now(), name: 'リビング(居間)', floor: 1, tatami: 8.5, category: 'living', color: '#fb923c', wMm: 4550, hMm: 3185, x: cx - 70, y: cy + 60, vx: 0, vy: 0 };
      this.calculateRectDimensions(k);
      this.calculateRectDimensions(d);
      this.calculateRectDimensions(l);
      this.nodes.push(k, d, l);
      this.links.push({ source: k.id, target: d.id }, { source: d.id, target: l.id });
      this.selectedItem = d;
    } else {
      // LDK大空間一体 20帖
      const ldk = { id: 'ldk_' + Date.now(), name: 'LDK大空間', floor: 1, tatami: 20.0, category: 'living', color: '#fb923c', wMm: 7280, hMm: 4550, x: cx, y: cy, vx: 0, vy: 0 };
      this.calculateRectDimensions(ldk);
      this.nodes.push(ldk);
      this.selectedItem = ldk;
    }

    this.selectedType = 'node';
    this.clampNodesToBuildingBox();
    this.updateNodeInspectPanel(this.selectedItem);
    this.updateMetrics();
  }

  // ↔ 隣接する隙間に合わせてバブルを膨らませる（リビング・ホールのみ許可）
  isExpandableBubble(node) {
    if (!node) return false;
    const name = (node.name || '').toLowerCase();
    const cat = (node.category || '').toLowerCase();
    const id = (node.id || '').toLowerCase();
    
    // リビング・LDK系
    const isLiving = name.includes('リビング') || name.includes('ldk') || name.includes('居間') || name.includes('dl') || name.includes('kd') || cat === 'living' || id.includes('ldk') || id.includes('living');
    // ホール・玄関ホール・廊下系
    const isHall = name.includes('ホール') || name.includes('廊下') || cat === 'hall' || cat === 'entrance' || id.includes('hall');
    
    return isLiving || isHall;
  }

  autoExpandNode(node) {
    if (!node) node = this.selectedItem;
    if (!node || this.selectedType !== 'node') return;

    // リビング、ホールのみ膨張可能に制限
    if (!this.isExpandableBubble(node)) {
      alert(`💡 バブルプランで膨らませて隙間・余白を吸収できるのは「リビング（LDK）」および「ホール（玄関ホール・廊下）」のみです。\n\n「${node.name}」などの個室や水回りは適正モジュール寸法を維持します。リビングやホールを選択して膨らませてください。`);
      return;
    }

    const currentW = node.wMm || 3640;
    const currentH = node.hMm || 3640;

    // コンパクトな辺を優先して227.5mm拡張
    if (currentW <= currentH) {
      node.wMm = Math.min(12000, currentW + 227.5);
    } else {
      node.hMm = Math.min(12000, currentH + 227.5);
    }

    const sqm = (node.wMm * node.hMm) / 1000000;
    node.tatami = +(sqm / 1.65).toFixed(1);
    this.calculateRectDimensions(node);

    this.clampNodesToBuildingBox();
    this.updateNodeInspectPanel(node);
    this.updateMetrics();
  }

  // 📌 部屋ブロックの位置FIX（ピン留め・完全固定）切り替え
  toggleNodeFixed(node) {
    if (!node) return;
    node.isFixed = !node.isFixed;
    if (node.isFixed) {
      node.vx = 0;
      node.vy = 0;
    }
    this.updateNodeInspectPanel(node);
    this.updateStepNavigatorUI();
  }

  // 📌 車両の駐車位置FIX切り替え
  toggleCarFixed(car) {
    if (!car) return;
    car.isFixed = !car.isFixed;
    this.updateInspectorForCar(car);
    this.updateStepNavigatorUI();
  }

  // 🛋️ LDKインナーコーナー追加 (書斎・家事・兼用・スタディ・ヌック)
  addInnerCorner(type, name, tatami, color, wMm = 1365, hMm = 1820) {
    const id = 'corner_' + Date.now() + '_' + Math.floor(Math.random() * 100);
    // 1FのLDKまたはリビングを探す
    const ldkNode = this.nodes.find(n => n.floor === 1 && (n.category === 'living' || n.name.includes('LDK') || n.name.includes('リビング')));
    let cx, cy;
    if (ldkNode) {
      // LDKの内部（右側または下側）に初期配置
      cx = ldkNode.x + Math.min(ldkNode.w / 4, 30);
      cy = ldkNode.y + Math.min(ldkNode.h / 4, 30);
    } else {
      cx = (this.baseBuildingBox.minX + this.baseBuildingBox.maxX) / 2;
      cy = (this.baseBuildingBox.minY + this.baseBuildingBox.maxY) / 2;
    }

    const node = {
      id,
      name,
      floor: 1,
      tatami,
      category: 'inner_corner',
      innerCornerType: type,
      isInnerCorner: true,
      color,
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      wMm,
      hMm,
      isFixed: false
    };

    this.calculateRectDimensions(node);
    this.nodes.push(node);
    this.selectedItem = node;
    this.selectedType = 'node';
    this.detectInnerCornersAndMerged();
    this.updateNodeInspectPanel(node);
    this.updateMetrics();
    this.updateStepNavigatorUI();
  }

  // 🛋️ 重ね合わせ判定 ＆ 書斎×家事マージ判定
  detectInnerCornersAndMerged() {
    const ldkNodes = this.nodes.filter(n => n.floor === this.currentFloor && (n.category === 'living' || n.name.includes('LDK') || n.name.includes('リビング') || n.name.includes('ダイニング')));
    const cornerNodes = this.nodes.filter(n => n.floor === this.currentFloor && n.isInnerCorner);

    for (const corner of cornerNodes) {
      // LDKとの重複判定
      corner.isContainedInLdk = false;
      corner.parentLdk = null;
      for (const ldk of ldkNodes) {
        const dx = Math.abs(corner.x - ldk.x);
        const dy = Math.abs(corner.y - ldk.y);
        const ldkHalfW = (ldk.w || 60) / 2;
        const ldkHalfH = (ldk.h || 50) / 2;
        if (dx < ldkHalfW && dy < ldkHalfH) {
          corner.isContainedInLdk = true;
          corner.parentLdk = ldk;
          break;
        }
      }
    }

    // 書斎と家事コーナーの重複マージ判定
    const denNode = cornerNodes.find(n => n.innerCornerType === 'corner_den');
    const houseNode = cornerNodes.find(n => n.innerCornerType === 'corner_housework');
    // 階段のLDK内包（リビングイン階段・吹き抜け階段）判定
    const stairsNodes = this.nodes.filter(n => n.floor === this.currentFloor && this.isStairs(n));
    for (const st of stairsNodes) {
      st.isLivingStair = false;
      st.parentLdk = null;
      for (const ldk of ldkNodes) {
        const dx = Math.abs(st.x - ldk.x);
        const dy = Math.abs(st.y - ldk.y);
        const ldkHalfW = (ldk.w || 60) / 2;
        const ldkHalfH = (ldk.h || 50) / 2;
        if (dx < ldkHalfW && dy < ldkHalfH) {
          st.isLivingStair = true;
          st.parentLdk = ldk;
          break;
        }
      }
    }

    // 🚪 WICの主寝室・洋室への内包判定
    const bedNodes = this.nodes.filter(n => n.floor === this.currentFloor && (n.category === 'private' || n.category === 'japanese' || n.name.includes('寝室') || n.name.includes('洋室') || n.name.includes('子ども部屋')));
    const wicNodes = this.nodes.filter(n => n.floor === this.currentFloor && n.isWic);
    for (const wic of wicNodes) {
      wic.isContainedInBedroom = false;
      wic.parentBedroom = null;
      for (const bed of bedNodes) {
        const dx = Math.abs(wic.x - bed.x);
        const dy = Math.abs(wic.y - bed.y);
        const bedHalfW = (bed.w || 60) / 2;
        const bedHalfH = (bed.h || 50) / 2;
        if (dx < bedHalfW && dy < bedHalfH) {
          wic.isContainedInBedroom = true;
          wic.parentBedroom = bed;
          break;
        }
      }
    }
  }

  // 🧭 5大優先決定ステップナビのクリック処理 (①②④⑤③順 ＆ 2Fリビング柔軟対応)
  handleStepNavClick(step) {
    const is2FLiving = (this.siteData.ldkFloor === 2);

    if (step === 1) {
      // ① 🚗 駐車場
      if (this.carNodes.length === 0) {
        this.addCar('standard');
      }
      const car = this.carNodes[0];
      this.selectedItem = car;
      this.selectedType = 'car';
      this.updateInspectorForCar(car);
    } else if (step === 2) {
      // ② 🚪 玄関
      if (this.currentFloor !== 1) this.setFloor(1);
      const entrance = this.nodes.find(n => n.floor === 1 && (n.category === 'entrance' || n.name.includes('玄関')));
      if (entrance) {
        this.selectedItem = entrance;
        this.selectedType = 'node';
        this.updateNodeInspectPanel(entrance);
      }
    } else if (step === 4) {
      // ④ 主たる大空間 (1Fリビングなら1F LDK ｜ 2Fリビングなら2F LDK または 1F主室)
      if (is2FLiving) {
        if (this.currentFloor === 1) {
          // 1F表示時は主寝室・水回りをターゲット
          const bedOrSanitary = this.nodes.find(n => n.floor === 1 && (n.category === 'private' || n.category === 'sanitary'));
          if (bedOrSanitary) {
            this.selectedItem = bedOrSanitary;
            this.selectedType = 'node';
            this.updateNodeInspectPanel(bedOrSanitary);
          }
        } else {
          // 2F表示時は2F LDKをターゲット
          const ldk2 = this.nodes.find(n => n.floor === 2 && (n.category === 'living' || n.name.includes('LDK') || n.name.includes('リビング')));
          if (ldk2) {
            this.selectedItem = ldk2;
            this.selectedType = 'node';
            this.updateNodeInspectPanel(ldk2);
          }
        }
      } else {
        // 1Fリビングプラン
        if (this.currentFloor !== 1) this.setFloor(1);
        const ldk = this.nodes.find(n => n.floor === 1 && (n.category === 'living' || n.name.includes('LDK') || n.name.includes('リビング')));
        if (ldk) {
          this.selectedItem = ldk;
          this.selectedType = 'node';
          this.updateNodeInspectPanel(ldk);
        }
      }
    } else if (step === 5) {
      // ⑤ 🧺 各室＆インナーコーナー
      const corner = this.nodes.find(n => n.floor === this.currentFloor && n.isInnerCorner) ||
                     this.nodes.find(n => n.floor === this.currentFloor && (n.category === 'sanitary' || n.category === 'storage' || n.category === 'private'));
      if (corner) {
        this.selectedItem = corner;
        this.selectedType = 'node';
        this.updateNodeInspectPanel(corner);
      }
    } else if (step === 3) {
      // ③ 🪜 階段室 (ホール階段 または LDK内リビング階段)
      const stairs = this.nodes.find(n => n.floor === this.currentFloor && this.isStairs(n)) || this.nodes.find(n => this.isStairs(n));
      if (stairs) {
        if (stairs.floor !== this.currentFloor) this.setFloor(stairs.floor);
        this.selectedItem = stairs;
        this.selectedType = 'node';
        this.updateNodeInspectPanel(stairs);
      }
    }
    this.updateStepNavigatorUI();
  }

  // 🧭 5大ステップナビUI更新（①②④⑤③順 ＆ 2Fリビング柔軟適応）
  updateStepNavigatorUI() {
    const is2FLiving = (this.siteData.ldkFloor === 2);

    // 1. 車
    const carEl = document.getElementById('step-nav-car');
    const carStat = document.getElementById('step-status-car');
    if (carEl && carStat) {
      if (this.carNodes.length > 0) {
        const anyFixed = this.carNodes.some(c => c.isFixed);
        carStat.textContent = anyFixed ? '✅FIX済' : '⚠️配置済';
        carEl.className = anyFixed ? 'bubble-step-item done' : 'bubble-step-item active';
      } else {
        carStat.textContent = '⚪未';
        carEl.className = 'bubble-step-item';
      }
    }

    // 2. 玄関
    const entEl = document.getElementById('step-nav-entrance');
    const entStat = document.getElementById('step-status-entrance');
    const entranceNodes = this.nodes.filter(n => n.category === 'entrance' || n.name.includes('玄関'));
    if (entEl && entStat) {
      if (entranceNodes.length > 0) {
        const anyFixed = entranceNodes.some(n => n.isFixed);
        entStat.textContent = anyFixed ? '✅FIX済' : '⚠️配置済';
        entEl.className = anyFixed ? 'bubble-step-item done' : 'bubble-step-item active';
      } else {
        entStat.textContent = '⚪未';
        entEl.className = 'bubble-step-item';
      }
    }

    // 4. 主空間 (LDKまたは主寝室・水回り)
    const ldkEl = document.getElementById('step-nav-ldk');
    const ldkStat = document.getElementById('step-status-ldk');
    const ldkTitle = document.getElementById('step-nav-ldk-title');

    if (ldkTitle) {
      if (is2FLiving) {
        ldkTitle.textContent = (this.currentFloor === 1) ? '🛏️ 1F主室・水回り' : '☀️ 2F大開口LDK';
      } else {
        ldkTitle.textContent = (this.currentFloor === 1) ? '🛋️ 1F大空間LDK' : '🛏️ 2F主寝室・個室';
      }
    }

    const currentMajorNodes = this.nodes.filter(n => {
      if (is2FLiving && this.currentFloor === 1) {
        return n.floor === 1 && (n.category === 'private' || n.category === 'sanitary');
      }
      return n.floor === this.currentFloor && (n.category === 'living' || n.name.includes('LDK') || n.name.includes('リビング'));
    });

    if (ldkEl && ldkStat) {
      if (currentMajorNodes.length > 0) {
        const anyFixed = currentMajorNodes.some(n => n.isFixed);
        ldkStat.textContent = anyFixed ? '✅FIX済' : '⚠️配置済';
        ldkEl.className = anyFixed ? 'bubble-step-item done' : 'bubble-step-item active';
      } else {
        ldkStat.textContent = '⚪未';
        ldkEl.className = 'bubble-step-item';
      }
    }

    // 5. 各室＆コーナー
    const roomEl = document.getElementById('step-nav-rooms');
    const roomStat = document.getElementById('step-status-rooms');
    const hasCorners = this.nodes.some(n => n.isInnerCorner);
    if (roomEl && roomStat) {
      roomStat.textContent = hasCorners ? '✅充実' : '⚪配置中';
      roomEl.className = hasCorners ? 'bubble-step-item done' : 'bubble-step-item active';
    }

    // 3. 階段室 (ホール階段 または LDK内リビング階段)
    const stEl = document.getElementById('step-nav-stairs');
    const stStat = document.getElementById('step-status-stairs');
    const stTitle = document.getElementById('step-nav-stairs-title');
    const stairNodes = this.nodes.filter(n => this.isStairs(n));

    if (stTitle) {
      const anyLivingStair = stairNodes.some(n => n.isLivingStair);
      stTitle.textContent = anyLivingStair ? '🪜 リビングイン階段' : '🪜 階段室(ホール/LDK内)';
    }

    if (stEl && stStat) {
      if (stairNodes.length > 0) {
        const anyFixed = stairNodes.some(n => n.isFixed);
        stStat.textContent = anyFixed ? '✅FIX済' : '⚠️配置済';
        stEl.className = anyFixed ? 'bubble-step-item done' : 'bubble-step-item active';
      } else {
        stStat.textContent = '⚪未';
        stEl.className = 'bubble-step-item';
      }
    }
  }

  updateNodeInspectPanel(node) {
    const emptyNotice = document.getElementById('inspect-empty-notice');
    const controlBox = document.getElementById('inspect-control-box');
    const carControlBox = document.getElementById('inspect-car-control-box');
    const cardTitle = document.getElementById('inspect-card-title');
    const nameEl = document.getElementById('inspect-node-name');
    const tatamiEl = document.getElementById('inspect-node-tatami');
    const floorEl = document.getElementById('inspect-node-floor');
    const dimTextEl = document.getElementById('inspect-node-dimensions-text');
    const inputW = document.getElementById('input-node-w-mm');
    const inputD = document.getElementById('input-node-d-mm');

    if (carControlBox) carControlBox.style.display = 'none';

    if (!node) {
      if (emptyNotice) emptyNotice.style.display = 'block';
      if (controlBox) controlBox.style.display = 'none';
      if (cardTitle) cardTitle.textContent = '🔍 選択中のブロック';
      return;
    }

    if (cardTitle) cardTitle.textContent = '🔍 選択中の部屋ブロック';
    if (emptyNotice) emptyNotice.style.display = 'none';
    if (controlBox) controlBox.style.display = 'block';
    if (nameEl) nameEl.textContent = node.name;
    if (tatamiEl) {
      const dimStr = node.wMm ? ` (${(node.wMm/1000).toFixed(2)}m × ${(node.hMm/1000).toFixed(2)}m)` : '';
      tatamiEl.textContent = `${node.tatami.toFixed(1)} 帖${dimStr}`;
    }
    if (floorEl) floorEl.textContent = `${node.floor}階`;
    if (dimTextEl && node.wMm && node.hMm) {
      dimTextEl.textContent = `${(node.wMm/1000).toFixed(2)}m × ${(node.hMm/1000).toFixed(2)}m`;
    }
    if (inputW && node.wMm) inputW.value = node.wMm;
    if (inputD && node.hMm) inputD.value = node.hMm;

    // 📌 位置FIXトグルボタンの見た目更新
    const btnNodeFix = document.getElementById('btn-node-fix-toggle');
    const nodeFixIcon = document.getElementById('node-fix-icon');
    const nodeFixText = document.getElementById('node-fix-text');
    if (btnNodeFix && nodeFixText) {
      if (node.isFixed) {
        btnNodeFix.style.background = '#dcfce7';
        btnNodeFix.style.borderColor = '#10b981';
        btnNodeFix.style.color = '#065f46';
        if (nodeFixIcon) nodeFixIcon.textContent = '📌';
        nodeFixText.textContent = '📌 位置FIX中 (解除するにはタップ)';
      } else {
        btnNodeFix.style.background = '#f1f5f9';
        btnNodeFix.style.borderColor = '#cbd5e1';
        btnNodeFix.style.color = '#334155';
        if (nodeFixIcon) nodeFixIcon.textContent = '🔓';
        nodeFixText.textContent = 'この部屋の位置をFIX(固定ロック)';
      }
    }

    // 🔒 2F階段ロック注意書き (上階の階段位置は下階にFIXして動かせない)
    const stairLockNotice = document.getElementById('inspect-stair-lock-notice');
    if (stairLockNotice) {
      if (this.isStairs(node) && node.floor > 1) {
        stairLockNotice.style.display = 'block';
      } else {
        stairLockNotice.style.display = 'none';
      }
    }

    // 🛋️ LDKインナーコーナー / WIC内包案内
    const cornerNotice = document.getElementById('inspect-inner-corner-notice');
    const cornerText = document.getElementById('inspect-inner-corner-text');
    if (cornerNotice && cornerText) {
      if (node.isWic) {
        cornerNotice.style.display = 'block';
        if (node.isContainedInBedroom) {
          cornerNotice.style.background = '#f0fdf4';
          cornerNotice.style.borderColor = '#10b981';
          cornerNotice.style.color = '#065f46';
          cornerText.innerHTML = `🚪 <b>${node.parentBedroom ? node.parentBedroom.name : '主寝室・洋室'}内に内包中</b>（床面積二重計上なし）<br>寝室直結のウォークインクローゼットとして一体集計されています。`;
        } else {
          cornerNotice.style.background = '#fffbeb';
          cornerNotice.style.borderColor = '#f59e0b';
          cornerNotice.style.color = '#92400e';
          cornerText.innerHTML = `💡 主寝室や子ども部屋・洋室の中にドラッグして重ねると、部屋内に内包されたWICとして成立します（床面積二重計上なし）。`;
        }
      } else if (node.isEquipment) {
        cornerNotice.style.display = 'block';
        cornerNotice.style.background = '#ecfdf5';
        cornerNotice.style.borderColor = '#10b981';
        cornerNotice.style.color = '#065f46';
        cornerText.innerHTML = `🛁 <b>住宅設備機器（大手メーカー規格）</b><br>${node.spec || '標準モジュール寸法規格品'} (床面積二重計上なし)`;
      } else if (node.isInnerCorner) {
        cornerNotice.style.display = 'block';
        if (node.isMergedShared) {
          cornerNotice.style.background = '#ecfdf5';
          cornerNotice.style.borderColor = '#059669';
          cornerNotice.style.color = '#065f46';
          cornerText.innerHTML = '🤝 <b>夫の書斎 兼 妻の家事コーナー</b> として兼用統合中！<br>個別配置より約1帖分のスペースと約80万円の建築コストを削減し、LDKと調和します（床面積二重計上なし）。';
        } else if (node.isContainedInLdk) {
          cornerNotice.style.background = '#f0fdf4';
          cornerNotice.style.borderColor = '#10b981';
          cornerNotice.style.color = '#065f46';
          cornerText.innerHTML = `🛋️ <b>LDK内に内包中</b>（床面積の二重計上なし）<br>リビングの一角に設けるカウンター・コーナーとして適正集計されています。`;
        } else {
          cornerNotice.style.background = '#fffbeb';
          cornerNotice.style.borderColor = '#f59e0b';
          cornerNotice.style.color = '#92400e';
          cornerText.innerHTML = `💡 LDKの中にドラッグして重ね合わせると、床面積二重計上なしのインナーコーナーとして成立します。`;
        }
      } else if (this.isStairs(node) && node.isLivingStair) {
        cornerNotice.style.display = 'block';
        cornerNotice.style.background = '#eff6ff';
        cornerNotice.style.borderColor = '#3b82f6';
        cornerNotice.style.color = '#1e40af';
        cornerText.innerHTML = `🛋️ <b>リビングイン階段として配置中</b><br>家族が自然と顔を合わせる動線設計。吹き抜けや勾配天井とも美しく連動します。`;
      } else {
        cornerNotice.style.display = 'none';
      }
    }

    // 🛁 大手メーカー規格寸法プリセットボタンの更新
    this.updateEquipmentPresetsUI(node);
  }

  updateInspectorForCar(car) {
    const emptyNotice = document.getElementById('inspect-empty-notice');
    const controlBox = document.getElementById('inspect-control-box');
    const carControlBox = document.getElementById('inspect-car-control-box');
    const cardTitle = document.getElementById('inspect-card-title');
    const carNameEl = document.getElementById('inspect-car-name');
    const carDimEl = document.getElementById('inspect-car-dim');
    const floorEl = document.getElementById('inspect-node-floor');

    if (controlBox) controlBox.style.display = 'none';
    if (emptyNotice) emptyNotice.style.display = 'none';
    if (carControlBox) carControlBox.style.display = 'block';

    if (cardTitle) cardTitle.textContent = '🚗 選択中の車両ブロック';
    if (floorEl) floorEl.textContent = car.isBuiltin ? '1F(ビルトイン)' : '屋外';

    if (carNameEl) carNameEl.textContent = car.name;
    if (carDimEl) {
      const effW = car.isVertical ? car.wMm : car.hMm;
      const effH = car.isVertical ? car.hMm : car.wMm;
      carDimEl.textContent = `${(effW/1000).toFixed(1)}m × ${(effH/1000).toFixed(1)}m (${car.isVertical ? '縦置き' : '横置き'})`;
    }

    // 📌 車両FIXトグルボタンの見た目更新
    const btnCarFix = document.getElementById('btn-car-fix-toggle');
    const carFixIcon = document.getElementById('car-fix-icon');
    const carFixText = document.getElementById('car-fix-text');
    if (btnCarFix && carFixText) {
      if (car.isFixed) {
        btnCarFix.style.background = '#dcfce7';
        btnCarFix.style.borderColor = '#10b981';
        btnCarFix.style.color = '#065f46';
        if (carFixIcon) carFixIcon.textContent = '📌';
        carFixText.textContent = '📌 駐車位置FIX中 (解除するにはタップ)';
      } else {
        btnCarFix.style.background = '#f1f5f9';
        btnCarFix.style.borderColor = '#cbd5e1';
        btnCarFix.style.color = '#334155';
        if (carFixIcon) carFixIcon.textContent = '🔓';
        carFixText.textContent = 'この駐車位置をFIX(固定ロック)';
      }
    }
  }

  resizeCanvas() {
    if (!this.canvas || !this.wrap) return;
    const rect = this.wrap.getBoundingClientRect();
    const w = Math.floor(rect.width || 760);
    const h = window.innerWidth <= 640 ? 380 : 520;
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d');
  }

  setFloor(floor) {
    this.currentFloor = floor;
    document.querySelectorAll('.bubble-floor-tab').forEach(b => {
      const f = parseInt(b.getAttribute('data-floor'));
      if (f === floor) {
        b.classList.add('active');
        b.style.background = '#0284c7';
        b.style.color = '#fff';
      } else {
        b.classList.remove('active');
        b.style.background = '#f1f5f9';
        b.style.color = '#475569';
      }
    });

    // 各系統の階段の位置・形状を下階マスターで同期維持
    const stairs = this.nodes.filter(n => this.isStairs(n));
    for (const st of stairs) {
      this.syncStairsPosition(st);
      this.syncStairsDimensions(st);
    }

    // 階層切り替えに伴い、外郭枠拘束（2Fのキャンチ91cm許容など）を再適用
    this.clampNodesToBuildingBox();

    // 選択ノードを該当フロアのものに切り替え
    this.selectedItem = this.nodes.find(n => n.floor === floor) || null;
    this.selectedType = this.selectedItem ? 'node' : 'none';
    this.updateNodeInspectPanel(this.selectedItem);

    this.updateMetrics();
  }

  // ==========================================
  // 9. 物理シミュレーションループ (凸凹建物外形図拘束 ＆ 車押し出し)
  // ==========================================
  startSimulationLoop() {
    const step = () => {
      this.updatePhysics();
      this.renderCanvas();
      this.animationFrameId = requestAnimationFrame(step);
    };
    this.animationFrameId = requestAnimationFrame(step);
  }

  updatePhysics() {
    const activeNodes = this.nodes.filter(n => n.floor === this.currentFloor);
    const { minX, maxX, minY, maxY } = this.baseBuildingBox;

    // 1. 部屋同士の反発（バブルモード時は重なり・凸凹形状を許容！矩形モード時のみ軽微に反発）
    if (this.renderMode === 'rect') {
      for (let i = 0; i < activeNodes.length; i++) {
        for (let j = i + 1; j < activeNodes.length; j++) {
          const n1 = activeNodes[i];
          const n2 = activeNodes[j];
          if (n1.isFixed && n2.isFixed) continue;

          const w1 = n1.w || 60;
          const h1 = n1.h || 50;
          const w2 = n2.w || 60;
          const h2 = n2.h || 50;

          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const overlapX = (w1 + w2) / 2 + 4 - Math.abs(dx);
          const overlapY = (h1 + h2) / 2 + 4 - Math.abs(dy);

          if (overlapX > 0 && overlapY > 0) {
            if (overlapX < overlapY) {
              const pushX = (dx > 0 ? 1 : -1) * overlapX * 0.05;
              if (n1 !== this.draggedItem && !n1.isFixed) n1.vx -= pushX;
              if (n2 !== this.draggedItem && !n2.isFixed) n2.vx += pushX;
            } else {
              const pushY = (dy > 0 ? 1 : -1) * overlapY * 0.05;
              if (n1 !== this.draggedItem && !n1.isFixed) n1.vy -= pushY;
              if (n2 !== this.draggedItem && !n2.isFixed) n2.vy += pushY;
            }
          }
        }
      }
    } else {
      // バブルモード: 楕円・円の重なりによる凸凹形状（L字・クランク・入り口食い込み・ホール階段接続）を許容
      // 中心がほぼ一致（完全重なり）した場合のみ微弱に押し出し
      for (let i = 0; i < activeNodes.length; i++) {
        for (let j = i + 1; j < activeNodes.length; j++) {
          const n1 = activeNodes[i];
          const n2 = activeNodes[j];
          if (n1.isFixed && n2.isFixed) continue;
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.hypot(dx, dy) || 1;
          const minDist = 12;
          if (dist < minDist) {
            const push = (minDist - dist) * 0.02;
            const px = (dx / dist) * push;
            const py = (dy / dist) * push;
            if (n1 !== this.draggedItem && !n1.isFixed) { n1.vx -= px; n1.vy -= py; }
            if (n2 !== this.draggedItem && !n2.isFixed) { n2.vx += px; n2.vy += py; }
          }
        }
      }
    }

    // 2. 動線リンクのバネ引き寄せは完全無効化（くるくる回転・漂流を防ぎ、ユーザー配置位置をピタッと保持）
    // リンク線自体の描画は維持するが、位置を強制移動させる力は0

    // 3. 建物基本外郭枠 ＆ 車両ブロック（+離隔20cm）からの拘束
    for (const n of activeNodes) {
      if (n === this.draggedItem) continue;
      if (n.isFixed) {
        n.vx = 0;
        n.vy = 0;
        continue;
      }

      n.x += n.vx;
      n.y += n.vy;
      n.vx *= 0.35; // 速やかに減衰してピタッと静止
      n.vy *= 0.35;
      if (Math.abs(n.vx) < 0.05) n.vx = 0;
      if (Math.abs(n.vy) < 0.05) n.vy = 0;

      const halfW = (n.w || 60) / 2;
      const halfH = (n.h || 50) / 2;

      if (n.x - halfW < minX) { n.x = minX + halfW; n.vx = 0; }
      if (n.x + halfW > maxX) { n.x = maxX - halfW; n.vx = 0; }
      if (n.y - halfH < minY) { n.y = minY + halfH; n.vy = 0; }
      if (n.y + halfH > maxY) { n.y = maxY - halfH; n.vy = 0; }

      // 車両からの反発押し出し（★ 2F/3F/PHは車庫上キャンチ910mm許容）
      const pxPerMm = (this.baseBuildingBox && this.baseBuildingBox.pxPerMm) ? this.baseBuildingBox.pxPerMm : 0.032;
      for (const car of this.carNodes) {
        let margin = car.isBuiltin ? Math.round(300 * pxPerMm) : (car.marginPx || 8);
        if (n.floor >= 2) {
          const cantPx = Math.round(910 * pxPerMm);
          margin = margin - cantPx;
        }

        const carHalfW = Math.max(0, car.w / 2 + margin);
        const carHalfH = Math.max(0, car.h / 2 + margin);

        if (carHalfW <= 0 || carHalfH <= 0) continue;

        const dx = n.x - car.x;
        const dy = n.y - car.y;
        const overlapX = (halfW + carHalfW) - Math.abs(dx);
        const overlapY = (halfH + carHalfH) - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
          if (overlapX < overlapY) {
            n.x += (dx > 0 ? 1 : -1) * overlapX;
            n.vx *= -0.2;
          } else {
            n.y += (dy > 0 ? 1 : -1) * overlapY;
            n.vy *= -0.2;
          }
        }
      }
    }

    // ★ 階段位置の同期（下階のものは拘束・別の位置に上階へ上る階段室を設置可能・1つの解に2つの階段室あり）
    const currentStairs = activeNodes.filter(n => this.isStairs(n));
    for (const curStair of currentStairs) {
      const flightId = this.getStairFlightId(curStair);
      if (!flightId) continue;
      // この系統の他フロアのペア階段と位置を同期
      const pairs = this.nodes.filter(n => this.isStairs(n) && n.id !== curStair.id && this.getStairFlightId(n) === flightId);
      for (const p of pairs) {
        p.x = curStair.x;
        p.y = curStair.y;
        p.vx = 0;
        p.vy = 0;
      }
    }
  }

  renderCanvas() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const cw = this.width;
    const ch = this.height;

    ctx.clearRect(0, 0, cw, ch);

    // 1. 背景グリッド
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, cw, ch);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < cw; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
    }
    for (let y = 0; y < ch; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
    }

    // 2. 敷地境界（赤杭と境界線）の描画
    this.drawSiteBoundary(ctx);

    // 3. 道路帯の描画
    this.drawRoadBand(ctx);

    // 4. ★車両に連動した【凸凹形状の建物最大外形図】の描画
    this.drawClippedBuildingArea(ctx);

    // 5. 車両ブロック（1台ずつ自由に置かれた車）の描画
    this.drawCarNodes(ctx);

    // 6. 動線リンク（点線バネ）
    const activeNodes = this.nodes.filter(n => n.floor === this.currentFloor);
    for (const link of this.links) {
      const n1 = activeNodes.find(n => n.id === link.source || n.id === link.source.id);
      const n2 = activeNodes.find(n => n.id === link.target || n.id === link.target.id);
      if (!n1 || !n2) continue;

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(n1.x, n1.y);
      ctx.lineTo(n2.x, n2.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 7. 部屋ブロックの描画（バブルモード: 楕円・円の重なり・凸凹許容 ｜ 矩形モード: 角丸設計ブロック）
    for (const n of activeNodes) {
      const isSelected = (this.selectedItem && this.selectedType === 'node' && this.selectedItem.id === n.id);
      const halfW = (n.w || 60) / 2;
      const halfH = (n.h || 50) / 2;
      const isHovered = (this.mouseX >= n.x - halfW && this.mouseX <= n.x + halfW && this.mouseY >= n.y - halfH && this.mouseY <= n.y + halfH);

      ctx.save();
      ctx.shadowColor = isSelected ? 'rgba(2, 132, 199, 0.45)' : 'rgba(0, 0, 0, 0.08)';
      ctx.shadowBlur = isSelected ? 16 : 6;
      ctx.shadowOffsetY = 3;

      const rw = n.w || 60;
      const rh = n.h || 50;
      const isVoidRoom = this.isVoid(n);

      if (this.renderMode === 'bubble') {
        // ★ バブル表示: 正方形に近いものは「円」、長方形は「楕円」で描画し、重なりで凸凹形状を許容
        const isCircle = Math.abs(rw - rh) < 8;
        ctx.beginPath();
        if (isCircle) {
          ctx.arc(n.x, n.y, (rw + rh) / 4, 0, Math.PI * 2);
        } else {
          ctx.ellipse(n.x, n.y, halfW, halfH, 0, 0, Math.PI * 2);
        }

        // 半透明塗りつぶし（重なり合った部分が綺麗に重なり凸凹形状が浮かび上がる）
        ctx.globalAlpha = isSelected ? 0.88 : 0.78;
        ctx.fillStyle = n.color || '#38bdf8';
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // 吹き抜け・勾配天井の場合は斜線パターンを描画
        if (isVoidRoom) {
          ctx.save();
          ctx.clip();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = 2.5;
          for (let lx = -rw; lx < rw * 2; lx += 12) {
            ctx.beginPath();
            ctx.moveTo(n.x - halfW + lx, n.y - halfH);
            ctx.lineTo(n.x - halfW + lx + rh, n.y + halfH);
            ctx.stroke();
          }
          ctx.restore();
        }

        // 枠線
        ctx.strokeStyle = isSelected ? '#0284c7' : (isHovered ? '#38bdf8' : (isVoidRoom ? '#cbd5e1' : 'rgba(255, 255, 255, 0.95)'));
        ctx.lineWidth = isSelected ? 3.5 : 2.0;
        if (isVoidRoom) ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // ★ 矩形設計ブロック表示
        const rx = n.x - halfW;
        const ry = n.y - halfH;
        const radius = 6;

        ctx.fillStyle = n.color || '#38bdf8';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, radius);
        else ctx.rect(rx, ry, rw, rh);
        ctx.fill();

        // 吹き抜け・勾配天井の格子ハッチング
        if (isVoidRoom) {
          ctx.save();
          ctx.clip();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = 2;
          for (let lx = -rw; lx < rw * 2; lx += 10) {
            ctx.beginPath();
            ctx.moveTo(rx + lx, ry);
            ctx.lineTo(rx + lx + rh, ry + rh);
            ctx.stroke();
          }
          ctx.restore();
        }

        ctx.strokeStyle = isSelected ? '#0284c7' : (isHovered ? '#38bdf8' : 'rgba(255, 255, 255, 0.9)');
        ctx.lineWidth = isSelected ? 3.5 : 2;
        if (isVoidRoom) ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

      // テキスト描画（ノード幅・高さに応じた可変フォント）
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const fontSizeTitle = Math.max(9, Math.min(13, Math.round(Math.min(rw * 0.32, rh * 0.24))));
      const fontSizeSub = Math.max(8, Math.min(10, Math.round(Math.min(rw * 0.24, rh * 0.18))));

      let displayTitle = n.name;
      if (isVoidRoom && !displayTitle.includes('吹抜') && !displayTitle.includes('勾配')) {
        displayTitle += ' (吹抜)';
      }

      if (rh < 42 || rw < 48) {
        ctx.font = `bold ${fontSizeTitle}px sans-serif`;
        ctx.fillStyle = '#0f172a';
        ctx.fillText(displayTitle, n.x, n.y - (rh >= 34 ? 5 : 0));

        if (rh >= 34) {
          ctx.font = `bold ${fontSizeSub}px sans-serif`;
          ctx.fillStyle = '#334155';
          const shortDim = n.wMm ? `${n.tatami}帖 (${(n.wMm/1000).toFixed(1)}×${(n.hMm/1000).toFixed(1)})` : `${n.tatami}帖`;
          ctx.fillText(shortDim, n.x, n.y + 7);
        }
      } else {
        ctx.font = `bold ${fontSizeTitle}px sans-serif`;
        ctx.fillStyle = '#0f172a';
        ctx.fillText(displayTitle, n.x, n.y - 7);

        ctx.font = `bold ${fontSizeSub}px sans-serif`;
        ctx.fillStyle = '#334155';
        const dimLabel = n.wMm ? `${n.tatami}帖 (${(n.wMm/1000).toFixed(1)}×${(n.hMm/1000).toFixed(1)}m)` : `${n.tatami}帖`;
        ctx.fillText(dimLabel, n.x, n.y + 9);
      }

      // 📌 位置FIXバッジの描画
      if (n.isFixed) {
        ctx.save();
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('📌', n.x + halfW - 2, n.y - halfH + 2);
        ctx.restore();
      }

      // 🛋️ インナーコーナー（LDK内包 / 兼用シェア）バッジの描画
      if (n.isInnerCorner) {
        ctx.save();
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        if (n.isMergedShared) {
          ctx.fillStyle = '#059669';
          ctx.fillText('🤝 兼用(書斎×家事)', n.x, n.y - halfH - 2);
        } else if (n.isContainedInLdk) {
          ctx.fillStyle = '#b45309';
          ctx.fillText('🛋️ LDK内包', n.x, n.y - halfH - 2);
        }
        ctx.restore();
      }

      // 🪜 リビングイン階段バッジの描画
      if (this.isStairs(n) && n.isLivingStair) {
        ctx.save();
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = '#2563eb';
        ctx.fillText('🛋️ リビング階段', n.x, n.y - halfH - 2);
        ctx.restore();
      }
    }
  }

  drawSiteBoundary(ctx) {
    const { minX, maxX, minY, maxY } = this.siteBox;
    const w = maxX - minX;
    const h = maxY - minY;

    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(minX, minY, w, h);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(minX, minY, w, h);

    const drawStake = (x, y) => {
      ctx.fillStyle = '#dc2626';
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
    };
    drawStake(minX, minY);
    drawStake(maxX, minY);
    drawStake(maxX, maxY);
    drawStake(minX, maxY);

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`📐 敷地境界線 (地積 ${this.siteData.siteTsubo}坪 ｜ 隣地離隔${this.siteData.boundaryMarginMm/10}cm・道路離隔20cm)`, minX + 8, minY - 8);
  }

  drawRoadBand(ctx) {
    const { minX, maxX, minY, maxY } = this.siteBox;
    const road = this.siteData.roadDirection;
    const cw = this.width;
    const ch = this.height;

    ctx.fillStyle = '#cbd5e1';
    if (road === 'south') {
      ctx.fillRect(0, maxY, cw, ch - maxY);
      this.drawRoadLabel(ctx, cw / 2, maxY + 18, `🛣️ 南側公道 (幅員 ${this.siteData.roadWidthM}m ｜ 道路離隔20cm標準)`);
    } else if (road === 'north') {
      ctx.fillRect(0, 0, cw, minY);
      this.drawRoadLabel(ctx, cw / 2, minY - 18, `🛣️ 北側公道 (幅員 ${this.siteData.roadWidthM}m ｜ 道路離隔20cm標準)`);
    } else if (road === 'east') {
      ctx.fillRect(maxX, 0, cw - maxX, ch);
      this.drawRoadLabel(ctx, maxX + 20, ch / 2, `🛣️ 東側公道 (幅員 ${this.siteData.roadWidthM}m)`, true);
    } else if (road === 'west') {
      ctx.fillRect(0, 0, minX, ch);
      this.drawRoadLabel(ctx, minX - 20, ch / 2, `🛣️ 西側公道 (幅員 ${this.siteData.roadWidthM}m)`, true);
    }
  }

  drawRoadLabel(ctx, x, y, text, vertical = false) {
    ctx.save();
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (vertical) {
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(text, 0, 0);
    } else {
      ctx.fillText(text, x, y);
    }
    ctx.restore();
  }

  // ★ 車両の位置で切り欠かれた【凸凹形状の建物最大外形図】を描画 (2Fは車庫上キャンチ91cm許容)
  drawClippedBuildingArea(ctx) {
    const { minX, maxX, minY, maxY } = this.baseBuildingBox;
    const pxPerMm = (this.baseBuildingBox && this.baseBuildingBox.pxPerMm) ? this.baseBuildingBox.pxPerMm : 0.032;
    const w = maxX - minX;
    const h = maxY - minY;
    const isUpper = (this.currentFloor >= 2);

    ctx.save();

    // 1. 基本建築可能エリア
    ctx.fillStyle = isUpper ? 'rgba(238, 242, 255, 0.75)' : 'rgba(224, 242, 254, 0.75)';
    ctx.fillRect(minX, minY, w, h);

    // 2. 各車ゾーンのくり抜き (2F/3F/PHは車庫上キャンチ910mm許容)
    for (const car of this.carNodes) {
      let margin = car.isBuiltin ? Math.round(300 * pxPerMm) : (car.marginPx || 8);
      if (isUpper) {
        const cantPx = Math.round(910 * pxPerMm);
        margin = margin - cantPx;
      }

      const cw = Math.max(0, car.w + margin * 2);
      const ch = Math.max(0, car.h + margin * 2);

      if (cw > 0 && ch > 0) {
        const cx = car.x - cw / 2;
        const cy = car.y - ch / 2;

        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(cx, cy, cw, ch);

        ctx.strokeStyle = isUpper ? '#6366f1' : '#0284c7';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(cx, cy, cw, ch);
        ctx.setLineDash([]);
      }

      ctx.fillStyle = isUpper ? '#4338ca' : (car.isBuiltin ? '#059669' : '#e11d48');
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      const labelText = isUpper ? '✨ 車庫上キャンチ91cm許容' : (car.isBuiltin ? '🏠 ビルトイン (芯ズレ30cm)' : '🚗 駐車離隔20cm確保');
      ctx.fillText(labelText, car.x, car.y - car.h / 2 - 4);
    }

    // 3. 建物外郭枠の破線エッジ
    ctx.strokeStyle = isUpper ? '#6366f1' : '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(minX, minY, w, h);
    ctx.setLineDash([]);

    let floorName = `${this.currentFloor}F`;
    if (this.currentFloor === 4) floorName = 'PH(塔屋)';
    const cornerLabel = isUpper
      ? `🏠 ${floorName} 建物最大外形図（車庫上キャンチ91cm許容 ｜ 隣地65cm・道路20cm離隔厳守）`
      : `🏠 1F 建物最大外形図（車配置に連動した凸凹形状 ｜ 隣地65cm・道路20cm・車20cm離隔）`;
    ctx.fillStyle = isUpper ? '#3730a3' : '#0369a1';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(cornerLabel, minX + 10, minY + 18);

    ctx.restore();
  }

  // 車両ブロック（1台ずつ自由にドラッグできる車）の描画
  drawCarNodes(ctx) {
    for (const car of this.carNodes) {
      const isSelected = (this.selectedItem && this.selectedType === 'car' && this.selectedItem.id === car.id);
      const isHovered = (this.mouseX >= car.x - car.w/2 && this.mouseX <= car.x + car.w/2 && this.mouseY >= car.y - car.h/2 && this.mouseY <= car.y + car.h/2);

      ctx.save();
      ctx.shadowColor = isSelected ? 'rgba(5, 150, 105, 0.45)' : 'rgba(0, 0, 0, 0.12)';
      ctx.shadowBlur = isSelected ? 16 : 6;
      ctx.shadowOffsetY = 3;

      const rx = car.x - car.w / 2;
      const ry = car.y - car.h / 2;

      // 車体本体
      ctx.fillStyle = car.isBuiltin ? '#10b981' : '#334155';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(rx, ry, car.w, car.h, 8);
      else ctx.rect(rx, ry, car.w, car.h);
      ctx.fill();

      // 車両ストローク
      ctx.strokeStyle = isSelected ? '#10b981' : (isHovered ? '#34d399' : '#ffffff');
      ctx.lineWidth = isSelected ? 3.5 : 2;
      ctx.stroke();
      ctx.restore();

      // 車両テキスト
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(car.name, car.x, car.y - 7);

      ctx.font = 'bold 9px sans-serif';
      ctx.fillStyle = '#cbd5e1';
      const effW = car.isVertical ? car.wMm : car.hMm;
      const effH = car.isVertical ? car.hMm : car.wMm;
      ctx.fillText(`${(effW/1000).toFixed(1)}×${(effH/1000).toFixed(1)}m (離隔20cm)`, car.x, car.y + 8);

      // 📌 車両位置FIXバッジ
      if (car.isFixed) {
        ctx.save();
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('📌', car.x + car.w / 2 - 2, car.y - car.h / 2 + 2);
        ctx.restore();
      }
    }
  }

  // ==========================================
  // 11. メトリクス ＆ 見積もり計算
  // ==========================================
  setInsulationTier(tier) {
    if (!this.insulationTiers[tier]) return;
    this.currentTier = tier;

    document.querySelectorAll('.bubble-insulation-tier').forEach(el => {
      if (el.getAttribute('data-tier') === tier) el.classList.add('active');
      else el.classList.remove('active');
    });

    const tierObj = this.insulationTiers[tier];
    const specEl = document.getElementById('bubble-current-tier-spec');
    if (specEl) specEl.textContent = `${tierObj.name}`;
    this.updateMetrics();
  }

  isOutdoor(n) {
    if (!n) return false;
    const cat = (n.category || '').toLowerCase();
    const name = (n.name || '').toLowerCase();
    return cat === 'outdoor' || name.includes('バルコニー') || name.includes('ウッドデッキ') || name.includes('デッキ');
  }

  // ★ 法定延床面積（吹き抜け・勾配天井・バルコニー・デッキ除外）＆ 按分予算計算
  // 室内居室: 100%、吹き抜け・勾配天井: 75% (3/4)、バルコニー: 50% (1/2)、ウッドデッキ: 25% (1/4)
  calculatePlanMetrics() {
    // 室内居室のみを法定延床面積に加算（屋外および吹き抜け・勾配天井、LDK内包インナーコーナーは二重計上防止のため非算入）
    const indoorNodes = this.nodes.filter(n => !this.isOutdoor(n) && !this.isVoid(n) && !(n.isInnerCorner && n.isContainedInLdk) && !(n.isWic && n.isContainedInBedroom) && !n.isEquipment);
    const totalIndoorTatami = indoorNodes.reduce((sum, n) => sum + n.tatami, 0);
    const totalTsubo = +(totalIndoorTatami * 0.5 * 1.15).toFixed(1);
    const totalSqm = +(totalTsubo * 3.30578).toFixed(1);

    const t1 = indoorNodes.filter(n => n.floor === 1).reduce((sum, n) => sum + n.tatami, 0);
    const t2 = indoorNodes.filter(n => n.floor === 2).reduce((sum, n) => sum + n.tatami, 0);
    const t3 = indoorNodes.filter(n => n.floor === 3).reduce((sum, n) => sum + n.tatami, 0);
    const t4 = indoorNodes.filter(n => n.floor === 4).reduce((sum, n) => sum + n.tatami, 0);
    const tsubo1 = +(t1 * 0.5 * 1.15).toFixed(1);
    const tsubo2 = +(t2 * 0.5 * 1.15).toFixed(1);
    const tsubo3 = +(t3 * 0.5 * 1.15).toFixed(1);
    const tsubo4 = +(t4 * 0.5 * 1.15).toFixed(1);

    // ★ 吹き抜け・勾配天井（延床非算入・予算は坪単価の 3/4 = 0.75 で計算）
    const voidNodes = this.nodes.filter(n => this.isVoid(n));
    const voidTatami = voidNodes.reduce((sum, n) => sum + n.tatami, 0);
    const voidTsubo = +(voidTatami * 0.5 * 1.15).toFixed(1);

    // バルコニー坪数（延床非算入・予算は坪単価の 1/2 = 0.5 で計算）
    const balconyNodes = this.nodes.filter(n => (n.name || '').includes('バルコニー') || (n.name || '').includes('テラス'));
    const balconyTatami = balconyNodes.reduce((sum, n) => sum + n.tatami, 0);
    const balconyTsubo = +(balconyTatami * 0.5 * 1.15).toFixed(1);

    // ウッドデッキ坪数（延床非算入・予算は坪単価の 1/4 = 0.25 で計算）
    const deckNodes = this.nodes.filter(n => (n.name || '').includes('デッキ'));
    const deckTatami = deckNodes.reduce((sum, n) => sum + n.tatami, 0);
    const deckTsubo = +(deckTatami * 0.5 * 1.15).toFixed(1);

    // 概算価格: 室内100% + 吹き抜け75%(3/4) + バルコニー50%(1/2) + ウッドデッキ25%(1/4)
    const calcCost = (tsuboRate) => {
      const indoorCost = totalTsubo * tsuboRate;
      const voidCost = voidTsubo * (tsuboRate * 0.75); // ★ 3/4×坪単価
      const balconyCost = balconyTsubo * (tsuboRate * 0.5);
      const deckCost = deckTsubo * (tsuboRate * 0.25);
      return Math.round((indoorCost + voidCost + balconyCost + deckCost) / 10000); // 万円
    };

    return {
      totalTsubo,
      totalSqm,
      tsubo1,
      tsubo2,
      tsubo3,
      tsubo4,
      voidTsubo,
      balconyTsubo,
      deckTsubo,
      calcCost
    };
  }

  updateMetrics() {
    const metrics = this.calculatePlanMetrics();
    const activeRate = this.insulationTiers[this.currentTier].tsuboRate;
    const estPriceMan = metrics.calcCost(activeRate);

    Object.keys(this.insulationTiers).forEach(tierKey => {
      const rate = this.insulationTiers[tierKey].tsuboRate;
      const tierPriceMan = metrics.calcCost(rate);
      const tierPriceEl = document.getElementById(`price-tier-${tierKey}`);
      if (tierPriceEl) tierPriceEl.textContent = `約 ${tierPriceMan.toLocaleString()} 万円`;
    });

    const totalTsuboEl = document.getElementById('bubble-total-tsubo');
    const totalSqmEl = document.getElementById('bubble-total-sqm');
    const estPriceEl = document.getElementById('bubble-est-price');
    const floorBreakdownEl = document.getElementById('bubble-floor-breakdown');

    if (totalTsuboEl) totalTsuboEl.textContent = `${metrics.totalTsubo} 坪`;
    if (totalSqmEl) totalSqmEl.textContent = `${metrics.totalSqm} ㎡`;
    if (estPriceEl) estPriceEl.textContent = `約 ${estPriceMan.toLocaleString()} 万円 (税込)`;
    if (floorBreakdownEl) {
      let breakdownStr = `1F: ${metrics.tsubo1}坪 ｜ 2F: ${metrics.tsubo2}坪`;
      if (metrics.tsubo3 > 0) breakdownStr += ` ｜ 3F: ${metrics.tsubo3}坪`;
      if (metrics.tsubo4 > 0) breakdownStr += ` ｜ PH: ${metrics.tsubo4}坪`;

      const extraNotes = [];
      if (metrics.voidTsubo > 0) extraNotes.push(`吹抜・勾配天井: ${metrics.voidTsubo}坪(3/4)`);
      if (metrics.balconyTsubo > 0) extraNotes.push(`バルコニー: ${metrics.balconyTsubo}坪(1/2)`);
      if (metrics.deckTsubo > 0) extraNotes.push(`デッキ: ${metrics.deckTsubo}坪(1/4)`);

      if (extraNotes.length > 0) {
        breakdownStr += ` ｜ 特別加算: ${extraNotes.join('・')}`;
      }
      floorBreakdownEl.textContent = breakdownStr;
    }

    this.evaluateLayoutScore(metrics.totalTsubo, metrics.tsubo1, metrics.tsubo2);
  }

  evaluateLayoutScore(totalTsubo, t1, t2) {
    let score = 92;
    const advices = [];

    const kNode = this.nodes.find(n => n.category === 'kitchen');
    const wNode = this.nodes.find(n => n.category === 'sanitary' && n.name.includes('洗面'));
    if (kNode && wNode) {
      if (kNode.floor === wNode.floor) {
        score += 4;
        advices.push('✅ キッチンと洗面脱衣室が直結し、家事短縮回遊動線が成立しています。');
      } else {
        score -= 6;
        advices.push('⚠️ キッチンと洗面脱衣室が別階です。洗濯動線にご留意ください。');
      }
    }

    const toilet1 = this.nodes.find(n => n.name.includes('トイレ') && n.floor === 1);
    if (toilet1) advices.push('✅ 1Fトイレは850×1300mm以上の有効寸法を確保しています。');

    const bath = this.nodes.find(n => n.name.includes('システムバス'));
    if (bath) advices.push('✅ 浴室は1616〜1620サイズの規定幅モジュールを遵守しています。');

    if (t1 > this.siteData.maxBuildingAreaTsubo) {
      score -= 8;
      advices.push(`⚠️ 1階建築面積（${t1}坪）が都市計画上の最大建築可能面積（${this.siteData.maxBuildingAreaTsubo}坪・建ぺい率${this.siteData.kenpeiRate}%）を超過しています。`);
    } else {
      advices.push(`✅ 建築可能面積（最大${this.siteData.maxBuildingAreaTsubo}坪）の枠内に安全に収まっています。`);
    }

    const scoreEl = document.getElementById('bubble-ai-score');
    const adviceListEl = document.getElementById('bubble-ai-advices-list');

    if (scoreEl) scoreEl.textContent = `${Math.min(99, Math.max(70, score))} 点`;
    if (adviceListEl) {
      adviceListEl.innerHTML = advices.map(a => `<div style="margin-bottom: 4px;">${a}</div>`).join('');
    }
  }

  // ==========================================
  // 12. 3D CADモデラー ＆ パース工房連携
  // ==========================================
  transferToCadModeller() {
    const ldk = this.nodes.find(n => n.category === 'living') || this.nodes[0];
    const dimX = ldk?.wMm || 7280;
    const dimY = ldk?.hMm || 4550;
    const hasOpenTatami = this.nodes.some(n => n.name.includes('和室') || n.name.includes('小上がり'));

    if (window.switchPage) window.switchPage('ai-studio');

    setTimeout(() => {
      const tabCad = document.getElementById('archix-mode-from-plan');
      if (tabCad) tabCad.click();

      if (window.planModellerInstance) {
        const pm = window.planModellerInstance;
        pm.dimX = dimX;
        pm.dimY = dimY;
        pm.adjoiningRoom = hasOpenTatami ? 'tatami_open' : 'none';
        pm.roomType = 'ldk';
        pm.kitchenType = 'island_2550';
        pm.doorType = 'kamiya_fullheight_800';
        pm.doorSwing = 'inward';

        const inX = document.getElementById('modeller-dim-x');
        const inY = document.getElementById('modeller-dim-y');
        const adj = document.getElementById('modeller-adjoining-room');
        if (inX) inX.value = dimX;
        if (inY) inY.value = dimY;
        if (adj) adj.value = pm.adjoiningRoom;

        pm.updateInfoText();
        pm.autoLayoutFurniture();
        pm.render();
        pm.goToStep(3);

        alert(`🎉 Bubble Planから間取りデータを引き継ぎました！\n\n・想定空間寸法: 芯々 ${dimX.toLocaleString()} × ${dimY.toLocaleString()} mm\n・続き間設定: ${hasOpenTatami ? '2間続き（和室開放）' : '標準LDK'}\n\n3D空間モデラーに自動反映されました。アングルを決めて高精度パースを生成できます！`);
      }
    }, 250);
  }

  // ==========================================
  // 13. マイカルテ保存 ＆ モーダル連携
  // ==========================================
  saveSiteToCarte() {
    const carDesc = this.carNodes.length > 0 ? this.carNodes.map(c => `${c.name}`).join('、') : '車庫なし';
    const carteItem = {
      id: 'carte_site_' + Date.now(),
      type: 'site_survey',
      createdAt: new Date().toLocaleString('ja-JP'),
      title: `敷地測量図 ＆ 都市計画カルテ（${this.siteData.address}）`,
      address: this.siteData.address,
      siteTsubo: this.siteData.siteTsubo,
      climateRegion: this.siteData.climateRegion,
      zone: this.siteData.zone,
      kenpeiRate: this.siteData.kenpeiRate,
      yousekiRate: this.siteData.yousekiRate,
      fireZone: this.siteData.fireZone,
      maxBuildingAreaTsubo: this.siteData.maxBuildingAreaTsubo,
      roadDirection: this.siteData.roadDirection,
      roadWidthM: this.siteData.roadWidthM,
      parking: `${carDesc} (${this.carNodes.length}台配置 / 車離隔20cm)`,
      boundaryMargin: `${this.siteData.boundaryMarginMm/10}cm`,
      thumb: this.siteData.surveyImage || ''
    };

    const list = this.getCarteList();
    const idx = list.findIndex(item => item.type === 'site_survey' && item.address === this.siteData.address);
    if (idx >= 0) list[idx] = carteItem;
    else list.unshift(carteItem);
    localStorage.setItem('smile_user_carte', JSON.stringify(list));
    this.updateCarteBadge();
  }

  saveCurrentPlanToCarte() {
    const metrics = this.calculatePlanMetrics();
    const tierObj = this.insulationTiers[this.currentTier];
    const estPriceMan = metrics.calcCost(tierObj.tsuboRate);

    const carteItem = {
      id: 'carte_' + Date.now(),
      type: 'bubble_plan',
      createdAt: new Date().toLocaleString('ja-JP'),
      title: `バブル作図プラン (${metrics.totalTsubo}坪・${tierObj.name})`,
      totalTsubo: metrics.totalTsubo,
      insulationTier: tierObj.name,
      estPriceMan,
      siteTsubo: this.siteData.siteTsubo,
      address: this.siteData.address,
      zone: this.siteData.zone,
      rooms: this.nodes.map(n => `${n.name}(${n.tatami}帖)`).join('、'),
      nodesCount: this.nodes.length,
      carsCount: this.carNodes.length
    };

    const list = this.getCarteList();
    list.unshift(carteItem);
    localStorage.setItem('smile_user_carte', JSON.stringify(list));
    this.updateCarteBadge();
    alert(`🌟 マイカルテに間取りを保存しました！\n\n・想定延床: ${metrics.totalTsubo} 坪 (※バルコニー・デッキ非算入)\n・断熱仕様: ${tierObj.name}\n・概算本体価格: 約 ${estPriceMan.toLocaleString()} 万円 (税込・バルコニー1/2,デッキ1/4按分・設備機器別途)\n\n上部の「📋 マイカルテを見る」からいつでも確認できます。`);
  }

  getCarteList() {
    try {
      const data = localStorage.getItem('smile_user_carte');
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  }

  updateCarteBadge() {
    const list = this.getCarteList();
    const badge = document.getElementById('carte-badge-count');
    if (badge) badge.textContent = list.length;
  }

  renderCarteModalContent() {
    const list = this.getCarteList();
    const container = document.getElementById('carte-items-container');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: #94a3b8; padding: 2.5rem 0;">
          <span style="font-size: 2.5rem; display: block; margin-bottom: 8px;">📂</span>
          保存されたカルテはまだありません。<br>
          敷地測量図をアップロードし、車や部屋ブロックを配置して「マイカルテに保存」してみましょう！
        </div>
      `;
      return;
    }

    container.innerHTML = list.map((item, idx) => {
      if (item.type === 'site_survey') {
        return `
          <div class="carte-card" style="border-left: 4px solid #0284c7; background: #f0f9ff;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
              <div>
                <span style="font-size: 0.72rem; color: #0369a1; font-weight: 700;">🏞️ 敷地・都市計画カルテ ｜ ${item.createdAt}</span>
                <h4 style="margin: 2px 0 0; color: #0f172a; font-size: 1.05rem;">${item.title}</h4>
              </div>
              <span style="background: #e0f2fe; color: #0284c7; font-weight: 800; font-size: 0.8rem; padding: 3px 10px; border-radius: 6px;">
                敷地 ${item.siteTsubo} 坪
              </span>
            </div>
            <div style="font-size: 0.82rem; color: #334155; line-height: 1.7;">
              <div>・建設地住所: <strong>${item.address}</strong> (省エネ: ${item.climateRegion})</div>
              <div>・用途地域: <strong>${item.zone}</strong> (建蔽率${item.kenpeiRate}% / 容積率${item.yousekiRate}%)</div>
              <div>・最大建築可能面積: <strong style="color: #d97706;">${item.maxBuildingAreaTsubo} 坪</strong> ｜ 道路: ${item.roadDirection.toUpperCase()}道路 (${item.roadWidthM}m)</div>
              <div>・離隔距離: <strong>道路20cm標準 / 隣地${item.boundaryMargin}</strong> ｜ 車両配置: ${item.parking}</div>
            </div>
          </div>
        `;
      }

      return `
        <div class="carte-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <div>
              <span style="font-size: 0.72rem; color: #64748b;">保存日時: ${item.createdAt}</span>
              <h4 style="margin: 2px 0 0; color: #0f172a; font-size: 1.05rem;">
                ${item.title || `プラン #${list.length - idx} (バブル作図)`}
              </h4>
            </div>
            <span style="background: #e0f2fe; color: #0369a1; font-weight: 800; font-size: 0.8rem; padding: 3px 10px; border-radius: 6px;">
              延床 ${item.totalTsubo} 坪
            </span>
          </div>
          <div style="font-size: 0.82rem; color: #334155; line-height: 1.7; margin-bottom: 6px;">
            <div>・断熱仕様: <strong>${item.insulationTier}</strong></div>
            <div>・概算本体価格: <strong style="color: #d97706; font-size: 0.95rem;">約 ${item.estPriceMan.toLocaleString()} 万円 (税込・設備機器別途)</strong></div>
            <div>・部屋構成: ${item.rooms}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  setupModals() {
    const btnOpenSurvey = document.getElementById('btn-open-bubble-lifestyle-modal');
    const btnCloseSurvey = document.getElementById('btn-close-lifestyle-modal');
    const modalSurvey = document.getElementById('bubble-lifestyle-modal');
    const formSurvey = document.getElementById('bubble-survey-form');

    if (btnOpenSurvey && modalSurvey) btnOpenSurvey.addEventListener('click', () => { modalSurvey.style.display = 'flex'; });
    if (btnCloseSurvey && modalSurvey) btnCloseSurvey.addEventListener('click', () => { modalSurvey.style.display = 'none'; });
    if (formSurvey && modalSurvey) {
      formSurvey.addEventListener('submit', (e) => {
        e.preventDefault();
        modalSurvey.style.display = 'none';
        alert('🎉 問診要望を反映しました！');
      });
    }

    const btnOpenSecret = document.getElementById('btn-open-bubble-secret-modal');
    const btnCloseSecret = document.getElementById('btn-close-secret-modal');
    const modalSecret = document.getElementById('bubble-secret-modal');
    const formSecret = document.getElementById('bubble-secret-form');

    if (btnOpenSecret && modalSecret) btnOpenSecret.addEventListener('click', () => { modalSecret.style.display = 'flex'; });
    if (btnCloseSecret && modalSecret) btnCloseSecret.addEventListener('click', () => { modalSecret.style.display = 'none'; });
    if (formSecret && modalSecret) {
      formSecret.addEventListener('submit', (e) => {
        e.preventDefault();
        modalSecret.style.display = 'none';
        alert('🔒 シークレット要望を密かに反映しました！');
      });
    }

    // 📋 マイカルテモーダル開閉
    const btnOpenCarte = document.getElementById('btn-open-my-carte-modal');
    const btnOpenCarteTop = document.getElementById('btn-open-my-carte');
    const btnCloseCarte = document.getElementById('btn-close-carte-modal');
    const modalCarte = document.getElementById('bubble-carte-modal');
    const btnClearCarte = document.getElementById('btn-clear-carte');
    const btnCarteContact = document.getElementById('btn-carte-to-contact');

    const openCarteHandler = () => {
      this.renderCarteModalContent();
      if (modalCarte) modalCarte.style.display = 'flex';
    };

    if (btnOpenCarte) btnOpenCarte.addEventListener('click', openCarteHandler);
    if (btnOpenCarteTop) btnOpenCarteTop.addEventListener('click', openCarteHandler);
    if (btnCloseCarte && modalCarte) btnCloseCarte.addEventListener('click', () => { modalCarte.style.display = 'none'; });

    // 📂 端末からカタログ・写真を取り込む（Xserver通信ゼロ・IndexedDB保存）
    const btnTriggerUpload = document.getElementById('btn-trigger-carte-upload');
    const inputCarteFile = document.getElementById('input-carte-file');
    if (btnTriggerUpload && inputCarteFile) {
      btnTriggerUpload.addEventListener('click', () => inputCarteFile.click());
      inputCarteFile.addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
          this.handleLocalCarteFiles(files);
          inputCarteFile.value = '';
        }
      });
    }

    if (btnClearCarte) {
      btnClearCarte.addEventListener('click', () => {
        if (confirm('マイカルテの保存履歴（参考図・間取り・端末カタログ）をすべて消去しますか？')) {
          localStorage.removeItem('smile_user_carte');
          this.clearIndexedDBFiles().then(() => {
            this.renderCarteModalContent();
            this.updateCarteBadge();
          });
        }
      });
    }

    if (btnCarteContact && modalCarte) {
      btnCarteContact.addEventListener('click', () => {
        modalCarte.style.display = 'none';
        if (window.switchPage) window.switchPage('contact');
      });
    }

    // 📷 設計参考図・ネタ帳切り抜きモーダルの開閉とカルテ保存
    const modalTip = document.getElementById('modal-architect-tip');
    const btnCloseTip = document.getElementById('btn-close-tip-modal');
    const btnCloseTipFooter = document.getElementById('btn-close-tip-modal-footer');
    const btnTipSave = document.getElementById('btn-tip-save-to-carte');

    if (btnCloseTip && modalTip) btnCloseTip.addEventListener('click', () => { modalTip.style.display = 'none'; });
    if (btnCloseTipFooter && modalTip) btnCloseTipFooter.addEventListener('click', () => { modalTip.style.display = 'none'; });
    if (btnTipSave) {
      btnTipSave.addEventListener('click', () => {
        this.saveCurrentTipToCarte();
      });
    }
  }

  // ==========================================
  // 9. 住宅設備機器（大手メーカー規格寸法）プリセット制御
  // ==========================================
  getEquipmentPresets(node) {
    if (!node) return null;
    const name = node.name || '';
    const cat = node.category || '';

    // ① システムキッチン (I型2550, L型2550*1800, ワイド2700, アイランド)
    if (name.includes('キッチン') || cat === 'kitchen') {
      return {
        title: '🍳 システムキッチン (大手メーカー規格)',
        presets: [
          { label: 'I型 2550 (基本標準)', wMm: 2550, hMm: 650, desc: 'LIXIL・クリナップ等 最多普及規格 (D650)' },
          { label: 'L型 2550×1800', wMm: 2550, hMm: 1800, desc: '広々作業動線 (W2550×D1800)' },
          { label: 'I型 2700 (ワイド)', wMm: 2700, hMm: 650, desc: '調理台ゆったり (D650)' },
          { label: 'アイランド 2550', wMm: 2550, hMm: 970, desc: '対面開放型フラット (D970)' }
        ]
      };
    }

    // ② ユニットバス / UB (1616基本、1620広々)
    if (name.includes('風呂') || name.includes('浴室') || name.includes('UB') || cat === 'bath') {
      return {
        title: '🛁 システムバス・UB (規格寸法)',
        presets: [
          { label: 'UB 1616 (1坪標準)', wMm: 1820, hMm: 1820, desc: 'TOTOサザナ/LIXILリデア 1616 (内寸1.6×1.6m)' },
          { label: 'UB 1620 (1.25坪広々)', wMm: 1820, hMm: 2275, desc: '洗い場ゆったり (内寸1.6×2.0m)' }
        ]
      };
    }

    // ③ システム洗面化粧台 (シングルW750, ダブルW1600, W900, W1200)
    if (name.includes('洗面') || name.includes('脱衣') || cat === 'washroom') {
      return {
        title: '🪞 システム洗面化粧台 (規格寸法)',
        presets: [
          { label: 'シングルボウル W750', wMm: 750, hMm: 550, desc: '標準75cmタイプ (D550)' },
          { label: 'ダブルボウル W1600', wMm: 1600, hMm: 550, desc: '朝の混雑解消 2ボウル並列 (D550)' },
          { label: 'ワイドシングル W900', wMm: 900, hMm: 550, desc: 'ゆったりカウンター90cm (D550)' },
          { label: 'ホテルライク W1200', wMm: 1200, hMm: 550, desc: 'ドレッサー兼用120cm (D550)' }
        ]
      };
    }

    // ④ トイレ (タンクレストイレ基本)
    if (name.includes('トイレ') || name.includes('便所') || cat === 'toilet') {
      return {
        title: '🚽 トイレ (タンクレストイレ規格)',
        presets: [
          { label: 'タンクレス標準 (0.5坪)', wMm: 910, hMm: 1820, desc: 'TOTOネオレスト/サティス (910×1820)' },
          { label: '手洗い別・コンパクト (0.4坪)', wMm: 850, hMm: 1365, desc: '省スペース設計 (850×1365)' },
          { label: '広々バリアフリー (0.75坪)', wMm: 1365, hMm: 1820, desc: '車椅子・手すり・介助対応' }
        ]
      };
    }

    // ⑤ 階段 (回り階段1坪、直階段スリム/ゆったり、折り返し1.25坪)
    if (this.isStairs(node)) {
      return {
        title: '🪜 階段室 (規格モジュール)',
        presets: [
          { label: '回り階段 (1坪標準)', wMm: 1820, hMm: 1820, desc: 'U字/かね折れ 1坪タイプ (1820×1820)' },
          { label: '直階段 (スリム)', wMm: 910, hMm: 2730, desc: 'ストレート直階段 (910×2730)' },
          { label: '直階段 (緩やか)', wMm: 910, hMm: 3185, desc: '緩やか勾配 (910×3185)' },
          { label: '折り返し階段 (1.25坪)', wMm: 1820, hMm: 2275, desc: '踊り場付き安全動線 (1820×2275)' }
        ]
      };
    }

    return null;
  }

  updateEquipmentPresetsUI(node) {
    const wrap = document.getElementById('inspect-equipment-tools');
    const titleEl = document.getElementById('inspect-equipment-title');
    const btnContainer = document.getElementById('inspect-equipment-buttons');
    if (!wrap || !btnContainer) return;

    const data = this.getEquipmentPresets(node);
    if (!data) {
      wrap.style.display = 'none';
      return;
    }

    wrap.style.display = 'block';
    if (titleEl) titleEl.textContent = data.title;

    btnContainer.innerHTML = data.presets.map((p, idx) => `
      <button type="button" class="btn btn-sm btn-equipment-preset" data-idx="${idx}" style="background: #ffffff; border: 1.5px solid #86efac; color: #166534; font-size: 0.72rem; font-weight: 800; padding: 5px 6px; border-radius: 6px; text-align: left; line-height: 1.3;" title="${p.desc}">
        <div style="font-weight: 900;">${p.label}</div>
        <div style="font-size: 0.65rem; color: #15803d; font-weight: 600;">${p.wMm}×${p.hMm}mm</div>
      </button>
    `).join('');

    btnContainer.querySelectorAll('.btn-equipment-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        const preset = data.presets[idx];
        if (!preset || !this.selectedItem) return;

        this.applyEquipmentPreset(this.selectedItem, preset);
      });
    });
  }

  applyEquipmentPreset(node, preset) {
    node.wMm = preset.wMm;
    node.hMm = preset.hMm;
    const sqm = (node.wMm * node.hMm) / 1000000;
    node.tatami = +(sqm / 1.65).toFixed(1);

    const pxPerMm = (this.baseBuildingBox && this.baseBuildingBox.pxPerMm) ? this.baseBuildingBox.pxPerMm : 0.032;
    node.w = Math.max(18, Math.round(node.wMm * pxPerMm));
    node.h = Math.max(18, Math.round(node.hMm * pxPerMm));
    node.radius = Math.round(Math.hypot(node.w, node.h) / 2);

    if (this.isStairs(node)) {
      this.syncStairsDimensions(node);
    }

    this.updateNodeInspectPanel(node);
    this.updateMetrics();
    this.clampNodesToBuildingBox();
  }

  // ==========================================
  // 10. 設計参考図・ネタ帳切り抜きオンデマンドモーダル
  // ==========================================
  showArchitectTipModal(node) {
    const modal = document.getElementById('modal-architect-tip');
    const body = document.getElementById('tip-modal-body');
    const titleEl = document.getElementById('tip-modal-title');
    const subtitleEl = document.getElementById('tip-modal-subtitle');
    const saveBtn = document.getElementById('btn-tip-save-to-carte');
    if (!modal || !body) return;

    this.currentInspectedTip = this.getTipDataForNode(node);
    const tip = this.currentInspectedTip;

    if (titleEl) titleEl.textContent = tip.title;
    if (subtitleEl) subtitleEl.textContent = tip.subtitle;

    body.innerHTML = `
      <div style="display: flex; gap: 16px; margin-bottom: 1rem; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 260px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px;">
          <div style="font-size: 0.8rem; font-weight: 800; color: #0284c7; margin-bottom: 6px;">📐 標準モジュール寸法 ＆ 動線幅</div>
          <div style="font-size: 0.82rem; color: #334155; line-height: 1.7;">
            ${tip.dimensionsHtml}
          </div>
        </div>
        <div style="flex: 1; min-width: 260px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 12px;">
          <div style="font-size: 0.8rem; font-weight: 800; color: #b45309; margin-bottom: 6px;">💡 住ま居るAI建築士の黄金則ノウハウ</div>
          <div style="font-size: 0.82rem; color: #78350f; line-height: 1.7;">
            ${tip.knowhowHtml}
          </div>
        </div>
      </div>

      <!-- 切り抜き参考図面 / 概念スケッチ -->
      <div style="background: #0f172a; border-radius: 12px; padding: 16px; text-align: center; color: #e2e8f0;">
        <div style="font-size: 0.76rem; font-weight: 700; color: #38bdf8; margin-bottom: 10px; display: flex; justify-content: space-between;">
          <span>📷 設計参考図・切り抜きスケッチ</span>
          <span>株式会社住ま居る 黄金パターン集</span>
        </div>
        <div style="background: #1e293b; border: 1px dashed #475569; border-radius: 8px; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 180px;">
          ${tip.svgGraphic}
        </div>
        <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 8px;">
          ※この参考図をマイカルテに保存しておくと、後からいつでも見返して設計打ち合わせに使えます。
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  }

  getTipDataForNode(node) {
    const name = node.name || '';
    const cat = node.category || '';
    const eqType = node.equipmentType || '';
    const spec = node.spec || '';

    // 🔥 バイオエタノール暖炉 (Table 5)
    if (name.includes('暖炉') || eqType === 'bio_fireplace' || spec.includes('暖炉')) {
      return {
        key: 'bio_fireplace',
        title: `🔥 ${name}の設計参考図・ネタ帳切り抜き`,
        subtitle: '【Table 5】煙突不要・煤ゼロ・都市型住宅＆西川材リビングに映えるエコ暖炉',
        dimensionsHtml: `
          <div>・<strong>標準ユニット寸法</strong>: 間口910mm × 奥行455mm (壁埋込・自立型)</div>
          <div>・<strong>安全離隔距離</strong>: 上部1,000mm以上、周囲500mm以上の不燃仕上げ</div>
          <div>・<strong>燃料・給排気</strong>: 植物由来バイオエタノール（煙突・排気ダクト工事不要）</div>
          <div>・<strong>燃焼時間</strong>: 1回の給油(約2〜3L)で約5〜7時間持続燃焼</div>
        `,
        knowhowHtml: `
          <div>・排煙やススが出ず、発生するのは二酸化炭素と水蒸気のみ。冬場の室内を適度に加湿する効果もあります。</div>
          <div>・本物の炎の「1/fゆらぎ」が、西川材のヒノキ・スギに包まれた空間で至高のリラクゼーションをもたらします。</div>
          <div>・高気密・高断熱住宅(HEAT20 G2.5)では短時間で十分な暖房効果を発揮。設置場所の背面に大谷石や調湿タイルをあしらうとデザイン性が飛躍します。</div>
        `,
        svgGraphic: `
          <svg viewBox="0 0 360 160" width="100%" height="150" style="background:#0f172a;">
            <rect x="50" y="25" width="260" height="110" rx="6" fill="#1e293b" stroke="#f97316" stroke-width="2"/>
            <rect x="80" y="45" width="200" height="70" rx="4" fill="#0f172a" stroke="#475569" stroke-width="1.5"/>
            <path d="M 160 100 Q 170 65 180 50 Q 190 70 200 100 Z" fill="url(#fireGrad)"/>
            <path d="M 145 105 Q 155 75 165 65 Q 175 80 185 105 Z" fill="#fb923c" opacity="0.8"/>
            <path d="M 175 105 Q 185 75 195 65 Q 205 80 215 105 Z" fill="#fdba74" opacity="0.8"/>
            <defs>
              <linearGradient id="fireGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stop-color="#ef4444"/>
                <stop offset="50%" stop-color="#f97316"/>
                <stop offset="100%" stop-color="#fde047"/>
              </linearGradient>
            </defs>
            <text x="180" y="135" fill="#f97316" font-size="11" font-weight="bold" text-anchor="middle">バイオエタノール暖炉 (W910×D455)</text>
            <text x="180" y="38" fill="#94a3b8" font-size="9" text-anchor="middle">周囲500mm不燃壁仕上げ（大谷石・タイル）</text>
          </svg>
        `
      };
    }

    // 🌾 小上がり畳スペース（下部引出収納付） (Table 3)
    if (name.includes('小上がり') || name.includes('畳') || (cat === 'japanese' && name.includes('収納'))) {
      return {
        key: 'tatami_storage',
        title: `🌾 ${name}の設計参考図・ネタ帳切り抜き`,
        subtitle: '【Table 3】段差300〜400mmの黄金比 ＆ 大容量下部引き出し収納・頭打ち配慮',
        dimensionsHtml: `
          <div>・<strong>段差高さ</strong>: 300〜400mm (ソファ・椅子代わりに座りやすいベスト寸法)</div>
          <div>・<strong>下部収納有効高</strong>: 深さ200〜250mm × 奥行600〜800mmのキャスター付大容量引出</div>
          <div>・<strong>広さ目安</strong>: 3.0〜4.5帖 (2,730×2,730mm または 1,820×2,730mm)</div>
          <div>・<strong>有効天井高</strong>: 2,000〜2,100mm（一般天井高2,400mm時。折り上げ天井推奨）</div>
        `,
        knowhowHtml: `
          <div>・リビング床から35cm上げることで、座った人とソファに座る人の視線の高さが揃い、会話が自然に弾みます。</div>
          <div>・下部に季節の毛布や子どものおもちゃ、非常時備蓄を丸ごと収納できるため、LDKが常に片付きます。</div>
          <div>・下がり壁やルーバー格子を設けることで、LDKと一体でありながら程よい独立性（お昼寝・スタディ・来客宿泊）を確保できます。</div>
        `,
        svgGraphic: `
          <svg viewBox="0 0 380 160" width="100%" height="150" style="background:#0f172a;">
            <rect x="20" y="120" width="100" height="20" fill="#334155"/>
            <text x="70" y="135" fill="#94a3b8" font-size="10" text-anchor="middle">LDK床 (FL±0)</text>
            <rect x="120" y="80" width="230" height="40" rx="3" fill="#166534" stroke="#4ade80" stroke-width="1.5"/>
            <text x="235" y="105" fill="#f0fdf4" font-size="12" font-weight="bold" text-anchor="middle">小上がり畳フロア (4.5帖 / FL+350mm)</text>
            <rect x="130" y="120" width="100" height="25" rx="3" fill="#b45309" stroke="#fde68a" stroke-width="1"/>
            <text x="180" y="137" fill="#fff" font-size="9" font-weight="bold" text-anchor="middle">大容量引出収納 A</text>
            <rect x="240" y="120" width="100" height="25" rx="3" fill="#b45309" stroke="#fde68a" stroke-width="1"/>
            <text x="290" y="137" fill="#fff" font-size="9" font-weight="bold" text-anchor="middle">大容量引出収納 B</text>
            <line x1="110" y1="80" x2="110" y2="120" stroke="#facc15" stroke-width="2"/>
            <text x="95" y="102" fill="#facc15" font-size="9" font-weight="bold" text-anchor="end">H:350mm</text>
          </svg>
        `
      };
    }

    // 🌿 尺庭（90cmの坪庭・反射光）/ 中庭 (Table 6)
    if (name.includes('尺庭') || name.includes('坪庭') || name.includes('中庭') || cat === 'garden') {
      return {
        key: 'garden_shakuniwa',
        title: `🌿 ${name}の設計参考図・ネタ帳切り抜き`,
        subtitle: '【Table 6】わずか900mm(半間)の隙間で北側・密集地に劇的な自然光を取り込む光庭',
        dimensionsHtml: `
          <div>・<strong>尺庭スリムモジュール</strong>: 幅910mm × 奥行1,820〜2,730mm（半間サイズで成立）</div>
          <div>・<strong>開口部設計</strong>: 地窓（足元サッシ H400mm）またはハイサイドライト＋FIXガラス</div>
          <div>・<strong>反射白壁</strong>: 外壁側を白漆喰・ホワイトガルバにしてバウンド光を室内に導入</div>
          <div>・<strong>植栽計画</strong>: アオダモ・モミジ・シダ・苔＋白砂利（日陰に強い陰樹を選定）</div>
        `,
        knowhowHtml: `
          <div>・隣家が迫る都市部や北側玄関・廊下でも、わずか90cmの隙間に「尺庭」を穿つだけで劇的な明るさと奥行きが生まれます。</div>
          <div>・外からの視線を遮るルーバーや板塀を設ければ、カーテンを開け放ったまま空と緑を愉しむ贅沢な暮らしが実現。</div>
          <div>・夜間は低位置からのアップライト照明で樹木の影を室内の珪藻土壁に投影。幻想的な陰影美を楽しめます。</div>
        `,
        svgGraphic: `
          <svg viewBox="0 0 380 160" width="100%" height="150" style="background:#0f172a;">
            <rect x="30" y="20" width="120" height="110" fill="#1e293b" stroke="#64748b"/>
            <text x="90" y="70" fill="#94a3b8" font-size="11" text-anchor="middle">室内 (LDK/玄関)</text>
            <rect x="150" y="20" width="80" height="110" fill="#064e3b" stroke="#34d399" stroke-width="2"/>
            <circle cx="190" cy="65" r="18" fill="#059669"/>
            <text x="190" y="70" fill="#ecfdf5" font-size="9" font-weight="bold" text-anchor="middle">シンボル樹</text>
            <text x="190" y="110" fill="#a7f3d0" font-size="9" text-anchor="middle">白砂利・苔</text>
            <rect x="230" y="20" width="15" height="110" fill="#f8fafc"/>
            <text x="255" y="75" fill="#f8fafc" font-size="8">反射白壁 (バウンド光)</text>
            <line x1="150" y1="140" x2="230" y2="140" stroke="#38bdf8" stroke-width="2"/>
            <text x="190" y="152" fill="#38bdf8" font-size="9" font-weight="bold" text-anchor="middle">幅900mm(半間)</text>
            <line x1="150" y1="85" x2="150" y2="125" stroke="#38bdf8" stroke-width="4"/>
            <text x="135" y="105" fill="#38bdf8" font-size="8" text-anchor="end">地窓ピクチャー</text>
          </svg>
        `
      };
    }

    // 🧺 室内干しランドリールーム (Table 2 & Table 8)
    if (name.includes('ランドリー') || name.includes('物干し') || (cat === 'sanitary' && name.includes('干し'))) {
      return {
        key: 'laundry_room',
        title: `🧺 ${name}の設計参考図・ネタ帳切り抜き`,
        subtitle: '【Table 2】洗う・干す・畳む・仕舞うが0歩で完結する共働き家事ラク動線',
        dimensionsHtml: `
          <div>・<strong>推奨広さ</strong>: 2.0〜3.0帖 (1,820×1,820mm または 1,820×2,730mm)</div>
          <div>・<strong>室内物干しバー</strong>: 長さ1,800mm × 2本（天井高H1,850〜1,900mm設定で手が届きやすい）</div>
          <div>・<strong>作業カウンター</strong>: 間口1,200mm × 奥行600mm × 高さ850mm（下部に衣装ケース）</div>
          <div>・<strong>サーキュレーター・換気</strong>: 排気ファン対角配置で室内干し乾燥時間約3〜4時間</div>
        `,
        knowhowHtml: `
          <div>・洗濯機から取り出してその場で真上のバーに干せるため、重い洗濯籠を持って歩く重労働がゼロになります。</div>
          <div>・隣にファミリークローゼット（FCL）を配置することで、乾いた衣類をハンガーのままスライド収納可能。</div>
          <div>・HEAT20 G2.5の高断熱住宅は冬場も室温が一定で空気が乾燥しやすいため、室内干しが最も早くカラッと乾きます。</div>
        `,
        svgGraphic: `
          <svg viewBox="0 0 380 160" width="100%" height="150" style="background:#0f172a;">
            <rect x="30" y="20" width="320" height="115" rx="6" fill="#134e4a" stroke="#2dd4bf" stroke-width="2"/>
            <rect x="45" y="40" width="55" height="55" rx="4" fill="#0f766e" stroke="#5eead4"/>
            <circle cx="72" cy="67" r="16" fill="#ccfbf1"/>
            <text x="72" y="71" fill="#0f766e" font-size="8" font-weight="bold" text-anchor="middle">洗濯乾燥</text>
            <rect x="110" y="40" width="80" height="55" rx="3" fill="#2dd4bf"/>
            <text x="150" y="65" fill="#042f2e" font-size="9" font-weight="bold" text-anchor="middle">アイロン・畳み</text>
            <text x="150" y="80" fill="#042f2e" font-size="8" text-anchor="middle">カウンター</text>
            <line x1="205" y1="45" x2="330" y2="45" stroke="#fef08a" stroke-width="3" stroke-dasharray="4,2"/>
            <line x1="205" y1="75" x2="330" y2="75" stroke="#fef08a" stroke-width="3" stroke-dasharray="4,2"/>
            <text x="267" y="62" fill="#fef08a" font-size="9" font-weight="bold" text-anchor="middle">室内物干しパイプ 2列 (H1850)</text>
            <text x="267" y="115" fill="#a7f3d0" font-size="10" font-weight="bold" text-anchor="middle">➡️ 隣のファミリークローゼットへ直結0歩</text>
          </svg>
        `
      };
    }

    // 👞 土間SIC（シューズインクローゼット / 2way玄関） (Table 1)
    if (name.includes('SIC') || name.includes('土間収納') || name.includes('シューズ')) {
      return {
        key: 'genkan_sic',
        title: `👞 ${name}の設計参考図・ネタ帳切り抜き`,
        subtitle: '【Table 1】家族動線と来客動線を分離する2way動線 ＆ ベビーカー・アウター収納',
        dimensionsHtml: `
          <div>・<strong>標準広さ</strong>: 1.5〜2.5帖 (1,365×1,820mm または 1,820×1,820mm)</div>
          <div>・<strong>可動靴棚</strong>: 奥行300〜350mm × ピッチ150〜200mm (約40〜60足収納)</div>
          <div>・<strong>コート・アウター掛けパイプ</strong>: 奥行500〜600mm × 高さ1,100〜1,700mm</div>
          <div>・<strong>土間直置きエリア</strong>: 幅900mm以上（ベビーカー、ゴルフバッグ、アウトドア用品）</div>
        `,
        knowhowHtml: `
          <div>・「来客動線（メイン玄関）」と「家族動線（SIC経由）」を分けることで、メイン玄関には一足も靴が出ないホテルライクな美観をキープ。</div>
          <div>・花粉や雨で濡れた上着をLDKに持ち込まず、玄関土間で脱いで掛けられるクリーン動線。</div>
          <div>・引き戸を1枚設けるだけで、急な来客時も土間収納の中身を瞬時に目隠しできます。</div>
        `,
        svgGraphic: `
          <svg viewBox="0 0 380 160" width="100%" height="150" style="background:#0f172a;">
            <rect x="30" y="25" width="150" height="110" rx="4" fill="#0284c7" stroke="#38bdf8" stroke-width="2"/>
            <text x="105" y="50" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle">メイン玄関（来客動線）</text>
            <text x="105" y="75" fill="#bae6fd" font-size="9" text-anchor="middle">靴が出ないスッキリ土間</text>
            <rect x="200" y="25" width="150" height="110" rx="4" fill="#0369a1" stroke="#38bdf8" stroke-width="2"/>
            <text x="275" y="50" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle">土間SIC（家族動線）</text>
            <text x="275" y="75" fill="#fde047" font-size="8" text-anchor="middle">可動靴棚(D300) / アウター掛け</text>
            <text x="275" y="95" fill="#fde047" font-size="8" text-anchor="middle">ベビーカー・ゴルフバッグ直置</text>
            <path d="M 105 105 C 105 130 275 130 275 105" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="3,3"/>
            <text x="190" y="132" fill="#38bdf8" font-size="8" text-anchor="middle">ウォークスルー2way動線</text>
          </svg>
        `
      };
    }

    // 🪵 天然木ウッドデッキ (Table 7)
    if (name.includes('デッキ') || cat === 'deck' || (cat === 'outdoor' && name.includes('デッキ'))) {
      return {
        key: 'wood_deck',
        title: `🪵 ${name}の設計参考図・ネタ帳切り抜き`,
        subtitle: '【Table 7】埼玉県産西川材ヒノキの心地よさ ＆ 軒・庇による耐久性向上と内陸気候対策',
        dimensionsHtml: `
          <div>・<strong>標準寸法</strong>: 間口2,730〜3,640mm × 出幅1,820〜2,730mm (3〜6帖)</div>
          <div>・<strong>床段差</strong>: LDKフローリングと同一高さ（サッシ下枠フラットレール納まり）</div>
          <div>・<strong>軒の出幅</strong>: 900〜1,200mm以上（直射雨を防ぎ木材寿命を大幅延伸）</div>
        `,
        knowhowHtml: `
          <div>・樹脂（人工木）デッキは夏の炎天下で表面温度が60℃近くまで上昇し素足で歩けませんが、天然西川材なら熱を溜め込まずサラリと心地よい足触りを維持。</div>
          <div>・深い軒と組み合わせることで、夏の強烈な直射日光を遮り、冬の暖かい日射をリビング奥まで届けます。</div>
          <div>・リビングの窓を開け放つと室内と一体化し、休日のBBQや青空カフェとして第2のリビングになります。</div>
        `,
        svgGraphic: `
          <svg viewBox="0 0 380 160" width="100%" height="150" style="background:#0f172a;">
            <rect x="30" y="30" width="140" height="90" fill="#334155" stroke="#64748b"/>
            <text x="100" y="75" fill="#f8fafc" font-size="11" font-weight="bold" text-anchor="middle">LDK (フローリング)</text>
            <rect x="180" y="30" width="170" height="90" fill="#78350f" stroke="#d97706" stroke-width="2"/>
            <text x="265" y="65" fill="#fef3c7" font-size="11" font-weight="bold" text-anchor="middle">西川材ウッドデッキ (天然木)</text>
            <text x="265" y="85" fill="#fde68a" font-size="8" text-anchor="middle">フラット段差ゼロ納まり</text>
            <line x1="100" y1="15" x2="280" y2="15" stroke="#f59e0b" stroke-width="3"/>
            <text x="285" y="18" fill="#f59e0b" font-size="8">深庇 1,200mm</text>
          </svg>
        `
      };
    }

    if (name.includes('キッチン') || cat === 'kitchen') {
      return {
        key: 'kitchen',
        title: `🍳 ${name}の設計参考図・ネタ帳切り抜き`,
        subtitle: '大手メーカー標準規格（I型2550 / L型2550×1800）と作業動線',
        dimensionsHtml: `
          <div>・<strong>I型基本寸法</strong>: 間口2,550mm × 奥行650mm</div>
          <div>・<strong>L型基本寸法</strong>: 2,550mm × 1,800mm (コーナースペース有効活用)</div>
          <div>・<strong>通路幅</strong>: 900mm〜1,000mm (2人ですれ違えるゆとり)</div>
          <div>・<strong>ワークトライアングル</strong>: シンク・コンロ・冷蔵庫の合計距離 3.6m〜6.0m</div>
        `,
        knowhowHtml: `
          <div>・冷蔵庫は「キッチン奥」ではなく「手前（入口側）」に置くと、調理中の人と家族の動線が交錯しません。</div>
          <div>・パントリー（食品庫）を隣接させると、まとめ買いのストックが美しく収まります。</div>
          <div>・西川材の無垢カウンターを対面に設けると、朝食や配膳がスムーズになります。</div>
        `,
        svgGraphic: `
          <svg viewBox="0 0 400 160" width="100%" max-width="360" height="150" style="background:#0f172a;">
            <rect x="20" y="20" width="220" height="50" rx="4" fill="#f59e0b" stroke="#fbbf24" stroke-width="2"/>
            <text x="130" y="50" fill="#0f172a" font-size="12" font-weight="bold" text-anchor="middle">システムキッチン I型 2550mm</text>
            <circle cx="50" cy="45" r="14" fill="#38bdf8"/>
            <text x="50" y="49" fill="#0f172a" font-size="9" font-weight="bold" text-anchor="middle">シンク</text>
            <rect x="190" y="32" width="35" height="26" rx="2" fill="#ef4444"/>
            <text x="207" y="48" fill="#fff" font-size="8" font-weight="bold" text-anchor="middle">IH</text>
            <!-- 背面カップボード -->
            <rect x="20" y="110" width="220" height="35" rx="4" fill="#64748b" stroke="#94a3b8" stroke-width="1.5"/>
            <text x="130" y="132" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle">背面食器棚・家電カウンター (D450)</text>
            <!-- 通路寸法線 -->
            <line x1="260" y1="70" x2="260" y2="110" stroke="#38bdf8" stroke-dasharray="3,3"/>
            <text x="270" y="93" fill="#38bdf8" font-size="10" font-weight="bold">通路幅 950mm</text>
          </svg>
        `
      };
    }

    if (name.includes('風呂') || name.includes('浴室') || name.includes('UB') || cat === 'bath') {
      return {
        key: 'bath',
        title: `🛁 ${name}の設計参考図・ネタ帳切り抜き`,
        subtitle: '1616（1坪標準）および1620（1.25坪ゆったり）モジュール基準',
        dimensionsHtml: `
          <div>・<strong>1616サイズ (1坪)</strong>: 柱芯 1,820mm × 1,820mm (内寸 1,600×1,600mm)</div>
          <div>・<strong>1620サイズ (1.25坪)</strong>: 柱芯 1,820mm × 2,275mm (内寸 1,600×2,000mm)</div>
          <div>・<strong>出入口ドア</strong>: 有効開口650mm以上 (引き戸推奨で転倒時救出も安心)</div>
        `,
        knowhowHtml: `
          <div>・北側配置が定番ですが、東側や南側に配して朝日が入る爽快バスルームも人気です。</div>
          <div>・高断熱浴槽＋断熱ふろフタで4時間後のお湯の温度低下をわずか2.5℃以内に抑制。</div>
          <div>・脱衣室との温度差をなくすことで、冬場のヒートショックをゼロにします。</div>
        `,
        svgGraphic: `
          <svg viewBox="0 0 320 160" width="100%" height="150" style="background:#0f172a;">
            <rect x="50" y="15" width="130" height="130" rx="6" fill="#0284c7" stroke="#38bdf8" stroke-width="2"/>
            <text x="115" y="40" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle">UB 1616 (1坪)</text>
            <rect x="65" y="55" width="100" height="50" rx="8" fill="#bae6fd"/>
            <text x="115" y="85" fill="#0369a1" font-size="10" font-weight="bold" text-anchor="middle">浴槽 (高断熱)</text>
            <text x="200" y="80" fill="#38bdf8" font-size="11" font-weight="bold">1,820 × 1,820mm</text>
          </svg>
        `
      };
    }

    if (name.includes('洗面') || name.includes('脱衣') || cat === 'washroom') {
      return {
        key: 'washroom',
        title: `🪞 ${name}の設計参考図・ネタ帳切り抜き`,
        subtitle: 'シングルボウルW750・ダブルボウルW1600および脱衣室セパレート',
        dimensionsHtml: `
          <div>・<strong>シングルボウル</strong>: W750mm × D550mm (標準) / W900mm (ゆったり)</div>
          <div>・<strong>ダブルボウル</strong>: W1,600mm × D550mm (2人同時に歯磨き・メイク)</div>
          <div>・<strong>脱衣室分離</strong>: 洗面所と脱衣室を分けることで入浴中のプライバシーを完全確保</div>
        `,
        knowhowHtml: `
          <div>・ランドリールーム（室内物干し・ファミクロ）と一直線につなぐと、洗う・干す・畳むが0歩で完結。</div>
          <div>・帰宅時動線：玄関からLDKを通らずに直接洗面所に直行できるウイルス対策動線。</div>
        `,
        svgGraphic: `
          <svg viewBox="0 0 340 150" width="100%" height="140" style="background:#0f172a;">
            <rect x="30" y="25" width="180" height="55" rx="4" fill="#059669" stroke="#34d399" stroke-width="2"/>
            <circle cx="75" cy="52" r="16" fill="#ecfdf5"/>
            <circle cx="165" cy="52" r="16" fill="#ecfdf5"/>
            <text x="75" y="56" fill="#065f46" font-size="8" font-weight="bold" text-anchor="middle">ボウル1</text>
            <text x="165" y="56" fill="#065f46" font-size="8" font-weight="bold" text-anchor="middle">ボウル2</text>
            <text x="120" y="110" fill="#34d399" font-size="11" font-weight="bold" text-anchor="middle">ダブルボウル W1600mm × D550mm</text>
          </svg>
        `
      };
    }

    if (name.includes('トイレ') || name.includes('便所') || cat === 'toilet') {
      return {
        key: 'toilet',
        title: `🚽 ${name}の設計参考図・ネタ帳切り抜き`,
        subtitle: 'タンクレストイレ標準（0.5坪）および手洗い別コンパクト（0.4坪）',
        dimensionsHtml: `
          <div>・<strong>標準0.5坪</strong>: 柱芯 910mm × 1,820mm (内寸 約780×1,690mm)</div>
          <div>・<strong>コンパクト0.4坪</strong>: 850mm × 1,365mm (タンクレストイレ＋埋込手洗い器)</div>
          <div>・<strong>立ち座り前方寸法</strong>: 便器先端からドアまで450mm以上を確保</div>
        `,
        knowhowHtml: `
          <div>・タンクレスを採用することで、奥行きがスッキリし空間が広く感じられます。</div>
          <div>・珪藻土の塗り壁を背面に採用することで、自然な消臭・調湿効果を発揮します。</div>
          <div>・引き戸にすることで、万が一の転倒時にも外側から安全に開閉可能。</div>
        `,
        svgGraphic: `
          <svg viewBox="0 0 300 150" width="100%" height="140" style="background:#0f172a;">
            <rect x="90" y="15" width="60" height="120" rx="4" fill="#475569" stroke="#94a3b8" stroke-width="1.5"/>
            <ellipse cx="120" cy="50" rx="18" ry="24" fill="#f8fafc"/>
            <text x="120" y="53" fill="#0f172a" font-size="7" font-weight="bold" text-anchor="middle">タンクレス</text>
            <rect x="95" y="95" width="16" height="25" rx="2" fill="#38bdf8"/>
            <text x="103" y="110" fill="#0f172a" font-size="6" font-weight="bold" text-anchor="middle">手洗</text>
            <text x="195" y="75" fill="#38bdf8" font-size="10" font-weight="bold">910 × 1,820mm</text>
          </svg>
        `
      };
    }

    if (this.isStairs(node)) {
      return {
        key: 'stairs',
        title: `🪜 ${name}の設計参考図・ネタ帳切り抜き`,
        subtitle: '1坪回り階段 / 直階段 / リビングイン階段と安全蹴上・踏面基準',
        dimensionsHtml: `
          <div>・<strong>回り階段 (1坪)</strong>: 柱芯 1,820mm × 1,820mm (13〜14段上がり)</div>
          <div>・<strong>直階段 (スリム)</strong>: 柱芯 910mm × 2,730mm〜3,185mm</div>
          <div>・<strong>建築基準法 vs 住ま居る安全基準</strong>:</div>
          <div>　住ま居る基準：蹴上（高さ）200mm以下、踏面（奥行）220mm以上で高齢者も安心。</div>
        `,
        knowhowHtml: `
          <div>・「リビングイン階段」にすると家族の自然なコミュニケーションが生まれます。</div>
          <div>・HEAT20 G2.5の高断熱・高気密住宅なら、階段室を通じた上下階の温度差がほぼゼロ（2℃以内）のため、吹き抜けやリビング階段でも寒くなりません！</div>
          <div>・階段下は「ルンバ基地」「パントリー」「トイレスペース」として有効活用。</div>
        `,
        svgGraphic: `
          <svg viewBox="0 0 340 150" width="100%" height="140" style="background:#0f172a;">
            <rect x="40" y="20" width="110" height="110" rx="4" fill="#0369a1" stroke="#38bdf8" stroke-width="2"/>
            <line x1="95" y1="20" x2="95" y2="130" stroke="#bae6fd" stroke-width="1.5"/>
            <line x1="40" y1="75" x2="150" y2="75" stroke="#bae6fd" stroke-width="1.5"/>
            <text x="67" y="52" fill="#fff" font-size="9" font-weight="bold" text-anchor="middle">1〜4段</text>
            <text x="122" y="52" fill="#fff" font-size="9" font-weight="bold" text-anchor="middle">5〜7段</text>
            <text x="122" y="105" fill="#fff" font-size="9" font-weight="bold" text-anchor="middle">8〜10段</text>
            <text x="67" y="105" fill="#fff" font-size="9" font-weight="bold" text-anchor="middle">11〜14段(UP)</text>
            <text x="210" y="75" fill="#38bdf8" font-size="11" font-weight="bold">1,820 × 1,820mm</text>
          </svg>
        `
      };
    }

    // デフォルト（居室・LDK等）
    return {
      key: 'general',
      title: `🏠 ${name}の設計参考図・ネタ帳切り抜き`,
      subtitle: '空間の心地よさと採光・通風のプロのレイアウト黄金則',
      dimensionsHtml: `
        <div>・<strong>設計モジュール</strong>: 日本の伝統尺モジュール（910mm単位 / 227.5mmピッチ）</div>
        <div>・<strong>帖数と面積</strong>: 1帖 ＝ 約1.65㎡ (例: 16帖＝約26.4㎡, 20帖＝約33.0㎡)</div>
        <div>・<strong>天井高</strong>: 標準2,400mm (勾配天井・折り上げ天井で開放感を演出)</div>
      `,
      knowhowHtml: `
        <div>・南面の大きな窓からの日射取得と、夏場の日射遮蔽（軒・庇の深さ設計）がパッシブデザインの要。</div>
        <div>・西川材の無垢床と呼吸する珪藻土が、室内の湿度を常に40〜60%の快適帯に保ちます。</div>
      `,
      svgGraphic: `
        <svg viewBox="0 0 320 140" width="100%" height="130" style="background:#0f172a;">
          <rect x="50" y="20" width="220" height="90" rx="6" fill="#334155" stroke="#94a3b8" stroke-width="1.5"/>
          <text x="160" y="70" fill="#f8fafc" font-size="13" font-weight="bold" text-anchor="middle">${name} (${node.tatami}帖)</text>
        </svg>
      `
    };
  }

  saveCurrentTipToCarte() {
    if (!this.currentInspectedTip) return;
    const tip = this.currentInspectedTip;
    const item = {
      id: 'tip_' + Date.now(),
      type: 'architect_tip',
      title: tip.title,
      subtitle: tip.subtitle,
      dimensionsHtml: tip.dimensionsHtml,
      knowhowHtml: tip.knowhowHtml,
      svgGraphic: tip.svgGraphic,
      createdAt: new Date().toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    const list = this.getCarteList();
    list.unshift(item);
    localStorage.setItem('smile_user_carte', JSON.stringify(list));

    const saveText = document.getElementById('btn-tip-save-text');
    if (saveText) {
      saveText.textContent = '✅ マイカルテに保存しました！';
      setTimeout(() => { saveText.textContent = 'マイカルテに保存'; }, 2000);
    }
    this.updateCarteBadge();
  }

  // ==========================================
  // 11. ユーザー端末（ローカル保存・IndexedDB）カタログ・写真管理
  // ==========================================
  async handleLocalCarteFiles(files) {
    const db = await this.openCarteDB();
    for (const file of files) {
      const record = {
        id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: file.name,
        size: file.size,
        type: file.type,
        data: file, // Blobをそのまま安全にローカル保存
        createdAt: new Date().toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      };
      await this.saveFileToDB(db, record);
    }
    alert(`🎉 ${files.length}件のカタログ・写真を端末マイカルテ（IndexedDB）に安全保存しました！`);
    this.renderCarteModalContent();
    this.updateCarteBadge();
  }

  openCarteDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('SumaileUserCarteDB', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('carte_files')) {
          db.createObjectStore('carte_files', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  saveFileToDB(db, record) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('carte_files', 'readwrite');
      const store = tx.objectStore('carte_files');
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  getAllFilesFromDB() {
    return new Promise(async (resolve) => {
      try {
        const db = await this.openCarteDB();
        const tx = db.transaction('carte_files', 'readonly');
        const store = tx.objectStore('carte_files');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  async deleteFileFromDB(id) {
    const db = await this.openCarteDB();
    return new Promise((resolve) => {
      const tx = db.transaction('carte_files', 'readwrite');
      const store = tx.objectStore('carte_files');
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  async clearIndexedDBFiles() {
    try {
      const db = await this.openCarteDB();
      const tx = db.transaction('carte_files', 'readwrite');
      tx.objectStore('carte_files').clear();
    } catch (e) {
      console.warn(e);
    }
  }

  async renderCarteModalContent() {
    const container = document.getElementById('carte-items-container');
    if (!container) return;

    const list = this.getCarteList();
    const localFiles = await this.getAllFilesFromDB();

    if (list.length === 0 && localFiles.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: #94a3b8; padding: 2.5rem 0;">
          <span style="font-size: 2.5rem; display: block; margin-bottom: 8px;">📂</span>
          保存されたカルテ・カタログはまだありません。<br>
          部屋ブロックの「📷 設計参考図・ネタ帳切り抜き」や「＋ 端末からファイルを選択」から保存してみましょう！
        </div>
      `;
      return;
    }

    let html = '';

    // ① 端末ローカル保存カタログ・写真
    if (localFiles.length > 0) {
      html += `
        <div style="margin-bottom: 1.2rem;">
          <h4 style="font-size: 0.92rem; font-weight: 800; color: #0f172a; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <span>📁</span> 端末から取り込んだカタログ・写真 (${localFiles.length}件)
          </h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">
      `;

      for (const f of localFiles) {
        const isPdf = f.type.includes('pdf') || f.name.endsWith('.pdf');
        const sizeMb = (f.size / 1024 / 1024).toFixed(1);
        const url = URL.createObjectURL(f.data);
        html += `
          <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="height: 100px; background: #e2e8f0; border-radius: 6px; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 6px;">
                ${isPdf ? '<span style="font-size: 2.5rem;">📄</span>' : `<img src="${url}" style="width: 100%; height: 100%; object-fit: cover;" />`}
              </div>
              <div style="font-size: 0.78rem; font-weight: 800; color: #1e293b; word-break: break-all; margin-bottom: 2px;">${f.name}</div>
              <div style="font-size: 0.68rem; color: #64748b;">${sizeMb} MB ｜ ${f.createdAt}</div>
            </div>
            <div style="display: flex; gap: 6px; margin-top: 8px;">
              <a href="${url}" target="_blank" class="btn btn-sm" style="flex: 1; text-align: center; background: #0284c7; color: #fff; font-size: 0.7rem; padding: 4px; border-radius: 4px; text-decoration: none;">開く</a>
              <button type="button" class="btn btn-sm btn-delete-local-file" data-id="${f.id}" style="background: #fee2e2; color: #dc2626; border: 1px solid #f87171; font-size: 0.7rem; padding: 4px 8px; border-radius: 4px;">削除</button>
            </div>
          </div>
        `;
      }
      html += `</div></div>`;
    }

    // ② 保存した設計参考図・ノウハウ切り抜き ＆ 間取り
    if (list.length > 0) {
      html += `
        <div>
          <h4 style="font-size: 0.92rem; font-weight: 800; color: #0f172a; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <span>📐</span> 保存した設計参考図・間取りプラン (${list.length}件)
          </h4>
          <div style="display: flex; flex-direction: column; gap: 10px;">
      `;

      list.forEach((item, idx) => {
        if (item.type === 'architect_tip') {
          html += `
            <div class="carte-card" style="border-left: 4px solid #f59e0b; background: #fffbeb;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                <div>
                  <span style="font-size: 0.72rem; color: #b45309; font-weight: 700;">📷 設計参考図・ネタ帳切り抜き ｜ ${item.createdAt}</span>
                  <h4 style="margin: 2px 0 0; color: #0f172a; font-size: 1.05rem;">${item.title}</h4>
                </div>
                <button type="button" class="btn btn-sm btn-delete-carte-item" data-idx="${idx}" style="background: #fee2e2; color: #dc2626; border: 1px solid #f87171; font-size: 0.7rem; padding: 2px 6px;">削除</button>
              </div>
              <div style="font-size: 0.8rem; color: #78350f; margin-bottom: 6px;">
                ${item.dimensionsHtml}
              </div>
            </div>
          `;
        } else if (item.type === 'site_survey') {
          html += `
            <div class="carte-card" style="border-left: 4px solid #0284c7; background: #f0f9ff;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                <div>
                  <span style="font-size: 0.72rem; color: #0369a1; font-weight: 700;">🏞️ 敷地・都市計画カルテ ｜ ${item.createdAt}</span>
                  <h4 style="margin: 2px 0 0; color: #0f172a; font-size: 1.05rem;">${item.title}</h4>
                </div>
                <span style="background: #e0f2fe; color: #0284c7; font-weight: 800; font-size: 0.8rem; padding: 3px 10px; border-radius: 6px;">
                  敷地 ${item.siteTsubo} 坪
                </span>
              </div>
              <div style="font-size: 0.82rem; color: #334155; line-height: 1.7;">
                <div>・建設地住所: <strong>${item.address}</strong> (省エネ: ${item.climateRegion})</div>
                <div>・用途地域: <strong>${item.zone}</strong> (建蔽率${item.kenpeiRate}% / 容積率${item.yousekiRate}%)</div>
                <div>・最大建築可能面積: <strong style="color: #d97706;">${item.maxBuildingAreaTsubo} 坪</strong> ｜ 道路: ${item.roadDirection.toUpperCase()}道路 (${item.roadWidthM}m)</div>
                <div>・離隔距離: <strong>道路20cm標準 / 隣地${item.boundaryMargin}</strong> ｜ 車両配置: ${item.parking}</div>
              </div>
            </div>
          `;
        } else {
          html += `
            <div class="carte-card">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                <div>
                  <span style="font-size: 0.72rem; color: #64748b;">保存日時: ${item.createdAt}</span>
                  <h4 style="margin: 2px 0 0; color: #0f172a; font-size: 1.05rem;">
                    ${item.title || `プラン #${list.length - idx} (バブル作図)`}
                  </h4>
                </div>
                <span style="background: #e0f2fe; color: #0369a1; font-weight: 800; font-size: 0.8rem; padding: 3px 10px; border-radius: 6px;">
                  延床 ${item.totalTsubo} 坪
                </span>
              </div>
              <div style="font-size: 0.82rem; color: #334155; line-height: 1.7; margin-bottom: 6px;">
                <div>・断熱仕様: <strong>${item.insulationTier}</strong></div>
                <div>・概算本体価格: <strong style="color: #d97706; font-size: 0.95rem;">約 ${item.estPriceMan.toLocaleString()} 万円 (税込・設備機器別途)</strong></div>
                <div>・部屋構成: ${item.rooms}</div>
              </div>
            </div>
          `;
        }
      });
      html += `</div></div>`;
    }

    container.innerHTML = html;

    // 削除リスナー配線
    container.querySelectorAll('.btn-delete-carte-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        list.splice(idx, 1);
        localStorage.setItem('smile_user_carte', JSON.stringify(list));
        this.renderCarteModalContent();
        this.updateCarteBadge();
      });
    });

    container.querySelectorAll('.btn-delete-local-file').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        await this.deleteFileFromDB(id);
        this.renderCarteModalContent();
        this.updateCarteBadge();
      });
    });
  }


  // ==========================================
  // 12. 住宅設備機器パレット（大手メーカー規格寸法で直接配置）
  // ==========================================
  getEquipmentPresets() {
    return {
      i2550: {
        type: 'kitchen',
        name: 'キッチン I型2550',
        wMm: 2550,
        hMm: 650,
        tatami: 1.0,
        color: '#f59e0b',
        spec: '間口2550×奥行650mm（パナソニック ラクシーナ / クリナップ ステディア同等）'
      },
      l2550: {
        type: 'kitchen',
        name: 'キッチン L型',
        wMm: 2550,
        hMm: 1800,
        tatami: 2.8,
        color: '#f59e0b',
        spec: '2550×1800mm（コーナー作業スペース広々・LIXIL シエラS同等）'
      },
      ub1616: {
        type: 'bath',
        name: 'システムバス 1616(1坪)',
        wMm: 1820,
        hMm: 1820,
        tatami: 2.0,
        color: '#06b6d4',
        spec: '1820×1820mm（内寸1600×1600mm・TOTO サザナ / LIXIL リデア同等）'
      },
      ub1620: {
        type: 'bath',
        name: 'システムバス 1620(1.25坪)',
        wMm: 1820,
        hMm: 2275,
        tatami: 2.5,
        color: '#06b6d4',
        spec: '1820×2275mm（洗い場ゆったり・TOTO サザナ 1620同等）'
      },
      w750: {
        type: 'washroom',
        name: '洗面化粧台 W750',
        wMm: 750,
        hMm: 550,
        tatami: 0.3,
        color: '#2dd4bf',
        spec: '間口750×奥行550mm（1ボウル・TOTO サクア / Panasonic シーライン同等）'
      },
      w1600: {
        type: 'washroom',
        name: '洗面カウンター W1600',
        wMm: 1600,
        hMm: 550,
        tatami: 0.5,
        color: '#2dd4bf',
        spec: '間口1600×奥行550mm（2ボウルまたはワイドカウンター・Panasonic ウツクシーズ同等）'
      },
            bio_fireplace: {
        type: 'equipment',
        name: 'バイオエタノール暖炉',
        wMm: 910,
        hMm: 455,
        tatami: 0.25,
        color: '#f97316',
        spec: '煙突不要・煤ゼロの環境配慮型バイオエタノール暖炉 (離隔500mm不燃仕上げ)'
      },
      tankless: {
        type: 'toilet',
        name: 'タンクレストイレ',
        wMm: 800,
        hMm: 1200,
        tatami: 0.6,
        color: '#a855f7',
        spec: '幅800×奥行1200mm（TOTO ネオレスト / LIXIL サティス同等）'
      },
      counter: {
        type: 'toilet',
        name: 'トイレ手洗いカウンター',
        wMm: 450,
        hMm: 250,
        tatami: 0.1,
        color: '#a855f7',
        spec: '間口450×奥行250mm（埋込・壁付手洗いキャビネット）'
      }
    };
  }

  placeEquipment(type, presetKey) {
    // 住宅設備機器はバブルプランを矩形（rect）に変えた後にしか配置できないように制限
    if (this.displayMode !== 'rect') {
      alert('⚠️ 住宅設備機器（キッチン・システムバス・洗面化粧台・トイレ等）の配置は、バブルプランを【📐 建築グリッド（矩形ブロック）へ自動整形】に変換した後にご利用いただけます。\n\nまずは画面上部の「🪄 建築グリッドへ自動整形」ボタンを押して、部屋の泡を矩形ブロックに変換してください。');
      return;
    }

    const presets = this.getEquipmentPresets();
    const preset = presets[presetKey];
    if (!preset) return;

    const id = 'eq_' + Date.now() + '_' + Math.floor(Math.random() * 100);
    const cx = (this.baseBuildingBox.minX + this.baseBuildingBox.maxX) / 2 + (Math.random() * 40 - 20);
    const cy = (this.baseBuildingBox.minY + this.baseBuildingBox.maxY) / 2 + (Math.random() * 40 - 20);

    const node = {
      id,
      name: preset.name,
      floor: this.currentFloor,
      tatami: preset.tatami,
      category: 'equipment',
      color: preset.color,
      wMm: preset.wMm,
      hMm: preset.hMm,
      equipmentType: type,
      isEquipment: true,
      spec: preset.spec,
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      isFixed: false
    };

    this.calculateRectDimensions(node);
    this.nodes.push(node);
    this.clampNodesToBuildingBox();
    this.selectedItem = node;
    this.selectedType = 'node';
    this.updateNodeInspectPanel(node);
    this.updateMetrics();
    this.autoSaveDebounced();

    // 通知メッセージの表示
    const badge = document.querySelector('#bubble-plan-canvas-wrap div');
    if (badge) {
      const origText = badge.innerHTML;
      badge.innerHTML = `🛁 <b>${preset.name}（${preset.wMm}×${preset.hMm}mm）を配置しました！</b>`;
      badge.style.background = 'rgba(16, 185, 129, 0.95)';
      badge.style.color = '#ffffff';
      setTimeout(() => {
        badge.innerHTML = origText;
        badge.style.background = 'rgba(15, 23, 42, 0.88)';
        badge.style.color = '#38bdf8';
      }, 2500);
    }
  }

  updateEquipmentPresetsUI(node) {
    // インスペクター用のプリセット表示があれば更新
  }

  // ==========================================
  // 13. WIC (ウォークインクローゼット) 追加 ＆ 親室への内包
  // ==========================================
  addWicRoom(type, name, tatami, color, wMm = 1820, hMm = 1820) {
    const id = 'wic_' + Date.now() + '_' + Math.floor(Math.random() * 100);
    // 現在フロアの主寝室または個室を探す
    const bedNode = this.nodes.find(n => n.floor === this.currentFloor && (n.category === 'private' || n.name.includes('寝室') || n.name.includes('洋室')));
    let cx, cy;
    if (bedNode) {
      cx = bedNode.x + Math.min(bedNode.w / 4, 30);
      cy = bedNode.y + Math.min(bedNode.h / 4, 30);
    } else {
      cx = (this.baseBuildingBox.minX + this.baseBuildingBox.maxX) / 2;
      cy = (this.baseBuildingBox.minY + this.baseBuildingBox.maxY) / 2;
    }

    const node = {
      id,
      name,
      floor: this.currentFloor,
      tatami,
      category: 'storage',
      isWic: true,
      color: color || '#94a3b8',
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      wMm,
      hMm,
      isFixed: false
    };

    this.calculateRectDimensions(node);
    this.nodes.push(node);
    this.selectedItem = node;
    this.selectedType = 'node';
    this.detectInnerCornersAndMerged();
    this.updateNodeInspectPanel(node);
    this.updateMetrics();
    this.autoSaveDebounced();
  }

  // ==========================================
  // 14. 途中保存 ＆ 続きを復元（翌日以降も続けられる機能）
  // ==========================================
  savePlanProgress(silent = false) {
    try {
      const state = {
        nodes: this.nodes,
        links: this.links,
        carNodes: this.carNodes,
        siteData: this.siteData,
        currentTier: this.currentTier,
        buildingType: this.buildingType,
        currentFloor: this.currentFloor,
        renderMode: this.renderMode,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('smile_bubble_plan_saved_state', JSON.stringify(state));

      const indicator = document.getElementById('bubble-autosave-indicator');
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      if (indicator) {
        indicator.innerHTML = `💾 保存完了 (${timeStr})`;
        indicator.style.color = '#4ade80';
      }

      if (!silent) {
        alert(`💾 現在の間取り検討状況を保存しました！\nブラウザを閉じても、明日以降「📂 続きを復元」からいつでも再開できます。（保存時刻: ${timeStr}）`);
      }
    } catch (e) {
      console.error('途中保存エラー:', e);
      if (!silent) alert('保存中にエラーが発生しました。');
    }
  }

  restorePlanProgress() {
    try {
      const raw = localStorage.getItem('smile_bubble_plan_saved_state');
      if (!raw) {
        alert('📂 保存されている途中データが見つかりませんでした。');
        return;
      }
      const state = JSON.parse(raw);
      if (state.nodes) this.nodes = state.nodes;
      if (state.links) this.links = state.links;
      if (state.carNodes) this.carNodes = state.carNodes;
      if (state.siteData) Object.assign(this.siteData, state.siteData);
      if (state.currentTier) this.setInsulationTier(state.currentTier);
      if (state.buildingType) this.buildingType = state.buildingType;
      if (state.renderMode) this.setRenderMode(state.renderMode);
      if (state.currentFloor) this.setFloor(state.currentFloor);

      // バナーを隠す
      const banner = document.getElementById('bubble-saved-progress-banner');
      if (banner) banner.style.display = 'none';

      // 寸法再計算とクランプ
      for (const n of this.nodes) {
        this.calculateRectDimensions(n);
      }
      this.clampNodesToBuildingBox();
      this.detectInnerCornersAndMerged();

      this.selectedItem = this.nodes.find(n => n.floor === this.currentFloor) || null;
      this.selectedType = this.selectedItem ? 'node' : 'none';
      this.updateNodeInspectPanel(this.selectedItem);
      this.updateMetrics();

      const d = new Date(state.savedAt);
      const dateStr = isNaN(d) ? '' : `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
      alert(`📂 前回の続き（${dateStr} 保存データ）を復元しました！\n引き続き間取りづくりをお楽しみください。`);
    } catch (e) {
      console.error('復元エラー:', e);
      alert('復元に失敗しました。');
    }
  }

  checkSavedProgressOnStartup() {
    try {
      const raw = localStorage.getItem('smile_bubble_plan_saved_state');
      if (!raw) return;
      const state = JSON.parse(raw);
      if (!state || !state.savedAt) return;

      const banner = document.getElementById('bubble-saved-progress-banner');
      const timeEl = document.getElementById('saved-progress-time-text');
      if (banner && timeEl) {
        const d = new Date(state.savedAt);
        const timeStr = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        timeEl.textContent = timeStr;
        banner.style.display = 'flex';
      }
    } catch (e) {
      console.warn('保存データ確認エラー:', e);
    }
  }

  autoSaveDebounced() {
    if (this._autoSaveTimer) clearTimeout(this._autoSaveTimer);
    this._autoSaveTimer = setTimeout(() => {
      this.savePlanProgress(true);
    }, 1200);
  }


  // ==========================================
  // 12. 住宅設備機器パレット（大手メーカー規格寸法で直接配置）
  // ==========================================
  getEquipmentPresets() {
    return {
      i2550: {
        type: 'kitchen',
        name: 'キッチン I型2550',
        wMm: 2550,
        hMm: 650,
        tatami: 1.0,
        color: '#f59e0b',
        spec: '間口2550×奥行650mm（パナソニック ラクシーナ / クリナップ ステディア同等）'
      },
      l2550: {
        type: 'kitchen',
        name: 'キッチン L型',
        wMm: 2550,
        hMm: 1800,
        tatami: 2.8,
        color: '#f59e0b',
        spec: '2550×1800mm（コーナー作業スペース広々・LIXIL シエラS同等）'
      },
      ub1616: {
        type: 'bath',
        name: 'システムバス 1616(1坪)',
        wMm: 1820,
        hMm: 1820,
        tatami: 2.0,
        color: '#06b6d4',
        spec: '1820×1820mm（内寸1600×1600mm・TOTO サザナ / LIXIL リデア同等）'
      },
      ub1620: {
        type: 'bath',
        name: 'システムバス 1620(1.25坪)',
        wMm: 1820,
        hMm: 2275,
        tatami: 2.5,
        color: '#06b6d4',
        spec: '1820×2275mm（洗い場ゆったり・TOTO サザナ 1620同等）'
      },
      w750: {
        type: 'washroom',
        name: '洗面化粧台 W750',
        wMm: 750,
        hMm: 550,
        tatami: 0.3,
        color: '#2dd4bf',
        spec: '間口750×奥行550mm（1ボウル・TOTO サクア / Panasonic シーライン同等）'
      },
      w1600: {
        type: 'washroom',
        name: '洗面カウンター W1600',
        wMm: 1600,
        hMm: 550,
        tatami: 0.5,
        color: '#2dd4bf',
        spec: '間口1600×奥行550mm（2ボウルまたはワイドカウンター・Panasonic ウツクシーズ同等）'
      },
            bio_fireplace: {
        type: 'equipment',
        name: 'バイオエタノール暖炉',
        wMm: 910,
        hMm: 455,
        tatami: 0.25,
        color: '#f97316',
        spec: '煙突不要・煤ゼロの環境配慮型バイオエタノール暖炉 (離隔500mm不燃仕上げ)'
      },
      tankless: {
        type: 'toilet',
        name: 'タンクレストイレ',
        wMm: 800,
        hMm: 1200,
        tatami: 0.6,
        color: '#a855f7',
        spec: '幅800×奥行1200mm（TOTO ネオレスト / LIXIL サティス同等）'
      },
      tankless_std: {
        type: 'toilet',
        name: 'タンクレストイレ (標準)',
        wMm: 800,
        hMm: 1200,
        tatami: 0.6,
        color: '#a855f7',
        spec: '幅800×奥行1200mm（TOTO ネオレスト / LIXIL サティス同等）'
      },
      tankless_compact: {
        type: 'toilet',
        name: 'タンクレストイレ (コンパクト手洗い付)',
        wMm: 800,
        hMm: 1000,
        tatami: 0.5,
        color: '#a855f7',
        spec: '幅800×奥行1000mm（省スペース設置型）'
      },
      counter: {
        type: 'toilet',
        name: 'トイレ手洗いカウンター',
        wMm: 450,
        hMm: 250,
        tatami: 0.1,
        color: '#a855f7',
        spec: '間口450×奥行250mm（埋込・壁付手洗いキャビネット）'
      }
    };
  }

  placeEquipment(type, presetKey) {
    const presets = this.getEquipmentPresets();
    const preset = presets[presetKey];
    if (!preset) return;

    const id = 'eq_' + Date.now() + '_' + Math.floor(Math.random() * 100);
    const cx = (this.baseBuildingBox.minX + this.baseBuildingBox.maxX) / 2 + (Math.random() * 40 - 20);
    const cy = (this.baseBuildingBox.minY + this.baseBuildingBox.maxY) / 2 + (Math.random() * 40 - 20);

    const node = {
      id,
      name: preset.name,
      floor: this.currentFloor,
      tatami: preset.tatami,
      category: 'equipment',
      color: preset.color,
      wMm: preset.wMm,
      hMm: preset.hMm,
      equipmentType: type,
      isEquipment: true,
      spec: preset.spec,
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      isFixed: false
    };

    this.calculateRectDimensions(node);
    this.nodes.push(node);
    this.clampNodesToBuildingBox();
    this.selectedItem = node;
    this.selectedType = 'node';
    this.updateNodeInspectPanel(node);
    this.updateMetrics();
    this.autoSaveDebounced();

    // 通知メッセージの表示
    const badge = document.querySelector('#bubble-plan-canvas-wrap div');
    if (badge) {
      const origText = badge.innerHTML;
      badge.innerHTML = `🛁 <b>${preset.name}（${preset.wMm}×${preset.hMm}mm）を配置しました！</b>`;
      badge.style.background = 'rgba(16, 185, 129, 0.95)';
      badge.style.color = '#ffffff';
      setTimeout(() => {
        badge.innerHTML = origText;
        badge.style.background = 'rgba(15, 23, 42, 0.88)';
        badge.style.color = '#38bdf8';
      }, 2500);
    }
  }

  updateEquipmentPresetsUI(node) {
    // インスペクター用のプリセット表示があれば更新
  }

  // ==========================================
  // 13. WIC (ウォークインクローゼット) 追加 ＆ 親室への内包
  // ==========================================
  addWicRoom(type, name, tatami, color, wMm = 1820, hMm = 1820) {
    const id = 'wic_' + Date.now() + '_' + Math.floor(Math.random() * 100);
    // 現在フロアの主寝室または個室を探す
    const bedNode = this.nodes.find(n => n.floor === this.currentFloor && (n.category === 'private' || n.name.includes('寝室') || n.name.includes('洋室')));
    let cx, cy;
    if (bedNode) {
      cx = bedNode.x + Math.min(bedNode.w / 4, 30);
      cy = bedNode.y + Math.min(bedNode.h / 4, 30);
    } else {
      cx = (this.baseBuildingBox.minX + this.baseBuildingBox.maxX) / 2;
      cy = (this.baseBuildingBox.minY + this.baseBuildingBox.maxY) / 2;
    }

    const node = {
      id,
      name,
      floor: this.currentFloor,
      tatami,
      category: 'storage',
      isWic: true,
      color: color || '#94a3b8',
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      wMm,
      hMm,
      isFixed: false
    };

    this.calculateRectDimensions(node);
    this.nodes.push(node);
    this.selectedItem = node;
    this.selectedType = 'node';
    this.detectInnerCornersAndMerged();
    this.updateNodeInspectPanel(node);
    this.updateMetrics();
    this.autoSaveDebounced();
  }

  // ==========================================
  // 14. 途中保存 ＆ 続きを復元（翌日以降も続けられる機能）
  // ==========================================
  savePlanProgress(silent = false) {
    try {
      const state = {
        nodes: this.nodes,
        links: this.links,
        carNodes: this.carNodes,
        siteData: this.siteData,
        currentTier: this.currentTier,
        buildingType: this.buildingType,
        currentFloor: this.currentFloor,
        renderMode: this.renderMode,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('smile_bubble_plan_saved_state', JSON.stringify(state));

      const indicator = document.getElementById('bubble-autosave-indicator');
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      if (indicator) {
        indicator.innerHTML = `💾 保存完了 (${timeStr})`;
        indicator.style.color = '#4ade80';
      }

      if (!silent) {
        alert(`💾 現在の間取り検討状況を保存しました！\nブラウザを閉じても、明日以降「📂 続きを復元」からいつでも再開できます。（保存時刻: ${timeStr}）`);
      }
    } catch (e) {
      console.error('途中保存エラー:', e);
      if (!silent) alert('保存中にエラーが発生しました。');
    }
  }

  restorePlanProgress() {
    try {
      const raw = localStorage.getItem('smile_bubble_plan_saved_state');
      if (!raw) {
        alert('📂 保存されている途中データが見つかりませんでした。');
        return;
      }
      const state = JSON.parse(raw);
      if (state.nodes) this.nodes = state.nodes;
      if (state.links) this.links = state.links;
      if (state.carNodes) this.carNodes = state.carNodes;
      if (state.siteData) Object.assign(this.siteData, state.siteData);
      if (state.currentTier) this.setInsulationTier(state.currentTier);
      if (state.buildingType) this.buildingType = state.buildingType;
      if (state.renderMode) this.setRenderMode(state.renderMode);
      if (state.currentFloor) this.setFloor(state.currentFloor);

      // バナーを隠す
      const banner = document.getElementById('bubble-saved-progress-banner');
      if (banner) banner.style.display = 'none';

      // 寸法再計算とクランプ
      for (const n of this.nodes) {
        this.calculateRectDimensions(n);
      }
      this.clampNodesToBuildingBox();
      this.detectInnerCornersAndMerged();

      this.selectedItem = this.nodes.find(n => n.floor === this.currentFloor) || null;
      this.selectedType = this.selectedItem ? 'node' : 'none';
      this.updateNodeInspectPanel(this.selectedItem);
      this.updateMetrics();

      const d = new Date(state.savedAt);
      const dateStr = isNaN(d) ? '' : `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
      alert(`📂 前回の続き（${dateStr} 保存データ）を復元しました！\n引き続き間取りづくりをお楽しみください。`);
    } catch (e) {
      console.error('復元エラー:', e);
      alert('復元に失敗しました。');
    }
  }

  checkSavedProgressOnStartup() {
    try {
      const raw = localStorage.getItem('smile_bubble_plan_saved_state');
      if (!raw) return;
      const state = JSON.parse(raw);
      if (!state || !state.savedAt) return;

      const banner = document.getElementById('bubble-saved-progress-banner');
      const timeEl = document.getElementById('saved-progress-time-text');
      if (banner && timeEl) {
        const d = new Date(state.savedAt);
        const timeStr = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        timeEl.textContent = timeStr;
        banner.style.display = 'flex';
      }
    } catch (e) {
      console.warn('保存データ確認エラー:', e);
    }
  }

  autoSaveDebounced() {
    if (this._autoSaveTimer) clearTimeout(this._autoSaveTimer);
    this._autoSaveTimer = setTimeout(() => {
      this.savePlanProgress(true);
    }, 1200);
  }

  async updateCarteBadge() {
    const list = this.getCarteList();
    const localFiles = await this.getAllFilesFromDB();
    const total = list.length + localFiles.length;

    const badge = document.getElementById('carte-badge-count');
    if (badge) badge.textContent = total;

    const topBadge = document.getElementById('my-carte-badge-count');
    if (topBadge) topBadge.textContent = total;
  }
}

// Global instance
window.bubblePlanInstance = null;

function initBubblePlan() {
  if (!window.bubblePlanInstance) {
    window.bubblePlanInstance = new BubblePlanStudio();
    window.bubbleStudioInstance = window.bubblePlanInstance;
    window.bubblePlanInstance.init();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initBubblePlan();
});
