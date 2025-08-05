import { ReactNode, useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Home, 
  Film, 
  Tv, 
  Download, 
  Settings,
  Activity,
  Search,
  User,
  Shield,
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
    href: '/settings', 
    icon: Settings,
    children: [
      { name: 'General', href: '/settings/general', icon: Settings },
      { name: 'Users', href: '/settings/users', icon: User },
      { name: 'Security', href: '/settings/security', icon: Shield },
    ]
  },
]

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedItems, setExpandedItems] = useState<string[]>([]) 

  // Auto-expand settings when on settings page
  useEffect(() => {
    if (location.pathname.startsWith('/settings')) {
      setExpandedItems(prev => 
        prev.includes('Settings') ? prev : [...prev, 'Settings']
      )
    }
  }, [location.pathname])

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      (e.target as HTMLInputElement).blur();
    }
  }

  const renderNavigationItem = (item: NavigationItem) => {
    const isActive = item.href === '/' 
      ? location.pathname === '/' 
      : location.pathname.startsWith(item.href!)

    const isExpanded = expandedItems.includes(item.name)

    const toggleExpand = () => {
      setExpandedItems(prev =>
        prev.includes(item.name)
          ? prev.filter(n => n !== item.name)
          : [...prev, item.name]
      )
    }

    return (
      <li key={item.name} className="space-y-1">
        {item.children ? (
          <div>
            <div
              onClick={() => {
                if (item.name === 'Settings') {
                  navigate('/settings/general')
                } else {
                  toggleExpand()
                }
              }}
              className={clsx(
                'flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors',
                location.pathname.startsWith(item.href!)
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <div className="flex items-center">
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </div>
              {isExpanded ? <ChevronDown /> : <ChevronRight />}
            </div>
            {isExpanded && item.children && (
              <ul className="mt-1 space-y-1 ml-3 border-l border-slate-700">
                {item.children.map((child) => (
                  <li key={child.name}>
                    <Link
                      to={child.href!}
                      onClick={() => {
                        if (!location.pathname.startsWith(child.href!)) {
                          setSearchQuery('')
                        }
                      }}
                      className={clsx(
                        'flex items-center pl-4 pr-3 py-2 text-sm transition-colors rounded-r-md',
                        location.pathname === child.href
                          ? 'bg-blue-600/30 text-white font-semibold border-l-2 border-blue-400'
                          : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 font-normal'
                      )}
                    >
                      <child.icon className={clsx(
                        'w-4 h-4 mr-3',
                        location.pathname === child.href ? 'text-blue-300' : ''
                      )} />
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <Link
            to={item.href!}
            onClick={() => {
              if (!location.pathname.startsWith(item.href!)) {
                setSearchQuery('')
              }
            }}
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
        {/* Fixed Sidebar */}
        <div className="fixed left-0 top-0 w-64 h-screen bg-slate-900 border-r border-slate-800 z-30 flex flex-col">
          <div className="p-6 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <Activity className="w-8 h-8 text-blue-500" />
              <h1 className="text-xl font-bold text-white">Caddyy</h1>
            </div>
          </div>
          
          <div className="px-6 pb-4 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search movies & TV shows..."
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
              />
            </div>
          </div>
          
          <nav className="px-3 flex-1 overflow-y-auto">
            <ul className="space-y-1">
              {navigation.map(renderNavigationItem)}
            </ul>
          </nav>
        </div>
        
        {/* Main content with left margin to account for fixed sidebar */}
        <div className="flex-1 ml-64">
          <main className="min-h-screen">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
