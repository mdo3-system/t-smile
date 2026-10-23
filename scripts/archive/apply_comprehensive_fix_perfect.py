# -*- coding: utf-8 -*-
"""
間取りスケッチ工房 完全修復スクリプト
1. room_detector.js の scriptタグ確実ロード & 統合フォールバック
2. 壁入力方式: PCは端点-端点クリックで1本生成して完了(連続線廃止)、iPadはドラッグで1本生成
3. 壁種別の自動判断(外壁/内壁の手動選択肢を廃止してシンプル化)
4. 建具・窓設置の修復(snapPointToNearestWallEdge の fl.walls 対応 & placeOpeningAt の未定義widthPバグ解消 & 再描画)
5. 階段設置の修復(pointerdown への stair 処理追加 & renderSubToolbar内の誤混入コード削除)
6. 面積集計(updateAllMetricsAnd3D)の多角形ポリゴン面積加算
"""

import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_HTML = os.path.join(BASE_DIR, 'src', 'madori-sketch', 'index.source.html')

with open(SRC_HTML, 'r', encoding='utf-8') as f:
    text = f.read()

# -------------------------------------------------------------------------
# 1. room_detector.js の script タグ追加
# -------------------------------------------------------------------------
tag_to_insert = '<script src="/madori-sketch/js/geometry/room_detector.js?v=20261021"></script>\n'
three_tag = '<script src="/madori-sketch/js/renderer/three_3d.js?v=20261021"></script>'

if 'room_detector.js' not in text and three_tag in text:
    text = text.replace(three_tag, tag_to_insert + '    ' + three_tag, 1)
    print("1. Added room_detector.js script tag!")
else:
    print("1. room_detector.js already present or three_tag not found")

# -------------------------------------------------------------------------
# 2. 壁サブツールバーから「外壁/内壁」選択肢を撤廃し、シンプルなガイダンスに変更
# -------------------------------------------------------------------------
old_wall_subtoolbar = """    } else if (state.activeTool === 'wall') {
        container.innerHTML = `
            <span class="text-[11px] font-bold text-slate-400 mr-1"><i class="fa-solid fa-grip-lines mr-1 text-blue-400"></i>壁種別:</span>
            <button onclick="state.subWallType='exterior';renderSubToolbar();" class="sub-chip px-2.5 py-1 rounded-lg text-xs font-bold border ${state.subWallType==='exterior'?'active':'bg-slate-800 text-slate-300 border-slate-700'}">外壁・耐力壁 (150mm)</button>
            <button onclick="state.subWallType='interior';renderSubToolbar();" class="sub-chip px-2.5 py-1 rounded-lg text-xs font-bold border ${state.subWallType==='interior'?'active':'bg-slate-800 text-slate-300 border-slate-700'}">間仕切壁 (100mm)</button>
            <button onclick="selectTool('pillar');" class="sub-chip px-2.5 py-1 rounded-lg text-xs font-bold border bg-slate-800 text-slate-300 border-slate-700 hover:text-amber-300"><i class="fa-solid fa-square mr-1 text-amber-300"></i>独立柱ツールへ</button>
            <span class="text-[11px] text-cyan-300 font-bold ml-1 hidden lg:inline"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i>壁を四角やL字に閉じて囲むと自動的に部屋が作成されます</span>
        `;"""

new_wall_subtoolbar = """    } else if (state.activeTool === 'wall') {
        container.innerHTML = `
            <span class="text-[11px] font-bold text-sky-400 mr-2 shrink-0"><i class="fa-solid fa-pen-nib mr-1"></i>壁を描く:</span>
            <span class="text-xs text-slate-200 mr-2 shrink-0">PC: <b class="text-sky-300">端点と端点をクリック</b> ／ iPad: <b class="text-sky-300">ペンでドラッグ</b></span>
            <span class="text-[11px] text-slate-400 ml-2 hidden sm:inline">（外壁・間仕切りは自動判定されます）</span>
            <span class="text-[11px] text-amber-300 font-bold ml-auto hidden md:inline"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i>壁で囲むと自動で部屋が生成され面積が集計されます</span>
        `;"""

if old_wall_subtoolbar in text:
    text = text.replace(old_wall_subtoolbar, new_wall_subtoolbar, 1)
    print("2. Replaced wall subtoolbar with simplified auto-classified guidance!")
