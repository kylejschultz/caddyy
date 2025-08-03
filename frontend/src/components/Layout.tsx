import { ReactNode, useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Film, 
  Tv, 
  Download, 
  Settings,
  Activity,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import clsx from 'clsx'

interface LayoutProps {
  children: ReactNode
}

interface NavigationItem {
  name: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavigationItem[]
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Movies', href: '/movies', icon: Film },
  { name: 'TV Shows', href: '/shows', icon: Tv },
  { name: 'Downloads', href: '/downloads', icon: Download },
  { 
    name: 'Settings', 
    icon: Settings,
    children: [
      { name: 'General', href: '/settings/general', icon: Settings },
    ]
  },
]

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    // Expand 'Settings' if on a settings-related route
    return location.pathname.startsWith('/settings') ? ['Settings'] : []
  })

  // Auto-collapse/expand based on current route
  useEffect(() => {
    if (location.pathname.startsWith('/settings')) {
      // Expand Settings if we're on a settings page and it's not already expanded
      setExpandedItems(prev => 
        prev.includes('Settings') ? prev : [...prev, 'Settings']
      )
    } else {
      // Collapse Settings if we navigate away from settings
      setExpandedItems(prev => 
        prev.filter(name => name !== 'Settings')
      )
    }
  }, [location.pathname])

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    )
  }

  const renderNavigationItem = (item: NavigationItem) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.name)
    const isActive = item.href ? location.pathname === item.href : false
    const isChildActive = item.children?.some(child => child.href === location.pathname)

    return (
      <li key={item.name}>
        {hasChildren ? (
          <>
            <button
              onClick={() => toggleExpanded(item.name)}
              className={clsx(
                'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isChildActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 ml-auto" />
              ) : (
                <ChevronRight className="w-4 h-4 ml-auto" />
              )}
            </button>
            {isExpanded && item.children && (
              <ul className="ml-6 mt-1 space-y-1">
                {item.children.map((child) => (
                  <li key={child.name}>
                    <Link
                      to={child.href!}
                      className={clsx(
                        'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                        location.pathname === child.href
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      )}
                    >
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <Link
            to={item.href!}
            className={clsx(
              'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            )}
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.name}
          </Link>
        )}
      </li>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="flex">
        <div className="w-64 bg-slate-900 min-h-screen border-r border-slate-800">
          <div className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="w-8 h-8 text-blue-500" />
              <h1 className="text-xl font-bold text-white">Caddyy</h1>
            </div>
          </div>
          
          <nav className="px-3">
            <ul className="space-y-1">
              {navigation.map(renderNavigationItem)}
            </ul>
          </nav>
        </div>
        
        <div className="flex-1">
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
