-- Row Level Security para Finanzia.
-- Ejecutar DESPUÉS de `pnpm db:push` (cuando ya existen las tablas).
-- Idempotente.
--
-- Modelo: cada tabla con user_id queda aislada por usuario.
-- La política consulta users.clerk_id contra el JWT (auth.jwt() ->> 'sub').
-- Para que funcione, las conexiones desde el cliente deben usar la anon key
-- + un JWT emitido por Clerk con `sub` igual al clerk_id del usuario.
-- (Clerk-Supabase integration habilita esto.)
--
-- Defensa en profundidad: aun si la anon key se filtrara, RLS bloquea
-- consultas cross-user. Las queries del servidor con service_role
-- saltan RLS por diseño y deben filtrar por user_id en código.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'users',
    'profiles',
    'accounts',
    'categories',
    'transactions',
    'budgets',
    'goals',
    'recurring_rules',
    'insights',
    'conversations',
    'alerts',
    'import_batches',
    'user_integrations'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ----- users (lectura del propio registro) -----
DROP POLICY IF EXISTS users_isolation ON users;
CREATE POLICY users_isolation ON users
  FOR ALL
  USING (clerk_id = auth.jwt() ->> 'sub')
  WITH CHECK (clerk_id = auth.jwt() ->> 'sub');

-- ----- profiles -----
DROP POLICY IF EXISTS profiles_isolation ON profiles;
CREATE POLICY profiles_isolation ON profiles
  FOR ALL
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

-- ----- accounts -----
DROP POLICY IF EXISTS accounts_isolation ON accounts;
CREATE POLICY accounts_isolation ON accounts
  FOR ALL
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

-- ----- categories (las del sistema, user_id IS NULL, son visibles para todos) -----
DROP POLICY IF EXISTS categories_isolation ON categories;
CREATE POLICY categories_isolation ON categories
  FOR ALL
  USING (
    user_id IS NULL
    OR user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
  )
  WITH CHECK (
    user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

-- ----- transactions -----
DROP POLICY IF EXISTS transactions_isolation ON transactions;
CREATE POLICY transactions_isolation ON transactions
  FOR ALL
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

-- ----- budgets -----
DROP POLICY IF EXISTS budgets_isolation ON budgets;
CREATE POLICY budgets_isolation ON budgets
  FOR ALL
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

-- ----- goals -----
DROP POLICY IF EXISTS goals_isolation ON goals;
CREATE POLICY goals_isolation ON goals
  FOR ALL
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

-- ----- recurring_rules -----
DROP POLICY IF EXISTS recurring_rules_isolation ON recurring_rules;
CREATE POLICY recurring_rules_isolation ON recurring_rules
  FOR ALL
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

-- ----- insights -----
DROP POLICY IF EXISTS insights_isolation ON insights;
CREATE POLICY insights_isolation ON insights
  FOR ALL
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

-- ----- conversations -----
DROP POLICY IF EXISTS conversations_isolation ON conversations;
CREATE POLICY conversations_isolation ON conversations
  FOR ALL
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

-- ----- messages (via conversation -> user) -----
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_isolation ON messages;
CREATE POLICY messages_isolation ON messages
  FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
    )
  );

-- ----- alerts -----
DROP POLICY IF EXISTS alerts_isolation ON alerts;
CREATE POLICY alerts_isolation ON alerts
  FOR ALL
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

-- ----- import_batches -----
DROP POLICY IF EXISTS import_batches_isolation ON import_batches;
CREATE POLICY import_batches_isolation ON import_batches
  FOR ALL
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

-- ----- user_integrations -----
DROP POLICY IF EXISTS user_integrations_isolation ON user_integrations;
CREATE POLICY user_integrations_isolation ON user_integrations
  FOR ALL
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

-- exchange_rates queda sin RLS (cache global compartido).
