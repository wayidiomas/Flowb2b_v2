'use client'

// Nota: o seletor de empresa que antes vivia aqui foi movido para o MainHeader
// (chip ao lado da logo, visivel em todas as paginas do lojista).
// Este componente passa a ser apenas titulo + subtitulo da pagina.

interface PageHeaderProps {
  title: string
  subtitle?: string
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  const today = new Date()
  const formattedDate = today.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="mb-6">
      <h1 className="text-lg font-medium text-gray-900">{title}</h1>
      <p className="text-xs text-gray-500">{subtitle || formattedDate}</p>
    </div>
  )
}
