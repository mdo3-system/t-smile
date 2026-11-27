/**
 * 住ま居る 3D間取り工房 - Unified Input, Pointer & Manipulation Controller
 * (壁4種・部分削除・サッシ12種・空間6種・直方体・多角形柱・ものさし補助線・メモ注釈15種 統合制御)
 */

// canvas2d は canvas_2d_renderer.js で let canvas2d として宣言済み（var再宣言によるSyntaxErrorを防止）
if (!canvas2d) {
    canvas2d = document.getElementById('canvas2d');
}

// ============================================================================
// OVERLAP PREVENTION & SMART PLACEMENT FOR 12 SASH / DOOR TYPES
// ============================================================================

function checkOpeningOverlap(floorNum, x, y, orient, widthP, excludeId = null) {
    const fl = state.floors[floorNum];
    if (!fl || !fl.openings) return false;
    const halfW = widthP / 2;
    const minA = (orient === 'h' ? x : y) - halfW;
    const maxA = (orient === 'h' ? x : y) + halfW;
    const fixedCoord = orient === 'h' ? y : x;

    for (const op of fl.openings) {
        if (op.id === excludeId) continue;
        if (op.orient !== orient) continue;
        const opFixed = op.orient === 'h' ? op.y : op.x;
        if (Math.abs(opFixed - fixedCoord) > 0.15) continue;

        const opW = op.widthP || OPENING_TYPES[op.type]?.widthP || 1.0;
        const minB = (op.orient === 'h' ? op.x : op.y) - opW / 2;
        const maxB = (op.orient === 'h' ? op.x : op.y) + opW / 2;

        if (Math.max(minA, minB) < Math.min(maxA, maxB) - 0.02) {
            return true;
        }
    }
    return false;
}

function snapPointToNearestWallEdge(wx, wy) {
    const fl = state.floors[state.currentFloor];
    if (!fl) return { x: snapP(wx), y: snapP(wy), orient: 'h', isExterior: true };
    let bestEdge = null;
    let minDist = 1.0;

    // 1. 壁セグメント（fl.walls）を最優先で探索
    if (fl.walls && fl.walls.length > 0) {
        fl.walls.forEach(wl => {
            const isHoriz = Math.abs(wl.y1 - wl.y2) < 0.05;
            if (isHoriz) {
                const minX = Math.min(wl.x1, wl.x2);
                const maxX = Math.max(wl.x1, wl.x2);
                if (wx >= minX - 0.35 && wx <= maxX + 0.35) {
                    const d = Math.abs(wy - wl.y1);
                    if (d < minDist) {
                        minDist = d;
                        const clampedX = Math.max(minX, Math.min(maxX, snapP(wx)));
                        bestEdge = { x: clampedX, y: wl.y1, orient: 'h', wall: wl };
                    }
                }
            } else {
                const minY = Math.min(wl.y1, wl.y2);
                const maxY = Math.max(wl.y1, wl.y2);
                if (wy >= minY - 0.35 && wy <= maxY + 0.35) {
                    const d = Math.abs(wx - wl.x1);
                    if (d < minDist) {
                        minDist = d;
                        const clampedY = Math.max(minY, Math.min(maxY, snapP(wy)));
                        bestEdge = { x: wl.x1, y: clampedY, orient: 'v', wall: wl };
                    }
                }
            }
        });
    }

    // 2. 部屋（fl.rooms）の外周もフォールバックで探索
    if (!bestEdge && fl.rooms && fl.rooms.length > 0) {
        fl.rooms.forEach(rm => {
            const rw = rm.w || 2;
            const rh = rm.h || 2;
            [rm.y, rm.y + rh].forEach(wallY => {
                if (wx >= rm.x - 0.2 && wx <= rm.x + rw + 0.2) {
                    const d = Math.abs(wy - wallY);
                    if (d < minDist) {
                        minDist = d;
                        bestEdge = { x: snapP(wx), y: wallY, orient: 'h' };
                    }
                }
            });
            [rm.x, rm.x + rw].forEach(wallX => {
                if (wy >= rm.y - 0.2 && wy <= rm.y + rh + 0.2) {
                    const d = Math.abs(wx - wallX);
                    if (d < minDist) {
                        minDist = d;
                        bestEdge = { x: wallX, y: snapP(wy), orient: 'v' };
                    }
                }
            });
        });
    }

    const res = bestEdge || { x: snapP(wx), y: snapP(wy), orient: 'h' };
    // 外壁か内壁かの簡易判定（両側に部屋があるかどうか）
    let roomsOnSideA = 0, roomsOnSideB = 0;
    (fl.rooms || []).forEach(rm => {
        if (rm.type === 'VOID' || rm.type === 'NAKANIWA') return;
        const eps = 0.25;
        if (res.orient === 'h') {
            if (res.x >= rm.x + 0.05 && res.x <= rm.x + rm.w - 0.05) {
                if (Math.abs(res.y - rm.y) < eps) roomsOnSideB++;
                if (Math.abs(res.y - (rm.y + rm.h)) < eps) roomsOnSideA++;
            }
        } else {
            if (res.y >= rm.y + 0.05 && res.y <= rm.y + rm.h - 0.05) {
                if (Math.abs(res.x - rm.x) < eps) roomsOnSideB++;
                if (Math.abs(res.x - (rm.x + rm.w)) < eps) roomsOnSideA++;
            }
        }
    });
    res.isExterior = !(roomsOnSideA > 0 && roomsOnSideB > 0);
    return res;
}

function updateWindowPresetWidth(w) {
    state.subWindowWidth = w;
    if (typeof renderSubToolbar === 'function') renderSubToolbar();
}
function updateWindowPresetHeight(h) {
    state.subWindowHeight = h;
    if (state.subWindowMountRef === 'top') {
        state.subWindowSillMm = Math.max(0, (state.subWindowTopMm || 2000) - h);
    } else {
        state.subWindowTopMm = (state.subWindowSillMm || 900) + h;
    }
    if (typeof renderSubToolbar === 'function') renderSubToolbar();
}
function updateWindowTopHeight(t) {
    state.subWindowMountRef = 'top';
    state.subWindowTopMm = t;
    state.subWindowSillMm = Math.max(0, t - (state.subWindowHeight || 1100));
    if (typeof renderSubToolbar === 'function') renderSubToolbar();
    showToast(`窓の天端を FL+${t}mm（窓台 FL+${state.subWindowSillMm}mm）に設定しました`);
}
function updateWindowSillHeight(s) {
    state.subWindowMountRef = 'bottom';
    state.subWindowSillMm = s;
    state.subWindowTopMm = s + (state.subWindowHeight || 1100);
    if (typeof renderSubToolbar === 'function') renderSubToolbar();
    showToast(`窓の下端（窓台）を FL+${s}mm（天端 FL+${state.subWindowTopMm}mm）に設定しました`);
}
window.updateWindowPresetWidth = updateWindowPresetWidth;
window.updateWindowPresetHeight = updateWindowPresetHeight;
window.updateWindowTopHeight = updateWindowTopHeight;
window.updateWindowSillHeight = updateWindowSillHeight;

function setSubDoorFit(fitId) {
    state.subDoorFit = fitId;
    state.subOpeningFit = fitId;
    if (fitId === 'hiraki' || fitId === 'katabiraki' || fitId === 'katabiki' || fitId === 'hikido' || fitId === 'genkan_slide') {
        state.subDoorLeafCount = 1;
    } else if (fitId === 'hikichigai' && state.subDoorLeafCount === 1) {
        state.subDoorLeafCount = 2;
    } else if (fitId === 'hikiwake' && state.subDoorLeafCount % 2 !== 0) {
        state.subDoorLeafCount = 2;
    }
    if (typeof renderSubToolbar === 'function') renderSubToolbar();
}

/**
 * 指定された開口部座標 (x, y, orient) が「玄関（GENKAN）」「玄関土間（DOMA）」「ポーチ（PORCH）」の
 * 建物外周壁（またはポーチとの境界壁）にあるかを判定する共通ヘルパー。
 * ※玄関土間と室内（ホール・LDK・トイレ等）の間仕切り内壁は false とし、外部玄関口のみを正確に判定する。
 */
function isOpeningAtEntranceWall(fl, x, y, orient, op = null) {
    if (op && op.isGenkanExplicit === false) return false;
    if (op && (op.isGenkan === true || op.type === 'ENTRANCE_DOOR' || op.doorFit === 'oyako' || op.doorFit === 'genkan_slide')) {
        return true;
    }
    const floorObj = fl || ((typeof state !== 'undefined' && state.floors) ? state.floors[state.currentFloor] : null);
    if (!floorObj || !Array.isArray(floorObj.rooms) || floorObj.rooms.length === 0) return false;

    const isEntranceRoom = (rm) => {
        if (!rm) return false;
        const rt = String(rm.type || '').toUpperCase();
        const rn = String(rm.customName || rm.name || rm.label || '');
        return rt === 'DOMA' || rt === 'GENKAN' || /玄関|土間/.test(rn);
    };
    const isPorchOrOutsideRoom = (rm) => {
        if (!rm) return false;
        const rt = String(rm.type || '').toUpperCase();
        const rn = String(rm.customName || rm.name || rm.label || '');
        return rt === 'PORCH' || /ポーチ/.test(rn);
    };

    const eps = 0.28;
    const roomsSideA = []; // hなら上側(y - eps), vなら左側(x - eps)
    const roomsSideB = []; // hなら下側(y + eps), vなら右側(x + eps)

    for (const rm of floorObj.rooms) {
        if (!rm || rm.type === 'VOID' || rm.type === 'NAKANIWA' || rm.type === 'TENJO') continue;
        const rw = rm.w || 1;
        const rh = rm.h || 1;
        if (orient === 'h') {
            if (x >= rm.x - 0.15 && x <= rm.x + rw + 0.15) {
                if (Math.abs(y - (rm.y + rh)) <= eps) roomsSideA.push(rm);
                else if (Math.abs(y - rm.y) <= eps) roomsSideB.push(rm);
                else if (y > rm.y + 0.05 && y < rm.y + rh - 0.05) {
                    roomsSideA.push(rm);
                    roomsSideB.push(rm);
                }
            }
        } else {
            if (y >= rm.y - 0.15 && y <= rm.y + rh + 0.15) {
                if (Math.abs(x - (rm.x + rw)) <= eps) roomsSideA.push(rm);
                else if (Math.abs(x - rm.x) <= eps) roomsSideB.push(rm);
                else if (x > rm.x + 0.05 && x < rm.x + rw - 0.05) {
                    roomsSideA.push(rm);
                    roomsSideB.push(rm);
                }
            }
        }
    }

    const hasEntA = roomsSideA.some(isEntranceRoom);
    const hasEntB = roomsSideB.some(isEntranceRoom);
    if (!hasEntA && !hasEntB) return false;

    const otherSideA = roomsSideB;
    const otherSideB = roomsSideA;

    // 片側が玄関/玄関土間で、反対側が「部屋なし（建物外部）」または「ポーチ」であれば玄関開口部と判定
    if (hasEntA && (otherSideA.length === 0 || otherSideA.every(isPorchOrOutsideRoom))) {
        return true;
    }
    if (hasEntB && (otherSideB.length === 0 || otherSideB.every(isPorchOrOutsideRoom))) {
        return true;
    }
    return false;
}
window.isOpeningAtEntranceWall = isOpeningAtEntranceWall;

/**
 * 玄関開口部（玄関引違戸・玄関ドア・玄関片引戸・玄関親子ドア・玄関両開ドア）の属性とラベルを正規化する
 */
function applyEntranceOpeningAttributes(op, fl, isNewPlacement = false) {
    if (!op) return false;
    const fitId = op.doorFit || op.sashType || 'hikichigai';
    const windowOnlyFits = ['fix', 'demado', 'tatesuberi', 'yokosuberi', 'agesage', 'oredo', 'closet', 'kaikou'];
    if (windowOnlyFits.includes(fitId)) return false;

    const atEntrance = isOpeningAtEntranceWall(fl, op.x, op.y, op.orient, op);
    if (!atEntrance) {
        if (op.isGenkan && op.isGenkanAuto) {
            op.isGenkan = false;
            op.isGenkanAuto = false;
        }
        return false;
    }

    const pitch = (typeof state !== 'undefined' && state.modulePitch) ? state.modulePitch : 910;
    op.isGenkan = true;
    op.isGenkanAuto = true;
    op.isWin = false;
    op.category = 'door';
    op.sillMm = 0;
    if (isNewPlacement || !op.heightMm || op.heightMm < 2000) {
        op.heightMm = 2200;
    }

    let genkanName = '玄関ドア';
    if (fitId === 'hikichigai') {
        genkanName = '玄関引違戸';
        op.type = 'ENTRANCE_DOOR';
        op.leafCount = 2;
        if (isNewPlacement && (!op.widthMm || op.widthMm < 1200)) {
            op.widthMm = 1650;
        }
    } else if (fitId === 'katabiki' || fitId === 'hikido' || fitId === 'genkan_slide') {
        genkanName = '玄関片引戸';
        op.type = 'ENTRANCE_DOOR';
        op.leafCount = 1;
        if (isNewPlacement && (!op.widthMm || op.widthMm === 800 || op.widthMm === 1650)) {
            op.widthMm = 1200;
        }
    } else if (fitId === 'oyako') {
        genkanName = '玄関親子ドア';
        op.type = 'ENTRANCE_DOOR';
        op.leafCount = 2;
        if (isNewPlacement && (!op.widthMm || op.widthMm < 1100)) {
            op.widthMm = 1200;
        }
    } else if (fitId === 'ryouhiraki') {
        genkanName = '玄関両開ドア';
        op.type = 'ENTRANCE_DOOR';
        op.leafCount = 2;
        if (isNewPlacement && (!op.widthMm || op.widthMm < 1300)) {
            op.widthMm = 1600;
        }
    } else {
        // katahiraki / hiraki
        genkanName = '玄関ドア';
        op.type = 'ENTRANCE_DOOR';
        op.leafCount = 1;
        if (isNewPlacement && (!op.widthMm || op.widthMm === 800 || op.widthMm === 1650)) {
            op.widthMm = 910;
        }
    }

    op.widthP = +((op.widthMm || 910) / pitch).toFixed(3);
    op.leafWidthMm = Math.round((op.widthMm || 910) / (op.leafCount || 1));
    op.label = `${genkanName} (W${op.widthMm}×H${op.heightMm})`;
    return true;
}
window.applyEntranceOpeningAttributes = applyEntranceOpeningAttributes;

