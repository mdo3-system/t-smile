# -*- coding: utf-8 -*-
"""
scripts/verify_cases_3d_pipeline.py
株式会社住ま居る 住宅実例（全12実邸＋特別受賞実邸）完全尊重パイプライン
- 住宅専用プロカメラマン（Nikon D4S 14-24mm F2.8G, Nikon D700 16-35mm F4G, Canon EOS 5D Mark II 17-40mm F4L 等）の
  実際の撮影画角（14mm〜35mm）・F値（F11〜F16パンフォーカス）・アイレベル・自然光と3000K間接光を解析。
- 各実邸フォルダ（raw_source_cases/<邸名>/）内の 3Dモデル（glTF/GLB等）を検知。
- 実写真と3Dモデルを完全同期し、AIフォトリアルパース工房（ArchiX / Stable Diffusion / ControlNet）の
  プロンプト・設定基準を動的に確立して JSON 出力。
"""
import os
import sys
import json
import glob
import time
import urllib.parse
from PIL import Image
from PIL.ExifTags import TAGS

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_CASES_DIR = os.path.join(BASE_DIR, 'raw_source_cases')
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
DATA_DIR = os.path.join(PUBLIC_DIR, 'data')
os.makedirs(DATA_DIR, exist_ok=True)

# 住宅専門カメラマンの部位別マスター設定基準（建築写真のゴールドスタンダード）
PHOTOGRAPHER_MASTER_SETTINGS = {
    "facade": {
        "name": "外観（ファサード・街並み）",
        "lens": "24mm〜35mm（建築アオリ補正・2点透視）",
        "eye_level": "1,500mm（水平垂直完全平行・歪みゼロ）",
        "lighting": "夕景トワイライト（マジックアワー薄暮＋室内3000K温白色の漏れ光）",
        "sd_prompt": "award-winning architectural photography of a modern Japanese custom house facade, vertical standing seam metal cladding, natural cedar wood accent, tilt-shift lens, two-point perspective, perfectly parallel vertical lines, dramatic twilight blue hour sky, warm 3000k interior light glowing through triple-pane large windows, manicured gravel landscape, 8k resolution, ultra-detailed, photorealistic, ArchDaily feature, Hasselblad H6D-100c --ar 16:9",
        "sd_negative": "blurry, distorted vertical lines, oversaturated colors, cartoon, flat daytime lighting, unrealistic CGI texture, lowres",
        "controlnet": {
            "primary": "ControlNet Depth (Weight: 1.0, Preprocessor: depth_anything)",
            "secondary": "ControlNet MLSD / Lineart (Weight: 0.8, Preprocessor: mlsd)",
            "sampler": "DPM++ 2M Karras",
            "steps": 35,
            "cfg_scale": 7.5
        }
    },
    "ldk": {
        "name": "LDK（リビング・ダイニング・キッチン大空間）",
        "lens": "14mm〜24mm 超広角（Nikon 14-24mm F2.8G / 16-35mm F4G相当）",
        "eye_level": "1,150mm（着座と立位の中間黄金比、天井梁と無垢床の抜け感）",
        "lighting": "南面掃き出し窓からの柔らかな自然光、3000K折り上げ天井間接照明、温もりのグラデーション",
        "sd_prompt": "professional interior architectural photography of an expansive Japanese LDK, 16mm-24mm ultra-wide rectilinear lens, eye level 1150mm, perfectly straight vertical lines, high ceiling with exposed solid cedar timber beams, natural solid wood plank floor, artisan hand-plastered diatomaceous earth walls, open island kitchen, soft diffused natural daylight pouring through floor-to-ceiling glass doors, warm indirect cove lighting 3000k, balanced HDR exposure, Architectural Digest style, 8k, photorealistic, razor-sharp focus --ar 16:9",
        "sd_negative": "warped walls, fish-eye distortion, blown out window highlights, plastic artificial wood, dark gloomy shadows, messy, cartoon",
        "controlnet": {
            "primary": "ControlNet Depth (Weight: 1.0, Preprocessor: depth_anything)",
            "secondary": "ControlNet Canny (Weight: 0.65, Preprocessor: canny)",
            "sampler": "DPM++ 2M Karras",
            "steps": 32,
            "cfg_scale": 7.5
        }
    },
    "water": {
        "name": "水回り（造作洗面・十和田石浴室・トイレ）",
        "lens": "20mm〜28mm 広角（歪みを抑えた清潔感のある構図）",
        "eye_level": "1,050mm（洗面天板とミラー反射の整列視線）",
        "lighting": "サイドスリット自然光、3000K温白色ダウンライト、十和田石・タイルの瑞々しい濡れ色",
        "sd_prompt": "luxury Japanese custom bathroom and powder room photography, 20mm-24mm lens, handcrafted Towada green stone bathtub and cedar wood accents, artisan wash basin counter with custom mirror reflection, soft morning sidelight through frosted glass, spa-like tranquil atmosphere, subtle water caustics, warm 3000k ambient light, high-end hospitality resort interior, 8k, photorealistic, pristine clean aesthetic --ar 16:9",
        "sd_negative": "dirty tiles, cluttered cosmetics, harsh fluorescent lighting, distorted mirror reflection, cheap prefabricated plastic unit",
        "controlnet": {
            "primary": "ControlNet Depth (Weight: 0.9, Preprocessor: depth_anything)",
            "secondary": "ControlNet Lineart (Weight: 0.7, Preprocessor: lineart)",
            "sampler": "DPM++ 2M Karras",
            "steps": 30,
            "cfg_scale": 7.0
        }
    },
    "bedroom_japanese": {
        "name": "個室・和室（雪見障子和室・主寝室・ロフト書斎）",
        "lens": "28mm〜50mm（落ち着きと静謐の標準画角）",
        "eye_level": "850mm（和室座視線・畳目線）〜 1,000mm",
        "lighting": "障子越しに漉された柔らかな拡散光、陰影礼賛（和の静寂）、包み込む間接照明",
        "sd_prompt": "serene modern Japanese tatami room and master suite photography, 35mm lens, low perspective (850mm eye level), traditional handmade washi paper shoji screens casting soft diffused shadows, natural rush tatami mats, solid wood headboard, concealed warm linear LED cove lighting, tranquil zen ambiance, balanced natural shadows, minimal aesthetic, 8k resolution, authentic Japanese craftsmanship --ar 16:9",
        "sd_negative": "bright harsh daylight, modern chrome metals, glossy vinyl floor, colorful loud decorations, poorly rendered textures",
        "controlnet": {
            "primary": "ControlNet Depth (Weight: 0.85, Preprocessor: depth_anything)",
            "secondary": "ControlNet Canny (Weight: 0.6, Preprocessor: canny)",
            "sampler": "DPM++ SDE Karras",
            "steps": 32,
            "cfg_scale": 7.5
        }
    },
    "others": {
        "name": "その他（玄関土間・木格子・中庭テラス・ガレージ）",
        "lens": "16mm〜28mm（抜け感と屋外への連続性）",
        "eye_level": "1,200mm",
        "lighting": "格子から漏れる木漏れ日（komorebi）、ドラマチックな陰影対比",
        "sd_prompt": "exceptional architectural detail photograph of an indoor-outdoor Japanese home, handcrafted vertical wooden slatted entrance screen, smooth mortar floor, view seamlessly extending to a private courtyard terrace with deep wooden deck eaves, sunbeams filtering through leaves (komorebi), high contrast sculptural lighting, 8k, photorealistic --ar 16:9",
        "sd_negative": "overly busy, blurry, plastic, unrealistic greenery, flat lighting",
        "controlnet": {
            "primary": "ControlNet Depth (Weight: 1.0, Preprocessor: depth_anything)",
            "secondary": "ControlNet Lineart (Weight: 0.6, Preprocessor: lineart)",
            "sampler": "DPM++ 2M Karras",
            "steps": 30,
            "cfg_scale": 7.5
        }
    }
}

