/**
 * 住ま居る 3D間取り工房
 * 3D建築モデルレンダラー (Three.js 3D Architectural Engine)
 * 壁4種（通常壁・たれ壁・腰壁・上り框）・開口部くり抜き・空間6種・階段（ボックス/オープン/手すり）・3D直方体・鳥瞰図ミニプレビュー連動
 */
(function() {
    'use strict';

const canvas3d = document.getElementById('canvas3d');
let scene3d, camera3d, renderer3d, buildingGroup, furnitureGroup3d, cadFbxGroup, sunLight, ambientLight, hemiLight;
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

    furnitureGroup3d = new THREE.Group();
    furnitureGroup3d.name = 'furnitureGroup3d';
    scene3d.add(furnitureGroup3d);

    window.scene3d = scene3d;
    window.camera3d = camera3d;
    window.renderer3d = renderer3d;
    window.buildingGroup = buildingGroup;
    window.furnitureGroup3d = furnitureGroup3d;
    window.show3DFurnitureStaging = true;
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
        const fNum = state.floorDisplay3D === '2f' ? 2 : (state.floorDisplay3D === '3f' ? 3 : 1);
        const baseY = (fNum - 1) * (2.6 + 0.25);
        const eyeY = baseY + 1.35;
        const scaleP = ((typeof state !== 'undefined' && state.modulePitch) ? state.modulePitch : 910) / 1000;
        const flData = (typeof state !== 'undefined' && state.floors) ? state.floors[fNum] : null;
        const rooms = (flData && Array.isArray(flData.rooms)) ? flData.rooms : [];

        // LDK（なければ最大面積居室）と和室を検出し、部屋内から対角に見渡すアイレベル構図を自動計算
        let primaryRoom = null;
        let tatamiRoom = null;
        for (const r of rooms) {
            if (!r || r.type === 'VOID' || r.type === 'NAKANIWA' || r.type === 'TENJO') continue;
            const rName = String(r.name || r.label || r.type || '');
            const area = (r.w || 0) * (r.h || 0);
            if (/和室|畳|tatami/i.test(rName) || r.type === 'TATAMI' || r.type === 'WASHITSU') {
                if (!tatamiRoom || area > (tatamiRoom.w * tatamiRoom.h)) tatamiRoom = r;
            }
            if (/ldk|リビング|ダイニング/i.test(rName)) {
                if (!primaryRoom || area > (primaryRoom.w * primaryRoom.h)) primaryRoom = r;
            }
        }
        if (!primaryRoom && rooms.length > 0) {
            primaryRoom = rooms.reduce((best, r) => ((r.w || 0) * (r.h || 0) > ((best && best.w * best.h) || 0) ? r : best), null);
        }

        if (primaryRoom && primaryRoom.w > 0 && primaryRoom.h > 0) {
            const rx1 = primaryRoom.x * scaleP;
            const rz1 = primaryRoom.y * scaleP;
            const rx2 = (primaryRoom.x + primaryRoom.w) * scaleP;
            const rz2 = (primaryRoom.y + primaryRoom.h) * scaleP;
            const rw = rx2 - rx1;
            const rh = rz2 - rz1;
            const rcx = (rx1 + rx2) / 2;
            const rcz = (rz1 + rz2) / 2;

            // 壁から確実に内側（0.7mまたは辺の20%）へカメラを配置し、対角方向を見渡す
            const padX = Math.min(0.75, rw * 0.22);
            const padZ = Math.min(0.75, rh * 0.22);
            let camX = rx1 + padX;
            let camZ = rz1 + padZ;
            let tgtX = rx2 - padX;
            let tgtZ = rz2 - padZ;

            if (tatamiRoom && tatamiRoom !== primaryRoom) {
                const tcx = (tatamiRoom.x + tatamiRoom.w / 2) * scaleP;
                const tcz = (tatamiRoom.y + tatamiRoom.h / 2) * scaleP;
                camX = (tcx >= rcx) ? (rx1 + padX) : (rx2 - padX);
                camZ = (tcz >= rcz) ? (rz1 + padZ) : (rz2 - padZ);
                tgtX = rcx * 0.4 + tcx * 0.6;
                tgtZ = rcz * 0.4 + tcz * 0.6;
            }

            const dx = camX - tgtX;
            const dz = camZ - tgtZ;
            const horizDist = Math.max(1.6, Math.min(4.8, Math.hypot(dx, dz) * 0.65));
            // target をカメラ前方 horizDist の点に置き、camera3d.position が確実に部屋内 (camX, eyeY, camZ) に来るよう設定
            const dirLen = Math.max(0.001, Math.hypot(dx, dz));
            const ux = dx / dirLen;
            const uz = dz / dirLen;
            orbit.target.set(camX - ux * horizDist, eyeY - 0.12, camZ - uz * horizDist);
            orbit.theta = Math.atan2(ux, uz);
            orbit.phi = Math.PI * 0.475;
            orbit.radius = horizDist;
        } else {
            orbit.target.set(2.8, eyeY, 3.5);
            orbit.theta = -Math.PI * 0.35;
            orbit.phi = Math.PI * 0.47;
            orbit.radius = 3.2;
        }
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

let cachedTatamiTexture = null;
function getTatamiCanvasTexture() {
    if (cachedTatamiTexture) return cachedTatamiTexture;
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    // 琉球畳 2x2 市松グリーン＋イ草の織り目＋くっきりした畳目地（Cannyエッジ検出対応）
    const colors = [
        ['#7f9e56', '#6b8b43'],
        ['#6b8b43', '#7f9e56']
    ];
    for (let gy = 0; gy < 2; gy++) {
        for (let gx = 0; gx < 2; gx++) {
            const x0 = gx * 256;
            const y0 = gy * 256;
            ctx.fillStyle = colors[gy][gx];
            ctx.fillRect(x0, y0, 256, 256);

            // 交互方向の細かい畳目（イ草織りライン）
            const isHoriz = (gx + gy) % 2 === 0;
            ctx.strokeStyle = 'rgba(58, 79, 34, 0.24)';
            ctx.lineWidth = 1;
            for (let k = 4; k < 256; k += 6) {
                ctx.beginPath();
                if (isHoriz) {
                    ctx.moveTo(x0, y0 + k);
                    ctx.lineTo(x0 + 256, y0 + k);
                } else {
                    ctx.moveTo(x0 + k, y0);
                    ctx.lineTo(x0 + k, y0 + 256);
                }
                ctx.stroke();
            }

            // 畳1枚ごとの濃い縁・目地ライン（Canny が明確に拾えるコントラスト）
            ctx.strokeStyle = '#3f5724';
            ctx.lineWidth = 4;
            ctx.strokeRect(x0 + 2, y0 + 2, 252, 252);
        }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    cachedTatamiTexture = tex;
    return tex;
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
    const matTatamiSlab = new THREE.MeshLambertMaterial({ map: getTatamiCanvasTexture(), color: 0xffffff });
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

            const rmLabelStr = String(rm.name || rm.label || '');
            if (rm.type === 'DOMA' || rm.type === 'PORCH') {
                sMat = matDomaSlab;
                sHeight = Math.max(0.06, slabHeight - 0.10);
                sCenterY = baseY + sHeight / 2;
            } else if (rm.type === 'KOAGARI') {
                sMat = /畳|tatami|和室/i.test(rmLabelStr) ? matTatamiSlab : matKoagariSlab;
                sHeight = slabHeight + 0.30; // +30cm 小上り段差
                sCenterY = baseY + sHeight / 2;
            } else if (rm.type === 'TATAMI' || rm.type === 'WASHITSU' || /和室|畳|tatami/i.test(rmLabelStr)) {
                sMat = matTatamiSlab;
            }

            const slabGeo = new THREE.BoxGeometry(wM, sHeight, hM);
            const slabMesh = addWhiteModelMesh(slabGeo, sMat, cx, sCenterY, cz, true);
            if (slabMesh && sMat === matTatamiSlab) {
                slabMesh.userData.regionTag = 'tatami';
            }

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

        // 2. 壁4種（通常壁 / たれ壁 / 腰壁 / 上り框 ＆ 斜め壁対応 ＆ 高さ指定連動）
        flData.walls.forEach(wl => {
            const isHoriz = Math.abs(wl.y1 - wl.y2) < 0.05;
            const isVert = Math.abs(wl.x1 - wl.x2) < 0.05;
            const wType = wl.wallType || 'wall';
            const floorTopY = baseY + slabHeight;

            // 高さ指定（ミリメートル指定があればそれを最優先）
            const waistH = wl.heightMm ? (wl.heightMm / 1000) : 1.00;
            const dropH = wl.heightMm ? (wl.heightMm / 1000) : 0.55;
            const actualWallH = wl.heightMm ? (wl.heightMm / 1000) : wallHeight;

            if (isHoriz || isVert) {
                const startP = isHoriz ? Math.min(wl.x1, wl.x2) : Math.min(wl.y1, wl.y2);
                const endP = isHoriz ? Math.max(wl.x1, wl.x2) : Math.max(wl.y1, wl.y2);
                const fixedP = isHoriz ? wl.y1 : wl.x1;
                const lenP = endP - startP;
                if (lenP <= 0.04) return;

                if (wType === 'tarekabe') {
                    // たれ壁: 天井から下がる上部壁
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
                    // 腰壁: 床から立ち上がる手すり壁
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
                    const kamachiH = wl.heightMm ? (wl.heightMm / 1000) : 0.18;
                    const lenM = lenP * scaleP;
                    const midM = ((startP + endP) / 2) * scaleP;
                    const fixedM = fixedP * scaleP;
                    const geo = isHoriz
                        ? new THREE.BoxGeometry(lenM, kamachiH, 0.12)
                        : new THREE.BoxGeometry(0.12, kamachiH, lenM);
                    const kamMesh = addWhiteModelMesh(
                        geo, matDoorPanel,
                        isHoriz ? midM : fixedM,
                        baseY + kamachiH / 2 + 0.03,
                        isHoriz ? fixedM : midM,
                        true
                    );
                    if (kamMesh) kamMesh.userData.regionTag = 'agarikamachi';
                } else {
                    // 通常壁（開口部くり抜き付き・高さ指定連動）
                    buildWallWithOpeningCutouts3D(
                        isHoriz ? 'h' : 'v',
                        fixedP, startP, endP,
                        floorTopY, actualWallH, wallThick,
                        flData.openings, scaleP, matWhiteWall
                    );
                }
            } else {
                // 斜め壁（自由角・45度斜め壁の3Dレンダリング）
                const lenP = Math.hypot(wl.x2 - wl.x1, wl.y2 - wl.y1);
                if (lenP <= 0.04) return;
                const lenM = lenP * scaleP;
                const midX = ((wl.x1 + wl.x2) / 2) * scaleP;
                const midZ = ((wl.y1 + wl.y2) / 2) * scaleP;
                const angle = Math.atan2(wl.y2 - wl.y1, wl.x2 - wl.x1);
                let wH = actualWallH;
                let wPosY = floorTopY + wH / 2;
                if (wType === 'koshikabe') {
                    wH = waistH;
                    wPosY = floorTopY + waistH / 2;
                } else if (wType === 'tarekabe') {
                    wH = dropH;
                    wPosY = floorTopY + wallHeight - dropH / 2;
                }
                const diagGeo = new THREE.BoxGeometry(lenM + wallThick, wH, wallThick);
                const mesh = addWhiteModelMesh(diagGeo, matWhiteWall, midX, wPosY, midZ, true);
                if (mesh) mesh.rotation.y = -angle;
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

    // 7. 簡易3D家具ステージング（独立グループ・state.floors/面積集計には一切非干渉）
    buildFurnitureStaging3D(floorsToBuild, scaleP, slabHeight, wallHeight);

    syncBirdEyePreview();
}

function buildFurnitureStaging3D(floorsToBuild, scaleP, slabHeight, wallHeight) {
    if (!furnitureGroup3d) return;
    while (furnitureGroup3d.children.length > 0) {
        const ch = furnitureGroup3d.children[0];
        furnitureGroup3d.remove(ch);
        if (ch.geometry) ch.geometry.dispose();
    }
    if (!window.show3DFurnitureStaging) {
        furnitureGroup3d.visible = false;
        return;
    }
    furnitureGroup3d.visible = true;

    const targetFl = (floorsToBuild && floorsToBuild.length > 0) ? floorsToBuild[0] : 1;
    const flData = (typeof state !== 'undefined' && state.floors) ? state.floors[targetFl] : null;
    if (!flData || !Array.isArray(flData.rooms)) return;

    // LDK または最大面積の洋室/居室（和室・水回り・収納は除外）を選定
    let hostRoom = null;
    for (const r of flData.rooms) {
        if (!r || r.type === 'VOID' || r.type === 'NAKANIWA' || r.type === 'TENJO') continue;
        if (r.type === 'BATH' || r.type === 'TOILET' || r.type === 'STORAGE' || r.type === 'DOMA' || r.type === 'PORCH' || r.type === 'HALL') continue;
        const rName = String(r.name || r.label || '');
        if (r.type === 'TATAMI' || r.type === 'WASHITSU' || /和室|畳|tatami|便所|浴室|収納|押入|洗面|玄関|ホール/i.test(rName)) continue;
        const area = (r.w || 0) * (r.h || 0);
        if (/ldk|リビング|ダイニング/i.test(rName)) {
            if (!hostRoom || !/ldk|リビング|ダイニング/i.test(String(hostRoom.name || '')) || area > hostRoom.w * hostRoom.h) {
                hostRoom = r;
            }
        } else if (!hostRoom || (!/ldk|リビング|ダイニング/i.test(String(hostRoom.name || '')) && area > hostRoom.w * hostRoom.h)) {
            hostRoom = r;
        }
    }
    if (!hostRoom) return;

    const rw = hostRoom.w * scaleP;
    const rh = hostRoom.h * scaleP;
    if (rw < 2.6 || rh < 2.4) return;

    const baseY = (targetFl === 0 ? -1 : (targetFl - 1)) * (wallHeight + slabHeight);
    const floorY = baseY + slabHeight;
    const rcx = (hostRoom.x + hostRoom.w / 2) * scaleP;
    const rcz = (hostRoom.y + hostRoom.h / 2) * scaleP;

    const matOak = new THREE.MeshLambertMaterial({ color: 0xa67444 });
    const matOakDark = new THREE.MeshLambertMaterial({ color: 0x855830 });
    const matLinen = new THREE.MeshLambertMaterial({ color: 0xded7cb });
    const matRug = new THREE.MeshLambertMaterial({ color: 0xe6e0d4 });

    const addFurnPart = (w, h, d, mat, x, y, z) => {
        const geo = new THREE.BoxGeometry(w, h, d);
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.castShadow = true;
        m.receiveShadow = true;
        m.userData.regionTag = 'furniture';
        furnitureGroup3d.add(m);
        return m;
    };

    // 1. ダイニングテーブル＋椅子4脚（部屋中央やや奥寄りに配置）
    const tblW = Math.min(1.55, rw * 0.34);
    const tblD = Math.min(0.85, rh * 0.24);
    const tblH = 0.72;
    const tblX = rcx + (rw >= 4.2 ? rw * 0.12 : 0);
    const tblZ = rcz + (rh >= 3.6 ? rh * 0.08 : 0);

    addFurnPart(tblW, 0.045, tblD, matOak, tblX, floorY + tblH - 0.022, tblZ);
    const legOffX = tblW / 2 - 0.08;
    const legOffZ = tblD / 2 - 0.08;
    for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
            addFurnPart(0.055, tblH - 0.045, 0.055, matOakDark, tblX + sx * legOffX, floorY + (tblH - 0.045) / 2, tblZ + sz * legOffZ);
        }
    }

    // 椅子4脚（テーブル長辺の前後2脚ずつ）
    for (const sz of [-1, 1]) {
        for (const sx of [-0.32, 0.32]) {
            const cx = tblX + sx * tblW;
            const cz = tblZ + sz * (tblD / 2 + 0.26);
            addFurnPart(0.42, 0.04, 0.42, matOakDark, cx, floorY + 0.44, cz);
            addFurnPart(0.42, 0.38, 0.04, matOak, cx, floorY + 0.65, cz + sz * 0.19);
            for (const lx of [-0.17, 0.17]) {
                for (const lz of [-0.17, 0.17]) {
                    addFurnPart(0.035, 0.42, 0.035, matOakDark, cx + lx, floorY + 0.21, cz + lz);
                }
            }
        }
    }

    // 2. 広い居室（幅4.0m以上）ではラグ＋ミニマルソファ＋ローテーブルも配置
    if (rw >= 4.0 && rh >= 3.4) {
        const sofX = rcx - rw * 0.16;
        const sofZ = rcz + rh * 0.16;
        // ラグ
        addFurnPart(1.8, 0.015, 1.3, matRug, sofX, floorY + 0.008, sofZ - 0.35);
        // ローテーブル
        addFurnPart(0.95, 0.04, 0.50, matOak, sofX, floorY + 0.36, sofZ - 0.55);
        addFurnPart(0.82, 0.34, 0.04, matOakDark, sofX, floorY + 0.17, sofZ - 0.72);
        addFurnPart(0.82, 0.34, 0.04, matOakDark, sofX, floorY + 0.17, sofZ - 0.38);
        // 2人掛けミニマルソファ
        addFurnPart(1.65, 0.38, 0.78, matLinen, sofX, floorY + 0.19, sofZ + 0.15);
        addFurnPart(1.65, 0.40, 0.18, matLinen, sofX, floorY + 0.56, sofZ + 0.45);
        addFurnPart(0.14, 0.24, 0.78, matLinen, sofX - 0.76, floorY + 0.48, sofZ + 0.15);
        addFurnPart(0.14, 0.24, 0.78, matLinen, sofX + 0.76, floorY + 0.48, sofZ + 0.15);
    }
}

function toggle3DFurnitureStaging() {
    window.show3DFurnitureStaging = !window.show3DFurnitureStaging;
    const btn = document.getElementById('btn3DFurnitureToggle');
    if (btn) {
        btn.innerHTML = window.show3DFurnitureStaging ? '<span>🛋️ 3D家具: ON</span>' : '<span>🛋️ 3D家具: OFF</span>';
    }
    rebuild3DScene();
    if (typeof showToast === 'function') {
        showToast(window.show3DFurnitureStaging ? '🛋️ 3D家具ステージングを表示しました' : '🛋️ 3D家具ステージングを非表示にしました');
    }
}
window.toggle3DFurnitureStaging = toggle3DFurnitureStaging;

function renderStair3D(fx, floorTopY, wallHeight, slabHeight, scaleP) {
    if (!fx) return;
    if ((fx.x === undefined || fx.w === undefined) && fx.points && fx.points.length >= 2) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        fx.points.forEach(pt => {
            minX = Math.min(minX, pt.x);
            minY = Math.min(minY, pt.y);
            maxX = Math.max(maxX, pt.x);
            maxY = Math.max(maxY, pt.y);
        });
        fx.x = minX;
        fx.y = minY;
        const widthP = (fx.widthMm || 910) / (state.modulePitch || 910);
        fx.w = +(Math.max(widthP, maxX - minX)).toFixed(3) || widthP;
        fx.h = +(Math.max(widthP, maxY - minY)).toFixed(3) || (widthP * 2);
    }

    const curX = (fx.x !== undefined && !isNaN(fx.x)) ? fx.x : 0;
    const curY = (fx.y !== undefined && !isNaN(fx.y)) ? fx.y : 0;
    const isDown = fx.direction === 'DOWN';
    const isOpenStair = (fx.stairStyle || state.stairStyle) === 'open';
    const stepMat = new THREE.MeshLambertMaterial({ color: isOpenStair ? 0x9a6b3e : 0xd4a373, side: THREE.DoubleSide });
    const totalRise = wallHeight + slabHeight;

    if (typeof window.computeStairModularLayout === 'function') {
        const layout = window.computeStairModularLayout(fx);
        const totalSteps = Math.max(1, layout.totalSteps);
        const riserM = (fx.riserMm || 200) / 1000;
        const effectiveTotalRise = (totalSteps <= 9)
            ? Math.min(totalRise, riserM * totalSteps)
            : totalRise;
        const stepH = effectiveTotalRise / totalSteps;
        const treadThick = isOpenStair ? 0.045 : Math.max(0.05, stepH * 0.96);

        (layout.stepPolygons3D || []).forEach(sp => {
            if (!sp.points || sp.points.length < 3) return;
            const sIdx = isDown ? (totalSteps - 1 - sp.stepIndex) : sp.stepIndex;
            const curRiseY = floorTopY + (sIdx + 0.5) * stepH;

            let cxLocal = 0, cyLocal = 0;
            sp.points.forEach(pt => { cxLocal += pt.x; cyLocal += pt.y; });
            cxLocal /= sp.points.length;
            cyLocal /= sp.points.length;

            const shape = new THREE.Shape();
            sp.points.forEach((pt, idx) => {
                const sx = (pt.x - cxLocal) * scaleP * 0.97;
                const sy = -(pt.y - cyLocal) * scaleP * 0.97;
                if (idx === 0) shape.moveTo(sx, sy);
                else shape.lineTo(sx, sy);
            });
            shape.closePath();

            const sGeo = new THREE.ExtrudeGeometry(shape, { depth: treadThick, bevelEnabled: false });
            const m = addWhiteModelMesh(
                sGeo,
                stepMat,
                (curX + cxLocal) * scaleP,
                curRiseY - treadThick * 0.5,
                (curY + cyLocal) * scaleP,
                true
            );
            if (m) m.rotation.x = -Math.PI * 0.5;
        });
        return;
    }

    // フォールバック (万一 computeStairModularLayout が未ロードの場合)
    const curW = (fx.w !== undefined && !isNaN(fx.w)) ? fx.w : 1;
    const curH = (fx.h !== undefined && !isNaN(fx.h)) ? fx.h : 2;
    const wM = curW * scaleP;
    const dM = curH * scaleP;
    const cx = (curX + curW / 2) * scaleP;
    const cz = (curY + curH / 2) * scaleP;
    const totalSteps = fx.steps || 14;
    const stepH = totalRise / totalSteps;
    const treadThick = isOpenStair ? 0.045 : Math.max(0.05, stepH * 0.95);
    const stepDepth = dM / totalSteps;
    for (let i = 0; i < totalSteps; i++) {
        const sIdx = isDown ? (totalSteps - 1 - i) : i;
        const curYPos = floorTopY + (sIdx + 0.5) * stepH;
        const curZPos = curY * scaleP + (i + 0.5) * stepDepth;
        const sGeo = new THREE.BoxGeometry(wM * 0.96, treadThick, stepDepth * 0.95);
        addWhiteModelMesh(sGeo, stepMat, cx, curYPos, curZPos, true);
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

// ============================================================================
// パース工房（SmileStudio）連携: カラー素図＋深度マップ（近＝白・遠＝黒）取得＆容量ガード保存
// ============================================================================
function resizeCanvasToDataUrl(srcCanvas, maxDim, mimeType, quality) {
    const sw = srcCanvas.width || 1024;
    const sh = srcCanvas.height || 768;
    const scale = Math.min(1, maxDim / Math.max(sw, sh));
    const tw = Math.max(64, Math.round(sw * scale));
    const th = Math.max(64, Math.round(sh * scale));
    const tmp = document.createElement('canvas');
    tmp.width = tw;
    tmp.height = th;
    const ctx = tmp.getContext('2d');
    if (mimeType === 'image/jpeg') {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, tw, th);
    }
    ctx.drawImage(srcCanvas, 0, 0, tw, th);
    return { dataUrl: tmp.toDataURL(mimeType, quality), width: tw, height: th, canvas: tmp };
}

/**
 * ビュー空間の線形距離（-mvPosition.z）を ControlNet Depth 規約（近＝白 255、遠＝黒 0）の
 * 256階調フルレンジで出力する。8bit 非線形 Z バッファ由来の等高線バンディングを完全に防止する。
 */
function captureNormalizedDepthDataUrl(maxDim) {
    const prevOverride = scene3d.overrideMaterial;
    const prevBg = scene3d.background;
    const prevClearColor = new THREE.Color();
    const prevClearAlpha = renderer3d.getClearAlpha();
    renderer3d.getClearColor(prevClearColor);

    const prevGridVis = window.gridHelper3d ? window.gridHelper3d.visible : null;
    const prevGroundVis = window.groundMesh3d ? window.groundMesh3d.visible : null;
    const prevNear = camera3d.near;
    const prevFar = camera3d.far;

    // 建物グループのカメラ距離レンジを算出し、256階調を建物全体（室内視点時は室内前方レンジ）へ最適配分
    let uNear = 0.5;
    let uFar = 32.0;
    let depthViewMode = 'exterior';
    try {
        if (buildingGroup && buildingGroup.children.length > 0) {
            const box = new THREE.Box3().setFromObject(buildingGroup);
            const expandedBox = box.clone().expandByScalar(0.8);
            const isInsideBuilding = expandedBox.containsPoint(camera3d.position);
            const corners = [
                new THREE.Vector3(box.min.x, box.min.y, box.min.z),
                new THREE.Vector3(box.min.x, box.min.y, box.max.z),
                new THREE.Vector3(box.min.x, box.max.y, box.min.z),
                new THREE.Vector3(box.min.x, box.max.y, box.max.z),
                new THREE.Vector3(box.max.x, box.min.y, box.min.z),
                new THREE.Vector3(box.max.x, box.min.y, box.max.z),
                new THREE.Vector3(box.max.x, box.max.y, box.min.z),
                new THREE.Vector3(box.max.x, box.max.y, box.max.z)
            ];
            let minD = Infinity, maxD = 0, maxFrontD = 0;
            camera3d.updateMatrixWorld(true);
            const invCam = camera3d.matrixWorldInverse;
            for (const c of corners) {
                const v = c.clone().applyMatrix4(invCam);
                const z = -v.z;
                if (z < minD) minD = z;
                if (z > maxD) maxD = z;
                if (z > 0.1 && z > maxFrontD) maxFrontD = z;
            }
            if (isInsideBuilding || minD < 1.2) {
                // アイレベル室内視点: カメラ直前から室内最遠壁までを256階調へ最適配分
                depthViewMode = 'interior';
                uNear = 0.25;
                uFar = Math.max(4.5, Math.min(11.5, maxFrontD > 0 ? maxFrontD * 0.95 : 9.0));
            } else if (isFinite(minD) && maxD > minD) {
                const pad = Math.max(0.5, (maxD - minD) * 0.12);
                uNear = Math.max(0.2, minD - pad);
                uFar = Math.max(uNear + 2.0, maxD + pad * 2.5);
            }
        } else {
            const dist = camera3d.position.distanceTo(orbit.target);
            uNear = Math.max(0.2, dist * 0.35);
            uFar = Math.max(uNear + 4.0, dist * 1.9);
        }
    } catch (_) {}

    const depthMat = new THREE.ShaderMaterial({
        uniforms: {
            uNear: { value: uNear },
            uFar: { value: uFar }
        },
        vertexShader: [
            'varying float vViewDepth;',
            'void main() {',
            '  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);',
            '  vViewDepth = -mvPos.z;',
            '  gl_Position = projectionMatrix * mvPos;',
            '}'
        ].join('\n'),
        fragmentShader: [
            'uniform float uNear;',
            'uniform float uFar;',
            'varying float vViewDepth;',
            'void main() {',
            '  float d = 1.0 - clamp((vViewDepth - uNear) / max(0.001, (uFar - uNear)), 0.0, 1.0);',
            '  gl_FragColor = vec4(vec3(d), 1.0);',
            '}'
        ].join('\n'),
        side: THREE.DoubleSide
    });

    try {
        if (window.gridHelper3d) window.gridHelper3d.visible = false;
        if (window.groundMesh3d) window.groundMesh3d.visible = false;
        scene3d.overrideMaterial = depthMat;
        scene3d.background = new THREE.Color(0x000000);
        renderer3d.setClearColor(0x000000, 1);
        renderer3d.render(scene3d, camera3d);

        const resized = resizeCanvasToDataUrl(renderer3d.domElement, maxDim, 'image/png', 1.0);
        const ctx = resized.canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, resized.width, resized.height);
        const d = imgData.data;
        let minV = 255, maxV = 0;
        const levelSet = new Set();
        for (let i = 0; i < d.length; i += 4) {
            const v = d[i];
            if (v > 0) {
                if (v < minV) minV = v;
                if (v > maxV) maxV = v;
                levelSet.add(v);
            }
        }
        return {
            dataUrl: resized.canvas.toDataURL('image/png'),
            width: resized.width,
            height: resized.height,
            convention: 'near_white_far_black',
            depthRange: {
                mode: depthViewMode,
                minRaw: minV,
                maxRaw: maxV,
                uniqueLevels: levelSet.size,
                linearNearM: Number(uNear.toFixed(2)),
                linearFarM: Number(uFar.toFixed(2))
            }
        };
    } finally {
        camera3d.near = prevNear;
        camera3d.far = prevFar;
        camera3d.updateProjectionMatrix();
        scene3d.overrideMaterial = prevOverride;
        scene3d.background = prevBg;
        renderer3d.setClearColor(prevClearColor, prevClearAlpha);
        if (window.gridHelper3d && prevGridVis !== null) window.gridHelper3d.visible = prevGridVis;
        if (window.groundMesh3d && prevGroundVis !== null) window.groundMesh3d.visible = prevGroundVis;
        depthMat.dispose();
        renderer3d.render(scene3d, camera3d);
    }
}

function extractRoomMaterialHints() {
    const hints = { hasTatami: false, hasLdk: false, hasEntrance: false, roomNames: [] };
    try {
        if (typeof state !== 'undefined' && state.floors) {
            const floorKeys = Object.keys(state.floors);
            for (const fk of floorKeys) {
                const fl = state.floors[fk];
                const rooms = (fl && Array.isArray(fl.rooms)) ? fl.rooms : [];
                for (const r of rooms) {
                    const name = String(r.name || r.label || r.type || '').trim();
                    if (!name) continue;
                    if (hints.roomNames.indexOf(name) === -1) hints.roomNames.push(name);
                    if (/和室|畳|tatami|ヌック|小上がり/i.test(name)) hints.hasTatami = true;
                    if (/ldk|リビング|ダイニング|キッチン/i.test(name)) hints.hasLdk = true;
                    if (/玄関|土間|ポーチ/i.test(name)) hints.hasEntrance = true;
                }
            }
        }
    } catch (_) {}
    return hints;
}

function saveHandoffToIndexedDB(key, payloadObj) {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error('IndexedDB is not supported'));
            return;
        }
        const req = window.indexedDB.open('smile_studio_handoff_db', 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('handoffs')) {
                db.createObjectStore('handoffs');
            }
        };
        req.onsuccess = (e) => {
            try {
                const db = e.target.result;
                const tx = db.transaction('handoffs', 'readwrite');
                tx.objectStore('handoffs').put(payloadObj, key);
                tx.oncomplete = () => { db.close(); resolve(true); };
                tx.onerror = () => { db.close(); reject(tx.error || new Error('IndexedDB write failed')); };
            } catch (err) {
                reject(err);
            }
        };
        req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
    });
}

