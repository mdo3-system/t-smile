# -*- coding: utf-8 -*-
import urllib.request
import json
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8080"

def test_flows():
    print("==================================================")
    print("🚀 住宅ローン・家カルテ・認証・LINE連携 テスト開始")
    print("==================================================")

    # 1. メール認証（マジックリンク発行）テスト
    print("\n[TEST 1] メール認証（マジックリンク発行）テスト")
    req_data = json.dumps({
        "name": "テスト施主様",
        "email": "test_owner@example.com",
        "phone": "090-9999-8888"
    }).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/api/auth/magic-link", data=req_data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as res:
        auth_res = json.loads(res.read().decode('utf-8'))
        print("  Status:", res.status)
        print("  User Created:", auth_res.get('user', {}).get('name'), auth_res.get('user', {}).get('email'))
        print("  Magic Token:", auth_res.get('token'))
        assert auth_res.get('success') == True
        token = auth_res.get('token')
        user_id = auth_res.get('user', {}).get('id')

    # 2. マジックリンクトークン検証テスト
    print("\n[TEST 2] マジックリンクトークン検証テスト")
    req = urllib.request.Request(f"{BASE_URL}/api/auth/verify?token={token}")
    with urllib.request.urlopen(req) as res:
        verify_res = json.loads(res.read().decode('utf-8'))
        print("  Status:", res.status)
        print("  Verified User:", verify_res.get('user', {}).get('name'))
        assert verify_res.get('success') == True

    # 3. プラン申込前（plan_applied == False）の家カルテデータ確認
    print("\n[TEST 3] プラン申込前（無料マイページ）の家カルテ挙動テスト")
    req = urllib.request.Request(f"{BASE_URL}/api/dashboard/{user_id}")
    with urllib.request.urlopen(req) as res:
        dash_res = json.loads(res.read().decode('utf-8'))
        print("  Status:", res.status)
        print("  Plan Applied Status:", dash_res.get('user', {}).get('plan_applied'))
        print("  Initial AI Messages:", len(dash_res.get('messages', [])))
        assert dash_res.get('user', {}).get('plan_applied') == False

    # 4. 家カルテ内チャット・メッセージ連携テスト（AI即時返答テスト）
    print("\n[TEST 4] 家カルテ内チャット・メッセージ連携テスト（運用初期問い合わせ）")
    chat_data = json.dumps({
        "text": "運用初期とのことですが、キッチンの通路幅について質問と不具合の相談です。"
    }).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/api/dashboard/{user_id}/chat", data=chat_data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as res:
        chat_res = json.loads(res.read().decode('utf-8'))
        print("  Status:", res.status)
        print("  AI Agent Reply:", chat_res.get('reply')[:60] + "...")
        print("  Total Messages:", len(chat_res.get('messages', [])))
        assert chat_res.get('success') == True

    # 5. プラン申込後のステータス更新テスト（15万円プラン申込承認）
    print("\n[TEST 5] プラン申込後（15万円JFD点群・個別ポータル開放）の挙動テスト")
    apply_data = json.dumps({
        "plan_applied": True
    }).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/api/carte/{user_id}/apply-plan", data=apply_data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as res:
        apply_res = json.loads(res.read().decode('utf-8'))
        print("  Status:", res.status)
        print("  Updated Plan Applied Status:", apply_res.get('plan_applied'))
        assert apply_res.get('plan_applied') == True

    # 6. プラン申込後の家カルテデータ再取得確認
    print("\n[TEST 6] プラン申込後の家カルテデータ再取得確認")
    req = urllib.request.Request(f"{BASE_URL}/api/dashboard/{user_id}")
    with urllib.request.urlopen(req) as res:
        dash_applied_res = json.loads(res.read().decode('utf-8'))
        print("  Status:", res.status)
        print("  Confirmed Plan Applied:", dash_applied_res.get('user', {}).get('plan_applied'))
        assert dash_applied_res.get('user', {}).get('plan_applied') == True

    # 7. Google Drive同期APIテスト
    print("\n[TEST 7] Google Driveバックアップ同期APIテスト")
    req = urllib.request.Request(f"{BASE_URL}/api/carte/migrate-to-drive", data=b'{}', headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as res:
        gdrive_res = json.loads(res.read().decode('utf-8'))
        print("  Status:", res.status)
        print("  Sync Message:", gdrive_res.get('message'))
        assert gdrive_res.get('success') == True

    print("\n==================================================")
    print("🎉 全テストケースが正常（ALL PASS）に完了しました！")
    print("==================================================")

if __name__ == '__main__':
    test_flows()
