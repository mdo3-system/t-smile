# -*- coding: utf-8 -*-
"""
壁・独立柱の完全UIUX改修スクリプト
1. 左ツールバーに「壁」と「独立柱」を個別に明確化
2. サブツールバーで独立柱のサイズ（105角・120角・150角・丸柱）を選択可能に
3. キャンバスクリックで即座に独立柱を配置（1クリックでポン置き）
4. 壁は「始点クリック→リアルタイム寸法プレビュー→終点クリック」または「ドラッグ」の両対応＋明確なガイダンストースト
5. ホバー時のプレビュー描画（柱枠・壁プレビュー・寸法バッジ）
6. 3Dモデルへの太さ・形状反映
"""

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_HTML = os.path.join(BASE_DIR, 'src', 'madori-sketch', 'index.source.html')
THREE_JS = os.path.join(BASE_DIR, 'src', 'madori-sketch', 'js', 'renderer', 'three_3d.js')

with open(SRC_HTML, 'r', encoding='utf-8') as f:
    html = f.read()

# -------------------------------------------------------------------------
# 1. 左ツールバーの更新（「壁」と「独立柱」を独立配置）
# -------------------------------------------------------------------------
old_wall_btn = """            <button onclick="selectTool('wall')" id="tool_wall" class="tool-btn active w-12 sm:w-16 py-2 rounded-xl border border-slate-700/80 bg-slate-800/70 flex flex-col items-center gap-1 text-slate-300">
                <i class="fa-solid fa-grip-lines-vertical text-base"></i>
                <span class="text-[10px] font-bold leading-none">壁・独立柱</span>
            </button>"""

new_wall_and_pillar_btns = """            <button onclick="selectTool('wall')" id="tool_wall" class="tool-btn active w-12 sm:w-16 py-2 rounded-xl border border-slate-700/80 bg-slate-800/70 flex flex-col items-center gap-1 text-slate-300">
                <i class="fa-solid fa-grip-lines-vertical text-base"></i>
                <span class="text-[10px] font-bold leading-none">壁</span>
            </button>

            <button onclick="selectTool('pillar')" id="tool_pillar" class="tool-btn w-12 sm:w-16 py-2 rounded-xl border border-slate-700/80 bg-slate-800/70 flex flex-col items-center gap-1 text-amber-300">
                <i class="fa-solid fa-square text-base"></i>
                <span class="text-[10px] font-bold leading-none">独立柱</span>
            </button>"""

if old_wall_btn in html:
    html = html.replace(old_wall_btn, new_wall_and_pillar_btns, 1)
    print("1. Updated toolbar with separate Wall and Pillar buttons!")
else:
    print("1. Warning: old_wall_btn not found")

# -------------------------------------------------------------------------
# 2. state の更新（subPillarSize, subPillarShape）
# -------------------------------------------------------------------------
target_state = "subWallType: 'exterior',"
new_state_add = """subWallType: 'exterior',
    subPillarSize: 150,          // 105, 120, 150, 200 mm
    subPillarShape: 'square',    // 'square', 'round'"""

if target_state in html and 'subPillarSize' not in html:
    html = html.replace(target_state, new_state_add, 1)
    print("2. Added subPillarSize and subPillarShape to state!")

# -------------------------------------------------------------------------
# 3. サブツールバーの更新（wall と pillar の表示）
# -------------------------------------------------------------------------
old_sub_wall = """    } else if (state.activeTool === 'wall') {
        container.innerHTML = `
            <span class="text-[11px] font-bold text-slate-400 mr-1"><i class="fa-solid fa-grip-lines mr-1 text-blue-400"></i>壁・独立柱:</span>
            <button onclick="state.subWallType='exterior';renderSubToolbar();" class="sub-chip px-2.5 py-1 rounded-lg text-xs font-bold border ${state.subWallType==='exterior'?'active':'bg-slate-800 text-slate-300 border-slate-700'}">外壁・耐力壁 (150mm)</button>
            <button onclick="state.subWallType='interior';renderSubToolbar();" class="sub-chip px-2.5 py-1 rounded-lg text-xs font-bold border ${state.subWallType==='interior'?'active':'bg-slate-800 text-slate-300 border-slate-700'}">間仕切壁 (100mm)</button>
            <button onclick="state.subWallType='pillar';renderSubToolbar();" class="sub-chip px-2.5 py-1 rounded-lg text-xs font-bold border ${state.subWallType==='pillar'?'active':'bg-slate-800 text-slate-300 border-slate-700'}"><i class="fa-solid fa-square mr-1 text-amber-300"></i>独立柱 (ポーチ・バルコニー脚)</button>
            <span class="text-[11px] text-cyan-300 font-bold ml-1 hidden lg:inline"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i>壁を四角やL字に閉じて囲むと自動的に部屋が作成されます（部屋名は後から設定可能）</span>
        `;"""

