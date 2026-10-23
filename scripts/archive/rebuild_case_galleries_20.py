# -*- coding: utf-8 -*-
import os
import json
import urllib.parse

base_dir = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity"
raw_base = os.path.join(base_dir, "raw_source_cases")
archive_path = os.path.join(base_dir, "public", "data", "cases_gallery_archive.json")
app_js_path = os.path.join(base_dir, "public", "js", "app.js")
app_min_js_path = os.path.join(base_dir, "public", "js", "app.min.js")

with open(archive_path, "r", encoding="utf-8") as f:
    data = json.load(f)

cases = data.get("cases", [])

# 1. 鳩山町 T様邸 (Case 7)
hatoyama_dir = os.path.join(raw_base, "鳩山町 T様邸")
hatoyama_selected = [
    # 外観・玄関
    "1_外観・玄関/IMG_0001.jpg",
    "1_外観・玄関/IMG_0006.jpg",
    "1_外観・玄関/IMG_0019.jpg",
    "1_外観・玄関/IMG_0030.jpg",
    # リビング・ダイニング
    "2_リビング・ダイニング/IMG_0045.jpg",
    "2_リビング・ダイニング/IMG_0048.jpg",
    "2_リビング・ダイニング/IMG_0055.jpg",
    "2_リビング・ダイニング/IMG_0060.jpg",
    "2_リビング・ダイニング/IMG_0070.jpg",
    "2_リビング・ダイニング/IMG_0075.jpg",
    # キッチン・洗面・水回り
    "3_キッチン・洗面・バス/IMG_0090.jpg",
    "3_キッチン・洗面・バス/IMG_0095.jpg",
    "3_キッチン・洗面・バス/IMG_0102.jpg",
    "3_キッチン・洗面・バス/IMG_0110.jpg",
    # 寝室・ロフト
    "4_寝室・ロフト/IMG_0120.jpg",
    "4_寝室・ロフト/IMG_0125.jpg",
    "4_寝室・ロフト/IMG_0135.jpg",
    # 2F洋室・ホール
    "5_2F洋室・ホール/IMG_0140.jpg",
    "5_2F洋室・ホール/IMG_0148.jpg",
    "5_2F洋室・ホール/IMG_0155.jpg"
]

# Verify and fallback if files don't match exact names
def find_valid_photos(folder, target_count=20):
    res = []
    for root, dirs, files in os.walk(folder):
        for f in files:
            if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                rel = os.path.relpath(os.path.join(root, f), folder).replace('\\', '/')
                res.append(rel)
    # Pick target_count evenly
    if len(res) <= target_count:
        return res
    step = len(res) / float(target_count)
    return [res[int(i * step)] for i in range(target_count)]

hatoyama_photos = find_valid_photos(hatoyama_dir, 20)
print(f"Hatoyama valid photos: {len(hatoyama_photos)}")

# 2. 行田市 H様邸 (Case 6)
gyoda_dir = os.path.join(raw_base, "行田市 H様邸")
gyoda_photos = find_valid_photos(gyoda_dir, 20)
print(f"Gyoda valid photos: {len(gyoda_photos)}")

for c in cases:
    cid = c.get("id")
    title = c.get("title", "")
    
    if "鳩山" in title or cid == 7:
        c["photos"] = []
        for rel in hatoyama_photos:
            encoded = urllib.parse.quote(f"鳩山町 T様邸/{rel}")
            c["photos"].append({
                "url": f"/raw_case_photo/{encoded}",
                "caption": f"【大工手刻み・住まい】鳩山町・T様邸 - プロ撮影高精細写真"
            })
    elif "行田" in title or cid == 6:
        c["photos"] = []
        for rel in gyoda_photos:
            encoded = urllib.parse.quote(f"行田市 H様邸/{rel}")
            c["photos"].append({
                "url": f"/raw_case_photo/{encoded}",
                "caption": f"【大工手刻み・住まい】行田市・H様邸 - プロ撮影高精細写真"
            })
    else:
        # 他の邸も確実に20枚以内へ
        if len(c.get("photos", [])) > 20:
            step = len(c["photos"]) / 20.0
            c["photos"] = [c["photos"][int(i * step)] for i in range(20)]
            
    c["total_photos"] = len(c["photos"])
    # サブタイトル内の枚数表記を「全20枚」に統一
    sub = c.get("sub", "")
    if "プロ撮影" in sub:
        # replace any "全...枚" with "厳選20枚"
        import re
        c["sub"] = re.sub(r'全\d+枚', f"厳選{len(c['photos'])}枚", sub)
    print(f"Case {cid}: {title} -> {len(c['photos'])}枚")

# Save cases_gallery_archive.json
data["cases"] = [c for c in cases if c.get("id") != 13 and "萩原" not in c.get("title", "")]
data["total_cases"] = len(data["cases"])
data["total_photos_count"] = sum(c["total_photos"] for c in data["cases"])

with open(archive_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Saved {archive_path} with {len(data['cases'])} cases.")

# 3. Synchronize app.js caseStudiesData directly
cases_dict = {}
for c in data['cases']:
    cid = c['id']
    cases_dict[cid] = {
        "title": f"【{c['title']}】{c.get('catch', '')}",
        "sub": f"{c.get('sub', '')} / プロ撮影 厳選{len(c['photos'])}枚",
        "client": c.get('client', ''),
        "carpenter": c.get('carpenter', ''),
        "architect": c.get('architect', ''),
        "photographer": c.get('photographer', ''),
        "photos": [{"url": p['url'], "caption": p.get('caption', '')} for p in c['photos']]
    }

cases_js_str = json.dumps(cases_dict, ensure_ascii=False, indent=2)

with open(app_js_path, "r", encoding="utf-8") as f:
    app_js = f.read()

start_marker = "const caseStudiesData = {"
end_marker = "let currentCaseId = 1;"

pos_start = app_js.find(start_marker)
pos_end = app_js.find(end_marker)

if pos_start != -1 and pos_end != -1:
    new_data_code = f"const caseStudiesData = {cases_js_str};\n\n"
    app_js = app_js[:pos_start] + new_data_code + app_js[pos_end:]
    
    with open(app_js_path, "w", encoding="utf-8") as f:
        f.write(app_js)
    print("SUCCESS: Synced app.js caseStudiesData to exactly 20 photos per case!")
else:
    print(f"ERROR: Could not locate caseStudiesData markers in app.js: pos_start={pos_start}, pos_end={pos_end}")
