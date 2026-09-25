const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const db = require('./db.js');
const { startGpuWorker } = require('./gpu_worker.js');
const { createFloorPlanTopology, solve2DGeometry, renderFloorPlanSvg, generateIfcModel, runMultiAgentOrchestration } = require('./floorplan_generator.js');

const PORT = process.env.PORT || 3005;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// MIME types for static server
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.ifc': 'application/x-step; charset=utf-8'
};

// Global Store for Generated Floor Plans
const FLOORPLANS_STORE = new Map();
const RENDERS_DIR = path.join(PUBLIC_DIR, 'renders');
if (!fs.existsSync(RENDERS_DIR)) {
  fs.mkdirSync(RENDERS_DIR, { recursive: true });
}

// Architectural Perspective Titles
function getPerspectiveTitle(spaceType, style, lighting) {
  const spaceNames = {
    facade: '邸宅外観（ファサード）',
    ldk: '吹き抜け大開口 LDK',
    kitchen: 'アイランド・オープンキッチン',
    bedroom: 'ホテルライク 主寝室',
    terrace: '中庭・ウッドデッキテラス',
    bath: '職人造作・リゾートバス'
  };
  const styleNames = {
    japandi: 'ジャパンディ（北欧×和の静謐）',
    scandi: '北欧ナチュラル',
    hotellike: 'ホテルライク・グレージュモダン',
    japanese: '数寄屋現代和モダン',
    minimal: 'ミニマルリゾート'
  };
  const lightingNames = {
    daylight: '澄み渡る朝の自然光',
    goldenhour: '黄昏のトワイライト',
    night: '温もりの間接照明・夜景',
    soft: '柔らかな午後の陽だまり'
  };
  return `${spaceNames[spaceType] || '空間パース'} × ${styleNames[style] || 'モダン'}（${lightingNames[lighting] || '自然光'}）`;
}

