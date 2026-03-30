'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { ButtonPrimary } from '@/components/marketing'

const NAV_LINKS = [
  { label: 'Funcionalidades', href: '#funcionalidades' },
  { label: 'Precos', href: '#precos' },
  { label: 'Fornecedores', href: '/fornecedores' },
  { label: 'FAQ', href: '#faq' },
] as const

const SCROLL_THRESHOLD = 100

const EASE_SCROLL = [0.32, 0.72, 0, 1] as const

function smoothScrollTo(hash: string) {
  const el = document.querySelector(hash)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > SCROLL_THRESHOLD)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (href.startsWith('#')) {
        e.preventDefault()
        smoothScrollTo(href)
      }
      // Close mobile menu for all links (anchors and page navigations)
      setMenuOpen(false)
    },
    [],
  )

  return (
    <>
      {/* Fixed container */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        {/* Floating pill */}
        <nav
          className={[
            'mt-5 mx-auto w-max rounded-full px-2 py-2 pointer-events-auto',
            'transition-all duration-500',
            'ring-1',
            scrolled
              ? 'bg-[#2660A5]/95 backdrop-blur-2xl ring-white/10 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.15)]'
              : 'bg-white/15 backdrop-blur-2xl ring-white/[0.15] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)]',
          ].join(' ')}
          style={{
            transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          {/* Desktop layout */}
          <div className="hidden md:flex items-center gap-1">
            {/* Logo */}
            <div className="pl-3 pr-4">
              <Image
                src="/assets/branding/logo-white.png"
                alt="FlowB2B"
                width={110}
                height={34}
                className={`object-contain transition-all duration-500 `}
                style={{ transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
                priority
              />
            </div>

            {/* Separator */}
            <div
              className={[
                'w-px h-5 transition-colors duration-500',
                scrolled ? 'bg-white/15' : 'bg-white/[0.1]',
              ].join(' ')}
              style={{ transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
            />

            {/* Nav links */}
            <div className="flex items-center gap-1 px-2">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.href}
                  href={link.href}
                  scrolled={scrolled}
                  onClick={(e) => handleNavClick(e, link.href)}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>

            {/* Separator */}
            <div
              className={[
                'w-px h-5 transition-colors duration-500',
                scrolled ? 'bg-white/15' : 'bg-white/[0.1]',
              ].join(' ')}
              style={{ transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
            />

            {/* Right side: Entrar + CTA */}
            <div className="flex items-center gap-2 pl-2">
              <Link
                href="/login"
                className={[
                  'text-sm font-medium px-3 py-1.5 rounded-full transition-colors duration-300',
                  scrolled
                    ? 'text-white/80 hover:text-white'
                    : 'text-white/80 hover:text-white',
                ].join(' ')}
                style={{ transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
              >
                Entrar
              </Link>
              <ButtonPrimary href="/register" size="md">
                Testar gratis
              </ButtonPrimary>
            </div>
          </div>

          {/* Mobile layout */}
          <div className="flex md:hidden items-center gap-2">
            {/* Logo */}
            <div className="pl-2">
              <Image
                src="/assets/branding/logo-white.png"
                alt="FlowB2B"
                width={90}
                height={28}
                className={`object-contain transition-all duration-500 `}
                style={{ transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
                priority
              />
            </div>

            {/* CTA small */}
            <ButtonPrimary href="/register" size="md">
              Testar gratis
            </ButtonPrimary>

            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="relative w-10 h-10 flex items-center justify-center rounded-full"
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={menuOpen}
            >
              <div className="w-5 h-4 relative flex flex-col justify-between">
                <span
                  className={[
                    'block w-full h-[1.5px] rounded-full transition-all duration-300',
                    'origin-center',
                    scrolled ? 'bg-white' : 'bg-white',
                    menuOpen ? 'translate-y-[7px] rotate-45' : 'translate-y-0 rotate-0',
                  ].join(' ')}
                  style={{
                    transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  }}
                />
                <span
                  className={[
                    'block w-full h-[1.5px] rounded-full transition-all duration-300',
                    'origin-center',
                    scrolled ? 'bg-white' : 'bg-white',
                    menuOpen ? '-translate-y-[7px] -rotate-45' : 'translate-y-0 rotate-0',
                  ].join(' ')}
                  style={{
                    transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  }}
                />
              </div>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 bg-white/95 backdrop-blur-3xl z-40 flex flex-col md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: [0.32, 0.72, 0, 1],
            }}
          >
            {/* Spacer for navbar */}
            <div className="h-24" />

            {/* Links */}
            <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.08,
                    ease: EASE_SCROLL,
                  }}
                >
                  <a
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className="text-2xl font-semibold text-[var(--text-primary)] tracking-[-0.02em]"
                    style={{ fontFamily: 'var(--font-satoshi), sans-serif' }}
                  >
                    {link.label}
                  </a>
                </motion.div>
              ))}

              {/* Entrar link in overlay */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{
                  duration: 0.5,
                  delay: NAV_LINKS.length * 0.08,
                  ease: EASE_SCROLL,
                }}
              >
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="text-lg font-medium text-[var(--text-secondary)]"
                >
                  Entrar
                </Link>
              </motion.div>
            </div>

            {/* CTA at bottom */}
            <motion.div
              className="px-6 pb-10"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{
                duration: 0.5,
                delay: (NAV_LINKS.length + 1) * 0.08,
                ease: EASE_SCROLL,
              }}
            >
              <ButtonPrimary
                href="/register"
                size="lg"
                fullWidth
              >
                Testar gratis
              </ButtonPrimary>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ───────────────────────────── NavLink ───────────────────────────── */

function NavLink({
  href,
  scrolled,
  onClick,
  children,
}: {
  href: string
  scrolled: boolean
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={[
        'group relative text-sm font-medium px-3 py-1.5 rounded-full transition-colors duration-300',
        scrolled
          ? 'text-white/70 hover:text-white'
          : 'text-white/60 hover:text-white',
      ].join(' ')}
      style={{ transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
    >
      {children}
      {/* Hover underline */}
      <span
        className={[
          'absolute bottom-0.5 left-3 right-3 h-px origin-left',
          'scale-x-0 group-hover:scale-x-100',
          'transition-transform duration-300',
          scrolled ? 'bg-white' : 'bg-white',
        ].join(' ')}
        style={{ transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
      />
    </a>
  )
}
