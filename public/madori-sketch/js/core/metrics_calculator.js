/**
 * 住ま居る 3D間取り工房 (MadoriSketch)
 * リアルタイム面積集計（各階・全体の床面積＆内壁面積）＆壁直下率エンジン
 * (Single Responsibility: Architectural Metrics & Wall Area / Alignment Calculator)
 */

function getRoomAreaM2(rm) {
    if (!rm) return 0;
    const pitchM = (state.modulePitch || 910) / 1000;
    if (Array.isArray(rm.points) && rm.points.length >= 3) {
        let sum = 0;
        for (let i = 0; i < rm.points.length; i++) {
            const j = (i + 1) % rm.points.length;
            sum += rm.points[i].x * rm.points[j].y - rm.points[j].x * rm.points[i].y;
        }
        const polyAreaM2 = Math.abs(sum) * 0.5 * pitchM * pitchM;
        if (polyAreaM2 > 0) return polyAreaM2;
    }
    if (typeof rm.areaM2 === 'number' && rm.areaM2 > 0) {
        return rm.areaM2;
    }
    if (rm.w && rm.h) {
        return (rm.w * pitchM) * (rm.h * pitchM);
    }
    return 0;
}
window.getRoomAreaM2 = getRoomAreaM2;

function isFloorAreaExcludedRoom(rm) {
    if (!rm) return false;
    if (rm.excludeFloorArea === false) return false;
    if (rm.excludeFloorArea === true) return true;
    const t = (rm.type || '').toUpperCase();
    const name = (rm.customName || rm.name || '').toLowerCase();
    // 吹抜・バルコニー・ポーチ・中庭・天井面・畳単体オーバーレイは延床面積二重計上から除外
    if (t === 'VOID' || t === 'BALCONY' || t === 'PORCH' || t === 'NAKANIWA' || t === 'TENJO' || t === 'TATAMI' || t === 'KOAGARI') return true;
    if (name.includes('吹抜') || name.includes('吹き抜け') || name.includes('void') ||
        name.includes('バルコニー') || name.includes('ベランダ') || name.includes('balcony') ||
        name.includes('ポーチ') || name.includes('porch') || name.includes('中庭')) {
        return true;
    }
    return false;
}
window.isFloorAreaExcludedRoom = isFloorAreaExcludedRoom;

/**
 * 指定階の床面積（㎡）を計算
 */
function getRoomPolygonPoints(rm) {
    if (!rm) return null;
    if (Array.isArray(rm.points) && rm.points.length >= 3) return rm.points;
    if (rm.w > 0 && rm.h > 0) {
        return [
            { x: rm.x, y: rm.y },
            { x: rm.x + rm.w, y: rm.y },
            { x: rm.x + rm.w, y: rm.y + rm.h },
            { x: rm.x, y: rm.y + rm.h }
        ];
    }
    return null;
}

