# -*- coding: utf-8 -*-
"""
Phase 2 ＆ UX機能強化 スクリプト
1. 新規作成ボタン（白紙クリア＋確認ダイアログ）
2. 全画面モード誘導バナー ＆ 全画面切替 ＆ beforeunload 離脱防止
3. サッシ・ドアの中心グリッド吸着
4. 設備の壁吸着（左端/中央/右端基点）＆ 壁からの離れ寸法（クリアランス設定）
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

with open(SRC_HTML, 'r', encoding='utf-8') as f:
    text = f.read()

# =========================================================================
# 1. ヘッダーに「新規作成」ボタン と 「全画面モード」ボタンを追加
# =========================================================================
old_preset_btn = """            <button onclick="openPresetModal()" class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1">
                <i class="fa-solid fa-house-chimney text-amber-400"></i>
                <span class="hidden md:inline">サンプル</span>
            </button>"""

new_header_buttons = """            <!-- 新規作成ボタン（白紙クリア） -->
            <button onclick="createNewPlan()" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-200 flex items-center gap-1 active:scale-95 transition" title="編集中の間取りをクリアして白紙から新しく作図">
                <i class="fa-solid fa-file-circle-plus text-rose-400"></i>
                <span class="hidden sm:inline">新規作成</span>
            </button>

            <!-- サンプル読み込み -->
            <button onclick="openPresetModal()" class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1">
                <i class="fa-solid fa-house-chimney text-amber-400"></i>
                <span class="hidden md:inline">サンプル</span>
            </button>"""

if old_preset_btn in text:
    text = text.replace(old_preset_btn, new_header_buttons, 1)
    print("Added createNewPlan button to header!")
else:
    print("Warning: old_preset_btn not found")

# ヘッダー右端に「全画面切替」ボタンを追加
old_dxf_btn = """            <!-- 汎用CAD互換DXFエクスポート -->
            <button onclick="exportDXF()" class="px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 active:scale-95 transition" title="実寸mm座標DXFファイルを出力">
                <i class="fa-solid fa-file-export text-slate-400"></i>
                <span class="hidden lg:inline">DXF</span>
            </button>"""

new_dxf_and_fs_btn = """            <!-- 汎用CAD互換DXFエクスポート -->
            <button onclick="exportDXF()" class="px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 active:scale-95 transition" title="実寸mm座標DXFファイルを出力">
                <i class="fa-solid fa-file-export text-slate-400"></i>
                <span class="hidden lg:inline">DXF</span>
            </button>

            <!-- 全画面モード切替（iPad/タブレット/PC誤操作防止） -->
            <button onclick="toggleFullscreenMode()" id="btnFullscreen" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-sky-950/80 hover:bg-sky-900 border border-sky-500/50 text-sky-200 flex items-center gap-1 active:scale-95 transition" title="全画面表示（ブラウザの戻る誤操作を防止して快適に作図）">
                <i id="fullscreenIcon" class="fa-solid fa-expand"></i>
                <span class="hidden xl:inline">全画面</span>
            </button>"""

if old_dxf_btn in text:
    text = text.replace(old_dxf_btn, new_dxf_and_fs_btn, 1)
    print("Added fullscreen button to header!")
else:
    print("Warning: old_dxf_btn not found")

# =========================================================================
# 2. 全画面誘導バナーをヘッダーの直下に追加
# =========================================================================
fullscreen_banner_html = """
    <!-- iPad/タブレット/PC 全画面推奨バナー -->
    <div id="fullscreenPromptBanner" class="bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 border-b border-sky-500/30 px-3 py-1.5 flex items-center justify-between text-xs text-slate-200 shrink-0">
        <div class="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <span class="p-1 rounded bg-sky-500/20 text-sky-300"><i class="fa-solid fa-tablet-screen-button"></i></span>
            <span class="text-slate-200 font-medium">iPad・タブレット・PCでの作図を快適にするため、<strong>全画面モードでの作図</strong>を推奨しています（「戻る」ボタン誤タップによるデータ消失も防止します）。</span>
        </div>
        <div class="flex items-center gap-2 shrink-0 ml-2">
            <button onclick="toggleFullscreenMode()" class="px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold shadow text-xs flex items-center gap-1 transition">
                <i class="fa-solid fa-expand"></i> 全画面モードを開始
            </button>
            <button onclick="dismissFullscreenPrompt()" class="text-slate-400 hover:text-white p-1 text-sm"><i class="fa-solid fa-xmark"></i></button>
        </div>
    </div>
"""

old_header_tag_end = "</header>"
if old_header_tag_end in text and 'id="fullscreenPromptBanner"' not in text:
    text = text.replace(old_header_tag_end, old_header_tag_end + fullscreen_banner_html, 1)
    print("Added fullscreen prompt banner below header!")

# =========================================================================
# 3. state に設備吸着基点・離れ寸法プロパティを追加
# =========================================================================
old_state_target = "subVanityHeight: 800,"
new_state_props = """subVanityHeight: 800,
    // 設備壁吸着・離れ寸法 (Phase 2)
    subFixtureAlign: 'center',    // 'left', 'center', 'right' (吸着基点)
    subFixtureClearanceMm: 0,     // 壁からの離れ (mm): 0, 50, 100, 150, 200"""

if old_state_target in text and 'subFixtureAlign' not in text:
    text = text.replace(old_state_target, new_state_props, 1)
    print("Added fixture snap and clearance state properties!")

