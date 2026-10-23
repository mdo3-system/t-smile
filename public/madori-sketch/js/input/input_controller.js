/**
 * Smile MadoriSketch - Unified Input, Pointer & Manipulation Controller
 * (Single Responsibility Principle Refactoring)
 */

// Ensure canvas2d reference
if (typeof canvas2d === 'undefined' || !canvas2d) {
    var canvas2d = document.getElementById('canvas2d');
}
// ============================================================================
// OVERLAP PREVENTION & SMART PLACEMENT FOR WINDOWS / DOORS
// ============================================================================

function checkOpeningOverlap(floorNum, x, y, orient, widthP, excludeId = null) {
    const fl = state.floors[floorNum];
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

        // Overlap with 0.02P tolerance
        if (Math.max(minA, minB) < Math.min(maxA, maxB) - 0.02) {
            return true;
        }
    }
    return false;
}

function snapPointToNearestWallEdge(wx, wy) {
    const fl = state.floors[state.currentFloor];
    let bestEdge = null;
    let minDist = 1.0; // 吸着許容範囲（約1マス以内）

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

    return bestEdge || { x: snapP(wx), y: snapP(wy), orient: 'h' };
}


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

function setSubDoorFit(fitId) {
    state.subDoorFit = fitId;
    if (fitId === 'hiraki' || fitId === 'katabiki' || fitId === 'genkan_slide') {
        state.subDoorLeafCount = 1;
    } else if (fitId === 'hikichigai' && state.subDoorLeafCount === 1) {
        state.subDoorLeafCount = 2;
    } else if (fitId === 'hikiwake' && state.subDoorLeafCount % 2 !== 0) {
        state.subDoorLeafCount = 2;
    }
    renderSubToolbar();
}

function placeOpeningAt(wx, wy) {
    const fl = state.floors[state.currentFloor];
    const pitch = state.modulePitch || 910;
    const isWin = state.subOpeningCategory === 'window';
    let widthMm, heightMm, sillMm, widthP, label, leafCount, leafWidthMm, doorFit;

    if (isWin) {
        widthMm = state.subWindowWidth || 1650;
        heightMm = state.subWindowHeight || 1100;
        const topMm = state.subWindowTopMm || 2000;
        sillMm = state.subWindowSillMm !== undefined ? state.subWindowSillMm : Math.max(0, topMm - heightMm);
        widthP = +(widthMm / pitch).toFixed(3);
        label = `窓 (W${widthMm}×H${heightMm})`;
        doorFit = null;
        leafCount = 1;
        leafWidthMm = widthMm;
    } else {
        doorFit = state.subDoorFit || 'hikichigai';
        leafCount = state.subDoorLeafCount || 2;
        leafWidthMm = state.subDoorLeafWidth || 800;
        heightMm = state.subDoorHeight || 2000;
        sillMm = 0;
        
        let totalW = leafWidthMm * leafCount;
        if (doorFit === 'hiraki' || doorFit === 'katabiki' || doorFit === 'genkan_slide') {
            totalW = leafWidthMm;
            leafCount = 1;
        }
        widthMm = totalW;
        widthP = +(widthMm / pitch).toFixed(3);
        
        const styleObj = (window.DOOR_SPECS && window.DOOR_SPECS.styles) ? window.DOOR_SPECS.styles.find(s => s.id === doorFit) : null;
        const fitLabel = styleObj ? styleObj.label : '建具';
        label = `${fitLabel} ${leafCount}枚 (W${widthMm}×H${heightMm})`;
    }

    // widthP 確定後にスナップ位置を探索
    const target = snapPointToNearestWallEdge(wx, wy);

    // 重複チェック
    if (checkOpeningOverlap(state.currentFloor, target.x, target.y, target.orient, widthP, null)) {
        showToast('同じ壁面上の既存の建具・窓と重なるため配置できません', true);
        return;
    }

    const newOp = {
        id: uid(),
        category: isWin ? 'window' : 'door',
        type: isWin ? 'WINDOW' : (doorFit === 'genkan_slide' ? 'ENTRANCE_DOOR' : (doorFit === 'hiraki' ? 'SWING_DOOR' : 'SLIDING_DOOR')),
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
    renderPropertyInspector();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast(`${label} を配置しました（タップでサイズ変更・ドラッグ移動可能）`);
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
        if (!op.flip) {
            op.flip = true;
        } else {
            const nextOrient = op.orient === 'h' ? 'v' : 'h';
            if (!checkOpeningOverlap(state.currentFloor, op.x, op.y, nextOrient, op.widthP, op.id)) {
                op.flip = false;
                op.orient = nextOrient;
            } else {
                op.flip = false;
            }
        }
        saveHistorySnapshot();
        showToast('建具の開閉方向・向きを切り替えました');
    }
}

// ============================================================================
// POINTER EVENTS (STYLUS PEN, TOUCH, SELECTION, MOVING & RESIZING)
// ============================================================================

