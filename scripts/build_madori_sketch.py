# -*- coding: utf-8 -*-
"""
住ま居る 3D間取りスケッチ工房 (MadoriSketch) ビルダー
======================================================
`src/madori-sketch/index.source.html` および各分離モジュールを
`public/madori-sketch/` にデプロイ・統合します。
"""

import os
import sys
import shutil

if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(BASE_DIR, 'src', 'madori-sketch')
SRC_FILE = os.path.join(SRC_DIR, 'index.source.html')
OUT_DIR = os.path.join(BASE_DIR, 'public', 'madori-sketch')
OUT_FILE = os.path.join(OUT_DIR, 'index.html')

os.makedirs(OUT_DIR, exist_ok=True)

# 1. 分離モジュール群（js/）を public/madori-sketch/js/ へ安全に同期コピー
SRC_JS_DIR = os.path.join(SRC_DIR, 'js')
OUT_JS_DIR = os.path.join(OUT_DIR, 'js')
if os.path.exists(SRC_JS_DIR):
    shutil.copytree(SRC_JS_DIR, OUT_JS_DIR, dirs_exist_ok=True)
    print(f"✅ Synced SRP modules from {SRC_JS_DIR} to {OUT_JS_DIR}")

# 2. HTMLのコピー＆最終確認
with open(SRC_FILE, 'r', encoding='utf-8') as f:
    html = f.read()

with open(OUT_FILE, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"✅ Successfully built MadoriSketch to: {OUT_FILE} ({len(html)} bytes)")

# 3. 旧URL (/speedplanner/) への後方互換リダイレクトの設置
OLD_DIR = os.path.join(BASE_DIR, 'public', 'speedplanner')
os.makedirs(OLD_DIR, exist_ok=True)
OLD_REDIRECT_FILE = os.path.join(OLD_DIR, 'index.html')
redirect_html = """<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0;url=/madori-sketch/">
    <title>3D手描き間取りスケッチ工房へ移動中 | 株式会社住ま居る</title>
    <link rel="canonical" href="https://t-smile.co.jp/madori-sketch/">
</head>
<body style="background:#0f172a;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
    <div style="text-align:center;">
        <h2 style="color:#34d399;">3D間取りスケッチ工房へ移動しています...</h2>
        <p><a href="/madori-sketch/" style="color:#38bdf8;">自動で切り替わらない場合はこちらをクリックしてください</a></p>
    </div>
    <script>window.location.replace('/madori-sketch/');</script>
</body>
</html>"""
with open(OLD_REDIRECT_FILE, 'w', encoding='utf-8') as f:
    f.write(redirect_html)
print(f"✅ Created backwards-compatibility redirect at: {OLD_REDIRECT_FILE}")
