# -*- coding: utf-8 -*-
"""
scripts/create_furniture_removal_mask.py
実写真 DSC_8769 (960x640) から家具・調度品領域を抽出し、
インペイント用マスクおよび家具なしクリーンベースを作成するスクリプト。
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

BASE_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity"
EXTRACTED_DIR = os.path.join(BASE_DIR, "public", "renders", "controlnet_extracted", "ときがわ町 K様邸")
PHOTO_PATH = os.path.join(BASE_DIR, "raw_source_cases", "ときがわ町 K様邸", "リビング", "DSC_8769.jpg")

TARGET_W = 960
TARGET_H = 640

def generate_furniture_mask():
    photo = Image.open(PHOTO_PATH).convert("RGB").resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
    
    # マスク画像（黒=保持、白=家具・再生成対象）
    mask = Image.new("L", (TARGET_W, TARGET_H), 0)
    draw = ImageDraw.Draw(mask)
    
    # 1. 手前の白いオットマン & ローテーブル (x: 0〜530, y: 440〜640)
    draw.polygon([
        (0, 440), (360, 455), (525, 475), (510, 640), (0, 640)
    ], fill=255)
    
    # 2. 中央のダイニングテーブル、ベンチ、椅子、ドット柄ラグ (x: 340〜660, y: 355〜510)
    draw.polygon([
        (340, 420), (390, 360), (555, 360), (645, 345),
        (650, 465), (595, 510), (340, 490)
    ], fill=255)
    
    # 3. 左奥のテレビボード、TV、小物 (x: 175〜400, y: 300〜470)
    draw.polygon([
        (185, 300), (315, 300), (380, 370), (410, 370),
        (405, 460), (180, 460), (160, 415)
    ], fill=255)
    
    # 4. 天井のペンダントライト笠 (2灯)
    draw.ellipse([410, 195, 475, 275], fill=255)
    draw.ellipse([525, 195, 580, 265], fill=255)
    
    # 5. 時計と壁の小さな飾り (x: 55〜155, y: 55〜150)
    draw.ellipse([55, 55, 150, 145], fill=255)
    
    # 少し膨張（Dilation）して境界の隙間をなくす
    mask_blurred = mask.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(3))
    
    mask_path = os.path.join(EXTRACTED_DIR, "furniture_mask.png")
    mask_blurred.save(mask_path)
    print(f"Furniture mask saved: {mask_path}")
    
    # マスクの確認用オーバーレイ画像の作成
    overlay = photo.copy()
    mask_arr = np.array(mask_blurred)
    overlay_arr = np.array(overlay)
    # マスク領域を半透明レッドに着色
    red_tint = overlay_arr.copy()
    red_tint[:, :, 0] = np.clip(red_tint[:, :, 0] * 0.3 + 180, 0, 255)
    red_tint[:, :, 1] = np.clip(red_tint[:, :, 1] * 0.3, 0, 255)
    red_tint[:, :, 2] = np.clip(red_tint[:, :, 2] * 0.3, 0, 255)
    
    alpha = (mask_arr / 255.0)[:, :, None]
    preview_arr = (overlay_arr * (1 - alpha) + red_tint * alpha).astype(np.uint8)
    preview_img = Image.fromarray(preview_arr)
    preview_path = os.path.join(EXTRACTED_DIR, "furniture_mask_preview.jpg")
    preview_img.save(preview_path, quality=90)
    print(f"Mask preview saved: {preview_path}")
    
    return mask_path

if __name__ == "__main__":
    generate_furniture_mask()
