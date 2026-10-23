# -*- coding: utf-8 -*-
"""
scripts/pipeline_3d_to_photoreal.py
===================================
【3D CAD（FBX）連携 Multi-ControlNet フォトリアル建築パース生成エンジン】
Gemini, ChatGPT, Claude の3大AI推奨アーキテクチャに準拠：
1. クレイレンダリング（白模型画像）を img2img の init_images として入力
2. Slot 1: Depth（Z-depth深度マップ）Weight: 0.85, Ending: 1.0 (空間奥行き・パース拘束)
3. Slot 2: Lineart（構造線画）Weight: 0.55, Ending: 0.75 (窓サッシ・建具直線を拘束しつつCG感を消す)
4. モジュール式プロンプト設計（[撮影/品質] + [空間] + [素材] + [照明/時間帯]）
"""

import os
import sys
import json
import time
import base64
import urllib.request
import numpy as np
from io import BytesIO
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity"
GPU_URL = "http://192.168.11.104:7861"
OUT_DIR = os.path.join(BASE_DIR, "public", "renders", "pipeline_3d_photoreal")
os.makedirs(OUT_DIR, exist_ok=True)

TARGET_W = 960
TARGET_H = 640

def to_base64(im):
    buf = BytesIO()
    im.save(buf, format="JPEG", quality=95)
    return base64.b64encode(buf.getvalue()).decode("utf-8")

# 共通建築ネガティブ（3大AI共通推奨）
NEGATIVE_COMMON = (
    "(worst quality, low quality:1.4), (deformed, distorted:1.3), "
    "blurry, watermark, text, signature, people, humans, "
    "distorted architecture, crooked walls, bent vertical lines, misaligned windows, bad perspective, "
    "cartoon, anime, 3d render plastic look, oversaturated, unrealistic reflections, "
    "(stairs, staircase, steps, ladder:2.2), " # 階段ハルシネーション完全排除
    "(furniture, sofa, couch, dining table, chairs, clutter, trash, wires:1.8)" # 空室・骨格固定用
)

# 3大AI推奨のモジュール式プロンプト辞書
PROMPT_MODULES = {
    "camera_quality": (
        "masterpiece, best quality, ultra-detailed professional architectural photography, "
        "physically based materials, realistic global illumination, natural light transport, "
        "realistic reflections, accurate material roughness, perfectly straight vertical lines, "
        "24mm architectural rectilinear lens, balanced HDR exposure, 8k, photorealistic"
    ),
    "space": {
        "ldk_void": "empty unfurnished spacious open-concept modern Japanese living and dining room, double-height ceiling with open void, clean wall cutouts, open kitchen counter on far wall, completely empty clean floor",
        "washitsu": "empty Japanese contemporary washitsu tatami room, floating closet with bottom low horizontal window jimado, pure zen serenity",
        "entrance": "minimalist Japanese modern entrance hall genkan, smooth mortared floor, natural wood floating shoe cabinet, clean architecture"
    },
    "material": {
        "cedar_plaster": "seamless solid natural Yoshino cedar hardwood flooring with delicate wood grain, pure clean hand-plastered white diatomaceous earth plaster walls",
        "dark_walnut": "rich dark espresso walnut solid hardwood flooring with deep chocolate tones and smooth satin finish, matching dark wood baseboards, clean white plaster walls",
        "stone_accent": "large-format textured matte grey stone feature wall tiles, solid hardwood flooring, pure white diatomaceous plaster walls",
        "sumi_tatami": "luxurious dark charcoal grey sumi-iro Japanese paper square borderless tatami mats, subtle texture"
    },
    "lighting": {
        "day_sunlight": "bright soft morning natural daylight flooding in from large patio windows, realistic soft contact shadows, airy and peaceful atmosphere",
        "twilight_cove": "twilight blue hour dusk, deep navy blue twilight sky visible through windows, warm 2700K indirect cove lighting illuminating the ceiling and plaster walls, stunning warm and cool contrast, cozy high-end residential atmosphere",
        "afternoon_golden": "late afternoon golden hour sunlight streaming across the floor, long gentle soft shadows, warm natural wood highlights"
    }
}

def build_prompt(space_key, mat_key, light_key):
    return f"{PROMPT_MODULES['camera_quality']}, {PROMPT_MODULES['space'][space_key]}, {PROMPT_MODULES['material'][mat_key]}, {PROMPT_MODULES['lighting'][light_key]}"

# 3Dからの抽出アセット（ときがわ町K様邸 LDKモデル）
ASSETS_DIR = os.path.join(BASE_DIR, "public", "renders", "controlnet_extracted", "ときがわ町 K様邸")

TEST_PRESETS = [
    {
        "id": "3d_p1_cedar_day",
        "title": "3D FBX ➔ 基準昼景（吉野杉無垢床 × 白漆喰壁 × 朝の自然光）",
        "space": "ldk_void",
        "material": "cedar_plaster",
        "lighting": "day_sunlight",
        "denoise": 0.46,
        "depth_weight": 0.85,
        "lineart_weight": 0.55,
        "lineart_end": 0.75,
        "tint_floor": False
    },
    {
        "id": "3d_p2_dark_walnut",
        "title": "3D FBX ➔ 高級ダークウォールナット床（ティント併用）",
        "space": "ldk_void",
        "material": "dark_walnut",
        "lighting": "day_sunlight",
        "denoise": 0.46,
        "depth_weight": 0.85,
        "lineart_weight": 0.55,
        "lineart_end": 0.75,
        "tint_floor": True
    },
    {
        "id": "3d_p3_stone_accent",
        "title": "3D FBX ➔ アクセント壁 大判グレーストーンタイル化",
        "space": "ldk_void",
        "material": "stone_accent",
        "lighting": "day_sunlight",
        "denoise": 0.50,
        "depth_weight": 0.85,
        "lineart_weight": 0.60,
        "lineart_end": 0.75,
        "tint_floor": False
    },
    {
        "id": "3d_p4_twilight_cove",
        "title": "3D FBX ➔ 夕景トワイライト × 2700Kコーブ間接照明",
        "space": "ldk_void",
        "material": "cedar_plaster",
        "lighting": "twilight_cove",
        "denoise": 0.50,
        "depth_weight": 0.85,
        "lineart_weight": 0.55,
        "lineart_end": 0.75,
        "tint_floor": False
    }
]

