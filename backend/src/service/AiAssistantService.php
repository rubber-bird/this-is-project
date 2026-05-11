<?php

require_once __DIR__ . '/../util/Result.php';
require_once __DIR__ . '/../data/UserRepository.php';
require_once __DIR__ . '/../data/ProjectRepository.php';
require_once __DIR__ . '/../data/WorkflowStatusRepository.php';
require_once __DIR__ . '/../data/TaskRepository.php';
require_once __DIR__ . '/../data/WorkflowStatus.php';
require_once __DIR__ . '/../data/Task.php';
require_once __DIR__ . '/../data/User.php';
require_once __DIR__ . '/../data/Project.php';
require_once __DIR__ . '/../util/BlockNoteJson.php';
require_once __DIR__ . '/TaskService.php';

class AiAssistantService
{
    /** Max prior chat turns (user + assistant messages) sent to the model */
    private const CHAT_HISTORY_MAX_MESSAGES = 20;

    /** Cap actions per request so one prompt cannot create unbounded DB work */
    private const ACTIONS_PER_REQUEST_MAX = 40;

    public function __construct(
        private readonly UserRepository $users,
        private readonly ProjectRepository $projects,
        private readonly WorkflowStatusRepository $statuses,
        private readonly TaskRepository $tasks,
        private readonly TaskService $taskService,
        private readonly ?string $geminiApiKey,
    ) {}

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

        $history = $this->normalizeAndCapHistory($historyInput, self::CHAT_HISTORY_MAX_MESSAGES);

        $statusList = $this->statuses->findByProjectId($projectId);
        $taskList = $this->tasks->findByProjectId($projectId);

        $statusContext = array_map(
            fn (WorkflowStatus $s) => ['id' => $s->id, 'name' => $s->name],
            $statusList
        );
        $taskContext = array_map(
            fn (Task $t) => [
                'id' => $t->id,
                'title' => $t->title,
                'workflow_status_id' => $t->workflowStatusId,
                'deadline' => $t->deadline,
                'priority' => $t->priority,
                /* Stored BlockNote editor JSON; required context so edits merge instead of replacing */
                'description' => $t->blockNoteData,
            ],
            $taskList
        );

        $assigneeContext = array_map(
            static fn (User $u) => [
                'id' => $u->id,
                'name' => trim($u->givenName . ' ' . $u->familyName),
                'given_name' => $u->givenName,
                'family_name' => $u->familyName,
            ],
            $accountUsers
        );

        $systemPrompt = $this->buildSystemPrompt($statusContext, $taskContext, $assigneeContext);
        $modelResponse = $this->callGemini($systemPrompt, $history, $promptText);
        if ($modelResponse['error'] !== null) {
            return Result::fail(502, 'ai_error', ['message' => $modelResponse['error']]);
        }

        $parsed = $this->parseJsonPayload($modelResponse['text']);
        if ($parsed === null || !is_array($parsed)) {
            return Result::fail(502, 'ai_error', ['message' => 'AI response was not valid JSON']);
        }

        $assistantMessage = isset($parsed['message']) ? trim((string) $parsed['message']) : '';
        $actions = is_array($parsed['actions'] ?? null) ? $parsed['actions'] : [];

