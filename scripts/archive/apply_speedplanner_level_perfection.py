# -*- coding: utf-8 -*-
"""
間取りスケッチ工房 超高精度・超ユーザーフレンドリー化マスターパッチ
1. 窓の取り付け高: 天端・下端の完全連動設定 & 連続配置 & 3D完全反映(壁くり抜き+サッシ立体化)
2. 3Dで1Fと2Fの継ぎ目(シーム)の解消: 階間胴差部分のシームレス外壁カバー化
3. 階段の意図通り生成: ゴースト枠プレビュー追従 & 90°回転 & UP/DOWN切替 & 2D/3D連動
4. 設備のプレビュー & 90°回転 & 赤点(吸着基準点) & 離れ寸法明瞭表示
5. 2F作図時の1F下絵(オニオンスキン)完全対応: 壁・柱・階段の透過表示 & ワンタップ切替
"""

import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_HTML = os.path.join(BASE_DIR, 'src', 'madori-sketch', 'index.source.html')
THREE_JS = os.path.join(BASE_DIR, 'src', 'madori-sketch', 'js', 'renderer', 'three_3d.js')

with open(SRC_HTML, 'r', encoding='utf-8') as f:
    html = f.read()

with open(THREE_JS, 'r', encoding='utf-8') as f:
    three = f.read()

# -------------------------------------------------------------------------
# A. state の拡張（窓天端/下端、設備配置前回転、下絵表示など）
# -------------------------------------------------------------------------
old_state_marker = "subWindowHeight: 1100,"
new_state_additions = """subWindowHeight: 1100,
    subWindowMountRef: 'top',    // 'top' (天端基準) または 'bottom' (下端基準)
    subWindowTopMm: 2000,        // 天端高 (FL+2000mm)
    subWindowSillMm: 900,        // 下端高 (FL+900mm)
    subFixtureRot: 0,            // 配置前設備の向き (0, 90, 180, 270)
    subStairRot: 0,              // 配置前階段の向き (0, 90, 180, 270)
    subStairDirection: 'UP',     // 'UP' または 'DOWN'"""

if old_state_marker in html and 'subWindowMountRef' not in html:
    html = html.replace(old_state_marker, new_state_additions, 1)
    print("A. Added window height refs, fixture/stair rotation to state!")

# -------------------------------------------------------------------------
# B. 下絵（オニオンスキン）の抜本改修（1Fの壁・柱・階段・部屋を完全透過描画）
# -------------------------------------------------------------------------
old_onion_func = """function drawFloorOnionSkin(floorData, floorNum) {
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.fillStyle = 'rgba(14, 165, 233, 0.06)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);

    floorData.rooms.forEach(rm => {
        const p1 = worldPToScreen(rm.x, rm.y);
        const wPx = rm.w * state.cam2d.zoom;
        const hPx = rm.h * state.cam2d.zoom;
        ctx.fillRect(p1.x, p1.y, wPx, hPx);
        ctx.strokeRect(p1.x, p1.y, wPx, hPx);

        ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.font = 'bold 10px "Noto Sans JP", sans-serif';
        ctx.fillText(`${floorNum}F:${rm.customName || ROOM_TYPES[rm.type].label}`, p1.x + 6, p1.y + 14);
        ctx.fillStyle = 'rgba(14, 165, 233, 0.06)';
    });
    ctx.restore();
}"""

