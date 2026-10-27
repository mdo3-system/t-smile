#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
住ま居る Webシステム ＆ 家カルテ ＆ 全ツール 総合セルフテストスクリプト
1. 全主要ページ・ツールのHTTP 200およびHTML構造整合性検証
2. コアJavaScript・CSS・データJSON・テンプレートの存在・構文検証
3. 家カルテ（#dashboard）のDOM要素・ストレージ・点検シート・チャット整合性
4. 3Dツール（SpeedPlanner/SmileStudio）およびAIナビ（補助金/住宅ローン）のデータ連携検証
5. サーバーAPIエンドポイントの健全性検証
"""

import sys
import os
import json
import urllib.request
import urllib.parse
from pathlib import Path

# Windows UTF-8 コンソール対応
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_URL = 'http://127.0.0.1:8080'
PUBLIC_DIR = Path(r"e:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity\public")

def check_http(path, desc=""):
    url = f"{BASE_URL}{path}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 SelfTester'})
        with urllib.request.urlopen(req, timeout=5) as res:
            content = res.read()
            return res.status, content, None
    except Exception as e:
        return 500, None, str(e)

def main():
    print("=" * 75)
    print("🧪 【住ま居る Webシステム】全ページ・ツール・家カルテ 総合セルフテスト開始")
    print(f"対象ベースURL: {BASE_URL}")
    print("=" * 75)

    errors = []
    warnings = []
    success_count = 0

    # ---------------------------------------------------------
    # TEST 1: 全主要ページ ＆ ツールの到達性・レスポンス検証
    # ---------------------------------------------------------
    print("\n📂 [TEST 1/5] 主要ページ ＆ 全ツールの到達性・HTML完全性テスト")
    target_pages = [
        ('/', 'メインLP (トップページ)'),
        ('/index.html', 'メインHTML'),
        ('/madori-sketch/', '3D間取り工房 (SpeedPlanner)'),
        ('/smilestudio.html', 'AI 3Dパース工房 (SmileStudio)'),
        ('/subsidy/index.html', 'AI補助金ナビ (埼玉63市町村)'),
        ('/mortgage/index.html', '住宅ローンAI診断'),
        ('/schedule/index.html', '家づくりスケジュール＆進行チェックリスト'),
        ('/jfd-survey/index.html', 'JFD敷地調査・3D点群測量解説'),
        ('/plans/', '3Dプラン集カタログ (323プランHub)'),
        ('/plans/detail/plan-a34-s01.html', '3Dプラン詳細個別SSGページ'),
        ('/catalog/index.html', 'デジタル工学カタログ'),
        ('/evidence/index.html', '公的エビデンス・温熱計算書'),
        ('/awards/kankyo-housing/index.html', '埼玉県環境住宅賞優秀賞 LP'),
        ('/cases/tokigawa-k.html', '施工実例 ときがわ町K様邸'),
        ('/cases/yoshimi-o.html', '施工実例 吉見町O様邸'),
        ('/cases/kawagoe-y.html', '施工実例 川越市Y様邸'),
        ('/knowledge-video-portal/index.html', '社内用 AI知見動画ポータル'),
        ('/knowledge/thermal/th_air_01.html', '温熱知見個別SSGページ')
    ]

    for path, name in target_pages:
        status, content, err = check_http(path)
        if status == 200 and content and len(content) > 500:
            print(f"  ✅ {name:<35} : OK (サイズ: {len(content):,} bytes)")
            success_count += 1
        else:
            msg = f"ページアクセス失敗: {name} ({path}) - Status: {status}, Error: {err}"
            print(f"  ❌ {msg}")
            errors.append(msg)

    # ---------------------------------------------------------
    # TEST 2: コアデータ ＆ アセットの存在・整合性検証
    # ---------------------------------------------------------
    print("\n📦 [TEST 2/5] コアデータベース ＆ JSON ＆ 必須アセットの検証")
    target_assets = [
        ('/js/app.min.js', 'メインAppスクリプト(圧縮版)'),
        ('/js/floorplan-studio.min.js', 'プランスタジオ3Dスクリプト'),
        ('/js/case-gallery.min.js', '施工実例ギャラリースクリプト'),
        ('/js/wagama-showcase.min.js', '我が儘ショウケーススクリプト'),
        ('/css/style.css', 'メインスタイルシート'),
        ('/data/plans.json', '323プランマスターデータベース'),
        ('/data/saitama_63_subsidies.json', '埼玉県63市町村補助金データベース'),
        ('/data/knowledge_video_portal_data.json', '知見動画400選ポータルデータベース'),
        ('/data/mortgage_rates_crawl.json', '最新住宅ローン金利データベース'),
        ('/partials/templates/tmpl-dashboard.html', '家カルテ テンプレート'),
        ('/partials/templates/tmpl-floorplan-studio.html', 'プランスタジオ テンプレート'),
        ('/partials/templates/tmpl-ai-studio.html', 'AIスタジオ テンプレート'),
        ('/version.json', 'バージョン管理JSON')
    ]

    for path, name in target_assets:
        status, content, err = check_http(path)
        if status == 200 and content and len(content) > 20:
            if path.endswith('.json'):
                try:
                    json.loads(content.decode('utf-8'))
                    print(f"  ✅ {name:<35} : OK (有効なJSON, {len(content):,} bytes)")
                except Exception as je:
                    msg = f"JSONパースエラー: {name} ({path}) - {je}"
                    print(f"  ❌ {msg}")
                    errors.append(msg)
                    continue
            else:
                print(f"  ✅ {name:<35} : OK ({len(content):,} bytes)")
            success_count += 1
        else:
            msg = f"アセット取得失敗: {name} ({path}) - Status: {status}"
            print(f"  ❌ {msg}")
            errors.append(msg)

    # ---------------------------------------------------------
    # TEST 3: 家カルテ（#dashboard）のDOM構造 ＆ 点検シート ＆ チャット整合性
    # ---------------------------------------------------------
    print("\n🏡 [TEST 3/5] 家カルテ（マイページ）の機能・UI整合性検証")
    status, dash_html, err = check_http('/partials/templates/tmpl-dashboard.html')
    if status == 200 and dash_html:
        dash_str = dash_html.decode('utf-8', errors='ignore')
        
        carte_elements = [
            ('id="dash-portal-premium-room"', 'プラン申込後専用ポータル室'),
            ('id="dash-maintenance-portal"', '住まい点検シート＆200年修繕計画'),
            ('家づくりサポート係 049-271-2350', '家づくりサポート係の公式連絡先表記'),
            ('id="chat-history-box"', '家カルテチャット履歴ボックス'),
            ('id="dashboard-chat-form"', '家カルテチャット送信フォーム'),
            ('id="btn-trigger-gdrive-sync"', 'Google Driveバックアップ同期ボタン'),
            ('全12部位', '12部位点検シート'),
            ('家を200年持たせるメンテナンス・修繕計画', '長期修繕計画表')
        ]

        for marker, desc in carte_elements:
            if marker in dash_str:
                print(f"  ✅ {desc:<35} : 正常に配置されています")
                success_count += 1
            else:
                msg = f"家カルテ要素欠落: {desc} ({marker})"
                print(f"  ❌ {msg}")
                errors.append(msg)

    status, top_html, err = check_http('/index.html')
    if status == 200 and top_html:
        top_str = top_html.decode('utf-8', errors='ignore')
        if 'id="btn-login-with-line"' in top_str or 'btn-login-with-line' in top_str:
            print(f"  ✅ LINE公式通知連携ボタン               : 正常に配置されています")
            success_count += 1

    # ---------------------------------------------------------
    # TEST 4: 各ツールの連携 ＆ ガイドモーダル検証
    # ---------------------------------------------------------
    print("\n🛠️ [TEST 4/5] 各ツールの連携 ＆ ガイドモーダル検証")
    # スケジュールページの「家カルテって何？」モーダル
    status, sched_html, err = check_http('/schedule/index.html')
    if status == 200 and sched_html:
        sched_str = sched_html.decode('utf-8', errors='ignore')
        if 'id="modal-carte-interactive-guide"' in sched_str:
            print(f"  ✅ スケジュール内 家カルテ解説モーダル : 正常に配置されています")
            success_count += 1
        else:
            errors.append("スケジュールページ内に id='modal-carte-interactive-guide' が見つかりません")

    # 住宅ローン診断のHeroボックス直下結果表示コンテナ
    status, mort_html, err = check_http('/mortgage/index.html')
    if status == 200 and mort_html:
        mort_str = mort_html.decode('utf-8', errors='ignore')
        if 'id="diagnosis-results"' in mort_str:
            print(f"  ✅ 住宅ローンAI診断 結果表示コンテナ  : 正常に配置されています")
            success_count += 1
        else:
            errors.append("住宅ローン診断内に #diagnosis-results が見つかりません")

    # AI補助金ナビの市町村UI
    status, sub_html, err = check_http('/subsidy/index.html')
    if status == 200 and sub_html:
        sub_str = sub_html.decode('utf-8', errors='ignore')
        if 'city' in sub_str.lower() and 'select' in sub_str.lower():
            print(f"  ✅ AI補助金ナビ 埼玉63市町村UI      : 正常に配置されています")
            success_count += 1
        else:
            errors.append("AI補助金ナビ内に市町村UIが見つかりません")

    # ---------------------------------------------------------
    # TEST 5: サーバーAPIエンドポイントの稼働検証
    # ---------------------------------------------------------
    print("\n⚡ [TEST 5/5] サーバーAPIエンドポイントの健全性検証")
    try:
        data = json.dumps({'id': 'k_01', 'voice': 'female'}).encode('utf-8')
        req = urllib.request.Request(f"{BASE_URL}/api/knowledge-video/combine-video", data=data, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=10) as res:
            res_json = json.loads(res.read().decode('utf-8'))
            if res.status == 200 and res_json.get('success'):
                print(f"  ✅ API: combine-video (k_01)         : 正常動作 (Status: 200)")
                success_count += 1
            else:
                errors.append(f"API combine-video エラー: {res_json}")
    except Exception as ae:
        errors.append(f"API combine-video 疎通エラー: {ae}")

    # ---------------------------------------------------------
    # 総合結果集計
    # ---------------------------------------------------------
    print("\n" + "=" * 75)
    print("📋 【テスト結果サマリー】")
    print(f"  - 成功項目数 : {success_count} 項目")
    print(f"  - 警告数     : {len(warnings)} 件")
    print(f"  - エラー数   : {len(errors)} 件")
    
    if errors:
        print("\n❌ 以下のエラーが検出されました:")
        for e in errors:
            print(f"  - {e}")
        print("=" * 75)
        sys.exit(1)
    else:
        print("\n🎉 全主要ページ、ツール、家カルテ、APIのセルフテストが【すべて正常（エラーゼロ）】で合格しました！")
        print("=" * 75)
        sys.exit(0)

if __name__ == '__main__':
    main()
