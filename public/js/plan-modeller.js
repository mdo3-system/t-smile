// ========================================================
// 住ま居る 3D CAD/BIM Modeller & Reverse Plan Generator
// 建築基準寸法（壁芯・柱52.5mm + ボード12.5mm逃げ）連動エンジン
// ウィザード形式パース制作 ＆ 部位別ストック ＆ ArchiX風レタッチスタジオ
// ========================================================

class ArchitecturalPlanModeller {
  constructor() {
    this.currentStep = 1;
    this.roomType = 'ldk';

    // Dimensions (mm)
    this.dimX = 5460;
    this.dimY = 4550;
    this.colSize = 105;
    this.colOffset = 52.5;
    this.pbThick = 12.5;
    this.totalOffset = 65.0; // 52.5 + 12.5

    // Cuts (Boolean Subtraction for Polygonal Layout)
    this.cuts = [];

    // Ceiling & 3D Parameters
    this.ceilingH = 2500; // 50mm increments
    this.ceilingType = 'sloped';
    this.eyeLevel = 1500;
    this.fov = 400;

    // Equipment & Fixtures
    this.kitchenType = 'island_2550';
    this.vanityType = 'none';
    this.unitBathType = 'none';
    this.toiletType = 'none';
    this.windowSouth = 'sweep_2560';
    this.windowEast = 'none';
    this.windowWest = 'none';
    this.windowNorth = 'none';
    this.doorType = 'kamiya_fullheight_800';
    this.doorSwing = 'inward'; // 'inward' (内開き), 'outward' (外開き), 'sliding' (引き戸)
    this.adjoiningRoom = 'none'; // 'none', 'tatami_open', 'bedroom_open', 'study_open'
    this.furnitureStyle = 'japandi';
    this.furniture = [];

    // 3D Camera Controls
    this.viewMode = '2d';
    this.yaw = -0.32;
    this.pitch = 0.22;
    this.panX = 0;
    this.panY = 0;
    this.distance = 3200;

    this.isDragging = false;
    this.isPanning = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.scale = 0.08;

    // Dedicated Stock Slots Data
    this.stockSlots = {
      overall: {
        title: '明るい自然光の吹き抜け・ジャパンディ調',
        url: '/sample_data/model_ldk.jpg',
        base64: null
      },
      kitchen: {
        title: '対面フラットアイランド（セラミック天板・木目キャビネット）',
        url: '/sample_data/model_ldk.jpg',
        base64: null
      },
      furniture: {
        title: '無垢一枚板テーブル ＆ ハンス・ウェグナーYチェア',
        url: '/renders/ldk_japandi.png',
        base64: null
      },
      lighting: {
        title: 'PH5風ペンダント照明 ＆ 間接コーブ照明',
        url: '/sample_data/model_exterior.JPG',
        base64: null
      },
      doors: {
        title: 'KAMIYA フルハイトドア®（天井枠なし・ホワイト/木目）',
        url: '/sample_data/model_ldk.jpg',
        base64: null
      }
    };

    // Retouch & Output
    this.lastRenderedImage = null;
    this.cooldownSeconds = 0;
    this.cooldownTimer = null;

    this.initDOMElements();
    this.initRoomTypeConfigs();
    this.bindEvents();
    this.autoLayoutFurniture();
    this.updateInfoText();
    this.fetchRateStatus();
    this.render();
  }

  initDOMElements() {
    this.canvas2d = document.getElementById('modeller-2d-canvas');
    this.ctx2d = this.canvas2d ? this.canvas2d.getContext('2d') : null;

    this.canvas3d = document.getElementById('modeller-3d-canvas');
    this.ctx3d = this.canvas3d ? this.canvas3d.getContext('2d') : null;

    this.wrap2d = document.getElementById('modeller-2d-canvas-wrap');
    this.wrap3d = document.getElementById('modeller-3d-canvas-wrap');
    this.viewBadge = document.getElementById('modeller-view-badge');
    this.canvasTitle = document.getElementById('modeller-canvas-title');
    this.insideDimSpan = document.getElementById('modeller-inside-dim');
    this.offsetInfo = document.getElementById('modeller-offset-info');

    this.rateBadge = document.getElementById('modeller-rate-badge');
    this.queueBadge = document.getElementById('modeller-queue-badge');
    this.cooldownNotice = document.getElementById('modeller-cooldown-notice');
    this.cooldownSec = document.getElementById('modeller-cooldown-sec');

    this.cutsListContainer = document.getElementById('modeller-cuts-list');
  }

  // ==========================================
  // WIZARD STEP NAVIGATION
  // ==========================================
  goToStep(stepNum) {
    this.currentStep = stepNum;

    // Update stepper tabs
    document.querySelectorAll('.wizard-step-btn').forEach(btn => {
      const s = parseInt(btn.getAttribute('data-step'));
      if (s === stepNum) {
        btn.classList.add('active');
        btn.style.background = '#0284c7';
        btn.style.color = '#ffffff';
        btn.style.borderColor = '#0284c7';
      } else {
        btn.classList.remove('active');
        btn.style.background = '#f8fafc';
        btn.style.color = '#475569';
        btn.style.borderColor = '#e2e8f0';
      }
    });

    // Toggle Left Side Panes
    for (let i = 1; i <= 4; i++) {
      const pane = document.getElementById(`wizard-pane-step${i}`);
      if (pane) pane.style.display = (i === stepNum) ? 'block' : 'none';
    }

    // Auto-switch View based on Step
    const btn2d = document.getElementById('btn-modeller-view-2d');
    const btn3d = document.getElementById('btn-modeller-view-3d');

    if (stepNum === 1 || stepNum === 2) {
      this.viewMode = '2d';
      if (this.wrap2d) this.wrap2d.style.display = 'block';
      if (this.wrap3d) this.wrap3d.style.display = 'none';
      if (btn2d && btn3d) {
        btn2d.classList.add('btn-primary');
        btn2d.classList.remove('btn-secondary');
        btn3d.classList.add('btn-secondary');
        btn3d.classList.remove('btn-primary');
      }
      if (this.viewBadge) this.viewBadge.textContent = '2D PLAN VIEW';
    } else if (stepNum === 3) {
      this.viewMode = '3d';
      if (this.wrap2d) this.wrap2d.style.display = 'none';
      if (this.wrap3d) this.wrap3d.style.display = 'block';
      if (btn2d && btn3d) {
        btn3d.classList.add('btn-primary');
        btn3d.classList.remove('btn-secondary');
        btn2d.classList.add('btn-secondary');
        btn2d.classList.remove('btn-primary');
      }
      if (this.viewBadge) this.viewBadge.textContent = '3D REALTIME VIEW';
    }

    this.render();
  }


