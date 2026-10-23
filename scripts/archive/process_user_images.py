import os
from PIL import Image, ImageEnhance

os.makedirs('public/images', exist_ok=True)

# 1. DSC_1378.JPG (Top page garden exterior)
print("Processing DSC_1378.JPG...")
img_dsc = Image.open('sample_data/others/DSC_1378.JPG')
# Adjust brightness and contrast slightly to make garden trees and lawn look fresh and luminous
enhancer = ImageEnhance.Brightness(img_dsc)
img_dsc_bright = enhancer.enhance(1.08)
enhancer_c = ImageEnhance.Contrast(img_dsc_bright)
img_dsc_final = enhancer_c.enhance(1.05)
enhancer_s = ImageEnhance.Color(img_dsc_final)
img_dsc_final = enhancer_s.enhance(1.1)

# Resize maintaining aspect ratio
target_w = 1920
target_h = int(img_dsc_final.height * (target_w / img_dsc_final.width))
img_dsc_resized = img_dsc_final.resize((target_w, target_h), Image.Resampling.LANCZOS)
img_dsc_resized.save('public/images/kaguya_real_garden_facade.webp', 'WEBP', quality=90)
img_dsc_resized.save('public/images/kaguya_real_garden_facade.jpg', 'JPEG', quality=90)
print("Saved public/images/kaguya_real_garden_facade.webp & .jpg")


# 2. kaguya.jpg (Model house unified image for catalog and site)
print("Processing kaguya.jpg...")
img_kaguya = Image.open('sample_data/others/kaguya.jpg')
# Enhance color and clarity
enhancer_c = ImageEnhance.Contrast(img_kaguya)
img_kaguya_final = enhancer_c.enhance(1.04)
enhancer_s = ImageEnhance.Color(img_kaguya_final)
img_kaguya_final = enhancer_s.enhance(1.05)

# Save as modelhouse_kaguya
img_kaguya_final.save('public/images/modelhouse_kaguya.webp', 'WEBP', quality=92)
img_kaguya_final.save('public/images/modelhouse_kaguya.jpg', 'JPEG', quality=92)

# ALSO overwrite hero_kaguya_house.webp & .jpg so all references to hero_kaguya_house display this modelhouse exterior
# We resize to 1920 wide for optimal web use
kw = 1920
kh = int(img_kaguya_final.height * (kw / img_kaguya_final.width))
img_kaguya_1920 = img_kaguya_final.resize((kw, kh), Image.Resampling.LANCZOS)
img_kaguya_1920.save('public/images/hero_kaguya_house.webp', 'WEBP', quality=92)
img_kaguya_1920.save('public/images/hero_kaguya_house.jpg', 'JPEG', quality=92)
print("Saved public/images/modelhouse_kaguya and overwritten hero_kaguya_house")


# 3. kozo.jpg (Structural calculation timber frame)
print("Processing kozo.jpg...")
img_kozo = Image.open('sample_data/others/kozo.jpg')
enhancer_b = ImageEnhance.Brightness(img_kozo)
img_kozo_b = enhancer_b.enhance(1.05)
enhancer_c = ImageEnhance.Contrast(img_kozo_b)
img_kozo_final = enhancer_c.enhance(1.05)

zw = 1920
zh = int(img_kozo_final.height * (zw / img_kozo_final.width))
img_kozo_resized = img_kozo_final.resize((zw, zh), Image.Resampling.LANCZOS)
img_kozo_resized.save('public/images/structural_calculation_frame.webp', 'WEBP', quality=90)
img_kozo_resized.save('public/images/structural_calculation_frame.jpg', 'JPEG', quality=90)
img_kozo_resized.save('public/images/structure_kozo.webp', 'WEBP', quality=90)
img_kozo_resized.save('public/images/structure_kozo.jpg', 'JPEG', quality=90)
print("Saved public/images/structural_calculation_frame and structure_kozo")
