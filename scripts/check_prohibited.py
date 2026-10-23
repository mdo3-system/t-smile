# -*- coding: utf-8 -*-
import os
import glob
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

patterns = [
    ('萩原', re.compile(r'萩原')),
    ('すみれ', re.compile(r'すみれ(?!(?:が丘|台))')),  # 萩原すみれ様対策
    ('ArchiX (表示テキスト)', re.compile(r'(?<!id=")(?<!id=\')[^"\'\n>]*?(?:ArchiX|archix)(?!-)[^"\'\n<]*?(?=<|$)', re.IGNORECASE)),
    ('ARCHITREND', re.compile(r'ARCHITREND', re.IGNORECASE))
]

files = glob.glob('src/**/*.html', recursive=True) + ['public/index.html']
found = 0

for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        for i, line in enumerate(fp.readlines()):
            for label, pat in patterns:
                if pat.search(line):
                    print(f"[{label}] {f}:{i+1}: {line.strip()[:100]}")
                    found += 1

print(f"\nDone. Found {found} violations.")
