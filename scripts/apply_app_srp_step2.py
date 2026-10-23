# -*- coding: utf-8 -*-
"""
scripts/apply_app_srp_step2.py
wagama-showcase.js を public/js/app.js から抽出し、public/index.html にタグ追加
"""
import sys

# 1. public/js/app.js 更新
with open('public/js/app.js', 'r', encoding='utf-8') as f:
    app_lines = f.read().splitlines()

cut_start = 2757 # 0-indexed: L2758 (12. CredLayer)
print("Cutting from:", app_lines[cut_start])

rep = [
    '// =========================================================',
    '// --- Extracted Module: wagama-showcase.js ---',
    '// (initCredLayerStudio, initWagamaShowcase, renderWagamaCards are loaded from /js/wagama-showcase.js)',
    '// =========================================================',
    ''
]

new_app_lines = app_lines[:cut_start] + rep

with open('public/js/app.js', 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_app_lines))

print(f"app.js updated: {len(app_lines)} -> {len(new_app_lines)} lines")

# 2. public/index.html 更新
with open('public/index.html', 'r', encoding='utf-8') as f:
    top_lines = f.read().splitlines()

insert_idx = None
for i, line in enumerate(top_lines):
    if '/js/case-gallery.js' in line:
        insert_idx = i + 1
        break

if insert_idx and not any('/js/wagama-showcase.js' in l for l in top_lines):
    top_lines.insert(insert_idx, '  <script src="/js/wagama-showcase.js?v=20261022" defer></script>')
    with open('public/index.html', 'w', encoding='utf-8') as f:
        f.write('\n'.join(top_lines))
    print(f"Added wagama-showcase.js tag to public/index.html at line {insert_idx+1}")
else:
    print("Tag already exists or insert_idx not found")
