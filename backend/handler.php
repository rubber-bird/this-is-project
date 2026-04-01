<?php

require_once __DIR__ . '/src/util/Database.php';
require_once __DIR__ . '/src/util/Logger.php';
require_once __DIR__ . '/src/util/Result.php';
require_once __DIR__ . '/src/util/ResultMapper.php';
require_once __DIR__ . '/src/service/Auth.php';
require_once __DIR__ . '/src/service/AccountService.php';

header('Content-Type: application/json');

$env = json_decode(file_get_contents(__DIR__ . '/env.json'), true);
$logger = new Logger(__DIR__ . '/logs/app.log');

try {
    Database::connect($env['database']);
} catch (Throwable $e) {
    $logger->error('Database is unavailable', ['exception' => $e->getMessage()]);
    http_response_code(500);
    echo json_encode(['error' => 'Backend error']);
    exit;
}

session_start();

$users = new UserRepository();
$accounts = new AccountRepository();
$auth = new Auth($users, $accounts);
$account = new AccountService($users);

// ── Route ──
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$route = $uri ?: '/';
$method = $_SERVER['REQUEST_METHOD'];
$body = json_decode(file_get_contents('php://input'), true) ?? [];

try {
    $result = match (true) {
        $method === 'POST' && $route === '/sign-up' => $auth->signUp(
            $body['given_name'] ?? '',
            $body['family_name'] ?? '',
            $body['email'] ?? '',
            $body['password'] ?? '',
        ),

        $method === 'POST' && $route === '/sign-in' => (function () use ($auth, $body): Result {
            $result = $auth->signIn(
                $body['email'] ?? '',
                $body['password'] ?? '',
            );
            if ($result->succeeded()) {
                $_SESSION['userId'] = $result->value()['id'];
            }
            return $result;
        })(),

        $method === 'GET' && $route === '/whoami' => $account->whoami(
            $_SESSION['userId'] ?? null,
        ),

        $method === 'POST' && $route === '/sign-out' => (function (): Result {
            session_destroy();
            return Result::ok(200, ['message' => 'Signed out']);
        })(),

        default => null,
    };
} catch (Throwable $e) {
    $logger->error($e->getMessage(), [
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString(),
    ]);
    http_response_code(500);
    echo json_encode(['error' => 'Backend error']);
    exit;
}

if ($result === null) {
    http_response_code(404);
    echo json_encode(['error' => 'Not found']);
} else {
    $response = ResultMapper::toResponse($result);
    http_response_code($response['code']);
    echo json_encode($response['body']);
}
