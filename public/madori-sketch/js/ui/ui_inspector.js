/**
 * 住ま居る 3D間取り工房 (MadoriSketch)
 * UIコントロール・左2列パレット・サブツールバー・インスペクタ・操作マニュアルモーダル・3D写真ペン書込モーダル
 * (Single Responsibility: UI Controls, Inspector, Context Manual Modal & Photo Sketch Modal)
 */

function setPaletteMode(mode) {
    state.paletteMode = mode;
    ['build', 'memo', 'photo'].forEach(m => {
        const btn = document.getElementById('modeBtn_' + m) || document.getElementById('paletteModeBtn_' + m);
        const pane = document.getElementById('palettePanel_' + m) || document.getElementById('palettePane_' + m);
        if (btn) {
            if (m === mode) {
                btn.className = 'py-1.5 px-0.5 rounded bg-amber-500 text-slate-950 font-extrabold text-[10px] flex flex-col items-center gap-0.5 shadow border border-amber-300 transition';
            } else {
                btn.className = 'py-1.5 px-0.5 rounded bg-zinc-600 text-zinc-200 hover:text-white font-bold text-[10px] flex flex-col items-center gap-0.5 border border-zinc-500 transition';
            }
        }
        if (pane) {
            pane.classList.toggle('hidden', m !== mode);
        }
    });

    if (mode === 'build') {
        selectTool('wall', state.subWallType || 'wall');
    } else if (mode === 'memo') {
        selectTool('memo_freehand');
    } else if (mode === 'photo') {
        renderPhotoListInPalette();
        updateManualContextBadge();
    }
}
window.setPaletteMode = setPaletteMode;

function selectTool(toolName, subOption) {
    state.activeTool = toolName;
    state.wallClickStart = null;
    state.lastHoverWorld = null;
    state.polyPoints = [];
    state.polyPillarPoints = [];

    // 仕様データのIDゆれ正規化マップ（HTML側の 'hikido','katabiraki','ryobiraki' と specs側の 'katabiki','katahiraki','ryouhiraki' の両対応）
    const sashAliasMap = {
        hikido: 'katabiki',
        katabiki: 'katabiki',
        katabiraki: 'katahiraki',
        katahiraki: 'katahiraki',
        ryobiraki: 'ryouhiraki',
        ryouhiraki: 'ryouhiraki'
    };

    if (toolName === 'wall' && subOption) {
        state.subWallType = subOption;
    } else if (toolName === 'opening' && subOption) {
        const normalizedFit = sashAliasMap[subOption] || subOption;
        state.subOpeningFit = normalizedFit;
        state.subOpeningUiKey = subOption;
        state.subDoorFit = normalizedFit;
        const sashSpec = (window.SASH_TYPES_12 || []).find(s => s.id === normalizedFit || s.id === subOption);
        if (sashSpec) {
            state.subOpeningCategory = sashSpec.isWinDefault ? 'window' : 'door';
            state.subWindowWidth = sashSpec.defaultWMm;
            state.subWindowHeight = sashSpec.defaultHMm;
            state.subWindowSillMm = sashSpec.defaultSillMm;
            state.subDoorLeafCount = sashSpec.leaves;
            state.subDoorLeafWidth = Math.round(sashSpec.defaultWMm / sashSpec.leaves);
            state.subDoorHeight = sashSpec.defaultHMm;
        }
    } else if (toolName === 'room' && subOption) {
        state.subRoomType = subOption;
    }

    // 左パレットの全ツールボタンのアクティブ表示を更新（選択中は黄色・オレンジグラデーション .tool-btn.active）
    document.querySelectorAll('.tool-btn, .palette-tool-btn').forEach(btn => {
        btn.classList.remove('active', 'active-orange');
    });

    const candidates = [];
    if (toolName === 'wall') {
        const wt = subOption || state.subWallType || 'wall';
        candidates.push('tool_wall_' + wt, 'ptool_wall_' + wt);
    } else if (toolName === 'opening') {
        const uk = subOption || state.subOpeningUiKey || state.subOpeningFit || 'hikichigai';
        const revMap = { katabiki: 'hikido', katahiraki: 'katabiraki', ryouhiraki: 'ryobiraki' };
        candidates.push(
            'tool_sash_' + uk,
            'tool_sash_' + (revMap[uk] || uk),
            'ptool_op_' + uk
        );
    } else if (toolName === 'room' && subOption) {
        candidates.push('tool_room_' + subOption.toLowerCase(), 'tool_room', 'ptool_rm_' + subOption);
    }
    candidates.push('tool_' + toolName, 'ptool_' + toolName);

    for (const id of candidates) {
        const btn = document.getElementById(id);
        if (btn) {
            btn.classList.add('active');
            break;
        }
    }

    renderSubToolbar();
    renderPropertyInspector();
    updateManualContextBadge();
    request2DRedraw();
}
window.selectTool = selectTool;

/**
 * ツール選択連動：現在のツールに対応するマニュアル項目名をヘッダー・パレットのボタンに反映
 */
function updateManualContextBadge() {
    if (!window.MADORI_MANUAL_DATA) return;
    const manualId = window.MADORI_MANUAL_DATA.resolveManualIdForCurrentTool(state);
    const item = window.MADORI_MANUAL_DATA.itemMap[manualId];
    const cleanTitle = item ? item.title.replace(/^\d+\.\s*/, '') : '壁の作図';
    const lblEl = document.getElementById('txtContextualManual') || document.getElementById('lblCurrentToolManual');
    if (lblEl) {
        lblEl.textContent = `📖 解説: ${cleanTitle}`;
    }
    const modalBadge = document.getElementById('manualModalCurrentToolBadge');
    if (modalBadge) {
        modalBadge.textContent = `現在選択中: ${cleanTitle}`;
    }
}
window.updateManualContextBadge = updateManualContextBadge;

function updatePlanTitle(val) {
    state.projectTitle = (val || '').trim() || '新規プラン';
    const inp = document.getElementById('planTitleInput');
    if (inp && inp.value !== state.projectTitle) inp.value = state.projectTitle;
    saveHistorySnapshot();
    showToast(`物件名称を「${state.projectTitle}」に更新しました`);
}
window.updatePlanTitle = updatePlanTitle;

function togglePlanLock() {
    state.planLocked = !state.planLocked;
    const btn = document.getElementById('btnPinLock');
    if (btn) {
        if (state.planLocked) {
            btn.className = 'px-2 py-1 rounded text-[10px] font-extrabold bg-amber-500 text-slate-950 border border-amber-300 flex items-center gap-1 shadow transition leading-tight';
            btn.innerHTML = `<i class="fa-solid fa-lock text-[10px]"></i><span>ピン止め中<br>(ロック解除)</span>`;
        } else {
            btn.className = 'px-2 py-1 rounded text-[10px] font-bold bg-zinc-600 text-zinc-200 border border-zinc-500 flex items-center gap-1 hover:bg-zinc-500 transition leading-tight';
            btn.innerHTML = `<i class="fa-solid fa-lock-open text-[10px]"></i><span>この図面を<br>ピン止めする</span>`;
        }
    }
    showToast(state.planLocked ? '🔒 図面をピン止め（誤操作ロック）しました' : '🔓 図面のピン止めを解除しました');
}
window.togglePlanLock = togglePlanLock;

/**
 * ペン入力 / パームリジェクション / クリック入力の切替制御
 * (iPad Apple Pencil, Android S-Pen, Surface Pen, PCマウス全対応)
 */
function togglePalmRejectionMode(forceMode) {
    if (forceMode) {
        state.inputModeSetting = forceMode;
    } else {
        // 'auto' -> 'pen_only' -> 'all' のトグル、またはシンプルに ON/OFF
        state.stylusOnlyMode = !state.stylusOnlyMode;
        state.inputModeSetting = state.stylusOnlyMode ? 'pen_only' : 'all';
    }
    if (state.inputModeSetting === 'pen_only') {
        state.stylusOnlyMode = true;
    } else if (state.inputModeSetting === 'all') {
        state.stylusOnlyMode = false;
    }
    syncPalmRejectionUI();
    showToast(
        state.stylusOnlyMode
            ? '🖊️ ペン専用＋パームリジェクションON：ペンで作図し、手や指の接触は画面スクロール（誤描防止）になります（マウスクリックも作図可能）'
            : '👆 ペン・指・マウス併用モード：ペン・指タッチ・マウスクリックのすべてで作図できます'
    );
}
window.togglePalmRejectionMode = togglePalmRejectionMode;

function syncPalmRejectionUI() {
    const btn = document.getElementById('btnPalmRejection');
    if (!btn) return;
    if (state.stylusOnlyMode) {
        btn.className = 'px-2 py-1 rounded bg-amber-500 text-slate-950 font-extrabold text-[11px] border border-amber-300 shadow flex items-center gap-1 transition';
        btn.innerHTML = `<i class="fa-solid fa-pen-nib"></i><span class="hidden sm:inline">ペン優先(手のひら防止ON)</span>`;
    } else {
        btn.className = 'px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-bold text-[11px] border border-zinc-500 flex items-center gap-1 transition';
        btn.innerHTML = `<i class="fa-solid fa-hand-pointer"></i><span class="hidden sm:inline">ペン/指/マウス入力</span>`;
    }
}
window.syncPalmRejectionUI = syncPalmRejectionUI;

