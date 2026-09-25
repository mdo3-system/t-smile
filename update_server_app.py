# -*- coding: utf-8 -*-
with open("server/app.js", "r", encoding="utf-8") as f:
    code = f.read()

# Replace header in answers
code = code.replace("【24h AI温熱・気密相談室 回答】", "【24h 温熱換気AI相談室 回答】")

# Update default return
old_default = """  return `【24h 温熱換気AI相談室 回答】
ご質問ありがとうございます。
当相談室は、建築環境工学・構造力学・温熱気密設計の客観的データに基づき、24時間365日いつでも中立的なアドバイスを行っています。

「鉄骨プレハブと木造の熱工学的な違い」「結露を防ぐ壁構造」「C値・UA値の目安」「第1種換気と第3種換気」「向こう30年最先端を維持する耐震・断熱設計」など、どのような疑問でも具体的にお尋ねください！`;"""

new_default = """  return `【24h 温熱換気AI相談室 回答】
ご質問ありがとうございます。
当相談室は、弊社が30年以上住宅の温熱環境について調査・研究してきた知識を全て解放し、疑問点にどしどしお答えする24時間365日の建築指導窓口です。

「大手鉄骨プレハブの寒冷地撤退の物理的理由（鉄骨熱橋vs木造超断熱）」「表面的な間取り満足より見えなくなる骨組み・筋肉を最重視する理由」「10年前のモデルハウスが向こう30年最先端であることの実証」「壁内結露を防ぐ透湿気密の鉄則」「C値・UA値・換気方式」など、どのような疑問でもどしどしお尋ねください。24時間365日、弊社の建築指導等の回答をお返しいたします！`;"""

if old_default in code:
    code = code.replace(old_default, new_default)
    print("Replaced default return in server/app.js!")
else:
    # Try replacing with the original header
    old_default_orig = """  return `【24h AI温熱・気密相談室 回答】
ご質問ありがとうございます。
当相談室は、建築環境工学・構造力学・温熱気密設計の客観的データに基づき、24時間365日いつでも中立的なアドバイスを行っています。

「鉄骨プレハブと木造の熱工学的な違い」「結露を防ぐ壁構造」「C値・UA値の目安」「第1種換気と第3種換気」「向こう30年最先端を維持する耐震・断熱設計」など、どのような疑問でも具体的にお尋ねください！`;"""
    if old_default_orig in code:
        code = code.replace(old_default_orig, new_default)
        print("Replaced original default return in server/app.js!")
    else:
        print("Warning: could not match default return in server/app.js")

with open("server/app.js", "w", encoding="utf-8") as out:
    out.write(code)

print("server/app.js updated successfully!")
