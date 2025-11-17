#!/usr/bin/env tsx
/**
 * Apply pending migrations to Supabase
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function applyMigrations() {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.startsWith('20251117_') && file.endsWith('.sql'))
    .sort()

  console.log(`📂 Found ${migrationFiles.length} migrations to apply`)

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file)
    const sql = fs.readFileSync(filePath, 'utf-8')

    console.log(`\n🔧 Applying: ${file}`)

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

      if (error) {
        // Try direct execution if exec_sql doesn't exist
        console.log('  ℹ️  Trying direct execution...')
        const lines = sql
          .split('\n')
          .filter((line) => line.trim() && !line.trim().startsWith('--'))
        const queries = lines.join('\n').split(';').filter((q) => q.trim())

        for (const query of queries) {
          const trimmed = query.trim()
          if (!trimmed) continue

          const { error: directError } = await supabase.rpc('exec', {
            sql: trimmed,
          })

          if (directError) {
            console.error(`  ❌ Error:`, directError.message)
            // Continue with next query
          } else {
            console.log(`  ✅ Executed query segment`)
          }
        }
      } else {
        console.log(`  ✅ Applied successfully`)
      }
    } catch (err) {
      console.error(`  ❌ Error:`, err)
    }
  }

  console.log('\n✅ Migration process complete')
}

applyMigrations()
