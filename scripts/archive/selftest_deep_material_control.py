# -*- coding: utf-8 -*-
"""
scripts/selftest_deep_material_control.py
=========================================
素材変更ボタン（壁タイル、床ダークウォールナット）の徹底的な精度向上テスト。
Denoising 0.58, 0.64, 0.70 と、プロンプト重み(1.6〜1.8)、
および「ControlNet is more important」拘束による、
【形状1ミリも崩さずに素材・色彩のみを100%変革する】限界値の確立。
"""

import os
import sys
import json
import time
import base64
import urllib.request
import numpy as np
from io import BytesIO
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity"
EXTRACTED_DIR = os.path.join(BASE_DIR, "public", "renders", "controlnet_extracted", "ときがわ町 K様邸")
OUTPUT_DIR = os.path.join(EXTRACTED_DIR, "selftest_deep_material")
os.makedirs(OUTPUT_DIR, exist_ok=True)

GPU_URL = "http://192.168.11.104:7861"
TARGET_W = 960
TARGET_H = 640

def to_base64_jpeg(path):
    im = Image.open(path).convert("RGB").resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
    buf = BytesIO()
    im.save(buf, format="JPEG", quality=95)
    return base64.b64encode(buf.getvalue()).decode("utf-8")

def to_base64_png(path):
    im = Image.open(path).resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
    buf = BytesIO()
    im.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")

base_path = os.path.join(EXTRACTED_DIR, "real_unfurnished_clean_base.jpg")
edge_path = os.path.join(EXTRACTED_DIR, "ldk_precision_edges.png")
depth_path = os.path.join(EXTRACTED_DIR, "ldk_smooth_depth.png")

b64_base = to_base64_jpeg(base_path)
b64_edge = to_base64_png(edge_path)
b64_depth = to_base64_png(depth_path)

