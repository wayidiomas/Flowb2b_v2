-- ============================================
-- MIGRATION: Corrigir tipo da coluna nome
-- ============================================
-- A coluna nome estava como INTEGER, deveria ser VARCHAR
-- JA APLICADA via MCP em 2024-12-28

ALTER TABLE users ALTER COLUMN nome TYPE VARCHAR(255) USING nome::VARCHAR(255);
