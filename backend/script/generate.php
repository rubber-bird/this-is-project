<?php
/**
 * Migration generator — creates a numbered directory with up.sql and down.sql.
 *
 * Usage: php script/generate.php <migration_name>
 */

$baseDir       = dirname(__DIR__);
$migrationsDir = $baseDir . '/migrations';

$name = $argv[1] ?? null;

if (!$name) {
    echo "Usage: php script/generate.php <migration_name>\n";
    echo "Example: php script/generate.php create_users_table\n";
    exit(1);
}

if (!is_dir($migrationsDir)) {
    mkdir($migrationsDir, 0755, true);
}

// Auto-detect next sequence number
$existing = array_filter(
    scandir($migrationsDir),
    fn($d) => $d !== '.' && $d !== '..' && is_dir("$migrationsDir/$d")
);
$next     = count($existing) + 1;
$prefix   = str_pad($next, 3, '0', STR_PAD_LEFT);
$dirName  = "{$prefix}_{$name}";
$fullPath = "$migrationsDir/$dirName";

mkdir($fullPath, 0755, true);
file_put_contents("$fullPath/up.sql",   "-- $dirName (up)\n\n");
file_put_contents("$fullPath/down.sql", "-- $dirName (down)\n\n");

echo "Created: migrations/$dirName/\n";
echo "  up.sql\n";
echo "  down.sql\n";
