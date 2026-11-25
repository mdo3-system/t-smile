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
    const doorOnlyFits = ['oredo', 'closet', 'oyako'];
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
        type: isWin ? 'WINDOW' : (doorFit === 'katabiraki' || doorFit === 'hiraki' ? 'SWING_DOOR' : 'SLIDING_DOOR'),
        sashType: fitId,
        doorFit: doorFit,
        leafCount: leafCount,
        leafWidthMm: leafWidthMm,
        x: target.x,
        y: target.y,
        orient: target.orient,
        flip: false,
        widthMm: widthMm,
        heightMm: heightMm,
        sillMm: sillMm,
        widthP: widthP,
        label: label,
        isWin: isWin
    };

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
        op.flip = !op.flip;
        saveHistorySnapshot();
        request2DRedraw();
        if (typeof rebuild3DScene === 'function') rebuild3DScene();
        showToast('建具の開閉方向（左右・内外）を反転しました');
    }
}

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

canvas2d.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { canvas2d.setPointerCapture(e.pointerId); } catch (_) { }
    updatePointerStatusBadge(e);

    if (e.pointerType === 'touch') {
        activeTouchCount++;
    }

    const rect = canvas2d.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldPos = screenToWorldP(sx, sy);
    const snappedX = snapP(worldPos.x);
    const snappedY = snapP(worldPos.y);
    state.lastHoverWorld = { x: snappedX, y: snappedY };

    // 🖐️ パームリジェクション判定：
    // 1. ペン専用モード時の指タッチ (e.pointerType === 'touch')
    // 2. タブレットで手のひら（接触面積 width/height が 28px 超の大きな接触面）が触れた場合
    // 3. 2本指以上のマルチタッチ
    const isLargePalmTouch = (e.pointerType === 'touch' && ((e.width && e.width > 28) || (e.height && e.height > 28)));
    if ((state.stylusOnlyMode && e.pointerType === 'touch') || isLargePalmTouch || activeTouchCount >= 2) {
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
                fl.walls.push({
                    id: uid(),
                    x1: x1,
                    y1: y1,
                    x2: x2,
                    y2: y2,
                    wallType: wType
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

    if (cat === 'KITCHEN') {
        const kType = state.subKitchenType || 'I';
        hMm = state.subKitchenHeight || 850;
        if (kType === 'I') {
            wMm = state.subKitchenIWidth || 2550;
            dMm = state.subKitchenIDepth || 650;
            label = `I型キッチン (${wMm / 10}×${dMm / 10}cm)`;
        } else if (kType === 'L') {
            wMm = state.subKitchenLXWidth || 2550;
            dMm = state.subKitchenLYWidth || 1950;
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

    const rot = state.subFixtureRot || 0;
    let finalWP = (rot === 90 || rot === 270) ? hP : wP;
    let finalHP = (rot === 90 || rot === 270) ? wP : hP;

    let placeX = snappedX;
    let placeY = snappedY;
    const wallSnap = findNearestWallForFixture(snappedX, snappedY, finalWP, finalHP);
    if (wallSnap) {
        placeX = wallSnap.x;
        placeY = wallSnap.y;
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
        hMm: hMm,
        rot: rot,
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
    showToast(`${label} を壁に自動吸着配置しました`);
}

function findNearestWallForFixture(curX, curY, wP, hP) {
    const fl = state.floors[state.currentFloor];
    if (!fl) return null;
    const wallThickM = 0.13;
    const scaleP = (state.modulePitch || 910) / 1000;
    const halfWallP = +((wallThickM / 2) / scaleP).toFixed(3);
    const snapDistanceThreshold = 1.35;

    let bestSnap = null;
    let minDistance = snapDistanceThreshold;
    const centerX = curX + wP / 2;
    const centerY = curY + hP / 2;

    if (fl.walls && fl.walls.length > 0) {
        fl.walls.forEach(wl => {
            const isHoriz = Math.abs(wl.y1 - wl.y2) < 0.05;
            if (isHoriz) {
                const minWlX = Math.min(wl.x1, wl.x2);
                const maxWlX = Math.max(wl.x1, wl.x2);
                if (curX + wP >= minWlX - 0.4 && curX <= maxWlX + 0.4) {
                    const distToWall = Math.min(Math.abs(curY - wl.y1), Math.abs((curY + hP) - wl.y1), Math.abs(centerY - wl.y1));
                    if (distToWall < minDistance) {
                        minDistance = distToWall;
                        if (centerY >= wl.y1) {
                            bestSnap = { x: curX, y: +(wl.y1 + halfWallP).toFixed(3), side: 'top', wall: wl, rot: 0 };
                        } else {
                            bestSnap = { x: curX, y: +(wl.y1 - halfWallP - hP).toFixed(3), side: 'bottom', wall: wl, rot: 180 };
                        }
                    }
                }
            } else {
                const minWlY = Math.min(wl.y1, wl.y2);
                const maxWlY = Math.max(wl.y1, wl.y2);
                if (curY + hP >= minWlY - 0.4 && curY <= maxWlY + 0.4) {
                    const distToWall = Math.min(Math.abs(curX - wl.x1), Math.abs((curX + wP) - wl.x1), Math.abs(centerX - wl.x1));
                    if (distToWall < minDistance) {
                        minDistance = distToWall;
                        if (centerX >= wl.x1) {
                            bestSnap = { x: +(wl.x1 + halfWallP).toFixed(3), y: curY, side: 'left', wall: wl, rot: 90 };
                        } else {
                            bestSnap = { x: +(wl.x1 - halfWallP - wP).toFixed(3), y: curY, side: 'right', wall: wl, rot: 270 };
                        }
                    }
                }
            }
        });
    }

    if (fl.rooms && fl.rooms.length > 0) {
        fl.rooms.forEach(rm => {
            const edges = [
                { isHoriz: true, y: rm.y, x1: rm.x, x2: rm.x + rm.w, side: 'top' },
                { isHoriz: true, y: rm.y + rm.h, x1: rm.x, x2: rm.x + rm.w, side: 'bottom' },
                { isHoriz: false, x: rm.x, y1: rm.y, y2: rm.y + rm.h, side: 'left' },
                { isHoriz: false, x: rm.x + rm.w, y1: rm.y, y2: rm.y + rm.h, side: 'right' }
            ];
            edges.forEach(ed => {
                if (ed.isHoriz) {
                    if (curX + wP >= ed.x1 - 0.4 && curX <= ed.x2 + 0.4) {
                        const dist = Math.min(Math.abs(curY - ed.y), Math.abs((curY + hP) - ed.y), Math.abs(centerY - ed.y));
                        if (dist < minDistance) {
                            minDistance = dist;
                            bestSnap = centerY >= ed.y
                                ? { x: curX, y: +(ed.y + halfWallP).toFixed(3), side: 'top', rot: 0 }
                                : { x: curX, y: +(ed.y - halfWallP - hP).toFixed(3), side: 'bottom', rot: 180 };
                        }
                    }
                } else {
                    if (curY + hP >= ed.y1 - 0.4 && curY <= ed.y2 + 0.4) {
                        const dist = Math.min(Math.abs(curX - ed.x), Math.abs((curX + wP) - ed.x), Math.abs(centerX - ed.x));
                        if (dist < minDistance) {
                            minDistance = dist;
                            bestSnap = centerX >= ed.x
                                ? { x: +(ed.x + halfWallP).toFixed(3), y: curY, side: 'left', rot: 90 }
                                : { x: +(ed.x - halfWallP - wP).toFixed(3), y: curY, side: 'right', rot: 270 };
                        }
                    }
                }
            });
        });
    }
    return bestSnap;
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
    if (!onlyHitExistingOfSameToolType || state.activeTool === 'stair') {
        const stairs = fl.stairs || [];
        for (let i = stairs.length - 1; i >= 0; i--) {
            const st = normalizeStairObject(stairs[i]);
            if (wx >= st.x && wx <= st.x + st.w && wy >= st.y && wy <= st.y + st.h) {
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
        t.x = snapP(worldPos.x - drag.offsetX);
        t.y = snapP(worldPos.y - drag.offsetY);
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
    if (e && e.pointerType === 'touch') {
        activeTouchCount = Math.max(0, activeTouchCount - 1);
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
            fl.walls.push({
                id: uid(),
                x1: drag.startX,
                y1: drag.startY,
                x2: drag.curX,
                y2: drag.curY,
                wallType: wType
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
    if (e && e.pointerType === 'touch') {
        activeTouchCount = Math.max(0, activeTouchCount - 1);
    }
    state.lastHoverWorld = null;
    state.dragAction = null;
    request2DRedraw();
});

canvas2d.addEventListener('lostpointercapture', () => {
    if (state.dragAction) {
        state.dragAction = null;
        request2DRedraw();
    }
});

canvas2d.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

window.addEventListener('blur', () => {
    activeTouchCount = 0;
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
    obj.shapeType = shapeType;
    if (shapeType === 'STRAIGHT') {
        obj.w = 1.0; obj.h = 2.0;
    } else if (shapeType === 'L_SHAPE') {
        obj.w = 1.5; obj.h = 1.5;
    } else {
        obj.w = 1.0; obj.h = 2.0;
    }
    obj.label = `階段 (${shapeType === 'STRAIGHT' ? '直階段' : (shapeType === 'L_SHAPE' ? 'かね折れL型' : '折り返しU型')}・${obj.direction === 'UP' ? '上る' : '降りる'})`;
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    showToast(`階段タイプを変更しました`);
}

function updateSelectedStairDir(dir) {
    const obj = findSelectedObject();
    if (!obj || state.selectedItem.kind !== 'stair') return;
    obj.direction = dir;
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
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    showToast(`階段段数を ${steps}段 に変更しました`);
}

function rotateSelectedStair() {
    const obj = findSelectedObject();
    if (!obj || state.selectedItem.kind !== 'stair') return;
    const tmp = obj.w;
    obj.w = obj.h;
    obj.h = tmp;
    obj.rotation = ((obj.rotation || 0) + 90) % 360;
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    showToast('階段を90°回転しました');
}

function renameSelectedRoom() {
    const rm = findSelectedObject();
    if (!rm) return;
    const presets = ['LDK', 'リビング', 'ダイニング', 'キッチン', '主寝室', '洋室', '子供室', '書斎', '和室', '玄関', '玄関土間', 'ホール', '廊下', '階段', '洗面室', '脱衣室', '浴室', 'トイレ', 'WIC', 'パントリー', '納戸', '小上り', '中庭', '吹抜', 'バルコニー'];
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

function applyRoomNameChip(label, type) {
    const rm = findSelectedObject();
    if (!rm || !state.selectedItem || state.selectedItem.kind !== 'room') return;
    rm.customName = label;
    rm.name = label;
    if (type) rm.type = type;
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
    showToast(`部屋名を「${label}」に設定しました`);
}

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

function rotateSelectedFixture() {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'fixture') return;
    const fx = fl.fixtures.find(f => f.id === state.selectedItem.id);
    if (!fx) return;

    const tmp = fx.w; fx.w = fx.h; fx.h = tmp;
    const tmpMm = fx.wMm; fx.wMm = fx.dMm; fx.dMm = tmpMm;
    fx.rot = ((fx.rot || 0) + 90) % 360;

    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
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
    fx.label = `I型キッチン (${fx.wMm / 10}×${fx.dMm / 10}cm)`;
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
    if (newX) { fx.fxData.lWidthX = newX; fx.wMm = newX; fx.w = +(newX / pitch).toFixed(3); }
    if (newY) { fx.fxData.lWidthY = newY; fx.dMm = newY; fx.h = +(newY / pitch).toFixed(3); }
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
    if (newW) { fx.wMm = newW; fx.w = +(newW / pitch).toFixed(3); }
    if (newD) { fx.dMm = newD; fx.h = +(newD / pitch).toFixed(3); }
    if (newH) { fx.hMm = newH; }
    fx.label = `アイランド (${fx.wMm}×${fx.dMm}mm)`;
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
        fx.label = `アイランド (2550×900mm)`;
    }
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
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
        fl.stairs = (fl.stairs || []).filter(s => s.id !== id);
        fl.fixtures = (fl.fixtures || []).filter(f => f.id !== id);
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
        placeStairPresetAt('U_SHAPE', snappedX, snappedY);
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

function openStairModal() {
    const modal = document.getElementById('stairCreateModal');
    if (!modal) return;
    setStairModalDir(state.stairDirection || 'UP');
    const wEl = document.getElementById('modalStairWidth');
    if (wEl) wEl.value = state.stairWidthMm || 910;
    const tEl = document.getElementById('modalStairTurn');
    if (tEl) tEl.value = state.stairTurnType || 'turn_3';
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
        btnUp.className = 'py-2.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-1.5 transition bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-900/40';
        btnDown.className = 'py-2.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-1.5 transition bg-slate-800 text-slate-300 border-slate-700 hover:text-white';
    } else {
        btnDown.className = 'py-2.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-1.5 transition bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-900/40';
        btnUp.className = 'py-2.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-1.5 transition bg-slate-800 text-slate-300 border-slate-700 hover:text-white';
    }
}

function confirmCreateStairFromModal() {
    const widthMm = parseInt(document.getElementById('modalStairWidth')?.value || '910', 10) || 910;
    const turnType = document.getElementById('modalStairTurn')?.value || 'turn_3';
    const dir = state.stairDirection || 'UP';

    createStairFromPoints(state.stairDrawingPoints, widthMm, dir, turnType);
    closeStairModal();
    state.stairDrawingPoints = [];
    state.stairTempCurPoint = null;
    if (typeof renderSubToolbar === 'function') renderSubToolbar();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast('階段を作成しました');
}

function createStairFromPoints(pts, widthMm, dir, turnType) {
    if (!pts || pts.length < 2) return;
    const fl = state.floors[state.currentFloor];
    const pitch = state.modulePitch || 910;
    const widthP = +(widthMm / pitch).toFixed(3);

    const segCount = pts.length - 1;
    let shapeType = 'STRAIGHT';
    if (segCount === 2) shapeType = 'L_SHAPE';
    else if (segCount >= 3) shapeType = 'U_SHAPE';

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
        steps: 14,
        treadMm: 220,
        riserMm: 200,
        label: `階段 (${shapeType === 'STRAIGHT' ? '直階段' : (shapeType === 'L_SHAPE' ? 'かね折れL型' : '折り返しU型')}・${dir === 'UP' ? '上る' : '降りる'})`
    };

    fl.stairs = fl.stairs || [];
    fl.stairs.push(newStair);
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
    const type = state.stairPresetType || presetType || 'STRAIGHT';
    const rot = state.subStairRot || 0;
    const dir = state.subStairDirection || 'UP';
    const turnSpec = turnSpecParam || state.stairTurnSpec || 'turn_3';
    const widthMm = state.stairWidthMm || 910;
    const pitch = state.modulePitch || 910;
    const widthP = +(widthMm / pitch).toFixed(3);

    // 階段種別に応じた幅・奥行きの設計
    let w = widthP;
    let h = +(widthP * 2).toFixed(3);
    if (type === 'STRAIGHT') {
        w = widthP;
        h = +(widthP * 2).toFixed(3);
    } else if (type === 'L_SHAPE') {
        w = +(widthP * 1.5).toFixed(3);
        h = +(widthP * 1.5).toFixed(3);
    } else if (type === 'U_SHAPE') {
        w = +(widthP * 2).toFixed(3);
        h = +(widthP * 1.5).toFixed(3);
    }

    if (rot === 90 || rot === 270) {
        const tmp = w; w = h; h = tmp;
    }

    const pts = [
        { x: x, y: y },
        { x: x + w, y: y },
        { x: x + w, y: y + h },
        { x: x, y: y + h }
    ];

    const fl = state.floors[state.currentFloor];
    const newStair = {
        id: uid(),
        kind: 'stair',
        type: 'STAIR',
        category: 'STAIR',
        shapeType: type,
        points: pts,
        x: x,
        y: y,
        w: w,
        h: h,
        widthMm: widthMm,
        direction: dir,
        turnType: turnSpec,
        stairStyle: state.stairStyle || 'box',
        stairHandrail: state.stairHandrail || 'both',
        handrail: state.stairHandrail || 'both',
        steps: 14,
        treadMm: 220,
        riserMm: 200,
        label: `階段 (${type === 'STRAIGHT' ? '直階段' : (type === 'L_SHAPE' ? 'かね折れL型' : '折り返しU型')}・${dir === 'UP' ? '上る' : '降りる'})`
    };

    if (!fl.stairs) fl.stairs = [];
    fl.stairs.push(newStair);
    state.selectedItem = { kind: 'stair', id: newStair.id, floor: state.currentFloor };

    saveHistorySnapshot();
    if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast(`階段（${type === 'STRAIGHT' ? '直階段' : (type === 'L_SHAPE' ? 'かね折れ' : '折り返し')}・W${widthMm}mm）を配置しました`);
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
