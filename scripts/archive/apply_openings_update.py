# -*- coding: utf-8 -*-
"""
住ま居る 3D間取りスケッチ工房 (MadoriSketch)
建具・窓の仕様刷新スクリプト
1. 窓: 幅12種 × 高さ11種の組み合わせ配置 ＆ 配置後サイズ変更
2. 内部建具: 1枚幅4種 × 高さ6種、枚数(1〜4枚)、納まり(引違い/引込み/引き分け/片引き/片開き/玄関片引き戸)
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

# 1. state の開口部関連プロパティの拡張
old_state_sub = "subOpeningType: 'SWING_DOOR',"
new_state_sub = """subOpeningType: 'WINDOW',
    subOpeningCategory: 'window', // 'window' or 'door'
    subWindowWidth: 1650,
    subWindowHeight: 1100,
    subDoorFit: 'hikichigai',     // 'hikichigai', 'hikikomi', 'hikiwake', 'katabiki', 'hiraki', 'genkan_slide'
    subDoorLeafCount: 2,
    subDoorLeafWidth: 800,
    subDoorHeight: 2000,"""

text = text.replace(old_state_sub, new_state_sub, 1)

# 2. renderSubToolbar 内の opening 処理の更新
old_subtoolbar_opening = """    } else if (state.activeTool === 'opening') {
        const label = document.createElement('span');
        label.className = 'text-[11px] font-bold text-slate-400 mr-1 shrink-0';
        label.innerHTML = '<i class="fa-solid fa-door-open mr-1 text-amber-400"></i>建具・窓:';
        container.appendChild(label);

        Object.keys(OPENING_TYPES).forEach(key => {
            const ot = OPENING_TYPES[key];
            const btn = document.createElement('button');
            const isAct = state.subOpeningType === key;
            btn.className = `sub-chip px-2.5 py-1 rounded-lg text-xs font-bold border transition shrink-0 flex items-center gap-1.5 ${isAct ? 'active' : 'bg-slate-800/90 text-slate-300 border-slate-700'}`;
            btn.innerHTML = `<span class="w-2 h-2 rounded-full" style="background:${ot.color}"></span><span>${ot.label}</span>`;
            btn.onclick = () => { state.subOpeningType = key; renderSubToolbar(); };
            container.appendChild(btn);
        });"""

new_subtoolbar_opening = """    } else if (state.activeTool === 'opening') {
        // --- 窓・建具の2大カテゴリ切り替え ---
        const catGroup = document.createElement('div');
        catGroup.className = 'flex items-center bg-slate-900/90 p-1 rounded-lg border border-slate-700 shrink-0 gap-1';
        
        const isWin = state.subOpeningCategory === 'window';
        catGroup.innerHTML = `
            <button onclick="state.subOpeningCategory='window';renderSubToolbar();" class="px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 ${isWin ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'}">
                <span>🪟</span> 窓
            </button>
            <button onclick="state.subOpeningCategory='door';renderSubToolbar();" class="px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 ${!isWin ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}">
                <span>🚪</span> 内部建具・玄関
            </button>
        `;
        container.appendChild(catGroup);

        const winSpecs = window.WINDOW_SPECS || { widths: [1650], heights: [1100] };
        const doorSpecs = window.DOOR_SPECS || { leafWidths: [800], heights: [2000], leafCounts: [2] };

        if (state.subOpeningCategory === 'window') {
            // --- 窓の寸法セレクタ（幅12種 × 高さ11種） ---
            const specGroup = document.createElement('div');
            specGroup.className = 'flex items-center gap-2 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 text-xs shrink-0';
            
            let wOptions = winSpecs.widths.map(w => `<option value="${w}" ${w === state.subWindowWidth ? 'selected' : ''}>W: ${w}mm</option>`).join('');
            let hOptions = winSpecs.heights.map(h => `<option value="${h}" ${h === state.subWindowHeight ? 'selected' : ''}>H: ${h}mm</option>`).join('');

            specGroup.innerHTML = `
                <span class="text-sky-300 font-bold">幅(W):</span>
                <select onchange="state.subWindowWidth=parseInt(this.value);renderSubToolbar();" class="bg-slate-900 text-sky-200 border border-slate-700 rounded px-2 py-1 font-bold mono-num focus:outline-none">
                    ${wOptions}
                </select>
                <span class="text-sky-300 font-bold">高さ(H):</span>
                <select onchange="state.subWindowHeight=parseInt(this.value);renderSubToolbar();" class="bg-slate-900 text-sky-200 border border-slate-700 rounded px-2 py-1 font-bold mono-num focus:outline-none">
                    ${hOptions}
                </select>
                <span class="text-[11px] text-slate-400 ml-1">クリックで壁面に吸着配置</span>
            `;
            container.appendChild(specGroup);
        } else {
            // --- 内部建具・玄関セレクタ（枚数・納まり・1枚幅・高さ） ---
            const specGroup = document.createElement('div');
            specGroup.className = 'flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 text-xs shrink-0';

            // 納まり方式
            const styleOptions = doorSpecs.styles.map(s => `<option value="${s.id}" ${s.id === state.subDoorFit ? 'selected' : ''}>${s.label}</option>`).join('');
            
            // 枚数 (1〜4枚)
            const countOptions = [1, 2, 3, 4].map(c => `<option value="${c}" ${c === state.subDoorLeafCount ? 'selected' : ''}>${c}枚</option>`).join('');

            // 1枚の幅 (600, 700, 800, 900)
            const leafWOptions = doorSpecs.leafWidths.map(w => `<option value="${w}" ${w === state.subDoorLeafWidth ? 'selected' : ''}>1枚幅: ${w}mm</option>`).join('');

            // 高さ (1000〜2400)
            const hOptions = doorSpecs.heights.map(h => `<option value="${h}" ${h === state.subDoorHeight ? 'selected' : ''}>H: ${h}mm</option>`).join('');

            specGroup.innerHTML = `
                <span class="text-emerald-300 font-bold">納まり:</span>
                <select onchange="setSubDoorFit(this.value)" class="bg-slate-900 text-emerald-200 border border-slate-700 rounded px-1.5 py-1 font-bold focus:outline-none">
                    ${styleOptions}
                </select>
                <span class="text-emerald-300 font-bold">枚数:</span>
                <select id="subDoorLeavesSelect" onchange="state.subDoorLeafCount=parseInt(this.value);renderSubToolbar();" class="bg-slate-900 text-emerald-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">
                    ${countOptions}
                </select>
                <select onchange="state.subDoorLeafWidth=parseInt(this.value);renderSubToolbar();" class="bg-slate-900 text-emerald-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">
                    ${leafWOptions}
                </select>
                <select onchange="state.subDoorHeight=parseInt(this.value);renderSubToolbar();" class="bg-slate-900 text-emerald-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">
                    ${hOptions}
                </select>
            `;
            container.appendChild(specGroup);
        }"""

text = text.replace(old_subtoolbar_opening, new_subtoolbar_opening, 1)

# 3. placeOpeningAt の更新
old_place_opening = """function placeOpeningAt(wx, wy) {
    const fl = state.floors[state.currentFloor];
    const target = snapPointToNearestWallEdge(wx, wy);
    const def = OPENING_TYPES[state.subOpeningType];

    // Check overlap before placing
    if (checkOpeningOverlap(state.currentFloor, target.x, target.y, target.orient, def.widthP, null)) {
        showToast('同じ壁面上の既存の建具・窓と重なるため配置できません（重複入力禁止）', true);
        return;
    }

    const newOp = {
        id: uid(),
        type: state.subOpeningType,
        x: target.x,
        y: target.y,
        orient: target.orient,
        flip: false,
        widthP: def.widthP,
        heightMm: def.heightMm,
        sillMm: def.sillMm
    };
    fl.openings.push(newOp);
    state.selectedItem = { kind: 'opening', id: newOp.id, floor: state.currentFloor };
    saveHistorySnapshot();
    showToast(`${def.label} を配置しました（ドラッグで位置・サイズ変更可能）`);
}"""

new_place_opening = """function setSubDoorFit(fitId) {
    state.subDoorFit = fitId;
    if (fitId === 'hiraki' || fitId === 'katabiki' || fitId === 'genkan_slide') {
        state.subDoorLeafCount = 1;
    } else if (fitId === 'hikichigai' && state.subDoorLeafCount === 1) {
        state.subDoorLeafCount = 2;
    } else if (fitId === 'hikiwake' && state.subDoorLeafCount % 2 !== 0) {
        state.subDoorLeafCount = 2;
    }
    renderSubToolbar();
}

function placeOpeningAt(wx, wy) {
    const fl = state.floors[state.currentFloor];
    const target = snapPointToNearestWallEdge(wx, wy);
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

text = text.replace(old_place_opening, new_place_opening, 1)

# 4. renderPropertyInspector 内の opening 処理の更新
old_inspector_opening_start = "    if (kind === 'opening') {"
old_inspector_opening_end = "    } else if (kind === 'fixture') {"

s_insp = text.find(old_inspector_opening_start)
e_insp = text.find(old_inspector_opening_end)

new_inspector_opening = """    if (kind === 'opening') {
        const isWin = obj.category === 'window' || obj.isWin || obj.type === 'WINDOW' || (obj.type && obj.type.startsWith('WIN'));
        const winSpecs = window.WINDOW_SPECS || { widths: [1650], heights: [1100] };
        const doorSpecs = window.DOOR_SPECS || { leafWidths: [800], heights: [2000], styles: [] };

        const curWMm = obj.widthMm || Math.round(obj.widthP * pitch);
        const curHMm = obj.heightMm || (isWin ? 1100 : 2000);
        const curSill = obj.sillMm !== undefined ? obj.sillMm : (isWin && curHMm < 2000 ? 900 : 0);

        let contentHtml = '';

        if (isWin) {
            // --- 窓プロパティ編集 ---
            let wOpts = winSpecs.widths.map(w => `<option value="${w}" ${w === curWMm ? 'selected' : ''}>W: ${w} mm</option>`).join('');
            let hOpts = winSpecs.heights.map(h => `<option value="${h}" ${h === curHMm ? 'selected' : ''}>H: ${h} mm</option>`).join('');

            contentHtml = `
                <div class="space-y-2.5 text-xs">
                    <div class="flex items-center justify-between gap-2">
                        <label class="text-sky-300 font-bold shrink-0">🪟 窓幅 (W):</label>
                        <select onchange="updateSelectedWindowSize(parseInt(this.value), null)" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold mono-num focus:outline-none">
                            ${wOpts}
                        </select>
                    </div>
                    <div class="flex items-center justify-between gap-2">
                        <label class="text-sky-300 font-bold shrink-0">🪟 窓高さ (H):</label>
                        <select onchange="updateSelectedWindowSize(null, parseInt(this.value))" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold mono-num focus:outline-none">
                            ${hOpts}
                        </select>
                    </div>
                    <div class="flex items-center justify-between gap-2">
                        <label class="text-slate-400 font-semibold shrink-0">取付腰高:</label>
                        <input type="number" step="50" min="0" max="2200" value="${curSill}" onchange="updateSelectedOpeningSill(parseInt(this.value))" class="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold mono-num">
                        <span class="text-slate-400">mm</span>
                    </div>
                    <div class="text-[10px] text-slate-400 pt-1">
                        ※ 現在のグリッド換算幅: <strong class="text-sky-300 mono-num">${(obj.widthP).toFixed(2)}P</strong>
                    </div>
                </div>
            `;
        } else {
            // --- 内部建具・玄関プロパティ編集 ---
            const curFit = obj.doorFit || 'hikichigai';
            const curLeaves = obj.leafCount || 2;
            const curLeafW = obj.leafWidthMm || 800;

            let fitOpts = doorSpecs.styles.map(s => `<option value="${s.id}" ${s.id === curFit ? 'selected' : ''}>${s.label}</option>`).join('');
            let leafCountBtns = [1, 2, 3, 4].map(c => `
                <button onclick="updateSelectedDoorLeafCount(${c})" class="py-1 rounded text-xs font-bold border transition ${c === curLeaves ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-800 text-slate-300 border-slate-700'}">
                    ${c}枚
                </button>
            `).join('');

            let leafWOpts = doorSpecs.leafWidths.map(w => `<option value="${w}" ${w === curLeafW ? 'selected' : ''}>1枚幅: ${w} mm</option>`).join('');
            let hOpts = doorSpecs.heights.map(h => `<option value="${h}" ${h === curHMm ? 'selected' : ''}>高さ: ${h} mm</option>`).join('');

            contentHtml = `
                <div class="space-y-2.5 text-xs">
                    <div class="flex items-center justify-between gap-2">
                        <label class="text-emerald-300 font-bold shrink-0">納まり:</label>
                        <select onchange="updateSelectedDoorFit(this.value)" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold focus:outline-none">
                            ${fitOpts}
                        </select>
                    </div>
                    <div>
                        <label class="text-emerald-300 font-bold block mb-1">建具枚数:</label>
                        <div class="grid grid-cols-4 gap-1">
                            ${leafCountBtns}
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="text-[11px] text-slate-400 block mb-0.5">1枚の幅</label>
                            <select onchange="updateSelectedDoorLeafWidth(parseInt(this.value))" class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold mono-num">
                                ${leafWOpts}
                            </select>
                        </div>
                        <div>
                            <label class="text-[11px] text-slate-400 block mb-0.5">建具高さ</label>
                            <select onchange="updateSelectedDoorHeight(parseInt(this.value))" class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold mono-num">
                                ${hOpts}
                            </select>
                        </div>
                    </div>
                    <div class="text-[10px] text-slate-400 pt-1">
                        ※ 総開口幅: <strong class="text-emerald-300 mono-num">${curWMm} mm</strong> (${(obj.widthP).toFixed(2)}P)
                    </div>
                </div>
            `;
        }

        panel.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-700 pb-2 mb-2.5">
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full ${isWin ? 'bg-sky-400' : 'bg-emerald-400'}"></span>
                    <span class="text-xs font-bold text-white">${isWin ? '🪟 窓の寸法変更' : '🚪 建具の枚数・寸法変更'}</span>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="deleteSelectedItem()" class="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-[11px] text-rose-200 font-bold"><i class="fa-solid fa-trash mr-1"></i>削除</button>
                    <button onclick="state.selectedItem=null;renderPropertyInspector();request2DRedraw();" class="text-slate-400 hover:text-white px-1.5"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            ${contentHtml}
            <div class="flex items-center justify-between pt-2">
                <button onclick="flipLastOrSelectedOpening()" class="w-full py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs">
                    <i class="fa-solid fa-repeat mr-1"></i>開閉向き反転 / 縦横切替
                </button>
            </div>
        `;
"""

text = text[:s_insp] + new_inspector_opening + text[e_insp:]

# 5. 更新ハンドラ関数の追加（インスペクター用）
inspector_handlers = """
// ============================================================================
// 窓・建具 インスペクタ寸法変更ハンドラ群
// ============================================================================
function updateSelectedWindowSize(newWMm, newHMm) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'opening') return;
    const op = fl.openings.find(o => o.id === state.selectedItem.id);
    if (!op) return;

    const pitch = state.modulePitch || 910;
    if (newWMm !== null) {
        const nextWidthP = +(newWMm / pitch).toFixed(3);
        if (!checkOpeningOverlap(state.currentFloor, op.x, op.y, op.orient, nextWidthP, op.id)) {
            op.widthMm = newWMm;
            op.widthP = nextWidthP;
        } else {
            showToast('幅を拡大すると隣接する建具・窓と重なるため変更できません', true);
            renderPropertyInspector();
            return;
        }
    }
    if (newHMm !== null) {
        op.heightMm = newHMm;
        if (op.heightMm >= 2000) {
            op.sillMm = 0;
        } else if (op.sillMm === 0) {
            op.sillMm = Math.max(0, 2100 - op.heightMm);
        }
    }
    op.label = `窓 (W${op.widthMm}×H${op.heightMm})`;
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    renderPropertyInspector();
    request2DRedraw();
    showToast(`窓寸法を W:${op.widthMm}mm × H:${op.heightMm}mm に変更しました`);
}

function updateSelectedOpeningSill(newSill) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'opening') return;
    const op = fl.openings.find(o => o.id === state.selectedItem.id);
    if (!op) return;
    op.sillMm = Math.max(0, newSill);
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    request2DRedraw();
}

function updateSelectedDoorFit(fitId) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'opening') return;
    const op = fl.openings.find(o => o.id === state.selectedItem.id);
    if (!op) return;

    op.doorFit = fitId;
    if (fitId === 'hiraki' || fitId === 'katabiki' || fitId === 'genkan_slide') {
        op.leafCount = 1;
    } else if (fitId === 'hikichigai' && op.leafCount === 1) {
        op.leafCount = 2;
    } else if (fitId === 'hikiwake' && op.leafCount % 2 !== 0) {
        op.leafCount = 2;
    }
    recalcDoorDimensions(op);
}

function updateSelectedDoorLeafCount(count) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'opening') return;
    const op = fl.openings.find(o => o.id === state.selectedItem.id);
    if (!op) return;

    op.leafCount = count;
    if (count === 1 && (op.doorFit === 'hikichigai' || op.doorFit === 'hikiwake')) {
        op.doorFit = 'katabiki';
    } else if (count >= 2 && op.doorFit === 'hiraki') {
        op.doorFit = 'hikichigai';
    }
    recalcDoorDimensions(op);
}

function updateSelectedDoorLeafWidth(leafW) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'opening') return;
    const op = fl.openings.find(o => o.id === state.selectedItem.id);
    if (!op) return;

    op.leafWidthMm = leafW;
    recalcDoorDimensions(op);
}

function updateSelectedDoorHeight(h) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'opening') return;
    const op = fl.openings.find(o => o.id === state.selectedItem.id);
    if (!op) return;

    op.heightMm = h;
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    renderPropertyInspector();
    request2DRedraw();
}

function recalcDoorDimensions(op) {
    const pitch = state.modulePitch || 910;
    const count = op.leafCount || 1;
    const leafW = op.leafWidthMm || 800;
    
    let totalW = leafW * count;
    if (op.doorFit === 'hiraki' || op.doorFit === 'katabiki' || op.doorFit === 'genkan_slide') {
        totalW = leafW;
    }

    const nextWidthP = +(totalW / pitch).toFixed(3);
    if (!checkOpeningOverlap(state.currentFloor, op.x, op.y, op.orient, nextWidthP, op.id)) {
        op.widthMm = totalW;
        op.widthP = nextWidthP;
    } else {
        showToast('建具を拡大すると隣接する壁面要素と重なるため変更できません', true);
        renderPropertyInspector();
        return;
    }

    const styleObj = (window.DOOR_SPECS && window.DOOR_SPECS.styles) ? window.DOOR_SPECS.styles.find(s => s.id === op.doorFit) : null;
    const fitLabel = styleObj ? styleObj.label : '建具';
    op.label = `${fitLabel} ${op.leafCount}枚 (W${op.widthMm}×H${op.heightMm}mm)`;

    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    renderPropertyInspector();
    request2DRedraw();
    showToast(`建具を「${op.label}」に変更しました`);
}
"""

text = text.replace("function deleteSelectedItem() {", inspector_handlers + "\nfunction deleteSelectedItem() {", 1)

# 6. drawOpening2D の更新（窓と建具の枚数・納まり別の美麗な建築図面表現）
old_draw_opening_start = "function drawOpening2D(op) {"
old_draw_opening_end = "function drawAutoDimensions2D(fl) {"

s_draw = text.find(old_draw_opening_start)
e_draw = text.find(old_draw_opening_end)

new_draw_opening = """function drawOpening2D(op) {
    const pitch = state.modulePitch || 910;
    const p = worldPToScreen(op.x, op.y);
    const wP = op.widthP || (op.widthMm ? op.widthMm / pitch : 1.0);
    const lenPx = wP * state.cam2d.zoom;

    const isWin = op.category === 'window' || op.isWin || op.type === 'WINDOW' || (op.type && op.type.startsWith('WIN'));

    ctx.save();
    ctx.translate(p.x, p.y);
    if (op.orient === 'v') {
        ctx.rotate(Math.PI / 2);
    }

    // 1. 壁面の開口部くり抜き（白背景クリア）
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-lenPx / 2, -6, lenPx, 12);

    const isSelected = state.selectedItem && state.selectedItem.kind === 'opening' && state.selectedItem.id === op.id;

    if (isWin) {
        // ==========================================
        // 🪟 窓の描画（サッシ枠＋ガラス二重線）
        // ==========================================
        ctx.strokeStyle = isSelected ? '#38bdf8' : '#0284c7';
        ctx.lineWidth = isSelected ? 2.8 : 2;

        // 外枠
        ctx.strokeRect(-lenPx / 2, -4, lenPx, 8);

        // ガラス線（2本）
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-lenPx / 2 + 3, -1);
        ctx.lineTo(lenPx / 2 - 3, -1);
        ctx.moveTo(-lenPx / 2 + 3, 1);
        ctx.lineTo(lenPx / 2 - 3, 1);
        ctx.stroke();

        // 寸法表示（小さな文字）
        if (lenPx > 36) {
            ctx.fillStyle = '#0369a1';
            ctx.font = 'bold 8px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`${op.widthMm || Math.round(wP * pitch)}`, 0, -5);
        }
    } else {
        // ==========================================
        // 🚪 内部建具・玄関の描画（枚数・納まり別）
        // ==========================================
        const fit = op.doorFit || (op.type === 'SWING_DOOR' ? 'hiraki' : (op.type === 'ENTRANCE_DOOR' ? 'genkan_slide' : 'hikichigai'));
        const leaves = op.leafCount || 2;
        const dir = op.flip ? -1 : 1;

        ctx.strokeStyle = isSelected ? '#34d399' : (fit === 'genkan_slide' ? '#f59e0b' : '#059669');
        ctx.lineWidth = isSelected ? 2.8 : 2.2;

        if (fit === 'hiraki') {
            // 片開き戸: 扉線＋開閉円弧
            ctx.beginPath();
            ctx.moveTo(-lenPx / 2, 0);
            ctx.lineTo(-lenPx / 2, lenPx * 0.85 * dir);
            ctx.stroke();

            ctx.lineWidth = 1.2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(-lenPx / 2, 0, lenPx * 0.85, 0, (Math.PI / 2) * dir, dir < 0);
            ctx.stroke();
            ctx.setLineDash([]);
        } else if (fit === 'katabiki' || fit === 'genkan_slide') {
            // 片引き戸 / 玄関片引き戸: スライド枠＋扉線＋矢印
            ctx.beginPath();
            ctx.moveTo(-lenPx / 2, -2);
            ctx.lineTo(lenPx / 2, -2);
            ctx.stroke();

            // スライド扉
            ctx.lineWidth = fit === 'genkan_slide' ? 3.5 : 2.5;
            ctx.beginPath();
            ctx.moveTo(-lenPx / 2, 2 * dir);
            ctx.lineTo(0, 2 * dir);
            ctx.stroke();

            // 引き方向矢印
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-lenPx * 0.2, 5 * dir);
            ctx.lineTo(lenPx * 0.2, 5 * dir);
            ctx.lineTo(lenPx * 0.15, 3 * dir);
            ctx.stroke();
        } else if (fit === 'hikikomi') {
            // 引込み戸: 壁内引き込みポケット（破線）＋扉線
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(lenPx / 2, 0);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(-lenPx / 2, 0);
            ctx.lineTo(lenPx * 0.1, 0);
            ctx.stroke();
        } else if (fit === 'hikiwake') {
            // 引き分け (2枚または4枚): 中央から左右両側へスライド
            const halfW = lenPx / 2;
            ctx.beginPath();
            // 左側扉
            ctx.moveTo(-halfW, -2);
            ctx.lineTo(0, -2);
            // 右側扉
            ctx.moveTo(0, 2);
            ctx.lineTo(halfW, 2);
            ctx.stroke();

            // 4枚引き分けの場合は追加ライン
            if (leaves === 4) {
                ctx.moveTo(-halfW, 2);
                ctx.lineTo(-halfW / 2, 2);
                ctx.moveTo(halfW / 2, -2);
                ctx.lineTo(halfW, -2);
                ctx.stroke();
            }
        } else {
            // 引違い (2枚, 3枚, 4枚)
            const segW = lenPx / leaves;
            for (let i = 0; i < leaves; i++) {
                const offset = (i % 2 === 0) ? -2.5 : 2.5;
                const sx = -lenPx / 2 + i * segW;
                const ex = sx + segW * 1.08; // わずかな重なり
                ctx.beginPath();
                ctx.moveTo(sx, offset);
                ctx.lineTo(Math.min(lenPx / 2, ex), offset);
                ctx.stroke();
            }
        }

        // 寸法表示
        if (lenPx > 36) {
            ctx.fillStyle = fit === 'genkan_slide' ? '#b45309' : '#047857';
            ctx.font = 'bold 8px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`${op.widthMm || Math.round(wP * pitch)} (${leaves}枚)`, 0, -5);
        }
    }

    ctx.restore();
}
"""

text = text[:s_draw] + new_draw_opening + text[e_draw:]

with open(SRC_HTML, 'w', encoding='utf-8') as f:
    f.write(text)

print(f"✅ Successfully updated opening systems in {SRC_HTML}")
