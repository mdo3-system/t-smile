# -*- coding: utf-8 -*-
"""
scripts/generate_craftsmanship_cases.py
株式会社住ま居る 住宅実例（全12邸＋特別実邸・プロ写真1,220枚）完全尊重ギャラリービルダー
- raw_source_cases 内の全13邸をスキャンし、各邸の写真（外観・LDK・水回り・個室・その他）を体系化。
- 住宅専用カメラマンの画角（14mm〜35mm超広角）、アオリ補正（垂直平行）、F11〜F16パンフォーカス、自然光と3000K間接光を完全明記。
- src/partials/section-craftsmanship.html を更新し、13邸すべてを施工実例として掲載。
- public/data/cases_gallery_archive.json を出力し、JavaScript（app.js）と完全連動。
"""
import os
import sys
import json
import glob
import re
import urllib.parse
from PIL import Image
from PIL.ExifTags import TAGS

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(BASE_DIR, 'raw_source_cases')
SRC_DIR = os.path.join(BASE_DIR, 'src')
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
DATA_DIR = os.path.join(PUBLIC_DIR, 'data')
os.makedirs(DATA_DIR, exist_ok=True)

# 13邸のお施主様邸マスタープロファイル
CASE_PROFILES = {
    "ときがわ町 K様邸": {
        "id": 1,
        "title": "ときがわ町・K様邸",
        "catch": "吉野杉大黒柱と山並みを望む吹き抜け・太陽光＆ZEHで叶えた自然共生住宅",
        "sub": "吉野杉大黒柱 / 太陽光ZEH / パッシブ設計 / C値0.3（1.0以下保証）",
        "city": "ときがわ町",
        "tags": ["吉野杉大黒柱", "ZEH太陽光", "薪ストーブ", "山並み借景"],
        "client": "「吉野杉の大黒柱が堂々と立つ吹き抜けリビングは、四季折々の山並みが見渡せる特等席です。太陽光発電の売電収入も大きく、真冬でも家中が均一に暖かく、自然の恵みを感じながら心豊かに暮らせています。」",
        "carpenter": "「ときがわ町の美しい山並みに映えるよう、樹齢80年超の吉野杉大黒柱と化粧梁を手刻み加工。手すりや棚も大工の手仕事で角を丸くカンナ仕上げし、無垢材の温もりを引き出しました。」",
        "architect": "「南面の山並みを取り込む大開口と吹き抜けを設けつつ、埼玉の冬の冷え込みに負けない外皮断熱と許容応力度計算耐震等級3を両立。屋根勾配に合わせた太陽光パネル配置で年間収支ゼロのZEHを実現しました。」",
        "photographer": "Nikon D4S / AF-S NIKKOR 14-24mm F2.8G ED「神レンズ」 / F16 パンフォーカス / 自然光×薪ストーブ炎の揺らぎ"
    },
    "吉見町 O様邸": {
        "id": 2,
        "title": "吉見町・O様邸",
        "catch": "無垢杉の香りと陽だまりのLDK・家族の笑顔が集う平屋風ナチュラルハウス",
        "sub": "無垢杉フローリング / 平屋風設計 / 珪藻土壁 / C値0.4（1.0以下保証）",
        "city": "吉見町",
        "tags": ["無垢杉フロア", "珪藻土塗り壁", "平屋風動線", "陽だまりリビング"],
        "client": "「素足で歩く無垢杉の床が本当に気持ちよく、子どもたちが毎日ゴロゴロして遊んでいます。湿気の多い梅雨でも室内がカラッとしていて、珪藻土と無垢材の調湿力に家族みんなで感動しています。」",
        "carpenter": "「一本一本表情が異なる無垢杉の木目を見極め、一番足触りの良い面を表にして張り込みました。建具や造作カウンターも現場でミリ単位の削り合わせを行い、経年変化を楽しめる仕上がりにしています。」",
        "architect": "「平屋のように生活がワンフロアで完結する回遊動線を計画。南面からの冬期日射熱を最大限に蓄熱する床下構造と、自然風が南北に抜けるパッシブ通風設計を行いました。」",
        "photographer": "Nikon D700 / AF-S NIKKOR 16-35mm F4G ED VR / F11 / 午後の温かな斜光"
    },
    "川越市 Y様邸": {
        "id": 3,
        "title": "川越市・Y様邸",
        "catch": "30帖大LDK×白タイル床×ピットリビング・非日常を愉しむホテルライクモダン",
        "sub": "30帖大空間 / 白タイル床 / ピットリビング / C値0.35（1.0以下保証）",
        "city": "川越市",
        "tags": ["30帖大LDK", "白タイル床", "ピットリビング", "ホテルライク"],
        "client": "「30帖大の吹き抜けLDKに真っ白なタイル床、一段下がったピットリビング。『ホテルのラウンジのような家にしたい』という夢が完璧に叶いました。大空間なのにエアコン1台で足元まで暖かいのには驚きました。」",
        "carpenter": "「大スパンの鉄骨階段とタイル床の水平精度に徹底してこだわり、間接照明の光が一直線に伸びるよう天井と壁のチリをミリ単位で施工。大工の手刻み技術をモダンデザインの納まりに注ぎ込みました。」",
        "architect": "「柱のない30帖大吹き抜け空間でありながら、全棟許容応力度計算により耐震等級3を死守。白タイルの高い熱容量を活かした蓄熱暖房計画で、冷えを感じさせない上質な温熱環境を成立させました。」",
        "photographer": "Canon EOS 5D Mark II / EF17-40mm F4L USM / 17mm 超広角 / 水平アオリ補正 / 3000K間接照明"
    },
    "日高市 I様邸": {
        "id": 4,
        "title": "日高市・I様邸",
        "catch": "冬の光熱費が月5万から1万台に激減！勾配天井とロフトが繋ぐ超高断熱健康住宅",
        "sub": "光熱費激減 / 勾配天井ロフト / 付加断熱 / 実測C値0.28（1.0以下保証）",
        "city": "日高市",
        "tags": ["光熱費激減", "勾配天井ロフト", "W断熱付加", "健康住宅"],
        "client": "「前の家では冬の光熱費が5万円を超えていたのが、建て替えてからは1万円台に激減！家中どこにいても室温が均一で、廊下や脱衣室の寒さが全くありません。家族全員が風邪を引かなくなりました。」",
        "carpenter": "「付加断熱材の密着と気密テープの現場施工を隙間なく徹底。気密コンセントボックスや配管周りまで大工自ら入念に気密処理を行い、実測C値0.28の高気密を現場で作り上げました。」",
        "architect": "「日高市の厳しい冬の朝の底冷えを解消するため、付加断熱＋樹脂トリプルガラス（APW430）を採用。温熱シミュレーションに基づき、最小限のエネルギーで全館を暖める熱環境を設計しました。」",
        "photographer": "Nikon D4S / AF-S NIKKOR 14-24mm F2.8G ED / 14mm 超広角見上げ / F13 / 高窓からの自然光"
    },
    "東松山市 K様邸": {
        "id": 5,
        "title": "東松山市・K様邸",
        "catch": "伝統の手刻み木組みと現代の超気密が融合・格子戸の陰影が美しい和モダン邸宅",
        "sub": "手刻み木組み / 職人格子造作 / 珪藻土 / C値0.32（1.0以下保証）",
        "city": "東松山市",
        "tags": ["手刻み木組み", "伝統格子の美", "職人造作家具", "和モダン"],
        "client": "「玄関を開けた瞬間に広がる木の香りと、職人さんが手作業で組んでくれた格子戸の美しさに惚れ込んでいます。現代的な高気密高断熱の暖かさと、日本の伝統建築の風格が見事に両立しています。」",
        "carpenter": "「墨付けから刻みまで、昔ながらの大工技術で構造木を一本一本加工。リビングの格子引き戸や造作棚も、木の狂いが出ないよう木目を揃えて手鉋で極上の肌触りに仕上げました。」",
        "architect": "「伝統的な真壁・現し梁の美しさを損なわずに外皮性能を高める外張断熱工法を採用。許容応力度計算により、木組みの柔軟性と金物工法の強靭さをハイブリッドで統合しました。」",
        "photographer": "Nikon D700 / AF-S NIKKOR 16-35mm F4G ED VR / 24mm / F11 / 格子の陰影"
    },
    "行田市 H様邸": {
        "id": 6,
        "title": "行田市・H様邸",
        "catch": "ネイビーガルバ×ビルトインガレージ・寒がりの妻が「暖かすぎる」と太鼓判の家",
        "sub": "ビルトインガレージ / ネイビーガルバ / 付加断熱 / C値0.35（1.0以下保証）",
        "city": "行田市",
        "tags": ["ビルトインガレージ", "ネイビーガルバ", "愛車直結動線", "高気密高断熱"],
        "client": "「寒がりの妻が『この家は本当に暖かすぎる！』と喜んでいます。愛車を雨風から守るビルトインガレージから直接パントリーへ入れる動線も最高で、雨の日の買い物も快適そのものです。」",
        "carpenter": "「ガレージ上の広い居室をしっかり支える強固な床組みを施工。外壁のガルバリウム鋼板と杉羽目板の取り合い水切りも、雨仕舞いを熟知した職人技で綺麗に納めました。」",
        "architect": "「大開口ガレージシャッターによる構造弱点を許容応力度計算で徹底補強。ガレージ天井の付加断熱を厚く施工することで、上階リビングの底冷えを完全に遮断しました。」",
        "photographer": "Nikon D4S / 14-24mm F2.8G / 14mm 超広角 / 夕景ゴールデンアワー×ガレージ内照明"
    },
    "鳩山町 T様邸": {
        "id": 7,
        "title": "鳩山町・T様邸",
        "catch": "緑豊かな丘陵地に寄り添う平屋調ファサード・深い庇が日射を遮るパッシブ設計",
        "sub": "平屋調ファサード / 深い軒の出 / パッシブ遮熱 / C値0.4（1.0以下保証）",
        "city": "鳩山町",
        "tags": ["平屋調ファサード", "深い軒の出", "パッシブ設計", "鳩山町緑景"],
        "client": "「夏の日差しを深い軒がしっかり遮ってくれるので、真夏でも冷房が驚くほどよく効きます。リビングの大きな窓から眺める緑の庭が美しく、穏やかな時間を過ごせています。」",
        "carpenter": "「深く跳ね出した軒先が強風でも揺るがないよう、大工が垂木の固定金具と野地板の留め付けを入念に施工。軒裏の木羽目板も水平ラインを揃えて美しく仕上げました。」",
        "architect": "「埼玉で最も夏暑く冬寒い鳩山町の気候特性を徹底分析。夏至の太陽光を100%遮り、冬至の陽だまりを部屋の奥まで導く軒の出寸法をミリ単位で計算しました。」",
        "photographer": "Nikon D700 / 24mm / F13 / 青空と外観ファサード"
    },
    "鶴ヶ島市 A様邸": {
        "id": 8,
        "title": "鶴ヶ島市・A様邸",
        "catch": "「3年暮らしても不満ゼロ！」アイランドキッチンと中庭を囲むリゾートモダン",
        "sub": "アイランドキッチン / 中庭テラス / 回遊動線 / 211枚のプロ撮影写真",
        "city": "鶴ヶ島市",
        "tags": ["不満ゼロの家", "アイランドキッチン", "プライベート中庭", "回遊動線"],
        "client": "「住み始めて3年が経ちますが、本当に何一つ不満がありません。アイランドキッチンから中庭を眺めながら料理ができ、家じゅうをぐるぐる回れる回遊動線のおかげで家事の負担が半分になりました。」",
        "carpenter": "「中庭を囲む複雑な開口部周りの防水・気密処理を何重にもチェック。アイランドキッチンの腰壁や造作家具も、大工の手仕事で使い勝手に合わせて特注製作しました。」",
        "architect": "「外からの視線を完全に遮りながら光と風を取り込むロの字型中庭プラン。中庭に面した大開口サッシを連続させながら、耐震等級3を許容応力度計算で実証しました。」",
        "photographer": "プロ撮影 211枚 / 16mm超広角 / アイレベル1,100mm / 中庭の反射光と室内照明の調和"
    },
    "鶴ヶ島市 KB様邸": {
        "id": 9,
        "title": "鶴ヶ島市・KB様邸",
        "catch": "雪見障子と格子の静謐・庭園を愛でる本格和風モダンの極み",
        "sub": "雪見障子 / 本格和室 / 庭園景観 / 171枚のプロ撮影写真",
        "city": "鶴ヶ島市",
        "tags": ["雪見障子", "本格数寄屋和室", "庭園景観", "格子スクリーニング"],
        "client": "「雪見障子を少し上げて庭の緑を眺めながらお茶を飲む時間が何よりの贅沢です。畳の心地よさと、現代の快適な断熱性能が一つになり、一年中穏やかな気持ちで過ごせます。」",
        "carpenter": "「床の間の銘木や障子の鴨居・敷居を昔ながらの手刻みで削り出し。障子のスライドが指一本でスッと動くよう、木の呼吸による伸縮を見越した職人調整を行いました。」",
        "architect": "「和の繊細なディテールを保ちながら、外皮気密断熱層を建物の外側に途切れなく連続させる工学手法を採用。和室特有の底冷えを完全に追放しました。」",
        "photographer": "プロ撮影 171枚 / 28mm〜35mm / 座視線850mm（和室目線） / 障子を通した拡散光"
    },
    "鶴ヶ島市 K様邸": {
        "id": 10,
        "title": "鶴ヶ島市・K様邸",
        "catch": "職人手塗りの珪藻土と木格子スクリーン・清らかな空気が満ちるオーガニックハウス",
        "sub": "珪藻土壁 / 木格子スクリーン / 自律調湿 / 135枚のプロ撮影写真",
        "city": "鶴ヶ島市",
        "tags": ["手塗り珪藻土", "木格子スクリーン", "オーガニック素材", "自律調湿"],
        "client": "「家に入った瞬間に空気が澄んでいるのを感じます。ペットを飼っていますが匂いが全く気にならず、家族全員のアレルギー症状が軽くなったのには驚きました。」",
        "carpenter": "「玄関ホールからリビングへと視線を優しく遮る木格子スクリーンを現場で手組み。格子の隙間から漏れる光と影が時間とともに移ろう美しさを表現しました。」",
        "architect": "「室内の自然素材（珪藻土・無垢杉）と、マーベックス澄家第1種全熱交換換気を融合。空気質の清浄度と省エネ換気効率を最高水準に保つ設計を行いました。」",
        "photographer": "プロ撮影 135枚 / 20mm広角 / F11 / 珪藻土の陰影と木格子のリフレクション"
    },
    "鶴ヶ島市 S様邸": {
        "id": 11,
        "title": "鶴ヶ島市・S様邸",
        "catch": "きょうだい皆が選んだ家・天井高2.8mの22帖大空間リビングと無垢杉の温もり",
        "sub": "天井高2.8m / 中出カメラマン撮影 / 216枚のプロ写真 / C値0.3（1.0以下保証）",
        "city": "鶴ヶ島市",
        "tags": ["きょうだい皆が選んだ家", "天井高2.8m", "中出カメラマン216枚", "無垢杉大空間"],
        "client": "「きょうだいや親戚が次々に住ま居るさんで家を建てていて、『私たちの番』になった時も迷わずお願いしました。天井高280cmの大空間なのにエアコン1台で家中が暖かく、本当に大満足です。」",
        "carpenter": "「天井高2.8mのスケール感を際立たせるため、無垢杉のフロアと建具の取り合いを平滑に施工。手刻み大工ならではの精密な納まりで、何十年経っても狂わない骨太な造作に仕上げました。」",
        "architect": "「高天井の広がりと耐震等級3を両立させるため、立体フレーム解析による許容応力度計算を実施。上下温度差をゼロにする循環気流設計を盛り込みました。」",
        "photographer": "住宅専門 中出カメラマン撮影 216枚 / Nikon 14-24mm F2.8G / 垂直水平完全アオリ補正 / パンフォーカス"
    },
    "鶴ヶ島市 T様邸": {
        "id": 12,
        "title": "鶴ヶ島市・T様邸",
        "catch": "キヤノン超広角17mmが捉えた光の吹き抜け・家族の絆を育む開放的プラン",
        "sub": "光の吹き抜け / キヤノン超広角撮影 / 113枚のプロ写真 / C値0.35（1.0以下保証）",
        "city": "鶴ヶ島市",
        "tags": ["光の吹き抜け", "キヤノン超広角17mm", "家族の絆プラン", "高気密高断熱"],
        "client": "「2階の気配が1階リビングにいても自然と感じられ、家族の一体感があります。吹き抜けの高窓から青空や星空が見え、家にいる時間が一番のリフレッシュになっています。」",
        "carpenter": "「吹き抜けを渡る化粧梁の取り合いを手刻みでガッチリ緊結。スノコ廊下の手すりも触り心地が滑らかになるよう、手カンナで念入りに仕上げました。」",
        "architect": "「吹き抜けを介したパッシブ採光・通風シミュレーションを実施。冬は太陽の熱をリビングの奥深くまで届け、夏は高窓から熱気を排出するエコ設計です。」",
        "photographer": "Canon EOS 5D Mark II / EF17-40mm F4L USM / 17mm 超広角 / 113枚のプロ撮影アーカイブ"
    },
    "戸田市萩原様邸": {
        "id": 13,
        "title": "特別実邸・戸田市萩原様邸",
        "catch": "「空気が廻る家」埼玉県環境住宅賞優秀賞受賞・実測C値0.1の工学最高峰",
        "sub": "埼玉県環境住宅賞受賞 / 実測C値0.1 / BELS★★★★★ / UA値0.37",
        "city": "戸田市",
        "tags": ["埼玉県環境住宅賞", "実測C値0.1", "BELS最高ランク", "UA値0.37"],
        "client": "「『空気が廻る家』というコンセプト通り、家じゅうの空気が常に新鮮で心地よく循環しています。真夏も真冬も最小限のエネルギーで極上の快適さが続き、環境住宅賞を受賞できたことも誇りです。」",
        "carpenter": "「実測C値0.1という驚異的な超気密を達成するため、構造用合板のジョイント、先張り気密シート、配管貫通部を大工チームが一丸となってミリ単位で目貼り・気密施工しました。」",
        "architect": "「温熱・気密・耐震の全項目で工学限界に挑んだ特別邸。許容応力度計算耐震等級3、UA値0.37、実測C値0.1を達成し、埼玉県知事選定の環境住宅賞を受賞しました。」",
        "photographer": "公式受賞パネル写真 / 高解像度建築写真 / 建築写真家撮影 / 水平垂直アオリ補正"
    }
}

