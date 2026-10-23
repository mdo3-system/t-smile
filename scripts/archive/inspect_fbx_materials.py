# -*- coding: utf-8 -*-
import os
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

fbx_files = [
    (r"raw_source_cases\ときがわ町 K様邸\小峯優様邸新築工事.fbx", "K様邸"),
    (r"raw_source_cases\鶴ヶ島市 T様邸\田口様邸新築工事.fbx", "T様邸"),
    (r"raw_source_cases\日高市 I様邸\飯塚宗紀様邸新築工事.fbx", "I様邸"),
    (r"raw_source_cases\行田市 H様邸\平野信司様邸新築住宅.fbx", "H様邸")
]

for fp, name in fbx_files:
    if not os.path.exists(fp):
        print(f"{name}: NOT FOUND")
        continue
    print(f"\n==========================================")
    print(f"  {name}: {os.path.basename(fp)} ({os.path.getsize(fp):,} bytes)")
    print(f"==========================================")

    # バイナリまたはASCIIから文字列抽出
    with open(fp, 'rb') as f:
        data = f.read(2000000) # 先頭2MB
    
    # ASCII / Shift-JIS / UTF-8 文字列探索
    materials = set()
    models = set()

    # Material:: や Model:: のパターン
    for match in re.finditer(b'Material::([a-zA-Z0-9_\x80-\xff]+)', data):
        try:
            m_name = match.group(1).decode('shift-jis', errors='ignore')
            materials.add(m_name)
        except Exception:
            pass

    for match in re.finditer(b'Model::([a-zA-Z0-9_\x80-\xff]+)', data):
        try:
            m_name = match.group(1).decode('shift-jis', errors='ignore')
            if len(m_name) > 2:
                models.add(m_name)
        except Exception:
            pass

    print(f"検出マテリアル数: {len(materials)}")
    for m in sorted(list(materials))[:15]:
        print(f"  [Mat] {m}")

    print(f"検出モデル/メッシュ数: {len(models)}")
    window_related = [m for m in models if any(w in m.lower() for w in ['窓', 'サッシ', 'ガラス', '開口', 'win', 'glass', 'sash'])]
    print(f"  窓・サッシ関連メッシュ数: {len(window_related)}")
    for m in window_related[:10]:
        print(f"    - {m}")
