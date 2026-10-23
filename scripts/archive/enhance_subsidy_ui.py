# -*- coding: utf-8 -*-
"""
scripts/enhance_subsidy_ui.py
Enhances public/subsidy/index.html with:
1. <datalist id="saitama-city-list"> containing all 63 municipalities
2. A direct regional select picker (<select id="municipality-select">)
3. 63-municipality badge tags & interactive search triggers
"""
import json
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUBSIDY_HTML = os.path.join(BASE_DIR, 'public', 'subsidy', 'index.html')
DATA_JSON = os.path.join(BASE_DIR, 'public', 'data', 'saitama_63_subsidies.json')

with open(DATA_JSON, 'r', encoding='utf-8') as f:
    municipalities = json.load(f)

# Group municipalities into 4 standard administrative / housing regions of Saitama
REGIONS = {
    "西武・比企地域（住ま居る重点施工エリア）": [
        "鶴ヶ島市", "坂戸市", "川越市", "東松山市", "飯能市", "狭山市", "入間市", "日高市",
        "毛呂山町", "越生町", "滑川町", "嵐山町", "小川町", "川島町", "吉見町", "鳩山町", "ときがわ町"
    ],
    "県央・南部地域": [
        "さいたま市", "川口市", "所沢市", "上尾市", "朝霞市", "志木市", "和光市", "新座市",
        "桶川市", "北本市", "鴻巣市", "蕨市", "戸田市", "富士見市", "ふじみ野市", "伊奈町", "三芳町"
    ],
    "東部地域": [
        "春日部市", "草加市", "越谷市", "八潮市", "三郷市", "蓮田市", "幸手市", "吉川市",
        "白岡市", "久喜市", "宮代町", "杉戸町", "松伏町"
    ],
    "北部・秩父地域": [
        "熊谷市", "行田市", "秩父市", "加須市", "本庄市", "羽生市", "深谷市",
        "美里町", "神川町", "上里町", "寄居町", "横瀬町", "皆野町", "長瀞町", "小鹿野町", "東秩父村"
    ]
}

# Create datalist options
datalist_opts = []
for m in municipalities:
    name = m["name"]
    amount = m["amountText"]
    datalist_opts.append(f'<option value="埼玉県{name}">{name}（{amount}）</option>')
datalist_opts.append('<option value="東京都">東京都内（東京ゼロエミ 最大360万円）</option>')
datalist_html = '<datalist id="saitama-city-list">\n      ' + '\n      '.join(datalist_opts) + '\n    </datalist>'

# Create select options grouped by region
select_groups = ['<select id="municipality-select" class="municipality-select" style="padding: 0.75rem 1rem; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.92rem; background: #fff; color: #1e293b; font-weight: 700; width: 100%; cursor: pointer;">']
select_groups.append('  <option value="">▼ 埼玉県内63市町村（40市22町1村）から直接選択する</option>')

for reg_name, cities in REGIONS.items():
    select_groups.append(f'  <optgroup label="【{reg_name}】">')
    for c in cities:
        # Find item in municipalities to get maxAmount
        item = next((x for x in municipalities if x["name"] == c), None)
        amt = item["amountText"] if item else ""
        select_groups.append(f'    <option value="埼玉県{c}">埼玉県{c} ({amt})</option>')
    select_groups.append('  </optgroup>')

select_groups.append('  <optgroup label="【東京都】">')
select_groups.append('    <option value="東京都練馬区">東京都（ゼロエミ水準A・最大360万円）</option>')
select_groups.append('  </optgroup>')
select_groups.append('</select>')
select_html = '\n'.join(select_groups)

with open(SUBSIDY_HTML, 'r', encoding='utf-8') as f:
    html = f.read()

# Replace search card input
old_search_card_pattern = r'<div class="search-card">[\s\S]*?</div>\s*</div>'
new_search_card = f"""<div class="search-card">
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
      <label for="city-input" style="font-weight: 800; font-size: 0.95rem; color: #1e293b; margin: 0;">
        🔍 建設予定地（市区町村）を入力 または 一覧から選択
      </label>
      <span style="font-size: 0.75rem; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-weight: 800;">
        埼玉県内全63市町村 100%網羅
      </span>
    </div>

    <!-- Search Input Grid -->
    <div class="search-grid" style="margin-bottom: 0.8rem;">
      <input type="text" id="city-input" class="search-input" value="埼玉県鶴ヶ島市" list="saitama-city-list" placeholder="例: 鶴ヶ島市、坂戸市、川越市、ときがわ町、練馬区..." autocomplete="off" />
      <button type="button" id="btn-search-subsidy" class="btn-search">
        <span>🤖</span> 受給可能額をAI判定
      </button>
    </div>
    {datalist_html}

    <!-- Quick Dropdown Picker -->
    <div style="margin-top: 0.6rem;">
      {select_html}
    </div>
  </div>"""

# Replace in html
pattern_to_match = r'<div class="search-card">[\s\S]*?</div>\s*</div>'
html, count = re.subn(pattern_to_match, new_search_card, html, count=1)
assert count == 1, f"Failed to replace search-card, matched {count}"

# Update event listener in script to wire up #municipality-select
old_listener = """    document.getElementById('btn-search-subsidy').addEventListener('click', () => {
      const q = document.getElementById('city-input').value.trim();
      if (q) updateSubsidyView(q);
    });"""

new_listener = """    const muniSelect = document.getElementById('municipality-select');
    if (muniSelect) {
      muniSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val) {
          document.getElementById('city-input').value = val;
          document.querySelectorAll('.city-chip').forEach(b => b.classList.remove('active'));
          updateSubsidyView(val);
        }
      });
    }

    document.getElementById('btn-search-subsidy').addEventListener('click', () => {
      const q = document.getElementById('city-input').value.trim();
      if (q) updateSubsidyView(q);
    });"""

html = html.replace(old_listener, new_listener)

with open(SUBSIDY_HTML, 'w', encoding='utf-8') as f:
    f.write(html)

print("[SUCCESS] Successfully updated search UI with datalist and 63-municipality select picker!")
