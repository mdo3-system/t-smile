/**
 * Smile MadoriSketch - 2D Architectural Canvas Renderer
 * (Single Responsibility Principle Refactoring)
 */

let canvas2d = document.getElementById('canvas2d');
let ctx = canvas2d ? canvas2d.getContext('2d') : null;

// Ensure canvas2d & ctx availability after DOM ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!canvas2d) canvas2d = document.getElementById('canvas2d');
        if (canvas2d && !ctx) ctx = canvas2d.getContext('2d');
    });
}
// ============================================================================


function snapP(val) {
    const div = state.gridDivisions || 2;
    return Math.round(val * div) / div;
}

function screenToWorldP(sx, sy) {
    const rect = canvas2d.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    return {
        x: state.cam2d.x + (sx - cx) / state.cam2d.zoom,
        y: state.cam2d.y + (sy - cy) / state.cam2d.zoom
    };
}

function worldPToScreen(wx, wy) {
    const rect = canvas2d.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    return {
        x: cx + (wx - state.cam2d.x) * state.cam2d.zoom,
        y: cy + (wy - state.cam2d.y) * state.cam2d.zoom
    };
}

function zoom2D(factor) {
    state.cam2d.zoom = Math.max(18, Math.min(120, state.cam2d.zoom * factor));
    request2DRedraw();
}

function reset2DCamera() {
    state.cam2d.x = 3.2;
    state.cam2d.y = 3.2;
    const rect = canvas2d.getBoundingClientRect();
    state.cam2d.zoom = Math.min(rect.width, rect.height) / 10.5;
    if (state.cam2d.zoom < 26) state.cam2d.zoom = 40;
    request2DRedraw();
}


function draw2DCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas2d.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    if (canvas2d.width !== Math.floor(rect.width * dpr) || canvas2d.height !== Math.floor(rect.height * dpr)) {
        canvas2d.width = Math.floor(rect.width * dpr);
        canvas2d.height = Math.floor(rect.height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;

    // 1. Dark Blueprint Background
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, W, H);

    // 2. Architectural Grid & 1..6 Subdivision Lines
    drawGrid2D(W, H);

    // 3. Lower Floor Onion Skin
    if (state.onionSkin) {
        const lowerFloorNum = state.currentFloor > 1 ? state.currentFloor - 1 : 2;
        if (state.floors[lowerFloorNum]) {
            drawFloorOnionSkin(state.floors[lowerFloorNum], lowerFloorNum);
        }
    }

    const fl = state.floors[state.currentFloor];

    // 4a. Rooms (Unified Walls without corner column protrusions)
    fl.rooms.forEach(rm => drawRoom2D(rm));

    // 4b. Custom Wall Segments
    fl.walls.forEach(wl => drawWallSegment2D(wl));

    // 4c. Standalone Pillars (独立柱)
    fl.pillars.forEach(pl => drawStandalonePillar2D(pl));

    // 4d. Fixtures (Kitchen, UB, etc.)
    fl.fixtures.forEach(fx => drawFixture2D(fx));

    // 4d-2. Dedicated Architectural Stairs (本格建築階段: 段数・ステップ・昇降矢印・踊り場)
    if (fl.stairs && fl.stairs.length) {
        fl.stairs.forEach(st => drawStair2D(st));
    }

    // 4e. Openings (Doors & Windows)
    fl.openings.forEach(op => drawOpening2D(op));

    // 4f. Automatic Exterior Dimensions
    drawAutoDimensions2D(fl);

    // 4g. Redline Pen & Stamps
    fl.strokes.forEach(st => drawStroke2D(st));
    fl.stamps.forEach(sp => drawStamp2D(sp));

    // 設備ツール選択時のリアルタイムホバープレビュー（赤点吸着点 ＆ 離れ寸法線）
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

    // 独立柱ツール選択時のホバープレビュー描画
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
    }

    // 5. Active Drag Preview
    if (state.dragAction) {
        drawDragPreview2D(state.dragAction);
    }

    // 6. Selection & Resize Handles for Selected Room / Fixture / Opening / Pillar
    if (state.selectedItem && state.selectedItem.floor === state.currentFloor) {
        drawSelectionHandles2D();
    }

    ctx.restore();
}

