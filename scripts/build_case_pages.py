# -*- coding: utf-8 -*-
"""
scripts/build_case_pages.py
施工事例6邸の個別静的SEOページ（SSG）自動生成スクリプト
床面積非表示、建築士統一、金物工法＋手刻み大工内部造作、C値1.0以下保証（実測0.28〜0.6目安）
"""
import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
CASES_DIR = os.path.join(PUBLIC_DIR, 'cases')
os.makedirs(CASES_DIR, exist_ok=True)

cases_data = [
    {
        "id": "case-1",
        "num": "01",
        "title": "【鶴ヶ島市・S様邸】きょうだい皆が選んだ信頼の家・天井高2.8mの大空間LDKと無垢杉の温もり",
        "city": "鶴ヶ島市",
        "family": "ご夫婦＋お子様2人",
        "structure": "木造軸組 金物工法（手刻み大工による内部造作）",
        "seismic": "耐震等級3（許容応力度計算・構造計算書付）",
        "c_val": "C値1.0以下保証（実測0.28〜0.6目安）",
        "ua_val": "UA値 0.44 W/m²K (HEAT20 G2相当)",
        "cost_benefit": "夏冬エアコン1台で年中快適、上下温度差1℃以内",
        "tags": ["埼玉県鶴ヶ島市", "天井高2.8m", "自然素材の家", "無垢杉フロア", "職人手塗り珪藻土", "耐震等級3", "C値1.0以下保証", "実測0.28〜0.6目安"],
        "client_voice": "「きょうだいや親戚が次々に住ま居るさんで家を建てていて、『毎年毎年進化しているね』と評判を聞いていました。私たちの番になり、開放的な天井高280cmの大空間リビングをお願いしました。『天井を高くすると冬寒くなるのでは？』と心配でしたが、住んでみてびっくり。真冬でもエアコン1台で部屋中が均一に暖かく、夏も風がすっと抜けて涼しい。無垢杉の床は素足で歩くのが最高に気持ちよく、子どもたちも毎日素足で走り回っています。」",
        "carpenter_voice": "「構造躯体は耐震性に優れた金物工法で強靭に緊結。その上で、天井高2.8mの空間美を引き立てる無垢杉の床や内部造作を、手刻みができる熟練大工が木癖を見極めながら丁寧に施工しました。珪藻土の壁も左官職人の手仕事で柔らかい陰影が出るよう仕上げています。」",
        "architect_voice": "「天井高280cmの開放感と耐震性能を両立させるため、許容応力度計算による立体フレーム解析を行い、耐震等級3（最高等級）を確保。高天井でも上下温度差が生まれないよう、埼玉の気候に合わせた高断熱・高気密施工（C値1.0以下保証・実測0.28〜0.6目安）を行い、暖気の滞留を防ぐサーキュレーション気流を設計しました。」",
        "photos_dir": "/images/cases_real/case1",
        "photo_count": 13,
        "captions": [
            "【LDK全景】対面キッチンからリビング・ダイニングまで一望できる22帖大空間",
            "【リビング】無垢杉フローリングと革張りソファが調和するくつろぎの空間",
            "【ダイニング】木の温もりに包まれた無垢ダイニングテーブルと優しい自然光",
            "【対面キッチン】家族と会話を楽しみながら料理ができるオープンキッチンカウンター",
            "【モダン和室】雪見障子と畳、床の間を備えた風情あふれる和のスペース",
            "【主寝室】折り上げ天井の間接照明が優しく照らす落ち着きのある寝室",
            "【書斎・AVカウンター】テレワークや趣味、映像鑑賞に没頭できる造作カウンター",
            "【クローゼット】無垢建具で仕立てられた大容量のウォークイン収納",
            "【2階洋室】無垢杉床と珪藻土の自律調湿に包まれた快適な居室",
            "【セカンドリビング】家族それぞれの時間を豊かに過ごせる2階のくつろぎスペース",
            "【子ども部屋】2面採光で明るい風通しの良い洋室",
            "【階段ホール】職人手作りの木製格子手すりと2階洗面カウンター",
            "【外観ファサード】街並みに美しく調和する落ち着いたタイル調外観と駐車スペース"
        ]
    },
    {
        "id": "case-2",
        "num": "02",
        "title": "【ときがわ町・K様邸】吉野杉大黒柱と山並みを望む吹き抜け・太陽光＆ZEHで叶えた自然共生住宅",
        "city": "比企郡ときがわ町",
        "family": "ご夫婦＋お子様1人＋愛犬",
        "structure": "木造軸組 金物工法（吉野杉大黒柱・手刻み大工造作）",
        "seismic": "耐震等級3（許容応力度計算）",
        "c_val": "C値1.0以下保証（実測0.28〜0.6目安）",
        "ua_val": "UA値 0.38 W/m²K (HEAT20 G2超)",
        "cost_benefit": "太陽光発電売電収入により年間光熱費実質ゼロ達成",
        "tags": ["埼玉県ときがわ町", "吉野杉大黒柱", "薪ストーブ", "吹抜けリビング", "太陽光発電ZEH", "パッシブ設計", "C値1.0以下保証", "実測0.28〜0.6目安"],
        "client_voice": "「当初は『初期コストをできるだけ抑えたい』と考えていましたが、住ま居るさんから30年・50年のライフサイクルコストや光熱費のリアルなシミュレーションを見せてもらい、目からウロコでした。『後からやり直せない断熱・耐震・構造こそ最初に投資すべき』と納得。吉野杉の大黒柱が堂々と立つ吹き抜けリビングは、四季折々の山並みが見渡せる特等席です。太陽光発電の売電収入も大きく、冬も家中ポカポカで、まるで嘘のような快適な毎日です。」",
        "carpenter_voice": "「骨組みは強固な金物工法を採用し、自然豊かなときがわ町の風景に映える吉野杉の大黒柱や内部造作は、手刻みができる大工が手作業でカンナがけを行い木肌の艶を引き出しました。手すりや棚も木癖を見極めて現場加工しています。」",
        "architect_voice": "「南面の山並みを取り込む大開口と吹き抜けを設けつつ、埼玉の冬の寒風に負けない外皮断熱と許容応力度計算耐震等級3を両立。屋根勾配に合わせた太陽光パネル設計により、年間エネルギー収支ゼロを超えるZEH仕様を実現しました。」",
        "photos_dir": "/images/cases_real/case2",
        "photo_count": 13,
        "captions": [
            "【外観ファサード】ときがわの澄んだ青空と山並みに美しく映える外観デザイン",
            "【外観全景】深い庇とアプローチが自然環境と調和するパッシブ外観",
            "【玄関ポーチ】温もりあるアーチ壁と木製断熱ドアが迎えるエントランス",
            "【吉野杉大黒柱リビング】堂々たる大黒柱と山並みを望む吹き抜け大空間LDK",
            "【吹き抜け見上げ】開放的な吹き抜けと木組みの構造美が広がるリビング",
            "【無垢床LDK】太陽の光がたっぷりと差し込むひだまりのリビングスペース",
            "【和のダイニング】自然素材に囲まれた家族団らんのダイニングエリア",
            "【造作キッチン】無垢材の風合いを活かした使い勝手抜群のオリジナル台所",
            "【高断熱バスルーム】一日の疲れをゆったりと癒せる広々としたシステムバス",
            "【洗面スペース】木の温もりを感じる清潔感あふれるサニタリー",
            "【トイレ】木製棚を備えた明るく清潔なトイレスペース",
            "【2階洋室】子どもたちがのびのびと遊べる明るいプレイスペース",
            "【ウッドデッキ・庭】豊かな自然の風を感じながら外気浴を楽しめるアウトドアデッキ"
        ]
    },
    {
        "id": "case-3",
        "num": "03",
        "title": "【鶴ヶ島市・A様邸】「3年暮らしても不満ゼロ！」アイランドキッチンと回遊動線・素足が喜ぶ高気密高断熱",
        "city": "鶴ヶ島市",
        "family": "ご夫婦＋お子様2人",
        "structure": "木造軸組 金物工法（高耐震・手刻み大工造作）",
        "seismic": "耐震等級3（許容応力度計算）",
        "c_val": "C値1.0以下保証（実測0.28〜0.6目安）",
        "ua_val": "UA値 0.42 W/m²K (HEAT20 G2)",
        "cost_benefit": "結露ゼロ・真冬でも素足で過ごせる快適性、家事時間半減",
        "tags": ["埼玉県鶴ヶ島市", "アイランドキッチン", "家事ラク回遊動線", "素足で暮らす家", "パントリー収納", "C値1.0以下保証", "実測0.28〜0.6目安", "OBインタビュー"],
        "client_voice": "「以前住んでいた建売住宅は、結露はひどいし夏は蒸し風呂、冬は足元が底冷えして本当に辛かったんです。住ま居るさんで建てて3年が経ちますが、正直言って今でも『何一つ不満点がない』んです！私のわがままだったアイランドキッチンと家じゅうをぐるぐる回れる回遊動線、広いお風呂。共働きの家事が本当にラクになり、素足で家中を歩ける暖かさに毎日感動しています。『ちゃんと造る』とこんなにも暮らしが変わるんですね。」",
        "carpenter_voice": "「構造躯体は金物工法でしっかり耐震性を担保。キッチンからパントリー、水回りへとスムーズに繋がる回遊動線に合わせて、引き戸の枠や収納棚を手刻みができる大工がミリ単位の造作で仕上げ、建具の滑らかな開閉感を現場調整しました。」",
        "architect_voice": "「回遊動線で壁が少なくなる間取りでも、金物工法躯体と許容応力度計算により耐震等級3を確保。建物全棟で中間気密測定を実施し、足元と天井の温度差がほぼない快適な熱環境を設計しました。」",
        "photos_dir": "/images/cases_real/case3",
        "photo_count": 11,
        "captions": [
            "【外観モダンファサード】ヤシの木とモノトーンが際立つリゾートモダン外観",
            "【石畳アプローチ】自然石を積み上げたリゾート感あふれる玄関エントランス",
            "【モダン和室】銘木一枚板座卓と朱色のアクセントウォールが調和する和室",
            "【黒革ソファLDK】上質な黒革ソファとウォールナット調TVボードの大空間",
            "【ダイニング＆キッチン】間接照明と格子ルーバーが美しく演出するダイニング",
            "【主寝室】ホテルライクな落ち着きと大容量収納を備えたベッドルーム",
            "【中庭・プライベートテラス】外からの視線を遮りプライバシーを守る中庭スペース",
            "【スカイバルコニー】青空の下でBBQや寛ぎを満喫できる広々バルコニー",
            "【大型バスルーム】肩湯やジェットバスで極上の癒しを提供するワイド浴室",
            "【2階洋室】バルコニーへ直結する明るく開放的なプライベートルーム",
            "【エントランスホール】直線的な光が奥へと視線を導くスタイリッシュな廊下"
        ]
    },
    {
        "id": "case-4",
        "num": "04",
        "title": "【日高市・I様邸】冬の光熱費が月5万円から1万円台に激減！住み心地重視で叶えた省エネ健康住宅",
        "city": "日高市",
        "family": "ご夫婦＋お子様1人",
        "structure": "木造軸組 金物工法（全棟許容応力度計算）",
        "seismic": "耐震等級3（最高等級）",
        "c_val": "C値1.0以下保証（実測0.28〜0.6目安）",
        "ua_val": "UA値 0.36 W/m²K (HEAT20 G2超)",
        "cost_benefit": "冬の光熱費が月5万円超から1万円台へ約75%激減",
        "tags": ["埼玉県日高市", "光熱費激減", "住み心地重視", "省エネ住宅", "自然素材珪藻土", "C値1.0以下保証", "実測0.28〜0.6目安", "ヒートショック防止"],
        "client_voice": "「以前の家では床暖房とエアコンをフル稼働させていて、冬になると毎月の電気・ガス代が5万円を超えて家計の大きな負担でした。住ま居るさんにお願いして建て替えたところ、真冬でも光熱費が1万円を少し超える程度に激減して本当にびっくりしました！しかも、前の家よりどの部屋も格段に暖かい。廊下もお風呂も寒くなく、家族が風邪を引かなくなりました。省エネ住宅の本当の凄さを毎日実感しています。」",
        "carpenter_voice": "「骨組みは金物工法でガッチリ組み上げ、熱を逃がさない丁寧な気密・断熱施工を現場で徹底。コンセントボックスや配管周りまで気密テープで隙間なく密閉しました。自然素材の杉床や壁の珪藻土も、湿気を適度に吸放出するよう大工・左官の手仕事で施工しています。」",
        "architect_voice": "「日高市の冬の冷え込みに対応するため、断熱材の厚みとサッシの遮熱・断熱仕様をパッシブシミュレーション。暖房エネルギー消費量を従来の1/4以下に抑える熱性能を数値で証明しました。」",
        "photos_dir": "/images/cases_real/case4",
        "photo_count": 9,
        "captions": [
            "【勾配天井ロフトホール】木の温もりが広がる開放的な2階フリースペース",
            "【2階ホール】家族の気配が緩やかに繋がる吹き抜け横のホール",
            "【主寝室】落ち着いた木製造作クローゼットに包まれたベッドルーム",
            "【子ども部屋・洋室】明るい日差しが差し込む清潔感のある個室",
            "【トイレスペース】可愛らしい小窓と上品な壁紙で仕立てたレストルーム",
            "【玄関エントランス】木格子スクリーンがアクセントの趣ある玄関ホール",
            "【リビングダイニング】勾配天井の高窓から光が降り注ぐLDK",
            "【趣ある和空間】落ち着いた民芸調の建具と格子が調和する特別な空間",
            "【吹き抜け見上げ】力強い梁と勾配天井のダイナミックな空間美"
        ]
    },
    {
        "id": "case-5",
        "num": "05",
        "title": "【川越市・Y様邸】30帖大LDK×白タイル床×ピットリビング・理想のデザインを形にしたラグジュアリーモダン",
        "city": "川越市",
        "family": "ご夫婦",
        "structure": "木造軸組 金物工法（大スパン梁架構・手刻み大工造作）",
        "seismic": "耐震等級3（許容応力度計算）",
        "c_val": "C値1.0以下保証（実測0.28〜0.6目安）",
        "ua_val": "UA値 0.45 W/m²K (HEAT20 G2相当)",
        "cost_benefit": "30帖大空間でもエアコン1台で冷暖房完備、ホテルライクな寛ぎ",
        "tags": ["埼玉県川越市", "30帖大LDK", "白タイル床", "ピットリビング", "吹き抜け間接照明", "ラグジュアリーモダン", "C値1.0以下保証", "実測0.28〜0.6目安"],
        "client_voice": "「30帖大の広々としたLDKに、真っ白なタイルの床、間接照明、開放的な吹き抜け、そして一段下がったピットリビング。『ホテルのラウンジのような非日常感のある家にしたい』という私のわがままを全て叶えてもらいました。大空間でもエアコンの効きが良く、友人を招くと『これ本当に個人の家なの？』と歓声が上がります。デザイン性と快適性が両立した最高のお気に入り空間です。」",
        "carpenter_voice": "「金物工法による大スパン躯体と、一段下がりのピットリビングを実現するため、床組みの段差納まりやタイル下地の水平精度に徹底してこだわりました。間接照明の光が綺麗に伸びるよう、手刻みができる大工が天井や壁面の造作もミリ単位で調整しています。」",
        "architect_voice": "「30帖の大スパン吹き抜け空間でありながら、全棟許容応力度計算により耐震等級3を死守。大開口サッシからの冬の日射取得と夏の遮熱を綿密に計算し、タイル床の熱容量を活かした快適な室内環境をつくりました。」",
        "photos_dir": "/images/cases_real/case5",
        "photo_count": 11,
        "captions": [
            "【エントランスニッチ】ストライプクロスと間接照明が迎えるギャラリー風玄関",
            "【外部エントランス】洗練されたスクエアフォルムのモダンな玄関ポーチ",
            "【スケルトン階段】白タイル床に美しく映えるストリップ鉄骨階段",
            "【吹抜け大空間LDK】30帖大の広がりと白タイルの輝きが非日常感を醸すリビング",
            "【ピットリビング】一段下がった包まれ感と吹き抜けの開放感が同居するサロン",
            "【ダイニングキッチン】折り上げ天井の間接照明が優雅なディナー空間を演出",
            "【対面キッチン】開放感抜群のアイランドスタイルで料理が楽しくなる空間",
            "【吹抜け見下ろし】2階ホールから見渡すダイナミックなLDK全景",
            "【サロンスペース】店舗兼住宅として仕立てたアンティーク調の施術サロン",
            "【サロンブース】大きな鏡と観葉植物が調和する洗練された空間",
            "【サロン待合ラウンジ】訪れるゲストがくつろげるカフェのような待合室"
        ]
    },
    {
        "id": "case-6",
        "num": "06",
        "title": "【行田市・H様邸】寒がりの妻が「暖かすぎる」と太鼓判！大手メーカー比較で選んだ本物の高気密高断熱",
        "city": "行田市",
        "family": "ご夫婦＋愛車",
        "structure": "木造軸組 金物工法（ビルトインガレージ・手刻み大工造作）",
        "seismic": "耐震等級3（許容応力度計算）",
        "c_val": "C値1.0以下保証（実測0.28〜0.6目安）",
        "ua_val": "UA値 0.35 W/m²K (HEAT20 G2超)",
        "cost_benefit": "ガレージハウスでも真冬に底冷えゼロ、大手HM以上の快適性",
        "tags": ["埼玉県行田市", "ビルトインガレージ", "ネイビーガルバ", "手刻み格子造作", "HEAT20 G2超", "耐震等級3", "C値1.0以下保証", "実測0.28〜0.6目安"],
        "client_voice": "「愛車を雨風から守るビルトインガレージと、深みのあるネイビーの外壁、そして木目のアクセント。私たちのこだわりを工学的な計算と熟練大工の手刻みで見事に具現化していただきました。ガレージから雨に濡れずに室内へ入れる動線は感動的です。手刻み大工さんが一つひとつ丁寧に組んでくれた玄関やリビングの格子戸は、訪れる友人みんなが褒めてくれます。」",
        "carpenter_voice": "「ビルトインガレージ上の大空間を支える金物工法の頑強な躯体に加え、玄関格子や造作建具、階段下の本棚など、住ま居るならではの手刻み木工技術を存分に発揮しました。木目の揃い方や手触りの滑らかさに徹底的にこだわっています。」",
        "architect_voice": "「開口部が大きくなるガレージハウスだからこそ、許容応力度計算による構造計算をミリ単位で実施。耐震等級3を確実にクリアしつつ、付加断熱と遮熱設計によりガレージ上部の居室も一年中快適な温熱環境を実現しました。」",
        "photos_dir": "/images/cases_real/case6",
        "photo_count": 10,
        "captions": [
            "【無垢杉のフロア】手鉋仕上げの無垢杉が足裏に心地よいナチュラル空間",
            "【大容量ウォークイン】大工職人の手刻み造作による格子戸付き大型収納",
            "【和モダン寝室】藍色のアクセントクロスと障子の陰影が落ち着く主寝室",
            "【小上がり和室】リビングから緩やかに繋がるくつろぎの小上がり畳コーナー",
            "【吹抜け大空間見下ろし】高窓から明るい自然光が降り注ぐリビング全景",
            "【ビルトインガレージ外観】深みのあるネイビーガルバ×木目羽目板のガレージハウス",
            "【吹き抜けLDK】化粧梁のダイナミックな架構と手刻み造作家具が調和する空間",
            "【回遊アイランドキッチン】家族で囲んで料理を楽しめるオリジナル対面キッチン",
            "【玄関ホール】格子引き戸と無垢上がり框が温かく迎えるエントランス",
            "【大工特注仏間・収納】伝統の大工技術が細部に宿る美しい木製建具"
        ]
    }
]

