# -*- coding: utf-8 -*-
"""
scripts/apply_madori_srp_step5.py
metrics_calculator.js と input_controller.js を index.html から安全に外部化
"""
import sys

filepath = 'public/madori-sketch/index.html'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

# 1. スクリプトタグ追加 (case_manager.js の直前/直後)
# 依存関係を考慮した順序:
# core/app_state.js -> core/metrics_calculator.js -> renderer/canvas_2d_renderer.js -> ui/ui_inspector.js -> input/input_controller.js -> case/case_manager.js
tag_app_state = None
tag_case_mgr = None
for i, line in enumerate(lines):
    if '/madori-sketch/js/core/app_state.js' in line:
        tag_app_state = i + 1
    if '/madori-sketch/js/case/case_manager.js' in line:
        tag_case_mgr = i

# metrics_calculator.js を app_state.js の直後に挿入
lines.insert(tag_app_state, '    <script src="/madori-sketch/js/core/metrics_calculator.js?v=20261022"></script>')
# input_controller.js を case_manager.js の直前に挿入 (挿入でインデックスが1つずれるので+1)
lines.insert(tag_case_mgr + 1, '    <script src="/madori-sketch/js/input/input_controller.js?v=20261022"></script>')

# 2. インラインスクリプトの切り出し
# Block A: L762 (OVERLAP PREVENTION) から L2248 (computeWallAlignmentRatio の末尾) まで
cut_A_start = None
cut_A_end = None
for i, line in enumerate(lines):
    if 'OVERLAP PREVENTION & SMART PLACEMENT' in line:
        cut_A_start = i - 1
        break

for i in range(cut_A_start, len(lines)):
    if '3D WHITE ARCHITECTURAL MODEL ENGINE' in lines[i]:
        cut_A_end = i - 1
        break


print(f"Cut A range: {cut_A_start} to {cut_A_end}")
print(f"Start A: {lines[cut_A_start]}")
print(f"End A: {lines[cut_A_end-1]}")

rep_A = [
    '// --- Extracted Modules: input_controller.js & metrics_calculator.js ---',
    '// (checkOpeningOverlap, snapPointToNearestWallEdge, pointer events, unified hit-test, inspection handlers, updateAllMetricsAnd3D, isFloorAreaExcludedRoom)',
    ''
]

lines_stepA = lines[:cut_A_start] + rep_A + lines[cut_A_end:]

# Block B: 階段作成システム（L2449相当）から case_manager 参照の前まで
cut_B_start = None
cut_B_end = None
for i, line in enumerate(lines_stepA):
    if '階段作成システム（添付資料準拠の一辺ずつ描くパス入力' in line:
        cut_B_start = i - 1
        break

for i in range(cut_B_start, len(lines_stepA)):
    if 'Extracted Module: case_manager.js' in lines_stepA[i] or '</script>' in lines_stepA[i]:
        cut_B_end = i - 1
        break


print(f"Cut B range: {cut_B_start} to {cut_B_end}")
print(f"Start B: {lines_stepA[cut_B_start]}")
print(f"End B: {lines_stepA[cut_B_end-1]}")

rep_B = [
    '// --- Extracted to input_controller.js (Stair Path & Preset Drawing System) ---',
    ''
]

final_lines = lines_stepA[:cut_B_start] + rep_B + lines_stepA[cut_B_end:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write('\n'.join(final_lines))

print(f"Successfully finished Step 5! Old: {len(lines)} lines, New: {len(final_lines)} lines")
