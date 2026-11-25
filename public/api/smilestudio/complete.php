<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ss_json_response(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

ss_require_agent_auth();
ss_ensure_dirs();

$raw = file_get_contents('php://input');
$body = json_decode($raw ?: '', true);
if (!is_array($body)) {
    ss_json_response(['ok' => false, 'error' => 'Invalid JSON payload.'], 400);
}

$jobId = trim((string)($body['jobId'] ?? ''));
if (!ss_is_valid_id($jobId)) {
    ss_json_response(['ok' => false, 'error' => 'Invalid jobId.'], 400);
}

$jobPath = SMILESTUDIO_JOBS_DIR . '/' . $jobId . '.json';
$job = ss_read_json_file($jobPath);
if (!$job) {
    ss_json_response(['ok' => false, 'error' => 'Job not found.'], 404);
}

$action = strtolower(trim((string)($body['action'] ?? 'complete')));
$now = time();

if ($action === 'requeue') {
    // OOM 検知時の安全なバックオフ差し戻し
    $retries = ((int)($job['retryCount'] ?? 0)) + 1;
    $job['retryCount'] = $retries;
    $job['updatedAt'] = $now;
    $job['lastError'] = (string)($body['error'] ?? 'Requeued by agent');
    if ($retries > SMILESTUDIO_MAX_RETRIES) {
        $job['status'] = 'failed';
        $job['error'] = '生成サーバーが一時的に混雑・メモリ不足のため完了できませんでした。少し時間をおいて再度お試しください。';
    } else {
        $job['status'] = 'queued';
        $job['startedAt'] = null;
    }
    ss_write_json_atomic($jobPath, $job);
    ss_json_response(['ok' => true, 'jobId' => $jobId, 'status' => $job['status'], 'retryCount' => $retries]);
}

if ($action === 'fail') {
    $job['status'] = 'failed';
    $job['error'] = (string)($body['error'] ?? '生成中にエラーが発生しました。');
    $job['updatedAt'] = $now;
    ss_write_json_atomic($jobPath, $job);
    ss_json_response(['ok' => true, 'jobId' => $jobId, 'status' => 'failed']);
}

// complete: 生成結果画像を推測不能なランダムIDで保存
$imgB64 = (string)($body['imageBase64'] ?? '');
$ext = strtolower(trim((string)($body['imageExt'] ?? 'png')));
if (!in_array($ext, ['png', 'jpg', 'webp'], true)) {
    $ext = 'png';
}
$bin = base64_decode($imgB64, true);
if ($bin === false || strlen($bin) === 0) {
    ss_json_response(['ok' => false, 'error' => 'Invalid imageBase64.'], 400);
}

// 連番禁止：暗号学的ランダム32文字ファイル名（Muse指摘反映）
$outName = 'out_' . ss_random_id(16) . '.' . $ext;
$outPath = SMILESTUDIO_OUTPUTS_DIR . '/' . $outName;
if (@file_put_contents($outPath, $bin, LOCK_EX) === false) {
    ss_json_response(['ok' => false, 'error' => 'Failed to save output image.'], 500);
}

$job['status'] = 'completed';
$job['outputFile'] = $outName;
$job['outputUrl'] = '/api/smilestudio/queue/outputs/' . $outName;
$job['elapsedSec'] = isset($body['elapsedSec']) ? (float)$body['elapsedSec'] : null;
$job['completedAt'] = $now;
$job['updatedAt'] = $now;
$job['error'] = null;
ss_write_json_atomic($jobPath, $job);

ss_json_response([
    'ok' => true,
    'jobId' => $jobId,
    'status' => 'completed',
    'outputUrl' => $job['outputUrl'],
]);
