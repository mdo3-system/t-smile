# -*- coding: utf-8 -*-
"""
scripts/generate_unfurnished_evening.py
フルフラット家具なしLDKのトワイライト（夕暮れ・温白色間接照明）パースを生成するスクリプト。
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

EVENING_PROMPT = (
    "masterpiece, best quality, breathtaking luxury architectural interior photography of Japanese modern house LDK at dusk, "
    "empty unfurnished living room and open kitchen before move-in, "
    "magic hour deep navy blue twilight sky visible through large sliding glass patio doors on the left, "
    "(warm 2800K indirect cove lighting and soft downlights glowing on flat plastered ceiling:1.3), "
    "(rich warm Yoshino cedar horizontal plank accent wall on the right bathed in warm amber lighting:1.35), "
    "open concept kitchen counter with solid timber bar top in background, "
    "timber-trimmed ceiling opening void with warm ambient glow from upper floor, "
    "natural solid wood flooring reflecting warm ambient light cones, "
    "completely empty clean floor, absolutely no furniture, no sofa, no table, no chairs, no rug, "
    "stunning contrast between cold blue twilight dusk outside and cozy warm amber interior light, "
    "architectural digest cover photo, shot on Nikon D700, 16mm lens, crisp focus, 8k resolution, photorealistic"
)

NEGATIVE_PROMPT = (
    "(stairs, staircase, steps, ladder, wooden staircase, spiral stairs, attic steps:2.0), "
    "(furniture, sofa, couch, dining table, chairs, table, bench, rug, carpet, mat, coffee table:1.8), "
    "(tv, television, electronics, boxes, clutter, trash, decorations:1.5), "
    "(step, raised floor, skip floor, tatami corner:1.6), "
    "(people, human, person:1.4), "
    "hallucination, distorted architecture, floating objects, crooked lines, blurry, low quality, cgi, 3d render look"
)

payload = {
    "init_images": [b64_base],
    "prompt": EVENING_PROMPT,
    "negative_prompt": NEGATIVE_PROMPT,
    "steps": 32,
    "cfg_scale": 9.0,
    "denoising_strength": 0.58,
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
                    "weight": 1.30,
                    "control_mode": "ControlNet is more important",
                    "resize_mode": "Crop and Resize"
                },
                {
                    "input_image": b64_depth,
                    "module": "none",
                    "model": "control_v11f1p_sd15_depth [cfd03158]",
                    "weight": 1.00,
                    "control_mode": "Balanced",
                    "resize_mode": "Crop and Resize"
                }
            ]
        }
    }
}

print("Generating unfurnished evening LDK...")
req = urllib.request.Request(
    f"{GPU_URL}/sdapi/v1/img2img",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

with urllib.request.urlopen(req, timeout=180) as res:
    resp = json.loads(res.read().decode("utf-8"))
    img_data = base64.b64decode(resp["images"][0])
    out_path = os.path.join(EXTRACTED_DIR, "generated_ldk_unfurnished_evening.jpg")
    with open(out_path, "wb") as f_out:
        f_out.write(img_data)
    print(f"Generated: {out_path} ({len(img_data)} bytes)")
