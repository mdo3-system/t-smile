# -*- coding: utf-8 -*-
"""
scripts/render_perfect_sns_video.py
トップページ設置専用・決定版動画レンダリングスクリプト（完全修正版）
1. Scene 1: 「そのこだわり、「できない」と諦めていませんか？」（批判的トーン排除・前向きな寄り添い）
2. Scene 2: 「夢を語るのは、あなた。夢を実現するお手伝いをするのが、すまいる。」（「すまいる」ふりがな発音）
3. Scene 3:
   - 女性: 「あきらめなくて、よかった。」
   - 男性: 「耐震最高等級3、HEAT20、完全自由設計。」
   - （※トップページ設置用のため、「株式会社 住ま居る」のナレーション＆テロップは削除し、ブランドサイトとして洗練）
4. 横型（16:9）＆ 縦型（9:16）をフルレンダリングし、プレビューサーバーへ即時同期
"""

import asyncio
import edge_tts
import subprocess
import os
import wave
import numpy as np
import sys
import json
import shutil

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

base_dir = r"sample_data\LP"

def p(f):
    return os.path.join(base_dir, f).replace("\\", "/")

# ----------------------------------------------------
# Step 1: Subtitle Text Files
# ----------------------------------------------------
texts = {
    # Horizontal (16:9)
    "h_s1.txt": "そのこだわり、「できない」と諦めていませんか？",
    "h_s2_1.txt": "夢を語るのは、あなた。",
    "h_s2_2.txt": "夢を実現するお手伝いをするのが、住ま居る。",
    "h_s3_main.txt": "あきらめなくて、よかった。",
    "h_s3_spec.txt": "耐震最高等級3 × HEAT20 G2/G3 × 完全自由設計",
    
    # Vertical (9:16)
    "v_s1_1.txt": "そのこだわり、",
    "v_s1_2.txt": "「できない」と諦めていませんか？",
    "v_s2_1.txt": "夢を語るのは、あなた。",
    "v_s2_2.txt": "夢を実現するお手伝いをするのが、住ま居る。",
    "v_s3_main.txt": "あきらめなくて、よかった。",
    "v_s3_spec1.txt": "耐震最高等級3 × HEAT20 G2/G3",
    "v_s3_spec2.txt": "完全自由設計"
}

for fname, content in texts.items():
    with open(os.path.join(base_dir, fname), "w", encoding="utf-8", newline="\n") as f:
        f.write(content)
print("✔ Step 1: Subtitle files created.")

# ----------------------------------------------------
# Step 2: Dialogue Audio Clips Generation
# ----------------------------------------------------
clips = [
    # Scene 1: Female (1.5s - 6.0s) - 前向き・寄り添い
    ("c_s1_f.mp3", "そのこだわり、「できない」と諦めていませんか？", "ja-JP-NanamiNeural", "+0%", "+0Hz", 1500),
    # Scene 2: Male (10.2s - 16.7s) - 「すまいる」明瞭発音
    ("c_s2_m.mp3", "夢を語るのは、あなた。夢を実現するお手伝いをするのが、すまいる。", "ja-JP-KeitaNeural", "+2%", "-1Hz", 10200),
    # Scene 3: Female exclamation (18.6s - 21.4s)
    ("c_s3_f.mp3", "あきらめなくて、よかった。", "ja-JP-NanamiNeural", "+2%", "+0Hz", 18600),
    # Scene 3: Male spec confirmation (21.5s - 26.7s) - 会社名なし・スマート着地
    ("c_s3_m.mp3", "耐震最高等級3、HEAT20、完全自由設計。", "ja-JP-KeitaNeural", "+4%", "-1Hz", 21500),
]

async def gen_dialogue():
    for fname, text, voice, rate, pitch, _ in clips:
        p_file = os.path.join(base_dir, fname)
        c = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        await c.save(p_file)

asyncio.run(gen_dialogue())

for fname, text, _, _, _, start_ms in clips:
    p_file = os.path.join(base_dir, fname)
    cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', p_file]
    res = subprocess.run(cmd, capture_output=True, text=True)
    d = float(json.loads(res.stdout)['format']['duration'])
    end_s = (start_ms / 1000.0) + d
    print(f"  🎙️ {fname}: {d:.2f}s (Start: {start_ms/1000:.1f}s -> End: {end_s:.2f}s) text: {text}")

