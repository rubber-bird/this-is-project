<?php
/**
 * Migration runner — tracks and executes up/down SQL migrations atomically.
 *
 * Usage: php script/migrate.php <up|down|status|reset>
 */

$baseDir       = dirname(__DIR__);
$migrationsDir = $baseDir . '/migrations';

require_once $baseDir . '/src/util/EnvConfig.php';
require_once $baseDir . '/src/util/Database.php';

$env = EnvConfig::loadJson($baseDir);
Database::connect($env['database']);
$pdo = Database::get();

$pdo->exec("CREATE TABLE IF NOT EXISTS _migrations (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");

// ── Helpers ──
function getMigrations(string $dir): array {
    if (!is_dir($dir)) return [];
    $dirs = array_filter(
        scandir($dir),
        fn($d) => $d !== '.' && $d !== '..' && is_dir("$dir/$d")
    );
    sort($dirs);
    return array_values($dirs);
}

function getExecuted(PDO $pdo): array {
    $stmt = $pdo->query("SELECT name FROM _migrations ORDER BY id");
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

function runSql(PDO $pdo, string $file, string $migration, string $direction): void {
    if (!file_exists($file)) {
        echo "  SKIP  $migration — no $direction.sql\n";
        return;
    }

    $sql = file_get_contents($file);
    if (trim($sql) === '' || trim($sql) === '--') {
        echo "  SKIP  $migration — $direction.sql is empty\n";
        return;
    }

    try {
        $pdo->exec($sql);

        if ($direction === 'up') {
            $stmt = $pdo->prepare("INSERT INTO _migrations (name) VALUES (?)");
            $stmt->execute([$migration]);
        } else {
            $stmt = $pdo->prepare("DELETE FROM _migrations WHERE name = ?");
            $stmt->execute([$migration]);
        }

        $label = strtoupper($direction);
        echo "  $label    $migration\n";
    } catch (Throwable $e) {
        echo "  FAIL  $migration — {$e->getMessage()}\n";
        exit(1);
    }
}

// ── Commands ──
$action = $argv[1] ?? 'help';

switch ($action) {
    case 'up':
        $all      = getMigrations($migrationsDir);
        $executed = getExecuted($pdo);
        $pending  = array_diff($all, $executed);

        if (empty($pending)) {
            echo "Nothing to migrate.\n";
            break;
        }

        foreach ($pending as $m) {
            runSql($pdo, "$migrationsDir/$m/up.sql", $m, 'up');
        }
        echo "\nDone.\n";
        break;

    case 'down':
        $executed = getExecuted($pdo);
        if (empty($executed)) {
            echo "Nothing to roll back.\n";
            break;
        }

        $last = end($executed);
        runSql($pdo, "$migrationsDir/$last/down.sql", $last, 'down');
        echo "\nDone.\n";
        break;

    case 'status':
        $all      = getMigrations($migrationsDir);
        $executed = getExecuted($pdo);

        if (empty($all)) {
            echo "No migrations found.\n";
            break;
        }

        echo "\n";
        foreach ($all as $m) {
            $status = in_array($m, $executed) ? 'RAN    ' : 'PENDING';
            echo "  [$status]  $m\n";
        }
        echo "\n";
        break;

    case 'reset':
        $executed = array_reverse(getExecuted($pdo));
        if (empty($executed)) {
            echo "Nothing to reset.\n";
            break;
        }

        foreach ($executed as $m) {
            runSql($pdo, "$migrationsDir/$m/down.sql", $m, 'down');
        }
        echo "\nDone.\n";
        break;

    default:
        echo "Usage: php script/migrate.php <up|down|status|reset>\n";
        exit(1);
}
