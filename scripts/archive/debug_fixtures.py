# -*- coding: utf-8 -*-
import os

with open('src/madori-sketch/index.source.html', 'r', encoding='utf-8') as f:
    text = f.read()

sub_start = text.find('function renderSubToolbar()')
sub_end = text.find('function renderPropertyInspector()')
sub_code = text[sub_start:sub_end]

fx_start = sub_code.find("state.activeTool === 'fixture'")
print('fx_start in sub:', fx_start)
print('--- SUBTOOLBAR FIXTURE CODE ---')
print(sub_code[fx_start-20:fx_start+2000])

next_tool = sub_code.find("else if (state.activeTool === 'select')", fx_start)
if next_tool == -1:
    next_tool = sub_code.find("else if (state.activeTool === 'pen')", fx_start)
print('next_tool in sub:', next_tool)
if next_tool != -1:
    print('--- SUBTOOLBAR FIXTURE CODE TAIL ---')
    print(sub_code[next_tool-500:next_tool+100])