/**
 * 汎用リージョンマスク描画（項目 B: 'tatami'、項目 C: 'furniture' 共通）。
 * 指定 regionTag のメッシュを純白(#ffffff)、それ以外を純黒(#000000)で描画し、
 * finally 句で全メッシュのマテリアル・可視状態・背景を完全に復元する。
 */
function captureRegionMaskDataUrl(regionTag, maxDim = 512) {
    if (!renderer3d || !scene3d || !camera3d || !buildingGroup) {
        return { dataUrl: null, coverageRatio: 0, width: 0, height: 0 };
    }
    const prevBg = scene3d.background;
    const prevClearColor = new THREE.Color();
    const prevClearAlpha = renderer3d.getClearAlpha();
    renderer3d.getClearColor(prevClearColor);
    const prevGridVis = window.gridHelper3d ? window.gridHelper3d.visible : null;
    const prevGroundVis = window.groundMesh3d ? window.groundMesh3d.visible : null;

    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
    const savedStates = [];

    try {
        if (window.gridHelper3d) window.gridHelper3d.visible = false;
        if (window.groundMesh3d) window.groundMesh3d.visible = false;
        scene3d.background = new THREE.Color(0x000000);
        renderer3d.setClearColor(0x000000, 1);

        scene3d.traverse((obj) => {
            if (obj === window.gridHelper3d || obj === window.groundMesh3d) return;
            if (obj.isLineSegments || obj.isLine) {
                savedStates.push({ obj, kind: 'vis', visible: obj.visible });
                obj.visible = false;
            } else if (obj.isMesh) {
                savedStates.push({ obj, kind: 'mat', material: obj.material });
                const isTarget = !!(obj.userData && obj.userData.regionTag === regionTag);
                obj.material = isTarget ? whiteMat : blackMat;
            }
        });

        renderer3d.render(scene3d, camera3d);
        const resized = resizeCanvasToDataUrl(renderer3d.domElement, maxDim, 'image/png', 1.0);
        const ctx = resized.canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, resized.width, resized.height);
        const d = imgData.data;
        let whitePx = 0;
        const totalPx = resized.width * resized.height;
        for (let i = 0; i < d.length; i += 4) {
            const isW = d[i] > 127;
            const v = isW ? 255 : 0;
            d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
            if (isW) whitePx++;
        }
        ctx.putImageData(imgData, 0, 0);
        const ratio = totalPx > 0 ? Number((whitePx / totalPx).toFixed(4)) : 0;
        return {
            dataUrl: ratio >= 0.002 ? resized.canvas.toDataURL('image/png') : null,
            coverageRatio: ratio,
            width: resized.width,
            height: resized.height
        };
    } finally {
        for (const st of savedStates) {
            if (st.kind === 'vis') st.obj.visible = st.visible;
            else if (st.kind === 'mat') st.obj.material = st.material;
        }
        scene3d.background = prevBg;
        renderer3d.setClearColor(prevClearColor, prevClearAlpha);
        if (window.gridHelper3d && prevGridVis !== null) window.gridHelper3d.visible = prevGridVis;
        if (window.groundMesh3d && prevGroundVis !== null) window.groundMesh3d.visible = prevGroundVis;
        whiteMat.dispose();
        blackMat.dispose();
        renderer3d.render(scene3d, camera3d);
    }
}

