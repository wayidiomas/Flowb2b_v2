'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface LegalLayoutProps {
  children: ReactNode
  title: string
  lastUpdate?: string
}

// Animated wave component (same as AuthLayout)
function AnimatedWaves() {
  const wave1 = "M0,160 C320,220 480,100 720,160 C960,220 1120,100 1440,160 L1440,320 L0,320 Z"
  const wave2 = "M0,200 C240,140 480,260 720,200 C960,140 1200,260 1440,200 L1440,320 L0,320 Z"
  const wave3 = "M0,180 C180,220 360,140 540,180 C720,220 900,140 1080,180 C1260,220 1350,140 1440,180 L1440,320 L0,320 Z"

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute bottom-0 left-0 w-[200%] h-[280px] animate-wave-slow">
        <svg className="w-1/2 h-full float-left opacity-[0.06]" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="white" d={wave1} />
        </svg>
        <svg className="w-1/2 h-full float-left opacity-[0.06]" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="white" d={wave1} />
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 w-[200%] h-[220px] animate-wave-medium">
        <svg className="w-1/2 h-full float-left opacity-[0.045]" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="white" d={wave2} />
        </svg>
        <svg className="w-1/2 h-full float-left opacity-[0.045]" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="white" d={wave2} />
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 w-[200%] h-[160px] animate-wave-fast">
        <svg className="w-1/2 h-full float-left opacity-[0.035]" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="white" d={wave3} />
        </svg>
        <svg className="w-1/2 h-full float-left opacity-[0.035]" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="white" d={wave3} />
        </svg>
      </div>
    </div>
  )
}

// Document icon
function DocumentIcon() {
  return (
    <svg
      className="w-7 h-7 text-white"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  )
}

// Arrow left icon
function ArrowLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  )
}

export function LegalLayout({ children, title, lastUpdate }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#2293f9] to-[#0a489d] relative">
      <AnimatedWaves />

      {/* Header with logo */}
      <header className="relative z-10 pt-8 pb-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/login" className="inline-block">
            <Image
              src="/assets/branding/logo-white.png"
              alt="FlowB2B"
              width={160}
              height={50}
              className="object-contain"
              priority
            />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            {/* Title section with icon */}
            <div className="text-center mb-10">
              <div className="mx-auto w-14 h-14 bg-secondary-500 rounded-[14px] flex items-center justify-center mb-6 ring-[10px] ring-secondary-100">
                <DocumentIcon />
              </div>
              <h1 className="text-[32px] font-semibold text-primary-700 tracking-[-1.2px] mb-2">
                {title}
              </h1>
              {lastUpdate && (
                <p className="text-gray-500 text-sm">
                  Ultima atualizacao: {lastUpdate}
                </p>
              )}
            </div>

            {/* Content */}
            <div className="prose prose-gray max-w-none">
              {children}
            </div>

            {/* Back link */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold transition-colors"
              >
                <ArrowLeftIcon />
                Voltar para login
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 z-10 py-4">
        <p className="text-center text-sm text-white/70">
          &copy; FlowB2B, {new Date().getFullYear()}. Todos os direitos reservados.
        </p>
      </footer>

      {/* Cloud decoration */}
      <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] opacity-20 pointer-events-none z-[5]">
        <Image
          src="/assets/branding/cloud-decoration.png"
          alt=""
          fill
          className="object-contain"
        />
      </div>
    </div>
  )
}
