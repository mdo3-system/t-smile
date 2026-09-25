import json

with open('C:/Users/user/.gemini/antigravity-ide/brain/414b531b-ed86-4379-8ec8-968a76c5e635/.system_generated/logs/transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if i in [17, 133, 238, 325, 333]:
            obj = json.loads(line)
            tool_calls = obj.get('tool_calls', [])
            content = obj.get('content', '')
            print(f"Line {i}: tool_calls={tool_calls[:1]}")
            if len(content) > 0:
                print(f"  Content snippet: {content[:100]}...")
