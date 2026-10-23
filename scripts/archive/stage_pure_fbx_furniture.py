# -*- coding: utf-8 -*-
"""
scripts/stage_pure_fbx_furniture.py
第1段階で完成した純粋FBX「家具なし（空室）新築建築パース」を土台にして、
第2段階として好みのインテリアスタイル（ジャパンディ・北欧ナチュラル・ホテルライク等）で
家具配置・デコレーション（バーチャルステージング）を行う。
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
GENSPARK_DIR = os.path.join(EXTRACTED_DIR, "genspark_pure_fbx")
SD_URL = "http://192.168.11.104:7860"

def img_to_b64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def b64_to_file(b64_str, out_path):
    with open(out_path, "wb") as f:
        f.write(base64.b64decode(b64_str))

def run_furniture_staging():
    # 土台となる家具なしパース
    base_unfurnished_path = os.path.join(GENSPARK_DIR, "step1_pure_fbx_unfurnished_day_img2img_denoise60.jpg")
    depth_path = os.path.join(EXTRACTED_DIR, "ldk_depth.png")
    normal_path = os.path.join(EXTRACTED_DIR, "ldk_normal.png")

    if not os.path.exists(base_unfurnished_path):
        print(f"Error: {base_unfurnished_path} does not exist!")
        return

    base_b64 = img_to_b64(base_unfurnished_path)
    depth_b64 = img_to_b64(depth_path)
    normal_b64 = img_to_b64(normal_path)

    # ステージング・スタイル定義
    staging_styles = [
        {
            "id": "step2_staged_japandi_modern",
            "name": "スタイルA: ジャパンディ（北欧×和モダン上質インテリア）",
            "prompt": (
                "photorealistic interior photography, luxury Japanese modern LDK, professionally decorated living room, "
                "elegant low-profile beige fabric modular sofa, natural solid oak dining table with designer wooden chairs, "
                "minimalist ceramic vase with dry branches, large potted fiddle leaf fig indoor plant in corner, "
                "soft textured wool rug on wood floor, sunlit bright atmosphere, architectural digest style, clean lines, 8k"
            ),
            "denoise": 0.44
        },
        {
            "id": "step2_staged_scandinavian_natural",
            "name": "スタイルB: 北欧ナチュラル（明るい無垢材と温もりのインテリア）",
            "prompt": (
                "photorealistic interior photography, warm Scandinavian Japanese living dining room, "
                "light grey fabric comfortable sofa with yellow cushion accents, light wood dining table and chairs, "
                "cozy knitted throw blanket, green potted plants, soft natural daylight flooding in, "
                "inviting family home interior design, ultra realistic, 8k"
            ),
            "denoise": 0.45
        },
        {
            "id": "step2_staged_evening_cozy_luxury",
            "name": "スタイルC: 夕暮れの灯り・ラグジュアリーラウンジスタイル",
            "prompt": (
                "photorealistic night photography, luxury modern Japanese living room at dusk, warm interior lighting, "
                "low charcoal grey designer sofa, warm amber downlights and subtle floor lamp glow, "
                "sleek dark marble coffee table, wine glass on table, cozy intimate evening ambiance, high end magazine photo"
            ),
            "denoise": 0.46
        }
    ]

    genspark_negative = (
        "blurry, low quality, distorted proportions, warped walls, curved lines, fisheye, cartoon, "
        "anime, painting, illustration, oversaturated, watermark, text, logo, people, humans, "
        "extra windows, floating objects, deformed furniture, messy, clutter"
    )

    for st in staging_styles:
        print(f"\n▶ 家具配置・デコレーション中: {st['name']}...")

        # 建築の骨格（壁・窓・床・キッチン）はDepthとCannyでガッチリ拘束
        controlnet_args = [
            # Depth: 建築空間の幾何と家具配置可能面の深度を維持
            {
                "input_image": depth_b64,
                "module": "none",
                "model": "control_v11f1p_sd15_depth [cfd03158]",
                "weight": 0.65,
                "guidance_start": 0.0,
                "guidance_end": 0.75,
                "control_mode": "Balanced"
            },
            # Canny: 建築の窓枠・サッシ・建具・梁の直線を厳格固定
            {
                "input_image": normal_b64,
                "module": "canny",
                "model": "control_v11p_sd15_canny [d14c016b]",
                "weight": 0.45,
                "guidance_start": 0.0,
                "guidance_end": 0.65,
                "control_mode": "Balanced"
            }
        ]

        payload = {
            "init_images": [base_b64],
            "denoising_strength": st["denoise"],
            "prompt": st["prompt"],
            "negative_prompt": genspark_negative,
            "steps": 28,
            "cfg_scale": 6.5,
            "width": 960,
            "height": 640,
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
                    out_file = os.path.join(GENSPARK_DIR, f"{st['id']}.jpg")
                    b64_to_file(images[0], out_file)
                    print(f"  ✓ ステージング生成完了: {out_file}")
                else:
                    print("  ⚠️ 画像が返されませんでした")
        except Exception as e:
            print(f"  ❌ エラー発生: {e}")

if __name__ == "__main__":
    run_furniture_staging()
