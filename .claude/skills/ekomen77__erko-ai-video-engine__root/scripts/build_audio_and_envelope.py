import subprocess
import wave
import struct
import math
import json
import random
import os
import sys

# ---------------------------------------------------------------------------
# build_audio_and_envelope.py — alternate stdlib-only audio lane (no numpy)
#
# Usage:
#   python build_audio_and_envelope.py <voice file> [prefix]
#
# Outputs (next to this script):
#   <prefix>_voice_raw.wav    voice normalised to 44.1 kHz mono
#   <prefix>_audio_mix.wav    stereo voice + SFX + cozy background ambience
#   <prefix>_envelope.json    30 fps RMS envelope for render_video.js
#
# Voice output is padded with a 1.0 s silent hold at the end. Edit the
# STORY BEATS block near the bottom to match your own scene timeline.
# ---------------------------------------------------------------------------

WORK_DIR = os.path.dirname(os.path.abspath(__file__))

if len(sys.argv) < 2:
    print("Usage: python build_audio_and_envelope.py <voice.mp3|wav|opus|m4a> [prefix]")
    sys.exit(1)

PREFIX = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2].strip() else "intro"
mp3_in = sys.argv[1]
raw_wav = os.path.join(WORK_DIR, f"{PREFIX}_voice_raw.wav")
mix_wav = os.path.join(WORK_DIR, f"{PREFIX}_audio_mix.wav")
env_json = os.path.join(WORK_DIR, f"{PREFIX}_envelope.json")

# 1. Convert MP3 to 44.1kHz 16-bit mono WAV
subprocess.run([
    "ffmpeg", "-y", "-v", "error",
    "-i", mp3_in,
    "-ac", "1", "-ar", "44100", "-sample_fmt", "s16",
    raw_wav
], check=True)

with wave.open(raw_wav, "rb") as wf:
    n_voice = wf.getnframes()
    sr = wf.getframerate()
    raw_bytes = wf.readframes(n_voice)

voice_samples = [s / 32768.0 for s in struct.unpack(f"<{n_voice}h", raw_bytes)]
voice_dur = n_voice / float(sr)

# Pad 1.0s at the end for a clean visual hold
total_dur = voice_dur + 1.0
n_total = int(total_dur * sr)

voice = [0.0] * n_total
for i in range(n_voice):
    voice[i] = voice_samples[i]

# 2. Extract 30 FPS RMS envelope for lip-sync & animation reactivity
FPS = 30
total_frames = int(math.ceil(total_dur * FPS))
spf = sr // FPS
envelope = []
raw_rms = []

for f in range(total_frames):
    i0 = f * spf
    i1 = min(n_total, (f + 1) * spf)
    if i1 > i0:
        chunk = voice[i0:i1]
        rms = math.sqrt(sum(x * x for x in chunk) / len(chunk))
    else:
        rms = 0.0
    raw_rms.append(rms)

max_rms = max(raw_rms) if raw_rms else 1.0
for r in raw_rms:
    norm_r = min(1.0, (r / (max_rms * 0.65 + 1e-6)))
    envelope.append(round(norm_r, 4))

with open(env_json, "w", encoding="utf-8") as f:
    json.dump({
        "fps": FPS,
        "duration": round(total_dur, 3),
        "voiceDuration": round(voice_dur, 3),
        "totalFrames": total_frames,
        "envelope": envelope
    }, f)

print(f"Envelope extracted: {total_frames} frames ({total_dur:.2f}s @ {FPS}fps)")

# 3. Build Stereo Audio Mix (Voice + ekomen77 Procedural SFX + Cozy Cabin Ambience)
random.seed(42)
mix_L = [0.0] * n_total
mix_R = [0.0] * n_total

# Smooth envelope for sidechain ducking
env_duck = [0.0] * n_total
run_sq = 0.0
for i in range(n_total):
    s = voice[i]
    run_sq = 0.9992 * run_sq + 0.0008 * (s * s)
    env_duck[i] = min(1.0, math.sqrt(run_sq) * 4.2)

