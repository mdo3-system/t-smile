# -*- coding: utf-8 -*-
"""
scripts/sync_public_to_partials.py
最新の public/index.html から各セクションを src/partials/ へ完全同期・逆展開
"""
import os
import sys

with open('public/index.html', 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

# 境界の行番号 (1-indexed)
slices = [
    ('meta-head.html', 4, 197),
    ('header-nav.html', 198, 318),
    ('section-top.html', 319, 1404),
    ('section-ai-studio.html', 1405, 2124),
    ('section-madori-bot.html', 2125, 2221),
    ('section-thermal-bot.html', 2222, 2343),
    ('section-floorplan-studio.html', 2344, 3223),
    ('section-craftsmanship.html', 3224, 3747),
    ('section-metaverse.html', 3748, 4132),
    ('section-scent-experience.html', 4133, 4216),
    ('section-article-feature.html', 4217, 4502),
    ('section-dashboard.html', 4503, 4896),
    ('section-credlayer.html', 4897, 5401),
    ('section-admin.html', 5402, 5526),
    ('modals-and-scripts.html', 5527, len(lines))
]

out_dir = os.path.join('src', 'partials')
os.makedirs(out_dir, exist_ok=True)

for fname, start_line, end_line in slices:
    sec_lines = lines[start_line - 1 : end_line]
    out_path = os.path.join(out_dir, fname)
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sec_lines) + '\n')
    print(f"Synced {fname:<30}: lines {start_line:>4} - {end_line:>4} ({len(sec_lines):>4} lines)")

print("\nAll partials successfully synchronized from public/index.html!")
