/**
 * Smile MadoriSketch - Case & Plan Lifecycle Manager
 * (Single Responsibility Principle Refactoring)
 */
// --- 案件管理・同期システム（社員・同業者の複数回保存対応 ＆ 新規案件分離） ---
function updateCurrentPlanBadge() {
    const txt = document.getElementById('txtCaseId');
    const badge = document.getElementById('badgeCurrentCase');
    if (!txt || !badge) return;

    if (state.currentPlanId) {
        txt.textContent = `案件: ${state.currentPlanId}`;
        badge.title = `現在編集中の案件ID【${state.currentPlanId}】。何度保存してもこの案件の最新版として上書き更新されます。別案件を作る場合は「新規案件」を押してください。`;
        badge.classList.remove('text-slate-400');
        badge.classList.add('text-amber-300');
        try { localStorage.setItem('smile_active_project_id', state.currentPlanId); } catch (e) { }
    } else {
        txt.textContent = `案件: 新規案件 (未保存)`;
        badge.title = `まだ未保存の新規案件です。保存またはパース生成時に新しい案件IDが発行され、別案件として登録されます。`;
        badge.classList.remove('text-amber-300');
        badge.classList.add('text-slate-400');
        try { localStorage.removeItem('smile_active_project_id'); } catch (e) { }
    }
}
window.updateCurrentPlanBadge = updateCurrentPlanBadge;

// 1. 新規案件作成（別案件として白紙開始）
function createNewPlan() {
    const hasData = state.floors[1].rooms.length > 0 || state.floors[1].walls.length > 0 || state.floors[1].fixtures.length > 0;
    if (hasData) {
        if (!confirm('現在編集中の案件を終了し、別案件として新しく作図を開始しますか？\n※現在のプランを保存していない場合は「保存(更新)」してから新規作成してください。\n\n新規作成後は「新しい別案件」として保存・登録されます。')) {
            return;
        }
    }

    state.floors = {
        1: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], strokes: [], stamps: [] },
        2: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], strokes: [], stamps: [] },
        3: { rooms: [], walls: [], pillars: [], openings: [], fixtures: [], strokes: [], stamps: [] }
    };
    state.currentPlanId = null; // 別案件として新規ID発行待ちに完全リセット
    updateCurrentPlanBadge();
    state.selectedItem = null;
    state.currentFloor = 1;
    state.history = [];
    state.historyIndex = -1;
    setFloor(1);
    saveHistorySnapshot();
    renderPropertyInspector();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast('✨ 新規案件として白紙キャンバスを作成しました（保存時は別プランとして登録されます）');
}

// 2. 別案複製（現在の間取りを元に、新しい別案件B案として保存）
function saveAsNewPlan() {
    const hasData = state.floors[1].rooms.length > 0 || state.floors[1].walls.length > 0;
    if (!hasData) {
        showToast('図面が作成されていません。部屋や壁を作成してから別案保存してください', true);
        return;
    }

    // 新しい案件IDを即時発行して切り替え
    state.currentPlanId = 'PLAN-COMM-' + Date.now().toString(36).toUpperCase();
    updateCurrentPlanBadge();

    // 家カルテおよび3Dプラン選定ライブラリへ新規登録
    if (typeof window.savePlanToCarte === 'function') {
        window.savePlanToCarte();
    }
    showToast(`📋 新しい別案件（ID: ${state.currentPlanId}）として複製保存しました！`);
}
window.saveAsNewPlan = saveAsNewPlan;

// 2. 全画面モード切替 ＆ 離脱防止（beforeunload）
function toggleFullscreenMode() {
    const isCurrentlyFullscreen = document.body.classList.contains('is-fullscreen');
    const icon = document.getElementById('fullscreenIcon');
    const lbl = document.getElementById('fullscreenBtnLabel');
    const btn = document.getElementById('btnFullscreen');
    const floatingBtn = document.getElementById('btnExitFullscreenFloating');
    const floatingBar = document.getElementById('floatingFullscreenBar');
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    if (!isCurrentlyFullscreen) {
        // 全画面モードへ移行（CSSクラス付与でヘッダー・フッターを完全隠蔽）
        document.body.classList.add('is-fullscreen');
        if (icon) icon.className = 'fa-solid fa-compress';
        if (lbl) lbl.textContent = '通常表示に戻す';
        if (btn) btn.className = 'px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 border border-rose-400 text-white text-xs font-extrabold flex items-center gap-1 shadow transition';
        if (floatingBar) floatingBar.style.display = 'inline-flex';
        else if (floatingBtn) floatingBtn.style.display = 'inline-flex';
        dismissFullscreenPrompt();
        if (typeof closeFullscreenModal === 'function') closeFullscreenModal();

        // PC（非タッチ端末）環境でのみブラウザAPI全画面を併用。iPad/タッチ端末ではCSS全画面が最安定
        if (!isTouchDevice && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(err => {
                console.info('Browser fullscreen request avoided or unsupported; CSS fullscreen applied.', err);
            });
        }
        if (typeof showToast === 'function') {
            showToast('📐 全画面モードを開始しました（上部の「通常表示に戻す」ボタンでいつでも解除できます）');
        }
        if (typeof handleResize === 'function') setTimeout(handleResize, 100);
    } else {
        // 通常モードへ戻す（ヘッダー・フッターを再表示）
        exitFullscreenMode();
    }
}

