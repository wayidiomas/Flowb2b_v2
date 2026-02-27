'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { DashboardLayout, PageHeader } from '@/components/layout'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { RequirePermission } from '@/components/auth/RequirePermission'

// Numero de WhatsApp para contratacao de planos
const WHATSAPP_CONTRATACAO = '5511999999999' // TODO: Substituir pelo numero real

interface Plano {
  id: number
  nome: string
  descricao: string
  preco_mensal: number
  preco_empresa_adicional: number
  max_usuarios: number
  max_empresas: number
  recursos: string[]
}

interface Assinatura {
  id: number
  user_id: string
  plano_id: number
  status: 'ativo' | 'cancelado' | 'pendente' | 'expirado'
  data_inicio: string
  data_fim: string | null
  data_proximo_pagamento: string | null
  empresas_adicionais: number
  valor_total: number
  plano?: Plano
}

// Icons
function BuildingIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    </svg>
  )
}

function CreditCardIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  )
}

function XCircleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function EyeSlashIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

type TabType = 'dados-empresa' | 'alterar-senha' | 'pagamentos' | 'cancelamento'

interface MenuItem {
  id: TabType
  label: string
  icon: React.ReactNode
  section: 'conta' | 'pagamento'
}

const menuItems: MenuItem[] = [
  { id: 'dados-empresa', label: 'Dados da empresa', icon: <BuildingIcon />, section: 'conta' },
  { id: 'alterar-senha', label: 'Alterar senha', icon: <KeyIcon />, section: 'conta' },
  { id: 'pagamentos', label: 'Pagamentos', icon: <CreditCardIcon />, section: 'pagamento' },
  { id: 'cancelamento', label: 'Cancelamento de conta', icon: <XCircleIcon />, section: 'pagamento' },
]

// Componente de Dados da Empresa
function DadosEmpresa() {
  const { empresa } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Dados da Empresa</h2>
        <p className="text-sm text-gray-500">Informacoes cadastrais da sua empresa</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Razao Social */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Razao Social
            </label>
            <input
              type="text"
              defaultValue={empresa?.razao_social || ''}
              className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
            />
          </div>

          {/* Nome Fantasia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Fantasia
            </label>
            <input
              type="text"
              defaultValue={empresa?.nome_fantasia || ''}
              className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
            />
          </div>

          {/* CNPJ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CNPJ
            </label>
            <input
              type="text"
              defaultValue={empresa?.cnpj || ''}
              disabled
              className="block w-full px-3 py-2 text-sm text-gray-500 bg-gray-50 border border-gray-300 rounded-lg cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">O CNPJ nao pode ser alterado</p>
          </div>
        </div>

        {/* Botao Salvar */}
        <div className="pt-4 border-t border-gray-200">
          <button className="px-6 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors">
            Salvar alteracoes
          </button>
        </div>
      </div>
    </div>
  )
}

