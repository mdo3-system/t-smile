/**
 * 住ま居る 3D間取り工房 (MadoriSketch)
 * コア状態管理＆履歴マネージャー (Single Responsibility: Core App State & History Manager)
 * 地下〜4階・下絵透過目アイコン・補助線(ものさし)・用紙範囲・壁4種・サッシ12種・メモ注釈・3Dカメラ撮影に対応
 */
window.setFloorDisplay3D = function (mode) {
    if (typeof state !== 'undefined') state.floorDisplay3D = mode;
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
};
window.set3DFloorDisplay = window.setFloorDisplay3D;

const state = {
    currentPlanId: null,
    projectTitle: '07邸 吹抜けがある',
    currentFloor: 1,         // 0 (地下), 1, 2, 3, 4
    onionSkin: true,         // 下絵透過マスターフラグ
    floorVisibility: {       // 各階タブの「👁️（目アイコン）」ON/OFF状態
        0: false,
        1: true,
        2: false,
        3: false,
        4: false
    },
    modulePitch: 910,        // 910mm or 1000mm
    gridDivisions: 2,        // 1, 2, 3, 4, 5, 6 divisions per 1P
    viewMode: 'split',       // '2d', 'split', '3d'
    birdEyePopupOpen: false, // 2Dモード時の右下3Dポップアップ表示フラグ
    canvasTheme: 'light',    // 'light' (ホワイト方眼紙標準) or 'dark'
    stylusOnlyMode: false,   // パームリジェクション（true: ペンで作図・指は画面移動のみ）
    inputModeSetting: 'auto',// 'auto' (ペン検知時に自動パームリジェクション), 'pen_only', 'all'
    penDetectedOnce: false,  // Apple Pencil / S-Pen / Surface Pen 検知済みフラグ
    lastHoverWorld: { x: 3.5, y: 4.2 },

    // 左パレットの3大モード ('build': 壁/製品, 'memo': メモ注釈, 'photo': 写真/3D)
    paletteMode: 'build',
    planLocked: false,

    // 補助線（ものさし）・画面ロック・用紙範囲・プロ設計者モード
    rulerMode: false,
    guidesLocked: false,
    guides: [],              // [{ id, axis: 'h'|'v', pos: number, posP: number, label: string }]
    gridBounds: { minX: -2, maxX: 12, minY: -2, maxY: 12 },
    designerMode: false,     // 設計者モード（通り芯X1/Y1表示・上下階ズレ照合・部屋別面積一覧常時表示）
    diagonalWallMode: false, // 斜め壁作図モード（false=水平垂直直交スナップ、true=斜め自由・45°対応）
    copiedOpeningSpec: null, // 建具・窓のコピー＆連続ペースト用スペック保持

    // 現在選択中のツール
    activeTool: 'wall',
    subRoomType: 'LDK',
    subWallType: 'wall',         // 'wall', 'tarekabe', 'koshikabe', 'agarikamachi'
    subWallHeights: {            // 壁種別ごとのデフォルト高さ(mm)
        wall: 2450,
        koshikabe: 1000,
        tarekabe: 550,
        agarikamachi: 180
    },
    lastDrawnWallId: null,       // 直前に作図した壁ID（上部ツールバーからの即時高さ変更連動用）
    subPillarSize: 150,          // 105, 120, 150, 200 mm
    subPillarShape: 'square',    // 'square', 'round'
    wallClickStart: null,
    polyPoints: [],              // 多角形柱などの頂点入力一時配列
    polyPillarPoints: [],        // 互換エイリアス

    // サッシ・建具12種設定
    subOpeningFit: 'hikichigai', // 12種ID ('hikichigai','katabiki','katahiraki','ryouhiraki','oyako','fix','oredo','closet','demado','tatesuberi','yokosuberi','agesage')
    subOpeningType: 'WINDOW',
    subOpeningCategory: 'window',
    subWindowWidth: 1650,
    subWindowHeight: 1300,
    subWindowMountRef: 'top',
    subWindowTopMm: 2100,
    subWindowSillMm: 800,
    subDoorFit: 'hikichigai',
    subDoorLeafCount: 2,
    subDoorLeafWidth: 800,
    subDoorHeight: 2000,

    // 設備・家具・直方体設定
    subFixtureRot: 0,
    subFixtureRotManual: false,
    subFixtureWallSnap: true,
    subFixtureFlipX: false,
    subFixtureFlipY: false,
    subFixtureType: 'KITCHEN',
    subFixtureCategory: 'KITCHEN',
    subKitchenType: 'I',
    subKitchenIWidth: 2550,
    subKitchenIDepth: 650,
    subKitchenLXWidth: 2550,
    subKitchenLYWidth: 1950,
    subKitchenIslandW: 2550,
    subKitchenIslandD: 900,
    subKitchenHeight: 850,
    subUbSize: '1616',
    subUbPattern: 'patternA',
    subVanityWidth: 900,
    subVanityDepth: 550,
    subVanityHeight: 800,
    subFixtureAlign: 'center',
    subFixtureClearanceMm: 0,
    // 直方体(四角)デフォルト
    subBoxWidthMm: 910,
    subBoxDepthMm: 455,
    subBoxHeightMm: 750,
    subBoxLevelMm: 0,

    // 階段作成ステート（ボックス/オープン・手すり対応）
    subStairRot: 0,
    subStairDirection: 'UP',
    stairDrawMode: 'preset',     // 'preset' or 'path'
    stairPresetType: 'U_SHAPE',
    stairDrawingPoints: [],
    stairTempCurPoint: null,
    stairWidthMm: 910,
    stairDirection: 'UP',
    stairTurnType: 'turn_3',
    stairTurnSpec: 'turn_3',
    stairStyle: 'box',           // 'box' (ボックス階段) or 'open' (オープン階段)
    stairHandrail: 'both',       // 'none', 'left', 'right', 'both'
    stairSteps: 14,

    // メモ注釈設定 (第5章)
    subPenColor: '#ef4444',
    subPenSize: 2.5,
    subLineDash: 'solid',        // 'solid' (実線), 'dashed' (点線), 'dashdot' (一点鎖線)
    subStampSymbol: null,
    subSwitchCode: '●',
    subOutletCode: '🔌2',
    subLightCode: '○DL',
    subCompassAngle: 0,
    customSymbols: [
        { id: 'cs_robo', label: 'ロボ掃除機', shape: 'rect' },
        { id: 'cs_ev', label: 'EV充電', shape: 'circle' },
        { id: 'cs_box', label: '宅配BOX', shape: 'rect' },
        { id: 'cs_gas', label: 'ガス栓', shape: 'diamond' }
    ],

    // 3D画面・写真キャプチャ＆ペン書き込みリスト
    snapshots: [],
    activeSnapshotId: null,

    cam2d: {
        x: 3.2,
        y: 3.2,
        zoom: 46
    },

    floorDisplay3D: 'all',   // 'all', '0f', '1f', '2f', '3f', '4f'
    showRoof3D: false,
    sunHour: 14,
    foundationHeightMm: 400, // 基礎高さ (GL〜基礎天端 mm: 標準400mm, 0=なし〜800mm)
    showMizukiri3D: true,    // 土台水切り板金の3D表示 ON/OFF
    mizukiriColor: '#334155',// 土台水切りカラー ('#334155' ダークグレー, '#1e293b' ブラック, '#94a3b8' シルバー, '#785c44' ブロンズ, '#e2e8f0' ホワイト)
    seamlessExteriorWall3D: true, // 1F・2F外壁の上下階シームレス連結表示

    // 地下(0)〜4階までの5階層データモデル
    floors: {
        0: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], stairs: [], strokes: [], stamps: [], memos: [], polyPillars: [], boxes3d: [] },
        1: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], stairs: [], strokes: [], stamps: [], memos: [], polyPillars: [], boxes3d: [] },
        2: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], stairs: [], strokes: [], stamps: [], memos: [], polyPillars: [], boxes3d: [] },
        3: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], stairs: [], strokes: [], stamps: [], memos: [], polyPillars: [], boxes3d: [] },
        4: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], stairs: [], strokes: [], stamps: [], memos: [], polyPillars: [], boxes3d: [] }
    },

    history: [],
    historyIndex: -1,

    selectedItem: null,      // { kind: 'room'|'wall'|'opening'|'fixture'|'pillar'|'stair'|'memo'|'guide'|'box3d', id, floor }
    dragAction: null
};

