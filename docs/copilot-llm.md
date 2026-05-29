# Copiloto — cerebro LLM (OpenAI gpt-5 mini)

El copiloto tiene dos caminos: el **motor local** (NLU + motor de consultas
componible, gratis) y el **LLM**. El ruteo es local-first: si el motor local es
confiado responde él; si difiere, va al LLM. El LLM es ahora el cerebro completo
y puede leer todos los datos del usuario vía tools.

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
| `COPILOT_FORCE_LLM` | off | si `1`, salta el local-first y manda TODO al LLM (evaluación) |

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

# 2. Forzar TODO al LLM y levantar el dev server:
COPILOT_FORCE_LLM=1 FINANZIA_COPILOT_DEBUG=1 pnpm dev
# Cmd+J en la app → preguntar. Los logs [copilot:route] y [copilot:llm]
# muestran provider, modelo, reasoningEffort, # tool calls y usage.
```

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
