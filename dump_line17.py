import json

with open('C:/Users/user/.gemini/antigravity-ide/brain/414b531b-ed86-4379-8ec8-968a76c5e635/.system_generated/logs/transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if i == 17:
            obj = json.loads(line)
            content = obj.get('content', '')
            with open("line17_dump.txt", "w", encoding="utf-8") as out:
                out.write(content)
            print(f"Line 17 dumped, length={len(content)}")
            break
