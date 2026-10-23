/**
 * 住ま居る 3D間取りスケッチ工房 (MadoriSketch)
 * 建築空間マスター定数モジュール (Single Responsibility: Architectural Specifications)
 * 部屋種別、窓寸法、建具寸法、および住宅設備（システムキッチン・UB・洗面台）の国内標準仕様を定義
 */
(function() {
    'use strict';

    // --- 部屋種別マスター定義 ---
    const ROOM_TYPES = {
        LDK:     { label: 'LDK',       color2d: '#fef3c7', stroke2d: '#d97706', floorType: 'wood',    hasWall: true },
        YOSHITSU:{ label: '洋室',      color2d: '#ffedd5', stroke2d: '#ea580c', floorType: 'wood',    hasWall: true },
        WASHITSU:{ label: '和室',      color2d: '#dcfce7', stroke2d: '#16a34a', floorType: 'tatami',  hasWall: true },
        GENKAN:  { label: '玄関',      color2d: '#e2e8f0', stroke2d: '#475569', floorType: 'tile',    hasWall: true },
        PORCH:   { label: 'ポーチ',    color2d: '#cbd5e1', stroke2d: '#64748b', floorType: 'porch',   hasWall: false },
        ROUKA:   { label: 'ホール・廊下', color2d: '#f3e8ff', stroke2d: '#9333ea', floorType: 'wood', hasWall: true },
        SENMEN:  { label: '洗面脱衣',  color2d: '#e0f2fe', stroke2d: '#0284c7', floorType: 'tile',    hasWall: true },
        UB:      { label: '浴室(UB)',  color2d: '#cffafe', stroke2d: '#0891b2', floorType: 'tile',    hasWall: true },
        TOILET:  { label: 'トイレ',    color2d: '#fae8ff', stroke2d: '#c026d3', floorType: 'tile',    hasWall: true },
        WIC:     { label: '収納・WIC', color2d: '#f1f5f9', stroke2d: '#64748b', floorType: 'wood',    hasWall: true },
        BALCONY: { label: 'バルコニー', color2d: '#ecfccb', stroke2d: '#65a30d', floorType: 'balcony', hasWall: 'balcony' },
        VOID:    { label: '吹抜',      color2d: '#1e293b', stroke2d: '#38bdf8', floorType: 'void',    hasWall: true }
    };

    // =========================================================================
    // 窓仕様 (Window Specifications)
    // 形状はすべて「窓」として統一。幅12種類 × 高さ11種類
    // =========================================================================
    const WINDOW_SPECS = {
        widths: [260, 360, 600, 740, 1190, 1500, 1600, 1650, 2250, 2510, 2560, 3470],
        heights: [300, 500, 700, 900, 1100, 1300, 1500, 1800, 2000, 2200, 2400],
        defaultWidth: 1650,
        defaultHeight: 1100,
        color: '#0284c7'
    };

    // =========================================================================
    // 内部建具・玄関仕様 (Door Specifications)
    // =========================================================================
    const DOOR_SPECS = {
        leafWidths: [600, 700, 800, 900],
        heights: [1000, 1400, 1800, 2000, 2200, 2400],
        leafCounts: [1, 2, 3, 4],
        styles: [
            { id: 'hikichigai', label: '引違い', allowedLeaves: [2, 3, 4] },
            { id: 'hikikomi',   label: '引込み', allowedLeaves: [1, 2] },
            { id: 'hikiwake',   label: '引き分け', allowedLeaves: [2, 4] },
            { id: 'katabiki',   label: '片引き戸', allowedLeaves: [1] },
            { id: 'hiraki',     label: '片開き戸', allowedLeaves: [1] },
            { id: 'genkan_slide', label: '玄関片引き戸', allowedLeaves: [1, 2], isGenkan: true }
        ],
        defaultLeafWidth: 800,
        defaultHeight: 2000,
        defaultLeaves: 2,
        defaultStyle: 'hikichigai',
        color: '#10b981'
    };

    // =========================================================================
    // システムキッチン仕様 (Kitchen Specifications)
    // I型: 幅165〜300cm(15cm刻み), 奥行60/65cm, 高さ80/85/90cm
    // L型: 片側165〜255cm(15cm刻み) × もう片側165〜255cm, 奥行65cm, 高さ80/85/90cm
    // アイランド/ペニンシュラ: 自由な矩形サイズ
    // =========================================================================
    const KITCHEN_SPECS = {
        types: [
            { id: 'I', label: 'I型キッチン' },
            { id: 'L', label: 'L型キッチン' },
            { id: 'ISLAND', label: 'ペニンシュラ・アイランド' }
        ],
        // I型 幅: 165〜300cm (15cm刻み)
        iWidths: [1650, 1800, 1950, 2100, 2250, 2400, 2550, 2700, 2850, 3000],
        iDepths: [650, 600],
        heights: [800, 850, 900],
        // L型 片側幅: 165〜255cm (15cm刻み)
        lWidths: [1650, 1800, 1950, 2100, 2250, 2400, 2550],
        lDepth: 650,
        // アイランド/ペニンシュラ デフォルト寸法
        islandDefaultW: 2550,
        islandDefaultD: 900,
        islandDepths: [750, 800, 900, 970, 1000, 1050]
    };

    // =========================================================================
    // ユニットバス仕様 (Unit Bath Specifications)
    // サイズ: 1216 / 1317 / 1616 / 1717 / 1620 / 1623
    // 出入口・浴槽配置: 各2パターン (パターンA: 短手出入口 / パターンB: 長手出入口)
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
    // 幅: 600 / 750 / 900 / 1000 / 1200 / 1600 mm
    // =========================================================================
    const VANITY_SPECS = {
        widths: [600, 750, 900, 1000, 1200, 1600],
        depth: 550,
        heights: [750, 800, 850]
    };

    // レガシー互換用の OPENING_TYPES 定義
    const OPENING_TYPES = {
        WINDOW: { label: '窓', widthP: 1.81, heightMm: 1100, sillMm: 900, color: '#0284c7', isWin: true },
        DOOR:   { label: '建具', widthP: 1.76, heightMm: 2000, sillMm: 0, color: '#10b981', isWin: false }
    };

    // --- 設備・家具・階段マスター定義 ---
    const FIXTURE_TYPES = {
        KITCHEN:        { label: 'システムキッチン', wP: 2.8, hP: 0.71, color: '#cbd5e1', category: 'kitchen' },
        UB:             { label: 'ユニットバス',     wP: 1.76, hP: 1.76, color: '#bae6fd', category: 'ub' },
        VANITY:         { label: '洗面化粧台',       wP: 0.99, hP: 0.60, color: '#e2e8f0', category: 'vanity' },
        TOILET_FIX:     { label: 'トイレ便器',       wP: 0.5, hP: 1.0, color: '#f8fafc', category: 'toilet' },
        STAIR_STRAIGHT: { label: '直階段',           wP: 1.0, hP: 3.5, color: '#fcd34d', category: 'stair' },
        STAIR_UTURN:    { label: '折返し階段',       wP: 2.0, hP: 2.0, color: '#fcd34d', category: 'stair' },
        CLOSET_UNIT:    { label: '収納・家具',       wP: 2.0, hP: 0.5, color: '#e2e8f0', category: 'furniture' },
        STANDALONE_COL: { label: '独立柱(ポーチ・脚)', wP: 0.25, hP: 0.25, color: '#f8fafc', category: 'pillar' }
    };

    // グローバル公開
    window.ROOM_TYPES = ROOM_TYPES;
    window.WINDOW_SPECS = WINDOW_SPECS;
    window.DOOR_SPECS = DOOR_SPECS;
    window.KITCHEN_SPECS = KITCHEN_SPECS;
    window.UB_SPECS = UB_SPECS;
    window.VANITY_SPECS = VANITY_SPECS;
    window.OPENING_TYPES = OPENING_TYPES;
    window.FIXTURE_TYPES = FIXTURE_TYPES;
})();
