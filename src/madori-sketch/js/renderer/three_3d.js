/**
 * 住ま居る 3D間取り工房
 * 3D建築モデルレンダラー (Three.js 3D Architectural Engine)
 * 壁4種（通常壁・たれ壁・腰壁・上り框）・開口部くり抜き・空間6種・階段（ボックス/オープン/手すり）・3D直方体・鳥瞰図ミニプレビュー連動
 */
(function() {
    'use strict';

const canvas3d = document.getElementById('canvas3d');
let scene3d, camera3d, renderer3d, buildingGroup, cadFbxGroup, sunLight, ambientLight, hemiLight;
let cadRoofMeshes = [];
let cadRoofVisible = true;

const orbit = {
    theta: Math.PI * 0.22,
    phi: Math.PI * 0.30,
    radius: 17.5,
    target: new THREE.Vector3(3.0, 2.0, 4.0),
    isDown: false,
    mode: 'orbit',
    lastX: 0,
    lastY: 0,
    pinchDist: 0
};

function init3DEngine() {
    if (!canvas3d) return;
    scene3d = new THREE.Scene();

    camera3d = new THREE.PerspectiveCamera(42, 1, 0.1, 220);
    renderer3d = new THREE.WebGLRenderer({
        canvas: canvas3d,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true
    });
    renderer3d.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer3d.shadowMap.enabled = true;
    renderer3d.shadowMap.type = THREE.PCFSoftShadowMap;

    ambientLight = new THREE.AmbientLight(0xffffff, 0.62);
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

    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.08;
    groundMesh.receiveShadow = true;
    scene3d.add(groundMesh);

    const gridHelper = new THREE.GridHelper(36, 36, 0x94a3b8, 0xcbd5e1);
    gridHelper.position.set(3, -0.06, 4);
    scene3d.add(gridHelper);

    buildingGroup = new THREE.Group();
    scene3d.add(buildingGroup);

    window.scene3d = scene3d;
    window.camera3d = camera3d;
    window.renderer3d = renderer3d;
    window.buildingGroup = buildingGroup;
    window.groundMesh3d = groundMesh;
    window.gridHelper3d = gridHelper;
    window.currentGroundMode = 'studio';

    setup3DPointerControls();
    update3DCameraTransform();
}

function toggle3DGroundTone() {
    if (!window.groundMesh3d || !window.gridHelper3d) return;
    const isGrass = window.currentGroundMode === 'grass';
    const nextMode = isGrass ? 'studio' : 'grass';
    window.currentGroundMode = nextMode;

    if (nextMode === 'grass') {
        window.groundMesh3d.material.color.setHex(0x5a7a50);
        window.gridHelper3d.material.color.setHex(0x6e9162);
        const lbl = document.getElementById('lbl3DGround');
        if (lbl) {
            lbl.textContent = '🌿 芝生・境界鮮明';
            lbl.className = 'text-emerald-400 font-bold';
        }
        showToast('🌿 地面を「芝生カラー」に切り替えました');
    } else {
        window.groundMesh3d.material.color.setHex(0xf1f5f9);
        window.gridHelper3d.material.color.setHex(0xcbd5e1);
        const lbl = document.getElementById('lbl3DGround');
        if (lbl) {
            lbl.textContent = '🏛️ スタジオ方眼';
            lbl.className = 'text-slate-300 font-bold';
        }
        showToast('🏛️ 地面を「スタジオ方眼」に切り替えました');
    }
    syncBirdEyePreview();
}
window.toggle3DGroundTone = toggle3DGroundTone;

function syncBirdEyePreview() {
    if (renderer3d && scene3d && camera3d) {
        try {
            renderer3d.render(scene3d, camera3d);
            if (typeof window.updateBirdEyeMiniPreview === 'function') {
                window.updateBirdEyeMiniPreview();
            }
        } catch (_) {}
    }
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
    syncBirdEyePreview();
}

function setup3DPointerControls() {
    const activePointers = new Map();

    canvas3d.addEventListener('pointerdown', (e) => {
        try { canvas3d.setPointerCapture(e.pointerId); } catch (_) {}
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
        orbit.target.set(3.0, 1.0, 4.0);
        orbit.theta = 0;
        orbit.phi = 0.04;
        orbit.radius = 16.0;
        state.showRoof3D = false;
    } else if (preset === 'bird') {
        orbit.target.set(3.0, 1.8, 4.0);
        orbit.theta = Math.PI * 0.22;
        orbit.phi = Math.PI * 0.28;
        orbit.radius = 16.5;
    } else if (preset === 'section') {
        orbit.target.set(3.0, 2.2, 4.0);
        orbit.theta = 0;
        orbit.phi = Math.PI * 0.48;
        orbit.radius = 15.0;
    } else if (preset === 'interior') {
        const focusFloorY = state.floorDisplay3D === '2f' ? 3.8 : (state.floorDisplay3D === '3f' ? 6.4 : 1.4);
        orbit.target.set(2.8, focusFloorY, 3.5);
        orbit.theta = -Math.PI * 0.35;
        orbit.phi = Math.PI * 0.46;
        orbit.radius = 3.2;
    }
    update3DCameraTransform();
    rebuild3DScene();
    if (typeof highlight3DPresetButton === 'function') highlight3DPresetButton(preset);
}
window.set3DCameraPreset = set3DCameraPreset;

function set3DFloorDisplay(mode) {
    state.floorDisplay3D = mode;
    ['all', '0f', '1f', '2f', '3f', '4f'].forEach(m => {
        const btn = document.getElementById('btn3DMode_' + m);
        if (btn) {
            btn.className = (m === mode)
                ? 'px-2 py-1 rounded text-[11px] font-bold bg-amber-500 text-slate-950 shadow transition'
                : 'px-2 py-1 rounded text-[11px] font-bold text-slate-300 hover:text-white transition';
        }
    });
    rebuild3DScene();
}
window.set3DFloorDisplay = set3DFloorDisplay;
window.setFloorDisplay3D = set3DFloorDisplay;

function toggle3DRoof() {
    state.showRoof3D = !state.showRoof3D;
    const lbl = document.getElementById('lbl3DRoof');
    if (lbl) {
        lbl.textContent = state.showRoof3D ? 'ON (屋根表示)' : 'OFF (内部確認)';
        lbl.className = state.showRoof3D ? 'text-sky-400' : 'text-slate-400';
    }
    rebuild3DScene();
}
window.toggle3DRoof = toggle3DRoof;

function updateSunLight(val) {
    state.sunHour = parseFloat(val);
    const hrs = Math.floor(state.sunHour);
    const mins = (state.sunHour % 1) === 0.5 ? '30' : '00';
    const lbl = document.getElementById('sunTimeLabel');
    if (lbl) lbl.textContent = `${hrs}:${mins}`;

    const norm = (state.sunHour - 7) / 11;
    const angle = norm * Math.PI * 0.85 + 0.15;
    const r = 26;
    if (sunLight) {
        sunLight.position.set(Math.cos(angle) * r, Math.max(5, Math.sin(angle) * r), 15);
    }
    syncBirdEyePreview();
}

function addWhiteModelMesh(geo, mat, x, y, z, addEdges = true) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (addEdges) {
        const edges = new THREE.EdgesGeometry(geo);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.55 });
        const wire = new THREE.LineSegments(edges, lineMat);
        mesh.add(wire);
    }
    buildingGroup.add(mesh);
    return mesh;
}

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

        if (opStart > cursorP) {
            addSolidSegment(cursorP, opStart, baseY, wallHeight);
        }

        const sillM = (op.sillMm || 0) / 1000;
        const hM = (op.heightMm || 2000) / 1000;
        if (sillM > 0.02 && wallHeight > sillM) {
            addSolidSegment(opStart, opEnd, baseY, Math.min(sillM, wallHeight));
        }

        const topStart = sillM + hM;
        if (wallHeight > topStart + 0.02) {
            addSolidSegment(opStart, opEnd, baseY + topStart, wallHeight - topStart);
        }

        cursorP = opEnd;
    });

    if (cursorP < endP) {
        addSolidSegment(cursorP, endP, baseY, wallHeight);
    }
}