        $executed = [];
        $errors = [];
        if (count($actions) > self::ACTIONS_PER_REQUEST_MAX) {
            $errors[] = 'Only the first ' . self::ACTIONS_PER_REQUEST_MAX . ' actions were run; send another message for the rest.';
            $actions = array_slice($actions, 0, self::ACTIONS_PER_REQUEST_MAX);
        }
        foreach ($actions as $index => $action) {
            if (!is_array($action)) {
                $errors[] = "Action #{$index} is invalid";
                continue;
            }
            $result = $this->executeAction($userId, $projectId, $action, $accountUsers);
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

    /**
     * @param array<string, mixed> $action
     * @param User[] $accountUsers
     */
    private function executeAction(?string $userId, string $projectId, array $action, array $accountUsers): array {
        $type = strtolower(trim((string) ($action['type'] ?? '')));

        if ($type === 'create_task') {
            $title = (string) ($action['title'] ?? '');
            $description = array_key_exists('description', $action)
                ? $this->normalizeAiBlockNotePayload($action['description'])
                : null;
            $deadline = isset($action['deadline']) ? (string) $action['deadline'] : null;
            $priority = isset($action['priority']) ? (string) $action['priority'] : null;
            $statusId = isset($action['workflow_status_id']) ? (string) $action['workflow_status_id'] : null;
            $hasAssignedTo = array_key_exists('assigned_to', $action);
            $assignedTo = null;
            if ($hasAssignedTo) {
                $resolved = $this->resolveAssigneeValue($action['assigned_to'], $accountUsers);
                if ($resolved['error'] !== null) {
                    return ['ok' => false, 'detail' => $resolved['error']];
                }
                $assignedTo = $resolved['value'];
            }

            $created = $this->taskService->create(
                $userId,
                $projectId,
                $title,
                $description,
                $deadline,
                $priority,
            );
            if ($created->failed()) {
                return ['ok' => false, 'detail' => 'Create task failed: ' . ($created->body()['message'] ?? 'Unknown error')];
            }
            $createdTask = $created->value();
            $taskId = (string) ($createdTask['id'] ?? '');
            if ($taskId === '') {
                return ['ok' => false, 'detail' => 'Create task failed: missing task id'];
            }

            if ($statusId !== null || $hasAssignedTo) {
                $patch = [];
                if ($statusId !== null && $statusId !== '') {
                    $patch['workflow_status_id'] = $statusId;
                }
                if ($hasAssignedTo) {
                    $patch['assigned_to'] = $assignedTo;
                }
                if ($patch !== []) {
                    $updated = $this->taskService->update($userId, $projectId, $taskId, $patch);
                    if ($updated->failed()) {
                        return ['ok' => false, 'detail' => 'Create task follow-up update failed: ' . ($updated->body()['message'] ?? 'Unknown error')];
                    }
                }
            }

            return ['ok' => true, 'detail' => 'Created task "' . ((string) ($createdTask['title'] ?? $title)) . '"'];
        }

        if ($type === 'update_task') {
            $taskId = trim((string) ($action['task_id'] ?? ''));
            if ($taskId === '') {
                return ['ok' => false, 'detail' => 'Update task failed: task_id is required'];
            }
            $patch = [];
            foreach (['title', 'workflow_status_id', 'deadline', 'priority'] as $field) {
                if (array_key_exists($field, $action)) {
                    $patch[$field] = $action[$field];
                }
            }
            if (array_key_exists('blockNoteData', $action)) {
                $patch['blockNoteData'] = $this->normalizeAiBlockNotePayload($action['blockNoteData']);
            }
            if (array_key_exists('description', $action)) {
                $patch['blockNoteData'] = $this->normalizeAiBlockNotePayload($action['description']);
            }
            if (array_key_exists('assigned_to', $action)) {
                $resolved = $this->resolveAssigneeValue($action['assigned_to'], $accountUsers);
                if ($resolved['error'] !== null) {
                    return ['ok' => false, 'detail' => $resolved['error']];
                }
                $patch['assigned_to'] = $resolved['value'];
            }
            $this->dropEmptyDescriptionPatch($patch);
            $updated = $this->taskService->update($userId, $projectId, $taskId, $patch);
            if ($updated->failed()) {
                return ['ok' => false, 'detail' => 'Update task failed: ' . ($updated->body()['message'] ?? 'Unknown error')];
            }
            $task = $updated->value();
            return ['ok' => true, 'detail' => 'Updated task "' . ((string) ($task['title'] ?? $taskId)) . '"'];
        }

        if ($type === 'delete_task') {
            $taskId = trim((string) ($action['task_id'] ?? ''));
            if ($taskId === '') {
                return ['ok' => false, 'detail' => 'Delete task failed: task_id is required'];
            }
            $deleted = $this->taskService->delete($userId, $projectId, $taskId);
            if ($deleted->failed()) {
                return ['ok' => false, 'detail' => 'Delete task failed: ' . ($deleted->body()['message'] ?? 'Unknown error')];
            }
            return ['ok' => true, 'detail' => 'Deleted task ' . $taskId];
        }

        return ['ok' => false, 'detail' => 'Unsupported action type: ' . $type];
    }

    private function buildSystemPrompt(array $statusContext, array $taskContext, array $assigneeContext): string {
        $today = date('Y-m-d');
        $tz = date_default_timezone_get();

        return
            "You are a project-planning assistant for a task board. Your job is to turn goals into executable board changes so users can set up or refine work in minutes instead of manually creating many cards.\n" .
            "Typical uses: break a large goal into phases or milestones; generate many tasks from a template (same priority, status, assignee, or deadline pattern); bulk-update priorities or statuses; reorganize descriptions.\n" .
            "When the user describes a project, feature, or epic, decompose it into concrete, actionable tasks with clear titles. Order actions in a sensible sequence (e.g. dependencies or phases). If scope is huge, still output a useful first batch of create_task actions and summarize what is left in \"message\".\n" .
            "For bulk creation (roughly 10+ tasks), keep each description concise unless the user asks for rich detail on every item — prefer a short paragraph or a small checklist per task so the JSON stays compact.\n" .
            "When the user specifies shared fields for a batch (e.g. \"all high priority\", \"put in Backlog\", \"assign to Alex\"), set workflow_status_id, priority, assigned_to, and deadline consistently on every create_task in that batch using only Known statuses and assignees.\n" .
            "Reply with JSON only. Do not include markdown fences.\n" .
            "Allowed action types: create_task, update_task, delete_task.\n" .
            "JSON schema:\n" .
            "{\n" .
            '  "message": string,' . "\n" .
            '  "actions": Array<Action>' . "\n" .
            "}\n" .
            "Action payloads:\n" .
            "- create_task: {type, title, description?, deadline?, priority?, workflow_status_id?, assigned_to?}\n" .
            "- update_task: {type, task_id, title?, description?, deadline?, priority?, workflow_status_id?, assigned_to?}\n" .
            "- delete_task: {type, task_id}\n" .
            "For description you may output either a JSON array of BlockNote blocks (preferred) or one JSON string containing that array.\n" .
            "The stored document root MUST be that array only — e.g. [{\"type\":\"paragraph\",...},...]. Never wrap blocks in ProseMirror/TipTap form {\"type\":\"doc\",\"content\":[...]}; that shape is invalid for this app.\n" .
            "deadline values must be ISO dates YYYY-MM-DD or null to clear.\n" .
            "assigned_to must be the user's id from Known assignees, or null to unassign. You may also output the exact full name or given name only if it uniquely matches one assignee; the server will resolve it.\n" .
            "Task descriptions are rendered by BlockNote. Each Known task includes \"description\": the full stored JSON string (or null if empty).\n" .
            "When the user asks for structured or rich content (tables, checklists, headings, quotes, code, lists, dividers, bold/italic/colors, links, emojis), you MUST encode it as BlockNote blocks in \"description\" — do not substitute Markdown-only or plain-text summaries unless they ask for plain text only.\n" .
            "Infer BlockNote blocks from how they phrase the request (match intent, not only keywords):\n" .
            "- Tabular layout (table, grid, rows/columns, matrix, spreadsheet-like, \"compare X and Y\", \"with examples in columns\", headers + cells) → type \"table\" with tableContent.\n" .
            "- Checkboxes / to-do items / checklist / \"tick off\" / tasks to complete → \"checkListItem\" with props.checked true/false per item.\n" .
            "- Ordered sequence (numbered list, 1. 2. 3., steps, \"list from 1 to N\", priority order) → \"numberedListItem\".\n" .
            "- Unordered bullets (bullet list, dash list, \"items\", sub-points without numbering) → \"bulletListItem\"; nest deeper levels in children.\n" .
            "- Section titles (heading, title, subtitle, \"##\", chapter/section) → \"heading\" with props.level (1 = page title, 2–3 = sections, 4–6 = subsections).\n" .
            "- Code or monospace snippet (code block, snippet, program, shell command, syntax) → \"codeBlock\"; pick props.language when obvious else \"text\".\n" .
            "- Quotation / callout / cite — \"blockquote\" style prose → \"quote\".\n" .
            "- Separator between sections (horizontal rule, divider, line between parts) → \"divider\".\n" .
            "- Plain sentences or intro/outro without structure → \"paragraph\".\n" .
            "- Rich inline styling (bold, italic, underline, strikethrough, inline code, link URL, text/background color, emoji) → keep \"paragraph\"/list cells/headings but set styles on {\"type\":\"text\",...} nodes or use {\"type\":\"link\",...}.\n" .
            "- If they ask for multiple structures (e.g. \"heading then table\"), compose blocks in reading order top-to-bottom.\n" .
            "BlockNote block shape: each item has type, props (block-specific), content (inline nodes OR tableContent object), children (nested blocks; usually []).\n" .
            'Default props for most inline blocks: props.backgroundColor="default", props.textColor="default", props.textAlignment="left" where applicable.' . "\n" .
            'Block types to use: paragraph; heading (props.level 1-6); bulletListItem; numberedListItem; checkListItem (props.checked boolean — required for checklists/to-dos); quote; codeBlock (props.language e.g. "typescript" or "text"); divider ({"type":"divider","props":{},"children":[]}). Table: {"type":"table","props":{"textColor":"default"},"content":{"type":"tableContent","columnWidths":[120,120],"rows":[{"cells":[[{"type":"text","text":"R1C1","styles":{}}],[{"type":"text","text":"R1C2","styles":{}}]]}]},"children":[]}. Each cell is an array of inline nodes; same number of cells per row.' . "\n" .
            'Inline nodes: text as {"type":"text","text":"...","styles":{}} — put emojis and Unicode directly in text. Styles object may set bold, italic, underline, strike, code (booleans), textColor, backgroundColor (strings; use "default" or palette keys as in existing tasks).' . "\n" .
            'Links: {"type":"link","href":"https://example.com","content":[{"type":"text","text":"label","styles":{}}]}.' . "\n" .
            'Nest sub-bullets or sub-checkboxes using children on list item blocks.' . "\n" .
            "You may omit \"id\" on each block or use valid UUID v4; fake ids are stripped server-side.\n" .
            "When the user asks to add, fix, or change note/description/body content: put the FULL merged JSON in update_task \"description\" — start from that task's existing \"description\" in Known tasks, apply only the requested edits, and output the complete valid JSON string. Never replace it with a fragment, summary, or shorter substitute.\n" .
            "Do not include \"description\" in update_task unless the user wants the note text changed. Omit it for deadline-only, assignee-only, title-only, or status-only requests.\n" .
            "Never clear or shrink note content unless the user explicitly asks to delete, remove, clear, wipe, or replace the entire note. To clear the note body, set \"description\" to JSON null.\n" .
            "Do not use an empty string for description (that is ignored). Use null only to clear when explicitly requested.\n" .
            "Use only known task IDs and status IDs from context.\n" .
            "Users may refer to tasks by title or order; known tasks are listed in board order (oldest first).\n" .
            "Current date (server, {$tz}): {$today}. Use it for relative dates (e.g. \"in 3 days\", \"next Friday\") and for extending deadlines.\n" .
            "If a task has no deadline and the user asks to extend it, ask which date to use or suggest setting an initial deadline.\n" .
            "If date in request does not include year, assume the current calendar year from Current date.\n" .
            "If request is unclear, return no actions and ask a short clarifying question in message.\n" .
            "Known statuses: " . json_encode($statusContext) . "\n" .
            "Known tasks: " . json_encode($taskContext) . "\n" .
            "Known assignees: " . json_encode($assigneeContext);
    }

    /**
     * Gemini may return BlockNote content as a native JSON array or as an escaped JSON string.
     *
     * @return string|null Encoded document string, or null to omit / clear body
     */
    private function normalizeAiBlockNotePayload(mixed $raw): ?string {
        if ($raw === null) {
            return null;
        }
        if (is_array($raw)) {
            $unwrapped = BlockNoteJson::unwrapRootDocNode($raw);
            try {
                $json = json_encode($unwrapped, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
            } catch (Throwable) {
                return null;
            }

            return BlockNoteJson::stripBlockIdsFromDocument($json);
        }
        $s = trim((string) $raw);
        if ($s === '') {
            return null;
        }

        return BlockNoteJson::stripBlockIdsFromDocument($s);
    }

    /**
     * The model sometimes sends description: "" which would clear the note after normalization; ignore that.
     *
     * @param array<string, mixed> $patch
     */
    private function dropEmptyDescriptionPatch(array &$patch): void {
        if (!array_key_exists('blockNoteData', $patch)) {
            return;
        }
        $v = $patch['blockNoteData'];
        if ($v === null) {
            return;
        }
        if (is_string($v) && trim($v) === '') {
            unset($patch['blockNoteData']);
        }
    }

    /**
     * Resolves assigned_to for task actions: UUID, null/unassign, or a name matching exactly one account member.
     *
     * @param User[] $accountUsers
     * @return array{value: string|null, error: string|null}
     */
    private function resolveAssigneeValue(mixed $raw, array $accountUsers): array {
        if ($raw === null) {
            return ['value' => null, 'error' => null];
        }
        $s = trim((string) $raw);
        if ($s === '') {
            return ['value' => null, 'error' => null];
        }

        if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $s)) {
            foreach ($accountUsers as $u) {
                if (strcasecmp($u->id, $s) === 0) {
                    return ['value' => $u->id, 'error' => null];
                }
            }

            return ['value' => null, 'error' => 'Assignee id is not a member of this account'];
        }

        $norm = static function (string $x): string {
            return function_exists('mb_strtolower')
                ? mb_strtolower($x, 'UTF-8')
                : strtolower($x);
        };

        $needle = $norm($s);
        $matches = [];
        foreach ($accountUsers as $u) {
            $full = $norm(trim($u->givenName . ' ' . $u->familyName));
            $given = $norm($u->givenName);
            $family = $norm($u->familyName);
            if ($full === $needle || $given === $needle || $family === $needle) {
                $matches[] = $u;
            }
        }

        if (count($matches) === 1) {
            return ['value' => $matches[0]->id, 'error' => null];
        }
        if (count($matches) === 0) {
            return ['value' => null, 'error' => 'Could not match assignee to a team member'];
        }

        return ['value' => null, 'error' => 'Multiple team members match that name; use full name or user id'];
    }