function exitFullscreenMode() {
    document.body.classList.remove('is-fullscreen');
    const icon = document.getElementById('fullscreenIcon');
    const lbl = document.getElementById('fullscreenBtnLabel');
    const btn = document.getElementById('btnFullscreen');
    const floatingBtn = document.getElementById('btnExitFullscreenFloating');
    const floatingBar = document.getElementById('floatingFullscreenBar');
    if (icon) icon.className = 'fa-solid fa-expand';
    if (lbl) lbl.textContent = '全画面';
    if (btn) btn.className = 'px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-200 text-xs font-bold flex items-center gap-1 transition';
    if (floatingBar) floatingBar.style.display = 'none';
    if (floatingBtn) floatingBtn.style.display = 'none';

    if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.warn(err));
    }
    if (typeof showToast === 'function') {
        showToast('通常表示に戻しました（サイトヘッダー・フッター復帰）');
    }
    if (typeof handleResize === 'function') setTimeout(handleResize, 100);
}

// PC環境でのEscキー押下による全画面解除対応
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('is-fullscreen')) {
        exitFullscreenMode();
    }
});

// PC環境でブラウザ標準のEscキー等によるフルスクリーン解除時にもbodyクラスとUIを同期（タッチ端末は除外）
document.addEventListener('fullscreenchange', () => {
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (!isTouchDevice && !document.fullscreenElement && document.body.classList.contains('is-fullscreen')) {
        exitFullscreenMode();
    }
});

function dismissFullscreenPrompt() {
    const banner = document.getElementById('fullscreenPromptBanner');
    if (banner) banner.style.display = 'none';
}
window.exitFullscreenMode = exitFullscreenMode;

// ブラウザの戻る・タブ閉じ誤操作によるデータ消失防止
window.addEventListener('beforeunload', (e) => {
    const hasData = state.floors[1].rooms.length > 0 || state.floors[1].walls.length > 0 || state.floors[1].fixtures.length > 0;
    if (hasData) {
        e.preventDefault();
        e.returnValue = '編集中の間取りデータは破棄されます。よろしいですか？';
        return e.returnValue;
    }
});

// 3. サッシ・ドア（建具）の中心グリッド吸着補正
function snapOpeningCenterToGrid(wx, wy, widthP) {
    const pitch = state.modulePitch || 910;
    const fl = state.floors[state.currentFloor];
    const target = snapPointToNearestWallEdge(wx, wy);

    // 壁上の直近グリッド中心点（0.5グリッド = 455mm単位で中心を吸着）
    if (target.wall) {
        const wl = target.wall;
        const isHoriz = Math.abs(wl.y1 - wl.y2) < 0.05;
        if (isHoriz) {
            const snappedCenterX = Math.round(wx / 0.5) * 0.5;
            target.snappedX = snappedCenterX - widthP / 2;
            target.snappedY = wl.y1;
        } else {
            const snappedCenterY = Math.round(wy / 0.5) * 0.5;
            target.snappedX = wl.x1;
            target.snappedY = snappedCenterY - widthP / 2;
        }
    }
    return target;
}

// 4. 住宅設備の壁吸着（左/中/右基点）＆ 離れ寸法計算
// findNearestWallForFixture は input_controller.js の単一実装を使用


// グローバル公開
window.createNewPlan = createNewPlan;
window.toggleFullscreenMode = toggleFullscreenMode;
window.dismissFullscreenPrompt = dismissFullscreenPrompt;



// ============================================================================
// 壁閉ループ自動認識 ＆ 部屋生成マネージャー (Phase 4)
// ============================================================================

function triggerAutoRoomDetection() {
    if (!window.RoomDetector || typeof window.RoomDetector.detectRoomsFromWalls !== 'function') return;

    const fl = state.floors[state.currentFloor];
    if (!fl.walls || fl.walls.length < 3) {
        // 壁が足りない場合は自動検出部屋のみクリア（手動部屋は保持）
        fl.rooms = (fl.rooms || []).filter(r => !r.isAutoDetected);
        request2DRedraw();
        updateAllMetricsAnd3D();
        return;
    }

    const manualRooms = (fl.rooms || []).filter(r => !r.isAutoDetected);
    const existingAutoRooms = (fl.rooms || []).filter(r => r.isAutoDetected);

    const detected = window.RoomDetector.detectRoomsFromWalls(fl.walls, existingAutoRooms, state.modulePitch || 910);

    // 既存の手動部屋（オーバーレイ系を除く）と同一位置・同規模の自動検出部屋が重複生成されないよう除外
    const overlayTypes = new Set(['VOID', 'TENJO', 'KOAGARI', 'TATAMI']);
    const nonOverlayManuals = manualRooms.filter(mr => !overlayTypes.has((mr.type || '').toUpperCase()));
    const dedupedDetected = detected.filter(ar => {
        const ac = ar.centroid || { x: ar.x + ar.w / 2, y: ar.y + ar.h / 2 };
        const aArea = (typeof getRoomAreaM2 === 'function') ? getRoomAreaM2(ar) : (ar.areaM2 || (ar.w * ar.h));
        return !nonOverlayManuals.some(mr => {
            const mc = mr.centroid || { x: mr.x + mr.w / 2, y: mr.y + mr.h / 2 };
            const mArea = (typeof getRoomAreaM2 === 'function') ? getRoomAreaM2(mr) : (mr.areaM2 || (mr.w * mr.h));
            const areaDiffRatio = aArea > 0 ? Math.abs(mArea - aArea) / aArea : 1;
            if (areaDiffRatio > 0.25) return false;
            if (Math.hypot(ac.x - mc.x, ac.y - mc.y) < 0.5) return true;
            if (Array.isArray(ar.points) && ar.points.length >= 3 && window.RoomDetector.isPointInsidePolygon(mc, ar.points)) return true;
            return (ac.x >= mr.x && ac.x <= mr.x + mr.w && ac.y >= mr.y && ac.y <= mr.y + mr.h);
        });
    });

    fl.rooms = [...manualRooms, ...dedupedDetected];

    updateAllMetricsAnd3D();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
}