function rebuild3DScene() {
    if (!buildingGroup) return;
    if (typeof ensureFloorsStructure === 'function') ensureFloorsStructure();

    while (buildingGroup.children.length > 0) {
        buildingGroup.remove(buildingGroup.children[0]);
    }

    const scaleP = (state.modulePitch || 910) / 1000;
    const wallHeight = 2.45;
    const slabHeight = 0.18;
    const wallThick = 0.14;

    // お手本画像の鳥瞰図に近い温かみのある木目フローリング＆白壁マテリアル
    const matWhiteWall = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const matWoodFloor = new THREE.MeshLambertMaterial({ color: 0xb88655 });
    const matDomaSlab = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const matTatamiSlab = new THREE.MeshLambertMaterial({ color: 0xa3b18a });
    const matKoagariSlab = new THREE.MeshLambertMaterial({ color: 0xc89d6c });
    const matWhiteFixture = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const matGlass = new THREE.MeshLambertMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.45 });
    const matDoorPanel = new THREE.MeshLambertMaterial({ color: 0x9a6b3e });
    const matGenkan = new THREE.MeshLambertMaterial({ color: 0x3f2e21 });

    const floorsToBuild = [];
    if (state.floorDisplay3D === 'all') {
        // 現在選択中の階、またはデータがある階を描画（デフォルトは現在階をドールハウス表示しやすくする）
        [0, 1, 2, 3, 4].forEach(f => {
            const fd = state.floors[f];
            if (fd && (fd.rooms.length > 0 || fd.walls.length > 0)) {
                floorsToBuild.push(f);
            }
        });
        if (floorsToBuild.length === 0) floorsToBuild.push(1);
    } else {
        const fNum = parseInt(String(state.floorDisplay3D).replace('f', ''), 10);
        floorsToBuild.push(isNaN(fNum) ? (state.currentFloor || 1) : fNum);
    }

    floorsToBuild.forEach(flNum => {
        const flData = state.floors[flNum];
        if (!flData) return;
        const baseY = (flNum === 0 ? -1 : (flNum - 1)) * (wallHeight + slabHeight);

        // 1. 空間要素・床スラブ（通常居室、玄関土間、小上り、畳、吹き抜け、中庭、天井）
        flData.rooms.forEach(rm => {
            if (rm.type === 'VOID' || rm.type === 'NAKANIWA') return; // 吹き抜け・中庭は床スラブなし

            const wM = rm.w * scaleP;
            const hM = rm.h * scaleP;
            const cx = (rm.x + rm.w / 2) * scaleP;
            const cz = (rm.y + rm.h / 2) * scaleP;

            if (rm.type === 'TENJO') {
                const ceilGeo = new THREE.BoxGeometry(wM, 0.08, hM);
                addWhiteModelMesh(ceilGeo, matWhiteWall, cx, baseY + wallHeight, cz, true);
                return;
            }

            let sMat = matWoodFloor;
            let sHeight = slabHeight;
            let sCenterY = baseY + slabHeight / 2;

            if (rm.type === 'DOMA' || rm.type === 'PORCH') {
                sMat = matDomaSlab;
                sHeight = Math.max(0.06, slabHeight - 0.10);
                sCenterY = baseY + sHeight / 2;
            } else if (rm.type === 'KOAGARI') {
                sMat = matKoagariSlab;
                sHeight = slabHeight + 0.30; // +30cm 小上り段差
                sCenterY = baseY + sHeight / 2;
            } else if (rm.type === 'TATAMI' || rm.type === 'WASHITSU') {
                sMat = matTatamiSlab;
            }

            const slabGeo = new THREE.BoxGeometry(wM, sHeight, hM);
            addWhiteModelMesh(slabGeo, sMat, cx, sCenterY, cz, true);

            const rt = (window.ROOM_TYPES && window.ROOM_TYPES[rm.type]) || { hasWall: true };
            if (!rm.isAutoDetected && rt.hasWall && flData.walls.length === 0) {
                const isBalcony = rm.type === 'BALCONY';
                const hWall = isBalcony ? 1.10 : (wallHeight + slabHeight);
                const wY = baseY + slabHeight;
                buildWallWithOpeningCutouts3D('h', rm.y, rm.x, rm.x + rm.w, wY, hWall, wallThick, flData.openings, scaleP, matWhiteWall);
                buildWallWithOpeningCutouts3D('h', rm.y + rm.h, rm.x, rm.x + rm.w, wY, hWall, wallThick, flData.openings, scaleP, matWhiteWall);
                buildWallWithOpeningCutouts3D('v', rm.x, rm.y, rm.y + rm.h, wY, hWall, wallThick, flData.openings, scaleP, matWhiteWall);
                buildWallWithOpeningCutouts3D('v', rm.x + rm.w, rm.y, rm.y + rm.h, wY, hWall, wallThick, flData.openings, scaleP, matWhiteWall);
            }
        });

        // 2. 壁4種（通常壁 / たれ壁 / 腰壁 / 上り框）
        flData.walls.forEach(wl => {
            const isHoriz = Math.abs(wl.y1 - wl.y2) < 0.05;
            const wType = wl.wallType || 'wall';
            const floorTopY = baseY + slabHeight;

            const startP = isHoriz ? Math.min(wl.x1, wl.x2) : Math.min(wl.y1, wl.y2);
            const endP = isHoriz ? Math.max(wl.x1, wl.x2) : Math.max(wl.y1, wl.y2);
            const fixedP = isHoriz ? wl.y1 : wl.x1;
            const lenP = endP - startP;
            if (lenP <= 0.04) return;

            if (wType === 'tarekabe') {
                // たれ壁: 天井から550mm下がる上部壁
                const dropH = 0.55;
                const lenM = lenP * scaleP;
                const midM = ((startP + endP) / 2) * scaleP;
                const fixedM = fixedP * scaleP;
                const geo = isHoriz
                    ? new THREE.BoxGeometry(lenM + wallThick, dropH, wallThick)
                    : new THREE.BoxGeometry(wallThick, dropH, lenM + wallThick);
                addWhiteModelMesh(
                    geo, matWhiteWall,
                    isHoriz ? midM : fixedM,
                    floorTopY + wallHeight - dropH / 2,
                    isHoriz ? fixedM : midM,
                    true
                );
            } else if (wType === 'koshikabe') {
                // 腰壁: 床から1,000mmの手すり壁
                const waistH = 1.00;
                const lenM = lenP * scaleP;
                const midM = ((startP + endP) / 2) * scaleP;
                const fixedM = fixedP * scaleP;
                const geo = isHoriz
                    ? new THREE.BoxGeometry(lenM + wallThick, waistH, wallThick)
                    : new THREE.BoxGeometry(wallThick, waistH, lenM + wallThick);
                addWhiteModelMesh(
                    geo, matWhiteWall,
                    isHoriz ? midM : fixedM,
                    floorTopY + waistH / 2,
                    isHoriz ? fixedM : midM,
                    true
                );
            } else if (wType === 'agarikamachi') {
                // 上り框: 玄関段差見切り材
                const kamachiH = 0.18;
                const lenM = lenP * scaleP;
                const midM = ((startP + endP) / 2) * scaleP;
                const fixedM = fixedP * scaleP;
                const geo = isHoriz
                    ? new THREE.BoxGeometry(lenM, kamachiH, 0.12)
                    : new THREE.BoxGeometry(0.12, kamachiH, lenM);
                addWhiteModelMesh(
                    geo, matDoorPanel,
                    isHoriz ? midM : fixedM,
                    baseY + kamachiH / 2 + 0.03,
                    isHoriz ? fixedM : midM,
                    true
                );
            } else {
                // 通常壁（開口部くり抜き付き）
                buildWallWithOpeningCutouts3D(
                    isHoriz ? 'h' : 'v',
                    fixedP, startP, endP,
                    floorTopY, wallHeight, wallThick,
                    flData.openings, scaleP, matWhiteWall
                );
            }
        });

        // 3. 独立柱（角柱・円柱）および多角形柱
        flData.pillars.forEach(pl => {
            const colSize = (pl.sizeMm || 150) / 1000;
            const colGeo = pl.shape === 'round'
                ? new THREE.CylinderGeometry(colSize / 2, colSize / 2, wallHeight, 16)
                : new THREE.BoxGeometry(colSize, wallHeight, colSize);
            addWhiteModelMesh(colGeo, matWhiteWall, pl.x * scaleP, baseY + slabHeight + wallHeight / 2, pl.y * scaleP, true);
        });

        (flData.polyPillars || []).forEach(pp => {
            if (!pp.points || pp.points.length < 3) return;
            const shape = new THREE.Shape();
            shape.moveTo(pp.points[0].x * scaleP, pp.points[0].y * scaleP);
            for (let i = 1; i < pp.points.length; i++) {
                shape.lineTo(pp.points[i].x * scaleP, pp.points[i].y * scaleP);
            }
            shape.closePath();
            const pGeo = new THREE.ExtrudeGeometry(shape, { depth: wallHeight, bevelEnabled: false });
            pGeo.rotateX(Math.PI / 2);
            pGeo.translate(0, baseY + slabHeight + wallHeight, 0);
            const pMesh = new THREE.Mesh(pGeo, matWhiteWall);
            buildingGroup.add(pMesh);
        });

        // 4. サッシ・建具12種の3Dフレーム
        flData.openings.forEach(op => {
            const ot = (window.OPENING_TYPES && window.OPENING_TYPES[op.type]) ? window.OPENING_TYPES[op.type] : { widthP: 1.0, heightMm: 2000, isWin: false };
            const wM = (op.widthP || ot.widthP) * scaleP;
            const hM = (op.heightMm || ot.heightMm) / 1000;
            const sillM = (op.sillMm !== undefined ? op.sillMm : 0) / 1000;
            const isWin = op.isWin !== undefined ? op.isWin : (op.category === 'window' || ot.isWin);
            const isGenkan = op.doorFit === 'oyako' || op.doorFit === 'genkan_slide' || op.type === 'ENTRANCE_DOOR';
            const doorMat = isGenkan ? matGenkan : matDoorPanel;

            const frameThick = (op.doorFit === 'demado') ? wallThick + 0.32 : wallThick + 0.02;
            const boxW = op.orient === 'h' ? wM : frameThick;
            const boxD = op.orient === 'h' ? frameThick : wM;

            const opGeo = new THREE.BoxGeometry(boxW * 0.96, hM * 0.96, boxD * 0.96);
            addWhiteModelMesh(
                opGeo,
                isWin ? matGlass : doorMat,
                op.x * scaleP,
                baseY + slabHeight + sillM + hM / 2,
                op.y * scaleP,
                true
            );
        });

        // 5. 設備・家具 & 3D直方体
        const floorTopY = baseY + slabHeight;
        flData.fixtures.forEach(fx => {
            const wM = fx.w * scaleP;
            const dM = fx.h * scaleP;
            const cx = (fx.x + fx.w / 2) * scaleP;
            const cz = (fx.y + fx.h / 2) * scaleP;
            const kH = (fx.kHeight || fx.hMm || 850) / 1000;
            const tGeo = new THREE.BoxGeometry(wM * 0.94, kH, dM * 0.94);
            addWhiteModelMesh(tGeo, matWhiteFixture, cx, floorTopY + kH / 2, cz, true);
        });

        (flData.boxes3d || []).forEach(bx => {
            const wM = (bx.w || 1) * scaleP;
            const dM = (bx.h || 1) * scaleP;
            const hM = (bx.hMm || 600) / 1000;
            const lvlM = (bx.levelMm || 0) / 1000;
            const cx = (bx.x + (bx.w || 1) / 2) * scaleP;
            const cz = (bx.y + (bx.h || 1) / 2) * scaleP;
            const bMat = new THREE.MeshLambertMaterial({ color: bx.color || 0xcbd5e1 });
            const bGeo = new THREE.BoxGeometry(wM, hM, dM);
            addWhiteModelMesh(bGeo, bMat, cx, floorTopY + lvlM + hM / 2, cz, true);
        });

        // 6. 階段（ボックス階段 / オープン階段 / 手すり設定対応）
        (flData.stairs || []).forEach(st => {
            renderStair3D(st, floorTopY, wallHeight, slabHeight, scaleP);
        });
    });

    syncBirdEyePreview();
}

