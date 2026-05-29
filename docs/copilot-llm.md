# Copiloto — cerebro LLM (OpenAI gpt-5 mini)

El copiloto tiene dos caminos: el **motor local** (NLU + motor de consultas
componible, gratis) y el **LLM**. Qué motor se usa lo decide el **usuario** con un
selector dentro de la ventana del copiloto (Cmd+J): por **default es Local** (sin
IA); si elige un modelo, ese modelo responde TODO. Cuando el LLM está activo es el
cerebro completo y puede leer todos los datos del usuario vía tools.

La selección se guarda por usuario en `profiles.aiProfile.copilot`
(`{ routing: 'local' | 'llm', provider, model }`) y el selector solo lista los
modelos cuyo proveedor tiene una key integrada (la del usuario en Vault con scope
`chat`, o la del operador). El operador puede forzar el LLM globalmente con
`COPILOT_FORCE_LLM=1` (pruebas, sin tocar la UI).

## Configuración (env)

Todas opcionales — los defaults viven en `src/lib/ai/copilot/config.ts`, no en
Zod. Se acceden vía `env` (`src/lib/env.ts`).

| Variable | Default | Qué hace |
|---|---|---|
| `COPILOT_LLM_PROVIDER` | `openai` | `openai` \| `anthropic` |
| `COPILOT_LLM_MODEL` | `gpt-5.4-mini` (openai) / `claude-sonnet-4-6` (anthropic) | id del modelo |
| `COPILOT_REASONING_EFFORT` | `medium` | `minimal` \| `low` \| `medium` \| `high` (familia gpt-5) |
| `COPILOT_TEXT_VERBOSITY` | `low` | `low` \| `medium` \| `high`; las instrucciones del prompt mandan |
| `COPILOT_STORE` | `false` | si `1`, OpenAI guarda el hilo (Responses API). Off por privacidad |
| `COPILOT_FORCE_LLM` | off | si `1`, fuerza el LLM para todos los usuarios aunque tengan "Local" seleccionado (override de operador para pruebas) |

`COPILOT_LLM_PROVIDER`/`COPILOT_LLM_MODEL`/`REASONING_EFFORT`/`TEXT_VERBOSITY` son
el **default del operador**; cada usuario puede sobreescribir proveedor+modelo
desde el selector del copiloto (se valida que el modelo pertenezca al catálogo del
proveedor; si no, cae al default).

Modelos de razonamiento (gpt-5): **no** se usa `temperature`. La asertividad se
controla con `reasoningEffort` + `textVerbosity` (`providerOptions.openai`).

## Resolución de la API key

`getOpenAI({ scope: 'chat' })` resuelve en orden:
1. Key del usuario en Vault (`user_integrations.openai` con scope `chat`).
2. `AI_GATEWAY_API_KEY` (operador, Vercel AI Gateway).
3. `OPENAI_API_KEY` (operador).

La key **solo** va en `.env.local` (gitignored) o en el Vault. Nunca en código,
commits ni logs.

## Probar

```bash
# 1. Verificar acceso al modelo (cae a gpt-5-mini si gpt-5.4-mini no está):
pnpm probe:llm

# 2. Levantar el dev server (con logs de depuración):
FINANZIA_COPILOT_DEBUG=1 pnpm dev
```

En la app, Cmd+J abre el copiloto. Junto al título hay un **selector**: por
default dice "Local". Elige un modelo (solo salen los que tienen key integrada)
para activar la IA — queda persistido. Los logs `[copilot:route]` y
`[copilot:llm]` muestran routing, provider, modelo, reasoningEffort, # tool calls
y usage. (Para forzar el LLM globalmente sin tocar la UI: `COPILOT_FORCE_LLM=1`.)

Preguntas de humo: "¿cómo está mi situación financiera?" (varios tools),
"¿cuánto gasté en mercado vs restaurantes este trimestre?" (queryTransactions),
"¿qué hago con mis deudas?" (getDebts + consejo), "regístrame 50k en uber"
(proposeCreateTransaction → confirmación UI).

## Tools disponibles para el LLM

Lecturas (compactas, filtradas por `userId`): `getBalance`, `getAccounts`,
`listRecentTransactions`, `searchTransactions`, `queryTransactions` (motor IR
genérico — cifras exactas), `getBudgetStatus`, `getDebts`, `listRecurring`,
`getSavings`, `listGoals`, `getTopMerchants`, `getCashFlow`, `listActiveInsights`,
`getAdvice`. Mutaciones (propuesta + confirmación UI, nunca ejecutan):
`proposeCreateTransaction`, `proposeSetBudget`, `proposeCardPurchase`.

El system prompt inyecta un *profile snapshot* (`profile-snapshot.ts`) con el
contexto financiero real del usuario para personalizar el consejo.
