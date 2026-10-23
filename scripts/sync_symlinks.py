#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
XServer (t-smile.co.jp) 本番公開ディレクトリ用 シンボリックリンク自動同期スクリプト
public/ 配下のすべての Web 公開用アセットを public_html 直下に安全にリンクします。
既存の WordPress (2021/) やサーバー設定 (.htaccess, log 等) を絶対に破壊しません。
"""

import os
import sys

# 既存の保護対象（絶対にリンクで上書き・破壊してはならないファイル・ディレクトリ）
PROTECTED_ENTRIES = {
    '2021',
    '.htaccess',
    '.user.ini',
    '.spamassassin',
    'autoreply',
    'htpasswd',
    'log',
    'mail',
    'script',
    'xserver_php',
    '.git',
    '.gitignore',
    'README.md',
    '_backup_xserver'
}

def sync_links():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    public_dir = os.path.join(base_dir, 'public')
    
    if not os.path.exists(public_dir):
        print(f"[ERROR] public directory not found: {public_dir}")
        return False

    print(f"🔗 public/ から {base_dir} 直下へのシンボリックリンク同期を開始します...")
    
    created_count = 0
    skipped_count = 0
    updated_count = 0

    for item in sorted(os.listdir(public_dir)):
        # 保護対象はスキップ
        if item in PROTECTED_ENTRIES:
            print(f"  🛡️ 保護対象のためスキップ: {item}")
            skipped_count += 1
            continue

        target_path = os.path.join(base_dir, item)
        source_rel = os.path.join('public', item)

        # 既にリンクが存在する場合
        if os.path.islink(target_path):
            current_target = os.readlink(target_path)
            if current_target != source_rel:
                try:
                    os.unlink(target_path)
                    os.symlink(source_rel, target_path)
                    print(f"  🔄 リンク先更新: {item} -> {source_rel}")
                    updated_count += 1
                except Exception as e:
                    print(f"  ❌ リンク更新エラー ({item}): {e}")
            else:
                skipped_count += 1
        # 実ファイル・実ディレクトリが存在する場合
        elif os.path.exists(target_path):
            # 既存ファイルが通常ファイルの場合、安全のため上書きせずスキップ
            print(f"  ⚠️ 実体ファイルが既に存在するため保持: {item}")
            skipped_count += 1
        # まだ存在しない場合、新規シンボリックリンク作成
        else:
            try:
                os.symlink(source_rel, target_path)
                print(f"  ✅ 新規リンク作成: {item} -> {source_rel}")
                created_count += 1
            except Exception as e:
                print(f"  ❌ リンク作成エラー ({item}): {e}")

    print(f"\n🎉 シンボリックリンク同期完了: 作成={created_count}, 更新={updated_count}, 保持={skipped_count}")
    return True

if __name__ == '__main__':
    sync_links()
