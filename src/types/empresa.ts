// Tipos para a tabela empresas

export interface Empresa {
  id: number
  razao_social: string
  nome_fantasia: string | null
  cnpj: string | null
  endereco_resumido: string | null
  numero_colaboradores: number | null
  ativo: boolean | null
  unidade: string | null // Matriz, Filial, etc.
  logotipo: string | null
  email_cobranca: string | null
  contato: string | null
  inscricao_estadual: string | null
  inscricao_municipal: string | null
  cd_regime_tributario: string | null
  conectadabling: boolean | null
  dataexpirabling: string | null
  segmento: string[] | null
  lista_colaboradores: string[] | null
  created_date: string | null
  modified_date: string | null
}

export interface EmpresaListItem {
  id: number
  razao_social: string
  nome_fantasia: string | null
  endereco_resumido: string | null
  numero_colaboradores: number | null
  ativo: boolean | null
  unidade: string | null
}