function renderSubToolbar() {
    const container = document.getElementById('subToolbarContent');
    if (!container) return;
    container.innerHTML = '';

    const tool = state.activeTool;

    if (tool === 'wall') {
        const wSub = state.subWallType || 'wall';
        const names = { wall: '通常壁（外壁/内壁自動）', tarekabe: 'たれ壁（上部下がり壁・点線）', koshikabe: '腰壁（高さ1,000mm手すり壁）', agarikamachi: '上り框（玄関段差）' };
        const diagActive = !!state.diagonalWallMode;
        container.innerHTML = `
            <span class="text-xs font-black text-amber-400 mr-1 shrink-0"><i class="fa-solid fa-pen-nib mr-1"></i>${names[wSub] || '壁'}:</span>
            <button type="button" onclick="toggleDiagonalWallMode()" class="px-2 py-0.5 rounded text-[11px] font-bold border transition shrink-0 ${diagActive ? 'bg-amber-500 text-slate-950 border-amber-300 shadow' : 'bg-slate-800 text-slate-300 border-slate-600 hover:text-white'}" title="水平・垂直の直交スナップと、斜め壁（45°・自由角）作図を切り替えます">
                <i class="fa-solid fa-slash mr-1"></i>${diagActive ? '📐 斜め壁ON' : '┼ 直交(水平/垂直)'}
            </button>
            <span class="text-xs text-slate-200 shrink-0 hidden sm:inline">始点〜終点ドラッグ（または2点クリック）で作図 ／ 既存壁は「編集」で数値移動・端点追随</span>
            <button onclick="openManualModal()" class="ml-auto px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[11px] font-bold shrink-0">📖 使い方</button>
        `;
    } else if (tool === 'pillar') {
        container.innerHTML = `
            <span class="text-[11px] font-bold text-slate-300 mr-1">独立柱サイズ:</span>
            <button onclick="state.subPillarSize=105;state.subPillarShape='square';renderSubToolbar();" class="sub-chip px-2 py-1 rounded text-xs font-bold border ${(state.subPillarSize === 105 && state.subPillarShape === 'square') ? 'active' : 'bg-slate-800 text-slate-300 border-slate-700'}">105角</button>
            <button onclick="state.subPillarSize=120;state.subPillarShape='square';renderSubToolbar();" class="sub-chip px-2 py-1 rounded text-xs font-bold border ${(state.subPillarSize === 120 && state.subPillarShape === 'square') ? 'active' : 'bg-slate-800 text-slate-300 border-slate-700'}">120角</button>
            <button onclick="state.subPillarSize=150;state.subPillarShape='square';renderSubToolbar();" class="sub-chip px-2 py-1 rounded text-xs font-bold border ${(state.subPillarSize === 150 && state.subPillarShape === 'square') ? 'active' : 'bg-slate-800 text-slate-300 border-slate-700'}">150角(標準)</button>
            <button onclick="state.subPillarSize=150;state.subPillarShape='round';renderSubToolbar();" class="sub-chip px-2 py-1 rounded text-xs font-bold border ${(state.subPillarShape === 'round') ? 'active' : 'bg-slate-800 text-slate-300 border-slate-700'}">丸柱(φ150)</button>
            <span class="text-[11px] text-amber-300 font-bold ml-1">図面上をタップして配置</span>
        `;
    } else if (tool === 'poly_pillar') {
        const ptLen = (state.polyPoints || []).length;
        container.innerHTML = `
            <span class="text-xs font-bold text-amber-300"><i class="fa-solid fa-draw-polygon mr-1"></i>多角形柱:</span>
            <span class="text-xs text-slate-200">${ptLen === 0 ? '頂点を順番にタップして囲んでください' : `${ptLen}点指定中（始点をタップまたは確定で作成）`}</span>
            ${ptLen >= 3 ? `<button onclick="finishPolyPillar()" class="px-2.5 py-1 rounded bg-emerald-600 text-white text-xs font-bold">確定して作成</button>` : ''}
            ${ptLen > 0 ? `<button onclick="state.polyPoints=[];renderSubToolbar();request2DRedraw();" class="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs">取消</button>` : ''}
        `;
    } else if (tool === 'opening') {
        const fit = state.subOpeningFit || 'hikichigai';
        const sashSpec = (window.SASH_TYPES_12 || []).find(s => s.id === fit) || { label: 'サッシ・建具' };
        const wOpts = [360, 600, 700, 740, 780, 800, 850, 900, 910, 1000, 1190, 1200, 1365, 1600, 1650, 1820, 2250, 2560, 3470].map(w =>
            `<option value="${w}" ${state.subWindowWidth === w ? 'selected' : ''}>幅 W${w}mm${w === 910 ? '(1P)' : (w === 1650 ? '(標準窓)' : (w === 800 ? '(標準戸)' : ''))}</option>`
        ).join('');
        const hOpts = [500, 700, 900, 1100, 1300, 1800, 2000, 2200, 2400].map(h =>
            `<option value="${h}" ${state.subWindowHeight === h ? 'selected' : ''}>高 H${h}mm${h === 1300 ? '(居室窓)' : (h === 2000 ? '(掃出/建具)' : '')}</option>`
        ).join('');
        const sillOpts = [0, 400, 800, 900, 1100, 1500, 1800].map(s =>
            `<option value="${s}" ${state.subWindowSillMm === s ? 'selected' : ''}>下端 FL+${s}mm${s === 0 ? '(床/掃出)' : (s === 800 || s === 900 ? '(腰窓)' : (s >= 1500 ? '(高窓)' : ''))}</option>`
        ).join('');

        const presets = window.OPENING_QUICK_PRESETS || [];
        const presetBtns = presets.map(pr => {
            const isMatched = state.subOpeningFit === pr.fit && state.subWindowWidth === pr.wMm && state.subWindowHeight === pr.hMm && state.subWindowSillMm === pr.sillMm;
            return `<button type="button" onclick="applyOpeningQuickPreset('${pr.id}')" class="px-2 py-0.5 rounded text-[10px] font-bold border transition shrink-0 ${isMatched ? 'bg-amber-500 text-slate-950 border-amber-300 shadow' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'}">${pr.label}</button>`;
        }).join('');

        const copyBadge = state.copiedOpeningSpec
            ? `<button type="button" onclick="clearCopiedOpeningSpec()" class="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-extrabold border border-emerald-300 shadow shrink-0" title="クリックでコピー連続配置モードを解除">📋 コピー連続配置中: ${state.copiedOpeningSpec.label} (×解除)</button>`
            : '';

        container.innerHTML = `
            <div class="flex flex-col gap-1 w-full">
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-xs font-black text-amber-400 shrink-0">🚪 ${sashSpec.label}:</span>
                    <select onchange="state.subWindowWidth=parseInt(this.value);state.subDoorLeafWidth=Math.round(parseInt(this.value)/(state.subDoorLeafCount||1));state.copiedOpeningSpec=null;renderSubToolbar();" class="bg-slate-900 text-sky-200 border border-slate-700 rounded px-2 py-0.5 text-xs font-bold mono-num">${wOpts}</select>
                    <select onchange="state.subWindowHeight=parseInt(this.value);state.subDoorHeight=parseInt(this.value);state.copiedOpeningSpec=null;renderSubToolbar();" class="bg-slate-900 text-sky-200 border border-slate-700 rounded px-2 py-0.5 text-xs font-bold mono-num">${hOpts}</select>
                    <select onchange="state.subWindowSillMm=parseInt(this.value);state.copiedOpeningSpec=null;renderSubToolbar();" class="bg-slate-900 text-amber-200 border border-slate-700 rounded px-2 py-0.5 text-xs font-bold mono-num">${sillOpts}</select>
                    ${copyBadge}
                    <span class="text-[10px] text-slate-300 hidden xl:inline">壁をタップで配置（配置後に「壁端から◯mm」数値指定・コピーも可能）</span>
                </div>
                <div class="flex items-center gap-1 overflow-x-auto pb-0.5">
                    <span class="text-[10px] font-bold text-amber-300 shrink-0">⚡定型プリセット:</span>
                    ${presetBtns}
                </div>
            </div>
        `;
    } else if (tool === 'stair') {
        const isFree = state.stairDrawMode === 'free';
        const curPreset = state.stairPresetType || 'U_6TURN';
        container.innerHTML = `
            <div class="flex items-center gap-1.5 flex-wrap">
                <!-- モード切替タブ: 定型ポン置き / 一辺ずつ描く -->
                <div class="flex items-center rounded-lg bg-slate-950 p-0.5 border border-slate-700 mr-1 shadow-inner">
                    <button type="button" onclick="setStairDrawMode('preset')" class="px-2 py-0.5 rounded text-[11px] font-bold transition ${!isFree ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}">定型ポン置き</button>
                    <button type="button" onclick="setStairDrawMode('free')" class="px-2 py-0.5 rounded text-[11px] font-bold transition ${isFree ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}">一辺ずつ描く</button>
                </div>
                ${isFree ? `
                    <span class="text-xs text-amber-300 font-bold flex items-center gap-1"><i class="fa-solid fa-pen"></i>図面上をタップして角を指定（2〜4点でI・L・コの字・クランク階段を作成）</span>
                    ${(state.stairDrawingPoints && state.stairDrawingPoints.length >= 2) ? `
                        <button type="button" onclick="openStairModal()" class="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow flex items-center gap-1"><i class="fa-solid fa-check"></i>階段作成 (${state.stairDrawingPoints.length}点)</button>
                    ` : ''}
                    ${(state.stairDrawingPoints && state.stairDrawingPoints.length > 0) ? `
                        <button type="button" onclick="cancelStairDrawing()" class="px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white text-xs border border-slate-700">リセット</button>
                    ` : ''}
                ` : `
                    <button type="button" onclick="setStairPresetType('U_6TURN')" class="sub-chip px-2 py-1 rounded text-[11px] font-bold border ${(curPreset === 'U_6TURN' || curPreset === 'U_SHAPE') ? 'active' : 'bg-slate-900 border-slate-700 text-slate-300'}" title="① コの字 6段廻り (I1:4段 + 3段廻り + 3段廻り + I3:3段)">①コの字(6段廻り)</button>
                    <button type="button" onclick="setStairPresetType('STRAIGHT')" class="sub-chip px-2 py-1 rounded text-[11px] font-bold border ${curPreset === 'STRAIGHT' ? 'active' : 'bg-slate-900 border-slate-700 text-slate-300'}" title="② 直階段 I型 (13段)">②直階段(I型)</button>
                    <button type="button" onclick="setStairPresetType('L_TOP_TURN')" class="sub-chip px-2 py-1 rounded text-[11px] font-bold border ${curPreset === 'L_TOP_TURN' ? 'active' : 'bg-slate-900 border-slate-700 text-slate-300'}" title="③ 直進10段 + 上部3段廻り登りきり">③上廻りL型(10+3)</button>
                    <button type="button" onclick="setStairPresetType('CRANK_BOTH_TURN')" class="sub-chip px-2 py-1 rounded text-[11px] font-bold border ${curPreset === 'CRANK_BOTH_TURN' ? 'active' : 'bg-slate-900 border-slate-700 text-slate-300'}" title="④ 下部3段廻り + 直進7段 + 上部3段廻り">④上下廻り(3+7+3)</button>
                    <button type="button" onclick="setStairPresetType('L_PLUS_TOP_TURN')" class="sub-chip px-2 py-1 rounded text-[11px] font-bold border ${curPreset === 'L_PLUS_TOP_TURN' ? 'active' : 'bg-slate-900 border-slate-700 text-slate-300'}" title="⑤ 直進4段 + 3段廻り + 直進4段 + 上部3段廻り">⑤L+上廻り(4+3+4+3)</button>
                    <button type="button" onclick="setStairPresetType('L_LANDING_TOP')" class="sub-chip px-2 py-1 rounded text-[11px] font-bold border ${curPreset === 'L_LANDING_TOP' ? 'active' : 'bg-slate-900 border-slate-700 text-slate-300'}" title="⑥ 直進5段 + 1段踊り場登りきり">⑥1段踊り場登りきり</button>
                    <button type="button" onclick="setStairPresetType('L_STANDARD')" class="sub-chip px-2 py-1 rounded text-[11px] font-bold border ${(curPreset === 'L_STANDARD' || curPreset === 'L_SHAPE') ? 'active' : 'bg-slate-900 border-slate-700 text-slate-300'}" title="⑦ 標準かね折れL型 (5+3+5)">⑦標準L型</button>
                    <button type="button" onclick="rotateStairPreset()" class="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-amber-300 text-xs font-bold"><i class="fa-solid fa-rotate-right"></i> 90°回転(${state.subStairRot || 0}°)</button>
                    <button type="button" onclick="toggleStairDirection()" class="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-cyan-300 text-xs font-bold">${state.subStairDirection === 'DOWN' ? '⬇ 降りる' : '⬆ 上る'}</button>
                    <select onchange="state.stairWidthMm=parseInt(this.value,10);if(typeof renderSubToolbar==='function')renderSubToolbar();" class="bg-slate-900 text-cyan-300 border border-slate-700 rounded px-2 py-1 text-xs font-bold" title="階段幅">
                        <option value="910" ${(state.stairWidthMm || 910) === 910 ? 'selected' : ''}>幅: 910mm</option>
                        <option value="1000" ${state.stairWidthMm === 1000 ? 'selected' : ''}>幅: 1000mm</option>
                        <option value="780" ${state.stairWidthMm === 780 ? 'selected' : ''}>幅: 780mm</option>
                    </select>
                `}
            </div>
        `;
    } else if (tool === 'fixture') {
        const catList = [
            { id: 'KITCHEN', icon: '🍳', label: 'I型キッチン' },
            { id: 'KITCHEN_L', icon: '🍳', label: 'L型キッチン' },
            { id: 'UB', icon: '🛁', label: 'バス(UB)' },
            { id: 'VANITY', icon: '🪞', label: '洗面台' },
            { id: 'TOILET_FIX', icon: '🚽', label: 'トイレ' },
            { id: 'CUPBOARD', icon: '🗄️', label: 'カップボード' },
            { id: 'FRIDGE', icon: '🧊', label: '冷蔵庫' },
            { id: 'WASHER', icon: '🧺', label: '洗濯機' },
            { id: 'DINING_SET', icon: '🍽️', label: 'ダイニング' },
            { id: 'SOFA', icon: '🛋️', label: 'ソファ' },
            { id: 'BED_DOUBLE', icon: '🛏️', label: 'ベッド' },
            { id: 'CLOSET_UNIT', icon: '🚪', label: '収納家具' }
        ];
        let btns = catList.map(c => {
            const isAct = (state.subFixtureCategory || 'KITCHEN') === c.id;
            return `<button onclick="state.subFixtureCategory='${c.id}';state.subFixtureType='${c.id}';state.subKitchenType=(('${c.id}'==='KITCHEN_L')?'L':'I');state.subFixtureRotManual=false;renderSubToolbar();" class="px-2 py-1 rounded text-xs font-bold transition shrink-0 ${isAct ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-300 hover:text-white'}">${c.icon}${c.label}</button>`;
        }).join('');

        const curRot = (((state.subFixtureRot || 0) % 360) + 360) % 360;
        const isSubKL = (state.subFixtureCategory === 'KITCHEN_L') || (state.subFixtureCategory === 'KITCHEN' && state.subKitchenType === 'L');
        const snapOn = state.subFixtureWallSnap !== false;
        const orientBtns = `
            <div class="inline-flex items-center gap-0.5 bg-slate-900 border border-amber-500/40 rounded px-1 py-0.5 shrink-0">
                <span class="text-[10px] text-amber-300 font-bold mr-0.5">${isSubKL ? '基準角:' : '向き:'}</span>
                <button type="button" onclick="rotateFixturePreset(0)" class="px-1.5 py-0.5 rounded text-[10px] font-bold ${curRot === 0 ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'}">${isSubKL ? '↖北西' : '↑北背(0°)'}</button>
                <button type="button" onclick="rotateFixturePreset(90)" class="px-1.5 py-0.5 rounded text-[10px] font-bold ${curRot === 90 ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'}">${isSubKL ? '↗北東' : '→東背(90°)'}</button>
                <button type="button" onclick="rotateFixturePreset(180)" class="px-1.5 py-0.5 rounded text-[10px] font-bold ${curRot === 180 ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'}">${isSubKL ? '↘南東' : '↓南背(180°)'}</button>
                <button type="button" onclick="rotateFixturePreset(270)" class="px-1.5 py-0.5 rounded text-[10px] font-bold ${curRot === 270 ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'}">${isSubKL ? '↙南西' : '←西背(270°)'}</button>
            </div>
        `;
        const snapBtn = `
            <button type="button" onclick="toggleFixtureWallSnap()" class="px-2 py-1 rounded text-xs font-bold border transition shrink-0 ${snapOn ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200' : 'bg-slate-800 border-slate-600 text-slate-300'}" title="壁際で自動吸着するか、グリッド上の任意の位置に自由配置するかを切り替えます">
                ${snapOn ? '🧲 壁吸着:ON' : '✋ 自由配置'}
            </button>
        `;

        container.innerHTML = `
            <div class="flex items-center gap-1 overflow-x-auto py-0.5">
                <button type="button" onclick="rotateFixturePreset()" class="px-2 py-1 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-bold shrink-0"><i class="fa-solid fa-rotate-right"></i> 90°回転(${curRot}°)</button>
                ${orientBtns}
                ${snapBtn}
                ${btns}
            </div>
        `;
    } else if (tool === 'box3d') {
        container.innerHTML = `
            <span class="text-xs font-bold text-amber-400">📦 四角(3D直方体・カウンター・梁):</span>
            <span class="text-xs text-slate-300">高さ(H):</span>
            <input type="number" step="50" value="${state.subBoxHeightMm || 750}" onchange="state.subBoxHeightMm=parseInt(this.value)||750;" class="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white font-bold mono-num">
            <span class="text-xs text-slate-300">床レベル(FL+):</span>
            <input type="number" step="50" value="${state.subBoxLevelMm || 0}" onchange="state.subBoxLevelMm=parseInt(this.value)||0;" class="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-amber-300 font-bold mono-num">
            <span class="text-[11px] text-slate-400">mm（ドラッグで範囲を作成）</span>
        `;
    } else if (tool === 'room') {
        const curR = state.subRoomType || 'LDK';
        const rChips = Object.keys(ROOM_TYPES).map(k => {
            const rt = ROOM_TYPES[k];
            const isAct = curR === k;
            return `<button onclick="state.subRoomType='${k}';renderSubToolbar();" class="px-2 py-1 rounded text-xs font-bold border shrink-0 ${isAct ? 'bg-amber-500 text-slate-950 border-amber-300' : 'bg-slate-800 text-slate-300 border-slate-700'}">${rt.label}</button>`;
        }).join('');
        container.innerHTML = `<div class="flex items-center gap-1 overflow-x-auto">${rChips}</div>`;
    } else if (tool === 'eraser') {
        container.innerHTML = `
            <span class="text-xs font-bold text-rose-400"><i class="fa-solid fa-trash-can mr-1"></i>削除 / 壁部分削除モード:</span>
            <span class="text-xs text-slate-200">要素を<b>タップで丸ごと削除</b> ／ 壁の上を<b>ドラッグしてなぞるとその区間だけを部分削除（切り欠き）</b>します</span>
        `;
    } else if (tool.startsWith('memo_')) {
        renderMemoSubToolbar(container, tool);
    } else {
        container.innerHTML = `
            <span class="text-xs text-slate-200"><i class="fa-solid fa-hand-pointer text-amber-400 mr-1"></i>編集モード：図面上の壁・建具・設備・階段・部屋をタップして寸法変更や移動・反転が行えます</span>
        `;
    }
}
window.renderSubToolbar = renderSubToolbar;

function renderMemoSubToolbar(container, tool) {
    const specs = window.MEMO_SYMBOL_SPECS || { switches: [], outlets: [], lights: [], compass: [] };
    if (tool === 'memo_switch') {
        container.innerHTML = `<span class="text-xs font-bold text-amber-300">🔘 スイッチ記号:</span>` +
            specs.switches.map(s => `<button onclick="state.subSwitchCode='${s.code}';renderSubToolbar();" class="px-2 py-1 rounded text-xs font-bold border ${state.subSwitchCode === s.code ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-200 border-slate-700'}">${s.code} ${s.label}</button>`).join('');
    } else if (tool === 'memo_outlet') {
        container.innerHTML = `<span class="text-xs font-bold text-amber-300">🔌 コンセント記号:</span>` +
            specs.outlets.map(s => `<button onclick="state.subOutletCode='${s.code}';renderSubToolbar();" class="px-2 py-1 rounded text-xs font-bold border ${state.subOutletCode === s.code ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-200 border-slate-700'}">${s.code} ${s.label}</button>`).join('');
    } else if (tool === 'memo_light') {
        container.innerHTML = `<span class="text-xs font-bold text-amber-300">💡 照明・天井記号:</span>` +
            specs.lights.map(s => `<button onclick="state.subLightCode='${s.code}';renderSubToolbar();" class="px-2 py-1 rounded text-xs font-bold border ${state.subLightCode === s.code ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-200 border-slate-700'}">${s.code} ${s.label}</button>`).join('');
    } else if (tool === 'memo_compass') {
        container.innerHTML = `<span class="text-xs font-bold text-amber-300">🧭 方位マーク:</span>` +
            specs.compass.map(c => `<button onclick="state.subCompassAngle=${c.angle};renderSubToolbar();" class="px-2 py-1 rounded text-xs font-bold border ${state.subCompassAngle === c.angle ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-200 border-slate-700'}">${c.label}</button>`).join('');
    } else if (tool === 'memo_custom_sym') {
        const syms = state.customSymbols || [];
        const chips = syms.map(cs => `
            <div class="inline-flex items-center bg-slate-800 rounded border border-slate-700 overflow-hidden shrink-0">
                <button onclick="state.subStampSymbol='${cs.label}';renderSubToolbar();" class="px-2 py-1 text-xs font-bold ${state.subStampSymbol === cs.label ? 'bg-amber-500 text-slate-950' : 'text-slate-200'}">⭐ ${cs.label}</button>
                <button onclick="deleteCustomSymbol('${cs.id}')" class="px-1.5 py-1 text-[10px] text-rose-400 hover:bg-rose-950" title="削除">×</button>
            </div>
        `).join('');
        container.innerHTML = `
            <span class="text-xs font-bold text-amber-300 shrink-0">オリジナル記号:</span>
            ${chips}
            <button onclick="promptAddCustomSymbol()" class="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0">＋ 新規記号を登録</button>
        `;
    } else {
        container.innerHTML = `
            <span class="text-xs font-bold text-amber-300">📝 メモ注釈 (${tool.replace('memo_', '')}):</span>
            <span class="text-xs text-slate-200">図面上をタップまたはドラッグして記入します（選択するとオレンジ枠で移動・編集・複製が可能）</span>
        `;
    }
}

function promptAddCustomSymbol() {
    const label = prompt('登録するオリジナル記号の名称を入力してください（例：ロボ掃除機、EV充電、ガス栓、床暖リモコン）:', 'ロボ掃除機');
    if (!label || !label.trim()) return;
    const newSym = { id: 'cs_' + Date.now(), label: label.trim(), shape: 'rect' };
    state.customSymbols.push(newSym);
    state.subStampSymbol = newSym.label;
    try { localStorage.setItem('smile_madori_custom_symbols', JSON.stringify(state.customSymbols)); } catch (e) { }
    renderSubToolbar();
    showToast(`オリジナル記号「${newSym.label}」を登録しました`);
}
window.promptAddCustomSymbol = promptAddCustomSymbol;

function deleteCustomSymbol(id) {
    state.customSymbols = (state.customSymbols || []).filter(s => s.id !== id);
    try { localStorage.setItem('smile_madori_custom_symbols', JSON.stringify(state.customSymbols)); } catch (e) { }
    renderSubToolbar();
    showToast('オリジナル記号を削除しました');
}
window.deleteCustomSymbol = deleteCustomSymbol;

