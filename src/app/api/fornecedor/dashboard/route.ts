import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    // Buscar fornecedores vinculados ao CNPJ
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, empresa_id, nome, nome_fantasia')
      .eq('cnpj', user.cnpj)

    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({
        pedidosPendentes: 0,
        totalEmAberto: 0,
        sugestoesEnviadas: 0,
        pedidosRecentes: [],
        empresasVinculadas: [],
      })
    }

    const fornecedorIds = fornecedores.map(f => f.id)
    const empresaIds = fornecedores.map(f => f.empresa_id)

    // Pedidos de compra destinados a este fornecedor
    const { data: pedidos } = await supabase
      .from('pedidos_compra')
      .select('id, numero, data, total, status_interno, empresa_id, fornecedor_id')
      .in('fornecedor_id', fornecedorIds)
      .in('status_interno', ['enviado_fornecedor', 'sugestao_pendente', 'aceito'])
      .order('data', { ascending: false })

    const pedidosPendentes = (pedidos || []).filter(
      p => p.status_interno === 'enviado_fornecedor'
    ).length

    const totalEmAberto = (pedidos || [])
      .filter(p => ['enviado_fornecedor', 'sugestao_pendente'].includes(p.status_interno))
      .reduce((sum, p) => sum + (p.total || 0), 0)

    // Sugestoes enviadas
    const { count: sugestoesEnviadas } = await supabase
      .from('sugestoes_fornecedor')
      .select('id', { count: 'exact', head: true })
      .eq('fornecedor_user_id', user.fornecedorUserId)

    // Buscar nomes das empresas
    const { data: empresas } = await supabase
      .from('empresas')
      .select('id, razao_social, nome_fantasia')
      .in('id', empresaIds)

    const empresaMap = new Map((empresas || []).map(e => [e.id, e]))

    // Pedidos recentes (com nome da empresa)
    const { data: pedidosRecentes } = await supabase
      .from('pedidos_compra')
      .select('id, numero, data, total, status_interno, empresa_id')
      .in('fornecedor_id', fornecedorIds)
      .neq('status_interno', 'rascunho')
      .order('data', { ascending: false })
      .limit(10)

    const pedidosComEmpresa = (pedidosRecentes || []).map(p => ({
      ...p,
      empresa_nome: empresaMap.get(p.empresa_id)?.nome_fantasia || empresaMap.get(p.empresa_id)?.razao_social || 'Empresa',
    }))

    // Empresas vinculadas com total de pedidos
    const empresasVinculadas = fornecedores.map(f => {
      const emp = empresaMap.get(f.empresa_id)
      const totalPedidos = (pedidos || []).filter(p => p.fornecedor_id === f.id).length
      return {
        empresaId: f.empresa_id,
        razaoSocial: emp?.razao_social || '',
        nomeFantasia: emp?.nome_fantasia || '',
        totalPedidos,
      }
    })

    return NextResponse.json({
      pedidosPendentes,
      totalEmAberto,
      sugestoesEnviadas: sugestoesEnviadas || 0,
      pedidosRecentes: pedidosComEmpresa,
      empresasVinculadas,
    })
  } catch (error) {
    console.error('Erro dashboard fornecedor:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
