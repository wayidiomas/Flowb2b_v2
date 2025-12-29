import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link'
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-secondary-500 text-white
    hover:bg-secondary-600
    focus:ring-secondary-500
    disabled:bg-secondary-300
  `,
  secondary: `
    bg-primary-700 text-white
    hover:bg-primary-800
    focus:ring-primary-700
    disabled:bg-primary-300
  `,
  outline: `
    bg-white text-gray-700 border border-gray-300
    hover:bg-gray-50
    focus:ring-primary-500
    disabled:bg-gray-100 disabled:text-gray-400
  `,
  ghost: `
    bg-transparent text-gray-700
    hover:bg-gray-100
    focus:ring-gray-500
    disabled:text-gray-400
  `,
  link: `
    bg-transparent text-secondary-500 underline-offset-4
    hover:underline
    focus:ring-secondary-500
    disabled:text-secondary-300
    p-0 h-auto shadow-none
  `,
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-sm h-9',
  md: 'px-4 py-2.5 text-sm h-10',
  lg: 'px-[18px] py-2.5 text-base h-11',
  xl: 'px-5 py-3 text-base h-12',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'lg',
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center gap-2
          font-semibold rounded-lg
          shadow-xs
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${variant !== 'link' ? sizeStyles[size] : ''}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
export type { ButtonProps, ButtonVariant, ButtonSize }
