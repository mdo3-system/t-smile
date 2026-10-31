# -*- coding: utf-8 -*-
import subprocess
import os

base_dir = r"sample_data\LP"

def p(f):
    return os.path.join(base_dir, f).replace("\\", "/")

font_path = "C:/Windows/Fonts/yumindb.ttf"

vf_h = (
    "[0:v]format=yuv420p,eq=contrast=0.92:brightness=-0.04:saturation=0.82,"
    "colorbalance=rs=-0.06:gs=-0.02:bs=0.08:rh=-0.04:gh=0.0:bh=0.06,"
    f"drawtext=fontfile='{font_path}':textfile='{p('h_s1.txt')}':fontsize=36:fontcolor=white:"
    "box=1:boxcolor=black@0.45:boxborderw=10:x=(w-text_w)/2:y=h-110:enable='between(t,1.2,8.8)'[v0];"
    
    "[1:v]format=yuv420p,eq=contrast=1.06:brightness=0.01:saturation=1.02,"
    "colorbalance=rs=0.02:gs=0.02:bs=-0.02,"
    f"drawtext=fontfile='{font_path}':textfile='{p('h_s2_1.txt')}':fontsize=38:fontcolor=white:"
    "box=1:boxcolor=black@0.45:boxborderw=10:x=(w-text_w)/2:y=h-145:enable='between(t,0.5,8.8)',"
    f"drawtext=fontfile='{font_path}':textfile='{p('h_s2_2.txt')}':fontsize=38:fontcolor=#38bdf8:"
    "box=1:boxcolor=black@0.45:boxborderw=10:x=(w-text_w)/2:y=h-90:enable='between(t,2.2,8.8)'[v1];"
    
    "[2:v]tpad=stop_mode=clone:stop_duration=2.5,format=yuv420p,eq=contrast=1.12:brightness=0.03:saturation=1.18,"
    "colorbalance=rs=0.08:gs=0.04:bs=-0.04:rh=0.06:gh=0.02:bh=-0.03,"
    f"drawtext=fontfile='{font_path}':textfile='{p('h_s3_main.txt')}':fontsize=42:fontcolor=white:"
    "box=1:boxcolor=black@0.45:boxborderw=12:x=(w-text_w)/2:y=h-150:enable='between(t,0.8,11.5)',"
    f"drawtext=fontfile='{font_path}':textfile='{p('h_s3_spec.txt')}':fontsize=26:fontcolor=#fde047:"
    "box=1:boxcolor=black@0.45:boxborderw=8:x=(w-text_w)/2:y=h-85:enable='between(t,2.5,11.5)'[v2];"
    
    "[v0][v1]xfade=transition=dissolve:duration=1.0:offset=9.03[trans1];"
    "[trans1][v2]xfade=transition=fadefast:duration=1.0:offset=18.06[v_full];"
    "[v_full]fade=t=in:st=0:d=0.8,fade=t=out:st=28.2:d=1.8[v_out]"
)

out_h = p("sumairu_concept_horizontal_16x9.mp4")
cmd_h = [
    "ffmpeg", "-y",
    "-i", p("scene1.mp4"),
    "-i", p("scene2.mp4"),
    "-i", p("scene3.mp4"),
    "-i", p("master_dialogue_30s.wav"),
    "-filter_complex", vf_h,
    "-map", "[v_out]",
    "-map", "3:a",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18",
    "-c:a", "aac", "-b:a", "256k",
    "-t", "30.00",
    out_h
]
res = subprocess.run(cmd_h, capture_output=True, text=True)
print("Returncode:", res.returncode)
if res.returncode != 0:
    print("Stderr:", res.stderr[-2000:])
else:
    print("Horizontal success!")

