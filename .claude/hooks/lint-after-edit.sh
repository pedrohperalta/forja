#!/usr/bin/env bash
# Claude Code PostToolUse hook (Edit | Write | MultiEdit).
#
# Lints the just-edited web/ or packages/domain TypeScript file and reports any
# problems to stderr so the model can self-correct immediately. It is advisory:
# it never blocks an edit (always exits 0). The authoritative gate is `pnpm
# verify` on pre-push.
set -u

project_dir="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
payload="$(cat)"
file="$(printf '%s' "$payload" | node -e 'const fs=require("fs");try{const j=JSON.parse(fs.readFileSync(0,"utf8"));process.stdout.write(j?.tool_input?.file_path??"")}catch{}' 2>/dev/null)"

[ -n "$file" ] || exit 0

case "$file" in
  *.ts | *.tsx) ;;
  *) exit 0 ;;
esac

case "$file" in
  *node_modules* | */.next/* | */dist/* | */db/migrations/*) exit 0 ;;
esac

# Only lint files that belong to a workspace with an ESLint config.
pkg=""
case "$file" in
  "$project_dir"/web/*) pkg="$project_dir/web" ;;
  "$project_dir"/packages/domain/*) pkg="$project_dir/packages/domain" ;;
  *) exit 0 ;;
esac

rel="${file#"$pkg"/}"

if ! out="$(cd "$pkg" && pnpm exec eslint "$rel" 2>&1)"; then
  printf 'lint-after-edit: ESLint reported problems in %s\n%s\n' "$rel" "$out" >&2
fi

exit 0
