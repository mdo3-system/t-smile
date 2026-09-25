// ===================================================================
// 株式会社住ま居る AI間取り自動生成エンジン (Floorplan Generator Engine)
// Multi-Agent Architecture: Interviewer, Planner, Validator
// Multi-Storey Support: B1F (地下) 〜 1F 〜 2F 〜 3F 〜 PH/屋上 (ペントハウス)
// Standards: 910mm尺モジュール直交幾何学ソルバー, SVG CAD描画, ISO-10303-21 3D BIM (IFC)
// ===================================================================

function generateId() {
  return 'fp_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
}

/**
 * Architectural Standard Room Dimensions, Colors & Finishes Catalog
 */
const ROOM_CATALOG = {
  // --- Common & 1F / 2F Rooms ---
  ldk: {
    name: 'LDK',
    color: '#ffffff',
    textColor: '#0f172a',
    borderColor: '#334155',
    defaultTsubo: 10.0,
    minWidth: 3640,
    minHeight: 5460
  },
  kitchen: {
    name: 'キッチン',
    color: '#ffffff',
    textColor: '#0f172a',
    borderColor: '#334155',
    defaultTsubo: 2.5,
    minWidth: 2730,
    minHeight: 1820
  },
  artisan_bath: {
    name: '浴室 (1616)',
    color: '#f0f9ff',
    textColor: '#0369a1',
    borderColor: '#0284c7',
    defaultTsubo: 1.0,
    minWidth: 1820,
    minHeight: 1820
  },
  unit_bath: {
    name: '浴室 (1616)',
    color: '#f0f9ff',
    textColor: '#0369a1',
    borderColor: '#0284c7',
    defaultTsubo: 1.0,
    minWidth: 1820,
    minHeight: 1820
  },
  washroom: {
    name: '洗面脱衣室',
    color: '#f8fafc',
    textColor: '#334155',
    borderColor: '#64748b',
    defaultTsubo: 1.0,
    minWidth: 1820,
    minHeight: 1820
  },
  toilet: {
    name: 'トイレ',
    color: '#f8fafc',
    textColor: '#334155',
    borderColor: '#64748b',
    defaultTsubo: 0.5,
    minWidth: 910,
    minHeight: 1820
  },
  entrance: {
    name: '玄関・SIC',
    color: '#f1f5f9',
    textColor: '#1e293b',
    borderColor: '#475569',
    defaultTsubo: 1.5,
    minWidth: 1820,
    minHeight: 1820
  },
  master_bed: {
    name: '主寝室',
    color: '#ffffff',
    textColor: '#0f172a',
    borderColor: '#334155',
    defaultTsubo: 4.0,
    minWidth: 3640,
    minHeight: 3640
  },
  bed_room: {
    name: '洋室',
    color: '#ffffff',
    textColor: '#0f172a',
    borderColor: '#334155',
    defaultTsubo: 3.0,
    minWidth: 2730,
    minHeight: 3640
  },
  tatami_room: {
    name: '和室',
    color: '#f7f9f0',
    textColor: '#1e293b',
    borderColor: '#475569',
    defaultTsubo: 3.0,
    minWidth: 2730,
    minHeight: 3640
  },
  garage: {
    name: 'ガレージ',
    color: '#f1f5f9',
    textColor: '#0f172a',
    borderColor: '#334155',
    defaultTsubo: 6.0,
    minWidth: 3640,
    minHeight: 5460
  },
  terrace: {
    name: 'バルコニー',
    color: '#f8fafc',
    textColor: '#1e293b',
    borderColor: '#475569',
    defaultTsubo: 2.0,
    minWidth: 2730,
    minHeight: 1820
  },

  // --- B1F (地下) Specific Rooms ---
  theater: {
    name: '地下防音シアタールーム (120インチ)',
    color: '#1e1b4b',
    textColor: '#c7d2fe',
    borderColor: '#6366f1',
    defaultTsubo: 5.0,
    minWidth: 4550,
    minHeight: 3640
  },
  wine_cellar: {
    name: '地下ワインセラー ＆ バー',
    color: '#3b0764',
    textColor: '#f5d0fe',
    borderColor: '#a855f7',
    defaultTsubo: 2.5,
    minWidth: 2730,
    minHeight: 2730
  },
  storage_b1: {
    name: '地下大容量ストレージ・防災備蓄庫',
    color: '#334155',
    textColor: '#f8fafc',
    borderColor: '#94a3b8',
    defaultTsubo: 3.0,
    minWidth: 2730,
    minHeight: 3640
  },
  music_room: {
    name: '地下防音音楽スタジオ・楽器室',
    color: '#172554',
    textColor: '#bfdbfe',
    borderColor: '#3b82f6',
    defaultTsubo: 4.0,
    minWidth: 3640,
    minHeight: 3640
  },

  // --- 3F & PH (屋上) Specific Rooms ---
  study_room: {
    name: '展望ワークスペース・書斎',
    color: '#f0fdfa',
    textColor: '#115e59',
    borderColor: '#14b8a6',
    defaultTsubo: 2.5,
    minWidth: 2730,
    minHeight: 2730
  },
  balcony_view: {
    name: '3F 眺望パノラマバルコニー',
    color: '#f0f9ff',
    textColor: '#0369a1',
    borderColor: '#0284c7',
    defaultTsubo: 2.0,
    minWidth: 3640,
    minHeight: 1820
  },
  ph_stair: {
    name: 'ペントハウス塔屋・屋上出入口',
    color: '#f8fafc',
    textColor: '#0f172a',
    borderColor: '#475569',
    defaultTsubo: 2.0,
    minWidth: 1820,
    minHeight: 3640
  },
  roof_terrace: {
    name: 'スカイルーフテラス (星空天体観測デッキ)',
    color: '#ecfdf5',
    textColor: '#065f46',
    borderColor: '#10b981',
    defaultTsubo: 8.0,
    minWidth: 5460,
    minHeight: 4550
  },
  roof_bbq: {
    name: '屋上BBQテラス ＆ スカイガーデン',
    color: '#fff7ed',
    textColor: '#9a3412',
    borderColor: '#f97316',
    defaultTsubo: 4.0,
    minWidth: 3640,
    minHeight: 3640
  }
};

/**
 * 1. Plan Topology Generator supporting B1F to 3F + PH
 */