function placeOpeningAt(wx, wy) {
    const fl = state.floors[state.currentFloor];
    const pitch = state.modulePitch || 910;
    const target = snapPointToNearestWallEdge(wx, wy);

    // P1-3: コピー連続配置モード（state.copiedOpeningSpec）が有効な場合はコピー元の仕様をそのまま適用
    if (state.copiedOpeningSpec) {
        const cp = state.copiedOpeningSpec;
        const cpWidthP = +(cp.widthMm / pitch).toFixed(3);
        if (checkOpeningOverlap(state.currentFloor, target.x, target.y, target.orient, cpWidthP, null)) {
            showToast('同じ壁面上の既存の建具・窓と重なるため配置できません', true);
            return;
        }
        const pastedOp = {
            id: uid(),
            category: cp.category,
            type: cp.isWin ? 'WINDOW' : (cp.doorFit === 'katahiraki' || cp.doorFit === 'hiraki' ? 'SWING_DOOR' : 'SLIDING_DOOR'),
            sashType: cp.sashType || cp.doorFit,
            doorFit: cp.doorFit,
            leafCount: cp.leafCount || 1,
            leafWidthMm: cp.leafWidthMm || cp.widthMm,
            x: target.x,
            y: target.y,
            orient: target.orient,
            flip: !!cp.flip,
            flipX: !!cp.flipX,
            widthMm: cp.widthMm,
            heightMm: cp.heightMm,
            sillMm: cp.sillMm || 0,
            widthP: cpWidthP,
            label: cp.label,
            isWin: !!cp.isWin
        };
        fl.openings.push(pastedOp);
        state.selectedItem = { kind: 'opening', id: pastedOp.id, floor: state.currentFloor };
        saveHistorySnapshot();
        if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
        request2DRedraw();
        if (typeof rebuild3DScene === 'function') rebuild3DScene();
        showToast(`📋 コピー中の「${cp.label}」を配置しました（続けて他の壁にも配置できます）`);
        return;
    }

    const fitId = state.subOpeningFit || state.subDoorFit || 'hikichigai';
    const sashList = Array.isArray(window.SASH_TYPES_12) ? window.SASH_TYPES_12 : [];
    const sashSpec = sashList.find(s => s.id === fitId) || (window.SASH_TYPES_12 && window.SASH_TYPES_12[fitId]) || null;

    // 窓専用の種別（FIX・出窓・すべり出し・上げ下げ）は常に窓、それ以外は外壁なら窓・内壁なら建具（または明示カテゴリ）
    const windowOnlyFits = ['fix', 'demado', 'tatesuberi', 'yokosuberi', 'agesage'];
    const doorOnlyFits = ['oredo', 'closet', 'oyako', 'kaikou'];
    let isWin = false;
    if (windowOnlyFits.includes(fitId)) {
        isWin = true;
    } else if (doorOnlyFits.includes(fitId)) {
        isWin = false;
    } else if (state.subOpeningCategory === 'window') {
        isWin = true;
    } else if (state.subOpeningCategory === 'door') {
        isWin = false;
    } else {
        isWin = !!target.isExterior;
    }

    let widthMm, heightMm, sillMm, widthP, label, leafCount, leafWidthMm, doorFit;
    doorFit = fitId;

    if (sashSpec) {
        // サブツールバーで選ばれている幅・高さ・下端（またはSASH_TYPES_12の既定値：引き違い窓ならW1650×H1300・FL+800）を優先適用
        widthMm = state.subWindowWidth || sashSpec.defaultWMm || (isWin ? 1650 : 800);
        heightMm = isWin
            ? (state.subWindowHeight || sashSpec.defaultHMm || 1300)
            : (state.subDoorHeight || sashSpec.defaultHMm || 2000);
        sillMm = isWin
            ? (state.subWindowSillMm !== undefined ? state.subWindowSillMm : (sashSpec.defaultSillMm !== undefined ? sashSpec.defaultSillMm : 800))
            : 0;
        widthP = +(widthMm / pitch).toFixed(3);
        leafCount = sashSpec.leaves || ((fitId === 'hikichigai' || fitId === 'ryouhiraki' || fitId === 'closet') ? 2 : 1);
        leafWidthMm = Math.round(widthMm / leafCount);
        label = `${sashSpec.label}${isWin ? '窓' : '建具'} (W${widthMm}×H${heightMm})`;
    } else if (isWin) {
        widthMm = state.subWindowWidth || 1650;
        heightMm = state.subWindowHeight || 1300;
        const topMm = state.subWindowTopMm || 2100;
        sillMm = state.subWindowSillMm !== undefined ? state.subWindowSillMm : Math.max(0, topMm - heightMm);
        widthP = +(widthMm / pitch).toFixed(3);
        label = `窓 (W${widthMm}×H${heightMm})`;
        leafCount = 2;
        leafWidthMm = widthMm / 2;
    } else {
        leafCount = state.subDoorLeafCount || 1;
        leafWidthMm = state.subDoorLeafWidth || 800;
        heightMm = state.subDoorHeight || 2000;
        sillMm = 0;
        let totalW = state.subWindowWidth || (leafWidthMm * leafCount);
        if (doorFit === 'hiraki' || doorFit === 'katabiraki' || doorFit === 'katahiraki' || doorFit === 'katabiki' || doorFit === 'hikido' || doorFit === 'genkan_slide') {
            totalW = state.subWindowWidth || leafWidthMm;
            leafCount = 1;
        }
        widthMm = totalW;
        widthP = +(widthMm / pitch).toFixed(3);
        label = `建具 (W${widthMm}×H${heightMm})`;
    }

    if (checkOpeningOverlap(state.currentFloor, target.x, target.y, target.orient, widthP, null)) {
        showToast('同じ壁面上の既存の建具・窓と重なるため配置できません', true);
        return;
    }

    const newOp = {
        id: uid(),
        category: isWin ? 'window' : 'door',
        type: isWin ? 'WINDOW' : (doorFit === 'katabiraki' || doorFit === 'hiraki' || doorFit === 'katahiraki' ? 'SWING_DOOR' : 'SLIDING_DOOR'),
        sashType: fitId,
        doorFit: doorFit,
        leafCount: leafCount,
        leafWidthMm: leafWidthMm,
        x: target.x,
        y: target.y,
        orient: target.orient,
        flip: false,
        flipX: false,
        widthMm: widthMm,
        heightMm: heightMm,
        sillMm: sillMm,
        widthP: widthP,
        label: label,
        isWin: isWin
    };

    // 玄関・玄関土間の外壁に引違い・片開き・片引き等を設置した場合は「玄関引違戸」「玄関ドア」「玄関片引戸」へ自動設定
    if (applyEntranceOpeningAttributes(newOp, fl, true)) {
        // 幅が玄関標準幅に変わった場合の重なり再チェック（重なる場合は元の幅を維持）
        if (checkOpeningOverlap(state.currentFloor, newOp.x, newOp.y, newOp.orient, newOp.widthP, null)) {
            newOp.widthMm = widthMm;
            newOp.widthP = widthP;
            newOp.leafWidthMm = Math.round(widthMm / (newOp.leafCount || 1));
            newOp.label = newOp.label.replace(/\(W\d+×/, `(W${widthMm}×`);
        }
        label = newOp.label;
    }

    fl.openings.push(newOp);
    state.selectedItem = { kind: 'opening', id: newOp.id, floor: state.currentFloor };
    saveHistorySnapshot();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast(`${label} を壁に自動吸着配置しました`);
}

function flipLastOrSelectedOpening() {
    const fl = state.floors[state.currentFloor];
    let op = null;
    if (state.selectedItem && state.selectedItem.kind === 'opening') {
        op = fl.openings.find(o => o.id === state.selectedItem.id);
    } else if (fl.openings.length > 0) {
        op = fl.openings[fl.openings.length - 1];
    }
    if (op) {
        // 4方向順送り：(flip:false, flipX:false) -> (flip:false, flipX:true) -> (flip:true, flipX:false) -> (flip:true, flipX:true)
        const curState = (op.flip ? 2 : 0) + (op.flipX ? 1 : 0);
        const nextState = (curState + 1) % 4;
        op.flip = (nextState & 2) !== 0;
        op.flipX = (nextState & 1) !== 0;
        saveHistorySnapshot();
        if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
        request2DRedraw();
        if (typeof rebuild3DScene === 'function') rebuild3DScene();
        showToast(`建具の向きを4方向順送り切替しました（上下/内外:${op.flip ? '反転' : '標準'}・左右/引込:${op.flipX ? '反転' : '標準'}）`);
    }
}

/**
 * 片引き戸・片開き戸・建具の個別軸反転（'x': 画面の左右反転、'y': 画面の上下反転）
 * ※垂直壁 (orient === 'v') に配置されている建具は90°回転しているため、
 *   画面上の「↔ 左右反転」ボタンを押した時は壁の表裏(op.flip)を反転し、
 *   画面上の「↕ 上下反転」ボタンを押した時は壁に沿った引き込み向き(op.flipX)を反転することで、
 *   水平壁でも垂直壁でも常に画面の見た目の「上下」「左右」と100%一致して反転する！
 */
function flipSelectedOpeningAxis(axis) {
    const fl = state.floors[state.currentFloor];
    let op = null;
    if (state.selectedItem && state.selectedItem.kind === 'opening') {
        op = fl.openings.find(o => o.id === state.selectedItem.id);
    } else if (fl.openings.length > 0) {
        op = fl.openings[fl.openings.length - 1];
    }
    if (!op) return;

    const isVertWall = (op.orient === 'v');
    if (axis === 'x') {
        // 画面の左右方向を反転
        if (isVertWall) {
            op.flip = !op.flip;
        } else {
            op.flipX = !op.flipX;
        }
    } else {
        // 画面の上下方向を反転
        if (isVertWall) {
            op.flipX = !op.flipX;
        } else {
            op.flip = !op.flip;
        }
    }

    saveHistorySnapshot();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast(`建具を${axis === 'x' ? '左右反転' : '上下反転'}しました`);
}
window.flipSelectedOpeningAxis = flipSelectedOpeningAxis;

/**
 * P1-3: 開口部が乗っている壁（または部屋外周辺）の始点・終点と、壁端からの距離(mm)を算出
 */
function getOpeningHostWallSpan(op) {
    if (!op) return null;
    const fl = state.floors[state.currentFloor];
    if (!fl) return null;
    const pitch = state.modulePitch || 910;
    const halfW = (op.widthP || (op.widthMm ? op.widthMm / pitch : 1.0)) / 2;
    let bestSpan = null;
    let minPerpDist = 0.28;

    // 1. 壁セグメントから検索
    (fl.walls || []).forEach(wl => {
        const isHoriz = Math.abs(wl.y1 - wl.y2) < 0.05;
        const isVert = Math.abs(wl.x1 - wl.x2) < 0.05;
        if (op.orient === 'h' && isHoriz) {
            const perp = Math.abs(op.y - wl.y1);
            const minX = Math.min(wl.x1, wl.x2);
            const maxX = Math.max(wl.x1, wl.x2);
            if (perp <= minPerpDist && op.x >= minX - 0.15 && op.x <= maxX + 0.15) {
                minPerpDist = perp;
                bestSpan = { minCoord: minX, maxCoord: maxX, orient: 'h', wall: wl };
            }
        } else if (op.orient === 'v' && isVert) {
            const perp = Math.abs(op.x - wl.x1);
            const minY = Math.min(wl.y1, wl.y2);
            const maxY = Math.max(wl.y1, wl.y2);
            if (perp <= minPerpDist && op.y >= minY - 0.15 && op.y <= maxY + 0.15) {
                minPerpDist = perp;
                bestSpan = { minCoord: minY, maxCoord: maxY, orient: 'v', wall: wl };
            }
        }
    });

    // 2. 部屋辺からフォールバック検索
    if (!bestSpan && fl.rooms && fl.rooms.length > 0) {
        fl.rooms.forEach(rm => {
            if (op.orient === 'h') {
                [rm.y, rm.y + rm.h].forEach(ry => {
                    const perp = Math.abs(op.y - ry);
                    if (perp <= minPerpDist && op.x >= rm.x - 0.1 && op.x <= rm.x + rm.w + 0.1) {
                        minPerpDist = perp;
                        bestSpan = { minCoord: rm.x, maxCoord: rm.x + rm.w, orient: 'h' };
                    }
                });
            } else {
                [rm.x, rm.x + rm.w].forEach(rx => {
                    const perp = Math.abs(op.x - rx);
                    if (perp <= minPerpDist && op.y >= rm.y - 0.1 && op.y <= rm.y + rm.h + 0.1) {
                        minPerpDist = perp;
                        bestSpan = { minCoord: rm.y, maxCoord: rm.y + rm.h, orient: 'v' };
                    }
                });
            }
        });
    }

    if (!bestSpan) return null;
    const centerCoord = op.orient === 'h' ? op.x : op.y;
    const openStartP = centerCoord - halfW;
    const openEndP = centerCoord + halfW;
    const fromStartMm = Math.max(0, Math.round((openStartP - bestSpan.minCoord) * pitch));
    const fromEndMm = Math.max(0, Math.round((bestSpan.maxCoord - openEndP) * pitch));
    const wallLenMm = Math.round((bestSpan.maxCoord - bestSpan.minCoord) * pitch);
    return {
        minCoord: bestSpan.minCoord,
        maxCoord: bestSpan.maxCoord,
        fromStartMm,
        fromEndMm,
        wallLenMm,
        orient: bestSpan.orient
    };
}
window.getOpeningHostWallSpan = getOpeningHostWallSpan;

function setOpeningOffsetFromWallEnd(whichEnd, offsetMm) {
    const obj = findSelectedObject();
    if (!obj || !state.selectedItem || state.selectedItem.kind !== 'opening') return;
    if (isNaN(offsetMm) || offsetMm < 0) return;
    const span = getOpeningHostWallSpan(obj);
    if (!span) return;
    const pitch = state.modulePitch || 910;
    const widthP = obj.widthP || (obj.widthMm ? obj.widthMm / pitch : 1.0);
    const halfW = widthP / 2;
    const offsetP = offsetMm / pitch;

    let newCenter = whichEnd === 'start'
        ? (span.minCoord + offsetP + halfW)
        : (span.maxCoord - offsetP - halfW);

    newCenter = Math.max(span.minCoord + halfW, Math.min(span.maxCoord - halfW, newCenter));
    const nextX = obj.orient === 'h' ? +newCenter.toFixed(4) : obj.x;
    const nextY = obj.orient === 'v' ? +newCenter.toFixed(4) : obj.y;

    if (checkOpeningOverlap(state.currentFloor, nextX, nextY, obj.orient, widthP, obj.id)) {
        showToast('他の建具・窓と重なるため指定位置へ移動できません', true);
        return;
    }
    obj.x = nextX;
    obj.y = nextY;
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    showToast(`壁${whichEnd === 'start' ? (obj.orient === 'h' ? '左端' : '上端') : (obj.orient === 'h' ? '右端' : '下端')}から ${offsetMm}mm の位置に配置しました`);
}
window.setOpeningOffsetFromWallEnd = setOpeningOffsetFromWallEnd;

function centerSelectedOpeningOnWall() {
    const obj = findSelectedObject();
    if (!obj || !state.selectedItem || state.selectedItem.kind !== 'opening') return;
    const span = getOpeningHostWallSpan(obj);
    if (!span) return;
    const pitch = state.modulePitch || 910;
    const widthP = obj.widthP || (obj.widthMm ? obj.widthMm / pitch : 1.0);
    const midCoord = +((span.minCoord + span.maxCoord) / 2).toFixed(4);
    const nextX = obj.orient === 'h' ? midCoord : obj.x;
    const nextY = obj.orient === 'v' ? midCoord : obj.y;
    if (checkOpeningOverlap(state.currentFloor, nextX, nextY, obj.orient, widthP, obj.id)) {
        showToast('中央位置に他の建具・窓があるため移動できません', true);
        return;
    }
    obj.x = nextX;
    obj.y = nextY;
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    showToast('開口部を壁の中央に配置しました');
}
window.centerSelectedOpeningOnWall = centerSelectedOpeningOnWall;

// ============================================================================
// PARTIAL WALL DELETION (壁の上をドラッグした区間だけを切り欠き分割削除)
// ============================================================================

function distPointToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-8) return Math.hypot(px - x1, py - y1);
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
    const ccw = (p1x, p1y, p2x, p2y, p3x, p3y) => (p3y - p1y) * (p2x - p1x) > (p2y - p1y) * (p3x - p1x);
    return (ccw(ax, ay, cx, cy, dx, dy) !== ccw(bx, by, cx, cy, dx, dy)) &&
        (ccw(ax, ay, bx, by, cx, cy) !== ccw(ax, ay, bx, by, dx, dy));
}

function splitOrEraseWallSegment(fl, ptA, ptB) {
    if (!fl || !fl.walls) return false;
    const isDragHoriz = Math.abs(ptA.x - ptB.x) >= Math.abs(ptA.y - ptB.y);
    const minDragX = Math.min(ptA.x, ptB.x);
    const maxDragX = Math.max(ptA.x, ptB.x);
    const minDragY = Math.min(ptA.y, ptB.y);
    const maxDragY = Math.max(ptA.y, ptB.y);
    const dragLen = Math.hypot(ptB.x - ptA.x, ptB.y - ptA.y);

    let modified = false;
    const nextWalls = [];

    for (const wl of fl.walls) {
        const isWlHoriz = Math.abs(wl.y1 - wl.y2) < 0.05;
        const isWlVert = Math.abs(wl.x1 - wl.x2) < 0.05;
        if (isWlHoriz && isDragHoriz && Math.abs(wl.y1 - ptA.y) <= 0.45 && maxDragX - minDragX >= 0.2) {
            const wMin = Math.min(wl.x1, wl.x2);
            const wMax = Math.max(wl.x1, wl.x2);
            const cutStart = Math.max(wMin, snapP(minDragX));
            const cutEnd = Math.min(wMax, snapP(maxDragX));
            if (cutEnd > cutStart + 0.05) {
                modified = true;
                if (cutStart > wMin + 0.05) {
                    nextWalls.push({ ...wl, id: uid(), x1: wMin, y1: wl.y1, x2: cutStart, y2: wl.y1 });
                }
                if (wMax > cutEnd + 0.05) {
                    nextWalls.push({ ...wl, id: uid(), x1: cutEnd, y1: wl.y1, x2: wMax, y2: wl.y1 });
                }
                continue;
            }
        } else if (isWlVert && !isDragHoriz && Math.abs(wl.x1 - ptA.x) <= 0.45 && maxDragY - minDragY >= 0.2) {
            const wMin = Math.min(wl.y1, wl.y2);
            const wMax = Math.max(wl.y1, wl.y2);
            const cutStart = Math.max(wMin, snapP(minDragY));
            const cutEnd = Math.min(wMax, snapP(maxDragY));
            if (cutEnd > cutStart + 0.05) {
                modified = true;
                if (cutStart > wMin + 0.05) {
                    nextWalls.push({ ...wl, id: uid(), x1: wl.x1, y1: wMin, x2: wl.x1, y2: cutStart });
                }
                if (wMax > cutEnd + 0.05) {
                    nextWalls.push({ ...wl, id: uid(), x1: wl.x1, y1: cutEnd, x2: wl.x1, y2: wMax });
                }
                continue;
            }
        } else if (dragLen >= 0.2) {
            // 斜め壁や壁を横切る消しゴムドラッグも消去対象に
            const hitCross = segmentsIntersect(ptA.x, ptA.y, ptB.x, ptB.y, wl.x1, wl.y1, wl.x2, wl.y2);
            const midX = (ptA.x + ptB.x) / 2;
            const midY = (ptA.y + ptB.y) / 2;
            const hitNear = distPointToSegment(midX, midY, wl.x1, wl.y1, wl.x2, wl.y2) <= 0.30;
            if (hitCross || hitNear) {
                modified = true;
                continue;
            }
        }
        nextWalls.push(wl);
    }

    if (modified) {
        fl.walls = nextWalls;
    }
    return modified;
}

// ============================================================================
// POINTER EVENTS (RULER GUIDES, WALLS, SPACES, MEMOS, SELECTION)
// ============================================================================

function updatePointerStatusBadge(e) {
    const badge = document.getElementById('pointerBadge');
    const txt = document.getElementById('pointerStatusText');
    if (!badge || !txt) return;
    const pType = e.pointerType || 'mouse';
    const press = e.pressure ? e.pressure.toFixed(2) : '0.50';
    if (pType === 'pen') {
        if (!state.penDetectedOnce) {
            state.penDetectedOnce = true;
            // 自動モード時：ペン入力を初検知したら自動的にパームリジェクションをONに切替
            if (state.inputModeSetting === 'auto' && !state.stylusOnlyMode) {
                state.stylusOnlyMode = true;
                if (typeof syncPalmRejectionUI === 'function') syncPalmRejectionUI();
                showToast('🖊️ スタイラスペンを検知しました！パームリジェクション（手のひら誤タッチ防止）を自動有効化しました');
            }
        }
        badge.className = 'inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse';
        txt.textContent = `ペン入力 (${state.gridDivisions}分割・筆圧:${press})`;
    } else if (pType === 'touch') {
        badge.className = 'inline-block w-2.5 h-2.5 rounded-full bg-sky-400';
        txt.textContent = state.stylusOnlyMode ? '指タッチ: 画面移動(手のひら防止中)' : `タッチ入力 (${state.gridDivisions}分割)`;
    } else {
        badge.className = 'inline-block w-2.5 h-2.5 rounded-full bg-emerald-400';
        txt.textContent = `マウス入力 (${state.gridDivisions}分割・${(state.modulePitch / state.gridDivisions).toFixed(0)}mm)`;
    }
}

let activeTouchCount = 0;
const activeTouchPointers2D = new Map();
let activePenPointerId = null;
let lastPenActivityTime = 0;
const PEN_COOLDOWN_MS = 420; // Apple Pencil離脱直後の手のひら遅延タッチ誤作動を防ぐ保護時間

function isPenCurrentlyActiveOrCoolingDown() {
    if (activePenPointerId !== null) return true;
    return (Date.now() - lastPenActivityTime) < PEN_COOLDOWN_MS;
}