function drawGrid2D(W, H) {
    const topLeft = screenToWorldP(0, 0);
    const botRight = screenToWorldP(W, H);
    const startX = Math.floor(topLeft.x) - 1;
    const endX = Math.ceil(botRight.x) + 1;
    const startY = Math.floor(topLeft.y) - 1;
    const endY = Math.ceil(botRight.y) + 1;

    const div = state.gridDivisions || 2;

    // Draw Subdivision Grid Lines (2分割, 3分割, 4分割, 5分割, 6分割)
    if (div > 1 && state.cam2d.zoom >= 24) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        for (let x = startX; x <= endX; x++) {
            for (let k = 1; k < div; k++) {
                const sx = worldPToScreen(x + k / div, 0).x;
                ctx.moveTo(sx, 0);
                ctx.lineTo(sx, H);
            }
        }
        for (let y = startY; y <= endY; y++) {
            for (let k = 1; k < div; k++) {
                const sy = worldPToScreen(0, y + k / div).y;
                ctx.moveTo(0, sy);
                ctx.lineTo(W, sy);
            }
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Main 1P (910mm / 1000mm) Grid Lines
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = startX; x <= endX; x++) {
        const sx = worldPToScreen(x, 0).x;
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, H);
    }
    for (let y = startY; y <= endY; y++) {
        const sy = worldPToScreen(0, y).y;
        ctx.moveTo(0, sy);
        ctx.lineTo(W, sy);
    }
    ctx.stroke();

    // Origin Axis Highlight
    const orig = worldPToScreen(0, 0);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(orig.x, 0); ctx.lineTo(orig.x, H);
    ctx.moveTo(0, orig.y); ctx.lineTo(W, orig.y);
    ctx.stroke();
}

function drawFloorOnionSkin(floorData, floorNum) {
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
}

function drawRoom2D(rm) {
    const rt = ROOM_TYPES[rm.type] || ROOM_TYPES.LDK;
    const p1 = worldPToScreen(rm.x, rm.y);
    const wPx = rm.w * state.cam2d.zoom;
    const hPx = rm.h * state.cam2d.zoom;

    ctx.save();
    ctx.fillStyle = rt.color2d;
    ctx.globalAlpha = rm.type === 'VOID' ? 0.65 : 0.92;
    ctx.fillRect(p1.x, p1.y, wPx, hPx);
    ctx.globalAlpha = 1.0;

    // Floor Pattern Details
    if (rt.floorType === 'wood' && state.cam2d.zoom > 28) {
        ctx.strokeStyle = 'rgba(180, 83, 9, 0.14)';
        ctx.lineWidth = 1;
        const stepPx = state.cam2d.zoom * 0.33;
        ctx.beginPath();
        for (let y = p1.y + stepPx; y < p1.y + hPx; y += stepPx) {
            ctx.moveTo(p1.x, y);
            ctx.lineTo(p1.x + wPx, y);
        }
        ctx.stroke();
    } else if (rt.floorType === 'tatami') {
        ctx.strokeStyle = 'rgba(22, 101, 52, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(p1.x + 4, p1.y + 4, wPx - 8, hPx - 8);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y + hPx / 2);
        ctx.lineTo(p1.x + wPx, p1.y + hPx / 2);
        ctx.stroke();
    } else if (rm.type === 'VOID') {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p1.x + wPx, p1.y + hPx);
        ctx.moveTo(p1.x + wPx, p1.y); ctx.lineTo(p1.x, p1.y + hPx);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Unified Continuous Wall Border (No separate corner column squares on walls)
    if (rt.hasWall) {
        const wallThickPx = Math.max(5, state.cam2d.zoom * 0.15);
        ctx.strokeStyle = rm.type === 'BALCONY' ? '#475569' : '#1e293b';
        ctx.lineWidth = wallThickPx;
        ctx.lineJoin = 'miter';
        ctx.strokeRect(p1.x, p1.y, wPx, hPx);

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(p1.x, p1.y, wPx, hPx);
    } else {
        // Porch dashed perimeter
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(p1.x, p1.y, wPx, hPx);
        ctx.setLineDash([]);
    }

    // Room Name & Area Label
    const areaM2 = (rm.w * state.modulePitch / 1000) * (rm.h * state.modulePitch / 1000);
    const tatamiJyo = (rm.w * rm.h) / 2;

    const centerX = p1.x + wPx / 2;
    const centerY = p1.y + hPx / 2;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const title = rm.customName || rt.label;
    ctx.fillStyle = rm.type === 'VOID' ? '#38bdf8' : '#0f172a';
    ctx.font = `bold ${Math.max(10, Math.min(14, state.cam2d.zoom * 0.30))}px "Noto Sans JP", sans-serif`;
    ctx.fillText(title, centerX, centerY - 7);

    if (wPx > 42 && hPx > 32) {
        ctx.fillStyle = rm.type === 'VOID' ? '#94a3b8' : '#334155';
        ctx.font = `600 ${Math.max(8, Math.min(11, state.cam2d.zoom * 0.22))}px "JetBrains Mono", monospace`;
        ctx.fillText(`${tatamiJyo.toFixed(1)}帖 (${areaM2.toFixed(1)}㎡)`, centerX, centerY + 8);
    }

    ctx.restore();
}

