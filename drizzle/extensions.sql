-- Habilita extensiones requeridas por Finanzia.
-- Ejecutar UNA SOLA VEZ antes del primer `pnpm db:push`.
-- Idempotente.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
