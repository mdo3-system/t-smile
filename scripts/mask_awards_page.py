# -*- coding: utf-8 -*-
"""
scripts/mask_awards_page.py
awards/kankyo-housing/index.html のプライバシー保護完全マスキング
"""
import re

target_file = 'public/awards/kankyo-housing/index.html'

with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    # 氏名フルネーム
    (r'萩原\s*佳明\s*様', 'H様'),
    (r'萩原\s*佳明', 'H'),
    (r'萩原様邸', 'H様邸'),
    (r'萩原様', 'H様'),
    (r'萩原です', 'Hです'),
    # 市名
    (r'戸田市・萩原様邸', '埼玉県・H様邸'),
    (r'戸田市萩原様邸', '埼玉県H様邸'),
    (r'埼玉県戸田市', '埼玉県'),
    (r'戸田市で', '埼玉県内で'),
    (r'戸田市に', '埼玉県内に'),
    (r'戸田市長\s*菅原文仁（公印）', '所管行政庁（公印）'),
    (r'戸田市長公印', '所管行政庁公印'),
    (r'戸田市', '埼玉県'),
    # 注記
    (r'※\s*公開受賞情報に基づき施主様本名（萩原 佳明 様）を掲載しております。施主様の私生活保護のため、詳細番地・地番のみマスキング処理を行っています。',
     '※ 個人情報保護のため、お施主様のお名前をイニシャル表記（H様）として掲載しております。詳細住所・番地は非公開としています。'),
    (r'※\s*公開受賞情報に基づき本名を掲載しています。個人情報保護のため詳細住所・番地は非公開としています。',
     '※ 個人情報保護のため、お施主様のお名前をイニシャル表記（H様）として掲載しております。詳細住所・番地は非公開としています。')
]

for pat, rep in replacements:
    content = re.sub(pat, rep, content)

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully masked awards/kankyo-housing/index.html!")
