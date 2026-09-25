for ch_num in range(1, 11):
    with open(f"ch_{ch_num}_final.html", "r", encoding="utf-8") as f:
        content = f.read()
    print(f"--- Chapter {ch_num} (len: {len(content)}) ---")
    lines = [l.strip() for l in content.split('\n') if l.strip()]
    for l in lines[:3]:
        print(" ", l[:80])
    # check for img tags
    import re
    imgs = re.findall(r'<img[^>]+src=[\"\']([^\"\']+)[\"\']', content)
    print(f"  Images ({len(imgs)}):", imgs)
