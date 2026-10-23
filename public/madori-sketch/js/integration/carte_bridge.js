/**
 * 住ま居る 3D間取りスケッチ工房 (MadoriSketch)
 * プラットフォーム連携モジュール (Single Responsibility: Carte & Platform Integration Bridge)
 * 施主様専用「家カルテ」への安全保存、LINE通知連携、AI 3Dパース工房ブリッジを担当
 */
(function() {
    'use strict';

    const LINE_CONFIG = {
        ACCOUNT_ID: '@051vqxla',
        ADD_FRIEND_URL: 'https://lin.ee/8fdyyGu',
        CHAT_TITLE: '住ま居る専任スタッフ通知窓口'
    };

    /**
     * 現在の間取りデータを施主様の「家カルテ」に保存 ＆ 3Dプラン選定ライブラリに自動登録・更新
     * @param {Object} options - 現在の作図データとメタ情報
     */
    function savePlanToCarte(options) {
        options = options || {};
        try {
            const raw = localStorage.getItem('smile_house_carte_data');
            const carte = raw ? JSON.parse(raw) : {};
            
            if (!carte.customPlans) carte.customPlans = [];
            
            // 延床面積と階数の取得
            const totalTsubo = options.totalTsubo || document.getElementById('areaTotal_tsubo')?.textContent || '0坪';
            const totalM2 = options.totalM2 || document.getElementById('areaTotal_m2')?.textContent || '0㎡';
            
            // 2Dキャンバスのサムネイル画像を取得
            let thumbUrl = '';
            const cv2d = options.canvas2d || document.getElementById('canvas2d');
            if (cv2d) {
                try {
                    thumbUrl = cv2d.toDataURL('image/jpeg', 0.8);
                } catch(e) {
                    console.warn('[CarteBridge] Failed to capture thumbnail:', e);
                }
            }

            const activePitch = options.pitch || (typeof state !== 'undefined' && state.modulePitch ? state.modulePitch : 910);
            const planDataObj = options.planData || (typeof state !== 'undefined' && state.floors ? state.floors : {});

            // 同一プランIDの維持（復元編集時は同じデータとして更新、新規作成時は新ID）
            if (typeof state !== 'undefined') {
                if (!state.currentPlanId) {
                    state.currentPlanId = 'PLAN-COMM-' + Date.now().toString(36).toUpperCase();
                }
                if (typeof window.updateCurrentPlanBadge === 'function') window.updateCurrentPlanBadge();
            }
            const activePlanId = (typeof state !== 'undefined' && state.currentPlanId) ? state.currentPlanId : ('PLAN-COMM-' + Date.now().toString(36).toUpperCase());

            const planItem = {
                id: activePlanId,
                title: '手描き3D間取りプラン (' + totalTsubo + ' / ' + totalM2 + ')',
                totalTsubo: totalTsubo,
                totalM2: totalM2,
                pitch: activePitch,
                roomsCount: options.roomsCount || 0,
                thumbnail: thumbUrl,
                updatedAt: new Date().toISOString(),
                savedAt: new Date().toISOString(),
                planData: planDataObj
            };
            
            // 家カルテ内の既存プラン上書き、または新規追加
            const existingIdx = carte.customPlans.findIndex(p => p.id === activePlanId);
            if (existingIdx >= 0) {
                carte.customPlans[existingIdx] = planItem;
            } else {
                carte.customPlans.unshift(planItem);
            }
            carte.lastUpdated = new Date().toISOString();
            localStorage.setItem('smile_house_carte_data', JSON.stringify(carte));

            // 🎯 【次にやり変えるためにデータ保存したら登録】
            // 3Dプラン選定ライブラリ（323選＋）にも同一IDで自動更新・永続同期
            let syncedCommunityPlan = null;
            if (typeof window.syncPlanToCommunityLibrary === 'function') {
                syncedCommunityPlan = window.syncPlanToCommunityLibrary(thumbUrl);
            }
            
            alert(`🎉【間取りデータ安全保存完了】\n作成中の間取り（${totalTsubo}）を保存しました！（ID: ${activePlanId}）\n\n🔒【著作権と非公開の保護】\n作成されたプランの著作権はお客様に帰属し、無断で他者に一般公開されることはありません。\n※社内設計プールに安全保管され、当社の設計プロによる選別・監修を経て承認された優良プランのみが展示場ライブラリ（323選＋）に本登録されます。`);
            return true;
        } catch(e) {
            console.error('[CarteBridge] Error saving plan to carte:', e);
            alert('家カルテ保存エラー: ' + e.message);
            return false;
        }
    }

    /**
     * 家カルテから保存済み間取りプランを復元（同じデータとして編集再開）
     */
    function restorePlanFromCarte(planId) {
        try {
            const raw = localStorage.getItem('smile_house_carte_data');
            if (!raw) {
                alert('保存された家カルテデータが見つかりません');
                return false;
            }
            const carte = JSON.parse(raw);
            const target = (carte.customPlans || []).find(p => p.id === planId);
            if (!target || !target.planData) {
                alert('該当のプランデータが見つかりません');
                return false;
            }

            if (typeof state !== 'undefined') {
                state.floors = JSON.parse(JSON.stringify(target.planData));
                state.currentPlanId = target.id; // 同一プランIDを引き継ぎ
                if (typeof window.updateCurrentPlanBadge === 'function') window.updateCurrentPlanBadge();
                if (target.pitch && typeof setModulePitch === 'function') setModulePitch(target.pitch);
                if (typeof ensureFloorsStructure === 'function') ensureFloorsStructure();
                if (typeof saveHistorySnapshot === 'function') saveHistorySnapshot();
                if (typeof renderPropertyInspector === 'function') renderPropertyInspector();
                if (typeof request2DRedraw === 'function') request2DRedraw();
                if (typeof rebuild3DScene === 'function') rebuild3DScene();
                if (typeof closePresetModal === 'function') closePresetModal();

                if (typeof showToast === 'function') {
                    showToast(`📂 プラン「${target.title || target.id}」を復元しました（ID: ${target.id}）。編集後に保存またはパース生成すると同一データとして更新されます`);
                }
            }
            return true;
        } catch(e) {
            console.error('[CarteBridge] Error restoring plan:', e);
            alert('復元エラー: ' + e.message);
            return false;
        }
    }

    /**
     * 保存済み家カルテプラン一覧を取得
     */
    function getCarteCustomPlans() {
        try {
            const raw = localStorage.getItem('smile_house_carte_data');
            if (!raw) return [];
            const carte = JSON.parse(raw);
            return carte.customPlans || [];
        } catch(e) {
            return [];
        }
    }

    /**
     * AI 3Dパース工房（SmileStudio）へ転送
     */
    function openAiStudio() {
        window.open('/smilestudio.html', '_blank');
    }

    /**
     * 公式LINE通知窓口を開く
     */
    function openLineNotice() {
        window.open(LINE_CONFIG.ADD_FRIEND_URL, '_blank');
    }

    // グローバル公開
    window.savePlanToCarte = savePlanToCarte;
    window.restorePlanFromCarte = restorePlanFromCarte;
    window.getCarteCustomPlans = getCarteCustomPlans;
    window.openAiStudio = openAiStudio;
    window.openLineNotice = openLineNotice;
    window.LINE_CONFIG = LINE_CONFIG;
})();
