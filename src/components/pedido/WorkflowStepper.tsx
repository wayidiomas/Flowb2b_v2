'use client'

import type { StatusInterno } from '@/types/pedido-compra'

interface WorkflowStep {
  label: string
  description: string
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  { label: 'Rascunho', description: 'Pedido criado' },
  { label: 'Enviado', description: 'Aguardando fornecedor' },
  { label: 'Concluido', description: 'Pedido finalizado' },
]

function getStepIndex(status: StatusInterno): number {
  switch (status) {
    case 'rascunho': return 0
    case 'enviado_fornecedor': return 1
    case 'sugestao_pendente': return 1 // Ainda aguardando — mesma posição que enviado
    case 'aceito': return 2
    case 'finalizado': return 2
    case 'rejeitado': return 1 // Devolvido = volta pra enviado
    default: return 0
  }
}

function getStepDescription(status: StatusInterno): string {
  switch (status) {
    case 'rascunho': return 'Pedido em rascunho'
    case 'enviado_fornecedor': return 'Aguardando resposta do fornecedor'
    case 'sugestao_pendente': return 'Sugestao recebida — analisar'
    case 'aceito': return 'Pedido aceito, em andamento'
    case 'finalizado': return 'Pedido concluido'
    case 'rejeitado': return 'Devolvido ao fornecedor'
    default: return ''
  }
}

interface WorkflowStepperProps {
  statusInterno: StatusInterno
  className?: string
}

export function WorkflowStepper({ statusInterno, className = '' }: WorkflowStepperProps) {
  const currentIndex = getStepIndex(statusInterno)
  const isRejected = statusInterno === 'rejeitado'
  const isSugestaoPendente = statusInterno === 'sugestao_pendente'
  const description = getStepDescription(statusInterno)

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      {/* Steps */}
      <div className="px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          {WORKFLOW_STEPS.map((step, index) => {
            const isCompleted = index < currentIndex
            const isCurrent = index === currentIndex

            return (
              <div key={step.label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                      ${isCompleted ? 'bg-emerald-500 text-white' : ''}
                      ${isCurrent && !isRejected ? 'bg-[#336FB6] text-white ring-4 ring-[#336FB6]/10' : ''}
                      ${isCurrent && isRejected ? 'bg-red-500 text-white ring-4 ring-red-100' : ''}
                      ${!isCompleted && !isCurrent ? 'bg-gray-100 text-gray-400' : ''}
                    `}
                  >
                    {isCompleted ? (
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={`
                      mt-1.5 text-xs font-medium text-center
                      ${isCompleted ? 'text-emerald-600' : ''}
                      ${isCurrent && !isRejected ? 'text-[#336FB6]' : ''}
                      ${isCurrent && isRejected ? 'text-red-600' : ''}
                      ${!isCompleted && !isCurrent ? 'text-gray-400' : ''}
                    `}
                  >
                    {isCurrent && isRejected ? 'Devolvido' : step.label}
                  </span>
                </div>

                {index < WORKFLOW_STEPS.length - 1 && (
                  <div className="flex-1 mx-3 h-px bg-gray-200 relative overflow-hidden">
                    <div
                      className={`
                        absolute inset-y-0 left-0 transition-all duration-500
                        ${isCompleted ? 'bg-emerald-500 w-full' : ''}
                        ${isCurrent ? 'bg-[#336FB6] w-1/2' : ''}
                        ${!isCompleted && !isCurrent ? 'w-0' : ''}
                      `}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Status description bar */}
      {description && (
        <div className={`px-4 sm:px-6 py-2.5 text-sm border-t ${
          isSugestaoPendente ? 'bg-amber-50 border-amber-100 text-amber-800' :
          isRejected ? 'bg-red-50 border-red-100 text-red-700' :
          currentIndex === 2 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
          'bg-gray-50 border-gray-100 text-gray-600'
        }`}>
          <div className="flex items-center gap-2">
            {isSugestaoPendente && (
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            )}
            {isRejected && (
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            )}
            <span className="font-medium">{description}</span>
          </div>
        </div>
      )}
    </div>
  )
}
