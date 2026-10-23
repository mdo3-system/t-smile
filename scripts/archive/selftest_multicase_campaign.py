# -*- coding: utf-8 -*-
"""
scripts/selftest_multicase_campaign.py
======================================
【他施工実例（Case 1, Case 4, Case 6）との横断セルフテスト検証】
ときがわ町K様邸（Case 2）で確立した【4重防御エンジン】
（ControlNet幾何絶対拘束 ＋ 安全Denoise 0.46〜0.50 ＋ 部位別ティント ＋ 特化ネガティブ）
が、異なる間取り・異なる天井高・異なる空間構成の施工実例においても
100%普遍的に再現し、ハルシネーションゼロ・素材変革を両立できるかを徹底実証する。

【検証対象実例】
1. Case 1: 鶴ヶ島市 S様邸（天井高2.8m・無垢杉床・大空間22帖LDK）
2. Case 4: 日高市 I様邸（アイランドキッチン・大開口サッシ・直線モダン）
3. Case 6: 行田市 H様邸（勾配天井・登り梁・2階大空間LDK）
"""

import os
import sys
import json
import time
import base64
import urllib.request
import numpy as np
from io import BytesIO
from PIL import Image, ImageFilter

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity"
OUT_DIR = os.path.join(BASE_DIR, "public", "renders", "selftest_multicase")
os.makedirs(OUT_DIR, exist_ok=True)

GPU_URL = "http://192.168.11.104:7861"
TARGET_W = 960
TARGET_H = 640

def to_base64(im):
    buf = BytesIO()
    im.save(buf, format="JPEG", quality=95)
    return base64.b64encode(buf.getvalue()).decode("utf-8")

# 共通ネガティブプロンプト
NEGATIVE_BASE = (
    "(stairs, staircase, steps, ladder, wooden staircase, spiral stairs, attic steps:2.2), "
    "(clutter, trash, boxes, wires, mess, unorganized, cheap furniture, plastic:1.5), "
    "(step, raised floor, skip floor, tatami corner:1.6), "
    "(people, human, person:1.4), "
    "hallucination, distorted architecture, floating objects, crooked lines, blurry, low quality, cgi, 3d render look"
)

NEGATIVE_EMPTY = (
    "(furniture, sofa, couch, dining table, chairs, table, bench, rug, carpet, mat, coffee table:1.9), "
    + NEGATIVE_BASE
)

