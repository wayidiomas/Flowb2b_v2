import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { parseImportFile } from '@/lib/catalogo-import'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const empresaId = formData.get('empresa_id') as string
    const mode = formData.get('mode') as string // 'preview' or 'confirm'

    if (!file) return NextResponse.json({ error: 'Arquivo obrigatorio' }, { status: 400 })
    if (!empresaId) return NextResponse.json({ error: 'empresa_id obrigatorio' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = user.cnpj.replace(/\D/g, '')

    // Validate fornecedor serves this empresa
    const { data: fornecedor } = await supabase
      .from('fornecedores')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .eq('empresa_id', Number(empresaId))
      .limit(1)
      .single()

    if (!fornecedor) {
      return NextResponse.json({ error: 'Fornecedor nao vinculado a esta empresa' }, { status: 403 })
    }

    // Get catalog
    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (!catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado. Crie o catalogo primeiro.' }, { status: 404 })
    }

    // Parse file
    const buffer = Buffer.from(await file.arrayBuffer())
    const { validos, erros } = parseImportFile(buffer, file.name)

    if (validos.length === 0 && erros.length === 0) {
      return NextResponse.json({ error: 'Planilha vazia ou formato invalido' }, { status: 400 })
    }

    // For each valid row, check if item already exists in catalog
    // Match by: codigo_fornecedor (catalogo_itens.codigo) OR ean (produtos.gtin)
    const { data: existingItems } = await supabase
      .from('catalogo_itens')
      .select('id, codigo, nome, preco_base, produto_id')
      .eq('catalogo_id', catalogo.id)
      .eq('empresa_id', Number(empresaId))

    // Also get product GTINs for matching
    const produtoIds = (existingItems || []).map(i => i.produto_id).filter(Boolean)
    const gtinMap = new Map<string, number>() // gtin → catalogo_item_id
    if (produtoIds.length > 0) {
      const { data: produtos } = await supabase
        .from('produtos')
        .select('id, gtin')
        .in('id', produtoIds)
        .eq('empresa_id', Number(empresaId))
      for (const p of produtos || []) {
        if (p.gtin) {
          const itemMatch = (existingItems || []).find(i => i.produto_id === p.id)
          if (itemMatch) gtinMap.set(p.gtin, itemMatch.id)
        }
      }
    }

    // Build code map
    const codigoMap = new Map<string, number>() // codigo → catalogo_item_id
    for (const item of existingItems || []) {
      if (item.codigo) codigoMap.set(item.codigo, item.id)
    }

    // Classify each row
    const novos: typeof validos = []
    const atualizados: Array<typeof validos[0] & { catalogo_item_id: number }> = []

    for (const row of validos) {
      let matchId: number | null = null

      // Match by codigo_fornecedor first
      if (row.codigo_fornecedor && codigoMap.has(row.codigo_fornecedor)) {
        matchId = codigoMap.get(row.codigo_fornecedor)!
      }
      // Then by EAN
      if (!matchId && row.ean && gtinMap.has(row.ean)) {
        matchId = gtinMap.get(row.ean)!
      }

      if (matchId) {
        atualizados.push({ ...row, catalogo_item_id: matchId })
      } else {
        novos.push(row)
      }
    }

    // PREVIEW mode - just return classification
    if (mode === 'preview') {
      return NextResponse.json({
        success: true,
        preview: true,
        resumo: {
          total: validos.length,
          novos: novos.length,
          atualizados: atualizados.length,
          erros: erros.length,
        },
        novos: novos.map(r => ({ linha: r.linha, codigo: r.codigo_fornecedor, ean: r.ean, nome: r.nome, preco: r.preco })),
        atualizados: atualizados.map(r => ({ linha: r.linha, codigo: r.codigo_fornecedor, ean: r.ean, nome: r.nome, preco: r.preco })),
        erros,
      })
    }

    // CONFIRM mode - execute insert/update
    // Resolve produto_id for new items by GTIN
    const allGtins = novos.filter(r => r.ean).map(r => r.ean!)
    const produtoByGtin = new Map<string, number>()
    if (allGtins.length > 0) {
      const { data: prods } = await supabase
        .from('produtos')
        .select('id, gtin')
        .in('gtin', allGtins)
        .eq('empresa_id', Number(empresaId))
      for (const p of prods || []) {
        if (p.gtin) produtoByGtin.set(p.gtin, p.id)
      }
    }

    // Insert new items
    let insertedCount = 0
    if (novos.length > 0) {
      const toInsert = novos.map(row => ({
        catalogo_id: catalogo.id,
        empresa_id: Number(empresaId),
        produto_id: row.ean ? produtoByGtin.get(row.ean) || null : null,
        codigo: row.codigo_fornecedor || null,
        ean: row.ean || null,
        nome: row.nome!,
        marca: row.marca || null,
        unidade: row.unidade || 'UN',
        tipo_embalagem: row.tipo_embalagem || null,
        itens_por_caixa: row.itens_por_caixa ?? 1,
        preco_base: row.preco ?? 0,
        imagem_url: row.imagem_url || null,
        ativo: true,
      }))

      const { error: insertError } = await supabase
        .from('catalogo_itens')
        .insert(toInsert)

      if (insertError) {
        console.error('Erro ao inserir itens:', insertError)
        return NextResponse.json({ error: 'Erro ao inserir novos produtos' }, { status: 500 })
      }
      insertedCount = toInsert.length
    }

    // Update existing items
    let updatedCount = 0
    for (const row of atualizados) {
      const updateData: Record<string, unknown> = {
        preco_base: row.preco ?? 0,
      }
      if (row.nome) updateData.nome = row.nome
      if (row.marca) updateData.marca = row.marca
      if (row.unidade) updateData.unidade = row.unidade
      if (row.tipo_embalagem) updateData.tipo_embalagem = row.tipo_embalagem
      if (row.itens_por_caixa !== null) updateData.itens_por_caixa = row.itens_por_caixa
      if (row.imagem_url) updateData.imagem_url = row.imagem_url
      if (row.ean) updateData.ean = row.ean

      await supabase
        .from('catalogo_itens')
        .update(updateData)
        .eq('id', row.catalogo_item_id)

      updatedCount++
    }

    return NextResponse.json({
      success: true,
      preview: false,
      resumo: {
        total: validos.length,
        novos: insertedCount,
        atualizados: updatedCount,
        erros: erros.length,
      },
    })
  } catch (error) {
    console.error('Erro na importacao:', error)
    return NextResponse.json({ error: 'Erro interno na importacao' }, { status: 500 })
  }
}