function drawWallSegment2D(wl) {
    const p1 = worldPToScreen(wl.x1, wl.y1);
    const p2 = worldPToScreen(wl.x2, wl.y2);
    ctx.save();
    ctx.strokeStyle = wl.wallType === 'exterior' ? '#f8fafc' : '#cbd5e1';
    ctx.lineWidth = wl.wallType === 'exterior' ? Math.max(6, state.cam2d.zoom * 0.16) : Math.max(4, state.cam2d.zoom * 0.11);
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
}

function drawStandalonePillar2D(pl) {
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
}
// --- Architectural Element Renderers (Stairs, Fixtures, Openings, Dimensions, Stamps) ---

// ==========================================
function drawStair2D(st) {
    const p = worldPToScreen(st.x, st.y);
    const wPx = st.w * state.cam2d.zoom;
    const hPx = st.h * state.cam2d.zoom;
    const isSelected = state.selectedItem && state.selectedItem.kind === 'stair' && state.selectedItem.id === st.id;
    const shape = st.shapeType || 'U_SHAPE';
    const dir = st.direction || 'UP';
    const steps = st.steps || 14;

    ctx.save();
    ctx.translate(p.x, p.y);

    // 外枠背景
    ctx.fillStyle = isSelected ? '#fefce8' : '#fffbeb';
    ctx.fillRect(0, 0, wPx, hPx);

    // 外枠線
    ctx.strokeStyle = isSelected ? '#f59e0b' : '#b45309';
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.strokeRect(0, 0, wPx, hPx);

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1;

    if (shape === 'U_SHAPE') {
        // ==========================================
        // 🪜 折り返しU型階段 (1坪タイプ)
        // ==========================================
        const isVert = hPx >= wPx;
        if (isVert) {
            // 縦長 (左右にレーン分割)
            const midX = wPx / 2;
            const landingH = hPx * 0.3;

            // 中央手すり壁・スリット
            ctx.fillStyle = '#fde68a';
            ctx.fillRect(midX - 2, landingH, 4, hPx - landingH);
            ctx.strokeRect(midX - 2, landingH, 4, hPx - landingH);

            // 踊り場（上部 30%）
            ctx.fillStyle = '#fef3c7';
            ctx.fillRect(0, 0, wPx, landingH);
            ctx.strokeRect(0, 0, wPx, landingH);

            // 踏面段板線（左右レーン各6本、合計14ステップ）
            const flightH = hPx - landingH;
            const stepH = flightH / 7;
            for (let i = 1; i <= 6; i++) {
                const y = landingH + i * stepH;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(midX - 2, y);
                ctx.moveTo(midX + 2, y);
                ctx.lineTo(wPx, y);
                ctx.stroke();
            }

            // Uターン昇降矢印線
            ctx.strokeStyle = '#b45309';
            ctx.fillStyle = '#b45309';
            ctx.lineWidth = 1.8;

            const startX = midX * 0.5;
            const endX = midX * 1.5;
            const bottomY = hPx * 0.88;
            const topY = landingH * 0.5;

            ctx.beginPath();
            ctx.arc(startX, bottomY, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(startX, bottomY);
            ctx.lineTo(startX, topY);
            ctx.arcTo(startX, topY - 10, midX, topY - 10, 10);
            ctx.arcTo(endX, topY - 10, endX, topY, 10);
            ctx.lineTo(endX, bottomY);
            ctx.stroke();

            // 矢先端
            ctx.beginPath();
            ctx.moveTo(endX - 4, bottomY - 6);
            ctx.lineTo(endX, bottomY);
            ctx.lineTo(endX + 4, bottomY - 6);
            ctx.stroke();

        } else {
            // 横長 (上下にレーン分割)
            const midY = hPx / 2;
            const landingW = wPx * 0.3;

            // 中央手すり壁・スリット
            ctx.fillStyle = '#fde68a';
            ctx.fillRect(0, midY - 2, wPx - landingW, 4);
            ctx.strokeRect(0, midY - 2, wPx - landingW, 4);

            // 踊り場（右側 30%）
            ctx.fillStyle = '#fef3c7';
            ctx.fillRect(wPx - landingW, 0, landingW, hPx);
            ctx.strokeRect(wPx - landingW, 0, landingW, hPx);

            // 踏面段板
            const flightW = wPx - landingW;
            const stepW = flightW / 7;
            for (let i = 1; i <= 6; i++) {
                const x = i * stepW;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, midY - 2);
                ctx.moveTo(x, midY + 2);
                ctx.lineTo(x, hPx);
                ctx.stroke();
            }

            // U字昇降矢印
            ctx.strokeStyle = '#b45309';
            ctx.fillStyle = '#b45309';
            ctx.lineWidth = 1.8;
            const startY = midY * 0.5;
            const endY = midY * 1.5;
            const leftX = wPx * 0.12;
            const rightX = wPx - landingW * 0.5;

            ctx.beginPath();
            ctx.arc(leftX, startY, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(leftX, startY);
            ctx.lineTo(rightX, startY);
            ctx.arcTo(rightX + 10, startY, rightX + 10, midY, 10);
            ctx.arcTo(rightX + 10, endY, rightX, endY, 10);
            ctx.lineTo(leftX, endY);
            ctx.stroke();

            // 矢先端
            ctx.beginPath();
            ctx.moveTo(leftX + 6, endY - 4);
            ctx.lineTo(leftX, endY);
            ctx.lineTo(leftX + 6, endY + 4);
            ctx.stroke();
        }

    } else {
        // ==========================================
        // 🪜 直階段 (STRAIGHT) または かね折れ (L_SHAPE)
        // ==========================================
        const isVert = hPx >= wPx;
        const stepCount = steps || 14;

        if (isVert) {
            const stepH = hPx / stepCount;
            for (let i = 1; i < stepCount; i++) {
                const y = i * stepH;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(wPx, y);
                ctx.stroke();
            }
            // 昇降矢印
            ctx.strokeStyle = '#b45309';
            ctx.fillStyle = '#b45309';
            ctx.lineWidth = 2;

            const fromY = dir === 'UP' ? hPx * 0.85 : hPx * 0.15;
            const toY = dir === 'UP' ? hPx * 0.15 : hPx * 0.85;

            ctx.beginPath();
            ctx.arc(wPx / 2, fromY, 3.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(wPx / 2, fromY);
            ctx.lineTo(wPx / 2, toY);
            ctx.stroke();

            const arrowDy = dir === 'UP' ? 8 : -8;
            ctx.beginPath();
            ctx.moveTo(wPx / 2 - 5, toY + arrowDy);
            ctx.lineTo(wPx / 2, toY);
            ctx.lineTo(wPx / 2 + 5, toY + arrowDy);
            ctx.stroke();

        } else {
            const stepW = wPx / stepCount;
            for (let i = 1; i < stepCount; i++) {
                const x = i * stepW;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, hPx);
                ctx.stroke();
            }
            ctx.strokeStyle = '#b45309';
            ctx.fillStyle = '#b45309';
            ctx.lineWidth = 2;

            const fromX = dir === 'UP' ? wPx * 0.15 : wPx * 0.85;
            const toX = dir === 'UP' ? wPx * 0.85 : wPx * 0.15;

            ctx.beginPath();
            ctx.arc(fromX, hPx / 2, 3.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(fromX, hPx / 2);
            ctx.lineTo(toX, hPx / 2);
            ctx.stroke();

            const arrowDx = dir === 'UP' ? -8 : 8;
            ctx.beginPath();
            ctx.moveTo(toX + arrowDx, hPx / 2 - 5);
            ctx.lineTo(toX, hPx / 2);
            ctx.lineTo(toX + arrowDx, hPx / 2 + 5);
            ctx.stroke();
        }
    }

    // 段数＆方向バッジ
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 10px "Noto Sans JP", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${dir === 'DOWN' ? 'DN' : 'UP'} (${steps}段)`, wPx / 2, hPx / 2);

    ctx.restore();
}

function drawFixture2D(fx) {
    const p = worldPToScreen(fx.x, fx.y);
    const wPx = fx.w * state.cam2d.zoom;
    const hPx = fx.h * state.cam2d.zoom;
    const isSelected = state.selectedItem && state.selectedItem.kind === 'fixture' && state.selectedItem.id === fx.id;
    const cat = fx.category || fx.type;

    ctx.save();
    ctx.translate(p.x, p.y);

    if (cat === 'KITCHEN' || cat.startsWith('KITCHEN')) {
        // ==========================================
        // 🍳 システムキッチン（天板・シンク・3口コンロ）
        // ==========================================
        const kType = (fx.fxData && fx.fxData.kitchenType) || 'I';

        ctx.fillStyle = isSelected ? '#ecfeff' : '#f1f5f9';
        ctx.strokeStyle = isSelected ? '#06b6d4' : '#475569';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;

        if (kType === 'L') {
            // L型キッチン描画
            const depthRatio = Math.min(0.4, 650 / (fx.wMm || 2550));
            const dX = wPx * depthRatio;
            const dY = hPx * depthRatio;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(wPx, 0);
            ctx.lineTo(wPx, dY);
            ctx.lineTo(dX, dY);
            ctx.lineTo(dX, hPx);
            ctx.lineTo(0, hPx);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // シンク (X方向)
            if (wPx > 60 && hPx > 40) {
                ctx.fillStyle = '#e2e8f0';
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 1;
                ctx.strokeRect(wPx * 0.45, 4, wPx * 0.32, dY - 8);
                ctx.fillRect(wPx * 0.45, 4, wPx * 0.32, dY - 8);
            }
            // コンロ (Y方向)
            if (hPx > 60) {
                ctx.fillStyle = '#334155';
                const cy = hPx * 0.55;
                ctx.beginPath();
                ctx.arc(dX * 0.5, cy, Math.min(dX * 0.25, 8), 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // I型 または アイランド/ペニンシュラ
            ctx.fillRect(0, 0, wPx, hPx);
            ctx.strokeRect(0, 0, wPx, hPx);

            if (wPx > 50 && hPx > 20) {
                // シンク（水槽）
                const sinkW = Math.min(wPx * 0.35, 45);
                const sinkH = hPx * 0.65;
                ctx.fillStyle = '#e2e8f0';
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 1;
                ctx.strokeRect(8, (hPx - sinkH) / 2, sinkW, sinkH);
                ctx.fillRect(8, (hPx - sinkH) / 2, sinkW, sinkH);

                // コンロ（3口）
                const stoveX = wPx - Math.min(wPx * 0.32, 40);
                const stoveY = hPx / 2;
                ctx.fillStyle = '#334155';
                ctx.beginPath();
                ctx.arc(stoveX + 12, stoveY - 4, 4.5, 0, Math.PI * 2);
                ctx.arc(stoveX + 12, stoveY + 5, 4.5, 0, Math.PI * 2);
                ctx.arc(stoveX + 22, stoveY, 3.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ラベル
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 9px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (wPx > 40 && hPx > 20) {
            ctx.fillText(kType === 'ISLAND' ? 'アイランド' : (kType === 'L' ? 'L型' : 'キッチン'), wPx / 2, hPx / 2);
        }
    } else if (cat === 'UB') {
        // ==========================================
        // 🛁 ユニットバス（浴槽＋洗い場カウンター＋出入口枠）
        // ==========================================
        const pat = (fx.fxData && fx.fxData.ubPattern) || 'patternA';
        ctx.fillStyle = isSelected ? '#f0fdfa' : '#f8fafc';
        ctx.strokeStyle = isSelected ? '#0d9488' : '#0891b2';
        ctx.lineWidth = isSelected ? 2.5 : 1.8;

        // 全体外枠
        ctx.fillRect(0, 0, wPx, hPx);
        ctx.strokeRect(0, 0, wPx, hPx);

        // バスタブ（浴槽）
        ctx.fillStyle = '#cffafe';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.2;

        if (pat === 'patternA') {
            // パターンA: 上部に浴槽、下部に洗い場と出入口
            const tubH = hPx * 0.45;
            ctx.beginPath();
            ctx.roundRect(4, 4, wPx - 8, tubH, 8);
            ctx.fill();
            ctx.stroke();

            // ドア出入口枠（下端中央）
            ctx.fillStyle = '#0891b2';
            ctx.fillRect(wPx * 0.35, hPx - 3, wPx * 0.3, 3);
        } else {
            // パターンB: 右側に浴槽、左側に洗い場と長手出入口
            const tubW = wPx * 0.45;
            ctx.beginPath();
            ctx.roundRect(wPx - tubW - 4, 4, tubW, hPx - 8, 8);
            ctx.fill();
            ctx.stroke();

            // ドア出入口枠（左端中央）
            ctx.fillStyle = '#0891b2';
            ctx.fillRect(0, hPx * 0.35, 3, hPx * 0.3);
        }

        // ラベル
        ctx.fillStyle = '#0e7490';
        ctx.font = 'bold 9px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`UB ${(fx.fxData && fx.fxData.ubSize) || '1616'}`, wPx * 0.5, hPx * 0.75);
    } else if (cat === 'VANITY') {
        // ==========================================
        // 🪞 洗面化粧台（カウンター＋洗面ボウル＋水栓）
        // ==========================================
        ctx.fillStyle = isSelected ? '#f8fafc' : '#ffffff';
        ctx.strokeStyle = isSelected ? '#0284c7' : '#64748b';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;

        ctx.fillRect(0, 0, wPx, hPx);
        ctx.strokeRect(0, 0, wPx, hPx);

        // 洗面ボウル（楕円）
        if (wPx > 24 && hPx > 16) {
            ctx.fillStyle = '#e0f2fe';
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(wPx / 2, hPx / 2, Math.min(wPx * 0.35, 20), Math.min(hPx * 0.35, 12), 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 水栓
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.arc(wPx / 2, 4, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // ラベル
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 8px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        if (wPx > 30) {
            ctx.fillText(`洗面 W${fx.wMm || 900}`, wPx / 2, hPx - 2);
        }
    } else {
        // その他の設備（トイレ、階段、家具等）
        const ft = FIXTURE_TYPES[cat] || { color: '#cbd5e1', label: '設備' };
        ctx.fillStyle = ft.color;
        ctx.fillRect(0, 0, wPx, hPx);
        ctx.strokeStyle = isSelected ? '#f59e0b' : '#64748b';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.strokeRect(0, 0, wPx, hPx);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 9px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (wPx > 28 && hPx > 18) {
            ctx.fillText(ft.label.split('(')[0], wPx / 2, hPx / 2);
        }
    }

    ctx.restore();
}
function drawOpening2D(op) {
    const pitch = state.modulePitch || 910;
    const p = worldPToScreen(op.x, op.y);
    const wP = op.widthP || (op.widthMm ? op.widthMm / pitch : 1.0);
    const lenPx = wP * state.cam2d.zoom;

    const isWin = op.category === 'window' || op.isWin || op.type === 'WINDOW' || (op.type && op.type.startsWith('WIN'));

    ctx.save();
    ctx.translate(p.x, p.y);
    if (op.orient === 'v') {
        ctx.rotate(Math.PI / 2);
    }

    // 1. 壁面の開口部くり抜き（白背景クリア）
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-lenPx / 2, -6, lenPx, 12);

    const isSelected = state.selectedItem && state.selectedItem.kind === 'opening' && state.selectedItem.id === op.id;

    if (isWin) {
        // ==========================================
        // 🪟 窓の描画（サッシ枠＋ガラス二重線）
        // ==========================================
        ctx.strokeStyle = isSelected ? '#38bdf8' : '#0284c7';
        ctx.lineWidth = isSelected ? 2.8 : 2;

        // 外枠
        ctx.strokeRect(-lenPx / 2, -4, lenPx, 8);

        // ガラス線（2本）
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-lenPx / 2 + 3, -1);
        ctx.lineTo(lenPx / 2 - 3, -1);
        ctx.moveTo(-lenPx / 2 + 3, 1);
        ctx.lineTo(lenPx / 2 - 3, 1);
        ctx.stroke();

        // 寸法表示（小さな文字）
        if (lenPx > 36) {
            ctx.fillStyle = '#0369a1';
            ctx.font = 'bold 8px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`${op.widthMm || Math.round(wP * pitch)}`, 0, -5);
        }
    } else {
        // ==========================================
        // 🚪 内部建具・玄関の描画（枚数・納まり別）
        // ==========================================
        const fit = op.doorFit || (op.type === 'SWING_DOOR' ? 'hiraki' : (op.type === 'ENTRANCE_DOOR' ? 'genkan_slide' : 'hikichigai'));
        const leaves = op.leafCount || 2;
        const dir = op.flip ? -1 : 1;

        ctx.strokeStyle = isSelected ? '#34d399' : (fit === 'genkan_slide' ? '#f59e0b' : '#059669');
        ctx.lineWidth = isSelected ? 2.8 : 2.2;

        if (fit === 'hiraki') {
            // 片開き戸: 扉線＋開閉円弧
            ctx.beginPath();
            ctx.moveTo(-lenPx / 2, 0);
            ctx.lineTo(-lenPx / 2, lenPx * 0.85 * dir);
            ctx.stroke();

            ctx.lineWidth = 1.2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(-lenPx / 2, 0, lenPx * 0.85, 0, (Math.PI / 2) * dir, dir < 0);
            ctx.stroke();
            ctx.setLineDash([]);
        } else if (fit === 'katabiki' || fit === 'genkan_slide') {
            // 片引き戸 / 玄関片引き戸: スライド枠＋扉線＋矢印
            ctx.beginPath();
            ctx.moveTo(-lenPx / 2, -2);
            ctx.lineTo(lenPx / 2, -2);
            ctx.stroke();

            // スライド扉
            ctx.lineWidth = fit === 'genkan_slide' ? 3.5 : 2.5;
            ctx.beginPath();
            ctx.moveTo(-lenPx / 2, 2 * dir);
            ctx.lineTo(0, 2 * dir);
            ctx.stroke();

            // 引き方向矢印
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-lenPx * 0.2, 5 * dir);
            ctx.lineTo(lenPx * 0.2, 5 * dir);
            ctx.lineTo(lenPx * 0.15, 3 * dir);
            ctx.stroke();
        } else if (fit === 'hikikomi') {
            // 引込み戸: 壁内引き込みポケット（破線）＋扉線
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(lenPx / 2, 0);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(-lenPx / 2, 0);
            ctx.lineTo(lenPx * 0.1, 0);
            ctx.stroke();
        } else if (fit === 'hikiwake') {
            // 引き分け (2枚または4枚): 中央から左右両側へスライド
            const halfW = lenPx / 2;
            ctx.beginPath();
            // 左側扉
            ctx.moveTo(-halfW, -2);
            ctx.lineTo(0, -2);
            // 右側扉
            ctx.moveTo(0, 2);
            ctx.lineTo(halfW, 2);
            ctx.stroke();

            // 4枚引き分けの場合は追加ライン
            if (leaves === 4) {
                ctx.moveTo(-halfW, 2);
                ctx.lineTo(-halfW / 2, 2);
                ctx.moveTo(halfW / 2, -2);
                ctx.lineTo(halfW, -2);
                ctx.stroke();
            }
        } else {
            // 引違い (2枚, 3枚, 4枚)
            const segW = lenPx / leaves;
            for (let i = 0; i < leaves; i++) {
                const offset = (i % 2 === 0) ? -2.5 : 2.5;
                const sx = -lenPx / 2 + i * segW;
                const ex = sx + segW * 1.08; // わずかな重なり
                ctx.beginPath();
                ctx.moveTo(sx, offset);
                ctx.lineTo(Math.min(lenPx / 2, ex), offset);
                ctx.stroke();
            }
        }

        // 寸法表示
        if (lenPx > 36) {
            ctx.fillStyle = fit === 'genkan_slide' ? '#b45309' : '#047857';
            ctx.font = 'bold 8px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`${op.widthMm || Math.round(wP * pitch)} (${leaves}枚)`, 0, -5);
        }
    }

    ctx.restore();
}
function drawAutoDimensions2D(fl) {
    if (fl.rooms.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    fl.rooms.forEach(r => {
        if (r.x < minX) minX = r.x;
        if (r.y < minY) minY = r.y;
        if (r.x + r.w > maxX) maxX = r.x + r.w;
        if (r.y + r.h > maxY) maxY = r.y + r.h;
    });

    const pTopLeft = worldPToScreen(minX, minY);
    const pBotRight = worldPToScreen(maxX, maxY);

    ctx.save();
    ctx.strokeStyle = '#64748b';
    ctx.fillStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';

    const dimY = pTopLeft.y - 24;
    ctx.beginPath();
    ctx.moveTo(pTopLeft.x, pTopLeft.y - 8); ctx.lineTo(pTopLeft.x, dimY - 5);
    ctx.moveTo(pBotRight.x, pTopLeft.y - 8); ctx.lineTo(pBotRight.x, dimY - 5);
    ctx.moveTo(pTopLeft.x, dimY); ctx.lineTo(pBotRight.x, dimY);
    ctx.stroke();

    [pTopLeft.x, pBotRight.x].forEach(tx => {
        ctx.beginPath();
        ctx.arc(tx, dimY, 2.5, 0, Math.PI * 2);
        ctx.fill();
    });

    const totalW_P = +(maxX - minX).toFixed(2);
    const totalW_mm = Math.round(totalW_P * state.modulePitch);
    ctx.fillText(`${totalW_mm} mm (${totalW_P}P)`, (pTopLeft.x + pBotRight.x) / 2, dimY - 8);

    const dimX = pTopLeft.x - 26;
    ctx.beginPath();
    ctx.moveTo(pTopLeft.x - 8, pTopLeft.y); ctx.lineTo(dimX - 5, pTopLeft.y);
    ctx.moveTo(pTopLeft.x - 8, pBotRight.y); ctx.lineTo(dimX - 5, pBotRight.y);
    ctx.moveTo(dimX, pTopLeft.y); ctx.lineTo(dimX, pBotRight.y);
    ctx.stroke();

    [pTopLeft.y, pBotRight.y].forEach(ty => {
        ctx.beginPath();
        ctx.arc(dimX, ty, 2.5, 0, Math.PI * 2);
        ctx.fill();
    });

    const totalH_P = +(maxY - minY).toFixed(2);
    const totalH_mm = Math.round(totalH_P * state.modulePitch);
    ctx.save();
    ctx.translate(dimX - 10, (pTopLeft.y + pBotRight.y) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${totalH_mm} mm (${totalH_P}P)`, 0, 0);
    ctx.restore();

    ctx.restore();
}

function drawStroke2D(st) {
    if (!st.points || st.points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = st.color || '#f43f5e';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = st.color === '#facc15' ? 0.55 : 0.95;

    for (let i = 1; i < st.points.length; i++) {
        const pt0 = worldPToScreen(st.points[i - 1].x, st.points[i - 1].y);
        const pt1 = worldPToScreen(st.points[i].x, st.points[i].y);
        const press = st.points[i].p || 0.5;
        ctx.lineWidth = Math.max(1.5, (st.size || 3) * (0.6 + press * 1.1));
        ctx.beginPath();
        ctx.moveTo(pt0.x, pt0.y);
        ctx.lineTo(pt1.x, pt1.y);
        ctx.stroke();
    }
    ctx.restore();
}

function drawStamp2D(sp) {
    const p = worldPToScreen(sp.x, sp.y);
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = sp.color || '#f43f5e';
    ctx.lineWidth = 1.5;
    ctx.font = 'bold 11px "Noto Sans JP", sans-serif';
    const w = ctx.measureText(sp.text).width + 12;
    ctx.beginPath();
    ctx.roundRect(p.x - w / 2, p.y - 11, w, 22, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = sp.color || '#f43f5e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sp.text, p.x, p.y);
    ctx.restore();
}

function drawDragPreview2D(drag) {
    ctx.save();
    if (drag.type === 'room') {
        const x = Math.min(drag.startX, drag.curX);
        const y = Math.min(drag.startY, drag.curY);
        const w = Math.abs(drag.curX - drag.startX);
        const h = Math.abs(drag.curY - drag.startY);
        const p = worldPToScreen(x, y);
        const wPx = w * state.cam2d.zoom;
        const hPx = h * state.cam2d.zoom;

        ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.fillRect(p.x, p.y, wPx, hPx);
        ctx.strokeRect(p.x, p.y, wPx, hPx);
        ctx.setLineDash([]);

        const jyo = (w * h) / 2;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${ROOM_TYPES[state.subRoomType].label}: ${w.toFixed(2)}P×${h.toFixed(2)}P (${jyo.toFixed(1)}帖)`, p.x + wPx / 2, p.y + hPx / 2);
    } else if (drag.type === 'wall') {
        const p1 = worldPToScreen(drag.startX, drag.startY);
        const p2 = worldPToScreen(drag.curX, drag.curY);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    }
    ctx.restore();
}

function drawSelectionHandles2D() {
    const obj = findSelectedObject();
    if (!obj) return;
    const kind = state.selectedItem.kind;

    ctx.save();
    if (kind === 'room' || kind === 'fixture') {
        const p = worldPToScreen(obj.x, obj.y);
        const wPx = obj.w * state.cam2d.zoom;
        const hPx = obj.h * state.cam2d.zoom;

        ctx.strokeStyle = kind === 'fixture' ? '#06b6d4' : '#3b82f6';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(p.x - 2, p.y - 2, wPx + 4, hPx + 4);

        const corners = [
            [p.x, p.y],
            [p.x + wPx, p.y],
            [p.x, p.y + hPx],
            [p.x + wPx, p.y + hPx]
        ];
        corners.forEach(([cx, cy]) => {
            ctx.fillStyle = kind === 'fixture' ? '#0891b2' : '#2563eb';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });
    } else if (kind === 'opening') {
        const p = worldPToScreen(obj.x, obj.y);
        const halfLenPx = ((obj.widthP || 1.0) * state.cam2d.zoom) / 2;

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        const ends = obj.orient === 'h'
            ? [[p.x - halfLenPx, p.y], [p.x + halfLenPx, p.y]]
            : [[p.x, p.y - halfLenPx], [p.x, p.y + halfLenPx]];

        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();

        ends.forEach(([ex, ey]) => {
            ctx.fillStyle = '#ea580c';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(ex, ey, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });
    } else if (kind === 'pillar') {
        const p = worldPToScreen(obj.x, obj.y);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(p.x - 10, p.y - 10, 20, 20);
    }
    ctx.restore();
}

// Global Window Export for Backward Compatibility
if (typeof window !== 'undefined') {
    window.canvas2d = canvas2d;
    window.ctx = ctx;
    window.snapP = snapP;
    window.screenToWorldP = screenToWorldP;
    window.worldPToScreen = worldPToScreen;
    window.zoom2D = zoom2D;
    window.reset2DCamera = reset2DCamera;
    window.draw2DCanvas = draw2DCanvas;
    window.drawGrid2D = drawGrid2D;
    window.drawFloorOnionSkin = drawFloorOnionSkin;
    window.drawRoom2D = drawRoom2D;
    window.drawWallSegment2D = drawWallSegment2D;
    window.drawStandalonePillar2D = drawStandalonePillar2D;
    window.drawStair2D = drawStair2D;
    window.drawFixture2D = drawFixture2D;
    window.drawOpening2D = drawOpening2D;
    window.drawAutoDimensions2D = drawAutoDimensions2D;
    window.drawStroke2D = drawStroke2D;
    window.drawStamp2D = drawStamp2D;
    window.drawDragPreview2D = drawDragPreview2D;
    window.drawSelectionHandles2D = drawSelectionHandles2D;
}