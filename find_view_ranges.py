import json

with open('C:/Users/user/.gemini/antigravity-ide/brain/414b531b-ed86-4379-8ec8-968a76c5e635/.system_generated/logs/transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'Showing lines' in line:
            obj = json.loads(line)
            content = obj.get('content', '')
            # check lines range
            if 'Showing lines' in content and 'index.html' in content:
                first_line = content.split('\n')[2] if len(content.split('\n')) > 2 else ''
                print(f"Line {i}: {first_line}")
                for cl in content.split('\n')[:8]:
                    if 'Showing lines' in cl:
                        print(f"   -> {cl}")