function calcPolygonsUnionAreaP2(polys) {
    if (!polys || polys.length === 0) return 0;
    const ys = [];
    const segs = [];
    polys.forEach(pts => {
        for (let i = 0; i < pts.length; i++) {
            const p1 = pts[i];
            const p2 = pts[(i + 1) % pts.length];
            ys.push(p1.y);
            if (Math.abs(p1.y - p2.y) > 1e-7) {
                segs.push([p1.x, p1.y, p2.x, p2.y]);
            }
        }
    });
    // 辺同士の交点Y座標もスキャンライン分割点に追加（斜め辺交差も厳密化）
    for (let i = 0; i < segs.length; i++) {
        const [ax, ay, bx, by] = segs[i];
        for (let j = i + 1; j < segs.length; j++) {
            const [cx, cy, dx, dy] = segs[j];
            const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
            if (Math.abs(den) < 1e-9) continue;
            const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den;
            const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
            if (t > 1e-6 && t < 1 - 1e-6 && u > 1e-6 && u < 1 - 1e-6) {
                ys.push(ay + t * (by - ay));
            }
        }
    }
    ys.sort((a, b) => a - b);
    const uniqY = [];
    for (const y of ys) {
        if (uniqY.length === 0 || y - uniqY[uniqY.length - 1] > 1e-6) uniqY.push(y);
    }

    let totalArea = 0;
    for (let k = 0; k < uniqY.length - 1; k++) {
        const y0 = uniqY[k];
        const y1 = uniqY[k + 1];
        const dy = y1 - y0;
        if (dy <= 1e-6) continue;
        const ym = (y0 + y1) * 0.5;
        const intervals = [];
        for (const pts of polys) {
            const xs = [];
            for (let i = 0; i < pts.length; i++) {
                const p1 = pts[i];
                const p2 = pts[(i + 1) % pts.length];
                if ((p1.y <= ym && p2.y > ym) || (p2.y <= ym && p1.y > ym)) {
                    xs.push(p1.x + (ym - p1.y) * (p2.x - p1.x) / (p2.y - p1.y));
                }
            }
            xs.sort((a, b) => a - b);
            for (let i = 0; i + 1 < xs.length; i += 2) {
                if (xs[i + 1] > xs[i] + 1e-7) intervals.push([xs[i], xs[i + 1]]);
            }
        }
        if (intervals.length === 0) continue;
        intervals.sort((a, b) => a[0] - b[0]);
        let curS = intervals[0][0], curE = intervals[0][1];
        let xCover = 0;
        for (let i = 1; i < intervals.length; i++) {
            if (intervals[i][0] <= curE) {
                if (intervals[i][1] > curE) curE = intervals[i][1];
            } else {
                xCover += (curE - curS);
                curS = intervals[i][0];
                curE = intervals[i][1];
            }
        }
        xCover += (curE - curS);
        totalArea += xCover * dy;
    }
    return totalArea;
}

/**
 * 指定階の床面積（㎡）を計算
 * 多角形部屋（自動認識）・矩形部屋（手動ブロック）をすべて統一ポリゴンとして和集合面積を算出し、
 * 多角形同士・多角形×矩形・矩形同士の重なり二重計上を完全に控除する。
 */
function calcFloorAreaM2(flNum) {
    ensureFloorsStructure();
    const fl = state.floors[flNum];
    if (!fl) return 0;
    const pitchM = (state.modulePitch || 910) / 1000;
    const validRooms = (fl.rooms || []).filter(rm => !isFloorAreaExcludedRoom(rm));
    const polys = [];
    let fallbackSum = 0;

    validRooms.forEach(rm => {
        const pts = getRoomPolygonPoints(rm);
        if (pts) polys.push(pts);
        else fallbackSum += getRoomAreaM2(rm);
    });

    const unionM2 = calcPolygonsUnionAreaP2(polys) * pitchM * pitchM;
    return Math.max(0, unionM2 + fallbackSum);
}

/**
 * 指定階の「施工床面積（㎡）」（バルコニー・ポーチ等も含む総床面積）を計算
 */
function calcTotalConstructionAreaM2(flNum) {
    ensureFloorsStructure();
    const fl = state.floors[flNum];
    if (!fl) return 0;
    const pitchM = (state.modulePitch || 910) / 1000;
    const overlaySkip = new Set(['VOID', 'NAKANIWA', 'TENJO', 'TATAMI', 'KOAGARI']);
    const validRooms = (fl.rooms || []).filter(rm => rm && !overlaySkip.has(String(rm.type || '').toUpperCase()));
    const polys = [];
    let fallbackSum = 0;

    validRooms.forEach(rm => {
        const pts = getRoomPolygonPoints(rm);
        if (pts) polys.push(pts);
        else fallbackSum += getRoomAreaM2(rm);
    });

    const unionM2 = calcPolygonsUnionAreaP2(polys) * pitchM * pitchM;
    return Math.max(0, unionM2 + fallbackSum);
}

/**
 * 全部屋の areaM2 / jyo を単一の算出ロジック（910mm基準: 1帖 = 2 * pitchM^2）で最新値へ同期する
 */
