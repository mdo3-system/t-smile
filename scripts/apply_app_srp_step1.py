# -*- coding: utf-8 -*-
"""
scripts/apply_app_srp_step1.py
case-gallery.js を public/js/app.js から抽出し、public/index.html にスクリプトタグを追加
"""
import sys

# 1. public/js/app.js の置換
with open('public/js/app.js', 'r', encoding='utf-8') as f:
    app_lines = f.read().splitlines()

start_cut = 2752 # 0-indexed: L2753
end_cut = 4166   # 0-indexed: L4167 (12. CredLayer の前)

print(f"Target range: {start_cut+1} to {end_cut}")
print("Start line:", app_lines[start_cut])
print("End line:", app_lines[end_cut-1])
print("Next line:", app_lines[end_cut])

rep_text = [
    '// =========================================================',
    '// --- Extracted Module: case-gallery.js ---',
    '// (caseStudiesData, initCaseStudiesGallery, selectCase, stepCase, loadCase, applyThumbnailFilter, selectPhoto, stepPhoto, toggleAutoplay, updateMainPhoto are loaded from /js/case-gallery.js)',
    '// =========================================================',
    ''
]

new_app_lines = app_lines[:start_cut] + rep_text + app_lines[end_cut:]

# 競合ツール名コメントの汎用化置換 (RULE遵守)
for i, line in enumerate(new_app_lines):
    if 'ArchiX' in line:
        new_app_lines[i] = line.replace('ArchiX / Rendrery Style Instant Architectural Perspective', '直感的な3Dビュー操作・ワンタップ黄金比アングル ＆ Instant Architectural Perspective')
        print(f"Replaced prohibited name on line {i+1}")

with open('public/js/app.js', 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_app_lines))

print(f"app.js updated: {len(app_lines)} -> {len(new_app_lines)} lines")

# 2. public/index.html にスクリプトタグ追加
with open('public/index.html', 'r', encoding='utf-8') as f:
    top_lines = f.read().splitlines()

insert_idx = None
for i, line in enumerate(top_lines):
    if '/js/app.js' in line:
        insert_idx = i + 1
        break

if insert_idx and not any('/js/case-gallery.js' in l for l in top_lines):
    top_lines.insert(insert_idx, '  <script src="/js/case-gallery.js?v=20261022" defer></script>')
    with open('public/index.html', 'w', encoding='utf-8') as f:
        f.write('\n'.join(top_lines))
    print(f"Added case-gallery.js tag to public/index.html at line {insert_idx+1}")
else:
    print("Script tag already present or insert_idx not found")