  // ==========================================
  // ROOM TYPE DEFINITIONS & ADAPTIVE SLOTS
  // ==========================================
  initRoomTypeConfigs() {
    this.roomTypeConfigs = {
      ldk: {
        name: '🏡 LDK全体',
        slots: {
          overall: { label: '① LDK全体空間イメージ', desc: '明るい自然光の吹き抜け・ジャパンディ調', url: '/sample_data/model_ldk.jpg' },
          kitchen: { label: '② システムキッチン（WEB画像）', desc: '対面フラットアイランド（セラミック天板）', url: '/sample_data/model_ldk.jpg' },
          furniture: { label: '③ リビング＆ダイニング家具', desc: '無垢一枚板テーブル ＆ ハンス・ウェグナーYチェア', url: '/renders/ldk_japandi.png' },
          lighting: { label: '④ 照明・梁アクセント', desc: 'PH5風ペンダント照明 ＆ 間接コーブ照明', url: '/sample_data/model_exterior.JPG' }
        }
      },
      living: {
        name: '🛋️ リビング（居間）',
        slots: {
          overall: { label: '① リビング全体イメージ', desc: '高天井の開放的なリビングラウンジ空間', url: '/renders/ldk_japandi.png' },
          kitchen: { label: '② TVボード・アクセント壁', desc: '天然石調エコカラット壁 ＆ フロートTVボード', url: '/sample_data/model_ldk.jpg' },
          furniture: { label: '③ ソファ・リビングテーブル', desc: 'ローバック・フェザーモジュールソファ', url: '/renders/ldk_japandi.png' },
          lighting: { label: '④ 間接照明・シーリングファン', desc: '折り上げ天井の間接LED照明 ＆ 木目ファン', url: '/sample_data/model_exterior.JPG' }
        }
      },
      kitchen: {
        name: '🍳 キッチン（台所）',
        slots: {
          overall: { label: '① キッチン空間全体', desc: 'ホテルライクな高級アイランドキッチン空間', url: '/sample_data/model_ldk.jpg' },
          kitchen: { label: '② キッチン本体・面材・天板', desc: '高級セラミックトップ天板 ＆ 木目突板キャビネット', url: '/sample_data/model_ldk.jpg' },
          furniture: { label: '③ 背面カップボード・パントリー', desc: 'フルハイト引き戸の大型背面収納', url: '/renders/ldk_japandi.png' },
          lighting: { label: '④ 水栓・レンジフード・照明', desc: 'グースネック混合水栓 ＆ アリアフィーナ薄型フード', url: '/sample_data/model_exterior.JPG' }
        }
      },
      dining: {
        name: '🍽️ ダイニング（食堂）',
        slots: {
          overall: { label: '① ダイニング空間全体', desc: '中庭を望む落ち着いたダイニング空間', url: '/renders/ldk_japandi.png' },
          kitchen: { label: '② ダイニングテーブル', desc: '耳付きウォールナット無垢一枚板テーブル', url: '/renders/ldk_japandi.png' },
          furniture: { label: '③ ダイニングチェア', desc: '北欧デザインのペーパーコードチェア4脚', url: '/sample_data/model_ldk.jpg' },
          lighting: { label: '④ ペンダントライト', desc: 'ルイスポールセンPH5ペンダント照明', url: '/sample_data/model_exterior.JPG' }
        }
      },
      bedroom: {
        name: '🛏️ 洋室・主寝室',
        slots: {
          overall: { label: '① 寝室全体イメージ', desc: '落ち着きのあるホテルライクなマスターベッドルーム', url: '/sample_data/model_ldk.jpg' },
          kitchen: { label: '② ベッド・ヘッドボード', desc: 'ファブリック張り大型キングサイズベッド', url: '/renders/ldk_japandi.png' },
          furniture: { label: '③ ナイトテーブル・ラグ', desc: 'オーク材サイドテーブル ＆ ウールラグ', url: '/sample_data/model_ldk.jpg' },
          lighting: { label: '④ 遮光カーテン・ブラケット照明', desc: 'リネン調遮光ドレープ ＆ 真鍮読書灯', url: '/sample_data/model_exterior.JPG' }
        }
      },
      japanese: {
        name: '🍵 和室（本格和室）',
        slots: {
          overall: { label: '① 和室全体イメージ', desc: '現代数寄屋造りの静謐な和室空間', url: '/sample_data/model_exterior.JPG' },
          kitchen: { label: '② 畳（琉球畳・ヘリなし）', desc: '国産和紙ヘリなし目積畳（市松敷き）', url: '/sample_data/model_ldk.jpg' },
          furniture: { label: '③ 床の間・座卓・格子戸', desc: 'ヒノキ無垢の床框 ＆ 杉柾目の格子引き戸', url: '/renders/ldk_japandi.png' },
          lighting: { label: '④ 和紙行灯・障子', desc: '吉村障子 ＆ 和紙透かし間接照明', url: '/sample_data/model_exterior.JPG' }
        }
      },
      koagari: {
        name: '🌾 小上がり畳コーナー',
        slots: {
          overall: { label: '① 小上がり全体イメージ', desc: 'リビングと緩やかにつながる350mm小上がり', url: '/sample_data/model_exterior.JPG' },
          kitchen: { label: '② 畳・引出し収納', desc: 'ヘリなし和紙畳 ＆ 下部スライド引出し収納', url: '/sample_data/model_ldk.jpg' },
          furniture: { label: '③ 掘りごたつ・低座卓', desc: '床下ヒーター内蔵の掘りごたつカウンター', url: '/renders/ldk_japandi.png' },
          lighting: { label: '④ 格子・ロールスクリーン', desc: '木製ルーバー格子 ＆ 和紙プリーツスクリーン', url: '/sample_data/model_exterior.JPG' }
        }
      },
      guest: {
        name: '🏮 客間・ゲストルーム',
        slots: {
          overall: { label: '① ゲストルーム全体', desc: 'おもてなしの心を感じる和洋折衷ゲストルーム', url: '/sample_data/model_exterior.JPG' },
          kitchen: { label: '② ソファベッド・寝具', desc: 'デイベッドとしても使える上質ソファ', url: '/renders/ldk_japandi.png' },
          furniture: { label: '③ クローゼット・荷物置台', desc: '来客用ハンガーラック ＆ ラゲッジスペース', url: '/sample_data/model_ldk.jpg' },
          lighting: { label: '④ 調光照明・ブラインド', desc: '柔らかな2700K温白色の調光ダウンライト', url: '/sample_data/model_exterior.JPG' }
        }
      },
      kids: {
        name: '🧸 子ども部屋',
        slots: {
          overall: { label: '① 子ども部屋全体', desc: '明るく健やかな成長を育む北欧ナチュラルキッズルーム', url: '/renders/ldk_japandi.png' },
          kitchen: { label: '② ベッド・ロフトベッド', desc: '無垢パイン材のシングルベッド', url: '/sample_data/model_ldk.jpg' },
          furniture: { label: '③ 学習デスク・収納棚', desc: '成長に合わせて高さ調整できる木製デスク', url: '/renders/ldk_japandi.png' },
          lighting: { label: '④ 明るいシーリング照明', desc: '文字が見やすい高演色LEDシーリングライト', url: '/sample_data/model_exterior.JPG' }
        }
      },
      loft: {
        name: '🛖 小屋裏ロフト・アティック',
        slots: {
          overall: { label: '① ロフト全体イメージ', desc: '勾配天井の隠れ家のような落ち着くロフト空間', url: '/sample_data/model_exterior.JPG' },
          kitchen: { label: '② 登り梁・屋根勾配', desc: '太い無垢の構造登り梁 ＆ 羽目板天井', url: '/sample_data/model_ldk.jpg' },
          furniture: { label: '③ ビーズクッション・ロー本棚', desc: '床座でリラックスできるビーズソファと漫画棚', url: '/renders/ldk_japandi.png' },
          lighting: { label: '④ 天窓（トップライト）・照明', desc: '星空が見える開閉式天窓 ＆ スポットライト', url: '/sample_data/model_exterior.JPG' }
        }
      },
      study: {
        name: '📚 書斎・ワークスペース',
        slots: {
          overall: { label: '① 書斎全体イメージ', desc: '仕事と読書に没頭できる静かな男の隠れ家DEN', url: '/renders/ldk_japandi.png' },
          kitchen: { label: '② 造作カウンターデスク', desc: '配線すっきりの奥行650mm幅広木製カウンター', url: '/sample_data/model_ldk.jpg' },
          furniture: { label: '③ 壁面本棚・ワークチェア', desc: '天井までの大容量本棚 ＆ ハーマンミラー風チェア', url: '/renders/ldk_japandi.png' },
          lighting: { label: '④ デスク手元灯・間接光', desc: 'アーム式タスクライト ＆ 棚下間接LED', url: '/sample_data/model_exterior.JPG' }
        }
      },
      bath: {
        name: '🛁 バスルーム（浴室）',
        slots: {
          overall: { label: '① 浴室全体イメージ', desc: '坪庭をガラス越しに望むリゾート温泉風バスルーム', url: '/sample_data/model_exterior.JPG' },
          kitchen: { label: '② バスタブ（浴槽）', desc: '人工大理石のゆったりヘッドレスト付き浴槽', url: '/sample_data/model_ldk.jpg' },
          furniture: { label: '③ 水栓・シャワー・壁パネル', desc: 'オーバーヘッドレインシャワー ＆ 大判タイル壁', url: '/renders/ldk_japandi.png' },
          lighting: { label: '④ 浴室間接照明・窓', desc: '防水調光ライン照明 ＆ 坪庭ライトアップ', url: '/sample_data/model_exterior.JPG' }
        }
      },
      washroom: {
        name: '🪞 洗面・脱衣・化粧室',
        slots: {
          overall: { label: '① パウダールーム全体', desc: '毎朝の身支度が楽しくなるホテルライク洗面室', url: '/sample_data/model_ldk.jpg' },
          kitchen: { label: '② 造作洗面カウンター', desc: 'シーザーストーン天板 ＆ アンダーボウル洗面', url: '/renders/ldk_japandi.png' },
          furniture: { label: '③ 一面大型ミラー・収納', desc: 'LEDバックライト付き大型フレームレスミラー', url: '/sample_data/model_ldk.jpg' },
          lighting: { label: '④ タイル・タオルウォーマー', desc: 'ヘリンボーン柄モザイクタイルアクセント壁', url: '/sample_data/model_exterior.JPG' }
        }
      },
      toilet: {
        name: '🚽 トイレ（レストルーム）',
        slots: {
          overall: { label: '① トイレ空間全体', desc: '落ち着きのあるモダンな高級レストルーム', url: '/sample_data/model_ldk.jpg' },
          kitchen: { label: '② 便器本体', desc: 'サティスG調のすっきりタンクレストイレ', url: '/renders/ldk_japandi.png' },
          furniture: { label: '③ 手洗いカウンター・鏡', desc: 'ベッセル式小型手洗いボウル ＆ スリムミラー', url: '/sample_data/model_ldk.jpg' },
          lighting: { label: '④ コーナー間接照明・壁紙', desc: '下からのアッパー間接照明 ＆ 和紙調クロス', url: '/sample_data/model_exterior.JPG' }
        }
      },
      wic: {
        name: '👗 WIC・着替え室',
        slots: {
          overall: { label: '① クローゼット全体', desc: 'ブティックのような見せる収納ウォークインクローゼット', url: '/sample_data/model_ldk.jpg' },
          kitchen: { label: '② ハンガーパイプ・棚板', desc: 'ブラックアイアンパイプ ＆ 無垢可動棚', url: '/renders/ldk_japandi.png' },
          furniture: { label: '③ アイランドチェスト・鏡', desc: 'ガラス天板のアクセサリー収納チェスト', url: '/sample_data/model_ldk.jpg' },
          lighting: { label: '④ ダウンライト・姿見', desc: '演色性の高いスポットライト ＆ 全身姿見ミラー', url: '/sample_data/model_exterior.JPG' }
        }
      },
      shop: {
        name: '☕ 店舗・カフェ',
        slots: {
          overall: { label: '① 店舗空間全体', desc: '木の温もりを感じる居心地の良いカフェ空間', url: '/sample_data/model_exterior.JPG' },
          kitchen: { label: '② レジカウンター・厨房', desc: 'モールテックス仕上げのオーダーカウンター', url: '/sample_data/model_ldk.jpg' },
          furniture: { label: '③ 客席テーブル・チェア', desc: 'ヴィンテージ風アイアン脚カフェテーブル', url: '/renders/ldk_japandi.png' },
          lighting: { label: '④ ショップサイン・照明', desc: '真鍮エジソンランプ ＆ ネオンサイン', url: '/sample_data/model_exterior.JPG' }
        }
      },
      office: {
        name: '🏢 事務所・アトリエ',
        slots: {
          overall: { label: '① オフィス空間全体', desc: 'クリエイティブな発想を生むオープンスタジオオフィス', url: '/renders/ldk_japandi.png' },
          kitchen: { label: '② ワーキングデスク島', desc: '4人掛けの広々フリーアドレスビッグテーブル', url: '/sample_data/model_ldk.jpg' },
          furniture: { label: '③ 打合せブース・シェルフ', desc: '木製ルーバー間仕切りのミーティングコーナー', url: '/renders/ldk_japandi.png' },
          lighting: { label: '④ ライン照明・グリーン', desc: '天井埋込ラインLED照明 ＆ ハンギングプランツ', url: '/sample_data/model_exterior.JPG' }
        }
      },
      garage: {
        name: '🚗 車庫・ビルトインガレージ',
        slots: {
          overall: { label: '① ガレージ空間全体', desc: 'リビングから愛車を眺める大人のビルトインガレージ', url: '/sample_data/model_exterior.JPG' },
          kitchen: { label: '② 愛車・シャッター', desc: '木目オーバースライダーシャッター ＆ 愛車', url: '/sample_data/model_exterior.JPG' },
          furniture: { label: '③ ツールキャビネット・作業台', desc: 'スナップオン調のブラック大型ツールキャビネット', url: '/sample_data/model_ldk.jpg' },
          lighting: { label: '④ 土間コンクリート・照明', desc: '防塵エポキシ塗装土間 ＆ レースウェイ照明', url: '/renders/ldk_japandi.png' }
        }
      }
    };
  }

  applyRoomType(roomKey) {
    if (!this.roomTypeConfigs[roomKey]) return;
    this.roomType = roomKey;
    const cfg = this.roomTypeConfigs[roomKey];

    // Update Room Type button styles
    document.querySelectorAll('.btn-room-type').forEach(btn => {
      const r = btn.getAttribute('data-room');
      if (r === roomKey) {
        btn.classList.add('selected');
        btn.style.background = '#0284c7';
        btn.style.color = '#fff';
        btn.style.borderColor = '#0284c7';
      } else {
        btn.classList.remove('selected');
        btn.style.background = '#ffffff';
        btn.style.color = '#1e293b';
        btn.style.borderColor = '#cbd5e1';
      }
    });

    // Update Header Badge
    const badge = document.getElementById('selected-room-type-badge');
    if (badge) badge.textContent = cfg.name;

    // Update 4 dedicated slots
    ['overall', 'kitchen', 'furniture', 'lighting'].forEach(slotKey => {
      const slotCfg = cfg.slots[slotKey];
      if (!slotCfg) return;

      const titleEl = document.getElementById(`slot-title-${slotKey}`);
      if (titleEl) titleEl.textContent = slotCfg.label;

      const descInput = document.getElementById(`slot-desc-${slotKey}`);
      if (descInput) descInput.value = slotCfg.desc;

      const previewDiv = document.getElementById(`slot-preview-${slotKey}`);
      if (previewDiv) {
        previewDiv.innerHTML = `<img src="${slotCfg.url}" alt="${slotKey}" style="width:100%; height:100%; object-fit:cover;" />`;
      }

      this.stockSlots[slotKey] = {
        title: slotCfg.desc,
        url: slotCfg.url,
        base64: null
      };
    });

    // Preset dimensions, kitchen, window & equipment per room type
    if (roomKey === 'toilet') {
      this.dimX = 910;
      this.dimY = 1592.5; // 住ま居る基本寸法 910×1592.5mm
      this.kitchenType = 'none';
      this.windowSouth = 'none';
      this.windowEast = 'none';
      this.windowWest = 'none';
      this.windowNorth = 'none';
      this.doorType = 'high_door_800';
      this.doorSwing = 'outward'; // トイレは安全上、外開きが基本
      this.toiletType = 'tankless';
    } else if (roomKey === 'washroom') {
      this.dimX = 1820;
      this.dimY = 1820;
      this.kitchenType = 'none';
      this.windowSouth = 'none';
      this.vanityType = 'vanity_1200';
    } else if (roomKey === 'bath') {
      this.dimX = 1820;
      this.dimY = 1820;
      this.kitchenType = 'none';
      this.windowSouth = 'slit_600';
      this.unitBathType = 'ub_1616';
    } else if (roomKey === 'garage') {
      this.dimX = 3640;
      this.dimY = 6370;
      this.kitchenType = 'none';
      this.windowSouth = 'none';
    } else if (roomKey === 'japanese' || roomKey === 'koagari' || roomKey === 'guest') {
      this.dimX = 3640;
      this.dimY = 3640;
      this.kitchenType = 'none';
      this.windowSouth = 'waist_1650';
    } else if (roomKey === 'bedroom') {
      this.dimX = 3640;
      this.dimY = 3640;
      this.kitchenType = 'none';
      this.windowSouth = 'sweep_2560';
    } else if (roomKey === 'study') {
      this.dimX = 2730;
      this.dimY = 2730;
      this.kitchenType = 'none';
      this.windowSouth = 'slit_600';
    } else if (roomKey === 'wic') {
      this.dimX = 1820;
      this.dimY = 2730;
      this.kitchenType = 'none';
      this.windowSouth = 'none';
    } else if (roomKey === 'kids') {
      this.dimX = 2730;
      this.dimY = 3640;
      this.kitchenType = 'none';
      this.windowSouth = 'waist_1650';
    } else if (roomKey === 'loft') {
      this.dimX = 3640;
      this.dimY = 2730;
      this.kitchenType = 'none';
      this.windowSouth = 'slit_600';
    } else if (roomKey === 'shop' || roomKey === 'office') {
      this.dimX = 5460;
      this.dimY = 4550;
      this.kitchenType = 'none';
      this.windowSouth = 'sweep_2560';
    } else if (roomKey === 'living' || roomKey === 'dining') {
      this.dimX = 4550;
      this.dimY = 3640;
      this.kitchenType = 'none';
      this.windowSouth = 'sweep_2560';
    } else if (roomKey === 'kitchen') {
      this.dimX = 3640;
      this.dimY = 2730;
      this.kitchenType = 'island_2550';
      this.windowSouth = 'slit_600';
    } else { // ldk
      this.dimX = 5460;
      this.dimY = 4550;
      this.kitchenType = 'island_2550';
      this.windowSouth = 'sweep_2560';
    }

    // Sync input values to DOM
    const inX = document.getElementById('modeller-dim-x');
    const inY = document.getElementById('modeller-dim-y');
    const selKit = document.getElementById('modeller-kitchen-type');
    const selWinS = document.getElementById('modeller-window-south');
    const selWinE = document.getElementById('modeller-window-east');
    const selWinW = document.getElementById('modeller-window-west');
    const selWinN = document.getElementById('modeller-window-north');
    const selDoor = document.getElementById('modeller-door-type') || document.getElementById('modeller-door-kamiya');
    const selSwing = document.getElementById('modeller-door-swing');
    const selToilet = document.getElementById('modeller-toilet-type');
    if (selSwing) selSwing.value = this.doorSwing;
    const selVanity = document.getElementById('modeller-bath-vanity');
    const selBath = document.getElementById('modeller-bath-unit');

    if (inX) inX.value = this.dimX;
    if (inY) inY.value = this.dimY;
    if (selKit) selKit.value = this.kitchenType;
    if (selWinS) selWinS.value = this.windowSouth;
    if (selWinE) selWinE.value = this.windowEast;
    if (selWinW) selWinW.value = this.windowWest;
    if (selWinN) selWinN.value = this.windowNorth;
    if (selDoor) selDoor.value = this.doorType;
    if (selToilet) selToilet.value = this.toiletType;
    if (selVanity) selVanity.value = this.vanityType;
    if (selBath) selBath.value = this.unitBathType;

    this.updateInfoText();

    // Re-layout furniture according to room type
    this.autoLayoutFurniture();
    this.render();
  }

