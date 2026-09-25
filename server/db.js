const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dbPath = path.join(__dirname, 'sumaile.db');
const db = new DatabaseSync(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    prompt TEXT,
    negative_prompt TEXT,
    style TEXT,
    status TEXT DEFAULT 'queued',
    position INTEGER DEFAULT 1,
    image_url TEXT,
    error TEXT,
    created_at TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    magic_token TEXT,
    crm_synced INTEGER DEFAULT 0,
    crm_synced_at TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    filename TEXT,
    filesize INTEGER,
    filetype TEXT,
    uploaded_by TEXT,
    url TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    sender TEXT,
    text TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS modelhouse_bookings (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT,
    phone TEXT,
    email TEXT,
    preferred_date TEXT,
    preferred_time TEXT,
    comments TEXT,
    status TEXT DEFAULT 'confirmed',
    created_at TEXT
  );

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

// Helper Functions
function generateId() {
  return 'id_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
}

// User DAO
function createUser({ name, email, phone }) {
  const existing = db.prepare(`SELECT * FROM users WHERE email = ? OR phone = ?`).get(email, phone);
  if (existing) {
    const magicToken = 'tok_' + Math.random().toString(36).substring(2, 15);
    db.prepare(`UPDATE users SET magic_token = ? WHERE id = ?`).run(magicToken, existing.id);
    return { ...existing, magic_token: magicToken };
  }
  const id = generateId();
  const magicToken = 'tok_' + Math.random().toString(36).substring(2, 15);
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, name, email, phone, magic_token, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, email, phone, magicToken, createdAt);
  
  // Create initial demo message for new user
  addMessage({
    userId: id,
    sender: 'ai',
    text: `ご登録ありがとうございます！株式会社住ま居る 建築AIエージェントです。\nご希望の耐震・温熱計算書（PDF）やプランのアップロード・相談、AIパース生成履歴の保存がこのマイページで自由に行えます。`
  });

  // Add initial sample architect PDF calculation file
  addFile({
    userId: id,
    filename: '許容応力度計算書_耐震等級3_確認結果.pdf',
    filesize: 2450120,
    filetype: 'application/pdf',
    uploaded_by: 'チーフ建築士 (人間)',
    url: '/downloads/sample_calculation.pdf'
  });

  return { id, name, email, phone, magic_token: magicToken, created_at: createdAt };
}

function getUserByToken(token) {
  return db.prepare(`SELECT * FROM users WHERE magic_token = ?`).get(token);
}

function getUserById(id) {
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
}

function getAllUsers() {
  return db.prepare(`SELECT * FROM users ORDER BY created_at DESC`).all();
}

function markCrmSynced(userId) {
  const now = new Date().toISOString();
  db.prepare(`UPDATE users SET crm_synced = 1, crm_synced_at = ? WHERE id = ?`).run(now, userId);
  return getUserById(userId);
}

// Job DAO
function createJob({ userId, prompt, negativePrompt, style }) {
  const id = generateId();
  const createdAt = new Date().toISOString();
  
  const pendingCount = db.prepare(`SELECT COUNT(*) as cnt FROM jobs WHERE status IN ('queued', 'processing')`).get();
  const position = (pendingCount ? pendingCount.cnt : 0) + 1;

  db.prepare(`
    INSERT INTO jobs (id, user_id, prompt, negative_prompt, style, status, position, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'queued', ?, ?, ?)
  `).run(id, userId || 'guest', prompt, negativePrompt || '', style || 'modern', position, createdAt, createdAt);

  return getJobById(id);
}

function getJobById(id) {
  const job = db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(id);
  if (job && job.status === 'queued') {
    const ahead = db.prepare(`SELECT COUNT(*) as cnt FROM jobs WHERE status IN ('queued', 'processing') AND created_at < ?`).get(job.created_at);
    job.position = (ahead ? ahead.cnt : 0) + 1;
  }
  return job;
}

function getNextQueuedJob() {
  return db.prepare(`SELECT * FROM jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1`).get();
}

function updateJobStatus(id, status, imageUrl = null, error = null) {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE jobs
    SET status = ?, image_url = ?, error = ?, updated_at = ?
    WHERE id = ?
  `).run(status, imageUrl, error, now, id);
  return getJobById(id);
}

function getUserJobs(userId) {
  return db.prepare(`SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC`).all(userId);
}

function getAllJobs() {
  return db.prepare(`SELECT * FROM jobs ORDER BY created_at DESC LIMIT 50`).all();
}

// Files & Messages DAO
function addFile({ userId, filename, filesize, filetype, uploadedBy, url }) {
  const id = generateId();
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO files (id, user_id, filename, filesize, filetype, uploaded_by, url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, filename, filesize, filetype, uploadedBy || 'お施主様', url, createdAt);
  return { id, userId, filename, filesize, filetype, uploadedBy, url, createdAt };
}

function getUserFiles(userId) {
  return db.prepare(`SELECT * FROM files WHERE user_id = ? ORDER BY created_at DESC`).all(userId);
}

function addMessage({ userId, sender, text }) {
  const id = generateId();
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO messages (id, user_id, sender, text, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, sender, text, createdAt);
  return { id, userId, sender, text, createdAt };
}

function getUserMessages(userId) {
  return db.prepare(`SELECT * FROM messages WHERE user_id = ? ORDER BY created_at ASC`).all(userId);
}

// Modelhouse Booking DAO
function createBooking({ userId, name, phone, email, preferredDate, preferredTime, comments }) {
  const id = generateId();
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO modelhouse_bookings (id, user_id, name, phone, email, preferred_date, preferred_time, comments, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)
  `).run(id, userId || 'guest', name, phone, email, preferredDate, preferredTime, comments || '', createdAt);
  return { id, userId, name, phone, email, preferredDate, preferredTime, comments, status: 'confirmed', createdAt };
}

