# -*- coding: utf-8 -*-
"""
scripts/replace_ai_images_with_real.py
AI生成画像を sample_data/others の本物実邸写真にWebP変換＆置換
"""
import os
import shutil
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OTHERS_DIR = os.path.join(BASE_DIR, 'sample_data', 'others')
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
IMAGES_DIR = os.path.join(PUBLIC_DIR, 'images')
CASES_DIR = os.path.join(IMAGES_DIR, 'cases')

# Mapping for public/images/
ROOT_MAP = {
    'hero_architecture': 'exterior (2).jpg',
    'hero_kaguya_house': 'tokigawa02.jpg',
    'craftsman_architect_tag': 'interior_l (18).jpg',
    'heat20_insulation_structure': 'interior_l (5).JPG',
    'structural_calculation_frame': 'interior_l (17).jpg',
    'natural_interior_aroma': 'interior_l (10).jpg',
    'floor_heating_comfort': 're03.jpg',
    'artisan_custom_bath': 'bath (10).jpg'
}

# Mapping for public/images/cases/
CASES_MAP = {
    'case1_kitchen': 'k_dining.jpg',
    'case1_living': 'interior_l (18).jpg',
    'case2_woodstove_living': 'interior_l (5).JPG',
    'case3_garage_living': 'renov01.jpg',
    'case4_washitsu_living': 'promo105.jpg',
    'case6_library_stair': 'propose (11).JPG',
    'custom_tv_board_zataku': 'promo130.jpg',
    'sunken_living_white_tile': 'interior_l (16).jpg'
}

def process_and_save(src_path, dst_dir, base_name, max_dim=1920, quality=88):
    os.makedirs(dst_dir, exist_ok=True)
    with Image.open(src_path) as img:
        img = img.convert('RGB')
        w, h = img.size
        # Resize if larger than max_dim
        if max(w, h) > max_dim:
            if w >= h:
                new_w = max_dim
                new_h = int(h * (max_dim / w))
            else:
                new_h = max_dim
                new_w = int(w * (max_dim / h))
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            print(f"  Resized {os.path.basename(src_path)} from {w}x{h} to {new_w}x{new_h}")
        else:
            print(f"  Preserved resolution {w}x{h}")
        
        # Save as WebP
        webp_path = os.path.join(dst_dir, f"{base_name}.webp")
        img.save(webp_path, 'WEBP', quality=quality, method=6)
        
        # Also save as JPG for backwards compatibility
        jpg_path = os.path.join(dst_dir, f"{base_name}.jpg")
        img.save(jpg_path, 'JPEG', quality=90, optimize=True)
        
        print(f"  Saved -> {webp_path} ({os.path.getsize(webp_path)//1024} KB) & {jpg_path} ({os.path.getsize(jpg_path)//1024} KB)")

print("=== REPLACING ROOT IMAGES ===")
for base, src_name in ROOT_MAP.items():
    src_file = os.path.join(OTHERS_DIR, src_name)
    if os.path.exists(src_file):
        print(f"Processing root image: {base} <= {src_name}")
        process_and_save(src_file, IMAGES_DIR, base)
    else:
        print(f"[ERROR] Source not found: {src_file}")

print("\n=== REPLACING CASES IMAGES ===")
for base, src_name in CASES_MAP.items():
    src_file = os.path.join(OTHERS_DIR, src_name)
    if os.path.exists(src_file):
        print(f"Processing cases image: {base} <= {src_name}")
        process_and_save(src_file, CASES_DIR, base)
    else:
        print(f"[ERROR] Source not found: {src_file}")

print("\n[COMPLETE] All target AI images have been replaced with real photographs from sample_data/others!")
