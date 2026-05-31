# Auditoría Finanzia — Hallazgos y recomendaciones priorizadas

Fecha: 2026-05-30 · Modalidad: read-only, generado por workflow multi-agente (8 dimensiones, verificación adversarial). Ningún archivo fue modificado; no se corrió build, typecheck ni se tocó la base de datos.

## Resumen ejecutivo

- Estado general sólido en arquitectura y disciplina: RSC por defecto bien ejecutado, contrato `{ok,data}|{ok,error}` consistente, validación Zod, modelo de datos de dinero (`numeric(15,2)`) y modelo dual de deudas correctos, y la regla 6 (LLM no muta sin confirmación UI) cumplida de punta a punta en tool + adapter + prompt.
- Riesgo principal #1 — integridad del dinero: la conversión multi-divisa que se persiste como `amount_base` usa aritmética en punto flotante (`parseFloat * rate`), y varios caminos (edición de transacción, webhook de email, recurrentes) degradan silenciosamente a 1:1 o usan una moneda base equivocada. Toca datos reales del usuario y viola la regla no negociable #4.
- Riesgo principal #2 — red de seguridad ausente: cero `error.tsx`/`not-found.tsx` en toda la app (viola regla 8), sin Sentry pese a `SENTRY_DSN` declarado, y sin rate limiting en `/api/ai/chat` pese a tener Upstash instalado. Fallos y abuso pasan desapercibidos.
- Riesgo principal #3 — RLS no protege en runtime: la app conecta con rol de servicio que salta RLS; el aislamiento multi-tenant depende 100% de `where(eq(userId,...))` en código, sin defensa en profundidad. Además 5 tablas nuevas no tienen política.
- Salud por dimensión: Funcionalidad y Datos/Infra son las de mayor riesgo (dinero float, RLS runtime, drift de migraciones, sin rate limit). Rendimiento tiene techo claro (cero primitivas de caché Next 16) pero sin defectos de corrección. UX/Noir y Accesibilidad están bien encaminadas con gaps puntuales (estados de error/loading, contraste de texto terciario, live region del copiloto, combobox sin teclado). IA es un activo: motor híbrido sólido, personalización Fase 0 ya hecha; falta evals.
- Deuda de proceso: el lint no protege las reglas no negociables (300 líneas, sin `any`, sin `process.env` directo); 21 archivos exceden el límite y no hay evals de calidad de IA para mover umbrales/modelos con datos.
- Personalización de IA: la recomendación es construir sobre lo existente (system prompt por usuario + few-shot implícito kNN) con evals → memoria/few-shot dinámico → RAG → AI Gateway por defecto. Fine-tuning por usuario se descarta por PII y escala.

## Top quick-wins

Alto valor, esfuerzo S. Ordenados por score = (impacto × severidad) ÷ esfuerzo.

