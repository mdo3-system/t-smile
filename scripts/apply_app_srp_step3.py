# -*- coding: utf-8 -*-
"""
scripts/apply_app_srp_step3.py
floorplan-studio.js を public/js/app.js から抽出し、public/index.html にタグ追加
"""
import sys

# 1. public/js/app.js 更新
with open('public/js/app.js', 'r', encoding='utf-8') as f:
    app_lines = f.read().splitlines()

cut_start = 953  # 0-indexed: L954 (9. AI Floor Plan Generation Studio)
cut_end = 2525    # 0-indexed: L2526 (10. 24/365 AI Building Physics)

print(f"Cutting from L{cut_start+1} to L{cut_end}")
print("Start line:", app_lines[cut_start])
print("End line:", app_lines[cut_end-1])
print("Next line:", app_lines[cut_end])

rep = [
    '// =========================================================',
    '// --- Extracted Module: floorplan-studio.js ---',
    '// (initFloorPlanStudio, executeAgentChat, renderMultiFloorStudio, renderRoomCards, initArchiXPresetStudio are loaded from /js/floorplan-studio.js)',
    '// =========================================================',
    ''
]

new_app_lines = app_lines[:cut_start] + rep + app_lines[cut_end:]

with open('public/js/app.js', 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_app_lines))

print(f"app.js updated: {len(app_lines)} -> {len(new_app_lines)} lines")

# 2. public/index.html 更新
with open('public/index.html', 'r', encoding='utf-8') as f:
    top_lines = f.read().splitlines()

insert_idx = None
for i, line in enumerate(top_lines):
    if '/js/app.js' in line:
        insert_idx = i + 1
        break

if insert_idx and not any('/js/floorplan-studio.js' in l for l in top_lines):
    top_lines.insert(insert_idx, '  <script src="/js/floorplan-studio.js?v=20261022" defer></script>')
    with open('public/index.html', 'w', encoding='utf-8') as f:
        f.write('\n'.join(top_lines))
    print(f"Added floorplan-studio.js tag to public/index.html at line {insert_idx+1}")
else:
    print("Tag already exists or insert_idx not found")
