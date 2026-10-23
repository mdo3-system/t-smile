/**
 * Smile MadoriSketch - UI Controls, Sub-Toolbar & Floating Property Inspector
 * (Single Responsibility Principle Refactoring)
 */
// ============================================================================
// UI CONTROLS, SUB-TOOLBAR & FLOATING PROPERTY INSPECTOR
// ============================================================================

function selectTool(toolName) {
    state.activeTool = toolName;
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('tool_' + toolName);
    if (activeBtn) activeBtn.classList.add('active');
    renderSubToolbar();
    renderPropertyInspector();
    request2DRedraw();
}

function renderSubToolbar() {
    const container = document.getElementById('subToolbarContent');
    container.innerHTML = '';

    if (state.activeTool === 'room') {
        const label = document.createElement('span');
        label.className = 'text-[11px] font-bold text-slate-400 mr-1 shrink-0';
        label.innerHTML = '<i class="fa-solid fa-pen-nib mr-1 text-blue-400"></i>部屋ペン:';
        container.appendChild(label);

        Object.keys(ROOM_TYPES).forEach(key => {
            const rt = ROOM_TYPES[key];
            const btn = document.createElement('button');
            const isAct = state.subRoomType === key;
            btn.className = `sub-chip px-2.5 py-1 rounded-lg text-xs font-bold border transition shrink-0 flex items-center gap-1.5 ${isAct ? 'active' : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white'}`;
            btn.innerHTML = `<span class="w-2.5 h-2.5 rounded-sm border border-black/30" style="background:${rt.color2d}"></span><span>${rt.label}</span>`;
            btn.onclick = () => {
                state.subRoomType = key;
                renderSubToolbar();
            };
            container.appendChild(btn);
        });
    } else if (state.activeTool === 'wall') {
        container.innerHTML = `
            <span class="text-[11px] font-bold text-sky-400 mr-2 shrink-0"><i class="fa-solid fa-pen-nib mr-1"></i>壁を描く:</span>
            <span class="text-xs text-slate-200 mr-2 shrink-0">PC: <b class="text-sky-300">端点と端点をクリック</b> ／ iPad: <b class="text-sky-300">ペンでドラッグ</b></span>
            <span class="text-[11px] text-slate-400 ml-2 hidden sm:inline">（外壁・間仕切りは自動判定されます）</span>
            <span class="text-[11px] text-amber-300 font-bold ml-auto hidden md:inline"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i>壁で囲むと自動で部屋が生成され面積が集計されます</span>
        `;
    } else if (state.activeTool === 'pillar') {
        container.innerHTML = `
            <span class="text-[11px] font-bold text-slate-400 mr-1"><i class="fa-solid fa-square mr-1 text-amber-300"></i>独立柱サイズ:</span>
            <button onclick="state.subPillarSize=105;state.subPillarShape='square';renderSubToolbar();" class="sub-chip px-2.5 py-1 rounded-lg text-xs font-bold border ${(state.subPillarSize===105&&state.subPillarShape==='square')?'active':'bg-slate-800 text-slate-300 border-slate-700'}">105角 (一般柱)</button>
            <button onclick="state.subPillarSize=120;state.subPillarShape='square';renderSubToolbar();" class="sub-chip px-2.5 py-1 rounded-lg text-xs font-bold border ${(state.subPillarSize===120&&state.subPillarShape==='square')?'active':'bg-slate-800 text-slate-300 border-slate-700'}">120角 (大黒柱)</button>
            <button onclick="state.subPillarSize=150;state.subPillarShape='square';renderSubToolbar();" class="sub-chip px-2.5 py-1 rounded-lg text-xs font-bold border ${(state.subPillarSize===150&&state.subPillarShape==='square')?'active':'bg-slate-800 text-slate-300 border-slate-700'}">150角 (ポーチ・脚/標準)</button>
            <button onclick="state.subPillarSize=150;state.subPillarShape='round';renderSubToolbar();" class="sub-chip px-2.5 py-1 rounded-lg text-xs font-bold border ${(state.subPillarShape==='round')?'active':'bg-slate-800 text-slate-300 border-slate-700'}"><i class="fa-solid fa-circle mr-1 text-amber-300"></i>丸柱 (φ150 化粧柱)</button>
            <span class="text-[11px] text-amber-300 font-bold ml-1 hidden lg:inline"><i class="fa-solid fa-hand-pointer mr-1"></i>キャンバスをクリックして独立柱を配置（1クリックで即時作成）</span>
        `;
    } else if (state.activeTool === 'opening') {
        const isWin = state.subOpeningCategory === 'window';
        const curTop = state.subWindowTopMm || 2000;
        const curH = state.subWindowHeight || 1100;
        const curSill = state.subWindowSillMm !== undefined ? state.subWindowSillMm : Math.max(0, curTop - curH);

        const wOpts = [260, 360, 600, 740, 1190, 1500, 1600, 1650, 2250, 2510, 2560, 3470].map(w => 
            `<option value="${w}" ${state.subWindowWidth===w?'selected':''}>W${w}mm</option>`
        ).join('');

        const hOpts = [300, 500, 700, 900, 1100, 1300, 1500, 1800, 2000, 2200, 2400].map(h => 
            `<option value="${h}" ${state.subWindowHeight===h?'selected':''}>H${h}mm</option>`
        ).join('');

        const topOpts = [2000, 2100, 2200, 2300, 2400].map(t =>
            `<option value="${t}" ${curTop===t?'selected':''}>天端: FL+${t}mm${t===2000?'(標準)':(t===2200?'(ハイサッシ)':'')}</option>`
        ).join('');

        const sillOpts = [0, 200, 500, 800, 900, 1100, 1300, 1500, 1800].map(s =>
            `<option value="${s}" ${curSill===s?'selected':''}>下端: FL+${s}mm${s===0?'(掃出)':(s===900?'(腰高)':(s===1800?'(高窓)':''))}</option>`
        ).join('');

        container.innerHTML = `
            <div class="flex items-center gap-2 shrink-0">
                <!-- 窓 / ドア 切替 -->
                <div class="flex items-center bg-slate-900/90 p-1 rounded-lg border border-slate-700 shrink-0 gap-1">
                    <button onclick="state.subOpeningCategory='window';renderSubToolbar();" class="px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 ${isWin?'bg-sky-600 text-white shadow':'text-slate-400 hover:text-white'}">
                        <i class="fa-solid fa-window-maximize text-sky-300"></i> 窓サッシ
                    </button>
                    <button onclick="state.subOpeningCategory='door';renderSubToolbar();" class="px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 ${!isWin?'bg-amber-600 text-white shadow':'text-slate-400 hover:text-white'}">
                        <i class="fa-solid fa-door-open text-amber-300"></i> 内部建具・玄関
                    </button>
                </div>

                ${isWin ? `
                    <!-- 窓のサイズ & 天端・下端連動設定 -->
                    <div class="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700 text-xs shrink-0">
                        <span class="text-sky-300 font-bold">幅:</span>
                        <select onchange="updateWindowPresetWidth(parseInt(this.value));" class="bg-slate-900 text-sky-200 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-bold mono-num focus:outline-none">${wOpts}</select>
                        <span class="text-sky-300 font-bold ml-1">高:</span>
                        <select onchange="updateWindowPresetHeight(parseInt(this.value));" class="bg-slate-900 text-sky-200 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-bold mono-num focus:outline-none">${hOpts}</select>
                        <span class="text-slate-500">|</span>
                        <!-- 天端設定 -->
                        <select onchange="updateWindowTopHeight(parseInt(this.value));" class="bg-slate-900 text-emerald-300 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-bold mono-num focus:outline-none">${topOpts}</select>
                        <!-- 下端設定 -->
                        <select onchange="updateWindowSillHeight(parseInt(this.value));" class="bg-slate-900 text-amber-300 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-bold mono-num focus:outline-none">${sillOpts}</select>
                    </div>
                ` : `
                    <!-- ドア・建具設定 -->
                    <div class="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700 text-xs shrink-0">
                        <select onchange="state.subDoorFit=this.value;renderSubToolbar();" class="bg-slate-900 text-amber-200 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-bold focus:outline-none">
                            <option value="hikichigai" ${state.subDoorFit==='hikichigai'?'selected':''}>引違い戸 (2枚/4枚)</option>
                            <option value="katabiki" ${state.subDoorFit==='katabiki'?'selected':''}>片引き戸</option>
                            <option value="hikikomi" ${state.subDoorFit==='hikikomi'?'selected':''}>引込み戸</option>
                            <option value="hikiwake" ${state.subDoorFit==='hikiwake'?'selected':''}>引き分け戸</option>
                            <option value="hiraki" ${state.subDoorFit==='hiraki'?'selected':''}>開き戸 (ドア)</option>
                            <option value="genkan_slide" ${state.subDoorFit==='genkan_slide'?'selected':''}>玄関引き戸</option>
                        </select>
                        <select onchange="state.subDoorLeafWidth=parseInt(this.value);renderSubToolbar();" class="bg-slate-900 text-amber-300 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-bold mono-num focus:outline-none">
                            <option value="600" ${state.subDoorLeafWidth===600?'selected':''}>単板幅 600mm</option>
                            <option value="700" ${state.subDoorLeafWidth===700?'selected':''}>単板幅 700mm</option>
                            <option value="800" ${state.subDoorLeafWidth===800?'selected':''}>単板幅 800mm (標準)</option>
                            <option value="900" ${state.subDoorLeafWidth===900?'selected':''}>単板幅 900mm</option>
                        </select>
                    </div>
                `}

                <span class="text-[11px] text-cyan-300 font-bold ml-1 hidden lg:inline">
                    <i class="fa-solid fa-wand-magic-sparkles mr-1"></i>壁をクリックで連続配置できます（同じ仕様で何箇所でもポンポン配置可能）
                </span>
            </div>
        `;
    } else if (state.activeTool === 'stair') {
        const isDrawing = state.stairDrawingPoints && state.stairDrawingPoints.length > 0;
        const ptCount = isDrawing ? state.stairDrawingPoints.length : 0;
        
        container.innerHTML = `
            <div class="flex items-center gap-2 shrink-0">
                <div class="flex items-center bg-slate-900/90 p-1 rounded-lg border border-slate-700 shrink-0 gap-1">
                    <button onclick="setStairDrawMode('path')" class="px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 shrink-0 ${state.stairDrawMode==='path'?'bg-amber-600 text-white shadow':'text-slate-400 hover:text-white'}">
                        <i class="fa-solid fa-pen-nib text-amber-300"></i> 一辺ずつ描く（自由）
                    </button>
                    <button onclick="setStairDrawMode('preset')" class="px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 shrink-0 ${state.stairDrawMode==='preset'?'bg-cyan-600 text-white shadow':'text-slate-400 hover:text-white'}">
                        <i class="fa-solid fa-shapes text-cyan-300"></i> 定型ポン置き
                    </button>
                </div>

                ${state.stairDrawMode === 'path' ? `
                    <div class="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-xs shrink-0">
                        ${!isDrawing ? `
                            <span class="text-amber-300 font-bold"><i class="fa-solid fa-crosshairs mr-1"></i>階段の登り口（始点）をタップしてください</span>
                            <span class="text-slate-400 text-[11px] hidden sm:inline">（直階段・L字・コの字型を壁沿いに一辺ずつ描けます）</span>
                        ` : `
                            <span class="text-cyan-300 font-bold">角・終点をタップ (${ptCount}点指定中)</span>
                            <button onclick="finishStairPathInput()" class="px-3 py-1 rounded-md bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow flex items-center gap-1">
                                <i class="fa-solid fa-check"></i> 階段作成
                            </button>
                            <button onclick="cancelStairDrawing()" class="px-2 py-1 rounded-md bg-slate-700 text-slate-300 font-bold hover:text-white">
                                取消
                            </button>
                        `}
                    </div>
                ` : `
                    <div class="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 text-xs shrink-0">
                        <button onclick="setStairPresetType('STRAIGHT')" class="sub-chip px-2.5 py-1 rounded text-xs font-bold transition border ${(state.stairPresetType||'STRAIGHT')==='STRAIGHT'?'active border-cyan-400 bg-cyan-600/30 text-white':'bg-slate-900 border-slate-700 text-slate-300'}">
                            直階段 (1×2マス)
                        </button>
                        <button onclick="setStairPresetType('U_SHAPE')" class="sub-chip px-2.5 py-1 rounded text-xs font-bold transition border ${state.stairPresetType==='U_SHAPE'?'active border-cyan-400 bg-cyan-600/30 text-white':'bg-slate-900 border-slate-700 text-slate-300'}">
                            折り返し階段 (コの字/1坪)
                        </button>
                        <button onclick="setStairPresetType('L_SHAPE')" class="sub-chip px-2.5 py-1 rounded text-xs font-bold transition border ${state.stairPresetType==='L_SHAPE'?'active border-cyan-400 bg-cyan-600/30 text-white':'bg-slate-900 border-slate-700 text-slate-300'}">
                            かね折れ階段 (L字型)
                        </button>

                        <span class="text-slate-600">|</span>

                        <!-- 階段の回転ボタン -->
                        <button onclick="rotateStairPreset()" class="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-amber-300 font-bold hover:text-white flex items-center gap-1" title="階段の向きを90度回転します（ショートカット: Rキー）">
                            <i class="fa-solid fa-rotate-right"></i> 90°回転 (${state.subStairRot||0}°)
                        </button>

                        <!-- 登り/下りトグル -->
                        <button onclick="toggleStairDirection()" class="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-bold hover:text-white flex items-center gap-1">
                            <i class="fa-solid fa-arrow-trend-up"></i> ${state.subStairDirection==='DOWN'?'降りる(DOWN)':'上る(UP)'}
                        </button>

                        <!-- 廻り部仕様 -->
                        <select onchange="state.stairTurnSpec=this.value;renderSubToolbar();" class="bg-slate-900 text-amber-200 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-bold focus:outline-none">
                            <option value="turn_3" ${(state.stairTurnSpec||'turn_3')==='turn_3'?'selected':''}>3段廻り (標準)</option>
                            <option value="turn_2" ${state.stairTurnSpec==='turn_2'?'selected':''}>2段廻り (緩やか)</option>
                            <option value="turn_4" ${state.stairTurnSpec==='turn_4'?'selected':''}>4段廻り (省スペース)</option>
                            <option value="landing_flat" ${state.stairTurnSpec==='landing_flat'?'selected':''}>フラット踊り場 (安全仕様)</option>
                        </select>
                    </div>
                `}
            </div>
        `;
    } else if (state.activeTool === 'fixture') {
        const kSpecs = window.KITCHEN_SPECS || {
            iWidths: [1650, 1800, 1950, 2100, 2250, 2400, 2550, 2700, 2850, 3000],
            iDepths: [600, 650],
            heights: [800, 850, 900],
            lWidths: [1650, 1800, 1950, 2100, 2250, 2400, 2550],
            islandWidths: [1800, 1950, 2100, 2250, 2400, 2550, 2700, 3000],
            islandDepths: [750, 800, 850, 900, 970, 1000, 1050]
        };
        const ubSpecs = window.UB_SPECS || {
            sizes: [
                { id: '1216', label: '1216 (0.75坪)', wMm: 1200, dMm: 1600 },
                { id: '1317', label: '1317 (1坪弱)', wMm: 1300, dMm: 1700 },
                { id: '1616', label: '1616 (1坪標準)', wMm: 1600, dMm: 1600 },
                { id: '1717', label: '1717 (1坪広め)', wMm: 1700, dMm: 1700 },
                { id: '1620', label: '1620 (1.25坪)', wMm: 1600, dMm: 2000 },
                { id: '1623', label: '1623 (1.5坪)', wMm: 1600, dMm: 2300 }
            ],
            patterns: [
                { id: 'patternA', label: '短手出入り (パターンA)' },
                { id: 'patternB', label: '長手出入り (パターンB)' }
            ]
        };
        const vSpecs = window.VANITY_SPECS || {
            widths: [600, 750, 900, 1000, 1200, 1600],
            heights: [750, 800, 850]
        };

        // 90°回転ボタン
        const rotBtn = document.createElement('button');
        rotBtn.className = 'px-2.5 py-1 rounded-lg bg-amber-600/30 border border-amber-500/50 text-amber-200 text-xs font-bold hover:bg-amber-600/50 flex items-center gap-1 shrink-0';
        rotBtn.innerHTML = `<i class="fa-solid fa-rotate-right"></i> 90°回転 (${state.subFixtureRot||0}°)`;
        rotBtn.title = '設備の向きを90度回転します（ショートカット: Rキー）';
        rotBtn.onclick = () => {
            rotateFixturePreset();
        };
        container.appendChild(rotBtn);

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
            const isAct = (state.subFixtureCategory || 'KITCHEN') === c.id;
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

        const curCat = state.subFixtureCategory || 'KITCHEN';

        if (curCat === 'KITCHEN') {
            const typeOpts = `
                <option value="I" ${(state.subKitchenType || 'I') === 'I' ? 'selected' : ''}>I型キッチン</option>
                <option value="L" ${state.subKitchenType === 'L' ? 'selected' : ''}>L型キッチン</option>
                <option value="ISLAND" ${state.subKitchenType === 'ISLAND' ? 'selected' : ''}>アイランド/ペニンシュラ</option>
            `;
            let dimsHtml = '';
            const curKType = state.subKitchenType || 'I';

            if (curKType === 'I') {
                const wOpts = kSpecs.iWidths.map(w => `<option value="${w}" ${w === (state.subKitchenIWidth || 2550) ? 'selected' : ''}>幅: ${w/10}cm</option>`).join('');
                const dOpts = kSpecs.iDepths.map(d => `<option value="${d}" ${d === (state.subKitchenIDepth || 650) ? 'selected' : ''}>奥行: ${d/10}cm</option>`).join('');
                const hOpts = kSpecs.heights.map(h => `<option value="${h}" ${h === (state.subKitchenHeight || 850) ? 'selected' : ''}>高: ${h/10}cm</option>`).join('');
                dimsHtml = `
                    <select onchange="state.subKitchenIWidth=parseInt(this.value);" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">${wOpts}</select>
                    <select onchange="state.subKitchenIDepth=parseInt(this.value);" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">${dOpts}</select>
                    <select onchange="state.subKitchenHeight=parseInt(this.value);" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">${hOpts}</select>
                `;
            } else if (curKType === 'L') {
                const lxOpts = kSpecs.lWidths.map(w => `<option value="${w}" ${w === (state.subKitchenLXWidth || 2550) ? 'selected' : ''}>間口X: ${w/10}cm</option>`).join('');
                const lyOpts = kSpecs.lWidths.map(w => `<option value="${w}" ${w === (state.subKitchenLYWidth || 1950) ? 'selected' : ''}>間口Y: ${w/10}cm</option>`).join('');
                const hOpts = kSpecs.heights.map(h => `<option value="${h}" ${h === (state.subKitchenHeight || 850) ? 'selected' : ''}>高: ${h/10}cm</option>`).join('');
                dimsHtml = `
                    <select onchange="state.subKitchenLXWidth=parseInt(this.value);" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">${lxOpts}</select>
                    <select onchange="state.subKitchenLYWidth=parseInt(this.value);" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">${lyOpts}</select>
                    <select onchange="state.subKitchenHeight=parseInt(this.value);" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">${hOpts}</select>
                    <span class="text-slate-400">奥行65cm</span>
                `;
            } else {
                const wOpts = kSpecs.islandWidths.map(w => `<option value="${w}" ${w === (state.subKitchenIslandW || 2550) ? 'selected' : ''}>幅: ${w/10}cm</option>`).join('');
                const dOpts = kSpecs.islandDepths.map(d => `<option value="${d}" ${d === (state.subKitchenIslandD || 900) ? 'selected' : ''}>奥行: ${d/10}cm</option>`).join('');
                const hOpts = kSpecs.heights.map(h => `<option value="${h}" ${h === (state.subKitchenHeight || 850) ? 'selected' : ''}>高: ${h/10}cm</option>`).join('');
                dimsHtml = `
                    <select onchange="state.subKitchenIslandW=parseInt(this.value);" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">${wOpts}</select>
                    <select onchange="state.subKitchenIslandD=parseInt(this.value);" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">${dOpts}</select>
                    <select onchange="state.subKitchenHeight=parseInt(this.value);" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">${hOpts}</select>
                `;
            }

            specGroup.innerHTML = `
                <select onchange="state.subKitchenType=this.value;renderSubToolbar();" class="bg-slate-900 text-yellow-300 font-bold border border-slate-700 rounded px-2 py-1 focus:outline-none">${typeOpts}</select>
                ${dimsHtml}
            `;
            container.appendChild(specGroup);
        } else if (curCat === 'UB') {
            const curUbSize = state.subUbSize || '1616';
            const curUbPat = state.subUbPattern || 'patternA';
            const sizeOpts = ubSpecs.sizes.map(s => `<option value="${s.id}" ${s.id === curUbSize ? 'selected' : ''}>${s.label}</option>`).join('');
            const patOpts = ubSpecs.patterns.map(p => `<option value="${p.id}" ${p.id === curUbPat ? 'selected' : ''}>${p.label}</option>`).join('');
            specGroup.innerHTML = `
                <span class="text-cyan-300 font-bold">🛁 ユニットバス:</span>
                <select onchange="state.subUbSize=this.value;" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-2 py-1 font-bold mono-num focus:outline-none">${sizeOpts}</select>
                <select onchange="state.subUbPattern=this.value;" class="bg-slate-900 text-amber-200 border border-slate-700 rounded px-2 py-1 font-bold focus:outline-none">${patOpts}</select>
            `;
            container.appendChild(specGroup);
        } else if (curCat === 'VANITY') {
            const curVWidth = state.subVanityWidth || 900;
            const curVHeight = state.subVanityHeight || 800;
            const wOpts = vSpecs.widths.map(w => `<option value="${w}" ${w === curVWidth ? 'selected' : ''}>幅: ${w}mm (${w/10}cm)</option>`).join('');
            const hOpts = vSpecs.heights.map(h => `<option value="${h}" ${h === curVHeight ? 'selected' : ''}>高: ${h/10}cm</option>`).join('');
            specGroup.innerHTML = `
                <span class="text-cyan-300 font-bold">🪞 洗面台:</span>
                <select onchange="state.subVanityWidth=parseInt(this.value);" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">${wOpts}</select>
                <select onchange="state.subVanityHeight=parseInt(this.value);" class="bg-slate-900 text-cyan-200 border border-slate-700 rounded px-1.5 py-1 font-bold mono-num focus:outline-none">${hOpts}</select>
                <span class="text-slate-400">奥行550mm</span>
            `;
            container.appendChild(specGroup);
        } else {
            specGroup.innerHTML = `<span class="text-slate-400">クリックして配置（角ドラッグでサイズ調整可能）</span>`;
            container.appendChild(specGroup);
        }
        // 3. 壁吸着基点 ＆ 壁離れクリアランス設定 (Phase 2)
        const wallSnapGroup = document.createElement('div');
        wallSnapGroup.className = 'flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-700 text-xs shrink-0';
        wallSnapGroup.innerHTML = `
            <span class="text-cyan-400 text-[11px] font-bold"><i class="fa-solid fa-magnet mr-1"></i>壁吸着:</span>
            <select onchange="state.subFixtureAlign=this.value;" class="bg-slate-800 text-slate-200 border border-slate-600 rounded px-1.5 py-0.5 text-xs font-bold focus:outline-none">
                <option value="center" ${state.subFixtureAlign==='center'?'selected':''}>中央基準</option>
                <option value="left" ${state.subFixtureAlign==='left'?'selected':''}>左端揃え</option>
                <option value="right" ${state.subFixtureAlign==='right'?'selected':''}>右端揃え</option>
            </select>
            <span class="text-slate-400 text-[11px] font-semibold ml-1">離れ:</span>
            <select onchange="state.subFixtureClearanceMm=parseInt(this.value);" class="bg-slate-800 text-amber-300 border border-slate-600 rounded px-1.5 py-0.5 text-xs font-bold mono-num focus:outline-none">
                <option value="0" ${state.subFixtureClearanceMm===0?'selected':''}>0mm (壁密着)</option>
                <option value="50" ${state.subFixtureClearanceMm===50?'selected':''}>50mm</option>
                <option value="100" ${state.subFixtureClearanceMm===100?'selected':''}>100mm</option>
                <option value="150" ${state.subFixtureClearanceMm===150?'selected':''}>150mm</option>
                <option value="200" ${state.subFixtureClearanceMm===200?'selected':''}>200mm</option>
            </select>
        `;
        container.appendChild(wallSnapGroup);
    } else if (state.activeTool === 'pen') {
        const colors = [
            { hex: '#f43f5e', name: '赤ペン' },
            { hex: '#38bdf8', name: '青ペン' },
            { hex: '#facc15', name: '蛍光黄' },
            { hex: '#22c55e', name: '緑ペン' }
        ];
        let html = `<span class="text-[11px] font-bold text-slate-400 mr-1"><i class="fa-solid fa-pen-clip mr-1 text-rose-400"></i>赤ペン・スタンプ:</span>`;
        colors.forEach(c => {
            const activeRing = (!state.subStampSymbol && state.subPenColor === c.hex) ? 'ring-2 ring-white scale-110' : 'opacity-75';
            html += `<button onclick="state.subStampSymbol=null;state.subPenColor='${c.hex}';renderSubToolbar();" class="w-6 h-6 rounded-full ${activeRing} transition mx-0.5" style="background:${c.hex}" title="${c.name}"></button>`;
        });
        html += `<span class="mx-1 text-slate-600">|</span>`;
        ['コンセント', '照明', 'スイッチ', '給水', '北'].forEach(st => {
            const isAct = state.subStampSymbol === st;
            html += `<button onclick="state.subStampSymbol='${st}';renderSubToolbar();" class="sub-chip px-2 py-1 rounded text-xs font-bold border ${isAct?'active':'bg-slate-800 text-slate-300 border-slate-700'}">⊕ ${st}</button>`;
        });
        html += `<button onclick="clearCurrentFloorStrokes()" class="ml-2 px-2.5 py-1 rounded text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40"><i class="fa-solid fa-broom mr-1"></i>メモ消去</button>`;
        container.innerHTML = html;
    } else if (state.activeTool === 'eraser') {
        container.innerHTML = `<span class="text-xs text-amber-300"><i class="fa-solid fa-eraser mr-1.5"></i>ペンでなぞるかタップした建具・設備・独立柱・部屋・メモを消去します</span>`;
    } else if (state.activeTool === 'pan') {
        container.innerHTML = `<span class="text-xs text-slate-300"><i class="fa-solid fa-hand mr-1.5 text-emerald-400"></i>ドラッグで2Dキャンバス移動、ホイールまたはボタンで拡大縮小</span>`;
    }
}

