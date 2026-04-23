'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { RequirePermission } from '@/components/auth/RequirePermission'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { EmpresaMultiSelect } from '@/components/forms/EmpresaMultiSelect'
import type { PoliticaCompra } from '@/types/fornecedor'

// Icons
function SearchIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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

interface PoliticaWithFornecedor extends PoliticaCompra {
  fornecedor_nome: string
  fornecedor_nome_fantasia?: string
}

type PoliticaRow = Record<string, unknown> & {
  empresa_id: number
  fornecedores?: { nome?: string; nome_fantasia?: string }
}

interface FornecedorOption {
  id: number
  nome: string
  nome_fantasia?: string
}

interface PoliticaFormData {
  forma_pagamento_dias: number[]
  prazo_entrega: number
  valor_minimo: number
  peso: number
  desconto: number
  bonificacao: number
  observacao: string
  estoque_eficiente: boolean
}

const defaultPoliticaForm: PoliticaFormData = {
  forma_pagamento_dias: [],
  prazo_entrega: 0,
  valor_minimo: 0,
  peso: 0,
  desconto: 0,
  bonificacao: 0,
  observacao: '',
  estoque_eficiente: true,
}

// Componente de formulario de politica (fora do componente principal para evitar re-render)
const PoliticaFormFields = memo(function PoliticaFormFields({
  form,
  setForm,
  novoDia,
  setNovoDia,
  onAddDia,
  onRemoveDia,
}: {
  form: PoliticaFormData
  setForm: React.Dispatch<React.SetStateAction<PoliticaFormData>>
  novoDia: string
  setNovoDia: React.Dispatch<React.SetStateAction<string>>
  onAddDia: () => void
  onRemoveDia: (dia: number) => void
}) {
  return (
    <div className="space-y-4">
      {/* Forma de pagamento */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Formas de Pagamento (dias)</label>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex flex-wrap items-center gap-2 min-h-[42px] px-3 py-2 border border-gray-300 rounded-lg bg-white">
            {form.forma_pagamento_dias.length === 0 ? (
              <span className="text-sm text-gray-400">Adicione os dias...</span>
            ) : (
              form.forma_pagamento_dias.map(dia => (
                <span
                  key={dia}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#336FB6] text-white text-sm rounded-full"
                >
                  {dia}d
                  <button
                    type="button"
                    onClick={() => onRemoveDia(dia)}
                    className="ml-0.5 hover:bg-white/20 rounded-full p-0.5"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))
            )}
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={novoDia}
              onChange={(e) => setNovoDia(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAddDia())}
              placeholder="Dias"
              min="1"
              className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
            />
            <button
              type="button"
              onClick={onAddDia}
              className="p-2 bg-[#336FB6] text-white rounded-lg hover:bg-[#2660A5] transition-colors"
            >
              <PlusIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Prazo de entrega */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de entrega (dias)</label>
          <input
            type="number"
            value={form.prazo_entrega || ''}
            onChange={(e) => setForm(prev => ({ ...prev, prazo_entrega: parseInt(e.target.value) || 0 }))}
            className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
          />
        </div>

        {/* Valor minimo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor minimo do pedido (R$)</label>
          <input
            type="number"
            value={form.valor_minimo || ''}
            onChange={(e) => setForm(prev => ({ ...prev, valor_minimo: parseFloat(e.target.value) || 0 }))}
            className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
          />
        </div>

        {/* Peso */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
          <input
            type="number"
            value={form.peso || ''}
            onChange={(e) => setForm(prev => ({ ...prev, peso: parseFloat(e.target.value) || 0 }))}
            className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
          />
        </div>

        {/* Desconto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Desconto (%)</label>
          <input
            type="number"
            value={form.desconto || ''}
            onChange={(e) => setForm(prev => ({ ...prev, desconto: parseFloat(e.target.value) || 0 }))}
            className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
          />
        </div>

        {/* Bonificacao */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bonificacao (%)</label>
          <input
            type="number"
            value={form.bonificacao || ''}
            onChange={(e) => setForm(prev => ({ ...prev, bonificacao: parseFloat(e.target.value) || 0 }))}
            className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
          />
        </div>

        {/* Observacao */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observacao</label>
          <input
            type="text"
            value={form.observacao || ''}
            onChange={(e) => setForm(prev => ({ ...prev, observacao: e.target.value }))}
            placeholder="Ex: Produtos da linha Pet"
            className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
          />
        </div>
      </div>
    </div>
  )
})

export default function PoliticaCompraPage() {
  const { user, empresa, empresas } = useAuth()

  const [loading, setLoading] = useState(true)
  const [politicas, setPoliticas] = useState<PoliticaWithFornecedor[]>([])
  const [fornecedores, setFornecedores] = useState<FornecedorOption[]>([])

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [fornecedorFilter, setFornecedorFilter] = useState<string>('')

  // Paginacao
  const [page, setPage] = useState(1)
  const itemsPerPage = 10

  // Modal de criar nova politica
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState<PoliticaFormData>(defaultPoliticaForm)
  const [createFornecedorId, setCreateFornecedorId] = useState<number | null>(null)
  const [createSearchTerm, setCreateSearchTerm] = useState('')
  const [creating, setCreating] = useState(false)
  const [novoDiaPagamentoCreate, setNovoDiaPagamentoCreate] = useState('')
  const [createEmpresaIds, setCreateEmpresaIds] = useState<number[]>([])

  // Modal de duplicar
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [politicaToDuplicate, setPoliticaToDuplicate] = useState<PoliticaWithFornecedor | null>(null)
  const [duplicateForm, setDuplicateForm] = useState<PoliticaFormData>(defaultPoliticaForm)
  const [selectedFornecedores, setSelectedFornecedores] = useState<number[]>([])
  const [duplicating, setDuplicating] = useState(false)
  const [duplicateSearchTerm, setDuplicateSearchTerm] = useState('')
  const [novoDiaPagamentoDuplicate, setNovoDiaPagamentoDuplicate] = useState('')

  // Modal de replicar em outras lojas (Sprint 3)
  const [showReplicateLojasModal, setShowReplicateLojasModal] = useState(false)
  const [politicaToReplicate, setPoliticaToReplicate] = useState<PoliticaWithFornecedor | null>(null)
  const [replicateForm, setReplicateForm] = useState<PoliticaFormData>(defaultPoliticaForm)
  const [replicateEmpresaIds, setReplicateEmpresaIds] = useState<number[]>([])
  const [replicateDisabledEmpresaIds, setReplicateDisabledEmpresaIds] = useState<number[]>([])
  const [replicateFornecedorIdPorEmpresa, setReplicateFornecedorIdPorEmpresa] = useState<Map<number, number | null>>(new Map())
  const [replicating, setReplicating] = useState(false)
  const [novoDiaPagamentoReplicate, setNovoDiaPagamentoReplicate] = useState('')
  const [loadingReplicateConflicts, setLoadingReplicateConflicts] = useState(false)

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return

      try {
        const empresaId = empresa?.id || user?.empresa_id

        // Buscar politicas com dados do fornecedor
        const { data: politicasData, error: politicasError } = await supabase
          .from('politica_compra')
          .select(`
            *,
            fornecedores!inner(id, nome, nome_fantasia)
          `)
          .eq('empresa_id', empresaId)
          .or('isdeleted.is.null,isdeleted.eq.false')
          .order('created_at', { ascending: false })

        if (politicasError) throw politicasError

        // Mapear dados
        const mappedPoliticas = (politicasData || []).map((p: any) => ({
          ...p,
          fornecedor_nome: p.fornecedores?.nome || '-',
          fornecedor_nome_fantasia: p.fornecedores?.nome_fantasia,
        }))

        setPoliticas(mappedPoliticas)

        // Buscar fornecedores para filtro e duplicacao
        const { data: fornecedoresData } = await supabase
          .from('fornecedores')
          .select('id, nome, nome_fantasia')
          .eq('empresa_id', empresaId)
          .order('nome')

        setFornecedores(fornecedoresData || [])

      } catch (err) {
        console.error('Erro ao carregar politicas:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.id, empresa?.id])

  // Filtrar politicas
  const filteredPoliticas = useMemo(() => {
    return politicas.filter(p => {
      // Filtro por texto (fornecedor ou observacao)
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchFornecedor = p.fornecedor_nome?.toLowerCase().includes(search) ||
                                p.fornecedor_nome_fantasia?.toLowerCase().includes(search)
        const matchObs = p.observacao?.toLowerCase().includes(search)
        if (!matchFornecedor && !matchObs) return false
      }

      // Filtro por fornecedor
      if (fornecedorFilter && p.fornecedor_id !== parseInt(fornecedorFilter)) {
        return false
      }

      return true
    })
  }, [politicas, searchTerm, fornecedorFilter])

  // Paginacao
  const totalPages = Math.ceil(filteredPoliticas.length / itemsPerPage)
  const paginatedPoliticas = filteredPoliticas.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  )

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, '...', totalPages)
      } else if (page >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages)
      }
    }
    return pages
  }

  // Abrir modal de criar
  const handleOpenCreate = () => {
    setCreateForm(defaultPoliticaForm)
    setCreateFornecedorId(null)
    setCreateSearchTerm('')
    setNovoDiaPagamentoCreate('')
    // Default: todas as empresas marcadas; se so tem 1, usa a ativa
    const defaultIds = empresas && empresas.length > 0
      ? empresas.map(e => e.id)
      : (empresa?.id ? [empresa.id] : [])
    setCreateEmpresaIds(defaultIds)
    setShowCreateModal(true)
  }

  // Resolve o fornecedor_id correto em cada empresa destino.
  // Fornecedores sao duplicados por empresa (mesma razao social, ids diferentes).
  // Match preferencial: numerodocumento (CNPJ/CPF); fallback: nome.
  const resolveFornecedorIdsPorEmpresa = async (
    fornecedorOrigemId: number,
    empresaIdsDestino: number[]
  ): Promise<Map<number, number | null>> => {
    const result = new Map<number, number | null>()

    // Busca o fornecedor de origem
    const { data: origem } = await supabase
      .from('fornecedores')
      .select('id, nome, empresa_id, numerodocumento')
      .eq('id', fornecedorOrigemId)
      .single()

    if (!origem) {
      empresaIdsDestino.forEach(id => result.set(id, null))
      return result
    }

    // Busca fornecedores correspondentes nas empresas destino
    const empresasParaBuscar = empresaIdsDestino.filter(id => id !== origem.empresa_id)

    if (empresasParaBuscar.length === 0) {
      // So a empresa de origem esta na lista
      result.set(origem.empresa_id, origem.id)
      return result
    }

    // Match por numerodocumento tem prioridade, nome como fallback
    let matches: { id: number; empresa_id: number; nome: string; numerodocumento: string | null }[] = []
    if (origem.numerodocumento) {
      const { data } = await supabase
        .from('fornecedores')
        .select('id, empresa_id, nome, numerodocumento')
        .in('empresa_id', empresasParaBuscar)
        .eq('numerodocumento', origem.numerodocumento)
      matches = data || []
    }

    const empresasAindaSemMatch = empresasParaBuscar.filter(
      id => !matches.some(m => m.empresa_id === id)
    )

    if (empresasAindaSemMatch.length > 0 && origem.nome) {
      const { data } = await supabase
        .from('fornecedores')
        .select('id, empresa_id, nome, numerodocumento')
        .in('empresa_id', empresasAindaSemMatch)
        .eq('nome', origem.nome)
      matches = [...matches, ...(data || [])]
    }

    // Preencher o map
    if (empresaIdsDestino.includes(origem.empresa_id)) {
      result.set(origem.empresa_id, origem.id)
    }
    for (const empresaId of empresasParaBuscar) {
      const match = matches.find(m => m.empresa_id === empresaId)
      result.set(empresaId, match ? match.id : null)
    }

    return result
  }

  // Criar nova politica (em uma ou mais empresas)
  const handleCreate = async () => {
    if (!createFornecedorId) {
      alert('Selecione um fornecedor')
      return
    }

    // Fallback: se multi-select nao for usado (user com 1 empresa), usar empresa ativa
    const empresaAtivaId = empresa?.id || user?.empresa_id
    const empresaIds = createEmpresaIds.length > 0
      ? createEmpresaIds
      : (empresaAtivaId ? [empresaAtivaId] : [])

    if (empresaIds.length === 0) {
      alert('Selecione ao menos uma loja')
      return
    }

    setCreating(true)
    try {
      // 1a. Resolver fornecedor_id correto em cada empresa destino
      const fornecedorIdPorEmpresa = await resolveFornecedorIdsPorEmpresa(createFornecedorId, empresaIds)
      const empresasSemFornecedor = empresaIds.filter(id => !fornecedorIdPorEmpresa.get(id))

      if (empresasSemFornecedor.length > 0) {
        const nomesSemForn = (empresas || [])
          .filter(e => empresasSemFornecedor.includes(e.id))
          .map(e => e.nome_fantasia || e.razao_social)
          .join(', ')

        const empresasComFornecedor = empresaIds.filter(id => fornecedorIdPorEmpresa.get(id))
        if (empresasComFornecedor.length === 0) {
          alert(`Este fornecedor nao esta cadastrado em nenhuma das lojas selecionadas: ${nomesSemForn}`)
          setCreating(false)
          return
        }

        const continuar = window.confirm(
          `Fornecedor nao cadastrado em ${empresasSemFornecedor.length} loja(s): ${nomesSemForn}.\n\nContinuar criando politica apenas nas ${empresasComFornecedor.length} loja(s) restantes?`
        )
        if (!continuar) {
          setCreating(false)
          return
        }
      }

      // Lista final de empresas que vao receber a politica
      const empresasEfetivas = empresaIds.filter(id => fornecedorIdPorEmpresa.get(id))

      // 1b. Detectar conflitos (politica ja existe para fornecedor+empresa)
      // Usa os fornecedor_ids corretos por empresa
      const paresParaChecar = empresasEfetivas.map(eid => ({
        empresa_id: eid,
        fornecedor_id: fornecedorIdPorEmpresa.get(eid)!,
      }))

      const fornecedorIdsUnicos = Array.from(new Set(paresParaChecar.map(p => p.fornecedor_id)))
      const { data: existentes, error: conflictError } = await supabase
        .from('politica_compra')
        .select('id, empresa_id, fornecedor_id')
        .in('fornecedor_id', fornecedorIdsUnicos)
        .in('empresa_id', empresasEfetivas)
        .or('isdeleted.is.null,isdeleted.eq.false')

      if (conflictError) throw conflictError

      // Conflito valido = par (empresa_id, fornecedor_id) existe
      const conflitos = (existentes || []).filter(e =>
        paresParaChecar.some(p => p.empresa_id === e.empresa_id && p.fornecedor_id === e.fornecedor_id)
      )
      const empresasComConflito = new Set(conflitos.map(c => c.empresa_id))

      if (empresasComConflito.size > 0) {
        const nomesConflito = (empresas || [])
          .filter(e => empresasComConflito.has(e.id))
          .map(e => e.nome_fantasia || e.razao_social)
          .join(', ')

        const confirmar = window.confirm(
          `Este fornecedor ja tem politica de compra em ${empresasComConflito.size} loja(s): ${nomesConflito}.\n\nDeseja sobrescrever a(s) politica(s) existente(s)?`
        )
        if (!confirmar) {
          setCreating(false)
          return
        }
      }

      // 2. Atualizar registros existentes (sobrescrever)
      const idsParaAtualizar = conflitos.map(c => c.id)
      if (idsParaAtualizar.length > 0) {
        const { error: updateError } = await supabase
          .from('politica_compra')
          .update({
            forma_pagamento_dias: createForm.forma_pagamento_dias,
            prazo_entrega: createForm.prazo_entrega,
            valor_minimo: createForm.valor_minimo,
            peso: createForm.peso,
            desconto: createForm.desconto,
            bonificacao: createForm.bonificacao,
            observacao: createForm.observacao,
            estoque_eficiente: createForm.estoque_eficiente,
          })
          .in('id', idsParaAtualizar)
        if (updateError) throw updateError
      }

      // 3. Inserir novas (empresas efetivas sem conflito), usando fornecedor_id correto por empresa
      const empresasParaInserir = empresasEfetivas.filter(id => !empresasComConflito.has(id))
      let inseridas: PoliticaRow[] = []
      if (empresasParaInserir.length > 0) {
        const novasRows = empresasParaInserir.map(empresaId => ({
          fornecedor_id: fornecedorIdPorEmpresa.get(empresaId)!,
          empresa_id: empresaId,
          forma_pagamento_dias: createForm.forma_pagamento_dias,
          prazo_entrega: createForm.prazo_entrega,
          valor_minimo: createForm.valor_minimo,
          peso: createForm.peso,
          desconto: createForm.desconto,
          bonificacao: createForm.bonificacao,
          observacao: createForm.observacao,
          estoque_eficiente: createForm.estoque_eficiente,
        }))

        const { data, error: insertError } = await supabase
          .from('politica_compra')
          .insert(novasRows)
          .select(`
            *,
            fornecedores!inner(id, nome, nome_fantasia)
          `)

        if (insertError) throw insertError
        inseridas = data || []
      }

      // 4. Atualizar lista local (apenas as da empresa ativa, que e o que a pagina mostra)
      const novasDaAtiva = inseridas
        .filter(p => p.empresa_id === empresaAtivaId)
        .map((p) => ({
          ...p,
          fornecedor_nome: p.fornecedores?.nome || '-',
          fornecedor_nome_fantasia: p.fornecedores?.nome_fantasia,
        })) as PoliticaWithFornecedor[]

      if (novasDaAtiva.length > 0) {
        setPoliticas(prev => [...novasDaAtiva, ...prev])
      }

      // Se sobrescreveu politica da empresa ativa, refaz o fetch pra pegar valores novos
      if (empresasComConflito.has(empresaAtivaId as number)) {
        const { data: refetch } = await supabase
          .from('politica_compra')
          .select(`*, fornecedores!inner(id, nome, nome_fantasia)`)
          .eq('empresa_id', empresaAtivaId)
          .or('isdeleted.is.null,isdeleted.eq.false')
          .order('created_at', { ascending: false })
        if (refetch) {
          setPoliticas((refetch as PoliticaRow[]).map((p) => ({
            ...p,
            fornecedor_nome: p.fornecedores?.nome || '-',
            fornecedor_nome_fantasia: p.fornecedores?.nome_fantasia,
          })) as PoliticaWithFornecedor[])
        }
      }

      setShowCreateModal(false)

      const partes: string[] = []
      if (empresasParaInserir.length > 0) partes.push(`${empresasParaInserir.length} criada(s)`)
      if (empresasComConflito.size > 0) partes.push(`${empresasComConflito.size} atualizada(s)`)
      alert(`Politica aplicada em ${empresaIds.length} loja(s): ${partes.join(' + ')}`)

    } catch (err) {
      console.error('Erro ao criar politica:', err)
      alert('Erro ao criar politica. Tente novamente.')
    } finally {
      setCreating(false)
    }
  }

  // Abrir modal de duplicar
  const handleOpenDuplicate = (politica: PoliticaWithFornecedor) => {
    setPoliticaToDuplicate(politica)
    setDuplicateForm({
      forma_pagamento_dias: [...(politica.forma_pagamento_dias || [])],
      prazo_entrega: politica.prazo_entrega || 0,
      valor_minimo: politica.valor_minimo || 0,
      peso: politica.peso || 0,
      desconto: politica.desconto || 0,
      bonificacao: politica.bonificacao || 0,
      observacao: politica.observacao || '',
      estoque_eficiente: politica.estoque_eficiente ?? true,
    })
    setSelectedFornecedores([])
    setDuplicateSearchTerm('')
    setNovoDiaPagamentoDuplicate('')
    setShowDuplicateModal(true)
  }

  // Toggle selecao de fornecedor
  const toggleFornecedorSelection = (fornecedorId: number) => {
    setSelectedFornecedores(prev =>
      prev.includes(fornecedorId)
        ? prev.filter(id => id !== fornecedorId)
        : [...prev, fornecedorId]
    )
  }

  // Selecionar todos os fornecedores visiveis
  const selectAllVisible = () => {
    const visibleIds = filteredFornecedoresForDuplicate.map(f => f.id)
    setSelectedFornecedores(prev => {
      const newSelection = [...prev]
      visibleIds.forEach(id => {
        if (!newSelection.includes(id)) {
          newSelection.push(id)
        }
      })
      return newSelection
    })
  }

  // Limpar selecao
  const clearSelection = () => {
    setSelectedFornecedores([])
  }

  // Filtrar fornecedores para criar (busca)
  const filteredFornecedoresForCreate = useMemo(() => {
    if (!createSearchTerm) return fornecedores

    return fornecedores.filter(f => {
      const search = createSearchTerm.toLowerCase()
      const matchNome = f.nome?.toLowerCase().includes(search)
      const matchFantasia = f.nome_fantasia?.toLowerCase().includes(search)
      return matchNome || matchFantasia
    })
  }, [fornecedores, createSearchTerm])

  // Filtrar fornecedores para duplicacao (excluir o fornecedor atual)
  const filteredFornecedoresForDuplicate = useMemo(() => {
    if (!politicaToDuplicate) return []

    return fornecedores.filter(f => {
      // Excluir o fornecedor que ja tem essa politica
      if (f.id === politicaToDuplicate.fornecedor_id) return false

      // Filtrar por busca
      if (duplicateSearchTerm) {
        const search = duplicateSearchTerm.toLowerCase()
        const matchNome = f.nome?.toLowerCase().includes(search)
        const matchFantasia = f.nome_fantasia?.toLowerCase().includes(search)
        if (!matchNome && !matchFantasia) return false
      }

      return true
    })
  }, [fornecedores, politicaToDuplicate, duplicateSearchTerm])

  // Duplicar politica
  const handleDuplicate = async () => {
    if (!politicaToDuplicate || selectedFornecedores.length === 0) return

    setDuplicating(true)
    try {
      const empresaId = empresa?.id || user?.empresa_id

      // Criar uma politica para cada fornecedor selecionado usando os valores editados
      const novasPoliticas = selectedFornecedores.map(fornecedorId => ({
        fornecedor_id: fornecedorId,
        empresa_id: empresaId,
        forma_pagamento_dias: duplicateForm.forma_pagamento_dias,
        prazo_entrega: duplicateForm.prazo_entrega,
        valor_minimo: duplicateForm.valor_minimo,
        peso: duplicateForm.peso,
        desconto: duplicateForm.desconto,
        bonificacao: duplicateForm.bonificacao,
        observacao: duplicateForm.observacao,
        estoque_eficiente: duplicateForm.estoque_eficiente,
      }))

      const { data, error } = await supabase
        .from('politica_compra')
        .insert(novasPoliticas)
        .select(`
          *,
          fornecedores!inner(id, nome, nome_fantasia)
        `)

      if (error) throw error

      // Adicionar novas politicas a lista
      if (data) {
        const mappedNovas = data.map((p: any) => ({
          ...p,
          fornecedor_nome: p.fornecedores?.nome || '-',
          fornecedor_nome_fantasia: p.fornecedores?.nome_fantasia,
        }))
        setPoliticas(prev => [...mappedNovas, ...prev])
      }

      // Fechar modal e mostrar sucesso
      setShowDuplicateModal(false)
      setPoliticaToDuplicate(null)
      setSelectedFornecedores([])

      alert(`Politica duplicada para ${selectedFornecedores.length} fornecedor(es) com sucesso!`)

    } catch (err) {
      console.error('Erro ao duplicar politica:', err)
      alert('Erro ao duplicar politica. Tente novamente.')
    } finally {
      setDuplicating(false)
    }
  }

  // Formatar valor monetario
  const formatCurrency = (value?: number) => {
    if (!value) return '-'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value))
  }

  // Handlers para adicionar/remover dias - Create (memoizados para evitar re-render)
  const handleAddDiaCreate = useCallback(() => {
    const dia = parseInt(novoDiaPagamentoCreate)
    if (isNaN(dia) || dia <= 0) return
    setCreateForm(prev => {
      if (prev.forma_pagamento_dias.includes(dia)) return prev
      return {
        ...prev,
        forma_pagamento_dias: [...prev.forma_pagamento_dias, dia].sort((a, b) => a - b)
      }
    })
    setNovoDiaPagamentoCreate('')
  }, [novoDiaPagamentoCreate])

  const handleRemoveDiaCreate = useCallback((dia: number) => {
    setCreateForm(prev => ({
      ...prev,
      forma_pagamento_dias: prev.forma_pagamento_dias.filter(d => d !== dia)
    }))
  }, [])

  // Handlers para adicionar/remover dias - Duplicate (memoizados para evitar re-render)
  const handleAddDiaDuplicate = useCallback(() => {
    const dia = parseInt(novoDiaPagamentoDuplicate)
    if (isNaN(dia) || dia <= 0) return
    setDuplicateForm(prev => {
      if (prev.forma_pagamento_dias.includes(dia)) return prev
      return {
        ...prev,
        forma_pagamento_dias: [...prev.forma_pagamento_dias, dia].sort((a, b) => a - b)
      }
    })
    setNovoDiaPagamentoDuplicate('')
  }, [novoDiaPagamentoDuplicate])

  const handleRemoveDiaDuplicate = useCallback((dia: number) => {
    setDuplicateForm(prev => ({
      ...prev,
      forma_pagamento_dias: prev.forma_pagamento_dias.filter(d => d !== dia)
    }))
  }, [])

  // Handlers para adicionar/remover dias - Replicate lojas (Sprint 3)
  const handleAddDiaReplicate = useCallback(() => {
    const dia = parseInt(novoDiaPagamentoReplicate)
    if (isNaN(dia) || dia <= 0) return
    setReplicateForm(prev => {
      if (prev.forma_pagamento_dias.includes(dia)) return prev
      return {
        ...prev,
        forma_pagamento_dias: [...prev.forma_pagamento_dias, dia].sort((a, b) => a - b)
      }
    })
    setNovoDiaPagamentoReplicate('')
  }, [novoDiaPagamentoReplicate])

  const handleRemoveDiaReplicate = useCallback((dia: number) => {
    setReplicateForm(prev => ({
      ...prev,
      forma_pagamento_dias: prev.forma_pagamento_dias.filter(d => d !== dia)
    }))
  }, [])

  // Abrir modal de replicar em lojas
  const handleOpenReplicateLojas = async (politica: PoliticaWithFornecedor) => {
    setPoliticaToReplicate(politica)
    setReplicateForm({
      forma_pagamento_dias: [...(politica.forma_pagamento_dias || [])],
      prazo_entrega: politica.prazo_entrega || 0,
      valor_minimo: politica.valor_minimo || 0,
      peso: politica.peso || 0,
      desconto: politica.desconto || 0,
      bonificacao: politica.bonificacao || 0,
      observacao: politica.observacao || '',
      estoque_eficiente: politica.estoque_eficiente ?? true,
    })
    setReplicateEmpresaIds([])
    setNovoDiaPagamentoReplicate('')
    setShowReplicateLojasModal(true)

    // Resolver fornecedor_id por empresa + buscar conflitos (politica existente)
    setLoadingReplicateConflicts(true)
    try {
      const empresaIds = (empresas || []).map(e => e.id)
      if (empresaIds.length === 0) {
        setReplicateDisabledEmpresaIds([])
        setReplicateFornecedorIdPorEmpresa(new Map())
        return
      }

      // 1. Resolver o fornecedor correspondente em cada empresa
      const fornPorEmpresa = await resolveFornecedorIdsPorEmpresa(politica.fornecedor_id, empresaIds)
      setReplicateFornecedorIdPorEmpresa(fornPorEmpresa)

      // 2. Lojas sem fornecedor correspondente -> desabilitar
      const semFornecedor = empresaIds.filter(id => !fornPorEmpresa.get(id))

      // 3. Lojas onde o fornecedor correspondente ja tem politica -> desabilitar
      const fornIdsParaChecar = empresaIds
        .map(id => fornPorEmpresa.get(id))
        .filter((v): v is number => typeof v === 'number')

      let comPolitica: number[] = []
      if (fornIdsParaChecar.length > 0) {
        const { data: conflitos } = await supabase
          .from('politica_compra')
          .select('empresa_id, fornecedor_id')
          .in('fornecedor_id', fornIdsParaChecar)
          .in('empresa_id', empresaIds)
          .or('isdeleted.is.null,isdeleted.eq.false')

        comPolitica = (conflitos || [])
          .filter(c => fornPorEmpresa.get(c.empresa_id) === c.fornecedor_id)
          .map(c => c.empresa_id)
      }

      // Tambem desabilita a propria empresa de origem (nao faz sentido replicar nela mesma)
      setReplicateDisabledEmpresaIds(Array.from(new Set([...semFornecedor, ...comPolitica])))
    } catch (err) {
      console.error('Erro ao resolver fornecedor/conflitos:', err)
      setReplicateDisabledEmpresaIds([])
      setReplicateFornecedorIdPorEmpresa(new Map())
    } finally {
      setLoadingReplicateConflicts(false)
    }
  }

  // Executar replicacao em lojas
  const handleReplicateLojas = async () => {
    if (!politicaToReplicate || replicateEmpresaIds.length === 0) return

    setReplicating(true)
    try {
      const empresaAtivaId = empresa?.id || user?.empresa_id
      // Resolver fornecedor_id por empresa destino (map ja foi calculado no handleOpen)
      const rowsComFornecedor = replicateEmpresaIds
        .map(empresaId => {
          const forn = replicateFornecedorIdPorEmpresa.get(empresaId)
          if (!forn) return null
          return {
            fornecedor_id: forn,
            empresa_id: empresaId,
            forma_pagamento_dias: replicateForm.forma_pagamento_dias,
            prazo_entrega: replicateForm.prazo_entrega,
            valor_minimo: replicateForm.valor_minimo,
            peso: replicateForm.peso,
            desconto: replicateForm.desconto,
            bonificacao: replicateForm.bonificacao,
            observacao: replicateForm.observacao,
            estoque_eficiente: replicateForm.estoque_eficiente,
          }
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)

      if (rowsComFornecedor.length === 0) {
        alert('Nenhuma loja disponivel para replicacao')
        setReplicating(false)
        return
      }

      const novasRows = rowsComFornecedor

      const { data, error } = await supabase
        .from('politica_compra')
        .insert(novasRows)
        .select(`*, fornecedores!inner(id, nome, nome_fantasia)`)

      if (error) throw error

      // Se alguma foi criada na empresa ativa, adicionar a lista local
      if (data) {
        const novasDaAtiva = (data as PoliticaRow[])
          .filter(p => p.empresa_id === empresaAtivaId)
          .map(p => ({
            ...p,
            fornecedor_nome: p.fornecedores?.nome || '-',
            fornecedor_nome_fantasia: p.fornecedores?.nome_fantasia,
          })) as PoliticaWithFornecedor[]
        if (novasDaAtiva.length > 0) {
          setPoliticas(prev => [...novasDaAtiva, ...prev])
        }
      }

      setShowReplicateLojasModal(false)
      setPoliticaToReplicate(null)
      setReplicateEmpresaIds([])
      alert(`Politica replicada em ${replicateEmpresaIds.length} loja(s)`)
    } catch (err) {
      console.error('Erro ao replicar politica:', err)
      alert('Erro ao replicar politica. Tente novamente.')
    } finally {
      setReplicating(false)
    }
  }

  if (loading) {
    return (
      <RequirePermission permission="cadastros">
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <svg className="animate-spin h-8 w-8 text-[#336FB6]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </DashboardLayout>
      </RequirePermission>
    )
  }

  return (
    <RequirePermission permission="cadastros">
    <DashboardLayout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/dashboard" className="hover:text-[#336FB6]">
          Dashboard
        </Link>
        <span>&gt;</span>
        <span className="text-gray-900 font-medium">Politica de Compra</span>
      </div>

      {/* Card Container */}
      <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] overflow-hidden">
        {/* Header */}
        <div className="bg-[#FBFBFB] border border-[#EDEDED] rounded-t-[20px] px-5 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-medium text-[#344054]">Politicas de Compra</h2>
              <p className="text-xs text-[#838383]">
                Gerencie as politicas de compra de todos os fornecedores em um so lugar
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <span className="px-3 py-1 bg-[#336FB6]/10 text-[#336FB6] rounded-full font-medium text-sm text-center w-full sm:w-auto">
                {filteredPoliticas.length} politica{filteredPoliticas.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors w-full sm:w-auto"
              >
                <PlusIcon />
                Nova Politica
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Busca */}
            <div className="relative flex-1 w-full sm:max-w-md">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
                placeholder="Buscar por fornecedor ou observacao..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <SearchIcon />
              </div>
            </div>

            {/* Filtro por fornecedor */}
            <select
              value={fornecedorFilter}
              onChange={(e) => {
                setFornecedorFilter(e.target.value)
                setPage(1)
              }}
              className="w-full sm:w-auto px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
            >
              <option value="">Todos os fornecedores</option>
              {fornecedores.map(f => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabela */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Fornecedor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Forma de pagamento</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Prazo entrega</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Prazo estoque</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Valor minimo</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Peso (kg)</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Desconto (%)</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Bonificacao (%)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Observacao</th>
                <th className="px-4 py-3 w-24 text-center text-xs font-medium text-gray-500">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPoliticas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || fornecedorFilter
                      ? 'Nenhuma politica encontrada com os filtros aplicados.'
                      : 'Nenhuma politica de compra cadastrada.'}
                  </td>
                </tr>
              ) : (
                paginatedPoliticas.map((pol, index) => (
                  <tr key={pol.id} className={`border-b border-gray-100 ${index % 2 === 1 ? 'bg-gray-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {pol.fornecedor_nome}
                        </p>
                        {pol.fornecedor_nome_fantasia && (
                          <p className="text-xs text-gray-500">{pol.fornecedor_nome_fantasia}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {pol.forma_pagamento_dias?.length > 0 ? (
                          pol.forma_pagamento_dias.map(dia => (
                            <span key={dia} className="px-2 py-0.5 text-xs font-medium bg-[#336FB6]/10 text-[#336FB6] rounded-full">
                              {dia}d
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">
                      {pol.prazo_entrega ? `${pol.prazo_entrega} dias` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">
                      {pol.prazo_estoque ? `${pol.prazo_estoque} dias` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(pol.valor_minimo)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">
                      {pol.peso || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">
                      {pol.desconto ? `${pol.desconto}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">
                      {pol.bonificacao ? `${pol.bonificacao}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#336FB6] max-w-[150px] truncate" title={pol.observacao || ''}>
                      {pol.observacao || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenDuplicate(pol)}
                          className="p-1.5 text-gray-400 hover:text-[#336FB6] hover:bg-[#336FB6]/10 rounded transition-colors"
                          title="Duplicar para outros fornecedores"
                        >
                          <CopyIcon />
                        </button>
                        {empresas && empresas.length > 1 && (
                          <button
                            onClick={() => handleOpenReplicateLojas(pol)}
                            className="p-1.5 text-gray-400 hover:text-[#336FB6] hover:bg-[#336FB6]/10 rounded transition-colors"
                            title="Replicar em outras lojas"
                          >
                            <BuildingIcon />
                          </button>
                        )}
                        <Link
                          href={`/cadastros/fornecedores/${pol.fornecedor_id}/editar`}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="Ver fornecedor"
                        >
                          <ExternalLinkIcon />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden divide-y divide-gray-100">
          {paginatedPoliticas.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              {searchTerm || fornecedorFilter
                ? 'Nenhuma politica encontrada com os filtros aplicados.'
                : 'Nenhuma politica de compra cadastrada.'}
            </div>
          ) : (
            paginatedPoliticas.map((pol) => (
              <div key={pol.id} className="px-4 py-4 space-y-3">
                {/* Fornecedor name */}
                <div>
                  <p className="text-sm font-bold text-gray-900">{pol.fornecedor_nome}</p>
                  {pol.fornecedor_nome_fantasia && (
                    <p className="text-xs text-gray-500">{pol.fornecedor_nome_fantasia}</p>
                  )}
                </div>

                {/* Forma de pagamento badges */}
                <div className="flex flex-wrap gap-1">
                  {pol.forma_pagamento_dias?.length > 0 ? (
                    pol.forma_pagamento_dias.map(dia => (
                      <span key={dia} className="px-2 py-0.5 text-xs font-medium bg-[#336FB6]/10 text-[#336FB6] rounded-full">
                        {dia}d
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">Sem forma de pagamento</span>
                  )}
                </div>

                {/* Key info 2-column grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Prazo entrega</p>
                    <p className="text-gray-900">{pol.prazo_entrega ? `${pol.prazo_entrega} dias` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Valor minimo</p>
                    <p className="text-gray-900 font-medium">{formatCurrency(pol.valor_minimo)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Desconto</p>
                    <p className="text-gray-900">{pol.desconto ? `${pol.desconto}%` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Bonificacao</p>
                    <p className="text-gray-900">{pol.bonificacao ? `${pol.bonificacao}%` : '-'}</p>
                  </div>
                </div>

                {/* Observacao */}
                {pol.observacao && (
                  <p className="text-xs text-[#336FB6] truncate" title={pol.observacao}>
                    {pol.observacao}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button
                    onClick={() => handleOpenDuplicate(pol)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#336FB6] bg-[#336FB6]/10 hover:bg-[#336FB6]/20 rounded-lg transition-colors"
                  >
                    <CopyIcon />
                    Duplicar
                  </button>
                  {empresas && empresas.length > 1 && (
                    <button
                      onClick={() => handleOpenReplicateLojas(pol)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#336FB6] bg-[#336FB6]/10 hover:bg-[#336FB6]/20 rounded-lg transition-colors"
                    >
                      <BuildingIcon />
                      Outras lojas
                    </button>
                  )}
                  <Link
                    href={`/cadastros/fornecedores/${pol.fornecedor_id}/editar`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <ExternalLinkIcon />
                    Ver fornecedor
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Paginacao */}
        {totalPages > 1 && (
          <div className="px-4 py-4 flex items-center justify-between border-t border-gray-100">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-[#336FB6] bg-white border border-[#336FB6] rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeftIcon />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            <div className="hidden sm:flex items-center gap-1">
              {getPageNumbers().map((pageNum, index) => (
                pageNum === '...' ? (
                  <span key={`ellipsis-${index}`} className="px-3 py-2 text-sm text-gray-500">...</span>
                ) : (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum as number)}
                    className={`w-10 h-10 text-sm font-medium rounded-lg ${
                      page === pageNum
                        ? 'bg-[#ECECEC] text-[#1D2939]'
                        : 'text-[#475467] hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              ))}
            </div>
            <span className="sm:hidden text-sm text-gray-600">
              {page} / {totalPages}
            </span>

            <button
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-[#336FB6] bg-white border border-[#336FB6] rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <span className="hidden sm:inline">Proximo</span>
              <ChevronRightIcon />
            </button>
          </div>
        )}
      </div>

      {/* Modal de Criar Nova Politica */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCreateModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Nova Politica de Compra</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XIcon />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Crie uma nova politica de compra selecionando o fornecedor
              </p>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Selecao de fornecedor */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Selecione o Fornecedor</label>
                <div className="relative mb-2">
                  <input
                    type="text"
                    value={createSearchTerm}
                    onChange={(e) => setCreateSearchTerm(e.target.value)}
                    placeholder="Buscar fornecedor..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <SearchIcon />
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg max-h-[150px] overflow-y-auto">
                  {filteredFornecedoresForCreate.length === 0 ? (
                    <div className="px-4 py-4 text-center text-gray-500 text-sm">
                      Nenhum fornecedor encontrado
                    </div>
                  ) : (
                    filteredFornecedoresForCreate.map((f) => {
                      const isSelected = createFornecedorId === f.id
                      return (
                        <button
                          key={f.id}
                          onClick={() => setCreateFornecedorId(f.id)}
                          className={`w-full px-4 py-2 text-left border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                            isSelected ? 'bg-[#336FB6]/5' : ''
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? 'bg-[#336FB6] border-[#336FB6]'
                              : 'border-gray-300'
                          }`}>
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {f.nome}
                            </p>
                            {f.nome_fantasia && (
                              <p className="text-xs text-gray-500">{f.nome_fantasia}</p>
                            )}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Selecao de lojas (multi-empresa) */}
              <EmpresaMultiSelect
                value={createEmpresaIds}
                onChange={setCreateEmpresaIds}
                label="Aplicar em quais lojas?"
                helperText="A politica sera criada em cada loja selecionada. Lojas que ja tem politica para este fornecedor serao sobrescritas apos confirmacao."
              />

              {/* Campos do formulario */}
              <PoliticaFormFields
                form={createForm}
                setForm={setCreateForm}
                novoDia={novoDiaPagamentoCreate}
                setNovoDia={setNovoDiaPagamentoCreate}
                onAddDia={handleAddDiaCreate}
                onRemoveDia={handleRemoveDiaCreate}
              />
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!createFornecedorId || creating || (empresas && empresas.length > 1 && createEmpresaIds.length === 0)}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors disabled:opacity-50"
              >
                {creating ? 'Criando...' : (empresas && empresas.length > 1 && createEmpresaIds.length > 1
                  ? `Criar em ${createEmpresaIds.length} lojas`
                  : 'Criar Politica')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Duplicar */}
      {showDuplicateModal && politicaToDuplicate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowDuplicateModal(false)
              setPoliticaToDuplicate(null)
              setSelectedFornecedores([])
            }}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Duplicar Politica de Compra</h3>
                <button
                  onClick={() => {
                    setShowDuplicateModal(false)
                    setPoliticaToDuplicate(null)
                    setSelectedFornecedores([])
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XIcon />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Edite os valores se necessario e selecione os fornecedores
              </p>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Info do fornecedor original */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Copiando politica de:</p>
                <p className="text-sm font-medium text-gray-900">
                  {politicaToDuplicate.fornecedor_nome}
                </p>
                {politicaToDuplicate.fornecedor_nome_fantasia && (
                  <p className="text-xs text-gray-500">{politicaToDuplicate.fornecedor_nome_fantasia}</p>
                )}
              </div>

              {/* Campos editaveis */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Dados da Politica (editaveis)</h4>
                <PoliticaFormFields
                  form={duplicateForm}
                  setForm={setDuplicateForm}
                  novoDia={novoDiaPagamentoDuplicate}
                  setNovoDia={setNovoDiaPagamentoDuplicate}
                  onAddDia={handleAddDiaDuplicate}
                  onRemoveDia={handleRemoveDiaDuplicate}
                />
              </div>

              {/* Selecao de fornecedores */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Selecione os Fornecedores</h4>
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={duplicateSearchTerm}
                      onChange={(e) => setDuplicateSearchTerm(e.target.value)}
                      placeholder="Buscar fornecedor..."
                      className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <SearchIcon />
                    </div>
                  </div>
                  <button
                    onClick={selectAllVisible}
                    className="px-3 py-2 text-xs font-medium text-[#336FB6] hover:bg-[#336FB6]/10 rounded-lg transition-colors"
                  >
                    Selecionar todos
                  </button>
                  {selectedFornecedores.length > 0 && (
                    <button
                      onClick={clearSelection}
                      className="px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Limpar ({selectedFornecedores.length})
                    </button>
                  )}
                </div>

                <div className="border border-gray-200 rounded-lg max-h-[200px] overflow-y-auto">
                  {filteredFornecedoresForDuplicate.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500">
                      {duplicateSearchTerm
                        ? 'Nenhum fornecedor encontrado com essa busca.'
                        : 'Nenhum fornecedor disponivel para duplicacao.'}
                    </div>
                  ) : (
                    filteredFornecedoresForDuplicate.map((f) => {
                      const isSelected = selectedFornecedores.includes(f.id)
                      return (
                        <button
                          key={f.id}
                          onClick={() => toggleFornecedorSelection(f.id)}
                          className={`w-full px-4 py-2 text-left border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                            isSelected ? 'bg-[#336FB6]/5' : ''
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? 'bg-[#336FB6] border-[#336FB6]'
                              : 'border-gray-300'
                          }`}>
                            {isSelected && <CheckIcon />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {f.nome}
                            </p>
                            {f.nome_fantasia && (
                              <p className="text-xs text-gray-500">{f.nome_fantasia}</p>
                            )}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <p className="text-sm text-gray-500 text-center sm:text-left">
                {selectedFornecedores.length} fornecedor(es) selecionado(s)
              </p>
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={() => {
                    setShowDuplicateModal(false)
                    setPoliticaToDuplicate(null)
                    setSelectedFornecedores([])
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDuplicate}
                  disabled={selectedFornecedores.length === 0 || duplicating}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors disabled:opacity-50"
                >
                  {duplicating ? 'Duplicando...' : 'Duplicar Politica'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Replicar em Outras Lojas (Sprint 3) */}
      {showReplicateLojasModal && politicaToReplicate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowReplicateLojasModal(false)
              setPoliticaToReplicate(null)
              setReplicateEmpresaIds([])
            }}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Replicar em Outras Lojas</h3>
                <button
                  onClick={() => {
                    setShowReplicateLojasModal(false)
                    setPoliticaToReplicate(null)
                    setReplicateEmpresaIds([])
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XIcon />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Aplicar esta politica do mesmo fornecedor em outras lojas da sua rede
              </p>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Info do fornecedor */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Fornecedor:</p>
                <p className="text-sm font-medium text-gray-900">
                  {politicaToReplicate.fornecedor_nome}
                </p>
                {politicaToReplicate.fornecedor_nome_fantasia && (
                  <p className="text-xs text-gray-500">{politicaToReplicate.fornecedor_nome_fantasia}</p>
                )}
              </div>

              {/* Campos editaveis */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Dados da Politica (editaveis)</h4>
                <PoliticaFormFields
                  form={replicateForm}
                  setForm={setReplicateForm}
                  novoDia={novoDiaPagamentoReplicate}
                  setNovoDia={setNovoDiaPagamentoReplicate}
                  onAddDia={handleAddDiaReplicate}
                  onRemoveDia={handleRemoveDiaReplicate}
                />
              </div>

              {/* Selecao de lojas */}
              {loadingReplicateConflicts ? (
                <div className="flex items-center justify-center py-6">
                  <svg className="animate-spin h-5 w-5 text-[#336FB6]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="ml-2 text-sm text-gray-500">Verificando lojas disponiveis...</span>
                </div>
              ) : (
                <EmpresaMultiSelect
                  value={replicateEmpresaIds}
                  onChange={setReplicateEmpresaIds}
                  label="Replicar para quais lojas?"
                  helperText="Lojas onde este fornecedor ja tem politica aparecem como 'Ja existe' e nao podem ser selecionadas."
                  disabledIds={replicateDisabledEmpresaIds}
                  disabledLabel="Ja existe"
                />
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowReplicateLojasModal(false)
                  setPoliticaToReplicate(null)
                  setReplicateEmpresaIds([])
                }}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReplicateLojas}
                disabled={replicateEmpresaIds.length === 0 || replicating}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors disabled:opacity-50"
              >
                {replicating ? 'Replicando...' : (replicateEmpresaIds.length > 0
                  ? `Replicar em ${replicateEmpresaIds.length} loja${replicateEmpresaIds.length !== 1 ? 's' : ''}`
                  : 'Replicar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
    </RequirePermission>
  )
}
