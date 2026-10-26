import re

file_path = 'public/knowledge/thermal/index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

chapters = [
    (1, '断熱性能・UA値・外皮設計'),
    (2, '気密性能・C値・隙間対策'),
    (3, '基礎断熱・床断熱・床下空間'),
    (4, '24h換気・第1種全熱交換・給排気'),
    (5, '窓・サッシ戦略・日射取得と遮蔽'),
    (6, '結露・カビ防止・壁体内湿気挙動'),
    (7, '冷暖房設計・全館空調・パッシブ'),
    (8, '2025年法改正・生涯コスト・健康')
]

for num, title in chapters:
    # ターゲットパターン
    target = f'<h2 style="font-size: 1.35rem; font-weight: 800; color: #0f172a; margin: 0;">\n                📂 {title}'
    # 直前の <div style="background: #ffffff; ... を <div id="chapter-{num}" style="scroll-margin-top: 100px; ... に置換
    # 確実に行うため、正規表現で直前の div を置換
    pattern = r'(<div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.8rem; margin-bottom: 2rem; box-shadow: 0 4px 15px rgba\(0,0,0,0.03\);">\s*<div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-bottom: 1rem; border-bottom: 2px solid #10b981; padding-bottom: 0.6rem;">\s*<h2 style="font-size: 1.35rem; font-weight: 800; color: #0f172a; margin: 0;">\s*📂 ' + re.escape(title) + r')'
    replacement = f'<div id="chapter-{num}" style="scroll-margin-top: 100px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.8rem; margin-bottom: 2rem; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">\n            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-bottom: 1rem; border-bottom: 2px solid #10b981; padding-bottom: 0.6rem;">\n              <h2 style="font-size: 1.35rem; font-weight: 800; color: #0f172a; margin: 0;">\n                📂 {title}'
    content, count = re.subn(pattern, replacement, content, count=1)
    print(f'Chapter {num} ({title}): replaced {count} times')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done updating anchors in public/knowledge/thermal/index.html!')