canvas2d.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { canvas2d.setPointerCapture(e.pointerId); } catch (_) { }
    updatePointerStatusBadge(e);

    const rect = canvas2d.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // 🖊️ Apple Pencil最優先ガード：ペンが触れたら即座にペンIDを記録し、進行中の指タッチ/ピンチ/パンを強制解除
    if (e.pointerType === 'pen') {
        activePenPointerId = e.pointerId;
        lastPenActivityTime = Date.now();
        activeTouchPointers2D.clear();
        activeTouchCount = 0;
        if (state.dragAction && (state.dragAction.type === 'pinch' || state.dragAction.type === 'pan')) {
            state.dragAction = null;
        }
    } else if (e.pointerType === 'touch') {
        // ペン筆記中またはペンを離してから420ms以内の指・手のひら接触は100%無視（誤作動防止を最優先）
        if (isPenCurrentlyActiveOrCoolingDown()) {
            return;
        }
        // 手のひら等の大面積接触（width/height > 30px）はピンチ用ポインターに登録しない
        const isLargePalmContact = ((e.width && e.width > 30) || (e.height && e.height > 30));
        if (!isLargePalmContact) {
            activeTouchPointers2D.set(e.pointerId, { sx, sy });
        }
        activeTouchCount = activeTouchPointers2D.size;

        // 🤏 2本指ピンチイン・ピンチアウト開始判定（ペン非使用時かつ2本の指が28px以上離れている場合）
        if (activeTouchPointers2D.size === 2) {
            const pts = Array.from(activeTouchPointers2D.values());
            const dist = Math.hypot(pts[0].sx - pts[1].sx, pts[0].sy - pts[1].sy);
            if (dist >= 28) {
                const midSX = (pts[0].sx + pts[1].sx) / 2;
                const midSY = (pts[0].sy + pts[1].sy) / 2;
                const anchorWorld = screenToWorldP(midSX, midSY);
                // 1本指目で開始しかけていた壁クリック等があれば安全にキャンセル
                state.wallClickStart = null;
                state.dragAction = {
                    type: 'pinch',
                    startDist: dist,
                    startZoom: state.cam2d.zoom,
                    anchorWorldX: anchorWorld.x,
                    anchorWorldY: anchorWorld.y
                };
                request2DRedraw();
                return;
            }
        }
        if (isLargePalmContact) {
            return;
        }
    }

    const worldPos = screenToWorldP(sx, sy);
    const snappedX = snapP(worldPos.x);
    const snappedY = snapP(worldPos.y);
    state.lastHoverWorld = { x: snappedX, y: snappedY };

    // 🖐️ パームリジェクション判定：
    // 1. ペン専用モード時の1本指タッチ (e.pointerType === 'touch') ➔ 画面パン移動（2本指になれば上のpinchへ自動昇格）
    // 2. 2本指以上のマルチタッチ
    if ((state.stylusOnlyMode && e.pointerType === 'touch') || activeTouchCount >= 2) {
        state.dragAction = {
            type: 'pan',
            startSX: sx,
            startSY: sy,
            origCamX: state.cam2d.x,
            origCamY: state.cam2d.y
        };
        return;
    }

    // 📏 1. ものさし（ルーラー）からの補助線引き出し・移動
    if (state.rulerMode && !state.guidesLocked) {
        if (sy <= 24 && sx > 24) {
            const newG = { id: uid(), axis: 'h', pos: snappedY, posP: snappedY };
            state.guides.push(newG);
            state.selectedGuideId = newG.id;
            state.selectedItem = { kind: 'guide', id: newG.id, floor: state.currentFloor };
            state.dragAction = { type: 'guide', guide: newG };
            request2DRedraw();
            return;
        }
        if (sx <= 24 && sy > 24) {
            const newG = { id: uid(), axis: 'v', pos: snappedX, posP: snappedX };
            state.guides.push(newG);
            state.selectedGuideId = newG.id;
            state.selectedItem = { kind: 'guide', id: newG.id, floor: state.currentFloor };
            state.dragAction = { type: 'guide', guide: newG };
            request2DRedraw();
            return;
        }
        // 既存補助線のヒットテスト
        if (state.guides && state.guides.length > 0) {
            for (const g of state.guides) {
                const gPos = g.pos !== undefined ? g.pos : g.posP;
                if (g.axis === 'h' && Math.abs(worldPos.y - gPos) < 0.25) {
                    state.selectedGuideId = g.id;
                    state.selectedItem = { kind: 'guide', id: g.id, floor: state.currentFloor };
                    state.dragAction = { type: 'guide', guide: g };
                    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
                    request2DRedraw();
                    return;
                }
                if (g.axis === 'v' && Math.abs(worldPos.x - gPos) < 0.25) {
                    state.selectedGuideId = g.id;
                    state.selectedItem = { kind: 'guide', id: g.id, floor: state.currentFloor };
                    state.dragAction = { type: 'guide', guide: g };
                    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
                    request2DRedraw();
                    return;
                }
            }
        }
    }

    if (state.planLocked && state.paletteMode === 'build' && state.activeTool !== 'pan' && state.activeTool !== 'select') {
        showToast('🔒「この図面をピン止めする」が有効です。編集するにはロックを解除してください', true);
        return;
    }

    const isTouchPan = (state.stylusOnlyMode && e.pointerType === 'touch') || state.activeTool === 'pan' || e.button === 1 || e.button === 2;
    if (isTouchPan) {
        state.dragAction = {
            type: 'pan',
            startSX: sx,
            startSY: sy,
            origCamX: state.cam2d.x,
            origCamY: state.cam2d.y
        };
        return;
    }

    const fl = state.floors[state.currentFloor];
    const minStep = 1 / state.gridDivisions;

    // 📝 2. メモ注釈モードのツール群
    if (state.activeTool && state.activeTool.startsWith('memo_')) {
        handleMemoPointerDown(state.activeTool, worldPos, snappedX, snappedY, e);
        return;
    }

    // 3. 選択・移動・リサイズ判定
    if (state.activeTool === 'select' || state.activeTool === 'opening' || state.activeTool === 'fixture') {
        if (tryStartSelectOrModifyInteraction(worldPos.x, worldPos.y, state.activeTool !== 'select')) {
            return;
        }
    }

    // 4. 空間ツール（部屋、吹き抜け、玄関土間、小上り、畳、中庭、天井）
    const spaceToolMap = {
        'room': state.subRoomType || 'LDK',
        'fukinuke': 'VOID',
        'doma': 'DOMA',
        'koagari': 'KOAGARI',
        'tatami': 'TATAMI',
        'nakaniwa': 'NAKANIWA',
        'tenjo': 'TENJO'
    };
    if (spaceToolMap[state.activeTool]) {
        state.dragAction = {
            type: 'room',
            roomType: spaceToolMap[state.activeTool],
            startX: snappedX,
            startY: snappedY,
            curX: snappedX,
            curY: snappedY
        };
        request2DRedraw();
        return;
    }

    // 5. 3D直方体ツール
    if (state.activeTool === 'box3d') {
        state.dragAction = {
            type: 'box3d',
            startX: snappedX,
            startY: snappedY,
            curX: snappedX,
            curY: snappedY
        };
        request2DRedraw();
        return;
    }

    // 6. 多角形柱ツール
    if (state.activeTool === 'poly_pillar') {
        if (!state.polyPillarPoints) state.polyPillarPoints = [];
        const pts = state.polyPillarPoints;
        if (pts.length >= 3 && Math.hypot(pts[0].x - snappedX, pts[0].y - snappedY) < 0.35) {
            finishPolyPillar();
            return;
        }
        pts.push({ x: snappedX, y: snappedY });
        state.polyPoints = pts;
        showToast(`多角形柱の頂点 ${pts.length} 点目を追加しました（始点タップまたは完了ボタンで確定）`);
        if (typeof renderSubToolbar === 'function') renderSubToolbar();
        request2DRedraw();
        return;
    }

    // 7. 独立柱ツール
    if (state.activeTool === 'pillar' || (state.activeTool === 'wall' && state.subWallType === 'pillar')) {
        const pSize = state.subPillarSize || 150;
        const pShape = state.subPillarShape || 'square';
        const newPillar = { id: uid(), x: snappedX, y: snappedY, sizeMm: pSize, shape: pShape };
        fl.pillars.push(newPillar);
        state.selectedItem = { kind: 'pillar', id: newPillar.id, floor: state.currentFloor };
        saveHistorySnapshot();
        if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
        request2DRedraw();
        if (typeof rebuild3DScene === 'function') rebuild3DScene();
        showToast(`柱 (${pShape === 'round' ? '円柱φ' : '角柱'}${pSize}mm) を配置しました`);
        return;
    }

    // 8. 壁4種ツール（壁 / たれ壁 / 腰壁 / 上り框 ＆ 斜め壁モード対応）
    if (state.activeTool === 'wall') {
        const wType = state.subWallType || 'wall';
        if (state.wallClickStart) {
            const x1 = state.wallClickStart.x;
            const y1 = state.wallClickStart.y;
            const dx = Math.abs(snappedX - x1);
            const dy = Math.abs(snappedY - y1);
            let x2, y2;
            if (state.diagonalWallMode) {
                x2 = snappedX;
                y2 = snappedY;
            } else {
                x2 = dx >= dy ? snappedX : x1;
                y2 = dx >= dy ? y1 : snappedY;
            }

            if (x1 !== x2 || y1 !== y2) {
                let initH = 2450;
                if (wType === 'koshikabe') initH = 1000;
                else if (wType === 'tarekabe') initH = 550;
                else if (wType === 'agarikamachi') initH = 180;
                fl.walls.push({
                    id: uid(),
                    x1: x1,
                    y1: y1,
                    x2: x2,
                    y2: y2,
                    wallType: wType,
                    heightMm: initH
                });
                saveHistorySnapshot();
                if (typeof triggerAutoRoomDetection === 'function') triggerAutoRoomDetection();
                const wLabel = (Array.isArray(window.WALL_SUBTYPES) ? window.WALL_SUBTYPES.find(w => w.id === wType)?.label : null) || '壁';
                showToast(`${wLabel}を作成しました`);
            }
            state.wallClickStart = null;
            state.dragAction = null;
            request2DRedraw();
            if (typeof rebuild3DScene === 'function') rebuild3DScene();
            return;
        } else {
            state.wallClickStart = { x: snappedX, y: snappedY };
            state.dragAction = {
                type: 'wall',
                wallType: wType,
                startX: snappedX,
                startY: snappedY,
                curX: snappedX,
                curY: snappedY
            };
            request2DRedraw();
        }
    } else if (state.activeTool === 'stair') {
        const stairMode = state.stairDrawMode || 'preset';
        if (stairMode === 'preset') {
            const presetType = state.stairPresetType || 'STRAIGHT';
            const turnSpec = state.stairTurnSpec || 'turn_3';
            placeStairPresetAt(presetType, snappedX, snappedY, turnSpec);
            return;
        } else {
            handleStairPointerDown(snappedX, snappedY, worldPos.x, worldPos.y);
            return;
        }
    } else if (state.activeTool === 'opening') {
        placeOpeningAt(worldPos.x, worldPos.y);
    } else if (state.activeTool === 'fixture') {
        placeFixtureOnCanvas(snappedX, snappedY);
    } else if (state.activeTool === 'pen') {
        if (state.subStampSymbol) {
            fl.stamps.push({
                id: uid(),
                text: state.subStampSymbol,
                x: worldPos.x,
                y: worldPos.y,
                color: state.subPenColor
            });
            saveHistorySnapshot();
            request2DRedraw();
        } else {
            const newStroke = {
                id: uid(),
                color: state.subPenColor,
                size: state.subPenSize,
                points: [{ x: worldPos.x, y: worldPos.y, p: e.pressure || 0.5 }]
            };
            fl.strokes.push(newStroke);
            state.dragAction = { type: 'pen', stroke: newStroke };
            request2DRedraw();
        }
    } else if (state.activeTool === 'eraser') {
        eraseAtPoint(worldPos.x, worldPos.y);
        state.dragAction = {
            type: 'eraser',
            startX: worldPos.x,
            startY: worldPos.y,
            curX: worldPos.x,
            curY: worldPos.y
        };
    }
});

