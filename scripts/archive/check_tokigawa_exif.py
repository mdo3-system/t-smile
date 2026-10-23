# -*- coding: utf-8 -*-
import os
from PIL import Image
from PIL.ExifTags import TAGS

case_dir = os.path.join('raw_source_cases', 'ときがわ町 K様邸')
rec_dir = os.path.join(case_dir, 'おすすめデータ')

files = [f for f in os.listdir(rec_dir) if f.lower().endswith(('.jpg', '.png'))][:10]

with open('scratch_tokigawa_exif.txt', 'w', encoding='utf-8') as out:
    for fname in files:
        fpath = os.path.join(rec_dir, fname)
        try:
            with Image.open(fpath) as img:
                w, h = img.size
                exif_data = img._getexif()
                camera = "Unknown"
                lens = "Unknown"
                focal = "Unknown"
                f_stop = "Unknown"
                iso = "Unknown"
                if exif_data:
                    for tag_id, value in exif_data.items():
                        tag = TAGS.get(tag_id, tag_id)
                        if tag == 'Model': camera = str(value).strip()
                        elif tag == 'LensModel': lens = str(value).strip()
                        elif tag == 'FocalLength': focal = str(value)
                        elif tag == 'FNumber': f_stop = f"F{float(value):.1f}"
                        elif tag == 'ISOSpeedRatings': iso = f"ISO {value}"
                out.write(f"File: {fname} | Size: {w}x{h} | Camera: {camera} | Lens: {lens} | Focal: {focal} | F-stop: {f_stop} | ISO: {iso}\n")
        except Exception as e:
            out.write(f"File: {fname} | Error: {e}\n")
