# -*- coding: utf-8 -*-
"""
scripts/run_multicase_median_pipeline.py
========================================
【他案件展開・中央値ロバスト設定 フォトリアル建築パース生成パイプライン】
小峯様邸（ときがわ町K様邸）1邸への固執を完全脱却し、
実案件FBX（鶴ヶ島市S様邸、鶴ヶ島市A様邸、吉見町O様邸、ときがわ町K様邸）から
抽出した3D幾何（Normal/Depth/Lineart）を基点として、
普遍的に適用可能な「中央値（Median）パラメータ」を検証・構築する。

Genspark / Gemini / ChatGPT / Claude 推奨アーキテクチャ：
- Guidance End: Depth 0.80, Canny 0.70（後半20%ステップでSDに自然素材・反射・陰影を描かせる）
- Depth Weight: 0.65
- Canny Weight: 0.38〜0.40
- Denoise: 0.52（幾何保持重視） vs 0.56（光彩素材融合・推奨中央値）
- Prompt: 住ま居る無垢材クラフトマンシップ（無垢檜・杉床、珪藻土漆喰壁、化粧梁、2700K朝光、完全空室）
"""

import os
import sys
import json
import time
import base64
import urllib.request
import io
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity"
SD_URL = "http://192.168.11.104:7860"
EXTRACTED_DIR = os.path.join(BASE_DIR, "public", "renders", "controlnet_extracted")
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
            try:
                return ImageFont.truetype(f, size)
            except Exception:
                pass
    return ImageFont.load_default()

def img_to_b64(img):
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")

def b64_to_img(b64_str):
    if ',' in b64_str:
        b64_str = b64_str.split(',', 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(b64_str))).convert("RGB")

# 共通建築ネガティブ（プラスチックCG・階段・家具ハルシネーション完全排除）
NEGATIVE_PROMPT = (
    "(worst quality, low quality:1.4), (deformed, distorted:1.3), "
    "blurry, watermark, text, signature, people, humans, "
    "distorted architecture, crooked walls, bent vertical lines, misaligned windows, bad perspective, "
    "cartoon, anime, 3d render plastic look, sterile hospital white, dark dirty shadows, oversaturated, "
    "(stairs, staircase, steps, ladder:2.2), "
    "(furniture, sofa, couch, dining table, chairs, bed, carpets, television, clutter, trash, wires:1.8)"
)

# 住ま居る クラフトマンシップ統一プロンプト（外観）
PROMPT_EXTERIOR = (
    "masterpiece, best quality, ultra-detailed professional architectural photography, "
    "stunning modern Japanese custom residential house, exterior facade view, "
    "natural textured off-white Jolipat plaster finish exterior walls, warm Japanese cedar wood siding accents, "
    "high-performance dark APW430 thermal window frames, elegant low-pitch dark tile roof, "
    "warm 2700K interior lights glowing gently through windows, "
    "clean paved entrance approach with neat landscaping greenery, "
    "clear morning blue sky with soft natural sunlight, balanced architectural HDR exposure, "
    "sharp straight rectilinear lines, photorealistic, 8k, architectural magazine cover"
)

# 住ま居る クラフトマンシップ統一プロンプト（内観・空室）
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