  bindEvents() {
    // Top Tabs: Upload Photo vs 3D CAD Modeller
    const tabUpload = document.getElementById('archix-mode-upload');
    const tabPlan = document.getElementById('archix-mode-from-plan');
    const contUpload = document.getElementById('perspective-photo-staging-container');
    const contPlan = document.getElementById('archix-plan-modeller-container');

    if (tabUpload && tabPlan && contUpload && contPlan) {
      tabUpload.addEventListener('click', () => {
        tabUpload.classList.add('btn-primary');
        tabUpload.classList.remove('btn-secondary');
        tabUpload.style.background = 'linear-gradient(135deg, #d97706, #f59e0b)';
        tabUpload.style.color = '#0f172a';
        tabPlan.classList.add('btn-secondary');
        tabPlan.classList.remove('btn-primary');
        tabPlan.style.background = '#e0f2fe';
        tabPlan.style.color = '#0284c7';
        contUpload.style.display = 'block';
        contPlan.style.display = 'none';
      });

      tabPlan.addEventListener('click', () => {
        tabPlan.classList.add('btn-primary');
        tabPlan.classList.remove('btn-secondary');
        tabPlan.style.background = 'linear-gradient(135deg, #0284c7, #38bdf8)';
        tabPlan.style.color = '#ffffff';
        tabUpload.classList.add('btn-secondary');
        tabUpload.classList.remove('btn-primary');
        tabUpload.style.background = '#fef3c7';
        tabUpload.style.color = '#b45309';
        contUpload.style.display = 'none';
        contPlan.style.display = 'block';
        this.render();
      });
    }

    // Room Type Selection Buttons
    document.querySelectorAll('.btn-room-type').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const room = e.currentTarget.getAttribute('data-room');
        this.applyRoomType(room);
      });
    });

    // Stepper tab buttons
    document.querySelectorAll('.wizard-step-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const step = parseInt(e.currentTarget.getAttribute('data-step'));
        this.goToStep(step);
      });
    });

    // Wizard Next & Back buttons
    document.querySelectorAll('.btn-wizard-next, .btn-wizard-back').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = parseInt(e.currentTarget.getAttribute('data-goto'));
        this.goToStep(target);
      });
    });

    // Back to Angle from Step 4
    const btnBackToAngle = document.getElementById('btn-wizard-back-to-angle');
    if (btnBackToAngle) {
      btnBackToAngle.addEventListener('click', () => {
        this.goToStep(3);
      });
    }

    // 2D vs 3D manual toggle buttons
    const btn2d = document.getElementById('btn-modeller-view-2d');
    const btn3d = document.getElementById('btn-modeller-view-3d');
    if (btn2d && btn3d) {
      btn2d.addEventListener('click', () => {
        this.viewMode = '2d';
        btn2d.classList.add('btn-primary'); btn2d.classList.remove('btn-secondary');
        btn3d.classList.add('btn-secondary'); btn3d.classList.remove('btn-primary');
        if (this.wrap2d) this.wrap2d.style.display = 'block';
        if (this.wrap3d) this.wrap3d.style.display = 'none';
        if (this.viewBadge) this.viewBadge.textContent = '2D PLAN VIEW';
        this.render();
      });

      btn3d.addEventListener('click', () => {
        this.viewMode = '3d';
        btn3d.classList.add('btn-primary'); btn3d.classList.remove('btn-secondary');
        btn2d.classList.add('btn-secondary'); btn2d.classList.remove('btn-primary');
        if (this.wrap2d) this.wrap2d.style.display = 'none';
        if (this.wrap3d) this.wrap3d.style.display = 'block';
        if (this.viewBadge) this.viewBadge.textContent = '3D REALTIME VIEW';
        this.render();
      });
    }

    // Shape Presets
    document.querySelectorAll('.modeller-shape-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const shape = e.currentTarget.getAttribute('data-shape');
        this.applyShapePreset(shape);
      });
    });

    // Boolean Cut Add & Clear
    const btnAddCut = document.getElementById('btn-modeller-add-cut');
    if (btnAddCut) {
      btnAddCut.addEventListener('click', () => {
        const type = document.getElementById('modeller-cut-type').value;
        const corner = document.getElementById('modeller-cut-corner').value;
        const w = parseInt(document.getElementById('modeller-cut-w').value) || 1820;
        const d = parseInt(document.getElementById('modeller-cut-d').value) || 1820;

        this.cuts.push({
          id: 'cut_' + Date.now().toString(36),
          type,
          corner,
          w: Math.min(w, this.dimX - 910),
          d: Math.min(d, this.dimY - 910)
        });
        this.renderCutsList();
        this.autoLayoutFurniture();
        this.render();
      });
    }

    const btnClearCuts = document.getElementById('btn-modeller-clear-cuts');
    if (btnClearCuts) {
      btnClearCuts.addEventListener('click', () => {
        this.cuts = [];
        this.renderCutsList();
        this.autoLayoutFurniture();
        this.render();
      });
    }

    // Dimensions (Min: 450x600, Max: 15m x 15m, Support decimal like 1592.5)
    const inputX = document.getElementById('modeller-dim-x');
    const inputY = document.getElementById('modeller-dim-y');
    if (inputX && inputY) {
      inputX.addEventListener('input', (e) => {
        this.dimX = Math.max(450, Math.min(15000, parseFloat(e.target.value) || 910));
        this.updateInfoText();
        this.autoLayoutFurniture();
        this.render();
      });
      inputY.addEventListener('input', (e) => {
        this.dimY = Math.max(600, Math.min(15000, parseFloat(e.target.value) || 910));
        this.updateInfoText();
        this.autoLayoutFurniture();
        this.render();
      });
    }

    // PB thickness
    const selectPb = document.getElementById('modeller-pb-thick');
    if (selectPb) {
      selectPb.addEventListener('change', (e) => {
        this.pbThick = parseFloat(e.target.value) || 12.5;
        this.totalOffset = this.colOffset + this.pbThick;
        this.updateInfoText();
        this.render();
      });
    }

    // Ceiling Height (50mm step synchronization)
    const ceilRange = document.getElementById('modeller-ceiling-h-range');
    const ceilInput = document.getElementById('modeller-ceiling-h-input');
    const ceilVal = document.getElementById('modeller-ceiling-h-val');
    const ceilSelect = document.getElementById('modeller-ceiling-type');

    if (ceilRange && ceilInput && ceilVal) {
      ceilRange.addEventListener('input', (e) => {
        this.ceilingH = Math.round(parseInt(e.target.value) / 50) * 50;
        ceilInput.value = this.ceilingH;
        ceilVal.textContent = this.ceilingH.toLocaleString() + ' mm';
        this.render();
      });

      ceilInput.addEventListener('input', (e) => {
        this.ceilingH = Math.round((parseInt(e.target.value) || 2500) / 50) * 50;
        ceilRange.value = this.ceilingH;
        ceilVal.textContent = this.ceilingH.toLocaleString() + ' mm';
        this.render();
      });
    }

    if (ceilSelect) {
      ceilSelect.addEventListener('change', (e) => {
        this.ceilingType = e.target.value;
        this.render();
      });
    }

    // Equipment selects (Kitchen, Vanity, Bath, Toilet)
    const kSelect = document.getElementById('modeller-kitchen-type');
    if (kSelect) {
      kSelect.addEventListener('change', (e) => {
        this.kitchenType = e.target.value;
        this.autoLayoutFurniture();
        this.render();
      });
    }

    const vSelect = document.getElementById('modeller-bath-vanity');
    if (vSelect) {
      vSelect.addEventListener('change', (e) => {
        this.vanityType = e.target.value;
        this.autoLayoutFurniture();
        this.render();
      });
    }

    const bSelect = document.getElementById('modeller-bath-unit');
    if (bSelect) {
      bSelect.addEventListener('change', (e) => {
        this.unitBathType = e.target.value;
        this.autoLayoutFurniture();
        this.render();
      });
    }

    const tSelect = document.getElementById('modeller-toilet-type');
    if (tSelect) {
      tSelect.addEventListener('change', (e) => {
        this.toiletType = e.target.value;
        this.autoLayoutFurniture();
        this.render();
      });
    }

    // Multi-orientation Windows (South, East, West, North)
    const wsSelect = document.getElementById('modeller-window-south');
    if (wsSelect) {
      wsSelect.addEventListener('change', (e) => {
        this.windowSouth = e.target.value;
        this.render();
      });
    }

    const weSelect = document.getElementById('modeller-window-east');
    if (weSelect) {
      weSelect.addEventListener('change', (e) => {
        this.windowEast = e.target.value;
        this.render();
      });
    }

    const wwSelect = document.getElementById('modeller-window-west');
    if (wwSelect) {
      wwSelect.addEventListener('change', (e) => {
        this.windowWest = e.target.value;
        this.render();
      });
    }

    const wnSelect = document.getElementById('modeller-window-north');
    if (wnSelect) {
      wnSelect.addEventListener('change', (e) => {
        this.windowNorth = e.target.value;
        this.render();
      });
    }

    // Interior Doors (KAMIYA Full-Height Door & Swing Direction)
    const doorSelect = document.getElementById('modeller-door-type') || document.getElementById('modeller-door-kamiya');
    if (doorSelect) {
      doorSelect.addEventListener('change', (e) => {
        this.doorType = e.target.value;
        if (this.doorType.includes('sliding')) {
          this.doorSwing = 'sliding';
          const sw = document.getElementById('modeller-door-swing');
          if (sw) sw.value = 'sliding';
        }
        this.render();
      });
    }

    const doorSwingSelect = document.getElementById('modeller-door-swing');
    if (doorSwingSelect) {
      doorSwingSelect.addEventListener('change', (e) => {
        this.doorSwing = e.target.value;
        this.render();
      });
    }

    // 2-Room Adjoining Layout (Tatami Open / LDK Integration)
    const adjSelect = document.getElementById('modeller-adjoining-room');
    if (adjSelect) {
      adjSelect.addEventListener('change', (e) => {
        this.adjoiningRoom = e.target.value;
        this.autoLayoutFurniture();
        this.render();
      });
    }

    // Dedicated Stock Slots Upload & Presets
    document.querySelectorAll('.slot-file-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const slot = e.target.getAttribute('data-slot');
        const file = e.target.files[0];
        if (file) this.handleSlotFileUpload(slot, file);
      });
    });

    document.querySelectorAll('.slot-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slot = e.currentTarget.getAttribute('data-slot');
        this.cycleSlotPreset(slot);
      });
    });

    // 3D Camera Quick Presets
    document.querySelectorAll('.btn-camera-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.currentTarget.getAttribute('data-preset');
        this.applyCameraPreset(preset);
      });
    });

    // 3D Camera Height & FOV sliders
    const camH = document.getElementById('modeller-camera-height');
    const camHVal = document.getElementById('cam-val-eye');
    const camFov = document.getElementById('modeller-camera-fov');
    const camFovVal = document.getElementById('cam-val-fov');

    if (camH && camHVal) {
      camH.addEventListener('input', (e) => {
        this.eyeLevel = parseInt(e.target.value) || 1500;
        camHVal.textContent = this.eyeLevel.toLocaleString() + ' mm';
        this.render();
      });
    }

    if (camFov && camFovVal) {
      camFov.addEventListener('input', (e) => {
        this.fov = parseInt(e.target.value) || 400;
        const mm = Math.round(11200 / this.fov);
        camFovVal.textContent = `${mm <= 24 ? '超広角' : mm <= 35 ? '広角' : '標準'} ${mm}mm相当`;
        this.render();
      });
    }

    // Render SD Perspective Trigger
    const btnRenderSD = document.getElementById('btn-modeller-render-sd');
    if (btnRenderSD) {
      btnRenderSD.addEventListener('click', () => {
        this.generateSdPerspectiveFromModel();
      });
    }

    // ArchiX Retouch: Denoise range & Regenerate
    const retouchDenoise = document.getElementById('retouch-denoise');
    const retouchDenoiseVal = document.getElementById('retouch-denoise-val');
    if (retouchDenoise && retouchDenoiseVal) {
      retouchDenoise.addEventListener('input', (e) => {
        retouchDenoiseVal.textContent = parseFloat(e.target.value).toFixed(2);
      });
    }

    const btnRetouchRegen = document.getElementById('btn-retouch-regenerate');
    if (btnRetouchRegen) {
      btnRetouchRegen.addEventListener('click', () => {
        this.executeRetouchRegenerate();
      });
    }

    // Enhanced 3D Canvas Interactions (Orbit, Pan, Zoom)
    if (this.canvas3d) {
      this.canvas3d.addEventListener('contextmenu', e => e.preventDefault());

      this.canvas3d.addEventListener('mousedown', (e) => {
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        if (e.button === 2 || e.shiftKey) {
          this.isPanning = true;
        } else {
          this.isDragging = true;
        }
      });

      window.addEventListener('mousemove', (e) => {
        if (!this.isDragging && !this.isPanning) return;
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;

        if (this.isPanning) {
          this.panX += dx * 1.5;
          this.panY += dy * 1.5;
        } else if (this.isDragging) {
          this.yaw += dx * 0.007;
          this.pitch = Math.max(-0.45, Math.min(Math.PI / 2 - 0.02, this.pitch + dy * 0.007));
        }

        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.render3D();
      });

      window.addEventListener('mouseup', () => {
        this.isDragging = false;
        this.isPanning = false;
      });

      this.canvas3d.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY;
        this.distance = Math.max(1200, Math.min(8000, this.distance + delta * 2.5));
        this.render3D();
      }, { passive: false });

      // ==========================================
      // Mobile Touch Gestures (Single Finger Rotate, 2-Finger Pinch Zoom & Pan)
      // ==========================================
      let touchStartX = 0;
      let touchStartY = 0;
      let initialPinchDist = null;
      let initialDistance = this.distance;
      let touchMode = 'none'; // 'rotate', 'pinch_pan'

      const getTouchDistance = (t1, t2) => {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
      };

      this.canvas3d.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          touchMode = 'rotate';
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
          touchMode = 'pinch_pan';
          initialPinchDist = getTouchDistance(e.touches[0], e.touches[1]);
          initialDistance = this.distance;
          touchStartX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          touchStartY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        }
        // Prevent default browser scrolling while touching the 3D canvas
        e.preventDefault();
      }, { passive: false });

      this.canvas3d.addEventListener('touchmove', (e) => {
        if (touchMode === 'rotate' && e.touches.length === 1) {
          const dx = e.touches[0].clientX - touchStartX;
          const dy = e.touches[0].clientY - touchStartY;
          this.yaw += dx * 0.009;
          this.pitch = Math.max(-0.45, Math.min(Math.PI / 2 - 0.02, this.pitch + dy * 0.009));
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          this.render3D();
        } else if (touchMode === 'pinch_pan' && e.touches.length === 2) {
          // Pinch Zoom
          const currentDist = getTouchDistance(e.touches[0], e.touches[1]);
          if (initialPinchDist && initialPinchDist > 0) {
            const scaleFactor = initialPinchDist / Math.max(10, currentDist);
            this.distance = Math.max(1200, Math.min(8000, initialDistance * scaleFactor));
          }

          // 2-Finger Pan
          const currentMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const currentMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          const dx = currentMidX - touchStartX;
          const dy = currentMidY - touchStartY;
          this.panX += dx * 1.5;
          this.panY += dy * 1.5;
          touchStartX = currentMidX;
          touchStartY = currentMidY;

          this.render3D();
        }
        e.preventDefault();
      }, { passive: false });

      this.canvas3d.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
          touchMode = 'none';
          initialPinchDist = null;
        } else if (e.touches.length === 1) {
          touchMode = 'rotate';
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          initialPinchDist = null;
        }
      });

      // Window resize listener to sync canvas dimensions on mobile orientation change
      window.addEventListener('resize', () => {
        this.render();
      });
    }
  }

  // ==========================================
  // CAMERA PRESETS
  // ==========================================
  applyCameraPreset(preset) {
    if (preset === 'top') {
      // Top-View (Bird's Eye Looking Down from Ceiling)
      this.yaw = 0;
      this.pitch = 1.15; // ~66 degrees steep look-down
      this.distance = 3800;
      this.panX = 0;
      this.panY = 0;
    } else if (preset === 'eye') {
      // Straight Eye Level
      this.yaw = 0;
      this.pitch = 0.05;
      this.distance = 2600;
      this.eyeLevel = 1500;
      this.panX = 0;
      this.panY = 0;
    } else if (preset === 'diagonal') {
      // Sweeping diagonal perspective
      this.yaw = -0.42;
      this.pitch = 0.25;
      this.distance = 3200;
      this.panX = 0;
      this.panY = 0;
    } else if (preset === 'reset') {
      // Reset Center
      this.yaw = -0.32;
      this.pitch = 0.22;
      this.distance = 3200;
      this.panX = 0;
      this.panY = 0;
    }

    const camH = document.getElementById('modeller-camera-height');
    const camHVal = document.getElementById('cam-val-eye');
    if (camH && camHVal) {
      camH.value = this.eyeLevel;
      camHVal.textContent = this.eyeLevel.toLocaleString() + ' mm';
    }

    this.render3D();
  }

  // ==========================================
  // DEDICATED PART SLOTS HANDLING
  // ==========================================
  handleSlotFileUpload(slot, file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;
      this.stockSlots[slot].base64 = base64;
      this.stockSlots[slot].url = base64;

      const previewDiv = document.getElementById(`slot-preview-${slot}`);
      if (previewDiv) {
        previewDiv.innerHTML = `<img src="${base64}" alt="${slot}" style="width:100%; height:100%; object-fit:cover;" />`;
      }

      const statusSpan = document.getElementById(`slot-status-${slot}`);
      if (statusSpan) {
        statusSpan.textContent = '✓ アップロード完了';
        statusSpan.style.color = '#16a34a';
      }

      // Upload to server stock directory
      try {
        await fetch('/api/perspective/stock-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Image: base64,
            title: `${slot}_${file.name}`,
            category: slot
          })
        });
      } catch (err) {
        console.warn('Stock background upload warning:', err);
      }
    };
    reader.readAsDataURL(file);
  }

  cycleSlotPreset(slot) {
    const presetSamples = {
      overall: [
        { title: '明るい自然光の吹き抜け・ジャパンディ調', url: '/sample_data/model_ldk.jpg' },
        { title: '大人のグレージュ・ホテルライク空間', url: '/renders/ldk_japandi.png' }
      ],
      kitchen: [
        { title: '対面フラットアイランド（セラミック天板）', url: '/sample_data/model_ldk.jpg' },
        { title: 'ペニンシュラ木目キッチン ＋ グースネック水栓', url: '/sample_data/model_exterior.JPG' }
      ],
      furniture: [
        { title: '無垢一枚板テーブル ＆ ハンス・ウェグナーYチェア', url: '/renders/ldk_japandi.png' },
        { title: 'フェザーローバックソファ ＆ 円形ローテーブル', url: '/sample_data/model_ldk.jpg' }
      ],
      lighting: [
        { title: 'PH5風ペンダント照明 ＆ 間接コーブ照明', url: '/sample_data/model_exterior.JPG' },
        { title: '真鍮ブラケット照明 ＆ スポットライト', url: '/sample_data/model_ldk.jpg' }
      ]
    };

    const list = presetSamples[slot] || [];
    if (list.length === 0) return;

    const currentUrl = this.stockSlots[slot].url;
    const nextIdx = (list.findIndex(item => item.url === currentUrl) + 1) % list.length;
    const nextItem = list[nextIdx];

    this.stockSlots[slot].title = nextItem.title;
    this.stockSlots[slot].url = nextItem.url;
    this.stockSlots[slot].base64 = null;

    const previewDiv = document.getElementById(`slot-preview-${slot}`);
    if (previewDiv) {
      previewDiv.innerHTML = `<img src="${nextItem.url}" alt="${slot}" style="width:100%; height:100%; object-fit:cover;" />`;
    }

    const descInput = document.getElementById(`slot-desc-${slot}`);
    if (descInput) descInput.value = nextItem.title;
  }

  renderCutsList() {
    if (!this.cutsListContainer) return;
    if (!this.cuts || this.cuts.length === 0) {
      this.cutsListContainer.innerHTML = '<span style="color:#94a3b8; font-size:0.75rem;">切り欠き・削り取りなし（矩形・完全区画）</span>';
      return;
    }
    this.cutsListContainer.innerHTML = this.cuts.map(c => {
      const typeLabel = c.type === 'rect' ? '四角形削り' : '三角形削り';
      const cornerLabel = (c.corner || '').toUpperCase();
      return `<span style="background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:4px; font-size:0.75rem; border:1px solid #bae6fd; display:inline-flex; align-items:center; gap:4px;">
        ✂️ ${cornerLabel}隅 ${typeLabel} (${c.w}×${c.d}mm)
      </span>`;
    }).join(' ');
  }

  // ==========================================
  // SHAPE PRESETS & CUTS LIST
  // ==========================================
  applyShapePreset(shape) {
    this.cuts = [];
    if (shape === 'rect') {
      this.dimX = 5460;
      this.dimY = 4550;
      this.adjoiningRoom = 'none';
      const adjSelect = document.getElementById('modeller-adjoining-room');
      if (adjSelect) adjSelect.value = 'none';
    } else if (shape === 'adjoining_tatami') {
      // 2間続き間取り（手前LDK + 奥和室の開放）
      this.dimX = 7280;
      this.dimY = 4550;
      this.adjoiningRoom = 'tatami_open';
      this.kitchenType = 'island_2550';
      this.windowSouth = 'sweep_2560';
      this.windowEast = 'slit_600';
      const adjSelect = document.getElementById('modeller-adjoining-room');
      if (adjSelect) adjSelect.value = 'tatami_open';
    } else if (shape === 'toilet_sumaile') {
      // 住ま居る基本寸法トイレ (910 × 1592.5)
      this.dimX = 910;
      this.dimY = 1592.5;
      this.roomType = 'toilet';
      this.kitchenType = 'none';
      this.windowSouth = 'none';
      this.windowEast = 'none';
      this.windowWest = 'none';
      this.windowNorth = 'none';
      this.toiletType = 'tankless';
      this.doorType = 'kamiya_fullheight_800';
      this.doorSwing = 'outward'; // トイレ基本外開き
      this.adjoiningRoom = 'none';
      const adjSelect = document.getElementById('modeller-adjoining-room');
      if (adjSelect) adjSelect.value = 'none';

      // Update active room type buttons
      document.querySelectorAll('.btn-room-type').forEach(b => {
        b.classList.remove('active');
        if (b.getAttribute('data-room') === 'toilet') b.classList.add('active');
      });
    } else if (shape === 'l_shape') {
      this.dimX = 6370;
      this.dimY = 5460;
      this.adjoiningRoom = 'none';
      this.cuts.push({ id: 'cut_l1', type: 'rect', corner: 'ne', w: 2730, d: 2730 });
    } else if (shape === 'u_shape') {
      this.dimX = 7280;
      this.dimY = 5460;
      this.adjoiningRoom = 'none';
      this.cuts.push({ id: 'cut_u1', type: 'rect', corner: 'ne', w: 2275, d: 2275 });
      this.cuts.push({ id: 'cut_u2', type: 'rect', corner: 'nw', w: 2275, d: 2275 });
    } else if (shape === 'trapezoid') {
      this.dimX = 6370;
      this.dimY = 4550;
      this.adjoiningRoom = 'none';
      this.cuts.push({ id: 'cut_t1', type: 'triangle', corner: 'ne', w: 2730, d: 2730 });
    }

    // Synchronize inputs with preset values
    const inputX = document.getElementById('modeller-dim-x');
    const inputY = document.getElementById('modeller-dim-y');
    if (inputX) inputX.value = this.dimX;
    if (inputY) inputY.value = this.dimY;

    const adjSelect = document.getElementById('modeller-adjoining-room');
    if (adjSelect) adjSelect.value = this.adjoiningRoom;
    const kSelect = document.getElementById('modeller-kitchen-type');
    if (kSelect) kSelect.value = this.kitchenType;
    const wsSelect = document.getElementById('modeller-window-south');
    if (wsSelect) wsSelect.value = this.windowSouth;
    const weSelect = document.getElementById('modeller-window-east');
    if (weSelect) weSelect.value = this.windowEast;
    const wwSelect = document.getElementById('modeller-window-west');
    if (wwSelect) wwSelect.value = this.windowWest;
    const wnSelect = document.getElementById('modeller-window-north');
    if (wnSelect) wnSelect.value = this.windowNorth;
    const doorSelect = document.getElementById('modeller-door-type') || document.getElementById('modeller-door-kamiya');
    if (doorSelect) doorSelect.value = this.doorType;
    const swingSelect = document.getElementById('modeller-door-swing');
    if (swingSelect) swingSelect.value = this.doorSwing;
    const tSelect = document.getElementById('modeller-toilet-type');
    if (tSelect) tSelect.value = this.toiletType;

    this.renderCutsList();
    this.updateInfoText();
    this.autoLayoutFurniture();
    this.render();
  }

  async fetchRateStatus() {
    try {
      const res = await fetch('/api/rate-status');
      if (res.ok) {
        const data = await res.json();
        if (this.rateBadge && data.remaining !== undefined) {
          this.rateBadge.textContent = `${data.remaining} / ${data.limit} 回`;
        }
        if (this.queueBadge && data.queueLength !== undefined) {
          this.queueBadge.textContent = `待機: ${data.queueLength} 件`;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch rate status:', e);
    }
  }

  startCooldownTimer(sec = 12) {
    this.cooldownSeconds = sec;
    if (this.cooldownNotice) this.cooldownNotice.style.display = 'block';
    if (this.cooldownSec) this.cooldownSec.textContent = this.cooldownSeconds;

    const btnRender = document.getElementById('btn-modeller-render-sd');
    if (btnRender) btnRender.disabled = true;

    clearInterval(this.cooldownTimer);
    this.cooldownTimer = setInterval(() => {
      this.cooldownSeconds--;
      if (this.cooldownSec) this.cooldownSec.textContent = this.cooldownSeconds;
      if (this.cooldownSeconds <= 0) {
        clearInterval(this.cooldownTimer);
        if (this.cooldownNotice) this.cooldownNotice.style.display = 'none';
        if (btnRender) btnRender.disabled = false;
      }
    }, 1000);
  }

  updateInfoText() {
    const insideW = this.dimX - this.totalOffset * 2;
    const insideH = this.dimY - this.totalOffset * 2;

    if (this.insideDimSpan) {
      this.insideDimSpan.textContent = `${insideW.toLocaleString()}mm × ${insideH.toLocaleString()}mm`;
    }

    if (this.offsetInfo) {
      this.offsetInfo.innerHTML = `📐 芯々〜室内仕上線: <strong>${this.totalOffset.toFixed(1)}mm 逃げ</strong>（柱面${this.colOffset} + ボード${this.pbThick}）<br>内法有効寸法: <strong>${insideW.toLocaleString()}mm × ${insideH.toLocaleString()}mm</strong>`;
    }

    if (this.canvasTitle) {
      this.canvasTitle.textContent = `縮尺 1/50 ｜ 芯々 ${this.dimX.toLocaleString()} × ${this.dimY.toLocaleString()} mm ｜ 内法 ${insideW.toLocaleString()} × ${insideH.toLocaleString()} mm`;
    }
  }

  // ==========================================
  // EQUIPMENT & FURNITURE AUTOLAYOUT
  // ==========================================
  autoLayoutFurniture() {
    this.furniture = [];
    const insideW = this.dimX - this.totalOffset * 2;
    const insideH = this.dimY - this.totalOffset * 2;

    // 2間続き間取り（和室・寝室・書斎の開放仕切り）
    if (this.adjoiningRoom === 'tatami_open') {
      const splitX = Math.round(insideW * 0.58);
      // 手前LDK側 (0 ~ splitX)
      if (this.kitchenType !== 'none') {
        const kw = Math.min(2550, splitX - 400);
        this.kitchenPos = { x: 100, y: 250, w: kw, d: 900 };
      } else {
        this.kitchenPos = null;
      }
      this.furniture.push({ type: 'sofa', name: 'ローソファ (手前リビング)', x: 150, y: insideH - 1100, w: Math.min(2200, splitX - 300), d: 950, color: '#475569' });
      this.furniture.push({ type: 'table', name: '無垢テーブル', x: 200, y: Math.round(insideH * 0.45), w: Math.min(1600, splitX - 400), d: 850, color: '#b45309' });

      // 奥の和室側 (splitX ~ insideW)
      const rw = insideW - splitX;
      const tw = Math.min(1500, rw - 300);
      const tx = splitX + Math.round((rw - tw) / 2);
      const ty = Math.round((insideH - 900) / 2);
      this.furniture.push({ type: 'table', name: '無垢低座卓 (奥の和室)', x: tx, y: ty, w: tw, d: 900, color: '#d97706' });
      this.furniture.push({ type: 'chair', name: '座椅子', x: tx + 100, y: ty - 400, w: 450, d: 400 });
      this.furniture.push({ type: 'chair', name: '座椅子', x: tx + tw - 550, y: ty - 400, w: 450, d: 400 });
      this.furniture.push({ type: 'chair', name: '座椅子', x: tx + 100, y: ty + 900, w: 450, d: 400 });
      this.furniture.push({ type: 'chair', name: '座椅子', x: tx + tw - 550, y: ty + 900, w: 450, d: 400 });
      return;
    }

    // Adaptive Furniture layout based on Room Type
    if (this.roomType === 'bedroom') {
      // King Size Bed in center
      const bw = 2000, bd = 2100;
      const bx = Math.round((insideW - bw) / 2);
      const by = 400;
      this.furniture.push({ type: 'dining', name: 'キングサイズベッド (W2000)', x: bx, y: by, w: bw, d: bd, color: '#334155' });
      // Night Tables
      this.furniture.push({ type: 'table', name: 'ナイトテーブル', x: bx - 550, y: by + 100, w: 450, d: 450, color: '#d97706' });
      this.furniture.push({ type: 'table', name: 'ナイトテーブル', x: bx + bw + 100, y: by + 100, w: 450, d: 450, color: '#d97706' });
      // Lounge chair
      this.furniture.push({ type: 'chair', name: 'ラウンジチェア', x: insideW - 800, y: insideH - 900, w: 650, d: 650 });
      return;
    } else if (this.roomType === 'japanese' || this.roomType === 'koagari' || this.roomType === 'guest') {
      // Tatami Mats & Low Table
      const tw = 1500, td = 900;
      const tx = Math.round((insideW - tw) / 2);
      const ty = Math.round((insideH - td) / 2);
      this.furniture.push({ type: 'table', name: '無垢ヒノキ低座卓 (W1500)', x: tx, y: ty, w: tw, d: td, color: '#b45309' });
      this.furniture.push({ type: 'chair', name: '座椅子', x: tx + 200, y: ty - 450, w: 500, d: 450 });
      this.furniture.push({ type: 'chair', name: '座椅子', x: tx + tw - 700, y: ty - 450, w: 500, d: 450 });
      this.furniture.push({ type: 'chair', name: '座椅子', x: tx + 200, y: ty + td, w: 500, d: 450 });
      this.furniture.push({ type: 'chair', name: '座椅子', x: tx + tw - 700, y: ty + td, w: 500, d: 450 });
      return;
    } else if (this.roomType === 'study' || this.roomType === 'office') {
      // Big Desk & Shelves
      const dw = 2400, dd = 700;
      const dx = Math.round((insideW - dw) / 2);
      const dy = 500;
      this.furniture.push({ type: 'dining', name: '造作ワークデスク (W2400)', x: dx, y: dy, w: dw, d: dd, color: '#0f172a' });
      this.furniture.push({ type: 'chair', name: 'エルゴノミックチェア', x: dx + 900, y: dy + dd + 100, w: 600, d: 600 });
      this.furniture.push({ type: 'sofa', name: '壁面本棚シェルフ (W2000)', x: 100, y: insideH - 450, w: 2000, d: 400, color: '#78350f' });
      return;
    } else if (this.roomType === 'garage') {
      // Car Block & Tool Bench
      this.kitchenPos = null;
      const cw = Math.min(1850, insideW - 200), cd = Math.min(4600, insideH - 400);
      const cx = Math.max(100, Math.round((insideW - cw) / 2));
      this.furniture.push({ type: 'dining', name: '🚗 プレミアムカー', x: cx, y: 250, w: cw, d: cd, color: '#1e293b' });
      if (insideW > 2500) {
        this.furniture.push({ type: 'sofa', name: 'ツールキャビネット', x: 150, y: 150, w: Math.min(1800, insideW - 400), d: 500, color: '#b91c1c' });
      }
      return;
    } else if (this.roomType === 'toilet') {
      // Toilet Exclusive Layout (Porcelain toilet + slim vanity counter)
      this.kitchenPos = null;
      const tw = Math.min(450, insideW - 100);
      const td = Math.min(700, insideH - 200);
      const tx = Math.max(50, Math.round((insideW - tw) / 2));
      const ty = 120;
      this.furniture.push({ type: 'toilet', name: '洋式便器 (タンクレス)', x: tx, y: ty, w: tw, d: td, color: '#ffffff' });
      if (insideW >= 780 && insideH >= 1200) {
        this.furniture.push({ type: 'vanity', name: 'スリム手洗い器', x: 40, y: ty + td + 100, w: 240, d: 400, color: '#0284c7' });
      }
      return;
    } else if (this.roomType === 'washroom') {
      this.kitchenPos = null;
      const vw = Math.min(1200, insideW - 400);
      this.furniture.push({ type: 'vanity', name: '造作洗面化粧台 (W1200)', x: 100, y: 200, w: Math.max(600, vw), d: 550, color: '#0284c7' });
      if (insideW >= 1500) {
        this.furniture.push({ type: 'bath', name: '洗濯パン (640角)', x: insideW - 740, y: 200, w: 640, d: 640, color: '#94a3b8' });
      }
      return;
    } else if (this.roomType === 'bath') {
      this.kitchenPos = null;
      const bw = Math.min(1600, insideW - 100);
      const bd = Math.min(1600, insideH - 100);
      this.furniture.push({ type: 'bath', name: 'システムバス (1616)', x: Math.max(50, Math.round((insideW - bw)/2)), y: Math.max(50, Math.round((insideH - bd)/2)), w: bw, d: bd, color: '#38bdf8' });
      return;
    } else if (this.roomType === 'wic') {
      this.kitchenPos = null;
      this.furniture.push({ type: 'sofa', name: 'システムワードローブ棚', x: 100, y: 150, w: Math.max(800, insideW - 200), d: 500, color: '#78350f' });
      return;
    }

    // Kitchen Placement (Only if kitchenType !== 'none')
    let ky = 300;
    let kd = 900;
    if (this.kitchenType === 'none') {
      this.kitchenPos = null;
    } else {
      let kw = 2550;
      kd = 970;
      if (this.kitchenType === 'peninsula_2550') { kw = 2550; kd = 900; }
      else if (this.kitchenType === 'i_shape_2550') { kw = 2550; kd = 650; }
      else if (this.kitchenType === 'l_shape_2550') { kw = 2550; kd = 1800; }
      else if (this.kitchenType === 'u_shape_2550') { kw = 2550; kd = 2100; }

      kw = Math.min(kw, Math.max(1200, insideW - 200));
      const kx = Math.max(50, Math.round((insideW - kw) / 2));
      ky = 300;
      this.kitchenPos = { x: kx, y: ky, w: kw, d: kd };
    }

    // Vanity in room (if selected)
    if (this.vanityType !== 'none') {
      let vw = 900, vd = 600;
      if (this.vanityType === 'vanity_1200') vw = 1200;
      if (this.vanityType === 'vanity_1650') vw = 1650;
      this.furniture.push({ type: 'vanity', name: `洗面台 (W${vw})`, x: 150, y: 350, w: vw, d: vd, color: '#0284c7' });
    }

    // Toilet in room (if selected)
    if (this.toiletType !== 'none') {
      this.furniture.push({ type: 'toilet', name: 'トイレ', x: 150, y: 1100, w: 800, d: 1000, color: '#38bdf8' });
    }

    // Unit Bath in room (if selected)
    if (this.unitBathType !== 'none') {
      let bw = 1600, bd = 1600;
      if (this.unitBathType === 'ub_1620') { bw = 2000; bd = 1600; }
      this.furniture.push({ type: 'bath', name: `バス (${this.unitBathType === 'ub_1620' ? '1620' : '1616'})`, x: 150, y: 2200, w: bw, d: bd, color: '#0369a1' });
    }

    // Dining Table (Center)
    const dw = 1800, dd = 850;
    const dx = Math.round((insideW - dw) / 2);
    const dy = ky + kd + 850;
    this.furniture.push({ type: 'dining', name: '無垢一枚板テーブル (W1800)', x: dx, y: dy, w: dw, d: dd, color: '#b45309' });

    // 4 Wishbone Y-Chairs
    this.furniture.push({ type: 'chair', name: 'Yチェア', x: dx + 250, y: dy - 420, w: 460, d: 420 });
    this.furniture.push({ type: 'chair', name: 'Yチェア', x: dx + dw - 710, y: dy - 420, w: 460, d: 420 });
    this.furniture.push({ type: 'chair', name: 'Yチェア', x: dx + 250, y: dy + dd, w: 460, d: 420 });
    this.furniture.push({ type: 'chair', name: 'Yチェア', x: dx + dw - 710, y: dy + dd, w: 460, d: 420 });

    // Sofa
    const sw = 2000, sd = 900;
    const sx = Math.round((insideW - sw) / 2);
    const sy = dy + dd + 900;
    if (sy + sd < insideH - 200) {
      this.furniture.push({ type: 'sofa', name: 'ローバックソファ (W2000)', x: sx, y: sy, w: sw, d: sd, color: '#475569' });
      this.furniture.push({ type: 'table', name: '無垢ローテーブル', x: sx + 450, y: sy - 550, w: 1100, d: 450, color: '#d97706' });
    }

    // Plant
    this.furniture.push({ type: 'plant', name: '観葉植物', x: insideW - 650, y: insideH - 650, w: 450, d: 450, color: '#059669' });
  }

  // ==========================================
  // RENDER SWITCHER
  // ==========================================
  render() {
    if (this.viewMode === '2d') {
      this.render2D();
    } else {
      this.render3D();
    }
  }

  // ==========================================
  // 2D PLAN RENDERER
  // ==========================================
  render2D() {
    if (!this.ctx2d || !this.canvas2d) return;
    if (this.wrap2d && this.wrap2d.clientWidth > 0) {
      const tw = this.wrap2d.clientWidth;
      const th = this.wrap2d.clientHeight || 360;
      if (this.canvas2d.width !== tw || this.canvas2d.height !== th) {
        this.canvas2d.width = tw;
        this.canvas2d.height = th;
      }
    }
    const ctx = this.ctx2d;
    const cw = this.canvas2d.width;
    const ch = this.canvas2d.height;

    ctx.clearRect(0, 0, cw, ch);

    const margin = 70;
    const availW = cw - margin * 2;
    const availH = ch - margin * 2;
    this.scale = Math.min(availW / this.dimX, availH / this.dimY, 0.085);

    const planPxW = this.dimX * this.scale;
    const planPxH = this.dimY * this.scale;
    const originX = (cw - planPxW) / 2;
    const originY = (ch - planPxH) / 2;

    // 1. 910mm Grids
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.dimX; x += 910) {
      const px = originX + x * this.scale;
      ctx.beginPath(); ctx.moveTo(px, originY - 15); ctx.lineTo(px, originY + planPxH + 15); ctx.stroke();
    }
    for (let y = 0; y <= this.dimY; y += 910) {
      const py = originY + y * this.scale;
      ctx.beginPath(); ctx.moveTo(originX - 15, py); ctx.lineTo(originX + planPxW + 15, py); ctx.stroke();
    }

    // 2. Wall Centers (Red Dashed)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(originX, originY, planPxW, planPxH);

    // Render cuts
    this.cuts.forEach(cut => {
      let cx = originX, cy = originY;
      const cwPx = cut.w * this.scale;
      const cdPx = cut.d * this.scale;
      if (cut.corner === 'ne') { cx = originX + planPxW - cwPx; cy = originY; }
      else if (cut.corner === 'nw') { cx = originX; cy = originY; }
      else if (cut.corner === 'se') { cx = originX + planPxW - cwPx; cy = originY + planPxH - cdPx; }
      else if (cut.corner === 'sw') { cx = originX; cy = originY + planPxH - cdPx; }

      ctx.save();
      ctx.fillStyle = '#f1f5f9';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);

      if (cut.type === 'rect') {
        ctx.fillRect(cx, cy, cwPx, cdPx);
        ctx.strokeRect(cx, cy, cwPx, cdPx);
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`削り取り (${cut.w}×${cut.d})`, cx + cwPx / 2, cy + cdPx / 2);
      } else if (cut.type === 'triangle') {
        ctx.beginPath();
        if (cut.corner === 'ne') { ctx.moveTo(cx, cy); ctx.lineTo(cx + cwPx, cy); ctx.lineTo(cx + cwPx, cy + cdPx); }
        else if (cut.corner === 'nw') { ctx.moveTo(cx, cy); ctx.lineTo(cx + cwPx, cy); ctx.lineTo(cx, cy + cdPx); }
        else if (cut.corner === 'se') { ctx.moveTo(cx + cwPx, cy); ctx.lineTo(cx + cwPx, cy + cdPx); ctx.lineTo(cx, cy + cdPx); }
        else if (cut.corner === 'sw') { ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + cdPx); ctx.lineTo(cx + cwPx, cy + cdPx); }
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    });
    ctx.setLineDash([]);

    // 3. Wooden Posts (105mm)
    const colPx = this.colSize * this.scale;
    ctx.fillStyle = '#b91c1c';
    ctx.strokeStyle = '#7f1d1d';
    for (let x = 0; x <= this.dimX; x += 910) {
      for (let y = 0; y <= this.dimY; y += 910) {
        if (x === 0 || x >= this.dimX - 50 || y === 0 || y >= this.dimY - 50) {
          ctx.fillRect(originX + x * this.scale - colPx / 2, originY + y * this.scale - colPx / 2, colPx, colPx);
          ctx.strokeRect(originX + x * this.scale - colPx / 2, originY + y * this.scale - colPx / 2, colPx, colPx);
        }
      }
    }

    // 4. Interior Finish (65mm Offset)
    const offPx = this.totalOffset * this.scale;
    const finX = originX + offPx;
    const finY = originY + offPx;
    const finW = planPxW - offPx * 2;
    const finH = planPxH - offPx * 2;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(finX, finY, finW, finH);

    // 5. Openings (South, East, West, North Windows & KAMIYA Doors)
    const drawWindow = (x, y, w, h, isHoriz) => {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    };

    // South Window
    if (this.windowSouth !== 'none') {
      let wMm = (this.windowSouth === 'waist_1650') ? 1650 : (this.windowSouth === 'slit_600') ? 600 : 2560;
      wMm = Math.min(wMm, Math.max(400, this.dimX - 200));
      const wPx = wMm * this.scale;
      drawWindow(originX + (planPxW - wPx) / 2, originY + planPxH - offPx - 3, wPx, 6, true);
    }

    // East Window
    if (this.windowEast && this.windowEast !== 'none') {
      let wMm = (this.windowEast === 'waist_1650') ? 1650 : (this.windowEast === 'sweep_1650') ? 1650 : 600;
      wMm = Math.min(wMm, Math.max(400, this.dimY - 200));
      const wPx = wMm * this.scale;
      drawWindow(originX + planPxW - offPx - 3, originY + (planPxH - wPx) / 2, 6, wPx, false);
    }

    // West Window
    if (this.windowWest && this.windowWest !== 'none') {
      let wMm = (this.windowWest === 'waist_1650') ? 1650 : 600;
      wMm = Math.min(wMm, Math.max(400, this.dimY - 200));
      const wPx = wMm * this.scale;
      drawWindow(originX + offPx - 3, originY + (planPxH - wPx) / 2, 6, wPx, false);
    }

    // North Window
    if (this.windowNorth && this.windowNorth !== 'none') {
      let wMm = (this.windowNorth === 'high_side_1650') ? 1650 : 600;
      wMm = Math.min(wMm, Math.max(400, this.dimX - 200));
      const wPx = wMm * this.scale;
      drawWindow(originX + (planPxW - wPx) / 2, originY + offPx - 3, wPx, 6, true);
    }

    // Internal Doors (KAMIYA full-height door / sliding)
    if (this.doorType !== 'none') {
      let doorMm = (this.doorType.includes('1600')) ? 1600 : 800;
      doorMm = Math.min(doorMm, Math.max(400, this.dimX - 150));
      const doorW = doorMm * this.scale;
      const doorX = finX + 60 * this.scale;
      const doorY = finY;

      const isSliding = this.doorType.includes('sliding') || this.doorSwing === 'sliding';
      if (isSliding) {
        // Sliding door track (引き込み戸・片引き戸)
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(doorX, doorY); ctx.lineTo(doorX + doorW, doorY); ctx.stroke();
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(doorX + doorW - 40 * this.scale, doorY - 3, 40 * this.scale, 6);
        // Guide text
        ctx.fillStyle = '#0369a1';
        ctx.font = `bold ${Math.max(9, Math.round(11 * this.scale * 10))}px sans-serif`;
        ctx.fillText('引き戸 ⇄', doorX + 10, doorY - 6);
      } else if (this.doorSwing === 'outward') {
        // 外開き (廊下・外側へ開く軌跡: トイレ・洗面標準仕様)
        ctx.strokeStyle = '#d97706'; // 外開き注意アクセントカラー
        ctx.lineWidth = 2;
        // 部屋の外側に向かう90度円弧軌跡
        ctx.beginPath(); ctx.arc(doorX, doorY, doorW, 0, -Math.PI / 2, true); ctx.stroke();
        // 開いたドアの扉線 (上向き=廊下側)
        ctx.beginPath(); ctx.moveTo(doorX, doorY); ctx.lineTo(doorX, doorY - doorW); ctx.stroke();
        // 外開きラベル
        ctx.fillStyle = '#b45309';
        ctx.font = `bold ${Math.max(9, Math.round(11 * this.scale * 10))}px sans-serif`;
        ctx.fillText('外開き ⬆', doorX + 10, doorY - doorW / 2);
      } else {
        // 内開き (室内側へ開く軌跡: 居室・寝室標準仕様)
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        // 部屋の内側に向かう90度円弧軌跡
        ctx.beginPath(); ctx.arc(doorX, doorY, doorW, 0, Math.PI / 2, false); ctx.stroke();
        // 開いたドアの扉線 (下向き=室内側)
        ctx.beginPath(); ctx.moveTo(doorX, doorY); ctx.lineTo(doorX, doorY + doorW); ctx.stroke();
        // 内開きラベル
        ctx.fillStyle = '#0369a1';
        ctx.font = `bold ${Math.max(9, Math.round(11 * this.scale * 10))}px sans-serif`;
        ctx.fillText('内開き ⬇', doorX + 10, doorY + doorW / 2);
      }
    }

    // 2間続き間取り（仕切り袖壁 ＆ オープン引き込み開口）
    if (this.adjoiningRoom !== 'none') {
      const splitMm = Math.round((this.dimX - this.totalOffset * 2) * 0.58);
      const splitPx = finX + splitMm * this.scale;

      // 北側・南側の袖壁（仕切り戸袋壁 455mm）
      const wingPx = 455 * this.scale;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(splitPx - 6, finY, 12, wingPx);
      ctx.fillRect(splitPx - 6, finY + finH - wingPx, 12, wingPx);

      // 中央のオープンレール（点線 ＝ 開放された引き込み戸）
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(splitPx, finY + wingPx); ctx.lineTo(splitPx, finY + finH - wingPx); ctx.stroke();
      ctx.setLineDash([]);

      // 引き込み戸パネル（袖壁横に収まった建具）
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(splitPx - 16, finY + wingPx - 80 * this.scale, 8, 70 * this.scale);
      ctx.fillRect(splitPx - 16, finY + finH - wingPx + 10 * this.scale, 8, 70 * this.scale);

      // ラベル
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🛋️ 手前：LDKリビング', finX + splitMm * this.scale / 2, finY + 30);
      ctx.fillStyle = '#d97706';
      ctx.fillText('🌸 奥：和室続き間（全開）', splitPx + (finW - splitMm * this.scale) / 2, finY + 30);
    }

    // 6. System Kitchen
    if (this.kitchenPos) {
      const kpx = finX + this.kitchenPos.x * this.scale;
      const kpy = finY + this.kitchenPos.y * this.scale;
      const kpw = this.kitchenPos.w * this.scale;
      const kpd = this.kitchenPos.d * this.scale;

      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(kpx, kpy, kpw, kpd);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(kpx, kpy, kpw, kpd);

      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(kpx + 120 * this.scale, kpy + 100 * this.scale, 800 * this.scale, 480 * this.scale);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(kpx + kpw - 720 * this.scale, kpy + 100 * this.scale, 600 * this.scale, 500 * this.scale);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`システムキッチン (W${this.kitchenPos.w}×D${this.kitchenPos.d})`, kpx + kpw / 2, kpy + kpd / 2 + 4);
    }

    // 7. Furniture & Additional Fixtures (Vanity, Toilet, Bath)
    this.furniture.forEach(f => {
      const fx = finX + f.x * this.scale;
      const fy = finY + f.y * this.scale;
      const fw = f.w * this.scale;
      const fd = f.d * this.scale;

      if (f.type === 'toilet') {
        // Toilet porcelain bowl & tank
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.8;
        // Tank
        ctx.beginPath();
        ctx.roundRect(fx + 10 * this.scale, fy, fw - 20 * this.scale, Math.min(fd * 0.35, 180 * this.scale), 4);
        ctx.fill(); ctx.stroke();
        // Oval Bowl
        ctx.beginPath();
        const bowlCy = fy + fd * 0.6;
        ctx.ellipse(fx + fw / 2, bowlCy, (fw - 20 * this.scale) / 2, (fd * 0.55) / 2, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('便器', fx + fw / 2, bowlCy + 3);
      } else if (f.type === 'chair') {
        ctx.fillStyle = '#fef3c7'; ctx.strokeStyle = '#d97706';
        ctx.beginPath(); ctx.roundRect(fx, fy, fw, fd, 6); ctx.fill(); ctx.stroke();
      } else if (f.type === 'plant') {
        ctx.fillStyle = '#d1fae5'; ctx.strokeStyle = '#059669';
        ctx.beginPath(); ctx.arc(fx + fw / 2, fy + fd / 2, fw / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else {
        ctx.fillStyle = f.color ? f.color + '22' : '#f8fafc';
        ctx.strokeStyle = f.color || '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(fx, fy, fw, fd, 4); ctx.fill(); ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(f.name, fx + fw / 2, fy + fd / 2 + 3);
      }
    });

    // 8. Dimensions
    this.drawDimensionLine(ctx, originX, originY - 32, originX + planPxW, originY - 32, `芯々 ${this.dimX} mm`, '#ef4444');
    this.drawDimensionLine(ctx, finX, originY - 14, finX + finW, originY - 14, `内法仕上 ${this.dimX - this.totalOffset * 2} mm`, '#0f172a');
    this.drawDimensionLine(ctx, originX - 32, originY, originX - 32, originY + planPxH, `芯々 ${this.dimY} mm`, '#ef4444', true);
    this.drawDimensionLine(ctx, originX - 14, finY, originX - 14, finY + finH, `内法仕上 ${this.dimY - this.totalOffset * 2} mm`, '#0f172a', true);
  }

  drawDimensionLine(ctx, x1, y1, x2, y2, text, color, isVertical = false) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.fillStyle = color;
    ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const tick = 4;
    if (isVertical) {
      ctx.beginPath(); ctx.moveTo(x1 - tick, y1); ctx.lineTo(x1 + tick, y1);
      ctx.moveTo(x2 - tick, y2); ctx.lineTo(x2 + tick, y2); ctx.stroke();
      ctx.save(); ctx.translate((x1 + x2) / 2 - 8, (y1 + y2) / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText(text, 0, 0); ctx.restore();
    } else {
      ctx.beginPath(); ctx.moveTo(x1, y1 - tick); ctx.lineTo(x1, y1 + tick);
      ctx.moveTo(x2, y2 - tick); ctx.lineTo(x2, y2 + tick); ctx.stroke();
      ctx.fillText(text, (x1 + x2) / 2, y1 - 4);
    }
    ctx.restore();
  }

  // ==========================================
  // 3D REALTIME ARCHITECTURAL SPACE RENDERER
  // (Orbit, Pan, Zoom, Top-View, Ceilings)
  // ==========================================
  render3D() {
    if (!this.ctx3d || !this.canvas3d) return;
    if (this.wrap3d && this.wrap3d.clientWidth > 0) {
      const tw = this.wrap3d.clientWidth;
      const th = this.wrap3d.clientHeight || 360;
      if (this.canvas3d.width !== tw || this.canvas3d.height !== th) {
        this.canvas3d.width = tw;
        this.canvas3d.height = th;
      }
    }
    const ctx = this.ctx3d;
    const cw = this.canvas3d.width;
    const ch = this.canvas3d.height;

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, cw, ch);

    const fov = this.fov;
    const cx = cw / 2 + this.panX;
    const cy = ch / 2 + this.panY;

    const halfW = (this.dimX - this.totalOffset * 2) / 2;
    const halfD = (this.dimY - this.totalOffset * 2) / 2;
    const ceilH = this.ceilingH;
    const targetY = -ceilH / 2;

    const project = (x, y, z) => {
      const cosY = Math.cos(this.yaw);
      const sinY = Math.sin(this.yaw);
      const rx = x * cosY - z * sinY;
      const rz = x * sinY + z * cosY;

      const relY = y - targetY + (this.eyeLevel - 1500) * 0.4;
      const cosP = Math.cos(this.pitch);
      const sinP = Math.sin(this.pitch);
      const ry = relY * cosP - rz * sinP;
      const finalZ = relY * sinP + rz * cosP + this.distance;

      if (finalZ <= 50) return { px: cx, py: cy, visible: false };
      const px = cx + (rx * fov) / finalZ;
      const py = cy + (ry * fov) / finalZ;
      return { px, py, visible: true };
    };

    // Floor
    const f0 = project(-halfW, 0, -halfD);
    const f1 = project(halfW, 0, -halfD);
    const f2 = project(halfW, 0, halfD);
    const f3 = project(-halfW, 0, halfD);

    if (f0.visible && f1.visible && f2.visible && f3.visible) {
      ctx.fillStyle = '#b45309';
      ctx.beginPath(); ctx.moveTo(f0.px, f0.py); ctx.lineTo(f1.px, f1.py); ctx.lineTo(f2.px, f2.py); ctx.lineTo(f3.px, f3.py); ctx.closePath(); ctx.fill();

      // Floor plank lines
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1;
      for (let z = -halfD; z <= halfD; z += 300) {
        const pA = project(-halfW, 0, z);
        const pB = project(halfW, 0, z);
        if (pA.visible && pB.visible) {
          ctx.beginPath(); ctx.moveTo(pA.px, pA.py); ctx.lineTo(pB.px, pB.py); ctx.stroke();
        }
      }
    }

    // Walls
    const c0 = project(-halfW, -ceilH, -halfD);
    const c1 = project(halfW, -ceilH, -halfD);
    const c2 = project(halfW, -ceilH, halfD);
    const c3 = project(-halfW, -ceilH, halfD);

    // North Wall
    if (f0.visible && f1.visible && c1.visible && c0.visible) {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath(); ctx.moveTo(f0.px, f0.py); ctx.lineTo(f1.px, f1.py); ctx.lineTo(c1.px, c1.py); ctx.lineTo(c0.px, c0.py); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#94a3b8'; ctx.stroke();
    }

    // West Wall
    if (f0.visible && f3.visible && c3.visible && c0.visible) {
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath(); ctx.moveTo(f0.px, f0.py); ctx.lineTo(f3.px, f3.py); ctx.lineTo(c3.px, c3.py); ctx.lineTo(c0.px, c0.py); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#94a3b8'; ctx.stroke();
    }

    // East Wall
    if (f1.visible && f2.visible && c2.visible && c1.visible) {
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath(); ctx.moveTo(f1.px, f1.py); ctx.lineTo(f2.px, f2.py); ctx.lineTo(c2.px, c2.py); ctx.lineTo(c1.px, c1.py); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#94a3b8'; ctx.stroke();
    }

    // Ceiling Rendering
    if (this.ceilingType === 'sloped') {
      const ridgeY = -ceilH - 800;
      const r0 = project(0, ridgeY, -halfD);
      const r1 = project(0, ridgeY, halfD);
      if (r0.visible && r1.visible && c0.visible && c1.visible) {
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath(); ctx.moveTo(c0.px, c0.py); ctx.lineTo(r0.px, r0.py); ctx.lineTo(r1.px, r1.py); ctx.lineTo(c3.px, c3.py); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(c1.px, c1.py); ctx.lineTo(r0.px, r0.py); ctx.lineTo(r1.px, r1.py); ctx.lineTo(c2.px, c2.py); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#78350f'; ctx.lineWidth = 4;
        for (let z = -halfD + 900; z < halfD; z += 900) {
          const bLeft = project(-halfW, -ceilH, z);
          const bRidge = project(0, ridgeY, z);
          const bRight = project(halfW, -ceilH, z);
          if (bLeft.visible && bRidge.visible && bRight.visible) {
            ctx.beginPath(); ctx.moveTo(bLeft.px, bLeft.py); ctx.lineTo(bRidge.px, bRidge.py); ctx.lineTo(bRight.px, bRight.py); ctx.stroke();
          }
        }
      }
    } else if (this.ceilingType === 'void') {
      ctx.fillStyle = '#f8fafc';
      if (c0.visible && c1.visible && c2.visible && c3.visible) {
        ctx.beginPath(); ctx.moveTo(c0.px, c0.py); ctx.lineTo(c1.px, c1.py); ctx.lineTo(c2.px, c2.py); ctx.lineTo(c3.px, c3.py); ctx.closePath(); ctx.fill();
      }
      const cl0 = project(-halfW + 400, -ceilH + 600, -halfD);
      const cl1 = project(halfW - 400, -ceilH + 600, -halfD);
      const cl2 = project(halfW - 400, -ceilH + 1400, -halfD);
      const cl3 = project(-halfW + 400, -ceilH + 1400, -halfD);
      if (cl0.visible && cl1.visible && cl2.visible && cl3.visible) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.beginPath(); ctx.moveTo(cl0.px, cl0.py); ctx.lineTo(cl1.px, cl1.py); ctx.lineTo(cl2.px, cl2.py); ctx.lineTo(cl3.px, cl3.py); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#0284c7'; ctx.stroke();
      }
    } else {
      if (c0.visible && c1.visible && c2.visible && c3.visible) {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath(); ctx.moveTo(c0.px, c0.py); ctx.lineTo(c1.px, c1.py); ctx.lineTo(c2.px, c2.py); ctx.lineTo(c3.px, c3.py); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#94a3b8'; ctx.stroke();
      }
    }

    // 3D Kitchen Block
    if (this.kitchenPos) {
      const kx = -halfW + this.kitchenPos.x + this.kitchenPos.w / 2;
      const kz = -halfD + this.kitchenPos.y + this.kitchenPos.d / 2;
      const kw = this.kitchenPos.w / 2;
      const kd = this.kitchenPos.d / 2;
      this.draw3dBox(ctx, project, kx - kw, kx + kw, kz - kd, kz + kd, -850, 0, '#cbd5e1', '#64748b');
    }

    // 3D Furniture & Equipment Blocks
    this.furniture.forEach(f => {
      const fx = -halfW + f.x + f.w / 2;
      const fz = -halfD + f.y + f.d / 2;
      const fw = f.w / 2;
      const fd = f.d / 2;
      if (f.type === 'dining') {
        this.draw3dBox(ctx, project, fx - fw, fx + fw, fz - fd, fz + fd, -720, 0, '#d97706', '#92400e');
      } else if (f.type === 'sofa') {
        this.draw3dBox(ctx, project, fx - fw, fx + fw, fz - fd, fz + fd, -650, 0, '#475569', '#1e293b');
      } else if (f.type === 'vanity') {
        this.draw3dBox(ctx, project, fx - fw, fx + fw, fz - fd, fz + fd, -800, 0, '#0284c7', '#0369a1');
      } else if (f.type === 'bath') {
        this.draw3dBox(ctx, project, fx - fw, fx + fw, fz - fd, fz + fd, -550, 0, '#38bdf8', '#0284c7');
      } else if (f.type === 'toilet') {
        // 3D porcelain toilet bowl & tank
        this.draw3dBox(ctx, project, fx - fw, fx + fw, fz - fd, fz + fd, -420, 0, '#ffffff', '#e2e8f0');
        this.draw3dBox(ctx, project, fx - fw + 20, fx + fw - 20, fz - fd, fz - fd + 180, -780, -420, '#ffffff', '#cbd5e1');
      }
    });

    // 3D South Window (if not 'none')
    if (this.windowSouth !== 'none') {
      let winMm = (this.windowSouth === 'waist_1650') ? 1650 : (this.windowSouth === 'slit_600') ? 600 : 2560;
      let winTopMm = (this.windowSouth === 'waist_1650') ? 2000 : 2200;
      let winBotMm = (this.windowSouth === 'waist_1650') ? 900 : 0;
      winMm = Math.min(winMm, Math.max(300, halfW * 1.8));
      const hw = winMm / 2;
      const w0 = project(-hw, -winTopMm, halfD);
      const w1 = project(hw, -winTopMm, halfD);
      const w2 = project(hw, -winBotMm, halfD);
      const w3 = project(-hw, -winBotMm, halfD);
      if (w0.visible && w1.visible && w2.visible && w3.visible) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.32)';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(w0.px, w0.py); ctx.lineTo(w1.px, w1.py); ctx.lineTo(w2.px, w2.py); ctx.lineTo(w3.px, w3.py); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }

    // 3D East Window
    if (this.windowEast && this.windowEast !== 'none') {
      let winMm = (this.windowEast === 'waist_1650') ? 1650 : (this.windowEast === 'sweep_1650') ? 1650 : 600;
      let winTopMm = 2100, winBotMm = (this.windowEast === 'sweep_1650') ? 0 : 900;
      winMm = Math.min(winMm, Math.max(300, halfD * 1.8));
      const hd = winMm / 2;
      const ew0 = project(halfW, -winTopMm, -hd);
      const ew1 = project(halfW, -winTopMm, hd);
      const ew2 = project(halfW, -winBotMm, hd);
      const ew3 = project(halfW, -winBotMm, -hd);
      if (ew0.visible && ew1.visible && ew2.visible && ew3.visible) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ew0.px, ew0.py); ctx.lineTo(ew1.px, ew1.py); ctx.lineTo(ew2.px, ew2.py); ctx.lineTo(ew3.px, ew3.py); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }

    // 3D West Window
    if (this.windowWest && this.windowWest !== 'none') {
      let winMm = (this.windowWest === 'waist_1650') ? 1650 : 600;
      let winTopMm = 2000, winBotMm = 900;
      winMm = Math.min(winMm, Math.max(300, halfD * 1.8));
      const hd = winMm / 2;
      const ww0 = project(-halfW, -winTopMm, -hd);
      const ww1 = project(-halfW, -winTopMm, hd);
      const ww2 = project(-halfW, -winBotMm, hd);
      const ww3 = project(-halfW, -winBotMm, -hd);
      if (ww0.visible && ww1.visible && ww2.visible && ww3.visible) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ww0.px, ww0.py); ctx.lineTo(ww1.px, ww1.py); ctx.lineTo(ww2.px, ww2.py); ctx.lineTo(ww3.px, ww3.py); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }

    // 3D North Window
    if (this.windowNorth && this.windowNorth !== 'none') {
      let winMm = (this.windowNorth === 'high_side_1650') ? 1650 : 600;
      let winTopMm = 2300, winBotMm = 1700; // 高所すべり出し
      winMm = Math.min(winMm, Math.max(300, halfW * 1.8));
      const hw = winMm / 2;
      const nw0 = project(-hw, -winTopMm, -halfD);
      const nw1 = project(hw, -winTopMm, -halfD);
      const nw2 = project(hw, -winBotMm, -halfD);
      const nw3 = project(-hw, -winBotMm, -halfD);
      if (nw0.visible && nw1.visible && nw2.visible && nw3.visible) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(nw0.px, nw0.py); ctx.lineTo(nw1.px, nw1.py); ctx.lineTo(nw2.px, nw2.py); ctx.lineTo(nw3.px, nw3.py); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }

    // 3D Interior Door Frame & Swing Direction (North wall entrance)
    if (this.doorType !== 'none') {
      const dWidth = (this.doorType.includes('1600')) ? 1600 : 800;
      const dHeight = this.doorType.includes('fullheight') ? ceilH : 2100;
      const dStartX = -halfW + 150;
      const dEndX = dStartX + dWidth;

      // Door opening frame on North Wall
      const df0 = project(dStartX, -dHeight, -halfD);
      const df1 = project(dEndX, -dHeight, -halfD);
      const df2 = project(dEndX, 0, -halfD);
      const df3 = project(dStartX, 0, -halfD);
      if (df0.visible && df1.visible && df2.visible && df3.visible) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.65)'; // 深みのある出入口開口
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(df0.px, df0.py); ctx.lineTo(df1.px, df1.py); ctx.lineTo(df2.px, df2.py); ctx.lineTo(df3.px, df3.py); ctx.closePath(); ctx.fill(); ctx.stroke();

        // 扉パネル (内開きなら室内側に傾く、外開きなら廊下側)
        if (this.doorSwing === 'inward') {
          const swingDepth = -halfD + Math.sin(0.4) * dWidth;
          const swingX = dStartX + Math.cos(0.4) * dWidth;
          const dp0 = project(dStartX, -dHeight, -halfD);
          const dp1 = project(swingX, -dHeight, swingDepth);
          const dp2 = project(swingX, 0, swingDepth);
          const dp3 = project(dStartX, 0, -halfD);
          if (dp0.visible && dp1.visible && dp2.visible && dp3.visible) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.strokeStyle = '#0284c7';
            ctx.beginPath(); ctx.moveTo(dp0.px, dp0.py); ctx.lineTo(dp1.px, dp1.py); ctx.lineTo(dp2.px, dp2.py); ctx.lineTo(dp3.px, dp3.py); ctx.closePath(); ctx.fill(); ctx.stroke();
          }
        }
      }
    }

    // 3D 2間続き間取り：天井下がり壁（鴨居見切り） ＆ 左右袖壁（引き込み戸袋）
    // ※StableDiffusionが「枠越しに見通す続き間開放」を最高精度で認識する形状！
    if (this.adjoiningRoom !== 'none') {
      const splitRelX = -halfW + insideW * 0.58;

      // 1. 天井下がり壁（鴨居・垂れ壁 H350mm）
      const dropH = -ceilH + 350;
      const dc0 = project(splitRelX, -ceilH, -halfD);
      const dc1 = project(splitRelX, -ceilH, halfD);
      const dc2 = project(splitRelX, dropH, halfD);
      const dc3 = project(splitRelX, dropH, -halfD);
      if (dc0.visible && dc1.visible && dc2.visible && dc3.visible) {
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(dc0.px, dc0.py); ctx.lineTo(dc1.px, dc1.py); ctx.lineTo(dc2.px, dc2.py); ctx.lineTo(dc3.px, dc3.py); ctx.closePath(); ctx.fill(); ctx.stroke();
      }

      // 2. 北側の袖壁（戸袋 455mm）
      const nw0 = project(splitRelX, -ceilH, -halfD);
      const nw1 = project(splitRelX, -ceilH, -halfD + 455);
      const nw2 = project(splitRelX, 0, -halfD + 455);
      const nw3 = project(splitRelX, 0, -halfD);
      if (nw0.visible && nw1.visible && nw2.visible && nw3.visible) {
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(nw0.px, nw0.py); ctx.lineTo(nw1.px, nw1.py); ctx.lineTo(nw2.px, nw2.py); ctx.lineTo(nw3.px, nw3.py); ctx.closePath(); ctx.fill(); ctx.stroke();
      }

      // 3. 南側の袖壁（戸袋 455mm）
      const sw0 = project(splitRelX, -ceilH, halfD - 455);
      const sw1 = project(splitRelX, -ceilH, halfD);
      const sw2 = project(splitRelX, 0, halfD);
      const sw3 = project(splitRelX, 0, halfD - 455);
      if (sw0.visible && sw1.visible && sw2.visible && sw3.visible) {
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sw0.px, sw0.py); ctx.lineTo(sw1.px, sw1.py); ctx.lineTo(sw2.px, sw2.py); ctx.lineTo(sw3.px, sw3.py); ctx.closePath(); ctx.fill(); ctx.stroke();
      }

      // 4. 床の畳寄せ見切りライン
      const fl0 = project(splitRelX, 0, -halfD + 455);
      const fl1 = project(splitRelX, 0, halfD - 455);
      if (fl0.visible && fl1.visible) {
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(fl0.px, fl0.py); ctx.lineTo(fl1.px, fl1.py); ctx.stroke();
      }
    }
  }

  draw3dBox(ctx, project, x0, x1, z0, z1, yTop, yBottom, topColor, sideColor) {
    const p2 = project(x1, yBottom, z1);
    const p3 = project(x0, yBottom, z1);
    const t0 = project(x0, yTop, z0);
    const t1 = project(x1, yTop, z0);
    const t2 = project(x1, yTop, z1);
    const t3 = project(x0, yTop, z1);

    if (t0.visible && t1.visible && t2.visible && t3.visible) {
      ctx.fillStyle = topColor;
      ctx.beginPath(); ctx.moveTo(t0.px, t0.py); ctx.lineTo(t1.px, t1.py); ctx.lineTo(t2.px, t2.py); ctx.lineTo(t3.px, t3.py); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#334155'; ctx.stroke();

      ctx.fillStyle = sideColor;
      ctx.beginPath(); ctx.moveTo(t3.px, t3.py); ctx.lineTo(t2.px, t2.py); ctx.lineTo(p2.px, p2.py); ctx.lineTo(p3.px, p3.py); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }

  // ==========================================
  // GENERATE SD PERSPECTIVE (From Step 3 to Step 4)
  // ==========================================
  async generateSdPerspectiveFromModel() {
    const btnRender = document.getElementById('btn-modeller-render-sd');
    const resultBox = document.getElementById('modeller-sd-result-box');
    const resultImg = document.getElementById('modeller-sd-result-img');
    const saveBtn = document.getElementById('btn-save-final-pers');

    if (btnRender) {
      btnRender.disabled = true;
      btnRender.textContent = '⏳ 3D形状＆部位別ストックからパース生成中... (約20秒)';
    }

    try {
      // Capture 3D Canvas
      const activeCanvas = this.canvas3d;
      const base64Data = activeCanvas.toDataURL('image/jpeg', 0.92);

      // Collect dedicated slots
      const descOverall = document.getElementById('slot-desc-overall')?.value || this.stockSlots.overall.title;
      const descKitchen = document.getElementById('slot-desc-kitchen')?.value || this.stockSlots.kitchen.title;
      const descFurniture = document.getElementById('slot-desc-furniture')?.value || this.stockSlots.furniture.title;
      const descLighting = document.getElementById('slot-desc-lighting')?.value || this.stockSlots.lighting.title;

      const payload = {
        initImage: base64Data,
        samplePreset: 'model_ldk.jpg',
        roomType: this.roomType,
        styles: [this.furnitureStyle],
        lighting: 'morning',
        ceilingType: this.ceilingType,
        kitchenType: this.kitchenType,
        windowSetting: (!this.windowSouth || this.windowSouth === 'none') && (!this.windowEast || this.windowEast === 'none') && (!this.windowWest || this.windowWest === 'none') && (!this.windowNorth || this.windowNorth === 'none') ? 'none' : this.windowSouth,
        windowEast: this.windowEast,
        windowWest: this.windowWest,
        windowNorth: this.windowNorth,
        doorType: this.doorType,
        doorSwing: this.doorSwing,
        adjoiningRoom: this.adjoiningRoom,
        furniture: this.kitchenType === 'none' ? (this.roomType === 'toilet' ? ['toilet_suite'] : ['ychair', 'liveedge']) : ['ychair', 'liveedge', 'island_kitchen'],
        plants: this.roomType === 'toilet' ? ['pottery'] : ['umbellata'],
        materials: ((!this.windowSouth || this.windowSouth === 'none') && (!this.windowEast || this.windowEast === 'none') && (!this.windowWest || this.windowWest === 'none') && (!this.windowNorth || this.windowNorth === 'none')) ? ['diatom', 'nishikawa'] : ['diatom', 'nishikawa', 'triple_glass'],
        negativePrompt: ((!this.windowSouth || this.windowSouth === 'none') && (!this.windowEast || this.windowEast === 'none') && (!this.windowWest || this.windowWest === 'none') && (!this.windowNorth || this.windowNorth === 'none')) ? '(worst quality, low quality:1.4), (window:1.6), (windows:1.6), (glass window:1.6), (picture window:1.6), (glass door:1.6), outdoor view, exterior view, window sill, window frame' : undefined,
        scene: 'brunch',
        stockSlots: {
          overall: descOverall,
          kitchen: descKitchen,
          furniture: descFurniture,
          lighting: descLighting,
          doors: document.getElementById('slot-desc-doors')?.value || 'KAMIYA full-height doors'
        },
        customPrompt: `interior scale exact match, dimensions ${this.dimX}x${this.dimY}mm, ceiling height ${this.ceilingH}mm` + 
          (this.doorType.includes('kamiya') ? ', KAMIYA full-height ceiling-flush frameless interior doors' : '') + 
          (this.doorSwing === 'outward' ? ', outward-opening door' : this.doorSwing === 'inward' ? ', inward-opening door' : '') +
          (((!this.windowSouth || this.windowSouth === 'none') && (!this.windowEast || this.windowEast === 'none') && (!this.windowWest || this.windowWest === 'none') && (!this.windowNorth || this.windowNorth === 'none')) ? ', completely windowless room, solid continuous wall' : '') +
          (this.adjoiningRoom === 'tatami_open' ? ', connected adjoining open Japanese washitsu tatami room visible through fully opened wide KAMIYA full-height partition sliding pocket doors, spatial continuity, framed opening view, recessed pocket doors' : ''),
        denoisingStrength: 0.45
      };

      const res = await fetch('/api/perspective/upload-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.status === 429) {
        alert(`【生成制限・混雑中】\n${data.error}\n連続リクエスト防止のため少々お待ちください。`);
        if (data.waitSeconds) this.startCooldownTimer(data.waitSeconds);
        this.fetchRateStatus();
        return;
      }

      if (data.success) {
        this.lastRenderedImage = data.imageUrl;
        if (resultBox) resultBox.style.display = 'block';
        if (resultImg) resultImg.src = data.imageUrl + '?t=' + Date.now();
        if (saveBtn) {
          saveBtn.href = data.imageUrl;
          saveBtn.download = `Sumaile_Perspective_${data.renderId}.png`;
        }

        // Advance to Step 4 (Retouch & Save Studio)
        this.goToStep(4);
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        this.startCooldownTimer(12);
        this.fetchRateStatus();
      } else {
        alert('パース生成に失敗しました: ' + (data.error || '不明なエラー'));
      }
    } catch (err) {
      alert('通信エラー: ' + err.message);
    } finally {
      if (btnRender && this.cooldownSeconds <= 0) {
        btnRender.disabled = false;
        btnRender.textContent = '⚡ この3DアングルでAIフォトリアルパース生成 ✨';
      }
    }
  }

  // ==========================================
  // ARCHIX / RENDERY RETOUCH REGENERATE (STEP 4)
  // ==========================================
  async executeRetouchRegenerate() {
    const btnRegen = document.getElementById('btn-retouch-regenerate');
    const resultImg = document.getElementById('modeller-sd-result-img');
    const saveBtn = document.getElementById('btn-save-final-pers');

    const lighting = document.getElementById('retouch-lighting')?.value || 'morning';
    const style = document.getElementById('retouch-style')?.value || 'japandi';
    const material = document.getElementById('retouch-material')?.value || 'diatom_nishikawa';
    const denoise = parseFloat(document.getElementById('retouch-denoise')?.value) || 0.45;

    if (btnRegen) {
      btnRegen.disabled = true;
      btnRegen.textContent = '⏳ レタッチ修正中... (約15秒)';
    }

    try {
      const activeCanvas = this.canvas3d;
      const base64Data = activeCanvas.toDataURL('image/jpeg', 0.92);

      const payload = {
        initImage: base64Data,
        samplePreset: 'model_ldk.jpg',
        roomType: this.roomType,
        styles: [style],
        lighting: lighting,
        ceilingType: this.ceilingType,
        kitchenType: this.kitchenType,
        windowSetting: document.getElementById('retouch-window')?.value || this.windowSouth,
        furniture: this.kitchenType === 'none' ? (this.roomType === 'toilet' ? ['toilet_suite'] : ['ychair']) : ['ychair', 'island_kitchen'],
        plants: this.roomType === 'toilet' ? ['pottery'] : ['umbellata'],
        materials: material === 'diatom_nishikawa' ? ['diatom', 'nishikawa'] : material === 'plaster_oak' ? ['oak'] : ['stone'],
        scene: 'retouch_final',
        customPrompt: `retouch interior render, style ${style}, lighting ${lighting}, ceiling height ${this.ceilingH}mm` + (document.getElementById('retouch-window')?.value === 'add_large_window' ? ', large bright window with daylight' : document.getElementById('retouch-window')?.value === 'solid_wall' ? ', solid architectural wall without window' : ''),
        denoisingStrength: denoise
      };

      const res = await fetch('/api/perspective/upload-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.status === 429) {
        alert(`【生成制限】\n${data.error}`);
        if (data.waitSeconds) this.startCooldownTimer(data.waitSeconds);
        this.fetchRateStatus();
        return;
      }

      if (data.success) {
        this.lastRenderedImage = data.imageUrl;
        if (resultImg) resultImg.src = data.imageUrl + '?t=' + Date.now();
        if (saveBtn) {
          saveBtn.href = data.imageUrl;
          saveBtn.download = `Sumaile_Perspective_${data.renderId}.png`;
        }
        alert('✨ パースのレタッチ修正が完了しました！');
        this.startCooldownTimer(12);
        this.fetchRateStatus();
      } else {
        alert('再生成に失敗しました: ' + (data.error || '不明なエラー'));
      }
    } catch (e) {
      alert('通信エラー: ' + e.message);
    } finally {
      if (btnRegen) {
        btnRegen.disabled = false;
        btnRegen.textContent = '🔄 この設定でパースを再生成（レタッチ修正）';
      }
    }
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.archPlanModeller = new ArchitecturalPlanModeller();
});