else:
    print("2. Warning: old_wall_subtoolbar not found")

# -------------------------------------------------------------------------
# 3. renderSubToolbar 内の誤混入コード削除
# -------------------------------------------------------------------------
old_erroneous_stair = """        `;
    } else if (state.activeTool === 'stair') {
        handleStairPointerDown(snappedX, snappedY, worldPos.x, worldPos.y);
        return;
    } else if (state.activeTool === 'fixture') {"""

corrected_stair_in_toolbar = """        `;
    } else if (state.activeTool === 'fixture') {"""

if old_erroneous_stair in text:
    text = text.replace(old_erroneous_stair, corrected_stair_in_toolbar, 1)
    print("3. Removed misplaced handleStairPointerDown from renderSubToolbar!")
else:
    print("3. Warning: old_erroneous_stair not found")

# -------------------------------------------------------------------------
# 4. snapPointToNearestWallEdge の刷新 (fl.walls 優先検索)
# -------------------------------------------------------------------------
old_snap_wall_func = """function snapPointToNearestWallEdge(wx, wy) {
    const fl = state.floors[state.currentFloor];
    let bestEdge = null;
    let minDist = 0.85;

    fl.rooms.forEach(rm => {
        // Horizontal walls
        [rm.y, rm.y + rm.h].forEach(wallY => {
            if (wx >= rm.x - 0.2 && wx <= rm.x + rm.w + 0.2) {
                const d = Math.abs(wy - wallY);
                if (d < minDist) {
                    minDist = d;
                    bestEdge = { x: snapP(wx), y: wallY, orient: 'h' };
                }
            }
        });
        // Vertical walls
        [rm.x, rm.x + rm.w].forEach(wallX => {
            if (wy >= rm.y - 0.2 && wy <= rm.y + rm.h + 0.2) {
                const d = Math.abs(wx - wallX);
                if (d < minDist) {
                    minDist = d;
                    bestEdge = { x: wallX, y: snapP(wy), orient: 'v' };
                }
            }
        });
    });

    return bestEdge || { x: snapP(wx), y: snapP(wy), orient: 'h' };
}"""

new_snap_wall_func = """function snapPointToNearestWallEdge(wx, wy) {
    const fl = state.floors[state.currentFloor];
    let bestEdge = null;
    let minDist = 1.0; // 吸着許容範囲（約1マス以内）

    // 1. 壁セグメント（fl.walls）を最優先で探索
    if (fl.walls && fl.walls.length > 0) {
        fl.walls.forEach(wl => {
            const isHoriz = Math.abs(wl.y1 - wl.y2) < 0.05;
            if (isHoriz) {
                const minX = Math.min(wl.x1, wl.x2);
                const maxX = Math.max(wl.x1, wl.x2);
                if (wx >= minX - 0.35 && wx <= maxX + 0.35) {
                    const d = Math.abs(wy - wl.y1);
                    if (d < minDist) {
                        minDist = d;
                        const clampedX = Math.max(minX, Math.min(maxX, snapP(wx)));
                        bestEdge = { x: clampedX, y: wl.y1, orient: 'h', wall: wl };
                    }
                }
            } else {
                const minY = Math.min(wl.y1, wl.y2);
                const maxY = Math.max(wl.y1, wl.y2);
                if (wy >= minY - 0.35 && wy <= maxY + 0.35) {
                    const d = Math.abs(wx - wl.x1);
                    if (d < minDist) {
                        minDist = d;
                        const clampedY = Math.max(minY, Math.min(maxY, snapP(wy)));
                        bestEdge = { x: wl.x1, y: clampedY, orient: 'v', wall: wl };
                    }
                }
            }
        });
    }

    // 2. 部屋（fl.rooms）の外周もフォールバックで探索
    if (!bestEdge && fl.rooms && fl.rooms.length > 0) {
        fl.rooms.forEach(rm => {
            const rw = rm.w || 2;
            const rh = rm.h || 2;
            [rm.y, rm.y + rh].forEach(wallY => {
                if (wx >= rm.x - 0.2 && wx <= rm.x + rw + 0.2) {
                    const d = Math.abs(wy - wallY);
                    if (d < minDist) {
                        minDist = d;
                        bestEdge = { x: snapP(wx), y: wallY, orient: 'h' };
                    }
                }
            });
            [rm.x, rm.x + rw].forEach(wallX => {
                if (wy >= rm.y - 0.2 && wy <= rm.y + rh + 0.2) {
                    const d = Math.abs(wx - wallX);
                    if (d < minDist) {
                        minDist = d;
                        bestEdge = { x: wallX, y: snapP(wy), orient: 'v' };
                    }
                }
            });
        });
    }

    return bestEdge || { x: snapP(wx), y: snapP(wy), orient: 'h' };
}"""

