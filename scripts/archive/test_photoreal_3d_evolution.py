# -*- coding: utf-8 -*-
"""
scripts/test_photoreal_3d_evolution.py
======================================
Claude & Gemini の助言に基づく「フォトリアル飛躍進化テスト」:
1. 白模型の人工的オレンジ枠線を平滑化し、自然な陰影クレイ下絵に整音
2. Denoising Strength を 0.58〜0.66 へ引き上げ（CG感を打破しフォトリアル質感へ変革）
3. ControlNet Depth(0.90) で空間パースを完全固定 + Canny(0.60, End:0.68) で建具直線を固定しつつ早期リリース
"""

import os
import sys
import json
import time
import base64
import urllib.request
import numpy as np
from io import BytesIO
from PIL import Image, ImageFilter

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity"
GPU_URL = "http://192.168.11.104:7861"
OUT_DIR = os.path.join(BASE_DIR, "public", "renders", "pipeline_3d_photoreal", "evolution")
os.makedirs(OUT_DIR, exist_ok=True)

ASSETS_DIR = os.path.join(BASE_DIR, "public", "renders", "controlnet_extracted", "ときがわ町 K様邸")
TARGET_W = 960
TARGET_H = 640

def to_base64(im):
    buf = BytesIO()
    im.save(buf, format="JPEG", quality=95)
    return base64.b64encode(buf.getvalue()).decode("utf-8")

# 1. クレイ下絵の高品質前処理（オレンジのCAD枠線を除去し、上品な建築クレイモデルへ変換）
def prepare_clean_clay_base():
    raw_p = os.path.join(ASSETS_DIR, "unfurnished_base.jpg")
    raw_im = Image.open(raw_p).convert("RGB").resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
    arr = np.array(raw_im, dtype=np.float32)

    # オレンジ枠線の検知と平滑化
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    orange_mask = (r > 180) & (g > 80) & (g < 170) & (b < 80)
    
    # オレンジ枠線を周囲の白壁・薄木色に置換
    arr[orange_mask, 0] = 230
    arr[orange_mask, 1] = 225
    arr[orange_mask, 2] = 215

    # ほんのり柔らかな陰影グラデーション（天井から床へ）
    for y in range(TARGET_H):
        v = 1.0 - (y / TARGET_H) * 0.12
        arr[y, :, :] *= v

    clean_clay = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    clean_p = os.path.join(OUT_DIR, "clean_clay_base.jpg")
    clean_clay.save(clean_p, quality=95)
    print(f"クリーン・クレイ下絵生成完了: {clean_p}")
    return clean_clay

NEGATIVE_PHOTOREAL = (
    "(worst quality, low quality:1.4), (deformed, distorted:1.3), "
    "blurry, text, watermark, signature, people, humans, "
    "crooked walls, bent vertical lines, misaligned windows, bad perspective, "
    "cartoon, anime, 3d render plastic look, CG look, flat lighting, oversaturated, "
    "(stairs, staircase, steps, ladder:2.2), " # 階段ハルシネーション阻止
    "(furniture, sofa, dining table, chairs, clutter, trash, wires:1.9)" # 完全空室
)

COMMON_QUALITY = (
    "award-winning architectural photography, physically based materials, realistic global illumination, "
    "natural light transport, realistic reflections, accurate material roughness, detailed microtexture, "
    "perfectly straight vertical lines, 24mm architectural tilt-shift lens, soft ambient occlusion, "
    "8k resolution, photorealistic, ArchDaily feature"
)