    /**
     * @return list<array{role: string, text: string}>
     */
    private function normalizeAndCapHistory(mixed $raw, int $maxItems): array {
        if (!is_array($raw)) {
            return [];
        }
        $out = [];
        foreach ($raw as $item) {
            if (!is_array($item)) {
                continue;
            }
            $role = strtolower(trim((string) ($item['role'] ?? '')));
            $text = trim((string) ($item['text'] ?? ''));
            if ($text === '') {
                continue;
            }
            if ($role !== 'user' && $role !== 'assistant') {
                continue;
            }
            $out[] = ['role' => $role, 'text' => $text];
        }
        if (count($out) > $maxItems) {
            $out = array_slice($out, -$maxItems);
        }

        while ($out !== [] && $out[0]['role'] === 'assistant') {
            array_shift($out);
        }

        return $out;
    }

    /**
     * @param list<array{role: string, text: string}> $history
     */
    private function callGemini(string $systemPrompt, array $history, string $userPrompt): array {
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' . rawurlencode($this->geminiApiKey);

        $contents = [];
        foreach ($history as $turn) {
            $gemRole = $turn['role'] === 'assistant' ? 'model' : 'user';
            $contents[] = [
                'role' => $gemRole,
                'parts' => [['text' => $turn['text']]],
            ];
        }
        $contents[] = [
            'role' => 'user',
            'parts' => [['text' => $userPrompt]],
        ];

        $payload = json_encode([
            'systemInstruction' => [
                'parts' => [['text' => $systemPrompt]],
            ],
            'contents' => $contents,
            'generationConfig' => [
                'temperature' => 0.2,
                'maxOutputTokens' => 8192,
                'responseMimeType' => 'application/json',
            ],
        ]);

        if ($payload === false) {
            return ['text' => '', 'error' => 'Failed to serialize AI request'];
        }

        $ctx = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => $payload,
                'timeout' => 90,
                'ignore_errors' => true,
            ],
        ]);

        $responseText = @file_get_contents($url, false, $ctx);
        if ($responseText === false) {
            return ['text' => '', 'error' => 'Failed to contact Gemini API'];
        }

        $decoded = json_decode($responseText, true);
        if (!is_array($decoded)) {
            return ['text' => '', 'error' => 'Gemini response was not JSON'];
        }
        if (isset($decoded['error']['message'])) {
            return ['text' => '', 'error' => 'Gemini API error: ' . (string) $decoded['error']['message']];
        }

        $text = (string) ($decoded['candidates'][0]['content']['parts'][0]['text'] ?? '');
        if ($text === '') {
            return ['text' => '', 'error' => 'Gemini returned empty output'];
        }

        return ['text' => $text, 'error' => null];
    }

    private function parseJsonPayload(string $text): mixed {
        $trimmed = trim($text);
        if (str_starts_with($trimmed, '```')) {
            $trimmed = preg_replace('/^```[a-zA-Z]*\s*/', '', $trimmed) ?? $trimmed;
            $trimmed = preg_replace('/\s*```$/', '', $trimmed) ?? $trimmed;
            $trimmed = trim($trimmed);
        }
        return json_decode($trimmed, true);
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
