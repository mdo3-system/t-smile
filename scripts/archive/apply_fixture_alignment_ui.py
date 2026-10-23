# -*- coding: utf-8 -*-
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_HTML = os.path.join(BASE_DIR, 'src', 'madori-sketch', 'index.source.html')

with open(SRC_HTML, 'r', encoding='utf-8') as f:
    text = f.read()

fx_align_ui = """
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
    } else if (state.activeTool === 'pen') {"""

target = """            container.appendChild(specGroup);
        }
    } else if (state.activeTool === 'pen') {"""

if target in text:
    text = text.replace(target, """            container.appendChild(specGroup);
        }""" + fx_align_ui, 1)
    print("Inserted fixture snap & clearance controls in subtoolbar!")
else:
    print("Warning: target not found!")

# 配置時の吸着処理を pointerdown 内に適用
old_fx_create = """        const newFx = {
            id: uid(),
            category: cat,"""

new_fx_create = """        // 壁自動吸着＆離れ寸法計算 (Phase 2)
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
            y: placeY,"""

# pointerdown 内の newFx の位置を置換
pdown_pos = text.find("} else if (state.activeTool === 'fixture') {")
fx_create_pos = text.find(old_fx_create, pdown_pos)
if fx_create_pos != -1:
    old_fx_block_end = text.find("x: snappedX,\n            y: snappedY,", fx_create_pos) + len("x: snappedX,\n            y: snappedY,")
    text = text[:fx_create_pos] + new_fx_create + text[old_fx_block_end:]
    print("Updated pointerdown to use wall snap & clearance!")
else:
    print("Warning: fx_create_pos not found")

with open(SRC_HTML, 'w', encoding='utf-8') as f:
    f.write(text)

print("Saved src/madori-sketch/index.source.html with fixture snap integration!")