function updatePointerStatusBadge(e) {
    const badge = document.getElementById('pointerBadge');
    const txt = document.getElementById('pointerStatusText');
    const pType = e.pointerType || 'mouse';
    const press = e.pressure ? e.pressure.toFixed(2) : '0.50';
    if (pType === 'pen') {
        badge.className = 'inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse';
        txt.textContent = `ペン入力 (${state.gridDivisions}分割・筆圧:${press})`;
    } else if (pType === 'touch') {
        badge.className = 'inline-block w-2.5 h-2.5 rounded-full bg-sky-400';
        txt.textContent = state.stylusOnlyMode ? '指タッチ: 画面移動' : `タッチ入力 (${state.gridDivisions}分割)`;
    } else {
        badge.className = 'inline-block w-2.5 h-2.5 rounded-full bg-emerald-400';
        txt.textContent = `${state.gridDivisions}分割グリッド (${(state.modulePitch/state.gridDivisions).toFixed(0)}mm)`;
    }
}

canvas2d.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { canvas2d.setPointerCapture(e.pointerId); } catch (_) {}
    updatePointerStatusBadge(e);

    const rect = canvas2d.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldPos = screenToWorldP(sx, sy);
    const snappedX = snapP(worldPos.x);
    const snappedY = snapP(worldPos.y);

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

    // Even when in 'opening' or 'fixture' tool, if user taps an already-selected item's handle or body, let them move/resize it
    if (state.activeTool === 'select' || state.activeTool === 'opening' || state.activeTool === 'fixture') {
        if (tryStartSelectOrModifyInteraction(worldPos.x, worldPos.y, state.activeTool !== 'select')) {
            return;
        }
    }

    if (state.activeTool === 'room') {
        state.dragAction = {
            type: 'room',
            startX: snappedX,
            startY: snappedY,
            curX: snappedX + minStep * 2,
            curY: snappedY + minStep * 2
        };
        request2DRedraw();
    } else if (state.activeTool === 'pillar' || (state.activeTool === 'wall' && state.subWallType === 'pillar')) {
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
        // 壁の作成（PC: 端点-端点クリックで1本生成して完了 / iPad: ドラッグで1本生成）
        if (state.wallClickStart) {
            const x1 = state.wallClickStart.x;
            const y1 = state.wallClickStart.y;
            // 直交スナップ（水平または垂直）
            const dx = Math.abs(snappedX - x1);
            const dy = Math.abs(snappedY - y1);
            const x2 = dx >= dy ? snappedX : x1;
            const y2 = dx >= dy ? y1 : snappedY;

            if (x1 !== x2 || y1 !== y2) {
                fl.walls.push({
                    id: uid(),
                    x1: x1,
                    y1: y1,
                    x2: x2,
                    y2: y2,
                    wallType: 'auto'
                });
                saveHistorySnapshot();
                if (typeof triggerAutoRoomDetection === 'function') triggerAutoRoomDetection();
                showToast('壁を作成しました');
            }
            // 連続線にはせず、ここでリセット完了！次の壁はまた新しい始点から！
            state.wallClickStart = null;
            state.dragAction = null;
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
    } else if (state.activeTool === 'stair') {
        // 階段の配置処理（定型ポン置き または 自由パス入力）
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
        const cat = state.subFixtureCategory || 'KITCHEN';
        const pitch = state.modulePitch || 910;
        let wMm, dMm, hMm, wP, hP, label, fxData = {};

        if (cat === 'KITCHEN') {
            const kType = state.subKitchenType || 'I';
            hMm = state.subKitchenHeight || 850;
            if (kType === 'I') {
                wMm = state.subKitchenIWidth || 2550;
                dMm = state.subKitchenIDepth || 650;
                label = `I型キッチン (${wMm/10}×${dMm/10}cm)`;
            } else if (kType === 'L') {
                wMm = state.subKitchenLXWidth || 2550;
                dMm = state.subKitchenLYWidth || 1950;
                label = `L型キッチン (${wMm/10}×${dMm/10}cm)`;
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
        } else if (cat === 'STANDALONE_COL') {
            const newPillar = { id: uid(), x: snappedX, y: snappedY, sizeMm: 150 };
            fl.pillars.push(newPillar);
            state.selectedItem = { kind: 'pillar', id: newPillar.id, floor: state.currentFloor };
            saveHistorySnapshot();
            showToast('独立柱（ポーチ・バルコニー脚）を配置しました');
            return;
        } else {
            const ft = (window.FIXTURE_TYPES && window.FIXTURE_TYPES[cat]) || { wP: 1.0, hP: 1.0, label: '設備' };
            wP = ft.wP;
            hP = ft.hP;
            wMm = Math.round(wP * pitch);
            dMm = Math.round(hP * pitch);
            hMm = 800;
            label = ft.label;
        }

// 🧱 設備・家具のインテリジェント壁面自動吸着スナップ（ARCHITREND ZERO準拠）
// 壁芯（グリッド中心）ではなく、最も近い壁の内側仕上げ面（壁芯 - 壁厚半分）に自動吸着
function findNearestWallForFixture(curX, curY, wP, hP) {
    const fl = state.floors[state.currentFloor];
    if (!fl) return null;
    const wallThickM = 0.13; // 130mm壁厚
    const scaleP = (state.modulePitch || 910) / 1000;
    const halfWallP = +((wallThickM / 2) / scaleP).toFixed(3); // 壁芯から仕上げ面までのオフセット（約0.07マス）
    const snapDistanceThreshold = 1.35; // 吸着検知距離（マス単位）

    let bestSnap = null;
    let minDistance = snapDistanceThreshold;

    // 1. fl.walls（手動壁・検出壁）を探索
    if (fl.walls && fl.walls.length > 0) {
        fl.walls.forEach(wl => {
            const isHoriz = Math.abs(wl.y1 - wl.y2) < 0.05;
            if (isHoriz) {
                const minWlX = Math.min(wl.x1, wl.x2);
                const maxWlX = Math.max(wl.x1, wl.x2);
                if (curX + wP >= minWlX - 0.4 && curX <= maxWlX + 0.4) {
                    const distToWall = Math.abs(curY - wl.y1);
                    if (distToWall < minDistance) {
                        minDistance = distToWall;
                        if (curY >= wl.y1) {
                            // 壁の下側に配置（壁の南側仕上げ面に吸着）
                            bestSnap = { x: curX, y: +(wl.y1 + halfWallP).toFixed(3), side: 'top', wall: wl, rot: 0 };
                        } else {
                            // 壁の上側に配置（壁の北側仕上げ面に吸着）
                            bestSnap = { x: curX, y: +(wl.y1 - halfWallP - hP).toFixed(3), side: 'bottom', wall: wl, rot: 180 };
                        }
                    }
                }
            } else {
                const minWlY = Math.min(wl.y1, wl.y2);
                const maxWlY = Math.max(wl.y1, wl.y2);
                if (curY + hP >= minWlY - 0.4 && curY <= maxWlY + 0.4) {
                    const distToWall = Math.abs(curX - wl.x1);
                    if (distToWall < minDistance) {
                        minDistance = distToWall;
                        if (curX >= wl.x1) {
                            // 壁の右側に配置（壁の東側仕上げ面に吸着）
                            bestSnap = { x: +(wl.x1 + halfWallP).toFixed(3), y: curY, side: 'left', wall: wl, rot: 90 };
                        } else {
                            // 壁の左側に配置（壁の西側仕上げ面に吸着）
                            bestSnap = { x: +(wl.x1 - halfWallP - wP).toFixed(3), y: curY, side: 'right', wall: wl, rot: 270 };
                        }
                    }
                }
            }
        });
    }

    // 2. fl.rooms の境界線も探索
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
                        const dist = Math.abs(curY - ed.y);
                        if (dist < minDistance) {
                            minDistance = dist;
                            if (ed.side === 'top') {
                                bestSnap = { x: curX, y: +(ed.y + halfWallP).toFixed(3), side: 'top', rot: 0 };
                            } else {
                                bestSnap = { x: curX, y: +(ed.y - halfWallP - hP).toFixed(3), side: 'bottom', rot: 180 };
                            }
                        }
                    }
                } else {
                    if (curY + hP >= ed.y1 - 0.4 && curY <= ed.y2 + 0.4) {
                        const dist = Math.abs(curX - ed.x);
                        if (dist < minDistance) {
                            minDistance = dist;
                            if (ed.side === 'left') {
                                bestSnap = { x: +(ed.x + halfWallP).toFixed(3), y: curY, side: 'left', rot: 90 };
                            } else {
                                bestSnap = { x: +(ed.x - halfWallP - wP).toFixed(3), y: curY, side: 'right', rot: 270 };
                            }
                        }
                    }
                }
            });
        });
    }

    return bestSnap;
}

        // 事前回転の適用
        const rot = state.subFixtureRot || 0;
        let finalWP = wP;
        let finalHP = hP;
        if (rot === 90 || rot === 270) {
            finalWP = hP;
            finalHP = wP;
        }

        // 壁面内法仕上げ面への自動吸着＆離れ寸法計算（壁芯配置の完全防止）
        let placeX = snappedX;
        let placeY = snappedY;
        const align = state.subFixtureAlign || 'center';
        const wallSnap = findNearestWallForFixture(snappedX, snappedY, finalWP, finalHP);
        if (wallSnap) {
            placeX = wallSnap.x;
            placeY = wallSnap.y;
            if (wallSnap.side === 'top' || wallSnap.side === 'bottom') {
                if (align === 'left' && wallSnap.wall) placeX = wallSnap.wall.x1 + halfWallP;
                else if (align === 'right' && wallSnap.wall) placeX = wallSnap.wall.x2 - halfWallP - finalWP;
            } else {
                if (align === 'left' && wallSnap.wall) placeY = wallSnap.wall.y1 + halfWallP;
                else if (align === 'right' && wallSnap.wall) placeY = wallSnap.wall.y2 - halfWallP - finalHP;
            }
        }

        const newFx = {
            id: uid(),
            category: cat,
            x: placeX,
            y: placeY,
            w: finalWP,
            h: finalHP,
            wMm: (rot === 90 || rot === 270) ? dMm : wMm,
            dMm: (rot === 90 || rot === 270) ? wMm : dMm,
            hMm: hMm,
            rot: rot,
            align: align,
            clearanceMm: state.subFixtureClearanceMm || 0,
            label: label,
            kHeight: fxData.kHeight || 850,
            vHeight: fxData.vHeight || 800,
            ubPattern: fxData.ubPattern || 'patternA',
            fxData: fxData
        };

        fl.fixtures.push(newFx);
        state.selectedItem = { kind: 'fixture', id: newFx.id, floor: state.currentFloor };
        saveHistorySnapshot();
        if (typeof rebuild3DScene === 'function') rebuild3DScene();
        showToast(`${label} を配置しました（タップで寸法変更・ドラッグ移動可能）`);
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
        state.dragAction = { type: 'eraser' };
    }
});

