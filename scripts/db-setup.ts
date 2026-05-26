/**
 * Bootstrap completo de la DB en orden seguro:
 *
 *   1. Crea extensiones (vector, pgcrypto)        — drizzle/extensions.sql
 *   2. Aplica el schema (drizzle-kit push)        — invocar manualmente antes
 *   3. Aplica políticas RLS                       — drizzle/rls.sql
 *   4. Siembra categorías sistema                 — scripts/seed-categories.ts
 *
 * Este script ejecuta 1 y 3. El paso 2 lo corre `pnpm db:push` (queda fuera para
 * que el usuario pueda revisar el diff antes de aplicar). El paso 4 corre con
 * `pnpm db:seed`.
 *
 * Uso: pnpm tsx --env-file=.env.local scripts/db-setup.ts
 */

import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import postgres from 'postgres'

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!url) {
  console.error('Falta DIRECT_URL o DATABASE_URL.')
  process.exit(1)
}

const sql = postgres(url, { prepare: false, max: 1 })

async function runSqlFile(relativePath: string) {
  const abs = path.resolve(process.cwd(), relativePath)
  const content = await readFile(abs, 'utf8')
  console.log(`Aplicando ${relativePath}...`)
  await sql.unsafe(content)
  console.log(`  Hecho.`)
}

async function main() {
  await runSqlFile('drizzle/extensions.sql')
  await runSqlFile('drizzle/rls.sql')
  console.log('Bootstrap completo.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await sql.end()
  })
