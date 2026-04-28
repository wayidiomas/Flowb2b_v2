import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { parseImportFile } from '@/lib/catalogo-import'
import { notificarLojistas, type MudancaCatalogo } from '@/lib/catalogo-notificacoes'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const mode = formData.get('mode') as string

    if (!file) return NextResponse.json({ error: 'Arquivo obrigatorio' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = user.cnpj.replace(/\D/g, '')

    // Garante que o fornecedor esta vinculado a pelo menos 1 lojista
    const { count: vinculosCount } = await supabase
      .from('fornecedores')
      .select('id', { count: 'exact', head: true })
      .eq('cnpj', cnpjLimpo)

    if (!vinculosCount || vinculosCount === 0) {
      return NextResponse.json(
        { error: 'Fornecedor nao esta vinculado a nenhum lojista. Aguarde o vinculo antes de importar produtos.' },
        { status: 403 }
      )
    }

    // Catalogo eh unico por CNPJ
    const { data: catalogo } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (!catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado. Crie o catalogo primeiro.' }, { status: 404 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { validos, erros } = parseImportFile(buffer, file.name)

    if (validos.length === 0 && erros.length === 0) {
      return NextResponse.json({ error: 'Planilha vazia ou formato invalido' }, { status: 400 })
    }

    // Match contra itens existentes: catalogo_itens eh GERAL (1 linha por produto,
    // empresa_id null). Match por codigo (codigo_fornecedor) ou ean.
    // PostgREST capa em 1000 linhas por padrao -> paginar com .range() ate trazer tudo.
    type ExistingRow = { id: number; codigo: string | null; ean: string | null; preco_base: number | null }
    const existingItems: ExistingRow[] = []
    const PAGE = 1000
    for (let from = 0; ; from += PAGE) {
      const { data: chunk, error: chunkErr } = await supabase
        .from('catalogo_itens')
        .select('id, codigo, ean, preco_base')
        .eq('catalogo_id', catalogo.id)
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1)
      if (chunkErr) {
        console.error('Erro ao ler catalogo_itens:', chunkErr)
        return NextResponse.json({ error: 'Erro ao ler catalogo existente' }, { status: 500 })
      }
      if (!chunk || chunk.length === 0) break
      existingItems.push(...chunk)
      if (chunk.length < PAGE) break
    }

    type ExistingInfo = { id: number; preco_base: number | null }
    const codigoMap = new Map<string, ExistingInfo>()
    const eanMap = new Map<string, ExistingInfo>()
    for (const item of existingItems) {
      const info = { id: item.id, preco_base: item.preco_base }
      if (item.codigo) codigoMap.set(item.codigo, info)
      if (item.ean) eanMap.set(item.ean, info)
    }

    // Classifica: novo vs atualizado
    const novos: typeof validos = []
    const atualizados: Array<typeof validos[0] & { catalogo_item_id: number; preco_antigo: number | null }> = []

    for (const row of validos) {
      let match: ExistingInfo | null = null
      if (row.codigo_fornecedor && codigoMap.has(row.codigo_fornecedor)) {
        match = codigoMap.get(row.codigo_fornecedor)!
      }
      if (!match && row.ean && eanMap.has(row.ean)) {
        match = eanMap.get(row.ean)!
      }

      if (match) {
        atualizados.push({ ...row, catalogo_item_id: match.id, preco_antigo: match.preco_base })
      } else {
        novos.push(row)
      }
    }

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

    // CONFIRM: insert/update no catalogo geral (sem empresa_id)
    let insertedCount = 0
    let updatedCount = 0

    if (novos.length > 0) {
      const toInsert = novos.map(row => ({
        catalogo_id: catalogo.id,
        empresa_id: null,
        produto_id: null,
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

      const { error: insertError } = await supabase.from('catalogo_itens').insert(toInsert)
      if (insertError) {
        console.error('Erro ao inserir itens:', insertError)
        return NextResponse.json({ error: 'Erro ao inserir novos produtos' }, { status: 500 })
      }
      insertedCount = toInsert.length
    }

    for (const row of atualizados) {
      const updateData: Record<string, unknown> = { preco_base: row.preco ?? 0 }
      if (row.nome) updateData.nome = row.nome
      if (row.marca) updateData.marca = row.marca
      if (row.unidade) updateData.unidade = row.unidade
      if (row.tipo_embalagem) updateData.tipo_embalagem = row.tipo_embalagem
      if (row.itens_por_caixa !== null) updateData.itens_por_caixa = row.itens_por_caixa
      if (row.imagem_url) updateData.imagem_url = row.imagem_url
      if (row.ean) updateData.ean = row.ean

      await supabase.from('catalogo_itens').update(updateData).eq('id', row.catalogo_item_id)
      updatedCount++
    }

    // Notificar lojistas vinculados (nao bloqueante)
    try {
      const novosEans = novos.filter(r => r.ean).map(r => r.ean!)
      const novosCodigos = novos.filter(r => r.codigo_fornecedor).map(r => r.codigo_fornecedor!)
      const novosItemIdMap = new Map<string, number>()
      if (novosEans.length > 0 || novosCodigos.length > 0) {
        let q = supabase
          .from('catalogo_itens')
          .select('id, ean, codigo')
          .eq('catalogo_id', catalogo.id)
        if (novosEans.length > 0 && novosCodigos.length > 0) {
          q = q.or(`ean.in.(${novosEans.join(',')}),codigo.in.(${novosCodigos.join(',')})`)
        } else if (novosEans.length > 0) {
          q = q.in('ean', novosEans)
        } else {
          q = q.in('codigo', novosCodigos)
        }
        const { data: rows } = await q
        for (const r of rows || []) {
          if (r.ean) novosItemIdMap.set(`ean:${r.ean}`, r.id)
          if (r.codigo) novosItemIdMap.set(`codigo:${r.codigo}`, r.id)
        }
      }

      const mudancas: MudancaCatalogo[] = []
      for (const novo of novos) {
        const idNovo = (novo.ean && novosItemIdMap.get(`ean:${novo.ean}`))
          || (novo.codigo_fornecedor && novosItemIdMap.get(`codigo:${novo.codigo_fornecedor}`))
          || null
        mudancas.push({
          tipo: 'novo',
          catalogo_item_id: idNovo,
          dados_antigos: null,
          dados_novos: { nome: novo.nome, ean: novo.ean, codigo: novo.codigo_fornecedor, preco_base: novo.preco }
        })
      }
      for (const upd of atualizados) {
        const precoNovo = upd.preco ?? 0
        const precoAntigo = upd.preco_antigo ?? 0
        const precoMudou = upd.preco_antigo != null && Math.abs(precoAntigo - precoNovo) > 0.001
        mudancas.push({
          tipo: precoMudou ? 'preco' : 'dados',
          catalogo_item_id: upd.catalogo_item_id,
          dados_antigos: { preco_base: upd.preco_antigo },
          dados_novos: { nome: upd.nome, ean: upd.ean, preco_base: upd.preco }
        })
      }

      if (mudancas.length > 0) {
        const r = await notificarLojistas(supabase, catalogo.id, cnpjLimpo, mudancas)
        if (r.erros.length > 0) {
          console.warn('Erros ao notificar lojistas:', r.erros)
        }
      }
    } catch (notifyErr) {
      console.error('Erro ao notificar lojistas (nao bloqueante):', notifyErr)
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