// --- Unified Hit-Test for Selecting, Moving, and Resizing Openings, Fixtures, Pillars, and Rooms ---
function tryStartSelectOrModifyInteraction(wx, wy, onlyHitExistingOfSameToolType = false) {
    const fl = state.floors[state.currentFloor];
    const selObj = findSelectedObject();
    const tol = 0.38;

    // 1. Check active selection's resize handles first
    if (selObj && state.selectedItem.floor === state.currentFloor) {
        if (state.selectedItem.kind === 'room' || state.selectedItem.kind === 'fixture' || state.selectedItem.kind === 'stair') {
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
                renderPropertyInspector();
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
                renderPropertyInspector();
                request2DRedraw();
                return true;
            }
        }
    }

    // 3b. Hit-test Dedicated Stairs (階段)
    if (!onlyHitExistingOfSameToolType || state.activeTool === 'stair') {
        const stairs = fl.stairs || [];
        for (let i = stairs.length - 1; i >= 0; i--) {
            const st = stairs[i];
            if (wx >= st.x && wx <= st.x + st.w && wy >= st.y && wy <= st.y + st.h) {
                state.selectedItem = { kind: 'stair', id: st.id, floor: state.currentFloor };
                state.dragAction = {
                    type: 'move_box',
                    target: st,
                    offsetX: wx - st.x,
                    offsetY: wy - st.y
                };
                renderPropertyInspector();
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
            renderPropertyInspector();
            request2DRedraw();
            return true;
        }
    }

    // 5. Hit-test Rooms
    for (let i = fl.rooms.length - 1; i >= 0; i--) {
        const rm = fl.rooms[i];
        if (wx >= rm.x && wx <= rm.x + rm.w && wy >= rm.y && wy <= rm.y + rm.h) {
            state.selectedItem = { kind: 'room', id: rm.id, floor: state.currentFloor };
            state.dragAction = {
                type: 'move_box',
                target: rm,
                offsetX: wx - rm.x,
                offsetY: wy - rm.y
            };
            renderPropertyInspector();
            request2DRedraw();
            return true;
        }
    }

    state.selectedItem = null;
    renderPropertyInspector();
    request2DRedraw();
    return false;
}