// ローカルストレージからオリジナル記号を復元
try {
    const savedSyms = localStorage.getItem('smile_madori_custom_symbols');
    if (savedSyms) {
        const parsed = JSON.parse(savedSyms);
        if (Array.isArray(parsed) && parsed.length > 0) {
            state.customSymbols = parsed;
        }
    }
} catch (e) { }

function uid() {
    return 'id_' + Math.random().toString(36).substring(2, 9);
}

// --- Toast Helper ---
let toastTimer = null;
function showToast(msg, isWarning = false) {
    const box = document.getElementById('toastBox');
    const inner = document.getElementById('toastInner');
    const icon = document.getElementById('toastIcon');
    const msgEl = document.getElementById('toastMsg');
    if (!box || !inner || !icon || !msgEl) return;
    msgEl.textContent = msg;

    if (isWarning) {
        inner.className = 'bg-rose-950/95 border border-rose-500 text-rose-100 px-4 py-2 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2';
        icon.className = 'fa-solid fa-triangle-exclamation text-rose-400';
    } else {
        inner.className = 'bg-slate-900/95 border border-amber-500/60 text-white px-4 py-2 rounded-full shadow-2xl text-xs font-semibold flex items-center gap-2';
        icon.className = 'fa-solid fa-circle-check text-amber-400';
    }

    box.classList.remove('opacity-0');
    box.classList.add('opacity-100');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        box.classList.remove('opacity-100');
        box.classList.add('opacity-0');
    }, 2600);
}

