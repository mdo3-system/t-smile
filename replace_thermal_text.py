# -*- coding: utf-8 -*-
with open("public/index.html", "r", encoding="utf-8") as f:
    html = f.read()

# Replace Card
old_card_target = """              <h3 style="color: #047857; font-size: 1.3rem; margin-bottom: 0.6rem;">
                24h AI気密・断熱・換気相談室
              </h3>
              <p style="color: #475569; font-size: 0.92rem; line-height: 1.75; margin-bottom: 1rem;">
                ハウスメーカーの営業トークではなく、熱工学・換気工学のデータに基づき客観回答。「壁内結露はどう防ぐ？」「第1種換気と第3種換気の違いは？」など何でもチャットで相談できます。
              </p>"""

new_card_target = """              <h3 style="color: #047857; font-size: 1.3rem; margin-bottom: 0.6rem;">
                24h 温熱換気AI相談室
              </h3>
              <p style="color: #475569; font-size: 0.92rem; line-height: 1.75; margin-bottom: 1rem;">
                <strong>30年以上住宅の温熱環境について調査・研究してきた知識を全て解放。</strong>疑問点をどしどし聞いてください。24時間365日、弊社の建築指導等の回答をお返しいたします。
              </p>"""

if old_card_target in html:
    html = html.replace(old_card_target, new_card_target)
    print("Replaced card target!")
else:
    print("Warning: old_card_target not found!")

# Replace Section Hero
old_hero_target = """        <h1 class="hero-title">
          24h AI気密・断熱・換気計画相談室<br>
          <span style="color: #34d399; font-size: 1.65rem;">営業トークなし。熱工学・換気工学の客観データで疑問を完全解消</span>
        </h1>
        <p class="hero-subtitle">
          「ハウスメーカーごとに言うことが違って何を信じればいいか分からない」「本当に結露しない家にするには何が必要？」<br>
          忖度なしの中立AIが、C値・UA値・換気方式・窓選び・床暖房の仕組みまで、最新の学術基準に基づき24時間いつでも分かりやすくお答えします。
        </p>"""

new_hero_target = """        <h1 class="hero-title">
          24h 温熱換気AI相談室<br>
          <span style="color: #34d399; font-size: 1.65rem;">30年以上住宅の温熱環境について調査・研究してきた知識を全て解放</span>
        </h1>
        <p class="hero-subtitle">
          30年以上住宅の温熱環境について調査・研究してきた知識を全て解放。疑問点をどしどし聞いてください。24時間365日、弊社の建築指導等の回答をお返しいたします。<br>
          「ハウスメーカーごとに言うことが違って何を信じればいいか分からない」「本当に壁内結露しない家にするには何が必要？」「鉄骨と木造の熱物理の差は？」など、忖度なしの中立AIが客観データと学術根拠に基づいて即時回答します。
        </p>"""

if old_hero_target in html:
    html = html.replace(old_hero_target, new_hero_target)
    print("Replaced hero target!")
else:
    print("Warning: old_hero_target not found!")

with open("public/index.html", "w", encoding="utf-8") as out:
    out.write(html)

print("Finished updating index.html!")
