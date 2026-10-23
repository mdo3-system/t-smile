# -*- coding: utf-8 -*-
"""
scripts/fix_lps_privacy.py
build_static_lps.py および build_site.py 内の施主様プライバシー（H様・埼玉県）の恒久マスキング
"""
import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    # 置換パターン
    replacements = [
        (r'萩原\s*佳明\s*様', 'H様'),
        (r'萩原\s*佳明', 'H'),
        (r'萩原様邸', 'H様邸'),
        (r'萩原様', 'H様'),
        (r'萩原です', 'Hです'),
        (r'戸田市・萩原様邸', '埼玉県・H様邸'),
        (r'戸田市萩原様邸', '埼玉県H様邸'),
        (r'戸田市・H様邸（萩原様邸）', '埼玉県・H様邸'),
        (r'戸田市H様邸（萩原様邸）', '埼玉県・H様邸'),
        (r'戸田市H様邸', '埼玉県H様邸'),
        (r'戸田市・H様邸', '埼玉県・H様邸'),
        (r'埼玉県戸田市で新築', '埼玉県で新築'),
        (r'埼玉県戸田市・', '埼玉県・'),
        (r'埼玉県戸田市', '埼玉県'),
        (r'戸田市で新築', '埼玉県で新築'),
        (r'戸田市で建築', '埼玉県で建築'),
        (r'戸田市に建てられた', '埼玉県に建てられた'),
        (r'戸田市長', '市長'),
        (r'菅原文仁氏\s*公印', '公印'),
        (r'※\s*公開受賞情報に基づき施主様本名（萩原 佳明 様）を掲載しております。施主様の私生活保護のため、詳細番地・地番のみマスキング処理を行っています。',
         '※ 施主様のプライバシー保護のため、ご要望に基づきイニシャル表記（埼玉県・H様邸）とし、お名前・詳細番地はマスキング処理を実施しております。')
    ]

    count = 0
    for pat, rep in replacements:
        new_text, n = re.subn(pat, rep, text)
        if n > 0:
            count += n
            text = new_text

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)

    print(f"Fixed {filepath}: {count} replacements.")

if __name__ == '__main__':
    fix_file('scripts/build_static_lps.py')
    fix_file('scripts/build_site.py')