// 設備・家具の配置（検討③決定仕様：パレットから選んでタップするだけで壁に自動吸着配置）
function placeFixtureOnCanvas(snappedX, snappedY) {
    const fl = state.floors[state.currentFloor];
    const cat = state.subFixtureCategory || 'KITCHEN';
    const pitch = state.modulePitch || 910;
    let wMm, dMm, hMm, wP, hP, label, fxData = {};

    if (cat === 'KITCHEN' || cat === 'KITCHEN_L') {
        const kType = cat === 'KITCHEN_L' ? 'L' : (state.subKitchenType || 'I');
        hMm = state.subKitchenHeight || 850;
        if (kType === 'I') {
            wMm = state.subKitchenIWidth || 2550;
            dMm = state.subKitchenIDepth || 650;
            label = `I型キッチン (${wMm / 10}×${dMm / 10}cm)`;
        } else if (kType === 'L') {
            wMm = state.subKitchenLXWidth || 2550;
            dMm = state.subKitchenLYWidth || 1820;
            label = `L型キッチン (${wMm / 10}×${dMm / 10}cm)`;
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
        fxData.kHeight = hMm;
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
        fxData.vHeight = hMm;
    } else {
        const ft = (window.FIXTURE_TYPES && window.FIXTURE_TYPES[cat]) || { wP: 1.0, hP: 1.0, label: '設備' };
        wP = ft.wP;
        hP = ft.hP;
        wMm = Math.round(wP * pitch);
        dMm = Math.round(hP * pitch);
        hMm = ft.hMm || 800;
        label = ft.label;
    }

    let rot = (((state.subFixtureRot || 0) % 360) + 360) % 360;
    let finalWP = (rot === 90 || rot === 270) ? hP : wP;
    let finalHP = (rot === 90 || rot === 270) ? wP : hP;
    const isKitchenL = (cat === 'KITCHEN_L') || (fxData && fxData.kitchenType === 'L');

    let placeX = snappedX;
    let placeY = snappedY;
    let didWallSnap = false;
    const wallSnap = findNearestWallForFixture(snappedX, snappedY, finalWP, finalHP, isKitchenL, rot, cat);
    if (wallSnap) {
        didWallSnap = true;
        placeX = wallSnap.x;
        placeY = wallSnap.y;
        if (wallSnap.autoRot !== undefined && !state.subFixtureRotManual) {
            rot = wallSnap.autoRot;
            finalWP = (rot === 90 || rot === 270) ? hP : wP;
            finalHP = (rot === 90 || rot === 270) ? wP : hP;
            // 新しい finalWP / finalHP で壁またはコーナー座標を再計算してピタッと吸着させる
            const resnap = findNearestWallForFixture(snappedX, snappedY, finalWP, finalHP, isKitchenL, rot, cat);
            if (resnap) {
                placeX = resnap.x;
                placeY = resnap.y;
            }
        }
    }

    const newFx = {
        id: uid(),
        type: cat,
        category: cat,
        x: placeX,
        y: placeY,
        w: finalWP,
        h: finalHP,
        wMm: (rot === 90 || rot === 270) ? dMm : wMm,
        dMm: (rot === 90 || rot === 270) ? wMm : dMm,
        baseWMm: wMm,
        baseDMm: dMm,
        hMm: hMm,
        rot: rot,
        flipX: !!state.subFixtureFlipX,
        flipY: !!state.subFixtureFlipY,
        label: label,
        kHeight: fxData.kHeight || 850,
        vHeight: fxData.vHeight || 800,
        ubPattern: fxData.ubPattern || 'patternA',
        fxData: fxData
    };

    fl.fixtures.push(newFx);
    state.selectedItem = { kind: 'fixture', id: newFx.id, floor: state.currentFloor };
    saveHistorySnapshot();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast(didWallSnap ? `${label} を壁に吸着配置しました` : `${label} を指定位置に配置しました`);
}

function findNearestWallForFixture(curX, curY, wP, hP, isCornerFixture = false, currentRot = 0, fixtureCategory = '') {
    const fl = state.floors[state.currentFloor];
    if (!fl) return null;
    if (state.subFixtureWallSnap === false) return null;

    // ダイニングセット・ソファ・ベッド・アイランドキッチン等の自立家具は、部屋中央へ意図通り置けるよう壁際ごく近く(0.28P)以外は強制吸着しない
    const cat = fixtureCategory || state.subFixtureCategory || '';
    const isIslandKitchen = (cat === 'KITCHEN' && state.subKitchenType === 'ISLAND');
    const isFreestandingFurniture = isIslandKitchen || ['DINING_SET', 'SOFA', 'BED_DOUBLE', 'BED_SINGLE', 'DESK'].includes(cat);

    const wallThickM = 0.13;
    const scaleP = (state.modulePitch || 910) / 1000;
    const halfWallP = +((wallThickM / 2) / scaleP).toFixed(3);
    const snapDistanceThreshold = isCornerFixture ? 0.95 : (isFreestandingFurniture ? 0.25 : 0.45);

    let bestHoriz = null;
    let minHorizDist = snapDistanceThreshold;
    let bestVert = null;
    let minVertDist = snapDistanceThreshold;

    const centerX = curX + wP / 2;
    const centerY = curY + hP / 2;

    const checkHorizEdge = (edgeY, x1, x2, wallRef) => {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        if (curX + wP >= minX - 0.35 && curX <= maxX + 0.35) {
            const dist = Math.min(Math.abs(curY - edgeY), Math.abs((curY + hP) - edgeY), Math.abs(centerY - edgeY));
            if (dist < minHorizDist) {
                minHorizDist = dist;
                if (centerY >= edgeY) {
                    bestHoriz = { x: curX, y: +(edgeY + halfWallP).toFixed(3), side: 'top', wall: wallRef, rot: 0, autoRot: 0, dist };
                } else {
                    bestHoriz = { x: curX, y: +(edgeY - halfWallP - hP).toFixed(3), side: 'bottom', wall: wallRef, rot: 180, autoRot: 180, dist };
                }
            }
        }
    };

    const checkVertEdge = (edgeX, y1, y2, wallRef) => {
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        if (curY + hP >= minY - 0.35 && curY <= maxY + 0.35) {
            const dist = Math.min(Math.abs(curX - edgeX), Math.abs((curX + wP) - edgeX), Math.abs(centerX - edgeX));
            if (dist < minVertDist) {
                minVertDist = dist;
                if (centerX >= edgeX) {
                    // 西壁(左壁)に背面を付ける = 270°回転 (背面が左壁側、正面が右向き)
                    bestVert = { x: +(edgeX + halfWallP).toFixed(3), y: curY, side: 'left', wall: wallRef, rot: 270, autoRot: 270, dist };
                } else {
                    // 東壁(右壁)に背面を付ける = 90°回転 (背面が右壁側、正面が左向き)
                    bestVert = { x: +(edgeX - halfWallP - wP).toFixed(3), y: curY, side: 'right', wall: wallRef, rot: 90, autoRot: 90, dist };
                }
            }
        }
    };

    if (fl.walls && fl.walls.length > 0) {
        fl.walls.forEach(wl => {
            const isHoriz = Math.abs(wl.y1 - wl.y2) < 0.05;
            const isVert = Math.abs(wl.x1 - wl.x2) < 0.05;
            if (isHoriz) checkHorizEdge(wl.y1, wl.x1, wl.x2, wl);
            else if (isVert) checkVertEdge(wl.x1, wl.y1, wl.y2, wl);
        });
    }

    if (fl.rooms && fl.rooms.length > 0) {
        fl.rooms.forEach(rm => {
            checkHorizEdge(rm.y, rm.x, rm.x + rm.w, null);
            checkHorizEdge(rm.y + rm.h, rm.x, rm.x + rm.w, null);
            checkVertEdge(rm.x, rm.y, rm.y + rm.h, null);
            checkVertEdge(rm.x + rm.w, rm.y, rm.y + rm.h, null);
        });
    }

    // L型キッチンなどのコーナー設備：水平壁（上/下）と垂直壁（左/右）の両方が近くにあれば2面同時吸着（コーナー吸着）！
    if (isCornerFixture && bestHoriz && bestVert) {
        // 吸着した壁コーナーの向き（左上=0°, 右上=90°, 右下=180°, 左下=270°）を算出
        let autoRot = currentRot || 0;
        if (bestHoriz.side === 'top' && bestVert.side === 'left') autoRot = 0;       // ↖北西角
        else if (bestHoriz.side === 'top' && bestVert.side === 'right') autoRot = 90;  // ↗北東角
        else if (bestHoriz.side === 'bottom' && bestVert.side === 'right') autoRot = 180; // ↘南東角
        else if (bestHoriz.side === 'bottom' && bestVert.side === 'left') autoRot = 270;  // ↙南西角

        return {
            x: bestVert.x,
            y: bestHoriz.y,
            side: `${bestHoriz.side}_${bestVert.side}`,
            rot: autoRot,
            autoRot: autoRot
        };
    }

    if (bestHoriz && bestVert) {
        return bestHoriz.dist <= bestVert.dist ? bestHoriz : bestVert;
    }
    return bestHoriz || bestVert;
}

// 📝 メモ注釈ツールのポインターダウン処理
function handleMemoPointerDown(tool, worldPos, snappedX, snappedY, e) {
    const fl = state.floors[state.currentFloor];
    if (!fl.memos) fl.memos = [];

    if (tool === 'memo_select') {
        // まず選択中の曲線メモの赤丸（●）頂点ヒット判定
        if (state.selectedItem && state.selectedItem.kind === 'memo') {
            const selMemo = fl.memos.find(m => m.id === state.selectedItem.id);
            if (selMemo && selMemo.memoType === 'curve') {
                const pts = [
                    { key: 'p1', x: selMemo.x1, y: selMemo.y1 },
                    { key: 'cp', x: selMemo.cx !== undefined ? selMemo.cx : (selMemo.x1 + selMemo.x2) / 2, y: selMemo.cy !== undefined ? selMemo.cy : (selMemo.y1 + selMemo.y2) / 2 - 1.0 },
                    { key: 'p2', x: selMemo.x2, y: selMemo.y2 }
                ];
                for (const pt of pts) {
                    if (Math.hypot(worldPos.x - pt.x, worldPos.y - pt.y) < 0.35) {
                        state.dragAction = { type: 'memo_curve_vertex', memo: selMemo, vertexKey: pt.key };
                        return;
                    }
                }
            }
        }
        // メモ要素のヒットテスト
        for (let i = fl.memos.length - 1; i >= 0; i--) {
            const m = fl.memos[i];
            const mx = m.x !== undefined ? m.x : (m.x1 + m.x2) / 2;
            const my = m.y !== undefined ? m.y : (m.y1 + m.y2) / 2;
            if (Math.hypot(worldPos.x - mx, worldPos.y - my) < 0.75) {
                state.selectedItem = { kind: 'memo', id: m.id, floor: state.currentFloor };
                state.dragAction = { type: 'move_memo', memo: m, lastWX: worldPos.x, lastWY: worldPos.y };
                if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
                request2DRedraw();
                return;
            }
        }
        state.selectedItem = null;
        if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
        request2DRedraw();
        return;
    }

    if (tool === 'memo_delete') {
        const before = fl.memos.length;
        fl.memos = fl.memos.filter(m => {
            const mx = m.x !== undefined ? m.x : (m.x1 + m.x2) / 2;
            const my = m.y !== undefined ? m.y : (m.y1 + m.y2) / 2;
            return Math.hypot(worldPos.x - mx, worldPos.y - my) > 0.65;
        });
        if (fl.memos.length !== before) {
            saveHistorySnapshot();
            request2DRedraw();
            showToast('メモ注釈を削除しました');
        }
        return;
    }

    if (tool === 'memo_text') {
        const txt = prompt('図面に配置するテキストを入力してください:', state.memoTextValue || '注記テキスト');
        if (txt) {
            state.memoTextValue = txt;
            const newM = { id: uid(), memoType: 'text', x: worldPos.x, y: worldPos.y, text: txt, fontSize: state.memoFontSize || 13, color: state.subPenColor || '#1e293b' };
            fl.memos.push(newM);
            state.selectedItem = { kind: 'memo', id: newM.id, floor: state.currentFloor };
            saveHistorySnapshot();
            request2DRedraw();
            showToast('テキスト注釈を配置しました');
        }
        return;
    }

    if (tool === 'memo_area') {
        const newM = { id: uid(), memoType: 'area_table', x: snappedX, y: snappedY };
        fl.memos.push(newM);
        state.selectedItem = { kind: 'memo', id: newM.id, floor: state.currentFloor };
        saveHistorySnapshot();
        request2DRedraw();
        showToast('面積表を図面上に配置しました');
        return;
    }

    if (tool === 'memo_switch' || tool === 'memo_outlet' || tool === 'memo_light' || tool === 'memo_compass') {
        const symMap = { 'memo_switch': 'switch', 'memo_outlet': 'outlet', 'memo_light': 'light_down', 'memo_compass': 'compass' };
        const newM = { id: uid(), memoType: 'symbol', symbolId: symMap[tool], x: worldPos.x, y: worldPos.y, rot: 0, color: '#0f172a' };
        fl.memos.push(newM);
        state.selectedItem = { kind: 'memo', id: newM.id, floor: state.currentFloor };
        saveHistorySnapshot();
        request2DRedraw();
        showToast('記号を配置しました');
        return;
    }

    if (tool === 'memo_custom_sym') {
        const cSyms = state.customSymbols || [];
        const chosen = cSyms[0] || { label: '特記' };
        const newM = { id: uid(), memoType: 'custom_sym', label: chosen.label, x: worldPos.x, y: worldPos.y, color: state.subPenColor || '#0f172a' };
        fl.memos.push(newM);
        state.selectedItem = { kind: 'memo', id: newM.id, floor: state.currentFloor };
        saveHistorySnapshot();
        request2DRedraw();
        showToast(`オリジナル記号「${chosen.label}」を配置しました`);
        return;
    }

    if (tool === 'memo_freehand' || tool === 'memo_marker') {
        const isMarker = tool === 'memo_marker';
        const newStroke = {
            id: uid(),
            color: isMarker ? 'rgba(250, 204, 21, 0.45)' : (state.subPenColor || '#ef4444'),
            size: isMarker ? 14 : (state.subPenSize || 3),
            points: [{ x: worldPos.x, y: worldPos.y, p: e.pressure || 0.5 }]
        };
        fl.strokes.push(newStroke);
        state.dragAction = { type: 'pen', stroke: newStroke };
        request2DRedraw();
        return;
    }

    // 2点ドラッグ系メモ（memo_dim, memo_leader, memo_line, memo_curve, memo_ellipse）
    const dragTypeMap = {
        'memo_dim': 'dim',
        'memo_leader': 'leader',
        'memo_line': 'line',
        'memo_curve': 'curve',
        'memo_ellipse': 'ellipse'
    };
    const mType = dragTypeMap[tool];
    if (mType) {
        const newM = {
            id: uid(),
            memoType: mType,
            x1: snappedX,
            y1: snappedY,
            x2: snappedX + 1.5,
            y2: snappedY,
            cx: snappedX + 0.75,
            cy: snappedY - 0.8,
            x: snappedX,
            y: snappedY,
            rx: 0.8,
            ry: 0.5,
            color: state.subPenColor || '#dc2626',
            lineStyle: state.memoLineStyle || 'solid',
            arrowStart: state.memoArrowStart || false,
            arrowEnd: state.memoArrowEnd || (mType === 'leader'),
            text: mType === 'leader' ? (state.memoTextValue || '引き出し注記') : ''
        };
        fl.memos.push(newM);
        state.selectedItem = { kind: 'memo', id: newM.id, floor: state.currentFloor };
        state.dragAction = { type: 'memo_drag_create', memo: newM };
        request2DRedraw();
    }
}

function finishPolyPillar() {
    const fl = state.floors[state.currentFloor];
    const pts = (state.polyPillarPoints && state.polyPillarPoints.length >= 3) ? state.polyPillarPoints : state.polyPoints;
    if (!pts || pts.length < 3) {
        showToast('多角形柱を作成するには3点以上の頂点をタップしてください', true);
        return;
    }
    if (!fl.polyPillars) fl.polyPillars = [];
    fl.polyPillars.push({
        id: uid(),
        points: JSON.parse(JSON.stringify(pts))
    });
    state.polyPillarPoints = [];
    state.polyPoints = [];
    saveHistorySnapshot();
    if (typeof renderSubToolbar === 'function') renderSubToolbar();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast('多角形柱を作成しました');
}
window.finishPolyPillar = finishPolyPillar;

// --- Unified Hit-Test for Selecting, Moving, and Resizing ---
function tryStartSelectOrModifyInteraction(wx, wy, onlyHitExistingOfSameToolType = false) {
    const fl = state.floors[state.currentFloor];
    const selObj = findSelectedObject();
    const tol = 0.38;

    // 1. Check active selection's resize handles first
    if (selObj && state.selectedItem.floor === state.currentFloor) {
        if (state.selectedItem.kind === 'room' || state.selectedItem.kind === 'fixture' || state.selectedItem.kind === 'stair' || state.selectedItem.kind === 'box3d') {
            const corners = [
                { name: 'tl', cx: selObj.x, cy: selObj.y },
                { name: 'tr', cx: selObj.x + selObj.w, cy: selObj.y },
                { name: 'bl', cx: selObj.x, cy: selObj.y + selObj.h },
                { name: 'br', cx: selObj.x + selObj.w, cy: selObj.y + selObj.h }
            ];
            for (const c of corners) {
                if (Math.hypot(wx - c.cx, wy - c.cy) <= tol) {
                    state.dragAction = { type: 'resize_box', target: selObj, corner: c.name };
                    return true;
                }
            }
        } else if (state.selectedItem.kind === 'opening') {
            const halfW = (selObj.widthP || 1.0) / 2;
            const ends = selObj.orient === 'h'
                ? [{ x: selObj.x - halfW, y: selObj.y }, { x: selObj.x + halfW, y: selObj.y }]
                : [{ x: selObj.x, y: selObj.y - halfW }, { x: selObj.x, y: selObj.y + halfW }];
            for (const endPt of ends) {
                if (Math.hypot(wx - endPt.x, wy - endPt.y) <= tol) {
                    state.dragAction = { type: 'resize_opening', opening: selObj };
                    return true;
                }
            }
        }
    }

    // 2. Hit-test Openings (Windows & Doors)
    if (!onlyHitExistingOfSameToolType || state.activeTool === 'opening') {
        for (let i = fl.openings.length - 1; i >= 0; i--) {
            const op = fl.openings[i];
            const halfW = (op.widthP || 1.0) / 2;
            const hit = op.orient === 'h'
                ? (Math.abs(wx - op.x) <= halfW + 0.2 && Math.abs(wy - op.y) <= 0.35)
                : (Math.abs(wy - op.y) <= halfW + 0.2 && Math.abs(wx - op.x) <= 0.35);
            if (hit) {
                state.selectedItem = { kind: 'opening', id: op.id, floor: state.currentFloor };
                state.dragAction = { type: 'move_opening', opening: op };
                if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
                request2DRedraw();
                return true;
            }
        }
    }

    // 3. Hit-test Fixtures (Equipment)
    if (!onlyHitExistingOfSameToolType || state.activeTool === 'fixture') {
        for (let i = fl.fixtures.length - 1; i >= 0; i--) {
            const fx = fl.fixtures[i];
            if (wx >= fx.x && wx <= fx.x + fx.w && wy >= fx.y && wy <= fx.y + fx.h) {
                state.selectedItem = { kind: 'fixture', id: fx.id, floor: state.currentFloor };
                state.dragAction = {
                    type: 'move_box',
                    target: fx,
                    offsetX: wx - fx.x,
                    offsetY: wy - fx.y
                };
                if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
                request2DRedraw();
                return true;
            }
        }
    }

    // 3b. Hit-test 3D Boxes (直方体)
    if (!onlyHitExistingOfSameToolType || state.activeTool === 'box3d') {
        const boxes = fl.boxes3d || [];
        for (let i = boxes.length - 1; i >= 0; i--) {
            const bx = boxes[i];
            if (wx >= bx.x && wx <= bx.x + bx.w && wy >= bx.y && wy <= bx.y + bx.h) {
                state.selectedItem = { kind: 'box3d', id: bx.id, floor: state.currentFloor };
                state.dragAction = {
                    type: 'move_box',
                    target: bx,
                    offsetX: wx - bx.x,
                    offsetY: wy - bx.y
                };
                if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
                request2DRedraw();
                return true;
            }
        }
    }

    // 3c. Hit-test Dedicated Stairs (階段)
    // ※上の階で階段の1〜2段目などの上に床（収納・クローゼット・廊下・居室等）が貼られている範囲では、
    //   階段ツール選択中を除き「部屋のプロパティ・範囲」の選択を優先する
    if (!onlyHitExistingOfSameToolType || state.activeTool === 'stair') {
        const stairs = fl.stairs || [];
        for (let i = stairs.length - 1; i >= 0; i--) {
            const st = normalizeStairObject(stairs[i]);
            if (wx >= st.x && wx <= st.x + st.w && wy >= st.y && wy <= st.y + st.h) {
                if (state.activeTool !== 'stair' && typeof window.getRoomsMaskingUpperStair === 'function') {
                    const maskingRooms = window.getRoomsMaskingUpperStair(fl, st);
                    const coveredByFloorRoom = maskingRooms.some(rm => {
                        if (Array.isArray(rm.points) && rm.points.length >= 3 && window.RoomDetector && typeof window.RoomDetector.isPointInsidePolygon === 'function') {
                            return window.RoomDetector.isPointInsidePolygon({ x: wx, y: wy }, rm.points);
                        }
                        return (wx >= rm.x && wx <= rm.x + rm.w && wy >= rm.y && wy <= rm.y + rm.h);
                    });
                    if (coveredByFloorRoom) {
                        continue; // この座標は上の階の部屋（床）範囲が優先されるため、Step 5の部屋選択へ委譲
                    }
                }
                state.selectedItem = { kind: 'stair', id: st.id, floor: state.currentFloor };
                state.dragAction = {
                    type: 'move_box',
                    target: st,
                    offsetX: wx - st.x,
                    offsetY: wy - st.y
                };
                if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
                request2DRedraw();
                return true;
            }
        }
    }

    if (onlyHitExistingOfSameToolType) return false;

    // 4. Hit-test Standalone Pillars
    for (let i = fl.pillars.length - 1; i >= 0; i--) {
        const pl = fl.pillars[i];
        if (Math.hypot(wx - pl.x, wy - pl.y) <= 0.38) {
            state.selectedItem = { kind: 'pillar', id: pl.id, floor: state.currentFloor };
            state.dragAction = { type: 'move_pillar', pillar: pl };
            if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
            request2DRedraw();
            return true;
        }
    }

    // 4b. Hit-test Walls（点と線分の最短距離で壁を選択し、そのままドラッグで平行移動＆接続壁自動追随）
    if (fl.walls && fl.walls.length > 0) {
        let bestWall = null;
        let bestDist = 0.28;
        for (let i = fl.walls.length - 1; i >= 0; i--) {
            const wl = fl.walls[i];
            const d = distPointToSegment(wx, wy, wl.x1, wl.y1, wl.x2, wl.y2);
            if (d <= bestDist) {
                bestDist = d;
                bestWall = wl;
            }
        }
        if (bestWall) {
            state.selectedItem = { kind: 'wall', id: bestWall.id, floor: state.currentFloor };
            state.dragAction = {
                type: 'move_wall',
                wall: bestWall,
                lastSnappedX: snapP(wx),
                lastSnappedY: snapP(wy),
                moved: false
            };
            if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
            request2DRedraw();
            return true;
        }
    }

    // 5. Hit-test Rooms（多角形内包判定＋重複時は小面積優先）
    const hitRooms = [];
    for (let i = fl.rooms.length - 1; i >= 0; i--) {
        const rm = fl.rooms[i];
        let isHit = false;
        if (Array.isArray(rm.points) && rm.points.length >= 3 && window.RoomDetector && typeof window.RoomDetector.isPointInsidePolygon === 'function') {
            isHit = window.RoomDetector.isPointInsidePolygon({ x: wx, y: wy }, rm.points);
        } else {
            isHit = (wx >= rm.x && wx <= rm.x + rm.w && wy >= rm.y && wy <= rm.y + rm.h);
        }
        if (isHit) {
            const area = (typeof getRoomAreaM2 === 'function') ? getRoomAreaM2(rm) : (rm.areaM2 || (rm.w * rm.h));
            hitRooms.push({ rm, area });
        }
    }
    if (hitRooms.length > 0) {
        hitRooms.sort((a, b) => a.area - b.area);
        const rm = hitRooms[0].rm;
        state.selectedItem = { kind: 'room', id: rm.id, floor: state.currentFloor };
        state.dragAction = {
            type: 'move_box',
            target: rm,
            offsetX: wx - rm.x,
            offsetY: wy - rm.y
        };
        if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
        request2DRedraw();
        return true;
    }

    state.selectedItem = null;
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    return false;
}

canvas2d.addEventListener('pointermove', (e) => {
    const rect = canvas2d.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (e.pointerType === 'pen') {
        activePenPointerId = e.pointerId;
        lastPenActivityTime = Date.now();
    } else if (e.pointerType === 'touch') {
        // ペン使用中またはクールダウン中のタッチ移動は完全無視
        if (isPenCurrentlyActiveOrCoolingDown()) {
            return;
        }
        if (activeTouchPointers2D.has(e.pointerId)) {
            activeTouchPointers2D.set(e.pointerId, { sx, sy });
        }
        // 2本指ピンチイン・ピンチアウトによる2D拡大縮小＋中点パン追従
        if (activeTouchPointers2D.size === 2) {
            e.preventDefault();
            const pts = Array.from(activeTouchPointers2D.values());
            const dist = Math.hypot(pts[0].sx - pts[1].sx, pts[0].sy - pts[1].sy);
            const midSX = (pts[0].sx + pts[1].sx) / 2;
            const midSY = (pts[0].sy + pts[1].sy) / 2;

            if (!state.dragAction || state.dragAction.type !== 'pinch') {
                if (dist >= 28) {
                    const anchorWorld = screenToWorldP(midSX, midSY);
                    state.wallClickStart = null;
                    state.dragAction = {
                        type: 'pinch',
                        startDist: dist,
                        startZoom: state.cam2d.zoom,
                        anchorWorldX: anchorWorld.x,
                        anchorWorldY: anchorWorld.y
                    };
                }
                return;
            }

            const pDrag = state.dragAction;
            if (pDrag.startDist > 10 && dist > 10) {
                const scaleFactor = dist / pDrag.startDist;
                const nextZoom = Math.max(16, Math.min(150, pDrag.startZoom * scaleFactor));
                state.cam2d.zoom = nextZoom;
                // ピンチ開始時の2指中点ワールド座標が常に現在の2指中点スクリーン座標の下に来るようカメラ中心を補正
                const cx = rect.width / 2;
                const cy = rect.height / 2;
                state.cam2d.x = pDrag.anchorWorldX - (midSX - cx) / nextZoom;
                state.cam2d.y = pDrag.anchorWorldY - (midSY - cy) / nextZoom;
                request2DRedraw();
            }
            return;
        }
    }

    const worldPos = screenToWorldP(sx, sy);
    const snappedX = snapP(worldPos.x);
    const snappedY = snapP(worldPos.y);
    state.lastHoverWorld = { x: snappedX, y: snappedY };

    if (!state.dragAction) {
        if (state.wallClickStart || (state.polyPoints && state.polyPoints.length > 0) || state.activeTool === 'fixture' || state.activeTool === 'pillar' || state.activeTool === 'stair') {
            request2DRedraw();
        }
        return;
    }
    if (state.dragAction.type === 'pinch') {
        return;
    }
    e.preventDefault();
    updatePointerStatusBadge(e);

    const minSize = Math.max(0.25, 1 / state.gridDivisions);

    const drag = state.dragAction;

    if (drag.type === 'guide') {
        if (drag.guide.axis === 'h') {
            drag.guide.pos = snappedY;
            drag.guide.posP = snappedY;
            drag.deleteOnRelease = (sy <= 20);
        } else {
            drag.guide.pos = snappedX;
            drag.guide.posP = snappedX;
            drag.deleteOnRelease = (sx <= 20);
        }
        if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
        request2DRedraw();
        return;
    }

    if (drag.type === 'pan') {
        const dx = (sx - drag.startSX) / state.cam2d.zoom;
        const dy = (sy - drag.startSY) / state.cam2d.zoom;
        state.cam2d.x = drag.origCamX - dx;
        state.cam2d.y = drag.origCamY - dy;
        request2DRedraw();
    } else if (drag.type === 'room' || drag.type === 'box3d') {
        drag.curX = snappedX;
        drag.curY = snappedY;
        if (drag.curX === drag.startX) drag.curX += minSize;
        if (drag.curY === drag.startY) drag.curY += minSize;
        request2DRedraw();
    } else if (drag.type === 'wall') {
        if (state.diagonalWallMode) {
            drag.curX = snappedX;
            drag.curY = snappedY;
        } else {
            const dx = Math.abs(snappedX - drag.startX);
            const dy = Math.abs(snappedY - drag.startY);
            if (dx >= dy) {
                drag.curX = snappedX;
                drag.curY = drag.startY;
            } else {
                drag.curX = drag.startX;
                drag.curY = snappedY;
            }
        }
        request2DRedraw();
    } else if (drag.type === 'move_wall') {
        const wl = drag.wall;
        const isHoriz = Math.abs(wl.y1 - wl.y2) < 0.05;
        const isVert = Math.abs(wl.x1 - wl.x2) < 0.05;
        const dx = snappedX - drag.lastSnappedX;
        const dy = snappedY - drag.lastSnappedY;
        if (isHoriz && Math.abs(dy) >= 0.05) {
            translateWallAndConnected(wl, 0, dy, false);
            drag.lastSnappedY = snappedY;
            drag.moved = true;
            request2DRedraw();
        } else if (isVert && Math.abs(dx) >= 0.05) {
            translateWallAndConnected(wl, dx, 0, false);
            drag.lastSnappedX = snappedX;
            drag.moved = true;
            request2DRedraw();
        } else if (!isHoriz && !isVert && (Math.abs(dx) >= 0.05 || Math.abs(dy) >= 0.05)) {
            translateWallAndConnected(wl, dx, dy, false);
            drag.lastSnappedX = snappedX;
            drag.lastSnappedY = snappedY;
            drag.moved = true;
            request2DRedraw();
        }
    } else if (drag.type === 'pen') {
        drag.stroke.points.push({ x: worldPos.x, y: worldPos.y, p: e.pressure || 0.5 });
        request2DRedraw();
    } else if (drag.type === 'eraser') {
        drag.curX = worldPos.x;
        drag.curY = worldPos.y;
        eraseAtPoint(worldPos.x, worldPos.y);
        request2DRedraw();
    } else if (drag.type === 'memo_drag_create') {
        const m = drag.memo;
        if (m.memoType === 'ellipse') {
            m.x = (m.x1 + worldPos.x) / 2;
            m.y = (m.y1 + worldPos.y) / 2;
            m.rx = Math.max(0.25, Math.abs(worldPos.x - m.x1) / 2);
            m.ry = Math.max(0.25, Math.abs(worldPos.y - m.y1) / 2);
        } else {
            m.x2 = snappedX;
            m.y2 = snappedY;
            if (m.memoType === 'curve') {
                m.cx = (m.x1 + m.x2) / 2;
                m.cy = (m.y1 + m.y2) / 2 - 0.8;
            }
        }
        request2DRedraw();
    } else if (drag.type === 'memo_curve_vertex') {
        const m = drag.memo;
        if (drag.vertexKey === 'p1') { m.x1 = worldPos.x; m.y1 = worldPos.y; }
        else if (drag.vertexKey === 'cp') { m.cx = worldPos.x; m.cy = worldPos.y; }
        else if (drag.vertexKey === 'p2') { m.x2 = worldPos.x; m.y2 = worldPos.y; }
        request2DRedraw();
    } else if (drag.type === 'move_memo') {
        const m = drag.memo;
        const dx = worldPos.x - drag.lastWX;
        const dy = worldPos.y - drag.lastWY;
        drag.lastWX = worldPos.x;
        drag.lastWY = worldPos.y;
        if (m.x !== undefined) { m.x += dx; m.y += dy; }
        if (m.x1 !== undefined) {
            m.x1 += dx; m.y1 += dy;
            m.x2 += dx; m.y2 += dy;
            if (m.cx !== undefined) { m.cx += dx; m.cy += dy; }
        }
        request2DRedraw();
    } else if (drag.type === 'move_box') {
        const t = drag.target;
        const oldX = t.x;
        const oldY = t.y;
        let nextX = snapP(worldPos.x - drag.offsetX);
        let nextY = snapP(worldPos.y - drag.offsetY);
        // 設備・家具をドラッグ移動中も壁・部屋コーナーにスマート吸着（壁自動吸着ONかつ壁際0.35P以内に近づいた場合）
        if (state.selectedItem && state.selectedItem.kind === 'fixture' && state.subFixtureWallSnap !== false) {
            const isKL = t.type === 'KITCHEN_L' || t.category === 'KITCHEN_L' || (t.fxData && t.fxData.kitchenType === 'L');
            const wallSnap = findNearestWallForFixture(nextX, nextY, t.w, t.h, isKL, t.rot || 0, t.category || t.type);
            if (wallSnap) {
                const maxSnapDelta = isKL ? 0.48 : 0.35;
                if (Math.abs(wallSnap.x - nextX) <= maxSnapDelta) nextX = wallSnap.x;
                if (Math.abs(wallSnap.y - nextY) <= maxSnapDelta) nextY = wallSnap.y;
            }
        }
        t.x = nextX;
        t.y = nextY;
        const dx = t.x - oldX;
        const dy = t.y - oldY;
        if ((dx !== 0 || dy !== 0) && t.points && Array.isArray(t.points)) {
            t.points.forEach(pt => {
                pt.x = +(pt.x + dx).toFixed(3);
                pt.y = +(pt.y + dy).toFixed(3);
            });
        }
        request2DRedraw();
        if (typeof rebuild3DScene === 'function') rebuild3DScene();
        if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    } else if (drag.type === 'resize_box') {
        const t = drag.target;
        if (drag.corner.includes('r')) {
            t.w = Math.max(minSize, snappedX - t.x);
        }
        if (drag.corner.includes('b')) {
            t.h = Math.max(minSize, snappedY - t.y);
        }
        if (drag.corner.includes('l')) {
            const right = t.x + t.w;
            const nx = Math.min(right - minSize, snappedX);
            t.w = right - nx;
            t.x = nx;
        }
        if (drag.corner.includes('t')) {
            const bottom = t.y + t.h;
            const ny = Math.min(bottom - minSize, snappedY);
            t.h = bottom - ny;
            t.y = ny;
        }
        request2DRedraw();
        if (typeof rebuild3DScene === 'function') rebuild3DScene();
        if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    } else if (drag.type === 'move_opening') {
        const op = drag.opening;
        const candidate = snapPointToNearestWallEdge(worldPos.x, worldPos.y);
        if (!checkOpeningOverlap(state.currentFloor, candidate.x, candidate.y, candidate.orient, op.widthP, op.id)) {
            op.x = candidate.x;
            op.y = candidate.y;
            op.orient = candidate.orient;
            applyEntranceOpeningAttributes(op, state.floors[state.currentFloor], false);
            request2DRedraw();
            if (typeof rebuild3DScene === 'function') rebuild3DScene();
        }
    } else if (drag.type === 'resize_opening') {
        const op = drag.opening;
        const distFromCenter = op.orient === 'h'
            ? Math.abs(snappedX - op.x)
            : Math.abs(snappedY - op.y);
        const newW = Math.max(0.33, Math.min(4.0, snapP(distFromCenter * 2)));
        if (!checkOpeningOverlap(state.currentFloor, op.x, op.y, op.orient, newW, op.id)) {
            op.widthP = newW;
            op.widthMm = Math.round(newW * (state.modulePitch || 910));
            request2DRedraw();
            if (typeof rebuild3DScene === 'function') rebuild3DScene();
            if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
        }
    } else if (drag.type === 'move_pillar') {
        drag.pillar.x = snappedX;
        drag.pillar.y = snappedY;
        request2DRedraw();
        if (typeof rebuild3DScene === 'function') rebuild3DScene();
    }
});

canvas2d.addEventListener('pointerup', (e) => {
    if (e && e.pointerType === 'pen') {
        if (activePenPointerId === e.pointerId) {
            activePenPointerId = null;
        }
        lastPenActivityTime = Date.now();
    } else if (e && e.pointerType === 'touch') {
        activeTouchPointers2D.delete(e.pointerId);
        activeTouchCount = activeTouchPointers2D.size;
        if (state.dragAction && state.dragAction.type === 'pinch') {
            if (activeTouchPointers2D.size === 1) {
                // 2本指のうち1本を離した後は残りの1本指での滑らかなパンへ移行
                const rem = Array.from(activeTouchPointers2D.values())[0];
                state.dragAction = {
                    type: 'pan',
                    startSX: rem.sx,
                    startSY: rem.sy,
                    origCamX: state.cam2d.x,
                    origCamY: state.cam2d.y
                };
            } else if (activeTouchPointers2D.size === 0) {
                state.dragAction = null;
            }
            request2DRedraw();
            return;
        }
    }
    if (!state.dragAction) return;
    const drag = state.dragAction;
    const fl = state.floors[state.currentFloor];

    if (drag.type === 'guide') {
        if (drag.deleteOnRelease) {
            state.guides = state.guides.filter(g => g.id !== drag.guide.id);
            showToast('補助線を削除しました');
        }
        state.dragAction = null;
        request2DRedraw();
        return;
    }

    if (drag.type === 'eraser') {
        if (drag.startX !== undefined && drag.curX !== undefined) {
            if (splitOrEraseWallSegment(fl, { x: drag.startX, y: drag.startY }, { x: drag.curX, y: drag.curY })) {
                saveHistorySnapshot();
                if (typeof triggerAutoRoomDetection === 'function') triggerAutoRoomDetection();
                if (typeof rebuild3DScene === 'function') rebuild3DScene();
                showToast('ドラッグした区間の壁を切り欠き削除しました');
            }
        }
    } else if (drag.type === 'room') {
        const x = Math.min(drag.startX, drag.curX);
        const y = Math.min(drag.startY, drag.curY);
        const w = Math.abs(drag.curX - drag.startX);
        const h = Math.abs(drag.curY - drag.startY);
        if (w >= 0.25 && h >= 0.25) {
            const rType = drag.roomType || state.subRoomType || 'LDK';
            const rSpec = ROOM_TYPES[rType] || ROOM_TYPES.LDK;
            const newRoom = {
                id: uid(),
                type: rType,
                x, y, w, h,
                customName: rSpec.label
            };
            fl.rooms.push(newRoom);
            state.selectedItem = { kind: 'room', id: newRoom.id, floor: state.currentFloor };
            saveHistorySnapshot();
            if (typeof rebuild3DScene === 'function') rebuild3DScene();
            if (typeof updateAllMetricsAnd3D === 'function') updateAllMetricsAnd3D();
            showToast(`${newRoom.customName} (${(w * h / 2).toFixed(1)}帖) を作成しました`);
        }
    } else if (drag.type === 'box3d') {
        const x = Math.min(drag.startX, drag.curX);
        const y = Math.min(drag.startY, drag.curY);
        const w = Math.max(0.5, Math.abs(drag.curX - drag.startX));
        const h = Math.max(0.5, Math.abs(drag.curY - drag.startY));
        if (!fl.boxes3d) fl.boxes3d = [];
        const newBox = {
            id: uid(),
            x, y, w, h,
            hMm: state.subBoxHeightMm || 600,
            levelMm: state.subBoxLevelMm || 0,
            color: state.subBoxColor || '#cbd5e1',
            label: `直方体 (H${state.subBoxHeightMm || 600}mm)`
        };
        fl.boxes3d.push(newBox);
        state.selectedItem = { kind: 'box3d', id: newBox.id, floor: state.currentFloor };
        saveHistorySnapshot();
        if (typeof rebuild3DScene === 'function') rebuild3DScene();
        showToast(`${newBox.label} を配置しました`);
    } else if (drag.type === 'wall') {
        if (drag.startX !== drag.curX || drag.startY !== drag.curY) {
            const wType = drag.wallType || state.subWallType || 'wall';
            let initH = 2450;
            if (wType === 'koshikabe') initH = 1000;
            else if (wType === 'tarekabe') initH = 550;
            else if (wType === 'agarikamachi') initH = 180;
            fl.walls.push({
                id: uid(),
                x1: drag.startX,
                y1: drag.startY,
                x2: drag.curX,
                y2: drag.curY,
                wallType: wType,
                heightMm: initH
            });
            state.wallClickStart = null;
            saveHistorySnapshot();
            if (typeof triggerAutoRoomDetection === 'function') triggerAutoRoomDetection();
            if (typeof rebuild3DScene === 'function') rebuild3DScene();
            const wLabel = (Array.isArray(window.WALL_SUBTYPES) ? window.WALL_SUBTYPES.find(w => w.id === wType)?.label : null) || '壁';
            showToast(`${wLabel}を作成しました`);
            request2DRedraw();
        }
    } else if (drag.type === 'move_wall') {
        if (drag.moved) {
            saveHistorySnapshot();
            if (typeof triggerAutoRoomDetection === 'function') triggerAutoRoomDetection();
            if (typeof rebuild3DScene === 'function') rebuild3DScene();
            showToast('壁を平行移動し、接続する壁と建具を追随させました');
        }
    } else if (drag.type !== 'pan') {
        if ((drag.type === 'move_box' || drag.type === 'resize_box') && drag.target && drag.target.kind === 'stair') {
            if (drag.target.linkedFromStairId && typeof window.syncLinkedStairBackToSource === 'function') {
                window.syncLinkedStairBackToSource(drag.target);
            }
            if (typeof window.syncUpperFloorStairs === 'function') window.syncUpperFloorStairs();
        }
        saveHistorySnapshot();
    }

    state.dragAction = null;
    if (typeof renderSubToolbar === 'function') renderSubToolbar();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
});

canvas2d.addEventListener('pointerleave', () => {
    state.lastHoverWorld = null;
    if (!state.dragAction) request2DRedraw();
});

canvas2d.addEventListener('pointercancel', (e) => {
    if (e && e.pointerType === 'pen') {
        if (activePenPointerId === e.pointerId) {
            activePenPointerId = null;
        }
        lastPenActivityTime = Date.now();
    } else if (e && e.pointerType === 'touch') {
        activeTouchPointers2D.delete(e.pointerId);
        activeTouchCount = activeTouchPointers2D.size;
    }
    state.lastHoverWorld = null;
    state.dragAction = null;
    request2DRedraw();
});

canvas2d.addEventListener('lostpointercapture', (e) => {
    if (e && e.pointerType === 'pen' && activePenPointerId === e.pointerId) {
        activePenPointerId = null;
        lastPenActivityTime = Date.now();
    } else if (e && e.pointerType === 'touch') {
        activeTouchPointers2D.delete(e.pointerId);
        activeTouchCount = activeTouchPointers2D.size;
    }
    if (state.dragAction && state.dragAction.type !== 'pinch') {
        state.dragAction = null;
        request2DRedraw();
    }
});

canvas2d.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

window.addEventListener('blur', () => {
    activeTouchPointers2D.clear();
    activeTouchCount = 0;
    activePenPointerId = null;
    if (state.dragAction) {
        state.dragAction = null;
        request2DRedraw();
    }
});

canvas2d.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom2D(e.deltaY < 0 ? 1.1 : 0.9);
}, { passive: false });

