<?php

// Router for PHP built-in server: php -S localhost:9003 router.php
// Serves static files if they exist, otherwise routes to handler.php.

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = __DIR__ . $path;

if ($path !== '/' && is_file($file)) {
    return false; // let the built-in server handle static files
}

require __DIR__ . '/handler.php';