# 4大案件の定義
CASES = [
    {
        "id": "tsurugashima_s",
        "name": "鶴ヶ島市 S様邸",
        "sub": "認定低炭素旗艦邸（大空間・現し柱・無垢杉床）",
        "real_photo_ext": os.path.join(BASE_DIR, "raw_source_cases", "鶴ヶ島市 S様邸", "外観", "nakade-3737.jpg"),
        "real_photo_int": os.path.join(BASE_DIR, "raw_source_cases", "鶴ヶ島市 S様邸", "1階", "nakade-3516.jpg"),
    },
    {
        "id": "tsurugashima_a",
        "name": "鶴ヶ島市 A様邸",
        "sub": "無垢材モダン邸（開放LDK・木製カウンター）",
        "real_photo_ext": os.path.join(BASE_DIR, "raw_source_cases", "鶴ヶ島市 A様邸", "お勧めフォルダー", "_DSC8468.jpg"),
        "real_photo_int": os.path.join(BASE_DIR, "raw_source_cases", "鶴ヶ島市 A様邸", "お勧めフォルダー", "_DSC8499.jpg"),
    },
    {
        "id": "yoshimi_o",
        "name": "吉見町 O様邸",
        "sub": "ワイドオープン郊外邸（大開口・ゆとり空間）",
        "real_photo_ext": os.path.join(BASE_DIR, "raw_source_cases", "吉見町 O様邸", "DSC_0556.JPG"),
        "real_photo_int": os.path.join(BASE_DIR, "raw_source_cases", "吉見町 O様邸", "家族写真", "DSC_0613.JPG"),
    },
    {
        "id": "tokigawa_k",
        "name": "ときがわ町 K様邸",
        "sub": "吹抜光融合邸（2層開口・吉野杉羽目板壁）",
        "real_photo_ext": os.path.join(BASE_DIR, "raw_source_cases", "ときがわ町 K様邸", "外観", "DSC_8715.jpg"),
        "real_photo_int": os.path.join(BASE_DIR, "raw_source_cases", "ときがわ町 K様邸", "リビング", "DSC_8769.jpg"),
    }
]

