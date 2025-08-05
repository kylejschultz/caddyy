import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'

interface TabItem {
  name: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
}

interface PageHeaderProps {
  title: string
  description?: string
  tabs?: TabItem[]
  actions?: ReactNode
  hideTabs?: boolean  // New prop to hide horizontal tabs when using sidebar nav
}

export default function PageHeader({ title, description, tabs, actions, hideTabs }: PageHeaderProps) {
  const location = useLocation()

  return (
    <div className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {description && (
              <p className="text-slate-400 mt-1">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center space-x-3">
              {actions}
            </div>
          )}
        </div>
        
        {tabs && tabs.length > 0 && !hideTabs && (
          <div className="mt-6">
            <nav className="flex space-x-1 bg-slate-800/50 rounded-lg p-1" aria-label="Tabs">
              {tabs.map((tab) => {
                // Handle both path-only and path+search matching
                const currentUrl = `${location.pathname}${location.search}`
                const isActive = currentUrl === tab.href || location.pathname === tab.href
                
                return (
                  <Link
                    key={tab.name}
                    to={tab.href}
                    className={clsx(
                      'flex items-center px-4 py-2.5 rounded-md font-medium text-sm transition-all duration-200',
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    )}
                  >
                    {tab.icon && (
                      <tab.icon className="w-4 h-4 mr-2" />
                    )}
                    {tab.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        )}
      </div>
    </div>
  )
}
