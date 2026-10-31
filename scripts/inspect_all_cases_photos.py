# -*- coding: utf-8 -*-
import json
import os
import sys
sys.path.insert(0, ".")
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from scripts.data.approved_case_captions import APPROVED_CASE_CAPTIONS

cases_master = json.load(open("scripts/data/cases_master.json", encoding="utf-8"))

for cid in sorted(cases_master.keys(), key=lambda x: int(x)):
    cdata = cases_master[cid]
    slug = cdata["slug"]
    title = cdata["title"]
    catch = cdata.get("catch", "")
    caps = APPROVED_CASE_CAPTIONS.get(slug, {})
    
    # フォルダ内の実際の画像ファイルを取得
    case_img_dir = os.path.join("public", "images", "cases", slug)
    imgs = sorted([f for f in os.listdir(case_img_dir) if f.endswith(".webp") and not f.startswith("thumb") and not f.startswith("mini")])
    
    print(f"=== Case {cid}: {slug} ({title}) ===")
    print(f"Catch: {catch}")
    # photo_01〜photo_05のキャプションを表示
    for i in range(1, 6):
        key = f"photo_{i:02d}"
        if key in caps:
            img_file = imgs[i-1] if i-1 < len(imgs) else "N/A"
            print(f"  {key} ({img_file}): {caps[key][0]}")
            print(f"       Desc: {caps[key][1][:50]}...")