// Componente de Alterar Senha
function AlterarSenha() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Alterar Senha</h2>
        <p className="text-sm text-gray-500">Atualize sua senha de acesso</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6 max-w-md">
        {/* Senha Atual */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Senha atual
          </label>
          <div className="relative">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Digite sua senha atual"
              className="block w-full px-3 py-2 pr-10 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              {showCurrentPassword ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {/* Nova Senha */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nova senha
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Digite a nova senha"
              className="block w-full px-3 py-2 pr-10 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              {showNewPassword ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            A senha deve ter pelo menos 8 caracteres
          </p>
        </div>

        {/* Confirmar Nova Senha */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirmar nova senha
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirme a nova senha"
              className="block w-full px-3 py-2 pr-10 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336FB6] focus:border-[#336FB6]"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {/* Botao Salvar */}
        <div className="pt-4 border-t border-gray-200">
          <button
            disabled={!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            className="px-6 py-2 text-sm font-medium text-white bg-[#336FB6] hover:bg-[#2660A5] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Alterar senha
          </button>
        </div>
      </div>
    </div>
  )
}

// Icone do WhatsApp
function WhatsAppIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

// Componente de Pagamentos
function Pagamentos() {
  const { user } = useAuth()
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null)
  const [planoDisponivel, setPlanoDisponivel] = useState<Plano | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantidadeEmpresas, setQuantidadeEmpresas] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }

      try {
        // Buscar assinatura do usuario
        const { data: assinaturaData, error: assinaturaError } = await supabase
          .from('assinaturas')
          .select(`
            *,
            plano:planos(*)
          `)
          .eq('user_id', user.id)
          .eq('status', 'ativo')
          .single()

        if (assinaturaError && assinaturaError.code !== 'PGRST116') {
          console.error('Erro ao buscar assinatura:', assinaturaError)
        }

        if (assinaturaData) {
          setAssinatura(assinaturaData)
        } else {
          // Buscar plano disponivel para exibir na tela de contratacao
          const { data: planoData } = await supabase
            .from('planos')
            .select('*')
            .eq('ativo', true)
            .limit(1)
            .single()

          if (planoData) {
            setPlanoDisponivel(planoData)
          }
        }

        // Buscar quantidade de empresas do usuario
        const { count } = await supabase
          .from('users_empresas')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        setQuantidadeEmpresas(count || 0)

      } catch (err) {
        console.error('Erro:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.id])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const calcularValorTotal = (plano: Plano, empresasAdicionais: number) => {
    return plano.preco_mensal + (empresasAdicionais * plano.preco_empresa_adicional)
  }

  const handleWhatsAppClick = () => {
    const mensagem = encodeURIComponent(
      `Ola! Gostaria de contratar o plano FlowB2B.\n\nPlano: Profissional\nValor: R$ 129,90/mes\nEmpresas adicionais: R$ 59,00 cada`
    )
    window.open(`https://wa.me/${WHATSAPP_CONTRATACAO}?text=${mensagem}`, '_blank')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="h-48 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  // Se nao tem assinatura, mostrar tela para contratar
  if (!assinatura) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Meu Plano</h2>
          <p className="text-sm text-gray-500">Contrate um plano para acessar todas as funcionalidades</p>
        </div>

        {/* Card de Contratacao com Branding */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#2293f9] to-[#0a489d] rounded-xl p-8 text-white">
          {/* Decoracao de fundo */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            {/* Logo FlowB2B */}
            <div className="mb-6">
              <Image
                src="/assets/branding/logo-white.png"
                alt="FlowB2B"
                width={140}
                height={44}
                className="object-contain"
              />
            </div>

            <h3 className="text-2xl font-bold mb-3">Voce ainda nao possui um plano ativo</h3>
            <p className="text-white/80 mb-6 max-w-lg">
              Entre em contato conosco via WhatsApp para contratar seu plano e ter acesso completo a todas as funcionalidades do FlowB2B.
            </p>

            <button
              onClick={handleWhatsAppClick}
              className="inline-flex items-center gap-3 px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            >
              <WhatsAppIcon />
              Contratar via WhatsApp
            </button>

            {/* Informacao adicional */}
            <p className="mt-4 text-sm text-white/60">
              Atendimento de segunda a sexta, das 9h as 18h
            </p>
          </div>
        </div>

        {/* Detalhes do Plano */}
        {planoDisponivel && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2293f9] to-[#0a489d] flex items-center justify-center text-white">
                <CreditCardIcon />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Plano Disponivel</h3>
                <p className="text-xs text-gray-500">Tudo que voce precisa para sua empresa</p>
              </div>
            </div>

            <div className="border-2 border-[#2293f9] rounded-xl p-6 bg-gradient-to-br from-[#2293f9]/5 to-transparent">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xl font-bold text-gray-900">{planoDisponivel.nome}</h4>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-[#2293f9] to-[#0a489d] text-white">
                  Recomendado
                </span>
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold text-gray-900">
                  {formatCurrency(planoDisponivel.preco_mensal)}
                </span>
                <span className="text-sm text-gray-500">/mes</span>
              </div>

              <p className="text-sm text-[#2293f9] font-medium mb-6">
                + {formatCurrency(planoDisponivel.preco_empresa_adicional)} por empresa adicional
              </p>

              <ul className="space-y-3 mb-6">
                {(planoDisponivel.recursos as string[]).map((recurso, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm text-gray-700">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    {recurso}
                  </li>
                ))}
              </ul>

              <div className="pt-4 border-t border-gray-200 bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-xl">
                <p className="text-sm text-gray-600">
                  <strong className="text-gray-900">Exemplo de valor:</strong>
                </p>
                <div className="mt-2 flex items-center gap-4 text-sm">
                  <span className="px-3 py-1 bg-white rounded-lg border border-gray-200">
                    1 empresa = <strong>{formatCurrency(planoDisponivel.preco_mensal)}</strong>/mes
                  </span>
                  <span className="px-3 py-1 bg-white rounded-lg border border-gray-200">
                    3 empresas = <strong>{formatCurrency(calcularValorTotal(planoDisponivel, 2))}</strong>/mes
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Informacoes de Contato */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#2293f9]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#2293f9]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">Duvidas?</h3>
              <p className="text-sm text-gray-600 mb-3">
                Entre em contato conosco pelo WhatsApp para esclarecer suas duvidas sobre planos,
                funcionalidades e formas de pagamento.
              </p>
              <button
                onClick={handleWhatsAppClick}
                className="inline-flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
              >
                <WhatsAppIcon />
                Falar com nossa equipe
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Se tem assinatura, mostrar detalhes do plano
  const plano = assinatura.plano
  const valorTotal = assinatura.valor_total || (plano ? calcularValorTotal(plano, assinatura.empresas_adicionais) : 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Meu Plano</h2>
        <p className="text-sm text-gray-500">Gerencie sua assinatura</p>
      </div>

      {/* Plano Atual */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Plano {plano?.nome || 'Profissional'}</h3>
            <p className="text-sm text-gray-500">Sua assinatura atual</p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            assinatura.status === 'ativo'
              ? 'bg-green-100 text-green-800'
              : assinatura.status === 'pendente'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
          }`}>
            {assinatura.status === 'ativo' ? 'Ativo' :
             assinatura.status === 'pendente' ? 'Pendente' : 'Inativo'}
          </span>
        </div>

        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-3xl font-bold text-gray-900">{formatCurrency(valorTotal)}</span>
          <span className="text-sm text-gray-500">/mes</span>
        </div>

        {assinatura.empresas_adicionais > 0 && (
          <p className="text-sm text-gray-500 mb-4">
            Plano base ({formatCurrency(plano?.preco_mensal || 129.90)}) +
            {assinatura.empresas_adicionais} empresa(s) adicional(is) ({formatCurrency((plano?.preco_empresa_adicional || 59) * assinatura.empresas_adicionais)})
          </p>
        )}

        <ul className="space-y-2 mb-6">
          {plano?.recursos?.map((recurso: string, index: number) => (
            <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {recurso}
            </li>
          ))}
          <li className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {quantidadeEmpresas} empresa(s) vinculada(s)
          </li>
        </ul>

        <div className="flex items-center gap-3">
          <button
            onClick={handleWhatsAppClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#336FB6] border border-[#336FB6] hover:bg-[#336FB6] hover:text-white rounded-lg transition-colors"
          >
            <WhatsAppIcon />
            Alterar plano
          </button>
        </div>
      </div>

      {/* Informacoes da Assinatura */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Detalhes da Assinatura</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Data de inicio</p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(assinatura.data_inicio).toLocaleDateString('pt-BR')}
            </p>
          </div>
          {assinatura.data_proximo_pagamento && (
            <div>
              <p className="text-sm text-gray-500">Proximo pagamento</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(assinatura.data_proximo_pagamento).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">Empresas adicionais</p>
            <p className="text-sm font-medium text-gray-900">
              {assinatura.empresas_adicionais} (+{formatCurrency((plano?.preco_empresa_adicional || 59) * assinatura.empresas_adicionais)}/mes)
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Valor total mensal</p>
            <p className="text-sm font-medium text-gray-900">{formatCurrency(valorTotal)}</p>
          </div>
        </div>
      </div>

      {/* Suporte */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Precisa de ajuda?</h3>
        <p className="text-sm text-gray-600 mb-4">
          Para adicionar empresas, alterar seu plano ou esclarecer duvidas sobre cobrancas,
          entre em contato conosco pelo WhatsApp.
        </p>
        <button
          onClick={handleWhatsAppClick}
          className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-700"
        >
          <WhatsAppIcon />
          Falar com suporte
        </button>
      </div>
    </div>
  )
}

// Componente de Cancelamento
function Cancelamento() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Cancelamento de Conta</h2>
        <p className="text-sm text-gray-500">Cancele sua assinatura e conta</p>
      </div>

      <div className="bg-white rounded-lg border border-red-200 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <XCircleIcon />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Cancelar assinatura</h3>
            <p className="text-sm text-gray-600 mb-4">
              Ao cancelar sua assinatura, voce perdera acesso a todas as funcionalidades do plano atual.
              Seus dados serao mantidos por 30 dias apos o cancelamento.
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Atencao:</strong> Esta acao nao pode ser desfeita. Apos o cancelamento, voce precisara
                criar uma nova assinatura para recuperar o acesso.
              </p>
            </div>

            <button className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">
              Cancelar minha assinatura
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dados-empresa')

  const renderContent = () => {
    switch (activeTab) {
      case 'dados-empresa':
        return <DadosEmpresa />
      case 'alterar-senha':
        return <AlterarSenha />
      case 'pagamentos':
        return <Pagamentos />
      case 'cancelamento':
        return <Cancelamento />
      default:
        return <DadosEmpresa />
    }
  }

  const contaItems = menuItems.filter((item) => item.section === 'conta')
  const pagamentoItems = menuItems.filter((item) => item.section === 'pagamento')

  return (
    <RequirePermission permission="configuracoes">
    <DashboardLayout>
      <PageHeader title="Configuracoes" />

      <div className="flex gap-6 2xl:gap-8">
        {/* Sidebar */}
        <div className="w-64 2xl:w-72 shrink-0">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Secao Minha Conta */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Minha conta
              </h3>
            </div>
            <div className="py-2">
              {contaItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                    activeTab === item.id
                      ? 'bg-[#336FB6]/10 text-[#336FB6] font-medium border-r-2 border-[#336FB6]'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={activeTab === item.id ? 'text-[#336FB6]' : 'text-gray-400'}>
                      {item.icon}
                    </span>
                    {item.label}
                  </div>
                  <ChevronRightIcon />
                </button>
              ))}
            </div>

            {/* Secao Pagamento */}
            <div className="p-4 border-t border-b border-gray-200">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Pagamento
              </h3>
            </div>
            <div className="py-2">
              {pagamentoItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                    activeTab === item.id
                      ? 'bg-[#336FB6]/10 text-[#336FB6] font-medium border-r-2 border-[#336FB6]'
                      : item.id === 'cancelamento'
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={
                      activeTab === item.id
                        ? 'text-[#336FB6]'
                        : item.id === 'cancelamento'
                          ? 'text-red-400'
                          : 'text-gray-400'
                    }>
                      {item.icon}
                    </span>
                    {item.label}
                  </div>
                  <ChevronRightIcon />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>
    </DashboardLayout>
    </RequirePermission>
  )
}
