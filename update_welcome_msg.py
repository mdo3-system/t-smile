# -*- coding: utf-8 -*-
with open("public/index.html", "r", encoding="utf-8") as f:
    html = f.read()

old_welcome = """              <strong>はじめまして！24h AI温熱・気密相談室です。</strong><br>
              家づくりにおいて「冬暖かく夏涼しい、そして絶対に結露しない」を実現するためには、建物の気密（C値）、断熱（UA値）、換気計画（第1種・第3種）が極めて重要です。<br>
              上のチップをタップするか、気になる疑問を何でも下のメッセージ欄からご質問ください！"""

new_welcome = """              <strong>はじめまして！24h 温熱換気AI相談室へようこそ。</strong><br>
              30年以上住宅の温熱環境について調査・研究してきた知識を全て解放。疑問点をどしどし聞いてください。24時間365日、弊社の建築指導等の回答をお返しいたします。<br>
              「本当に結露しない家にするには？」「鉄骨と木造の熱物理の差」「C値・UA値の真実」「表面的な間取り満足より見えなくなる骨組み・筋肉が最重要である理由」など、上のチップをタップするか下の欄からご自由にお尋ねください！"""

if old_welcome in html:
    html = html.replace(old_welcome, new_welcome)
    print("Replaced chat welcome message!")
else:
    print("Warning: old_welcome not found verbatim, searching...")
    # Let's find thermal-chat-history
    idx = html.find('id="thermal-chat-history"')
    if idx != -1:
        print(html[idx:idx+600])

with open("public/index.html", "w", encoding="utf-8") as out:
    out.write(html)

print("index.html welcome message updated!")
