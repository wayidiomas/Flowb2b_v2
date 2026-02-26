'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { TableSkeleton } from '@/components/ui'
import { SidebarAcoes } from '@/components/pedido-compra/SidebarAcoes'
import { FornecedorSelectModal } from '@/components/pedido-compra/FornecedorSelectModal'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { PedidoCompraListItem, FornecedorOption, SITUACAO_LABELS, SITUACAO_COLORS, StatusInterno } from '@/types/pedido-compra'
import { STATUS_INTERNO_CONFIG } from '@/types/pedido-compra'

// Tipo para representante vinculado ao fornecedor
interface RepresentanteFornecedor {
  id: number
  nome: string
  telefone: string | null
  codigo_acesso: string
  cadastrado: boolean // se ja tem user_representante_id
}

// Status config
const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  'Emitida': { bg: 'bg-green-100', text: 'text-green-700', label: 'Emitida' },
  'Cancelada': { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelada' },
  'Registrada': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Registrada' },
  'Aguardando Entrega': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Aguardando Entrega' },
  'Rascunho': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Rascunho' },
}

// Mapeamento situacao (numero DB) -> label (replica o CASE da view_pedidos_compra_detalhados)
const situacaoToLabel = (situacao: number | null | undefined): string => {
  switch (situacao) {
    case 1: return 'Emitida'
    case 2: return 'Cancelada'
    case 3: return 'Registrada'
    case 4: return 'Aguardando Entrega'
    case 5: return 'Rascunho'
    default: return 'Rascunho' // situacao=0, null → mesmo fallback do frontend atual
  }
}

// Workflow status filter tabs
const WORKFLOW_TABS = [
  { key: 'todos', label: 'Todos', color: 'gray' },
  { key: 'rascunho', label: 'Rascunhos', color: 'gray' },
  { key: 'enviado_fornecedor', label: 'Aguardando', color: 'blue' },
  { key: 'sugestao_pendente', label: 'Sugestao', color: 'amber' },
  { key: 'contra_proposta_pendente', label: 'Contra-prop', color: 'orange' },
  { key: 'aceito', label: 'Aceitos', color: 'green' },
  { key: 'finalizado', label: 'Finalizados', color: 'purple' },
  { key: 'cancelado', label: 'Cancelados', color: 'red' },
] as const

// Icons
function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  )
}

function PrintIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function SidebarToggleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  )
}

