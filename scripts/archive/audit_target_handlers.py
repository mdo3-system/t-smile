# -*- coding: utf-8 -*-
import sys

with open('public/js/app.head.js', 'r', encoding='utf-8') as f:
    head_js = f.read()

with open('public/js/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

print(f"app.head.js has data-target handler: {'data-target' in head_js}")
print(f"app.js has data-target handler: {'data-target' in app_js}")

import re
matches = re.findall(r'(\[data-target\][^{]*\{[^}]*\})', app_js)
for m in matches[:5]:
    print("Match in app.js:", m[:150])

matches_head = re.findall(r'(\[data-target\][^{]*\{[^}]*\})', head_js)
for m in matches_head[:5]:
    print("Match in head_js:", m[:150])
