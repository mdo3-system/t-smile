/**
 * 住ま居る 3D間取り工房 (MadoriSketch)
 * 2D建築キャンバスレンダラー (Single Responsibility: 2D Architectural Canvas Renderer)
 * ホワイト方眼紙テーマ・2段外周自動寸法線(区間+総寸法)・補助線ルーラー・壁4種・サッシ12種・
 * 空間要素・メモ注釈(直線/曲線●頂点/楕円/寸法線/引出線/電気記号)・左下鳥瞰図ミニプレビューを担当
 */

let canvas2d = document.getElementById('canvas2d');
let ctx = canvas2d ? canvas2d.getContext('2d') : null;

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!canvas2d) canvas2d = document.getElementById('canvas2d');
        if (canvas2d && !ctx) ctx = canvas2d.getContext('2d');
    });
}

function snapP(val) {
    const div = state.gridDivisions || 2;
    return Math.round(val * div) / div;
}

function screenToWorldP(sx, sy) {
    if (!canvas2d) canvas2d = document.getElementById('canvas2d');
    const rect = canvas2d.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    return {
        x: state.cam2d.x + (sx - cx) / state.cam2d.zoom,
        y: state.cam2d.y + (sy - cy) / state.cam2d.zoom
    };
}

function worldPToScreen(wx, wy) {
    if (!canvas2d) canvas2d = document.getElementById('canvas2d');
    const rect = canvas2d.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    return {
        x: cx + (wx - state.cam2d.x) * state.cam2d.zoom,
        y: cy + (wy - state.cam2d.y) * state.cam2d.zoom
    };
}

function zoom2D(factor) {
    state.cam2d.zoom = Math.max(16, Math.min(130, state.cam2d.zoom * factor));
    request2DRedraw();
}

function reset2DCamera() {
    if (!canvas2d) canvas2d = document.getElementById('canvas2d');
    if (!canvas2d) return;
    state.cam2d.x = 3.5;
    state.cam2d.y = 4.2;
    const rect = canvas2d.getBoundingClientRect();
    state.cam2d.zoom = Math.min(rect.width, rect.height) / 12.5;
    if (state.cam2d.zoom < 26) state.cam2d.zoom = 38;
    request2DRedraw();
}

function applyDashStyle(ctx, dashType) {
    if (dashType === 'dashed') ctx.setLineDash([6, 4]);
    else if (dashType === 'dashdot') ctx.setLineDash([10, 3, 2, 3]);
    else ctx.setLineDash([]);
}

function draw2DCanvas() {
    if (!canvas2d) canvas2d = document.getElementById('canvas2d');
    if (!canvas2d) return;
    if (!ctx) ctx = canvas2d.getContext('2d');

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
    const isLight = state.canvasTheme !== 'dark';

    // 1. 背景描画（お手本準拠のホワイト方眼紙 または ダークCAD）
    ctx.fillStyle = isLight ? '#ffffff' : '#0b1120';
    ctx.fillRect(0, 0, W, H);

    // 2. 方眼グリッド & 1〜6分割点線
    drawGrid2D(W, H, isLight);

    // 3. 補助線（ものさし）の描画
    drawGuides2D(W, H, isLight);

    // 4. 下絵透過（各階タブの「👁️」アイコンがONの他階層を透過描画）
    if (state.floorVisibility) {
        [0, 1, 2, 3, 4].forEach(fNum => {
            if (fNum !== state.currentFloor && state.floorVisibility[fNum] && state.floors[fNum]) {
                drawFloorOnionSkin(state.floors[fNum], fNum, isLight);
            }
        });
    } else if (state.onionSkin) {
        const lowerFloorNum = state.currentFloor > 1 ? state.currentFloor - 1 : 2;
        if (state.floors[lowerFloorNum]) {
            drawFloorOnionSkin(state.floors[lowerFloorNum], lowerFloorNum, isLight);
        }
    }

    const fl = state.floors[state.currentFloor];
    if (!fl) {
        ctx.restore();
        return;
    }

    // 5a. 部屋・空間要素（吹き抜け、玄関土間、小上り、畳、中庭、天井）
    fl.rooms.forEach(rm => drawRoom2D(rm, isLight));

    // 5b. 階段（ボックス階段 / オープン階段 / 手すり）
    if (fl.stairs && fl.stairs.length) {
        fl.stairs.forEach(st => drawStair2D(st, isLight));
    }

    // 5b-2. 上の階における「部屋のプロパティ・範囲優先」マスク処理：
    // 下の階の階段の1〜2段目など上の階に干渉しない部分に床（収納・クローゼット・廊下・居室等）を貼った場合、
    // 部屋の範囲を優先して該当段数を床で覆い隠し、部屋名・範囲を優先表示する
    if (fl.stairs && fl.stairs.length > 0 && fl.rooms && fl.rooms.length > 0) {
        drawUpperFloorRoomMaskOverStairs2D(fl, W, H, isLight);
    }

    // 5c. 壁セグメント（壁、たれ壁、腰壁、上り框）
    fl.walls.forEach(wl => drawWallSegment2D(wl, isLight));

    // 5d. 多角形柱 & 独立柱
    if (fl.polyPillars && fl.polyPillars.length > 0) {
        fl.polyPillars.forEach(pp => drawPolyPillar2D(pp, isLight));
    }
    fl.pillars.forEach(pl => drawStandalonePillar2D(pl, isLight));

    // 5e. 四角（3D直方体）& 設備・家具
    if (fl.boxes3d && fl.boxes3d.length > 0) {
        fl.boxes3d.forEach(bx => drawBox3DItem2D(bx, isLight));
    }
    fl.fixtures.forEach(fx => drawFixture2D(fx, isLight));

    // 5f. サッシ・建具（全13種類）
    fl.openings.forEach(op => drawOpening2D(op, isLight));

    // 5g. 外周2段自動寸法線（区間寸法＋総寸法：お手本画像完全準拠）
    drawAutoDimensions2D(fl, isLight);

    // 5h. メモ注釈（テキスト、寸法線、引き出し線、面積表、直線、曲線●、楕円、記号、手描き）
    if (fl.memos && fl.memos.length > 0) {
        fl.memos.forEach(mm => drawMemoItem2D(mm, isLight));
    }
    fl.strokes.forEach(st => drawStroke2D(st));
    fl.stamps.forEach(sp => drawStamp2D(sp));

    // 6. 設備配置ホバープレビュー（壁面自動吸着）
    if (state.activeTool === 'fixture' && state.lastHoverWorld && state.paletteMode === 'build') {
        drawFixtureHoverPreview2D();
    }

    // 7. 階段プリセットホバープレビュー
    if (state.activeTool === 'stair' && state.lastHoverWorld && state.stairDrawMode === 'preset' && state.paletteMode === 'build') {
        drawStairHoverPreview2D();
    }

    // 8. 独立柱ホバープレビュー
    if (state.activeTool === 'pillar' && state.lastHoverWorld && state.paletteMode === 'build') {
        drawPillarHoverPreview2D();
    }

    // 9. 多角形柱の作図中プレビュー
    const activePolyPts = (state.polyPoints && state.polyPoints.length > 0) ? state.polyPoints : state.polyPillarPoints;
    if (state.activeTool === 'poly_pillar' && activePolyPts && activePolyPts.length > 0) {
        drawPolyPillarPreview2D();
    }

    // 10. 壁作図中プレビュー
    if (state.activeTool === 'wall' && state.wallClickStart) {
        drawWallActivePreview2D();
    }

    // 11. ドラッグ中プレビュー
    if (state.dragAction) {
        drawDragPreview2D(state.dragAction, isLight);
    }

    // 12. 選択要素のハンドル描画
    if (state.selectedItem && (state.selectedItem.floor === state.currentFloor || state.selectedItem.kind === 'guide')) {
        drawSelectionHandles2D(isLight);
    }

    // 13. ものさしモード時の上辺・左辺ルーラー帯描画
    if (state.rulerMode) {
        drawRulerBars2D(W, H, isLight);
    }

    ctx.restore();
}

function drawGrid2D(W, H, isLight) {
    const topLeft = screenToWorldP(0, 0);
    const botRight = screenToWorldP(W, H);
    const bounds = state.gridBounds || { minX: -2, maxX: 12, minY: -2, maxY: 12 };
    const startX = Math.min(bounds.minX, Math.floor(topLeft.x) - 1);
    const endX = Math.max(bounds.maxX, Math.ceil(botRight.x) + 1);
    const startY = Math.min(bounds.minY, Math.floor(topLeft.y) - 1);
    const endY = Math.max(bounds.maxY, Math.ceil(botRight.y) + 1);

    const div = state.gridDivisions || 2;

    // 分割グリッド点線 (1〜6分割)
    if (div > 1 && state.cam2d.zoom >= 22) {
        ctx.strokeStyle = isLight ? 'rgba(148, 163, 184, 0.48)' : 'rgba(56, 189, 248, 0.18)';
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

    // 1P 主グリッド実線 (910mm / 1000mm)
    ctx.strokeStyle = isLight ? 'rgba(148, 163, 184, 0.75)' : 'rgba(71, 85, 105, 0.6)';
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

    // 用紙範囲枠（拡張可能範囲の可視化）
    const pBoundTL = worldPToScreen(bounds.minX, bounds.minY);
    const pBoundBR = worldPToScreen(bounds.maxX, bounds.maxY);
    ctx.strokeStyle = isLight ? 'rgba(100, 116, 139, 0.35)' : 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pBoundTL.x, pBoundTL.y, pBoundBR.x - pBoundTL.x, pBoundBR.y - pBoundTL.y);
}

function drawGuides2D(W, H, isLight) {
    if (!state.guides || state.guides.length === 0) return;
    ctx.save();
    state.guides.forEach(g => {
        const gPos = g.pos !== undefined ? g.pos : (g.posP || 0);
        const isSel = state.selectedItem && state.selectedItem.kind === 'guide' && state.selectedItem.id === g.id;
        ctx.strokeStyle = isSel ? '#f59e0b' : (state.guidesLocked ? '#64748b' : '#0ea5e9');
        ctx.lineWidth = isSel ? 2.2 : 1.4;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        if (g.axis === 'h') {
            const sy = worldPToScreen(0, gPos).y;
            ctx.moveTo(0, sy);
            ctx.lineTo(W, sy);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = isSel ? '#f59e0b' : '#0284c7';
            ctx.font = 'bold 10px "JetBrains Mono", monospace';
            ctx.fillText(`Y=${Math.round(gPos * state.modulePitch)}mm ${state.guidesLocked ? '🔒' : ''}`, 32, sy - 4);
        } else {
            const sx = worldPToScreen(gPos, 0).x;
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx, H);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = isSel ? '#f59e0b' : '#0284c7';
            ctx.font = 'bold 10px "JetBrains Mono", monospace';
            ctx.fillText(`X=${Math.round(gPos * state.modulePitch)}mm ${state.guidesLocked ? '🔒' : ''}`, sx + 4, 36);
        }
    });
    ctx.restore();
}

function drawRulerBars2D(W, H, isLight) {
    ctx.save();
    // 上辺ルーラー (水平補助線引き出し用)
    ctx.fillStyle = 'rgba(245, 158, 11, 0.92)';
    ctx.fillRect(0, 0, W, 22);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px "Noto Sans JP", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📏 水平補助線ルーラー（ここをタップまたは下へドラッグして水平補助線を追加）', W / 2, 14);

    // 左辺ルーラー (垂直補助線引き出し用)
    ctx.fillStyle = 'rgba(245, 158, 11, 0.92)';
    ctx.fillRect(0, 22, 22, H - 22);
    ctx.save();
    ctx.translate(14, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#0f172a';
    ctx.fillText('📏 垂直補助線ルーラー（右へドラッグ）', 0, 0);
    ctx.restore();
    ctx.restore();
}

function drawFloorOnionSkin(floorData, floorNum, isLight) {
    if (!floorData) return;
    ctx.save();
    const flLabel = floorNum === 0 ? 'B1' : `${floorNum}F`;

    if (floorData.walls && floorData.walls.length > 0) {
        ctx.strokeStyle = isLight ? 'rgba(2, 132, 199, 0.45)' : 'rgba(56, 189, 248, 0.55)';
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

    if (floorData.rooms && floorData.rooms.length > 0) {
        floorData.rooms.forEach(rm => {
            const p1 = worldPToScreen(rm.x, rm.y);
            const wPx = (rm.w || 2) * state.cam2d.zoom;
            const hPx = (rm.h || 2) * state.cam2d.zoom;
            ctx.strokeStyle = isLight ? 'rgba(2, 132, 199, 0.45)' : 'rgba(56, 189, 248, 0.35)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 4]);
            ctx.strokeRect(p1.x, p1.y, wPx, hPx);
            ctx.fillStyle = isLight ? 'rgba(2, 132, 199, 0.7)' : 'rgba(56, 189, 248, 0.65)';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(`${flLabel}: ${rm.name || rm.customName || '部屋'}`, p1.x + 6, p1.y + 15);
        });
    }

    if (floorData.stairs && floorData.stairs.length > 0) {
        floorData.stairs.forEach(st => {
            const p = worldPToScreen(st.x, st.y);
            const wPx = st.w * state.cam2d.zoom;
            const hPx = st.h * state.cam2d.zoom;
            ctx.strokeStyle = 'rgba(217, 119, 6, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(p.x, p.y, wPx, hPx);
        });
    }

    ctx.restore();
}

function drawRoom2D(rm, isLight) {
    const rt = ROOM_TYPES[rm.type] || ROOM_TYPES.OTHER || ROOM_TYPES.LDK;
    const p1 = worldPToScreen(rm.x, rm.y);
    const wPx = rm.w * state.cam2d.zoom;
    const hPx = rm.h * state.cam2d.zoom;
    const hasPoly = Array.isArray(rm.points) && rm.points.length >= 3;

    const traceRoomShape = () => {
        ctx.beginPath();
        if (hasPoly) {
            rm.points.forEach((pt, idx) => {
                const sp = worldPToScreen(pt.x, pt.y);
                if (idx === 0) ctx.moveTo(sp.x, sp.y);
                else ctx.lineTo(sp.x, sp.y);
            });
            ctx.closePath();
        } else {
            ctx.rect(p1.x, p1.y, wPx, hPx);
        }
    };

    ctx.save();

    // お手本画像準拠：ホワイト方眼時はクリーンな白・薄トーン＋玄関土間はグレー＋吹き抜けは点線×
    if (rm.type === 'DOMA' || rm.type === 'PORCH') {
        ctx.fillStyle = '#cbd5e1';
    } else if (rm.type === 'VOID') {
        ctx.fillStyle = isLight ? 'rgba(241, 245, 249, 0.5)' : 'rgba(30, 41, 59, 0.6)';
    } else if (rm.type === 'KOAGARI') {
        ctx.fillStyle = 'rgba(254, 240, 138, 0.55)';
    } else if (rm.type === 'TATAMI' || rm.type === 'WASHITSU') {
        ctx.fillStyle = isLight ? 'rgba(220, 252, 231, 0.45)' : rt.color2d;
    } else if (rm.type === 'NAKANIWA') {
        ctx.fillStyle = 'rgba(209, 250, 229, 0.4)';
    } else if (rm.type === 'TENJO') {
        ctx.fillStyle = 'rgba(226, 232, 240, 0.45)';
    } else {
        ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.65)' : rt.color2d;
    }
    traceRoomShape();
    ctx.fill();

    // 空間パターン描画
    if (rm.type === 'VOID') {
        // 吹き抜け：枠内に点線の「×」
        ctx.strokeStyle = isLight ? '#334155' : '#38bdf8';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
        traceRoomShape();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p1.x + wPx, p1.y + hPx);
        ctx.moveTo(p1.x + wPx, p1.y); ctx.lineTo(p1.x, p1.y + hPx);
        ctx.stroke();
        ctx.setLineDash([]);
    } else if (rm.type === 'TATAMI' || rt.floorType === 'tatami') {
        // 畳の割付線
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 1.3;
        if (hasPoly) {
            traceRoomShape();
            ctx.stroke();
        } else {
            ctx.strokeRect(p1.x + 2, p1.y + 2, wPx - 4, hPx - 4);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y + hPx / 2);
            ctx.lineTo(p1.x + wPx, p1.y + hPx / 2);
            ctx.moveTo(p1.x + wPx / 2, p1.y);
            ctx.lineTo(p1.x + wPx / 2, p1.y + hPx);
            ctx.stroke();
        }
    } else if (rm.type === 'KOAGARI') {
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 2;
        traceRoomShape();
        ctx.stroke();
    } else if (rm.type === 'NAKANIWA') {
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 3]);
        traceRoomShape();
        ctx.stroke();
        ctx.setLineDash([]);
    } else if (rm.type === 'TENJO') {
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        traceRoomShape();
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // 壁枠描画（手動矩形部屋のみ外枠を描画。自動検出部屋は既存の壁線分があるため二重線にしない）
    if (rt.hasWall && !rm.isAutoDetected) {
        const wallThickPx = Math.max(5, state.cam2d.zoom * 0.14);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = wallThickPx;
        ctx.lineJoin = 'miter';
        traceRoomShape();
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.2, wallThickPx * 0.32);
        traceRoomShape();
        ctx.stroke();
    } else if (rm.type === 'DOMA' || rm.type === 'PORCH') {
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        traceRoomShape();
        ctx.stroke();
    }

    // 部屋名・畳数ラベル（多角形面積・重心を優先使用）
    const pitchM = (state.modulePitch || 910) / 1000;
    const areaM2 = (typeof getRoomAreaM2 === 'function')
        ? getRoomAreaM2(rm)
        : (typeof rm.areaM2 === 'number' && rm.areaM2 > 0 ? rm.areaM2 : (rm.w * pitchM) * (rm.h * pitchM));
    const tatamiJyo = areaM2 / (pitchM * pitchM * 2);
    let centerX = p1.x + wPx / 2;
    let centerY = p1.y + hPx / 2;
    if (hasPoly && rm.centroid) {
        const cp = worldPToScreen(rm.centroid.x, rm.centroid.y);
        centerX = cp.x;
        centerY = cp.y;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const title = rm.customName || rm.name || rt.label;
    if (title && wPx > 32 && hPx > 24) {
        ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
        ctx.font = `bold ${Math.max(9, Math.min(13, state.cam2d.zoom * 0.26))}px "Noto Sans JP", sans-serif`;
        ctx.fillText(title, centerX, centerY - (hPx > 42 ? 6 : 0));

        if (wPx > 48 && hPx > 42 && rm.type !== 'VOID' && rm.type !== 'TENJO') {
            ctx.fillStyle = isLight ? '#475569' : '#cbd5e1';
            ctx.font = `600 ${Math.max(8, Math.min(10, state.cam2d.zoom * 0.20))}px "JetBrains Mono", monospace`;
            const subTxt = rm.type === 'KOAGARI' ? `+30cm (${tatamiJyo.toFixed(1)}帖)` : `${tatamiJyo.toFixed(1)}帖 (${areaM2.toFixed(1)}㎡)`;
            ctx.fillText(subTxt, centerX, centerY + 8);
        }
    }

    ctx.restore();
}

