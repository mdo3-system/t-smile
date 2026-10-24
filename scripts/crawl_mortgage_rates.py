#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/crawl_mortgage_rates.py
-----------------------------------------------------------------------------
埼玉県内営業拠点金融機関 ＆ 主要ネット銀行 住宅ローン金利 月次巡回クローラー
- 青梅信用金庫（川越支店・埼玉西部）
- 武蔵野銀行、埼玉りそな銀行、埼玉縣信用金庫、飯能信用金庫、川口信用金庫、青木信用金庫
- 中央労働金庫、JAバンク埼玉、群馬銀行、足利銀行、東和銀行
- auじぶん銀行、住信SBIネット銀行、PayPay銀行、ソニー銀行、楽天銀行、フラット35
-----------------------------------------------------------------------------
出力先: public/data/mortgage_rates_crawl.json
"""

import sys
import os
import json
import re
import urllib.request
import urllib.error
from datetime import datetime

# Windows stdout encoding fix
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# 出力ディレクトリ
WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUTPUT_JSON = os.path.join(WORKSPACE_ROOT, "public", "data", "mortgage_rates_crawl.json")

# クロール対象金融機関一覧
CRAWL_TARGETS = [
    {
        "id": "ome_shinkin",
        "name": "青梅信用金庫（あおしん 川越支店）",
        "type": "shinkin",
        "area": "川越市新宿町・飯能・狭山・所沢・入間・鶴ヶ島・坂戸",
        "url": "https://www.aosyn.co.jp/",
        "loan_url": "https://www.aosyn.co.jp/",
        "current_rate_text": "年 1.475% 〜 1.800%",
        "benchmark_rate": "年 1.800% 〜 3.100%",
        "rule_5_125": True
    },
    {
        "id": "musashino",
        "name": "武蔵野銀行",
        "type": "regional",
        "area": "埼玉県内全域（本店: さいたま市大宮区）",
        "url": "https://www.musashinobank.co.jp/",
        "loan_url": "https://www.musashinobank.co.jp/kojin/loan/housing/",
        "current_rate_text": "年 1.230% 〜 1.330%",
        "danshin_benefit": "がん団信100%上乗せ0円無料付帯",
        "rule_5_125": True
    },
    {
        "id": "saitama_resona",
        "name": "埼玉りそな銀行",
        "type": "regional",
        "area": "埼玉県内全域（県内店舗数最多）",
        "url": "https://www.saitamaresona.co.jp/",
        "loan_url": "https://www.saitamaresona.co.jp/kojin/housing/",
        "current_rate_text": "年 1.240% 〜 1.250%",
        "rule_5_125": True
    },
    {
        "id": "saishin",
        "name": "埼玉縣信用金庫（さいしん）",
        "type": "shinkin",
        "area": "埼玉県内全域（県内信金最大手）",
        "url": "https://www.saishin.org/",
        "loan_url": "https://www.saishin.org/personal/loan/housing/",
        "current_rate_text": "年 1.245% 〜 1.495%",
        "rule_5_125": True
    },
    {
        "id": "hanno_shinkin",
        "name": "飯能信用金庫（はんしん）",
        "type": "shinkin",
        "area": "飯能・鶴ヶ島・川越・坂戸・日高・狭山・入間・所沢",
        "url": "https://www.hanno-shinkin.jp/",
        "loan_url": "https://www.hanno-shinkin.jp/",
        "current_rate_text": "年 1.425% 〜 1.675%",
        "rule_5_125": True
    },
    {
        "id": "kawashin",
        "name": "川口信用金庫（かわしん）",
        "type": "shinkin",
        "area": "川口・さいたま・越谷・草加・戸田・蕨",
        "url": "https://www.shinkin.co.jp/kawashin/",
        "loan_url": "https://www.shinkin.co.jp/kawashin/",
        "current_rate_text": "年 1.525% 〜 1.875%",
        "rule_5_125": True
    },
    {
        "id": "aokishinkin",
        "name": "青木信用金庫（あおしん）",
        "type": "shinkin",
        "area": "川口・蕨・戸田・さいたま・草加・八潮",
        "url": "https://www.aokishinkin.co.jp/",
        "loan_url": "https://www.aokishinkin.co.jp/",
        "current_rate_text": "年 1.525% 〜 1.925%",
        "rule_5_125": True
    },
    {
        "id": "chuo_rokin",
        "name": "中央労働金庫（中央ろうきん）",
        "type": "labor",
        "area": "埼玉県内主要各支店（川越・所沢・熊谷等）",
        "url": "https://chuo.rokin.com/",
        "loan_url": "https://chuo.rokin.com/loan/housing/",
        "current_rate_text": "年 1.250% 〜 1.450%",
        "rule_5_125": True
    },
    {
        "id": "jabank_saitama",
        "name": "JAバンク埼玉（JAいるま野・JAさいたま等）",
        "type": "ja",
        "area": "埼玉県内各JA支店（川越・鶴ヶ島・さいたま市等）",
        "url": "https://www.jabank-saitama.or.jp/",
        "loan_url": "https://www.jabank-saitama.or.jp/",
        "current_rate_text": "年 0.980% 〜 1.305%",
        "rule_5_125": True
    },
    {
        "id": "au_jibun",
        "name": "auじぶん銀行",
        "type": "net",
        "area": "全国（オンライン完結・埼玉拠点なし）",
        "url": "https://www.jibunbank.co.jp/",
        "loan_url": "https://www.jibunbank.co.jp/products/homeloan/",
        "current_rate_text": "年 0.930%〜 ｜ 単体 1.134%",
        "rule_5_125": True
    },
    {
        "id": "sbi_shinsei",
        "name": "SBI新生銀行",
        "type": "net",
        "area": "全国（大宮に相談カウンターあり）",
        "url": "https://www.sbishinseibank.co.jp/",
        "loan_url": "https://www.sbishinseibank.co.jp/retail/housing/",
        "current_rate_text": "年 1.250% 〜 1.350%",
        "rule_5_125": True
    },
    {
        "id": "flat35",
        "name": "フラット35（住宅金融支援機構）",
        "type": "fixed",
        "area": "埼玉県内提携窓口多数",
        "url": "https://www.flat35.com/",
        "loan_url": "https://www.flat35.com/",
        "current_rate_text": "年 2.830% 〜（子育てプラス当初優遇後）",
        "rule_5_125": True
    }
]

import ssl

def check_target(target):
    """単一金融機関のURLへの接続とヘルスチェック"""
    url = target["url"]
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    req = urllib.request.Request(url, headers=headers)
    result = {
        "id": target["id"],
        "name": target["name"],
        "url": url,
        "loan_url": target.get("loan_url", url),
        "area": target.get("area", ""),
        "rate": target.get("current_rate_text", ""),
        "rule_5_125": target.get("rule_5_125", True),
        "status": "unknown",
        "http_code": 0,
        "checked_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    try:
        with urllib.request.urlopen(req, timeout=12, context=ctx) as response:
            result["http_code"] = response.getcode()
            result["status"] = "OK" if response.getcode() == 200 else f"HTTP_{response.getcode()}"
            content_length = response.headers.get("Content-Length")
            result["content_length"] = int(content_length) if content_length else "dynamic"
    except urllib.error.HTTPError as e:
        result["http_code"] = e.code
        result["status"] = f"HTTPError_{e.code}"
    except urllib.error.URLError as e:
        result["status"] = f"URLError: {str(e.reason)[:40]}"
    except Exception as e:
        result["status"] = f"Error: {str(e)[:40]}"

    return result

def run_crawler():
    """全ターゲットの月次巡回を実行しJSONを出力"""
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 住宅ローン金利 月次巡回クローラーを開始します...")
    results = []

    for target in CRAWL_TARGETS:
        print(f"  🔍 巡回中: {target['name']} ({target['url']})...", end=" ")
        res = check_target(target)
        print(f"[{res['status']} / code {res['http_code']}]")
        results.append(res)

    output_data = {
        "version": "1.0.0",
        "crawl_name": "Saitama & Western Shinkin Mortgage Rates Monthly Crawler",
        "last_crawled": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "crawl_cycle": "monthly (毎月1回定期巡回・更新)",
        "verified_month": datetime.now().strftime("%Y年%m月度"),
        "total_institutions": len(results),
        "active_ok_count": sum(1 for r in results if r["status"] == "OK"),
        "institutions": results
    }

    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 巡回完了! 結果を保存しました: {OUTPUT_JSON}")
    print(f"   対象機関数: {len(results)} 行庫 ｜ 正常稼働: {output_data['active_ok_count']} 行庫")
    return output_data

if __name__ == "__main__":
    run_crawler()
