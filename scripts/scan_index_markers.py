# -*- coding: utf-8 -*-
import sys

with open('public/index.html', 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

markers = [
    ('<!DOCTYPE html>', 'meta-head.html'),
    ('<header class="site-header">', 'header-nav.html'),
    ('<section id="top"', 'section-top.html'),
    ('id="ai-studio"', 'section-ai-studio.html'),
    ('id="madori-consultation-bot"', 'section-madori-bot.html'),
    ('id="thermal-consultation"', 'section-thermal-bot.html'),
    ('id="floorplan-studio"', 'section-floorplan-studio.html'),
    ('id="craftsmanship"', 'section-craftsmanship.html'),
    ('id="metaverse"', 'section-metaverse.html'),
    ('id="scent-experience"', 'section-scent-experience.html'),
    ('id="article-feature"', 'section-article-feature.html'),
    ('id="dashboard"', 'section-dashboard.html'),
    ('id="credlayer"', 'section-credlayer.html'),
    ('id="admin"', 'section-admin.html'),
    ('id="auth-modal"', 'modals-and-scripts.html')
]

for marker, name in markers:
    found = False
    for i, line in enumerate(lines):
        if marker in line:
            print(f"{name:<30} ({marker:<25}) -> line {i+1}")
            found = True
            break
    if not found:
        print(f"NOT FOUND: {name} ({marker})")
