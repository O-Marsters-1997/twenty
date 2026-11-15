#!/bin/sh
set -e

if [ "${DISABLE_DB_MIGRATIONS}" = "true" ]; then
    echo "Database setup and migrations are disabled, skipping..."
else
    echo "Running database setup and migrations..."
    /app/migrate up
    echo "Successfully migrated DB!"
fi

exec "$@"
