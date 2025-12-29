-- ============================================
-- MIGRATION: Users com multiplas empresas
-- ============================================
-- ADITIVA - nao altera estruturas existentes
-- Apenas adiciona tabela de juncao N:N

-- ============================================
-- Criar tabela de juncao users_empresas
-- ============================================
CREATE TABLE IF NOT EXISTS users_empresas (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, empresa_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_users_empresas_user_id ON users_empresas(user_id);
CREATE INDEX IF NOT EXISTS idx_users_empresas_empresa_id ON users_empresas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_users_empresas_ativo ON users_empresas(ativo);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_users_empresas_updated_at ON users_empresas;
CREATE TRIGGER update_users_empresas_updated_at
  BEFORE UPDATE ON users_empresas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE users_empresas ENABLE ROW LEVEL SECURITY;

-- Comentarios
COMMENT ON TABLE users_empresas IS 'Relacao N:N entre users e empresas. Um user pode pertencer a varias empresas.';
COMMENT ON COLUMN users_empresas.role IS 'Papel do usuario NESTA empresa: admin, user ou viewer';

-- ============================================
-- Funcao helper para pegar empresas do user
-- ============================================
CREATE OR REPLACE FUNCTION get_user_empresas(p_user_id UUID)
RETURNS TABLE (
  empresa_id INTEGER,
  role VARCHAR(50),
  ativo BOOLEAN,
  nome_fantasia VARCHAR(255),
  razao_social VARCHAR(255),
  cnpj VARCHAR(18)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ue.empresa_id,
    ue.role,
    ue.ativo,
    e.nome_fantasia,
    e.razao_social,
    e.cnpj
  FROM users_empresas ue
  JOIN empresas e ON e.id = ue.empresa_id
  WHERE ue.user_id = p_user_id AND ue.ativo = true;
END;
$$ LANGUAGE plpgsql;