// --- Floating Property Inspector ---
function renderPropertyInspector() {
    const panel = document.getElementById('propertyInspector');
    if (!panel) return;
    const obj = findSelectedObject();
    if (!obj || (state.selectedItem.kind !== 'guide' && state.selectedItem.floor !== state.currentFloor)) {
        panel.classList.add('hidden');
        return;
    }
    panel.classList.remove('hidden');

    const pitch = state.modulePitch || 910;
    const kind = state.selectedItem.kind;

    if (kind === 'guide') {
        const posMm = Math.round(obj.pos * pitch);
        panel.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-700 pb-2 mb-2.5">
                <span class="text-xs font-bold text-amber-300">📏 補助線（${obj.axis === 'h' ? '水平 Y軸' : '垂直 X軸'}: ${posMm}mm）</span>
                <div class="flex items-center gap-1">
                    <button onclick="deleteSelectedItem()" class="px-2 py-1 rounded bg-rose-600/30 text-[11px] text-rose-200 font-bold">削除</button>
                    <button onclick="state.selectedItem=null;renderPropertyInspector();request2DRedraw();" class="text-slate-400 hover:text-white px-1.5"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            <div class="space-y-2 text-xs">
                <div class="text-slate-300">この補助線を基準に、数値指定（±mm）で平行な補助線を追加できます：</div>
                <div class="flex items-center gap-1.5">
                    <input type="number" id="guideOffsetInput" step="455" value="910" class="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold mono-num">
                    <span class="text-slate-400">mm</span>
                    <button onclick="addOffsetGuideFromSelected(1)" class="px-2.5 py-1 rounded bg-sky-600 text-white font-bold">＋追加</button>
                    <button onclick="addOffsetGuideFromSelected(-1)" class="px-2.5 py-1 rounded bg-sky-700 text-white font-bold">－追加</button>
                </div>
            </div>
        `;
        injectInspectorDragHandle(panel);
        return;
    }

    if (kind === 'opening') {
        const curFit = obj.doorFit || 'hikichigai';
        const curWMm = obj.widthMm || Math.round((obj.widthP || 1) * pitch);
        const curHMm = obj.heightMm || 2000;
        const curSill = obj.sillMm !== undefined ? obj.sillMm : 0;
        const sashOpts = (window.SASH_TYPES_12 || []).map(s => `<option value="${s.id}" ${s.id === curFit ? 'selected' : ''}>${s.label}</option>`).join('');
        const hostSpan = (typeof getOpeningHostWallSpan === 'function') ? getOpeningHostWallSpan(obj) : null;
        const startLabel = obj.orient === 'h' ? '壁左端から(mm)' : '壁上端から(mm)';
        const endLabel = obj.orient === 'h' ? '壁右端から(mm)' : '壁下端から(mm)';
        const distStartMm = hostSpan ? hostSpan.fromStartMm : 0;
        const distEndMm = hostSpan ? hostSpan.fromEndMm : 0;
        const hostLenMm = hostSpan ? hostSpan.wallLenMm : 0;

        panel.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-700 pb-2 mb-2.5">
                <span class="text-xs font-bold text-white">🚪 サッシ・建具の編集</span>
                <div class="flex items-center gap-1">
                    <button type="button" onclick="copySelectedOpeningForPaste()" class="px-2 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-[11px] text-emerald-200 font-bold" title="この窓・建具の仕様（種類・幅・高さ・下端）をコピーして他の壁に連続配置します"><i class="fa-solid fa-copy mr-1"></i>コピー配置</button>
                    <button type="button" onclick="deleteSelectedItem()" class="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-[11px] text-rose-200 font-bold"><i class="fa-solid fa-trash mr-1"></i>削除</button>
                    <button type="button" onclick="state.selectedItem=null;renderPropertyInspector();request2DRedraw();" class="text-slate-400 hover:text-white px-1.5"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            <div class="space-y-2 text-xs">
                <div class="flex items-center justify-between gap-2">
                    <label class="text-amber-300 font-bold shrink-0">種類(12種):</label>
                    <select onchange="updateSelectedOpeningFit12(this.value)" class="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold">${sashOpts}</select>
                </div>
                <div class="grid grid-cols-3 gap-1.5">
                    <div>
                        <label class="text-[10px] text-slate-400 block">幅 W(mm)</label>
                        <input type="number" step="10" value="${curWMm}" onchange="updateSelectedWindowSize(parseInt(this.value), null)" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white font-bold mono-num">
                    </div>
                    <div>
                        <label class="text-[10px] text-slate-400 block">高さ H(mm)</label>
                        <input type="number" step="50" value="${curHMm}" onchange="updateSelectedWindowSize(null, parseInt(this.value))" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white font-bold mono-num">
                    </div>
                    <div>
                        <label class="text-[10px] text-slate-400 block">下端 FL+(mm)</label>
                        <input type="number" step="50" value="${curSill}" onchange="updateSelectedOpeningSill(parseInt(this.value))" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-amber-300 font-bold mono-num">
                    </div>
                </div>
                <div class="flex flex-wrap gap-1 pt-0.5">
                    <button type="button" onclick="applyPresetToSelectedOpening('preset_living_win')" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] text-sky-200">居室窓(1650×1300/FL800)</button>
                    <button type="button" onclick="applyPresetToSelectedOpening('preset_sweep_win')" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] text-amber-200">掃出(1650×2000/FL0)</button>
                    <button type="button" onclick="applyPresetToSelectedOpening('preset_wet_win')" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] text-emerald-200">小窓(800×900/FL1100)</button>
                    <button type="button" onclick="applyPresetToSelectedOpening('preset_ent_910')" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] text-rose-200">玄関910(910×2200)</button>
                    <button type="button" onclick="applyPresetToSelectedOpening('preset_stair_open')" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-cyan-500/60 text-[10px] text-cyan-200">階段登りきり開口(扉なし)</button>
                </div>
                ${hostSpan ? `
                <div class="p-2 rounded-lg bg-slate-900/90 border border-slate-700/80 space-y-1.5">
                    <div class="flex items-center justify-between text-[10px] text-slate-400">
                        <span>📏 壁端からの数値配置（壁長: ${hostLenMm}mm）</span>
                        <button type="button" onclick="centerSelectedOpeningOnWall()" class="px-1.5 py-0.5 rounded bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 font-bold">壁中央に配置</button>
                    </div>
                    <div class="grid grid-cols-2 gap-1.5">
                        <div>
                            <label class="text-[10px] text-slate-400 block">${startLabel}</label>
                            <input type="number" step="10" value="${distStartMm}" onchange="setOpeningOffsetFromWallEnd('start', parseInt(this.value))" class="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-emerald-300 font-bold mono-num">
                        </div>
                        <div>
                            <label class="text-[10px] text-slate-400 block">${endLabel}</label>
                            <input type="number" step="10" value="${distEndMm}" onchange="setOpeningOffsetFromWallEnd('end', parseInt(this.value))" class="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-emerald-300 font-bold mono-num">
                        </div>
                    </div>
                </div>
                ` : ''}
                <div class="grid grid-cols-3 gap-1.5 pt-0.5">
                    <button type="button" onclick="flipSelectedOpeningAxis('x')" class="py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 border border-amber-500/40 font-bold text-[11px]" title="画面の左右方向に引き込み・吊元を反転します">
                        ↔ 左右反転
                    </button>
                    <button type="button" onclick="flipSelectedOpeningAxis('y')" class="py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 border border-amber-500/40 font-bold text-[11px]" title="画面の上下方向に開閉面・レール側を反転します">
                        ↕ 上下反転
                    </button>
                    <button type="button" onclick="flipLastOrSelectedOpening()" class="py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 border border-cyan-500/40 font-bold text-[11px]" title="上下左右の全4パターンを順送りで切り替えます">
                        🔄 4方向順送り
                    </button>
                </div>
            </div>
        `;
    } else if (kind === 'fixture') {
        const curWMm = obj.wMm || Math.round(obj.w * pitch);
        const curDMm = obj.dMm || Math.round(obj.h * pitch);
        const curHMm = obj.hMm || 850;
        const fCat = obj.category || obj.type || '';
        const isKitchen = fCat === 'KITCHEN' || fCat === 'KITCHEN_L' || fCat.startsWith('KITCHEN');
        const curKType = (obj.fxData && obj.fxData.kitchenType) ? obj.fxData.kitchenType : (fCat === 'KITCHEN_L' ? 'L' : 'I');

        panel.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-700 pb-2 mb-2.5">
                <span class="text-xs font-bold text-white">🛋️ ${obj.label || '設備・家具'}の編集</span>
                <div class="flex items-center gap-1">
                    <button onclick="duplicateSelectedFixture()" class="px-2 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-[11px] text-emerald-200 font-bold"><i class="fa-solid fa-copy mr-1"></i>複製</button>
                    <button onclick="deleteSelectedItem()" class="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-[11px] text-rose-200 font-bold"><i class="fa-solid fa-trash mr-1"></i>削除</button>
                    <button onclick="state.selectedItem=null;renderPropertyInspector();request2DRedraw();" class="text-slate-400 hover:text-white px-1.5"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            <div class="space-y-2 text-xs">
                ${isKitchen ? `
                <div class="p-2 rounded-lg bg-slate-900/90 border border-amber-500/40 space-y-1.5">
                    <div class="text-[10px] font-bold text-amber-300">🍳 キッチン形状切替 (I型 / L型 / アイランド)</div>
                    <div class="grid grid-cols-3 gap-1">
                        <button type="button" onclick="changeSelectedKitchenType('I')" class="py-1 rounded border text-[11px] font-bold ${curKType === 'I' ? 'bg-amber-500 text-slate-950 border-amber-300' : 'bg-slate-800 text-slate-300 border-slate-700'}">I型キッチン</button>
                        <button type="button" onclick="changeSelectedKitchenType('L')" class="py-1 rounded border text-[11px] font-bold ${curKType === 'L' ? 'bg-amber-500 text-slate-950 border-amber-300' : 'bg-slate-800 text-slate-300 border-slate-700'}">L型キッチン</button>
                        <button type="button" onclick="changeSelectedKitchenType('ISLAND')" class="py-1 rounded border text-[11px] font-bold ${curKType === 'ISLAND' ? 'bg-amber-500 text-slate-950 border-amber-300' : 'bg-slate-800 text-slate-300 border-slate-700'}">アイランド</button>
                    </div>
                    ${curKType === 'L' ? `
                    <div class="flex flex-wrap gap-1 pt-0.5">
                        <button type="button" onclick="updateSelectedKitchenL(2550, 1820, null)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] text-amber-200">2550×1820</button>
                        <button type="button" onclick="updateSelectedKitchenL(2400, 1650, null)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] text-amber-200">2400×1650</button>
                        <button type="button" onclick="updateSelectedKitchenL(2100, 1650, null)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] text-amber-200">2100×1650</button>
                        <button type="button" onclick="updateSelectedKitchenL(1820, 1820, null)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] text-amber-200">1820×1820</button>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
                <div class="p-2 rounded-lg bg-slate-900/90 border border-cyan-500/30 space-y-1">
                    <div class="text-[10px] font-bold text-cyan-300">📐 向き・配置基準 (赤い●印の位置・90°回転でW×D自動切替)</div>
                    <div class="grid grid-cols-4 gap-1">
                        <button type="button" onclick="setSelectedFixtureRotation(0)" class="py-1 rounded border text-[10px] font-bold ${(((obj.rot || 0) % 360 + 360) % 360 === 0) ? 'bg-cyan-500 text-slate-950 border-cyan-300' : 'bg-slate-800 text-slate-300 border-slate-700'}">${curKType === 'L' ? '↖北西(0°)' : '↑北背(0°)'}</button>
                        <button type="button" onclick="setSelectedFixtureRotation(90)" class="py-1 rounded border text-[10px] font-bold ${(((obj.rot || 0) % 360 + 360) % 360 === 90) ? 'bg-cyan-500 text-slate-950 border-cyan-300' : 'bg-slate-800 text-slate-300 border-slate-700'}">${curKType === 'L' ? '↗北東(90°)' : '→東背(90°)'}</button>
                        <button type="button" onclick="setSelectedFixtureRotation(180)" class="py-1 rounded border text-[10px] font-bold ${(((obj.rot || 0) % 360 + 360) % 360 === 180) ? 'bg-cyan-500 text-slate-950 border-cyan-300' : 'bg-slate-800 text-slate-300 border-slate-700'}">${curKType === 'L' ? '↘南東(180°)' : '↓南背(180°)'}</button>
                        <button type="button" onclick="setSelectedFixtureRotation(270)" class="py-1 rounded border text-[10px] font-bold ${(((obj.rot || 0) % 360 + 360) % 360 === 270) ? 'bg-cyan-500 text-slate-950 border-cyan-300' : 'bg-slate-800 text-slate-300 border-slate-700'}">${curKType === 'L' ? '↙南西(270°)' : '←西背(270°)'}</button>
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-1.5">
                    <div>
                        <label class="text-[10px] text-slate-400 block">${curKType === 'L' ? '横幅 W(mm)' : '横幅 W(X方向mm)'}</label>
                        <input type="number" step="50" value="${curWMm}" onchange="updateSelectedFixtureDims(parseInt(this.value), null, null)" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white font-bold mono-num">
                    </div>
                    <div>
                        <label class="text-[10px] text-slate-400 block">${curKType === 'L' ? '縦幅 D(mm)' : '縦奥行 D(Y方向mm)'}</label>
                        <input type="number" step="50" value="${curDMm}" onchange="updateSelectedFixtureDims(null, parseInt(this.value), null)" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white font-bold mono-num">
                    </div>
                    <div>
                        <label class="text-[10px] text-slate-400 block">高さ H(mm)</label>
                        <input type="number" step="50" value="${curHMm}" onchange="updateSelectedFixtureDims(null, null, parseInt(this.value))" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white font-bold mono-num">
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-1.5 pt-1">
                    <button type="button" onclick="rotateSelectedFixture()" class="py-1.5 rounded bg-cyan-600/25 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-500/40 font-bold text-[11px]">🔄 90°回転</button>
                    <button type="button" onclick="flipSelectedFixture('x')" class="py-1.5 rounded border font-bold text-[11px] ${obj.flipX ? 'bg-amber-500 text-slate-950 border-amber-300 shadow' : 'bg-amber-600/25 hover:bg-amber-600/40 text-amber-200 border-amber-500/40'}">↔ 左右反転${obj.flipX ? '(ON)' : ''}</button>
                    <button type="button" onclick="flipSelectedFixture('y')" class="py-1.5 rounded border font-bold text-[11px] ${obj.flipY ? 'bg-amber-500 text-slate-950 border-amber-300 shadow' : 'bg-amber-600/25 hover:bg-amber-600/40 text-amber-200 border-amber-500/40'}">↕ 上下反転${obj.flipY ? '(ON)' : ''}</button>
                </div>
            </div>
        `;
    } else if (kind === 'box3d') {
        const curWMm = obj.wMm || Math.round(obj.w * pitch);
        const curDMm = obj.dMm || Math.round(obj.h * pitch);
        const curHMm = obj.hMm || 750;
        const curLvMm = obj.levelMm || 0;

        panel.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-700 pb-2 mb-2.5">
                <span class="text-xs font-bold text-amber-300">📦 四角（3D直方体・カウンター）設定</span>
                <div class="flex items-center gap-1">
                    <button onclick="deleteSelectedItem()" class="px-2 py-1 rounded bg-rose-600/30 text-[11px] text-rose-200 font-bold">削除</button>
                    <button onclick="state.selectedItem=null;renderPropertyInspector();request2DRedraw();" class="text-slate-400 hover:text-white px-1.5"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                    <label class="text-[10px] text-slate-400 block">幅 W(mm)</label>
                    <input type="number" step="50" value="${curWMm}" onchange="updateSelectedBox3D(parseInt(this.value), null, null, null)" class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold mono-num">
                </div>
                <div>
                    <label class="text-[10px] text-slate-400 block">奥行 D(mm)</label>
                    <input type="number" step="50" value="${curDMm}" onchange="updateSelectedBox3D(null, parseInt(this.value), null, null)" class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold mono-num">
                </div>
                <div>
                    <label class="text-[10px] text-slate-400 block">高さ・厚み H(mm)</label>
                    <input type="number" step="50" value="${curHMm}" onchange="updateSelectedBox3D(null, null, parseInt(this.value), null)" class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-emerald-300 font-bold mono-num">
                </div>
                <div>
                    <label class="text-[10px] text-slate-400 block">床からのレベル FL+(mm)</label>
                    <input type="number" step="50" value="${curLvMm}" onchange="updateSelectedBox3D(null, null, null, parseInt(this.value))" class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-300 font-bold mono-num">
                </div>
            </div>
        `;
    } else if (kind === 'stair') {
        const curType = obj.shapeType || 'STRAIGHT';
        const curPattern = obj.patternKey || (curType === 'U_SHAPE' ? 'U_6TURN' : (curType === 'L_SHAPE' ? (obj.landingTop ? 'L_LANDING_TOP' : 'L_STANDARD') : 'STRAIGHT'));
        const curDir = obj.direction || 'UP';
        const curStyle = obj.stairStyle || 'box';
        const curRail = obj.stairHandrail || obj.handrail || 'both';
        const curWidth = obj.widthMm || 910;
        const cfg = (typeof window.getStairModularConfig === 'function')
            ? window.getStairModularConfig(obj)
            : { i1Steps: obj.steps || 13, c1Steps: 0, c1Dir: 'right', i2Steps: 0, c2Steps: 0, c2Dir: 'right', i3Steps: 0, totalSteps: obj.steps || 13 };

        const stepOptions = (maxN, selectedVal, zeroLabel) => {
            let html = '';
            for (let n = 0; n <= maxN; n++) {
                const lbl = (n === 0 && zeroLabel) ? zeroLabel : `${n}段`;
                html += `<option value="${n}" ${selectedVal === n ? 'selected' : ''}>${lbl}</option>`;
            }
            return html;
        };

        panel.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                <span class="text-xs font-bold text-amber-300"><i class="fa-solid fa-stairs mr-1.5"></i>階段の仕様・I部/踊り場段数・向き編集</span>
                <div class="flex items-center gap-1">
                    <span class="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold">計${cfg.totalSteps}段</span>
                    <button type="button" onclick="deleteSelectedItem()" class="px-2 py-1 rounded bg-rose-600/30 text-[11px] text-rose-200 font-bold hover:bg-rose-600/50"><i class="fa-solid fa-trash mr-1"></i>削除</button>
                    <button type="button" onclick="state.selectedItem=null;renderPropertyInspector();request2DRedraw();" class="text-slate-400 hover:text-white px-1.5"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            <div class="space-y-2 text-xs">
                <div>
                    <label class="text-[10px] text-amber-300 block font-bold mb-0.5">定型形状プリセット (ワンタップ切替)</label>
                    <select onchange="updateSelectedStairShape(this.value)" class="w-full bg-slate-900 border border-amber-500/50 rounded px-2 py-1 text-white font-bold text-xs">
                        <option value="U_6TURN" ${curPattern === 'U_6TURN' ? 'selected' : ''}>① コの字 6段廻り (I1:4 + 廻3 + 廻3 + I3:3)</option>
                        <option value="STRAIGHT" ${curPattern === 'STRAIGHT' ? 'selected' : ''}>② 直階段 I型 (13段)</option>
                        <option value="L_TOP_TURN" ${curPattern === 'L_TOP_TURN' ? 'selected' : ''}>③ 上部廻りL型 (I1:10 + 上3段廻り登りきり)</option>
                        <option value="CRANK_BOTH_TURN" ${curPattern === 'CRANK_BOTH_TURN' ? 'selected' : ''}>④ 上下両端廻り (下3段廻り + I2:7 + 上3段廻り)</option>
                        <option value="L_PLUS_TOP_TURN" ${curPattern === 'L_PLUS_TOP_TURN' ? 'selected' : ''}>⑤ L型＋上部廻り (I1:4 + 廻3 + I2:4 + 上3段廻り)</option>
                        <option value="L_LANDING_TOP" ${curPattern === 'L_LANDING_TOP' ? 'selected' : ''}>⑥ 1段踊り場登りきり (I1:5 + 1段踊り場[両側/右/左])</option>
                        <option value="L_STANDARD" ${curPattern === 'L_STANDARD' ? 'selected' : ''}>⑦ 標準かね折れL型 (I1:5 + 3段廻り + I2:5)</option>
                        <option value="U_LANDING" ${curPattern === 'U_LANDING' ? 'selected' : ''}>⑧ 大踊り場コの字 (I1:6 + 踊1 + 踊1 + I3:6)</option>
                    </select>
                </div>

                <!-- I部分と踊り場の個別段数・向き構成パネル -->
                <div class="bg-slate-950/80 border border-slate-700/80 rounded-xl p-2 space-y-1.5">
                    <div class="text-[10px] font-bold text-cyan-300 flex items-center justify-between">
                        <span>📐 I部分・踊り場の段数＆向き構成</span>
                        <span class="text-amber-300">I1 → C1 → I2 → C2 → I3</span>
                    </div>
                    <div class="grid grid-cols-12 gap-1 items-center">
                        <span class="col-span-4 text-[10px] text-slate-300 font-bold">① 始端直進 I1</span>
                        <select onchange="updateSelectedStairSpec('i1Steps', parseInt(this.value,10))" class="col-span-8 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-cyan-300 font-bold text-[11px]">
                            ${stepOptions(16, cfg.i1Steps, '0段 (C1から開始)')}
                        </select>
                    </div>
                    <div class="grid grid-cols-12 gap-1 items-center">
                        <span class="col-span-4 text-[10px] text-amber-300 font-bold">② 第1踊り場 C1</span>
                        <select onchange="updateSelectedStairSpec('c1Steps', parseInt(this.value,10))" class="col-span-4 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-amber-300 font-bold text-[11px]">
                            <option value="0" ${cfg.c1Steps === 0 ? 'selected' : ''}>なし(0)</option>
                            <option value="1" ${cfg.c1Steps === 1 ? 'selected' : ''}>1段(踊り場)</option>
                            <option value="2" ${cfg.c1Steps === 2 ? 'selected' : ''}>2段廻り</option>
                            <option value="3" ${cfg.c1Steps === 3 ? 'selected' : ''}>3段廻り</option>
                            <option value="4" ${cfg.c1Steps === 4 ? 'selected' : ''}>4段廻り</option>
                        </select>
                        <select onchange="updateSelectedStairSpec('c1Dir', this.value)" class="col-span-4 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-emerald-300 font-bold text-[11px]" title="第1踊り場の折れ向き・登りきり向き">
                            <option value="right" ${cfg.c1Dir === 'right' ? 'selected' : ''}>右折 ↱</option>
                            <option value="left" ${cfg.c1Dir === 'left' ? 'selected' : ''}>左折 ↰</option>
                            <option value="both" ${cfg.c1Dir === 'both' ? 'selected' : ''}>両側 ⇔</option>
                            <option value="straight" ${cfg.c1Dir === 'straight' ? 'selected' : ''}>直進 ↑</option>
                        </select>
                    </div>
                    <div class="grid grid-cols-12 gap-1 items-center">
                        <span class="col-span-4 text-[10px] text-slate-300 font-bold">③ 中間直進 I2</span>
                        <select onchange="updateSelectedStairSpec('i2Steps', parseInt(this.value,10))" class="col-span-8 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-cyan-300 font-bold text-[11px]">
                            ${stepOptions(16, cfg.i2Steps, '0段 (C1登りきり / C2直結)')}
                        </select>
                    </div>
                    <div class="grid grid-cols-12 gap-1 items-center">
                        <span class="col-span-4 text-[10px] text-amber-300 font-bold">④ 第2踊り場 C2</span>
                        <select onchange="updateSelectedStairSpec('c2Steps', parseInt(this.value,10))" class="col-span-4 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-amber-300 font-bold text-[11px]">
                            <option value="0" ${cfg.c2Steps === 0 ? 'selected' : ''}>なし(0)</option>
                            <option value="1" ${cfg.c2Steps === 1 ? 'selected' : ''}>1段(踊り場)</option>
                            <option value="2" ${cfg.c2Steps === 2 ? 'selected' : ''}>2段廻り</option>
                            <option value="3" ${cfg.c2Steps === 3 ? 'selected' : ''}>3段廻り</option>
                            <option value="4" ${cfg.c2Steps === 4 ? 'selected' : ''}>4段廻り</option>
                        </select>
                        <select onchange="updateSelectedStairSpec('c2Dir', this.value)" class="col-span-4 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-emerald-300 font-bold text-[11px]" title="第2踊り場の折れ向き・登りきり向き">
                            <option value="right" ${cfg.c2Dir === 'right' ? 'selected' : ''}>右折 ↱</option>
                            <option value="left" ${cfg.c2Dir === 'left' ? 'selected' : ''}>左折 ↰</option>
                            <option value="both" ${cfg.c2Dir === 'both' ? 'selected' : ''}>両側 ⇔</option>
                            <option value="straight" ${cfg.c2Dir === 'straight' ? 'selected' : ''}>直進 ↑</option>
                        </select>
                    </div>
                    <div class="grid grid-cols-12 gap-1 items-center">
                        <span class="col-span-4 text-[10px] text-slate-300 font-bold">⑤ 終端直進 I3</span>
                        <select onchange="updateSelectedStairSpec('i3Steps', parseInt(this.value,10))" class="col-span-8 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-cyan-300 font-bold text-[11px]">
                            ${stepOptions(16, cfg.i3Steps, '0段 (C2で登りきり)')}
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-[10px] text-slate-400 block font-bold">昇降方向</label>
                        <select onchange="updateSelectedStairDir(this.value)" class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-300 font-bold">
                            <option value="UP" ${curDir === 'UP' ? 'selected' : ''}>⬆ 上る (UP)</option>
                            <option value="DOWN" ${curDir === 'DOWN' ? 'selected' : ''}>⬇ 降りる (DN)</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] text-slate-400 block font-bold">階段幅</label>
                        <select onchange="updateSelectedStairSpec('widthMm', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-bold">
                            <option value="910" ${curWidth === 910 ? 'selected' : ''}>910 mm (標準)</option>
                            <option value="1000" ${curWidth === 1000 ? 'selected' : ''}>1000 mm (広幅)</option>
                            <option value="780" ${curWidth === 780 ? 'selected' : ''}>780 mm (コンパクト)</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] text-slate-400 block font-bold">階段構造仕様</label>
                        <select onchange="updateSelectedStairSpec('stairStyle', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-emerald-300 font-bold">
                            <option value="box" ${curStyle === 'box' ? 'selected' : ''}>ボックス階段</option>
                            <option value="open" ${curStyle === 'open' ? 'selected' : ''}>オープン階段</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] text-slate-400 block font-bold">手すり・壁二重線</label>
                        <select onchange="updateSelectedStairSpec('handrail', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sky-300 font-bold">
                            <option value="both" ${curRail === 'both' ? 'selected' : ''}>両方あり</option>
                            <option value="left" ${curRail === 'left' ? 'selected' : ''}>左のみ</option>
                            <option value="right" ${curRail === 'right' ? 'selected' : ''}>右のみ</option>
                            <option value="none" ${curRail === 'none' ? 'selected' : ''}>なし</option>
                        </select>
                    </div>
                </div>

                <!-- 平面不出力 / 立面不出力 設定＆下階連動ステータス -->
                <div class="p-2 rounded-xl bg-slate-900/95 border border-slate-700/80 space-y-1.5">
                    <div class="flex items-center justify-between text-[10px]">
                        <span class="font-bold text-amber-300"><i class="fa-solid fa-eye-slash mr-1"></i>出力制御（平面不出力 / 立面不出力）</span>
                        ${obj.linkedFromFloor !== undefined ? `<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">${obj.linkedFromFloor === 0 ? '地下' : obj.linkedFromFloor + '階'}から自動複写</span>` : `<span class="text-slate-400">${curDir === 'UP' ? '上の階へ自動表示中' : '単階表示'}</span>`}
                    </div>
                    <div class="grid grid-cols-2 gap-1.5">
                        <button type="button" onclick="updateSelectedStairSpec('no2DOutput', ${!obj.no2DOutput})"
                            class="py-1.5 px-2 rounded-lg border font-bold text-[11px] flex items-center justify-center gap-1 transition ${obj.no2DOutput ? 'bg-rose-600/35 text-rose-200 border-rose-400 shadow' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'}">
                            <i class="fa-solid ${obj.no2DOutput ? 'fa-square-check' : 'fa-square'}"></i>
                            <span>平面不出力 ${obj.no2DOutput ? 'ON' : 'OFF'}</span>
                        </button>
                        <button type="button" onclick="updateSelectedStairSpec('no3DOutput', ${!obj.no3DOutput})"
                            class="py-1.5 px-2 rounded-lg border font-bold text-[11px] flex items-center justify-center gap-1 transition ${obj.no3DOutput ? 'bg-amber-500/30 text-amber-200 border-amber-400 shadow' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'}">
                            <i class="fa-solid ${obj.no3DOutput ? 'fa-square-check' : 'fa-square'}"></i>
                            <span>立面不出力 ${obj.no3DOutput ? 'ON' : 'OFF'}</span>
                        </button>
                    </div>
                </div>

                <button type="button" onclick="rotateSelectedStair()" class="w-full py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition">
                    <i class="fa-solid fa-rotate-right"></i>
                    <span>階段全体の向きを90°回転 (${obj.rotation || 0}°)</span>
                </button>
            </div>
        `;
    } else if (kind === 'memo') {
        panel.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                <span class="text-xs font-bold text-amber-300">📝 メモ注釈の編集・複製</span>
                <div class="flex items-center gap-1">
                    <button onclick="duplicateSelectedMemo()" class="px-2 py-1 rounded bg-emerald-600/30 text-[11px] text-emerald-200 font-bold">複製</button>
                    <button onclick="deleteSelectedItem()" class="px-2 py-1 rounded bg-rose-600/30 text-[11px] text-rose-200 font-bold">削除</button>
                    <button onclick="state.selectedItem=null;renderPropertyInspector();request2DRedraw();" class="text-slate-400 hover:text-white px-1.5"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            <div class="space-y-2 text-xs">
                ${obj.text !== undefined ? `
                    <div class="flex items-center gap-1.5">
                        <input type="text" value="${obj.text}" onchange="objMemoUpdateText(this.value)" class="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold">
                    </div>
                ` : ''}
                <div class="flex items-center justify-between gap-2">
                    <span class="text-slate-400">線種:</span>
                    <button onclick="objMemoUpdateDash('solid')" class="px-2 py-1 rounded border text-[11px] ${(obj.dash || 'solid') === 'solid' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 border-slate-700'}">実線</button>
                    <button onclick="objMemoUpdateDash('dashed')" class="px-2 py-1 rounded border text-[11px] ${obj.dash === 'dashed' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 border-slate-700'}">点線</button>
                    <button onclick="objMemoUpdateDash('dashdot')" class="px-2 py-1 rounded border text-[11px] ${obj.dash === 'dashdot' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 border-slate-700'}">一点鎖線</button>
                </div>
            </div>
        `;
    } else if (kind === 'room') {
        const pitchM = pitch / 1000;
        const wMm = Math.round(obj.w * pitch);
        const hMm = Math.round(obj.h * pitch);
        const areaM2 = (typeof getRoomAreaM2 === 'function')
            ? getRoomAreaM2(obj)
            : (typeof obj.areaM2 === 'number' && obj.areaM2 > 0 ? obj.areaM2 : (obj.w * pitchM) * (obj.h * pitchM));
        const jyo = (areaM2 / (pitchM * pitchM * 2)).toFixed(1);
        const curName = obj.customName || obj.name || '';
        const safeName = curName.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const rt = ROOM_TYPES[obj.type] || ROOM_TYPES.OTHER || ROOM_TYPES.LDK;
        const isExcluded = (typeof isFloorAreaExcludedRoom === 'function') ? isFloorAreaExcludedRoom(obj) : false;
        let rmOptions = Object.keys(ROOM_TYPES).map(k => `<option value="${k}" ${obj.type === k ? 'selected' : ''}>${ROOM_TYPES[k].label}</option>`).join('');

        const quickChips = [
            { label: 'LDK', type: 'LDK' },
            { label: 'リビング', type: 'LIVING' },
            { label: 'ダイニング', type: 'DINING' },
            { label: 'キッチン', type: 'KITCHEN_RM' },
            { label: '和室', type: 'WASHITSU' },
            { label: '洋室', type: 'YOSHITSU' },
            { label: '主寝室', type: 'YOSHITSU' },
            { label: '子供室', type: 'YOSHITSU' },
            { label: '書斎', type: 'YOSHITSU' },
            { label: '玄関', type: 'GENKAN' },
            { label: '玄関土間', type: 'DOMA' },
            { label: 'ホール', type: 'ROUKA' },
            { label: '廊下', type: 'ROUKA' },
            { label: '階段室', type: 'STAIR' },
            { label: '階段', type: 'STAIR' },
            { label: '洗面室', type: 'SENMEN' },
            { label: '脱衣室', type: 'DATSUI' },
            { label: '浴室', type: 'UB' },
            { label: 'トイレ', type: 'TOILET' },
            { label: 'クローゼット', type: 'CLOSET' },
            { label: '収納', type: 'SHUNO' },
            { label: '階段上収納', type: 'SHUNO', levelMm: 1000 },
            { label: 'WIC', type: 'WIC' },
            { label: 'パントリー', type: 'STORAGE' },
            { label: '納戸', type: 'STORAGE' },
            { label: '吹抜', type: 'VOID' },
            { label: 'バルコニー', type: 'BALCONY' },
            { label: '中庭', type: 'NAKANIWA' }
        ];
        const chipHtml = quickChips.map(c => {
            const active = curName === c.label ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600';
            const lvlArg = c.levelMm !== undefined ? `, ${c.levelMm}` : '';
            return `<button type="button" onclick="applyRoomNameChip('${c.label}', '${c.type}'${lvlArg})" class="px-1.5 py-0.5 rounded border text-[10px] ${active}">${c.label}</button>`;
        }).join('');

        const curLevelMm = (typeof obj.levelMm === 'number' && !isNaN(obj.levelMm)) ? obj.levelMm : (obj.type === 'KOAGARI' ? 300 : 0);

        panel.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                <span class="text-xs font-bold text-white"><i class="fa-solid fa-vector-square text-amber-400 mr-1"></i>${safeName || rt.label} (${jyo}帖 / ${areaM2.toFixed(1)}㎡${curLevelMm > 0 ? ` / FL+${curLevelMm}mm` : ''})</span>
                <div class="flex items-center gap-1">
                    <button onclick="deleteSelectedItem()" class="px-2 py-1 rounded bg-rose-600/30 text-[11px] text-rose-200 font-bold">削除</button>
                    <button onclick="state.selectedItem=null;renderPropertyInspector();request2DRedraw();" class="text-slate-400 hover:text-white px-1.5"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            <div class="space-y-2 text-xs">
                <div>
                    <label class="block text-[10px] text-slate-400 mb-1">部屋名（自由入力）</label>
                    <div class="flex items-center gap-1.5">
                        <input id="inpRoomCustomName" type="text" value="${safeName}" placeholder="例: 階段上収納、洗面室、書斎..." oninput="updateSelectedRoomName(this.value, false)" onchange="updateSelectedRoomName(this.value, true)" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold">
                        <button type="button" onclick="renameSelectedRoom()" title="定型名を順送り" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 text-[11px]">順送り</button>
                    </div>
                </div>
                <div>
                    <div class="text-[10px] text-slate-400 mb-1">よく使う部屋名</div>
                    <div class="flex flex-wrap gap-1">${chipHtml}</div>
                </div>
                <div class="flex items-center justify-between gap-2 pt-1">
                    <span class="text-[10px] text-slate-400 shrink-0">種別:</span>
                    <select onchange="changeSelectedRoomType(this.value)" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold">${rmOptions}</select>
                </div>
                <div class="p-2 rounded-lg bg-amber-950/25 border border-amber-500/40 space-y-1.5">
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-[10px] font-bold text-amber-300">🪜 床高さ・階段上収納設定 (FL+mm):</span>
                        <input type="number" step="50" min="0" max="1800" value="${curLevelMm}" onchange="updateSelectedRoomLevelMm(parseInt(this.value, 10))" class="w-24 bg-slate-950 border border-amber-500/50 rounded px-2 py-0.5 text-amber-200 font-bold mono-num text-right">
                    </div>
                    <div class="flex flex-wrap gap-1">
                        <button type="button" onclick="updateSelectedRoomLevelMm(0)" class="px-1.5 py-0.5 rounded border text-[10px] ${curLevelMm === 0 ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'}">標準床(FL+0)</button>
                        <button type="button" onclick="updateSelectedRoomLevelMm(300)" class="px-1.5 py-0.5 rounded border text-[10px] ${curLevelMm === 300 ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'}">小上り(+300)</button>
                        <button type="button" onclick="updateSelectedRoomLevelMm(700)" class="px-1.5 py-0.5 rounded border text-[10px] ${curLevelMm === 700 ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'}">階段上(+700)</button>
                        <button type="button" onclick="updateSelectedRoomLevelMm(1000)" class="px-1.5 py-0.5 rounded border text-[10px] ${curLevelMm === 1000 ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-amber-200 border-amber-500/50'}">階段上収納(+1000/1m)</button>
                        <button type="button" onclick="updateSelectedRoomLevelMm(1200)" class="px-1.5 py-0.5 rounded border text-[10px] ${curLevelMm === 1200 ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'}">階段上(+1200)</button>
                    </div>
                    <div class="text-[9px] text-slate-300 leading-tight">※2(3)階の階段1〜4段目上に床高1m程度(+1000mm)で収納を配すと、下階階段の頭上高さを確保したまま階段を隠して収納を配置できます。</div>
                </div>
                <div class="flex items-center justify-between gap-2 pt-0.5">
                    <span class="text-[10px] text-slate-400">延床面積の計算:</span>
                    <button type="button" onclick="toggleSelectedRoomFloorArea()" class="px-2 py-1 rounded border text-[11px] font-bold ${isExcluded ? 'bg-slate-800 text-amber-300 border-amber-500/50' : 'bg-emerald-600/25 text-emerald-300 border-emerald-500/50'}">${isExcluded ? '除外中（クリックで算入に戻す）' : '算入中（クリックで除外）'}</button>
                </div>
                <div class="p-2 rounded-lg bg-slate-900/90 border border-slate-700/80 space-y-1.5">
                    <div class="text-[10px] font-bold text-amber-300">📐 部屋の辺寸法を直接数値指定（隣接壁も自動追随）</div>
                    <div class="grid grid-cols-2 gap-1.5">
                        <div>
                            <label class="text-[10px] text-slate-400 block">横幅 W(mm)</label>
                            <input type="number" step="455" value="${wMm}" onchange="updateSelectedRoomDimensionsMm(parseInt(this.value), null)" class="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-white font-bold mono-num">
                        </div>
                        <div>
                            <label class="text-[10px] text-slate-400 block">奥行 D(mm)</label>
                            <input type="number" step="455" value="${hMm}" onchange="updateSelectedRoomDimensionsMm(null, parseInt(this.value))" class="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-white font-bold mono-num">
                        </div>
                    </div>
                </div>
                <div class="text-[11px] text-slate-400 mono-num">外接寸法: ${wMm}mm × ${hMm}mm / 実面積: ${areaM2.toFixed(2)}㎡</div>
            </div>
        `;
    } else if (kind === 'wall') {
        const lenMm = Math.round(Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1) * pitch);
        const curType = obj.wallType || 'wall';
        const isHoriz = Math.abs(obj.y1 - obj.y2) < 0.05;
        const isVert = Math.abs(obj.x1 - obj.x2) < 0.05;
        const dirHint = isHoriz ? '上下（Y方向）へ平行移動' : (isVert ? '左右（X方向）へ平行移動' : '平行移動');
        const wallOpts = (window.WALL_SUBTYPES || []).map(w => `<option value="${w.id}" ${w.id === curType ? 'selected' : ''}>${w.label}</option>`).join('');

        let heightUiHtml = '';
        if (curType === 'koshikabe') {
            const curH = obj.heightMm || 1000;
            heightUiHtml = `
                <div class="space-y-1 bg-amber-950/20 p-2 rounded border border-amber-500/30">
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-amber-300 font-bold">腰壁高さ(mm):</span>
                        <input type="number" step="50" min="400" max="1800" value="${curH}" onchange="updateSelectedWallHeightMm(parseInt(this.value))" class="w-24 bg-slate-900 border border-amber-500/50 rounded px-2 py-1 text-white font-bold mono-num">
                    </div>
                    <div class="flex items-center gap-1 justify-end pt-0.5">
                        <button type="button" onclick="updateSelectedWallHeightMm(800)" class="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 ${curH===800?'border border-amber-400 text-amber-300 font-bold':''}">800</button>
                        <button type="button" onclick="updateSelectedWallHeightMm(900)" class="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 ${curH===900?'border border-amber-400 text-amber-300 font-bold':''}">900</button>
                        <button type="button" onclick="updateSelectedWallHeightMm(1000)" class="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 ${curH===1000?'border border-amber-400 text-amber-300 font-bold':''}">1000(標準)</button>
                        <button type="button" onclick="updateSelectedWallHeightMm(1100)" class="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 ${curH===1100?'border border-amber-400 text-amber-300 font-bold':''}">1100</button>
                        <button type="button" onclick="updateSelectedWallHeightMm(1200)" class="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 ${curH===1200?'border border-amber-400 text-amber-300 font-bold':''}">1200</button>
                    </div>
                </div>
            `;
        } else if (curType === 'tarekabe') {
            const curDrop = obj.heightMm || 550;
            heightUiHtml = `
                <div class="space-y-1 bg-sky-950/20 p-2 rounded border border-sky-500/30">
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-sky-300 font-bold">たれ下がり寸法(mm):</span>
                        <input type="number" step="50" min="200" max="1500" value="${curDrop}" onchange="updateSelectedWallHeightMm(parseInt(this.value))" class="w-24 bg-slate-900 border border-sky-500/50 rounded px-2 py-1 text-white font-bold mono-num">
                    </div>
                    <div class="flex items-center gap-1 justify-end pt-0.5">
                        <button type="button" onclick="updateSelectedWallHeightMm(300)" class="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 ${curDrop===300?'border border-sky-400 text-sky-300 font-bold':''}">300</button>
                        <button type="button" onclick="updateSelectedWallHeightMm(450)" class="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 ${curDrop===450?'border border-sky-400 text-sky-300 font-bold':''}">450</button>
                        <button type="button" onclick="updateSelectedWallHeightMm(550)" class="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 ${curDrop===550?'border border-sky-400 text-sky-300 font-bold':''}">550(標準)</button>
                        <button type="button" onclick="updateSelectedWallHeightMm(600)" class="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 ${curDrop===600?'border border-sky-400 text-sky-300 font-bold':''}">600</button>
                    </div>
                </div>
            `;
        } else if (curType === 'wall') {
            const curH = obj.heightMm || 2450;
            heightUiHtml = `
                <div class="space-y-1 bg-slate-800/50 p-2 rounded border border-slate-700">
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-slate-300 font-bold">壁高さ(mm):</span>
                        <input type="number" step="50" min="1500" max="4000" value="${curH}" onchange="updateSelectedWallHeightMm(parseInt(this.value))" class="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold mono-num">
                    </div>
                    <div class="flex items-center gap-1 justify-end pt-0.5">
                        <button type="button" onclick="updateSelectedWallHeightMm(2400)" class="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 ${curH===2400?'border border-amber-400 text-amber-300 font-bold':''}">2400</button>
                        <button type="button" onclick="updateSelectedWallHeightMm(2450)" class="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 ${curH===2450?'border border-amber-400 text-amber-300 font-bold':''}">2450(標準)</button>
                        <button type="button" onclick="updateSelectedWallHeightMm(2500)" class="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 ${curH===2500?'border border-amber-400 text-amber-300 font-bold':''}">2500</button>
                        <button type="button" onclick="updateSelectedWallHeightMm(2700)" class="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 ${curH===2700?'border border-amber-400 text-amber-300 font-bold':''}">2700(高天井)</button>
                    </div>
                </div>
            `;
        }

        panel.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                <span class="text-xs font-bold text-white"><i class="fa-solid fa-grip-lines text-amber-400 mr-1"></i>壁線分 (${lenMm}mm)</span>
                <div class="flex items-center gap-1">
                    <button onclick="deleteSelectedItem()" class="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-[11px] text-rose-200 font-bold">削除</button>
                    <button onclick="state.selectedItem=null;renderPropertyInspector();request2DRedraw();" class="text-slate-400 hover:text-white px-1.5"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            <div class="space-y-2 text-xs">
                <div class="flex items-center justify-between gap-2">
                    <span class="text-slate-400 font-bold">壁種別:</span>
                    <select onchange="changeSelectedWallType(this.value)" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold">${wallOpts}</select>
                </div>
                ${heightUiHtml}
                <div class="flex items-center justify-between gap-2">
                    <span class="text-slate-400">長さ(mm):</span>
                    <input type="number" step="10" value="${lenMm}" onchange="updateSelectedWallLengthMm(parseInt(this.value))" class="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold mono-num">
                </div>
                <div class="p-2 rounded-lg bg-slate-900/90 border border-slate-700/80 space-y-1.5">
                    <div class="text-[10px] font-bold text-amber-300">↔ 壁の平行移動（接続壁・窓も自動追随 / 矢印キー対応）</div>
                    <div class="grid grid-cols-4 gap-1">
                        <button type="button" onclick="nudgeSelectedWallByMm(-910)" class="py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] font-bold text-sky-300">-910</button>
                        <button type="button" onclick="nudgeSelectedWallByMm(-455)" class="py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] font-bold text-sky-200">-455</button>
                        <button type="button" onclick="nudgeSelectedWallByMm(455)" class="py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] font-bold text-amber-200">+455</button>
                        <button type="button" onclick="nudgeSelectedWallByMm(910)" class="py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] font-bold text-amber-300">+910</button>
                    </div>
                    <div class="flex items-center gap-1 pt-0.5">
                        <input type="number" id="inpWallOffsetMm" step="10" value="455" class="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-bold mono-num" placeholder="移動量mm">
                        <button type="button" onclick="nudgeSelectedWallByMm(-Math.abs(parseInt(document.getElementById('inpWallOffsetMm')?.value||455)))" class="px-2 py-1 rounded bg-sky-700 hover:bg-sky-600 text-white font-bold text-[10px]">${isHoriz ? '↑上へ' : '←左へ'}</button>
                        <button type="button" onclick="nudgeSelectedWallByMm(Math.abs(parseInt(document.getElementById('inpWallOffsetMm')?.value||455)))" class="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold text-[10px]">${isHoriz ? '↓下へ' : '→右へ'}</button>
                    </div>
                    <div class="text-[9px] text-slate-400">${dirHint}（キャンバス上で壁をドラッグしても移動できます）</div>
                </div>
            </div>
        `;
    } else if (kind === 'pillar') {
        const curSize = obj.sizeMm || 150;
        const curShape = obj.shape || 'square';
        panel.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                <span class="text-xs font-bold text-white">独立柱 (${curShape === 'round' ? 'φ' : ''}${curSize}mm)</span>
                <button onclick="deleteSelectedItem()" class="px-2 py-1 rounded bg-rose-600/30 text-[11px] text-rose-200 font-bold">削除</button>
            </div>
            <div class="grid grid-cols-2 gap-1.5 text-xs">
                <button onclick="changeSelectedPillarSpec(105, 'square')" class="px-2 py-1 rounded border border-slate-700 bg-slate-800 text-slate-200">105角</button>
                <button onclick="changeSelectedPillarSpec(120, 'square')" class="px-2 py-1 rounded border border-slate-700 bg-slate-800 text-slate-200">120角</button>
                <button onclick="changeSelectedPillarSpec(150, 'square')" class="px-2 py-1 rounded border border-slate-700 bg-slate-800 text-slate-200">150角</button>
                <button onclick="changeSelectedPillarSpec(150, 'round')" class="px-2 py-1 rounded border border-slate-700 bg-slate-800 text-slate-200">丸柱(φ150)</button>
            </div>
        `;
    }

    // ドラッグハンドルバーを先頭に注入し、リスナーと位置を適用
    injectInspectorDragHandle(panel);
}
window.renderPropertyInspector = renderPropertyInspector;

// =========================================================================
// PROPERTY INSPECTOR DRAGGABLE & KEYBOARD AVOIDANCE (for iPad & Mobile/PC)
// =========================================================================
let inspectorCustomPos = null; // { left: number, top: number, isTop: boolean, isCustom: boolean }
let isDraggingInspector = false;
let dragStartPointer = { x: 0, y: 0 };
let dragStartPos = { left: 0, top: 0 };

function getInspectorHeaderHtml() {
    const isTop = inspectorCustomPos ? inspectorCustomPos.isTop : false;
    return `
        <div id="inspectorDragHandle" class="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-700/80 cursor-grab active:cursor-grabbing select-none text-[11px] text-slate-300" style="touch-action: none;">
            <div class="flex items-center gap-1.5 font-bold text-amber-400">
                <i class="fa-solid fa-grip-vertical text-amber-400"></i>
                <span class="text-slate-200">ドラッグで移動</span>
            </div>
            <div class="flex items-center gap-1">
                <button type="button" onclick="toggleInspectorPosition()" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white text-[10px] font-bold flex items-center gap-1 border border-slate-700 shadow-sm" title="画面の上部／下部へワンタップ移動">
                    <i class="fa-solid fa-arrows-up-down"></i> <span id="lblInspectorPos">${isTop ? '下部へ' : '上部へ'}</span>
                </button>
                <button type="button" onclick="resetInspectorPosition()" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] border border-slate-700 shadow-sm" title="初期位置にリセット">
                    <i class="fa-solid fa-rotate-left"></i>
                </button>
                <button type="button" onclick="showKeyboardHintModal()" class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[10px] font-bold border border-amber-500/40 shadow-sm flex items-center gap-1" title="iPadキーボード操作のヒント">
                    <i class="fa-regular fa-keyboard"></i> <span>ヒント</span>
                </button>
            </div>
        </div>
    `;
}

function applyInspectorPosition(panel) {
    if (!panel) return;
    if (inspectorCustomPos && inspectorCustomPos.isCustom) {
        panel.style.bottom = 'auto';
        panel.style.top = `${inspectorCustomPos.top}px`;
        panel.style.left = `${inspectorCustomPos.left}px`;
    } else {
        panel.style.bottom = '';
        panel.style.top = '';
        panel.style.left = '';
    }
}

function toggleInspectorPosition() {
    const panel = document.getElementById('propertyInspector');
    if (!panel) return;
    const isTop = inspectorCustomPos ? inspectorCustomPos.isTop : false;
    const parent = panel.offsetParent || document.body;
    const parentRect = parent.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    
    const curLeft = inspectorCustomPos && inspectorCustomPos.isCustom ? inspectorCustomPos.left : (panel.offsetLeft || 162);
    
    if (!isTop) {
        // Move to Top
        const targetTop = 16;
        inspectorCustomPos = {
            left: Math.max(10, Math.min(curLeft, parentRect.width - panelRect.width - 10)),
            top: targetTop,
            isTop: true,
            isCustom: true
        };
    } else {
        // Move to Bottom
        const targetTop = Math.max(16, parentRect.height - panelRect.height - 48);
        inspectorCustomPos = {
            left: Math.max(10, Math.min(curLeft, parentRect.width - panelRect.width - 10)),
            top: targetTop,
            isTop: false,
            isCustom: true
        };
    }
    applyInspectorPosition(panel);
    const lbl = document.getElementById('lblInspectorPos');
    if (lbl) lbl.textContent = inspectorCustomPos.isTop ? '下部へ' : '上部へ';
}
window.toggleInspectorPosition = toggleInspectorPosition;

function resetInspectorPosition() {
    const panel = document.getElementById('propertyInspector');
    inspectorCustomPos = null;
    if (panel) {
        panel.style.bottom = '';
        panel.style.top = '';
        panel.style.left = '';
        const lbl = document.getElementById('lblInspectorPos');
        if (lbl) lbl.textContent = '上部へ';
    }
}
window.resetInspectorPosition = resetInspectorPosition;

function liftInspectorAboveKeyboard() {
    const panel = document.getElementById('propertyInspector');
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const vh = window.innerHeight;
    // パネルの下端が画面下半分（キーボード領域: 55%以降）にあれば自動で上部へリフトアップ
    if (rect.bottom > vh * 0.55) {
        const parent = panel.offsetParent || document.body;
        const parentRect = parent.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        const curLeft = inspectorCustomPos && inspectorCustomPos.isCustom ? inspectorCustomPos.left : (panel.offsetLeft || 162);
        inspectorCustomPos = {
            left: Math.max(10, Math.min(curLeft, parentRect.width - panelRect.width - 10)),
            top: 16,
            isTop: true,
            isCustom: true
        };
        applyInspectorPosition(panel);
        const lbl = document.getElementById('lblInspectorPos');
        if (lbl) lbl.textContent = '下部へ';
    }
}
window.liftInspectorAboveKeyboard = liftInspectorAboveKeyboard;

function showKeyboardHintModal() {
    const modal = document.getElementById('keyboardHintModal');
    if (modal) modal.classList.remove('hidden');
}
window.showKeyboardHintModal = showKeyboardHintModal;

function closeKeyboardHintModal() {
    const modal = document.getElementById('keyboardHintModal');
    if (modal) modal.classList.add('hidden');
}
window.closeKeyboardHintModal = closeKeyboardHintModal;

function initInspectorDraggable(panel) {
    if (!panel || panel.__draggableInited) return;
    panel.__draggableInited = true;

    // input, select, textarea にフォーカスが入った際のキーボード回避
    panel.addEventListener('focusin', (e) => {
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
            liftInspectorAboveKeyboard();
        }
    });

    const onPointerDown = (e) => {
        const handle = e.target.closest('#inspectorDragHandle');
        if (!handle) return;
        // ボタン類をクリックした場合はドラッグ開始しない
        if (e.target.closest('button')) return;

        e.preventDefault();
        e.stopPropagation();

        isDraggingInspector = true;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        dragStartPointer = { x: clientX, y: clientY };

        const parent = panel.offsetParent || document.body;
        const curLeft = panel.offsetLeft;
        const curTop = panel.offsetTop;
        dragStartPos = { left: curLeft, top: curTop };

        panel.style.bottom = 'auto';
        panel.style.top = `${curTop}px`;
        panel.style.left = `${curLeft}px`;
        panel.style.transition = 'none';

        const onPointerMove = (ev) => {
            if (!isDraggingInspector) return;
            ev.preventDefault();
            ev.stopPropagation();

            const moveX = ev.touches ? ev.touches[0].clientX : ev.clientX;
            const moveY = ev.touches ? ev.touches[0].clientY : ev.clientY;
            const dx = moveX - dragStartPointer.x;
            const dy = moveY - dragStartPointer.y;

            const parentRect = parent.getBoundingClientRect();
            const panelRect = panel.getBoundingClientRect();
            const parentWidth = parentRect.width;
            const parentHeight = parentRect.height;

            const newLeft = Math.max(8, Math.min(dragStartPos.left + dx, parentWidth - panelRect.width - 8));
            const newTop = Math.max(8, Math.min(dragStartPos.top + dy, parentHeight - panelRect.height - 8));

            panel.style.left = `${newLeft}px`;
            panel.style.top = `${newTop}px`;

            inspectorCustomPos = {
                left: newLeft,
                top: newTop,
                isTop: newTop < parentHeight * 0.4,
                isCustom: true
            };
            const lbl = document.getElementById('lblInspectorPos');
            if (lbl) lbl.textContent = inspectorCustomPos.isTop ? '下部へ' : '上部へ';
        };

        const onPointerUp = (ev) => {
            isDraggingInspector = false;
            panel.style.transition = '';
            window.removeEventListener('mousemove', onPointerMove);
            window.removeEventListener('mouseup', onPointerUp);
            window.removeEventListener('touchmove', onPointerMove);
            window.removeEventListener('touchend', onPointerUp);
            window.removeEventListener('touchcancel', onPointerUp);
        };

        window.addEventListener('mousemove', onPointerMove, { passive: false });
        window.addEventListener('mouseup', onPointerUp);
        window.addEventListener('touchmove', onPointerMove, { passive: false });
        window.addEventListener('touchend', onPointerUp);
        window.addEventListener('touchcancel', onPointerUp);
    };

    panel.addEventListener('mousedown', onPointerDown);
    panel.addEventListener('touchstart', onPointerDown, { passive: false });
}

function injectInspectorDragHandle(panel) {
    if (!panel) return;
    panel.insertAdjacentHTML('afterbegin', getInspectorHeaderHtml());
    initInspectorDraggable(panel);
    applyInspectorPosition(panel);
}


function changeSelectedWallType(newWallType) {
    const obj = findSelectedObject();
    if (!obj || !state.selectedItem || state.selectedItem.kind !== 'wall') return;
    obj.wallType = newWallType;
    // 壁種別を切り替えた際は、新しい種別の標準高さを必ず再初期化
    if (newWallType === 'koshikabe') obj.heightMm = 1000;
    else if (newWallType === 'tarekabe') obj.heightMm = 550;
    else if (newWallType === 'wall') obj.heightMm = 2450;
    else if (newWallType === 'agarikamachi') obj.heightMm = 180;
    saveHistorySnapshot();
    if (typeof updateAllMetricsAnd3D === 'function') updateAllMetricsAnd3D();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    showToast('壁種別を変更しました');
}
window.changeSelectedWallType = changeSelectedWallType;

function updateSelectedWallHeightMm(heightMm) {
    const obj = findSelectedObject();
    if (!obj || !state.selectedItem || state.selectedItem.kind !== 'wall') return;
    if (isNaN(heightMm) || heightMm <= 0) return;
    obj.heightMm = heightMm;
    saveHistorySnapshot();
    if (typeof updateAllMetricsAnd3D === 'function') updateAllMetricsAnd3D();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    showToast(`高さを${heightMm}mmに設定しました`);
}
window.updateSelectedWallHeightMm = updateSelectedWallHeightMm;

// --- Inspector Update Helpers ---
function updateSelectedOpeningFit12(fitId) {
    const obj = findSelectedObject();
    if (!obj || state.selectedItem.kind !== 'opening') return;
    obj.doorFit = fitId;
    obj.sashType = fitId;
    const spec = (window.SASH_TYPES_12 || []).find(s => s.id === fitId);
    if (spec) {
        obj.isWin = spec.isWinDefault;
        obj.category = spec.isWinDefault ? 'window' : 'door';
        obj.leafCount = spec.leaves;
    }
    const fl = state.floors[state.currentFloor];
    if (typeof window.applyEntranceOpeningAttributes === 'function') {
        window.applyEntranceOpeningAttributes(obj, fl, false);
    }
    saveHistorySnapshot();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    showToast(`建具種類を「${obj.isGenkan ? obj.label : (spec ? spec.label : fitId)}」に変更しました`);
}
window.updateSelectedOpeningFit12 = updateSelectedOpeningFit12;

function flipSelectedFixture(axis) {
    const obj = findSelectedObject();
    if (!obj || state.selectedItem.kind !== 'fixture') return;
    if (axis === 'x') obj.flipX = !obj.flipX;
    else obj.flipY = !obj.flipY;
    saveHistorySnapshot();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    showToast(`設備を${axis === 'x' ? '左右' : '上下'}反転しました`);
}
window.flipSelectedFixture = flipSelectedFixture;

function duplicateSelectedFixture() {
    const obj = findSelectedObject();
    if (!obj || state.selectedItem.kind !== 'fixture') return;
    const fl = state.floors[state.currentFloor];
    const copy = JSON.parse(JSON.stringify(obj));
    copy.id = uid();
    copy.x = +(obj.x + 0.5).toFixed(2);
    copy.y = +(obj.y + 0.5).toFixed(2);
    fl.fixtures.push(copy);
    state.selectedItem = { kind: 'fixture', id: copy.id, floor: state.currentFloor };
    saveHistorySnapshot();
    showToast('設備を複製しました');
}
window.duplicateSelectedFixture = duplicateSelectedFixture;

function updateSelectedFixtureDims(wMm, dMm, hMm) {
    const obj = findSelectedObject();
    if (!obj || state.selectedItem.kind !== 'fixture') return;
    const pitch = state.modulePitch || 910;
    if (wMm) {
        obj.wMm = wMm;
        obj.w = +(wMm / pitch).toFixed(3);
        if (obj.fxData && obj.fxData.kitchenType === 'L') obj.fxData.lWidthX = wMm;
    }
    if (dMm) {
        obj.dMm = dMm;
        obj.h = +(dMm / pitch).toFixed(3);
        if (obj.fxData && obj.fxData.kitchenType === 'L') obj.fxData.lWidthY = dMm;
    }
    if (hMm) { obj.hMm = hMm; }
    if (obj.type === 'KITCHEN_L' || obj.category === 'KITCHEN_L' || (obj.fxData && obj.fxData.kitchenType === 'L')) {
        obj.label = `L型キッチン (${Math.round((obj.wMm || 2550) / 10)}×${Math.round((obj.dMm || 1820) / 10)}cm)`;
    }
    saveHistorySnapshot();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
}
window.updateSelectedFixtureDims = updateSelectedFixtureDims;

function updateSelectedBox3D(wMm, dMm, hMm, lvMm) {
    const obj = findSelectedObject();
    if (!obj || state.selectedItem.kind !== 'box3d') return;
    const pitch = state.modulePitch || 910;
    if (wMm !== null) { obj.wMm = wMm; obj.w = +(wMm / pitch).toFixed(3); }
    if (dMm !== null) { obj.dMm = dMm; obj.h = +(dMm / pitch).toFixed(3); }
    if (hMm !== null) obj.hMm = hMm;
    if (lvMm !== null) obj.levelMm = lvMm;
    saveHistorySnapshot();
}
window.updateSelectedBox3D = updateSelectedBox3D;

function updateSelectedStairSpec(prop, val) {
    const obj = findSelectedObject();
    if (!obj || !state.selectedItem || state.selectedItem.kind !== 'stair') return;

    const ensureModularInitialized = () => {
        if (obj.i1Steps === undefined && typeof window.getStairModularConfig === 'function') {
            const cfg = window.getStairModularConfig(obj);
            obj.i1Steps = cfg.i1Steps;
            obj.c1Steps = cfg.c1Steps;
            obj.c1Dir = cfg.c1Dir;
            obj.i2Steps = cfg.i2Steps;
            obj.c2Steps = cfg.c2Steps;
            obj.c2Dir = cfg.c2Dir;
            obj.i3Steps = cfg.i3Steps;
        }
        obj.isModular = true;
    };

    if (prop === 'widthMm') {
        const wMm = parseInt(val, 10) || 910;
        obj.widthMm = wMm;
        if (obj.isModular && typeof window.syncStairModularBounds === 'function') {
            window.syncStairModularBounds(obj);
        }
    } else if (prop === 'i1Steps' || prop === 'c1Steps' || prop === 'i2Steps' || prop === 'c2Steps' || prop === 'i3Steps') {
        ensureModularInitialized();
        obj[prop] = Math.max(0, parseInt(val, 10) || 0);
        if (obj.c1Steps > 0) {
            obj.turnType = obj.c1Steps === 1 ? 'landing' : (obj.c1Steps === 2 ? 'turn_2' : (obj.c1Steps === 4 ? 'turn_4' : 'turn_3'));
        }
        obj.landingTop = (obj.c1Steps > 0 && obj.i2Steps === 0 && obj.c2Steps === 0 && obj.i3Steps === 0);
        if (obj.c1Steps === 0 && obj.c2Steps === 0) obj.shapeType = 'STRAIGHT';
        else if (obj.c2Steps > 0 && obj.c1Dir === obj.c2Dir) obj.shapeType = 'U_SHAPE';
        else obj.shapeType = 'L_SHAPE';
        if (typeof window.syncStairModularBounds === 'function') {
            window.syncStairModularBounds(obj);
        }
    } else if (prop === 'c1Dir' || prop === 'c2Dir') {
        ensureModularInitialized();
        obj[prop] = val;
        if (obj.c1Steps === 0 && obj.c2Steps === 0) obj.shapeType = 'STRAIGHT';
        else if (obj.c2Steps > 0 && obj.c1Dir === obj.c2Dir) obj.shapeType = 'U_SHAPE';
        else obj.shapeType = 'L_SHAPE';
        if (typeof window.syncStairModularBounds === 'function') {
            window.syncStairModularBounds(obj);
        }
    } else if (prop === 'turnType') {
        obj.turnType = val;
        const tSteps = (typeof window.stairTurnStepsFromSpec === 'function') ? window.stairTurnStepsFromSpec(val) : 3;
        if (obj.isModular || obj.c1Steps !== undefined) {
            if (obj.c1Steps > 0) obj.c1Steps = tSteps;
            if (obj.c2Steps > 0) obj.c2Steps = tSteps;
            if (typeof window.syncStairModularBounds === 'function') {
                const keepSteps = obj.steps;
                window.syncStairModularBounds(obj);
                if (obj.landingTop) obj.steps = keepSteps;
            }
        }
    } else if (prop === 'landingTop') {
        obj.landingTop = !!val;
        if (obj.landingTop && (!obj.steps || obj.steps >= 13)) obj.steps = 5;
        if (obj.isModular || obj.i1Steps !== undefined) {
            if (obj.landingTop) {
                obj.i1Steps = obj.steps || 5;
                if (!obj.c1Steps) obj.c1Steps = 1;
                obj.i2Steps = 0; obj.c2Steps = 0; obj.i3Steps = 0;
            }
            if (typeof window.syncStairModularBounds === 'function') {
                const keepSteps = obj.steps;
                window.syncStairModularBounds(obj);
                if (obj.landingTop) obj.steps = keepSteps;
            }
        }
    } else if (prop === 'steps') {
        const sVal = parseInt(val, 10) || 14;
        obj.steps = sVal;
        if (obj.isModular || obj.i1Steps !== undefined) {
            if (obj.landingTop || (!obj.i2Steps && !obj.c2Steps && !obj.i3Steps)) {
                obj.i1Steps = sVal;
            }
            if (typeof window.syncStairModularBounds === 'function') {
                window.syncStairModularBounds(obj);
                obj.steps = sVal;
            }
        }
    } else if (prop === 'stairStyle') {
        obj.stairStyle = val;
    } else if (prop === 'handrail') {
        obj.stairHandrail = val;
        obj.handrail = val;
    } else if (prop === 'no2DOutput' || prop === 'no3DOutput') {
        obj[prop] = !!val;
    } else {
        obj[prop] = val;
    }
    if (prop !== 'no2DOutput' && prop !== 'no3DOutput') {
        if (obj.linkedFromStairId && typeof window.syncLinkedStairBackToSource === 'function') {
            window.syncLinkedStairBackToSource(obj);
        }
        if (typeof window.syncUpperFloorStairs === 'function') window.syncUpperFloorStairs();
    }
    saveHistorySnapshot();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    showToast('階段仕様を更新しました');
}
window.updateSelectedStairSpec = updateSelectedStairSpec;

function setStairDrawMode(mode) {
    state.stairDrawMode = mode;
    state.stairDrawingPoints = [];
    state.stairTempCurPoint = null;
    if (typeof renderSubToolbar === 'function') renderSubToolbar();
    request2DRedraw();
    showToast(mode === 'free' ? '階段：一辺ずつ描くモード（図面上をタップして角を指定）' : '階段：定型ポン置きモード');
}
window.setStairDrawMode = setStairDrawMode;

function cancelStairDrawing() {
    state.stairDrawingPoints = [];
    state.stairTempCurPoint = null;
    if (typeof renderSubToolbar === 'function') renderSubToolbar();
    request2DRedraw();
    showToast('階段の頂点指定をリセットしました');
}
window.cancelStairDrawing = cancelStairDrawing;

function objMemoUpdateText(val) {
    const obj = findSelectedObject();
    if (!obj) return;
    obj.text = val;
    saveHistorySnapshot();
}
window.objMemoUpdateText = objMemoUpdateText;

function objMemoUpdateDash(dashVal) {
    const obj = findSelectedObject();
    if (!obj) return;
    obj.dash = dashVal;
    saveHistorySnapshot();
}
window.objMemoUpdateDash = objMemoUpdateDash;

function duplicateSelectedMemo() {
    const obj = findSelectedObject();
    if (!obj || state.selectedItem.kind !== 'memo') return;
    const fl = state.floors[state.currentFloor];
    const copy = JSON.parse(JSON.stringify(obj));
    copy.id = uid();
    if (copy.x !== undefined) { copy.x += 0.5; copy.y += 0.5; }
    if (copy.x1 !== undefined) { copy.x1 += 0.5; copy.y1 += 0.5; copy.x2 += 0.5; copy.y2 += 0.5; }
    fl.memos.push(copy);
    state.selectedItem = { kind: 'memo', id: copy.id, floor: state.currentFloor };
    saveHistorySnapshot();
    showToast('メモ注釈を複製しました');
}
window.duplicateSelectedMemo = duplicateSelectedMemo;

function addOffsetGuideFromSelected(sign) {
    const obj = findSelectedObject();
    if (!obj || state.selectedItem.kind !== 'guide') return;
    const input = document.getElementById('guideOffsetInput');
    const offsetMm = parseInt(input ? input.value : 910, 10) || 910;
    const pitch = state.modulePitch || 910;
    const newPos = +(obj.pos + (sign * offsetMm) / pitch).toFixed(3);
    const newGuide = { id: uid(), axis: obj.axis, pos: newPos };
    state.guides.push(newGuide);
    state.selectedItem = { kind: 'guide', id: newGuide.id, floor: state.currentFloor };
    saveHistorySnapshot();
    showToast(`${sign > 0 ? '+' : '-'}${offsetMm}mm の位置に平行補助線を追加しました`);
}
window.addOffsetGuideFromSelected = addOffsetGuideFromSelected;

// --- 階層切替（地下〜4階）＆ 目アイコン（👁️ 下絵透過）制御 ---
function setFloor(fl) {
    if (typeof window.syncUpperFloorStairs === 'function') window.syncUpperFloorStairs();
    state.currentFloor = fl;
    state.selectedItem = null;
    [0, 1, 2, 3, 4].forEach(n => {
        const tab = document.getElementById('btnFloor' + n) || document.getElementById('floorTab_' + n);
        const eyeBtn = document.getElementById('eyeFloor' + n);
        if (tab) {
            if (n === fl) {
                tab.className = 'px-2.5 py-1 text-xs font-extrabold bg-amber-500 text-slate-950 shadow transition';
            } else {
                tab.className = 'px-2.5 py-1 text-xs font-bold bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition';
            }
        }
        if (eyeBtn) {
            const isVis = state.floorVisibility && state.floorVisibility[n];
            eyeBtn.className = n === fl
                ? 'px-1 py-1 text-[11px] bg-amber-500/80 text-slate-950'
                : (isVis ? 'px-1 py-1 text-[11px] bg-zinc-700 text-amber-300' : 'px-1 py-1 text-[11px] bg-zinc-700 text-zinc-400 hover:text-white');
        }
    });
    updateAllMetricsAnd3D();
    renderPropertyInspector();
    if (typeof window.notifyLiveShareStateChanged === 'function') {
        window.notifyLiveShareStateChanged('floor');
    }
    const flName = fl === 0 ? '地下' : `${fl}階`;
    showToast(`${flName} の作図画面に切り替えました`);
}
window.setFloor = setFloor;
window.switchFloor = setFloor;

function toggleFloorEye(fl, ev) {
    if (ev) ev.stopPropagation();
    if (!state.floorVisibility) state.floorVisibility = { 0: false, 1: true, 2: false, 3: false, 4: false };
    state.floorVisibility[fl] = !state.floorVisibility[fl];
    const eyeBtn = document.getElementById('eyeFloor' + fl);
    const eyeIcon = (eyeBtn && eyeBtn.querySelector('i')) || document.getElementById('floorEye_' + fl);
    if (eyeIcon) {
        eyeIcon.className = state.floorVisibility[fl] ? 'fa-solid fa-eye text-[11px] opacity-100' : 'fa-solid fa-eye-slash text-[11px] opacity-40';
    }
    if (eyeBtn) {
        eyeBtn.className = fl === state.currentFloor
            ? 'px-1 py-1 text-[11px] bg-amber-500/80 text-slate-950'
            : (state.floorVisibility[fl] ? 'px-1 py-1 text-[11px] bg-zinc-700 text-amber-300' : 'px-1 py-1 text-[11px] bg-zinc-700 text-zinc-400 hover:text-white');
    }
    request2DRedraw();
    const flName = fl === 0 ? '地下' : `${fl}階`;
    showToast(`${flName} の下絵透過表示を ${state.floorVisibility[fl] ? 'ON' : 'OFF'} にしました`);
}
window.toggleFloorEye = toggleFloorEye;

function toggleOnionSkin() {
    state.onionSkin = !state.onionSkin;
    request2DRedraw();
}
window.toggleOnionSkin = toggleOnionSkin;

function setModulePitch(mm) {
    state.modulePitch = mm;
    const b910 = document.getElementById('btnMod910');
    const b1000 = document.getElementById('btnMod1000');
    if (b910) b910.className = mm === 910 ? 'px-2 py-1 rounded bg-amber-500 text-slate-950 font-black text-xs' : 'px-2 py-1 rounded text-slate-300 hover:text-white text-xs';
    if (b1000) b1000.className = mm === 1000 ? 'px-2 py-1 rounded bg-amber-500 text-slate-950 font-black text-xs' : 'px-2 py-1 rounded text-slate-300 hover:text-white text-xs';
    const pb = document.getElementById('pitchBadge');
    if (pb) pb.textContent = `P=${mm}`;
    updateAllMetricsAnd3D();
    renderPropertyInspector();
    showToast(`建築モジュールを 1P = ${mm}mm に変更しました`);
}
window.setModulePitch = setModulePitch;

function updateSnapSelectLabels() {
    [1, 2, 3, 4, 5, 6].forEach(d => {
        const btn = document.getElementById('btnGridDiv' + d) || document.getElementById('btnGridDiv_' + d);
        if (btn) {
            btn.title = `${d}分割 (スナップ単位: ${(state.modulePitch / d).toFixed(1)}mm)`;
        }
    });
}
window.updateSnapSelectLabels = updateSnapSelectLabels;

function setGridDivision(divVal) {
    state.gridDivisions = parseInt(divVal, 10) || 2;
    [1, 2, 3, 4, 5, 6].forEach(d => {
        const btn = document.getElementById('btnGridDiv' + d) || document.getElementById('btnGridDiv_' + d);
        if (btn) {
            if (d === state.gridDivisions) {
                btn.className = 'w-6 h-6 rounded text-xs font-extrabold bg-amber-500 text-slate-950 shadow transition';
            } else {
                btn.className = 'w-6 h-6 rounded text-xs font-bold bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition';
            }
        }
    });
    const mm = (state.modulePitch / state.gridDivisions).toFixed(0);
    const stTxt = document.getElementById('pointerStatusText');
    if (stTxt) stTxt.textContent = `${state.gridDivisions}分割グリッド (${mm}mm)`;
    request2DRedraw();
    showToast(`グリッド分割数を「${state.gridDivisions}」（約${mm}mm単位）に変更しました`);
}
window.setGridDivision = setGridDivision;

function toggleRulerMode() {
    state.rulerMode = !state.rulerMode;
    const btn = document.getElementById('btnRulerMode');
    if (btn) {
        btn.className = state.rulerMode
            ? 'px-2.5 py-1.5 rounded bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1 shadow'
            : 'px-2.5 py-1.5 rounded bg-neutral-700 hover:bg-neutral-600 text-slate-200 font-bold text-xs flex items-center gap-1';
    }
    request2DRedraw();
    showToast(state.rulerMode ? '📏 ものさしモードON：上辺・左辺のオレンジ帯をタップ/ドラッグして補助線を引けます' : 'ものさしモードを終了しました');
}
window.toggleRulerMode = toggleRulerMode;

function toggleGuidesLock() {
    state.guidesLocked = !state.guidesLocked;
    const btn = document.getElementById('btnGuidesLock');
    if (btn) {
        btn.className = state.guidesLocked
            ? 'px-2 py-1 rounded bg-amber-500 text-slate-950 font-black text-[11px] flex items-center gap-1 shadow'
            : 'px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-slate-300 font-bold text-[11px] flex items-center gap-1';
    }
    request2DRedraw();
    showToast(state.guidesLocked ? '🔒 補助線をロックしました（誤移動・誤削除を防止）' : '🔓 補助線のロックを解除しました');
}
window.toggleGuidesLock = toggleGuidesLock;

function toggleDiagonalWallMode() {
    state.diagonalWallMode = !state.diagonalWallMode;
    renderSubToolbar();
    request2DRedraw();
    showToast(state.diagonalWallMode ? '📐 斜め壁モードON：自由な角度（45°スナップ対応）で壁を描画できます' : '┼ 直交壁モード：水平・垂直方向に自動スナップします');
}
window.toggleDiagonalWallMode = toggleDiagonalWallMode;

function toggleDesignerMode() {
    state.designerMode = !state.designerMode;
    const btn = document.getElementById('btnDesignerMode');
    if (btn) {
        btn.className = state.designerMode
            ? 'px-2 py-1 rounded bg-amber-500 text-slate-950 font-extrabold text-xs border border-amber-300 shadow flex items-center gap-1 transition'
            : 'px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-bold text-xs border border-zinc-600 flex items-center gap-1 transition';
    }
    request2DRedraw();
    showToast(state.designerMode
        ? '📐 設計者モードON：通り芯（X1,X2…/Y1,Y2…）・上下階壁揃い照合・部屋別面積一覧表を常時表示します'
        : '設計者モードをOFFにしました');
}
window.toggleDesignerMode = toggleDesignerMode;

function applyOpeningQuickPreset(presetId) {
    const pr = (window.OPENING_QUICK_PRESETS || []).find(p => p.id === presetId);
    if (!pr) return;
    state.subOpeningFit = pr.fit;
    state.subDoorFit = pr.fit;
    state.subOpeningCategory = pr.category;
    state.subWindowWidth = pr.wMm;
    state.subWindowHeight = pr.hMm;
    state.subWindowSillMm = pr.sillMm;
    state.subDoorLeafCount = pr.leaves || 1;
    state.subDoorLeafWidth = Math.round(pr.wMm / (pr.leaves || 1));
    state.subDoorHeight = pr.hMm;
    state.copiedOpeningSpec = null;

    // 左パレットのボタンハイライトも連動更新
    document.querySelectorAll('.tool-btn, .palette-tool-btn').forEach(btn => {
        btn.classList.remove('active', 'active-orange');
    });
    const revMap = { katabiki: 'hikido', katahiraki: 'katabiraki', ryouhiraki: 'ryobiraki' };
    const activeBtn = document.getElementById('tool_sash_' + (revMap[pr.fit] || pr.fit)) || document.getElementById('tool_sash_' + pr.fit);
    if (activeBtn) activeBtn.classList.add('active');

    renderSubToolbar();
    request2DRedraw();
    showToast(`⚡ プリセット「${pr.label}」を選択しました（壁をタップして連続配置できます）`);
}
window.applyOpeningQuickPreset = applyOpeningQuickPreset;

function applyPresetToSelectedOpening(presetId) {
    const pr = (window.OPENING_QUICK_PRESETS || []).find(p => p.id === presetId);
    const obj = findSelectedObject();
    if (!pr || !obj || !state.selectedItem || state.selectedItem.kind !== 'opening') return;
    const pitch = state.modulePitch || 910;
    const nextWidthP = +(pr.wMm / pitch).toFixed(3);
    if (typeof checkOpeningOverlap === 'function' && checkOpeningOverlap(state.currentFloor, obj.x, obj.y, obj.orient, nextWidthP, obj.id)) {
        showToast('隣接する建具・窓と重なるため幅を変更できません', true);
        return;
    }
    obj.doorFit = pr.fit;
    obj.sashType = pr.fit;
    obj.category = pr.category;
    obj.isWin = (pr.category === 'window');
    obj.widthMm = pr.wMm;
    obj.widthP = nextWidthP;
    obj.heightMm = pr.hMm;
    obj.sillMm = pr.sillMm;
    obj.leafCount = pr.leaves || 1;
    obj.leafWidthMm = Math.round(pr.wMm / obj.leafCount);
    obj.label = `${pr.label}`;
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    renderPropertyInspector();
    request2DRedraw();
    showToast(`選択中の開口部に「${pr.label}」を適用しました`);
}
window.applyPresetToSelectedOpening = applyPresetToSelectedOpening;

function copySelectedOpeningForPaste() {
    const obj = findSelectedObject();
    if (!obj || !state.selectedItem || state.selectedItem.kind !== 'opening') return;
    const sashSpec = (window.SASH_TYPES_12 || []).find(s => s.id === obj.doorFit);
    const typeName = sashSpec ? sashSpec.label : (obj.isWin ? '窓' : '建具');
    state.copiedOpeningSpec = {
        doorFit: obj.doorFit || 'hikichigai',
        sashType: obj.sashType || obj.doorFit || 'hikichigai',
        category: obj.category || (obj.isWin ? 'window' : 'door'),
        isWin: !!obj.isWin,
        widthMm: obj.widthMm || 1650,
        heightMm: obj.heightMm || 1300,
        sillMm: obj.sillMm !== undefined ? obj.sillMm : 0,
        leafCount: obj.leafCount || 1,
        leafWidthMm: obj.leafWidthMm || obj.widthMm || 800,
        flip: !!obj.flip,
        flipX: !!obj.flipX,
        label: `${typeName} W${obj.widthMm}×H${obj.heightMm}(FL+${obj.sillMm || 0})`
    };
    state.activeTool = 'opening';
    state.subOpeningFit = state.copiedOpeningSpec.doorFit;
    state.subWindowWidth = state.copiedOpeningSpec.widthMm;
    state.subWindowHeight = state.copiedOpeningSpec.heightMm;
    state.subWindowSillMm = state.copiedOpeningSpec.sillMm;
    renderSubToolbar();
    request2DRedraw();
    showToast(`📋「${state.copiedOpeningSpec.label}」をコピーしました！配置したい壁を順番にタップしてください`);
}
window.copySelectedOpeningForPaste = copySelectedOpeningForPaste;

function clearCopiedOpeningSpec() {
    state.copiedOpeningSpec = null;
    renderSubToolbar();
    showToast('コピー連続配置モードを解除しました');
}
window.clearCopiedOpeningSpec = clearCopiedOpeningSpec;

function expandGridBound(dir) {
    if (!state.gridBounds) state.gridBounds = { minX: -2, maxX: 12, minY: -2, maxY: 12 };
    if (dir === 'top') state.gridBounds.minY -= 4;
    else if (dir === 'bottom') state.gridBounds.maxY += 4;
    else if (dir === 'left') state.gridBounds.minX -= 4;
    else if (dir === 'right') state.gridBounds.maxX += 4;
    else if (dir === 'reset') state.gridBounds = { minX: -2, maxX: 12, minY: -2, maxY: 12 };
    else {
        state.gridBounds.minX -= 2;
        state.gridBounds.maxX += 2;
        state.gridBounds.minY -= 2;
        state.gridBounds.maxY += 2;
    }
    request2DRedraw();
    showToast('📐 用紙（グリッド）範囲を拡張しました');
}
window.expandGridBound = expandGridBound;
window.openPaperExpandModal = function () {
    expandGridBound('all');
};

function setViewMode(mode) {
    state.viewMode = mode;
    const p2d = document.getElementById('pane2d');
    const p3d = document.getElementById('pane3d');
    const b2d = document.getElementById('viewBtn2D');
    const bSp = document.getElementById('viewBtnSplit');
    const b3d = document.getElementById('viewBtn3D');

    [b2d, bSp, b3d].forEach(b => {
        if (b) b.className = 'px-2.5 py-1 rounded text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1 transition';
    });

    if (mode === '2d') {
        if (b2d) b2d.className = 'px-2.5 py-1 rounded text-xs font-black bg-amber-500 text-slate-950 shadow flex items-center gap-1 transition';
        p2d.className = 'w-full h-full relative bg-white overflow-hidden';
        if (state.birdEyePopupOpen) {
            p3d.className = 'absolute bottom-3 right-3 w-[440px] h-[330px] max-w-[90vw] max-h-[55vh] z-30 rounded-xl shadow-2xl border-2 border-slate-400 bg-sky-100 overflow-hidden';
        } else {
            p3d.className = 'hidden';
        }
    } else if (mode === 'split') {
        state.birdEyePopupOpen = false;
        if (bSp) bSp.className = 'px-2.5 py-1 rounded text-xs font-black bg-amber-500 text-slate-950 shadow flex items-center gap-1 transition';
        p2d.className = 'w-1/2 h-full relative bg-white border-r border-slate-300 overflow-hidden';
        p3d.className = 'w-1/2 h-full relative bg-gradient-to-b from-sky-100 via-slate-100 to-slate-200 overflow-hidden';
    } else {
        state.birdEyePopupOpen = false;
        if (b3d) b3d.className = 'px-2.5 py-1 rounded text-xs font-black bg-amber-500 text-slate-950 shadow flex items-center gap-1 transition';
        p2d.className = 'hidden';
        p3d.className = 'w-full h-full relative bg-gradient-to-b from-sky-100 via-slate-100 to-slate-200 overflow-hidden';
    }
    const closePopupBtn = document.getElementById('btnClose3DPopup');
    if (closePopupBtn) closePopupBtn.classList.toggle('hidden', !(mode === '2d' && state.birdEyePopupOpen));
    if (typeof handleResize === 'function') handleResize();
    if (typeof window.notifyLiveShareStateChanged === 'function') {
        window.notifyLiveShareStateChanged('viewMode');
    }
}
window.setViewMode = setViewMode;

function toggleBirdEyePopup() {
    if (state.viewMode !== '2d') {
        // 分割または3D表示中は2D+右下に切り替えるか2D/分割をトグル
        state.viewMode = '2d';
        state.birdEyePopupOpen = true;
    } else {
        state.birdEyePopupOpen = !state.birdEyePopupOpen;
    }
    setViewMode(state.viewMode);
    if (state.birdEyePopupOpen && typeof set3DCameraPreset === 'function') {
        set3DCameraPreset('bird');
    }
}
window.toggleBirdEyePopup = toggleBirdEyePopup;

// ============================================================================
// コンテキスト連動「操作マニュアル」ブラウザモーダル制御（JSONフォールバック＆事前描画付き）
// ============================================================================
let currentDisplayedManualId = 'ch3_wall_draw';

function hydrateManualDataFromJson(jsonData) {
    if (!jsonData || !Array.isArray(jsonData.chapters)) return null;
    const itemMap = {};
    jsonData.chapters.forEach(ch => {
        (ch.items || []).forEach(it => {
            itemMap[it.id] = Object.assign({}, it, {
                chapterId: ch.id,
                chapterNumber: ch.number,
                chapterTitle: ch.title,
                chapterColor: ch.color
            });
        });
    });
    const toolMap = jsonData.toolMap || {};
    return {
        version: jsonData.version || '2.7.3',
        updatedAt: jsonData.updatedAt || '',
        toolMap: toolMap,
        chapters: jsonData.chapters,
        itemMap: itemMap,
        resolveManualIdForCurrentTool: function (stateObj) {
            if (!stateObj) return 'ch3_wall_draw';
            const tool = stateObj.activeTool || 'wall';
            const subWall = stateObj.subWallType || 'wall';
            const subOp = stateObj.subOpeningFit || stateObj.subDoorFit || 'hikichigai';
            const subRm = stateObj.subRoomType || 'LDK';
            const subFx = stateObj.subFixtureCategory || 'KITCHEN';
            if (tool === 'wall' && toolMap[`wall:${subWall}`]) return toolMap[`wall:${subWall}`];
            if (tool === 'opening' && toolMap[`opening:${subOp}`]) return toolMap[`opening:${subOp}`];
            if (tool === 'room' && toolMap[`room:${subRm}`]) return toolMap[`room:${subRm}`];
            if (tool === 'fixture' && toolMap[`fixture:${subFx}`]) return toolMap[`fixture:${subFx}`];
            if (toolMap[tool]) return toolMap[tool];
            if (stateObj.paletteMode === 'memo') return 'ch5_memo_overview';
            if (stateObj.paletteMode === 'photo') return 'ch5_camera_sketch';
            return 'ch3_wall_draw';
        }
    };
}

async function ensureManualDataReady() {
    if (window.MADORI_MANUAL_DATA && Array.isArray(window.MADORI_MANUAL_DATA.chapters) && window.MADORI_MANUAL_DATA.chapters.length > 0) {
        return window.MADORI_MANUAL_DATA;
    }
    try {
        const res = await fetch('/data/madori_manual.json?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
            const jsonData = await res.json();
            const hydrated = hydrateManualDataFromJson(jsonData);
            if (hydrated) {
                window.MADORI_MANUAL_DATA = hydrated;
                return hydrated;
            }
        }
    } catch (e) {
        console.warn('Manual JSON fallback fetch error:', e);
    }
    return window.MADORI_MANUAL_DATA || null;
}
window.ensureManualDataReady = ensureManualDataReady;

async function openManualModal(specificId) {
    const modal = document.getElementById('madoriManualModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const mData = await ensureManualDataReady();
    if (!mData) {
        const bodyEl = document.getElementById('manualModalBody') || document.getElementById('manualDetailContent');
        if (bodyEl) {
            bodyEl.innerHTML = `<div class="p-6 text-center text-amber-300 font-bold">マニュアルデータを読み込んでいます。上部の「🔄 更新」ボタンを押して最新版を再取得してください。</div>`;
        }
        return;
    }

    const targetId = specificId || (typeof mData.resolveManualIdForCurrentTool === 'function' ? mData.resolveManualIdForCurrentTool(state) : 'ch3_wall_draw');
    renderManualSidebar('');
    showManualItem(targetId);
}
window.openManualModal = openManualModal;

function closeManualModal() {
    const modal = document.getElementById('madoriManualModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}
window.closeManualModal = closeManualModal;

function renderManualSidebar(filterQuery) {
    const nav = document.getElementById('manualModalSidebar') || document.getElementById('manualSidebarNav');
    if (!nav) return;
    const mData = window.MADORI_MANUAL_DATA;
    if (!mData || !Array.isArray(mData.chapters)) return;
    const q = (filterQuery || '').trim().toLowerCase();

    let html = '';
    mData.chapters.forEach(ch => {
        const matchedItems = (ch.items || []).filter(it => {
            if (!q) return true;
            return (it.title || '').toLowerCase().includes(q)
                || (it.summary || '').toLowerCase().includes(q)
                || (it.steps || []).some(s => s.toLowerCase().includes(q));
        });
        if (matchedItems.length === 0) return;

        html += `
            <div class="mb-3">
                <div class="px-2.5 py-1.5 text-xs font-black text-amber-300 bg-slate-800/90 rounded-lg flex items-center gap-2 mb-1">
                    <i class="${ch.icon || 'fa-solid fa-book'}"></i>
                    <span>${ch.number}：${ch.title}</span>
                </div>
                <div class="space-y-0.5 pl-1">
                    ${matchedItems.map(it => {
            const isAct = it.id === currentDisplayedManualId;
            return `
                            <button type="button" onclick="showManualItem('${it.id}')" id="manualNavBtn_${it.id}" class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-between ${isAct ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}">
                                <span class="truncate">${it.title}</span>
                                <i class="fa-solid fa-chevron-right text-[10px] opacity-60 shrink-0 ml-1"></i>
                            </button>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    });

    nav.innerHTML = html || '<div class="text-xs text-slate-400 p-4 text-center">該当するマニュアル項目が見つかりません</div>';
}
window.renderManualSidebar = renderManualSidebar;
window.filterManualSidebar = renderManualSidebar;

function showManualItem(manualId) {
    const mData = window.MADORI_MANUAL_DATA;
    if (!mData || !mData.itemMap) return;
    const item = mData.itemMap[manualId] || Object.values(mData.itemMap)[0];
    if (!item) return;
    currentDisplayedManualId = item.id;

    // サイドバーのハイライト更新
    const searchInput = document.getElementById('manualSearchInput');
    renderManualSidebar(searchInput ? searchInput.value : '');

    const contentEl = document.getElementById('manualModalBody') || document.getElementById('manualDetailContent');
    if (!contentEl) return;

    const currentToolResolvedId = typeof mData.resolveManualIdForCurrentTool === 'function'
        ? mData.resolveManualIdForCurrentTool(state)
        : 'ch3_wall_draw';
    const isCurrentToolMatch = (item.id === currentToolResolvedId);

    const stepsHtml = (item.steps || []).map((st, idx) => `
        <div class="flex items-start gap-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <span class="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">${idx + 1}</span>
            <p class="text-xs sm:text-sm text-slate-100 leading-relaxed whitespace-pre-line">${st}</p>
        </div>
    `).join('');

    contentEl.innerHTML = `
        <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-3">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold">${item.chapterNumber || ''}：${item.chapterTitle || ''}</span>
                        ${isCurrentToolMatch ? `<span class="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[11px] font-bold"><i class="fa-solid fa-bolt mr-1"></i>現在選択中のツール</span>` : ''}
                    </div>
                    <h4 class="text-base sm:text-lg font-black text-white">${item.title}</h4>
                </div>
            </div>

            <div class="p-3.5 rounded-xl bg-sky-950/50 border border-sky-500/40 text-xs sm:text-sm text-sky-100 font-medium leading-relaxed">
                <i class="fa-solid fa-circle-info text-sky-400 mr-1.5"></i>${item.summary}
            </div>

            <div class="space-y-2.5">
                <div class="text-xs font-black text-amber-300 uppercase tracking-wider"><i class="fa-solid fa-list-ol mr-1.5"></i>操作手順（ステップ・バイ・ステップ）</div>
                ${stepsHtml}
            </div>

            ${item.tips ? `
                <div class="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 leading-relaxed">
                    <strong class="text-amber-300 font-black block mb-0.5"><i class="fa-solid fa-lightbulb mr-1"></i>ワンポイント・コツ</strong>
                    ${item.tips}
                </div>
            ` : ''}
        </div>
    `;
}
window.showManualItem = showManualItem;

/**
 * 🔄 アプリ化（PWA / ホーム画面追加）およびブラウザ用の強制最新版アップデート機構
 * 作図中のデータを一時自動退避した上でキャッシュを破棄し、最新バージョンを再取得します。
 */
const getCurrentMadoriAppVersion = () => (typeof window.MADORI_APP_VERSION === 'string' && window.MADORI_APP_VERSION) || '2.15.0';

function compareSemver(verA, verB) {
    const parse = (v) => String(v || '0.0.0').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    const a = parse(verA);
    const b = parse(verB);
    for (let i = 0; i < 3; i++) {
        if ((a[i] || 0) > (b[i] || 0)) return 1;
        if ((a[i] || 0) < (b[i] || 0)) return -1;
    }
    return 0;
}

async function forceUpdateMadoriApp() {
    try {
        // 作図中のデータがあればセッションストレージへ自動バックアップ（物件タイトルも確実に保存）
        if (typeof state !== 'undefined' && state.floors) {
            const titleEl = document.getElementById('planTitleInput');
            const curTitle = (titleEl && titleEl.value && titleEl.value.trim()) ? titleEl.value.trim() : (state.projectTitle || '新規プラン');
            state.projectTitle = curTitle;
            sessionStorage.setItem('smile_madori_auto_backup', JSON.stringify({
                projectTitle: curTitle,
                currentPlanId: state.currentPlanId,
                currentFloor: state.currentFloor,
                modulePitch: state.modulePitch,
                gridDivisions: state.gridDivisions,
                designerMode: state.designerMode,
                floors: state.floors,
                guides: state.guides,
                savedAt: Date.now()
            }));
        }
        if (typeof showToast === 'function') {
            showToast('🔄 最新版プログラム＆マニュアルを取得して更新しています...');
        }
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const reg of regs) {
                await reg.unregister();
            }
        }
        if ('caches' in window) {
            const keys = await caches.keys();
            for (const k of keys) {
                await caches.delete(k);
            }
        }
    } catch (e) {
        console.warn('Cache clear warning:', e);
    }
    const url = new URL(window.location.href);
    url.searchParams.set('v', Date.now().toString());
    window.location.replace(url.toString());
}
window.forceUpdateMadoriApp = forceUpdateMadoriApp;

async function checkMadoriAppUpdate() {
    try {
        const res = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return;
        const vData = await res.json();
        const remoteVer = (vData.components && vData.components.madoriSketch) ? vData.components.madoriSketch : null;
        const btn = document.getElementById('btnAppUpdate');
        const badge = document.getElementById('badgeUpdateAvailable');
        const currentVer = getCurrentMadoriAppVersion();

        // リモート版が現在版より新しい場合のみ通知（同版や古いキャッシュ文字列での誤通知を完全防止）
        if (remoteVer && compareSemver(remoteVer, currentVer) > 0) {
            if (btn) {
                btn.className = 'relative px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold border border-amber-200 shadow flex items-center gap-1 animate-pulse transition';
                btn.title = `新しいバージョン (v${remoteVer}) が利用可能です！タップして最新版に更新（作図中データは保持されます）`;
                btn.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i><span>v${remoteVer}へ更新</span><span id="badgeUpdateAvailable" class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border border-slate-900"></span>`;
            }
            if (badge) badge.classList.remove('hidden');
            showToast(`✨ 新しいバージョン (v${remoteVer}) が配信されています。上部の「🔄 v${remoteVer}へ更新」ボタンで即座に反映できます`);
        } else {
            if (badge) badge.classList.add('hidden');
            if (btn) {
                btn.className = 'relative px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1 transition';
                btn.title = `現在のバージョン: v${currentVer}（最新です。タップでキャッシュクリア再読込）`;
            }
        }
    } catch (e) { }
}
window.checkMadoriAppUpdate = checkMadoriAppUpdate;