// --- Selection & Inspector Handlers ---

function updateSelectedStairShape(shapeType) {
    const obj = findSelectedObject();
    if (!obj || state.selectedItem.kind !== 'stair') return;

    const presets = window.STAIR_PATTERN_PRESETS || {};
    let pKey = shapeType;
    if (shapeType === 'U_SHAPE' && !presets[pKey]) pKey = 'U_6TURN';
    if (shapeType === 'L_SHAPE' && !presets[pKey]) pKey = 'L_STANDARD';

    if (presets[pKey]) {
        const pr = presets[pKey];
        obj.patternKey = pr.key;
        obj.shapeType = pr.shapeType;
        obj.isModular = true;
        obj.i1Steps = pr.i1Steps;
        obj.c1Steps = pr.c1Steps;
        obj.c1Dir = pr.c1Dir;
        obj.i2Steps = pr.i2Steps;
        obj.c2Steps = pr.c2Steps;
        obj.c2Dir = pr.c2Dir;
        obj.i3Steps = pr.i3Steps;
        obj.landingTop = (pr.c1Steps > 0 && pr.i2Steps === 0 && pr.c2Steps === 0 && pr.i3Steps === 0);
        obj.turnType = pr.c1Steps === 1 ? 'landing' : (pr.c1Steps === 2 ? 'turn_2' : (pr.c1Steps === 4 ? 'turn_4' : 'turn_3'));
        if (typeof window.syncStairModularBounds === 'function') {
            window.syncStairModularBounds(obj);
        }
        obj.label = `階段 (${pr.shortLabel}・${obj.direction === 'UP' ? '上る' : '降りる'})`;
    } else {
        obj.shapeType = shapeType;
        if (typeof window.syncStairModularBounds === 'function') {
            window.syncStairModularBounds(obj);
        }
    }
    if (obj.linkedFromStairId && typeof window.syncLinkedStairBackToSource === 'function') {
        window.syncLinkedStairBackToSource(obj);
    }
    if (typeof window.syncUpperFloorStairs === 'function') window.syncUpperFloorStairs();
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    showToast(`階段パターンを変更しました`);
}

function updateSelectedStairDir(dir) {
    const obj = findSelectedObject();
    if (!obj || state.selectedItem.kind !== 'stair') return;
    obj.direction = dir;
    if (typeof window.syncUpperFloorStairs === 'function') window.syncUpperFloorStairs();
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    showToast(`階段の方向を「${dir === 'UP' ? '上る(UP)' : '降りる(DN)'}」に切り替えました`);
}

function updateSelectedStairSteps(steps) {
    const obj = findSelectedObject();
    if (!obj || state.selectedItem.kind !== 'stair') return;
    obj.steps = steps;
    obj.riserMm = Math.round(2730 / steps);
    if (obj.linkedFromStairId && typeof window.syncLinkedStairBackToSource === 'function') {
        window.syncLinkedStairBackToSource(obj);
    }
    if (typeof window.syncUpperFloorStairs === 'function') window.syncUpperFloorStairs();
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    showToast(`階段段数を ${steps}段 に変更しました`);
}

function rotateSelectedStair() {
    const obj = findSelectedObject();
    if (!obj || state.selectedItem.kind !== 'stair') return;
    const oldW = obj.w, oldH = obj.h;
    const cx = obj.x + oldW / 2;
    const cy = obj.y + oldH / 2;
    obj.w = oldH;
    obj.h = oldW;
    obj.x = +(cx - obj.w / 2).toFixed(3);
    obj.y = +(cy - obj.h / 2).toFixed(3);
    obj.rotation = ((obj.rotation || 0) + 90) % 360;
    if (obj.points && Array.isArray(obj.points)) {
        obj.points.forEach(pt => {
            const rx = pt.x - cx;
            const ry = pt.y - cy;
            pt.x = +(cx - ry).toFixed(3);
            pt.y = +(cy + rx).toFixed(3);
        });
    }
    if (obj.linkedFromStairId && typeof window.syncLinkedStairBackToSource === 'function') {
        window.syncLinkedStairBackToSource(obj);
    }
    if (typeof window.syncUpperFloorStairs === 'function') window.syncUpperFloorStairs();
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    showToast('階段を90°回転しました');
}

function renameSelectedRoom() {
    const rm = findSelectedObject();
    if (!rm) return;
    const presets = ['LDK', 'リビング', 'ダイニング', 'キッチン', '主寝室', '洋室', '子供室', '書斎', '和室', '玄関', '玄関土間', 'ホール', '廊下', '階段', '階段室', '洗面室', '脱衣室', '浴室', 'トイレ', 'クローゼット', '収納', 'WIC', 'パントリー', '納戸', '小上り', '中庭', '吹抜', 'バルコニー'];
    const curName = rm.customName || rm.name || '';
    const idx = presets.indexOf(curName);
    const nextName = presets[(idx + 1) % presets.length];
    rm.customName = nextName;
    rm.name = nextName;
    if (nextName === '吹抜') rm.type = 'VOID';
    else if (nextName === 'バルコニー') rm.type = 'BALCONY';
    else if (nextName === '玄関土間') rm.type = 'DOMA';
    else if (nextName === '小上り') rm.type = 'KOAGARI';
    else if (nextName === '中庭') rm.type = 'NAKANIWA';
    else if (nextName === '階段' || nextName === '階段室') rm.type = 'STAIR';
    else if (nextName === 'クローゼット') rm.type = 'CLOSET';
    else if (nextName === '収納') rm.type = 'SHUNO';
    else if (['VOID', 'BALCONY', 'DOMA', 'KOAGARI', 'NAKANIWA', 'PORCH', 'TENJO', 'TATAMI'].includes(rm.type)) {
        rm.type = 'OTHER';
    }
    saveHistorySnapshot();
    if (typeof updateAllMetricsAnd3D === 'function') updateAllMetricsAnd3D();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    showToast(`部屋名を「${rm.customName}」に変更しました`);
}

function updateSelectedRoomName(val, commit) {
    const rm = findSelectedObject();
    if (!rm || !state.selectedItem || state.selectedItem.kind !== 'room') return;
    const trimmed = (val || '').trim();
    rm.customName = trimmed;
    rm.name = trimmed;
    request2DRedraw();
    if (commit) {
        saveHistorySnapshot();
        if (typeof updateAllMetricsAnd3D === 'function') updateAllMetricsAnd3D();
        if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    }
}

