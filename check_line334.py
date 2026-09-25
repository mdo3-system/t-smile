import json

transcript_path = 'C:/Users/user/.gemini/antigravity-ide/brain/414b531b-ed86-4379-8ec8-968a76c5e635/.system_generated/logs/transcript_full.jsonl'

with open(transcript_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if i == 334:
            obj = json.loads(line)
            tool_calls = obj.get('tool_calls', [])
            for c in tool_calls:
                rep = c.get('args', {}).get('ReplacementContent', '')
                for l in rep.split('\n'):
                    if 'img src' in l:
                        print(l.strip())
