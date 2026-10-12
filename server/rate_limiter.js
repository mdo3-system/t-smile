// ========================================================
// Rate Limiter & Anti-DoS Queue Protector for Stable Diffusion
// ユーザー生成限度・待機キュー上限・連打攻撃防御マネージャー
// ========================================================

const MAX_HOURLY_PER_CLIENT = 6;      // 1時間あたり最大6回
const MAX_DAILY_PER_CLIENT = 18;      // 1日あたり最大18回
const COOLDOWN_SECONDS = 12;          // 連続リクエストの間隔（12秒クールダウン）
const MAX_CONCURRENT_QUEUE = 3;       // 最大待機可能ジョブ数（超過時は429即時返却）

// In-memory request tracker: ip -> { hourlyCount, dailyCount, lastRequestTime, resetHour, resetDay }
const clientUsageMap = new Map();

// Active processing jobs counter
let currentActiveJobs = 0;

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket ? (req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';
}

function checkAndConsumeRateLimit(clientIp) {
  const now = Date.now();
  let client = clientUsageMap.get(clientIp);

  if (!client) {
    client = {
      hourlyCount: 0,
      dailyCount: 0,
      lastRequestTime: 0,
      hourExpires: now + 3600 * 1000,
      dayExpires: now + 24 * 3600 * 1000
    };
    clientUsageMap.set(clientIp, client);
  }

  // Reset hourly window
  if (now > client.hourExpires) {
    client.hourlyCount = 0;
    client.hourExpires = now + 3600 * 1000;
  }

  // Reset daily window
  if (now > client.dayExpires) {
    client.dailyCount = 0;
    client.dayExpires = now + 24 * 3600 * 1000;
  }

  // 1. Check Anti-DoS Queue Capacity Cap
  if (currentActiveJobs >= MAX_CONCURRENT_QUEUE) {
    return {
      allowed: false,
      reason: 'QUEUE_FULL',
      message: `現在GPUレンダリングサーバーが満杯（最大待機枠 ${MAX_CONCURRENT_QUEUE}件）です。前の生成が完了するまで少々お待ちください。`,
      activeJobs: currentActiveJobs,
      maxConcurrent: MAX_CONCURRENT_QUEUE
    };
  }

  // 2. Check Cooldown Interval (連打防止)
  const timeSinceLast = (now - client.lastRequestTime) / 1000;
  if (timeSinceLast < COOLDOWN_SECONDS) {
    const waitRemaining = Math.ceil(COOLDOWN_SECONDS - timeSinceLast);
    return {
      allowed: false,
      reason: 'COOLDOWN',
      message: `連続リクエスト防止のため、あと ${waitRemaining} 秒お待ちください。`,
      waitSeconds: waitRemaining
    };
  }

  // 3. Check Hourly Cap
  if (client.hourlyCount >= MAX_HOURLY_PER_CLIENT) {
    const minsLeft = Math.ceil((client.hourExpires - now) / 60000);
    return {
      allowed: false,
      reason: 'HOURLY_LIMIT_EXCEEDED',
      message: `1時間あたりの生成上限（${MAX_HOURLY_PER_CLIENT}回）に達しました。あと約${minsLeft}分後に再試行できます。`,
      remainingHourly: 0,
      resetMinutes: minsLeft
    };
  }

  // 4. Check Daily Cap
  if (client.dailyCount >= MAX_DAILY_PER_CLIENT) {
    return {
      allowed: false,
      reason: 'DAILY_LIMIT_EXCEEDED',
      message: `1日の生成上限（${MAX_DAILY_PER_CLIENT}回）に達しました。明日以降に再度お試しください。`,
      remainingDaily: 0
    };
  }

  // Allow and consume
  client.hourlyCount++;
  client.dailyCount++;
  client.lastRequestTime = now;
  currentActiveJobs++;

  return {
    allowed: true,
    remainingHourly: MAX_HOURLY_PER_CLIENT - client.hourlyCount,
    remainingDaily: MAX_DAILY_PER_CLIENT - client.dailyCount,
    activeJobs: currentActiveJobs,
    maxConcurrent: MAX_CONCURRENT_QUEUE
  };
}

function releaseActiveJob() {
  if (currentActiveJobs > 0) {
    currentActiveJobs--;
  }
}

function getRateLimitStatus(clientIp) {
  const now = Date.now();
  const client = clientUsageMap.get(clientIp);

  let hourly = 0;
  let daily = 0;
  if (client) {
    if (now <= client.hourExpires) hourly = client.hourlyCount;
    if (now <= client.dayExpires) daily = client.dailyCount;
  }

  return {
    remainingHourly: Math.max(0, MAX_HOURLY_PER_CLIENT - hourly),
    maxHourly: MAX_HOURLY_PER_CLIENT,
    remainingDaily: Math.max(0, MAX_DAILY_PER_CLIENT - daily),
    maxDaily: MAX_DAILY_PER_CLIENT,
    activeJobs: currentActiveJobs,
    maxConcurrent: MAX_CONCURRENT_QUEUE
  };
}

module.exports = {
  getClientIp,
  checkAndConsumeRateLimit,
  releaseActiveJob,
  getRateLimitStatus,
  MAX_HOURLY_PER_CLIENT,
  MAX_DAILY_PER_CLIENT,
  MAX_CONCURRENT_QUEUE
};
