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

    // 5b. 壁セグメント（壁、たれ壁、腰壁、上り框）
    fl.walls.forEach(wl => drawWallSegment2D(wl, isLight));

    // 5c. 多角形柱 & 独立柱
    if (fl.polyPillars && fl.polyPillars.length > 0) {
        fl.polyPillars.forEach(pp => drawPolyPillar2D(pp, isLight));
    }
    fl.pillars.forEach(pl => drawStandalonePillar2D(pl, isLight));

    // 5d. 四角（3D直方体）& 設備・家具
    if (fl.boxes3d && fl.boxes3d.length > 0) {
        fl.boxes3d.forEach(bx => drawBox3DItem2D(bx, isLight));
    }
    fl.fixtures.forEach(fx => drawFixture2D(fx, isLight));

    // 5e. 階段（ボックス階段 / オープン階段 / 手すり）
    if (fl.stairs && fl.stairs.length) {
        fl.stairs.forEach(st => drawStair2D(st, isLight));
    }

    // 5f. サッシ・建具（全12種類）
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
    const rt = ROOM_TYPES[rm.type] || ROOM_TYPES.LDK;
    const p1 = worldPToScreen(rm.x, rm.y);
    const wPx = rm.w * state.cam2d.zoom;
    const hPx = rm.h * state.cam2d.zoom;

    ctx.save();

    // お手本画像準拠：ホワイト方眼時はクリーンな白・薄トーン＋玄関土間はグレー＋吹き抜けは点線×
    if (rm.type === 'DOMA' || rm.type === 'PORCH') {
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(p1.x, p1.y, wPx, hPx);
    } else if (rm.type === 'VOID') {
        ctx.fillStyle = isLight ? 'rgba(241, 245, 249, 0.5)' : 'rgba(30, 41, 59, 0.6)';
        ctx.fillRect(p1.x, p1.y, wPx, hPx);
    } else if (rm.type === 'KOAGARI') {
        ctx.fillStyle = 'rgba(254, 240, 138, 0.55)';
        ctx.fillRect(p1.x, p1.y, wPx, hPx);
    } else if (rm.type === 'TATAMI' || rm.type === 'WASHITSU') {
        ctx.fillStyle = isLight ? 'rgba(220, 252, 231, 0.45)' : rt.color2d;
        ctx.fillRect(p1.x, p1.y, wPx, hPx);
    } else if (rm.type === 'NAKANIWA') {
        ctx.fillStyle = 'rgba(209, 250, 229, 0.4)';
        ctx.fillRect(p1.x, p1.y, wPx, hPx);
    } else if (rm.type === 'TENJO') {
        ctx.fillStyle = 'rgba(226, 232, 240, 0.45)';
        ctx.fillRect(p1.x, p1.y, wPx, hPx);
    } else {
        ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.65)' : rt.color2d;
        ctx.fillRect(p1.x, p1.y, wPx, hPx);
    }

    // 空間パターン描画
    if (rm.type === 'VOID') {
        // 吹き抜け：四角の中に点線の「×」（お手本画像完全準拠）
        ctx.strokeStyle = isLight ? '#334155' : '#38bdf8';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(p1.x, p1.y, wPx, hPx);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p1.x + wPx, p1.y + hPx);
        ctx.moveTo(p1.x + wPx, p1.y); ctx.lineTo(p1.x, p1.y + hPx);
        ctx.stroke();
        ctx.setLineDash([]);
    } else if (rm.type === 'TATAMI' || rt.floorType === 'tatami') {
        // 畳の割付線
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 1.3;
        ctx.strokeRect(p1.x + 2, p1.y + 2, wPx - 4, hPx - 4);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y + hPx / 2);
        ctx.lineTo(p1.x + wPx, p1.y + hPx / 2);
        ctx.moveTo(p1.x + wPx / 2, p1.y);
        ctx.lineTo(p1.x + wPx / 2, p1.y + hPx);
        ctx.stroke();
    } else if (rm.type === 'KOAGARI') {
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 2;
        ctx.strokeRect(p1.x, p1.y, wPx, hPx);
    } else if (rm.type === 'NAKANIWA') {
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(p1.x, p1.y, wPx, hPx);
        ctx.setLineDash([]);
    } else if (rm.type === 'TENJO') {
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(p1.x, p1.y, wPx, hPx);
        ctx.setLineDash([]);
    }

    // 壁枠描画（お手本画像準拠のシャープな黒壁複線表現）
    if (rt.hasWall) {
        const wallThickPx = Math.max(5, state.cam2d.zoom * 0.14);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = wallThickPx;
        ctx.lineJoin = 'miter';
        ctx.strokeRect(p1.x, p1.y, wPx, hPx);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.2, wallThickPx * 0.32);
        ctx.strokeRect(p1.x, p1.y, wPx, hPx);
    } else if (rm.type === 'DOMA' || rm.type === 'PORCH') {
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(p1.x, p1.y, wPx, hPx);
    }

    // 部屋名・畳数ラベル
    const areaM2 = (rm.w * state.modulePitch / 1000) * (rm.h * state.modulePitch / 1000);
    const tatamiJyo = (rm.w * rm.h) / 2;
    const centerX = p1.x + wPx / 2;
    const centerY = p1.y + hPx / 2;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const title = rm.name || rm.customName || rt.label;
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

