<?php
header('Content-Type: application/json');

// 獲取請求中的 token 和 book 參數
$requestToken = isset($_GET['token']) ? $_GET['token'] : '';
$bookFile = isset($_GET['book']) ? $_GET['book'] : 'bookmarks';

// 確保檔案名稱安全
$bookFile = preg_replace('/[^a-zA-Z0-9_-]/', '', $bookFile);
$dataFile = __DIR__ . '/' . $bookFile . '.json';

if (!file_exists($dataFile)) {
        echo json_encode([
        "success" => false,
        "message" => "書籤檔案不存在"
        ]);
    exit;
}

$data = file_get_contents($dataFile);
$decoded = json_decode($data, true);

// 驗證 token
if (!isset($decoded['token']) || $decoded['token'] !== $requestToken) {
            echo json_encode([
        "success" => false,
        "message" => "無效的 Token"
            ]);
    exit;
        }

// Token 驗證通過，回傳書籤資料
if ($decoded === null) {
    echo json_encode([
        "success" => true,
        "bookmarks" => [],
        "folderOrder" => ["未分類"]
    ]);
} else {
    // 確保回傳資料格式正確
    $response = [
        "success" => true,
        "bookmarks" => isset($decoded['bookmarks']) ? $decoded['bookmarks'] : [],
        "folderOrder" => isset($decoded['folderOrder']) ? $decoded['folderOrder'] : ["未分類"]
    ];
    echo json_encode($response);
}
