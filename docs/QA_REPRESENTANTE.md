# QA - Modulo Representante (Playwright MCP)

## Pre-requisitos

### 1. Dados de Teste no Banco

Antes de executar os testes, criar dados via Supabase:

```sql
-- 1. Criar usuario representante para testes
INSERT INTO users_representante (nome, email, password_hash, telefone, ativo)
VALUES ('Representante Teste', 'rep.teste@flowb2b.com', '$2b$10$hashedpassword123', '11999999999', true)
RETURNING id;

-- 2. Criar registro de representante vinculado a empresa
INSERT INTO representantes (user_representante_id, empresa_id, codigo_acesso, nome, telefone, ativo)
VALUES (
  1,  -- id do user_representante criado acima
  2,  -- empresa_id existente
  'REP-TEST-2024',
  'Representante Teste',
  '11999999999',
  true
)
RETURNING id;

-- 3. Vincular fornecedores ao representante
INSERT INTO representante_fornecedores (representante_id, fornecedor_id)
SELECT 1, id FROM fornecedores WHERE empresa_id = 2 LIMIT 3;
```

### 2. Variaveis de Teste

```
BASE_URL: http://localhost:3000
EMAIL_REP: rep.teste@flowb2b.com
SENHA_REP: Teste@123
CODIGO_ACESSO: REP-TEST-2024
```

---

## Cenarios de Teste

### CT-01: Acesso a Pagina de Login

**Objetivo:** Verificar se a pagina de login do representante carrega corretamente

**Passos:**
1. Navegar para `/representante/login`
2. Verificar elementos presentes:
   - Campo "Email"
   - Campo "Codigo de Acesso"
   - Campo "Senha"
   - Botao "Entrar"
   - Link "Criar conta"

**Playwright MCP:**
```
1. browser_navigate: url = "http://localhost:3000/representante/login"
2. browser_snapshot: verificar elementos do formulario
```

**Resultado Esperado:** Pagina carrega com todos os campos do formulario

---

### CT-02: Login com Credenciais Invalidas

**Objetivo:** Verificar mensagem de erro com credenciais incorretas

**Passos:**
1. Navegar para `/representante/login`
2. Preencher email: "invalido@teste.com"
3. Preencher codigo de acesso: "CODIGO-ERRADO"
4. Preencher senha: "senhaerrada"
5. Clicar em "Entrar"
6. Verificar mensagem de erro

**Playwright MCP:**
```
1. browser_navigate: url = "http://localhost:3000/representante/login"
2. browser_snapshot
3. browser_type: ref = [campo email], text = "invalido@teste.com"
4. browser_type: ref = [campo codigo], text = "CODIGO-ERRADO"
5. browser_type: ref = [campo senha], text = "senhaerrada"
6. browser_click: ref = [botao entrar]
7. browser_wait_for: text = "Credenciais invalidas" ou similar
8. browser_snapshot
```

**Resultado Esperado:** Exibe mensagem de erro "Credenciais invalidas"

---

### CT-03: Login com Credenciais Validas

**Objetivo:** Verificar login bem-sucedido e redirecionamento

**Passos:**
1. Navegar para `/representante/login`
2. Preencher email valido
3. Preencher codigo de acesso valido
4. Preencher senha valida
5. Clicar em "Entrar"
6. Verificar redirecionamento para dashboard

**Playwright MCP:**
```
1. browser_navigate: url = "http://localhost:3000/representante/login"
2. browser_snapshot
3. browser_type: ref = [campo email], text = "rep.teste@flowb2b.com"
4. browser_type: ref = [campo codigo], text = "REP-TEST-2024"
5. browser_type: ref = [campo senha], text = "Teste@123"
6. browser_click: ref = [botao entrar]
7. browser_wait_for: text = "Dashboard" ou URL contem "/dashboard"
8. browser_snapshot
```

**Resultado Esperado:** Redireciona para `/representante/dashboard`

---

### CT-04: Dashboard - Visualizacao Inicial

