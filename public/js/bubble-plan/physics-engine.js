/**
 * physics-engine.js
 * 単一責任の原則 (SRP): バブルプランの力学シミュレーションループ、反発・引力・減衰および壁面衝突分離計算
 */
(function(window) {
  'use strict';

  const BubblePhysicsEngine = {
    /**
     * 1フレームごとの物理計算実行
     */
    update: function(activeNodes, baseBuildingBox, carNodes, renderMode, draggedItem) {
      if (!Array.isArray(activeNodes) || !baseBuildingBox) return;

      const { minX, maxX, minY, maxY } = baseBuildingBox;
      const pxPerMm = baseBuildingBox.pxPerMm || 0.032;

      // 1. 部屋同士の反発（バブルモード時は重なり・凸凹形状を許容！矩形モード時のみ軽微に反発）
      if (renderMode === 'rect') {
        for (let i = 0; i < activeNodes.length; i++) {
          for (let j = i + 1; j < activeNodes.length; j++) {
            const n1 = activeNodes[i];
            const n2 = activeNodes[j];
            if (n1.isFixed && n2.isFixed) continue;

            const w1 = n1.w || 60;
            const h1 = n1.h || 50;
            const w2 = n2.w || 60;
            const h2 = n2.h || 50;

            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const overlapX = (w1 + w2) / 2 + 4 - Math.abs(dx);
            const overlapY = (h1 + h2) / 2 + 4 - Math.abs(dy);

            if (overlapX > 0 && overlapY > 0) {
              if (overlapX < overlapY) {
                const pushX = (dx > 0 ? 1 : -1) * overlapX * 0.05;
                if (n1 !== draggedItem && !n1.isFixed) n1.vx -= pushX;
                if (n2 !== draggedItem && !n2.isFixed) n2.vx += pushX;
              } else {
                const pushY = (dy > 0 ? 1 : -1) * overlapY * 0.05;
                if (n1 !== draggedItem && !n1.isFixed) n1.vy -= pushY;
                if (n2 !== draggedItem && !n2.isFixed) n2.vy += pushY;
              }
            }
          }
        }
      } else {
        // バブルモード: 楕円・円の重なりによる凸凹形状を許容。中心がほぼ一致した場合のみ微弱に押し出し
        for (let i = 0; i < activeNodes.length; i++) {
          for (let j = i + 1; j < activeNodes.length; j++) {
            const n1 = activeNodes[i];
            const n2 = activeNodes[j];
            if (n1.isFixed && n2.isFixed) continue;
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.hypot(dx, dy) || 1;
            const minDist = 12;
            if (dist < minDist) {
              const push = (minDist - dist) * 0.02;
              const px = (dx / dist) * push;
              const py = (dy / dist) * push;
              if (n1 !== draggedItem && !n1.isFixed) { n1.vx -= px; n1.vy -= py; }
              if (n2 !== draggedItem && !n2.isFixed) { n2.vx += px; n2.vy += py; }
            }
          }
        }
      }

      // 2. 建物基本外郭枠 ＆ 車両ブロック（+離隔20cm）からの拘束
      for (const n of activeNodes) {
        if (n === draggedItem) continue;
        if (n.isFixed) {
          n.vx = 0;
          n.vy = 0;
          continue;
        }

        n.x += n.vx;
        n.y += n.vy;
        n.vx *= 0.35; // 速やかに減衰してピタッと静止
        n.vy *= 0.35;
        if (Math.abs(n.vx) < 0.05) n.vx = 0;
        if (Math.abs(n.vy) < 0.05) n.vy = 0;

        const halfW = (n.w || 60) / 2;
        const halfH = (n.h || 50) / 2;

        // PH(4階)は自由描画許可
        if (n.floor === 4) continue;

        // 基本外郭枠クランプ
        if (n.x - halfW < minX) { n.x = minX + halfW; n.vx = 0; }
        if (n.x + halfW > maxX) { n.x = maxX - halfW; n.vx = 0; }
        if (n.y - halfH < minY) { n.y = minY + halfH; n.vy = 0; }
        if (n.y + halfH > maxY) { n.y = maxY - halfH; n.vy = 0; }

        // 車両からの離隔
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
                n.vx = 0;
              } else {
                n.y += (dy > 0 ? 1 : -1) * overlapY;
                n.vy = 0;
              }
            }
          }
        }
      }
    }
  };

  window.BubblePhysicsEngine = BubblePhysicsEngine;
})(window);
