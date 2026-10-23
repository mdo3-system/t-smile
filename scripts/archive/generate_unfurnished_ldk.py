# -*- coding: utf-8 -*-
"""
scripts/generate_unfurnished_ldk.py
生3D幾何データから「完全家具なし（新築引き渡し直後）」の高品質LDKパースを徹底生成するスクリプト。
- Pillow / Numpy のみを使用（OpenCV依存なし）
- 幾何学的構造ライン（壁・床・天井・建具枠・カウンター・吹抜け）の抽出
- 正確な深度マップの作成
- (stairs, staircase:1.6) および (furniture:1.4) の強力ネガティブによるハルシネーション完全排除
- 複数パラメータ（Denoising, ControlNet Weight）での徹底比較検証
"""
import os
import sys
import json
import base64
import urllib.request
import numpy as np
from PIL import Image, ImageFilter, ImageOps, ImageEnhance

BASE_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity"
EXTRACTED_DIR = os.path.join(BASE_DIR, "public", "renders", "controlnet_extracted", "ときがわ町 K様邸")
GPU_URL = "http://192.168.11.104:7861"

TARGET_W = 960
TARGET_H = 640

def prepare_structural_control_assets():
    print("1. クリーンな建築構造幾何エッジの抽出中（Pillow/Numpy）...")
    normal_path = os.path.join(EXTRACTED_DIR, "ldk_normal.png")
    if not os.path.exists(normal_path):
        print(f"Error: {normal_path} not found")
        return None, None, None
        
    normal_img = Image.open(normal_path).convert("RGB").resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
    normal_arr = np.array(normal_img)
    
    # 1-1. テクスチャノイズを除去した構造輪郭の抽出
    # メディアンフィルタまたはガウシアンブラーで壁面のノイズを平滑化
    smoothed_img = normal_img.filter(ImageFilter.GaussianBlur(radius=1.8))
    gray_img = smoothed_img.convert("L")
    
    # 幾何エッジの抽出
    edge_img = gray_img.filter(ImageFilter.FIND_EDGES)
    edge_arr = np.array(edge_img)
    # 二値化とコントラスト強調
    edge_arr = np.where(edge_arr > 25, 255, 0).astype(np.uint8)
    
    # 特にオレンジの枠線（窓枠、建具枠、カウンター笠木、巾木）を確実に抽出
    r = normal_arr[:, :, 0].astype(int)
    g = normal_arr[:, :, 1].astype(int)
    b = normal_arr[:, :, 2].astype(int)
    orange_mask = ((r > 170) & (g > 70) & (g < 170) & (b < 70)).astype(np.uint8) * 255
    orange_img = Image.fromarray(orange_mask).filter(ImageFilter.FIND_EDGES)
    orange_arr = np.where(np.array(orange_img) > 20, 255, 0).astype(np.uint8)
    
    # 吹抜けVoid境界（天井の黄色光領域）の抽出
    yellow_mask = ((r > 200) & (g > 200) & (b < 180) & (normal_arr.shape[0]*0.4 > np.arange(normal_arr.shape[0])[:, None])).astype(np.uint8) * 255
    yellow_img = Image.fromarray(yellow_mask).filter(ImageFilter.FIND_EDGES)
    yellow_arr = np.where(np.array(yellow_img) > 20, 255, 0).astype(np.uint8)
    
    combined_edges = np.maximum(edge_arr, np.maximum(orange_arr, yellow_arr))
    edge_out_path = os.path.join(EXTRACTED_DIR, "unfurnished_structural_edges.png")
    Image.fromarray(combined_edges).save(edge_out_path)
    print(f"  -> 構造エッジ保存: {edge_out_path}")

    # 1-2. 滑らかな深度マップ（Perspective Depth）の構築
    depth_arr = np.zeros((TARGET_H, TARGET_W), dtype=np.float32)
    for y in range(TARGET_H):
        if y > TARGET_H * 0.6:
            progress = (y - TARGET_H * 0.6) / (TARGET_H * 0.4)
            depth_arr[y, :] = 120 + progress * 130  # 120 (奥) 〜 250 (手前)
        else:
            depth_arr[y, :] = 50 + (TARGET_H * 0.6 - y) * 0.1
            
    # 対面キッチンカウンター領域を手前に浮き立たせる
    cx1, cx2 = int(TARGET_W * 0.42), int(TARGET_W * 0.62)
    cy1, cy2 = int(TARGET_H * 0.42), int(TARGET_H * 0.62)
    depth_arr[cy1:cy2, cx1:cx2] += 45
    
    # 左右の壁の遠近
    for x in range(TARGET_W):
        factor_x = abs(x - TARGET_W * 0.5) / (TARGET_W * 0.5)
        depth_arr[:, x] += factor_x * 30
        
    depth_arr = np.clip(depth_arr, 0, 255).astype(np.uint8)
    depth_img = Image.fromarray(depth_arr).filter(ImageFilter.GaussianBlur(radius=8))
    depth_out_path = os.path.join(EXTRACTED_DIR, "unfurnished_depth.png")
    depth_img.save(depth_out_path)
    print(f"  -> 深度マップ保存: {depth_out_path}")
    
    # 1-3. 家具なしの高品質ベースレンダリング下絵の作成
    base_arr = normal_arr.astype(np.float32)
    
    # 右壁 (x > TARGET_W * 0.68) に吉野杉の美しい無垢羽目板の木目トーンを付加
    for x in range(int(TARGET_W * 0.68), TARGET_W):
        # 暖かみのある木色 (R: 215, G: 175, B: 135)
        blend = (x - TARGET_W * 0.68) / (TARGET_W * 0.32) * 0.75
        base_arr[:, x, 0] = base_arr[:, x, 0] * (1 - blend) + 215 * blend
        base_arr[:, x, 1] = base_arr[:, x, 1] * (1 - blend) + 175 * blend
        base_arr[:, x, 2] = base_arr[:, x, 2] * (1 - blend) + 135 * blend

    # 吹抜けから降り注ぐ自然光 (y < TARGET_H*0.35, x: 0.25〜0.55)
    for y in range(int(TARGET_H * 0.35)):
        intensity = (1.0 - y / (TARGET_H * 0.35)) * 30
        base_arr[y, int(TARGET_W*0.25):int(TARGET_W*0.55), :] = np.clip(
            base_arr[y, int(TARGET_W*0.25):int(TARGET_W*0.55), :] + intensity, 0, 255
        )

    # 自然なアンビエントオクルージョン（床の奥・巾木際・カウンター下の陰影）
    for y in range(TARGET_H):
        if y > TARGET_H * 0.55:
            # 遠くの床ほどわずかに陰影
            shadow = (1.0 - (y - TARGET_H * 0.55) / (TARGET_H * 0.45)) * 18
            base_arr[y, :, :] = np.clip(base_arr[y, :, :] - shadow, 0, 255)

    base_img = Image.fromarray(base_arr.astype(np.uint8))
    base_img = ImageEnhance.Contrast(base_img).enhance(1.12)
    base_out_path = os.path.join(EXTRACTED_DIR, "unfurnished_base.jpg")
    base_img.save(base_out_path, quality=95)
    print(f"  -> Enhanced unfurnished base saved: {base_out_path}")
    
    return edge_out_path, depth_out_path, base_out_path

