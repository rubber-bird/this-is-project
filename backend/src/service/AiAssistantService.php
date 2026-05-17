<?php

require_once __DIR__ . '/../util/Result.php';
require_once __DIR__ . '/../data/UserRepository.php';
require_once __DIR__ . '/../data/ProjectRepository.php';
require_once __DIR__ . '/../data/WorkflowStatusRepository.php';
require_once __DIR__ . '/../data/TaskRepository.php';
require_once __DIR__ . '/../data/User.php';
require_once __DIR__ . '/../data/Project.php';
require_once __DIR__ . '/TaskService.php';
require_once __DIR__ . '/../assistant/AssistantChatHistory.php';
require_once __DIR__ . '/../assistant/ProjectAssistantContextBuilder.php';
require_once __DIR__ . '/../assistant/AssistantSystemPrompt.php';
require_once __DIR__ . '/../assistant/GeminiAssistantClient.php';
require_once __DIR__ . '/../assistant/AssistantActionExecutor.php';

class AiAssistantService
{
    private readonly GeminiAssistantClient $gemini;
    private readonly AssistantActionExecutor $actions;

    public function __construct(
        private readonly UserRepository $users,
        private readonly ProjectRepository $projects,
        private readonly WorkflowStatusRepository $statuses,
        private readonly TaskRepository $tasks,
        TaskService $taskService,
        private readonly ?string $geminiApiKey,
    ) {
        $this->gemini = new GeminiAssistantClient($geminiApiKey);
        $this->actions = new AssistantActionExecutor($taskService);
    }

    public function handlePrompt(?string $userId, string $projectId, mixed $prompt, mixed $historyInput = null): Result {
        $projectResult = $this->requireProject($userId, $projectId);
        if ($projectResult->failed()) {
            return $projectResult;
        }

        /** @var User $currentUser */
        $currentUser = $projectResult->value()['user'];
        $accountUsers = $this->users->findAllByAccountId($currentUser->accountId);

        $promptText = trim((string) $prompt);
        if ($promptText === '') {
            return Result::fail(400, 'validation', ['message' => 'Prompt is required']);
        }

        if (!$this->geminiApiKey) {
            return Result::fail(500, 'config', ['message' => 'Missing Gemini API key']);
        }

        $history = AssistantChatHistory::normalizeAndCap(
            $historyInput,
            AssistantSystemPrompt::CHAT_HISTORY_MAX_MESSAGES,
        );

        $context = ProjectAssistantContextBuilder::build(
            $this->statuses->findByProjectId($projectId),
            $this->tasks->findByProjectId($projectId),
            $accountUsers,
        );

        $systemPrompt = AssistantSystemPrompt::build(
            $context['statuses'],
            $context['tasks'],
            $context['assignees'],
        );

        $modelResponse = $this->gemini->complete($systemPrompt, $history, $promptText);
        if ($modelResponse['error'] !== null) {
            return Result::fail(502, 'ai_error', ['message' => $modelResponse['error']]);
        }

        $parsed = GeminiAssistantClient::decodeModelPayload($modelResponse['text']);
        if ($parsed === null || !is_array($parsed)) {
            return Result::fail(502, 'ai_error', ['message' => 'AI response was not valid JSON']);
        }

        return $this->buildSuccessResponse($parsed, $userId, $projectId, $accountUsers);
    }

    /**
     * @param array<string, mixed> $parsed
     * @param User[] $accountUsers
     */
    private function buildSuccessResponse(array $parsed, ?string $userId, string $projectId, array $accountUsers): Result {
        $assistantMessage = isset($parsed['message']) ? trim((string) $parsed['message']) : '';
        $actions = is_array($parsed['actions'] ?? null) ? $parsed['actions'] : [];

        $executed = [];
        $errors = [];

        if (count($actions) > AssistantSystemPrompt::ACTIONS_PER_REQUEST_MAX) {
            $errors[] = 'Only the first ' . AssistantSystemPrompt::ACTIONS_PER_REQUEST_MAX
                . ' actions were run; send another message for the rest.';
            $actions = array_slice($actions, 0, AssistantSystemPrompt::ACTIONS_PER_REQUEST_MAX);
        }

        foreach ($actions as $index => $action) {
            if (!is_array($action)) {
                $errors[] = "Action #{$index} is invalid";
                continue;
            }
            $result = $this->actions->run($userId, $projectId, $action, $accountUsers);
            if ($result['ok']) {
                $executed[] = $result['detail'];
            } else {
                $errors[] = $result['detail'];
            }
        }

        return Result::ok(200, [
            'assistant_message' => $assistantMessage !== '' ? $assistantMessage : 'Done.',
            'executed_actions' => $executed,
            'errors' => $errors,
        ]);
    }

    /** @return Result value: array{user: User, project: Project} */
    private function requireProject(?string $userId, string $projectId): Result {
        if (!$userId) {
            return Result::fail(401, 'unauthorized', ['message' => 'Not authenticated']);
        }
        $userMaybe = $this->users->findById($userId);
        if (!$userMaybe->hasValue()) {
            return Result::fail(404, 'not_found', ['message' => 'User not found']);
        }
        $user = $userMaybe->value();
        $projectMaybe = $this->projects->findByIdAndAccountId($projectId, $user->accountId);
        if (!$projectMaybe->hasValue()) {
            return Result::fail(404, 'not_found', ['message' => 'Project not found']);
        }

        return Result::ok(200, ['user' => $user, 'project' => $projectMaybe->value()]);
    }
}