function renderStair3D(fx, floorTopY, wallHeight, slabHeight, scaleP) {
    const wM = fx.w * scaleP;
    const dM = fx.h * scaleP;
    const cx = (fx.x + fx.w / 2) * scaleP;
    const cz = (fx.y + fx.h / 2) * scaleP;
    const totalSteps = fx.steps || 14;
    const totalRise = wallHeight + slabHeight;
    const stepH = totalRise / totalSteps;
    const isDown = fx.direction === 'DOWN';
    const isOpenStair = (fx.stairStyle || state.stairStyle) === 'open';
    const handrail = fx.stairHandrail || state.stairHandrail || 'both';

    const stepMat = new THREE.MeshLambertMaterial({ color: isOpenStair ? 0x9a6b3e : 0xd4a373 });
    const stringerMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const handrailMat = new THREE.MeshLambertMaterial({ color: 0xcbd5e1 });

    // ボックス階段は踏み板の下までソリッド、オープン階段は厚さ4.5cmのスケルトン踏板
    const treadThick = isOpenStair ? 0.045 : Math.max(0.05, stepH * 0.95);

    if (fx.w <= fx.h) {
        const stepDepth = dM / totalSteps;
        for (let i = 0; i < totalSteps; i++) {
            const sIdx = isDown ? (totalSteps - 1 - i) : i;
            const curY = floorTopY + (sIdx + 0.5) * stepH;
            const curZ = fx.y * scaleP + (i + 0.5) * stepDepth;
            const sGeo = new THREE.BoxGeometry(wM * 0.96, treadThick, stepDepth * 0.95);
            addWhiteModelMesh(sGeo, stepMat, cx, curY, curZ, true);
        }
        if (isOpenStair) {
            const strGeo = new THREE.BoxGeometry(0.06, 0.14, dM);
            addWhiteModelMesh(strGeo, stringerMat, cx, floorTopY + totalRise * 0.48, cz, false);
        }
        if (handrail === 'left' || handrail === 'both') {
            const rGeo = new THREE.BoxGeometry(0.04, 0.85, dM);
            addWhiteModelMesh(rGeo, handrailMat, fx.x * scaleP + 0.03, floorTopY + totalRise * 0.5 + 0.42, cz, true);
        }
        if (handrail === 'right' || handrail === 'both') {
            const rGeo = new THREE.BoxGeometry(0.04, 0.85, dM);
            addWhiteModelMesh(rGeo, handrailMat, (fx.x + fx.w) * scaleP - 0.03, floorTopY + totalRise * 0.5 + 0.42, cz, true);
        }
    } else {
        const stepWidth = wM / totalSteps;
        for (let i = 0; i < totalSteps; i++) {
            const sIdx = isDown ? (totalSteps - 1 - i) : i;
            const curY = floorTopY + (sIdx + 0.5) * stepH;
            const curX = fx.x * scaleP + (i + 0.5) * stepWidth;
            const sGeo = new THREE.BoxGeometry(stepWidth * 0.95, treadThick, dM * 0.96);
            addWhiteModelMesh(sGeo, stepMat, curX, curY, cz, true);
        }
        if (handrail === 'left' || handrail === 'both') {
            const rGeo = new THREE.BoxGeometry(wM, 0.85, 0.04);
            addWhiteModelMesh(rGeo, handrailMat, cx, floorTopY + totalRise * 0.5 + 0.42, fx.y * scaleP + 0.03, true);
        }
        if (handrail === 'right' || handrail === 'both') {
            const rGeo = new THREE.BoxGeometry(wM, 0.85, 0.04);
            addWhiteModelMesh(rGeo, handrailMat, cx, floorTopY + totalRise * 0.5 + 0.42, (fx.y + fx.h) * scaleP - 0.03, true);
        }
    }
}

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

    let clean2DUrl = '';
    const cv2d = document.getElementById('canvas2d');
    if (cv2d) {
        try { clean2DUrl = cv2d.toDataURL('image/png'); } catch (e) {}
    }

    if (!state.currentPlanId) {
        state.currentPlanId = 'PLAN-COMM-' + Date.now().toString(36).toUpperCase();
    }
    if (typeof window.updateCurrentPlanBadge === 'function') window.updateCurrentPlanBadge();
    const planId = state.currentPlanId;
    const floorCount = fl3.rooms.length > 0 ? 3 : (fl2.rooms.length > 0 ? 2 : 1);
    const title = state.planTitle || `${totalTsubo}坪 3D共創プラン (${floorCount === 1 ? '平屋' : floorCount + '階建'})`;

    return {
        id: planId,
        title: title,
        total_tsubo: totalTsubo,
        total_sqm: totalSqm,
        floor_count: floorCount,
        entrance_direction: '南玄関',
        max_width_m: 8.19,
        max_depth_m: 9.10,
        ldk_tatami: 18.0,
        kitchen_type: '対面型',
        rooms: '3LDK',
        tags: ['共創プラン', '対面型キッチン'],
        description: `3D間取り工房で作成された注文住宅プラン（${totalTsubo}坪）。`,
        floors: [
            { floor: '1F', area_sqm: +a1.toFixed(2), clean_2d: clean2DUrl, gemini_3d: perspectiveImgUrl || clean2DUrl },
            ...(floorCount >= 2 ? [{ floor: '2F', area_sqm: +a2.toFixed(2), clean_2d: clean2DUrl, gemini_3d: perspectiveImgUrl || clean2DUrl }] : [])
        ],
        rawHouseData: JSON.parse(JSON.stringify({ floors: state.floors })),
        isCommunityPlan: true,
        status: 'pending',
        copyright: 'ユーザー本人に帰属',
        updated_at: new Date().toLocaleDateString('ja-JP'),
        created_at: new Date().toLocaleDateString('ja-JP')
    };
}

