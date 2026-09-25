const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const { createFloorPlanTopology, solve2DGeometry, renderFloorPlanSvg } = require('./floorplan_generator.js');

const dbPath = path.join(__dirname, 'sumaile.db');
const db = new DatabaseSync(dbPath);

// Ensure floor_plans table
db.exec(`
  CREATE TABLE IF NOT EXISTS floor_plans (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    stories INTEGER NOT NULL,
    area_sqm REAL NOT NULL,
    tsubo REAL NOT NULL,
    rooms TEXT NOT NULL,
    target_family TEXT NOT NULL,
    entrance_direction TEXT NOT NULL,
    features TEXT NOT NULL,
    description TEXT NOT NULL,
    rooms_summary TEXT NOT NULL,
    svg_1f TEXT NOT NULL,
    svg_2f TEXT,
    source TEXT DEFAULT '自社実績図面',
    scale_normalized INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );
`);

// 30 Diverse Plans (Under 150m2)
const SEED_DEFINITIONS = [
  // --- 平屋 (1F) 15プラン ---
  {
    id: 'plan_h01',
    title: '陽だまりの中庭テラスを囲む平屋',
    stories: 1,
    area_sqm: 85.2,
    tsubo: 25.8,
    rooms: '2LDK',
    target_family: '夫婦・単身',
    entrance_direction: '南入り',
    features: ['中庭テラス', '土間玄関', 'パントリー', '勾配天井'],
    description: 'リビングと主寝室のどちらからも中庭へアクセス可能。外部からの視線を遮りながら、一日中柔らかな自然光が降り注ぐ平屋プランです。',
    rooms_summary: 'LDK 18.0帖 / 主寝室 7.5帖 / 洋室 5.0帖 / パントリー / 洗面・浴室 / 玄関土間',
    genConfig: { stories: 1, tsubo: 26, lifestyle: 'family', tastes: ['natural', 'courtyard'] }
  },
  {
    id: 'plan_h02',
    title: '家事動線0分の回遊型コンパクト平屋',
    stories: 1,
    area_sqm: 76.5,
    tsubo: 23.1,
    rooms: '2LDK',
    target_family: '夫婦・単身',
    entrance_direction: '北入り',
    features: ['回遊動線', 'ファミリークローゼット', '室内干しスペース', 'アイランド風キッチン'],
    description: '玄関→パントリー→キッチン→洗面ランドリーが一直線につながる究極の家事ラク動線。無駄な廊下を徹底排除した機能美あふれる間取り。',
    rooms_summary: 'LDK 16.5帖 / 寝室 7.0帖 / ワークルーム 4.5帖 / FCL 3.0帖 / 洗面脱衣室',
    genConfig: { stories: 1, tsubo: 23, lifestyle: 'single_couple', tastes: ['modern', 'circulation'] }
  },
  {
    id: 'plan_h03',
    title: '土間リビングと薪ストーブのある自然派平屋',
    stories: 1,
    area_sqm: 92.4,
    tsubo: 28.0,
    rooms: '3LDK',
    target_family: '子育て3〜4人',
    entrance_direction: '南入り',
    features: ['土間リビング', '薪ストーブ', 'ウッドデッキ', '無垢杉床'],
    description: '庭と室内がフラットにつながる広々とした土間空間。アウトドアリビング感覚で休日を満喫できる自然素材満載の平屋です。',
    rooms_summary: '土間LDK 22.0帖 / 主寝室 6.5帖 / 子供部屋 4.5帖×2 / WIC 3.0帖',
    genConfig: { stories: 1, tsubo: 28, lifestyle: 'family', tastes: ['natural'] }
  },
  {
    id: 'plan_h04',
    title: 'コの字型ウッドデッキとつながる大開口平屋',
    stories: 1,
    area_sqm: 99.8,
    tsubo: 30.2,
    rooms: '3LDK',
    target_family: '子育て3〜4人',
    entrance_direction: '南入り',
    features: ['コの字型デッキ', 'アイランドキッチン', 'パントリー', '広々洗面'],
    description: '建物の中心にウッドデッキを配置し、どの部屋からも緑を感じられる設計。キッチンから全体が見渡せる安心の間取りです。',
    rooms_summary: 'LDK 20.0帖 / 主寝室 7.0帖 / 洋室 5.2帖×2 / パントリー / WIC',
    genConfig: { stories: 1, tsubo: 30, lifestyle: 'family', tastes: ['scandi', 'deck'] }
  },
  {
    id: 'plan_h05',
    title: 'ホテルライクなマスターベッドルームを持つ平屋',
    stories: 1,
    area_sqm: 88.0,
    tsubo: 26.6,
    rooms: '2LDK',
    target_family: '夫婦・単身',
    entrance_direction: '東入り',
    features: ['ホテルライク', '専用パウダールーム', 'ウォークインクローゼット', '間接照明'],
    description: '上質なホテルスイートを思わせる落ち着いた空間構成。寝室直結のプライベートバス・パウダーコーナーが日々の疲れを癒します。',
    rooms_summary: 'LDK 19.0帖 / 主寝室 9.0帖 / 趣味室 5.0帖 / 贅沢洗面 / WIC',
    genConfig: { stories: 1, tsubo: 27, lifestyle: 'single_couple', tastes: ['luxury'] }
  },
  {
    id: 'plan_h06',
    title: '畳ダイニングと小上がりコーナーのある和モダン平屋',
    stories: 1,
    area_sqm: 104.2,
    tsubo: 31.5,
    rooms: '3LDK',
    target_family: '子育て3〜4人',
    entrance_direction: '南入り',
    features: ['小上がり畳', '格子間仕切り', '和モダン', 'シューズクローク'],
    description: '素足でくつろげる畳ダイニング。段差を利用した大容量引き出し収納と、開放的な勾配天井が心地よい家族の団らんを演出します。',
    rooms_summary: '畳LDK 21.0帖 / 小上がり 3.5帖 / 主寝室 6.8帖 / 子供部屋 5.0帖×2',
    genConfig: { stories: 1, tsubo: 31, lifestyle: 'family', tastes: ['japanese'] }
  },
  {
    id: 'plan_h07',
    title: 'ファミリークローゼット中心の時短子育て平屋',
    stories: 1,
    area_sqm: 108.5,
    tsubo: 32.8,
    rooms: '3LDK+S',
    target_family: '子育て3〜4人',
    entrance_direction: '西入り',
    features: ['ファミリークローゼット', 'ランドリールーム', 'スタディコーナー', 'パントリー'],
    description: '洗う・干す・畳む・しまうが3歩で完結するランドリー＆大型FCL。帰宅後すぐに手洗いできる玄関動線も完備。',
    rooms_summary: 'LDK 19.5帖 / スタディ 2.0帖 / 主寝室 6.5帖 / 子供部屋 4.5帖×2 / FCL 4.0帖',
    genConfig: { stories: 1, tsubo: 33, lifestyle: 'family', tastes: ['circulation'] }
  },
  {
    id: 'plan_h08',
    title: 'セカンドライフを愉しむ趣味室付き平屋',
    stories: 1,
    area_sqm: 82.0,
    tsubo: 24.8,
    rooms: '2LDK',
    target_family: '夫婦・単身',
    entrance_direction: '南入り',
    features: ['防音・趣味室', 'バリアフリー', '引戸設計', '家庭菜園直結テラス'],
    description: '将来の安心を見据えた完全バリアフリー設計。趣味の音楽や絵画に没頭できる独立ルームと、庭いじりが楽しい土間勝手口。',
    rooms_summary: 'LDK 17.0帖 / 寝室 7.5帖 / 趣味室 5.5帖 / バリアフリー水回り',
    genConfig: { stories: 1, tsubo: 25, lifestyle: 'single_couple', tastes: ['barrier_free'] }
  },
  {
    id: 'plan_h09',
    title: '光庭（ライトウェル）が誘う全室南向き風平屋',
    stories: 1,
    area_sqm: 112.3,
    tsubo: 34.0,
    rooms: '3LDK',
    target_family: '子育て3〜4人',
    entrance_direction: '北入り',
    features: ['光庭', 'プライベートガーデン', 'アイランドキッチン', 'シューズクローク'],
    description: '北道路敷地でも明るく開放的な暮らしを実現。プライベートな光庭が各部屋へ均一な明るさと心地よい通風を届けます。',
    rooms_summary: 'LDK 21.5帖 / 光庭 4.0帖 / 主寝室 7.2帖 / 子供部屋 5.2帖×2 / SIC',
    genConfig: { stories: 1, tsubo: 34, lifestyle: 'family', tastes: ['modern'] }
  },
  {
    id: 'plan_h10',
    title: '独立テレワーク書斎と広々パントリーの平屋',
    stories: 1,
    area_sqm: 96.0,
    tsubo: 29.0,
    rooms: '3LDK',
    target_family: '子育て3〜4人',
    entrance_direction: '東入り',
    features: ['独立書斎', '防音配慮', '大容量パントリー', '屋根付きポーチ'],
    description: '在宅ワークに完全集中できる籠もり感のある独立書斎。買いだめにも余裕で対応できるパントリーが家事効率を高めます。',
    rooms_summary: 'LDK 19.0帖 / 書斎 3.0帖 / 主寝室 6.5帖 / 子供部屋 5.0帖×2 / パントリー',
    genConfig: { stories: 1, tsubo: 29, lifestyle: 'family', tastes: ['telework'] }
  },
  {
    id: 'plan_h11',
    title: '四季の庭を愛でる深軒（ふかのき）の平屋',
    stories: 1,
    area_sqm: 118.0,
    tsubo: 35.7,
    rooms: '3LDK',
    target_family: '子育て3〜4人',
    entrance_direction: '南入り',
    features: ['深い軒先', '縁側テラス', '天然無垢材', '呼吸する珪藻土'],
    description: '夏の日差しを遮り、冬の温もりを深く導く伝統の深軒デザイン。雨の日でも窓を開けて風を感じられる贅沢な平屋。',
    rooms_summary: 'LDK 22.0帖 / 縁側テラス / 主寝室 8.0帖 / 子供部屋 5.5帖×2 / WIC',
    genConfig: { stories: 1, tsubo: 36, lifestyle: 'family', tastes: ['natural', 'japanese'] }
  },
  {
    id: 'plan_h12',
    title: '回遊アイランドキッチンと広々脱衣室の平屋',
    stories: 1,
    area_sqm: 102.5,
    tsubo: 31.0,
    rooms: '3LDK',
    target_family: '子育て3〜4人',
    entrance_direction: '西入り',
    features: ['アイランドキッチン', '独立脱衣室', '回遊動線', '造作洗面'],
    description: '料理をしながら家族と会話が弾むオープンキッチン。脱衣室と洗面室を完全に分けたプライバシー重視の間取り。',
    rooms_summary: 'LDK 20.5帖 / 主寝室 6.8帖 / 洋室 5.0帖×2 / 独立洗面 / 脱衣室',
    genConfig: { stories: 1, tsubo: 31, lifestyle: 'family', tastes: ['circulation'] }
  },
  {
    id: 'plan_h13',
    title: 'ガレージから雨に濡れずに直通できる平屋',
    stories: 1,
    area_sqm: 124.0,
    tsubo: 37.5,
    rooms: '3LDK+S',
    target_family: '子育て3〜4人',
    entrance_direction: '北入り',
    features: ['ビルトインガレージ連動', '土間収納', 'パントリー直通', 'ワークスペース'],
    description: '愛車から直接勝手口・パントリーへ搬入可能。荷物の多い子育て世代や雨の日の買い物帰りに最大の威力を発揮します。',
    rooms_summary: 'LDK 21.0帖 / 主寝室 7.5帖 / 洋室 5.2帖×2 / 納戸 3.0帖 / SIC',
    genConfig: { stories: 1, tsubo: 38, lifestyle: 'family', tastes: ['garage'] }
  },
  {
    id: 'plan_h14',
    title: '完全同居配慮型のゆとり平屋（2世帯・親世代同居）',
    stories: 1,
    area_sqm: 138.5,
    tsubo: 41.9,
    rooms: '4LDK',
    target_family: '二世帯・同居',
    entrance_direction: '南入り',
    features: ['2世帯配慮', '音配慮壁', 'セカンドリビング', 'トイレ2箇所'],
    description: '親世帯と子世帯の寝室ゾーンをLDKで程よくセパレート。お互いの生活リズムを尊重しながら安心して暮らせる大型平屋。',
    rooms_summary: 'LDK 23.0帖 / 親寝室 8.0帖 / 子主寝室 7.0帖 / 洋室 5.0帖×2 / トイレ2箇所',
    genConfig: { stories: 1, tsubo: 42, lifestyle: 'twogeneration', tastes: ['barrier_free'] }
  },
  {
    id: 'plan_h15',
    title: 'ワンルーム感覚で可変するオープン平屋',
    stories: 1,
    area_sqm: 89.2,
    tsubo: 27.0,
    rooms: '2LDK〜3LDK可変',
    target_family: '夫婦・単身',
    entrance_direction: '東入り',
    features: ['可変間仕切り', 'オープンロフト', '高天井', 'ミニマルデザイン'],
    description: '普段は大空間のワンルーム、来客時や家族構成の変化に応じて引戸で2〜3室へフレキシブルに変化する賢い間取り。',
    rooms_summary: 'オープンLDK 24.0帖 / 可変主寝室 6.5帖 / フリースペース 5.5帖',
    genConfig: { stories: 1, tsubo: 27, lifestyle: 'single_couple', tastes: ['minimal'] }
  },

  // --- 2階建て (1F+2F) 15プラン ---
  {
    id: 'plan_2f01',
    title: '吹抜けリビングと見守りキッチンの王道子育て邸宅',
    stories: 2,
    area_sqm: 105.8,
    tsubo: 32.0,
    rooms: '3LDK',
    target_family: '子育て3〜4人',
    entrance_direction: '南入り',
    features: ['吹抜けリビング', 'リビング階段', 'パントリー', '2階ホールスタディ'],
    description: 'リビングの大きな吹抜けから2階の子供たちと声が届き合う設計。階段を必ずリビング経由にすることで自然な挨拶が生まれます。',
    rooms_summary: '1F: LDK 18.5帖, 洗面浴室, SIC / 2F: 主寝室 7.0帖(WIC), 洋室 5.0帖×2, ホール',
    genConfig: { stories: 2, tsubo: 32, lifestyle: 'family', tastes: ['open_living'] }
  },
  {
    id: 'plan_2f02',
    title: '帰宅動線とランドリールームが一直線の家事ラクハウス',
    stories: 2,
    area_sqm: 112.5,
    tsubo: 34.0,
    rooms: '4LDK',
    target_family: '子育て3〜4人',
    entrance_direction: '北入り',
    features: ['ただいま手洗い', 'ファミリークローゼット', '独立ランドリー', '対面キッチン'],
    description: '帰宅→シューズクローク→手洗い→部屋着に着替えがスムーズ。2階には独立した主寝室と十分な子供部屋を確保。',
    rooms_summary: '1F: LDK 19.0帖, 和室 4.5帖, FCL, 洗面 / 2F: 主寝室 7.5帖, 洋室 5.2帖×2',
    genConfig: { stories: 2, tsubo: 34, lifestyle: 'family', tastes: ['circulation'] }
  },
  {
    id: 'plan_2f03',
    title: '都市型スマート敷地に建つ採光最大化の2階リビング住宅',
    stories: 2,
    area_sqm: 95.0,
    tsubo: 28.7,
    rooms: '3LDK',
    target_family: '子育て3〜4人',
    entrance_direction: '東入り',
    features: ['2階リビング', '勾配天井', 'インナーバルコニー', 'ビルトイン駐輪スペース'],
    description: '住宅密集地でも周囲の視線を気にせず、青空と光を存分に取り込める2階LDK。バルコニーとフラットにつながり開放感抜群。',
    rooms_summary: '1F: 主寝室 6.8帖, 洋室 4.8帖×2, 浴室洗面 / 2F: 勾配天井LDK 21.0帖, バルコニー',
    genConfig: { stories: 2, tsubo: 29, lifestyle: 'family', tastes: ['modern'] }
  },
  {
    id: 'plan_2f04',
    title: 'ジャパンディスタイルの美学が宿る静謐な邸宅',
    stories: 2,
    area_sqm: 119.0,
    tsubo: 36.0,
    rooms: '3LDK+書斎',
    target_family: '子育て3〜4人',
    entrance_direction: '南入り',
    features: ['ジャパンディ', '格子壁', 'テレワーク書斎', 'アイランドキッチン'],
    description: '北欧の機能美と日本の伝統美が融合。落ち着きのある木の質感と無駄のないラインが上質な暮らしを紡ぎます。',
    rooms_summary: '1F: LDK 20.0帖, 籠もり書斎 3.0帖, 水回り / 2F: 主寝室 8.0帖, 子供部屋 5.5帖×2',
    genConfig: { stories: 2, tsubo: 36, lifestyle: 'family', tastes: ['scandi', 'japanese'] }
  },
  {
    id: 'plan_2f05',
    title: '畳コーナーで寛ぐ家族団らん重視の4LDK',
    stories: 2,
    area_sqm: 115.7,
    tsubo: 35.0,
    rooms: '4LDK',
    target_family: '子育て3〜4人',
    entrance_direction: '南入り',
    features: ['小上がり畳コーナー', 'キッチンパントリー', '大容量WIC', '2階トイレ'],
    description: 'LDKの一角に段差付きの畳コーナーを設置。お昼寝や洗濯物たたみ、キッズスペースとして多目的に活躍します。',
    rooms_summary: '1F: LDK 18.0帖 + 畳 3.5帖, 水回り / 2F: 主寝室 7.2帖, 洋室 5.0帖×2, 納戸',
    genConfig: { stories: 2, tsubo: 35, lifestyle: 'family', tastes: ['natural'] }
  },
  {
    id: 'plan_2f06',
    title: '2階にセカンドリビングを備えた自由度の高い住まい',
    stories: 2,
    area_sqm: 126.8,
    tsubo: 38.3,
    rooms: '4LDK',
    target_family: '子育て3〜4人',
    entrance_direction: '西入り',
    features: ['2Fファミリーライブラリー', 'セカンドリビング', '吹抜け', '大型SIC'],
    description: '1階は家族が集うメインLDK、2階ホールには本棚とソファを置いたセカンドリビング。家族が程よい距離感で過ごせる間取り。',
    rooms_summary: '1F: LDK 19.5帖, 畳室 4.5帖 / 2F: セカンドリビング 6.0帖, 主寝室 7.5帖, 洋室 5.0帖×2',
    genConfig: { stories: 2, tsubo: 38, lifestyle: 'family', tastes: ['open_living'] }
  },
  {
    id: 'plan_2f07',
    title: 'ホテルライク洗面とウォークスルークローゼットの2階建て',
    stories: 2,
    area_sqm: 109.0,
    tsubo: 33.0,
    rooms: '3LDK',
    target_family: '夫婦・単身',
    entrance_direction: '南入り',
    features: ['ホテルライク2ボウル洗面', 'ウォークスルーWIC', '間接照明', 'スケルトン階段'],
    description: '朝の身支度が優雅になる2人並んで使えるワイド洗面台。スッキリとしたスケルトン階段が空間のアクセントに。',
    rooms_summary: '1F: LDK 20.0帖, 高級洗面, 浴室 / 2F: 主寝室 8.5帖(ウォークスルーWIC), 洋室 6.0帖',
    genConfig: { stories: 2, tsubo: 33, lifestyle: 'single_couple', tastes: ['luxury'] }
  },
  {
    id: 'plan_2f08',
    title: '土間収納とパントリーが直結するアウトドア派の邸宅',
    stories: 2,
    area_sqm: 114.2,
    tsubo: 34.5,
    rooms: '3LDK+S',
    target_family: '子育て3〜4人',
    entrance_direction: '東入り',
    features: ['アウトドア土間', 'パントリー直通', 'ワークスペース', 'インナーテラス'],
    description: 'キャンプギアやベビーカーも余裕でしまえる大型土間。泥んこで帰ってきてもそのまま浴室へ直行できる動線を確保。',
    rooms_summary: '1F: LDK 19.0帖, 土間 3.5帖, パントリー 2.0帖 / 2F: 主寝室 7.0帖, 洋室 5.2帖×2, 納戸',
    genConfig: { stories: 2, tsubo: 35, lifestyle: 'family', tastes: ['outdoor'] }
  },
  {
    id: 'plan_2f09',
    title: '独立した客間和室を持つ格式ある和モダン2階建て',
    stories: 2,
    area_sqm: 132.5,
    tsubo: 40.0,
    rooms: '4LDK+和室',
    target_family: '二世帯・同居',
    entrance_direction: '南入り',
    features: ['独立客間和室', '床の間・障子', '2世帯対応', '広々ポーチ'],
    description: '玄関から直接案内できる本格和室を1階に配置。両親の宿泊や冠婚葬祭にも柔軟に対応できる落ち着きのある邸宅。',
    rooms_summary: '1F: LDK 20.0帖, 和室 6.0帖(床の間) / 2F: 主寝室 8.0帖, 洋室 5.5帖×2, 納戸 3.0帖',
    genConfig: { stories: 2, tsubo: 40, lifestyle: 'twogeneration', tastes: ['japanese'] }
  },
  {
    id: 'plan_2f10',
    title: 'テレワーク夫婦のための完全セパレートダブル書斎住宅',
    stories: 2,
    area_sqm: 117.8,
    tsubo: 35.6,
    rooms: '3LDK+2書斎',
    target_family: '子育て3〜4人',
    entrance_direction: '北入り',
    features: ['ダブル書斎', '防音仕様', '回遊キッチン', 'ランドリールーム'],
    description: '夫婦ともに在宅勤務でも、お互いのオンライン会議の声が干渉しない2つの独立したワークスペースを確保。',
    rooms_summary: '1F: LDK 19.0帖, 1F書斎 2.5帖, 水回り / 2F: 主寝室 7.0帖, 2F書斎 2.5帖, 洋室 5.0帖×2',
    genConfig: { stories: 2, tsubo: 36, lifestyle: 'family', tastes: ['telework'] }
  },
  {
    id: 'plan_2f11',
    title: '吹き抜けから空を仰ぐインナーパティオ（中庭）の家',
    stories: 2,
    area_sqm: 122.0,
    tsubo: 36.9,
    rooms: '3LDK',
    target_family: '子育て3〜4人',
    entrance_direction: '西入り',
    features: ['インナー中庭', 'プライベートコート', '吹き抜け', 'アイランドキッチン'],
    description: '外部の視線を完全にシャットアウトしながら、中庭から家中へ爽やかな光と風が循環するプライバシー重視設計。',
    rooms_summary: '1F: 中庭を囲むLDK 21.0帖, 水回り / 2F: 主寝室 7.5帖, 洋室 5.0帖×2, ホール吹抜け',
    genConfig: { stories: 2, tsubo: 37, lifestyle: 'family', tastes: ['courtyard'] }
  },
  {
    id: 'plan_2f12',
    title: '将来2室に分けられるフレキシブル子供部屋の家',
    stories: 2,
    area_sqm: 104.0,
    tsubo: 31.5,
    rooms: '3LDK（可変4LDK）',
    target_family: '子育て3〜4人',
    entrance_direction: '南入り',
    features: ['可変子供部屋', 'リビング階段', 'キッチン横ダイニング', 'シューズクローク'],
    description: '子供が小さいうちは広々としたワンルームプレイルーム、成長に合わせてドア2つと間仕切り壁で2部屋に分割可能。',
    rooms_summary: '1F: LDK 18.0帖, 洗面浴室 / 2F: 主寝室 7.0帖, 可変子供部屋 10.5帖(将来5.2帖×2)',
    genConfig: { stories: 2, tsubo: 32, lifestyle: 'family', tastes: ['circulation'] }
  },
  {
    id: 'plan_2f13',
    title: 'インナーバルコニーとアウトドアリビングを満喫する家',
    stories: 2,
    area_sqm: 128.5,
    tsubo: 38.9,
    rooms: '4LDK',
    target_family: '子育て3〜4人',
    entrance_direction: '南入り',
    features: ['屋根付き深バルコニー', 'バーベキューテラス', '大型パントリー', 'アイランドキッチン'],
    description: '雨の日でも濡れない奥行き2mのインナーバルコニー。気候の良い季節はアウトドアリビングとしてグランピング気分を。',
    rooms_summary: '1F: LDK 21.5帖, 和室 4.5帖 / 2F: 主寝室 8.0帖, 洋室 5.2帖×2, 深バルコニー',
    genConfig: { stories: 2, tsubo: 39, lifestyle: 'family', tastes: ['deck'] }
  },
  {
    id: 'plan_2f14',
    title: '上下分離型でプライバシーを保つ二世帯住宅（延床145㎡）',
    stories: 2,
    area_sqm: 145.2,
    tsubo: 43.9,
    rooms: '2LDK + 3LDK (二世帯)',
    target_family: '二世帯・同居',
    entrance_direction: '北入り',
    features: ['二世帯住宅', 'ミニキッチン2箇所', '遮音床仕様', '玄関共有'],
    description: '延床150㎡未満をフルに活かした二世帯プラン。1階に親世帯（LDK+寝室）、2階に子世帯（LDK+2室）を完全配置。',
    rooms_summary: '1F: 親LDK 14.0帖, 親寝室 6.0帖 / 2F: 子LDK 16.0帖, 主寝室 6.5帖, 子供部屋 5.0帖',
    genConfig: { stories: 2, tsubo: 44, lifestyle: 'twogeneration', tastes: ['barrier_free'] }
  },
  {
    id: 'plan_2f15',
    title: '吹き抜け梁と無垢床が美しいミニマルナチュラルハウス',
    stories: 2,
    area_sqm: 98.4,
    tsubo: 29.8,
    rooms: '3LDK',
    target_family: '夫婦・単身',
    entrance_direction: '東入り',
    features: ['化粧梁あらわし', '無垢オーク床', 'スチール階段', 'ミニマル収納'],
    description: '無駄を削ぎ落とした美しさと木の温もり。天井の高さを活かした化粧梁と開放的な空間が日常を豊かに演出します。',
    rooms_summary: '1F: LDK 18.5帖, 洗面浴室 / 2F: 主寝室 7.0帖(オープンWIC), 洋室 5.0帖×2',
    genConfig: { stories: 2, tsubo: 30, lifestyle: 'single_couple', tastes: ['natural', 'minimal'] }
  }
];