if old_snap_wall_func in text:
    text = text.replace(old_snap_wall_func, new_snap_wall_func, 1)
    print("4. Updated snapPointToNearestWallEdge to search fl.walls first!")
else:
    print("4. Warning: old_snap_wall_func not found")

# -------------------------------------------------------------------------
# 5. placeOpeningAt の致命的バグ修正 (widthP 未定義エラー解消 & 再描画)
# -------------------------------------------------------------------------
old_place_opening = """function placeOpeningAt(wx, wy) {
    const fl = state.floors[state.currentFloor];
    const target = typeof snapOpeningCenterToGrid === 'function' ? snapOpeningCenterToGrid(wx, wy, widthP) : snapPointToNearestWallEdge(wx, wy);
    const pitch = state.modulePitch || 910;

    const isWin = state.subOpeningCategory === 'window';
    let widthMm, heightMm, sillMm, widthP, label, leafCount, leafWidthMm, doorFit;

    if (isWin) {
        widthMm = state.subWindowWidth || 1650;
        heightMm = state.subWindowHeight || 1100;
        sillMm = heightMm >= 2000 ? 0 : Math.max(0, 2100 - heightMm);
        widthP = +(widthMm / pitch).toFixed(3);
        label = `窓 (W${widthMm}×H${heightMm})`;
        doorFit = null;
        leafCount = 1;
        leafWidthMm = widthMm;
    } else {
        doorFit = state.subDoorFit || 'hikichigai';
        leafCount = state.subDoorLeafCount || 2;
        leafWidthMm = state.subDoorLeafWidth || 800;
        heightMm = state.subDoorHeight || 2000;
        sillMm = 0;
        
        // 総幅の計算
        let totalW = leafWidthMm * leafCount;
        if (doorFit === 'hiraki' || doorFit === 'katabiki' || doorFit === 'genkan_slide') {
            totalW = leafWidthMm;
            leafCount = 1;
        }
        widthMm = totalW;
        widthP = +(widthMm / pitch).toFixed(3);
        
        const styleObj = (window.DOOR_SPECS && window.DOOR_SPECS.styles) ? window.DOOR_SPECS.styles.find(s => s.id === doorFit) : null;
        const fitLabel = styleObj ? styleObj.label : '建具';
        label = `${fitLabel} ${leafCount}枚 (W${widthMm}×H${heightMm})`;
    }

    // Check overlap before placing
    if (checkOpeningOverlap(state.currentFloor, target.x, target.y, target.orient, widthP, null)) {
        showToast('同じ壁面上の既存の建具・窓と重なるため配置できません（重複禁止）', true);
        return;
    }

    const newOp = {
        id: uid(),
        category: isWin ? 'window' : 'door',
        type: isWin ? 'WINDOW' : (doorFit === 'genkan_slide' ? 'ENTRANCE_DOOR' : (doorFit === 'hiraki' ? 'SWING_DOOR' : 'SLIDING_DOOR')),
        doorFit: doorFit,
        leafCount: leafCount,
        leafWidthMm: leafWidthMm,
        x: target.x,
        y: target.y,
        orient: target.orient,
        flip: false,
        widthMm: widthMm,
        heightMm: heightMm,
        sillMm: sillMm,
        widthP: widthP,
        label: label,
        isWin: isWin
    };

    fl.openings.push(newOp);
    state.selectedItem = { kind: 'opening', id: newOp.id, floor: state.currentFloor };
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast(`${label} を配置しました（タップでサイズ変更・ドラッグ移動可能）`);
}"""

