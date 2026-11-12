import json
import os
import sys
import subprocess
import wave
import numpy as np

# ---------------------------------------------------------------------------
# build_audio_with_sfx.py — voiceover -> audio master + 30 fps RMS envelope
#
# Usage:
#   python build_audio_with_sfx.py <voice file> [prefix] [total duration seconds]
#
#   <voice file>   .mp3 / .wav / .opus / .m4a of your narration
#   [prefix]       base name for the output files (default: "intro")
#   [duration]     optional fixed master length in seconds; if omitted it is
#                  LEAD_IN + voice length + TAIL_HOLD
#
# Outputs (next to this script):
#   <prefix>_voice_48k.wav    normalised mono voice
#   <prefix>_audio_mix.wav    voice + procedural SFX master (mono, 48 kHz)
#   <prefix>_envelope.json    30 fps RMS envelope + timing data for render_video.js
#
# Requires: ffmpeg on PATH, numpy. Edit the STORY BEATS block below to match
# your own scene timeline.
# ---------------------------------------------------------------------------

WORK_DIR = os.path.dirname(os.path.abspath(__file__))

if len(sys.argv) < 2:
    print("Usage: python build_audio_with_sfx.py <voice.mp3|wav|opus|m4a> [prefix] [total_seconds]")
    sys.exit(1)

USER_VOICE = sys.argv[1]
PREFIX = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2].strip() else "intro"
FORCED_DUR = float(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].strip() else None

VOICE_WAV = os.path.join(WORK_DIR, f"{PREFIX}_voice_48k.wav")
MIX_WAV = os.path.join(WORK_DIR, f"{PREFIX}_audio_mix.wav")
ENV_JSON = os.path.join(WORK_DIR, f"{PREFIX}_envelope.json")

SAMPLE_RATE = 48000
FPS = 30
LEAD_IN = 0.30      # 300 ms of silence before the voice starts
TAIL_HOLD = 1.45    # extra hold after the voice ends (let the last stamp breathe)

# --- Timing constants used by the bundled intro template (edit for your video)
BOMB_T = 17.18      # timestamp of the big stamp / impact
SEGMENTS = [
    { "start": 0.35, "end": 4.90 },
    { "start": 5.45, "end": 6.85 },
    { "start": 7.15, "end": 11.80 },
    { "start": 12.10, "end": 14.65 },
    { "start": 14.95, "end": 17.90 }
]

print(f"[1/3] Converting voice to 48 kHz mono PCM WAV from: {USER_VOICE}")
subprocess.run([
    "ffmpeg", "-y", "-i", USER_VOICE,
    "-ar", str(SAMPLE_RATE), "-ac", "1", "-c:a", "pcm_s16le",
    VOICE_WAV
], check=True)

# Read normalized voice
with wave.open(VOICE_WAV, "rb") as wf:
    n_frames = wf.getnframes()
    raw = wf.readframes(n_frames)
    voice_arr = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0

voice_dur = len(voice_arr) / SAMPLE_RATE
TOTAL_DUR = FORCED_DUR if FORCED_DUR else LEAD_IN + voice_dur + TAIL_HOLD
TOTAL_FRAMES = int(TOTAL_DUR * FPS)
print(f"Voice: {voice_dur:.3f}s -> master: {TOTAL_DUR:.2f}s ({TOTAL_FRAMES} frames @ {FPS}fps)")

# Build master buffer
total_samples = int(TOTAL_DUR * SAMPLE_RATE)
master = np.zeros(total_samples, dtype=np.float32)

# Place voice with LEAD_IN
voice_start = int(LEAD_IN * SAMPLE_RATE)
voice_end = min(total_samples, voice_start + len(voice_arr))
master[voice_start:voice_end] += voice_arr[:voice_end - voice_start]

# PROCEDURAL SFX GENERATOR
def add_sfx(buf, t_start, sfx_data, gain=1.0):
    idx = int(t_start * SAMPLE_RATE)
    end = min(len(buf), idx + len(sfx_data))
    buf[idx:end] += sfx_data[:end - idx] * gain

