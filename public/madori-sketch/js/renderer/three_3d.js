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

    // Architectural Presentation Baseboard (Stable Diffusion境界認識用の敷地・芝生トーン＆スタジオ切替)
    const groundGeo = new THREE.PlaneGeometry(80, 80);
    // デフォルト: 敷地と建物の境界（外周・基礎）がControlNetで極めて鮮明に認識されるナチュラル芝生グリーン
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x5a7a50 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.08;
    groundMesh.receiveShadow = true;
    scene3d.add(groundMesh);

    const gridHelper = new THREE.GridHelper(36, 36, 0x47633e, 0x6e9162);
    gridHelper.position.set(3, -0.06, 3);
    scene3d.add(gridHelper);

    buildingGroup = new THREE.Group();
    scene3d.add(buildingGroup);

    window.scene3d = scene3d;
    window.camera3d = camera3d;
    window.renderer3d = renderer3d;
    window.buildingGroup = buildingGroup;
    window.groundMesh3d = groundMesh;
    window.gridHelper3d = gridHelper;
    window.currentGroundMode = 'grass'; // 'grass' or 'studio'

    setup3DPointerControls();
    update3DCameraTransform();
}

// 🌿 Stable Diffusion用の地面トーン切替（芝生グリーン境界強調 / スタジオホワイトグレー）
function toggle3DGroundTone() {
    if (!window.groundMesh3d || !window.gridHelper3d) return;
    const isGrass = window.currentGroundMode === 'grass';
    const nextMode = isGrass ? 'studio' : 'grass';
    window.currentGroundMode = nextMode;

    if (nextMode === 'grass') {
        window.groundMesh3d.material.color.setHex(0x5a7a50); // 芝生グリーン
        window.gridHelper3d.material.color.setHex(0x6e9162);
        const lbl = document.getElementById('lbl3DGround');
        if (lbl) {
            lbl.textContent = '🌿 芝生・境界鮮明 (推奨)';
            lbl.className = 'text-emerald-400 font-bold';
        }
        showToast('🌿 地面を「芝生カラー（境界強調・AIパース推奨）」に切り替えました');
    } else {
        window.groundMesh3d.material.color.setHex(0xe2e8f0); // スタジオグレー
        window.gridHelper3d.material.color.setHex(0xcbd5e1);
        const lbl = document.getElementById('lbl3DGround');
        if (lbl) {
            lbl.textContent = '🏛️ スタジオグレー';
            lbl.className = 'text-slate-300 font-bold';
        }
        showToast('🏛️ 地面を「スタジオグレー」に切り替えました');
    }
}
window.toggle3DGroundTone = toggle3DGroundTone;

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
    state.active3DPreset = preset;
    if (preset === 'topdown') {
        // 真上から見た図 (3Dドールハウス・真上90度俯瞰)
        orbit.target.set(3.0, 1.0, 3.0);
        orbit.theta = 0;
        orbit.phi = 0.04;
        orbit.radius = 16.0;
        state.showRoof3D = false; // 屋根を透過して間取りを表示
    } else if (preset === 'bird') {
        // 鳥瞰図 (斜め上空45度アイソメ)
        orbit.target.set(3.0, 2.2, 3.0);
        orbit.theta = Math.PI * 0.22;
        orbit.phi = Math.PI * 0.28;
        orbit.radius = 17.5;
    } else if (preset === 'section') {
        // 断面図 (真横からの建築カットパース)
        orbit.target.set(3.0, 2.6, 3.0);
        orbit.theta = 0;
        orbit.phi = Math.PI * 0.5;
        orbit.radius = 15.0;
    } else if (preset === 'interior') {
        // 内観3D (LDKアイレベル見渡し)
        const focusFloorY = state.floorDisplay3D === '2f' ? 3.8 : (state.floorDisplay3D === '3f' ? 6.4 : 1.4);
        orbit.target.set(2.8, focusFloorY, 2.5);
        orbit.theta = -Math.PI * 0.35;
        orbit.phi = Math.PI * 0.46;
        orbit.radius = 3.2;
    }
    update3DCameraTransform();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    if (typeof highlight3DPresetButton === 'function') highlight3DPresetButton(preset);
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

            // Continuous Walls with Opening Cutouts
            // 階のつなぎ目段差解消: 壁高さを (wallHeight + slabHeight) にし、階間の梁・スラブ側面を外壁で完全に覆う
            if (!rm.isAutoDetected && rt.hasWall) {
                const isBalcony = rm.type === 'BALCONY';
                const hWall = isBalcony ? 1.15 : (wallHeight + slabHeight);
                const wY = baseY + slabHeight;

                buildWallWithOpeningCutouts3D('h', rm.y, rm.x, rm.x + rm.w, wY, hWall, wallThick, flData.openings, scaleP, matWhiteWall);
                buildWallWithOpeningCutouts3D('h', rm.y + rm.h, rm.x, rm.x + rm.w, wY, hWall, wallThick, flData.openings, scaleP, matWhiteWall);
                buildWallWithOpeningCutouts3D('v', rm.x, rm.y, rm.y + rm.h, wY, hWall, wallThick, flData.openings, scaleP, matWhiteWall);
                buildWallWithOpeningCutouts3D('v', rm.x + rm.w, rm.y, rm.y + rm.h, wY, hWall, wallThick, flData.openings, scaleP, matWhiteWall);
            }
        });

        // 2. Custom Wall Segments (With Opening Cutouts for Doors & Windows)
        // 階のつなぎ目の段差を解消: 上端を次階の壁下端と完全に面一に接続
        flData.walls.forEach(wl => {
            const isHoriz = Math.abs(wl.y1 - wl.y2) < 0.05;
            const wY = baseY + slabHeight;
            const totalWallH = wallHeight + slabHeight;

            if (isHoriz) {
                const startX = Math.min(wl.x1, wl.x2);
                const endX = Math.max(wl.x1, wl.x2);
                if (endX - startX > 0.05) {
                    buildWallWithOpeningCutouts3D('h', wl.y1, startX, endX, wY, totalWallH, wallThick, flData.openings, scaleP, matWhiteWall);
                }
            } else {
                const startY = Math.min(wl.y1, wl.y2);
                const endY = Math.max(wl.y1, wl.y2);
                if (endY - startY > 0.05) {
                    buildWallWithOpeningCutouts3D('v', wl.x1, startY, endY, wY, totalWallH, wallThick, flData.openings, scaleP, matWhiteWall);
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
                renderStair3D(fx, floorTopY, wallHeight, slabHeight, scaleP, matWhiteFixture);
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

        // 6. Independent Architectural Stairs (独立階段システム flData.stairs の本格立体描画)
        const floorTopY = baseY + slabHeight;
        const stairsList = (flData.stairs && flData.stairs.length > 0) ? flData.stairs : [];
        stairsList.forEach(st => {
            renderStair3D(st, floorTopY, wallHeight, slabHeight, scaleP, matWhiteFixture);
        });
    });

    // 7. Optional White Model Roof
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

// 🪜 建築3D階段レンダラー（段板ステップ・蹴込み・踊り場・手すり壁・2階床貫通）
function renderStair3D(fx, floorTopY, wallHeight, slabHeight, scaleP, matWhiteFixture) {
    const wM = fx.w * scaleP;
    const dM = fx.h * scaleP;
    const cx = (fx.x + fx.w / 2) * scaleP;
    const cz = (fx.y + fx.h / 2) * scaleP;
    const totalSteps = fx.steps || 14;
    const totalRise = wallHeight + slabHeight;
    const stepH = totalRise / totalSteps;
    const isDown = fx.direction === 'DOWN';
    const shapeType = fx.shapeType || (fx.w === fx.h && fx.w >= 1.8 ? 'U_SHAPE' : (fx.w <= fx.h ? 'STRAIGHT_V' : 'STRAIGHT_H'));

    const stepMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const handrailMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });

    if (shapeType === 'U_SHAPE' || (fx.w >= 1.8 && fx.h >= 1.8)) {
        // コの字型（折り返し階段 / 1坪タイプ）
        const halfSteps = Math.ceil(totalSteps / 2);
        const flightW = (wM - 0.08) / 2; // 中央に80mmの手すり目板・壁スリット
        const stepDepth = dM / (halfSteps - 0.5);

        // 登り始めフライト（左列）
        for (let i = 0; i < halfSteps; i++) {
            const sIdx = isDown ? (totalSteps - 1 - i) : i;
            const curY = floorTopY + (sIdx + 0.5) * stepH;
            const curStepD = (i === halfSteps - 1) ? stepDepth * 1.5 : stepDepth; // 踊り場
            const curZ = fx.y * scaleP + (i + 0.5) * stepDepth;
            const sGeo = new THREE.BoxGeometry(flightW, Math.max(0.04, stepH * 0.95), curStepD);
            addWhiteModelMesh(sGeo, stepMat, fx.x * scaleP + flightW / 2, curY, curZ, true);
        }
        // 折り返しフライト（右列）
        for (let i = 0; i < halfSteps; i++) {
            const sIdx = isDown ? (halfSteps - 1 - i) : (halfSteps + i);
            const curY = floorTopY + (sIdx + 0.5) * stepH;
            const curZ = fx.y * scaleP + (halfSteps - 1 - i + 0.5) * stepDepth;
            const sGeo = new THREE.BoxGeometry(flightW, Math.max(0.04, stepH * 0.95), stepDepth);
            addWhiteModelMesh(sGeo, stepMat, fx.x * scaleP + wM - flightW / 2, curY, curZ, true);
        }
        // 中央の手すり壁（笠木）
        const wallH = 0.85;
        const dividerGeo = new THREE.BoxGeometry(0.08, totalRise * 0.6 + wallH, dM * 0.75);
        addWhiteModelMesh(dividerGeo, handrailMat, cx, floorTopY + (totalRise * 0.6 + wallH) / 2, cz, true);

    } else if (fx.w <= fx.h) {
        // 南北方向の直階段
        const stepDepth = dM / totalSteps;
        for (let i = 0; i < totalSteps; i++) {
            const sIdx = isDown ? (totalSteps - 1 - i) : i;
            const curY = floorTopY + (sIdx + 0.5) * stepH;
            const curZ = fx.y * scaleP + (i + 0.5) * stepDepth;
            const sGeo = new THREE.BoxGeometry(wM * 0.96, Math.max(0.04, stepH * 0.95), stepDepth);
            addWhiteModelMesh(sGeo, stepMat, cx, curY, curZ, true);
        }
        // 手すり（階段沿い）
        const railGeo = new THREE.BoxGeometry(0.05, 0.85, dM);
        addWhiteModelMesh(railGeo, handrailMat, fx.x * scaleP + 0.04, floorTopY + totalRise / 2 + 0.42, cz, true);

    } else {
        // 東西方向の直階段
        const stepWidth = wM / totalSteps;
        for (let i = 0; i < totalSteps; i++) {
            const sIdx = isDown ? (totalSteps - 1 - i) : i;
            const curY = floorTopY + (sIdx + 0.5) * stepH;
            const curX = fx.x * scaleP + (i + 0.5) * stepWidth;
            const sGeo = new THREE.BoxGeometry(stepWidth, Math.max(0.04, stepH * 0.95), dM * 0.96);
            addWhiteModelMesh(sGeo, stepMat, curX, curY, cz, true);
        }
        // 手すり
        const railGeo = new THREE.BoxGeometry(wM, 0.85, 0.05);
        addWhiteModelMesh(railGeo, handrailMat, cx, floorTopY + totalRise / 2 + 0.42, fx.y * scaleP + 0.04, true);
    }
}

