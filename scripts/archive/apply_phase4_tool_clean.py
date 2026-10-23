# -*- coding: utf-8 -*-
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_HTML = os.path.join(BASE_DIR, 'src', 'madori-sketch', 'index.source.html')

with open(SRC_HTML, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. tool_room ボタンを削除し、tool_wall をアクティブ＆筆頭にする
pos_room = text.find('id="tool_room"')
btn_room_start = text.rfind('<button', 0, pos_room)
btn_room_end = text.find('</button>', pos_room) + 9

text = text[:btn_room_start] + text[btn_room_end:].lstrip()

# tool_wall に active クラスを付与
text = text.replace('id="tool_wall" class="tool-btn w-12', 'id="tool_wall" class="tool-btn active w-12', 1)

# 2. 壁ツールのサブツールバーに自動部屋認識の案内を追加
old_wall_sub = '<span class="text-[11px] text-slate-400 ml-1 hidden md:inline">※壁は柱を表示せず一体壁で描画。独立柱のみ単独柱として3D表示します</span>'
new_wall_sub = '<span class="text-[11px] text-cyan-300 font-bold ml-1 hidden lg:inline"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i>壁を四角やL字に閉じて囲むと自動的に部屋が作成されます（部屋名は後から設定可能）</span>'

if old_wall_sub in text:
    text = text.replace(old_wall_sub, new_wall_sub, 1)

with open(SRC_HTML, 'w', encoding='utf-8') as f:
    f.write(text)

print("Cleaned left toolbar and set wall-first auto room mode!")