function restoreAutoBackupIfAvailable() {
    try {
        const raw = sessionStorage.getItem('smile_madori_auto_backup');
        if (!raw) return false;
        sessionStorage.removeItem('smile_madori_auto_backup');
        const bak = JSON.parse(raw);
        if (bak && bak.floors && (Date.now() - (bak.savedAt || 0) < 300000)) {
            state.projectTitle = bak.projectTitle || state.projectTitle || '新規プラン';
            const titleInp = document.getElementById('planTitleInput');
            if (titleInp) titleInp.value = state.projectTitle;
            state.currentPlanId = bak.currentPlanId || null;
            if (typeof window.updateCurrentPlanBadge === 'function') window.updateCurrentPlanBadge();
            state.currentFloor = bak.currentFloor || 1;
            state.modulePitch = bak.modulePitch || 910;
            state.gridDivisions = bak.gridDivisions || 2;
            state.designerMode = !!bak.designerMode;
            state.floors = bak.floors;
            state.guides = bak.guides || [];
            ensureFloorsStructure();
            saveHistorySnapshot();
            if (typeof updateAllMetricsAnd3D === 'function') updateAllMetricsAnd3D();
            // loadSampleHousePlan 等に上書きされないよう遅延でもう一度タイトル欄を確定同期
            setTimeout(() => {
                const inp = document.getElementById('planTitleInput');
                if (inp && state.projectTitle) inp.value = state.projectTitle;
            }, 60);
            showToast(`✅ 最新版への更新が完了し、「${state.projectTitle}」の図面データを復元しました！`);
            return true;
        }
    } catch (e) { }
    return false;
}
window.restoreAutoBackupIfAvailable = restoreAutoBackupIfAvailable;

