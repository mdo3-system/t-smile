import json
import sys

transcript_path = r'C:\Users\user\.gemini\antigravity-ide\brain\ddd425d6-c910-4863-a818-b882f6d58460\.system_generated\logs\transcript.jsonl'
with open(transcript_path, 'r', encoding='utf-8') as f, open(r'e:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity\scripts\transcript_summary.txt', 'w', encoding='utf-8') as out:
    for line in f:
        d = json.loads(line)
        idx = d.get('step_index', 0)
        t = d.get('type')
        if idx >= 620 and t in ('USER_INPUT', 'PLANNER_RESPONSE'):
            content = d.get('content', '')
            out.write(f"=== STEP {idx} ({t}) ===\n")
            out.write(content + "\n\n")
print("Done writing transcript summary")