function drawStair2D(st, isLight) {
    const p = worldPToScreen(st.x, st.y);
    const wPx = st.w * state.cam2d.zoom;
    const hPx = st.h * state.cam2d.zoom;
    const isSelected = state.selectedItem && state.selectedItem.kind === 'stair' && state.selectedItem.id === st.id;
    const shape = st.shapeType || 'U_SHAPE';
    const dir = st.direction || 'UP';
    const steps = st.steps || 14;
    const isOpen = st.stairStyle === 'open';
    const handrail = st.handrail || 'both';

    ctx.save();
    ctx.translate(p.x, p.y);

    // 背景と外枠
    ctx.fillStyle = isOpen ? 'rgba(255, 255, 255, 0.35)' : (isSelected ? '#fef3c7' : '#ffffff');
    ctx.fillRect(0, 0, wPx, hPx);

    ctx.strokeStyle = isSelected ? '#f59e0b' : '#0f172a';
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    if (isOpen) ctx.setLineDash([4, 2]);
    ctx.strokeRect(0, 0, wPx, hPx);
    ctx.setLineDash([]);

    // 手すり二重線表現
    if (handrail === 'left' || handrail === 'both') {
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, 3, hPx - 4);
    }
    if (handrail === 'right' || handrail === 'both') {
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.strokeRect(wPx - 5, 2, 3, hPx - 4);
    }

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;

    if (shape === 'U_SHAPE') {
        const isVert = hPx >= wPx;
        if (isVert) {
            const midX = wPx / 2;
            const landingH = hPx * 0.3;
            ctx.strokeRect(midX - 2, landingH, 4, hPx - landingH);
            ctx.strokeRect(0, 0, wPx, landingH);
            const flightH = hPx - landingH;
            const stepH = flightH / 7;
            for (let i = 1; i <= 6; i++) {
                const y = landingH + i * stepH;
                ctx.beginPath();
                ctx.moveTo(0, y); ctx.lineTo(midX - 2, y);
                ctx.moveTo(midX + 2, y); ctx.lineTo(wPx, y);
                ctx.stroke();
            }
            // 昇降矢印
            const startX = midX * 0.5, endX = midX * 1.5, bottomY = hPx * 0.88, topY = landingH * 0.5;
            ctx.beginPath(); ctx.arc(startX, bottomY, 3, 0, Math.PI * 2); ctx.fillStyle = '#0f172a'; ctx.fill();
            ctx.beginPath(); ctx.moveTo(startX, bottomY); ctx.lineTo(startX, topY); ctx.lineTo(endX, topY); ctx.lineTo(endX, bottomY); ctx.stroke();
        } else {
            const midY = hPx / 2;
            const landingW = wPx * 0.3;
            ctx.strokeRect(0, midY - 2, wPx - landingW, 4);
            ctx.strokeRect(wPx - landingW, 0, landingW, hPx);
            const flightW = wPx - landingW;
            const stepW = flightW / 7;
            for (let i = 1; i <= 6; i++) {
                const x = i * stepW;
                ctx.beginPath();
                ctx.moveTo(x, 0); ctx.lineTo(x, midY - 2);
                ctx.moveTo(x, midY + 2); ctx.lineTo(x, hPx);
                ctx.stroke();
            }
        }
    } else {
        const isVert = hPx >= wPx;
        const stepCount = steps || 14;
        if (isVert) {
            const stepH = hPx / stepCount;
            for (let i = 1; i < stepCount; i++) {
                const y = i * stepH;
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(wPx, y); ctx.stroke();
            }
            const fromY = dir === 'UP' ? hPx * 0.85 : hPx * 0.15;
            const toY = dir === 'UP' ? hPx * 0.15 : hPx * 0.85;
            ctx.fillStyle = '#0f172a';
            ctx.beginPath(); ctx.arc(wPx / 2, fromY, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(wPx / 2, fromY); ctx.lineTo(wPx / 2, toY); ctx.stroke();
            const arrowDy = dir === 'UP' ? 7 : -7;
            ctx.beginPath(); ctx.moveTo(wPx / 2 - 4, toY + arrowDy); ctx.lineTo(wPx / 2, toY); ctx.lineTo(wPx / 2 + 4, toY + arrowDy); ctx.stroke();
        } else {
            const stepW = wPx / stepCount;
            for (let i = 1; i < stepCount; i++) {
                const x = i * stepW;
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, hPx); ctx.stroke();
            }
            const fromX = dir === 'UP' ? wPx * 0.15 : wPx * 0.85;
            const toX = dir === 'UP' ? wPx * 0.85 : wPx * 0.15;
            ctx.fillStyle = '#0f172a';
            ctx.beginPath(); ctx.arc(fromX, hPx / 2, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(fromX, hPx / 2); ctx.lineTo(toX, hPx / 2); ctx.stroke();
        }
    }

    ctx.restore();
}