function drawWallSegment2D(wl, isLight) {
    const p1 = worldPToScreen(wl.x1, wl.y1);
    const p2 = worldPToScreen(wl.x2, wl.y2);
    const wType = wl.wallType || 'wall';
    const wallThickPx = Math.max(5, state.cam2d.zoom * 0.14);

    ctx.save();
    ctx.lineCap = 'square';

    if (wType === 'tarekabe') {
        // たれ壁：平行な破線（第3章準拠）
        ctx.strokeStyle = isLight ? '#1e293b' : '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.setLineDash([]);
    } else if (wType === 'koshikabe') {
        // 腰壁：中白の二重線（高さ1000mm手すり壁・カウンター腰壁）
        ctx.strokeStyle = isLight ? '#1e293b' : '#cbd5e1';
        ctx.lineWidth = wallThickPx;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        ctx.strokeStyle = isLight ? '#e2e8f0' : '#334155';
        ctx.lineWidth = Math.max(2, wallThickPx - 3);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    } else if (wType === 'agarikamachi') {
        // 上り框：玄関段差ライン
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    } else {
        // 通常壁：黒枠＋白芯の建築壁表現
        ctx.strokeStyle = isLight ? '#0f172a' : '#f8fafc';
        ctx.lineWidth = wallThickPx;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        ctx.strokeStyle = isLight ? '#ffffff' : '#334155';
        ctx.lineWidth = Math.max(1.2, wallThickPx * 0.32);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    }
    ctx.restore();
}