# テストマトリクス
EXPERIMENTS = [
    # --- 壁素材：高級大判グレーストーンタイルへの劇的変革 ---
    {
        "id": "tile_denoise058",
        "category": "Wall_Tile",
        "prompt": (
            "masterpiece, best quality, ultra-detailed architectural photography, "
            "empty unfurnished living room, pristine modern luxury house, "
            "(luxurious large-format textured matte grey stone tiles on the entire right wall, stone accent wall, subtle grout lines:1.7), "
            "pure clean white diatomaceous plaster walls, "
            "broad seamless solid pine wood flooring, "
            "open concept kitchen counter with solid wood bar top on the far wall, "
            "timber-trimmed double-height ceiling void with skylight, "
            "completely empty clean floor, no furniture, "
            "professional architectural photography, Nikon D700, 8k resolution"
        ),
        "negative_prompt": (
            "(wood plank wall, cedar wooden wall, vertical wood planks, shiplap:2.0), "
            "(stairs, staircase:2.2), (furniture:1.9), (people:1.4), blurry, distorted"
        ),
        "denoise": 0.58, "canny_w": 1.25, "depth_w": 0.95, "cfg": 8.5
    },
    {
        "id": "tile_denoise065",
        "category": "Wall_Tile",
        "prompt": (
            "masterpiece, best quality, ultra-detailed architectural photography, "
            "empty unfurnished living room, pristine modern luxury house, "
            "(luxurious large-format textured matte grey stone tiles on the entire right wall, dark grey slate stone accent wall:1.8), "
            "pure clean white diatomaceous plaster walls, "
            "broad seamless solid pine wood flooring, "
            "open concept kitchen counter with solid wood bar top on the far wall, "
            "timber-trimmed double-height ceiling void with skylight, "
            "completely empty clean floor, no furniture, "
            "professional architectural photography, Nikon D700, 8k resolution"
        ),
        "negative_prompt": (
            "(wood plank wall, cedar wooden wall, vertical wood planks, shiplap:2.2), "
            "(stairs, staircase:2.2), (furniture:1.9), (people:1.4), blurry, distorted"
        ),
        "denoise": 0.65, "canny_w": 1.30, "depth_w": 1.0, "cfg": 9.0
    },

    # --- 床素材：深みのあるダークウォールナットへの劇的変革 ---
    {
        "id": "walnut_denoise058",
        "category": "Dark_Walnut_Floor",
        "prompt": (
            "masterpiece, best quality, ultra-detailed architectural photography, "
            "empty unfurnished living room, luxury contemporary house, "
            "(deep dark espresso walnut solid hardwood flooring, rich dark chocolate brown wood planks with low-sheen satin finish:1.8), "
            "(dark brown stained wood baseboards:1.5), "
            "pure clean white diatomaceous plaster walls, "
            "cedar wood paneling on the right wall, "
            "open concept kitchen counter with solid wood bar top on the far wall, "
            "timber-trimmed double-height ceiling void with skylight, "
            "completely empty clean floor, no furniture, "
            "professional architectural photography, Nikon D700, 8k resolution"
        ),
        "negative_prompt": (
            "(light yellow pine flooring, pale wood, blonde hardwood:2.0), "
            "(stairs, staircase:2.2), (furniture:1.9), (people:1.4), blurry, distorted"
        ),
        "denoise": 0.58, "canny_w": 1.25, "depth_w": 0.95, "cfg": 8.5
    },
    {
        "id": "walnut_denoise065",
        "category": "Dark_Walnut_Floor",
        "prompt": (
            "masterpiece, best quality, ultra-detailed architectural photography, "
            "empty unfurnished living room, luxury contemporary house, "
            "(deep dark espresso walnut solid hardwood flooring, rich dark chocolate brown wood planks with low-sheen satin finish:1.9), "
            "(dark brown stained wood baseboards:1.6), "
            "pure clean white diatomaceous plaster walls, "
            "cedar wood paneling on the right wall, "
            "open concept kitchen counter with solid wood bar top on the far wall, "
            "timber-trimmed double-height ceiling void with skylight, "
            "completely empty clean floor, no furniture, "
            "professional architectural photography, Nikon D700, 8k resolution"
        ),
        "negative_prompt": (
            "(light yellow pine flooring, pale wood, blonde hardwood:2.2), "
            "(stairs, staircase:2.2), (furniture:1.9), (people:1.4), blurry, distorted"
        ),
        "denoise": 0.65, "canny_w": 1.30, "depth_w": 1.0, "cfg": 9.0
    }
]

print("=" * 65)
print("  素材変革・境界固定セルフテスト開始 (Denoise 0.58 vs 0.65)")
print("=" * 65)

results = []

for exp in EXPERIMENTS:
    eid = exp["id"]
    print(f"\n--- 生成中: {eid} (Denoise={exp['denoise']}, CannyW={exp['canny_w']}, DepthW={exp['depth_w']}, CFG={exp['cfg']}) ---")
    
    payload = {
        "init_images": [b64_base],
        "prompt": exp["prompt"],
        "negative_prompt": exp["negative_prompt"],
        "steps": 28,
        "cfg_scale": exp["cfg"],
        "denoising_strength": exp["denoise"],
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
                        "weight": exp["canny_w"],
                        "control_mode": "ControlNet is more important",
                        "resize_mode": "Crop and Resize"
                    },
                    {
                        "input_image": b64_depth,
                        "module": "none",
                        "model": "control_v11f1p_sd15_depth [cfd03158]",
                        "weight": exp["depth_w"],
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

    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=180) as res:
            elapsed = time.time() - t0
            resp_data = json.loads(res.read().decode("utf-8"))
            img_bytes = base64.b64decode(resp_data["images"][0])
            
            fpath = os.path.join(OUTPUT_DIR, f"{eid}.jpg")
            with open(fpath, "wb") as f_out:
                f_out.write(img_bytes)
            print(f"  -> [SUCCESS] {eid}.jpg ({len(img_bytes):,} bytes, {elapsed:.1f}s)")
            results.append((eid, fpath))
    except Exception as e:
        print(f"  -> [ERROR] ({eid}): {e}")

print("\n全テスト完了！")
