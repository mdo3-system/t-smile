// -*- coding: utf-8 -*-
const fs = require('fs');
const code = fs.readFileSync('src/madori-sketch/js/geometry/room_detector.js', 'utf8');
const window = {};
eval(code);

const walls2_split = [
    { x1: 0, y1: 0, x2: 2, y2: 0 },
    { x1: 2, y1: 0, x2: 4, y2: 0 },
    { x1: 4, y1: 0, x2: 4, y2: 3 },
    { x1: 4, y1: 3, x2: 2, y2: 3 },
    { x1: 2, y1: 3, x2: 0, y2: 3 },
    { x1: 0, y1: 3, x2: 0, y2: 0 },
    { x1: 2, y1: 0, x2: 2, y2: 3 }
];

const rooms2 = window.RoomDetector.detectRoomsFromWalls(walls2_split, [], 910);
console.log('Detected count:', rooms2.length);
rooms2.forEach((r, i) => {
    console.log(`Room ${i+1}: area=${r.areaM2}, bbox=(${r.x}, ${r.y}, ${r.w}, ${r.h}), pts=`, r.points);
});
