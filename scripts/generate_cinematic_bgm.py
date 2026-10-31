import sys
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
"""
scripts/generate_cinematic_bgm.py
Scene 1〜3の演出意図に完全に合わせたオリジナル・シネマティックBGMの合成生成
- Scene 1: 静謐なピアノの単音、かすかな雨音のような環境音 (A minor)
- Scene 2: 思考と構造の深化、低音チェロと前進するストリングス (D minor -> E tension)
- Scene 3: 壮大なオーケストラ・クレッシェンド、薪のはぜる温もり (C major 歓喜と光)
"""

import numpy as np
import wave
import math
import os

sr = 48000
total_dur = 30.5
total_samples = int(sr * total_dur)
audio = np.zeros((total_samples, 2), dtype=np.float32)

def note_freq(midi_num):
    return 440.0 * (2.0 ** ((midi_num - 69) / 12.0))

def add_piano_note(buf, start_sec, midi_num, duration, velocity=0.5, pan=0.0):
    start_idx = int(start_sec * sr)
    n_samples = int(duration * sr)
    if start_idx >= len(buf):
        return
    n_samples = min(n_samples, len(buf) - start_idx)
    t = np.arange(n_samples) / sr
    f0 = note_freq(midi_num)
    
    # Piano physical model harmonics
    sig = 1.0 * np.sin(2 * np.pi * f0 * t) * np.exp(-t * 1.5)
    sig += 0.55 * np.sin(2 * np.pi * 2 * f0 * t) * np.exp(-t * 2.2)
    sig += 0.28 * np.sin(2 * np.pi * 3 * f0 * t) * np.exp(-t * 3.2)
    sig += 0.14 * np.sin(2 * np.pi * 4 * f0 * t) * np.exp(-t * 4.2)
    sig += 0.08 * np.sin(2 * np.pi * 5 * f0 * t) * np.exp(-t * 5.5)
    sig += 0.04 * np.sin(2 * np.pi * 6 * f0 * t) * np.exp(-t * 7.0)
    
    # Attack envelope
    att_samples = int(0.008 * sr)
    sig[:att_samples] *= np.linspace(0, 1, att_samples)
    sig *= velocity
    
    # Stereo panning
    left_gain = math.sqrt(0.5 * (1.0 - pan))
    right_gain = math.sqrt(0.5 * (1.0 + pan))
    buf[start_idx:start_idx + n_samples, 0] += sig * left_gain
    buf[start_idx:start_idx + n_samples, 1] += sig * right_gain

def add_string_pad(buf, start_sec, midi_notes, duration, velocity=0.3, attack=1.2, release=1.5, pan=0.0):
    start_idx = int(start_sec * sr)
    n_samples = int(duration * sr)
    if start_idx >= len(buf):
        return
    n_samples = min(n_samples, len(buf) - start_idx)
    t = np.arange(n_samples) / sr
    
    chord_sig = np.zeros(n_samples, dtype=np.float32)
    for m in midi_notes:
        f0 = note_freq(m)
        # Warm detuned sawtooth/strings
        vib = 1.0 + 0.003 * np.sin(2 * np.pi * 5.5 * t)
        s1 = np.sin(2 * np.pi * (f0 * 1.001) * t * vib)
        s2 = 0.5 * np.sin(2 * np.pi * (2 * f0) * t)
        s3 = 0.35 * np.sin(2 * np.pi * (3 * f0) * t)
        s4 = 0.2 * np.sin(2 * np.pi * (4 * f0) * t)
        chord_sig += (s1 + s2 + s3 + s4)
    
    chord_sig /= len(midi_notes)
    
    # Envelope
    att_len = int(attack * sr)
    rel_len = int(release * sr)
    env = np.ones(n_samples, dtype=np.float32)
    if att_len > 0 and att_len < n_samples:
        env[:att_len] = np.linspace(0, 1, att_len)
    if rel_len > 0 and rel_len < n_samples:
        env[-rel_len:] = np.linspace(1, 0, rel_len)
        
    chord_sig = chord_sig * env * velocity
    
    left_gain = math.sqrt(0.5 * (1.0 - pan))
    right_gain = math.sqrt(0.5 * (1.0 + pan))
    buf[start_idx:start_idx + n_samples, 0] += chord_sig * left_gain
    buf[start_idx:start_idx + n_samples, 1] += chord_sig * right_gain

def add_ambient_rain(buf, start_sec, duration, level=0.03):
    start_idx = int(start_sec * sr)
    n_samples = int(duration * sr)
    n_samples = min(n_samples, len(buf) - start_idx)
    # Pinkish filtered noise
    noise = np.random.normal(0, 1, n_samples)
    # simple lowpass
    b = [0.05] * 20
    smooth_noise = np.convolve(noise, b, mode='same') * level
    # Fade in / out
    fade = int(1.0 * sr)
    smooth_noise[:fade] *= np.linspace(0, 1, fade)
    smooth_noise[-fade:] *= np.linspace(1, 0, fade)
    buf[start_idx:start_idx + n_samples, 0] += smooth_noise
    buf[start_idx:start_idx + n_samples, 1] += smooth_noise

