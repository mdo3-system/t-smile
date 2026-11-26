<?php
/**
 * 株式会社住ま居る（家づくりサポート係）
 * 3D間取り工房 クラウド保存＆Dropboxファイルピッカー不要のワンタップ復元・共創プラン共有登録API
 *
 * - POST: 作図中のプロジェクトJSONをサーバー側（public/data/saved_madori_plans/）へ安全保存し、
 *         家カルテ未登録（ゲスト）ユーザーの共有同意プランは public/data/community_plans.json にも登録・更新する。
 * - GET :
 *     - ?action=list (デフォルト): 保存済み間取りプラン一覧（メタデータ配列）を最新順で返却
 *     - ?action=get&planId=XXXX : 指定プランIDの完全なJSONデータを返却（OSのファイル選択画面を一切開かずに1タップ復元）
 */

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$publicRoot = dirname(__DIR__);
$savedDir = $publicRoot . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'saved_madori_plans';
$communityJsonPath = $publicRoot . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'community_plans.json';

if (!is_dir($savedDir)) {
    @mkdir($savedDir, 0755, true);
}

function sanitize_plan_id($rawId) {
    $clean = preg_replace('/[^A-Za-z0-9_-]/', '', (string)$rawId);
    if ($clean === '') {
        $clean = 'PLAN-COMM-' . strtoupper(base_convert((string)time(), 10, 36));
    }
    return substr($clean, 0, 64);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'POST') {
    $rawBody = file_get_contents('php://input');
    $payload = json_decode($rawBody, true);
    if (!is_array($payload)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Invalid JSON payload'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $projectData = isset($payload['projectData']) && is_array($payload['projectData']) ? $payload['projectData'] : $payload;
    $rawPlanId = $projectData['planId'] ?? $projectData['id'] ?? $payload['planId'] ?? '';
    $planId = sanitize_plan_id($rawPlanId);
    $projectData['planId'] = $planId;

    $title = trim((string)($projectData['projectTitle'] ?? $projectData['title'] ?? '新規プラン'));
    if ($title === '') $title = '新規プラン';
    $projectData['projectTitle'] = $title;
    $projectData['title'] = $title;
    $projectData['savedAt'] = date('c');

    $isRegisteredCarte = !empty($payload['isRegisteredCarte']);
    $agreedToShare = !empty($payload['agreedToShareAndPublish']);
    $projectData['isRegisteredCarte'] = $isRegisteredCarte;
    $projectData['agreedToShareAndPublish'] = $agreedToShare;
    $projectData['totalTsubo'] = $payload['totalTsubo'] ?? ($projectData['totalTsubo'] ?? '');
    $projectData['totalM2'] = $payload['totalM2'] ?? ($projectData['totalM2'] ?? '');

    // 1. 個別プロジェクトJSONファイルとして保存（Dropboxファイルピッカー不要のワンタップ復元用）
    $targetFile = $savedDir . DIRECTORY_SEPARATOR . $planId . '.json';
    $written = @file_put_contents($targetFile, json_encode($projectData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);

    // 2. コミュニティ共創プラン（3D間取りプラン選定）への登録・更新
    if (isset($payload['communityPlan']) && is_array($payload['communityPlan'])) {
        $commPlan = $payload['communityPlan'];
        $commPlan['id'] = $planId;
        $commPlan['agreedToShareAndPublish'] = $agreedToShare;
        $commPlan['sharedWithSupportTeam'] = true;
        $commPlan['handler'] = '株式会社住ま居る 家づくりサポート係';

        $commList = [];
        if (is_file($communityJsonPath)) {
            $existingRaw = @file_get_contents($communityJsonPath);
            $decoded = json_decode((string)$existingRaw, true);
            if (is_array($decoded)) {
                $commList = $decoded;
            }
        }
        $foundIdx = -1;
        foreach ($commList as $idx => $item) {
            if (is_array($item) && isset($item['id']) && $item['id'] === $planId) {
                $foundIdx = $idx;
                break;
            }
        }
        if ($foundIdx >= 0) {
            $commList[$foundIdx] = $commPlan;
        } else {
            array_unshift($commList, $commPlan);
        }
        $commList = array_slice($commList, 0, 200);
        @file_put_contents($communityJsonPath, json_encode($commList, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
    }

    echo json_encode([
        'ok' => $written !== false,
        'planId' => $planId,
        'title' => $title,
        'savedAt' => $projectData['savedAt'],
        'agreedToShareAndPublish' => $agreedToShare
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// GET Request: 単一プラン取得または保存済みプラン一覧返却
$action = $_GET['action'] ?? 'list';

if ($action === 'get') {
    $reqId = sanitize_plan_id($_GET['planId'] ?? '');
    $filePath = $savedDir . DIRECTORY_SEPARATOR . $reqId . '.json';
    if (is_file($filePath)) {
        $raw = @file_get_contents($filePath);
        $data = json_decode((string)$raw, true);
        if (is_array($data)) {
            echo json_encode(['ok' => true, 'plan' => $data], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
    // plans_json 側にある場合もフォールバック検索
    $catalogPath = $publicRoot . DIRECTORY_SEPARATOR . 'plans_json' . DIRECTORY_SEPARATOR . $reqId . '.json';
    if (is_file($catalogPath)) {
        $raw = @file_get_contents($catalogPath);
        $data = json_decode((string)$raw, true);
        if (is_array($data)) {
            echo json_encode(['ok' => true, 'plan' => $data], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => '指定された保存プランが見つかりません'], JSON_UNESCAPED_UNICODE);
    exit;
}

// action=list: 保存済み間取り一覧を返却
$items = [];
if (is_dir($savedDir)) {
    $files = glob($savedDir . DIRECTORY_SEPARATOR . '*.json');
    if (is_array($files)) {
        usort($files, function($a, $b) {
            return (@filemtime($b) ?: 0) - (@filemtime($a) ?: 0);
        });
        foreach (array_slice($files, 0, 50) as $f) {
            $raw = @file_get_contents($f);
            $d = json_decode((string)$raw, true);
            if (!is_array($d)) continue;
            $pid = sanitize_plan_id($d['planId'] ?? basename($f, '.json'));
            $items[] = [
                'id' => $pid,
                'title' => (string)($d['projectTitle'] ?? $d['title'] ?? $pid),
                'totalTsubo' => (string)($d['totalTsubo'] ?? ''),
                'totalM2' => (string)($d['totalM2'] ?? ''),
                'savedAt' => (string)($d['savedAt'] ?? date('c', @filemtime($f) ?: time())),
                'source' => 'cloud'
            ];
        }
    }
}

echo json_encode([
    'ok' => true,
    'plans' => $items
], JSON_UNESCAPED_UNICODE);