function syncPlanToCommunityLibrary(customPersUrl) {
    try {
        const commPlan = buildPlanExportObject(customPersUrl);
        let localPlans = [];
        try {
            const rawL = localStorage.getItem('smile_community_plans');
            if (rawL) localPlans = JSON.parse(rawL);
        } catch(e) {}
        const existingIdx = localPlans.findIndex(p => p.id === commPlan.id);
        if (existingIdx >= 0) localPlans[existingIdx] = commPlan;
        else localPlans.unshift(commPlan);
        localStorage.setItem('smile_community_plans', JSON.stringify(localPlans.slice(0, 50)));

        fetch('/api/publish-community-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: commPlan })
        }).catch(() => {});
        return commPlan;
    } catch(pe) {
        return null;
    }
}

async function approveAndPublishPlan(customPersUrl) {
    try {
        const plan = buildPlanExportObject(customPersUrl);
        plan.status = 'approved';
        plan.approved_by = '家づくりサポート係監修済';
        const res = await fetch('/api/admin/approve-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: plan })
        });
        const data = await res.json();
        if (data.success) {
            if (typeof showToast === 'function') showToast(`🎉 プラン「${plan.id}」を本登録しました`);
            return true;
        }
        return false;
    } catch(err) {
        return false;
    }
}

