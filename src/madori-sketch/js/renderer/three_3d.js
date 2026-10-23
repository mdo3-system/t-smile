/**
 * 住ま居る 3D間取りスケッチ工房 (MadoriSketch)
 * 3D建築ホワイトモデルレンダラー (Single Responsibility: Three.js 3D Architectural White Engine)
 * CSG壁開口くり抜き・床スラブ・柱・建具・設備・屋根の3D生成およびワンタップ黄金比アングル制御を担当
 */
(function() {
    'use strict';

// ============================================================================
// 3D WHITE ARCHITECTURAL MODEL ENGINE (THREE.JS WITH OPENING CUTOUTS & NO WALL PILLARS)
// ============================================================================

const canvas3d = document.getElementById('canvas3d');
let scene3d, camera3d, renderer3d, buildingGroup, sunLight, ambientLight, hemiLight;

const orbit = {
    theta: Math.PI * 0.22,
    phi: Math.PI * 0.30,
    radius: 17.5,
    target: new THREE.Vector3(3.0, 2.5, 3.0),
    isDown: false,
    mode: 'orbit',
    lastX: 0,
    lastY: 0,
    pinchDist: 0
};

function init3DEngine() {
    scene3d = new THREE.Scene();

    camera3d = new THREE.PerspectiveCamera(42, 1, 0.1, 220);
    renderer3d = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true, alpha: true });
    renderer3d.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer3d.shadowMap.enabled = true;
    renderer3d.shadowMap.type = THREE.PCFSoftShadowMap;

    // Clean Studio White Model Lighting
    ambientLight = new THREE.AmbientLight(0xffffff, 0.58);
    scene3d.add(ambientLight);

    hemiLight = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 0.35);
    hemiLight.position.set(0, 30, 0);
    scene3d.add(hemiLight);

    sunLight = new THREE.DirectionalLight(0xffffff, 0.78);
    sunLight.position.set(14, 26, 16);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 65;
    const d = 16;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene3d.add(sunLight);

    // Architectural Presentation Baseboard (Clean Light Gray)
    const groundGeo = new THREE.PlaneGeometry(70, 70);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.08;
    groundMesh.receiveShadow = true;
    scene3d.add(groundMesh);

    const gridHelper = new THREE.GridHelper(32, 32, 0x94a3b8, 0xcbd5e1);
    gridHelper.position.set(3, -0.06, 3);
    scene3d.add(gridHelper);

    buildingGroup = new THREE.Group();
    scene3d.add(buildingGroup);

    window.scene3d = scene3d;
    window.camera3d = camera3d;
    window.renderer3d = renderer3d;
    window.buildingGroup = buildingGroup;

    setup3DPointerControls();
    update3DCameraTransform();
}

function update3DCameraTransform() {
    if (!camera3d) return;
    orbit.phi = Math.max(0.08, Math.min(Math.PI * 0.48, orbit.phi));
    orbit.radius = Math.max(1.5, Math.min(48, orbit.radius));

    const x = orbit.target.x + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
    const y = orbit.target.y + orbit.radius * Math.cos(orbit.phi);
    const z = orbit.target.z + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);

    camera3d.position.set(x, y, z);
    camera3d.lookAt(orbit.target);
}