page_template = """<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} | 株式会社住ま居る 埼玉県の注文住宅施工事例</title>
  <meta name="description" content="{description}" />
  <meta name="keywords" content="{keywords}" />
  <meta property="og:title" content="{title} | 株式会社住ま居る" />
  <meta property="og:description" content="{description}" />
  <meta property="og:image" content="https://t-smile.co.jp{og_image}" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="canonical" href="https://t-smile.co.jp/cases/{case_id}.html" />
  
  <!-- 構造化マークアップ: LocalBusiness & SingleFamilyResidence & BreadcrumbList -->
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@graph": [
      {{
        "@type": "LocalBusiness",
        "@id": "https://t-smile.co.jp/#organization",
        "name": "株式会社住ま居る",
        "image": "https://t-smile.co.jp/images/hero_kaguya_house.jpg",
        "telephone": "049-271-2350",
        "priceRange": "￥￥￥",
        "address": {{
          "@type": "PostalAddress",
          "streetAddress": "町屋176番地5",
          "addressLocality": "鶴ヶ島市",
          "addressRegion": "埼玉県",
          "postalCode": "350-2224",
          "addressCountry": "JP"
        }},
        "areaServed": ["埼玉県", "鶴ヶ島市", "川越市", "日高市", "坂戸市", "東松山市", "ときがわ町", "行田市"]
      }},
      {{
        "@type": "SingleFamilyResidence",
        "name": {json_title},
        "description": {json_desc},
        "address": {{
          "@type": "PostalAddress",
          "addressLocality": {json_city},
          "addressRegion": "埼玉県",
          "addressCountry": "JP"
        }},
        "numberOfRooms": "LDK + 個室"
      }},
      {{
        "@type": "Review",
        "itemReviewed": {{
          "@type": "HomeAndConstructionBusiness",
          "name": "株式会社住ま居る",
          "image": "https://t-smile.co.jp/images/hero_kaguya_house.jpg",
          "telephone": "049-271-2350"
        }},
        "author": {{
          "@type": "Person",
          "name": "{client_name}様（お施主様）"
        }},
        "reviewRating": {{
          "@type": "Rating",
          "ratingValue": "5",
          "bestRating": "5"
        }},
        "reviewBody": {json_client_voice}
      }},
      {{
        "@type": "BreadcrumbList",
        "itemListElement": [
          {{
            "@type": "ListItem",
            "position": 1,
            "name": "ホーム",
            "item": "https://t-smile.co.jp/"
          }},
          {{
            "@type": "ListItem",
            "position": 2,
            "name": "施工事例ギャラリー",
            "item": "https://t-smile.co.jp/#craftsmanship"
          }},
          {{
            "@type": "ListItem",
            "position": 3,
            "name": {json_title},
            "item": "https://t-smile.co.jp/cases/{case_id}.html"
          }}
        ]
      }}
    ]
  }}
  </script>

  <link rel="stylesheet" href="/css/style.css" />
  <style>
    body {{
      background: #f8fafc;
      color: #1e293b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 0;
      line-height: 1.8;
    }}
    .case-container {{
      max-width: 1040px;
      margin: 2rem auto;
      padding: 0 1.5rem 4rem;
    }}
    .case-nav-crumb {{
      font-size: 0.88rem;
      color: #64748b;
      margin-bottom: 1.5rem;
    }}
    .case-nav-crumb a {{
      color: #0284c7;
      text-decoration: none;
    }}
    .case-tag-list {{
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }}
    .case-tag-pill {{
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;
    }}
    .case-h1 {{
      font-size: 1.85rem;
      font-weight: 900;
      line-height: 1.4;
      color: #0f172a;
      margin: 0 0 1.5rem 0;
      border-bottom: 3px solid #10b981;
      padding-bottom: 0.8rem;
    }}
    .case-spec-card {{
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2.5rem;
      box-shadow: 0 4px 16px rgba(0,0,0,0.03);
    }}
    .case-spec-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }}
    .spec-item {{
      background: #f8fafc;
      padding: 0.8rem 1rem;
      border-radius: 8px;
      border-left: 4px solid #0284c7;
    }}
    .spec-label {{
      font-size: 0.78rem;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 0.2rem;
    }}
    .spec-val {{
      font-size: 1rem;
      font-weight: 800;
      color: #0f172a;
    }}
    .case-triad-wrap {{
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.2rem;
      margin-bottom: 2.5rem;
    }}
    @media (min-width: 768px) {{
      .case-triad-wrap {{ grid-template-columns: repeat(3, 1fr); }}
    }}
    .triad-box {{
      background: #ffffff;
      border-radius: 12px;
      padding: 1.5rem;
      border-top: 4px solid #cbd5e1;
      box-shadow: 0 4px 16px rgba(0,0,0,0.03);
      border: 1px solid #e2e8f0;
    }}
    .triad-client {{ border-top: 4px solid #f59e0b; }}
    .triad-carpenter {{ border-top: 4px solid #0284c7; }}
    .triad-architect {{ border-top: 4px solid #10b981; }}
    .triad-title {{
      font-size: 1.05rem;
      font-weight: 900;
      margin-top: 0;
      margin-bottom: 0.8rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }}
    .triad-text {{
      font-size: 0.92rem;
      line-height: 1.8;
      color: #334155;
      margin: 0;
    }}
    .photo-album-section {{
      margin-top: 3rem;
    }}
    .photo-album-title {{
      font-size: 1.45rem;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 1.2rem;
    }}
    .photo-grid {{
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }}
    @media (min-width: 640px) {{
      .photo-grid {{ grid-template-columns: repeat(2, 1fr); }}
    }}
    .photo-card {{
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.04);
      transition: transform 0.2s ease;
    }}
    .photo-card:hover {{
      transform: translateY(-4px);
    }}
    .photo-card img {{
      width: 100%;
      height: 280px;
      object-fit: cover;
      display: block;
    }}
    .photo-card-caption {{
      padding: 1rem;
      font-size: 0.9rem;
      font-weight: 700;
      color: #1e293b;
      background: #ffffff;
      border-top: 1px solid #f1f5f9;
    }}
    .case-footer-cta {{
      margin-top: 4rem;
      background: linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%);
      color: #ffffff;
      padding: 3rem 2rem;
      border-radius: 16px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(27,67,50,0.2);
    }}
    .case-footer-cta h2 {{
      font-size: 1.6rem;
      margin-top: 0;
      margin-bottom: 0.8rem;
    }}
    .case-footer-cta p {{
      color: #d1fae5;
      max-width: 650px;
      margin: 0 auto 1.5rem;
      font-size: 1rem;
    }}
    .cta-btn-group {{
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 1rem;
    }}
    .cta-btn-white {{
      display: inline-block;
      background: #ffffff;
      color: #1b4332;
      font-weight: 800;
      padding: 0.9rem 1.8rem;
      border-radius: 8px;
      text-decoration: none;
      font-size: 1rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }}
    .cta-btn-outline {{
      display: inline-block;
      border: 2px solid #ffffff;
      color: #ffffff;
      font-weight: 800;
      padding: 0.9rem 1.8rem;
      border-radius: 8px;
      text-decoration: none;
      font-size: 1rem;
    }}
    .other-cases-wrap {{
      margin-top: 3.5rem;
      border-top: 2px dashed #cbd5e1;
      padding-top: 2.5rem;
    }}
    .other-cases-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem;
      margin-top: 1.2rem;
    }}
    .other-case-link {{
      display: block;
      padding: 1rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      text-decoration: none;
      color: #0f172a;
      font-weight: 700;
      font-size: 0.92rem;
      transition: all 0.2s ease;
    }}
    .other-case-link:hover {{
      border-color: #0284c7;
      color: #0284c7;
      background: #f0f9ff;
    }}
  </style>
</head>
<body>
  <!-- 統一グローバルヘッダー（常時表示・全ページ回遊・離脱防止） -->
  <header style="background: #0f172a; border-bottom: 1px solid rgba(255,255,255,0.15); padding: 0.6rem 1.2rem; position: sticky; top: 0; z-index: 1000; box-shadow: 0 4px 20px rgba(0,0,0,0.25);">
    <div style="max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 0.5rem;">
      <!-- Tier 1: ロゴ ＆ AI Suiteツール切替 -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap;">
          <a href="/index.html" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none; color: #ffffff;">
            <span style="font-size: 1.3rem; font-weight: 900; background: linear-gradient(135deg, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">家づくりAIラボ</span>
            <span style="font-size: 0.65rem; background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; color: #38bdf8; padding: 1px 6px; border-radius: 4px; font-weight: 800;">by 住ま居る</span>
          </a>
          <span style="background: linear-gradient(135deg, #059669, #10b981); color: #ffffff; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 12px;">
            🏡 埼玉の注文住宅 施工実例
          </span>
        </div>

        <!-- AI Suite Quick Links -->
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <a href="/index.html" style="font-size: 0.78rem; font-weight: 800; padding: 5px 12px; border-radius: 6px; text-decoration: none; background: rgba(255,255,255,0.1); color: #ffffff; border: 1px solid rgba(255,255,255,0.2);">🏠 ホームTOP</a>
          <a href="/index.html#floorplan-studio" style="font-size: 0.78rem; font-weight: 800; padding: 5px 12px; border-radius: 6px; text-decoration: none; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);">📐 AI 3Dプラン検索</a>
          <a href="/subsidy/index.html" style="font-size: 0.78rem; font-weight: 800; padding: 5px 12px; border-radius: 6px; text-decoration: none; background: linear-gradient(135deg, #047857, #10b981); color: #ffffff;">💰 AI補助金ナビ ↗</a>
          <a href="/mortgage/index.html" style="font-size: 0.78rem; font-weight: 800; padding: 5px 12px; border-radius: 6px; text-decoration: none; background: linear-gradient(135deg, #0284c7, #38bdf8); color: #ffffff;">🏦 AI住宅ローン診断 ↗</a>
          <a href="/smilestudio.html" target="_blank" style="font-size: 0.78rem; font-weight: 800; padding: 5px 12px; border-radius: 6px; text-decoration: none; background: linear-gradient(135deg, #d97706, #f59e0b); color: #0f172a;">🎨 AI 3Dパース工房 ↗</a>
        </div>
      </div>

      <!-- Tier 2: サイト内主要ナビゲーション -->
      <div style="display: flex; align-items: center; gap: 14px; overflow-x: auto; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 0.78rem; font-weight: 700; white-space: nowrap;">
        <a href="/index.html#our-philosophy" style="color: #cbd5e1; text-decoration: none;">🏛️ 家づくりのこだわり</a>
        <a href="/index.html#craftsmanship" style="color: #38bdf8; text-decoration: none; font-weight: 800;">🔨 施工実例（大工手刻み）</a>
        <a href="/about/" style="color: #6ee7b7; text-decoration: none;">🛡️ 会社概要 (CredLayer)</a>
        <a href="/performance/" style="color: #cbd5e1; text-decoration: none;">📐 住宅性能数値証明</a>
        <a href="/category/spec/" style="color: #cbd5e1; text-decoration: none;">⚙️ 標準工学仕様</a>
        <a href="/evidence/" style="color: #cbd5e1; text-decoration: none;">📊 光熱費実証データ</a>
        <a href="/knowledge/thermal/" style="color: #fbbf24; text-decoration: none;">📚 温熱知見200選</a>
        <a href="/catalog/" style="color: #cbd5e1; text-decoration: none;">📖 Webカタログ</a>
      </div>
    </div>
  </header>

  <div class="case-container">
    <nav class="case-nav-crumb" aria-label="パンくずリスト">
      <a href="/">🏠 ホーム</a> &gt; <a href="/#craftsmanship">施工事例ギャラリー</a> &gt; <span>{city}・{num}</span>
    </nav>

    <div class="case-tag-list">
      {tags_html}
    </div>

    <h1 class="case-h1">{title}</h1>

    <!-- 建物スペック・性能実測値カード (E-E-A-T根拠提示、床面積非表示、金物工法明記) -->
    <div class="case-spec-card">
      <h2 style="font-size: 1.15rem; font-weight: 900; margin-top: 0; margin-bottom: 1rem; color: #0f172a;">📐 建物概要 ＆ 温熱・耐震スペック</h2>
      <div class="case-spec-grid">
        <div class="spec-item">
          <div class="spec-label">建築地 / 家族構成</div>
          <div class="spec-val">{city} / {family}</div>
        </div>
        <div class="spec-item">
          <div class="spec-label">構造・工法</div>
          <div class="spec-val">{structure}</div>
        </div>
        <div class="spec-item">
          <div class="spec-label">耐震性能</div>
          <div class="spec-val">{seismic}</div>
        </div>
        <div class="spec-item" style="border-left-color: #10b981;">
          <div class="spec-label">気密性能（全棟中間測定）</div>
          <div class="spec-val" style="color: #047857;">{c_val}</div>
        </div>
        <div class="spec-item" style="border-left-color: #10b981;">
          <div class="spec-label">外皮断熱性能</div>
          <div class="spec-val" style="color: #047857;">{ua_val}</div>
        </div>
        <div class="spec-item" style="border-left-color: #f59e0b;">
          <div class="spec-label">光熱費・住み心地効果</div>
          <div class="spec-val" style="color: #b45309; font-size: 0.9rem;">{cost_benefit}</div>
        </div>
      </div>
    </div>

    <!-- お施主様・大工・建築士の3者ストーリー (E-E-A-T) -->
    <div class="case-triad-wrap">
      <div class="triad-box triad-client">
        <h3 class="triad-title" style="color: #b45309;">💡 お施主様の想いと暮らしの実感</h3>
        <p class="triad-text">{client_voice}</p>
      </div>
      <div class="triad-box triad-carpenter">
        <h3 class="triad-title" style="color: #0284c7;">🔨 手刻みができる大工の内部造作・現場施工</h3>
        <p class="triad-text">{carpenter_voice}</p>
      </div>
      <div class="triad-box triad-architect">
        <h3 class="triad-title" style="color: #059669;">📐 建築士の構造・温熱設計</h3>
        <p class="triad-text">{architect_voice}</p>
      </div>
    </div>

    <!-- 施工写真アルバム全集 (静的HTML画像クローラブル) -->
    <div class="photo-album-section">
      <h2 class="photo-album-title">📸 施工写真アルバム（全{photo_count}枚）</h2>
      <div class="photo-grid">
        {photos_html}
      </div>
    </div>

    <!-- その他の施工事例への内部リンク (SEO回遊性向上) -->
    <div class="other-cases-wrap">
      <h3 style="font-size: 1.2rem; font-weight: 800; color: #0f172a; margin-top: 0;">🏡 埼玉県のその他の施工実例</h3>
      <div class="other-cases-grid">
        {other_cases_html}
      </div>
    </div>

    <!-- フッターCTAコンバージョン -->
    <div class="case-footer-cta">
      <h2>あなたの「わがまま」を叶える家づくりを始めませんか？</h2>
      <p>株式会社住ま居るは、埼玉県（鶴ヶ島・川越・日高・ときがわ・行田など）の気候風土を熟知した地元工務店です。強靭な金物工法躯体と手刻み大工の内部造作、許容応力度計算耐震等級3・C値1.0以下保証で、何世代も快適に暮らせる住まいをご提案します。</p>
      <div class="cta-btn-group">
        <a href="/#thermal-consultation" class="cta-btn-white">💬 24h温熱換気AIに相談する</a>
        <a href="/#plan-modeller-studio" class="cta-btn-outline">📐 3D間取りシミュレーターを試す</a>
        <a href="/" class="cta-btn-outline">🏠 トップページへ戻る</a>
      </div>
    </div>
  </div>

  <!-- 統一グローバルSEOフッター（全ページ回遊・施工事例ホバー・スマホ対応） -->
  <footer style="background: #0f172a; color: #94a3b8; padding: 3rem 1.5rem 2rem; margin-top: 4rem; border-top: 1px solid rgba(255,255,255,0.1);">
    <style>
      .footer-nav-link {{ color: #cbd5e1; text-decoration: none; display: inline-block; transition: all 0.25s ease; }}
      .footer-nav-link:hover {{ color: #38bdf8 !important; text-decoration: underline !important; transform: translateX(4px); }}
      .footer-case-link {{ color: #e2e8f0; text-decoration: none; display: block; padding: 4px 8px; border-radius: 6px; transition: all 0.25s ease; background: rgba(255, 255, 255, 0.03); margin-bottom: 4px; border: 1px solid transparent; }}
      .footer-case-link:hover {{ color: #6ee7b7 !important; background: rgba(16, 185, 129, 0.15) !important; border-color: rgba(52, 211, 153, 0.4) !important; transform: translateX(5px); }}
      @media (max-width: 768px) {{
        .footer-case-link {{ padding: 8px 12px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); margin-bottom: 6px; font-weight: 700; display: flex; align-items: center; justify-content: space-between; }}
        .footer-case-link::after {{ content: '➜'; font-size: 0.8rem; color: #34d399; }}
      }}
    </style>
    <div style="max-width: 1200px; margin: 0 auto 2.5rem; text-align: left; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 2rem; border-bottom: 1px solid rgba(255, 255, 255, 0.15); padding-bottom: 2rem;">
      <div>
        <h4 style="color: #38bdf8; font-size: 0.95rem; font-weight: 800; margin-bottom: 0.8rem; letter-spacing: 0.05em;">🏛️ 公式ページ・AIラボ</h4>
        <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.85rem; line-height: 2.1;">
          <li><a href="/" class="footer-nav-link">🏠 公式トップページ</a></li>
          <li><a href="/subsidy/index.html" class="footer-nav-link" style="color: #34d399; font-weight: 700;">💰 AI補助金ナビ（市区町村一括判定） ↗</a></li>
          <li><a href="/mortgage/index.html" class="footer-nav-link" style="color: #38bdf8; font-weight: 700;">🏦 AI住宅ローン診断（金利・団信TOP5） ↗</a></li>
          <li><a href="/smilestudio.html" target="_blank" class="footer-nav-link" style="color: #fbbf24; font-weight: 700;">🎨 AI 3Dパース工房（SmileStudio） ↗</a></li>
          <li><a href="/about/" class="footer-nav-link">🛡️ 会社概要・信用の証明 (CredLayer)</a></li>
          <li><a href="/performance/" class="footer-nav-link">📐 住宅性能数値証明 (HEAT20 G2/G3・耐震3)</a></li>
          <li><a href="/category/spec/" class="footer-nav-link">⚙️ 標準工学仕様スペック詳細 (APW430・W断熱)</a></li>
          <li><a href="/evidence/" class="footer-nav-link">📊 光熱費・温熱実測データ実証録</a></li>
          <li><a href="/flow/" class="footer-nav-link">📐 家づくりの流れ・15万円設計申込特典</a></li>
          <li><a href="/awards/kankyo-housing/" class="footer-nav-link">🏆 埼玉県環境住宅賞 受賞ストーリー</a></li>
          <li><a href="/madori-consultation/" class="footer-nav-link">🤖 夫婦の本音間取り相談・カルテ自動作成</a></li>
        </ul>
      </div>

      <div>
        <h4 style="color: #34d399; font-size: 0.95rem; font-weight: 800; margin-bottom: 0.8rem; letter-spacing: 0.05em;">🏡 埼玉県の注文住宅 施工事例</h4>
        <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.85rem;">
          <li><a href="/cases/case-1.html" class="footer-case-link"><span>【鶴ヶ島市・S様邸】天井高2.8m無垢杉大空間LDK</span></a></li>
          <li><a href="/cases/case-2.html" class="footer-case-link"><span>【ときがわ町・K様邸】吉野杉大黒柱と吹抜けZEH</span></a></li>
          <li><a href="/cases/case-3.html" class="footer-case-link"><span>【川越市・N様邸】中庭プライベートテラス平屋</span></a></li>
          <li><a href="/cases/case-4.html" class="footer-case-link"><span>【坂戸市・M様邸】珪藻土壁とビルトインガレージ</span></a></li>
          <li><a href="/cases/case-5.html" class="footer-case-link"><span>【日高市・T様邸】薪ストーブと土間リビング</span></a></li>
          <li><a href="/cases/case-6.html" class="footer-case-link"><span>【東松山市・H様邸】高天井二世帯・全熱交換換気</span></a></li>
        </ul>
      </div>

      <div>
        <h4 style="color: #fbbf24; font-size: 0.95rem; font-weight: 800; margin-bottom: 0.8rem; letter-spacing: 0.05em;">📚 温熱設計知見200選（実務Q&A）</h4>
        <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.85rem; line-height: 2;">
          <li><a href="/knowledge/thermal/" class="footer-nav-link" style="color: #fbbf24; font-weight: 800;">★ 温熱知見200選 総合ピラーページ</a></li>
          <li><a href="/knowledge/thermal/th_ins_01.html" class="footer-nav-link">第1章: 断熱性能・UA値・外皮設計（25問）</a></li>
          <li><a href="/knowledge/thermal/th_air_01.html" class="footer-nav-link">第2章: 気密性能・C値・隙間対策（25問）</a></li>
          <li><a href="/knowledge/thermal/th_fnd_01.html" class="footer-nav-link">第3章: 基礎断熱・床断熱・床下空間（25問）</a></li>
          <li><a href="/knowledge/thermal/th_vnt_01.html" class="footer-nav-link">第4章: 24h換気・第1種全熱交換（25問）</a></li>
          <li><a href="/knowledge/thermal/th_win_01.html" class="footer-nav-link">第5章: 窓・サッシ・日射取得と遮蔽（25問）</a></li>
          <li><a href="/knowledge/thermal/th_cnd_01.html" class="footer-nav-link">第6章: 結露・カビ防止・壁体内湿気（25問）</a></li>
          <li><a href="/knowledge/thermal/th_hvac_01.html" class="footer-nav-link">第7章: 冷暖房設計・全館空調（25問）</a></li>
          <li><a href="/knowledge/thermal/th_law_01.html" class="footer-nav-link">第8章: 2025年法改正・生涯コスト（25問）</a></li>
        </ul>
      </div>
    </div>

    <p style="text-align: center; font-size: 0.78rem; line-height: 1.7; margin: 0;">© 2026 株式会社住ま居る / スマイチ All Rights Reserved.<br>「芳彩（かぐや）— 結露しない家」 / 埼玉県鶴ヶ島市町屋176番地5<br>手刻み大工×建築士のタッグによるミリ単位自由設計 / 呼吸する珪藻土・無垢材 / HEAT20 G2・G3 / C値1.0以下（実測0.28〜0.6目安） / 耐震等級3 (全棟許容応力度計算)</p>
  </footer>
</body>
</html>"""

