# Server

## Configuration

1. Copy `env.example.json` to `env.json` in this directory.
2. Set **database** `host`, `port`, `database`, `username`, and `password` for MySQL.
3. Optional: set **gemini_api_key** for the in-app project assistant (Google Gemini). You can leave it empty if you do not use that feature, or set the **`GEMINI_API_KEY`** environment variable instead (it overrides `env.json` when non-empty).

## Run

The server would be accessible at http://localhost:9003/

Command to lauch php from `backend` dir:

```sh
php -S localhost:9003 router.php
```

## Database

script/
├── migrate.php ← Engine: up, down, status, reset (atomic tracked)
├── generate.php ← Creates numbered migration dirs with up.sql + down.sql
└── migrate.sh ← Bash wrapper for both

migrations/

Usage:

# Generate a new migration

./script/migrate.sh generate add_avatar_to_users

# Run all pending migrations

./script/migrate.sh up

# Roll back the last migration

./script/migrate.sh down

# Roll back everything

./script/migrate.sh reset

# See what's run and what's pending

./script/migrate.sh status

Migrations are tracked in a \_migrations table and each runs inside a transaction.
