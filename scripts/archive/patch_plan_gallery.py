# -*- coding: utf-8 -*-
"""
Patch plan-gallery.js with:
1. Search filter: floor_count and tsubo ONLY; show ALL matching plans
2. Hero slider: Prev / Next plan buttons in header
3. Under slider: Memo textarea + 'この図面を家カルテに登録' button
4. Keyword slots + architectural advice modal
"""

import sys

with open('public/js/plan-gallery.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add currentSearchConditions variable at top
target_var = "  let sliderPos = 50; // 0 - 100%"
replacement_var = "  let sliderPos = 50; // 0 - 100%\n  let currentSearchConditions = null;"
if target_var in content and "let currentSearchConditions" not in content:
    content = content.replace(target_var, replacement_var, 1)
    print("1. Added currentSearchConditions variable.")

# 2. Update runAiPlanMatching
old_run_matching = """  // AI間取りマッチング処理 (全323件のplans.jsonから最適なプランを選別)
  function runAiPlanMatching() {
    const cond = getStep1Conditions();

    // スコアリング
    const scoredPlans = allPlans.map(plan => {
      let score = 70; // 基礎点

      // 1. 階数一致
      if (plan.floor_count === cond.floorCount) {
        score += 15;
      } else {
        score -= 20;
      }

      // 2. 坪数範囲
      if (plan.total_tsubo >= cond.minTsubo && plan.total_tsubo <= cond.maxTsubo) {
        score += 15;
      } else {
        const diff = Math.min(Math.abs(plan.total_tsubo - cond.minTsubo), Math.abs(plan.total_tsubo - cond.maxTsubo));
        score -= Math.min(25, diff * 3);
      }

      // 3. 玄関方位
      if (cond.direction !== 'すべて') {
        if (plan.entrance_direction === cond.direction) {
          score += 12;
        } else {
          score -= 10;
        }
      }

      // 4. 寸法適合
      if (plan.max_width_m <= cond.maxWidth && plan.max_depth_m <= cond.maxDepth) {
        score += 8;
      } else {
        score -= 15;
      }

      // 5. LDK広さ
      if (cond.minLdk > 0) {
        if (plan.ldk_tatami >= cond.minLdk) {
          score += 10;
        } else {
          score -= 10;
        }
      }

      // 6. キッチン形状
      if (cond.kitchen !== 'すべて') {
        if (plan.kitchen_type === cond.kitchen) {
          score += 10;
        } else {
          score -= 5;
        }
      }

      // 7. こだわりタグ一致
      let tagMatchCount = 0;
      cond.features.forEach(feat => {
        if ((plan.tags || []).includes(feat)) {
          tagMatchCount++;
          score += 6;
        }
      });

      // 適合率（パーセント化）
      const matchPercent = Math.min(99, Math.max(65, Math.round(score)));

      return {
        ...plan,
        matchScore: matchPercent,
        tagMatchCount
      };
    });

    // スコア順にソート
    scoredPlans.sort((a, b) => b.matchScore - a.matchScore);

    // 上位候補 4プランを選出
    currentMatchedPlans = scoredPlans.slice(0, 4);

    // Step 2 へ画面遷移
    goToStep2(cond, currentMatchedPlans);
  }"""

new_run_matching = """  // AI間取りマッチング処理 (階数と広さのみで選別、全件表示)
  function runAiPlanMatching() {
    const cond = getStep1Conditions();
    currentSearchConditions = cond;

    // 検索は「階数」と「広さ」のみで厳密に選別
    let matched = allPlans.filter(plan => {
      const matchFloor = plan.floor_count === cond.floorCount;
      const matchTsubo = plan.total_tsubo >= cond.minTsubo && plan.total_tsubo <= cond.maxTsubo;
      return matchFloor && matchTsubo;
    });

    // 該当なしの場合は同じ階数の近似坪数プランをフォールバック提示
    if (matched.length === 0) {
      matched = allPlans.filter(plan => plan.floor_count === cond.floorCount);
      matched.sort((a, b) => {
        const diffA = Math.min(Math.abs(a.total_tsubo - cond.minTsubo), Math.abs(a.total_tsubo - cond.maxTsubo));
        const diffB = Math.min(Math.abs(b.total_tsubo - cond.minTsubo), Math.abs(b.total_tsubo - cond.maxTsubo));
        return diffA - diffB;
      });
    } else {
      // 延床面積（坪数）順にソート
      matched.sort((a, b) => a.total_tsubo - b.total_tsubo);
    }

    // 表示用スコア付与
    matched = matched.map((plan, idx) => ({
      ...plan,
      matchScore: Math.max(88, 99 - idx)
    }));

    // ★ 全件表示 (制限なし)
    currentMatchedPlans = matched;

    // Step 2 へ画面遷移
    goToStep2(cond, currentMatchedPlans);
  }"""

if old_run_matching in content:
    content = content.replace(old_run_matching, new_run_matching, 1)
    print("2. Replaced runAiPlanMatching.")
else:
    print("WARNING: old_run_matching pattern not matched directly.")

# 3. Update goToStep2 summary and badge
old_go_to_step2_summary = """    // 条件要約テキストの更新
    const summaryText = document.getElementById('fp-selected-summary-text');
    if (summaryText) {
      const floorStr = cond.floorCount === 1 ? '平屋' : cond.floorCount === 2 ? '2階建て' : '3階建(小屋裏含)';
      summaryText.textContent = `選択条件: ${floorStr} ｜ ${cond.sizeLabel} ｜ ${cond.direction} ｜ LDK${cond.minLdk > 0 ? cond.minLdk + '帖+' : '指定無'} ｜ ${cond.kitchen} ｜ こだわり${cond.features.length}点`;
    }"""

new_go_to_step2_summary = """    // 条件要約テキストの更新
    const summaryText = document.getElementById('fp-selected-summary-text');
    if (summaryText) {
      const floorStr = cond.floorCount === 1 ? '平屋' : cond.floorCount === 2 ? '2階建て' : '3階建て';
      summaryText.textContent = `選択条件: ${floorStr} ｜ ${cond.sizeLabel}（該当: 全 ${matchedPlans.length} 件）`;
    }

    const badgeTotal = document.getElementById('fp-matched-total-badge');
    if (badgeTotal) {
      badgeTotal.textContent = `全 ${matchedPlans.length} 件`;
    }"""

if old_go_to_step2_summary in content:
    content = content.replace(old_go_to_step2_summary, new_go_to_step2_summary, 1)
    print("3. Replaced goToStep2 summary.")

# 4. In goToStep2, also call initMadoriKeywordSlots()
old_init_accord = "    // 全プラン展開アコーディオンの準備\n    initAllPlansAccordion(cond);"
new_init_accord = "    // 間取りキーワードスロット初期化\n    initMadoriKeywordSlots();\n\n    // 全プラン展開アコーディオンの準備\n    initAllPlansAccordion(cond);"
if old_init_accord in content:
    content = content.replace(old_init_accord, new_init_accord, 1)
    print("4. Added initMadoriKeywordSlots call in goToStep2.")

with open('public/js/plan-gallery.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Pass 1 complete.")
