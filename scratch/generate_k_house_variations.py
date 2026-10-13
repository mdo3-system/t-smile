# -*- coding: utf-8 -*-
"""
scratch/generate_k_house_variations.py
K様邸の実図面をもとに、
1. バリエーションB: 天井白い左官壁 ＋ 一部吹き抜け ＋ 自然光
2. バリエーションC: 露出化粧梁 ＋ 夕暮れトワイライト間接照明
を Dell Precision 3680 (192.168.11.104:7861) でレンダリングするスクリプト
"""
import os
import sys
import json
import base64
import time
import urllib.request
from io import BytesIO
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

PRECISION_URL = "http://192.168.11.104:7861"

# 1. 図面ベース64準備
src_path = os.path.join("scratch", "case02_1f_plan.png")
img = Image.open(src_path)
target_w, target_h = 960, 640
img_resized = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
buffered = BytesIO()
img_resized.save(buffered, format="PNG")
base64_plan = base64.b64encode(buffered.getvalue()).decode('utf-8')

variations = [
    {
        "id": "var_b_white_ceiling_fukinuke",
        "title": "天井白い左官壁 × 一部吹き抜けから注ぐ光",
        "prompt": (
            "masterpiece, photorealistic architectural photography of a Japanese modern custom house LDK, "
            "open partial high ceiling void (fukinuke) with bright sunlight streaming down from high windows, "
            "pure white plastered diatomaceous earth ceiling and walls, white plaster textured finish, "
            "solid cedar wood flooring, custom handcrafted wooden kitchen island, large dining table, "
            "spacious airy great room, natural warm daylight, high key, highly detailed, 8k resolution, architectural digest"
        ),
        "out_file": "public/renders/case02_var_b_white_fukinuke.png"
    },
    {
        "id": "var_c_timber_beams_night",
        "title": "露出化粧梁 × 夕暮れの間接照明",
        "prompt": (
            "masterpiece, photorealistic architectural photograph of a luxury Japanese modern living room, "
            "high ceiling with exposed solid timber beams (mokuzou), white diatomaceous earth plaster walls, "
            "warm indirect cove lighting glowing on plaster textures, dusk twilight exterior visible through garden sash, "
            "solid cypress wood flooring, cozy serene twilight ambiance, soft architectural shadows, canon eos r5, 8k"
        ),
        "out_file": "public/renders/case02_var_c_twilight_beams.png"
    }
]

negative_prompt = (
    "worst quality, low quality, deformed architecture, crooked walls, blurry, "
    "wood ceiling, all wood ceiling panel, brown ceiling, dark ceiling, plastic look, 3d render look, cartoon, sketch, watermark, signature"
)

for v in variations:
    print(f"\n[Precision Render] 生成開始: {v['title']}...")
    payload = {
        "prompt": v["prompt"],
        "negative_prompt": negative_prompt,
        "steps": 28,
        "cfg_scale": 7.5,
        "width": target_w,
        "height": target_h,
        "sampler_name": "DPM++ 2M Karras",
        "alwayson_scripts": {
            "controlnet": {
                "args": [
                    {
                        "input_image": base64_plan,
                        "module": "canny",
                        "model": "control_v11p_sd15_canny [d14c016b]",
                        "weight": 0.85,
                        "resize_mode": "Crop and Resize",
                        "control_mode": "Balanced",
                        "guidance_start": 0.0,
                        "guidance_end": 0.95
                    }
                ]
            }
        }
    }

    req_data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        f"{PRECISION_URL}/sdapi/v1/txt2img",
        data=req_data,
        headers={'Content-Type': 'application/json'}
    )

    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            elapsed = time.time() - t0
            print(f" -> 成功！ 所要時間: {elapsed:.1f} 秒")
            images = data.get("images", [])
            if images:
                out_path = v["out_file"]
                os.makedirs(os.path.dirname(out_path), exist_ok=True)
                with open(out_path, "wb") as f:
                    f.write(base64.b64decode(images[0]))
                print(f" -> 保存完了: {out_path}")
    except Exception as e:
        print(f" -> エラー: {e}")
