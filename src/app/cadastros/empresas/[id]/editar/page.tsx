'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { EmpresaForm, EmpresaFormData } from '@/components/empresas/EmpresaForm'
import { supabase } from '@/lib/supabase'

export default function EditarEmpresaPage() {
  const params = useParams()
  const empresaId = params.id as string
  const [empresa, setEmpresa] = useState<Partial<EmpresaFormData> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEmpresa() {
      if (!empresaId) return

      try {
        const { data, error: fetchError } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', parseInt(empresaId))
          .single()

        if (fetchError) throw fetchError

        if (data) {
          setEmpresa({
            id: data.id,
            razao_social: data.razao_social || '',
            nome_fantasia: data.nome_fantasia || '',
            cnpj: data.cnpj || '',
            inscricao_estadual: data.inscricao_estadual || '',
            ie_isento: data.ie_isento || false,
            inscricao_municipal: data.inscricao_municipal || '',
            lista_cnae: data.lista_cnae || [],
            email_cobranca: data.email_cobranca || '',
            atividade_principal: data.atividade_principal || '',
            cd_regime_tributario: data.cd_regime_tributario || '',
            segmento: data.segmento || [],
            tamanho_empresa: data.tamanho_empresa || '',
            ramo_atuacao: data.ramo_atuacao || '',
            relacao_venda: data.relacao_venda || [],
            faturamento_ano_pass: data.faturamento_text || '',
            qnt_funcionarios: data.qnt_funcionarios || '',
            observacao: data.observacao || '',
            contato: data.contato || '',
            logotipo: data.logotipo || '',
          })
        }
      } catch (err) {
        console.error('Erro ao buscar empresa:', err)
        setError('Erro ao carregar dados da empresa')
      } finally {
        setLoading(false)
      }
    }

    fetchEmpresa()
  }, [empresaId])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="ml-3 text-gray-600">Carregando...</span>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !empresa) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Empresa nao encontrada'}</p>
          <Link href="/cadastros/empresas" className="text-primary-600 hover:underline">
            Voltar para lista de empresas
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <div className="mb-6">
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/cadastros/empresas" className="text-gray-500 hover:text-gray-700">
            Minhas empresas
          </Link>
          <span className="text-gray-400">&gt;</span>
          <span className="font-medium text-gray-900">Editar Empresa</span>
        </nav>
      </div>

      <EmpresaForm initialData={empresa} isEditing />
    </DashboardLayout>
  )
}