function capture3DColorAndDepth(maxDim = 1024, jpegQuality = 0.88) {
    if (!renderer3d || !scene3d || !camera3d) {
        throw new Error('3Dエンジンが初期化されていません');
    }
    // カラー素図（＝Cannyエッジ源兼用）でも地面メッシュと方眼グリッドを一時非表示＋クリーン背景化
    const prevGridVis = window.gridHelper3d ? window.gridHelper3d.visible : null;
    const prevGroundVis = window.groundMesh3d ? window.groundMesh3d.visible : null;
    const prevBg = scene3d.background;
    const prevClearColor = new THREE.Color();
    const prevClearAlpha = renderer3d.getClearAlpha();
    renderer3d.getClearColor(prevClearColor);

    let colorCap;
    try {
        if (window.gridHelper3d) window.gridHelper3d.visible = false;
        if (window.groundMesh3d) window.groundMesh3d.visible = false;
        scene3d.background = new THREE.Color(0xf8fafc);
        renderer3d.setClearColor(0xf8fafc, 1);
        renderer3d.render(scene3d, camera3d);
        colorCap = resizeCanvasToDataUrl(renderer3d.domElement, maxDim, 'image/jpeg', jpegQuality);
    } finally {
        scene3d.background = prevBg;
        renderer3d.setClearColor(prevClearColor, prevClearAlpha);
        if (window.gridHelper3d && prevGridVis !== null) window.gridHelper3d.visible = prevGridVis;
        if (window.groundMesh3d && prevGroundVis !== null) window.groundMesh3d.visible = prevGroundVis;
        renderer3d.render(scene3d, camera3d);
    }

    const depthCap = captureNormalizedDepthDataUrl(maxDim);
    const regionMasks = [];
    const tatamiMask = captureRegionMaskDataUrl('tatami', 512);
    if (tatamiMask.dataUrl) {
        regionMasks.push({
            id: 'tatami',
            prompt: 'vivid natural green woven Japanese ryukyu tatami mat flooring, traditional square tatami grid seams, green tatami texture',
            strength: 1.35,
            coverageRatio: tatamiMask.coverageRatio,
            maskDataUrl: tatamiMask.dataUrl
        });
    }
    const furnMask = captureRegionMaskDataUrl('furniture', 512);
    if (furnMask.dataUrl) {
        regionMasks.push({
            id: 'furniture',
            prompt: 'crafted solid oak wooden dining table with chairs, comfortable minimalist linen sofa, warm interior styling, natural wood furniture',
            strength: 1.0,
            coverageRatio: furnMask.coverageRatio,
            maskDataUrl: furnMask.dataUrl
        });
    }
    return {
        colorDataUrl: colorCap.dataUrl,
        depthDataUrl: depthCap.dataUrl,
        regionMasks: regionMasks,
        width: colorCap.width,
        height: colorCap.height,
        depthConvention: depthCap.convention,
        depthRange: depthCap.depthRange,
        cleanBackground: true,
        roomHints: extractRoomMaterialHints()
    };
}

