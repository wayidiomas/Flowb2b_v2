import { forwardRef, InputHTMLAttributes, ReactNode } from 'react'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode
  error?: string
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || props.name || Math.random().toString(36).substr(2, 9)

    return (
      <div className="flex items-start gap-2">
        <div className="flex items-center h-5 mt-0.5">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className={`
              w-4 h-4
              text-primary-600
              bg-white
              border border-gray-300
              rounded
              cursor-pointer
              transition-colors
              focus:ring-2 focus:ring-primary-500 focus:ring-offset-0
              checked:bg-primary-600 checked:border-primary-600
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border-error-500' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm text-gray-700 cursor-pointer select-none leading-5"
          >
            {label}
          </label>
        )}
        {error && (
          <p className="text-sm text-error-500 mt-1">{error}</p>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'

export { Checkbox }
export type { CheckboxProps }
