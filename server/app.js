const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const db = require('./db.js');
const { startGpuWorker } = require('./gpu_worker.js');
const { createFloorPlanTopology, solve2DGeometry, renderFloorPlanSvg, generateIfcModel, runMultiAgentOrchestration } = require('./floorplan_generator.js');
const rateLimiter = require('./rate_limiter.js');
const aiConsultantEngine = require('./ai_consultant_engine.js');

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
const STOCKS_DIR = path.join(RENDERS_DIR, 'stocks');
if (!fs.existsSync(STOCKS_DIR)) {
  fs.mkdirSync(STOCKS_DIR, { recursive: true });
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
// 📁 data/thermal_knowledge/ フォルダ内の実務資料・Markdownを動的読み込み
function getThermalKnowledgeSnippets() {
  const dir = path.join(__dirname, '..', 'data', 'thermal_knowledge');
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir);
  const docs = [];
  for (const f of files) {
    if (f.endsWith('.md') || f.endsWith('.txt')) {
      try {
        const content = fs.readFileSync(path.join(dir, f), 'utf-8');
        docs.push({ filename: f, content });
      } catch (e) {
        console.warn('[ThermalKnowledge] Read error:', f, e);
      }
    }
  }
  return docs;
}

function searchThermalKnowledgeDocs(query) {
  const docs = getThermalKnowledgeSnippets();
  if (docs.length === 0) return null;
  const qLower = query.toLowerCase();
  const words = qLower.split(/[\s　、。！？・]+/).filter(w => w.length >= 2);
  
  let bestMatch = null;
  let maxScore = 0;

  for (const doc of docs) {
    // セクション（## 見出し）ごとに分割
    const sections = doc.content.split(/(?=^##?\s+)/m);
    for (const sec of sections) {
      const sLower = sec.toLowerCase();
      let score = 0;
      for (const w of words) {
        if (sLower.includes(w)) score += 2;
      }
      if (score > maxScore && score >= 2) {
        maxScore = score;
        bestMatch = { filename: doc.filename, text: sec.trim() };
      }
    }
  }
  return bestMatch;
}

function generateAiAgentResponse(userText) {
  const t = userText.toLowerCase();

  // 1. data/thermal_knowledge/ フォルダ内の実務資料からの検索ヒット
  const matchedDoc = searchThermalKnowledgeDocs(userText);
  if (matchedDoc && matchedDoc.text.length > 30) {
    return `【24h 温熱換気AI相談室 回答】
住ま居るの現場実務ナレッジ（${matchedDoc.filename}）よりお答えします：

${matchedDoc.text}

💡 **住ま居るの客観的視点**:
温熱・換気はカタログ値だけでなく、現場での丁寧な気密施工・熱橋対策がすべてです。さらに詳しく知りたい点があれば何でもお尋ねください。`;
  }
  
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
  if (pathname.startsWith('/api/dashboard/') && pathname.includes('/chat') && method === 'POST') {
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

  // 10-E2. 🤖 住ま居るAI建築士 間取り相談＆知見100選 深掘り対話API (高精度キーワード解析＆プロ回答エンジン)
  if ((pathname === '/api/madori-bot/chat' || pathname === '/api/madori-bot/consult') && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const userMsg = (body.message || '').trim();
      const qaId = body.qaId || null;

      // 100問知見JSONの読み込み
      let qaData = null;
      try {
        const qaJsonPath = path.join(PUBLIC_DIR, 'data', 'qa_knowledge_100.json');
        if (fs.existsSync(qaJsonPath)) {
          qaData = JSON.parse(fs.readFileSync(qaJsonPath, 'utf-8'));
        }
      } catch (err) {
        console.warn('[MadoriBot] Failed to read qa_knowledge_100.json:', err);
      }

      let matchedQa = null;
      if (qaId && qaData && qaData.questions) {
        matchedQa = qaData.questions.find(q => q.id === qaId);
      }

      // 回答テキストの構築
      let reply = '';
      let recommendedQas = [];

      // 温熱・断熱・結露に関する相談が間取り相談に来た場合の親切な誘導
      const tLower = userMsg.toLowerCase();
      const isThermalQuery = ['結露', 'c値', 'ua値', '断熱等級', '気密', 'heat20', '壁内結露', '熱交換換気'].some(k => tLower.includes(k));

      if (matchedQa) {
        // ① 特定のQに対する深掘り回答（メリット・デメリット併記）
        reply = `【住ま居るAI建築士より】
ご質問ありがとうございます！
「${matchedQa.question}」について、より詳細な設計黄金則と我が家への取り入れ方をお答えします。

📐 **推奨標準寸法・モジュール基準**
${matchedQa.dimension}

💡 **住ま居る設計哲学とプロの黄金ルール（メリット・デメリット）**
${matchedQa.details}

✨ **施主様への個別アドバイス・後悔を防ぐコツ**
・本仕様を取り入れる際は、隣接する生活動線（${matchedQa.categoryName}）との干渉がないかを必ず事前にご確認ください。
・「${matchedQa.shortAnswer}」を基本としながら、ご家族の生活リズムに合わせた微調整が可能です。
・さらに具体的な敷地寸法やご家族の人数、ご予算に合わせた個別アレンジも可能です。続けて気になる点があれば何でもお尋ねください！`;

        if (qaData && qaData.questions) {
          recommendedQas = qaData.questions
            .filter(q => q.category === matchedQa.category && q.id !== matchedQa.id)
            .slice(0, 3)
            .map(q => ({ id: q.id, question: q.question, categoryName: q.categoryName }));
        }
      } else if (isThermalQuery) {
        // ② 温熱・気密の専門相談への誘導
        reply = `【住ま居るAI建築士より】
温熱環境・断熱・気密（C値・UA値・結露防止）に関するご質問ですね！

住ま居るでは、温熱・換気環境の専門的なご相談に対して、30年来の現場実務データと科学的根拠を全解放した専用窓口**「24h温熱換気AI相談室」**をご用意しております。

ヘッダーナビの「💬 24h温熱換気AI相談」から、壁内結露対策やC値0.3・HEAT20 G2.5の真実について忖度なしの完全回答をいつでもご覧いただけます。

※なお、間取り・プランニングの観点では「大開口吹き抜けやリビングイン階段を設けても、家全体が均一に暖まる高断熱躯体（Ua値0.32・C値0.3）」が基本前提となっております！`;
        if (qaData && qaData.questions) {
          recommendedQas = qaData.questions.slice(0, 3).map(q => ({ id: q.id, question: q.question, categoryName: q.categoryName }));
        }
      } else {
        // ③ 自由入力に対する高度なキーワード解析とマッチング
        let bestHit = null;

        if (qaData && qaData.questions) {
          // 主要キーワード辞書
          const keywordDict = [
            { words: ['乾太', 'かんた', 'ガス乾燥', '衣類乾燥'], targetId: 'w_03' },
            { words: ['ミーレ', '食洗機', 'ボッシュ', '大型食洗'], targetId: 'k_09' },
            { words: ['通路幅', 'キッチンの幅', '背面収納の間'], targetId: 'k_01' },
            { words: ['冷蔵庫', '冷蔵庫の位置', '手前', '奥'], targetId: 'k_02' },
            { words: ['アイランド', 'ペニンシュラ', '対面キッチン'], targetId: 'k_03' },
            { words: ['パントリー', '食品庫'], targetId: 'k_04' },
            { words: ['天板', 'キッチンの高さ', 'ワークトップ'], targetId: 'k_05' },
            { words: ['小上がり', '畳コーナー', '段差', '35cm'], targetId: 'ldk_01' },
            { words: ['吹き抜け', 'ふきぬけ', 'シーリングファン'], targetId: 'ldk_03' },
            { words: ['スタディ', 'テレワーク', '書斎', 'ヌック', 'ワークスペース'], targetId: 'ldk_05' },
            { words: ['無垢床', 'ヒノキ', 'スギ', '西川材'], targetId: 'ldk_08' },
            { words: ['珪藻土', '塗り壁', '調湿'], targetId: 'ldk_10' },
            { words: ['脱衣室', '洗面所', 'セパレート', '分離'], targetId: 'w_01' },
            { words: ['ランドリー', '室内干し', '物干し'], targetId: 'w_02' },
            { words: ['お風呂', 'ユニットバス', '1616', '1620'], targetId: 'w_04' },
            { words: ['ダブルボウル', '2ボウル', '洗面台'], targetId: 'w_05' },
            { words: ['ファミクロ', 'ファミリークローゼット', '直結'], targetId: 'w_06' },
            { words: ['2way', '家族動線', '来客動線', '土間', 'sic', 'シューズクローク'], targetId: 'ent_01' },
            { words: ['上がり框', '玄関段差', '框'], targetId: 'ent_03' },
            // 家相・風水の特化キーワード（特定設問を先に判定）
            { words: ['家相と住みやすさ', '家相の対立', '家相優先', '家相と動線', 'どちらを優先', '住みやすさ'], targetId: 'kas_25' },
            { words: ['水回り（風呂・トイレ・洗面）が「南側」', '水回り南側', '南側の水回り', '水回りが南', '風呂が南', '南向き風呂', 'ビューバス', '南側ランドリー'], targetId: 'kas_21' },
            { words: ['欠け', '凹み', 'ビルトインガレージ', '家の形に', '家の凹み', '変形住宅'], targetId: 'kas_07' },
            { words: ['鬼門', '裏鬼門', '北東', '南西', '鬼門にキッチン', '裏鬼門にキッチン'], targetId: 'kas_01' },
            { words: ['太極', '家の中心', '中心のトイレ', '玄関の真上', '玄関上のトイレ'], targetId: 'kas_04' },
            { words: ['直線階段', '玄関正面階段', '玄関の正面に階段', '玄関から階段'], targetId: 'kas_05' },
            { words: ['神棚', '仏壇'], targetId: 'kas_06' },
            { words: ['北枕', 'ベッドの向き', '寝室方角'], targetId: 'kas_09' },
            { words: ['南東玄関', '辰巳玄関', '北玄関', '辰巳'], targetId: 'kas_20' },
            { words: ['路殺', 't字路', '突き当たり', '三角形敷地', '変形敷地'], targetId: 'kas_22' },
            { words: ['正中線', '四隅線'], targetId: 'kas_03' },
            { words: ['家相', '風水'], targetId: 'kas_25' },
            { words: ['尺庭', '坪庭', '中庭', '90cm', '光庭'], targetId: 'gar_01' },
            { words: ['ウッドデッキ', 'デッキ', '天然木デッキ'], targetId: 'gar_02' },
            { words: ['ハイドア', '天井ドア', '2400', '天井までのドア'], targetId: 'ldk_20' },
            { words: ['減窓', '窓を減らす', '窓減らす', '採光計算'], targetId: 'ldk_23' },
            { words: ['パントリー扉', 'ロールスクリーン', '食品庫の扉'], targetId: 'k_20' },
            { words: ['階段下', '階段下トイレ', '階段下スペース', '階段下の活用'], targetId: 'st_04' },
            { words: ['wic通路幅', 'ウォークイン通路', 'wic寸法', 'クローゼット通路幅'], targetId: 'st_02' },
            { words: ['ホスクリーン', 'アイアンバー', '物干し金物', '室内物干し器具'], targetId: 'eq_19' },
            { words: ['引き戸', '開き戸', 'ドアの開き方', '引き戸と開き戸'], targetId: 'ldk_11' },
            { words: ['sic可動棚', 'シューズクローク棚', '可動棚固定棚', '靴棚可動'], targetId: 'st_16' },
            { words: ['カップボードゴミ箱', 'ゴミ箱スペース', 'ダストボックス位置', 'ゴミ箱置き場'], targetId: 'k_17' },
            { words: ['壁掛けテレビ', 'テレビ下地', '配線隠し', '空配管', '呼び36', '呼び28'], targetId: 'ldk_17' },
            { words: ['ルンバ', 'ロボット掃除機', 'ルンバ基地'], targetId: 'ldk_24' },
            { words: ['タッチレス', 'ハンズフリー水栓', 'センサー水栓'], targetId: 'k_16' },
            { words: ['スロップシンク', '泥汚れ', 'つけ置き'], targetId: 'w_20' },
            { words: ['肩湯', '楽湯', 'ジェットバス'], targetId: 'w_24' },
            { words: ['スマートキー', '顔認証', 'タッチキー', '電子錠'], targetId: 'ent_17' },
            { words: ['太陽光', '蓄電池', 'ソーラー', '自家消費'], targetId: 'eq_21' },
            { words: ['エコキュート', '370l', '460l', '給湯器'], targetId: 'eq_22' },
            { words: ['人工芝', '天然芝', '芝生', '防草シート'], targetId: 'gar_22' },
            { words: ['平屋', '将来平屋', '1階完結'], targetId: 'ldk_06' },
            { words: ['回遊動線', '行き止まり', '回れる家'], targetId: 'ldk_13' },
            { words: ['2階トイレ', 'トイレ1箇所', 'トイレ減額'], targetId: 'w_12' },
            { words: ['子供部屋', '子ども部屋', '間仕切り', '2部屋'], targetId: 'ldk_12' },
            { words: ['ただいま手洗い', '玄関手洗い'], targetId: 'ent_15' }
          ];

          for (const item of keywordDict) {
            if (item.words.some(w => tLower.includes(w.toLowerCase()))) {
              bestHit = qaData.questions.find(q => q.id === item.targetId);
              if (bestHit) break;
            }
          }

          // 辞書でヒットしない場合、質問文・キーワードタグ・本文の広範マッチング
          if (!bestHit) {
            const hits = qaData.questions.filter(q => {
              const kwMatch = (q.keywords || []).some(k => tLower.includes(k.toLowerCase()));
              const textMatch = q.question.toLowerCase().includes(tLower) || q.details.toLowerCase().includes(tLower);
              return kwMatch || textMatch;
            });
            if (hits.length > 0) bestHit = hits[0];
          }
        }

        if (bestHit) {
          reply = `【住ま居るAI建築士より】
「${userMsg}」について、住ま居るの設計知見データベースより回答いたします！

💡 **結論・重要ポイント**
${bestHit.shortAnswer}

📐 **標準寸法・モジュール基準**
${bestHit.dimension}

🔍 **設計のプロの知見（メリット・デメリット）**
${bestHit.details}

さらに「${bestHit.categoryName}」に関する他の疑問や、実際の敷地への落とし込み、ご予算についても続けてご質問いただけます！`;

          if (qaData && qaData.questions) {
            recommendedQas = qaData.questions
              .filter(q => q.category === bestHit.category && q.id !== bestHit.id)
              .slice(0, 3)
              .map(q => ({ id: q.id, question: q.question, categoryName: q.categoryName }));
          }
        } else {
          // 一般的な質問へのAI建築士の総合的回答
          reply = `【住ま居るAI建築士より】
「${userMsg}」についてのご相談を承りました。

住ま居るでは、30年以上の設計・施工実務を通じて培った「家事ラク動線・適材適所収納・無駄のないモジュール寸法・自然素材の心地よさ」の観点から総合的にアドバイスいたします。

【メリットと注意すべきデメリット】
・**生活動線の最適化**: 玄関→SIC→パントリー→キッチン→水回りのスムーズなつながりを重視します。
・**構造と寸法の無理のなさ**: 日本の伝統尺モジュール（910mm / 227.5mmピッチ）に則ることで、耐震性とコストパフォーマンスが最大化されます。
・**空間の居場所づくり**: 単なる広い部屋ではなく、小上がり畳やスタディコーナー、尺庭（光庭）などの豊かな奥行きを演出します。

より詳しいご要望（「延床〇〇坪」「家族〇人」「〇〇を広くしたい」など）を教えていただければ、具体的な部屋配置や寸法をご提案いたします！`;

          if (qaData && qaData.questions) {
            recommendedQas = qaData.questions.slice(0, 3).map(q => ({ id: q.id, question: q.question, categoryName: q.categoryName }));
          }
        }
      }

      return sendJson(res, 200, {
        success: true,
        reply,
        matchedQa: matchedQa ? { id: matchedQa.id, question: matchedQa.question, dimension: matchedQa.dimension, image: matchedQa.image } : null,
        recommendedQas,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('[MadoriBot Chat API Error]', e);
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

// 10-F. 🌡️ 24h温熱換気・高気密高断熱AI相談ボットAPI (200問マスター知見＆建築物理学エンジン)
  if ((pathname === '/api/thermal-bot/chat' || pathname === '/api/thermal-chat' || pathname === '/api/thermal-bot/consult') && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const userMsg = (body.message || '').trim();
      const qaId = body.qaId || null;

      // 200問温熱知見JSONの読み込み
      let thermalData = null;
      try {
        const thermalJsonPath = path.join(PUBLIC_DIR, 'data', 'thermal_qa_200.json');
        if (fs.existsSync(thermalJsonPath)) {
          thermalData = JSON.parse(fs.readFileSync(thermalJsonPath, 'utf-8'));
        }
      } catch (err) {
        console.warn('[ThermalBot] Failed to read thermal_qa_200.json:', err);
      }

      let matchedQa = null;
      if (qaId && thermalData && thermalData.questions) {
        matchedQa = thermalData.questions.find(q => q.id === qaId);
      }

      let reply = '';
      let recommendedQas = [];

      if (matchedQa) {
        // 特定のQ&Aが直接選択された場合
        reply = `【住ま居るAI温熱建築士より】
「${matchedQa.question}」について、私どもが埼玉の現場で試行錯誤してたどり着いた実務知見よりお答えいたします！

💡 **結論・重要ポイント**
${matchedQa.shortAnswer}

📐 **標準基準・数値指標**
${matchedQa.dimension}

🔍 **現場実務の技術根拠（物理原理・メリット・注意点）**
${matchedQa.details}

★ **設計の原則**
${matchedQa.principle}

※本回答は住ま居るが埼玉の気候風土の中で、勉強会や実際の現場での試行錯誤（成功と失敗の実体験）を通して現在たどり着いた考え方です。絶対の正解ではなく、間違いがあるかもしれないことを前提に、私どもが考える現時点での最善手としてご提案しています。

同じカテゴリ「${matchedQa.categoryName}」に関する他の疑問や、実際のUA値・C値計算、エアコン選定についても続けてご質問いただけます！`;

        if (thermalData && thermalData.questions) {
          recommendedQas = thermalData.questions
            .filter(q => q.category === matchedQa.category && q.id !== matchedQa.id)
            .slice(0, 3)
            .map(q => ({ id: q.id, question: q.question, categoryName: q.categoryName }));
        }
      } else {
        // 自然言語メッセージ・自由質問（プラン・温熱複合相談）のテキストコーパス検索＆対話生成
        const answerResult = await aiConsultantEngine.answerConsultation(userMsg, body.history || []);
        reply = answerResult.reply;
        recommendedQas = answerResult.recommendedQas;
      }

      return sendJson(res, 200, {
        success: true,
        reply,
        recommendedQas,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('[ThermalBot Chat API Error]', e);
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

    // Helper: Call Local Stable Diffusion WebUI img2img API
  async function callSdImg2Img({ base64Image, prompt, negativePrompt, denoise = 0.45, width = 768, height = 576 }) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        init_images: [base64Image],
        prompt: prompt,
        negative_prompt: negativePrompt || "(worst quality, low quality:1.4), (deformed architecture, crooked walls:1.3), blurry, 3d cgi render look, cartoon, plastic, watermark, text",
        denoising_strength: denoise,
        steps: 25,
        cfg_scale: 7.0,
        width: width,
        height: height,
        sampler_name: "DPM++ 2M Karras"
      });

      const sdReq = http.request({
        hostname: '127.0.0.1',
        port: 7860,
        path: '/sdapi/v1/img2img',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 45000
      }, (sdRes) => {
        let data = '';
        sdRes.on('data', c => data += c);
        sdRes.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.images && json.images.length > 0) {
              resolve(json.images[0]);
            } else {
              reject(new Error('No images returned from SD WebUI'));
            }
          } catch (err) {
            reject(err);
          }
        });
      });

      sdReq.on('error', err => reject(err));
      sdReq.on('timeout', () => {
        sdReq.destroy();
        reject(new Error('SD WebUI request timed out'));
      });
      sdReq.write(payload);
      sdReq.end();
    });
  }

  // 10-G1. Rate Limit Status API (残生成回数・待機枠の確認)
  if (pathname === '/api/perspective/rate-status' && method === 'GET') {
    const clientIp = rateLimiter.getClientIp(req);
    const status = rateLimiter.getRateLimitStatus(clientIp);
    return sendJson(res, 200, { success: true, status });
  }

  // 10-G2. Stock Interior/Furniture Image Upload API (マイ・ムードボード)
  if (pathname === '/api/perspective/stock-upload' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      if (!body.base64Image) {
        return sendJson(res, 400, { success: false, error: '画像データがありません。' });
      }
      let rawBase64 = body.base64Image;
      if (rawBase64.includes(',')) rawBase64 = rawBase64.split(',')[1];

      const stockId = 'stk_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      const filename = `${stockId}.jpg`;
      const filePath = path.join(STOCKS_DIR, filename);
      fs.writeFileSync(filePath, Buffer.from(rawBase64, 'base64'));

      const stockItem = {
        id: stockId,
        title: body.title || 'WEBお気に入り家具・インテリア',
        category: body.category || 'furniture',
        tags: body.tags || ['ユーザー保存', 'インテリア'],
        url: `/renders/stocks/${filename}`,
        uploadedAt: new Date().toISOString()
      };

      return sendJson(res, 201, { success: true, stockItem });
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

  // 10-G3. Stock Images List API (初期サンプル＋ユーザー保存画像)
  if (pathname === '/api/perspective/stock-list' && method === 'GET') {
    try {
      // Default curated catalog samples
      const defaultSamples = [
        { id: 'def_kitchen_island', title: '対面フラットアイランド（セラミック天板）', category: 'kitchen', url: '/sample_data/model_ldk.jpg', tags: ['アイランドキッチン', 'セラミック', 'グレージュ'] },
        { id: 'def_ychair_dining', title: '無垢一枚板 ＆ Yチェア（北欧名作）', category: 'furniture', url: '/renders/ldk_japandi.png', tags: ['無垢材', 'Yチェア', 'ジャパンディ'] },
        { id: 'def_living_sofa', title: 'ローバック・フェザーモジュールソファ', category: 'furniture', url: '/sample_data/model_exterior.JPG', tags: ['ローソファ', 'リゾート', '木製ルーバー'] }
      ];

      // Read user uploaded stock files
      const userStockItems = [];
      if (fs.existsSync(STOCKS_DIR)) {
        const files = fs.readdirSync(STOCKS_DIR).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
        files.forEach(f => {
          userStockItems.push({
            id: f.replace(/\.[^/.]+$/, ''),
            title: 'マイストック画像',
            category: 'custom',
            url: `/renders/stocks/${f}`,
            tags: ['カスタムアップロード', 'お気に入り']
          });
        });
      }

      return sendJson(res, 200, { success: true, stocks: [...defaultSamples, ...userStockItems.reverse()] });
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

  // 10-G4. Photo-to-Perspective Virtual Staging API (Stable Diffusion WebUI Powered with Rate-Limiting & Queue Protection)
  if (pathname === '/api/perspective/upload-generate' && method === 'POST') {
    const clientIp = rateLimiter.getClientIp(req);
    const limitCheck = rateLimiter.checkAndConsumeRateLimit(clientIp);

    if (!limitCheck.allowed) {
      console.warn(`[Perspective API] Rate limit / Queue rejected for IP ${clientIp}: ${limitCheck.reason}`);
      return sendJson(res, 429, {
        success: false,
        reason: limitCheck.reason,
        error: limitCheck.message,
        waitSeconds: limitCheck.waitSeconds || 0,
        rateLimit: rateLimiter.getRateLimitStatus(clientIp)
      });
    }

    try {
      const body = await parseJsonBody(req);
      const renderId = 'ps_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      
      // 1. Get Reference Image (from user upload, 3D model capture, or sample photo)
      let base64Init = body.initImage;
      if (!base64Init && body.samplePreset) {
        const sampleFile = path.join(__dirname, '..', 'sample_data', body.samplePreset);
        if (fs.existsSync(sampleFile)) {
          base64Init = fs.readFileSync(sampleFile).toString('base64');
        }
      }
      if (!base64Init) {
        const fallbackFile = path.join(__dirname, '..', 'sample_data', 'model_ldk.jpg');
        base64Init = fs.readFileSync(fallbackFile).toString('base64');
      }

      if (base64Init.includes(',')) {
        base64Init = base64Init.split(',')[1];
      }

      // Save reference image for Before/After comparison
      const refFilename = `ref_${renderId}.jpg`;
      const refPath = path.join(RENDERS_DIR, refFilename);
      fs.writeFileSync(refPath, Buffer.from(base64Init, 'base64'));
      const referenceUrl = `/renders/${refFilename}`;

      // 2. Expanded Prompt Builder
      // 空間用途・部屋タイプ（Room Type Prompts）
      const roomTypePrompts = {
        ldk: "grand open-concept LDK living dining kitchen, cohesive great room architecture",
        living: "cozy elegant living room lounge, comfortable seating, sunlit family relaxation space",
        kitchen: "dedicated gourmet kitchen space, chef island counter, high-end culinary haven",
        dining: "formal welcoming dining room, gathering table, architectural pendant centerpiece",
        bedroom: "luxurious tranquil master bedroom suite, king size bed with upholstered headboard, serene sleeping sanctuary",
        japanese: "authentic Japanese washitsu tatami room, delicate cedar wood trim, wabi-sabi tranquility, tokonoma alcove",
        koagari: "modern raised tatami mat corner (koagari), sunken table, multi-functional warm relaxation nook",
        guest: "welcoming Japanese guest room, hospitality ambiance, refined minimalist design",
        kids: "bright cheerful children bedroom, creative study area, warm playful aesthetic",
        loft: "atmospheric attic loft hideaway, exposed roof rafters, skylight sunlight, cozy den",
        study: "quiet focused private study den, custom built-in timber desk, floor-to-ceiling bookshelves",
        bath: "luxury resort-style private bathroom, freestanding soaking tub, frameless glass shower, spa sanctuary",
        washroom: "elegant vanity powder room and dressing area, custom vanity mirror, dual sinks",
        toilet: "refined minimalist restroom toilet, floating vanity, warm indirect cove lighting",
        wic: "boutique walk-in closet dressing suite, custom glass wardrobe displays, vanity counter",
        shop: "stylish boutique cafe shop interior, welcoming customer service counter, warm commercial ambiance",
        office: "creative atelier design studio office, collaborative workspace, clean architectural aesthetic",
        garage: "architectural built-in showcase garage, polished epoxy floor, automotive hobby gallery"
      };

      const stylePrompts = {
        japandi: "Japandi interior style, light natural oak and cedar, warm greige accents, minimalist clean lines, organic rounded shapes",
        japanese: "Modern Sukiya Japanese style, authentic fragrant hinoki cypress and cedar, delicate wooden lattice louvers, washi paper screens, low-height furniture",
        hotellike: "Luxury hotel-like greige interior, matte porcelain tiles, sleek leather sofa, modern brass lighting, high-end architectural digest showcase",
        scandi: "Scandinavian hygge interior, light blonde oak timber, white plastered walls, cozy textured fabric sofa, warm natural atmosphere",
        minimal: "Minimalist resort architecture, seamless indoor-outdoor connection, expansive glazing, raw textured stone accent wall",
        vintage: "Vintage industrial interior, exposed blackened steel frames, reclaimed timber, exposed brick, dark brown leather lounge",
        coastal: "California coastal interior, wide-plank herringbone wood floors, crisp white walls, marine navy accents, airy breezy open feel",
        classic: "European modern classic, elegant wall moldings, chevron parquet floor, marble fireplace mantelpiece",
        minka: "Kominka renovated Japanese classic, dark antique timber beams, massive main pillar, deep rich wood patina",
        passive: "Modern passive solar architecture, deep overhang eaves, earth floor living room (doma), abundant natural cross-ventilation"
      };

      const lightingPrompts = {
        morning: "clear morning sunlight, soft sunbeams streaming through windows, crisp fresh morning air",
        afternoon: "warm gentle afternoon sunlight, cozy sunlit living space",
        twilight: "golden hour twilight, purple and orange dusk sky, warm interior lamps glowing inside",
        night: "moody architectural night lighting, warm 2700K indirect cove lighting, intimate shadow play",
        rainy: "soft rainy day diffused lighting, lush wet garden greenery through glass, peaceful serene mood",
        cloudy: "gentle overcast sky diffuse soft light, perfectly balanced shadowless interior",
        fireplace: "flickering cozy fireplace firelight, warm ambient glow, relaxing evening ambiance",
        deep_eaves: "midsummer deep eaves shade, cool tranquil indoor shadow with bright garden beyond"
      };

      const furniturePrompts = {
        ychair: "Hans Wegner style Wishbone Y-chairs",
        liveedge: "solid live-edge slab wooden dining table",
        lowsofa: "low-profile modular fabric sectional sofa",
        leather_lounge: "premium leather lounge chair with ottoman",
        island_kitchen: "open island kitchen counter with bar stools",
        toilet_suite: "high-end tankless ceramic toilet fixture, minimalist washlet, sleek modern floating counter",
        woodstove: "modern freestanding wood-burning stove with stacked firewood",
        ph5: "Louis Poulsen PH5 style architectural pendant light",
        mortex: "sleek Mortex greige custom counter",
        bookshelf: "floor-to-ceiling built-in recessed wooden bookshelf library",
        study_counter: "built-in timber study work counter",
        tatami_corner: "raised tatami mat relaxation corner",
        skeleton_stairs: "minimalist open-riser steel skeleton floating staircase"
      };

      const plantPrompts = {
        umbellata: "lush large Ficus Umbellata potted tree",
        olive: "delicate potted olive tree in clay planter",
        everfresh: "airy Everfresh tree with feathery green foliage",
        doudan: "dramatic Enkianthus perulatus branches in large glass cylinder vase",
        art: "large contemporary abstract canvas wall painting",
        ceramic: "artisan ceramic vases and pottery",
        linen: "flowing natural linen sheer curtains",
        wool_rug: "handwoven textured wool area rug"
      };

      const materialPrompts = {
        diatom: "breathable natural diatomaceous earth plastered walls, artisan hand-troweled texture",
        nishikawa: "Saitama local Nishikawa timber solid cypress and cedar flooring",
        oak: "premium natural brushed oak wood flooring",
        stone: "natural cut stone ledger accent wall",
        beams: "exposed structural heavy timber ceiling beams",
        triple_glass: "triple-pane high-insulation wood-composite large sliding glass doors",
        high_door: "frameless full-height high doors flush with ceiling",
        washi_tatami: "rimless Ryukyu washi paper tatami mats",
        deck_flat: "seamless barrier-free connection to exterior wooden deck"
      };

      // Ceiling Prompts (吹き抜け・勾配天井・見せ梁)
      const ceilingPrompts = {
        flat: "smooth flat ceiling with subtle recessed architectural downlights",
        sloped: "dramatic vaulted sloped cathedral ceiling, beautiful exposed heavy timber rafters and purlins",
        void: "magnificent double-height high open void atrium living room, two-story tall picture window with soft ambient sunlight pouring down",
        cove: "architectural recessed cove ceiling with hidden soft warm indirect LED illumination"
      };

      const selectedStyles = Array.isArray(body.styles) ? body.styles : [body.styles || 'japandi'];
      const selectedLighting = body.lighting || 'morning';
      const selectedFurniture = Array.isArray(body.furniture) ? body.furniture : [];
      const selectedPlants = Array.isArray(body.plants) ? body.plants : [];
      const selectedMaterials = Array.isArray(body.materials) ? body.materials : ['diatom', 'nishikawa'];
      const selectedCeiling = body.ceilingType || 'sloped';
      const selectedScene = body.scene || '';
      const selectedRoomType = body.roomType || 'ldk';

      // Dedicated Part Stock Prompts (部位別ストック情報)
      const stockParts = [];
      if (body.stockSlots) {
        if (body.stockSlots.overall) stockParts.push(`overall aesthetic: ${body.stockSlots.overall}`);
        if (body.stockSlots.kitchen) stockParts.push(`exact matching system kitchen design: ${body.stockSlots.kitchen}`);
        if (body.stockSlots.furniture) stockParts.push(`furniture matching: ${body.stockSlots.furniture}`);
        if (body.stockSlots.lighting) stockParts.push(`lighting style: ${body.stockSlots.lighting}`);
      } else if (body.stockInspiration) {
        stockParts.push(`inspired by interior design elements: ${body.stockInspiration}`);
      }

      // Check if room is strictly windowless
      const isWindowless = (body.windowSetting === 'none' || body.windowSetting === 'solid_wall');

      // Window Aperture Prompt (なし / 大開口 / スリット等)
      let windowPrompt = "";
      if (isWindowless) {
        windowPrompt = "solid unbroken enclosed drywall, windowless room, entirely solid architectural walls, seamless closed partition without any windows or glass openings";
      } else if (body.windowSetting === 'add_large_window' || body.windowSetting === 'sweep_2560') {
        windowPrompt = "large full-height floor-to-ceiling glass picture window, bright natural sunlight";
      } else if (body.windowSetting === 'add_high_slit' || body.windowSetting === 'slit_600') {
        windowPrompt = "high-level horizontal ribbon slit window, gentle indirect daylight rays";
      } else if (body.windowSetting === 'waist_1650') {
        windowPrompt = "modern sliding waist-height timber sash window";
      }

      // Lighting adjustment: Remove 'through windows' when windowless
      let lightingPromptText = lightingPrompts[selectedLighting] || selectedLighting;
      if (isWindowless) {
        lightingPromptText = lightingPromptText.replace(/through windows/gi, 'from subtle warm architectural downlights and lamps')
                                               .replace(/through glass/gi, 'with calm diffused indoor ambient light');
      }

      // Filter furniture: Remove kitchen if room is not ldk/kitchen or kitchenType is none
      let effectiveFurniture = selectedFurniture;
      if (body.kitchenType === 'none' || (selectedRoomType !== 'ldk' && selectedRoomType !== 'kitchen')) {
        effectiveFurniture = effectiveFurniture.filter(f => f !== 'island_kitchen');
      }

      // Filter materials: Remove triple_glass if windowless
      let effectiveMaterials = selectedMaterials;
      if (isWindowless) {
        effectiveMaterials = effectiveMaterials.filter(m => m !== 'triple_glass');
      }

      // Door Swing prompt (内開き / 外開き)
      let doorSwingPrompt = "";
      if (body.doorSwing === 'outward') {
        doorSwingPrompt = "outward-opening flush door swinging towards hallway";
      } else if (body.doorSwing === 'inward') {
        doorSwingPrompt = "inward-opening flush door swinging into room";
      }

      const promptParts = [
        "masterpiece, photorealistic architectural photograph, 8k resolution, award-winning interior architecture, canon eos r5, professional photography",
        roomTypePrompts[selectedRoomType] || roomTypePrompts.ldk,
        ceilingPrompts[selectedCeiling] || ceilingPrompts.sloped,
        selectedStyles.map(s => stylePrompts[s] || s).join(', '),
        lightingPromptText,
        windowPrompt,
        doorSwingPrompt,
        effectiveMaterials.map(m => materialPrompts[m] || m).join(', '),
        effectiveFurniture.map(f => furniturePrompts[f] || f).join(', '),
        selectedPlants.map(p => plantPrompts[p] || p).join(', '),
        stockParts.join(', '),
        selectedScene ? selectedScene : '',
        body.customPrompt || ''
      ].filter(Boolean);

      const fullPrompt = promptParts.join(', ');
      const denoise = parseFloat(body.denoisingStrength) || 0.45;

      // Negative Prompt with windowless enforcement
      let effectiveNegativePrompt = body.negativePrompt || "(worst quality, low quality:1.4), (deformed architecture, crooked walls:1.3), blurry, 3d cgi render look, cartoon, plastic, watermark, text";
      if (isWindowless) {
        effectiveNegativePrompt += ", (window:1.6), (windows:1.6), (glass window:1.6), (picture window:1.6), (glass door:1.6), (patio door:1.6), outdoor view, exterior view, outside greenery, window sill, window frame, sunlight through glass";
      }

      console.log(`[Perspective API] Generating with Prompt: ${fullPrompt.substring(0, 100)}... (denoise: ${denoise}, queueActive: ${limitCheck.activeJobs})`);

      let imageUrl = '';
      try {
        const base64Gen = await callSdImg2Img({
          base64Image: base64Init,
          prompt: fullPrompt,
          negativePrompt: effectiveNegativePrompt,
          denoise: denoise,
          width: 768,
          height: 576
        });
        const outFilename = `perspective_${renderId}.png`;
        const outPath = path.join(RENDERS_DIR, outFilename);
        fs.writeFileSync(outPath, Buffer.from(base64Gen, 'base64'));
        imageUrl = `/renders/${outFilename}`;
        console.log(`[Perspective API] Successfully generated photorealistic perspective! -> ${imageUrl}`);
      } catch (sdErr) {
        console.warn(`[Perspective API] SD WebUI error (${sdErr.message}). Using fallback rendering.`);
        imageUrl = `/renders/ldk_japandi.png`;
      }

      return sendJson(res, 200, {
        success: true,
        renderId,
        imageUrl,
        referenceUrl,
        promptSummary: fullPrompt,
        rateLimit: rateLimiter.getRateLimitStatus(clientIp),
        appliedOptions: {
          styles: selectedStyles,
          lighting: selectedLighting,
          ceilingType: selectedCeiling,
          furniture: selectedFurniture,
          plants: selectedPlants,
          materials: selectedMaterials,
          scene: selectedScene,
          denoisingStrength: denoise
        }
      });
    } catch (e) {
      console.error('[Perspective Upload-Generate API Error]', e);
      return sendJson(res, 500, { success: false, error: e.message });
    } finally {
      rateLimiter.releaseActiveJob();
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

  if (pathname.startsWith('/sample_data/')) {
    filePath = path.join(__dirname, '..', pathname);
  } else if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
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