async function persistSmileStudioHandoff(payload) {
    const MAX_LS_CHARS = 2400000; // 約2.4MB安全上限（5MB制限・他データ圧迫防止）
    let serialized = JSON.stringify(payload);

    // 1. サイズ超過時はカラー画像の解像度・品質を段階縮小して再試行
    const fallbackSteps = [
        { maxDim: 896, quality: 0.78 },
        { maxDim: 768, quality: 0.68 }
    ];
    if (serialized.length > MAX_LS_CHARS && renderer3d && scene3d && camera3d) {
        for (const step of fallbackSteps) {
            const cap = capture3DColorAndDepth(step.maxDim, step.quality);
            payload.colorDataUrl = cap.colorDataUrl;
            payload.depthDataUrl = cap.depthDataUrl;
            payload.width = cap.width;
            payload.height = cap.height;
            serialized = JSON.stringify(payload);
            if (serialized.length <= MAX_LS_CHARS) break;
        }
    }

    // 2. localStorage へ保存試行
    if (serialized.length <= MAX_LS_CHARS) {
        try {
            localStorage.setItem('smile_studio_handoff', serialized);
            return { ok: true, storage: 'localStorage', bytes: serialized.length };
        } catch (lsErr) {
            console.warn('[SmileStudio Handoff] localStorage quota exceeded, falling back to IndexedDB:', lsErr);
        }
    }

    // 3. IndexedDB フォールバック保存
    try {
        const idbKey = 'handoff_' + Date.now();
        await saveHandoffToIndexedDB(idbKey, payload);
        localStorage.setItem('smile_studio_handoff', JSON.stringify({
            version: 1,
            storage: 'indexeddb',
            key: idbKey,
            timestamp: payload.timestamp,
            planId: payload.planId,
            returnUrl: payload.returnUrl
        }));
        return { ok: true, storage: 'indexeddb', bytes: serialized.length };
    } catch (idbErr) {
        console.error('[SmileStudio Handoff] Storage failed:', idbErr);
        return { ok: false, error: 'ブラウザの保存容量上限により3Dデータの引き継ぎに失敗しました。不要なタブや履歴を整理してから再度お試しください。' };
    }
}