function setup3DPointerControls() {
    const activePointers = new Map();

    canvas3d.addEventListener('pointerdown', (e) => {
        canvas3d.setPointerCapture(e.pointerId);
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        orbit.isDown = true;
        orbit.lastX = e.clientX;
        orbit.lastY = e.clientY;
        orbit.mode = (e.button === 2 || e.button === 1 || activePointers.size >= 2) ? 'pan' : 'orbit';

        if (activePointers.size === 2) {
            const pts = Array.from(activePointers.values());
            orbit.pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        }
    });

    canvas3d.addEventListener('pointermove', (e) => {
        if (!activePointers.has(e.pointerId)) return;
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (activePointers.size === 2) {
            const pts = Array.from(activePointers.values());
            const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            if (orbit.pinchDist > 0) {
                orbit.radius += (orbit.pinchDist - dist) * 0.04;
                update3DCameraTransform();
            }
            orbit.pinchDist = dist;
            return;
        }

        if (!orbit.isDown) return;
        const dx = e.clientX - orbit.lastX;
        const dy = e.clientY - orbit.lastY;
        orbit.lastX = e.clientX;
        orbit.lastY = e.clientY;

        if (orbit.mode === 'orbit') {
            orbit.theta -= dx * 0.007;
            orbit.phi -= dy * 0.007;
        } else {
            const panScale = orbit.radius * 0.0018;
            orbit.target.x -= dx * Math.cos(orbit.theta) * panScale;
            orbit.target.z += dx * Math.sin(orbit.theta) * panScale;
            orbit.target.y += dy * panScale;
        }
        update3DCameraTransform();
    });

    const endPointer = (e) => {
        activePointers.delete(e.pointerId);
        if (activePointers.size === 0) orbit.isDown = false;
    };
    canvas3d.addEventListener('pointerup', endPointer);
    canvas3d.addEventListener('pointercancel', endPointer);
    canvas3d.addEventListener('contextmenu', e => e.preventDefault());

    canvas3d.addEventListener('wheel', (e) => {
        e.preventDefault();
        orbit.radius *= (e.deltaY > 0 ? 1.1 : 0.9);
        update3DCameraTransform();
    }, { passive: false });
}

function set3DCameraPreset(preset) {
    if (preset === 'bird') {
        orbit.target.set(3.0, 2.2, 3.0);
        orbit.theta = Math.PI * 0.22;
        orbit.phi = Math.PI * 0.28;
        orbit.radius = 17.5;
    } else if (preset === 'exterior') {
        orbit.target.set(3.0, 2.8, 3.0);
        orbit.theta = Math.PI * 0.14;
        orbit.phi = Math.PI * 0.45;
        orbit.radius = 16.0;
    } else if (preset === 'interior') {
        const focusFloorY = state.floorDisplay3D === '2f' ? 3.8 : (state.floorDisplay3D === '3f' ? 6.4 : 1.4);
        orbit.target.set(2.8, focusFloorY, 2.5);
        orbit.theta = -Math.PI * 0.35;
        orbit.phi = Math.PI * 0.46;
        orbit.radius = 3.0;
    }
    update3DCameraTransform();
}

function set3DFloorDisplay(mode) {
    state.floorDisplay3D = mode;
    ['all', '1f', '2f', '3f'].forEach(m => {
        const btn = document.getElementById('btn3DMode_' + m);
        if (btn) {
            btn.className = (m === mode)
                ? 'px-2 py-1 rounded text-[11px] font-bold bg-blue-600 text-white shadow transition'
                : 'px-2 py-1 rounded text-[11px] font-bold text-slate-300 hover:text-white transition';
        }
    });
    rebuild3DScene();
    const names = { 'all': '全て表示 (1F〜3F)', '1f': '1階のみ', '2f': '2階のみ', '3f': '3階のみ' };
    showToast(`3Dホワイトモデル表示を「${names[mode]}」に切り替えました`);
}

function toggle3DRoof() {
    state.showRoof3D = !state.showRoof3D;
    const lbl = document.getElementById('lbl3DRoof');
    lbl.textContent = state.showRoof3D ? 'ON (ホワイト屋根)' : 'OFF (内部確認)';
    lbl.className = state.showRoof3D ? 'text-sky-400' : 'text-slate-400';
    rebuild3DScene();
}

function updateSunLight(val) {
    state.sunHour = parseFloat(val);
    const hrs = Math.floor(state.sunHour);
    const mins = (state.sunHour % 1) === 0.5 ? '30' : '00';
    document.getElementById('sunTimeLabel').textContent = `${hrs}:${mins}`;

    const norm = (state.sunHour - 7) / 11;
    const angle = norm * Math.PI * 0.85 + 0.15;
    const r = 26;
    sunLight.position.set(Math.cos(angle) * r, Math.max(5, Math.sin(angle) * r), 15);
}

// Helper: Add clean architectural white model mesh with subtle edge lines
function addWhiteModelMesh(geo, mat, x, y, z, addEdges = true) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (addEdges) {
        const edges = new THREE.EdgesGeometry(geo);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.65 });
        const wire = new THREE.LineSegments(edges, lineMat);
        mesh.add(wire);
    }
    buildingGroup.add(mesh);
    return mesh;
}

