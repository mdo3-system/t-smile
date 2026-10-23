# -*- coding: utf-8 -*-
"""
scripts/run_master_hybrid_ldk_generation.py
小峯様邸 LDK (DSC_8769 基準) の Master Hybrid パイプライン生成スクリプト。
FBX 3Dモデルから抽出した幾何エッジ（ldk_clean_edges.png）と深度（ldk_depth_normalized.png）をControlNetに投入し、
Master Hybrid Base (Day / Evening) を基にSD1.5 Realistic Vision v6.0でプロ品質のパースを生成。
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
WORKER_URL = "http://192.168.11.104:7861"
EXTRACTED_DIR = os.path.join(BASE_DIR, "public", "renders", "controlnet_extracted", "ときがわ町 K様邸")
OUTPUT_DIR = os.path.join(BASE_DIR, "public", "renders", "selftest_ldk_results")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def load_b64(path, size=(960, 640)):
    im = Image.open(path)
    if im.mode != "RGB":
        im = im.convert("RGB")
    im = im.resize(size, Image.Resampling.LANCZOS)
    buf = BytesIO()
    im.save(buf, format="JPEG", quality=95)
    return base64.b64encode(buf.getvalue()).decode("utf-8")

def load_b64_png(path, size=(960, 640)):
    im = Image.open(path)
    if im.mode not in ("RGB", "L"):
        im = im.convert("RGB")
    im = im.resize(size, Image.Resampling.LANCZOS)
    buf = BytesIO()
    im.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")

print("Loading Master Hybrid LDK bases and control passes...")
b64_day_base = load_b64(os.path.join(EXTRACTED_DIR, "master_hybrid_ldk_day_base.jpg"))
b64_twi_base = load_b64(os.path.join(EXTRACTED_DIR, "master_hybrid_ldk_evening_base.jpg"))
b64_depth = load_b64_png(os.path.join(EXTRACTED_DIR, "ldk_depth_normalized.png"))
b64_edges = load_b64_png(os.path.join(EXTRACTED_DIR, "ldk_clean_edges.png"))

NEG_PROMPT = (
    "(stairs:1.6), (staircase:1.6), (steps:1.5), (floating stairs:1.4), (ladder:1.3), "
    "(outdoor window behind kitchen:1.4), (tree behind kitchen:1.3), "
    "broken ceiling, crooked walls, deformed architecture, distorted furniture, "
    "cluttered, messy wires, plastic, cartoon, 3d render look, blurry, watermark, signature"
)

DAY_PROMPT = (
    "masterpiece, best quality, ultra-detailed luxury architectural interior photography of Japanese modern house LDK, "
    "bright airy morning natural sunlight, "
    "flat white diatomaceous earth plaster ceiling with standard 2.5m ceiling height, "
    "(prominent square timber-framed double-height ceiling opening void:1.3) above dining area with bright ambient skylight cascading down, "
    "open concept kitchen with solid timber cabinetry and neat pantry cupboards in background, "
    "elegant dining table and chairs in center, "
    "(rich natural Yoshino cedar horizontal wood plank accent wall on the right with wooden sliding door:1.3), "
    "natural light-toned solid pine wood floor with realistic wood grain texture, "
    "large APW430 triple-glazed floor-to-ceiling glass patio doors on the left showing bright sunny garden greenery, "
    "architectural magazine cover photography, shot on Nikon D700, 16mm ultra-wide lens, pan-focus F16, 8k resolution, photorealistic"
)

EVENING_PROMPT = (
    "masterpiece, best quality, breathtaking luxury architectural interior photography of Japanese modern house LDK at dusk, "
    "magic hour deep navy blue twilight sky visible through large glass patio doors on the left, "
    "(warm 2800K indirect cove lighting glowing on flat white plastered ceiling:1.3), "
    "soft downlights casting gentle warm light cones, "
    "(distinct square timber-trimmed ceiling opening void:1.3) above dining area with warm ambient glow from upper floor, "
    "(rich warm Japanese cedar horizontal plank accent wall on the right:1.35) bathed in warm amber lighting, "
    "open kitchen with tidy built-in wooden cabinetry in background, contemporary dining table, "
    "natural solid wood flooring reflecting warm ambient light, "
    "stunning contrast between cold blue twilight dusk outside and cozy warm amber interior light, "
    "architectural digest cover photo, shot on Nikon D700, 16mm lens, F16 pan-focus, 8k resolution, razor sharp details"
)

EXPERIMENTS = [
    # --- Day Generations ---
    {
        "id": "ldk_day_denoise038",
        "title": "LDK Day (Denoise 0.38, Canny 0.85 + Depth 0.70)",
        "init": b64_day_base,
        "prompt": DAY_PROMPT,
        "denoise": 0.38,
        "cfg": 7.5,
        "cn_args": [
            {"input_image": b64_edges, "module": "none", "model": "control_v11p_sd15_canny [d14c016b]", "weight": 0.85, "control_mode": "Balanced"},
            {"input_image": b64_depth, "module": "none", "model": "control_v11f1p_sd15_depth [cfd03158]", "weight": 0.70, "control_mode": "Balanced"}
        ]
    },
    {
        "id": "ldk_day_denoise042",
        "title": "LDK Day (Denoise 0.42, Canny 0.85 + Depth 0.70)",
        "init": b64_day_base,
        "prompt": DAY_PROMPT,
        "denoise": 0.42,
        "cfg": 7.5,
        "cn_args": [
            {"input_image": b64_edges, "module": "none", "model": "control_v11p_sd15_canny [d14c016b]", "weight": 0.85, "control_mode": "Balanced"},
            {"input_image": b64_depth, "module": "none", "model": "control_v11f1p_sd15_depth [cfd03158]", "weight": 0.70, "control_mode": "Balanced"}
        ]
    },
    {
        "id": "ldk_day_denoise046",
        "title": "LDK Day (Denoise 0.46, Canny 0.85 + Depth 0.70)",
        "init": b64_day_base,
        "prompt": DAY_PROMPT,
        "denoise": 0.46,
        "cfg": 8.0,
        "cn_args": [
            {"input_image": b64_edges, "module": "none", "model": "control_v11p_sd15_canny [d14c016b]", "weight": 0.85, "control_mode": "Balanced"},
            {"input_image": b64_depth, "module": "none", "model": "control_v11f1p_sd15_depth [cfd03158]", "weight": 0.70, "control_mode": "Balanced"}
        ]
    },
    {
        "id": "ldk_day_denoise050",
        "title": "LDK Day (Denoise 0.50, Canny 0.85 + Depth 0.70)",
        "init": b64_day_base,
        "prompt": DAY_PROMPT,
        "denoise": 0.50,
        "cfg": 8.0,
        "cn_args": [
            {"input_image": b64_edges, "module": "none", "model": "control_v11p_sd15_canny [d14c016b]", "weight": 0.85, "control_mode": "Balanced"},
            {"input_image": b64_depth, "module": "none", "model": "control_v11f1p_sd15_depth [cfd03158]", "weight": 0.70, "control_mode": "Balanced"}
        ]
    },
    # --- Evening Generations ---
    {
        "id": "ldk_evening_denoise038",
        "title": "LDK Evening (Denoise 0.38, Canny 0.85 + Depth 0.70)",
        "init": b64_twi_base,
        "prompt": EVENING_PROMPT,
        "denoise": 0.38,
        "cfg": 7.5,
        "cn_args": [
            {"input_image": b64_edges, "module": "none", "model": "control_v11p_sd15_canny [d14c016b]", "weight": 0.85, "control_mode": "Balanced"},
            {"input_image": b64_depth, "module": "none", "model": "control_v11f1p_sd15_depth [cfd03158]", "weight": 0.70, "control_mode": "Balanced"}
        ]
    },
    {
        "id": "ldk_evening_denoise042",
        "title": "LDK Evening (Denoise 0.42, Canny 0.85 + Depth 0.70)",
        "init": b64_twi_base,
        "prompt": EVENING_PROMPT,
        "denoise": 0.42,
        "cfg": 7.5,
        "cn_args": [
            {"input_image": b64_edges, "module": "none", "model": "control_v11p_sd15_canny [d14c016b]", "weight": 0.85, "control_mode": "Balanced"},
            {"input_image": b64_depth, "module": "none", "model": "control_v11f1p_sd15_depth [cfd03158]", "weight": 0.70, "control_mode": "Balanced"}
        ]
    },
    {
        "id": "ldk_evening_denoise046",
        "title": "LDK Evening (Denoise 0.46, Canny 0.85 + Depth 0.70)",
        "init": b64_twi_base,
        "prompt": EVENING_PROMPT,
        "denoise": 0.46,
        "cfg": 8.0,
        "cn_args": [
            {"input_image": b64_edges, "module": "none", "model": "control_v11p_sd15_canny [d14c016b]", "weight": 0.85, "control_mode": "Balanced"},
            {"input_image": b64_depth, "module": "none", "model": "control_v11f1p_sd15_depth [cfd03158]", "weight": 0.70, "control_mode": "Balanced"}
        ]
    },
    {
        "id": "ldk_evening_denoise050",
        "title": "LDK Evening (Denoise 0.50, Canny 0.85 + Depth 0.70)",
        "init": b64_twi_base,
        "prompt": EVENING_PROMPT,
        "denoise": 0.50,
        "cfg": 8.0,
        "cn_args": [
            {"input_image": b64_edges, "module": "none", "model": "control_v11p_sd15_canny [d14c016b]", "weight": 0.85, "control_mode": "Balanced"},
            {"input_image": b64_depth, "module": "none", "model": "control_v11f1p_sd15_depth [cfd03158]", "weight": 0.70, "control_mode": "Balanced"}
        ]
    }
]

print(f"Starting {len(EXPERIMENTS)} Master Hybrid LDK runs...")
results = []
for exp in EXPERIMENTS:
    exp_id = exp["id"]
    print(f"\n--- Running: {exp['title']} ---")
    payload = {
        "prompt": exp["prompt"],
        "negative_prompt": NEG_PROMPT,
        "steps": 32,
        "cfg_scale": exp["cfg"],
        "width": 960,
        "height": 640,
        "sampler_name": "DPM++ 2M Karras",
        "init_images": [exp["init"]],
        "denoising_strength": exp["denoise"],
        "alwayson_scripts": {
            "controlnet": {
                "args": exp["cn_args"]
            }
        }
    }
    req = urllib.request.Request(
        f"{WORKER_URL}/sdapi/v1/img2img",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            elapsed = time.time() - t0
            imgs = data.get("images", [])
            if imgs:
                out_path = os.path.join(OUTPUT_DIR, f"{exp_id}.png")
                with open(out_path, "wb") as f:
                    f.write(base64.b64decode(imgs[0]))
                print(f"Success in {elapsed:.1f}s -> Saved: {out_path}")
                results.append({"id": exp_id, "title": exp["title"], "path": out_path, "elapsed": elapsed})
    except Exception as e:
        print(f"Error in {exp_id}: {e}")

print(f"\nFinished all {len(results)} Master Hybrid LDK generations successfully!")
