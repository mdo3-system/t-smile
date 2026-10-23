# -*- coding: utf-8 -*-
"""
scripts/apply_madori_srp_step3.py
間取り工房の case_manager.js の安全な外部モジュール化
"""
import sys

filepath = 'public/madori-sketch/index.html'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

# スクリプトタグ追加 (ui_inspector.js の直後)
insert_idx = None
for i, line in enumerate(lines):
    if '/madori-sketch/js/ui/ui_inspector.js' in line:
        insert_idx = i + 1
        break

if insert_idx is not None:
    lines.insert(insert_idx, '    <script src="/madori-sketch/js/case/case_manager.js?v=20261022"></script>')

start_cut = None
end_cut = None
for i, line in enumerate(lines):
    if '案件管理' in line and '同期システム' in line:
        start_cut = i
        break

for i in range(start_cut, len(lines)):
    if '</script>' in lines[i]:
        end_cut = i
        break

print(f"Cut range: {start_cut} to {end_cut}")
print(f"Start: {lines[start_cut]}")
print(f"End: {lines[end_cut]}")

replacement = [
    '// --- Extracted Module: case_manager.js ---',
    '// (updateCurrentPlanBadge, createNewPlan, saveAsNewPlan, toggleFullscreenMode, dismissFullscreenPrompt, snapOpeningCenterToGrid, findNearestWallForFixture, triggerAutoRoomDetection, setRoomPresetName, updateCustomRoomName are loaded from /madori-sketch/js/case/case_manager.js)',
    ''
]

new_lines = lines[:start_cut] + replacement + lines[end_cut:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print(f"Successfully applied step 3! Old: {len(lines)} lines, New: {len(new_lines)} lines")
