# -*- coding: utf-8 -*-
"""
400件の知見データ（設計プロの知見200 ＋ 温熱換気相談200）を統合し、
- ストーリー（課題 ➔ 黄金寸法・解決策 ➔ 快適な暮らし）に100%準拠した Veo 3用【15秒】動画プロンプト
- ストーリー連動の画像生成プロンプト（imagePromptJa）
- 15秒動画に最適化されたストーリー型ナレーション台本（narrationJa：約65〜88文字）
- YouTubeタイトル・概要欄、Instagram、X、Threads、note記事本文
を自動生成して knowledge_video_portal_data.json を構築するスクリプト
"""

import json
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MADORI_JSON = os.path.join(BASE_DIR, 'public', 'data', 'qa_knowledge_100.json')
THERMAL_JSON = os.path.join(BASE_DIR, 'public', 'data', 'thermal_qa_200.json')
OUTPUT_JSON = os.path.join(BASE_DIR, 'public', 'data', 'knowledge_video_portal_data.json')
EXISTING_LINKS = os.path.join(BASE_DIR, 'public', 'data', 'knowledge_video_links.json')

# 既存のリンクデータがあればロードして維持
existing_map = {}
if os.path.exists(EXISTING_LINKS):
    try:
        with open(EXISTING_LINKS, 'r', encoding='utf-8') as f:
            existing_map = json.load(f)
    except Exception as e:
        print("Could not load existing links:", e)

with open(MADORI_JSON, 'r', encoding='utf-8') as f:
    madori_data = json.load(f).get('questions', [])

with open(THERMAL_JSON, 'r', encoding='utf-8') as f:
    thermal_data = json.load(f).get('questions', [])


