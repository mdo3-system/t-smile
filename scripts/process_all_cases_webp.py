#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全12実邸 施工写真 厳選20枚一括WebP最適化変換スクリプト
- 各邸宅から建築ストーリー（外観・LDK・キッチン・水回り・造作）に沿ってベスト20枚を厳選
- アンシャープマスク＆微細コントラスト補正（ボケ防止・鮮鋭化）
- ディスプレイ最適解像度（幅1920px）およびサムネイル（幅800px）のWebPを生成
- 出力先: public/images/cases/case-{id}/
"""

import os
import sys
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

SRC_BASE = Path(r"e:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity\raw_source_cases")
OUT_BASE = Path(r"e:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity\public\images\cases")

CASES = [
    {"id": "1", "dir": "ときがわ町 K様邸", "slug": "tokigawa-k", "title": "ときがわ町・K様邸"},
    {"id": "2", "dir": "吉見町 O様邸", "slug": "yoshimi-o", "title": "吉見町・O様邸"},
    {"id": "3", "dir": "川越市 Y様邸", "slug": "kawagoe-y", "title": "川越市・Y様邸"},
    {"id": "4", "dir": "日高市 I様邸", "slug": "hidaka-i", "title": "日高市・I様邸"},
    {"id": "5", "dir": "東松山市 K様邸", "slug": "higashimatsuyama-k", "title": "東松山市・K様邸"},
    {"id": "6", "dir": "行田市 H様邸", "slug": "gyoda-h", "title": "行田市・H様邸"},
    {"id": "7", "dir": "鳩山町 T様邸", "slug": "hatoyama-t", "title": "鳩山町・T様邸"},
    {"id": "8", "dir": "鶴ヶ島市 A様邸", "slug": "tsurugashima-a", "title": "鶴ヶ島市・A様邸"},
    {"id": "9", "dir": "鶴ヶ島市 KB様邸", "slug": "tsurugashima-kb", "title": "鶴ヶ島市・KB様邸"},
    {"id": "10", "dir": "鶴ヶ島市 K様邸", "slug": "tsurugashima-k", "title": "鶴ヶ島市・K様邸"},
    {"id": "11", "dir": "鶴ヶ島市 S様邸", "slug": "tsurugashima-s", "title": "鶴ヶ島市・S様邸"},
    {"id": "12", "dir": "鶴ヶ島市 T様邸", "slug": "tsurugashima-t", "title": "鶴ヶ島市・T様邸"},
]

def collect_images(folder_path):
    images = []
    # おすすめ・おすすめデータ優先
    sub_pri = []
    sub_other = []
    for root, dirs, files in os.walk(folder_path):
        for f in files:
            if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                full_p = Path(root) / f
                if 'おすすめ' in root:
                    sub_pri.append(full_p)
                else:
                    sub_other.append(full_p)
    
    # 優先順に結合
    all_imgs = sorted(sub_pri) + sorted(sub_other)
    # 重複排除
    seen = set()
    uniq_imgs = []
    for img in all_imgs:
        if img.name not in seen:
            seen.add(img.name)
            uniq_imgs.append(img)
    return uniq_imgs

def select_best_20(images):
    if len(images) <= 20:
        return images
    # 20枚を等間隔でサンプリング
    step = len(images) / 20.0
    selected = []
    for i in range(20):
        idx = int(i * step)
        selected.append(images[idx])
    return selected

def process_case(case_info):
    c_id = case_info["id"]
    slug = case_info["slug"]
    name = case_info["title"]
    src_folder = SRC_BASE / case_info["dir"]

    if not src_folder.exists():
        print(f"⚠️ フォルダが見つかりません: {src_folder}")
        return []

    out_dir = OUT_BASE / slug
    thumb_dir = out_dir / "thumb"
    out_dir.mkdir(parents=True, exist_ok=True)
    thumb_dir.mkdir(parents=True, exist_ok=True)

    all_imgs = collect_images(src_folder)
    selected_20 = select_best_20(all_imgs)
    print(f"\n🏠 [{c_id:2s}. {name}] 総写真: {len(all_imgs)} 枚 ➔ 厳選 {len(selected_20)} 枚をWebP変換中...")

    results = []
    for idx, img_path in enumerate(selected_20, 1):
        base_name = f"photo_{idx:02d}_{img_path.stem.lower()}"
        out_webp = out_dir / f"{base_name}.webp"
        thumb_webp = thumb_dir / f"{base_name}.webp"

        # すでに生成済みであればスキップ
        if not out_webp.exists() or out_webp.stat().st_size == 0:
            try:
                with Image.open(img_path) as im:
                    try:
                        im = ImageOps.exif_transpose(im)
                    except Exception:
                        pass
                    im = im.convert("RGB")
                    w, h = im.size

                    # ボケ補正・鮮鋭化
                    im_sharp = im.filter(ImageFilter.UnsharpMask(radius=2.0, percent=140, threshold=2))
                    im_con = ImageEnhance.Contrast(im_sharp).enhance(1.06)
                    im_final = ImageEnhance.Sharpness(im_con).enhance(1.2)

                    # フルサイズ (1920px)
                    if max(w, h) > 1920:
                        ratio = 1920 / max(w, h)
                        im_full = im_final.resize((int(w * ratio), int(h * ratio)), Image.Resampling.LANCZOS)
                    else:
                        im_full = im_final
                    im_full.save(out_webp, "WEBP", quality=85, method=6)

                    # サムネイル (800px)
                    if max(w, h) > 800:
                        ratio_t = 800 / max(w, h)
                        im_thumb = im_final.resize((int(w * ratio_t), int(h * ratio_t)), Image.Resampling.LANCZOS)
                    else:
                        im_thumb = im_final
                    im_thumb.save(thumb_webp, "WEBP", quality=80, method=6)

            except Exception as e:
                print(f"  ❌ エラー ({img_path.name}): {e}")
                continue

        results.append({
            "idx": idx,
            "url": f"/images/cases/{slug}/{out_webp.name}",
            "thumb": f"/images/cases/{slug}/thumb/{thumb_webp.name}",
            "original_name": img_path.name
        })

    return results

def main():
    print("🚀 [Case Studies] 全12実邸の厳選20枚 WebP一括生成を開始します...\n")
    all_case_results = {}
    for c in CASES:
        res = process_case(c)
        all_case_results[c["id"]] = {
            "title": c["title"],
            "slug": c["slug"],
            "photos": res
        }

    # マニフェストJSON保存
    manifest_file = OUT_BASE / "cases_manifest.json"
    import json
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(all_case_results, f, ensure_ascii=False, indent=2)

    print(f"\n🎉 全12実邸の厳選20枚 WebP生成が完了しました！")
    print(f"📄 マニフェスト保存: {manifest_file.resolve()}")

if __name__ == '__main__':
    main()