// 🏛️ 作成プランの構造化オブジェクト構築（3Dプラン選定ライブラリ追加登録用）
function buildPlanExportObject(perspectiveImgUrl) {
    const fl1 = (state.floors && state.floors[1]) ? state.floors[1] : { rooms: [], fixtures: [], stairs: [] };
    const fl2 = (state.floors && state.floors[2]) ? state.floors[2] : { rooms: [], fixtures: [], stairs: [] };
    const fl3 = (state.floors && state.floors[3]) ? state.floors[3] : { rooms: [], fixtures: [], stairs: [] };

    const pitchM = (state.modulePitch || 910) / 1000;
    const calcArea = (fl) => {
        let sum = 0;
        (fl.rooms || []).forEach(rm => {
            if (typeof isFloorAreaExcludedRoom === 'function' && !isFloorAreaExcludedRoom(rm)) {
                sum += (rm.w * pitchM) * (rm.h * pitchM);
            }
        });
        return sum;
    };

    const a1 = calcArea(fl1);
    const a2 = calcArea(fl2);
    const a3 = calcArea(fl3);
    const totalSqm = +(a1 + a2 + a3).toFixed(2);
    const totalTsubo = +(totalSqm / 3.305785).toFixed(1) || 30.0;

    let maxX = 0, maxY = 0;
    [fl1, fl2, fl3].forEach(fl => {
        (fl.rooms || []).forEach(r => {
            if (r.x + r.w > maxX) maxX = r.x + r.w;
            if (r.y + r.h > maxY) maxY = r.y + r.h;
        });
    });
    const maxWM = +(maxX * pitchM).toFixed(2) || 8.19;
    const maxDM = +(maxY * pitchM).toFixed(2) || 7.28;

    let ldkTatami = 18.0;
    const allRooms = [...fl1.rooms, ...fl2.rooms, ...fl3.rooms];
    const ldkRoom = allRooms.find(r => (r.type === 'LDK' || (r.customName && r.customName.includes('LDK'))));
    if (ldkRoom) {
        ldkTatami = +((ldkRoom.w * ldkRoom.h) / 2).toFixed(1);
    }

    const bedRooms = allRooms.filter(r => r.type === 'YOSHITSU' || r.type === 'WASHITSU' || (r.customName && (r.customName.includes('寝室') || r.customName.includes('洋室')))).length;
    const hasTatami = allRooms.some(r => r.type === 'WASHITSU' || (r.customName && r.customName.includes('和室')));
    const hasVoid = allRooms.some(r => r.type === 'VOID' || (r.customName && r.customName.includes('吹抜')));
    const hasBalcony = allRooms.some(r => r.type === 'BALCONY' || (r.customName && r.customName.includes('バルコニー')));

    const roomDesc = `${Math.max(2, bedRooms + 1)}LDK` + (hasTatami ? ' + 和室' : '') + (hasVoid ? ' + 吹抜' : '');
    const floorCount = fl3.rooms.length > 0 ? 3 : (fl2.rooms.length > 0 ? 2 : 1);

    let clean2DUrl = '';
    const cv2d = document.getElementById('canvas2d');
    if (cv2d) {
        try { clean2DUrl = cv2d.toDataURL('image/png'); } catch (e) {}
    }

    // 同一間取りデータの継続編集・復元時は同一IDを維持して更新、新規作成時は新ID
    if (!state.currentPlanId) {
        state.currentPlanId = 'PLAN-COMM-' + Date.now().toString(36).toUpperCase();
    }
    if (typeof window.updateCurrentPlanBadge === 'function') window.updateCurrentPlanBadge();
    const planId = state.currentPlanId;
    const title = `${totalTsubo}坪 3D共創プラン (${ldkTatami}帖LDK・${floorCount === 1 ? '平屋' : floorCount + '階建'})`;

    const tags = ['共創プラン', '対面型キッチン'];
    if (hasVoid) tags.push('吹抜');
    if (hasTatami) tags.push('和室・畳コーナー');
    if (hasBalcony) tags.push('バルコニー');
    if (floorCount === 1) tags.push('平屋');
    else tags.push(`${floorCount}階建て`);

    return {
        id: planId,
        title: title,
        total_tsubo: totalTsubo,
        total_sqm: totalSqm,
        floor_count: floorCount,
        entrance_direction: '南玄関',
        max_width_m: maxWM,
        max_depth_m: maxDM,
        ldk_tatami: ldkTatami,
        kitchen_type: '対面型',
        rooms: roomDesc,
        tags: tags,
        description: `3D間取りスケッチ工房で作成された最新注文住宅プラン。実寸${totalTsubo}坪・${roomDesc}。`,
        floors: [
            {
                floor: '1F',
                area_sqm: +a1.toFixed(2),
                clean_2d: clean2DUrl,
                gemini_3d: perspectiveImgUrl || clean2DUrl
            },
            ...(floorCount >= 2 ? [{
                floor: '2F',
                area_sqm: +a2.toFixed(2),
                clean_2d: clean2DUrl,
                gemini_3d: perspectiveImgUrl || clean2DUrl
            }] : [])
        ],
        rawHouseData: JSON.parse(JSON.stringify(state.house || { floors: state.floors })),
        isCommunityPlan: true,
        status: 'pending',
        copyright: 'ユーザー本人に帰属（非公開保管・管理者選別待ち）',
        updated_at: new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        created_at: new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    };
}