function syncAllRoomAreasAndJyo() {
    if (typeof state === 'undefined' || !state.floors) return;
    const pitchM = (state.modulePitch || 910) / 1000;
    const oneJyoM2 = pitchM * pitchM * 2;
    [0, 1, 2, 3, 4].forEach(f => {
        const fl = state.floors[f];
        if (!fl || !Array.isArray(fl.rooms)) return;
        fl.rooms.forEach(rm => {
            const areaM2 = getRoomAreaM2(rm);
            if (areaM2 > 0) {
                rm.areaM2 = +areaM2.toFixed(2);
                rm.jyo = +(areaM2 / oneJyoM2).toFixed(1);
            }
        });
    });
}

/**
 * 指定階の「内壁面積（㎡）」を計算（二重加算を解消：部屋がある階は部屋周長ベースから開口面積を控除、部屋がない階のみ壁セグメントベース）
 */
function calcInteriorWallAreaM2(flNum) {
    ensureFloorsStructure();
    const fl = state.floors[flNum];
    if (!fl) return 0;
    const pitchM = (state.modulePitch || 910) / 1000;
    const stdWallH = 2.40; // 室内有効天井高 2,400mm
    let wallArea = 0;

    const validRooms = (fl.rooms || []).filter(rm => !isFloorAreaExcludedRoom(rm));
    if (validRooms.length > 0) {
        // 1. 部屋の四周内壁面積（多角形頂点がある場合は実周長を使用）
        validRooms.forEach(rm => {
            let perimM = 0;
            if (Array.isArray(rm.points) && rm.points.length >= 3) {
                for (let i = 0; i < rm.points.length; i++) {
                    const p1 = rm.points[i];
                    const p2 = rm.points[(i + 1) % rm.points.length];
                    perimM += Math.hypot((p2.x - p1.x) * pitchM, (p2.y - p1.y) * pitchM);
                }
            } else {
                const wM = (rm.w || 0) * pitchM;
                const hM = (rm.h || 0) * pitchM;
                perimM = 2 * (wM + hM);
            }
            wallArea += perimM * stdWallH;
        });
        // 開口部（窓・ドア）の面積を控除
        (fl.openings || []).forEach(op => {
            const wM = (op.widthMm ? op.widthMm / 1000 : ((op.widthP || 1.0) * pitchM));
            const hM = (op.heightMm || 2000) / 1000;
            wallArea -= wM * hM;
        });
    } else {
        // 2. 部屋が未定義（壁のみ作図中）の場合のみ壁セグメントベースで算出
        (fl.walls || []).forEach(wl => {
            if (wl.wallType === 'agarikamachi') return;
            const lenM = Math.hypot((wl.x2 - wl.x1) * pitchM, (wl.y2 - wl.y1) * pitchM);
            let hM = stdWallH;
            if (wl.wallType === 'koshikabe') hM = (wl.heightMm ? wl.heightMm / 1000 : 1.0);
            else if (wl.wallType === 'tarekabe') hM = (wl.heightMm ? wl.heightMm / 1000 : 0.55);
            wallArea += lenM * hM * 1.5;
        });
    }

    return Math.max(0, wallArea);
}

