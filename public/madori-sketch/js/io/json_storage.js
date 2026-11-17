/**
 * 住ま居る 3D間取りスケッチ工房 (MadoriSketch)
 * JSONストレージモジュール (Single Responsibility: JSON Project Import/Export)
 * 作図プロジェクトのJSON保存・復元を担当
 */
(function() {
    'use strict';

    function exportJSON(projectData, toastFn) {
        if (!projectData && typeof state !== 'undefined') {
            if (!state.currentPlanId) {
                state.currentPlanId = 'PLAN-COMM-' + Date.now().toString(36).toUpperCase();
            }
            const curTitle = document.getElementById('planTitleInput')?.value?.trim() || state.projectTitle || '新規プラン';
            state.projectTitle = curTitle;
            projectData = {
                planId: state.currentPlanId,
                projectTitle: curTitle,
                title: curTitle,
                modulePitch: state.modulePitch,
                gridDivisions: state.gridDivisions,
                floors: state.floors,
                guides: state.guides || [],
                savedAt: new Date().toISOString()
            };
        }
        const activePlanId = (typeof state !== 'undefined' && state.currentPlanId) ? state.currentPlanId : 'PLAN-COMM-UNKNOWN';
        const safeTitle = ((projectData && (projectData.projectTitle || projectData.title)) || activePlanId).replace(/[\\/:*?"<>|]/g, '_');

        const data = JSON.stringify(projectData, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Smile_MadoriSketch_${safeTitle}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // 🎯 【次にやり変えるためにデータ保存したら登録】
        if (typeof window.syncPlanToCommunityLibrary === 'function') {
            window.syncPlanToCommunityLibrary();
        }

        const msg = `💾【JSON保存 ＆ 3D選定ライブラリ同期】プラン「${safeTitle}」（ID: ${activePlanId}）を保存しました`;
        if (typeof toastFn === 'function') toastFn(msg);
        else if (typeof showToast === 'function') showToast(msg);
    }

    function importJSON(e, onLoadCallback, toastFn) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result);
                if (parsed.floors) {
                    if (typeof onLoadCallback === 'function') {
                        onLoadCallback(parsed);
                    } else if (typeof state !== 'undefined') {
                        state.floors = parsed.floors;
                        if (parsed.guides) state.guides = parsed.guides;
                        let loadedTitle = parsed.projectTitle || parsed.title || parsed.planTitle || parsed.name || (parsed.meta && parsed.meta.title) || '';
                        if (!loadedTitle && file && file.name) {
                            let stem = file.name.replace(/\.json$/i, '')
                                .replace(/^Smile_MadoriSketch_/i, '')
                                .replace(/_\d{4}-\d{2}-\d{2}$/, '');
                            if (/^PLAN-[A-Z0-9-]+$/i.test(stem)) stem = '';
                            loadedTitle = stem || '読込プラン';
                        }
                        if (loadedTitle) {
                            state.projectTitle = loadedTitle;
                            const titleInp = document.getElementById('planTitleInput');
                            if (titleInp) titleInp.value = loadedTitle;
                        }
                        if (parsed.planId || parsed.id) {
                            state.currentPlanId = parsed.planId || parsed.id; // 同一プランIDを引き継ぎ
                            if (typeof window.updateCurrentPlanBadge === 'function') window.updateCurrentPlanBadge();
                        }
                        if (typeof ensureFloorsStructure === 'function') ensureFloorsStructure();
                        if (parsed.modulePitch && typeof setModulePitch === 'function') setModulePitch(parsed.modulePitch);
                        if (parsed.gridDivisions && typeof setGridDivision === 'function') setGridDivision(parsed.gridDivisions);

                        // 壁のみJSON対応：部屋が空の階は壁閉ループから部屋を自動認識
                        const autoDetectChk = document.getElementById('chkAutoDetectRoomsOnImport');
                        const shouldAutoDetect = !autoDetectChk || autoDetectChk.checked;
                        let autoDetectedFloors = 0;
                        if (shouldAutoDetect && window.RoomDetector && typeof window.RoomDetector.detectRoomsFromWalls === 'function') {
                            const pitchVal = (typeof state !== 'undefined' && state.modulePitch) ? state.modulePitch : 910;
                            [0, 1, 2, 3, 4].forEach(f => {
                                const fl = state.floors[f];
                                if (fl && Array.isArray(fl.walls) && fl.walls.length >= 3 && (!Array.isArray(fl.rooms) || fl.rooms.length === 0)) {
                                    fl.rooms = window.RoomDetector.detectRoomsFromWalls(fl.walls, [], pitchVal);
                                    if (fl.rooms.length > 0) autoDetectedFloors++;
                                }
                            });
                        }

                        if (typeof saveHistorySnapshot === 'function') saveHistorySnapshot();
                        if (typeof updateAllMetricsAnd3D === 'function') updateAllMetricsAnd3D();
                        if (typeof window.renderQaTargetComparison === 'function') window.renderQaTargetComparison();
                        if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
                        if (typeof request2DRedraw === 'function') request2DRedraw();
                        if (typeof rebuild3DScene === 'function') rebuild3DScene();
                        if (typeof closePresetModal === 'function') closePresetModal();
                    }
                    const activePlanId = (typeof state !== 'undefined' && state.currentPlanId) ? state.currentPlanId : '';
                    const msg = `📂【JSON復元完了】間取り「${state.projectTitle || activePlanId}」を読み込みました`;
                    if (typeof toastFn === 'function') toastFn(msg);
                    else if (typeof showToast === 'function') showToast(msg);
                }
            } catch (err) {
                const errMsg = 'JSONファイルの形式が正しくありません';
                if (typeof toastFn === 'function') toastFn(errMsg, true);
                else if (typeof showToast === 'function') showToast(errMsg, true);
            }
        };
        reader.readAsText(file);
    }

    // グローバル公開
    window.exportJSON = exportJSON;
    window.importJSON = importJSON;
})();
