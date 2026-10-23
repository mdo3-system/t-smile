# -*- coding: utf-8 -*-
"""
住ま居る 3D間取りスケッチ工房 (MadoriSketch)
階段入力機能刷新スクリプト（添付資料準拠のパス入力＋モーダルダイアログ＋3D立体生成）
"""

import os
import sys

if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_HTML = os.path.join(BASE_DIR, 'src', 'madori-sketch', 'index.source.html')
THREE_JS = os.path.join(BASE_DIR, 'src', 'madori-sketch', 'js', 'renderer', 'three_3d.js')

with open(SRC_HTML, 'r', encoding='utf-8') as f:
    text = f.read()

# =========================================================================
# 1. 左ツールバーに「階段」ツールボタンを追加
# =========================================================================
old_toolbar_target = """            <button onclick="selectTool('opening')" id="tool_opening" class="tool-btn w-12 sm:w-16 py-2 rounded-xl border border-slate-700/80 bg-slate-800/70 flex flex-col items-center gap-1 text-slate-300">
                <i class="fa-solid fa-door-open text-base"></i>
                <span class="text-[10px] font-bold leading-none">建具・窓</span>
            </button>"""

new_stair_button = """            <button onclick="selectTool('opening')" id="tool_opening" class="tool-btn w-12 sm:w-16 py-2 rounded-xl border border-slate-700/80 bg-slate-800/70 flex flex-col items-center gap-1 text-slate-300">
                <i class="fa-solid fa-door-open text-base"></i>
                <span class="text-[10px] font-bold leading-none">建具・窓</span>
            </button>
            <button onclick="selectTool('stair')" id="tool_stair" class="tool-btn w-12 sm:w-16 py-2 rounded-xl border border-slate-700/80 bg-slate-800/70 flex flex-col items-center gap-1 text-amber-400">
                <i class="fa-solid fa-stairs text-base"></i>
                <span class="text-[10px] font-bold leading-none">階段</span>
            </button>"""

if old_toolbar_target in text:
    text = text.replace(old_toolbar_target, new_stair_button, 1)
    print("Added stair button to left toolbar!")
else:
    print("Warning: old_toolbar_target not found!")

# =========================================================================
# 2. state に stair 関連プロパティを追加
# =========================================================================
old_state_stair = "subStampSymbol: null,"
new_state_stair = """subStampSymbol: null,
    // 階段作成ステート
    stairDrawMode: 'path',      // 'path' (一辺ずつ描く), 'preset' (定型ポン置き)
    stairDrawingPoints: [],     // パス入力中の一時座標点配列 [{x, y}]
    stairTempCurPoint: null,    // マウス追従中の現在座標点 {x, y}
    stairWidthMm: 910,          // 階段幅 (mm)
    stairDirection: 'UP',       // 'UP' (上る), 'DOWN' (降りる)
    stairTurnType: 'turn_3',    // 'turn_3' (3段廻り), 'landing' (フラット踊り場)
    stairSteps: 14,             // 標準14段"""

if old_state_stair in text:
    text = text.replace(old_state_stair, new_state_stair, 1)
    print("Added stair state properties!")

