# -*- coding: utf-8 -*-
"""
scripts/selftest_multicase_deep_benchmark.py
============================================
【他施工実例（Case 6 本命LDK・Case 5 スケルトン階段・Case 1 空室無垢洋室）精密検証】
建築的難易度の高い3大要素：
1. Case 6 (photo_07.jpg): 露出登り梁・大黒柱・吹き抜けの幾何保持
2. Case 5 (photo_03.jpg): スケルトン鉄骨階段・段板の幾何保持
3. Case 1 (photo_09.jpg): 家具なし無垢杉洋室の完全クリーン素材変革
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
OUT_DIR = os.path.join(BASE_DIR, "public", "renders", "selftest_multicase_deep")
os.makedirs(OUT_DIR, exist_ok=True)

GPU_URL = "http://192.168.11.104:7861"
TARGET_W = 960
TARGET_H = 640

def to_base64(im):
    buf = BytesIO()
    im.save(buf, format="JPEG", quality=95)
    return base64.b64encode(buf.getvalue()).decode("utf-8")

NEGATIVE_BASE = (
    "(stairs, ladder:2.2), " # 階段写真以外用
    "(clutter, trash, boxes, wires, mess, unorganized, cheap furniture, plastic:1.5), "
    "(people, human, person:1.4), "
    "hallucination, distorted architecture, floating objects, crooked lines, blurry, low quality, cgi"
)

NEGATIVE_EMPTY = (
    "(furniture, sofa, couch, dining table, chairs, table, bench, rug, carpet:1.9), "
    + NEGATIVE_BASE
)

# 階段があるCase 5用のネガティブ（階段そのものは消去・変形させない）
NEGATIVE_STAIRS = (
    "(extra stairs, floating stairs, deformed steps, crooked handrail:2.0), "
    "(furniture, sofa, couch, clutter, trash, wires:1.5), "
    "(people, human:1.4), "
    "hallucination, distorted architecture, crooked lines, blurry, cgi"
)

TEST_CASES = [
    {
        "id": "case6_ldk",
        "name": "Case 6: 行田市 H様邸 (本命LDK)",
        "features": "露出登り梁・大黒柱・吹き抜け大空間LDK",
        "src_photo": os.path.join(BASE_DIR, "public", "images", "cases_real", "case6", "photo_07.jpg"),
        "tests": [
            {
                "tid": "case6_ldk_base",
                "title": "露出登り梁・大黒柱 骨格完全固定（昼景自然光）",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty expansive Japanese contemporary living room with dramatic vaulted ceiling, "
                    "authentic massive exposed solid timber structural roof beams and columns, "
                    "solid natural hardwood flooring, pure white diatomaceous plaster walls, "
                    "bright morning sunlight streaming in, architectural digest photo, 8k"
                ),
                "negative": NEGATIVE_EMPTY,
                "denoise": 0.46, "cn_w": 0.95, "tint_floor": False
            },
            {
                "tid": "case6_ldk_walnut",
                "title": "露出梁空間 × 床ダークウォールナット化（ティント併用）",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty expansive Japanese contemporary living room with vaulted ceiling and exposed timber beams, "
                    "rich dark espresso walnut solid hardwood flooring with deep chocolate tones and satin finish, "
                    "pure white diatomaceous plaster walls, architectural digest photo, 8k"
                ),
                "negative": "(light blonde yellow floor:2.0), " + NEGATIVE_EMPTY,
                "denoise": 0.46, "cn_w": 0.95, "tint_floor": True
            },
            {
                "tid": "case6_ldk_twilight",
                "title": "露出梁空間 × 夕景トワイライト＆2700K温白色間接光",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty living room with vaulted ceiling and exposed structural timber beams at twilight dusk, "
                    "deep navy twilight sky outside windows, warm 2700K ambient lighting casting elegant soft shadows under roof beams, "
                    "rich warm wood reflections, tranquil luxury evening atmosphere, 8k"
                ),
                "negative": "(bright midday sun, daylight:1.8), " + NEGATIVE_EMPTY,
                "denoise": 0.50, "cn_w": 0.92, "tint_floor": False
            }
        ]
    },
    {
        "id": "case5_stairs",
        "name": "Case 5: 坂戸市 Y様邸 (スケルトン階段)",
        "features": "スケルトン鉄骨階段・ピュアホワイト・ホテルライク空間",
        "src_photo": os.path.join(BASE_DIR, "public", "images", "cases_real", "case5", "photo_03.jpg"),
        "tests": [
            {
                "tid": "case5_stairs_base",
                "title": "スケルトン階段 直線美固定（基準昼景）",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty minimalist entrance hall and corridor, modern open steel skeleton staircase with clean tread steps, "
                    "high gloss white polished porcelain tile floor, pure clean grey and white walls, "
                    "soft bright architectural lighting, crisp lines, architectural digest photo, 8k"
                ),
                "negative": NEGATIVE_STAIRS,
                "denoise": 0.46, "cn_w": 0.95, "tint_floor": False
            },
            {
                "tid": "case5_stairs_dark",
                "title": "スケルトン階段 × 床ダークグレータイル化（ティント併用）",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty minimalist hall, open steel skeleton staircase, "
                    "luxurious dark charcoal slate matte tile flooring, sophisticated dark floor tones, "
                    "pure white walls, architectural digest photo, 8k"
                ),
                "negative": "(white light pale floor:2.0), " + NEGATIVE_STAIRS,
                "denoise": 0.46, "cn_w": 0.95, "tint_floor": True
            },
            {
                "tid": "case5_stairs_twilight",
                "title": "スケルトン階段 × 夕景トワイライト＆足元間接照明",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty modern hall with open steel skeleton staircase at twilight dusk, "
                    "warm 2700K architectural low-level strip lighting illuminating the stair steps and polished floor, "
                    "subtle blue dusk ambiance, hotel lobby elegance, 8k"
                ),
                "negative": "(bright daylight, sun:1.8), " + NEGATIVE_STAIRS,
                "denoise": 0.50, "cn_w": 0.92, "tint_floor": False
            }
        ]
    },
    {
        "id": "case1_empty",
        "name": "Case 1: 鶴ヶ島市 S様邸 (空室洋室)",
        "features": "家具なし無垢杉床・勾配天井・洋室",
        "src_photo": os.path.join(BASE_DIR, "public", "images", "cases_real", "case1", "photo_09.jpg"),
        "tests": [
            {
                "tid": "case1_empty_base",
                "title": "無垢杉空室 骨格完全固定（家具なし原本）",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "completely empty unfurnished Japanese contemporary bedroom, natural solid cedar hardwood flooring, "
                    "clean white diatomaceous plaster walls, sloped ceiling, bright natural daylight streaming through window, "
                    "architectural digest photo, 8k"
                ),
                "negative": NEGATIVE_EMPTY,
                "denoise": 0.46, "cn_w": 0.95, "tint_floor": False
            },
            {
                "tid": "case1_empty_walnut",
                "title": "無垢杉空室 × 床ダークウォールナット化（ティント併用）",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "completely empty unfurnished room, "
                    "rich dark espresso walnut solid hardwood flooring with deep chocolate tones, "
                    "clean white diatomaceous plaster walls, bright natural daylight, architectural digest photo, 8k"
                ),
                "negative": "(light blonde yellow floor:2.0), " + NEGATIVE_EMPTY,
                "denoise": 0.46, "cn_w": 0.95, "tint_floor": True
            },
            {
                "tid": "case1_empty_twilight",
                "title": "無垢杉空室 × 夕景トワイライト＆間接照明",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "completely empty unfurnished room at twilight dusk, "
                    "deep navy blue twilight sky through window, warm 2700K indirect ambient lighting, "
                    "peaceful quiet evening mood, architectural digest photo, 8k"
                ),
                "negative": "(daylight, bright sun:1.8), " + NEGATIVE_EMPTY,
                "denoise": 0.50, "cn_w": 0.92, "tint_floor": False
            }
        ]
    }
]

def run_deep_benchmark():
    print("=" * 70)
    print("  精密難所セルフテスト（露出梁・スケルトン階段・無垢空室）開始")
    print(f"  GPU接続先: {GPU_URL}")
    print(f"  出力先  : {OUT_DIR}")
    print("=" * 70)

    summary = []

    for c in TEST_CASES:
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

    with open(os.path.join(OUT_DIR, "deep_report.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print("\n精密検証レンダリング完了！")

if __name__ == "__main__":
    run_deep_benchmark()
