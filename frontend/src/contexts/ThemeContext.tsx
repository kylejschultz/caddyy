import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import axios from 'axios'

export type Theme = 'system' | 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark')

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'dark'
  }

  const updateResolvedTheme = (currentTheme: Theme) => {
    const resolved = currentTheme === 'system' ? getSystemTheme() : currentTheme
    setResolvedTheme(resolved)
    
    // Apply theme to document
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    if (resolved === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.add('light')
    }
  }

  useEffect(() => {
    // Initialize theme from backend settings, fallback to localStorage or default
    const initializeTheme = async () => {
      try {
        const response = await axios.get('/api/settings/')
        const backendTheme = response.data.theme
        if (backendTheme && ['system', 'light', 'dark'].includes(backendTheme)) {
          setThemeState(backendTheme)
          return
        }
      } catch (error) {
        console.log('Could not load theme from backend, using localStorage fallback')
      }
      
      // Fallback to localStorage
      const savedTheme = localStorage.getItem('theme') as Theme
      if (savedTheme && ['system', 'light', 'dark'].includes(savedTheme)) {
        setThemeState(savedTheme)
      }
    }
    
    initializeTheme()
  }, [])

  useEffect(() => {
    updateResolvedTheme(theme)
  }, [theme])

  useEffect(() => {
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        updateResolvedTheme(theme)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
