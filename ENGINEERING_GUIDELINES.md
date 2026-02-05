# Engineering Guidelines

Guia de boas práticas de engenharia de software e escrita de código.

---

## 1. Convenções de Nomenclatura

**Escolha UM padrão e use em TODO o projeto (banco, código, API).**

### Opção A: camelCase em tudo (recomendado para JS/TS)

```typescript
// Banco
CREATE TABLE users (userId, createdAt, ...)

// Código
const userId = data.userId

// API
{ "userId": 123, "createdAt": "..." }
```

### Opção B: snake_case em tudo (recomendado para Python/Ruby)

```python
# Banco
CREATE TABLE users (user_id, created_at, ...)

# Código
user_id = data.user_id

# API
{ "user_id": 123, "created_at": "..." }
```

### Tabela de referência

| Contexto | camelCase | snake_case |
|----------|-----------|------------|
| Variáveis | `userName` | `user_name` |
| Funções | `getUserById()` | `get_user_by_id()` |
| Colunas DB | `createdAt` | `created_at` |
| JSON keys | `"userId"` | `"user_id"` |

### Exceções aceitas

| Contexto | Padrão | Motivo |
|----------|--------|--------|
| Componentes React | PascalCase | Convenção do React |
| Constantes | SCREAMING_SNAKE | Destaque visual |
| Variáveis de ambiente | SCREAMING_SNAKE | Convenção universal |
| CSS classes | kebab-case | Convenção CSS |
| URLs/rotas | kebab-case | Convenção web |

**Nunca converter manualmente entre padrões.** Se precisar integrar com sistema que usa padrão diferente, use biblioteca automática na camada de entrada/saída.

---

## 2. Componentes Reutilizáveis

### Estrutura recomendada

```
src/components/
├── ui/                    # Componentes base (atoms)
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.types.ts
│   │   └── index.ts
│   ├── Input/
│   ├── Modal/
│   └── Card/
├── features/              # Componentes de domínio
│   ├── auth/
│   ├── dashboard/
│   └── settings/
└── layouts/
    ├── MainLayout.tsx
    └── AuthLayout.tsx
```

### Princípios

1. **Single Responsibility** - Um componente = uma responsabilidade
2. **Props tipadas** - Sempre usar TypeScript interfaces
3. **Composição sobre herança** - Preferir `children` e slots
4. **Sem lógica de negócio** - Componentes UI devem ser "burros"

```typescript
// Exemplo de componente reutilizável
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  disabled?: boolean
  children: React.ReactNode
  onClick?: () => void
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  children,
  onClick
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      disabled={disabled || isLoading}
      onClick={onClick}
    >
      {isLoading ? <Spinner /> : children}
    </button>
  )
}
```

---

## 3. Debounce

### Quando usar

| Técnica | Caso de Uso |
|---------|-------------|
| **Debounce** | Esperar usuário parar de digitar (busca, autocomplete) |
| **Throttle** | Limitar frequência (scroll, resize, mousemove) |

### Hook reutilizável

```typescript
// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// Uso
function SearchInput() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    if (debouncedQuery) {
      fetchResults(debouncedQuery)
    }
  }, [debouncedQuery])

  return <input value={query} onChange={e => setQuery(e.target.value)} />
}
```

---

## 4. Estilos Globais e Cores

**IAs tendem a inventar cores aleatórias. Parametrize TUDO no `globals.css`.**

```css
/* src/styles/globals.css */

:root {
  /* ========================
     CORES PRIMÁRIAS
     ======================== */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-500: #3b82f6;  /* Principal */
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;

  /* ========================
     CORES SEMÂNTICAS
     ======================== */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;

  /* ========================
     SUPERFÍCIES
     ======================== */
  --color-background: #ffffff;
  --color-surface: #f8fafc;
  --color-border: #e2e8f0;

  /* ========================
     TEXTO
     ======================== */
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #94a3b8;

  /* ========================
     ESPAÇAMENTOS
     ======================== */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* ========================
     TIPOGRAFIA
     ======================== */
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.125rem;

  /* ========================
     BORDAS E SOMBRAS
     ======================== */
  --border-radius-sm: 0.25rem;
  --border-radius-md: 0.5rem;
  --border-radius-lg: 0.75rem;

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

/* Dark Mode */
[data-theme='dark'] {
  --color-background: #0f172a;
  --color-surface: #1e293b;
  --color-border: #334155;
  --color-text-primary: #f8fafc;
}
```

