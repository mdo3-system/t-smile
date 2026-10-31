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
    
    # h1
    h1_m = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.DOTALL)
    h1 = re.sub(r'<[^>]+>', '', h1_m.group(1)).strip() if h1_m else ""
    
    # og:image
    og_m = re.search(r'<meta\s+property=["\']og:image["\']\s+content=["\']([^"\']+)["\']', html)
    og = og_m.group(1) if og_m else ""
    
    # 最初の3枚の写真のsrcとfigcaption
    caps = re.findall(r'<figure[^>]*>\s*<img[^>]+src=["\']([^"\']+)["\'][^>]*>.*?<figcaption[^>]*>(.*?)</figcaption>', html, re.DOTALL)
    
    print(f"=== {slug} ===")
    print(f"H1: {h1[:60]}")
    print(f"OG Image: {og}")
    for idx, (img_src, cap_text) in enumerate(caps[:3]):
        clean_cap = re.sub(r'<[^>]+>', ' ', cap_text).strip()
        print(f"  Photo #{idx+1} ({img_src}): {clean_cap[:80]}")

