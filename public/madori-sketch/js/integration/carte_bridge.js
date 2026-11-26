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
})();
