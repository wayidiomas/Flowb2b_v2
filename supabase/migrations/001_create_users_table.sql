-- Tabela de usuários para autenticação própria
-- Execute este SQL no Supabase SQL Editor

-- Criar tabela users (se ainda não existir ou estiver diferente)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nome VARCHAR(255),
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_empresa_id ON users(empresa_id);
CREATE INDEX IF NOT EXISTS idx_users_ativo ON users(ativo);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar usuário admin inicial (MUDE A SENHA!)
-- Senha: admin123 (hash bcrypt gerado com salt 12)
-- IMPORTANTE: Altere esta senha imediatamente após o primeiro login!
INSERT INTO users (email, password_hash, nome, empresa_id, role, ativo)
VALUES (
  'admin@flowb2b.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.6YQW9z7n0Z2vVu', -- admin123
  'Administrador',
  1, -- Ajuste para o ID da sua empresa
  'admin',
  true
)
ON CONFLICT (email) DO NOTHING;

-- Comentário sobre a estrutura
COMMENT ON TABLE users IS 'Tabela de usuários para autenticação própria (não usa Supabase Auth)';
COMMENT ON COLUMN users.empresa_id IS 'CRÍTICO: Chave para isolamento multi-tenant. Todo usuário pertence a uma empresa.';
COMMENT ON COLUMN users.role IS 'Papel do usuário: admin ou user';
