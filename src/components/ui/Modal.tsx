'use client'

import { Fragment, ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

function Modal({ isOpen, onClose, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div
        className={`
          relative w-full ${sizeStyles[size]}
          bg-white rounded-2xl shadow-xl
          animate-in zoom-in-95 duration-200
        `}
      >
        {children}
      </div>
    </div>
  )

  if (typeof window === 'undefined') return null
  return createPortal(modalContent, document.body)
}

interface ModalHeaderProps {
  children: ReactNode
  onClose?: () => void
}

function ModalHeader({ children, onClose }: ModalHeaderProps) {
  return (
    <div className="flex items-start justify-between p-6 pb-0">
      <div>{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  )
}

interface ModalTitleProps {
  children: ReactNode
}

function ModalTitle({ children }: ModalTitleProps) {
  return (
    <h3 className="text-lg font-semibold text-gray-900">{children}</h3>
  )
}

interface ModalDescriptionProps {
  children: ReactNode
}

function ModalDescription({ children }: ModalDescriptionProps) {
  return <p className="mt-1 text-sm text-gray-500">{children}</p>
}

interface ModalBodyProps {
  children: ReactNode
}

function ModalBody({ children }: ModalBodyProps) {
  return <div className="p-6">{children}</div>
}

interface ModalFooterProps {
  children: ReactNode
}

function ModalFooter({ children }: ModalFooterProps) {
  return (
    <div className="flex items-center justify-end gap-3 p-6 pt-0">
      {children}
    </div>
  )
}

export {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
}
