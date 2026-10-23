# -*- coding: utf-8 -*-
"""
scripts/apply_bubble_srp.py
BubblePlanStudio (bubble-plan.js) のSRPリファクタリング適用スクリプト
1. 末尾の重複コード (L4749以降の重複定義) を安全に除去
2. BubbleEquipmentPresets, BubbleSiteGeometry, BubbleCarteStorage, BubblePhysicsEngine への委譲構造を確立
3. 外部互換性を100%保持
"""
import sys

def main():
    with open("public/js/bubble-plan.js.bak", "r", encoding="utf-8") as f:
        content = f.read()

    # 1. 重複ブロックの特定と除去
    # L4749 付近の重複 `// 12. 住宅設備機器パレット（大手メーカー規格寸法で直接配置）` から始まる部分をクリーンアップ
    duplicate_marker = """  // ==========================================
  // 12. 住宅設備機器パレット（大手メーカー規格寸法で直接配置）
  // ==========================================
  getEquipmentPresets() {
    return {
      i2550: {"""
    
    parts = content.split(duplicate_marker)
    if len(parts) >= 2:
        print("Found duplicate marker! Cleaning duplicate block...")
        # 1つ目のパーツを残し、末尾の必要な初期化部分（updateCarteBadge, Global instance）のみを接合
        first_part = parts[0]
        # 重複ブロックの後にあった末尾部分を復元
        # 末尾のグローバルインスタンス初期化
        footer_block = """
  async updateCarteBadge() {
    if (window.BubbleCarteStorage) {
      const list = BubbleCarteStorage.getCarteList();
      const localFiles = await BubbleCarteStorage.getAllFilesFromDB();
      const total = list.length + localFiles.length;

      const badge = document.getElementById('carte-badge-count');
      if (badge) badge.textContent = total;

      const topBadge = document.getElementById('my-carte-badge-count');
      if (topBadge) topBadge.textContent = total;
    }
  }
}

// Global instance
window.bubblePlanInstance = null;

function initBubblePlan() {
  if (!window.bubblePlanInstance) {
    window.bubblePlanInstance = new BubblePlanStudio();
    window.bubbleStudioInstance = window.bubblePlanInstance;
    window.bubblePlanInstance.init();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initBubblePlan();
});
"""
        new_content = first_part + duplicate_marker + parts[1].split("  async updateCarteBadge()")[0] + footer_block
    else:
        new_content = content

    # 2. BubbleSiteGeometry への委譲 (calculateBuildingBoundingBoxPrecise, clampNodesToBuildingBox)
    # calculateCarDimensions
    old_calc_car = """  calculateCarDimensions(car) {
    const pxPerMm = (this.baseBuildingBox && this.baseBuildingBox.pxPerMm) ? this.baseBuildingBox.pxPerMm : 0.032;
    car.w = Math.round(car.wMm * pxPerMm);
    car.h = Math.round(car.hMm * pxPerMm);
    car.radius = Math.round(Math.hypot(car.w, car.h) / 2);
  }"""
    new_calc_car = """  calculateCarDimensions(car) {
    if (window.BubbleSiteGeometry) {
      const pxPerMm = (this.baseBuildingBox && this.baseBuildingBox.pxPerMm) ? this.baseBuildingBox.pxPerMm : 0.032;
      window.BubbleSiteGeometry.calculateCarDimensions(car, pxPerMm);
    } else {
      const pxPerMm = (this.baseBuildingBox && this.baseBuildingBox.pxPerMm) ? this.baseBuildingBox.pxPerMm : 0.032;
      car.w = Math.round(car.wMm * pxPerMm);
      car.h = Math.round(car.hMm * pxPerMm);
      car.radius = Math.round(Math.hypot(car.w, car.h) / 2);
    }
  }"""
    if old_calc_car in new_content:
        new_content = new_content.replace(old_calc_car, new_calc_car)
        print("Delegated calculateCarDimensions to BubbleSiteGeometry.")

    # 3. BubblePhysicsEngine への委譲 (updatePhysics)
    old_update_physics_snippet = """  updatePhysics() {
    const activeNodes = this.nodes.filter(n => n.floor === this.currentFloor);
    const { minX, maxX, minY, maxY } = this.baseBuildingBox;"""

    new_update_physics_snippet = """  updatePhysics() {
    const activeNodes = this.nodes.filter(n => n.floor === this.currentFloor);
    if (window.BubblePhysicsEngine && this.baseBuildingBox) {
      window.BubblePhysicsEngine.update(activeNodes, this.baseBuildingBox, this.carNodes, this.renderMode, this.draggedItem);
      return;
    }
    const { minX, maxX, minY, maxY } = this.baseBuildingBox;"""

    if old_update_physics_snippet in new_content:
        new_content = new_content.replace(old_update_physics_snippet, new_update_physics_snippet)
        print("Delegated updatePhysics to BubblePhysicsEngine.")

    # 4. BubbleEquipmentPresets への委譲 (getEquipmentPresets(node))
    old_get_eq_node = """  getEquipmentPresets(node) {
    if (!node) return null;
    const name = (node.name || '');
    const cat = (node.type || '');

    // ① システムキッチン"""

    new_get_eq_node = """  getEquipmentPresets(node) {
    if (node && window.BubbleEquipmentPresets) {
      return window.BubbleEquipmentPresets.getForNode(node, this.isStairs(node));
    }
    if (!node) return null;
    const name = (node.name || '');
    const cat = (node.type || '');

    // ① システムキッチン"""

    if old_get_eq_node in new_content:
        new_content = new_content.replace(old_get_eq_node, new_get_eq_node)
        print("Delegated getEquipmentPresets(node) to BubbleEquipmentPresets.")

    # 5. 書き出し
    with open("public/js/bubble-plan.js", "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"Updated public/js/bubble-plan.js successfully. New length: {len(new_content.splitlines())} lines.")

if __name__ == '__main__':
    main()
