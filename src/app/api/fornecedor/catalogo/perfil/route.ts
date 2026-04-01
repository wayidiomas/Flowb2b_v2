import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

function cleanCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.tipo !== 'fornecedor' || !user.cnpj) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const cnpjLimpo = cleanCnpj(user.cnpj)
    const body = await request.json()

    // Buscar catalogo existente
    const { data: catalogo, error: catError } = await supabase
      .from('catalogo_fornecedor')
      .select('id')
      .eq('cnpj', cnpjLimpo)
      .single()

    if (catError || !catalogo) {
      return NextResponse.json({ error: 'Catalogo nao encontrado' }, { status: 404 })
    }

    // Montar campos para atualizar
    const updateFields: Record<string, unknown> = {}

    if (body.nome !== undefined) {
      if (typeof body.nome !== 'string' || body.nome.trim().length === 0) {
        return NextResponse.json({ error: 'nome deve ser uma string nao vazia' }, { status: 400 })
      }
      updateFields.nome = body.nome.trim()
    }

    if (body.slug !== undefined) {
      if (body.slug === null || body.slug === '') {
        updateFields.slug = null
      } else {
        const slug = String(body.slug).toLowerCase().trim()
        if (!SLUG_REGEX.test(slug)) {
          return NextResponse.json(
            { error: 'slug invalido: use apenas letras minusculas, numeros e hifens (ex: minha-loja-pet)' },
            { status: 400 }
          )
        }
        if (slug.length < 3 || slug.length > 60) {
          return NextResponse.json(
            { error: 'slug deve ter entre 3 e 60 caracteres' },
            { status: 400 }
          )
        }

        // Verificar unicidade do slug
        const { data: existing } = await supabase
          .from('catalogo_fornecedor')
          .select('id')
          .eq('slug', slug)
          .neq('id', catalogo.id)
          .limit(1)
          .maybeSingle()

        if (existing) {
          return NextResponse.json(
            { error: 'Este slug ja esta em uso. Escolha outro.' },
            { status: 409 }
          )
        }
        updateFields.slug = slug
      }
    }

    if (body.logo_url !== undefined) {
      updateFields.logo_url = body.logo_url || null
    }

    if (body.banner_url !== undefined) {
      updateFields.banner_url = body.banner_url || null
    }

    if (body.cor_primaria !== undefined) {
      if (body.cor_primaria === null || body.cor_primaria === '') {
        updateFields.cor_primaria = null
      } else {
        if (!HEX_COLOR_REGEX.test(body.cor_primaria)) {
          return NextResponse.json(
            { error: 'cor_primaria deve estar no formato hexadecimal (#XXXXXX)' },
            { status: 400 }
          )
        }
        updateFields.cor_primaria = body.cor_primaria
      }
    }

    if (body.descricao !== undefined) {
      updateFields.descricao = body.descricao || null
    }

    if (body.whatsapp !== undefined) {
      updateFields.whatsapp = body.whatsapp || null
    }

    if (body.publico !== undefined) {
      if (typeof body.publico !== 'boolean') {
        return NextResponse.json({ error: 'publico deve ser boolean' }, { status: 400 })
      }
      updateFields.publico = body.publico
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    updateFields.updated_at = new Date().toISOString()

    const { data: updated, error: updateError } = await supabase
      .from('catalogo_fornecedor')
      .update(updateFields)
      .eq('id', catalogo.id)
      .select('id, cnpj, nome, status, created_at, updated_at, slug, logo_url, banner_url, cor_primaria, descricao, whatsapp, publico')
      .single()

    if (updateError) {
      console.error('Erro ao atualizar perfil do catalogo:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 })
    }

    return NextResponse.json({ catalogo: updated })
  } catch (error) {
    console.error('Erro ao atualizar perfil do catalogo:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
