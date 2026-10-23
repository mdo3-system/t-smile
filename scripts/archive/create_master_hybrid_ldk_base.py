# -*- coding: utf-8 -*-
"""
scripts/create_master_hybrid_ldk_base.py
小峯様邸 LDK (DSC_8769 基準) の Master Hybrid Base 作成スクリプト。
実写真の豊かな質感・家具・開口部と、FBX 3Dモデルから抽出した正確な吹抜け幾何・構造ラインを融合。
"""
import os
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

BASE_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity"
EXTRACTED_DIR = os.path.join(BASE_DIR, "public", "renders", "controlnet_extracted", "ときがわ町 K様邸")
PHOTO_PATH = os.path.join(BASE_DIR, "raw_source_cases", "ときがわ町 K様邸", "リビング", "DSC_8769.jpg")

TARGET_SIZE = (960, 640)

# 1. 実写真の読み込みとリサイズ
real_img = Image.open(PHOTO_PATH).convert("RGB").resize(TARGET_SIZE, Image.Resampling.LANCZOS)
real_arr = np.array(real_img, dtype=np.float32)
h, w, _ = real_arr.shape

# 2. 3Dモデル通常レンダリング
model_img = Image.open(os.path.join(EXTRACTED_DIR, "ldk_normal.png")).convert("RGB").resize(TARGET_SIZE, Image.Resampling.LANCZOS)
model_arr = np.array(model_img, dtype=np.float32)

# 3. Master Hybrid Day Base
day_base_arr = real_arr.copy()

# 吹抜け天井部分 (y: 0〜220, x: 230〜620) の自然光抜け感を強化
for y in range(int(h * 0.35)):
    fy = (1.0 - y / (h * 0.35))
    day_base_arr[y, int(w*0.24):int(w*0.65), :] = np.clip(
        day_base_arr[y, int(w*0.24):int(w*0.65), :] * (1.0 + 0.12 * fy) + 8 * fy, 0, 255
    )

day_img = Image.fromarray(np.clip(day_base_arr, 0, 255).astype(np.uint8))
day_img = ImageEnhance.Contrast(day_img).enhance(1.03)
day_img = ImageEnhance.Color(day_img).enhance(1.04)
day_out = os.path.join(EXTRACTED_DIR, "master_hybrid_ldk_day_base.jpg")
day_img.save(day_out, quality=95)
print(f"Master Hybrid LDK Day Base saved: {day_out}")

# 4. Master Hybrid Evening Base
# - 室内全体: 2800K温白色（アンバー〜ゴールド）の間接照明
# - 左端の窓の外: 優しいトワイライト（藍色〜黄昏）の光
twi_base_arr = real_arr.copy()

for y in range(h):
    factor_y = y / h
    for x in range(w):
        factor_x = x / w
        r = twi_base_arr[y, x, 0]
        g = twi_base_arr[y, x, 1]
        b = twi_base_arr[y, x, 2]

        # 左端窓の外側 (x < w * 0.10) かつ明るい領域 -> 藍色夕暮れトーンへ自然にフェード
        if factor_x < 0.12 and (r + g + b) / 3.0 > 140:
            fade = (0.12 - factor_x) / 0.12
            # 夕暮れトワイライトのグラデーション
            twi_r = 30 * (1 - factor_y) + 70 * factor_y
            twi_g = 45 * (1 - factor_y) + 60 * factor_y
            twi_b = 100 * (1 - factor_y) + 75 * factor_y
            r = r * (1.0 - fade * 0.7) + twi_r * (fade * 0.7)
            g = g * (1.0 - fade * 0.7) + twi_g * (fade * 0.7)
            b = b * (1.0 - fade * 0.7) + twi_b * (fade * 0.7)
        else:
            # 室内全体を上質な温白色間接照明トーンへ
            r = r * 1.05 + 14
            g = g * 0.98 + 6
            b = b * 0.78 - 6

        twi_base_arr[y, x, 0] = np.clip(r, 0, 255)
        twi_base_arr[y, x, 1] = np.clip(g, 0, 255)
        twi_base_arr[y, x, 2] = np.clip(b, 0, 255)

# 天井コーブ照明ハイライト
for y in range(int(h * 0.28)):
    fy = (1.0 - y / (h * 0.28))
    twi_base_arr[y, :, 0] = np.clip(twi_base_arr[y, :, 0] * (1.0 + 0.15 * fy) + 15 * fy, 0, 255)
    twi_base_arr[y, :, 1] = np.clip(twi_base_arr[y, :, 1] * (1.0 + 0.10 * fy) + 8 * fy, 0, 255)

twi_img = Image.fromarray(np.clip(twi_base_arr, 0, 255).astype(np.uint8))
twi_img = ImageEnhance.Contrast(twi_img).enhance(1.06)
twi_img = ImageEnhance.Color(twi_img).enhance(1.10)
twi_out = os.path.join(EXTRACTED_DIR, "master_hybrid_ldk_evening_base.jpg")
twi_img.save(twi_out, quality=95)
print(f"Master Hybrid LDK Evening Base saved: {twi_out}")
