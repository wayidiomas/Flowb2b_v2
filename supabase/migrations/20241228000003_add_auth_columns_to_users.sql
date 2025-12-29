-- ============================================
-- MIGRATION: Adicionar colunas de auth em users
-- ============================================
-- ADITIVA - apenas adiciona colunas novas
-- JA APLICADA via MCP em 2024-12-28

-- Adicionar password_hash para autenticacao propria
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Adicionar role
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Adicionar ativo
ALTER TABLE users ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- Adicionar updated_at
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Indices
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_ativo ON users(ativo);

-- Comentarios
COMMENT ON COLUMN users.password_hash IS 'Hash bcrypt da senha (salt 12) para auth propria';
COMMENT ON COLUMN users.role IS 'Papel do usuario: admin ou user';
COMMENT ON COLUMN users.ativo IS 'Se o usuario esta ativo no sistema';
