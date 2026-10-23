# -*- coding: utf-8 -*-
"""
住ま居る AI知見動画ポータル 全400問 プロンプト＆ナレーション全面改修
1. ナレーションから社名を完全排除し、純粋なノウハウ・寸法解説に100%割り振り
2. 専門用語読み仮名・発音辞書との完全連動（こうきみつ・こうだんねつ等）
3. Veo 3プロンプトをスマホ専用【縦型 9:16】シネマティック映像に刷新
"""
import os
import re
import json
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(BASE_DIR, 'scripts'))
from phonetic_dict import normalize_phonetics

PORTAL_JSON = os.path.join(BASE_DIR, 'public', 'data', 'knowledge_video_portal_data.json')

def clean_txt(s):
    if not s: return ""
    s = re.sub(r'[\r\n\t]+', ' ', s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

def build_pure_knowledge_narration(item):
    """社名を一切入れず、10秒の尺をすべて理由・寸法・建築ノウハウの解説に割り振る"""
    q = clean_txt(item.get('question', ''))
    ans = clean_txt(item.get('shortAnswer', ''))
    dim = clean_txt(item.get('dimension', ''))
    details = clean_txt(item.get('details', ''))

    # 回答をクリーン化
    ans_clean = re.sub(r'^(圧倒的に|基本的に|結論から言うと|結論、|ズバリ|実は|一般的には)', '', ans)
    ans_clean = re.sub(r'ですです', 'です', ans_clean)
    ans_clean = re.sub(r'(です|ます|である|こと)[。！]*$', '', ans_clean).strip()

    # テーマ抽出
    q_theme = re.sub(r'[「」]', '', q)
    q_theme = re.split(r'[、,]', q_theme)[0]
    q_theme = re.sub(r'(は何mmが一番使いやすいですか？|は何mmが正解？|は何mmですか？|はどちらに置くのが正解ですか？|どちらが後悔しませんか？|は必要ですか？|はどう選ぶ？|はどうする？|はどう決める？|はどちら？|は何？|ですか？|ですか|？|\?)', '', q_theme).strip()

    dim_clean = re.sub(r'(推奨:|基準:|有効|約)', '', dim).strip()

    # パターン1: 質問テーマ + 核心結論 + 正解です（または黄金比です）
    c1 = f"{q_theme}は、{ans_clean}が黄金基準です。"
    c1 = re.sub(r'ですです', 'です', c1)
    if 30 <= len(c1) <= 44:
        return normalize_phonetics(c1)

    # パターン2: 寸法を含めて具体的に
    if dim_clean and dim_clean not in ans_clean and len(dim_clean) <= 12:
        c2 = f"{q_theme}は{ans_clean}。基準は{dim_clean}です。"
        if 30 <= len(c2) <= 46:
            return normalize_phonetics(c2)

    # パターン3: 回答の1文目を活用
    if details:
        det_first = re.split(r'[。！]', details)[0].strip()
        if 25 <= len(det_first) <= 42:
            return normalize_phonetics(det_first + "。")

    c_fallback = f"{q_theme}は、{ans_clean}が正解です。"
    if len(c_fallback) > 45:
        c_fallback = f"{q_theme[:14]}は{ans_clean[:18]}が正解です。"
    return normalize_phonetics(c_fallback)

def build_vertical_veo_prompt(item):
    """スマホ全画面に特化した縦型9:16のVeo 3プロンプト"""
    q = clean_txt(item.get('question', ''))
    dim = clean_txt(item.get('dimension', ''))
    cat = item.get('categoryName', '')
    genre = item.get('genre', '')

    theme_desc = f"{cat} - {q}"
    if len(theme_desc) > 50:
        theme_desc = theme_desc[:50]

    dim_part = f"基準寸法・仕様:「{dim}」。" if dim else ""

    # 日本語プロンプト（スマホ縦型9:16、シネマティック、無音明記）
    prompt_ja = (
        f"【スマホ最適化 縦型9:16 建築シネマティック映像】日本の洗練された高性能・注文住宅の実空間。"
        f"テーマ:「{theme_desc}」。{dim_part}"
        f"スマートフォン全画面（縦向きVertical 9:16アスペクト比）構図。天井の高さと空間の奥行きを美しく捉える垂直方向の滑らかなカメラワーク。"
        f"落ち着いた自然光、美しい木目と上質な建築素材のフォトリアルな質感。人物なし、10秒間、4K 60fps最高画質ビジュアライゼーション。"
        f"【重要指示】音声なし（完全無音映像）。ナレーション、BGM、人物の発話や声は一切生成しないこと。"
    )

    # 英語プロンプト（予備・スマホ縦型9:16）
    prompt_en = (
        f"Smartphone-optimized vertical 9:16 cinematic architectural video of a modern Japanese custom high-performance house. "
        f"Topic: {theme_desc}. {dim}. Vertical 9:16 composition showcasing spatial height and elegant proportions. "
        f"Smooth slow camera motion, natural soft daylight, photorealistic wood and architectural materials. No people, 10 seconds, 4K 60fps. "
        f"[CRITICAL NEGATIVE PROMPT: SILENT VIDEO ONLY. No narration, no voice, no speech, no background music, no text overlays, pure visual video.]"
    )

    return prompt_ja, prompt_en

def main():
    with open(PORTAL_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for item in data.get('items', []):
        # 1. ナレーション更新（社名完全排除、専門用語ルビ適用）
        item['narrationJa'] = build_pure_knowledge_narration(item)

        # 2. Veo 3プロンプト更新（スマホ縦型9:16に全面刷新）
        p_ja, p_en = build_vertical_veo_prompt(item)
        item['veoPromptJa'] = p_ja
        item['veoPromptEn'] = p_en

    with open(PORTAL_JSON, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("Successfully updated all 400 questions with vertical 9:16 prompts and pure knowledge narrations!")
    
    # 確認出力
    for it in data['items'][:5]:
        print(f"\n[{it['id']}] {it['categoryName']}")
        print(f" 台本 ({len(it['narrationJa'])}字): {it['narrationJa']}")
        print(f" Veo 3: {it['veoPromptJa'][:70]}...")

if __name__ == '__main__':
    main()