function drawFixture2D(fx, isLight) {
    const p = worldPToScreen(fx.x, fx.y);
    const wPx = fx.w * state.cam2d.zoom;
    const hPx = fx.h * state.cam2d.zoom;
    const isSelected = state.selectedItem && state.selectedItem.kind === 'fixture' && state.selectedItem.id === fx.id;
    const cat = fx.category || fx.type;

    ctx.save();
    ctx.translate(p.x + wPx / 2, p.y + hPx / 2);
    if (fx.flipX) ctx.scale(-1, 1);
    if (fx.flipY) ctx.scale(1, -1);
    ctx.translate(-wPx / 2, -hPx / 2);

    ctx.fillStyle = isSelected ? '#fef3c7' : '#ffffff';
    ctx.strokeStyle = isSelected ? '#f59e0b' : '#334155';
    ctx.lineWidth = isSelected ? 2.5 : 1.3;

    if (cat === 'KITCHEN' || (cat && cat.startsWith('KITCHEN'))) {
        ctx.fillRect(0, 0, wPx, hPx);
        ctx.strokeRect(0, 0, wPx, hPx);
        if (wPx > 40 && hPx > 18) {
            const sinkW = Math.min(wPx * 0.35, 42);
            const sinkH = hPx * 0.65;
            ctx.strokeRect(6, (hPx - sinkH) / 2, sinkW, sinkH);
            const stoveX = wPx - Math.min(wPx * 0.32, 36);
            const stoveY = hPx / 2;
            ctx.beginPath();
            ctx.arc(stoveX + 8, stoveY - 4, 4, 0, Math.PI * 2);
            ctx.arc(stoveX + 8, stoveY + 4, 4, 0, Math.PI * 2);
            ctx.arc(stoveX + 18, stoveY, 3.5, 0, Math.PI * 2);
            ctx.stroke();
        }
    } else if (cat === 'UB') {
        ctx.fillRect(0, 0, wPx, hPx);
        ctx.strokeRect(0, 0, wPx, hPx);
        const tubH = hPx * 0.46;
        ctx.beginPath();
        ctx.roundRect(4, 4, wPx - 8, tubH, 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(8, 7, wPx - 16, tubH - 6, 4);
        ctx.stroke();
    } else if (cat === 'VANITY') {
        ctx.fillRect(0, 0, wPx, hPx);
        ctx.strokeRect(0, 0, wPx, hPx);
        if (wPx > 20 && hPx > 14) {
            ctx.beginPath();
            ctx.ellipse(wPx / 2, hPx / 2, Math.min(wPx * 0.32, 16), Math.min(hPx * 0.32, 10), 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    } else if (cat === 'TOILET_FIX') {
        ctx.strokeRect(0, 0, wPx, hPx * 0.3);
        ctx.beginPath();
        ctx.ellipse(wPx / 2, hPx * 0.65, wPx * 0.36, hPx * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    } else {
        ctx.fillRect(0, 0, wPx, hPx);
        ctx.strokeRect(0, 0, wPx, hPx);
        if (wPx > 26 && hPx > 16) {
            ctx.save();
            if (fx.flipX) ctx.scale(-1, 1);
            if (fx.flipY) ctx.scale(1, -1);
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 9px "Noto Sans JP", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const lbl = (fx.label || (FIXTURE_TYPES[cat] && FIXTURE_TYPES[cat].label) || '設備').split('(')[0];
            ctx.fillText(lbl, (fx.flipX ? -1 : 1) * wPx / 2, (fx.flipY ? -1 : 1) * hPx / 2);
            ctx.restore();
        }
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
    } else if (fit === 'katabiki' || fit === 'genkan_slide') {
        // 引き戸（片引き）
        ctx.beginPath();
        ctx.moveTo(-lenPx / 2, -2); ctx.lineTo(lenPx / 2, -2);
        ctx.moveTo(-lenPx / 2, 2 * dir); ctx.lineTo(0, 2 * dir);
        ctx.stroke();
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
    } else if (FIXTURE_TYPES[cat]) {
        baseW = FIXTURE_TYPES[cat].wP;
        baseH = FIXTURE_TYPES[cat].hP;
    }

    const rot = state.subFixtureRot || 0;
    const wP = (rot === 90 || rot === 270) ? baseH : baseW;
    const hP = (rot === 90 || rot === 270) ? baseW : baseH;

    let placeX = state.lastHoverWorld.x;
    let placeY = state.lastHoverWorld.y;

    if (typeof findNearestWallForFixture === 'function') {
        const snapWallInfo = findNearestWallForFixture(placeX, placeY, wP, hP);
        if (snapWallInfo) {
            if (snapWallInfo.side === 'top' || snapWallInfo.side === 'bottom') placeY = snapWallInfo.y;
            else placeX = snapWallInfo.x;
        }
    }

    const p = worldPToScreen(placeX, placeY);
    const wPx = wP * state.cam2d.zoom;
    const hPx = hP * state.cam2d.zoom;

    ctx.save();
    ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.fillRect(p.x, p.y, wPx, hPx);
    ctx.strokeRect(p.x, p.y, wPx, hPx);

    ctx.setLineDash([]);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(p.x + wPx / 2, p.y + hPx / 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
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
    const targetPt = dx >= dy
        ? { x: hoverPt.x, y: state.wallClickStart.y }
        : { x: state.wallClickStart.x, y: hoverPt.y };

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
        } catch (e) {}
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