function updateAllMetricsAnd3D() {
    ensureFloorsStructure();
    syncAllRoomAreasAndJyo();
    const toTsubo = (m2) => m2 / 3.305785;

    const floorAreas = {};
    const wallAreas = {};
    let totalFloorM2 = 0;
    let totalConstructionM2 = 0;
    let totalWallM2 = 0;

    [0, 1, 2, 3, 4].forEach(f => {
        const fa = calcFloorAreaM2(f);
        const ca = calcTotalConstructionAreaM2(f);
        const wa = calcInteriorWallAreaM2(f);
        floorAreas[f] = fa;
        wallAreas[f] = wa;
        totalFloorM2 += fa;
        totalConstructionM2 += ca;
        totalWallM2 += wa;
    });

    // 1. 左パレット下部の「各階・全体の床と内壁の面積」パネル更新（index.html実在IDと完全一致）
    const curFl = state.currentFloor;
    const curFloorLabel = curFl === 0 ? '地下' : `${curFl}階`;
    const elCurLabel = document.getElementById('lblCurFloorAreaTitle') || document.getElementById('paletteCurFloorLabel');
    const elCurFloorM2 = document.getElementById('valCurFloorArea') || document.getElementById('paletteCurFloorM2');
    const elCurWallM2 = document.getElementById('valCurWallArea') || document.getElementById('paletteCurWallM2');
    const elTotFloorM2 = document.getElementById('valTotalFloorArea') || document.getElementById('paletteTotalFloorM2');
    const elTotWallM2 = document.getElementById('valTotalWallArea') || document.getElementById('paletteTotalWallM2');
    const elConstRow = document.getElementById('rowTotalConstructionArea');
    const elConstM2 = document.getElementById('valTotalConstructionArea');

    if (elCurLabel) elCurLabel.textContent = curFloorLabel;
    if (elCurFloorM2) elCurFloorM2.textContent = `${floorAreas[curFl].toFixed(2)}㎡`;
    if (elCurWallM2) elCurWallM2.textContent = `${wallAreas[curFl].toFixed(2)}㎡`;
    if (elTotFloorM2) elTotFloorM2.textContent = `${totalFloorM2.toFixed(2)}㎡`;
    if (elTotWallM2) elTotWallM2.textContent = `${totalWallM2.toFixed(2)}㎡`;
    if (elConstRow && elConstM2) {
        if (totalConstructionM2 > totalFloorM2 + 0.1) {
            elConstRow.classList.remove('hidden');
            elConstM2.textContent = `${totalConstructionM2.toFixed(2)}㎡`;
        } else {
            elConstRow.classList.add('hidden');
        }
    }

    // 2. 3D画面右下の面積パネル更新
    const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    setTxt('area1F_m2', `${floorAreas[1].toFixed(1)}㎡`);
    setTxt('area1F_tsubo', `${toTsubo(floorAreas[1]).toFixed(1)}坪`);
    setTxt('area2F_m2', `${floorAreas[2].toFixed(1)}㎡`);
    setTxt('area2F_tsubo', `${toTsubo(floorAreas[2]).toFixed(1)}坪`);
    setTxt('area3F_m2', `${floorAreas[3].toFixed(1)}㎡`);
    setTxt('area3F_tsubo', `${toTsubo(floorAreas[3]).toFixed(1)}坪`);
    setTxt('areaTotal_m2', `${totalFloorM2.toFixed(1)}㎡`);
    setTxt('areaTotal_tsubo', `${toTsubo(totalFloorM2).toFixed(1)}坪`);

    // 3. 壁直下率の更新
    const ratio = computeWallAlignmentRatio();
    const elChokka = document.getElementById('chokkaritsuVal');
    if (elChokka) {
        elChokka.textContent = `${ratio}%`;
        elChokka.className = ratio >= 60 ? 'mono-num text-emerald-400' : 'mono-num text-amber-400';
    }

    request2DRedraw();
    if (typeof rebuild3DScene === 'function') {
        rebuild3DScene();
    } else if (typeof updateBirdEyeMiniPreview === 'function') {
        updateBirdEyeMiniPreview();
    }
    if (typeof renderQaTargetComparison === 'function') renderQaTargetComparison();
}

function extractUnitWallSegments(flNum) {
    const set = new Set();
    const fl = state.floors[flNum];
    if (!fl) return set;
    fl.rooms.forEach(rm => {
        if (rm.type === 'VOID' || rm.type === 'PORCH' || rm.type === 'NAKANIWA') return;
        const stepsW = Math.max(1, Math.round(rm.w * 2));
        const stepsH = Math.max(1, Math.round(rm.h * 2));
        for (let i = 0; i < stepsW; i++) {
            const x1 = (rm.x + i * 0.5).toFixed(1);
            const x2 = (rm.x + (i + 1) * 0.5).toFixed(1);
            set.add(`H:${x1},${x2}@${rm.y.toFixed(1)}`);
            set.add(`H:${x1},${x2}@${(rm.y + rm.h).toFixed(1)}`);
        }
        for (let j = 0; j < stepsH; j++) {
            const y1 = (rm.y + j * 0.5).toFixed(1);
            const y2 = (rm.y + (j + 1) * 0.5).toFixed(1);
            set.add(`V:${y1},${y2}@${rm.x.toFixed(1)}`);
            set.add(`V:${y1},${y2}@${(rm.x + rm.w).toFixed(1)}`);
        }
    });
    return set;
}