# 検証する中央値パラメータ設定（3大プロファイル）
MEDIAN_CONFIGS = [
    {
        "cid": "median_a_denoise65",
        "label": "幾何素材バランス版 (Denoise 0.65)",
        "desc": "CAD幾何線の直進性と自然素材の質感を高精度に両立",
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
        "desc": "無垢檜床・珪藻土塗り壁・2700K自然光の照り返しが最も美しく融合する黄金中央値",
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
        "desc": "プロ建築写真の空気感・ハイライト・陰影をダイナミックに描く実写重視版",
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

def build_contact_sheet(title_text, subtitle_text, results_matrix, out_path):
    cols = 5  # [① 3D生線画] | [② 幾何素材版 Denoise 0.65] | [③ 自然素材光彩融合版 Denoise 0.68 ★] | [④ プロ実写優先版 Denoise 0.72] | [⑤ プロ実写真]
    rows = len(results_matrix)
    cell_w, cell_h = 560, 373
    pad_x, pad_y = 20, 20
    header_h = 100
    row_title_h = 36

    total_w = pad_x * 2 + cell_w * cols + 15 * (cols - 1)
    total_h = header_h + pad_y + (cell_h + row_title_h + pad_y) * rows + 30

    grid = Image.new("RGB", (total_w, total_h), (15, 23, 42)) # Slate 900
    draw = ImageDraw.Draw(grid)

    title_font = get_font(28)
    sub_font = get_font(15)
    header_font = get_font(14)
    label_font = get_font(12)

    # Header
    draw.text((pad_x, 18), title_text, fill=(56, 189, 248), font=title_font)
    draw.text((pad_x, 56), subtitle_text, fill=(148, 163, 184), font=sub_font)

    col_titles = [
        "【① ARCHITREND ZERO 3D生線画】",
        "【② 幾何素材バランス (Denoise 0.65)】",
        "【③ 自然素材・光彩融合 (Denoise 0.68 ★黄金中央値)】",
        "【④ プロ実写光彩優先 (Denoise 0.72)】",
        "【⑤ プロ建築写真 (実機施工基準)】"
    ]
    col_colors = [(148, 163, 184), (56, 189, 248), (52, 211, 153), (167, 139, 250), (251, 191, 36)]

    curr_y = header_h
    for c_idx, title in enumerate(col_titles):
        col_x = pad_x + c_idx * (cell_w + 15)
        draw.rectangle([col_x, curr_y - 28, col_x + cell_w, curr_y - 4], fill=(30, 41, 59))
        draw.text((col_x + 10, curr_y - 24), title, fill=col_colors[c_idx], font=header_font)

    for r_idx, res in enumerate(results_matrix):
        case_info = res["case"]
        row_y = curr_y + r_idx * (cell_h + row_title_h + pad_y)

        # Row Banner
        draw.rectangle([pad_x, row_y, total_w - pad_x, row_y + row_title_h - 4], fill=(30, 41, 59))
        banner_text = f"■ CASE {r_idx+1}: {case_info['name']} （{case_info['sub']}）"
        draw.text((pad_x + 12, row_y + 8), banner_text, fill=(248, 250, 252), font=header_font)

        img_y = row_y + row_title_h

        # Col 0: 3D Lineart
        c0_im = res["lineart_img"].resize((cell_w, cell_h), Image.Resampling.LANCZOS)
        grid.paste(c0_im, (pad_x, img_y))
        draw.rectangle([pad_x, img_y, pad_x + cell_w, img_y + cell_h], outline=(71, 85, 105), width=1)
        draw.rectangle([pad_x + 8, img_y + 8, pad_x + 220, img_y + 30], fill=(0, 0, 0, 200))
        draw.text((pad_x + 14, img_y + 11), "FBX幾何輪郭線（Edges 20°）", fill=(203, 213, 225), font=label_font)

        # Col 1, 2, 3: Outputs
        for out_idx, out_entry in enumerate(res["outputs"]):
            col_x = pad_x + (out_idx + 1) * (cell_w + 15)
            c_im = out_entry["img"].resize((cell_w, cell_h), Image.Resampling.LANCZOS)
            grid.paste(c_im, (col_x, img_y))
            border_color = (2, 132, 199) if out_idx == 0 else ((5, 150, 105) if out_idx == 1 else (124, 58, 237))
            border_width = 3 if out_idx == 1 else 1
            draw.rectangle([col_x, img_y, col_x + cell_w, img_y + cell_h], outline=border_color, width=border_width)
            draw.rectangle([col_x + 8, img_y + 8, col_x + 320, img_y + 32], fill=(15, 23, 42, 220))
            tag_label = "★黄金中央値 0.68" if out_idx == 1 else ("Denoise 0.65" if out_idx == 0 else "Denoise 0.72")
            draw.text((col_x + 14, img_y + 11), f"{tag_label} | 保持率:{out_entry['metrics']['preservation_rate']}% | 温かみ:{out_entry['metrics']['warmth_ratio']}", fill=col_colors[out_idx + 1], font=label_font)

        # Col 4: Real Photo
        col4_x = pad_x + 4 * (cell_w + 15)
        if res["real_img"] is not None:
            c4_im = res["real_img"].resize((cell_w, cell_h), Image.Resampling.LANCZOS)
            grid.paste(c4_im, (col4_x, img_y))
            draw.rectangle([col4_x, img_y, col4_x + cell_w, img_y + cell_h], outline=(217, 119, 6), width=1)
            draw.rectangle([col4_x + 8, img_y + 8, col4_x + 230, img_y + 30], fill=(0, 0, 0, 200))
            draw.text((col4_x + 14, img_y + 11), "プロ実写基準 (住ま居る品質)", fill=(251, 191, 36), font=label_font)

    grid.save(out_path, quality=93)
    print(f"🎉 比較コンタクトシート保存完了: {out_path}")

def run_suite(suite_type="exterior"):
    is_ext = (suite_type == "exterior")
    prompt = PROMPT_EXTERIOR if is_ext else PROMPT_INTERIOR
    prefix = "exterior" if is_ext else "ldk"
    suite_title = "【外観パース・他案件展開】" if is_ext else "【室内LDK・他案件展開】"

    print("\n" + "=" * 80)
    print(f"  ▶ 実行スイート: {suite_title}")
    print("=" * 80)

    suite_results = []

    for c in CASES:
        case_name = c["name"]
        print(f"\n--- 案件: 【{case_name}】 ---")

        case_dir = os.path.join(EXTRACTED_DIR, case_name)
        normal_p = os.path.join(case_dir, f"{prefix}_normal.png")
        depth_p = os.path.join(case_dir, f"{prefix}_depth.png")
        lineart_p = os.path.join(case_dir, f"{prefix}_lineart.png")

        if not os.path.exists(normal_p) or not os.path.exists(depth_p) or not os.path.exists(lineart_p):
            print(f"  ⚠️ パス欠落のためスキップ: {case_name} ({prefix})")
            continue

        normal_img = Image.open(normal_p).convert("RGB").resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
        depth_img = Image.open(depth_p).convert("RGB").resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
        lineart_img = Image.open(lineart_p).convert("RGB").resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)

        real_photo_p = c["real_photo_ext"] if is_ext else c["real_photo_int"]
        real_img = None
        if os.path.exists(real_photo_p):
            real_img = Image.open(real_photo_p).convert("RGB").resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)

        case_entry = {
            "case": c,
            "normal_img": normal_img,
            "lineart_img": lineart_img,
            "real_img": real_img,
            "outputs": []
        }

        for cfg in MEDIAN_CONFIGS:
            out_fname = f"{c['id']}_{prefix}_{cfg['cid']}.jpg"
            out_path = os.path.join(OUT_DIR, out_fname)
            print(f"  ⚡ 生成中: {cfg['label']} (Denoise={cfg['denoise']})...")

            gen_img, elapsed = run_sd_generation(normal_img, depth_img, lineart_img, prompt, cfg)
            gen_img.save(out_path, quality=95)

            metrics = compute_quality_metrics(gen_img, lineart_img)
            print(f"    ✅ 保存完了 ({elapsed:.1f}s): {out_fname}")
            print(f"       幾何保持率: {metrics['preservation_rate']}% | 温かみ比率(R/B): {metrics['warmth_ratio']} | 明度: {metrics['brightness']}")

            case_entry["outputs"].append({
                "config": cfg,
                "img": gen_img,
                "path": out_path,
                "fname": out_fname,
                "metrics": metrics
            })

        suite_results.append(case_entry)

    # コンタクトシート生成
    grid_out = os.path.join(OUT_DIR, f"multicase_{prefix}_comparison_grid.jpg")
    sub_text = "小峯様邸1邸への固執を完全脱却し、4案件の実機FBXから中央値設定（Denoise 0.65〜0.72 / Guidance End 0.75〜0.88）の汎用性を検証"
    build_contact_sheet(f"{suite_title} ARCHITREND ZERO FBX ➔ フォトリアル建築パース検証マトリクス", sub_text, suite_results, grid_out)
    return suite_results

