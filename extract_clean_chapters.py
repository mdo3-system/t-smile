import json
import glob
import re

transcript_path = 'C:/Users/user/.gemini/antigravity-ide/brain/414b531b-ed86-4379-8ec8-968a76c5e635/.system_generated/logs/transcript_full.jsonl'

# We want to find the user request that provided the full 10 chapters text, or the assistant step that wrote it clean.
# Let's inspect user messages containing '第1章' or '第10章' or '化学の快適はホテルで'
with open(transcript_path, 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f):
        if '【思想宣言】' in line and '"type":"USER_INPUT"' in line:
            data = json.loads(line)
            content = data.get('content', '')
            print(f"Found user input at line {idx} (len {len(content)}):")
            # Save this content to a file for review
            with open("user_article_raw.txt", "w", encoding="utf-8") as out:
                out.write(content)
            break
