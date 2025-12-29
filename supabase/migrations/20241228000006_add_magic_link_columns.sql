-- ============================================
-- MIGRATION: Adicionar colunas para magic link
-- ============================================
-- JA APLICADA via MCP

-- Token de magic link
ALTER TABLE users ADD COLUMN IF NOT EXISTS magic_link_token VARCHAR(255);

-- Expiracao do magic link (15 minutos)
ALTER TABLE users ADD COLUMN IF NOT EXISTS magic_link_expires_at TIMESTAMP WITH TIME ZONE;

-- Indice para busca por token
CREATE INDEX IF NOT EXISTS idx_users_magic_link_token ON users(magic_link_token);

-- Comentarios
COMMENT ON COLUMN users.magic_link_token IS 'Token para login via magic link (expira em 15 min)';
COMMENT ON COLUMN users.magic_link_expires_at IS 'Data/hora de expiracao do magic link';