// ============================================================================
// 3D画面・作図画面のカメラ撮影 ＆ 画像へのペン書き込みモーダル（第5章準拠）
// ============================================================================
let photoSketchCtx = null;
let photoSketchDrawing = false;
let photoSketchTool = 'pen'; // 'pen', 'line', 'arrow', 'text'
let photoSketchColor = '#ef4444';
let photoSketchStartPt = null;
let photoSketchBaseImg = null;

function captureCurrentScreenForSketch() {
    let dataUrl = '';
    const glCanvas = document.getElementById('canvas3d');
    const c2d = document.getElementById('canvas2d');

    if (state.viewMode !== '2d' && glCanvas && window.renderer3d && window.scene3d && window.camera3d) {
        window.renderer3d.render(window.scene3d, window.camera3d);
        dataUrl = glCanvas.toDataURL('image/png');
    } else if (c2d) {
        dataUrl = c2d.toDataURL('image/png');
    }

    if (!dataUrl) {
        showToast('画面キャプチャに失敗しました', true);
        return;
    }

    const snap = {
        id: 'snap_' + Date.now(),
        title: `カメラ撮影 #${(state.snapshots || []).length + 1} (${state.currentFloor === 0 ? '地下' : state.currentFloor + '階'})`,
        baseDataUrl: dataUrl,
        annotatedDataUrl: dataUrl,
        createdAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    };
    state.snapshots = state.snapshots || [];
    state.snapshots.unshift(snap);
    renderPhotoListInPalette();
    openPhotoSketchModal(snap.id);
    showToast('📸 画面を撮影しました！ペンや文字で直接メモを書き込めます');
}
window.captureCurrentScreenForSketch = captureCurrentScreenForSketch;