**Objetivo:** Verificar elementos do dashboard apos login

**Pre-condicao:** Usuario logado (executar CT-03)

**Passos:**
1. Verificar presenca de:
   - Card "Pedidos Pendentes"
   - Card "Aguardando Resposta"
   - Card "Fornecedores Vinculados"
   - Lista de acoes rapidas
   - Lista de fornecedores

**Playwright MCP:**
```
1. browser_snapshot
2. Verificar elementos:
   - Texto "Pedidos Pendentes"
   - Texto "Aguardando Resposta"
   - Texto "Fornecedores Vinculados"
   - Botao "Ver Pedidos"
```

**Resultado Esperado:** Dashboard exibe todos os cards e informacoes

---

### CT-05: Navegacao para Lista de Pedidos

**Objetivo:** Verificar navegacao do dashboard para lista de pedidos

**Pre-condicao:** Usuario logado

**Passos:**
1. No dashboard, clicar em "Ver Pedidos" ou "Pedidos" no menu
2. Verificar carregamento da lista de pedidos

**Playwright MCP:**
```
1. browser_click: ref = [botao/link Ver Pedidos]
2. browser_wait_for: URL contem "/pedidos"
3. browser_snapshot
```

**Resultado Esperado:** Exibe lista de pedidos com filtros e tabela

---

### CT-06: Lista de Pedidos - Filtros

**Objetivo:** Verificar funcionamento dos filtros de pedidos

**Pre-condicao:** Usuario logado, na pagina de pedidos

**Passos:**
1. Navegar para `/representante/pedidos`
2. Selecionar filtro de status "Pendente"
3. Verificar que lista atualiza
4. Limpar filtro
5. Selecionar filtro de fornecedor
6. Verificar que lista atualiza

**Playwright MCP:**
```
1. browser_navigate: url = "http://localhost:3000/representante/pedidos"
2. browser_snapshot
3. browser_click: ref = [select status]
4. browser_select_option: ref = [select status], values = ["pendente"]
5. browser_wait_for: time = 1
6. browser_snapshot
```

**Resultado Esperado:** Filtros funcionam e atualizam a lista corretamente

---

### CT-07: Detalhes do Pedido

**Objetivo:** Verificar visualizacao completa dos detalhes de um pedido

**Pre-condicao:** Usuario logado, existe pedido disponivel

**Passos:**
1. Na lista de pedidos, clicar em um pedido
2. Verificar carregamento da pagina de detalhes
3. Verificar secoes presentes:
   - Informacoes do pedido (numero, data, fornecedor)
   - Lista de itens
   - Condicoes comerciais
   - Formulario de sugestao (se aplicavel)

**Playwright MCP:**
```
1. browser_navigate: url = "http://localhost:3000/representante/pedidos"
2. browser_snapshot
3. browser_click: ref = [primeiro pedido da lista]
4. browser_wait_for: text = "Detalhes do Pedido"
5. browser_snapshot
```

**Resultado Esperado:** Pagina exibe todas as informacoes do pedido

---

### CT-08: Enviar Sugestao de Venda

**Objetivo:** Verificar envio de sugestao para um pedido

**Pre-condicao:** Usuario logado, pedido em status que permite sugestao

**Passos:**
1. Abrir detalhes de um pedido pendente
2. Preencher campos da sugestao:
   - Alterar quantidade de um item
   - Definir desconto (%)
   - Definir bonificacao
   - Definir validade da proposta
3. Clicar em "Enviar Sugestao"
4. Confirmar envio no modal
5. Verificar mensagem de sucesso

**Playwright MCP:**
```
1. browser_navigate: url = "http://localhost:3000/representante/pedidos/[ID_PEDIDO]"
2. browser_snapshot
3. browser_type: ref = [campo quantidade item 1], text = "10"
4. browser_type: ref = [campo desconto], text = "5"
5. browser_type: ref = [campo bonificacao], text = "2"
6. browser_click: ref = [botao Enviar Sugestao]
7. browser_wait_for: text = "Confirmar"
8. browser_click: ref = [botao Confirmar]
9. browser_wait_for: text = "Sugestao enviada"
10. browser_snapshot
```

