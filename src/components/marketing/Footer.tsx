import Image from 'next/image'
import { FooterSocialIcons } from './FooterSocialIcons'

/* ── Link data ── */

const productLinks = [
  { label: 'Funcionalidades', href: '#funcionalidades' },
  { label: 'Precos', href: '#precos' },
  { label: 'Integracoes', href: '#funcionalidades' },
  { label: 'Changelog', href: '#' },
] as const

const legalLinks = [
  { label: 'Termos de uso', href: '/termos-de-uso' },
  { label: 'Politica de privacidade', href: '/politica-privacidade' },
  { label: 'Contato', href: 'mailto:contato@flowb2b.com' },
] as const

/* ── Footer Column ── */

function FooterColumn({
  label,
  links,
}: {
  label: string
  links: ReadonlyArray<{ label: string; href: string }>
}) {
  return (
    <div>
      <span className="text-[11px] uppercase tracking-[0.12em] text-white/50 font-medium mb-4 block">
        {label}
      </span>
      <nav className="flex flex-col gap-2.5">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-sm text-white/60 hover:text-white transition-colors duration-200 [transition-timing-function:cubic-bezier(0.25,0.46,0.45,0.94)]"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </div>
  )
}

/* ── Main Component ── */

export function Footer() {
  return (
    <footer className="bg-[#083B7F]">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-16 grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr] gap-8">
        {/* Column 1 — Brand */}
        <div>
          <Image
            src="/assets/branding/logo-white.png"
            alt="FlowB2B"
            width={130}
            height={40}
            className="object-contain"
          />
          <p className="text-sm text-white/60 mt-4 max-w-[28ch] leading-relaxed">
            Plataforma B2B que automatiza compras com dados reais.
          </p>
          <FooterSocialIcons />
        </div>

        {/* Column 2 — Produto */}
        <FooterColumn label="Produto" links={productLinks} />

        {/* Column 3 — Legal */}
        <FooterColumn label="Legal" links={legalLinks} />
      </div>

      {/* Bottom bar */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 border-t border-white/10 mt-0 pt-6 pb-8 flex flex-col md:flex-row justify-between items-center gap-2">
        <span className="text-xs text-white/40">
          2026 FlowB2B. Todos os direitos reservados.
        </span>
        <span className="text-xs text-white/40">Feito no Brasil</span>
      </div>
    </footer>
  )
}
