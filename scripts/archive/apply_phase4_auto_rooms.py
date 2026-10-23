# -*- coding: utf-8 -*-
"""
Phase 4: UI刷新 ＆ 壁閉ループによる部屋自動生成 ＆ 部屋名後付け入力システム
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
# 1. <head> に room_detector.js をインポート
# =========================================================================
script_import_target = '<script src="js/renderer/three_3d.js"></script>'
new_script_import = '<script src="js/geometry/room_detector.js"></script>\n    ' + script_import_target

if 'room_detector.js' not in text:
    text = text.replace(script_import_target, new_script_import, 1)
    print("Added room_detector.js script import to <head>!")

# =========================================================================
# 2. 左ツールバーから「部屋ペン」ボタンを廃止し、「壁・柱」を筆頭にする
# =========================================================================
old_room_btn = """            <button onclick="selectTool('room')" id="tool_room" class="tool-btn active w-12 sm:w-16 py-2 rounded-xl border border-slate-700/80 bg-slate-800/70 flex flex-col items-center gap-1 text-slate-300">
                <i class="fa-solid fa-vector-square text-base"></i>
                <span class="text-[10px] font-bold leading-none">部屋</span>
            </button>
            <button onclick="selectTool('wall')" id="tool_wall" class="tool-btn w-12 sm:w-16 py-2 rounded-xl border border-slate-700/80 bg-slate-800/70 flex flex-col items-center gap-1 text-slate-300">
                <i class="fa-solid fa-grip-lines-vertical text-base"></i>
                <span class="text-[10px] font-bold leading-none">壁・独立柱</span>
            </button>"""

new_wall_first_btn = """            <!-- 筆頭ツール: 壁・独立柱（壁を描いて閉じると部屋が自動生成されます） -->
            <button onclick="selectTool('wall')" id="tool_wall" class="tool-btn active w-12 sm:w-16 py-2 rounded-xl border border-slate-700/80 bg-slate-800/70 flex flex-col items-center gap-1 text-sky-400">
                <i class="fa-solid fa-grip-lines-vertical text-base"></i>
                <span class="text-[10px] font-bold leading-none">壁・柱</span>
            </button>"""

if old_room_btn in text:
    text = text.replace(old_room_btn, new_wall_first_btn, 1)
    print("Replaced room button with wall-first button!")
else:
    print("Warning: old_room_btn not found")

# デフォルトのアクティブツールを wall に設定
text = text.replace("activeTool: 'room',", "activeTool: 'wall',", 1)

# =========================================================================
# 3. 壁変更・壁追加時に自動で部屋を認識する triggerAutoRoomDetection()
# =========================================================================
auto_room_js = """
// ============================================================================
// 壁閉ループ自動認識 ＆ 部屋生成マネージャー (Phase 4)
// ============================================================================

function triggerAutoRoomDetection() {
    if (!window.RoomDetector || typeof window.RoomDetector.detectRoomsFromWalls !== 'function') return;

    const fl = state.floors[state.currentFloor];
    if (!fl.walls || fl.walls.length < 3) {
        // 壁が足りない場合は自動検出部屋のみクリア（手動部屋は保持）
        fl.rooms = (fl.rooms || []).filter(r => !r.isAutoDetected);
        request2DRedraw();
        updateAllMetricsAnd3D();
        return;
    }

    const manualRooms = (fl.rooms || []).filter(r => !r.isAutoDetected);
    const existingAutoRooms = (fl.rooms || []).filter(r => r.isAutoDetected);

    const detected = window.RoomDetector.detectRoomsFromWalls(fl.walls, existingAutoRooms, state.modulePitch || 910);

    fl.rooms = [...manualRooms, ...detected];

    updateAllMetricsAnd3D();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
}

