/**
 * Smile MadoriSketch - Core App State & History Manager
 * (Single Responsibility Principle Refactoring)
 */
// --- Global App State ---
window.setFloorDisplay3D = function(mode) {
    if (typeof state !== 'undefined') state.floorDisplay3D = mode;
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
};
window.set3DFloorDisplay = window.setFloorDisplay3D;

const state = {
    currentPlanId: null,     // 同一間取りデータの継続編集・復元時は同一IDを維持して更新、新規作成時はnull
    currentFloor: 1,         // 1, 2, or 3
    onionSkin: true,         // Show lower floor trace
    modulePitch: 910,        // 910mm or 1000mm
    gridDivisions: 2,        // 1, 2, 3, 4, 5, 6 divisions per 1P
    viewMode: 'split',       // '2d', 'split', '3d'
    stylusOnlyMode: false,

    activeTool: 'wall',      // 'room', 'wall', 'opening', 'fixture', 'select', 'pen', 'eraser', 'pan'
    subRoomType: 'LDK',
    subWallType: 'exterior',
    subPillarSize: 150,          // 105, 120, 150, 200 mm
    subPillarShape: 'square',    // 'square', 'round'
    wallClickStart: null,        // クリック＆クリック方式の壁始点 {x, y} // 'exterior', 'interior', 'pillar' (standalone column)
    subOpeningType: 'WINDOW',
    subOpeningCategory: 'window', // 'window' or 'door'
    subWindowWidth: 1650,
    subWindowHeight: 1100,
    subWindowMountRef: 'top',    // 'top' (天端基準) または 'bottom' (下端基準)
    subWindowTopMm: 2000,        // 天端高 (FL+2000mm)
    subWindowSillMm: 900,        // 下端高 (FL+900mm)
    subFixtureRot: 0,            // 配置前設備の向き (0, 90, 180, 270)
    subStairRot: 0,              // 配置前階段の向き (0, 90, 180, 270)
    subStairDirection: 'UP',     // 'UP' または 'DOWN'
    subDoorFit: 'hikichigai',     // 'hikichigai', 'hikikomi', 'hikiwake', 'katabiki', 'hiraki', 'genkan_slide'
    subDoorLeafCount: 2,
    subDoorLeafWidth: 800,
    subDoorHeight: 2000,
    subFixtureType: 'KITCHEN',
    subFixtureCategory: 'KITCHEN', // 'KITCHEN', 'UB', 'VANITY', 'TOILET_FIX', 'STAIR_STRAIGHT', 'STAIR_UTURN', 'CLOSET_UNIT', 'STANDALONE_COL'
    // キッチン詳細
    subKitchenType: 'I',           // 'I', 'L', 'ISLAND'
    subKitchenIWidth: 2550,
    subKitchenIDepth: 650,
    subKitchenLXWidth: 2550,
    subKitchenLYWidth: 1950,
    subKitchenIslandW: 2550,
    subKitchenIslandD: 900,
    subKitchenHeight: 850,
    // ユニットバス詳細
    subUbSize: '1616',
    subUbPattern: 'patternA',      // 'patternA' (短手出入), 'patternB' (長手出入)
    // 洗面化粧台詳細
    subVanityWidth: 900,
    subVanityDepth: 550,
    subVanityHeight: 800,
    // 設備壁吸着・離れ寸法 (Phase 2)
    subFixtureAlign: 'center',    // 'left', 'center', 'right' (吸着基点)
    subFixtureClearanceMm: 0,     // 壁からの離れ (mm): 0, 50, 100, 150, 200
    subPenColor: '#f43f5e',
    subPenSize: 3,
    subStampSymbol: null,
    // 階段作成ステート
    stairDrawMode: 'path',      // 'path' (一辺ずつ描く), 'preset' (定型ポン置き)
    stairDrawingPoints: [],     // パス入力中の一時座標点配列 [{x, y}]
    stairTempCurPoint: null,    // マウス追従中の現在座標点 {x, y}
    stairWidthMm: 910,          // 階段幅 (mm)
    stairDirection: 'UP',       // 'UP' (上る), 'DOWN' (降りる)
    stairTurnType: 'turn_3',    // 'turn_3' (3段廻り), 'landing' (フラット踊り場)
    stairSteps: 14,             // 標準14段

    cam2d: {
        x: 4.0,
        y: 3.0,
        zoom: 46
    },

    floorDisplay3D: 'all',   // 'all', '1f', '2f', '3f'
    showRoof3D: false,
    sunHour: 14,

    // 3-Story Floor Plan Data Model
    floors: {
        1: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], strokes: [], stamps: [] },
        2: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], strokes: [], stamps: [] },
        3: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], strokes: [], stamps: [] }
    },

    history: [],
    historyIndex: -1,

    selectedItem: null,      // { kind: 'room'|'opening'|'fixture'|'pillar', id, floor }
    dragAction: null
};

