# -*- coding: utf-8 -*-
"""
400件の知見データ（設計プロの知見200 ＋ 温熱換気相談200）を統合し、
Veo 3用10秒動画プロンプト、YouTubeタイトル・概要欄、SNS最適化投稿文を
自動生成して knowledge_video_portal_data.json を構築するスクリプト
"""

import json
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MADORI_JSON = os.path.join(BASE_DIR, 'public', 'data', 'qa_knowledge_100.json')
THERMAL_JSON = os.path.join(BASE_DIR, 'public', 'data', 'thermal_qa_200.json')
OUTPUT_JSON = os.path.join(BASE_DIR, 'public', 'data', 'knowledge_video_portal_data.json')
EXISTING_LINKS = os.path.join(BASE_DIR, 'public', 'data', 'knowledge_video_links.json')

# 既存のリンクデータがあればロードして維持
existing_map = {}
if os.path.exists(EXISTING_LINKS):
    try:
        with open(EXISTING_LINKS, 'r', encoding='utf-8') as f:
            existing_map = json.load(f)
    except Exception as e:
        print("Could not load existing links:", e)

with open(MADORI_JSON, 'r', encoding='utf-8') as f:
    madori_data = json.load(f).get('questions', [])

with open(THERMAL_JSON, 'r', encoding='utf-8') as f:
    thermal_data = json.load(f).get('questions', [])

items = []

# 1. 設計プロの知見200 (madori)
for idx, q in enumerate(madori_data, 1):
    qid = q.get('id', f'k_{idx:02d}')
    cat = q.get('category', 'general')
    cat_name = q.get('categoryName', '設計プロの知見')
    # 絵文字を除去したクリーンカテゴリ名
    cat_clean = re.sub(r'[^\w\s・/]', '', cat_name).strip()
    question = q.get('question', '').strip()
    short_ans = q.get('shortAnswer', '').strip()
    dim = q.get('dimension', '').strip()
    details = q.get('details', '').strip()
    img = q.get('image', '')
    
    # 図解ファイルの実パスチェック
    local_img_path = os.path.join(BASE_DIR, 'public', img.lstrip('/')) if img else ''
    has_image = os.path.exists(local_img_path) if local_img_path else False

    # 既存の動画URLやステータスがあれば引き継ぎ
    ext = existing_map.get(qid, {})
    youtube_url = ext.get('youtubeUrl', '')
    veo_video_path = ext.get('veoVideoPath', f'videos/veo3/madori_{qid}.mp4')
    status = ext.get('status', 'unstarted' if not youtube_url else 'youtube_uploaded')

    # Veo 3 10秒動画用プロンプト (YouTube Shorts / Instagram リール用 縦型9:16 完全指定)
    veo_prompt_ja = f"【10秒建築ショート縦型動画（9:16）】日本の美しい高気密高断熱注文住宅の内観。テーマ「{cat_clean}: {question}」。黄金寸法は{dim}。清潔感のあるモダンな空間で、居住者（自然な動作やシルエット）が心地よく過ごす様子、カメラが滑らかにドリー移動し、通路や家具の寸法ガイドラインが美しく光る洗練された建築3Dビジュアライゼーション。自然光が差し込む上質な住まい。縦型構図 9:16, 1080x1920, 60fps, photorealistic vertical architectural video, human scale silhouette, glowing dimension lines, 10 seconds."

    # YouTube設定
    yt_title = f"【家づくりの黄金寸法】{question}｜設計プロの知見 #{idx}"
    if len(yt_title) > 60:
        yt_title = yt_title[:57] + '...'
    
    yt_desc = f"""【注文住宅・失敗しない間取りの知見 #{idx}】
{question}
💡 結論: {short_ans}
📏 基準寸法: {dim}

▼ この知見の詳細解説と全200件の設計データベースはこちら（完全無料・登録不要）
👉 https://www.t-smile.co.jp/madori-consultation/
👉 または展示場トップ: https://www.t-smile.co.jp/#madori-consultation-bot

{details[:160]}...

--------------------------------------------------
株式会社住ま居る（埼玉県鶴ヶ島市・川越市・坂戸市）
創業30年・800棟の高気密高断熱注文住宅
公式HP: https://www.t-smile.co.jp/
--------------------------------------------------
#注文住宅 #間取り #設計 #住ま居る #家づくり #ルームツアー #マイホーム計画"""

    # X (Twitter) ポスト文 (140文字以内)
    x_post = f"【家づくりの黄金比 #{idx}】\nQ: {question}\n\n👉 結論: {short_ans}\n（基準寸法: {dim}）\n\n知っておくだけで後悔を防げる設計のプロの知見200選はこちら👇\nhttps://www.t-smile.co.jp/madori-consultation/\n#注文住宅 #間取り"
    if len(x_post) > 140:
        x_post = f"【家づくりの黄金比 #{idx}】\nQ: {question[:35]}...\n\n👉 結論: {short_ans[:40]}...\n（{dim}）\n\n設計プロの知見200選👇\nhttps://www.t-smile.co.jp/madori-consultation/\n#注文住宅"

    # Instagram リール キャプション
    insta_caption = f"""家づくりの黄金比率 #{idx} 🏠✨
「{question}」

家づくりで多くの施主様が悩むこのポイント。
設計のプロが出した答えは…

💡【結論】
{short_ans}
（推奨寸法: {dim}）

後から変えられない寸法だからこそ、図面段階でしっかり押さえておきたい基準です📐

───────────────
プロの設計知見全200選はプロフィールのリンクから！
webで図解付きで全公開しています📖
@sumairu_house
───────────────
#注文住宅 #間取りの工夫 #マイホーム計画中の人と繋がりたい #家づくりアイデア #新築一戸建て #後悔しない家づくり #住ま居る"""

    # Threads 投稿文
    threads_post = f"""家づくりの寸法、ここ失敗しやすいです👇

Q. {question}

A. {short_ans}
（基準寸法: {dim}）

実際に住んでから「狭かった」「広すぎて使いづらい」となりがちな場所。
図面チェックの参考に保存しておいてくださいね📐

設計プロの知見200選まとめはプロフURLからご覧いただけます！"""

    items.append({
        "id": qid,
        "genre": "madori",
        "genreLabel": "設計プロの知見200",
        "category": cat,
        "categoryName": cat_clean,
        "questionNumber": idx,
        "question": question,
        "shortAnswer": short_ans,
        "dimension": dim,
        "details": details,
        "image": img,
        "hasImage": has_image,
        "topUrl": "/madori-consultation/",
        "portalAnchor": f"/#madori-consultation-bot",
        "youtubeUrl": youtube_url,
        "youtubeVideoId": ext.get('youtubeVideoId', ''),
        "veoVideoPath": veo_video_path,
        "status": status,
        "veoPromptJa": veo_prompt_ja,
        "youtubeTitle": yt_title,
        "youtubeDesc": yt_desc,
        "xPost": x_post,
        "instaCaption": insta_caption,
        "threadsPost": threads_post
    })

