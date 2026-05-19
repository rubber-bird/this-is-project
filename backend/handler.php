<?php

require_once __DIR__ . '/src/util/EnvConfig.php';
require_once __DIR__ . '/src/util/Database.php';
require_once __DIR__ . '/src/util/Logger.php';
require_once __DIR__ . '/src/util/Result.php';
require_once __DIR__ . '/src/util/ResultMapper.php';
require_once __DIR__ . '/src/service/Auth.php';
require_once __DIR__ . '/src/service/AccountService.php';
require_once __DIR__ . '/src/service/ProjectService.php';
require_once __DIR__ . '/src/service/WorkflowStatusService.php';
require_once __DIR__ . '/src/service/TaskService.php';
require_once __DIR__ . '/src/service/TaskAttachmentService.php';
require_once __DIR__ . '/src/service/AiAssistantService.php';
require_once __DIR__ . '/src/service/BillingService.php';
require_once __DIR__ . '/src/data/ProjectRepository.php';
require_once __DIR__ . '/src/data/WorkflowStatusRepository.php';
require_once __DIR__ . '/src/data/TaskRepository.php';
require_once __DIR__ . '/src/data/TaskAttachmentRepository.php';
require_once __DIR__ . '/src/util/TaskAttachmentStorage.php';
require_once __DIR__ . '/src/util/Stripe.php';

header('Content-Type: application/json');

$env = EnvConfig::loadJson(__DIR__);
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
$projects = new ProjectService($users, $projectRepo, $accounts);
$workflowStatusRepo = new WorkflowStatusRepository();
$taskRepo = new TaskRepository();
$taskAttachmentRepo = new TaskAttachmentRepository();
$attachmentStorage = TaskAttachmentStorage::fromBackendRoot(__DIR__);
$taskAttachments = new TaskAttachmentService($users, $projectRepo, $taskRepo, $taskAttachmentRepo, $attachmentStorage);
$workflowStatuses = new WorkflowStatusService($users, $projectRepo, $workflowStatusRepo, $taskRepo);
$tasks = new TaskService($users, $projectRepo, $workflowStatusRepo, $taskRepo, $taskAttachments);
$assistant = new AiAssistantService(
    $users,
    $projectRepo,
    $workflowStatusRepo,
    $taskRepo,
    $tasks,
    EnvConfig::geminiApiKey($env),
);

$stripeConfig = $env['stripe'] ?? [];
$stripeClient = new Stripe(
    secretKey: (string) ($stripeConfig['secret_key'] ?? ''),
    webhookSecret: (string) ($stripeConfig['webhook_secret'] ?? ''),
);
$billing = new BillingService(
    users: $users,
    accounts: $accounts,
    stripe: $stripeClient,
    pricePro: (string) ($stripeConfig['price_pro'] ?? ''),
    successUrl: (string) ($stripeConfig['success_url'] ?? ''),
    cancelUrl: (string) ($stripeConfig['cancel_url'] ?? ''),
    portalReturnUrl: (string) ($stripeConfig['portal_return_url'] ?? ''),
);

// ── Route ──
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$route = $uri ?: '/';
$method = $_SERVER['REQUEST_METHOD'];
$rawBody = file_get_contents('php://input') ?: '';
$body = json_decode($rawBody, true) ?? [];

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

$taskAttachmentsProjectId = null;
$taskAttachmentsTaskId = null;
$taskAttachmentsAttachmentId = null;
if (preg_match('#^/projects/([^/]+)/tasks/([^/]+)/attachments(?:/([^/]+))?$#', $route, $attachmentsMatch)) {
    $taskAttachmentsProjectId = $attachmentsMatch[1];
    $taskAttachmentsTaskId = $attachmentsMatch[2];
    $taskAttachmentsAttachmentId = $attachmentsMatch[3] ?? null;
}

$projectAssistantId = null;
if (preg_match('#^/projects/([^/]+)/assistant/chat$#', $route, $assistantMatch)) {
    $projectAssistantId = $assistantMatch[1];
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

        $method === 'DELETE' && $taskPathProjectId !== null && $taskPathTaskId !== null => $tasks->delete(
            $_SESSION['userId'] ?? null,
            $taskPathProjectId,
            $taskPathTaskId,
        ),

        $method === 'GET' && $taskAttachmentsProjectId !== null && $taskAttachmentsTaskId !== null && $taskAttachmentsAttachmentId === null => $taskAttachments->list(
            $_SESSION['userId'] ?? null,
            $taskAttachmentsProjectId,
            $taskAttachmentsTaskId,
        ),

        $method === 'POST' && $taskAttachmentsProjectId !== null && $taskAttachmentsTaskId !== null && $taskAttachmentsAttachmentId === null => $taskAttachments->upload(
            $_SESSION['userId'] ?? null,
            $taskAttachmentsProjectId,
            $taskAttachmentsTaskId,
            $_FILES['file'] ?? null,
        ),

        $method === 'GET' && $taskAttachmentsProjectId !== null && $taskAttachmentsTaskId !== null && $taskAttachmentsAttachmentId !== null => $taskAttachments->download(
            $_SESSION['userId'] ?? null,
            $taskAttachmentsProjectId,
            $taskAttachmentsTaskId,
            $taskAttachmentsAttachmentId,
        ),

        $method === 'DELETE' && $taskAttachmentsProjectId !== null && $taskAttachmentsTaskId !== null && $taskAttachmentsAttachmentId !== null => $taskAttachments->delete(
            $_SESSION['userId'] ?? null,
            $taskAttachmentsProjectId,
            $taskAttachmentsTaskId,
            $taskAttachmentsAttachmentId,
        ),

        $method === 'POST' && $projectAssistantId !== null => $assistant->handlePrompt(
            $_SESSION['userId'] ?? null,
            $projectAssistantId,
            $body['prompt'] ?? '',
            $body['history'] ?? null,
        ),

        $method === 'GET' && $route === '/billing' => $billing->getBilling(
            $_SESSION['userId'] ?? null,
        ),

        $method === 'POST' && $route === '/billing/checkout' => $billing->createCheckout(
            $_SESSION['userId'] ?? null,
        ),

        $method === 'POST' && $route === '/billing/portal' => $billing->createPortal(
            $_SESSION['userId'] ?? null,
        ),

        $method === 'POST' && $route === '/webhooks/stripe' => $billing->handleWebhook(
            $rawBody,
            $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '',
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

    $body = $response['body'];
    if (
        is_array($body)
        && isset($body['__file'])
        && is_array($body['__file'])
        && isset($body['__file']['path'], $body['__file']['filename'])
    ) {
        $file = $body['__file'];
        $path = (string) $file['path'];
        if (!is_file($path)) {
            http_response_code(404);
            echo json_encode(['error' => 'File not found']);
            exit;
        }
        header_remove('Content-Type');
        header('Content-Type: ' . ($file['mime_type'] ?? 'application/octet-stream'));
        header('Content-Disposition: attachment; filename="' . str_replace('"', '', (string) $file['filename']) . '"');
        header('Content-Length: ' . (string) filesize($path));
        readfile($path);
        exit;
    }

    echo json_encode($body);
}
