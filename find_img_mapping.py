import json
import re

transcript_path = 'C:/Users/user/.gemini/antigravity-ide/brain/414b531b-ed86-4379-8ec8-968a76c5e635/.system_generated/logs/transcript_full.jsonl'

# Search for kaitai image assignments in transcript
found_mappings = []
with open(transcript_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if '/images/kaitai/' in line and ('shutil.copy' in line or 'user_sketch' in line or 'art-ch' in line):
            # check lines
            for sub in line.split('\\n'):
                if '/images/kaitai/' in sub:
                    found_mappings.append(f"Line {i}: {sub[:120]}")

print(f"Found {len(found_mappings)} occurrences:")
for m in found_mappings[:25]:
    print(m)
