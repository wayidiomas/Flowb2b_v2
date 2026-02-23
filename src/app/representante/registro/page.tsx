'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function RegistroRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const codigo = searchParams.get('codigo')

  useEffect(() => {
    if (codigo) {
      // Redirecionar para a nova pagina de convite
      router.replace(`/representante/convite/${codigo}`)
    } else {
      // Sem codigo, redirecionar para login
      router.replace('/representante/login')
    }
  }, [codigo, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
        <p className="text-sm text-white/90 font-medium">Redirecionando...</p>
      </div>
    </div>
  )
}

export default function RepresentanteRegistroPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
            <p className="text-sm text-white/90 font-medium">Carregando...</p>
          </div>
        </div>
      }
    >
      <RegistroRedirect />
    </Suspense>
  )
}