// 部屋名パレット定義
const ROOM_NAME_PRESETS = [
    { label: 'LDK', type: 'LDK', color: 'rgba(254, 243, 199, 0.65)' },
    { label: 'リビング', type: 'LIVING', color: 'rgba(254, 243, 199, 0.65)' },
    { label: 'ダイニング', type: 'DINING', color: 'rgba(254, 243, 199, 0.65)' },
    { label: 'キッチン', type: 'KITCHEN_RM', color: 'rgba(224, 242, 254, 0.65)' },
    { label: '主寝室', type: 'BEDROOM', color: 'rgba(237, 233, 254, 0.65)' },
    { label: '洋室', type: 'CHILD_ROOM', color: 'rgba(243, 232, 255, 0.65)' },
    { label: '和室', type: 'JAPANESE', color: 'rgba(220, 252, 231, 0.65)' },
    { label: '玄関', type: 'ENTRANCE', color: 'rgba(254, 226, 226, 0.65)' },
    { label: '洗面室', type: 'WASHROOM', color: 'rgba(207, 250, 254, 0.65)' },
    { label: '浴室', type: 'BATHROOM', color: 'rgba(224, 242, 254, 0.65)' },
    { label: 'トイレ', type: 'TOILET', color: 'rgba(254, 242, 242, 0.65)' },
    { label: 'WIC', type: 'CLOSET', color: 'rgba(241, 245, 249, 0.65)' },
    { label: 'パントリー', type: 'STORAGE', color: 'rgba(241, 245, 249, 0.65)' },
    { label: '納戸', type: 'STORAGE', color: 'rgba(241, 245, 249, 0.65)' },
    { label: 'ホール・廊下', type: 'HALLWAY', color: 'rgba(248, 250, 252, 0.65)' },
    { label: '書斎', type: 'BEDROOM', color: 'rgba(243, 232, 255, 0.65)' },
    { label: 'バルコニー', type: 'BALCONY', color: 'rgba(240, 253, 244, 0.65)' },
    { label: '吹抜', type: 'VOID', color: 'rgba(254, 243, 199, 0.35)' }
];

function setRoomPresetName(roomId, preset) {
    const fl = state.floors[state.currentFloor];
    const rm = fl.rooms.find(r => r.id === roomId);
    if (!rm) return;

    rm.name = preset.label;
    rm.type = preset.type;
    rm.color2d = preset.color;
    saveHistorySnapshot();
    renderPropertyInspector();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast(`部屋名を「${preset.label}」に設定しました`);
}

function updateCustomRoomName(roomId, customName) {
    const fl = state.floors[state.currentFloor];
    const rm = fl.rooms.find(r => r.id === roomId);
    if (!rm) return;

    rm.name = customName.trim();
    saveHistorySnapshot();
    request2DRedraw();
}

window.triggerAutoRoomDetection = triggerAutoRoomDetection;
window.setRoomPresetName = setRoomPresetName;
window.updateCustomRoomName = updateCustomRoomName;
window.ROOM_NAME_PRESETS = ROOM_NAME_PRESETS;
"""

# =========================================================================
# 4. 壁作成完了時（pointerup / 壁ドラッグ終了時）に triggerAutoRoomDetection を実行
# =========================================================================
old_wall_finish = "saveHistorySnapshot();\n            request2DRedraw();"
new_wall_finish = """saveHistorySnapshot();
            if (typeof triggerAutoRoomDetection === 'function') triggerAutoRoomDetection();
            request2DRedraw();"""

text = text.replace(old_wall_finish, new_wall_finish, 1)

# =========================================================================
# 5. 2Dキャンバスでのポリゴン部屋描画（drawRoom2D の刷新）
# =========================================================================
old_draw_room_start = "function drawRoom2D(rm) {"
old_draw_room_end = "function drawWall2D(wl) {"

s_rm = text.find(old_draw_room_start)
e_rm = text.find(old_draw_room_end)

if s_rm != -1 and e_rm != -1:
    new_draw_room_code = """function drawRoom2D(rm) {
    const isSelected = state.selectedItem && state.selectedItem.kind === 'room' && state.selectedItem.id === rm.id;

    ctx.save();

    // 1. ポリゴン（多角形）または矩形の塗りつぶし
    ctx.beginPath();
    if (rm.points && rm.points.length >= 3) {
        const p0 = worldPToScreen(rm.points[0].x, rm.points[0].y);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < rm.points.length; i++) {
            const pi = worldPToScreen(rm.points[i].x, rm.points[i].y);
            ctx.lineTo(pi.x, pi.y);
        }
        ctx.closePath();
    } else {
        const p = worldPToScreen(rm.x, rm.y);
        const wPx = rm.w * state.cam2d.zoom;
        const hPx = rm.h * state.cam2d.zoom;
        ctx.rect(p.x, p.y, wPx, hPx);
    }

    ctx.fillStyle = rm.color2d || 'rgba(241, 245, 249, 0.65)';
    ctx.fill();

    if (isSelected) {
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2.5;
        ctx.stroke();
    }

    // 2. 部屋名 ＆ 帖数のスマート表示（中央配置）
    const center = rm.centroid ? worldPToScreen(rm.centroid.x, rm.centroid.y) : worldPToScreen(rm.x + rm.w / 2, rm.y + rm.h / 2);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const displayName = rm.name && rm.name.trim() !== '' ? rm.name : '';
    const joText = `${rm.jo || ((rm.w * rm.h * (state.modulePitch/1000)**2)/1.62).toFixed(1)}帖`;

    if (displayName !== '') {
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(displayName, center.x, center.y - 7);

        ctx.font = 'normal 10px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(joText, center.x, center.y + 8);
    } else {
        // 未入力時は帖数のみをスマートに表示
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(joText, center.x, center.y);
    }

    ctx.restore();
}

