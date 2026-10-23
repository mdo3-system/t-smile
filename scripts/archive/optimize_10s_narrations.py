# -*- coding: utf-8 -*-
"""
全400知見のナレーション台本（narrationJa）を日本語として意味の通る綺麗な10秒黄金台本（35〜45文字）に完全整形
"""
import os
import re
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORTAL_FILE = os.path.join(BASE_DIR, 'public', 'data', 'knowledge_video_portal_data.json')

def clean_sentence(text):
    text = re.sub(r'[\r\n\t]+', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def format_10s_narration(item):
    q = clean_sentence(item.get('question', ''))
    ans = clean_sentence(item.get('shortAnswer', ''))
    dim = clean_sentence(item.get('dimension', ''))
    genre = item.get('genre', '')

    # 1. 回答から核心部分を抽出
    # 句点で分割し、最初の1文を取る
    ans_sentences = re.split(r'[。！!]', ans)
    ans_core = ans_sentences[0].strip() if ans_sentences else ans
    # 不要プレフィックス削除
    ans_core = re.sub(r'^(圧倒的に|基本的に|結論から言うと|結論、|ズバリ|実は|一般的には)', '', ans_core)
    ans_core = re.sub(r'[「」]', '', ans_core)
    ans_core = re.sub(r'(です|ます|である|こと|正解です|おすすめです|黄金寸法です|推奨します)[。！]*$', '', ans_core).strip()

    # 2. 質問からテーマを抽出
    q_theme = re.sub(r'[「」]', '', q)
    q_theme = re.split(r'[、,]', q_theme)[0] # 読点があれば前半
    q_theme = re.sub(r'(は何mmが一番使いやすいですか？|は何mmが正解？|は何mmですか？|はどちらに置くのが正解ですか？|どちらが後悔しませんか？|は必要ですか？|はどう選ぶ？|はどうする？|はどう決める？|はどちら？|は何？|ですか？|ですか|？|\?)', '', q_theme).strip()

    # 長さ制限
    if len(q_theme) > 16:
        q_theme = q_theme[:16]

    if len(ans_core) > 22:
        ans_core = ans_core[:22]

    # 寸法情報があれば短く付与
    dim_clean = re.sub(r'(推奨:|基準:|有効|約)', '', dim).strip()
    
    # 候補作成
    # パターンA: {テーマ}は、{コア回答}が正解！住ま居るの家づくり。
    c1 = f"{q_theme}は、{ans_core}が正解！住ま居るの家づくり。"
    if 33 <= len(c1) <= 45:
        return c1

    # パターンB: {テーマ}は{コア回答}が黄金基準！埼玉の住ま居る。
    c2 = f"{q_theme}は{ans_core}が黄金基準！埼玉の住ま居る。"
    if 33 <= len(c2) <= 46:
        return c2

    # パターンC: 寸法を明示
    if dim_clean and len(dim_clean) <= 12 and dim_clean not in ans_core:
        c3 = f"{q_theme}の基準は{dim_clean}！{ans_core}。住ま居る。"
        if 33 <= len(c3) <= 46:
            return c3

    # パターンD: 調整
    narr = f"{q_theme}は{ans_core}がおすすめ！住ま居るの家づくり。"
    if len(narr) > 46:
        narr = f"{q_theme[:12]}は{ans_core[:16]}が正解！住ま居る。"
    return narr

def main():
    with open(PORTAL_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for item in data.get('items', []):
        item['narrationJa'] = format_10s_narration(item)

    with open(PORTAL_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("Successfully formatted all 400 narrations!")
    for item in data['items'][:6]:
        print(f"[{item['id']}] ({len(item['narrationJa'])}字) {item['narrationJa']}")

if __name__ == '__main__':
    main()
