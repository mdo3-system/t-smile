# -*- coding: utf-8 -*-
import sys
import re

if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

with open('public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

print(f"Total index.html length: {len(html)}")

# Find all links mentioning 'plan', 'studio', 'ai', 'madori', 'プラン'
keywords = ['3Dプラン', 'プラン選定', 'floorplan-studio', 'ai-studio', 'madori-sketch', 'speedplanner']

for kw in keywords:
    matches = [m.start() for m in re.finditer(re.escape(kw), html, re.IGNORECASE)]
    print(f"Keyword '{kw}': {len(matches)} occurrences")
    for pos in matches[:3]:
        snippet = html[max(0, pos-80):min(len(html), pos+120)].replace('\n', ' ')
        print(f"   -> ...{snippet}...")

# Check all navigation anchors and section IDs
section_ids = re.findall(r'<section[^>]*id="([^"]+)"', html)
print(f"\nSections in index.html ({len(section_ids)}): {section_ids}")

# Check header/menu links
nav_links = re.findall(r'href="([^"]+)"', html[:5000])
print(f"\nEarly hrefs (Header/Hero area): {nav_links[:15]}")
