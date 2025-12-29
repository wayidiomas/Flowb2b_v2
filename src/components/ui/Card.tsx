import { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  shadow?: 'none' | 'xs' | 'sm' | 'md' | 'lg'
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-10',
}

const shadowStyles = {
  none: '',
  xs: 'shadow-xs',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
}

const roundedStyles = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
}

function Card({
  children,
  padding = 'lg',
  shadow = 'md',
  rounded = '2xl',
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`
        bg-white
        ${paddingStyles[padding]}
        ${shadowStyles[shadow]}
        ${roundedStyles[rounded]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

function CardHeader({ children, className = '', ...props }: CardHeaderProps) {
  return (
    <div className={`mb-6 ${className}`} {...props}>
      {children}
    </div>
  )
}

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode
  as?: 'h1' | 'h2' | 'h3' | 'h4'
}

function CardTitle({
  children,
  as: Component = 'h2',
  className = '',
  ...props
}: CardTitleProps) {
  return (
    <Component
      className={`text-[30px] font-semibold text-primary-700 tracking-[-1.2px] ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}

interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode
}

function CardDescription({
  children,
  className = '',
  ...props
}: CardDescriptionProps) {
  return (
    <p
      className={`mt-3 text-base text-gray-600 leading-6 ${className}`}
      {...props}
    >
      {children}
    </p>
  )
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

function CardContent({ children, className = '', ...props }: CardContentProps) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  )
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

function CardFooter({ children, className = '', ...props }: CardFooterProps) {
  return (
    <div className={`mt-6 ${className}`} {...props}>
      {children}
    </div>
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
export type { CardProps }
