# -*- coding: utf-8 -*-
import sys
import re

if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')

p = r'E:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\speedplanner_touch_pen_edition (1).html'
with open(p, 'r', encoding='utf-8', errors='replace') as f:
    text = f.read()

# タイトル
t_match = re.search(r'<title>(.*?)</title>', text)
print("TITLE:", t_match.group(1) if t_match else "None")

# ボタン一覧
buttons = re.findall(r'<button[^>]*id="([^"]+)"[^>]*>(.*?)</button>', text, re.DOTALL)
print(f"\n--- BUTTONS ({len(buttons)}) ---")
for bid, content in buttons:
    clean_text = ' '.join(re.sub(r'<[^>]+>', ' ', content).split())
    print(f"  [{bid}]: {clean_text}")

# ツールリスト（JSオブジェクトなど）
print("\n--- JAVASCRIPT OBJECTS / CONSTANTS ---")
for const_match in re.finditer(r'(const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(\{.*?\}|\[.*?\]);', text, re.DOTALL):
    name = const_match.group(2)
    val = const_match.group(3)
    if any(k in name.lower() for k in ['room', 'wall', 'preset', 'tool', 'color', 'fixture', 'opening', 'grid', 'mod']):
        print(f"  {name} ({len(val)} chars)")
