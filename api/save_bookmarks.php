<?php
header('Content-Type: application/json');

// 獲取請求中的 token 和 book 參數
$requestToken = isset($_GET['token']) ? $_GET['token'] : '';
$bookFile = isset($_GET['book']) ? $_GET['book'] : 'bookmarks';

// 確保檔案名稱安全
$bookFile = preg_replace('/[^a-zA-Z0-9_-]/', '', $bookFile);
$dataFile = __DIR__ . '/' . $bookFile . '.json';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    // 如果檔案存在，檢查 token
    if (file_exists($dataFile)) {
        $existingData = json_decode(file_get_contents($dataFile), true);
        if (!isset($existingData['token']) || $existingData['token'] !== $requestToken) {
            echo json_encode(["success" => false, "message" => "無效的 Token"]);
            exit;
        }
    }

    if (json_last_error() === JSON_ERROR_NONE) {
        // 保留原有的 token
        if (file_exists($dataFile)) {
            $data['token'] = $existingData['token'];
        }
        
        file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT));
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "message" => "無效的 JSON 格式"]);
    }
} else {
    echo json_encode(["success" => false, "message" => "僅支援 POST 請求"]);
}