// --- Ensure floor data integrity ---
function ensureFloorsStructure() {
    [0, 1, 2, 3, 4].forEach(f => {
        if (!state.floors[f]) {
            state.floors[f] = { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], stairs: [], strokes: [], stamps: [], memos: [], polyPillars: [], boxes3d: [] };
        }
        const fl = state.floors[f];
        if (!fl.rooms) fl.rooms = [];
        if (!fl.walls) fl.walls = [];
        if (!fl.pillars) fl.pillars = [];
        if (!fl.openings) fl.openings = [];
        if (!fl.fixtures) fl.fixtures = [];
        if (!fl.stairs) fl.stairs = [];
        if (!fl.strokes) fl.strokes = [];
        if (!fl.stamps) fl.stamps = [];
        if (!fl.memos) fl.memos = [];
        if (!fl.polyPillars) fl.polyPillars = [];
        if (!fl.boxes3d) fl.boxes3d = [];

        fl.openings.forEach(op => {
            const def = (window.OPENING_TYPES && window.OPENING_TYPES[op.type]) || { widthP: 1.0, heightMm: 2000, sillMm: 0 };
            if (typeof op.widthP !== 'number') op.widthP = def.widthP;
            if (typeof op.heightMm !== 'number') op.heightMm = def.heightMm;
            if (typeof op.sillMm !== 'number') op.sillMm = def.sillMm;
        });

        // 同一線上の二重壁・重なり壁を「後から描かれた壁（上書き）優先」で自動整理
        if (typeof window.deduplicateFloorWalls === 'function' && Array.isArray(fl.walls) && fl.walls.length > 1) {
            window.deduplicateFloorWalls(fl);
        }
    });
}

// --- History Management (Undo / Redo via Top Bar Buttons) ---
function saveHistorySnapshot(options) {
    const opts = options || {};
    ensureFloorsStructure();
    const payload = {
        floors: state.floors,
        guides: state.guides
    };
    const snapshot = JSON.stringify(payload);
    if (state.historyIndex >= 0 && state.history[state.historyIndex] === snapshot) {
        if (!opts.skipMetricsAnd3D && typeof updateAllMetricsAnd3D === 'function') updateAllMetricsAnd3D();
        if (!opts.skipInspectorRender && typeof renderPropertyInspector === 'function') renderPropertyInspector();
        return;
    }
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(snapshot);
    if (state.history.length > 40) state.history.shift();
    state.historyIndex = state.history.length - 1;
    if (!opts.skipMetricsAnd3D && typeof updateAllMetricsAnd3D === 'function') updateAllMetricsAnd3D();
    if (!opts.skipInspectorRender && typeof renderPropertyInspector === 'function') renderPropertyInspector();
    if (typeof window.notifyLiveShareStateChanged === 'function') {
        window.notifyLiveShareStateChanged('plan');
    }
}