function drawPolyPillar2D(pp, isLight) {
    if (!pp.points || pp.points.length < 3) return;
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const p0 = worldPToScreen(pp.points[0].x, pp.points[0].y);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < pp.points.length; i++) {
        const pt = worldPToScreen(pp.points[i].x, pp.points[i].y);
        ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function drawBox3DItem2D(bx, isLight) {
    const p = worldPToScreen(bx.x, bx.y);
    const wPx = bx.w * state.cam2d.zoom;
    const hPx = bx.h * state.cam2d.zoom;
    const isSel = state.selectedItem && state.selectedItem.kind === 'box3d' && state.selectedItem.id === bx.id;

    ctx.save();
    ctx.fillStyle = isSel ? 'rgba(245, 158, 11, 0.25)' : 'rgba(203, 213, 225, 0.65)';
    ctx.strokeStyle = isSel ? '#f59e0b' : '#475569';
    ctx.lineWidth = isSel ? 2.5 : 1.5;
    ctx.fillRect(p.x, p.y, wPx, hPx);
    ctx.strokeRect(p.x, p.y, wPx, hPx);

    if (wPx > 30 && hPx > 18) {
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 9px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${bx.label || '直方体'} (H${bx.hMm || 750})`, p.x + wPx / 2, p.y + hPx / 2);
    }
    ctx.restore();
}

function drawStandalonePillar2D(pl, isLight) {
    const p = worldPToScreen(pl.x, pl.y);
    const pSize = pl.sizeMm || 150;
    const sz = Math.max(8, state.cam2d.zoom * (pSize / state.modulePitch));
    const isSelected = state.selectedItem && state.selectedItem.kind === 'pillar' && state.selectedItem.id === pl.id;

    ctx.save();
    ctx.fillStyle = isSelected ? '#f59e0b' : '#0f172a';
    ctx.strokeStyle = isSelected ? '#d97706' : '#0f172a';
    ctx.lineWidth = 2;

    if (pl.shape === 'round') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    } else {
        ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
        ctx.strokeRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
    ctx.restore();
}

// ============================================================================
// モジュール式階段エンジン (I1 -> C1 -> I2 -> C2 -> I3) - 2D/3D/UI 単一情報源
// ============================================================================

const STAIR_PATTERN_PRESETS = {
    'U_6TURN': {
        key: 'U_6TURN',
        label: '① コの字 6段廻り (I1:4+廻3+廻3+I3:3)',
        shortLabel: '① コの字(6段廻り)',
        shapeType: 'U_SHAPE',
        i1Steps: 4, c1Steps: 3, c1Dir: 'right',
        i2Steps: 0, c2Steps: 3, c2Dir: 'right',
        i3Steps: 3
    },
    'STRAIGHT': {
        key: 'STRAIGHT',
        label: '② 直階段 I型 (13段)',
        shortLabel: '② 直階段(I型)',
        shapeType: 'STRAIGHT',
        i1Steps: 13, c1Steps: 0, c1Dir: 'right',
        i2Steps: 0, c2Steps: 0, c2Dir: 'right',
        i3Steps: 0
    },
    'L_TOP_TURN': {
        key: 'L_TOP_TURN',
        label: '③ 上部廻りL型 (I1:10+上3段廻り登りきり)',
        shortLabel: '③ 上廻りL型(10+3)',
        shapeType: 'L_SHAPE',
        i1Steps: 10, c1Steps: 3, c1Dir: 'right',
        i2Steps: 0, c2Steps: 0, c2Dir: 'right',
        i3Steps: 0
    },
    'CRANK_BOTH_TURN': {
        key: 'CRANK_BOTH_TURN',
        label: '④ 上下両端廻り (下3段廻り+I2:7+上3段廻り)',
        shortLabel: '④ 上下廻り(3+7+3)',
        shapeType: 'U_SHAPE',
        i1Steps: 0, c1Steps: 3, c1Dir: 'right',
        i2Steps: 7, c2Steps: 3, c2Dir: 'right',
        i3Steps: 0
    },
    'L_PLUS_TOP_TURN': {
        key: 'L_PLUS_TOP_TURN',
        label: '⑤ L型＋上部廻り (I1:4+廻3+I2:4+上3段廻り)',
        shortLabel: '⑤ L型+上廻り(4+3+4+3)',
        shapeType: 'L_SHAPE',
        i1Steps: 4, c1Steps: 3, c1Dir: 'right',
        i2Steps: 4, c2Steps: 3, c2Dir: 'left',
        i3Steps: 0
    },
    'L_LANDING_TOP': {
        key: 'L_LANDING_TOP',
        label: '⑥ 1段踊り場登りきり (I1:5+1段踊り場)',
        shortLabel: '⑥ 1段踊り場登りきり',
        shapeType: 'L_SHAPE',
        i1Steps: 5, c1Steps: 1, c1Dir: 'both',
        i2Steps: 0, c2Steps: 0, c2Dir: 'right',
        i3Steps: 0
    },
    'L_STANDARD': {
        key: 'L_STANDARD',
        label: '⑦ 標準かね折れL型 (I1:5+3段廻り+I2:5)',
        shortLabel: '⑦ 標準L型(5+3+5)',
        shapeType: 'L_SHAPE',
        i1Steps: 5, c1Steps: 3, c1Dir: 'right',
        i2Steps: 5, c2Steps: 0, c2Dir: 'right',
        i3Steps: 0
    },
    'U_LANDING': {
        key: 'U_LANDING',
        label: '⑧ 大踊り場コの字 (I1:6+踊1+踊1+I3:6)',
        shortLabel: '⑧ 大踊り場コの字',
        shapeType: 'U_SHAPE',
        i1Steps: 6, c1Steps: 1, c1Dir: 'right',
        i2Steps: 0, c2Steps: 1, c2Dir: 'right',
        i3Steps: 6
    }
};
window.STAIR_PATTERN_PRESETS = STAIR_PATTERN_PRESETS;

function stairTurnStepsFromSpec(spec) {
    if (spec === 'landing' || spec === 'turn_1' || spec === 1 || spec === '1') return 1;
    if (spec === 'turn_2' || spec === 2 || spec === '2') return 2;
    if (spec === 'turn_4' || spec === 4 || spec === '4') return 4;
    if (spec === 'none' || spec === 0 || spec === '0') return 0;
    return 3;
}
window.stairTurnStepsFromSpec = stairTurnStepsFromSpec;

function getStairModularConfig(st) {
    if (!st) return { i1Steps: 13, c1Steps: 0, c1Dir: 'right', i2Steps: 0, c2Steps: 0, c2Dir: 'right', i3Steps: 0, totalSteps: 13, isLegacyStraight: false };

    if (st.i1Steps !== undefined || st.isModular) {
        let i1 = Math.max(0, parseInt(st.i1Steps ?? 0, 10) || 0);
        let c1 = Math.max(0, Math.min(4, parseInt(st.c1Steps ?? 0, 10) || 0));
        let c1Dir = st.c1Dir || 'right';
        let i2 = Math.max(0, parseInt(st.i2Steps ?? 0, 10) || 0);
        let c2 = Math.max(0, Math.min(4, parseInt(st.c2Steps ?? 0, 10) || 0));
        let c2Dir = st.c2Dir || 'right';
        let i3 = Math.max(0, parseInt(st.i3Steps ?? 0, 10) || 0);
        if (i1 + c1 + i2 + c2 + i3 <= 0) {
            i1 = st.steps || 13;
        }
        return {
            i1Steps: i1, c1Steps: c1, c1Dir: c1Dir,
            i2Steps: i2, c2Steps: c2, c2Dir: c2Dir,
            i3Steps: i3,
            totalSteps: i1 + c1 + i2 + c2 + i3,
            isLegacyStraight: false
        };
    }

    if (st.patternKey && STAIR_PATTERN_PRESETS[st.patternKey]) {
        const pr = STAIR_PATTERN_PRESETS[st.patternKey];
        const total = pr.i1Steps + pr.c1Steps + pr.i2Steps + pr.c2Steps + pr.i3Steps;
        return {
            i1Steps: pr.i1Steps, c1Steps: pr.c1Steps, c1Dir: pr.c1Dir,
            i2Steps: pr.i2Steps, c2Steps: pr.c2Steps, c2Dir: pr.c2Dir,
            i3Steps: pr.i3Steps, totalSteps: total, isLegacyStraight: false
        };
    }

    const shape = st.shapeType || 'STRAIGHT';
    const tSteps = stairTurnStepsFromSpec(st.turnType);

    if (shape === 'L_SHAPE') {
        let c1Dir = st.c1Dir || 'right';
        if (!st.c1Dir && st.points && st.points.length === 3) {
            const p0 = st.points[0], p1 = st.points[1], p2 = st.points[2];
            const v1x = p1.x - p0.x, v1y = p1.y - p0.y;
            const v2x = p2.x - p1.x, v2y = p2.y - p1.y;
            const cross = v1x * v2y - v1y * v2x;
            if (Math.abs(cross) > 0.01) c1Dir = cross < 0 ? 'left' : 'right';
        }
        const isLandingTop = !!(st.landingTop || st.isLandingTop);
        if (isLandingTop) {
            const i1 = st.steps || 5;
            return {
                i1Steps: i1, c1Steps: tSteps, c1Dir: c1Dir,
                i2Steps: 0, c2Steps: 0, c2Dir: 'right',
                i3Steps: 0, totalSteps: i1 + tSteps, isLegacyStraight: false
            };
        } else {
            const tot = st.steps || 13;
            const rem = Math.max(2, tot - tSteps);
            const i1 = Math.ceil(rem / 2);
            const i2 = Math.floor(rem / 2);
            return {
                i1Steps: i1, c1Steps: tSteps, c1Dir: c1Dir,
                i2Steps: i2, c2Steps: 0, c2Dir: 'right',
                i3Steps: 0, totalSteps: i1 + tSteps + i2, isLegacyStraight: false
            };
        }
    } else if (shape === 'U_SHAPE') {
        if (st.turnType === 'landing' || st.turnType === 'turn_1') {
            return {
                i1Steps: 6, c1Steps: 1, c1Dir: 'right',
                i2Steps: 0, c2Steps: 1, c2Dir: 'right',
                i3Steps: 6, totalSteps: 14, isLegacyStraight: false
            };
        }
        return {
            i1Steps: 4, c1Steps: tSteps, c1Dir: 'right',
            i2Steps: 0, c2Steps: tSteps, c2Dir: 'right',
            i3Steps: 3, totalSteps: 4 + tSteps * 2 + 3, isLegacyStraight: false
        };
    } else {
        const sCount = st.steps || 14;
        return {
            i1Steps: sCount, c1Steps: 0, c1Dir: 'right',
            i2Steps: 0, c2Steps: 0, c2Dir: 'right',
            i3Steps: 0, totalSteps: sCount, isLegacyStraight: true
        };
    }
}
window.getStairModularConfig = getStairModularConfig;

function computeStairModularLayout(st) {
    const pitch = (typeof state !== 'undefined' && state.modulePitch) ? state.modulePitch : 910;
    const W = +((st && st.widthMm ? st.widthMm : 910) / pitch).toFixed(4) || 1.0;
    const cfg = getStairModularConfig(st);

    // 1段あたりの踏面長: モジュラー階段は 910mm = 4段 (0.25P = 227.5mm) を基準とする
    const stdTreadP = +(W * 0.25).toFixed(4);

    const turnRight = (d) => ({ x: -d.y, y: d.x });
    const turnLeft = (d) => ({ x: d.y, y: -d.x });
    const turnByDir = (d, dirStr) => {
        if (dirStr === 'right') return turnRight(d);
        if (dirStr === 'left') return turnLeft(d);
        return { x: d.x, y: d.y };
    };

    // 基準回転角の決定
    let rot = (((st && st.rotation ? st.rotation : 0) % 360) + 360) % 360;
    if (cfg.isLegacyStraight && st && st.w > st.h && !st.rotation) {
        rot = 90;
    } else if (st && st.rotation === undefined && !st.isModular && st.points && st.points.length === 3 && st.shapeType === 'L_SHAPE') {
        const p0 = st.points[0], p1 = st.points[1];
        const dx = p1.x - p0.x, dy = p1.y - p0.y;
        if (Math.abs(dy) >= Math.abs(dx)) {
            rot = dy <= 0 ? 0 : 180;
        } else {
            rot = dx >= 0 ? 90 : 270;
        }
    }

    let dBase = { x: 0, y: -1 }; // 0deg: 上(北)向き
    if (rot === 90) dBase = { x: 1, y: 0 };
    else if (rot === 180) dBase = { x: 0, y: 1 };
    else if (rot === 270) dBase = { x: -1, y: 0 };

    // I1 === 0 かつ C1 > 0 の場合 (パターン④: 下部廻りから直接入り、I2が基準方向 dBase へ進む)
    let dCur = { x: dBase.x, y: dBase.y };
    if (cfg.i1Steps === 0 && cfg.c1Steps > 0) {
        if (cfg.c1Dir === 'right') dCur = turnLeft(dBase);
        else if (cfg.c1Dir === 'left') dCur = turnRight(dBase);
    }

    const rawBlocks = [];
    let cursor = { x: 0, y: 0 };

    const pushStraightBlock = (id, stepCount) => {
        if (stepCount <= 0) return;
        let len = +(stepCount * stdTreadP).toFixed(4);
        if (cfg.isLegacyStraight && st && st.w && st.h) {
            len = Math.max(st.w, st.h);
        }
        const pIn = { x: cursor.x, y: cursor.y };
        const pOut = { x: cursor.x + dCur.x * len, y: cursor.y + dCur.y * len };
        const center = { x: (pIn.x + pOut.x) * 0.5, y: (pIn.y + pOut.y) * 0.5 };
        rawBlocks.push({
            id, kind: 'straight', steps: stepCount,
            len, width: W,
            dIn: { ...dCur }, dOut: { ...dCur },
            pIn, pOut, center
        });
        cursor = pOut;
    };

    const pushCornerBlock = (id, stepCount, turnDir) => {
        if (stepCount <= 0) return;
        const pIn = { x: cursor.x, y: cursor.y };
        const center = { x: pIn.x + dCur.x * (W * 0.5), y: pIn.y + dCur.y * (W * 0.5) };
        const dNext = turnByDir(dCur, turnDir);
        const pOut = { x: center.x + dNext.x * (W * 0.5), y: center.y + dNext.y * (W * 0.5) };
        rawBlocks.push({
            id, kind: 'corner', steps: stepCount, turnDir: turnDir || 'right',
            len: W, width: W,
            dIn: { ...dCur }, dOut: { ...dNext },
            pIn, pOut, center
        });
        cursor = pOut;
        dCur = dNext;
    };

    pushStraightBlock('I1', cfg.i1Steps);
    pushCornerBlock('C1', cfg.c1Steps, cfg.c1Dir);
    pushStraightBlock('I2', cfg.i2Steps);
    pushCornerBlock('C2', cfg.c2Steps, cfg.c2Dir);
    pushStraightBlock('I3', cfg.i3Steps);

    if (rawBlocks.length === 0) {
        pushStraightBlock('I1', 13);
    }

    // 外接バウンディングボックスの算出と (0,0) 正規化
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    rawBlocks.forEach(b => {
        const hx = (Math.abs(b.dIn.x) * b.len + Math.abs(b.dIn.y) * b.width) * 0.5;
        const hy = (Math.abs(b.dIn.y) * b.len + Math.abs(b.dIn.x) * b.width) * 0.5;
        b.x0 = b.center.x - hx;
        b.x1 = b.center.x + hx;
        b.y0 = b.center.y - hy;
        b.y1 = b.center.y + hy;
        minX = Math.min(minX, b.x0);
        minY = Math.min(minY, b.y0);
        maxX = Math.max(maxX, b.x1);
        maxY = Math.max(maxY, b.y1);
    });

    const shift = (pt) => ({ x: +(pt.x - minX).toFixed(4), y: +(pt.y - minY).toFixed(4) });
    const totalW = +Math.max(0.25, maxX - minX).toFixed(4);
    const totalH = +Math.max(0.25, maxY - minY).toFixed(4);

    const riserLines = [];
    const winderRays = [];
    const wallEdges = [];
    const innerDoubleLines = [];
    const stepPolygons3D = [];
    const insetP = +(W * 0.065).toFixed(4);

    let globalStepIdx = 0;

    rawBlocks.forEach((b, idx) => {
        b.center = shift(b.center);
        b.pIn = shift(b.pIn);
        b.pOut = shift(b.pOut);
        b.x0 = +(b.x0 - minX).toFixed(4);
        b.x1 = +(b.x1 - minX).toFixed(4);
        b.y0 = +(b.y0 - minY).toFixed(4);
        b.y1 = +(b.y1 - minY).toFixed(4);

        const dIn = b.dIn;
        const nL = turnLeft(dIn);
        const nR = turnRight(dIn);

        if (b.kind === 'straight') {
            const BL = { x: b.pIn.x + nL.x * (W * 0.5), y: b.pIn.y + nL.y * (W * 0.5) };
            const BR = { x: b.pIn.x + nR.x * (W * 0.5), y: b.pIn.y + nR.y * (W * 0.5) };
            const FL = { x: b.pOut.x + nL.x * (W * 0.5), y: b.pOut.y + nL.y * (W * 0.5) };
            const FR = { x: b.pOut.x + nR.x * (W * 0.5), y: b.pOut.y + nR.y * (W * 0.5) };
            b.poly = [BL, BR, FR, FL];

            // 両脇の壁ライン + 二重線
            wallEdges.push({ p1: BL, p2: FL, normal: nR, side: 'left' });
            wallEdges.push({ p1: BR, p2: FR, normal: nL, side: 'right' });
            innerDoubleLines.push({
                p1: { x: BL.x + nR.x * insetP, y: BL.y + nR.y * insetP },
                p2: { x: FL.x + nR.x * insetP, y: FL.y + nR.y * insetP },
                side: 'left'
            });
            innerDoubleLines.push({
                p1: { x: BR.x + nL.x * insetP, y: BR.y + nL.y * insetP },
                p2: { x: FR.x + nL.x * insetP, y: FR.y + nL.y * insetP },
                side: 'right'
            });

            // 段鼻線と3D踏板ポリゴン
            for (let k = 0; k <= b.steps; k++) {
                const t = k / b.steps;
                const qx = b.pIn.x + dIn.x * (b.len * t);
                const qy = b.pIn.y + dIn.y * (b.len * t);
                const sL = { x: qx + nL.x * (W * 0.5), y: qy + nL.y * (W * 0.5) };
                const sR = { x: qx + nR.x * (W * 0.5), y: qy + nR.y * (W * 0.5) };
                riserLines.push({ p1: sL, p2: sR });

                if (k < b.steps) {
                    const tNext = (k + 1) / b.steps;
                    const qnx = b.pIn.x + dIn.x * (b.len * tNext);
                    const qny = b.pIn.y + dIn.y * (b.len * tNext);
                    const nLpt = { x: qnx + nL.x * (W * 0.5), y: qny + nL.y * (W * 0.5) };
                    const nRpt = { x: qnx + nR.x * (W * 0.5), y: qny + nR.y * (W * 0.5) };
                    stepPolygons3D.push({
                        stepIndex: globalStepIdx++,
                        kind: 'straight',
                        points: [sL, sR, nRpt, nLpt]
                    });
                }
            }
        } else {
            // Corner / Landing Block (W x W)
            const BL = { x: b.center.x - dIn.x * (W * 0.5) + nL.x * (W * 0.5), y: b.center.y - dIn.y * (W * 0.5) + nL.y * (W * 0.5) };
            const BR = { x: b.center.x - dIn.x * (W * 0.5) + nR.x * (W * 0.5), y: b.center.y - dIn.y * (W * 0.5) + nR.y * (W * 0.5) };
            const FL = { x: b.center.x + dIn.x * (W * 0.5) + nL.x * (W * 0.5), y: b.center.y + dIn.y * (W * 0.5) + nL.y * (W * 0.5) };
            const FR = { x: b.center.x + dIn.x * (W * 0.5) + nR.x * (W * 0.5), y: b.center.y + dIn.y * (W * 0.5) + nR.y * (W * 0.5) };
            b.poly = [BL, BR, FR, FL];

            // 入口側の段鼻線
            riserLines.push({ p1: BL, p2: BR });

            const isLastBlock = (idx === rawBlocks.length - 1);
            const tDir = b.turnDir || 'right';

            if (tDir === 'right') {
                // 右折: 左辺(BL->FL)と前辺(FL->FR)が外壁、右辺(BR->FR)が出口段鼻
                riserLines.push({ p1: BR, p2: FR });
                wallEdges.push({ p1: BL, p2: FL, normal: nR, side: 'left' });
                wallEdges.push({ p1: FL, p2: FR, normal: { x: -dIn.x, y: -dIn.y }, side: 'front' });
                const cornerMiter = { x: FL.x + nR.x * insetP - dIn.x * insetP, y: FL.y + nR.y * insetP - dIn.y * insetP };
                innerDoubleLines.push({
                    p1: { x: BL.x + nR.x * insetP, y: BL.y + nR.y * insetP },
                    p2: cornerMiter,
                    side: 'left'
                });
                innerDoubleLines.push({
                    p1: cornerMiter,
                    p2: { x: FR.x - dIn.x * insetP, y: FR.y - dIn.y * insetP },
                    side: 'front'
                });
            } else if (tDir === 'left') {
                // 左折: 右辺(BR->FR)と前辺(FR->FL)が外壁、左辺(BL->FL)が出口段鼻
                riserLines.push({ p1: BL, p2: FL });
                wallEdges.push({ p1: BR, p2: FR, normal: nL, side: 'right' });
                wallEdges.push({ p1: FR, p2: FL, normal: { x: -dIn.x, y: -dIn.y }, side: 'front' });
                const cornerMiter = { x: FR.x + nL.x * insetP - dIn.x * insetP, y: FR.y + nL.y * insetP - dIn.y * insetP };
                innerDoubleLines.push({
                    p1: { x: BR.x + nL.x * insetP, y: BR.y + nL.y * insetP },
                    p2: cornerMiter,
                    side: 'right'
                });
                innerDoubleLines.push({
                    p1: cornerMiter,
                    p2: { x: FL.x - dIn.x * insetP, y: FL.y - dIn.y * insetP },
                    side: 'front'
                });
            } else if (tDir === 'both') {
                // 左右両側開放 (登りきり両側出口): 左辺・右辺ともに出口、前辺(FL->FR)のみ外壁
                riserLines.push({ p1: BL, p2: FL });
                riserLines.push({ p1: BR, p2: FR });
                wallEdges.push({ p1: FL, p2: FR, normal: { x: -dIn.x, y: -dIn.y }, side: 'front' });
                innerDoubleLines.push({
                    p1: { x: FL.x - dIn.x * insetP, y: FL.y - dIn.y * insetP },
                    p2: { x: FR.x - dIn.x * insetP, y: FR.y - dIn.y * insetP },
                    side: 'front'
                });
            } else {
                // 直進踊り場 ('straight'): 左辺・右辺が外壁、前辺が出口段鼻
                riserLines.push({ p1: FL, p2: FR });
                wallEdges.push({ p1: BL, p2: FL, normal: nR, side: 'left' });
                wallEdges.push({ p1: BR, p2: FR, normal: nL, side: 'right' });
                innerDoubleLines.push({
                    p1: { x: BL.x + nR.x * insetP, y: BL.y + nR.y * insetP },
                    p2: { x: FL.x + nR.x * insetP, y: FL.y + nR.y * insetP },
                    side: 'left'
                });
                innerDoubleLines.push({
                    p1: { x: BR.x + nL.x * insetP, y: BR.y + nL.y * insetP },
                    p2: { x: FR.x + nL.x * insetP, y: FR.y + nL.y * insetP },
                    side: 'right'
                });
            }

            // 廻り段の親柱(内角)ピボットからの放射割り線と3Dウェッジポリゴン
            const dOut = b.dOut;
            const isPerpTurn = (tDir === 'right' || tDir === 'left');
            if (b.steps >= 2 && isPerpTurn) {
                const pInner = {
                    x: b.center.x + (-dIn.x + dOut.x) * (W * 0.5),
                    y: b.center.y + (-dIn.y + dOut.y) * (W * 0.5)
                };
                const pOuter = {
                    x: b.center.x + (dIn.x - dOut.x) * (W * 0.5),
                    y: b.center.y + (dIn.y - dOut.y) * (W * 0.5)
                };
                const hitPointAtAngle = (thetaRad) => {
                    const c = Math.cos(thetaRad);
                    const s = Math.sin(thetaRad);
                    const denom = Math.max(c, s, 1e-6);
                    const rx = (-c * dOut.x + s * dIn.x) / denom;
                    const ry = (-c * dOut.y + s * dIn.y) / denom;
                    return {
                        x: pInner.x + W * rx,
                        y: pInner.y + W * ry
                    };
                };

                for (let k = 1; k < b.steps; k++) {
                    const theta = (k / b.steps) * (Math.PI * 0.5);
                    const pHit = hitPointAtAngle(theta);
                    winderRays.push({ p1: pInner, p2: pHit });
                }

                for (let k = 0; k < b.steps; k++) {
                    const th0 = (k / b.steps) * (Math.PI * 0.5);
                    const th1 = ((k + 1) / b.steps) * (Math.PI * 0.5);
                    const pt0 = hitPointAtAngle(th0);
                    const pt1 = hitPointAtAngle(th1);
                    const mid45 = Math.PI * 0.25;
                    const polyPts = (th0 < mid45 - 1e-4 && th1 > mid45 + 1e-4)
                        ? [pInner, pt0, pOuter, pt1]
                        : [pInner, pt0, pt1];
                    stepPolygons3D.push({
                        stepIndex: globalStepIdx++,
                        kind: 'winder',
                        points: polyPts
                    });
                }
            } else {
                // 1段フラット踊り場 (または直進中間踊り場)
                if (b.steps >= 2 && !isPerpTurn) {
                    // 直進で複数段指定された場合は均等分割
                    for (let k = 1; k < b.steps; k++) {
                        const t = k / b.steps;
                        const qx = b.pIn.x + dIn.x * (W * t);
                        const qy = b.pIn.y + dIn.y * (W * t);
                        riserLines.push({
                            p1: { x: qx + nL.x * (W * 0.5), y: qy + nL.y * (W * 0.5) },
                            p2: { x: qx + nR.x * (W * 0.5), y: qy + nR.y * (W * 0.5) }
                        });
                    }
                }
                for (let k = 0; k < b.steps; k++) {
                    stepPolygons3D.push({
                        stepIndex: globalStepIdx++,
                        kind: 'landing',
                        points: [BL, BR, FR, FL]
                    });
                }
            }
        }
    });

    // 昇降センターライン & 入口・出口矢印データの構築
    const firstBlock = rawBlocks[0];
    const lastBlock = rawBlocks[rawBlocks.length - 1];
    const entryPoint = { ...firstBlock.pIn };
    const entryDir = { ...firstBlock.dIn };

    const centerPath = [entryPoint];
    rawBlocks.forEach(b => {
        if (b.kind === 'corner') {
            centerPath.push({ ...b.center });
        }
    });

    const exitArrows = [];
    if (lastBlock.kind === 'corner' && lastBlock.turnDir === 'both') {
        // 左右両側登りきり分岐
        const dL = turnLeft(lastBlock.dIn);
        const dR = turnRight(lastBlock.dIn);
        const pExitL = { x: lastBlock.center.x + dL.x * (W * 0.5), y: lastBlock.center.y + dL.y * (W * 0.5) };
        const pExitR = { x: lastBlock.center.x + dR.x * (W * 0.5), y: lastBlock.center.y + dR.y * (W * 0.5) };
        exitArrows.push({ from: { ...lastBlock.center }, to: pExitL, dir: dL });
        exitArrows.push({ from: { ...lastBlock.center }, to: pExitR, dir: dR });
    } else {
        centerPath.push({ ...lastBlock.pOut });
        exitArrows.push({
            from: centerPath[centerPath.length - 2] || entryPoint,
            to: { ...lastBlock.pOut },
            dir: { ...lastBlock.dOut }
        });
    }

    return {
        config: cfg,
        widthP: W,
        totalW,
        totalH,
        totalSteps: Math.max(1, globalStepIdx),
        blocks: rawBlocks,
        riserLines,
        winderRays,
        wallEdges,
        innerDoubleLines,
        stepPolygons3D,
        entryPoint,
        entryDir,
        centerPath,
        exitArrows
    };
}
window.computeStairModularLayout = computeStairModularLayout;

function syncStairModularBounds(st) {
    if (!st) return st;
    const layout = computeStairModularLayout(st);
    st.w = layout.totalW;
    st.h = layout.totalH;
    st.steps = layout.totalSteps;
    st.points = [
        { x: st.x, y: st.y },
        { x: +(st.x + st.w).toFixed(3), y: st.y },
        { x: +(st.x + st.w).toFixed(3), y: +(st.y + st.h).toFixed(3) },
        { x: st.x, y: +(st.y + st.h).toFixed(3) }
    ];
    return layout;
}
window.syncStairModularBounds = syncStairModularBounds;

/**
 * 下の階で描いた「上に登る階段 (direction: UP)」を自動で上の階に表示・同期するエンジン
 * ・上の階へ投影された連動階段は既定で「立面不出力 (no3DOutput: true)」「平面不出力: OFF (no2DOutput: false)」となり、
 *   2階の平面図には同じ位置・形状で表示されつつ、3Dでは1階から登ってくる階段メッシュと二重にならない。
 * ・プロパティで「平面不出力」「立面不出力」を個別にON/OFF可能。
 */
function syncUpperFloorStairs() {
    if (typeof state === 'undefined' || !state.floors) return;
    const floorOrder = [0, 1, 2, 3];
    for (const f of floorOrder) {
        const lowerFl = state.floors[f];
        const upperFl = state.floors[f + 1];
        if (!lowerFl || !upperFl) continue;
        if (!Array.isArray(lowerFl.stairs)) lowerFl.stairs = [];
        if (!Array.isArray(upperFl.stairs)) upperFl.stairs = [];

        // 下の階の「上に登る階段 (UP)」かつ自身が連動コピーでない階段を抽出
        const sourceUpStairs = lowerFl.stairs.filter(s =>
            s && !s.linkedFromStairId && (s.direction || 'UP') === 'UP' && !s.suppressUpperAutoCopy
        );
        const validSourceIds = new Set(sourceUpStairs.map(s => s.id));

        // 削除された、またはDNに変更された元階段の連動コピーを上の階から除去
        upperFl.stairs = upperFl.stairs.filter(us => {
            if (us && us.linkedFromFloor === f && us.linkedFromStairId) {
                return validSourceIds.has(us.linkedFromStairId);
            }
            return true;
        });

        // 各UP階段を上の階へ自動同期（すでに上の階の同一座標に手動階段が存在する場合はそれを連動化または重複生成を回避）
        sourceUpStairs.forEach(src => {
            let linked = upperFl.stairs.find(us => us && us.linkedFromStairId === src.id);
            if (!linked) {
                const samePosStair = upperFl.stairs.find(us =>
                    us && !us.linkedFromStairId &&
                    Math.abs((us.x || 0) - (src.x || 0)) < 0.15 &&
                    Math.abs((us.y || 0) - (src.y || 0)) < 0.15
                );
                if (samePosStair) {
                    linked = samePosStair;
                    linked.linkedFromStairId = src.id;
                    linked.linkedFromFloor = f;
                    if (linked.no3DOutput === undefined) linked.no3DOutput = true;
                    if (linked.no2DOutput === undefined) linked.no2DOutput = false;
                } else {
                    linked = JSON.parse(JSON.stringify(src));
                    linked.id = 'stair_upper_' + src.id;
                    linked.linkedFromStairId = src.id;
                    linked.linkedFromFloor = f;
                    linked.no3DOutput = true;   // 上の階の複写階段は既定で立面不出力(3D二重描画防止)
                    linked.no2DOutput = false;  // 平面図には既定で表示
                    upperFl.stairs.push(linked);
                }
            } else {
                const keepId = linked.id;
                const keepNo2D = !!linked.no2DOutput;
                const keepNo3D = linked.no3DOutput !== undefined ? !!linked.no3DOutput : true;
                const syncedProps = [
                    'shapeType', 'patternKey', 'isModular', 'landingTop', 'rotation',
                    'i1Steps', 'c1Steps', 'c1Dir', 'i2Steps', 'c2Steps', 'c2Dir', 'i3Steps',
                    'x', 'y', 'w', 'h', 'widthMm', 'direction', 'turnType',
                    'stairStyle', 'stairHandrail', 'handrail', 'steps', 'treadMm', 'riserMm', 'label'
                ];
                syncedProps.forEach(k => {
                    if (src[k] !== undefined) linked[k] = src[k];
                });
                if (src.points) linked.points = JSON.parse(JSON.stringify(src.points));
                linked.id = keepId;
                linked.linkedFromStairId = src.id;
                linked.linkedFromFloor = f;
                linked.no2DOutput = keepNo2D;
                linked.no3DOutput = keepNo3D;
            }
        });
    }
}
window.syncUpperFloorStairs = syncUpperFloorStairs;

/**
 * 上の階で連動階段の位置や段数・形状を編集した際、下の階の元階段へ逆同期するヘルパー
 */
function syncLinkedStairBackToSource(st) {
    if (!st || !st.linkedFromStairId || st.linkedFromFloor === undefined) return;
    const srcFl = state.floors && state.floors[st.linkedFromFloor];
    if (!srcFl || !Array.isArray(srcFl.stairs)) return;
    const src = srcFl.stairs.find(s => s && s.id === st.linkedFromStairId);
    if (!src) return;
    const syncedProps = [
        'shapeType', 'patternKey', 'isModular', 'landingTop', 'rotation',
        'i1Steps', 'c1Steps', 'c1Dir', 'i2Steps', 'c2Steps', 'c2Dir', 'i3Steps',
        'x', 'y', 'w', 'h', 'widthMm', 'turnType',
        'stairStyle', 'stairHandrail', 'handrail', 'steps', 'treadMm', 'riserMm'
    ];
    syncedProps.forEach(k => {
        if (st[k] !== undefined) src[k] = st[k];
    });
    if (st.points) src.points = JSON.parse(JSON.stringify(st.points));
}
window.syncLinkedStairBackToSource = syncLinkedStairBackToSource;

function drawStair2D(st, isLight) {
    if (!st) return;
    const isSelected = state.selectedItem && state.selectedItem.kind === 'stair' && state.selectedItem.id === st.id;
    // 平面不出力 (no2DOutput) がONの場合：未選択時は2D平面図に一切描画しない（選択中のみ編集用ゴースト枠を表示）
    if ((st.no2DOutput || st.hide2D) && !isSelected) return;
    if ((st.x === undefined || st.w === undefined) && st.points && st.points.length >= 2) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        st.points.forEach(pt => {
            minX = Math.min(minX, pt.x);
            minY = Math.min(minY, pt.y);
            maxX = Math.max(maxX, pt.x);
            maxY = Math.max(maxY, pt.y);
        });
        st.x = minX;
        st.y = minY;
        const widthP = (st.widthMm || 910) / (state.modulePitch || 910);
        st.w = +(Math.max(widthP, maxX - minX)).toFixed(3) || widthP;
        st.h = +(Math.max(widthP, maxY - minY)).toFixed(3) || (widthP * 2);
    }

    const layout = computeStairModularLayout(st);
    if (st.isModular || st.i1Steps !== undefined || st.patternKey) {
        st.w = layout.totalW;
        st.h = layout.totalH;
    }

    const curX = (st.x !== undefined && !isNaN(st.x)) ? st.x : 0;
    const curY = (st.y !== undefined && !isNaN(st.y)) ? st.y : 0;
    const zoom = state.cam2d.zoom;
    const p = worldPToScreen(curX, curY);
    const dir = st.direction || 'UP';
    const isOpen = st.stairStyle === 'open';
    const handrail = st.handrail || st.stairHandrail || 'both';

    ctx.save();
    ctx.translate(p.x, p.y);
    if (st.no2DOutput || st.hide2D) {
        ctx.globalAlpha = 0.35;
    }

    // 1. 各ブロックの背景塗潰し（建築CAD木目ベージュ調）
    ctx.fillStyle = isOpen ? 'rgba(237, 213, 180, 0.45)' : (isSelected ? '#fde68a' : '#edd5b4');
    layout.blocks.forEach(b => {
        if (!b.poly || b.poly.length < 3) return;
        ctx.beginPath();
        ctx.moveTo(b.poly[0].x * zoom, b.poly[0].y * zoom);
        for (let i = 1; i < b.poly.length; i++) {
            ctx.lineTo(b.poly[i].x * zoom, b.poly[i].y * zoom);
        }
        ctx.closePath();
        ctx.fill();
    });

    // 2. 段鼻線（直進ステップ境界）および廻り段の親柱放射割り線
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.0;
    if (isOpen) ctx.setLineDash([4, 2]);
    layout.riserLines.forEach(seg => {
        ctx.beginPath();
        ctx.moveTo(seg.p1.x * zoom, seg.p1.y * zoom);
        ctx.lineTo(seg.p2.x * zoom, seg.p2.y * zoom);
        ctx.stroke();
    });
    layout.winderRays.forEach(ray => {
        ctx.beginPath();
        ctx.moveTo(ray.p1.x * zoom, ray.p1.y * zoom);
        ctx.lineTo(ray.p2.x * zoom, ray.p2.y * zoom);
        ctx.stroke();
    });
    ctx.setLineDash([]);

    // 3. 壁・手すり内側二重線
    if (handrail !== 'none') {
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.0;
        layout.innerDoubleLines.forEach(seg => {
            if (handrail === 'left' && seg.side === 'right') return;
            if (handrail === 'right' && seg.side === 'left') return;
            ctx.beginPath();
            ctx.moveTo(seg.p1.x * zoom, seg.p1.y * zoom);
            ctx.lineTo(seg.p2.x * zoom, seg.p2.y * zoom);
            ctx.stroke();
        });
    }

    // 4. 外周壁太線（登り口・登りきり開口部を除く壁面境界）
    ctx.strokeStyle = isSelected ? '#f59e0b' : '#1e293b';
    ctx.lineWidth = isSelected ? 2.4 : 1.5;
    layout.wallEdges.forEach(edge => {
        ctx.beginPath();
        ctx.moveTo(edge.p1.x * zoom, edge.p1.y * zoom);
        ctx.lineTo(edge.p2.x * zoom, edge.p2.y * zoom);
        ctx.stroke();
    });

    // 5. 昇降センターライン・始点丸印・UP/DN表記・登りきりV字矢印
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.15;

    if (layout.centerPath.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(layout.centerPath[0].x * zoom, layout.centerPath[0].y * zoom);
        for (let i = 1; i < layout.centerPath.length; i++) {
            ctx.lineTo(layout.centerPath[i].x * zoom, layout.centerPath[i].y * zoom);
        }
        ctx.stroke();
    }

    // 両側分岐などの追加矢印線とV字矢じり
    layout.exitArrows.forEach(arr => {
        ctx.beginPath();
        ctx.moveTo(arr.from.x * zoom, arr.from.y * zoom);
        ctx.lineTo(arr.to.x * zoom, arr.to.y * zoom);
        ctx.stroke();

        const tipX = arr.to.x * zoom;
        const tipY = arr.to.y * zoom;
        const dx = arr.dir.x;
        const dy = arr.dir.y;
        const nx = -dy;
        const ny = dx;
        const headLen = Math.max(6, Math.min(11, layout.widthP * zoom * 0.24));
        const headHalfW = headLen * 0.48;

        ctx.beginPath();
        ctx.moveTo(tipX - dx * headLen + nx * headHalfW, tipY - dy * headLen + ny * headHalfW);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(tipX - dx * headLen - nx * headHalfW, tipY - dy * headLen - ny * headHalfW);
        ctx.stroke();
    });

    // 始点白抜き丸印 'o' と 'UP' / 'DN' 文字
    const startX = layout.entryPoint.x * zoom;
    const startY = layout.entryPoint.y * zoom;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(startX, startY, 3.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const labelText = dir === 'DOWN' ? 'DN' : 'UP';
    const labelOffset = 10;
    const lx = startX - layout.entryDir.x * labelOffset;
    const ly = startY - layout.entryDir.y * labelOffset;
    ctx.fillStyle = '#3b1d11';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, lx, ly);

    ctx.restore();
}

/**
 * 部屋が「階段を覆い隠す床貼り部屋」かどうかの共通判定ヘルパー
 * - 階段室(STAIR)・吹抜(VOID)・中庭(NAKANIWA)・天井(TENJO)は階段開口空間のため被覆しない
 * - 下の階から複写された階段（または2階以上の階段）に対して、1〜2段目などの上に床として貼られた
 *   「収納」「クローゼット」「トイレ」「廊下・ホール」「洋室」等の部屋範囲を優先する
 */
function isStairOpenRoom(rm) {
    if (!rm) return false;
    const rType = String(rm.type || '').toUpperCase();
    if (rType === 'STAIR' || rType === 'VOID' || rType === 'NAKANIWA' || rType === 'TENJO') return true;
    const rName = String(rm.customName || rm.name || '');
    if (/階段|吹抜|吹き抜け|中庭/.test(rName)) return true;
    return false;
}
window.isStairOpenRoom = isStairOpenRoom;

function getRoomsMaskingUpperStair(fl, st) {
    if (!fl || !Array.isArray(fl.rooms) || !st) return [];
    const isUpperOrLinked = (st.linkedFromStairId !== undefined && st.linkedFromStairId !== null)
        || (state.currentFloor >= 2 && st.direction === 'DOWN');
    if (!isUpperOrLinked) return [];

    // 階段が現在選択中でかつ階段ツール使用中の場合は全体を確認できるようマスクしない
    const isStairActivelyEdited = state.activeTool === 'stair'
        && state.selectedItem && state.selectedItem.kind === 'stair' && state.selectedItem.id === st.id;
    if (isStairActivelyEdited) return [];

    const sx0 = (st.x !== undefined && !isNaN(st.x)) ? st.x : 0;
    const sy0 = (st.y !== undefined && !isNaN(st.y)) ? st.y : 0;
    const sw = (st.w !== undefined && !isNaN(st.w)) ? st.w : 1;
    const sh = (st.h !== undefined && !isNaN(st.h)) ? st.h : 2;
    const sx1 = sx0 + sw;
    const sy1 = sy0 + sh;
    const stairArea = Math.max(0.01, sw * sh);

    const hasExplicitStairOpenRoomOnFloor = fl.rooms.some(r => {
        if (!isStairOpenRoom(r)) return false;
        const ox = Math.max(0, Math.min(sx1, r.x + r.w) - Math.max(sx0, r.x));
        const oy = Math.max(0, Math.min(sy1, r.y + r.h) - Math.max(sy0, r.y));
        return (ox * oy) > 0.02;
    });

    return fl.rooms.filter(rm => {
        if (!rm || isStairOpenRoom(rm)) return false;
        const rx0 = rm.x, ry0 = rm.y, rx1 = rm.x + rm.w, ry1 = rm.y + rm.h;
        const ox = Math.max(0, Math.min(sx1, rx1) - Math.max(sx0, rx0));
        const oy = Math.max(0, Math.min(sy1, ry1) - Math.max(sy0, ry0));
        const overlapArea = ox * oy;
        if (overlapArea <= 0.01) return false;

        // もしこの階に「階段室」や「吹抜」が明示的に定義されている場合は、それ以外の全ての床貼り部屋を優先して階段をマスクする
        if (hasExplicitStairOpenRoomOnFloor) return true;

        // 階段室が未定義でも、階段の一部分（例：登りはじめ1〜3段目など、重なり面積が階段全体の85%未満）に重なる部屋（収納・クローゼット・廊下等）は優先してマスクする
        if (overlapArea < stairArea * 0.85) return true;

        // 部屋自体が収納・クローゼット・トイレ・洗面等の小部屋（4.5帖以下）で階段の上に配置された場合も部屋を優先
        const rmAreaP = rm.w * rm.h;
        const rType = String(rm.type || '').toUpperCase();
        if (['CLOSET', 'SHUNO', 'STORAGE', 'WIC', 'TOILET', 'SENMEN', 'DATSUI'].includes(rType) && rmAreaP <= 4.5) {
            return true;
        }
        return false;
    });
}
window.getRoomsMaskingUpperStair = getRoomsMaskingUpperStair;

function drawUpperFloorRoomMaskOverStairs2D(fl, W, H, isLight) {
    const maskedRoomSet = new Set();
    const maskedRooms = [];
    (fl.stairs || []).forEach(st => {
        const rooms = getRoomsMaskingUpperStair(fl, st);
        rooms.forEach(rm => {
            if (!maskedRoomSet.has(rm.id)) {
                maskedRoomSet.add(rm.id);
                maskedRooms.push(rm);
            }
        });
    });
    if (maskedRooms.length === 0) return;

    maskedRooms.forEach(rm => {
        const p1 = worldPToScreen(rm.x, rm.y);
        const wPx = rm.w * state.cam2d.zoom;
        const hPx = rm.h * state.cam2d.zoom;
        const hasPoly = Array.isArray(rm.points) && rm.points.length >= 3;

        ctx.save();
        ctx.beginPath();
        if (hasPoly) {
            rm.points.forEach((pt, idx) => {
                const sp = worldPToScreen(pt.x, pt.y);
                if (idx === 0) ctx.moveTo(sp.x, sp.y);
                else ctx.lineTo(sp.x, sp.y);
            });
            ctx.closePath();
        } else {
            ctx.rect(p1.x, p1.y, wPx, hPx);
        }
        ctx.clip();

        // 1. クリップ領域内の階段描画をキャンパス背景色で完全に消去し、方眼グリッドを復元
        ctx.fillStyle = isLight ? '#ffffff' : '#0b1120';
        ctx.fillRect(p1.x - 4, p1.y - 4, wPx + 8, hPx + 8);
        drawGrid2D(W, H, isLight);
        ctx.restore();

        // 2. 部屋（床色・枠・部屋名・帖数ラベル）を最優先で再描画
        drawRoom2D(rm, isLight);
    });
}

/**
 * L型キッチンの回転角 rot (0/90/180/270) および flipX/flipY から、
 * L字コーナー（2つのウィングの交点・配置基準角）が外接矩形のどの角にあるかを返す単一情報源ヘルパー
 * - rot = 0°   : 北西角 (左上 cornerRight=false, cornerBottom=false)
 * - rot = 90°  : 北東角 (右上 cornerRight=true,  cornerBottom=false)
 * - rot = 180° : 南東角 (右下 cornerRight=true,  cornerBottom=true)
 * - rot = 270° : 南西角 (左下 cornerRight=false, cornerBottom=true)
 */
function resolveKitchenLCornerState(fxOrRot, flipX = false, flipY = false) {
    let rawRot = 0;
    let fxFlipX = !!flipX;
    let fxFlipY = !!flipY;
    if (fxOrRot && typeof fxOrRot === 'object') {
        rawRot = fxOrRot.rot || 0;
        fxFlipX = !!fxOrRot.flipX;
        fxFlipY = !!fxOrRot.flipY;
    } else if (typeof fxOrRot === 'number') {
        rawRot = fxOrRot;
    }
    const rot = ((rawRot % 360) + 360) % 360;
    let cornerRight = (rot === 90 || rot === 180);
    let cornerBottom = (rot === 180 || rot === 270);
    if (fxFlipX) cornerRight = !cornerRight;
    if (fxFlipY) cornerBottom = !cornerBottom;
    const cornerLabel = (!cornerRight && !cornerBottom) ? '↖北西角(0°)'
        : (cornerRight && !cornerBottom) ? '↗北東角(90°)'
        : (cornerRight && cornerBottom) ? '↘南東角(180°)'
        : '↙南西角(270°)';
    return { rot, cornerRight, cornerBottom, cornerLabel };
}
window.resolveKitchenLCornerState = resolveKitchenLCornerState;

function drawFixture2D(fx, isLight) {
    const p = worldPToScreen(fx.x, fx.y);
    const wPx = fx.w * state.cam2d.zoom;
    const hPx = fx.h * state.cam2d.zoom;
    const isSelected = state.selectedItem && state.selectedItem.kind === 'fixture' && state.selectedItem.id === fx.id;
    const cat = fx.category || fx.type;
    const isKitchenL = cat === 'KITCHEN_L' || (fx.fxData && fx.fxData.kitchenType === 'L');
    const rot = (((fx.rot || 0) % 360) + 360) % 360;
    const isRot90or270 = (rot === 90 || rot === 270);
    // 90°/270°回転時は fx.w (画面X幅) と fx.h (画面Y奥行) が入れ替わっているため、
    // 回転後ローカル座標系では未回転の器具本来サイズ (localW = 器具正面幅, localH = 器具奥行) で描画する！
    const localW = isRot90or270 ? hPx : wPx;
    const localH = isRot90or270 ? wPx : hPx;

    ctx.save();
    if (isKitchenL) {
        // L型キッチンは rot (0/90/180/270) および flipX/flipY からコーナー位置を算出し、そのコーナーを原点にL字を描画する
        const cState = resolveKitchenLCornerState(fx);
        ctx.translate(p.x + wPx / 2, p.y + hPx / 2);
        ctx.scale(cState.cornerRight ? -1 : 1, cState.cornerBottom ? -1 : 1);
        ctx.translate(-wPx / 2, -hPx / 2);
    } else {
        ctx.translate(p.x + wPx / 2, p.y + hPx / 2);
        if (rot !== 0) {
            ctx.rotate((rot * Math.PI) / 180);
        }
        if (fx.flipX) ctx.scale(-1, 1);
        if (fx.flipY) ctx.scale(1, -1);
        ctx.translate(-localW / 2, -localH / 2);
    }

    ctx.fillStyle = isSelected ? '#fef3c7' : '#ffffff';
    ctx.strokeStyle = isSelected ? '#f59e0b' : '#334155';
    ctx.lineWidth = isSelected ? 2.5 : 1.3;

    if (isKitchenL) {
        // L型キッチン（6頂点L字ポリゴン＋コーナー目地＋シンク＋3口コンロ＋選択時のコーナー配置基準点●）
        const pitch = state.modulePitch || 910;
        const depthMm = (fx.fxData && fx.fxData.lDepth) ? fx.fxData.lDepth : 650;
        const depthP = depthMm / pitch;
        const dPx = Math.min(Math.min(wPx, hPx) * 0.48, Math.max(12, depthP * state.cam2d.zoom));

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(wPx, 0);
        ctx.lineTo(wPx, dPx);
        ctx.lineTo(dPx, dPx);
        ctx.lineTo(dPx, hPx);
        ctx.lineTo(0, hPx);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // コーナー接合部ライン
        ctx.beginPath();
        ctx.moveTo(dPx, 0);
        ctx.lineTo(dPx, dPx);
        ctx.moveTo(0, dPx);
        ctx.lineTo(dPx, dPx);
        ctx.stroke();

        // 横ウィングにシンクを描画
        const wingXLen = wPx - dPx;
        if (wingXLen > 24 && dPx > 14) {
            const sinkW = Math.min(wingXLen * 0.55, 38);
            const sinkH = dPx * 0.64;
            const sinkX = dPx + (wingXLen - sinkW) * 0.45;
            const sinkY = (dPx - sinkH) / 2;
            ctx.strokeRect(sinkX, sinkY, sinkW, sinkH);
        }
        // 縦ウィングに3口コンロを描画
        const wingYLen = hPx - dPx;
        if (wingYLen > 20 && dPx > 14) {
            const stoveX = dPx / 2;
            const stoveY = dPx + wingYLen * 0.52;
            const r = Math.min(4.0, dPx * 0.16);
            ctx.beginPath();
            ctx.arc(stoveX - r * 0.8, stoveY - r * 1.2, r, 0, Math.PI * 2);
            ctx.arc(stoveX - r * 0.8, stoveY + r * 1.2, r, 0, Math.PI * 2);
            ctx.arc(stoveX + r * 1.1, stoveY, r * 0.85, 0, Math.PI * 2);
            ctx.stroke();
        }
        // コーナー配置基準点（赤い●印）をL字の外角原点 (0,0) に明示表示
        if (isSelected) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(3, 3, 4.5, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (cat === 'KITCHEN' || (cat && cat.startsWith('KITCHEN'))) {
        ctx.fillRect(0, 0, localW, localH);
        ctx.strokeRect(0, 0, localW, localH);
        if (localW > 36 && localH > 14) {
            const sinkW = Math.min(localW * 0.35, 42);
            const sinkH = localH * 0.65;
            ctx.strokeRect(6, (localH - sinkH) / 2, sinkW, sinkH);
            const stoveX = localW - Math.min(localW * 0.32, 36);
            const stoveY = localH / 2;
            ctx.beginPath();
            ctx.arc(stoveX + 8, stoveY - 4, 4, 0, Math.PI * 2);
            ctx.arc(stoveX + 8, stoveY + 4, 4, 0, Math.PI * 2);
            ctx.arc(stoveX + 18, stoveY, 3.5, 0, Math.PI * 2);
            ctx.stroke();
        }
    } else if (cat === 'UB') {
        ctx.fillRect(0, 0, localW, localH);
        ctx.strokeRect(0, 0, localW, localH);
        const tubH = localH * 0.46;
        ctx.beginPath();
        ctx.roundRect(4, 4, Math.max(4, localW - 8), Math.max(4, tubH), 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(8, 7, Math.max(4, localW - 16), Math.max(4, tubH - 6), 4);
        ctx.stroke();
    } else if (cat === 'VANITY') {
        ctx.fillRect(0, 0, localW, localH);
        ctx.strokeRect(0, 0, localW, localH);
        if (localW > 18 && localH > 12) {
            ctx.beginPath();
            ctx.ellipse(localW / 2, localH * 0.54, Math.min(localW * 0.34, 16), Math.min(localH * 0.32, 10), 0, 0, Math.PI * 2);
            ctx.stroke();
            // 水栓カラン小丸
            ctx.beginPath();
            ctx.arc(localW / 2, localH * 0.16, 2.2, 0, Math.PI * 2);
            ctx.stroke();
        }
    } else if (cat === 'TOILET_FIX') {
        // トイレ便器：背面(y=0側)にロータンク矩形、手前(y=localH側)に楕円便器ボウルを潰れなしで描画
        const tankH = localH * 0.28;
        ctx.fillRect(localW * 0.06, 0, localW * 0.88, tankH);
        ctx.strokeRect(localW * 0.06, 0, localW * 0.88, tankH);
        ctx.beginPath();
        ctx.ellipse(localW / 2, localH * 0.64, localW * 0.38, localH * 0.33, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // 内リム線
        if (localW > 14 && localH > 20) {
            ctx.beginPath();
            ctx.ellipse(localW / 2, localH * 0.66, localW * 0.24, localH * 0.21, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    } else {
        ctx.fillRect(0, 0, localW, localH);
        ctx.strokeRect(0, 0, localW, localH);
        // ソファやベッド等は背面（y=0側）に背もたれ・ヘッドボード二重線を描画して向きを一目でわかるようにする
        if (cat === 'SOFA' || cat === 'BED_DOUBLE' || cat === 'BED_SINGLE' || cat === 'CUPBOARD' || cat === 'CLOSET_UNIT') {
            ctx.beginPath();
            const backBand = Math.max(3, Math.min(8, localH * 0.16));
            ctx.moveTo(0, backBand);
            ctx.lineTo(localW, backBand);
            ctx.stroke();
        }
        if (localW > 20 && localH > 14) {
            ctx.save();
            // 文字は回転・反転を打ち消して常に水平正立で読みやすく描画
            ctx.translate(localW / 2, localH / 2);
            if (fx.flipY) ctx.scale(1, -1);
            if (fx.flipX) ctx.scale(-1, 1);
            if (rot !== 0) ctx.rotate((-rot * Math.PI) / 180);
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 9px "Noto Sans JP", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const lbl = (fx.label || (FIXTURE_TYPES[cat] && FIXTURE_TYPES[cat].label) || '設備').split('(')[0];
            ctx.fillText(lbl, 0, 0);
            ctx.restore();
        }
    }

    // 選択時は背面壁吸着基準点（ローカル上辺中央 (localW/2, 2)）に赤い●印を表示
    if (isSelected && !isKitchenL) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(localW / 2, 2.5, 4.2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

/**
 * サッシ・建具12種の建築JIS平面図記号描画（第3章準拠）
 */
function drawOpening2D(op, isLight) {
    const pitch = state.modulePitch || 910;
    const p = worldPToScreen(op.x, op.y);
    const wP = op.widthP || (op.widthMm ? op.widthMm / pitch : 1.0);
    const lenPx = wP * state.cam2d.zoom;
    const fit = op.doorFit || (op.type === 'SWING_DOOR' ? 'katahiraki' : 'hikichigai');
    const dir = op.flip ? -1 : 1;
    const isSelected = state.selectedItem && state.selectedItem.kind === 'opening' && state.selectedItem.id === op.id;

    ctx.save();
    ctx.translate(p.x, p.y);
    if (op.orient === 'v') {
        ctx.rotate(Math.PI / 2);
    }

    // 壁の開口くり抜き
    ctx.fillStyle = isLight ? '#ffffff' : '#0f172a';
    ctx.fillRect(-lenPx / 2, -5, lenPx, 10);

    ctx.strokeStyle = isSelected ? '#f59e0b' : '#0f172a';
    ctx.lineWidth = isSelected ? 2.5 : 1.6;

    if (fit === 'katahiraki' || fit === 'hiraki') {
        // 片開き：扉線＋90度円弧
        ctx.beginPath();
        ctx.moveTo(-lenPx / 2, 0);
        ctx.lineTo(-lenPx / 2, lenPx * 0.9 * dir);
        ctx.stroke();
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(-lenPx / 2, 0, lenPx * 0.9, 0, (Math.PI / 2) * dir, dir < 0);
        ctx.stroke();
    } else if (fit === 'ryouhiraki') {
        // 両開き：左右から双円弧
        const half = lenPx / 2;
        ctx.beginPath();
        ctx.moveTo(-half, 0); ctx.lineTo(-half, half * 0.9 * dir);
        ctx.moveTo(half, 0); ctx.lineTo(half, half * 0.9 * dir);
        ctx.stroke();
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(-half, 0, half * 0.9, 0, (Math.PI / 2) * dir, dir < 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(half, 0, half * 0.9, Math.PI, Math.PI - (Math.PI / 2) * dir, dir > 0);
        ctx.stroke();
    } else if (fit === 'oyako') {
        // 親子ドア：親扉(70%)＋子扉(30%)
        const wMain = lenPx * 0.7;
        const wSub = lenPx * 0.3;
        ctx.beginPath();
        ctx.moveTo(-lenPx / 2, 0); ctx.lineTo(-lenPx / 2, wMain * 0.9 * dir);
        ctx.moveTo(lenPx / 2, 0); ctx.lineTo(lenPx / 2, wSub * 0.9 * dir);
        ctx.stroke();
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(-lenPx / 2, 0, wMain * 0.9, 0, (Math.PI / 2) * dir, dir < 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(lenPx / 2, 0, wSub * 0.9, Math.PI, Math.PI - (Math.PI / 2) * dir, dir > 0);
        ctx.stroke();
    } else if (fit === 'oredo' || fit === 'closet') {
        // 折れ戸 / クローゼット：V字折れ線
        const half = lenPx / 2;
        const peakH = Math.min(18, lenPx * 0.28) * dir;
        ctx.beginPath();
        ctx.moveTo(-half, 0);
        ctx.lineTo(-half / 2, peakH);
        ctx.lineTo(0, 0);
        ctx.lineTo(half / 2, peakH);
        ctx.lineTo(half, 0);
        ctx.stroke();
    } else if (fit === 'demado') {
        // 出窓：外側に台形張り出し
        const outD = -12 * dir;
        ctx.beginPath();
        ctx.moveTo(-lenPx / 2, 0);
        ctx.lineTo(-lenPx / 2 + 6, outD);
        ctx.lineTo(lenPx / 2 - 6, outD);
        ctx.lineTo(lenPx / 2, 0);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.stroke();
    } else if (fit === 'tatesuberi' || fit === 'yokosuberi' || fit === 'agesage') {
        // 滑り出し・上げ下げ窓
        ctx.strokeRect(-lenPx / 2, -3, lenPx, 6);
        ctx.beginPath();
        ctx.moveTo(-lenPx / 2, 0);
        ctx.lineTo(0, 8 * dir);
        ctx.lineTo(lenPx / 2, 0);
        ctx.stroke();
    } else if (fit === 'fix') {
        // FIX窓
        ctx.strokeRect(-lenPx / 2, -3, lenPx, 6);
        ctx.beginPath();
        ctx.moveTo(-lenPx / 2, 0);
        ctx.lineTo(lenPx / 2, 0);
        ctx.stroke();
    } else if (fit === 'katabiki' || fit === 'hikido' || fit === 'genkan_slide') {
        // 片引き戸（1枚扉パネル＋破線引き込みレール＋引手＋スライド方向矢印）：引違い（2枚障子）と一目で識別可能にする
        const mainStroke = isSelected ? '#f59e0b' : '#0f172a';
        // 1. 枠の両端縦枠（柱チリ受け枠）
        ctx.beginPath();
        ctx.moveTo(-lenPx / 2, -4.5); ctx.lineTo(-lenPx / 2, 4.5);
        ctx.moveTo(lenPx / 2, -4.5); ctx.lineTo(lenPx / 2, 4.5);
        ctx.stroke();

        // 2. 引き込みレール側（全幅のガイドレール破線）
        ctx.save();
        ctx.setLineDash([2.5, 2.5]);
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = isSelected ? '#f59e0b' : '#64748b';
        ctx.beginPath();
        ctx.moveTo(-lenPx / 2, -2.2 * dir);
        ctx.lineTo(lenPx / 2, -2.2 * dir);
        ctx.stroke();
        ctx.restore();

        // 3. 1枚の扉パネル本体（片側54%を占める厚み付き実線ボックス＋引手）
        const panelStart = dir > 0 ? (-lenPx / 2) : (-lenPx * 0.04);
        const panelW = lenPx * 0.54;
        const panelY = (1.6 * dir) - 1.6;
        ctx.fillStyle = isSelected ? '#fef3c7' : '#bae6fd';
        ctx.fillRect(panelStart, panelY, panelW, 3.2);
        ctx.strokeStyle = mainStroke;
        ctx.lineWidth = isSelected ? 2.2 : 1.5;
        ctx.strokeRect(panelStart, panelY, panelW, 3.2);

        // 4. スライド開閉方向を示す小矢印（扉から開放側へ向かう矢印）
        if (lenPx >= 18) {
            const arrowY = -3.8 * dir;
            const arrowX1 = dir > 0 ? (-lenPx * 0.15) : (lenPx * 0.15);
            const arrowX2 = dir > 0 ? (lenPx * 0.28) : (-lenPx * 0.28);
            const headSign = dir > 0 ? 1 : -1;
            ctx.beginPath();
            ctx.lineWidth = 1.1;
            ctx.moveTo(arrowX1, arrowY);
            ctx.lineTo(arrowX2, arrowY);
            ctx.lineTo(arrowX2 - 3.5 * headSign, arrowY - 2.2);
            ctx.moveTo(arrowX2, arrowY);
            ctx.lineTo(arrowX2 - 3.5 * headSign, arrowY + 2.2);
            ctx.stroke();
        }
    } else if (fit === 'kaikou') {
        // 開口のみ（扉なし・階段登りきり通路・下がり壁開口）
        ctx.beginPath();
        ctx.moveTo(-lenPx / 2, -4.5); ctx.lineTo(-lenPx / 2, 4.5);
        ctx.moveTo(lenPx / 2, -4.5); ctx.lineTo(lenPx / 2, 4.5);
        ctx.stroke();
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 0.9;
        ctx.strokeStyle = isSelected ? '#f59e0b' : '#64748b';
        ctx.beginPath();
        ctx.moveTo(-lenPx / 2, -3.5); ctx.lineTo(lenPx / 2, -3.5);
        ctx.moveTo(-lenPx / 2, 3.5); ctx.lineTo(lenPx / 2, 3.5);
        ctx.stroke();
        ctx.restore();
    } else {
        // 引き違い（標準サッシ・引き違い戸）
        ctx.strokeRect(-lenPx / 2, -3.5, lenPx, 7);
        ctx.beginPath();
        ctx.moveTo(-lenPx / 2, -1.2); ctx.lineTo(lenPx * 0.05, -1.2);
        ctx.moveTo(-lenPx * 0.05, 1.2); ctx.lineTo(lenPx / 2, 1.2);
        ctx.stroke();
    }

    ctx.restore();
}

/**
 * お手本画像完全準拠：外周2段自動寸法線（内側＝部屋・壁ごとの区間寸法、外側＝全体総寸法）
 */
function drawAutoDimensions2D(fl, isLight) {
    const hasRooms = fl.rooms && fl.rooms.length > 0;
    const hasWalls = fl.walls && fl.walls.length > 0;
    if (!hasRooms && !hasWalls) return;

    const xSet = new Set();
    const ySet = new Set();

    fl.rooms.forEach(r => {
        if (r.type === 'TENJO') return;
        xSet.add(+(r.x).toFixed(2));
        xSet.add(+(r.x + r.w).toFixed(2));
        ySet.add(+(r.y).toFixed(2));
        ySet.add(+(r.y + r.h).toFixed(2));
    });
    fl.walls.forEach(w => {
        xSet.add(+(w.x1).toFixed(2));
        xSet.add(+(w.x2).toFixed(2));
        ySet.add(+(w.y1).toFixed(2));
        ySet.add(+(w.y2).toFixed(2));
    });

    const xs = Array.from(xSet).sort((a, b) => a - b);
    const ys = Array.from(ySet).sort((a, b) => a - b);
    if (xs.length < 2 || ys.length < 2) return;

    const minX = xs[0], maxX = xs[xs.length - 1];
    const minY = ys[0], maxY = ys[ys.length - 1];
    if (maxX - minX < 0.2 || maxY - minY < 0.2) return;

    const pTopLeft = worldPToScreen(minX, minY);
    const pBotRight = worldPToScreen(maxX, maxY);
    const pitch = state.modulePitch || 910;

    ctx.save();
    const lineCol = isLight ? '#0f172a' : '#94a3b8';
    ctx.strokeStyle = lineCol;
    ctx.fillStyle = lineCol;
    ctx.lineWidth = 1.1;
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';

    // --- 1. 上辺2段寸法線 (内側: 区間寸法, 外側: 総寸法) ---
    const innerTopY = pTopLeft.y - 22;
    const outerTopY = pTopLeft.y - 42;

    // 内側水平線
    ctx.beginPath();
    ctx.moveTo(pTopLeft.x, innerTopY);
    ctx.lineTo(pBotRight.x, innerTopY);
    ctx.stroke();

    for (let i = 0; i < xs.length; i++) {
        const sx = worldPToScreen(xs[i], minY).x;
        ctx.beginPath();
        ctx.moveTo(sx, pTopLeft.y - 4);
        ctx.lineTo(sx, (i === 0 || i === xs.length - 1) ? outerTopY - 5 : innerTopY - 4);
        ctx.stroke();

        // 端点黒丸ティック
        ctx.beginPath();
        ctx.arc(sx, innerTopY, 2, 0, Math.PI * 2);
        ctx.fill();

        if (i < xs.length - 1) {
            const sxNext = worldPToScreen(xs[i + 1], minY).x;
            const spanMm = Math.round((xs[i + 1] - xs[i]) * pitch);
            if (sxNext - sx > 24 && spanMm > 0) {
                ctx.fillText(spanMm.toLocaleString(), (sx + sxNext) / 2, innerTopY - 4);
            }
        }
    }

    // 外側総寸法線 (上辺)
    ctx.beginPath();
    ctx.moveTo(pTopLeft.x, outerTopY);
    ctx.lineTo(pBotRight.x, outerTopY);
    ctx.stroke();
    [pTopLeft.x, pBotRight.x].forEach(tx => {
        ctx.beginPath(); ctx.arc(tx, outerTopY, 2.2, 0, Math.PI * 2); ctx.fill();
    });
    const totalWMm = Math.round((maxX - minX) * pitch);
    ctx.fillText(totalWMm.toLocaleString(), (pTopLeft.x + pBotRight.x) / 2, outerTopY - 5);

    // --- 2. 左辺2段寸法線 (内側: 区間寸法, 外側: 総寸法) ---
    const innerLeftX = pTopLeft.x - 24;
    const outerLeftX = pTopLeft.x - 44;

    ctx.beginPath();
    ctx.moveTo(innerLeftX, pTopLeft.y);
    ctx.lineTo(innerLeftX, pBotRight.y);
    ctx.stroke();

    for (let j = 0; j < ys.length; j++) {
        const sy = worldPToScreen(minX, ys[j]).y;
        ctx.beginPath();
        ctx.moveTo(pTopLeft.x - 4, sy);
        ctx.lineTo((j === 0 || j === ys.length - 1) ? outerLeftX - 5 : innerLeftX - 4, sy);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(innerLeftX, sy, 2, 0, Math.PI * 2);
        ctx.fill();

        if (j < ys.length - 1) {
            const syNext = worldPToScreen(minX, ys[j + 1]).y;
            const spanMm = Math.round((ys[j + 1] - ys[j]) * pitch);
            if (syNext - sy > 24 && spanMm > 0) {
                ctx.save();
                ctx.translate(innerLeftX - 5, (sy + syNext) / 2);
                ctx.rotate(-Math.PI / 2);
                ctx.fillText(spanMm.toLocaleString(), 0, 0);
                ctx.restore();
            }
        }
    }

    // 外側総寸法線 (左辺)
    ctx.beginPath();
    ctx.moveTo(outerLeftX, pTopLeft.y);
    ctx.lineTo(outerLeftX, pBotRight.y);
    ctx.stroke();
    [pTopLeft.y, pBotRight.y].forEach(ty => {
        ctx.beginPath(); ctx.arc(outerLeftX, ty, 2.2, 0, Math.PI * 2); ctx.fill();
    });
    const totalHMm = Math.round((maxY - minY) * pitch);
    ctx.save();
    ctx.translate(outerLeftX - 6, (pTopLeft.y + pBotRight.y) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(totalHMm.toLocaleString(), 0, 0);
    ctx.restore();

    // --- 3. 通り芯記号（X1, X2... / Y1, Y2...）の描画（P2-2 ＆ P3-3対応） ---
    const axisBubbleTopY = outerTopY - 22;
    const axisBubbleLeftX = outerLeftX - 24;
    const showFullAxisLines = !!state.designerMode;

    // X通り芯 (X1, X2, ...)
    for (let i = 0; i < xs.length; i++) {
        const sx = worldPToScreen(xs[i], minY).x;
        if (showFullAxisLines) {
            ctx.save();
            ctx.strokeStyle = isLight ? 'rgba(220, 38, 38, 0.25)' : 'rgba(248, 113, 113, 0.25)';
            ctx.lineWidth = 0.9;
            ctx.setLineDash([8, 3, 2, 3]);
            ctx.beginPath();
            ctx.moveTo(sx, axisBubbleTopY + 10);
            ctx.lineTo(sx, pBotRight.y + 18);
            ctx.stroke();
            ctx.restore();
        }
        ctx.save();
        ctx.fillStyle = isLight ? '#ffffff' : '#1e293b';
        ctx.strokeStyle = isLight ? '#dc2626' : '#f87171';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(sx, axisBubbleTopY, 9.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = isLight ? '#dc2626' : '#fca5a5';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`X${i + 1}`, sx, axisBubbleTopY);
        ctx.restore();
    }

    // Y通り芯 (Y1, Y2, ...)
    for (let j = 0; j < ys.length; j++) {
        const sy = worldPToScreen(minX, ys[j]).y;
        if (showFullAxisLines) {
            ctx.save();
            ctx.strokeStyle = isLight ? 'rgba(220, 38, 38, 0.25)' : 'rgba(248, 113, 113, 0.25)';
            ctx.lineWidth = 0.9;
            ctx.setLineDash([8, 3, 2, 3]);
            ctx.beginPath();
            ctx.moveTo(axisBubbleLeftX + 10, sy);
            ctx.lineTo(pBotRight.x + 18, sy);
            ctx.stroke();
            ctx.restore();
        }
        ctx.save();
        ctx.fillStyle = isLight ? '#ffffff' : '#1e293b';
        ctx.strokeStyle = isLight ? '#dc2626' : '#f87171';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(axisBubbleLeftX, sy, 9.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = isLight ? '#dc2626' : '#fca5a5';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Y${j + 1}`, axisBubbleLeftX, sy);
        ctx.restore();
    }

    // --- 4. 設計者モード時の「上下階壁揃い（直下率）色分け照合」＆「部屋別面積一覧表」（P2-2 & P3-3） ---
    if (state.designerMode) {
        drawDesignerOverlay2D(fl, isLight);
    }

    ctx.restore();
}

