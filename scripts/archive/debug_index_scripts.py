# -*- coding: utf-8 -*-
with open('public/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
scripts = re.findall(r'<script[^>]*src=["\']([^"\']+)["\']', text)
print('Scripts in public/index.html:', scripts)
