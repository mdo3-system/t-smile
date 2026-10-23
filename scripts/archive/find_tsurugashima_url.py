import urllib.request
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

url = 'https://www.city.tsurugashima.lg.jp/kurashi-tetsuduki/sumai/jyutaku/'
print('Checking:', url)
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=5) as resp:
    html = resp.read().decode('utf-8', errors='ignore')
    for m in re.finditer(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', html, re.DOTALL):
        href = m.group(1)
        text = re.sub(r'<[^>]+>', '', m.group(2)).strip()
        if 'page' in href or 'kurashi' in href or 'shigoto' in href:
            print(f'{href} -> {text}')