function createFloorPlanTopology(params = {}) {
  const {
    houseType = '2story',          // 'flat', '2story', '3story', '3story_ph', 'basement_2story', 'basement_3story_ph'
    stories: rawStories,           // 1, 2, 3
    hasBasement: rawHasBasement,   // boolean
    hasRoofPH: rawHasRoofPH,       // boolean
    bathType = 'artisan',          // 'artisan' or 'unit'
    interiorStyle = 'natural',     // 'natural' or 'modern'
    totalTsubo: rawTsubo,
    features = [],                 // ['theater', 'wine', 'garage', 'tatami', 'stove', 'terrace', 'roof_bbq', 'study']
    customNotes = ''
  } = params;

  // Determine floor structure
  let stories = 2;
  if (rawStories) {
    stories = parseInt(rawStories, 10);
  } else if (houseType.includes('flat') || houseType.includes('平屋')) {
    stories = 1;
  } else if (houseType.includes('3story') || houseType.includes('3階')) {
    stories = 3;
  }

  const hasBasement = (rawHasBasement !== undefined) ? !!rawHasBasement :
    (houseType.includes('basement') || houseType.includes('地下') || features.includes('theater') || features.includes('wine'));

  const hasRoofPH = (rawHasRoofPH !== undefined) ? !!rawHasRoofPH :
    (houseType.includes('ph') || houseType.includes('屋上') || features.includes('roof') || features.includes('roof_bbq') || stories === 3);

  const rooms = [];

  // =========================================================
  // LEVEL B1F: Underground Theater & Private Sanctuary
  // =========================================================
  if (hasBasement) {
    rooms.push({
      id: 'theater_1',
      type: 'theater',
      name: '地下防音シアタールーム (120インチ)',
      level: 'b1',
      tsubo: 6.0,
      materials: '特注吸音木毛セメント板 ＋ 遮音防音ドア ＋ 120型スクリーン',
      adjacentTo: ['wine_cellar_1', 'storage_b1_1']
    });

    rooms.push({
      id: 'wine_cellar_1',
      type: 'wine_cellar',
      name: '地下ワインセラー ＆ バーカウンター',
      level: 'b1',
      tsubo: 2.5,
      materials: '恒温恒湿調湿木壁 ＋ 国産ヒノキバーカウンター',
      adjacentTo: ['theater_1']
    });

    rooms.push({
      id: 'storage_b1_1',
      type: 'storage_b1',
      name: '大容量地下ストレージ・防災備蓄室',
      level: 'b1',
      tsubo: 2.5,
      materials: '珪藻土調湿壁 ＋ スチール可動棚',
      adjacentTo: ['theater_1']
    });

    if (features.includes('music')) {
      rooms.push({
        id: 'music_room_1',
        type: 'music_room',
        name: '地下防音音楽スタジオ・楽器室',
        level: 'b1',
        tsubo: 3.5,
        materials: '浮き床遮音構造 ＋ 音響反射拡散パネル',
        adjacentTo: ['theater_1']
      });
    }
  }

  // =========================================================
  // LEVEL 1F: 玄関・水回り（1616浴室・洗面・トイレ）・LDK
  // =========================================================
  rooms.push({
    id: 'entrance_1',
    type: 'entrance',
    name: '玄関・SIC',
    level: '1f',
    tsubo: 2.0,
    materials: '玄関土間タイル・大型シューズインクローゼット',
    adjacentTo: ['washroom_1', 'toilet_1']
  });

  // Bath & Washroom (現代標準の1616システムバス ＆ 洗面脱衣室)
  rooms.push({
    id: 'washroom_1',
    type: 'washroom',
    name: '洗面脱衣室',
    level: '1f',
    tsubo: 1.5,
    materials: 'シャンプードレッサー・洗濯パン・リネン収納',
    adjacentTo: ['unit_bath_1']
  });

  rooms.push({
    id: 'unit_bath_1',
    type: 'unit_bath',
    name: '浴室 (1616)',
    level: '1f',
    tsubo: 1.0,
    materials: '1坪タイプ 1600×1600 システムバス（半身浴ステップ浴槽）',
    adjacentTo: ['washroom_1']
  });

  rooms.push({
    id: 'toilet_1',
    type: 'toilet',
    name: '1F トイレ',
    level: '1f',
    tsubo: 1.0,
    materials: 'タンクレストイレ・手洗いカウンター',
    adjacentTo: ['entrance_1']
  });

  // 1F Living vs 2F Living placement
  if (stories <= 2) {
    rooms.push({
      id: 'ldk_1',
      type: 'ldk',
      name: 'LDK (約20.0帖)',
      level: '1f',
      tsubo: stories === 1 ? 11.0 : 10.0,
      materials: '対面壁付けキッチン・ダイニング・リビング',
      adjacentTo: ['entrance_1', 'washroom_1']
    });
  } else {
    // 3-story: 1F 和室 / 洋室
    rooms.push({
      id: 'guest_room_1',
      type: 'tatami_room',
      name: '和室 (約6.0帖)',
      level: '1f',
      tsubo: 3.5,
      materials: 'へりなし畳・押入',
      adjacentTo: ['entrance_1']
    });
  }

  if (features.includes('garage')) {
    rooms.push({
      id: 'garage_1',
      type: 'garage',
      name: 'ビルトインガレージ',
      level: '1f',
      tsubo: 6.0,
      materials: '土間コンクリート・電動シャッター',
      adjacentTo: ['entrance_1']
    });
  }

  if (stories <= 2 && features.includes('tatami')) {
    rooms.push({
      id: 'tatami_1',
      type: 'tatami_room',
      name: '和室 (約6.0帖)',
      level: '1f',
      tsubo: 3.0,
      materials: 'へりなし畳・押入',
      adjacentTo: ['ldk_1']
    });
  }

  // =========================================================
  // LEVEL 2F: 主寝室・洋室・2Fトイレ / 3階建て時は2F LDK
  // =========================================================
  if (stories === 2) {
    rooms.push({
      id: 'master_bed_1',
      type: 'master_bed',
      name: '主寝室 (約8.0帖・WIC付)',
      level: '2f',
      tsubo: 4.5,
      materials: 'フローリング・ウォークインクローゼット',
      adjacentTo: ['bed_room_2']
    });

    rooms.push({
      id: 'bed_room_2',
      type: 'bed_room',
      name: '洋室 (約6.0帖)',
      level: '2f',
      tsubo: 3.0,
      materials: 'フローリング・クローゼット',
      adjacentTo: ['master_bed_1']
    });

    rooms.push({
      id: 'toilet_2',
      type: 'toilet',
      name: '2F トイレ',
      level: '2f',
      tsubo: 1.0,
      materials: '温水洗浄便座',
      adjacentTo: ['master_bed_1']
    });
  } else if (stories >= 3) {
    rooms.push({
      id: 'ldk_1',
      type: 'ldk',
      name: '2F LDK (約22.0帖)',
      level: '2f',
      tsubo: 11.0,
      materials: '開放的リビング・ダイニング',
      adjacentTo: ['kitchen_1', 'terrace_1']
    });

    rooms.push({
      id: 'kitchen_1',
      type: 'kitchen',
      name: 'キッチン ＆ パントリー',
      level: '2f',
      tsubo: 2.5,
      materials: '対面カウンターキッチン・食器棚・食品庫',
      adjacentTo: ['ldk_1']
    });

    rooms.push({
      id: 'terrace_1',
      type: 'terrace',
      name: 'バルコニー',
      level: '2f',
      tsubo: 2.0,
      materials: '屋外防水テラス',
      adjacentTo: ['ldk_1']
    });

    rooms.push({
      id: 'toilet_2',
      type: 'toilet',
      name: '2F トイレ',
      level: '2f',
      tsubo: 1.0,
      materials: '温水洗浄便座',
      adjacentTo: ['ldk_1']
    });
  }

  // =========================================================
  // LEVEL 3F: 主寝室・洋室・書斎・バルコニー (3階建て)
  // =========================================================
  if (stories >= 3) {
    rooms.push({
      id: 'master_bed_1',
      type: 'master_bed',
      name: '3F 主寝室 (約8.0帖・WIC付)',
      level: '3f',
      tsubo: 4.5,
      materials: 'ウォークインクローゼット',
      adjacentTo: ['study_room_1', 'balcony_3f']
    });

    rooms.push({
      id: 'bed_room_2',
      type: 'bed_room',
      name: '3F 洋室 (約6.0帖)',
      level: '3f',
      tsubo: 3.0,
      materials: 'クローゼット',
      adjacentTo: ['master_bed_1']
    });

    rooms.push({
      id: 'study_room_1',
      type: 'study_room',
      name: '3F ワークスペース・書斎',
      level: '3f',
      tsubo: 2.5,
      materials: 'カウンターデスク・収納本棚',
      adjacentTo: ['master_bed_1']
    });

    rooms.push({
      id: 'balcony_3f',
      type: 'balcony_view',
      name: '3F バルコニー',
      level: '3f',
      tsubo: 2.0,
      materials: 'アルミ手摺・FRP防水床',
      adjacentTo: ['master_bed_1']
    });

    rooms.push({
      id: 'toilet_3',
      type: 'toilet',
      name: '3F レストルーム',
      level: '3f',
      tsubo: 1.0,
      materials: 'コンパクト手洗い付き',
      adjacentTo: ['master_bed_1']
    });
  }

  // =========================================================
  // LEVEL PH (屋上・ペントハウス): Sky Roof Terrace & Astronomy Deck
  // =========================================================
  if (hasRoofPH) {
    rooms.push({
      id: 'ph_stair_1',
      type: 'ph_stair',
      name: 'ペントハウス塔屋・屋上出入口',
      level: 'ph',
      tsubo: 2.0,
      materials: '高断熱防犯アルミドア・ガラス天窓',
      adjacentTo: ['roof_terrace_1']
    });

    rooms.push({
      id: 'roof_terrace_1',
      type: 'roof_terrace',
      name: 'スカイルーフテラス (星空天体観測デッキ)',
      level: 'ph',
      tsubo: 7.0,
      materials: '耐久性ウッドデッキ ＋ 高耐候人工芝 ＋ 110cm安全手摺',
      adjacentTo: ['ph_stair_1', 'roof_bbq_1']
    });

    rooms.push({
      id: 'roof_bbq_1',
      type: 'roof_bbq',
      name: '屋上BBQテラス ＆ スカイガーデン',
      level: 'ph',
      tsubo: 3.5,
      materials: 'ステンレスアウトドアシンク ＋ 屋外耐候電源 ＋ 植栽プランター',
      adjacentTo: ['roof_terrace_1']
    });
  }

  // Calculate estimated total tsubo
  const calculatedTsubo = rooms.reduce((acc, r) => acc + (r.tsubo || 2.5), 0);

  // Active level keys in logical vertical order: B1F -> 1F -> 2F -> 3F -> PH
  const activeLevelKeys = [];
  if (hasBasement) activeLevelKeys.push('b1');
  activeLevelKeys.push('1f');
  if (stories >= 2) activeLevelKeys.push('2f');
  if (stories >= 3) activeLevelKeys.push('3f');
  if (hasRoofPH) activeLevelKeys.push('ph');

  return {
    planId: generateId(),
    title: `住ま居る 芳彩自由設計プラン (${hasBasement ? '地下1階・' : ''}${stories}階建て${hasRoofPH ? '＋PH屋上' : ''})`,
    houseType: `${hasBasement ? '地下1階・' : ''}${stories === 1 ? '平屋' : stories + '階建て'}${hasRoofPH ? '＋PH屋上' : ''}`,
    stories,
    hasBasement,
    hasRoofPH,
    activeLevelKeys,
    bathType: bathType === 'artisan' ? '職人造作風呂' : 'システムユニットバス',
    interiorStyle: interiorStyle === 'natural' ? '自然素材仕様 (吉野杉・漆喰)' : '標準仕様',
    totalTsubo: rawTsubo || Math.round(calculatedTsubo),
    features,
    customNotes,
    rooms
  };
}

/**
 * 2. Multi-Storey 2D Vector Geometry Solver (Shapely-like millimetric grid packing)
 */
