# -*- coding: utf-8 -*-
"""
プレビュー描画と3D丸柱対応の追加パッチ
"""

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_HTML = os.path.join(BASE_DIR, 'src', 'madori-sketch', 'index.source.html')
THREE_JS = os.path.join(BASE_DIR, 'src', 'madori-sketch', 'js', 'renderer', 'three_3d.js')

with open(SRC_HTML, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. draw2DCanvas 内のプレビュー描画追加
preview_hook = "    // 5. Active Drag Preview"
new_preview_code = """    // 独立柱ツール選択時のホバープレビュー描画
    if (state.activeTool === 'pillar' && state.lastHoverWorld) {
        const hp = worldPToScreen(state.lastHoverWorld.x, state.lastHoverWorld.y);
        const pSize = state.subPillarSize || 150;
        const pShape = state.subPillarShape || 'square';
        const sz = Math.max(12, state.cam2d.zoom * (pSize / state.modulePitch));
        ctx.save();
        ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        if (pShape === 'round') {
            ctx.beginPath();
            ctx.arc(hp.x, hp.y, sz / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(hp.x - sz / 2, hp.y - sz / 2, sz, sz);
            ctx.strokeRect(hp.x - sz / 2, hp.y - sz / 2, sz, sz);
        }
        // 十字ガイド
        ctx.beginPath();
        ctx.moveTo(hp.x - sz / 2, hp.y); ctx.lineTo(hp.x + sz / 2, hp.y);
        ctx.moveTo(hp.x, hp.y - sz / 2); ctx.lineTo(hp.x, hp.y + sz / 2);
        ctx.stroke();

        // 寸法ラベル
        ctx.setLineDash([]);
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${pShape === 'round' ? 'φ' : ''}${pSize}柱`, hp.x, hp.y - sz / 2 - 6);
        ctx.restore();
    }

    // 壁作図中の始点マーカー＆寸法付きプレビュー描画
    if (state.activeTool === 'wall' && state.wallClickStart) {
        const hoverPt = (state.dragAction && state.dragAction.type === 'wall')
            ? { x: state.dragAction.curX, y: state.dragAction.curY }
            : (state.lastHoverWorld || state.wallClickStart);

        // 直交スナップ（水平または垂直）
        const dx = Math.abs(hoverPt.x - state.wallClickStart.x);
        const dy = Math.abs(hoverPt.y - state.wallClickStart.y);
        const targetPt = dx >= dy
            ? { x: hoverPt.x, y: state.wallClickStart.y }
            : { x: state.wallClickStart.x, y: hoverPt.y };

        const p1 = worldPToScreen(state.wallClickStart.x, state.wallClickStart.y);
        const p2 = worldPToScreen(targetPt.x, targetPt.y);

        ctx.save();
        // 1. 始点パルスマーカー
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();

        // 2. プレビュー線
        if (state.wallClickStart.x !== targetPt.x || state.wallClickStart.y !== targetPt.y) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = state.subWallType === 'interior' ? 6 : 8;
            ctx.setLineDash([8, 4]);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // 3. 寸法バッジ
            const distP = Math.hypot(targetPt.x - state.wallClickStart.x, targetPt.y - state.wallClickStart.y);
            const distMm = Math.round(distP * state.modulePitch);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;

            ctx.setLineDash([]);
            ctx.font = 'bold 11px monospace';
            const badgeText = `${distMm}mm (${distP.toFixed(1)}P)`;
            const textW = ctx.measureText(badgeText).width;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(midX - textW / 2 - 6, midY - 18, textW + 12, 20, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#38bdf8';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badgeText, midX, midY - 8);
        }
        ctx.restore();
    }

""" + preview_hook

if preview_hook in html and 'state.activeTool === \'pillar\' && state.lastHoverWorld' not in html:
    html = html.replace(preview_hook, new_preview_code, 1)
    print("Added pillar hover and wall preview to draw2DCanvas!")

with open(SRC_HTML, 'w', encoding='utf-8') as f:
    f.write(html)

# 2. three_3d.js での丸柱対応
with open(THREE_JS, 'r', encoding='utf-8') as f:
    three_text = f.read()

target_3d_hook = "const colGeo = new THREE.BoxGeometry(colSize, wallHeight + slabHeight, colSize);"
new_3d_geo = """let colGeo;
            if (pl.shape === 'round') {
                colGeo = new THREE.CylinderGeometry(colSize / 2, colSize / 2, wallHeight + slabHeight, 16);
            } else {
                colGeo = new THREE.BoxGeometry(colSize, wallHeight + slabHeight, colSize);
            }"""

if target_3d_hook in three_text:
    three_text = three_text.replace(target_3d_hook, new_3d_geo, 1)
    with open(THREE_JS, 'w', encoding='utf-8') as f:
        f.write(three_text)
    print("Added 3D round pillar geometry to three_3d.js!")
else:
    print("target_3d_hook not found in three_3d.js")
