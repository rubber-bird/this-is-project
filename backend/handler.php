<?php

require_once __DIR__ . '/src/util/Database.php';
require_once __DIR__ . '/src/util/Logger.php';
require_once __DIR__ . '/src/util/Result.php';
require_once __DIR__ . '/src/util/ResultMapper.php';
require_once __DIR__ . '/src/service/Auth.php';
require_once __DIR__ . '/src/service/AccountService.php';
require_once __DIR__ . '/src/service/ProjectService.php';
require_once __DIR__ . '/src/service/WorkflowStatusService.php';
require_once __DIR__ . '/src/service/TaskService.php';
require_once __DIR__ . '/src/data/ProjectRepository.php';
require_once __DIR__ . '/src/data/WorkflowStatusRepository.php';
require_once __DIR__ . '/src/data/TaskRepository.php';

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
$projectRepo = new ProjectRepository();
$projects = new ProjectService($users, $projectRepo);
$workflowStatusRepo = new WorkflowStatusRepository();
$taskRepo = new TaskRepository();
$workflowStatuses = new WorkflowStatusService($users, $projectRepo, $workflowStatusRepo, $taskRepo);
$tasks = new TaskService($users, $projectRepo, $workflowStatusRepo, $taskRepo);

// ── Route ──
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$route = $uri ?: '/';
$method = $_SERVER['REQUEST_METHOD'];
$body = json_decode(file_get_contents('php://input'), true) ?? [];

$projectPathId = null;
if (preg_match('#^/projects/([^/]+)$#', $route, $projectPathMatch)) {
    $projectPathId = $projectPathMatch[1];
}

$projectWorkflowStatusesId = null;
if (preg_match('#^/projects/([^/]+)/workflow-statuses$#', $route, $workflowStatusesMatch)) {
    $projectWorkflowStatusesId = $workflowStatusesMatch[1];
}

$workflowStatusPathProjectId = null;
$workflowStatusPathStatusId = null;
if (preg_match('#^/projects/([^/]+)/workflow-statuses/([^/]+)$#', $route, $workflowStatusPathMatch)) {
    $workflowStatusPathProjectId = $workflowStatusPathMatch[1];
    $workflowStatusPathStatusId = $workflowStatusPathMatch[2];
}

$projectTasksId = null;
if (preg_match('#^/projects/([^/]+)/tasks$#', $route, $tasksMatch)) {
    $projectTasksId = $tasksMatch[1];
}

$taskPathProjectId = null;
$taskPathTaskId = null;
if (preg_match('#^/projects/([^/]+)/tasks/([^/]+)$#', $route, $taskMatch)) {
    $taskPathProjectId = $taskMatch[1];
    $taskPathTaskId = $taskMatch[2];
}

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

        $method === 'GET' && $route === '/account/users' => $account->listUsers(
            $_SESSION['userId'] ?? null,
        ),

        $method === 'POST' && $route === '/account/users' => $account->addUser(
            $_SESSION['userId'] ?? null,
            $body['given_name'] ?? '',
            $body['family_name'] ?? '',
            $body['email'] ?? '',
            $body['password'] ?? '',
        ),

        $method === 'POST' && $route === '/sign-out' => (function (): Result {
            session_destroy();
            return Result::ok(200, ['message' => 'Signed out']);
        })(),

        $method === 'GET' && $route === '/projects' => $projects->list(
            $_SESSION['userId'] ?? null,
        ),

        $method === 'POST' && $route === '/projects' => $projects->create(
            $_SESSION['userId'] ?? null,
            $body['name'] ?? '',
            $body['description'] ?? null,
        ),

        $method === 'GET' && $projectPathId !== null => $projects->get(
            $_SESSION['userId'] ?? null,
            $projectPathId,
        ),

        $method === 'PATCH' && $projectPathId !== null => $projects->update(
            $_SESSION['userId'] ?? null,
            $projectPathId,
            $body,
        ),

        $method === 'DELETE' && $projectPathId !== null => $projects->delete(
            $_SESSION['userId'] ?? null,
            $projectPathId,
        ),

        $method === 'GET' && $projectWorkflowStatusesId !== null => $workflowStatuses->list(
            $_SESSION['userId'] ?? null,
            $projectWorkflowStatusesId,
        ),

        $method === 'POST' && $projectWorkflowStatusesId !== null => $workflowStatuses->createMany(
            $_SESSION['userId'] ?? null,
            $projectWorkflowStatusesId,
            $body['statuses'] ?? null,
        ),

        $method === 'PUT' && $projectWorkflowStatusesId !== null => $workflowStatuses->reorder(
            $_SESSION['userId'] ?? null,
            $projectWorkflowStatusesId,
            $body['order'] ?? null,
        ),

        $method === 'PATCH' && $workflowStatusPathProjectId !== null && $workflowStatusPathStatusId !== null => $workflowStatuses->update(
            $_SESSION['userId'] ?? null,
            $workflowStatusPathProjectId,
            $workflowStatusPathStatusId,
            $body,
        ),

        $method === 'DELETE' && $workflowStatusPathProjectId !== null && $workflowStatusPathStatusId !== null => $workflowStatuses->delete(
            $_SESSION['userId'] ?? null,
            $workflowStatusPathProjectId,
            $workflowStatusPathStatusId,
        ),

        $method === 'GET' && $projectTasksId !== null => $tasks->list(
            $_SESSION['userId'] ?? null,
            $projectTasksId,
        ),

        $method === 'POST' && $projectTasksId !== null => $tasks->create(
            $_SESSION['userId'] ?? null,
            $projectTasksId,
            $body['title'] ?? '',
            $body['blockNoteData'] ?? null,
            $body['deadline'] ?? null,
            $body['priority'] ?? null,
        ),

        $method === 'GET' && $taskPathProjectId !== null && $taskPathTaskId !== null => $tasks->get(
            $_SESSION['userId'] ?? null,
            $taskPathProjectId,
            $taskPathTaskId,
        ),

        $method === 'PATCH' && $taskPathProjectId !== null && $taskPathTaskId !== null => $tasks->update(
            $_SESSION['userId'] ?? null,
            $taskPathProjectId,
            $taskPathTaskId,
            $body,
        ),

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