function renderPhotoListInPalette() {
    const listEl = document.getElementById('photoSnapshotGallery') || document.getElementById('photoSnapshotList');
    if (!listEl) return;
    const snaps = state.snapshots || [];
    if (snaps.length === 0) {
        listEl.innerHTML = `<div class="text-[11px] text-slate-400 text-center py-4 px-2">まだ撮影された画像がありません。<br>上の「📸 画面を撮影してペン記入」を押すと3D/2D画面を撮影してペンで書き込めます。</div>`;
        return;
    }
    listEl.innerHTML = snaps.map(s => `
        <div onclick="openPhotoSketchModal('${s.id}')" class="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 cursor-pointer transition flex flex-col gap-1">
            <img src="${s.annotatedDataUrl || s.baseDataUrl}" class="w-full h-20 object-cover rounded bg-white border border-neutral-700" />
            <div class="flex items-center justify-between text-[10px] text-slate-200 px-0.5">
                <span class="font-bold truncate">${s.title}</span>
                <span class="text-amber-400 font-bold">✏️書込</span>
            </div>
        </div>
    `).join('');
}
window.renderPhotoListInPalette = renderPhotoListInPalette;

function openPhotoSketchModal(snapId) {
    const snap = (state.snapshots || []).find(s => s.id === snapId);
    if (!snap) return;
    state.activeSnapshotId = snap.id;

    const modal = document.getElementById('photoSketchModal');
    const canvas = document.getElementById('photoSketchCanvas');
    if (!modal || !canvas) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const img = new Image();
    img.onload = () => {
        canvas.width = img.width || 960;
        canvas.height = img.height || 640;
        photoSketchCtx = canvas.getContext('2d');
        photoSketchCtx.drawImage(img, 0, 0, canvas.width, canvas.height);
        photoSketchBaseImg = new Image();
        photoSketchBaseImg.src = canvas.toDataURL('image/png');
    };
    img.src = snap.annotatedDataUrl || snap.baseDataUrl;
    setupPhotoSketchEvents(canvas);
}
window.openPhotoSketchModal = openPhotoSketchModal;