# =========================================================================
# 3. 階段作成モーダルダイアログの追加（添付資料のデザインに準拠）
# =========================================================================
stair_modal_html = """
    <!-- 階段作成モーダル（添付資料準拠） -->
    <div id="stairCreateModal" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-slate-100 flex flex-col gap-4 animate-scaleIn">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 class="text-base font-bold text-white flex items-center gap-2">
                    <span class="p-1.5 rounded-lg bg-amber-500/20 text-amber-400"><i class="fa-solid fa-stairs"></i></span>
                    階段作成
                </h3>
                <button onclick="closeStairModal()" class="text-slate-400 hover:text-white text-lg"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <p class="text-xs text-slate-300">昇降方向と幅を指定してください</p>
            
            <div class="flex flex-col gap-3">
                <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-bold text-slate-400">昇降方向</label>
                    <div class="grid grid-cols-2 gap-2">
                        <button type="button" id="btnStairDirUp" onclick="setStairModalDir('UP')" class="py-2.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-1.5 transition bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-900/40">
                            <span>上る ↗</span>
                        </button>
                        <button type="button" id="btnStairDirDown" onclick="setStairModalDir('DOWN')" class="py-2.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-1.5 transition bg-slate-800 text-slate-300 border-slate-700 hover:text-white">
                            <span>降りる ↘</span>
                        </button>
                    </div>
                </div>

                <div class="flex items-center justify-between gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                    <label class="text-xs font-bold text-slate-300">階段幅</label>
                    <div class="flex items-center gap-1.5">
                        <select id="modalStairWidth" class="bg-slate-900 text-cyan-300 border border-slate-600 rounded-lg px-3 py-1.5 text-sm font-bold mono-num focus:outline-none">
                            <option value="910" selected>910 mm (メーター/尺標準)</option>
                            <option value="1000">1000 mm (広幅・ゆったり)</option>
                            <option value="780">780 mm (コンパクト)</option>
                        </select>
                    </div>
                </div>

                <div class="flex items-center justify-between gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                    <label class="text-xs font-bold text-slate-300">廻り部（コーナー）</label>
                    <select id="modalStairTurn" class="bg-slate-900 text-amber-300 border border-slate-600 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none">
                        <option value="turn_3" selected>3段廻り (標準省スペース)</option>
                        <option value="landing">フラット踊り場 (安全仕様)</option>
                    </select>
                </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button type="button" onclick="closeStairModal()" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition">
                    キャンセル
                </button>
                <button type="button" onclick="confirmCreateStairFromModal()" class="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg shadow-cyan-900/50 hover:brightness-110 transition flex items-center gap-1.5">
                    <i class="fa-solid fa-check"></i>
                    階段を作成
                </button>
            </div>
        </div>
    </div>
"""

old_modals_target = "<!-- PRESET SELECT MODAL -->"
if old_modals_target in text:
    text = text.replace(old_modals_target, stair_modal_html + "\n    " + old_modals_target, 1)
    print("Added stair creation modal dialog!")

# =========================================================================
# 4. renderSubToolbar に stair のサブツールバーを追加
# =========================================================================
old_subtoolbar_stair_insert = "} else if (state.activeTool === 'fixture') {"
new_subtoolbar_stair = """} else if (state.activeTool === 'stair') {
        const isDrawing = state.stairDrawingPoints && state.stairDrawingPoints.length > 0;
        const ptCount = isDrawing ? state.stairDrawingPoints.length : 0;
        
        container.innerHTML = `
            <div class="flex items-center gap-2 shrink-0">
                <div class="flex items-center bg-slate-900/90 p-1 rounded-lg border border-slate-700 shrink-0 gap-1">
                    <button onclick="setStairDrawMode('path')" class="px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 shrink-0 ${state.stairDrawMode==='path'?'bg-amber-600 text-white shadow':'text-slate-400 hover:text-white'}">
                        <i class="fa-solid fa-pen-nib text-amber-300"></i> 一辺ずつ描く（自由）
                    </button>
                    <button onclick="setStairDrawMode('preset')" class="px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 shrink-0 ${state.stairDrawMode==='preset'?'bg-cyan-600 text-white shadow':'text-slate-400 hover:text-white'}">
                        <i class="fa-solid fa-shapes text-cyan-300"></i> 定型ポン置き
                    </button>
                </div>

                ${state.stairDrawMode === 'path' ? `
                    <div class="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-xs shrink-0">
                        ${!isDrawing ? `
                            <span class="text-amber-300 font-bold"><i class="fa-solid fa-crosshairs mr-1"></i>階段の登り口（始点）をタップしてください</span>
                            <span class="text-slate-400 text-[11px] hidden sm:inline">（直階段・L字・コの字型を壁沿いに一辺ずつ描けます）</span>
                        ` : `
                            <span class="text-cyan-300 font-bold">角・終点をタップ (${ptCount}点指定中)</span>
                            <button onclick="finishStairPathInput()" class="px-3 py-1 rounded-md bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow flex items-center gap-1">
                                <i class="fa-solid fa-check"></i> 階段作成
                            </button>
                            <button onclick="cancelStairDrawing()" class="px-2 py-1 rounded-md bg-slate-700 text-slate-300 font-bold hover:text-white">
                                取消
                            </button>
                        `}
                    </div>
                ` : `
                    <div class="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 text-xs shrink-0">
                        <button onclick="placeStairPreset('STRAIGHT')" class="sub-chip px-2.5 py-1 rounded text-xs font-bold bg-slate-900 border border-slate-700 text-slate-200 hover:text-white">
                            直階段 (1×2マス)
                        </button>
                        <button onclick="placeStairPreset('U_SHAPE')" class="sub-chip px-2.5 py-1 rounded text-xs font-bold bg-slate-900 border border-slate-700 text-slate-200 hover:text-white">
                            折り返し階段 (コの字/1坪)
                        </button>
                        <button onclick="placeStairPreset('L_SHAPE')" class="sub-chip px-2.5 py-1 rounded text-xs font-bold bg-slate-900 border border-slate-700 text-slate-200 hover:text-white">
                            かね折れ階段 (L字型)
                        </button>
                    </div>
                `}
            </div>
        `;
    """ + old_subtoolbar_stair_insert

