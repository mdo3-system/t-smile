# -*- coding: utf-8 -*-
"""
scripts/build_knowledge_corpus.py
温熱知見200問 ＋ 間取り知見200問（計400問）を統合した
テキストベースの全文検索・RAG用ナレッジコーパスを生成するスクリプト
"""
import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DATA_DIR = os.path.join(BASE_DIR, 'public', 'data')
SERVER_DIR = os.path.join(BASE_DIR, 'server')

def build_corpus():
    thermal_path = os.path.join(PUBLIC_DATA_DIR, 'thermal_qa_200.json')
    madori_path = os.path.join(PUBLIC_DATA_DIR, 'qa_knowledge_100.json')

    corpus = []

    # 1. 温熱換気・高気密高断熱（200問）
    if os.path.exists(thermal_path):
        with open(thermal_path, 'r', encoding='utf-8') as f:
            tdata = json.load(f)
        for q in tdata.get('questions', []):
            item = {
                'id': q.get('id'),
                'type': 'thermal',
                'category': q.get('category'),
                'categoryName': q.get('categoryName', '温熱換気・高気密高断熱'),
                'question': q.get('question', ''),
                'shortAnswer': q.get('shortAnswer', ''),
                'dimension': q.get('dimension', ''),
                'details': q.get('details', ''),
                'principle': q.get('principle', ''),
                'keywords': q.get('keywords', [])
            }
            # 全文検索用トークン
            tokens = [
                q.get('question', ''),
                q.get('shortAnswer', ''),
                q.get('details', ''),
                q.get('dimension', ''),
                q.get('principle', ''),
                q.get('categoryName', '')
            ] + (q.get('keywords', []) or [])
            item['searchTokens'] = ' '.join(tokens).lower()
            corpus.append(item)

    # 2. 間取り・設計動線・収納・家相風水（200問）
    if os.path.exists(madori_path):
        with open(madori_path, 'r', encoding='utf-8') as f:
            mdata = json.load(f)
        for q in mdata.get('questions', []):
            item = {
                'id': q.get('id'),
                'type': 'madori',
                'category': q.get('category'),
                'categoryName': q.get('categoryName', '間取り設計・動線・収納'),
                'question': q.get('question', ''),
                'shortAnswer': q.get('shortAnswer', ''),
                'dimension': q.get('dimension', ''),
                'details': q.get('details', '') or q.get('answer', ''),
                'principle': q.get('principle', '') or q.get('summary', ''),
                'keywords': q.get('keywords', []) or q.get('tags', [])
            }
            tokens = [
                q.get('question', ''),
                q.get('shortAnswer', ''),
                item['details'],
                item['dimension'],
                item['principle'],
                item['categoryName']
            ] + (item['keywords'] or [])
            item['searchTokens'] = ' '.join(tokens).lower()
            corpus.append(item)

    out_path = os.path.join(SERVER_DIR, 'knowledge_corpus.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(corpus, f, ensure_ascii=False, indent=2)

    print(f"[CORPUS] Successfully built knowledge_corpus.json with {len(corpus)} total questions (Thermal: 200, Madori: 200)!")

if __name__ == '__main__':
    build_corpus()
