# -*- coding: utf-8 -*-
"""
scripts/mix_nanami_master.py
NanamiNeural（女性・温かみのあるエモーショナルな語りかけ）版の動画を生成する。
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

narrations_nanami = [
    ("nar_nanami_s1.mp3", "そのこだわり、他社で断られませんでしたか？", 1.8),
    ("nar_nanami_s2.mp3", "私たちは会社の型を売りません。最高峰の構造工学が、あなたの自由なわがままを形にする。", 10.8),
    ("nar_nanami_s3.mp3", "あきらめなくて、よかった。最高峰の工学と、完全自由設計。株式会社、住ま居る。", 20.2)
]

async def gen_narr():
    for fname, text, _ in narrations_nanami:
        p = os.path.join(out_dir, fname)
        c = edge_tts.Communicate(text, "ja-JP-NanamiNeural", rate="+0%", pitch="+0Hz")
        await c.save(p)
        print(f"Generated {fname}")

asyncio.run(gen_narr())

# Combine timeline
filter_complex = (
    "[0:a]adelay=1800|1800[a0];"
    "[1:a]adelay=10800|10800[a1];"
    "[2:a]adelay=20200|20200[a2];"
    "[a0][a1][a2]amix=inputs=3:dropout_transition=0:normalize=0,volume=1.8[narr_track]"
)

cmd = [
    "ffmpeg", "-y",
    "-i", os.path.join(out_dir, "nar_nanami_s1.mp3"),
    "-i", os.path.join(out_dir, "nar_nanami_s2.mp3"),
    "-i", os.path.join(out_dir, "nar_nanami_s3.mp3"),
    "-filter_complex", filter_complex,
    "-map", "[narr_track]",
    "-t", "30.0",
    os.path.join(out_dir, "narration_nanami_timeline.wav")
]
subprocess.run(cmd, check=True)

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
nar = load_wav(os.path.join(out_dir, "narration_nanami_timeline.wav"), sr)

master = np.zeros((total_len_samples, 2), dtype=np.float32)

nar_mono = (np.abs(nar[:, 0]) + np.abs(nar[:, 1])) * 0.5
kernel_size = int(0.15 * sr)
smooth_env = np.convolve(nar_mono, np.ones(kernel_size)/kernel_size, mode='same')
ducking = 1.0 - np.clip(smooth_env * 2.2, 0, 0.60)

bgm_samples = min(len(bgm), total_len_samples)
ducking_applied = ducking[:bgm_samples, np.newaxis]
master[:bgm_samples] += bgm[:bgm_samples] * 0.72 * ducking_applied

nar_samples = min(len(nar), total_len_samples)
master[:nar_samples] += nar[:nar_samples] * 1.05

fadeout_len = int(0.8 * sr)
fadeout = np.linspace(1, 0, fadeout_len)
master[-fadeout_len:, 0] *= fadeout
master[-fadeout_len:, 1] *= fadeout

peak = np.max(np.abs(master))
if peak > 0:
    master = (master / peak) * 0.89

out_wav = os.path.join(out_dir, "master_audio_nanami.wav")
with wave.open(out_wav, "wb") as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(sr)
    int_data = (master * 32767).astype(np.int16)
    wf.writeframes(int_data.tobytes())

print(f"SUCCESS: Nanami master audio track rendered: {out_wav}")

# Render horizontal and vertical with Nanami audio
# Horizontal: replace audio in sumairu_concept_horizontal_16x9.mp4
out_h_nanami = os.path.join(out_dir, "sumairu_concept_horizontal_16x9_female.mp4")
subprocess.run([
    "ffmpeg", "-y",
    "-i", os.path.join(out_dir, "sumairu_concept_horizontal_16x9.mp4"),
    "-i", out_wav,
    "-map", "0:v",
    "-map", "1:a",
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "192k",
    "-t", "28.0",
    out_h_nanami
], check=True)
print(f"SUCCESS: Rendered Nanami horizontal: {out_h_nanami}")

# Vertical: replace audio in sumairu_concept_vertical_9x16.mp4
out_v_nanami = os.path.join(out_dir, "sumairu_concept_vertical_9x16_female.mp4")
subprocess.run([
    "ffmpeg", "-y",
    "-i", os.path.join(out_dir, "sumairu_concept_vertical_9x16.mp4"),
    "-i", out_wav,
    "-map", "0:v",
    "-map", "1:a",
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "192k",
    "-t", "28.0",
    out_v_nanami
], check=True)
print(f"SUCCESS: Rendered Nanami vertical: {out_v_nanami}")

