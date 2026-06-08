#!/usr/bin/env node
console.error(
  [
    'Supabase export is project-scoped and should use the configured read-only Supabase MCP when available.',
    'Expected output directory: .migration/supabase-export/',
    'Expected files: users.json, oauth-accounts.json, plans.json, workout-sessions.json, equipment-photos.json.',
  ].join('\n'),
)
process.exit(1)
