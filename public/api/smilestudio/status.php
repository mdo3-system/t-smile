<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

ss_ensure_dirs();
ss_reclaim_stale_jobs();

// クォータ・混雑状況のみ照会モード (?quota=1)
if (isset($_GET['quota']) && $_GET['quota'] === '1') {
    $carteId = trim((string)($_GET['carteId'] ?? ''));
    $clientId = trim((string)($_GET['clientId'] ?? ''));
    $tier = ($carteId !== '' && strlen($carteId) >= 6) ? 'registered' : 'guest';
    $dailyLimit = ($tier === 'registered') ? SMILESTUDIO_REGISTERED_DAILY_LIMIT : SMILESTUDIO_GUEST_DAILY_LIMIT;
    $quotaKey = ss_quota_key($tier, $carteId, $clientId);
    $usedToday = ss_get_daily_quota_usage($quotaKey);
    $queued = ss_list_queued_jobs_sorted();

    ss_json_response([
        'ok' => true,
        'tier' => $tier,
        'usedToday' => $usedToday,
        'dailyLimit' => $dailyLimit,
        'remainingToday' => max(0, $dailyLimit - $usedToday),
        'maxResolution' => ($tier === 'registered') ? '2k' : '1024',
        'queueLength' => count($queued),
    ]);
}

$jobId = trim((string)($_GET['jobId'] ?? ''));
if (!ss_is_valid_id($jobId)) {
    ss_json_response(['ok' => false, 'error' => 'Invalid jobId.'], 400);
}

$job = ss_read_json_file(SMILESTUDIO_JOBS_DIR . '/' . $jobId . '.json');
if (!$job) {
    ss_json_response(['ok' => false, 'error' => 'Job not found.'], 404);
}

$queuePosition = 0;
if (($job['status'] ?? '') === 'queued') {
    $queued = ss_list_queued_jobs_sorted();
    foreach ($queued as $idx => $q) {
        if (($q['jobId'] ?? '') === $jobId) {
            $queuePosition = $idx + 1;
            break;
        }
    }
}

ss_json_response([
    'ok' => true,
    'jobId' => $job['jobId'],
    'status' => $job['status'],
    'tier' => $job['tier'] ?? 'guest',
    'resolution' => $job['resolution'] ?? '1024',
    'queuePosition' => $queuePosition,
    'outputUrl' => $job['outputUrl'] ?? null,
    'elapsedSec' => $job['elapsedSec'] ?? null,
    'error' => $job['error'] ?? null,
    'updatedAt' => $job['updatedAt'] ?? null,
]);
