#!/usr/bin/env node
console.error(
  [
    'Photo downloads are performed from Supabase Storage into:',
    '.migration/supabase-export/files/equipment-photos/{userId}/{exerciseId}.jpg',
    'Use Supabase MCP when available, or a local service-role-only helper outside Git.',
  ].join('\n'),
)
process.exit(1)
