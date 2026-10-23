# -*- coding: utf-8 -*-
import os

cards_file = os.path.join('public', 'data', 'craftsmanship_cards_snippet.html')
craft_file = os.path.join('src', 'partials', 'section-craftsmanship.html')

with open(cards_file, 'r', encoding='utf-8') as f:
    cards_content = f.read()

with open(craft_file, 'r', encoding='utf-8') as f:
    craft_html = f.read()

grid_start_tag = '<div class="case-overview-grid" id="case-overview-grid">'
end_marker = '<!-- Current Case Header & Switcher Bar -->'

pos_start = craft_html.find(grid_start_tag)
pos_end = craft_html.find(end_marker)

if pos_start != -1 and pos_end != -1:
    # 住宅専門プロカメラマン公式基準：部位別マスター設定パネル
    spec_panel = """
        <!-- 住宅専門プロカメラマン公式基準：部位別マスター設定パネル -->
        <div style="background: #ffffff; border: 2px solid #0284c7; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 4px 20px rgba(2, 132, 199, 0.08);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 1rem;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.4rem;">📷</span>
              <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: #0f172a;">
                住宅専用プロカメラマン撮影基準 ＆ 3Dパース基本設定（全13実邸・部位別完全準拠）
              </h3>
            </div>
            <span style="background: #e0f2fe; color: #0284c7; font-weight: 800; font-size: 0.78rem; padding: 4px 10px; border-radius: 20px;">
              神レンズ14-24mm / F11〜F16パンフォーカス / 垂直平行アオリ補正
            </span>
          </div>
          <p style="font-size: 0.88rem; color: #475569; margin: 0 0 1rem; line-height: 1.6;">
            お施主様邸を撮影した住宅専門カメラマンたちの「期待以上の画角・色使い・アングル」を住ま居るの公式標準として尊重。実写真ギャラリーの鑑賞はもちろん、AI 3Dパース工房（ArchiX Studio / Stable Diffusion / ControlNet）でもこの部位別設定を基本として同一構図・同一採光のシミュレーションを行っています。
          </p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
            <!-- 1. 外観 -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.8rem;">
              <div style="font-weight: 800; font-size: 0.88rem; color: #0369a1; margin-bottom: 4px;">🏡 ① 外観（ファサード）</div>
              <div style="font-size: 0.78rem; color: #334155; line-height: 1.5;">
                ・<strong>画角:</strong> 24〜35mm（垂直平行アオリ補正）<br>
                ・<strong>視線:</strong> アイレベル1,500mm<br>
                ・<strong>光:</strong> 夕景薄暮×室内3000K漏れ光
              </div>
            </div>
            <!-- 2. LDK -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.8rem;">
              <div style="font-weight: 800; font-size: 0.88rem; color: #d97706; margin-bottom: 4px;">🛋️ ② LDK（大開口リビング）</div>
              <div style="font-size: 0.78rem; color: #334155; line-height: 1.5;">
                ・<strong>画角:</strong> 14〜24mm（神レンズ超広角）<br>
                ・<strong>視線:</strong> アイレベル1,150mm（着座立ち黄金比）<br>
                ・<strong>光:</strong> 掃き出し窓自然光×間接照明
              </div>
            </div>
            <!-- 3. 水回り -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.8rem;">
              <div style="font-weight: 800; font-size: 0.88rem; color: #059669; margin-bottom: 4px;">🛁 ③ 水回り（十和田石・洗面）</div>
              <div style="font-size: 0.78rem; color: #334155; line-height: 1.5;">
                ・<strong>画角:</strong> 20〜28mm（歪み抑制広角）<br>
                ・<strong>視線:</strong> アイレベル1,050mm（天板目線）<br>
                ・<strong>光:</strong> サイド自然光×十和田石濡れ色
              </div>
            </div>
            <!-- 4. 個室・和室 -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.8rem;">
              <div style="font-weight: 800; font-size: 0.88rem; color: #7c3aed; margin-bottom: 4px;">🛏️ ④ 個室・和室（雪見障子）</div>
              <div style="font-size: 0.78rem; color: #334155; line-height: 1.5;">
                ・<strong>画角:</strong> 28〜50mm（静謐の標準画角）<br>
                ・<strong>視線:</strong> 座視線850mm（畳目線）<br>
                ・<strong>光:</strong> 障子漉し拡散光×陰影礼賛
              </div>
            </div>
            <!-- 5. その他 -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.8rem;">
              <div style="font-weight: 800; font-size: 0.88rem; color: #b45309; margin-bottom: 4px;">🔨 ⑤ その他（手刻み造作）</div>
              <div style="font-size: 0.78rem; color: #334155; line-height: 1.5;">
                ・<strong>画角:</strong> 35〜70mm（ディテール接写）<br>
                ・<strong>視線:</strong> 手元・目線フォーカス<br>
                ・<strong>光:</strong> 手鉋木肌の艶×珪藻土テクスチャ
              </div>
            </div>
          </div>
        </div>
"""

    old_title = 'お客様邸 施工実例写真集（全6邸・各20枚以上の写真ギャラリー）'
    new_title = 'お客様邸 施工実例写真アーカイブ（全12実邸＋特別実邸・プロ写真1,220枚）'
    craft_html = craft_html.replace(old_title, new_title)

    old_sub = '気になるお住まいをタップして切り替えてご覧ください。各邸20枚以上の高精細写真とともに、お施主様の想い・大工職人の技・建築士の計算ポイントを詳細に掲載しています。'
    new_sub = '大切なお施主様と建築した本物の住宅実例（全12邸＋特別実邸・プロ撮影1,220枚）を完全公開。気になる邸宅をタップして切り替えてご覧いただけます。住宅専門プロカメラマンによる卓越した画角・アングル・光の演出と、お施主様の想い・大工職人の技・建築士の構造計算を詳しく掲載しています。'
    craft_html = craft_html.replace(old_sub, new_sub)

    new_grid_html = spec_panel + '\n        ' + grid_start_tag + '\n' + cards_content + '\n        </div>\n\n        '
    craft_html = craft_html[:pos_start] + new_grid_html + craft_html[pos_end:]

    with open(craft_file, 'w', encoding='utf-8') as f:
        f.write(craft_html)
    print("SUCCESS: Updated section-craftsmanship.html")
else:
    print(f"FAILED: pos_start={pos_start}, pos_end={pos_end}")