new_place_opening = """function placeOpeningAt(wx, wy) {
    const fl = state.floors[state.currentFloor];
    const pitch = state.modulePitch || 910;
    const isWin = state.subOpeningCategory === 'window';
    let widthMm, heightMm, sillMm, widthP, label, leafCount, leafWidthMm, doorFit;

    if (isWin) {
        widthMm = state.subWindowWidth || 1650;
        heightMm = state.subWindowHeight || 1100;
        sillMm = heightMm >= 2000 ? 0 : Math.max(0, 2100 - heightMm);
        widthP = +(widthMm / pitch).toFixed(3);
        label = `窓 (W${widthMm}×H${heightMm})`;
        doorFit = null;
        leafCount = 1;
        leafWidthMm = widthMm;
    } else {
        doorFit = state.subDoorFit || 'hikichigai';
        leafCount = state.subDoorLeafCount || 2;
        leafWidthMm = state.subDoorLeafWidth || 800;
        heightMm = state.subDoorHeight || 2000;
        sillMm = 0;
        
        let totalW = leafWidthMm * leafCount;
        if (doorFit === 'hiraki' || doorFit === 'katabiki' || doorFit === 'genkan_slide') {
            totalW = leafWidthMm;
            leafCount = 1;
        }
        widthMm = totalW;
        widthP = +(widthMm / pitch).toFixed(3);
        
        const styleObj = (window.DOOR_SPECS && window.DOOR_SPECS.styles) ? window.DOOR_SPECS.styles.find(s => s.id === doorFit) : null;
        const fitLabel = styleObj ? styleObj.label : '建具';
        label = `${fitLabel} ${leafCount}枚 (W${widthMm}×H${heightMm})`;
    }

    // widthP 確定後にスナップ位置を探索
    const target = snapPointToNearestWallEdge(wx, wy);

    // 重複チェック
    if (checkOpeningOverlap(state.currentFloor, target.x, target.y, target.orient, widthP, null)) {
        showToast('同じ壁面上の既存の建具・窓と重なるため配置できません', true);
        return;
    }

    const newOp = {
        id: uid(),
        category: isWin ? 'window' : 'door',
        type: isWin ? 'WINDOW' : (doorFit === 'genkan_slide' ? 'ENTRANCE_DOOR' : (doorFit === 'hiraki' ? 'SWING_DOOR' : 'SLIDING_DOOR')),
        doorFit: doorFit,
        leafCount: leafCount,
        leafWidthMm: leafWidthMm,
        x: target.x,
        y: target.y,
        orient: target.orient,
        flip: false,
        widthMm: widthMm,
        heightMm: heightMm,
        sillMm: sillMm,
        widthP: widthP,
        label: label,
        isWin: isWin
    };

    fl.openings.push(newOp);
    state.selectedItem = { kind: 'opening', id: newOp.id, floor: state.currentFloor };
    saveHistorySnapshot();
    renderPropertyInspector();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast(`${label} を配置しました（タップでサイズ変更・ドラッグ移動可能）`);
}"""

if old_place_opening in text:
    text = text.replace(old_place_opening, new_place_opening, 1)
    print("5. Fixed placeOpeningAt widthP reference error and added 2D/inspector redraw!")
else:
    print("5. Warning: old_place_opening not found")

# -------------------------------------------------------------------------
# 6. pointerdown 内の壁処理(端点-端点1本生成/連続線廃止) & 階段処理の追加
# -------------------------------------------------------------------------
old_wall_down = """    } else if (state.activeTool === 'wall') {
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
                showToast('壁の作図を完了しました');
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
            showToast('壁の始点を設定しました。終点をクリックまたはドラッグして壁を引いてください');
            request2DRedraw();
        }
    } else if (state.activeTool === 'opening') {"""

