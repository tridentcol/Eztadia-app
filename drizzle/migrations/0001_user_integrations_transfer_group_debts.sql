-- Consolida los cambios posteriores al snapshot 0000:
--   1. user_integrations (vault-backed API keys).
--   2. transactions.transfer_group_id (agrupa pares de transferencias).
--   3. debts (préstamos, hipotecas y similares; las tarjetas siguen en accounts).
--
-- Idempotente. Los entornos que ya aplicaron parte de estos cambios de forma
-- manual (DB de producción a 2026-05-26) lo absorben sin conflicto. RLS para
-- las tablas nuevas se aplica desde drizzle/rls.sql.

-- ─── Enums ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE integration_provider AS ENUM ('anthropic', 'openai');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE integration_status AS ENUM ('active', 'invalid', 'disabled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE debt_type AS ENUM (
    'loan_personal',
    'mortgage',
    'auto_loan',
    'student_loan',
    'family_loan',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE debt_status AS ENUM ('active', 'paid', 'defaulted');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── user_integrations ───────────────────────────────────────────────────
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

-- ─── transactions.transfer_group_id ─────────────────────────────────────
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS transfer_group_id uuid;

CREATE INDEX IF NOT EXISTS idx_transactions_transfer_group
  ON public.transactions(transfer_group_id);

-- ─── debts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  lender text,
  type debt_type NOT NULL,
  principal numeric(15, 2) NOT NULL,
  current_balance numeric(15, 2) NOT NULL,
  currency text NOT NULL,
  interest_rate numeric(7, 4),
  installment_amount numeric(15, 2),
  term_months integer,
  origin_date date,
  next_payment_date date,
  payment_day smallint,
  linked_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  status debt_status NOT NULL DEFAULT 'active',
  notes text,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debts_user ON public.debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user_status
  ON public.debts(user_id, status);
