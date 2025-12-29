-- ============================================
-- MIGRATION: Adicionar colunas para reset de senha
-- ============================================
-- JA APLICADA via MCP

-- Token de reset de senha
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);

-- Expiracao do token (1 hora)
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Indice para busca por token
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);

-- Comentarios
COMMENT ON COLUMN users.reset_token IS 'Token para reset de senha (expira em 1 hora)';
COMMENT ON COLUMN users.reset_token_expires_at IS 'Data/hora de expiracao do token de reset';
