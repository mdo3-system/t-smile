with open("public/index.html", "r", encoding="utf-8") as f:
    text = f.read()

for ch in range(1, 11):
    cid = f'id="art-ch{ch}"' in text
    tid = f'data-tab="ch{ch}"' in text
    print(f"Chapter {ch:2d}: content_id={cid}, tab_btn={tid}")
