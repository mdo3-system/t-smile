import json

with open('C:/Users/user/.gemini/antigravity-ide/brain/414b531b-ed86-4379-8ec8-968a76c5e635/.system_generated/logs/transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if '【思想宣言】' in line:
            obj = json.loads(line)
            t = obj.get('type')
            s = obj.get('source')
            calls = [c.get('name') for c in obj.get('tool_calls', [])]
            print(f"Line {i}: type={t}, source={s}, calls={calls}")
