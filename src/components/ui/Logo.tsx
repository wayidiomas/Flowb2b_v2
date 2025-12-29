interface LogoProps {
  variant?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  className?: string
}

const sizeStyles = {
  sm: { icon: 32, text: 'text-xl' },
  md: { icon: 40, text: 'text-2xl' },
  lg: { icon: 56, text: 'text-3xl' },
  xl: { icon: 72, text: 'text-4xl' },
}

function Logo({
  variant = 'light',
  size = 'lg',
  showText = true,
  className = '',
}: LogoProps) {
  const { icon: iconSize, text: textSize } = sizeStyles[size]
  const textColor = variant === 'light' ? 'text-white' : 'text-primary-700'
  const iconColor = variant === 'light' ? '#FFFFFF' : '#2660A5'

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Logo icon - Stylized intertwined arrows/leaves representing flow */}
        <g>
          {/* Left arrow/leaf */}
          <path
            d="M14 42C14 42 18 34 28 28C18 22 14 14 14 14"
            stroke={iconColor}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Right arrow/leaf */}
          <path
            d="M42 14C42 14 38 22 28 28C38 34 42 42 42 42"
            stroke={iconColor}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Center connecting element */}
          <circle
            cx="28"
            cy="28"
            r="4"
            fill={iconColor}
          />
        </g>
      </svg>
      {showText && (
        <span className={`font-semibold tracking-tight ${textSize} ${textColor}`}>
          FlowB2B
        </span>
      )}
    </div>
  )
}

function LogoMark({
  size = 40,
  color = '#2660A5',
  className = '',
}: {
  size?: number
  color?: string
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g>
        <path
          d="M14 42C14 42 18 34 28 28C18 22 14 14 14 14"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M42 14C42 14 38 22 28 28C38 34 42 42 42 42"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="28" cy="28" r="4" fill={color} />
      </g>
    </svg>
  )
}

export { Logo, LogoMark }
export type { LogoProps }