# Combine into 30.0s timeline WAV
filter_complex = (
    f"[0:a]adelay={clips[0][5]}|{clips[0][5]}[a0];"
    f"[1:a]adelay={clips[1][5]}|{clips[1][5]}[a1];"
    f"[2:a]adelay={clips[2][5]}|{clips[2][5]}[a2];"
    f"[3:a]adelay={clips[3][5]}|{clips[3][5]}[a3];"
    f"[a0][a1][a2][a3]amix=inputs=4:dropout_transition=0:normalize=0,volume=1.85[narr]"
)

cmd = [
    "ffmpeg", "-y",
    "-i", os.path.join(base_dir, clips[0][0]),
    "-i", os.path.join(base_dir, clips[1][0]),
    "-i", os.path.join(base_dir, clips[2][0]),
    "-i", os.path.join(base_dir, clips[3][0]),
    "-filter_complex", filter_complex,
    "-map", "[narr]",
    "-t", "30.0",
    "-ar", "44100",
    "-ac", "2",
    os.path.join(base_dir, "dialogue_timeline_30s.wav")
]
subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print("✔ Step 2: Dialogue timeline 30.0s WAV created.")

# ----------------------------------------------------
# Step 3: Mix Master Audio with BGM (Intelligent Ducking)
# ----------------------------------------------------
bgm_path = os.path.join(base_dir, "bgm_cinematic.wav")
nar_path = os.path.join(base_dir, "dialogue_timeline_30s.wav")
master_out = os.path.join(base_dir, "master_dialogue_30s.wav")

with wave.open(bgm_path, "rb") as wf:
    sr = wf.getframerate()
    n_ch = wf.getnchannels()
    bgm_raw = wf.readframes(wf.getnframes())
    bgm_data = np.frombuffer(bgm_raw, dtype=np.int16).astype(np.float32)

with wave.open(nar_path, "rb") as wf:
    nar_raw = wf.readframes(wf.getnframes())
    nar_data = np.frombuffer(nar_raw, dtype=np.int16).astype(np.float32)

total_len = sr * 30 * n_ch
bgm_buf = np.zeros(total_len, dtype=np.float32)
nar_buf = np.zeros(total_len, dtype=np.float32)
bgm_buf[:min(len(bgm_data), total_len)] = bgm_data[:min(len(bgm_data), total_len)]
nar_buf[:min(len(nar_data), total_len)] = nar_data[:min(len(nar_data), total_len)]

mono_nar = np.mean(nar_buf.reshape(-1, n_ch), axis=1)
env = np.abs(mono_nar)
win_size = int(sr * 0.15)
kernel = np.ones(win_size) / win_size
smoothed_env = np.convolve(env, kernel, mode="same")

duck_profile = np.ones(len(mono_nar), dtype=np.float32)
threshold = 800.0
for i in range(len(smoothed_env)):
    if smoothed_env[i] > threshold:
        duck_profile[i] = 0.28
    else:
        duck_profile[i] = 1.0

duck_smooth_win = int(sr * 0.25)
duck_profile = np.convolve(duck_profile, np.ones(duck_smooth_win)/duck_smooth_win, mode="same")
duck_stereo = np.repeat(duck_profile, n_ch)

mixed = (bgm_buf * duck_stereo * 0.85) + nar_buf
max_val = np.max(np.abs(mixed))
if max_val > 32000:
    mixed = mixed * (32000.0 / max_val)

mixed_int16 = mixed.astype(np.int16)
with wave.open(master_out, "wb") as wf:
    wf.setnchannels(n_ch)
    wf.setsampwidth(2)
    wf.setframerate(sr)
    wf.writeframes(mixed_int16.tobytes())
print("✔ Step 3: Master audio with intelligent ducking created.")

# ----------------------------------------------------
# Step 4: Render Horizontal (16:9) Video
# ----------------------------------------------------
font_file = "C\\:/Windows/Fonts/yumindb.ttf"

