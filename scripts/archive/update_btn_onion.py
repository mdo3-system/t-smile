# -*- coding: utf-8 -*-
with open('src/madori-sketch/index.source.html', 'r', encoding='utf-8') as f:
    text = f.read()

old_btn = """                <button id="btnOnion" onclick="toggleOnionSkin()" title="下階トレース表示 (Onion Skin)" class="ml-1 px-2 py-1 rounded-md text-xs font-medium bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1">
                    <i class="fa-solid fa-layer-group text-[11px]"></i>
                    <span class="hidden md:inline">下階透視</span>
                </button>"""

new_btn = """                <button id="btnOnion" onclick="toggleOnionSkin()" title="下階の下絵（壁・柱・階段）を透かして表示します" class="ml-1 px-2.5 py-1 rounded-md text-xs font-bold bg-sky-500/30 text-sky-200 border border-sky-400/50 flex items-center gap-1 shadow">
                    <i class="fa-solid fa-layer-group text-xs text-sky-300"></i>
                    <span>下絵表示</span>
                </button>"""

if old_btn in text:
    text = text.replace(old_btn, new_btn, 1)
    with open('src/madori-sketch/index.source.html', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Updated btnOnion in index.source.html!")
else:
    print("old_btn not found")