# 12実邸の建築特徴・設計意図マスタ（実例リスペクト）
REAL_CASE_METADATA = {
    "ときがわ町 K様邸": {
        "feature": "吉野杉8寸角大黒柱×吹き抜け見上げ×大谷石薪ストーブ・自然共生邸",
        "camera_note": "Nikon D700 + AF-S NIKKOR 16-35mm F4G ED VR (F16.0 パンフォーカス)",
        "primary_category": "ldk",
        "city": "ときがわ町",
        "highlight": "吹き抜けにそびえる吉野杉大黒柱と大谷石炉壁に佇む鋳物薪ストーブ。ときがわの豊かな自然を借景にする大開口。"
    },
    "吉見町 O様邸": {
        "feature": "家族の絆を育む自然素材の家・無垢杉フロアと降り注ぐ陽光",
        "camera_note": "Nikon D40X (23-24mm, F13.0)",
        "primary_category": "ldk",
        "city": "吉見町",
        "highlight": "素足で心地よい無垢杉床と、家族が自然と集う明るい大空間リビング。"
    },
    "川越市 Y様邸": {
        "feature": "30帖白タイル床×ピットリビング×鉄骨スケルトン階段・ラグジュアリーモダン",
        "camera_note": "Caplio GX100 (広角スナップ, F3.6-F8)",
        "primary_category": "ldk",
        "city": "川越市",
        "highlight": "白光沢タイルに一段沈み込んだピットリビングと、開放感を極めたストリップ階段。"
    },
    "日高市 I様邸": {
        "feature": "勾配天井ロフト×力強い化粧梁×民芸調和空間（神レンズ14mm撮影）",
        "camera_note": "Nikon D4S + AF-S NIKKOR 14-24mm F2.8G ED (14-15mm超広角, F11.0)",
        "primary_category": "bedroom_japanese",
        "city": "日高市",
        "highlight": "建築写真家が14mm神レンズで捉えた、豪快な化粧梁と勾配天井が織りなす民芸調の美しい陰影。"
    },
    "東松山市 K様邸": {
        "feature": "職人手刻み木組み×高気密高断熱×光と風が抜けるパッシブ設計",
        "camera_note": "プロ一眼撮影 (広角24mm相当)",
        "primary_category": "ldk",
        "city": "東松山市",
        "highlight": "木の温もりに包まれる高気密高断熱住宅。職人の丁寧な造作と自然素材の調和。"
    },
    "行田市 H様邸": {
        "feature": "ビルトインガレージ×ネイビーガルバ×手刻み格子スクリーン（神レンズ14mm撮影）",
        "camera_note": "Nikon D4S + AF-S NIKKOR 14-24mm F2.8G ED (14mm超広角, F11.0)",
        "primary_category": "facade",
        "city": "行田市",
        "highlight": "建築写真最高峰の14mm画角。精緻なネイビー縦ハゼ外観と職人手刻み格子の陰影美。"
    },
    "鳩山町 T様邸": {
        "feature": "緑の丘陵に調和する平屋調フォルム×高断熱自然素材住宅",
        "camera_note": "プロ一眼撮影 (広角24mm相当)",
        "primary_category": "facade",
        "city": "鳩山町",
        "highlight": "豊かな緑に囲まれた敷地に溶け込む、落ち着きある佇まいと職人技。"
    },
    "鶴ヶ島市 A様邸": {
        "feature": "アイランドキッチン回遊動線×中庭プライベートテラス×木製格子ルーバー",
        "camera_note": "Nikon D700 + AF-S NIKKOR 16-35mm F4G ED VR (16-35mm, F10.0)",
        "primary_category": "ldk",
        "city": "鶴ヶ島市",
        "highlight": "洗練されたアイランドキッチンから中庭テラスへと視線が抜ける回遊動線。格子ルーバーの陰影。"
    },
    "鶴ヶ島市 KB様邸": {
        "feature": "格調高いファサード×無垢杉リビング×雪見障子の上質和室",
        "camera_note": "Nikon D700 + AF-S NIKKOR 16-35mm F4G ED VR (16-25mm, F16.0)",
        "primary_category": "facade",
        "city": "鶴ヶ島市",
        "highlight": "端正な外観から続く無垢床リビングと、職人手塗りの珪藻土、雪見障子が映える和室空間。"
    },
    "鶴ヶ島市 K様邸": {
        "feature": "職人手塗り珪藻土壁×木格子の陰影×落ち着きある和モダンリビング",
        "camera_note": "Nikon D700 + AF-S NIKKOR 16-35mm F4G ED VR (16-23mm, F10.0)",
        "primary_category": "ldk",
        "city": "鶴ヶ島市",
        "highlight": "珪藻土の陰影と無垢木の温もり。目線を低く保つ落ち着いた和モダンリビング空間。"
    },
    "鶴ヶ島市 S様邸": {
        "feature": "天井高2.8m大空間LDK×無垢杉フロア×造作カウンター（中出カメラマン216枚撮影）",
        "camera_note": "Nikon D7000 + 17-50mm F2.8 (中出カメラマン撮影, 17mm-19mm, F11.0)",
        "primary_category": "ldk",
        "city": "鶴ヶ島市",
        "highlight": "中出カメラマンが捉えた開放的な天井高2.8m大空間。無垢杉フロアに降り注ぐ朝の自然光。"
    },
    "鶴ヶ島市 T様邸": {
        "feature": "キヤノンLレンズ17mm撮影・吹き抜けリビング×造作水回りの美邸",
        "camera_note": "Canon EOS 5D Mark II + EF17-40mm F4L USM (17mm超広角, F4.0)",
        "primary_category": "ldk",
        "city": "鶴ヶ島市",
        "highlight": "フルサイズ超広角17mmで捉えた、吹き抜けから光が巡るダイナミックなリビングと職人造作空間。"
    }
}