new_sub_wall_and_pillar = """    } else if (state.activeTool === 'wall') {
        container.innerHTML = `
            <span class="text-[11px] font-bold text-slate-400 mr-1"><i class="fa-solid fa-grip-lines mr-1 text-blue-400"></i>壁種別:</span>
            <button onclick="state.subWallType='exterior';renderSubToolbar();" class="sub-chip px-2.5 py-1 rounded-lg text-xs font-bold border ${state.subWallType==='exterior'?'active':'bg-slate-800 text-slate-300 border-slate-700'}">外壁・耐力壁 (150mm)</button>
            <button onclick="state.subWallType='interior';renderSubToolbar();" class="sub-chip px-2.5 py-1 rounded-lg text-xs font-bold border ${state.subWallType==='interior'?'active':'bg-slate-800 text-slate-300 border-slate-700'}">間仕切壁 (100mm)</button>
            <button onclick="selectTool('pillar');" class="sub-chip px-2.5 py-1 rounded-lg text-xs font-bold border bg-slate-800 text-slate-300 border-slate-700 hover:text-amber-300"><i class="fa-solid fa-square mr-1 text-amber-300"></i>独立柱ツールへ</button>
            <span class="text-[11px] text-cyan-300 font-bold ml-1 hidden lg:inline"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i>壁を四角やL字に閉じて囲むと自動的に部屋が作成されます</span>
        `;
    } else if (state.activeTool === 'pillar') {
        container.innerHTML = `
            <span class="text-[11px] font-bold text-slate-400 mr-1"><i class="fa-solid fa-square mr-1 text-amber-300"></i>独立柱サイズ:</span>
            <button onclick="state.subPillarSize=105;state.subPillarShape='square';renderSubToolbar();" class="sub-chip px-2.5 py-1 rounded-lg text-xs font-bold border ${(state.subPillarSize===105&&state.subPillarShape==='square')?'active':'bg-slate-800 text-slate-300 border-slate-700'}">105角 (一般柱)</button>
            <button onclick="state.subPillarSize=120;state.subPillarShape='square';renderSubToolbar();" class="sub-chip px-2.5 py-1 rounded-lg text-xs font-bold border ${(state.subPillarSize===120&&state.subPillarShape==='square')?'active':'bg-slate-800 text-slate-300 border-slate-700'}">120角 (大黒柱)</button>
            <button onclick="state.subPillarSize=150;state.subPillarShape='square';renderSubToolbar();" class="sub-chip px-2.5 py-1 rounded-lg text-xs font-bold border ${(state.subPillarSize===150&&state.subPillarShape==='square')?'active':'bg-slate-800 text-slate-300 border-slate-700'}">150角 (ポーチ・脚/標準)</button>
            <button onclick="state.subPillarSize=150;state.subPillarShape='round';renderSubToolbar();" class="sub-chip px-2.5 py-1 rounded-lg text-xs font-bold border ${(state.subPillarShape==='round')?'active':'bg-slate-800 text-slate-300 border-slate-700'}"><i class="fa-solid fa-circle mr-1 text-amber-300"></i>丸柱 (φ150 化粧柱)</button>
            <span class="text-[11px] text-amber-300 font-bold ml-1 hidden lg:inline"><i class="fa-solid fa-hand-pointer mr-1"></i>キャンバスをクリックして独立柱を配置（1クリックで即時作成）</span>
        `;"""

if old_sub_wall in html:
    html = html.replace(old_sub_wall, new_sub_wall_and_pillar, 1)
    print("3. Updated subtoolbar for wall and pillar!")
else:
    print("3. Warning: old_sub_wall not found")