// Build a wall segment with exact cutouts for any doors or windows on that wall line
function buildWallWithOpeningCutouts3D(orient, fixedCoordP, startP, endP, baseY, wallHeight, wallThick, floorOpenings, scaleP, matWall) {
    const relevantOps = floorOpenings.filter(op => {
        if (op.orient !== orient) return false;
        const opFixed = orient === 'h' ? op.y : op.x;
        if (Math.abs(opFixed - fixedCoordP) > 0.12) return false;
        const opCenter = orient === 'h' ? op.x : op.y;
        return opCenter > startP + 0.05 && opCenter < endP - 0.05;
    }).sort((a, b) => (orient === 'h' ? a.x - b.x : a.y - b.y));

    let cursorP = startP;

    const addSolidSegment = (pA, pB, yBottom, hSeg) => {
        const lenP = pB - pA;
        if (lenP <= 0.02 || hSeg <= 0.02) return;
        const lenM = lenP * scaleP;
        const midM = ((pA + pB) / 2) * scaleP;
        const fixedM = fixedCoordP * scaleP;

        if (orient === 'h') {
            const geo = new THREE.BoxGeometry(lenM + wallThick, hSeg, wallThick);
            addWhiteModelMesh(geo, matWall, midM, yBottom + hSeg / 2, fixedM, true);
        } else {
            const geo = new THREE.BoxGeometry(wallThick, hSeg, lenM + wallThick);
            addWhiteModelMesh(geo, matWall, fixedM, yBottom + hSeg / 2, midM, true);
        }
    };

    relevantOps.forEach(op => {
        const opCenter = orient === 'h' ? op.x : op.y;
        const wP = op.widthP || 1.0;
        const opStart = Math.max(startP, opCenter - wP / 2);
        const opEnd = Math.min(endP, opCenter + wP / 2);

        // Full-height wall before opening
        if (opStart > cursorP) {
            addSolidSegment(cursorP, opStart, baseY, wallHeight);
        }

        // Sill wall below window (腰壁)
        const sillM = (op.sillMm || 0) / 1000;
        const hM = (op.heightMm || 2000) / 1000;
        if (sillM > 0.02 && wallHeight > sillM) {
            addSolidSegment(opStart, opEnd, baseY, Math.min(sillM, wallHeight));
        }

        // Header wall above opening (垂れ壁・まぐさ)
        const topStart = sillM + hM;
        if (wallHeight > topStart + 0.02) {
            addSolidSegment(opStart, opEnd, baseY + topStart, wallHeight - topStart);
        }

        cursorP = opEnd;
    });

    // Remaining full-height wall after last opening
    if (cursorP < endP) {
        addSolidSegment(cursorP, endP, baseY, wallHeight);
    }
}

