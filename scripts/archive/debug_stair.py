# -*- coding: utf-8 -*-
with open('src/madori-sketch/index.source.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r'<button[^>]*id=["\']tool_[^>]*>[\s\S]*?</button>', text)
for m in matches:
    print('Tool button:', m.replace('\n', ' '))
