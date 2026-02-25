'use client'

import { ReactNode } from 'react'
import Image from 'next/image'

interface RepresentanteAuthLayoutProps {
  children: ReactNode
  description?: string
}

// Animated wave component with amber/orange theme
function AnimatedWaves() {
  const wave1 = "M0,160 C320,220 480,100 720,160 C960,220 1120,100 1440,160 L1440,320 L0,320 Z"
  const wave2 = "M0,200 C240,140 480,260 720,200 C960,140 1200,260 1440,200 L1440,320 L0,320 Z"
  const wave3 = "M0,180 C180,220 360,140 540,180 C720,220 900,140 1080,180 C1260,220 1350,140 1440,180 L1440,320 L0,320 Z"

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
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

      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/10 rounded-full animate-float-1" />
      <div className="absolute top-1/3 left-1/2 w-3 h-3 bg-white/8 rounded-full animate-float-2" />
      <div className="absolute top-1/2 left-1/3 w-2 h-2 bg-white/10 rounded-full animate-float-3" />
      <div className="absolute top-2/3 left-2/3 w-4 h-4 bg-white/6 rounded-full animate-float-4" />
      <div className="absolute top-1/4 right-1/4 w-3 h-3 bg-white/8 rounded-full animate-float-5" />
    </div>
  )
}

export function RepresentanteAuthLayout({ children, description }: RepresentanteAuthLayoutProps) {
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
          <p className="text-[28px] font-semibold text-white tracking-[-0.5px] mb-2 drop-shadow-sm">
            Bem-vindo ao
          </p>
          <p className="text-[20px] font-medium text-white/90 mb-4">
            Portal do Representante
          </p>

          <Image
            src="/assets/branding/logo-white.png"
            alt="FlowB2B"
            width={300}
            height={94}
            className="object-contain mx-auto drop-shadow-lg"
            priority
          />

          <p className="mt-10 text-[17px] font-medium text-white leading-[1.6] tracking-wide drop-shadow-sm">
            {description || 'Gerencie pedidos de multiplos fornecedores em um so lugar. Acompanhe e responda solicitacoes com agilidade.'}
          </p>
        </div>
      </div>

      {/* Decorative element */}
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