canvas2d.addEventListener('pointermove', (e) => {
    if (!state.dragAction) return;
    e.preventDefault();
    updatePointerStatusBadge(e);

    const rect = canvas2d.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldPos = screenToWorldP(sx, sy);
    const snappedX = snapP(worldPos.x);
    const snappedY = snapP(worldPos.y);
    const minSize = Math.max(0.25, 1 / state.gridDivisions);

    const drag = state.dragAction;

    if (drag.type === 'pan') {
        const dx = (sx - drag.startSX) / state.cam2d.zoom;
        const dy = (sy - drag.startSY) / state.cam2d.zoom;
        state.cam2d.x = drag.origCamX - dx;
        state.cam2d.y = drag.origCamY - dy;
        request2DRedraw();
    } else if (drag.type === 'room') {
        drag.curX = snappedX;
        drag.curY = snappedY;
        if (drag.curX === drag.startX) drag.curX += minSize;
        if (drag.curY === drag.startY) drag.curY += minSize;
        request2DRedraw();
    } else if (drag.type === 'wall') {
        const dx = Math.abs(snappedX - drag.startX);
        const dy = Math.abs(snappedY - drag.startY);
        if (dx >= dy) {
            drag.curX = snappedX;
            drag.curY = drag.startY;
        } else {
            drag.curX = drag.startX;
            drag.curY = snappedY;
        }
        request2DRedraw();
    } else if (drag.type === 'pen') {
        drag.stroke.points.push({ x: worldPos.x, y: worldPos.y, p: e.pressure || 0.5 });
        request2DRedraw();
    } else if (drag.type === 'eraser') {
        eraseAtPoint(worldPos.x, worldPos.y);
    } else if (drag.type === 'move_box') {
        const t = drag.target;
        t.x = snapP(worldPos.x - drag.offsetX);
        t.y = snapP(worldPos.y - drag.offsetY);
        request2DRedraw();
        rebuild3DScene();
        renderPropertyInspector();
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
        rebuild3DScene();
        renderPropertyInspector();
    } else if (drag.type === 'move_opening') {
        const op = drag.opening;
        const candidate = snapPointToNearestWallEdge(worldPos.x, worldPos.y);
        if (!checkOpeningOverlap(state.currentFloor, candidate.x, candidate.y, candidate.orient, op.widthP, op.id)) {
            op.x = candidate.x;
            op.y = candidate.y;
            op.orient = candidate.orient;
            request2DRedraw();
            rebuild3DScene();
        }
    } else if (drag.type === 'resize_opening') {
        const op = drag.opening;
        const distFromCenter = op.orient === 'h'
            ? Math.abs(snappedX - op.x)
            : Math.abs(snappedY - op.y);
        const newW = Math.max(0.33, Math.min(4.0, snapP(distFromCenter * 2)));
        if (!checkOpeningOverlap(state.currentFloor, op.x, op.y, op.orient, newW, op.id)) {
            op.widthP = newW;
            request2DRedraw();
            rebuild3DScene();
            renderPropertyInspector();
        }
    } else if (drag.type === 'move_pillar') {
        drag.pillar.x = snappedX;
        drag.pillar.y = snappedY;
        request2DRedraw();
        rebuild3DScene();
    }
});