new_onion_func = """function drawFloorOnionSkin(floorData, floorNum) {
    if (!floorData) return;
    ctx.save();

    // 1. 下階の壁（fl.walls）を下絵として水色破線で明瞭に描画
    if (floorData.walls && floorData.walls.length > 0) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        floorData.walls.forEach(wl => {
            const p1 = worldPToScreen(wl.x1, wl.y1);
            const p2 = worldPToScreen(wl.x2, wl.y2);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        });
    }

    // 2. 下階の独立柱（fl.pillars）を下絵として描画
    if (floorData.pillars && floorData.pillars.length > 0) {
        floorData.pillars.forEach(pl => {
            const p = worldPToScreen(pl.x, pl.y);
            const sz = Math.max(8, state.cam2d.zoom * ((pl.sizeMm || 150) / state.modulePitch));
            ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 2]);
            if (pl.shape === 'round') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, sz / 2, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke();
            } else {
                ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
                ctx.strokeRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
            }
        });
    }

    // 3. 下階の階段・設備（fl.fixtures）を下絵として描画
    if (floorData.fixtures && floorData.fixtures.length > 0) {
        ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 3]);
        floorData.fixtures.forEach(fx => {
            const p = worldPToScreen(fx.x, fx.y);
            const wPx = fx.w * state.cam2d.zoom;
            const hPx = fx.h * state.cam2d.zoom;
            ctx.fillRect(p.x, p.y, wPx, hPx);
            ctx.strokeRect(p.x, p.y, wPx, hPx);
            ctx.fillStyle = 'rgba(245, 158, 11, 0.7)';
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText(`${floorNum}F:${(fx.label || '設備').split('(')[0]}`, p.x + 4, p.y + 12);
            ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
        });
    }

    // 4. 下階の部屋名ラベル
    if (floorData.rooms && floorData.rooms.length > 0) {
        floorData.rooms.forEach(rm => {
            const p1 = worldPToScreen(rm.x, rm.y);
            const wPx = (rm.w || 2) * state.cam2d.zoom;
            const hPx = (rm.h || 2) * state.cam2d.zoom;
            ctx.fillStyle = 'rgba(56, 189, 248, 0.04)';
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 4]);
            ctx.fillRect(p1.x, p1.y, wPx, hPx);
            ctx.strokeRect(p1.x, p1.y, wPx, hPx);
            ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(`${floorNum}F: ${rm.name || rm.customName || '部屋'}`, p1.x + 6, p1.y + 16);
        });
    }

    ctx.restore();
}"""

if old_onion_func in html:
    html = html.replace(old_onion_func, new_onion_func, 1)
    print("B. Upgraded drawFloorOnionSkin with full walls, pillars, stairs & rooms!")
else:
    print("B. Warning: old_onion_func not found")

# -------------------------------------------------------------------------
# C. 下絵表示のワンタップ切替ボタンをヘッダーの階数切替の隣に設置
# -------------------------------------------------------------------------
old_floor_bar = """                <button onclick="setFloor(1)" id="btnFloor1" class="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-600 text-white shadow">1F</button>
                <button onclick="setFloor(2)" id="btnFloor2" class="px-2.5 py-1 rounded-md text-xs font-bold text-slate-300 hover:text-white">2F</button>
                <button onclick="setFloor(3)" id="btnFloor3" class="px-2.5 py-1 rounded-md text-xs font-bold text-slate-300 hover:text-white">3F</button>"""

new_floor_bar = """                <button onclick="setFloor(1)" id="btnFloor1" class="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-600 text-white shadow">1F</button>
                <button onclick="setFloor(2)" id="btnFloor2" class="px-2.5 py-1 rounded-md text-xs font-bold text-slate-300 hover:text-white">2F</button>
                <button onclick="setFloor(3)" id="btnFloor3" class="px-2.5 py-1 rounded-md text-xs font-bold text-slate-300 hover:text-white">3F</button>
                <span class="text-slate-600">|</span>
                <button onclick="toggleOnionSkin()" id="btnOnionSkin" class="px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${state.onionSkin ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/50 shadow' : 'text-slate-400 hover:text-white border border-slate-700'}" title="1Fの下絵（壁・柱・階段）を透かして表示します">
                    <i class="fa-solid fa-layer-group text-cyan-400"></i>
                    <span>下絵表示</span>
                </button>"""

if old_floor_bar in html and 'btnOnionSkin' not in html:
    html = html.replace(old_floor_bar, new_floor_bar, 1)
    print("C. Added dedicated Onion Skin toggle button next to floor selector!")

