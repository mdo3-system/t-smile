# -*- coding: utf-8 -*-
"""
scripts/verify_system_health.py
リファクタリング前後の安全性を客観的に保証するヘルスチェック自動テスト
"""
import urllib.request
import json
import sys

# Windows コンソールでの UTF-8 出力対応
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_URL = 'http://127.0.0.1:8080'

PAGES = [
    ('/', 'トップページ'),
    ('/madori-sketch/', '3D間取り工房'),
    ('/smilestudio.html', 'SmileStudio AI工房'),
    ('/awards/kankyo-housing/', '埼玉県環境住宅賞 LP'),
    ('/catalog/', '工学カタログ'),
    ('/evidence/', '公的エビデンス'),
    ('/subsidy/index.html', 'AI補助金ナビ'),
    ('/mortgage/index.html', 'AI住宅ローン診断'),
    ('/knowledge-video-portal/', 'AI知見動画ポータル'),
    ('/plans/', '3Dプラン集カタログ(SSG Hub)'),
    ('/plans/detail/plan-a34-s01.html', '3Dプラン詳細(SSG)'),
    ('/knowledge/thermal/th_air_01.html', '知見200選(E-E-A-T)')
]

ASSETS = [
    '/js/app.js',
    '/js/floorplan-studio.js',
    '/js/case-gallery.js',
    '/js/wagama-showcase.js',
    '/js/plan-gallery.js',
    '/js/plan-modeller.js',
    '/js/bubble-plan/equipment-presets.js',
    '/js/bubble-plan/site-geometry.js',
    '/js/bubble-plan/carte-storage.js',
    '/js/bubble-plan/physics-engine.js',
    '/js/bubble-plan.js',
    '/css/style.css',
    '/images/certs/cert_hagiwara_chouki.webp',
    '/images/certs/cert_hagiwara_bels.webp',
    '/images/certs/cert_hagiwara_c_val.webp',
    '/images/certs/award_kuki_panel.webp',
    '/partials/templates/tmpl-ai-studio.html',
    '/partials/templates/tmpl-floorplan-studio.html',
    '/version.json'
]

def check_url(path, desc=""):
    url = f"{BASE_URL}{path}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 HealthChecker'})
        with urllib.request.urlopen(req, timeout=5) as res:
            status = res.status
            content = res.read()
            return status, content
    except Exception as e:
        return 500, str(e).encode('utf-8')

def main():
    print("=" * 60)
    print("🏥 住ま居る Web システム総合ヘルスチェック")
    print("=" * 60)
    
    failures = []
    
    # 1. ページ到達性
    print("\n[1] 主要ページの到達性テスト (HTTP 200 OK):")
    for path, name in PAGES:
        status, content = check_url(path)
        if status == 200 and len(content) > 500:
            print(f"  ✅ {name:<22} ({path}) : OK ({len(content):,} bytes)")
        else:
            print(f"  ❌ {name:<22} ({path}) : FAILED (status={status})")
            failures.append(f"Page failed: {path} ({status})")

    # 2. 静的アセット・証明書画像の整合性
    print("\n[2] コアアセット・公的証明書画像の存在テスト:")
    for path in ASSETS:
        status, content = check_url(path)
        if status == 200 and len(content) > 50:
            print(f"  ✅ {path:<45} : OK ({len(content):,} bytes)")
        else:
            print(f"  ❌ {path:<45} : FAILED (status={status})")
            failures.append(f"Asset failed: {path} ({status})")

    # 3. 施主様プライバシー保護（H様表記・マスキング）の検知テスト
    print("\n[3] 施主様プライバシー保護テスト (禁止語句の混入ゼロ):")
    forbidden = ['萩原', 'すみれ']
    # 戸田市は subsidy 以外で禁止
    for path, name in [('/', 'トップページ'), ('/awards/kankyo-housing/', '環境住宅賞LP')]:
        status, content = check_url(path)
        text = content.decode('utf-8', errors='ignore')
        leaks = [word for word in forbidden if word in text]
        if '戸田市' in text:
            leaks.append('戸田市')
        if not leaks:
            print(f"  ✅ {name:<22} : 個人情報・市名の完全遮断 OK")
        else:
            print(f"  ❌ {name:<22} : 漏洩検知! -> {leaks}")
            failures.append(f"Privacy leak in {name}: {leaks}")

    # 4. 間取り工房の共通ヘッダー・フッター・モーダル整合性
    print("\n[4] 間取り工房のUIコンポーネント整合性テスト:")
    status, content = check_url('/madori-sketch/')
    m_text = content.decode('utf-8', errors='ignore')
    has_header = 'common-site-header' in m_text
    has_footer = 'common-site-footer' in m_text
    has_modal = 'modalFullscreenPrompt' in m_text
    has_toggle = 'toggleFullscreenMode' in m_text
    
    if has_header and has_footer and has_modal and has_toggle:
        print(f"  ✅ 共通ヘッダー・フッター・全画面モーダル・切替関数 : すべて正常")
    else:
        print(f"  ❌ 間取り工房UI欠落: header={has_header}, footer={has_footer}, modal={has_modal}, toggle={has_toggle}")
        failures.append("Madori sketch UI components missing")

    # 5. バージョン整合性
    print("\n[5] バージョン整合性テスト:")
    status, content = check_url('/version.json')
    try:
        v_data = json.loads(content.decode('utf-8'))
        v = v_data.get('version')
        print(f"  ✅ version.json 読み込み成功: v{v} (Release: {v_data.get('releaseName')})")
    except Exception as e:
        print(f"  ❌ version.json 解析失敗: {e}")
        failures.append("version.json invalid")

    print("\n" + "=" * 60)
    if not failures:
        print("🎉 すべてのテストに合格しました（ヘルススコア: 100/100）")
        print("=" * 60)
        return 0
    else:
        print(f"⚠️ {len(failures)} 件のテストに失敗しました:")
        for f in failures:
            print(f"  - {f}")
        print("=" * 60)
        return 1

if __name__ == '__main__':
    sys.exit(main())
