/**
 * 住ま居る 3D間取り工房 (MadoriSketch)
 * CAD連携用 DXF書き出し ＆ 縮尺つきPDF・印刷図面出力モジュール (Single Responsibility: DXF & Scaled PDF Exporter)
 * - P1-1: Jw_cad / ARCHITREND / AutoCAD 互換のレイヤ分けDXF出力（単位: mm、通り芯X1-Y1基準原点）
 * - P1-2: A3 / A4 用紙・縮尺指定（1/50, 1/60, 1/100, 自動フィット）・通り芯・2段寸法線・部屋別面積表・タイトル欄つきPDF図面出力
 */
(function () {
    'use strict';

    /**
     * 現在のフロアの建物境界およびX/Y通り芯座標リスト（グリッド単位P）を取得
     */
    function collectFloorAxesAndBounds(fl) {
        const xSet = new Set();
        const ySet = new Set();

        (fl.rooms || []).forEach(r => {
            if (r.type === 'TENJO') return;
            if (Array.isArray(r.points) && r.points.length >= 3) {
                r.points.forEach(pt => {
                    xSet.add(+(pt.x).toFixed(2));
                    ySet.add(+(pt.y).toFixed(2));
                });
            } else {
                xSet.add(+(r.x).toFixed(2));
                xSet.add(+(r.x + (r.w || 0)).toFixed(2));
                ySet.add(+(r.y).toFixed(2));
                ySet.add(+(r.y + (r.h || 0)).toFixed(2));
            }
        });

        (fl.walls || []).forEach(w => {
            xSet.add(+(w.x1).toFixed(2));
            xSet.add(+(w.x2).toFixed(2));
            ySet.add(+(w.y1).toFixed(2));
            ySet.add(+(w.y2).toFixed(2));
        });

        const xs = Array.from(xSet).sort((a, b) => a - b);
        const ys = Array.from(ySet).sort((a, b) => a - b);

        if (xs.length === 0 || ys.length === 0) {
            return { xs: [0, 10], ys: [0, 10], minX: 0, maxX: 10, minY: 0, maxY: 10 };
        }
        return {
            xs,
            ys,
            minX: xs[0],
            maxX: xs[xs.length - 1],
            minY: ys[0],
            maxY: ys[ys.length - 1]
        };
    }

    // =========================================================================
    // P1-1: レイヤ分け DXF 書き出し（単位: mm、通り芯原点基準、AutoCAD R12 / Jw_cad互換）
    // =========================================================================
    function exportDXF(targetFloorNum) {
        if (typeof state === 'undefined') return;
        const flNum = targetFloorNum !== undefined ? targetFloorNum : state.currentFloor;
        const fl = state.floors[flNum];
        if (!fl) return;

        const pitch = state.modulePitch || 910;
        const bounds = collectFloorAxesAndBounds(fl);
        const origX = bounds.minX;
        const origY = bounds.maxY; // CAD座標系（Y軸上向き正）に合わせ、建物下端（maxY）をY=0基準に変換

        const toCadX = (wx) => +((wx - origX) * pitch).toFixed(2);
        const toCadY = (wy) => +((origY - wy) * pitch).toFixed(2);

        const lines = [];
        const pushPair = (code, val) => {
            lines.push(String(code));
            lines.push(String(val));
        };

        // 1. HEADER SECTION
        pushPair(0, 'SECTION');
        pushPair(2, 'HEADER');
        pushPair(9, '$ACADVER');
        pushPair(1, 'AC1009'); // R12 format for maximum compatibility with Jw_cad & ARCHITREND
        pushPair(9, '$INSUNITS');
        pushPair(70, 4); // 4 = Millimeters
        pushPair(0, 'ENDSEC');

        // 2. TABLES SECTION (Layers & Linetypes)
        pushPair(0, 'SECTION');
        pushPair(2, 'TABLES');

        pushPair(0, 'TABLE');
        pushPair(2, 'LTYPE');
        pushPair(70, 2);
        pushPair(0, 'LTYPE');
        pushPair(2, 'CONTINUOUS');
        pushPair(70, 0);
        pushPair(3, 'Solid line');
        pushPair(72, 65);
        pushPair(73, 0);
        pushPair(40, '0.0');
        pushPair(0, 'ENDTAB');

        const layerDefs = [
            { name: '0', color: 7 },
            { name: 'A-GRID', color: 1 }, // 赤: 通り芯
            { name: 'A-WALL', color: 7 }, // 白/黒: 壁線・壁厚複線・柱
            { name: 'A-OPEN', color: 4 }, // 水色: サッシ・窓・建具
            { name: 'A-FIXT', color: 3 }, // 緑: 設備・階段・家具
            { name: 'A-ROOM', color: 2 }, // 黄: 部屋名・帖数・面積文字
            { name: 'A-DIMS', color: 6 }  // マゼンタ: 外周寸法線・通り芯番号
        ];
        pushPair(0, 'TABLE');
        pushPair(2, 'LAYER');
        pushPair(70, layerDefs.length);
        layerDefs.forEach(ly => {
            pushPair(0, 'LAYER');
            pushPair(2, ly.name);
            pushPair(70, 0);
            pushPair(62, ly.color);
            pushPair(6, 'CONTINUOUS');
        });
        pushPair(0, 'ENDTAB');
        pushPair(0, 'ENDSEC');

        // 3. ENTITIES SECTION
        pushPair(0, 'SECTION');
        pushPair(2, 'ENTITIES');

        const addDxfLine = (layer, x1, y1, x2, y2) => {
            pushPair(0, 'LINE');
            pushPair(8, layer);
            pushPair(10, x1); pushPair(20, y1); pushPair(30, 0.0);
            pushPair(11, x2); pushPair(21, y2); pushPair(31, 0.0);
        };

        const addDxfCircle = (layer, cx, cy, r) => {
            pushPair(0, 'CIRCLE');
            pushPair(8, layer);
            pushPair(10, cx); pushPair(20, cy); pushPair(30, 0.0);
            pushPair(40, r);
        };

        const addDxfText = (layer, x, y, height, text, rotDeg = 0) => {
            if (!text) return;
            pushPair(0, 'TEXT');
            pushPair(8, layer);
            pushPair(10, x); pushPair(20, y); pushPair(30, 0.0);
            pushPair(40, height);
            pushPair(1, String(text));
            if (rotDeg) pushPair(50, rotDeg);
        };

        const addDxfRect = (layer, x1, y1, x2, y2) => {
            addDxfLine(layer, x1, y1, x2, y1);
            addDxfLine(layer, x2, y1, x2, y2);
            addDxfLine(layer, x2, y2, x1, y2);
            addDxfLine(layer, x1, y2, x1, y1);
        };

        // 3a. 通り芯 (A-GRID) & 通り芯番号 (A-DIMS)
        const minCadX = toCadX(bounds.minX);
        const maxCadX = toCadX(bounds.maxX);
        const minCadY = toCadY(bounds.maxY);
        const maxCadY = toCadY(bounds.minY);

        bounds.xs.forEach((wx, idx) => {
            const cx = toCadX(wx);
            addDxfLine('A-GRID', cx, minCadY - 900, cx, maxCadY + 1400);
            addDxfCircle('A-DIMS', cx, maxCadY + 1700, 260);
            addDxfText('A-DIMS', cx - 140, maxCadY + 1600, 200, `X${idx + 1}`);
        });

        bounds.ys.forEach((wy, idx) => {
            const cy = toCadY(wy);
            addDxfLine('A-GRID', minCadX - 1400, cy, maxCadX + 900, cy);
            addDxfCircle('A-DIMS', minCadX - 1700, cy, 260);
            addDxfText('A-DIMS', minCadX - 1840, cy - 90, 200, `Y${idx + 1}`);
        });

        // 3b. 壁（壁芯＋壁厚130mmの複線：A-WALL）
        const halfWallMm = 65; // 130mm壁厚の片側65mm
        (fl.walls || []).forEach(wl => {
            const x1 = toCadX(wl.x1), y1 = toCadY(wl.y1);
            const x2 = toCadX(wl.x2), y2 = toCadY(wl.y2);
            addDxfLine('A-GRID', x1, y1, x2, y2); // 壁芯
            const len = Math.hypot(x2 - x1, y2 - y1);
            if (len > 1) {
                const nx = -(y2 - y1) / len * halfWallMm;
                const ny = (x2 - x1) / len * halfWallMm;
                addDxfLine('A-WALL', +(x1 + nx).toFixed(2), +(y1 + ny).toFixed(2), +(x2 + nx).toFixed(2), +(y2 + ny).toFixed(2));
                addDxfLine('A-WALL', +(x1 - nx).toFixed(2), +(y1 - ny).toFixed(2), +(x2 - nx).toFixed(2), +(y2 - ny).toFixed(2));
                addDxfLine('A-WALL', +(x1 + nx).toFixed(2), +(y1 + ny).toFixed(2), +(x1 - nx).toFixed(2), +(y1 - ny).toFixed(2));
                addDxfLine('A-WALL', +(x2 + nx).toFixed(2), +(y2 + ny).toFixed(2), +(x2 - nx).toFixed(2), +(y2 - ny).toFixed(2));
            }
        });

        // 3c. 独立柱 (A-WALL)
        (fl.pillars || []).forEach(pl => {
            const cx = toCadX(pl.x);
            const cy = toCadY(pl.y);
            const half = (pl.sizeMm || 150) / 2;
            if (pl.shape === 'round') {
                addDxfCircle('A-WALL', cx, cy, half);
            } else {
                addDxfRect('A-WALL', cx - half, cy - half, cx + half, cy + half);
            }
        });

        // 3d. 部屋枠＆部屋名・帖数・面積テキスト (A-ROOM / A-WALL)
        const pitchM = pitch / 1000;
        (fl.rooms || []).forEach(rm => {
            if (rm.type === 'TENJO') return;
            const rt = (window.ROOM_TYPES && window.ROOM_TYPES[rm.type]) || { hasWall: true, label: '室' };
            if (!rm.isAutoDetected && rt.hasWall) {
                const rx1 = toCadX(rm.x), ry1 = toCadY(rm.y + rm.h);
                const rx2 = toCadX(rm.x + rm.w), ry2 = toCadY(rm.y);
                addDxfRect('A-WALL', rx1, ry1, rx2, ry2);
            }
            const areaM2 = (typeof getRoomAreaM2 === 'function') ? getRoomAreaM2(rm) : ((rm.w * pitchM) * (rm.h * pitchM));
            const jyo = (areaM2 / (pitchM * pitchM * 2)).toFixed(1);
            const title = rm.customName || rm.name || rt.label || '空間';
            const centerW = rm.centroid || { x: rm.x + rm.w / 2, y: rm.y + rm.h / 2 };
            const tx = toCadX(centerW.x) - 350;
            const ty = toCadY(centerW.y);
            addDxfText('A-ROOM', tx, ty + 80, 180, title);
            if (rm.type !== 'VOID') {
                addDxfText('A-ROOM', tx, ty - 160, 140, `${jyo}帖 (${areaM2.toFixed(2)}m2)`);
            }
        });

        // 3e. 開口部（窓・建具：A-OPEN）
        (fl.openings || []).forEach(op => {
            const cx = toCadX(op.x);
            const cy = toCadY(op.y);
            const halfW = (op.widthMm || Math.round((op.widthP || 1) * pitch)) / 2;
            if (op.orient === 'h') {
                addDxfRect('A-OPEN', cx - halfW, cy - 80, cx + halfW, cy + 80);
                addDxfLine('A-OPEN', cx - halfW, cy, cx + halfW, cy);
                addDxfText('A-OPEN', cx - halfW * 0.6, cy + 120, 110, `W${op.widthMm || 1650}xH${op.heightMm || 1300}`);
            } else {
                addDxfRect('A-OPEN', cx - 80, cy - halfW, cx + 80, cy + halfW);
                addDxfLine('A-OPEN', cx, cy - halfW, cx, cy + halfW);
                addDxfText('A-OPEN', cx + 120, cy - 100, 110, `W${op.widthMm || 1650}xH${op.heightMm || 1300}`, 90);
            }
        });

        // 3f. 住宅設備・階段 (A-FIXT)
        (fl.fixtures || []).forEach(fx => {
            const x1 = toCadX(fx.x), y2 = toCadY(fx.y);
            const x2 = toCadX(fx.x + fx.w), y1 = toCadY(fx.y + fx.h);
            addDxfRect('A-FIXT', x1, y1, x2, y2);
            addDxfText('A-FIXT', x1 + 100, (y1 + y2) / 2, 120, (fx.label || '設備').split(' ')[0]);
        });
        (fl.stairs || []).forEach(st => {
            const x1 = toCadX(st.x), y2 = toCadY(st.y);
            const x2 = toCadX(st.x + st.w), y1 = toCadY(st.y + st.h);
            addDxfRect('A-FIXT', x1, y1, x2, y2);
            const steps = st.steps || 14;
            for (let k = 1; k < steps; k++) {
                if (st.h >= st.w) {
                    const sy = y1 + ((y2 - y1) * k) / steps;
                    addDxfLine('A-FIXT', x1, sy, x2, sy);
                } else {
                    const sx = x1 + ((x2 - x1) * k) / steps;
                    addDxfLine('A-FIXT', sx, y1, sx, y2);
                }
            }
            addDxfText('A-FIXT', x1 + 100, (y1 + y2) / 2, 130, 'STAIR');
        });

        // 3g. 外周2段寸法線 (A-DIMS)
        const dimInnerTopY = maxCadY + 600;
        const dimOuterTopY = maxCadY + 1050;
        addDxfLine('A-DIMS', minCadX, dimInnerTopY, maxCadX, dimInnerTopY);
        addDxfLine('A-DIMS', minCadX, dimOuterTopY, maxCadX, dimOuterTopY);
        for (let i = 0; i < bounds.xs.length; i++) {
            const sx = toCadX(bounds.xs[i]);
            addDxfLine('A-DIMS', sx, maxCadY + 100, sx, dimOuterTopY + 100);
            if (i < bounds.xs.length - 1) {
                const sxNext = toCadX(bounds.xs[i + 1]);
                const spanMm = Math.round((bounds.xs[i + 1] - bounds.xs[i]) * pitch);
                addDxfText('A-DIMS', (sx + sxNext) / 2 - 180, dimInnerTopY + 70, 140, String(spanMm));
            }
        }
        const totalWMm = Math.round((bounds.maxX - bounds.minX) * pitch);
        addDxfText('A-DIMS', (minCadX + maxCadX) / 2 - 220, dimOuterTopY + 80, 160, String(totalWMm));

        const dimInnerLeftX = minCadX - 600;
        const dimOuterLeftX = minCadX - 1050;
        addDxfLine('A-DIMS', dimInnerLeftX, minCadY, dimInnerLeftX, maxCadY);
        addDxfLine('A-DIMS', dimOuterLeftX, minCadY, dimOuterLeftX, maxCadY);
        for (let j = 0; j < bounds.ys.length; j++) {
            const sy = toCadY(bounds.ys[j]);
            addDxfLine('A-DIMS', dimOuterLeftX - 100, sy, minCadX - 100, sy);
            if (j < bounds.ys.length - 1) {
                const syNext = toCadY(bounds.ys[j + 1]);
                const spanMm = Math.round((bounds.ys[j + 1] - bounds.ys[j]) * pitch);
                addDxfText('A-DIMS', dimInnerLeftX - 80, (sy + syNext) / 2 - 150, 140, String(spanMm), 90);
            }
        }
        const totalHMm = Math.round((bounds.maxY - bounds.minY) * pitch);
        addDxfText('A-DIMS', dimOuterLeftX - 80, (minCadY + maxCadY) / 2 - 200, 160, String(totalHMm), 90);

        pushPair(0, 'ENDSEC');
        pushPair(0, 'EOF');

        const dxfContent = lines.join('\r\n') + '\r\n';
        const blob = new Blob([dxfContent], { type: 'application/dxf;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const curTitle = (document.getElementById('planTitleInput')?.value?.trim() || state.projectTitle || 'MadoriPlan').replace(/[\\/:*?"<>|]/g, '_');
        const flLabel = flNum === 0 ? 'B1F' : `${flNum}F`;
        const a = document.createElement('a');
        a.href = url;
        a.download = `Smile_CAD_${curTitle}_${flLabel}_${new Date().toISOString().slice(0, 10)}.dxf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (typeof showToast === 'function') {
            showToast(`📐 CAD用DXFファイル（${flLabel}・単位mm・レイヤ分け済）を書き出しました！Jw_cadやARCHITRENDでそのまま開けます`);
        }
    }

    // =========================================================================
    // P1-2: 縮尺つき PDF・印刷図面出力モーダル ＆ 高精細図面シート生成
    // =========================================================================
    function openScalePdfModal() {
        const m = document.getElementById('scalePdfModal');
        if (!m) return;
        m.classList.remove('hidden');
        m.classList.add('flex');
    }

    function closeScalePdfModal() {
        const m = document.getElementById('scalePdfModal');
        if (!m) return;
        m.classList.add('hidden');
        m.classList.remove('flex');
    }

    function executeScaledPdfExport(mode = 'print') {
        const paper = document.getElementById('selPdfPaperSize')?.value || 'A3';
        const scaleVal = document.getElementById('selPdfScale')?.value || '100';
        closeScalePdfModal();

        const flNum = state.currentFloor;
        const fl = state.floors[flNum];
        if (!fl) return;
        const pitch = state.modulePitch || 910;
        const bounds = collectFloorAxesAndBounds(fl);

        // 用紙寸法 (mm, 横置き Landscape)
        const paperMm = paper === 'A4' ? { w: 297, h: 210 } : { w: 420, h: 297 };
        const pxPerMm = 6; // 約150dpi相当の高精細Canvas (A3横 = 2520 x 1782 px)
        const sheetCanvas = document.createElement('canvas');
        sheetCanvas.width = paperMm.w * pxPerMm;
        sheetCanvas.height = paperMm.h * pxPerMm;
        const sCtx = sheetCanvas.getContext('2d');

        // 白紙背景 & 外枠二重線
        sCtx.fillStyle = '#ffffff';
        sCtx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);

        const marginMm = 10;
        const mPx = marginMm * pxPerMm;
        sCtx.strokeStyle = '#0f172a';
        sCtx.lineWidth = 3;
        sCtx.strokeRect(mPx, mPx, sheetCanvas.width - mPx * 2, sheetCanvas.height - mPx * 2);
        sCtx.lineWidth = 1;
        sCtx.strokeRect(mPx + 6, mPx + 6, sheetCanvas.width - (mPx + 6) * 2, sheetCanvas.height - (mPx + 6) * 2);

        // 右側または下部の面積表・タイトル欄領域の確保
        const sidePanelWMm = paper === 'A3' ? 88 : 68;
        const titleBarHMm = 22;
        const drawAreaWMm = paperMm.w - marginMm * 2 - sidePanelWMm;
        const drawAreaHMm = paperMm.h - marginMm * 2 - titleBarHMm;

        // 縮尺計算 (1/S の場合、実寸1mm = 用紙上 (1/S) mm)
        const bldgWMm = Math.max(3640, (bounds.maxX - bounds.minX) * pitch);
        const bldgHMm = Math.max(3640, (bounds.maxY - bounds.minY) * pitch);
        let scaleDenom = parseInt(scaleVal, 10) || 100;
        let scaleLabel = `1/${scaleDenom}`;
        if (scaleVal === 'auto') {
            const fitScaleX = (bldgWMm + 4500) / drawAreaWMm;
            const fitScaleY = (bldgHMm + 4500) / drawAreaHMm;
            const rawDenom = Math.max(fitScaleX, fitScaleY);
            if (rawDenom <= 50) scaleDenom = 50;
            else if (rawDenom <= 60) scaleDenom = 60;
            else if (rawDenom <= 100) scaleDenom = 100;
            else scaleDenom = 150;
            scaleLabel = `1/${scaleDenom} (自動最適)`;
        }

        // 1グリッド(P)あたりのシート上ピクセル数
        const zoomSheet = (pitch / scaleDenom) * pxPerMm;
        const centerSheetX = (marginMm + drawAreaWMm / 2) * pxPerMm + 25 * pxPerMm;
        const centerSheetY = (marginMm + drawAreaHMm / 2) * pxPerMm + 18 * pxPerMm;
        const midWorldX = (bounds.minX + bounds.maxX) / 2;
        const midWorldY = (bounds.minY + bounds.maxY) / 2;

        // 既存の 2D レンダラーを一時的にシートCanvas・指定縮尺カメラに切り替えて描画
        const origCanvas = window.canvas2d;
        const origCtx = window.ctx;
        const origCam = { x: state.cam2d.x, y: state.cam2d.y, zoom: state.cam2d.zoom };
        const origDesigner = state.designerMode;

        try {
            sCtx.save();
            sCtx.beginPath();
            sCtx.rect(mPx + 8, mPx + 8, drawAreaWMm * pxPerMm - 8, drawAreaHMm * pxPerMm - 8);
            sCtx.clip();

            // 通り芯・方眼・部屋・壁・建具・2段寸法線を指定縮尺で描画
            const toSX = (wx) => centerSheetX + (wx - midWorldX) * zoomSheet;
            const toSY = (wy) => centerSheetY + (wy - midWorldY) * zoomSheet;

            // 1. 補助グリッド (910mmピッチ細線)
            sCtx.strokeStyle = '#e2e8f0';
            sCtx.lineWidth = 1;
            for (let gx = Math.floor(bounds.minX) - 2; gx <= Math.ceil(bounds.maxX) + 2; gx++) {
                const sx = toSX(gx);
                sCtx.beginPath(); sCtx.moveTo(sx, mPx); sCtx.lineTo(sx, mPx + drawAreaHMm * pxPerMm); sCtx.stroke();
            }
            for (let gy = Math.floor(bounds.minY) - 2; gy <= Math.ceil(bounds.maxY) + 2; gy++) {
                const sy = toSY(gy);
                sCtx.beginPath(); sCtx.moveTo(mPx, sy); sCtx.lineTo(mPx + drawAreaWMm * pxPerMm, sy); sCtx.stroke();
            }

            // 2. 部屋塗りつぶし＆部屋名・帖数・面積
            const pitchM = pitch / 1000;
            (fl.rooms || []).forEach(rm => {
                if (rm.type === 'TENJO') return;
                const rt = (window.ROOM_TYPES && window.ROOM_TYPES[rm.type]) || { label: '室', hasWall: true };
                sCtx.fillStyle = rm.type === 'DOMA' ? '#e2e8f0' : '#f8fafc';
                if (Array.isArray(rm.points) && rm.points.length >= 3) {
                    sCtx.beginPath();
                    rm.points.forEach((pt, idx) => {
                        const px = toSX(pt.x), py = toSY(pt.y);
                        if (idx === 0) sCtx.moveTo(px, py); else sCtx.lineTo(px, py);
                    });
                    sCtx.closePath();
                    sCtx.fill();
                } else {
                    const rx = toSX(rm.x), ry = toSY(rm.y);
                    const rw = rm.w * zoomSheet, rh = rm.h * zoomSheet;
                    sCtx.fillRect(rx, ry, rw, rh);
                    if (rt.hasWall) {
                        sCtx.strokeStyle = '#0f172a';
                        sCtx.lineWidth = Math.max(4, zoomSheet * 0.14);
                        sCtx.strokeRect(rx, ry, rw, rh);
                    }
                }
            });

            // 3. 壁線分（黒複線）
            const wallThickPx = Math.max(5, zoomSheet * 0.14);
            (fl.walls || []).forEach(wl => {
                const p1x = toSX(wl.x1), p1y = toSY(wl.y1);
                const p2x = toSX(wl.x2), p2y = toSY(wl.y2);
                sCtx.strokeStyle = '#0f172a';
                sCtx.lineWidth = wl.wallType === 'agarikamachi' ? 3 : wallThickPx;
                if (wl.wallType === 'tarekabe') sCtx.setLineDash([8, 6]);
                else sCtx.setLineDash([]);
                sCtx.beginPath(); sCtx.moveTo(p1x, p1y); sCtx.lineTo(p2x, p2y); sCtx.stroke();
                if (!wl.wallType || wl.wallType === 'wall' || wl.wallType === 'koshikabe') {
                    sCtx.strokeStyle = '#ffffff';
                    sCtx.lineWidth = Math.max(1.5, wallThickPx * 0.34);
                    sCtx.beginPath(); sCtx.moveTo(p1x, p1y); sCtx.lineTo(p2x, p2y); sCtx.stroke();
                }
            });
            sCtx.setLineDash([]);

            // 4. 設備・階段
            (fl.fixtures || []).forEach(fx => {
                const fxX = toSX(fx.x), fxY = toSY(fx.y);
                const fxW = fx.w * zoomSheet, fxH = fx.h * zoomSheet;
                sCtx.fillStyle = '#ffffff';
                sCtx.strokeStyle = '#334155';
                sCtx.lineWidth = 2;
                sCtx.fillRect(fxX, fxY, fxW, fxH);
                sCtx.strokeRect(fxX, fxY, fxW, fxH);
                sCtx.fillStyle = '#334155';
                sCtx.font = 'bold 14px "Noto Sans JP", sans-serif';
                sCtx.textAlign = 'center';
                sCtx.textBaseline = 'middle';
                sCtx.fillText((fx.label || '設備').split('(')[0], fxX + fxW / 2, fxY + fxH / 2);
            });
            (fl.stairs || []).forEach(st => {
                const stX = toSX(st.x), stY = toSY(st.y);
                const stW = st.w * zoomSheet, stH = st.h * zoomSheet;
                sCtx.fillStyle = '#fef3c7';
                sCtx.strokeStyle = '#0f172a';
                sCtx.lineWidth = 2;
                sCtx.fillRect(stX, stY, stW, stH);
                sCtx.strokeRect(stX, stY, stW, stH);
                const steps = st.steps || 14;
                for (let k = 1; k < steps; k++) {
                    sCtx.beginPath();
                    if (st.h >= st.w) {
                        const sy = stY + (stH * k) / steps;
                        sCtx.moveTo(stX, sy); sCtx.lineTo(stX + stW, sy);
                    } else {
                        const sx = stX + (stW * k) / steps;
                        sCtx.moveTo(sx, stY); sCtx.lineTo(sx, stY + stH);
                    }
                    sCtx.stroke();
                }
            });

            // 5. 開口部（窓・建具）
            (fl.openings || []).forEach(op => {
                const ox = toSX(op.x), oy = toSY(op.y);
                const wP = op.widthP || (op.widthMm ? op.widthMm / pitch : 1.0);
                const lenPx = wP * zoomSheet;
                sCtx.save();
                sCtx.translate(ox, oy);
                if (op.orient === 'v') sCtx.rotate(Math.PI / 2);
                sCtx.fillStyle = '#ffffff';
                sCtx.fillRect(-lenPx / 2, -wallThickPx * 0.6, lenPx, wallThickPx * 1.2);
                sCtx.strokeStyle = op.isWin ? '#0284c7' : '#0f172a';
                sCtx.lineWidth = 2.2;
                sCtx.strokeRect(-lenPx / 2, -4, lenPx, 8);
                sCtx.beginPath(); sCtx.moveTo(-lenPx / 2, 0); sCtx.lineTo(lenPx / 2, 0); sCtx.stroke();
                sCtx.restore();
            });

            // 6. 部屋名・帖数・面積ラベル
            (fl.rooms || []).forEach(rm => {
                if (rm.type === 'TENJO') return;
                const rt = (window.ROOM_TYPES && window.ROOM_TYPES[rm.type]) || { label: '空間' };
                const areaM2 = (typeof getRoomAreaM2 === 'function') ? getRoomAreaM2(rm) : ((rm.w * pitchM) * (rm.h * pitchM));
                const jyo = (areaM2 / (pitchM * pitchM * 2)).toFixed(1);
                const cPt = rm.centroid || { x: rm.x + rm.w / 2, y: rm.y + rm.h / 2 };
                const cx = toSX(cPt.x), cy = toSY(cPt.y);
                const title = rm.customName || rm.name || rt.label;
                sCtx.fillStyle = '#0f172a';
                sCtx.font = `bold ${Math.max(15, Math.min(24, zoomSheet * 0.28))}px "Noto Sans JP", sans-serif`;
                sCtx.textAlign = 'center';
                sCtx.textBaseline = 'middle';
                sCtx.fillText(title, cx, cy - 10);
                if (rm.type !== 'VOID') {
                    sCtx.fillStyle = '#334155';
                    sCtx.font = `600 ${Math.max(12, Math.min(18, zoomSheet * 0.20))}px "JetBrains Mono", monospace`;
                    sCtx.fillText(`${jyo}帖 (${areaM2.toFixed(2)}㎡)`, cx, cy + 12);
                }
            });

            // 7. 外周2段寸法線 ＆ 通り芯記号 (X1, X2... / Y1, Y2...)
            const pTL = { x: toSX(bounds.minX), y: toSY(bounds.minY) };
            const pBR = { x: toSX(bounds.maxX), y: toSY(bounds.maxY) };
            const inTopY = pTL.y - 36;
            const outTopY = pTL.y - 68;
            const axisTopY = pTL.y - 104;

            sCtx.strokeStyle = '#0f172a';
            sCtx.fillStyle = '#0f172a';
            sCtx.lineWidth = 1.6;
            sCtx.font = 'bold 15px "JetBrains Mono", monospace';
            sCtx.textAlign = 'center';

            sCtx.beginPath(); sCtx.moveTo(pTL.x, inTopY); sCtx.lineTo(pBR.x, inTopY); sCtx.stroke();
            sCtx.beginPath(); sCtx.moveTo(pTL.x, outTopY); sCtx.lineTo(pBR.x, outTopY); sCtx.stroke();

            bounds.xs.forEach((wx, idx) => {
                const sx = toSX(wx);
                sCtx.beginPath(); sCtx.moveTo(sx, pTL.y - 8); sCtx.lineTo(sx, outTopY - 8); sCtx.stroke();
                sCtx.beginPath(); sCtx.arc(sx, inTopY, 3.5, 0, Math.PI * 2); sCtx.fill();
                if (idx < bounds.xs.length - 1) {
                    const sxNext = toSX(bounds.xs[idx + 1]);
                    const spanMm = Math.round((bounds.xs[idx + 1] - wx) * pitch);
                    if (sxNext - sx > 34) sCtx.fillText(spanMm.toLocaleString(), (sx + sxNext) / 2, inTopY - 8);
                }
                // X通り芯丸記号
                sCtx.save();
                sCtx.strokeStyle = '#dc2626';
                sCtx.fillStyle = '#ffffff';
                sCtx.lineWidth = 2;
                sCtx.beginPath(); sCtx.arc(sx, axisTopY, 15, 0, Math.PI * 2); sCtx.fill(); sCtx.stroke();
                sCtx.fillStyle = '#dc2626';
                sCtx.font = 'bold 13px "JetBrains Mono", monospace';
                sCtx.fillText(`X${idx + 1}`, sx, axisTopY + 1);
                sCtx.restore();
            });
            const totWMm = Math.round((bounds.maxX - bounds.minX) * pitch);
            sCtx.fillText(totWMm.toLocaleString(), (pTL.x + pBR.x) / 2, outTopY - 9);

            const inLeftX = pTL.x - 38;
            const outLeftX = pTL.x - 72;
            const axisLeftX = pTL.x - 108;
            sCtx.beginPath(); sCtx.moveTo(inLeftX, pTL.y); sCtx.lineTo(inLeftX, pBR.y); sCtx.stroke();
            sCtx.beginPath(); sCtx.moveTo(outLeftX, pTL.y); sCtx.lineTo(outLeftX, pBR.y); sCtx.stroke();

            bounds.ys.forEach((wy, idx) => {
                const sy = toSY(wy);
                sCtx.beginPath(); sCtx.moveTo(pTL.x - 8, sy); sCtx.lineTo(outLeftX - 8, sy); sCtx.stroke();
                sCtx.beginPath(); sCtx.arc(inLeftX, sy, 3.5, 0, Math.PI * 2); sCtx.fill();
                if (idx < bounds.ys.length - 1) {
                    const syNext = toSY(bounds.ys[idx + 1]);
                    const spanMm = Math.round((bounds.ys[idx + 1] - wy) * pitch);
                    if (syNext - sy > 34) {
                        sCtx.save();
                        sCtx.translate(inLeftX - 9, (sy + syNext) / 2);
                        sCtx.rotate(-Math.PI / 2);
                        sCtx.fillText(spanMm.toLocaleString(), 0, 0);
                        sCtx.restore();
                    }
                }
                // Y通り芯丸記号
                sCtx.save();
                sCtx.strokeStyle = '#dc2626';
                sCtx.fillStyle = '#ffffff';
                sCtx.lineWidth = 2;
                sCtx.beginPath(); sCtx.arc(axisLeftX, sy, 15, 0, Math.PI * 2); sCtx.fill(); sCtx.stroke();
                sCtx.fillStyle = '#dc2626';
                sCtx.font = 'bold 13px "JetBrains Mono", monospace';
                sCtx.fillText(`Y${idx + 1}`, axisLeftX, sy + 1);
                sCtx.restore();
            });
            const totHMm = Math.round((bounds.maxY - bounds.minY) * pitch);
            sCtx.save();
            sCtx.translate(outLeftX - 10, (pTL.y + pBR.y) / 2);
            sCtx.rotate(-Math.PI / 2);
            sCtx.fillText(totHMm.toLocaleString(), 0, 0);
            sCtx.restore();

            sCtx.restore();
        } finally {
            window.canvas2d = origCanvas;
            window.ctx = origCtx;
            state.cam2d.x = origCam.x;
            state.cam2d.y = origCam.y;
            state.cam2d.zoom = origCam.zoom;
            state.designerMode = origDesigner;
        }

        // 右サイドパネル：面積集計表＆各室帖数一覧表
        const sideX = (paperMm.w - marginMm - sidePanelWMm) * pxPerMm;
        const sideY = mPx + 6;
        const sideW = sidePanelWMm * pxPerMm - 6;
        const sideH = drawAreaHMm * pxPerMm;

        sCtx.strokeStyle = '#0f172a';
        sCtx.lineWidth = 2;
        sCtx.strokeRect(sideX, sideY, sideW, sideH);

        sCtx.fillStyle = '#0f172a';
        sCtx.fillRect(sideX, sideY, sideW, 38);
        sCtx.fillStyle = '#ffffff';
        sCtx.font = 'bold 18px "Noto Sans JP", sans-serif';
        sCtx.textAlign = 'center';
        sCtx.textBaseline = 'middle';
        sCtx.fillText('面積集計・各室一覧表', sideX + sideW / 2, sideY + 19);

        const toTsubo = (m2) => m2 / 3.305785;
        const f1M2 = (typeof calcFloorAreaM2 === 'function') ? calcFloorAreaM2(1) : 0;
        const f2M2 = (typeof calcFloorAreaM2 === 'function') ? calcFloorAreaM2(2) : 0;
        const totM2 = f1M2 + f2M2 + ((typeof calcFloorAreaM2 === 'function') ? calcFloorAreaM2(3) : 0);

        let ry = sideY + 56;
        sCtx.fillStyle = '#0f172a';
        sCtx.font = 'bold 15px "Noto Sans JP", monospace';
        sCtx.textAlign = 'left';
        sCtx.fillText(`■ 1階床面積: ${f1M2.toFixed(2)}㎡ (${toTsubo(f1M2).toFixed(2)}坪)`, sideX + 14, ry); ry += 26;
        sCtx.fillText(`■ 2階床面積: ${f2M2.toFixed(2)}㎡ (${toTsubo(f2M2).toFixed(2)}坪)`, sideX + 14, ry); ry += 26;
        sCtx.fillStyle = '#b45309';
        sCtx.font = 'bold 16px "Noto Sans JP", monospace';
        sCtx.fillText(`★ 延床面積 : ${totM2.toFixed(2)}㎡ (${toTsubo(totM2).toFixed(2)}坪)`, sideX + 14, ry); ry += 28;

        sCtx.strokeStyle = '#cbd5e1';
        sCtx.lineWidth = 1.5;
        sCtx.beginPath(); sCtx.moveTo(sideX + 10, ry); sCtx.lineTo(sideX + sideW - 10, ry); sCtx.stroke();
        ry += 20;

        sCtx.fillStyle = '#334155';
        sCtx.font = 'bold 14px "Noto Sans JP", sans-serif';
        sCtx.fillText(`【${flNum === 0 ? '地下' : flNum + '階'} 室名・帖数・面積内訳】`, sideX + 14, ry);
        ry += 24;

        const pitchM = pitch / 1000;
        (fl.rooms || []).filter(r => r.type !== 'TENJO').slice(0, 24).forEach((rm, idx) => {
            const areaM2 = (typeof getRoomAreaM2 === 'function') ? getRoomAreaM2(rm) : ((rm.w * pitchM) * (rm.h * pitchM));
            const jyo = (areaM2 / (pitchM * pitchM * 2)).toFixed(1);
            const rName = rm.customName || rm.name || (window.ROOM_TYPES?.[rm.type]?.label) || `室${idx + 1}`;
            sCtx.fillStyle = '#0f172a';
            sCtx.font = '14px "Noto Sans JP", monospace';
            sCtx.textAlign = 'left';
            sCtx.fillText(`${idx + 1}. ${rName.slice(0, 10)}`, sideX + 14, ry);
            sCtx.textAlign = 'right';
            sCtx.fillText(`${jyo}帖 (${areaM2.toFixed(2)}㎡)`, sideX + sideW - 14, ry);
            ry += 22;
        });

        // 下部タイトル欄 (図面枠表題欄)
        const tbY = sheetCanvas.height - mPx - 6 - titleBarHMm * pxPerMm;
        const tbH = titleBarHMm * pxPerMm;
        const tbW = sheetCanvas.width - (mPx + 6) * 2;
        sCtx.strokeStyle = '#0f172a';
        sCtx.lineWidth = 2;
        sCtx.strokeRect(mPx + 6, tbY, tbW, tbH);

        const planTitle = document.getElementById('planTitleInput')?.value?.trim() || state.projectTitle || '新築計画案';
        const dateStr = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const flStr = flNum === 0 ? '地下1階平面図' : `${flNum}階平面図`;

        sCtx.fillStyle = '#0f172a';
        sCtx.font = 'bold 24px "Noto Sans JP", sans-serif';
        sCtx.textAlign = 'left';
        sCtx.textBaseline = 'middle';
        sCtx.fillText(`工事名称：${planTitle}   [${flStr}]`, mPx + 28, tbY + tbH / 2);

        sCtx.font = 'bold 17px "Noto Sans JP", monospace';
        sCtx.textAlign = 'right';
        sCtx.fillText(
            `用紙: ${paper}横 ｜ 縮尺: S=${scaleLabel} ｜ モジュール: ${pitch}mm ｜ 作成日: ${dateStr} ｜ 株式会社住ま居る（家づくりサポート係）`,
            mPx + tbW - 20,
            tbY + tbH / 2
        );

        const imgDataUrl = sheetCanvas.toDataURL('image/png');

        if (mode === 'png') {
            const a = document.createElement('a');
            a.href = imgDataUrl;
            a.download = `Smile_Drawing_${planTitle.replace(/[\\/:*?"<>|]/g, '_')}_${flNum}F_${paper}_S1-${scaleDenom}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToast(`📐 縮尺図面シート（${paper}・${scaleLabel}）をPNG画像として保存しました`);
            return;
        }

        // PDF印刷・保存ウィンドウを起動（@page size で A3/A4 横・余白0を指定）
        const printWin = window.open('', '_blank');
        if (!printWin) {
            // ポップアップブロック時は画像ダウンロードにフォールバック
            const a = document.createElement('a');
            a.href = imgDataUrl;
            a.download = `Smile_Drawing_${planTitle.replace(/[\\/:*?"<>|]/g, '_')}_${flNum}F_${paper}_S1-${scaleDenom}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToast(`🖨️ ポップアップが制限されたため、縮尺図面シート（${paper}・${scaleLabel}）を直接ダウンロードしました`);
            return;
        }

        printWin.document.write(`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>${planTitle} - ${flStr} (${paper} S=${scaleLabel})</title>
<style>
  @page { size: ${paper} landscape; margin: 0mm; }
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #1e293b; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; }
  .toolbar { position: fixed; top: 10px; right: 16px; display: flex; gap: 10px; z-index: 100; background: rgba(15,23,42,0.92); padding: 8px 14px; border-radius: 10px; border: 1px solid #f59e0b; }
  .toolbar button { background: #f59e0b; color: #0f172a; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 800; cursor: pointer; font-size: 13px; }
  .toolbar button.sub { background: #334155; color: #f8fafc; }
  img { width: ${paperMm.w}mm; height: ${paperMm.h}mm; max-width: 98vw; max-height: 95vh; object-fit: contain; background: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
  @media print {
    html, body { background: #fff; }
    .toolbar { display: none !important; }
    img { width: 100% !important; height: 100% !important; max-width: none !important; max-height: none !important; box-shadow: none !important; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">🖨️ PDFとして保存 / 印刷 (${paper}横・${scaleLabel})</button>
    <button class="sub" onclick="window.close()">✕ 閉じる</button>
  </div>
  <img src="${imgDataUrl}" onload="setTimeout(() => window.print(), 350);" />
</body>
</html>`);
        printWin.document.close();
        if (typeof showToast === 'function') {
            showToast(`🖨️ 縮尺つき図面（${paper}横・${scaleLabel}）を生成しました。印刷ダイアログで「PDFに保存」を選択してください`);
        }
    }

    window.exportDXF = exportDXF;
    window.openScalePdfModal = openScalePdfModal;
    window.closeScalePdfModal = closeScalePdfModal;
    window.executeScaledPdfExport = executeScaledPdfExport;
})();