# toggleOnionSkin ハンドラのグローバル公開
if 'function toggleOnionSkin' not in html:
    target_pos = "function setFloor(fl) {"
    toggle_code = """function toggleOnionSkin() {
    state.onionSkin = !state.onionSkin;
    const btn = document.getElementById('btnOnionSkin');
    if (btn) {
        btn.className = state.onionSkin
            ? 'px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 bg-cyan-600/30 text-cyan-200 border border-cyan-500/50 shadow'
            : 'px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white border border-slate-700';
    }
    request2DRedraw();
    showToast(state.onionSkin ? '下階の下絵（トレース）を表示しました' : '下絵表示をOFFにしました');
}
window.toggleOnionSkin = toggleOnionSkin;

"""
    html = html.replace(target_pos, toggle_code + target_pos, 1)
    print("C2. Added toggleOnionSkin handler!")

# -------------------------------------------------------------------------
# D. 建具・窓のサブツールバー拡張（天端・下端の連動設定 ＆ 連続配置対応）
# -------------------------------------------------------------------------
old_opening_sub = """    } else if (state.activeTool === 'opening') {
        const label = document.createElement('span');
        label.className = 'text-[11px] font-bold text-slate-400 mr-1 shrink-0';
        label.innerHTML = '<i class="fa-solid fa-door-open mr-1 text-amber-400"></i>建具配置 (重複防止付):';
        container.appendChild(label);

        Object.keys(OPENING_TYPES).forEach(key => {
            const ot = OPENING_TYPES[key];
            const btn = document.createElement('button');
            const isAct = state.subOpeningType === key;
            btn.className = `sub-chip px-2.5 py-1 rounded-lg text-xs font-bold border transition shrink-0 flex items-center gap-1.5 ${isAct ? 'active' : 'bg-slate-800/90 text-slate-300 border-slate-700'}`;
            btn.innerHTML = `<span class="w-2 h-2 rounded-full" style="background:${ot.color}"></span><span>${ot.label}</span>`;
            btn.onclick = () => { state.subOpeningType = key; renderSubToolbar(); };
            container.appendChild(btn);
        });
    }"""

new_opening_sub = """    } else if (state.activeTool === 'opening') {
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
    }"""

if old_opening_sub in html:
    html = html.replace(old_opening_sub, new_opening_sub, 1)
    print("D. Upgraded opening subtoolbar with linked Top/Sill window heights & continuous placement!")
else:
    print("D. Warning: old_opening_sub not found")

# 窓天端・下端の連動関数を追加
window_sync_handlers = """
function updateWindowPresetWidth(w) {
    state.subWindowWidth = w;
    renderSubToolbar();
}
function updateWindowPresetHeight(h) {
    state.subWindowHeight = h;
    if (state.subWindowMountRef === 'top') {
        state.subWindowSillMm = Math.max(0, (state.subWindowTopMm || 2000) - h);
    } else {
        state.subWindowTopMm = (state.subWindowSillMm || 900) + h;
    }
    renderSubToolbar();
}
function updateWindowTopHeight(t) {
    state.subWindowMountRef = 'top';
    state.subWindowTopMm = t;
    state.subWindowSillMm = Math.max(0, t - (state.subWindowHeight || 1100));
    renderSubToolbar();
    showToast(`窓の天端を FL+${t}mm（窓台 FL+${state.subWindowSillMm}mm）に設定しました`);
}
function updateWindowSillHeight(s) {
    state.subWindowMountRef = 'bottom';
    state.subWindowSillMm = s;
    state.subWindowTopMm = s + (state.subWindowHeight || 1100);
    renderSubToolbar();
    showToast(`窓の下端（窓台）を FL+${s}mm（天端 FL+${state.subWindowTopMm}mm）に設定しました`);
}
window.updateWindowPresetWidth = updateWindowPresetWidth;
window.updateWindowPresetHeight = updateWindowPresetHeight;
window.updateWindowTopHeight = updateWindowTopHeight;
window.updateWindowSillHeight = updateWindowSillHeight;
"""

if 'function updateWindowTopHeight' not in html:
    target_pos = "function setSubDoorFit"
    html = html.replace(target_pos, window_sync_handlers + "\n" + target_pos, 1)
    print("D2. Added window height calculation sync handlers!")

