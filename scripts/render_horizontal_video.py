# -*- coding: utf-8 -*-
"""
scripts/render_horizontal_video.py
横型動画（16:9, 1280x720）の高品位レンダリングスクリプト（完全調整版）
カラーグレーディング、1秒ディゾルブ、ライトリーク、游明朝体テロップ、マスター音声を合成。
"""

import subprocess
import os
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

base_dir = r"sample_data\LP"
s1_video = os.path.join(base_dir, "scene1.mp4")
s2_video = os.path.join(base_dir, "scene2.mp4")
s3_video = os.path.join(base_dir, "scene3.mp4")
audio_track = os.path.join(base_dir, "master_audio_timeline.wav")
output_video = os.path.join(base_dir, "sumairu_concept_horizontal_16x9.mp4")

font_file = "C\\:/Windows/Fonts/yumindb.ttf"

def p(f):
    return os.path.join(base_dir, f).replace("\\", "/")

# Color grading
g1 = "eq=contrast=0.92:saturation=0.82,colorbalance=rs=-0.08:gs=0.0:bs=0.15:rm=-0.05:gm=0.0:bm=0.1"
g2 = "eq=contrast=1.05:saturation=1.02,colorbalance=rs=0.02:gs=0.02:bs=0.02"
g3 = "eq=contrast=1.08:saturation=1.15,colorbalance=rh=0.12:gh=0.04:bh=-0.08:rm=0.08:gm=0.02:bm=-0.04"

# Subtitle overlays with fade in/out
sub_s1 = (
    f"drawtext=fontfile='{font_file}':textfile='{p('h_s1.txt')}':fontsize=42:fontcolor=white:"
    f"shadowcolor=black@0.85:shadowx=2:shadowy=3:box=1:boxcolor=black@0.50:boxborderw=16:"
    f"x=(w-text_w)/2:y=h-text_h-85:"
    f"alpha='if(lt(t,1.5),0,if(lt(t,2.2),(t-1.5)/0.7,if(lt(t,8.0),1,if(lt(t,8.8),(8.8-t)/0.8,0))))'"
)

sub_s2_a = (
    f"drawtext=fontfile='{font_file}':textfile='{p('h_s2_sub.txt')}':fontsize=30:fontcolor=#FDE68A:"
    f"shadowcolor=black@0.85:shadowx=2:shadowy=2:box=1:boxcolor=black@0.45:boxborderw=10:"
    f"x=(w-text_w)/2:y=h-text_h-135:"
    f"alpha='if(lt(t,10.2),0,if(lt(t,10.9),(t-10.2)/0.7,if(lt(t,17.2),1,if(lt(t,17.8),(17.8-t)/0.6,0))))'"
)
sub_s2_b = (
    f"drawtext=fontfile='{font_file}':textfile='{p('h_s2_main.txt')}':fontsize=38:fontcolor=white:"
    f"shadowcolor=black@0.85:shadowx=2:shadowy=3:box=1:boxcolor=black@0.50:boxborderw=14:"
    f"x=(w-text_w)/2:y=h-text_h-75:"
    f"alpha='if(lt(t,10.6),0,if(lt(t,11.3),(t-10.6)/0.7,if(lt(t,17.2),1,if(lt(t,17.8),(17.8-t)/0.6,0))))'"
)

sub_s3_a = (
    f"drawtext=fontfile='{font_file}':textfile='{p('h_s3_main.txt')}':fontsize=46:fontcolor=white:"
    f"shadowcolor=black@0.85:shadowx=2:shadowy=3:box=1:boxcolor=black@0.50:boxborderw=16:"
    f"x=(w-text_w)/2:y=h-text_h-125:"
    f"alpha='if(lt(t,19.6),0,if(lt(t,20.4),(t-19.6)/0.8,if(lt(t,27.0),1,if(lt(t,27.8),(27.8-t)/0.8,0))))'"
)
sub_s3_b = (
    f"drawtext=fontfile='{font_file}':textfile='{p('h_s3_spec.txt')}':fontsize=27:fontcolor=#FDE047:"
    f"shadowcolor=black@0.85:shadowx=2:shadowy=2:box=1:boxcolor=black@0.45:boxborderw=10:"
    f"x=(w-text_w)/2:y=h-text_h-80:"
    f"alpha='if(lt(t,20.5),0,if(lt(t,21.2),(t-20.5)/0.7,if(lt(t,27.0),1,if(lt(t,27.8),(27.8-t)/0.8,0))))'"
)
sub_s3_c = (
    f"drawtext=fontfile='{font_file}':textfile='{p('h_s3_brand.txt')}':fontsize=34:fontcolor=#6EE7B7:"
    f"shadowcolor=black@0.85:shadowx=2:shadowy=2:box=1:boxcolor=black@0.50:boxborderw=12:"
    f"x=(w-text_w)/2:y=h-text_h-30:"
    f"alpha='if(lt(t,21.2),0,if(lt(t,22.0),(t-21.2)/0.8,if(lt(t,27.0),1,if(lt(t,27.8),(27.8-t)/0.8,0))))'"
)

# Filter graph
filter_complex = (
    f"[0:v]{g1}[v1];"
    f"[1:v]{g2}[v2];"
    f"[2:v]{g3}[v3];"
    f"[v1][v2]xfade=transition=fade:duration=1.0:offset=9.0[v12];"
    f"[v12][v3]xfade=transition=fadewhite:duration=1.0:offset=18.0[v_base];"
    f"[v_base]{sub_s1},{sub_s2_a},{sub_s2_b},{sub_s3_a},{sub_s3_b},{sub_s3_c}[v_final]"
)

cmd = [
    "ffmpeg", "-y",
    "-i", s1_video,
    "-i", s2_video,
    "-i", s3_video,
    "-i", audio_track,
    "-filter_complex", filter_complex,
    "-map", "[v_final]",
    "-map", "3:a",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-t", "28.0",
    output_video
]

print("Starting ffmpeg horizontal render...")
subprocess.run(cmd, check=True)
print(f"SUCCESS: Rendered horizontal video: {output_video}")
