<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

ss_require_agent_auth();
ss_ensure_dirs();
ss_reclaim_stale_jobs();

// 排他ロックで 1 ジョブのみ払出（同時実行1ジョブ固定）
$lockFile = SMILESTUDIO_QUEUE_ROOT . '/poll.lock';
$lockFp = @fopen($lockFile, 'c+');
if (!$lockFp || !flock($lockFp, LOCK_EX)) {
    ss_json_response(['ok' => false, 'error' => 'Could not acquire queue lock.'], 503);
}

try {
    $queued = ss_list_queued_jobs_sorted();
    if (count($queued) === 0) {
        ss_json_response(['ok' => true, 'job' => null]);
    }

    $next = $queued[0];
    $jobId = $next['jobId'];
    $jobPath = SMILESTUDIO_JOBS_DIR . '/' . $jobId . '.json';

    $now = time();
    $next['status'] = 'processing';
    $next['startedAt'] = $now;
    $next['updatedAt'] = $now;
    ss_write_json_atomic($jobPath, $next);

    $colorPath = SMILESTUDIO_INPUTS_DIR . '/' . ($next['colorFile'] ?? '');
    $colorB64 = (file_exists($colorPath)) ? base64_encode((string)file_get_contents($colorPath)) : null;

    $depthB64 = null;
    if (!empty($next['depthFile'])) {
        $depthPath = SMILESTUDIO_INPUTS_DIR . '/' . $next['depthFile'];
        if (file_exists($depthPath)) {
            $depthB64 = base64_encode((string)file_get_contents($depthPath));
        }
    }

    $next['colorBase64'] = $colorB64;
    $next['depthBase64'] = $depthB64;

    $outMasks = [];
    if (!empty($next['regionMasks']) && is_array($next['regionMasks'])) {
        foreach ($next['regionMasks'] as $rm) {
            $mf = $rm['maskFile'] ?? '';
            $mp = SMILESTUDIO_INPUTS_DIR . '/' . $mf;
            if ($mf !== '' && file_exists($mp)) {
                $rm['maskBase64'] = base64_encode((string)file_get_contents($mp));
                $outMasks[] = $rm;
            }
        }
    }
    $next['regionMasks'] = $outMasks;

    ss_json_response(['ok' => true, 'job' => $next]);
} finally {
    flock($lockFp, LOCK_UN);
    fclose($lockFp);
}
