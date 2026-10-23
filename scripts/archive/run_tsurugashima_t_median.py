# -*- coding: utf-8 -*-
"""
scripts/run_tsurugashima_t_median.py
===================================
【第5案件：鶴ヶ島市 T様邸（田口様邸新築工事）】
ARCHITREND ZERO 実機FBXからの家具配置前ホワイトモデル・中央値フォトリアル建築パース生成＆精緻解析
"""
import os, sys, time, json, base64, urllib.request, io
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity"
SD_URL = "http://192.168.11.104:7860"
EXTRACTED_DIR = os.path.join(BASE_DIR, "public", "renders", "controlnet_extracted", "鶴ヶ島市 T様邸")
OUT_DIR = os.path.join(BASE_DIR, "public", "renders", "multicase_median_benchmark")
os.makedirs(OUT_DIR, exist_ok=True)

TARGET_W = 960
TARGET_H = 640

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msgothic.ttc",
    r"C:\Windows\Fonts\meiryo.ttc",
    r"C:\Windows\Fonts\YuGothM.ttc",
    r"C:\Windows\Fonts\arial.ttf"
]

def get_font(size):
    for f in FONT_CANDIDATES:
        if os.path.exists(f):
            try: return ImageFont.truetype(f, size)
            except Exception: pass
    return ImageFont.load_default()

def img_to_b64(img):
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")

def b64_to_img(b64_str):
    if ',' in b64_str:
        b64_str = b64_str.split(',', 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(b64_str))).convert("RGB")

NEGATIVE_PROMPT = (
    "(worst quality, low quality:1.4), (deformed, distorted:1.3), "
    "blurry, watermark, text, signature, people, humans, "
    "distorted architecture, crooked walls, bent vertical lines, misaligned windows, bad perspective, "
    "cartoon, anime, 3d render plastic look, sterile hospital white, dark dirty shadows, oversaturated, "
    "(stairs, staircase, steps, ladder:2.2), "
    "(furniture, sofa, couch, dining table, chairs, bed, carpets, television, clutter, trash, wires:1.8)"
)

PROMPT_EXTERIOR = (
    "masterpiece, best quality, ultra-detailed professional architectural photography, "
    "stunning modern Japanese custom residential house, exterior facade view, "
    "right side two-story tower with rich dark brown horizontal timber wood board siding, "
    "left side dynamic low-pitch dark metal roof, natural wood deck entrance porch, "
    "wooden sliding entrance door, wooden corner bay window box on right ground floor, "
    "natural textured off-white plaster wall accents, "
    "warm 2700K interior lights glowing gently through windows, "
    "clear morning blue sky with soft natural sunlight, balanced architectural HDR exposure, "
    "sharp straight rectilinear lines, photorealistic, 8k, architectural magazine cover"
)

PROMPT_INTERIOR = (
    "masterpiece, best quality, ultra-detailed professional architectural photography, "
    "spacious Japanese modern living dining room, completely empty unfurnished vacant room, brand new house handover state, "
    "natural solid Japanese hinoki cypress and Yoshino cedar hardwood flooring with delicate organic grain and subtle warm knots, "
    "hand-troweled warm off-white natural diatomaceous earth plaster walls, natural structural timber wooden posts and exposed ceiling beams, "
    "large south-facing floor-to-ceiling glass sliding doors, "
    "soft diffused natural 2700K warm morning daylight gently illuminating the interior, "
    "organic light transport, soft contact shadows, authentic architectural craftsmanship, "
    "photorealistic, 8k, interior design magazine photo"
)

CONFIGS = [
    {
        "cid": "median_a_denoise65",
        "label": "幾何素材バランス版 (Denoise 0.65)",
        "denoise": 0.65,
        "depth_w": 0.80,
        "depth_end": 0.88,
        "canny_w": 0.45,
        "canny_end": 0.82,
        "cfg_scale": 7.0,
        "steps": 32
    },
    {
        "cid": "median_b_denoise68",
        "label": "自然素材・光彩融合版 (Denoise 0.68 ★黄金中央値)",
        "denoise": 0.68,
        "depth_w": 0.80,
        "depth_end": 0.85,
        "canny_w": 0.42,
        "canny_end": 0.80,
        "cfg_scale": 7.0,
        "steps": 32
    },
    {
        "cid": "median_c_denoise72",
        "label": "プロ実写光彩優先版 (Denoise 0.72)",
        "denoise": 0.72,
        "depth_w": 0.80,
        "depth_end": 0.85,
        "canny_w": 0.38,
        "canny_end": 0.75,
        "cfg_scale": 7.0,
        "steps": 32
    }
]

