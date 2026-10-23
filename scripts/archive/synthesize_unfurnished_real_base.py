# -*- coding: utf-8 -*-
"""
scripts/synthesize_unfurnished_real_base.py
実写真 DSC_8769 から家具（テーブル、椅子、ソファ、TV台等）を消去し、
美しい無垢フローリングと珪藻土白壁（オフホワイト）で補完した
「完全家具なし（新築引き渡し直後）」の実写真クリーンベースを合成するスクリプト。
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

BASE_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity"
EXTRACTED_DIR = os.path.join(BASE_DIR, "public", "renders", "controlnet_extracted", "ときがわ町 K様邸")
PHOTO_PATH = os.path.join(BASE_DIR, "raw_source_cases", "ときがわ町 K様邸", "リビング", "DSC_8769.jpg")

TARGET_W = 960
TARGET_H = 640

def synthesize_unfurnished_base():
    photo = Image.open(PHOTO_PATH).convert("RGB").resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
    
    # 1. 右側の美しい無垢フローリング（x: 550〜760, y: 470〜630）をサンプリング
    floor_patch = photo.crop((550, 470, 760, 630))
    
    # 2. 完全な下地キャンバスの作成
    canvas = photo.copy()
    draw_c = ImageDraw.Draw(canvas)
    
    # 【床面】y: 450〜640 を完全な無垢フローリングで敷き詰める
    f_large1 = floor_patch.resize((500, 220), Image.Resampling.LANCZOS)
    f_large2 = floor_patch.transpose(Image.FLIP_LEFT_RIGHT).resize((500, 220), Image.Resampling.LANCZOS)
    canvas.paste(f_large1, (0, 440))
    canvas.paste(f_large2, (460, 440))
    # 手前最前面
    canvas.paste(f_large2, (0, 480))
    
    # 【左奥の白漆喰壁】x: 160〜415, y: 285〜470 を自然なオフホワイト珪藻土色で塗る
    draw_c.rectangle([160, 285, 415, 470], fill=(244, 241, 236))
    
    # 【対面キッチン腰壁】x: 415〜615, y: 315〜470 を自然な白壁で塗る
    draw_c.rectangle([415, 315, 615, 470], fill=(240, 237, 232))
    
    # 【対面キッチンカウンター笠木（天板）】x: 415〜615, y: 308〜320 (木製カウンター)
    draw_c.rectangle([415, 308, 615, 320], fill=(215, 175, 130))
    
    # 【巾木】y: 468〜472（床と壁の接地点）
    draw_c.rectangle([160, 468, 615, 472], fill=(190, 150, 110))
    
    # 【時計の除去】x: 55〜155, y: 55〜150 を天井・壁のオフホワイトで塗る
    draw_c.rectangle([55, 55, 155, 150], fill=(245, 243, 238))
    
    # 3. 家具マスクの作成
    mask = Image.new("L", (TARGET_W, TARGET_H), 0)
    draw_m = ImageDraw.Draw(mask)
    # 手前オットマン・ローテーブル (x: 0〜540, y: 390〜640)
    draw_m.polygon([(0, 380), (370, 390), (540, 430), (520, 640), (0, 640)], fill=255)
    # 中央ダイニング＆ラグ (x: 330〜660, y: 310〜510)
    draw_m.polygon([(330, 420), (380, 310), (560, 310), (655, 310), (655, 465), (595, 510), (330, 490)], fill=255)
    # TV台＆TV (x: 160〜415, y: 285〜475)
    draw_m.polygon([(160, 285), (320, 285), (380, 370), (415, 370), (415, 475), (160, 475)], fill=255)
    # 時計 (x: 55〜155, y: 55〜150)
    draw_m.ellipse([55, 55, 150, 145], fill=255)
    
    mask_soft = mask.filter(ImageFilter.GaussianBlur(radius=5))
    
    # 4. 合成
    clean_base = Image.composite(canvas, photo, mask_soft)
    
    out_path = os.path.join(EXTRACTED_DIR, "real_unfurnished_clean_base.jpg")
    clean_base.save(out_path, quality=95)
    print(f"Clean Base generated: {out_path}")
    return out_path

if __name__ == "__main__":
    synthesize_unfurnished_base()