| # | Hallazgo | Dimensión | Evidencia | Severidad | Esfuerzo | Recomendación |
|---|----------|-----------|-----------|-----------|----------|---------------|
| 1 | Rate limiting ausente en el endpoint más costoso (`/api/ai/chat`, LLM + tool calls, maxDuration 60s) pese a Upstash instalado | Datos/Infra | `src/app/api/ai/chat/route.ts:59-68`; `package.json` deps `@upstash/*`; grep en src/ = 0 consumidores | alta | S | `@upstash/ratelimit` slidingWindow por `userId` en el chat y server actions que invocan modelo; responder 429 `{ok:false,error}` |
| 2 | Loading states faltantes en ~9 rutas con fetch RSC (incluye `[id]` y `[period]` dinámicos) | UX-Noir + Flujos | `find loading.tsx`=11 vs `page.tsx`=24; faltan cash-flow, comercios, informes(+[period]), cuentas/[id], tarjetas/[id], roots de sección | media | S | Añadir `loading.tsx` skeleton opacity-based Noir, priorizando rutas con parámetro dinámico |
| 3 | `process.env` directo fuera de `env.ts` (6 usos, incl. `AI_GATEWAY_API_KEY` sin validar) | Salud código | `copilot/actions.ts:173-175`; `api/ai/chat/route.ts:129,209`; `engine.ts:167`; `db/client.ts:20` | media | S | Añadir `AI_GATEWAY_API_KEY` y `FINANZIA_COPILOT_DEBUG` al Zod de `env.ts` y usar `env.*` |
| 4 | RLS faltante en 5 tablas nuevas con `user_id` (savings_plans/periods, monthly_reports, email_inbox_aliases, credit_card_profiles) | Datos/Infra | `drizzle/rls.sql:18-33,42-173`; `schema.ts:153,173,610,640,672` | media | S | `ENABLE/FORCE RLS` + policy por `user_id` para las 5 tablas; re-correr `db:bootstrap` |
| 5 | Crons de insights/exchange-rates no aíslan fallo por iteración: un usuario que falla aborta el batch | Datos/Infra | `cron/insights/route.ts:36-39`; contraste `close-savings-period:44-79`, `monthly-review:113-172` | media | S | Envolver cada iteración en try/catch y devolver `{ok, processed, failed}` como ya hacen los crons mensuales |
| 6 | Lint no protege las reglas no negociables (300 líneas, `any`, `process.env`) | Salud código | `eslint.config.mjs:8-19` (solo no-unused-vars + consistent-type-imports) | media | S | Añadir `max-lines`, `no-explicit-any:error`, `no-restricted-syntax`/`no-restricted-imports` para `process.env` fuera de `env.ts` |
| 7 | Cmd+K input sin nombre accesible (solo placeholder) | Accesibilidad | `command-palette.tsx:129-134` | media | S | `aria-label="Buscar y navegar"` (el copiloto ya lo hace en `copilot-chat.tsx:223`) |
| 8 | Foco visible ausente en controles custom (toggle saldos, chips, descartar/eliminar, onboarding) | Accesibilidad | `hide-balances-toggle.tsx:16-22`; `new-transaction-dialog.tsx:281-296,395-441`; `insight-card.tsx:131-139`; `alert-list.tsx:123-131`; `onboarding-overlay.tsx:216-222` | media | S | Añadir `focus-visible:ring-2 ring-[var(--accent-ai)]/40` homogéneo |
| 9 | Doble fetch de `profiles` por navegación (layout + cada page) sin dedupe | Rendimiento | `auth.ts:20` (users sí cacheado); `(app)/layout.tsx:33`; `dashboard/page.tsx:64-66` | media | S | Extraer `getProfile(userId)` con React `cache()` y reusarlo en layout y pages |
| 10 | Waterfalls secuenciales en dashboard (auth→cookies→profile en serie antes del batch; rates tras el batch) | Rendimiento | `dashboard/page.tsx:61-67,89-92` | media | S | Paralelizar `cookies()` con el batch; cachear profile y rates del día (cacheTag) |
| 11 | Crons devuelven `err.message` crudo al cliente | Datos/Infra | `exchange-rates/route.ts:48`; `recurring/route.ts:48-51`; `insights/route.ts:50-53` | baja | S | Loggear el error completo server-side y devolver mensaje genérico |
| 12 | `recharts` en dependencies sin usarse (los charts usan @visx) | Rendimiento | `package.json` `"recharts":"^3.2.1"`; grep en src/ = 0 | baja | S | Eliminar de dependencies (o documentar plan de migración) |

## Apuestas estratégicas

Alto valor, esfuerzo L o transversal. Requieren decisión conjunta antes de ejecutar.

| Apuesta | Dimensiones | Por qué importa | Severidad | Esfuerzo |
|---------|-------------|-----------------|-----------|----------|
| Reescribir la conversión de dinero a aritmética entera/dinero.js + tests de precisión | Salud código + Funcionalidad | `amount_base` persistido se calcula con float (`parseFloat*rate`), viola regla #4 y distorsiona dashboard/reportes/presupuestos en montos COP grandes | alta | M |
| Caché Components / PPR en Next 16 (cero primitivas de caché hoy) | Rendimiento | Toda ruta `(app)/*` es dinámica y reconsulta Postgres por request; prerenderizar shell + datos en `<Suspense>` mejora TTFB y hace que la View Transition aterrice sobre estructura ya pintada | alta | M |
| Red de seguridad de errores: `error.tsx` Noir + `not-found.tsx` + Sentry | UX-Noir + Flujos + A11y + Datos/Infra | Cero error boundaries (regla 8) y cero captura de errores en prod; cualquier fallo RSC/Action/cron es invisible o cae en la pantalla genérica de Next | alta | M |
| Endurecer aislamiento multi-tenant (RLS efectiva en runtime) | Datos/Infra | El rol de servicio salta RLS; el aislamiento depende solo de `where userId`. Migrar a `SET LOCAL app.current_user_id` con rol sin BYPASSRLS, o anon+JWT para lecturas de cliente | alta | L |
| Personalización de IA por fases (ver sección dedicada) | IA | Mayor ROI en evals + memoria/few-shot dinámico reusando infra existente; AI Gateway desbloquea observabilidad | alta | L (programa) |
| Reconstruir el journal de migraciones (drift: 9 .sql, journal lista 4) | Datos/Infra | `db:migrate` omite 5 migraciones (savings_periods, credit_card_profiles, etc.); el historial no es fuente de verdad reproducible | alta | M |
| Code-splitting de charts + `optimizePackageImports` | Rendimiento | 5 client components @visx sin `next/dynamic` (cero en toda la app) entran al first-load; penaliza LCP/TBT | media | M |
| Gestión completa de deudas (callejón sin salida actual) | Flujos | Una deuda creada no se puede abrir, editar, registrar pago, marcar pagada ni eliminar; asimetría frente a tarjetas y movimientos | alta | M |

## Personalización de IA por usuario