# Color grading & crossfade
g1 = "eq=contrast=0.92:saturation=0.82,colorbalance=rs=-0.08:gs=0.0:bs=0.15:rm=-0.05:gm=0.0:bm=0.1"
g2 = "eq=contrast=1.05:saturation=1.02,colorbalance=rs=0.02:gs=0.02:bs=0.02"
g3 = "tpad=stop_mode=clone:stop_duration=2.5,eq=contrast=1.08:saturation=1.15,colorbalance=rh=0.12:gh=0.04:bh=-0.08:rm=0.08:gm=0.02:bm=-0.04"

sub_h1 = (
    f"drawtext=fontfile='{font_file}':textfile='{p('h_s1.txt')}':fontsize=40:fontcolor=white:"
    f"shadowcolor=black@0.85:shadowx=2:shadowy=3:box=1:boxcolor=black@0.50:boxborderw=14:"
    f"x=(w-text_w)/2:y=h-text_h-85:enable='between(t,1.2,8.8)'"
)
sub_h2_1 = (
    f"drawtext=fontfile='{font_file}':textfile='{p('h_s2_1.txt')}':fontsize=38:fontcolor=white:"
    f"shadowcolor=black@0.85:shadowx=2:shadowy=3:box=1:boxcolor=black@0.50:boxborderw=12:"
    f"x=(w-text_w)/2:y=h-text_h-135:enable='between(t,10.0,18.0)'"
)
sub_h2_2 = (
    f"drawtext=fontfile='{font_file}':textfile='{p('h_s2_2.txt')}':fontsize=38:fontcolor=#38bdf8:"
    f"shadowcolor=black@0.85:shadowx=2:shadowy=3:box=1:boxcolor=black@0.50:boxborderw=12:"
    f"x=(w-text_w)/2:y=h-text_h-75:enable='between(t,11.5,18.0)'"
)
sub_h3_main = (
    f"drawtext=fontfile='{font_file}':textfile='{p('h_s3_main.txt')}':fontsize=46:fontcolor=white:"
    f"shadowcolor=black@0.85:shadowx=2:shadowy=3:box=1:boxcolor=black@0.50:boxborderw=16:"
    f"x=(w-text_w)/2:y=h-text_h-125:enable='between(t,18.5,28.5)'"
)
sub_h3_spec = (
    f"drawtext=fontfile='{font_file}':textfile='{p('h_s3_spec.txt')}':fontsize=28:fontcolor=#fde047:"
    f"shadowcolor=black@0.85:shadowx=2:shadowy=2:box=1:boxcolor=black@0.45:boxborderw=10:"
    f"x=(w-text_w)/2:y=h-text_h-70:enable='between(t,21.0,28.5)'"
)

filter_complex_h = (
    f"[0:v]{g1}[v1];"
    f"[1:v]{g2}[v2];"
    f"[2:v]{g3}[v3];"
    f"[v1][v2]xfade=transition=fade:duration=1.0:offset=9.03[v12];"
    f"[v12][v3]xfade=transition=fadewhite:duration=1.0:offset=18.06[v_base];"
    f"[v_base]{sub_h1},{sub_h2_1},{sub_h2_2},{sub_h3_main},{sub_h3_spec},"
    f"fade=t=in:st=0:d=0.8,fade=t=out:st=28.2:d=1.8[v_final]"
)

out_h = p("sumairu_concept_horizontal_16x9.mp4")
cmd_h = [
    "ffmpeg", "-y",
    "-i", p("scene1.mp4"),
    "-i", p("scene2.mp4"),
    "-i", p("scene3.mp4"),
    "-i", master_out,
    "-filter_complex", filter_complex_h,
    "-map", "[v_final]",
    "-map", "3:a",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "256k",
    "-t", "30.00",
    out_h
]
print("⏳ Rendering Horizontal (16:9) Video...")
subprocess.run(cmd_h, check=True)
print("✔ Step 4: Horizontal (16:9) Video Rendered Successfully!")