/**
 * ユーザー作成間取りの安全保管（データ保存時 ＆ 3Dパース生成時）
 * 破綻プランのおすすめ化を防ぐため、即時一般公開はせず【承認待ちプール（pending_plans.json）】にワンクッション保管。
 * 著作権はユーザーに所属し、管理者の選別・監修を経て承認されたプランのみが本登録されます。
 */
function syncPlanToCommunityLibrary(customPersUrl) {
    try {
        const commPlan = buildPlanExportObject(customPersUrl);
        let localPlans = [];
        try {
            const rawL = localStorage.getItem('smile_community_plans');
            if (rawL) localPlans = JSON.parse(rawL);
        } catch(e) {}

        // 本人端末用ローカルキャッシュ（同一ID上書き）
        const existingIdx = localPlans.findIndex(p => p.id === commPlan.id);
        if (existingIdx >= 0) {
            localPlans[existingIdx] = commPlan;
        } else {
            localPlans.unshift(commPlan);
        }
        localStorage.setItem('smile_community_plans', JSON.stringify(localPlans.slice(0, 50)));

        // サーバーAPIへ送信して pending_plans.json（承認待ちプール）へ安全保管
        fetch('/api/publish-community-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: commPlan })
        }).catch(err => console.warn('Community plan publish background sync error:', err));

        return commPlan;
    } catch(pe) {
        console.warn('Community plan build error:', pe);
        return null;
    }
}

