# -*- coding: utf-8 -*-
"""
scripts/build_clean_controlnet_assets.py
バンディング（段差ノイズ）やテクスチャノイズを完全に排除し、
フルフラットな無垢床・壁・建具枠・サッシ・対面キッチン設備のみを
正確に抽出したControlNetアセット（Canny & Depth）を作成する。
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

BASE_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity"
EXTRACTED_DIR = os.path.join(BASE_DIR, "public", "renders", "controlnet_extracted", "ときがわ町 K様邸")

TARGET_W = 960
TARGET_H = 640

def build_assets():
    print("1. フルフラットLDK高精度構造エッジ（Canny用）の構築...")
    edge_canvas = Image.new("L", (TARGET_W, TARGET_H), 0)
    draw_e = ImageDraw.Draw(edge_canvas)
    
    # (1) 天井と壁の境界線（入隅）
    # 左壁と天井
    draw_e.line([(0, 68), (360, 185)], fill=255, width=2)
    # 正面奥壁と天井
    draw_e.line([(360, 185), (610, 185)], fill=255, width=2)
    # 右壁と天井
    draw_e.line([(TARGET_W, 68), (610, 185)], fill=255, width=2)
    
    # (2) 床と壁の境界線（壁際巾木ライン）- フルフラットな床を保証（段差横線は一切引かない）
    # 左壁の裾（手前掃き出し窓下から奥の入隅へ）
    draw_e.line([(0, 600), (175, 470)], fill=255, width=2)
    # 左奥の壁裾（高窓の下の壁際）
    draw_e.line([(175, 470), (415, 470)], fill=255, width=2)
    # 対面キッチン腰壁の裾
    draw_e.line([(415, 470), (615, 470)], fill=255, width=2)
    # 右壁の裾（廊下ドア前から手前吉野杉壁下へ）
    draw_e.line([(615, 470), (TARGET_W, 600)], fill=255, width=2)
    
    # (3) 天井吹抜け開口部（木製化粧梁枠）
    draw_e.polygon([
        (115, 68), (460, 140), (300, 15), (115, 68)
    ], outline=255, width=2)
    
    # (4) 左奥の横長高窓サッシ枠
    draw_e.rectangle([230, 220, 365, 320], outline=255, width=2)
    draw_e.line([(297, 220), (297, 320)], fill=255, width=1)
    
    # (5) 左手前の大開口掃き出し窓枠
    draw_e.line([(0, 110), (135, 160)], fill=255, width=2)
    draw_e.line([(135, 160), (120, 520)], fill=255, width=2)
    
    # (6) 対面キッチンカウンター
    # カウンター上部開口天板
    draw_e.line([(415, 230), (615, 230)], fill=255, width=2)
    # カウンター腰壁天板（笠木）
    draw_e.line([(415, 310), (615, 310)], fill=255, width=3)
    # カウンター左袖壁（垂直線）
    draw_e.line([(415, 230), (415, 470)], fill=255, width=2)
    
    # (7) 右側の建具枠（引き戸）と吉野杉板壁の見切り
    draw_e.line([(735, 125), (735, 570)], fill=255, width=2)
    draw_e.line([(735, 125), (TARGET_W, 68)], fill=255, width=2)
    # 廊下のドア枠
    draw_e.rectangle([615, 225, 670, 465], outline=255, width=2)
    
    clean_edges_path = os.path.join(EXTRACTED_DIR, "ldk_precision_edges.png")
    edge_canvas.save(clean_edges_path)
    print(f"  -> Precision Flat Floor Edges saved: {clean_edges_path}")

    # 2. 完全フルフラット連続遠近深度マップの構築
    print("2. 完全フルフラット連続深度マップの構築...")
    depth_arr = np.zeros((TARGET_H, TARGET_W), dtype=np.float32)
    
    # 床面は y: 470 が奥の最深部、y: 640 が手前最前面
    for y in range(TARGET_H):
        for x in range(TARGET_W):
            # フルフラット床面 (y >= 470)
            if y >= 470:
                # 奥 (y=470) が 90、手前 (y=640) が 255 の滑らかな単調増加
                dist = (y - 470.0) / (TARGET_H - 470.0)
                depth_arr[y, x] = 90.0 + dist * 165.0
            # 天井面 (y <= 185)
            elif y <= 185:
                dist = (185.0 - y) / 185.0
                depth_arr[y, x] = 90.0 + dist * 150.0
            # 壁面 (185 < y < 470)
            else:
                dist_x = abs(x - 510.0) / (TARGET_W * 0.5)
                depth_arr[y, x] = 70.0 + dist_x * 120.0

    # 対面キッチンカウンター領域の微小な立体感（カウンター腰壁）
    for y in range(310, 470):
        for x in range(415, 615):
            depth_arr[y, x] = np.clip(depth_arr[y, x] + 25.0, 0, 255)
            
    depth_img = Image.fromarray(np.clip(depth_arr, 0, 255).astype(np.uint8))
    depth_img = depth_img.filter(ImageFilter.GaussianBlur(radius=8))
    
    clean_depth_path = os.path.join(EXTRACTED_DIR, "ldk_smooth_depth.png")
    depth_img.save(clean_depth_path)
    print(f"  -> Smooth Flat Depth Map saved: {clean_depth_path}")
    
    return clean_edges_path, clean_depth_path

if __name__ == "__main__":
    build_assets()
