# -*- coding: utf-8 -*-
"""
scripts/crawl_and_verify_links.py
public/ 配下の全HTMLファイルをパースし、内部リンク・画像・スクリプト・CSS・アンカー(#id)の整合性を完全走査する
"""
import os
import re
import sys
from urllib.parse import urlparse, unquote
from html.parser import HTMLParser

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')

class LinkExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        # Check id and name
        if 'id' in attrs_dict:
            self.ids.add(attrs_dict['id'])
        if 'name' in attrs_dict:
            self.ids.add(attrs_dict['name'])

        # Check href / src
        if tag in ('a', 'link') and 'href' in attrs_dict:
            self.links.append((tag, attrs_dict['href']))
        elif tag in ('img', 'script', 'iframe', 'source') and 'src' in attrs_dict:
            self.links.append((tag, attrs_dict['src']))

def resolve_target_file(rel_or_abs_path, current_file_path):
    """URLパスをローカルのファイルパスへ解決する"""
    path_without_query = rel_or_abs_path.split('?')[0].split('#')[0]
    if not path_without_query:
        return current_file_path

    # Clean domain if absolute
    for domain in ('http://localhost:8080', 'https://t-smile.co.jp', 'http://t-smile.co.jp'):
        if path_without_query.startswith(domain):
            path_without_query = path_without_query[len(domain):]

    if path_without_query.startswith('/'):
        # Root relative
        clean_path = path_without_query.lstrip('/')
        target = os.path.join(PUBLIC_DIR, clean_path.replace('/', os.sep))
    else:
        # Relative to current file
        current_dir = os.path.dirname(current_file_path)
        target = os.path.join(current_dir, path_without_query.replace('/', os.sep))

    target = os.path.normpath(target)
    if os.path.isdir(target):
        target = os.path.join(target, 'index.html')
    return target

def main():
    print(f"🔍 全HTMLファイルのクロール＆リンク検証を開始します...")
    all_html_files = []
    for root, dirs, files in os.walk(PUBLIC_DIR):
        # partials/templates は単体ページではなくindex.htmlの遅延マウント用部品
        if 'partials' in root and 'templates' in root:
            continue
        for f in files:
            if f.endswith('.html'):
                all_html_files.append(os.path.join(root, f))

    print(f"📄 検出されたHTMLファイル数: {len(all_html_files)} ページ")

    # Step 1: 各HTMLファイルのID集合とパース結果を事前キャッシュ
    file_ids = {}
    file_links = {}

    for fpath in all_html_files:
        try:
            with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            parser = LinkExtractor()
            parser.feed(content)
            file_ids[fpath] = parser.ids
            file_links[fpath] = parser.links
        except Exception as e:
            print(f"Error parsing {fpath}: {e}")

    # Step 2: リンクの完全性検証
    broken_links = []
    broken_anchors = []
    checked_link_count = 0

    for fpath, links in file_links.items():
        rel_fpath = os.path.relpath(fpath, PUBLIC_DIR).replace('\\', '/')
        for tag, url in links:
            checked_link_count += 1
            url_clean = url.strip()
            if not url_clean or url_clean.startswith(('javascript:', 'mailto:', 'tel:', 'data:', 'sms:')):
                continue

            # 外部URL判定
            if url_clean.startswith(('http://', 'https://')):
                parsed = urlparse(url_clean)
                if parsed.netloc not in ('localhost:8080', 't-smile.co.jp', 'www.t-smile.co.jp'):
                    # 外部サイト（LINE、YouTube、Google等）はスキップ
                    continue

            # アンカー部分とパス部分の分離
            hash_part = ''
            if '#' in url_clean:
                parts = url_clean.split('#', 1)
                base_url = parts[0]
                hash_part = parts[1].split('?')[0]
            else:
                base_url = url_clean

            # 対象ファイルの特定
            target_fpath = resolve_target_file(base_url, fpath)

            # ファイル存在確認
            if not os.path.exists(target_fpath):
                # .html 省略時の確認
                if not target_fpath.endswith('.html') and os.path.exists(target_fpath + '.html'):
                    target_fpath = target_fpath + '.html'
                else:
                    broken_links.append({
                        'from': rel_fpath,
                        'tag': tag,
                        'url': url_clean,
                        'resolved': os.path.relpath(target_fpath, PUBLIC_DIR).replace('\\', '/') if os.path.exists(PUBLIC_DIR) else target_fpath
                    })
                    continue

            # アンカーの整合性確認（HTMLファイルかつ#がある場合）
            if hash_part and target_fpath.endswith('.html'):
                # ページのIDリストにあるか
                target_ids = file_ids.get(target_fpath, set())
                # hash_part にクエリ等が含まれる場合を除去
                clean_hash = unquote(hash_part.split('?')[0])
                if clean_hash and clean_hash not in target_ids:
                    # GEMINI.md No.11: Whitelist is strictly forbidden.
                    # Verify real IDs on DOM.
                    broken_anchors.append({
                        'from': rel_fpath,
                        'to': os.path.relpath(target_fpath, PUBLIC_DIR).replace('\\', '/'),
                        'url': url_clean,
                        'missing_id': clean_hash
                    })
    print(f"\n================ リンク検証結果 ================")
    print(f"総検証リンク数: {checked_link_count} 箇所")
    print(f"リンク切れ (404 Not Found): {len(broken_links)} 件")
    print(f"アンカー不整合 (Missing #id): {len(broken_anchors)} 件")

    if broken_links:
        print(f"\n❌ 【リンク切れ一覧 (404)】:")
        for b in broken_links[:30]:
            print(f"  - [{b['from']}] ({b['tag']}): {b['url']} -> 解決先: {b['resolved']}")
        if len(broken_links) > 30:
            print(f"  ... 他 {len(broken_links) - 30} 件")

    if broken_anchors:
        print(f"\n⚠️ 【アンカー不整合一覧 (Missing #id)】:")
        for a in broken_anchors[:30]:
            print(f"  - [{a['from']}] -> {a['to']}#{a['missing_id']} (URL: {a['url']})")
        if len(broken_anchors) > 30:
            print(f"  ... 他 {len(broken_anchors) - 30} 件")

    if not broken_links and not broken_anchors:
        print(f"\n🎉 リンク切れ・アンカー不整合は「ゼロ（0件）」でした！完全健全です！")

    return len(broken_links), len(broken_anchors)

if __name__ == '__main__':
    main()
