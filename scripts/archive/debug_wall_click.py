# -*- coding: utf-8 -*-
with open('src/madori-sketch/index.source.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos_down = text.find("canvas2d.addEventListener('pointerdown'")
pos = text.find("state.activeTool === 'wall'", pos_down)
print(text[pos-50:pos+1000])
