/**
 * 住ま居る 3D間取り工房
 * 3D建築モデルレンダラー (Three.js 3D Architectural Engine)
 * 壁4種（通常壁・たれ壁・腰壁・上り框）・開口部くり抜き・空間6種・階段（ボックス/オープン/手すり）・3D直方体・鳥瞰図ミニプレビュー連動
 */
(function () {
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
            } catch (_) { }
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
            try { canvas3d.setPointerCapture(e.pointerId); } catch (_) { }
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

    /**
     * 1階・2階などの外壁・通常壁を開口部くり抜き付きで立体化する。
     * - wallBottomY: 壁メッシュの下端Y座標（スラブ側面も覆う場合は baseY、通常は floorTopY）
     * - wallHeight: 壁メッシュの総高さ（壁下端 wallBottomY から壁上端までの高さ）
     * - floorTopY: その階の床仕上げ天端Y座標（サッシ・ドアの sillMm 基準高さ）
     */
    function buildWallWithOpeningCutouts3D(orient, fixedCoordP, startP, endP, wallBottomY, wallHeight, wallThick, floorOpenings, scaleP, matWall, floorTopY = null) {
        const refFloorTopY = (floorTopY !== null && floorTopY !== undefined) ? floorTopY : wallBottomY;
        const slabOffset = Math.max(0, refFloorTopY - wallBottomY);
        const wallTopY = wallBottomY + wallHeight;

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
                const m = addWhiteModelMesh(geo, matWall, midM, yBottom + hSeg / 2, fixedM, true);
                if (m) m.userData.regionTag = 'wall';
            } else {
                const geo = new THREE.BoxGeometry(wallThick, hSeg, lenM + wallThick);
                const m = addWhiteModelMesh(geo, matWall, fixedM, yBottom + hSeg / 2, midM, true);
                if (m) m.userData.regionTag = 'wall';
            }
        };

        relevantOps.forEach(op => {
            const opCenter = orient === 'h' ? op.x : op.y;
            const wP = op.widthP || 1.0;
            const opStart = Math.max(startP, opCenter - wP / 2);
            const opEnd = Math.min(endP, opCenter + wP / 2);

            if (opStart > cursorP) {
                addSolidSegment(cursorP, opStart, wallBottomY, wallHeight);
            }

            const sillM = (op.sillMm || 0) / 1000;
            const hM = (op.heightMm || 2000) / 1000;
            // 窓・建具ともに床仕上げ天端（refFloorTopY + sillM）から高さ hM を正確にくり抜く
            const cutBottomY = refFloorTopY + sillM;
            const cutTopY = refFloorTopY + sillM + hM;

            // 開口下部の壁（床スラブ側面＋窓台下の腰壁）
            const lowerH = Math.min(wallHeight, Math.max(0, cutBottomY - wallBottomY));
            if (lowerH > 0.02) {
                addSolidSegment(opStart, opEnd, wallBottomY, lowerH);
            }

            // 開口上部の下がり壁（マグサ上〜壁上端まで）
            if (wallTopY > cutTopY + 0.02) {
                addSolidSegment(opStart, opEnd, cutTopY, wallTopY - cutTopY);
            }

            cursorP = opEnd;
        });

        if (cursorP < endP) {
            addSolidSegment(cursorP, endP, wallBottomY, wallHeight);
        }
    }

    /**
     * 2D矩形 baseRect ({x, y, w, h}) から複数の cutouts ([{x, y, w, h}, ...]) をくり抜いた残りの矩形リストを返す
     * - 2階以上の大部屋（ホール・廊下・LDK等）の床スラブから、階段室(STAIR)・吹抜(VOID)・複写階段の開口範囲を完全に「床なし」にくり抜くために使用
     */
    function subtractCutoutsFromRect3D(baseRect, cutouts) {
        let rects = [{ x: baseRect.x, y: baseRect.y, w: baseRect.w, h: baseRect.h }];
        const eps = 0.01;
        (cutouts || []).forEach(cut => {
            if (!cut || cut.w <= eps || cut.h <= eps) return;
            const cx0 = cut.x, cy0 = cut.y, cx1 = cut.x + cut.w, cy1 = cut.y + cut.h;
            const nextRects = [];
            rects.forEach(r => {
                const rx0 = r.x, ry0 = r.y, rx1 = r.x + r.w, ry1 = r.y + r.h;
                const ix0 = Math.max(rx0, cx0);
                const iy0 = Math.max(ry0, cy0);
                const ix1 = Math.min(rx1, cx1);
                const iy1 = Math.min(ry1, cy1);
                if (ix1 - ix0 <= eps || iy1 - iy0 <= eps) {
                    nextRects.push(r);
                    return;
                }
                // 上側 (北側) の残り
                if (iy0 - ry0 > eps) {
                    nextRects.push({ x: rx0, y: ry0, w: rx1 - rx0, h: iy0 - ry0 });
                }
                // 下側 (南側) の残り
                if (ry1 - iy1 > eps) {
                    nextRects.push({ x: rx0, y: iy1, w: rx1 - rx0, h: ry1 - iy1 });
                }
                // 左側 (西側) の残り
                if (ix0 - rx0 > eps) {
                    nextRects.push({ x: rx0, y: iy0, w: ix0 - rx0, h: iy1 - iy0 });
                }
                // 右側 (東側) の残り
                if (rx1 - ix1 > eps) {
                    nextRects.push({ x: ix1, y: iy0, w: rx1 - ix1, h: iy1 - iy0 });
                }
            });
            rects = nextRects;
        });
        return rects;
    }

    /**
     * 2階以上（flNum >= 2）において、床スラブを「なし（開口）」にする矩形領域リストを算出する
     * 1) 吹抜(VOID)・中庭(NAKANIWA)・階段室(STAIR)として定義された部屋の範囲
     * 2) 階段（下の階から複写された階段を含む）の範囲のうち、1〜2段目などの上に床貼り小部屋（収納・クローゼット等）が被さっていない階段開口範囲
     */
    function computeFloorVoidCutouts3D(flNum, flData) {
        if (flNum < 2 || !flData) return [];
        const cutouts = [];
        const rooms = Array.isArray(flData.rooms) ? flData.rooms : [];
        const stairs = Array.isArray(flData.stairs) ? flData.stairs : [];

        const isStairOrVoidRoom = (rm) => {
            if (!rm) return false;
            const rType = String(rm.type || '').toUpperCase();
            if (rType === 'VOID' || rType === 'NAKANIWA' || rType === 'STAIR') return true;
            const rName = String(rm.customName || rm.name || '');
            return /階段|吹抜|吹き抜け|中庭/.test(rName);
        };

        // 1. 明示的な階段室・吹き抜け・中庭の範囲を追加
        rooms.forEach(rm => {
            if (isStairOrVoidRoom(rm) && rm.w > 0.05 && rm.h > 0.05) {
                cutouts.push({ x: rm.x, y: rm.y, w: rm.w, h: rm.h });
            }
        });

        // 2. 階段（複写階段含む）の範囲を追加（ただし1〜2段目等の上に貼られた収納等の床貼り小部屋の範囲は床を残すため除外）
        stairs.forEach(st => {
            if (!st) return;
            const sx = (st.x !== undefined && !isNaN(st.x)) ? st.x : 0;
            const sy = (st.y !== undefined && !isNaN(st.y)) ? st.y : 0;
            const sw = (st.w !== undefined && !isNaN(st.w)) ? st.w : 1;
            const sh = (st.h !== undefined && !isNaN(st.h)) ? st.h : 2;
            if (sw <= 0.05 || sh <= 0.05) return;

            // この階段と重なる「明示的な階段室(STAIR)」が既にあるか確認
            const matchingStairRooms = rooms.filter(r => {
                if (!isStairOrVoidRoom(r)) return false;
                const ox = Math.max(0, Math.min(sx + sw, r.x + r.w) - Math.max(sx, r.x));
                const oy = Math.max(0, Math.min(sy + sh, r.y + r.h) - Math.max(sy, r.y));
                return (ox * oy) > 0.02;
            });

            // 1〜2段目などの上に貼られた床貼り小部屋（収納・クローゼット等）を取得
            let maskingRooms = [];
            if (typeof window.getRoomsMaskingUpperStair === 'function') {
                // 親の大部屋（階段全体を85%以上覆うホールやLDK等）は階段開口を塞がないよう除外し、部分的に床を貼った部屋のみを床維持対象にする
                const stairArea = sw * sh;
                maskingRooms = window.getRoomsMaskingUpperStair(flData, st).filter(mr => {
                    const ox = Math.max(0, Math.min(sx + sw, mr.x + mr.w) - Math.max(sx, mr.x));
                    const oy = Math.max(0, Math.min(sy + sh, mr.y + mr.h) - Math.max(sy, mr.y));
                    return (ox * oy) < stairArea * 0.85;
                });
            }

            if (matchingStairRooms.length > 0) {
                // 階段室の範囲が設定されている場合、さらに階段本体範囲のうち床貼り小部屋以外の部分も開口保証
                const openStairParts = subtractCutoutsFromRect3D({ x: sx, y: sy, w: sw, h: sh }, maskingRooms);
                openStairParts.forEach(p => cutouts.push(p));
            } else {
                // 階段室が未作成で階段だけが複写されている場合も、床貼り小部屋以外の階段範囲はすべて床なし（開口）にする
                const openStairParts = subtractCutoutsFromRect3D({ x: sx, y: sy, w: sw, h: sh }, maskingRooms);
                openStairParts.forEach(p => cutouts.push(p));
            }
        });

        return cutouts;
    }

    /**
     * 2階以上（flNum >= 2）のバルコニー腰壁について、下の階（flNum - 1）からキャンチ（跳ね出し・オーバーハング）しているかを判定する
     */
    function isBalconyCantileverWall3D(flNum, flData, orient, fixedP, startP, endP) {
        if (flNum < 2 || !flData) return false;
        const rooms = Array.isArray(flData.rooms) ? flData.rooms : [];
        const midP = (startP + endP) / 2;
        const wx = orient === 'h' ? midP : fixedP;
        const wy = orient === 'h' ? fixedP : midP;

        // 1. この壁がバルコニー部屋の外周または近傍（0.35P以内）にあるか判定
        const balconyRooms = rooms.filter(r => {
            if (!r) return false;
            const rType = String(r.type || '').toUpperCase();
            const rName = String(r.customName || r.name || '');
            return rType === 'BALCONY' || /バルコニー|ベランダ/.test(rName);
        });

        let touchesBalcony = false;
        for (const br of balconyRooms) {
            const tol = 0.35;
            if (wx >= br.x - tol && wx <= br.x + br.w + tol && wy >= br.y - tol && wy <= br.y + br.h + tol) {
                touchesBalcony = true;
                break;
            }
        }

        // 2. 下の階（flNum - 1）の内部または外壁直上に乗っているか判定
        const lowerFl = (typeof state !== 'undefined' && state.floors) ? state.floors[flNum - 1] : null;
        const lowerRooms = (lowerFl && Array.isArray(lowerFl.rooms))
            ? lowerFl.rooms.filter(r => r && r.type !== 'VOID' && r.type !== 'NAKANIWA' && r.type !== 'TENJO')
            : [];
        const lowerWalls = (lowerFl && Array.isArray(lowerFl.walls))
            ? lowerFl.walls.filter(w => !w.wallType || w.wallType === 'wall')
            : [];

        // 下の階の同じ座標ラインに通常壁（外壁/耐力壁）がある場合はキャンチではない（下の壁が支えている）
        const supportedByLowerWall = lowerWalls.some(lw => {
            const lHoriz = Math.abs(lw.y1 - lw.y2) < 0.05;
            const lVert = Math.abs(lw.x1 - lw.x2) < 0.05;
            if (orient === 'h' && lHoriz && Math.abs(lw.y1 - fixedP) < 0.15) {
                const lMin = Math.min(lw.x1, lw.x2) - 0.15;
                const lMax = Math.max(lw.x1, lw.x2) + 0.15;
                return midP >= lMin && midP <= lMax;
            }
            if (orient === 'v' && lVert && Math.abs(lw.x1 - fixedP) < 0.15) {
                const lMin = Math.min(lw.y1, lw.y2) - 0.15;
                const lMax = Math.max(lw.y1, lw.y2) + 0.15;
                return midP >= lMin && midP <= lMax;
            }
            return false;
        });
        if (supportedByLowerWall) return false;

        // 下の階の部屋領域の完全に内部（境界から0.12P以上内側）にある腰壁（インナーバルコニー部分や室内吹抜手すり等）はキャンチではない
        const strictlyInsideLowerRoom = lowerRooms.some(lr =>
            wx > lr.x + 0.12 && wx < lr.x + lr.w - 0.12 &&
            wy > lr.y + 0.12 && wy < lr.y + lr.h - 0.12
        );
        if (strictlyInsideLowerRoom) return false;

        // バルコニーに接していてかつ直下が下の階の部屋に支えられていない外周跳ね出し区間、または建物外へ跳ね出した外周腰壁ならキャンチと判定
        const supportedByAnyLowerRoom = lowerRooms.some(lr =>
            wx >= lr.x - 0.10 && wx <= lr.x + lr.w + 0.10 &&
            wy >= lr.y - 0.10 && wy <= lr.y + lr.h + 0.10
        );
        if (touchesBalcony && !supportedByAnyLowerRoom) return true;
        return !supportedByAnyLowerRoom;
    }

    /**
     * 1階外周の基礎（コンクリート立ち上がり）および土台水切り（水切り板金）を3D生成する
     */
    function buildFoundationAndMizukiri3D(fl1Data, scaleP, wallThick, slabHeight) {
        if (!fl1Data) return;
        const foundHMm = (typeof state !== 'undefined' && state.foundationHeightMm !== undefined) ? Number(state.foundationHeightMm) : 400;
        const foundH = Math.max(0, foundHMm / 1000);
        const showMizukiri = (typeof state !== 'undefined' && state.showMizukiri3D !== undefined) ? !!state.showMizukiri3D : true;
        const mizukiriHex = (typeof state !== 'undefined' && state.mizukiriColor) ? state.mizukiriColor : '#334155';

        // 地面とグリッドをGL（基礎下端 Y = -foundH）へ同期
        if (window.groundMesh3d) {
            window.groundMesh3d.position.y = -foundH - 0.02;
        }
        if (window.gridHelper3d) {
            window.gridHelper3d.position.y = -foundH - 0.005;
        }

        if (foundH <= 0.005 && !showMizukiri) return;

        const matFoundation = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
        const matMizukiri = new THREE.MeshLambertMaterial({ color: new THREE.Color(mizukiriHex) });

        const foundThick = wallThick + 0.02; // 基礎幅 160mm (壁厚140mm + 20mm)
        const mizuHeight = 0.036;            // 水切り板金高さ 36mm
        const mizuThick = wallThick + 0.038; // 外壁面から外へ約19mm張り出す水切りプロファイル

        // 1. 各部屋スラブ下のベタ基礎・立ち上がりベース（部屋がある場合）
        if (foundH > 0.005 && Array.isArray(fl1Data.rooms) && fl1Data.rooms.length > 0) {
            fl1Data.rooms.forEach(rm => {
                if (!rm || rm.type === 'VOID' || rm.type === 'NAKANIWA' || rm.type === 'TENJO') return;
                const wM = rm.w * scaleP;
                const hM = rm.h * scaleP;
                const cx = (rm.x + rm.w / 2) * scaleP;
                const cz = (rm.y + rm.h / 2) * scaleP;
                const fGeo = new THREE.BoxGeometry(wM + wallThick * 0.9, foundH, hM + wallThick * 0.9);
                const fMesh = addWhiteModelMesh(fGeo, matFoundation, cx, -foundH / 2, cz, true);
                if (fMesh) fMesh.userData.regionTag = 'foundation';
            });
        }

        // 2. 1階の通常壁セグメント（または壁がない場合は部屋外周）から外周壁を特定して基礎立ち上がり＆土台水切りを生成
        const wallSegments = [];
        const normalWalls = (fl1Data.walls || []).filter(w => !w.wallType || w.wallType === 'wall');

        if (normalWalls.length > 0) {
            normalWalls.forEach(wl => {
                const isHoriz = Math.abs(wl.y1 - wl.y2) < 0.05;
                const isVert = Math.abs(wl.x1 - wl.x2) < 0.05;
                if (isHoriz || isVert) {
                    const startP = isHoriz ? Math.min(wl.x1, wl.x2) : Math.min(wl.y1, wl.y2);
                    const endP = isHoriz ? Math.max(wl.x1, wl.x2) : Math.max(wl.y1, wl.y2);
                    const fixedP = isHoriz ? wl.y1 : wl.x1;
                    if (endP - startP > 0.05) {
                        wallSegments.push({ orient: isHoriz ? 'h' : 'v', fixedP, startP, endP });
                    }
                }
            });
        } else if (Array.isArray(fl1Data.rooms) && fl1Data.rooms.length > 0) {
            fl1Data.rooms.forEach(rm => {
                if (!rm || rm.type === 'VOID' || rm.type === 'NAKANIWA' || rm.type === 'TENJO') return;
                wallSegments.push(
                    { orient: 'h', fixedP: rm.y, startP: rm.x, endP: rm.x + rm.w },
                    { orient: 'h', fixedP: rm.y + rm.h, startP: rm.x, endP: rm.x + rm.w },
                    { orient: 'v', fixedP: rm.x, startP: rm.y, endP: rm.y + rm.h },
                    { orient: 'v', fixedP: rm.x + rm.w, startP: rm.y, endP: rm.y + rm.h }
                );
            });
        }

        // 外壁判定ヘルパー：その壁セグメントの片側だけに部屋（または建物範囲端）があるか判定
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        wallSegments.forEach(s => {
            if (s.orient === 'h') {
                minX = Math.min(minX, s.startP); maxX = Math.max(maxX, s.endP);
                minY = Math.min(minY, s.fixedP); maxY = Math.max(maxY, s.fixedP);
            } else {
                minY = Math.min(minY, s.startP); maxY = Math.max(maxY, s.endP);
                minX = Math.min(minX, s.fixedP); maxX = Math.max(maxX, s.fixedP);
            }
        });

        const isExteriorWallSeg = (seg) => {
            const rooms = (fl1Data.rooms || []).filter(r => r && r.type !== 'VOID' && r.type !== 'NAKANIWA' && r.type !== 'TENJO');
            if (rooms.length >= 1) {
                const mid = (seg.startP + seg.endP) / 2;
                const probeOffset = 0.25;
                const pA = seg.orient === 'h' ? { x: mid, y: seg.fixedP - probeOffset } : { x: seg.fixedP - probeOffset, y: mid };
                const pB = seg.orient === 'h' ? { x: mid, y: seg.fixedP + probeOffset } : { x: seg.fixedP + probeOffset, y: mid };
                const inRoom = (pt) => rooms.some(r => pt.x >= r.x - 0.05 && pt.x <= r.x + r.w + 0.05 && pt.y >= r.y - 0.05 && pt.y <= r.y + r.h + 0.05);
                const hasA = inRoom(pA);
                const hasB = inRoom(pB);
                if (hasA !== hasB) return true;
                if (hasA && hasB) return false;
            }
            // 部屋が未定義（壁のみ作図中）の場合は外周バウンディングボックス上の壁を外壁とみなす
            if (seg.orient === 'h') {
                return Math.abs(seg.fixedP - minY) < 0.15 || Math.abs(seg.fixedP - maxY) < 0.15;
            } else {
                return Math.abs(seg.fixedP - minX) < 0.15 || Math.abs(seg.fixedP - maxX) < 0.15;
            }
        };

        wallSegments.forEach(seg => {
            const isExt = isExteriorWallSeg(seg);
            const lenM = (seg.endP - seg.startP) * scaleP;
            const midM = ((seg.startP + seg.endP) / 2) * scaleP;
            const fixedM = seg.fixedP * scaleP;

            // 布基礎立ち上がり（外壁および主要壁下）
            if (foundH > 0.005 && (isExt || !(fl1Data.rooms && fl1Data.rooms.length > 0))) {
                const fGeo = seg.orient === 'h'
                    ? new THREE.BoxGeometry(lenM + foundThick, foundH, foundThick)
                    : new THREE.BoxGeometry(foundThick, foundH, lenM + foundThick);
                const fMesh = addWhiteModelMesh(
                    fGeo,
                    matFoundation,
                    seg.orient === 'h' ? midM : fixedM,
                    -foundH / 2,
                    seg.orient === 'h' ? fixedM : midM,
                    true
                );
                if (fMesh) fMesh.userData.regionTag = 'foundation';
            }

            // 土台水切り板金（外壁の下端 Y = 0.0m に連続配置）
            if (showMizukiri && isExt) {
                const mGeo = seg.orient === 'h'
                    ? new THREE.BoxGeometry(lenM + mizuThick, mizuHeight, mizuThick)
                    : new THREE.BoxGeometry(mizuThick, mizuHeight, lenM + mizuThick);
                const mMesh = addWhiteModelMesh(
                    mGeo,
                    matMizukiri,
                    seg.orient === 'h' ? midM : fixedM,
                    mizuHeight * 0.35,
                    seg.orient === 'h' ? fixedM : midM,
                    false
                );
                if (mMesh) mMesh.userData.regionTag = 'mizukiri';
            }
        });
    }

    function updateFoundationHeight3D(heightMm) {
        const val = Math.max(0, Math.min(1200, parseInt(heightMm, 10) || 0));
        state.foundationHeightMm = val;
        syncFoundationAndMizukiriUI();
        if (typeof saveHistorySnapshot === 'function') saveHistorySnapshot();
        rebuild3DScene();
        if (typeof showToast === 'function') {
            showToast(val > 0 ? `🧱 3D基礎高さを GL+${val}mm に設定しました` : '🧱 3D基礎表示を OFF (0mm) にしました');
        }
    }
    window.updateFoundationHeight3D = updateFoundationHeight3D;

    function toggleMizukiri3D(forceVal) {
        state.showMizukiri3D = (forceVal !== undefined) ? !!forceVal : !state.showMizukiri3D;
        syncFoundationAndMizukiriUI();
        if (typeof saveHistorySnapshot === 'function') saveHistorySnapshot();
        rebuild3DScene();
        if (typeof showToast === 'function') {
            showToast(state.showMizukiri3D ? '📏 土台水切り（水切り板金）を3D表示しました' : '📏 土台水切りを非表示にしました');
        }
    }
    window.toggleMizukiri3D = toggleMizukiri3D;

    function updateMizukiriColor3D(hexColor) {
        if (!hexColor) return;
        state.mizukiriColor = hexColor;
        state.showMizukiri3D = true;
        syncFoundationAndMizukiriUI();
        if (typeof saveHistorySnapshot === 'function') saveHistorySnapshot();
        rebuild3DScene();
        if (typeof showToast === 'function') {
            showToast('🎨 土台水切りのカラーを変更しました');
        }
    }
    window.updateMizukiriColor3D = updateMizukiriColor3D;

    function syncFoundationAndMizukiriUI() {
        const selFound = document.getElementById('selFoundationHeight3D');
        if (selFound && state.foundationHeightMm !== undefined) {
            selFound.value = String(state.foundationHeightMm);
        }
        const btnMizu = document.getElementById('btnMizukiriToggle3D');
        if (btnMizu) {
            const isOn = state.showMizukiri3D !== false;
            btnMizu.className = isOn
                ? 'px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-600 text-white border border-emerald-400 shadow transition'
                : 'px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-slate-400 border border-zinc-700 hover:text-white transition';
            btnMizu.textContent = isOn ? '水切り: ON' : '水切り: OFF';
        }
        const selColor = document.getElementById('selMizukiriColor3D');
        if (selColor && state.mizukiriColor) {
            selColor.value = state.mizukiriColor;
        }
    }
    window.syncFoundationAndMizukiriUI = syncFoundationAndMizukiriUI;

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

            const floorVoidCutouts = computeFloorVoidCutouts3D(flNum, flData);

            // 1. 空間要素・床スラブ（通常居室、玄関土間、小上り、畳、吹き抜け、中庭、天井、2階以上の階段室・階段範囲の床なし開口）
            flData.rooms.forEach(rm => {
                const rTypeUpper = String(rm.type || '').toUpperCase();
                const rmLabelStr = String(rm.customName || rm.name || rm.label || '');
                const isExplicitStairOrVoid = rTypeUpper === 'VOID' || rTypeUpper === 'NAKANIWA'
                    || (flNum >= 2 && (rTypeUpper === 'STAIR' || /階段|吹抜|吹き抜け|中庭/.test(rmLabelStr)));
                // 吹き抜け・中庭・および2階以上の「階段室(STAIR)」は床スラブを「なし」にして下階階段の昇降空間を開口する
                if (isExplicitStairOrVoid) return;

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
                    sMat = /畳|tatami|和室/i.test(rmLabelStr) ? matTatamiSlab : matKoagariSlab;
                    sHeight = slabHeight + 0.30; // +30cm 小上り段差
                    sCenterY = baseY + sHeight / 2;
                } else if (rm.type === 'TATAMI' || rm.type === 'WASHITSU' || /和室|畳|tatami/i.test(rmLabelStr)) {
                    sMat = matTatamiSlab;
                }

                // 2階以上の部屋スラブは、階段室・吹抜・複写階段の開口範囲（floorVoidCutouts）をくり抜いてから生成する
                let slabPieces = [{ x: rm.x, y: rm.y, w: rm.w, h: rm.h }];
                if (flNum >= 2 && floorVoidCutouts.length > 0) {
                    const roomArea = Math.max(0.01, rm.w * rm.h);
                    // ただし階段の1〜2段目などの上に意図的に貼った小部屋（収納・クローゼット等で、階段開口より小さいか部分的に重なる床貼り小部屋）は床を残す
                    const applicableCutouts = floorVoidCutouts.filter(cut => {
                        const ox = Math.max(0, Math.min(rm.x + rm.w, cut.x + cut.w) - Math.max(rm.x, cut.x));
                        const oy = Math.max(0, Math.min(rm.y + rm.h, cut.y + cut.h) - Math.max(rm.y, cut.y));
                        if (ox * oy <= 0.01) return false;
                        // すでに computeFloorVoidCutouts3D で1〜2段目の床貼り小部屋は開口から除外済みなので、そのまま適用して階段範囲の床をくり抜く
                        return true;
                    });
                    slabPieces = subtractCutoutsFromRect3D({ x: rm.x, y: rm.y, w: rm.w, h: rm.h }, applicableCutouts);
                }

                slabPieces.forEach(piece => {
                    const pwM = piece.w * scaleP;
                    const phM = piece.h * scaleP;
                    if (pwM <= 0.02 || phM <= 0.02) return;
                    const pcx = (piece.x + piece.w / 2) * scaleP;
                    const pcz = (piece.y + piece.h / 2) * scaleP;
                    const slabGeo = new THREE.BoxGeometry(pwM, sHeight, phM);
                    const slabMesh = addWhiteModelMesh(slabGeo, sMat, pcx, sCenterY, pcz, true);
                    if (slabMesh) {
                        slabMesh.userData.regionTag = (sMat === matTatamiSlab) ? 'tatami' : 'floor_slab';
                    }
                });

                // バルコニー部屋で下の階からキャンチ（跳ね出し）している範囲のみ、床下400mm位置の軒天・底面スラブも白壁色で生成
                const isBalcony = rm.type === 'BALCONY' || /バルコニー|ベランダ/.test(rmLabelStr);
                if (isBalcony && flNum >= 2) {
                    const lowerFl = (typeof state !== 'undefined' && state.floors) ? state.floors[flNum - 1] : null;
                    const lowerRooms = (lowerFl && Array.isArray(lowerFl.rooms))
                        ? lowerFl.rooms.filter(r => r && r.type !== 'VOID' && r.type !== 'NAKANIWA' && r.type !== 'TENJO')
                        : [];
                    const cantileverPieces = subtractCutoutsFromRect3D({ x: rm.x, y: rm.y, w: rm.w, h: rm.h }, lowerRooms);
                    cantileverPieces.forEach(cp => {
                        const cpWM = cp.w * scaleP;
                        const cpHM = cp.h * scaleP;
                        if (cpWM <= 0.05 || cpHM <= 0.05) return;
                        const cpCx = (cp.x + cp.w / 2) * scaleP;
                        const cpCz = (cp.y + cp.h / 2) * scaleP;
                        const soffitGeo = new THREE.BoxGeometry(cpWM + wallThick, 0.06, cpHM + wallThick);
                        const soffitMesh = addWhiteModelMesh(soffitGeo, matWhiteWall, cpCx, baseY + slabHeight - 0.40 + 0.03, cpCz, true);
                        if (soffitMesh) soffitMesh.userData.regionTag = 'balcony_cantilever_soffit';
                    });
                }

                const rt = (window.ROOM_TYPES && window.ROOM_TYPES[rm.type]) || { hasWall: true };
                const hasNormalWallsOnFloor = (flData.walls || []).some(w => !w.wallType || w.wallType === 'wall');
                if (!rm.isAutoDetected && rt.hasWall && (!hasNormalWallsOnFloor || isBalcony)) {
                    if (isBalcony) {
                        // バルコニー部屋の手すり壁：他にその辺に壁（koshikabe/wall）が引かれていない辺のみ自動生成し、キャンチ辺は下に400mm伸ばす
                        const balEdges = [
                            { orient: 'h', fixedP: rm.y, sP: rm.x, eP: rm.x + rm.w },
                            { orient: 'h', fixedP: rm.y + rm.h, sP: rm.x, eP: rm.x + rm.w },
                            { orient: 'v', fixedP: rm.x, sP: rm.y, eP: rm.y + rm.h },
                            { orient: 'v', fixedP: rm.x + rm.w, sP: rm.y, eP: rm.y + rm.h }
                        ];
                        balEdges.forEach(ed => {
                            const hasExplicitWallOnEdge = (flData.walls || []).some(w => {
                                const wH = Math.abs(w.y1 - w.y2) < 0.05;
                                const wV = Math.abs(w.x1 - w.x2) < 0.05;
                                if (ed.orient === 'h' && wH && Math.abs(w.y1 - ed.fixedP) < 0.12) {
                                    return Math.max(ed.sP, Math.min(w.x1, w.x2)) < Math.min(ed.eP, Math.max(w.x1, w.x2)) - 0.05;
                                }
                                if (ed.orient === 'v' && wV && Math.abs(w.x1 - ed.fixedP) < 0.12) {
                                    return Math.max(ed.sP, Math.min(w.y1, w.y2)) < Math.min(ed.eP, Math.max(w.y1, w.y2)) - 0.05;
                                }
                                return false;
                            });
                            if (hasExplicitWallOnEdge) return;
                            const isCant = isBalconyCantileverWall3D(flNum, flData, ed.orient, ed.fixedP, ed.sP, ed.eP);
                            const dropDown = isCant ? 0.40 : 0.0;
                            const wY = baseY + slabHeight - dropDown;
                            const hWall = 1.10 + dropDown;
                            buildWallWithOpeningCutouts3D(ed.orient, ed.fixedP, ed.sP, ed.eP, wY, hWall, wallThick, flData.openings, scaleP, matWhiteWall, baseY + slabHeight);
                        });
                    } else if (!hasNormalWallsOnFloor) {
                        const wY = baseY;
                        const hWall = wallHeight + slabHeight;
                        buildWallWithOpeningCutouts3D('h', rm.y, rm.x, rm.x + rm.w, wY, hWall, wallThick, flData.openings, scaleP, matWhiteWall, baseY + slabHeight);
                        buildWallWithOpeningCutouts3D('h', rm.y + rm.h, rm.x, rm.x + rm.w, wY, hWall, wallThick, flData.openings, scaleP, matWhiteWall, baseY + slabHeight);
                        buildWallWithOpeningCutouts3D('v', rm.x, rm.y, rm.y + rm.h, wY, hWall, wallThick, flData.openings, scaleP, matWhiteWall, baseY + slabHeight);
                        buildWallWithOpeningCutouts3D('v', rm.x + rm.w, rm.y, rm.y + rm.h, wY, hWall, wallThick, flData.openings, scaleP, matWhiteWall, baseY + slabHeight);
                    }
                }
            });

            // 2. 壁4種（通常壁 / たれ壁 / 腰壁 / 上り框 ＆ 斜め壁対応 ＆ 高さ指定連動 ＆ 1F-2Fシームレス連結）
            flData.walls.forEach(wl => {
                const isHoriz = Math.abs(wl.y1 - wl.y2) < 0.05;
                const isVert = Math.abs(wl.x1 - wl.x2) < 0.05;
                const wType = wl.wallType || 'wall';
                const floorTopY = baseY + slabHeight;

                // 高さ指定（ミリメートル指定があればそれを最優先）
                const waistH = wl.heightMm ? (wl.heightMm / 1000) : 1.00;
                const dropH = wl.heightMm ? (wl.heightMm / 1000) : 0.55;
                const actualWallH = wl.heightMm ? (wl.heightMm / 1000) : wallHeight;
                // 通常壁はスラブ下端(baseY)から立ち上げてスラブ側面(slabHeight)も覆い、1F壁上端(2.63m)と2F壁下端(2.63m)を隙間ゼロでシームレスに連結する
                const seamlessWallBottomY = baseY;
                const seamlessWallTotalH = actualWallH + slabHeight;

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
                        // 腰壁: 床から立ち上がる手すり壁（2階以上でバルコニーのキャンチ箇所にある腰壁は下に400mm伸ばす）
                        const isCantilever = isBalconyCantileverWall3D(flNum, flData, isHoriz ? 'h' : 'v', fixedP, startP, endP);
                        const cantDropM = isCantilever ? 0.40 : 0.0;
                        const totalWaistH = waistH + cantDropM;
                        const waistBottomY = floorTopY - cantDropM;
                        const lenM = lenP * scaleP;
                        const midM = ((startP + endP) / 2) * scaleP;
                        const fixedM = fixedP * scaleP;
                        const geo = isHoriz
                            ? new THREE.BoxGeometry(lenM + wallThick, totalWaistH, wallThick)
                            : new THREE.BoxGeometry(wallThick, totalWaistH, lenM + wallThick);
                        const kMesh = addWhiteModelMesh(
                            geo, matWhiteWall,
                            isHoriz ? midM : fixedM,
                            waistBottomY + totalWaistH / 2,
                            isHoriz ? fixedM : midM,
                            true
                        );
                        if (kMesh) {
                            kMesh.userData.regionTag = isCantilever ? 'koshikabe_cantilever' : 'koshikabe';
                        }
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
                        // 通常壁（開口部くり抜き付き・床スラブ側面カバー＆上下階シームレス連結）
                        buildWallWithOpeningCutouts3D(
                            isHoriz ? 'h' : 'v',
                            fixedP, startP, endP,
                            seamlessWallBottomY, seamlessWallTotalH, wallThick,
                            flData.openings, scaleP, matWhiteWall,
                            floorTopY
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
                    let wH = seamlessWallTotalH;
                    let wPosY = seamlessWallBottomY + wH / 2;
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

            // 4. サッシ・建具12種の3D立体フレーム＆種類別ディテール（SD ControlNet Canny/Depth での建具識別精度向上）
            const matSashFrame = new THREE.MeshLambertMaterial({ color: 0x334155 });
            const matDoorFrameWood = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
            const matDoorHandle = new THREE.MeshLambertMaterial({ color: 0xd97706 });

            const buildOpening3DMesh = (op) => {
                // 「開口のみ(扉なし: kaikou)」は壁のくり抜きのみで建具パネルを生成しない（階段室登りきりやウォークスルー開口用）
                const fit = op.doorFit || op.sashType || (op.type === 'SWING_DOOR' ? 'katahiraki' : 'hikichigai');
                if (fit === 'kaikou') return;

                const ot = (window.OPENING_TYPES && window.OPENING_TYPES[op.type]) ? window.OPENING_TYPES[op.type] : { widthP: 1.0, heightMm: 2000, isWin: false };
                const wM = Math.max(0.30, (op.widthP || ot.widthP) * scaleP);
                const hM = Math.max(0.30, (op.heightMm || ot.heightMm) / 1000);
                const sillM = (op.sillMm !== undefined ? op.sillMm : 0) / 1000;
                const isWin = op.isWin !== undefined ? op.isWin : (op.category === 'window' || ot.isWin);
                const isGenkan = fit === 'oyako' || fit === 'genkan_slide' || op.type === 'ENTRANCE_DOOR';
                const panelMat = isWin ? matGlass : (isGenkan ? matGenkan : matDoorPanel);
                const frameMat = isWin ? matSashFrame : (isGenkan ? matGenkan : matDoorFrameWood);
                const dir = op.flip ? -1 : 1;
                const regionTag = isWin ? `window_${fit}` : `door_${fit}`;

                const opGroup = new THREE.Group();
                opGroup.position.set(op.x * scaleP, baseY + slabHeight + sillM + hM / 2, op.y * scaleP);
                if (op.orient === 'v') {
                    opGroup.rotation.y = -Math.PI / 2;
                }
                opGroup.userData.openingId = op.id;
                opGroup.userData.doorFit = fit;
                opGroup.userData.regionTag = regionTag;

                const addOpPart = (w, h, d, mat, lx, ly, lz, rotY = 0, partName = 'part') => {
                    const geo = new THREE.BoxGeometry(Math.max(0.01, w), Math.max(0.01, h), Math.max(0.01, d));
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.position.set(lx, ly, lz);
                    if (rotY !== 0) mesh.rotation.y = rotY;
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    mesh.userData.regionTag = regionTag;
                    mesh.userData.openingFit = fit;
                    mesh.userData.partName = partName;
                    const edges = new THREE.EdgesGeometry(geo);
                    const lineMat = new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.72 });
                    mesh.add(new THREE.LineSegments(edges, lineMat));
                    opGroup.add(mesh);
                    return mesh;
                };

                const fThick = wallThick + 0.028; // 壁面から前後に14mmずつ突出する額縁・サッシ枠（Cannyエッジ鮮明化）
                const fBar = 0.042;               // 枠見付幅 42mm
                const innerW = Math.max(0.16, wM - fBar * 2);
                const innerH = Math.max(0.16, hM - fBar * 2);

                // 1. 四方外枠（上枠＝鴨居、下枠＝敷居/窓台、左右縦枠）
                addOpPart(wM, fBar, fThick, frameMat, 0, hM / 2 - fBar / 2, 0, 0, 'top_frame');
                if (isWin || isGenkan) {
                    addOpPart(wM, fBar * 0.85, fThick + 0.012, frameMat, 0, -hM / 2 + fBar * 0.42, 0, 0, 'bottom_sill');
                }
                addOpPart(fBar, hM, fThick, frameMat, -wM / 2 + fBar / 2, 0, 0, 0, 'left_jamb');
                addOpPart(fBar, hM, fThick, frameMat, wM / 2 - fBar / 2, 0, 0, 0, 'right_jamb');

                // 2. 建具・サッシ種類別の内部ディテール造形
                if (fit === 'katabiki' || fit === 'hikido' || fit === 'genkan_slide') {
                    // 【片引き戸（引き戸）】
                    // 1枚の扉リーフ（開口幅の約55%）＋残り45%は実際に通り抜け・奥の空間が見えるオープン開口＋上部鴨居スライドレール＋縦引手バー
                    // → 引違い（2枚障子＋中央召合せ縦桟）と3D・Canny・Depthのすべてで明確に区別される！
                    const leafW = innerW * 0.56;
                    const leafThick = 0.042;
                    const leafCenterX = (dir > 0)
                        ? (-innerW / 2 + leafW / 2)
                        : (innerW / 2 - leafW / 2);
                    const leafZ = 0.022 * dir;

                    // 上部引き込みガイドレール（開口全幅）
                    addOpPart(innerW, 0.032, 0.032, frameMat, 0, innerH / 2 - 0.016, leafZ, 0, 'slide_rail');

                    // 1枚の引き戸パネル本体
                    addOpPart(leafW, innerH - 0.02, leafThick, panelMat, leafCenterX, -0.01, leafZ, 0, 'katabiki_leaf');

                    // 引き戸パネルの周囲框（上下框・左右縦框で1枚扉の輪郭を強調）
                    const stileW = 0.045;
                    addOpPart( stileW, innerH - 0.02, leafThick + 0.008, frameMat, leafCenterX - leafW / 2 + stileW / 2, -0.01, leafZ, 0, 'leaf_stile_l');
                    addOpPart( stileW, innerH - 0.02, leafThick + 0.008, frameMat, leafCenterX + leafW / 2 - stileW / 2, -0.01, leafZ, 0, 'leaf_stile_r');

                    // 戸先側の縦長引手バー（前後に配置）
                    const handleX = (dir > 0)
                        ? (leafCenterX + leafW / 2 - 0.09)
                        : (leafCenterX - leafW / 2 + 0.09);
                    addOpPart(0.024, Math.min(0.24, innerH * 0.16), leafThick + 0.028, matDoorHandle, handleX, -0.05, leafZ, 0, 'slide_handle');
                } else if (fit === 'katahiraki' || fit === 'hiraki') {
                    // 【片開きドア】
                    // 1枚のフル幅ドアパネル＋約10°の微開角度（Depthでも開き戸の立体陰影が出る）＋レバーハンドル
                    const leafW = innerW * 0.98;
                    const leafThick = 0.044;
                    const swingAngle = 0.16 * dir; // 約9度微開で立体エッジを付与
                    const hingeX = -innerW / 2;
                    const halfW = leafW / 2;
                    const cx = hingeX + Math.cos(swingAngle) * halfW;
                    const cz = Math.sin(swingAngle) * halfW;
                    addOpPart(leafW, innerH * 0.99, leafThick, panelMat, cx, 0, cz, -swingAngle, 'swing_leaf');

                    // レバーハンドル（戸先側）
                    const hDist = leafW * 0.86;
                    const hx = hingeX + Math.cos(swingAngle) * hDist;
                    const hz = Math.sin(swingAngle) * hDist;
                    addOpPart(0.11, 0.032, leafThick + 0.075, matDoorHandle, hx, -0.04, hz, -swingAngle, 'lever_handle');
                } else if (fit === 'ryouhiraki') {
                    // 【両開きドア】左右2枚の開き扉＋中央召合せ目地＋左右ツインハンドル
                    const halfW = innerW * 0.49;
                    const leafThick = 0.044;
                    const swingAngle = 0.14 * dir;
                    // 左扉
                    addOpPart(halfW, innerH * 0.99, leafThick, panelMat, -innerW / 4, 0, Math.sin(swingAngle) * (halfW / 2), -swingAngle, 'double_swing_l');
                    // 右扉
                    addOpPart(halfW, innerH * 0.99, leafThick, panelMat, innerW / 4, 0, Math.sin(swingAngle) * (halfW / 2), swingAngle, 'double_swing_r');
                    // 中央ツインハンドル
                    addOpPart(0.05, 0.16, leafThick + 0.07, matDoorHandle, -0.045, -0.04, Math.sin(swingAngle) * halfW, 0, 'handle_l');
                    addOpPart(0.05, 0.16, leafThick + 0.07, matDoorHandle, 0.045, -0.04, Math.sin(swingAngle) * halfW, 0, 'handle_r');
                } else if (fit === 'oyako') {
                    // 【親子ドア】親扉(70%)＋子扉(30%)＋分割縦枠＋大型エントリーハンドル
                    const mainW = innerW * 0.69;
                    const subW = innerW * 0.29;
                    const leafThick = 0.048;
                    addOpPart(mainW, innerH * 0.99, leafThick, panelMat, -innerW / 2 + mainW / 2, 0, 0.015 * dir, 0, 'oyako_main_leaf');
                    addOpPart(subW, innerH * 0.99, leafThick, panelMat, innerW / 2 - subW / 2, 0, -0.005 * dir, 0, 'oyako_sub_leaf');
                    // 親扉と子扉の境目の縦框
                    const splitX = -innerW / 2 + mainW;
                    addOpPart(0.042, innerH, leafThick + 0.018, frameMat, splitX, 0, 0.01 * dir, 0, 'oyako_mullion');
                    // 親扉のバーハンドル
                    addOpPart(0.032, Math.min(0.42, innerH * 0.24), leafThick + 0.075, matDoorHandle, splitX - 0.09, -0.04, 0.015 * dir, 0, 'oyako_handle');
                } else if (fit === 'oredo' || fit === 'closet') {
                    // 【折れ戸 / クローゼット】くの字（V字）に手前へ折れ曲がった2枚（または4枚）の立体折れ戸パネル
                    const foldPanels = (fit === 'closet' && wM >= 1.2) ? 4 : 2;
                    const segW = innerW / foldPanels;
                    const leafThick = 0.034;
                    const foldAngle = 0.34 * dir; // 約20度のV字折れ角度で明確な凹凸を形成
                    for (let i = 0; i < foldPanels; i++) {
                        const isOdd = (i % 2 === 1);
                        const ang = isOdd ? -foldAngle : foldAngle;
                        const segCenterX = -innerW / 2 + segW * (i + 0.5);
                        const zOut = Math.abs(Math.sin(foldAngle)) * (segW * 0.45) * dir;
                        addOpPart(segW * 0.98, innerH * 0.98, leafThick, panelMat, segCenterX, 0, zOut, ang, `fold_leaf_${i}`);
                    }
                } else if (fit === 'demado') {
                    // 【出窓】外側へ320mm張り出したカウンター・屋根庇・正面＆左右ガラスサッシ
                    const bayOut = 0.32 * (-dir);
                    const bayW = wM * 0.96;
                    addOpPart(bayW, 0.045, Math.abs(bayOut) + wallThick, frameMat, 0, -hM / 2 + 0.02, bayOut / 2, 0, 'bay_counter');
                    addOpPart(bayW, 0.045, Math.abs(bayOut) + wallThick, frameMat, 0, hM / 2 - 0.02, bayOut / 2, 0, 'bay_roof');
                    addOpPart(bayW - 0.06, innerH, 0.032, matGlass, 0, 0, bayOut, 0, 'bay_front_glass');
                    addOpPart(0.038, innerH, 0.042, frameMat, 0, 0, bayOut, 0, 'bay_center_mullion');
                    addOpPart(0.032, innerH, Math.abs(bayOut), matGlass, -bayW / 2 + 0.02, 0, bayOut / 2, 0, 'bay_left_glass');
                    addOpPart(0.032, innerH, Math.abs(bayOut), matGlass, bayW / 2 - 0.02, 0, bayOut / 2, 0, 'bay_right_glass');
                } else if (fit === 'fix') {
                    // 【FIX窓】中央縦桟のない1枚大判クリアガラス
                    addOpPart(innerW, innerH, 0.028, matGlass, 0, 0, 0, 0, 'fix_glass');
                } else if (fit === 'agesage') {
                    // 【上げ下げ窓】上下2段のサッシ＋中央の水平桟（Meeting Rail）
                    const halfH = innerH * 0.52;
                    addOpPart(innerW, halfH, 0.026, matGlass, 0, innerH * 0.24, 0.015, 0, 'agesage_upper');
                    addOpPart(innerW, halfH, 0.026, matGlass, 0, -innerH * 0.24, -0.015, 0, 'agesage_lower');
                    addOpPart(innerW, 0.044, fThick * 0.85, frameMat, 0, 0, 0, 0, 'agesage_horiz_rail');
                } else if (fit === 'tatesuberi' || fit === 'yokosuberi') {
                    // 【縦滑り出し / 横滑り出し窓】少し開いたガラス障子＋サッシ枠
                    const tiltY = (fit === 'tatesuberi') ? (0.20 * dir) : 0;
                    const zOut = -0.04 * dir;
                    addOpPart(innerW * 0.96, innerH * 0.96, 0.032, matGlass, 0, 0, zOut, tiltY, 'suberi_glass');
                    addOpPart(innerW * 0.98, 0.036, 0.042, frameMat, 0, 0, zOut, tiltY, 'suberi_bar');
                } else {
                    // 【引き違い（標準サッシ窓・引き違い戸）】
                    // 奥行き方向に前後オフセットした左右2枚の障子パネル＋中央の太い召合せ縦桟（Meeting Stile）
                    const paneW = innerW * 0.52;
                    const paneThick = isWin ? 0.028 : 0.038;
                    // 左障子（手前トラック）
                    addOpPart(paneW, innerH, paneThick, panelMat, -innerW * 0.24, 0, 0.020, 0, 'hikichigai_pane_l');
                    // 右障子（奥トラック）
                    addOpPart(paneW, innerH, paneThick, panelMat, innerW * 0.24, 0, -0.020, 0, 'hikichigai_pane_r');
                    // 左障子・右障子の外周縦框および中央の召合せ縦桟（2枚引き違いであることを決定づける中央縦ライン）
                    addOpPart(0.046, innerH, fThick * 0.88, frameMat, 0, 0, 0, 0, 'hikichigai_center_mullion');
                    if (!isWin) {
                        // 引き違い戸の場合は左右両端に引手を追加
                        addOpPart(0.022, 0.16, paneThick + 0.02, matDoorHandle, -innerW * 0.42, -0.04, 0.020, 0, 'hikichigai_handle_l');
                        addOpPart(0.022, 0.16, paneThick + 0.02, matDoorHandle, innerW * 0.42, -0.04, -0.020, 0, 'hikichigai_handle_r');
                    }
                }

                buildingGroup.add(opGroup);
            };

            flData.openings.forEach(op => {
                buildOpening3DMesh(op);
            });

            // 5. 設備・家具 & 3D直方体（全設備の4方向回転 0°/90°/180°/270° ＆ トイレ・キッチン等の立体造形対応）
            const floorTopY = baseY + slabHeight;
            flData.fixtures.forEach(fx => {
                const wM = fx.w * scaleP;
                const dM = fx.h * scaleP;
                const kH = (fx.kHeight || fx.hMm || 850) / 1000;
                const cat = fx.category || fx.type || '';
                const rot = (((fx.rot || 0) % 360) + 360) % 360;
                const isRot90or270 = (rot === 90 || rot === 270);
                const isKitchenL = fx.type === 'KITCHEN_L' || fx.category === 'KITCHEN_L' || (fx.fxData && fx.fxData.kitchenType === 'L');
                if (isKitchenL) {
                    const cDepthM = Math.min(Math.min(wM, dM) * 0.48, ((fx.fxData && fx.fxData.lDepth) ? fx.fxData.lDepth : 650) / 1000);
                    const x0 = fx.x * scaleP;
                    const z0 = fx.y * scaleP;
                    // rot (0:北西角, 90:北東角, 180:南東角, 270:南西角) と flipX/flipY からコーナー位置を解決
                    let cornerRight = (rot === 90 || rot === 180);
                    let cornerBottom = (rot === 180 || rot === 270);
                    if (fx.flipX) cornerRight = !cornerRight;
                    if (fx.flipY) cornerBottom = !cornerBottom;

                    // 横ウィング (幅 wM × 奥行 cDepthM): 上辺または下辺に沿う
                    const wingHZ = cornerBottom ? (z0 + dM - cDepthM / 2) : (z0 + cDepthM / 2);
                    const geoH = new THREE.BoxGeometry(wM * 0.96, kH, cDepthM * 0.96);
                    const mH = addWhiteModelMesh(geoH, matWhiteFixture, x0 + wM / 2, floorTopY + kH / 2, wingHZ, true);
                    if (mH) mH.userData.regionTag = 'kitchen_l_wing_h';

                    // 縦ウィング (幅 cDepthM × 残り奥行 dM - cDepthM): 左辺または右辺に沿う
                    const remDM = Math.max(0.1, dM - cDepthM);
                    const wingVX = cornerRight ? (x0 + wM - cDepthM / 2) : (x0 + cDepthM / 2);
                    const wingVZ = cornerBottom ? (z0 + remDM / 2) : (z0 + cDepthM + remDM / 2);
                    const geoV = new THREE.BoxGeometry(cDepthM * 0.96, kH, remDM * 0.96);
                    const mV = addWhiteModelMesh(geoV, matWhiteFixture, wingVX, floorTopY + kH / 2, wingVZ, true);
                    if (mV) mV.userData.regionTag = 'kitchen_l_wing_v';
                } else if (cat === 'TOILET_FIX') {
                    // トイレ便器：回転角 rot に合わせてロータンク（上部 H=780mm）と便器ボウル（下部 H=410mm）を分離造形し、潰れず向きが分かる3D形状にする
                    const localW = isRot90or270 ? dM : wM;
                    const localD = isRot90or270 ? wM : dM;
                    const cx = (fx.x + fx.w / 2) * scaleP;
                    const cz = (fx.y + fx.h / 2) * scaleP;
                    const wcGroup = new THREE.Group();
                    wcGroup.position.set(cx, floorTopY, cz);
                    wcGroup.rotation.y = -(rot * Math.PI) / 180;
                    wcGroup.userData.regionTag = 'toilet_fixture';

                    const tankD = localD * 0.28;
                    const tankH = Math.max(0.68, kH);
                    const tankGeo = new THREE.BoxGeometry(localW * 0.86, tankH, tankD);
                    const tankMesh = new THREE.Mesh(tankGeo, matWhiteFixture);
                    tankMesh.position.set(0, tankH / 2, -localD / 2 + tankD / 2);
                    tankMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(tankGeo), new THREE.LineBasicMaterial({ color: 0x94a3b8 })));
                    wcGroup.add(tankMesh);

                    const bowlD = localD * 0.68;
                    const bowlH = 0.41;
                    const bowlGeo = new THREE.BoxGeometry(localW * 0.76, bowlH, bowlD);
                    const bowlMesh = new THREE.Mesh(bowlGeo, matWhiteFixture);
                    bowlMesh.position.set(0, bowlH / 2, localD / 2 - bowlD / 2);
                    bowlMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(bowlGeo), new THREE.LineBasicMaterial({ color: 0x94a3b8 })));
                    wcGroup.add(bowlMesh);

                    buildingGroup.add(wcGroup);
                } else {
                    const cx = (fx.x + fx.w / 2) * scaleP;
                    const cz = (fx.y + fx.h / 2) * scaleP;
                    const tGeo = new THREE.BoxGeometry(wM * 0.94, kH, dM * 0.94);
                    addWhiteModelMesh(tGeo, matWhiteFixture, cx, floorTopY + kH / 2, cz, true);
                }
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

        // 6.5. 1階の基礎（基礎高さ設定連動）および土台水切り（水切り板金ON/OFF・カラー連動）を3D生成
        if (floorsToBuild.includes(1) && state.floors[1]) {
            buildFoundationAndMizukiri3D(state.floors[1], scaleP, wallThick, slabHeight);
        }

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
        // 立面不出力 (no3DOutput) がONの階段（上の階に自動投影された複写階段など）は3Dメッシュを出力しない
        if (fx.no3DOutput || fx.hide3D) return;
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
            try { clean2DUrl = cv2d.toDataURL('image/png'); } catch (e) { }
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
            } catch (e) { }
            const existingIdx = localPlans.findIndex(p => p.id === commPlan.id);
            if (existingIdx >= 0) localPlans[existingIdx] = commPlan;
            else localPlans.unshift(commPlan);
            localStorage.setItem('smile_community_plans', JSON.stringify(localPlans.slice(0, 50)));

            fetch('/api/publish-community-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: commPlan })
            }).catch(() => { });
            return commPlan;
        } catch (pe) {
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
        } catch (err) {
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
        } catch (_) { }

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
        const hints = {
            hasTatami: false,
            hasLdk: false,
            hasEntrance: false,
            roomNames: [],
            openingTypes: [],
            openingPromptPhrases: []
        };
        try {
            if (typeof state !== 'undefined' && state.floors) {
                const floorKeys = Object.keys(state.floors);
                const fitSet = new Set();
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
                    const openings = (fl && Array.isArray(fl.openings)) ? fl.openings : [];
                    for (const op of openings) {
                        const fit = op.doorFit || op.sashType || 'hikichigai';
                        fitSet.add(fit);
                    }
                }
                hints.openingTypes = Array.from(fitSet);
                const phraseMap = {
                    katabiki: 'Japanese single-leaf wooden sliding door (katabiki-do) with overhead rail and half-open walkthrough doorway',
                    hikido: 'Japanese single-leaf wooden sliding door (katabiki-do) with overhead rail and half-open walkthrough doorway',
                    katahiraki: 'single hinged swing wooden interior door with lever handle',
                    ryouhiraki: 'double French swing wooden doors with twin handles',
                    oyako: 'asymmetric parent-child entrance door (oyako-doa)',
                    oredo: 'bi-fold folding closet door panels (oredo)',
                    closet: 'bi-fold wooden closet folding doors',
                    fix: 'large single-pane fixed picture window without center mullion',
                    hikichigai: 'double-pane sliding glass window with center vertical mullion',
                    agesage: 'double-hung vertical sliding window with horizontal meeting rail',
                    tatesuberi: 'vertical casement awning window',
                    yokosuberi: 'horizontal awning window',
                    demado: 'projecting bay window with counter'
                };
                hints.openingTypes.forEach(f => {
                    if (phraseMap[f] && !hints.openingPromptPhrases.includes(phraseMap[f])) {
                        hints.openingPromptPhrases.push(phraseMap[f]);
                    }
                });
            }
        } catch (_) { }
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
        const openingPhrase = (Array.isArray(roomHints.openingPromptPhrases) && roomHints.openingPromptPhrases.length > 0)
            ? `, distinct architectural joinery (${roomHints.openingPromptPhrases.join(', ')})`
            : ', clear wooden interior doors and windows';

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
            prompt: `masterpiece, architectural interior photograph, modern Japanese custom home${floorPhrase}, pristine white diatomaceous earth plaster walls${openingPhrase}, bright natural daylight, ultra realistic, 8k`
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
    window.get3DScene = function () { return scene3d; };
    window.get3DCamera = function () { return camera3d; };
    window.get3DRenderer = function () { return renderer3d; };
    window.get3DBuildingGroup = function () { return buildingGroup; };
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
    window.getCadFbxStats = function () {
        return {
            loaded: !!(cadFbxGroup && cadFbxGroup.children.length > 0),
            roofMeshCount: cadRoofMeshes.length,
            roofVisible: cadRoofVisible
        };
    };
})();