function closePhotoSketchModal() {
    const modal = document.getElementById('photoSketchModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}
window.closePhotoSketchModal = closePhotoSketchModal;

function setupPhotoSketchEvents(canvas) {
    if (canvas._boundEvents) return;
    canvas._boundEvents = true;

    const getPt = (e) => {
        const r = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - r.left) * (canvas.width / r.width),
            y: (e.clientY - r.top) * (canvas.height / r.height)
        };
    };

    canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const pt = getPt(e);
        if (photoSketchTool === 'text') {
            const txt = prompt('画像に書き込むテキストを入力してください:', 'ここを勾配天井にする');
            if (txt && photoSketchCtx) {
                photoSketchCtx.save();
                photoSketchCtx.font = 'bold 22px "Noto Sans JP", sans-serif';
                const tw = photoSketchCtx.measureText(txt).width;
                photoSketchCtx.fillStyle = 'rgba(255,255,255,0.9)';
                photoSketchCtx.fillRect(pt.x - 6, pt.y - 24, tw + 12, 32);
                photoSketchCtx.strokeStyle = photoSketchColor;
                photoSketchCtx.lineWidth = 2;
                photoSketchCtx.strokeRect(pt.x - 6, pt.y - 24, tw + 12, 32);
                photoSketchCtx.fillStyle = photoSketchColor;
                photoSketchCtx.fillText(txt, pt.x, pt.y);
                photoSketchCtx.restore();
                photoSketchBaseImg.src = canvas.toDataURL('image/png');
            }
            return;
        }
        photoSketchDrawing = true;
        photoSketchStartPt = pt;
        if (photoSketchTool === 'pen' && photoSketchCtx) {
            photoSketchCtx.beginPath();
            photoSketchCtx.moveTo(pt.x, pt.y);
        }
    });

    canvas.addEventListener('pointermove', (e) => {
        if (!photoSketchDrawing || !photoSketchCtx) return;
        const pt = getPt(e);
        photoSketchCtx.strokeStyle = photoSketchColor;
        photoSketchCtx.fillStyle = photoSketchColor;
        photoSketchCtx.lineWidth = 4;
        photoSketchCtx.lineCap = 'round';

        if (photoSketchTool === 'pen') {
            photoSketchCtx.lineTo(pt.x, pt.y);
            photoSketchCtx.stroke();
        } else if (photoSketchTool === 'line' || photoSketchTool === 'arrow') {
            photoSketchCtx.clearRect(0, 0, canvas.width, canvas.height);
            if (photoSketchBaseImg) photoSketchCtx.drawImage(photoSketchBaseImg, 0, 0);
            photoSketchCtx.beginPath();
            photoSketchCtx.moveTo(photoSketchStartPt.x, photoSketchStartPt.y);
            photoSketchCtx.lineTo(pt.x, pt.y);
            photoSketchCtx.stroke();
            if (photoSketchTool === 'arrow') {
                const ang = Math.atan2(pt.y - photoSketchStartPt.y, pt.x - photoSketchStartPt.x);
                photoSketchCtx.beginPath();
                photoSketchCtx.moveTo(pt.x, pt.y);
                photoSketchCtx.lineTo(pt.x - 16 * Math.cos(ang - 0.4), pt.y - 16 * Math.sin(ang - 0.4));
                photoSketchCtx.moveTo(pt.x, pt.y);
                photoSketchCtx.lineTo(pt.x - 16 * Math.cos(ang + 0.4), pt.y - 16 * Math.sin(ang + 0.4));
                photoSketchCtx.stroke();
            }
        }
    });

    canvas.addEventListener('pointerup', () => {
        if (!photoSketchDrawing) return;
        photoSketchDrawing = false;
        if (photoSketchBaseImg) {
            photoSketchBaseImg.src = canvas.toDataURL('image/png');
        }
    });
}

