# -*- coding: utf-8 -*-
with open('src/madori-sketch/index.source.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos_up = text.find("canvas2d.addEventListener('pointerup'")
pos = text.find("drag.type === 'wall'", pos_up)
print('Context in pointerup around wall:')
print(text[pos-40:pos+350])