### Uso obrigatório

```css
/* CORRETO - usar variáveis */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-md);
}

/* ERRADO - hardcoded */
.card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
```

---

## 5. Variáveis de Ambiente

### Formato padrão

```env
# .env.example (commitar)
# .env.local (NÃO commitar)

# ============================================
# DATABASE
# ============================================
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# ============================================
# EXTERNAL APIS
# ============================================
API_KEY=your_api_key
API_SECRET=your_api_secret

# ============================================
# APP CONFIG
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret_min_32_chars

# ============================================
# AMBIENTE
# ============================================
NODE_ENV=development
IS_DEV=true
LOG_LEVEL=debug
```

### Validação com Zod

```typescript
// src/lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  IS_DEV: z.string().transform(v => v === 'true').default('false'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

export const env = envSchema.parse(process.env)
```

---

## 6. Sistema de Logs

**Todos os logs devem ter:**
- Variável `IS_DEV` para controle
- `LOG_LEVEL` para filtrar severidade
- Serialização JSON em produção

```typescript
// src/lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEvent {
  level: LogLevel
  message: string
  timestamp: string
  context?: string
  data?: Record<string, unknown>
  error?: { name: string; message: string; stack?: string }
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0, info: 1, warn: 2, error: 3
}

class Logger {
  private isDev = process.env.IS_DEV === 'true'
  private minLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'
  private context?: string

  constructor(context?: string) {
    this.context = context
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel]
  }

  private output(level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog(level)) return

    const event: LogEvent = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
      data,
      error: error ? { name: error.name, message: error.message, stack: this.isDev ? error.stack : undefined } : undefined
    }

    if (this.isDev) {
      // Dev: formato legível
      const colors = { debug: '\x1b[36m', info: '\x1b[32m', warn: '\x1b[33m', error: '\x1b[31m' }
      console.log(`${colors[level]}[${level.toUpperCase()}]\x1b[0m`, message, data || '')
    } else {
      // Prod: JSON serializado
      console.log(JSON.stringify(event))
    }
  }

  debug(message: string, data?: Record<string, unknown>) { this.output('debug', message, data) }
  info(message: string, data?: Record<string, unknown>) { this.output('info', message, data) }
  warn(message: string, data?: Record<string, unknown>) { this.output('warn', message, data) }
  error(message: string, error?: Error, data?: Record<string, unknown>) { this.output('error', message, data, error) }
}

export const logger = new Logger()
export const createLogger = (context: string) => new Logger(context)
```

### Output em produção

```json
{"level":"error","message":"Failed to fetch","timestamp":"2025-01-29T10:30:00.000Z","context":"UserService","data":{"userId":123}}
```

---

## 7. Git Workflow

### Fluxo de decisão

```
┌─────────────────────────────────────────────────────────────┐
│                    TIPO DE TRABALHO                          │
└─────────────────────────────────────────────────────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         ▼                                     ▼
┌────────────────────┐              ┌────────────────────┐
│  FEATURE ISOLADA   │              │  FEATURE PARALELA  │
│  (só você mexendo) │              │  (múltiplos devs)  │
└────────┬───────────┘              └────────┬───────────┘
         │                                   │
         ▼                                   ▼
┌────────────────────┐              ┌────────────────────┐
│ 1. git pull origin │              │ 1. git pull origin │
│    main            │              │    main            │
│                    │              │                    │
│ 2. Desenvolver     │              │ 2. git checkout -b │
│                    │              │    feature/xxx     │
│ 3. Commit direto   │              │                    │
│    na branch       │              │ 3. Desenvolver     │
│                    │              │                    │
│ 4. git push        │              │ 4. Testar local    │
└────────────────────┘              │    (docker-compose)│
                                    │                    │
                                    │ 5. git push -u     │
                                    │                    │
                                    │ 6. Abrir PR → main │
                                    │                    │
                                    │ 7. Code Review     │
                                    │                    │
                                    │ 8. Merge aprovado  │
                                    └────────────────────┘
```

### Regra de ouro

```bash
# SEMPRE antes de começar qualquer trabalho
git pull origin main
```

### Conventional Commits

```
<tipo>(<escopo>): <descrição>
```

| Tipo | Uso |
|------|-----|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `docs` | Documentação |
| `style` | Formatação |
| `refactor` | Refatoração |
| `test` | Testes |
| `chore` | Manutenção |

```bash
git commit -m "feat(auth): adiciona login com Google"
git commit -m "fix(cart): corrige cálculo de desconto"
```

---

## 8. Testes com Playwright + Chrome DevTools

### Usar MCP do Playwright para testar

- Race conditions (double click, submit duplo)
- Memory leaks
- Network failures
- Console errors
- Layout shifts

### Exemplo de teste de race condition

```typescript
// tests/e2e/race-conditions.spec.ts
import { test, expect } from '@playwright/test'

test('double click não duplica ação', async ({ page }) => {
  await page.goto('/form')

  const submitButton = page.locator('button[type="submit"]')

  // Simula double click rápido
  await Promise.all([
    submitButton.click(),
    submitButton.click(),
  ])

  // Deve executar apenas 1 vez
  await expect(page.locator('.toast-success')).toHaveCount(1)
})

test('debounce funciona na busca', async ({ page }) => {
  await page.goto('/search')

  let requestCount = 0
  page.on('request', req => {
    if (req.url().includes('/api/search')) requestCount++
  })

  await page.locator('input[name="q"]').type('teste rapido', { delay: 50 })
  await page.waitForTimeout(600)

  // Apenas 1 request após debounce
  expect(requestCount).toBeLessThanOrEqual(2)
})
```

---

## 9. Docker Compose para Testes Locais

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - IS_DEV=true
    depends_on:
      - db
      - api
    volumes:
      - .:/app
      - /app/node_modules

  api:
    build:
      context: ../api
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/app

  db:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=app
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Comandos

```bash
docker-compose up -d        # Subir serviços
docker-compose logs -f app  # Ver logs
docker-compose down         # Parar tudo
```

---

## 10. Error Handling

### Classes de erro padronizadas

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400)
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Não autorizado') {
    super(message, 'AUTH_ERROR', 401)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} não encontrado`, 'NOT_FOUND', 404)
  }
}
```

