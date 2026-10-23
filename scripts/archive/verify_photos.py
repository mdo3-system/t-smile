import os
import json

base_cases_dir = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity\raw_source_cases"
pipeline_file = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity\public\data\archix_photographer_pipeline.json"

with open(pipeline_file, "r", encoding="utf-8") as f:
    pipe = json.load(f)

for c in pipe["cases"]:
    folder = c.get("folder", "")
    sample_rel = c.get("sample_photo_rel", "")
    cid = c.get("id")
    if sample_rel:
        full_p = os.path.join(base_cases_dir, folder, sample_rel)
        exists = os.path.exists(full_p)
        sz = os.path.getsize(full_p) if exists else 0
        print(f"{cid} ({folder}): Exists={exists} ({sz/1024/1024:.2f} MB) -> {sample_rel}")
    else:
        print(f"{cid}: NO SAMPLE PHOTO")