function applyRoomNameChip(label, type, levelMm) {
    const rm = findSelectedObject();
    if (!rm || !state.selectedItem || state.selectedItem.kind !== 'room') return;
    rm.customName = label;
    rm.name = label;
    if (type) rm.type = type;
    if (typeof levelMm === 'number' && !isNaN(levelMm)) {
        rm.levelMm = levelMm;
    }
    const excludedTypes = ['VOID', 'BALCONY', 'PORCH', 'NAKANIWA', 'TENJO', 'TATAMI', 'KOAGARI'];
    if (!excludedTypes.includes(rm.type) && rm.excludeFloorArea === true) {
        rm.excludeFloorArea = false;
    } else if (!excludedTypes.includes(rm.type)) {
        delete rm.excludeFloorArea;
    }
    saveHistorySnapshot();
    if (typeof updateAllMetricsAnd3D === 'function') updateAllMetricsAnd3D();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    showToast(`部屋名を「${label}」${rm.levelMm > 0 ? `（床高 FL+${rm.levelMm}mm）` : ''}に設定しました`);
}

function updateSelectedRoomLevelMm(newLevelMm) {
    const rm = findSelectedObject();
    if (!rm || !state.selectedItem || state.selectedItem.kind !== 'room') return;
    const val = Math.max(0, Math.min(2000, parseInt(newLevelMm, 10) || 0));
    rm.levelMm = val;
    // 床高+700mm以上で未命名の「空間」だった場合はわかりやすいよう「階段上収納」に自動補完
    if (val >= 500 && (!rm.customName || rm.customName === '空間') && (!rm.name || rm.name === '空間')) {
        rm.customName = '階段上収納';
        rm.name = '階段上収納';
        if (!rm.type || rm.type === 'OTHER') rm.type = 'SHUNO';
    }
    saveHistorySnapshot();
    if (typeof updateAllMetricsAnd3D === 'function') updateAllMetricsAnd3D();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    showToast(val > 0 ? `🪜 部屋の床高さを FL+${val}mm（+${(val / 1000).toFixed(2)}m）に設定しました` : '部屋の床高さを標準床（FL+0mm）に戻しました');
}
window.updateSelectedRoomLevelMm = updateSelectedRoomLevelMm;

function changeSelectedRoomType(newType) {
    const rm = findSelectedObject();
    if (!rm || !state.selectedItem || state.selectedItem.kind !== 'room') return;
    const excludedTypes = ['VOID', 'BALCONY', 'PORCH', 'NAKANIWA', 'TENJO', 'TATAMI', 'KOAGARI'];
    const wasExcludedType = excludedTypes.includes((rm.type || '').toUpperCase());
    rm.type = newType;
    const rt = (window.ROOM_TYPES && window.ROOM_TYPES[newType]) || null;
    if (wasExcludedType && !excludedTypes.includes(newType)) {
        const curName = (rm.customName || rm.name || '').toLowerCase();
        if (curName.includes('吹抜') || curName.includes('バルコニー') || curName.includes('中庭') || curName.includes('ポーチ')) {
            const fallbackLabel = rt ? rt.label : '空間';
            rm.customName = fallbackLabel;
            rm.name = fallbackLabel;
        }
        if (rm.excludeFloorArea === true) rm.excludeFloorArea = false;
    }
    saveHistorySnapshot();
    if (typeof updateAllMetricsAnd3D === 'function') updateAllMetricsAnd3D();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    showToast(`部屋種別を「${rt ? rt.label : newType}」に変更しました`);
}

function toggleSelectedRoomFloorArea() {
    const rm = findSelectedObject();
    if (!rm || !state.selectedItem || state.selectedItem.kind !== 'room') return;
    const curExcluded = (typeof isFloorAreaExcludedRoom === 'function') ? isFloorAreaExcludedRoom(rm) : false;
    rm.excludeFloorArea = !curExcluded;
    saveHistorySnapshot();
    if (typeof updateAllMetricsAnd3D === 'function') updateAllMetricsAnd3D();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    showToast(rm.excludeFloorArea ? 'この空間を延床面積から除外しました' : 'この空間を延床面積に算入しました');
}

function toggleFixtureWallSnap() {
    state.subFixtureWallSnap = state.subFixtureWallSnap === false ? true : false;
    if (typeof renderSubToolbar === 'function') renderSubToolbar();
    request2DRedraw();
    showToast(state.subFixtureWallSnap ? '🧲 壁・コーナー自動吸着を ON にしました' : '✋ 壁自動吸着を OFF（自由グリッド配置）にしました');
}
window.toggleFixtureWallSnap = toggleFixtureWallSnap;

function rotateFixturePreset(targetDeg) {
    if (typeof targetDeg === 'number') {
        state.subFixtureRot = ((targetDeg % 360) + 360) % 360;
    } else {
        state.subFixtureRot = (((state.subFixtureRot || 0) + 90) % 360);
    }
    state.subFixtureRotManual = true;
    if (typeof renderSubToolbar === 'function') renderSubToolbar();
    request2DRedraw();
    const isSubKL = (state.subFixtureCategory === 'KITCHEN_L') || (state.subFixtureCategory === 'KITCHEN' && state.subKitchenType === 'L');
    const dirNames = isSubKL
        ? { 0: '↖北西角(0°)', 90: '↗北東角(90°)', 180: '↘南東角(180°)', 270: '↙南西角(270°)' }
        : { 0: '↑北壁背(0°)', 90: '→東壁背(90°)', 180: '↓南壁背(180°)', 270: '←西壁背(270°)' };
    showToast(`配置向きを ${dirNames[state.subFixtureRot] || (state.subFixtureRot + '°')} に変更しました`);
}
window.rotateFixturePreset = rotateFixturePreset;

function setSelectedFixtureRotation(targetDeg) {
    const fl = state.floors[state.currentFloor];
    if (!fl || !state.selectedItem || state.selectedItem.kind !== 'fixture') return;
    const fx = (fl.fixtures || []).find(f => f.id === state.selectedItem.id);
    if (!fx) return;

    const pitch = state.modulePitch || 910;
    const oldRot = (((fx.rot || 0) % 360) + 360) % 360;
    const newRot = (((targetDeg || 0) % 360) + 360) % 360;
    const wasVert = (oldRot === 90 || oldRot === 270);
    const isVert = (newRot === 90 || newRot === 270);

    if (!fx.w || isNaN(fx.w) || fx.w <= 0) fx.w = 1.0;
    if (!fx.h || isNaN(fx.h) || fx.h <= 0) fx.h = 1.0;
    if (!fx.wMm || isNaN(fx.wMm)) fx.wMm = Math.round(fx.w * pitch);
    if (!fx.dMm || isNaN(fx.dMm)) fx.dMm = Math.round(fx.h * pitch);

    if (wasVert !== isVert) {
        // 設備の中心座標 (cx, cy) を厳密に保持したまま W×D (横幅と縦奥行) を入れ替える（勝手に他の壁へジャンプさせない）
        const cx = (Number(fx.x) || 0) + fx.w / 2;
        const cy = (Number(fx.y) || 0) + fx.h / 2;
        const tmp = fx.w; fx.w = fx.h; fx.h = tmp;
        const tmpMm = fx.wMm; fx.wMm = fx.dMm; fx.dMm = tmpMm;
        fx.x = +(cx - fx.w / 2).toFixed(3);
        fx.y = +(cy - fx.h / 2).toFixed(3);
    }
    fx.rot = newRot;

    const isKL = fx.type === 'KITCHEN_L' || fx.category === 'KITCHEN_L' || (fx.fxData && fx.fxData.kitchenType === 'L');
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    const dirNames = isKL
        ? { 0: '↖北西角(0°)', 90: '↗北東角(90°)', 180: '↘南東角(180°)', 270: '↙南西角(270°)' }
        : { 0: '↑北壁背(0°)', 90: '→東壁背(90°)', 180: '↓南壁背(180°)', 270: '←西壁背(270°)' };
    showToast(`向きを ${dirNames[newRot] || (newRot + '°')}（W${fx.wMm}×D${fx.dMm}mm）に変更しました`);
}
window.setSelectedFixtureRotation = setSelectedFixtureRotation;

function rotateSelectedFixture() {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'fixture') return;
    const fx = fl.fixtures.find(f => f.id === state.selectedItem.id);
    if (!fx) return;

    const nextRot = (((fx.rot || 0) + 90) % 360);
    setSelectedFixtureRotation(nextRot);
}

function updateSelectedKitchenI(newW, newD, newH) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'fixture') return;
    const fx = fl.fixtures.find(f => f.id === state.selectedItem.id);
    if (!fx) return;
    const pitch = state.modulePitch || 910;
    const isVert = (((fx.rot || 0) % 360) === 90 || ((fx.rot || 0) % 360) === 270);
    const curLocalW = isVert ? (fx.dMm || Math.round(fx.h * pitch)) : (fx.wMm || Math.round(fx.w * pitch));
    const curLocalD = isVert ? (fx.wMm || Math.round(fx.w * pitch)) : (fx.dMm || Math.round(fx.h * pitch));
    const targetLocalW = newW || curLocalW;
    const targetLocalD = newD || curLocalD;
    fx.baseWMm = targetLocalW;
    fx.baseDMm = targetLocalD;
    fx.wMm = isVert ? targetLocalD : targetLocalW;
    fx.dMm = isVert ? targetLocalW : targetLocalD;
    fx.w = +(fx.wMm / pitch).toFixed(3);
    fx.h = +(fx.dMm / pitch).toFixed(3);
    if (newH) { fx.hMm = newH; }
    fx.label = `I型キッチン (${targetLocalW / 10}×${targetLocalD / 10}cm)`;
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
}

function updateSelectedKitchenL(newX, newY, newH) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'fixture') return;
    const fx = fl.fixtures.find(f => f.id === state.selectedItem.id);
    if (!fx) return;
    const pitch = state.modulePitch || 910;
    if (!fx.fxData) fx.fxData = {};
    const isVert = (((fx.rot || 0) % 360) === 90 || ((fx.rot || 0) % 360) === 270);
    if (newX) {
        fx.fxData.lWidthX = newX;
        if (isVert) { fx.dMm = newX; fx.h = +(newX / pitch).toFixed(3); }
        else { fx.wMm = newX; fx.w = +(newX / pitch).toFixed(3); }
    }
    if (newY) {
        fx.fxData.lWidthY = newY;
        if (isVert) { fx.wMm = newY; fx.w = +(newY / pitch).toFixed(3); }
        else { fx.dMm = newY; fx.h = +(newY / pitch).toFixed(3); }
    }
    if (newH) { fx.hMm = newH; }
    fx.label = `L型キッチン (${fx.wMm / 10}×${fx.dMm / 10}cm)`;
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
}

function updateSelectedKitchenIsland(newW, newD, newH) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'fixture') return;
    const fx = fl.fixtures.find(f => f.id === state.selectedItem.id);
    if (!fx) return;
    const pitch = state.modulePitch || 910;
    const isVert = (((fx.rot || 0) % 360) === 90 || ((fx.rot || 0) % 360) === 270);
    const curLocalW = isVert ? (fx.dMm || Math.round(fx.h * pitch)) : (fx.wMm || Math.round(fx.w * pitch));
    const curLocalD = isVert ? (fx.wMm || Math.round(fx.w * pitch)) : (fx.dMm || Math.round(fx.h * pitch));
    const targetLocalW = newW || curLocalW;
    const targetLocalD = newD || curLocalD;
    fx.wMm = isVert ? targetLocalD : targetLocalW;
    fx.dMm = isVert ? targetLocalW : targetLocalD;
    fx.w = +(fx.wMm / pitch).toFixed(3);
    fx.h = +(fx.dMm / pitch).toFixed(3);
    if (newH) { fx.hMm = newH; }
    fx.label = `アイランド (${targetLocalW}×${targetLocalD}mm)`;
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
}

function changeSelectedKitchenType(newType) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'fixture') return;
    const fx = fl.fixtures.find(f => f.id === state.selectedItem.id);
    if (!fx) return;
    if (!fx.fxData) fx.fxData = {};
    fx.fxData.kitchenType = newType;
    const pitch = state.modulePitch || 910;
    const isVert = (((fx.rot || 0) % 360) === 90 || ((fx.rot || 0) % 360) === 270);
    if (newType === 'I') {
        fx.type = 'KITCHEN';
        fx.category = 'KITCHEN';
        fx.wMm = isVert ? 650 : 2550; fx.dMm = isVert ? 2550 : 650; fx.hMm = 850;
        fx.w = +(fx.wMm / pitch).toFixed(3); fx.h = +(fx.dMm / pitch).toFixed(3);
        fx.label = `I型キッチン (255×65cm)`;
    } else if (newType === 'L') {
        fx.type = 'KITCHEN_L';
        fx.category = 'KITCHEN_L';
        fx.wMm = isVert ? 1820 : 2550; fx.dMm = isVert ? 2550 : 1820; fx.hMm = 850;
        fx.fxData.lWidthX = 2550; fx.fxData.lWidthY = 1820; fx.fxData.lDepth = 650;
        fx.w = +(fx.wMm / pitch).toFixed(3); fx.h = +(fx.dMm / pitch).toFixed(3);
        fx.label = `L型キッチン (255×182cm)`;
    } else {
        fx.type = 'KITCHEN';
        fx.category = 'KITCHEN';
        fx.wMm = isVert ? 900 : 2550; fx.dMm = isVert ? 2550 : 900; fx.hMm = 850;
        fx.w = +(fx.wMm / pitch).toFixed(3); fx.h = +(fx.dMm / pitch).toFixed(3);
        fx.label = `アイランド (2550×900mm)`;
    }
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
}
window.changeSelectedKitchenType = changeSelectedKitchenType;
window.updateSelectedKitchenL = updateSelectedKitchenL;
window.updateSelectedKitchenI = updateSelectedKitchenI;
window.updateSelectedKitchenIsland = updateSelectedKitchenIsland;

function updateSelectedUbSize(sizeId) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'fixture') return;
    const fx = fl.fixtures.find(f => f.id === state.selectedItem.id);
    if (!fx) return;
    const ubSpecs = window.UB_SPECS || { sizes: [] };
    const curSize = ubSpecs.sizes.find(s => s.id === sizeId);
    if (!curSize) return;
    const pitch = state.modulePitch || 910;
    const isVert = (((fx.rot || 0) % 360) === 90 || ((fx.rot || 0) % 360) === 270);
    fx.wMm = isVert ? curSize.dMm : curSize.wMm;
    fx.dMm = isVert ? curSize.wMm : curSize.dMm;
    fx.w = +(fx.wMm / pitch).toFixed(3);
    fx.h = +(fx.dMm / pitch).toFixed(3);
    if (!fx.fxData) fx.fxData = {};
    fx.fxData.ubSize = sizeId;
    fx.label = `ユニットバス ${curSize.label}`;
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
}

function updateSelectedUbPattern(patId) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'fixture') return;
    const fx = fl.fixtures.find(f => f.id === state.selectedItem.id);
    if (!fx) return;
    if (!fx.fxData) fx.fxData = {};
    fx.fxData.ubPattern = patId;
    fx.ubPattern = patId;
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
}

function updateSelectedVanity(newW, newH) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'fixture') return;
    const fx = fl.fixtures.find(f => f.id === state.selectedItem.id);
    if (!fx) return;
    const pitch = state.modulePitch || 910;
    const isVert = (((fx.rot || 0) % 360) === 90 || ((fx.rot || 0) % 360) === 270);
    if (newW) {
        if (isVert) {
            fx.dMm = newW;
            fx.h = +(newW / pitch).toFixed(3);
        } else {
            fx.wMm = newW;
            fx.w = +(newW / pitch).toFixed(3);
        }
        if (!fx.fxData) fx.fxData = {};
        fx.fxData.vanityWidth = newW;
        fx.label = `洗面化粧台 (W${newW}mm)`;
    }
    if (newH) { fx.hMm = newH; }
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
}

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
            showToast('隣接する建具・窓と重なるため変更できません', true);
            return;
        }
    }
    if (newHMm !== null) {
        op.heightMm = newHMm;
        if (op.heightMm >= 2000) op.sillMm = 0;
    }
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
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
    op.sashType = fitId;
    recalcDoorDimensions(op);
}

function updateSelectedDoorLeafCount(count) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'opening') return;
    const op = fl.openings.find(o => o.id === state.selectedItem.id);
    if (!op) return;
    op.leafCount = count;
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
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
}

function recalcDoorDimensions(op) {
    const pitch = state.modulePitch || 910;
    const count = op.leafCount || 1;
    const leafW = op.leafWidthMm || 800;
    let totalW = leafW * count;
    if (op.doorFit === 'hiraki' || op.doorFit === 'katabiraki' || op.doorFit === 'katabiki' || op.doorFit === 'hikido' || op.doorFit === 'genkan_slide') {
        totalW = leafW;
    }
    const nextWidthP = +(totalW / pitch).toFixed(3);
    if (!checkOpeningOverlap(state.currentFloor, op.x, op.y, op.orient, nextWidthP, op.id)) {
        op.widthMm = totalW;
        op.widthP = nextWidthP;
    }
    const sashSpec = window.SASH_TYPES_12?.[op.doorFit];
    op.label = `${sashSpec ? sashSpec.label : '建具'} (W${op.widthMm}×H${op.heightMm}mm)`;
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
}

function changeSelectedPillarSpec(sizeMm, shape) {
    if (!state.selectedItem || state.selectedItem.kind !== 'pillar') return;
    const fl = state.floors[state.selectedItem.floor || state.currentFloor];
    const pl = fl.pillars.find(p => p.id === state.selectedItem.id);
    if (!pl) return;
    pl.sizeMm = sizeMm;
    pl.shape = shape;
    saveHistorySnapshot();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast(`柱を ${shape === 'round' ? '円柱φ' : '角柱'}${sizeMm}mm に変更しました`);
}
window.changeSelectedPillarSpec = changeSelectedPillarSpec;

function deleteSelectedItem() {
    if (!state.selectedItem) return;
    const fl = state.floors[state.selectedItem.floor];
    const id = state.selectedItem.id;
    const kind = state.selectedItem.kind;
    if (kind === 'room') fl.rooms = fl.rooms.filter(r => r.id !== id);
    else if (kind === 'wall') {
        fl.walls = (fl.walls || []).filter(w => w.id !== id);
        if (typeof triggerAutoRoomDetection === 'function') triggerAutoRoomDetection();
    }
    else if (kind === 'opening') fl.openings = fl.openings.filter(o => o.id !== id);
    else if (kind === 'fixture') fl.fixtures = fl.fixtures.filter(f => f.id !== id);
    else if (kind === 'pillar') fl.pillars = fl.pillars.filter(p => p.id !== id);
    else if (kind === 'box3d') fl.boxes3d = (fl.boxes3d || []).filter(b => b.id !== id);
    else if (kind === 'memo') fl.memos = (fl.memos || []).filter(m => m.id !== id);
    else if (kind === 'stair') {
        const targetSt = (fl.stairs || []).find(s => s.id === id);
        if (targetSt && targetSt.linkedFromStairId && targetSt.linkedFromFloor !== undefined) {
            const srcFl = state.floors[targetSt.linkedFromFloor];
            const srcSt = srcFl && Array.isArray(srcFl.stairs) ? srcFl.stairs.find(s => s.id === targetSt.linkedFromStairId) : null;
            if (srcSt) srcSt.suppressUpperAutoCopy = true;
        }
        fl.stairs = (fl.stairs || []).filter(s => s.id !== id);
        fl.fixtures = (fl.fixtures || []).filter(f => f.id !== id);
        if (typeof window.syncUpperFloorStairs === 'function') window.syncUpperFloorStairs();
    }

    state.selectedItem = null;
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    showToast('選択した要素を削除しました');
}

