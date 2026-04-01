#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"

case "${1:-help}" in
    up|down|status|reset)
        php "$DIR/migrate.php" "$1"
        ;;
    generate)
        if [ -z "${2:-}" ]; then
            echo "Usage: ./migrate.sh generate <migration_name>"
            exit 1
        fi
        php "$DIR/generate.php" "$2"
        ;;
    *)
        echo "Usage: ./migrate.sh <up|down|status|reset|generate <name>>"
        ;;
esac
