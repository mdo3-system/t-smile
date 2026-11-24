/**
 * 住ま居る 3D間取りスケッチ工房 (MadoriSketch)
 * JSONストレージモジュール (Single Responsibility: JSON Project Import/Export)
 * 作図プロジェクトのJSON保存・復元を担当
 */
(function() {
    'use strict';

    function notifyToast(toastFn, msg, isError) {
        if (typeof toastFn === 'function') toastFn(msg, isError);
        else if (typeof showToast === 'function') showToast(msg, isError);
    }

    function buildProjectData(projectData) {
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
        return projectData;
    }

    function syncCarteAfterFileSave() {
        if (typeof window.savePlanToCarte === 'function') {
            return window.savePlanToCarte({ silent: true, skipToast: true });
        }
        if (typeof window.syncPlanToCommunityLibrary === 'function') {
            window.syncPlanToCommunityLibrary();
        }
        return true;
    }

    async function savePlanToOtherLocation(projectData, toastFn) {
        projectData = buildProjectData(projectData);
        const activePlanId = (typeof state !== 'undefined' && state.currentPlanId) ? state.currentPlanId : 'PLAN-COMM-UNKNOWN';
        const safeTitle = ((projectData && (projectData.projectTitle || projectData.title)) || activePlanId).replace(/[\\/:*?"<>|]/g, '_');
        const defaultFileName = `Smile_MadoriSketch_${safeTitle}_${new Date().toISOString().slice(0, 10)}.json`;
        const data = JSON.stringify(projectData, null, 2);

        if (typeof window.showSaveFilePicker === 'function') {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: defaultFileName,
                    types: [{
                        description: '間取り工房プロジェクト (JSON)',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(data);
                await writable.close();

                // ファイル保存成功後にのみ家カルテへ同時保存
                const carteSaved = syncCarteAfterFileSave();
                const savedName = handle.name || defaultFileName;
                const msg = carteSaved
                    ? `💾【別場所保存 ＆ 家カルテ同時保存】「${savedName}」と家カルテに保存しました`
                    : `💾【別場所保存】「${savedName}」を保存しました（家カルテ保存に失敗）`;
                notifyToast(toastFn, msg, !carteSaved);
                return true;
            } catch (err) {
                if (err && err.name === 'AbortError') {
                    // キャンセル時は家カルテにも保存せず、保存全体を中止
                    notifyToast(toastFn, '保存をキャンセルしました（家カルテへの保存も中止しました）');
                    return false;
                }
                console.error('[JsonStorage] showSaveFilePicker failed:', err);
                notifyToast(toastFn, 'ファイル保存に失敗しました（家カルテへの保存も中止しました）', true);
                return false;
            }
        }

        // iPad Safari等の非対応ブラウザ向けフォールバック（ダウンロード成功後に家カルテ同時保存）
        try {
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = defaultFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            const carteSaved = syncCarteAfterFileSave();
            const msg = carteSaved
                ? `💾【ファイル保存 ＆ 家カルテ同時保存】「${defaultFileName}」を保存し、家カルテにも同時保存しました`
                : `💾【ファイル保存】「${defaultFileName}」を保存しました（家カルテ保存に失敗）`;
            notifyToast(toastFn, msg, !carteSaved);
            return true;
        } catch (err) {
            console.error('[JsonStorage] Blob download failed:', err);
            notifyToast(toastFn, 'ファイル保存に失敗しました（家カルテへの保存も中止しました）', true);
            return false;
        }
    }

    function exportJSON(projectData, toastFn) {
        return savePlanToOtherLocation(projectData, toastFn);
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
    window.savePlanToOtherLocation = savePlanToOtherLocation;
    window.exportJSON = exportJSON;
    window.importJSON = importJSON;
})();