def run_sd_generation(init_img, depth_img, lineart_img, prompt, config):
    payload = {
        "init_images": [img_to_b64(init_img)],
        "prompt": prompt,
        "negative_prompt": NEGATIVE_PROMPT,
        "steps": config["steps"],
        "cfg_scale": config["cfg_scale"],
        "denoising_strength": config["denoise"],
        "width": TARGET_W,
        "height": TARGET_H,
        "sampler_name": "DPM++ 2M Karras",
        "seed": 20261016,
        "alwayson_scripts": {
            "controlnet": {
                "args": [
                    {
                        "input_image": img_to_b64(depth_img),
                        "module": "none",
                        "model": "control_v11f1p_sd15_depth [cfd03158]",
                        "weight": config["depth_w"],
                        "guidance_end": config["depth_end"],
                        "control_mode": "Balanced",
                        "resize_mode": "Crop and Resize"
                    },
                    {
                        "input_image": img_to_b64(lineart_img),
                        "module": "none",
                        "model": "control_v11p_sd15_canny [d14c016b]",
                        "weight": config["canny_w"],
                        "guidance_end": config["canny_end"],
                        "control_mode": "Balanced",
                        "resize_mode": "Crop and Resize"
                    }
                ]
            }
        }
    }

    req = urllib.request.Request(
        f"{SD_URL}/sdapi/v1/img2img",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )

    t0 = time.time()
    with urllib.request.urlopen(req, timeout=180) as res:
        elapsed = time.time() - t0
        data = json.loads(res.read().decode("utf-8"))
        gen_img = b64_to_img(data["images"][0])
        return gen_img, elapsed

def get_canny_edges(im):
    gray = im.convert('L')
    edge = gray.filter(ImageFilter.FIND_EDGES)
    arr = np.array(edge, dtype=float)
    return (arr > 30).astype(np.uint8)

def compute_quality_metrics(gen_img, lineart_img):
    gen_arr = np.array(gen_img, dtype=float)
    r_mean = float(np.mean(gen_arr[:, :, 0]))
    b_mean = float(np.mean(gen_arr[:, :, 2]))
    warmth_ratio = r_mean / (b_mean + 1e-6)

    cad_edge = (np.array(lineart_img.convert('L')) > 50).astype(np.uint8)
    gen_edge = get_canny_edges(gen_img)
    intersection = np.logical_and(cad_edge, gen_edge)
    preservation_rate = float(np.sum(intersection)) / float(np.sum(cad_edge) + 1e-6) * 100.0

    return {
        "warmth_ratio": round(warmth_ratio, 2),
        "brightness": round(float(np.mean(gen_arr)), 1),
        "preservation_rate": round(preservation_rate, 1)
    }