function seedDatabase() {
  console.log(`[Seed] Generating CAD topologies and rendering SVGs for ${SEED_DEFINITIONS.length} plans...`);
  
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO floor_plans (
      id, title, stories, area_sqm, tsubo, rooms, target_family,
      entrance_direction, features, description, rooms_summary,
      svg_1f, svg_2f, source, scale_normalized, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  let count = 0;
  for (const def of SEED_DEFINITIONS) {
    try {
      // Generate CAD Topology & Geometry
      const topology = createFloorPlanTopology({
        stories: def.stories,
        tsubo: Math.round(def.tsubo),
        lifestyle: def.genConfig.lifestyle,
        tastes: def.genConfig.tastes
      });
      const geometry = solve2DGeometry(topology);
      
      const svg1F = renderFloorPlanSvg(geometry, '1f');
      let svg2F = null;
      if (def.stories > 1) {
        svg2F = renderFloorPlanSvg(geometry, '2f');
      }

      insertStmt.run(
        def.id,
        def.title,
        def.stories,
        def.area_sqm,
        def.tsubo,
        def.rooms,
        def.target_family,
        def.entrance_direction,
        JSON.stringify(def.features),
        def.description,
        def.rooms_summary,
        svg1F,
        svg2F,
        '自社実績図面',
        1,
        new Date().toISOString()
      );
      count++;
    } catch (e) {
      console.error(`[Seed Error] Plan ${def.id}:`, e);
    }
  }

  console.log(`[Seed Complete] Successfully stored ${count} / ${SEED_DEFINITIONS.length} floor plans in SQLite!`);
}

seedDatabase();