canvas2d.addEventListener('pointerup', () => {
    if (!state.dragAction) return;
    const drag = state.dragAction;
    const fl = state.floors[state.currentFloor];

    if (drag.type === 'room') {
        const x = Math.min(drag.startX, drag.curX);
        const y = Math.min(drag.startY, drag.curY);
        const w = Math.abs(drag.curX - drag.startX);
        const h = Math.abs(drag.curY - drag.startY);
        if (w >= 0.25 && h >= 0.25) {
            const newRoom = {
                id: uid(),
                type: state.subRoomType,
                x, y, w, h,
                customName: ROOM_TYPES[state.subRoomType].label
            };
            fl.rooms.push(newRoom);
            state.selectedItem = { kind: 'room', id: newRoom.id, floor: state.currentFloor };
            saveHistorySnapshot();
            showToast(`${newRoom.customName} (${(w * h / 2).toFixed(1)}帖) を作成しました`);
        }
    } else if (drag.type === 'wall') {
        if (drag.startX !== drag.curX || drag.startY !== drag.curY) {
            fl.walls.push({
                id: uid(),
                x1: drag.startX,
                y1: drag.startY,
                x2: drag.curX,
                y2: drag.curY,
                wallType: state.subWallType || 'exterior'
            });
            state.wallClickStart = null;
            saveHistorySnapshot();
            if (typeof triggerAutoRoomDetection === 'function') triggerAutoRoomDetection();
            if (typeof rebuild3DScene === 'function') rebuild3DScene();
            showToast('壁を作成しました');
            request2DRedraw();
        }
    } else if (drag.type !== 'pan') {
        saveHistorySnapshot();
    }

    state.dragAction = null;
    renderSubToolbar();
    renderPropertyInspector();
    request2DRedraw();
});

canvas2d.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom2D(e.deltaY < 0 ? 1.1 : 0.9);
}, { passive: false });

// --- Selection & Eraser Helpers ---
// (findSelectedObject is globally provided by /madori-sketch/js/core/app_state.js)


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
    renderPropertyInspector();
    request2DRedraw();
    showToast(`階段タイプを「${shapeType === 'STRAIGHT' ? '直階段' : (shapeType === 'L_SHAPE' ? 'かね折れ' : '折り返し')}」に変更しました`);
}

function updateSelectedStairDir(dir) {
    const obj = findSelectedObject();
    if (!obj || state.selectedItem.kind !== 'stair') return;
    obj.direction = dir;
    obj.label = `階段 (${obj.shapeType === 'STRAIGHT' ? '直階段' : (obj.shapeType === 'L_SHAPE' ? 'かね折れL型' : '折り返しU型')}・${dir === 'UP' ? '上る' : '降りる'})`;
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    renderPropertyInspector();
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
    renderPropertyInspector();
    request2DRedraw();
    showToast(`階段段数を ${steps}段 (蹴上${obj.riserMm}mm) に変更しました`);
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
    renderPropertyInspector();
    request2DRedraw();
    showToast(`階段を90°回転しました`);
}

window.updateSelectedStairShape = updateSelectedStairShape;
window.updateSelectedStairDir = updateSelectedStairDir;
window.updateSelectedStairSteps = updateSelectedStairSteps;
window.rotateSelectedStair = rotateSelectedStair;

function renameSelectedRoom() {
    const rm = findSelectedObject();
    if (!rm) return;
    const presets = ['LDK', '主寝室', '洋室A', '洋室B', '子供室', '書斎', '和室', 'パントリー', 'WIC', '玄関ホール', '玄関ポーチ', 'ビルトインガレージ', '吹抜', 'バルコニー'];
    const idx = presets.indexOf(rm.customName);
    rm.customName = presets[(idx + 1) % presets.length];
    if (rm.customName === '吹抜') rm.type = 'VOID';
    else if (rm.customName === 'バルコニー') rm.type = 'BALCONY';
    else if (rm.customName === '玄関ポーチ') rm.type = 'PORCH';
    saveHistorySnapshot();
    updateAllMetricsAnd3D();
    renderPropertyInspector();
    request2DRedraw();
    const isEx = isFloorAreaExcludedRoom(rm);
    showToast(`部屋名を「${rm.customName}」に変更しました${isEx ? ' (延床面積から除外)' : ''}`);
}


// ============================================================================
// 窓・建具 インスペクタ寸法変更ハンドラ群
// ============================================================================