function solve2DGeometry(topology) {
  const activeKeys = topology.activeLevelKeys || ['1f'];
  const levels = {};

  activeKeys.forEach(levelKey => {
    const floorRooms = topology.rooms.filter(r => r.level === levelKey);

    // Floor Dimensions (mm) based on level
    let widthMm = 10920;  // 12 modules = 10.92m
    let heightMm = 7280;  // 8 modules = 7.28m

    if (levelKey === 'b1') {
      widthMm = 9100;
      heightMm = 6370;
    } else if (levelKey === '3f') {
      widthMm = 9100;
      heightMm = 5460;
    } else if (levelKey === 'ph') {
      widthMm = 9100;
      heightMm = 5460;
    }

    const layoutFloor = {
      levelKey,
      levelLabel: getLevelLabel(levelKey),
      widthMm,
      heightMm,
      rooms: []
    };

    // Calculate orthogonal positions based on room IDs
    floorRooms.forEach(room => {
      let x = 0, y = 0, w = 2730, h = 2730;

      // --- B1F Layout ---
      if (levelKey === 'b1') {
        if (room.id === 'theater_1') {
          x = 0; y = 0; w = 5460; h = 3640;
        } else if (room.id === 'wine_cellar_1') {
          x = 5460; y = 0; w = 3640; h = 2730;
        } else if (room.id === 'storage_b1_1') {
          x = 5460; y = 2730; w = 3640; h = 3640;
        } else if (room.id === 'music_room_1') {
          x = 0; y = 3640; w = 3640; h = 2730;
        } else {
          x = 1820; y = 3640; w = 3640; h = 2730;
        }
      }
      // --- 1F Layout ---
      else if (levelKey === '1f') {
        const hasGarage = floorRooms.some(r => r.id === 'garage_1');
        const offsetX = hasGarage ? 3640 : 0;

        if (room.id === 'garage_1') {
          x = 0; y = 0; w = 3640; h = 7280;
        } else if (room.id === 'entrance_1') {
          x = offsetX; y = 3640; w = 1820; h = 3640;
        } else if (room.id === 'toilet_1') {
          x = offsetX; y = 1820; w = 1820; h = 1820;
        } else if (room.id === 'washroom_1') {
          x = offsetX + 5460; y = 0; w = 1820; h = 2730;
        } else if (room.id.includes('bath')) {
          x = offsetX + 7280; y = 0; w = 2730; h = 2730;
        } else if (room.id === 'tatami_1' || room.id === 'guest_room_1') {
          x = offsetX + 7280; y = 2730; w = 2730; h = 3640;
        } else if (room.id === 'ldk_1') {
          x = offsetX + 1820; y = 0; w = 5460; h = 5460;
        } else {
          x = offsetX + 1820; y = 0; w = 3640; h = 3640;
        }
      }
      // --- 2F Layout ---
      else if (levelKey === '2f') {
        if (room.id === 'ldk_1') {
          // 3-story LDK
          x = 0; y = 0; w = 6370; h = 5460;
        } else if (room.id === 'kitchen_1') {
          x = 6370; y = 0; w = 2730; h = 2730;
        } else if (room.id === 'terrace_1') {
          x = 6370; y = 2730; w = 2730; h = 2730;
        } else if (room.id === 'toilet_2') {
          x = 4550; y = 3640; w = 1820; h = 1820;
        } else if (room.id === 'master_bed_1') {
          x = 0; y = 0; w = 4550; h = 4550;
        } else if (room.id === 'bed_room_2') {
          x = 4550; y = 0; w = 3640; h = 3640;
        } else {
          x = 4550; y = 3640; w = 3640; h = 1820;
        }
      }
      // --- 3F Layout ---
      else if (levelKey === '3f') {
        if (room.id === 'master_bed_1') {
          x = 0; y = 0; w = 4550; h = 3640;
        } else if (room.id === 'bed_room_2') {
          x = 4550; y = 0; w = 3640; h = 3640;
        } else if (room.id === 'study_room_1') {
          x = 0; y = 3640; w = 3640; h = 1820;
        } else if (room.id === 'balcony_3f') {
          x = 3640; y = 3640; w = 3640; h = 1820;
        } else if (room.id === 'toilet_3') {
          x = 7280; y = 3640; w = 1820; h = 1820;
        } else {
          x = 0; y = 0; w = 3640; h = 3640;
        }
      }
      // --- PH / 屋上 Layout ---
      else if (levelKey === 'ph') {
        if (room.id === 'ph_stair_1') {
          x = 0; y = 0; w = 2730; h = 2730;
        } else if (room.id === 'roof_terrace_1') {
          x = 2730; y = 0; w = 6370; h = 5460;
        } else if (room.id === 'roof_bbq_1') {
          x = 0; y = 2730; w = 2730; h = 2730;
        } else {
          x = 0; y = 0; w = 4550; h = 4550;
        }
      }

      const catalog = ROOM_CATALOG[room.type] || ROOM_CATALOG.ldk;

      layoutFloor.rooms.push({
        ...room,
        bounds: { x, y, w, h },
        areaM2: ((w * h) / 1000000).toFixed(2),
        areaJou: (((w * h) / 1000000) / 1.65).toFixed(1),
        style: {
          fill: catalog.color,
          stroke: catalog.borderColor,
          textColor: catalog.textColor
        }
      });
    });

    levels[levelKey] = layoutFloor;
  });

  return {
    planId: topology.planId,
    houseType: topology.houseType,
    totalTsubo: topology.totalTsubo,
    activeLevelKeys: activeKeys,
    levels,
    // Backwards compatibility shortcuts
    level1: levels['1f'],
    level2: levels['2f'] || null
  };
}

function getLevelLabel(key) {
  switch (key) {
    case 'b1': return 'B1F 地下階';
    case '1f': return '1F 平面図';
    case '2f': return '2F 平面図';
    case '3f': return '3F 平面図';
    case 'ph': return 'PH・屋上ルーフテラス';
    default: return `${key.toUpperCase()} 平面図`;
  }
}

/**
 * 3. High-Definition Real Estate Floor Plan Generator (不動産チラシ・マイソク水準)
 * Standards:
 * - 910mm尺モジュール & 455mm補助方眼グリッド
 * - 壁厚 130mm統一 (木造標準)
 * - 住宅設備機器の正しい配置 (壁付け対面キッチン, 壁付け正方向トイレ, 1616大型ユニットバス)
 * - 住ま居る独自仕様の全排除 (自由な個人設計に特化)
 * - 耐震等級3・温熱環境・構造スペックの非表示
 * - 外周2段寸法線 (スパン寸法 + 総間口/総奥行) & 通り芯記号 (X1..., Y1...)
 * - ドア (90度開閉軌跡アーク) & 窓サッシ (複線サッシ) の自動配置
 */
