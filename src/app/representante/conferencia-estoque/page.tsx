'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useRepresentanteAuth } from '@/contexts/RepresentanteAuthContext'
import { RepresentanteLayout } from '@/components/layout/RepresentanteLayout'
import { Button, Skeleton, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui'
import type { ConferenciaEstoque, ConferenciaStatus } from '@/types/conferencia-estoque'

const statusColors: Record<ConferenciaStatus, string> = {
  em_andamento: 'bg-blue-100 text-blue-700',
  enviada: 'bg-amber-100 text-amber-700',
  aceita: 'bg-emerald-100 text-emerald-700',
  rejeitada: 'bg-red-100 text-red-700',
  parcialmente_aceita: 'bg-orange-100 text-orange-700',
}

const statusLabels: Record<ConferenciaStatus, string> = {
  em_andamento: 'Em andamento',
  enviada: 'Enviada',
  aceita: 'Aceita',
  rejeitada: 'Rejeitada',
  parcialmente_aceita: 'Parcial',
}

const statusFilters = [
  { value: '', label: 'Todos' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'aceita', label: 'Aceita' },
  { value: 'rejeitada', label: 'Rejeitada' },
]

export default function RepresentanteConferenciaEstoquePage() {
  const { loading: authLoading, user, fornecedoresVinculados } = useRepresentanteAuth()
  const router = useRouter()
  const [conferencias, setConferencias] = useState<ConferenciaEstoque[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showNovaModal, setShowNovaModal] = useState(false)
  const [fornecedorIdNovo, setFornecedorIdNovo] = useState<number | null>(null)
  const [empresaIdNovo, setEmpresaIdNovo] = useState<number | null>(null)
  const [step, setStep] = useState<'lojista' | 'fornecedor'>('lojista')

  const fetchConferencias = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/representante/conferencia-estoque?${params}`)
      if (res.ok) {
        const data = await res.json()
        setConferencias(data.conferencias || [])
      }
    } catch (err) {
      console.error('Erro ao carregar conferencias:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    if (!authLoading && user) fetchConferencias()
  }, [fetchConferencias, authLoading, user])

  // Lojistas unicos (o representante seleciona primeiro o lojista)
  const lojistasUnicos = useMemo(() => {
    const map = new Map<number, string>()
    fornecedoresVinculados.forEach((f) => {
      if (!map.has(f.empresa_id)) {
        map.set(f.empresa_id, f.empresa_nome)
      }
    })
    return Array.from(map, ([id, nome]) => ({ empresa_id: id, empresa_nome: nome }))
  }, [fornecedoresVinculados])

  // Fornecedores vinculados ao lojista selecionado
  const fornecedoresDoLojista = useMemo(() => {
    if (!empresaIdNovo) return []
    const map = new Map<number, string>()
    fornecedoresVinculados
      .filter((f) => f.empresa_id === empresaIdNovo)
      .forEach((f) => {
        if (!map.has(f.fornecedor_id)) {
          map.set(f.fornecedor_id, f.fornecedor_nome)
        }
      })
    return Array.from(map, ([id, nome]) => ({ fornecedor_id: id, fornecedor_nome: nome }))
  }, [fornecedoresVinculados, empresaIdNovo])

  const handleNovaConferencia = () => {
    setFornecedorIdNovo(null)
    setEmpresaIdNovo(null)
    setStep('lojista')
    if (lojistasUnicos.length === 1) {
      // Se so tem um lojista, selecionar automaticamente
      handleSelecionarLojista(lojistasUnicos[0].empresa_id)
    } else {
      setShowNovaModal(true)
    }
  }

  const handleSelecionarLojista = (empresaId: number) => {
    setEmpresaIdNovo(empresaId)
    setFornecedorIdNovo(null)
    // Pegar fornecedores para este lojista
    const fornecedores = fornecedoresVinculados
      .filter((f) => f.empresa_id === empresaId)
    // Deduplicate by fornecedor_id
    const uniqueFornecedores = new Map<number, string>()
    fornecedores.forEach((f) => uniqueFornecedores.set(f.fornecedor_id, f.fornecedor_nome))
    if (uniqueFornecedores.size === 1) {
      // Se so tem um fornecedor nessa loja, pular direto
      const [fId] = uniqueFornecedores.keys()
      setFornecedorIdNovo(fId)
      // Se veio de 1 lojista unico, ir direto sem modal
      if (lojistasUnicos.length === 1) {
        router.push(`/representante/conferencia-estoque/nova?empresa_id=${empresaId}&fornecedor_id=${fId}`)
        return
      }
      setStep('fornecedor')
    } else {
      setStep('fornecedor')
      setShowNovaModal(true)
    }
  }

  const handleConfirmarNova = () => {
    if (empresaIdNovo && fornecedorIdNovo) {
      router.push(`/representante/conferencia-estoque/nova?empresa_id=${empresaIdNovo}&fornecedor_id=${fornecedorIdNovo}`)
    }
  }

  if (authLoading) {
    return (
      <RepresentanteLayout>
        <Skeleton className="h-96" />
      </RepresentanteLayout>
    )
  }

  return (
    <RepresentanteLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Conferencia de Estoque</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gerencie as conferencias de estoque realizadas nos lojistas
            </p>
          </div>
          <Button
            onClick={handleNovaConferencia}
            className="bg-[#336FB6] hover:bg-[#2660a5] text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nova Conferencia
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                statusFilter === filter.value
                  ? 'bg-[#336FB6] text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-[#336FB6]/10 hover:text-[#336FB6] border border-gray-200 hover:border-[#336FB6]/30'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : conferencias.length > 0 ? (
            <>
              {/* Desktop: tabela */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-[#336FB6]/5">
                      <th className="px-6 py-4">#</th>
                      <th className="px-6 py-4">Fornecedor</th>
                      <th className="px-6 py-4">Lojista</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Data Inicio</th>
                      <th className="px-6 py-4">Data Envio</th>
                      <th className="px-6 py-4 text-right">Itens</th>
                      <th className="px-6 py-4 text-right">Divergencias</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {conferencias.map((conf) => (
                      <tr key={conf.id} className="hover:bg-[#336FB6]/5 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">#{conf.id}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 font-medium">{conf.fornecedor_nome || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 font-medium">{conf.empresa_nome || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusColors[conf.status] || 'bg-gray-100 text-gray-700'}`}>
                            {statusLabels[conf.status] || conf.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(conf.data_inicio).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {conf.data_envio ? new Date(conf.data_envio).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900 font-semibold">{conf.total_itens}</td>
                        <td className="px-6 py-4 text-sm text-right">
                          <span className={conf.total_divergencias > 0 ? 'text-amber-600 font-semibold' : 'text-gray-500'}>
                            {conf.total_divergencias}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Link href={`/representante/conferencia-estoque/${conf.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-[#FFAA11] text-[#FFAA11] hover:bg-[#FFAA11] hover:text-white"
                            >
                              {conf.status === 'em_andamento' ? 'Continuar' : 'Ver detalhes'}
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {conferencias.map((conf) => (
                  <Link
                    key={conf.id}
                    href={`/representante/conferencia-estoque/${conf.id}`}
                    className="block p-4 hover:bg-[#336FB6]/5 active:bg-[#336FB6]/10 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-bold text-gray-900">#{conf.id}</span>
                        <p className="text-sm text-gray-600 mt-0.5 truncate">{conf.fornecedor_nome || '-'}</p>
                        <p className="text-xs text-gray-400 truncate">{conf.empresa_nome || '-'}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${statusColors[conf.status] || 'bg-gray-100 text-gray-700'}`}>
                        {statusLabels[conf.status] || conf.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-2.5">
                      <div>
                        <p className="text-[10px] uppercase text-gray-400 font-medium">Inicio</p>
                        <p className="text-xs text-gray-600">{new Date(conf.data_inicio).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-gray-400 font-medium">Itens</p>
                        <p className="text-xs font-semibold text-gray-900">{conf.total_itens}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase text-gray-400 font-medium">Diverg.</p>
                        <p className={`text-xs font-semibold ${conf.total_divergencias > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                          {conf.total_divergencias}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#336FB6]/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-[#336FB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">Nenhuma conferencia encontrada.</p>
              <p className="text-sm text-gray-400 mt-1">Clique em &quot;Nova Conferencia&quot; para iniciar.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal para selecionar lojista e fornecedor */}
      <Modal isOpen={showNovaModal} onClose={() => setShowNovaModal(false)} size="sm">
        <ModalHeader onClose={() => setShowNovaModal(false)}>
          <ModalTitle>
            {step === 'lojista' ? 'Selecionar Lojista' : 'Selecionar Fornecedor'}
          </ModalTitle>
        </ModalHeader>
        <ModalBody>
          {step === 'lojista' ? (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Em qual lojista sera realizada a conferencia?
              </p>
              <div className="space-y-2">
                {lojistasUnicos.map((l) => (
                  <button
                    key={l.empresa_id}
                    onClick={() => handleSelecionarLojista(l.empresa_id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all ${
                      empresaIdNovo === l.empresa_id
                        ? 'border-[#336FB6] bg-[#336FB6]/5 text-[#336FB6] font-medium'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#336FB6]/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-[#336FB6]">
                        {l.empresa_nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span>{l.empresa_nome}</span>
                    {empresaIdNovo === l.empresa_id && (
                      <svg className="w-4 h-4 ml-auto text-[#336FB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Qual fornecedor voce representa nesta conferencia?
              </p>
              <div className="space-y-2">
                {fornecedoresDoLojista.map((f) => (
                  <button
                    key={f.fornecedor_id}
                    onClick={() => setFornecedorIdNovo(f.fornecedor_id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all ${
                      fornecedorIdNovo === f.fornecedor_id
                        ? 'border-[#336FB6] bg-[#336FB6]/5 text-[#336FB6] font-medium'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#336FB6]/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-[#336FB6]">
                        {f.fornecedor_nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span>{f.fornecedor_nome}</span>
                    {fornecedorIdNovo === f.fornecedor_id && (
                      <svg className="w-4 h-4 ml-auto text-[#336FB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          {step === 'fornecedor' && (
            <Button variant="outline" onClick={() => { setStep('lojista'); setFornecedorIdNovo(null) }}>Voltar</Button>
          )}
          <Button variant="outline" onClick={() => setShowNovaModal(false)}>Cancelar</Button>
          {step === 'fornecedor' && (
            <Button
              onClick={handleConfirmarNova}
              disabled={!empresaIdNovo || !fornecedorIdNovo}
              className="bg-[#336FB6] hover:bg-[#2660a5] text-white"
            >
              Iniciar Conferencia
            </Button>
          )}
        </ModalFooter>
      </Modal>
    </RepresentanteLayout>
  )
}