/**
 * 🏛️ 管理者専用: 手直し完了後の本登録（3D選定ライブラリへの正式公開）
 */
async function approveAndPublishPlan(customPersUrl) {
    try {
        const plan = buildPlanExportObject(customPersUrl);
        plan.status = 'approved';
        plan.approved_by = '住ま居る設計プロ監修済';

        const res = await fetch('/api/admin/approve-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: plan })
        });
        const data = await res.json();
        if (data.success) {
            if (typeof showToast === 'function') {
                showToast(`🎉【監修・本登録完了】プラン「${plan.id}」が3Dプラン選定ライブラリ（323選＋）へ正式登録・公開されました！`);
            }
            alert(`🎉【3Dプラン選定ライブラリ 本登録完了】\n管理者が手直し・監修したプラン（ID: ${plan.id}）を「3D実例プラン選定」へ正式登録しました！\n破綻のない高品質プランとしてライブラリ（現在${data.totalApproved || '多数'}件）に即時加算されました。`);
            return true;
        } else {
            alert('本登録エラー: ' + (data.error || '不明なエラー'));
            return false;
        }
    } catch(err) {
        console.error('Approve error:', err);
        alert('本登録通信エラー: ' + err.message);
        return false;
    }
}
window.buildPlanExportObject = buildPlanExportObject;
window.syncPlanToCommunityLibrary = syncPlanToCommunityLibrary;
window.approveAndPublishPlan = approveAndPublishPlan;

