export interface NotaFiscalListItem {
  id: number
  numero: string
  serie: number | null
  tipo: string // '0' = entrada, '1' = saida
  situacao: number
  data_emissao: string | null
  data_operacao: string | null
  contato_nome: string | null
  contato_numero_documento: string | null
  chave_acesso: string | null
  xml_url: string | null
  link_danfe: string | null
  link_pdf: string | null
  fornecedor_id: number | null
  fornecedor_nome?: string | null
  fornecedor_cnpj?: string | null
}

// Mapeamento de situações do Bling
export const SITUACAO_NOTA: Record<number, { label: string; color: string }> = {
  1: { label: 'Pendente', color: 'yellow' },
  2: { label: 'Cancelada', color: 'red' },
  3: { label: 'Aguardando Recibo', color: 'blue' },
  4: { label: 'Rejeitada', color: 'red' },
  5: { label: 'Denegada', color: 'red' },
  6: { label: 'Inutilizada', color: 'gray' },
  7: { label: 'Autorizada', color: 'green' },
  8: { label: 'Emitida DANFE', color: 'green' },
  9: { label: 'Registrada', color: 'blue' },
  10: { label: 'Aguardando Protocolo', color: 'yellow' },
}
