import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'

// Limite de seguranca do universo de busca por fornecedor.
// O Supabase tem cap default de 1000 rows; usamos paginacao interna em batches
// ate este teto. Acima disso o catalogo deve ser refinado por search server-side
// (refatorar para RPC dedicada se for o caso).
const MAX_UNIVERSE = 5000
const BATCH = 1000

// GET - Buscar catalogo de produtos de um fornecedor por fornecedor_id (direto, sem pedido)
//
// Estrategia:
//  1. Carrega TODO o universo de fornecedores_produtos (com join produtos) do par
//     fornecedor_id + empresa_id em batches de 1000, ate MAX_UNIVERSE.
//  2. Aplica o filtro de search EM MEMORIA (nome, gtin, codigo, codigo_fornecedor).
//  3. Pagina em memoria e devolve `total` como o tamanho do conjunto FILTRADO.
//
// Motivo: o `.or()` do PostgREST em coluna de tabela de join (`produtos.nome.ilike...`)
// retorna count incorreto e o fallback anterior estava devolvendo `total = pagina filtrada`,
// fazendo o modal achar que so havia 1 pagina (bug observado pela cliente).
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.empresaId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const permCheck = await requirePermission(user, 'pedidos')
    if (!permCheck.allowed) return permCheck.response

    const supabase = createServerSupabaseClient()
    const empresaId = user.empresaId

    // 1. Params (fornecedor_id obrigatorio)
    const { searchParams } = new URL(request.url)
    const fornecedorIdRaw = searchParams.get('fornecedor_id')
    const fornecedorId = fornecedorIdRaw ? parseInt(fornecedorIdRaw) : NaN
    if (!fornecedorIdRaw || Number.isNaN(fornecedorId)) {
      return NextResponse.json({ error: 'fornecedor_id e obrigatorio' }, { status: 400 })
    }

    const search = (searchParams.get('search') || '').trim()
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '30')))

    // Helper para mapear o contrato de retorno (FIXO)
    const mapProduto = (fp: Record<string, unknown>) => {
      const prod = (fp.produtos as Record<string, unknown>) || {}
      return {
        produto_id: fp.produto_id,
        id_produto_bling: prod.id_produto_bling ?? null,
        nome: (prod.nome as string) || '',
        gtin: (prod.gtin as string) ?? null,
        codigo_fornecedor: (fp.codigo_fornecedor as string) ?? null,
        unidade: (prod.unidade as string) || 'UN',
        preco: fp.valor_de_compra ?? prod.preco ?? null,
        itens_por_caixa: prod.itens_por_caixa ?? 1,
      }
    }

    // 2. Carregar o universo em batches (cobre o limite default do Supabase de 1000 rows)
    type FornProd = Record<string, unknown>
    const universo: FornProd[] = []
    let offsetUni = 0
    while (offsetUni < MAX_UNIVERSE) {
      const end = Math.min(offsetUni + BATCH, MAX_UNIVERSE) - 1
      const { data: batch, error } = await supabase
        .from('fornecedores_produtos')
        .select(`
          produto_id,
          valor_de_compra,
          codigo_fornecedor,
          produtos!inner (
            id,
            id_produto_bling,
            nome,
            gtin,
            codigo,
            unidade,
            preco,
            itens_por_caixa
          )
        `)
        .eq('fornecedor_id', fornecedorId)
        .eq('empresa_id', empresaId)
        .range(offsetUni, end)

      if (error) {
        console.error('Erro ao buscar catalogo por fornecedor:', error)
        return NextResponse.json({ error: 'Erro ao buscar catalogo' }, { status: 500 })
      }
      if (!batch || batch.length === 0) break
      universo.push(...(batch as FornProd[]))
      if (batch.length < BATCH) break
      offsetUni += BATCH
    }

    // 3. Filtrar em memoria (case-insensitive em nome/gtin/codigo/codigo_fornecedor)
    let filtrados: FornProd[] = universo
    if (search) {
      const s = search.toLowerCase()
      filtrados = universo.filter(fp => {
        const prod = (fp.produtos as Record<string, unknown>) || {}
        const nome = ((prod.nome as string) || '').toLowerCase()
        const gtin = ((prod.gtin as string) || '').toLowerCase()
        const codLoja = ((prod.codigo as string) || '').toLowerCase()
        const codForn = ((fp.codigo_fornecedor as string) || '').toLowerCase()
        return nome.includes(s) || gtin.includes(s) || codLoja.includes(s) || codForn.includes(s)
      })
    }

    // 4. Paginar em memoria
    const total = filtrados.length
    const start = (page - 1) * limit
    const paginados = filtrados.slice(start, start + limit)

    // 5. Resposta (contrato FIXO, identico ao anterior)
    return NextResponse.json({
      produtos: paginados.map(mapProduto),
      total,
      page,
      limit,
    })
  } catch (error) {
    console.error('Erro no catalogo-fornecedor (by fornecedor_id):', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar catalogo' },
      { status: 500 }
    )
  }
}