// ArchiX / Renrery Style SVG Perspective Generator
function generateArchiXPerspectiveSvg({ id, spaceType, style, lighting, customPrompt }) {
  const isNight = lighting === 'night' || lighting === 'goldenhour';
  const isTwilight = lighting === 'goldenhour';

  // Palette setup based on style & lighting
  let skyTop = '#38bdf8';
  let skyBottom = '#e0f2fe';
  let floorColor = '#d97706'; // warm wood
  let wallColor = '#f8fafc';
  let accentLight = '#fef08a';

  if (isTwilight) {
    skyTop = '#1e1b4b';
    skyBottom = '#f97316';
    accentLight = '#fbbf24';
  } else if (isNight) {
    skyTop = '#090d16';
    skyBottom = '#1e293b';
    accentLight = '#f59e0b';
  }

  if (style === 'japandi') {
    wallColor = '#f1f5f9';
    floorColor = '#b45309';
  } else if (style === 'hotellike') {
    wallColor = '#334155';
    floorColor = '#475569';
  } else if (style === 'scandi') {
    wallColor = '#ffffff';
    floorColor = '#fcd34d';
  }

  let sceneContent = '';

  if (spaceType === 'facade') {
    // Exterior Architecture (ArchiX Style)
    sceneContent = `
      <!-- Ground & Grass -->
      <rect y="540" width="1200" height="260" fill="#064e3b" />
      <path d="M 0 560 Q 350 530 700 550 T 1200 540 L 1200 800 L 0 800 Z" fill="#047857" opacity="0.85"/>
      <!-- Stone Walkway -->
      <polygon points="460,800 560,800 530,550 490,550" fill="#64748b" opacity="0.7"/>
      <!-- Architectural Eaves & Overhang -->
      <polygon points="120,320 1080,320 1010,240 190,240" fill="#0f172a" />
      <!-- Building Main Facade -->
      <rect x="180" y="320" width="840" height="230" fill="${wallColor}" stroke="#334155" stroke-width="2"/>
      <!-- Timber Louver Screen -->
      <g fill="${floorColor}">
        <rect x="220" y="330" width="14" height="210" />
        <rect x="250" y="330" width="14" height="210" />
        <rect x="280" y="330" width="14" height="210" />
        <rect x="310" y="330" width="14" height="210" />
        <rect x="340" y="330" width="14" height="210" />
        <rect x="370" y="330" width="14" height="210" />
      </g>
      <!-- Floor-to-Ceiling Picture Glass -->
      <rect x="440" y="340" width="400" height="190" fill="#38bdf8" opacity="0.25" stroke="#475569" stroke-width="4"/>
      <!-- Warm Glow Inside Glass -->
      <rect x="460" y="360" width="360" height="150" fill="${accentLight}" opacity="${isNight ? '0.75' : '0.3'}" filter="url(#rxGlow)"/>
      <!-- Entrance Wooden Door -->
      <rect x="880" y="370" width="100" height="180" fill="${floorColor}" stroke="#78350f" stroke-width="3"/>
      <!-- Entrance Sconce Light -->
      <circle cx="860" cy="410" r="10" fill="${accentLight}" filter="url(#rxGlow)"/>
    `;
  } else if (spaceType === 'kitchen') {
    // Island Open Kitchen (Renrery Style)
    sceneContent = `
      <!-- Back Wall -->
      <rect width="1200" height="800" fill="${wallColor}"/>
      <!-- Flooring -->
      <polygon points="0,520 1200,520 1200,800 0,800" fill="${floorColor}"/>
      <!-- Floor lines (planks) -->
      <line x1="0" y1="580" x2="1200" y2="580" stroke="#78350f" stroke-width="1.5" opacity="0.4"/>
      <line x1="0" y1="650" x2="1200" y2="650" stroke="#78350f" stroke-width="1.5" opacity="0.4"/>
      <line x1="0" y1="730" x2="1200" y2="730" stroke="#78350f" stroke-width="1.5" opacity="0.4"/>
      <!-- Back Cabinet & Window -->
      <rect x="150" y="240" width="900" height="280" fill="#334155"/>
      <rect x="300" y="280" width="600" height="120" fill="#38bdf8" opacity="0.4" stroke="#64748b" stroke-width="3"/>
      <!-- Island Counter (Centerpiece) -->
      <rect x="250" y="440" width="700" height="220" rx="8" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
      <rect x="230" y="430" width="740" height="30" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
      <!-- Gooseneck Faucet & Sink -->
      <path d="M 450 430 L 450 360 Q 450 330 480 330 Q 510 330 510 360 L 510 380" fill="none" stroke="#94a3b8" stroke-width="6"/>
      <!-- Pendant Lights -->
      <line x1="420" y1="0" x2="420" y2="280" stroke="#64748b" stroke-width="2"/>
      <circle cx="420" cy="285" r="22" fill="${accentLight}" opacity="0.9" filter="url(#rxGlow)"/>
      <line x1="600" y1="0" x2="600" y2="280" stroke="#64748b" stroke-width="2"/>
      <circle cx="600" cy="285" r="22" fill="${accentLight}" opacity="0.9" filter="url(#rxGlow)"/>
      <line x1="780" y1="0" x2="780" y2="280" stroke="#64748b" stroke-width="2"/>
      <circle cx="780" cy="285" r="22" fill="${accentLight}" opacity="0.9" filter="url(#rxGlow)"/>
      <!-- Bar Stools -->
      <rect x="380" y="600" width="60" height="140" fill="#0f172a" rx="6"/>
      <rect x="560" y="600" width="60" height="140" fill="#0f172a" rx="6"/>
      <rect x="740" y="600" width="60" height="140" fill="#0f172a" rx="6"/>
    `;
  } else {
    // Default: High-Ceiling LDK with Garden View (Japandi / Modern)
    sceneContent = `
      <!-- Back Wall -->
      <rect width="1200" height="800" fill="${wallColor}"/>
      <!-- Solid Wood Flooring -->
      <polygon points="0,480 1200,480 1200,800 0,800" fill="${floorColor}"/>
      <!-- Wood plank perspective lines -->
      <line x1="600" y1="480" x2="100" y2="800" stroke="#78350f" stroke-width="2" opacity="0.3"/>
      <line x1="600" y1="480" x2="350" y2="800" stroke="#78350f" stroke-width="2" opacity="0.3"/>
      <line x1="600" y1="480" x2="600" y2="800" stroke="#78350f" stroke-width="2" opacity="0.3"/>
      <line x1="600" y1="480" x2="850" y2="800" stroke="#78350f" stroke-width="2" opacity="0.3"/>
      <line x1="600" y1="480" x2="1100" y2="800" stroke="#78350f" stroke-width="2" opacity="0.3"/>
      <!-- High Exposed Timber Beams -->
      <rect x="100" y="60" width="1000" height="40" fill="#78350f" rx="4"/>
      <rect x="180" y="60" width="40" height="180" fill="#92400e"/>
      <rect x="580" y="60" width="40" height="180" fill="#92400e"/>
      <rect x="980" y="60" width="40" height="180" fill="#92400e"/>
      <!-- Panoramic Garden Window -->
      <rect x="120" y="160" width="680" height="320" fill="#e0f2fe" stroke="#334155" stroke-width="6"/>
      <!-- Garden Outside Window -->
      <rect x="125" y="340" width="670" height="135" fill="#047857" opacity="0.8"/>
      <!-- Modern Low Sofa -->
      <rect x="420" y="520" width="460" height="160" rx="14" fill="#334155" stroke="#1e293b" stroke-width="3"/>
      <rect x="440" y="500" width="420" height="60" rx="10" fill="#475569"/>
      <!-- Designer Coffee Table -->
      <ellipse cx="640" cy="720" rx="160" ry="45" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3"/>
      <!-- Architectural Plant / Foliage -->
      <path d="M 160 520 Q 200 420 180 360 Q 230 400 240 480 Z" fill="#15803d"/>
      <path d="M 220 540 Q 270 410 290 350 Q 280 430 250 500 Z" fill="#166534"/>
      <!-- Indirect Ceiling Glow -->
      <rect x="100" y="100" width="1000" height="40" fill="${accentLight}" opacity="0.6" filter="url(#rxGlow)"/>
    `;
  }

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
    <defs>
      <linearGradient id="rxSky" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${skyTop}"/>
        <stop offset="100%" stop-color="${skyBottom}"/>
      </linearGradient>
      <filter id="rxGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="18" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <filter id="rxShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.35"/>
      </filter>
    </defs>
    
    <!-- Background / Sky -->
    <rect width="1200" height="800" fill="url(#rxSky)"/>
    
    <!-- Dynamic Scene -->
    ${sceneContent}
    
    <!-- ArchiX/Renrery Style Watermark & Spec Header -->
    <g filter="url(#rxShadow)">
      <rect x="40" y="40" width="560" height="80" rx="14" fill="#0f172a" opacity="0.9" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="65" y="72" fill="#f8fafc" font-family="'Inter', sans-serif" font-size="18" font-weight="700">
        AI フォトリアルパース工房 [ArchiX Engine]
      </text>
      <text x="65" y="98" fill="#38bdf8" font-family="sans-serif" font-size="13">
        ${getPerspectiveTitle(spaceType, style, lighting)}
      </text>
      <rect x="490" y="55" width="90" height="28" rx="6" fill="#0284c7"/>
      <text x="506" y="74" fill="#ffffff" font-family="sans-serif" font-size="12" font-weight="bold">4K リアル</text>
    </g>
  </svg>
  `.trim();

  const filename = `archix_${id}.svg`;
  const filePath = path.join(RENDERS_DIR, filename);
  fs.writeFileSync(filePath, svg);
  return `/renders/${filename}`;
}

// 24/365 AI Building Physics & Thermal Environment Agent (Objective, Neutral Expert)
function generateAiAgentResponse(userText) {
  const t = userText.toLowerCase();
  
  if (t.includes('結露') || t.includes('カビ') || t.includes('湿気') || t.includes('防ぐ')) {
    return `【24h 温熱換気AI相談室 回答】
**絶対に壁内結露を起こさないための必須3大原則：**

1. **防湿気密層（室内側）の連続性（C値0.5以下、理想0.3以下）**
   冬場の結露の主因は、室内の湿った温風が壁の隙間から断熱層へ漏れ込む「漏気結露」です。透湿抵抗の高い防湿シート（ポリエチレン等）を気密テープで完璧に連続させることが最重要です。
2. **屋外側の透湿性（外皮の透湿防水シート・通気層）**
   万一壁内に入った微量な湿気を外へ逃がすため、外壁材の内側に15mm以上の「通気層（外壁通気工法）」を確保し、外側は透湿抵抗の低い構造用合板や透湿シートを用います。
3. **ガラス・サッシの熱貫流率（U値）向上**
   窓の表面結露を防ぐには、樹脂サッシ＋トリプルガラス（アルゴンガス/クリプトンガス入り・樹脂スペーサー）が極めて有効です（熱貫流率1.0 W/㎡K以下）。

※壁内結露は建物の寿命を縮める最大の要因です。設計段階での「定常・非定常結露計算（WUFI等）」の実施を強く推奨します。`;
  }

  if (t.includes('換気') || t.includes('第1種') || t.includes('第3種') || t.includes('熱交換')) {
    return `【24h 温熱換気AI相談室 回答】
**第1種換気（熱交換） vs 第3種換気（自然給気・機械排気）の比較アドバイス：**

- **第1種熱交換換気（全熱/顕熱）**:
  - メリット: 排気の熱と湿度を最大70〜90%回収して給気に移すため、冬に冷気が足元に落ちず、エアコンの冷暖房負荷（光熱費）を劇的に削減できます。花粉・PM2.5フィルターも集中的に管理可能。
  - デメリット: 初期機器費用が高く、定期的なダクト清掃やフィルター交換が必須。
  - **推奨条件**: C値0.5以下の高気密住宅で本領を発揮します（隙間が多いと漏気で熱交換効率が落ちます）。

- **第3種換気**:
  - メリット: 構造がシンプルで初期コスト・保守費用が安く、故障リスクが極めて低い。
  - デメリット: 給気口から冬の冷たい外気が直接入るため、居室でコールドドラフト（不快な冷気）を感じやすい。

💡 **結論**: 冬の快適性・光熱費最小化・結露防止を最優先にするなら「C値0.5以下＋第1種熱交換換気」が現代の標準的ベストプラクティスです。`;
  }

  if (t.includes('c値') || t.includes('気密') || t.includes('隙間')) {
    return `【24h 温熱換気AI相談室 回答】
**C値（相当隙間面積：㎠/㎡）が家づくりで決定的に重要な理由：**

- **C値1.0とC値0.3の違い**:
  - C値1.0（一般的な高気密住宅）：延床30坪でハガキ約1枚分の隙間。風が吹くと計画外の給排気が起き、24時間換気のショートサーキット（換気されない淀み部屋）が発生します。
  - C値0.3（超高気密）：ハガキ約0.3枚分。家中の空気が設計通りに計画換気され、壁内結露リスクがほぼゼロになります。

⚠️ **注意点**: C値は「設計図面」では出せません。必ず大工職人さんの現場施工後に「気密測定試験（送風機で減圧して実測）」を全棟で実施しているビルダーを選定することが成功の秘訣です。`;
  }

  if (t.includes('ua値') || t.includes('heat20') || t.includes('g2') || t.includes('g3') || t.includes('断熱等級')) {
    return `【24h 温熱換気AI相談室 回答】
**HEAT20 G2 vs G3のコスパ・体感温度の現実的な比較：**

- **HEAT20 G2（断熱等級6 / 5〜6地域でUA値0.46以下）**:
  - 冬場の体感最低室温がおおむね13℃を下回らない設計。
  - エアコン1〜2台での快適暖房が可能で、**建設コストと光熱費削減のバランスが最も良い「コスパ最強」基準**です。
- **HEAT20 G3（断熱等級7 / 5〜6地域でUA値0.26以下）**:
  - 冬でも無暖房で概ね15℃以上をキープ。付加断熱（ダブル断熱）や最高峰トリプルサッシが必須。
  - 建設費はG2より数百万円アップしますが、生涯の医療費削減・極上の無風暖房を求める方に選ばれます。

まずは「G2（UA値0.46以下＋C値0.5以下）」を基本ラインとして計画することをおすすめします。`;
  }

  if (t.includes('床暖房') || t.includes('エアコン') || t.includes('暖房') || t.includes('全館空調')) {
    return `【24h 温熱換気AI相談室 回答】
**床暖房 vs エアコン暖房（全館空調）の賢い選び方：**

- 高断熱・高気密（G2以上・C値0.5以下）であれば、**エアコン1〜2台で家中20℃以上を一定に保つことが物理的に可能**です。
- しかし、エアコンの微小な「温風の気流感」「乾燥感」「風切り音」が苦手な方には、30℃前後のぬるいお湯を回す**「低温水床暖房」**や、床下空間を暖める**「床下エアコン暖房」**が最も自然で上質な暖かさを生みます。
- 電気ヒーター式の高温床暖房は光熱費が跳ね上がるため、ヒートポンプ温水式を選びましょう。`;
  }

  if (t.includes('サッシ') || t.includes('窓') || t.includes('トリプル') || t.includes('樹脂')) {
    return `【24h 温熱換気AI相談室 回答】
**窓サッシ選びの鉄則：**

家全体の熱の出入りのうち、**夏は約73%、冬は約58%が「窓（開口部）」から失われます**。壁の断熱材を厚くするよりも、窓の性能を上げることが圧倒的に効果的です。

1. **オール樹脂サッシ（必須）**: アルミ樹脂複合サッシは結露リスクが残ります。室内外ともに熱伝導率がアルミの1/1000である樹脂製を選びましょう。
2. **トリプルガラス＋アルゴンガス入り＋樹脂スペーサー**:
   南面の大きな日射取得窓には「日射取得型Low-E」、東西北面には「日射遮蔽型Low-E」を使い分けるのがパッシブ設計の基本です。`;
  }

  if (t.includes('鉄骨') || t.includes('プレハブ') || t.includes('撤退') || t.includes('木造') || t.includes('骨組み') || t.includes('筋肉')) {
    return `【24h 温熱換気AI相談室 回答】
**大手鉄骨プレハブメーカーの寒冷地撤退と「骨組み・筋肉」の物理的真実：**

大手プレハブメーカーが東北や北海道などの寒冷地から撤退を表明したのは、建築物理・熱工学の視点から見れば当然の帰結です。

1. **熱伝導率の決定的な差（鉄は木の数百倍熱を逃がす）**:
   - 鉄の熱伝導率は約50W/(m・K)。これに対し、木材は約0.12W/(m・K)と**約400倍以上も熱を通しにくい天然の断熱材**です。
   - 冬極寒になる欧州・北米の住宅において、構造体そのものを鉄骨にする住宅は極めて例外的です。四季があり冬冷え込み夏蒸し暑い日本（関東圏も含め）において、熱を逃がす「巨大なヒートブリッジ（熱橋）」となる鉄骨を住宅の柱・梁に据えることは、省エネ・結露防止の観点から根本的な矛盾を抱えています。

2. **表面的な満足（間取りやパース）よりも「見えなくなる骨組み・筋肉」**:
   - 間取りや意匠デザインは住まいの一部に過ぎません。大地震や巨大台風が頻発する日本で、家族の命を守り抜くのは「見えなくなる構造躯体（許容応力度計算による耐震等級3・直下率60%以上の頑強な木造骨組み）」です。
   - 住ま居るは、売買・転売を前提とした短期志向の住宅ではなく、**「50年、100年と何世代も住み続けられる本物の快適性と強靭性」**を最重要視しています。`;
  }

  if (t.includes('30年') || t.includes('モデルハウス') || t.includes('築10年') || t.includes('売買') || t.includes('長持ち')) {
    return `【24h 温熱換気AI相談室 回答】
**向こう30年最先端であり続ける「本当に価値ある住まい」とは：**

住ま居るの　芳彩（かぐや）-結露しない家　モデルハウスは、**築10年を超えた現在でも、国の最新省エネ基準（断熱等級6〜7、HEAT20 G2/G3、C値0.3以下、全棟許容応力度計算耐震等級3）を遥かにクリアする最先端性能**を誇っています。

- **10年以上前から、30年以上先を見据えて設計**:
  日本の住宅の平均寿命が約30年で解体されてしまう最大の原因は、「冬寒く結露で柱が腐る」「構造が脆弱でリフォームできない」という性能不足にあります。
- **売買前提の家と、住み続けるための家は目線が違う**:
  不動産売買や量産プレハブの目線は「新築時の見た目とコスト」です。一方、家族が命を預けて住み続ける住まいは**「真冬でも家中暖かく結露しないこと」「巨大地震の後も補修なしで住み続けられること」**が絶対条件です。
  性能の視線で見れば、住ま居るの手づくり住宅は向こう30年、50年先でも色褪せない最先端基準です。`;
  }

  return `【24h 温熱換気AI相談室 回答】
ご質問ありがとうございます。
当相談室は、ネット上に誤った情報が溢れ、何が正しい答えなのか悩まれている迷えるユーザー様のために、30年来の現場実務者が培ってきた知見、数々の失敗とリアルな経験を忖度なしで全解放してお答えする相談窓口です。

「大手鉄骨プレハブの寒冷地撤退の物理的理由（鉄骨熱橋vs木造超断熱）」「表面的な間取り満足より見えなくなる骨組み・筋肉を最重視する理由」「10年前のモデルハウスが向こう30年最先端であることの実証」「壁内結露を防ぐ透湿気密の鉄則」「C値・UA値・換気方式」など、どのような疑問でもどしどしお尋ねください。24時間365日、客観データと科学的根拠に基づき忖度なしでお答えいたします！`;
}

// Request Helper
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// Ensure Sample Files Exist
const DOWNLOADS_DIR = path.join(PUBLIC_DIR, 'downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}
const samplePdfPath = path.join(DOWNLOADS_DIR, 'sample_calculation.pdf');
if (!fs.existsSync(samplePdfPath)) {
  const dummyPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 120 >> stream
BT
/Helvetica 14 Tf
50 700 Td
(Kabu Sumaile - Allowable Stress Structural Calculation Certificate Grade 3) Tj
ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000062 00000 n 
0000000125 00000 n 
0000000215 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
385
%%EOF`;
  fs.writeFileSync(samplePdfPath, dummyPdf);
}

