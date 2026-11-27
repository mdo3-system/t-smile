<?php
/**
 * 住ま居る 3D間取り工房 (MadoriSketch) - リアルタイム画面共有エンドポイント
 * 同一Wi-Fi内および別タブレット（iPad）・PC画面へのリアルタイム同期（2D図面・3Dモデル・視点アングル・階層）
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$storageDir = dirname(__DIR__) . '/data/live_share_rooms';
if (!is_dir($storageDir)) {
    @mkdir($storageDir, 0775, true);
}

/**
 * ルームコードのサニタイズ（英数字4〜12文字のみ許可、パストラバーサル完全防止）
 */
function sanitizeRoomCode($raw) {
    $clean = preg_replace('/[^A-Za-z0-9]/', '', strtoupper(trim((string)$raw)));
    if (strlen($clean) < 3) {
        return '';
    }
    return substr($clean, 0, 12);
}

/**
 * 古い共有ルームファイル（最終更新から12時間以上経過）を自動クリーンアップ
 */
function cleanupStaleRooms($dir) {
    if (!is_dir($dir)) return;
    $now = time();
    $files = @glob($dir . '/room_*.json');
    if (!is_array($files)) return;
    foreach ($files as $file) {
        $mtime = @filemtime($file);
        if ($mtime && ($now - $mtime) > 43200) {
            @unlink($file);
        }
    }
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    cleanupStaleRooms($storageDir);

    if ($action === 'list_active') {
        $rooms = [];
        $now = time();
        $files = @glob($storageDir . '/room_*.json');
        if (is_array($files)) {
            foreach ($files as $f) {
                $mtime = @filemtime($f);
                // 直近30分以内にアクティブなルームを一覧返却
                if ($mtime && ($now - $mtime) <= 1800) {
                    $raw = @file_get_contents($f);
                    $data = $raw ? @json_decode($raw, true) : null;
                    if (is_array($data) && !empty($data['roomCode'])) {
                        $rooms[] = [
                            'roomCode' => (string)$data['roomCode'],
                            'projectTitle' => (string)($data['projectTitle'] ?? '3D間取りプラン'),
                            'hostLabel' => (string)($data['hostLabel'] ?? 'iPad / PC'),
                            'currentFloor' => (int)($data['currentFloor'] ?? 1),
                            'viewMode' => (string)($data['viewMode'] ?? 'split'),
                            'seq' => (int)($data['seq'] ?? 1),
                            'updatedAt' => (string)($data['updatedAt'] ?? date('c', $mtime)),
                            'ageSec' => max(0, $now - $mtime)
                        ];
                    }
                }
            }
        }
        usort($rooms, function($a, $b) {
            return ($a['ageSec'] ?? 9999) <=> ($b['ageSec'] ?? 9999);
        });
        echo json_encode([
            'ok' => true,
            'rooms' => array_slice($rooms, 0, 10),
            'serverTime' => date('c')
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 特定ルームの状態取得 (action=poll)
    $roomCode = sanitizeRoomCode($_GET['room'] ?? $_GET['roomCode'] ?? '');
    if ($roomCode === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Invalid room code'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $filePath = $storageDir . '/room_' . $roomCode . '.json';
    if (!is_file($filePath)) {
        echo json_encode(['ok' => false, 'notFound' => true, 'error' => 'Room not found'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $raw = @file_get_contents($filePath);
    $data = $raw ? @json_decode($raw, true) : null;
    if (!is_array($data)) {
        echo json_encode(['ok' => false, 'error' => 'Failed to read room state'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $clientSeq = isset($_GET['sinceSeq']) ? (int)$_GET['sinceSeq'] : 0;
    $serverSeq = (int)($data['seq'] ?? 1);
    if ($clientSeq > 0 && $clientSeq === $serverSeq) {
        echo json_encode([
            'ok' => true,
            'unchanged' => true,
            'roomCode' => $roomCode,
            'seq' => $serverSeq,
            'updatedAt' => $data['updatedAt'] ?? date('c')
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    echo json_encode([
        'ok' => true,
        'unchanged' => false,
        'roomCode' => $roomCode,
        'seq' => $serverSeq,
        'state' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    if ($rawInput === false || strlen($rawInput) > 4 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Payload too large or empty'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $payload = @json_decode($rawInput, true);
    if (!is_array($payload)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Invalid JSON'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $postAction = (string)($payload['action'] ?? $action ?: 'push');
    $roomCode = sanitizeRoomCode($payload['roomCode'] ?? $_GET['room'] ?? '');
    if ($roomCode === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Invalid room code'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $filePath = $storageDir . '/room_' . $roomCode . '.json';

    if ($postAction === 'stop') {
        if (is_file($filePath)) {
            @unlink($filePath);
        }
        echo json_encode(['ok' => true, 'stopped' => true, 'roomCode' => $roomCode], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $prevSeq = 0;
    if (is_file($filePath)) {
        $prevRaw = @file_get_contents($filePath);
        $prevData = $prevRaw ? @json_decode($prevRaw, true) : null;
        if (is_array($prevData)) {
            $prevSeq = (int)($prevData['seq'] ?? 0);
        }
    }
    $nextSeq = max($prevSeq + 1, (int)($payload['seq'] ?? 1));

    $roomState = [
        'roomCode' => $roomCode,
        'seq' => $nextSeq,
        'updatedAt' => date('c'),
        'hostLabel' => mb_substr(trim((string)($payload['hostLabel'] ?? 'iPad / PC')), 0, 40),
        'projectTitle' => mb_substr(trim((string)($payload['projectTitle'] ?? '3D間取りプラン')), 0, 80),
        'planId' => mb_substr(trim((string)($payload['planId'] ?? '')), 0, 60),
        'currentFloor' => (int)($payload['currentFloor'] ?? 1),
        'viewMode' => (string)($payload['viewMode'] ?? 'split'),
        'modulePitch' => (int)($payload['modulePitch'] ?? 910),
        'gridDivisions' => (int)($payload['gridDivisions'] ?? 2),
        'foundationHeightMm' => (int)($payload['foundationHeightMm'] ?? 400),
        'showMizukiri3D' => (bool)($payload['showMizukiri3D'] ?? true),
        'mizukiriColor' => (string)($payload['mizukiriColor'] ?? '#334155'),
        'floorDisplay3D' => (string)($payload['floorDisplay3D'] ?? 'all'),
        'cam2d' => is_array($payload['cam2d'] ?? null) ? $payload['cam2d'] : null,
        'camera3d' => is_array($payload['camera3d'] ?? null) ? $payload['camera3d'] : null,
        'floors' => is_array($payload['floors'] ?? null) ? $payload['floors'] : [],
        'guides' => is_array($payload['guides'] ?? null) ? $payload['guides'] : []
    ];

    $encoded = json_encode($roomState, JSON_UNESCAPED_UNICODE);
    $written = @file_put_contents($filePath, $encoded, LOCK_EX);
    if ($written === false) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Failed to write room state'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode([
        'ok' => true,
        'roomCode' => $roomCode,
        'seq' => $nextSeq,
        'updatedAt' => $roomState['updatedAt']
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