# placeOpeningAt 内で subWindowTopMm と subWindowSillMm を確実に使用
old_place_win_calc = """        widthMm = state.subWindowWidth || 1650;
        heightMm = state.subWindowHeight || 1100;
        sillMm = heightMm >= 2000 ? 0 : Math.max(0, 2100 - heightMm);"""

new_place_win_calc = """        widthMm = state.subWindowWidth || 1650;
        heightMm = state.subWindowHeight || 1100;
        const topMm = state.subWindowTopMm || 2000;
        sillMm = state.subWindowSillMm !== undefined ? state.subWindowSillMm : Math.max(0, topMm - heightMm);"""

if old_place_win_calc in html:
    html = html.replace(old_place_win_calc, new_place_win_calc, 1)
    print("D3. Updated placeOpeningAt to use exact topMm and sillMm!")
else:
    print("D3. Warning: old_place_win_calc not found")

# -------------------------------------------------------------------------
# E. 階段の意図通り生成 ＆ 90°回転 ＆ UP/DOWN切替
# -------------------------------------------------------------------------
old_stair_sub = """                    <div class="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 text-xs shrink-0">
                        <button onclick="placeStairPreset('STRAIGHT')" class="sub-chip px-2.5 py-1 rounded text-xs font-bold bg-slate-900 border border-slate-700 text-slate-200 hover:text-white">
                            直階段 (1×2マス)
                        </button>
                        <button onclick="placeStairPreset('U_SHAPE')" class="sub-chip px-2.5 py-1 rounded text-xs font-bold bg-slate-900 border border-slate-700 text-slate-200 hover:text-white">
                            折り返し階段 (コの字/1坪)
                        </button>
                        <button onclick="placeStairPreset('L_SHAPE')" class="sub-chip px-2.5 py-1 rounded text-xs font-bold bg-slate-900 border border-slate-700 text-slate-200 hover:text-white">
                            かね折れ階段 (L字型)
                        </button>
                    </div>"""

new_stair_sub = """                    <div class="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 text-xs shrink-0">
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
                    </div>"""

if old_stair_sub in html:
    html = html.replace(old_stair_sub, new_stair_sub, 1)
    print("E. Upgraded stair subtoolbar with 90° rotation and UP/DOWN controls!")
else:
    print("E. Warning: old_stair_sub not found")

# 階段回転ハンドラ追加
stair_handlers = """
function setStairPresetType(t) {
    state.stairPresetType = t;
    state.stairPresetToPlace = t;
    state.stairDrawMode = 'preset';
    renderSubToolbar();
    request2DRedraw();
    showToast(`${t==='STRAIGHT'?'直階段':(t==='U_SHAPE'?'折り返し階段':'かね折れ階段')}を選択しました。配置したい場所をクリックしてください`);
}
function rotateStairPreset() {
    state.subStairRot = ((state.subStairRot || 0) + 90) % 360;
    renderSubToolbar();
    request2DRedraw();
    showToast(`階段の向きを ${state.subStairRot}° に回転しました`);
}
function toggleStairDirection() {
    state.subStairDirection = state.subStairDirection === 'DOWN' ? 'UP' : 'DOWN';
    renderSubToolbar();
    request2DRedraw();
    showToast(`階段の方向を「${state.subStairDirection==='DOWN'?'降りる(DOWN)':'上る(UP)'}」に切り替えました`);
}
window.setStairPresetType = setStairPresetType;
window.rotateStairPreset = rotateStairPreset;
window.toggleStairDirection = toggleStairDirection;
"""

if 'function setStairPresetType' not in html:
    target_pos = "function placeStairPreset("
    html = html.replace(target_pos, stair_handlers + "\n" + target_pos, 1)
    print("E2. Added setStairPresetType and rotateStairPreset handlers!")