Tomado de la dimensión IA, verificada sobre el código real. Postura base: la personalización ya es por prompt y RAG/few-shot implícito — no fine-tuning. La privacidad está codificada (`store=false` default, `recommendation.ts:18` envía solo agregados, `persona.ts:6-7` declara "NADA de fine-tuning"). La regla 6 se mantiene: nada de esto permite que el LLM mute datos sin confirmación UI.

### Matriz esfuerzo × impacto × riesgo

| Fase | Técnica | Esfuerzo | Impacto | Riesgo | Estado / nota |
|------|---------|----------|---------|--------|---------------|
| 0 | System prompt por usuario (`profileSnapshot` + `toneBlock`) + few-shot implícito kNN del propio historial + clasificación semántica de intents | S | Alto | Bajo | YA HECHA. Buena calidad (`profile-snapshot.ts:67-226`, `persona.ts:235-247`, `categorize.ts:75-91`). Documentar y medir |
| 0.5 | Evals de calidad + golden sets (categorización LATAM, preguntas del copiloto con tool-calls esperados) + dashboard `userCorrected` | M | Alto | Bajo | PREREQUISITO. Hoy hay tests de unidad del motor local pero cero evals de calidad de IA; los umbrales (0.85/0.60/0.55; 0.45/0.5/0.6) se mueven a ciegas |
| 1 | Memoria de preferencias en `aiProfile` jsonb + few-shot dinámico desde `userCorrected` en el `llmFallback` de categorización | M | Alto | Bajo | RECOMENDADO PRIMERO. `llmFallback` hoy NO inyecta correcciones del usuario (`categorize.ts:138-171,435`). Latencia nula, datos en tu DB |
| 2 | RAG semántico sobre el historial en el copiloto LLM (exponer kNN del embedding de la pregunta como tool, reusando el patrón del `retrievalFallback`) | M | Medio | Bajo | `searchTransactions` hoy es ILIKE, no vectorial (`search-transactions.ts:32-42`); los embeddings 1536d ya existen (`retrieval.ts:54-70`) |
| Infra | AI Gateway de Vercel como ruta DEFAULT (no solo fallback de key) | M | Medio | Bajo | Ya cableado como nivel 2 de key (`openai.ts:42-48`, `anthropic.ts:35-40`); promoverlo centraliza analytics de costo/latencia, zero-data-retention y fallback de modelo por tarea |
| 3 | Fine-tuning por COHORTE solo para tono/formato es-CO (sin datos transaccionales) | L | Bajo | Medio | Solo si las evals demuestran techo del prompting (raro con gpt-5.4-mini + buen prompt) |
| — | Fine-tuning por USUARIO individual | L | Bajo (incremental) | Alto | DESCARTAR. No escala, deriva con cada cambio de hábitos, y entrenar con transacciones envía PII financiera al proveedor — choca con la postura de privacidad ya codificada |

### Recomendación por fases

Ejecutar 0.5 (evals) → 1 (memoria + few-shot dinámico) → Infra (AI Gateway default) → 2 (RAG semántico). Evaluar la Fase 3 solo si las evals muestran techo del prompting. Nunca fine-tuning por usuario con datos transaccionales.

### Privacidad / PII y regla 6

El factor decisivo contra el fine-tuning por usuario es PII: las transacciones son datos financieros sensibles que no deben salir a entrenamiento externo. La defensa actual (insights con solo agregados, `store=false`, key del usuario en Vault cifrado, `service_role` nunca al cliente) debe preservarse en toda fase. La regla 6 permanece inviolable: la personalización mejora las propuestas y las respuestas, pero cualquier mutación sigue requiriendo confirmación UI explícita.

### Nota de proveedor (corrección de doc canónica)

CLAUDE.md cita "Claude Sonnet 4.6" como cerebro, pero el stack real es dual: OpenAI para embeddings (categorización kNN, retrieval, intents) y como copiloto default (`gpt-5.4-mini`, `config.ts:37`), mientras Claude solo aparece en el fallback de categorización (`categorize.ts:144`) y en recomendaciones de insights (`recommendation.ts:7,151`). Recomendación: actualizar CLAUDE.md/blueprint para alinear costo/privacidad/eval.

## Hallazgos por dimensión

### Rendimiento y carga

Cobertura: 100% en config y en grep global de primitivas de render/cache sobre toda src/; muestreo de pages limitado a dashboard + layouts por flakiness del filesystem (varias pages devolvieron 0 bytes). Análisis 100% estático: no se corrió Lighthouse/build ni se midieron bundles/CWV; pesos de librerías son estimaciones de orden de magnitud.

