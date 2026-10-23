# -*- coding: utf-8 -*-
"""
住ま居る 3D間取りスケッチ工房 (MadoriSketch)
ソースクリーンアップ ＆ 段階的リファクタリング適用スクリプト
"""

import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_IN = os.path.join(BASE_DIR, 'src', 'speedplanner_source.html')
OUT_DIR = os.path.join(BASE_DIR, 'src', 'madori-sketch')
OUT_FILE = os.path.join(OUT_DIR, 'index.source.html')

os.makedirs(OUT_DIR, exist_ok=True)

with open(SRC_IN, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. タイトル
html = re.sub(
    r'<title>.*?</title>',
    '<title>3D手描き間取りスケッチ工房｜完全無料・登録不要｜株式会社住ま居る</title>',
    html
)

# 2. ブランドヘッダーのクリーンアップ（SpeedPlanner -> 住ま居る 3D間取りスケッチ工房）
old_brand = """            <div class="flex items-center gap-2 bg-blue-600/20 border border-blue-500/40 px-2.5 py-1.5 rounded-lg shrink-0">
                <i class="fa-solid fa-pen-ruler text-blue-400 text-sm"></i>
                <div>
                    <div class="font-bold text-xs sm:text-sm tracking-tight leading-none text-white">SpeedPlanner <span class="text-sky-300 font-semibold">White3D</span></div>
                    <div class="text-[9px] text-slate-400 leading-none mt-0.5 hidden xl:block">建築ホワイトモデル・間取りCAD</div>
                </div>
            </div>"""

new_brand = """            <!-- 住ま居る ブランド＆戻るリンク -->
            <a href="/" class="flex items-center gap-2 bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-500/50 px-2.5 py-1.5 rounded-lg shrink-0 text-white transition text-decoration-none" title="住ま居る メタバース展示場トップへ戻る">
                <span class="text-base">🏡</span>
                <div>
                    <div class="font-bold text-xs sm:text-sm tracking-tight leading-none text-emerald-200">住ま居る <span class="text-amber-300 font-extrabold">3D間取り工房</span></div>
                    <div class="text-[9px] text-emerald-400/80 leading-none mt-0.5">← 展示場トップへ戻る</div>
                </div>
            </a>"""

html = html.replace(old_brand, new_brand)

# 3. ヘッダー右側のアクション（公式LINE通知連携、家カルテ保存、AIパース工房、DXF）
old_right_actions = """            <button onclick="exportDXF()" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-md flex items-center gap-1 active:scale-95 transition">
                <i class="fa-solid fa-file-export"></i>
                <span class="hidden md:inline">DXF</span>
            </button>"""

new_right_actions = """            <!-- 💬 公式LINE通知連携 -->
            <a href="https://lin.ee/8fdyyGu" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#06c755] hover:bg-[#05b34c] text-white shadow-md flex items-center gap-1 active:scale-95 transition text-decoration-none" title="専任スタッフからの図面回答や更新をLINEで受け取る（ID: @051vqxla）">
                <i class="fa-brands fa-line text-sm"></i>
                <span class="hidden sm:inline">LINE通知連携</span>
            </a>

            <!-- 💾 家カルテに保存 -->
            <button onclick="savePlanToCarte()" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md flex items-center gap-1 active:scale-95 transition" title="現在作成中の間取りを家カルテに安全保存">
                <i class="fa-solid fa-floppy-disk text-amber-300"></i>
                <span class="hidden sm:inline">家カルテ保存</span>
            </button>

            <!-- 🎨 AI 3Dパース工房へ転送 -->
            <a href="/smilestudio.html" target="_blank" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md flex items-center gap-1 active:scale-95 transition text-decoration-none" title="描いた間取りから立体フォトリアルパースをAI生成">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                <span class="hidden md:inline">AIパース工房 ↗</span>
            </a>

            <!-- 汎用CAD互換DXFエクスポート -->
            <button onclick="exportDXF()" class="px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 active:scale-95 transition" title="実寸mm座標DXFファイルを出力">
                <i class="fa-solid fa-file-export text-slate-400"></i>
                <span class="hidden lg:inline">DXF</span>
            </button>"""

html = html.replace(old_right_actions, new_right_actions)

# 4. ボタンのアクティブカラー（エメラルドグリーン基調）
old_styles = """        .tool-btn.active {
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            color: white;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.45);
            border-color: #60a5fa;
        }
        .sub-chip.active {
            background-color: #3b82f6;
            color: #ffffff;
            border-color: #93c5fd;
        }"""

new_styles = """        .tool-btn.active {
            background: linear-gradient(135deg, #059669, #047857) !important;
            color: #ffffff !important;
            box-shadow: 0 4px 14px rgba(5, 150, 105, 0.45) !important;
            border-color: #34d399 !important;
        }
        .sub-chip.active {
            background-color: #059669 !important;
            color: #ffffff !important;
            border-color: #6ee7b7 !important;
        }"""

if old_styles in html:
    html = html.replace(old_styles, new_styles)

# 5. 商標・製品名コメントのクリーンアップ
html = html.replace("SpeedPlanner Touch & Pen Edition - Architectural White Model 2D/3D Engine", "Smile MadoriSketch - Architectural White Model 2D/3D Engine")
html = html.replace("SpeedPlanner_", "Smile_MadoriSketch_")
html = html.replace("speedplanner_white3d.json", "madori_sketch_project.json")
html = html.replace("STANDARD AUTOCAD / JW_CAD COMPATIBLE 2D DXF EXPORT (.dxf)", "STANDARD CAD COMPATIBLE 2D DXF EXPORT (.dxf)")

# 6. スクリプト先頭で外部モジュールを読み込むタグの挿入
module_scripts = """    <!-- 単一責任の原則 (SRP) に基づく分離モジュール群 -->
    <script src="/madori-sketch/js/constants/architectural_specs.js?v=20261021"></script>
    <script src="/madori-sketch/js/io/dxf_exporter.js?v=20261021"></script>
    <script src="/madori-sketch/js/io/json_storage.js?v=20261021"></script>
    <script src="/madori-sketch/js/integration/carte_bridge.js?v=20261021"></script>
    <script>"""

html = html.replace("<script>", module_scripts, 1)

with open(OUT_FILE, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"Created clean source at: {OUT_FILE}")
