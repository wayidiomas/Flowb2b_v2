/**
 * Helpers pra construir URLs do WhatsApp Web/App.
 */

import { toE164BR } from '@/lib/cnpj'

const SUPORTE_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '5511968220056'

/**
 * Constroi link wa.me com texto pre-preenchido.
 * Aceita celular com ou sem mascara, com ou sem +55. Nao falha se vazio.
 */
export function buildWhatsappUrl(celular: string | null | undefined, mensagem: string): string {
  const numero = (celular || '').replace(/\D/g, '')
  // Se vazio, retorna apenas wa.me sem numero (abre app)
  if (!numero) {
    return `https://wa.me/?text=${encodeURIComponent(mensagem)}`
  }
  // Garante prefixo 55 se nao tem
  const e164 = numero.startsWith('55') ? numero : `55${numero}`
  return `https://wa.me/${e164}?text=${encodeURIComponent(mensagem)}`
}

export function buildLpShareWhatsappUrl(params: {
  celular: string | null | undefined
  fornecedorNome: string
  lojistaNome?: string | null
  appUrl: string // ex: https://flowb2b-v2.onrender.com
  slug: string
}): string {
  const { celular, fornecedorNome, lojistaNome, appUrl, slug } = params
  const link = `${appUrl}/lp/${slug}`
  const saudacao = lojistaNome ? `Ola ${lojistaNome}` : 'Ola'
  const msg = `${saudacao}, aqui e ${fornecedorNome}. Preparei um catalogo personalizado pra voce, da uma olhada e me chama qualquer duvida:\n\n${link}`
  return buildWhatsappUrl(celular, msg)
}

export function buildSuporteWhatsappUrl(contexto?: string): string {
  const numero = SUPORTE_WHATSAPP
  const baseMsg = 'Ola, preciso de ajuda no FlowB2B'
  const msg = contexto ? `${baseMsg} (${contexto})` : baseMsg
  return `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`
}

export { toE164BR }
