# Server

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
