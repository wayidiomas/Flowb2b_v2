// src/lib/catalogo-notificacoes.ts
// Helper para registrar mudanças do catálogo do fornecedor em `catalogo_atualizacoes`.
// O trigger SQL `fn_bump_catalogo_status_lojista` cuida de bumpar `catalogo_status_lojista`
// automaticamente — não precisamos tocar nessa tabela aqui.

import type { SupabaseClient } from '@supabase/supabase-js'

export type TipoMudanca = 'novo' | 'preco' | 'dados' | 'removido'

export interface MudancaCatalogo {
  tipo: TipoMudanca
  catalogo_item_id: number | null
  dados_antigos: Record<string, unknown> | null
  dados_novos: Record<string, unknown> | null
}

export interface NotificarOptions {
  /** Limite de empresas vinculadas — fail-safe para evitar explosão de inserts. Default 1000. */
  maxEmpresas?: number
}

export interface NotificarResult {
  empresasNotificadas: number
  notificacoesCriadas: number
  erros: string[]
}

/**
 * Registra mudanças do catálogo para todos os lojistas (empresas) vinculados
 * ao fornecedor (mesmo CNPJ). Cada mudança vira uma linha em `catalogo_atualizacoes`
 * por empresa vinculada.
 *
 * O trigger `trg_bump_catalogo_status_lojista` atualiza `catalogo_status_lojista`
 * para `desatualizado` automaticamente.
 *
 * Não falha o caller — erros vão em `result.erros`.
 */
export async function notificarLojistas(
  supabase: SupabaseClient,
  catalogo_id: number,
  cnpj_fornecedor: string,
  mudancas: MudancaCatalogo[],
  opts: NotificarOptions = {}
): Promise<NotificarResult> {
  const result: NotificarResult = {
    empresasNotificadas: 0,
    notificacoesCriadas: 0,
    erros: []
  }

  if (!mudancas.length) return result

  const cnpjLimpo = cnpj_fornecedor.replace(/\D/g, '')
  const maxEmpresas = opts.maxEmpresas ?? 1000

  // 1. Busca todas as empresas vinculadas a esse fornecedor
  const { data: fornecedoresVinculados, error: fornErr } = await supabase
    .from('fornecedores')
    .select('empresa_id')
    .eq('cnpj', cnpjLimpo)

  if (fornErr) {
    result.erros.push(`Erro ao buscar fornecedores vinculados: ${fornErr.message}`)
    return result
  }

  const empresaIds = [
    ...new Set(
      (fornecedoresVinculados || [])
        .map(f => f.empresa_id)
        .filter((id): id is number => typeof id === 'number')
    )
  ].slice(0, maxEmpresas)

  if (empresaIds.length === 0) return result
  result.empresasNotificadas = empresaIds.length

  // 2. Monta as notificações (cartesian: empresas × mudanças)
  const notificacoes: Array<Record<string, unknown>> = []
  for (const empresa_id of empresaIds) {
    for (const m of mudancas) {
      notificacoes.push({
        catalogo_id,
        empresa_id,
        tipo: m.tipo,
        catalogo_item_id: m.catalogo_item_id,
        dados_antigos: m.dados_antigos,
        dados_novos: m.dados_novos,
        status: 'pendente'
      })
    }
  }

  // 3. Batch insert (chunks de 500)
  for (let i = 0; i < notificacoes.length; i += 500) {
    const batch = notificacoes.slice(i, i + 500)
    const { error: insErr } = await supabase
      .from('catalogo_atualizacoes')
      .insert(batch)

    if (insErr) {
      result.erros.push(`Erro ao inserir batch ${i}: ${insErr.message}`)
    } else {
      result.notificacoesCriadas += batch.length
    }
  }

  return result
}

/**
 * Atalho: notifica uma única mudança (edição manual de 1 item, p.ex.).
 */
export async function notificarLojistasUmaMudanca(
  supabase: SupabaseClient,
  catalogo_id: number,
  cnpj_fornecedor: string,
  mudanca: MudancaCatalogo
): Promise<NotificarResult> {
  return notificarLojistas(supabase, catalogo_id, cnpj_fornecedor, [mudanca])
}
