# -*- coding: utf-8 -*-
"""
階段の2D描画・入力中プレビュー・3D立体化スクリプト
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
# 1. drawFixture2D 内に本格的な階段描画を追加
# =========================================================================
old_stair_draw_target = "ctx.fillText(fx.label, wPx / 2, hPx / 2);"
new_stair_draw = """if (cat === 'STAIR' || cat.startsWith('STAIR')) {
        // ==========================================
        // 🪜 本格建築図面 階段（ステップ・廻り段・UP/DN矢印）
        // ==========================================
        ctx.fillStyle = isSelected ? '#fffbeb' : '#fafaf9';
        ctx.fillRect(0, 0, wPx, hPx);

        ctx.strokeStyle = isSelected ? '#f59e0b' : '#334155';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.strokeRect(0, 0, wPx, hPx);

        // ステップ線の描画
        const isVert = hPx >= wPx;
        const steps = fx.steps || 14;
        const dispSteps = Math.min(steps, Math.max(8, Math.round((isVert ? hPx : wPx) / 12)));

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;

        if (fx.shapeType === 'U_SHAPE') {
            // コの字型階段 (折り返し)
            const halfW = wPx / 2;
            ctx.beginPath();
            ctx.moveTo(halfW, 0);
            ctx.lineTo(halfW, hPx);
            ctx.stroke();

            // 左右の段線
            const stepH = hPx / Math.ceil(dispSteps / 2);
            for (let i = 1; i < dispSteps / 2; i++) {
                ctx.beginPath();
                ctx.moveTo(0, i * stepH);
                ctx.lineTo(halfW, i * stepH);
                ctx.moveTo(halfW, i * stepH);
                ctx.lineTo(wPx, i * stepH);
                ctx.stroke();
            }

            // 廻り段の斜めスリット (上部または下部)
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(halfW, stepH * 1.5);
            ctx.moveTo(wPx, 0);
            ctx.lineTo(halfW, stepH * 1.5);
            ctx.stroke();
        } else if (fx.shapeType === 'L_SHAPE') {
            // かね折れL型階段
            const stepDist = (isVert ? hPx : wPx) / dispSteps;
            for (let i = 1; i < dispSteps; i++) {
                ctx.beginPath();
                if (isVert) {
                    ctx.moveTo(0, i * stepDist);
                    ctx.lineTo(wPx, i * stepDist);
                } else {
                    ctx.moveTo(i * stepDist, 0);
                    ctx.lineTo(i * stepDist, hPx);
                }
                ctx.stroke();
            }
            // コーナーの斜め線
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(wPx, Math.min(wPx, hPx));
            ctx.stroke();
        } else {
            // 直階段
            const stepDist = (isVert ? hPx : wPx) / dispSteps;
            for (let i = 1; i < dispSteps; i++) {
                ctx.beginPath();
                if (isVert) {
                    ctx.moveTo(0, i * stepDist);
                    ctx.lineTo(wPx, i * stepDist);
                } else {
                    ctx.moveTo(i * stepDist, 0);
                    ctx.lineTo(i * stepDist, hPx);
                }
                ctx.stroke();
            }
        }

        // 昇降矢印（UP / DN）
        ctx.fillStyle = '#0284c7';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        const arrowDir = fx.direction || 'UP';

        ctx.beginPath();
        if (isVert) {
            const startY = arrowDir === 'UP' ? hPx * 0.85 : hPx * 0.15;
            const endY = arrowDir === 'UP' ? hPx * 0.15 : hPx * 0.85;
            ctx.arc(wPx / 2, startY, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.moveTo(wPx / 2, startY);
            ctx.lineTo(wPx / 2, endY);
            ctx.stroke();
            // 矢じり
            const tipY = endY + (arrowDir === 'UP' ? 6 : -6);
            ctx.beginPath();
            ctx.moveTo(wPx / 2 - 4, tipY);
            ctx.lineTo(wPx / 2, endY);
            ctx.lineTo(wPx / 2 + 4, tipY);
            ctx.stroke();
        } else {
            const startX = arrowDir === 'UP' ? wPx * 0.15 : wPx * 0.85;
            const endX = arrowDir === 'UP' ? wPx * 0.85 : wPx * 0.15;
            ctx.arc(startX, hPx / 2, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.moveTo(startX, hPx / 2);
            ctx.lineTo(endX, hPx / 2);
            ctx.stroke();
            const tipX = endX + (arrowDir === 'UP' ? -6 : 6);
            ctx.beginPath();
            ctx.moveTo(tipX, hPx / 2 - 4);
            ctx.lineTo(endX, hPx / 2);
            ctx.lineTo(tipX, hPx / 2 + 4);
            ctx.stroke();
        }

        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(arrowDir === 'UP' ? 'UP' : 'DN', wPx / 2, hPx / 2);

        ctx.restore();
        return;
    }

    ctx.fillText(fx.label, wPx / 2, hPx / 2);"""

if old_stair_draw_target in text:
    text = text.replace(old_stair_draw_target, new_stair_draw, 1)
    print("Replaced stair 2D drawing!")

# =========================================================================
# 2. draw2DCanvas 内に入力中の階段パスのリアルタイム描画を追加
# =========================================================================
pdown_preview_target = "// Draw temporary drag previews"
stair_path_preview = """// Draw Stair Input Path Preview (添付資料準拠の青矢印と赤丸タップ)
    if (state.activeTool === 'stair' && state.stairDrawingPoints && state.stairDrawingPoints.length > 0) {
        const pts = state.stairDrawingPoints;
        ctx.save();
        ctx.strokeStyle = '#0284c7';
        ctx.fillStyle = '#0284c7';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // 折れ線の描画
        ctx.beginPath();
        const p0 = worldPToScreen(pts[0].x, pts[0].y);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < pts.length; i++) {
            const pi = worldPToScreen(pts[i].x, pts[i].y);
            ctx.lineTo(pi.x, pi.y);
        }
        ctx.stroke();

        // 各点のマーカー（始点: 青丸、終点・角: 赤丸タップマーカー）
        pts.forEach((pt, idx) => {
            const sp = worldPToScreen(pt.x, pt.y);
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 7, 0, Math.PI * 2);
            if (idx === pts.length - 1 && pts.length > 1) {
                ctx.fillStyle = '#ef4444'; // 終点は添付資料通りの赤丸！
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();

                // 「タップ」ラベル吹き出し（添付資料を再現）
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.roundRect(sp.x + 10, sp.y - 12, 42, 22, 6);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('タップ', sp.x + 31, sp.y - 1);
            } else {
                ctx.fillStyle = '#0284c7';
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });

        // 辺の長さ（mm）を表示
        for (let i = 0; i < pts.length - 1; i++) {
            const pA = worldPToScreen(pts[i].x, pts[i].y);
            const pB = worldPToScreen(pts[i+1].x, pts[i+1].y);
            const midX = (pA.x + pB.x) / 2;
            const midY = (pA.y + pB.y) / 2;
            const lenP = Math.hypot(pts[i+1].x - pts[i].x, pts[i+1].y - pts[i].y);
            const lenMm = Math.round(lenP * (state.modulePitch || 910));
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
            ctx.fillRect(midX - 25, midY - 9, 50, 18);
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(`${lenMm}mm`, midX, midY);
        }

        ctx.restore();
    }

    """ + pdown_preview_target

if pdown_preview_target in text:
    text = text.replace(pdown_preview_target, stair_path_preview, 1)
    print("Added stair path preview to draw2DCanvas!")

# =========================================================================
# 3. プロパティインスペクターに階段の詳細編集を追加
# =========================================================================
inspector_target = "if (item.kind === 'fixture') {"
inspector_stair_code = """if (item.kind === 'fixture') {
        const fx = fl.fixtures.find(f => f.id === item.id);
        if (!fx) return;

        if (fx.category === 'STAIR' || fx.type === 'STAIR' || fx.type.startsWith('STAIR')) {
            // 階段のプロパティインスペクター
            const dir = fx.direction || 'UP';
            const widthMm = fx.widthMm || 910;
            const turnType = fx.turnType || 'turn_3';

            panel.innerHTML = `
                <div class="flex items-center justify-between border-b border-slate-700/60 pb-2 mb-2">
                    <span class="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <i class="fa-solid fa-stairs"></i> ${fx.label || '階段'}
                    </span>
                    <button onclick="deleteSelectedItem()" class="text-rose-400 hover:text-rose-300 text-xs px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30">
                        <i class="fa-solid fa-trash mr-1"></i>削除
                    </button>
                </div>
                <div class="flex flex-col gap-2 text-xs">
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400">昇降方向:</span>
                        <div class="flex items-center gap-1">
                            <button onclick="updateStairProp('${fx.id}', 'direction', 'UP')" class="px-2 py-1 rounded font-bold ${dir==='UP'?'bg-cyan-600 text-white':'bg-slate-800 text-slate-300'}">上る ↗</button>
                            <button onclick="updateStairProp('${fx.id}', 'direction', 'DOWN')" class="px-2 py-1 rounded font-bold ${dir==='DOWN'?'bg-cyan-600 text-white':'bg-slate-800 text-slate-300'}">降りる ↘</button>
                        </div>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400">階段幅:</span>
                        <select onchange="updateStairProp('${fx.id}', 'widthMm', parseInt(this.value))" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-2 py-1 font-bold mono-num">
                            <option value="910" ${widthMm===910?'selected':''}>910 mm (標準)</option>
                            <option value="1000" ${widthMm===1000?'selected':''}>1000 mm (広幅)</option>
                            <option value="780" ${widthMm===780?'selected':''}>780 mm (小幅)</option>
                        </select>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400">廻り部仕様:</span>
                        <select onchange="updateStairProp('${fx.id}', 'turnType', this.value)" class="bg-slate-900 text-amber-200 border border-slate-700 rounded px-2 py-1 font-bold">
                            <option value="turn_3" ${turnType==='turn_3'?'selected':''}>3段廻り</option>
                            <option value="landing" ${turnType==='landing'?'selected':''}>フラット踊り場</option>
                        </select>
                    </div>
                </div>
            `;
            return;
        }
    """

if inspector_target in text:
    text = text.replace(inspector_target, inspector_stair_code, 1)
    print("Added stair property inspector!")

# updateStairProp 関数を追加
text += """
function updateStairProp(id, prop, val) {
    const fl = state.floors[state.currentFloor];
    const fx = fl.fixtures.find(f => f.id === id);
    if (!fx) return;
    fx[prop] = val;
    fx.label = `階段 (${fx.shapeType === 'STRAIGHT' ? '直階段' : (fx.shapeType === 'L_SHAPE' ? 'かね折れL型' : '折り返しU型')}・${fx.direction === 'UP' ? '上る' : '降りる'})`;
    saveHistorySnapshot();
    renderPropertyInspector();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast('階段の設定を更新しました');
}
"""

with open(SRC_HTML, 'w', encoding='utf-8') as f:
    f.write(text)

print("Saved updated src/madori-sketch/index.source.html with 2D rendering!")
