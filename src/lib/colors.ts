/**
 * Paleta da plataforma FlowB2B.
 * Usado como default em landing pages e fallback em componentes.
 */

export const FLOWB2B_BLUE = '#336FB6'
export const FLOWB2B_BLUE_DARK = '#2660A5'
export const FLOWB2B_ORANGE = '#FFAA11'
export const FLOWB2B_ORANGE_DARK = '#E89500'

export interface ColorPreset {
  label: string
  value: string
  swatch: string // bg pra mostrar no picker
}

export const LP_COLOR_PRESETS: ColorPreset[] = [
  { label: 'Azul FlowB2B', value: FLOWB2B_BLUE, swatch: FLOWB2B_BLUE },
  { label: 'Laranja FlowB2B', value: FLOWB2B_ORANGE, swatch: FLOWB2B_ORANGE },
  { label: 'Verde', value: '#3F7D3F', swatch: '#3F7D3F' },
  { label: 'Bordeaux', value: '#7A2330', swatch: '#7A2330' },
  { label: 'Charcoal', value: '#1F150C', swatch: '#1F150C' },
]

/**
 * Resolve a cor accent efetiva da LP: usa cor_marca se setada,
 * senao retorna o azul FlowB2B padrao.
 */
export function resolveLpAccent(corMarca: string | null | undefined): string {
  if (corMarca && /^#[0-9A-Fa-f]{6}$/.test(corMarca)) return corMarca
  return FLOWB2B_BLUE
}
