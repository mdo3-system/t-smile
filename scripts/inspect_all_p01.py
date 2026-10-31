# -*- coding: utf-8 -*-
import os
import re
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

slugs = ['tokigawa-k', 'yoshimi-o', 'kawagoe-y', 'hidaka-i', 'higashimatsuyama-k', 'gyoda-h', 'hatoyama-t', 'tsurugashima-a', 'tsurugashima-kb', 'tsurugashima-k', 'tsurugashima-s', 'tsurugashima-t']

for slug in slugs:
    p = f"public/cases/{slug}.html"
    with open(p, "r", encoding="utf-8") as f:
        html = f.read()
    
    # photo_01 の ALT
    m = re.search(r'ALT:\s*【([^】]+)】\s*([^<]+)', html)
    if not m:
        m2 = re.search(r'<img[^>]+thumb/photo_01[^\'"]+["\'][^>]*alt=["\']【([^】]+)】\s*([^"\']+)["\']', html)
        if m2:
            print(f"[{slug}] Photo_01: 【{m2.group(1)}】 {m2.group(2)[:60]}")
        else:
            print(f"[{slug}] Photo_01: Not found")
    else:
        print(f"[{slug}] Photo_01: 【{m.group(1)}】 {m.group(2)[:60]}")

