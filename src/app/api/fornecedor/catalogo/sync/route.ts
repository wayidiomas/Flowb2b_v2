import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

function cleanCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

function formatCnpj(cnpj: string): string {
  if (cnpj.length !== 14) return cnpj
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
}

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = cleanCnpj(user.cnpj)

    // Buscar catalogo_id via CNPJ
    const { data: catalogo, error: catError } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (catError || !catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    // Buscar todos fornecedores com este CNPJ
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, empresa_id')
      .eq('cnpj', cnpjLimpo)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ success: true, novos_itens: 0, atualizados: 0 })
    }

    // Buscar itens existentes no catálogo
    const { data: itensExistentes } = await supabase
      .from('catalogo_itens')
      .select('id, produto_id, empresa_id, codigo, nome, marca')
      .eq('catalogo_id', catalogo.id)

    const existingMap = new Map<string, { id: number; codigo: string | null; nome: string | null; marca: string | null }>()
    for (const item of itensExistentes || []) {
      existingMap.set(`${item.produto_id}-${item.empresa_id}`, {
        id: item.id,
        codigo: item.codigo,
        nome: item.nome,
        marca: item.marca,
      })
    }

    let novosItens = 0
    let atualizados = 0
    const novosToInsert: Array<{
      catalogo_id: number
      produto_id: number
      empresa_id: number
      codigo: string | null
      nome: string | null
      marca: string | null
      unidade: string | null
      itens_por_caixa: number | null
      preco_base: number | null
      ativo: boolean
    }> = []

    for (const forn of fornecedores) {
      const { data: produtos } = await supabase
        .from('fornecedores_produtos')
        .select(`
          produto_id, empresa_id, valor_de_compra, codigo_fornecedor,
          produtos!inner(id, codigo, nome, marca, unidade, itens_por_caixa)
        `)
        .eq('fornecedor_id', forn.id)
        .eq('empresa_id', forn.empresa_id)

      if (!produtos) continue

      for (const item of produtos) {
        const prod = item.produtos as any
        const key = `${item.produto_id}-${item.empresa_id}`
        const existing = existingMap.get(key)

        if (existing) {
          // Atualizar se nome/codigo/marca mudou
          const newCodigo = item.codigo_fornecedor || prod.codigo || null
          const newNome = prod.nome || null
          const newMarca = prod.marca || null

          if (existing.codigo !== newCodigo || existing.nome !== newNome || existing.marca !== newMarca) {
            const { error: updateError } = await supabase
              .from('catalogo_itens')
              .update({
                codigo: newCodigo,
                nome: newNome,
                marca: newMarca,
              })
              .eq('id', existing.id)

            if (!updateError) atualizados++
          }
          // Marcar como processado para evitar duplicatas
          existingMap.delete(key)
        } else {
          novosToInsert.push({
            catalogo_id: catalogo.id,
            produto_id: item.produto_id,
            empresa_id: item.empresa_id,
            codigo: item.codigo_fornecedor || prod.codigo || null,
            nome: prod.nome || null,
            marca: prod.marca || null,
            unidade: prod.unidade || null,
            itens_por_caixa: prod.itens_por_caixa || null,
            preco_base: item.valor_de_compra ?? 0,
            ativo: true,
          })
        }
      }
    }

    // Deduplicar novos itens
    const seenKeys = new Set<string>()
    const deduped = novosToInsert.filter(item => {
      const key = `${item.produto_id}-${item.empresa_id}`
      if (seenKeys.has(key)) return false
      seenKeys.add(key)
      return true
    })

    if (deduped.length > 0) {
      for (let i = 0; i < deduped.length; i += 500) {
        const batch = deduped.slice(i, i + 500)
        const { error: insertError } = await supabase
          .from('catalogo_itens')
          .insert(batch)

        if (insertError) {
          console.error('Erro ao inserir novos itens (sync):', insertError)
        } else {
          novosItens += batch.length
        }
      }
    }

    // Atualizar updated_at do catálogo
    await supabase
      .from('catalogo_fornecedor')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', catalogo.id)

    return NextResponse.json({ success: true, novos_itens: novosItens, atualizados })
  } catch (error) {
    console.error('Erro ao sincronizar catalogo:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