function export3DToPersStudio(specifiedPreset) {
    if (!renderer3d || !scene3d || !camera3d) {
        if (typeof showToast === 'function') showToast('3Dエンジンが初期化されていません', true);
        return;
    }
    const preset = specifiedPreset || state.active3DPreset || 'bird';
    renderer3d.render(scene3d, camera3d);
    const rgbDataUrl = renderer3d.domElement.toDataURL('image/png');

    const persTransferData = {
        source: 'madori3d',
        timestamp: Date.now(),
        imageBefore: rgbDataUrl,
        controlNetMode: 'depth',
        cameraPreset: preset,
        targetMode: preset === 'topdown' ? 'dollhouse' : 'photoreal',
        engine: preset === 'topdown' ? 'gemini' : 'sdxl_controlnet',
        prompt: 'realistic modern japanese wooden house architectural rendering, warm natural cedar wood flooring, white plaster walls, natural daylight',
        negativePrompt: 'blurry, low quality, distorted',
        autoRun: true
    };

    try {
        localStorage.setItem('smile_pers_transfer_3d', JSON.stringify(persTransferData));
    } catch (e) {}

    syncPlanToCommunityLibrary(rgbDataUrl);
    setTimeout(() => {
        window.location.href = `/smilestudio.html?source=madori3d&auto=1&v=${Date.now()}`;
    }, 300);
}

