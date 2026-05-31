import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // Regla no negociable #9: sin `any`. Usa `unknown` + narrowing.
      "@typescript-eslint/no-explicit-any": "error",
      // Regla de organizacion #1: una responsabilidad por archivo, max 300
      // lineas de codigo. `warn` por ahora: hay archivos legados que superan
      // el limite (extraerlos es parte de la higiene continua, no de Fase 0).
      // schema.ts y catalog.ts son excepciones documentadas (catalogos).
      "max-lines": ["warn", { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // Regla de organizacion #6: toda env var se accede via src/lib/env.ts.
    // Prohibe `process.env` en el resto de src/ (el tooling CLI en scripts/ y
    // los config de la raiz quedan fuera de este scope a proposito).
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.name='process'][property.name='env']",
          message:
            "No accedas a process.env directamente. Importa `env` desde '@/lib/env'.",
        },
      ],
    },
  },
  {
    // env.ts es la frontera autorizada para process.env. instrumentation.ts y
    // los config de Sentry leen NEXT_RUNTIME (var de runtime de Next, fuera del
    // schema de env.ts), asi que tambien quedan exentos del guard.
    files: ["src/lib/env.ts", "src/instrumentation.ts", "src/sentry.*.config.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  {
    // Excepciones documentadas de max-lines (no son "un componente que crecio",
    // son definiciones de datos o primitivos vendored): el schema Drizzle, el
    // catalogo de tarjetas y el primitivo shadcn de sidebar. Asi el warning de
    // max-lines refleja solo objetivos reales de extraccion.
    files: [
      "src/lib/db/schema.ts",
      "src/lib/cards/catalog.ts",
      "src/components/ui/sidebar.tsx",
    ],
    rules: {
      "max-lines": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "drizzle/**",
    "design_handoff_finanzia_brand/**",
  ]),
]);

export default eslintConfig;
