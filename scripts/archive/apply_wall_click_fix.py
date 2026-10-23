# -*- coding: utf-8 -*-
"""
壁・独立柱のクリック作成 完全対応スクリプト
1. 独立柱: クリックで即座に配置＆2D/3D再描画＆インスペクタ更新
2. 壁: クリック＆クリック（2点クリック連続作図）とドラッグ作図の両方に完全対応
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_HTML = os.path.join(BASE_DIR, 'src', 'madori-sketch', 'index.source.html')

with open(SRC_HTML, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. state に wallClickStart プロパティを追加
old_state_target = "subWallType: 'exterior',"
new_state_prop = """subWallType: 'exterior',
    wallClickStart: null,        // クリック＆クリック方式の壁始点 {x, y}"""

if old_state_target in text and 'wallClickStart' not in text:
    text = text.replace(old_state_target, new_state_prop, 1)
    print("Added wallClickStart to state!")

# 2. pointerdown 内の壁・柱ロジックを更新
old_wall_down = """    } else if (state.activeTool === 'wall') {
        if (state.subWallType === 'pillar') {
            const newPillar = { id: uid(), x: snappedX, y: snappedY, sizeMm: 150 };
            fl.pillars.push(newPillar);
            state.selectedItem = { kind: 'pillar', id: newPillar.id, floor: state.currentFloor };
            saveHistorySnapshot();
            showToast('独立柱（ポーチ・バルコニー脚）を配置しました');
        } else {
            state.dragAction = {
                type: 'wall',
                startX: snappedX,
                startY: snappedY,
                curX: snappedX,
                curY: snappedY
            };
            request2DRedraw();
        }
    }"""

new_wall_down = """    } else if (state.activeTool === 'wall') {
        if (state.subWallType === 'pillar') {
            const newPillar = { id: uid(), x: snappedX, y: snappedY, sizeMm: 150 };
            fl.pillars.push(newPillar);
            state.selectedItem = { kind: 'pillar', id: newPillar.id, floor: state.currentFloor };
            saveHistorySnapshot();
            renderPropertyInspector();
            request2DRedraw();
            if (typeof rebuild3DScene === 'function') rebuild3DScene();
            showToast('独立柱（ポーチ・バルコニー脚）を配置しました');
            return;
        } else {
            // 壁の作成（クリック＆クリック ＆ ドラッグ両対応）
            if (state.wallClickStart) {
                const x1 = state.wallClickStart.x;
                const y1 = state.wallClickStart.y;
                const x2 = snappedX;
                const y2 = snappedY;
                if (x1 !== x2 || y1 !== y2) {
                    fl.walls.push({
                        id: uid(),
                        x1: x1,
                        y1: y1,
                        x2: x2,
                        y2: y2,
                        wallType: state.subWallType || 'exterior'
                    });
                    saveHistorySnapshot();
                    if (typeof triggerAutoRoomDetection === 'function') triggerAutoRoomDetection();
                    showToast('壁を作成しました（続けて次の壁を描くか、同じ点をタップで完了）');
                    // 連続作図のため、終点を次の始点にする
                    state.wallClickStart = { x: x2, y: y2 };
                } else {
                    state.wallClickStart = null;
                }
                request2DRedraw();
                if (typeof rebuild3DScene === 'function') rebuild3DScene();
                return;
            } else {
                state.wallClickStart = { x: snappedX, y: snappedY };
                state.dragAction = {
                    type: 'wall',
                    startX: snappedX,
                    startY: snappedY,
                    curX: snappedX,
                    curY: snappedY
                };
                request2DRedraw();
            }
        }
    }"""

if old_wall_down in text:
    text = text.replace(old_wall_down, new_wall_down, 1)
    print("Updated pointerdown wall & pillar logic!")
else:
    print("Warning: old_wall_down not found")

# 3. pointermove でのクリック中壁プレビューの更新
old_pmove_target = "if (drag.type === 'wall') {"
new_pmove_wall = """if (drag.type === 'wall') {
            // 直交スナップ（Shiftなしでも水平または垂直に整列）
            const dx = Math.abs(snappedX - drag.startX);
            const dy = Math.abs(snappedY - drag.startY);
            if (dx >= dy) {
                drag.curX = snappedX;
                drag.curY = drag.startY;
            } else {
                drag.curX = drag.startX;
                drag.curY = snappedY;
            }
            request2DRedraw();
        }"""

# 4. pointerup 内の壁ドラッグ確定処理
old_wall_up = """    } else if (drag.type === 'wall') {
        if (drag.startX !== drag.curX || drag.startY !== drag.curY) {
            fl.walls.push({
                id: uid(),
                x1: drag.startX,
                y1: drag.startY,
                x2: drag.curX,
                y2: drag.curY,
                wallType: state.subWallType
            });
            saveHistorySnapshot();
            if (typeof triggerAutoRoomDetection === 'function') triggerAutoRoomDetection();
            request2DRedraw();
        }
    }"""

new_wall_up = """    } else if (drag.type === 'wall') {
        if (drag.startX !== drag.curX || drag.startY !== drag.curY) {
            // ドラッグで壁を引いて離した場合
            fl.walls.push({
                id: uid(),
                x1: drag.startX,
                y1: drag.startY,
                x2: drag.curX,
                y2: drag.curY,
                wallType: state.subWallType || 'exterior'
            });
            state.wallClickStart = null;
            saveHistorySnapshot();
            if (typeof triggerAutoRoomDetection === 'function') triggerAutoRoomDetection();
            if (typeof rebuild3DScene === 'function') rebuild3DScene();
            showToast('壁を作成しました');
            request2DRedraw();
        } else {
            // クリックだけで離した場合は、2点目クリック待ち（state.wallClickStart を維持）
            // dragAction だけ解除してプレビュー継続
        }
    }"""

if old_wall_up in text:
    text = text.replace(old_wall_up, new_wall_up, 1)
    print("Updated pointerup wall drag & click-and-click handler!")
else:
    print("Warning: old_wall_up not found")

# 5. 2Dキャンバス上でのクリック待ちプレビュー描画（draw2DCanvas）
preview_draw_target = "// Draw temporary drag previews"
new_click_preview = """// 壁クリック＆クリック入力中のプレビュー描画
    if (state.activeTool === 'wall' && state.wallClickStart && !state.dragAction && state.lastHoverWorld) {
        const p1 = worldPToScreen(state.wallClickStart.x, state.wallClickStart.y);
        const p2 = worldPToScreen(state.lastHoverWorld.x, state.lastHoverWorld.y);
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 6;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.restore();
    }

    """ + preview_draw_target

if preview_draw_target in text and 'state.wallClickStart' not in text[text.find(preview_draw_target)-300:text.find(preview_draw_target)]:
    text = text.replace(preview_draw_target, new_click_preview, 1)
    print("Added click-and-click wall preview to draw2DCanvas!")

with open(SRC_HTML, 'w', encoding='utf-8') as f:
    f.write(text)

print("Saved src/madori-sketch/index.source.html with wall and pillar fixes!")
