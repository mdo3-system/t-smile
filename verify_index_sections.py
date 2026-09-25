with open("public/index.html", "r", encoding="utf-8") as f:
    text = f.read()

import re
sections = re.findall(r'<section id="([^"]+)"', text)
print("Found sections in index.html:", sections)

ch_divs = re.findall(r'id="art-ch\d+"', text)
print("Found art-ch divs:", len(ch_divs), ch_divs)
