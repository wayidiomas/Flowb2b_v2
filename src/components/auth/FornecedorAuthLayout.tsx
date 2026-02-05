'use client'

import { ReactNode } from 'react'
import Image from 'next/image'

interface FornecedorAuthLayoutProps {
  children: ReactNode
  description?: string
}

const avatars = [
  { src: '/assets/branding/avatar-1.png', alt: 'Fornecedor 1' },
  { src: '/assets/branding/avatar-2.png', alt: 'Fornecedor 2' },
  { src: '/assets/branding/avatar-3.png', alt: 'Fornecedor 3' },
  { src: '/assets/branding/avatar-4.png', alt: 'Fornecedor 4' },
  { src: '/assets/branding/avatar-5.png', alt: 'Fornecedor 5' },
]

// Animated wave component - same as lojista but on amber/orange background
function AnimatedWaves() {
  const wave1 = "M0,160 C320,220 480,100 720,160 C960,220 1120,100 1440,160 L1440,320 L0,320 Z"
  const wave2 = "M0,200 C240,140 480,260 720,200 C960,140 1200,260 1440,200 L1440,320 L0,320 Z"
  const wave3 = "M0,180 C180,220 360,140 540,180 C720,220 900,140 1080,180 C1260,220 1350,140 1440,180 L1440,320 L0,320 Z"

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Wave 1 - Slow, large wave */}
      <div className="absolute bottom-0 left-0 w-[200%] h-[280px] animate-wave-slow">
        <svg
          className="w-1/2 h-full float-left opacity-[0.08]"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path fill="white" d={wave1} />
        </svg>
        <svg
          className="w-1/2 h-full float-left opacity-[0.08]"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path fill="white" d={wave1} />
        </svg>
      </div>

      {/* Wave 2 - Medium speed */}
      <div className="absolute bottom-0 left-0 w-[200%] h-[220px] animate-wave-medium">
        <svg
          className="w-1/2 h-full float-left opacity-[0.06]"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path fill="white" d={wave2} />
        </svg>
        <svg
          className="w-1/2 h-full float-left opacity-[0.06]"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path fill="white" d={wave2} />
        </svg>
      </div>

      {/* Wave 3 - Fast, small wave */}
      <div className="absolute bottom-0 left-0 w-[200%] h-[160px] animate-wave-fast">
        <svg
          className="w-1/2 h-full float-left opacity-[0.05]"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path fill="white" d={wave3} />
        </svg>
        <svg
          className="w-1/2 h-full float-left opacity-[0.05]"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path fill="white" d={wave3} />
        </svg>
      </div>

      {/* Floating particles */}
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/10 rounded-full animate-float-1" />
      <div className="absolute top-1/3 left-1/2 w-3 h-3 bg-white/8 rounded-full animate-float-2" />
      <div className="absolute top-1/2 left-1/3 w-2 h-2 bg-white/10 rounded-full animate-float-3" />
      <div className="absolute top-2/3 left-2/3 w-4 h-4 bg-white/6 rounded-full animate-float-4" />
      <div className="absolute top-1/4 right-1/4 w-3 h-3 bg-white/8 rounded-full animate-float-5" />
    </div>
  )
}

export function FornecedorAuthLayout({ children, description }: FornecedorAuthLayoutProps) {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 relative overflow-hidden">
      {/* Animated waves background */}
      <AnimatedWaves />

      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 z-10">
        {children}
      </div>

      {/* Right Side - Branding */}
      <div className="hidden lg:flex lg:w-[45%] flex-col items-start justify-center px-12 pt-0 pb-40 relative">
        <div className="relative z-10 max-w-lg text-center">
          {/* Title */}
          <p className="text-[28px] font-semibold text-white tracking-[-0.5px] mb-2 drop-shadow-sm">
            Bem-vindo ao
          </p>
          <p className="text-[20px] font-medium text-white/90 mb-4">
            Portal do Fornecedor
          </p>

          {/* Logo */}
          <Image
            src="/assets/branding/logo-white.png"
            alt="FlowB2B"
            width={300}
            height={94}
            className="object-contain mx-auto drop-shadow-lg"
            priority
          />

          {/* Description - maior contraste */}
          <p className="mt-10 text-[17px] font-medium text-white leading-[1.6] tracking-wide drop-shadow-sm">
            {description || 'Gerencie seus pedidos de compra, envie sugestoes comerciais e acompanhe tudo em tempo real.'}
          </p>

          {/* Social Proof - Avatars */}
          <div className="mt-10 flex items-center justify-center gap-5">
            <div className="flex -space-x-2">
              {avatars.map((avatar, index) => (
                <div
                  key={index}
                  className="relative w-10 h-10 rounded-full border-[2px] border-white overflow-hidden shadow-lg"
                >
                  <Image
                    src={avatar.src}
                    alt={avatar.alt}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
            <p className="text-[15px] font-semibold text-white drop-shadow-sm">
              +500 fornecedores
            </p>
          </div>
        </div>
      </div>

      {/* Decorative element - bottom right */}
      <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] opacity-15 pointer-events-none z-[5]">
        <Image
          src="/assets/branding/cloud-decoration.png"
          alt=""
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <p className="text-sm text-white/80 font-medium drop-shadow-sm">
          &copy; FlowB2B, {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
