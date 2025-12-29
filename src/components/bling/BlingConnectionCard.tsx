'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'

interface BlingStatus {
  connected: boolean
  expiresAt?: string
  updatedAt?: string
  isExpired?: boolean
  message?: string
  error?: string
}

interface BlingConnectionCardProps {
  onConnect?: () => void
}

export function BlingConnectionCard({ onConnect }: BlingConnectionCardProps) {
  const [status, setStatus] = useState<BlingStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/auth/bling/status')
      const data = await res.json()
      setStatus(data)
    } catch (error) {
      setStatus({ connected: false, error: 'Erro ao verificar status' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = () => {
    if (onConnect) {
      onConnect()
    } else {
      window.location.href = '/api/auth/bling/connect'
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-xl border border-gray-200 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-lg" />
          <div className="flex-1">
            <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-48" />
          </div>
        </div>
      </div>
    )
  }

  const isConnected = status?.connected && !status?.isExpired

  return (
    <div
      className={`
        p-6 rounded-xl border transition-colors
        ${isConnected
          ? 'bg-success-500/5 border-success-500/20'
          : 'bg-gray-50 border-gray-200'
        }
      `}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Bling Icon */}
          <div
            className={`
              flex items-center justify-center w-12 h-12 rounded-xl
              ${isConnected ? 'bg-success-500/10' : 'bg-gray-200'}
            `}
          >
            <svg
              className={`w-7 h-7 ${isConnected ? 'text-success-600' : 'text-gray-400'}`}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <rect x="3" y="5" width="7" height="4" rx="1" />
              <rect x="3" y="11" width="7" height="8" rx="1" />
              <rect x="12" y="5" width="9" height="4" rx="1" />
              <rect x="12" y="11" width="9" height="8" rx="1" />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">Bling ERP</h3>
              <span
                className={`
                  inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                  ${isConnected
                    ? 'bg-success-500/10 text-success-700'
                    : 'bg-gray-200 text-gray-600'
                  }
                `}
              >
                {isConnected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>

            {isConnected ? (
              <div className="mt-1 text-sm text-gray-500">
                <p>Última atualização: {formatDate(status?.updatedAt)}</p>
                <p>Expira em: {formatDate(status?.expiresAt)}</p>
              </div>
            ) : (
              <p className="mt-1 text-sm text-gray-500">
                {status?.isExpired
                  ? 'Token expirado. Reconecte para continuar sincronizando.'
                  : 'Conecte para sincronizar produtos, pedidos e estoque.'}
              </p>
            )}
          </div>
        </div>

        <Button
          variant={isConnected ? 'outline' : 'primary'}
          size="md"
          onClick={handleConnect}
        >
          {isConnected ? 'Reconectar' : 'Conectar'}
        </Button>
      </div>

      {status?.isExpired && (
        <div className="mt-4 p-3 rounded-lg bg-warning-500/10 border border-warning-500/20">
          <div className="flex items-center gap-2 text-warning-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-medium">
              Token expirado - A sincronização está pausada
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