window.init3DEngine = init3DEngine;
window.rebuild3DScene = rebuild3DScene;
window.rebuild3DModel = rebuild3DScene;
window.update3DCameraTransform = update3DCameraTransform;
window.updateSunLight = updateSunLight;
window.toggleRoof3D = toggle3DRoof;
window.get3DScene = function() { return scene3d; };
window.get3DCamera = function() { return camera3d; };
window.get3DRenderer = function() { return renderer3d; };
window.get3DBuildingGroup = function() { return buildingGroup; };
window.buildPlanExportObject = buildPlanExportObject;
window.syncPlanToCommunityLibrary = syncPlanToCommunityLibrary;
window.approveAndPublishPlan = approveAndPublishPlan;
window.export3DToPersStudio = export3DToPersStudio;

// ============================================================================
// アーキトレンド等 外部CAD 3Dモデル (.fbx) 読み込み ＆ 屋根ON/OFF制御
// （2D間取り・面積集計 state.floors とは完全分離して描画）
// ============================================================================
function ensureCadFbxGroup() {
    if (!scene3d) return null;
    if (!cadFbxGroup) {
        cadFbxGroup = new THREE.Group();
        cadFbxGroup.name = 'cadFbxGroup';
        scene3d.add(cadFbxGroup);
    }
    return cadFbxGroup;
}

