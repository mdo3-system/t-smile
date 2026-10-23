# -*- coding: utf-8 -*-
"""
住ま居る 3D間取りスケッチ工房 (MadoriSketch)
システムキッチン・ユニットバス・洗面化粧台 完璧適用スクリプト (v2)
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
# 1. pointerdown 内の本物の fixture 配置ブロックを置換
# =========================================================================
p_target_start = "} else if (state.activeTool === 'fixture') {\n        if (state.subFixtureType === 'STANDALONE_COL') {"
p_target_end = "} else if (state.activeTool === 'pen') {"

start_idx = text.find(p_target_start)
end_idx = text.find(p_target_end, start_idx)

print(f"pointerdown fixture target found at: {start_idx} to {end_idx}")

new_pointerdown_fixture = """} else if (state.activeTool === 'fixture') {
        const cat = state.subFixtureCategory || 'KITCHEN';
        const pitch = state.modulePitch || 910;
        let wMm, dMm, hMm, wP, hP, label, fxData = {};

        if (cat === 'KITCHEN') {
            const kType = state.subKitchenType || 'I';
            hMm = state.subKitchenHeight || 850;
            if (kType === 'I') {
                wMm = state.subKitchenIWidth || 2550;
                dMm = state.subKitchenIDepth || 650;
                label = `I型キッチン (${wMm/10}×${dMm/10}cm)`;
            } else if (kType === 'L') {
                wMm = state.subKitchenLXWidth || 2550;
                dMm = state.subKitchenLYWidth || 1950;
                label = `L型キッチン (${wMm/10}×${dMm/10}cm)`;
                fxData.lWidthX = wMm;
                fxData.lWidthY = dMm;
                fxData.lDepth = 650;
            } else {
                wMm = state.subKitchenIslandW || 2550;
                dMm = state.subKitchenIslandD || 900;
                label = `アイランド/ペニンシュラ (${wMm}×${dMm}mm)`;
            }
            wP = +(wMm / pitch).toFixed(3);
            hP = +(dMm / pitch).toFixed(3);
            fxData.kitchenType = kType;
            fxData.kHeight = hMm;
        } else if (cat === 'UB') {
            const ubSpecs = window.UB_SPECS || { sizes: [] };
            const curSize = ubSpecs.sizes.find(s => s.id === state.subUbSize) || { wMm: 1600, dMm: 1600, label: '1616' };
            wMm = curSize.wMm;
            dMm = curSize.dMm;
            hMm = 2150;
            wP = +(wMm / pitch).toFixed(3);
            hP = +(dMm / pitch).toFixed(3);
            label = `ユニットバス ${curSize.label}`;
            fxData.ubSize = state.subUbSize || '1616';
            fxData.ubPattern = state.subUbPattern || 'patternA';
        } else if (cat === 'VANITY') {
            wMm = state.subVanityWidth || 900;
            dMm = state.subVanityDepth || 550;
            hMm = state.subVanityHeight || 800;
            wP = +(wMm / pitch).toFixed(3);
            hP = +(dMm / pitch).toFixed(3);
            label = `洗面化粧台 (W${wMm}mm)`;
            fxData.vanityWidth = wMm;
            fxData.vHeight = hMm;
        } else if (cat === 'STANDALONE_COL') {
            const newPillar = { id: uid(), x: snappedX, y: snappedY, sizeMm: 150 };
            fl.pillars.push(newPillar);
            state.selectedItem = { kind: 'pillar', id: newPillar.id, floor: state.currentFloor };
            saveHistorySnapshot();
            showToast('独立柱（ポーチ・バルコニー脚）を配置しました');
            return;
        } else {
            const ft = (window.FIXTURE_TYPES && window.FIXTURE_TYPES[cat]) || { wP: 1.0, hP: 1.0, label: '設備' };
            wP = ft.wP;
            hP = ft.hP;
            wMm = Math.round(wP * pitch);
            dMm = Math.round(hP * pitch);
            hMm = 800;
            label = ft.label;
        }

        const newFx = {
            id: uid(),
            category: cat,
            type: cat === 'KITCHEN' ? (state.subKitchenType === 'L' ? 'KITCHEN_L' : (state.subKitchenType === 'ISLAND' ? 'KITCHEN_ISLAND' : 'KITCHEN_I')) : cat,
            x: snappedX,
            y: snappedY,
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
        };

        fl.fixtures.push(newFx);
        state.selectedItem = { kind: 'fixture', id: newFx.id, floor: state.currentFloor };
        saveHistorySnapshot();
        if (typeof rebuild3DScene === 'function') rebuild3DScene();
        showToast(`${label} を配置しました（タップで寸法変更・ドラッグ移動可能）`);
    """

if start_idx != -1 and end_idx != -1:
    text = text[:start_idx] + new_pointerdown_fixture + text[end_idx:]
    print("Successfully replaced pointerdown fixture placement block!")
else:
    print("ERROR: could not find target start or end in pointerdown!")
    sys.exit(1)

with open(SRC_HTML, 'w', encoding='utf-8') as f:
    f.write(text)

print("Saved updated src/madori-sketch/index.source.html!")
