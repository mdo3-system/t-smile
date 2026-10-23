# -*- coding: utf-8 -*-
import os
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARCHIVE_DIR = os.path.join(BASE_DIR, 'archive')

os.makedirs(ARCHIVE_DIR, exist_ok=True)

KEEP_FILES = {
    'verify_system_health.py',
    'build_site.py',
    'build_case_pages.py',
    'build_knowledge_corpus.py',
    'build_madori_sketch.py',
    'build_saitama_63_subsidy_db.py',
    'build_speedplanner.py',
    'build_static_lps.py',
    'build_video_portal_data.py',
    'phonetic_dict.py',
    'generate_narration_audio.py',
    'deploy.py',
    'server.py',
    'google_drive_migration.py',
    'archive_legacy_scripts.py'
}

count = 0
for fname in os.listdir(BASE_DIR):
    fpath = os.path.join(BASE_DIR, fname)
    if os.path.isdir(fpath):
        continue
    if fname in KEEP_FILES:
        continue
    # Move to archive
    dest = os.path.join(ARCHIVE_DIR, fname)
    shutil.move(fpath, dest)
    count += 1

print(f"Archived {count} legacy scripts to scripts/archive/")
