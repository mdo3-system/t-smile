# -*- coding: utf-8 -*-
import json
import re

DATA_JSON = 'public/data/saitama_63_subsidies.json'
HTML_FILE = 'public/subsidy/index.html'

with open(DATA_JSON, 'r', encoding='utf-8') as f:
    data = json.load(f)

cities_dict = {}
for m in data:
    sub_obj = {
        "id": f"{m['key']}_sub",
        "tier": "city",
        "tierName": m["tierName"],
        "name": m["programName"],
        "maxAmount": m["maxAmount"],
        "amountText": m["amountText"],
        "desc": m["desc"],
        "usageRate": m["usageRate"],
        "statusText": m["statusText"],
        "conditions": m["conditions"],
        "link": m["link"]
    }
    cities_dict[m["key"]] = {
        "name": m["name"],
        "aliases": m["aliases"],
        "subsidies": [sub_obj]
    }

js_code = json.dumps(cities_dict, ensure_ascii=False, indent=6)

with open(HTML_FILE, 'r', encoding='utf-8') as f:
    html = f.read()

# Replace cities: { ... } in SUBSIDY_DATABASE
pattern = r'cities:\s*\{[\s\S]*?\}\s*\n\s*\}\s*;\s*function updateSubsidyView'
replacement = f'cities: {js_code}\n  }};\n\n  function updateSubsidyView'
html, count = re.subn(pattern, replacement, html)
if count == 0:
    pattern2 = r'cities:\s*\{[\s\S]*?\}\s*\n\s*\}\s*;'
    replacement2 = f'cities: {js_code}\n  }};'
    html, count = re.subn(pattern2, replacement2, html)

assert count > 0, "Failed to replace cities block"

# Update matching logic in updateSubsidyView
old_matching = r'for \(const cKey in SUBSIDY_DATABASE\.cities\) \{[\s\S]*?break;\s*\}\s*\}'
new_matching = """const qLower = query.toLowerCase().trim();
      const qClean = qLower
        .replace(/^(埼玉県|東京都)/, '')
        .replace(/^(比企郡|入間郡|秩父郡|児玉郡|大里郡|南埼玉郡|北葛飾郡|北足立郡)/, '')
        .trim();

      for (const cKey in SUBSIDY_DATABASE.cities) {
        const cData = SUBSIDY_DATABASE.cities[cKey];
        const keyLower = cKey.toLowerCase();
        const nameLower = cData.name.toLowerCase();
        const baseName = nameLower.replace(/(市|町|村)$/, '');

        const isMatch = (qClean && (qClean.includes(keyLower) || keyLower.includes(qClean) || qClean.includes(baseName) || baseName.includes(qClean))) ||
                        (cData.aliases && cData.aliases.some(a => {
                          const al = a.toLowerCase();
                          return qLower.includes(al) || (qClean && (al.includes(qClean) || qClean.includes(al)));
                        }));

        if (isMatch) {
          matchedCity = cData;
          break;
        }
      }"""

html = re.sub(old_matching, new_matching, html)

# Add smooth scroll to result on change
old_change = "updateSubsidyView(val);"
new_change = """updateSubsidyView(val);
          const banner = document.getElementById('result-summary-banner');
          if (banner) banner.scrollIntoView({ behavior: 'smooth', block: 'start' });"""
html = html.replace(old_change, new_change)

with open(HTML_FILE, 'w', encoding='utf-8') as f:
    f.write(html)

print("[SUCCESS] Synced all 63 municipalities with fuzzy romaji matching into public/subsidy/index.html!")
