// -*- coding: utf-8 -*-
const fs = require('fs');
const code = fs.readFileSync('src/madori-sketch/js/geometry/room_detector.js', 'utf8');
const window = {};
eval(code);

const walls = [
    { x1: 0, y1: 0, x2: 4, y2: 0 },
    { x1: 4, y1: 0, x2: 4, y2: 3 },
    { x1: 4, y1: 3, x2: 0, y2: 3 },
    { x1: 0, y1: 3, x2: 0, y2: 0 },
    { x1: 2, y1: 0, x2: 2, y2: 3 }
];

const subdivided = window.RoomDetector.subdivideWallSegments(walls);
console.log('Subdivided segments:', subdivided.length);
subdivided.forEach(s => console.log(`(${s.x1},${s.y1}) -> (${s.x2},${s.y2})`));

const rooms = window.RoomDetector.detectRoomsFromWalls(walls, [], 910);
console.log('Final detected rooms count:', rooms.length);