function uid() {
    return 'id_' + Math.random().toString(36).substring(2, 9);
}

// --- Toast Helper ---
let toastTimer = null;
function showToast(msg, isWarning = false) {
    const box = document.getElementById('toastBox');
    const inner = document.getElementById('toastInner');
    const icon = document.getElementById('toastIcon');
    document.getElementById('toastMsg').textContent = msg;

    if (isWarning) {
        inner.className = 'bg-rose-950/95 border border-rose-500 text-rose-100 px-4 py-2 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2';
        icon.className = 'fa-solid fa-triangle-exclamation text-rose-400';
    } else {
        inner.className = 'bg-slate-900/95 border border-blue-500/50 text-white px-4 py-2 rounded-full shadow-2xl text-xs font-semibold flex items-center gap-2';
        icon.className = 'fa-solid fa-circle-check text-blue-400';
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
    [1, 2, 3].forEach(f => {
        if (!state.floors[f]) {
            state.floors[f] = { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], strokes: [], stamps: [] };
        }
        if (!state.floors[f].pillars) state.floors[f].pillars = [];
        // Ensure every opening has explicit widthP, heightMm, sillMm
        state.floors[f].openings.forEach(op => {
            const def = OPENING_TYPES[op.type] || OPENING_TYPES.SWING_DOOR;
            if (typeof op.widthP !== 'number') op.widthP = def.widthP;
            if (typeof op.heightMm !== 'number') op.heightMm = def.heightMm;
            if (typeof op.sillMm !== 'number') op.sillMm = def.sillMm;
        });
    });
}

// --- History Management (Undo / Redo) ---
function saveHistorySnapshot() {
    ensureFloorsStructure();
    const snapshot = JSON.stringify(state.floors);
    if (state.historyIndex >= 0 && state.history[state.historyIndex] === snapshot) {
        updateAllMetricsAnd3D();
        renderPropertyInspector();
        return;
    }
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(snapshot);
    if (state.history.length > 40) state.history.shift();
    state.historyIndex = state.history.length - 1;
    updateAllMetricsAnd3D();
    renderPropertyInspector();
}

function undo() {
    if (state.historyIndex > 0) {
        state.historyIndex--;
        state.floors = JSON.parse(state.history[state.historyIndex]);
        ensureFloorsStructure();
        state.selectedItem = null;
        updateAllMetricsAnd3D();
        renderPropertyInspector();
        showToast('元に戻しました (Undo)');
    }
}

function redo() {
    if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        state.floors = JSON.parse(state.history[state.historyIndex]);
        ensureFloorsStructure();
        state.selectedItem = null;
        updateAllMetricsAnd3D();
        renderPropertyInspector();
        showToast('やり直しました (Redo)');
    }
}