# -------------------------------------------------------------------------
# 4. setPointerCapture の try-catch 保護
# -------------------------------------------------------------------------
old_capture = "canvas2d.setPointerCapture(e.pointerId);"
new_capture = "try { canvas2d.setPointerCapture(e.pointerId); } catch (_) {}"
if old_capture in html:
    html = html.replace(old_capture, new_capture, 1)
    print("4. Protected setPointerCapture with try-catch!")

# -------------------------------------------------------------------------
# 5. pointerdown での pillar および wall 処理
# -------------------------------------------------------------------------
target_down_block = """    } else if (state.activeTool === 'wall') {
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

new_down_block = """    } else if (state.activeTool === 'pillar' || (state.activeTool === 'wall' && state.subWallType === 'pillar')) {
        const pSize = state.subPillarSize || 150;
        const pShape = state.subPillarShape || 'square';
        const newPillar = { id: uid(), x: snappedX, y: snappedY, sizeMm: pSize, shape: pShape };
        fl.pillars.push(newPillar);
        state.selectedItem = { kind: 'pillar', id: newPillar.id, floor: state.currentFloor };
        saveHistorySnapshot();
        renderPropertyInspector();
        request2DRedraw();
        if (typeof rebuild3DScene === 'function') rebuild3DScene();
        showToast(`独立柱 (${pShape === 'round' ? 'φ' : ''}${pSize}mm) を配置しました`);
        return;
    } else if (state.activeTool === 'wall') {
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
    }"""

if target_down_block in html:
    html = html.replace(target_down_block, new_down_block, 1)
    print("5. Updated pointerdown pillar and wall handlers!")
else:
    print("5. Warning: target_down_block not found")

# -------------------------------------------------------------------------
# 6. pointermove でのホバー追従と寸法計算
# -------------------------------------------------------------------------
old_pmove_hover = "state.lastHoverWorld = { x: snappedX, y: snappedY };"
new_pmove_hover = """state.lastHoverWorld = { x: snappedX, y: snappedY };
    if (state.activeTool === 'pillar' || (state.activeTool === 'wall' && state.wallClickStart)) {
        request2DRedraw();
    }"""

if old_pmove_hover in html and 'state.activeTool === \'pillar\'' not in html:
    html = html.replace(old_pmove_hover, new_pmove_hover, 1)
    print("6. Added hover redraw for pillar and wall preview!")

# -------------------------------------------------------------------------
# 7. draw2DCanvas での独立柱プレビューと壁寸法付きプレビュー
# -------------------------------------------------------------------------
old_wall_preview_block = """// 壁クリック＆クリック入力中のプレビュー描画
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
    }"""

new_wall_preview_block = """// 独立柱ツール選択時のホバープレビュー描画
    if (state.activeTool === 'pillar' && state.lastHoverWorld) {
        const hp = worldPToScreen(state.lastHoverWorld.x, state.lastHoverWorld.y);
        const pSize = state.subPillarSize || 150;
        const pShape = state.subPillarShape || 'square';
        const sz = Math.max(12, state.cam2d.zoom * (pSize / state.modulePitch));
        ctx.save();
        ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        if (pShape === 'round') {
            ctx.beginPath();
            ctx.arc(hp.x, hp.y, sz / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(hp.x - sz / 2, hp.y - sz / 2, sz, sz);
            ctx.strokeRect(hp.x - sz / 2, hp.y - sz / 2, sz, sz);
        }
        // 十字ガイド
        ctx.beginPath();
        ctx.moveTo(hp.x - sz / 2, hp.y); ctx.lineTo(hp.x + sz / 2, hp.y);
        ctx.moveTo(hp.x, hp.y - sz / 2); ctx.lineTo(hp.x, hp.y + sz / 2);
        ctx.stroke();

        // 寸法ラベル
        ctx.setLineDash([]);
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${pShape === 'round' ? 'φ' : ''}${pSize}柱`, hp.x, hp.y - sz / 2 - 6);
        ctx.restore();
    }

    // 壁作図中の始点マーカー＆寸法付きプレビュー描画
    if (state.activeTool === 'wall' && state.wallClickStart) {
        const hoverPt = (state.dragAction && state.dragAction.type === 'wall')
            ? { x: state.dragAction.curX, y: state.dragAction.curY }
            : (state.lastHoverWorld || state.wallClickStart);

        // 直交スナップ（水平または垂直）
        const dx = Math.abs(hoverPt.x - state.wallClickStart.x);
        const dy = Math.abs(hoverPt.y - state.wallClickStart.y);
        const targetPt = dx >= dy
            ? { x: hoverPt.x, y: state.wallClickStart.y }
            : { x: state.wallClickStart.x, y: hoverPt.y };

        const p1 = worldPToScreen(state.wallClickStart.x, state.wallClickStart.y);
        const p2 = worldPToScreen(targetPt.x, targetPt.y);

        ctx.save();
        // 1. 始点パルスマーカー
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();

        // 2. プレビュー線
        if (state.wallClickStart.x !== targetPt.x || state.wallClickStart.y !== targetPt.y) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = state.subWallType === 'interior' ? 6 : 8;
            ctx.setLineDash([8, 4]);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // 3. 寸法バッジ
            const distP = Math.hypot(targetPt.x - state.wallClickStart.x, targetPt.y - state.wallClickStart.y);
            const distMm = Math.round(distP * state.modulePitch);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;

            ctx.setLineDash([]);
            ctx.font = 'bold 11px monospace';
            const badgeText = `${distMm}mm (${distP.toFixed(1)}P)`;
            const textW = ctx.measureText(badgeText).width;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(midX - textW / 2 - 6, midY - 18, textW + 12, 20, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#38bdf8';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badgeText, midX, midY - 8);
        }
        ctx.restore();
    }"""

if old_wall_preview_block in html:
    html = html.replace(old_wall_preview_block, new_wall_preview_block, 1)
    print("7. Updated draw2DCanvas with pillar and wall preview & dimension badges!")
else:
    print("7. Warning: old_wall_preview_block not found")

# -------------------------------------------------------------------------
# 8. drawStandalonePillar2D の丸柱・サイズ対応
# -------------------------------------------------------------------------
old_draw_pillar = """function drawStandalonePillar2D(pl) {
    const p = worldPToScreen(pl.x, pl.y);
    const sz = Math.max(8, state.cam2d.zoom * 0.22);
    ctx.save();
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    ctx.strokeRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    // Cross mark inside standalone pillar
    ctx.beginPath();
    ctx.moveTo(p.x - sz / 2, p.y - sz / 2); ctx.lineTo(p.x + sz / 2, p.y + sz / 2);
    ctx.moveTo(p.x + sz / 2, p.y - sz / 2); ctx.lineTo(p.x - sz / 2, p.y + sz / 2);
    ctx.stroke();
    ctx.restore();
}"""

new_draw_pillar = """function drawStandalonePillar2D(pl) {
    const p = worldPToScreen(pl.x, pl.y);
    const pSize = pl.sizeMm || 150;
    const sz = Math.max(8, state.cam2d.zoom * (pSize / state.modulePitch));
    const isSelected = state.selectedItem && state.selectedItem.kind === 'pillar' && state.selectedItem.id === pl.id;

    ctx.save();
    ctx.fillStyle = isSelected ? '#fef08a' : '#f8fafc';
    ctx.strokeStyle = isSelected ? '#f59e0b' : '#0f172a';
    ctx.lineWidth = isSelected ? 3 : 2;

    if (pl.shape === 'round') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    } else {
        ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
        ctx.strokeRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    }

    // Cross mark inside standalone pillar
    ctx.strokeStyle = isSelected ? '#d97706' : '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.x - sz / 2, p.y - sz / 2); ctx.lineTo(p.x + sz / 2, p.y + sz / 2);
    ctx.moveTo(p.x + sz / 2, p.y - sz / 2); ctx.lineTo(p.x - sz / 2, p.y + sz / 2);
    ctx.stroke();

    // 選択時のハイライト枠
    if (isSelected) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect(p.x - sz / 2 - 4, p.y - sz / 2 - 4, sz + 8, sz + 8);
    }

    ctx.restore();
}"""

if old_draw_pillar in html:
    html = html.replace(old_draw_pillar, new_draw_pillar, 1)
    print("8. Updated drawStandalonePillar2D with round shape, custom sizes & selection highlight!")
else:
    print("8. Warning: old_draw_pillar not found")

# -------------------------------------------------------------------------
# 9. インスペクタの独立柱プロパティ拡充
# -------------------------------------------------------------------------
old_pillar_inspect = """    } else if (kind === 'pillar') {
        panel.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                <span class="text-xs font-bold text-white"><i class="fa-solid fa-square text-amber-400 mr-1.5"></i>独立柱 (ポーチ・バルコニー脚)</span>
                <div class="flex items-center gap-1">
                    <button onclick="deleteSelectedItem()" class="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-[11px] text-rose-200 font-bold">削除</button>
                    <button onclick="state.selectedItem=null;renderPropertyInspector();request2DRedraw();" class="text-slate-400 hover:text-white px-1.5"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            <div class="text-xs text-slate-300">ドラッグして位置を移動できます。3Dホワイトモデルで単独柱として表示されます。</div>
        `;
    }"""

new_pillar_inspect = """    } else if (kind === 'pillar') {
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
    }"""

if old_pillar_inspect in html:
    html = html.replace(old_pillar_inspect, new_pillar_inspect, 1)
    print("9. Updated inspector for pillar customization!")
else:
    print("9. Warning: old_pillar_inspect not found")

# changeSelectedPillarSpec ハンドラをグローバル関数として追加
if 'function changeSelectedPillarSpec' not in html:
    handler_target = "function deleteSelectedItem()"
    new_handler = """function changeSelectedPillarSpec(sizeMm, shape) {
    if (!state.selectedItem || state.selectedItem.kind !== 'pillar') return;
    const fl = state.floors[state.selectedItem.floor || state.currentFloor];
    const pl = fl.pillars.find(p => p.id === state.selectedItem.id);
    if (!pl) return;
    pl.sizeMm = sizeMm;
    pl.shape = shape;
    saveHistorySnapshot();
    renderPropertyInspector();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast(`独立柱を ${shape === 'round' ? 'φ' : ''}${sizeMm}mm に変更しました`);
}
window.changeSelectedPillarSpec = changeSelectedPillarSpec;

