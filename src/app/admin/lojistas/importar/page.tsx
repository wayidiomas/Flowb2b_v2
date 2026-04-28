'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/components/layout/AdminLayout'

interface PreviewItem {
  linha: number
  cnpj: string
  razao_social: string
  email: string
  celular: string
}
interface PreviewError {
  linha: number
  campo: string
  mensagem: string
}
interface PreviewResponse {
  success: true
  preview: true
  resumo: { total: number; validos: number; erros: number }
  validos: PreviewItem[]
  erros: PreviewError[]
}
interface ConfirmRow {
  linha: number
  cnpj: string
  status: 'criado' | 'ja_existia' | 'erro'
  mensagem?: string
}
interface ConfirmResponse {
  success: true
  preview: false
  summary: { total: number; criados: number; ja_existiam: number; erros: number; erros_planilha: number }
  results: ConfirmRow[]
}

export default function ImportarLojistasPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [resultado, setResultado] = useState<ConfirmResponse | null>(null)

  const upload = async (mode: 'preview' | 'confirm') => {
    if (!file) {
      setError('Selecione um arquivo')
      return
    }
    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('mode', mode)
      const res = await fetch('/api/admin/lojistas/importar', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro')
        return
      }
      if (mode === 'preview') {
        setPreview(data)
        setResultado(null)
      } else {
        setResultado(data)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setFile(null)
    setPreview(null)
    setResultado(null)
    setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/usuarios" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← Voltar
          </Link>
        </div>

        <div className="mb-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500 mb-2">
            Importacao em massa
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">
            Importar lojistas via Excel
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Senha gerada automaticamente: primeiros 6 digitos do CNPJ. Lojista sera obrigado a trocar no primeiro acesso.
          </p>
        </div>

        {!preview && !resultado && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">Template</p>
              <a
                href="/api/admin/lojistas/importar/template"
                className="inline-flex items-center gap-2 text-sm text-[#336FB6] hover:text-[#2660A5] underline-offset-2 hover:underline"
              >
                Baixar template de exemplo
              </a>
              <p className="text-xs text-gray-500 mt-2">
                Colunas obrigatorias: <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">cnpj</code>,{' '}
                <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">razao_social</code>,{' '}
                <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">email</code>,{' '}
                <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">celular</code>.
                Opcionais: <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">nome_fantasia</code>,{' '}
                <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">nome_admin</code>.
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">Upload</p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#336FB6]/10 file:text-[#336FB6] hover:file:bg-[#336FB6]/20"
              />
              {file && (
                <p className="text-xs text-gray-500 mt-2">
                  Arquivo: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => upload('preview')}
                disabled={!file || loading}
                className="inline-flex items-center gap-2 rounded-full bg-[#336FB6] hover:bg-[#2660A5] text-white text-sm font-medium px-5 py-2.5 transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Analisando...' : 'Analisar planilha'}
              </button>
            </div>
          </div>
        )}

        {preview && !resultado && (
          <div className="space-y-5">
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Preview</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{preview.resumo.validos}</p>
                  <p className="text-xs text-emerald-700">Validos</p>
                </div>
                <div className="bg-rose-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-rose-700">{preview.resumo.erros}</p>
                  <p className="text-xs text-rose-700">Erros</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-700">{preview.resumo.total}</p>
                  <p className="text-xs text-gray-700">Total</p>
                </div>
              </div>

              {preview.erros.length > 0 && (
                <details className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3" open>
                  <summary className="text-sm font-medium text-rose-900 cursor-pointer">
                    {preview.erros.length} linha(s) com erro
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs text-rose-700">
                    {preview.erros.map((e, i) => (
                      <li key={i}>
                        <strong>Linha {e.linha}</strong> · {e.campo}: {e.mensagem}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {preview.validos.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">
                    Lojistas validos ({preview.validos.length})
                  </p>
                  <div className="border border-gray-200 rounded-lg max-h-72 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-700">CNPJ</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-700">Razao</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-700">Email</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-700">Celular</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.validos.map((v, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-3 py-2 font-mono text-xs">{v.cnpj}</td>
                            <td className="px-3 py-2 text-xs">{v.razao_social}</td>
                            <td className="px-3 py-2 text-xs text-gray-600">{v.email}</td>
                            <td className="px-3 py-2 font-mono text-xs">{v.celular}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={reset}
                className="rounded-full border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium px-5 py-2.5"
              >
                Cancelar
              </button>
              <button
                onClick={() => upload('confirm')}
                disabled={loading || preview.resumo.validos === 0}
                className="rounded-full bg-[#336FB6] hover:bg-[#2660A5] text-white text-sm font-medium px-5 py-2.5 disabled:opacity-50"
              >
                {loading ? 'Importando...' : `Importar ${preview.resumo.validos} lojista(s)`}
              </button>
            </div>
          </div>
        )}

        {resultado && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Resultado da importacao</h2>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{resultado.summary.criados}</p>
                <p className="text-xs text-emerald-700">Criados</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{resultado.summary.ja_existiam}</p>
                <p className="text-xs text-amber-700">Ja existiam</p>
              </div>
              <div className="bg-rose-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-rose-700">{resultado.summary.erros}</p>
                <p className="text-xs text-rose-700">Erros</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-700">{resultado.summary.total}</p>
                <p className="text-xs text-gray-700">Total</p>
              </div>
            </div>

            <button
              onClick={reset}
              className="rounded-full bg-[#336FB6] hover:bg-[#2660A5] text-white text-sm font-medium px-5 py-2.5"
            >
              Importar outro arquivo
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
