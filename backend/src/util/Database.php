<?php

class Database
{
    private static ?PDO $instance = null;

    public static function connect(array $config): PDO {
        if (self::$instance === null) {
            $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset=utf8mb4";
            self::$instance = new PDO($dsn, $config['username'], $config['password'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
            ]);
        }
        return self::$instance;
    }

    public static function get(): PDO {
        if (self::$instance === null) {
            throw new RuntimeException("Database not connected. Call Database::connect() first.");
        }
        return self::$instance;
    }
}
