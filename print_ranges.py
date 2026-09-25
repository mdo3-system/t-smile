import json
import re

transcript_path = 'C:/Users/user/.gemini/antigravity-ide/brain/414b531b-ed86-4379-8ec8-968a76c5e635/.system_generated/logs/transcript_full.jsonl'

with open(transcript_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'Showing lines' in line and 'index.html' in line:
            obj = json.loads(line)
            content = obj.get('content', '')
            m = re.search(r'Showing lines (\d+) to (\d+)', content)
            if m:
                print(f"Step {i}: lines {m.group(1)} to {m.group(2)}")
