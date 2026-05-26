-- user_integrations: una fila por (user, provider). La API key plaintext NUNCA
-- vive en esta tabla — Supabase Vault la cifra y aquí guardamos el secret_id.
-- RLS aísla por usuario.
--
-- Aplicación: pnpm db:bootstrap (corre extensions.sql + rls.sql) o aplicar
-- manualmente este archivo. Idempotente vía IF NOT EXISTS donde aplica.

DO $$ BEGIN
  CREATE TYPE integration_provider AS ENUM ('anthropic', 'openai');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE integration_status AS ENUM ('active', 'invalid', 'disabled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.user_integrations (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider integration_provider NOT NULL,
  secret_id uuid NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  status integration_status NOT NULL DEFAULT 'active',
  last_validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_integrations_user
  ON public.user_integrations(user_id);

COMMENT ON TABLE public.user_integrations IS
  'Integraciones LLM por usuario. Plaintext en vault.secrets; aquí solo secret_id + metadatos.';
