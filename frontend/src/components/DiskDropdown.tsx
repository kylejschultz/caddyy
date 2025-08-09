import { useEffect, useRef, useState } from 'react'
import { CaretDown as ChevronDown, HardDrive, CheckCircle } from '@phosphor-icons/react'

export interface DiskOption {
  id: number
  name: string
  path: string
}

export interface DiskDropdownProps {
  value?: number // selected disk id
  options: DiskOption[]
  onChange: (id: number) => void
  disabled?: boolean
  className?: string
  inModal?: boolean
}

export default function DiskDropdown({
  value,
  options,
  onChange,
  disabled = false,
  className = '',
  inModal = false,
}: DiskDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'>('bottom-left')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const current = options.find(o => o.id === value) || options[0]

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const dropdownWidth = 288 // w-72
      const dropdownHeight = Math.min(360, 56 + options.length * 48) // approx

      let position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' = 'bottom-left'

      const hasRightSpace = buttonRect.left + dropdownWidth <= viewportWidth - 16
      const hasBottomSpace = buttonRect.bottom + dropdownHeight <= viewportHeight - 16
      const hasTopSpace = buttonRect.top - dropdownHeight >= 16

      if (hasBottomSpace) {
        position = hasRightSpace ? 'bottom-left' : 'bottom-right'
      } else if (hasTopSpace) {
        position = hasRightSpace ? 'top-left' : 'top-right'
      } else {
        position = hasRightSpace ? 'bottom-left' : 'bottom-right'
      }

      setDropdownPosition(position)
    }
  }, [isOpen, options.length])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getDropdownClasses = () => {
    const zIndex = inModal ? 'z-[60]' : 'z-50'
    const base = `absolute mt-1 w-72 bg-slate-800 border border-slate-600 rounded-lg shadow-xl ${zIndex}`
    switch (dropdownPosition) {
      case 'bottom-left':
        return `${base} top-full left-0`
      case 'bottom-right':
        return `${base} top-full right-0`
      case 'top-left':
        return `${base} bottom-full left-0 mb-1`
      case 'top-right':
        return `${base} bottom-full right-0 mb-1`
      default:
        return `${base} top-full left-0`
    }
  }

  const handleSelect = (id: number) => {
    onChange(id)
    setIsOpen(false)
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors text-sm font-medium
          ${disabled
            ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-slate-800 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500'}
        `}
        title="Storage disk"
      >
        <HardDrive className="w-4 h-4" />
        <span className="truncate max-w-[12rem]">
          {current ? current.name : 'Select disk'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={getDropdownClasses()}>
          <div className="py-1 max-h-80 overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                className={`w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors flex items-center justify-between ${
                  value === opt.id ? 'bg-slate-700' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200 truncate">{opt.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5 leading-tight truncate">{opt.path}</div>
                </div>
                {value === opt.id && (
                  <CheckCircle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 ml-2" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

