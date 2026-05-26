# Finanzia — Estado del proyecto

> Archivo vivo. **Actualízalo al cerrar cada step o al tomar una decisión que afecte el rumbo.**
> El builder lo lee al inicio de cada sesión para no perder continuidad.
>
> Última actualización: 2026-05-25 — Step 2 cerrado, esperando DB live vía MCP de Supabase.

---

## Build Order — Estado

| # | Step | Estado | Notas |
|---|------|--------|-------|
| 1 | Scaffolding & base infra | ✅ hecho | Commit `chore: bootstrap finanzia repo (steps 1-2)` |
| 2 | Database — schema + migración + RLS + seed | ⚠ código listo, DB NO aplicada | Migración generada en `drizzle/migrations/0000_mixed_toad_men.sql`. Falta correr contra Supabase real |
| 3 | Auth — Clerk + webhook sync | ⏳ pendiente | |
| 4 | Design system — tokens, fonts, theme | ⏳ pendiente | |
| 5 | Layout principal — Rail + Cmd+K + View transitions | ⏳ pendiente | |
| 6 | CRUD cuentas + transacciones manual | ⏳ pendiente | |
| 7 | Categorías + presupuestos | ⏳ pendiente | |
| 8 | Import CSV con mapping inteligente | ⏳ pendiente | |
| 9 | Auto-categorización con IA + embeddings | ⏳ pendiente | |
| 10 | Insights engine + cron diario | ⏳ pendiente | |
| 11 | Copiloto Finanzia con tool-calling | ⏳ pendiente | |
| 12 | Metas, recurring, tarjetas, alertas, deploy | ⏳ pendiente | |

---

## Next action

**Aplicar la DB a Supabase vía el MCP server, sin requerir credenciales locales todavía.**

Cuando la sesión nueva arranque, el usuario ya habrá autenticado el MCP de Supabase (project_ref `anyinryjupznpouaxhtp`). El builder debe:

1. Verificar que el MCP `supabase` está conectado (su nombre debería aparecer en system-reminders como server activo, sus tools como `mcp__supabase__*`).
2. Ejecutar en este orden, leyendo cada archivo del repo y aplicándolo con la tool SQL del MCP:
   1. `drizzle/extensions.sql` — habilita `vector` y `pgcrypto`.
   2. `drizzle/migrations/0000_mixed_toad_men.sql` — crea tablas, enums, índices, FKs y el HNSW.
   3. `drizzle/rls.sql` — políticas RLS.
   4. Sembrar las ~49 categorías sistema. Opción A: traducir `scripts/seed-categories.ts` a SQL `INSERT` y aplicarlo vía MCP. Opción B (si MCP tiene tool para exportar credenciales) leerlas, escribir `.env.local`, y correr `pnpm db:seed`. Preferir A si el MCP no expone secretos.
3. Validar que `select count(*) from categories where user_id is null` devuelva > 40.
4. Si el MCP expone un tool para listar conn-strings / API keys (típico: `get_project_url`, `get_anon_key`, etc.), autollenar `.env.local` con esos valores. Si no, dejar `.env.local` con placeholders y pedir al usuario que copie de su dashboard (las instrucciones ya están en `.env.example`).
5. Al terminar, actualizar este archivo: cambiar Step 2 de ⚠ a ✅, mover la "Next action" al inicio de Step 3 (Clerk).

---

## Decisiones tomadas (no las re-discutas sin razón nueva)