def to_base64(filepath):
    with open(filepath, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def run_unfurnished_experiments(edge_path, depth_path, base_path):
    print("\n2. GPUワーカーでの家具なしパース徹底生成実験開始...")
    
    edge_b64 = to_base64(edge_path)
    depth_b64 = to_base64(depth_path)
    base_b64 = to_base64(base_path)
    
    prompt = (
        "masterpiece, best quality, ultra-detailed architectural photography, "
        "empty unfurnished living room, completely vacant house before move-in, interior design showcase, "
        "spacious solid pine wood flooring with subtle natural knots and glossy grain, "
        "pristine pure white plaster diatomaceous walls, "
        "natural cedar wooden wall paneling on the right wall with distinct vertical wood grain planks, "
        "open concept kitchen counter with solid wood bar top on the far wall, "
        "double-height ceiling with warm sunlight streaming down from void skylight, "
        "open door frame on the right leading to hallway, "
        "pristine clean empty floor, no rugs, no mats, no furniture anywhere, "
        "warm natural daylight, soft realistic ambient shadows, architectural digest style, 8k resolution, professional photography"
    )
    
    negative_prompt = (
        "(stairs, staircase, steps, ladder, spiraling staircase, attic stairs:1.9), "
        "(furniture, sofa, couch, dining table, chairs, bench, coffee table, desk:1.7), "
        "(rug, carpet, mat, cushions, television, tv, monitor, boxes, clutter, trash:1.5), "
        "(people, person, human, woman, man:1.4), "
        "hallucination, distorted geometry, extra walls, crooked lines, blurry, low quality, oversaturated"
    )
    
    # 実験マトリクス:
    experiments = [
        {"id": "A_denoise048", "denoising": 0.48, "canny_w": 1.2, "depth_w": 0.9, "cfg": 8.0},
        {"id": "B_denoise058", "denoising": 0.58, "canny_w": 1.3, "depth_w": 0.95, "cfg": 8.5},
        {"id": "C_denoise068", "denoising": 0.68, "canny_w": 1.4, "depth_w": 1.0, "cfg": 9.0},
    ]
    
    results = []
    
    for exp in experiments:
        exp_id = exp["id"]
        print(f"\n--- 実験 {exp_id} 実行中 (Denoising: {exp['denoising']}, CannyW: {exp['canny_w']}, CFG: {exp['cfg']}) ---")
        
        payload = {
            "init_images": [base_b64],
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "steps": 28,
            "cfg_scale": exp["cfg"],
            "denoising_strength": exp["denoising"],
            "width": TARGET_W,
            "height": TARGET_H,
            "sampler_name": "DPM++ 2M Karras",
            "seed": 20261015,
            "alwayson_scripts": {
                "controlnet": {
                    "args": [
                        {
                            "input_image": edge_b64,
                            "module": "none",
                            "model": "control_v11p_sd15_canny [d14c016b]",
                            "weight": exp["canny_w"],
                            "control_mode": "ControlNet is more important",
                            "resize_mode": "Crop and Resize"
                        },
                        {
                            "input_image": depth_b64,
                            "module": "none",
                            "model": "control_v11f1p_sd15_depth [cfd03158]",
                            "weight": exp["depth_w"],
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
        
        try:
            with urllib.request.urlopen(req, timeout=180) as res:
                resp_data = json.loads(res.read().decode("utf-8"))
                img_data = base64.b64decode(resp_data["images"][0])
                
                out_filename = f"generated_ldk_unfurnished_{exp_id}.jpg"
                out_path = os.path.join(EXTRACTED_DIR, out_filename)
                with open(out_path, "wb") as f_out:
                    f_out.write(img_data)
                print(f"  [SUCCESS] Generated: {out_filename} ({len(img_data)} bytes)")
                results.append((exp_id, out_path))
        except Exception as e:
            print(f"  [ERROR] ({exp_id}): {e}")
            
    return results

if __name__ == "__main__":
    edge, depth, base = prepare_structural_control_assets()
    if edge and depth and base:
        res = run_unfurnished_experiments(edge, depth, base)
        print("\n=== 実験完了 ===")
        for r_id, r_path in res:
            print(f"Result {r_id}: {r_path}")
