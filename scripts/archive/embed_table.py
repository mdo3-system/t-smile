import os

table_file = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity\src\partials\table_rows.html"
with open(table_file, "r", encoding="utf-8") as f:
    rows_html = f.read()

ai_studio_path = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity\src\partials\section-ai-studio.html"
with open(ai_studio_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """              <div id="case-status-table-container" style="font-size: 0.82rem; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0.6rem 0.8rem;">
                読み込み中...
              </div>"""

replacement = f"""              <div id="case-status-table-container" style="font-size: 0.82rem; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0.6rem 0.8rem; max-height: 380px; overflow-y: auto;">
{rows_html}
              </div>"""

if target in content:
    content = content.replace(target, replacement)
    with open(ai_studio_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Successfully updated section-ai-studio.html with 13 cases table!")
else:
    print("Target not found in section-ai-studio.html")
