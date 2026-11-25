<?php
declare(strict_types=1);

/**
 * SmileStudio AI工房 ジョブキュー API 共通設定
 * XServer (t-smile.co.jp) 上の JSON 永続キュー基盤
 */

define('SMILESTUDIO_QUEUE_ROOT', __DIR__ . '/queue');
define('SMILESTUDIO_JOBS_DIR', SMILESTUDIO_QUEUE_ROOT . '/jobs');
define('SMILESTUDIO_INPUTS_DIR', SMILESTUDIO_QUEUE_ROOT . '/inputs');
define('SMILESTUDIO_OUTPUTS_DIR', SMILESTUDIO_QUEUE_ROOT . '/outputs');
define('SMILESTUDIO_QUOTAS_DIR', SMILESTUDIO_QUEUE_ROOT . '/quotas');

// クォータ・優先度設定（Phase 1 確定仕様）
define('SMILESTUDIO_GUEST_DAILY_LIMIT', 3);
define('SMILESTUDIO_REGISTERED_DAILY_LIMIT', 15);
define('SMILESTUDIO_GUEST_PRIORITY', 10);
define('SMILESTUDIO_REGISTERED_PRIORITY', 1);

// 10分以上 processing のまま止まったジョブを自動復旧（Precision 3680 週2回再起動対策）
define('SMILESTUDIO_STALE_TIMEOUT_SEC', 600);
define('SMILESTUDIO_MAX_RETRIES', 3);

// 秘密トークン読込（secret.php は .gitignore 対象・サーバー側個別配置）
$secretFile = __DIR__ . '/secret.php';
if (file_exists($secretFile)) {
    require_once $secretFile;
}
if (!defined('SMILESTUDIO_AGENT_SECRET')) {
    define('SMILESTUDIO_AGENT_SECRET', getenv('SMILESTUDIO_AGENT_SECRET') ?: '');
}

function ss_ensure_dirs(): void {
    foreach ([SMILESTUDIO_JOBS_DIR, SMILESTUDIO_INPUTS_DIR, SMILESTUDIO_OUTPUTS_DIR, SMILESTUDIO_QUOTAS_DIR] as $d) {
        if (!is_dir($d)) {
            @mkdir($d, 0755, true);
        }
    }
}

function ss_json_response(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function ss_random_id(int $bytes = 16): string {
    return bin2hex(random_bytes($bytes));
}

function ss_is_valid_id(string $id): bool {
    return (bool)preg_match('/^[a-f0-9]{16,64}$/', $id);
}

function ss_require_agent_auth(): void {
    if (SMILESTUDIO_AGENT_SECRET === '') {
        ss_json_response(['ok' => false, 'error' => 'Agent secret is not configured on server.'], 500);
    }
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) {
        ss_json_response(['ok' => false, 'error' => 'Unauthorized: Bearer token required.'], 401);
    }
    if (!hash_equals(SMILESTUDIO_AGENT_SECRET, trim($m[1]))) {
        ss_json_response(['ok' => false, 'error' => 'Forbidden: Invalid token.'], 403);
    }
}

function ss_read_json_file(string $path): ?array {
    if (!file_exists($path)) return null;
    $raw = @file_get_contents($path);
    if ($raw === false) return null;
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

function ss_write_json_atomic(string $path, array $data): bool {
    $tmp = $path . '.tmp.' . getmypid() . '.' . mt_rand(1000, 9999);
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($json === false) return false;
    if (@file_put_contents($tmp, $json, LOCK_EX) === false) return false;
    return @rename($tmp, $path);
}

function ss_client_ip_hash(): string {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    return hash('sha256', 'smilestudio_ip_' . $ip);
}

function ss_quota_key(string $tier, string $carteId, string $clientId): string {
    if ($tier === 'registered' && $carteId !== '') {
        return 'reg_' . hash('sha256', $carteId);
    }
    $cid = preg_replace('/[^a-zA-Z0-9_\-]/', '', $clientId);
    return 'guest_' . hash('sha256', ss_client_ip_hash() . '_' . $cid);
}

function ss_get_daily_quota_usage(string $quotaKey): int {
    ss_ensure_dirs();
    $file = SMILESTUDIO_QUOTAS_DIR . '/' . date('Y-m-d') . '.json';
    $data = ss_read_json_file($file) ?? [];
    return (int)($data[$quotaKey] ?? 0);
}

function ss_increment_daily_quota(string $quotaKey): int {
    ss_ensure_dirs();
    $file = SMILESTUDIO_QUOTAS_DIR . '/' . date('Y-m-d') . '.json';
    $fp = @fopen($file, 'c+');
    if (!$fp) return 1;
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $data = json_decode($raw ?: '{}', true);
    if (!is_array($data)) $data = [];
    $next = ((int)($data[$quotaKey] ?? 0)) + 1;
    $data[$quotaKey] = $next;
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    return $next;
}

function ss_reclaim_stale_jobs(): void {
    ss_ensure_dirs();
    $now = time();
    foreach (glob(SMILESTUDIO_JOBS_DIR . '/*.json') ?: [] as $file) {
        $job = ss_read_json_file($file);
        if (!$job || ($job['status'] ?? '') !== 'processing') continue;
        $startedAt = (int)($job['startedAt'] ?? 0);
        if ($startedAt > 0 && ($now - $startedAt) >= SMILESTUDIO_STALE_TIMEOUT_SEC) {
            $retries = ((int)($job['retryCount'] ?? 0)) + 1;
            $job['retryCount'] = $retries;
            if ($retries > SMILESTUDIO_MAX_RETRIES) {
                $job['status'] = 'failed';
                $job['error'] = '生成サーバーの応答タイムアウトが続いたため中断しました。時間をおいて再度お試しください。';
                $job['updatedAt'] = $now;
            } else {
                $job['status'] = 'queued';
                $job['startedAt'] = null;
                $job['updatedAt'] = $now;
                $job['lastError'] = 'Reclaimed stale processing job after timeout';
            }
            ss_write_json_atomic($file, $job);
        }
    }
}

function ss_list_queued_jobs_sorted(): array {
    ss_ensure_dirs();
    $list = [];
    foreach (glob(SMILESTUDIO_JOBS_DIR . '/*.json') ?: [] as $file) {
        $job = ss_read_json_file($file);
        if ($job && ($job['status'] ?? '') === 'queued') {
            $list[] = $job;
        }
    }
    usort($list, static function(array $a, array $b): int {
        $pa = (int)($a['priority'] ?? 10);
        $pb = (int)($b['priority'] ?? 10);
        if ($pa !== $pb) return $pa <=> $pb;
        return ((int)($a['createdAt'] ?? 0)) <=> ((int)($b['createdAt'] ?? 0));
    });
    return $list;
}

function ss_decode_data_url(string $dataUrl, int $maxBytes = 8388608): ?array {
    if (!preg_match('/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/s', $dataUrl, $m)) {
        return null;
    }
    $mime = strtolower($m[1]);
    $bin = base64_decode($m[2], true);
    if ($bin === false || strlen($bin) === 0 || strlen($bin) > $maxBytes) {
        return null;
    }
    $ext = ($mime === 'image/png') ? 'png' : (($mime === 'image/webp') ? 'webp' : 'jpg');
    return ['mime' => $mime, 'ext' => $ext, 'bytes' => $bin];
}