// --- Sample Plan 1: 3-Story Urban House with Standalone Porch/Balcony Columns ---
function loadSampleHousePlan() {
    state.floors = {
        1: {
            rooms: [
                { id: uid(), type: 'GENKAN',   x: 0, y: 3, w: 2, h: 2, customName: '玄関ホール' },
                { id: uid(), type: 'PORCH',    x: 0, y: 5, w: 2, h: 1.5, customName: '玄関ポーチ' },
                { id: uid(), type: 'YOSHITSU', x: 2, y: 3, w: 4, h: 3.5, customName: 'ビルトインガレージ' },
                { id: uid(), type: 'YOSHITSU', x: 0, y: 0, w: 3, h: 3, customName: '洋室1 (書斎)' },
                { id: uid(), type: 'SENMEN',   x: 3, y: 0, w: 1.5, h: 2, customName: '洗面室' },
                { id: uid(), type: 'UB',       x: 4.5, y: 0, w: 1.5, h: 2, customName: 'UB1616' },
                { id: uid(), type: 'TOILET',   x: 3, y: 2, w: 1.5, h: 1, customName: '1Fトイレ' },
                { id: uid(), type: 'ROUKA',    x: 4.5, y: 2, w: 1.5, h: 1, customName: '廊下' }
            ],
            walls: [],
            pillars: [
                // ポーチのコーナーを支える独立柱と2Fバルコニー下の独立柱
                { id: uid(), x: 0, y: 6.5, sizeMm: 150 },
                { id: uid(), x: 2, y: 6.5, sizeMm: 150 }
            ],
            openings: [
                { id: uid(), type: 'ENTRANCE_DOOR', x: 1.0, y: 5.0, orient: 'h', flip: false, widthP: 1.0, heightMm: 2200, sillMm: 0 },
                { id: uid(), type: 'WIN_FULL',      x: 4.0, y: 6.5, orient: 'h', flip: false, widthP: 2.5, heightMm: 2100, sillMm: 0 },
                { id: uid(), type: 'WIN_SLIDE',     x: 1.5, y: 0.0, orient: 'h', flip: false, widthP: 1.5, heightMm: 1100, sillMm: 900 },
                { id: uid(), type: 'SWING_DOOR',    x: 1.5, y: 3.0, orient: 'h', flip: false, widthP: 1.0, heightMm: 2000, sillMm: 0 },
                { id: uid(), type: 'SLIDING_DOOR',  x: 3.0, y: 1.0, orient: 'v', flip: false, widthP: 1.0, heightMm: 2000, sillMm: 0 }
            ],
            fixtures: [
                { id: uid(), type: 'UB_1616',        x: 4.5, y: 0.0, w: 1.5, h: 2.0, rot: 0 },
                { id: uid(), type: 'VANITY',         x: 3.0, y: 0.0, w: 1.0, h: 0.5, rot: 0 },
                { id: uid(), type: 'TOILET_FIX',     x: 3.2, y: 2.0, w: 0.5, h: 0.8, rot: 0 },
                { id: uid(), type: 'STAIR_STRAIGHT', x: 0.0, y: 3.0, w: 1.0, h: 2.0, rot: 0 }
            ],
            strokes: [],
            stamps: [{ id: uid(), text: '北', x: 6.8, y: 0.6, color: '#38bdf8' }]
        },
        2: {
            rooms: [
                { id: uid(), type: 'LDK',     x: 0, y: 0, w: 6, h: 5, customName: '2F LDK' },
                { id: uid(), type: 'TOILET',  x: 4.5, y: 5, w: 1.5, h: 1.5, customName: '2Fトイレ' },
                { id: uid(), type: 'WIC',     x: 2, y: 5, w: 2.5, h: 1.5, customName: 'パントリー' },
                { id: uid(), type: 'BALCONY', x: 0, y: 5, w: 2, h: 1.5, customName: '南バルコニー' }
            ],
            walls: [],
            pillars: [],
            openings: [
                { id: uid(), type: 'WIN_FULL',     x: 1.0, y: 5.0, orient: 'h', flip: false, widthP: 1.5, heightMm: 2000, sillMm: 0 },
                { id: uid(), type: 'WIN_SLIDE',    x: 2.0, y: 0.0, orient: 'h', flip: false, widthP: 2.0, heightMm: 1100, sillMm: 900 },
                { id: uid(), type: 'WIN_SLIDE',    x: 6.0, y: 2.5, orient: 'v', flip: false, widthP: 1.5, heightMm: 1100, sillMm: 900 },
                { id: uid(), type: 'FOLD_DOOR',    x: 3.2, y: 5.0, orient: 'h', flip: false, widthP: 1.5, heightMm: 2000, sillMm: 0 },
                { id: uid(), type: 'SWING_DOOR',   x: 5.0, y: 5.0, orient: 'h', flip: false, widthP: 1.0, heightMm: 2000, sillMm: 0 }
            ],
            fixtures: [
                { id: uid(), type: 'KITCHEN_ISLAND', x: 3.0, y: 1.0, w: 2.5, h: 1.0, rot: 0 },
                { id: uid(), type: 'STAIR_STRAIGHT', x: 0.0, y: 3.0, w: 1.0, h: 2.0, rot: 0 },
                { id: uid(), type: 'TOILET_FIX',     x: 5.0, y: 5.5, w: 0.5, h: 0.8, rot: 0 }
            ],
            strokes: [],
            stamps: []
        },
        3: {
            rooms: [
                { id: uid(), type: 'YOSHITSU', x: 0, y: 0, w: 3.5, h: 3, customName: '主寝室' },
                { id: uid(), type: 'WIC',      x: 3.5, y: 0, w: 2.5, h: 2, customName: 'WIC' },
                { id: uid(), type: 'ROUKA',    x: 0, y: 3, w: 2.5, h: 2, customName: '3Fホール' },
                { id: uid(), type: 'YOSHITSU', x: 2.5, y: 2, w: 3.5, h: 3, customName: '子供室' },
                { id: uid(), type: 'BALCONY',  x: 0, y: 5, w: 6, h: 1.5, customName: 'ルーフバルコニー' }
            ],
            walls: [],
            pillars: [],
            openings: [
                { id: uid(), type: 'WIN_FULL',   x: 4.2, y: 5.0, orient: 'h', flip: false, widthP: 2.0, heightMm: 2000, sillMm: 0 },
                { id: uid(), type: 'WIN_SLIDE',  x: 1.7, y: 0.0, orient: 'h', flip: false, widthP: 1.5, heightMm: 1100, sillMm: 900 },
                { id: uid(), type: 'SWING_DOOR', x: 1.8, y: 3.0, orient: 'h', flip: false, widthP: 1.0, heightMm: 2000, sillMm: 0 },
                { id: uid(), type: 'SWING_DOOR', x: 2.5, y: 3.5, orient: 'v', flip: false, widthP: 1.0, heightMm: 2000, sillMm: 0 },
                { id: uid(), type: 'FOLD_DOOR',  x: 3.5, y: 1.0, orient: 'v', flip: false, widthP: 1.0, heightMm: 2000, sillMm: 0 }
            ],
            fixtures: [
                { id: uid(), type: 'STAIR_STRAIGHT', x: 0.0, y: 3.0, w: 1.0, h: 2.0, rot: 0 }
            ],
            strokes: [],
            stamps: []
        }
    };
    state.history = [];
    state.historyIndex = -1;
    saveHistorySnapshot();
    reset2DCamera();
    showToast('3階建てホワイトモデル（1F〜3F＋独立柱）を読み込みました');
}

