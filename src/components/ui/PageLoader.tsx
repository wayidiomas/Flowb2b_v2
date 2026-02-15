'use client'

interface PageLoaderProps {
  message?: string
}

export function PageLoader({ message = 'Carregando...' }: PageLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6">
        {/* Logo animada */}
        <div className="relative">
          {/* Círculo de fundo com pulse */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-[#336FB6]/10 animate-ping" />
          </div>

          {/* Logo com animação */}
          <svg
            width={80}
            height={80}
            viewBox="0 0 56 56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="relative z-10 animate-pulse"
          >
            <g>
              {/* Left arrow/leaf - animação de desenho */}
              <path
                d="M14 42C14 42 18 34 28 28C18 22 14 14 14 14"
                stroke="#336FB6"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                className="animate-[draw_1.5s_ease-in-out_infinite]"
                style={{
                  strokeDasharray: 100,
                  strokeDashoffset: 0,
                }}
              />
              {/* Right arrow/leaf */}
              <path
                d="M42 14C42 14 38 22 28 28C38 34 42 42 42 42"
                stroke="#336FB6"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                className="animate-[draw_1.5s_ease-in-out_infinite_0.2s]"
                style={{
                  strokeDasharray: 100,
                  strokeDashoffset: 0,
                }}
              />
              {/* Center connecting element */}
              <circle
                cx="28"
                cy="28"
                r="4"
                fill="#336FB6"
                className="animate-[scale_1s_ease-in-out_infinite]"
              />
            </g>
          </svg>
        </div>

        {/* Texto e spinner */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-2xl font-semibold text-[#336FB6]">FlowB2B</span>

          {/* Spinner de loading */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-[#336FB6] animate-[bounce_1s_ease-in-out_infinite]" />
              <div className="w-2 h-2 rounded-full bg-[#336FB6] animate-[bounce_1s_ease-in-out_infinite_0.1s]" />
              <div className="w-2 h-2 rounded-full bg-[#336FB6] animate-[bounce_1s_ease-in-out_infinite_0.2s]" />
            </div>
          </div>

          <span className="text-sm text-[#667085]">{message}</span>
        </div>
      </div>

      {/* Keyframes customizados */}
      <style jsx>{`
        @keyframes draw {
          0%, 100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          50% {
            stroke-dashoffset: 50;
            opacity: 0.5;
          }
        }
        @keyframes scale {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.3);
          }
        }
      `}</style>
    </div>
  )
}

// Versão inline para usar dentro de containers
export function InlineLoader({ message = 'Carregando...' }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative mb-6">
        {/* Círculo de fundo com pulse */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-[#336FB6]/10 animate-ping" />
        </div>

        {/* Logo com animação */}
        <svg
          width={64}
          height={64}
          viewBox="0 0 56 56"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 animate-pulse"
        >
          <g>
            <path
              d="M14 42C14 42 18 34 28 28C18 22 14 14 14 14"
              stroke="#336FB6"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M42 14C42 14 38 22 28 28C38 34 42 42 42 42"
              stroke="#336FB6"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="28" cy="28" r="4" fill="#336FB6" />
          </g>
        </svg>
      </div>

      {/* Dots loading */}
      <div className="flex gap-1 mb-3">
        <div className="w-2 h-2 rounded-full bg-[#336FB6] animate-[bounce_1s_ease-in-out_infinite]" />
        <div className="w-2 h-2 rounded-full bg-[#336FB6] animate-[bounce_1s_ease-in-out_infinite_0.1s]" />
        <div className="w-2 h-2 rounded-full bg-[#336FB6] animate-[bounce_1s_ease-in-out_infinite_0.2s]" />
      </div>

      <span className="text-sm text-[#667085]">{message}</span>
    </div>
  )
}
