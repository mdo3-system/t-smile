/**
 * Smile MadoriSketch - Architectural Metrics & Wall Alignment Calculator
 * (Single Responsibility Principle Refactoring)
 */
// ============================================================================
// REAL-TIME AREA (1F / 2F / 3F) & WALL ALIGNMENT CALCULATIONS
// ============================================================================

function isFloorAreaExcludedRoom(rm) {
    if (!rm) return false;
    const t = (rm.type || '').toUpperCase();
    const name = (rm.customName || rm.name || '').toLowerCase();
    if (t === 'VOID' || t === 'BALCONY' || t === 'PORCH') return true;
    if (name.includes('吹抜') || name.includes('吹き抜け') || name.includes('void') ||
        name.includes('バルコニー') || name.includes('ベランダ') || name.includes('balcony') ||
        name.includes('ポーチ') || name.includes('porch')) {
        return true;
    }
    return false;
}
window.isFloorAreaExcludedRoom = isFloorAreaExcludedRoom;

function updateAllMetricsAnd3D() {
    ensureFloorsStructure();
    const pitchM = state.modulePitch / 1000;
    const calcFloorAreaM2 = (flNum) => {
        let sum = 0;
        state.floors[flNum].rooms.forEach(rm => {
            // 吹抜・バルコニー・ポーチは建築基準法・求積基準により延床面積から完全除外
            if (!isFloorAreaExcludedRoom(rm)) {
                if (typeof rm.areaM2 === 'number' && rm.areaM2 > 0) {
                    sum += rm.areaM2;
                } else if (rm.w && rm.h) {
                    sum += (rm.w * pitchM) * (rm.h * pitchM);
                }
            }
        });
        return sum;
    };

    const a1 = calcFloorAreaM2(1);
    const a2 = calcFloorAreaM2(2);
    const a3 = calcFloorAreaM2(3);
    const total = a1 + a2 + a3;
    const toTsubo = (m2) => m2 / 3.305785;

    document.getElementById('area1F_m2').textContent = `${a1.toFixed(1)}㎡`;
    document.getElementById('area1F_tsubo').textContent = `${toTsubo(a1).toFixed(1)}坪`;
    document.getElementById('area2F_m2').textContent = `${a2.toFixed(1)}㎡`;
    document.getElementById('area2F_tsubo').textContent = `${toTsubo(a2).toFixed(1)}坪`;
    document.getElementById('area3F_m2').textContent = `${a3.toFixed(1)}㎡`;
    document.getElementById('area3F_tsubo').textContent = `${toTsubo(a3).toFixed(1)}坪`;
    document.getElementById('areaTotal_m2').textContent = `${total.toFixed(1)}㎡`;
    document.getElementById('areaTotal_tsubo').textContent = `${toTsubo(total).toFixed(1)}坪`;

    const ratio = computeWallAlignmentRatio();
    const elChokka = document.getElementById('chokkaritsuVal');
    elChokka.textContent = `${ratio}%`;
    elChokka.className = ratio >= 60 ? 'mono-num text-emerald-400' : 'mono-num text-amber-400';

    request2DRedraw();
    rebuild3DScene();
}

function extractUnitWallSegments(flNum) {
    const set = new Set();
    const fl = state.floors[flNum];
    fl.rooms.forEach(rm => {
        if (rm.type === 'VOID' || rm.type === 'PORCH') return;
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

// Global Window Export for Backward Compatibility
if (typeof window !== 'undefined') {
    window.isFloorAreaExcludedRoom = isFloorAreaExcludedRoom;
    window.updateAllMetricsAnd3D = updateAllMetricsAnd3D;
    window.extractUnitWallSegments = extractUnitWallSegments;
    window.computeWallAlignmentRatio = computeWallAlignmentRatio;
}
