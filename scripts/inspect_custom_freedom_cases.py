# -*- coding: utf-8 -*-
import sys
import re

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

with open("scripts/build_custom_freedom_page.py", "r", encoding="utf-8") as f:
    text = f.read()

# cases = [ ... ] の中身を探す
m = re.search(r'cases\s*=\s*\[(.*?)\]\s*\n\s*cards_html', text, re.DOTALL)
if m:
    cases_raw = m.group(1)
    print("Found cases list. Length:", len(cases_raw))
    # 各要素を抽出
    items = re.findall(r'\{\s*"id":\s*(\d+).*?"slug":\s*"([^"]+)".*?"title":\s*"([^"]+)".*?"image":\s*"([^"]+)".*?"other_claim":\s*"([^"]+)".*?"solution":\s*"([^"]+)"', cases_raw, re.DOTALL)
    for it in items:
        print(f"[{it[0]}] {it[1]} ({it[2]}):")
        print(f"   Image: {it[3]}")
        print(f"   Claim: {it[4]}")
        print(f"   Solution: {it[5]}")
        print("-" * 50)
else:
    print("Could not find cases list")

