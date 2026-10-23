// -*- coding: utf-8 -*-
const fs = require('fs');

const segments = [
    { x1: 0, y1: 0, x2: 2, y2: 0 },
    { x1: 2, y1: 0, x2: 4, y2: 0 },
    { x1: 4, y1: 0, x2: 4, y2: 3 },
    { x1: 4, y1: 3, x2: 2, y2: 3 },
    { x1: 2, y1: 3, x2: 0, y2: 3 },
    { x1: 0, y1: 3, x2: 0, y2: 0 },
    { x1: 2, y1: 0, x2: 2, y2: 3 }
];

function pointKey(p) { return `${p.x},${p.y}`; }
const nodesMap = new Map();
function getNode(p) {
    const k = pointKey(p);
    if (!nodesMap.has(k)) {
        nodesMap.set(k, { id: k, x: p.x, y: p.y, neighbors: [] });
    }
    return nodesMap.get(k);
}

segments.forEach(seg => {
    const n1 = getNode({ x: seg.x1, y: seg.y1 });
    const n2 = getNode({ x: seg.x2, y: seg.y2 });
    const a12 = Math.atan2(n2.y - n1.y, n2.x - n1.x);
    const a21 = Math.atan2(n1.y - n2.y, n1.x - n2.x);
    if (!n1.neighbors.some(nb => nb.node.id === n2.id)) n1.neighbors.push({ node: n2, angle: a12 });
    if (!n2.neighbors.some(nb => nb.node.id === n1.id)) n2.neighbors.push({ node: n1, angle: a21 });
});

function normalizeAngleDiff(angleFrom, angleTo) {
    let diff = angleTo - angleFrom;
    while (diff <= 1e-6) diff += Math.PI * 2;
    while (diff > Math.PI * 2 + 1e-6) diff -= Math.PI * 2;
    return diff;
}

const visitedEdges = new Set();
const detectedFaces = [];

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

        while (step < 20) {
            step++;
            loop.push(curr);
            if (curr.id === u.id) { isClosed = true; break; }

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

        console.log(`From edge ${startEdgeKey}: closed=${isClosed}, length=${loop.length}`);
        if (isClosed) {
            console.log('   Loop nodes:', loop.map(n => n.id).join(' -> '));
        }
    });
});
