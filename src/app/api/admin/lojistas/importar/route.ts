import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser, hashPassword } from '@/lib/auth'
import { defaultPasswordFromCnpj } from '@/lib/cnpj'
import { parseLojistasImport, type LojistasImportResult } from '@/lib/lojistas-import'

/**
 * POST /api/admin/lojistas/importar
 * multipart form com arquivo XLSX/CSV.
 * Modes: 'preview' (so valida) | 'confirm' (cria de fato).
 *
 * Cria empresa + user com role='admin' (lojista admin normal, nao
 * lojista_lp) usando a mesma RPC do vinculo invertido mas com
 * fornecedor placeholder. Senha = primeiros 6 digitos do CNPJ.
 */

interface RowResult {
  linha: number
  cnpj: string
  status: 'criado' | 'ja_existia' | 'erro'
  empresa_id?: number
  user_id?: string
  mensagem?: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Apenas superadmin pode importar lojistas' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const mode = (formData.get('mode') as string) || 'preview'

    if (!file) {
      return NextResponse.json({ error: 'Arquivo obrigatorio' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed: LojistasImportResult = parseLojistasImport(buffer)

    if (parsed.validos.length === 0 && parsed.erros.length === 0) {
      return NextResponse.json({ error: 'Planilha vazia ou formato invalido' }, { status: 400 })
    }

    if (mode === 'preview') {
      return NextResponse.json({
        success: true,
        preview: true,
        resumo: {
          total: parsed.validos.length + parsed.erros.length,
          validos: parsed.validos.length,
          erros: parsed.erros.length,
        },
        validos: parsed.validos,
        erros: parsed.erros,
      })
    }

    // CONFIRM mode: cria de fato
    const supabase = createServerSupabaseClient()
    const results: RowResult[] = []

    for (const row of parsed.validos) {
      try {
        // Verifica empresa existente
        const { data: empresaExistente } = await supabase
          .from('empresas')
          .select('id')
          .eq('cnpj', row.cnpj)
          .limit(1)
          .maybeSingle()

        // Verifica user existente
        const { data: userExistente } = await supabase
          .from('users')
          .select('id, empresa_id')
          .eq('email', row.email)
          .limit(1)
          .maybeSingle()

        const senhaProvisoria = defaultPasswordFromCnpj(row.cnpj)
        const passwordHash = await hashPassword(senhaProvisoria)

        let empresaId: number
        let userId: string
        let jaExistia = false

        if (empresaExistente) {
          empresaId = empresaExistente.id
          jaExistia = true
        } else {
          const { data: novaEmp, error: empErr } = await supabase
            .from('empresas')
            .insert({
              cnpj: row.cnpj,
              razao_social: row.razao_social,
              nome_fantasia: row.nome_fantasia || null,
              celular_principal: row.celular,
              ativo: true,
              origem_cadastro: 'admin',
              created_date: new Date().toISOString(),
              modified_date: new Date().toISOString(),
            })
            .select('id')
            .single()
          if (empErr || !novaEmp) {
            results.push({ linha: row.linha, cnpj: row.cnpj, status: 'erro', mensagem: empErr?.message })
            continue
          }
          empresaId = novaEmp.id
        }

        if (userExistente) {
          userId = userExistente.id
          jaExistia = true
        } else {
          const { data: novoUser, error: userErr } = await supabase
            .from('users')
            .insert({
              id: crypto.randomUUID(),
              email: row.email,
              password_hash: passwordHash,
              nome: row.nome_admin || row.razao_social,
              telefone: row.celular,
              empresa_id: empresaId,
              role: 'user',
              ativo: true,
              senha_provisoria: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select('id')
            .single()
          if (userErr || !novoUser) {
            results.push({ linha: row.linha, cnpj: row.cnpj, status: 'erro', mensagem: userErr?.message })
            continue
          }
          userId = novoUser.id
        }

        // Vinculo users_empresas
        await supabase
          .from('users_empresas')
          .upsert({
            user_id: userId,
            empresa_id: empresaId,
            role: 'admin',
            ativo: true,
          }, { onConflict: 'user_id,empresa_id' })

        results.push({
          linha: row.linha,
          cnpj: row.cnpj,
          status: jaExistia ? 'ja_existia' : 'criado',
          empresa_id: empresaId,
          user_id: userId,
        })
      } catch (err) {
        results.push({
          linha: row.linha,
          cnpj: row.cnpj,
          status: 'erro',
          mensagem: err instanceof Error ? err.message : 'Erro desconhecido',
        })
      }
    }

    const summary = {
      total: parsed.validos.length,
      criados: results.filter(r => r.status === 'criado').length,
      ja_existiam: results.filter(r => r.status === 'ja_existia').length,
      erros: results.filter(r => r.status === 'erro').length,
      erros_planilha: parsed.erros.length,
    }

    return NextResponse.json({
      success: true,
      preview: false,
      summary,
      results,
      erros_planilha: parsed.erros,
    })
  } catch (error) {
    console.error('Erro em POST /api/admin/lojistas/importar:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