function eraseAtPoint(wx, wy) {
    const fl = state.floors[state.currentFloor];
    let erased = false;

    const beforeStamps = fl.stamps.length;
    fl.stamps = fl.stamps.filter(sp => Math.hypot(wx - sp.x, wy - sp.y) > 0.5);
    if (fl.stamps.length !== beforeStamps) erased = true;

    const beforeStrokes = fl.strokes.length;
    fl.strokes = fl.strokes.filter(st => !st.points.some(pt => Math.hypot(wx - pt.x, wy - pt.y) < 0.4));
    if (fl.strokes.length !== beforeStrokes) erased = true;

    if (fl.memos) {
        const beforeMemos = fl.memos.length;
        fl.memos = fl.memos.filter(m => {
            const mx = m.x !== undefined ? m.x : (m.x1 + m.x2) / 2;
            const my = m.y !== undefined ? m.y : (m.y1 + m.y2) / 2;
            return Math.hypot(wx - mx, wy - my) > 0.55;
        });
        if (fl.memos.length !== beforeMemos) erased = true;
    }

    const beforeOps = fl.openings.length;
    fl.openings = fl.openings.filter(op => Math.hypot(wx - op.x, wy - op.y) > 0.5);
    if (fl.openings.length !== beforeOps) erased = true;

    const beforePillars = fl.pillars.length;
    fl.pillars = fl.pillars.filter(pl => Math.hypot(wx - pl.x, wy - pl.y) > 0.45);
    if (fl.pillars.length !== beforePillars) erased = true;

    if (fl.boxes3d) {
        const beforeBoxes = fl.boxes3d.length;
        fl.boxes3d = fl.boxes3d.filter(bx => !(wx >= bx.x && wx <= bx.x + bx.w && wy >= bx.y && wy <= bx.y + bx.h));
        if (fl.boxes3d.length !== beforeBoxes) erased = true;
    }

    const beforeFix = fl.fixtures.length;
    fl.fixtures = fl.fixtures.filter(fx => !(wx >= fx.x && wx <= fx.x + fx.w && wy >= fx.y && wy <= fx.y + fx.h));
    if (fl.fixtures.length !== beforeFix) erased = true;

    if (fl.stairs) {
        const beforeStairs = fl.stairs.length;
        fl.stairs = fl.stairs.filter(st => !(wx >= st.x && wx <= st.x + st.w && wy >= st.y && wy <= st.y + st.h));
        if (fl.stairs.length !== beforeStairs) erased = true;
    }

    // 壁の点タップ消去（中点だけでなく壁線分上のどこを押しても最短距離で消去）
    let wallErased = false;
    if (fl.walls && fl.walls.length > 0) {
        let bestIdx = -1;
        let bestDist = 0.38;
        for (let i = fl.walls.length - 1; i >= 0; i--) {
            const wl = fl.walls[i];
            const d = distPointToSegment(wx, wy, wl.x1, wl.y1, wl.x2, wl.y2);
            if (d <= bestDist) {
                bestDist = d;
                bestIdx = i;
            }
        }
        if (bestIdx >= 0) {
            fl.walls.splice(bestIdx, 1);
            erased = true;
            wallErased = true;
        }
    }

    if (!erased) {
        for (let i = fl.rooms.length - 1; i >= 0; i--) {
            const rm = fl.rooms[i];
            if (wx >= rm.x && wx <= rm.x + rm.w && wy >= rm.y && wy <= rm.y + rm.h) {
                fl.rooms.splice(i, 1);
                erased = true;
                break;
            }
        }
    }

    if (erased) {
        state.selectedItem = null;
        if (wallErased && typeof triggerAutoRoomDetection === 'function') triggerAutoRoomDetection();
        saveHistorySnapshot();
        if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
        request2DRedraw();
        if (typeof rebuild3DScene === 'function') rebuild3DScene();
    }
}

function clearCurrentFloorStrokes() {
    const fl = state.floors[state.currentFloor];
    fl.strokes = [];
    fl.stamps = [];
    fl.memos = [];
    saveHistorySnapshot();
    request2DRedraw();
    showToast(`${state.currentFloor === 0 ? '地下' : state.currentFloor + '階'} の手書きペン・メモ注釈を消去しました`);
}

// ============================================================================
// 階段作成システム（ボックス階段 / オープン階段 / 手すり設定対応）
// ============================================================================

function setStairDrawMode(mode) {
    state.stairDrawMode = mode;
    state.stairDrawingPoints = [];
    state.stairTempCurPoint = null;
    if (typeof renderSubToolbar === 'function') renderSubToolbar();
    request2DRedraw();
}

function handleStairPointerDown(snappedX, snappedY) {
    if (state.stairDrawMode === 'preset') {
        const pType = state.stairPresetType || 'STRAIGHT';
        const tSpec = state.stairTurnSpec || 'turn_3';
        placeStairPresetAt(pType, snappedX, snappedY, tSpec);
        return;
    }
    if (!state.stairDrawingPoints) state.stairDrawingPoints = [];
    const pts = state.stairDrawingPoints;

    if (pts.length === 0) {
        pts.push({ x: snappedX, y: snappedY });
        showToast('階段の始点を決定しました。次の角または終点をタップしてください');
    } else {
        const lastPt = pts[pts.length - 1];
        if (Math.hypot(lastPt.x - snappedX, lastPt.y - snappedY) < 0.1) {
            if (pts.length >= 2) openStairModal();
            return;
        }
        const dx = Math.abs(snappedX - lastPt.x);
        const dy = Math.abs(snappedY - lastPt.y);
        let nextX = snappedX, nextY = snappedY;
        if (dx >= dy) nextY = lastPt.y;
        else nextX = lastPt.x;
        pts.push({ x: nextX, y: nextY });
        if (pts.length >= 4) openStairModal();
        else showToast(`${pts.length}点目を指定しました。終点をタップするか「階段作成」を押してください`);
    }
    if (typeof renderSubToolbar === 'function') renderSubToolbar();
    request2DRedraw();
}

function finishStairPathInput() {
    if (!state.stairDrawingPoints || state.stairDrawingPoints.length < 2) {
        showToast('階段の辺（2点以上）を描いてください');
        return;
    }
    openStairModal();
}

function cancelStairDrawing() {
    state.stairDrawingPoints = [];
    state.stairTempCurPoint = null;
    if (typeof renderSubToolbar === 'function') renderSubToolbar();
    request2DRedraw();
}

function updateModalStairTotalBadge() {
    const i1 = parseInt(document.getElementById('modalStairI1')?.value ?? '0', 10) || 0;
    const c1 = parseInt(document.getElementById('modalStairC1')?.value ?? '0', 10) || 0;
    const i2 = parseInt(document.getElementById('modalStairI2')?.value ?? '0', 10) || 0;
    const c2 = parseInt(document.getElementById('modalStairC2')?.value ?? '0', 10) || 0;
    const i3 = parseInt(document.getElementById('modalStairI3')?.value ?? '0', 10) || 0;
    const total = Math.max(1, i1 + c1 + i2 + c2 + i3);
    const badge = document.getElementById('modalStairTotalBadge');
    if (badge) badge.textContent = `合計: ${total}段 (蹴上${total + 1}段)`;
}
window.updateModalStairTotalBadge = updateModalStairTotalBadge;

function applyModalStairPreset(presetKey) {
    const presets = window.STAIR_PATTERN_PRESETS || {};
    const pr = presets[presetKey];
    if (!pr) return;
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = String(v); };
    setVal('modalStairPattern', pr.key);
    setVal('modalStairI1', pr.i1Steps);
    setVal('modalStairC1', pr.c1Steps);
    setVal('modalStairC1Dir', pr.c1Dir);
    setVal('modalStairI2', pr.i2Steps);
    setVal('modalStairC2', pr.c2Steps);
    setVal('modalStairC2Dir', pr.c2Dir);
    setVal('modalStairI3', pr.i3Steps);
    updateModalStairTotalBadge();
}
window.applyModalStairPreset = applyModalStairPreset;

function openStairModal() {
    const modal = document.getElementById('stairCreateModal');
    if (!modal) return;
    setStairModalDir(state.stairDirection || 'UP');
    const wEl = document.getElementById('modalStairWidth');
    if (wEl) wEl.value = state.stairWidthMm || 910;
    const tEl = document.getElementById('modalStairTurn');
    if (tEl) tEl.value = state.stairTurnType || 'turn_3';

    const ltEl = document.getElementById('modalStairLandingTop');
    const stEl = document.getElementById('modalStairSteps');
    const pts = state.stairDrawingPoints || [];
    const tSteps = (typeof window.stairTurnStepsFromSpec === 'function')
        ? window.stairTurnStepsFromSpec(state.stairTurnSpec || state.stairTurnType || 'turn_3')
        : 3;

    if (pts.length === 2) {
        const len1 = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const est1 = Math.max(1, Math.min(16, Math.round(len1 / 0.25) || 13));
        applyModalStairPreset('STRAIGHT');
        const elI1 = document.getElementById('modalStairI1');
        if (elI1) elI1.value = String(est1);
    } else if (pts.length === 3) {
        const seg1Len = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const seg2Len = Math.hypot(pts[2].x - pts[1].x, pts[2].y - pts[1].y);
        const cross = (pts[1].x - pts[0].x) * (pts[2].y - pts[1].y) - (pts[1].y - pts[0].y) * (pts[2].x - pts[1].x);
        const turnDir = cross < -0.01 ? 'left' : 'right';

        if (seg2Len <= 1.25) {
            if (ltEl) ltEl.value = 'landing_top';
            if (stEl) stEl.value = '5';
            if (tEl) tEl.value = 'landing';
            if (seg1Len >= 2.25) {
                applyModalStairPreset('L_TOP_TURN');
            } else {
                applyModalStairPreset('L_LANDING_TOP');
            }
            const c1DirEl = document.getElementById('modalStairC1Dir');
            if (c1DirEl) c1DirEl.value = turnDir;
        } else {
            if (ltEl) ltEl.value = 'auto';
            if (stEl) stEl.value = '0';
            applyModalStairPreset('L_STANDARD');
            const c1DirEl = document.getElementById('modalStairC1Dir');
            if (c1DirEl) c1DirEl.value = turnDir;
            const c1El = document.getElementById('modalStairC1');
            if (c1El) c1El.value = String(tSteps);
        }
    } else if (pts.length >= 4) {
        const seg1Len = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const seg2Len = Math.hypot(pts[2].x - pts[1].x, pts[2].y - pts[1].y);
        const seg3Len = Math.hypot(pts[3].x - pts[2].x, pts[3].y - pts[2].y);
        const cross1 = (pts[1].x - pts[0].x) * (pts[2].y - pts[1].y) - (pts[1].y - pts[0].y) * (pts[2].x - pts[1].x);
        const cross2 = (pts[2].x - pts[1].x) * (pts[3].y - pts[2].y) - (pts[2].y - pts[1].y) * (pts[3].x - pts[2].x);
        const dir1 = cross1 < -0.01 ? 'left' : 'right';
        const dir2 = cross2 < -0.01 ? 'left' : 'right';

        if (seg1Len <= 1.25 && seg3Len <= 1.25) {
            applyModalStairPreset('CRANK_BOTH_TURN');
        } else if (seg3Len <= 1.25 && seg2Len > 1.25) {
            applyModalStairPreset('L_PLUS_TOP_TURN');
        } else {
            applyModalStairPreset('U_6TURN');
        }
        const c1DirEl = document.getElementById('modalStairC1Dir');
        const c2DirEl = document.getElementById('modalStairC2Dir');
        if (c1DirEl) c1DirEl.value = dir1;
        if (c2DirEl) c2DirEl.value = dir2;
    } else {
        applyModalStairPreset(state.stairPresetType || 'U_6TURN');
    }

    updateModalStairTotalBadge();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeStairModal() {
    const modal = document.getElementById('stairCreateModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function setStairModalDir(dir) {
    state.stairDirection = dir;
    const btnUp = document.getElementById('btnStairDirUp');
    const btnDown = document.getElementById('btnStairDirDown');
    if (!btnUp || !btnDown) return;
    if (dir === 'UP') {
        btnUp.className = 'py-2 rounded-xl border font-bold text-sm flex items-center justify-center gap-1.5 transition bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-900/40';
        btnDown.className = 'py-2 rounded-xl border font-bold text-sm flex items-center justify-center gap-1.5 transition bg-slate-800 text-slate-300 border-slate-700 hover:text-white';
    } else {
        btnDown.className = 'py-2 rounded-xl border font-bold text-sm flex items-center justify-center gap-1.5 transition bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-900/40';
        btnUp.className = 'py-2 rounded-xl border font-bold text-sm flex items-center justify-center gap-1.5 transition bg-slate-800 text-slate-300 border-slate-700 hover:text-white';
    }
}

function confirmCreateStairFromModal() {
    const widthMm = parseInt(document.getElementById('modalStairWidth')?.value || '910', 10) || 910;
    const turnType = document.getElementById('modalStairTurn')?.value || 'turn_3';
    const dir = state.stairDirection || 'UP';
    const stepsVal = parseInt(document.getElementById('modalStairSteps')?.value || '0', 10) || 0;
    const landingTopMode = document.getElementById('modalStairLandingTop')?.value || 'auto';

    let modularOverrides = null;
    const elI1 = document.getElementById('modalStairI1');
    if (elI1) {
        modularOverrides = {
            patternKey: document.getElementById('modalStairPattern')?.value || '',
            i1Steps: parseInt(elI1.value || '0', 10) || 0,
            c1Steps: parseInt(document.getElementById('modalStairC1')?.value || '0', 10) || 0,
            c1Dir: document.getElementById('modalStairC1Dir')?.value || 'right',
            i2Steps: parseInt(document.getElementById('modalStairI2')?.value || '0', 10) || 0,
            c2Steps: parseInt(document.getElementById('modalStairC2')?.value || '0', 10) || 0,
            c2Dir: document.getElementById('modalStairC2Dir')?.value || 'right',
            i3Steps: parseInt(document.getElementById('modalStairI3')?.value || '0', 10) || 0
        };
    }

    createStairFromPoints(state.stairDrawingPoints, widthMm, dir, turnType, stepsVal, landingTopMode, modularOverrides);
    closeStairModal();
    state.stairDrawingPoints = [];
    state.stairTempCurPoint = null;
    if (typeof renderSubToolbar === 'function') renderSubToolbar();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast('階段を作成しました');
}

function createStairFromPoints(pts, widthMm, dir, turnType, customSteps, landingTopMode, modularOverrides) {
    if (!pts || pts.length < 2) return;
    const fl = state.floors[state.currentFloor];
    const pitch = state.modulePitch || 910;
    const widthP = +(widthMm / pitch).toFixed(3);
    const tSteps = (typeof window.stairTurnStepsFromSpec === 'function') ? window.stairTurnStepsFromSpec(turnType) : 3;

    const segCount = pts.length - 1;
    let shapeType = 'STRAIGHT';
    let isLandingTop = false;
    let finalSteps = customSteps || 14;

    let i1Steps = finalSteps;
    let c1Steps = 0, c1Dir = 'right';
    let i2Steps = 0;
    let c2Steps = 0, c2Dir = 'right';
    let i3Steps = 0;
    let patternKey = '';

    // 初期進行方向から回転角を算出
    let rot = 0;
    const dx0 = pts[1].x - pts[0].x, dy0 = pts[1].y - pts[0].y;
    if (Math.abs(dy0) >= Math.abs(dx0)) {
        rot = dy0 <= 0 ? 0 : 180;
    } else {
        rot = dx0 >= 0 ? 90 : 270;
    }

    if (segCount === 2) {
        shapeType = 'L_SHAPE';
        const p0 = pts[0], p1 = pts[1], p2 = pts[2];
        const seg2Len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const cross = (p1.x - p0.x) * (p2.y - p1.y) - (p1.y - p0.y) * (p2.x - p1.x);
        c1Dir = cross < -0.01 ? 'left' : 'right';
        c1Steps = tSteps;

        if (landingTopMode === 'landing_top') {
            isLandingTop = true;
            if (!customSteps) finalSteps = 5;
        } else if (landingTopMode === 'through') {
            isLandingTop = false;
            if (!customSteps) finalSteps = 13;
        } else {
            if (seg2Len <= 1.25) {
                isLandingTop = true;
                if (!customSteps) finalSteps = 5;
            }
        }

        if (isLandingTop) {
            i1Steps = finalSteps;
            i2Steps = 0;
        } else {
            const rem = Math.max(2, finalSteps - c1Steps);
            i1Steps = Math.ceil(rem / 2);
            i2Steps = Math.floor(rem / 2);
        }
    } else if (segCount >= 3) {
        shapeType = 'U_SHAPE';
        const p0 = pts[0], p1 = pts[1], p2 = pts[2], p3 = pts[3];
        const seg1Len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        const seg2Len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const seg3Len = Math.hypot(p3.x - p2.x, p3.y - p2.y);
        const cross1 = (p1.x - p0.x) * (p2.y - p1.y) - (p1.y - p0.y) * (p2.x - p1.x);
        const cross2 = (p2.x - p1.x) * (p3.y - p2.y) - (p2.y - p1.y) * (p3.x - p2.x);
        c1Dir = cross1 < -0.01 ? 'left' : 'right';
        c2Dir = cross2 < -0.01 ? 'left' : 'right';
        c1Steps = tSteps;
        c2Steps = tSteps;

        if (seg1Len <= 1.25 && seg3Len <= 1.25) {
            i1Steps = 0; i2Steps = 7; i3Steps = 0;
            const dxMid = p2.x - p1.x, dyMid = p2.y - p1.y;
            if (Math.abs(dyMid) >= Math.abs(dxMid)) rot = dyMid <= 0 ? 0 : 180;
            else rot = dxMid >= 0 ? 90 : 270;
        } else if (seg3Len <= 1.25) {
            i1Steps = 4; i2Steps = 4; i3Steps = 0;
        } else {
            i1Steps = 4; i2Steps = 0; i3Steps = 3;
        }
    }

    if (modularOverrides) {
        i1Steps = modularOverrides.i1Steps;
        c1Steps = modularOverrides.c1Steps;
        c1Dir = modularOverrides.c1Dir || c1Dir;
        i2Steps = modularOverrides.i2Steps;
        c2Steps = modularOverrides.c2Steps;
        c2Dir = modularOverrides.c2Dir || c2Dir;
        i3Steps = modularOverrides.i3Steps;
        patternKey = modularOverrides.patternKey || '';
        isLandingTop = (c1Steps > 0 && i2Steps === 0 && c2Steps === 0 && i3Steps === 0);
        if (c1Steps === 0 && c2Steps === 0) shapeType = 'STRAIGHT';
        else if (c2Steps > 0 && c1Dir === c2Dir) shapeType = 'U_SHAPE';
        else shapeType = 'L_SHAPE';
        turnType = c1Steps === 1 ? 'landing' : (c1Steps === 2 ? 'turn_2' : (c1Steps === 4 ? 'turn_4' : 'turn_3'));
        finalSteps = isLandingTop ? i1Steps : Math.max(1, i1Steps + c1Steps + i2Steps + c2Steps + i3Steps);
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pts.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    });

    const wP = Math.max(widthP, +(maxX - minX).toFixed(3) || widthP);
    const hP = Math.max(widthP, +(maxY - minY).toFixed(3) || (widthP * 2));

    const newStair = {
        id: uid(),
        kind: 'stair',
        type: 'STAIR',
        category: 'STAIR',
        shapeType: shapeType,
        patternKey: patternKey,
        isModular: true,
        landingTop: isLandingTop,
        rotation: rot,
        i1Steps: i1Steps,
        c1Steps: c1Steps,
        c1Dir: c1Dir,
        i2Steps: i2Steps,
        c2Steps: c2Steps,
        c2Dir: c2Dir,
        i3Steps: i3Steps,
        points: JSON.parse(JSON.stringify(pts)),
        x: minX,
        y: minY,
        w: wP,
        h: hP,
        widthMm: widthMm,
        direction: dir,
        turnType: turnType,
        stairStyle: state.stairStyle || 'box',
        stairHandrail: state.stairHandrail || 'both',
        handrail: state.stairHandrail || 'both',
        steps: finalSteps,
        treadMm: 227.5,
        riserMm: 200,
        label: `階段 (${shapeType === 'STRAIGHT' ? '直階段' : (isLandingTop ? 'L型踊り場登りきり' : (shapeType === 'L_SHAPE' ? 'かね折れL型' : '折り返しU型'))}・${dir === 'UP' ? '上る' : '降りる'})`
    };

    if (typeof window.computeStairModularLayout === 'function') {
        const layout = window.computeStairModularLayout(newStair);
        newStair.w = layout.totalW;
        newStair.h = layout.totalH;
    }

    fl.stairs = fl.stairs || [];
    fl.stairs.push(newStair);
    if (typeof window.syncUpperFloorStairs === 'function') window.syncUpperFloorStairs();
    state.selectedItem = { kind: 'stair', id: newStair.id, floor: state.currentFloor };
    saveHistorySnapshot();
}

function setStairPresetType(t) {
    state.stairPresetType = t;
    state.stairPresetToPlace = t;
    state.stairDrawMode = 'preset';
    if (typeof renderSubToolbar === 'function') renderSubToolbar();
    request2DRedraw();
}
function rotateStairPreset() {
    state.subStairRot = ((state.subStairRot || 0) + 90) % 360;
    if (typeof renderSubToolbar === 'function') renderSubToolbar();
    request2DRedraw();
}
function toggleStairDirection() {
    state.subStairDirection = state.subStairDirection === 'DOWN' ? 'UP' : 'DOWN';
    if (typeof renderSubToolbar === 'function') renderSubToolbar();
    request2DRedraw();
}
function placeStairPreset(presetType) {
    state.stairPresetToPlace = presetType;
    state.stairDrawMode = 'preset';
    if (typeof renderSubToolbar === 'function') renderSubToolbar();
}
function normalizeStairObject(st) {
    if (!st) return st;
    if ((st.x === undefined || st.w === undefined || isNaN(st.x) || isNaN(st.w)) && st.points && st.points.length >= 2) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        st.points.forEach(pt => {
            minX = Math.min(minX, pt.x);
            minY = Math.min(minY, pt.y);
            maxX = Math.max(maxX, pt.x);
            maxY = Math.max(maxY, pt.y);
        });
        st.x = minX;
        st.y = minY;
        const pitch = (state && state.modulePitch) ? state.modulePitch : 910;
        const widthP = (st.widthMm || 910) / pitch;
        st.w = +(Math.max(widthP, maxX - minX)).toFixed(3) || widthP;
        st.h = +(Math.max(widthP, maxY - minY)).toFixed(3) || (widthP * 2);
    }
    if (st.stairHandrail && !st.handrail) st.handrail = st.stairHandrail;
    if (st.handrail && !st.stairHandrail) st.stairHandrail = st.handrail;
    return st;
}
window.normalizeStairObject = normalizeStairObject;