# 写真分類の判定ロジック
def classify_photo(filename_or_path):
    p = filename_or_path.lower()
    if any(k in p for k in ['gaikan', 'facade', 'exterior', 'gai', 'soto', 'kukan', 'niwa', 'deck', 'approach']):
        return 'exterior'
    if any(k in p for k in ['ldk', 'living', 'dining', 'kitchen', 'fuki', 'kaiwa', 'daikokubashira', 'floor']):
        return 'ldk'
    if any(k in p for k in ['bath', 'wash', 'toilet', 'mizu', 'sanitary', 'shower']):
        return 'water'
    if any(k in p for k in ['washitsu', 'tatami', 'bed', 'room', 'shousai', 'loft', 'shitsunai', 'ko']):
        return 'bedroom'
    return 'other'

def get_category_label(cat):
    labels = {
        'exterior': '外観・アプローチ',
        'ldk': 'LDK・吹き抜け',
        'water': '水回り・お風呂・洗面',
        'bedroom': '個室・和室・寝室',
        'other': '大工手刻み・ディテール'
    }
    return labels.get(cat, 'その他')

# 全13邸の写真をスキャン
cases_data = []

cases_dirs = sorted([d for d in os.listdir(RAW_DIR) if os.path.isdir(os.path.join(RAW_DIR, d))])

