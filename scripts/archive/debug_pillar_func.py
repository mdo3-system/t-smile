# -*- coding: utf-8 -*-
with open('src/madori-sketch/index.source.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('function drawStandalonePillar2D')
print(text[pos:pos+400])
