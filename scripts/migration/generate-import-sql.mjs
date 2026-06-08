#!/usr/bin/env node
import { join } from 'node:path'

import { generateImportSql } from './lib.mjs'

const exportDir = process.argv[2] ?? '.migration/supabase-export'
const outputPath = join(exportDir, 'import-forja.sql')

await generateImportSql({ exportDir, outputPath })
console.log(`Generated ${outputPath}`)
