# -*- coding: utf-8 -*-
with open('src/madori-sketch/index.source.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('id="tool_room"')
print(text[pos-100:pos+800])
