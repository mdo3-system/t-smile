import os

with open("public/index.html", "r", encoding="utf-8") as f:
    index_html = f.read()

with open("full_restored_article_feature.html", "r", encoding="utf-8") as f:
    article_sec = f.read()

# 1. Update navigation links in header if not present
if 'data-target="article-feature"' not in index_html:
    # Add to desktop nav
    old_desktop_nav = '<li><a class="nav-link" data-target="our-philosophy">📖 私たちの家づくり（芳彩）</a></li>'
    new_desktop_nav = '<li><a class="nav-link" data-target="our-philosophy">📖 私たちの家づくり（芳彩）</a></li>\n        <li><a class="nav-link highlight" data-target="article-feature" style="background: linear-gradient(135deg, #475569, #334155); color: #fff;">📖 手づくり住宅解体新書（全10章）</a></li>'
    index_html = index_html.replace(old_desktop_nav, new_desktop_nav)

    # Add to mobile drawer
    old_mobile_nav = '<li><a class="mobile-nav-link" data-target="our-philosophy">📖 私たちの家づくり（芳彩・解体新書）</a></li>'
    new_mobile_nav = '<li><a class="mobile-nav-link" data-target="our-philosophy">📖 私たちの家づくり（芳彩）</a></li>\n      <li><a class="mobile-nav-link highlight" data-target="article-feature">📖 手づくり住宅解体新書（全10章）</a></li>'
    index_html = index_html.replace(old_mobile_nav, new_mobile_nav)

# 2. Insert article_sec before #metaverse section
target_metaverse = '<section id="metaverse" class="page-section">'
if target_metaverse in index_html and 'id="article-feature"' not in index_html:
    index_html = index_html.replace(target_metaverse, article_sec + "\n    " + target_metaverse)
    print("Inserted article-feature section before #metaverse successfully!")
elif 'id="article-feature"' in index_html:
    print("article-feature is already in index.html, replacing it...")
    # replace existing
    import re
    index_html = re.sub(r'<section id="article-feature"[\s\S]*?</section>', article_sec.strip(), index_html)
else:
    print("Could not find target #metaverse to insert before")

with open("public/index.html", "w", encoding="utf-8") as f:
    f.write(index_html)

print("Saved public/index.html! Total length:", len(index_html))