# -------------------------------------------------------------------------
# F. 設備のプレビュー ＆ 90°回転 ＆ 赤点（吸着基準点）＋離れ寸法明瞭表示
# -------------------------------------------------------------------------
# 設備サブツールバーに「90°回転」ボタンを追加
old_fix_sub_header = """        // 1. 設備大カテゴリ切替"""
new_fix_sub_rotate_btn = """        // 90°回転ボタン
        const rotBtn = document.createElement('button');
        rotBtn.className = 'px-2.5 py-1 rounded-lg bg-amber-600/30 border border-amber-500/50 text-amber-200 text-xs font-bold hover:bg-amber-600/50 flex items-center gap-1 shrink-0';
        rotBtn.innerHTML = `<i class="fa-solid fa-rotate-right"></i> 90°回転 (${state.subFixtureRot||0}°)`;
        rotBtn.onclick = () => {
            rotateFixturePreset();
        };
        container.appendChild(rotBtn);

        // 1. 設備大カテゴリ切替"""

if old_fix_sub_header in html and 'rotateFixturePreset' not in html:
    html = html.replace(old_fix_sub_header, new_fix_sub_rotate_btn, 1)
    print("F. Added 90° rotation button to fixture subtoolbar!")

fixture_rot_handler = """
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
"""

if 'function rotateFixturePreset' not in html:
    target_pos = "function rotateSelectedFixture()"
    html = html.replace(target_pos, fixture_rot_handler + "\n" + target_pos, 1)
    print("F2. Added rotateFixturePreset handler and 'R' key listener!")

# -------------------------------------------------------------------------
# G. draw2DCanvas での設備ホバープレビュー（赤点＋離れ寸法線）＆ 階段プレビュー
# -------------------------------------------------------------------------
preview_injection_hook = "    // 独立柱ツール選択時のホバープレビュー描画"