function loadSample2StoryPlan() {
    loadSampleHousePlan();
    state.floors[3] = { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], strokes: [], stamps: [] };
    if (state.currentFloor === 3) setFloor(1);
    saveHistorySnapshot();
    showToast('標準2階建てモデルを読み込みました');
}

function clearAllPlan() {
    state.floors = {
        1: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], strokes: [], stamps: [] },
        2: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], strokes: [], stamps: [] },
        3: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], strokes: [], stamps: [] }
    };
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
    const fl = state.floors[state.selectedItem.floor];
    if (!fl) return null;
    const id = state.selectedItem.id;
    if (state.selectedItem.kind === 'room') return fl.rooms.find(r => r.id === id);
    if (state.selectedItem.kind === 'opening') return fl.openings.find(o => o.id === id);
    if (state.selectedItem.kind === 'fixture') return fl.fixtures.find(f => f.id === id);
    if (state.selectedItem.kind === 'pillar') return fl.pillars.find(p => p.id === id);
    if (state.selectedItem.kind === 'stair') return ((fl.stairs || []).find(s => s.id === id) || (fl.fixtures || []).find(f => f.id === id));
    return null;
}

// Global Window Export for Backward Compatibility
if (typeof window !== 'undefined') {
    window.state = state;
    window.showToast = showToast;
    window.ensureFloorsStructure = ensureFloorsStructure;
    window.saveHistorySnapshot = saveHistorySnapshot;
    window.undo = undo;
    window.redo = redo;
    window.loadSampleHousePlan = loadSampleHousePlan;
    window.clearAllPlan = clearAllPlan;
    window.needs2DRedraw = needs2DRedraw;
    window.request2DRedraw = request2DRedraw;
    window.findSelectedObject = findSelectedObject;
}

