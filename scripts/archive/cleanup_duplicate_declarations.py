# -*- coding: utf-8 -*-
"""
住ま居る 3D間取りスケッチ工房 (MadoriSketch)
分離モジュール（SRP）とメインソースの重複完全解消スクリプト
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

with open(SRC_HTML, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. ROOM_TYPES, OPENING_TYPES, FIXTURE_TYPES のインライン定義をコメントアウト/参照に置換
# （architectural_specs.js で既に定義されているため、window.ROOM_TYPES等を参照する）
old_defs_start = '// --- Architectural Room Definitions ---'
old_defs_end = '// --- Global App State ---'

s1 = text.find(old_defs_start)
e1 = text.find(old_defs_end)

if s1 != -1 and e1 != -1:
    replaced_defs = """// --- Architectural Room, Opening, Fixture Specifications ---
// (Extracted to /madori-sketch/js/constants/architectural_specs.js)
const ROOM_TYPES = window.ROOM_TYPES;
const OPENING_TYPES = window.OPENING_TYPES;
const FIXTURE_TYPES = window.FIXTURE_TYPES;

"""
    text = text[:s1] + replaced_defs + text[e1:]
    print("✅ Replaced redundant ROOM_TYPES/OPENING_TYPES/FIXTURE_TYPES declarations")

# 2. DXFおよびJSONエクスポートのインライン定義をコメントアウト
# (dxf_exporter.js および json_storage.js で定義済み)
old_io_start = '// ============================================================================\n// STANDARD CAD COMPATIBLE 2D DXF EXPORT (.dxf)'
old_io_end = '// --- Modal Controls ---'

s2 = text.find(old_io_start)
e2 = text.find(old_io_end)

if s2 != -1 and e2 != -1:
    replaced_io = """// ============================================================================
// CAD DXF & JSON PROJECT I/O
// (Extracted to /madori-sketch/js/io/dxf_exporter.js & json_storage.js)
// ============================================================================

"""
    text = text[:s2] + replaced_io + text[e2:]
    print("✅ Removed redundant exportDXF / exportJSON / importJSON declarations")

# 3. 3Dエンジン関連変数の参照整理
# three_3d.js 内で定義されているため、index.source.html 内に重複が残っていないか確認
text = text.replace("const canvas3d = document.getElementById('canvas3d');", "// canvas3d initialized in three_3d.js")

with open(SRC_HTML, 'w', encoding='utf-8') as f:
    f.write(text)

print(f"✅ Successfully cleaned up duplicate declarations in {SRC_HTML}")