**Resultado Esperado:** Sugestao enviada com sucesso, status do pedido atualizado

---

### CT-09: Responder Contra-Proposta - Aceitar

**Objetivo:** Verificar fluxo de aceitar contra-proposta do lojista

**Pre-condicao:** Pedido com contra-proposta pendente

**Passos:**
1. Abrir detalhes de pedido com contra-proposta
2. Verificar detalhes da contra-proposta exibidos
3. Clicar em "Aceitar Contra-Proposta"
4. Confirmar no modal
5. Verificar mensagem de sucesso

**Playwright MCP:**
```
1. browser_navigate: url = "http://localhost:3000/representante/pedidos/[ID_PEDIDO_CONTRA]"
2. browser_snapshot
3. browser_click: ref = [botao Aceitar]
4. browser_wait_for: text = "Confirmar"
5. browser_click: ref = [botao Confirmar]
6. browser_wait_for: text = "aceita com sucesso"
7. browser_snapshot
```

**Resultado Esperado:** Contra-proposta aceita, pedido sincronizado com Bling

---

### CT-10: Responder Contra-Proposta - Rejeitar

**Objetivo:** Verificar fluxo de rejeitar contra-proposta do lojista

**Pre-condicao:** Pedido com contra-proposta pendente

**Passos:**
1. Abrir detalhes de pedido com contra-proposta
2. Clicar em "Rejeitar Contra-Proposta"
3. Preencher motivo (se obrigatorio)
4. Confirmar no modal
5. Verificar mensagem e status atualizado

**Playwright MCP:**
```
1. browser_navigate: url = "http://localhost:3000/representante/pedidos/[ID_PEDIDO_CONTRA]"
2. browser_snapshot
3. browser_click: ref = [botao Rejeitar]
4. browser_wait_for: text = "Confirmar"
5. browser_type: ref = [campo motivo], text = "Valores fora da politica comercial"
6. browser_click: ref = [botao Confirmar]
7. browser_wait_for: text = "rejeitada"
8. browser_snapshot
```

**Resultado Esperado:** Contra-proposta rejeitada, sugestao anterior reativada

---

### CT-11: Cancelar Pedido

**Objetivo:** Verificar fluxo de cancelamento de pedido

**Pre-condicao:** Pedido em status que permite cancelamento

**Passos:**
1. Abrir detalhes de um pedido
2. Clicar em "Cancelar Pedido"
3. Preencher motivo do cancelamento
4. Confirmar cancelamento
5. Verificar status atualizado

**Playwright MCP:**
```
1. browser_navigate: url = "http://localhost:3000/representante/pedidos/[ID_PEDIDO]"
2. browser_snapshot
3. browser_click: ref = [botao Cancelar Pedido]
4. browser_wait_for: text = "Motivo"
5. browser_type: ref = [campo motivo], text = "Cliente desistiu da compra"
6. browser_click: ref = [botao Confirmar Cancelamento]
7. browser_wait_for: text = "cancelado"
8. browser_snapshot
```

**Resultado Esperado:** Pedido cancelado com sucesso

---

### CT-12: Logout

**Objetivo:** Verificar logout e redirecionamento

**Pre-condicao:** Usuario logado

**Passos:**
1. Clicar no menu de usuario ou botao de logout
2. Confirmar logout
3. Verificar redirecionamento para login
4. Tentar acessar dashboard (deve redirecionar para login)

**Playwright MCP:**
```
1. browser_click: ref = [menu usuario ou botao logout]
2. browser_click: ref = [confirmar logout]
3. browser_wait_for: URL contem "/login"
4. browser_snapshot
5. browser_navigate: url = "http://localhost:3000/representante/dashboard"
6. browser_wait_for: URL contem "/login"
```

**Resultado Esperado:** Usuario deslogado, redirecionado para login