function setPhotoSketchTool(t, col) {
    if (t) photoSketchTool = t;
    if (col) photoSketchColor = col;
}
window.setPhotoSketchTool = setPhotoSketchTool;

function setPhotoSketchColor(col) {
    photoSketchColor = col || '#ef4444';
    photoSketchTool = 'pen';
}
window.setPhotoSketchColor = setPhotoSketchColor;

function addPhotoSketchText() {
    photoSketchTool = 'text';
    showToast('画像上の文字を入れたい場所をタップしてください');
}
window.addPhotoSketchText = addPhotoSketchText;

function clearPhotoSketchAnnotations() {
    const snap = (state.snapshots || []).find(s => s.id === state.activeSnapshotId);
    const canvas = document.getElementById('photoSketchCanvas');
    if (!snap || !canvas) return;
    const img = new Image();
    img.onload = () => {
        photoSketchCtx.clearRect(0, 0, canvas.width, canvas.height);
        photoSketchCtx.drawImage(img, 0, 0);
        photoSketchBaseImg.src = canvas.toDataURL('image/png');
    };
    img.src = snap.baseDataUrl;
}
window.clearPhotoSketchAnnotations = clearPhotoSketchAnnotations;
window.clearPhotoSketchCanvas = clearPhotoSketchAnnotations;

function savePhotoSketchImage(downloadFile = true) {
    const snap = (state.snapshots || []).find(s => s.id === state.activeSnapshotId);
    const canvas = document.getElementById('photoSketchCanvas');
    if (!snap || !canvas) return;
    snap.annotatedDataUrl = canvas.toDataURL('image/png');
    renderPhotoListInPalette();
    if (downloadFile) {
        const a = document.createElement('a');
        a.href = snap.annotatedDataUrl;
        a.download = `Smile_3D_Sketch_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    closePhotoSketchModal();
    showToast('💾 ペン書き込み済みの3D/図面画像を保存しました');
}
window.savePhotoSketchImage = savePhotoSketchImage;