""" + handler_target
    html = html.replace(handler_target, new_handler, 1)
    print("10. Added changeSelectedPillarSpec handler!")

with open(SRC_HTML, 'w', encoding='utf-8') as f:
    f.write(html)

print("Saved updated src/madori-sketch/index.source.html successfully!")

# -------------------------------------------------------------------------
# 11. 3Dモデル（three_3d.js）で柱の丸柱・サイズ対応
# -------------------------------------------------------------------------
with open(THREE_JS, 'r', encoding='utf-8') as f:
    three_text = f.read()

old_3d_pillar = """        // Standalone Pillars (独立柱: ポーチ柱・バルコニー支柱)
        flData.pillars.forEach(pl => {
            const pillarGeo = new THREE.BoxGeometry(0.15, wallHeight, 0.15);
            const pillarMesh = new THREE.Mesh(pillarGeo, matWhiteWall);
            const cx = pl.x * pitchM;
            const cz = pl.y * pitchM;
            pillarMesh.position.set(cx, baseY + wallHeight / 2, cz);
            pillarMesh.castShadow = true;
            pillarMesh.receiveShadow = true;
            buildingGroup.add(pillarMesh);
        });"""

new_3d_pillar = """        // Standalone Pillars (独立柱: ポーチ柱・バルコニー支柱 - 角柱・丸柱・サイズ対応)
        flData.pillars.forEach(pl => {
            const pSizeM = (pl.sizeMm ? pl.sizeMm / 1000 : 0.15);
            let pillarGeo;
            if (pl.shape === 'round') {
                pillarGeo = new THREE.CylinderGeometry(pSizeM / 2, pSizeM / 2, wallHeight, 16);
            } else {
                pillarGeo = new THREE.BoxGeometry(pSizeM, wallHeight, pSizeM);
            }
            const pillarMesh = new THREE.Mesh(pillarGeo, matWhiteWall);
            const cx = pl.x * pitchM;
            const cz = pl.y * pitchM;
            pillarMesh.position.set(cx, baseY + wallHeight / 2, cz);
            pillarMesh.castShadow = true;
            pillarMesh.receiveShadow = true;
            buildingGroup.add(pillarMesh);
        });"""

if old_3d_pillar in three_text:
    three_text = three_text.replace(old_3d_pillar, new_3d_pillar, 1)
    with open(THREE_JS, 'w', encoding='utf-8') as f:
        f.write(three_text)
    print("11. Updated three_3d.js with 3D round pillar and custom sizes!")
else:
    print("11. Warning: old_3d_pillar not found in three_3d.js")
