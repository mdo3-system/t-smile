# -*- coding: utf-8 -*-
"""
scripts/run_thorough_unfurnished_campaign.py
完全クリーン実写真ベース + フルフラット高精度構造エッジ + 滑らか深度マップを用い、
階段捏造ゼロ・家具完全ゼロ・高精細建築パースを徹底生成するスクリプト。
"""
import os
import sys
import json
import time
import base64
import urllib.request
from io import BytesIO
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity"
EXTRACTED_DIR = os.path.join(BASE_DIR, "public", "renders", "controlnet_extracted", "ときがわ町 K様邸")
OUTPUT_DIR = os.path.join(EXTRACTED_DIR, "unfurnished_experiments")
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

print(f"Loading perfect clean assets...")
b64_base = to_base64_jpeg(base_path)
b64_edge = to_base64_png(edge_path)
b64_depth = to_base64_png(depth_path)

PROMPT = (
    "masterpiece, best quality, ultra-detailed architectural photography, "
    "empty unfurnished living room and dining room, pristine completely vacant Japanese modern house before move-in, "
    "broad seamless solid pine wood flooring with smooth realistic natural wood grain texture and soft satin finish, "
    "pure clean white diatomaceous plaster walls, "
    "natural Yoshino cedar solid wood plank paneling on the right wall with distinct vertical grain, "
    "open concept kitchen counter with solid wood bar top on the far wall, "
    "timber-trimmed double-height ceiling void with soft bright natural skylight cascading down, "
    "large sliding glass patio doors on the left letting in gentle diffused garden daylight, "
    "completely empty clean floor, absolutely no furniture, no sofa, no table, no chairs, no rug, "
    "professional architectural digest photo, shot on Nikon D700, 16mm lens, crisp focus, 8k resolution, photorealistic"
)

NEGATIVE_PROMPT = (
    "(stairs, staircase, steps, ladder, wooden staircase, spiral stairs, attic steps:2.0), "
    "(furniture, sofa, couch, dining table, chairs, table, bench, rug, carpet, mat, coffee table:1.8), "
    "(tv, television, electronics, boxes, clutter, trash, decorations:1.5), "
    "(step, raised floor, skip floor, tatami corner:1.6), "
    "(people, human, person:1.4), "
    "hallucination, distorted architecture, floating objects, crooked lines, blurry, low quality, cgi, 3d render look"
)

EXPERIMENTS = [
    {
        "id": "flat_exp01_denoise040",
        "title": "Denoise 0.40 (テクスチャ忠実・自然な床融合)",
        "denoise": 0.40,
        "canny_w": 1.05,
        "depth_w": 0.85,
        "control_mode": "Balanced",
        "cfg": 8.0,
        "seed": 20261015
    },
    {
        "id": "flat_exp02_denoise046",
        "title": "Denoise 0.46 (推奨・陰影と漆喰光沢の最適バランス)",
        "denoise": 0.46,
        "canny_w": 1.15,
        "depth_w": 0.90,
        "control_mode": "ControlNet is more important",
        "cfg": 8.5,
        "seed": 20261015
    },
    {
        "id": "flat_exp03_denoise052",
        "title": "Denoise 0.52 (高精細・無垢フローリング艶感最大化)",
        "denoise": 0.52,
        "canny_w": 1.25,
        "depth_w": 0.95,
        "control_mode": "ControlNet is more important",
        "cfg": 8.5,
        "seed": 20261015
    },
    {
        "id": "flat_exp04_denoise058",
        "title": "Denoise 0.58 (完全再構築・超高精細建築パース)",
        "denoise": 0.58,
        "canny_w": 1.30,
        "depth_w": 1.00,
        "control_mode": "ControlNet is more important",
        "cfg": 9.0,
        "seed": 20261015
    }
]

def run_campaign():
    print(f"\n==================================================")
    print(f"  フルフラット家具なしLDK 徹底生成実験開始")
    print(f"  総実験数: {len(EXPERIMENTS)} パターン")
    print(f"==================================================")
    
    results = []
    
    for i, exp in enumerate(EXPERIMENTS, 1):
        exp_id = exp["id"]
        print(f"\n[{i}/{len(EXPERIMENTS)}] 実行中: {exp['title']}")
        start_t = time.time()
        
        payload = {
            "init_images": [b64_base],
            "prompt": PROMPT,
            "negative_prompt": NEGATIVE_PROMPT,
            "steps": 32,
            "cfg_scale": exp["cfg"],
            "denoising_strength": exp["denoise"],
            "width": TARGET_W,
            "height": TARGET_H,
            "sampler_name": "DPM++ 2M Karras",
            "seed": exp["seed"],
            "alwayson_scripts": {
                "controlnet": {
                    "args": [
                        {
                            "input_image": b64_edge,
                            "module": "none",
                            "model": "control_v11p_sd15_canny [d14c016b]",
                            "weight": exp["canny_w"],
                            "control_mode": exp["control_mode"],
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
        
        try:
            with urllib.request.urlopen(req, timeout=180) as res:
                resp = json.loads(res.read().decode("utf-8"))
                img_data = base64.b64decode(resp["images"][0])
                elapsed = time.time() - start_t
                
                out_path = os.path.join(OUTPUT_DIR, f"{exp_id}.jpg")
                with open(out_path, "wb") as f_out:
                    f_out.write(img_data)
                    
                gall_path = os.path.join(EXTRACTED_DIR, f"{exp_id}.jpg")
                with open(gall_path, "wb") as f_gall:
                    f_gall.write(img_data)
                    
                print(f"  -> 成功: {exp_id}.jpg ({len(img_data)} bytes, 生成時間: {elapsed:.1f}秒)")
                results.append((exp_id, exp["title"], out_path))
        except Exception as e:
            print(f"  -> エラー ({exp_id}): {e}")
            
    print(f"\n==================================================")
    print(f"  全実験完了! 成果物一覧:")
    for r_id, r_title, r_path in results:
        print(f"  - {r_id}: {r_path}")
    print(f"==================================================")

if __name__ == "__main__":
    run_campaign()
