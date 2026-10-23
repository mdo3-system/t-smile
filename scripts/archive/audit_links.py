import os
import re
import urllib.request
import urllib.parse

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')

# Pages to inspect
pages_to_check = [
    'index.html',
    'about/index.html',
    'performance/index.html',
    'category/spec/index.html',
    'evidence/index.html',
    'flow/index.html',
    'awards/kankyo-housing/index.html',
    'madori-consultation/index.html',
    'ai-studio/index.html',
    'knowledge/thermal/index.html',
    'catalog/index.html',
    'mortgage/index.html',
    'subsidy/index.html'
]

link_regex = re.compile(r'href=["\']([^"\']+)["\']')
dead_links = []
checked_links = set()

print(f"=== CHECKING INTERNAL LINKS ACROSS {len(pages_to_check)} MAJOR PAGES ===")

for p in pages_to_check:
    file_path = os.path.join(PUBLIC_DIR, p)
    if not os.path.exists(file_path):
        print(f"[MISSING PAGE] {p}")
        continue
    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
        html = f.read()
    
    matches = link_regex.findall(html)
    for href in matches:
        href_clean = href.strip()
        if not href_clean or href_clean.startswith(('mailto:', 'tel:', 'javascript:', '#')):
            continue
        # ignore external urls for local file check, but record them
        if href_clean.startswith(('http://', 'https://')):
            if not ('t-smile.co.jp' in href_clean or '127.0.0.1' in href_clean or 'localhost' in href_clean):
                continue
            # convert internal absolute url to relative path
            u = urllib.parse.urlparse(href_clean)
            href_path = u.path
        else:
            href_path = href_clean.split('?')[0].split('#')[0]
        
        if not href_path:
            continue

        link_key = (p, href_clean)
        if link_key in checked_links:
            continue
        checked_links.add(link_key)

        # check physical file existence
        rel_target = href_path.lstrip('/')
        if not rel_target or rel_target.endswith('/'):
            target_file = os.path.join(PUBLIC_DIR, rel_target, 'index.html')
        else:
            target_file = os.path.join(PUBLIC_DIR, rel_target)
            if not os.path.exists(target_file):
                target_file = os.path.join(PUBLIC_DIR, rel_target + '.html')
                if not os.path.exists(target_file):
                    target_file = os.path.join(PUBLIC_DIR, rel_target, 'index.html')
        
        if not os.path.exists(target_file):
            dead_links.append((p, href_clean, target_file))

if dead_links:
    print(f"\n[FOUND {len(dead_links)} DEAD LINKS!]")
    for src_page, raw_href, expected_path in dead_links:
        print(f"  Source: {src_page} -> Dead Href: '{raw_href}' (expected: {os.path.basename(expected_path)})")
else:
    print("\n[PERFECT] All checked internal links exist and resolve to valid files!")