---

## 11. Segurança - Checklist

- [ ] Nunca expor secrets no frontend
- [ ] Validar TODOS os inputs (Zod)
- [ ] Sanitizar dados antes de renderizar (XSS)
- [ ] Usar prepared statements (SQL injection)
- [ ] CSRF tokens em formulários
- [ ] Rate limiting em endpoints sensíveis
- [ ] CORS configurado corretamente

---

## 12. Code Review Checklist

### Antes de aprovar PR

- [ ] Código atende aos requisitos
- [ ] Segue convenções de nomenclatura
- [ ] Sem código duplicado
- [ ] Sem `console.log` perdidos
- [ ] Inputs validados
- [ ] Erros tratados
- [ ] Testes passando

---

## 13. Performance - Quick Wins

```typescript
// 1. Memoização
const MemoizedComponent = memo(Component)

// 2. useMemo para cálculos pesados
const sorted = useMemo(() => items.sort(...), [items])

// 3. useCallback para funções em props
const handleClick = useCallback(() => {}, [])

// 4. Lazy loading
const Heavy = dynamic(() => import('./Heavy'), { ssr: false })

// 5. Image optimization
<Image src="/img.jpg" width={300} height={200} />
```

---

## Resumo das Regras

| Regra | Descrição |
|-------|-----------|
| Nomenclatura | UM padrão em todo o projeto, nunca converter manualmente |
| Componentes | Reutilizáveis, tipados, sem lógica de negócio |
| Debounce | Usar em inputs de busca e eventos frequentes |
| Cores | SEMPRE usar variáveis CSS, nunca hardcoded |
| Env | Formato `VARIAVEL=valor`, validar com Zod |
| Logs | IS_DEV + LOG_LEVEL + JSON em prod |
| Git | Pull antes de tudo, branch+PR para trabalho paralelo |
| Testes | Playwright + DevTools para bugs de frontend |
| Docker | Orquestrar serviços para teste local |