async function export3DToPersStudio(specifiedPreset) {
    if (!renderer3d || !scene3d || !camera3d) {
        if (typeof showToast === 'function') showToast('3Dエンジンが初期化されていません', true);
        return;
    }
    const preset = specifiedPreset || (typeof state !== 'undefined' && state.active3DPreset) || 'bird';
    let cap;
    try {
        cap = capture3DColorAndDepth(1024, 0.88);
    } catch (err) {
        if (typeof showToast === 'function') showToast('3Dキャプチャに失敗しました: ' + err.message, true);
        return;
    }

    const planId = (typeof state !== 'undefined' && state.currentPlanId) ? state.currentPlanId : '';
    const projectTitle = (typeof state !== 'undefined' && state.projectTitle) ? state.projectTitle : '間取り工房3Dモデル';
    const roomHints = cap.roomHints || extractRoomMaterialHints();
    const hasTatamiMask = Array.isArray(cap.regionMasks) && cap.regionMasks.some(m => m.id === 'tatami');
    const floorPhrase = (roomHints.hasTatami && !hasTatamiMask)
        ? ', green woven ryukyu tatami mat flooring in the Japanese washitsu room, warm solid yoshino cedar wood flooring in the LDK'
        : ', warm solid yoshino cedar wood flooring';

    const handoffPayload = {
        version: 1,
        source: 'madori_handoff',
        timestamp: Date.now(),
        planId: planId,
        projectTitle: projectTitle,
        returnUrl: window.location.pathname + window.location.search,
        colorDataUrl: cap.colorDataUrl,
        depthDataUrl: cap.depthDataUrl,
        regionMasks: cap.regionMasks || [],
        width: cap.width,
        height: cap.height,
        depthConvention: cap.depthConvention,
        roomHints: roomHints,
        camera: {
            position: [Number(camera3d.position.x.toFixed(3)), Number(camera3d.position.y.toFixed(3)), Number(camera3d.position.z.toFixed(3))],
            target: [Number(orbit.target.x.toFixed(3)), Number(orbit.target.y.toFixed(3)), Number(orbit.target.z.toFixed(3))],
            fov: camera3d.fov,
            preset: preset
        },
        targetMode: preset === 'topdown' ? 'dollhouse' : 'photoreal',
        engine: 'sdxl_controlnet',
        prompt: `masterpiece, architectural interior photograph, modern Japanese custom home${floorPhrase}, pristine white diatomaceous earth plaster walls, clear wooden interior doors and windows, bright natural daylight, ultra realistic, 8k`
    };

    const saved = await persistSmileStudioHandoff(handoffPayload);
    if (!saved.ok) {
        if (typeof showToast === 'function') showToast(saved.error, true);
        else alert(saved.error);
        return;
    }

    if (typeof showToast === 'function') {
        showToast('🎨 カラー素図＋深度マップをパース工房へ引き継ぎます...');
    }
    syncPlanToCommunityLibrary(cap.colorDataUrl);
    setTimeout(() => {
        window.location.href = `/smilestudio.html?source=madori_handoff&v=${Date.now()}`;
    }, 250);
}

window.capture3DColorAndDepth = capture3DColorAndDepth;
window.captureRegionMaskDataUrl = captureRegionMaskDataUrl;
window.persistSmileStudioHandoff = persistSmileStudioHandoff;

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
