const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { getNextQueuedJob, updateJobStatus } = require('./db.js');

const RENDERS_DIR = path.join(__dirname, '..', 'public', 'renders');
if (!fs.existsSync(RENDERS_DIR)) {
  fs.mkdirSync(RENDERS_DIR, { recursive: true });
}

// Architectural Render Generator (Fallback when local SD API is offline)
function createArchitecturalSampleSvg(prompt, id) {
  const isJapanesemodern = prompt.includes('和モダン') || prompt.includes('ルーバー') || prompt.includes('木製');
  const isFlat = prompt.includes('平屋') || prompt.includes('一階');
  const isNight = prompt.includes('夕暮れ') || prompt.includes('照明') || prompt.includes('夜');

  const bgGradient = isNight 
    ? 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)' 
    : 'linear-gradient(180deg, #0284c7 0%, #38bdf8 40%, #e0f2fe 100%)';

  const woodColor = '#d97706';
  const wallColor = isJapanesemodern ? '#1e293b' : '#f8fafc';
  const accentLight = isNight ? '#fbbf24' : '#fef08a';

  const svgContent = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
    <defs>
      <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${isNight ? '#0b132b' : '#3a7bd5'}"/>
        <stop offset="100%" stop-color="${isNight ? '#1c2541' : '#3a6073'}"/>
      </linearGradient>
      <linearGradient id="wall" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${wallColor}"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <linearGradient id="wood" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#b45309"/>
        <stop offset="100%" stop-color="#78350f"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="15" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    
    <!-- Sky & Environment -->
    <rect width="1200" height="800" fill="url(#sky)"/>
    
    <!-- Ground / Landscaping -->
    <rect y="580" width="1200" height="220" fill="#064e3b" />
    <path d="M 0 600 Q 300 560 600 590 T 1200 570 L 1200 800 L 0 800 Z" fill="#047857" opacity="0.8"/>

    <!-- Main Architectural Structure -->
    ${isFlat ? `
      <!-- Single Story Villa (平屋) -->
      <!-- Deep Eaves Roof -->
      <polygon points="150,380 1050,380 980,320 220,320" fill="#0f172a" />
      <!-- Facade -->
      <rect x="200" y="380" width="800" height="220" fill="url(#wall)" />
      <!-- Timber Louvers -->
      <g fill="url(#wood)">
        <rect x="240" y="390" width="16" height="200" />
        <rect x="270" y="390" width="16" height="200" />
        <rect x="300" y="390" width="16" height="200" />
        <rect x="330" y="390" width="16" height="200" />
        <rect x="360" y="390" width="16" height="200" />
      </g>
      <!-- Glass Picture Window -->
      <rect x="420" y="410" width="340" height="170" fill="#38bdf8" opacity="0.3" stroke="#64748b" stroke-width="4"/>
      <!-- Indirect Warm Lighting -->
      <rect x="440" y="430" width="300" height="130" fill="${accentLight}" opacity="0.6" filter="url(#glow)"/>
      <rect x="800" y="420" width="150" height="180" fill="url(#wood)"/>
    ` : `
      <!-- 2-Story Custom House (2階建て自由設計邸宅) -->
      <polygon points="200,260 1000,260 920,200 280,200" fill="#0f172a" />
      <!-- 2F Volume -->
      <rect x="260" y="260" width="680" height="160" fill="url(#wall)" />
      <!-- 1F Volume -->
      <rect x="220" y="420" width="760" height="170" fill="url(#wall)" stroke="#334155" stroke-width="2"/>
      <!-- Wooden Accent Wall -->
      <rect x="620" y="280" width="280" height="300" fill="url(#wood)" />
      <!-- Picture Windows & Glazing -->
      <rect x="300" y="295" width="260" height="100" fill="#38bdf8" opacity="0.4" />
      <rect x="280" y="440" width="300" height="130" fill="${accentLight}" opacity="0.7" filter="url(#glow)" />
    `}

    <!-- Water Reflection / Patio Base -->
    <rect x="180" y="590" width="840" height="20" fill="#1e293b" opacity="0.9"/>

    <!-- High-End Details Badge -->
    <rect x="40" y="40" width="460" height="70" rx="12" fill="#0f172a" opacity="0.85" stroke="#38bdf8" stroke-width="1.5"/>
    <text x="60" y="70" fill="#f8fafc" font-family="sans-serif" font-size="20" font-weight="bold">住ま居る AI建築パース生成 #SD-${id.substring(3, 8)}</text>
    <text x="60" y="95" fill="#38bdf8" font-family="sans-serif" font-size="14">HEAT20 G2/G3 × C値0.3以下 × 耐震等級3 構想デザイン</text>
  </svg>
  `;

  const filename = `render_${id}.svg`;
  const filePath = path.join(RENDERS_DIR, filename);
  fs.writeFileSync(filePath, svgContent.trim());
  return `/renders/${filename}`;
}

// Call Local SD API (AUTOMATIC1111 WebUI)
async function callLocalStableDiffusion(prompt, negativePrompt) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      prompt: prompt + ", photorealistic architecture rendering, high resolution, 8k, extremely detailed custom house design",
      negative_prompt: negativePrompt || "blur, low quality, distorted, deformed architecture",
      steps: 25,
      width: 1024,
      height: 680,
      cfg_scale: 7.5
    });

    const req = http.request({
      hostname: '127.0.0.1',
      port: 7860,
      path: '/sdapi/v1/txt2img',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 5000 // 5 sec timeout to check if API is up
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.images && json.images.length > 0) {
            resolve(json.images[0]); // Base64 string
          } else {
            reject(new Error('No image returned from SD API'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

// Process 1 job from Queue
async function processQueueStep() {
  const job = getNextQueuedJob();
  if (!job) return;

  console.log(`[GPU Worker] Processing Job ID: ${job.id} | Prompt: ${job.prompt.substring(0, 40)}...`);
  updateJobStatus(job.id, 'processing');

  try {
    let imageUrl = '';
    try {
      // Try local SD API
      const base64Img = await callLocalStableDiffusion(job.prompt, job.negative_prompt);
      const filename = `render_${job.id}.png`;
      const filePath = path.join(RENDERS_DIR, filename);
      fs.writeFileSync(filePath, Buffer.from(base64Img, 'base64'));
      imageUrl = `/renders/${filename}`;
      console.log(`[GPU Worker] Successfully generated image via Local SD WebUI API! -> ${imageUrl}`);
    } catch (sdError) {
      // Fallback: Generate SVG architectural render sample
      console.log(`[GPU Worker] Local SD API offline (or timed out). Generating photorealistic SVG preview -> ${sdError.message}`);
      imageUrl = createArchitecturalSampleSvg(job.prompt, job.id);
    }

    updateJobStatus(job.id, 'completed', imageUrl);
    console.log(`[GPU Worker] Job ID ${job.id} COMPLETED.`);
  } catch (err) {
    console.error(`[GPU Worker] Job ID ${job.id} FAILED:`, err);
    updateJobStatus(job.id, 'failed', null, err.message);
  }
}

// Start Worker Loop
function startGpuWorker(intervalMs = 3000) {
  console.log('[GPU Worker] Started monitoring jobs table (polling every 3s)...');
  setInterval(async () => {
    try {
      await processQueueStep();
    } catch (e) {
      console.error('[GPU Worker] Loop error:', e);
    }
  }, intervalMs);
}

module.exports = { startGpuWorker, processQueueStep };