def run_case_suite(suite_type="exterior"):
    is_ext = (suite_type == "exterior")
    prefix = "exterior" if is_ext else "ldk"
    prompt = PROMPT_EXTERIOR if is_ext else PROMPT_INTERIOR
    suite_title = "鶴ヶ島市 T様邸 【外観パース】" if is_ext else "鶴ヶ島市 T様邸 【室内LDKパース】"

    print("\n" + "=" * 70)
    print(f"  ▶ 実行スイート: {suite_title}")
    print("=" * 70)

    normal_p = os.path.join(EXTRACTED_DIR, f"{prefix}_normal.png")
    depth_p = os.path.join(EXTRACTED_DIR, f"{prefix}_depth.png")
    lineart_p = os.path.join(EXTRACTED_DIR, f"{prefix}_lineart.png")

    normal_img = Image.open(normal_p).convert("RGB").resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
    depth_img = Image.open(depth_p).convert("RGB").resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
    lineart_img = Image.open(lineart_p).convert("RGB").resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)

    real_p = os.path.join(BASE_DIR, "raw_source_cases", "鶴ヶ島市 T様邸", "外観", "IMG_9195.jpg") if is_ext else \
             os.path.join(BASE_DIR, "raw_source_cases", "鶴ヶ島市 T様邸", "★おすすめ", "IMG_9237.jpg")
    real_img = None
    if os.path.exists(real_p):
        real_img = Image.open(real_p).convert("RGB").resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)

    results = []
    for cfg in CONFIGS:
        out_fname = f"tsurugashima_t_{prefix}_{cfg['cid']}.jpg"
        out_path = os.path.join(OUT_DIR, out_fname)
        print(f"  ⚡ 生成中: {cfg['label']} (Denoise={cfg['denoise']})...")

        gen_img, elapsed = run_sd_generation(normal_img, depth_img, lineart_img, prompt, cfg)
        gen_img.save(out_path, quality=95)

        metrics = compute_quality_metrics(gen_img, lineart_img)
        print(f"    ✅ 生成完了 ({elapsed:.1f}s): {out_fname}")
        print(f"       幾何保持率: {metrics['preservation_rate']}% | 温かみ比率(R/B): {metrics['warmth_ratio']} | 明度: {metrics['brightness']}")

        results.append({
            "config": cfg,
            "img": gen_img,
            "fname": out_fname,
            "metrics": metrics
        })

    # 単独5列シートの作成
    cols = 5
    cell_w, cell_h = 560, 373
    pad_x, pad_y = 20, 20
    header_h = 90
    total_w = pad_x * 2 + cell_w * cols + 15 * (cols - 1)
    total_h = header_h + cell_h + pad_y * 2 + 10

    sheet = Image.new("RGB", (total_w, total_h), (15, 23, 42))
    draw = ImageDraw.Draw(sheet)

    title_font = get_font(24)
    sub_font = get_font(13)
    header_font = get_font(14)
    label_font = get_font(12)

    draw.text((pad_x, 15), f"🏛️ {suite_title} ARCHITREND ZERO FBX ➜ 黄金中央値パース実証シート", fill=(56, 189, 248), font=title_font)
    draw.text((pad_x, 50), "自然素材再生・現し梁邸の実機FBXから家具配置前ホワイトモデルを抽出し、黄金中央値（Denoise 0.68）の実用性を検証", fill=(148, 163, 184), font=sub_font)

    col_titles = [
        "【① 3D生線画 (Edges 20°)】",
        "【② 幾何素材版 (Denoise 0.65)】",
        "【③ 自然素材光彩融合 (Denoise 0.68 ★黄金中央値)】",
        "【④ プロ実写優先 (Denoise 0.72)】",
        "【⑤ プロ建築実写真 (施工基準)】"
    ]
    col_colors = [(148, 163, 184), (56, 189, 248), (52, 211, 153), (167, 139, 250), (251, 191, 36)]

    img_y = header_h + 30
    for c_idx, title in enumerate(col_titles):
        col_x = pad_x + c_idx * (cell_w + 15)
        draw.rectangle([col_x, header_h, col_x + cell_w, header_h + 24], fill=(30, 41, 59))
        draw.text((col_x + 8, header_h + 3), title, fill=col_colors[c_idx], font=header_font)

    # 0: Lineart
    c0_im = lineart_img.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
    sheet.paste(c0_im, (pad_x, img_y))
    draw.rectangle([pad_x, img_y, pad_x + cell_w, img_y + cell_h], outline=(71, 85, 105), width=1)

    # 1, 2, 3: Outputs
    for out_idx, out_entry in enumerate(results):
        col_x = pad_x + (out_idx + 1) * (cell_w + 15)
        c_im = out_entry["img"].resize((cell_w, cell_h), Image.Resampling.LANCZOS)
        sheet.paste(c_im, (col_x, img_y))
        border_color = (2, 132, 199) if out_idx == 0 else ((5, 150, 105) if out_idx == 1 else (124, 58, 237))
        border_width = 3 if out_idx == 1 else 1
        draw.rectangle([col_x, img_y, col_x + cell_w, img_y + cell_h], outline=border_color, width=border_width)

        m = out_entry["metrics"]
        draw.rectangle([col_x + 6, img_y + 6, col_x + 280, img_y + 28], fill=(15, 23, 42, 220))
        draw.text((col_x + 10, img_y + 9), f"保持率:{m['preservation_rate']}% | 温かみ:{m['warmth_ratio']}", fill=col_colors[out_idx + 1], font=label_font)

    # 4: Real Photo
    col4_x = pad_x + 4 * (cell_w + 15)
    if real_img is not None:
        c4_im = real_img.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
        sheet.paste(c4_im, (col4_x, img_y))
        draw.rectangle([col4_x, img_y, col4_x + cell_w, img_y + cell_h], outline=(217, 119, 6), width=1)

    sheet_out = os.path.join(OUT_DIR, f"tsurugashima_t_{prefix}_5col_verification.jpg")
    sheet.save(sheet_out, quality=93)
    print(f"🎉 5列検証シート保存完了: {sheet_out}")
    return results

if __name__ == '__main__':
    print("=" * 80)
    print("  【第5案件：鶴ヶ島市 T様邸】中央値パース追加生成＆実用性検証パイプライン")
    print(f"  GPUサーバー: {SD_URL}")
    print("=" * 80)
    run_case_suite("exterior")
    run_case_suite("ldk")
    print("\n🏆 鶴ヶ島市 T様邸の全検証生成が完了しました！")