# Place crisp voice in center
for i in range(n_total):
    v = math.tanh(voice[i] * 1.18)
    mix_L[i] = v
    mix_R[i] = v

def add_sfx(start_sec, s_L, s_R=None, gain=1.0):
    if s_R is None:
        s_R = s_L
    idx0 = int(start_sec * sr)
    for k in range(len(s_L)):
        idx = idx0 + k
        if 0 <= idx < n_total:
            duck = 1.0 - 0.30 * env_duck[idx]
            mix_L[idx] += s_L[k] * gain * duck
            mix_R[idx] += s_R[k] * gain * duck

def gen_pop(freq0=320.0, freq1=680.0, dur=0.11):
    n = int(dur * sr)
    out = []
    phase = 0.0
    for i in range(n):
        t = i / float(sr)
        p = i / float(n)
        f = freq0 + (freq1 - freq0) * (p ** 0.6)
        phase += 2.0 * math.pi * f / sr
        amp = math.sin(math.pi * p) * math.exp(-p * 2.2)
        out.append(math.sin(phase) * amp)
    return out

def gen_whoosh(dur=0.32, f0=140.0, f1=620.0):
    n = int(dur * sr)
    out = []
    lp = 0.0
    for i in range(n):
        p = i / float(n)
        amp = (math.sin(math.pi * p) ** 1.6)
        f = f0 + (f1 - f0) * p
        alpha = min(0.55, 2.0 * math.pi * f / sr)
        w = random.uniform(-1.0, 1.0)
        lp += alpha * (w - lp)
        out.append(lp * amp)
    return out

def gen_error_buzzer(dur=0.45):
    n = int(dur * sr)
    out = []
    for i in range(n):
        t = i / float(sr)
        p = i / float(n)
        # Dual saw-like harsh tech alert pulse
        pulse = 1.0 if (t % 0.22) < 0.16 else 0.2
        sig = (
            math.sin(2 * math.pi * 165.0 * t) * 0.5 +
            math.sin(2 * math.pi * 330.0 * t) * 0.35 +
            math.sin(2 * math.pi * 495.0 * t) * 0.20
        )
        amp = math.exp(-p * 1.5) * pulse
        out.append(sig * amp)
    return out

def gen_lock_thud(dur=0.50):
    n = int(dur * sr)
    out = []
    for i in range(n):
        t = i / float(sr)
        clink = math.exp(-t * 85.0) * math.sin(2 * math.pi * 1950.0 * t) * 0.45
        thud = math.exp(-t * 14.0) * math.sin(2 * math.pi * 72.0 * t) * 0.85
        noise = random.uniform(-0.3, 0.3) * math.exp(-t * 45.0)
        out.append(clink + thud + noise)
    return out

def gen_eureka_chime(dur=1.1):
    n = int(dur * sr)
    out_L, out_R = [], []
    for i in range(n):
        t = i / float(sr)
        # Warm major triad shimmer (C6, E6, G6, B6)
        c1 = math.sin(2 * math.pi * 1046.5 * t) * math.exp(-t * 3.2)
        c2 = math.sin(2 * math.pi * 1318.5 * max(0.0, t - 0.06)) * math.exp(-max(0.0, t - 0.06) * 2.8) * (1 if t > 0.06 else 0)
        c3 = math.sin(2 * math.pi * 1568.0 * max(0.0, t - 0.12)) * math.exp(-max(0.0, t - 0.12) * 2.4) * (1 if t > 0.12 else 0)
        c4 = math.sin(2 * math.pi * 1975.5 * max(0.0, t - 0.18)) * math.exp(-max(0.0, t - 0.18) * 2.0) * (1 if t > 0.18 else 0)
        out_L.append((c1 + c2 * 0.8 + c3 * 0.7 + c4 * 0.6) * 0.4)
        out_R.append((c1 * 0.8 + c2 + c3 * 0.6 + c4 * 0.8) * 0.4)
    return out_L, out_R