# 各実例の定義
CASES = [
    {
        "case_id": "case1",
        "name": "鶴ヶ島市 S様邸",
        "src_photo": os.path.join(BASE_DIR, "public", "images", "cases_real", "case1", "photo_01.jpg"),
        "features": "天井高2.8m・無垢杉床・22帖大空間LDK",
        "tests": [
            {
                "id": "case1_base_day",
                "title": "Case1: 天井高2.8m × 昼の自然光（骨格完全固定・家具なし）",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty unfurnished expansive living room and dining room, Japanese contemporary residence, "
                    "impressive high ceiling 2.8m, seamless solid cedar hardwood flooring, "
                    "pure clean white diatomaceous plaster walls, open kitchen counter on far wall, "
                    "bright morning sun streaming in from large windows, architectural digest photo, Nikon D700, 8k"
                ),
                "negative": NEGATIVE_EMPTY,
                "denoise": 0.48, "cn_weight": 0.90, "tint_floor": False
            },
            {
                "id": "case1_dark_walnut",
                "title": "Case1: 床材ダークウォールナット化（ティント前処理併用）",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty unfurnished living room, contemporary residence, high ceiling 2.8m, "
                    "rich dark espresso walnut solid hardwood flooring with deep chocolate tones and smooth satin finish, "
                    "matching dark wood baseboards, pure clean white diatomaceous plaster walls, "
                    "open kitchen counter on far wall, completely empty floor, architectural digest photo, 8k"
                ),
                "negative": "(light pale blonde yellow floor:2.0), " + NEGATIVE_EMPTY,
                "denoise": 0.48, "cn_weight": 0.90, "tint_floor": True
            },
            {
                "id": "case1_twilight",
                "title": "Case1: 夕景トワイライト × 2700Kコーブ間接照明",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty unfurnished living room at twilight golden hour dusk, peaceful evening atmosphere, "
                    "deep navy blue twilight sky visible through patio windows, "
                    "warm 2700K indirect cove lighting illuminating the high ceiling 2.8m and plaster walls, "
                    "solid cedar hardwood floor with warm reflections, architectural digest photo, 8k"
                ),
                "negative": "(bright midday sun, daylight:1.8), " + NEGATIVE_EMPTY,
                "denoise": 0.52, "cn_weight": 0.90, "tint_floor": False
            }
        ]
    },
    {
        "case_id": "case4",
        "name": "日高市 I様邸",
        "src_photo": os.path.join(BASE_DIR, "public", "images", "cases_real", "case4", "photo_01.jpg"),
        "features": "アイランドキッチン・大開口サッシ・直線美モダン",
        "tests": [
            {
                "id": "case4_base_day",
                "title": "Case4: アイランドキッチン × 昼景（骨格完全固定・家具なし）",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty unfurnished modern minimalist living room and dining room, "
                    "clean open concept island kitchen counter in center, broad solid hardwood flooring, "
                    "pure white plaster walls, floor-to-ceiling glass sliding patio doors, "
                    "bright soft daylight, crisp focus, architectural digest photo, 8k"
                ),
                "negative": NEGATIVE_EMPTY,
                "denoise": 0.48, "cn_weight": 0.90, "tint_floor": False
            },
            {
                "id": "case4_wall_tiles",
                "title": "Case4: アクセント壁 大判グレーストーンタイル化",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty unfurnished modern living room, island kitchen, "
                    "(luxurious large-format textured matte grey stone tiles on the accent feature wall:1.8), "
                    "pure white plaster walls, solid hardwood flooring, clean glass windows, architectural digest photo, 8k"
                ),
                "negative": "(wooden wall, plain wallpaper:1.8), " + NEGATIVE_EMPTY,
                "denoise": 0.52, "cn_weight": 0.92, "tint_floor": False
            },
            {
                "id": "case4_twilight",
                "title": "Case4: 夕景トワイライト × 間接照明",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty unfurnished minimalist residence at twilight dusk, deep blue evening sky outside large glass doors, "
                    "warm 2700K ambient indirect cove lighting along the ceiling edge, island kitchen counter softly glowing, "
                    "stunning evening contrast, architectural digest photo, 8k"
                ),
                "negative": "(daylight, bright sun:1.8), " + NEGATIVE_EMPTY,
                "denoise": 0.52, "cn_weight": 0.90, "tint_floor": False
            }
        ]
    },
    {
        "case_id": "case6",
        "name": "行田市 H様邸",
        "src_photo": os.path.join(BASE_DIR, "public", "images", "cases_real", "case6", "photo_01.jpg"),
        "features": "勾配天井・登り梁・2階大空間LDK",
        "tests": [
            {
                "id": "case6_base_day",
                "title": "Case6: 勾配天井＆露出梁 × 昼景（骨格完全固定・家具なし）",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty unfurnished second-floor living room with magnificent vaulted sloped ceiling, "
                    "authentic exposed solid structural timber roof beams, pure white diatomaceous plaster ceiling and walls, "
                    "solid pine hardwood flooring, bright natural skylight, architectural digest photo, 8k"
                ),
                "negative": NEGATIVE_EMPTY,
                "denoise": 0.48, "cn_weight": 0.90, "tint_floor": False
            },
            {
                "id": "case6_dark_walnut",
                "title": "Case6: 床材ダークウォールナット化（ティント併用）",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty unfurnished second-floor living room with vaulted sloped ceiling and exposed roof beams, "
                    "rich dark espresso walnut solid hardwood flooring with deep chocolate tones, "
                    "pure white plaster walls, dramatic timber beams, architectural digest photo, 8k"
                ),
                "negative": "(light blonde yellow floor:2.0), " + NEGATIVE_EMPTY,
                "denoise": 0.48, "cn_weight": 0.90, "tint_floor": True
            },
            {
                "id": "case6_twilight",
                "title": "Case6: 勾配天井 夕景トワイライト × 露出梁の陰影",
                "prompt": (
                    "masterpiece, best quality, ultra-detailed architectural photography, "
                    "empty unfurnished living room with vaulted sloped ceiling at twilight dusk, "
                    "deep twilight blue evening sky through windows, warm 2700K indirect lighting casting dramatic shadows under exposed structural timber beams, "
                    "serene luxury Japanese residence at nightfall, architectural digest photo, 8k"
                ),
                "negative": "(daylight, bright sun:1.8), " + NEGATIVE_EMPTY,
                "denoise": 0.52, "cn_weight": 0.90, "tint_floor": False
            }
        ]
    }
]

def run_multicase_campaign():
    print("=" * 70)
    print("  住ま居る AIパース工房 - 他施工実例（Case 1, 4, 6）横断セルフテスト")
    print(f"  GPUワーカー接続先 : {GPU_URL}")
    print(f"  出力先ディレクトリ: {OUT_DIR}")
    print("=" * 70)

    summary_results = []

    for c in CASES:
        cid = c["case_id"]
        cname = c["name"]
        print(f"\n========================================================")
        print(f"  実例検証: 【{cname}】({c['features']})")
        print(f"  元写真: {c['src_photo']}")
        print(f"========================================================")

        if not os.path.exists(c["src_photo"]):
            print(f"  Error: {c['src_photo']} not found!")
            continue

        raw_im = Image.open(c["src_photo"]).convert("RGB").resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
        b64_orig = to_base64(raw_im)

        for test in c["tests"]:
            tid = test["id"]
            title = test["title"]
            denoise = test["denoise"]
            cn_w = test["cn_weight"]

            # 床ティントが必要な場合の前処理
            if test.get("tint_floor"):
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
                "prompt": test["prompt"],
                "negative_prompt": test["negative"],
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
                    summary_results.append({
                        "case_id": cid,
                        "case_name": cname,
                        "test_id": tid,
                        "title": title,
                        "filesize": len(img_bytes),
                        "elapsed": elapsed,
                        "status": "SUCCESS"
                    })
            except Exception as e:
                print(f"  -> [ERROR] ({tid}): {e}")
                summary_results.append({
                    "case_id": cid,
                    "case_name": cname,
                    "test_id": tid,
                    "error": str(e),
                    "status": "FAILED"
                })

    report_path = os.path.join(OUT_DIR, "multicase_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(summary_results, f, ensure_ascii=False, indent=2)
    print(f"\n横断セルフテスト全件完了！ レポート保存先: {report_path}")

if __name__ == "__main__":
    run_multicase_campaign()