function renderFloorPlanSvg(geometry, levelKey = '1f') {
  // Normalize levelKey
  let key = String(levelKey).toLowerCase();
  if (key === '1') key = '1f';
  if (key === '2') key = '2f';
  if (key === '3') key = '3f';

  const floor = geometry.levels ? geometry.levels[key] : (key === '2f' ? geometry.level2 : geometry.level1);
  if (!floor) return `<svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg"><text x="400" y="200" text-anchor="middle" font-size="24" fill="#94a3b8">該当フロア（${getLevelLabel(key)}）の設計はありません</text></svg>`;

  const pad = 1200; // 外周寸法線および通り芯用マージン (mm)
  const totalW = floor.widthMm + pad * 2;
  const totalH = floor.heightMm + pad * 2;
  const WALL_THICK = 130; // 壁厚 130mm

  // Collect unique column grid lines (910mm module intervals)
  const xGridPositions = [];
  for (let x = 0; x <= floor.widthMm; x += 910) {
    xGridPositions.push(x);
  }
  if (!xGridPositions.includes(floor.widthMm)) xGridPositions.push(floor.widthMm);

  const yGridPositions = [];
  for (let y = 0; y <= floor.heightMm; y += 910) {
    yGridPositions.push(y);
  }
  if (!yGridPositions.includes(floor.heightMm)) yGridPositions.push(floor.heightMm);

  let svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="100%" height="100%" style="background: #fdfdfd; font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;">
    <defs>
      <!-- 910mm尺モジュール主グリッド & 455mm補助グリッド -->
      <pattern id="gridPattern" width="910" height="910" patternUnits="userSpaceOnUse">
        <!-- 455mm 補助方眼線 (薄い点線) -->
        <path d="M 455 0 L 455 910 M 0 455 L 910 455" fill="none" stroke="#f0eded" stroke-width="8" stroke-dasharray="14,14"/>
        <!-- 910mm 主方眼線 -->
        <path d="M 910 0 L 0 0 0 910" fill="none" stroke="#e2dede" stroke-width="12"/>
      </pattern>

      <!-- 和室用 琉球畳・へりなし畳 市松目地パターン -->
      <pattern id="tatamiGrid" width="910" height="910" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="910" height="910" fill="#f7faf2" stroke="#d5dfcb" stroke-width="4"/>
        <line x1="0" y1="455" x2="910" y2="455" stroke="#cad7be" stroke-width="6"/>
        <line x1="455" y1="0" x2="455" y2="910" stroke="#cad7be" stroke-width="6"/>
      </pattern>

      <!-- フローリング板目パターン (淡く上品なライン) -->
      <pattern id="woodPlank" width="1820" height="150" patternUnits="userSpaceOnUse">
        <line x1="0" y1="150" x2="1820" y2="150" stroke="#f1ece4" stroke-width="3"/>
      </pattern>

      <!-- 建築図面標準 スラッシュ端末記号 (45度) -->
      <marker id="slashMarker" markerWidth="20" markerHeight="20" refX="10" refY="10" orient="auto">
        <line x1="3" y1="17" x2="17" y2="3" stroke="#334155" stroke-width="3"/>
      </marker>

      <!-- 建物ベースのドロップシャドウ -->
      <filter id="buildingShadow" x="-2%" y="-2%" width="104%" height="104%">
        <feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="#0f172a" flood-opacity="0.08"/>
      </filter>
    </defs>

    <!-- 1. 全面背景 910mm方眼グリッド -->
    <rect x="0" y="0" width="${totalW}" height="${totalH}" fill="url(#gridPattern)"/>

    <!-- 2. 通り芯グリッド線 (一点鎖線) と 通り芯記号 (X1, X2... / Y1, Y2...) -->
    <!-- X方向 通り芯 (Vertical grid lines & Bubbles) -->
  `;

  xGridPositions.forEach((xPos, idx) => {
    const cx = pad + xPos;
    const label = `X${idx + 1}`;
    svg += `
      <line x1="${cx}" y1="${pad - 700}" x2="${cx}" y2="${totalH - pad + 500}" stroke="#b8b3af" stroke-width="8" stroke-dasharray="80,25,20,25"/>
      <circle cx="${cx}" cy="${pad - 700}" r="80" fill="#ffffff" stroke="#334155" stroke-width="14"/>
      <text x="${cx}" y="${pad - 675}" text-anchor="middle" font-size="70" font-weight="bold" fill="#334155" font-family="'Inter', sans-serif">${label}</text>
    `;
  });

  yGridPositions.forEach((yPos, idx) => {
    const cy = pad + yPos;
    const label = `Y${idx + 1}`;
    svg += `
      <line x1="${pad - 700}" y1="${cy}" x2="${totalW - pad + 500}" y2="${cy}" stroke="#b8b3af" stroke-width="8" stroke-dasharray="80,25,20,25"/>
      <circle cx="${pad - 700}" cy="${cy}" r="80" fill="#ffffff" stroke="#334155" stroke-width="14"/>
      <text x="${pad - 700}" y="${cy + 25}" text-anchor="middle" font-size="70" font-weight="bold" fill="#334155" font-family="'Inter', sans-serif">${label}</text>
    `;
  });

  svg += `
    <!-- 3. 建物外周ベース基壇 (壁厚130mm) -->
    <rect x="${pad}" y="${pad}" width="${floor.widthMm}" height="${floor.heightMm}" fill="#ffffff" stroke="#1e293b" stroke-width="${WALL_THICK}" stroke-linejoin="miter" rx="4" filter="url(#buildingShadow)"/>
  `;

  // 4. 部屋の床・間仕切り壁・各種仕上げ描画
  floor.rooms.forEach(r => {
    const rx = pad + r.bounds.x;
    const ry = pad + r.bounds.y;
    const rw = r.bounds.w;
    const rh = r.bounds.h;

    // 清潔感のあるモダン不動産チラシ・ポータル水準の床カラー
    let roomBg = '#ffffff';
    let patternOverlay = '';
    if (r.type === 'tatami_room') {
      roomBg = '#f7faf2';
      patternOverlay = `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="url(#tatamiGrid)"/>`;
    } else if (r.type === 'ldk' || r.type === 'bed_room_1' || r.type === 'bed_room_2' || r.type === 'study_room' || r.type === 'master_bed' || r.type === 'bed_room') {
      roomBg = '#fcfbf9';
      patternOverlay = `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="url(#woodPlank)"/>`;
    } else if (r.type === 'entrance') {
      roomBg = '#f1f5f9';
    } else if (r.type === 'artisan_bath' || r.type === 'unit_bath') {
      roomBg = '#f0f9ff';
    } else if (r.type === 'washroom') {
      roomBg = '#f8fafc';
    } else if (r.type === 'toilet') {
      roomBg = '#f8fafc';
    } else if (r.type === 'terrace' || r.type === 'balcony_view') {
      roomBg = '#f8fafc';
    }

    svg += `
    <g class="room-container" id="svg-room-${r.id}">
      <!-- Room Floor Surface -->
      <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${roomBg}"/>
      ${patternOverlay}
      <!-- 統一壁厚 130ミリの間仕切り線 -->
      <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="none" stroke="#1e293b" stroke-width="${WALL_THICK}" stroke-linejoin="miter"/>
    `;

    // 不動産図面標準の部屋名称 (住ま居る独自文言全排除)
    let displayName = '居室';
    if (r.type === 'ldk') displayName = 'LDK';
    else if (r.type === 'kitchen') displayName = 'キッチン';
    else if (r.type === 'artisan_bath' || r.type === 'unit_bath') displayName = '浴室 (1616)';
    else if (r.type === 'washroom') displayName = '洗面脱衣室';
    else if (r.type === 'toilet') displayName = 'トイレ';
    else if (r.type === 'entrance') displayName = '玄関';
    else if (r.type === 'master_bed') displayName = '主寝室';
    else if (r.type === 'bed_room' || r.type === 'bed_room_1' || r.type === 'bed_room_2') displayName = '洋室';
    else if (r.type === 'tatami_room') displayName = '和室';
    else if (r.type === 'study_room') displayName = '書斎';
    else if (r.type === 'garage') displayName = 'ガレージ';
    else if (r.type === 'theater') displayName = 'シアタールーム';
    else if (r.type === 'wine_cellar') displayName = '納戸・バー';
    else if (r.type === 'terrace' || r.type === 'balcony_view') displayName = 'バルコニー';
    else if (r.type === 'roof_terrace') displayName = 'ルーフテラス';
    else if (r.type === 'roof_bbq') displayName = 'スカイデッキ';

    const titleSize = rw <= 1820 ? 120 : (rw <= 2730 ? 150 : 180);
    const subSize = rw <= 1820 ? 95 : (rw <= 2730 ? 115 : 130);

    // テキスト表示の垂直基準 (家具に重ならない配置)
    let textY = ry + rh / 2;
    if (r.type === 'ldk') textY = ry + rh / 2 + 500;
    else if (r.type === 'artisan_bath' || r.type === 'unit_bath') textY = ry + rh - 300;
    else if (r.type === 'toilet') textY = ry + rh - 300;
    else if (r.type === 'entrance') textY = ry + rh / 2;

    svg += `
      <!-- Room Text Labels (不動産チラシ・ポータル水準表記) -->
      <text x="${rx + rw/2}" y="${textY - 30}" text-anchor="middle" font-size="${titleSize}" font-weight="bold" fill="#0f172a">${displayName}</text>
      <text x="${rx + rw/2}" y="${textY + 90}" text-anchor="middle" font-size="${subSize}" font-weight="600" fill="#475569">約 ${r.areaJou} 帖 (${r.areaM2} ㎡)</text>
    </g>
    `;

    // 5. 外壁境界判定と窓サッシの自動配置
    const onNorth = (r.bounds.y === 0);
    const onSouth = (r.bounds.y + r.bounds.h >= floor.heightMm);
    const onWest = (r.bounds.x === 0);
    const onEast = (r.bounds.x + r.bounds.w >= floor.widthMm);

    // 窓サッシ描画ヘルパー (白枠抜き + ガラス二重線 + サッシ枠)
    const drawWindow = (wx, wy, ww, wh, isHorizontal, type = 'slider') => {
      let winSvg = '';
      if (isHorizontal) {
        winSvg += `
          <!-- Window Opening -->
          <rect x="${wx}" y="${wy - WALL_THICK/2}" width="${ww}" height="${WALL_THICK}" fill="#ffffff" stroke="#334155" stroke-width="12"/>
          <line x1="${wx}" y1="${wy - 25}" x2="${wx + ww}" y2="${wy - 25}" stroke="#0284c7" stroke-width="16"/>
          <line x1="${wx}" y1="${wy + 25}" x2="${wx + ww}" y2="${wy + 25}" stroke="#0284c7" stroke-width="16"/>
          <line x1="${wx + ww/2}" y1="${wy - WALL_THICK/2}" x2="${wx + ww/2}" y2="${wy + WALL_THICK/2}" stroke="#334155" stroke-width="18"/>
        `;
      } else {
        winSvg += `
          <!-- Window Opening -->
          <rect x="${wx - WALL_THICK/2}" y="${wy}" width="${WALL_THICK}" height="${wh}" fill="#ffffff" stroke="#334155" stroke-width="12"/>
          <line x1="${wx - 25}" y1="${wy}" x2="${wx - 25}" y2="${wy + wh}" stroke="#0284c7" stroke-width="16"/>
          <line x1="${wx + 25}" y1="${wy}" x2="${wx + 25}" y2="${wy + wh}" stroke="#0284c7" stroke-width="16"/>
          <line x1="${wx - WALL_THICK/2}" y1="${wy + wh/2}" x2="${wx + WALL_THICK/2}" y2="${wy + wh/2}" stroke="#334155" stroke-width="18"/>
        `;
      }
      return winSvg;
    };

    if (r.type === 'entrance') {
      // 玄関: 玄関ドア (幅910mm) または引戸
      const doorW = 1200;
      const doorX = rx + rw/2 - doorW/2;
      const doorY = onSouth ? (ry + rh) : (onNorth ? ry : (ry + rh));
      svg += `
        <!-- 玄関ドア開口 -->
        <rect x="${doorX}" y="${doorY - WALL_THICK/2}" width="${doorW}" height="${WALL_THICK}" fill="#ffffff" stroke="#334155" stroke-width="16"/>
        <line x1="${doorX}" y1="${doorY - 20}" x2="${doorX + doorW*0.6}" y2="${doorY - 20}" stroke="#0f172a" stroke-width="24"/>
        <line x1="${doorX + doorW*0.4}" y1="${doorY + 20}" x2="${doorX + doorW}" y2="${doorY + 20}" stroke="#0f172a" stroke-width="24"/>
        <text x="${doorX + doorW/2}" y="${doorY + 140}" text-anchor="middle" font-size="80" fill="#475569" font-weight="bold">玄関</text>
      `;
    } else if (r.type === 'ldk') {
      // LDK: 外壁に掃き出し大型サッシ
      if (onSouth) {
        const winW = Math.min(rw - 800, 2560);
        svg += drawWindow(rx + rw/2 - winW/2, ry + rh, winW, WALL_THICK, true, 'sweep');
      } else if (onEast) {
        const winH = Math.min(rh - 800, 2560);
        svg += drawWindow(rx + rw, ry + rh/2 - winH/2, WALL_THICK, winH, false, 'sweep');
      }
    } else if (r.type === 'artisan_bath' || r.type === 'unit_bath') {
      // 浴室: 外壁に高窓 (換気・採光サッシ・幅910mm)
      if (onNorth) svg += drawWindow(rx + rw/2 - 455, ry, 910, WALL_THICK, true, 'slider');
      else if (onEast) svg += drawWindow(rx + rw, ry + 455, WALL_THICK, 910, false, 'slider');
      else if (onWest) svg += drawWindow(rx, ry + 455, WALL_THICK, 910, false, 'slider');
    } else if (r.type === 'toilet') {
      // トイレ: 外壁面にスリット小窓 (幅600mm)
      if (onNorth) svg += drawWindow(rx + rw/2 - 300, ry, 600, WALL_THICK, true, 'slider');
      else if (onWest) svg += drawWindow(rx, ry + rh/2 - 300, WALL_THICK, 600, false, 'slider');
    } else if (r.type === 'tatami_room' || r.type === 'bed_room_1' || r.type === 'bed_room_2' || r.type === 'study_room' || r.type === 'master_bed' || r.type === 'bed_room') {
      // 一般居室: 外壁に引き違い腰窓 (幅1650mm)
      const winW = Math.min(rw - 600, 1650);
      if (onSouth) svg += drawWindow(rx + rw/2 - winW/2, ry + rh, winW, WALL_THICK, true, 'slider');
      else if (onNorth) svg += drawWindow(rx + rw/2 - winW/2, ry, winW, WALL_THICK, true, 'slider');
      else if (onWest) svg += drawWindow(rx, ry + rh/2 - winW/2, WALL_THICK, winW, false, 'slider');
      else if (onEast) svg += drawWindow(rx + rw, ry + rh/2 - winW/2, WALL_THICK, winW, false, 'slider');
    }

    // 6. 内壁ドア・出入口の配置 (片開き戸90度アーク, 引き戸, 折れ戸)
    const drawSwingDoor = (dx, dy, dw, flip = false) => {
      return `
        <rect x="${dx}" y="${dy - WALL_THICK/2}" width="${dw}" height="${WALL_THICK}" fill="#ffffff"/>
        <path d="M ${dx + dw} ${dy} A ${dw} ${dw} 0 0 1 ${dx} ${dy + dw}" fill="none" stroke="#0284c7" stroke-width="8" stroke-dasharray="14,8"/>
        <line x1="${dx}" y1="${dy}" x2="${dx}" y2="${dy + dw}" stroke="#0f172a" stroke-width="24"/>
        <circle cx="${dx}" cy="${dy}" r="18" fill="#d97706"/>
      `;
    };

    const drawSlidingDoor = (dx, dy, dw) => {
      return `
        <rect x="${dx}" y="${dy - WALL_THICK/2}" width="${dw}" height="${WALL_THICK}" fill="#ffffff"/>
        <line x1="${dx}" y1="${dy - 18}" x2="${dx + dw*0.6}" y2="${dy - 18}" stroke="#0f172a" stroke-width="22"/>
        <line x1="${dx + dw*0.4}" y1="${dy + 18}" x2="${dx + dw}" y2="${dy + 18}" stroke="#0f172a" stroke-width="22"/>
      `;
    };

    // クローゼット折れ戸 (山折れ線記号)
    const drawFoldingDoor = (dx, dy, dw) => {
      const hw = dw / 2;
      return `
        <rect x="${dx}" y="${dy - WALL_THICK/2}" width="${dw}" height="${WALL_THICK}" fill="#ffffff"/>
        <polyline points="${dx},${dy} ${dx + hw*0.4},${dy - 100} ${dx + hw},${dy}" fill="none" stroke="#0f172a" stroke-width="18"/>
        <polyline points="${dx + hw},${dy} ${dx + hw + hw*0.4},${dy - 100} ${dx + dw},${dy}" fill="none" stroke="#0f172a" stroke-width="18"/>
      `;
    };

    if (r.type === 'toilet') {
      // トイレドア (手前南壁または東壁に配置)
      svg += drawSwingDoor(rx + rw/2 - 375, ry + rh, 750);
    } else if (r.type === 'washroom') {
      // 洗面室ドア (引き戸)
      svg += drawSlidingDoor(rx + rw - 900, ry + rh, 800);
    } else if (r.type === 'artisan_bath' || r.type === 'unit_bath') {
      // 浴室入口 (折れ戸)
      svg += drawFoldingDoor(rx + 200, ry + rh, 800);
    } else if (r.type === 'tatami_room') {
      // 和室出入口 (引き違い襖・障子)
      svg += drawSlidingDoor(rx + 300, ry + rh, Math.min(rw - 600, 1820));
    } else if (r.type === 'master_bed' || r.type === 'bed_room' || r.type === 'bed_room_1' || r.type === 'bed_room_2' || r.type === 'study_room') {
      // 居室ドア (片開きドア)
      svg += drawSwingDoor(rx + 200, ry + rh, 800);
    }

    // =========================================================
    // 7. 不動産屋水準 (SUUMO・マイソク級) の住宅設備・家具配置
    // =========================================================

    // A. トイレ: 壁付け正方向 (奥壁にタンク密着, 便座が手前・ドア側を向く)
    if (r.type === 'toilet') {
      const tw = 420;
      const th = 160;
      const tx = rx + rw/2 - tw/2;
      const ty = ry + WALL_THICK/2 + 30; // 奥壁(北壁)にピッタリ密着！
      const bowlCenterY = ty + th + 240;

      svg += `
        <!-- トイレ背面タンク (奥壁にピッタリ密着) -->
        <rect x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="20" fill="#ffffff" stroke="#475569" stroke-width="18"/>
        <!-- 便座ボウル (先端が手前・ドア側に向く完全正方向) -->
        <path d="M ${rx + rw/2 - 180} ${ty + th} 
                 L ${rx + rw/2 - 180} ${bowlCenterY} 
                 A 180 200 0 0 0 ${rx + rw/2 + 180} ${bowlCenterY} 
                 L ${rx + rw/2 + 180} ${ty + th} Z" 
              fill="#ffffff" stroke="#475569" stroke-width="20"/>
        <!-- 便座内穴 -->
        <ellipse cx="${rx + rw/2}" cy="${bowlCenterY - 20}" rx="100" ry="140" fill="#f1f5f9" stroke="#94a3b8" stroke-width="10"/>
        <!-- ペーパーホルダー (東壁面) -->
        <rect x="${rx + rw - WALL_THICK/2 - 80}" y="${ty + th + 50}" width="60" height="160" rx="10" fill="#94a3b8"/>
        <!-- 手洗いカウンター (西壁面) -->
        <rect x="${rx + WALL_THICK/2 + 10}" y="${ty}" width="220" height="600" fill="#f8fafc" stroke="#64748b" stroke-width="14"/>
        <ellipse cx="${rx + WALL_THICK/2 + 120}" cy="${ty + 300}" rx="70" ry="110" fill="#ffffff" stroke="#0284c7" stroke-width="8"/>
      `;
    }

    // B. 浴室: 1616サイズ (1坪タイプ・1600mm×1600mm大型システムバス)
    else if (r.type === 'artisan_bath' || r.type === 'unit_bath') {
      const bathInnerW = rw - WALL_THICK; // 壁内法全幅 (約1690mm)
      const tubDepth = 820; // 現代の大型浴槽奥行
      const tubX = rx + WALL_THICK/2;
      const tubY = ry + WALL_THICK/2; // 奥壁(北壁)にピッタリ密着！

      svg += `
        <!-- 1616大型システムバスタブ (奥壁いっぱいに据え付け) -->
        <rect x="${tubX}" y="${tubY}" width="${bathInnerW}" height="${tubDepth}" rx="40" fill="#ffffff" stroke="#0284c7" stroke-width="20"/>
        <!-- 浴槽内アクリルカーブ (半身浴ステップ付き) -->
        <rect x="${tubX + 50}" y="${tubY + 50}" width="${bathInnerW - 100}" height="${tubDepth - 100}" rx="120" fill="#e0f2fe" stroke="#38bdf8" stroke-width="14"/>
        <path d="M ${tubX + bathInnerW - 400} ${tubY + 80} L ${tubX + bathInnerW - 400} ${tubY + tubDepth - 80}" stroke="#93c5fd" stroke-width="12" stroke-dasharray="15,10"/>
        <circle cx="${tubX + 200}" cy="${tubY + tubDepth/2}" r="30" fill="#0284c7"/>
        <text x="${tubX + bathInnerW/2}" y="${tubY + tubDepth/2 + 30}" text-anchor="middle" font-size="95" fill="#0369a1" font-weight="bold">1616 浴槽</text>

        <!-- 洗い場カウンター ＆ サーモスタット水栓 ＆ シャワー (手前側) -->
        <rect x="${tubX + 60}" y="${tubY + tubDepth + 60}" width="400" height="200" rx="20" fill="#f1f5f9" stroke="#64748b" stroke-width="14"/>
        <!-- 縦型ミラー -->
        <line x1="${tubX + 20}" y1="${tubY + tubDepth + 80}" x2="${tubX + 20}" y2="${tubY + tubDepth + 320}" stroke="#0284c7" stroke-width="24"/>
        <!-- シャワー水栓 -->
        <circle cx="${tubX + 260}" cy="${tubY + tubDepth + 160}" r="40" fill="#ffffff" stroke="#0284c7" stroke-width="12"/>
        <line x1="${tubX + 260}" y1="${tubY + tubDepth + 100}" x2="${tubX + 260}" y2="${tubY + tubDepth + 260}" stroke="#0284c7" stroke-width="10"/>
        <!-- 洗い場排水口 -->
        <rect x="${tubX + bathInnerW - 250}" y="${ry + rh - WALL_THICK/2 - 250}" width="160" height="160" rx="20" fill="#e2e8f0" stroke="#94a3b8" stroke-width="10"/>
      `;
    }

    // C. 洗面脱衣室: シャンプードレッサー ＆ 洗濯パン
    else if (r.type === 'washroom') {
      const sinkW = 900;
      const sinkD = 550;
      const sinkX = rx + WALL_THICK/2 + 20; // 西壁に沿って配置
      const sinkY = ry + WALL_THICK/2 + 20;

      svg += `
        <!-- 洗面化粧台 (900×550) -->
        <rect x="${sinkX}" y="${sinkY}" width="${sinkW}" height="${sinkD}" fill="#ffffff" stroke="#334155" stroke-width="18"/>
        <ellipse cx="${sinkX + sinkW/2}" cy="${sinkY + sinkD/2}" rx="280" ry="180" fill="#f8fafc" stroke="#0284c7" stroke-width="12"/>
        <circle cx="${sinkX + sinkW/2}" cy="${sinkY + 120}" r="30" fill="#64748b"/>
        <text x="${sinkX + sinkW/2}" y="${sinkY + sinkD/2 + 25}" text-anchor="middle" font-size="75" fill="#475569" font-weight="bold">洗面台</text>
        
        <!-- 洗濯機防水パン (640×640) -->
        <rect x="${rx + rw - WALL_THICK/2 - 750}" y="${sinkY}" width="700" height="700" fill="#ffffff" stroke="#475569" stroke-width="18"/>
        <circle cx="${rx + rw - WALL_THICK/2 - 400}" cy="${sinkY + 350}" r="220" fill="#f8fafc" stroke="#cbd5e1" stroke-width="10"/>
        <text x="${rx + rw - WALL_THICK/2 - 400}" y="${sinkY + 380}" text-anchor="middle" font-size="80" fill="#64748b" font-weight="bold">洗濯機</text>

        <!-- リネン棚 / 収納 -->
        <rect x="${sinkX}" y="${sinkY + sinkD + 80}" width="${sinkW}" height="450" fill="#ffffff" stroke="#94a3b8" stroke-width="14" stroke-dasharray="20,15"/>
        <text x="${sinkX + sinkW/2}" y="${sinkY + sinkD + 340}" text-anchor="middle" font-size="75" fill="#64748b">リネン庫</text>
      `;
    }

    // D. キッチン: 壁付け対面カウンター (西壁に完全密着, 浮かない) ＆ 背面食器棚・冷蔵庫
    else if (r.type === 'ldk') {
      const kw = Math.min(rw - 1200, 2550); // 間口2550mm
      const kd = 850; // 対面カウンター奥行850mm
      const kx = rx + WALL_THICK/2; // 西壁にピッタリ完全密着！
      const ky = ry + 1200; // 背面通路1200mmを確保した対面配置

      svg += `
        <!-- 壁付け対面システムキッチン (西壁に完全密着) -->
        <rect x="${kx}" y="${ky}" width="${kw}" height="${kd}" fill="#ffffff" stroke="#1e293b" stroke-width="22"/>
        
        <!-- ① 壁側: 3口コンロ ＆ レンジフード (西壁密着側) -->
        <rect x="${kx + 120}" y="${ky + 100}" width="650" height="550" rx="15" fill="#1e293b" stroke="#475569" stroke-width="12"/>
        <circle cx="${kx + 280}" cy="${ky + 380}" r="110" fill="#334155" stroke="#f59e0b" stroke-width="8"/>
        <circle cx="${kx + 570}" cy="${ky + 380}" r="110" fill="#334155" stroke="#f59e0b" stroke-width="8"/>
        <circle cx="${kx + 425}" cy="${ky + 230}" r="75" fill="#334155" stroke="#f59e0b" stroke-width="6"/>
        <text x="${kx + 445}" y="${ky + 610}" text-anchor="middle" font-size="70" fill="#f59e0b" font-weight="bold">コンロ</text>

        <!-- ② 中央: 調理スペース -->
        <line x1="${kx + 850}" y1="${ky}" x2="${kx + 850}" y2="${ky + kd}" stroke="#e2e8f0" stroke-width="10"/>

        <!-- ③ 通路側: 静音シンク ＆ 水栓 -->
        <rect x="${kx + 1300}" y="${ky + 120}" width="800" height="500" rx="30" fill="#f1f5f9" stroke="#0284c7" stroke-width="14"/>
        <circle cx="${kx + 1700}" cy="${ky + 220}" r="35" fill="#64748b"/>
        <text x="${kx + 1700}" y="${ky + 420}" text-anchor="middle" font-size="80" fill="#0369a1" font-weight="bold">シンク</text>

        <!-- 背面壁沿い: 食器棚・カップボード (北壁にピッタリ密着) -->
        <rect x="${kx}" y="${ry + WALL_THICK/2 + 20}" width="1800" height="450" fill="#ffffff" stroke="#64748b" stroke-width="16"/>
        <text x="${kx + 900}" y="${ry + WALL_THICK/2 + 280}" text-anchor="middle" font-size="80" fill="#475569" font-weight="bold">食器棚 (Cupboard)</text>

        <!-- 背面壁沿い: 冷蔵庫スペース (北壁にピッタリ密着) -->
        <rect x="${kx + 1950}" y="${ry + WALL_THICK/2 + 20}" width="750" height="700" fill="#ffffff" stroke="#94a3b8" stroke-width="16" stroke-dasharray="25,18"/>
        <text x="${kx + 2325}" y="${ry + WALL_THICK/2 + 410}" text-anchor="middle" font-size="95" fill="#94a3b8" font-weight="bold">R (冷蔵庫)</text>

        <!-- ダイニングテーブル (1500×800) ＆ チェア4脚 -->
        <rect x="${kx}" y="${ky + kd + 800}" width="1500" height="800" rx="30" fill="#ffffff" stroke="#475569" stroke-width="20"/>
        <text x="${kx + 750}" y="${ky + kd + 1240}" text-anchor="middle" font-size="90" fill="#334155" font-weight="bold">ダイニングテーブル</text>
        <rect x="${kx + 250}" y="${ky + kd + 620}" width="380" height="150" rx="15" fill="#ffffff" stroke="#64748b" stroke-width="12"/>
        <rect x="${kx + 870}" y="${ky + kd + 620}" width="380" height="150" rx="15" fill="#ffffff" stroke="#64748b" stroke-width="12"/>
        <rect x="${kx + 250}" y="${ky + kd + 1630}" width="380" height="150" rx="15" fill="#ffffff" stroke="#64748b" stroke-width="12"/>
        <rect x="${kx + 870}" y="${ky + kd + 1630}" width="380" height="150" rx="15" fill="#ffffff" stroke="#64748b" stroke-width="12"/>

        <!-- リビングソファ (2000×850) ＆ ローテーブル ＆ TVボード -->
        <rect x="${rx + rw - WALL_THICK/2 - 2400}" y="${ry + rh - WALL_THICK/2 - 1300}" width="2200" height="850" rx="40" fill="#ffffff" stroke="#334155" stroke-width="22"/>
        <text x="${rx + rw - WALL_THICK/2 - 1300}" y="${ry + rh - WALL_THICK/2 - 840}" text-anchor="middle" font-size="95" fill="#334155" font-weight="bold">リビングソファ</text>
        <rect x="${rx + rw - WALL_THICK/2 - 1900}" y="${ry + rh - WALL_THICK/2 - 1900}" width="1200" height="450" rx="20" fill="#f8fafc" stroke="#94a3b8" stroke-width="14"/>
        <text x="${rx + rw - WALL_THICK/2 - 1300}" y="${ry + rh - WALL_THICK/2 - 1640}" text-anchor="middle" font-size="75" fill="#64748b">ローテーブル</text>
        <rect x="${rx + rw - WALL_THICK/2 - 2100}" y="${ry + 800}" width="1800" height="400" fill="#ffffff" stroke="#475569" stroke-width="16"/>
        <text x="${rx + rw - WALL_THICK/2 - 1200}" y="${ry + 1040}" text-anchor="middle" font-size="80" fill="#334155" font-weight="bold">TVボード</text>
      `;
    }

    // E. 玄関: 下駄箱・SIC ＆ 上がり框
    else if (r.type === 'entrance') {
      svg += `
        <!-- 大型シューズボックス (下駄箱・トール型) -->
        <rect x="${rx + WALL_THICK/2 + 20}" y="${ry + WALL_THICK/2 + 20}" width="1200" height="400" fill="#ffffff" stroke="#334155" stroke-width="16"/>
        <text x="${rx + WALL_THICK/2 + 620}" y="${ry + WALL_THICK/2 + 250}" text-anchor="middle" font-size="80" fill="#475569" font-weight="bold">下駄箱 (SIC)</text>
        <!-- 上がり框ライン (玄関土間とホールの段差) -->
        <line x1="${rx + WALL_THICK/2}" y1="${ry + rh - 600}" x2="${rx + rw - WALL_THICK/2}" y2="${ry + rh - 600}" stroke="#0f172a" stroke-width="16"/>
        <text x="${rx + rw/2}" y="${ry + rh - 660}" text-anchor="middle" font-size="70" fill="#64748b">↑ 上がり框</text>
      `;
    }

    // F. 和室: 押入れ ＆ クローゼット
    else if (r.type === 'tatami_room') {
      svg += `
        <!-- 押入 (引き違い襖) -->
        <rect x="${rx + WALL_THICK/2 + 20}" y="${ry + WALL_THICK/2 + 20}" width="${rw - WALL_THICK - 40}" height="800" fill="#ffffff" stroke="#475569" stroke-width="16"/>
        <line x1="${rx + WALL_THICK/2 + 20}" y1="${ry + WALL_THICK/2 + 820}" x2="${rx + rw - WALL_THICK/2 - 20}" y2="${ry + WALL_THICK/2 + 820}" stroke="#0f172a" stroke-width="20"/>
        <text x="${rx + rw/2}" y="${ry + WALL_THICK/2 + 460}" text-anchor="middle" font-size="95" fill="#334155" font-weight="bold">押入</text>
      `;
    }

    // G. 主寝室 / 洋室: クローゼット (WIC) ＆ ベッド
    else if (r.type === 'master_bed' || r.type === 'bed_room' || r.type === 'bed_room_1' || r.type === 'bed_room_2') {
      const isMaster = (r.type === 'master_bed' || r.type === 'bed_room_1');
      if (isMaster) {
        // ダブルベッド (1400×2000)
        svg += `
          <rect x="${rx + WALL_THICK/2 + 400}" y="${ry + WALL_THICK/2 + 300}" width="1400" height="2000" rx="30" fill="#ffffff" stroke="#334155" stroke-width="18"/>
          <!-- 枕2つ -->
          <rect x="${rx + WALL_THICK/2 + 500}" y="${ry + WALL_THICK/2 + 360}" width="500" height="300" rx="20" fill="#f1f5f9" stroke="#94a3b8" stroke-width="8"/>
          <rect x="${rx + WALL_THICK/2 + 1100}" y="${ry + WALL_THICK/2 + 360}" width="500" height="300" rx="20" fill="#f1f5f9" stroke="#94a3b8" stroke-width="8"/>
          <line x1="${rx + WALL_THICK/2 + 400}" y1="${ry + WALL_THICK/2 + 850}" x2="${rx + WALL_THICK/2 + 1800}" y2="${ry + WALL_THICK/2 + 850}" stroke="#cbd5e1" stroke-width="12"/>
          <text x="${rx + WALL_THICK/2 + 1100}" y="${ry + WALL_THICK/2 + 1400}" text-anchor="middle" font-size="90" fill="#475569" font-weight="bold">ベッド</text>
          
          <!-- ウォークインクローゼット (WIC) -->
          <rect x="${rx + rw - WALL_THICK/2 - 1400}" y="${ry + WALL_THICK/2 + 20}" width="1380" height="1200" fill="#f8fafc" stroke="#475569" stroke-width="18" stroke-dasharray="25,18"/>
          <text x="${rx + rw - WALL_THICK/2 - 710}" y="${ry + WALL_THICK/2 + 640}" text-anchor="middle" font-size="95" fill="#334155" font-weight="bold">WIC (収納)</text>
        `;
      } else {
        // シングルベッド (1000×2000) ＆ クローゼット
        svg += `
          <rect x="${rx + WALL_THICK/2 + 300}" y="${ry + WALL_THICK/2 + 300}" width="1000" height="2000" rx="20" fill="#ffffff" stroke="#334155" stroke-width="18"/>
          <rect x="${rx + WALL_THICK/2 + 450}" y="${ry + WALL_THICK/2 + 360}" width="700" height="320" rx="20" fill="#f1f5f9" stroke="#94a3b8" stroke-width="8"/>
          <line x1="${rx + WALL_THICK/2 + 300}" y1="${ry + WALL_THICK/2 + 850}" x2="${rx + WALL_THICK/2 + 1300}" y2="${ry + WALL_THICK/2 + 850}" stroke="#cbd5e1" stroke-width="10"/>
          <!-- クローゼット (CL) -->
          <rect x="${rx + rw - WALL_THICK/2 - 1200}" y="${ry + WALL_THICK/2 + 20}" width="1180" height="600" fill="#f8fafc" stroke="#475569" stroke-width="16"/>
          <text x="${rx + rw - WALL_THICK/2 - 610}" y="${ry + WALL_THICK/2 + 340}" text-anchor="middle" font-size="85" fill="#475569" font-weight="bold">クローゼット</text>
        `;
      }
    }
  });

  // 8. 建築図面標準 外周2段寸法線 (北側・西側)
  const dimColor = '#334155';
  const dimOffset1 = pad - 350; // 1段目 (各部屋スパン寸法)
  const dimOffset2 = pad - 520; // 2段目 (全体総寸法)

  svg += `
    <!-- ================= 外周寸法線 (North / Top) ================= -->
    <g id="dimension-lines-north" font-family="'Inter', sans-serif">
      <!-- 2段目: 建物全幅寸法線 (総間口) -->
      <line x1="${pad}" y1="${dimOffset2}" x2="${pad + floor.widthMm}" y2="${dimOffset2}" stroke="${dimColor}" stroke-width="12" marker-start="url(#slashMarker)" marker-end="url(#slashMarker)"/>
      <line x1="${pad}" y1="${pad - 80}" x2="${pad}" y2="${dimOffset2 - 60}" stroke="${dimColor}" stroke-width="6"/>
      <line x1="${pad + floor.widthMm}" y1="${pad - 80}" x2="${pad + floor.widthMm}" y2="${dimOffset2 - 60}" stroke="${dimColor}" stroke-width="6"/>
      <text x="${pad + floor.widthMm/2}" y="${dimOffset2 - 40}" text-anchor="middle" font-size="110" font-weight="bold" fill="${dimColor}">${floor.widthMm.toLocaleString()} mm (総間口)</text>

      <!-- 1段目: 各部屋スパン寸法線 -->
  `;

  let curX = 0;
  floor.rooms.filter(r => r.bounds.y === 0).sort((a,b) => a.bounds.x - b.bounds.x).forEach(r => {
    const spanW = r.bounds.w;
    const startX = pad + curX;
    const endX = startX + spanW;
    svg += `
      <line x1="${startX}" y1="${dimOffset1}" x2="${endX}" y2="${dimOffset1}" stroke="${dimColor}" stroke-width="10" marker-start="url(#slashMarker)" marker-end="url(#slashMarker)"/>
      <line x1="${startX}" y1="${pad}" x2="${startX}" y2="${dimOffset1 - 50}" stroke="${dimColor}" stroke-width="6"/>
      <line x1="${endX}" y1="${pad}" x2="${endX}" y2="${dimOffset1 - 50}" stroke="${dimColor}" stroke-width="6"/>
      <text x="${startX + spanW/2}" y="${dimOffset1 - 35}" text-anchor="middle" font-size="90" font-weight="600" fill="${dimColor}">${spanW.toLocaleString()}</text>
    `;
    curX += spanW;
  });

  svg += `
    </g>

    <!-- ================= 外周寸法線 (West / Left) ================= -->
    <g id="dimension-lines-west" font-family="'Inter', sans-serif">
      <!-- 2段目: 建物全奥行寸法線 (総奥行) -->
      <line x1="${dimOffset2}" y1="${pad}" x2="${dimOffset2}" y2="${pad + floor.heightMm}" stroke="${dimColor}" stroke-width="12" marker-start="url(#slashMarker)" marker-end="url(#slashMarker)"/>
      <line x1="${pad - 80}" y1="${pad}" x2="${dimOffset2 - 60}" y2="${pad}" stroke="${dimColor}" stroke-width="6"/>
      <line x1="${pad - 80}" y1="${pad + floor.heightMm}" x2="${dimOffset2 - 60}" y2="${pad + floor.heightMm}" stroke="${dimColor}" stroke-width="6"/>
      <text x="${dimOffset2 - 40}" y="${pad + floor.heightMm/2}" text-anchor="middle" font-size="110" font-weight="bold" fill="${dimColor}" transform="rotate(-90 ${dimOffset2 - 40} ${pad + floor.heightMm/2})">${floor.heightMm.toLocaleString()} mm (総奥行)</text>

      <!-- 1段目: 各部屋スパン寸法線 -->
  `;

  let curY = 0;
  floor.rooms.filter(r => r.bounds.x === 0).sort((a,b) => a.bounds.y - b.bounds.y).forEach(r => {
    const spanH = r.bounds.h;
    const startY = pad + curY;
    const endY = startY + spanH;
    svg += `
      <line x1="${dimOffset1}" y1="${startY}" x2="${dimOffset1}" y2="${endY}" stroke="${dimColor}" stroke-width="10" marker-start="url(#slashMarker)" marker-end="url(#slashMarker)"/>
      <line x1="${pad}" y1="${startY}" x2="${dimOffset1 - 50}" y2="${startY}" stroke="${dimColor}" stroke-width="6"/>
      <line x1="${pad}" y1="${endY}" x2="${dimOffset1 - 50}" y2="${endY}" stroke="${dimColor}" stroke-width="6"/>
      <text x="${dimOffset1 - 35}" y="${startY + spanH/2}" text-anchor="middle" font-size="90" font-weight="600" fill="${dimColor}" transform="rotate(-90 ${dimOffset1 - 35} ${startY + spanH/2})">${spanH.toLocaleString()}</text>
    `;
    curY += spanH;
  });

  // 合計床面積の算出
  const totalFloorM2 = floor.rooms.reduce((sum, r) => sum + parseFloat(r.areaM2 || 0), 0).toFixed(1);
  const totalFloorTsubo = (totalFloorM2 / 3.30578).toFixed(1);

  svg += `
    </g>

    <!-- 9. 方位マーク (すっきりとしたモダンコンパス) -->
    <g transform="translate(${totalW - 350}, 260)">
      <circle cx="0" cy="0" r="130" fill="#ffffff" stroke="#334155" stroke-width="10"/>
      <polygon points="0,-100 35,-20 0,-40 -35,-20" fill="#0284c7"/>
      <polygon points="0,100 25,25 0,40 -25,25" fill="#94a3b8"/>
      <text x="0" y="-120" text-anchor="middle" font-size="85" font-weight="bold" fill="#0f172a" font-family="'Inter', sans-serif">N</text>
    </g>

    <!-- 10. 縮尺スケールバー (SCALE 1:100) -->
    <g transform="translate(${pad}, ${totalH - 340})" font-family="'Inter', sans-serif">
      <rect x="0" y="0" width="1820" height="35" fill="#0f172a"/>
      <rect x="0" y="0" width="910" height="35" fill="#0284c7"/>
      <text x="0" y="-15" font-size="60" font-weight="bold" fill="#475569">0m</text>
      <text x="910" y="-15" font-size="60" font-weight="bold" fill="#475569">0.91m</text>
      <text x="1820" y="-15" font-size="60" font-weight="bold" fill="#475569">1.82m</text>
      <text x="2100" y="25" font-size="70" font-weight="bold" fill="#0f172a">SCALE 1/100</text>
    </g>

    <!-- 11. 不動産平面図 表題欄 (耐震・温熱スペック全排除、クリーン表記) -->
    <g transform="translate(${pad}, ${totalH - 180})">
      <text x="0" y="45" font-size="115" font-weight="bold" fill="#0f172a" font-family="'Noto Sans JP', sans-serif">${floor.levelLabel} 平面図 (FLOOR PLAN)</text>
      <text x="0" y="115" font-size="75" font-weight="600" fill="#64748b" font-family="'Noto Sans JP', sans-serif">施工床面積: ${totalFloorM2} ㎡ (${totalFloorTsubo} 坪) ｜ 910mm尺モジュール自由設計</text>
    </g>
  </svg>
  `;

  return svg.trim();
}

/**
 * 4. Standard IFC (Industry Foundation Classes 2x3) 3D BIM Generator
 * Supports B1F, 1F, 2F, 3F, and PH Building Storeys
 */
function generateIfcModel(geometry) {
  const activeKeys = geometry.activeLevelKeys || ['1f'];
  const planId = geometry.planId || 'fp_' + Date.now();
  const dateStr = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14);

  // Elevation map for each level in millimeters
  const elevationMap = {
    'b1': -2900,
    '1f': 0,
    '2f': 2900,
    '3f': 5800,
    'ph': 8700
  };

  let ifc = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView_V2.0]'),'2;1');
FILE_NAME('Sumaile_Kaguya_Plan_${planId}.ifc','${dateStr}',('AI Architect Studio'),('Sumaile Co., Ltd.'),'Sumaile BIM Generator 2.0','Antigravity IDE','Approved');
FILE_SCHEMA(('IFC2X3'));
ENDSEC;

DATA;
#1= IFCPROJECT('0123456789012345678901',#2,'Sumaile Kaguya Residence',$,$,$,$,(#11),#12);
#2= IFCOWNERHISTORY(#3,#4,$,.ADDED.,$,$,$,${Math.floor(Date.now()/1000)});
#3= IFCPERSONANDORGANIZATION(#5,#6,$);
#4= IFCAPPLICATION(#6,'2.0','Sumaile BIM Generator','SUMAILE_BIM');
#5= IFCPERSON($,'Architect','Sumaile AI',$,$,$,$,$);
#6= IFCORGANIZATION($,'株式会社住ま居る','Sumaile Co., Ltd.',$,$);
#7= IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#8= IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);
#9= IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.);
#10= IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.);
#11= IFCUNITASSIGNMENT((#7,#8,#9,#10));
#12= IFCAXIS2PLACEMENT3D(#13,#14,#15);
#13= IFCCARTESIANPOINT((0.,0.,0.));
#14= IFCDIRECTION((0.,0.,1.));
#15= IFCDIRECTION((1.,0.,0.));

/* Site & Building hierarchy */
#20= IFCSITE('0123456789012345678902',#2,'鶴ヶ島プロジェクト敷地',$,$,#21,$,$,.ELEMENT.,$,$,$,$,$);
#21= IFCLOCALPLACEMENT($,#12);
#30= IFCBUILDING('0123456789012345678903',#2,'芳彩（かぐや）結露しない家',$,$,#31,$,$,.ELEMENT.,$,$,$);
#31= IFCLOCALPLACEMENT(#21,#12);
#32= IFCRELAGGREGATES('0123456789012345678904',#2,'ProjectSite',$,#1,(#20));
#33= IFCRELAGGREGATES('0123456789012345678905',#2,'SiteBuilding',$,#20,(#30));
`;

  let entityId = 100;
  const storeyIds = [];

  activeKeys.forEach((key, idx) => {
    const floor = geometry.levels[key];
    if (!floor) return;
    const elevation = elevationMap[key] !== undefined ? elevationMap[key] : idx * 2900;
    const storeyId = entityId++;
    storeyIds.push(storeyId);

    ifc += `
/* Building Storey: ${floor.levelLabel} */
#${storeyId}= IFCBUILDINGSTOREY('01234567890123456789${idx+10}',#2,'${floor.levelLabel}',$,$,#${entityId++},$,$,.ELEMENT.,${elevation}.);
#${entityId-1}= IFCLOCALPLACEMENT(#31,#${entityId++});
#${entityId-1}= IFCAXIS2PLACEMENT3D(#${entityId++},#14,#15);
#${entityId-1}= IFCCARTESIANPOINT((0.,0.,${elevation}.));
`;

    // Add Spaces & Walls for each room
    floor.rooms.forEach(r => {
      const spaceId = entityId++;
      const wallId = entityId++;
      ifc += `
#${spaceId}= IFCSPACE('0123456789012345678${entityId}',#2,'${r.name}',$,$,#${entityId++},$,.ELEMENT.,.INTERNAL.,$);
#${entityId-1}= IFCLOCALPLACEMENT(#${storeyId+1},#${entityId++});
#${entityId-1}= IFCAXIS2PLACEMENT3D(#${entityId++},#14,#15);
#${entityId-1}= IFCCARTESIANPOINT((${r.bounds.x}.,${r.bounds.y}.,0.));
#${wallId}= IFCWALLSTANDARDCASE('0123456789012345679${entityId}',#2,'外周壁 (厚150mm 吉野杉構造材)',$,$,#${entityId++},$,$);
#${entityId-1}= IFCLOCALPLACEMENT(#${storeyId+1},#${entityId++});
#${entityId-1}= IFCAXIS2PLACEMENT3D(#${entityId++},#14,#15);
#${entityId-1}= IFCCARTESIANPOINT((${r.bounds.x}.,${r.bounds.y}.,0.));
`;
    });
  });

  ifc += `
#999= IFCRELAGGREGATES('0123456789012345678999',#2,'BuildingStoreys',$,#30,(${storeyIds.map(id => '#' + id).join(',')}));
ENDSEC;
END-ISO-10303-21;
`;

  return ifc;
}

