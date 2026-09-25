import json
import re

transcript_path = 'C:/Users/user/.gemini/antigravity-ide/brain/414b531b-ed86-4379-8ec8-968a76c5e635/.system_generated/logs/transcript_full.jsonl'

lines_to_extract = [731, 733, 737, 741]
extracted_chunks = {}

with open(transcript_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if i in lines_to_extract:
            obj = json.loads(line)
            content = obj.get('content', '')
            extracted_chunks[i] = content

for idx in lines_to_extract:
    content = extracted_chunks.get(idx, '')
    # Strip tool header info up to "The following code has been modified..."
    lines = content.split('\n')
    clean_lines = []
    started = False
    for l in lines:
        if re.match(r'^\d+:\s', l):
            started = True
            # remove line number prefix "123: "
            unprefixed = re.sub(r'^\d+:\s', '', l)
            clean_lines.append(unprefixed)
        elif started:
            clean_lines.append(l)
    with open(f"original_clean_view_{idx}.html", "w", encoding="utf-8") as out:
        out.write('\n'.join(clean_lines))
    print(f"Dumped view {idx}: {len(clean_lines)} lines")
