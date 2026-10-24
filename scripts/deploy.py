#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
株式会社住ま居る - 本番Webサーバー自動デプロイスクリプト
Dropbox同期の事前停止・事後再開の注意喚起を標準装備しています。
"""

import sys
import subprocess
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

def print_banner(text, border_char="="):
    line = border_char * 72
    print(f"\n{line}")
    print(text)
    print(f"{line}\n")

def run_command(cmd, desc):
    print(f"▶ {desc} を実行中...")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"❌ エラーが発生しました ({desc}):")
        print(result.stderr)
        return False
    print(f"✔ 成功: {desc}")
    if result.stdout.strip():
        print(result.stdout.strip())
    return True

def main():
    # 1. デプロイ前のアラート表示
    print_banner(
        "⚠️  【最重要】デプロイ前の確認\n"
        "   本開発環境は Dropbox 同期フォルダ内にあります。\n"
        "   ファイル競合・ロックを防ぐため、今すぐ\n"
        "   【 Dropbox の同期を一時停止 】 してください！\n"
        "   (タスクトレイの Dropbox アイコン ➔ 右上設定 ➔ 同期を一時停止)",
        border_char="!"
    )

    if "--yes" not in sys.argv and "-y" not in sys.argv:
        try:
            confirm = input("👉 Dropbox の同期を一時停止しましたか？ [y/N]: ").strip().lower()
            if confirm not in ("y", "yes"):
                print("デプロイを中断しました。Dropbox の同期を一時停止してから再度実行してください。")
                sys.exit(0)
        except (KeyboardInterrupt, EOFError):
            print("\nデプロイを中断しました。")
            sys.exit(0)

    # コミットメッセージの取得
    commit_msg = "feat/fix: deploy updates to production"
    for arg in sys.argv[1:]:
        if not arg.startswith("-"):
            commit_msg = arg
            break

    print_banner("🚀 本番デプロイ処理を開始します")

    # Git add
    if not run_command("git add .", "変更ファイルのステージング (git add)"):
        sys.exit(1)

    # Git status チェック (コミット対象があるか)
    status = subprocess.run("git status --porcelain", shell=True, capture_output=True, text=True)
    if status.stdout.strip():
        if not run_command(f'git commit -m "{commit_msg}"', f"Git コミット ({commit_msg})"):
            sys.exit(1)
    else:
        print("ℹ コミット対象の変更はありません（既存の最新コミットをデプロイします）")

    # Git push
    if not run_command("git push origin main", "GitHub へのプッシュ (git push origin main)"):
        sys.exit(1)

    # XServer SSH git pull & シンボリックリンク安全同期
    ssh_cmd = 'ssh -o BatchMode=yes -p 10022 mdo3@mdo3.xsrv.jp "cd t-smile.co.jp/public_html && git pull origin main && python3 scripts/sync_symlinks.py"'
    if not run_command(ssh_cmd, "本番サーバー (XServer) での git pull & シンボリックリンク同期"):
        sys.exit(1)

    # 2. デプロイ完了後のアラート表示
    print_banner(
        "🎉 【本番デプロイ完了】\n"
        "   XServer (t-smile.co.jp) への最新版の反映が正常に完了しました！\n\n"
        "🔔 【最重要】Dropbox の同期を 【 再開 】 してください！\n"
        "   (タスクトレイの Dropbox アイコン ➔ 同期を再開)",
        border_char="*"
    )

if __name__ == "__main__":
    main()
