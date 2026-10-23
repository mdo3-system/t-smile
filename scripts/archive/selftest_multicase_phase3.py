# -*- coding: utf-8 -*-
"""
scripts/selftest_multicase_phase3.py
====================================
【他施工実例 第3弾セルフテスト検証】
1. 鶴ヶ島市 KB様邸 (本格モダン和室・雪見障子・地窓・吊り押入れ)
2. 鶴ヶ島市 T様邸 (古民家再生・土間リビング・現し梁・ベンガラ左官壁)
3. 吉見町 O様邸 (小上がり和室コーナー・段差収納・無垢ウォールナット)
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
OUT_DIR = os.path.join(BASE_DIR, "public", "renders", "selftest_multicase_phase3")
os.makedirs(OUT_DIR, exist_ok=True)

GPU_URL = "http://192.168.11.104:7861"
TARGET_W = 960
TARGET_H = 640

def to_base64(im):
    buf = BytesIO()
    im.save(buf, format="JPEG", quality=95)
    return base64.b64encode(buf.getvalue()).decode("utf-8")

# 和室共通ネガティブ
NEGATIVE_WASHITSU = (
    "(western bed, sofa, modern chairs:2.0), "
    "(stairs, ladder, distortion:2.0), "
    "(clutter, trash, mess, cables:1.5), "
    "(people, human:1.4), "
    "hallucination, deformed tatami, broken shoji, crooked lines, blurry, cgi"
)

# 土間リビング共通ネガティブ
NEGATIVE_DOMA = (
    "(stairs, extra steps, stairs hallucination:2.0), "
    "(clutter, trash, mess, cables, plastic:1.5), "
    "(people, human:1.4), "
    "distorted timber, crooked beams, deformed ceiling, blurry, low quality"
)

# 小上がり和室共通ネガティブ
NEGATIVE_KOAGARI = (
    "(extra stairs, broken step, floating furniture:2.0), "
    "(clutter, mess, cables:1.5), "
    "(people, human:1.4), "
    "crooked lines, deformed tatami mats, blurry, cgi"
)

PHASE3_CASES = [
    {
        "id": "kb_washitsu",
        "name": "鶴ヶ島市 KB様邸",
        "features": "本格モダン和室・吊り押入れ・地窓・和紙アクセント壁",
        "src_photo": os.path.join(BASE_DIR, "raw_source_case", "鶴ヶ島市 KB様邸", "和室", "DSC_8634.jpg"),
        "tests": [
            {
                "tid": "kb_washitsu_base",
                "title": "本格和室 骨格完全固定（昼景自然光）",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty Japanese contemporary washitsu tatami room, authentic edge-less square tatami mat flooring, "
                    "floating oshiire closet with bottom low horizontal window jimado casting gentle ground light, "
                    "textured earthy washi plaster feature wall, round washi lantern pendant lamp, "
                    "pure zen serenity, soft morning natural daylight, architectural digest photo, 8k"
                ),
                "negative": NEGATIVE_WASHITSU,
                "denoise": 0.46, "cn_w": 0.95, "tint_floor": False
            },
            {
                "tid": "kb_washitsu_charcoal",
                "title": "和室 × 墨色チャコール和紙畳化（ティント併用）",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty Japanese modern washitsu room, "
                    "luxurious dark charcoal grey sumi-iro Japanese paper tatami mats, "
                    "floating closet, bottom low horizontal window jimado, "
                    "pure zen minimalism, subtle textures, architectural digest photo, 8k"
                ),
                "negative": "(green yellow tatami:2.0), " + NEGATIVE_WASHITSU,
                "denoise": 0.46, "cn_w": 0.95, "tint_floor": True
            },
            {
                "tid": "kb_washitsu_twilight",
                "title": "和室 × 夕景・行燈ナイトモード（暖色ペンダント間接光）",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty Japanese washitsu tatami room at evening dusk, "
                    "glowing warm 2400K paper lantern and soft indirect lighting beneath floating closet, "
                    "deep blue twilight subtly visible through low horizontal window jimado, "
                    "atmospheric tranquil luxury ryokan ambience, architectural digest photo, 8k"
                ),
                "negative": "(bright daylight, sun:1.8), " + NEGATIVE_WASHITSU,
                "denoise": 0.50, "cn_w": 0.92, "tint_floor": False
            }
        ]
    },
    {
        "id": "t_doma",
        "name": "鶴ヶ島市 T様邸",
        "features": "古民家再生・土間リビング・現し垂木天井・自然素材",
        "src_photo": os.path.join(BASE_DIR, "raw_source_case", "鶴ヶ島市 T様邸", "1F", "IMG_9258.jpg"),
        "tests": [
            {
                "tid": "t_doma_base",
                "title": "土間リビング 骨格完全固定（現し梁・土間タイル）",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty spacious Japanese contemporary living hall with authentic earthen doma tiled floor, "
                    "parallel natural solid timber exposed ceiling rafters and beams, "
                    "warm terracotta earthy plaster feature wall, clean architecture, "
                    "soft bright architectural lighting, architectural digest photo, 8k"
                ),
                "negative": NEGATIVE_DOMA,
                "denoise": 0.46, "cn_w": 0.95, "tint_floor": False
            },
            {
                "tid": "t_doma_dark_slate",
                "title": "土間リビング × ダークスレート玄昌石化（ティント併用）",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty Japanese living hall, "
                    "rich dark charcoal slate stone tiled doma floor with subtle texture, "
                    "solid exposed timber rafters on ceiling, pure clean plaster walls, "
                    "architectural digest photo, 8k"
                ),
                "negative": "(pale light grey floor:1.8), " + NEGATIVE_DOMA,
                "denoise": 0.46, "cn_w": 0.95, "tint_floor": True
            },
            {
                "tid": "t_doma_twilight",
                "title": "土間リビング × 夕景トワイライト＆梁下間接光",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty Japanese living hall at twilight dusk, "
                    "warm 2700K recessed spotlights casting dramatic shadows between exposed timber ceiling rafters, "
                    "peaceful moody evening atmosphere, serene luxury residence, architectural digest photo, 8k"
                ),
                "negative": "(bright daylight, sun:1.8), " + NEGATIVE_DOMA,
                "denoise": 0.50, "cn_w": 0.92, "tint_floor": False
            }
        ]
    },
    {
        "id": "o_koagari",
        "name": "吉見町 O様邸",
        "features": "小上がり和室・段差収納・無垢ウォールナット床",
        "src_photo": os.path.join(BASE_DIR, "raw_source_case", "吉見町 O様邸", "DSC_0590.JPG"),
        "tests": [
            {
                "tid": "o_koagari_base",
                "title": "小上がり和室 骨格完全固定（段差・框・引き出し固定）",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty Japanese open concept living room with raised koagari tatami corner, "
                    "solid walnut hardwood flooring, clean wooden raised platform with storage drawers, "
                    "natural rush tatami mats, clean diatomaceous plaster walls, "
                    "bright morning sunlight streaming in, architectural digest photo, 8k"
                ),
                "negative": NEGATIVE_KOAGARI,
                "denoise": 0.46, "cn_w": 0.95, "tint_floor": False
            },
            {
                "tid": "o_koagari_ryukyu",
                "title": "小上がり和室 × 濃色モダン畳化（ティント併用）",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty Japanese contemporary living room with raised koagari tatami platform, "
                    "rich dark espresso walnut solid hardwood flooring, "
                    "sophisticated modern grey edge-less Ryukyu tatami mats, "
                    "pure clean white plaster walls, architectural digest photo, 8k"
                ),
                "negative": "(bright yellow tatami:2.0), " + NEGATIVE_KOAGARI,
                "denoise": 0.46, "cn_w": 0.95, "tint_floor": True
            },
            {
                "tid": "o_koagari_twilight",
                "title": "小上がり和室 × 夕景トワイライト＆間接照明",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty living room with raised koagari tatami platform at twilight dusk, "
                    "warm 2700K ambient cove lighting illuminating the raised platform edge, "
                    "deep twilight sky outside window, serene cozy evening mood, 8k"
                ),
                "negative": "(daylight, bright sun:1.8), " + NEGATIVE_KOAGARI,
                "denoise": 0.50, "cn_w": 0.92, "tint_floor": False
            }
        ]
    }
]

def run_phase3_benchmark():
    print("=" * 70)
    print("  他施工実例 第3弾セルフテスト（和室・土間・小上がり）開始")
    print(f"  GPU接続先: {GPU_URL}")
    print(f"  出力先  : {OUT_DIR}")
    print("=" * 70)

    summary = []

    for c in PHASE3_CASES:
        print(f"\n========================================================")
        print(f"  実例検証: 【{c['name']}】({c['features']})")
        print(f"  元写真: {c['src_photo']}")
        print(f"========================================================")

        raw_im = Image.open(c["src_photo"]).convert("RGB").resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
        b64_orig = to_base64(raw_im)

        for t in c["tests"]:
            tid = t["tid"]
            title = t["title"]
            denoise = t["denoise"]
            cn_w = t["cn_w"]

            if t.get("tint_floor"):
                arr = np.array(raw_im, dtype=np.float32)
                for y in range(int(TARGET_H * 0.55), TARGET_H):
                    weight = (y - TARGET_H * 0.55) / (TARGET_H * 0.45)
                    arr[y, :, 0] *= (1.0 - weight * 0.45)
                    arr[y, :, 1] *= (1.0 - weight * 0.55)
                    arr[y, :, 2] *= (1.0 - weight * 0.60)
                tinted_im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
                b64_input = to_base64(tinted_im)
            else:
                b64_input = b64_orig

            print(f"\n--- 実行中: {tid} ({title}) ---")

            payload = {
                "init_images": [b64_input],
                "prompt": t["prompt"],
                "negative_prompt": t["negative"],
                "steps": 28,
                "cfg_scale": 7.5,
                "denoising_strength": denoise,
                "width": TARGET_W,
                "height": TARGET_H,
                "sampler_name": "DPM++ 2M Karras",
                "seed": 20261016,
                "alwayson_scripts": {
                    "controlnet": {
                        "args": [
                            {
                                "input_image": b64_orig,
                                "module": "depth",
                                "model": "control_v11f1p_sd15_depth [cfd03158]",
                                "weight": cn_w,
                                "control_mode": "Balanced",
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

                    out_path = os.path.join(OUT_DIR, f"{tid}.jpg")
                    with open(out_path, "wb") as f_out:
                        f_out.write(img_bytes)

                    print(f"  -> [SUCCESS] 保存完了: {tid}.jpg ({len(img_bytes):,} bytes, {elapsed:.1f}s)")
                    summary.append({
                        "case_id": c["id"],
                        "tid": tid,
                        "title": title,
                        "filesize": len(img_bytes),
                        "elapsed": elapsed,
                        "status": "SUCCESS"
                    })
            except Exception as e:
                print(f"  -> [ERROR] ({tid}): {e}")
                summary.append({"case_id": c["id"], "tid": tid, "error": str(e), "status": "FAILED"})

    with open(os.path.join(OUT_DIR, "phase3_report.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print("\n第3弾セルフテスト全件レンダリング完了！")

if __name__ == "__main__":
    run_phase3_benchmark()