function undo() {
    if (state.historyIndex > 0) {
        state.historyIndex--;
        const parsed = JSON.parse(state.history[state.historyIndex]);
        state.floors = parsed.floors || parsed;
        if (parsed.guides) state.guides = parsed.guides;
        ensureFloorsStructure();
        state.selectedItem = null;
        if (typeof updateAllMetricsAnd3D === 'function') updateAllMetricsAnd3D();
        if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
        if (typeof window.notifyLiveShareStateChanged === 'function') {
            window.notifyLiveShareStateChanged('undo');
        }
        showToast('↩ 元に戻しました (Undo)');
    } else {
        showToast('これ以上戻れません', true);
    }
}

function redo() {
    if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        const parsed = JSON.parse(state.history[state.historyIndex]);
        state.floors = parsed.floors || parsed;
        if (parsed.guides) state.guides = parsed.guides;
        ensureFloorsStructure();
        state.selectedItem = null;
        if (typeof updateAllMetricsAnd3D === 'function') updateAllMetricsAnd3D();
        if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
        if (typeof window.notifyLiveShareStateChanged === 'function') {
            window.notifyLiveShareStateChanged('redo');
        }
        showToast('↪ やり直しました (Redo)');
    } else {
        showToast('これ以上進めません', true);
    }
}