def gen_pop(dur=0.09, freq0=320, freq1=760):
    n = int(dur * SAMPLE_RATE)
    t = np.linspace(0, dur, n)
    freq = np.linspace(freq0, freq1, n)
    env = np.exp(-t * 42.0)
    sig = np.sin(2 * np.pi * freq * t) * env
    return sig.astype(np.float32)

def gen_whoosh(dur=0.45):
    n = int(dur * SAMPLE_RATE)
    noise = np.random.randn(n)
    t = np.linspace(0, 1, n)
    env = np.sin(np.pi * t) ** 2
    sig = np.convolve(noise, np.ones(55)/55, mode='same') * env
    return sig.astype(np.float32) * 0.7

def gen_ding(dur=0.45, freq=880):
    n = int(dur * SAMPLE_RATE)
    t = np.linspace(0, dur, n)
    env = np.exp(-t * 8.5)
    sig = (np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * freq * 2 * t)) * env
    return sig.astype(np.float32) * 0.65

def gen_heavy_impact(dur=0.75):
    n = int(dur * SAMPLE_RATE)
    t = np.linspace(0, dur, n)
    freq = np.linspace(115, 34, n)
    env = np.exp(-t * 6.0)
    bass = np.sin(2 * np.pi * freq * t) * env
    noise = np.random.randn(n) * np.exp(-t * 26.0) * 0.45
    sig = (bass * 0.85 + noise)
    return sig.astype(np.float32)

# ---------------------------------------------------------------------------
# STORY BEATS — edit these timestamps to match your own scene timeline.
# Times are seconds from the start of the master; each call layers one
# procedural SFX under the voice.
# ---------------------------------------------------------------------------
# 1. Pop when a speech bubble appears
add_sfx(master, 1.30, gen_pop(), gain=0.35)
# 2. Confession snap-zoom chime
add_sfx(master, 5.48, gen_ding(freq=740), gain=0.42)
# 3. Transition sweep from Studio to Chalkboard
add_sfx(master, 7.00, gen_whoosh(), gain=0.45)
# 4. Checkmark pass ding
add_sfx(master, 12.95, gen_ding(freq=987), gain=0.42)
# 5. Heavy Stamp impact on the final "bomba!" beat
add_sfx(master, BOMB_T, gen_heavy_impact(), gain=0.88)

# Normalize audio
peak = np.max(np.abs(master))
if peak > 0.95:
    master = master * (0.95 / peak)

# Write master WAV
with wave.open(MIX_WAV, "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(SAMPLE_RATE)
    wf.writeframes((master * 32767.0).astype(np.int16).tobytes())

print(f"[2/3] Wrote master audio mix: {MIX_WAV} ({len(master)/SAMPLE_RATE:.2f}s)")

# Compute mouth flap envelope per video frame (30 fps)
samples_per_frame = SAMPLE_RATE / FPS
envelope = []
for f in range(TOTAL_FRAMES):
    s_idx = int(f * samples_per_frame)
    e_idx = int((f + 1) * samples_per_frame)
    chunk = master[s_idx:e_idx]
    if len(chunk) > 0:
        rms = float(np.sqrt(np.mean(chunk**2)))
    else:
        rms = 0.0
    envelope.append(round(min(1.0, rms * 4.0), 3))

timing_data = {
    "fps": FPS,
    "duration": TOTAL_DUR,
    "totalFrames": TOTAL_FRAMES,
    "bomb_t": BOMB_T,
    "timing": {
        "duration": TOTAL_DUR,
        "segments": SEGMENTS
    },
    "envelope": envelope
}

with open(ENV_JSON, "w", encoding="utf-8") as f:
    json.dump(timing_data, f, indent=2)

print(f"[3/3] Saved envelope JSON: {ENV_JSON} ({len(envelope)} frames)")