def generate_cases():
    urls_generated = []
    
    for c in cases_data:
        cid = c['id']
        file_path = os.path.join(CASES_DIR, f"{cid}.html")
        page_url = f"https://t-smile.co.jp/cases/{cid}.html"
        urls_generated.append(page_url)
        
        # Build tags html
        tags_html = "".join([f'<span class="case-tag-pill">#{t}</span>' for t in c['tags']])
        
        # Build photos html
        photos_html = []
        for i in range(1, c['photo_count'] + 1):
            p_file = f"photo_{i:02d}.jpg"
            p_url = f"{c['photos_dir']}/{p_file}"
            cap = c['captions'][i-1] if i-1 < len(c['captions']) else f"施工写真 {i}"
            photos_html.append(f"""
            <div class="photo-card">
              <img src="{p_url}" alt="{c['title']} - {cap}" loading="lazy" decoding="async" width="800" height="600" />
              <div class="photo-card-caption">{cap}</div>
            </div>
            """)
        photos_html_str = "\n".join(photos_html)
        
        # Build other cases links
        other_cases_html = []
        for oc in cases_data:
            if oc['id'] != cid:
                other_cases_html.append(f"""
                <a href="/cases/{oc['id']}.html" class="other-case-link">
                  ▶ {oc['title']}
                </a>
                """)
        other_cases_html_str = "\n".join(other_cases_html)
        
        # Extract client name
        client_name = "お施主"
        if "・" in c['title'] and "様" in c['title']:
            try:
                client_name = c['title'].split("・")[1].split("様")[0]
            except Exception:
                client_name = "お施主"

        # Description
        desc = (c['title'] + " " + c['client_voice'])[:140] + "..."
        keywords = ", ".join(c['tags'] + ["埼玉県注文住宅", "工務店", "高気密高断熱", "耐震等級3", "金物工法"])
        
        html_out = page_template.format(
            title=c['title'],
            description=desc,
            keywords=keywords,
            og_image=f"{c['photos_dir']}/photo_01.jpg",
            case_id=cid,
            json_title=json.dumps(c['title'], ensure_ascii=False),
            json_desc=json.dumps(desc, ensure_ascii=False),
            json_city=json.dumps(c['city'], ensure_ascii=False),
            client_name=client_name,
            json_client_voice=json.dumps(c['client_voice'], ensure_ascii=False),
            city=c['city'],
            num=c['num'],
            family=c['family'],
            structure=c['structure'],
            seismic=c['seismic'],
            c_val=c['c_val'],
            ua_val=c['ua_val'],
            cost_benefit=c['cost_benefit'],
            tags_html=tags_html,
            client_voice=c['client_voice'],
            carpenter_voice=c['carpenter_voice'],
            architect_voice=c['architect_voice'],
            photo_count=c['photo_count'],
            photos_html=photos_html_str,
            other_cases_html=other_cases_html_str
        )
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(html_out)
        print(f"[SSG] Generated static case study: {file_path}")
        
    return urls_generated

if __name__ == '__main__':
    generate_cases()