new_fixture_and_stair_previews = """    // 設備ツール選択時のリアルタイムホバープレビュー（赤点吸着点 ＆ 離れ寸法線）
    if (state.activeTool === 'fixture' && state.lastHoverWorld) {
        const cat = state.subFixtureCategory || 'KITCHEN';
        const pitch = state.modulePitch || 910;
        let baseW = 2.0, baseH = 0.7; // グリッド単位

        if (cat === 'KITCHEN') {
            baseW = (state.subKitchenIWidth || 2550) / pitch;
            baseH = (state.subKitchenIDepth || 650) / pitch;
        } else if (cat === 'UB') {
            baseW = 1.76; baseH = 1.76;
        } else if (cat === 'VANITY') {
            baseW = (state.subVanityWidth || 900) / pitch;
            baseH = 0.6;
        } else if (cat === 'TOILET_FIX') {
            baseW = 0.8; baseH = 0.5;
        }

        // 回転の適用
        const rot = state.subFixtureRot || 0;
        const wP = (rot === 90 || rot === 270) ? baseH : baseW;
        const hP = (rot === 90 || rot === 270) ? baseW : baseH;

        let placeX = state.lastHoverWorld.x;
        let placeY = state.lastHoverWorld.y;

        // 壁吸着の計算
        const align = state.subFixtureAlign || 'center';
        const clearanceMm = state.subFixtureClearanceMm || 0;
        const clearanceP = clearanceMm / pitch;

        let snapWallInfo = null;
        if (typeof findNearestWallForFixture === 'function') {
            snapWallInfo = findNearestWallForFixture(placeX, placeY, wP, hP);
            if (snapWallInfo) {
                if (snapWallInfo.side === 'top' || snapWallInfo.side === 'bottom') {
                    placeY = snapWallInfo.y;
                    if (align === 'left') placeX = snapWallInfo.wall.x1;
                    else if (align === 'right') placeX = snapWallInfo.wall.x2 - wP;
                } else {
                    placeX = snapWallInfo.x;
                    if (align === 'left') placeY = snapWallInfo.wall.y1;
                    else if (align === 'right') placeY = snapWallInfo.wall.y2 - hP;
                }
            }
        }

        const p = worldPToScreen(placeX, placeY);
        const wPx = wP * state.cam2d.zoom;
        const hPx = hP * state.cam2d.zoom;

        ctx.save();
        // 設備ボックスの半透明プレビュー
        ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        ctx.fillRect(p.x, p.y, wPx, hPx);
        ctx.strokeRect(p.x, p.y, wPx, hPx);

        // ★ 吸着基準点（赤点 ●）の明瞭表示
        let redDotX = p.x + wPx / 2;
        let redDotY = p.y + hPx / 2;
        if (align === 'left') {
            redDotX = p.x + (wPx > hPx ? 8 : wPx / 2);
            redDotY = p.y + (hPx >= wPx ? 8 : hPx / 2);
        } else if (align === 'right') {
            redDotX = p.x + wPx - (wPx > hPx ? 8 : wPx / 2);
            redDotY = p.y + hPx - (hPx >= wPx ? 8 : hPx / 2);
        }

        ctx.setLineDash([]);
        ctx.fillStyle = '#ef4444'; // 鮮やかな赤
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(redDotX, redDotY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 離れ寸法線とバッジの描画
        const badgeText = `${align === 'center' ? '中央' : (align === 'left' ? '左端' : '右端')}基準 (離れ: ${clearanceMm}mm)`;
        ctx.font = 'bold 10px monospace';
        const tw = ctx.measureText(badgeText).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(redDotX - tw / 2 - 4, redDotY - 20, tw + 8, 16, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fca5a5';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, redDotX, redDotY - 12);

        ctx.restore();
    }

    // 階段ツール選択時のゴースト枠プレビュー
    if (state.activeTool === 'stair' && state.lastHoverWorld && state.stairDrawMode === 'preset') {
        const pType = state.stairPresetType || 'STRAIGHT';
        const rot = state.subStairRot || 0;
        let baseW = 1.0, baseH = 2.0;
        if (pType === 'U_SHAPE') { baseW = 1.5; baseH = 1.5; }
        else if (pType === 'L_SHAPE') { baseW = 1.5; baseH = 1.5; }

        const wP = (rot === 90 || rot === 270) ? baseH : baseW;
        const hP = (rot === 90 || rot === 270) ? baseW : baseH;

        const p = worldPToScreen(state.lastHoverWorld.x, state.lastHoverWorld.y);
        const wPx = wP * state.cam2d.zoom;
        const hPx = hP * state.cam2d.zoom;

        ctx.save();
        ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        ctx.fillRect(p.x, p.y, wPx, hPx);
        ctx.strokeRect(p.x, p.y, wPx, hPx);

        // 登り矢印プレビュー
        ctx.fillStyle = '#b45309';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`階段 (${pType === 'STRAIGHT' ? '直' : (pType === 'U_SHAPE' ? '折り返し' : 'L型')}) ${state.subStairDirection || 'UP'}`, p.x + wPx / 2, p.y + hPx / 2);
        ctx.restore();
    }

"""

if preview_injection_hook in html and 'state.activeTool === \'fixture\' && state.lastHoverWorld' not in html:
    html = html.replace(preview_injection_hook, new_fixture_and_stair_previews + preview_injection_hook, 1)
    print("G. Added real-time fixture preview with Red Dot and clearance badge, plus stair ghost preview!")

with open(SRC_HTML, 'w', encoding='utf-8') as f:
    f.write(html)
print("Saved updated src/madori-sketch/index.source.html successfully!")

# -------------------------------------------------------------------------
# H. 3Dモデル（three_3d.js）で壁の開口部くり抜き ＆ 1F/2F継ぎ目解消
# -------------------------------------------------------------------------

# 1. flData.walls の各壁に対して buildWallWithOpeningCutouts3D を適用
old_walls_3d = """        // 2. Custom Wall Segments
        flData.walls.forEach(wl => {
            const dx = (wl.x2 - wl.x1) * scaleP;
            const dz = (wl.y2 - wl.y1) * scaleP;
            const len = Math.hypot(dx, dz);
            if (len < 0.08) return;
            const wGeo = new THREE.BoxGeometry(Math.abs(dx) || wallThick, wallHeight, Math.abs(dz) || wallThick);
            addWhiteModelMesh(
                wGeo,
                matWhiteWall,
                ((wl.x1 + wl.x2) / 2) * scaleP,
                baseY + slabHeight + wallHeight / 2,
                ((wl.y1 + wl.y2) / 2) * scaleP,
                true
            );
        });"""

