# -*- coding: utf-8 -*-
"""
住ま居る 3D間取りスケッチ工房 (MadoriSketch)
Three.js 3D模型レンダラーのSRPモジュール抽出スクリプト
"""

import os
import sys

if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_HTML = os.path.join(BASE_DIR, 'src', 'madori-sketch', 'index.source.html')
OUT_JS = os.path.join(BASE_DIR, 'src', 'madori-sketch', 'js', 'renderer', 'three_3d.js')

with open(SRC_HTML, 'r', encoding='utf-8') as f:
    text = f.read()

start_marker = '// ============================================================================\n// 3D WHITE ARCHITECTURAL MODEL ENGINE (THREE.JS WITH OPENING CUTOUTS & NO WALL PILLARS)\n// ============================================================================'
end_marker = '// ============================================================================\n// STANDARD CAD COMPATIBLE 2D DXF EXPORT (.dxf)\n// ============================================================================'

s_idx = text.find(start_marker)
e_idx = text.find(end_marker)

if s_idx == -1 or e_idx == -1:
    raise ValueError("Could not find start or end marker in index.source.html")

raw_3d_code = text[s_idx:e_idx].strip()

# IIFEモジュールとしてラッピング
three_module_code = f"""/**
 * 住ま居る 3D間取りスケッチ工房 (MadoriSketch)
 * 3D建築ホワイトモデルレンダラー (Single Responsibility: Three.js 3D Architectural White Engine)
 * CSG壁開口くり抜き・床スラブ・柱・建具・設備・屋根の3D生成およびワンタップ黄金比アングル制御を担当
 */
(function() {{
    'use strict';

{raw_3d_code}

    // グローバル公開インターフェース
    window.init3DEngine = init3DEngine;
    window.rebuild3DModel = rebuild3DModel;
    window.render3D = render3D;
    window.update3DCameraTransform = update3DCameraTransform;
    window.set3DViewPreset = set3DViewPreset;
    window.get3DScene = function() {{ return scene3d; }};
    window.get3DCamera = function() {{ return camera3d; }};
    window.get3DRenderer = function() {{ return renderer3d; }};
}})();
"""

with open(OUT_JS, 'w', encoding='utf-8') as f:
    f.write(three_module_code)

print(f"✅ Created three_3d.js: {OUT_JS} ({len(three_module_code)} bytes)")

# index.source.html 側の置換（抽出箇所をコメント化し、scriptタグを追加）
replacement_comment = """// ============================================================================
// 3D WHITE ARCHITECTURAL MODEL ENGINE (THREE.JS) - EXTRACTED TO MODULE:
// /madori-sketch/js/renderer/three_3d.js
// ============================================================================"""

new_html = text[:s_idx] + replacement_comment + "\n\n" + text[e_idx:]

# scriptタグの読み込みに追加
old_script_tags = '<script src="/madori-sketch/js/integration/carte_bridge.js?v=20261021"></script>'
new_script_tags = old_script_tags + '\n    <script src="/madori-sketch/js/renderer/three_3d.js?v=20261021"></script>'

new_html = new_html.replace(old_script_tags, new_script_tags, 1)

with open(SRC_HTML, 'w', encoding='utf-8') as f:
    f.write(new_html)

print(f"✅ Updated index.source.html: removed inline 3D engine, imported three_3d.js")
