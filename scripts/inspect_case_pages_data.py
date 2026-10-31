# -*- coding: utf-8 -*-
import sys
import re
import json

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# scripts/build_case_pages.py 内の CASES_DATA を調査
with open("scripts/build_case_pages.py", "r", encoding="utf-8") as f:
    text = f.read()

m = re.search(r'CASES_DATA\s*=\s*\[(.*?)\]\s*\n\s*def', text, re.DOTALL)
if m:
    print("Found CASES_DATA")
    # CASES_DATAを評価
    # 簡易的に各ケースのslug, title, lead, photosを抽出
    cases = re.findall(r'\{\s*"slug":\s*"([^"]+)",\s*"title":\s*"([^"]+)",\s*"town":\s*"([^"]+)",\s*"owner":\s*"([^"]+)"', text)
    for c in cases:
        print(f"Slug: {c[0]} | {c[2]} {c[3]} | {c[1]}")
else:
    print("Could not find CASES_DATA")

