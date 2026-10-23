# -*- coding: utf-8 -*-
"""
scripts/selftest_five_pillars_campaign.py
=========================================
【AIパース工房・実用化セルフテスト：5大確立マトリクス】
素人ユーザーがUI上で押す「プリセット・ボタン」の裏側で確実に機能する、
堅牢なプロンプト構文とControlNet設定を5つの軸で徹底検証・確立するスクリプト。

【5大確立テストの対象】
1. Pillar 1: 【骨格絶対固定・完全家具なし（ベースライン）】
   - 吹抜け・対面キッチン・吉野杉板壁・パイン床の幾何完全固定（ハルシネーション階段ゼロ）
2. Pillar 2: 【ボタン：壁面素材チェンジ（吉野杉板壁 ➜ 大判グレーストーンタイル/エコカラット）】
   - 右壁のみをタイルに変更。構造・開口枠・キッチン笠木は1ミリも歪ませない
3. Pillar 3: 【ボタン：床材カラーチェンジ（ナチュラルパイン ➜ ダークウォールナット・シック）】
   - 床材と木枠のみを深みのあるダークトーンに変更。漆喰白壁とのハイコントラスト
4. Pillar 4: 【ボタン：時間帯・照明チェンジ（トワイライト夕暮れ ＆ 2700K間接照明）】
   - 吹抜けの夕陽の筋＋室内コーブ照明の陰影。内装材の質感を維持した光制御
5. Pillar 5: 【ボタン：インテリア配置（家具なし ➜ ジャパンディ・ミニマル家具配置）】
   - 造作対面キッチンや窓位置を一切壊さず、自然なスケール感でローソファ等を配置
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
OUTPUT_DIR = os.path.join(EXTRACTED_DIR, "selftest_five_pillars")
os.makedirs(OUTPUT_DIR, exist_ok=True)

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

print(f"Loading base structural assets...")
b64_base = to_base64_jpeg(base_path)
b64_edge = to_base64_png(edge_path)
b64_depth = to_base64_png(depth_path)

# 基本共通のネガティブプロンプト（ハルシネーション防止）
BASE_NEGATIVE_EMPTY = (
    "(stairs, staircase, steps, ladder, wooden staircase, spiral stairs, attic steps:2.2), "
    "(furniture, sofa, couch, dining table, chairs, table, bench, rug, carpet, mat, coffee table:1.9), "
    "(tv, television, electronics, clutter, trash, boxes:1.5), "
    "(step, raised floor, skip floor, tatami corner:1.6), "
    "(people, human, person:1.4), "
    "hallucination, distorted architecture, floating objects, crooked lines, blurry, low quality, cgi, 3d render look"
)

BASE_NEGATIVE_FURNISHED = (
    "(stairs, staircase, steps, ladder, wooden staircase, spiral stairs, attic steps:2.2), "
    "(clutter, trash, boxes, wires, mess, unorganized, cheap furniture, plastic:1.5), "
    "(step, raised floor, skip floor, tatami corner:1.6), "
    "(people, human, person:1.4), "
    "hallucination, distorted architecture, floating objects, crooked lines, blurry, low quality, cgi, 3d render look"
)

# 5大確立テストのテストケース定義
PILLARS = [
    {
        "pillar_id": 1,
        "name": "Pillar1_Baseline_Unfurnished",
        "title": "第1軸【骨格絶対固定・完全家具なし（ベースライン）】",
        "description": "家具完全ゼロ、階段捏造ゼロ。パイン無垢床、珪藻土白壁、吉野杉羽目板壁、対面キッチンの完璧な幾何固定。",
        "prompt": (
            "masterpiece, best quality, ultra-detailed architectural photography, "
            "empty unfurnished living room and dining room, pristine completely vacant Japanese modern house before move-in, "
            "broad seamless solid pine wood flooring with smooth realistic natural wood grain texture and soft satin finish, "
            "pure clean white diatomaceous plaster walls, "
            "natural Yoshino cedar solid wood plank paneling on the right wall with distinct vertical grain, "
            "open concept kitchen counter with solid wood bar top on the far wall, "
            "timber-trimmed double-height ceiling void with soft bright natural skylight cascading down, "
            "large sliding glass patio doors on the left letting in gentle diffused garden daylight, "
            "completely empty clean floor, absolutely no furniture, no sofa, no table, no chairs, no rug, "
            "professional architectural digest photo, shot on Nikon D700, 16mm lens, crisp focus, 8k resolution, photorealistic"
        ),
        "negative_prompt": BASE_NEGATIVE_EMPTY,
        "variants": [
            {"id": "p1_v1_denoise044", "denoise": 0.44, "canny_w": 1.15, "depth_w": 0.90, "cfg": 8.0},
            {"id": "p1_v2_denoise048", "denoise": 0.48, "canny_w": 1.20, "depth_w": 0.95, "cfg": 8.5}
        ]
    },
    {
        "pillar_id": 2,
        "name": "Pillar2_Wall_Material_Tiles",
        "title": "第2軸【ボタン：壁面素材チェンジ（吉野杉板壁 ➜ 高級大判タイル）】",
        "description": "右壁を木製羽目板から高級大判ストーンタイル／エコカラットへ差し替え。対面キッチン笠木や窓枠は1mmも歪ませない。",
        "prompt": (
            "masterpiece, best quality, ultra-detailed architectural photography, "
            "empty unfurnished living room and dining room, pristine completely vacant Japanese modern house before move-in, "
            "broad seamless solid pine wood flooring with smooth realistic natural wood grain texture and soft satin finish, "
            "pure clean white diatomaceous plaster walls, "
            "luxurious modern accent wall on the right featuring large-format textured matte grey porcelain tiles and stone tile cladding with fine grout lines, "
            "open concept kitchen counter with solid wood bar top on the far wall, "
            "timber-trimmed double-height ceiling void with soft bright natural skylight cascading down, "
            "large sliding glass patio doors on the left letting in gentle diffused garden daylight, "
            "completely empty clean floor, absolutely no furniture, no sofa, no table, no chairs, no rug, "
            "professional architectural digest photo, shot on Nikon D700, 16mm lens, crisp focus, 8k resolution, photorealistic"
        ),
        "negative_prompt": (
            "(wood plank wall, wooden paneling on right wall:1.8), " + BASE_NEGATIVE_EMPTY
        ),
        "variants": [
            {"id": "p2_v1_denoise046", "denoise": 0.46, "canny_w": 1.15, "depth_w": 0.90, "cfg": 8.5},
            {"id": "p2_v2_denoise052", "denoise": 0.52, "canny_w": 1.25, "depth_w": 0.95, "cfg": 9.0}
        ]
    },
    {
        "pillar_id": 3,
        "name": "Pillar3_Floor_Color_DarkWalnut",
        "title": "第3軸【ボタン：床材カラーチェンジ（ナチュラル ➜ ダークウォールナット）】",
        "description": "床材と木枠のみを深みのあるシックなダークウォールナットに変更。珪藻土白壁との美しいコントラストと巾木ラインの維持。",
        "prompt": (
            "masterpiece, best quality, ultra-detailed architectural photography, "
            "empty unfurnished living room and dining room, pristine completely vacant Japanese modern house before move-in, "
            "rich dark walnut solid hardwood flooring with deep espresso brown tones, luxurious wood grain texture with elegant low-sheen satin finish, "
            "dark timber baseboards and dark wood trim accents, "
            "pure clean white diatomaceous plaster walls, "
            "natural cedar solid wood plank paneling on the right wall with warm tones, "
            "open concept kitchen counter with solid wood bar top on the far wall, "
            "timber-trimmed double-height ceiling void with soft bright natural skylight cascading down, "
            "large sliding glass patio doors on the left, "
            "completely empty clean floor, absolutely no furniture, no sofa, no table, no chairs, no rug, "
            "professional architectural digest photo, shot on Nikon D700, 16mm lens, crisp focus, 8k resolution, photorealistic"
        ),
        "negative_prompt": (
            "(light yellow pine floor, pale natural flooring:1.8), " + BASE_NEGATIVE_EMPTY
        ),
        "variants": [
            {"id": "p3_v1_denoise048", "denoise": 0.48, "canny_w": 1.20, "depth_w": 0.90, "cfg": 8.5},
            {"id": "p3_v2_denoise054", "denoise": 0.54, "canny_w": 1.25, "depth_w": 0.95, "cfg": 9.0}
        ]
    },
    {
        "pillar_id": 4,
        "name": "Pillar4_Lighting_Twilight_Evening",
        "title": "第4軸【ボタン：時間帯・照明チェンジ（トワイライト夕暮れ ＆ 2700K間接照明）】",
        "description": "夕暮れの藍色（トワイライトブルー）と吹抜けの夕陽の筋、2700K温白色コーブ間接照明のドラマチックな光と影。",
        "prompt": (
            "masterpiece, best quality, ultra-detailed architectural photography, "
            "empty unfurnished living room at twilight golden hour dusk, peaceful quiet evening atmosphere, "
            "deep twilight blue evening sky visible through the large sliding glass patio doors on the left, "
            "warm golden sunset rays slanting down from the double-height ceiling void skylight, "
            "luxurious 2700K warm white architectural cove indirect lighting gently illuminating the diatomaceous plaster ceiling and cedar wood wall, "
            "broad seamless solid pine wood flooring with warm ambient reflections, "
            "open concept kitchen counter softly illuminated on the far wall, "
            "completely empty clean floor, absolutely no furniture, no clutter, "
            "professional architectural digest twilight photo, shot on Nikon D700, 16mm lens, long exposure, crisp focus, 8k resolution, photorealistic"
        ),
        "negative_prompt": (
            "(bright midday sunlight, daylight, blue sunny sky:1.8), " + BASE_NEGATIVE_EMPTY
        ),
        "variants": [
            {"id": "p4_v1_denoise048", "denoise": 0.48, "canny_w": 1.20, "depth_w": 0.90, "cfg": 8.5},
            {"id": "p4_v2_denoise055", "denoise": 0.55, "canny_w": 1.25, "depth_w": 0.95, "cfg": 9.0}
        ]
    },
    {
        "pillar_id": 5,
        "name": "Pillar5_Interior_Japandi_Furnished",
        "title": "第5軸【ボタン：インテリア配置（家具なし ➜ ジャパンディスタイル家具配置）】",
        "description": "造作対面キッチンや羽目板壁を一切壊さず、低座ローソファ・無垢ローテーブル・ペンダント照明が自然に調和するインテリア配置。",
        "prompt": (
            "masterpiece, best quality, ultra-detailed architectural photography, "
            "beautifully furnished Japanese modern interior, Japandi style living room design showcase, "
            "tastefully placed low-profile minimalist fabric sofa in beige neutral tones, "
            "natural solid wood low coffee table, woven organic rug on the solid pine wood floor, "
            "open concept kitchen counter with solid wood bar top on the far wall, "
            "pure clean white diatomaceous plaster walls, "
            "natural Yoshino cedar solid wood plank paneling on the right wall with distinct vertical grain, "
            "timber-trimmed double-height ceiling void with soft natural skylight cascading down, "
            "large sliding glass patio doors on the left opening to serene outdoor garden, "
            "high-end interior design catalog, shot on Nikon D700, 16mm lens, perfectly staged, crisp focus, 8k resolution, photorealistic"
        ),
        "negative_prompt": BASE_NEGATIVE_FURNISHED,
        "variants": [
            {"id": "p5_v1_denoise044", "denoise": 0.44, "canny_w": 1.15, "depth_w": 0.90, "cfg": 8.0},
            {"id": "p5_v2_denoise050", "denoise": 0.50, "canny_w": 1.20, "depth_w": 0.95, "cfg": 8.5}
        ]
    }
]

def run_campaign():
    print("=" * 70)
    print("  住ま居る AIパース工房 - 5大確立セルフテスト・キャンペーン開始")
    print(f"  GPUワーカー接続先 : {GPU_URL}")
    print(f"  出力先ディレクトリ: {OUTPUT_DIR}")
    print("=" * 70)

    summary_log = []

    for pillar in PILLARS:
        p_id = pillar["pillar_id"]
        p_title = pillar["title"]
        print(f"\n========================================================")
        print(f"  [{p_id}/5] {p_title}")
        print(f"  目的: {pillar['description']}")
        print(f"========================================================")

        for var in pillar["variants"]:
            var_id = var["id"]
            denoise = var["denoise"]
            canny_w = var["canny_w"]
            depth_w = var["depth_w"]
            cfg = var["cfg"]

            print(f"\n--- 生成中: {var_id} (Denoise={denoise}, CannyW={canny_w}, DepthW={depth_w}, CFG={cfg}) ---")

            payload = {
                "init_images": [b64_base],
                "prompt": pillar["prompt"],
                "negative_prompt": pillar["negative_prompt"],
                "steps": 28,
                "cfg_scale": cfg,
                "denoising_strength": denoise,
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
                                "weight": canny_w,
                                "control_mode": "ControlNet is more important",
                                "resize_mode": "Crop and Resize"
                            },
                            {
                                "input_image": b64_depth,
                                "module": "none",
                                "model": "control_v11f1p_sd15_depth [cfd03158]",
                                "weight": depth_w,
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

            start_t = time.time()
            try:
                with urllib.request.urlopen(req, timeout=180) as res:
                    elapsed = time.time() - start_t
                    resp_data = json.loads(res.read().decode("utf-8"))
                    img_bytes = base64.b64decode(resp_data["images"][0])
                    
                    filename = f"{var_id}.jpg"
                    filepath = os.path.join(OUTPUT_DIR, filename)
                    with open(filepath, "wb") as f_out:
                        f_out.write(img_bytes)

                    print(f"  -> [SUCCESS] 保存完了: {filename} ({len(img_bytes):,} bytes, 所要時間: {elapsed:.1f}s)")
                    summary_log.append({
                        "pillar_id": p_id,
                        "pillar_title": p_title,
                        "variant_id": var_id,
                        "filename": filename,
                        "filesize": len(img_bytes),
                        "elapsed": elapsed,
                        "denoise": denoise,
                        "status": "SUCCESS"
                    })
            except Exception as e:
                print(f"  -> [ERROR] 生成失敗 ({var_id}): {e}")
                summary_log.append({
                    "pillar_id": p_id,
                    "pillar_title": p_title,
                    "variant_id": var_id,
                    "error": str(e),
                    "status": "FAILED"
                })

    # 結果レポートをJSONで保存
    report_path = os.path.join(OUTPUT_DIR, "selftest_campaign_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(summary_log, f, ensure_ascii=False, indent=2)
    print(f"\n全テスト完了！レポート保存先: {report_path}")

if __name__ == "__main__":
    run_campaign()