| Decisión | Por qué |
|---|---|
| **Next 16.2.6** en vez de Next 15 | Es lo que instala `create-next-app@latest`. APIs RSC/Server Actions/`experimental.viewTransition` son idénticas. |
| Proyecto en raíz `/finanzia-app` (no en subcarpeta) | El directorio ya estaba bautizado. Mover el blueprint a `docs/` lo dejó limpio. |
| **Repo en GitHub: `tridentcol/Eztadia-app`** | Nombre del repo definido por el usuario. El producto sigue llamándose Finanzia. |
| `pnpm-workspace.yaml` con `allowBuilds: sharp, unrs-resolver, @clerk/shared, esbuild, msw` | pnpm 11 bloquea postinstalls por seguridad. Necesario aprobar uno por uno. |
| **shadcn 4.8.0 como runtime dep** | Patrón v4 de shadcn — la CLI vive en el proyecto. Si se moviera a devDeps, `pnpm shadcn add ...` deja de funcionar. |
| `current_balance` NO existe como columna en `accounts` | Blueprint sugería view o trigger. Lo computamos en query a partir de transactions para evitar desincronización. |
| **49 categorías sembradas** (blueprint dice "50") | Conjunto razonable de padres + hijos. Si el usuario quiere un set específico distinto, pedir. |
| Paleta de categorías = 8 swatches muted **sin** `accent-ai` | `accent-ai` (#B8A6F5) está reservado a presencia de IA según mandato estético. |
| Índices en `transactions` SIN cláusula `WHERE deleted_at IS NULL` | La API `index().where(...)` de Drizzle 0.45 en `pgTable` callback no resolvía limpio. Índices globales funcionan igual con soft delete. |
| `db:push` y `db:bootstrap` separados en `package.json` | Permite revisar el diff antes de aplicar. Flujo: `db:push` → `db:bootstrap` → `db:seed`. |
| Blueprint en `docs/finanzia-blueprint.md` | Fuente de verdad. Si CLAUDE.md y blueprint contradicen, blueprint gana. |

---

## Gotchas conocidos (evita volver a tropezar)

- **pnpm 11 + postinstall scripts**: cualquier dep nueva con script puede agregar `set this to true or false` al `pnpm-workspace.yaml`. Editar a `true` explícito.
- **drizzle-kit** lee `.env.local` SOLO porque `drizzle.config.ts` lo carga con `dotenv` manualmente. No confiar en autodetección.
- **postgres-js + Supabase pooler**: `prepare: false` es obligatorio para el transaction pooler (puerto 6543). Sin eso, los prepared statements pelean con el pooler.
- **`vector` columna**: requiere `CREATE EXTENSION vector;` ANTES de aplicar la migración. El orden en `extensions.sql` → migración es importante.
- **`server-only`** está importado en `src/lib/db/client.ts` para que un import accidental desde un client component reviente el build.
- **RLS con `auth.jwt() ->> 'sub'`**: solo funciona si la conexión Postgres lleva un JWT válido (integración Clerk-Supabase). Drizzle con `postgres` role bypassea RLS — es defensa en profundidad, no protección primaria. La protección primaria es el filtro `user_id = currentUser.id` en cada query.

---

## Estado del repo

- Repo remoto: `https://github.com/tridentcol/Eztadia-app`
- Branch: `main`
- Último commit: `chore: bootstrap finanzia repo (steps 1-2)` (`git log --oneline -1`)
- Working tree: limpio tras el commit inicial. Si después de ese commit se agregaron archivos, listar.

---

## Config / integraciones externas

| Servicio | Estado | Notas |
|---|---|---|
| Supabase project | `anyinryjupznpouaxhtp` (us-east-1) | Proyecto creado por el usuario |
| Supabase MCP server | Configurado en `.mcp.json` (project scope) | Usuario debe correr `/mcp` y autenticar en sesión nueva |
| Clerk | ⏳ no creado | Necesario en Step 3 |
| Anthropic API | ⏳ no provisto | Necesario en Step 9+ |
| OpenAI API | ⏳ no provisto | Solo para embeddings (Step 9) |
| Upstash Redis | ⏳ no creado | Step 8+ (rate limit / cache) |
| Trigger.dev | ⏳ no creado | Step 8 (job de import CSV) |
| Sentry | ⏳ no creado | Step 12 (deploy) |
| Vercel | ⏳ no creado | Step 12 |

`.env.local` aún no existe. Las instrucciones de dónde sacar cada variable están en `.env.example`.

---

## Cómo actualizar este archivo

Al cerrar un step:
1. Marca el step ✅ en la tabla de arriba.
2. Mueve "Next action" al primer punto concreto del siguiente step.
3. Si tomaste una decisión nueva, agrégala a "Decisiones tomadas" con su `por qué`.
4. Si tropezaste con algo no documentado, agrégalo a "Gotchas".
5. Si se creó/conectó un servicio externo, actualiza "Config / integraciones externas".
6. Cambia la línea "Última actualización" de arriba.
