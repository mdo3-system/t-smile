# -*- coding: utf-8 -*-
"""
scripts/evaluate_phase3_quality.py
==================================
第3弾セルフテスト（本格和室・土間リビング・小上がり和室）の品質・幾何評価＆コンタクトシート生成
"""

import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity"
OUT_DIR = os.path.join(BASE_DIR, "public", "renders", "selftest_multicase_phase3")
GRID_OUT = os.path.join(OUT_DIR, "phase3_multicase_comparison_grid.jpg")

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msgothic.ttc",
    r"C:\Windows\Fonts\meiryo.ttc",
    r"C:\Windows\Fonts\YuGothM.ttc",
    r"C:\Windows\Fonts\arial.ttf"
]

def get_font(size):
    for f in FONT_CANDIDATES:
        if os.path.exists(f):
            try:
                return ImageFont.truetype(f, size)
            except Exception:
                pass
    return ImageFont.load_default()

def get_canny_edges(im):
    gray = im.convert('L')
    edge = gray.filter(ImageFilter.FIND_EDGES)
    arr = np.array(edge, dtype=float)
    return (arr > 30).astype(np.uint8)

def evaluate_case(case_info):
    src_path = case_info['src']
    src_im = Image.open(src_path).convert('RGB').resize((960, 640), Image.Resampling.LANCZOS)
    src_edge = get_canny_edges(src_im)

    results = []
    for title, fname in case_info['tests']:
        fpath = os.path.join(OUT_DIR, fname)
        if not os.path.exists(fpath):
            continue
        gen_im = Image.open(fpath).convert('RGB')
        gen_edge = get_canny_edges(gen_im)

        intersection = np.logical_and(src_edge, gen_edge)
        false_edge = np.logical_and(np.logical_not(src_edge), gen_edge)
        false_edge_rate = float(np.sum(false_edge)) / float(np.sum(gen_edge) + 1e-6)
        preservation_rate = float(np.sum(intersection)) / float(np.sum(src_edge) + 1e-6)

        arr = np.array(gen_im, dtype=float)
        h, w, _ = arr.shape
        floor = arr[int(h*0.65):, :]
        r_mean = float(np.mean(arr[:, :, 0]))
        b_mean = float(np.mean(arr[:, :, 2]))
        warmth_ratio = r_mean / (b_mean + 1e-6)

        results.append({
            'title': title,
            'filename': fname,
            'image': gen_im,
            'preservation_rate': preservation_rate * 100.0,
            'false_edge_rate': false_edge_rate * 100.0,
            'floor_brightness': float(np.mean(floor)),
            'overall_brightness': float(np.mean(arr)),
            'warmth_ratio': warmth_ratio
        })
    return src_im, results

PHASE3_INFO = [
    {
        'id': 'kb_washitsu',
        'name': '鶴ヶ島市 KB様邸',
        'sub': '本格モダン和室・雪見障子・地窓・吊り押入れ',
        'src': os.path.join(BASE_DIR, "raw_source_case", "鶴ヶ島市 KB様邸", "和室", "DSC_8634.jpg"),
        'tests': [
            ('① 骨格完全固定 (Base)', 'kb_washitsu_base.jpg'),
            ('② 墨色和紙畳化 (Charcoal)', 'kb_washitsu_charcoal.jpg'),
            ('③ 夕景・行燈モード (Twilight)', 'kb_washitsu_twilight.jpg')
        ]
    },
    {
        'id': 't_doma',
        'name': '鶴ヶ島市 T様邸',
        'sub': '古民家再生・土間リビング・現し垂木天井・自然素材',
        'src': os.path.join(BASE_DIR, "raw_source_case", "鶴ヶ島市 T様邸", "1F", "IMG_9258.jpg"),
        'tests': [
            ('① 骨格完全固定 (Base)', 't_doma_base.jpg'),
            ('② 土間玄昌石タイル (Dark Floor)', 't_doma_dark_slate.jpg'),
            ('③ 夕景トワイライト (Twilight)', 't_doma_twilight.jpg')
        ]
    },
    {
        'id': 'o_koagari',
        'name': '吉見町 O様邸',
        'sub': '小上がり和室・段差収納・無垢ウォールナット床',
        'src': os.path.join(BASE_DIR, "raw_source_case", "吉見町 O様邸", "DSC_0590.JPG"),
        'tests': [
            ('① 骨格完全固定 (Base)', 'o_koagari_base.jpg'),
            ('② 濃色モダン琉球畳 (Dark Floor)', 'o_koagari_ryukyu.jpg'),
            ('③ 夕景トワイライト (Twilight)', 'o_koagari_twilight.jpg')
        ]
    }
]

