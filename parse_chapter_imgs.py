import json
import re

transcript_path = 'C:/Users/user/.gemini/antigravity-ide/brain/414b531b-ed86-4379-8ec8-968a76c5e635/.system_generated/logs/transcript_full.jsonl'

chapter_imgs = {}

with open(transcript_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'art-ch' in line and ('<img' in line or 'img src' in line):
            obj = json.loads(line)
            # check content and tool_calls
            texts = [obj.get('content', '')]
            for tc in obj.get('tool_calls', []):
                args = tc.get('args', {})
                texts.append(str(args))
            
            combined = '\n'.join(texts)
            for ch in range(1, 11):
                m = re.search(rf'id=["\']art-ch{ch}["\'](.*?)(?=id=["\']art-ch|\Z)', combined, re.DOTALL)
                if m:
                    imgs = re.findall(r'<img[^>]+src=[\\"\']+([^\\"\'>]+)[\\"\']+', m.group(1))
                    if imgs:
                        if ch not in chapter_imgs:
                            chapter_imgs[ch] = set()
                        chapter_imgs[ch].update(imgs)

print("Images per chapter found:")
for ch in range(1, 11):
    print(f"Chapter {ch}: {list(chapter_imgs.get(ch, []))}")
