# -*- coding: utf-8 -*-
import os, sys, json, time, base64, urllib.request
from io import BytesIO
from PIL import Image

BASE_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity"
WORKER_URL = "http://192.168.11.104:7861"
EXTRACTED_DIR = os.path.join(BASE_DIR, "public", "renders", "controlnet_extracted", "ときがわ町 K様邸")
OUTPUT_DIR = os.path.join(BASE_DIR, "public", "renders", "selftest_master_results")
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

print("Loading Master Hybrid bases and control passes...")
b64_day_base = load_b64(os.path.join(EXTRACTED_DIR, "master_hybrid_day_base.jpg"))
b64_twi_base = load_b64(os.path.join(EXTRACTED_DIR, "master_hybrid_twilight_base.jpg"))
b64_depth = load_b64_png(os.path.join(EXTRACTED_DIR, "exterior_depth.png"))
b64_edges = load_b64_png(os.path.join(EXTRACTED_DIR, "exterior_clean_edges.png"))

NEG_PROMPT = (
    "(extra stairs:1.5), (misplaced staircase:1.4), (floating steps:1.3), "
    "broken arches, deformed arches, crooked roofline, distorted roof, misplaced windows, "
    "blurry, low quality, cgi 3d render look, plastic walls, flat textures, artifacts, "
    "watermark, signature"
)

DAY_PROMPT = (
    "masterpiece, best quality, ultra-detailed architectural photography of custom Japanese house exterior, "
    "Tokigawa Saitama rural mountain setting, sunny bright clear blue sky with delicate wispy white clouds, lush green hills in background, "
    "sharp asymmetrical shed roof with dark standing seam metal roofing, "
    "warm light cream beige stucco exterior wall with subtle natural hand-troweled plaster texture, "
    "(two-arched front entrance porch with antique red brick accent trim lining the arch curve edge:1.35), "
    "solid natural wood grain insulated front entrance door with vertical metal handle, "
    "APW430 dark resin frame triple-glazed sash windows with transparent realistic glass reflection, "
    "smooth concrete barrier-free slope ramp on the left side, gentle curved brick entrance steps, gravel driveway, "
    "crisp architectural photography, shot on Nikon D700, 21mm lens, F16 pan-focus, 8k resolution"
)

TWILIGHT_PROMPT = (
    "masterpiece, best quality, ultra-detailed architectural photography of custom Japanese house exterior at twilight, "
    "Tokigawa Saitama mountain setting, magic hour deep indigo blue and glowing amber gradient sky, mountain silhouettes, "
    "sharp asymmetrical shed roof with dark standing seam metal roofing, "
    "warm light cream stucco exterior wall warmly illuminated by architectural lighting, "
    "(two-arched front entrance porch with antique red brick accent trim lining the arch curve edge:1.35), "
    "(warm 3000K incandescent glow pouring from interior windows:1.2), "
    "(brass carriage lantern wall bracket light glowing warmly on the brick entrance porch:1.25), "
    "solid natural wood grain insulated front entrance door, "
    "smooth concrete barrier-free slope ramp on the left side, gentle curved brick entrance steps, gravel driveway, "
    "crisp luxury architectural evening photography, shot on Nikon D700, 21mm lens, F16 pan-focus, 8k resolution"
)

EXPERIMENTS = [
    # Master Day Generations
    {
        "id": "master_day_denoise040",
        "title": "Master Day (Denoise 0.40, Canny 0.85 + Depth 0.70)",
        "init": b64_day_base,
        "prompt": DAY_PROMPT,
        "denoise": 0.40,
        "cfg": 7.5,
        "cn_args": [
            {"input_image": b64_edges, "module": "none", "model": "control_v11p_sd15_canny [d14c016b]", "weight": 0.85, "control_mode": "Balanced"},
            {"input_image": b64_depth, "module": "none", "model": "control_v11f1p_sd15_depth [cfd03158]", "weight": 0.70, "control_mode": "Balanced"}
        ]
    },
    {
        "id": "master_day_denoise044",
        "title": "Master Day (Denoise 0.44, Canny 0.85 + Depth 0.70)",
        "init": b64_day_base,
        "prompt": DAY_PROMPT,
        "denoise": 0.44,
        "cfg": 7.5,
        "cn_args": [
            {"input_image": b64_edges, "module": "none", "model": "control_v11p_sd15_canny [d14c016b]", "weight": 0.85, "control_mode": "Balanced"},
            {"input_image": b64_depth, "module": "none", "model": "control_v11f1p_sd15_depth [cfd03158]", "weight": 0.70, "control_mode": "Balanced"}
        ]
    },
    {
        "id": "master_day_denoise048",
        "title": "Master Day (Denoise 0.48, Canny 0.85 + Depth 0.70)",
        "init": b64_day_base,
        "prompt": DAY_PROMPT,
        "denoise": 0.48,
        "cfg": 8.0,
        "cn_args": [
            {"input_image": b64_edges, "module": "none", "model": "control_v11p_sd15_canny [d14c016b]", "weight": 0.85, "control_mode": "Balanced"},
            {"input_image": b64_depth, "module": "none", "model": "control_v11f1p_sd15_depth [cfd03158]", "weight": 0.70, "control_mode": "Balanced"}
        ]
    },
    # Master Twilight Generations
    {
        "id": "master_twilight_denoise042",
        "title": "Master Twilight (Denoise 0.42, Canny 0.85 + Depth 0.70)",
        "init": b64_twi_base,
        "prompt": TWILIGHT_PROMPT,
        "denoise": 0.42,
        "cfg": 7.5,
        "cn_args": [
            {"input_image": b64_edges, "module": "none", "model": "control_v11p_sd15_canny [d14c016b]", "weight": 0.85, "control_mode": "Balanced"},
            {"input_image": b64_depth, "module": "none", "model": "control_v11f1p_sd15_depth [cfd03158]", "weight": 0.70, "control_mode": "Balanced"}
        ]
    },
    {
        "id": "master_twilight_denoise046",
        "title": "Master Twilight (Denoise 0.46, Canny 0.85 + Depth 0.70)",
        "init": b64_twi_base,
        "prompt": TWILIGHT_PROMPT,
        "denoise": 0.46,
        "cfg": 7.5,
        "cn_args": [
            {"input_image": b64_edges, "module": "none", "model": "control_v11p_sd15_canny [d14c016b]", "weight": 0.85, "control_mode": "Balanced"},
            {"input_image": b64_depth, "module": "none", "model": "control_v11f1p_sd15_depth [cfd03158]", "weight": 0.70, "control_mode": "Balanced"}
        ]
    },
    {
        "id": "master_twilight_denoise050",
        "title": "Master Twilight (Denoise 0.50, Canny 0.85 + Depth 0.70)",
        "init": b64_twi_base,
        "prompt": TWILIGHT_PROMPT,
        "denoise": 0.50,
        "cfg": 8.0,
        "cn_args": [
            {"input_image": b64_edges, "module": "none", "model": "control_v11p_sd15_canny [d14c016b]", "weight": 0.85, "control_mode": "Balanced"},
            {"input_image": b64_depth, "module": "none", "model": "control_v11f1p_sd15_depth [cfd03158]", "weight": 0.70, "control_mode": "Balanced"}
        ]
    }
]

print(f"Starting {len(EXPERIMENTS)} Master Hybrid runs...")
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

print(f"\nFinished all {len(results)} Master Hybrid generations successfully!")