// --- Floating Property Inspector for Post-Placement Editing (Openings, Fixtures, Rooms, Pillars) ---
function renderPropertyInspector() {
    const panel = document.getElementById('propertyInspector');
    const obj = findSelectedObject();
    if (!obj || state.selectedItem.floor !== state.currentFloor) {
        panel.classList.add('hidden');
        return;
    }
    panel.classList.remove('hidden');

    const pitch = state.modulePitch;
    const kind = state.selectedItem.kind;

    if (kind === 'opening') {
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
    } else if (kind === 'fixture') {
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
        } else if (kind === 'room') {
        const wMm = Math.round(obj.w * pitch);
        const hMm = Math.round(obj.h * pitch);
        const jyo = (obj.w * obj.h / 2).toFixed(1);

        let rmOptions = '';
        Object.keys(ROOM_TYPES).forEach(k => {
            const sel = obj.type === k ? 'selected' : '';
            rmOptions += `<option value="${k}" ${sel}>${ROOM_TYPES[k].label}</option>`;
        });

        const isEx = (typeof isFloorAreaExcludedRoom === 'function') && isFloorAreaExcludedRoom(obj);
        const exBadge = isEx ? '<span class="text-amber-300 font-bold ml-1 text-[10px] bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/50">延床面積除外</span>' : '';

        panel.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                <span class="text-xs font-bold text-white flex items-center flex-wrap gap-1"><i class="fa-solid fa-vector-square text-blue-400 mr-1"></i>${obj.customName} (${jyo}帖)${exBadge}</span>
                <div class="flex items-center gap-1">
                    <button onclick="deleteSelectedItem()" class="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-[11px] text-rose-200 font-bold"><i class="fa-solid fa-trash mr-1"></i>削除</button>
                    <button onclick="state.selectedItem=null;renderPropertyInspector();request2DRedraw();" class="text-slate-400 hover:text-white px-1.5"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            <div class="space-y-2 text-xs">
                <div class="flex items-center justify-between gap-2">
                    <label class="text-slate-300">種別:</label>
                    <select onchange="changeSelectedRoomType(this.value)" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold">
                        ${rmOptions}
                    </select>
                    <button onclick="renameSelectedRoom()" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white border border-slate-600">名称変更</button>
                </div>
                <div class="text-[11px] text-slate-400 mono-num">寸法: ${wMm}mm × ${hMm}mm (四隅の青ハンドルをドラッグで変形)</div>
            </div>
        `;
    } else if (kind === 'pillar') {
        const pl = fl.pillars.find(p => p.id === state.selectedItem.id);
        const curSize = pl ? (pl.sizeMm || 150) : 150;
        const curShape = pl ? (pl.shape || 'square') : 'square';
        panel.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                <span class="text-xs font-bold text-white"><i class="fa-solid fa-square text-amber-400 mr-1.5"></i>独立柱 (ポーチ・脚)</span>
                <div class="flex items-center gap-1">
                    <button onclick="deleteSelectedItem()" class="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-[11px] text-rose-200 font-bold">削除</button>
                    <button onclick="state.selectedItem=null;renderPropertyInspector();request2DRedraw();" class="text-slate-400 hover:text-white px-1.5"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            <div class="space-y-2 text-xs">
                <div>
                    <label class="block text-[11px] text-slate-400 font-bold mb-1">柱サイズ・形状変更:</label>
                    <div class="grid grid-cols-2 gap-1.5">
                        <button onclick="changeSelectedPillarSpec(105, 'square')" class="px-2 py-1 rounded border text-[11px] font-bold ${curSize===105&&curShape==='square'?'border-amber-400 bg-amber-500/20 text-amber-200':'border-slate-700 bg-slate-800 text-slate-300'}">105角 (一般柱)</button>
                        <button onclick="changeSelectedPillarSpec(120, 'square')" class="px-2 py-1 rounded border text-[11px] font-bold ${curSize===120&&curShape==='square'?'border-amber-400 bg-amber-500/20 text-amber-200':'border-slate-700 bg-slate-800 text-slate-300'}">120角 (大黒柱)</button>
                        <button onclick="changeSelectedPillarSpec(150, 'square')" class="px-2 py-1 rounded border text-[11px] font-bold ${curSize===150&&curShape==='square'?'border-amber-400 bg-amber-500/20 text-amber-200':'border-slate-700 bg-slate-800 text-slate-300'}">150角 (標準)</button>
                        <button onclick="changeSelectedPillarSpec(150, 'round')" class="px-2 py-1 rounded border text-[11px] font-bold ${curShape==='round'?'border-amber-400 bg-amber-500/20 text-amber-200':'border-slate-700 bg-slate-800 text-slate-300'}"><i class="fa-solid fa-circle mr-1 text-amber-300"></i>丸柱 (φ150)</button>
                    </div>
                </div>
                <div class="text-[11px] text-slate-400 mt-1">
                    ドラッグで位置をグリッド移動可能。3Dホワイトモデルに即座に反映されます。
                </div>
            </div>
        `;
    } else if (kind === 'stair') {
        const curType = obj.shapeType || 'U_SHAPE';
        const curDir = obj.direction || 'UP';
        const curSteps = obj.steps || 14;
        const curRiser = obj.riserMm || Math.round(2730 / curSteps);
        const curTread = obj.treadMm || 220;

        panel.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                <span class="text-xs font-bold text-amber-300"><i class="fa-solid fa-stairs mr-1.5"></i>階段プロパティ編集 (独立建築要素)</span>
                <div class="flex items-center gap-1">
                    <button onclick="deleteSelectedItem()" class="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-[11px] text-rose-200 font-bold"><i class="fa-solid fa-trash mr-1"></i>削除</button>
                    <button onclick="state.selectedItem=null;renderPropertyInspector();request2DRedraw();" class="text-slate-400 hover:text-white px-1.5"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            <div class="space-y-2.5 text-xs">
                <div class="flex items-center justify-between gap-2">
                    <label class="text-slate-300 font-bold">階段タイプ:</label>
                    <select onchange="updateSelectedStairShape(this.value)" class="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold">
                        <option value="U_SHAPE" ${curType==='U_SHAPE'?'selected':''}>折り返し (U型・1坪)</option>
                        <option value="STRAIGHT" ${curType==='STRAIGHT'?'selected':''}>直階段 (I型)</option>
                        <option value="L_SHAPE" ${curType==='L_SHAPE'?'selected':''}>かね折れ (L型)</option>
                    </select>
                </div>
                <div class="flex items-center justify-between gap-2">
                    <label class="text-slate-300 font-bold">昇降方向:</label>
                    <div class="flex gap-1 flex-1">
                        <button onclick="updateSelectedStairDir('UP')" class="flex-1 py-1 rounded border font-bold text-[11px] ${curDir==='UP'?'border-amber-400 bg-amber-500/20 text-amber-200':'border-slate-700 bg-slate-800 text-slate-400'}">⬆ 上る (UP)</button>
                        <button onclick="updateSelectedStairDir('DOWN')" class="flex-1 py-1 rounded border font-bold text-[11px] ${curDir==='DOWN'?'border-amber-400 bg-amber-500/20 text-amber-200':'border-slate-700 bg-slate-800 text-slate-400'}">⬇ 降りる (DN)</button>
                    </div>
                </div>
                <div class="flex items-center justify-between gap-2">
                    <label class="text-slate-300 font-bold">段数 (1階高2,730mm):</label>
                    <select onchange="updateSelectedStairSteps(parseInt(this.value))" class="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold mono-num">
                        <option value="13" ${curSteps===13?'selected':''}>13段 (蹴上 210mm / 急)</option>
                        <option value="14" ${curSteps===14?'selected':''}>14段 (蹴上 195mm / 標準・快適)</option>
                        <option value="15" ${curSteps===15?'selected':''}>15段 (蹴上 182mm / 緩やか)</option>
                    </select>
                </div>
                <div class="p-2 rounded bg-slate-800/80 border border-slate-700/60 text-[11px] space-y-1">
                    <div class="flex justify-between text-slate-300">
                        <span>蹴上 (Riser): <strong class="text-amber-300 mono-num">${curRiser}mm</strong></span>
                        <span>踏面 (Tread): <strong class="text-amber-300 mono-num">${curTread}mm</strong></span>
                    </div>
                    <div class="text-[10px] text-slate-400">※ 建築基準法（蹴上230以下・踏面150以上）を完全クリア</div>
                </div>
                <div class="flex items-center gap-2 pt-1">
                    <button onclick="rotateSelectedStair()" class="flex-1 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 font-bold text-xs">
                        <i class="fa-solid fa-rotate mr-1"></i>向きを90°回転
                    </button>
                </div>
            </div>
        `;
    }
}

// --- Property Inspector Action Handlers ---
function changeSelectedOpeningType(newType) {
    const obj = findSelectedObject();
    if (!obj || state.selectedItem.kind !== 'opening') return;
    const def = OPENING_TYPES[newType];
    obj.type = newType;
    obj.heightMm = def.heightMm;
    obj.sillMm = def.sillMm;
    saveHistorySnapshot();
    showToast(`建具種類を「${def.label}」に変更しました`);
}

function setSelectedOpeningWidthP(newWidthP) {
    const obj = findSelectedObject();
    if (!obj || state.selectedItem.kind !== 'opening') return;
    const w = Math.max(0.25, Math.min(4.0, Math.round(newWidthP * 12) / 12));
    if (checkOpeningOverlap(state.currentFloor, obj.x, obj.y, obj.orient, w, obj.id)) {
        showToast('他の建具と重なるためこれ以上広げられません', true);
        return;
    }
    obj.widthP = w;
    saveHistorySnapshot();
}

function setSelectedOpeningHeight(hVal, sillVal) {
    const obj = findSelectedObject();
    if (!obj || state.selectedItem.kind !== 'opening') return;
    if (hVal !== null) obj.heightMm = Math.max(300, Math.min(2500, parseInt(hVal) || 2000));
    if (sillVal !== null) obj.sillMm = Math.max(0, Math.min(2100, parseInt(sillVal) || 0));
    saveHistorySnapshot();
}

function changeSelectedFixtureType(newType) {
    const obj = findSelectedObject();
    if (!obj || state.selectedItem.kind !== 'fixture') return;
    const def = FIXTURE_TYPES[newType];
    obj.type = newType;
    obj.w = def.wP;
    obj.h = def.hP;
    saveHistorySnapshot();
    showToast(`設備を「${def.label}」に変更しました`);
}

function resizeSelectedFixture(dwStep, dhStep) {
    const obj = findSelectedObject();
    if (!obj || state.selectedItem.kind !== 'fixture') return;
    const step = 1 / state.gridDivisions;
    obj.w = Math.max(0.25, Math.round((obj.w + dwStep * step) * 12) / 12);
    obj.h = Math.max(0.25, Math.round((obj.h + dhStep * step) * 12) / 12);
    saveHistorySnapshot();
}


function rotateFixturePreset() {
    state.subFixtureRot = ((state.subFixtureRot || 0) + 90) % 360;
    renderSubToolbar();
    request2DRedraw();
    showToast(`設備の配置向きを ${state.subFixtureRot}° に回転しました`);
}
window.rotateFixturePreset = rotateFixturePreset;

// キーボード 'R' キーでのワンタッチ90度回転
window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
        if (state.activeTool === 'fixture') {
            if (state.selectedItem && state.selectedItem.kind === 'fixture') {
                rotateSelectedFixture();
            } else {
                rotateFixturePreset();
            }
        } else if (state.activeTool === 'stair') {
            rotateStairPreset();
        }
    }
});

function rotateSelectedFixture() {
    const obj = findSelectedObject();
    if (!obj || state.selectedItem.kind !== 'fixture') return;
    const tmp = obj.w;
    obj.w = obj.h;
    obj.h = tmp;
    obj.rot = ((obj.rot || 0) + 90) % 360;
    saveHistorySnapshot();
    showToast('設備を90°回転しました');
}

function changeSelectedRoomType(newType) {
    const obj = findSelectedObject();
    if (!obj || state.selectedItem.kind !== 'room') return;
    obj.type = newType;
    obj.customName = ROOM_TYPES[newType].label;
    saveHistorySnapshot();
    updateAllMetricsAnd3D();
    renderPropertyInspector();
    request2DRedraw();
    const isEx = isFloorAreaExcludedRoom(obj);
    showToast(`部屋種別を「${obj.customName}」に変更しました${isEx ? ' (延床面積から除外)' : ''}`);
}

// --- Floor & Grid Subdivision Controls ---
function setFloor(fl) {
    state.currentFloor = fl;
    state.selectedItem = null;
    [1, 2, 3].forEach(n => {
        const btn = document.getElementById('btnFloor' + n);
        if (n === fl) {
            btn.className = 'px-2.5 py-1 rounded-md text-xs font-bold bg-blue-600 text-white shadow transition';
        } else {
            btn.className = 'px-2.5 py-1 rounded-md text-xs font-bold text-slate-300 hover:text-white transition';
        }
    });
    renderPropertyInspector();
    request2DRedraw();
    rebuild3DScene();
    showToast(`${fl}F (${fl}階) 編集モードに切り替えました`);
}

function toggleOnionSkin() {
    state.onionSkin = !state.onionSkin;
    const btn = document.getElementById('btnOnion');
    btn.className = state.onionSkin
        ? 'ml-1 px-2 py-1 rounded-md text-xs font-medium bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1'
        : 'ml-1 px-2 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700 flex items-center gap-1';
    request2DRedraw();
}

function setModulePitch(mm) {
    state.modulePitch = mm;
    document.getElementById('btnMod910').className = mm === 910
        ? 'px-2 py-1 rounded bg-slate-700 text-amber-300 font-semibold'
        : 'px-2 py-1 rounded text-slate-400 hover:text-white';
    document.getElementById('btnMod1000').className = mm === 1000
        ? 'px-2 py-1 rounded bg-slate-700 text-amber-300 font-semibold'
        : 'px-2 py-1 rounded text-slate-400 hover:text-white';
    document.getElementById('pitchBadge').textContent = `P=${mm}`;
    updateSnapSelectLabels();
    updateAllMetricsAnd3D();
    renderPropertyInspector();
    showToast(`建築モジュールを 1P = ${mm}mm に変更しました`);
}

function updateSnapSelectLabels() {
    const sel = document.getElementById('snapSelect');
    const p = state.modulePitch;
    sel.options[0].text = `1分割 (${p}mm)`;
    sel.options[1].text = `2分割 (${(p/2).toFixed(0)}mm)`;
    sel.options[2].text = `3分割 (${(p/3).toFixed(1)}mm)`;
    sel.options[3].text = `4分割 (${(p/4).toFixed(1)}mm)`;
    sel.options[4].text = `5分割 (${(p/5).toFixed(0)}mm)`;
    sel.options[5].text = `6分割 (${(p/6).toFixed(1)}mm)`;
}

function setGridDivision(divVal) {
    state.gridDivisions = parseInt(divVal) || 2;
    const mm = (state.modulePitch / state.gridDivisions).toFixed(1);
    request2DRedraw();
    showToast(`グリッドを ${state.gridDivisions}分割 (スナップ単位: 約${mm}mm) に変更しました`);
}

function toggleStylusMode() {
    state.stylusOnlyMode = !state.stylusOnlyMode;
    const btn = document.getElementById('btnStylusMode');
    const txt = document.getElementById('stylusText');
    if (state.stylusOnlyMode) {
        btn.className = 'px-2 py-1.5 rounded-lg text-xs font-semibold border border-amber-500/50 bg-amber-500/20 text-amber-300 flex items-center gap-1 transition';
        txt.textContent = 'ペン専用';
        showToast('ペン専用モードON：スタイラスペンで描画、指タッチで画面パン移動します');
    } else {
        btn.className = 'px-2 py-1.5 rounded-lg text-xs font-semibold border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 flex items-center gap-1 transition';
        txt.textContent = 'ペン＋指';
        showToast('ペン・指・マウス共通描画モードに切り替えました');
    }
}

function setViewMode(mode) {
    state.viewMode = mode;
    const p2d = document.getElementById('pane2d');
    const p3d = document.getElementById('pane3d');
    const b2d = document.getElementById('viewBtn2D');
    const bSp = document.getElementById('viewBtnSplit');
    const b3d = document.getElementById('viewBtn3D');

    [b2d, bSp, b3d].forEach(b => b.className = 'px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1 transition');

    if (mode === '2d') {
        b2d.className = 'px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow flex items-center gap-1 transition';
        p2d.className = 'w-full h-full relative bg-slate-950 overflow-hidden';
        p3d.className = 'hidden';
    } else if (mode === 'split') {
        bSp.className = 'px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow flex items-center gap-1 transition';
        p2d.className = 'w-1/2 h-full relative bg-slate-950 border-r border-slate-800 overflow-hidden';
        p3d.className = 'w-1/2 h-full relative bg-gradient-to-b from-slate-200 via-slate-100 to-slate-300 overflow-hidden';
    } else {
        b3d.className = 'px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow flex items-center gap-1 transition';
        p2d.className = 'hidden';
        p3d.className = 'w-full h-full relative bg-gradient-to-b from-slate-200 via-slate-100 to-slate-300 overflow-hidden';
    }
    handleResize();
}

// Global Window Export for Backward Compatibility
if (typeof window !== 'undefined') {
    window.selectTool = selectTool;
    window.renderSubToolbar = renderSubToolbar;
    window.renderPropertyInspector = renderPropertyInspector;
    window.changeSelectedOpeningType = changeSelectedOpeningType;
    window.setSelectedOpeningWidthP = setSelectedOpeningWidthP;
    window.setSelectedOpeningHeight = setSelectedOpeningHeight;
    window.changeSelectedFixtureType = changeSelectedFixtureType;
    window.resizeSelectedFixture = resizeSelectedFixture;
    window.rotateFixturePreset = rotateFixturePreset;
    window.rotateSelectedFixture = rotateSelectedFixture;
    window.changeSelectedRoomType = changeSelectedRoomType;
    window.setFloor = setFloor;
    window.toggleOnionSkin = toggleOnionSkin;
    window.setModulePitch = setModulePitch;
    window.updateSnapSelectLabels = updateSnapSelectLabels;
    window.setGridDivision = setGridDivision;
    window.toggleStylusMode = toggleStylusMode;
    window.setViewMode = setViewMode;
}
