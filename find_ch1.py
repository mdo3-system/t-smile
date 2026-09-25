import json
import re

transcript_path = 'C:/Users/user/.gemini/antigravity-ide/brain/414b531b-ed86-4379-8ec8-968a76c5e635/.system_generated/logs/transcript_full.jsonl'

# Find steps that viewed index.html around lines 500-600
with open(transcript_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'art-ch1' in line and 'index.html' in line:
            obj = json.loads(line)
            print(f"Step {i}: type={obj.get('type')}")
