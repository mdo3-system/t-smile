# -*- coding: utf-8 -*-
"""
scripts/generate_pure_fbx_unfurnished_perspectives.py
実写真を一切使わず、ARCHITREND ZERO から書き出された純粋な 3D FBX モデル
（生メッシュ・深度マップ）のみを起点として、
まずは「家具なし（空室）新築建築パース」を生成する。
Genspark 全40セット（Preset 11: LDK・昼・南窓 等）に完全準拠。
"""
import os
import sys
import json
import base64
import urllib.request
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity"
EXTRACTED_DIR = os.path.join(BASE_DIR, "public", "renders", "controlnet_extracted", "ときがわ町 K様邸")
OUTPUT_DIR = os.path.join(EXTRACTED_DIR, "genspark_pure_fbx")
os.makedirs(OUTPUT_DIR, exist_ok=True)

SD_URL = "http://192.168.11.104:7860"

def img_to_b64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def b64_to_file(b64_str, out_path):
    with open(out_path, "wb") as f:
        f.write(base64.b64decode(b64_str))

def run_pure_fbx_pipeline():
    normal_path = os.path.join(EXTRACTED_DIR, "ldk_normal.png")
    depth_path = os.path.join(EXTRACTED_DIR, "ldk_depth.png")
    
    if not os.path.exists(normal_path) or not os.path.exists(depth_path):
        print(f"Error: {normal_path} or {depth_path} not found!")
        return

    print("FBX純粋アセット読み込み:")
    print(f"  生メッシュ (Normal): {normal_path}")
    print(f"  深度マップ (Depth) : {depth_path}")

    # 解像度 960x640 (3:2 Nikon D700一眼レフ比率)
    normal_b64 = img_to_b64(normal_path)
    depth_b64 = img_to_b64(depth_path)

    # Genspark 推奨 共通ネガティブ
    genspark_negative = (
        "furniture, sofa, chairs, table, dining table, television, carpets, decorations, clutter, "
        "blurry, low quality, distorted proportions, warped walls, curved lines, fisheye, cartoon, "
        "anime, painting, illustration, oversaturated, watermark, text, logo, people, humans, "
        "extra windows, floating objects, deformed furniture"
    )

    # シーン1: LDK・昼・南窓（家具なし空室・新築引き渡し時）
    prompt_day = (
        "architectural photography, completely empty unfurnished Japanese modern LDK, wide living dining kitchen, "
        "no furniture, vacant room, brand new house handover, pristine natural solid hinoki wood flooring, "
        "smooth matte white plaster walls, south facing large window with soft bright natural daylight, "
        "clean kitchen counter with wood trim, subtle recessed ceiling lighting, sharp straight architectural lines, "
        "photorealistic, 8k, interior design magazine photo"
    )

    # シーン2: LDK・夕方〜黄昏（家具なし空室・間接照明と窓の茜色）
    prompt_evening = (
        "architectural photography, completely empty unfurnished Japanese modern LDK, wide living dining kitchen, "
        "no furniture, vacant room, brand new house, pristine natural solid wood flooring, smooth white plaster walls, "
        "warm pendant lights and indirect cove ceiling lighting glowing softly, sunset dusk orange glow through windows, "
        "cozy serene evening atmosphere, sharp straight architectural lines, photorealistic, 8k"
    )

    tasks = [
        {
            "id": "step1_pure_fbx_unfurnished_day_txt2img",
            "name": "【第1段階: 空室パース・昼景 (txt2img)】純粋FBX幾何から家具なし生成",
            "mode": "txt2img",
            "prompt": prompt_day,
            "negative_prompt": genspark_negative,
            "steps": 28,
            "cfg_scale": 6.5,
            "cn_depth_weight": 0.65,
            "cn_depth_end": 0.80,
            "cn_canny_weight": 0.45,
            "cn_canny_end": 0.70
        },
        {
            "id": "step1_pure_fbx_unfurnished_day_img2img_denoise60",
            "name": "【第1段階: 空室パース・昼景 (img2img)】生メッシュ質感補正 (denoise=0.60)",
            "mode": "img2img",
            "denoising_strength": 0.60,
            "prompt": prompt_day,
            "negative_prompt": genspark_negative,
            "steps": 28,
            "cfg_scale": 6.5,
            "cn_depth_weight": 0.65,
            "cn_depth_end": 0.80,
            "cn_canny_weight": 0.45,
            "cn_canny_end": 0.70
        },
        {
            "id": "step1_pure_fbx_unfurnished_evening_img2img",
            "name": "【第1段階: 空室パース・夕景 (img2img)】夕景・間接照明 (denoise=0.62)",
            "mode": "img2img",
            "denoising_strength": 0.62,
            "prompt": prompt_evening,
            "negative_prompt": genspark_negative,
            "steps": 28,
            "cfg_scale": 6.5,
            "cn_depth_weight": 0.65,
            "cn_depth_end": 0.80,
            "cn_canny_weight": 0.45,
            "cn_canny_end": 0.70
        }
    ]

    for t in tasks:
        print(f"\n▶ 実行中: {t['name']}...")
        
        # Multi-ControlNet 設定 (Genspark推奨スタック)
        controlnet_args = [
            # Slot 0: Depth
            {
                "input_image": depth_b64,
                "module": "none",
                "model": "control_v11f1p_sd15_depth [cfd03158]",
                "weight": t["cn_depth_weight"],
                "guidance_start": 0.0,
                "guidance_end": t["cn_depth_end"],
                "control_mode": "Balanced"
            },
            # Slot 1: Canny (生メッシュからエッジ抽出)
            {
                "input_image": normal_b64,
                "module": "canny",
                "model": "control_v11p_sd15_canny [d14c016b]",
                "weight": t["cn_canny_weight"],
                "guidance_start": 0.0,
                "guidance_end": t["cn_canny_end"],
                "control_mode": "Balanced"
            }
        ]

        payload = {
            "prompt": t["prompt"],
            "negative_prompt": t["negative_prompt"],
            "steps": t["steps"],
            "cfg_scale": t["cfg_scale"],
            "width": 960,
            "height": 640,
            "sampler_name": "DPM++ 2M Karras",
            "alwayson_scripts": {
                "controlnet": {
                    "args": controlnet_args
                }
            }
        }

        if t["mode"] == "txt2img":
            endpoint = f"{SD_URL}/sdapi/v1/txt2img"
        else:
            endpoint = f"{SD_URL}/sdapi/v1/img2img"
            payload["init_images"] = [normal_b64]
            payload["denoising_strength"] = t["denoising_strength"]

        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            endpoint,
            data=req_data,
            headers={"Content-Type": "application/json"}
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                images = result.get("images", [])
                if images:
                    out_file = os.path.join(OUTPUT_DIR, f"{t['id']}.jpg")
                    b64_to_file(images[0], out_file)
                    print(f"  ✓ 生成完了: {out_file}")
                else:
                    print("  ⚠️ 画像が返されませんでした")
        except Exception as e:
            print(f"  ❌ エラー発生: {e}")

if __name__ == "__main__":
    run_pure_fbx_pipeline()
