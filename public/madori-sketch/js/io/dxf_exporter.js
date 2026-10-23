/**
 * 住ま居る 3D間取りスケッチ工房 (MadoriSketch)
 * DXFエクスポートモジュール (Single Responsibility: CAD-Compatible DXF Exporter)
 * 汎用建築CADで読み込み可能な実寸mm座標DXFファイルフォーマットの生成・ダウンロードを担当
 */
(function() {
    'use strict';

    /**
     * 現在選択中の階の間取りを実寸mm座標のDXF形式として生成・出力
     * @param {Object} floorData - 現在の階のデータ (rooms, walls, openings)
     * @param {number} pitch - モジュールピッチ (910 または 1000)
     * @param {number} currentFloor - 対象の階 (1, 2, 3)
     * @param {Function} toastFn - 完了通知コールバック関数 (optional)
     */
    function exportDXF(floorData, pitch, currentFloor, toastFn) {
        if (!floorData) {
            if (typeof state !== 'undefined' && state.floors) {
                floorData = state.floors[state.currentFloor];
                pitch = pitch || state.modulePitch || 910;
                currentFloor = currentFloor || state.currentFloor || 1;
            } else {
                console.error('[DxfExporter] No floor data available');
                return;
            }
        }

        let dxf = [];

        const pushCode = (code, val) => {
            dxf.push(String(code));
            dxf.push(String(val));
        };

        pushCode(0, 'SECTION');
        pushCode(2, 'ENTITIES');

        const addLine = (layer, x1, y1, x2, y2) => {
            pushCode(0, 'LINE');
            pushCode(8, layer);
            pushCode(10, (x1 * pitch).toFixed(2));
            pushCode(20, (-y1 * pitch).toFixed(2));
            pushCode(30, '0.0');
            pushCode(11, (x2 * pitch).toFixed(2));
            pushCode(21, (-y2 * pitch).toFixed(2));
            pushCode(31, '0.0');
        };

        const addText = (layer, x, y, height, textStr) => {
            pushCode(0, 'TEXT');
            pushCode(8, layer);
            pushCode(10, (x * pitch).toFixed(2));
            pushCode(20, (-y * pitch).toFixed(2));
            pushCode(30, '0.0');
            pushCode(40, height.toFixed(1));
            pushCode(1, textStr);
        };

        const roomTypes = window.ROOM_TYPES || {};

        if (floorData.rooms) {
            floorData.rooms.forEach(rm => {
                addLine('WALL', rm.x, rm.y, rm.x + rm.w, rm.y);
                addLine('WALL', rm.x + rm.w, rm.y, rm.x + rm.w, rm.y + rm.h);
                addLine('WALL', rm.x + rm.w, rm.y + rm.h, rm.x, rm.y + rm.h);
                addLine('WALL', rm.x, rm.y + rm.h, rm.x, rm.y);

                const title = rm.customName || (roomTypes[rm.type] ? roomTypes[rm.type].label : rm.type);
                const jyo = ((rm.w * rm.h) / 2).toFixed(1);
                addText('ROOM_TEXT', rm.x + rm.w * 0.25, rm.y + rm.h * 0.5, 180, `${title} (${jyo}帖)`);
            });
        }

        if (floorData.walls) {
            floorData.walls.forEach(wl => {
                addLine('WALL', wl.x1, wl.y1, wl.x2, wl.y2);
            });
        }

        if (floorData.openings) {
            floorData.openings.forEach(op => {
                const wP = (op.widthP || 1.0) / 2;
                if (op.orient === 'h') {
                    addLine('DOOR_WIN', op.x - wP, op.y, op.x + wP, op.y);
                } else {
                    addLine('DOOR_WIN', op.x, op.y - wP, op.x, op.y + wP);
                }
                const labelStr = op.label || (op.isWin ? `窓 W${op.widthMm || Math.round(wP*2*pitch)}` : `建具 W${op.widthMm || Math.round(wP*2*pitch)}`);
                addText('DOOR_WIN_TEXT', op.x, op.y, 140, labelStr);
            });
        }

        pushCode(0, 'ENDSEC');
        pushCode(0, 'EOF');

        const blob = new Blob([dxf.join('\r\n')], { type: 'application/dxf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Smile_MadoriSketch_${currentFloor}F_${pitch}mm.dxf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const msg = `${currentFloor}F 平面図を 汎用CAD互換DXF形式 (実寸mm座標) で出力しました`;
        if (typeof toastFn === 'function') {
            toastFn(msg);
        } else if (typeof showToast === 'function') {
            showToast(msg);
        }
    }

    // グローバル公開
    window.exportDXF = exportDXF;
})();
