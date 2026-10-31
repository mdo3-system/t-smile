# -*- coding: utf-8 -*-
import asyncio
import edge_tts
import subprocess
import os
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

out_dir = r"sample_data\LP"

narrations_keita = [
    ("nar_s1.mp3", "そのこだわり、他社で断られませんでしたか？", 1.8),
    ("nar_s2.mp3", "私たちは会社の型を売りません。最高峰の構造工学が、あなたの自由なわがままを形にする。", 10.8),
    ("nar_s3.mp3", "あきらめなくて、よかった。最高峰の工学と、完全自由設計。株式会社、住ま居る。", 20.2)
]

async def gen_narrations():
    for fname, text, _ in narrations_keita:
        p = os.path.join(out_dir, fname)
        c = edge_tts.Communicate(text, "ja-JP-KeitaNeural", rate="+0%", pitch="-2Hz")
        await c.save(p)
        print(f"Generated {fname}")

asyncio.run(gen_narrations())

# Combine narrations into a single timeline audio using ffmpeg adelay
# s1 starts at 1800ms, s2 starts at 10800ms, s3 starts at 20200ms
filter_complex = (
    "[0:a]adelay=1800|1800[a0];"
    "[1:a]adelay=10800|10800[a1];"
    "[2:a]adelay=20200|20200[a2];"
    "[a0][a1][a2]amix=inputs=3:dropout_transition=0:normalize=0,volume=1.8[narr_track]"
)

cmd = [
    "ffmpeg", "-y",
    "-i", os.path.join(out_dir, "nar_s1.mp3"),
    "-i", os.path.join(out_dir, "nar_s2.mp3"),
    "-i", os.path.join(out_dir, "nar_s3.mp3"),
    "-filter_complex", filter_complex,
    "-map", "[narr_track]",
    "-t", "30.0",
    os.path.join(out_dir, "narration_timeline.wav")
]

subprocess.run(cmd, check=True)
print("SUCCESS: Combined narration timeline created.")

