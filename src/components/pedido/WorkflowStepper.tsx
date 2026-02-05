'use client'

import type { StatusInterno } from '@/types/pedido-compra'

interface WorkflowStep {
  key: StatusInterno | 'finalizado_aceito' | 'finalizado_rejeitado'
  label: string
  description?: string
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  { key: 'rascunho', label: 'Rascunho', description: 'Pedido criado' },
  { key: 'enviado_fornecedor', label: 'Enviado', description: 'Aguardando fornecedor' },
  { key: 'sugestao_pendente', label: 'Negociacao', description: 'Analisar sugestao' },
  { key: 'aceito', label: 'Aceito', description: 'Sugestao aprovada' },
  { key: 'finalizado', label: 'Finalizado', description: 'Pedido concluido' },
]

// Mapeia status para indice no stepper
function getStepIndex(status: StatusInterno): number {
  switch (status) {
    case 'rascunho': return 0
    case 'enviado_fornecedor': return 1
    case 'sugestao_pendente': return 2
    case 'aceito': return 3
    case 'rejeitado': return 2 // Volta para negociacao
    case 'finalizado': return 4
    default: return 0
  }
}

interface WorkflowStepperProps {
  statusInterno: StatusInterno
  className?: string
}

export function WorkflowStepper({ statusInterno, className = '' }: WorkflowStepperProps) {
  const currentIndex = getStepIndex(statusInterno)
  const isRejected = statusInterno === 'rejeitado'

  return (
    <div className={`bg-white rounded-xl border border-gray-200 px-6 py-4 border-l-4 border-l-amber-400 ${className}`}>
      <div className="flex items-center justify-between">
        {WORKFLOW_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const isPending = index > currentIndex

          // Cor especial para rejeitado no passo de negociacao
          const isRejectedStep = isRejected && index === 2

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                    transition-all duration-300
                    ${isCompleted ? 'bg-green-500 text-white' : ''}
                    ${isCurrent && !isRejectedStep ? 'bg-primary-600 text-white ring-4 ring-primary-100' : ''}
                    ${isRejectedStep ? 'bg-red-500 text-white ring-4 ring-red-100' : ''}
                    ${isPending ? 'bg-gray-100 text-gray-400' : ''}
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isRejectedStep ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`
                    mt-2 text-xs font-medium text-center
                    ${isCompleted ? 'text-green-600' : ''}
                    ${isCurrent && !isRejectedStep ? 'text-primary-600' : ''}
                    ${isRejectedStep ? 'text-red-600' : ''}
                    ${isPending ? 'text-gray-400' : ''}
                  `}
                >
                  {isRejectedStep ? 'Rejeitado' : step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < WORKFLOW_STEPS.length - 1 && (
                <div className="flex-1 mx-3 h-1 rounded-full bg-gray-200 relative overflow-hidden">
                  <div
                    className={`
                      absolute inset-y-0 left-0 rounded-full transition-all duration-500
                      ${isCompleted ? 'bg-green-500 w-full' : ''}
                      ${isCurrent ? 'bg-primary-600 w-1/2' : ''}
                      ${isPending ? 'w-0' : ''}
                    `}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