def add_fireplace_crackle(buf, start_sec, duration, level=0.025):
    start_idx = int(start_sec * sr)
    n_samples = int(duration * sr)
    n_samples = min(n_samples, len(buf) - start_idx)
    # intermittent snaps & low warm rumble
    t = np.arange(n_samples) / sr
    crackle = np.zeros(n_samples, dtype=np.float32)
    # random spikes
    num_pops = int(duration * 12)
    pop_indices = np.random.randint(0, n_samples - 500, num_pops)
    for p in pop_indices:
        decay = np.exp(-np.linspace(0, 15, 300))
        crackle[p:p+300] += np.random.uniform(0.3, 1.0) * decay
    # warm rumble
    rumble = np.sin(2 * np.pi * 55 * t) * 0.2 + np.sin(2 * np.pi * 85 * t) * 0.15
    out = (crackle * 0.8 + rumble * 0.2) * level
    fade = int(1.5 * sr)
    out[:fade] *= np.linspace(0, 1, fade)
    out[-fade:] *= np.linspace(1, 0, fade)
    buf[start_idx:start_idx + n_samples, 0] += out
    buf[start_idx:start_idx + n_samples, 1] += out

print("Building Scene 1 (0-10s): 静謐なピアノの単音、雨音アンビエント...")
add_ambient_rain(audio, 0.0, 9.8, level=0.02)
# A minor piano progression
add_piano_note(audio, 0.4, 45, 5.0, velocity=0.35, pan=-0.2)  # A2
add_piano_note(audio, 1.2, 57, 4.0, velocity=0.30, pan=-0.1)  # A3
add_piano_note(audio, 2.5, 60, 4.0, velocity=0.28, pan=0.1)   # C4
add_piano_note(audio, 4.0, 64, 4.5, velocity=0.32, pan=0.2)   # E4
add_piano_note(audio, 5.8, 55, 4.0, velocity=0.25, pan=-0.15) # G3
add_piano_note(audio, 7.0, 59, 3.5, velocity=0.26, pan=0.1)   # B3
add_piano_note(audio, 8.2, 53, 3.0, velocity=0.28, pan=-0.1)  # F3

print("Building Scene 2 (9.5-20s): 低音チェロ、前進するストリングス...")
# Cello / string pad builds tension and momentum
add_string_pad(audio, 9.2, [38, 50, 57], 4.5, velocity=0.28, attack=1.5, release=1.0, pan=-0.2) # D minor
add_piano_note(audio, 10.5, 62, 3.5, velocity=0.30, pan=0.2)  # D4
add_piano_note(audio, 12.0, 65, 3.0, velocity=0.32, pan=-0.1) # F4

add_string_pad(audio, 13.0, [41, 53, 60], 4.0, velocity=0.35, attack=1.2, release=1.0, pan=0.1)  # F major
add_piano_note(audio, 14.2, 69, 3.0, velocity=0.35, pan=0.25) # A4

add_string_pad(audio, 16.5, [40, 52, 56, 59], 3.8, velocity=0.42, attack=1.0, release=0.8, pan=0.0) # E7 tension
add_piano_note(audio, 17.0, 68, 2.5, velocity=0.38, pan=-0.2) # G#4
add_piano_note(audio, 18.2, 71, 2.0, velocity=0.40, pan=0.2)  # B4

print("Building Scene 3 (19.5-30s): 壮大なC majorオーケストラ、薪ストーブの暖かさ...")
add_fireplace_crackle(audio, 19.5, 10.5, level=0.035)

# Grand resolution chord progression
# 19.5s: C major (Grand entry)
add_string_pad(audio, 19.5, [36, 48, 55, 60, 64, 67], 4.5, velocity=0.55, attack=0.4, release=1.2, pan=0.0)
add_piano_note(audio, 19.6, 72, 4.5, velocity=0.50, pan=0.1)  # C5
add_piano_note(audio, 20.2, 67, 4.0, velocity=0.42, pan=-0.1) # G4
add_piano_note(audio, 20.8, 64, 4.0, velocity=0.40, pan=0.15) # E4

# 23.0s: F major -> G major (Uplifting)
add_string_pad(audio, 23.0, [41, 53, 57, 60, 65], 3.5, velocity=0.52, attack=0.8, release=1.0, pan=-0.1)
add_piano_note(audio, 23.5, 69, 3.5, velocity=0.45, pan=0.2)  # A4
add_piano_note(audio, 24.5, 72, 3.0, velocity=0.48, pan=-0.2) # C5

# 26.0s: Final C major with rich harmonic warmth & decay
add_string_pad(audio, 26.0, [36, 48, 55, 60, 64, 67, 72], 4.5, velocity=0.60, attack=0.6, release=2.5, pan=0.0)
add_piano_note(audio, 26.2, 72, 4.0, velocity=0.52, pan=0.0)
add_piano_note(audio, 27.0, 76, 3.5, velocity=0.45, pan=0.2)  # E5
add_piano_note(audio, 28.0, 79, 2.5, velocity=0.40, pan=-0.1) # G5

# Master Reverb (simple stereo comb/allpass simulation)
print("Applying cinematic hall reverb...")
reverb_buf = np.zeros_like(audio)
delays = [int(0.029 * sr), int(0.037 * sr), int(0.043 * sr), int(0.053 * sr)]
gains = [0.25, 0.20, 0.15, 0.10]
for d, g in zip(delays, gains):
    reverb_buf[d:, 0] += audio[:-d, 1] * g
    reverb_buf[d:, 1] += audio[:-d, 0] * g

final_audio = audio + reverb_buf * 0.45

# Normalize to -1.0 dB peak
peak = np.max(np.abs(final_audio))
if peak > 0:
    final_audio = (final_audio / peak) * 0.89 # -1dB peak

out_dir = r"sample_data\LP"
out_wav = os.path.join(out_dir, "bgm_cinematic.wav")
with wave.open(out_wav, "wb") as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(sr)
    int_data = (final_audio * 32767).astype(np.int16)
    wf.writeframes(int_data.tobytes())

print(f"✔ Successfully synthesized Cinematic BGM: {out_wav} (30s, Peak normalized)")

