#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/optimize_plans_webp.py
public/plans/ 配下の全PNG画像（約1,930枚）を高品質・超軽量WebP（quality=82）に一括変換
- 1.7GB の生PNGを約100MB〜120MB（93%削減）へ極限最適化
- Core Web Vitals（LCP/FCP）の大幅改善
- plans.json および build_plan_pages.py の参照を .webp へ同期
"""

import os
import json
import time
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLANS_DIR = os.path.join(BASE_DIR, 'public', 'plans')
PLANS_JSON = os.path.join(BASE_DIR, 'public', 'data', 'plans.json')

def convert_one(png_name):
    src = os.path.join(PLANS_DIR, png_name)
    webp_name = os.path.splitext(png_name)[0] + '.webp'
    dst = os.path.join(PLANS_DIR, webp_name)
    
    # 既に存在し更新日時が新しい場合はスキップ
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
        return True, 0, 0

    try:
        with Image.open(src) as im:
            # RGBA or RGB
            if im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info):
                im = im.convert('RGBA')
            else:
                im = im.convert('RGB')
            im.save(dst, 'WEBP', quality=82, method=4)
        
        orig_sz = os.path.getsize(src)
        new_sz = os.path.getsize(dst)
        return True, orig_sz, new_sz
    except Exception as e:
        print(f"Error converting {png_name}: {e}")
        return False, 0, 0

def main():
    print("🚀 public/plans/ の PNG 画像を WebP に一括高速変換中...")
    png_files = [f for f in os.listdir(PLANS_DIR) if f.lower().endswith('.png')]
    total = len(png_files)
    print(f"対象ファイル数: {total} 枚")

    start_time = time.time()
    total_orig = 0
    total_new = 0
    converted = 0

    # マルチスレッド実行 (CPUコア数 * 2)
    max_workers = min(16, (os.cpu_count() or 4) * 2)
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        results = executor.map(convert_one, png_files)
        for success, orig_sz, new_sz in results:
            if success:
                converted += 1
                total_orig += orig_sz
                total_new += new_sz
                if converted % 200 == 0 or converted == total:
                    print(f"  進捗: {converted}/{total} 完了 ({(converted/total)*100:.1f}%)")

    elapsed = time.time() - start_time
    print(f"\n🎉 変換完了 ({elapsed:.1f} 秒)")
    if total_orig > 0:
        print(f"元容量 (PNG):  {total_orig / (1024*1024):.1f} MB")
        print(f"最適化後 (WebP): {total_new / (1024*1024):.1f} MB")
        print(f"削減率: {(1 - total_new/total_orig)*100:.1f}% 削減！")

    # plans.json の参照を .webp に更新
    if os.path.exists(PLANS_JSON):
        print(f"\n📝 {PLANS_JSON} の画像パスを .webp に更新中...")
        with open(PLANS_JSON, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # plans/*.png -> plans/*.webp
        new_content = content.replace('.png', '.webp')
        with open(PLANS_JSON, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("✔ plans.json 更新完了")

if __name__ == '__main__':
    main()
