import { type ReactNode, type ElementType } from 'react'

interface SectionContainerProps {
  children: ReactNode
  as?: ElementType
  className?: string
  id?: string
}

export function SectionContainer({
  children,
  as: Tag = 'section',
  className = '',
  id,
}: SectionContainerProps) {
  return (
    <Tag id={id} className={`py-20 md:py-32 ${className}`}>
      <div className="mx-auto max-w-[1280px] px-4 md:px-6">
        {children}
      </div>
    </Tag>
  )
}