function rebuild3DScene() {
    if (!buildingGroup) return;
    ensureFloorsStructure();

    while (buildingGroup.children.length > 0) {
        buildingGroup.remove(buildingGroup.children[0]);
    }

    const scaleP = state.modulePitch / 1000;
    const wallHeight = 2.55;
    const slabHeight = 0.18;
    const wallThick = 0.14;

    // Pure Architectural White Model Materials
    const matWhiteWall = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const matWhiteSlab = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const matPorchSlab = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
    const matWhiteFixture = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
    const matGlass = new THREE.MeshLambertMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.42 });
    const matDoorPanel = new THREE.MeshLambertMaterial({ color: 0xf8fafc });

    const floorsToBuild = [];
    if (state.floorDisplay3D === 'all') floorsToBuild.push(1, 2, 3);
    else if (state.floorDisplay3D === '1f') floorsToBuild.push(1);
    else if (state.floorDisplay3D === '2f') floorsToBuild.push(2);
    else if (state.floorDisplay3D === '3f') floorsToBuild.push(3);

    // 1Fと2Fの継ぎ目（シーム）解消: スラブ高さを壁内側に収める
    floorsToBuild.forEach(flNum => {
        const flData = state.floors[flNum];
        if (!flData) return;
        const baseY = (flNum - 1) * (wallHeight + slabHeight);

        // 1. Rooms: Unified White Slabs & Continuous White Walls (NO corner columns on walls)
        flData.rooms.forEach(rm => {
            const rt = ROOM_TYPES[rm.type] || ROOM_TYPES.LDK;
            const sMat = rm.type === 'PORCH' ? matPorchSlab : matWhiteSlab;

            // Floor Slab (Polygon or Box)
            if (rm.type !== 'VOID') {
                if (rm.points && rm.points.length >= 3) {
                    const shape = new THREE.Shape();
                    shape.moveTo(rm.points[0].x * scaleP, rm.points[0].y * scaleP);
                    for (let i = 1; i < rm.points.length; i++) {
                        shape.lineTo(rm.points[i].x * scaleP, rm.points[i].y * scaleP);
                    }
                    shape.closePath();
                    const extrudeSettings = { depth: slabHeight, bevelEnabled: false };
                    const slabGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                    // Rotate so extrusion is on Y-axis
                    slabGeo.rotateX(Math.PI / 2);
                    slabGeo.translate(0, baseY + slabHeight, 0);
                    const slabMesh = new THREE.Mesh(slabGeo, sMat);
                    slabMesh.receiveShadow = true;
                    buildingGroup.add(slabMesh);
                } else {
                    const wM = rm.w * scaleP;
                    const hM = rm.h * scaleP;
                    const cx = (rm.x + rm.w / 2) * scaleP;
                    const cz = (rm.y + rm.h / 2) * scaleP;
                    const slabGeo = new THREE.BoxGeometry(wM, slabHeight, hM);
                    addWhiteModelMesh(slabGeo, sMat, cx, baseY + slabHeight / 2, cz, true);
                }
            }

            // Continuous Walls with Opening Cutouts (Only for legacy manual rooms, skip for auto-detected rooms as walls are in flData.walls)
            if (!rm.isAutoDetected && rt.hasWall) {
                const hWall = rm.type === 'BALCONY' ? 1.15 : wallHeight;
                const wY = baseY + slabHeight;

                buildWallWithOpeningCutouts3D('h', rm.y, rm.x, rm.x + rm.w, wY, hWall, wallThick, flData.openings, scaleP, matWhiteWall);
                buildWallWithOpeningCutouts3D('h', rm.y + rm.h, rm.x, rm.x + rm.w, wY, hWall, wallThick, flData.openings, scaleP, matWhiteWall);
                buildWallWithOpeningCutouts3D('v', rm.x, rm.y, rm.y + rm.h, wY, hWall, wallThick, flData.openings, scaleP, matWhiteWall);
                buildWallWithOpeningCutouts3D('v', rm.x + rm.w, rm.y, rm.y + rm.h, wY, hWall, wallThick, flData.openings, scaleP, matWhiteWall);
            }
        });

        // 2. Custom Wall Segments (With Opening Cutouts for Doors & Windows)
        flData.walls.forEach(wl => {
            const isHoriz = Math.abs(wl.y1 - wl.y2) < 0.05;
            const wY = baseY + slabHeight;

            if (isHoriz) {
                const startX = Math.min(wl.x1, wl.x2);
                const endX = Math.max(wl.x1, wl.x2);
                if (endX - startX > 0.05) {
                    buildWallWithOpeningCutouts3D('h', wl.y1, startX, endX, wY, wallHeight, wallThick, flData.openings, scaleP, matWhiteWall);
                }
            } else {
                const startY = Math.min(wl.y1, wl.y2);
                const endY = Math.max(wl.y1, wl.y2);
                if (endY - startY > 0.05) {
                    buildWallWithOpeningCutouts3D('v', wl.x1, startY, endY, wY, wallHeight, wallThick, flData.openings, scaleP, matWhiteWall);
                }
            }
        });

        // 3. Standalone Columns (独立柱: ポーチやバルコニーの脚など単独配置された柱のみ表現)
        flData.pillars.forEach(pl => {
            const colSize = (pl.sizeMm || 150) / 1000;
            let colGeo;
            if (pl.shape === 'round') {
                colGeo = new THREE.CylinderGeometry(colSize / 2, colSize / 2, wallHeight + slabHeight, 16);
            } else {
                colGeo = new THREE.BoxGeometry(colSize, wallHeight + slabHeight, colSize);
            }
            addWhiteModelMesh(
                colGeo,
                matWhiteWall,
                pl.x * scaleP,
                baseY + (wallHeight + slabHeight) / 2,
                pl.y * scaleP,
                true
            );
        });

        // 4. 3D Doors & Windows Frames inside the Wall Cutouts
        const matGenkan = new THREE.MeshLambertMaterial({ color: 0x78350f }); // 重厚木調/アルミブロンズ

        flData.openings.forEach(op => {
            const ot = (window.OPENING_TYPES && window.OPENING_TYPES[op.type]) ? window.OPENING_TYPES[op.type] : { widthP: 1.0, heightMm: 2000, isWin: false };
            const wM = (op.widthP || ot.widthP) * scaleP;
            const hM = (op.heightMm || ot.heightMm) / 1000;
            const sillM = (op.sillMm !== undefined ? op.sillMm : 0) / 1000;

            const isWin = op.isWin !== undefined ? op.isWin : (op.category === 'window' || ot.isWin || (op.type && op.type.startsWith('WIN')));
            const isGenkan = op.doorFit === 'genkan_slide' || op.type === 'ENTRANCE_DOOR';
            const doorMat = isGenkan ? matGenkan : matDoorPanel;

            // サッシ枠とガラスを壁厚（0.14m）に合わせて立体描画（埋もれ防止）
            const frameThick = wallThick + 0.02; // 壁から1cmずつ出っ張る綺麗な立体額縁
            const boxW = op.orient === 'h' ? wM : frameThick;
            const boxD = op.orient === 'h' ? frameThick : wM;
            
            // ガラス面
            const opGeo = new THREE.BoxGeometry(boxW * 0.98, hM * 0.96, boxD * 0.98);
            addWhiteModelMesh(
                opGeo,
                isWin ? matGlass : doorMat,
                op.x * scaleP,
                baseY + slabHeight + sillM + hM / 2,
                op.y * scaleP,
                true
            );

            // 窓サッシ枠（ホワイトモデル用サッシ枠）
            if (isWin) {
                const sFrameGeo = new THREE.BoxGeometry(boxW, hM, boxD);
                const sFrameMesh = new THREE.Mesh(sFrameGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, wireframe: true }));
                sFrameMesh.position.set(op.x * scaleP, baseY + slabHeight + sillM + hM / 2, op.y * scaleP);
                buildingGroup.add(sFrameMesh);
            }
        });

        // 5. Clean White Model 3D Fixtures (キッチン、UB、洗面化粧台、トイレ、柱)
        flData.fixtures.forEach(fx => {
            const wM = fx.w * scaleP;
            const dM = fx.h * scaleP;
            const cx = (fx.x + fx.w / 2) * scaleP;
            const cz = (fx.y + fx.h / 2) * scaleP;
            const floorTopY = baseY + slabHeight;
            const kH = ((fx.kHeight || 850) / 1000);
            const vH = ((fx.vHeight || 800) / 1000);

            if (fx.type === 'KITCHEN_L') {
                // L型キッチン: 2方向のカウンター
                const depthM = (fx.d || 650) / 1000;
                // メインカウンター (X軸沿い)
                const mGeo = new THREE.BoxGeometry(wM, kH, depthM);
                addWhiteModelMesh(mGeo, matWhiteFixture, cx, floorTopY + kH / 2, fx.y * scaleP + depthM / 2, true);
                // サブカウンター (Z軸沿い、メインと重複しない部分)
                const subLen = Math.max(0.1, dM - depthM);
                const sGeo = new THREE.BoxGeometry(depthM, kH, subLen);
                addWhiteModelMesh(sGeo, matWhiteFixture, fx.x * scaleP + depthM / 2, floorTopY + kH / 2, fx.y * scaleP + depthM + subLen / 2, true);
            } else if (fx.type === 'KITCHEN_I' || fx.type === 'KITCHEN_ISLAND' || fx.type.startsWith('KITCHEN')) {
                // I型 / アイランド・ペニンシュラ
                const kGeo = new THREE.BoxGeometry(wM, kH, dM);
                addWhiteModelMesh(kGeo, matWhiteFixture, cx, floorTopY + kH / 2, cz, true);
            } else if (fx.type === 'UB' || fx.type === 'UB_1616') {
                // ユニットバス: 浴槽（半分）と洗い場カウンター
                const tubH = 0.52;
                if (fx.ubPattern === 'patternB') {
                    // 長手出入り: X方向に浴槽と洗い場を分割
                    const tubW = wM * 0.48;
                    const tubD = dM * 0.92;
                    const bGeo = new THREE.BoxGeometry(tubW, tubH, tubD);
                    addWhiteModelMesh(bGeo, matWhiteFixture, fx.x * scaleP + tubW / 2 + 0.05, floorTopY + tubH / 2, cz, true);
                    // 洗い場カウンター
                    const cGeo = new THREE.BoxGeometry(wM * 0.40, 0.22, 0.25);
                    addWhiteModelMesh(cGeo, matWhiteFixture, fx.x * scaleP + wM * 0.75, floorTopY + 0.45, fx.y * scaleP + 0.2, true);
                } else {
                    // 短手出入り (patternA / デフォルト): Z方向に浴槽と洗い場を分割
                    const tubW = wM * 0.92;
                    const tubD = dM * 0.48;
                    const bGeo = new THREE.BoxGeometry(tubW, tubH, tubD);
                    addWhiteModelMesh(bGeo, matWhiteFixture, cx, floorTopY + tubH / 2, fx.y * scaleP + tubD / 2 + 0.05, true);
                    // 洗い場カウンター
                    const cGeo = new THREE.BoxGeometry(0.25, 0.22, dM * 0.40);
                    addWhiteModelMesh(cGeo, matWhiteFixture, fx.x * scaleP + 0.2, floorTopY + 0.45, fx.y * scaleP + dM * 0.75, true);
                }
            } else if (fx.type === 'VANITY') {
                // システム洗面化粧台: ベースキャビネット + 上部ミラー
                const cabGeo = new THREE.BoxGeometry(wM, vH, dM);
                addWhiteModelMesh(cabGeo, matWhiteFixture, cx, floorTopY + vH / 2, cz, true);
                // 上部三面鏡/一面鏡
                const mirrorH = 0.90;
                const mGeo = new THREE.BoxGeometry(wM * 0.96, mirrorH, 0.12);
                addWhiteModelMesh(mGeo, matWhiteFixture, cx, floorTopY + vH + mirrorH / 2, fx.y * scaleP + 0.08, true);
            } else if (fx.type === 'STANDALONE_COL') {
                // 独立柱 (階高いっぱい)
                const colGeo = new THREE.BoxGeometry(wM, wallHeight, dM);
                addWhiteModelMesh(colGeo, matWhiteFixture, cx, floorTopY + wallHeight / 2, cz, true);
            } else if (fx.type.startsWith('STAIR')) {
                const totalSteps = fx.steps || 14;
                const totalRise = wallHeight + slabHeight;
                const stepH = totalRise / totalSteps;
                const isDown = fx.direction === 'DOWN';

                if (fx.shapeType === 'U_SHAPE') {
                    // コの字型（折り返し階段 / 2スパン）
                    const halfSteps = Math.ceil(totalSteps / 2);
                    const halfW = wM * 0.48;
                    // 行き（登り始めスパン）
                    for (let i = 0; i < halfSteps; i++) {
                        const sIdx = isDown ? (totalSteps - 1 - i) : i;
                        const curY = floorTopY + (sIdx + 0.5) * stepH;
                        const sGeo = new THREE.BoxGeometry(halfW, 0.12, dM / halfSteps);
                        addWhiteModelMesh(sGeo, matWhiteFixture, fx.x * scaleP + halfW / 2, curY, fx.y * scaleP + (i + 0.5) * (dM / halfSteps), true);
                    }
                    // 帰り（折り返しスパン）
                    for (let i = 0; i < halfSteps; i++) {
                        const sIdx = isDown ? (halfSteps - 1 - i) : (halfSteps + i);
                        const curY = floorTopY + (sIdx + 0.5) * stepH;
                        const sGeo = new THREE.BoxGeometry(halfW, 0.12, dM / halfSteps);
                        addWhiteModelMesh(sGeo, matWhiteFixture, fx.x * scaleP + wM - halfW / 2, curY, fx.y * scaleP + (halfSteps - 1 - i + 0.5) * (dM / halfSteps), true);
                    }
                } else if (fx.w <= fx.h) {
                    // 南北方向の直階段 / L型
                    for (let i = 0; i < totalSteps; i++) {
                        const sIdx = isDown ? (totalSteps - 1 - i) : i;
                        const curY = floorTopY + (sIdx + 0.5) * stepH;
                        const sGeo = new THREE.BoxGeometry(wM * 0.95, 0.12, dM / totalSteps);
                        addWhiteModelMesh(sGeo, matWhiteFixture, cx, curY, fx.y * scaleP + (i + 0.5) * (dM / totalSteps), true);
                    }
                } else {
                    // 東西方向の直階段 / L型
                    for (let i = 0; i < totalSteps; i++) {
                        const sIdx = isDown ? (totalSteps - 1 - i) : i;
                        const curY = floorTopY + (sIdx + 0.5) * stepH;
                        const sGeo = new THREE.BoxGeometry(wM / totalSteps, 0.12, dM * 0.95);
                        addWhiteModelMesh(sGeo, matWhiteFixture, fx.x * scaleP + (i + 0.5) * (wM / totalSteps), curY, cz, true);
                    }
                }
            } else if (fx.type === 'TOILET_FIX') {
                // トイレ便器: タンク部 + 便座部
                const tankGeo = new THREE.BoxGeometry(wM * 0.70, 0.78, dM * 0.35);
                addWhiteModelMesh(tankGeo, matWhiteFixture, cx, floorTopY + 0.39, fx.y * scaleP + dM * 0.2, true);
                const bowlGeo = new THREE.BoxGeometry(wM * 0.48, 0.42, dM * 0.55);
                addWhiteModelMesh(bowlGeo, matWhiteFixture, cx, floorTopY + 0.21, fx.y * scaleP + dM * 0.65, true);
            } else {
                const tGeo = new THREE.BoxGeometry(wM * 0.85, 0.72, dM * 0.85);
                addWhiteModelMesh(tGeo, matWhiteFixture, cx, floorTopY + 0.36, cz, true);
            }
        });
    });

    // 6. Optional White Model Roof
    if (state.showRoof3D) {
        const topFl = state.floors[3].rooms.length > 0 ? 3 : (state.floors[2].rooms.length > 0 ? 2 : 1);
        const fl = state.floors[topFl];
        if (fl && fl.rooms.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            fl.rooms.forEach(r => {
                if (r.type === 'BALCONY' || r.type === 'PORCH') return;
                if (r.x < minX) minX = r.x;
                if (r.y < minY) minY = r.y;
                if (r.x + r.w > maxX) maxX = r.x + r.w;
                if (r.y + r.h > maxY) maxY = r.y + r.h;
            });
            if (minX < Infinity) {
                const roofBaseY = topFl * (wallHeight + slabHeight);
                const rw = (maxX - minX) * scaleP + 0.7;
                const rd = (maxY - minY) * scaleP + 0.7;
                const rcx = ((minX + maxX) / 2) * scaleP;
                const rcz = ((minY + maxY) / 2) * scaleP;

                const roofGeo = new THREE.ConeGeometry(Math.max(rw, rd) * 0.75, 1.6, 4);
                const roofMesh = new THREE.Mesh(roofGeo, matWhiteWall);
                roofMesh.position.set(rcx, roofBaseY + 0.8, rcz);
                roofMesh.rotation.y = Math.PI / 4;
                roofMesh.scale.set(rw / Math.max(rw, rd), 1, rd / Math.max(rw, rd));
                roofMesh.castShadow = true;
                buildingGroup.add(roofMesh);
            }
        }
    }
}

    // グローバル公開インターフェース
    window.init3DEngine = init3DEngine;
    window.rebuild3DScene = rebuild3DScene;
    window.rebuild3DModel = rebuild3DScene;
    window.update3DCameraTransform = update3DCameraTransform;
    window.updateSunLight = updateSunLight;
    window.toggleRoof3D = toggle3DRoof;
    window.setFloorDisplay3D = setFloorDisplay3D;
    window.get3DScene = function() { return scene3d; };
    window.get3DCamera = function() { return camera3d; };
    window.get3DRenderer = function() { return renderer3d; };
    window.get3DBuildingGroup = function() { return buildingGroup; };
})();
