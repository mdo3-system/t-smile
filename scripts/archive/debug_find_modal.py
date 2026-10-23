# -*- coding: utf-8 -*-
with open('src/madori-sketch/index.source.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'<div[^>]*id=["\'][^"\']*Modal["\']', text)]
print('Modals found:', len(matches))
for m in matches:
    print('Modal:', text[m:m+120].replace('\n', ' '))