def run_pipeline():
    print("=" * 70)
    print("  3D CAD（FBX）連携 Multi-ControlNet パイプライン実行")
    print(f"  GPU接続先: {GPU_URL}")
    print(f"  出力先  : {OUT_DIR}")
    print("=" * 70)

    # 1. 3D入力アセットの読み込み
    clay_path = os.path.join(ASSETS_DIR, "unfurnished_base.jpg")
    depth_path = os.path.join(ASSETS_DIR, "unfurnished_depth.png")
    edge_path = os.path.join(ASSETS_DIR, "unfurnished_structural_edges.png")

    for p in [clay_path, depth_path, edge_path]:
        if not os.path.exists(p):
            print(f"Error: 3Dアセットが見つかりません: {p}")
            return

    clay_raw = Image.open(clay_path).convert("RGB").resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
    depth_img = Image.open(depth_path).convert("RGB").resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
    edge_img = Image.open(edge_path).convert("RGB").resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)

    b64_clay_orig = to_base64(clay_raw)
    b64_depth = to_base64(depth_img)
    b64_edge = to_base64(edge_img)

    results = []

    for preset in TEST_PRESETS:
        pid = preset["id"]
        title = preset["title"]
        prompt = build_prompt(preset["space"], preset["material"], preset["lighting"])
        denoise = preset["denoise"]
        dw = preset["depth_weight"]
        lw = preset["lineart_weight"]
        le = preset["lineart_end"]

        print(f"\n--- 実行中: {pid} ({title}) ---")
        print(f"  Denoise: {denoise} | Depth Weight: {dw} | Lineart Weight: {lw} (End: {le})")

        # 床ティント前処理（ダークウォールナットの場合）
        if preset["tint_floor"]:
            arr = np.array(clay_raw, dtype=np.float32)
            for y in range(int(TARGET_H * 0.55), TARGET_H):
                weight = (y - TARGET_H * 0.55) / (TARGET_H * 0.45)
                arr[y, :, 0] *= (1.0 - weight * 0.45)
                arr[y, :, 1] *= (1.0 - weight * 0.55)
                arr[y, :, 2] *= (1.0 - weight * 0.60)
            tinted_clay = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
            b64_clay_input = to_base64(tinted_clay)
        else:
            b64_clay_input = b64_clay_orig

        # 3大AI推奨の Multi-ControlNet ペイロード
        payload = {
            "init_images": [b64_clay_input],
            "prompt": prompt,
            "negative_prompt": NEGATIVE_COMMON,
            "steps": 30,
            "cfg_scale": 7.0,
            "denoising_strength": denoise,
            "width": TARGET_W,
            "height": TARGET_H,
            "sampler_name": "DPM++ 2M Karras",
            "seed": 20261016,
            "alwayson_scripts": {
                "controlnet": {
                    "args": [
                        {
                            "input_image": b64_depth,
                            "module": "none",
                            "model": "control_v11f1p_sd15_depth [cfd03158]",
                            "weight": dw,
                            "ending_step": 1.0,
                            "control_mode": "Balanced",
                            "resize_mode": "Crop and Resize"
                        },
                        {
                            "input_image": b64_edge,
                            "module": "none",
                            "model": "control_v11p_sd15_canny [d14c016b]",
                            "weight": lw,
                            "ending_step": le, # 0.75で抜いてCG感を消す
                            "control_mode": "ControlNet is more important",
                            "resize_mode": "Crop and Resize"
                        }
                    ]
                }
            }
        }

        req = urllib.request.Request(
            f"{GPU_URL}/sdapi/v1/img2img",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )

        t0 = time.time()
        try:
            with urllib.request.urlopen(req, timeout=180) as res:
                elapsed = time.time() - t0
                resp_data = json.loads(res.read().decode("utf-8"))
                img_bytes = base64.b64decode(resp_data["images"][0])

                out_path = os.path.join(OUT_DIR, f"{pid}.jpg")
                with open(out_path, "wb") as f_out:
                    f_out.write(img_bytes)

                print(f"  -> [SUCCESS] 保存完了: {pid}.jpg ({len(img_bytes):,} bytes, {elapsed:.1f}s)")
                results.append({
                    "id": pid,
                    "title": title,
                    "filename": f"{pid}.jpg",
                    "filesize": len(img_bytes),
                    "elapsed": elapsed,
                    "status": "SUCCESS"
                })
        except Exception as e:
            print(f"  -> [ERROR] ({pid}): {e}")
            results.append({"id": pid, "title": title, "error": str(e), "status": "FAILED"})

    with open(os.path.join(OUT_DIR, "pipeline_report.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print("\n全パターンのレンダリング完了！")

if __name__ == "__main__":
    run_pipeline()