export default function PedidoCompraPage() {
  const { user, empresa } = useAuth()
  const router = useRouter()
  const [pedidos, setPedidos] = useState<PedidoCompraListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedPedidos, setSelectedPedidos] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showFornecedorModal, setShowFornecedorModal] = useState(false)
  const [modalAction, setModalAction] = useState<'novo' | 'gerar-auto'>('novo')

  // Filtros
  const [fornecedorFilter, setFornecedorFilter] = useState('')
  const [dataInicioFilter, setDataInicioFilter] = useState('')
  const [dataFimFilter, setDataFimFilter] = useState('')
  const [situacaoFilter, setSituacaoFilter] = useState('')

  // Fornecedores para modal e filtro
  const [fornecedores, setFornecedores] = useState<FornecedorOption[]>([])
  const [loadingFornecedores, setLoadingFornecedores] = useState(false)

  // Resumo
  const [resumo, setResumo] = useState({ qtd: 0, valorTotal: 0 })

  // Status interno dos pedidos (mapa pedido_id -> status_interno)
  const [statusInternoMap, setStatusInternoMap] = useState<Record<number, StatusInterno>>({})

  // Workflow filter tab
  const [workflowFilter, setWorkflowFilter] = useState<string>('todos')

  // Mapa de fornecedor_id -> representante (para WhatsApp inteligente)
  const [representantesPorFornecedor, setRepresentantesPorFornecedor] = useState<Record<number, RepresentanteFornecedor>>({})

  // Workflow counts for tabs
  const [workflowCounts, setWorkflowCounts] = useState<Record<string, number>>({
    todos: 0,
    rascunho: 0,
    enviado_fornecedor: 0,
    sugestao_pendente: 0,
    contra_proposta_pendente: 0,
    aceito: 0,
    rejeitado: 0,
    finalizado: 0,
    cancelado: 0,
  })

  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const itemsPerPage = 10

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false)
      }
    }

    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilterDropdown])

  // Buscar fornecedores com metricas
  const fetchFornecedores = async () => {
    if (!user?.id) return
    setLoadingFornecedores(true)
    try {
      const empresaId = empresa?.id || user?.empresa_id
      if (!empresaId) return

      // Buscar fornecedores (sem limite para garantir que todos apareçam)
      const { data: fornecedoresData, error: fornecedoresError } = await supabase
        .from('fornecedores')
        .select('id, nome, cnpj')
        .eq('empresa_id', empresaId)
        .order('nome', { ascending: true })

      if (fornecedoresError) throw fornecedoresError

      // Buscar metricas de pedidos por fornecedor
      const { data: pedidosData, error: pedidosError } = await supabase
        .from('pedidos_compra')
        .select('fornecedor_id, total')
        .eq('empresa_id', empresaId)

      if (pedidosError) throw pedidosError

      // Calcular metricas por fornecedor
      const metricas: Record<number, { total_pedidos: number; valor_total_comprado: number }> = {}
      pedidosData?.forEach(pedido => {
        if (!pedido.fornecedor_id) return
        if (!metricas[pedido.fornecedor_id]) {
          metricas[pedido.fornecedor_id] = { total_pedidos: 0, valor_total_comprado: 0 }
        }
        metricas[pedido.fornecedor_id].total_pedidos++
        metricas[pedido.fornecedor_id].valor_total_comprado += pedido.total || 0
      })

      // Combinar fornecedores com metricas
      const fornecedoresComMetricas = fornecedoresData?.map(f => ({
        ...f,
        total_pedidos: metricas[f.id]?.total_pedidos || 0,
        valor_total_comprado: metricas[f.id]?.valor_total_comprado || 0,
      })) || []

      setFornecedores(fornecedoresComMetricas)
    } catch (err) {
      console.error('Erro ao buscar fornecedores:', err)
    } finally {
      setLoadingFornecedores(false)
    }
  }

  // Buscar representantes vinculados aos fornecedores
  const fetchRepresentantesPorFornecedor = async () => {
    if (!user?.id) return
    try {
      const empresaId = empresa?.id || user?.empresa_id
      if (!empresaId) return

      // Buscar vinculos representante-fornecedor com dados do representante
      const { data: vinculos, error } = await supabase
        .from('representante_fornecedores')
        .select(`
          fornecedor_id,
          representantes (
            id,
            nome,
            telefone,
            codigo_acesso,
            user_representante_id,
            ativo
          )
        `)
        .eq('representantes.empresa_id', empresaId)
        .eq('representantes.ativo', true)

      if (error) {
        console.error('Erro ao buscar representantes por fornecedor:', error)
        return
      }

      // Montar mapa de fornecedor_id -> representante
      const mapa: Record<number, RepresentanteFornecedor> = {}

      // Tipo para relação retornada pelo Supabase
      type RepRelation = {
        id: number
        nome: string
        telefone: string | null
        codigo_acesso: string
        user_representante_id: number | null
        ativo: boolean
      } | null

      vinculos?.forEach(v => {
        const rep = v.representantes as unknown as RepRelation
        if (rep && v.fornecedor_id) {
          // Se ja existe um representante para este fornecedor, manter o primeiro (ou pode-se escolher outro criterio)
          if (!mapa[v.fornecedor_id]) {
            mapa[v.fornecedor_id] = {
              id: rep.id,
              nome: rep.nome,
              telefone: rep.telefone,
              codigo_acesso: rep.codigo_acesso,
              cadastrado: !!rep.user_representante_id,
            }
          }
        }
      })

      setRepresentantesPorFornecedor(mapa)
    } catch (err) {
      console.error('Erro ao buscar representantes:', err)
    }
  }

  useEffect(() => {
    fetchFornecedores()
    fetchRepresentantesPorFornecedor()
  }, [user?.id, user?.empresa_id, empresa?.id])

  // Buscar pedidos - query direta com TODOS os filtros server-side
  const fetchPedidos = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const empresaId = empresa?.id || user?.empresa_id

      if (!empresaId) {
        setLoading(false)
        return
      }

      const rangeStart = (currentPage - 1) * itemsPerPage

      // 1. Buscar contagens por workflow status (sem filtro de workflow, para popular todos os tabs)
      const { data: workflowData } = await supabase
        .from('pedidos_compra')
        .select('status_interno, situacao')
        .eq('empresa_id', empresaId)

      if (workflowData) {
        const counts: Record<string, number> = {
          todos: workflowData.length,
          rascunho: 0,
          enviado_fornecedor: 0,
          sugestao_pendente: 0,
          contra_proposta_pendente: 0,
          aceito: 0,
          rejeitado: 0,
          finalizado: 0,
          cancelado: 0,
        }
        workflowData.forEach(p => {
          const sit = p.situacao as number | null
          const isRascunhoBling = sit === null || sit === 0 || sit === 5
          if (p.status_interno === 'rascunho' || !p.status_interno) {
            // So conta como rascunho se situacao do Bling tambem indica rascunho
            if (isRascunhoBling) {
              counts.rascunho++
            }
            // Pedidos com situacao 1,2,3,4 (Emitida/Cancelada/Registrada/Aguardando) so aparecem em "Todos"
          } else if (counts[p.status_interno] !== undefined) {
            counts[p.status_interno]++
          }
        })
        setWorkflowCounts(counts)
      }

      // 2. Query principal com TODOS os filtros aplicados server-side
      let query = supabase
        .from('pedidos_compra')
        .select(`
          id,
          numero,
          data,
          observacoes_internas,
          total,
          situacao,
          status_interno,
          empresa_id,
          fornecedor_id,
          fornecedores(nome, celular, telefone),
          itens_pedido_compra(id, descricao, quantidade, valor)
        `, { count: 'exact' })
        .eq('empresa_id', empresaId)
        .order('data', { ascending: false })
        .order('id', { ascending: false })

      // Filtro por fornecedor
      if (fornecedorFilter) {
        query = query.eq('fornecedor_id', parseInt(fornecedorFilter))
      }

      // Filtro por data
      if (dataInicioFilter) {
        query = query.gte('data', dataInicioFilter)
      }
      if (dataFimFilter) {
        query = query.lte('data', dataFimFilter)
      }

      // Filtro por situacao (status Bling) - mapeia label do dropdown para valores reais no DB
      if (situacaoFilter) {
        if (situacaoFilter === 'Rascunho') {
          // situacao=0 (Bling 'Em aberto' → VIEW 'Desconhecido' → fallback 'Rascunho'),
          // situacao=5 (VIEW 'Rascunho' explícito), ou null
          query = query.or('situacao.eq.0,situacao.eq.5,situacao.is.null')
        } else {
          const situacaoMap: Record<string, number> = {
            'Emitida': 1,
            'Cancelada': 2,
            'Registrada': 3,
            'Aguardando Entrega': 4,
          }
          const val = situacaoMap[situacaoFilter]
          if (val !== undefined) {
            query = query.eq('situacao', val)
          }
        }
      }

      // Filtro por workflow (status_interno) - tabs do topo
      if (workflowFilter !== 'todos') {
        if (workflowFilter === 'rascunho') {
          query = query.or('status_interno.eq.rascunho,status_interno.is.null')
          // Excluir pedidos do Bling que nao sao rascunho (Emitida=1, Cancelada=2, Registrada=3, Aguardando=4)
          query = query.or('situacao.eq.0,situacao.eq.5,situacao.is.null')
        } else {
          query = query.eq('status_interno', workflowFilter)
        }
      }

      // Filtro por busca (numero é bigint, precisa de tratamento especial)
      if (debouncedSearch) {
        const searchConditions: string[] = []

        // 1. Busca por numero do pedido (bigint → match exato se for numero)
        const searchNum = parseInt(debouncedSearch.trim())
        if (!isNaN(searchNum) && String(searchNum) === debouncedSearch.trim()) {
          searchConditions.push(`numero.eq.${searchNum}`)
        }

        // 2. Busca por observacoes_internas (campo text)
        searchConditions.push(`observacoes_internas.ilike.%${debouncedSearch}%`)

        // 3. Busca por nome do fornecedor (pre-lookup nos IDs)
        const { data: matchingFornecedores } = await supabase
          .from('fornecedores')
          .select('id')
          .eq('empresa_id', empresaId)
          .ilike('nome', `%${debouncedSearch}%`)

        if (matchingFornecedores && matchingFornecedores.length > 0) {
          const ids = matchingFornecedores.map(f => f.id)
          searchConditions.push(`fornecedor_id.in.(${ids.join(',')})`)
        }

        query = query.or(searchConditions.join(','))
      }

      // Paginacao
      query = query.range(rangeStart, rangeStart + itemsPerPage - 1)

      const { data, error, count } = await query

      if (error) {
        console.error('Erro ao buscar pedidos:', error)
        setLoading(false)
        return
      }

      const totalPedidos = count || 0
      setTotalCount(totalPedidos)

      if (data && data.length > 0) {
        // Mapear para o formato PedidoCompraListItem
        const mappedPedidos: PedidoCompraListItem[] = data.map(p => {
          const fornecedor = p.fornecedores as unknown as { nome: string; celular: string | null; telefone: string | null } | null
          return {
            pedido_id: p.id,
            numero_pedido: p.numero,
            data_pedido: p.data,
            fornecedor_nome: fornecedor?.nome || '',
            fornecedor_id: p.fornecedor_id,
            fornecedor_telefone: fornecedor?.celular || fornecedor?.telefone || undefined,
            observacoes_internas: p.observacoes_internas,
            valor_total: p.total || 0,
            status: situacaoToLabel(p.situacao),
            empresa_id: p.empresa_id,
            itens_produtos: (p.itens_pedido_compra || []) as unknown as import('@/types/pedido-compra').ItemPedidoResumo[],
          }
        })

        setPedidos(mappedPedidos)

        // Construir mapa de status_interno a partir dos dados ja retornados (sem query extra)
        const map: Record<number, StatusInterno> = {}
        data.forEach(p => {
          if (p.status_interno) map[p.id] = p.status_interno as StatusInterno
        })
        setStatusInternoMap(map)
      } else {
        setPedidos([])
        setStatusInternoMap({})
      }

      // 3. Calcular resumo (valor total com os mesmos filtros, sem paginacao)
      let resumoQuery = supabase
        .from('pedidos_compra')
        .select('total')
        .eq('empresa_id', empresaId)

      if (fornecedorFilter) resumoQuery = resumoQuery.eq('fornecedor_id', parseInt(fornecedorFilter))
      if (dataInicioFilter) resumoQuery = resumoQuery.gte('data', dataInicioFilter)
      if (dataFimFilter) resumoQuery = resumoQuery.lte('data', dataFimFilter)
      if (situacaoFilter) {
        if (situacaoFilter === 'Rascunho') {
          resumoQuery = resumoQuery.or('situacao.eq.0,situacao.eq.5,situacao.is.null')
        } else {
          const situacaoMap: Record<string, number> = { 'Emitida': 1, 'Cancelada': 2, 'Registrada': 3, 'Aguardando Entrega': 4 }
          const val = situacaoMap[situacaoFilter]
          if (val !== undefined) resumoQuery = resumoQuery.eq('situacao', val)
        }
      }
      if (workflowFilter !== 'todos') {
        if (workflowFilter === 'rascunho') {
          resumoQuery = resumoQuery.or('status_interno.eq.rascunho,status_interno.is.null')
          resumoQuery = resumoQuery.or('situacao.eq.0,situacao.eq.5,situacao.is.null')
        } else {
          resumoQuery = resumoQuery.eq('status_interno', workflowFilter)
        }
      }
      if (debouncedSearch) {
        const resumoSearchConditions: string[] = []
        const sNum = parseInt(debouncedSearch.trim())
        if (!isNaN(sNum) && String(sNum) === debouncedSearch.trim()) {
          resumoSearchConditions.push(`numero.eq.${sNum}`)
        }
        resumoSearchConditions.push(`observacoes_internas.ilike.%${debouncedSearch}%`)
        // Reutilizar os IDs de fornecedores ja buscados acima (mesma execucao)
        const { data: resumoFornecedores } = await supabase
          .from('fornecedores')
          .select('id')
          .eq('empresa_id', empresaId)
          .ilike('nome', `%${debouncedSearch}%`)
        if (resumoFornecedores && resumoFornecedores.length > 0) {
          resumoSearchConditions.push(`fornecedor_id.in.(${resumoFornecedores.map(f => f.id).join(',')})`)
        }
        resumoQuery = resumoQuery.or(resumoSearchConditions.join(','))
      }

      const { data: resumoData } = await resumoQuery
      const valorTotalGeral = resumoData?.reduce((acc, p) => acc + (p.total || 0), 0) || 0
      setResumo({ qtd: totalPedidos, valorTotal: valorTotalGeral })
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  // Buscar quando mudar filtros (inclui workflowFilter agora que eh server-side)
  useEffect(() => {
    fetchPedidos()
  }, [user?.id, user?.empresa_id, empresa?.id, currentPage, debouncedSearch, fornecedorFilter, dataInicioFilter, dataFimFilter, situacaoFilter, workflowFilter])

  // Verificar se ha filtros ativos
  const hasActiveFilters = fornecedorFilter !== '' || dataInicioFilter !== '' || dataFimFilter !== '' || situacaoFilter !== ''

  // Contar filtros ativos
  const activeFiltersCount = [
    fornecedorFilter !== '',
    dataInicioFilter !== '' || dataFimFilter !== '',
    situacaoFilter !== ''
  ].filter(Boolean).length

  // Limpar filtros
  const clearFilters = () => {
    setFornecedorFilter('')
    setDataInicioFilter('')
    setDataFimFilter('')
    setSituacaoFilter('')
    setShowFilterDropdown(false)
    setCurrentPage(1)
  }

  // Paginacao
  const totalPages = Math.ceil(totalCount / itemsPerPage)

  // Selecao
  const handleSelectAll = () => {
    if (selectedPedidos.length === pedidos.length) {
      setSelectedPedidos([])
    } else {
      setSelectedPedidos(pedidos.map((p) => p.pedido_id))
    }
  }

  const handleSelectPedido = (id: number) => {
    setSelectedPedidos((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    )
  }

  // Excluir pedidos
  const handleExcluir = async () => {
    if (selectedPedidos.length === 0) return
    if (!confirm(`Deseja realmente excluir ${selectedPedidos.length} pedido(s)?`)) return

    setActionLoading(true)
    try {
      const empresaId = empresa?.id || user?.empresa_id

      const { error } = await supabase
        .from('pedidos_compra')
        .delete()
        .eq('empresa_id', empresaId)
        .in('id', selectedPedidos)

      if (error) throw error
      await fetchPedidos()
      setSelectedPedidos([])
    } catch (err) {
      console.error('Erro ao excluir pedidos:', err)
    } finally {
      setActionLoading(false)
    }
  }

  // Gerar paginas para navegacao
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }
    return pages
  }

  // Formatar valor
  const formatCurrency = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  // Formatar data
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR')
  }

  // Formatar telefone para link do WhatsApp
  const formatPhoneForWhatsApp = (phone: string | undefined | null): string | null => {
    if (!phone) return null
    // Remove tudo exceto numeros
    const cleaned = phone.replace(/\D/g, '')
    // Se nao comecar com 55, adiciona
    if (cleaned.startsWith('55')) {
      return cleaned
    }
    return '55' + cleaned
  }

  // Abrir WhatsApp com mensagem do pedido (verifica se tem representante vinculado)
  const handleWhatsApp = (pedido: PedidoCompraListItem) => {
    const baseUrl = window.location.origin
    const empresaNome = empresa?.nome_fantasia || empresa?.razao_social || 'nossa empresa'

    // Verificar se fornecedor tem representante vinculado
    const representante = pedido.fornecedor_id ? representantesPorFornecedor[pedido.fornecedor_id] : null

    if (representante && representante.telefone) {
      // Enviar para o REPRESENTANTE
      const phone = formatPhoneForWhatsApp(representante.telefone)
      if (!phone) {
        alert('Representante sem telefone valido')
        return
      }

      let message: string

      if (!representante.cadastrado) {
        // Primeiro acesso - enviar link de convite direto
        const conviteUrl = `${baseUrl}/representante/convite/${representante.codigo_acesso}`
        const linkPublico = `${baseUrl}/publico/pedido/${pedido.pedido_id}`
        message = encodeURIComponent(
          `Ola ${representante.nome}! 👋\n\n` +
          `Voce foi cadastrado como representante comercial da *${empresaNome}* na plataforma FlowB2B.\n\n` +
          `Temos um pedido de compra #${pedido.numero_pedido || pedido.pedido_id} no valor de ${formatCurrency(pedido.valor_total)} para o fornecedor ${pedido.fornecedor_nome || ''}.\n\n` +
          `🔗 Visualizar pedido:\n${linkPublico}\n\n` +
          `📋 Crie sua conta para gerenciar pedidos:\n${conviteUrl}\n\n` +
          `Qualquer duvida, estamos a disposicao!`
        )
      } else {
        // Ja cadastrado - mensagem normal com link do pedido
        const linkPublico = `${baseUrl}/publico/pedido/${pedido.pedido_id}`
        message = encodeURIComponent(
          `Ola ${representante.nome}!\n\n` +
          `Temos um pedido de compra #${pedido.numero_pedido || pedido.pedido_id} no valor de ${formatCurrency(pedido.valor_total)} para o fornecedor ${pedido.fornecedor_nome || ''}.\n\n` +
          `Acesse o link abaixo para visualizar os detalhes e enviar sua proposta:\n` +
          `${linkPublico}\n\n` +
          `Atenciosamente,\n${empresaNome}`
        )
      }

      window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
      return
    }

    // Se nao tem representante, enviar para o FORNECEDOR (comportamento original)
    const phone = formatPhoneForWhatsApp(pedido.fornecedor_telefone)
    if (!phone) {
      alert('Fornecedor sem telefone cadastrado')
      return
    }

    // Gerar link publico para o fornecedor visualizar o pedido
    const linkPublico = `${baseUrl}/publico/pedido/${pedido.pedido_id}`

    const message = encodeURIComponent(
      `Ola ${pedido.fornecedor_nome || ''}!\n\n` +
      `Tenho um pedido de compra #${pedido.numero_pedido || pedido.pedido_id} no valor de ${formatCurrency(pedido.valor_total)}.\n\n` +
      `Acesse o link abaixo para visualizar os detalhes e enviar sua proposta:\n` +
      `${linkPublico}\n\n` +
      `Atenciosamente,\n${empresaNome}`
    )
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
  }

  // Abrir modal de fornecedor para novo pedido
  const handleNovoPedido = () => {
    setModalAction('novo')
    setShowFornecedorModal(true)
  }

  // Abrir modal de fornecedor para gerar pedido automaticamente
  const handleGerarAutomatico = () => {
    setModalAction('gerar-auto')
    setShowFornecedorModal(true)
  }

  // Confirmar fornecedor e ir para pagina correspondente
  const handleSelectFornecedor = (fornecedor: FornecedorOption) => {
    setShowFornecedorModal(false)
    if (modalAction === 'novo') {
      router.push(`/compras/pedidos/novo?fornecedor_id=${fornecedor.id}`)
    } else {
      router.push(`/compras/pedidos/gerar-automatico?fornecedor_id=${fornecedor.id}`)
    }
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <PageHeader
        title="Pedidos de Compra"
        subtitle={`${totalCount} pedidos`}
      />

      {/* Workflow Status Cards - Quick Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 2xl:gap-4 mb-6">
        {WORKFLOW_TABS.map(tab => {
          const count = workflowCounts[tab.key] || 0
          const isActive = workflowFilter === tab.key
          const colorClasses: Record<string, string> = {
            gray: isActive ? 'bg-gray-600 text-white border-gray-600' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300',
            blue: isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:border-blue-300',
            amber: isActive ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-700 border-amber-200 hover:border-amber-300',
            orange: isActive ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-700 border-orange-200 hover:border-orange-300',
            green: isActive ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-700 border-green-200 hover:border-green-300',
            purple: isActive ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-700 border-purple-200 hover:border-purple-300',
            red: isActive ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-700 border-red-200 hover:border-red-300',
          }
          const bgAccent: Record<string, string> = {
            gray: 'bg-gray-100',
            blue: 'bg-blue-100',
            amber: 'bg-amber-100',
            orange: 'bg-orange-100',
            green: 'bg-green-100',
            purple: 'bg-purple-100',
            red: 'bg-red-100',
          }
          return (
            <button
              key={tab.key}
              onClick={() => {
                setWorkflowFilter(tab.key)
                setCurrentPage(1)
              }}
              className={`relative px-4 py-3 rounded-xl border-2 transition-all ${colorClasses[tab.color]} ${isActive ? 'shadow-md' : 'shadow-sm hover:shadow'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{tab.label}</span>
                <span className={`text-lg font-bold ${isActive ? '' : bgAccent[tab.color]} ${isActive ? '' : `text-${tab.color}-600`} px-2 py-0.5 rounded-lg`}>
                  {count}
                </span>
              </div>
              {(tab.key === 'sugestao_pendente' || tab.key === 'contra_proposta_pendente') && count > 0 && !isActive && (
                <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse ${tab.key === 'sugestao_pendente' ? 'bg-amber-500' : 'bg-orange-500'}`} />
              )}
            </button>
          )
        })}
      </div>

      <div className="flex gap-4 2xl:gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Card Container */}
          <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] overflow-hidden">
            {/* Card Header */}
            <div className="bg-[#FBFBFB] border border-[#EDEDED] rounded-[20px] px-5 py-[18px]">
              <div className="flex items-end justify-between gap-2 mb-4">
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-base font-medium text-[#344054]">
                    {workflowFilter === 'todos' ? 'Todos os Pedidos' : `Pedidos - ${WORKFLOW_TABS.find(t => t.key === workflowFilter)?.label}`}
                  </h2>
                  <p className="text-xs text-[#838383]">
                    {workflowFilter === 'sugestao_pendente'
                      ? 'Pedidos aguardando sua analise de sugestao do fornecedor'
                      : workflowFilter === 'enviado_fornecedor'
                      ? 'Pedidos enviados ao fornecedor aguardando resposta'
                      : 'Gerencie seus pedidos de compra'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Toggle Sidebar */}
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="p-2.5 text-[#667085] hover:text-[#344054] hover:bg-gray-100 rounded-lg transition-colors"
                    title={sidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
                  >
                    <SidebarToggleIcon />
                  </button>

                  {/* Botao de Filtros com Dropdown */}
                  <div className="relative" ref={filterDropdownRef}>
                    <button
                      onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-xs transition-colors"
                    >
                      <FilterIcon />
                      Filtros
                      {activeFiltersCount > 0 && (
                        <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs text-white">
                          {activeFiltersCount}
                        </span>
                      )}
                    </button>

                    {/* Dropdown */}
                    {showFilterDropdown && (
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[80vh] overflow-y-auto">
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-900">Filtros</h3>
                            <button
                              onClick={() => setShowFilterDropdown(false)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <XIcon />
                            </button>
                          </div>

                          {/* Filtro por Fornecedor */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Fornecedor
                            </label>
                            <select
                              value={fornecedorFilter}
                              onChange={(e) => {
                                setFornecedorFilter(e.target.value)
                                setCurrentPage(1)
                              }}
                              className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                              <option value="">Todos</option>
                              {fornecedores.map(f => (
                                <option key={f.id} value={f.id}>{f.nome}</option>
                              ))}
                            </select>
                          </div>

                          {/* Filtro por Situacao */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Situacao
                            </label>
                            <select
                              value={situacaoFilter}
                              onChange={(e) => {
                                setSituacaoFilter(e.target.value)
                                setCurrentPage(1)
                              }}
                              className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                              <option value="">Todas</option>
                              <option value="Emitida">Emitida</option>
                              <option value="Cancelada">Cancelada</option>
                              <option value="Registrada">Registrada</option>
                              <option value="Aguardando Entrega">Aguardando Entrega</option>
                              <option value="Rascunho">Rascunho</option>
                            </select>
                          </div>

                          {/* Filtro por Periodo */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Periodo
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                value={dataInicioFilter}
                                onChange={(e) => {
                                  setDataInicioFilter(e.target.value)
                                  setCurrentPage(1)
                                }}
                                className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                              <span className="text-gray-500">-</span>
                              <input
                                type="date"
                                value={dataFimFilter}
                                onChange={(e) => {
                                  setDataFimFilter(e.target.value)
                                  setCurrentPage(1)
                                }}
                                className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                            </div>
                          </div>

                          {/* Botoes de Acao */}
                          <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                            <button
                              onClick={clearFilters}
                              className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Limpar
                            </button>
                            <button
                              onClick={() => setShowFilterDropdown(false)}
                              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors"
                            >
                              Aplicar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="relative max-w-[360px]">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#898989]">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  placeholder="Pesquisar por numero, fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 text-[13px] text-gray-900 placeholder:text-[#C9C9C9] bg-white border border-[#D0D5DD] rounded-[14px] shadow-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Selection Actions */}
            {selectedPedidos.length > 0 && (
              <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {selectedPedidos.length} item(ns) selecionado(s)
                </span>
                <button
                  onClick={handleExcluir}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  <TrashIcon />
                  Excluir
                </button>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#EFEFEF]">
                    <th className="px-4 py-3 text-left w-12">
                      <input
                        type="checkbox"
                        checked={pedidos.length > 0 && selectedPedidos.length === pedidos.length}
                        onChange={handleSelectAll}
                        className="w-5 h-5 text-[#336FB6] bg-white border-[#DCDCDC] rounded focus:ring-[#336FB6]"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#344054] w-[66px]">
                      Numero
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#344054] w-[80px]">
                      Data
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">
                      Fornecedor
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#344054] w-[150px]">
                      Obs. internas
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#344054] w-[50px]">
                      Itens
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[#344054] w-[120px]">
                      Valor (R$)
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#344054] w-[100px]">
                      Bling
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#344054] w-[140px]">
                      Negociacao
                    </th>
                    <th className="px-4 py-3 w-12">
                      <span className="sr-only">Acoes</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton columns={8} rows={5} showCheckbox showActions />
                  ) : pedidos.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center">
                        {searchTerm || hasActiveFilters || workflowFilter !== 'todos' ? (
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                              </svg>
                            </div>
                            <p className="text-gray-600 font-medium">Nenhum pedido encontrado</p>
                            <p className="text-sm text-gray-500 mt-1">Ajuste os filtros para ver mais resultados</p>
                            <div className="flex gap-2 mt-4">
                              {workflowFilter !== 'todos' && (
                                <button
                                  onClick={() => setWorkflowFilter('todos')}
                                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                                >
                                  Ver todos os pedidos
                                </button>
                              )}
                              {hasActiveFilters && (
                                <button
                                  onClick={clearFilters}
                                  className="text-sm text-gray-600 hover:text-gray-700"
                                >
                                  Limpar filtros
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-blue-100 rounded-full flex items-center justify-center mb-4">
                              <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                              </svg>
                            </div>
                            <p className="text-gray-700 font-semibold text-lg">Nenhum pedido de compra</p>
                            <p className="text-sm text-gray-500 mt-1 max-w-sm text-center">
                              Crie seu primeiro pedido de compra manualmente ou deixe o sistema calcular automaticamente baseado nas vendas.
                            </p>
                            <div className="flex gap-3 mt-5">
                              <button
                                onClick={handleNovoPedido}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                Novo Pedido
                              </button>
                              <button
                                onClick={handleGerarAutomatico}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                                </svg>
                                Gerar Automatico
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    pedidos.map((pedido, index) => {
                      const statusConfig = STATUS_CONFIG[pedido.status] || STATUS_CONFIG['Rascunho']
                      const statusInterno = statusInternoMap[pedido.pedido_id] || 'rascunho'
                      const hasPendingSuggestion = statusInterno === 'sugestao_pendente'
                      const hasContraProposta = statusInterno === 'contra_proposta_pendente'
                      const isWaitingSupplier = statusInterno === 'enviado_fornecedor'

                      return (
                        <tr
                          key={pedido.pedido_id}
                          className={`border-b border-[#EFEFEF] hover:bg-gray-50 transition-colors ${
                            selectedPedidos.includes(pedido.pedido_id) ? 'bg-blue-50' :
                            hasPendingSuggestion ? 'bg-amber-50/50' :
                            hasContraProposta ? 'bg-orange-50/50' :
                            isWaitingSupplier ? 'bg-blue-50/30' :
                            index % 2 === 1 ? 'bg-[#F9F9F9]' : 'bg-white'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedPedidos.includes(pedido.pedido_id)}
                              onChange={() => handleSelectPedido(pedido.pedido_id)}
                              className="w-5 h-5 text-[#336FB6] bg-white border-[#DCDCDC] rounded focus:ring-[#336FB6]"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/compras/pedidos/${pedido.pedido_id}`}
                              className="text-[13px] text-primary-600 hover:text-primary-700 font-semibold hover:underline"
                            >
                              #{pedido.numero_pedido || pedido.pedido_id}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[13px] text-[#344054]">
                              {formatDate(pedido.data_pedido)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[13px] text-[#344054] font-medium">
                              {pedido.fornecedor_nome || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[13px] text-[#667085] truncate block max-w-[150px]" title={pedido.observacoes_internas}>
                              {pedido.observacoes_internas || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[13px] text-[#344054]">
                              {pedido.itens_produtos?.length || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-[13px] text-[#344054] font-medium">
                              {formatCurrency(pedido.valor_total || 0)}
                            </span>
                          </td>
                          {/* Coluna Bling */}
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-lg ${statusConfig.bg} ${statusConfig.text}`}>
                              {statusConfig.label}
                            </span>
                          </td>
                          {/* Coluna Negociacao */}
                          <td className="px-4 py-3 text-center">
                            {statusInterno && statusInterno !== 'rascunho' ? (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${STATUS_INTERNO_CONFIG[statusInterno].bg} ${STATUS_INTERNO_CONFIG[statusInterno].text}`}>
                                {statusInterno === 'sugestao_pendente' && (
                                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                )}
                                {statusInterno === 'contra_proposta_pendente' && (
                                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                )}
                                {statusInterno === 'enviado_fornecedor' && (
                                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                )}
                                {STATUS_INTERNO_CONFIG[statusInterno].label}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              {/* Acao principal baseada no status do workflow */}
                              {hasPendingSuggestion ? (
                                <Link
                                  href={`/compras/pedidos/${pedido.pedido_id}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
                                  title="Analisar sugestao do fornecedor"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                  </svg>
                                  Analisar
                                </Link>
                              ) : hasContraProposta ? (
                                <Link
                                  href={`/compras/pedidos/${pedido.pedido_id}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
                                  title="Aguardando resposta do fornecedor"
                                >
                                  <svg className="w-3.5 h-3.5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                                  </svg>
                                  Aguardando
                                </Link>
                              ) : (
                                <>
                                  {/* Ver/Editar */}
                                  <Link
                                    href={`/compras/pedidos/${pedido.pedido_id}`}
                                    className="inline-flex items-center justify-center w-8 h-8 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                    title="Ver detalhes"
                                  >
                                    <EyeIcon />
                                  </Link>

                                  {/* Imprimir */}
                                  {pedido.status !== 'Rascunho' && pedido.status !== 'Cancelada' && (
                                    <button
                                      onClick={() => window.open(`/compras/pedidos/${pedido.pedido_id}/imprimir`, '_blank')}
                                      className="inline-flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                      title="Imprimir pedido"
                                    >
                                      <PrintIcon />
                                    </button>
                                  )}

                                  {/* WhatsApp */}
                                  {pedido.status !== 'Rascunho' && pedido.status !== 'Cancelada' && (() => {
                                    const rep = pedido.fornecedor_id ? representantesPorFornecedor[pedido.fornecedor_id] : null
                                    const temRepresentante = rep && rep.telefone
                                    const temTelefone = temRepresentante || pedido.fornecedor_telefone

                                    return (
                                      <button
                                        onClick={() => handleWhatsApp(pedido)}
                                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                                          temTelefone
                                            ? 'text-green-500 hover:text-green-600 hover:bg-green-50'
                                            : 'text-gray-300 cursor-not-allowed'
                                        }`}
                                        title={
                                          temRepresentante
                                            ? `Enviar para representante: ${rep.nome}${!rep.cadastrado ? ' (primeiro acesso)' : ''}`
                                            : pedido.fornecedor_telefone
                                            ? 'Enviar para fornecedor'
                                            : 'Sem telefone cadastrado'
                                        }
                                        disabled={!temTelefone}
                                      >
                                        <WhatsAppIcon />
                                      </button>
                                    )
                                  })()}

                                  {/* Excluir - apenas Rascunho */}
                                  {pedido.status === 'Rascunho' && (
                                    <button
                                      onClick={() => {
                                        if (confirm('Deseja realmente excluir este pedido?')) {
                                          setSelectedPedidos([pedido.pedido_id])
                                          handleExcluir()
                                        }
                                      }}
                                      className="inline-flex items-center justify-center w-8 h-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Excluir pedido"
                                    >
                                      <TrashIcon />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && totalCount > itemsPerPage && (
              <div className="px-7 py-4 flex items-center justify-between bg-white">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-2 px-[18px] py-2.5 text-[13px] font-medium text-[#336FB6] bg-white border-[1.5px] border-[#336FB6] rounded-lg shadow-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeftIcon />
                  Anterior
                </button>

                <div className="flex items-center gap-0.5">
                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-3 py-2 text-sm text-gray-500">...</span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page as number)}
                        className={`w-10 h-10 text-xs font-medium rounded-lg transition-colors ${
                          currentPage === page
                            ? 'bg-[#ECECEC] text-[#1D2939]'
                            : 'text-[#475467] hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="inline-flex items-center gap-2 px-[18px] py-2.5 text-[13px] font-medium text-[#336FB6] bg-white border-[1.5px] border-[#336FB6] rounded-lg shadow-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Proximo
                  <ChevronRightIcon />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <SidebarAcoes
          resumo={resumo}
          onNovoPedido={handleNovoPedido}
          onGerarAutomatico={handleGerarAutomatico}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Modal Selecionar Fornecedor */}
      <FornecedorSelectModal
        isOpen={showFornecedorModal}
        onClose={() => setShowFornecedorModal(false)}
        onSelect={handleSelectFornecedor}
        title={modalAction === 'novo' ? 'Selecionar Fornecedor' : 'Gerar Pedido Automatico'}
        subtitle={modalAction === 'novo'
          ? 'Selecione o fornecedor para criar o pedido de compra.'
          : 'Selecione o fornecedor para gerar o pedido automaticamente com base nas vendas e estoque.'}
        fornecedores={fornecedores}
        loading={loadingFornecedores}
      />
    </DashboardLayout>
  )
}
