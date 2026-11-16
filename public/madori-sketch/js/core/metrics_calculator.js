/**
 * 住ま居る 3D間取り工房 (MadoriSketch)
 * リアルタイム面積集計（各階・全体の床面積＆内壁面積）＆壁直下率エンジン
 * (Single Responsibility: Architectural Metrics & Wall Area / Alignment Calculator)
 */

function isFloorAreaExcludedRoom(rm) {
    if (!rm) return false;
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
function calcFloorAreaM2(flNum) {
    ensureFloorsStructure();
    const fl = state.floors[flNum];
    if (!fl) return 0;
    const pitchM = (state.modulePitch || 910) / 1000;
    let sum = 0;
    fl.rooms.forEach(rm => {
        if (!isFloorAreaExcludedRoom(rm)) {
            if (typeof rm.areaM2 === 'number' && rm.areaM2 > 0) {
                sum += rm.areaM2;
            } else if (rm.w && rm.h) {
                sum += (rm.w * pitchM) * (rm.h * pitchM);
            }
        }
    });
    return sum;
}

/**
 * 指定階の「内壁面積（㎡）」を計算（お手本画像の「内壁 ○○○.○○㎡」に完全対応）
 * 部屋の外周壁長 × 階高(2.4m標準) ＋ 個別壁セグメント から開口面積を控除して算出
 */
function calcInteriorWallAreaM2(flNum) {
    ensureFloorsStructure();
    const fl = state.floors[flNum];
    if (!fl) return 0;
    const pitchM = (state.modulePitch || 910) / 1000;
    const stdWallH = 2.40; // 室内有効天井高 2,400mm
    let wallArea = 0;

    // 1. 部屋の四周内壁面積
    fl.rooms.forEach(rm => {
        if (isFloorAreaExcludedRoom(rm)) return;
        const wM = (rm.w || 0) * pitchM;
        const hM = (rm.h || 0) * pitchM;
        const perimM = 2 * (wM + hM);
        wallArea += perimM * stdWallH;
    });

    // 2. 個別壁セグメント（腰壁・たれ壁・通常壁）
    fl.walls.forEach(wl => {
        if (wl.wallType === 'agarikamachi') return;
        const lenM = Math.hypot((wl.x2 - wl.x1) * pitchM, (wl.y2 - wl.y1) * pitchM);
        let hM = stdWallH;
        if (wl.wallType === 'koshikabe') hM = 1.0;
        else if (wl.wallType === 'tarekabe') hM = 0.55;
        // 両面分のクロス面積として加算（部屋がない場合の壁にも対応）
        wallArea += lenM * hM * 1.2;
    });

    return Math.max(0, wallArea);
}

function updateAllMetricsAnd3D() {
    ensureFloorsStructure();
    const toTsubo = (m2) => m2 / 3.305785;

    const floorAreas = {};
    const wallAreas = {};
    let totalFloorM2 = 0;
    let totalWallM2 = 0;

    [0, 1, 2, 3, 4].forEach(f => {
        const fa = calcFloorAreaM2(f);
        const wa = calcInteriorWallAreaM2(f);
        floorAreas[f] = fa;
        wallAreas[f] = wa;
        totalFloorM2 += fa;
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

    if (elCurLabel) elCurLabel.textContent = curFloorLabel;
    if (elCurFloorM2) elCurFloorM2.textContent = `${floorAreas[curFl].toFixed(2)}㎡`;
    if (elCurWallM2) elCurWallM2.textContent = `${wallAreas[curFl].toFixed(2)}㎡`;
    if (elTotFloorM2) elTotFloorM2.textContent = `${totalFloorM2.toFixed(2)}㎡`;
    if (elTotWallM2) elTotWallM2.textContent = `${totalWallM2.toFixed(2)}㎡`;

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
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof updateBirdEyeMiniPreview === 'function') updateBirdEyeMiniPreview();
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
    window.isFloorAreaExcludedRoom = isFloorAreaExcludedRoom;
    window.calcFloorAreaM2 = calcFloorAreaM2;
    window.calcInteriorWallAreaM2 = calcInteriorWallAreaM2;
    window.updateAllMetricsAnd3D = updateAllMetricsAnd3D;
    window.extractUnitWallSegments = extractUnitWallSegments;
    window.computeWallAlignmentRatio = computeWallAlignmentRatio;
}
