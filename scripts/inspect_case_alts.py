# -*- coding: utf-8 -*-
import os
import re
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

for slug in ['higashimatsuyama-k', 'gyoda-h', 'tsurugashima-s', 'tsurugashima-a', 'tsurugashima-kb']:
    p = f"public/cases/{slug}.html"
    with open(p, "r", encoding="utf-8") as f:
        html = f.read()
    
    # 最初の5枚の写真のsrcと、その前後のテキストを抽出
    print(f"\n=================== {slug} ===================")
    matches = re.findall(r'<img[^>]+src=["\']([^"\']+\.webp)["\'][^>]*alt=["\']([^"\']*)["\']', html)
    for src, alt in matches[:5]:
        print(f"  SRC: {src}")
        print(f"  ALT: {alt}")