function computeWallAlignmentRatio() {
    const seg1 = extractUnitWallSegments(1);
    const seg2 = extractUnitWallSegments(2);
    if (seg2.size === 0) return 100;
    let matched = 0;
    seg2.forEach(s => { if (seg1.has(s)) matched++; });
    return Math.round((matched / seg2.size) * 100);
}

if (typeof window !== 'undefined') {
    window.getRoomAreaM2 = getRoomAreaM2;
    window.isFloorAreaExcludedRoom = isFloorAreaExcludedRoom;
    window.calcFloorAreaM2 = calcFloorAreaM2;
    window.calcTotalConstructionAreaM2 = calcTotalConstructionAreaM2;
    window.syncAllRoomAreasAndJyo = syncAllRoomAreasAndJyo;
    window.calcInteriorWallAreaM2 = calcInteriorWallAreaM2;
    window.updateAllMetricsAnd3D = updateAllMetricsAnd3D;
    window.extractUnitWallSegments = extractUnitWallSegments;
    window.computeWallAlignmentRatio = computeWallAlignmentRatio;
}

// ============================================================================
// 目標面積との照合パネル (QA Target Comparison)
// ============================================================================
const QA_STORAGE_KEY = 'smile_madori_qa_targets_v1';

function loadQaTargetConfig() {
    try {
        const raw = localStorage.getItem(QA_STORAGE_KEY);
        return raw ? JSON.parse(raw) : { f1: '', f2: '', f3: '', total: '', rooms: '' };
    } catch (e) {
        return { f1: '', f2: '', f3: '', total: '', rooms: '' };
    }
}

function saveQaTargetConfig() {
    const cfg = {
        f1: document.getElementById('qaTarget1F')?.value ?? '',
        f2: document.getElementById('qaTarget2F')?.value ?? '',
        f3: document.getElementById('qaTarget3F')?.value ?? '',
        total: document.getElementById('qaTargetTotal')?.value ?? '',
        rooms: document.getElementById('qaTargetRooms')?.value ?? ''
    };
    try { localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(cfg)); } catch (e) {}
    renderQaTargetComparison();
}

