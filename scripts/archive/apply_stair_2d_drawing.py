# -*- coding: utf-8 -*-
"""
階段2D本格描画の追加パッチ
"""

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_HTML = os.path.join(BASE_DIR, 'src', 'madori-sketch', 'index.source.html')

with open(SRC_HTML, 'r', encoding='utf-8') as f:
    text = f.read()

target_hook = "    } else if (cat === 'VANITY') {"

stair_2d_code = """    } else if (cat === 'STAIR' || cat.startsWith('STAIR') || (fx.fxData && fx.fxData.shapeType)) {
        // ==========================================
        // 🪜 階段の本格2D描画（段板ステップ線＋UP/DOWN矢印）
        // ==========================================
        ctx.fillStyle = isSelected ? '#fffbeb' : '#fef3c7';
        ctx.strokeStyle = isSelected ? '#f59e0b' : '#b45309';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;

        ctx.fillRect(0, 0, wPx, hPx);
        ctx.strokeRect(0, 0, wPx, hPx);

        // ステップ線（踏面段板）の描画
        const steps = fx.steps || 14;
        const isLongVertical = hPx >= wPx;
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (isLongVertical) {
            const stepCount = Math.max(6, Math.min(14, steps));
            const stepH = hPx / stepCount;
            for (let y = stepH; y < hPx; y += stepH) {
                ctx.moveTo(0, y);
                ctx.lineTo(wPx, y);
            }
        } else {
            const stepCount = Math.max(6, Math.min(14, steps));
            const stepW = wPx / stepCount;
            for (let x = stepW; x < wPx; x += stepW) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, hPx);
            }
        }
        ctx.stroke();

        // 登り方向（UP/DOWN）矢印の描画
        ctx.fillStyle = '#b45309';
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (isLongVertical) {
            ctx.moveTo(wPx / 2, hPx * 0.85);
            ctx.lineTo(wPx / 2, hPx * 0.15);
            ctx.stroke();
            // 矢先端
            ctx.beginPath();
            ctx.moveTo(wPx / 2 - 5, hPx * 0.15 + 8);
            ctx.lineTo(wPx / 2, hPx * 0.15);
            ctx.lineTo(wPx / 2 + 5, hPx * 0.15 + 8);
            ctx.stroke();
        } else {
            ctx.moveTo(wPx * 0.15, hPx / 2);
            ctx.lineTo(wPx * 0.85, hPx / 2);
            ctx.stroke();
            // 矢先端
            ctx.beginPath();
            ctx.moveTo(wPx * 0.85 - 8, hPx / 2 - 5);
            ctx.lineTo(wPx * 0.85, hPx / 2);
            ctx.lineTo(wPx * 0.85 - 8, hPx / 2 + 5);
            ctx.stroke();
        }

        // ラベル
        ctx.fillStyle = '#78350f';
        ctx.font = 'bold 10px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fx.direction === 'DOWN' ? 'DOWN' : 'UP', wPx / 2, hPx / 2);
"""

if target_hook in text and "cat === 'STAIR'" not in text:
    text = text.replace(target_hook, stair_2d_code + "    " + target_hook, 1)
    with open(SRC_HTML, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Added comprehensive 2D stair drawing to drawFixture2D!")
else:
    print("Already added or target hook not found")