function drawDesignerOverlay2D(fl, isLight) {
    const pitch = state.modulePitch || 910;
    const refFloorNum = state.currentFloor === 1 ? 2 : 1;
    const refFl = state.floors[refFloorNum];

    // 1. 上下階の壁一致・ズレ照合ハイライト（緑＝直下・直上壁一致、オレンジ赤＝ズレ）
    if (refFl && refFl.walls && refFl.walls.length > 0 && fl.walls && fl.walls.length > 0) {
        ctx.save();
        fl.walls.forEach(wl => {
            if (wl.wallType === 'agarikamachi') return;
            const isHoriz = Math.abs(wl.y1 - wl.y2) < 0.05;
            const isVert = Math.abs(wl.x1 - wl.x2) < 0.05;
            let matched = false;
            refFl.walls.forEach(rw => {
                if (isHoriz && Math.abs(rw.y1 - rw.y2) < 0.05 && Math.abs(rw.y1 - wl.y1) <= 0.12) {
                    const oMin = Math.max(Math.min(wl.x1, wl.x2), Math.min(rw.x1, rw.x2));
                    const oMax = Math.min(Math.max(wl.x1, wl.x2), Math.max(rw.x1, rw.x2));
                    if (oMax - oMin >= 0.25) matched = true;
                } else if (isVert && Math.abs(rw.x1 - rw.x2) < 0.05 && Math.abs(rw.x1 - wl.x1) <= 0.12) {
                    const oMin = Math.max(Math.min(wl.y1, wl.y2), Math.min(rw.y1, rw.y2));
                    const oMax = Math.min(Math.max(wl.y1, wl.y2), Math.max(rw.y1, rw.y2));
                    if (oMax - oMin >= 0.25) matched = true;
                }
            });
            const p1 = worldPToScreen(wl.x1, wl.y1);
            const p2 = worldPToScreen(wl.x2, wl.y2);
            ctx.strokeStyle = matched ? 'rgba(16, 185, 129, 0.65)' : 'rgba(249, 115, 22, 0.65)';
            ctx.lineWidth = 9;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        });
        ctx.restore();
    }

    // 2. 画面右上（2Dキャンバス内）に「部屋別面積・帖数一覧表」を表示
    const rect = canvas2d.getBoundingClientRect();
    const rooms = (fl.rooms || []).filter(r => r.type !== 'TENJO');
    if (rooms.length === 0) return;

    const pitchM = pitch / 1000;
    const rowH = 16;
    const boxW = 215;
    const boxH = 44 + Math.min(rooms.length, 22) * rowH;
    const boxX = Math.max(12, rect.width - boxW - 12);
    const boxY = 48;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 10px "Noto Sans JP", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const flName = state.currentFloor === 0 ? '地下' : `${state.currentFloor}階`;
    const alignRatio = (typeof computeWallAlignmentRatio === 'function') ? computeWallAlignmentRatio() : 85;
    ctx.fillText(`📐 設計者一覧 (${flName} / 壁直下率:${alignRatio}%)`, boxX + 8, boxY + 7);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px "Noto Sans JP", sans-serif';
    ctx.fillText('🟢緑壁=上下階一致  🟠橙壁=単独壁', boxX + 8, boxY + 22);

    let yCursor = boxY + 38;
    rooms.slice(0, 22).forEach((rm, idx) => {
        const areaM2 = (typeof getRoomAreaM2 === 'function') ? getRoomAreaM2(rm) : ((rm.w * pitchM) * (rm.h * pitchM));
        const jyo = (areaM2 / (pitchM * pitchM * 2)).toFixed(1);
        const rName = rm.customName || rm.name || (ROOM_TYPES[rm.type] && ROOM_TYPES[rm.type].label) || `室${idx + 1}`;
        const excl = (typeof isFloorAreaExcludedRoom === 'function' && isFloorAreaExcludedRoom(rm)) ? '(除外)' : '';
        ctx.fillStyle = excl ? '#94a3b8' : '#f8fafc';
        ctx.font = 'bold 10px "Noto Sans JP", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${idx + 1}. ${rName.slice(0, 8)}${excl}`, boxX + 8, yCursor);
        ctx.textAlign = 'right';
        ctx.fillStyle = excl ? '#94a3b8' : '#38bdf8';
        ctx.fillText(`${jyo}帖 (${areaM2.toFixed(2)}㎡)`, boxX + boxW - 8, yCursor);
        yCursor += rowH;
    });
    ctx.restore();
}

