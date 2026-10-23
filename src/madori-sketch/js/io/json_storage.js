/**
 * 住ま居る 3D間取りスケッチ工房 (MadoriSketch)
 * JSONストレージモジュール (Single Responsibility: JSON Project Import/Export)
 * 作図プロジェクトのJSON保存・復元を担当
 */
(function() {
    'use strict';

    function exportJSON(projectData, toastFn) {
        if (!projectData && typeof state !== 'undefined') {
            projectData = {
                modulePitch: state.modulePitch,
                gridDivisions: state.gridDivisions,
                floors: state.floors,
                savedAt: new Date().toISOString()
            };
        }
        const data = JSON.stringify(projectData, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Smile_MadoriSketch_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        const msg = 'プロジェクト間取りJSONを保存しました';
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
                        if (typeof ensureFloorsStructure === 'function') ensureFloorsStructure();
                        if (parsed.modulePitch && typeof setModulePitch === 'function') setModulePitch(parsed.modulePitch);
                        if (parsed.gridDivisions && typeof setGridDivision === 'function') setGridDivision(parsed.gridDivisions);
                        if (typeof saveHistorySnapshot === 'function') saveHistorySnapshot();
                        if (typeof closePresetModal === 'function') closePresetModal();
                    }
                    const msg = 'プロジェクト間取りJSONを読み込みました';
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
