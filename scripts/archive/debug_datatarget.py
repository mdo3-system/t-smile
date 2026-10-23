# -*- coding: utf-8 -*-
with open('public/js/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find("data-target")
while pos != -1:
    print('--- data-target usage ---')
    print(text[pos-40:pos+300])
    pos = text.find("data-target", pos + 300)
