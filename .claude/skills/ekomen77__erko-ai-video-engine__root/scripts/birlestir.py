import os
import sys
import subprocess
import glob

# ---------------------------------------------------------------------------
# birlestir.py — losslessly merge chapter videos ("birleştir" = merge)
#
# Usage:
#   python birlestir.py                       auto-detect chapter_*.mp4 in this folder
#   python birlestir.py a.mp4 b.mp4 ...       explicit input list
#   python birlestir.py out.mp4               single argument = output name (auto inputs)
#
# The merged file is written to <folder>/out/<output name> (default: full_video.mp4)
# ---------------------------------------------------------------------------

WORK_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(WORK_DIR, "out")

def collect_inputs():
    files = sorted(glob.glob(os.path.join(WORK_DIR, "chapter_*.mp4")))
    if not files:
        files = sorted(glob.glob(os.path.join(WORK_DIR, "bolum_*.mp4")))
    return files

def merge_videos(video_files, output_filename="full_video.mp4"):
    if not video_files:
        print("ERROR: no videos found to merge.")
        print("Name them chapter_01.mp4, chapter_02.mp4 ... or pass them as arguments:")
        print("  python birlestir.py video1.mp4 video2.mp4 video3.mp4")
        return False

    print(f"[1/2] {len(video_files)} video(s) queued:")
    for v in video_files:
        print(f"  + {os.path.basename(v)}")

    os.makedirs(OUT_DIR, exist_ok=True)
    list_file = os.path.join(OUT_DIR, "concat_list.txt")
    with open(list_file, "w", encoding="utf-8") as f:
        for v in video_files:
            # Escape path for ffmpeg
            clean_p = os.path.abspath(v).replace("\\", "/")
            f.write(f"file '{clean_p}'\n")

    out_path = os.path.join(OUT_DIR, output_filename)
    print(f"[2/2] Merging losslessly with FFmpeg -> {out_path}")

    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", list_file,
        "-c", "copy",
        out_path
    ], check=True)
    if os.path.exists(list_file):
        os.remove(list_file)

    print(f"DONE! Merged video: {out_path}")
    return True

if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) == 1 and args[0].lower().endswith(".mp4"):
        merge_videos(collect_inputs(), args[0])
    elif args:
        merge_videos(args)
    else:
        merge_videos(collect_inputs())
