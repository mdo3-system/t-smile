import json

archive_path = "public/data/cases_gallery_archive.json"
with open(archive_path, "r", encoding="utf-8") as f:
    data = json.load(f)

cases = data.get("cases", [])
filtered_cases = []

for c in cases:
    # ユーザー指示: 特別実邸・戸田市萩原様邸（Case 13）は施工例からは外していい
    if c.get("id") == 13 or "萩原" in c.get("title", ""):
        print(f"Excluding Case {c.get('id')} ({c.get('title')}) from archive")
        continue

    photos = c.get("photos", [])
    total_before = len(photos)
    
    # 最大20枚程度に厳選（20枚超の場合は間引き）
    if len(photos) > 20:
        # サンプリング：最初と最後を残しつつ均等に20枚抽出
        step = len(photos) / 20.0
        selected_photos = [photos[int(i * step)] for i in range(20)]
        c["photos"] = selected_photos
    
    print(f"Case {c.get('id')}: {c.get('title')[:20]}... {total_before} -> {len(c.get('photos'))}枚")
    filtered_cases.append(c)

data["cases"] = filtered_cases

with open(archive_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Successfully updated cases_gallery_archive.json with max 20 photos per case and Case 13 removed!")
