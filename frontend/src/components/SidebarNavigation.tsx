import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'

interface SidebarNavigationItem {
  name: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
}

interface SidebarNavigationProps {
  items: SidebarNavigationItem[]
  title?: string
}

export default function SidebarNavigation({ items, title }: SidebarNavigationProps) {
  const location = useLocation()

  return (
    <div className="w-64 bg-slate-800 border-l border-slate-700 flex-shrink-0">
      <div className="p-6">
        {title && (
          <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        )}
        <nav>
          <ul className="space-y-1">
            {items.map((item) => {
              const isActive = location.pathname === item.href
              
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={clsx(
                      'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    )}
                  >
                    {item.icon && (
                      <item.icon className="w-5 h-5 mr-3" />
                    )}
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </div>
  )
}