// --- 標準サンプルプラン（お手本画像準拠：07邸 吹抜けがある 2階建てプラン） ---
function loadSampleHousePlan() {
    ensureFloorsStructure();
    state.projectTitle = '07邸 吹抜けがある';
    const titleInput = document.getElementById('planTitleInput') || document.getElementById('projectTitleInput');
    if (titleInput) titleInput.value = state.projectTitle;

    state.floors = {
        0: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], stairs: [], strokes: [], stamps: [], memos: [], polyPillars: [], boxes3d: [] },
        1: {
            rooms: [
                { id: uid(), type: 'DOMA', x: 0, y: 7, w: 1, h: 2, customName: '玄関土間' },
                { id: uid(), type: 'GENKAN', x: 1, y: 7, w: 1, h: 2, customName: 'ホール' },
                { id: uid(), type: 'TOILET', x: 0, y: 5, w: 1, h: 2, customName: 'トイレ' },
                { id: uid(), type: 'SENMEN', x: 3, y: 0, w: 2, h: 2, customName: '洗面脱衣' },
                { id: uid(), type: 'UB', x: 5, y: 0, w: 2, h: 2, customName: 'UB1616' },
                { id: uid(), type: 'LDK', x: 0, y: 0, w: 7, h: 9, customName: 'LDK' },
                { id: uid(), type: 'WASHITSU', x: 2, y: 6, w: 3, h: 3, customName: 'タタミコーナー' }
            ],
            walls: [
                { id: uid(), x1: 1, y1: 7, x2: 1, y2: 9, wallType: 'agarikamachi' },
                { id: uid(), x1: 3, y1: 2, x2: 5, y2: 2, wallType: 'koshikabe' }
            ],
            pillars: [
                { id: uid(), x: 2, y: 6, sizeMm: 150, shape: 'square' }
            ],
            openings: [
                { id: uid(), category: 'door', doorFit: 'oyako', type: 'ENTRANCE_DOOR', x: 0.0, y: 8.0, orient: 'v', flip: false, widthP: 1.3, widthMm: 1200, heightMm: 2200, sillMm: 0, leafCount: 2, isWin: false },
                { id: uid(), category: 'window', doorFit: 'hikichigai', type: 'WIN_FULL', x: 5.5, y: 9.0, orient: 'h', flip: false, widthP: 2.0, widthMm: 1820, heightMm: 2000, sillMm: 0, leafCount: 2, isWin: true },
                { id: uid(), category: 'window', doorFit: 'hikichigai', type: 'WIN_SLIDE', x: 1.5, y: 0.0, orient: 'h', flip: false, widthP: 1.8, widthMm: 1650, heightMm: 1100, sillMm: 900, leafCount: 2, isWin: true },
                { id: uid(), category: 'window', doorFit: 'fix', type: 'WIN_SLIDE', x: 7.0, y: 4.5, orient: 'v', flip: false, widthP: 1.8, widthMm: 1650, heightMm: 1100, sillMm: 900, leafCount: 1, isWin: true },
                { id: uid(), category: 'door', doorFit: 'katahiraki', type: 'SWING_DOOR', x: 1.0, y: 5.5, orient: 'v', flip: false, widthP: 0.88, widthMm: 800, heightMm: 2000, sillMm: 0, leafCount: 1, isWin: false },
                { id: uid(), category: 'door', doorFit: 'katabiki', type: 'SLIDING_DOOR', x: 3.5, y: 2.0, orient: 'h', flip: false, widthP: 0.88, widthMm: 800, heightMm: 2000, sillMm: 0, leafCount: 1, isWin: false }
            ],
            fixtures: [
                { id: uid(), category: 'UB', type: 'UB_1616', x: 5.0, y: 0.0, w: 2.0, h: 2.0, wMm: 1600, dMm: 1600, hMm: 2150, rot: 0, label: 'ユニットバス 1616', fxData: { ubSize: '1616', ubPattern: 'patternA' } },
                { id: uid(), category: 'VANITY', type: 'VANITY', x: 3.1, y: 0.0, w: 1.0, h: 0.6, wMm: 900, dMm: 550, hMm: 800, rot: 0, label: '洗面化粧台 W900' },
                { id: uid(), category: 'TOILET_FIX', type: 'TOILET_FIX', x: 0.1, y: 5.2, w: 0.50, h: 0.85, wMm: 455, dMm: 774, hMm: 780, rot: 0, label: 'トイレ便器' },
                { id: uid(), category: 'KITCHEN', type: 'KITCHEN_I', x: 3.2, y: 2.2, w: 2.8, h: 0.71, wMm: 2550, dMm: 650, hMm: 850, rot: 0, label: 'I型キッチン (255×65cm)', fxData: { kitchenType: 'I', kHeight: 850 } }
            ],
            stairs: [
                { id: uid(), kind: 'stair', type: 'STAIR', category: 'STAIR', shapeType: 'STRAIGHT', x: 0.0, y: 2.0, w: 1.0, h: 3.0, widthMm: 910, direction: 'UP', turnType: 'turn_3', stairStyle: 'box', handrail: 'both', steps: 14, riserMm: 195, treadMm: 220, label: '階段 (直階段・上る)' }
            ],
            strokes: [],
            stamps: [],
            memos: [],
            polyPillars: [],
            boxes3d: []
        },
        2: {
            rooms: [
                { id: uid(), type: 'YOSHITSU', x: 0, y: 0, w: 4, h: 4, customName: '主寝室' },
                { id: uid(), type: 'WIC', x: 4, y: 0, w: 3, h: 2, customName: 'WIC' },
                { id: uid(), type: 'ROUKA', x: 0, y: 4, w: 4, h: 2, customName: '2Fホール' },
                { id: uid(), type: 'VOID', x: 4, y: 2, w: 3, h: 4, customName: '吹き抜け' },
                { id: uid(), type: 'YOSHITSU', x: 0, y: 6, w: 3.5, h: 3, customName: '洋室A' },
                { id: uid(), type: 'YOSHITSU', x: 3.5, y: 6, w: 3.5, h: 3, customName: '洋室B' },
                { id: uid(), type: 'BALCONY', x: 0, y: 9, w: 7, h: 1.5, customName: '南バルコニー' }
            ],
            walls: [
                { id: uid(), x1: 4, y1: 2, x2: 4, y2: 6, wallType: 'koshikabe' }
            ],
            pillars: [],
            openings: [
                { id: uid(), category: 'window', doorFit: 'hikichigai', type: 'WIN_FULL', x: 1.8, y: 9.0, orient: 'h', flip: false, widthP: 1.8, widthMm: 1650, heightMm: 2000, sillMm: 0, leafCount: 2, isWin: true },
                { id: uid(), category: 'window', doorFit: 'hikichigai', type: 'WIN_FULL', x: 5.2, y: 9.0, orient: 'h', flip: false, widthP: 1.8, widthMm: 1650, heightMm: 2000, sillMm: 0, leafCount: 2, isWin: true },
                { id: uid(), category: 'door', doorFit: 'katahiraki', type: 'SWING_DOOR', x: 2.0, y: 4.0, orient: 'h', flip: false, widthP: 0.88, widthMm: 800, heightMm: 2000, sillMm: 0, leafCount: 1, isWin: false },
                { id: uid(), category: 'door', doorFit: 'oredo', type: 'FOLD_DOOR', x: 4.0, y: 1.0, orient: 'v', flip: false, widthP: 1.5, widthMm: 1365, heightMm: 2000, sillMm: 0, leafCount: 2, isWin: false }
            ],
            fixtures: [],
            stairs: [
                { id: uid(), kind: 'stair', type: 'STAIR', category: 'STAIR', shapeType: 'STRAIGHT', x: 0.0, y: 2.0, w: 1.0, h: 3.0, widthMm: 910, direction: 'DOWN', turnType: 'turn_3', stairStyle: 'box', handrail: 'both', steps: 14, riserMm: 195, treadMm: 220, label: '階段 (直階段・降りる)' }
            ],
            strokes: [],
            stamps: [],
            memos: [],
            polyPillars: [],
            boxes3d: []
        },
        3: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], stairs: [], strokes: [], stamps: [], memos: [], polyPillars: [], boxes3d: [] },
        4: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], stairs: [], strokes: [], stamps: [], memos: [], polyPillars: [], boxes3d: [] }
    };
    state.history = [];
    state.historyIndex = -1;
    if (typeof window.syncUpperFloorStairs === 'function') window.syncUpperFloorStairs();
    saveHistorySnapshot();
    if (typeof reset2DCamera === 'function') reset2DCamera();
    showToast('モデルプラン「07邸 吹抜けがある」を読み込みました');
}

