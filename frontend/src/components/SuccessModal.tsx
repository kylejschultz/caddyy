import { CheckCircle, X } from '@phosphor-icons/react'
import { useEffect } from 'react'

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
  autoCloseDelay?: number // Auto close after X milliseconds (default: no auto close)
}

export default function SuccessModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  actionLabel = "Close",
  onAction,
  autoCloseDelay 
}: SuccessModalProps) {
  const handleAction = () => {
    if (onAction) {
      onAction()
    } else {
      onClose()
    }
  }

  // Auto close after delay if specified
  useEffect(() => {
    if (isOpen && autoCloseDelay && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        handleAction()
      }, autoCloseDelay)
      
      return () => clearTimeout(timer)
    }
  }, [isOpen, autoCloseDelay])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <h2 className="text-xl font-semibold text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-300">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-700">
          <button
            onClick={handleAction}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            <span>{actionLabel}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
