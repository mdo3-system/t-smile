import json
import re

with open('public/js/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

m = re.search(r'const caseStudiesData\s*=\s*(\{[\s\S]*?\n\s*\});', content)
if m:
    data_str = m.group(1)
    data = json.loads(data_str)
    for k, v in data.items():
        title = v.get("title", "")
        count = len(v.get("photos", []))
        print(f"Case {k}: photos={count} | title={title}")
else:
    print("caseStudiesData regex match failed")