/**
 * 5. Multi-Agent Conversational Orchestrator (Interviewer, Planner, Validator)
 * Simulates LangGraph-like State Machine across conversation turns
 */
function runMultiAgentOrchestration(userMessage = '', history = [], currentPlanState = null) {
  const msg = userMessage.toLowerCase();

  // Baseline state extraction or fallback defaults
  let state = currentPlanState ? { ...currentPlanState } : {
    stories: 2,
    hasBasement: false,
    hasRoofPH: false,
    bathType: 'artisan',
    interiorStyle: 'natural',
    totalTsubo: 34,
    features: ['tatami'],
    customNotes: ''
  };

  // --- Node 1: Interviewer Node (意図解析・要件抽出) ---
  let intentSummary = [];

  // Stories (階数)
  if (msg.includes('3階') || msg.includes('三階') || msg.includes('3story')) {
    state.stories = 3;
    intentSummary.push('地上3階建て');
  } else if (msg.includes('平屋') || msg.includes('1階') || msg.includes('flat')) {
    state.stories = 1;
    intentSummary.push('平屋邸宅');
  } else if (msg.includes('2階') || msg.includes('二階') || msg.includes('2story')) {
    state.stories = 2;
    intentSummary.push('2階建て');
  }

  // Basement (地下)
  if (msg.includes('地下') || msg.includes('シアター') || msg.includes('ワイン') || msg.includes('防音') || msg.includes('b1')) {
    state.hasBasement = true;
    if (!state.features.includes('theater')) state.features.push('theater');
    if (msg.includes('ワイン') && !state.features.includes('wine')) state.features.push('wine');
    intentSummary.push('地下1階 (防音シアター・ワインセラー)');
  } else if (msg.includes('地下なし') || msg.includes('地下はいらない') || msg.includes('地下不要')) {
    state.hasBasement = false;
    state.features = state.features.filter(f => f !== 'theater' && f !== 'wine');
    intentSummary.push('地下階の解除');
  }

  // Penthouse & Roof (屋上・PH)
  if (msg.includes('屋上') || msg.includes('ルーフ') || msg.includes('テラス') || msg.includes('星空') || msg.includes('ph') || msg.includes('ペントハウス') || msg.includes('bbq') || msg.includes('バーベキュー')) {
    state.hasRoofPH = true;
    if (!state.features.includes('roof_bbq')) state.features.push('roof_bbq');
    intentSummary.push('PH屋上 (スカイルーフテラス・星空天体観測)');
  } else if (msg.includes('屋上なし') || msg.includes('屋上不要')) {
    state.hasRoofPH = false;
    state.features = state.features.filter(f => f !== 'roof_bbq');
    intentSummary.push('屋上テラスの解除');
  }

  // Bath (お風呂)
  if (msg.includes('ユニットバス') || msg.includes('ub') || msg.includes('お風呂') || msg.includes('1616') || msg.includes('システムバス')) {
    state.bathType = 'unit';
    intentSummary.push('1616システムユニットバス (1坪タイプ)');
  }

  // Material (建材・インテリアスタイル)
  if (msg.includes('シンプル') || msg.includes('ナチュラル') || msg.includes('木目')) {
    state.interiorStyle = 'natural';
    intentSummary.push('ナチュラルスタイル');
  } else if (msg.includes('モダン') || msg.includes('モノトーン')) {
    state.interiorStyle = 'modern';
    intentSummary.push('モダンスタイル');
  }

  // Features (設備・部屋)
  if (msg.includes('ガレージ') || msg.includes('車') || msg.includes('バイク')) {
    if (!state.features.includes('garage')) state.features.push('garage');
    intentSummary.push('インナーガレージ');
  }
  if (msg.includes('和室') || msg.includes('畳') || msg.includes('タタミ')) {
    if (!state.features.includes('tatami')) state.features.push('tatami');
    intentSummary.push('和室');
  }

  // Target Tsubo adjustment
  if (msg.includes('坪')) {
    const match = msg.match(/(\d{2,3})坪/);
    if (match) {
      state.totalTsubo = parseInt(match[1], 10);
      intentSummary.push(`延床面積: 約${state.totalTsubo}坪`);
    }
  }

  // --- Node 2: Planner Node (空間トポロジー＆幾何学計算) ---
  const topology = createFloorPlanTopology({
    stories: state.stories,
    hasBasement: state.hasBasement,
    hasRoofPH: state.hasRoofPH,
    bathType: 'unit',
    interiorStyle: state.interiorStyle,
    totalTsubo: state.totalTsubo,
    features: state.features,
    customNotes: userMessage
  });

  const geometry = solve2DGeometry(topology);

  // Generate SVGs for all active levels
  const svgs = {};
  topology.activeLevelKeys.forEach(key => {
    svgs[key] = renderFloorPlanSvg(geometry, key);
  });

  // --- Node 3: Validator Node (耐震・採光・温熱は非表示化) ---
  const validationLog = [];

  // --- Conversational Reply Formulation ---
  let replyIntro = 'ご要望を承りました！間取りプランを再計算して更新いたしました。';
  if (intentSummary.length > 0) {
    replyIntro = `【間取りAI】承知いたしました！**${intentSummary.join('、')}** のご要望を反映し、プランをアップデートしました。`;
  }

  const storeyDesc = `${state.hasBasement ? '地下1階・' : ''}${state.stories === 1 ? '平屋' : state.stories + '階建て'}${state.hasRoofPH ? '＋PH屋上' : ''}`;

  const reply = `
${replyIntro}

### 📐 理想の間取りプラン概要: ${storeyDesc}
> **【自由な間取り検討について】**
> 間取りを考えるうえで敷地に入るかどうかは極めて重要ですが、初期の検討段階から個人のユーザー様が敷地制限や法規制まで配慮することは非常に困難です。まずは敷地の制限を抜きにして、家族の理想の動線や希望の部屋のつながりを自由に磨いてみてください！

- **フロア構成**: ${topology.activeLevelKeys.map(k => getLevelLabel(k)).join(' ➔ ')}
- **延床面積目安**: 約 **${topology.totalTsubo} 坪** (${Math.round(topology.totalTsubo * 3.30578)} ㎡)
- **浴室仕様**: 1616サイズ システムバス (1坪タイプ・1600mm×1600mm)
- **キッチン仕様**: 対面壁付けシステムキッチン ＆ 背面食器棚・冷蔵庫スペース

右側の図面ビューア上部にある階数タブ（${topology.activeLevelKeys.map(k => getLevelLabel(k)).join(' / ')}）を切り替えて、各フロアの寸法・レイアウトをご確認いただけます。

「3階建てに変更して」「和室を追加して」「もっと広いLDKにしたい」「インナーガレージがほしい」など、自由にご要望をチャットへ入力してください。
`.trim();

  // Dynamic Suggestion Chips (間取り検討に特化)
  const quickChips = [];
  if (state.stories !== 3) quickChips.push('🏢 3階建てに変更');
  if (state.stories !== 1) quickChips.push('🏡 平屋プランに変更');
  if (!state.features.includes('tatami')) quickChips.push('🍵 和室 (約6帖) を追加');
  if (!state.features.includes('garage')) quickChips.push('🚗 インナーガレージを追加');
  if (!state.hasBasement) quickChips.push('🎬 地下防音ルームを追加');
  if (!state.hasRoofPH) quickChips.push('🌿 屋上ルーフバルコニーを追加');

  return {
    success: true,
    agentName: 'AI間取りプランナー',
    reply,
    validationLog,
    quickChips: quickChips.slice(0, 4),
    planState: state,
    plan: {
      planId: topology.planId,
      topology,
      geometry,
      svgs,
      activeLevelKeys: topology.activeLevelKeys
    }
  };
}

module.exports = {
  ROOM_CATALOG,
  createFloorPlanTopology,
  solve2DGeometry,
  renderFloorPlanSvg,
  generateIfcModel,
  runMultiAgentOrchestration,
  getLevelLabel
};