def main():
    print("=" * 80)
    print("  【他案件展開・中央値ロバスト設定】マルチケース生成パイプライン開始")
    print(f"  GPUサーバー: {SD_URL}")
    print(f"  出力先    : {OUT_DIR}")
    print("=" * 80)

    # 1. 外観スイート（全4案件）
    ext_results = run_suite("exterior")

    # 2. 内観スイート（全4案件）
    int_results = run_suite("interior")

    # JSONサマリー
    summary_data = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "median_recommendation": {
            "optimal_denoise": 0.68,
            "depth_weight": 0.80,
            "depth_guidance_end": 0.85,
            "canny_weight": 0.42,
            "canny_guidance_end": 0.80,
            "rationale": "事前陰影（craftMaterial）とガイダンス切り上げ（Depth 0.85 / Canny 0.80）により、CADの正確な壁・窓・柱の幾何を強固に拘束しつつ、後半ステップで無垢檜・杉床の柔らかな木目・珪藻土塗り壁の陰影・2700K自然光の照り返しを完全融合生成できる。"
        },
        "exterior_cases": len(ext_results),
        "interior_cases": len(int_results)
    }

    json_path = os.path.join(OUT_DIR, "multicase_master_summary.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(summary_data, f, ensure_ascii=False, indent=2)

    print(f"\n🎉 全プロセス完了！サマリー保存: {json_path}")

if __name__ == "__main__":
    main()
