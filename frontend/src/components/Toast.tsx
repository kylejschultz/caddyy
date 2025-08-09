import { useEffect, useState } from 'react'
import { CheckCircle, X, WarningCircle as AlertCircle, Info } from '@phosphor-icons/react'

interface ToastProps {
  isVisible: boolean
  type?: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
  duration?: number // Duration in milliseconds (default: 4000)
  onClose: () => void
}

export default function Toast({
  isVisible,
  type = 'success',
  title,
  message,
  duration = 4000,
  onClose
}: ToastProps) {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [isVisible, duration])

  const handleClose = () => {
    setIsAnimatingOut(true)
    setTimeout(() => {
      setIsAnimatingOut(false)
      onClose()
    }, 300) // Match animation duration
  }

  if (!isVisible && !isAnimatingOut) {
    console.log('Toast not visible, returning null')
    return null
  }

  console.log('Toast rendering with isVisible:', isVisible, 'type:', type, 'title:', title)

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-white" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-white" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-white" />
      case 'info':
        return <Info className="w-5 h-5 text-white" />
      default:
        return <CheckCircle className="w-5 h-5 text-white" />
    }
  }

  const getColorClasses = () => {
    switch (type) {
      case 'success':
        return 'bg-green-600 border-green-500 text-white'
      case 'error':
        return 'bg-red-600 border-red-500 text-white'
      case 'warning':
        return 'bg-yellow-600 border-yellow-500 text-white'
      case 'info':
        return 'bg-blue-600 border-blue-500 text-white'
      default:
        return 'bg-green-600 border-green-500 text-white'
    }
  }

  return (
    <div className="fixed bottom-4 left-4 z-[60] pointer-events-none">
      <div
        className={`
          pointer-events-auto
          max-w-sm w-full
          border rounded-lg p-4 shadow-xl
          transition-all duration-300 ease-in-out
          ${getColorClasses()}
          ${isVisible && !isAnimatingOut
            ? 'translate-y-0 opacity-100' 
            : 'translate-y-full opacity-0'
          }
        `}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 pt-0.5">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{title}</p>
            {message && (
              <p className="text-sm opacity-90 mt-1 break-words">
                {message}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 text-current opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
