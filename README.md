# Eztadia-app

Repositorio de **Finanzia** — webapp de finanzas personales con IA.
Multi-tenant ready, single-user MVP. Núcleo en español. Multi-divisa (COP base, USD secundaria).

El blueprint completo y autocontenido vive en [`docs/finanzia-blueprint.md`](docs/finanzia-blueprint.md). Es la fuente de verdad de arquitectura, modelo de datos, build order y mandato estético.

---

## Stack

Next.js 16 (App Router, RSC, Server Actions) · TypeScript strict · Tailwind v4 · shadcn/ui · Supabase Postgres · Drizzle ORM + pgvector · Clerk · Vercel AI SDK (Claude Sonnet 4.6) · Visx · Motion · Vercel.

## Quick start

```bash
pnpm install
cp .env.example .env.local        # llena las variables (ver instrucciones dentro)
pnpm db:push                       # aplica el schema a Supabase
pnpm db:bootstrap                  # habilita pgvector + RLS
pnpm db:seed                       # siembra categorías sistema
pnpm dev
```

## Scripts

| Comando             | Qué hace                                                  |
| ------------------- | --------------------------------------------------------- |
| `pnpm dev`          | Dev server con Turbopack                                  |
| `pnpm build`        | Build de producción                                       |
| `pnpm lint`         | ESLint                                                    |
| `pnpm typecheck`    | `tsc --noEmit`                                            |
| `pnpm format`       | Prettier write                                            |
| `pnpm db:generate`  | Genera migración Drizzle                                  |
| `pnpm db:push`      | Aplica schema (dev)                                       |
| `pnpm db:migrate`   | Aplica migraciones (prod)                                 |
| `pnpm db:studio`    | Drizzle Studio                                            |
| `pnpm db:bootstrap` | Crea extensión `vector` y aplica políticas RLS            |
| `pnpm db:seed`      | Siembra categorías sistema                                |

## Mandato estético

Anti-dashboard genérico. Anti-AI-template colorido. Cero emojis, cero gradientes, cero glow, cero bouncy springs. Paleta restrained casi monocromática con un único acento `#B8A6F5` reservado para presencia de IA. Tipografía como protagonista. Animaciones smooth-físicas. Detalles completos en [`CLAUDE.md`](CLAUDE.md) y en el blueprint.
