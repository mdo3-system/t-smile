import re
import os

with open('public/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

total_bytes = len(text.encode('utf-8'))
print(f"Total Bytes: {total_bytes:,} bytes ({total_bytes/1024:.1f} KB)")

# Templates
templates = re.findall(r'(<template id=[\'"]([^\'"]+)[\'"].*?</template>)', text, re.DOTALL)
tmpl_total = sum(len(full.encode('utf-8')) for full, tid in templates)
print(f"\n--- Templates ({len(templates)} items, Total: {tmpl_total:,} bytes / {tmpl_total/1024:.1f} KB) ---")
for full, tid in templates:
    size = len(full.encode('utf-8'))
    print(f"  - #{tid}: {size:,} bytes ({size/1024:.1f} KB)")

# Inline scripts
scripts = re.findall(r'(<script[^>]*>.*?</script>)', text, re.DOTALL)
script_total = sum(len(s.encode('utf-8')) for s in scripts)
print(f"\n--- Scripts ({len(scripts)} items, Total: {script_total:,} bytes / {script_total/1024:.1f} KB) ---")
for i, s in enumerate(scripts):
    size = len(s.encode('utf-8'))
    # preview first 60 chars
    first_line = s.split('\n')[0][:80]
    print(f"  - Script {i+1} ({first_line}): {size:,} bytes")

# Inline styles
styles = re.findall(r'(<style[^>]*>.*?</style>)', text, re.DOTALL)
style_total = sum(len(st.encode('utf-8')) for st in styles)
print(f"\n--- Styles ({len(styles)} items, Total: {style_total:,} bytes / {style_total/1024:.1f} KB) ---")
for i, st in enumerate(styles):
    size = len(st.encode('utf-8'))
    print(f"  - Style {i+1}: {size:,} bytes")

# Direct body markup outside templates, scripts, styles
non_tmpl = re.sub(r'<template[^>]*>.*?</template>', '', text, flags=re.DOTALL)
non_tmpl_no_js = re.sub(r'<script[^>]*>.*?</script>', '', non_tmpl, flags=re.DOTALL)
non_tmpl_pure = re.sub(r'<style[^>]*>.*?</style>', '', non_tmpl_no_js, flags=re.DOTALL)
pure_bytes = len(non_tmpl_pure.encode('utf-8'))
print(f"\n--- Pure Static Body (Visible DOM on Load) ---")
print(f"  Pure Static Body: {pure_bytes:,} bytes ({pure_bytes/1024:.1f} KB)")
