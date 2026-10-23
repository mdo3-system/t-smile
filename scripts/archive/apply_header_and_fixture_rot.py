# -*- coding: utf-8 -*-
"""
CとFの追加パッチ
1. ヘッダーの 1F/2F/3F の隣に「下絵(1F)表示: ON/OFF」ボタンを設置
2. 設備サブツールバーの先頭に「90°回転」ボタンを設置
"""

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_HTML = os.path.join(BASE_DIR, 'src', 'madori-sketch', 'index.source.html')

with open(SRC_HTML, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. ヘッダーの「下絵表示」ボタン追加
target_header = """<button id="btnFloor3" onclick="setFloor(3)" class="px-2.5 py-1 rounded-md text-xs font-bold text-slate-300 hover:text-white transition">3F</button>
            </div>"""

new_header = """<button id="btnFloor3" onclick="setFloor(3)" class="px-2.5 py-1 rounded-md text-xs font-bold text-slate-300 hover:text-white transition">3F</button>
                <span class="text-slate-600">|</span>
                <button onclick="toggleOnionSkin()" id="btnOnionSkin" class="px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 bg-cyan-600/30 text-cyan-200 border border-cyan-500/50 shadow" title="下階の間取り（壁・柱・階段）を下絵として透かして表示します">
                    <i class="fa-solid fa-layer-group text-cyan-400"></i>
                    <span>下絵表示</span>
                </button>
            </div>"""

if target_header in text and 'btnOnionSkin' not in text:
    text = text.replace(target_header, new_header, 1)
    print("1. Added Onion Skin button in header!")
else:
    print("1. target_header not found or already added")

# 2. 設備サブツールバーの先頭に「90°回転」ボタンを追加
target_fixture_bar = """        // 1. 設備カテゴリ切り替えチップ群
        const catGroup = document.createElement('div');"""

new_fixture_rotate_btn = """        // 90°回転ボタン
        const rotBtn = document.createElement('button');
        rotBtn.className = 'px-2.5 py-1 rounded-lg bg-amber-600/30 border border-amber-500/50 text-amber-200 text-xs font-bold hover:bg-amber-600/50 flex items-center gap-1 shrink-0';
        rotBtn.innerHTML = `<i class="fa-solid fa-rotate-right"></i> 90°回転 (${state.subFixtureRot||0}°)`;
        rotBtn.title = '設備の向きを90度回転します（ショートカット: Rキー）';
        rotBtn.onclick = () => {
            rotateFixturePreset();
        };
        container.appendChild(rotBtn);

        // 1. 設備カテゴリ切り替えチップ群
        const catGroup = document.createElement('div');"""

if target_fixture_bar in text and 'rotBtn.title' not in text:
    text = text.replace(target_fixture_bar, new_fixture_rotate_btn, 1)
    print("2. Added 90° rotation button to fixture subtoolbar!")
else:
    print("2. target_fixture_bar not found or already added")

with open(SRC_HTML, 'w', encoding='utf-8') as f:
    f.write(text)

print("Saved src/madori-sketch/index.source.html successfully!")
