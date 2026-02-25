'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { TableSkeleton } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { RepresentanteSelectModal } from '@/components/representante/RepresentanteSelectModal'
import type { RepresentanteComDetalhes } from '@/types/representante'

// Icons
function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
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

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
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

interface Fornecedor {
  id: number
  nome: string
  cnpj?: string
}

export default function RepresentantesPage() {
  const { user, empresa } = useAuth()
  const [representantes, setRepresentantes] = useState<RepresentanteComDetalhes[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [phoneModalRep, setPhoneModalRep] = useState<RepresentanteComDetalhes | null>(null)
  const [phoneInput, setPhoneInput] = useState('')
  const [savingPhone, setSavingPhone] = useState(false)
  const itemsPerPage = 10

  const fetchRepresentantes = async () => {
    try {
      const response = await fetch('/api/representantes')
      const data = await response.json()

      if (data.success) {
        setRepresentantes(data.representantes)
      }
    } catch (err) {
      console.error('Erro ao buscar representantes:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchFornecedores = async () => {
    try {
      const response = await fetch('/api/fornecedores')

      if (!response.ok) {
        console.error('Erro ao buscar fornecedores:', response.status)
        return
      }

      const data = await response.json()

      if (data.fornecedores) {
        setFornecedores(data.fornecedores.map((f: { id: number; nome: string; cnpj?: string }) => ({
          id: f.id,
          nome: f.nome,
          cnpj: f.cnpj,
        })))
      }
    } catch (err) {
      console.error('Erro ao buscar fornecedores:', err)
    }
  }

  useEffect(() => {
    if (user?.id) {
      fetchRepresentantes()
      fetchFornecedores()
    }
  }, [user?.id, user?.empresa_id, empresa?.id])

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  // Formatar telefone para link do WhatsApp
  const formatPhoneForWhatsApp = (phone: string | undefined | null): string | null => {
    if (!phone) return null
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('55')) {
      return cleaned
    }
    return '55' + cleaned
  }

  // Abrir WhatsApp com a mensagem
  const openWhatsAppWithMessage = (rep: RepresentanteComDetalhes, phone: string) => {
    const baseUrl = window.location.origin
    const conviteUrl = `${baseUrl}/representante/convite/${rep.codigo_acesso}`
    const empresaNome = empresa?.nome_fantasia || empresa?.razao_social || 'nossa empresa'

    const message = encodeURIComponent(
      `Ola ${rep.nome}! 👋\n\n` +
      `Voce foi cadastrado como representante comercial da *${empresaNome}* na plataforma FlowB2B.\n\n` +
      `🔗 Clique no link abaixo para criar sua conta e acessar o portal:\n${conviteUrl}\n\n` +
      `Qualquer duvida, estamos a disposicao!`
    )
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
  }

  // Enviar codigo de acesso via WhatsApp
  const handleWhatsApp = (rep: RepresentanteComDetalhes) => {
    const phone = formatPhoneForWhatsApp(rep.telefone)
    if (!phone) {
      // Abrir modal para cadastrar telefone
      setPhoneModalRep(rep)
      setPhoneInput('')
      return
    }
    openWhatsAppWithMessage(rep, phone)
  }

  // Salvar telefone e enviar WhatsApp
  const handleSavePhoneAndSend = async () => {
    if (!phoneModalRep || !phoneInput.trim()) return

    setSavingPhone(true)
    try {
      const response = await fetch(`/api/representantes/${phoneModalRep.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: phoneInput.trim() }),
      })

      const result = await response.json()

      if (result.success) {
        // Atualizar lista local
        setRepresentantes(prev => prev.map(r =>
          r.id === phoneModalRep.id ? { ...r, telefone: phoneInput.trim() } : r
        ))

        // Enviar WhatsApp
        const phone = formatPhoneForWhatsApp(phoneInput.trim())
        if (phone) {
          openWhatsAppWithMessage({ ...phoneModalRep, telefone: phoneInput.trim() }, phone)
        }

        setPhoneModalRep(null)
        setPhoneInput('')
      } else {
        alert(result.error || 'Erro ao salvar telefone')
      }
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao salvar telefone')
    } finally {
      setSavingPhone(false)
    }
  }

  const handleCreateRepresentante = async (data: { nome: string; telefone: string; fornecedor_ids: number[] }) => {
    try {
      const response = await fetch('/api/representantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        setShowModal(false)
        fetchRepresentantes()
      } else {
        alert(result.error || 'Erro ao criar representante')
      }
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao criar representante')
    }
  }

  // Filtrar representantes
  const filteredRepresentantes = representantes.filter((rep) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      rep.nome?.toLowerCase().includes(searchLower) ||
      rep.codigo_acesso?.toLowerCase().includes(searchLower) ||
      rep.telefone?.includes(searchTerm)
    )
  })

  // Paginacao
  const totalPages = Math.ceil(filteredRepresentantes.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedRepresentantes = filteredRepresentantes.slice(startIndex, startIndex + itemsPerPage)

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

  return (
    <DashboardLayout>
      <PageHeader
        title="Representantes"
        subtitle={`${filteredRepresentantes.length} representantes`}
      />

      {/* Card Container */}
      <div className="bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] overflow-hidden">
        {/* Card Header */}
        <div className="bg-[#FBFBFB] border border-[#EDEDED] rounded-[20px] px-5 py-[18px]">
          <div className="flex items-end justify-between gap-2 mb-4">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-base font-medium text-[#344054]">Representantes Comerciais</h2>
              <p className="text-xs text-[#838383]">
                Gerencie seus representantes comerciais e os fornecedores vinculados a cada um
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-[13px] font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg shadow-xs transition-colors"
              >
                <PlusIcon />
                Novo representante
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-[360px]">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#898989]">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Pesquisar por nome ou codigo..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="block w-full pl-10 pr-4 py-2.5 text-[13px] text-gray-900 placeholder:text-[#C9C9C9] bg-white border border-[#D0D5DD] rounded-[14px] shadow-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#EFEFEF]">
                <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">
                  Nome
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">
                  Codigo de Acesso
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[#344054]">
                  Telefone
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-[#344054]">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-[#344054]">
                  Fornecedores
                </th>
                <th className="px-4 py-3 w-16">
                  <span className="sr-only">Acoes</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton columns={5} rows={5} showActions />
              ) : paginatedRepresentantes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? (
                      <p>Nenhum representante encontrado para a busca.</p>
                    ) : (
                      <div>
                        <p>Nenhum representante cadastrado.</p>
                        <button
                          onClick={() => setShowModal(true)}
                          className="mt-2 inline-block text-sm text-[#336FB6] hover:underline"
                        >
                          Adicionar primeiro representante
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedRepresentantes.map((rep, index) => (
                  <tr
                    key={rep.id}
                    className={`border-b border-[#EFEFEF] hover:bg-gray-50 ${
                      index % 2 === 1 ? 'bg-[#F9F9F9]' : 'bg-white'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-[13px] font-medium text-[#344054]">
                          {rep.nome}
                        </span>
                        {rep.email && (
                          <p className="text-[12px] text-[#64748b]">{rep.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-[#f1f5f9] rounded text-[13px] font-mono text-[#336FB6]">
                          {rep.codigo_acesso}
                        </code>
                        <button
                          onClick={() => handleCopyCode(rep.codigo_acesso)}
                          className="p-1 text-[#64748b] hover:text-[#336FB6] transition-colors"
                          title="Copiar codigo"
                        >
                          {copiedCode === rep.codigo_acesso ? (
                            <CheckIcon />
                          ) : (
                            <CopyIcon />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-[#344054]">
                        {rep.telefone || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full ${
                        rep.cadastrado
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {rep.cadastrado ? 'Cadastrado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[13px] text-[#344054]">
                        {rep.fornecedores_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleWhatsApp(rep)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            rep.telefone
                              ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={rep.telefone ? 'Enviar codigo via WhatsApp' : 'Cadastrar telefone e enviar via WhatsApp'}
                        >
                          <WhatsAppIcon />
                        </button>
                        <Link
                          href={`/cadastros/representantes/${rep.id}`}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors inline-block"
                          title="Ver detalhes"
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

        {/* Pagination */}
        {!loading && filteredRepresentantes.length > 0 && (
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

      {/* Modal Criar Representante */}
      <RepresentanteSelectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelectExistente={() => {}}
        onCreateNovo={handleCreateRepresentante}
        representantes={representantes.map(r => ({
          id: r.id,
          nome: r.nome,
          telefone: r.telefone,
          codigo_acesso: r.codigo_acesso,
          cadastrado: r.cadastrado,
          fornecedores_count: r.fornecedores_count || 0,
        }))}
        fornecedores={fornecedores}
      />

      {/* Modal Cadastrar Telefone */}
      {phoneModalRep && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setPhoneModalRep(null)} />

            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                    <WhatsAppIcon />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">
                      Cadastrar telefone
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        O representante <strong>{phoneModalRep.nome}</strong> nao possui telefone cadastrado. Informe o numero para enviar o codigo de acesso via WhatsApp.
                      </p>
                    </div>
                    <div className="mt-4">
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Telefone (com DDD)
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6"
                        autoFocus
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
                <button
                  type="button"
                  onClick={handleSavePhoneAndSend}
                  disabled={!phoneInput.trim() || savingPhone}
                  className="inline-flex w-full justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingPhone ? 'Salvando...' : 'Salvar e Enviar'}
                </button>
                <button
                  type="button"
                  onClick={() => setPhoneModalRep(null)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