"""
    text = text[:s_rm] + new_draw_room_code + text[e_rm:]
    print("Updated drawRoom2D with polygon support and clean jo labels!")

# =========================================================================
# 6. プロパティインスペクターに「部屋名後付け入力パレット」を追加
# =========================================================================
old_room_insp = "panel.innerHTML = `\n                <div class=\"flex items-center justify-between border-b border-slate-700/60 pb-2 mb-2\">\n                    <span class=\"text-xs font-bold text-blue-300 flex items-center gap-1.5\">\n                        <i class=\"fa-solid fa-vector-square\"></i> ${rm.name || '部屋'}"

new_room_insp = """panel.innerHTML = `
                <div class="flex items-center justify-between border-b border-slate-700/60 pb-2 mb-2">
                    <span class="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                        <i class="fa-solid fa-door-closed"></i> ${rm.name ? rm.name : '部屋（名称未設定）'}
                    </span>
                    <span class="text-xs font-bold text-amber-300 mono-num">${rm.jo || 6}帖 (${rm.areaM2 || 10}㎡)</span>
                </div>
                <div class="flex flex-col gap-2.5 text-xs">
                    <div class="flex flex-col gap-1">
                        <label class="text-[11px] font-bold text-slate-400">部屋名を入力（未入力もOK）:</label>
                        <input type="text" value="${rm.name || ''}" placeholder="例: LDK、主寝室、子供部屋、書斎" oninput="updateCustomRoomName('${rm.id}', this.value)" class="bg-slate-900 text-slate-100 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-cyan-400">
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-[11px] font-bold text-slate-400">ワンタップで部屋名を選ぶ:</label>
                        <div class="grid grid-cols-3 gap-1 max-h-36 overflow-y-auto p-1 bg-slate-900/60 rounded-lg border border-slate-700/50">
                            ${ROOM_NAME_PRESETS.map(p => `
                                <button type="button" onclick="setRoomPresetName('${rm.id}', ROOM_NAME_PRESETS.find(x => x.label === '${p.label}'))" class="px-1.5 py-1 rounded text-[11px] font-bold truncate text-left transition ${rm.name===p.label?'bg-cyan-600 text-white shadow':'bg-slate-800/80 text-slate-300 hover:text-white'}">
                                    ${p.label}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            return;
"""

insp_room_pos = text.find("if (item.kind === 'room') {")
if insp_room_pos != -1:
    insp_room_end = text.find("return;", insp_room_pos) + 7
    text = text[:insp_room_pos + len("if (item.kind === 'room') {")] + "\n        const rm = fl.rooms.find(r => r.id === item.id);\n        if (!rm) return;\n        " + new_room_insp + text[insp_room_end:]
    print("Updated room property inspector with naming palette!")

# 末尾に auto_room_js を追加（</script> の直前）
last_script_end = text.rfind('</script>')
text = text[:last_script_end] + "\n\n" + auto_room_js + "\n" + text[last_script_end:]

with open(SRC_HTML, 'w', encoding='utf-8') as f:
    f.write(text)

print("Saved updated src/madori-sketch/index.source.html with Phase 4 auto room detection!")
