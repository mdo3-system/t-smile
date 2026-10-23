# -*- coding: utf-8 -*-
import os
import numpy as np
from PIL import Image, ImageFilter

BASE_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity"
EXTRACTED_DIR = os.path.join(BASE_DIR, "public", "renders", "controlnet_extracted", "ときがわ町 K様邸")
PHOTO_PATH = os.path.join(BASE_DIR, "raw_source_cases", "ときがわ町 K様邸", "外観", "DSC_8715.jpg")

TARGET_SIZE = (960, 640)

# Load real photo
real_img = Image.open(PHOTO_PATH).convert("RGB").resize(TARGET_SIZE, Image.Resampling.LANCZOS)
real_arr = np.array(real_img, dtype=np.float32)

# Load 3D model render (normal pass with sky blue bg)
model_img = Image.open(os.path.join(EXTRACTED_DIR, "exterior_normal.png")).convert("RGB").resize(TARGET_SIZE, Image.Resampling.LANCZOS)
model_arr = np.array(model_img, dtype=np.float32)

# Load depth map to create exact building mask
depth_img = Image.open(os.path.join(EXTRACTED_DIR, "exterior_depth.png")).convert("L").resize(TARGET_SIZE, Image.Resampling.LANCZOS)
depth_arr = np.array(depth_img)

# Building mask: wherever depth > 0 is the 3D building
building_mask = (depth_arr > 5).astype(np.float32)

# Smooth mask edge slightly (1px blur) to prevent hard seams
mask_img = Image.fromarray((building_mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
mask_arr = np.array(mask_img, dtype=np.float32) / 255.0
mask_3d = np.repeat(mask_arr[:, :, np.newaxis], 3, axis=2)

# Composite Day Base:
# Outside building = real photo (sky, mountains, gravel driveway, car area)
# Inside building = FBX 3D model (geometry, walls, roof, doors, windows)
comp_day_arr = real_arr * (1.0 - mask_3d) + model_arr * mask_3d
comp_day_img = Image.fromarray(np.clip(comp_day_arr, 0, 255).astype(np.uint8))

day_out = os.path.join(EXTRACTED_DIR, "master_hybrid_day_base.jpg")
comp_day_img.save(day_out, quality=95)
print(f"Master Hybrid Day Base saved: {day_out}")

# Composite Twilight Base:
# Dim the real photo background, give sky twilight gradient, warm up porch
h, w, _ = real_arr.shape
twilight_bg = real_arr.copy()
for y in range(h):
    factor = y / h
    # Darken sky and shift to twilight indigo/amber
    twilight_bg[y, :, 0] = twilight_bg[y, :, 0] * 0.35 + 30 * (1 - factor) + 120 * factor
    twilight_bg[y, :, 1] = twilight_bg[y, :, 1] * 0.35 + 25 * (1 - factor) + 60 * factor
    twilight_bg[y, :, 2] = twilight_bg[y, :, 2] * 0.50 + 70 * (1 - factor) + 20 * factor

# Warm 3D building slightly for twilight
model_twilight = model_arr.copy()
model_twilight[:, :, 0] = np.clip(model_twilight[:, :, 0] * 1.05 + 15, 0, 255)
model_twilight[:, :, 1] = np.clip(model_twilight[:, :, 1] * 0.95 + 5, 0, 255)
model_twilight[:, :, 2] = np.clip(model_twilight[:, :, 2] * 0.75, 0, 255)

comp_twi_arr = twilight_bg * (1.0 - mask_3d) + model_twilight * mask_3d
comp_twi_img = Image.fromarray(np.clip(comp_twi_arr, 0, 255).astype(np.uint8))

twi_out = os.path.join(EXTRACTED_DIR, "master_hybrid_twilight_base.jpg")
comp_twi_img.save(twi_out, quality=95)
print(f"Master Hybrid Twilight Base saved: {twi_out}")