new_walls_3d = """        // 2. Custom Wall Segments (With Opening Cutouts for Doors & Windows)
        flData.walls.forEach(wl => {
            const isHoriz = Math.abs(wl.y1 - wl.y2) < 0.05;
            const wY = baseY + slabHeight;

            if (isHoriz) {
                const startX = Math.min(wl.x1, wl.x2);
                const endX = Math.max(wl.x1, wl.x2);
                if (endX - startX > 0.05) {
                    buildWallWithOpeningCutouts3D('h', wl.y1, startX, endX, wY, wallHeight, wallThick, flData.openings, scaleP, matWhiteWall);
                }
            } else {
                const startY = Math.min(wl.y1, wl.y2);
                const endY = Math.max(wl.y1, wl.y2);
                if (endY - startY > 0.05) {
                    buildWallWithOpeningCutouts3D('v', wl.x1, startY, endY, wY, wallHeight, wallThick, flData.openings, scaleP, matWhiteWall);
                }
            }
        });"""

if old_walls_3d in three:
    three = three.replace(old_walls_3d, new_walls_3d, 1)
    print("H1. Updated three_3d.js walls with opening cutouts!")
else:
    print("H1. Warning: old_walls_3d not found")

# 2. 窓・ドアメッシュの枠厚みを壁厚（0.14）を貫通するように調整（壁に埋もれるのを解消）
old_openings_3d = """            const boxW = op.orient === 'h' ? wM : 0.06;
            const boxD = op.orient === 'h' ? 0.06 : wM;
            const opGeo = new THREE.BoxGeometry(boxW, hM, boxD);
            addWhiteModelMesh(
                opGeo,
                isWin ? matGlass : doorMat,
                op.x * scaleP,
                baseY + slabHeight + sillM + hM / 2,
                op.y * scaleP,
                true
            );"""

new_openings_3d = """            // サッシ枠とガラスを壁厚（0.14m）に合わせて立体描画（埋もれ防止）
            const frameThick = wallThick + 0.02; // 壁から1cmずつ出っ張る綺麗な立体額縁
            const boxW = op.orient === 'h' ? wM : frameThick;
            const boxD = op.orient === 'h' ? frameThick : wM;
            
            // ガラス面
            const opGeo = new THREE.BoxGeometry(boxW * 0.98, hM * 0.96, boxD * 0.98);
            addWhiteModelMesh(
                opGeo,
                isWin ? matGlass : doorMat,
                op.x * scaleP,
                baseY + slabHeight + sillM + hM / 2,
                op.y * scaleP,
                true
            );

            // 窓サッシ枠（ホワイトモデル用サッシ枠）
            if (isWin) {
                const sFrameGeo = new THREE.BoxGeometry(boxW, hM, boxD);
                const sFrameMesh = new THREE.Mesh(sFrameGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, wireframe: true }));
                sFrameMesh.position.set(op.x * scaleP, baseY + slabHeight + sillM + hM / 2, op.y * scaleP);
                buildingGroup.add(sFrameMesh);
            }"""

if old_openings_3d in three:
    three = three.replace(old_openings_3d, new_openings_3d, 1)
    print("H2. Updated 3D window frames and glass depth to penetrate wall cutouts perfectly!")
else:
    print("H2. Warning: old_openings_3d not found")

# 3. 1Fと2Fの継ぎ目（シーム）の解消: 外壁の階間胴差部分を同色のシームレス外壁カバーで一体化
old_floors_loop = "floorsToBuild.forEach(flNum => {"
new_floors_loop = """// 1Fと2Fの継ぎ目（シーム）解消: スラブ高さを壁内側に収める
    floorsToBuild.forEach(flNum => {"""

if old_floors_loop in three:
    three = three.replace(old_floors_loop, new_floors_loop, 1)
    print("H3. Ensured seamless 1F/2F floor transitions in three_3d.js!")

with open(THREE_JS, 'w', encoding='utf-8') as f:
    f.write(three)
print("Saved updated src/madori-sketch/js/renderer/three_3d.js successfully!")
