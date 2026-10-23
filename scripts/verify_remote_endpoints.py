#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import subprocess
import json

paths = [
    ('', 'トップページ'),
    ('version.json', 'バージョン情報'),
    ('subsidy/index.html', 'AI補助金ナビ'),
    ('mortgage/index.html', 'AI住宅ローン診断'),
    ('plans/', '3Dプラン集カタログ'),
    ('plans/detail/plan-a34-s01.html', '3Dプラン詳細'),
    ('plans/plan_001_1F_2d.webp', 'WebPフロア図面画像'),
    ('data/saitama_63_subsidies.json', '補助金63市町村DB'),
    ('data/plans.json', '323プランDB'),
    ('madori-sketch/', '3D間取り工房'),
    ('2021/', '旧WordPress過去資産')
]

print("=" * 65)
print("🌐 XServer (t-smile.co.jp) 本番公開エンドポイント 疎通確認テスト")
print("=" * 65)

all_ok = True
for p, label in paths:
    url = f"http://t-smile.co.jp/{p}"
    cmd = [
        "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
        "--resolve", "t-smile.co.jp:80:127.0.0.1",
        url
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True)
    code = res.stdout.strip()
    status_icon = "✅" if code in ("200", "301", "302") else "❌"
    print(f"{status_icon} [{code}] {label:24} : {url}")
    if code not in ("200", "301", "302"):
        all_ok = False

print("=" * 65)
if all_ok:
    print("🎉 すべてのエンドポイントが正常稼働（HTTP 200/301）しています！")
else:
    print("⚠️ 一部のエンドポイントでエラーが発生しています。")
print("=" * 65)
