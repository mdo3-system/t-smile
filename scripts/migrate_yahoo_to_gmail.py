#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Yahoo!メール (IMAP) 全件ローカルバックアップ ＆ 指定フォルダGmail自動移行スクリプト
- 外部ソフト・ライブラリのインストール不要（Python標準ライブラリのみで動作）
- 37.2GBの通信中断に備えた「レジューム（中断再開）」完全対応
- 【超堅牢設計】WinError 10053 切断対策: 自動再接続＆定期セッションリフレッシュ搭載
- 日本語フォルダ名（Modified UTF-7）自動デコード＆エンコード
- メールは世界標準の .eml 形式でPCに保存（ダブルクリックで閲覧可能）
"""

import sys
import os
import imaplib
import email
import json
import re
import binascii
import getpass
import time
import socket
from pathlib import Path

# デフォルト設定
DEFAULT_BACKUP_DIR = Path(__file__).resolve().parent.parent / "email_backup"
CONFIG_FILE = Path(__file__).resolve().parent / "mail_secrets.json"

YAHOO_IMAP_SERVER = "imap.mail.yahoo.co.jp"
YAHOO_IMAP_PORT = 993

GMAIL_IMAP_SERVER = "imap.gmail.com"
GMAIL_IMAP_PORT = 993

# 1セッションあたりの最大連続取得数（これを超えたら安全のため再接続してリフレッシュ）
BATCH_REFRESH_INTERVAL = 250

# ==============================================================================
# Modified UTF-7 (RFC 3501) コーデック
# ==============================================================================
def modified_base64_decode(s):
    s = s.replace(',', '/')
    pad = len(s) % 4
    if pad:
        s += '=' * (4 - pad)
    return binascii.a2b_base64(s.encode('ascii')).decode('utf-16-be')

def modified_base64_encode(s):
    b = s.encode('utf-16-be')
    r = binascii.b2a_base64(b).decode('ascii').rstrip('\n').rstrip('=')
    return r.replace('/', ',')

def decode_imap_utf7(s):
    if isinstance(s, bytes):
        s = s.decode('latin1')
    parts = []
    i = 0
    while i < len(s):
        if s[i] == '&':
            j = s.find('-', i + 1)
            if j == -1:
                parts.append(s[i:])
                break
            if j == i + 1:
                parts.append('&')
            else:
                parts.append(modified_base64_decode(s[i+1:j]))
            i = j + 1
        else:
            parts.append(s[i])
            i += 1
    return ''.join(parts)

def encode_imap_utf7(s):
    res = []
    buf = []
    for c in s:
        if 0x20 <= ord(c) <= 0x7e:
            if buf:
                res.append('&' + modified_base64_encode(''.join(buf)) + '-')
                buf = []
            if c == '&':
                res.append('&-')
            else:
                res.append(c)
        else:
            buf.append(c)
    if buf:
        res.append('&' + modified_base64_encode(''.join(buf)) + '-')
    return ''.join(res)

def sanitize_dirname(name):
    return re.sub(r'[\\/:*?"<>|]', '_', name).strip()

# ==============================================================================
# 設定読込
# ==============================================================================
def load_credentials():
    config = {
        "yahoo_user": "silver_bullet1974",
        "yahoo_pass": "",
        "gmail_user": "s2712350@gmail.com",
        "gmail_pass": "",
        "sync_folders": ["受信箱", "INBOX", "SUMIKA", "UDI", "ゴミ箱", "木造住宅設計サポート", "現場日報"]
    }

    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if "yahoo" in data:
                    config["yahoo_user"] = data["yahoo"].get("user", config["yahoo_user"])
                    config["yahoo_pass"] = data["yahoo"].get("app_password", "").replace(" ", "").strip()
                if "gmail" in data:
                    config["gmail_user"] = data["gmail"].get("user", config["gmail_user"])
                    config["gmail_pass"] = data["gmail"].get("app_password", "").replace(" ", "").strip()
                if "sync_folders" in data:
                    config["sync_folders"] = data.get("sync_folders", config["sync_folders"])
        except Exception as e:
            print(f"⚠️ 設定ファイル読み込みエラー ({CONFIG_FILE}): {e}")

    if not config["yahoo_pass"]:
        print(f"\n🔑 Yahoo!メール [{config['yahoo_user']}] のアプリパスワードを入力してください:")
        config["yahoo_pass"] = getpass.getpass("Yahoo App Password: ").replace(" ", "").strip()

    return config

# ==============================================================================
# Yahoo! IMAP 堅牢接続 ＆ 自動再接続マネージャー
# ==============================================================================
class YahooConnectionManager:
    def __init__(self, user, password):
        self.user = user
        self.password = password
        self.imap = None
        self.current_folder = None

    def connect(self):
        self.close()
        max_retries = 5
        for attempt in range(1, max_retries + 1):
            try:
                # タイムアウトを設定
                self.imap = imaplib.IMAP4_SSL(YAHOO_IMAP_SERVER, YAHOO_IMAP_PORT)
                self.imap.sock.settimeout(60)
                self.imap.login(self.user, self.password)
                if self.current_folder:
                    self.imap.select(f'"{self.current_folder}"', readonly=True)
                return self.imap
            except Exception as e:
                print(f"  ⚠️ Yahoo接続試行 ({attempt}/{max_retries}) 失敗: {e}")
                time.sleep(attempt * 2)
        print("❌ Yahoo!メールへの再接続に失敗しました。時間をおいて再試行してください。")
        sys.exit(1)

    def select_folder(self, raw_folder_name):
        self.current_folder = raw_folder_name
        try:
            status, counts = self.imap.select(f'"{raw_folder_name}"', readonly=True)
            return status, counts
        except Exception:
            # 切断されていたら再接続して再選択
            self.connect()
            return self.imap.select(f'"{raw_folder_name}"', readonly=True)

    def fetch_email_with_retry(self, uid_bytes):
        max_retries = 3
        for attempt in range(1, max_retries + 1):
            try:
                res, msg_data = self.imap.uid('fetch', uid_bytes, '(RFC822)')
                if res == 'OK' and msg_data and isinstance(msg_data[0], tuple):
                    return msg_data[0][1]
            except (socket.error, imaplib.IMAP4.abort, ConnectionResetError, TimeoutError, OSError) as e:
                print(f"\n  🔄 ソケット切断検知 ({e})。セッションを自動再接続します (試行 {attempt}/{max_retries})...")
                time.sleep(2)
                self.connect()
            except Exception as e:
                print(f"\n  ⚠️ 取得例外: {e}")
                time.sleep(1)
        return None

    def close(self):
        if self.imap:
            try:
                self.imap.logout()
            except Exception:
                pass
            self.imap = None

def get_yahoo_folders(conn_mgr):
    typ, data = conn_mgr.imap.list()
    if typ != 'OK':
        raise RuntimeError("フォルダ一覧の取得に失敗しました")

    folders = []
    pattern = re.compile(r'\((?P<flags>.*?)\) "(?P<delim>.*?)" (?P<name>.*)')
    for line in data:
        if not line:
            continue
        line_str = line.decode('latin1')
        match = pattern.match(line_str)
        if match:
            raw_name = match.group('name').strip('"')
            decoded_name = decode_imap_utf7(raw_name)
            folders.append((raw_name, decoded_name))
    return folders

# ==============================================================================
# ステップ1: 全件ローカルバックアップ (堅牢自動再接続対応)
# ==============================================================================
def backup_yahoo_all(conn_mgr, backup_base_dir):
    backup_base_dir = Path(backup_base_dir)
    backup_base_dir.mkdir(parents=True, exist_ok=True)
    print(f"\n💾 【ステップ1】全件バックアップを開始します")
    print(f"🛡️ 切断保護: 自動再接続＆{BATCH_REFRESH_INTERVAL}通ごとのセッション自動リフレッシュ有効")
    print(f"📂 保存先ディレクトリ: {backup_base_dir.resolve()}\n")

    folders = get_yahoo_folders(conn_mgr)
    print(f"📁 検出されたフォルダ総数: {len(folders)} 件")

    total_downloaded = 0
    total_skipped = 0
    session_fetch_count = 0

    for raw_name, decoded_name in folders:
        clean_name = sanitize_dirname(decoded_name)
        folder_dir = backup_base_dir / clean_name
        folder_dir.mkdir(parents=True, exist_ok=True)

        try:
            status, counts = conn_mgr.select_folder(raw_name)
            if status != 'OK':
                print(f"  ⚠️ フォルダ選択スキップ: {decoded_name}")
                continue
        except Exception as e:
            print(f"  ⚠️ エラー ({decoded_name}): {e}")
            continue

        num_messages = int(counts[0]) if counts and counts[0] else 0
        print(f"\n📂 [{decoded_name}] - 全 {num_messages} 通")

        if num_messages == 0:
            continue

        # UID一覧取得
        try:
            typ, data = conn_mgr.imap.uid('search', None, 'ALL')
        except Exception:
            conn_mgr.connect()
            typ, data = conn_mgr.imap.uid('search', None, 'ALL')

        if typ != 'OK' or not data[0]:
            continue

        uids = data[0].split()
        f_downloaded = 0
        f_skipped = 0

        for uid_bytes in uids:
            uid_str = uid_bytes.decode('ascii')
            eml_path = folder_dir / f"{uid_str}.eml"

            # 既存スキップ（レジューム機能：既にダウンロード済みのファイルは瞬時にスキップ）
            if eml_path.exists() and eml_path.stat().st_size > 0:
                f_skipped += 1
                total_skipped += 1
                continue

            # 定期セッションリフレッシュ（サーバー側による強制切断を未然に防止）
            session_fetch_count += 1
            if session_fetch_count >= BATCH_REFRESH_INTERVAL:
                print(f"   ☕ セッションリフレッシュ中（安定接続維持のため定期再接続）...")
                conn_mgr.connect()
                session_fetch_count = 0

            # メール取得（自動リトライ付き）
            raw_email = conn_mgr.fetch_email_with_retry(uid_bytes)
            if raw_email:
                with open(eml_path, 'wb') as f:
                    f.write(raw_email)
                f_downloaded += 1
                total_downloaded += 1

                if f_downloaded % 50 == 0 or (f_downloaded + f_skipped) == len(uids):
                    print(f"   📥 進捗: {f_downloaded + f_skipped}/{len(uids)} 通 (新規保存: {f_downloaded}, 既存スキップ: {f_skipped})")
            else:
                print(f"   ❌ UID {uid_str} 取得スキップ（再接続後も取得不可）")

        print(f"   ✨ [{decoded_name}] 完了: 新規保存={f_downloaded}, 既存スキップ={f_skipped}")

    print(f"\n🎉 【ステップ1 完了】全フォルダのバックアップが完了しました！")
    print(f"   - 新規保存: {total_downloaded} 通")
    print(f"   - スキップ: {total_skipped} 通")
    print(f"   - 保存先: {backup_base_dir.resolve()}\n")

# ==============================================================================
# ステップ2: 指定フォルダだけGmailへ自動移行
# ==============================================================================
class GmailConnectionManager:
    def __init__(self, user, password):
        self.user = user
        self.password = password
        self.imap = None

    def connect(self):
        self.close()
        max_retries = 5
        for attempt in range(1, max_retries + 1):
            try:
                self.imap = imaplib.IMAP4_SSL(GMAIL_IMAP_SERVER, GMAIL_IMAP_PORT)
                self.imap.sock.settimeout(60)
                self.imap.login(self.user, self.password)
                return self.imap
            except Exception as e:
                print(f"  ⚠️ Gmail接続試行 ({attempt}/{max_retries}) 失敗: {e}")
                time.sleep(attempt * 2)
        print("❌ Gmailへの接続に失敗しました。アプリパスワードをご確認ください。")
        sys.exit(1)

    def close(self):
        if self.imap:
            try:
                self.imap.logout()
            except Exception:
                pass
            self.imap = None

def ensure_gmail_folder(g_mgr, folder_name):
    encoded_name = encode_imap_utf7(folder_name)
    try:
        status, _ = g_mgr.imap.select(f'"{encoded_name}"')
        if status == 'OK':
            return encoded_name
    except Exception:
        pass

    try:
        g_mgr.imap.create(f'"{encoded_name}"')
        print(f"   🏷️ Gmail上にラベル/フォルダ「{folder_name}」を新規作成しました")
    except Exception:
        pass
    return encoded_name

def sync_to_gmail(g_mgr, backup_base_dir, target_folder_names):
    backup_base_dir = Path(backup_base_dir)
    print(f"\n🚀 【ステップ2】指定フォルダのGmail移行を開始します")
    print(f"🎯 移行対象フォルダ: {target_folder_names}")

    uploaded_log_file = backup_base_dir / "gmail_uploaded_log.json"
    uploaded_set = set()
    if uploaded_log_file.exists():
        try:
            with open(uploaded_log_file, 'r', encoding='utf-8') as f:
                uploaded_set = set(json.load(f))
        except Exception:
            pass

    total_uploaded = 0
    total_skipped = 0
    session_count = 0

    for folder_dir in backup_base_dir.iterdir():
        if not folder_dir.is_dir():
            continue

        folder_name = folder_dir.name
        is_target = False
        target_label = folder_name
        for tf in target_folder_names:
            if tf.lower() == folder_name.lower():
                is_target = True
                target_label = tf
                break
            if tf in ["受信箱", "INBOX"] and folder_name in ["受信箱", "INBOX"]:
                is_target = True
                target_label = "INBOX"
                break

        if not is_target:
            continue

        print(f"\n📤 フォルダ移行中: [{folder_name}] ➔ Gmailラベル: [{target_label}]")
        encoded_gmail_folder = ensure_gmail_folder(g_mgr, target_label)

        eml_files = list(folder_dir.glob("*.eml"))
        f_uploaded = 0
        f_skipped = 0

        for eml_file in eml_files:
            log_key = f"{folder_name}/{eml_file.name}"
            if log_key in uploaded_set:
                f_skipped += 1
                total_skipped += 1
                continue

            session_count += 1
            if session_count >= BATCH_REFRESH_INTERVAL:
                print(f"   ☕ Gmailセッションリフレッシュ中...")
                g_mgr.connect()
                session_count = 0

            max_retries = 3
            success = False
            for attempt in range(1, max_retries + 1):
                try:
                    with open(eml_file, 'rb') as f:
                        eml_data = f.read()

                    msg = email.message_from_bytes(eml_data)
                    date_tuple = email.utils.parsedate_tz(msg.get('Date'))
                    if date_tuple:
                        epoch = email.utils.mktime_tz(date_tuple)
                        imap_time = imaplib.Time2Internaldate(epoch)
                    else:
                        imap_time = imaplib.Time2Internaldate(time.time())

                    status, _ = g_mgr.imap.append(encoded_gmail_folder, '\\Seen', imap_time, eml_data)
                    if status == 'OK':
                        f_uploaded += 1
                        total_uploaded += 1
                        uploaded_set.add(log_key)
                        success = True
                        break
                    else:
                        time.sleep(1)
                except Exception as e:
                    print(f"\n  🔄 Gmail投入リトライ ({attempt}/{max_retries}): {e}")
                    time.sleep(2)
                    g_mgr.connect()

            if not success:
                print(f"   ⚠️ ファイル {eml_file.name} 投入失敗")

            if f_uploaded % 30 == 0 or (f_uploaded + f_skipped) == len(eml_files):
                print(f"   📤 投入進捗: {f_uploaded + f_skipped}/{len(eml_files)} 通 (新規: {f_uploaded}, 済: {f_skipped})")

        print(f"   ✨ [{folder_name}] 移行完了: 投入成功={f_uploaded}, スキップ={f_skipped}")

    with open(uploaded_log_file, 'w', encoding='utf-8') as f:
        json.dump(list(uploaded_set), f)

    print(f"\n🎉 【ステップ2 完了】Gmailへの指定フォルダ移行が完了しました！")
    print(f"   - 新規投入: {total_uploaded} 通")
    print(f"   - スキップ: {total_skipped} 通\n")

# ==============================================================================
# メインメニュー
# ==============================================================================
def main():
    print("=" * 65)
    print(" 📧 株式会社住ま居る - Yahoo!メール ➔ Gmail 完全移行ツール (v2)")
    print("=" * 65)

    config = load_credentials()
    backup_dir = DEFAULT_BACKUP_DIR

    conn_mgr = YahooConnectionManager(config["yahoo_user"], config["yahoo_pass"])

    if "--list-folders" in sys.argv:
        conn_mgr.connect()
        folders = get_yahoo_folders(conn_mgr)
        print("\n📁 Yahoo!メール上の全フォルダ一覧:")
        for idx, (raw, dec) in enumerate(folders, 1):
            status, counts = conn_mgr.select_folder(raw)
            cnt = counts[0].decode('utf-8') if counts and counts[0] else "0"
            print(f"  {idx:2d}. {dec} ({cnt} 通)")
        conn_mgr.close()
        return

    print("\n実行する処理を選択してください:")
    print("  1: Yahoo!メールの全フォルダと件数を一覧表示（確認のみ）")
    print("  2: 【ステップ1】全件バックアップ（自動再接続＆既存スキップ）")
    print("  3: 【ステップ2】指定した6つのフォルダだけをGmailへ移行")
    print("  4: 【一括実行】全件バックアップ ➔ Gmail移行を順番にすべて実行")
    print("  q: 終了")

    choice = input("\n番号を入力してください [1-4, q]: ").strip()

    if choice == '1':
        conn_mgr.connect()
        folders = get_yahoo_folders(conn_mgr)
        print("\n📁 Yahoo!メール上の全フォルダ一覧:")
        for idx, (raw, dec) in enumerate(folders, 1):
            status, counts = conn_mgr.select_folder(raw)
            cnt = counts[0].decode('utf-8') if counts and counts[0] else "0"
            print(f"  {idx:2d}. {dec} ({cnt} 通)")
        conn_mgr.close()

    elif choice == '2':
        conn_mgr.connect()
        backup_yahoo_all(conn_mgr, backup_dir)
        conn_mgr.close()

    elif choice == '3':
        if not config["gmail_pass"]:
            print(f"\n🔑 Gmail [{config['gmail_user']}] のアプリパスワード（16桁）を入力してください:")
            config["gmail_pass"] = getpass.getpass("Gmail App Password: ").replace(" ", "").strip()
        g_mgr = GmailConnectionManager(config["gmail_user"], config["gmail_pass"])
        g_mgr.connect()
        sync_to_gmail(g_mgr, backup_dir, config["sync_folders"])
        g_mgr.close()

    elif choice == '4':
        conn_mgr.connect()
        backup_yahoo_all(conn_mgr, backup_dir)
        conn_mgr.close()

        if not config["gmail_pass"]:
            print(f"\n🔑 Gmail [{config['gmail_user']}] のアプリパスワード（16桁）を入力してください:")
            config["gmail_pass"] = getpass.getpass("Gmail App Password: ").replace(" ", "").strip()
        g_mgr = GmailConnectionManager(config["gmail_user"], config["gmail_pass"])
        g_mgr.connect()
        sync_to_gmail(g_mgr, backup_dir, config["sync_folders"])
        g_mgr.close()

    else:
        print("終了します。")

if __name__ == '__main__':
    main()