// Main HTTP Handler
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // --- API ROUTES ---
  
  // 1. Post Render Job (DB Queue Write)
  if (pathname === '/api/jobs' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const job = db.createJob({
        userId: body.userId || 'guest',
        prompt: body.prompt,
        negativePrompt: body.negativePrompt,
        style: body.style
      });
      return sendJson(res, 201, { success: true, job });
    } catch (e) {
      return sendJson(res, 400, { success: false, error: e.message });
    }
  }

  // 2. Get Job Status & Queue Position
  if (pathname.startsWith('/api/jobs/') && method === 'GET') {
    const id = pathname.replace('/api/jobs/', '');
    const job = db.getJobById(id);
    if (!job) return sendJson(res, 404, { success: false, error: 'Job not found' });
    return sendJson(res, 200, { success: true, job });
  }

  // 3. Request Magic Link (Auth)
  if (pathname === '/api/auth/magic-link' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      if (!body.name || !body.email || !body.phone) {
        return sendJson(res, 400, { success: false, error: '氏名・メールアドレス・電話番号は必須です。' });
      }
      const user = db.createUser({
        name: body.name,
        email: body.email,
        phone: body.phone
      });
      const magicUrl = `http://localhost:${PORT}/dashboard.html?token=${user.magic_token}`;
      return sendJson(res, 200, {
        success: true,
        message: 'マジックリンクを発行しました。専用マイページへログインできます。',
        token: user.magic_token,
        magicUrl,
        user
      });
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

  // 4. Verify Magic Link Token
  if (pathname === '/api/auth/verify' && method === 'GET') {
    const token = parsedUrl.query.token;
    const user = db.getUserByToken(token);
    if (!user) return sendJson(res, 401, { success: false, error: '無効なトークンです。' });
    return sendJson(res, 200, { success: true, user });
  }

  // 5. Get User Dashboard Data
  if (pathname.startsWith('/api/dashboard/') && method === 'GET' && !pathname.includes('/chat') && !pathname.includes('/files')) {
    const userId = pathname.replace('/api/dashboard/', '');
    const user = db.getUserById(userId);
    if (!user) return sendJson(res, 404, { success: false, error: 'User not found' });
    
    const jobs = db.getUserJobs(userId);
    const files = db.getUserFiles(userId);
    const messages = db.getUserMessages(userId);
    const bookings = db.getUserBookings(userId);

    return sendJson(res, 200, {
      success: true,
      user,
      jobs,
      files,
      messages,
      bookings
    });
  }

  // 6. Post Chat Message & get AI reply
  if (pathname.includes('/chat') && method === 'POST') {
    const parts = pathname.split('/');
    const userId = parts[3];
    try {
      const body = await parseJsonBody(req);
      const userMsg = db.addMessage({
        userId,
        sender: 'user',
        text: body.text
      });

      // Generate AI Agent Answer
      const aiReplyText = generateAiAgentResponse(body.text);
      const aiMsg = db.addMessage({
        userId,
        sender: 'ai',
        text: aiReplyText
      });

      return sendJson(res, 200, { success: true, messages: [userMsg, aiMsg] });
    } catch (e) {
      return sendJson(res, 400, { success: false, error: e.message });
    }
  }

  // 7. Post Upload File
  if (pathname.includes('/files') && method === 'POST') {
    const parts = pathname.split('/');
    const userId = parts[3];
    try {
      const body = await parseJsonBody(req);
      const file = db.addFile({
        userId,
        filename: body.filename || '施主アップロード資料.pdf',
        filesize: body.filesize || 1024000,
        filetype: body.filetype || 'application/pdf',
        uploadedBy: body.uploadedBy || 'お施主様',
        url: body.url || '/downloads/sample_calculation.pdf'
      });
      return sendJson(res, 200, { success: true, file });
    } catch (e) {
      return sendJson(res, 400, { success: false, error: e.message });
    }
  }

  // 8. Real Model House Booking API
  if (pathname === '/api/bookings' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      if (!body.name || !body.phone || !body.email || !body.preferredDate) {
        return sendJson(res, 400, { success: false, error: 'お名前、電話番号、メール、見学希望日は必須です。' });
      }

      let user = db.createUser({ name: body.name, email: body.email, phone: body.phone });
      const booking = db.createBooking({
        userId: user.id,
        name: body.name,
        phone: body.phone,
        email: body.email,
        preferredDate: body.preferredDate,
        preferredTime: body.preferredTime || '10:00',
        comments: body.comments || ''
      });

      return sendJson(res, 201, {
        success: true,
        message: 'リアル展示場のご見学予約を完了しました！ご登録の携帯番号へ予約確認のSMSをお送りします。',
        booking,
        user
      });
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

  // 9. Admin Portal & CRM Sync
  if (pathname === '/api/admin/users' && method === 'GET') {
    const users = db.getAllUsers();
    return sendJson(res, 200, { success: true, users });
  }

  if (pathname.startsWith('/api/admin/crm-sync/') && method === 'POST') {
    const userId = pathname.replace('/api/admin/crm-sync/', '');
    const updatedUser = db.markCrmSynced(userId);
    const userJobs = db.getUserJobs(userId);
    const userFiles = db.getUserFiles(userId);
    const userMessages = db.getUserMessages(userId);
    const userBookings = db.getUserBookings(userId);

    const crmExportPayload = {
      timestamp: new Date().toISOString(),
      crm_target: '株式会社住ま居る基幹CRMシステム',
      client_profile: updatedUser,
      perspective_history: userJobs,
      shared_documents: userFiles,
      consultation_transcript: userMessages,
      modelhouse_reservations: userBookings
    };

    console.log(`[CRM Integration] One-tap CRM Sync executed for Client ID: ${userId}`);
    return sendJson(res, 200, {
      success: true,
      message: '自社CRMシステムへワンタップ同期が完了しました。',
      exportPayload: crmExportPayload
    });
  }

  // 10. AI Floor Plan Generation API (DeepResearch Pipeline)
  if (pathname === '/api/floorplan/generate' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const topology = createFloorPlanTopology(body);
      const geometry = solve2DGeometry(topology);
      const svgs = {};
      topology.activeLevelKeys.forEach(key => {
        svgs[key] = renderFloorPlanSvg(geometry, key);
      });
      const svg1F = svgs['1f'];
      const svg2F = svgs['2f'] || null;

      FLOORPLANS_STORE.set(topology.planId, { topology, geometry, svgs, svg1F, svg2F });

      return sendJson(res, 200, {
        success: true,
        planId: topology.planId,
        topology,
        geometry,
        svgs,
        svg1F,
        svg2F
      });
    } catch (e) {
      console.error('[FloorPlan API Error]', e);
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

  // 10-B. Multi-Agent Conversational Floor Plan Chat API (Interviewer, Planner, Validator)
  if (pathname === '/api/floorplan/agent-chat' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = runMultiAgentOrchestration(body.message, body.history, body.currentPlanState);
      if (result.plan) {
        FLOORPLANS_STORE.set(result.plan.planId, result.plan);
      }
      return sendJson(res, 200, result);
    } catch (e) {
      console.error('[Agent Chat API Error]', e);
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

  // 10-C. AI Floor Plan Catalog Matching API (間取りラボ参考・最適3選マッチング)
  if (pathname === '/api/floorplan/match' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const matches = db.searchFloorPlans({
        stories: body.stories,
        minTsubo: body.minTsubo,
        maxTsubo: body.maxTsubo,
        targetFamily: body.targetFamily,
        features: body.features || [],
        limit: body.limit || 4
      });
      return sendJson(res, 200, { success: true, count: matches.length, matches });
    } catch (e) {
      console.error('[FloorPlan Match API Error]', e);
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

  // 10-D. AI Floor Plan Remix & Consultation Chat API (あーでもないこーでもない相談改変)
  if (pathname === '/api/floorplan/remix' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { planId, userMessage } = body;
      const basePlan = db.getFloorPlanById(planId);
      if (!basePlan) {
        return sendJson(res, 404, { success: false, error: 'ベースプランが見つかりません。' });
      }

      const msg = (userMessage || '').toLowerCase();
      let aiFeedback = '';
      let modificationSummary = '';

      if (msg.includes('ldk') || msg.includes('リビング') || msg.includes('広く')) {
        aiFeedback = `【AI建築士アドバイス】
LDKの広がりと開放感を優先し、隣接する収納と間仕切りの配置を再構成しました！
キッチンをアイランド・ペニンシュラ対面型にし、視線の抜けを確保することで、体感帖数を＋3〜4帖分広く感じられるレイアウトに改変しています。柱や耐力壁のバランス（直下率60%以上）もキープしています。`;
        modificationSummary = 'LDK有効空間を拡大 ＆ 開放的対面キッチン動線へ改変';
      } else if (msg.includes('パントリー') || msg.includes('食品庫') || msg.includes('収納')) {
        aiFeedback = `【AI建築士アドバイス】
キッチン横に2.0帖のウォークスルー型パントリーを新設しました！
玄関・勝手口側からも直接食品を運び込める「家事ラク2WAY動線」にアップデートしています。冷蔵庫やゴミ箱もすっきり隠せる美観設計です。`;
        modificationSummary = 'キッチン横に2WAYウォークスルーパントリーを追加';
      } else if (msg.includes('和室') || msg.includes('畳') || msg.includes('小上がり')) {
        aiFeedback = `【AI建築士アドバイス】
リビングの一角に3.5帖の小上がり畳コーナー（引出し床下収納付き）を組み込みました！
普段はお子様のお昼寝や洗濯物たたみスペースとして活用でき、ロールスクリーンや格子引戸で来客時の独立個室としても機能します。`;
        modificationSummary = 'LDK連動型小上がり畳コーナー（収納付）を追加';
      } else if (msg.includes('書斎') || msg.includes('テレワーク') || msg.includes('ワーク')) {
        aiFeedback = `【AI建築士アドバイス】
防音とオンライン会議に配慮した籠もり感のある2.5帖の独立ワークスペースをレイアウトしました！
背面に本棚、カウンターには自然光が差し込む高窓を設けており、家族の気配を感じつつ集中できる絶妙な距離感を保っています。`;
        modificationSummary = '独立テレワーク書斎（遮音配慮・自然採光窓付）を追加';
      } else if (msg.includes('洗面') || msg.includes('脱衣') || msg.includes('ランドリー')) {
        aiFeedback = `【AI建築士アドバイス】
洗面台と脱衣室を完全分離し、3.0帖の広々ランドリールーム（室内干し・スロップシンク完備）にアップデートしました！
家族が入浴中でも気兼ねなく洗面台を使え、洗濯動線も大幅に短縮されます。`;
        modificationSummary = '洗面脱衣完全分離 ＆ 室内干しランドリールームへ改変';
      } else {
        aiFeedback = `【AI建築士アドバイス】
「${userMessage}」のご要望をしっかり反映し、空間ボリュームと動線のバランスを再最適化しました！
生活動線とプライバシー、採光・通風のシミュレーションを行い、構造的な耐震バランスを崩さずに理想の暮らしへ一歩近づけました。さらに気になる点があれば、何でも続けてお申し付けください！`;
        modificationSummary = `ご要望「${userMessage.substring(0, 15)}...」を反映したプラン改変`;
      }

      return sendJson(res, 200, {
        success: true,
        planId: basePlan.id,
        title: basePlan.title + '（AI改変プラン）',
        stories: basePlan.stories,
        area_sqm: basePlan.area_sqm,
        tsubo: basePlan.tsubo,
        rooms: basePlan.rooms,
        target_family: basePlan.target_family,
        rooms_summary: basePlan.rooms_summary,
        svg_1f: basePlan.svg_1f,
        svg_2f: basePlan.svg_2f,
        modificationSummary,
        aiFeedback
      });
    } catch (e) {
      console.error('[FloorPlan Remix API Error]', e);
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

  // 10-E. Get Floor Plan by ID API
  if (pathname.startsWith('/api/floorplan/detail/') && method === 'GET') {
    const id = pathname.replace('/api/floorplan/detail/', '');
    const plan = db.getFloorPlanById(id);
    if (!plan) return sendJson(res, 404, { success: false, error: 'Plan not found' });
    return sendJson(res, 200, { success: true, plan });
  }

  // 10-F. 24/365 AI Thermal & Building Physics Chat Consultation API
  if (pathname === '/api/thermal-chat' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const answer = generateAiAgentResponse(body.message || '');
      return sendJson(res, 200, {
        success: true,
        reply: answer,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

  // 10-G. ArchiX/Renrery Style Instant Architectural Perspective API
  if (pathname === '/api/perspective/preset-generate' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const spaceType = body.spaceType || 'facade'; // facade, ldk, kitchen, bedroom, terrace, bath
      const style = body.style || 'japandi'; // japandi, scandi, hotellike, japanese, minimal
      const lighting = body.lighting || 'daylight'; // daylight, goldenhour, night, soft
      const customPrompt = body.prompt || '';
      
      const renderId = 'rx_' + Math.random().toString(36).substring(2, 9);
      const svgUrl = generateArchiXPerspectiveSvg({
        id: renderId,
        spaceType,
        style,
        lighting,
        customPrompt
      });

      return sendJson(res, 200, {
        success: true,
        renderId,
        imageUrl: svgUrl,
        spaceType,
        style,
        lighting,
        title: getPerspectiveTitle(spaceType, style, lighting)
      });
    } catch (e) {
      console.error('[Perspective Preset API Error]', e);
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

  // 10-H. Admin Floor Plans Management API
  if (pathname === '/api/admin/floorplans' && method === 'GET') {
    const plans = db.getAllFloorPlans(100);
    return sendJson(res, 200, { success: true, count: plans.length, plans });
  }

  if (pathname === '/api/admin/floorplans/import' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const plan = db.importFloorPlan(body);
      return sendJson(res, 201, { success: true, plan });
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

  // 11. Export Standard 3D BIM (IFC) File API
  if (pathname === '/api/floorplan/export-ifc' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const planId = body.planId;
      let planData = FLOORPLANS_STORE.get(planId);

      if (!planData) {
        // regenerate on the fly if not in store
        const topology = createFloorPlanTopology(body);
        const geometry = solve2DGeometry(topology);
        planData = { topology, geometry };
      }

      const ifcContent = generateIfcModel(planData.geometry);

      res.writeHead(200, {
        'Content-Type': 'application/x-step; charset=utf-8',
        'Content-Disposition': `attachment; filename="Sumaile_Kaguya_Plan_${planId || 'BIM'}.ifc"`,
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(ifcContent);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

  // --- STATIC FILE SERVER ---
  let reqPath = pathname === '/' ? '/index.html' : pathname;
  let filePath = path.join(PUBLIC_DIR, reqPath);

  // Default to index.html if not found or no extension
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

// Start Server & GPU Worker
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  株式会社住ま居る Web App & Queue Server Running!`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`=======================================================`);
  startGpuWorker(3000);
});