function loadSample2StoryPlan() {
    loadSampleHousePlan();
}

function clearAllPlan() {
    state.floors = {
        0: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], stairs: [], strokes: [], stamps: [], memos: [], polyPillars: [], boxes3d: [] },
        1: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], stairs: [], strokes: [], stamps: [], memos: [], polyPillars: [], boxes3d: [] },
        2: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], stairs: [], strokes: [], stamps: [], memos: [], polyPillars: [], boxes3d: [] },
        3: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], stairs: [], strokes: [], stamps: [], memos: [], polyPillars: [], boxes3d: [] },
        4: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], stairs: [], strokes: [], stamps: [], memos: [], polyPillars: [], boxes3d: [] }
    };
    state.guides = [];
    state.selectedItem = null;
    saveHistorySnapshot();
    showToast('白紙キャンバスにリセットしました');
}

let needs2DRedraw = true;
function request2DRedraw() {
    needs2DRedraw = true;
    if (typeof window !== 'undefined') window.needs2DRedraw = true;
}

function findSelectedObject() {
    if (!state.selectedItem) return null;
    if (state.selectedItem.kind === 'guide') {
        return (state.guides || []).find(g => g.id === state.selectedItem.id) || null;
    }
    const fl = state.floors[state.selectedItem.floor];
    if (!fl) return null;
    const id = state.selectedItem.id;
    const k = state.selectedItem.kind;
    if (k === 'room') return fl.rooms.find(r => r.id === id);
    if (k === 'wall') return fl.walls.find(w => w.id === id);
    if (k === 'opening') return fl.openings.find(o => o.id === id);
    if (k === 'fixture') return fl.fixtures.find(f => f.id === id);
    if (k === 'pillar') return fl.pillars.find(p => p.id === id);
    if (k === 'stair') return ((fl.stairs || []).find(s => s.id === id) || (fl.fixtures || []).find(f => f.id === id));
    if (k === 'memo') return (fl.memos || []).find(m => m.id === id) || (fl.stamps || []).find(s => s.id === id);
    if (k === 'box3d') return (fl.boxes3d || []).find(b => b.id === id) || (fl.fixtures || []).find(f => f.id === id);
    return null;
}

if (typeof window !== 'undefined') {
    window.state = state;
    window.uid = uid;
    window.showToast = showToast;
    window.ensureFloorsStructure = ensureFloorsStructure;
    window.saveHistorySnapshot = saveHistorySnapshot;
    window.undo = undo;
    window.redo = redo;
    window.loadSampleHousePlan = loadSampleHousePlan;
    window.loadSample2StoryPlan = loadSample2StoryPlan;
    window.clearAllPlan = clearAllPlan;
    window.needs2DRedraw = needs2DRedraw;
    window.request2DRedraw = request2DRedraw;
    window.findSelectedObject = findSelectedObject;
}