// ============================================================================
// 住宅設備（キッチン・UB・洗面台）寸法更新ハンドラ群
// ============================================================================
function rotateSelectedFixture() {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'fixture') return;
    const fx = fl.fixtures.find(f => f.id === state.selectedItem.id);
    if (!fx) return;

    // 幅と高さを入れ替え
    const tmp = fx.w; fx.w = fx.h; fx.h = tmp;
    const tmpMm = fx.wMm; fx.wMm = fx.dMm; fx.dMm = tmpMm;
    fx.rot = ((fx.rot || 0) + 90) % 360;

    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    renderPropertyInspector();
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
    fx.label = `I型キッチン (${fx.wMm/10}×${fx.dMm/10}cm)`;

    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    renderPropertyInspector();
    request2DRedraw();
    showToast(`キッチン寸法を ${fx.wMm/10}cm × ${fx.dMm/10}cm に変更しました`);
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
    fx.label = `L型キッチン (${fx.wMm/10}×${fx.dMm/10}cm)`;

    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    renderPropertyInspector();
    request2DRedraw();
    showToast(`L型キッチン寸法を変更しました`);
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
    fx.label = `アイランド/ペニンシュラ (${fx.wMm}×${fx.dMm}mm)`;

    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    renderPropertyInspector();
    request2DRedraw();
    showToast(`アイランド寸法を ${fx.wMm}×${fx.dMm}mm に変更しました`);
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
        fx.label = `アイランド/ペニンシュラ (2550×900mm)`;
    }

    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    renderPropertyInspector();
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
    renderPropertyInspector();
    request2DRedraw();
    showToast(`UBサイズを ${curSize.label} に変更しました`);
}

function updateSelectedUbPattern(patId) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'fixture') return;
    const fx = fl.fixtures.find(f => f.id === state.selectedItem.id);
    if (!fx) return;

    if (!fx.fxData) fx.fxData = {};
    fx.fxData.ubPattern = patId;

    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    renderPropertyInspector();
    request2DRedraw();
    showToast(`UB出入口を ${patId === 'patternA' ? '短手出入口' : '長手出入口'} に変更しました`);
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
    renderPropertyInspector();
    request2DRedraw();
    showToast(`洗面化粧台寸法を変更しました`);
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
            showToast('幅を拡大すると隣接する建具・窓と重なるため変更できません', true);
            renderPropertyInspector();
            return;
        }
    }
    if (newHMm !== null) {
        op.heightMm = newHMm;
        if (op.heightMm >= 2000) {
            op.sillMm = 0;
        } else if (op.sillMm === 0) {
            op.sillMm = Math.max(0, 2100 - op.heightMm);
        }
    }
    op.label = `窓 (W${op.widthMm}×H${op.heightMm})`;
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    renderPropertyInspector();
    request2DRedraw();
    showToast(`窓寸法を W:${op.widthMm}mm × H:${op.heightMm}mm に変更しました`);
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
    if (fitId === 'hiraki' || fitId === 'katabiki' || fitId === 'genkan_slide') {
        op.leafCount = 1;
    } else if (fitId === 'hikichigai' && op.leafCount === 1) {
        op.leafCount = 2;
    } else if (fitId === 'hikiwake' && op.leafCount % 2 !== 0) {
        op.leafCount = 2;
    }
    recalcDoorDimensions(op);
}

function updateSelectedDoorLeafCount(count) {
    const fl = state.floors[state.currentFloor];
    if (!state.selectedItem || state.selectedItem.kind !== 'opening') return;
    const op = fl.openings.find(o => o.id === state.selectedItem.id);
    if (!op) return;

    op.leafCount = count;
    if (count === 1 && (op.doorFit === 'hikichigai' || op.doorFit === 'hikiwake')) {
        op.doorFit = 'katabiki';
    } else if (count >= 2 && op.doorFit === 'hiraki') {
        op.doorFit = 'hikichigai';
    }
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
    renderPropertyInspector();
    request2DRedraw();
}

function recalcDoorDimensions(op) {
    const pitch = state.modulePitch || 910;
    const count = op.leafCount || 1;
    const leafW = op.leafWidthMm || 800;
    
    let totalW = leafW * count;
    if (op.doorFit === 'hiraki' || op.doorFit === 'katabiki' || op.doorFit === 'genkan_slide') {
        totalW = leafW;
    }

    const nextWidthP = +(totalW / pitch).toFixed(3);
    if (!checkOpeningOverlap(state.currentFloor, op.x, op.y, op.orient, nextWidthP, op.id)) {
        op.widthMm = totalW;
        op.widthP = nextWidthP;
    } else {
        showToast('建具を拡大すると隣接する壁面要素と重なるため変更できません', true);
        renderPropertyInspector();
        return;
    }

    const styleObj = (window.DOOR_SPECS && window.DOOR_SPECS.styles) ? window.DOOR_SPECS.styles.find(s => s.id === op.doorFit) : null;
    const fitLabel = styleObj ? styleObj.label : '建具';
    op.label = `${fitLabel} ${op.leafCount}枚 (W${op.widthMm}×H${op.heightMm}mm)`;

    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    renderPropertyInspector();
    request2DRedraw();
    showToast(`建具を「${op.label}」に変更しました`);
}