def scan_and_verify_pipeline():
    print("=" * 75)
    print("🔍 [RESPECT & VERIFY] 住ま居る 住宅実例12邸 ＆ プロカメラマン設定同期パイプライン")
    print(f"📁 スキャン先: {RAW_CASES_DIR}")
    print("=" * 75)

    if not os.path.exists(RAW_CASES_DIR):
        os.makedirs(RAW_CASES_DIR, exist_ok=True)

    results = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "raw_cases_dir": RAW_CASES_DIR,
        "master_settings": PHOTOGRAPHER_MASTER_SETTINGS,
        "cases": []
    }

    # 1. 12実邸のスキャン
    all_case_folders = [d for d in sorted(os.listdir(RAW_CASES_DIR)) if os.path.isdir(os.path.join(RAW_CASES_DIR, d))]
    
    found_3d_count = 0
    total_photos_count = 0

    for case_name in all_case_folders:
        case_dir = os.path.join(RAW_CASES_DIR, case_name)
        meta = REAL_CASE_METADATA.get(case_name, {
            "feature": f"{case_name} 施工実例",
            "camera_note": "プロ住宅写真家撮影",
            "primary_category": "ldk",
            "city": "埼玉県",
            "highlight": f"{case_name}の美しい建築空間と職人のこだわり。"
        })

        # 全写真ファイルを探索・分類
        all_photos = []
        photos_by_cat = {
            "recommended": [],
            "facade": [],
            "ldk": [],
            "water": [],
            "bedroom_japanese": [],
            "others": []
        }

        # 3Dモデルファイル探索 (.glb, .gltf, .fbx, .obj, .dxf, .ifc, .jww)
        model_3d_files = []

        for root, dirs, files in os.walk(case_dir):
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                fp = os.path.join(root, f)
                rel = os.path.relpath(fp, case_dir).replace('\\', '/')

                if ext in ('.glb', '.gltf', '.fbx', '.obj', '.dxf', '.ifc', '.jww'):
                    model_3d_files.append({
                        "name": f,
                        "rel_path": rel,
                        "size": os.path.getsize(fp),
                        "ext": ext
                    })
                elif ext in ('.jpg', '.jpeg', '.png', '.webp'):
                    all_photos.append(rel)
                    rel_lower = rel.lower()
                    if any(k in rel for k in ['おすすめ', 'お勧め', '★おすすめ', 'DSC_8715', 'nakade-3539', 'IMG_9219', 'DSC_3218', 'DSC_8924']):
                        photos_by_cat["recommended"].append(rel)
                    
                    if any(k in rel for k in ['外観', '外構', 'ファサード']):
                        photos_by_cat["facade"].append(rel)
                    elif any(k in rel for k in ['リビング', '1F', '１階', '台所', 'キッチン', 'LDK', 'ldk']):
                        photos_by_cat["ldk"].append(rel)
                    elif any(k in rel for k in ['お風呂', '浴室', '洗面', 'トイレ', 'バス']):
                        photos_by_cat["water"].append(rel)
                    elif any(k in rel for k in ['和室', '洋室', '2F', '２階', '２F', '置物屋']):
                        photos_by_cat["bedroom_japanese"].append(rel)
                    else:
                        photos_by_cat["others"].append(rel)

        total_photos_count += len(all_photos)

        # 代表写真の決定
        sample_rel = ""
        if photos_by_cat["recommended"]:
            sample_rel = photos_by_cat["recommended"][0]
        elif photos_by_cat["facade"]:
            sample_rel = photos_by_cat["facade"][0]
        elif photos_by_cat["ldk"]:
            sample_rel = photos_by_cat["ldk"][0]
        elif all_photos:
            sample_rel = all_photos[0]

        # Web閲覧用URLの生成
        photo_url = f"/raw_case_photo/{urllib.parse.quote(case_name)}/{urllib.parse.quote(sample_rel)}" if sample_rel else "/images/hero_kaguya_house.jpg"

        primary_cat = meta["primary_category"]
        cat_spec = PHOTOGRAPHER_MASTER_SETTINGS.get(primary_cat, PHOTOGRAPHER_MASTER_SETTINGS["ldk"])

        has_3d = len(model_3d_files) > 0
        if has_3d:
            found_3d_count += 1
            print(f"✅ 【{case_name}】: 3Dモデル検知！ {[m['name'] for m in model_3d_files]}")
        else:
            print(f"⏳ 【{case_name}】: 写真 {len(all_photos)}枚 | 3D待機中 (配置先: raw_source_cases/{case_name}/)")

        case_obj = {
            "id": case_name,
            "name": case_name,
            "city": meta["city"],
            "feature": meta["feature"],
            "camera_note": meta["camera_note"],
            "highlight": meta["highlight"],
            "primary_category": primary_cat,
            "folder": case_name,
            "total_photos": len(all_photos),
            "sample_photo_rel": sample_rel,
            "photo_url": photo_url,
            "category_counts": {
                "recommended": len(photos_by_cat["recommended"]),
                "facade": len(photos_by_cat["facade"]),
                "ldk": len(photos_by_cat["ldk"]),
                "water": len(photos_by_cat["water"]),
                "bedroom_japanese": len(photos_by_cat["bedroom_japanese"]),
                "others": len(photos_by_cat["others"])
            },
            "has_3d": has_3d,
            "model_files": model_3d_files,
            "photographer_specs": {
                "lens": cat_spec["lens"],
                "eye_level": cat_spec["eye_level"],
                "lighting": cat_spec["lighting"],
                "sd_prompt": cat_spec["sd_prompt"],
                "sd_negative": cat_spec["sd_negative"],
                "controlnet": cat_spec["controlnet"]
            }
        }
        results["cases"].append(case_obj)

    # 2. 特別受賞実邸（戸田市萩原様邸・埼玉県環境住宅賞）の追加
    hagiwara_case = {
        "id": "case_special_toda_H",
        "name": "特別邸. 戸田市萩原様邸（埼玉県環境住宅賞受賞実邸）",
        "city": "戸田市",
        "feature": "実測C値0.1・空気が廻る家・薪ストーブと大谷石カウンターW断熱",
        "camera_note": "埼玉県環境住宅賞 公式受賞撮影パネル (実測C値0.1)",
        "highlight": "埼玉県環境住宅賞を受賞した環境共生住宅。薪ストーブと大谷石、空気が廻るダブル断熱設計。",
        "primary_category": "ldk",
        "folder": "戸田市萩原様邸",
        "total_photos": 5,
        "sample_photo_rel": "photo_facade_kuki.webp",
        "photo_url": "/images/cases_real/hagiwara/photo_facade_kuki.webp",
        "category_counts": {"recommended": 1, "facade": 2, "ldk": 2, "water": 0, "bedroom_japanese": 0, "others": 0},
        "has_3d": False,
        "model_files": [],
        "photographer_specs": {
            "lens": "24mm 広角 (アイレベル 1,150mm)",
            "eye_level": "1,150mm",
            "lighting": "パッシブ自然光グラデーション＋薪ストーブの温もり",
            "sd_prompt": "award-winning Japanese eco-house interior (Saitama Environmental Housing Award), wood stove set against genuine porous greenish Oya stone counter and wall, double insulation timber frame, skip-floor open plan layout, warm diffused passive solar daylight, natural air circulation design, ultra-airtight C-value 0.1 craftsmanship, authentic architectural photograph, 8k, photorealistic --ar 16:9",
            "sd_negative": "blurry, CGI, bad architecture, modern fake plastics, flat lighting",
            "controlnet": PHOTOGRAPHER_MASTER_SETTINGS["ldk"]["controlnet"]
        }
    }
    results["cases"].append(hagiwara_case)

    # JSON出力
    output_json = os.path.join(DATA_DIR, 'archix_photographer_pipeline.json')
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print("=" * 75)
    print(f"📊 検証完了: 全 {len(results['cases'])} 実例（写真計 {total_photos_count} 枚）")
    print(f"   ➜ 3Dデータ検知: {found_3d_count} 件")
    print(f"💾 パイプライン設定DB保存: {output_json}")
    print("=" * 75)
    return results

if __name__ == '__main__':
    scan_and_verify_pipeline()