// 🎨 4大視点対応（内観3D / 断面図 / 鳥瞰図 / 真上ドールハウス=Gemini API）1操作生成
function export3DToPersStudio(specifiedPreset) {
    if (!renderer3d || !scene3d || !camera3d) {
        if (typeof showToast === 'function') showToast('3Dエンジンが初期化されていません', true);
        return;
    }

    // 視点プリセットの自動判別（引数指定 > 現在の選択 > カメラ角度からの推定）
    const preset = specifiedPreset || state.active3DPreset || (orbit.phi < 0.15 ? 'topdown' : (orbit.phi > 1.45 ? 'section' : (orbit.radius < 5.0 ? 'interior' : 'bird')));

    // 1. 通常レンダリング（RGBホワイトパース）キャプチャ
    renderer3d.render(scene3d, camera3d);
    const rgbDataUrl = renderer3d.domElement.toDataURL('image/png');

    // 2. 視点に応じたエンジン・プロンプト・生成モード決定
    let targetMode = 'photoreal';
    let engine = 'sdxl_controlnet';
    let sdPrompt = '';
    let sdNegative = 'blurry, low quality, distorted, crooked walls, deformed architecture, text, watermark, bad anatomy';

    if (preset === 'topdown') {
        // 🛸 真上から見た図 ➔ Gemini API (3Dドールハウス立体パース)
        targetMode = 'dollhouse';
        engine = 'gemini';
        sdPrompt = '3D cutaway dollhouse isometric floorplan rendering, fully furnished top-down perspective, high detail, clean modern japanese residence, warm yoshino cedar wood flooring, diatomaceous earth plaster walls, soft natural ambient daylight, realistic architectural rendering';
    } else if (preset === 'section') {
        // 📐 断面図 ➔ SDXL + ControlNet Depth
        targetMode = 'photoreal';
        engine = 'sdxl_controlnet';
        sdPrompt = 'masterpiece, 8k, architectural cross-section cutaway rendering, realistic modern japanese wooden house multi-story sectional view, interior spaces visible, warm interior lighting, soft natural illumination, clean wooden structure';
    } else if (preset === 'bird') {
        // 🦅 鳥瞰図 ➔ SDXL + ControlNet Depth
        targetMode = 'photoreal';
        engine = 'sdxl_controlnet';
        sdPrompt = 'masterpiece, 8k, architectural photograph, bird-eye perspective view, modern japanese custom wooden house exterior and garden, sunny blue sky, clean geometric roofline, natural cedar wood accent, ultra realistic';
    } else {
        // 📸 内観3D（LDK見渡し等） ➔ SDXL + ControlNet Depth
        targetMode = 'photoreal';
        engine = 'sdxl_controlnet';
        sdPrompt = 'masterpiece, 8k, architectural photograph, spacious living dining room interior, open plan, high ceiling, warm yoshino cedar flooring, diatomaceous earth plaster walls, large panoramic windows, soft natural sunlight, minimal modern luxury japanese house, ultra realistic interior design';
    }

    const fl1 = state.floors[1] || { rooms: [] };
    const fl2 = state.floors[2] || { rooms: [] };
    const allRooms = [...fl1.rooms, ...fl2.rooms];

    const persTransferData = {
        source: 'madori3d',
        timestamp: Date.now(),
        imageBefore: rgbDataUrl,
        controlNetMode: 'depth',
        cameraPreset: preset,
        targetMode: targetMode,
        engine: engine,
        prompt: sdPrompt,
        negativePrompt: sdNegative,
        autoRun: true, // 1操作で即時生成
        roomCount: allRooms.length,
        floorCount: state.floors[2].rooms.length > 0 ? 2 : 1
    };

    try {
        localStorage.setItem('smile_pers_transfer_3d', JSON.stringify(persTransferData));
    } catch (e) {
        console.warn('LocalStorage save failed, passing via session:', e);
    }

    // 案A: 作成されたプランを【住ま居る 3Dプラン選定ライブラリ】へ自動登録・更新（永続化）
    const syncedCommPlan = syncPlanToCommunityLibrary(rgbDataUrl);
    const planIdDisplay = syncedCommPlan ? syncedCommPlan.id : (state.currentPlanId || '');

    const engineName = engine === 'gemini' ? '✨ Gemini API' : '⚡ ControlNet Depth';
    const presetName = preset === 'topdown' ? '真上から見た図 (3Dドールハウス)' : (preset === 'section' ? '断面図' : (preset === 'bird' ? '鳥瞰図' : '内観3D'));
    if (typeof showToast === 'function') {
        showToast(`🚀 ${presetName}を${engineName}で生成中…【3D選定ライブラリ: ${planIdDisplay} 自動同期】`);
    }

    // パース工房（SmileStudio）へシームレス遷移（auto=1で即時生成開始）
    setTimeout(() => {
        window.location.href = `/smilestudio.html?source=madori3d&auto=1&v=${Date.now()}`;
    }, 350);
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
window.export3DToPersStudio = export3DToPersStudio;
})();
