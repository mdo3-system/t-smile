# -*- coding: utf-8 -*-
"""
Phase 1: 階段廻り部仕様の拡充スクリプト
（2段廻り・3段廻り・4段廻り・フラット踊り場 のUIおよび2D描画対応）
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

# 1. モーダルダイアログ内の選択肢を更新
old_modal_turn = """                    <select id="modalStairTurn" class="bg-slate-900 text-amber-300 border border-slate-600 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none">
                        <option value="turn_3" selected>3段廻り (標準省スペース)</option>
                        <option value="landing">フラット踊り場 (安全仕様)</option>
                    </select>"""

new_modal_turn = """                    <select id="modalStairTurn" class="bg-slate-900 text-amber-300 border border-slate-600 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none">
                        <option value="turn_2">2段廻り (緩やか・安全45°)</option>
                        <option value="turn_3" selected>3段廻り (標準省スペース30°)</option>
                        <option value="turn_4">4段廻り (段数重視22.5°)</option>
                        <option value="landing">フラット踊り場 (安全仕様)</option>
                    </select>"""

if old_modal_turn in text:
    text = text.replace(old_modal_turn, new_modal_turn, 1)
    print("Updated modal stair turn options!")
else:
    print("Warning: old_modal_turn not found")

# 2. プロパティインスペクター内の選択肢を更新
old_insp_turn = """                        <select onchange="updateStairProp('${fx.id}', 'turnType', this.value)" class="bg-slate-900 text-amber-200 border border-slate-700 rounded px-2 py-1 font-bold">
                            <option value="turn_3" ${turnType==='turn_3'?'selected':''}>3段廻り</option>
                            <option value="landing" ${turnType==='landing'?'selected':''}>フラット踊り場</option>
                        </select>"""

new_insp_turn = """                        <select onchange="updateStairProp('${fx.id}', 'turnType', this.value)" class="bg-slate-900 text-amber-200 border border-slate-700 rounded px-2 py-1 font-bold">
                            <option value="turn_2" ${turnType==='turn_2'?'selected':''}>2段廻り (45°)</option>
                            <option value="turn_3" ${turnType==='turn_3'?'selected':''}>3段廻り (30°)</option>
                            <option value="turn_4" ${turnType==='turn_4'?'selected':''}>4段廻り (22.5°)</option>
                            <option value="landing" ${turnType==='landing'?'selected':''}>フラット踊り場</option>
                        </select>"""

if old_insp_turn in text:
    text = text.replace(old_insp_turn, new_insp_turn, 1)
    print("Updated inspector stair turn options!")
else:
    print("Warning: old_insp_turn not found")

# 3. 2D描画の廻り段描画を2段/3段/4段/踊り場に対応
old_2d_turn_target = """            // 廻り段の斜めスリット (上部または下部)
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(halfW, stepH * 1.5);
            ctx.moveTo(wPx, 0);
            ctx.lineTo(halfW, stepH * 1.5);
            ctx.stroke();"""

new_2d_turn = """            // 廻り段の斜めスリット（2段/3段/4段/踊り場）
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

if old_2d_turn_target in text:
    text = text.replace(old_2d_turn_target, new_2d_turn, 1)
    print("Updated 2D U-shape stair turn drawing!")
else:
    print("Warning: old_2d_turn_target not found")

with open(SRC_HTML, 'w', encoding='utf-8') as f:
    f.write(text)

print("Saved updated src/madori-sketch/index.source.html with Phase 1 stairs!")