// 部屋名パレット定義
const ROOM_NAME_PRESETS = [
    { label: 'LDK', type: 'LDK', color: 'rgba(254, 243, 199, 0.65)' },
    { label: 'リビング', type: 'LIVING', color: 'rgba(254, 243, 199, 0.65)' },
    { label: 'ダイニング', type: 'DINING', color: 'rgba(254, 243, 199, 0.65)' },
    { label: 'キッチン', type: 'KITCHEN_RM', color: 'rgba(224, 242, 254, 0.65)' },
    { label: '主寝室', type: 'BEDROOM', color: 'rgba(237, 233, 254, 0.65)' },
    { label: '洋室', type: 'CHILD_ROOM', color: 'rgba(243, 232, 255, 0.65)' },
    { label: '和室', type: 'JAPANESE', color: 'rgba(220, 252, 231, 0.65)' },
    { label: '玄関', type: 'ENTRANCE', color: 'rgba(254, 226, 226, 0.65)' },
    { label: '洗面室', type: 'WASHROOM', color: 'rgba(207, 250, 254, 0.65)' },
    { label: '浴室', type: 'BATHROOM', color: 'rgba(224, 242, 254, 0.65)' },
    { label: 'トイレ', type: 'TOILET', color: 'rgba(254, 242, 242, 0.65)' },
    { label: 'WIC', type: 'CLOSET', color: 'rgba(241, 245, 249, 0.65)' },
    { label: 'パントリー', type: 'STORAGE', color: 'rgba(241, 245, 249, 0.65)' },
    { label: '納戸', type: 'STORAGE', color: 'rgba(241, 245, 249, 0.65)' },
    { label: 'ホール・廊下', type: 'HALLWAY', color: 'rgba(248, 250, 252, 0.65)' },
    { label: '書斎', type: 'BEDROOM', color: 'rgba(243, 232, 255, 0.65)' },
    { label: 'バルコニー', type: 'BALCONY', color: 'rgba(240, 253, 244, 0.65)' },
    { label: '吹抜', type: 'VOID', color: 'rgba(254, 243, 199, 0.35)' }
];

function setRoomPresetName(roomId, preset) {
    const fl = state.floors[state.currentFloor];
    const rm = fl.rooms.find(r => r.id === roomId);
    if (!rm) return;

    rm.name = preset.label;
    rm.type = preset.type;
    rm.color2d = preset.color;
    saveHistorySnapshot();
    renderPropertyInspector();
    request2DRedraw();
    if (typeof rebuild3DScene === 'function') rebuild3DScene();
    showToast(`部屋名を「${preset.label}」に設定しました`);
}

function updateCustomRoomName(roomId, customName) {
    const fl = state.floors[state.currentFloor];
    const rm = fl.rooms.find(r => r.id === roomId);
    if (!rm) return;

    rm.name = customName.trim();
    saveHistorySnapshot();
    request2DRedraw();
}

window.triggerAutoRoomDetection = triggerAutoRoomDetection;
window.setRoomPresetName = setRoomPresetName;
window.updateCustomRoomName = updateCustomRoomName;
window.ROOM_NAME_PRESETS = ROOM_NAME_PRESETS;

// Global Window Export for Backward Compatibility
if (typeof window !== 'undefined') {
    window.updateCurrentPlanBadge = updateCurrentPlanBadge;
    window.createNewPlan = createNewPlan;
    window.saveAsNewPlan = saveAsNewPlan;
    window.toggleFullscreenMode = toggleFullscreenMode;
    window.dismissFullscreenPrompt = dismissFullscreenPrompt;
    window.snapOpeningCenterToGrid = snapOpeningCenterToGrid;
    window.triggerAutoRoomDetection = triggerAutoRoomDetection;
    window.setRoomPresetName = setRoomPresetName;
    window.updateCustomRoomName = updateCustomRoomName;
    window.ROOM_NAME_PRESETS = ROOM_NAME_PRESETS;
}
