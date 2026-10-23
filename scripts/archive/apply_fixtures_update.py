# -*- coding: utf-8 -*-
"""
住ま居る 3D間取りスケッチ工房 (MadoriSketch)
設備仕様刷新スクリプト（システムキッチン・UB・洗面化粧台）
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

# 1. state の設備関連プロパティの拡張
old_state_fx = "subFixtureType: 'KITCHEN_I',"
new_state_fx = """subFixtureType: 'KITCHEN',
    subFixtureCategory: 'KITCHEN', // 'KITCHEN', 'UB', 'VANITY', 'TOILET_FIX', 'STAIR_STRAIGHT', 'STAIR_UTURN', 'CLOSET_UNIT', 'STANDALONE_COL'
    // キッチン詳細
    subKitchenType: 'I',           // 'I', 'L', 'ISLAND'
    subKitchenIWidth: 2550,
    subKitchenIDepth: 650,
    subKitchenLXWidth: 2550,
    subKitchenLYWidth: 1950,
    subKitchenIslandW: 2550,
    subKitchenIslandD: 900,
    subKitchenHeight: 850,
    // ユニットバス詳細
    subUbSize: '1616',
    subUbPattern: 'patternA',      // 'patternA' (短手出入), 'patternB' (長手出入)
    // 洗面化粧台詳細
    subVanityWidth: 900,
    subVanityDepth: 550,
    subVanityHeight: 800,"""

text = text.replace(old_state_fx, new_state_fx, 1)

# 2. renderSubToolbar の fixture 分岐の刷新
old_subtoolbar_fx_start = "} else if (state.activeTool === 'fixture') {"
old_subtoolbar_fx_end = "} else if (state.activeTool === 'select') {"

s_fx = text.find(old_subtoolbar_fx_start)
e_fx = text.find(old_subtoolbar_fx_end)

new_subtoolbar_fx = """} else if (state.activeTool === 'fixture') {
        const kSpecs = window.KITCHEN_SPECS || { iWidths: [2550], iDepths: [650], heights: [850], lWidths: [2550], islandDepths: [900] };
        const ubSpecs = window.UB_SPECS || { sizes: [], patterns: [] };
        const vSpecs = window.VANITY_SPECS || { widths: [900], heights: [800] };

        // 1. 設備カテゴリ切り替えチップ群
        const catGroup = document.createElement('div');
        catGroup.className = 'flex items-center bg-slate-900/90 p-1 rounded-lg border border-slate-700 shrink-0 gap-1';
        
        const catList = [
            { id: 'KITCHEN', icon: '🍳', label: 'キッチン' },
            { id: 'UB', icon: '🛁', label: 'ユニットバス' },
            { id: 'VANITY', icon: '🪞', label: '洗面化粧台' },
            { id: 'TOILET_FIX', icon: '🚽', label: 'トイレ便器' },
            { id: 'STAIR_STRAIGHT', icon: '🪜', label: '直階段' },
            { id: 'STAIR_UTURN', icon: '🪜', label: '折返し階段' },
            { id: 'CLOSET_UNIT', icon: '🪑', label: '収納・家具' },
            { id: 'STANDALONE_COL', icon: '🏛️', label: '独立柱' }
        ];

        catList.forEach(c => {
            const isAct = state.subFixtureCategory === c.id;
            const btn = document.createElement('button');
            btn.className = `px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 shrink-0 ${isAct ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}`;
            btn.innerHTML = `<span>${c.icon}</span><span>${c.label}</span>`;
            btn.onclick = () => {
                state.subFixtureCategory = c.id;
                state.subFixtureType = c.id;
                renderSubToolbar();
            };
            catGroup.appendChild(btn);
        });
        container.appendChild(catGroup);

        // 2. 選択中カテゴリの詳細寸法セレクタ
        const specGroup = document.createElement('div');
        specGroup.className = 'flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 text-xs shrink-0';

        if (state.subFixtureCategory === 'KITCHEN') {
            // キッチン: I型 / L型 / ペニンシュラ・アイランド
            const typeOpts = `
                <option value="I" ${state.subKitchenType === 'I' ? 'selected' : ''}>I型キッチン</option>
                <option value="L" ${state.subKitchenType === 'L' ? 'selected' : ''}>L型キッチン</option>
                <option value="ISLAND" ${state.subKitchenType === 'ISLAND' ? 'selected' : ''}>アイランド/ペニンシュラ</option>
            `;
            let dimsHtml = '';
            if (state.subKitchenType === 'I') {
                const wOpts = kSpecs.iWidths.map(w => `<option value="${w}" ${w === state.subKitchenIWidth ? 'selected' : ''}>幅: ${w/10}cm</option>`).join('');
                const dOpts = kSpecs.iDepths.map(d => `<option value="${d}" ${d === state.subKitchenIDepth ? 'selected' : ''}>奥行: ${d/10}cm</option>`).join('');
                const hOpts = kSpecs.heights.map(h => `<option value="${h}" ${h === state.subKitchenHeight ? 'selected' : ''}>高: ${h/10}cm</option>`).join('');
                dimsHtml = `
                    <select onchange="state.subKitchenIWidth=parseInt(this.value);" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">${wOpts}</select>
                    <select onchange="state.subKitchenIDepth=parseInt(this.value);" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">${dOpts}</select>
                    <select onchange="state.subKitchenHeight=parseInt(this.value);" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">${hOpts}</select>
                `;
            } else if (state.subKitchenType === 'L') {
                const xOpts = kSpecs.lWidths.map(w => `<option value="${w}" ${w === state.subKitchenLXWidth ? 'selected' : ''}>X幅: ${w/10}cm</option>`).join('');
                const yOpts = kSpecs.lWidths.map(w => `<option value="${w}" ${w === state.subKitchenLYWidth ? 'selected' : ''}>Y幅: ${w/10}cm</option>`).join('');
                const hOpts = kSpecs.heights.map(h => `<option value="${h}" ${h === state.subKitchenHeight ? 'selected' : ''}>高: ${h/10}cm</option>`).join('');
                dimsHtml = `
                    <select onchange="state.subKitchenLXWidth=parseInt(this.value);" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">${xOpts}</select>
                    <select onchange="state.subKitchenLYWidth=parseInt(this.value);" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">${yOpts}</select>
                    <select onchange="state.subKitchenHeight=parseInt(this.value);" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">${hOpts}</select>
                `;
            } else {
                // アイランド / ペニンシュラ（自由寸法）
                const dOpts = kSpecs.islandDepths.map(d => `<option value="${d}" ${d === state.subKitchenIslandD ? 'selected' : ''}>奥行: ${d}mm</option>`).join('');
                const hOpts = kSpecs.heights.map(h => `<option value="${h}" ${h === state.subKitchenHeight ? 'selected' : ''}>高: ${h/10}cm</option>`).join('');
                dimsHtml = `
                    <span class="text-slate-400">幅:</span>
                    <input type="number" step="50" min="1200" max="3600" value="${state.subKitchenIslandW}" onchange="state.subKitchenIslandW=parseInt(this.value);" class="w-16 bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num">
                    <span class="text-slate-400">mm</span>
                    <select onchange="state.subKitchenIslandD=parseInt(this.value);" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">${dOpts}</select>
                    <select onchange="state.subKitchenHeight=parseInt(this.value);" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">${hOpts}</select>
                `;
            }
            specGroup.innerHTML = `
                <select onchange="state.subKitchenType=this.value;renderSubToolbar();" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold focus:outline-none">${typeOpts}</select>
                ${dimsHtml}
            `;
            container.appendChild(specGroup);
        } else if (state.subFixtureCategory === 'UB') {
            // ユニットバス: サイズ6種 × 出入口2パターン
            const sizeOpts = ubSpecs.sizes.map(s => `<option value="${s.id}" ${s.id === state.subUbSize ? 'selected' : ''}>${s.label}</option>`).join('');
            const patOpts = ubSpecs.patterns.map(p => `<option value="${p.id}" ${p.id === state.subUbPattern ? 'selected' : ''}>${p.label}</option>`).join('');
            specGroup.innerHTML = `
                <span class="text-cyan-300 font-bold">サイズ:</span>
                <select onchange="state.subUbSize=this.value;" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold focus:outline-none">${sizeOpts}</select>
                <span class="text-cyan-300 font-bold">出入口:</span>
                <select onchange="state.subUbPattern=this.value;" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold focus:outline-none">${patOpts}</select>
            `;
            container.appendChild(specGroup);
        } else if (state.subFixtureCategory === 'VANITY') {
            // 洗面化粧台: 幅6種 (600/750/900/1000/1200/1600)
            const wOpts = vSpecs.widths.map(w => `<option value="${w}" ${w === state.subVanityWidth ? 'selected' : ''}>幅: ${w}mm</option>`).join('');
            const hOpts = vSpecs.heights.map(h => `<option value="${h}" ${h === state.subVanityHeight ? 'selected' : ''}>高: ${h}mm</option>`).join('');
            specGroup.innerHTML = `
                <span class="text-cyan-300 font-bold">規格幅:</span>
                <select onchange="state.subVanityWidth=parseInt(this.value);" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">${wOpts}</select>
                <select onchange="state.subVanityHeight=parseInt(this.value);" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">${hOpts}</select>
                <span class="text-slate-400">奥行550mm</span>
            `;
            container.appendChild(specGroup);
        } else {
            specGroup.innerHTML = `<span class="text-slate-400">クリックして配置（角ドラッグでサイズ調整可能）</span>`;
            container.appendChild(specGroup);
        }
    """

text = text[:s_fx] + new_subtoolbar_fx + text[e_fx:]

# 3. pointerdown 内の fixture 配置ロジックの刷新
old_place_fx_start = "} else if (state.activeTool === 'fixture') {"
old_place_fx_end = "} else if (state.activeTool === 'pen') {"

s_p_fx = text.find(old_place_fx_start)
e_p_fx = text.find(old_place_fx_end)

new_place_fx = """} else if (state.activeTool === 'fixture') {
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
        } else if (cat === 'STANDALONE_COL') {
            const newPillar = { id: uid(), x: snappedX, y: snappedY, sizeMm: 150 };
            fl.pillars.push(newPillar);
            state.selectedItem = { kind: 'pillar', id: newPillar.id, floor: state.currentFloor };
            saveHistorySnapshot();
            showToast('独立柱（ポーチ・バルコニー脚）を配置しました');
            return;
        } else {
            const ft = FIXTURE_TYPES[cat] || { wP: 1.0, hP: 1.0, label: '設備' };
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
            type: cat,
            x: snappedX,
            y: snappedY,
            w: wP,
            h: hP,
            wMm: wMm,
            dMm: dMm,
            hMm: hMm,
            rot: 0,
            label: label,
            fxData: fxData
        };

        fl.fixtures.push(newFx);
        state.selectedItem = { kind: 'fixture', id: newFx.id, floor: state.currentFloor };
        saveHistorySnapshot();
        if (typeof rebuild3DScene === 'function') rebuild3DScene();
        showToast(`${label} を配置しました（タップで寸法変更・ドラッグ移動可能）`);
    """

text = text[:s_p_fx] + new_place_fx + text[e_p_fx:]

# 4. renderPropertyInspector 内の fixture 分岐の刷新
old_insp_fx_start = "    } else if (kind === 'fixture') {"
old_insp_fx_end = "    } else if (kind === 'room') {"

s_i_fx = text.find(old_insp_fx_start)
e_i_fx = text.find(old_insp_fx_end)

new_insp_fx = """    } else if (kind === 'fixture') {
        const cat = obj.category || obj.type;
        const curWMm = obj.wMm || Math.round(obj.w * pitch);
        const curDMm = obj.dMm || Math.round(obj.h * pitch);
        const curHMm = obj.hMm || 850;

        const kSpecs = window.KITCHEN_SPECS || { iWidths: [], iDepths: [], heights: [], lWidths: [] };
        const ubSpecs = window.UB_SPECS || { sizes: [], patterns: [] };
        const vSpecs = window.VANITY_SPECS || { widths: [], heights: [] };

        let contentHtml = '';

        if (cat === 'KITCHEN' || cat.startsWith('KITCHEN')) {
            const kType = (obj.fxData && obj.fxData.kitchenType) || 'I';
            let dimsControls = '';
            if (kType === 'I') {
                let wOpts = kSpecs.iWidths.map(w => `<option value="${w}" ${w === curWMm ? 'selected' : ''}>幅: ${w/10} cm</option>`).join('');
                let dOpts = kSpecs.iDepths.map(d => `<option value="${d}" ${d === curDMm ? 'selected' : ''}>奥行: ${d/10} cm</option>`).join('');
                let hOpts = kSpecs.heights.map(h => `<option value="${h}" ${h === curHMm ? 'selected' : ''}>高さ: ${h/10} cm</option>`).join('');
                dimsControls = `
                    <div class="space-y-2">
                        <div class="flex items-center justify-between"><label class="text-slate-400">幅:</label><select onchange="updateSelectedKitchenI(parseInt(this.value), null, null)" class="w-36 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold mono-num">${wOpts}</select></div>
                        <div class="flex items-center justify-between"><label class="text-slate-400">奥行:</label><select onchange="updateSelectedKitchenI(null, parseInt(this.value), null)" class="w-36 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold mono-num">${dOpts}</select></div>
                        <div class="flex items-center justify-between"><label class="text-slate-400">高さ:</label><select onchange="updateSelectedKitchenI(null, null, parseInt(this.value))" class="w-36 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold mono-num">${hOpts}</select></div>
                    </div>
                `;
            } else if (kType === 'L') {
                const curLX = (obj.fxData && obj.fxData.lWidthX) || curWMm;
                const curLY = (obj.fxData && obj.fxData.lWidthY) || curDMm;
                let xOpts = kSpecs.lWidths.map(w => `<option value="${w}" ${w === curLX ? 'selected' : ''}>X幅: ${w/10} cm</option>`).join('');
                let yOpts = kSpecs.lWidths.map(w => `<option value="${w}" ${w === curLY ? 'selected' : ''}>Y幅: ${w/10} cm</option>`).join('');
                let hOpts = kSpecs.heights.map(h => `<option value="${h}" ${h === curHMm ? 'selected' : ''}>高さ: ${h/10} cm</option>`).join('');
                dimsControls = `
                    <div class="space-y-2">
                        <div class="flex items-center justify-between"><label class="text-slate-400">X方向幅:</label><select onchange="updateSelectedKitchenL(parseInt(this.value), null, null)" class="w-36 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold mono-num">${xOpts}</select></div>
                        <div class="flex items-center justify-between"><label class="text-slate-400">Y方向幅:</label><select onchange="updateSelectedKitchenL(null, parseInt(this.value), null)" class="w-36 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold mono-num">${yOpts}</select></div>
                        <div class="flex items-center justify-between"><label class="text-slate-400">高さ:</label><select onchange="updateSelectedKitchenL(null, null, parseInt(this.value))" class="w-36 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold mono-num">${hOpts}</select></div>
                    </div>
                `;
            } else {
                let dOpts = kSpecs.islandDepths.map(d => `<option value="${d}" ${d === curDMm ? 'selected' : ''}>奥行: ${d} mm</option>`).join('');
                let hOpts = kSpecs.heights.map(h => `<option value="${h}" ${h === curHMm ? 'selected' : ''}>高さ: ${h/10} cm</option>`).join('');
                dimsControls = `
                    <div class="space-y-2">
                        <div class="flex items-center justify-between"><label class="text-slate-400">幅 (mm):</label><input type="number" step="50" min="1000" max="4000" value="${curWMm}" onchange="updateSelectedKitchenIsland(parseInt(this.value), null, null)" class="w-36 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold mono-num"></div>
                        <div class="flex items-center justify-between"><label class="text-slate-400">奥行:</label><select onchange="updateSelectedKitchenIsland(null, parseInt(this.value), null)" class="w-36 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold mono-num">${dOpts}</select></div>
                        <div class="flex items-center justify-between"><label class="text-slate-400">高さ:</label><select onchange="updateSelectedKitchenIsland(null, null, parseInt(this.value))" class="w-36 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold mono-num">${hOpts}</select></div>
                    </div>
                `;
            }

            contentHtml = `
                <div class="space-y-2.5 text-xs">
                    <div class="flex items-center justify-between gap-2">
                        <label class="text-cyan-300 font-bold shrink-0">タイプ切替:</label>
                        <select onchange="changeSelectedKitchenType(this.value)" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold focus:outline-none">
                            <option value="I" ${kType==='I'?'selected':''}>I型キッチン</option>
                            <option value="L" ${kType==='L'?'selected':''}>L型キッチン</option>
                            <option value="ISLAND" ${kType==='ISLAND'?'selected':''}>アイランド/ペニンシュラ</option>
                        </select>
                    </div>
                    ${dimsControls}
                </div>
            `;
        } else if (cat === 'UB') {
            const curSize = (obj.fxData && obj.fxData.ubSize) || '1616';
            const curPat = (obj.fxData && obj.fxData.ubPattern) || 'patternA';
            let sizeOpts = ubSpecs.sizes.map(s => `<option value="${s.id}" ${s.id === curSize ? 'selected' : ''}>${s.label}</option>`).join('');
            let patOpts = ubSpecs.patterns.map(p => `<option value="${p.id}" ${p.id === curPat ? 'selected' : ''}>${p.label}</option>`).join('');

            contentHtml = `
                <div class="space-y-2.5 text-xs">
                    <div class="flex items-center justify-between gap-2">
                        <label class="text-cyan-300 font-bold shrink-0">サイズ規格:</label>
                        <select onchange="updateSelectedUbSize(this.value)" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold focus:outline-none">${sizeOpts}</select>
                    </div>
                    <div class="flex items-center justify-between gap-2">
                        <label class="text-cyan-300 font-bold shrink-0">出入口配置:</label>
                        <select onchange="updateSelectedUbPattern(this.value)" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold focus:outline-none">${patOpts}</select>
                    </div>
                    <div class="text-[10px] text-slate-400 pt-1">
                        ※ 現在寸法: <strong class="text-cyan-300 mono-num">${curWMm} × ${curDMm} mm</strong> (${obj.w.toFixed(2)} × ${obj.h.toFixed(2)}P)
                    </div>
                </div>
            `;
        } else if (cat === 'VANITY') {
            let wOpts = vSpecs.widths.map(w => `<option value="${w}" ${w === curWMm ? 'selected' : ''}>幅: ${w} mm</option>`).join('');
            let hOpts = vSpecs.heights.map(h => `<option value="${h}" ${h === curHMm ? 'selected' : ''}>高さ: ${h} mm</option>`).join('');

            contentHtml = `
                <div class="space-y-2.5 text-xs">
                    <div class="flex items-center justify-between gap-2">
                        <label class="text-cyan-300 font-bold shrink-0">規格幅 (W):</label>
                        <select onchange="updateSelectedVanity(parseInt(this.value), null)" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold mono-num focus:outline-none">${wOpts}</select>
                    </div>
                    <div class="flex items-center justify-between gap-2">
                        <label class="text-slate-400 font-semibold shrink-0">高さ (H):</label>
                        <select onchange="updateSelectedVanity(null, parseInt(this.value))" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold mono-num focus:outline-none">${hOpts}</select>
                    </div>
                    <div class="text-[10px] text-slate-400 pt-1">
                        ※ 奥行標準: <strong class="text-cyan-300 mono-num">550 mm</strong>
                    </div>
                </div>
            `;
        } else {
            contentHtml = `
                <div class="space-y-2 text-xs">
                    <div class="flex justify-between text-slate-300"><span>寸法: <strong class="text-cyan-300 mono-num">${curWMm} × ${curDMm} mm</strong></span></div>
                </div>
            `;
        }

        panel.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-700 pb-2 mb-2.5">
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                    <span class="text-xs font-bold text-white">${obj.label || '住宅設備プロパティ編集'}</span>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="deleteSelectedItem()" class="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-[11px] text-rose-200 font-bold"><i class="fa-solid fa-trash mr-1"></i>削除</button>
                    <button onclick="state.selectedItem=null;renderPropertyInspector();request2DRedraw();" class="text-slate-400 hover:text-white px-1.5"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            ${contentHtml}
            <div class="flex items-center gap-2 pt-2">
                <button onclick="rotateSelectedFixture()" class="flex-1 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs">
                    <i class="fa-solid fa-rotate mr-1"></i>90度回転
                </button>
            </div>
        `;
    """

text = text[:s_i_fx] + new_insp_fx + text[e_i_fx:]

# 5. 設備更新ハンドラ関数の追加
fixture_handlers = """
// ============================================================================
// 住宅設備（キッチン・UB・洗面台）寸法更新ハンドラ群
// ============================================================================
function rotateSelectedFixture() {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'fixture') return;
    const fx = fl.fixtures.find(f => f.id === state.selectedItem.id);
    if (!fx) return;

    // 幅と高さを入れ替え
    const tmp = fx.w; fx.w = fx.h; fx.h = tmp;
    const tmpMm = fx.wMm; fx.wMm = fx.dMm; fx.dMm = tmpMm;
    fx.rot = ((fx.rot || 0) + 90) % 360;

    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    renderPropertyInspector();
    request2DRedraw();
    showToast('設備を90度回転しました');
}

function updateSelectedKitchenI(newW, newD, newH) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'fixture') return;
    const fx = fl.fixtures.find(f => f.id === state.selectedItem.id);
    if (!fx) return;

    const pitch = state.modulePitch || 910;
    if (newW) { fx.wMm = newW; fx.w = +(newW / pitch).toFixed(3); }
    if (newD) { fx.dMm = newD; fx.h = +(newD / pitch).toFixed(3); }
    if (newH) { fx.hMm = newH; }
    fx.label = `I型キッチン (${fx.wMm/10}×${fx.dMm/10}cm)`;

    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    renderPropertyInspector();
    request2DRedraw();
    showToast(`キッチン寸法を ${fx.wMm/10}cm × ${fx.dMm/10}cm に変更しました`);
}

function updateSelectedKitchenL(newX, newY, newH) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'fixture') return;
    const fx = fl.fixtures.find(f => f.id === state.selectedItem.id);
    if (!fx) return;

    const pitch = state.modulePitch || 910;
    if (!fx.fxData) fx.fxData = {};
    if (newX) { fx.fxData.lWidthX = newX; fx.wMm = newX; fx.w = +(newX / pitch).toFixed(3); }
    if (newY) { fx.fxData.lWidthY = newY; fx.dMm = newY; fx.h = +(newY / pitch).toFixed(3); }
    if (newH) { fx.hMm = newH; }
    fx.label = `L型キッチン (${fx.wMm/10}×${fx.dMm/10}cm)`;

    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    renderPropertyInspector();
    request2DRedraw();
    showToast(`L型キッチン寸法を変更しました`);
}

function updateSelectedKitchenIsland(newW, newD, newH) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'fixture') return;
    const fx = fl.fixtures.find(f => f.id === state.selectedItem.id);
    if (!fx) return;

    const pitch = state.modulePitch || 910;
    if (newW) { fx.wMm = newW; fx.w = +(newW / pitch).toFixed(3); }
    if (newD) { fx.dMm = newD; fx.h = +(newD / pitch).toFixed(3); }
    if (newH) { fx.hMm = newH; }
    fx.label = `アイランド/ペニンシュラ (${fx.wMm}×${fx.dMm}mm)`;

    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    renderPropertyInspector();
    request2DRedraw();
    showToast(`アイランド寸法を ${fx.wMm}×${fx.dMm}mm に変更しました`);
}

function changeSelectedKitchenType(newType) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'fixture') return;
    const fx = fl.fixtures.find(f => f.id === state.selectedItem.id);
    if (!fx) return;

    if (!fx.fxData) fx.fxData = {};
    fx.fxData.kitchenType = newType;
    const pitch = state.modulePitch || 910;

    if (newType === 'I') {
        fx.wMm = 2550; fx.dMm = 650; fx.hMm = 850;
        fx.w = +(2550 / pitch).toFixed(3); fx.h = +(650 / pitch).toFixed(3);
        fx.label = `I型キッチン (255×65cm)`;
    } else if (newType === 'L') {
        fx.wMm = 2550; fx.dMm = 1950; fx.hMm = 850;
        fx.fxData.lWidthX = 2550; fx.fxData.lWidthY = 1950; fx.fxData.lDepth = 650;
        fx.w = +(2550 / pitch).toFixed(3); fx.h = +(1950 / pitch).toFixed(3);
        fx.label = `L型キッチン (255×195cm)`;
    } else {
        fx.wMm = 2550; fx.dMm = 900; fx.hMm = 850;
        fx.w = +(2550 / pitch).toFixed(3); fx.h = +(900 / pitch).toFixed(3);
        fx.label = `アイランド/ペニンシュラ (2550×900mm)`;
    }

    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    renderPropertyInspector();
    request2DRedraw();
}

function updateSelectedUbSize(sizeId) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'fixture') return;
    const fx = fl.fixtures.find(f => f.id === state.selectedItem.id);
    if (!fx) return;

    const ubSpecs = window.UB_SPECS || { sizes: [] };
    const curSize = ubSpecs.sizes.find(s => s.id === sizeId);
    if (!curSize) return;

    const pitch = state.modulePitch || 910;
    fx.wMm = curSize.wMm;
    fx.dMm = curSize.dMm;
    fx.w = +(curSize.wMm / pitch).toFixed(3);
    fx.h = +(curSize.dMm / pitch).toFixed(3);
    if (!fx.fxData) fx.fxData = {};
    fx.fxData.ubSize = sizeId;
    fx.label = `ユニットバス ${curSize.label}`;

    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    renderPropertyInspector();
    request2DRedraw();
    showToast(`UBサイズを ${curSize.label} に変更しました`);
}

function updateSelectedUbPattern(patId) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'fixture') return;
    const fx = fl.fixtures.find(f => f.id === state.selectedItem.id);
    if (!fx) return;

    if (!fx.fxData) fx.fxData = {};
    fx.fxData.ubPattern = patId;

    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    renderPropertyInspector();
    request2DRedraw();
    showToast(`UB出入口を ${patId === 'patternA' ? '短手出入口' : '長手出入口'} に変更しました`);
}

function updateSelectedVanity(newW, newH) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'fixture') return;
    const fx = fl.fixtures.find(f => f.id === state.selectedItem.id);
    if (!fx) return;

    const pitch = state.modulePitch || 910;
    if (newW) {
        fx.wMm = newW;
        fx.w = +(newW / pitch).toFixed(3);
        if (!fx.fxData) fx.fxData = {};
        fx.fxData.vanityWidth = newW;
        fx.label = `洗面化粧台 (W${newW}mm)`;
    }
    if (newH) { fx.hMm = newH; }

    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    renderPropertyInspector();
    request2DRedraw();
    showToast(`洗面化粧台寸法を変更しました`);
}
"""

text = text.replace("function updateSelectedWindowSize(", fixture_handlers + "\nfunction updateSelectedWindowSize(", 1)

# 6. drawFixture2D の更新（美しいキッチン天板・コンロ・シンク、UB浴槽＋出入口枠、洗面化粧台ボウル）
old_draw_fx_start = "function drawFixture2D(fx) {"
old_draw_fx_end = "function drawOpening2D(op) {"

s_d_fx = text.find(old_draw_fx_start)
e_d_fx = text.find(old_draw_fx_end)

new_draw_fx = """function drawFixture2D(fx) {
    const p = worldPToScreen(fx.x, fx.y);
    const wPx = fx.w * state.cam2d.zoom;
    const hPx = fx.h * state.cam2d.zoom;
    const isSelected = state.selectedItem && state.selectedItem.kind === 'fixture' && state.selectedItem.id === fx.id;
    const cat = fx.category || fx.type;

    ctx.save();
    ctx.translate(p.x, p.y);

    if (cat === 'KITCHEN' || cat.startsWith('KITCHEN')) {
        // ==========================================
        // 🍳 システムキッチン（天板・シンク・3口コンロ）
        // ==========================================
        const kType = (fx.fxData && fx.fxData.kitchenType) || 'I';

        ctx.fillStyle = isSelected ? '#ecfeff' : '#f1f5f9';
        ctx.strokeStyle = isSelected ? '#06b6d4' : '#475569';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;

        if (kType === 'L') {
            // L型キッチン描画
            const depthRatio = Math.min(0.4, 650 / (fx.wMm || 2550));
            const dX = wPx * depthRatio;
            const dY = hPx * depthRatio;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(wPx, 0);
            ctx.lineTo(wPx, dY);
            ctx.lineTo(dX, dY);
            ctx.lineTo(dX, hPx);
            ctx.lineTo(0, hPx);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // シンク (X方向)
            if (wPx > 60 && hPx > 40) {
                ctx.fillStyle = '#e2e8f0';
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 1;
                ctx.strokeRect(wPx * 0.45, 4, wPx * 0.32, dY - 8);
                ctx.fillRect(wPx * 0.45, 4, wPx * 0.32, dY - 8);
            }
            // コンロ (Y方向)
            if (hPx > 60) {
                ctx.fillStyle = '#334155';
                const cy = hPx * 0.55;
                ctx.beginPath();
                ctx.arc(dX * 0.5, cy, Math.min(dX * 0.25, 8), 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // I型 または アイランド/ペニンシュラ
            ctx.fillRect(0, 0, wPx, hPx);
            ctx.strokeRect(0, 0, wPx, hPx);

            if (wPx > 50 && hPx > 20) {
                // シンク（水槽）
                const sinkW = Math.min(wPx * 0.35, 45);
                const sinkH = hPx * 0.65;
                ctx.fillStyle = '#e2e8f0';
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 1;
                ctx.strokeRect(8, (hPx - sinkH) / 2, sinkW, sinkH);
                ctx.fillRect(8, (hPx - sinkH) / 2, sinkW, sinkH);

                // コンロ（3口）
                const stoveX = wPx - Math.min(wPx * 0.32, 40);
                const stoveY = hPx / 2;
                ctx.fillStyle = '#334155';
                ctx.beginPath();
                ctx.arc(stoveX + 12, stoveY - 4, 4.5, 0, Math.PI * 2);
                ctx.arc(stoveX + 12, stoveY + 5, 4.5, 0, Math.PI * 2);
                ctx.arc(stoveX + 22, stoveY, 3.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ラベル
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 9px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (wPx > 40 && hPx > 20) {
            ctx.fillText(kType === 'ISLAND' ? 'アイランド' : (kType === 'L' ? 'L型' : 'キッチン'), wPx / 2, hPx / 2);
        }
    } else if (cat === 'UB') {
        // ==========================================
        // 🛁 ユニットバス（浴槽＋洗い場カウンター＋出入口枠）
        // ==========================================
        const pat = (fx.fxData && fx.fxData.ubPattern) || 'patternA';
        ctx.fillStyle = isSelected ? '#f0fdfa' : '#f8fafc';
        ctx.strokeStyle = isSelected ? '#0d9488' : '#0891b2';
        ctx.lineWidth = isSelected ? 2.5 : 1.8;

        // 全体外枠
        ctx.fillRect(0, 0, wPx, hPx);
        ctx.strokeRect(0, 0, wPx, hPx);

        // バスタブ（浴槽）
        ctx.fillStyle = '#cffafe';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.2;

        if (pat === 'patternA') {
            // パターンA: 上部に浴槽、下部に洗い場と出入口
            const tubH = hPx * 0.45;
            ctx.beginPath();
            ctx.roundRect(4, 4, wPx - 8, tubH, 8);
            ctx.fill();
            ctx.stroke();

            // ドア出入口枠（下端中央）
            ctx.fillStyle = '#0891b2';
            ctx.fillRect(wPx * 0.35, hPx - 3, wPx * 0.3, 3);
        } else {
            // パターンB: 右側に浴槽、左側に洗い場と長手出入口
            const tubW = wPx * 0.45;
            ctx.beginPath();
            ctx.roundRect(wPx - tubW - 4, 4, tubW, hPx - 8, 8);
            ctx.fill();
            ctx.stroke();

            // ドア出入口枠（左端中央）
            ctx.fillStyle = '#0891b2';
            ctx.fillRect(0, hPx * 0.35, 3, hPx * 0.3);
        }

        // ラベル
        ctx.fillStyle = '#0e7490';
        ctx.font = 'bold 9px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`UB ${(fx.fxData && fx.fxData.ubSize) || '1616'}`, wPx * 0.5, hPx * 0.75);
    } else if (cat === 'VANITY') {
        // ==========================================
        // 🪞 洗面化粧台（カウンター＋洗面ボウル＋水栓）
        // ==========================================
        ctx.fillStyle = isSelected ? '#f8fafc' : '#ffffff';
        ctx.strokeStyle = isSelected ? '#0284c7' : '#64748b';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;

        ctx.fillRect(0, 0, wPx, hPx);
        ctx.strokeRect(0, 0, wPx, hPx);

        // 洗面ボウル（楕円）
        if (wPx > 24 && hPx > 16) {
            ctx.fillStyle = '#e0f2fe';
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(wPx / 2, hPx / 2, Math.min(wPx * 0.35, 20), Math.min(hPx * 0.35, 12), 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 水栓
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.arc(wPx / 2, 4, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // ラベル
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 8px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        if (wPx > 30) {
            ctx.fillText(`洗面 W${fx.wMm || 900}`, wPx / 2, hPx - 2);
        }
    } else {
        // その他の設備（トイレ、階段、家具等）
        const ft = FIXTURE_TYPES[cat] || { color: '#cbd5e1', label: '設備' };
        ctx.fillStyle = ft.color;
        ctx.fillRect(0, 0, wPx, hPx);
        ctx.strokeStyle = isSelected ? '#f59e0b' : '#64748b';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.strokeRect(0, 0, wPx, hPx);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 9px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (wPx > 28 && hPx > 18) {
            ctx.fillText(ft.label.split('(')[0], wPx / 2, hPx / 2);
        }
    }

    ctx.restore();
}
"""

text = text[:s_d_fx] + new_draw_fx + text[e_d_fx:]

with open(SRC_HTML, 'w', encoding='utf-8') as f:
    f.write(text)

print(f"✅ Successfully updated residential fixtures in {SRC_HTML}")
