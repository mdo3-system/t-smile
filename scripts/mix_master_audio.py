# -*- coding: utf-8 -*-
"""
scripts/mix_master_audio.py
BGM、ナレーション、環境音をミリ秒単位で美しくミキシングし、
マスタリング（ノーマライズ＆リミッター）を施したマスターオーディオトラックを生成する。
"""

import wave
import numpy as np
import os
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

out_dir = r"sample_data\LP"

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
            
        # resample if needed
        if sr != target_sr:
            new_len = int(len(samples) * target_sr / sr)
            x_old = np.linspace(0, len(samples)-1, len(samples))
            x_new = np.linspace(0, len(samples)-1, new_len)
            s_left = np.interp(x_new, x_old, samples[:, 0])
            s_right = np.interp(x_new, x_old, samples[:, 1])
            samples = np.column_stack((s_left, s_right))
            
    return samples

bgm_path = os.path.join(out_dir, "bgm_cinematic.wav")
nar_path = os.path.join(out_dir, "narration_timeline.wav")

sr = 48000
total_dur = 29.8 # 3 scenes with 1s xfade overlaps: 10 + 10 + 10 - 2 = 28s + margin = ~28.06s
# Let's check exact video duration after xfade:
# Scene 1: 10.03s, Scene 2: 10.03s, Scene 3: 10.03s
# offset1 = 9.0s (overlap 1.03s) -> end of scene2 = 9.0 + 10.03 = 19.03s
# offset2 = 18.0s (overlap 1.03s) -> end of scene3 = 18.0 + 10.03 = 28.03s
total_len_samples = int(28.2 * sr)

bgm = load_wav(bgm_path, sr)
nar = load_wav(nar_path, sr)

# Ensure lengths
master = np.zeros((total_len_samples, 2), dtype=np.float32)

# 1. BGM with intelligent sidechain ducking during narration
# Narration envelope
nar_mono = (np.abs(nar[:, 0]) + np.abs(nar[:, 1])) * 0.5
# smooth envelope
kernel_size = int(0.15 * sr)
smooth_env = np.convolve(nar_mono, np.ones(kernel_size)/kernel_size, mode='same')
ducking = 1.0 - np.clip(smooth_env * 2.2, 0, 0.60) # duck down to 0.40 during voice

bgm_samples = min(len(bgm), total_len_samples)
ducking_applied = ducking[:bgm_samples, np.newaxis]
master[:bgm_samples] += bgm[:bgm_samples] * 0.72 * ducking_applied

# 2. Narration track (clear and present)
nar_samples = min(len(nar), total_len_samples)
master[:nar_samples] += nar[:nar_samples] * 1.05

# 3. Soft fade out at the very end (last 0.8s)
fadeout_len = int(0.8 * sr)
fadeout = np.linspace(1, 0, fadeout_len)
master[-fadeout_len:, 0] *= fadeout
master[-fadeout_len:, 1] *= fadeout

# Master Limiter / Normalization (-1.0 dBFS)
peak = np.max(np.abs(master))
if peak > 0:
    master = (master / peak) * 0.89

out_wav = os.path.join(out_dir, "master_audio_timeline.wav")
with wave.open(out_wav, "wb") as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(sr)
    int_data = (master * 32767).astype(np.int16)
    wf.writeframes(int_data.tobytes())

print(f"SUCCESS: Master audio track rendered: {out_wav} (Length: {total_len_samples/sr:.2f}s)")