function getUserBookings(userId) {
  return db.prepare(`SELECT * FROM modelhouse_bookings WHERE user_id = ? ORDER BY created_at DESC`).all(userId);
}

// Floor Plans DAO (Catalog & AI Matching Engine)
function searchFloorPlans({ stories, minTsubo, maxTsubo, targetFamily, features = [], limit = 4 }) {
  const all = db.prepare(`SELECT * FROM floor_plans`).all();

  // Score each plan
  const scored = all.map(plan => {
    let score = 0;
    const reasons = [];

    // 1. Stories match
    if (stories) {
      const s = parseInt(stories, 10);
      if (plan.stories === s) {
        score += 50;
        reasons.push(s === 1 ? '人気のワンフロア「平屋」設計' : '空間を有効活用する「2階建て」設計');
      } else {
        score -= 40; // mismatch penalty
      }
    }

    // 2. Tsubo proximity
    const minT = minTsubo ? parseFloat(minTsubo) : 20;
    const maxT = maxTsubo ? parseFloat(maxTsubo) : 45;
    if (plan.tsubo >= minT && plan.tsubo <= maxT) {
      score += 30;
      reasons.push(`ご希望の広さ（${plan.tsubo}坪 / ${plan.area_sqm}㎡）にジャストフィット`);
    } else {
      const diff = Math.min(Math.abs(plan.tsubo - minT), Math.abs(plan.tsubo - maxT));
      score += Math.max(0, 20 - diff * 2);
    }

    // 3. Target Family match
    if (targetFamily && plan.target_family.includes(targetFamily)) {
      score += 25;
      reasons.push(`「${targetFamily}」のライフスタイルに最適化された間取り`);
    }

    // 4. Features match
    let planFeatures = [];
    try {
      planFeatures = JSON.parse(plan.features || '[]');
    } catch {
      planFeatures = [];
    }

    if (Array.isArray(features) && features.length > 0) {
      let matchedCount = 0;
      features.forEach(f => {
        if (planFeatures.some(pf => pf.includes(f) || f.includes(pf))) {
          matchedCount++;
          score += 15;
        }
      });
      if (matchedCount > 0) {
        reasons.push(`こだわり条件（${features.slice(0, 2).join('・')}など）を反映`);
      }
    }

    return {
      ...plan,
      features: planFeatures,
      matchScore: Math.min(99, Math.max(70, Math.round(score))),
      matchReason: reasons.slice(0, 3).join('／')
    };
  });

  // Sort by score descending
  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored.slice(0, limit);
}

function getFloorPlanById(id) {
  const plan = db.prepare(`SELECT * FROM floor_plans WHERE id = ?`).get(id);
  if (!plan) return null;
  try {
    plan.features = JSON.parse(plan.features || '[]');
  } catch {
    plan.features = [];
  }
  return plan;
}

function getAllFloorPlans(limit = 100) {
  const plans = db.prepare(`SELECT * FROM floor_plans ORDER BY created_at DESC LIMIT ?`).all(limit);
  return plans.map(p => {
    try {
      p.features = JSON.parse(p.features || '[]');
    } catch {
      p.features = [];
    }
    return p;
  });
}

function importFloorPlan({ id, title, stories, areaSqm, tsubo, rooms, targetFamily, entranceDirection, features, description, roomsSummary, svg1F, svg2F, source }) {
  const planId = id || ('fp_' + Math.random().toString(36).substring(2, 9));
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO floor_plans (
      id, title, stories, area_sqm, tsubo, rooms, target_family,
      entrance_direction, features, description, rooms_summary,
      svg_1f, svg_2f, source, scale_normalized, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(
    planId,
    title,
    parseInt(stories, 10),
    parseFloat(areaSqm),
    parseFloat(tsubo),
    rooms,
    targetFamily || '子育て3〜4人',
    entranceDirection || '南入り',
    JSON.stringify(features || []),
    description || '',
    roomsSummary || '',
    svg1F,
    svg2F || null,
    source || '外部取込（正規化済）',
    createdAt
  );
  return getFloorPlanById(planId);
}

module.exports = {
  db,
  createUser,
  getUserByToken,
  getUserById,
  getAllUsers,
  markCrmSynced,
  createJob,
  getJobById,
  getNextQueuedJob,
  updateJobStatus,
  getUserJobs,
  getAllJobs,
  addFile,
  getUserFiles,
  addMessage,
  getUserMessages,
  createBooking,
  getUserBookings,
  searchFloorPlans,
  getFloorPlanById,
  getAllFloorPlans,
  importFloorPlan
};

