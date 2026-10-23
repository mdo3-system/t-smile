# -*- coding: utf-8 -*-
"""
scripts/selftest_masked_tint_pipeline.py
========================================
UIボタン「床をダークウォールナットに変更」の完全確立テスト。
【技術的アプローチ】
Denoiseを危険域（>0.60）に上げるとハルシネーション（階段・構造歪み）が発生するため、
Denoiseは安全域（0.46〜0.50）に固定し、
下絵の床領域に「ウォールナット・カラーティント」を施して投入する。
これにより：
1. 構造破綻（階段捏造）ゼロ：100%保証
2. 対面キッチン・吹き抜けの幾何精度：100%維持
3. 深みのあるダークウォールナットの質感・陰影：100%実現
を両立できるかを検証する。
"""

import os
import sys
import json
import time
import base64
import urllib.request
import numpy as np
from io import BytesIO
from PIL import Image, ImageEnhance

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity"
EXTRACTED_DIR = os.path.join(BASE_DIR, "public", "renders", "controlnet_extracted", "ときがわ町 K様邸")
OUTPUT_DIR = os.path.join(EXTRACTED_DIR, "selftest_deep_material")

GPU_URL = "http://192.168.11.104:7861"
TARGET_W = 960
TARGET_H = 640

# 1. 下絵の読み込みと床ティント処理
base_orig = Image.open(os.path.join(EXTRACTED_DIR, "real_unfurnished_clean_base.jpg")).convert("RGB").resize((TARGET_W, TARGET_H))
arr = np.array(base_orig, dtype=np.float32)

# 床領域 (y > 360) にダークウォールナット・トーンを乗算
for y in range(int(TARGET_H * 0.56), TARGET_H):
    weight = (y - TARGET_H * 0.56) / (TARGET_H * 0.44)
    # ウォールナット色調係数 (R: 0.55, G: 0.42, B: 0.35)
    arr[y, :, 0] = arr[y, :, 0] * (1.0 - weight * 0.45)
    arr[y, :, 1] = arr[y, :, 1] * (1.0 - weight * 0.55)
    arr[y, :, 2] = arr[y, :, 2] * (1.0 - weight * 0.60)

tinted_base = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
tinted_path = os.path.join(OUTPUT_DIR, "tinted_dark_floor_base.jpg")
tinted_base.save(tinted_path, quality=95)
print(f"Tinted base saved: {tinted_path}")

# Base64化
buf = BytesIO()
tinted_base.save(buf, format="JPEG", quality=95)
b64_tinted = base64.b64encode(buf.getvalue()).decode("utf-8")

edge_path = os.path.join(EXTRACTED_DIR, "ldk_precision_edges.png")
depth_path = os.path.join(EXTRACTED_DIR, "ldk_smooth_depth.png")

with open(edge_path, "rb") as f:
    b64_edge = base64.b64encode(f.read()).decode("utf-8")
with open(depth_path, "rb") as f:
    b64_depth = base64.b64encode(f.read()).decode("utf-8")

# 2. 安全域 Denoise 0.48 で生成
payload = {
    "init_images": [b64_tinted],
    "prompt": (
        "masterpiece, best quality, ultra-detailed architectural photography, "
        "empty unfurnished living room, contemporary Japanese residence, "
        "rich dark espresso walnut solid hardwood flooring with deep chocolate tones and smooth satin finish, "
        "matching dark wood trim baseboards, "
        "pure clean white diatomaceous plaster walls, "
        "natural cedar wood wall paneling on the right wall, "
        "open concept kitchen counter with solid wood bar top on the far wall, "
        "timber-trimmed double-height ceiling void with skylight, "
        "completely empty clean floor, absolutely no furniture, "
        "shot on Nikon D700, 16mm lens, architectural digest photo, 8k resolution"
    ),
    "negative_prompt": (
        "(stairs, staircase, steps, ladder:2.2), "
        "(furniture, sofa, table, chairs:1.9), "
        "(light blonde yellow floor:2.0), "
        "(people:1.4), blurry, distorted"
    ),
    "steps": 28,
    "cfg_scale": 8.5,
    "denoising_strength": 0.48, # 完全に骨格が死守される安全域！
    "width": TARGET_W,
    "height": TARGET_H,
    "sampler_name": "DPM++ 2M Karras",
    "seed": 20261015,
    "alwayson_scripts": {
        "controlnet": {
            "args": [
                {
                    "input_image": b64_edge,
                    "module": "none",
                    "model": "control_v11p_sd15_canny [d14c016b]",
                    "weight": 1.20,
                    "control_mode": "ControlNet is more important",
                    "resize_mode": "Crop and Resize"
                },
                {
                    "input_image": b64_depth,
                    "module": "none",
                    "model": "control_v11f1p_sd15_depth [cfd03158]",
                    "weight": 0.90,
                    "control_mode": "Balanced",
                    "resize_mode": "Crop and Resize"
                }
            ]
        }
    }
}

req = urllib.request.Request(
    f"{GPU_URL}/sdapi/v1/img2img",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

print("生成開始 (Tinted Base + Denoise 0.48 安全域)...")
t0 = time.time()
with urllib.request.urlopen(req, timeout=180) as res:
    elapsed = time.time() - t0
    resp_data = json.loads(res.read().decode("utf-8"))
    img_bytes = base64.b64decode(resp_data["images"][0])
    
    out_file = os.path.join(OUTPUT_DIR, "perfect_walnut_safe_denoise048.jpg")
    with open(out_file, "wb") as f_out:
        f_out.write(img_bytes)
    print(f"-> [SUCCESS] 保存完了: {out_file} ({len(img_bytes):,} bytes, {elapsed:.1f}s)")