| # | Hallazgo | Evidencia | Severidad | Esfuerzo | Recomendación |
|---|----------|-----------|-----------|----------|---------------|
| 1 | Cero primitivas de caché Next 16 (`use cache`, cacheLife/Tag, PPR, unstable_cache); toda ruta `(app)/*` es dinámica y reconsulta Postgres por request | `next.config.ts`; grep global = 0 | alta | M | Activar `experimental.cacheComponents` y envolver lecturas estables (categorías sistema, tasas diarias, profile-snapshot) con `use cache` + cacheLife/cacheTag invalidado por las Server Actions |
| 2 | View Transitions aterrizan sobre render no cacheado (auth + profile + N queries por navegación), restando fluidez | `(app)/layout.tsx:53` + ausencia de caché + waterfall dashboard | media | M | Consecuencia de #1/#9/#10: con PPR, prerenderizar shell y streamear datos en `<Suspense>` con skeletons Noir |
| 3 | Doble fetch de `profiles` por navegación sin dedupe (users sí cacheado) | `auth.ts:20`; `(app)/layout.tsx:33`; `dashboard/page.tsx:64-66` | media | S | `getProfile(userId)` con React `cache()` reusado en layout y pages |
| 4 | Waterfalls secuenciales en dashboard antes y después del batch | `dashboard/page.tsx:61-67,89-92` | media | S | Paralelizar `cookies()`; cachear profile y rates del día |
| 5 | Charts @visx sin `next/dynamic` (cero en toda la app) entran al first-load | grep @visx=5 client; `cash-flow-teaser.tsx:4-7`; `next/dynamic`=0 | media | M | Cargar componentes con gráfico vía `next/dynamic` (loading skeleton Noir); añadir `optimizePackageImports` para @visx/lucide/radix/motion |
| 6 | `papaparse` (~45KB) en el bundle de cualquier ruta que monte el importer | `importer-client.tsx:1,5` | baja | S | `next/dynamic({ssr:false})` al abrir el dialog |
| 7 | `recharts` en dependencies sin uso real | `package.json`; grep=0 | baja | S | Eliminar de dependencies |
| 8 | 4 familias de fuentes globales aunque Fraunces/Sora son de uso restringido | `layout.tsx:13-41,85` | baja | S | Inter+Geist Mono globales (correcto); considerar scoping de Fraunces/Sora |
| 9 | Región Vercel fijada a `pdx1` (us-west); latencia fija si la base de usuarios es LATAM | `vercel.json regions:['pdx1']` | baja | S | Confirmar co-ubicación con Supabase (factor dominante); cachear lecturas estables para amortiguar distancia |

### UX y adherencia Noir

Cobertura: globals.css (435 líneas), empty-state.tsx, button.tsx, skeleton.tsx y layout.tsx leídos limpios al 100%. NO leídos a fondo: cuerpo de app-sidebar/mobile-nav, cada page.tsx para confirmar uso de `<EmptyState>`, hook `useChatViewport`, jerarquía tipográfica fina por pantalla. Nota: el grep de emojis solo arrojó flechas tipográficas en copy direccional, no son violación. Adherencia base fuerte confirmada (sin gradientes activos, accent-ai disciplinado, reduced-motion global, Sora confinada).

| # | Hallazgo | Evidencia | Severidad | Esfuerzo | Recomendación |
|---|----------|-----------|-----------|----------|---------------|
| 1 | Cero `error.tsx`/`global-error.tsx`/`not-found.tsx` en toda la app (viola regla 8) | `find` = 0 (confirmado) | alta | M | `error.tsx` Noir reutilizable en `(app)/` con copy `.editorial` + reset estilo text-sobre-bg; `not-found.tsx`; error.tsx co-locado en rutas `[id]`/`[period]` |
| 2 | Loading states faltantes en ~9 rutas (11 loading.tsx vs 24 pages) | diff `find` page vs loading | media | S | Añadir `loading.tsx` opacity-based Noir, priorizando rutas dinámicas |
| 3 | `skeleton.tsx` usa `animate-pulse` (limítrofe-conforme: es opacity, no shimmer) | `skeleton.tsx:7` | baja | S | Confirmar que los loading.tsx reales usen skeletons Noir; cubierto por la excepción reduced-motion |
| 4 | Backdrop-blur sutil en overlays/sticky (funcional, no glassmorphism) | `dialog.tsx:21`; `command-palette.tsx:115`; `mobile-nav.tsx:90` | baja | S | Mantener; no introducir blur en cards de contenido |

Verificaciones positivas (sin acción): empty states editoriales con Fraunces correctos; tintes de navegación con color-mix purple en rango de mandato; 0 emojis reales; accent-ai solo en focus/IA. Recomendación de blindaje opcional: lint guard contra Sora fuera del wordmark, `*-gradient`, accent-ai en botón primario, o número sin clase tabular.

### Accesibilidad WCAG AA

Cobertura ~100% de primitivos UI y componentes clave (command-palette, copiloto, topbar, mobile-nav, new-transaction-dialog, category-combobox, confirm-dialog). Hex de contraste citados son los IMPLEMENTADOS en globals.css (difieren de los documentados en CLAUDE.md); confirmar ratios con contrast checker en runtime. NO verificado en runtime: focus-trap de Radix (asumido), montaje del `<Toaster>` de sonner.

