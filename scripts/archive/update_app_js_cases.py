# -*- coding: utf-8 -*-
"""
scripts/update_app_js_cases.py
public/js/app.js 内の caseStudiesData を、全13邸（プロ撮影実写真・ストーリー）の
最新アーカイブデータと完全同期させるスクリプト。
"""
import os
import json

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
archive_json_path = os.path.join(base_dir, 'public', 'data', 'cases_gallery_archive.json')
app_js_path = os.path.join(base_dir, 'public', 'js', 'app.js')

with open(archive_json_path, 'r', encoding='utf-8') as f:
    archive = json.load(f)

cases_dict = {}
for c in archive['cases']:
    cid = c['id']
    cases_dict[cid] = {
        "title": f"【{c['title']}】{c['catch']}",
        "sub": f"{c['sub']} / プロ撮影 全{c['total_photos']}枚",
        "client": c['client'],
        "carpenter": c['carpenter'],
        "architect": c['architect'],
        "photographer": c['photographer'],
        "photos": [{"url": p['url'], "caption": p['caption']} for p in c['photos']]
    }

cases_js_str = json.dumps(cases_dict, ensure_ascii=False, indent=2)

with open(app_js_path, 'r', encoding='utf-8') as f:
    app_js = f.read()

start_marker = "const caseStudiesData = {"
end_marker = "let currentCaseId = 1;"

pos_start = app_js.find(start_marker)
pos_end = app_js.find(end_marker)

if pos_start != -1 and pos_end != -1:
    new_data_code = f"const caseStudiesData = {cases_js_str};\n\n"
    app_js = app_js[:pos_start] + new_data_code + app_js[pos_end:]
    
    # 01〜13 ゼロパディング修正: `CASE 0${caseId}` -> `CASE ${String(caseId).padStart(2, '0')}`
    app_js = app_js.replace("`CASE 0${caseId}`", "`CASE ${String(caseId).padStart(2, '0')}`")
    
    # さらに、起動時に cases_gallery_archive.json があれば動的マージする拡張を付加
    hook_marker = "function initCaseStudiesGallery() {"
    hook_code = """function initCaseStudiesGallery() {
  // 全13邸プロ写真アーカイブJSONの非同期同期（最新データ反映）
  fetch('/data/cases_gallery_archive.json')
    .then(res => res.json())
    .then(data => {
      if (data && data.cases) {
        data.cases.forEach(c => {
          if (caseStudiesData[c.id]) {
            caseStudiesData[c.id].photographer = c.photographer;
            // 必要に応じて最新写真リストを同期
            if (c.photos && c.photos.length > caseStudiesData[c.id].photos.length) {
              caseStudiesData[c.id].photos = c.photos.map(p => ({ url: p.url, caption: p.caption }));
            }
          }
        });
        loadCase(currentCaseId);
      }
    }).catch(() => {});
"""
    if hook_marker in app_js and "cases_gallery_archive.json" not in app_js:
        app_js = app_js.replace(hook_marker, hook_code)

    with open(app_js_path, 'w', encoding='utf-8') as f:
        f.write(app_js)
    print("SUCCESS: Updated public/js/app.js with all 13 cases!")
else:
    print(f"FAILED: pos_start={pos_start}, pos_end={pos_end}")
