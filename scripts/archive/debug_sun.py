# -*- coding: utf-8 -*-
with open('src/madori-sketch/index.source.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('id="sunSlider"')
print(text[pos-200:pos+500])
