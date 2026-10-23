# -*- coding: utf-8 -*-
"""
Phase 1: 階段廻り部仕様の拡充スクリプト（完全版）
（2段廻り・3段廻り・4段廻り・フラット踊り場）
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

# 1. stairCreateModal の配置（presetModalの直前）
stair_modal_html = """
    <!-- 階段作成モーダル（添付資料準拠・2段/3段/4段/踊り場対応） -->
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
                    <label class="text-xs font-bold text-slate-300">廻り部仕様</label>
                    <select id="modalStairTurn" class="bg-slate-900 text-amber-300 border border-slate-600 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none">
                        <option value="turn_2">2段廻り (緩やか・安全45°)</option>
                        <option value="turn_3" selected>3段廻り (標準省スペース30°)</option>
                        <option value="turn_4">4段廻り (段数重視22.5°)</option>
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

target_preset = '<div id="presetModal"'
if 'id="stairCreateModal"' not in text:
    text = text.replace(target_preset, stair_modal_html + "\n    " + target_preset, 1)
    print("Inserted stairCreateModal HTML before presetModal!")
else:
    print("stairCreateModal HTML already present")

# 2. プロパティインスペクター内の階段部分を 2段/3段/4段/踊り場 に更新
old_insp_search = "updateStairProp('${fx.id}', 'turnType'"
insp_pos = text.find(old_insp_search)
if insp_pos != -1:
    s_pos = text.rfind("<select", 0, insp_pos)
    e_pos = text.find("</select>", insp_pos) + 9
    new_insp_select = """<select onchange="updateStairProp('${fx.id}', 'turnType', this.value)" class="bg-slate-900 text-amber-200 border border-slate-700 rounded px-2 py-1 font-bold">
                            <option value="turn_2" ${turnType==='turn_2'?'selected':''}>2段廻り (45°)</option>
                            <option value="turn_3" ${turnType==='turn_3'?'selected':''}>3段廻り (30°)</option>
                            <option value="turn_4" ${turnType==='turn_4'?'selected':''}>4段廻り (22.5°)</option>
                            <option value="landing" ${turnType==='landing'?'selected':''}>フラット踊り場</option>
                        </select>"""
    text = text[:s_pos] + new_insp_select + text[e_pos:]
    print("Updated inspector turnType select!")

# 3. 2D描画内の廻り段描画を 2段/3段/4段/踊り場 に更新
draw_search = "fx.shapeType === 'U_SHAPE'"
draw_pos = text.find(draw_search)
if draw_pos != -1:
    corner_search = "// 廻り段の斜めスリット"
    c_pos = text.find(corner_search, draw_pos)
    if c_pos != -1:
        stroke_pos = text.find("ctx.stroke();", c_pos) + 13
        new_draw_corner = """// 廻り段の斜めスリット（2段/3段/4段/踊り場）
            const tType = fx.turnType || 'turn_3';
            if (tType !== 'landing') {
                const cornerH = stepH * 2;
                ctx.beginPath();
                if (tType === 'turn_2') {
                    // 2段廻り（45度分割）
                    ctx.moveTo(0, 0);
                    ctx.lineTo(halfW, cornerH);
                    ctx.moveTo(wPx, 0);
                    ctx.lineTo(halfW, cornerH);
                } else if (tType === 'turn_4') {
                    // 4段廻り（3本線で4分割）
                    ctx.moveTo(0, 0);
                    ctx.lineTo(halfW, cornerH * 0.75);
                    ctx.moveTo(0, cornerH * 0.5);
                    ctx.lineTo(halfW, cornerH);
                    ctx.moveTo(wPx, 0);
                    ctx.lineTo(halfW, cornerH * 0.75);
                    ctx.moveTo(wPx, cornerH * 0.5);
                    ctx.lineTo(halfW, cornerH);
                } else {
                    // 3段廻り（2本線で3分割 / 標準）
                    ctx.moveTo(0, 0);
                    ctx.lineTo(halfW, cornerH);
                    ctx.moveTo(0, cornerH * 0.4);
                    ctx.lineTo(halfW, cornerH);
                    ctx.moveTo(wPx, 0);
                    ctx.lineTo(halfW, cornerH);
                    ctx.moveTo(wPx, cornerH * 0.4);
                    ctx.lineTo(halfW, cornerH);
                }
                ctx.stroke();
            }"""
        text = text[:c_pos] + new_draw_corner + text[stroke_pos:]
        print("Updated 2D stair corner drawing!")

with open(SRC_HTML, 'w', encoding='utf-8') as f:
    f.write(text)

print("Saved src/madori-sketch/index.source.html successfully!")