function changeSelectedPillarSpec(sizeMm, shape) {
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
window.set3DFloorDisplay = function(mode) {
    state.floorDisplay3D = mode;
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
};
window.setFloorDisplay3D = window.set3DFloorDisplay;


function deleteSelectedItem() {
    if (!state.selectedItem) return;
    const fl = state.floors[state.selectedItem.floor];
    const id = state.selectedItem.id;
    const kind = state.selectedItem.kind;
    if (kind === 'room') fl.rooms = fl.rooms.filter(r => r.id !== id);
    else if (kind === 'opening') fl.openings = fl.openings.filter(o => o.id !== id);
    else if (kind === 'fixture') fl.fixtures = fl.fixtures.filter(f => f.id !== id);
    else if (kind === 'pillar') fl.pillars = fl.pillars.filter(p => p.id !== id);
    else if (kind === 'stair') {
        fl.stairs = (fl.stairs || []).filter(s => s.id !== id);
        fl.fixtures = (fl.fixtures || []).filter(f => f.id !== id);
    }

    state.selectedItem = null;
    saveHistorySnapshot();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    renderPropertyInspector();
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

    const beforeOps = fl.openings.length;
    fl.openings = fl.openings.filter(op => Math.hypot(wx - op.x, wy - op.y) > 0.5);
    if (fl.openings.length !== beforeOps) erased = true;

    const beforePillars = fl.pillars.length;
    fl.pillars = fl.pillars.filter(pl => Math.hypot(wx - pl.x, wy - pl.y) > 0.45);
    if (fl.pillars.length !== beforePillars) erased = true;

    const beforeFix = fl.fixtures.length;
    fl.fixtures = fl.fixtures.filter(fx => !(wx >= fx.x && wx <= fx.x + fx.w && wy >= fx.y && wy <= fx.y + fx.h));
    if (fl.fixtures.length !== beforeFix) erased = true;

    if (fl.stairs) {
        const beforeStairs = fl.stairs.length;
        fl.stairs = fl.stairs.filter(st => !(wx >= st.x && wx <= st.x + st.w && wy >= st.y && wy <= st.y + st.h));
        if (fl.stairs.length !== beforeStairs) erased = true;
    }

    const beforeWalls = fl.walls.length;
    fl.walls = fl.walls.filter(wl => {
        const mx = (wl.x1 + wl.x2) / 2;
        const my = (wl.y1 + wl.y2) / 2;
        return Math.hypot(wx - mx, wy - my) > 0.6;
    });
    if (fl.walls.length !== beforeWalls) erased = true;

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
        renderPropertyInspector();
        request2DRedraw();
        rebuild3DScene();
    }
}

function clearCurrentFloorStrokes() {
    const fl = state.floors[state.currentFloor];
    fl.strokes = [];
    fl.stamps = [];
    saveHistorySnapshot();
    showToast(`${state.currentFloor}F の手書き赤ペン・スタンプを消去しました`);
}


// ============================================================================
// 階段作成システム（添付資料準拠の一辺ずつ描くパス入力 ＆ モーダル ＆ 3D生成）
// ============================================================================

let stairModalCallback = null;

function setStairDrawMode(mode) {
    state.stairDrawMode = mode;
    state.stairDrawingPoints = [];
    state.stairTempCurPoint = null;
    renderSubToolbar();
    request2DRedraw();
}

function handleStairPointerDown(snappedX, snappedY, wx, wy) {
    if (state.stairDrawMode === 'preset') {
        // プリセット配置モード
        placeStairPresetAt('U_SHAPE', snappedX, snappedY);
        return;
    }

    // パス入力モード（添付資料準拠）
    if (!state.stairDrawingPoints) state.stairDrawingPoints = [];
    const pts = state.stairDrawingPoints;

    if (pts.length === 0) {
        // 1点目: 始点を追加
        pts.push({ x: snappedX, y: snappedY });
        showToast('始点を決定しました。次の角または終点をタップしてください');
    } else {
        const lastPt = pts[pts.length - 1];
        // 同じ点なら終点として確定
        if (Math.hypot(lastPt.x - snappedX, lastPt.y - snappedY) < 0.1) {
            if (pts.length >= 2) {
                openStairModal();
            } else {
                showToast('1マス以上の長さを指定してください');
            }
            return;
        }

        // 辺を追加（直交スナップ: XかYの長い方を採用）
        const dx = Math.abs(snappedX - lastPt.x);
        const dy = Math.abs(snappedY - lastPt.y);
        let nextX = snappedX, nextY = snappedY;
        if (dx >= dy) {
            nextY = lastPt.y;
        } else {
            nextX = lastPt.x;
        }

        pts.push({ x: nextX, y: nextY });

        // コの字（3辺＝4点）に達したら自動的にダイアログを開く
        if (pts.length >= 4) {
            openStairModal();
        } else {
            showToast(`${pts.length}点目を指定しました。終点をタップするか「階段作成」を押してください`);
        }
    }

    renderSubToolbar();
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
    renderSubToolbar();
    request2DRedraw();
    showToast('階段入力をキャンセルしました');
}

function openStairModal() {
    const modal = document.getElementById('stairCreateModal');
    if (!modal) return;
    setStairModalDir(state.stairDirection || 'UP');
    document.getElementById('modalStairWidth').value = state.stairWidthMm || 910;
    document.getElementById('modalStairTurn').value = state.stairTurnType || 'turn_3';
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
    if (dir === 'UP') {
        btnUp.className = 'py-2.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-1.5 transition bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-900/40';
        btnDown.className = 'py-2.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-1.5 transition bg-slate-800 text-slate-300 border-slate-700 hover:text-white';
    } else {
        btnDown.className = 'py-2.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-1.5 transition bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-900/40';
        btnUp.className = 'py-2.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-1.5 transition bg-slate-800 text-slate-300 border-slate-700 hover:text-white';
    }
}