# ----------------------------------------------------
# Step 5: Render Vertical (9:16) Video
# ----------------------------------------------------
sub_v1_1 = (
    f"drawtext=fontfile='{font_file}':textfile='{p('v_s1_1.txt')}':fontsize=42:fontcolor=white:"
    f"shadowcolor=black@0.85:shadowx=2:shadowy=3:box=1:boxcolor=black@0.50:boxborderw=12:"
    f"x=(w-text_w)/2:y=890:enable='between(t,1.2,8.8)'"
)
sub_v1_2 = (
    f"drawtext=fontfile='{font_file}':textfile='{p('v_s1_2.txt')}':fontsize=36:fontcolor=white:"
    f"shadowcolor=black@0.85:shadowx=2:shadowy=3:box=1:boxcolor=black@0.50:boxborderw=10:"
    f"x=(w-text_w)/2:y=955:enable='between(t,1.2,8.8)'"
)
sub_v2_1 = (
    f"drawtext=fontfile='{font_file}':textfile='{p('v_s2_1.txt')}':fontsize=40:fontcolor=white:"
    f"shadowcolor=black@0.85:shadowx=2:shadowy=3:box=1:boxcolor=black@0.50:boxborderw=12:"
    f"x=(w-text_w)/2:y=890:enable='between(t,10.0,18.0)'"
)
sub_v2_2 = (
    f"drawtext=fontfile='{font_file}':textfile='{p('v_s2_2.txt')}':fontsize=36:fontcolor=#38bdf8:"
    f"shadowcolor=black@0.85:shadowx=2:shadowy=3:box=1:boxcolor=black@0.50:boxborderw=12:"
    f"x=(w-text_w)/2:y=955:enable='between(t,11.5,18.0)'"
)
sub_v3_main = (
    f"drawtext=fontfile='{font_file}':textfile='{p('v_s3_main.txt')}':fontsize=44:fontcolor=white:"
    f"shadowcolor=black@0.85:shadowx=2:shadowy=3:box=1:boxcolor=black@0.50:boxborderw=14:"
    f"x=(w-text_w)/2:y=880:enable='between(t,18.5,28.5)'"
)
sub_v3_spec1 = (
    f"drawtext=fontfile='{font_file}':textfile='{p('v_s3_spec1.txt')}':fontsize=30:fontcolor=#fde047:"
    f"shadowcolor=black@0.85:shadowx=2:shadowy=2:box=1:boxcolor=black@0.45:boxborderw=8:"
    f"x=(w-text_w)/2:y=950:enable='between(t,21.0,28.5)'"
)
sub_v3_spec2 = (
    f"drawtext=fontfile='{font_file}':textfile='{p('v_s3_spec2.txt')}':fontsize=28:fontcolor=#ffffff:"
    f"shadowcolor=black@0.85:shadowx=2:shadowy=2:box=1:boxcolor=black@0.45:boxborderw=8:"
    f"x=(w-text_w)/2:y=1005:enable='between(t,21.0,28.5)'"
)

filter_complex_v = (
    f"[0:v]{g1}[v1];"
    f"[1:v]{g2}[v2];"
    f"[2:v]{g3}[v3];"
    f"[v1][v2]xfade=transition=fade:duration=1.0:offset=9.03[v12];"
    f"[v12][v3]xfade=transition=fadewhite:duration=1.0:offset=18.06[v_base];"
    f"[v_base]{sub_v1_1},{sub_v1_2},{sub_v2_1},{sub_v2_2},{sub_v3_main},{sub_v3_spec1},{sub_v3_spec2},"
    f"fade=t=in:st=0:d=0.8,fade=t=out:st=28.2:d=1.8[v_final]"
)

out_v = p("sumairu_concept_vertical_9x16.mp4")
cmd_v = [
    "ffmpeg", "-y",
    "-i", p("scene1_v.mp4"),
    "-i", p("scene2_v.mp4"),
    "-i", p("scene3_c.mp4"),
    "-i", master_out,
    "-filter_complex", filter_complex_v,
    "-map", "[v_final]",
    "-map", "3:a",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "256k",
    "-t", "30.00",
    out_v
]
print("⏳ Rendering Vertical (9:16) Video...")
subprocess.run(cmd_v, check=True)
print("✔ Step 5: Vertical (9:16) Video Rendered Successfully!")

# ----------------------------------------------------
# Step 6: Sync to Public Preview
# ----------------------------------------------------
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public")
preview_dir = os.path.join(PUBLIC_DIR, "temp_video_preview")
os.makedirs(preview_dir, exist_ok=True)
shutil.copy(out_h, os.path.join(preview_dir, "sumairu_concept_horizontal_16x9.mp4"))
shutil.copy(out_v, os.path.join(preview_dir, "sumairu_concept_vertical_9x16.mp4"))
print("✔ Step 6: Synced to public preview server.")
