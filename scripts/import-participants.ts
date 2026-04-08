#!/usr/bin/env node
/**
 * CLI script to import participants from a CSV file.
 * Usage: npx tsx scripts/import-participants.ts path/to/file.csv
 */

import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { parseCsvParticipants } from '../lib/csv'
import { generateToken } from '../lib/tokens'

async function main() {
  const filePath = process.argv[2]

  if (!filePath) {
    console.error('Usage: npx tsx scripts/import-participants.ts path/to/file.csv')
    process.exit(1)
  }

  const absPath = path.resolve(filePath)
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`)
    process.exit(1)
  }

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const csvContent = fs.readFileSync(absPath, 'utf-8')
  let rows

  try {
    rows = parseCsvParticipants(csvContent)
  } catch (err) {
    console.error('CSV parse error:', (err as Error).message)
    process.exit(1)
  }

  console.log(`\nProcessing ${rows.length} rows...\n`)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  let imported = 0
  let skipped = 0

  for (const row of rows) {
    const { data: existing } = await supabase
      .from('participants')
      .select('id, access_token')
      .eq('corporate_email', row.corporate_email)
      .single()

    if (existing) {
      console.log(`[SKIP]    ${row.corporate_email} — already exists`)
      console.log(`          ${appUrl}/bcr?t=${existing.access_token}`)
      skipped++
      continue
    }

    const token = generateToken()

    const { error } = await supabase.from('participants').insert({
      full_name: row.full_name,
      corporate_email: row.corporate_email,
      area: row.area || null,
      management_unit: row.management_unit || null,
      role: row.role || null,
      access_token: token,
      token_status: 'unused',
      invited_at: new Date().toISOString(),
    })

    if (error) {
      console.error(`[ERROR]   ${row.corporate_email}: ${error.message}`)
      continue
    }

    console.log(`[OK]      ${row.full_name} <${row.corporate_email}>`)
    console.log(`          ${appUrl}/bcr?t=${token}`)
    imported++
  }

  console.log(`\nDone. Imported: ${imported}, Skipped: ${skipped}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
