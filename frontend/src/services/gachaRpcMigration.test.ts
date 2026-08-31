import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { resolve } from 'node:path'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/012_gacha_rpc_compatibility.sql')

test('gacha RPC compatibility migration exposes safe and legacy-compatible signatures', async () => {
  const sql = await readFile(migrationPath, 'utf8')

  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.gacha_pull\(p_count integer\)/)
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.gacha_pull\(\s*p_count integer,\s*p_today text,\s*p_user_id uuid,\s*p_ym text\s*\)/)
  assert.match(sql, /auth\.uid\(\)/)
  assert.match(sql, /gacha_pull_internal\(/)
})