new_wall_and_stair_down = """    } else if (state.activeTool === 'wall') {
        // 壁の作成（PC: 端点-端点クリックで1本生成して完了 / iPad: ドラッグで1本生成）
        if (state.wallClickStart) {
            const x1 = state.wallClickStart.x;
            const y1 = state.wallClickStart.y;
            // 直交スナップ（水平または垂直）
            const dx = Math.abs(snappedX - x1);
            const dy = Math.abs(snappedY - y1);
            const x2 = dx >= dy ? snappedX : x1;
            const y2 = dx >= dy ? y1 : snappedY;

            if (x1 !== x2 || y1 !== y2) {
                fl.walls.push({
                    id: uid(),
                    x1: x1,
                    y1: y1,
                    x2: x2,
                    y2: y2,
                    wallType: 'auto'
                });
                saveHistorySnapshot();
                if (typeof triggerAutoRoomDetection === 'function') triggerAutoRoomDetection();
                showToast('壁を作成しました');
            }
            // 連続線にはせず、ここでリセット完了！次の壁はまた新しい始点から！
            state.wallClickStart = null;
            state.dragAction = null;
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
            showToast('壁の始点を設定しました。終点をクリックまたはドラッグして壁を引いてください');
            request2DRedraw();
        }
    } else if (state.activeTool === 'stair') {
        // 階段の配置処理（定型ポン置き または 自由パス入力）
        const stairMode = state.stairDrawMode || 'preset';
        if (stairMode === 'preset') {
            const presetType = state.stairPresetType || 'STRAIGHT';
            const turnSpec = state.stairTurnSpec || 'turn_3';
            placeStairPresetAt(presetType, snappedX, snappedY, turnSpec);
            return;
        } else {
            handleStairPointerDown(snappedX, snappedY, worldPos.x, worldPos.y);
            return;
        }
    } else if (state.activeTool === 'opening') {"""

if old_wall_down in text:
    text = text.replace(old_wall_down, new_wall_and_stair_down, 1)
    print("6. Updated pointerdown wall logic (discrete 2-point, no continuous extension) and added stair handler!")
else:
    print("6. Warning: old_wall_down not found")

# -------------------------------------------------------------------------
# 7. updateAllMetricsAnd3D での多角形ポリゴン面積 (rm.areaM2) 加算対応
# -------------------------------------------------------------------------
old_calc_area = """    const calcFloorAreaM2 = (flNum) => {
        let sum = 0;
        state.floors[flNum].rooms.forEach(rm => {
            if (rm.type !== 'VOID' && rm.type !== 'BALCONY' && rm.type !== 'PORCH') {
                sum += (rm.w * pitchM) * (rm.h * pitchM);
            }
        });
        return sum;
    };"""

new_calc_area = """    const calcFloorAreaM2 = (flNum) => {
        let sum = 0;
        state.floors[flNum].rooms.forEach(rm => {
            if (rm.type !== 'VOID' && rm.type !== 'BALCONY' && rm.type !== 'PORCH') {
                if (typeof rm.areaM2 === 'number' && rm.areaM2 > 0) {
                    sum += rm.areaM2;
                } else if (rm.w && rm.h) {
                    sum += (rm.w * pitchM) * (rm.h * pitchM);
                }
            }
        });
        return sum;
    };"""

if old_calc_area in text:
    text = text.replace(old_calc_area, new_calc_area, 1)
    print("7. Updated calcFloorAreaM2 to support rm.areaM2!")
else:
    print("7. Warning: old_calc_area not found")

# -------------------------------------------------------------------------
# 8. placeStairPresetAt 関数の強化（任意位置への階段ポン置き）
# -------------------------------------------------------------------------
if 'function placeStairPresetAt' in text:
    old_place_stair = """function placeStairPresetAt(type, x, y) {
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
}"""

    new_place_stair = """function placeStairPresetAt(type, x, y, turnSpec) {
    let pts = [];
    const tSpec = turnSpec || state.stairTurnSpec || 'turn_3';

    if (type === 'STRAIGHT') {
        pts = [{ x: x, y: y }, { x: x, y: y + 2.0 }];
    } else if (type === 'L_SHAPE') {
        pts = [{ x: x, y: y }, { x: x, y: y + 1.5 }, { x: x + 1.5, y: y + 1.5 }];
    } else {
        // U_SHAPE (折り返し コの字型 / 1坪)
        pts = [{ x: x, y: y }, { x: x, y: y + 1.5 }, { x: x + 1.0, y: y + 1.5 }, { x: x + 1.0, y: y }];
    }

    createStairFromPoints(pts, state.modulePitch || 910, 'UP', tSpec);
    state.stairPresetToPlace = null;
    saveHistorySnapshot();
    renderPropertyInspector();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast(`階段 (${type==='STRAIGHT'?'直階段':(type==='L_SHAPE'?'かね折れL型':'折り返しU型')}) を配置しました`);
}"""

    if old_place_stair in text:
        text = text.replace(old_place_stair, new_place_stair, 1)
        print("8. Enhanced placeStairPresetAt with toast, turnSpec and inspector updates!")

with open(SRC_HTML, 'w', encoding='utf-8') as f:
    f.write(text)

print("Saved updated src/madori-sketch/index.source.html successfully!")