# =========================================================================
# 4. JavaScript関数群の追加（新規作成、全画面、beforeunload、建具中心吸着、設備壁吸着）
# =========================================================================
phase2_js_code = """
// ============================================================================
// Phase 2: UX強化 ＆ 建具中心吸着 ＆ 設備壁吸着・離れ寸法システム
// ============================================================================

// 1. 新規作成（白紙クリア＋確認ダイアログ）
function createNewPlan() {
    const hasData = state.floors[1].rooms.length > 0 || state.floors[1].walls.length > 0 || state.floors[1].fixtures.length > 0;
    if (hasData) {
        if (!confirm('現在編集中の間取りをクリアして、白紙から新しく作図を始めますか？\\n※未保存のデータは消去されます。')) {
            return;
        }
    }

    state.floors = {
        1: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], strokes: [], stamps: [] },
        2: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], strokes: [], stamps: [] },
        3: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], strokes: [], stamps: [] }
    };
    state.selectedItem = null;
    state.currentFloor = 1;
    state.history = [];
    state.historyIndex = -1;
    setFloor(1);
    saveHistorySnapshot();
    renderPropertyInspector();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast('白紙の間取りキャンバスを作成しました。壁や設備を自由に作図してください');
}

// 2. 全画面モード切替 ＆ 離脱防止（beforeunload）
function toggleFullscreenMode() {
    const icon = document.getElementById('fullscreenIcon');
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            if (icon) icon.className = 'fa-solid fa-compress';
            dismissFullscreenPrompt();
            showToast('全画面モードを開始しました（Escキーまたはボタンで解除）');
        }).catch(err => {
            console.warn('Fullscreen error:', err);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen().then(() => {
                if (icon) icon.className = 'fa-solid fa-expand';
            });
        }
    }
}

function dismissFullscreenPrompt() {
    const banner = document.getElementById('fullscreenPromptBanner');
    if (banner) banner.style.display = 'none';
}

// ブラウザの戻る・タブ閉じ誤操作によるデータ消失防止
window.addEventListener('beforeunload', (e) => {
    const hasData = state.floors[1].rooms.length > 0 || state.floors[1].walls.length > 0 || state.floors[1].fixtures.length > 0;
    if (hasData) {
        e.preventDefault();
        e.returnValue = '編集中の間取りデータは破棄されます。よろしいですか？';
        return e.returnValue;
    }
});

// 3. サッシ・ドア（建具）の中心グリッド吸着補正
function snapOpeningCenterToGrid(wx, wy, widthP) {
    const pitch = state.modulePitch || 910;
    const fl = state.floors[state.currentFloor];
    const target = snapPointToNearestWallEdge(wx, wy);

    // 壁上の直近グリッド中心点（0.5グリッド = 455mm単位で中心を吸着）
    if (target.wall) {
        const wl = target.wall;
        const isHoriz = Math.abs(wl.y1 - wl.y2) < 0.05;
        if (isHoriz) {
            const snappedCenterX = Math.round(wx / 0.5) * 0.5;
            target.snappedX = snappedCenterX - widthP / 2;
            target.snappedY = wl.y1;
        } else {
            const snappedCenterY = Math.round(wy / 0.5) * 0.5;
            target.snappedX = wl.x1;
            target.snappedY = snappedCenterY - widthP / 2;
        }
    }
    return target;
}

// 4. 住宅設備の壁吸着（左/中/右基点）＆ 離れ寸法計算
function findNearestWallForFixture(fxX, fxY, fxW, fxH) {
    const fl = state.floors[state.currentFloor];
    const pitch = state.modulePitch || 910;
    const clearanceP = (state.subFixtureClearanceMm || 0) / pitch;
    const align = state.subFixtureAlign || 'center';

    let nearest = null;
    let minDist = 1.0; // 1.0マス（約910mm）以内の壁を自動吸着対象とする

    // 既存の壁一覧から探索
    fl.walls.forEach(wl => {
        const isHoriz = Math.abs(wl.y1 - wl.y2) < 0.05;
        if (isHoriz) {
            // 水平壁
            const minX = Math.min(wl.x1, wl.x2);
            const maxX = Math.max(wl.x1, wl.x2);
            if (fxX + fxW >= minX - 0.5 && fxX <= maxX + 0.5) {
                const distTop = Math.abs(fxY - wl.y1);
                const distBottom = Math.abs((fxY + fxH) - wl.y1);
                if (distTop < minDist) {
                    minDist = distTop;
                    nearest = { wall: wl, side: 'top', y: wl.y1 + clearanceP, rot: 0 };
                }
                if (distBottom < minDist) {
                    minDist = distBottom;
                    nearest = { wall: wl, side: 'bottom', y: wl.y1 - fxH - clearanceP, rot: 0 };
                }
            }
        } else {
            // 垂直壁
            const minY = Math.min(wl.y1, wl.y2);
            const maxY = Math.max(wl.y1, wl.y2);
            if (fxY + fxH >= minY - 0.5 && fxY <= maxY + 0.5) {
                const distLeft = Math.abs(fxX - wl.x1);
                const distRight = Math.abs((fxX + fxW) - wl.x1);
                if (distLeft < minDist) {
                    minDist = distLeft;
                    nearest = { wall: wl, side: 'left', x: wl.x1 + clearanceP, rot: 0 };
                }
                if (distRight < minDist) {
                    minDist = distRight;
                    nearest = { wall: wl, side: 'right', x: wl.x1 - fxW - clearanceP, rot: 0 };
                }
            }
        }
    });

    return nearest;
}

// グローバル公開
window.createNewPlan = createNewPlan;
window.toggleFullscreenMode = toggleFullscreenMode;
window.dismissFullscreenPrompt = dismissFullscreenPrompt;
"""

text += "\n" + phase2_js_code

with open(SRC_HTML, 'w', encoding='utf-8') as f:
    f.write(text)

print("Saved updated src/madori-sketch/index.source.html with Phase 2 and UX enhancements!")
