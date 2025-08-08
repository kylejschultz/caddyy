import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Monitor, CheckCircle } from 'lucide-react'

export type MonitoringOption = 
  | 'None'
  | 'All Episodes'
  | 'Future Episodes'
  | 'Current Season'
  | 'First Season' 
  | 'Last Season'

export interface MonitoringDropdownProps {
  value: MonitoringOption
  onChange: (value: MonitoringOption) => void
  disabled?: boolean
  className?: string
  inModal?: boolean // New prop to handle modal context
}

const monitoringOptions: Array<{
  value: MonitoringOption
  label: string
  description: string
  color: string
}> = [
  {
    value: 'None',
    label: 'None',
    description: "Don't monitor for new episodes",
    color: 'text-slate-400'
  },
  {
    value: 'All Episodes',
    label: 'All Episodes',
    description: 'Monitor all episodes',
    color: 'text-green-400'
  },
  {
    value: 'Future Episodes',
    label: 'Future Episodes',
    description: 'Monitor future episodes only',
    color: 'text-blue-400'
  },
  {
    value: 'Current Season',
    label: 'Current Season',
    description: 'Monitor current season only',
    color: 'text-purple-400'
  },
  {
    value: 'First Season',
    label: 'First Season',
    description: 'Monitor first season only',
    color: 'text-yellow-400'
  },
  {
    value: 'Last Season',
    label: 'Last Season',
    description: 'Monitor last season only',
    color: 'text-orange-400'
  }
]

export default function MonitoringDropdown({ 
  value, 
  onChange, 
  disabled = false,
  className = '',
  inModal = false 
}: MonitoringDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'>('bottom-left')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const currentOption = monitoringOptions.find(opt => opt.value === value) || monitoringOptions[0]

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const dropdownWidth = 256 // w-64 = 16rem = 256px (reduced from 288px)
      const dropdownHeight = 280 // Approximate height of dropdown (reduced from 350px)
      
      let position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' = 'bottom-left'
      
      // Check horizontal space
      const hasRightSpace = buttonRect.left + dropdownWidth <= viewportWidth - 16
      const hasLeftSpace = buttonRect.right - dropdownWidth >= 16
      
      // Check vertical space  
      const hasBottomSpace = buttonRect.bottom + dropdownHeight <= viewportHeight - 16
      const hasTopSpace = buttonRect.top - dropdownHeight >= 16
      
      // Determine best position
      if (hasBottomSpace) {
        // Prefer bottom
        position = hasRightSpace ? 'bottom-left' : 'bottom-right'
      } else if (hasTopSpace) {
        // Fall back to top
        position = hasRightSpace ? 'top-left' : 'top-right'
      } else {
        // No good vertical space, stick with bottom and adjust horizontal
        position = hasRightSpace ? 'bottom-left' : 'bottom-right'
      }
      
      setDropdownPosition(position)
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleOptionSelect = (option: MonitoringOption) => {
    onChange(option)
    setIsOpen(false)
  }

  // Get positioning classes based on calculated position
  const getDropdownClasses = () => {
    // Use higher z-index when in modal to appear over modal content
    const zIndex = inModal ? 'z-[60]' : 'z-50'
    const baseClasses = `absolute mt-1 w-64 bg-slate-800 border border-slate-600 rounded-lg shadow-xl ${zIndex}`
    
    switch (dropdownPosition) {
      case 'bottom-left':
        return `${baseClasses} top-full left-0`
      case 'bottom-right':
        return `${baseClasses} top-full right-0`
      case 'top-left':
        return `${baseClasses} bottom-full left-0 mb-1`
      case 'top-right':
        return `${baseClasses} bottom-full right-0 mb-1`
      default:
        return `${baseClasses} top-full left-0`
    }
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors text-sm font-medium
          ${disabled 
            ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-slate-800 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500'
          }
        `}
      >
        <Monitor className="w-4 h-4" />
        <span className={currentOption.color}>
          {currentOption.label}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={getDropdownClasses()}>
          <div className="py-0.5">
            {monitoringOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleOptionSelect(option.value)}
                className={`
                  w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors flex items-center justify-between
                  ${value === option.value ? 'bg-slate-700' : ''}
                `}
              >
                <div className="flex-1">
                  <div className={`text-sm font-medium ${option.color}`}>
                    {option.label}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 leading-tight">
                    {option.description}
                  </div>
                </div>
                {value === option.value && (
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
