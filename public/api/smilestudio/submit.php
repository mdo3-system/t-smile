<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ss_json_response(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

ss_ensure_dirs();
ss_reclaim_stale_jobs();

$raw = file_get_contents('php://input');
$body = json_decode($raw ?: '', true);
if (!is_array($body)) {
    ss_json_response(['ok' => false, 'error' => 'Invalid JSON payload.'], 400);
}

// ユーザー区分判定（ゲスト vs 家カルテ登録ユーザー）
$carteId = trim((string)($body['carteId'] ?? ''));
$clientId = trim((string)($body['clientId'] ?? ''));
$tier = ($carteId !== '' && strlen($carteId) >= 6) ? 'registered' : 'guest';

$resolution = strtolower(trim((string)($body['resolution'] ?? '1024')));
if (!in_array($resolution, ['1024', '2k'], true)) {
    $resolution = '1024';
}

// ゲストは 1024px まで（2K は家カルテ登録ユーザー限定）
if ($tier === 'guest' && $resolution === '2k') {
    ss_json_response([
        'ok' => false,
        'code' => 'RESOLUTION_RESTRICTED',
        'tier' => $tier,
        'error' => '2K高精細パース生成は「家カルテ」無料登録ユーザー限定です。家カルテに保存・登録すると2K解像度と1日15回・優先生成が解放されます。'
    ], 403);
}

// 日次クォータ確認
$dailyLimit = ($tier === 'registered') ? SMILESTUDIO_REGISTERED_DAILY_LIMIT : SMILESTUDIO_GUEST_DAILY_LIMIT;
$quotaKey = ss_quota_key($tier, $carteId, $clientId);
$usedToday = ss_get_daily_quota_usage($quotaKey);
if ($usedToday >= $dailyLimit) {
    ss_json_response([
        'ok' => false,
        'code' => 'DAILY_LIMIT_EXCEEDED',
        'tier' => $tier,
        'usedToday' => $usedToday,
        'dailyLimit' => $dailyLimit,
        'remainingToday' => 0,
        'error' => ($tier === 'guest')
            ? "本日の無料生成上限（{$dailyLimit}回）に達しました。家カルテに無料登録すると1日" . SMILESTUDIO_REGISTERED_DAILY_LIMIT . "回までご利用いただけます。"
            : "本日の生成上限（{$dailyLimit}回）に達しました。明日0時に回数がリセットされます。"
    ], 429);
}

// 入力カラー画像の検証・保存
$colorDataUrl = (string)($body['colorDataUrl'] ?? '');
$colorDecoded = ss_decode_data_url($colorDataUrl, 8388608);
if (!$colorDecoded) {
    ss_json_response(['ok' => false, 'error' => '元画像（カラー素図）が指定されていないか、サイズ上限（8MB）を超えています。'], 400);
}

$jobId = ss_random_id(16);
$colorFilename = $jobId . '_color.' . $colorDecoded['ext'];
if (@file_put_contents(SMILESTUDIO_INPUTS_DIR . '/' . $colorFilename, $colorDecoded['bytes'], LOCK_EX) === false) {
    ss_json_response(['ok' => false, 'error' => '入力画像の保存に失敗しました。'], 500);
}

// 任意：深度マップ（間取り工房 3D ビューアからの MeshDepthMaterial 出力）
$depthFilename = null;
$depthDataUrl = (string)($body['depthDataUrl'] ?? '');
if ($depthDataUrl !== '') {
    $depthDecoded = ss_decode_data_url($depthDataUrl, 8388608);
    if ($depthDecoded) {
        $depthFilename = $jobId . '_depth.' . $depthDecoded['ext'];
        @file_put_contents(SMILESTUDIO_INPUTS_DIR . '/' . $depthFilename, $depthDecoded['bytes'], LOCK_EX);
    }
}

// 任意：汎用リージョンマスク配列（項目 B: tatami、項目 C: furniture 等、最大4領域）
$savedRegionMasks = [];
if (isset($body['regionMasks']) && is_array($body['regionMasks'])) {
    $idx = 0;
    foreach ($body['regionMasks'] as $rm) {
        if ($idx >= 4) break;
        if (!is_array($rm)) continue;
        $rmId = preg_replace('/[^a-zA-Z0-9_\-]/', '', (string)($rm['id'] ?? 'region'));
        if ($rmId === '') $rmId = 'region_' . $idx;
        $rmPrompt = trim((string)($rm['prompt'] ?? ''));
        if ($rmPrompt === '') continue;
        if (mb_strlen($rmPrompt) > 400) $rmPrompt = mb_substr($rmPrompt, 0, 400);
        $rmStrength = isset($rm['strength']) ? (float)$rm['strength'] : 1.0;
        $rmStrength = max(0.1, min(2.0, $rmStrength));
        $rmDecoded = ss_decode_data_url((string)($rm['maskDataUrl'] ?? ''), 2097152);
        if (!$rmDecoded) continue;
        $maskFilename = $jobId . '_mask_' . $idx . '_' . $rmId . '.' . $rmDecoded['ext'];
        if (@file_put_contents(SMILESTUDIO_INPUTS_DIR . '/' . $maskFilename, $rmDecoded['bytes'], LOCK_EX) !== false) {
            $savedRegionMasks[] = [
                'id' => $rmId,
                'prompt' => $rmPrompt,
                'strength' => $rmStrength,
                'maskFile' => $maskFilename,
            ];
            $idx++;
        }
    }
}

$mode = trim((string)($body['mode'] ?? 'photoreal'));
$style = trim((string)($body['style'] ?? 'natural'));
$lighting = trim((string)($body['lighting'] ?? 'day'));
$furniture = trim((string)($body['furniture'] ?? 'moderate'));
$prompt = trim((string)($body['prompt'] ?? ''));
if (mb_strlen($prompt) > 1200) {
    $prompt = mb_substr($prompt, 0, 1200);
}

$now = time();
$priority = ($tier === 'registered') ? SMILESTUDIO_REGISTERED_PRIORITY : SMILESTUDIO_GUEST_PRIORITY;

$job = [
    'jobId' => $jobId,
    'status' => 'queued',
    'tier' => $tier,
    'priority' => $priority,
    'resolution' => $resolution,
    'mode' => $mode,
    'style' => $style,
    'lighting' => $lighting,
    'furniture' => $furniture,
    'prompt' => $prompt,
    'planId' => trim((string)($body['planId'] ?? '')),
    'colorFile' => $colorFilename,
    'depthFile' => $depthFilename,
    'hasDepth' => ($depthFilename !== null),
    'regionMasks' => $savedRegionMasks,
    'createdAt' => $now,
    'updatedAt' => $now,
    'startedAt' => null,
    'completedAt' => null,
    'retryCount' => 0,
    'outputUrl' => null,
    'elapsedSec' => null,
    'error' => null,
];

if (!ss_write_json_atomic(SMILESTUDIO_JOBS_DIR . '/' . $jobId . '.json', $job)) {
    ss_json_response(['ok' => false, 'error' => 'ジョブの登録に失敗しました。'], 500);
}

$newUsage = ss_increment_daily_quota($quotaKey);
$queued = ss_list_queued_jobs_sorted();
$position = 1;
foreach ($queued as $idx => $q) {
    if (($q['jobId'] ?? '') === $jobId) {
        $position = $idx + 1;
        break;
    }
}

ss_json_response([
    'ok' => true,
    'jobId' => $jobId,
    'status' => 'queued',
    'tier' => $tier,
    'resolution' => $resolution,
    'queuePosition' => $position,
    'queueLength' => count($queued),
    'usedToday' => $newUsage,
    'dailyLimit' => $dailyLimit,
    'remainingToday' => max(0, $dailyLimit - $newUsage),
    'estimatedSec' => ($resolution === '2k') ? 170 : 35,
]);
