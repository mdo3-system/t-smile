# -*- coding: utf-8 -*-
import os

out_dir = r"sample_data\LP"

texts = {
    # Horizontal (16:9)
    "h_s1.txt": "そのこだわり、他社で断られませんでしたか？",
    "h_s2_sub.txt": "自由を諦めない。",
    "h_s2_main.txt": "最高峰の構造工学が、あなたの「わがまま」を解剖する。",
    "h_s3_main.txt": "あきらめなくて、よかった。",
    "h_s3_spec.txt": "耐震最高等級3 × HEAT20 G2/G3 × 完全自由設計",
    "h_s3_brand.txt": "株式会社 住ま居る",
    
    # Vertical (9:16)
    "v_s1_1.txt": "そのこだわり、",
    "v_s1_2.txt": "他社で断られませんでしたか？",
    "v_s2_sub.txt": "自由を諦めない。",
    "v_s2_1.txt": "最高峰の構造工学が、",
    "v_s2_2.txt": "あなたの「わがまま」を解剖する。",
    "v_s3_main.txt": "あきらめなくて、よかった。",
    "v_s3_spec1.txt": "耐震最高等級3 × HEAT20 G2/G3",
    "v_s3_spec2.txt": "完全自由設計",
    "v_s3_brand.txt": "株式会社 住ま居る"
}

for fname, content in texts.items():
    p = os.path.join(out_dir, fname)
    with open(p, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)
    print("Created:", fname)

