# -*- coding: utf-8 -*-
import json
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

with open("scripts/data/cases_master.json", "r", encoding="utf-8") as f:
    cases = json.load(f)

for k, v in cases.items():
    slug = v.get("slug")
    title = v.get("title")
    print(f"Case {k}: slug={slug} | {title}")