/**
 * 第5章：メモ注釈アイテム描画（テキスト、寸法線、引き出し線、面積表、直線、曲線●頂点、楕円、電気・照明記号、方位）
 */
function drawMemoItem2D(mm, isLight) {
    const isSel = state.selectedItem && state.selectedItem.kind === 'memo' && state.selectedItem.id === mm.id;
    ctx.save();
    const col = mm.color || '#ef4444';
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = mm.lineWidth || 2;
    applyDashStyle(ctx, mm.dash || 'solid');

    if (mm.memoType === 'line') {
        const p1 = worldPToScreen(mm.x1, mm.y1);
        const p2 = worldPToScreen(mm.x2, mm.y2);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    } else if (mm.memoType === 'curve') {
        const p1 = worldPToScreen(mm.x1, mm.y1);
        const p2 = worldPToScreen(mm.x2, mm.y2);
        const cx = mm.cx !== undefined ? mm.cx : (mm.x1 + mm.x2) / 2;
        const cy = mm.cy !== undefined ? mm.cy : (mm.y1 + mm.y2) / 2 - 1.0;
        const pc = worldPToScreen(cx, cy);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(pc.x, pc.y, p2.x, p2.y);
        ctx.stroke();
        // 選択時は曲線の赤頂点（●）を表示してドラッグで角度調整可能（第5章準拠）
        if (isSel) {
            ctx.setLineDash([]);
            ctx.fillStyle = '#ef4444';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(pc.x, pc.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    } else if (mm.memoType === 'ellipse') {
        const p1 = worldPToScreen(mm.x, mm.y);
        const rx = Math.abs(mm.w * state.cam2d.zoom) / 2;
        const ry = Math.abs(mm.h * state.cam2d.zoom) / 2;
        ctx.beginPath();
        ctx.ellipse(p1.x + rx, p1.y + ry, Math.max(4, rx), Math.max(4, ry), 0, 0, Math.PI * 2);
        ctx.stroke();
    } else if (mm.memoType === 'dim') {
        // 寸法線（両端矢印＋ミリ数値）
        const p1 = worldPToScreen(mm.x1, mm.y1);
        const p2 = worldPToScreen(mm.x2, mm.y2);
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        [p1, p2].forEach((pt, idx) => {
            const dir = idx === 0 ? 1 : -1;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            ctx.lineTo(pt.x + dir * 8 * Math.cos(ang - 0.4), pt.y + dir * 8 * Math.sin(ang - 0.4));
            ctx.moveTo(pt.x, pt.y);
            ctx.lineTo(pt.x + dir * 8 * Math.cos(ang + 0.4), pt.y + dir * 8 * Math.sin(ang + 0.4));
            ctx.stroke();
        });
        const distMm = mm.customText || `${Math.round(Math.hypot(mm.x2 - mm.x1, mm.y2 - mm.y1) * state.modulePitch).toLocaleString()}mm`;
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        const tw = ctx.measureText(distMm).width;
        ctx.fillRect(mx - tw / 2 - 3, my - 14, tw + 6, 14);
        ctx.fillStyle = col;
        ctx.fillText(distMm, mx, my - 4);
    } else if (mm.memoType === 'leader') {
        // 引き出し線（先端矢印＋折れ線＋テキスト）
        const p1 = worldPToScreen(mm.x1, mm.y1);
        const p2 = worldPToScreen(mm.x2, mm.y2);
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p2.x + 36, p2.y);
        ctx.stroke();
        // 先端矢印
        const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p1.x + 9 * Math.cos(ang - 0.35), p1.y + 9 * Math.sin(ang - 0.35));
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p1.x + 9 * Math.cos(ang + 0.35), p1.y + 9 * Math.sin(ang + 0.35));
        ctx.stroke();
        ctx.font = 'bold 11px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(mm.text || '注釈メモ', p2.x + 4, p2.y - 5);
    } else if (mm.memoType === 'area_table') {
        const p = worldPToScreen(mm.x, mm.y);
        ctx.setLineDash([]);
        const curFl = state.currentFloor;
        const fA = calcFloorAreaM2(curFl).toFixed(2);
        const wA = calcInteriorWallAreaM2(curFl).toFixed(2);
        let totF = 0, totW = 0;
        [0, 1, 2, 3, 4].forEach(f => { totF += calcFloorAreaM2(f); totW += calcInteriorWallAreaM2(f); });
        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.fillRect(p.x, p.y, 175, 58);
        ctx.strokeRect(p.x, p.y, 175, 58);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px "Noto Sans JP", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${curFl === 0 ? '地下' : curFl + '階'} 床: ${fA}㎡ / 内壁: ${wA}㎡`, p.x + 8, p.y + 20);
        ctx.fillText(`全体 床: ${totF.toFixed(2)}㎡ / 内壁: ${totW.toFixed(2)}㎡`, p.x + 8, p.y + 42);
    } else if (mm.memoType === 'compass') {
        const p = worldPToScreen(mm.x, mm.y);
        ctx.setLineDash([]);
        ctx.translate(p.x, p.y);
        ctx.rotate(((mm.angle || 0) * Math.PI) / 180);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -15); ctx.lineTo(6, 8); ctx.lineTo(0, 3); ctx.closePath();
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -15); ctx.lineTo(-6, 8); ctx.lineTo(0, 3); ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('N', 0, -20);
    } else if (mm.memoType === 'text' || mm.memoType === 'symbol') {
        const p = worldPToScreen(mm.x, mm.y);
        ctx.setLineDash([]);
        ctx.font = `bold ${mm.fontSize || 12}px "Noto Sans JP", sans-serif`;
        const txt = mm.text || 'テキスト';
        const tw = ctx.measureText(txt).width + 12;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(p.x - tw / 2, p.y - 12, tw, 24, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = col;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, p.x, p.y);
    }

    // 選択時はオレンジ枠でハイライト（第5章準拠）
    if (isSel) {
        ctx.setLineDash([4, 2]);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.2;
        const b = getMemoBoundingBoxScreen(mm);
        if (b) {
            ctx.strokeRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8);
        }
    }

    ctx.restore();
}

function getMemoBoundingBoxScreen(mm) {
    if (mm.x1 !== undefined && mm.x2 !== undefined) {
        const p1 = worldPToScreen(mm.x1, mm.y1);
        const p2 = worldPToScreen(mm.x2, mm.y2);
        return {
            x: Math.min(p1.x, p2.x) - 8,
            y: Math.min(p1.y, p2.y) - 8,
            w: Math.max(16, Math.abs(p2.x - p1.x) + 16),
            h: Math.max(16, Math.abs(p2.y - p1.y) + 16)
        };
    }
    if (mm.x !== undefined) {
        const p = worldPToScreen(mm.x, mm.y);
        if (mm.w && mm.h) {
            return { x: p.x, y: p.y, w: mm.w * state.cam2d.zoom, h: mm.h * state.cam2d.zoom };
        }
        return { x: p.x - 28, y: p.y - 14, w: 56, h: 28 };
    }
    return null;
}

function drawStroke2D(st) {
    if (!st.points || st.points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = st.color || '#ef4444';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = st.isMarker || st.color === '#facc15' ? 0.42 : 0.95;
    applyDashStyle(ctx, st.dash || 'solid');

    for (let i = 1; i < st.points.length; i++) {
        const pt0 = worldPToScreen(st.points[i - 1].x, st.points[i - 1].y);
        const pt1 = worldPToScreen(st.points[i].x, st.points[i].y);
        const press = st.points[i].p || 0.5;
        ctx.lineWidth = st.isMarker ? 14 : Math.max(1.5, (st.size || 3) * (0.6 + press * 1.1));
        ctx.beginPath();
        ctx.moveTo(pt0.x, pt0.y);
        ctx.lineTo(pt1.x, pt1.y);
        ctx.stroke();
    }
    ctx.restore();
}

function drawStamp2D(sp) {
    const isSel = state.selectedItem && state.selectedItem.kind === 'memo' && state.selectedItem.id === sp.id;
    const p = worldPToScreen(sp.x, sp.y);
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.strokeStyle = isSel ? '#f59e0b' : (sp.color || '#ef4444');
    ctx.lineWidth = isSel ? 2.5 : 1.5;
    ctx.font = 'bold 11px "Noto Sans JP", sans-serif';
    const w = ctx.measureText(sp.text).width + 12;
    ctx.beginPath();
    ctx.roundRect(p.x - w / 2, p.y - 11, w, 22, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = sp.color || '#ef4444';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sp.text, p.x, p.y);
    ctx.restore();
}

function drawFixtureHoverPreview2D() {
    const cat = state.subFixtureCategory || 'KITCHEN';
    const pitch = state.modulePitch || 910;
    let baseW = 2.0, baseH = 0.7;
    const isKitchenL = (cat === 'KITCHEN_L') || (cat === 'KITCHEN' && state.subKitchenType === 'L');

    if (isKitchenL) {
        baseW = (state.subKitchenLXWidth || 2550) / pitch;
        baseH = (state.subKitchenLYWidth || 1820) / pitch;
    } else if (cat === 'KITCHEN') {
        if (state.subKitchenType === 'ISLAND') {
            baseW = (state.subKitchenIslandW || 2550) / pitch;
            baseH = (state.subKitchenIslandD || 900) / pitch;
        } else {
            baseW = (state.subKitchenIWidth || 2550) / pitch;
            baseH = (state.subKitchenIDepth || 650) / pitch;
        }
    } else if (cat === 'UB') {
        const ubSpecs = window.UB_SPECS || { sizes: [] };
        const curSize = ubSpecs.sizes.find(s => s.id === state.subUbSize) || { wMm: 1600, dMm: 1600 };
        baseW = +(curSize.wMm / pitch).toFixed(3);
        baseH = +(curSize.dMm / pitch).toFixed(3);
    } else if (cat === 'VANITY') {
        baseW = (state.subVanityWidth || 900) / pitch;
        baseH = (state.subVanityDepth || 550) / pitch;
    } else if (FIXTURE_TYPES[cat]) {
        baseW = FIXTURE_TYPES[cat].wP;
        baseH = FIXTURE_TYPES[cat].hP;
    }

    let rot = (((state.subFixtureRot || 0) % 360) + 360) % 360;
    let wP = (rot === 90 || rot === 270) ? baseH : baseW;
    let hP = (rot === 90 || rot === 270) ? baseW : baseH;

    let placeX = state.lastHoverWorld.x;
    let placeY = state.lastHoverWorld.y;
    let snappedToWall = false;

    if (typeof findNearestWallForFixture === 'function') {
        const snapWallInfo = findNearestWallForFixture(placeX, placeY, wP, hP, isKitchenL, rot, cat);
        if (snapWallInfo) {
            snappedToWall = true;
            placeX = snapWallInfo.x;
            placeY = snapWallInfo.y;
            if (snapWallInfo.autoRot !== undefined && !state.subFixtureRotManual) {
                rot = snapWallInfo.autoRot;
                wP = (rot === 90 || rot === 270) ? baseH : baseW;
                hP = (rot === 90 || rot === 270) ? baseW : baseH;
                const resnap = findNearestWallForFixture(state.lastHoverWorld.x, state.lastHoverWorld.y, wP, hP, isKitchenL, rot, cat);
                if (resnap) {
                    placeX = resnap.x;
                    placeY = resnap.y;
                }
            }
        }
    }

    const p = worldPToScreen(placeX, placeY);
    const wPx = wP * state.cam2d.zoom;
    const hPx = hP * state.cam2d.zoom;
    const isRot90or270 = (rot === 90 || rot === 270);
    const localW = isRot90or270 ? hPx : wPx;
    const localH = isRot90or270 ? wPx : hPx;

    ctx.save();
    ctx.fillStyle = 'rgba(245, 158, 11, 0.28)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);

    if (isKitchenL) {
        const cState = resolveKitchenLCornerState(rot, state.subFixtureFlipX, state.subFixtureFlipY);
        const depthP = 650 / pitch;
        const dPx = Math.min(Math.min(wPx, hPx) * 0.48, Math.max(12, depthP * state.cam2d.zoom));

        ctx.save();
        ctx.translate(p.x + wPx / 2, p.y + hPx / 2);
        ctx.scale(cState.cornerRight ? -1 : 1, cState.cornerBottom ? -1 : 1);
        ctx.translate(-wPx / 2, -hPx / 2);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(wPx, 0);
        ctx.lineTo(wPx, dPx);
        ctx.lineTo(dPx, dPx);
        ctx.lineTo(dPx, hPx);
        ctx.lineTo(0, hPx);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // コーナー配置基準点（赤い●印）
        ctx.setLineDash([]);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(3, 3, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 基準角ラベル
        ctx.setLineDash([]);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px "Noto Sans JP", sans-serif';
        ctx.fillText(`基準:${cState.cornerLabel}`, p.x + 6, p.y + hPx / 2);
    } else {
        ctx.save();
        ctx.translate(p.x + wPx / 2, p.y + hPx / 2);
        if (rot !== 0) ctx.rotate((rot * Math.PI) / 180);
        if (state.subFixtureFlipX) ctx.scale(-1, 1);
        if (state.subFixtureFlipY) ctx.scale(1, -1);
        ctx.translate(-localW / 2, -localH / 2);

        if (cat === 'TOILET_FIX') {
            const tankH = localH * 0.28;
            ctx.fillRect(localW * 0.06, 0, localW * 0.88, tankH);
            ctx.strokeRect(localW * 0.06, 0, localW * 0.88, tankH);
            ctx.beginPath();
            ctx.ellipse(localW / 2, localH * 0.64, localW * 0.38, localH * 0.33, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(0, 0, localW, localH);
            ctx.strokeRect(0, 0, localW, localH);
        }

        // 背面基準点（赤い●印）をローカル上辺中央に描画
        ctx.setLineDash([]);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(localW / 2, 2.5, 4.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.setLineDash([]);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 9px "Noto Sans JP", sans-serif';
        const rotLabel = { 0: '↑北背(0°)', 90: '→東背(90°)', 180: '↓南背(180°)', 270: '←西背(270°)' }[rot] || `${rot}°`;
        ctx.fillText(`${rotLabel}${snappedToWall ? '・壁吸着' : ''}`, p.x + 3, p.y - 4);
    }
    ctx.restore();
}

function drawStairHoverPreview2D() {
    const pType = state.stairPresetType || 'STRAIGHT';
    const rot = state.subStairRot || 0;
    let baseW = 1.0, baseH = 2.0;
    if (pType === 'U_SHAPE' || pType === 'L_SHAPE') { baseW = 1.5; baseH = 1.5; }
    const wP = (rot === 90 || rot === 270) ? baseH : baseW;
    const hP = (rot === 90 || rot === 270) ? baseW : baseH;
    const p = worldPToScreen(state.lastHoverWorld.x, state.lastHoverWorld.y);
    const wPx = wP * state.cam2d.zoom;
    const hPx = hP * state.cam2d.zoom;

    ctx.save();
    ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.fillRect(p.x, p.y, wPx, hPx);
    ctx.strokeRect(p.x, p.y, wPx, hPx);
    ctx.restore();
}

function drawPillarHoverPreview2D() {
    const hp = worldPToScreen(state.lastHoverWorld.x, state.lastHoverWorld.y);
    const pSize = state.subPillarSize || 150;
    const sz = Math.max(10, state.cam2d.zoom * (pSize / state.modulePitch));
    ctx.save();
    ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.fillRect(hp.x - sz / 2, hp.y - sz / 2, sz, sz);
    ctx.strokeRect(hp.x - sz / 2, hp.y - sz / 2, sz, sz);
    ctx.restore();
}

function drawPolyPillarPreview2D() {
    const pts = (state.polyPoints && state.polyPoints.length > 0) ? state.polyPoints : (state.polyPillarPoints || []);
    if (pts.length === 0) return;
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const p0 = worldPToScreen(pts[0].x, pts[0].y);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < pts.length; i++) {
        const pt = worldPToScreen(pts[i].x, pts[i].y);
        ctx.lineTo(pt.x, pt.y);
    }
    if (state.lastHoverWorld) {
        const ph = worldPToScreen(state.lastHoverWorld.x, state.lastHoverWorld.y);
        ctx.lineTo(ph.x, ph.y);
    }
    ctx.stroke();
    pts.forEach(pt => {
        const sp = worldPToScreen(pt.x, pt.y);
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
    });
    ctx.restore();
}

function drawWallActivePreview2D() {
    const hoverPt = (state.dragAction && state.dragAction.type === 'wall')
        ? { x: state.dragAction.curX, y: state.dragAction.curY }
        : (state.lastHoverWorld || state.wallClickStart);
    const dx = Math.abs(hoverPt.x - state.wallClickStart.x);
    const dy = Math.abs(hoverPt.y - state.wallClickStart.y);
    const targetPt = state.diagonalWallMode
        ? { x: hoverPt.x, y: hoverPt.y }
        : (dx >= dy
            ? { x: hoverPt.x, y: state.wallClickStart.y }
            : { x: state.wallClickStart.x, y: hoverPt.y });

    const p1 = worldPToScreen(state.wallClickStart.x, state.wallClickStart.y);
    const p2 = worldPToScreen(targetPt.x, targetPt.y);

    ctx.save();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, 5, 0, Math.PI * 2);
    ctx.fill();

    if (state.wallClickStart.x !== targetPt.x || state.wallClickStart.y !== targetPt.y) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 6;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        const distP = Math.hypot(targetPt.x - state.wallClickStart.x, targetPt.y - state.wallClickStart.y);
        const distMm = Math.round(distP * state.modulePitch);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.setLineDash([]);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${distMm.toLocaleString()}mm`, midX, midY - 10);
    }
    ctx.restore();
}

