# -*- coding: utf-8 -*-
"""
scripts/apply_madori_srp_step1.py
間取り工房の app_state.js と ui_inspector.js の安全な外部モジュール化
"""
import os

filepath = 'public/madori-sketch/index.html'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

# スクリプトタグの開始行を探す
start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if '/madori-sketch/js/constants/architectural_specs.js' in line:
        start_idx = i
        break

# インラインスクリプト開始行
script_open_idx = None
for i in range(start_idx, start_idx + 15):
    if lines[i].strip() == '<script>':
        script_open_idx = i
        break

# 抽出終了行: "// 2D ARCHITECTURAL CANVAS RENDERER"
split_target_idx = None
for i in range(script_open_idx, len(lines)):
    if '2D ARCHITECTURAL CANVAS RENDERER' in lines[i]:
        split_target_idx = i - 1
        break

print(f"start_idx: {start_idx}, script_open_idx: {script_open_idx}, split_target_idx: {split_target_idx}")

new_script_tags = [
    '    <script src="/madori-sketch/js/constants/architectural_specs.js?v=20261022"></script>',
    '    <script src="/madori-sketch/js/core/app_state.js?v=20261022"></script>',
    '    <script src="/madori-sketch/js/io/json_storage.js?v=20261022"></script>',
    '    <script src="/madori-sketch/js/integration/carte_bridge.js?v=20261022"></script>',
    '    <script src="/madori-sketch/js/geometry/room_detector.js?v=20261022"></script>',
    '    <script src="/madori-sketch/js/renderer/three_3d.js?v=20261022"></script>',
    '    <script src="/madori-sketch/js/ui/ui_inspector.js?v=20261022"></script>',
    '    <script>'
]

# インラインスクリプトの冒頭（定数参照・3D変数定義）
# "// --- Architectural Room, Opening, Fixture Specifications ---" から "// --- Global App State ---" の前まで
head_inline = lines[script_open_idx + 1 : script_open_idx + 18]

# 置換後の構成
new_lines = (
    lines[:start_idx] +
    new_script_tags +
    head_inline +
    [
        '// --- Extracted Modules: app_state.js & ui_inspector.js ---',
        'const state = window.state;',
        ''
    ] +
    lines[split_target_idx:]
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print(f"Successfully updated! Old line count: {len(lines)}, New line count: {len(new_lines)}")
