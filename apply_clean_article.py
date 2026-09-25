with open("public/index.html", "r", encoding="utf-8") as f:
    index_content = f.read()

with open("clean_article_section.html", "r", encoding="utf-8") as f:
    clean_article = f.read()

# Locate <section id="article-feature" ... to </section>
start_idx = index_content.find('<section id="article-feature"')
if start_idx == -1:
    print("Error: Could not find <section id=\"article-feature\"")
    exit(1)

# Find the matching closing </section>
# Since there are nested elements or sections, let's find the closing tag
# We know the next section is dashboard: <section id="dashboard"
end_marker = '<section id="dashboard"'
end_idx = index_content.find(end_marker)
if end_idx == -1:
    print("Error: Could not find <section id=\"dashboard\"")
    exit(1)

# Backtrack from end_idx to find the </section> right before it
prev_section_close = index_content.rfind('</section>', start_idx, end_idx)
if prev_section_close == -1:
    print("Error: Could not find closing </section>")
    exit(1)

closing_tag_end = prev_section_close + len('</section>')

new_index = index_content[:start_idx] + clean_article.strip() + "\n\n    " + index_content[end_idx:]

with open("public/index.html", "w", encoding="utf-8") as out:
    out.write(new_index)

print(f"Successfully updated public/index.html with clean article section! New size: {len(new_index)} chars")
