/**
 * equipment-presets.js
 * 単一責任の原則 (SRP): 住宅設備機器（キッチン・システムバス・洗面化粧台・トイレ・階段）の規格寸法プリセットおよび設備パレットデータの管理
 */
(function(window) {
  'use strict';

  const BubbleEquipmentPresets = {
    /**
     * 設備パレット用マスター定義 (矩形配置・単体機器ブロック)
     */
    getMasterList: function() {
      return {
        i2550: {
          type: 'kitchen',
          name: 'キッチン I型2550',
          wMm: 2550,
          hMm: 650,
          tatami: 1.0,
          color: '#f59e0b',
          spec: '間口2550×奥行650mm（パナソニック ラクシーナ / クリナップ ステディア同等）'
        },
        l2550: {
          type: 'kitchen',
          name: 'キッチン L型',
          wMm: 2550,
          hMm: 1800,
          tatami: 2.8,
          color: '#f59e0b',
          spec: '2550×1800mm（コーナー作業スペース広々・LIXIL シエラS同等）'
        },
        ub1616: {
          type: 'bath',
          name: 'システムバス 1616(1坪)',
          wMm: 1820,
          hMm: 1820,
          tatami: 2.0,
          color: '#06b6d4',
          spec: '1820×1820mm（内寸1600×1600mm・TOTO サザナ / LIXIL リデア同等）'
        },
        ub1620: {
          type: 'bath',
          name: 'システムバス 1620(1.25坪)',
          wMm: 1820,
          hMm: 2275,
          tatami: 2.5,
          color: '#06b6d4',
          spec: '1820×2275mm（洗い場ゆったり・TOTO サザナ 1620同等）'
        },
        w750: {
          type: 'washroom',
          name: '洗面化粧台 W750',
          wMm: 750,
          hMm: 550,
          tatami: 0.3,
          color: '#2dd4bf',
          spec: '間口750×奥行550mm（1ボウル・TOTO サクア / Panasonic シーライン同等）'
        },
        w1600: {
          type: 'washroom',
          name: '洗面カウンター W1600',
          wMm: 1600,
          hMm: 550,
          tatami: 0.5,
          color: '#2dd4bf',
          spec: '間口1600×奥行550mm（2ボウルまたはワイドカウンター・Panasonic ウツクシーズ同等）'
        },
        bio_fireplace: {
          type: 'equipment',
          name: 'バイオエタノール暖炉',
          wMm: 910,
          hMm: 455,
          tatami: 0.25,
          color: '#f97316',
          spec: '煙突不要・煤ゼロの環境配慮型バイオエタノール暖炉 (離隔500mm不燃仕上げ)'
        },
        tankless: {
          type: 'toilet',
          name: 'タンクレストイレ',
          wMm: 800,
          hMm: 1200,
          tatami: 0.6,
          color: '#a855f7',
          spec: '幅800×奥行1200mm（TOTO ネオレスト / LIXIL サティス同等）'
        },
        counter: {
          type: 'toilet',
          name: 'トイレ手洗いカウンター',
          wMm: 450,
          hMm: 250,
          tatami: 0.1,
          color: '#a855f7',
          spec: '間口450×奥行250mm（埋込・壁付手洗いキャビネット）'
        }
      };
    },

    /**
     * 選択された部屋ノードに対応する規格寸法プリセット
     * @param {Object} node 部屋ノード
     * @param {Boolean} isStairsNode 階段判定フラグ
     */
    getForNode: function(node, isStairsNode) {
      if (!node) return null;
      const name = (node.name || '');
      const cat = (node.type || '');

      // ① システムキッチン (I型2550, I型2400, I型2100, アイランド型, L型2550)
      if (name.includes('キッチン') || cat === 'kitchen' || cat === 'ldk') {
        return {
          title: '🍳 システムキッチン (規格寸法)',
          presets: [
            { label: 'I型 2550 (標準)', wMm: 2550, hMm: 650, desc: '大手メーカー標準255cmタイプ (D650)' },
            { label: 'I型 2400 (ややコンパクト)', wMm: 2400, hMm: 650, desc: 'マンション・狭小240cmタイプ (D650)' },
            { label: 'I型 2100 (コンパクト)', wMm: 2100, hMm: 650, desc: '平屋・セカンドキッチン210cmタイプ (D650)' },
            { label: 'アイランド型 2550', wMm: 2550, hMm: 900, desc: '回遊動線・フルフラット対面 (D900)' },
            { label: 'L型 2550×1800', wMm: 2550, hMm: 1800, desc: 'コーナー作業・L型2550×1800mm' }
          ]
        };
      }

      // ② システムバス・ユニットバス (1616, 1618, 1620)
      if (name.includes('風呂') || name.includes('浴室') || cat === 'bath') {
        return {
          title: '🛁 システムバス (規格寸法)',
          presets: [
            { label: 'UB 1616 (1坪標準)', wMm: 1820, hMm: 1820, desc: '戸建て標準1坪タイプ (内寸1.6×1.6m)' },
            { label: 'UB 1618 (1.15坪メーター)', wMm: 1820, hMm: 2000, desc: 'メーターモジュール対応 (内寸1.6×1.8m)' },
            { label: 'UB 1620 (1.25坪広々)', wMm: 1820, hMm: 2275, desc: '洗い場ゆったり (内寸1.6×2.0m)' }
          ]
        };
      }

      // ③ システム洗面化粧台 (シングルW750, ダブルW1600, W900, W1200)
      if (name.includes('洗面') || name.includes('脱衣') || cat === 'washroom') {
        return {
          title: '🪞 システム洗面化粧台 (規格寸法)',
          presets: [
            { label: 'シングルボウル W750', wMm: 750, hMm: 550, desc: '標準75cmタイプ (D550)' },
            { label: 'ダブルボウル W1600', wMm: 1600, hMm: 550, desc: '朝の混雑解消 2ボウル並列 (D550)' },
            { label: 'ワイドシングル W900', wMm: 900, hMm: 550, desc: 'ゆったりカウンター90cm (D550)' },
            { label: 'ホテルライク W1200', wMm: 1200, hMm: 550, desc: 'ドレッサー兼用120cm (D550)' }
          ]
        };
      }

      // ④ トイレ (タンクレストイレ基本)
      if (name.includes('トイレ') || name.includes('便所') || cat === 'toilet') {
        return {
          title: '🚽 トイレ (タンクレストイレ規格)',
          presets: [
            { label: 'タンクレス標準 (0.5坪)', wMm: 910, hMm: 1820, desc: 'TOTOネオレスト/サティス (910×1820)' },
            { label: '手洗い別・コンパクト (0.4坪)', wMm: 850, hMm: 1365, desc: '省スペース設計 (850×1365)' },
            { label: '広々バリアフリー (0.75坪)', wMm: 1365, hMm: 1820, desc: '車椅子・手すり・介助対応' }
          ]
        };
      }

      // ⑤ 階段 (回り階段1坪、直階段スリム/ゆったり、折り返し1.25坪)
      if (isStairsNode) {
        return {
          title: '🪜 階段室 (規格モジュール)',
          presets: [
            { label: '回り階段 (1坪標準)', wMm: 1820, hMm: 1820, desc: 'U字/かね折れ 1坪タイプ (1820×1820)' },
            { label: '直階段 (スリム)', wMm: 910, hMm: 2730, desc: 'ストレート直階段 (910×2730)' },
            { label: '直階段 (緩やか)', wMm: 910, hMm: 3185, desc: '緩やか勾配 (910×3185)' },
            { label: '折り返し階段 (1.25坪)', wMm: 1820, hMm: 2275, desc: '踊り場付き安全動線 (1820×2275)' }
          ]
        };
      }

      return null;
    }
  };

  window.BubbleEquipmentPresets = BubbleEquipmentPresets;
})(window);
