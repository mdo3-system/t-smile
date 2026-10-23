/**
 * carte-storage.js
 * 単一責任の原則 (SRP): 家カルテ連携、IndexedDBストレージ、進行状況自動保存/復元、およびプラン面積・HEAT20概算メトリクス計算
 */
(function(window) {
  'use strict';

  const BubbleCarteStorage = {
    DB_NAME: 'SmileHouseCarteDB',
    STORE_NAME: 'local_carte_files',

    /**
     * IndexedDBを開く
     */
    openDB: function() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(BubbleCarteStorage.DB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(BubbleCarteStorage.STORE_NAME)) {
            db.createObjectStore(BubbleCarteStorage.STORE_NAME, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    },

    /**
     * ファイルレコードをIndexedDBに保存
     */
    saveFileToDB: async function(record) {
      const db = await BubbleCarteStorage.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(BubbleCarteStorage.STORE_NAME, 'readwrite');
        const store = tx.objectStore(BubbleCarteStorage.STORE_NAME);
        store.put(record);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    },

    /**
     * IndexedDBからすべてのファイルを取得
     */
    getAllFilesFromDB: async function() {
      try {
        const db = await BubbleCarteStorage.openDB();
        return new Promise((resolve) => {
          const tx = db.transaction(BubbleCarteStorage.STORE_NAME, 'readonly');
          const store = tx.objectStore(BubbleCarteStorage.STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });
      } catch (e) {
        return [];
      }
    },

    /**
     * IndexedDBから特定ファイルを削除
     */
    deleteFileFromDB: async function(id) {
      const db = await BubbleCarteStorage.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(BubbleCarteStorage.STORE_NAME, 'readwrite');
        const store = tx.objectStore(BubbleCarteStorage.STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    },

    /**
     * IndexedDBの全ファイルをクリア
     */
    clearIndexedDBFiles: async function() {
      const db = await BubbleCarteStorage.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(BubbleCarteStorage.STORE_NAME, 'readwrite');
        const store = tx.objectStore(BubbleCarteStorage.STORE_NAME);
        store.clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    },

    /**
     * localStorage 家カルテリスト取得
     */
    getCarteList: function() {
      try {
        const raw = localStorage.getItem('smile_house_carte_data');
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },

    /**
     * localStorage へプラン進捗を保存
     */
    savePlanProgress: function(studio, silent) {
      if (!studio) return;
      try {
        const state = {
          savedAt: new Date().toISOString(),
          nodes: studio.nodes,
          links: studio.links,
          carNodes: studio.carNodes,
          siteData: studio.siteData,
          currentTier: studio.currentTier,
          buildingType: studio.buildingType,
          renderMode: studio.renderMode,
          currentFloor: studio.currentFloor
        };
        localStorage.setItem('smile_bubble_plan_saved_state', JSON.stringify(state));
        if (!silent) {
          const banner = document.getElementById('bubble-saved-progress-banner');
          if (banner) banner.style.display = 'none';
          alert('💾 間取り作成の進捗を端末に保存しました！\n明日以降も「前回の続きから再開」できます。');
        }
      } catch (e) {
        if (!silent) alert('保存に失敗しました。');
      }
    },

    /**
     * localStorage からプラン進捗を復元
     */
    restorePlanProgress: function(studio) {
      if (!studio) return false;
      try {
        const raw = localStorage.getItem('smile_bubble_plan_saved_state');
        if (!raw) {
          alert('保存された続きデータがありません。');
          return false;
        }
        const state = JSON.parse(raw);
        if (!state) return false;

        if (state.nodes) studio.nodes = state.nodes;
        if (state.links) studio.links = state.links;
        if (state.carNodes) studio.carNodes = state.carNodes;
        if (state.siteData) Object.assign(studio.siteData, state.siteData);
        if (state.currentTier && studio.setInsulationTier) studio.setInsulationTier(state.currentTier);
        if (state.buildingType) studio.buildingType = state.buildingType;
        if (state.renderMode && studio.setRenderMode) studio.setRenderMode(state.renderMode);
        if (state.currentFloor && studio.setFloor) studio.setFloor(state.currentFloor);

        const banner = document.getElementById('bubble-saved-progress-banner');
        if (banner) banner.style.display = 'none';

        for (const n of studio.nodes) {
          studio.calculateRectDimensions(n);
        }
        studio.clampNodesToBuildingBox();
        if (studio.detectInnerCornersAndMerged) studio.detectInnerCornersAndMerged();

        studio.selectedItem = studio.nodes.find(n => n.floor === studio.currentFloor) || null;
        studio.selectedType = studio.selectedItem ? 'node' : 'none';
        studio.updateNodeInspectPanel(studio.selectedItem);
        studio.updateMetrics();

        const d = new Date(state.savedAt);
        const dateStr = isNaN(d) ? '' : `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
        alert(`📂 前回の続き（${dateStr} 保存データ）を復元しました！\n引き続き間取りづくりをお楽しみください。`);
        return true;
      } catch (e) {
        console.error('復元エラー:', e);
        alert('復元に失敗しました。');
        return false;
      }
    },

    /**
     * プラン面積・坪数・HEAT20概算メトリクス計算
     */
    calculateMetrics: function(nodes, isOutdoorFn) {
      let f1Sqm = 0, f2Sqm = 0, f3Sqm = 0, f4Sqm = 0;
      let totalSqm = 0;
      let ldkTatami = 0;

      for (const n of nodes) {
        if (isOutdoorFn && isOutdoorFn(n)) continue;

        let sqm = 0;
        if (n.wMm && n.hMm) {
          sqm = (n.wMm * n.hMm) / 1000000;
        } else {
          sqm = (n.tatami || 4.5) * 1.6562;
        }

        if (n.floor === 1) f1Sqm += sqm;
        else if (n.floor === 2) f2Sqm += sqm;
        else if (n.floor === 3) f3Sqm += sqm;
        else if (n.floor === 4) f4Sqm += sqm;

        totalSqm += sqm;

        if (n.type === 'ldk') {
          ldkTatami += (n.tatami || 0);
        }
      }

      const totalTsubo = +(totalSqm / 3.30578).toFixed(1);
      const f1Tsubo = +(f1Sqm / 3.30578).toFixed(1);
      const f2Tsubo = +(f2Sqm / 3.30578).toFixed(1);
      const f3Tsubo = +(f3Sqm / 3.30578).toFixed(1);
      const f4Tsubo = +(f4Sqm / 3.30578).toFixed(1);

      return {
        totalSqm: +totalSqm.toFixed(1),
        totalTsubo,
        f1Tsubo,
        f2Tsubo,
        f3Tsubo,
        f4Tsubo,
        ldkTatami: +ldkTatami.toFixed(1)
      };
    }
  };

  window.BubbleCarteStorage = BubbleCarteStorage;
})(window);
