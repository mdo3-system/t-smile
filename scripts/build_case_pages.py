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
        "photo_count": 16,
        "captions": [
            "【LDK全景】天井高2.8mの開放感と無垢杉床の温もりが広がる大空間リビング",
            "【吹き抜け・階段】光が降り注ぐ明るいリビング階段と珪藻土の塗り壁",
            "【キッチン対面】家族の会話が弾む対面オープンキッチンと豊富な造作収納",
            "【和室・畳コーナー】リビングとフラットに繋がるくつろぎの畳スペース",
            "【ダイニング風景】木の温もりに包まれた家族団らんのダイニングエリア",
            "【玄関ホール】大容量のシューズクロークと無垢材の上がり框",
            "【外観ファサード】街並みに調和する端正で飽きのこないモダン外観",
            "【主寝室】自律調湿する自然素材壁に包まれた静かな安らぎの主寝室",
            "【子ども部屋】将来の成長に合わせて間仕切り可能な明るい2階洋室",
            "【サニタリー】広々とした洗面カウンターと室内干しにも配慮した脱衣スペース",
            "【バスルーム】ゆったりと足を伸ばして一日の疲れを癒せる高断熱浴室",
            "【書斎・ワークスペース】テレワークや読書に集中できる造作カウンター",
            "【収納ディテール】大工職人の手で組み上げられた使い勝手抜群のパントリー",
            "【ウッドデッキ・庭】リビングからフラットに外へ繋がる庭先のアウトドアリビング",
            "【夕景・照明計画】優しい間接照明が珪藻土の陰影を美しく照らし出す夜景",
            "【お引渡し記念】「きょうだい全員が選んだ」信頼の住まいで始まる新しい暮らし"
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
        "photo_count": 16,
        "captions": [
            "【吉野杉大黒柱とLDK】堂々たる大黒柱と山並みを望むパッシブ吹き抜けリビング",
            "【薪ストーブ＆土間】冬の団らんを暖かく包み込む本物の薪ストーブコーナー",
            "【大パノラマ吹抜け】豊かな自然光と四季折々の借景を取り込む特大開口",
            "【造作キッチン】無垢材の質感を活かした使い勝手の良いオープンキッチン",
            "【2階ホール・手すり】職人の手鉋仕上げが心地よい吉野杉の手すりとキャットウォーク",
            "【ロフト・置物屋】勾配天井を活かした秘密基地のような小屋裏スペース",
            "【外観自然共生】ときがわの緑に美しく溶け込む深い軒と大屋根フォルム",
            "【十和田石風バス】毎日のバスタイムが温泉宿気分になる癒しの浴室空間",
            "【玄関アプローチ】木の格子とカバードポーチが家族と来客を温かく迎える玄関",
            "【洗面化粧台】モザイクタイルと無垢カウンターが調和した大工造作洗面台",
            "【和の趣】天然い草の香りが心地よい落ち着きのある和の客間",
            "【木組みの構造美】大工の現場施工技術が光る力強い化粧梁の架構美",
            "【パッシブ設計窓】冬の日射をたっぷり取り入れ、夏の熱を遮る庇のディテール",
            "【太陽光発電】年間エネルギー収支ゼロを達成する屋根一体型ソーラー設計",
            "【庭園・テラス】山の澄んだ空気を感じながら外気浴を楽しめるウッドデッキ",
            "【夕暮れの情景】薪のパチパチとはぜる音と炎の揺らめきが彩る極上の夜"
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
        "photo_count": 16,
        "captions": [
            "【回遊アイランドキッチン】「3年暮らしても不満ゼロ！」家中をぐるぐる回れる神動線LDK",
            "【無垢杉のフロア】一年中素足で気持ちよく過ごせる高気密高断熱のフロア",
            "【リビングダイニング】開放感と家族の気配を感じられる一体型レイアウト",
            "【キッチン背面収納】生活感をすっきり隠せる大工特注の大型カップボード",
            "【ゆったりバスルーム】一日の家事と仕事の疲れをじっくり癒す広々システムバス",
            "【家事ラクランドリー】洗う・干す・畳む・しまうが一箇所で完結する専用動線",
            "【玄関シューズクローク】ベビーカーやアウトドア用品もすっぽり収まる土間収納",
            "【外観モダンデザイン】ホワイト×ウッドのコントラストが爽やかな外観スタイル",
            "【階段下スペース】空間を無駄なく活用した収納＆ルンバ基地",
            "【2階洋室】日当たりの良い南向きの居室と機能的なウォークインクローゼット",
            "【スタディコーナー】料理をしながら子どもの学習を見守れるワークカウンター",
            "【トイレ手洗い造作】コンパクトながら上質なタイルと無垢材で仕立てた手洗い器",
            "【高断熱樹脂サッシ】冬でも結露ゼロ・外の騒音を遮断する高性能複層ガラス",
            "【玄関ポーチ】雨の日でも鍵を開けやすく濡れない深いキャノピー",
            "【室内通風計画】埼玉の季節風を計算した心地よい風の通り道",
            "【暮らしの風景】建売住宅から住み替えて実感した「本物の高気密高断熱」の快適さ"
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
        "photo_count": 16,
        "captions": [
            "【省エネ大空間LDK】「冬の光熱費が月5万から1万台に激減！」家中ぽかぽかの快適リビング",
            "【自然素材珪藻土壁】空気を清浄に保ち、湿度を自律コントロールする職人手塗り壁",
            "【明るいダイニング】庭の緑を絵画のように切り取るピクチャーウィンドウ",
            "【機能美キッチン】無駄な動線を省き、家族で料理を楽しめるワイドキッチン",
            "【小上がり和室】下部引き出し収納を備えた多目的な和のスペース",
            "【玄関ホール】清々しい木の香りが漂う広々とした玄関エントランス",
            "【外観シンプルモダン】日高の気候風土に合わせた耐久性の高い外装デザイン",
            "【主寝室】温度ムラがなく朝までぐっすり熟睡できる超高断熱ベッドルーム",
            "【子ども部屋】無垢床が心地よく、アレルギーの心配がないクリーンな居室",
            "【洗面脱衣室】冬のヒートショックを完全に防ぐ家中均一温度設計",
            "【浴室】浴槽のお湯が冷めにくい高断熱浴槽と浴室暖房設計",
            "【造作TVボード】壁面と一体化させた無垢材のフロートテレビボード",
            "【気密施工の証】隙間なきプロの現場施工でC値1.0以下保証をクリア",
            "【軒天・庇の陰影】夏の強い直射日光を遮り、冷房負荷を劇的に下げるパッシブ庇",
            "【夜の温もり】家中どこにいても寒さを感じない理想の住み心地",
            "【光熱費激減の実証】電気代高騰の時代に家計を力強く支える省エネ健康住宅"
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
        "photo_count": 16,
        "captions": [
            "【30帖大LDK×白タイル】圧倒的開放感とリゾート感が漂うホワイトモダンリビング",
            "【ピットリビング（一段下がり）】籠もり感と広がりを同時に味わえる贅沢なステップダウン",
            "【吹き抜け・間接照明】夜になるとホテルのような優雅な陰影を放つ吹き抜け天井",
            "【アイランドキッチン】大空間の主役となる洗練されたハイグレードキッチン",
            "【オープン階段】視線が奥まで抜ける軽やかなスチール×無垢踏板のシースルー階段",
            "【ラグジュアリーサニタリー】海外ホテルのような洗練されたワイドミラーと洗面空間",
            "【外観キュービックモダン】スクエアな立体造形が美しい川越のランドマーク邸宅",
            "【エントランス】プライバシーを守りつつ大開口で光を招き入れる玄関",
            "【2階ホール】吹き抜けを通じて1階と緩やかにつながる開放的なセカンドスペース",
            "【主寝室】間接照明と上質なファブリックが調和したホテルのようなマスターベッドルーム",
            "【ウォークインクローゼット】ブティックのように洋服が並ぶ大容量ワードローブ",
            "【タイル床と温熱設計】エアコンの暖気が蓄熱され、冬でも底冷えしない床断熱工法",
            "【大開口サッシ】30帖の空間に光を注ぎ込む超大型トリプルガラス開口",
            "【中庭・パティオ】外からの視線を遮りながら青空を切り取るプライベートコート",
            "【夜景ライティング】リゾートホテルのように幻想的な光に包まれるLDK全景",
            "【理想の実現】「私のわがままを全て叶えた」妥協のないラグジュアリー住宅"
        ]
    },
    {
        "id": "case-6",
        "num": "06",
        "title": "【行田市・H様邸】寒がりの妻が「暖かすぎる」と太鼓判！大手メーカー比較で選んだ本物の高気密高断熱",
        "city": "行田市",
        "family": "ご夫婦＋お子様2人",
        "structure": "木造軸組 金物工法（耐震等級3・通気工法）",
        "seismic": "耐震等級3（許容応力度計算）",
        "c_val": "C値1.0以下保証（実測0.28〜0.6目安）",
        "ua_val": "UA値 0.40 W/m²K (HEAT20 G2)",
        "cost_benefit": "大手メーカーと同等以上の性能を工務店適正価格で実現、光熱費半減",
        "tags": ["埼玉県行田市", "建て替え", "暖かさ太鼓判", "高気密高断熱", "光熱費半減", "大手ハウスメーカー比較", "C値1.0以下保証", "実測0.28〜0.6目安"],
        "client_voice": "「両親が建ててくれた思い出の家を建て替えるにあたり、何より極度の寒がりである妻が『心から暖かいと思える家』にしたいと考えました。高気密高断熱を謳う大手ハウスメーカーも何社か見学しましたが、見積もりがあまりにも高額でため息ばかり…。そんな時に地元の住ま居るさんを知り、適正な価格で本物の高性能住宅を提案してくれました。完成した家に住んでみると、妻が『暖かすぎるくらい！』と大喜び。光熱費も前の家の半分以下になり、建て替えて本当に良かったです。」",
        "carpenter_voice": "「構造躯体は金物工法で高い耐震性を確保。日当たりと風の通り道を考慮しながら、室内の無垢ドアや造作カウンターも、手刻みができる大工が木癖を見極めて一つ一つ丁寧に仕上げました。」",
        "architect_voice": "「大手ハウスメーカーと同等以上の断熱スペック（C値1.0以下保証・実測0.28〜0.6目安、付加断熱仕様）を、中間マージンをカットした工務店ならではの適正価格で実現。許容応力度計算耐震等級3と長寿命な通気構造で、次世代まで安心して住み継げる住宅を設計しました。」",
        "photos_dir": "/images/cases_real/case6",
        "photo_count": 10,
        "captions": [
            "【高気密高断熱LDK】寒がりの奥様も「暖かすぎる」と太鼓判！建て替えで叶えた本物の温もり",
            "【木の温もりあふれる居間】両親の家の面影を継承しつつ現代の最高性能へ生まれ変わった室内",
            "【明るい対面キッチン】家族の様子を見守りながら快適に料理ができるスペース",
            "【続き間の和室】冠婚葬祭や来客にも柔軟に対応できる本格和室",
            "【ゆったり玄関】段差を抑え、将来のバリアフリーにも配慮した玄関ホール",
            "【外観和モダン】思い出の敷地に堂々と建つ、耐久性と美しさを兼ね備えた外観",
            "【水回り動線】家事の移動距離を最短にする機能的なランドリー＆サニタリー",
            "【断熱施工のこだわり】大手ハウスメーカー以上の断熱仕様を工務店適正価格で実現",
            "【光熱費半減のデータ】前の家と比べて電気・ガス代が半減したエコな暮らし",
            "【入居後の笑顔】「寒さのストレスから完全に解放された」喜びの実感"
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
        "telephone": "049-282-3580",
        "priceRange": "￥￥￥",
        "address": {{
          "@type": "PostalAddress",
          "streetAddress": "鶴ヶ島市富士見2-18-28",
          "addressLocality": "鶴ヶ島市",
          "addressRegion": "埼玉県",
          "postalCode": "350-2201",
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
              <img src="{p_url}" alt="{c['title']} - {cap}" loading="lazy" />
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