if old_subtoolbar_stair_insert in text:
    text = text.replace(old_subtoolbar_stair_insert, new_subtoolbar_stair, 1)
    print("Added stair subtoolbar!")

# =========================================================================
# 5. pointerdown, pointermove の階段入力イベント処理
# =========================================================================
# pointerdown 内の分岐
old_pdown_stair_insert = "} else if (state.activeTool === 'fixture') {"
new_pdown_stair = """} else if (state.activeTool === 'stair') {
        handleStairPointerDown(snappedX, snappedY, worldPos.x, worldPos.y);
        return;
    """ + old_pdown_stair_insert

if old_pdown_stair_insert in text:
    text = text.replace(old_pdown_stair_insert, new_pdown_stair, 1)
    print("Added stair handler to pointerdown!")

# =========================================================================
# 6. 階段のロジック関数群（追加スクリプト）
# =========================================================================
stair_functions_code = """
// ============================================================================
// 階段作成システム（添付資料準拠の一辺ずつ描くパス入力 ＆ モーダル ＆ 3D生成）
// ============================================================================

let stairModalCallback = null;

function setStairDrawMode(mode) {
    state.stairDrawMode = mode;
    state.stairDrawingPoints = [];
    state.stairTempCurPoint = null;
    renderSubToolbar();
    request2DRedraw();
}

function handleStairPointerDown(snappedX, snappedY, wx, wy) {
    if (state.stairDrawMode === 'preset') {
        // プリセット配置モード
        placeStairPresetAt('U_SHAPE', snappedX, snappedY);
        return;
    }

    // パス入力モード（添付資料準拠）
    if (!state.stairDrawingPoints) state.stairDrawingPoints = [];
    const pts = state.stairDrawingPoints;

    if (pts.length === 0) {
        // 1点目: 始点を追加
        pts.push({ x: snappedX, y: snappedY });
        showToast('始点を決定しました。次の角または終点をタップしてください');
    } else {
        const lastPt = pts[pts.length - 1];
        // 同じ点なら終点として確定
        if (Math.hypot(lastPt.x - snappedX, lastPt.y - snappedY) < 0.1) {
            if (pts.length >= 2) {
                openStairModal();
            } else {
                showToast('1マス以上の長さを指定してください');
            }
            return;
        }

        // 辺を追加（直交スナップ: XかYの長い方を採用）
        const dx = Math.abs(snappedX - lastPt.x);
        const dy = Math.abs(snappedY - lastPt.y);
        let nextX = snappedX, nextY = snappedY;
        if (dx >= dy) {
            nextY = lastPt.y;
        } else {
            nextX = lastPt.x;
        }

        pts.push({ x: nextX, y: nextY });

        // コの字（3辺＝4点）に達したら自動的にダイアログを開く
        if (pts.length >= 4) {
            openStairModal();
        } else {
            showToast(`${pts.length}点目を指定しました。終点をタップするか「階段作成」を押してください`);
        }
    }

    renderSubToolbar();
    request2DRedraw();
}

function finishStairPathInput() {
    if (!state.stairDrawingPoints || state.stairDrawingPoints.length < 2) {
        showToast('階段の辺（2点以上）を描いてください');
        return;
    }
    openStairModal();
}

function cancelStairDrawing() {
    state.stairDrawingPoints = [];
    state.stairTempCurPoint = null;
    renderSubToolbar();
    request2DRedraw();
    showToast('階段入力をキャンセルしました');
}

function openStairModal() {
    const modal = document.getElementById('stairCreateModal');
    if (!modal) return;
    setStairModalDir(state.stairDirection || 'UP');
    document.getElementById('modalStairWidth').value = state.stairWidthMm || 910;
    document.getElementById('modalStairTurn').value = state.stairTurnType || 'turn_3';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeStairModal() {
    const modal = document.getElementById('stairCreateModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function setStairModalDir(dir) {
    state.stairDirection = dir;
    const btnUp = document.getElementById('btnStairDirUp');
    const btnDown = document.getElementById('btnStairDirDown');
    if (dir === 'UP') {
        btnUp.className = 'py-2.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-1.5 transition bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-900/40';
        btnDown.className = 'py-2.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-1.5 transition bg-slate-800 text-slate-300 border-slate-700 hover:text-white';
    } else {
        btnDown.className = 'py-2.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-1.5 transition bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-900/40';
        btnUp.className = 'py-2.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-1.5 transition bg-slate-800 text-slate-300 border-slate-700 hover:text-white';
    }
}

function confirmCreateStairFromModal() {
    const widthMm = parseInt(document.getElementById('modalStairWidth').value, 10) || 910;
    const turnType = document.getElementById('modalStairTurn').value || 'turn_3';
    const dir = state.stairDirection || 'UP';

    createStairFromPoints(state.stairDrawingPoints, widthMm, dir, turnType);
    closeStairModal();
    state.stairDrawingPoints = [];
    state.stairTempCurPoint = null;
    renderSubToolbar();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast('階段を作成しました（タップして寸法変更・詳細編集可能）');
}

function createStairFromPoints(pts, widthMm, dir, turnType) {
    if (!pts || pts.length < 2) return;
    const fl = state.floors[state.currentFloor];
    const pitch = state.modulePitch || 910;
    const widthP = +(widthMm / pitch).toFixed(3);

    // 形状タイプの判定（1辺: STRAIGHT, 2辺: L_SHAPE, 3辺以上: U_SHAPE）
    const segCount = pts.length - 1;
    let shapeType = 'STRAIGHT';
    if (segCount === 2) shapeType = 'L_SHAPE';
    else if (segCount >= 3) shapeType = 'U_SHAPE';

    // バウンディングボックスの計算
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pts.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    });

    const wP = Math.max(widthP, +(maxX - minX).toFixed(3) || widthP);
    const hP = Math.max(widthP, +(maxY - minY).toFixed(3) || (widthP * 2));

    const newStair = {
        id: uid(),
        kind: 'stair',
        type: 'STAIR',
        category: 'STAIR',
        shapeType: shapeType,
        points: JSON.parse(JSON.stringify(pts)),
        x: minX,
        y: minY,
        w: wP,
        h: hP,
        widthMm: widthMm,
        direction: dir,
        turnType: turnType,
        steps: 14,
        treadMm: 220,
        riserMm: 200,
        label: `階段 (${shapeType === 'STRAIGHT' ? '直階段' : (shapeType === 'L_SHAPE' ? 'かね折れL型' : '折り返しU型')}・${dir === 'UP' ? '上る' : '降りる'})`
    };

    fl.fixtures.push(newStair);
    state.selectedItem = { kind: 'fixture', id: newStair.id, floor: state.currentFloor };
    saveHistorySnapshot();
}

function placeStairPreset(presetType) {
    showToast('配置したい位置をクリックしてください');
    state.stairPresetToPlace = presetType;
    state.stairDrawMode = 'preset';
    renderSubToolbar();
}

function placeStairPresetAt(presetType, x, y) {
    const type = state.stairPresetToPlace || presetType || 'U_SHAPE';
    const pitch = state.modulePitch || 910;
    let pts = [];

    if (type === 'STRAIGHT') {
        pts = [{ x: x, y: y }, { x: x, y: y + 2.0 }];
    } else if (type === 'L_SHAPE') {
        pts = [{ x: x, y: y }, { x: x, y: y + 1.5 }, { x: x + 1.5, y: y + 1.5 }];
    } else {
        // U_SHAPE (コの字型 / 1坪)
        pts = [{ x: x, y: y }, { x: x, y: y + 1.5 }, { x: x + 1.0, y: y + 1.5 }, { x: x + 1.0, y: y }];
    }

    createStairFromPoints(pts, 910, 'UP', 'turn_3');
    state.stairPresetToPlace = null;
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
}
"""

text += "\n" + stair_functions_code

with open(SRC_HTML, 'w', encoding='utf-8') as f:
    f.write(text)

print("Saved updated src/madori-sketch/index.source.html with stair system!")
