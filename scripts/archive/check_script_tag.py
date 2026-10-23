# -*- coding: utf-8 -*-
with open('public/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
all_scripts = re.findall(r'<script[^>]*src=["\']([^"\']+)["\'][^>]*>', text)
for s in all_scripts:
    print('Script:', s)
