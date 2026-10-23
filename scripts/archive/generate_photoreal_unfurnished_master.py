# -*- coding: utf-8 -*-
"""
scripts/generate_photoreal_unfurnished_master.py
実写真の正確な建築骨格（左手前吹抜けVoid ＆ キッチン左袖壁）を100%保持し、
家具や小物を完全に排除した「真の新築竣工・家具なしパース」を生成するマスターパイプライン。
"""
import os
import sys
import json
import base64
import urllib.request
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity"
EXTRACTED_DIR = os.path.join(BASE_DIR, "public", "renders", "controlnet_extracted", "ときがわ町 K様邸")
GENSPARK_DIR = os.path.join(EXTRACTED_DIR, "genspark_pure_fbx")
os.makedirs(GENSPARK_DIR, exist_ok=True)

SD_URL = "http://192.168.11.104:7860"
TARGET_W = 960
TARGET_H = 640

def img_to_b64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def b64_to_file(b64_str, out_path):
    with open(out_path, "wb") as f:
        f.write(base64.b64decode(b64_str))

def run_master():
    clean_base_path = os.path.join(EXTRACTED_DIR, "real_unfurnished_clean_base.jpg")
    depth_path = os.path.join(EXTRACTED_DIR, "ldk_smooth_depth.png")
    edge_path = os.path.join(EXTRACTED_DIR, "ldk_precision_edges.png")

    if not os.path.exists(clean_base_path):
        print(f"Error: {clean_base_path} not found")
        return

    # リサイズ確認
    img_b = Image.open(clean_base_path).resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
    clean_resized_path = os.path.join(GENSPARK_DIR, "master_clean_base_960x640.jpg")
    img_b.save(clean_resized_path, quality=95)

    base_b64 = img_to_b64(clean_resized_path)
    depth_b64 = img_to_b64(depth_path)
    edge_b64 = img_to_b64(edge_path)

    prompt = (
        "masterpiece, best quality, ultra-detailed architectural photography, "
        "completely empty unfurnished Japanese modern living room, brand new house handover before move-in, "
        "spacious pristine natural solid pine wood flooring with smooth clean satin finish, "
        "pure white plaster walls, "
        "solid partition wall on the left side of the counter kitchen, open-concept counter kitchen terminating at the partition wall, "
        "double-height ceiling with open void on the left framed by wooden beams, bright natural daylight pouring down from open void, "
        "natural cedar wooden wall paneling on the right wall with vertical wood grain, "
        "large windows with soft natural sunlight, "
        "open doorway on the right leading to hallway, "
        "completely empty floor, no furniture, no sofa, no dining table, no chairs, no television, no rugs, "
        "sharp architectural lines, professional interior photography, 8k"
    )

    negative_prompt = (
        "(closed ceiling over void:1.9), (flat ceiling covering void:1.9), (ceiling board over atrium:1.9), "
        "(extended kitchen counter:1.8), (missing partition wall:1.8), (island kitchen without wall:1.8), "
        "(furniture, sofa, dining table, chairs, table, coffee table, desk:1.8), "
        "(television, tv, monitor:1.7), (rug, carpet, mat, cushions:1.6), "
        "(stairs, staircase:1.9), (people, human:1.5), "
        "blurry, low quality, distorted architecture, crooked walls, cgi look, plastic"
    )

    controlnet_args = [
        # Slot 0: Depth (空間の奥行きを保持)
        {
            "input_image": depth_b64,
            "module": "none",
            "model": "control_v11f1p_sd15_depth [cfd03158]",
            "weight": 0.75,
            "guidance_start": 0.0,
            "guidance_end": 0.80,
            "control_mode": "Balanced"
        },
        # Slot 1: Canny (建築の直線・窓枠・袖壁・梁枠を固定)
        {
            "input_image": edge_b64,
            "module": "none",
            "model": "control_v11p_sd15_canny [d14c016b]",
            "weight": 0.65,
            "guidance_start": 0.0,
            "guidance_end": 0.75,
            "control_mode": "Balanced"
        }
    ]

    tests = [
        {"id": "master_unfurnished_day_denoise40", "denoise": 0.40, "desc": "Denoise 0.40 (原図幾何・吹抜け・袖壁 100%保存)"},
        {"id": "master_unfurnished_day_denoise46", "denoise": 0.46, "desc": "Denoise 0.46 (新築無垢床・光の美しいブレンド)"}
    ]

    for t in tests:
        print(f"\n▶ 生成中: {t['desc']}...")
        payload = {
            "init_images": [base_b64],
            "denoising_strength": t["denoise"],
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "steps": 30,
            "cfg_scale": 7.0,
            "width": TARGET_W,
            "height": TARGET_H,
            "sampler_name": "DPM++ 2M Karras",
            "alwayson_scripts": {
                "controlnet": {
                    "args": controlnet_args
                }
            }
        }

        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{SD_URL}/sdapi/v1/img2img",
            data=req_data,
            headers={"Content-Type": "application/json"}
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                images = result.get("images", [])
                if images:
                    out_path = os.path.join(GENSPARK_DIR, f"{t['id']}.jpg")
                    b64_to_file(images[0], out_path)
                    print(f"  ✓ 生成完了: {out_path}")
                else:
                    print("  ⚠️ 画像が返されませんでした")
        except Exception as e:
            print(f"  ❌ エラー: {e}")

if __name__ == "__main__":
    run_master()
