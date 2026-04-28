import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { parseImportFile, type ImportRow } from '@/lib/catalogo-import'
import { notificarLojistas, type MudancaCatalogo } from '@/lib/catalogo-notificacoes'

type SupabaseClient = ReturnType<typeof createServerSupabaseClient>
type ExistingRow = { id: number; codigo: string | null; ean: string | null; preco_base: number | null }
type ExistingInfo = { id: number; preco_base: number | null }
type AtualizadoRow = ImportRow & { catalogo_item_id: number; preco_antigo: number | null }

async function lerCatalogoItensPaginado(supabase: SupabaseClient, catalogoId: number): Promise<ExistingRow[]> {
  const out: ExistingRow[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data: chunk, error } = await supabase
      .from('catalogo_itens')
      .select('id, codigo, ean, preco_base')
      .eq('catalogo_id', catalogoId)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!chunk || chunk.length === 0) break
    out.push(...chunk)
    if (chunk.length < PAGE) break
  }
  return out
}

function classificar(validos: ImportRow[], existing: ExistingRow[]) {
  const codigoMap = new Map<string, ExistingInfo>()
  const eanMap = new Map<string, ExistingInfo>()
  for (const item of existing) {
    const info = { id: item.id, preco_base: item.preco_base }
    if (item.codigo) codigoMap.set(item.codigo, info)
    if (item.ean) eanMap.set(item.ean, info)
  }

  const novos: ImportRow[] = []
  const atualizados: AtualizadoRow[] = []
  for (const row of validos) {
    let match: ExistingInfo | null = null
    if (row.codigo_fornecedor && codigoMap.has(row.codigo_fornecedor)) match = codigoMap.get(row.codigo_fornecedor)!
    if (!match && row.ean && eanMap.has(row.ean)) match = eanMap.get(row.ean)!
    if (match) atualizados.push({ ...row, catalogo_item_id: match.id, preco_antigo: match.preco_base })
    else novos.push(row)
  }
  return { novos, atualizados }
}