function isCadRoofObject(obj) {
    const roofRegex = /roof|屋根|軒|破風|瓦|コロニアル|棟|ガルバ|スレート|切妻|寄棟|片流れ|yane|noki|koya/i;
    let cur = obj;
    while (cur) {
        if (cur.name && roofRegex.test(cur.name)) return true;
        cur = cur.parent;
    }
    if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
            if (m && m.name && roofRegex.test(m.name)) return true;
        }
    }
    return false;
}

function updateCadRoofToggleUI() {
    const wrap = document.getElementById('cadFbxControls');
    const btn = document.getElementById('btnCadRoofToggle');
    if (wrap) {
        if (cadFbxGroup && cadFbxGroup.children.length > 0) wrap.classList.remove('hidden');
        else wrap.classList.add('hidden');
    }
    if (btn) {
        btn.textContent = cadRoofVisible ? '🏠 屋根: ON' : '🏠 屋根: OFF';
        btn.className = cadRoofVisible
            ? 'px-1.5 py-1 rounded bg-sky-600/80 hover:bg-sky-500 text-[10px] font-bold text-white transition'
            : 'px-1.5 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-[10px] font-bold text-slate-300 transition';
    }
}

function loadArchitrendFBXFromBuffer(arrayBuffer, fileName) {
    if (typeof THREE === 'undefined' || typeof THREE.FBXLoader !== 'function') {
        if (typeof showToast === 'function') showToast('FBXローダーが初期化されていません', true);
        return false;
    }
    if (!scene3d && typeof init3DEngine === 'function') {
        init3DEngine();
    }
    const grp = ensureCadFbxGroup();
    if (!grp) return false;

    const loader = new THREE.FBXLoader();
    const fbxObj = loader.parse(arrayBuffer, '');

    // 既存CADモデルをクリア
    while (grp.children.length > 0) grp.remove(grp.children[0]);
    cadRoofMeshes = [];
    cadRoofVisible = true;

    // 単位系（mm / cm / m）をバウンディングボックスから自動判定し 1m=1unit へ正規化
    const rawBox = new THREE.Box3().setFromObject(fbxObj);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z);
    let scaleFactor = 1.0;
    if (maxDim > 120) scaleFactor = 0.001; // mm単位（例: 10000mm -> 10m）
    else if (maxDim > 28) scaleFactor = 0.01; // cm単位
    fbxObj.scale.setScalar(scaleFactor);
    fbxObj.updateMatrixWorld(true);

    // 接地（min.y = 0）＆ 原点中央寄せ
    const normBox = new THREE.Box3().setFromObject(fbxObj);
    const center = normBox.getCenter(new THREE.Vector3());
    fbxObj.position.set(-center.x, -normBox.min.y, -center.z);
    fbxObj.updateMatrixWorld(true);

    fbxObj.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (isCadRoofObject(child)) {
                cadRoofMeshes.push(child);
            }
        }
    });

    grp.add(fbxObj);

    // カメラを建物サイズに合わせて自動フレーミング
    const fitBox = new THREE.Box3().setFromObject(grp);
    const fitSize = fitBox.getSize(new THREE.Vector3());
    const fitCenter = fitBox.getCenter(new THREE.Vector3());
    orbit.target.copy(fitCenter);
    orbit.radius = Math.max(10, Math.max(fitSize.x, fitSize.y, fitSize.z) * 1.45);
    if (typeof update3DCameraTransform === 'function') update3DCameraTransform();

    if (typeof state !== 'undefined' && state.viewMode === '2d' && typeof setViewMode === 'function') {
        setViewMode('2d3d');
    }
    updateCadRoofToggleUI();
    if (typeof closePresetModal === 'function') closePresetModal();
    if (typeof showToast === 'function') {
        showToast(`📐 CAD 3Dモデル「${fileName || 'FBX'}」を読み込みました（屋根要素 ${cadRoofMeshes.length}件検出・面積集計には影響しません）`);
    }
    return true;
}

