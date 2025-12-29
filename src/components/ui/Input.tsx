import { forwardRef, InputHTMLAttributes, ReactNode, useId } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const inputId = id || generatedId

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              block w-full
              px-3.5 py-2.5
              text-base text-gray-900
              placeholder:text-gray-500
              bg-white
              border rounded-lg
              shadow-xs
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-0
              disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${
                error
                  ? 'border-error-500 focus:ring-error-500 focus:border-error-500'
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">
              {rightIcon}
            </div>
          )}
        </div>
        {(error || hint) && (
          <p
            className={`mt-1.5 text-sm ${
              error ? 'text-error-500' : 'text-gray-500'
            }`}
          >
            {error || hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
export type { InputProps }
