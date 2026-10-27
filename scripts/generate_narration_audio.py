# -*- coding: utf-8 -*-
"""
住ま居る AI知見動画 高品質日本語ナレーション音声 ＆ FFmpeg動画合成パイプライン
Microsoft Neural Voice (edge-tts) × FFmpeg
"""
import os
import sys
import json
import asyncio
import subprocess
import argparse
import edge_tts

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORTAL_JSON = os.path.join(BASE_DIR, 'public', 'data', 'knowledge_video_portal_data.json')
AUDIO_BASE = os.path.join(BASE_DIR, 'public', 'videos', 'veo3', 'audio')
VIDEO_BASE = os.path.join(BASE_DIR, 'public', 'videos', 'veo3')
FINAL_BASE = os.path.join(BASE_DIR, 'public', 'videos', 'veo3', 'final')

# 利用可能な最高峰Neural日本語音声モデル（Edge-TTS公式モデル）
VOICES = {
    'female': 'ja-JP-NanamiNeural',   # 聞き取りやすく洗練された女性アナウンサー声
    'male': 'ja-JP-KeitaNeural',       # 誠実で信頼感のある男性建築士声
    'warm': 'ja-JP-NanamiNeural'       # 柔らかなトーン（七海・ナチュラル）
}

from phonetic_dict import normalize_phonetics

