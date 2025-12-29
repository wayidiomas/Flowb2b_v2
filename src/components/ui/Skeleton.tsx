'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-gray-200',
        className
      )}
      style={style}
    />
  )
}

interface TableSkeletonProps {
  columns: number
  rows?: number
  showCheckbox?: boolean
  showActions?: boolean
}

export function TableSkeleton({
  columns,
  rows = 5,
  showCheckbox = false,
  showActions = false,
}: TableSkeletonProps) {
  const totalColumns = columns + (showCheckbox ? 1 : 0) + (showActions ? 1 : 0)

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-gray-100">
          {showCheckbox && (
            <td className="px-4 py-3">
              <Skeleton className="h-4 w-4 rounded" />
            </td>
          )}
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              <Skeleton
                className={cn(
                  'h-4 rounded',
                  colIndex === 0 ? 'w-48' : 'w-24',
                  rowIndex % 2 === 0 ? 'w-32' : 'w-28'
                )}
              />
            </td>
          ))}
          {showActions && (
            <td className="px-4 py-3">
              <div className="flex items-center justify-center gap-2">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </td>
          )}
        </tr>
      ))}
    </>
  )
}

interface CardSkeletonProps {
  className?: string
}

export function CardSkeleton({ className }: CardSkeletonProps) {
  return (
    <div className={cn('bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] p-6', className)}>
      <Skeleton className="h-5 w-32 mb-4" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}

interface ChartSkeletonProps {
  className?: string
}

export function ChartSkeleton({ className }: ChartSkeletonProps) {
  return (
    <div className={cn('bg-white rounded-[20px] shadow-[0px_0px_12.4px_1px_rgba(137,170,255,0.1)] p-6', className)}>
      <Skeleton className="h-4 w-32 mb-4" />
      <div className="h-[200px] flex items-end justify-between gap-2 pt-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${Math.random() * 60 + 40}%` }}
          />
        ))}
      </div>
    </div>
  )
}
