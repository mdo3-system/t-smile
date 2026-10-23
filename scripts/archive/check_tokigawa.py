# -*- coding: utf-8 -*-
import os

case_dir = os.path.join('raw_source_cases', 'ときがわ町 K様邸')
subdirs = [d for d in os.listdir(case_dir) if os.path.isdir(os.path.join(case_dir, d))]

with open('scratch_tokigawa_subdirs.txt', 'w', encoding='utf-8') as f:
    for d in subdirs:
        imgs = [x for x in os.listdir(os.path.join(case_dir, d)) if x.lower().endswith(('.jpg', '.png'))]
        f.write(f"{d} : {len(imgs)} 枚\n")
