# -*- coding: utf-8 -*-
"""
階段の回転パス生成 & 設備配置時の事前回転反映パッチ
"""

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_HTML = os.path.join(BASE_DIR, 'src', 'madori-sketch', 'index.source.html')

with open(SRC_HTML, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. placeStairPresetAt を回転対応に刷新
old_stair_func = """function placeStairPresetAt(presetType, x, y) {
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
}"""

new_stair_func = """function placeStairPresetAt(presetType, x, y) {
    const type = state.stairPresetToPlace || presetType || 'U_SHAPE';
    const rot = state.subStairRot || 0;
    const dir = state.subStairDirection || 'UP';
    const turnSpec = state.stairTurnSpec || 'turn_3';
    let pts = [];

    // 回転前の基本パス (dx, dy)
    let localPts = [];
    if (type === 'STRAIGHT') {
        localPts = [{ x: 0, y: 0 }, { x: 0, y: 2.0 }];
    } else if (type === 'L_SHAPE') {
        localPts = [{ x: 0, y: 0 }, { x: 0, y: 1.5 }, { x: 1.5, y: 1.5 }];
    } else {
        // U_SHAPE (折り返し / 1坪)
        localPts = [{ x: 0, y: 0 }, { x: 0, y: 1.5 }, { x: 1.0, y: 1.5 }, { x: 1.0, y: 0 }];
    }

    // 90度単位の回転変換
    const rad = (rot * Math.PI) / 180;
    const cosR = Math.round(Math.cos(rad));
    const sinR = Math.round(Math.sin(rad));

    pts = localPts.map(p => ({
        x: x + (p.x * cosR - p.y * sinR),
        y: y + (p.x * sinR + p.y * cosR)
    }));

    createStairFromPoints(pts, state.modulePitch || 910, dir, turnSpec);
    state.stairPresetToPlace = null;
    saveHistorySnapshot();
    renderPropertyInspector();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast(`階段 (${type === 'STRAIGHT' ? '直階段' : (type === 'L_SHAPE' ? 'かね折れ' : '折り返し')}) を配置しました`);
}"""

if old_stair_func in text:
    text = text.replace(old_stair_func, new_stair_func, 1)
    print("1. Updated placeStairPresetAt with rotation and direction support!")
else:
    print("1. old_stair_func not found")

# 2. pointerdown 内の設備配置で事前回転と吸着基準点を適用
old_fixture_down = """        // 壁自動吸着＆離れ寸法計算 (Phase 2)
        let placeX = snappedX;
        let placeY = snappedY;
        if (typeof findNearestWallForFixture === 'function') {
            const wallSnap = findNearestWallForFixture(snappedX, snappedY, wP, hP);
            if (wallSnap) {
                if (wallSnap.x !== undefined) placeX = wallSnap.x;
                if (wallSnap.y !== undefined) placeY = wallSnap.y;
            }
        }

        const newFx = {
            id: uid(),
            category: cat,
            x: placeX,
            y: placeY,
            w: wP,
            h: hP,
            wMm: wMm,
            dMm: dMm,
            hMm: hMm,
            rot: 0,
            label: label,
            kHeight: fxData.kHeight || 850,
            vHeight: fxData.vHeight || 800,
            ubPattern: fxData.ubPattern || 'patternA',
            fxData: fxData
        };"""

new_fixture_down = """        // 事前回転の適用
        const rot = state.subFixtureRot || 0;
        let finalWP = wP;
        let finalHP = hP;
        if (rot === 90 || rot === 270) {
            finalWP = hP;
            finalHP = wP;
        }

        // 壁自動吸着＆離れ寸法計算
        let placeX = snappedX;
        let placeY = snappedY;
        const align = state.subFixtureAlign || 'center';
        if (typeof findNearestWallForFixture === 'function') {
            const wallSnap = findNearestWallForFixture(snappedX, snappedY, finalWP, finalHP);
            if (wallSnap) {
                if (wallSnap.side === 'top' || wallSnap.side === 'bottom') {
                    placeY = wallSnap.y;
                    if (align === 'left') placeX = wallSnap.wall.x1;
                    else if (align === 'right') placeX = wallSnap.wall.x2 - finalWP;
                } else {
                    placeX = wallSnap.x;
                    if (align === 'left') placeY = wallSnap.wall.y1;
                    else if (align === 'right') placeY = wallSnap.wall.y2 - finalHP;
                }
            }
        }

        const newFx = {
            id: uid(),
            category: cat,
            x: placeX,
            y: placeY,
            w: finalWP,
            h: finalHP,
            wMm: (rot === 90 || rot === 270) ? dMm : wMm,
            dMm: (rot === 90 || rot === 270) ? wMm : dMm,
            hMm: hMm,
            rot: rot,
            align: align,
            clearanceMm: state.subFixtureClearanceMm || 0,
            label: label,
            kHeight: fxData.kHeight || 850,
            vHeight: fxData.vHeight || 800,
            ubPattern: fxData.ubPattern || 'patternA',
            fxData: fxData
        };"""

if old_fixture_down in text:
    text = text.replace(old_fixture_down, new_fixture_down, 1)
    print("2. Updated fixture placement with pre-rotation and wall snap alignment!")
else:
    print("2. old_fixture_down not found")

with open(SRC_HTML, 'w', encoding='utf-8') as f:
    f.write(text)

print("Saved src/madori-sketch/index.source.html successfully!")
