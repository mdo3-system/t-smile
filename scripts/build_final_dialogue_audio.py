# -*- coding: utf-8 -*-
"""
scripts/build_final_dialogue_audio.py
男女交互ナレーション確定版 ＆ シェイプ修正版
"""

import asyncio
import edge_tts
import subprocess
import os
import wave
import numpy as np
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

out_dir = r"sample_data\LP"

# 1. Generate narration clips
# Scene 1: Female (1.5s - 5.8s)
# Scene 2: Male (10.0s - 17.8s) - 自然なアクセント「あなたの「わがまま」を解剖する」
# Scene 3A: Female (18.6s - 21.2s) - 「あきらめなくて、よかった。」
# Scene 3B: Male (21.4s - 27.0s) - 「耐震等級3、完全自由設計。株式会社、すまいる。」
clips = [
    ("dia_s1_f.mp3", "そのこだわり、他社で断られませんでしたか？", "ja-JP-NanamiNeural", "+0%", "+0Hz", 1500),
    ("dia_s2_m.mp3", "私たちは会社の型を売りません。最高峰の構造工学が、あなたの「わがまま」を解剖する。", "ja-JP-KeitaNeural", "+4%", "-1Hz", 10000),
    ("dia_s3_f.mp3", "あきらめなくて、よかった。", "ja-JP-NanamiNeural", "+2%", "+0Hz", 18600),
    ("dia_s3_m.mp3", "耐震等級3、完全自由設計。株式会社、すまいる。", "ja-JP-KeitaNeural", "+6%", "-1Hz", 21400),
]

async def gen():
    for fname, text, voice, rate, pitch, _ in clips:
        p = os.path.join(out_dir, fname)
        c = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        await c.save(p)
        print(f"Generated {fname}")

asyncio.run(gen())

# Measure each clip
for fname, text, _, _, _, start_ms in clips:
    p = os.path.join(out_dir, fname)
    cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', p]
    res = subprocess.run(cmd, capture_output=True, text=True)
    import json
    d = float(json.loads(res.stdout)['format']['duration'])
    end_s = (start_ms / 1000.0) + d
    print(f"{fname}: {d:.2f}s (Starts at {start_ms/1000:.1f}s, Ends at {end_s:.2f}s)")

# Combine into narration timeline WAV (pad to 30.0s)
filter_complex = (
    f"[0:a]adelay={clips[0][5]}|{clips[0][5]}[a0];"
    f"[1:a]adelay={clips[1][5]}|{clips[1][5]}[a1];"
    f"[2:a]adelay={clips[2][5]}|{clips[2][5]}[a2];"
    f"[3:a]adelay={clips[3][5]}|{clips[3][5]}[a3];"
    f"[a0][a1][a2][a3]amix=inputs=4:dropout_transition=0:normalize=0,volume=1.8[narr]"
)

cmd = [
    "ffmpeg", "-y",
    "-i", os.path.join(out_dir, clips[0][0]),
    "-i", os.path.join(out_dir, clips[1][0]),
    "-i", os.path.join(out_dir, clips[2][0]),
    "-i", os.path.join(out_dir, clips[3][0]),
    "-filter_complex", filter_complex,
    "-map", "[narr]",
    "-t", "30.0",
    os.path.join(out_dir, "dialogue_final_timeline.wav")
]
subprocess.run(cmd, check=True)
print("SUCCESS: Dialogue narration timeline created.")

# Mix with BGM for 30.0s
def load_wav(path, target_sr=48000):
    with wave.open(path, 'rb') as wf:
        n_ch = wf.getnchannels()
        sr = wf.getframerate()
        n_frames = wf.getnframes()
        data = wf.readframes(n_frames)
        samples = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0
        if n_ch == 1:
            samples = np.column_stack((samples, samples))
        else:
            samples = samples.reshape(-1, 2)
            
        if sr != target_sr:
            new_len = int(len(samples) * target_sr / sr)
            x_old = np.linspace(0, len(samples)-1, len(samples))
            x_new = np.linspace(0, len(samples)-1, new_len)
            s_left = np.interp(x_new, x_old, samples[:, 0])
            s_right = np.interp(x_new, x_old, samples[:, 1])
            samples = np.column_stack((s_left, s_right))
    return samples

sr = 48000
total_len_samples = int(30.0 * sr)
bgm = load_wav(os.path.join(out_dir, "bgm_cinematic.wav"), sr)
nar = load_wav(os.path.join(out_dir, "dialogue_final_timeline.wav"), sr)

master = np.zeros((total_len_samples, 2), dtype=np.float32)

# Ensure same lengths
bgm_buf = np.zeros((total_len_samples, 2), dtype=np.float32)
nar_buf = np.zeros((total_len_samples, 2), dtype=np.float32)

b_len = min(len(bgm), total_len_samples)
bgm_buf[:b_len] = bgm[:b_len]

n_len = min(len(nar), total_len_samples)
nar_buf[:n_len] = nar[:n_len]

# Intelligent Ducking
nar_mono = (np.abs(nar_buf[:, 0]) + np.abs(nar_buf[:, 1])) * 0.5
kernel_size = int(0.15 * sr)
smooth_env = np.convolve(nar_mono, np.ones(kernel_size)/kernel_size, mode='same')
ducking = 1.0 - np.clip(smooth_env * 2.2, 0, 0.60)
ducking_applied = ducking[:, np.newaxis]

master = bgm_buf * 0.72 * ducking_applied + nar_buf * 1.10

# Master fade out in last 1.0s (29.0s to 30.0s)
fadeout_len = int(1.0 * sr)
fadeout = np.linspace(1, 0, fadeout_len)
master[-fadeout_len:, 0] *= fadeout
master[-fadeout_len:, 1] *= fadeout

peak = np.max(np.abs(master))
if peak > 0:
    master = (master / peak) * 0.89

out_wav = os.path.join(out_dir, "master_audio_dialogue_final.wav")
with wave.open(out_wav, "wb") as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(sr)
    int_data = (master * 32767).astype(np.int16)
    wf.writeframes(int_data.tobytes())

print(f"SUCCESS: Final dialogue master audio track rendered: {out_wav} (Length: {total_len_samples/sr:.1f}s)")
