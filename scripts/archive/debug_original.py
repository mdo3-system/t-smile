# -*- coding: utf-8 -*-
with open('src/speedplanner_source.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos = 94007
print('Context around 94007 in speedplanner_source:')
print(text[pos-400:pos+300])
