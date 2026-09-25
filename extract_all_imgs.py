import json
import re

transcript_path = 'C:/Users/user/.gemini/antigravity-ide/brain/414b531b-ed86-4379-8ec8-968a76c5e635/.system_generated/logs/transcript_full.jsonl'

matches = {}
with open(transcript_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'id="art-ch' in line:
            # find all chapters and their img tags
            for ch in range(1, 11):
                pattern = rf'id="art-ch{ch}"(.*?)(?=id="art-ch|\Z)'
                m = re.search(pattern, line, re.DOTALL)
                if m:
                    imgs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', m.group(1))
                    if imgs:
                        matches[ch] = imgs

print("Discovered image mappings by chapter:")
for ch, imgs in sorted(matches.items()):
    print(f"Chapter {ch}: {imgs}")