function importArchitrendFBX(e) {
    const file = e && e.target && e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            loadArchitrendFBXFromBuffer(ev.target.result, file.name);
        } catch (err) {
            console.error('[FBX Import Error]', err);
            if (typeof showToast === 'function') showToast('FBX読み込みエラー: ' + err.message, true);
        }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
}

function toggleCadRoofVisibility() {
    cadRoofVisible = !cadRoofVisible;
    cadRoofMeshes.forEach(m => { m.visible = cadRoofVisible; });
    updateCadRoofToggleUI();
    if (typeof showToast === 'function') {
        showToast(cadRoofVisible ? '🏠 CADモデルの屋根を表示しました' : '🏠 CADモデルの屋根を非表示にしました（内観・間取り確認用）');
    }
}

function clearCadFbxModel() {
    if (cadFbxGroup) {
        while (cadFbxGroup.children.length > 0) cadFbxGroup.remove(cadFbxGroup.children[0]);
    }
    cadRoofMeshes = [];
    cadRoofVisible = true;
    updateCadRoofToggleUI();
    if (typeof showToast === 'function') showToast('読み込んだCAD 3Dモデルを消去しました');
}

window.importArchitrendFBX = importArchitrendFBX;
window.loadArchitrendFBXFromBuffer = loadArchitrendFBXFromBuffer;
window.toggleCadRoofVisibility = toggleCadRoofVisibility;
window.clearCadFbxModel = clearCadFbxModel;
window.getCadFbxStats = function() {
    return {
        loaded: !!(cadFbxGroup && cadFbxGroup.children.length > 0),
        roofMeshCount: cadRoofMeshes.length,
        roofVisible: cadRoofVisible
    };
};
})();
