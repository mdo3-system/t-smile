import json
import re

transcript_path = r"C:\Users\user\.gemini\antigravity-ide\brain\414b531b-ed86-4379-8ec8-968a76c5e635\.system_generated\logs\transcript_full.jsonl"

# We want each chapter's latest content.
# Each chapter is bounded by:
# <div id="art-chX" class="art-tab-content..."> ... </div> (matching closing div)

chapter_latest = {i: {"step": -1, "content": ""} for i in range(1, 11)}

with open(transcript_path, "r", encoding="utf-8") as f:
    for line_num, line in enumerate(f):
        if "art-ch" not in line:
            continue
        try:
            data = json.loads(line)
            # check tool_calls
            texts = []
            for call in data.get("tool_calls", []):
                args = call.get("args", {})
                for k in ["ReplacementContent", "CodeContent", "TargetContent"]:
                    if args.get(k):
                        texts.append(args[k])
            if data.get("content"):
                texts.append(data["content"])

            for text in texts:
                for ch_num in range(1, 11):
                    # look for <div id="art-ch{ch_num}"
                    pattern = r'(<div id="art-ch' + str(ch_num) + r'"[\s\S]*?)(?=<div id="art-ch\d+"|</section>|$)'
                    matches = re.finditer(pattern, text)
                    for m in matches:
                        c_str = m.group(1).strip()
                        # Verify it has substance
                        if f'第{ch_num}章' in c_str and len(c_str) > 300:
                            # ensure it closes with </div>
                            if not c_str.endswith('</div>'):
                                c_str += '\n        </div>'
                            chapter_latest[ch_num]["step"] = line_num
                            chapter_latest[ch_num]["content"] = c_str
        except Exception as e:
            pass

print("Latest found for each chapter:")
for ch_num in range(1, 11):
    info = chapter_latest[ch_num]
    print(f"Chapter {ch_num}: line {info['step']}, length {len(info['content'])}")
    with open(f"ch_{ch_num}_final.html", "w", encoding="utf-8") as f:
        f.write(info['content'])
