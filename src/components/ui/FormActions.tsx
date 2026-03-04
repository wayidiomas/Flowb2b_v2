import { ReactNode } from 'react'

interface FormActionsProps {
  children: ReactNode
  className?: string
}

/**
 * Barra de acoes para formularios.
 * No mobile: sticky no bottom da tela com borda e sombra.
 * No desktop: inline no fluxo normal do formulario.
 */
export function FormActions({ children, className = '' }: FormActionsProps) {
  return (
    <div
      className={`
        flex items-center gap-3
        sticky bottom-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] p-4 -mx-4 mt-6
        md:static md:border-t-0 md:shadow-none md:p-0 md:mx-0 md:mt-6 md:justify-end
        ${className}
      `}
    >
      {children}
    </div>
  )
}