// Processamento em background — atualiza catalogo_import_xlsx_jobs conforme avanca.
async function processarImportEmBackground(
  supabase: SupabaseClient,
  jobId: number,
  catalogoId: number,
  cnpjLimpo: string,
  novos: ImportRow[],
  atualizados: AtualizadoRow[]
) {
  const totalLinhas = novos.length + atualizados.length
  let processados = 0
  let insertedCount = 0
  let updatedCount = 0
  const errosList: Array<{ contexto: string; detalhe: string }> = []

  await supabase
    .from('catalogo_import_xlsx_jobs')
    .update({ status: 'processing', total_linhas: totalLinhas, updated_at: new Date().toISOString() })
    .eq('id', jobId)

  try {
    // 1) Inserir novos em chunks (batch insert)
    const INSERT_CHUNK = 500
    for (let i = 0; i < novos.length; i += INSERT_CHUNK) {
      const slice = novos.slice(i, i + INSERT_CHUNK)
      const toInsert = slice.map(row => ({
        catalogo_id: catalogoId,
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
        errosList.push({ contexto: `insert chunk ${i}-${i + slice.length}`, detalhe: insertError.message })
      } else {
        insertedCount += slice.length
      }
      processados += slice.length

      await supabase
        .from('catalogo_import_xlsx_jobs')
        .update({
          processados,
          novos: insertedCount,
          erros: errosList.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
    }

    // 2) Atualizar existentes — checkpoint a cada N
    const UPDATE_CHECKPOINT = 100
    for (let i = 0; i < atualizados.length; i++) {
      const row = atualizados[i]
      const updateData: Record<string, unknown> = { preco_base: row.preco ?? 0 }
      if (row.nome) updateData.nome = row.nome
      if (row.marca) updateData.marca = row.marca
      if (row.unidade) updateData.unidade = row.unidade
      if (row.tipo_embalagem) updateData.tipo_embalagem = row.tipo_embalagem
      if (row.itens_por_caixa !== null) updateData.itens_por_caixa = row.itens_por_caixa
      if (row.imagem_url) updateData.imagem_url = row.imagem_url
      if (row.ean) updateData.ean = row.ean

      const { error: updError } = await supabase
        .from('catalogo_itens')
        .update(updateData)
        .eq('id', row.catalogo_item_id)
      if (updError) {
        errosList.push({ contexto: `update id=${row.catalogo_item_id}`, detalhe: updError.message })
      } else {
        updatedCount++
      }
      processados++

      if ((i + 1) % UPDATE_CHECKPOINT === 0 || i === atualizados.length - 1) {
        await supabase
          .from('catalogo_import_xlsx_jobs')
          .update({
            processados,
            atualizados: updatedCount,
            erros: errosList.length,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
      }
    }

    // 3) Notificar lojistas (nao bloqueante)
    try {
      const novosEans = novos.filter(r => r.ean).map(r => r.ean!)
      const novosCodigos = novos.filter(r => r.codigo_fornecedor).map(r => r.codigo_fornecedor!)
      const novosItemIdMap = new Map<string, number>()
      if (novosEans.length > 0 || novosCodigos.length > 0) {
        let q = supabase
          .from('catalogo_itens')
          .select('id, ean, codigo')
          .eq('catalogo_id', catalogoId)
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
        const r = await notificarLojistas(supabase, catalogoId, cnpjLimpo, mudancas)
        if (r.erros.length > 0) console.warn('Erros ao notificar lojistas:', r.erros)
      }
    } catch (notifyErr) {
      console.error('Erro ao notificar lojistas (nao bloqueante):', notifyErr)
    }

    await supabase
      .from('catalogo_import_xlsx_jobs')
      .update({
        status: 'completed',
        processados,
        novos: insertedCount,
        atualizados: updatedCount,
        erros: errosList.length,
        resumo: { total: totalLinhas, novos: insertedCount, atualizados: updatedCount, erros: errosList },
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  } catch (err) {
    console.error('Erro fatal no processamento do import job', jobId, err)
    await supabase
      .from('catalogo_import_xlsx_jobs')
      .update({
        status: 'error',
        error_message: err instanceof Error ? err.message : String(err),
        novos: insertedCount,
        atualizados: updatedCount,
        erros: errosList.length,
        resumo: { total: totalLinhas, novos: insertedCount, atualizados: updatedCount, erros: errosList },
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  }
}

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

    let existing: ExistingRow[]
    try {
      existing = await lerCatalogoItensPaginado(supabase, catalogo.id)
    } catch (err) {
      console.error('Erro ao ler catalogo_itens:', err)
      return NextResponse.json({ error: 'Erro ao ler catalogo existente' }, { status: 500 })
    }

    const { novos, atualizados } = classificar(validos, existing)

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

    // CONFIRM: cria job e dispara processamento em background
    const { data: job, error: jobErr } = await supabase
      .from('catalogo_import_xlsx_jobs')
      .insert({
        catalogo_id: catalogo.id,
        fornecedor_user_id: Number(user.userId),
        cnpj: cnpjLimpo,
        status: 'pending',
        total_linhas: novos.length + atualizados.length,
      })
      .select('id')
      .single()

    if (jobErr || !job) {
      console.error('Erro ao criar job de import:', jobErr)
      return NextResponse.json({ error: 'Erro ao iniciar importacao' }, { status: 500 })
    }

    // Fire-and-forget: continua rodando depois da response (Node.js standard runtime)
    void processarImportEmBackground(supabase, job.id, catalogo.id, cnpjLimpo, novos, atualizados)

    return NextResponse.json({
      success: true,
      jobId: job.id,
      total: novos.length + atualizados.length,
      novos: novos.length,
      atualizados: atualizados.length,
    }, { status: 202 })
  } catch (error) {
    console.error('Erro na importacao:', error)
    return NextResponse.json({ error: 'Erro interno na importacao' }, { status: 500 })
  }
}
