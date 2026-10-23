/**
 * site-geometry.js
 * 単一責任の原則 (SRP): 敷地測量図、都市計画・用途地域判定、民法境界離隔(65cm)、車両切り欠き、建物最大外郭枠およびノードクランプ幾何計算
 */
(function(window) {
  'use strict';

  const BubbleSiteGeometry = {
    /**
     * 車両ブロックの寸法（ピクセル/mm）を計算
     */
    calculateCarDimensions: function(car, pxPerMm) {
      const scale = pxPerMm || 0.03;
      const effW = car.isVertical ? car.wMm : car.hMm;
      const effH = car.isVertical ? car.hMm : car.wMm;
      car.w = Math.round(effW * scale);
      car.h = Math.round(effH * scale);
      car.marginPx = Math.round((car.marginMm || 200) * scale);
      car.radius = Math.round(Math.hypot(car.w, car.h) / 2);
    },

    /**
     * 敷地測量図と離隔から建物最大外郭枠（BoundingBox）を精密計算
     */
    calculateBuildingBoundingBox: function(width, height, siteData, carNodes) {
      const cw = width || 800;
      const ch = height || 520;

      const siteWMm = siteData.siteWidthMm || 12000;
      const siteDMm = siteData.siteDepthMm || 15000;
      const boundaryMarginMm = siteData.boundaryMarginMm || 650; // 隣地離隔 (650〜200mm)
      const roadMarginMm = siteData.roadMarginMm || 200;         // 道路側離隔は標準20cm (200mm)
      const road = siteData.roadDirection || 'south';

      const canvasPadX = 70;
      const canvasPadY = 50;
      const availW = cw - canvasPadX * 2;
      const availH = ch - canvasPadY * 2;

      const scaleX = availW / siteWMm;
      const scaleY = availH / siteDMm;
      const pxPerMm = Math.min(scaleX, scaleY);

      const siteCanvasW = Math.round(siteWMm * pxPerMm);
      const siteCanvasH = Math.round(siteDMm * pxPerMm);
      const siteLeft = Math.round((cw - siteCanvasW) / 2);
      const siteTop = Math.round((ch - siteCanvasH) / 2);

      const siteBox = {
        minX: siteLeft,
        maxX: siteLeft + siteCanvasW,
        minY: siteTop,
        maxY: siteTop + siteCanvasH
      };

      // 基本建築可能境界（隣地離隔 ＆ 道路側20cm）
      let buildLeftMm = boundaryMarginMm;
      let buildRightMm = siteWMm - boundaryMarginMm;
      let buildTopMm = boundaryMarginMm;
      let buildBottomMm = siteDMm - boundaryMarginMm;

      if (road === 'south') buildBottomMm = siteDMm - roadMarginMm;
      else if (road === 'north') buildTopMm = roadMarginMm;
      else if (road === 'east') buildRightMm = siteWMm - roadMarginMm;
      else if (road === 'west') buildLeftMm = roadMarginMm;

      const buildWMm = Math.max(3640, buildRightMm - buildLeftMm);
      const buildDMm = Math.max(3640, buildBottomMm - buildTopMm);

      const minX = Math.round(siteLeft + buildLeftMm * pxPerMm);
      const maxX = Math.round(siteLeft + buildRightMm * pxPerMm);
      const minY = Math.round(siteTop + buildTopMm * pxPerMm);
      const maxY = Math.round(siteTop + buildBottomMm * pxPerMm);

      const baseBuildingBox = {
        minX, maxX, minY, maxY,
        widthMm: buildWMm, depthMm: buildDMm, pxPerMm
      };

      // 各車のピクセル寸法を再計算し、敷地内にクランプ
      if (Array.isArray(carNodes)) {
        for (const car of carNodes) {
          BubbleSiteGeometry.calculateCarDimensions(car, pxPerMm);
          const halfW = car.w / 2;
          const halfH = car.h / 2;
          car.x = Math.max(siteLeft + halfW, Math.min(siteLeft + siteCanvasW - halfW, car.x));
          car.y = Math.max(siteTop + halfH, Math.min(siteTop + siteCanvasH - halfH, car.y));
        }
      }

      return { siteBox, baseBuildingBox };
    },

    /**
     * 部屋ノードを建物外郭枠および車両離隔内にクランプ拘束
     */
    clampNodesToBox: function(nodes, baseBuildingBox, carNodes) {
      if (!baseBuildingBox || !Array.isArray(nodes)) return;
      const { minX, maxX, minY, maxY } = baseBuildingBox;
      const pxPerMm = baseBuildingBox.pxPerMm || 0.032;

      for (const n of nodes) {
        // PH(4階)は自由描画許可
        if (n.floor === 4) continue;

        const halfW = (n.w || 60) / 2;
        const halfH = (n.h || 50) / 2;

        // 基本外郭枠拘束
        n.x = Math.max(minX + halfW, Math.min(maxX - halfW, n.x));
        n.y = Math.max(minY + halfH, Math.min(maxY - halfH, n.y));

        // 車両からの離隔拘束（2F/3Fは車庫上キャンチ910mm許容）
        if (Array.isArray(carNodes)) {
          for (const car of carNodes) {
            let margin = car.isBuiltin ? Math.round(300 * pxPerMm) : (car.marginPx || 8);
            if (n.floor >= 2) {
              const cantPx = Math.round(910 * pxPerMm);
              margin = margin - cantPx;
            }

            const carHalfW = Math.max(0, car.w / 2 + margin);
            const carHalfH = Math.max(0, car.h / 2 + margin);
            if (carHalfW <= 0 || carHalfH <= 0) continue;

            const dx = n.x - car.x;
            const dy = n.y - car.y;
            const overlapX = (halfW + carHalfW) - Math.abs(dx);
            const overlapY = (halfH + carHalfH) - Math.abs(dy);

            if (overlapX > 0 && overlapY > 0) {
              if (overlapX < overlapY) {
                n.x += (dx > 0 ? 1 : -1) * overlapX;
              } else {
                n.y += (dy > 0 ? 1 : -1) * overlapY;
              }
            }
          }
        }
      }
    }
  };

  window.BubbleSiteGeometry = BubbleSiteGeometry;
})(window);