function placeStairPresetAt(presetType, x, y, turnSpecParam) {
    const rawType = presetType || state.stairPresetType || 'U_6TURN';
    const rot = state.subStairRot || 0;
    const dir = state.subStairDirection || 'UP';
    const turnSpec = turnSpecParam || state.stairTurnSpec || 'turn_3';
    const widthMm = state.stairWidthMm || 910;
    const tSteps = (typeof window.stairTurnStepsFromSpec === 'function') ? window.stairTurnStepsFromSpec(turnSpec) : 3;

    const presets = window.STAIR_PATTERN_PRESETS || {};
    let pKey = rawType;
    if (rawType === 'U_SHAPE' && !presets[pKey]) pKey = 'U_6TURN';
    if (rawType === 'L_SHAPE' && !presets[pKey]) pKey = 'L_STANDARD';

    const pr = presets[pKey] || presets['STRAIGHT'] || {
        key: 'STRAIGHT', shortLabel: '直階段', shapeType: 'STRAIGHT',
        i1Steps: 13, c1Steps: 0, c1Dir: 'right', i2Steps: 0, c2Steps: 0, c2Dir: 'right', i3Steps: 0
    };

    const c1Val = pr.c1Steps > 0 ? (pr.key === 'L_LANDING_TOP' || pr.key === 'U_LANDING' ? 1 : tSteps) : 0;
    const c2Val = pr.c2Steps > 0 ? (pr.key === 'U_LANDING' ? 1 : tSteps) : 0;

    const fl = state.floors[state.currentFloor];
    const newStair = {
        id: uid(),
        kind: 'stair',
        type: 'STAIR',
        category: 'STAIR',
        shapeType: pr.shapeType,
        patternKey: pr.key,
        isModular: true,
        rotation: rot,
        i1Steps: pr.i1Steps,
        c1Steps: c1Val,
        c1Dir: pr.c1Dir,
        i2Steps: pr.i2Steps,
        c2Steps: c2Val,
        c2Dir: pr.c2Dir,
        i3Steps: pr.i3Steps,
        landingTop: (c1Val > 0 && pr.i2Steps === 0 && c2Val === 0 && pr.i3Steps === 0),
        x: x,
        y: y,
        w: 1,
        h: 2,
        widthMm: widthMm,
        direction: dir,
        turnType: c1Val === 1 ? 'landing' : (c1Val === 2 ? 'turn_2' : (c1Val === 4 ? 'turn_4' : 'turn_3')),
        stairStyle: state.stairStyle || 'box',
        stairHandrail: state.stairHandrail || 'both',
        handrail: state.stairHandrail || 'both',
        steps: Math.max(1, pr.i1Steps + c1Val + pr.i2Steps + c2Val + pr.i3Steps),
        treadMm: 227.5,
        riserMm: 200,
        label: `階段 (${pr.shortLabel}・${dir === 'UP' ? '上る' : '降りる'})`
    };

    if (typeof window.syncStairModularBounds === 'function') {
        window.syncStairModularBounds(newStair);
    }

    if (!fl.stairs) fl.stairs = [];
    fl.stairs.push(newStair);
    if (typeof window.syncUpperFloorStairs === 'function') window.syncUpperFloorStairs();
    state.selectedItem = { kind: 'stair', id: newStair.id, floor: state.currentFloor };

    saveHistorySnapshot();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast(`階段（${pr.shortLabel}・計${newStair.steps}段）を配置しました`);
}

function updateStairProp(id, prop, val) {
    const fl = state.floors[state.currentFloor];
    const st = (fl.stairs || []).find(s => s.id === id) || (fl.fixtures || []).find(f => f.id === id);
    if (!st) return;
    st[prop] = val;
    saveHistorySnapshot();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
}

// ============================================================================
// P1-4 & P3-2: 壁の平行移動・接続壁端点自動追随・長さ数値指定・部屋辺寸法指定
// ============================================================================

function translateWallAndConnected(targetWall, dxP, dyP, commitHistory = true) {
    if (!targetWall || (Math.abs(dxP) < 1e-5 && Math.abs(dyP) < 1e-5)) return;
    const fl = state.floors[state.currentFloor];
    if (!fl) return;

    const oldX1 = targetWall.x1, oldY1 = targetWall.y1;
    const oldX2 = targetWall.x2, oldY2 = targetWall.y2;
    const minOldX = Math.min(oldX1, oldX2) - 0.15, maxOldX = Math.max(oldX1, oldX2) + 0.15;
    const minOldY = Math.min(oldY1, oldY2) - 0.15, maxOldY = Math.max(oldY1, oldY2) + 0.15;
    const isHoriz = Math.abs(oldY1 - oldY2) < 0.05;
    const isVert = Math.abs(oldX1 - oldX2) < 0.05;

    // 1. 接続している他壁の端点を自動追随（ラバーバンド伸縮）
    const tol = 0.08;
    (fl.walls || []).forEach(w => {
        if (w.id === targetWall.id) return;
        const p1Match = (Math.hypot(w.x1 - oldX1, w.y1 - oldY1) <= tol) || (Math.hypot(w.x1 - oldX2, w.y1 - oldY2) <= tol);
        const p2Match = (Math.hypot(w.x2 - oldX1, w.y2 - oldY1) <= tol) || (Math.hypot(w.x2 - oldX2, w.y2 - oldY2) <= tol);
        if (p1Match) {
            w.x1 = +(w.x1 + dxP).toFixed(4);
            w.y1 = +(w.y1 + dyP).toFixed(4);
        }
        if (p2Match) {
            w.x2 = +(w.x2 + dxP).toFixed(4);
            w.y2 = +(w.y2 + dyP).toFixed(4);
        }
        // T字接続（直交壁の端点が対象壁の途中に乗っている場合）も伸縮追随
        if (!p1Match && isHoriz && Math.abs(w.x1 - w.x2) < 0.05) {
            if (w.x1 >= minOldX && w.x1 <= maxOldX) {
                if (Math.abs(w.y1 - oldY1) <= tol) w.y1 = +(w.y1 + dyP).toFixed(4);
                if (Math.abs(w.y2 - oldY1) <= tol) w.y2 = +(w.y2 + dyP).toFixed(4);
            }
        } else if (!p1Match && isVert && Math.abs(w.y1 - w.y2) < 0.05) {
            if (w.y1 >= minOldY && w.y1 <= maxOldY) {
                if (Math.abs(w.x1 - oldX1) <= tol) w.x1 = +(w.x1 + dxP).toFixed(4);
                if (Math.abs(w.x2 - oldX1) <= tol) w.x2 = +(w.x2 + dxP).toFixed(4);
            }
        }
    });

    // 2. この壁の上に乗っている窓・建具も一緒に移動
    (fl.openings || []).forEach(op => {
        if (isHoriz && op.orient === 'h' && Math.abs(op.y - oldY1) <= 0.22 && op.x >= minOldX && op.x <= maxOldX) {
            op.x = +(op.x + dxP).toFixed(4);
            op.y = +(op.y + dyP).toFixed(4);
        } else if (isVert && op.orient === 'v' && Math.abs(op.x - oldX1) <= 0.22 && op.y >= minOldY && op.y <= maxOldY) {
            op.x = +(op.x + dxP).toFixed(4);
            op.y = +(op.y + dyP).toFixed(4);
        }
    });

    // 3. 対象壁自身を移動
    targetWall.x1 = +(targetWall.x1 + dxP).toFixed(4);
    targetWall.y1 = +(targetWall.y1 + dyP).toFixed(4);
    targetWall.x2 = +(targetWall.x2 + dxP).toFixed(4);
    targetWall.y2 = +(targetWall.y2 + dyP).toFixed(4);

    if (commitHistory) {
        if (typeof triggerAutoRoomDetection === 'function') triggerAutoRoomDetection();
        saveHistorySnapshot();
        if (typeof rebuild3DScene === 'function') rebuild3DScene();
        if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
        request2DRedraw();
    }
}
window.translateWallAndConnected = translateWallAndConnected;

function nudgeSelectedWallByMm(deltaMm) {
    const obj = findSelectedObject();
    if (!obj || !state.selectedItem || state.selectedItem.kind !== 'wall') return;
    if (!deltaMm || isNaN(deltaMm)) return;
    const pitch = state.modulePitch || 910;
    const deltaP = deltaMm / pitch;
    const isHoriz = Math.abs(obj.y1 - obj.y2) < 0.05;
    const isVert = Math.abs(obj.x1 - obj.x2) < 0.05;
    if (isHoriz) {
        translateWallAndConnected(obj, 0, deltaP, true);
    } else if (isVert) {
        translateWallAndConnected(obj, deltaP, 0, true);
    } else {
        // 斜め壁の場合は法線方向へ移動
        const len = Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1) || 1;
        const nx = -(obj.y2 - obj.y1) / len;
        const ny = (obj.x2 - obj.x1) / len;
        translateWallAndConnected(obj, nx * deltaP, ny * deltaP, true);
    }
    showToast(`壁を ${deltaMm > 0 ? '+' : ''}${deltaMm}mm 平行移動しました（接続壁・建具も追随）`);
}
window.nudgeSelectedWallByMm = nudgeSelectedWallByMm;

function updateSelectedWallLengthMm(newLenMm) {
    const obj = findSelectedObject();
    if (!obj || !state.selectedItem || state.selectedItem.kind !== 'wall') return;
    if (!newLenMm || isNaN(newLenMm) || newLenMm < 100) return;
    const pitch = state.modulePitch || 910;
    const newLenP = newLenMm / pitch;
    const curLenP = Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1);
    if (curLenP < 1e-4) return;
    const ux = (obj.x2 - obj.x1) / curLenP;
    const uy = (obj.y2 - obj.y1) / curLenP;
    obj.x2 = +(obj.x1 + ux * newLenP).toFixed(4);
    obj.y2 = +(obj.y1 + uy * newLenP).toFixed(4);
    if (typeof triggerAutoRoomDetection === 'function') triggerAutoRoomDetection();
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    showToast(`壁の長さを ${newLenMm}mm に更新しました`);
}
window.updateSelectedWallLengthMm = updateSelectedWallLengthMm;

function updateSelectedRoomDimensionsMm(newWMm, newHMm) {
    const rm = findSelectedObject();
    if (!rm || !state.selectedItem || state.selectedItem.kind !== 'room') return;
    const pitch = state.modulePitch || 910;
    const fl = state.floors[state.currentFloor];
    const oldRightX = rm.x + rm.w;
    const oldBottomY = rm.y + rm.h;

    if (newWMm !== null && !isNaN(newWMm) && newWMm >= 455) {
        const nextWP = +(newWMm / pitch).toFixed(4);
        const dxP = nextWP - rm.w;
        // 自動検出部屋等で周囲に壁がある場合は右辺の壁を平行移動して追随
        if (fl && fl.walls && Math.abs(dxP) > 1e-4) {
            const rightWalls = fl.walls.filter(w =>
                Math.abs(w.x1 - w.x2) < 0.05 &&
                Math.abs(w.x1 - oldRightX) <= 0.12 &&
                Math.max(w.y1, w.y2) >= rm.y - 0.1 &&
                Math.min(w.y1, w.y2) <= oldBottomY + 0.1
            );
            rightWalls.forEach(rw => translateWallAndConnected(rw, dxP, 0, false));
        }
        rm.w = nextWP;
    }

    if (newHMm !== null && !isNaN(newHMm) && newHMm >= 455) {
        const nextHP = +(newHMm / pitch).toFixed(4);
        const dyP = nextHP - rm.h;
        if (fl && fl.walls && Math.abs(dyP) > 1e-4) {
            const bottomWalls = fl.walls.filter(w =>
                Math.abs(w.y1 - w.y2) < 0.05 &&
                Math.abs(w.y1 - oldBottomY) <= 0.12 &&
                Math.max(w.x1, w.x2) >= rm.x - 0.1 &&
                Math.min(w.x1, w.x2) <= oldRightX + 0.1
            );
            bottomWalls.forEach(bw => translateWallAndConnected(bw, 0, dyP, false));
        }
        rm.h = nextHP;
    }

    if (typeof triggerAutoRoomDetection === 'function' && fl && fl.walls && fl.walls.length >= 3) {
        triggerAutoRoomDetection();
    }
    saveHistorySnapshot();
    if (typeof updateAllMetricsAnd3D === 'function') updateAllMetricsAnd3D();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    showToast(`部屋の寸法を ${Math.round(rm.w * pitch)}mm × ${Math.round(rm.h * pitch)}mm に更新しました`);
}
window.updateSelectedRoomDimensionsMm = updateSelectedRoomDimensionsMm;

// キーボードショートカット（矢印キーでの壁・建具・部屋のグリッド移動、Ctrl+C/Vでの建具コピー、Deleteでの削除）
if (typeof window !== 'undefined' && !window._madoriKeyShortcutsBound) {
    window._madoriKeyShortcutsBound = true;
    window.addEventListener('keydown', (e) => {
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (typeof undo === 'function') undo();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            if (typeof redo === 'function') redo();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
            if (state.selectedItem && state.selectedItem.kind === 'opening' && typeof copySelectedOpeningForPaste === 'function') {
                e.preventDefault();
                copySelectedOpeningForPaste();
            }
            return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (state.selectedItem && typeof deleteSelectedItem === 'function') {
                e.preventDefault();
                deleteSelectedItem();
            }
            return;
        }
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && state.selectedItem) {
            const obj = findSelectedObject();
            if (!obj) return;
            const pitch = state.modulePitch || 910;
            const stepMm = e.shiftKey ? 910 : Math.round(pitch / (state.gridDivisions || 2));
            if (state.selectedItem.kind === 'wall') {
                e.preventDefault();
                const isHoriz = Math.abs(obj.y1 - obj.y2) < 0.05;
                if (isHoriz && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                    nudgeSelectedWallByMm(e.key === 'ArrowDown' ? stepMm : -stepMm);
                } else if (!isHoriz && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                    nudgeSelectedWallByMm(e.key === 'ArrowRight' ? stepMm : -stepMm);
                }
            }
        }
    });
}

// Global Window Exports
if (typeof window !== 'undefined') {
    window.checkOpeningOverlap = checkOpeningOverlap;
    window.snapPointToNearestWallEdge = snapPointToNearestWallEdge;
    window.setSubDoorFit = setSubDoorFit;
    window.placeOpeningAt = placeOpeningAt;
    window.flipLastOrSelectedOpening = flipLastOrSelectedOpening;
    window.updatePointerStatusBadge = updatePointerStatusBadge;
    window.findNearestWallForFixture = findNearestWallForFixture;
    window.tryStartSelectOrModifyInteraction = tryStartSelectOrModifyInteraction;
    window.updateSelectedStairShape = updateSelectedStairShape;
    window.updateSelectedStairDir = updateSelectedStairDir;
    window.updateSelectedStairSteps = updateSelectedStairSteps;
    window.rotateSelectedStair = rotateSelectedStair;
    window.renameSelectedRoom = renameSelectedRoom;
    window.updateSelectedRoomName = updateSelectedRoomName;
    window.applyRoomNameChip = applyRoomNameChip;
    window.changeSelectedRoomType = changeSelectedRoomType;
    window.toggleSelectedRoomFloorArea = toggleSelectedRoomFloorArea;
    window.rotateSelectedFixture = rotateSelectedFixture;
    window.updateSelectedKitchenI = updateSelectedKitchenI;
    window.updateSelectedKitchenL = updateSelectedKitchenL;
    window.updateSelectedKitchenIsland = updateSelectedKitchenIsland;
    window.changeSelectedKitchenType = changeSelectedKitchenType;
    window.updateSelectedUbSize = updateSelectedUbSize;
    window.updateSelectedUbPattern = updateSelectedUbPattern;
    window.updateSelectedVanity = updateSelectedVanity;
    window.updateSelectedWindowSize = updateSelectedWindowSize;
    window.updateSelectedOpeningSill = updateSelectedOpeningSill;
    window.updateSelectedDoorFit = updateSelectedDoorFit;
    window.updateSelectedDoorLeafCount = updateSelectedDoorLeafCount;
    window.updateSelectedDoorLeafWidth = updateSelectedDoorLeafWidth;
    window.updateSelectedDoorHeight = updateSelectedDoorHeight;
    window.recalcDoorDimensions = recalcDoorDimensions;
    window.deleteSelectedItem = deleteSelectedItem;
    window.eraseAtPoint = eraseAtPoint;
    window.clearCurrentFloorStrokes = clearCurrentFloorStrokes;
    window.setStairDrawMode = setStairDrawMode;
    window.handleStairPointerDown = handleStairPointerDown;
    window.finishStairPathInput = finishStairPathInput;
    window.cancelStairDrawing = cancelStairDrawing;
    window.openStairModal = openStairModal;
    window.closeStairModal = closeStairModal;
    window.setStairModalDir = setStairModalDir;
    window.confirmCreateStairFromModal = confirmCreateStairFromModal;
    window.createStairFromPoints = createStairFromPoints;
    window.setStairPresetType = setStairPresetType;
    window.rotateStairPreset = rotateStairPreset;
    window.toggleStairDirection = toggleStairDirection;
    window.placeStairPreset = placeStairPreset;
    window.placeStairPresetAt = placeStairPresetAt;
    window.updateStairProp = updateStairProp;
}
