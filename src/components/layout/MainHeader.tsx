'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions, Permissoes } from '@/hooks/usePermissions'

// Icone de seta para baixo
function ChevronDownIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

// Icone de sino (notificacoes)
function BellIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  )
}

// Icone de engrenagem (configuracoes)
function SettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

interface NavChildItem {
  label: string
  href: string
  permission?: keyof Permissoes
  comingSoon?: boolean
}

interface NavItem {
  label: string
  href: string
  permission?: keyof Permissoes
  children?: NavChildItem[]
}

const navigation: NavItem[] = [
  { label: 'Dashboard', href: '/' },
  {
    label: 'Cadastros',
    href: '/cadastros',
    permission: 'cadastros',
    children: [
      { label: 'Cadastro de funcionarios', href: '/cadastros/colaboradores', permission: 'cadastros' },
      { label: 'Cadastro de fornecedores', href: '/cadastros/fornecedores', permission: 'cadastros' },
      { label: 'Cadastro de produtos', href: '/cadastros/produtos', permission: 'cadastros' },
      { label: 'Minhas empresas', href: '/cadastros/empresas', permission: 'cadastros' },
    ],
  },
  {
    label: 'Suprimentos',
    href: '/suprimentos',
    children: [
      { label: 'Pedido de compras', href: '/compras/pedidos', permission: 'pedidos' },
      { label: 'Controle de estoque', href: '/estoque/produtos', permission: 'estoque' },
      { label: 'Notas de entrada', href: '/fiscal/notas', permission: 'financeiro' },
      { label: 'Relatorios', href: '/relatorios', permission: 'relatorios', comingSoon: true },
    ],
  },
  { label: 'Suporte', href: '/suporte' },
]

export function MainHeader() {
  const pathname = usePathname()
  const { user, empresa, logout } = useAuth()
  const { hasPermission, isAdmin } = usePermissions()
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Filtrar navegacao baseado em permissoes
  const filteredNavigation = useMemo(() => {
    return navigation.map(item => {
      // Se o item principal requer permissao e usuario nao tem, esconder
      if (item.permission && !hasPermission(item.permission)) {
        return null
      }

      // Filtrar filhos baseado em permissoes
      if (item.children) {
        const filteredChildren = item.children.filter(child => {
          if (!child.permission) return true
          return hasPermission(child.permission)
        })

        // Se nao sobrou nenhum filho, esconder o item pai
        if (filteredChildren.length === 0) return null

        return { ...item, children: filteredChildren }
      }

      return item
    }).filter(Boolean) as NavItem[]
  }, [hasPermission])

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="bg-[#336fb6] h-[60px] w-full shadow-md z-50 relative">
      <div className="h-full flex items-center px-12 gap-6">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Image
            src="/assets/branding/logo-white.png"
            alt="FlowB2B"
            width={120}
            height={38}
            className="object-contain"
            priority
          />
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1 ml-4" ref={dropdownRef}>
          {filteredNavigation.map((item) => (
            <div key={item.href} className="relative">
              {item.children ? (
                // Item com dropdown
                <button
                  onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors
                    ${openDropdown === item.label ? 'bg-[#2660a5]' : 'hover:bg-white/10'}
                    text-white
                  `}
                >
                  {item.label}
                  <ChevronDownIcon className={`w-3 h-3 transition-transform ${openDropdown === item.label ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                // Item simples
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors
                    ${isActive(item.href) ? 'bg-[#2660a5]' : 'hover:bg-white/10'}
                    text-white
                  `}
                >
                  {item.label}
                </Link>
              )}

              {/* Dropdown menu */}
              {item.children && openDropdown === item.label && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg py-2 min-w-[220px] z-50">
                  {item.children.map((child) => (
                    child.comingSoon ? (
                      <span
                        key={child.href}
                        className="flex items-center justify-between px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                      >
                        {child.label}
                        <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded">
                          Em Breve
                        </span>
                      </span>
                    ) : (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setOpenDropdown(null)}
                        className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      >
                        {child.label}
                      </Link>
                    )
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* User info with dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 hover:bg-white/10 rounded-md px-2 py-1 transition-colors"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                <span className="text-white text-sm font-medium">
                  {user?.nome?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              {/* Info */}
              <div className="text-left hidden md:block">
                <p className="text-white text-sm font-medium leading-tight">
                  {user?.nome || 'Usuario'}
                </p>
                <p className="text-white/70 text-xs leading-tight">
                  {user?.role === 'admin' ? 'Administrador' : 'Usuario'} - {empresa?.nome_fantasia || 'Empresa'}
                </p>
              </div>
              <ChevronDownIcon className="w-3 h-3 text-white/70" />
            </button>

            {/* User dropdown */}
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg py-2 min-w-[200px] z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.nome}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <Link
                  href="/perfil"
                  onClick={() => setUserMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Meu Perfil
                </Link>
                <Link
                  href="/configuracoes"
                  onClick={() => setUserMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Configuracoes
                </Link>
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <button className="p-2 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors relative">
            <BellIcon />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* Settings */}
          <Link
            href="/configuracoes"
            className="p-2 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <SettingsIcon />
          </Link>
        </div>
      </div>
    </header>
  )
}
