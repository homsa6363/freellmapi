import os
import sys
import subprocess

# ---------------------------------------------------------------------------
# ses_degistir.py — one-command voice swap ("ses değiştir" = swap voice)
#
# Usage:
#   python ses_degistir.py <new voice file> [prefix]
#
# Rebuilds the audio mix + envelope from the new voiceover and re-renders the
# 1080p MP4. The project files (<prefix>_animation.html etc.) must sit in the
# same folder as this script. Default prefix: "intro".
# ---------------------------------------------------------------------------

WORK_DIR = os.path.dirname(os.path.abspath(__file__))

def swap_voice(input_audio_path, prefix="intro"):
    if not os.path.exists(input_audio_path):
        print(f"ERROR: voice file not found: {input_audio_path}")
        return False

    print(f"[1/3] Rebuilding audio from new voice: {input_audio_path}")
    script_sfx = os.path.join(WORK_DIR, "build_audio_with_sfx.py")
    subprocess.run([sys.executable, script_sfx, input_audio_path, prefix], check=True)

    print("[2/3] Rendering 1080p MP4...")
    script_render = os.path.join(WORK_DIR, "render_video.js")
    subprocess.run(["node", script_render, prefix, WORK_DIR], check=True)

    print("[3/3] DONE! Look in the out/ folder for the new video.")
    return True

if __name__ == "__main__":
    if len(sys.argv) > 1:
        prefix = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2].strip() else "intro"
        swap_voice(sys.argv[1], prefix)
    else:
        print("Usage: python ses_degistir.py <voice file> [prefix]")
