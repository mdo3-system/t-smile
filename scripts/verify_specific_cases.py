# -*- coding: utf-8 -*-
import sys
import re

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

with open("public/custom-freedom/index.html", "r", encoding="utf-8") as f:
    text = f.read()

# 各カードを抽出
cards = text.split('<div class="cf-case-card">')[1:]
for card in cards:
    for target in ["東松山市", "行田市", "川越市"]:
        if target in card:
            loc = re.search(r'class="cf-case-loc">([^<]+)<', card).group(1)
            img = re.search(r'src="([^"]+)"', card).group(1)
            alt = re.search(r'alt="([^"]+)"', card).group(1)
            wish = re.search(r'class="cf-case-wish">([^<]+)<', card).group(1)
            h3 = re.search(r'<h3[^>]*>([^<]+)<', card).group(1)
            sol = re.search(r'class="cf-case-solution">\s*([^<]+)\s*<', card).group(1).strip()
            print(f"=== {loc} ===")
            print(f"Image: {img}")
            print(f"Alt  : {alt}")
            print(f"Wish : {wish}")
            print(f"Title: {h3}")
            print(f"Sol  : {sol}")
            print()

