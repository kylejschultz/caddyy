import { ReactNode, useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
} from 'lucide-react'
import {
  House,
  FilmSlate,
  Television,
  DownloadSimple,
  Gear,
  MagnifyingGlass,
  User,
  Shield,
  CaretDown,
  CaretRight,
  SquaresFour,
  Clock,
  List,
  UploadSimple
} from '@phosphor-icons/react'
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

const dashboardItem: NavigationItem = { name: 'Dashboard', href: '/', icon: House }

const navigationGroups: { title: string; items: NavigationItem[] }[] = [
  {
    title: 'Library',
    items: [
      {
        name: 'Movies',
        href: '/movies',
        icon: FilmSlate,
        children: [
          { name: 'Collection', href: '/movies', icon: SquaresFour },
          { name: 'Settings', href: '/movies/settings', icon: Gear },
        ],
      },
      {
        name: 'TV Shows',
        href: '/shows',
        icon: Television,
        children: [
          { name: 'Collection', href: '/shows', icon: SquaresFour },
          { name: 'Import', href: '/shows/import', icon: UploadSimple },
          { name: 'Settings', href: '/shows/settings', icon: Gear },
        ],
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        name: 'Monitor',
        href: '/monitor',
        icon: DownloadSimple,
        children: [
          { name: 'Queue', href: '/monitor/queue', icon: List },
          { name: 'History', href: '/monitor/history', icon: Clock },
        ],
      },
      {
        name: 'Settings',
        href: '/settings',
        icon: Gear,
        children: [
          { name: 'General', href: '/settings/general', icon: Gear },
          { name: 'Users', href: '/settings/users', icon: User },
          { name: 'Security', href: '/settings/security', icon: Shield },
        ],
      },
    ],
  },
]

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedItems, setExpandedItems] = useState<string | null>(null)

  // Auto-expand navigation sections based on current path
  useEffect(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const currentSection = pathSegments[0]
    
    let sectionToExpand = null
    if (currentSection === 'movies' || currentSection === 'movie') sectionToExpand = 'Movies'
    else if (currentSection === 'shows' || currentSection === 'tv') sectionToExpand = 'TV Shows'
    else if (currentSection === 'monitor') sectionToExpand = 'Monitor'
    else if (currentSection === 'settings') sectionToExpand = 'Settings'
    
    if (sectionToExpand) {
      setExpandedItems(sectionToExpand)
    } else {
      setExpandedItems(null)
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

    const isExpanded = expandedItems === item.name

    const toggleExpand = () => {
      setExpandedItems(prev => (prev === item.name ? null : item.name))
    }

    return (
      <li key={item.name} className="space-y-1">
        {item.children ? (
          <div>
            <div
              onClick={() => {
                if (item.name === 'Movies') {
                  navigate('/movies')
                } else if (item.name === 'TV Shows') {
                  navigate('/shows')
                } else if (item.name === 'Monitor') {
                  navigate('/monitor/queue')
                } else if (item.name === 'Settings') {
                  navigate('/settings/general')
                } else {
                  toggleExpand()
                }
              }}
              className={clsx(
                'flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors',
                location.pathname.startsWith(item.href!)
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <div className="flex items-center">
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </div>
              {isExpanded ? <CaretDown /> : <CaretRight />}
            </div>
            {isExpanded && item.children && (
              <ul className="mt-1 space-y-1 ml-3 border-l border-gray-200 dark:border-slate-700">
                {item.children.map((child) => {
                  const path = location.pathname
                  const isCollectionChild = child.name === 'Collection'
                  let isChildActive = path === child.href
                  if (isCollectionChild) {
                    if (item.name === 'Movies') {
                      isChildActive = path.startsWith('/movies') || path.startsWith('/movie/')
                    } else if (item.name === 'TV Shows') {
                      isChildActive = path.startsWith('/shows') || path.startsWith('/tv/')
                    }
                  }

                  return (
                    <li key={child.name}>
                      <Link
                        to={child.href!}
                        onClick={() => {
                          if (!path.startsWith(child.href!)) {
                            setSearchQuery('')
                          }
                        }}
                        className={clsx(
                          'flex items-center pl-4 pr-3 py-2 text-sm transition-colors rounded-r-md',
                          isChildActive
                            ? 'bg-blue-600/30 text-gray-900 dark:text-white font-semibold border-l-2 border-blue-400'
                            : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100/40 dark:hover:bg-slate-800/40 hover:text-gray-700 dark:hover:text-slate-200 font-normal'
                        )}
                      >
                        <child.icon className={clsx(
                          'w-4 h-4 mr-3',
                          isChildActive ? 'text-blue-400 dark:text-blue-300' : ''
                        )} />
                        {child.name}
                      </Link>
                    </li>
                  )
                })}
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
                : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="flex">
        {/* Fixed Sidebar */}
        <div className="fixed left-0 top-0 w-64 h-screen bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 z-30 flex flex-col">
          <div className="p-6 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <Activity className="w-8 h-8 text-blue-500" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Caddyy</h1>
            </div>
          </div>
          
        <div className="px-6 pb-4 flex-shrink-0">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-400" />
              <input
                type="text"
                placeholder="Search movies & TV shows..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
              />
            </div>
          </div>
          
          <nav className="px-3 flex-1 overflow-y-auto">
            <ul className="space-y-1">
              {renderNavigationItem(dashboardItem)}
              <li className="px-3 pt-4 pb-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Library</li>
              {navigationGroups[0].items.map(renderNavigationItem)}
              <li className="px-3 pt-4 pb-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">System</li>
              {navigationGroups[1].items.map(renderNavigationItem)}
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
