import re

with open('public/js/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'const caseStudiesData = (\{.*?\n\};)', text, re.DOTALL)
if m:
    data_str = m.group(1)
    # Parse each case
    # Matches "1": { ... }
    case_matches = list(re.finditer(r'"(\d+)":\s*\{', data_str))
    print(f"Total cases found: {len(case_matches)}")
    for idx, match in enumerate(case_matches):
        c_id = match.group(1)
        start = match.start()
        end = case_matches[idx + 1].start() if idx + 1 < len(case_matches) else len(data_str)
        chunk = data_str[start:end]
        title_m = re.search(r'"title":\s*"(.*?)"', chunk)
        title = title_m.group(1) if title_m else 'No title'
        photos_m = re.search(r'"photos":\s*\[(.*?)\]\s*\}', chunk, re.DOTALL)
        if photos_m:
            photos_chunk = photos_m.group(1)
            p_count = photos_chunk.count('"url":')
            print(f"CASE {c_id:2s} ({p_count:3d} photos): {title[:35]}")
