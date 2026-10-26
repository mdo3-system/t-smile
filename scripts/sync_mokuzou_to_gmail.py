#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
木造住宅設計サポート 専用 Gmail高速アップロードスクリプト
- ローカルに保存済みの「木造住宅設計ｻﾎﾟｰﾄ (20,361通)」をGmailの「木造住宅設計サポート」ラベルへ安全に投入
- レジューム（中断再開）完全対応（gmail_uploaded_log.json）
- GoogleのIMAP切断対策＆指数バックオフリトライ搭載
"""

import sys
import os
import imaplib
import email
import json
import time
import socket
import binascii
from pathlib import Path

# ソケット全体のデフォルトタイムアウト
socket.setdefaulttimeout(180)

BASE_DIR = Path(__file__).resolve().parent.parent
BACKUP_DIR = BASE_DIR / "email_backup"
SRC_FOLDER = BACKUP_DIR / "木造住宅設計ｻﾎﾟｰﾄ"
CONFIG_FILE = BASE_DIR / "scripts" / "mail_secrets.json"

GMAIL_IMAP_SERVER = "imap.gmail.com"
GMAIL_IMAP_PORT = 993
GMAIL_BATCH_REFRESH_INTERVAL = 40
MAX_GMAIL_APPEND_BYTES = 22 * 1024 * 1024

DEST_LABEL = "木造住宅設計サポート"

def p(text):
    print(text, flush=True)

# Modified UTF-7 コーデック
def modified_base64_encode(s):
    b = s.encode('utf-16-be')
    r = binascii.b2a_base64(b).decode('ascii').rstrip('\n').rstrip('=')
    return r.replace('/', ',')

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
                self.imap.sock.settimeout(180)
                self.imap.login(self.user, self.password)
                return self.imap
            except Exception as e:
                p(f"  ⚠️ Gmail接続試行 ({attempt}/{max_retries}) 失敗: {e}")
                time.sleep(attempt * 2)
        p("❌ Gmailへの接続に失敗しました。")
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
        p(f"   🏷️ Gmail上にラベル「{folder_name}」を新規作成しました")
    except Exception:
        pass
    return encoded_name

def main():
    if sys.platform == 'win32':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

    p("======================================================================")
    p("🚀 【木造住宅設計サポート】Gmail自動アップロード開始")
    p(f"📂 送信元ローカルフォルダ: {SRC_FOLDER}")
    p(f"🏷️ 投入先Gmailラベル名: [{DEST_LABEL}]")
    p("======================================================================")

    if not SRC_FOLDER.exists():
        p(f"❌ フォルダが見つかりません: {SRC_FOLDER}")
        sys.exit(1)

    # 認証情報読込
    with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
        config = json.load(f)
    gmail_user = config["gmail"]["user"]
    gmail_pass = config["gmail"]["app_password"].replace(" ", "").strip()

    g_mgr = GmailConnectionManager(gmail_user, gmail_pass)
    p(f"🔑 Gmailアカウント [{gmail_user}] へ接続中...")
    g_mgr.connect()
    p("✔ Gmail接続成功！")

    encoded_gmail_folder = ensure_gmail_folder(g_mgr, DEST_LABEL)

    # アップロード済みログ読込
    uploaded_log_file = BACKUP_DIR / "gmail_uploaded_log.json"
    uploaded_set = set()
    if uploaded_log_file.exists():
        try:
            with open(uploaded_log_file, 'r', encoding='utf-8') as f:
                uploaded_set = set(json.load(f))
        except Exception:
            pass

    eml_files = sorted(list(SRC_FOLDER.glob("*.eml")))
    total_files = len(eml_files)
    p(f"📊 対象メール総数: {total_files} 通")

    folder_name_key = "木造住宅設計ｻﾎﾟｰﾄ"
    total_uploaded = 0
    total_skipped = 0
    session_count = 0
    start_time = time.time()

    def save_log():
        try:
            with open(uploaded_log_file, 'w', encoding='utf-8') as f:
                json.dump(list(uploaded_set), f)
        except Exception:
            pass

    for i, eml_file in enumerate(eml_files, 1):
        log_key = f"{folder_name_key}/{eml_file.name}"
        if log_key in uploaded_set:
            total_skipped += 1
            continue

        file_size = eml_file.stat().st_size
        if file_size > MAX_GMAIL_APPEND_BYTES:
            p(f"   ⚠️ 【サイズ超過スキップ】{eml_file.name} ({file_size / (1024*1024):.1f}MB > 22MB) - ローカル保管のみ")
            uploaded_set.add(log_key)
            total_skipped += 1
            save_log()
            continue

        session_count += 1
        if session_count >= GMAIL_BATCH_REFRESH_INTERVAL:
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
                    total_uploaded += 1
                    uploaded_set.add(log_key)
                    success = True
                    break
                else:
                    p(f"   ⚠️ appendステータス非OK ({status}): {eml_file.name}")
                    time.sleep(2)
            except (socket.error, imaplib.IMAP4.abort, ConnectionResetError, TimeoutError, OSError) as e:
                p(f"   🔄 ソケット切断検知 ({e})。再接続中 (試行 {attempt}/{max_retries})...")
                time.sleep(attempt * 3)
                g_mgr.connect()
            except Exception as e:
                p(f"   ⚠️ append例外: {e}")
                time.sleep(attempt * 2)

        if not success:
            p(f"   ❌ {eml_file.name} 投入失敗（リトライ上限超過）")

        # 50通ごと、または最後でログ保存＆進捗表示
        if total_uploaded % 50 == 0 or (total_uploaded + total_skipped) == total_files:
            save_log()
            elapsed = time.time() - start_time
            rate = total_uploaded / elapsed if elapsed > 0 else 0
            remaining = (total_files - (total_uploaded + total_skipped)) / rate if rate > 0 else 0
            p(f"📤 進捗: {total_uploaded + total_skipped}/{total_files} 通 (投入済: {total_uploaded}, スキップ: {total_skipped}, 速度: {rate:.1f}通/秒, 残り予想: {remaining/60:.1f}分)")

    save_log()
    g_mgr.close()
    p("======================================================================")
    p(f"🎉 【投入完了】木造住宅設計サポートの移行が完了しました！")
    p(f"   - 投入完了: {total_uploaded} 通")
    p(f"   - スキップ: {total_skipped} 通")
    p("======================================================================")

if __name__ == '__main__':
    main()
