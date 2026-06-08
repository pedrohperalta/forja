#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
UPLOADS_DIR="${UPLOADS_DIR:-/data/uploads}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DRY_RUN="${DRY_RUN:-0}"

mkdir -p "$BACKUP_DIR"

run_retention() {
  find "$BACKUP_DIR" -type f \( -name '*.sql.gz' -o -name '*.tar.gz' \) -mtime +"$RETENTION_DAYS" -delete
}

if [ "${1:-}" = "--retention-only" ]; then
  run_retention
  exit 0
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
db_backup="$BACKUP_DIR/forja-db-$timestamp.sql.gz"
uploads_backup="$BACKUP_DIR/forja-uploads-$timestamp.tar.gz"

if [ "$DRY_RUN" = "1" ]; then
  echo "DRY RUN: would write $db_backup"
  echo "DRY RUN: would write $uploads_backup"
  echo "DRY RUN: would delete backups older than $RETENTION_DAYS days"
  exit 0
fi

: "${DATABASE_URL:?DATABASE_URL is required}"

pg_dump "$DATABASE_URL" | gzip -c > "$db_backup"

if [ -d "$UPLOADS_DIR" ]; then
  tar -czf "$uploads_backup" -C "$UPLOADS_DIR" .
fi

run_retention
