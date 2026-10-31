# -*- coding: utf-8 -*-
"""
scripts/build_dialogue_audio.py
男女交互ナレーション（Nanami & Keita）のマスターオーディオ構築
- Scene 1: 女性（Nanami）「そのこだわり、他社で断られませんでしたか？」
- Scene 2: 男性（Keita）「私たちは会社の型を売りません。最高峰の構造工学が、あなたの「わがまま」を解剖する。」
- Scene 3A: 女性（Nanami）「あきらめなくて、よかった。」
- Scene 3B: 男性（Keita）「耐震最高等級3、完全自由設計。株式会社、すまいる。」
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

clips = [
    # (filename, text, voice, rate, pitch, start_time_ms)
    ("d_s1_f.mp3", "そのこだわり、他社で断られませんでしたか？", "ja-JP-NanamiNeural", "+0%", "+0Hz", 1500),
    ("d_s2_m.mp3", "私たちは会社の型を売りません。最高峰の構造工学が、あなたの「わがまま」を解剖する。", "ja-JP-KeitaNeural", "+3%", "-1Hz", 10000),
    ("d_s3_f.mp3", "あきらめなくて、よかった。", "ja-JP-NanamiNeural", "+0%", "+0Hz", 18800),
    ("d_s3_m.mp3", "耐震最高等級3、完全自由設計。株式会社、すまいる。", "ja-JP-KeitaNeural", "+3%", "-1Hz", 21800),
]

async def gen_clips():
    for fname, text, voice, rate, pitch, _ in clips:
        p = os.path.join(out_dir, fname)
        c = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        await c.save(p)
        print(f"Generated {fname}: {text}")

asyncio.run(gen_clips())

# Combine into single narration timeline WAV
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
    "-t", "28.2",
    os.path.join(out_dir, "dialogue_narration_timeline.wav")
]
subprocess.run(cmd, check=True)
print("SUCCESS: Combined dialogue narration timeline created.")

# Mix with BGM
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
total_len_samples = int(28.2 * sr)
bgm = load_wav(os.path.join(out_dir, "bgm_cinematic.wav"), sr)
nar = load_wav(os.path.join(out_dir, "dialogue_narration_timeline.wav"), sr)

master = np.zeros((total_len_samples, 2), dtype=np.float32)

nar_mono = (np.abs(nar[:, 0]) + np.abs(nar[:, 1])) * 0.5
kernel_size = int(0.15 * sr)
smooth_env = np.convolve(nar_mono, np.ones(kernel_size)/kernel_size, mode='same')
ducking = 1.0 - np.clip(smooth_env * 2.2, 0, 0.60)

bgm_samples = min(len(bgm), total_len_samples)
ducking_applied = ducking[:bgm_samples, np.newaxis]
master[:bgm_samples] += bgm[:bgm_samples] * 0.72 * ducking_applied

nar_samples = min(len(nar), total_len_samples)
master[:nar_samples] += nar[:nar_samples] * 1.08

# Fade out last 0.8s
fadeout_len = int(0.8 * sr)
fadeout = np.linspace(1, 0, fadeout_len)
master[-fadeout_len:, 0] *= fadeout
master[-fadeout_len:, 1] *= fadeout

peak = np.max(np.abs(master))
if peak > 0:
    master = (master / peak) * 0.89

out_wav = os.path.join(out_dir, "master_audio_dialogue.wav")
with wave.open(out_wav, "wb") as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(sr)
    int_data = (master * 32767).astype(np.int16)
    wf.writeframes(int_data.tobytes())

print(f"SUCCESS: Dialogue master audio track rendered: {out_wav}")