---

### CT-13: Registro de Novo Representante

**Objetivo:** Verificar fluxo de registro com codigo de acesso

**Pre-condicao:** Codigo de acesso valido criado pelo admin

**Passos:**
1. Navegar para `/representante/registro`
2. Preencher codigo de acesso
3. Preencher nome
4. Preencher email
5. Preencher telefone
6. Preencher senha
7. Confirmar senha
8. Clicar em "Criar Conta"
9. Verificar redirecionamento para login ou dashboard

**Playwright MCP:**
```
1. browser_navigate: url = "http://localhost:3000/representante/registro"
2. browser_snapshot
3. browser_type: ref = [campo codigo], text = "NOVO-CODIGO-123"
4. browser_type: ref = [campo nome], text = "Novo Representante"
5. browser_type: ref = [campo email], text = "novo.rep@teste.com"
6. browser_type: ref = [campo telefone], text = "11988887777"
7. browser_type: ref = [campo senha], text = "NovaSenha@123"
8. browser_type: ref = [campo confirmar], text = "NovaSenha@123"
9. browser_click: ref = [botao Criar Conta]
10. browser_wait_for: text = "sucesso" ou URL contem "/login"
11. browser_snapshot
```

**Resultado Esperado:** Conta criada, usuario redirecionado

---

### CT-14: Registro com Codigo Invalido

**Objetivo:** Verificar validacao de codigo de acesso inexistente

**Passos:**
1. Navegar para `/representante/registro`
2. Preencher codigo de acesso invalido
3. Preencher demais campos
4. Clicar em "Criar Conta"
5. Verificar mensagem de erro

**Playwright MCP:**
```
1. browser_navigate: url = "http://localhost:3000/representante/registro"
2. browser_type: ref = [campo codigo], text = "CODIGO-INEXISTENTE"
3. browser_type: ref = [campo nome], text = "Teste"
4. browser_type: ref = [campo email], text = "teste@teste.com"
5. browser_type: ref = [campo senha], text = "Teste@123"
6. browser_type: ref = [campo confirmar], text = "Teste@123"
7. browser_click: ref = [botao Criar Conta]
8. browser_wait_for: text = "Codigo de acesso invalido" ou similar
9. browser_snapshot
```

**Resultado Esperado:** Exibe erro de codigo invalido

---

## Testes de Admin (Cadastro de Representantes)

### CT-15: Admin - Listar Representantes

**Objetivo:** Verificar listagem de representantes pelo admin

**Pre-condicao:** Admin logado no sistema principal

**Passos:**
1. Navegar para `/cadastros/representantes`
2. Verificar tabela com representantes
3. Verificar colunas: Nome, Email, Codigo, Fornecedores, Status

**Playwright MCP:**
```
1. browser_navigate: url = "http://localhost:3000/cadastros/representantes"
2. browser_snapshot
```

**Resultado Esperado:** Lista de representantes exibida corretamente

---

### CT-16: Admin - Criar Novo Representante

**Objetivo:** Verificar criacao de representante pelo admin

**Pre-condicao:** Admin logado

**Passos:**
1. Na lista de representantes, clicar "Novo Representante"
2. Preencher nome
3. Preencher telefone (opcional)
4. Selecionar fornecedores vinculados
5. Clicar "Criar"
6. Verificar codigo de acesso gerado
7. Copiar codigo

**Playwright MCP:**
```
1. browser_navigate: url = "http://localhost:3000/cadastros/representantes"
2. browser_click: ref = [botao Novo Representante]
3. browser_wait_for: text = "Novo Representante"
4. browser_type: ref = [campo nome], text = "Rep Via Admin"
5. browser_type: ref = [campo telefone], text = "11977776666"
6. browser_click: ref = [checkbox fornecedor 1]
7. browser_click: ref = [botao Criar]
8. browser_wait_for: text = "Codigo de Acesso"
9. browser_snapshot
10. browser_click: ref = [botao Copiar Codigo]
```

