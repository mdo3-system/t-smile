/**
 * 住ま居る 3D間取り工房 (MadoriSketch)
 * 建築空間マスター定数モジュール (Single Responsibility: Architectural Specifications)
 * 壁種別(4種+柱)、サッシ・建具(12種)、空間要素(吹き抜け・土間・小上り・畳・中庭・天井・多角形柱・直方体)、
 * 住宅設備・家具、およびメモ注釈用電気・照明記号の標準仕様を定義
 */
(function () {
    'use strict';

    // --- 部屋種別マスター定義 ---
    const ROOM_TYPES = {
        LDK: { label: 'LDK', color2d: '#fef3c7', stroke2d: '#d97706', floorType: 'wood', hasWall: true },
        YOSHITSU: { label: '洋室', color2d: '#ffedd5', stroke2d: '#ea580c', floorType: 'wood', hasWall: true },
        WASHITSU: { label: '和室', color2d: '#dcfce7', stroke2d: '#16a34a', floorType: 'tatami', hasWall: true },
        GENKAN: { label: '玄関', color2d: '#e2e8f0', stroke2d: '#475569', floorType: 'tile', hasWall: true },
        DOMA: { label: '玄関土間', color2d: '#cbd5e1', stroke2d: '#475569', floorType: 'doma', hasWall: false, levelMm: -180 },
        PORCH: { label: 'ポーチ', color2d: '#cbd5e1', stroke2d: '#64748b', floorType: 'porch', hasWall: false },
        ROUKA: { label: 'ホール・廊下', color2d: '#f3e8ff', stroke2d: '#9333ea', floorType: 'wood', hasWall: true },
        SENMEN: { label: '洗面脱衣', color2d: '#e0f2fe', stroke2d: '#0284c7', floorType: 'tile', hasWall: true },
        UB: { label: '浴室(UB)', color2d: '#cffafe', stroke2d: '#0891b2', floorType: 'tile', hasWall: true },
        TOILET: { label: 'トイレ', color2d: '#fae8ff', stroke2d: '#c026d3', floorType: 'tile', hasWall: true },
        WIC: { label: '収納・WIC', color2d: '#f1f5f9', stroke2d: '#64748b', floorType: 'wood', hasWall: true },
        BALCONY: { label: 'バルコニー', color2d: '#ecfccb', stroke2d: '#65a30d', floorType: 'balcony', hasWall: 'balcony' },
        VOID: { label: '吹き抜け', color2d: '#f8fafc', stroke2d: '#0284c7', floorType: 'void', hasWall: false },
        NAKANIWA: { label: '中庭', color2d: '#ecfdf5', stroke2d: '#10b981', floorType: 'courtyard', hasWall: false },
        KOAGARI: { label: '小上り(+30cm)', color2d: '#fef9c3', stroke2d: '#ca8a04', floorType: 'koagari', hasWall: false, levelMm: 300 },
        TATAMI: { label: '畳スペース', color2d: '#dcfce7', stroke2d: '#15803d', floorType: 'tatami', hasWall: false },
        TENJO: { label: '天井面', color2d: '#f1f5f9', stroke2d: '#94a3b8', floorType: 'ceiling', hasWall: false }
    };

    // --- 壁・境界線の種類 (4種 + 独立柱) ---
    const WALL_SUBTYPES = [
        { id: 'wall', label: '壁', desc: '通常の壁（外壁・間仕切り自動判定）', heightMm: 2550, sillMm: 0 },
        { id: 'tarekabe', label: 'たれ壁', desc: '天井から下がる垂れ壁（2Dは破線表示）', heightMm: 550, sillMm: 2000 },
        { id: 'koshikabe', label: '腰壁', desc: '高さ1,000mmの手すり壁・キッチン腰壁', heightMm: 1000, sillMm: 0 },
        { id: 'agarikamachi', label: '上り框', desc: '玄関土間とホールの段差框ライン', heightMm: 180, sillMm: 0 }
    ];

    // --- サッシ・建具 12種類マスター (左パレット2列×6行) ---
    const SASH_TYPES_12 = [
        { id: 'hikichigai', label: '引き違い', defaultWMm: 1650, defaultHMm: 2000, defaultSillMm: 0, leaves: 2, isWinDefault: true },
        { id: 'katabiki', label: '引き戸', defaultWMm: 800, defaultHMm: 2000, defaultSillMm: 0, leaves: 1, isWinDefault: false },
        { id: 'katahiraki', label: '片開き', defaultWMm: 800, defaultHMm: 2000, defaultSillMm: 0, leaves: 1, isWinDefault: false },
        { id: 'ryouhiraki', label: '両開き', defaultWMm: 1600, defaultHMm: 2000, defaultSillMm: 0, leaves: 2, isWinDefault: false },
        { id: 'oyako', label: '親子', defaultWMm: 1200, defaultHMm: 2200, defaultSillMm: 0, leaves: 2, isWinDefault: false },
        { id: 'fix', label: 'FIX', defaultWMm: 1650, defaultHMm: 1100, defaultSillMm: 900, leaves: 1, isWinDefault: true },
        { id: 'oredo', label: '折れ戸', defaultWMm: 1650, defaultHMm: 2000, defaultSillMm: 0, leaves: 2, isWinDefault: false },
        { id: 'closet', label: 'クローゼット', defaultWMm: 1650, defaultHMm: 2200, defaultSillMm: 0, leaves: 2, isWinDefault: false },
        { id: 'demado', label: '出窓', defaultWMm: 1650, defaultHMm: 1100, defaultSillMm: 900, leaves: 1, isWinDefault: true },
        { id: 'tatesuberi', label: '縦滑り出し', defaultWMm: 600, defaultHMm: 1100, defaultSillMm: 900, leaves: 1, isWinDefault: true },
        { id: 'yokosuberi', label: '横滑り出し', defaultWMm: 600, defaultHMm: 500, defaultSillMm: 1500, leaves: 1, isWinDefault: true },
        { id: 'agesage', label: '上げ下げ窓', defaultWMm: 600, defaultHMm: 1100, defaultSillMm: 900, leaves: 1, isWinDefault: true }
    ];

    // =========================================================================
    // 窓仕様 (Window Specifications)
    // =========================================================================
    const WINDOW_SPECS = {
        widths: [260, 360, 600, 740, 800, 1190, 1200, 1500, 1600, 1650, 2250, 2510, 2560, 3470],
        heights: [300, 500, 700, 900, 1100, 1300, 1500, 1800, 2000, 2200, 2400],
        defaultWidth: 1650,
        defaultHeight: 1100,
        color: '#0284c7'
    };

    // =========================================================================
    // 内部建具・玄関仕様 (Door Specifications)
    // =========================================================================
    const DOOR_SPECS = {
        leafWidths: [600, 700, 750, 800, 900, 1200, 1600, 1650],
        heights: [1000, 1400, 1800, 2000, 2200, 2400],
        leafCounts: [1, 2, 3, 4],
        styles: [
            { id: 'hikichigai', label: '引き違い', allowedLeaves: [2, 3, 4] },
            { id: 'katabiki', label: '引き戸(片引き)', allowedLeaves: [1] },
            { id: 'katahiraki', label: '片開き', allowedLeaves: [1] },
            { id: 'ryouhiraki', label: '両開き', allowedLeaves: [2] },
            { id: 'oyako', label: '親子ドア', allowedLeaves: [2] },
            { id: 'fix', label: 'FIX窓', allowedLeaves: [1] },
            { id: 'oredo', label: '折れ戸', allowedLeaves: [2, 4] },
            { id: 'closet', label: 'クローゼット', allowedLeaves: [2, 4] },
            { id: 'demado', label: '出窓', allowedLeaves: [1] },
            { id: 'tatesuberi', label: '縦滑り出し', allowedLeaves: [1] },
            { id: 'yokosuberi', label: '横滑り出し', allowedLeaves: [1] },
            { id: 'agesage', label: '上げ下げ窓', allowedLeaves: [1] },
            { id: 'hikikomi', label: '引込み戸', allowedLeaves: [1, 2] },
            { id: 'hikiwake', label: '引き分け戸', allowedLeaves: [2, 4] },
            { id: 'hiraki', label: '片開き戸', allowedLeaves: [1] },
            { id: 'genkan_slide', label: '玄関引き戸', allowedLeaves: [1, 2], isGenkan: true }
        ],
        defaultLeafWidth: 800,
        defaultHeight: 2000,
        defaultLeaves: 2,
        defaultStyle: 'hikichigai',
        color: '#10b981'
    };

    // =========================================================================
    // システムキッチン仕様 (Kitchen Specifications)
    // =========================================================================
    const KITCHEN_SPECS = {
        types: [
            { id: 'I', label: 'I型キッチン' },
            { id: 'L', label: 'L型キッチン' },
            { id: 'ISLAND', label: 'ペニンシュラ・アイランド' }
        ],
        iWidths: [1650, 1800, 1950, 2100, 2250, 2400, 2550, 2700, 2850, 3000],
        iDepths: [650, 600],
        heights: [800, 850, 900],
        lWidths: [1650, 1800, 1950, 2100, 2250, 2400, 2550],
        lDepth: 650,
        islandWidths: [1800, 1950, 2100, 2250, 2400, 2550, 2700, 3000],
        islandDefaultW: 2550,
        islandDefaultD: 900,
        islandDepths: [750, 800, 900, 970, 1000, 1050]
    };

    // =========================================================================
    // ユニットバス仕様 (Unit Bath Specifications)
    // =========================================================================
    const UB_SPECS = {
        sizes: [
            { id: '1216', label: '1216 (0.75坪)', wMm: 1200, dMm: 1600 },
            { id: '1317', label: '1317 (1317寸)', wMm: 1300, dMm: 1700 },
            { id: '1616', label: '1616 (1坪標準)', wMm: 1600, dMm: 1600 },
            { id: '1717', label: '1717 (1.25坪メーター)', wMm: 1700, dMm: 1700 },
            { id: '1620', label: '1620 (1.25坪ワイド)', wMm: 1600, dMm: 2000 },
            { id: '1623', label: '1623 (1.5坪ロング)', wMm: 1600, dMm: 2300 }
        ],
        patterns: [
            { id: 'patternA', label: 'パターンA (短手出入・対面浴槽)', doorSide: 'short' },
            { id: 'patternB', label: 'パターンB (長手出入・短手浴槽)', doorSide: 'long' }
        ]
    };

    // =========================================================================
    // 洗面化粧台仕様 (Vanity Specifications)
    // =========================================================================
    const VANITY_SPECS = {
        widths: [600, 750, 900, 1000, 1200, 1600],
        depth: 550,
        heights: [750, 800, 850]
    };

    // レガシー互換用の OPENING_TYPES 定義
    const OPENING_TYPES = {
        WINDOW: { label: '窓', widthP: 1.81, heightMm: 1100, sillMm: 900, color: '#0284c7', isWin: true },
        DOOR: { label: '建具', widthP: 1.76, heightMm: 2000, sillMm: 0, color: '#10b981', isWin: false },
        SWING_DOOR: { label: '片開き戸', widthP: 0.88, heightMm: 2000, sillMm: 0, color: '#10b981', isWin: false },
        SLIDING_DOOR: { label: '引き戸', widthP: 1.76, heightMm: 2000, sillMm: 0, color: '#10b981', isWin: false },
        FOLD_DOOR: { label: '折れ戸', widthP: 1.76, heightMm: 2000, sillMm: 0, color: '#10b981', isWin: false },
        ENTRANCE_DOOR: { label: '玄関戸', widthP: 1.32, heightMm: 2200, sillMm: 0, color: '#f59e0b', isWin: false },
        WIN_SLIDE: { label: '引違い窓', widthP: 1.81, heightMm: 1100, sillMm: 900, color: '#0284c7', isWin: true },
        WIN_FULL: { label: '掃出し窓', widthP: 1.81, heightMm: 2000, sillMm: 0, color: '#0284c7', isWin: true }
    };

    // --- 設備・家具・直方体マスター定義 ---
    const FIXTURE_TYPES = {
        KITCHEN: { label: 'システムキッチン', wP: 2.8, hP: 0.71, hMm: 850, color: '#cbd5e1', category: 'kitchen' },
        UB: { label: 'ユニットバス', wP: 1.76, hP: 1.76, hMm: 2150, color: '#bae6fd', category: 'ub' },
        VANITY: { label: '洗面化粧台', wP: 0.99, hP: 0.60, hMm: 800, color: '#e2e8f0', category: 'vanity' },
        TOILET_FIX: { label: 'トイレ便器', wP: 0.50, hP: 0.85, hMm: 780, color: '#f8fafc', category: 'toilet' },
        FRIDGE: { label: '冷蔵庫', wP: 0.75, hP: 0.75, hMm: 1820, color: '#e2e8f0', category: 'appliance' },
        WASHER: { label: '洗濯機', wP: 0.70, hP: 0.70, hMm: 1050, color: '#e0f2fe', category: 'appliance' },
        CUPBOARD: { label: 'カップボード', wP: 1.98, hP: 0.50, hMm: 850, color: '#f1f5f9', category: 'furniture' },
        CLOSET_UNIT: { label: '収納・家具', wP: 1.98, hP: 0.50, hMm: 2000, color: '#e2e8f0', category: 'furniture' },
        DINING_SET: { label: 'ダイニングセット', wP: 1.65, hP: 0.95, hMm: 720, color: '#fef3c7', category: 'furniture' },
        SOFA: { label: 'ソファ', wP: 2.00, hP: 0.90, hMm: 780, color: '#ffedd5', category: 'furniture' },
        TV_BOARD: { label: 'TVボード', wP: 1.80, hP: 0.45, hMm: 450, color: '#f1f5f9', category: 'furniture' },
        BED_DOUBLE: { label: 'ダブルベッド', wP: 1.55, hP: 2.15, hMm: 500, color: '#ede9fe', category: 'furniture' },
        BED_SINGLE: { label: 'シングルベッド', wP: 1.10, hP: 2.15, hMm: 500, color: '#e0e7ff', category: 'furniture' },
        DESK: { label: 'デスク・カウンター', wP: 1.32, hP: 0.55, hMm: 720, color: '#fef9c3', category: 'furniture' },
        BOX3D: { label: '四角(3D直方体)', wP: 1.00, hP: 1.00, hMm: 750, color: '#cbd5e1', category: 'box3d', levelMm: 0 },
        STAIR_STRAIGHT: { label: '直階段', wP: 1.00, hP: 3.50, hMm: 2730, color: '#fcd34d', category: 'stair' },
        STAIR_UTURN: { label: '折返し階段', wP: 2.00, hP: 2.00, hMm: 2730, color: '#fcd34d', category: 'stair' },
        STANDALONE_COL: { label: '独立柱(ポーチ・脚)', wP: 0.25, hP: 0.25, hMm: 2550, color: '#f8fafc', category: 'pillar' }
    };

    // --- メモ注釈用 電気・照明・設備記号マスター (第5章準拠) ---
    const MEMO_SYMBOL_SPECS = {
        switches: [
            { id: 'sw_single', label: '片切スイッチ', code: '●', desc: '標準スイッチ' },
            { id: 'sw_3way', label: '3路スイッチ', code: '●3', desc: '2箇所操作スイッチ' },
            { id: 'sw_4way', label: '4路スイッチ', code: '●4', desc: '3箇所以上操作スイッチ' },
            { id: 'sw_sensor', label: '人感センサーSW', code: '●S', desc: '自動点灯スイッチ' },
            { id: 'sw_dimmer', label: '調光スイッチ', code: '●D', desc: '明るさ調整スイッチ' },
            { id: 'sw_remote', label: '給湯・インターホンリモコン', code: '[R]', desc: '壁付リモコン' }
        ],
        outlets: [
            { id: 'out_2p', label: '2口コンセント', code: '🔌2', desc: '標準壁コンセント' },
            { id: 'out_earth', label: 'アース付コンセント', code: '🔌E', desc: '洗濯機・レンジ・冷蔵庫用' },
            { id: 'out_ac', label: 'エアコンコンセント', code: '🔌AC', desc: '高所100V/200Vエアコン用' },
            { id: 'out_wp', label: '防水コンセント', code: '🔌WP', desc: '外部・バルコニー用' },
            { id: 'out_multi', label: 'マルチメディア(TV/LAN)', code: '📺LAN', desc: 'TV端子＋LAN＋電源' },
            { id: 'out_floor', label: 'フロアコンセント', code: '🔌FL', desc: '床埋め込みコンセント' }
        ],
        lights: [
            { id: 'lt_down', label: 'ダウンライト', code: '○DL', desc: '天井埋込ダウンライト' },
            { id: 'lt_ceiling', label: '引掛シーリング', code: '◎CL', desc: '居室主照明シーリング' },
            { id: 'lt_pendant', label: 'ペンダントライト', code: '◈PD', desc: 'ダイニング・吹抜け吊下げ照明' },
            { id: 'lt_bracket', label: '壁付ブラケット', code: '◐BR', desc: '階段・玄関壁面照明' },
            { id: 'lt_line', label: '間接ライン照明', code: '═LL', desc: 'コーブ・コーニス間接照明' },
            { id: 'lt_fan', label: '換気扇・24h換気', code: '⊗VN', desc: '天井・壁面換気扇' },
            { id: 'lt_fire', label: '火災報知器', code: '◉FA', desc: '住宅用火災警報器' }
        ],
        compass: [
            { id: 'comp_n', label: '方位マーク (北=上)', angle: 0 },
            { id: 'comp_ne', label: '方位マーク (北東)', angle: 45 },
            { id: 'comp_e', label: '方位マーク (東=上)', angle: 90 },
            { id: 'comp_nw', label: '方位マーク (北西)', angle: -45 }
        ]
    };

    // グローバル公開
    window.ROOM_TYPES = ROOM_TYPES;
    window.WALL_SUBTYPES = WALL_SUBTYPES;
    window.SASH_TYPES_12 = SASH_TYPES_12;
    window.WINDOW_SPECS = WINDOW_SPECS;
    window.DOOR_SPECS = DOOR_SPECS;
    window.KITCHEN_SPECS = KITCHEN_SPECS;
    window.UB_SPECS = UB_SPECS;
    window.VANITY_SPECS = VANITY_SPECS;
    window.OPENING_TYPES = OPENING_TYPES;
    window.FIXTURE_TYPES = FIXTURE_TYPES;
    window.MEMO_SYMBOL_SPECS = MEMO_SYMBOL_SPECS;
})();
