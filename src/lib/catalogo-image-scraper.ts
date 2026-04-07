import { createServerSupabaseClient } from '@/lib/supabase'

const SCRAPER_API = process.env.VALIDACAO_EAN_URL || 'https://validacao-ean-cwrd.onrender.com'

interface ScrapingResult {
  success: boolean
  ean: string
  image_url: string | null
  source: string | null
  titulo: string | null
  confiavel: boolean
  error: string | null
}

/**
 * Busca imagem de um produto por EAN nos 6 sites (via Python API).
 * Se encontrar, faz download e upload para Supabase Storage.
 * Retorna a URL do Storage ou null.
 */
export async function buscarESalvarImagemProduto(
  ean: string,
  nome: string,
  catalogoId: number,
  catalogoItemId: number,
): Promise<{ imagem_url: string | null; source: string | null }> {
  try {
    // 1. Chamar API Python para buscar imagem
    const res = await fetch(`${SCRAPER_API}/scraper/buscar_imagem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ean, nome }),
    })

    if (!res.ok) return { imagem_url: null, source: null }

    const data: ScrapingResult = await res.json()
    if (!data.success || !data.image_url) return { imagem_url: null, source: null }

    // 2. Download da imagem
    const imgRes = await fetch(data.image_url)
    if (!imgRes.ok) return { imagem_url: null, source: null }

    const imgBuffer = Buffer.from(await imgRes.arrayBuffer())

    // Validar tamanho mínimo (> 5KB = imagem real, não placeholder)
    if (imgBuffer.length < 5000) return { imagem_url: null, source: null }

    // Determinar extensão
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'

    // 3. Upload para Supabase Storage
    const supabase = createServerSupabaseClient()
    const storagePath = `${catalogoId}/${ean}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('catalogo-imagens')
      .upload(storagePath, imgBuffer, {
        contentType,
        upsert: true,
      })

    if (uploadError) {
      console.error('Erro upload imagem:', uploadError)
      return { imagem_url: null, source: null }
    }

    // 4. Gerar URL pública
    const { data: publicUrl } = supabase.storage
      .from('catalogo-imagens')
      .getPublicUrl(storagePath)

    const imagem_url = publicUrl?.publicUrl || null

    // 5. Atualizar catalogo_itens.imagem_url
    if (imagem_url) {
      await supabase
        .from('catalogo_itens')
        .update({ imagem_url })
        .eq('id', catalogoItemId)
    }

    return { imagem_url, source: data.source }
  } catch (err) {
    console.error('Erro buscar imagem produto:', err)
    return { imagem_url: null, source: null }
  }
}

/**
 * Processa imagens para múltiplos produtos em sequência.
 * Chamado após importação de catálogo (Sprint 1) para produtos sem imagem.
 */
export async function processarImagensCatalogo(
  catalogoId: number,
  onProgress?: (atual: number, total: number, comImagem: number) => void,
): Promise<{ total: number; com_imagem: number }> {
  const supabase = createServerSupabaseClient()

  // Buscar itens sem imagem que tem EAN
  const { data: itensSemImagem } = await supabase
    .from('catalogo_itens')
    .select('id, ean, nome, codigo')
    .eq('catalogo_id', catalogoId)
    .eq('ativo', true)
    .is('imagem_url', null)
    .not('ean', 'is', null)

  if (!itensSemImagem || itensSemImagem.length === 0) {
    return { total: 0, com_imagem: 0 }
  }

  let comImagem = 0

  for (let i = 0; i < itensSemImagem.length; i++) {
    const item = itensSemImagem[i]
    const resultado = await buscarESalvarImagemProduto(
      item.ean!,
      item.nome || item.codigo || '',
      catalogoId,
      item.id,
    )

    if (resultado.imagem_url) comImagem++
    onProgress?.(i + 1, itensSemImagem.length, comImagem)
  }

  return { total: itensSemImagem.length, com_imagem: comImagem }
}