**Resultado Esperado:** Representante criado, codigo de acesso exibido

---

### CT-17: Admin - Editar Representante

**Objetivo:** Verificar edicao de representante

**Pre-condicao:** Admin logado, representante existente

**Passos:**
1. Na lista, clicar no representante para editar
2. Alterar nome
3. Adicionar/remover fornecedor
4. Salvar alteracoes
5. Verificar atualizacao na lista

**Playwright MCP:**
```
1. browser_navigate: url = "http://localhost:3000/cadastros/representantes"
2. browser_click: ref = [linha do representante]
3. browser_wait_for: text = "Editar"
4. browser_type: ref = [campo nome], text = " - Editado"
5. browser_click: ref = [botao Salvar]
6. browser_wait_for: text = "atualizado"
7. browser_snapshot
```

**Resultado Esperado:** Representante atualizado com sucesso

---

### CT-18: Admin - Desativar Representante

**Objetivo:** Verificar desativacao de representante

**Pre-condicao:** Admin logado, representante ativo

**Passos:**
1. Na lista, encontrar representante ativo
2. Clicar em desativar/toggle de status
3. Confirmar desativacao
4. Verificar status atualizado

**Playwright MCP:**
```
1. browser_navigate: url = "http://localhost:3000/cadastros/representantes"
2. browser_click: ref = [toggle status do representante]
3. browser_wait_for: text = "Confirmar"
4. browser_click: ref = [botao Confirmar]
5. browser_wait_for: text = "desativado"
6. browser_snapshot
```

**Resultado Esperado:** Representante desativado, nao consegue mais logar

---

## Checklist de Execucao

| # | Cenario | Status | Observacoes |
|---|---------|--------|-------------|
| CT-01 | Acesso Login | [ ] | |
| CT-02 | Login Invalido | [ ] | |
| CT-03 | Login Valido | [ ] | |
| CT-04 | Dashboard | [ ] | |
| CT-05 | Nav Pedidos | [ ] | |
| CT-06 | Filtros Pedidos | [ ] | |
| CT-07 | Detalhes Pedido | [ ] | |
| CT-08 | Enviar Sugestao | [ ] | |
| CT-09 | Aceitar Contra | [ ] | |
| CT-10 | Rejeitar Contra | [ ] | |
| CT-11 | Cancelar Pedido | [ ] | |
| CT-12 | Logout | [ ] | |
| CT-13 | Registro Valido | [ ] | |
| CT-14 | Registro Invalido | [ ] | |
| CT-15 | Admin Listar | [ ] | |
| CT-16 | Admin Criar | [ ] | |
| CT-17 | Admin Editar | [ ] | |
| CT-18 | Admin Desativar | [ ] | |

---

## Comandos Playwright MCP - Referencia Rapida

```
# Navegacao
browser_navigate: url = "http://..."

# Capturar estado da pagina
browser_snapshot

# Clicar em elemento
browser_click: ref = "[ref do snapshot]", element = "descricao"

# Digitar texto
browser_type: ref = "[ref]", text = "texto a digitar"

# Selecionar opcao
browser_select_option: ref = "[ref]", values = ["valor"]

# Aguardar
browser_wait_for: text = "texto esperado"
browser_wait_for: time = 2 (segundos)

# Screenshot
browser_take_screenshot: type = "png"

# Preencher formulario completo
browser_fill_form: fields = [
  { name: "Email", type: "textbox", ref: "[ref]", value: "email@teste.com" },
  { name: "Senha", type: "textbox", ref: "[ref]", value: "senha123" }
]
```

---

## Notas

1. **Ordem de Execucao:** Executar CT-01 a CT-03 primeiro para garantir login
2. **Dados de Teste:** Criar dados via SQL antes de iniciar
3. **Limpeza:** Apos testes, limpar dados criados para evitar conflitos
4. **Screenshots:** Capturar em cada passo critico para evidencia
5. **Timeout:** Aumentar timeout para operacoes que chamam APIs externas
