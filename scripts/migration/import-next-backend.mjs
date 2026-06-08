#!/usr/bin/env node
import { formatReport, runDryRun } from './lib.mjs'

const exportDir = process.argv[2] === '--dry-run'
  ? process.argv[3] ?? '.migration/supabase-export'
  : process.argv[2] ?? '.migration/supabase-export'

if (!process.argv.includes('--dry-run')) {
  console.error('Direct database import is intentionally not automated. Generate and review import-forja.sql instead.')
  process.exit(1)
}

const report = await runDryRun({ exportDir })
console.log(formatReport(report))
process.exitCode = report.ready ? 0 : 1
