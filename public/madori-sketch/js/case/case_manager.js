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
        try { localStorage.setItem('smile_active_project_id', state.currentPlanId); } catch(e) {}
    } else {
        txt.textContent = `案件: 新規案件 (未保存)`;
        badge.title = `まだ未保存の新規案件です。保存またはパース生成時に新しい案件IDが発行され、別案件として登録されます。`;
        badge.classList.remove('text-amber-300');
        badge.classList.add('text-slate-400');
        try { localStorage.removeItem('smile_active_project_id'); } catch(e) {}
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
    const icon = document.getElementById('fullscreenIcon');
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            if (icon) icon.className = 'fa-solid fa-compress';
            dismissFullscreenPrompt();
            showToast('全画面モードを開始しました（Escキーまたはボタンで解除）');
        }).catch(err => {
            console.warn('Fullscreen error:', err);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen().then(() => {
                if (icon) icon.className = 'fa-solid fa-expand';
            });
        }
    }
}

function dismissFullscreenPrompt() {
    const banner = document.getElementById('fullscreenPromptBanner');
    if (banner) banner.style.display = 'none';
}

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
function findNearestWallForFixture(fxX, fxY, fxW, fxH) {
    const fl = state.floors[state.currentFloor];
    const pitch = state.modulePitch || 910;
    const clearanceP = (state.subFixtureClearanceMm || 0) / pitch;
    const align = state.subFixtureAlign || 'center';

    let nearest = null;
    let minDist = 1.0; // 1.0マス（約910mm）以内の壁を自動吸着対象とする

    // 既存の壁一覧から探索
    fl.walls.forEach(wl => {
        const isHoriz = Math.abs(wl.y1 - wl.y2) < 0.05;
        if (isHoriz) {
            // 水平壁
            const minX = Math.min(wl.x1, wl.x2);
            const maxX = Math.max(wl.x1, wl.x2);
            if (fxX + fxW >= minX - 0.5 && fxX <= maxX + 0.5) {
                const distTop = Math.abs(fxY - wl.y1);
                const distBottom = Math.abs((fxY + fxH) - wl.y1);
                if (distTop < minDist) {
                    minDist = distTop;
                    nearest = { wall: wl, side: 'top', y: wl.y1 + clearanceP, rot: 0 };
                }
                if (distBottom < minDist) {
                    minDist = distBottom;
                    nearest = { wall: wl, side: 'bottom', y: wl.y1 - fxH - clearanceP, rot: 0 };
                }
            }
        } else {
            // 垂直壁
            const minY = Math.min(wl.y1, wl.y2);
            const maxY = Math.max(wl.y1, wl.y2);
            if (fxY + fxH >= minY - 0.5 && fxY <= maxY + 0.5) {
                const distLeft = Math.abs(fxX - wl.x1);
                const distRight = Math.abs((fxX + fxW) - wl.x1);
                if (distLeft < minDist) {
                    minDist = distLeft;
                    nearest = { wall: wl, side: 'left', x: wl.x1 + clearanceP, rot: 0 };
                }
                if (distRight < minDist) {
                    minDist = distRight;
                    nearest = { wall: wl, side: 'right', x: wl.x1 - fxW - clearanceP, rot: 0 };
                }
            }
        }
    });

    return nearest;
}

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

    fl.rooms = [...manualRooms, ...detected];

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
    window.findNearestWallForFixture = findNearestWallForFixture;
    window.triggerAutoRoomDetection = triggerAutoRoomDetection;
    window.setRoomPresetName = setRoomPresetName;
    window.updateCustomRoomName = updateCustomRoomName;
    window.ROOM_NAME_PRESETS = ROOM_NAME_PRESETS;
}
