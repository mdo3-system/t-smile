import json

pipe_file = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity\public\data\archix_photographer_pipeline.json"
with open(pipe_file, "r", encoding="utf-8") as f:
    pipe = json.load(f)

lines = []
for item in pipe["cases"]:
    has3D = item.get("has_3d", False)
    badge = '<span style="background: #10b981; color: #fff; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 4px;">✅ 3D配置済み</span>' if has3D else '<span style="background: #f1f5f9; color: #64748b; font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; border: 1px solid #cbd5e1;">⏳ 3D待機中 (.glb/.gltf)</span>'
    photoBadge = f'<span style="background: #e0f2fe; color: #0369a1; font-size: 0.72rem; font-weight: 800; padding: 2px 6px; border-radius: 4px;">📷 写真 {item.get("total_photos", 0)}枚</span>'
    cam = f'<span style="font-size: 0.72rem; color: #475569;">({item.get("camera_note", "")})</span>' if item.get("camera_note") else ""
    
    html = f'''              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding: 8px 4px; gap: 8px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <button type="button" class="btn-select-case-row" data-case="{item['id']}" style="font-size: 0.8rem; font-weight: 800; color: #0284c7; background: none; border: 1px solid #bae6fd; border-radius: 4px; padding: 2px 8px; cursor: pointer;">選択</button>
                  <strong style="color: #0f172a; font-size: 0.85rem;">{item['name']}</strong>
                  {photoBadge}
                  {cam}
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 0.72rem; color: #64748b; font-family: monospace;">raw_source_cases/{item.get('folder', '')}/</span>
                  {badge}
                </div>
              </div>'''
    lines.append(html)

with open(r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity\src\partials\table_rows.html", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
print("Generated table_rows.html successfully.")
