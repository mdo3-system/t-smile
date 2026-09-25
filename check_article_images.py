import os
import re

with open("public/index.html", "r", encoding="utf-8") as f:
    text = f.read()

start = text.find('<section id="article-feature"')
end = text.find('</section>', start)
article_html = text[start:end]

images = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', article_html)
print(f"Total images found in article-feature: {len(images)}")

for img in images:
    rel_path = img.lstrip('/')
    local_path = os.path.join("public", rel_path)
    exists = os.path.exists(local_path)
    size = os.path.getsize(local_path) if exists else 0
    print(f"{img} -> exists: {exists}, size: {size} bytes")

# Also list all files in public/images/kaitai and public/images/
print("\n--- Files in public/images/kaitai ---")
if os.path.exists("public/images/kaitai"):
    for f in os.listdir("public/images/kaitai"):
        print(f"  {f} ({os.path.getsize(os.path.join('public/images/kaitai', f))} bytes)")
else:
    print("  public/images/kaitai does not exist!")

print("\n--- Files in public/images ---")
for f in os.listdir("public/images"):
    p = os.path.join("public/images", f)
    if os.path.isfile(p):
        print(f"  {f} ({os.path.getsize(p)} bytes)")
