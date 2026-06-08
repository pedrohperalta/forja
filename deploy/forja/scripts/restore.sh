#!/usr/bin/env bash
set -euo pipefail

DRY_RUN=0
TARGET_URL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --target-url)
      TARGET_URL="${2:-}"
      shift 2
      ;;
    *)
      BACKUP_FILE="$1"
      shift
      ;;
  esac
done

: "${TARGET_URL:?--target-url is required}"
: "${BACKUP_FILE:?backup file is required}"

if [[ "$DRY_RUN" == "1" ]]; then
  echo "DRY RUN: would restore $BACKUP_FILE into $TARGET_URL"
  exit 0
fi

gunzip -c "$BACKUP_FILE" | psql "$TARGET_URL"
