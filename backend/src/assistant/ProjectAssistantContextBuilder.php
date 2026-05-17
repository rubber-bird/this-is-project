<?php

require_once __DIR__ . '/../data/WorkflowStatus.php';
require_once __DIR__ . '/../data/Task.php';
require_once __DIR__ . '/../data/User.php';

final class ProjectAssistantContextBuilder
{
    /**
     * @param WorkflowStatus[] $statusList
     * @param Task[] $taskList
     * @param User[] $accountUsers
     * @return array{
     *   statuses: list<array{id: string, name: string}>,
     *   tasks: list<array<string, mixed>>,
     *   assignees: list<array<string, string>>
     * }
     */
    public static function build(array $statusList, array $taskList, array $accountUsers): array {
        $statuses = array_map(
            static fn (WorkflowStatus $s) => ['id' => $s->id, 'name' => $s->name],
            $statusList,
        );

        $tasks = array_map(
            static fn (Task $t) => [
                'id' => $t->id,
                'title' => $t->title,
                'workflow_status_id' => $t->workflowStatusId,
                'deadline' => $t->deadline,
                'priority' => $t->priority,
                'description' => $t->blockNoteData,
            ],
            $taskList,
        );

        $assignees = array_map(
            static fn (User $u) => [
                'id' => $u->id,
                'name' => trim($u->givenName . ' ' . $u->familyName),
                'given_name' => $u->givenName,
                'family_name' => $u->familyName,
            ],
            $accountUsers,
        );

        return [
            'statuses' => $statuses,
            'tasks' => $tasks,
            'assignees' => $assignees,
        ];
    }
}