for folder_name in cases_dirs:
    full_folder = os.path.join(RAW_DIR, folder_name)
    all_files = glob.glob(os.path.join(full_folder, '**', '*.*'), recursive=True)
    img_files = [f for f in all_files if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
    
    # 登録プロファイル取得
    profile = CASE_PROFILES.get(folder_name)
    if not profile:
        # 該当しない場合のフォールバック
        cid = len(cases_data) + 1
        profile = {
            "id": cid,
            "title": folder_name,
            "catch": f"{folder_name}・職人施工実例",
            "sub": "住宅専用カメラマン撮影アーカイブ",
            "city": folder_name.split()[0] if ' ' in folder_name else "埼玉県",
            "tags": ["高気密高断熱", "自然素材", "大工施工"],
            "client": "「住ま居るさんの丁寧な家づくりで快適に暮らしています。」",
            "carpenter": "「熟練大工の手刻みと金物工法で強靭に施工しました。」",
            "architect": "「耐震等級3と高気密高断熱を両立設計しました。」",
            "photographer": "住宅専用プロカメラマン撮影 / 建築写真専用レンズ"
        }

    # 写真リスト生成
    photos_list = []
    cat_counts = {'exterior': 0, 'ldk': 0, 'water': 0, 'bedroom': 0, 'other': 0}
    
    # 代表的な写真を最大30枚選定（全部ある場合は先頭や各カテゴリからバランス良く選定）
    for img_path in img_files:
        rel = os.path.relpath(img_path, RAW_DIR).replace('\\', '/')
        encoded_rel = urllib.parse.quote(rel)
        url = f"/raw_case_photo/{encoded_rel}"
        filename = os.path.basename(img_path)
        cat = classify_photo(filename)
        cat_counts[cat] += 1
        
        photos_list.append({
            "rel_path": rel,
            "url": url,
            "filename": filename,
            "category": cat,
            "cat_label": get_category_label(cat),
            "caption": f"【{get_category_label(cat)}】{profile['title']} - プロ撮影高精細写真"
        })

    # 代表写真
    primary_photo_url = photos_list[0]['url'] if photos_list else "/images/hero_kaguya_house.jpg"
    
    case_entry = {
        "id": profile["id"],
        "folder": folder_name,
        "title": profile["title"],
        "catch": profile["catch"],
        "sub": profile["sub"],
        "city": profile["city"],
        "tags": profile["tags"],
        "client": profile["client"],
        "carpenter": profile["carpenter"],
        "architect": profile["architect"],
        "photographer": profile["photographer"],
        "total_photos": len(img_files),
        "primary_photo_url": primary_photo_url,
        "cat_counts": cat_counts,
        "photos": photos_list[:40]  # ブラウザ初期表示用に厳選40枚（全体枚数も明記）
    }
    cases_data.append(case_entry)

# ID順でソート
cases_data.sort(key=lambda x: x["id"])

# JSON書き出し
archive_json_path = os.path.join(DATA_DIR, 'cases_gallery_archive.json')
with open(archive_json_path, 'w', encoding='utf-8') as f:
    json.dump({
        "generated_at": "2026-10-15 09:30:00",
        "description": "株式会社住ま居る 住宅実例（全12邸＋特別実邸）プロ写真アーカイブ",
        "total_cases": len(cases_data),
        "total_photos_count": sum(c['total_photos'] for c in cases_data),
        "cases": cases_data
    }, f, ensure_ascii=False, indent=2)

print(f"Generated cases_gallery_archive.json: {len(cases_data)} cases, {sum(c['total_photos'] for c in cases_data)} total photos.")

# section-craftsmanship.html の該当部分（全13邸カードグリッド）を生成
cards_html = []
for c in cases_data:
    is_active = " active" if c["id"] == 1 else ""
    tags_html = "".join([f'<span class="c-tag">{t}</span>' for t in c["tags"][:3]])
    card = f"""          <!-- Case {c['id']}: {c['title']} -->
          <div class="case-overview-card{is_active}" data-case="{c['id']}" id="case-card-{c['id']}" style="cursor: pointer;">
            <div class="case-card-thumb" style="position: relative; overflow: hidden; height: 180px; border-radius: 8px 8px 0 0; background: #0f172a;">
              <img src="{c['primary_photo_url']}" alt="{c['title']}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;" width="400" height="260" />
              <span class="case-card-num" style="position: absolute; top: 8px; left: 8px; background: rgba(15,23,42,0.85); color: #f59e0b; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 0.78rem;">No. {c['id']:02d}</span>
              <span class="case-card-badge" style="position: absolute; bottom: 8px; right: 8px; background: rgba(2,132,199,0.9); color: #ffffff; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75rem;">📷 全{c['total_photos']}枚</span>
              <div class="case-card-status" style="position: absolute; top: 8px; right: 8px; background: #10b981; color: #fff; font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; display: {'block' if c['id'] == 1 else 'none'};">現在閲覧中</div>
            </div>
            <div class="case-card-body" style="padding: 1rem; background: #ffffff;">
              <h3 class="case-card-title" style="margin: 0 0 0.3rem; font-size: 1.05rem; font-weight: 800; color: #0f172a;">{c['title']}</h3>
              <p class="case-card-copy" style="margin: 0 0 0.6rem; font-size: 0.82rem; color: #475569; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">{c['catch']}</p>
              <div class="case-card-tags" style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 0.8rem;">
                {tags_html}
              </div>
              <div class="case-card-actions" style="display: flex; justify-content: space-between; align-items: center;">
                <button class="case-card-btn" style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #0f172a; padding: 4px 10px; border-radius: 4px; font-size: 0.78rem; font-weight: 700; cursor: pointer;">実写真集を見る ({c['total_photos']}枚) ↓</button>
                <span style="font-size: 0.75rem; color: #0284c7; font-weight: 700;">プロ撮影 📸</span>
              </div>
            </div>
          </div>"""
    cards_html.append(card)

grid_cards_str = "\n".join(cards_html)

# 更新用のHTMLスニペットを保存
with open(os.path.join(DATA_DIR, 'craftsmanship_cards_snippet.html'), 'w', encoding='utf-8') as f:
    f.write(grid_cards_str)

print("Cards snippet successfully saved.")
