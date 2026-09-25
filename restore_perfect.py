import json
import re

transcript_path = 'C:/Users/user/.gemini/antigravity-ide/brain/414b531b-ed86-4379-8ec8-968a76c5e635/.system_generated/logs/transcript_full.jsonl'

steps = [448, 452, 456]
contents = {}

with open(transcript_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if i in steps:
            obj = json.loads(line)
            contents[i] = obj.get('content', '')

# For each step, parse line_number: line_content
lines_map = {}
for s in steps:
    raw = contents.get(s, '')
    for l in raw.split('\n'):
        m = re.match(r'^(\d+):\s(.*)$', l)
        if m:
            ln = int(m.group(1))
            txt = m.group(2)
            lines_map[ln] = txt

sorted_line_numbers = sorted(lines_map.keys())
print(f"Extracted line range: {min(sorted_line_numbers)} to {max(sorted_line_numbers)} (total {len(lines_map)} unique lines)")

full_text = []
for ln in range(min(sorted_line_numbers), max(sorted_line_numbers) + 1):
    if ln in lines_map:
        full_text.append(lines_map[ln])

with open("perfect_restored_article.html", "w", encoding="utf-8") as out:
    out.write('\n'.join(full_text))

print(f"Wrote perfect_restored_article.html (total {len(full_text)} lines)")
