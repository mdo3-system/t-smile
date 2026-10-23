# -*- coding: utf-8 -*-
with open('src/madori-sketch/index.source.html', 'r', encoding='utf-8') as f:
    text = f.read()

sub_start = text.find('function renderSubToolbar')
pos_fx = text.find("state.activeTool === 'fixture'", sub_start)
pos_pen = text.find("state.activeTool === 'pen'", pos_fx)

print('Context before pen in subtoolbar:')
print(text[pos_pen-200:pos_pen+50])
