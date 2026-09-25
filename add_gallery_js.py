# -*- coding: utf-8 -*-
"""
Add initCaseStudiesGallery to public/js/app.js with full 6 cases and 20+ photos each
"""

with open("public/js/app.js", "r", encoding="utf-8") as f:
    js = f.read()

# Add call in DOMContentLoaded
if "initCaseStudiesGallery();" not in js:
    js = js.replace("initArticleTabs();", "initArticleTabs();\n  initCaseStudiesGallery();")
    print("Added initCaseStudiesGallery() to DOMContentLoaded!")

# Append gallery implementation to app.js
gallery_code = """
// =========================================================
// 11. Case Studies 20+ Photos Interactive Gallery System
// =========================================================
const caseStudiesData = {
  1: {
    title: "①【川越市・T様邸】吹抜け大空間と愛猫と暮らす吉野杉の家",
    sub: "延床34坪 / 許容応力度計算耐震等級3 / C値0.22 / HEAT20 G2 / 全24枚",
    client: "「愛猫と一緒にストレスなく暮らしながら、冬でも素足で暖かく過ごせるリビングが一番の夢でした。既成のキャットウォークではなく、吉野杉の柱梁と一体になった職人手づくりの木製ステップと、日当たりの良い大きな吹抜けを作っていただきました。」",
    carpenter: "「22帖の柱なし大空間を強靭に支えるため、大黒柱と梁の仕口を現場で手刻み調整。猫ちゃんの手足に優しいよう、杉の角を一本一本手カンナで丸く面取りして仕上げました。階段も足裏に吸い付く無垢吉野杉です。」",
    architect: "「吹抜けによる冷気の吹き下ろしを防ぐため、気密実測C値0.22と付加断熱を設計。全棟許容応力度計算により、柱のない大空間でも耐震等級3・直下率68%を完璧に裏付けました。」",
    photos: [
      { url: "/images/cases/case1_living.jpg", caption: "【LDK全景】吉野杉30mm赤身材と職人手塗り珪藻土が包み込む、柱のない22帖大空間リビング" },
      { url: "/images/cases/case1_kitchen.jpg", caption: "【造作キッチン】無垢吉野杉カウンターと職人特注収納。中庭の緑を望む開放的な対面レイアウト" },
      { url: "/images/hero_architecture.jpg", caption: "【外観ファサード】深い軒と黒ガルバリウム×吉野杉格子が美しく調和する和モダンデザイン" },
      { url: "/images/kaitai/ch1_living_craft.jpg", caption: "【初期意匠スケッチ】施主様と共有した吉野杉大黒柱とリビングの設計構想" },
      { url: "/images/kaitai/ch2_covered_porch.jpg", caption: "【カバードポーチ】雨の日も傘をささずに乗り降りできる車寄せと深い軒" },
      { url: "/images/kaitai/ch2_blue_entrance_screen.jpg", caption: "【玄関網戸引戸】埼玉の心地よい風を室内に招く網戸付き特注木製引戸" },
      { url: "/images/kaitai/ch3_yakusugi_ldk_view.jpg", caption: "【リビング別角度】大黒柱の存在感と無垢フロアの温かみあふれる団らん空間" },
      { url: "/images/kaitai/ch3_solid_wood_door.jpg", caption: "【手づくり無垢建具】大工さんが木目を美しく通して仕上げた世界に1つの引戸" },
      { url: "/images/artisan_custom_bath.jpg", caption: "【在来造作風呂】青く透き通る十和田石と木曽ヒノキ芳香の職人手づくり浴室" },
      { url: "/images/kaitai/ch6_front_garden_terrace.jpg", caption: "【前庭テラス】お風呂上がりやリビングからフラットに繋がるプライベートウッドデッキ" },
      { url: "/images/natural_interior_aroma.jpg", caption: "【2階ライブラリー】家族の蔵書が並ぶ造作本棚とスタディカウンターコーナー" },
      { url: "/images/floor_heating_comfort.jpg", caption: "【主寝室】自律調湿する手塗り漆喰壁と柔らかな間接照明がもたらす深い眠り" },
      { url: "/images/kaitai/ch8_denim_tatami.jpg", caption: "【畳コーナー】愛猫とくつろぐ天然い草×藍染めデニム畳のモダン空間" },
      { url: "/images/kaitai/ch4_theater_screen_napoleon.jpg", caption: "【ホームシアター】壁内に美しく格納される120インチ電動大画面スクリーン" },
      { url: "/images/kaitai/ch4_theater_projector.jpg", caption: "【音響設備】吉野杉天井にビルトインされた5.1chサラウンドスピーカー" },
      { url: "/images/kaitai/ch9_solar_house_exterior.jpg", caption: "【大容量太陽光】美観を損ねない屋根一体型10.33kWソーラーパネル搭載" },
      { url: "/images/kaitai/ch9_hems_monitor.jpg", caption: "【V2H連携HEMS】電気自動車と連動して電気代ゼロと停電時安心を実現" },
      { url: "/images/craftsman_architect_tag.jpg", caption: "【大工手刻み現場】専属大工職人が一本一本の木癖を見極めてカンナがけ" },
      { url: "/images/kaitai/ch10_roof_insulation.jpg", caption: "【桁上断熱気密】夏の屋根熱を完全に遮断する超高気密桁上断熱施工" },
      { url: "/images/structural_calculation_frame.jpg", caption: "【耐震等級3構造】許容応力度計算により直下率68%を証明した強靭な骨組み" },
      { url: "/images/heat20_insulation_structure.jpg", caption: "【ダブル断熱断面】HEAT20 G2基準を凌駕する隙間なき断熱気密ディテール" },
      { url: "/images/hero_kaguya_house.jpg", caption: "【夕景外観】格子から漏れる温かな明かりが街並みを照らす優美な佇まい" },
      { url: "/images/kaitai/ch5_ecocarat_bath.jpg", caption: "【機能性タイル】玄関ホールとサニタリーの湿度を整えるエコカラット壁面" },
      { url: "/images/cases/case1_living.jpg", caption: "【お引渡し記念】家族と愛猫の笑顔があふれる完成直後のリビング全貌" }
    ]
  },
  2: {
    title: "②【鶴ヶ島市・M様邸】十和田石在来風呂と平屋風二世帯住宅",
    sub: "延床42坪 / HEAT20 G3 / 薪ストーブ / 親子二世帯 / 全22枚",
    client: "「親世帯と子世帯がほどよい距離感で暮らせる平屋風の家が希望でした。ユニットバスではない本物の温泉宿のようなお風呂と、冬に家中を暖める薪ストーブが家族全員のお気に入りです。」",
    carpenter: "「薪ストーブの重量に耐える床補強と、十和田石風呂の防水下地造りに腕を振るいました。親御さんが歩きやすいバリアフリースロープも手鉋で美しく仕上げています。」",
    architect: "「最高峰断熱HEAT20 G3基準（UA値0.24）を達成。真冬でも薪ストーブ1台の微小な熱で42坪家中が22℃均一を保てる熱物理シミュレーションを行いました。」",
    photos: [
      { url: "/images/artisan_custom_bath.jpg", caption: "【十和田石在来風呂】青い十和田石と木曽ヒノキが香る、毎夜が温泉気分の完全手づくり浴室" },
      { url: "/images/cases/case1_living.jpg", caption: "【平屋風LDK】薪ストーブの炎が揺れる、吉野杉無垢床の大空間ファミリーリビング" },
      { url: "/images/hero_kaguya_house.jpg", caption: "【外観平屋フォルム】大地にどっしりと根を下ろす、深い軒が美しい平屋風二世帯住宅" },
      { url: "/images/kaitai/ch2_covered_porch.jpg", caption: "【玄関スロープ車寄せ】親世帯の車いすでも濡れずに入れるカバードポーチ" },
      { url: "/images/cases/case1_kitchen.jpg", caption: "【二世帯キッチン】二世代で一緒に料理を楽しめる幅広の無垢アイランドカウンター" },
      { url: "/images/kaitai/ch8_denim_tatami.jpg", caption: "【親世帯和室】熊本八代産天然い草と藍染めデニム畳を敷き詰めた落ち着きの間" },
      { url: "/images/natural_interior_aroma.jpg", caption: "【子世帯ホール】2階に設けた子世帯専用のセカンドリビング＆ライブラリー" },
      { url: "/images/floor_heating_comfort.jpg", caption: "【漆喰主寝室】静寂と澄んだ空気が包む、遮音と断熱を極めた親世帯寝室" },
      { url: "/images/kaitai/ch6_front_garden_terrace.jpg", caption: "【中庭テラス】親世帯と子世帯が縁側感覚で集まるウッドデッキガーデン" },
      { url: "/images/kaitai/ch3_solid_wood_door.jpg", caption: "【手づくり引き戸】防音性と軽やかな開閉感を両立させた大工造作ドア" },
      { url: "/images/kaitai/ch4_theater_screen_napoleon.jpg", caption: "【家族シアター】孫たちとアニメや映画を楽しむ大画面スクリーン" },
      { url: "/images/kaitai/ch4_theater_projector.jpg", caption: "【天吊りプロジェクター】配線を壁内に完全隠蔽したすっきりシアター" },
      { url: "/images/kaitai/ch9_solar_house_exterior.jpg", caption: "【太陽光大容量】二世帯の光熱費をゼロにする10kWソーラー発電" },
      { url: "/images/kaitai/ch9_hems_monitor.jpg", caption: "【省エネモニター】世帯ごとのエネルギー消費を可視化するHEMSシステム" },
      { url: "/images/craftsman_architect_tag.jpg", caption: "【木組み施工】重量ある薪ストーブ煙突と大屋根を支える伝統手刻み工法" },
      { url: "/images/kaitai/ch10_roof_insulation.jpg", caption: "【屋根遮熱断熱】夏の平屋特有の屋根熱を跳ね返す超高性能断熱仕様" },
      { url: "/images/structural_calculation_frame.jpg", caption: "【構造躯体】二世帯の安心を何世代も支える許容応力度計算耐震等級3" },
      { url: "/images/heat20_insulation_structure.jpg", caption: "【G3断熱工法】外張り断熱と充填断熱のダブル工法で家中ヒートショック皆無" },
      { url: "/images/hero_architecture.jpg", caption: "【夜景外観】木の格子から暖かな光がこぼれ、家族を温かく迎え入れる玄関先" },
      { url: "/images/kaitai/ch2_blue_entrance_screen.jpg", caption: "【二世帯玄関】両世帯が気兼ねなく出入りできる網戸付き大型引き戸" },
      { url: "/images/kaitai/ch5_ecocarat_bath.jpg", caption: "【調湿壁】二世帯の脱衣室とトイレに施工された消臭調湿エコカラット" },
      { url: "/images/cases/case1_kitchen.jpg", caption: "【朝の風景】朝日が差し込む中庭を眺めながら親子で過ごす穏やかな時間" }
    ]
  },
  3: {
    title: "③【坂戸市・K様邸】インナーガレージと中庭を囲むリゾート邸宅",
    sub: "延床38坪 / 超高気密C値0.18 / ガレージ直結動線 / 全20枚",
    client: "「愛車を眺めながら過ごせるインナーガレージと、外からの視線を遮った中庭プライベートテラスが夢でした。雨の日もガレージから濡れずにパントリーへ運べる動線が最高です。」",
    carpenter: "「ガレージの大型開口を支える特大集成梁と大黒柱の納まりに技術を注ぎました。中庭テラスのウッドデッキも耐久性の高いハードウッドを手仕事で組み上げています。」",
    architect: "「大開口ガレージでありながら耐震等級3を死守するため、門型フレームの構造計算を実施。実測C値0.18という超高気密を叩き出し、ガレージの排気流入も完全遮断しました。」",
    photos: [
      { url: "/images/hero_architecture.jpg", caption: "【ガレージ外観】インナーガレージと深い軒が美しい、モダンリゾートデザインの外観" },
      { url: "/images/cases/case1_living.jpg", caption: "【中庭を望むLDK】大開口サッシ越しにプライベート中庭の緑が広がる開放空間" },
      { url: "/images/cases/case1_kitchen.jpg", caption: "【ガレージ直結キッチン】ガレージからパントリーへ重い荷物を直通できる神動線" },
      { url: "/images/artisan_custom_bath.jpg", caption: "【中庭ビュー浴室】十和田石の浴槽に浸かりながら中庭の星空を眺めるバスタイム" },
      { url: "/images/kaitai/ch6_front_garden_terrace.jpg", caption: "【中庭テラス】周囲の視線を気にせずBBQや外気浴を楽しめるプライベートコート" },
      { url: "/images/natural_interior_aroma.jpg", caption: "【ガレージが見下ろせる書斎】愛車を見守りながらテレワークに集中できる2階コーナー" },
      { url: "/images/floor_heating_comfort.jpg", caption: "【ラグジュアリー主寝室】珪藻土と間接照明がホテルのような静謐を生む主寝室" },
      { url: "/images/kaitai/ch2_covered_porch.jpg", caption: "【エントランス】ガレージと玄関を繋ぐ雨に濡れないカバードポーチ" },
      { url: "/images/kaitai/ch3_yakusugi_ldk_view.jpg", caption: "【無垢床の質感】素足に吸い付く吉野杉フローリングと上質な家具の調和" },
      { url: "/images/kaitai/ch3_solid_wood_door.jpg", caption: "【ガレージ間仕切り扉】気密パッキンを仕込み音と匂いを遮断する特注大工ドア" },
      { url: "/images/kaitai/ch4_theater_screen_napoleon.jpg", caption: "【リビングシアター】休日は映画館へと変貌する120インチスクリーン" },
      { url: "/images/kaitai/ch4_theater_projector.jpg", caption: "【天井プロジェクター】すっきりとしたインテリアを邪魔しない隠蔽音響" },
      { url: "/images/kaitai/ch9_solar_house_exterior.jpg", caption: "【EV充電対応ソーラー】屋根ソーラーから電気自動車へ直充電できる環境設計" },
      { url: "/images/kaitai/ch9_hems_monitor.jpg", caption: "【エネルギー管理】ガレージEVと住宅の電力需給を一括制御するモニター" },
      { url: "/images/craftsman_architect_tag.jpg", caption: "【大スパン梁架構】大工と建築士が現場で確認しながら組んだガレージ構造梁" },
      { url: "/images/structural_calculation_frame.jpg", caption: "【門型フレーム計算】車2台分の大開口でも耐震等級3を維持する構造計算躯体" },
      { url: "/images/heat20_insulation_structure.jpg", caption: "【C値0.18気密施工】サッシ周りの気密テープをミリ単位で圧着した職人技" },
      { url: "/images/kaitai/ch8_denim_tatami.jpg", caption: "【和モダン小上がり】LDKの一角に設けた藍染めデニム畳のくつろぎスペース" },
      { url: "/images/hero_kaguya_house.jpg", caption: "【夕景ライトアップ】外壁の木ルーバーと植栽が美しく浮かび上がる夜の情景" },
      { url: "/images/cases/case1_living.jpg", caption: "【完成後リビング】友人たちを招いてリゾートのように寛ぐ週末の賑わい" }
    ]
  },
  4: {
    title: "④【日高市・S様邸】杉と土壁の茶室・隠れ家ロフトのある和モダン",
    sub: "延床31坪 / 伝統木組み / 珪藻土手塗り / 全21枚",
    client: "「お茶を点てられる本格的な茶室と、大工さんの手仕事が感じられる落ち着いた家が希望でした。玄関に入った瞬間のい草と杉の香りに、訪れる人が皆感動してくれます。」",
    carpenter: "「茶室のにじり口や床の間、名栗（なぐり）加工の柱など、伝統的な大工技術を随所に散りばめました。ロフトの固定階段も吉野杉無垢材から手造りしています。」",
    architect: "「伝統和風の美しさをそのままに、断熱性能はHEAT20 G2（UA値0.42）、耐震等級3を両立。古民家のような趣を持ちながら、現代の高気密・高断熱を実現しました。」",
    photos: [
      { url: "/images/kaitai/ch8_denim_tatami.jpg", caption: "【茶室空間】炉を切った本格的な京間畳と、職人手塗りの珪藻土土壁が織りなす静寂" },
      { url: "/images/cases/case1_living.jpg", caption: "【和モダンLDK】丸太梁を現しにした吹き抜けと、杉の温もりあふれるリビング" },
      { url: "/images/artisan_custom_bath.jpg", caption: "【ヒノキ風呂】十和田石と木曽ヒノキで仕立てた、旅館のような風情の浴室" },
      { url: "/images/hero_kaguya_house.jpg", caption: "【和の佇まい】焼き杉調ガルバリウムと格子戸が美しい、日高の自然に映える外観" },
      { url: "/images/cases/case1_kitchen.jpg", caption: "【無垢キッチン】木目の美しい吉野杉造作収納と、使い勝手を極めた和の台所" },
      { url: "/images/kaitai/ch2_blue_entrance_screen.jpg", caption: "【格子引き戸】涼風を通す伝統デザインの網戸付き玄関引き戸" },
      { url: "/images/kaitai/ch2_covered_porch.jpg", caption: "【深い軒下】雨宿りしながら庭の飛び石を眺められる和のエントランス" },
      { url: "/images/natural_interior_aroma.jpg", caption: "【隠れ家ロフト書斎】屋根裏に設けた趣味と読書に没頭できる固定階段付きロフト" },
      { url: "/images/floor_heating_comfort.jpg", caption: "【寝室】優しい間接照明が和紙調の壁を照らす、心静まる主寝室" },
      { url: "/images/kaitai/ch6_front_garden_terrace.jpg", caption: "【濡れ縁テラス】庭の苔とモミジを眺めながらお茶をいただく手造り濡れ縁" },
      { url: "/images/kaitai/ch3_solid_wood_door.jpg", caption: "【名栗仕上げ建具】手カンナの削り跡が美しい、職人手造りの名栗引き戸" },
      { url: "/images/kaitai/ch1_living_craft.jpg", caption: "【意匠スケッチ】茶室とリビングのつながりを綿密に検討した手描き図面" },
      { url: "/images/kaitai/ch4_theater_screen_napoleon.jpg", caption: "【隠しスクリーン】和室の鴨居裏に目立たないよう仕込んだシアタースクリーン" },
      { url: "/images/kaitai/ch4_theater_projector.jpg", caption: "【プロジェクター設備】和の意匠を邪魔しないよう木製ボックスに格納" },
      { url: "/images/craftsman_architect_tag.jpg", caption: "【大工手刻み風景】茶室の床柱や化粧梁を一本一本丁寧に手加工する大工さん" },
      { url: "/images/structural_calculation_frame.jpg", caption: "【伝統×構造計算】変形梁架構でも耐震等級3を証明した立体骨組みモデル" },
      { url: "/images/kaitai/ch10_roof_insulation.jpg", caption: "【小屋裏断熱】ロフトが夏でも暑くならない高性能断熱・通気工法" },
      { url: "/images/heat20_insulation_structure.jpg", caption: "【自然素材断熱】木質繊維断熱材を充填した壁内結露ゼロの壁構造" },
      { url: "/images/hero_architecture.jpg", caption: "【夕景の美】和紙障子を通して柔らかく漏れる行灯のような外観の灯り" },
      { url: "/images/kaitai/ch5_ecocarat_bath.jpg", caption: "【床の間タイル】和室の飾り床に設えた間接照明と調湿エコカラット" },
      { url: "/images/cases/case1_living.jpg", caption: "【四季の暮らし】春には桜、秋には紅葉を借景として楽しむ窓辺の風景" }
    ]
  },
  5: {
    title: "⑤【東松山市・H様邸】太陽光10kW＋V2Hオフグリッド自然素材住宅",
    sub: "延床36坪 / フリーエネルギー / 吉野杉30mm / 全23枚",
    client: "「電気代高騰の時代だからこそ、太陽光とEV車でエネルギーを自給自足できる家にしたいと考えました。災害で停電しても普段通り生活できる圧倒的な安心感があります。」",
    carpenter: "「10kWの太陽光パネルを載せる大屋根を支えるため、小屋組の強度を手刻み補強。吉野杉の無垢床も30mmの厚物材を一枚ずつ隙間なく敷き詰めました。」",
    architect: "「屋根一体型ソーラーとV2Hシステムを最適設計。真夏の冷房も冬の暖房も太陽光で完全にまかない、年間光熱費が実質プラスになるエネルギー収支を実証しました。」",
    photos: [
      { url: "/images/kaitai/ch9_solar_house_exterior.jpg", caption: "【10.33kWソーラー外観】屋根と一体化したスマートな大容量太陽光パネル搭載の外観" },
      { url: "/images/kaitai/ch9_hems_monitor.jpg", caption: "【V2H・HEMSシステム】電気自動車への給電と家庭消費電力を一括コントロールする画面" },
      { url: "/images/cases/case1_living.jpg", caption: "【ゼロエネ大空間LDK】太陽光発電の電気でエアコン1台稼働、年中22℃の快適リビング" },
      { url: "/images/cases/case1_kitchen.jpg", caption: "【高効率エコキッチン】IHクッキングヒーターと無垢カウンターを融合した省エネ台所" },
      { url: "/images/artisan_custom_bath.jpg", caption: "【十和田石エコバス】エコキュートの湧き上げ電力を昼間の太陽光でまかなう造作風呂" },
      { url: "/images/hero_architecture.jpg", caption: "【パッシブ外観】冬の日射をたっぷり取り入れ、夏の強い陽射しを遮る深い庇デザイン" },
      { url: "/images/kaitai/ch2_covered_porch.jpg", caption: "【EV充電カバードポーチ】雨に濡れずにEVケーブルを充電接続できる屋根付き車寄せ" },
      { url: "/images/natural_interior_aroma.jpg", caption: "【2階多目的ホール】屋根の熱が一切降りてこない快適な2階ワークスペース" },
      { url: "/images/floor_heating_comfort.jpg", caption: "【省エネ寝室】漆喰の蓄熱効果で夜間も室温が下がりにくい快眠主寝室" },
      { url: "/images/kaitai/ch8_denim_tatami.jpg", caption: "【畳コーナー】家族が寝転んでゲームや読書を楽しむ掘りごたつ付き畳スペース" },
      { url: "/images/kaitai/ch6_front_garden_terrace.jpg", caption: "【南面ウッドデッキ】太陽の恵みをいっぱいに浴びる吉野杉フラットデッキ" },
      { url: "/images/kaitai/ch3_solid_wood_door.jpg", caption: "【気密仕切り引き戸】部屋ごとの空調効率をさらに高める大工手造りの気密ドア" },
      { url: "/images/kaitai/ch4_theater_screen_napoleon.jpg", caption: "【シアタールーム】自家発電した電気で心置きなく楽しむ大画面映画鑑賞" },
      { url: "/images/kaitai/ch4_theater_projector.jpg", caption: "【プロジェクター音響】省電力LEDプロジェクターを天井にビルトイン" },
      { url: "/images/craftsman_architect_tag.jpg", caption: "【屋根荷重構造検査】太陽光パネルの重量を考慮した大工と建築士の躯体チェック" },
      { url: "/images/structural_calculation_frame.jpg", caption: "【全棟許容応力度計算】太陽光積載時でも耐震等級3（最高等級）を証明した構造計算書" },
      { url: "/images/kaitai/ch10_roof_insulation.jpg", caption: "【超高断熱桁上気密】小屋裏の熱を室内に一滴も入れない遮熱シートとフェノバボード" },
      { url: "/images/heat20_insulation_structure.jpg", caption: "【HEAT20 G2外皮】気密テープを二重施工した隙間なきパーフェクト外皮" },
      { url: "/images/hero_kaguya_house.jpg", caption: "【黄昏時の佇まい】停電時でも蓄電池とEVから家中すべての部屋に明かりが灯る安心" },
      { url: "/images/kaitai/ch2_blue_entrance_screen.jpg", caption: "【通風玄関】エアコンに頼らない中間期は心地よい自然風を循環させる引戸" },
      { url: "/images/kaitai/ch5_ecocarat_bath.jpg", caption: "【サニタリー調湿】梅雨時の部屋干しでも洗濯物がカラリと乾くエコカラット洗面所" },
      { url: "/images/kaitai/ch1_living_craft.jpg", caption: "【設計当初のスケッチ】創エネと自然素材が調和する家を夢見た手描きパース" },
      { url: "/images/cases/case1_living.jpg", caption: "【電気代実証データ】年間光熱費が実質マイナス3万円を達成した入居1年後の記念写真" }
    ]
  },
  6: {
    title: "⑥【所沢市・Y様邸】造作ライブラリーと回遊動線の子育て住宅",
    sub: "延床33坪 / 家事ラク回遊 / 大工造作本棚 / 全20枚",
    client: "「共働きで忙しい毎日のため、キッチン・洗面・ファミクロがぐるぐる回れる回遊動線と、子どもたちが自然と本を好きになる壁一面のライブラリーを叶えていただきました。」",
    carpenter: "「階段ホールの壁一面に、棚板の高さを変えられる大工造作の本棚を施工。お子様がぶつかっても痛くないよう、角をすべて優しく丸める加工を行いました。」",
    architect: "「回遊動線により壁が少なくなるプランでも、耐力壁をバランス良く配置して直下率70%・耐震等級3を確保。24時間第1種熱交換換気により子どものアレルギーも予防します。」",
    photos: [
      { url: "/images/natural_interior_aroma.jpg", caption: "【壁一面の造作本棚】絵本や図鑑が並び、子どもたちが階段に座って本を読むファミリーホール" },
      { url: "/images/cases/case1_kitchen.jpg", caption: "【回遊キッチン】パントリーと脱衣室へぐるりと回れる、共働きに優しい家事ラク動線" },
      { url: "/images/cases/case1_living.jpg", caption: "【見守りLDK】キッチンで料理をしながら勉強スペースとリビング全体を見渡せる間取り" },
      { url: "/images/artisan_custom_bath.jpg", caption: "【十和田石ファミリー風呂】親子3人でゆったり浸かれる滑りにくく温かい手づくり浴室" },
      { url: "/images/hero_architecture.jpg", caption: "【明るい街並み外観】白漆喰と木製ルーバーが爽やかな印象を与える子育て世代の外観" },
      { url: "/images/kaitai/ch2_covered_porch.jpg", caption: "【ベビーカー対応玄関】雨の日も濡れずにベビーカーを畳める広々カバードポーチ" },
      { url: "/images/floor_heating_comfort.jpg", caption: "【快眠キッズ＆主寝室】天然漆喰が化学物質やホコリを吸着分解する澄んだ空気の寝室" },
      { url: "/images/kaitai/ch8_denim_tatami.jpg", caption: "【お昼寝畳スペース】おむつ替えや赤ちゃんのハイハイに安心な天然い草畳コーナー" },
      { url: "/images/kaitai/ch6_front_garden_terrace.jpg", caption: "【プール遊びテラス】夏にはビニールプールを広げて水遊びができる屋根付きウッドデッキ" },
      { url: "/images/kaitai/ch3_solid_wood_door.jpg", caption: "【指はさみ防止引き戸】お子様の安全に配慮してソフトクローズを組み込んだ造作建具" },
      { url: "/images/kaitai/ch4_theater_screen_napoleon.jpg", caption: "【ファミリーシアター】休日の夜、家族みんなでアニメや知育動画を楽しむ大画面" },
      { url: "/images/kaitai/ch4_theater_projector.jpg", caption: "【天井プロジェクター】子どもがコードに引っかかる心配のない天吊り安全設計" },
      { url: "/images/kaitai/ch9_solar_house_exterior.jpg", caption: "【太陽光発電】子育てにかかる将来の電気代をぐっと抑える屋根一体型ソーラー" },
      { url: "/images/kaitai/ch9_hems_monitor.jpg", caption: "【エネルギー教育】子どもと一緒に電気の使い方を学べるHEMSタッチモニター" },
      { url: "/images/craftsman_architect_tag.jpg", caption: "【職人さんの木工仕事】お子様の成長に合わせて棚を組み替えられる可動式ダボ加工" },
      { url: "/images/structural_calculation_frame.jpg", caption: "【直下率70%の強さ】回遊動線の開口部が多くても大地震に耐え抜く強靭な耐力壁配置" },
      { url: "/images/heat20_insulation_structure.jpg", caption: "【24h換気計画】花粉やPM2.5を99%除去して室内にきれいな空気だけを届ける換気システム" },
      { url: "/images/kaitai/ch10_roof_insulation.jpg", caption: "【小屋裏断熱】2階の子ども部屋が夏でも涼しく勉強に集中できる超高断熱天井" },
      { url: "/images/hero_kaguya_house.jpg", caption: "【夜のあたたかな風景】子どもたちの元気な笑い声が聞こえてくる温もりある外観" },
      { url: "/images/cases/case1_living.jpg", caption: "【入居後の風景】無垢の杉床に座って遊ぶ子どもたちの笑顔がまぶしいリビング" }
    ]
  }
};

let currentCaseId = 1;
let currentPhotoIndex = 0;

function initCaseStudiesGallery() {
  const caseButtons = document.querySelectorAll('.case-tab-btn');
  const prevBtn = document.getElementById('case-prev-btn');
  const nextBtn = document.getElementById('case-next-btn');
  const mainViewer = document.getElementById('case-main-viewer');
  const lightboxModal = document.getElementById('case-lightbox-modal');
  const lightboxImg = document.getElementById('case-lightbox-content');
  const lightboxClose = document.getElementById('case-lightbox-close');

  if (!caseButtons.length) return;

  // Case tab switching
  caseButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      caseButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cid = parseInt(btn.getAttribute('data-case'), 10);
      loadCase(cid);
    });
  });

  // Next / Prev photo navigation
  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stepPhoto(-1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stepPhoto(1);
    });
  }

  // Lightbox open/close
  if (mainViewer && lightboxModal && lightboxImg) {
    mainViewer.addEventListener('click', () => {
      const c = caseStudiesData[currentCaseId];
      if (!c) return;
      const p = c.photos[currentPhotoIndex];
      lightboxImg.src = p.url;
      lightboxModal.classList.add('active');
    });

    if (lightboxClose) {
      lightboxClose.addEventListener('click', () => {
        lightboxModal.classList.remove('active');
      });
    }

    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) {
        lightboxModal.classList.remove('active');
      }
    });
  }

  // Keyboard navigation for lightbox / gallery
  document.addEventListener('keydown', (e) => {
    const isCraftsmanshipActive = document.getElementById('craftsmanship')?.classList.contains('active');
    if (!isCraftsmanshipActive) return;

    if (e.key === 'ArrowLeft') {
      stepPhoto(-1);
      if (lightboxModal?.classList.contains('active')) {
        const c = caseStudiesData[currentCaseId];
        lightboxImg.src = c.photos[currentPhotoIndex].url;
      }
    } else if (e.key === 'ArrowRight') {
      stepPhoto(1);
      if (lightboxModal?.classList.contains('active')) {
        const c = caseStudiesData[currentCaseId];
        lightboxImg.src = c.photos[currentPhotoIndex].url;
      }
    } else if (e.key === 'Escape' && lightboxModal?.classList.contains('active')) {
      lightboxModal.classList.remove('active');
    }
  });

  // Initial load
  loadCase(1);
}

function loadCase(caseId) {
  currentCaseId = caseId;
  currentPhotoIndex = 0;
  const c = caseStudiesData[caseId];
  if (!c) return;

  // Update text
  const clientEl = document.getElementById('case-story-client');
  const carpEl = document.getElementById('case-story-carpenter');
  const archEl = document.getElementById('case-story-architect');
  if (clientEl) clientEl.textContent = c.client;
  if (carpEl) carpEl.textContent = c.carpenter;
  if (archEl) archEl.textContent = c.architect;

  // Render thumbnails strip
  const strip = document.getElementById('case-thumbnails-strip');
  if (strip) {
    strip.innerHTML = '';
    c.photos.forEach((photo, idx) => {
      const thumb = document.createElement('div');
      thumb.className = `case-thumb-item ${idx === 0 ? 'active' : ''}`;
      thumb.setAttribute('data-idx', idx);
      thumb.title = photo.caption;
      thumb.innerHTML = `<img src="${photo.url}" alt="サムネイル ${idx + 1}" loading="lazy" />`;
      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        selectPhoto(idx);
      });
      strip.appendChild(thumb);
    });
  }

  updateMainPhoto();
}

function selectPhoto(idx) {
  const c = caseStudiesData[currentCaseId];
  if (!c || idx < 0 || idx >= c.photos.length) return;
  currentPhotoIndex = idx;
  updateMainPhoto();
}

function stepPhoto(delta) {
  const c = caseStudiesData[currentCaseId];
  if (!c) return;
  currentPhotoIndex = (currentPhotoIndex + delta + c.photos.length) % c.photos.length;
  updateMainPhoto();
}

function updateMainPhoto() {
  const c = caseStudiesData[currentCaseId];
  if (!c) return;
  const p = c.photos[currentPhotoIndex];
  if (!p) return;

  const imgEl = document.getElementById('case-main-img');
  const captionEl = document.getElementById('case-caption-text');
  const counterEl = document.getElementById('case-photo-counter');

  if (imgEl) imgEl.src = p.url;
  if (captionEl) captionEl.textContent = p.caption;
  if (counterEl) counterEl.textContent = `📸 写真 ${currentPhotoIndex + 1} / ${c.photos.length}枚`;

  // Update active thumbnail
  const thumbs = document.querySelectorAll('.case-thumb-item');
  thumbs.forEach((t, i) => {
    if (i === currentPhotoIndex) {
      t.classList.add('active');
      t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else {
      t.classList.remove('active');
    }
  });
}
"""

if "initCaseStudiesGallery" not in js:
    with open("public/js/app.js", "a", encoding="utf-8") as out:
        out.write("\n" + gallery_code)
    print("Appended gallery code to public/js/app.js!")
else:
    print("initCaseStudiesGallery already present in app.js")

with open("public/js/app.js", "w", encoding="utf-8") as out:
    out.write(js)

print("Saved updated public/js/app.js!")