# 2. 温熱換気相談200 (thermal)
for idx, q in enumerate(thermal_data, 1):
    qid = q.get('id', f'th_{idx:03d}')
    cat = q.get('category', 'thermal')
    cat_name = q.get('categoryName', '温熱換気・性能設計')
    cat_clean = re.sub(r'[^\w\s・/]', '', cat_name).strip()
    question = q.get('question', '').strip()
    short_ans = q.get('shortAnswer', '').strip()
    dim = q.get('dimension', '').strip()
    details = q.get('details', '').strip()
    principle = q.get('principle', '').strip()
    advice = q.get('architectAdvice', '').strip()
    img = f"/images/knowledge/thermal_{cat}.jpg" # デフォルト/カテゴリ画像
    
    local_img_path = os.path.join(BASE_DIR, 'public', img.lstrip('/'))
    has_image = os.path.exists(local_img_path)

    ext = existing_map.get(qid, {})
    youtube_url = ext.get('youtubeUrl', '')
    veo_video_path = ext.get('veoVideoPath', f'videos/veo3/thermal_{qid}.mp4')
    status = ext.get('status', 'unstarted' if not youtube_url else 'youtube_uploaded')

    # Veo 3 10秒動画用プロンプト (YouTube Shorts / Instagram リール用 縦型9:16 完全指定)
    veo_prompt_ja = f"【10秒建築物理・温熱性能 縦型動画（9:16）】日本の最高等級・超高気密高断熱住宅の科学的解説。テーマ「{cat_clean}: {question}」。目安値: {dim}。冬暖かく夏涼しい空気の流れと断熱材の断面、快適な室温グラデーションを可視化した美しい3D建築CGアニメーション。縦型構図 9:16, 1080x1920, 60fps, vertical architectural science visual, thermal airflow, 10 seconds."

    yt_title = f"【温熱・換気性能の科学】{question}｜家づくり温熱相談 #{idx}"
    if len(yt_title) > 60:
        yt_title = yt_title[:57] + '...'

    yt_desc = f"""【高気密・高断熱・換気の科学的真実 #{idx}】
{question}
💡 結論: {short_ans}
📊 基準・目標値: {dim}

▼ この温熱換気知見の個別解説と全200問の性能データベースはこちら（完全無料）
👉 https://www.t-smile.co.jp/performance/
👉 個別詳細: https://www.t-smile.co.jp/knowledge/thermal/{qid}.html

{details[:160]}...

--------------------------------------------------
株式会社住ま居る（埼玉県鶴ヶ島市・川越市・坂戸市）
UA値0.23〜0.34・C値0.1〜0.3の高気密高断熱専門店
公式HP: https://www.t-smile.co.jp/
--------------------------------------------------
#高気密高断熱 #温熱環境 #UA値 #C値 #換気システム #住ま居る #全館空調 #注文住宅"""

    x_post = f"【温熱換気の科学 #{idx}】\nQ: {question}\n\n👉 結論: {short_ans}\n（目安: {dim}）\n\n失敗しない高気密高断熱の知見200選はこちら👇\nhttps://www.t-smile.co.jp/performance/\n#高気密高断熱 #注文住宅"
    if len(x_post) > 140:
        x_post = f"【温熱の科学 #{idx}】\nQ: {question[:35]}...\n\n👉 結論: {short_ans[:40]}...\n（{dim}）\n\n温熱換気知見200選👇\nhttps://www.t-smile.co.jp/performance/\n#高気密高断熱"

    insta_caption = f"""高気密高断熱の真実 #{idx} 🌡️❄️
「{question}」

エアコン1台で年中快適な家にするための必須知識！
プロが教える科学的な正解は…

💡【結論】
{short_ans}
（基準値: {dim}）

性能で後悔しないために、契約前に必ずチェックしておきたい数値です🏠

───────────────
温熱換気相談全200選はプロフィールのリンクから！
webで全データを公開中📖
@sumairu_house
───────────────
#高気密高断熱 #UA値 #C値 #第一種換気 #パッシブハウス #後悔しない家づくり #住ま居る"""

    threads_post = f"""高気密高断熱住宅を建てるなら絶対に知っておきたいこと👇

Q. {question}

A. {short_ans}
（目標基準: {dim}）

光熱費と家族の健康に直結する重要ポイントです。
契約前のハウスメーカー比較にご活用ください！

温熱換気相談200選の全データはプロフURLで公開しています🌡️"""

    items.append({
        "id": qid,
        "genre": "thermal",
        "genreLabel": "温熱換気相談200",
        "category": cat,
        "categoryName": cat_clean,
        "questionNumber": idx,
        "question": question,
        "shortAnswer": short_ans,
        "dimension": dim,
        "details": details,
        "image": img,
        "hasImage": has_image,
        "topUrl": "/performance/",
        "portalAnchor": f"/#thermal-bot",
        "youtubeUrl": youtube_url,
        "youtubeVideoId": ext.get('youtubeVideoId', ''),
        "veoVideoPath": veo_video_path,
        "status": status,
        "veoPromptJa": veo_prompt_ja,
        "youtubeTitle": yt_title,
        "youtubeDesc": yt_desc,
        "xPost": x_post,
        "instaCaption": insta_caption,
        "threadsPost": threads_post
    })

portal_data = {
    "totalCount": len(items),
    "madoriCount": len(madori_data),
    "thermalCount": len(thermal_data),
    "updatedAt": "2026-10-21",
    "items": items
}

with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
    json.dump(portal_data, f, ensure_ascii=False, indent=2)

print(f"Generated {len(items)} items in {OUTPUT_JSON} (Madori: {len(madori_data)}, Thermal: {len(thermal_data)})!")
