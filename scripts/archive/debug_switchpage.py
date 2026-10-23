# -*- coding: utf-8 -*-
with open('public/js/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find("function switchPage(")
print(text[pos+1000:pos+2500])
