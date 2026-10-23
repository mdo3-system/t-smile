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
            projectData = {
                planId: state.currentPlanId,
                modulePitch: state.modulePitch,
                gridDivisions: state.gridDivisions,
                floors: state.floors,
                savedAt: new Date().toISOString()
            };
        }
        const activePlanId = (typeof state !== 'undefined' && state.currentPlanId) ? state.currentPlanId : 'PLAN-COMM-UNKNOWN';

        const data = JSON.stringify(projectData, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Smile_MadoriSketch_${activePlanId}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // 🎯 【次にやり変えるためにデータ保存したら登録】
        if (typeof window.syncPlanToCommunityLibrary === 'function') {
            window.syncPlanToCommunityLibrary();
        }

        const msg = `💾【JSON保存 ＆ 3D選定ライブラリ同期】プラン（ID: ${activePlanId}）を保存しました。復元して再度保存した場合も同一プランとして更新されます`;
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
                        if (parsed.planId || parsed.id) {
                            state.currentPlanId = parsed.planId || parsed.id; // 同一プランIDを引き継ぎ
                            if (typeof window.updateCurrentPlanBadge === 'function') window.updateCurrentPlanBadge();
                        }
                        if (typeof ensureFloorsStructure === 'function') ensureFloorsStructure();
                        if (parsed.modulePitch && typeof setModulePitch === 'function') setModulePitch(parsed.modulePitch);
                        if (parsed.gridDivisions && typeof setGridDivision === 'function') setGridDivision(parsed.gridDivisions);
                        if (typeof saveHistorySnapshot === 'function') saveHistorySnapshot();
                        if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
                        if (typeof request2DRedraw === 'function') request2DRedraw();
                        if (typeof rebuild3DScene === 'function') rebuild3DScene();
                        if (typeof closePresetModal === 'function') closePresetModal();
                    }
                    const activePlanId = (typeof state !== 'undefined' && state.currentPlanId) ? state.currentPlanId : '';
                    const msg = `📂【JSON復元完了】間取り（ID: ${activePlanId}）を読み込みました。修正後にデータ保存またはパース生成すると同一プランとして更新されます`;
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
