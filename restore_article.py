import json
import re

transcript_path = r"C:\Users\user\.gemini\antigravity-ide\brain\414b531b-ed86-4379-8ec8-968a76c5e635\.system_generated\logs\transcript_full.jsonl"

# We want the complete section id="article-feature"
# Let's search lines 450 to 520 for any large block or replacement of article-feature
found_sections = []

with open(transcript_path, "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if "article-feature" in line:
            data = json.loads(line)
            # check tool_calls
            for call in data.get("tool_calls", []):
                args = call.get("args", {})
                for k in ["ReplacementContent", "CodeContent"]:
                    val = args.get(k, "")
                    if '<section id="article-feature"' in val:
                        found_sections.append((i, len(val), val))
            content = data.get("content", "")
            if '<section id="article-feature"' in content:
                found_sections.append((i, len(content), content))

print(f"Found {len(found_sections)} full sections:")
for item in found_sections:
    print(f"Line {item[0]}: length {item[1]}")
    with open(f"section_at_line_{item[0]}.html", "w", encoding="utf-8") as out:
        out.write(item[2])
