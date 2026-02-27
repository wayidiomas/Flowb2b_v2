export interface Permissoes {
  cadastros: boolean
  pedidos: boolean
  relatorios: boolean
  configuracoes: boolean
  financeiro: boolean
  estoque: boolean
}

export type PermissaoKey = keyof Permissoes

export const DEFAULT_PERMISSOES: Permissoes = {
  cadastros: true,
  pedidos: true,
  relatorios: true,
  configuracoes: false,
  financeiro: false,
  estoque: true,
}

export const ROLE_PERMISSOES: Record<string, Permissoes> = {
  admin: {
    cadastros: true,
    pedidos: true,
    relatorios: true,
    configuracoes: true,
    financeiro: true,
    estoque: true,
  },
  user: {
    cadastros: true,
    pedidos: true,
    relatorios: true,
    configuracoes: false,
    financeiro: false,
    estoque: true,
  },
  viewer: {
    cadastros: false,
    pedidos: false,
    relatorios: true,
    configuracoes: false,
    financeiro: false,
    estoque: false,
  },
}
