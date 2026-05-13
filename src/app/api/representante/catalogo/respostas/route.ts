import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import {
  authRepresentanteCatalogoMulti,
  isNextResponse,
} from '@/lib/representante-catalogo-auth'

function formatCnpj(cnpj: string): string {
  const c = cnpj.replace(/\D/g, '')
  if (c.length !== 14) return cnpj
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await authRepresentanteCatalogoMulti(request)
    if (isNextResponse(ctx)) return ctx
    const { cnpjs } = ctx

    const supabase = createServerSupabaseClient()

    const { data: catalogos, error: catError } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .in('cnpj', cnpjs)

    if (catError || !catalogos || catalogos.length === 0) {
      return NextResponse.json({ respostas: [] })
    }

    const catalogoIds = catalogos.map((c) => c.id)

    const { data: atualizacoes, error: attError } = await supabase
      .from('catalogo_atualizacoes')
      .select('id, empresa_id, tipo, status, catalogo_item_id, dados_antigos, dados_novos, respondido_em, catalogo_id')
      .in('catalogo_id', catalogoIds)
      .in('status', ['aceito', 'rejeitado'])
      .order('respondido_em', { ascending: false })

    if (attError) {
      console.error('Erro ao buscar respostas:', attError)
      return NextResponse.json({ error: 'Erro ao buscar respostas' }, { status: 500 })
    }

    if (!atualizacoes || atualizacoes.length === 0) {
      return NextResponse.json({ respostas: [] })
    }

    const empresaIds = [...new Set(atualizacoes.map(a => a.empresa_id).filter(Boolean))]

    const empresaMap = new Map<number, { nome: string; cnpj: string }>()
    if (empresaIds.length > 0) {
      const { data: empresas } = await supabase
        .from('empresas')
        .select('id, nome_fantasia, razao_social, cnpj')
        .in('id', empresaIds)

      for (const emp of empresas || []) {
        empresaMap.set(emp.id, {
          nome: emp.nome_fantasia || emp.razao_social || `Empresa ${emp.id}`,
          cnpj: emp.cnpj || '',
        })
      }
    }

    const itemIds = [...new Set(
      atualizacoes
        .map(a => a.catalogo_item_id)
        .filter((id): id is number => id !== null)
    )]

    const itemMap = new Map<number, { nome: string | null; codigo: string | null; ean: string | null }>()
    if (itemIds.length > 0) {
      for (let i = 0; i < itemIds.length; i += 500) {
        const batch = itemIds.slice(i, i + 500)
        const { data: itens } = await supabase
          .from('catalogo_itens')
          .select('id, nome, codigo, ean')
          .in('id', batch)

        for (const item of itens || []) {
          itemMap.set(item.id, {
            nome: item.nome,
            codigo: item.codigo,
            ean: item.ean,
          })
        }
      }
    }

    const porEmpresa = new Map<number, {
      empresa_id: number
      empresa_nome: string
      empresa_cnpj: string
      itens: Array<{
        id: number
        tipo: string
        status: string
        item_nome: string | null
        item_codigo: string | null
        item_ean: string | null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dados_antigos: any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dados_novos: any
        respondido_em: string | null
      }>
    }>()

    for (const att of atualizacoes) {
      const empId = att.empresa_id
      if (!empId) continue

      if (!porEmpresa.has(empId)) {
        const empInfo = empresaMap.get(empId)
        porEmpresa.set(empId, {
          empresa_id: empId,
          empresa_nome: empInfo?.nome || `Empresa ${empId}`,
          empresa_cnpj: empInfo?.cnpj ? formatCnpj(empInfo.cnpj) : '',
          itens: [],
        })
      }

      const itemData = att.catalogo_item_id ? itemMap.get(att.catalogo_item_id) : null
      const itemNome = itemData?.nome
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        || (att.dados_novos as Record<string, any> | null)?.nome
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        || (att.dados_antigos as Record<string, any> | null)?.nome
        || null
      const itemCodigo = itemData?.codigo || null
      const itemEan = itemData?.ean
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        || (att.dados_novos as Record<string, any> | null)?.ean
        || null

      porEmpresa.get(empId)!.itens.push({
        id: att.id,
        tipo: att.tipo,
        status: att.status,
        item_nome: itemNome,
        item_codigo: itemCodigo,
        item_ean: itemEan,
        dados_antigos: att.dados_antigos,
        dados_novos: att.dados_novos,
        respondido_em: att.respondido_em,
      })
    }

    const respostas = Array.from(porEmpresa.values())

    return NextResponse.json({ respostas })
  } catch (error) {
    console.error('Erro ao buscar respostas (representante):', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
