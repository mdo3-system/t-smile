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

    # data ディレクトリ内の Web 公開用 JSON ファイル群の同期
    pub_data_dir = os.path.join(public_dir, 'data')
    root_data_dir = os.path.join(base_dir, 'data')
    if os.path.exists(pub_data_dir) and os.path.exists(root_data_dir):
        print(f"\n📂 public/data から {root_data_dir} への個別ファイルリンク同期中...")
        for d_item in sorted(os.listdir(pub_data_dir)):
            d_target = os.path.join(root_data_dir, d_item)
            d_source = os.path.join('..', 'public', 'data', d_item)
            if not os.path.exists(d_target) and not os.path.islink(d_target):
                try:
                    os.symlink(d_source, d_target)
                    print(f"  ✅ data内リンク作成: {d_item} -> {d_source}")
                    created_count += 1
                except Exception as e:
                    print(f"  ❌ data内リンクエラー ({d_item}): {e}")

    # .htaccess の同期（Xserver固有設定を壊さずにリダイレクト＆最適化ブロックを反映）
    htaccess_target = os.path.join(base_dir, '.htaccess')
    htaccess_source = os.path.join(public_dir, '.htaccess')
    if os.path.exists(htaccess_source):
        try:
            with open(htaccess_source, 'r', encoding='utf-8') as sf:
                source_rules = sf.read()
            target_content = ""
            if os.path.exists(htaccess_target):
                with open(htaccess_target, 'r', encoding='utf-8') as tf:
                    target_content = tf.read()
            marker_start = "# ==============================================================================\n# 株式会社住ま居る（t-smile.co.jp）Xserver Apache 最適化設定"
            if marker_start in target_content:
                parts = target_content.split(marker_start)
                new_target_content = parts[0].rstrip() + "\n\n" + source_rules
            else:
                new_target_content = target_content.rstrip() + "\n\n" + source_rules
            
            with open(htaccess_target, 'w', encoding='utf-8') as tf:
                tf.write(new_target_content)
            print("  ✅ .htaccess 最適化＆301リダイレクト設定を安全に同期・更新しました！")
        except Exception as e:
            print(f"  ❌ .htaccess 同期エラー: {e}")

    print(f"\n🎉 シンボリックリンク同期完了: 作成={created_count}, 更新={updated_count}, 保持={skipped_count}")
    return True

if __name__ == '__main__':
    sync_links()
