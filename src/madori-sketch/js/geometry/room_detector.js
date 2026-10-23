// -*- coding: utf-8 -*-
/**
 * 住ま居る 3D間取りスケッチ工房 (MadoriSketch)
 * 壁閉ループ自動認識エンジン (Room Detector)
 * キャンバス座標系（Y下向き）に完全対応した最小面（部屋）抽出
 */

(function (window) {
    'use strict';

    const EPSILON = 0.05;

    function dist(p1, p2) {
        return Math.hypot(p1.x - p2.x, p1.y - p2.y);
    }

    function pointKey(p) {
        return `${Math.round(p.x * 20) / 20},${Math.round(p.y * 20) / 20}`;
    }

    function findSegmentIntersection(p1, p2, p3, p4) {
        const d1x = p2.x - p1.x;
        const d1y = p2.y - p1.y;
        const d2x = p4.x - p3.x;
        const d2y = p4.y - p3.y;

        const cross = d1x * d2y - d1y * d2x;
        if (Math.abs(cross) < 1e-6) return null;

        const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / cross;
        const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / cross;

        if (t >= -1e-4 && t <= 1 + 1e-4 && u >= -1e-4 && u <= 1 + 1e-4) {
            return {
                x: +(p1.x + t * d1x).toFixed(3),
                y: +(p1.y + t * d1y).toFixed(3)
            };
        }
        return null;
    }

    function isPointOnSegment(pt, p1, p2) {
        const dTotal = dist(p1, p2);
        if (dTotal < EPSILON) return false;
        const d1 = dist(pt, p1);
        const d2 = dist(pt, p2);
        return Math.abs(dTotal - (d1 + d2)) < EPSILON && d1 > EPSILON && d2 > EPSILON;
    }

    function subdivideWallSegments(walls) {
        const allPoints = [];
        walls.forEach(w => {
            allPoints.push({ x: w.x1, y: w.y1 });
            allPoints.push({ x: w.x2, y: w.y2 });
        });

        for (let i = 0; i < walls.length; i++) {
            for (let j = i + 1; j < walls.length; j++) {
                const w1 = walls[i];
                const w2 = walls[j];
                const inter = findSegmentIntersection(
                    { x: w1.x1, y: w1.y1 }, { x: w1.x2, y: w1.y2 },
                    { x: w2.x1, y: w2.y1 }, { x: w2.x2, y: w2.y2 }
                );
                if (inter) allPoints.push(inter);
            }
        }

        const subSegments = [];

        walls.forEach(w => {
            const p1 = { x: w.x1, y: w.y1 };
            const p2 = { x: w.x2, y: w.y2 };
            const splitPts = [p1, p2];

            allPoints.forEach(pt => {
                if (isPointOnSegment(pt, p1, p2)) {
                    if (!splitPts.some(sp => dist(sp, pt) < EPSILON)) {
                        splitPts.push(pt);
                    }
                }
            });

            splitPts.sort((a, b) => dist(p1, a) - dist(p1, b));

            for (let k = 0; k < splitPts.length - 1; k++) {
                const sa = splitPts[k];
                const sb = splitPts[k + 1];
                if (dist(sa, sb) > EPSILON) {
                    subSegments.push({
                        x1: sa.x,
                        y1: sa.y,
                        x2: sb.x,
                        y2: sb.y,
                        type: w.type || 'interior'
                    });
                }
            }
        });

        const unique = [];
        subSegments.forEach(seg => {
            const exists = unique.some(u =>
                (dist({ x: u.x1, y: u.y1 }, { x: seg.x1, y: seg.y1 }) < EPSILON && dist({ x: u.x2, y: u.y2 }, { x: seg.x2, y: seg.y2 }) < EPSILON) ||
                (dist({ x: u.x1, y: u.y1 }, { x: seg.x2, y: seg.y2 }) < EPSILON && dist({ x: u.x2, y: u.y2 }, { x: seg.x1, y: seg.y1 }) < EPSILON)
            );
            if (!exists) unique.push(seg);
        });

        return unique;
    }

    function computeSignedPolygonArea(pts) {
        let area = 0;
        const n = pts.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += pts[i].x * pts[j].y;
            area -= pts[j].x * pts[i].y;
        }
        return area / 2.0;
    }

    function computePolygonCentroid(pts) {
        let cx = 0, cy = 0;
        let signedArea = 0;
        const n = pts.length;

        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const a = pts[i].x * pts[j].y - pts[j].x * pts[i].y;
            signedArea += a;
            cx += (pts[i].x + pts[j].x) * a;
            cy += (pts[i].y + pts[j].y) * a;
        }

        signedArea *= 0.5;
        if (Math.abs(signedArea) < 1e-5) {
            let sx = 0, sy = 0;
            pts.forEach(p => { sx += p.x; sy += p.y; });
            return { x: +(sx / n).toFixed(2), y: +(sy / n).toFixed(2) };
        }

        cx /= (6.0 * signedArea);
        cy /= (6.0 * signedArea);
        return { x: +cx.toFixed(2), y: +cy.toFixed(2) };
    }

    function normalizeAngleDiff(angleFrom, angleTo) {
        let diff = angleTo - angleFrom;
        while (diff <= 1e-6) diff += Math.PI * 2;
        while (diff > Math.PI * 2 + 1e-6) diff -= Math.PI * 2;
        return diff;
    }

    function isPointInsidePolygon(pt, pts) {
        let inside = false;
        const n = pts.length;
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = pts[i].x, yi = pts[i].y;
            const xj = pts[j].x, yj = pts[j].y;
            const intersect = ((yi > pt.y) !== (yj > pt.y)) &&
                (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    function detectRoomsFromWalls(walls, existingRooms, pitch) {
        if (!walls || walls.length < 3) return [];

        const pitchM = (pitch || 910) / 1000;
        const segments = subdivideWallSegments(walls);
        const nodesMap = new Map();

        function getNode(p) {
            const k = pointKey(p);
            if (!nodesMap.has(k)) {
                nodesMap.set(k, {
                    id: k,
                    x: Math.round(p.x * 20) / 20,
                    y: Math.round(p.y * 20) / 20,
                    neighbors: []
                });
            }
            return nodesMap.get(k);
        }

        segments.forEach(seg => {
            const n1 = getNode({ x: seg.x1, y: seg.y1 });
            const n2 = getNode({ x: seg.x2, y: seg.y2 });
            if (n1.id === n2.id) return;

            const a12 = Math.atan2(n2.y - n1.y, n2.x - n1.x);
            const a21 = Math.atan2(n1.y - n2.y, n1.x - n2.x);

            if (!n1.neighbors.some(nb => nb.node.id === n2.id)) n1.neighbors.push({ node: n2, angle: a12 });
            if (!n2.neighbors.some(nb => nb.node.id === n1.id)) n2.neighbors.push({ node: n1, angle: a21 });
        });

        const visitedEdges = new Set();
        const candidateFaces = [];

        nodesMap.forEach(u => {
            u.neighbors.forEach(nb => {
                const startEdgeKey = `${u.id}->${nb.node.id}`;
                if (visitedEdges.has(startEdgeKey)) return;

                const loop = [u];
                let prev = u;
                let curr = nb.node;
                visitedEdges.add(startEdgeKey);

                let isClosed = false;
                let step = 0;

                while (step < 60) {
                    step++;
                    loop.push(curr);

                    if (curr.id === u.id) {
                        isClosed = true;
                        break;
                    }

                    const inAngle = Math.atan2(prev.y - curr.y, prev.x - curr.x);
                    let bestNb = null;
                    let minAngleDiff = Infinity;

                    curr.neighbors.forEach(cand => {
                        const diff = normalizeAngleDiff(inAngle, cand.angle);
                        if (diff < minAngleDiff) {
                            minAngleDiff = diff;
                            bestNb = cand;
                        }
                    });

                    if (!bestNb) break;

                    const nextEdgeKey = `${curr.id}->${bestNb.node.id}`;
                    visitedEdges.add(nextEdgeKey);
                    prev = curr;
                    curr = bestNb.node;
                }

                if (isClosed && loop.length >= 4) {
                    const pts = loop.slice(0, loop.length - 1).map(n => ({ x: n.x, y: n.y }));
                    const signedArea = computeSignedPolygonArea(pts);

                    // キャンバス系(Y下向き)では内部面は signedArea < 0 (時計回り)
                    // 面積の絶対値が 0.3マス以上
                    if (signedArea < -0.3) {
                        candidateFaces.push({ pts: pts, absArea: Math.abs(signedArea) });
                    }
                }
            });
        });

        // 重複および包含ループ（外周）の除外
        const validFaces = [];
        candidateFaces.forEach(f => {
            const centroid = computePolygonCentroid(f.pts);
            const exists = validFaces.some(vf => {
                const c2 = computePolygonCentroid(vf.pts);
                return dist(centroid, c2) < 0.1 && Math.abs(f.absArea - vf.absArea) < 0.1;
            });
            if (!exists) validFaces.push(f);
        });

        // 部屋オブジェクトの生成
        const rooms = validFaces.map(face => {
            const centroid = computePolygonCentroid(face.pts);
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            face.pts.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });

            const w = +(maxX - minX).toFixed(2);
            const h = +(maxY - minY).toFixed(2);

            const areaM2 = +(face.absArea * pitchM * pitchM).toFixed(1);
            const tsubo = +(areaM2 / 3.305785).toFixed(2);
            const jo = +(areaM2 / 1.62).toFixed(1);

            let matchedExisting = null;
            if (existingRooms && existingRooms.length > 0) {
                matchedExisting = existingRooms.find(er => {
                    const ec = er.centroid || { x: er.x + er.w / 2, y: er.y + er.h / 2 };
                    return dist(centroid, ec) < 0.7;
                });
            }

            const roomType = (matchedExisting && matchedExisting.type) || 'OTHER';
            const roomName = (matchedExisting && matchedExisting.name) || '';
            const color2d = (matchedExisting && matchedExisting.color2d) || 'rgba(226, 232, 240, 0.65)';
            const color3d = (matchedExisting && matchedExisting.color3d) || '#f1f5f9';

            return {
                id: (matchedExisting && matchedExisting.id) || ('room_' + Math.random().toString(36).substr(2, 9)),
                kind: 'room',
                type: roomType,
                name: roomName,
                isAutoDetected: true,
                points: face.pts,
                x: minX,
                y: minY,
                w: w,
                h: h,
                centroid: centroid,
                areaM2: areaM2,
                tsubo: tsubo,
                jo: jo,
                color2d: color2d,
                color3d: color3d
            };
        });

        return rooms;
    }

    window.RoomDetector = {
        detectRoomsFromWalls: detectRoomsFromWalls,
        subdivideWallSegments: subdivideWallSegments,
        computeSignedPolygonArea: computeSignedPolygonArea,
        computePolygonCentroid: computePolygonCentroid,
        isPointInsidePolygon: isPointInsidePolygon
    };

})(typeof window !== 'undefined' ? window : this);
