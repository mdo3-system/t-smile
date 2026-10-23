import json

transcript_path = r'C:\Users\user\.gemini\antigravity-ide\brain\ddd425d6-c910-4863-a818-b882f6d58460\.system_generated\logs\transcript.jsonl'
with open(transcript_path, 'r', encoding='utf-8') as f, open(r'e:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity\scripts\speedplanner_history.txt', 'w', encoding='utf-8') as out:
    for line in f:
        d = json.loads(line)
        idx = d.get('step_index', 0)
        t = d.get('type')
        content = d.get('content', '')
        if t == 'USER_INPUT' and any(k in content.lower() for k in ['speed', 'planner', 'スライド', '間取り', 'ツール', 'html']):
            out.write(f"=== USER_INPUT (STEP {idx}) ===\n")
            out.write(content + "\n\n")