function resetQaTargetConfig() {
    ['qaTarget1F', 'qaTarget2F', 'qaTarget3F', 'qaTargetTotal', 'qaTargetRooms'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    saveQaTargetConfig();
}

function openQaTargetModal() {
    const modal = document.getElementById('qaTargetModal');
    if (!modal) return;
    const cfg = loadQaTargetConfig();
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    setVal('qaTarget1F', cfg.f1);
    setVal('qaTarget2F', cfg.f2);
    setVal('qaTarget3F', cfg.f3);
    setVal('qaTargetTotal', cfg.total);
    setVal('qaTargetRooms', cfg.rooms);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    renderQaTargetComparison();
}

function closeQaTargetModal() {
    const modal = document.getElementById('qaTargetModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function renderQaTargetComparison() {
    const box = document.getElementById('qaComparisonResult');
    if (!box) return;
    const cfg = loadQaTargetConfig();
    const f1 = calcFloorAreaM2(1);
    const f2 = calcFloorAreaM2(2);
    const f3 = calcFloorAreaM2(3);
    const tot = calcFloorAreaM2(0) + f1 + f2 + f3 + calcFloorAreaM2(4);

    const floorRows = [
        { label: '1階 床面積', actual: f1, targetStr: cfg.f1 },
        { label: '2階 床面積', actual: f2, targetStr: cfg.f2 },
        { label: '3階 床面積', actual: f3, targetStr: cfg.f3 },
        { label: '延床面積合計', actual: tot, targetStr: cfg.total }
    ];

    let html = '<div class="font-bold text-slate-200 mb-1">📐 階別・延床面積 照合</div><div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">';
    floorRows.forEach(r => {
        const hasT = r.targetStr !== '' && !isNaN(parseFloat(r.targetStr));
        const t = hasT ? parseFloat(r.targetStr) : null;
        const diff = hasT ? (r.actual - t) : null;
        const isOk = hasT && Math.abs(diff) <= 0.30;
        const badge = !hasT
            ? '<span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">目標未設定</span>'
            : (isOk
                ? '<span class="px-1.5 py-0.5 rounded bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">OK</span>'
                : '<span class="px-1.5 py-0.5 rounded bg-rose-600/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold">要確認</span>');
        const diffTxt = hasT ? `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}㎡` : '-';
        html += `<div class="p-2 rounded-lg bg-slate-900/90 border border-slate-700 flex items-center justify-between">
            <div>
                <div class="text-[11px] font-bold text-white">${r.label}</div>
                <div class="text-[10px] text-slate-400 mono-num">実測: ${r.actual.toFixed(2)}㎡ ${hasT ? `/ 目標: ${t.toFixed(2)}㎡` : ''}</div>
            </div>
            <div class="text-right">
                ${badge}
                <div class="text-[10px] mono-num ${hasT ? (isOk ? 'text-emerald-300' : 'text-rose-300') : 'text-slate-500'} mt-0.5">差: ${diffTxt}</div>
            </div>
        </div>`;
    });
    html += '</div>';

    // 部屋別帖数照合
    const roomSpecs = (cfg.rooms || '').split(/[,、\n]+/).map(s => s.trim()).filter(Boolean);
    if (roomSpecs.length > 0) {
        const pitchM = (state.modulePitch || 910) / 1000;
        const allRooms = [];
        [0, 1, 2, 3, 4].forEach(fn => {
            ((state.floors[fn] && state.floors[fn].rooms) || []).forEach(rm => {
                const name = (rm.customName || rm.name || '').trim();
                const jyo = getRoomAreaM2(rm) / (pitchM * pitchM * 2);
                allRooms.push({ floor: fn, name, jyo });
            });
        });

        html += '<div class="font-bold text-slate-200 mt-2 mb-1">🚪 部屋別 帖数照合</div><div class="space-y-1">';
        roomSpecs.forEach(spec => {
            const m = spec.match(/^(.+?)[:：=]\s*([0-9]+(?:\.[0-9]+)?)/);
            if (!m) return;
            const targetName = m[1].trim();
            const targetJyo = parseFloat(m[2]);
            const matched = allRooms.find(r => r.name && (r.name === targetName || r.name.includes(targetName)));
            if (!matched) {
                html += `<div class="p-1.5 rounded bg-slate-900/80 border border-rose-500/40 flex items-center justify-between text-[11px]">
                    <span class="text-white font-bold">${targetName} (目標 ${targetJyo.toFixed(1)}帖)</span>
                    <span class="text-rose-300 font-bold">未検出</span>
                </div>`;
            } else {
                const diffJ = matched.jyo - targetJyo;
                const ok = Math.abs(diffJ) <= 0.25;
                html += `<div class="p-1.5 rounded bg-slate-900/80 border ${ok ? 'border-emerald-500/40' : 'border-rose-500/40'} flex items-center justify-between text-[11px] mono-num">
                    <span class="text-white font-bold">${matched.name} (${matched.floor}F)</span>
                    <span class="${ok ? 'text-emerald-300' : 'text-rose-300'} font-bold">実測 ${matched.jyo.toFixed(1)}帖 / 目標 ${targetJyo.toFixed(1)}帖 (${diffJ >= 0 ? '+' : ''}${diffJ.toFixed(1)}) ${ok ? 'OK' : '要確認'}</span>
                </div>`;
            }
        });
        html += '</div>';
    }

    box.innerHTML = html;
}

if (typeof window !== 'undefined') {
    window.openQaTargetModal = openQaTargetModal;
    window.closeQaTargetModal = closeQaTargetModal;
    window.saveQaTargetConfig = saveQaTargetConfig;
    window.resetQaTargetConfig = resetQaTargetConfig;
    window.renderQaTargetComparison = renderQaTargetComparison;
}