def clean_text(s):
    if not s:
        return ""
    s = re.sub(r'[\r\n\t]+', ' ', s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip()


def split_sentences(text):
    """日本語テキストを文単位に分割（「」や（）の中の句読点・疑問符では分割しない）"""
    text = clean_text(text)
    if not text:
        return []
    sents = []
    buf = []
    depth_quote = 0
    depth_paren = 0
    n = len(text)
    for i, ch in enumerate(text):
        buf.append(ch)
        if ch in ('「', '『'):
            depth_quote += 1
        elif ch in ('」', '』'):
            depth_quote = max(0, depth_quote - 1)
        elif ch in ('（', '('):
            depth_paren += 1
        elif ch in ('）', ')'):
            depth_paren = max(0, depth_paren - 1)
        elif ch in ('。', '！', '？', '!', '?') and depth_quote == 0 and depth_paren == 0:
            # 次が閉じ括弧でない場合のみ文末として分割
            next_ch = text[i + 1] if i + 1 < n else ''
            if next_ch not in ('」', '』', '）', ')', '。', '！', '？'):
                s = "".join(buf).strip()
                if s:
                    sents.append(s)
                buf = []
    rem = "".join(buf).strip()
    if rem:
        sents.append(rem)
    return sents


def detect_madori_stage_and_elements(cat, question, details, short_ans, dim):
    """質問・詳細ストーリーから具体的な建築空間（舞台）と登場要素・動作を特定する"""
    full = f"{question} {short_ans} {details} {dim}"

    # キッチン系
    if '冷蔵庫' in full:
        return (
            "ダイニングから続く対面キッチンの入口と冷蔵庫スペース",
            "冷蔵庫の開閉と家族が飲み物を取り出す動線、コンロ前で調理する人との位置関係"
        )
    if 'パントリー' in full or '食品庫' in full:
        return (
            "キッチン横のパントリー（奥行300〜400mmの浅め可動棚に食品ストックが一目で見渡せる収納空間）",
            "買い物袋を玄関からパントリーへ運び込み、可動棚から調味料や食材をサッと取り出す動線"
        )
    if 'アイランド' in full or 'ペニンシュラ' in full:
        return (
            "LDKを見渡すペニンシュラ（片側壁付け対面）キッチンとアイランド（四方回遊）キッチンの比較空間",
            "コンロ横の袖壁による油はね防止と、キッチン周りの回遊通路・ダイニングへの配膳動作"
        )
    if '食洗機' in full or 'ミーレ' in full or 'ボッシュ' in full:
        return (
            "大型フロントオープン食洗機を組み込んだシステムキッチンとシンク・通路空間",
            "食洗機の扉を前に90度フルオープンにして大皿や鍋をバスケットへ出し入れする動作"
        )
    if 'ゴミ箱' in full or 'ダストボックス' in full:
        return (
            "キッチン背面カップボード下のダストボックス（分別ゴミ箱）収納スペース",
            "フタ付きゴミ箱をカップボード下から引き出して調理中のゴミをスムーズに捨てる動作"
        )
    if '天板' in full or 'ワークトップ' in full or '高さ' in question and 'キッチン' in full:
        return (
            "明るい対面キッチンのワークトップ（天板高さ850mm〜900mm）とシンク作業スペース",
            "背筋を伸ばした自然な姿勢でまな板での包丁作業と深いシンクでの洗い物を行う手元と立ち姿"
        )
    if 'ワークトライアングル' in full or ('シンク' in full and 'コンロ' in full):
        return (
            "シンク・コンロ・冷蔵庫の3点を結ぶキッチン作業スペース（ワークトライアングル）",
            "冷蔵庫から食材を出し、シンクで洗い、コンロで調理するまでの無駄のない2〜3歩の移動動線"
        )
    if '通路幅' in full or '背面' in full or '食器棚' in full or 'カップボード' in full:
        return (
            "対面キッチンと背面カップボード（食器棚）の間のワーク通路空間",
            "背面収納の引き出しを開けてしゃがみ込む動作と、夫婦2人が背中でぶつからずにすれ違う動作"
        )

    # 水回り・ランドリー系
    if '乾太くん' in full or '乾燥機' in full or 'ランドリー' in full or '室内干し' in full or '洗濯' in full:
        return (
            "洗濯機・ガス衣類乾燥機・造作たたみカウンター・ホスクリーン物干しを備えたランドリールーム",
            "洗濯機から乾燥機へ衣類を移し、乾いた洗濯物をその場でハンガーに掛けて隣接ファミリークローゼットへしまう家事動線"
        )
    if '洗面' in full and ('脱衣' in full or '分離' in full or '別' in full):
        return (
            "引き戸で完全分離された脱衣室と、朝の身支度が重ならない幅広の造作洗面化粧台",
            "家族が入浴中でも気兼ねなく隣の独立洗面台で手を洗ったりドライヤーを使ったりできる動線"
        )
    if '洗面' in full:
        return (
            "ホテルライクな造作洗面化粧台（鏡裏収納・タイル壁・広々ボウル）のある洗面空間",
            "朝の忙しい時間帯に家族2人が横に並んで身支度・手洗いをするスムーズな動作"
        )
    if 'トイレ' in full:
        return (
            "落ち着きのある照明と手洗いカウンターを備えたトイレ空間と廊下・ホールの配置",
            "リビングや玄関からの視線と音を防ぎつつ、夜間も安心して使える扉開閉とアプローチ動線"
        )
    if '浴室' in full or '風呂' in full or 'バス' in full:
        return (
            "高断熱ユニットバスルームと脱衣室のつながり空間",
            "冬場もヒートショックのない暖かい脱衣室からフラットな浴室へ入る安全で快適な動作"
        )

    # 玄関・土間SIC系
    if 'ベビーカー' in full or 'シューズイン' in full or 'SIC' in full or '土間' in full:
        return (
            "玄関から土間続きで通り抜けられる2wayシューズインクローク（SIC）と玄関ホール",
            "ベビーカーやアウトドア用品を折りたたまずに土間へ収め、家族動線で室内へ上がる動き"
        )
    if 'ポーチ' in full or '軒' in full and '玄関' in full:
        return (
            "深い軒（カバードポーチ）と雨よけ壁を備えた玄関ポーチ・アプローチ外観",
            "雨の日でも濡れずに傘をたたみ、買い物袋を持ったままゆったり引き戸・玄関ドアを開ける動作"
        )
    if '玄関' in full:
        return (
            "自然光が差し込む明るい玄関ホールと框（かまち）・収納スペース",
            "来客時にも靴が散らからず、家族が並んでスムーズに靴を脱ぎ履きできるゆとりある動線"
        )

    # LDK・小上がり・吹き抜け系
    if '小上がり' in full or '畳' in full or '和室' in full:
        return (
            "LDKと一体につながる段差25〜30cmの小上がり畳コーナー（下部引き出し収納付き）",
            "小上がりの段差に腰掛けてくつろぐ様子と、段差下の大型引き出しから子どものおもちゃを出し入れする動作"
        )
    if '吹抜' in full or '吹き抜け' in full or 'シーリングファン' in full:
        return (
            "2階の高窓から陽光が降り注ぐ開放的な吹き抜けリビングと天井のシーリングファン",
            "シーリングファンが緩やかに回転して上下階の空気を循環させ、光と風が巡る大空間LDK"
        )
    if 'スタディ' in full or 'デスク' in full or '勉強' in full:
        return (
            "キッチンから見守れるLDK一角の造作スタディカウンター（奥行500〜600mm）",
            "子どもが明るい手元照明の下で宿題を広げ、キッチンから親が優しく見守る日常風景"
        )
    if 'ピットリビング' in full or 'ダウンフロア' in full:
        return (
            "床を一段掘り下げた包まれ感のあるピットリビング（ダウンフロア）と大開口窓",
            "段差ベンチやローソファに深く腰掛け、高い天井高と庭への視線の抜けを楽しむ様子"
        )
    if '階段' in full:
        return (
            "LDKと2階をつなぐ美しい階段空間（蹴上・踏面の緩やかな勾配と手すり・引き戸の納まり）",
            "小さな子どもから大人まで安心な緩やか勾配で昇り降りし、冷気や音を引き戸でコントロールする様子"
        )
    if 'テレビ' in full or 'ソファ' in full:
        return (
            "無垢床が広がるリビングの壁掛けテレビとソファの配置空間",
            "窓からの光の映り込み（グレア）を抑え、ソファから最適な視距離でゆったりくつろぐ様子"
        )

    # 収納・WIC系
    if 'ファミリークローゼット' in full or 'ファミクロ' in full or 'WIC' in full or 'ウォークイン' in full:
        return (
            "両側にハンガーパイプと可動棚を備えたウォークイン/ファミリークローゼット",
            "通路幅を確保したクローゼット内でハンガーに掛けたまま服を選び、スムーズに着替える動作"
        )
    if '布団' in full or '押入' in full or 'クローゼット' in full or '収納' in full:
        return (
            "使う場所のすぐ横に計画された適材適所の分散収納・壁面クローゼット空間",
            "扉を開けた瞬間に中身が一目で見渡せ、日用品や衣類を1アクションで出し入れする動作"
        )

    # 暖炉・設備・照明・色彩系
    if '薪ストーブ' in full or '暖炉' in full:
        return (
            "大谷石の炉壁と鋳物薪ストーブが据えられた吹き抜けリビング空間",
            "炉壁の前で薪ストーブの柔らかな炎が揺らめき、遠赤外線の暖かさが家じゅうへ広がる情景"
        )
    if '照明' in full or 'ダウンライト' in full or '間接照明' in full:
        return (
            "天井のグレアを抑えたコーブ間接照明と配灯設計された夜のLDK空間",
            "ソファの真上を避けた心地よい間接光が木の天井や漆喰壁を優しく照らすくつろぎの夜景"
        )
    if 'コンセント' in full or 'スイッチ' in full or 'ニッチ' in full:
        return (
            "家具配置と生活動線に合わせて高さ・位置が計算された壁面スイッチニッチ＆コンセントまわり",
            "コードが通路を横切ることなく、ロボット掃除機やスマホ充電・家電がすっきり収まる様子"
        )
    if 'カーテン' in full or 'ブラインド' in full:
        return (
            "天井掘り込みカーテンボックスにすっきり納まった大開口窓辺空間",
            "リネンカーテンやバーチカルブラインドが朝の柔らかな光と風を美しく室内に取り込む様子"
        )

    # 外構・庭・デッキ・駐車場系
    if '駐車' in full or '車' in full or 'カーポート' in full or 'ガレージ' in full:
        return (
            "木質アクセントが映える住宅外観ファサードとゆとりある駐車スペース・アプローチ",
            "車のドアを全開にしても隣や壁にぶつからず、雨の日もスムーズに乗り降り・荷下ろしできる動線"
        )
    if 'デッキ' in full or 'テラス' in full or '庭' in full or '外構' in full or 'フェンス' in full:
        return (
            "リビングの大開口サッシからフラットにつながるウッドデッキテラスと目隠しルーバーのある庭",
            "外からの視線を木製ルーバーで遮りながら、カーテンを開け放して内と外が一体化したアウトドアリビングを楽しむ様子"
        )

    # 家相・風水・現代間取り系
    if cat == 'kaso' or '家相' in full or '風水' in full or '鬼門' in full or '方位' in full:
        return (
            "方位の採光・通風・断熱気密を現代の建築科学で清潔に整えた明るい住宅内観",
            "湿気や冷気がこもりがちな方位を、第一種換気と高断熱サッシ・整理された動線で明るく清潔に保つ空間表現"
        )

    # デフォルト（LDK・生活空間）
    return (
        "無垢材の床と自然光が広がる高気密高断熱注文住宅のLDK空間",
        "家族がぶつかることなく自然な生活動線で行き交い、ゆとりある寸法設計を体感する様子"
    )


def detect_thermal_stage_and_elements(cat, question, details, short_ans, dim):
    """温熱換気200問の質問・詳細から具体的な建築物理ビジュアル舞台と現象を特定する"""
    full = f"{question} {short_ans} {details} {dim}"

    if '床下エアコン' in full or '基礎断熱' in full or '床断熱' in full or cat == 'th_fnd':
        return (
            "気密・防蟻処理が施された清潔な基礎断熱空間と無垢床リビングの断面構造",
            "床下エアコンから送り出された暖かな空気が基礎空間を満たし、床ガラリから1階全体へ均一に立ち上がる温熱気流の可視化"
        )
    if '気密' in full or 'C値' in full or '隙間' in full or cat == 'th_air':
        return (
            "連続した防湿気密シートと気密テープ処理が施された高気密構造断面と気密測定風景",
            "外気の隙間風（漏気）を完全にシャットアウトし、計画換気ルート通りに空気が綺麗に流れる気密構造の可視化"
        )
    if '換気' in full or '全熱交換' in full or 'ダクト' in full or '給気' in full or '排気' in full or cat == 'th_vnt':
        return (
            "第1種全熱交換換気システムが稼働する住宅全体の立体気流パース",
            "外気の花粉や冷気・熱気をフィルターと熱交換素子でブロックし、室温と湿度を保った新鮮な空気が各部屋を緩やかに巡る気流ライン"
        )
    if '窓' in full or 'サッシ' in full or 'トリプル' in full or 'シェード' in full or '日射' in full or cat == 'th_win':
        return (
            "樹脂トリプルガラスサッシと外付けシェード・深い軒を備えた南面大開口窓辺",
            "夏の高い日差しを軒とアウターシェードで窓の外で遮蔽し、冬の低い太陽光だけを室内の奥まで暖かく取り込むパッシブ日射コントロール"
        )
    if '結露' in full or 'カビ' in full or '通気' in full or '湿気' in full or '露点' in full or cat == 'th_cnd':
        return (
            "外壁通気層・透湿防水シート・断熱材・可変透湿気密シートが重なる外壁構造断面クローズアップ",
            "室内の水蒸気侵入を防ぎつつ、壁体内の湿気を外壁通気層から速やかに外部へ排出し、内部結露と木材腐朽をゼロに保つメカニズム"
        )
    if 'エアコン' in full or '全館空調' in full or '冷房' in full or '暖房' in full or 'サーモオフ' in full or cat == 'th_hvac':
        return (
            "吹き抜けとホールを介して家じゅうがつながる高断熱住宅の空調・気流断面空間",
            "わずか1〜2台の家庭用エアコンとシーリングファンの微風で、LDKから洗面脱衣室・2階まで22〜24℃の快適温度に包まれるサーモグラデーション"
        )
    if '法改正' in full or 'ヒートショック' in full or '光熱費' in full or '等級' in full or cat == 'th_law':
        return (
            "真冬の早朝でもリビング・廊下・脱衣室の温度差がないHEAT20 G2/G3グレードの住まい空間",
            "部屋間の温度ムラによるヒートショックを防ぎ、太陽光と高断熱外皮によって35年間の光熱費を抑えながら健康に暮らす様子"
        )

    # th_ins / default thermal
    return (
        "隙間なく施工された高性能断熱層（充填断熱＋付加断熱）と熱橋のない外皮断面・室内空間",
        "外の厳しい寒さや猛暑の熱移動を分厚い断熱外皮がブロックし、室内が年中穏やかな室温に保たれる熱移動シミュレーション映像"
    )


def normalize_story_sentence(s):
    if not s:
        return ""
    s = re.sub(r'^私なら、こうします。', '', s).strip()
    s = re.sub(r'住ま居るでは|住ま居るは|私どもは|私は', '実務設計では', s)
    return s.strip()


def build_story_driven_prompts_and_narration(item_type, idx, qid, cat, cat_clean, question, short_ans, dim, details, principle=""):
    """
    各知見のストーリー（details / shortAnswer / dimension）を文単位で解析し、
    1. ストーリー構成（起承転結）
    2. ストーリー準拠・画像生成プロンプト（imagePromptJa）
    3. ストーリー準拠・Veo 3 15秒動画生成プロンプト（veoPromptJa）
    4. 15秒用ナレーション台本（narrationJa：約70〜105文字）
    を1問ごとに固有の内容で生成する
    """
    det_sents = [normalize_story_sentence(s) for s in split_sentences(details) if normalize_story_sentence(s)]
    ans_sents = [normalize_story_sentence(s) for s in split_sentences(short_ans) if normalize_story_sentence(s)]

    core_conclusion = ans_sents[0] if ans_sents else normalize_story_sentence(short_ans)
    if len(ans_sents) > 1 and len(core_conclusion) < 25:
        core_conclusion = " ".join(ans_sents[:2])

    # 課題・理由文と解決・展開文を抽出（core_conclusionと重複しない文を優先）
    problem_or_reason = det_sents[0] if det_sents else question
    if problem_or_reason[:12] in core_conclusion and len(det_sents) > 1:
        problem_or_reason = det_sents[1]

    solution_sent = det_sents[1] if len(det_sents) > 1 else (det_sents[0] if det_sents else core_conclusion)
    if solution_sent == problem_or_reason and len(det_sents) > 2:
        solution_sent = det_sents[2]

    if item_type == 'madori':
        stage_desc, action_desc = detect_madori_stage_and_elements(cat, question, details, short_ans, dim)
    else:
        stage_desc, action_desc = detect_thermal_stage_and_elements(cat, question, details, short_ans, dim)

    dim_label = dim if dim else "最適設計基準"

    # 0〜5秒（起：疑問・よくある失敗・課題のシーン）
    scene_1 = f"【0〜5秒：課題・着眼点】舞台は{stage_desc}。「{question}」というテーマに対し、「{problem_or_reason}」という現場の着眼点・比較状況が視覚的に伝わる導入カット。"
    # 5〜10秒（承・転：プロの結論と黄金寸法・メカニズムの可視化）
    scene_2 = f"【5〜10秒：黄金寸法・解決策】「{core_conclusion}」という最適解へフォーカスし、空間内に基準値「{dim_label}」を示す洗練された光の寸法ガイドライン（または温熱気流・断面アニメーション）が美しく浮かび上がるクローズアップ。"
    # 10〜15秒（結：解決後の快適な動作・暮らしのシーン）
    scene_3 = f"【10〜15秒：快適な暮らしの実証】{action_desc}。「{solution_sent}」という快適でストレスのない建築空間をカメラが滑らかに縦方向ドリー移動して捉えるエンディング。"

    story_summary = f"{scene_1}\n{scene_2}\n{scene_3}"

    # ストーリー準拠・画像生成プロンプト（キービジュアル／図解生成用）
    image_prompt_ja = (
        f"【建築ストーリー図解・キービジュアル（縦型9:16）】"
        f"舞台：{stage_desc}。テーマ：「{question}」。"
        f"ストーリー表現：「{problem_or_reason}」という課題を踏まえ、「{core_conclusion}（基準：{dim_label}）」を実現した日本の高気密高断熱注文住宅。"
        f"{action_desc}が一目で伝わる構図、美しい無垢材と自然光、空間内に「{dim_label}」のクリーンな建築寸法ラインが控えめに光るフォトリアル建築ビジュアライゼーション、縦型9:16（1080x1920）、高精細8K。"
    )

    # ストーリー準拠・Veo 3 15秒動画プロンプト（毎回異なる個別シナリオ）
    veo_prompt_ja = (
        f"【Veo 3 15秒・縦型9:16 建築ストーリー動画】\n"
        f"■舞台設定：{stage_desc}（日本の上質な高気密高断熱注文住宅・自然光と木の温もり）。\n"
        f"■テーマ：「{cat_clean}：{question}」（基準：{dim_label}）。\n"
        f"■15秒ストーリー演出（3シーン連続構成）：\n"
        f"・{scene_1}\n"
        f"・{scene_2}\n"
        f"・{scene_3}\n"
        f"■映像仕様：スマートフォン全画面 縦型9:16（1080x1920）、15秒（15 seconds）、60fps、添付の元画像（図解・間取り図）の空間配置・内容に忠実に連動したフォトリアル建築映像。\n"
        f"■重要指示：完全無音映像（SILENT VIDEO ONLY）。BGM・英語ボイス・架空の文字テロップは一切生成せず、後付けの日本語ナレーションに同期する純粋な建築映像のみを生成すること。"
    )

    # 15秒用ナレーション台本（narrationJa：約70〜115文字、12.5〜14.5秒で完結する起承転結台本）
    # 社名・個人名は一切入れず、15秒の尺を100%ノウハウ・理由・寸法解説に充てる（文の途中切断は一切行わない）
    q_clean = re.sub(r'^[QＱ][\.．:：\s]*', '', question).strip()
    ans_clean = re.sub(r'^(圧倒的に|基本的に|結論から言うと|結論、|ズバリ|実は)', '', core_conclusion).strip()
    if not ans_clean.endswith('。'):
        ans_clean += '。'

    reason_clean = problem_or_reason
    if not reason_clean.endswith('。'):
        reason_clean += '。'

    # もし details の中に65文字以内の簡潔で完結した理由文があればそれを優先選択
    if len(reason_clean) > 65:
        for s in det_sents:
            if s != core_conclusion and s[:10] not in ans_clean and 18 <= len(s) <= 65:
                reason_clean = s if s.endswith('。') else s + '。'
                break

    has_num_in_ans = bool(re.search(r'\d', ans_clean))
    dim_short = re.sub(r'^(推奨|基準|目標|目安)[:：\s]*', '', dim).strip()

    narr_candidate = clean_text(f"{q_clean} 結論、{ans_clean} {reason_clean}")
    if not has_num_in_ans and dim_short and len(dim_short) <= 22 and dim_short[:6] not in narr_candidate:
        with_dim = clean_text(f"{q_clean} 結論、{ans_clean} 基準は{dim_short}です。{reason_clean}")
        if len(with_dim) <= 115:
            narr_candidate = with_dim

    # もし全体の文字数が140文字を超える場合は、完結した文単位でコンパクトに収める
    if len(narr_candidate) > 140:
        if len(ans_sents) >= 2 and len(" ".join(ans_sents[:2])) <= 95:
            a_two = " ".join(ans_sents[:2])
            if not a_two.endswith('。'):
                a_two += '。'
            narr_candidate = f"{q_clean} 結論、{a_two}"
        else:
            narr_candidate = f"{q_clean} 結論、{ans_clean}"
            if not has_num_in_ans and dim_short and len(dim_short) <= 28:
                narr_candidate += f" 基準は{dim_short}です。"

    return story_summary, image_prompt_ja, veo_prompt_ja, narr_candidate


def build_note_article(item_type, idx, qid, cat_clean, question, short_ans, dim, details, principle=""):
    """note投稿用のストーリー記事（タイトル＋本文）を生成（対応主体：株式会社住ま居る 家づくりサポート係）"""
    if item_type == 'madori':
        note_title = f"【家づくりの黄金寸法 #{idx}】{question}"
        db_url = "https://www.t-smile.co.jp/madori-consultation/"
        ind_url = f"https://www.t-smile.co.jp/knowledge/madori/{qid}.html"
        hashtags = "#注文住宅 #間取り #家づくり #マイホーム計画 #建築設計 #住ま居る #埼玉の工務店"
    else:
        note_title = f"【高気密高断熱の科学 #{idx}】{question}"
        db_url = "https://www.t-smile.co.jp/performance/"
        ind_url = f"https://www.t-smile.co.jp/knowledge/thermal/{qid}.html"
        hashtags = "#高気密高断熱 #温熱環境 #UA値 #C値 #注文住宅 #後悔しない家づくり #住ま居る"

    principle_block = f"\n■ 設計の原則\n{principle}\n" if principle else ""

    note_body = f"""こんにちは！株式会社住ま居る 家づくりサポート係です。
いつも記事をお読みいただき、また「スキ」やフォロー、温かいコメントをいただきありがとうございます！

今回の家づくり実務知見（#{idx}）のテーマは、多くのお施主様が図面づくりで悩まれるこちらの疑問です。

━━━━━━━━━━━━━━━━━━
■ 今回のテーマ（{cat_clean}）
Q. {question}
━━━━━━━━━━━━━━━━━━

💡 【結論】
{short_ans}

📏 【基準寸法・目安値】
{dim}

■ なぜこの基準になるのか？（現場のストーリーと理由）
{details}
{principle_block}
図面の上では少しの違いに見えても、実際に毎日暮らしてみると「動線のスムーズさ」や「暮らしの快適さ」に大きく影響するポイントです。ぜひご自身のマイホーム計画や図面チェックの参考にしてみてくださいね。

「わが家の場合はどうだろう？」「この部分で迷っている…」という点がありましたら、ぜひお気軽にコメント欄で教えてくださいね！家づくりサポート係より丁寧にお返事いたします。

──────────────────
▼ この知見の図解ページ・全200問データベースはこちら（完全無料・登録不要）
👉 個別詳細ページ: {ind_url}
👉 知見トップページ: {db_url}

株式会社住ま居る 家づくりサポート係（埼玉県鶴ヶ島市・川越市・坂戸市）
公式HP: https://www.t-smile.co.jp/
──────────────────
{hashtags}"""

    return note_title, note_body


items = []

# 1. 設計プロの知見200 (madori)
for idx, q in enumerate(madori_data, 1):
    qid = q.get('id', f'k_{idx:02d}')
    cat = q.get('category', 'general')
    cat_name = q.get('categoryName', '設計プロの知見')
    cat_clean = re.sub(r'[^\w\s・/]', '', cat_name).strip()
    question = q.get('question', '').strip()
    short_ans = normalize_story_sentence(q.get('shortAnswer', '').strip())
    dim = q.get('dimension', '').strip()
    details = normalize_story_sentence(q.get('details', '').strip())
    img = q.get('image', '')

    local_img_path = os.path.join(BASE_DIR, 'public', img.lstrip('/')) if img else ''
    has_image = os.path.exists(local_img_path) if local_img_path else False

    ext = existing_map.get(qid, {})
    youtube_url = ext.get('youtubeUrl', '')
    veo_video_path = ext.get('veoVideoPath', f'videos/veo3/madori/{qid}.mp4')
    status = ext.get('status', 'unstarted' if not youtube_url else 'youtube_uploaded')

    story_summary, image_prompt_ja, veo_prompt_ja, narration_ja = build_story_driven_prompts_and_narration(
        'madori', idx, qid, cat, cat_clean, question, short_ans, dim, details
    )
    note_title, note_body = build_note_article(
        'madori', idx, qid, cat_clean, question, short_ans, dim, details
    )

    yt_title = f"【家づくりの黄金寸法】{question}｜設計プロの知見 #{idx}"
    if len(yt_title) > 60:
        yt_title = yt_title[:57] + '...'

    yt_desc = f"""【注文住宅・失敗しない間取りの知見 #{idx}（15秒解説）】
{question}
💡 結論: {short_ans}
📏 基準寸法: {dim}

▼ この知見の詳細解説と全200件の設計データベースはこちら（完全無料・登録不要）
👉 https://www.t-smile.co.jp/knowledge/madori/{qid}.html
👉 間取り相談・カルテ診断: https://www.t-smile.co.jp/madori-consultation/

{details[:180]}...

--------------------------------------------------
株式会社住ま居る 家づくりサポート係（埼玉県鶴ヶ島市・川越市・坂戸市）
創業30年・800棟の高気密高断熱注文住宅
公式HP: https://www.t-smile.co.jp/
--------------------------------------------------
#注文住宅 #間取り #設計 #住ま居る #家づくり #ルームツアー #マイホーム計画"""

    x_post = f"【家づくりの黄金比 #{idx}】\nQ: {question}\n\n👉 結論: {short_ans}\n（基準寸法: {dim}）\n\n知っておくだけで後悔を防げる設計のプロの知見200選はこちら👇\nhttps://www.t-smile.co.jp/madori-consultation/\n#注文住宅 #間取り"
    if len(x_post) > 140:
        x_post = f"【家づくりの黄金比 #{idx}】\nQ: {question[:35]}...\n\n👉 結論: {short_ans[:40]}...\n（{dim}）\n\n設計プロの知見200選👇\nhttps://www.t-smile.co.jp/madori-consultation/\n#注文住宅"

    insta_caption = f"""家づくりの黄金比率 #{idx} 🏠✨
「{question}」

家づくりで多くの施主様が悩むこのポイント。
現場の実務から導き出した答えは…

💡【結論】
{short_ans}
（推奨寸法: {dim}）

📖【ストーリー・理由】
{details}

後から変えられない寸法だからこそ、図面段階でしっかり押さえておきたい基準です📐

───────────────
プロの設計知見全200選はプロフィールのリンクから！
webで図解付きで全公開しています📖
@sumairu_house
───────────────
#注文住宅 #間取りの工夫 #マイホーム計画中の人と繋がりたい #家づくりアイデア #新築一戸建て #後悔しない家づくり #住ま居る"""

    threads_post = f"""家づくりの寸法、ここ失敗しやすいです👇

Q. {question}

A. {short_ans}
（基準寸法: {dim}）

{split_sentences(details)[0] if split_sentences(details) else ''}
図面チェックの参考に保存しておいてくださいね📐

設計プロの知見200選まとめはプロフURLからご覧いただけます！"""

    items.append({
        "id": qid,
        "genre": "madori",
        "genreLabel": "設計プロの知見200",
        "category": cat,
        "categoryName": cat_clean,
        "questionNumber": idx,
        "question": question,
        "shortAnswer": short_ans,
        "dimension": dim,
        "details": details,
        "image": img,
        "hasImage": has_image,
        "topUrl": "/madori-consultation/",
        "portalAnchor": "/#madori-consultation-bot",
        "youtubeUrl": youtube_url,
        "youtubeVideoId": ext.get('youtubeVideoId', ''),
        "veoVideoPath": veo_video_path,
        "status": status,
        "storySummary": story_summary,
        "imagePromptJa": image_prompt_ja,
        "veoPromptJa": veo_prompt_ja,
        "narrationJa": narration_ja,
        "noteTitle": note_title,
        "noteBody": note_body,
        "youtubeTitle": yt_title,
        "youtubeDesc": yt_desc,
        "xPost": x_post,
        "instaCaption": insta_caption,
        "threadsPost": threads_post
    })

# 2. 温熱換気相談200 (thermal)
for idx, q in enumerate(thermal_data, 1):
    qid = q.get('id', f'th_{idx:03d}')
    cat = q.get('category', 'thermal')
    cat_name = q.get('categoryName', '温熱換気・性能設計')
    cat_clean = re.sub(r'[^\w\s・/]', '', cat_name).strip()
    question = q.get('question', '').strip()
    short_ans = normalize_story_sentence(q.get('shortAnswer', '').strip())
    dim = q.get('dimension', '').strip()
    details = normalize_story_sentence(q.get('details', '').strip())
    principle = q.get('principle', '').strip()
    img = q.get('image') or f"/images/knowledge/thermal_{cat}.jpg"

    local_img_path = os.path.join(BASE_DIR, 'public', img.lstrip('/'))
    has_image = os.path.exists(local_img_path)

    ext = existing_map.get(qid, {})
    youtube_url = ext.get('youtubeUrl', '')
    veo_video_path = ext.get('veoVideoPath', f'videos/veo3/thermal/{qid}.mp4')
    status = ext.get('status', 'unstarted' if not youtube_url else 'youtube_uploaded')

    story_summary, image_prompt_ja, veo_prompt_ja, narration_ja = build_story_driven_prompts_and_narration(
        'thermal', idx, qid, cat, cat_clean, question, short_ans, dim, details, principle
    )
    note_title, note_body = build_note_article(
        'thermal', idx, qid, cat_clean, question, short_ans, dim, details, principle
    )

    yt_title = f"【温熱・換気性能の科学】{question}｜家づくり温熱相談 #{idx}"
    if len(yt_title) > 60:
        yt_title = yt_title[:57] + '...'

    yt_desc = f"""【高気密・高断熱・換気の科学的真実 #{idx}（15秒解説）】
{question}
💡 結論: {short_ans}
📊 基準・目標値: {dim}

▼ この温熱換気知見の個別解説と全200問の性能データベースはこちら（完全無料）
👉 個別詳細: https://www.t-smile.co.jp/knowledge/thermal/{qid}.html
👉 温熱性能トップ: https://www.t-smile.co.jp/performance/

{details[:180]}...

--------------------------------------------------
株式会社住ま居る 家づくりサポート係（埼玉県鶴ヶ島市・川越市・坂戸市）
UA値0.23〜0.34・C値0.1〜0.3の高気密高断熱専門店
公式HP: https://www.t-smile.co.jp/
--------------------------------------------------
#高気密高断熱 #温熱環境 #UA値 #C値 #換気システム #住ま居る #全館空調 #注文住宅"""

    x_post = f"【温熱換気の科学 #{idx}】\nQ: {question}\n\n👉 結論: {short_ans}\n（目安: {dim}）\n\n失敗しない高気密高断熱の知見200選はこちら👇\nhttps://www.t-smile.co.jp/performance/\n#高気密高断熱 #注文住宅"
    if len(x_post) > 140:
        x_post = f"【温熱の科学 #{idx}】\nQ: {question[:35]}...\n\n👉 結論: {short_ans[:40]}...\n（{dim}）\n\n温熱換気知見200選👇\nhttps://www.t-smile.co.jp/performance/\n#高気密高断熱"

    insta_caption = f"""高気密高断熱の真実 #{idx} 🌡️❄️
「{question}」

エアコン1台で年中快適な家にするための必須知識！
建築物理に基づく正解は…

💡【結論】
{short_ans}
（基準値: {dim}）

📖【ストーリー・技術根拠】
{details}

性能で後悔しないために、契約前に必ずチェックしておきたい数値です🏠

───────────────
温熱換気相談全200選はプロフィールのリンクから！
webで全データを公開中📖
@sumairu_house
───────────────
#高気密高断熱 #UA値 #C値 #第一種換気 #パッシブハウス #後悔しない家づくり #住ま居る"""

    threads_post = f"""高気密高断熱住宅を建てるなら絶対に知っておきたいこと👇

Q. {question}

A. {short_ans}
（目標基準: {dim}）

{split_sentences(details)[0] if split_sentences(details) else ''}
契約前の比較チェックにご活用ください！

温熱換気相談200選の全データはプロフURLで公開しています🌡️"""

    items.append({
        "id": qid,
        "genre": "thermal",
        "genreLabel": "温熱換気相談200",
        "category": cat,
        "categoryName": cat_clean,
        "questionNumber": idx,
        "question": question,
        "shortAnswer": short_ans,
        "dimension": dim,
        "details": details,
        "principle": principle,
        "image": img,
        "hasImage": has_image,
        "topUrl": "/performance/",
        "portalAnchor": "/#thermal-bot",
        "youtubeUrl": youtube_url,
        "youtubeVideoId": ext.get('youtubeVideoId', ''),
        "veoVideoPath": veo_video_path,
        "status": status,
        "storySummary": story_summary,
        "imagePromptJa": image_prompt_ja,
        "veoPromptJa": veo_prompt_ja,
        "narrationJa": narration_ja,
        "noteTitle": note_title,
        "noteBody": note_body,
        "youtubeTitle": yt_title,
        "youtubeDesc": yt_desc,
        "xPost": x_post,
        "instaCaption": insta_caption,
        "threadsPost": threads_post
    })

portal_data = {
    "totalCount": len(items),
    "madoriCount": len(madori_data),
    "thermalCount": len(thermal_data),
    "updatedAt": "2026-11-09",
    "veoDurationSeconds": 15,
    "items": items
}

with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
    json.dump(portal_data, f, ensure_ascii=False, indent=2)

# root data/ にも同期が存在する場合は同期
root_data_json = os.path.join(BASE_DIR, 'data', 'knowledge_video_portal_data.json')
if os.path.exists(os.path.dirname(root_data_json)):
    with open(root_data_json, 'w', encoding='utf-8') as f:
        json.dump(portal_data, f, ensure_ascii=False, indent=2)

print(f"Generated {len(items)} items in {OUTPUT_JSON} (Madori: {len(madori_data)}, Thermal: {len(thermal_data)}) with 15s story-driven Veo 3 prompts & note articles!")
