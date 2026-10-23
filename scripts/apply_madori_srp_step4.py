# -*- coding: utf-8 -*-
"""
scripts/apply_madori_srp_step4.py
2D描画エンジン後半（階段・設備・開口部・寸法線・ペン・ハンドル）を canvas_2d_renderer.js に統合
"""
import sys

# 1. index.htmlから抽出コードを取得
with open('public/madori-sketch/index.html', 'r', encoding='utf-8') as f:
    idx_lines = f.read().splitlines()

start_cut = 758 # 0-indexed: line 759
end_cut = 1532  # 0-indexed: line 1533 (OVERLAP PREVENTION の前)

print(f"Target cutting range: L{start_cut+1} to L{end_cut}")
print("Start line:", idx_lines[start_cut])
print("End line:", idx_lines[end_cut-1])
print("Next line:", idx_lines[end_cut])

extracted_code = idx_lines[start_cut:end_cut]

# 2. canvas_2d_renderer.js に追加
with open('public/madori-sketch/js/renderer/canvas_2d_renderer.js', 'r', encoding='utf-8') as f:
    r_lines = f.read().splitlines()

# windowエクスポートの手前を探す
exp_idx = None
for i, line in enumerate(r_lines):
    if 'Global Window Export' in line:
        exp_idx = i - 1
        break

new_exports = [
    '    window.drawStair2D = drawStair2D;',
    '    window.drawFixture2D = drawFixture2D;',
    '    window.drawOpening2D = drawOpening2D;',
    '    window.drawAutoDimensions2D = drawAutoDimensions2D;',
    '    window.drawStroke2D = drawStroke2D;',
    '    window.drawStamp2D = drawStamp2D;',
    '    window.drawDragPreview2D = drawDragPreview2D;',
    '    window.drawSelectionHandles2D = drawSelectionHandles2D;'
]

# r_linesを更新
r_lines_updated = (
    r_lines[:exp_idx] +
    ['// --- Architectural Element Renderers (Stairs, Fixtures, Openings, Dimensions, Stamps) ---'] +
    extracted_code +
    r_lines[exp_idx:-1] +
    new_exports +
    [r_lines[-1]]
)

with open('public/madori-sketch/js/renderer/canvas_2d_renderer.js', 'w', encoding='utf-8') as f:
    f.write('\n'.join(r_lines_updated))

print(f"canvas_2d_renderer.js updated: {len(r_lines)} -> {len(r_lines_updated)} lines")

# 3. index.html を更新
replacement = [
    '// --- Extracted to canvas_2d_renderer.js (drawStair2D, drawFixture2D, drawOpening2D, drawAutoDimensions2D, drawStroke2D, drawStamp2D, drawDragPreview2D, drawSelectionHandles2D) ---',
    ''
]

idx_lines_updated = idx_lines[:start_cut] + replacement + idx_lines[end_cut:]
with open('public/madori-sketch/index.html', 'w', encoding='utf-8') as f:
    f.write('\n'.join(idx_lines_updated))

print(f"index.html updated: {len(idx_lines)} -> {len(idx_lines_updated)} lines")
