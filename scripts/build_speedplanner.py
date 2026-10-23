# -*- coding: utf-8 -*-
"""
住ま居る SpeedPlanner 統合 ＆ デザイン洗練ビルダー
======================================================
`src/speedplanner_source.html` を読み込み、住ま居るのデザインシステム
（ディープグリーン、アンバーゴールド、家カルテ保存、AI 3Dパース工房連携）
に調和させた `public/speedplanner/index.html` をビルドします。
"""

import os
import sys
import re

if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_FILE = os.path.join(BASE_DIR, 'src', 'speedplanner_source.html')
OUT_DIR = os.path.join(BASE_DIR, 'public', 'speedplanner')
OUT_FILE = os.path.join(OUT_DIR, 'index.html')

os.makedirs(OUT_DIR, exist_ok=True)

with open(SRC_FILE, 'r', encoding='utf-8', errors='replace') as f:
    html = f.read()

# 1. タイトルタグの更新
html = re.sub(
    r'<title>.*?</title>',
    '<title>3D手描き間取りスケッチ工房 (SpeedPlanner)｜完全無料・登録不要｜株式会社住ま居る</title>',
    html
)

# 2. ブランドカラー＆アクティブボタンスタイルの住ま居るパレット調律
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
        }
        .btn-brand-amber {
            background: linear-gradient(135deg, #d97706, #f59e0b);
            color: #0f172a;
            font-weight: 800;
        }
        .btn-brand-green {
            background: linear-gradient(135deg, #059669, #10b981);
            color: #ffffff;
            font-weight: 800;
        }"""

if old_styles in html:
    html = html.replace(old_styles, new_styles)
else:
    html = html.replace('</style>', new_styles + '\n    </style>')

# 3. TOPヘッダーバーの洗練（住ま居るブランドナビ、展示場戻る、家カルテ保存、AIパース工房転送ボタン）
old_header_brand = """            <div class="flex items-center gap-2 bg-blue-600/20 border border-blue-500/40 px-2.5 py-1.5 rounded-lg shrink-0">
                <i class="fa-solid fa-pen-ruler text-blue-400 text-sm"></i>
                <div>
                    <div class="font-bold text-xs sm:text-sm tracking-tight leading-none text-white">SpeedPlanner <span class="text-sky-300 font-semibold">White3D</span></div>
                    <div class="text-[9px] text-slate-400 leading-none mt-0.5 hidden xl:block">建築ホワイトモデル・間取りCAD</div>
                </div>
            </div>"""

new_header_brand = """            <!-- 住ま居る ブランド＆戻るリンク -->
            <a href="/" class="flex items-center gap-2 bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-500/50 px-2.5 py-1.5 rounded-lg shrink-0 text-white transition text-decoration-none" title="住ま居る メタバース展示場トップへ戻る">
                <span class="text-base">🏡</span>
                <div>
                    <div class="font-bold text-xs sm:text-sm tracking-tight leading-none text-emerald-200">住ま居る <span class="text-amber-300 font-extrabold">3D間取り工房</span></div>
                    <div class="text-[9px] text-emerald-400/80 leading-none mt-0.5">← 展示場トップへ戻る</div>
                </div>
            </a>"""

html = html.replace(old_header_brand, new_header_brand)

# 4. ヘッダー右側のアクションボタンに「家カルテ保存」と「AI 3Dパース工房へ転送」を追加
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

            <!-- DXFエクスポート -->
            <button onclick="exportDXF()" class="px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 active:scale-95 transition" title="CAD用DXFファイルを出力">
                <i class="fa-solid fa-file-export text-slate-400"></i>
                <span class="hidden lg:inline">DXF</span>
            </button>"""

html = html.replace(old_right_actions, new_right_actions)

# 5. 家カルテ保存用のJavaScript関数の注入（</body>直前）
carte_save_script = """
    <!-- 住ま居る 家カルテ連携 ＆ AIパース工房ブリッジスクリプト -->
    <script>
    function savePlanToCarte() {
        try {
            const raw = localStorage.getItem('smile_house_carte_data');
            const carte = raw ? JSON.parse(raw) : {};
            
            if (!carte.customPlans) carte.customPlans = [];
            
            // 延床面積と階数の取得
            const totalTsubo = document.getElementById('areaTotal_tsubo')?.textContent || '0坪';
            const totalM2 = document.getElementById('areaTotal_m2')?.textContent || '0㎡';
            
            // 2Dキャンバスのサムネイル画像を取得
            let thumbUrl = '';
            const cv2d = document.getElementById('canvas2d');
            if (cv2d) {
                try {
                    thumbUrl = cv2d.toDataURL('image/jpeg', 0.8);
                } catch(e) {}
            }

            const planItem = {
                id: 'speedplan_' + Date.now(),
                title: '手描き3D間取りプラン (' + totalTsubo + ' / ' + totalM2 + ')',
                totalTsubo: totalTsubo,
                totalM2: totalM2,
                pitch: currentPitch || 910,
                roomsCount: (rooms && rooms[1] ? rooms[1].length : 0) + (rooms && rooms[2] ? rooms[2].length : 0),
                thumbnail: thumbUrl,
                savedAt: new Date().toISOString(),
                // 内部JSONデータ
                planData: {
                    rooms: rooms,
                    walls: walls,
                    openings: openings,
                    fixtures: fixtures
                }
            };
            
            carte.customPlans.unshift(planItem);
            carte.lastUpdated = new Date().toISOString();
            
            localStorage.setItem('smile_house_carte_data', JSON.stringify(carte));
            
            alert('🎉【家カルテ保存完了】\\n作成中の3D間取りプラン（' + totalTsubo + '）を家カルテに安全保存しました！\\nマイページやご家族の画面からもいつでも再確認・復元できます。');
        } catch(e) {
            console.error('Error saving plan to carte:', e);
            alert('家カルテ保存エラー: ' + e.message);
        }
    }
    </script>
</body>"""

html = html.replace('</body>', carte_save_script)

with open(OUT_FILE, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"✅ Successfully built SpeedPlanner to: {OUT_FILE} ({len(html)} bytes)")
