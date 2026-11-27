/**
 * 住ま居る 3D間取りスケッチ工房 (MadoriSketch)
 * プラットフォーム連携モジュール (Single Responsibility: Carte & Platform Integration Bridge)
 * 施主様専用「家カルテ」への安全保存、家カルテ未登録ユーザーの共有・間取り選定公開同意、
 * クラウド＆ローカル3重保存・ワンタップ復元、LINE通知連携、AI 3Dパース工房ブリッジを担当
 */
(function() {
    'use strict';

    const LINE_CONFIG = {
        ACCOUNT_ID: '@051vqxla',
        ADD_FRIEND_URL: 'https://lin.ee/8fdyyGu',
        CHAT_TITLE: '株式会社住ま居る 家づくりサポート係 通知窓口'
    };

    const LOCAL_BACKUP_KEY = 'smile_madori_saved_projects_v1';
    const IDB_NAME = 'smile_madori_projects_db';
    const IDB_STORE = 'projects';

    /**
     * 家カルテに本登録済み（名前・メール・登録ID・保存マイホームプロフィール等がある）かを判定
     */
    function isHouseCarteRegisteredUser() {
        try {
            const raw = localStorage.getItem('smile_house_carte_data');
            if (!raw) return false;
            const carte = JSON.parse(raw);
            if (!carte || typeof carte !== 'object') return false;
            return !!(
                carte.isRegistered ||
                carte.email ||
                carte.ownerName ||
                carte.userName ||
                carte.phone ||
                carte.lineConnected ||
                (carte.profile && (carte.profile.name || carte.profile.email))
            );
        } catch (e) {
            return false;
        }
    }

    /**
     * 保存先選択モーダルを開く際、家カルテ登録状態に応じて「共有・間取り選定公開の同意案内」を同期
     */
    function syncSaveModalConsentUI() {
        const isReg = isHouseCarteRegisteredUser();
        const guestBox = document.getElementById('guestSaveConsentBox');
        const regBox = document.getElementById('registeredSaveInfoBox');
        const chk = document.getElementById('chkAgreeShareAndPublish');
        if (guestBox) {
            guestBox.classList.toggle('hidden', isReg);
        }
        if (regBox) {
            regBox.classList.toggle('hidden', !isReg);
        }
        if (chk && !isReg && chk.dataset.userToggled !== '1') {
            chk.checked = true;
        }
    }

    /**
     * 未登録ユーザーが保存を実行する前に、共有・間取り選定公開への同意を確認
     */
    function verifySaveConsentOrAlert() {
        if (isHouseCarteRegisteredUser()) {
            return { allowed: true, isRegistered: true, agreedToShareAndPublish: false };
        }
        const chk = document.getElementById('chkAgreeShareAndPublish');
        const isAgreed = chk ? !!chk.checked : true;
        if (!isAgreed) {
            if (typeof window.showToast === 'function') {
                window.showToast('⚠️ 家カルテ未登録でデータを保存する場合は、株式会社住ま居る（家づくりサポート係）とのデータ共有および間取り選定への登録・公開への同意が必要です', true);
            } else {
                alert('家カルテ未登録でデータを保存する場合は、株式会社住ま居る（家づくりサポート係）とのデータ共有および間取り選定への登録・公開への同意にチェックを入れてください。');
            }
            return { allowed: false, isRegistered: false, agreedToShareAndPublish: false };
        }
        return { allowed: true, isRegistered: false, agreedToShareAndPublish: true };
    }

    /**
     * IndexedDB へプロジェクトを保存（Safari / PWA / 大容量プランでも消えない永続バックアップ）
     */
    function saveProjectToIndexedDB(planItem) {
        return new Promise((resolve) => {
            if (!window.indexedDB || !planItem || !planItem.id) {
                resolve(false);
                return;
            }
            try {
                const req = window.indexedDB.open(IDB_NAME, 1);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(IDB_STORE)) {
                        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
                    }
                };
                req.onsuccess = (e) => {
                    try {
                        const db = e.target.result;
                        const tx = db.transaction(IDB_STORE, 'readwrite');
                        tx.objectStore(IDB_STORE).put(planItem);
                        tx.oncomplete = () => { db.close(); resolve(true); };
                        tx.onerror = () => { db.close(); resolve(false); };
                    } catch (_) { resolve(false); }
                };
                req.onerror = () => resolve(false);
            } catch (_) {
                resolve(false);
            }
        });
    }

    function getAllProjectsFromIndexedDB() {
        return new Promise((resolve) => {
            if (!window.indexedDB) {
                resolve([]);
                return;
            }
            try {
                const req = window.indexedDB.open(IDB_NAME, 1);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(IDB_STORE)) {
                        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
                    }
                };
                req.onsuccess = (e) => {
                    try {
                        const db = e.target.result;
                        const tx = db.transaction(IDB_STORE, 'readonly');
                        const getAllReq = tx.objectStore(IDB_STORE).getAll();
                        getAllReq.onsuccess = () => {
                            db.close();
                            resolve(Array.isArray(getAllReq.result) ? getAllReq.result : []);
                        };
                        getAllReq.onerror = () => { db.close(); resolve([]); };
                    } catch (_) { resolve([]); }
                };
                req.onerror = () => resolve([]);
            } catch (_) {
                resolve([]);
            }
        });
    }

    /**
     * サーバー側クラウドストレージ（/api/madori_plans_storage.php）へも自動バックアップ保存
     * → Dropboxのファイル選択ダイアログを開かずに、どの端末・どのモードからでもワンタップ復元可能にする
     */
    function syncProjectToServerCloud(planItem, communityPlan) {
        try {
            const fullProject = {
                planId: planItem.id,
                projectTitle: planItem.title,
                title: planItem.title,
                totalTsubo: planItem.totalTsubo,
                totalM2: planItem.totalM2,
                modulePitch: planItem.pitch || 910,
                gridDivisions: (typeof state !== 'undefined' && state.gridDivisions) ? state.gridDivisions : 2,
                foundationHeightMm: (typeof state !== 'undefined' && state.foundationHeightMm !== undefined) ? state.foundationHeightMm : 400,
                showMizukiri3D: (typeof state !== 'undefined' && state.showMizukiri3D !== undefined) ? state.showMizukiri3D : true,
                mizukiriColor: (typeof state !== 'undefined' && state.mizukiriColor) ? state.mizukiriColor : '#334155',
                floors: planItem.planData,
                guides: (typeof state !== 'undefined' && state.guides) ? state.guides : [],
                savedAt: planItem.savedAt
            };
            fetch('/api/madori_plans_storage.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId: planItem.id,
                    totalTsubo: planItem.totalTsubo,
                    totalM2: planItem.totalM2,
                    isRegisteredCarte: !!planItem.isRegisteredCarte,
                    agreedToShareAndPublish: !!planItem.agreedToShareAndPublish,
                    projectData: fullProject,
                    communityPlan: communityPlan || null
                })
            }).catch(() => {});
        } catch (_) {}
    }

    /**
     * 現在の間取りデータを施主様の「家カルテ」に保存 ＆ 3Dプラン選定ライブラリおよびクラウド復元ストレージに自動登録・更新
     * @param {Object} options - 現在の作図データとメタ情報
     */
    function savePlanToCarte(options) {
        options = options || {};
        const consent = verifySaveConsentOrAlert();
        if (!consent.allowed) {
            return false;
        }
        try {
            const raw = localStorage.getItem('smile_house_carte_data');
            const carte = raw ? JSON.parse(raw) : {};
            if (!carte.customPlans) carte.customPlans = [];

            // 延床面積と階数の取得
            const totalM2Num = (typeof calcFloorAreaM2 === 'function')
                ? [0, 1, 2, 3, 4].reduce((s, f) => s + calcFloorAreaM2(f), 0)
                : 0;
            const totalTsubo = options.totalTsubo || (totalM2Num > 0 ? (totalM2Num / 3.305785).toFixed(1) + '坪' : (document.getElementById('areaTotal_tsubo')?.textContent || '0坪'));
            const totalM2 = options.totalM2 || (totalM2Num > 0 ? totalM2Num.toFixed(2) + '㎡' : (document.getElementById('valTotalFloorArea')?.textContent || document.getElementById('areaTotal_m2')?.textContent || '0㎡'));

            // 2Dキャンバスのサムネイル画像を取得
            let thumbUrl = '';
            const cv2d = options.canvas2d || document.getElementById('canvas2d');
            if (cv2d) {
                try {
                    thumbUrl = cv2d.toDataURL('image/jpeg', 0.8);
                } catch (e) {
                    console.warn('[CarteBridge] Failed to capture thumbnail:', e);
                }
            }

            const activePitch = options.pitch || (typeof state !== 'undefined' && state.modulePitch ? state.modulePitch : 910);
            const planDataObj = JSON.parse(JSON.stringify(options.planData || (typeof state !== 'undefined' && state.floors ? state.floors : {})));

            // 同一プランIDの維持（復元編集時は同じデータとして更新、新規作成時は新ID）
            if (typeof state !== 'undefined') {
                if (!state.currentPlanId) {
                    state.currentPlanId = 'PLAN-COMM-' + Date.now().toString(36).toUpperCase();
                }
                if (typeof window.updateCurrentPlanBadge === 'function') window.updateCurrentPlanBadge();
            }
            const activePlanId = (typeof state !== 'undefined' && state.currentPlanId) ? state.currentPlanId : ('PLAN-COMM-' + Date.now().toString(36).toUpperCase());
            const inputTitle = document.getElementById('planTitleInput')?.value?.trim() || (typeof state !== 'undefined' && (state.projectTitle || state.planTitle) ? String(state.projectTitle || state.planTitle).trim() : '');
            const rawTitle = options.title || inputTitle;
            const planTitle = (rawTitle && rawTitle !== '新規プラン') ? rawTitle : ('3D間取りプラン (' + totalTsubo + ' / ' + totalM2 + ')');
            const nowIso = new Date().toISOString();

            const planItem = {
                id: activePlanId,
                title: planTitle,
                totalTsubo: totalTsubo,
                totalM2: totalM2,
                pitch: activePitch,
                roomsCount: options.roomsCount || 0,
                thumbnail: thumbUrl,
                isRegisteredCarte: consent.isRegistered,
                agreedToShareAndPublish: consent.agreedToShareAndPublish,
                updatedAt: nowIso,
                savedAt: nowIso,
                planData: planDataObj
            };

            // 1. 家カルテ内の既存プラン上書き、または新規追加
            const existingIdx = carte.customPlans.findIndex(p => p.id === activePlanId);
            if (existingIdx >= 0) {
                carte.customPlans[existingIdx] = planItem;
            } else {
                carte.customPlans.unshift(planItem);
            }
            carte.lastUpdated = nowIso;
            localStorage.setItem('smile_house_carte_data', JSON.stringify(carte));

            // 2. 独立ローカルバックアップ（smile_madori_saved_projects_v1）へも保存
            try {
                const rawBk = localStorage.getItem(LOCAL_BACKUP_KEY);
                let bkList = rawBk ? JSON.parse(rawBk) : [];
                if (!Array.isArray(bkList)) bkList = [];
                const bIdx = bkList.findIndex(p => p && p.id === activePlanId);
                if (bIdx >= 0) bkList[bIdx] = planItem;
                else bkList.unshift(planItem);
                localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(bkList.slice(0, 40)));
            } catch (_) {}

            // 3. IndexedDB へも非同期保存
            saveProjectToIndexedDB(planItem);

            // 4. 3Dプラン選定ライブラリへ自動登録・共有
            let syncedCommunityPlan = null;
            if (typeof window.syncPlanToCommunityLibrary === 'function') {
                syncedCommunityPlan = window.syncPlanToCommunityLibrary(thumbUrl, {
                    isRegisteredCarte: consent.isRegistered,
                    agreedToShareAndPublish: consent.agreedToShareAndPublish
                });
            }

            // 5. サーバークラウド（/api/madori_plans_storage.php）へも自動保存（Dropboxピッカー不要のワンタップ復元用）
            syncProjectToServerCloud(planItem, syncedCommunityPlan);

            if (!options.skipToast && typeof window.showToast === 'function') {
                const toastMsg = consent.isRegistered
                    ? `💾 家カルテ＆クラウド復元リストへ保存しました（${totalM2} / ID: ${activePlanId}）`
                    : `💾 保存＆住ま居る（家づくりサポート係）と共有・間取り選定へ登録しました（ID: ${activePlanId}）`;
                window.showToast(toastMsg);
            }
            return true;
        } catch (e) {
            console.error('[CarteBridge] Error saving plan to carte:', e);
            if (!options.silent && typeof window.showToast === 'function') {
                window.showToast('保存エラー: ' + e.message, true);
            }
            return false;
        }
    }

    /**
     * 保存済みプラン（家カルテ・ローカルバックアップ・IndexedDB・サーバークラウド）からワンタップで復元
     * → OSのDropboxファイル選択画面（「読み込み中...」で止まる画面）を一切開かずに100%確実に復元！
     */
    async function restorePlanFromCarte(planId) {
        try {
            const localPlans = getCarteCustomPlans();
            let target = localPlans.find(p => p && p.id === planId);

            if (!target || !target.planData) {
                const idbPlans = await getAllProjectsFromIndexedDB();
                target = idbPlans.find(p => p && p.id === planId);
            }

            // ローカルに無い場合（別端末やDropbox代わりにクラウド保存されたプラン）はサーバーから即時取得
            if (!target || !target.planData) {
                try {
                    const res = await fetch('/api/madori_plans_storage.php?action=get&planId=' + encodeURIComponent(planId) + '&t=' + Date.now());
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.ok && data.plan) {
                            if (typeof window.applyLoadedProjectData === 'function') {
                                return window.applyLoadedProjectData(data.plan, planId + '.json');
                            }
                        }
                    }
                } catch (_) {}
            }

            if (!target || !target.planData) {
                if (typeof window.showToast === 'function') {
                    window.showToast('該当のプランデータが見つかりません', true);
                }
                return false;
            }

            const projectObj = {
                planId: target.id,
                projectTitle: target.title || target.id,
                title: target.title || target.id,
                modulePitch: target.pitch || 910,
                floors: JSON.parse(JSON.stringify(target.planData))
            };
            if (typeof window.applyLoadedProjectData === 'function') {
                return window.applyLoadedProjectData(projectObj, (target.title || target.id) + '.json');
            }

            if (typeof state !== 'undefined') {
                state.floors = JSON.parse(JSON.stringify(target.planData));
                state.currentPlanId = target.id;
                if (target.title) state.projectTitle = target.title;
                const titleInp = document.getElementById('planTitleInput');
                if (titleInp && target.title) titleInp.value = target.title;
                if (typeof window.updateCurrentPlanBadge === 'function') window.updateCurrentPlanBadge();
                if (target.pitch && typeof setModulePitch === 'function') setModulePitch(target.pitch);
                if (typeof ensureFloorsStructure === 'function') ensureFloorsStructure();
                if (typeof window.syncUpperFloorStairs === 'function') window.syncUpperFloorStairs();
                if (typeof saveHistorySnapshot === 'function') saveHistorySnapshot();
                if (typeof updateAllMetricsAnd3D === 'function') updateAllMetricsAnd3D();
                if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
                if (typeof request2DRedraw === 'function') request2DRedraw();
                if (typeof rebuild3DScene === 'function') rebuild3DScene();
                if (typeof closePresetModal === 'function') closePresetModal();
                if (typeof showToast === 'function') {
                    showToast(`📂 プラン「${target.title || target.id}」をワンタップ復元しました（ID: ${target.id}）`);
                }
            }
            return true;
        } catch (e) {
            console.error('[CarteBridge] Error restoring plan:', e);
            if (typeof window.showToast === 'function') {
                window.showToast('復元エラー: ' + e.message, true);
            }
            return false;
        }
    }

    /**
     * ローカル（家カルテ＋独立バックアップ）の保存済みプラン一覧を取得
     */
    function getCarteCustomPlans() {
        const map = new Map();
        try {
            const raw = localStorage.getItem('smile_house_carte_data');
            if (raw) {
                const carte = JSON.parse(raw);
                (carte.customPlans || []).forEach(p => {
                    if (p && p.id) map.set(p.id, p);
                });
            }
        } catch (e) {}
        try {
            const rawBk = localStorage.getItem(LOCAL_BACKUP_KEY);
            if (rawBk) {
                const bkList = JSON.parse(rawBk);
                if (Array.isArray(bkList)) {
                    bkList.forEach(p => {
                        if (p && p.id && !map.has(p.id)) map.set(p.id, p);
                    });
                }
            }
        } catch (e) {}
        return Array.from(map.values());
    }

    /**
     * ローカル＋IndexedDB＋サーバークラウドの全保存済みプランを統合取得（Dropboxファイルピッカー不要のワンタップ復元一覧用）
     */
    async function fetchAllSavedPlansUnified() {
        const map = new Map();
        getCarteCustomPlans().forEach(p => {
            if (p && p.id) map.set(p.id, Object.assign({ source: 'local' }, p));
        });
        try {
            const idbList = await getAllProjectsFromIndexedDB();
            idbList.forEach(p => {
                if (p && p.id && !map.has(p.id)) {
                    map.set(p.id, Object.assign({ source: 'indexeddb' }, p));
                }
            });
        } catch (_) {}
        try {
            const res = await fetch('/api/madori_plans_storage.php?action=list&t=' + Date.now());
            if (res.ok) {
                const data = await res.json();
                if (data && data.ok && Array.isArray(data.plans)) {
                    data.plans.forEach(cp => {
                        if (cp && cp.id && !map.has(cp.id)) {
                            map.set(cp.id, cp);
                        }
                    });
                }
            }
        } catch (_) {}
        return Array.from(map.values()).sort((a, b) => {
            const ta = Date.parse(a.updatedAt || a.savedAt || '') || 0;
            const tb = Date.parse(b.updatedAt || b.savedAt || '') || 0;
            return tb - ta;
        });
    }

    function openAiStudio() {
        window.open('/smilestudio.html', '_blank');
    }

    function openLineNotice() {
        window.open(LINE_CONFIG.ADD_FRIEND_URL, '_blank');
    }

    // =========================================================================
    // 📡 同一Wi-Fi内・別タブレット(iPad) / PC画面 リアルタイム画面共有 (Live Screen Share)
    // =========================================================================
    const LIVE_SHARE_API = '/api/madori_live_share.php';
    const liveShareState = {
        mode: 'off', // 'off' | 'host' | 'viewer'
        roomCode: '',
        seq: 0,
        lastSentHash: '',
        pushTimer: null,
        heartbeatInterval: null,
        pollInterval: null,
        isApplyingRemote: false,
        followHostCamera: true
    };

    function escapeHtmlShare(str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function detectDeviceLabel() {
        const ua = navigator.userAgent || '';
        if (/iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iPad';
        if (/iPhone/i.test(ua)) return 'iPhone';
        if (/Android/i.test(ua)) return 'Androidタブレット';
        if (/Windows/i.test(ua)) return 'Windows PC';
        if (/Macintosh/i.test(ua)) return 'Mac';
        return '端末';
    }

    function generate4DigitRoomCode() {
        return String(Math.floor(1000 + Math.random() * 9000));
    }

    function buildLiveSharePayload() {
        if (typeof state === 'undefined') return null;
        const titleEl = document.getElementById('planTitleInput');
        const projectTitle = (titleEl && titleEl.value.trim()) ? titleEl.value.trim() : (state.projectTitle || '3D間取りプラン');
        const cam3d = (typeof window.get3DCameraOrbitState === 'function') ? window.get3DCameraOrbitState() : null;
        return {
            action: 'push',
            roomCode: liveShareState.roomCode,
            seq: liveShareState.seq + 1,
            hostLabel: detectDeviceLabel(),
            projectTitle: projectTitle,
            planId: state.currentPlanId || '',
            currentFloor: state.currentFloor || 1,
            viewMode: state.viewMode || 'split',
            modulePitch: state.modulePitch || 910,
            gridDivisions: state.gridDivisions || 2,
            foundationHeightMm: state.foundationHeightMm !== undefined ? state.foundationHeightMm : 400,
            showMizukiri3D: state.showMizukiri3D !== false,
            mizukiriColor: state.mizukiriColor || '#334155',
            floorDisplay3D: state.floorDisplay3D || 'all',
            cam2d: state.cam2d ? { x: +Number(state.cam2d.x || 3.5).toFixed(3), y: +Number(state.cam2d.y || 4.2).toFixed(3), zoom: +Number(state.cam2d.zoom || 38).toFixed(2) } : null,
            camera3d: cam3d,
            floors: state.floors,
            guides: state.guides || []
        };
    }

    async function pushLiveShareStateNow(force = false) {
        if (liveShareState.mode !== 'host' || !liveShareState.roomCode || liveShareState.isApplyingRemote) return;
        const payload = buildLiveSharePayload();
        if (!payload) return;
        const stateSignature = JSON.stringify({
            f: payload.currentFloor,
            v: payload.viewMode,
            t: payload.projectTitle,
            fd: payload.floorDisplay3D,
            fh: payload.foundationHeightMm,
            mz: payload.showMizukiri3D,
            mc: payload.mizukiriColor,
            c2: payload.cam2d,
            c3: payload.camera3d,
            fl: payload.floors,
            gd: payload.guides
        });
        if (!force && stateSignature === liveShareState.lastSentHash) {
            return;
        }
        liveShareState.lastSentHash = stateSignature;
        try {
            const res = await fetch(LIVE_SHARE_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.ok && data.seq) {
                    liveShareState.seq = data.seq;
                    updateLiveShareStatusUI();
                }
            }
        } catch (err) {
            console.warn('[LiveShare] push error:', err);
        }
    }

    function notifyLiveShareStateChanged(reason) {
        if (liveShareState.mode !== 'host' || liveShareState.isApplyingRemote) return;
        if (liveShareState.pushTimer) clearTimeout(liveShareState.pushTimer);
        const delay = (reason === 'camera3d') ? 260 : 180;
        liveShareState.pushTimer = setTimeout(() => {
            pushLiveShareStateNow(false);
        }, delay);
    }

    function applyRemoteLiveShareState(remote) {
        if (!remote || typeof state === 'undefined') return;
        liveShareState.isApplyingRemote = true;
        try {
            if (remote.floors && typeof remote.floors === 'object') {
                state.floors = JSON.parse(JSON.stringify(remote.floors));
            }
            if (Array.isArray(remote.guides)) {
                state.guides = JSON.parse(JSON.stringify(remote.guides));
            }
            if (remote.projectTitle) {
                state.projectTitle = remote.projectTitle;
                const titleInp = document.getElementById('planTitleInput');
                if (titleInp && document.activeElement !== titleInp) {
                    titleInp.value = remote.projectTitle;
                }
            }
            if (remote.planId) {
                state.currentPlanId = remote.planId;
                if (typeof window.updateCurrentPlanBadge === 'function') window.updateCurrentPlanBadge();
            }
            if (remote.modulePitch && remote.modulePitch !== state.modulePitch) {
                state.modulePitch = remote.modulePitch;
            }
            if (remote.foundationHeightMm !== undefined) state.foundationHeightMm = remote.foundationHeightMm;
            if (remote.showMizukiri3D !== undefined) state.showMizukiri3D = remote.showMizukiri3D;
            if (remote.mizukiriColor) state.mizukiriColor = remote.mizukiriColor;
            if (typeof window.syncFoundationAndMizukiriUI === 'function') window.syncFoundationAndMizukiriUI();

            if (remote.currentFloor !== undefined && remote.currentFloor !== state.currentFloor) {
                state.currentFloor = Number(remote.currentFloor);
                [0, 1, 2, 3, 4].forEach(n => {
                    const tab = document.getElementById('btnFloor' + n);
                    if (tab) {
                        tab.className = (n === state.currentFloor)
                            ? 'px-2.5 py-1 text-xs font-extrabold bg-amber-500 text-slate-950 shadow transition'
                            : 'px-2.5 py-1 text-xs font-bold bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition';
                    }
                });
            }

            if (liveShareState.followHostCamera) {
                if (remote.viewMode && remote.viewMode !== state.viewMode && typeof window.setViewMode === 'function') {
                    window.setViewMode(remote.viewMode);
                }
                if (remote.floorDisplay3D && remote.floorDisplay3D !== state.floorDisplay3D) {
                    state.floorDisplay3D = remote.floorDisplay3D;
                }
                if (remote.cam2d && state.cam2d) {
                    if (typeof remote.cam2d.x === 'number') state.cam2d.x = remote.cam2d.x;
                    if (typeof remote.cam2d.y === 'number') state.cam2d.y = remote.cam2d.y;
                    if (typeof remote.cam2d.zoom === 'number') state.cam2d.zoom = remote.cam2d.zoom;
                }
                if (remote.camera3d && typeof window.apply3DCameraOrbitState === 'function') {
                    window.apply3DCameraOrbitState(remote.camera3d);
                }
            }

            if (typeof ensureFloorsStructure === 'function') ensureFloorsStructure();
            if (typeof updateAllMetricsAnd3D === 'function') updateAllMetricsAnd3D();
            if (typeof request2DRedraw === 'function') request2DRedraw();
            if (typeof rebuild3DScene === 'function') rebuild3DScene();
        } catch (err) {
            console.warn('[LiveShare] apply error:', err);
        } finally {
            liveShareState.isApplyingRemote = false;
        }
    }

    async function pollLiveShareRoomOnce() {
        if (liveShareState.mode !== 'viewer' || !liveShareState.roomCode) return;
        try {
            const url = `${LIVE_SHARE_API}?action=poll&room=${encodeURIComponent(liveShareState.roomCode)}&sinceSeq=${liveShareState.seq}&t=${Date.now()}`;
            const res = await fetch(url);
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.ok && !data.unchanged && data.state) {
                liveShareState.seq = Number(data.seq || data.state.seq || 1);
                applyRemoteLiveShareState(data.state);
                updateLiveShareStatusUI(data.state);
            }
        } catch (err) {
            console.warn('[LiveShare] poll error:', err);
        }
    }

    async function startLiveShareAsHost(customCode) {
        stopLiveShareSession(true);
        const code = (customCode && String(customCode).replace(/[^A-Za-z0-9]/g, '').length >= 4)
            ? String(customCode).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8)
            : generate4DigitRoomCode();
        liveShareState.mode = 'host';
        liveShareState.roomCode = code;
        liveShareState.seq = 0;
        liveShareState.lastSentHash = '';
        await pushLiveShareStateNow(true);
        liveShareState.heartbeatInterval = setInterval(() => {
            pushLiveShareStateNow(false);
        }, 1200);
        updateLiveShareStatusUI();
        refreshActiveLiveShareRoomsList();
        if (typeof window.showToast === 'function') {
            window.showToast(`📡 画面共有（ホスト配信）を開始しました！共有番号: ${code}`);
        }
        return code;
    }

    async function joinLiveShareAsViewer(roomCodeInput) {
        const cleanCode = String(roomCodeInput || document.getElementById('inpLiveShareJoinCode')?.value || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        if (cleanCode.length < 3) {
            if (typeof window.showToast === 'function') {
                window.showToast('4桁の共有番号を入力するか、現在配信中のルームを選択してください', true);
            }
            return false;
        }
        stopLiveShareSession(true);
        liveShareState.mode = 'viewer';
        liveShareState.roomCode = cleanCode;
        liveShareState.seq = 0;
        await pollLiveShareRoomOnce();
        liveShareState.pollInterval = setInterval(pollLiveShareRoomOnce, 750);
        updateLiveShareStatusUI();
        if (typeof window.showToast === 'function') {
            window.showToast(`📺 共有ルーム「${cleanCode}」に接続しました（リアルタイム同期中）`);
        }
        return true;
    }

    function stopLiveShareSession(silent = false) {
        const prevMode = liveShareState.mode;
        const prevCode = liveShareState.roomCode;
        if (liveShareState.pushTimer) { clearTimeout(liveShareState.pushTimer); liveShareState.pushTimer = null; }
        if (liveShareState.heartbeatInterval) { clearInterval(liveShareState.heartbeatInterval); liveShareState.heartbeatInterval = null; }
        if (liveShareState.pollInterval) { clearInterval(liveShareState.pollInterval); liveShareState.pollInterval = null; }

        if (prevMode === 'host' && prevCode) {
            fetch(LIVE_SHARE_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'stop', roomCode: prevCode })
            }).catch(() => {});
        }
        liveShareState.mode = 'off';
        liveShareState.roomCode = '';
        liveShareState.seq = 0;
        liveShareState.lastSentHash = '';
        updateLiveShareStatusUI();
        if (!silent && typeof window.showToast === 'function') {
            window.showToast('画面共有・リアルタイム同期を終了しました');
        }
    }

    function toggleLiveShareFollowCamera(checked) {
        liveShareState.followHostCamera = !!checked;
    }

    function getLiveShareDirectUrl(code) {
        const base = window.location.origin + window.location.pathname;
        return `${base}?share=${encodeURIComponent(code || liveShareState.roomCode)}`;
    }

    function copyLiveShareUrl() {
        if (!liveShareState.roomCode) return;
        const url = getLiveShareDirectUrl(liveShareState.roomCode);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(() => {
                if (typeof window.showToast === 'function') window.showToast('📋 共有URLをコピーしました！別タブレット・PCのブラウザで開くと自動同期します');
            }).catch(() => {});
        }
    }

    function updateLiveShareStatusUI(remoteState) {
        const btnHeader = document.getElementById('btnLiveShareHeader');
        const badgeHeader = document.getElementById('lblLiveShareHeader');
        const hostBox = document.getElementById('liveShareActiveHostBox');
        const viewerBox = document.getElementById('liveShareActiveViewerBox');
        const codeDisplay = document.getElementById('liveShareRoomCodeDisplay');
        const urlInput = document.getElementById('liveShareUrlDisplay');
        const viewerCodeSpan = document.getElementById('liveShareViewerCodeDisplay');

        if (btnHeader) {
            if (liveShareState.mode === 'host') {
                btnHeader.className = 'px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold border border-emerald-300 shadow flex items-center gap-1 transition animate-pulse';
                if (badgeHeader) badgeHeader.textContent = `配信中:${liveShareState.roomCode}`;
            } else if (liveShareState.mode === 'viewer') {
                btnHeader.className = 'px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold border border-amber-200 shadow flex items-center gap-1 transition';
                if (badgeHeader) badgeHeader.textContent = `同期中:${liveShareState.roomCode}`;
            } else {
                btnHeader.className = 'px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-cyan-300 text-xs font-bold border border-cyan-500/50 flex items-center gap-1 transition';
                if (badgeHeader) badgeHeader.textContent = '画面共有';
            }
        }

        if (hostBox) hostBox.classList.toggle('hidden', liveShareState.mode !== 'host');
        if (viewerBox) viewerBox.classList.toggle('hidden', liveShareState.mode !== 'viewer');
        if (codeDisplay && liveShareState.roomCode) codeDisplay.textContent = liveShareState.roomCode;
        if (urlInput && liveShareState.roomCode) urlInput.value = getLiveShareDirectUrl(liveShareState.roomCode);
        if (viewerCodeSpan) {
            viewerCodeSpan.textContent = remoteState
                ? `${liveShareState.roomCode}（${remoteState.hostLabel || 'ホスト'} · ${remoteState.projectTitle || ''}）`
                : liveShareState.roomCode;
        }
    }

    async function refreshActiveLiveShareRoomsList() {
        const listEl = document.getElementById('liveShareActiveRoomsList');
        if (!listEl) return;
        try {
            const res = await fetch(`${LIVE_SHARE_API}?action=list_active&t=${Date.now()}`);
            if (!res.ok) return;
            const data = await res.json();
            const rooms = (data && data.ok && Array.isArray(data.rooms)) ? data.rooms : [];
            if (rooms.length === 0) {
                listEl.innerHTML = `<div class="text-[11px] text-slate-400 py-2 text-center">現在配信中の画面はありません。発信する端末で上の「📡 この画面の共有を開始」を押すと、ここに自動表示されワンタップで同期できます。</div>`;
                return;
            }
            listEl.innerHTML = rooms.map(r => {
                const code = escapeHtmlShare(r.roomCode);
                const title = escapeHtmlShare(r.projectTitle || '3D間取りプラン');
                const host = escapeHtmlShare(r.hostLabel || 'iPad / PC');
                const ageTxt = (r.ageSec <= 10) ? '🟢 リアルタイム配信中' : `${r.ageSec}秒前に更新`;
                const isSelf = (liveShareState.mode === 'host' && liveShareState.roomCode === r.roomCode);
                return `
                    <div class="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-between gap-2">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-black text-xs mono-num">番号: ${code}</span>
                                <span class="text-xs font-bold text-white truncate">${title}</span>
                            </div>
                            <div class="text-[10px] text-cyan-200 mt-0.5">発信端末: ${host} · ${r.currentFloor || 1}階表示 · ${ageTxt}</div>
                        </div>
                        ${isSelf
                            ? `<span class="px-2.5 py-1 rounded-lg bg-emerald-600/40 border border-emerald-400 text-emerald-200 text-[10px] font-bold shrink-0">この端末で配信中</span>`
                            : `<button onclick="joinLiveShareAsViewer('${code}')" class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shrink-0 shadow">📺 ワンタップ同期 →</button>`
                        }
                    </div>
                `;
            }).join('');
        } catch (err) {
            console.warn('[LiveShare] list error:', err);
        }
    }

    function openLiveShareModal() {
        const modal = document.getElementById('liveShareModal');
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        updateLiveShareStatusUI();
        refreshActiveLiveShareRoomsList();
    }

    function closeLiveShareModal() {
        const modal = document.getElementById('liveShareModal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    // URLパラメータ ?share=XXXX で開かれた場合は自動的に受信同期を開始
    window.addEventListener('DOMContentLoaded', () => {
        try {
            const params = new URLSearchParams(window.location.search);
            const shareCode = (params.get('share') || params.get('liveShare') || '').trim();
            if (shareCode) {
                setTimeout(() => {
                    joinLiveShareAsViewer(shareCode);
                }, 600);
            }
        } catch (_) {}
    });

    // グローバル公開
    window.isHouseCarteRegisteredUser = isHouseCarteRegisteredUser;
    window.syncSaveModalConsentUI = syncSaveModalConsentUI;
    window.verifySaveConsentOrAlert = verifySaveConsentOrAlert;
    window.savePlanToCarte = savePlanToCarte;
    window.restorePlanFromCarte = restorePlanFromCarte;
    window.getCarteCustomPlans = getCarteCustomPlans;
    window.fetchAllSavedPlansUnified = fetchAllSavedPlansUnified;
    window.syncProjectToServerCloud = syncProjectToServerCloud;
    window.openAiStudio = openAiStudio;
    window.openLineNotice = openLineNotice;
    window.LINE_CONFIG = LINE_CONFIG;
    window.openLiveShareModal = openLiveShareModal;
    window.closeLiveShareModal = closeLiveShareModal;
    window.startLiveShareAsHost = startLiveShareAsHost;
    window.joinLiveShareAsViewer = joinLiveShareAsViewer;
    window.stopLiveShareSession = stopLiveShareSession;
    window.refreshActiveLiveShareRoomsList = refreshActiveLiveShareRoomsList;
    window.notifyLiveShareStateChanged = notifyLiveShareStateChanged;
    window.toggleLiveShareFollowCamera = toggleLiveShareFollowCamera;
    window.copyLiveShareUrl = copyLiveShareUrl;
    window.liveShareState = liveShareState;
})();
