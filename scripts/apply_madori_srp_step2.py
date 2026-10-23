# -*- coding: utf-8 -*-
"""
scripts/apply_madori_srp_step2.py
間取り工房の canvas_2d_renderer.js の安全な外部モジュール化
"""
import sys

filepath = 'public/madori-sketch/index.html'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

# スクリプトタグ追加
insert_tag_idx = None
for i, line in enumerate(lines):
    if '/madori-sketch/js/renderer/three_3d.js' in line:
        insert_tag_idx = i + 1
        break

lines.insert(insert_tag_idx, '    <script src="/madori-sketch/js/renderer/canvas_2d_renderer.js?v=20261022"></script>')

# インラインスクリプトから抽出対象範囲を特定
start_cut_idx = None
end_cut_idx = None
for i, line in enumerate(lines):
    if '2D ARCHITECTURAL CANVAS RENDERER (WITH 1-6 SUB-GRID & UNIFIED WALLS)' in line:
        start_cut_idx = i - 1  # // ==== の行
        break

for i in range(start_cut_idx, len(lines)):
    if '🪜 本格建築図面 階段レンダラー (2D)' in line:
        end_cut_idx = i - 1
        break
    if 'drawStair2D' in lines[i]:
        end_cut_idx = i - 2
        break

print(f"start_cut_idx: {start_cut_idx} ({lines[start_cut_idx] if start_cut_idx else 'None'})")
print(f"end_cut_idx: {end_cut_idx} ({lines[end_cut_idx] if end_cut_idx else 'None'})")

replacement = [
    '// --- Extracted Module: canvas_2d_renderer.js ---',
    '// (snapP, screenToWorldP, worldPToScreen, zoom2D, reset2DCamera, draw2DCanvas, drawGrid2D, drawFloorOnionSkin, drawRoom2D, drawWallSegment2D, drawStandalonePillar2D)',
    ''
]

new_lines = lines[:start_cut_idx] + replacement + lines[end_cut_idx:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print(f"Successfully applied step 2! Old: {len(lines)} lines, New: {len(new_lines)} lines")
