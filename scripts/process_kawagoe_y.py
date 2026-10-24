#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
川越市 Y様邸 高画質化・ボケ補正 ＆ WebP最適化変換スクリプト
- アンシャープマスク (Unsharp Masking) による輪郭・エッジ復元
- コントラスト・シャープネスの最適化（白タイル・木目・ダウンフロアリビングの質感強調）
- ディスプレイ最適解像度（幅1920px）およびサムネイル用（幅800px）のWebP生成
"""

import os
import sys
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter

SRC_DIR = Path(r"e:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity\raw_source_cases\川越市 Y様邸")
OUT_DIR = Path(r"e:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity\public\images\cases\kawagoe-y")
THUMB_DIR = OUT_DIR / "thumb"

OUT_DIR.mkdir(parents=True, exist_ok=True)
THUMB_DIR.mkdir(parents=True, exist_ok=True)

def enhance_and_convert(img_path, idx):
    filename = img_path.name
    base_name = f"photo_{idx:02d}_{img_path.stem.lower()}"
    out_webp = OUT_DIR / f"{base_name}.webp"
    thumb_webp = THUMB_DIR / f"{base_name}.webp"

    with Image.open(img_path) as im:
        # EXIF orientation handling
        try:
            from PIL import ImageOps
            im = ImageOps.exif_transpose(im)
        except Exception:
            pass

        im = im.convert("RGB")
        w, h = im.size

        # 1. ボケ補正・鮮鋭化処理
        # アンシャープマスク（輪郭強調）
        im_sharp = im.filter(ImageFilter.UnsharpMask(radius=2.0, percent=140, threshold=2))
        
        # コントラスト微調整 (白タイル床と陰影のメリハリ)
        enhancer_con = ImageEnhance.Contrast(im_sharp)
        im_con = enhancer_con.enhance(1.06)
        
        # シャープネス追加補正
        enhancer_shp = ImageEnhance.Sharpness(im_con)
        im_final = enhancer_shp.enhance(1.25)

        # 2. フルサイズ (最大幅/高 1920px)
        max_dim = 1920
        if max(w, h) > max_dim:
            ratio = max_dim / max(w, h)
            new_size = (int(w * ratio), int(h * ratio))
            im_full = im_final.resize(new_size, Image.Resampling.LANCZOS)
        else:
            im_full = im_final

        im_full.save(out_webp, "WEBP", quality=85, method=6)

        # 3. サムネイル (最大幅/高 800px)
        thumb_dim = 800
        ratio_t = thumb_dim / max(w, h)
        thumb_size = (int(w * ratio_t), int(h * ratio_t))
        im_thumb = im_final.resize(thumb_size, Image.Resampling.LANCZOS)
        im_thumb.save(thumb_webp, "WEBP", quality=80, method=6)

        print(f"[{idx:02d}/20] 変換完了: {filename} ➔ {out_webp.name} (元: {w}x{h} ➔ {im_full.size[0]}x{im_full.size[1]})")

def main():
    jpg_files = sorted([f for f in SRC_DIR.iterdir() if f.suffix.lower() == ".jpg"])
    print(f"📸 [川越市 Y様邸] 対象写真: {len(jpg_files)} 枚")

    for idx, f in enumerate(jpg_files, 1):
        enhance_and_convert(f, idx)

    print("\n🎉 川越市 Y様邸の全20枚 ボケ補正・WebP変換が完了しました！")
    print(f"📂 出力先: {OUT_DIR.resolve()}")

if __name__ == '__main__':
    main()
