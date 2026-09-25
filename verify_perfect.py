with open("perfect_restored_article.html", "r", encoding="utf-8") as f:
    content = f.read()

print(f"Total length: {len(content)} characters")

# Check for all chapters
for ch in range(1, 11):
    found = f'id="art-ch{ch}"' in content
    print(f"Chapter {ch} present: {found}")

# Check for any diff markers
for bad in ["diff_block", "@@", "Please note", "679:"]:
    if bad in content:
        print(f"WARNING: '{bad}' found in content!")
    else:
        print(f"Clean: '{bad}' not found.")
