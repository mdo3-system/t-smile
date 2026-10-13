# -*- coding: utf-8 -*-
"""
scratch/test_precision_render.py
Dell Precision 3680 (192.168.11.104:7861) と連携し、
実際のK様邸1F平面図から3Dパースを生成するテスト
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

# 1. 画像の読み込みとリサイズ（SD 1.5向け 960x640）
src_path = os.path.join("scratch", "case02_1f_plan.png")
img = Image.open(src_path)

# 縦横比を保ってリサイズ
target_w, target_h = 960, 640
img_resized = img.resize((target_w, target_h), Image.Resampling.LANCZOS)

buffered = BytesIO()
img_resized.save(buffered, format="PNG")
base64_plan = base64.b64encode(buffered.getvalue()).decode('utf-8')

print(f"[Precision Test] 図面準備完了: {src_path} -> {target_w}x{target_h}")

# 2. プロンプト（住ま居る 3Dフロアプラン・自然素材仕様）
positive_prompt = (
    "masterpiece, photorealistic 3D architectural floor plan cutaway, top-down isometric view, "
    "Japanese modern custom house, solid cedar wood flooring, plastered diatomaceous earth white walls, "
    "well-arranged furniture, open LDK living dining kitchen, natural warm sunlight streaming in, "
    "clean architectural lines, professional architectural photography, 8k resolution"
)

negative_prompt = (
    "worst quality, low quality, blurry, distorted, crooked, messy, plastic, cartoon, sketch, "
    "watermark, text, signature"
)

# 3. ControlNet Payload (canny または mlsd)
payload = {
    "prompt": positive_prompt,
    "negative_prompt": negative_prompt,
    "steps": 25,
    "cfg_scale": 7.0,
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

print(f"[Precision Test] Precision 3680 (RTX 4060 Ti) へ生成リクエスト送信中...")
start_t = time.time()

try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        elapsed = time.time() - start_t
        print(f"[Precision Test] 生成成功！ 所要時間: {elapsed:.1f} 秒")
        
        images = res.get('images', [])
        if images:
            out_file = os.path.join("scratch", "test_k_house_3d_plan.png")
            with open(out_file, "wb") as f:
                f.write(base64.b64decode(images[0]))
            print(f"[Precision Test] 生成画像を保存しました: {out_file}")
            
            # Web公開用にも保存
            web_out = os.path.join("public", "renders", "case02_generated_3d_plan.png")
            os.makedirs(os.path.dirname(web_out), exist_ok=True)
            with open(web_out, "wb") as f:
                f.write(base64.b64decode(images[0]))
            print(f"[Precision Test] Web配信用に保存: {web_out}")
except Exception as e:
    print(f"[Precision Test] エラー発生: {e}")
