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
     * 現在の間取りデータを施主様の「家カルテ」に保存
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

            const planItem = {
                id: 'madori_plan_' + Date.now(),
                title: '手描き3D間取りプラン (' + totalTsubo + ' / ' + totalM2 + ')',
                totalTsubo: totalTsubo,
                totalM2: totalM2,
                pitch: activePitch,
                roomsCount: options.roomsCount || 0,
                thumbnail: thumbUrl,
                savedAt: new Date().toISOString(),
                planData: planDataObj
            };
            
            carte.customPlans.unshift(planItem);
            carte.lastUpdated = new Date().toISOString();
            
            localStorage.setItem('smile_house_carte_data', JSON.stringify(carte));
            
            alert('🎉【家カルテ保存完了】\n作成中の3D間取りプラン（' + totalTsubo + '）を家カルテに安全保存しました！\nマイページやご家族の画面からもいつでも再確認・復元できます。');
            return true;
        } catch(e) {
            console.error('[CarteBridge] Error saving plan to carte:', e);
            alert('家カルテ保存エラー: ' + e.message);
            return false;
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
    window.openAiStudio = openAiStudio;
    window.openLineNotice = openLineNotice;
    window.LINE_CONFIG = LINE_CONFIG;
})();
