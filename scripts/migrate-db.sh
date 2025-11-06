#!/bin/bash
set -e

# Database migration script
# Runs all SQL migrations against PostgreSQL database
# Requires DATABASE_URL environment variable to be set

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set"
  exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATION_FILE="$PROJECT_ROOT/lib/db/migrate.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "Error: Migration file not found at $MIGRATION_FILE"
  exit 1
fi

echo "Running database migrations from $MIGRATION_FILE..."

# Execute the migration SQL file
psql "$DATABASE_URL" -f "$MIGRATION_FILE"

echo "Database migrations completed successfully"