function confirmCreateStairFromModal() {
    const widthMm = parseInt(document.getElementById('modalStairWidth').value, 10) || 910;
    const turnType = document.getElementById('modalStairTurn').value || 'turn_3';
    const dir = state.stairDirection || 'UP';

    createStairFromPoints(state.stairDrawingPoints, widthMm, dir, turnType);
    closeStairModal();
    state.stairDrawingPoints = [];
    state.stairTempCurPoint = null;
    renderSubToolbar();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast('階段を作成しました（タップして寸法変更・詳細編集可能）');
}

function createStairFromPoints(pts, widthMm, dir, turnType) {
    if (!pts || pts.length < 2) return;
    const fl = state.floors[state.currentFloor];
    const pitch = state.modulePitch || 910;
    const widthP = +(widthMm / pitch).toFixed(3);

    // 形状タイプの判定（1辺: STRAIGHT, 2辺: L_SHAPE, 3辺以上: U_SHAPE）
    const segCount = pts.length - 1;
    let shapeType = 'STRAIGHT';
    if (segCount === 2) shapeType = 'L_SHAPE';
    else if (segCount >= 3) shapeType = 'U_SHAPE';

    // バウンディングボックスの計算
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

function placeStairPreset(presetType) {
    showToast('配置したい位置をクリックしてください');
    state.stairPresetToPlace = presetType;
    state.stairDrawMode = 'preset';
    renderSubToolbar();
}

function placeStairPresetAt(presetType, x, y) {
    const type = state.stairPresetToPlace || presetType || 'U_SHAPE';
    const rot = state.subStairRot || 0;
    const dir = state.subStairDirection || 'UP';
    const turnSpec = state.stairTurnSpec || 'turn_3';
    let pts = [];

    // 回転前の基本パス (dx, dy)
    let localPts = [];
    if (type === 'STRAIGHT') {
        localPts = [{ x: 0, y: 0 }, { x: 0, y: 2.0 }];
    } else if (type === 'L_SHAPE') {
        localPts = [{ x: 0, y: 0 }, { x: 0, y: 1.5 }, { x: 1.5, y: 1.5 }];
    } else {
        // U_SHAPE (折り返し / 1坪)
        localPts = [{ x: 0, y: 0 }, { x: 0, y: 1.5 }, { x: 1.0, y: 1.5 }, { x: 1.0, y: 0 }];
    }

    // 90度単位の回転変換
    const rad = (rot * Math.PI) / 180;
    const cosR = Math.round(Math.cos(rad));
    const sinR = Math.round(Math.sin(rad));

    pts = localPts.map(p => ({
        x: x + (p.x * cosR - p.y * sinR),
        y: y + (p.x * sinR + p.y * cosR)
    }));

    createStairFromPoints(pts, state.modulePitch || 910, dir, turnSpec);
    state.stairPresetToPlace = null;
    saveHistorySnapshot();
    renderPropertyInspector();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast(`階段 (${type === 'STRAIGHT' ? '直階段' : (type === 'L_SHAPE' ? 'かね折れ' : '折り返し')}) を配置しました`);
}

function updateStairProp(id, prop, val) {
    const fl = state.floors[state.currentFloor];
    const fx = fl.fixtures.find(f => f.id === id);
    if (!fx) return;
    fx[prop] = val;
    fx.label = `階段 (${fx.shapeType === 'STRAIGHT' ? '直階段' : (fx.shapeType === 'L_SHAPE' ? 'かね折れL型' : '折り返しU型')}・${fx.direction === 'UP' ? '上る' : '降りる'})`;
    saveHistorySnapshot();
    renderPropertyInspector();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast('階段の設定を更新しました');
}


// 階段関数を window に公開（インライン onclick / モーダル対応）
window.setStairDrawMode = setStairDrawMode;
window.handleStairPointerDown = handleStairPointerDown;
window.finishStairPathInput = finishStairPathInput;
window.cancelStairDrawing = cancelStairDrawing;
window.openStairModal = openStairModal;
window.closeStairModal = closeStairModal;
window.setStairModalDir = setStairModalDir;
window.confirmCreateStairFromModal = confirmCreateStairFromModal;
window.createStairFromPoints = createStairFromPoints;
window.placeStairPreset = placeStairPreset;
window.placeStairPresetAt = placeStairPresetAt;
window.updateStairProp = updateStairProp;


// Global Window Export for Backward Compatibility
if (typeof window !== 'undefined') {
    window.checkOpeningOverlap = checkOpeningOverlap;
    window.snapPointToNearestWallEdge = snapPointToNearestWallEdge;
    window.updateWindowPresetWidth = updateWindowPresetWidth;
    window.updateWindowPresetHeight = updateWindowPresetHeight;
    window.updateWindowTopHeight = updateWindowTopHeight;
    window.updateWindowSillHeight = updateWindowSillHeight;
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
    window.changeSelectedPillarSpec = changeSelectedPillarSpec;
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