| # | Hallazgo | Evidencia | Severidad | Esfuerzo | Recomendación |
|---|----------|-----------|-----------|----------|---------------|
| 1 | Contraste de `--text-tertiary` < 4.5:1 en dark y light (texto real: hints, labels, placeholders, metadatos) | `globals.css:209` (#5E5482, ~3.6:1) y `:136` (#8478A0, ~3.9:1); `field.tsx:34`; `input.tsx:13`; `new-transaction-dialog.tsx:303-383` | alta | M | Aclarar/oscurecer el token hasta ≥4.5:1 sobre surface, o reservarlo a iconos/glifos aria-hidden y usar text-secondary para texto informativo |
| 2 | Contenido del copiloto (respuesta final) fuera de live region; `role="log"` sin `aria-live` tiene soporte inconsistente | `copilot-chat.tsx:194-205`; `chat-message.tsx:59-84`; `copilot-status.tsx:36` | alta | M | Añadir `aria-live="polite"` explícito o anunciar el texto final del stream en región polite dedicada |
| 3 | CategoryCombobox custom sin navegación por teclado (no flechas/Enter, sin aria-activedescendant, input no es role=combobox) | `category-combobox.tsx:139-155,157-228` | alta | M | Añadir flechas+Enter con aria-activedescendant y role=combobox/aria-expanded/aria-controls, o migrar a Radix |
| 4 | Cmd+K input sin nombre accesible | `command-palette.tsx:129-134` | media | S | `aria-label="Buscar y navegar"` |
| 5 | Tap targets < 44px en controles secundarios (toggle saldos, descartar/eliminar, chips) | `hide-balances-toggle.tsx:21`; `insight-card.tsx:136`; `alert-list.tsx:128`; `new-transaction-dialog.tsx:395-408`; `follow-up-chips.tsx:17-24` | media | M | Extender el patrón h-11/size-11 ya usado en primarios, o ampliar hit-area con padding |
| 6 | Foco visible ausente en controles custom | `hide-balances-toggle.tsx:16-22`; `new-transaction-dialog.tsx:281-441`; `insight-card.tsx:131-139`; `onboarding-overlay.tsx:216-222` | media | S | Añadir `focus-visible:ring` homogéneo |
| 7 | Texto secundario margen ajustado sobre surface-elevated (tooltips, SelectLabel) | `info-hint.tsx:50`; `select.tsx:144` | media | S | Verificar ratios sobre elevated; subir a text-secondary si <4.5:1 |
| 8 | Feedback de mutación solo por toast; verificar aria-live del `<Toaster>` | `answer-actions.tsx:58-71`; `transaction-actions-menu.tsx:64-66` | media | S | Confirmar que sonner conserva su región aria-live en el layout raíz |
| 9 | Avatar `role="img"` con `aria-label=""` (ambiguo) | `topbar.tsx:145-147`; `mobile-account-sheet.tsx:90-95` | baja | S | Reemplazar por `aria-hidden="true"` |
| 10 | Foco no se mueve a encabezado al entrar a /copilot | `copilot-chat.tsx:227,152-191` | baja | S | Mover foco a región con tabindex=-1 sin abrir teclado en mobile |

Verificaciones positivas: prefers-reduced-motion global correcto; skip-link, landmarks y h1 del topbar bien implementados; Sheet hereda tokens Noir correctamente.

### Flujos y navegación

Cobertura alta de flujos núcleo pese a tooling intermitente. Verificado completo: 28 redirects 308 en next.config.ts, dashboard, movimientos, deudas, cuentas/[id], section-tabs, copilot página (no modal), import-dialog. NO leído por contenido: flujo propuesta→confirmación de tools propose-*, cron close-savings-period, tarjetas/[id] e informes/[period] (mini-back). Correcciones: las 3 landings son redirects puros, el FAB copiloto navega a /copilot (consistente), `?import=open` sí abre el dialog.

| # | Hallazgo | Evidencia | Severidad | Esfuerzo | Recomendación |
|---|----------|-----------|-----------|----------|---------------|
| 1 | Cero error boundaries (`notFound()` se usa sin `not-found.tsx`) — dedup con UX-Noir #1 | `find` = 0; `cuentas/[id]/page.tsx:44` | alta | M | error.tsx grupo (app) Noir + reset; not-found.tsx |
| 2 | Deudas: callejón sin salida — sin Link/menú/edición, sin ruta `deudas/[id]`, solo new-debt (sin edit) | `deudas/page.tsx:185-330`; no existe `deudas/[id]`; solo new-debt-dialog | alta | M | Menú de acciones por deuda (editar/registrar pago/marcar pagada/eliminar) o ruta `deudas/[id]`, para paridad con tarjetas/movimientos |
| 3 | Loading faltantes — dedup con UX-Noir #2 | `find loading.tsx`=11 | media | S | Añadir loading.tsx a las rutas faltantes |
| 4 | Multi-divisa: listados muestran solo el monto original, sin equivalente en base (`amountBase` ya en query) | `movimientos/page.tsx:537-543,589-595,138-141`; `dashboard/page.tsx:334-340` | media | M | Cuando `currency !== baseCurrency`, mostrar el equivalente en base como subtexto tabular discreto |
| 5 | Imports: visibilidad de error limitada al conteo de omitidas (sin qué filas ni por qué, sin reintento) | `import-dialog.tsx:37,85-110` | media | M | Detalle de filas omitidas con motivo + reintento/edición; mantener dialog URL-driven |
| 6 | Copiloto sin destino de primer nivel en el rail desktop (asimetría de prominencia con el FAB mobile) | `copilot/page.tsx:9-11`; `mobile-nav.tsx:103-111` | baja | S | Acceso de primer nivel discreto (lavanda IA) en el rail desktop, sin romper Noir |
| 7 | Onboarding no encadena al primer dato operativo tras skip | `dashboard/page.tsx:218-223,308-313` | baja | S | CTA directo "Crear tu primera cuenta"/"Importar" al cerrar onboarding |
| 8 | Header de Movimientos denso (5 controles + 4 tabs + chips) compite con la acción primaria en mobile | `movimientos/page.tsx:222-257` | baja | S | Agrupar secundarias (Importar/Recategorizar) en overflow; validar wrap a 360px |

Verificaciones positivas: reorg IA v2 (landings redirect, SectionTabs con prefetch/aria-current, 28 redirects 308) sólida; mini-back `← Sección` consistente donde se verificó (confirmar en tarjetas/[id] e informes/[period]).

### Funcionalidad y correctitud

Cobertura ~65%, toda con evidencia de primera mano. Leído íntegro: schema.ts, movimientos/actions.ts, currency/rates.ts, los 3 tools propose-*, presupuestos/deudas/copilot actions, api/ai/chat, cron/recurring, webhook email-inbox; 6 crons usan CRON_SECRET. Retracciones de envíos previos: no hay import faltante en deudas/actions, no existe recordDebtPayment con float, budget-proposal-card.tsx no existe (confirmación de presupuesto bien implementada). NO verificado: 8 actions.ts restantes, import/actions.ts, cuerpo de crons mensuales (posibles divisores cero), webhook clerk svix. Recomendación general: correr `pnpm typecheck` y re-auditar conversión de divisa en todos los puntos de inserción.

| # | Hallazgo | Evidencia | Severidad | Esfuerzo | Recomendación |
|---|----------|-----------|-----------|----------|---------------|
| 1 | Webhook email-inbox usa la moneda de la CUENTA como base (no la del perfil) y convierte con parseFloat; `amount_base` queda en moneda distinta al resto | `api/webhooks/email-inbox/route.ts:98-126` | alta | M | Cargar `profiles.baseCurrency` del usuario y convertir con `convertAmount()` (string) hacia esa base |
| 2 | `updateTransaction`: fallback corrompe `amount_base` asignándole el monto original (moneda extranjera) cuando falta la tasa | `movimientos/actions.ts:516-528`; `rates.ts:222-229` | alta | M | Abortar con `{ok:false,'rate_unavailable'}` o conservar amount_base/exchange_rate previos; propagar el flag `missing` |
| 3 | El flag `missing` de `convertAmount` se ignora en create/update: una FX sin tasa es indistinguible de 1:1 legítima | `rates.ts:222-229`; `movimientos/actions.ts:158-179,235-241` | media | M | Persistir `exchange_rate=null` y marcar fila para reproceso por el cron de tasas, o rechazar |
| 4 | `analyzePurchase` y el webhook hacen aritmética float sobre dinero (el webhook persiste) | `cards/purchase-analysis.ts:38-100`; `email-inbox/route.ts:106` | media | M | `convertAmount()` en el webhook; en analyzePurchase calcular en centavos o redondear cada paso |
| 5 | Tools propose-* resuelven entidades por nombre exacto (`findFirst eq(name)`): no determinista con homónimos | `propose-create-transaction.ts:52-70`; `propose-set-budget.ts:29-34`; `propose-card-purchase.ts:42-44` | baja (ajustado) | M | Desambiguar por moneda/últimos 4 o devolver candidatos. Acotado por ser paso de propuesta con confirmación UI (regla 6) |

Verificaciones positivas confirmadas: regla 6 end-to-end (propose-* solo leen; confirmProposed* re-valida con Zod y reusa la action canónica); 6 crons con CRON_SECRET y contrato consistente; esquema de dinero/multi-divisa/modelo dual correcto; cash-flow trata signos y transfers correctamente; ActionResult se redefine por archivo (extraer a módulo de tipos).

### Salud de código y arquitectura

Cobertura 100% en chequeos globales (tamaño de archivos, process.env, any/ts-ignore, barrels, tests). Los 6 'use client' que tocan @/lib/db usan `import type` (falso positivo descartado). No se evaluó calidad línea-a-línea de los 21 archivos grandes ni se corrió build/typecheck.

| # | Hallazgo | Evidencia | Severidad | Esfuerzo | Recomendación |
|---|----------|-----------|-----------|----------|---------------|
| 1 | Conversión de dinero con float que alimenta `amount_base` persistido (viola regla #4) — dedup con Funcionalidad #1-4 | `currency/rates.ts:230-235` `(amount*rate).toFixed(2)`; `goal-card.tsx:26-28`; `format.ts:38,81` | alta | M | Reescribir `convert()` con dinero.js o aritmética entera de cents (redondeo half-even); format/parseMoneyInput pueden quedar (display) documentado; cubrir con tests |
| 2 | Cero tests para áreas financieras críticas (conversión, formato, categorización, insights); los 6 tests existentes son solo del copiloto | `find *.test.ts`=6 todos en copilot/__tests__; `vitest.config.ts:10` | alta | M | Unit tests prioritarios para rates.ts (round-trip + precisión), format/parseMoneyInput y categorize.ts |
| 3 | 6 usos de `process.env` fuera de env.ts (incl. `AI_GATEWAY_API_KEY` sin validar) | `copilot/actions.ts:173-175`; `api/ai/chat/route.ts:129,209`; `engine.ts:167`; `db/client.ts:20` | media | S | Añadir las vars al Zod de env.ts y usar `env.*` |
| 4 | 21 archivos > 300 líneas (regla #1); peores: cash-flow/page 681, movimientos page 624 + actions 598, new-card-dialog 465, categorize 464 | `cash-flow/page.tsx:681`; `movimientos/page.tsx:624`; `movimientos/actions.ts:598` | media | L | Extraer subcomponentes y mover derivación a helpers; priorizar los >450; schema.ts/catalog.ts documentables como excepción |
| 5 | 1 `any` con eslint-disable + non-null assertions riesgosas (`knn[0]!`) que evaden noUncheckedIndexedAccess | `copilot/index.ts:33-34`; `categorize.ts:200,209,352,361`; `movimientos/actions.ts:231` | media | S | Tipar onFinish; reemplazar `knn[0]!` por guard explícito antes del acceso |
| 6 | Lint no protege reglas no negociables (300 líneas, any, process.env) | `eslint.config.mjs:8-19` | media | S | Añadir `max-lines`, `no-explicit-any:error`, `no-restricted-syntax`/imports para process.env |
| 7 | Dos index.ts con lógica real (no barrels puros) violan convención de import directo | `ai/copilot/index.ts:104`; `ai/insights/index.ts:67` | baja | S | Opcional: renombrar a run.ts/runner.ts e importar directo |

Verificaciones positivas: frontera cliente/servidor sana (import type); tsconfig strict + noUncheckedIndexedAccess + path alias correctos.

### Datos e infraestructura

Auditoría corregida tras falsos positivos: RLS sí existe (no actúa en runtime por rol de servicio), índices HNSW existen, 6 crons programados, FK self-ref de categorías correcta, upsertRates es bulk. Leído al 100%: schema.ts, client.ts, env.ts, rls.sql, los 6 crons, tick.ts, rates.ts, integrations/store.ts. LÍMITE: de queries/* solo transactions.ts (cabecera) inspeccionado — como RLS no protege en runtime, una query sin filtro userId en los ~11 archivos no leídos sería crítica y no está descartada. No se leyó el handler completo de /api/ai/chat (ratelimit ausente inferido por grep global).

| # | Hallazgo | Evidencia | Severidad | Esfuerzo | Recomendación |
|---|----------|-----------|-----------|----------|---------------|
| 1 | RLS no actúa en runtime: la app conecta con rol de servicio que salta RLS; aislamiento depende solo de `where userId` (viola defensa de regla 7) | `rls.sql:12-13`; `client.ts:13`; grep set_config/JWT=0 | alta | L | `SET LOCAL app.current_user_id` por transacción con rol sin BYPASSRLS y policies sobre esa variable, o anon+JWT para lecturas de cliente; entretanto auditar 100% de queries por userId |
| 2 | Sentry ausente pese a `SENTRY_DSN` declarado (0 referencias, sin instrumentation.ts); crons solo console.error | `env.ts:68`; grep Sentry=0; `cron/recurring/route.ts:47-52` | alta | M | `@sentry/nextjs` + instrumentation.ts + onRequestError y captura en catch de crons; o eliminar SENTRY_DSN del env |
| 3 | Rate limiting ausente en /api/ai/chat pese a Upstash instalado — dedup quick-win #1 | `api/ai/chat/route.ts:59-68`; grep @upstash en src/=0 | alta | S | `@upstash/ratelimit` slidingWindow por userId; 429 `{ok:false,error}` |
| 4 | Drift de journal de migraciones: 9 .sql, journal lista 4; `db:migrate` omite 5 (savings_periods, credit_card_profiles, etc.); numeración duplicada | `drizzle/migrations/` 9 .sql; `meta/_journal.json:4-33` solo idx 0-3 | alta | M | Reconstruir el journal con drizzle-kit, renumerar duplicadas, documentar en DEPLOY.md que prod usa migrate (no push) |
| 5 | RLS faltante en 5 tablas nuevas con user_id | `rls.sql:18-33,42-173`; `schema.ts:153,173,610,640,672` | media | S | ENABLE/FORCE RLS + policy por user_id; re-correr db:bootstrap |
| 6 | Crons insights/exchange-rates no aíslan fallo por iteración | `cron/insights/route.ts:36-39` vs `close-savings-period:44-79` | media | S | try/catch por iteración; devolver `{ok, processed, failed}` |
| 7 | Recurrentes: insert + avance de next_run en 2 sentencias (no transacción) → ventana de duplicación; fallback 1:1 silencioso para USD | `recurring/tick.ts:91-118,87-89`; `rates.ts:224-228` | media | M | Envolver en `db.transaction()`; registrar/alertar el `missing` en vez de asumir 1:1 |
| 8 | Sin dedup/idempotencia de imports CSV y email (no hay `externalId`); reimportar/reprocesar duplica transacciones | `schema.ts:336-387` (sin externalId) vs uniqueIndex en monthly_reports/savings_periods | media | M | `transactions.externalId` (hash estable) + uniqueIndex parcial + onConflictDoNothing |
| 9 | Crons devuelven `err.message` crudo (tras CRON_SECRET, superficie baja) | `exchange-rates/route.ts:48`; `recurring/route.ts:48-51`; `insights/route.ts:50-53` | baja | S | Loggear completo server-side; devolver mensaje genérico |
| 10 | Cliente drizzle recreado por evaluación de módulo; pool max:10 por lambda | `client.ts:11-22` | baja | S | Confirmar pooler en modo transaction (6543); considerar max menor por lambda |

Verificaciones positivas: FK self-ref de categorías correcta; HNSW vector_cosine_ops presente; upsertRates bulk eficiente; Vault de integraciones bien modelado (keys cifradas, secretId persistido). Nota: comparación de CRON_SECRET/HMAC con `===` no es tiempo constante (impacto práctico bajo).

## Hoja de ruta sugerida por fases

Propuesta para decidir en conjunto. No es un plan de auto-ejecución.

### Fase 0 — Quick-wins (esfuerzo S, alto valor)

Rate limiting en /api/ai/chat (Upstash) · `getProfile` con React `cache()` + paralelizar waterfalls del dashboard · loading.tsx faltantes (priorizar rutas dinámicas) · `process.env` → `env.ts` + reglas de lint guard · RLS en las 5 tablas nuevas · aislar fallo por iteración en crons insights/exchange-rates · aria-label en Cmd+K + focus-visible en controles custom · sanear `err.message` en crons · eliminar `recharts`.

### Fase 1 — Integridad del dinero (riesgo no negociable #4)

Reescribir `convert()` a aritmética entera/dinero.js con tests de precisión · corregir webhook email-inbox (base del perfil, sin parseFloat) · corregir fallback de `amount_base` en updateTransaction y propagar el flag `missing` · float en `analyzePurchase`. Bloquea regresiones futuras al añadir cobertura de tests inexistente.

### Fase 2 — Red de seguridad y observabilidad

`error.tsx`/`not-found.tsx` Noir + Sentry con instrumentation.ts · reconstruir journal de migraciones y documentar migrate vs push · idempotencia de imports/email (`externalId`) · atomicidad de recurrentes en transacción.

### Fase 3 — Accesibilidad y rendimiento

Contraste de `--text-tertiary` (dark+light) · live region del copiloto · teclado del CategoryCombobox · tap targets mobile · Cache Components/PPR (shell + datos en Suspense) · code-splitting de charts + `optimizePackageImports`.

### Fase 4 — Producto y paridad de flujos

Gestión completa de deudas (acciones/edición o ruta `[id]`) · equivalente multi-divisa en listados · detalle de filas omitidas en imports · acceso de primer nivel al copiloto en desktop · onboarding encadenado al primer dato.

### Fase 5 — Personalización de IA (programa por sub-fases)

0.5 evals + golden sets + dashboard `userCorrected` → 1 memoria de preferencias + few-shot dinámico → Infra AI Gateway default → 2 RAG semántico. Evaluar fine-tuning por cohorte solo si las evals muestran techo. Descartar fine-tuning por usuario (PII). Mantener regla 6 en toda fase.

### Higiene continua (transversal)

Reglas de lint que protejan el mandato (max-lines, no-explicit-any, no process.env directo) · extraer archivos > 450 líneas · alinear CLAUDE.md/blueprint con el stack real (OpenAI default + Claude fallback) · auditar el 100% de queries por filtro `userId` mientras RLS no proteja en runtime.

---

Disclaimer: esta hoja de ruta es una propuesta priorizada para decidir en conjunto, no una secuencia de ejecución automática. Toda recomendación marcada respeta el Mandato Noir y CLAUDE.md; ninguna sugerencia introduce color saturado, gradientes, glow, emojis ni patrones fuera de mandato. Ningún hallazgo fue ejecutado ni corregido durante esta auditoría read-only.