function drawDragPreview2D(drag, isLight) {
    ctx.save();
    if (drag.type === 'room' || drag.type === 'box3d') {
        const x = Math.min(drag.startX, drag.curX);
        const y = Math.min(drag.startY, drag.curY);
        const w = Math.abs(drag.curX - drag.startX);
        const h = Math.abs(drag.curY - drag.startY);
        const p = worldPToScreen(x, y);
        const wPx = w * state.cam2d.zoom;
        const hPx = h * state.cam2d.zoom;

        ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.fillRect(p.x, p.y, wPx, hPx);
        ctx.strokeRect(p.x, p.y, wPx, hPx);
        ctx.setLineDash([]);

        const jyo = (w * h) / 2;
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        const lbl = drag.type === 'box3d' ? '3D直方体' : (ROOM_TYPES[state.subRoomType] ? ROOM_TYPES[state.subRoomType].label : '空間');
        ctx.fillText(`${lbl}: ${Math.round(w * state.modulePitch)}×${Math.round(h * state.modulePitch)}mm (${jyo.toFixed(1)}帖)`, p.x + wPx / 2, p.y + hPx / 2);
    } else if (drag.type === 'wall' || drag.type === 'wall_cut') {
        const p1 = worldPToScreen(drag.startX, drag.startY);
        const p2 = worldPToScreen(drag.curX, drag.curY);
        ctx.strokeStyle = drag.type === 'wall_cut' ? '#ef4444' : '#f59e0b';
        ctx.lineWidth = drag.type === 'wall_cut' ? 8 : 6;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    } else if (drag.type === 'memo_drag') {
        const p1 = worldPToScreen(drag.startX, drag.startY);
        const p2 = worldPToScreen(drag.curX, drag.curY);
        ctx.strokeStyle = state.subPenColor || '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    }
    ctx.restore();
}

function drawSelectionHandles2D(isLight) {
    const obj = findSelectedObject();
    if (!obj) return;
    const kind = state.selectedItem.kind;

    ctx.save();
    if (kind === 'room' || kind === 'fixture' || kind === 'stair' || kind === 'box3d') {
        const p = worldPToScreen(obj.x, obj.y);
        const wPx = obj.w * state.cam2d.zoom;
        const hPx = obj.h * state.cam2d.zoom;

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(p.x - 2, p.y - 2, wPx + 4, hPx + 4);

        const corners = [
            [p.x, p.y],
            [p.x + wPx, p.y],
            [p.x, p.y + hPx],
            [p.x + wPx, p.y + hPx]
        ];
        corners.forEach(([cx, cy]) => {
            ctx.fillStyle = '#f59e0b';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
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
        ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();

        ends.forEach(([ex, ey]) => {
            ctx.fillStyle = '#ea580c';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(ex, ey, 6.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });
    } else if (kind === 'pillar') {
        const p = worldPToScreen(obj.x, obj.y);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(p.x - 10, p.y - 10, 20, 20);
    } else if (kind === 'wall') {
        const p1 = worldPToScreen(obj.x1, obj.y1);
        const p2 = worldPToScreen(obj.x2, obj.y2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        [p1, p2].forEach(pt => {
            ctx.fillStyle = '#f59e0b';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });
    }
    ctx.restore();
}

/**
 * 左パレット最下部の「鳥瞰図ミニプレビュー」を更新描画
 */
function updateBirdEyeMiniPreview() {
    const miniCanvas = document.getElementById('birdEyeMiniCanvas');
    if (!miniCanvas) return;
    const mCtx = miniCanvas.getContext('2d');
    const W = miniCanvas.width;
    const H = miniCanvas.height;

    mCtx.clearRect(0, 0, W, H);
    mCtx.fillStyle = '#e0f2fe';
    mCtx.fillRect(0, 0, W, H);

    // 3Dレンダラーが稼働中ならそのフレームを縮小転写、またはアイソメ鳥瞰図を即時描画
    const glCanvas = document.getElementById('canvas3d');
    if (glCanvas && glCanvas.width > 0 && glCanvas.height > 0 && window.renderer3d && window.scene3d && window.camera3d) {
        try {
            window.renderer3d.render(window.scene3d, window.camera3d);
            mCtx.drawImage(glCanvas, 0, 0, W, H);
            return;
        } catch (e) { }
    }

    // フォールバック：アイソメ鳥瞰ワイヤー描画
    const fl = state.floors[state.currentFloor] || state.floors[1];
    if (!fl) return;
    mCtx.save();
    mCtx.translate(W / 2, H * 0.25);
    const scale = 8;
    (fl.rooms || []).forEach(rm => {
        const iso = (x, y) => ({ x: (x - y) * scale, y: (x + y) * scale * 0.5 });
        const p1 = iso(rm.x, rm.y);
        const p2 = iso(rm.x + rm.w, rm.y);
        const p3 = iso(rm.x + rm.w, rm.y + rm.h);
        const p4 = iso(rm.x, rm.y + rm.h);
        mCtx.fillStyle = '#f8fafc';
        mCtx.strokeStyle = '#334155';
        mCtx.lineWidth = 1.2;
        mCtx.beginPath();
        mCtx.moveTo(p1.x, p1.y); mCtx.lineTo(p2.x, p2.y); mCtx.lineTo(p3.x, p3.y); mCtx.lineTo(p4.x, p4.y);
        mCtx.closePath();
        mCtx.fill();
        mCtx.stroke();
    });
    mCtx.restore();
}

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
    window.drawGuides2D = drawGuides2D;
    window.drawFloorOnionSkin = drawFloorOnionSkin;
    window.drawRoom2D = drawRoom2D;
    window.drawWallSegment2D = drawWallSegment2D;
    window.drawStandalonePillar2D = drawStandalonePillar2D;
    window.drawStair2D = drawStair2D;
    window.drawFixture2D = drawFixture2D;
    window.drawOpening2D = drawOpening2D;
    window.drawAutoDimensions2D = drawAutoDimensions2D;
    window.drawMemoItem2D = drawMemoItem2D;
    window.getMemoBoundingBoxScreen = getMemoBoundingBoxScreen;
    window.drawStroke2D = drawStroke2D;
    window.drawStamp2D = drawStamp2D;
    window.drawDragPreview2D = drawDragPreview2D;
    window.drawSelectionHandles2D = drawSelectionHandles2D;
    window.updateBirdEyeMiniPreview = updateBirdEyeMiniPreview;
}