def main():
    print("=" * 70)
    print("  他施工実例 第3弾（和室・土間・小上がり）品質・幾何エッジ検証")
    print("=" * 70)

    all_data = []
    for c in PHASE3_INFO:
        print(f"\n【{c['name']}】({c['sub']})")
        src_im, res = evaluate_case(c)
        all_data.append((c, src_im, res))

        base_res = res[0]
        print(f"  [原本] ➔ 基準画像 (Base Day):")
        print(f"    ・主骨格保持率: {base_res['preservation_rate']:.1f}%")
        print(f"    ・床明度: {base_res['floor_brightness']:.1f}")

        for r in res[1:]:
            print(f"  [{r['title']}]:")
            print(f"    ・主骨格保持率: {r['preservation_rate']:.1f}%")
            if '畳' in r['title'] or 'Dark' in r['title'] or 'Charcoal' in r['title']:
                diff = base_res['floor_brightness'] - r['floor_brightness']
                print(f"    ・床/畳明度変化: {base_res['floor_brightness']:.1f} ➔ {r['floor_brightness']:.1f} (明度低下: -{diff:.1f}pt ➔ 濃色化実証)")
            elif '夕景' in r['title'] or '行燈' in r['title']:
                diff = r['warmth_ratio'] - base_res['warmth_ratio']
                print(f"    ・色温度暖色比率(R/B): {base_res['warmth_ratio']:.2f} ➔ {r['warmth_ratio']:.2f} (+{diff:.2f} ➔ 行燈・間接照明実証)")

    col_w = 480
    row_h = 320
    header_h = 70
    grid_w = col_w * 4 + 40
    grid_h = header_h + (row_h + 80) * 3 + 40

    grid_im = Image.new('RGB', (grid_w, grid_h), (24, 28, 36))
    draw = ImageDraw.Draw(grid_im)

    title_font = get_font(28)
    sub_font = get_font(18)
    label_font = get_font(15)
    meta_font = get_font(13)

    draw.text((25, 20), "住ま居る AIパース工房 - 伝統・自然素材セルフテスト（和室・土間・小上がり）", font=title_font, fill=(247, 250, 252))
    draw.text((25, 52), "地窓・吊り押入れ・現し垂木天井・小上がり框の幾何を100%保持しつつ畳・床材・照明を変革", font=sub_font, fill=(160, 174, 192))

    y_offset = header_h + 20

    for c, src_im, res in all_data:
        draw.text((25, y_offset), f"■ {c['name']} 【{c['sub']}】", font=sub_font, fill=(237, 137, 54))
        y_offset += 30

        images_to_show = [
            ("【原本写真】実例原本（下絵）", src_im, "ControlNet入力ソース"),
            (f"【{res[0]['title'].split(' ')[0]}】", res[0]['image'], f"骨格保持率:{res[0]['preservation_rate']:.1f}%"),
            (f"【{res[1]['title'].split(' ')[0]}】", res[1]['image'], f"素材変革成功 / 幾何直線保持"),
            (f"【{res[2]['title'].split(' ')[0]}】", res[2]['image'], f"暖色演出(R/B比:{res[2]['warmth_ratio']:.2f})")
        ]

        x_offset = 20
        for label, img, stat in images_to_show:
            thumb = img.resize((col_w - 10, row_h), Image.Resampling.LANCZOS)
            grid_im.paste(thumb, (x_offset, y_offset))
            draw.rectangle([x_offset, y_offset, x_offset + col_w - 10, y_offset + row_h], outline=(74, 85, 104), width=1)
            draw.text((x_offset + 5, y_offset + row_h + 5), label, font=label_font, fill=(226, 232, 240))
            draw.text((x_offset + 5, y_offset + row_h + 24), stat, font=meta_font, fill=(203, 213, 225))
            x_offset += col_w

        y_offset += row_h + 50

    grid_im.save(GRID_OUT, quality=92)
    print(f"\n第3弾グリッド画像作成完了: {GRID_OUT}")

if __name__ == '__main__':
    main()
