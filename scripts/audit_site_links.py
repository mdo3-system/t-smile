#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
住ま居る Webサイト 全ページ ＆ 全リンク自動検証スクリプト (標準ライブラリのみ使用)
"""

import sys
import os
import re
from pathlib import Path
from html.parser import HTMLParser

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

PUBLIC_DIR = Path(r"e:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity\public")

class LinkExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.images = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if 'id' in attrs_dict:
            self.ids.add(attrs_dict['id'])
        if tag == 'a' and 'href' in attrs_dict:
            self.links.append((attrs_dict['href'], attrs_dict.get('title', '')))
        elif tag == 'img' and 'src' in attrs_dict:
            self.images.append((attrs_dict['src'], attrs_dict.get('alt', '')))

def check_local_file_exists(url_path):
    clean_path = url_path.split('?')[0].split('#')[0]
    if clean_path.startswith('/'):
        clean_path = clean_path[1:]
    
    if not clean_path:
        clean_path = "index.html"
    elif clean_path.endswith('/'):
        clean_path += "index.html"
    
    local_file = PUBLIC_DIR / clean_path
    if local_file.is_file():
        return True, local_file
    
    if local_file.is_dir():
        index_file = local_file / "index.html"
        if index_file.is_file():
            return True, index_file

    # 拡張子なしの場合 .html を試行
    if not local_file.suffix:
        html_file = PUBLIC_DIR / (clean_path + ".html")
        if html_file.is_file():
            return True, html_file
            
    return False, local_file

def main():
    print(f"🔍 [Site Audit] 全HTMLファイルのスキャンを開始します: {PUBLIC_DIR}\n")

    key_pages = [
        PUBLIC_DIR / "index.html",
        PUBLIC_DIR / "smilestudio.html",
        PUBLIC_DIR / "subsidy" / "index.html",
        PUBLIC_DIR / "mortgage" / "index.html",
        PUBLIC_DIR / "schedule" / "index.html",
        PUBLIC_DIR / "jfd-survey" / "index.html",
        PUBLIC_DIR / "madori-sketch" / "index.html",
        PUBLIC_DIR / "plans" / "index.html",
    ]
    # サンプリング & 追加ページ
    plan_details = list((PUBLIC_DIR / "plans" / "detail").glob("*.html"))[:5]
    case_pages = list((PUBLIC_DIR / "cases").glob("*.html"))
    partials = list((PUBLIC_DIR / "partials" / "templates").glob("*.html"))
    test_pages = key_pages + plan_details + case_pages + partials

    broken_links = []
    broken_images = []

    # 全SPAセクションIDを収集
    all_spa_ids = set()
    for p in [PUBLIC_DIR / "index.html"] + partials:
        if p.exists():
            with open(p, 'r', encoding='utf-8', errors='ignore') as f:
                parser = LinkExtractor()
                parser.feed(f.read())
                all_spa_ids.update(parser.ids)

    for page in test_pages:
        if not page.exists():
            continue
        rel_page = page.relative_to(PUBLIC_DIR)
        with open(page, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        parser = LinkExtractor()
        try:
            parser.feed(content)
        except Exception:
            pass

        # リンクチェック
        for href, title in parser.links:
            href_clean = href.strip()
            if not href_clean or href_clean.startswith(('tel:', 'mailto:', 'javascript:', 'https://lin.ee', 'http://', 'https://')):
                continue

            # ページ内ハッシュ
            if href_clean.startswith('#'):
                target_id = href_clean[1:]
                if not target_id:
                    continue  # href="#" はトップスクロールまたはダミーリンク
                # 自ページ内のIDか、またはSPA共通セクションIDのいずれかに存在すればOK
                if target_id not in parser.ids and target_id not in all_spa_ids:
                    broken_links.append((str(rel_page), href_clean, "アンカーID未定義"))
                continue

            # / から始まるリンク
            if href_clean.startswith('/'):
                # ハッシュ付き内部リンク例: /#craftsmanship, /index.html#dashboard
                path_part = href_clean.split('#')[0]
                hash_part = href_clean.split('#')[1] if '#' in href_clean else None
                
                exists, p = check_local_file_exists(path_part)
                if not exists:
                    broken_links.append((str(rel_page), href_clean, "ファイル不存在 (404)"))
                elif hash_part:
                    # 対象ファイルのIDをチェック
                    target_ids = set()
                    if p.is_file():
                        with open(p, 'r', encoding='utf-8', errors='ignore') as tf:
                            tp = LinkExtractor()
                            tp.feed(tf.read())
                            target_ids = tp.ids
                    if hash_part not in target_ids and hash_part not in all_spa_ids:
                        broken_links.append((str(rel_page), href_clean, f"アンカー #{hash_part} 未定義"))

        # 画像チェック
        for src, alt in parser.images:
            src_clean = src.strip()
            if not src_clean or src_clean.startswith(('data:', 'http://', 'https://')):
                continue
            if src_clean.startswith('/'):
                exists, p = check_local_file_exists(src_clean)
                if not exists:
                    broken_images.append((str(rel_page), src_clean, alt[:30]))

    print(f"📊 検証結果サマリー:")
    print(f"  ❌ 内部リンク切れ (ファイル不存在または未定義アンカー): {len(broken_links)} 件")
    for src_page, href, reason in broken_links[:30]:
        print(f"     - [{src_page}] ➔ {href} ({reason})")

    print(f"\n  ❌ 画像リンク切れ (404 Not Found): {len(broken_images)} 件")
    for src_page, src, alt in broken_images[:35]:
        print(f"     - [{src_page}] ➔ {src} (alt: {alt})")

if __name__ == '__main__':
    main()