async def generate_single_audio(item_id, voice_type='female', speed_rate='+10%', custom_text=None):
    """指定された知見IDのナレーション音声を専門用語発音辞書で正規化して生成し、動画があればFFmpegで結合"""
    if not os.path.exists(PORTAL_JSON):
        raise FileNotFoundError("Portal JSON not found")

    with open(PORTAL_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)

    item = next((i for i in data['items'] if i['id'] == item_id), None)
    if not item:
        raise ValueError(f"Item not found: {item_id}")

    raw_text = custom_text or item.get('narrationJa') or item.get('question', '')
    # 専門用語・単位・記号を自然なアナウンサー発音に変換
    narration_text = normalize_phonetics(raw_text)
    genre = item['genre']
    subfolder = 'madori' if genre == 'madori' else 'thermal'

    voice = VOICES.get(voice_type, VOICES['female'])
    out_audio_dir = os.path.join(AUDIO_BASE, subfolder)
    os.makedirs(out_audio_dir, exist_ok=True)
    out_audio_path = os.path.join(out_audio_dir, f"{item_id}.mp3")

    # 1. edge-tts で最高品質日本語音声を生成（warmは落ち着いたトーンに調整）
    if voice_type == 'warm':
        comm = edge_tts.Communicate(narration_text, 'ja-JP-NanamiNeural', pitch='-2Hz', rate='+2%')
    else:
        comm = edge_tts.Communicate(narration_text, voice, rate=speed_rate)

    await comm.save(out_audio_path)
    audio_size = os.path.getsize(out_audio_path)
    print(f"[VoiceGen] Audio generated: {out_audio_path} ({audio_size} bytes)")
    print(f"[VoiceGen] Phonetic text spoken: {narration_text}")

    # 2. 対応するVeo 3動画が存在するか確認
    raw_video_path = os.path.join(VIDEO_BASE, subfolder, f"{item_id}.mp4")
    final_video_path = None

    if os.path.exists(raw_video_path):
        out_final_dir = os.path.join(FINAL_BASE, subfolder)
        os.makedirs(out_final_dir, exist_ok=True)
        final_video_path = os.path.join(out_final_dir, f"{item_id}_final.mp4")

        # 3. FFmpegで映像（10秒）と音声を結合 (-map 0:v:0 -map 1:a:0 で確実に音声を結合)
        cmd = [
            'ffmpeg', '-y',
            '-i', raw_video_path,
            '-i', out_audio_path,
            '-map', '0:v:0',
            '-map', '1:a:0',
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-shortest',
            final_video_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode == 0:
            print(f"[FFmpeg] Combined final video: {final_video_path}")
        else:
            print(f"[FFmpeg Warning] Combine failed: {res.stderr.decode('utf-8', errors='ignore')}")
            final_video_path = None

    web_audio_path = f"/videos/veo3/audio/{subfolder}/{item_id}.mp3"
    web_final_path = f"/videos/veo3/final/{subfolder}/{item_id}_final.mp4" if final_video_path else None

    return {
        "success": True,
        "itemId": item_id,
        "audioPath": web_audio_path,
        "finalVideoPath": web_final_path,
        "narrationText": narration_text,
        "voice": voice
    }

async def combine_video_with_audio(item_id, voice_type='female'):
    """Veo 3無音動画とナレーション音声をFFmpegで結合し、元動画をraw_archiveへ退避"""
    import shutil
    with open(PORTAL_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)

    item = next((i for i in data['items'] if i['id'] == item_id), None)
    if not item:
        raise ValueError(f"Item not found: {item_id}")

    genre = item['genre']
    subfolder = 'madori' if genre == 'madori' else 'thermal'
    alt_subfolder = 'thermal' if subfolder == 'madori' else 'madori'

    video_file = os.path.join(VIDEO_BASE, subfolder, f"{item_id}.mp4")
    alt_video_file = os.path.join(VIDEO_BASE, alt_subfolder, f"{item_id}.mp4")
    raw_archive_dir = os.path.join(VIDEO_BASE, 'raw_archive', subfolder)
    os.makedirs(raw_archive_dir, exist_ok=True)
    raw_archive_file = os.path.join(raw_archive_dir, f"{item_id}_raw.mp4")
    alt_raw_file = os.path.join(VIDEO_BASE, 'raw_archive', alt_subfolder, f"{item_id}_raw.mp4")

    # もし raw_archive_file が既にある場合はそこから再結合可能
    source_video = None
    if os.path.exists(video_file):
        source_video = video_file
    elif os.path.exists(raw_archive_file):
        source_video = raw_archive_file
    elif os.path.exists(alt_video_file):
        # 逆側のフォルダにアップロードされていた場合は自動救済コピー
        print(f"[Auto Recover] {alt_video_file} から {video_file} へ救済同期します")
        shutil.copy2(alt_video_file, video_file)
        source_video = video_file
    elif os.path.exists(alt_raw_file):
        source_video = alt_raw_file
    else:
        raise FileNotFoundError(f"動画ファイルが見つかりません。先にVeo 3からダウンロードして配置してください: {video_file}")

    # 音声ファイル確認（無ければ自動生成）
    audio_path = os.path.join(AUDIO_BASE, subfolder, f"{item_id}.mp3")
    if not os.path.exists(audio_path):
        print(f"[Combine] Audio not found, generating: {audio_path}")
        await generate_single_audio(item_id, voice_type)

    # 1. 保存先ディレクトリの準備
    final_dir = os.path.join(FINAL_BASE, subfolder)
    os.makedirs(final_dir, exist_ok=True)
    final_video_file = os.path.join(final_dir, f"{item_id}_final.mp4")

    # 2. 元動画を raw_archive に安全にバックアップ（コピーなのでロックされない）
    if source_video == video_file and not os.path.exists(raw_archive_file):
        try:
            shutil.copyfile(video_file, raw_archive_file)
            print(f"[Archive] 元動画をバックアップしました: {raw_archive_file}")
        except Exception as e:
            print(f"[Archive Notice] バックアップスキップ: {e}")

    # 3. FFmpeg結合実行（直接 final_video_file へ出力することで、ファイルロックやmoveの競合を完全に回避）
    cmd = [
        'ffmpeg', '-y',
        '-i', source_video,
        '-i', audio_path,
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        final_video_file
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        err_msg = res.stderr.decode('utf-8', errors='ignore')
        raise RuntimeError(f"FFmpeg合成エラー: {err_msg}")

    # 4. 元動画ファイル（video_file）への同期コピー（ブラウザがオープン中の場合は安全にスキップ）
    try:
        if os.path.abspath(final_video_file) != os.path.abspath(video_file):
            shutil.copyfile(final_video_file, video_file)
            print(f"[Sync] メイン動画を更新しました: {video_file}")
    except PermissionError:
        print(f"[Sync Notice] メイン動画は現在ブラウザで再生中のため、final動画のみを更新しました。")
    except Exception as se:
        print(f"[Sync Warning]: {se}")

    file_size = os.path.getsize(final_video_file)
    rel_final_url = f"/videos/veo3/final/{subfolder}/{item_id}_final.mp4"
    return {
        "success": True,
        "itemId": item_id,
        "videoPath": rel_final_url,
        "archivePath": f"/videos/veo3/raw_archive/{subfolder}/{item_id}_raw.mp4",
        "sizeBytes": file_size
    }

async def generate_batch_audio(genre=None, voice_type='female', limit=None):
    """一括生成"""
    with open(PORTAL_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)

    items = data['items']
    if genre:
        items = [i for i in items if i['genre'] == genre]
    if limit:
        items = items[:int(limit)]

    print(f"Starting batch audio generation for {len(items)} items...")
    results = []
    for idx, it in enumerate(items):
        try:
            res = await generate_single_audio(it['id'], voice_type)
            results.append(res)
            print(f"[{idx+1}/{len(items)}] Done: {it['id']}")
        except Exception as e:
            print(f"[{idx+1}/{len(items)}] Error {it['id']}: {e}")
        await asyncio.sleep(0.1)

    return results

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="住ま居る AI知見動画 ナレーション音声生成")
    parser.add_argument('--id', type=str, help="知見ID（例: k_01, th_ins_01）")
    parser.add_argument('--all', action='store_true', help="全件一括生成")
    parser.add_argument('--genre', type=str, choices=['madori', 'thermal'], help="ジャンル指定一括生成")
    parser.add_argument('--voice', type=str, default='female', choices=['female', 'male', 'warm'])
    parser.add_argument('--limit', type=int, help="生成件数上限")

    args = parser.parse_args()

    if args.id:
        res = asyncio.run(generate_single_audio(args.id, args.voice))
        print("Result:", json.dumps(res, ensure_ascii=False, indent=2))
    elif args.all or args.genre:
        results = asyncio.run(generate_batch_audio(args.genre, args.voice, args.limit))
        print(f"Completed {len(results)} audio files.")
    else:
        print("Usage: python scripts/generate_narration_audio.py --id k_01 または --genre madori --limit 10")
