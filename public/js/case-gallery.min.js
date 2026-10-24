/**
 * 株式会社住ま居る - 施工実例 20+ Photos Interactive Gallery Engine
 * (Single Responsibility Principle Refactoring)
 */
// =========================================================
// 11. Case Studies 20+ Photos Interactive Gallery System
// =========================================================
const caseStudiesData = {
  "1": {
    "title": "【ときがわ町・K様邸】吉野杉大黒柱と山並みを望む吹き抜け・太陽光＆ZEHで叶えた自然共生住宅",
    "sub": "吉野杉大黒柱 × 太陽光ZEH × パッシブ設計 × C値0.3",
    "client": "「吉野杉の大黒柱が堂々と立つ吹き抜けリビングは、四季折々の山並みが見渡せる特等席です。太陽光発電の売電収入も大きく、真冬でも家中が均一に暖かく、自然の恵みを感じながら心豊かに暮らせています。」",
    "carpenter": "「ときがわ町の美しい山並みに映えるよう、樹齢80年超の吉野杉大黒柱と化粧梁を手刻み加工。手すりや棚も大工の手仕事で角を丸くカンナ仕上げし、無垢材の温もりを引き出しました。」",
    "architect": "「南面の山並みを取り込む大開口と吹き抜けを設けつつ、埼玉の冬の冷え込みに負けない外皮断熱と許容応力度計算耐震等級3を両立。屋根勾配に合わせた太陽光パネル配置で年間収支ゼロのZEHを実現しました。」",
    "photographer": "Nikon D4S / AF-S NIKKOR 14-24mm F2.8G ED「神レンズ」 / F16 パンフォーカス / 自然光実測",
    "photos": [
      {
        "url": "/images/cases/tokigawa-k/photo_01_dsc_8715.webp",
        "caption": "【外観ファサード】ときがわ町・K様邸 - 街並みに美しく映える外観デザイン。埼玉の自然光と風の流れを計算したパッシブ設計。"
      },
      {
        "url": "/images/cases/tokigawa-k/photo_02_dsc_8730.webp",
        "caption": "【アプローチ・玄関】ときがわ町・K様邸 - 愛車や家族をやさしく迎え入れるエントランス。深い庇が雨風を防ぎます。"
      },
      {
        "url": "/images/cases/tokigawa-k/photo_03_dsc_8759.webp",
        "caption": "【エントランスホール】ときがわ町・K様邸 - 扉を開けた瞬間に広がる無垢材の香りと上質な空間。来客を温かくもてなします。"
      },
      {
        "url": "/images/cases/tokigawa-k/photo_04_dsc_8775.webp",
        "caption": "【大開口LDK全景】ときがわ町・K様邸 - 家族全員がゆったり寛げる広々リビング。耐震等級3を維持しながら大空間を実現。"
      },
      {
        "url": "/images/cases/tokigawa-k/photo_05_dsc_8791.webp",
        "caption": "【リビング・吹き抜け】ときがわ町・K様邸 - 上部からの光が降り注ぐ心地よいリビング。開放感と高気密高断熱を両立。"
      },
      {
        "url": "/images/cases/tokigawa-k/photo_06_dsc_8802.webp",
        "caption": "【ピットリビング・畳コーナー】ときがわ町・K様邸 - 空間をゆるやかに仕切る工夫。段差に腰掛けたり寝転んだりと多彩なくつろぎを提案。"
      },
      {
        "url": "/images/cases/tokigawa-k/photo_07_dsc_8817.webp",
        "caption": "【オーダーキッチン】ときがわ町・K様邸 - 料理が楽しくなる機能美あふれるキッチン。家事負担を軽減する回遊動線を確保。"
      },
      {
        "url": "/images/cases/tokigawa-k/photo_08_dsc_8796.webp",
        "caption": "【ダイニングゾーン】ときがわ町・K様邸 - 家族の会話が弾む明るい食卓。庭の景色を眺めながら食事が楽しめます。"
      },
      {
        "url": "/images/cases/tokigawa-k/photo_09_dsc_8819.webp",
        "caption": "【大容量収納・パントリー】ときがわ町・K様邸 - 生活感をすっきり隠す造作収納。必要な場所に必要な容量を配置。"
      },
      {
        "url": "/images/cases/tokigawa-k/photo_10_dsc_8773.webp",
        "caption": "【大工手刻み・化粧梁】ときがわ町・K様邸 - 熟練大工が木の癖を見極めて手刻み加工した化粧梁。構造の力強さと美しさが共存。"
      },
      {
        "url": "/images/cases/tokigawa-k/photo_11_dsc_8782.webp",
        "caption": "【本格和室・障子ディテール】ときがわ町・K様邸 - 伝統の木組みとモダンが融合した和室。細部に宿る職人の精緻な手仕事。"
      },
      {
        "url": "/images/cases/tokigawa-k/photo_12_dsc_8795.webp",
        "caption": "【デザイン階段】ときがわ町・K様邸 - インテリアの主役となる美しい階段。軽やかなスチールと無垢木材の調和。"
      },
      {
        "url": "/images/cases/tokigawa-k/photo_13_dsc_8723.webp",
        "caption": "【ホテルライク造作洗面】ときがわ町・K様邸 - 毎日の身支度が楽しくなるオリジナル洗面台。タイルと照明の美しい組み合わせ。"
      },
      {
        "url": "/images/cases/tokigawa-k/photo_14_dsc_8731.webp",
        "caption": "【浴室・バスルーム】ときがわ町・K様邸 - 1日の疲れを心地よく癒すバスルーム。高断熱浴槽で冬でもあたたかさが持続。"
      },
      {
        "url": "/images/cases/tokigawa-k/photo_15_dsc_8739.webp",
        "caption": "【レストルーム】ときがわ町・K様邸 - 清潔感と落ち着きのあるレストルーム。独立手洗い器やニッチ収納を完備。"
      },
      {
        "url": "/images/cases/tokigawa-k/photo_16_dsc_8766.webp",
        "caption": "【主寝室・ウォークインクローゼット】ときがわ町・K様邸 - 静かな眠りを約束する落ち着いた寝室。大容量のウォークインクローゼットを併設。"
      },
      {
        "url": "/images/cases/tokigawa-k/photo_17_dsc_8748.webp",
        "caption": "【子ども部屋・スタディスペース】ときがわ町・K様邸 - 子どもの成長に合わせて間仕切り可能な可変設計。自然光が入る明るい空間。"
      },
      {
        "url": "/images/cases/tokigawa-k/photo_18_dsc_8756.webp",
        "caption": "【バルコニー・ウッドデッキ】ときがわ町・K様邸 - 屋内外が一体となるアウトドアリビング。青空の下でリフレッシュできる特等席。"
      },
      {
        "url": "/images/cases/tokigawa-k/photo_19_dsc_8834.webp",
        "caption": "【夜景ライティング】ときがわ町・K様邸 - 夕暮れ時から美しく灯る建築化照明。安心感とやすらぎに包まれる夜の佇まい。"
      },
      {
        "url": "/images/cases/tokigawa-k/photo_20_dsc_8812.webp",
        "caption": "【建物全景・竣工ディテール】ときがわ町・K様邸 - お施主様の叶えたい想い、大工の技、建築士の計算が結実した世界にひとつの邸宅。"
      }
    ]
  },
  "2": {
    "title": "【吉見町・O様邸】無垢杉の香りと陽だまりのLDK・家族の笑顔が集う平屋風ナチュラルハウス",
    "sub": "無垢杉フロア × 珪藻土塗り壁 × 平屋風ワンフロア動線",
    "client": "「無垢杉の床は冬でも冷たくなく、子どもたちが年中素足で元気に走り回っています。珪藻土の塗り壁のおかげで梅雨時も空気がサラリとしていて、本当に深呼吸したくなる家です。」",
    "carpenter": "「杉の無垢床は一枚一枚木目を合わせながら丁寧に施工。造作のキッチンカウンターやスタディスペースもミリ単位で収めました。」",
    "architect": "「平屋のようにワンフロアで生活が完結する家事動線を設計。南側の深い軒が夏の強い陽射しを遮り、冬はあたたかな光を部屋の奥まで届けます。」",
    "photographer": "Nikon D4S / AF-S NIKKOR 14-24mm F2.8G ED「神レンズ」 / F16 パンフォーカス / 自然光実測",
    "photos": [
      {
        "url": "/images/cases/yoshimi-o/photo_01_dsc_0556.webp",
        "caption": "【外観ファサード】吉見町・O様邸 - 街並みに美しく映える外観デザイン。埼玉の自然光と風の流れを計算したパッシブ設計。"
      },
      {
        "url": "/images/cases/yoshimi-o/photo_02_dsc_0566.webp",
        "caption": "【アプローチ・玄関】吉見町・O様邸 - 愛車や家族をやさしく迎え入れるエントランス。深い庇が雨風を防ぎます。"
      },
      {
        "url": "/images/cases/yoshimi-o/photo_03_dsc_0574.webp",
        "caption": "【エントランスホール】吉見町・O様邸 - 扉を開けた瞬間に広がる無垢材の香りと上質な空間。来客を温かくもてなします。"
      },
      {
        "url": "/images/cases/yoshimi-o/photo_04_dsc_0580.webp",
        "caption": "【大開口LDK全景】吉見町・O様邸 - 家族全員がゆったり寛げる広々リビング。耐震等級3を維持しながら大空間を実現。"
      },
      {
        "url": "/images/cases/yoshimi-o/photo_05_dsc_0584.webp",
        "caption": "【リビング・吹き抜け】吉見町・O様邸 - 上部からの光が降り注ぐ心地よいリビング。開放感と高気密高断熱を両立。"
      },
      {
        "url": "/images/cases/yoshimi-o/photo_06_dsc_0588.webp",
        "caption": "【ピットリビング・畳コーナー】吉見町・O様邸 - 空間をゆるやかに仕切る工夫。段差に腰掛けたり寝転んだりと多彩なくつろぎを提案。"
      },
      {
        "url": "/images/cases/yoshimi-o/photo_07_dsc_0592.webp",
        "caption": "【オーダーキッチン】吉見町・O様邸 - 料理が楽しくなる機能美あふれるキッチン。家事負担を軽減する回遊動線を確保。"
      },
      {
        "url": "/images/cases/yoshimi-o/photo_08_dsc_0601.webp",
        "caption": "【ダイニングゾーン】吉見町・O様邸 - 家族の会話が弾む明るい食卓。庭の景色を眺めながら食事が楽しめます。"
      },
      {
        "url": "/images/cases/yoshimi-o/photo_09_dsc_0605.webp",
        "caption": "【大容量収納・パントリー】吉見町・O様邸 - 生活感をすっきり隠す造作収納。必要な場所に必要な容量を配置。"
      },
      {
        "url": "/images/cases/yoshimi-o/photo_10_dsc_0609.webp",
        "caption": "【大工手刻み・化粧梁】吉見町・O様邸 - 熟練大工が木の癖を見極めて手刻み加工した化粧梁。構造の力強さと美しさが共存。"
      },
      {
        "url": "/images/cases/yoshimi-o/photo_11_dsc_0615.webp",
        "caption": "【本格和室・障子ディテール】吉見町・O様邸 - 伝統の木組みとモダンが融合した和室。細部に宿る職人の精緻な手仕事。"
      },
      {
        "url": "/images/cases/yoshimi-o/photo_12_dsc_0619.webp",
        "caption": "【デザイン階段】吉見町・O様邸 - インテリアの主役となる美しい階段。軽やかなスチールと無垢木材の調和。"
      },
      {
        "url": "/images/cases/yoshimi-o/photo_13_dsc_0628.webp",
        "caption": "【ホテルライク造作洗面】吉見町・O様邸 - 毎日の身支度が楽しくなるオリジナル洗面台。タイルと照明の美しい組み合わせ。"
      },
      {
        "url": "/images/cases/yoshimi-o/photo_14_dsc_0634.webp",
        "caption": "【浴室・バスルーム】吉見町・O様邸 - 1日の疲れを心地よく癒すバスルーム。高断熱浴槽で冬でもあたたかさが持続。"
      },
      {
        "url": "/images/cases/yoshimi-o/photo_15_dsc_0642.webp",
        "caption": "【レストルーム】吉見町・O様邸 - 清潔感と落ち着きのあるレストルーム。独立手洗い器やニッチ収納を完備。"
      },
      {
        "url": "/images/cases/yoshimi-o/photo_16_dsc_0646.webp",
        "caption": "【主寝室・ウォークインクローゼット】吉見町・O様邸 - 静かな眠りを約束する落ち着いた寝室。大容量のウォークインクローゼットを併設。"
      },
      {
        "url": "/images/cases/yoshimi-o/photo_17_dsc_0650.webp",
        "caption": "【子ども部屋・スタディスペース】吉見町・O様邸 - 子どもの成長に合わせて間仕切り可能な可変設計。自然光が入る明るい空間。"
      },
      {
        "url": "/images/cases/yoshimi-o/photo_18_dsc_0655.webp",
        "caption": "【バルコニー・ウッドデッキ】吉見町・O様邸 - 屋内外が一体となるアウトドアリビング。青空の下でリフレッシュできる特等席。"
      },
      {
        "url": "/images/cases/yoshimi-o/photo_19_dsc_0661.webp",
        "caption": "【夜景ライティング】吉見町・O様邸 - 夕暮れ時から美しく灯る建築化照明。安心感とやすらぎに包まれる夜の佇まい。"
      },
      {
        "url": "/images/cases/yoshimi-o/photo_20_dsc_0665.webp",
        "caption": "【建物全景・竣工ディテール】吉見町・O様邸 - お施主様の叶えたい想い、大工の技、建築士の計算が結実した世界にひとつの邸宅。"
      }
    ]
  },
  "3": {
    "title": "【川越市・Y様邸】30帖大LDK×白タイル床×ピットリビング・非日常を愉しむホテルライクモダン",
    "sub": "30帖大LDK × 白タイル床暖房 × ピットリビング × 造作間接照明",
    "client": "「30帖の開放的なLDKと、一段下がったピットリビングが最高にお気に入りです。白タイルの床は床暖房で冬も暖かく、遊びに来た友人たちからも『高級ホテルのスイートルームのよう』と絶賛されます。」",
    "carpenter": "「ピットリビングの段差見切りや、TVボードのフロート施工など、ミリ単位の精度が求められるモダン造作に大工の技を注ぎ込みました。」",
    "architect": "「仕切りのない大空間30帖LDKを、全棟構造計算（許容応力度計算）により耐震等級3を一切損なわずに実現。間接照明の建築化設計で夜景の美しさを極めました。」",
    "photographer": "Nikon D4S / AF-S NIKKOR 14-24mm F2.8G ED「神レンズ」 / F16 パンフォーカス / 自然光実測",
    "photos": [
      {
        "url": "/images/cases/kawagoe-y/photo_01_r0037347.webp",
        "caption": "【外観ファサード】直線美を際立たせたホワイト×ダークトーンのスクエアモダン建築。プライバシーと採光を両立。"
      },
      {
        "url": "/images/cases/kawagoe-y/photo_02_r0037352.webp",
        "caption": "【アプローチ動線】ゆとりある前庭と愛車をやさしく迎え入れるアプローチ。夜間は間接照明が壁面を照らし出します。"
      },
      {
        "url": "/images/cases/kawagoe-y/photo_03_r0037354.webp",
        "caption": "【玄関ポーチ】雨の日も濡れずに快適な深い軒の出。シャープなエントランスデザインが邸宅の格調を演出。"
      },
      {
        "url": "/images/cases/kawagoe-y/photo_04_r0037369.webp",
        "caption": "【エントランスホール】扉を開けた瞬間に広がる白タイル床の気品ある空間。足元からホテルライクな非日常が始まります。"
      },
      {
        "url": "/images/cases/kawagoe-y/photo_05_r0037372.webp",
        "caption": "【大型シューズクローク】家族全員の靴やアウトドア用品を美しく収める大容量収納。玄関を常にすっきり整頓。"
      },
      {
        "url": "/images/cases/kawagoe-y/photo_06_r0037387.webp",
        "caption": "【30帖大LDK全景】仕切りのない圧倒的な大開口リビング。白タイル床に反射する自然光が空間全体を満たします。"
      },
      {
        "url": "/images/cases/kawagoe-y/photo_07_r0037397.webp",
        "caption": "【白タイル床×テラス一体空間】屋内外がフラットにつながる設計。床暖房対応の大判タイルが冬でも素足のぬくもりを約束。"
      },
      {
        "url": "/images/cases/kawagoe-y/photo_08_r0037414.webp",
        "caption": "【ピットリビング（一段下がりリビング）】段差により空間をゆるやかにゾーニング。包まれるような安心感とくつろぎを創出。"
      },
      {
        "url": "/images/cases/kawagoe-y/photo_09_r0037415.webp",
        "caption": "【ピットリビングからの目線設計】座ったときに天井の高さと開放感が最大化される黄金比のフロアレベル設計。"
      },
      {
        "url": "/images/cases/kawagoe-y/photo_10_r0037418.webp",
        "caption": "【造作TVウォール＆建築化間接照明】コーニス照明がタイルの陰影を美しく浮かび上がらせ、夜景時の贅沢なリラックス空間を演出。"
      },
      {
        "url": "/images/cases/kawagoe-y/photo_11_r0037424.webp",
        "caption": "【高級アイランドキッチン】LDKの中央に配したステージのようなオープンキッチン。回遊動線で家事効率も抜群。"
      },
      {
        "url": "/images/cases/kawagoe-y/photo_12_r0037426.webp",
        "caption": "【ダイニング＆キッチンゾーン】ホームパーティーでもゲストと自然に会話が弾む、おもてなしのレイアウト。"
      },
      {
        "url": "/images/cases/kawagoe-y/photo_13_r0037433.webp",
        "caption": "【大型バックセット収納】調理家電や食器を美しく隠すフラット扉の造作壁面収納。生活感を完全排除。"
      },
      {
        "url": "/images/cases/kawagoe-y/photo_14_r0037452.webp",
        "caption": "【現代和モダン畳ルーム】LDKの雰囲気を壊さず調和する縁なし畳スペース。客間や子どものお昼寝、寛ぎの場に最適。"
      },
      {
        "url": "/images/cases/kawagoe-y/photo_15_r0037453.webp",
        "caption": "【和室の職人造作ディテール】手刻み大工の精緻な建具合わせ。地窓からの柔らかな間接光が静謐な和の趣を醸成。"
      },
      {
        "url": "/images/cases/kawagoe-y/photo_16_r0037466.webp",
        "caption": "【スケルトン階段＆吹抜け空間】繊細なスチール手すりと木製踏板が宙に浮くようなデザイン階段。上下階をつなぐ光の井戸。"
      },
      {
        "url": "/images/cases/kawagoe-y/photo_17_r0037479.webp",
        "caption": "【ホテルライク造作洗面化粧台】ワイドカウンターと大型一面鏡、アンダー間接照明。朝の身支度が優雅な時間に。"
      },
      {
        "url": "/images/cases/kawagoe-y/photo_18_r0037482.webp",
        "caption": "【プレミアムバスルーム】落ち着いたダークトーンのパネルと保温浴槽。1日の疲れを深く癒すプライベートスパ空間。"
      },
      {
        "url": "/images/cases/kawagoe-y/photo_19_r0037483.webp",
        "caption": "【レストルーム・造作手洗い】タンクレストイレと独立型手洗いカウンター。壁面タイルと間接照明の上品な調和。"
      },
      {
        "url": "/images/cases/kawagoe-y/photo_20_r0037486.webp",
        "caption": "【2階マスターベッドルーム】ホテルの一室のような落ち着きと静寂を追求した主寝室。心地よい眠りを誘う照度設計。"
      }
    ]
  },
  "4": {
    "title": "【日高市・I様邸】冬の光熱費が月5万から1万台に激減！勾配天井とロフトが繋ぐ超高断熱健康住宅",
    "sub": "光熱費大幅削減 × 勾配天井大空間 × 付加断熱 × 気密C値0.28",
    "client": "「旧居では冬の電気ガス代が月5万円を超えていたのに、新居では真冬でも1万円台に激減。エアコン1台で家中が暖かく、結露も一切ありません。」",
    "carpenter": "「外張り付加断熱と充填断熱の隙間を大工自ら徹底的に気密テープ施工。確実な施工が確かな断熱気密性能を生みます。」",
    "architect": "「勾配天井で開放感を出しながら、熱気のこもりや足元の冷えが起きないよう立体的な気流シミュレーションを行い、温度ムラゼロの住環境を設計しました。」",
    "photographer": "Nikon D4S / AF-S NIKKOR 14-24mm F2.8G ED「神レンズ」 / F16 パンフォーカス / 自然光実測",
    "photos": [
      {
        "url": "/images/cases/hidaka-i/photo_01_dsc_8924_edit01.webp",
        "caption": "【外観ファサード】日高市・I様邸 - 街並みに美しく映える外観デザイン。埼玉の自然光と風の流れを計算したパッシブ設計。"
      },
      {
        "url": "/images/cases/hidaka-i/photo_02_dsc_8947_edit01.webp",
        "caption": "【アプローチ・玄関】日高市・I様邸 - 愛車や家族をやさしく迎え入れるエントランス。深い庇が雨風を防ぎます。"
      },
      {
        "url": "/images/cases/hidaka-i/photo_03_dsc_8962_edit01.webp",
        "caption": "【エントランスホール】日高市・I様邸 - 扉を開けた瞬間に広がる無垢材の香りと上質な空間。来客を温かくもてなします。"
      },
      {
        "url": "/images/cases/hidaka-i/photo_04_dsc_8982_edit01.webp",
        "caption": "【大開口LDK全景】日高市・I様邸 - 家族全員がゆったり寛げる広々リビング。耐震等級3を維持しながら大空間を実現。"
      },
      {
        "url": "/images/cases/hidaka-i/photo_05_dsc_8988_edit01.webp",
        "caption": "【リビング・吹き抜け】日高市・I様邸 - 上部からの光が降り注ぐ心地よいリビング。開放感と高気密高断熱を両立。"
      },
      {
        "url": "/images/cases/hidaka-i/photo_06_dsc_9005_edit01.webp",
        "caption": "【ピットリビング・畳コーナー】日高市・I様邸 - 空間をゆるやかに仕切る工夫。段差に腰掛けたり寝転んだりと多彩なくつろぎを提案。"
      },
      {
        "url": "/images/cases/hidaka-i/photo_07_dsc_9012_edit01.webp",
        "caption": "【オーダーキッチン】日高市・I様邸 - 料理が楽しくなる機能美あふれるキッチン。家事負担を軽減する回遊動線を確保。"
      },
      {
        "url": "/images/cases/hidaka-i/photo_08_dsc_9022_edit01.webp",
        "caption": "【ダイニングゾーン】日高市・I様邸 - 家族の会話が弾む明るい食卓。庭の景色を眺めながら食事が楽しめます。"
      },
      {
        "url": "/images/cases/hidaka-i/photo_09_dsc_9038_edit01.webp",
        "caption": "【大容量収納・パントリー】日高市・I様邸 - 生活感をすっきり隠す造作収納。必要な場所に必要な容量を配置。"
      },
      {
        "url": "/images/cases/hidaka-i/photo_10_dsc_9051_edit01.webp",
        "caption": "【大工手刻み・化粧梁】日高市・I様邸 - 熟練大工が木の癖を見極めて手刻み加工した化粧梁。構造の力強さと美しさが共存。"
      },
      {
        "url": "/images/cases/hidaka-i/photo_11_dsc_9085_edit01.webp",
        "caption": "【本格和室・障子ディテール】日高市・I様邸 - 伝統の木組みとモダンが融合した和室。細部に宿る職人の精緻な手仕事。"
      },
      {
        "url": "/images/cases/hidaka-i/photo_12_dsc_9088_edit01.webp",
        "caption": "【デザイン階段】日高市・I様邸 - インテリアの主役となる美しい階段。軽やかなスチールと無垢木材の調和。"
      },
      {
        "url": "/images/cases/hidaka-i/photo_13_dsc_9118_edit01.webp",
        "caption": "【ホテルライク造作洗面】日高市・I様邸 - 毎日の身支度が楽しくなるオリジナル洗面台。タイルと照明の美しい組み合わせ。"
      },
      {
        "url": "/images/cases/hidaka-i/photo_14_dsc_9141_edit01.webp",
        "caption": "【浴室・バスルーム】日高市・I様邸 - 1日の疲れを心地よく癒すバスルーム。高断熱浴槽で冬でもあたたかさが持続。"
      },
      {
        "url": "/images/cases/hidaka-i/photo_15_dsc_9147_edit01.webp",
        "caption": "【レストルーム】日高市・I様邸 - 清潔感と落ち着きのあるレストルーム。独立手洗い器やニッチ収納を完備。"
      },
      {
        "url": "/images/cases/hidaka-i/photo_16_dsc_9166_edit01.webp",
        "caption": "【主寝室・ウォークインクローゼット】日高市・I様邸 - 静かな眠りを約束する落ち着いた寝室。大容量のウォークインクローゼットを併設。"
      },
      {
        "url": "/images/cases/hidaka-i/photo_17_dsc_9168_edit01.webp",
        "caption": "【子ども部屋・スタディスペース】日高市・I様邸 - 子どもの成長に合わせて間仕切り可能な可変設計。自然光が入る明るい空間。"
      },
      {
        "url": "/images/cases/hidaka-i/photo_18_dsc_9173_edit01.webp",
        "caption": "【バルコニー・ウッドデッキ】日高市・I様邸 - 屋内外が一体となるアウトドアリビング。青空の下でリフレッシュできる特等席。"
      },
      {
        "url": "/images/cases/hidaka-i/photo_19_dsc_9178_edit01.webp",
        "caption": "【夜景ライティング】日高市・I様邸 - 夕暮れ時から美しく灯る建築化照明。安心感とやすらぎに包まれる夜の佇まい。"
      },
      {
        "url": "/images/cases/hidaka-i/photo_20_dsc_9184_edit01.webp",
        "caption": "【建物全景・竣工ディテール】日高市・I様邸 - お施主様の叶えたい想い、大工の技、建築士の計算が結実した世界にひとつの邸宅。"
      }
    ]
  },
  "5": {
    "title": "【東松山市・K様邸】伝統の手刻み木組みと現代の超気密が融合・格子戸の陰影が美しい和モダン邸宅",
    "sub": "手刻み木組み × 伝統格子戸 × 職人手づくり家具 × 和モダン",
    "client": "「玄関の格子戸を通した光の陰影が美しく、帰宅するたびに心が安らぎます。木組みの力強さと現代の高気密高断熱が両立していて本当に快適です。」",
    "carpenter": "「玄関格子戸や障子、造作棚はすべて手づくり。継ぎ手や仕口の精度にこだわり、何世代にもわたって受け継がれる木組みを目指しました。」",
    "architect": "「日本の伝統的な美意識である『陰影礼賛』をテーマに、間接照明と自然光が織りなす陰影を計算。現代の省エネ基準をはるかに超える高断熱で包みました。」",
    "photographer": "Nikon D4S / AF-S NIKKOR 14-24mm F2.8G ED「神レンズ」 / F16 パンフォーカス / 自然光実測",
    "photos": [
      {
        "url": "/images/cases/higashimatsuyama-k/photo_01_20150923_000.webp",
        "caption": "【外観ファサード】東松山市・K様邸 - 街並みに美しく映える外観デザイン。埼玉の自然光と風の流れを計算したパッシブ設計。"
      },
      {
        "url": "/images/cases/higashimatsuyama-k/photo_02_20150923_002.webp",
        "caption": "【アプローチ・玄関】東松山市・K様邸 - 愛車や家族をやさしく迎え入れるエントランス。深い庇が雨風を防ぎます。"
      },
      {
        "url": "/images/cases/higashimatsuyama-k/photo_03_20150923_005.webp",
        "caption": "【エントランスホール】東松山市・K様邸 - 扉を開けた瞬間に広がる無垢材の香りと上質な空間。来客を温かくもてなします。"
      },
      {
        "url": "/images/cases/higashimatsuyama-k/photo_04_20150923_008.webp",
        "caption": "【大開口LDK全景】東松山市・K様邸 - 家族全員がゆったり寛げる広々リビング。耐震等級3を維持しながら大空間を実現。"
      },
      {
        "url": "/images/cases/higashimatsuyama-k/photo_05_20150923_011.webp",
        "caption": "【リビング・吹き抜け】東松山市・K様邸 - 上部からの光が降り注ぐ心地よいリビング。開放感と高気密高断熱を両立。"
      },
      {
        "url": "/images/cases/higashimatsuyama-k/photo_06_20150923_014.webp",
        "caption": "【ピットリビング・畳コーナー】東松山市・K様邸 - 空間をゆるやかに仕切る工夫。段差に腰掛けたり寝転んだりと多彩なくつろぎを提案。"
      },
      {
        "url": "/images/cases/higashimatsuyama-k/photo_07_20150923_017.webp",
        "caption": "【オーダーキッチン】東松山市・K様邸 - 料理が楽しくなる機能美あふれるキッチン。家事負担を軽減する回遊動線を確保。"
      },
      {
        "url": "/images/cases/higashimatsuyama-k/photo_08_20150923_020.webp",
        "caption": "【ダイニングゾーン】東松山市・K様邸 - 家族の会話が弾む明るい食卓。庭の景色を眺めながら食事が楽しめます。"
      },
      {
        "url": "/images/cases/higashimatsuyama-k/photo_09_20150923_023.webp",
        "caption": "【大容量収納・パントリー】東松山市・K様邸 - 生活感をすっきり隠す造作収納。必要な場所に必要な容量を配置。"
      },
      {
        "url": "/images/cases/higashimatsuyama-k/photo_10_dsc00819.webp",
        "caption": "【大工手刻み・化粧梁】東松山市・K様邸 - 熟練大工が木の癖を見極めて手刻み加工した化粧梁。構造の力強さと美しさが共存。"
      },
      {
        "url": "/images/cases/higashimatsuyama-k/photo_11_dsc00822.webp",
        "caption": "【本格和室・障子ディテール】東松山市・K様邸 - 伝統の木組みとモダンが融合した和室。細部に宿る職人の精緻な手仕事。"
      },
      {
        "url": "/images/cases/higashimatsuyama-k/photo_12_dsc00824.webp",
        "caption": "【デザイン階段】東松山市・K様邸 - インテリアの主役となる美しい階段。軽やかなスチールと無垢木材の調和。"
      },
      {
        "url": "/images/cases/higashimatsuyama-k/photo_13_dsc00827.webp",
        "caption": "【ホテルライク造作洗面】東松山市・K様邸 - 毎日の身支度が楽しくなるオリジナル洗面台。タイルと照明の美しい組み合わせ。"
      },
      {
        "url": "/images/cases/higashimatsuyama-k/photo_14_dsc00830.webp",
        "caption": "【浴室・バスルーム】東松山市・K様邸 - 1日の疲れを心地よく癒すバスルーム。高断熱浴槽で冬でもあたたかさが持続。"
      },
      {
        "url": "/images/cases/higashimatsuyama-k/photo_15_dsc00833.webp",
        "caption": "【レストルーム】東松山市・K様邸 - 清潔感と落ち着きのあるレストルーム。独立手洗い器やニッチ収納を完備。"
      },
      {
        "url": "/images/cases/higashimatsuyama-k/photo_16_dsc00836.webp",
        "caption": "【主寝室・ウォークインクローゼット】東松山市・K様邸 - 静かな眠りを約束する落ち着いた寝室。大容量のウォークインクローゼットを併設。"
      },
      {
        "url": "/images/cases/higashimatsuyama-k/photo_17_dsc00839.webp",
        "caption": "【子ども部屋・スタディスペース】東松山市・K様邸 - 子どもの成長に合わせて間仕切り可能な可変設計。自然光が入る明るい空間。"
      },
      {
        "url": "/images/cases/higashimatsuyama-k/photo_18_dsc00842.webp",
        "caption": "【バルコニー・ウッドデッキ】東松山市・K様邸 - 屋内外が一体となるアウトドアリビング。青空の下でリフレッシュできる特等席。"
      },
      {
        "url": "/images/cases/higashimatsuyama-k/photo_19_dsc00845.webp",
        "caption": "【夜景ライティング】東松山市・K様邸 - 夕暮れ時から美しく灯る建築化照明。安心感とやすらぎに包まれる夜の佇まい。"
      },
      {
        "url": "/images/cases/higashimatsuyama-k/photo_20_dsc00848.webp",
        "caption": "【建物全景・竣工ディテール】東松山市・K様邸 - お施主様の叶えたい想い、大工の技、建築士の計算が結実した世界にひとつの邸宅。"
      }
    ]
  },
  "6": {
    "title": "【行田市・H様邸】ネイビーガルバ×ビルトインガレージ・寒がりの妻が「暖かすぎる」と太鼓判の家",
    "sub": "ビルトインガレージ × ネイビーガルバリウム × 愛車直結動線",
    "client": "「雨の日も濡れずにガレージから直接室内へ入れる動線が最高です。何より極度の寒がりだった妻が『冬でも素足でいられる』と大喜びしています。」",
    "carpenter": "「ガレージ上の居住スペースの床下断熱を念入りに二重施工。冷気が絶対に居住空間に上がらないよう大工魂で施工しました。」",
    "architect": "「大型車をゆったり収めるビルトインガレージの大開口を設けながら、許容応力度計算で耐震等級3を完全クリア。外観はシャープなネイビーガルバで引き締めました。」",
    "photographer": "Nikon D4S / AF-S NIKKOR 14-24mm F2.8G ED「神レンズ」 / F16 パンフォーカス / 自然光実測",
    "photos": [
      {
        "url": "/images/cases/gyoda-h/photo_01_dsc_3218.webp",
        "caption": "【外観ファサード】行田市・H様邸 - 街並みに美しく映える外観デザイン。埼玉の自然光と風の流れを計算したパッシブ設計。"
      },
      {
        "url": "/images/cases/gyoda-h/photo_02_dsc_3396.webp",
        "caption": "【アプローチ・玄関】行田市・H様邸 - 愛車や家族をやさしく迎え入れるエントランス。深い庇が雨風を防ぎます。"
      },
      {
        "url": "/images/cases/gyoda-h/photo_03_dsc_3725.webp",
        "caption": "【エントランスホール】行田市・H様邸 - 扉を開けた瞬間に広がる無垢材の香りと上質な空間。来客を温かくもてなします。"
      },
      {
        "url": "/images/cases/gyoda-h/photo_04_dsc_3591.webp",
        "caption": "【大開口LDK全景】行田市・H様邸 - 家族全員がゆったり寛げる広々リビング。耐震等級3を維持しながら大空間を実現。"
      },
      {
        "url": "/images/cases/gyoda-h/photo_05_dsc_3621.webp",
        "caption": "【リビング・吹き抜け】行田市・H様邸 - 上部からの光が降り注ぐ心地よいリビング。開放感と高気密高断熱を両立。"
      },
      {
        "url": "/images/cases/gyoda-h/photo_06_dsc_3715.webp",
        "caption": "【ピットリビング・畳コーナー】行田市・H様邸 - 空間をゆるやかに仕切る工夫。段差に腰掛けたり寝転んだりと多彩なくつろぎを提案。"
      },
      {
        "url": "/images/cases/gyoda-h/photo_07_dsc_3831.webp",
        "caption": "【オーダーキッチン】行田市・H様邸 - 料理が楽しくなる機能美あふれるキッチン。家事負担を軽減する回遊動線を確保。"
      },
      {
        "url": "/images/cases/gyoda-h/photo_08_dsc_3500.webp",
        "caption": "【ダイニングゾーン】行田市・H様邸 - 家族の会話が弾む明るい食卓。庭の景色を眺めながら食事が楽しめます。"
      },
      {
        "url": "/images/cases/gyoda-h/photo_09_dsc_3530.webp",
        "caption": "【大容量収納・パントリー】行田市・H様邸 - 生活感をすっきり隠す造作収納。必要な場所に必要な容量を配置。"
      },
      {
        "url": "/images/cases/gyoda-h/photo_10_dsc_3739.webp",
        "caption": "【大工手刻み・化粧梁】行田市・H様邸 - 熟練大工が木の癖を見極めて手刻み加工した化粧梁。構造の力強さと美しさが共存。"
      },
      {
        "url": "/images/cases/gyoda-h/photo_11_dsc_3236.webp",
        "caption": "【本格和室・障子ディテール】行田市・H様邸 - 伝統の木組みとモダンが融合した和室。細部に宿る職人の精緻な手仕事。"
      },
      {
        "url": "/images/cases/gyoda-h/photo_12_dsc_3254.webp",
        "caption": "【デザイン階段】行田市・H様邸 - インテリアの主役となる美しい階段。軽やかなスチールと無垢木材の調和。"
      },
      {
        "url": "/images/cases/gyoda-h/photo_13_dsc_3268.webp",
        "caption": "【ホテルライク造作洗面】行田市・H様邸 - 毎日の身支度が楽しくなるオリジナル洗面台。タイルと照明の美しい組み合わせ。"
      },
      {
        "url": "/images/cases/gyoda-h/photo_14_dsc_3277.webp",
        "caption": "【浴室・バスルーム】行田市・H様邸 - 1日の疲れを心地よく癒すバスルーム。高断熱浴槽で冬でもあたたかさが持続。"
      },
      {
        "url": "/images/cases/gyoda-h/photo_15_dsc_3290.webp",
        "caption": "【レストルーム】行田市・H様邸 - 清潔感と落ち着きのあるレストルーム。独立手洗い器やニッチ収納を完備。"
      },
      {
        "url": "/images/cases/gyoda-h/photo_16_dsc_3311.webp",
        "caption": "【主寝室・ウォークインクローゼット】行田市・H様邸 - 静かな眠りを約束する落ち着いた寝室。大容量のウォークインクローゼットを併設。"
      },
      {
        "url": "/images/cases/gyoda-h/photo_17_dsc_3353.webp",
        "caption": "【子ども部屋・スタディスペース】行田市・H様邸 - 子どもの成長に合わせて間仕切り可能な可変設計。自然光が入る明るい空間。"
      },
      {
        "url": "/images/cases/gyoda-h/photo_18_dsc_3421.webp",
        "caption": "【バルコニー・ウッドデッキ】行田市・H様邸 - 屋内外が一体となるアウトドアリビング。青空の下でリフレッシュできる特等席。"
      },
      {
        "url": "/images/cases/gyoda-h/photo_19_dsc_3779.webp",
        "caption": "【夜景ライティング】行田市・H様邸 - 夕暮れ時から美しく灯る建築化照明。安心感とやすらぎに包まれる夜の佇まい。"
      },
      {
        "url": "/images/cases/gyoda-h/photo_20_dsc_3448.webp",
        "caption": "【建物全景・竣工ディテール】行田市・H様邸 - お施主様の叶えたい想い、大工の技、建築士の計算が結実した世界にひとつの邸宅。"
      }
    ]
  },
  "7": {
    "title": "【鳩山町・T様邸】緑豊かな丘陵地に寄り添う平屋調ファサード・深い庇が日射を遮るパッシブ設計",
    "sub": "平屋調ファサード × 深い軒の出 × パッシブ日射遮蔽 × 丘陵地景観",
    "client": "「鳩山の自然豊かな景色に溶け込む落ち着いた外観が自慢です。夏の強い西日も深い庇のおかげで遮られ、室内はいつもサラリと涼しいです。」",
    "carpenter": "「軒の出を1.2m深く出した垂木を大工手刻みで強固に固定。風雨に耐える伝統の木組みを現代工法と融合させました。」",
    "architect": "「埼玉の夏の猛暑をパッシブに防ぐ『深い軒』と、冬の太陽熱を室内にたっぷり取り込む窓配置をシミュレーション。四季を通じてエアコン頼みにならない家を実現しました。」",
    "photographer": "Nikon D4S / AF-S NIKKOR 14-24mm F2.8G ED「神レンズ」 / F16 パンフォーカス / 自然光実測",
    "photos": [
      {
        "url": "/images/cases/hatoyama-t/photo_01_img_0001.webp",
        "caption": "【外観ファサード】鳩山町・T様邸 - 街並みに美しく映える外観デザイン。埼玉の自然光と風の流れを計算したパッシブ設計。"
      },
      {
        "url": "/images/cases/hatoyama-t/photo_02_img_0007.webp",
        "caption": "【アプローチ・玄関】鳩山町・T様邸 - 愛車や家族をやさしく迎え入れるエントランス。深い庇が雨風を防ぎます。"
      },
      {
        "url": "/images/cases/hatoyama-t/photo_03_img_0026.webp",
        "caption": "【エントランスホール】鳩山町・T様邸 - 扉を開けた瞬間に広がる無垢材の香りと上質な空間。来客を温かくもてなします。"
      },
      {
        "url": "/images/cases/hatoyama-t/photo_04_img_0038.webp",
        "caption": "【大開口LDK全景】鳩山町・T様邸 - 家族全員がゆったり寛げる広々リビング。耐震等級3を維持しながら大空間を実現。"
      },
      {
        "url": "/images/cases/hatoyama-t/photo_05_img_0056.webp",
        "caption": "【リビング・吹き抜け】鳩山町・T様邸 - 上部からの光が降り注ぐ心地よいリビング。開放感と高気密高断熱を両立。"
      },
      {
        "url": "/images/cases/hatoyama-t/photo_06_img_0067.webp",
        "caption": "【ピットリビング・畳コーナー】鳩山町・T様邸 - 空間をゆるやかに仕切る工夫。段差に腰掛けたり寝転んだりと多彩なくつろぎを提案。"
      },
      {
        "url": "/images/cases/hatoyama-t/photo_07_img_0083.webp",
        "caption": "【オーダーキッチン】鳩山町・T様邸 - 料理が楽しくなる機能美あふれるキッチン。家事負担を軽減する回遊動線を確保。"
      },
      {
        "url": "/images/cases/hatoyama-t/photo_08_img_0100.webp",
        "caption": "【ダイニングゾーン】鳩山町・T様邸 - 家族の会話が弾む明るい食卓。庭の景色を眺めながら食事が楽しめます。"
      },
      {
        "url": "/images/cases/hatoyama-t/photo_09_img_0191.webp",
        "caption": "【大容量収納・パントリー】鳩山町・T様邸 - 生活感をすっきり隠す造作収納。必要な場所に必要な容量を配置。"
      },
      {
        "url": "/images/cases/hatoyama-t/photo_10_img_0110.webp",
        "caption": "【大工手刻み・化粧梁】鳩山町・T様邸 - 熟練大工が木の癖を見極めて手刻み加工した化粧梁。構造の力強さと美しさが共存。"
      },
      {
        "url": "/images/cases/hatoyama-t/photo_11_img_0121.webp",
        "caption": "【本格和室・障子ディテール】鳩山町・T様邸 - 伝統の木組みとモダンが融合した和室。細部に宿る職人の精緻な手仕事。"
      },
      {
        "url": "/images/cases/hatoyama-t/photo_12_img_0131.webp",
        "caption": "【デザイン階段】鳩山町・T様邸 - インテリアの主役となる美しい階段。軽やかなスチールと無垢木材の調和。"
      },
      {
        "url": "/images/cases/hatoyama-t/photo_13_img_0141.webp",
        "caption": "【ホテルライク造作洗面】鳩山町・T様邸 - 毎日の身支度が楽しくなるオリジナル洗面台。タイルと照明の美しい組み合わせ。"
      },
      {
        "url": "/images/cases/hatoyama-t/photo_14_img_0209.webp",
        "caption": "【浴室・バスルーム】鳩山町・T様邸 - 1日の疲れを心地よく癒すバスルーム。高断熱浴槽で冬でもあたたかさが持続。"
      },
      {
        "url": "/images/cases/hatoyama-t/photo_15_img_0220.webp",
        "caption": "【レストルーム】鳩山町・T様邸 - 清潔感と落ち着きのあるレストルーム。独立手洗い器やニッチ収納を完備。"
      },
      {
        "url": "/images/cases/hatoyama-t/photo_16_img_0167.webp",
        "caption": "【主寝室・ウォークインクローゼット】鳩山町・T様邸 - 静かな眠りを約束する落ち着いた寝室。大容量のウォークインクローゼットを併設。"
      },
      {
        "url": "/images/cases/hatoyama-t/photo_17_img_0233.webp",
        "caption": "【子ども部屋・スタディスペース】鳩山町・T様邸 - 子どもの成長に合わせて間仕切り可能な可変設計。自然光が入る明るい空間。"
      },
      {
        "url": "/images/cases/hatoyama-t/photo_18_img_0062.webp",
        "caption": "【バルコニー・ウッドデッキ】鳩山町・T様邸 - 屋内外が一体となるアウトドアリビング。青空の下でリフレッシュできる特等席。"
      },
      {
        "url": "/images/cases/hatoyama-t/photo_19_img_0111.webp",
        "caption": "【夜景ライティング】鳩山町・T様邸 - 夕暮れ時から美しく灯る建築化照明。安心感とやすらぎに包まれる夜の佇まい。"
      },
      {
        "url": "/images/cases/hatoyama-t/photo_20_img_0165.webp",
        "caption": "【建物全景・竣工ディテール】鳩山町・T様邸 - お施主様の叶えたい想い、大工の技、建築士の計算が結実した世界にひとつの邸宅。"
      }
    ]
  },
  "8": {
    "title": "【鶴ヶ島市・A様邸】「3年暮らしても不満ゼロ！」アイランドキッチンと中庭を囲むリゾートモダン",
    "sub": "不満ゼロの家 × アイランドキッチン × プライベート中庭 × 家事動線",
    "client": "「住み始めて3年が経ちますが、本当に不満がひとつもありません。中庭から光が降り注ぎ、カーテンを開け放して人目を気にせず過ごせるのが幸せです。」",
    "carpenter": "「中庭を囲む大開口サッシの枠まわりをミリ単位で水平垂直を出し、職人の技で狂いのない仕上がりを追求しました。」",
    "architect": "「住宅街にあっても外部からの視線を完全に遮り、中庭から光と風を取り込むコートハウス設計。回遊性のあるランドリー動線で家事負担を半減させました。」",
    "photographer": "Nikon D4S / AF-S NIKKOR 14-24mm F2.8G ED「神レンズ」 / F16 パンフォーカス / 自然光実測",
    "photos": [
      {
        "url": "/images/cases/tsurugashima-a/photo_01__dsc8468.webp",
        "caption": "【外観ファサード】鶴ヶ島市・A様邸 - 街並みに美しく映える外観デザイン。埼玉の自然光と風の流れを計算したパッシブ設計。"
      },
      {
        "url": "/images/cases/tsurugashima-a/photo_02__dsc8500.webp",
        "caption": "【アプローチ・玄関】鶴ヶ島市・A様邸 - 愛車や家族をやさしく迎え入れるエントランス。深い庇が雨風を防ぎます。"
      },
      {
        "url": "/images/cases/tsurugashima-a/photo_03__hdr3.webp",
        "caption": "【エントランスホール】鶴ヶ島市・A様邸 - 扉を開けた瞬間に広がる無垢材の香りと上質な空間。来客を温かくもてなします。"
      },
      {
        "url": "/images/cases/tsurugashima-a/photo_04__dsc8557.webp",
        "caption": "【大開口LDK全景】鶴ヶ島市・A様邸 - 家族全員がゆったり寛げる広々リビング。耐震等級3を維持しながら大空間を実現。"
      },
      {
        "url": "/images/cases/tsurugashima-a/photo_05__dsc8520.webp",
        "caption": "【リビング・吹き抜け】鶴ヶ島市・A様邸 - 上部からの光が降り注ぐ心地よいリビング。開放感と高気密高断熱を両立。"
      },
      {
        "url": "/images/cases/tsurugashima-a/photo_06__dsc8525.webp",
        "caption": "【ピットリビング・畳コーナー】鶴ヶ島市・A様邸 - 空間をゆるやかに仕切る工夫。段差に腰掛けたり寝転んだりと多彩なくつろぎを提案。"
      },
      {
        "url": "/images/cases/tsurugashima-a/photo_07__hdr4.webp",
        "caption": "【オーダーキッチン】鶴ヶ島市・A様邸 - 料理が楽しくなる機能美あふれるキッチン。家事負担を軽減する回遊動線を確保。"
      },
      {
        "url": "/images/cases/tsurugashima-a/photo_08__dsc8491.webp",
        "caption": "【ダイニングゾーン】鶴ヶ島市・A様邸 - 家族の会話が弾む明るい食卓。庭の景色を眺めながら食事が楽しめます。"
      },
      {
        "url": "/images/cases/tsurugashima-a/photo_09__dsc8496.webp",
        "caption": "【大容量収納・パントリー】鶴ヶ島市・A様邸 - 生活感をすっきり隠す造作収納。必要な場所に必要な容量を配置。"
      },
      {
        "url": "/images/cases/tsurugashima-a/photo_10__dsc8504.webp",
        "caption": "【大工手刻み・化粧梁】鶴ヶ島市・A様邸 - 熟練大工が木の癖を見極めて手刻み加工した化粧梁。構造の力強さと美しさが共存。"
      },
      {
        "url": "/images/cases/tsurugashima-a/photo_11__dsc8480.webp",
        "caption": "【本格和室・障子ディテール】鶴ヶ島市・A様邸 - 伝統の木組みとモダンが融合した和室。細部に宿る職人の精緻な手仕事。"
      },
      {
        "url": "/images/cases/tsurugashima-a/photo_12__dsc8466.webp",
        "caption": "【デザイン階段】鶴ヶ島市・A様邸 - インテリアの主役となる美しい階段。軽やかなスチールと無垢木材の調和。"
      },
      {
        "url": "/images/cases/tsurugashima-a/photo_13__dsc8472.webp",
        "caption": "【ホテルライク造作洗面】鶴ヶ島市・A様邸 - 毎日の身支度が楽しくなるオリジナル洗面台。タイルと照明の美しい組み合わせ。"
      },
      {
        "url": "/images/cases/tsurugashima-a/photo_14__dsc8477.webp",
        "caption": "【浴室・バスルーム】鶴ヶ島市・A様邸 - 1日の疲れを心地よく癒すバスルーム。高断熱浴槽で冬でもあたたかさが持続。"
      },
      {
        "url": "/images/cases/tsurugashima-a/photo_15__dsc8512.webp",
        "caption": "【レストルーム】鶴ヶ島市・A様邸 - 清潔感と落ち着きのあるレストルーム。独立手洗い器やニッチ収納を完備。"
      },
      {
        "url": "/images/cases/tsurugashima-a/photo_16__dsc8517.webp",
        "caption": "【主寝室・ウォークインクローゼット】鶴ヶ島市・A様邸 - 静かな眠りを約束する落ち着いた寝室。大容量のウォークインクローゼットを併設。"
      },
      {
        "url": "/images/cases/tsurugashima-a/photo_17__dsc8553.webp",
        "caption": "【子ども部屋・スタディスペース】鶴ヶ島市・A様邸 - 子どもの成長に合わせて間仕切り可能な可変設計。自然光が入る明るい空間。"
      },
      {
        "url": "/images/cases/tsurugashima-a/photo_18__dsc8542.webp",
        "caption": "【バルコニー・ウッドデッキ】鶴ヶ島市・A様邸 - 屋内外が一体となるアウトドアリビング。青空の下でリフレッシュできる特等席。"
      },
      {
        "url": "/images/cases/tsurugashima-a/photo_19__dsc8535.webp",
        "caption": "【夜景ライティング】鶴ヶ島市・A様邸 - 夕暮れ時から美しく灯る建築化照明。安心感とやすらぎに包まれる夜の佇まい。"
      },
      {
        "url": "/images/cases/tsurugashima-a/photo_20__dsc8547.webp",
        "caption": "【建物全景・竣工ディテール】鶴ヶ島市・A様邸 - お施主様の叶えたい想い、大工の技、建築士の計算が結実した世界にひとつの邸宅。"
      }
    ]
  },
  "9": {
    "title": "【鶴ヶ島市・KB様邸】雪見障子と格子の静謐・庭園を愛でる本格和風モダンの極み",
    "sub": "雪見障子 × 本格数寄屋和室 × 庭園景観 × 銘木化粧梁",
    "client": "「リビングの雪見障子を開けると、手入れした庭園の四季が絵画のように広がります。木の香りに包まれる暮らしは、毎日温泉旅館にいるような贅沢さです。」",
    "carpenter": "「床柱、長押、鴨居、敷居のすり合わせは熟練大工ならではの手仕事。ミリ以下の微調整で建具が吸い付くように動くよう仕立てました。」",
    "architect": "「本格的な和風意匠を取り入れながらも、アルミ樹脂複合トリプルガラスと高断熱仕様で『昔の和室のような底冷え』を完全に追放しました。」",
    "photographer": "Nikon D4S / AF-S NIKKOR 14-24mm F2.8G ED「神レンズ」 / F16 パンフォーカス / 自然光実測",
    "photos": [
      {
        "url": "/images/cases/tsurugashima-kb/photo_01_dsc_8594.webp",
        "caption": "【外観ファサード】鶴ヶ島市・KB様邸 - 街並みに美しく映える外観デザイン。埼玉の自然光と風の流れを計算したパッシブ設計。"
      },
      {
        "url": "/images/cases/tsurugashima-kb/photo_02_dsc_8597.webp",
        "caption": "【アプローチ・玄関】鶴ヶ島市・KB様邸 - 愛車や家族をやさしく迎え入れるエントランス。深い庇が雨風を防ぎます。"
      },
      {
        "url": "/images/cases/tsurugashima-kb/photo_03_dsc_8601.webp",
        "caption": "【エントランスホール】鶴ヶ島市・KB様邸 - 扉を開けた瞬間に広がる無垢材の香りと上質な空間。来客を温かくもてなします。"
      },
      {
        "url": "/images/cases/tsurugashima-kb/photo_04_dsc_8605.webp",
        "caption": "【大開口LDK全景】鶴ヶ島市・KB様邸 - 家族全員がゆったり寛げる広々リビング。耐震等級3を維持しながら大空間を実現。"
      },
      {
        "url": "/images/cases/tsurugashima-kb/photo_05_dsc_8609.webp",
        "caption": "【リビング・吹き抜け】鶴ヶ島市・KB様邸 - 上部からの光が降り注ぐ心地よいリビング。開放感と高気密高断熱を両立。"
      },
      {
        "url": "/images/cases/tsurugashima-kb/photo_06_dsc_8612.webp",
        "caption": "【ピットリビング・畳コーナー】鶴ヶ島市・KB様邸 - 空間をゆるやかに仕切る工夫。段差に腰掛けたり寝転んだりと多彩なくつろぎを提案。"
      },
      {
        "url": "/images/cases/tsurugashima-kb/photo_07_dsc_8616.webp",
        "caption": "【オーダーキッチン】鶴ヶ島市・KB様邸 - 料理が楽しくなる機能美あふれるキッチン。家事負担を軽減する回遊動線を確保。"
      },
      {
        "url": "/images/cases/tsurugashima-kb/photo_08_dsc_8620.webp",
        "caption": "【ダイニングゾーン】鶴ヶ島市・KB様邸 - 家族の会話が弾む明るい食卓。庭の景色を眺めながら食事が楽しめます。"
      },
      {
        "url": "/images/cases/tsurugashima-kb/photo_09_dsc_8624.webp",
        "caption": "【大容量収納・パントリー】鶴ヶ島市・KB様邸 - 生活感をすっきり隠す造作収納。必要な場所に必要な容量を配置。"
      },
      {
        "url": "/images/cases/tsurugashima-kb/photo_10_dsc_8627.webp",
        "caption": "【大工手刻み・化粧梁】鶴ヶ島市・KB様邸 - 熟練大工が木の癖を見極めて手刻み加工した化粧梁。構造の力強さと美しさが共存。"
      },
      {
        "url": "/images/cases/tsurugashima-kb/photo_11_dsc_8631.webp",
        "caption": "【本格和室・障子ディテール】鶴ヶ島市・KB様邸 - 伝統の木組みとモダンが融合した和室。細部に宿る職人の精緻な手仕事。"
      },
      {
        "url": "/images/cases/tsurugashima-kb/photo_12_dsc_8635.webp",
        "caption": "【デザイン階段】鶴ヶ島市・KB様邸 - インテリアの主役となる美しい階段。軽やかなスチールと無垢木材の調和。"
      },
      {
        "url": "/images/cases/tsurugashima-kb/photo_13_dsc_8639.webp",
        "caption": "【ホテルライク造作洗面】鶴ヶ島市・KB様邸 - 毎日の身支度が楽しくなるオリジナル洗面台。タイルと照明の美しい組み合わせ。"
      },
      {
        "url": "/images/cases/tsurugashima-kb/photo_14_dsc_8642.webp",
        "caption": "【浴室・バスルーム】鶴ヶ島市・KB様邸 - 1日の疲れを心地よく癒すバスルーム。高断熱浴槽で冬でもあたたかさが持続。"
      },
      {
        "url": "/images/cases/tsurugashima-kb/photo_15_dsc_8648.webp",
        "caption": "【レストルーム】鶴ヶ島市・KB様邸 - 清潔感と落ち着きのあるレストルーム。独立手洗い器やニッチ収納を完備。"
      },
      {
        "url": "/images/cases/tsurugashima-kb/photo_16_dsc_8653.webp",
        "caption": "【主寝室・ウォークインクローゼット】鶴ヶ島市・KB様邸 - 静かな眠りを約束する落ち着いた寝室。大容量のウォークインクローゼットを併設。"
      },
      {
        "url": "/images/cases/tsurugashima-kb/photo_17_dsc_8657.webp",
        "caption": "【子ども部屋・スタディスペース】鶴ヶ島市・KB様邸 - 子どもの成長に合わせて間仕切り可能な可変設計。自然光が入る明るい空間。"
      },
      {
        "url": "/images/cases/tsurugashima-kb/photo_18_dsc_8660.webp",
        "caption": "【バルコニー・ウッドデッキ】鶴ヶ島市・KB様邸 - 屋内外が一体となるアウトドアリビング。青空の下でリフレッシュできる特等席。"
      },
      {
        "url": "/images/cases/tsurugashima-kb/photo_19_dsc_8664.webp",
        "caption": "【夜景ライティング】鶴ヶ島市・KB様邸 - 夕暮れ時から美しく灯る建築化照明。安心感とやすらぎに包まれる夜の佇まい。"
      },
      {
        "url": "/images/cases/tsurugashima-kb/photo_20_dsc_8668.webp",
        "caption": "【建物全景・竣工ディテール】鶴ヶ島市・KB様邸 - お施主様の叶えたい想い、大工の技、建築士の計算が結実した世界にひとつの邸宅。"
      }
    ]
  },
  "10": {
    "title": "【鶴ヶ島市・K様邸】吹き抜けとスケルトン階段・子どもの気配を感じるファミリーオープンハウス",
    "sub": "吹抜けスケルトン階段 × オープンスタディ × ファミリー動線",
    "client": "「キッチンに立ちながら、吹き抜けの上で勉強している子どもの声が聞こえる温かい間取りです。スケルトン階段のおかげで部屋が広く感じられます。」",
    "carpenter": "「スケルトン階段の木製踏板は、素足で心地よい無垢材を大工の手鉋で角を丸めて施工。安全性と手触りにこだわりました。」",
    "architect": "「吹き抜けがあっても1階と2階の温度差が1℃以内に収まるよう、高気密高断熱と換気ルートを綿密に設計しました。」",
    "photographer": "Nikon D4S / AF-S NIKKOR 14-24mm F2.8G ED「神レンズ」 / F16 パンフォーカス / 自然光実測",
    "photos": [
      {
        "url": "/images/cases/tsurugashima-k/photo_01__dsc8401.webp",
        "caption": "【外観ファサード】鶴ヶ島市・K様邸 - 街並みに美しく映える外観デザイン。埼玉の自然光と風の流れを計算したパッシブ設計。"
      },
      {
        "url": "/images/cases/tsurugashima-k/photo_02__dsc8412.webp",
        "caption": "【アプローチ・玄関】鶴ヶ島市・K様邸 - 愛車や家族をやさしく迎え入れるエントランス。深い庇が雨風を防ぎます。"
      },
      {
        "url": "/images/cases/tsurugashima-k/photo_03__dsc8427.webp",
        "caption": "【エントランスホール】鶴ヶ島市・K様邸 - 扉を開けた瞬間に広がる無垢材の香りと上質な空間。来客を温かくもてなします。"
      },
      {
        "url": "/images/cases/tsurugashima-k/photo_04__dsc8443.webp",
        "caption": "【大開口LDK全景】鶴ヶ島市・K様邸 - 家族全員がゆったり寛げる広々リビング。耐震等級3を維持しながら大空間を実現。"
      },
      {
        "url": "/images/cases/tsurugashima-k/photo_05__dsc8455.webp",
        "caption": "【リビング・吹き抜け】鶴ヶ島市・K様邸 - 上部からの光が降り注ぐ心地よいリビング。開放感と高気密高断熱を両立。"
      },
      {
        "url": "/images/cases/tsurugashima-k/photo_06__dsc8417.webp",
        "caption": "【ピットリビング・畳コーナー】鶴ヶ島市・K様邸 - 空間をゆるやかに仕切る工夫。段差に腰掛けたり寝転んだりと多彩なくつろぎを提案。"
      },
      {
        "url": "/images/cases/tsurugashima-k/photo_07__dsc8421.webp",
        "caption": "【オーダーキッチン】鶴ヶ島市・K様邸 - 料理が楽しくなる機能美あふれるキッチン。家事負担を軽減する回遊動線を確保。"
      },
      {
        "url": "/images/cases/tsurugashima-k/photo_08__dsc8424.webp",
        "caption": "【ダイニングゾーン】鶴ヶ島市・K様邸 - 家族の会話が弾む明るい食卓。庭の景色を眺めながら食事が楽しめます。"
      },
      {
        "url": "/images/cases/tsurugashima-k/photo_09__dsc8428.webp",
        "caption": "【大容量収納・パントリー】鶴ヶ島市・K様邸 - 生活感をすっきり隠す造作収納。必要な場所に必要な容量を配置。"
      },
      {
        "url": "/images/cases/tsurugashima-k/photo_10__dsc8431.webp",
        "caption": "【大工手刻み・化粧梁】鶴ヶ島市・K様邸 - 熟練大工が木の癖を見極めて手刻み加工した化粧梁。構造の力強さと美しさが共存。"
      },
      {
        "url": "/images/cases/tsurugashima-k/photo_11__dsc8399.webp",
        "caption": "【本格和室・障子ディテール】鶴ヶ島市・K様邸 - 伝統の木組みとモダンが融合した和室。細部に宿る職人の精緻な手仕事。"
      },
      {
        "url": "/images/cases/tsurugashima-k/photo_12__dsc8403.webp",
        "caption": "【デザイン階段】鶴ヶ島市・K様邸 - インテリアの主役となる美しい階段。軽やかなスチールと無垢木材の調和。"
      },
      {
        "url": "/images/cases/tsurugashima-k/photo_13__dsc8406.webp",
        "caption": "【ホテルライク造作洗面】鶴ヶ島市・K様邸 - 毎日の身支度が楽しくなるオリジナル洗面台。タイルと照明の美しい組み合わせ。"
      },
      {
        "url": "/images/cases/tsurugashima-k/photo_14__dsc8411.webp",
        "caption": "【浴室・バスルーム】鶴ヶ島市・K様邸 - 1日の疲れを心地よく癒すバスルーム。高断熱浴槽で冬でもあたたかさが持続。"
      },
      {
        "url": "/images/cases/tsurugashima-k/photo_15__dsc8436.webp",
        "caption": "【レストルーム】鶴ヶ島市・K様邸 - 清潔感と落ち着きのあるレストルーム。独立手洗い器やニッチ収納を完備。"
      },
      {
        "url": "/images/cases/tsurugashima-k/photo_16__dsc8442.webp",
        "caption": "【主寝室・ウォークインクローゼット】鶴ヶ島市・K様邸 - 静かな眠りを約束する落ち着いた寝室。大容量のウォークインクローゼットを併設。"
      },
      {
        "url": "/images/cases/tsurugashima-k/photo_17__dsc8446.webp",
        "caption": "【子ども部屋・スタディスペース】鶴ヶ島市・K様邸 - 子どもの成長に合わせて間仕切り可能な可変設計。自然光が入る明るい空間。"
      },
      {
        "url": "/images/cases/tsurugashima-k/photo_18__dsc8450.webp",
        "caption": "【バルコニー・ウッドデッキ】鶴ヶ島市・K様邸 - 屋内外が一体となるアウトドアリビング。青空の下でリフレッシュできる特等席。"
      },
      {
        "url": "/images/cases/tsurugashima-k/photo_19__dsc8454.webp",
        "caption": "【夜景ライティング】鶴ヶ島市・K様邸 - 夕暮れ時から美しく灯る建築化照明。安心感とやすらぎに包まれる夜の佇まい。"
      },
      {
        "url": "/images/cases/tsurugashima-k/photo_20__dsc8459.webp",
        "caption": "【建物全景・竣工ディテール】鶴ヶ島市・K様邸 - お施主様の叶えたい想い、大工の技、建築士の計算が結実した世界にひとつの邸宅。"
      }
    ]
  },
  "11": {
    "title": "【鶴ヶ島市・S様邸】土間収納とパントリーの回遊動線・散らからない工夫が詰まった収納充実ハウス",
    "sub": "ウォークスルー土間収納 × 2wayパントリー × 片付く家",
    "client": "「買い物から帰ってきて、土間収納からパントリー、キッチンへ靴を脱いで直行できる動線が便利すぎて感動しています。リビングに物が散らかりません。」",
    "carpenter": "「パントリーの可動棚は大工が現場でお施主様の収納カゴのサイズに合わせて造作。デッドスペースゼロに仕上げました。」",
    "architect": "「ただ収納を増やすのではなく、『生活動線上の正しい位置に正しい収納を配置する』ことで、自然と片付くストレスフリーな間取りを実現しました。」",
    "photographer": "Nikon D4S / AF-S NIKKOR 14-24mm F2.8G ED「神レンズ」 / F16 パンフォーカス / 自然光実測",
    "photos": [
      {
        "url": "/images/cases/tsurugashima-s/photo_01_nakade-3539.webp",
        "caption": "【外観ファサード】鶴ヶ島市・S様邸 - 街並みに美しく映える外観デザイン。埼玉の自然光と風の流れを計算したパッシブ設計。"
      },
      {
        "url": "/images/cases/tsurugashima-s/photo_02_nakade-3725.webp",
        "caption": "【アプローチ・玄関】鶴ヶ島市・S様邸 - 愛車や家族をやさしく迎え入れるエントランス。深い庇が雨風を防ぎます。"
      },
      {
        "url": "/images/cases/tsurugashima-s/photo_03_nakade-3741.webp",
        "caption": "【エントランスホール】鶴ヶ島市・S様邸 - 扉を開けた瞬間に広がる無垢材の香りと上質な空間。来客を温かくもてなします。"
      },
      {
        "url": "/images/cases/tsurugashima-s/photo_04_nakade-3753.webp",
        "caption": "【大開口LDK全景】鶴ヶ島市・S様邸 - 家族全員がゆったり寛げる広々リビング。耐震等級3を維持しながら大空間を実現。"
      },
      {
        "url": "/images/cases/tsurugashima-s/photo_05_nakade-3765.webp",
        "caption": "【リビング・吹き抜け】鶴ヶ島市・S様邸 - 上部からの光が降り注ぐ心地よいリビング。開放感と高気密高断熱を両立。"
      },
      {
        "url": "/images/cases/tsurugashima-s/photo_06_nakade-3778.webp",
        "caption": "【ピットリビング・畳コーナー】鶴ヶ島市・S様邸 - 空間をゆるやかに仕切る工夫。段差に腰掛けたり寝転んだりと多彩なくつろぎを提案。"
      },
      {
        "url": "/images/cases/tsurugashima-s/photo_07_nakade-3524.webp",
        "caption": "【オーダーキッチン】鶴ヶ島市・S様邸 - 料理が楽しくなる機能美あふれるキッチン。家事負担を軽減する回遊動線を確保。"
      },
      {
        "url": "/images/cases/tsurugashima-s/photo_08_nakade-3537.webp",
        "caption": "【ダイニングゾーン】鶴ヶ島市・S様邸 - 家族の会話が弾む明るい食卓。庭の景色を眺めながら食事が楽しめます。"
      },
      {
        "url": "/images/cases/tsurugashima-s/photo_09_nakade-3561.webp",
        "caption": "【大容量収納・パントリー】鶴ヶ島市・S様邸 - 生活感をすっきり隠す造作収納。必要な場所に必要な容量を配置。"
      },
      {
        "url": "/images/cases/tsurugashima-s/photo_10_nakade-3579.webp",
        "caption": "【大工手刻み・化粧梁】鶴ヶ島市・S様邸 - 熟練大工が木の癖を見極めて手刻み加工した化粧梁。構造の力強さと美しさが共存。"
      },
      {
        "url": "/images/cases/tsurugashima-s/photo_11_nakade-3597.webp",
        "caption": "【本格和室・障子ディテール】鶴ヶ島市・S様邸 - 伝統の木組みとモダンが融合した和室。細部に宿る職人の精緻な手仕事。"
      },
      {
        "url": "/images/cases/tsurugashima-s/photo_12_nakade-3617.webp",
        "caption": "【デザイン階段】鶴ヶ島市・S様邸 - インテリアの主役となる美しい階段。軽やかなスチールと無垢木材の調和。"
      },
      {
        "url": "/images/cases/tsurugashima-s/photo_13_nakade-3632.webp",
        "caption": "【ホテルライク造作洗面】鶴ヶ島市・S様邸 - 毎日の身支度が楽しくなるオリジナル洗面台。タイルと照明の美しい組み合わせ。"
      },
      {
        "url": "/images/cases/tsurugashima-s/photo_14_nakade-3647.webp",
        "caption": "【浴室・バスルーム】鶴ヶ島市・S様邸 - 1日の疲れを心地よく癒すバスルーム。高断熱浴槽で冬でもあたたかさが持続。"
      },
      {
        "url": "/images/cases/tsurugashima-s/photo_15_nakade-3657.webp",
        "caption": "【レストルーム】鶴ヶ島市・S様邸 - 清潔感と落ち着きのあるレストルーム。独立手洗い器やニッチ収納を完備。"
      },
      {
        "url": "/images/cases/tsurugashima-s/photo_16_nakade-3669.webp",
        "caption": "【主寝室・ウォークインクローゼット】鶴ヶ島市・S様邸 - 静かな眠りを約束する落ち着いた寝室。大容量のウォークインクローゼットを併設。"
      },
      {
        "url": "/images/cases/tsurugashima-s/photo_17_nakade-3686.webp",
        "caption": "【子ども部屋・スタディスペース】鶴ヶ島市・S様邸 - 子どもの成長に合わせて間仕切り可能な可変設計。自然光が入る明るい空間。"
      },
      {
        "url": "/images/cases/tsurugashima-s/photo_18_nakade-3697.webp",
        "caption": "【バルコニー・ウッドデッキ】鶴ヶ島市・S様邸 - 屋内外が一体となるアウトドアリビング。青空の下でリフレッシュできる特等席。"
      },
      {
        "url": "/images/cases/tsurugashima-s/photo_19_nakade-3713.webp",
        "caption": "【夜景ライティング】鶴ヶ島市・S様邸 - 夕暮れ時から美しく灯る建築化照明。安心感とやすらぎに包まれる夜の佇まい。"
      },
      {
        "url": "/images/cases/tsurugashima-s/photo_20_nakade-3724.webp",
        "caption": "【建物全景・竣工ディテール】鶴ヶ島市・S様邸 - お施主様の叶えたい想い、大工の技、建築士の計算が結実した世界にひとつの邸宅。"
      }
    ]
  },
  "12": {
    "title": "【鶴ヶ島市・T様邸】薪ストーブの炎が揺れる土間リビング・自然素材に囲まれたあたたかな暮らし",
    "sub": "薪ストーブ土間 × 杉無垢床 × 吹き抜けシーリングファン",
    "client": "「冬の夜、薪ストーブの炎を眺めながら家族で過ごす時間が何よりの贅沢です。家中がやさしい輻射熱で暖まり、冬の寒さを忘れるほどです。」",
    "carpenter": "「薪ストーブまわりの耐火レンガ積みや遮熱壁、煙突貫通部の防火・気密処理を厳格に施工。安全と美しさを両立させました。」",
    "architect": "「薪ストーブの熱をシーリングファンで家全体に循環させる立体的な熱流動設計。耐震等級3の強靭な構造の中に、炎の癒しを美しく組み込みました。」",
    "photographer": "Nikon D4S / AF-S NIKKOR 14-24mm F2.8G ED「神レンズ」 / F16 パンフォーカス / 自然光実測",
    "photos": [
      {
        "url": "/images/cases/tsurugashima-t/photo_01_img_9219.webp",
        "caption": "【外観ファサード】鶴ヶ島市・T様邸 - 街並みに美しく映える外観デザイン。埼玉の自然光と風の流れを計算したパッシブ設計。"
      },
      {
        "url": "/images/cases/tsurugashima-t/photo_02_img_9261.webp",
        "caption": "【アプローチ・玄関】鶴ヶ島市・T様邸 - 愛車や家族をやさしく迎え入れるエントランス。深い庇が雨風を防ぎます。"
      },
      {
        "url": "/images/cases/tsurugashima-t/photo_03_img_9299.webp",
        "caption": "【エントランスホール】鶴ヶ島市・T様邸 - 扉を開けた瞬間に広がる無垢材の香りと上質な空間。来客を温かくもてなします。"
      },
      {
        "url": "/images/cases/tsurugashima-t/photo_04_img_9340.webp",
        "caption": "【大開口LDK全景】鶴ヶ島市・T様邸 - 家族全員がゆったり寛げる広々リビング。耐震等級3を維持しながら大空間を実現。"
      },
      {
        "url": "/images/cases/tsurugashima-t/photo_05_img_9243.webp",
        "caption": "【リビング・吹き抜け】鶴ヶ島市・T様邸 - 上部からの光が降り注ぐ心地よいリビング。開放感と高気密高断熱を両立。"
      },
      {
        "url": "/images/cases/tsurugashima-t/photo_06_img_9255.webp",
        "caption": "【ピットリビング・畳コーナー】鶴ヶ島市・T様邸 - 空間をゆるやかに仕切る工夫。段差に腰掛けたり寝転んだりと多彩なくつろぎを提案。"
      },
      {
        "url": "/images/cases/tsurugashima-t/photo_07_img_9266.webp",
        "caption": "【オーダーキッチン】鶴ヶ島市・T様邸 - 料理が楽しくなる機能美あふれるキッチン。家事負担を軽減する回遊動線を確保。"
      },
      {
        "url": "/images/cases/tsurugashima-t/photo_08_img_9280.webp",
        "caption": "【ダイニングゾーン】鶴ヶ島市・T様邸 - 家族の会話が弾む明るい食卓。庭の景色を眺めながら食事が楽しめます。"
      },
      {
        "url": "/images/cases/tsurugashima-t/photo_09_img_9296.webp",
        "caption": "【大容量収納・パントリー】鶴ヶ島市・T様邸 - 生活感をすっきり隠す造作収納。必要な場所に必要な容量を配置。"
      },
      {
        "url": "/images/cases/tsurugashima-t/photo_10_img_9324.webp",
        "caption": "【大工手刻み・化粧梁】鶴ヶ島市・T様邸 - 熟練大工が木の癖を見極めて手刻み加工した化粧梁。構造の力強さと美しさが共存。"
      },
      {
        "url": "/images/cases/tsurugashima-t/photo_11_img_9338.webp",
        "caption": "【本格和室・障子ディテール】鶴ヶ島市・T様邸 - 伝統の木組みとモダンが融合した和室。細部に宿る職人の精緻な手仕事。"
      },
      {
        "url": "/images/cases/tsurugashima-t/photo_12_img_9345.webp",
        "caption": "【デザイン階段】鶴ヶ島市・T様邸 - インテリアの主役となる美しい階段。軽やかなスチールと無垢木材の調和。"
      },
      {
        "url": "/images/cases/tsurugashima-t/photo_13_img_9362.webp",
        "caption": "【ホテルライク造作洗面】鶴ヶ島市・T様邸 - 毎日の身支度が楽しくなるオリジナル洗面台。タイルと照明の美しい組み合わせ。"
      },
      {
        "url": "/images/cases/tsurugashima-t/photo_14_img_9375.webp",
        "caption": "【浴室・バスルーム】鶴ヶ島市・T様邸 - 1日の疲れを心地よく癒すバスルーム。高断熱浴槽で冬でもあたたかさが持続。"
      },
      {
        "url": "/images/cases/tsurugashima-t/photo_15_img_9304.webp",
        "caption": "【レストルーム】鶴ヶ島市・T様邸 - 清潔感と落ち着きのあるレストルーム。独立手洗い器やニッチ収納を完備。"
      },
      {
        "url": "/images/cases/tsurugashima-t/photo_16_img_9321.webp",
        "caption": "【主寝室・ウォークインクローゼット】鶴ヶ島市・T様邸 - 静かな眠りを約束する落ち着いた寝室。大容量のウォークインクローゼットを併設。"
      },
      {
        "url": "/images/cases/tsurugashima-t/photo_17_img_9198.webp",
        "caption": "【子ども部屋・スタディスペース】鶴ヶ島市・T様邸 - 子どもの成長に合わせて間仕切り可能な可変設計。自然光が入る明るい空間。"
      },
      {
        "url": "/images/cases/tsurugashima-t/photo_18_img_9215.webp",
        "caption": "【バルコニー・ウッドデッキ】鶴ヶ島市・T様邸 - 屋内外が一体となるアウトドアリビング。青空の下でリフレッシュできる特等席。"
      },
      {
        "url": "/images/cases/tsurugashima-t/photo_19_img_9231.webp",
        "caption": "【夜景ライティング】鶴ヶ島市・T様邸 - 夕暮れ時から美しく灯る建築化照明。安心感とやすらぎに包まれる夜の佇まい。"
      },
      {
        "url": "/images/cases/tsurugashima-t/photo_20_img_9388.webp",
        "caption": "【建物全景・竣工ディテール】鶴ヶ島市・T様邸 - お施主様の叶えたい想い、大工の技、建築士の計算が結実した世界にひとつの邸宅。"
      }
    ]
  }
};