TEST_EVOLUTION = [
    {
        "id": "evo_p1_cedar_day",
        "title": "進化版①: 吉野杉無垢床 × 白漆喰壁 × 朝の柔らかな自然光",
        "prompt": (
            f"{COMMON_QUALITY}, "
            "empty unfurnished spacious modern Japanese living room, double-height ceiling void, "
            "seamless solid natural Yoshino cedar hardwood flooring with realistic organic wood grain and satin finish, "
            "pure white hand-plastered diatomaceous earth walls with subtle artisan trowel texture, "
            "open kitchen pass-through counter on far wall, bright soft natural morning daylight flooding in, "
            "realistic soft contact shadows on floor, calm airy atmosphere"
        ),
        "denoise": 0.62,
        "depth_w": 0.90, "canny_w": 0.58, "canny_end": 0.68,
        "tint_floor": False
    },
    {
        "id": "evo_p2_dark_walnut",
        "title": "進化版②: 高級ダークウォールナット無垢床 × 重厚モダン",
        "prompt": (
            f"{COMMON_QUALITY}, "
            "empty unfurnished luxury contemporary Japanese residence, double-height ceiling, "
            "rich dark espresso walnut solid hardwood flooring with deep chocolate tones and authentic wood plank seams, "
            "pure clean white diatomaceous plaster walls, matching dark wood baseboards, "
            "soft architectural daylight, realistic floor reflections, pristine empty interior"
        ),
        "denoise": 0.62,
        "depth_w": 0.90, "canny_w": 0.58, "canny_end": 0.68,
        "tint_floor": True
    },
    {
        "id": "evo_p3_stone_tiles",
        "title": "進化版③: アクセント壁 大判グレーストーンタイル × 無垢床",
        "prompt": (
            f"{COMMON_QUALITY}, "
            "empty modern Japanese living room, "
            "(luxurious large-format textured matte grey stone feature tiles on the far kitchen wall:1.7), "
            "seamless natural solid hardwood flooring, pure white plaster side walls, "
            "clean architectural lines, soft diffused daylight, high-end residential interior"
        ),
        "denoise": 0.64,
        "depth_w": 0.90, "canny_w": 0.60, "canny_end": 0.70,
        "tint_floor": False
    },
    {
        "id": "evo_p4_twilight_cove",
        "title": "進化版④: 夕景トワイライト × 2700Kコーブ間接照明の陰影",
        "prompt": (
            f"{COMMON_QUALITY}, "
            "empty unfurnished Japanese residence at twilight blue hour dusk, "
            "deep navy blue twilight sky visible through window openings, "
            "warm 2700K ambient indirect cove lighting glowing along the high ceiling edge, "
            "soft warm illumination washing down the white plaster walls, "
            "solid hardwood flooring with subtle warm reflections, tranquil luxury evening ambiance"
        ),
        "denoise": 0.65,
        "depth_w": 0.88, "canny_w": 0.55, "canny_end": 0.68,
        "tint_floor": False
    }
]

def run_evolution():
    print("=" * 70)
    print("  3D CAD連携 Multi-ControlNet フォトリアル飛躍進化テスト開始")
    print(f"  GPU接続先: {GPU_URL}")
    print(f"  出力先  : {OUT_DIR}")
    print("=" * 70)

    clean_clay = prepare_clean_clay_base()
    b64_clay_orig = to_base64(clean_clay)

    depth_img = Image.open(os.path.join(ASSETS_DIR, "unfurnished_depth.png")).convert("RGB").resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
    edge_img = Image.open(os.path.join(ASSETS_DIR, "unfurnished_structural_edges.png")).convert("RGB").resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
    b64_depth = to_base64(depth_img)
    b64_edge = to_base64(edge_img)

    for item in TEST_EVOLUTION:
        iid = item["id"]
        title = item["title"]
        prompt = item["prompt"]
        denoise = item["denoise"]
        dw = item["depth_w"]
        cw = item["canny_w"]
        ce = item["canny_end"]

        print(f"\n--- 実行中: {iid} ({title}) ---")
        print(f"  Denoise: {denoise} | Depth: {dw} | Canny: {cw} (End: {ce})")

        if item["tint_floor"]:
            arr = np.array(clean_clay, dtype=np.float32)
            for y in range(int(TARGET_H * 0.55), TARGET_H):
                weight = (y - TARGET_H * 0.55) / (TARGET_H * 0.45)
                arr[y, :, 0] *= (1.0 - weight * 0.55)
                arr[y, :, 1] *= (1.0 - weight * 0.65)
                arr[y, :, 2] *= (1.0 - weight * 0.70)
            tinted_clay = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
            b64_clay_input = to_base64(tinted_clay)
        else:
            b64_clay_input = b64_clay_orig

        payload = {
            "init_images": [b64_clay_input],
            "prompt": prompt,
            "negative_prompt": NEGATIVE_PHOTOREAL,
            "steps": 32,
            "cfg_scale": 7.0,
            "denoising_strength": denoise,
            "width": TARGET_W,
            "height": TARGET_H,
            "sampler_name": "DPM++ 2M Karras",
            "seed": 20261016,
            "alwayson_scripts": {
                "controlnet": {
                    "args": [
                        {
                            "input_image": b64_depth,
                            "module": "none",
                            "model": "control_v11f1p_sd15_depth [cfd03158]",
                            "weight": dw,
                            "ending_step": 1.0,
                            "control_mode": "Balanced",
                            "resize_mode": "Crop and Resize"
                        },
                        {
                            "input_image": b64_edge,
                            "module": "none",
                            "model": "control_v11p_sd15_canny [d14c016b]",
                            "weight": cw,
                            "ending_step": ce,
                            "control_mode": "ControlNet is more important",
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

                out_path = os.path.join(OUT_DIR, f"{iid}.jpg")
                with open(out_path, "wb") as f_out:
                    f_out.write(img_bytes)

                print(f"  -> [SUCCESS] 保存完了: {iid}.jpg ({len(img_bytes):,} bytes, {elapsed:.1f}s)")
        except Exception as e:
            print(f"  -> [ERROR] ({iid}): {e}")

    print("\n進化版レンダリング全件完了！")

if __name__ == "__main__":
    run_evolution()
