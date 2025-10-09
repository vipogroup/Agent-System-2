<?php
header('Content-Type: application/json');

$folder = isset($_GET['folder']) ? $_GET['folder'] : '';
$allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'ogg'];
$images = [];

if (!empty($folder) && is_dir($folder)) {
    $files = scandir($folder);
    
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (in_array($ext, $allowed_extensions)) {
            $images[] = [
                'path' => $folder . '/' . $file,
                'name' => pathinfo($file, PATHINFO_FILENAME)
            ];
        }
    }
}

echo json_encode($images);
?>
