import json
import re

transcript_path = 'C:/Users/user/.gemini/antigravity-ide/brain/414b531b-ed86-4379-8ec8-968a76c5e635/.system_generated/logs/transcript_full.jsonl'

# Check step 325 and 380
with open(transcript_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if i in [325, 380]:
            obj = json.loads(line)
            content = obj.get('content', '')
            with open(f"step_{i}_dump.txt", "w", encoding="utf-8") as out:
                out.write(content)
            print(f"Step {i} written, length {len(content)}")