# Subtle warm lo-fi cabin background pad + gentle fireplace crackle
for i in range(n_total):
    t = i / float(sr)
    pad = (
        math.sin(2 * math.pi * 110.0 * t) * 0.30 +
        math.sin(2 * math.pi * 164.81 * t) * 0.22 +
        math.sin(2 * math.pi * 220.0 * t) * 0.15 +
        math.sin(2 * math.pi * 261.63 * t) * 0.12
    )
    fade = min(1.0, t / 0.8) * min(1.0, (total_dur - t) / 1.0)
    gain = 0.025 * (1.0 - 0.5 * env_duck[i]) * fade
    mix_L[i] += pad * gain
    mix_R[i] += pad * gain

# ---------------------------------------------------------------------------
# STORY BEATS — edit these timestamps to match your own scene timeline
# ---------------------------------------------------------------------------
add_sfx(0.8, gen_pop(280, 620), gain=0.28)            # "%90 YANILIYOR" badge pop
add_sfx(3.2, gen_pop(350, 740), gain=0.24)            # "SIFIRDAN KOD ASİSTANI?" card
add_sfx(6.0, gen_whoosh(0.28, 160, 580), gain=0.25)   # Snap zoom in
add_sfx(6.6, gen_pop(300, 660), gain=0.26)            # [WEB SİTESİ] pill
add_sfx(7.9, gen_pop(340, 700), gain=0.26)            # [FORM & UI] pill
add_sfx(9.4, gen_pop(380, 760), gain=0.26)            # [BASİT API] pill
add_sfx(11.0, gen_pop(240, 820, 0.15), gain=0.32)     # "ÇOCUK OYUNCAĞI!" stamp
add_sfx(13.2, gen_whoosh(0.35, 520, 150), gain=0.26)  # Camera pull back + mood shift
add_sfx(15.2, gen_error_buzzer(0.42), gain=0.26)      # Error laptop reveal!
add_sfx(17.8, gen_lock_thud(0.45), gain=0.34)         # [KAYNAK KODU KİLİTLİ] lock
add_sfx(19.5, gen_pop(260, 520), gain=0.24)           # [DÖKÜMANTASYON YOK]
add_sfx(21.5, gen_pop(220, 480), gain=0.24)           # [GİZLİ SİSTEM]
add_sfx(24.6, gen_whoosh(0.32, 180, 600), gain=0.24)  # Pan to whiteboard
add_sfx(26.2, gen_pop(320, 680), gain=0.26)           # "GİZLİ HASAR FORMÜLÜ ??" card
add_sfx(29.8, gen_pop(300, 640), gain=0.26)           # "KAPALI ALGORİTMA ??" card
add_sfx(34.8, gen_lock_thud(0.50), gain=0.38)         # "GELENEKSEL YÖNTEMLER KİLİTLENDİ!" red X stamp
add_sfx(37.2, gen_whoosh(0.35, 150, 720), gain=0.28)  # Zoom to REA Hero Scene
chime_L, chime_R = gen_eureka_chime(1.1)
add_sfx(41.0, chime_L, chime_R, gain=0.42)            # "R-E-A: Reverse Engineering Agent" reveal!
add_sfx(44.8, gen_pop(340, 720), gain=0.28)           # "TERSİNE MÜHENDİSLİK AJANI" banner
add_sfx(48.0, gen_pop(380, 780), gain=0.25)           # Final pipeline preview nodes

# Normalize & write stereo WAV
peak = max(max(abs(x) for x in mix_L), max(abs(x) for x in mix_R), 1e-6)
scale = 0.94 / peak if peak > 0.94 else 1.0

pcm = bytearray()
for i in range(n_total):
    l_int = int(max(-32767, min(32767, mix_L[i] * scale * 32767)))
    r_int = int(max(-32767, min(32767, mix_R[i] * scale * 32767)))
    pcm.extend(struct.pack("<hh", l_int, r_int))

with wave.open(mix_wav, "wb") as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(sr)
    wf.writeframes(pcm)

print(f"Audio mix saved successfully: {mix_wav}")