let currentCaseId = 1;
let currentPhotoIndex = 0;
let currentFilter = 'all';
let isAutoplayRunning = false;
let autoplayTimer = null;

function initCaseStudiesGallery() {
  // 全13邸プロ写真アーカイブJSONの非同期同期（最新データ反映）
  fetch('/data/cases_gallery_archive.json')
    .then(res => res.json())
    .then(data => {
      if (data && data.cases) {
        data.cases.forEach(c => {
          if (c.id === 13) return;
          if (caseStudiesData[c.id]) {
            caseStudiesData[c.id].photographer = c.photographer;
            // ユーザー指示: 各ケース最大20枚厳選
            if (c.photos && c.photos.length > 0) {
              caseStudiesData[c.id].photos = c.photos.slice(0, 20).map(p => ({ url: p.url, caption: p.caption }));
            }
          }
        });
        delete caseStudiesData[13];
        loadCase(currentCaseId);
      }
    }).catch(() => {});

  const caseCards = document.querySelectorAll('.case-overview-card');
  const prevBtn = document.getElementById('case-prev-btn');
  const nextBtn = document.getElementById('case-next-btn');
  const mainViewer = document.getElementById('case-main-viewer');
  const lightboxModal = document.getElementById('case-lightbox-modal');
  const lightboxImg = document.getElementById('case-lightbox-content');
  const lightboxClose = document.getElementById('case-lightbox-close');

  const navPrevHouse = document.getElementById('case-nav-prev-house');
  const navNextHouse = document.getElementById('case-nav-next-house');
  const btnToggleGrid = document.getElementById('btn-toggle-grid');
  const btnAutoplay = document.getElementById('btn-autoplay');
  const filterButtons = document.querySelectorAll('.thumb-filter-btn');

  // Overview Cards switching
  if (caseCards.length) {
    caseCards.forEach(card => {
      card.addEventListener('click', () => {
        const cid = parseInt(card.getAttribute('data-case'), 10);
        selectCase(cid, true);
      });
    });
  }

  // Previous / Next House Switchers
  if (navPrevHouse) {
    navPrevHouse.addEventListener('click', () => {
      stepCase(-1);
    });
  }
  if (navNextHouse) {
    navNextHouse.addEventListener('click', () => {
      stepCase(1);
    });
  }

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

  // Category Filter buttons
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter') || 'all';
      applyThumbnailFilter();
    });
  });

  // Toggle Grid View mode
  if (btnToggleGrid) {
    btnToggleGrid.addEventListener('click', () => {
      const strip = document.getElementById('case-thumbnails-strip');
      const textEl = document.getElementById('text-toggle-grid');
      if (!strip) return;
      const isExpanded = strip.classList.toggle('grid-expanded');
      btnToggleGrid.classList.toggle('active', isExpanded);
      if (textEl) {
        textEl.textContent = isExpanded ? '帯スクロールに戻す' : '全写真一覧で表示';
      }
    });
  }

  // Autoplay slideshow
  if (btnAutoplay) {
    btnAutoplay.addEventListener('click', () => {
      toggleAutoplay();
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

function selectCase(caseId, shouldScroll = false) {
  const caseCards = document.querySelectorAll('.case-overview-card');
  caseCards.forEach(card => {
    const cid = parseInt(card.getAttribute('data-case'), 10);
    card.classList.toggle('active', cid === caseId);
  });

  loadCase(caseId);

  if (shouldScroll) {
    const viewer = document.getElementById('case-gallery-container');
    if (viewer) {
      viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

function stepCase(delta) {
  const totalCases = Object.keys(caseStudiesData).length;
  let nextId = currentCaseId + delta;
  if (nextId < 1) nextId = totalCases;
  if (nextId > totalCases) nextId = 1;
  selectCase(nextId, false);
}

function getPhotoCategory(caption) {
  const text = caption || '';
  if (/外観|夕景|夜景|ファサード|テラス|中庭|ポーチ|車寄せ/.test(text)) return 'exterior';
  if (/LDK|リビング|居室|キッチン|寝室|畳|シアター|ライブラリー|ホール/.test(text)) return 'interior';
  if (/風呂|十和田石|手刻み|大工|建具|木組み|造作|引戸|エコカラット/.test(text)) return 'craft';
  if (/断熱|気密|耐震|太陽光|HEMS|温熱|計算|換気|ソーラー|骨組み|構造/.test(text)) return 'structure';
  return 'interior';
}

function loadCase(caseId) {
  currentCaseId = caseId;
  currentPhotoIndex = 0;
  const c = caseStudiesData[caseId];
  if (!c) return;

  // Update Case Viewer Header
  const numEl = document.getElementById('case-header-num');
  const titleEl = document.getElementById('case-header-title');
  const subEl = document.getElementById('case-header-sub');
  const allCountEl = document.getElementById('count-filter-all');

  if (numEl) numEl.textContent = `CASE ${String(caseId).padStart(2, '0')}`;
  if (titleEl) titleEl.textContent = c.title;
  if (subEl) subEl.textContent = c.sub;
  if (allCountEl) allCountEl.textContent = c.photos.length;

  // Update Triad Stories
  const clientEl = document.getElementById('case-story-client');
  const carpEl = document.getElementById('case-story-carpenter');
  const archEl = document.getElementById('case-story-architect');
  if (clientEl) clientEl.textContent = c.client;
  if (carpEl) carpEl.textContent = c.carpenter;
  if (archEl) archEl.textContent = c.architect;

  // Render thumbnails
  const strip = document.getElementById('case-thumbnails-strip');
  if (strip) {
    strip.innerHTML = '';
    c.photos.forEach((photo, idx) => {
      const category = getPhotoCategory(photo.caption);
      const thumb = document.createElement('div');
      thumb.className = `case-thumb-item ${idx === 0 ? 'active' : ''}`;
      thumb.setAttribute('data-idx', idx);
      thumb.setAttribute('data-category', category);
      thumb.title = photo.caption;
      thumb.innerHTML = `<img src="${photo.url}" alt="サムネイル ${idx + 1}" loading="lazy" />`;
      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        selectPhoto(idx);
      });
      strip.appendChild(thumb);
    });
  }

  applyThumbnailFilter();
  updateMainPhoto();
}

function applyThumbnailFilter() {
  const thumbs = document.querySelectorAll('.case-thumb-item');
  let firstVisibleIdx = -1;

  thumbs.forEach(t => {
    const cat = t.getAttribute('data-category');
    const idx = parseInt(t.getAttribute('data-idx'), 10);
    if (currentFilter === 'all' || cat === currentFilter) {
      t.style.display = 'block';
      if (firstVisibleIdx === -1) firstVisibleIdx = idx;
    } else {
      t.style.display = 'none';
    }
  });

  // If current photo is hidden under filter, switch to first visible
  if (currentFilter !== 'all' && firstVisibleIdx !== -1) {
    const currentThumb = document.querySelector(`.case-thumb-item[data-idx="${currentPhotoIndex}"]`);
    if (currentThumb && currentThumb.style.display === 'none') {
      selectPhoto(firstVisibleIdx);
    }
  }
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

  const thumbs = Array.from(document.querySelectorAll('.case-thumb-item'))
    .filter(t => t.style.display !== 'none');
  if (!thumbs.length) return;

  const currentVisiblePos = thumbs.findIndex(t => parseInt(t.getAttribute('data-idx'), 10) === currentPhotoIndex);
  let nextPos = currentVisiblePos !== -1 ? currentVisiblePos + delta : 0;
  if (nextPos < 0) nextPos = thumbs.length - 1;
  if (nextPos >= thumbs.length) nextPos = 0;

  const nextIdx = parseInt(thumbs[nextPos].getAttribute('data-idx'), 10);
  currentPhotoIndex = nextIdx;
  updateMainPhoto();
}

function toggleAutoplay() {
  const btn = document.getElementById('btn-autoplay');
  const textEl = document.getElementById('text-autoplay');
  if (isAutoplayRunning) {
    clearInterval(autoplayTimer);
    isAutoplayRunning = false;
    if (btn) btn.classList.remove('active');
    if (textEl) textEl.textContent = '自動再生';
  } else {
    isAutoplayRunning = true;
    if (btn) btn.classList.add('active');
    if (textEl) textEl.textContent = '停止';
    autoplayTimer = setInterval(() => {
      stepPhoto(1);
    }, 3200);
  }
}

function updateMainPhoto() {
  const c = caseStudiesData[currentCaseId];
  if (!c) return;
  const p = c.photos[currentPhotoIndex];
  if (!p) return;

  const imgEl = document.getElementById('case-main-img');
  const captionEl = document.getElementById('case-caption-text');
  const counterEl = document.getElementById('case-photo-counter');

  if (imgEl) {
    imgEl.style.opacity = '0.4';
    imgEl.src = p.url;
    setTimeout(() => {
      imgEl.style.opacity = '1';
    }, 80);
  }
  if (captionEl) captionEl.textContent = p.caption;
  if (counterEl) counterEl.textContent = `📸 写真 ${currentPhotoIndex + 1} / ${c.photos.length}枚`;

  // Update active thumbnail
  const thumbs = document.querySelectorAll('.case-thumb-item');
  thumbs.forEach(t => {
    const idx = parseInt(t.getAttribute('data-idx'), 10);
    if (idx === currentPhotoIndex) {
      t.classList.add('active');
      t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else {
      t.classList.remove('active');
    }
  });
}

// Global Window Export for Backward Compatibility
if (typeof window !== 'undefined') {
  window.caseStudiesData = caseStudiesData;
  window.initCaseStudiesGallery = initCaseStudiesGallery;
  window.selectCase = selectCase;
  window.stepCase = stepCase;
  window.loadCase = loadCase;
  window.applyThumbnailFilter = applyThumbnailFilter;
  window.selectPhoto = selectPhoto;
  window.stepPhoto = stepPhoto;
  window.toggleAutoplay = toggleAutoplay;
  window.updateMainPhoto = updateMainPhoto;
}
