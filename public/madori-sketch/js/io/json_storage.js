/**
 * 住ま居る 3D間取りスケッチ工房 (MadoriSketch)
 * JSONストレージモジュール (Single Responsibility: JSON Project Import/Export)
 * 作図プロジェクトのJSON保存・復元、Dropboxハングアップ回避用のクラウド同期・ドラッグ＆ドロップ・クリップボード貼付復元を担当
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
            const totalM2Num = (typeof calcFloorAreaM2 === 'function')
                ? [0, 1, 2, 3, 4].reduce((s, f) => s + calcFloorAreaM2(f), 0)
                : 0;
            const totalTsubo = totalM2Num > 0 ? (totalM2Num / 3.305785).toFixed(1) + '坪' : '';
            const totalM2 = totalM2Num > 0 ? totalM2Num.toFixed(2) + '㎡' : '';
            const isReg = (typeof window.isHouseCarteRegisteredUser === 'function') ? window.isHouseCarteRegisteredUser() : false;

            projectData = {
                planId: state.currentPlanId,
                projectTitle: curTitle,
                title: curTitle,
                totalTsubo: totalTsubo,
                totalM2: totalM2,
                modulePitch: state.modulePitch,
                gridDivisions: state.gridDivisions,
                foundationHeightMm: state.foundationHeightMm !== undefined ? state.foundationHeightMm : 400,
                showMizukiri3D: state.showMizukiri3D !== undefined ? state.showMizukiri3D : true,
                mizukiriColor: state.mizukiriColor || '#334155',
                isRegisteredCarte: isReg,
                agreedToShareAndPublish: !isReg,
                sharedWith: '株式会社住ま居る 家づくりサポート係',
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
        // 家カルテ未登録ユーザーの場合、データ共有・間取り選定登録公開への同意を確認
        if (typeof window.verifySaveConsentOrAlert === 'function') {
            const consent = window.verifySaveConsentOrAlert();
            if (!consent.allowed) return false;
        }

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

                // ファイル保存成功後に家カルテ・クラウド復元リスト・間取り選定へ同時保存
                const carteSaved = syncCarteAfterFileSave();
                const savedName = handle.name || defaultFileName;
                const msg = carteSaved
                    ? `💾【別場所保存 ＆ 家カルテ・クラウド同時保存】「${savedName}」を保存しました（次回はDropboxを開かずに「読込・復元」一覧から1タップで復元できます）`
                    : `💾【別場所保存】「${savedName}」を保存しました`;
                notifyToast(toastFn, msg, !carteSaved);
                return true;
            } catch (err) {
                if (err && err.name === 'AbortError') {
                    notifyToast(toastFn, '保存をキャンセルしました（家カルテへの保存も中止しました）');
                    return false;
                }
                console.warn('[JsonStorage] showSaveFilePicker failed, falling back to Blob download:', err);
            }
        }

        // iPad Safari等の非対応環境、またはピッカー失敗時の確実なダウンロード＋クラウド＆家カルテ同時保存
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
                ? `💾【ファイル保存 ＆ 家カルテ・クラウド同時保存】「${defaultFileName}」を保存しました（次回は「読込・復元」の一覧から1タップで復元可能です）`
                : `💾【ファイル保存】「${defaultFileName}」を保存しました`;
            notifyToast(toastFn, msg, !carteSaved);
            return true;
        } catch (err) {
            console.error('[JsonStorage] Blob download failed:', err);
            notifyToast(toastFn, 'ファイル保存に失敗しました', true);
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
            if (parsed.planData && typeof parsed.planData === 'object') {
                parsed = Object.assign({}, parsed, { floors: parsed.planData });
            } else if (parsed.data && parsed.data.floors) {
                parsed = parsed.data;
            } else if (parsed.rawHouseData && parsed.rawHouseData.floors) {
                parsed = Object.assign({}, parsed, { floors: parsed.rawHouseData.floors });
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

            // 読み込んだプランも次回以降ワンタップ復元できるよう家カルテ＆クラウドリストへ静かに同期キャッシュ
            try {
                if (typeof window.savePlanToCarte === 'function') {
                    window.savePlanToCarte({ silent: true, skipToast: true, title: state.projectTitle });
                }
            } catch (_) {}
        }
        const activePlanId = (typeof state !== 'undefined' && state.currentPlanId) ? state.currentPlanId : '';
        const msg = `📂【間取り復元完了】「${(typeof state !== 'undefined' && state.projectTitle) || activePlanId || sourceFileName || 'プラン'}」を読み込みました`;
        notifyToast(toastFn, msg, false);
        return true;
    }

    function parseAndApplyJSONText(rawText, fileName, onLoadCallback, toastFn) {
        if (!rawText || typeof rawText !== 'string') {
            notifyToast(toastFn, `ファイル「${fileName || ''}」が空です（「読込・復元」画面上部の『保存済み間取りをワンタップ復元』一覧から読み込めます）`, true);
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

    function readFileObjectAsJSON(file, onLoadCallback, toastFn, resetInputFn) {
        if (!file) return;
        const fileName = file.name || 'plan.json';
        const doneReset = () => { if (typeof resetInputFn === 'function') resetInputFn(); };

        // 1. ArrayBuffer -> TextDecoder('utf-8') 読込（iOS/Windows Dropbox クラウドプロバイダで最もハングしにくいバイナリストリーム方式）
        if (typeof file.arrayBuffer === 'function') {
            file.arrayBuffer().then(buf => {
                doneReset();
                const text = new TextDecoder('utf-8').decode(buf);
                parseAndApplyJSONText(text, fileName, onLoadCallback, toastFn);
            }).catch(() => {
                // 2. フォールバック: FileReader
                const reader = new FileReader();
                reader.onload = (ev) => {
                    doneReset();
                    parseAndApplyJSONText(ev.target.result, fileName, onLoadCallback, toastFn);
                };
                reader.onerror = () => {
                    doneReset();
                    notifyToast(toastFn, `Dropboxからの読込がOS側でブロックされました。「読込・復元」画面上部の『保存済み間取りをワンタップ復元』一覧または画面へのドラッグ＆ドロップをご利用ください`, true);
                };
                reader.readAsText(file, 'UTF-8');
            });
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            doneReset();
            parseAndApplyJSONText(ev.target.result, fileName, onLoadCallback, toastFn);
        };
        reader.onerror = () => {
            doneReset();
            notifyToast(toastFn, `Dropboxからの読込がOS側でブロックされました。「読込・復元」画面上部の『保存済み間取りをワンタップ復元』一覧または画面へのドラッグ＆ドロップをご利用ください`, true);
        };
        reader.readAsText(file, 'UTF-8');
    }

    function importJSON(e, onLoadCallback, toastFn) {
        const inputEl = e && e.target ? e.target : null;
        const file = (inputEl && inputEl.files && inputEl.files[0]) ? inputEl.files[0] : (e && e.files && e.files[0] ? e.files[0] : null);
        if (!file) return;
        const resetInput = () => {
            try { if (inputEl) inputEl.value = ''; } catch (_) {}
        };
        readFileObjectAsJSON(file, onLoadCallback, toastFn, resetInput);
    }

    /**
     * クリップボードにコピーされたJSONテキスト、またはテキスト欄の文字列からワンタップで復元（Dropboxピッカー不要）
     */
    async function pasteAndRestoreJSONFromClipboard(toastFn) {
        try {
            const inp = document.getElementById('directPlanIdInput');
            if (inp && inp.value && inp.value.trim().startsWith('{')) {
                return parseAndApplyJSONText(inp.value.trim(), '貼付JSON', null, toastFn);
            }
            if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
                const clipText = (await navigator.clipboard.readText() || '').trim();
                if (clipText.startsWith('{')) {
                    if (inp) inp.value = clipText.slice(0, 120) + '...';
                    return parseAndApplyJSONText(clipText, 'クリップボードJSON', null, toastFn);
                } else if (clipText) {
                    if (inp) inp.value = clipText;
                    return loadServerPlanById(clipText, toastFn);
                }
            }
            notifyToast(toastFn, '上の入力欄にプラン番号（例: 2387-P01）またはJSONテキストを貼り付けて「読込」を押してください', true);
            return false;
        } catch (err) {
            notifyToast(toastFn, '上の入力欄にプラン番号またはJSONテキストを長押しペーストして「読込」を押してください', true);
            return false;
        }
    }

    async function loadServerPlanById(rawPlanId, toastFn) {
        let query = String(rawPlanId || '').trim();
        if (!query) {
            const inp = document.getElementById('directPlanIdInput');
            if (inp) query = inp.value.trim();
        }
        if (!query) {
            notifyToast(toastFn, 'プラン番号（例: 2387-P01 または PLAN-COMM-...）を入力するか、上の「保存済み一覧」から選んでください', true);
            return false;
        }
        // JSONテキストが直接貼り付けられた場合はそのままパース
        if (query.startsWith('{') && query.endsWith('}')) {
            return parseAndApplyJSONText(query, '貼り付けJSON', null, toastFn);
        }

        // 1. まずローカルまたはクラウド保存済みプラン（PLAN-COMM-等）に一致するか検索
        let normId = query.toUpperCase().replace(/\.JSON$/i, '').trim();
        if (!normId.startsWith('PLAN-')) {
            normId = 'PLAN-' + normId;
        }

        try {
            const cloudRes = await fetch('/api/madori_plans_storage.php?action=get&planId=' + encodeURIComponent(normId) + '&t=' + Date.now());
            if (cloudRes.ok) {
                const cData = await cloudRes.json();
                if (cData && cData.ok && cData.plan) {
                    return applyLoadedProjectData(cData.plan, normId + '.json', null, toastFn);
                }
            }
        } catch (_) {}

        // 2. 703プラン集カタログ (/plans_json/) から検索
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

    /**
     * 画面全体および読込モーダルへの JSON ファイルドラッグ＆ドロップ対応
     * （Dropboxアプリやエクスプローラーから直接ファイルをドロップするだけでOSピッカーを開かずに即読込）
     */
    function initGlobalJsonDragAndDrop() {
        window.addEventListener('dragover', (e) => {
            if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            }
        });
        window.addEventListener('drop', (e) => {
            if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
            const file = e.dataTransfer.files[0];
            if (!file) return;
            const name = (file.name || '').toLowerCase();
            if (name.endsWith('.json') || file.type === 'application/json') {
                e.preventDefault();
                readFileObjectAsJSON(file, null, null, null);
            } else if (name.endsWith('.fbx') && typeof window.loadArchitrendFBXFromBuffer === 'function') {
                e.preventDefault();
                file.arrayBuffer().then(buf => window.loadArchitrendFBXFromBuffer(buf, file.name));
            }
        });
    }

    if (typeof window !== 'undefined') {
        initGlobalJsonDragAndDrop();
    }

    // グローバル公開
    window.savePlanToOtherLocation = savePlanToOtherLocation;
    window.exportJSON = exportJSON;
    window.importJSON = importJSON;
    window.loadServerPlanById = loadServerPlanById;
    window.pasteAndRestoreJSONFromClipboard = pasteAndRestoreJSONFromClipboard;
    window.applyLoadedProjectData = applyLoadedProjectData;
})();
