#!/usr/bin/env node
import { formatReport, loadExportArtifact, validateExportArtifact } from './lib.mjs'

const exportDir = process.argv[2] ?? '.migration/supabase-export'
const artifact = await loadExportArtifact(exportDir)
const report = await validateExportArtifact(artifact, { exportDir })

console.log(formatReport(report))
process.exitCode = report.ready ? 0 : 1
