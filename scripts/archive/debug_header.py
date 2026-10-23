# -*- coding: utf-8 -*-
import sys
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

with open('src/madori-sketch/index.source.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('<header')
end = text.find('</header>', pos) + 9
print(text[pos:end])
