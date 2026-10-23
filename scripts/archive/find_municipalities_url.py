import urllib.request
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

def check_url(url, keywords):
    print('Checking:', url)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            found = []
            for m in re.finditer(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', html, re.DOTALL):
                href = m.group(1)
                text = re.sub(r'<[^>]+>', '', m.group(2)).strip()
                if any(k in text for k in keywords):
                    found.append((href, text))
            for href, text in found[:10]:
                print(f'  {href} -> {text}')
    except Exception as e:
        print('  Error:', e)

print('=== 坂戸市 ===')
check_url('https://www.city.sakado.lg.jp/soshiki/33/', ['近居', '同居', '住宅', '補助', '助成'])

print('=== 川越市 ===')
check_url('https://www.city.kawagoe.saitama.jp/kurashi/jutaku/index.html', ['補助', '助成', '省エネ', '子育て', '住宅'])

print('=== 東松山市 ===')
check_url('https://www.city.higashimatsuyama.lg.jp/soshiki/33/', ['住宅', '補助', '助成', '取得'])
