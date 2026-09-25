import re

with open('section_at_line_446.html', 'r', encoding='utf-8') as f:
    text = f.read()

print('Length:', len(text))
chapters = re.findall(r'id=[\"\']art-ch\d+[\"\']', text)
print('Chapters in 446:', chapters)

# Check line 471 or later for images
with open('section_at_line_454.html', 'r', encoding='utf-8') as f:
    text2 = f.read()
print('Chapters in 454:', re.findall(r'id=[\"\']art-ch\d+[\"\']', text2))
