# -*- coding: utf-8 -*-
"""
scripts/test_dialogue_narrations.py
男女交互のナレーション、イントネーション調整、会社名「すまいる」の完全言い切りを検証する。
"""

import asyncio
import edge_tts
import subprocess
import json
import os
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

out_dir = r"sample_data\LP\test_audio"
os.makedirs(out_dir, exist_ok=True)

patterns = [
    # Scene 1: Female (Nanami)
    ("s1_female.mp3", "そのこだわり、他社で断られませんでしたか？", "ja-JP-NanamiNeural", "+0%", "+0Hz"),
    
    # Scene 2: Male (Keita) - testing "wagamama" intonation
    ("s2_male_p1.mp3", "私たちは会社の型を売りません。最高峰の構造工学が、あなたの「わがまま」を解剖する。", "ja-JP-KeitaNeural", "+3%", "-1Hz"),
    ("s2_male_p2.mp3", "私たちは会社の型を売りません。最高峰の構造工学が、あなたの、わがままを、解剖する。", "ja-JP-KeitaNeural", "+3%", "-1Hz"),
    ("s2_male_p3.mp3", "私たちは会社の型を売りません。最高峰の構造工学が、あなたのワガママを解剖する。", "ja-JP-KeitaNeural", "+3%", "-1Hz"),
    ("s2_male_p4.mp3", "私たちは会社の型を売りません。最高峰の構造工学が、あなたの自由な、わがままを解剖する。", "ja-JP-KeitaNeural", "+3%", "-1Hz"),
    ("s2_male_p5.mp3", "私たちは、会社の型を売りません。最高峰の構造計算が、あなたのわがままを形にする。", "ja-JP-KeitaNeural", "+3%", "-1Hz"),

    # Scene 3: Dialogue options
    # Option A: Female starts "あきらめなくて、よかった。", Male finishes "耐震最高等級3と超高断熱。完全自由設計、株式会社すまいる。"
    ("s3_f_short.mp3", "あきらめなくて、よかった。", "ja-JP-NanamiNeural", "+0%", "+0Hz"),
    ("s3_m_finish1.mp3", "耐震等級3、HEAT20。完全自由設計、株式会社、すまいる。", "ja-JP-KeitaNeural", "+4%", "-1Hz"),
    ("s3_m_finish2.mp3", "最高峰の工学と、完全自由設計。株式会社、すまいる。", "ja-JP-KeitaNeural", "+4%", "-1Hz"),
    
    # Option B: Female says entire scene 3
    ("s3_f_full.mp3", "あきらめなくて、よかった。最高峰の工学と、完全自由設計。株式会社、すまいる。", "ja-JP-NanamiNeural", "+4%", "+0Hz"),
]

async def gen():
    for fname, text, voice, rate, pitch in patterns:
        p = os.path.join(out_dir, fname)
        c = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        await c.save(p)
        print(f"Generated {fname}")

asyncio.run(gen())

# Measure durations
for fname, _, _, _, _ in patterns:
    p = os.path.join(out_dir, fname)
    cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', p]
    res = subprocess.run(cmd, capture_output=True, text=True)
    d = float(json.loads(res.stdout)['format']['duration'])
    print(f"{fname}: {d:.2f}s")

