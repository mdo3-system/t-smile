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
                foundationHeightMm: state.foundationHeightMm !== undefined ? state.foundationHeightMm : 400,
                showMizukiri3D: state.showMizukiri3D !== undefined ? state.showMizukiri3D : true,
                mizukiriColor: state.mizukiriColor || '#334155',
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

    function applyLoadedProjectData(parsed, sourceFileName, onLoadCallback, toastFn) {
        if (!parsed || typeof parsed !== 'object') {
            notifyToast(toastFn, 'JSONデータが空か無効な形式です', true);
            return false;
        }
        // ラップ形式・単一階層形式の自動正規化
        if (!parsed.floors) {
            if (parsed.data && parsed.data.floors) {
                parsed = parsed.data;
            } else if (parsed.rawHouseData && parsed.rawHouseData.floors) {
                parsed = parsed.rawHouseData;
            } else if (parsed['1'] && (Array.isArray(parsed['1'].rooms) || Array.isArray(parsed['1'].walls))) {
                parsed = { floors: parsed };
            } else if (Array.isArray(parsed.rooms) || Array.isArray(parsed.walls)) {
                parsed = {
                    floors: {
                        0: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], stairs: [], boxes3d: [], strokes: [], stamps: [], memos: [], polyPillars: [] },
                        1: parsed,
                        2: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], stairs: [], boxes3d: [], strokes: [], stamps: [], memos: [], polyPillars: [] },
                        3: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], stairs: [], boxes3d: [], strokes: [], stamps: [], memos: [], polyPillars: [] },
                        4: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], stairs: [], boxes3d: [], strokes: [], stamps: [], memos: [], polyPillars: [] }
                    }
                };
            }
        }

        if (!parsed.floors) {
            notifyToast(toastFn, '間取りデータ（floors）が見つかりません', true);
            return false;
        }

        if (typeof onLoadCallback === 'function') {
            onLoadCallback(parsed);
        } else if (typeof state !== 'undefined') {
            state.floors = parsed.floors;
            if (parsed.guides) state.guides = parsed.guides;
            let loadedTitle = parsed.projectTitle || parsed.title || parsed.planTitle || parsed.name || (parsed.meta && parsed.meta.title) || '';
            if (!loadedTitle && sourceFileName) {
                let stem = sourceFileName.replace(/\.json$/i, '')
                    .replace(/^Smile_MadoriSketch_/i, '')
                    .replace(/_\d{4}-\d{2}-\d{2}$/, '');
                loadedTitle = stem || '読込プラン';
            }
            if (loadedTitle) {
                state.projectTitle = loadedTitle;
                const titleInp = document.getElementById('planTitleInput');
                if (titleInp) titleInp.value = loadedTitle;
            }
            let detectedPlanId = parsed.planId || parsed.id || '';
            if (!detectedPlanId && sourceFileName) {
                const mPlan = sourceFileName.match(/(PLAN-[A-Z0-9-]+)/i);
                if (mPlan) detectedPlanId = mPlan[1].toUpperCase();
            }
            if (detectedPlanId) {
                state.currentPlanId = detectedPlanId;
                try { if (typeof window.updateCurrentPlanBadge === 'function') window.updateCurrentPlanBadge(); } catch (_) {}
            }
            try { if (typeof ensureFloorsStructure === 'function') ensureFloorsStructure(); } catch (e) { console.warn(e); }
            try { if (parsed.modulePitch && typeof setModulePitch === 'function') setModulePitch(parsed.modulePitch); } catch (e) { console.warn(e); }
            try { if (parsed.gridDivisions && typeof setGridDivision === 'function') setGridDivision(parsed.gridDivisions); } catch (e) { console.warn(e); }
            try {
                if (parsed.foundationHeightMm !== undefined) state.foundationHeightMm = parseInt(parsed.foundationHeightMm, 10) || 0;
                if (parsed.showMizukiri3D !== undefined) state.showMizukiri3D = !!parsed.showMizukiri3D;
                if (parsed.mizukiriColor) state.mizukiriColor = parsed.mizukiriColor;
                if (typeof window.syncFoundationAndMizukiriUI === 'function') window.syncFoundationAndMizukiriUI();
            } catch (e) { console.warn(e); }

            // 壁のみJSON対応：部屋が空の階は壁閉ループから部屋を自動認識
            try {
                const autoDetectChk = document.getElementById('chkAutoDetectRoomsOnImport');
                const shouldAutoDetect = !autoDetectChk || autoDetectChk.checked;
                if (shouldAutoDetect && window.RoomDetector && typeof window.RoomDetector.detectRoomsFromWalls === 'function') {
                    const pitchVal = (typeof state !== 'undefined' && state.modulePitch) ? state.modulePitch : 910;
                    [0, 1, 2, 3, 4].forEach(f => {
                        const fl = state.floors[f];
                        if (fl && Array.isArray(fl.walls) && fl.walls.length >= 3 && (!Array.isArray(fl.rooms) || fl.rooms.length === 0)) {
                            fl.rooms = window.RoomDetector.detectRoomsFromWalls(fl.walls, [], pitchVal);
                        }
                    });
                }
            } catch (e) { console.warn('[RoomDetector on import]', e); }

            try { if (typeof window.syncUpperFloorStairs === 'function') window.syncUpperFloorStairs(); } catch (e) { console.warn(e); }
            try { if (typeof saveHistorySnapshot === 'function') saveHistorySnapshot(); } catch (e) { console.warn(e); }
            try { if (typeof updateAllMetricsAnd3D === 'function') updateAllMetricsAnd3D(); } catch (e) { console.warn(e); }
            try { if (typeof window.renderQaTargetComparison === 'function') window.renderQaTargetComparison(); } catch (e) { console.warn(e); }
            try { if (typeof renderPropertyInspector === 'function') renderPropertyInspector(); } catch (e) { console.warn(e); }
            try { if (typeof request2DRedraw === 'function') request2DRedraw(); } catch (e) { console.warn(e); }
            try { if (typeof rebuild3DScene === 'function') rebuild3DScene(); } catch (e) { console.warn(e); }
            try { if (typeof closePresetModal === 'function') closePresetModal(); } catch (e) { console.warn(e); }
        }
        const activePlanId = (typeof state !== 'undefined' && state.currentPlanId) ? state.currentPlanId : '';
        const msg = `📂【JSON復元完了】間取り「${(typeof state !== 'undefined' && state.projectTitle) || activePlanId || sourceFileName || 'プラン'}」を読み込みました`;
        notifyToast(toastFn, msg, false);
        return true;
    }

    function parseAndApplyJSONText(rawText, fileName, onLoadCallback, toastFn) {
        if (!rawText || typeof rawText !== 'string') {
            notifyToast(toastFn, `ファイル「${fileName || ''}」が空です（Dropbox上でクラウド未ダウンロードの可能性があります）`, true);
            return false;
        }
        const cleaned = rawText.replace(/^\uFEFF/, '').trim();
        let parsed = null;
        try {
            parsed = JSON.parse(cleaned);
        } catch (err) {
            console.error('[JsonStorage] JSON.parse failed:', err);
            notifyToast(toastFn, `「${fileName || '選択ファイル'}」はJSON形式として解析できませんでした`, true);
            return false;
        }
        return applyLoadedProjectData(parsed, fileName, onLoadCallback, toastFn);
    }

    function importJSON(e, onLoadCallback, toastFn) {
        const inputEl = e && e.target ? e.target : null;
        const file = (inputEl && inputEl.files && inputEl.files[0]) ? inputEl.files[0] : null;
        if (!file) return;
        const fileName = file.name || 'plan.json';

        // 同一ファイルの再選択でも onchange が確実に発火するよう input.value をリセット
        const resetInput = () => {
            try { if (inputEl) inputEl.value = ''; } catch (_) {}
        };

        // iOS/iPadOS File Provider (Dropbox等) ストリーム読込に強い file.text() を優先し、FileReader をフォールバックに使用
        if (typeof file.text === 'function') {
            file.text().then(text => {
                resetInput();
                parseAndApplyJSONText(text, fileName, onLoadCallback, toastFn);
            }).catch(err => {
                console.warn('[JsonStorage] file.text() failed, falling back to FileReader:', err);
                const reader = new FileReader();
                reader.onload = (ev) => {
                    resetInput();
                    parseAndApplyJSONText(ev.target.result, fileName, onLoadCallback, toastFn);
                };
                reader.onerror = () => {
                    resetInput();
                    notifyToast(toastFn, `Dropbox等からのファイル読込に失敗しました（「${fileName}」を一度端末へダウンロードしてから選択してください）`, true);
                };
                reader.readAsText(file, 'UTF-8');
            });
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            resetInput();
            parseAndApplyJSONText(ev.target.result, fileName, onLoadCallback, toastFn);
        };
        reader.onerror = () => {
            resetInput();
            notifyToast(toastFn, `Dropbox等からのファイル読込に失敗しました（「${fileName}」を一度端末へダウンロードしてから選択してください）`, true);
        };
        reader.readAsText(file, 'UTF-8');
    }

    async function loadServerPlanById(rawPlanId, toastFn) {
        let query = String(rawPlanId || '').trim();
        if (!query) {
            const inp = document.getElementById('directPlanIdInput');
            if (inp) query = inp.value.trim();
        }
        if (!query) {
            notifyToast(toastFn, 'プラン番号（例: 2387-P01 または PLAN-2404-P05）を入力してください', true);
            return false;
        }
        // JSONテキストが直接貼り付けられた場合はそのままパース
        if (query.startsWith('{') && query.endsWith('}')) {
            return parseAndApplyJSONText(query, '貼り付けJSON', null, toastFn);
        }
        let normId = query.toUpperCase().replace(/\.JSON$/i, '').trim();
        if (!normId.startsWith('PLAN-')) {
            normId = 'PLAN-' + normId;
        }
        try {
            const res = await fetch('/plans_json/' + encodeURIComponent(normId) + '.json?t=' + Date.now());
            if (!res.ok) {
                notifyToast(toastFn, `プラン「${normId}」が見つかりませんでした（番号をご確認ください）`, true);
                return false;
            }
            const text = await res.text();
            return parseAndApplyJSONText(text, normId + '.json', null, toastFn);
        } catch (err) {
            console.error('[JsonStorage] loadServerPlanById failed:', err);
            notifyToast(toastFn, `プラン「${normId}」の通信読込に失敗しました`, true);
            return false;
        }
    }

    // グローバル公開
    window.savePlanToOtherLocation = savePlanToOtherLocation;
    window.exportJSON = exportJSON;
    window.importJSON = importJSON;
    window.loadServerPlanById = loadServerPlanById;
    window.applyLoadedProjectData = applyLoadedProjectData;
})();
